import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import multer from 'multer'
import fs from 'fs'
import fetch from 'node-fetch'
import OpenAI from 'openai'

const DATA_PATH = process.env.DATA_PATH || 'data/gps/'
const DB_FILE = DATA_PATH + (process.env.DB_FILE || 'cartracker.db')
const GEOCACHE = DATA_PATH + (process.env.GEOCACHE || 'geocache.json')
const UPLOAD_DIR = DATA_PATH + (process.env.UPLOAD_DIR || 'uploads/')
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro-vision-latest'
const PORT = process.env.PORT || 8080

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
if (!fs.existsSync(GEOCACHE)) fs.writeFileSync(GEOCACHE, JSON.stringify({}), 'utf8')

let geocache = {}
try {
  geocache = JSON.parse(fs.readFileSync(GEOCACHE, 'utf8'))
} catch (e) {
  console.warn('Failed to load geocache at startup:', e.message)
}

const db = new Database(DB_FILE)

db.exec(`
CREATE TABLE IF NOT EXISTS car_track (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT,
  ts TEXT,
  lat REAL,
  lon REAL,
  alt_m REAL,
  spd_kmh REAL,
  hdop REAL,
  sats INTEGER,
  course REAL,
  temp_c REAL,
  hum_pct REAL,
  dt_s REAL,
  dist_m REAL,
  filename TEXT
);
CREATE INDEX IF NOT EXISTS idx_track_ts_dev ON car_track(device, ts);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS fuel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  liters REAL,
  price_per_l REAL,
  amount_fuel REAL,
  amount_total REAL,
  station_name TEXT,
  station_zip TEXT,
  station_city TEXT,
  station_address TEXT,
  full_tank BOOLEAN DEFAULT 1,
  lat REAL,
  lon REAL,
  photo_path TEXT,
  ocr_text TEXT,
  ocr_error TEXT,
  user TEXT
);
`)

const client = new OpenAI({
  apiKey: GEMINI_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
})

// Middleware
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Authentication middleware
app.use((req, res, next) => {
  let authUser = req.get('x-auth-user')
  // Only allow development header from localhost/127.0.0.1
  if (authUser === 'development') {
    if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
      console.warn(`Rejected development auth from non-localhost hostname: ${req.hostname}`)
      return res.status(401).json({ error: 'Authentication required' })
    }
    console.log(`Development mode: localhost access from hostname ${req.hostname}`)
  } else if (authUser === undefined && req.hostname === 'localhost') {
    authUser = 'development'
  }

  // In production, proxy must inject real username
  if (!authUser) {
    return res.status(401).json({ error: 'X-Auth-User header missing - check proxy configuration' })
  }

  req.authUser = authUser
  next()
})

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Helpers
async function parseReceipt (filePath) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing')
  const resp = await client.chat.completions.create({
    model: GEMINI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Extract JSON with fields: ts (ISO8601), liters, price_per_l, amount_fuel (fuel incl tax), amount_total (grand total incl tax), station_name, station_zip, station_city, station_address. Only return JSON.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Parse this fuel receipt into JSON' },
          { type: 'image_url', image_url: 'file://' + filePath }
        ]
      }
    ]
  })
  const txt = resp.choices?.[0]?.message?.content || '{}'
  return JSON.parse(txt)
}

async function geocodeAddress (addr) {
  if (!addr || !addr.trim()) return null
  const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(addr)
  const key = addr.trim()
  if (key in geocache) return geocache[key]

  const r = await fetch(url, { headers: { 'User-Agent': 'gps-cartracker' } })
  const j = await r.json()

  geocache[key] = j && j[0] ? { lat: +j[0].lat, lon: +j[0].lon } : null
  try {
    fs.writeFileSync(GEOCACHE, JSON.stringify(geocache), 'utf8')
  } catch (e) {
    console.warn('Failed to write geocache:', e.message)
  }
  return geocache[key]
}

function distanceKm (lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ---------------- CSV Upload ---------------- */

app.post('/upload/:filename', express.text({ type: 'text/csv', limit: '10mb' }), (req, res) => {
  const device = req.authUser // from proxy
  const fname = req.params.filename
  const lines = req.body.split(/\r?\n/).filter(l => l.trim().length > 0)

  let prevTs = null
  for (const line of lines) {
    const p = line.split(',')
    if (p.length < 10) continue
    const ts = p[0]
    const lat = +p[1]; const lon = +p[2]
    const alt = +p[3]
    const spd = +p[4]
    const hdop = +p[5]; const sats = +p[6]; const course = +p[7]
    const temp = +p[8]; const hum = +p[9]

    let dt = null; let dist = null
    if (prevTs) dt = (Date.parse(ts) - Date.parse(prevTs)) / 1000
    prevTs = ts

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const last = db.prepare('SELECT lat,lon FROM car_track WHERE device=? AND ts<? ORDER BY ts DESC LIMIT 1').get(device, ts)
      if (last && last.lat != null && last.lon != null) {
        const d = distanceKm(lat, lon, last.lat, last.lon) * 1000
        dist = d
      }
    }

    db.prepare(`INSERT INTO car_track
      (device,ts,lat,lon,alt_m,spd_kmh,hdop,sats,course,temp_c,hum_pct,dt_s,dist_m,filename)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(device, ts,
        Number.isFinite(lat) ? lat : null,
        Number.isFinite(lon) ? lon : null,
        Number.isFinite(alt) ? alt : null,
        Number.isFinite(spd) ? spd : null,
        Number.isFinite(hdop) ? hdop : null,
        Number.isFinite(sats) ? sats : null,
        Number.isFinite(course) ? course : null,
        Number.isFinite(temp) ? temp : null,
        Number.isFinite(hum) ? hum : null,
        dt, dist, fname)
  }
  res.json({ ok: true, count: lines.length })
})

/* ---------------- Fuel ---------------- */

const up = multer({ dest: UPLOAD_DIR })

app.post('/uploadReceipt', up.single('photo'), async (req, res) => {
  if (!req.file?.path) return res.status(400).json({ ok: false, error: 'no file' })
  const user = req.authUser
  const path = req.file.path

  let parsed = null; let error = null; let lat = null; let lon = null

  try {
    parsed = await parseReceipt(path)
    const addr = [parsed.station_address, parsed.station_zip, parsed.station_city].filter(Boolean).join(' ')
    const geo = await geocodeAddress(addr)
    if (geo) { lat = geo.lat; lon = geo.lon }
  } catch (e) {
    error = e.message || String(e)
  }

  if (parsed) {
    db.prepare(`INSERT INTO fuel
      (ts,liters,price_per_l,amount_fuel,amount_total,
       station_name,station_zip,station_city,station_address,
       full_tank,lat,lon,photo_path,ocr_text,user)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(parsed.ts, parsed.liters, parsed.price_per_l, parsed.amount_fuel, parsed.amount_total,
        parsed.station_name, parsed.station_zip, parsed.station_city, parsed.station_address,
        1, lat, lon, path, JSON.stringify(parsed), user)
  } else {
    db.prepare("INSERT INTO fuel (ts,photo_path,ocr_error,user) VALUES (datetime('now'),?,?,?)")
      .run(path, error, user)
  }

  // Optional: compute consumption since previous full tank by same user
  const fills = db.prepare('SELECT * FROM fuel WHERE user=? AND liters IS NOT NULL AND full_tank=1 ORDER BY ts DESC LIMIT 2').all(user)
  let consumption = null
  if (fills.length === 2) {
    const dist = db.prepare('SELECT SUM(dist_m) d FROM car_track WHERE device=? AND ts BETWEEN ? AND ?').get(user, fills[1].ts, fills[0].ts)?.d || 0
    if (dist > 0 && fills[0].liters != null) consumption = (fills[0].liters / dist) * 100000
  }

  res.json({ ok: !!parsed, parsed, error, consumption })
})

app.post('/retryReceipt/:id', async (req, res) => {
  const user = req.authUser
  const fuel = db.prepare('SELECT * FROM fuel WHERE id=? AND user=?').get(req.params.id, user)
  if (!fuel) return res.status(404).json({ ok: false, error: 'not found for user' })
  try {
    const parsed = await parseReceipt(fuel.photo_path)
    const addr = [parsed.station_address, parsed.station_zip, parsed.station_city].filter(Boolean).join(' ')
    const geo = await geocodeAddress(addr)
    let lat = null; let lon = null; if (geo) { lat = geo.lat; lon = geo.lon }
    db.prepare(`UPDATE fuel SET ts=?, liters=?, price_per_l=?, amount_fuel=?, amount_total=?,
      station_name=?, station_zip=?, station_city=?, station_address=?,
      lat=?, lon=?, ocr_text=?, ocr_error=NULL WHERE id=? AND user=?`)
      .run(parsed.ts, parsed.liters, parsed.price_per_l, parsed.amount_fuel, parsed.amount_total,
        parsed.station_name, parsed.station_zip, parsed.station_city, parsed.station_address,
        lat, lon, JSON.stringify(parsed), fuel.id, user)
    res.json({ ok: true, parsed })
  } catch (e) {
    db.prepare('UPDATE fuel SET ocr_error=? WHERE id=? AND user=?').run(e.message || String(e), fuel.id, user)
    res.json({ ok: false, error: e.message || String(e) })
  }
})

/* ---------------- Read APIs ---------------- */

app.get('/api/fuel', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200)
  const offset = Math.max(Number(req.query.offset || 0), 0)
  const rows = db.prepare('SELECT * FROM fuel ORDER BY ts DESC LIMIT ? OFFSET ?').all(limit, offset)
  res.json(rows)
})

app.get('/api/fuel/months', (req, res) => {
  const rows = db.prepare(`
    WITH months AS (
      SELECT substr(ts,1,7) as month,
             SUM(amount_total) as cost,
             SUM(liters) as liters
      FROM fuel
      WHERE amount_total IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    )
    SELECT m.month,m.cost,m.liters,
      (SELECT SUM(dist_m) FROM car_track WHERE substr(ts,1,7)=m.month) as km
    FROM months m
    ORDER BY m.month DESC
  `).all()
  res.json(rows)
})

app.get('/api/trips', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 200)
  const offset = Math.max(Number(req.query.offset || 0), 0)
  const rows = db.prepare(`
    WITH diffs AS (
      SELECT ts, device, LAG(ts) OVER (PARTITION BY device ORDER BY ts) prev_ts
      FROM car_track
    ), trips AS (
      SELECT device, ts start_ts,
             LEAD(ts) OVER (PARTITION BY device ORDER BY ts) end_ts
      FROM diffs
      WHERE prev_ts IS NULL OR strftime('%s',ts)-strftime('%s',prev_ts) > 900
    )
    SELECT device,start_ts,end_ts FROM trips
    WHERE end_ts IS NOT NULL
    ORDER BY start_ts DESC
    LIMIT ? OFFSET ?`).all(limit, offset)
  res.json(rows)
})

app.get('/api/trip/:start', (req, res) => {
  const start = req.params.start
  const row = db.prepare(`
    WITH diffs AS (
      SELECT ts, device, LAG(ts) OVER (PARTITION BY device ORDER BY ts) prev_ts
      FROM car_track
    ), trips AS (
      SELECT device, ts start_ts, LEAD(ts) OVER (PARTITION BY device ORDER BY ts) end_ts
      FROM diffs
      WHERE prev_ts IS NULL OR strftime('%s',ts)-strftime('%s',prev_ts) > 900
    )
    SELECT device,end_ts FROM trips WHERE start_ts=?`).get(start)
  if (!row?.end_ts) return res.json([])
  const pts = db.prepare('SELECT ts, lat, lon, spd_kmh, temp_c, alt_m, hdop, sats FROM car_track WHERE device=? AND ts BETWEEN ? AND ? ORDER BY ts').all(row.device, start, row.end_ts)
  let out = pts
  if (pts.length > 3000) {
    const step = Math.ceil(pts.length / 3000)
    out = pts.filter((_, i) => i % step === 0)
  }
  res.json(out)
})

/* ---------------- Start & Shutdown ---------------- */

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`cartracker api on ${PORT}`)
})

function shutdown () {
  console.log('Shutting down gracefully...')
  try { db.close() } catch (e) { console.error('DB close error', e) }
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // shutdown();
})
