import express from 'express'
import multer from 'multer'
import { logInfo, logError } from './logger.js'

export const createRoutes = (db, helpers, limiters, config) => {
  const { UPLOAD_DIR } = config
  const { parseReceipt, geocodeAddress, distanceKm } = helpers

  const router = express.Router()

  // Health check endpoint for Docker (no auth required)
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  })

  // CSV Upload endpoint
  router.post('/upload/:filename', limiters.gpsUpload, express.text({ type: 'text/csv', limit: '10mb' }), (req, res) => {
    const device = req.authUser
    const fname = req.params.filename
    const lines = req.body.split(/\r?\n/).filter(l => l.trim().length > 0)

    logInfo('Processing GPS CSV upload', { device, filename: fname, lineCount: lines.length })

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

    logInfo('GPS CSV upload processed successfully', { device, filename: fname, processedLines: lines.length })
    res.json({ ok: true, count: lines.length })
  })

  // Multer setup for file uploads
  const up = multer({ dest: UPLOAD_DIR })

  // Fuel receipt upload
  router.post('/uploadReceipt', limiters.receiptUpload, up.single('photo'), async (req, res) => {
    if (!req.file?.path) return res.status(400).json({ ok: false, error: 'no file' })
    const user = req.authUser
    const path = req.file.path

    logInfo('Processing fuel receipt upload', { user, filename: req.file.originalname })

    let parsed = null; let error = null; let lat = null; let lon = null

    try {
      parsed = await parseReceipt(path)
      logInfo('OCR parsing successful', { user, parsed })
      const addr = [parsed.station_address, parsed.station_zip, parsed.station_city].filter(Boolean).join(' ')
      const geo = await geocodeAddress(addr)
      if (geo) { lat = geo.lat; lon = geo.lon }
    } catch (e) {
      error = e.message || String(e)
      logError('OCR parsing failed', { user, error })
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

    logInfo('Fuel receipt processing completed', { user, success: !!parsed, consumption })
    res.json({ ok: !!parsed, parsed, error, consumption })
  })

  // Retry OCR processing
  router.post('/retryReceipt/:id', limiters.receiptUpload, async (req, res) => {
    const id = req.params.id
    const user = req.authUser
    const fuel = db.prepare('SELECT * FROM fuel WHERE id=? AND user=?').get(id, user)
    if (!fuel?.photo_path) return res.status(404).json({ error: 'not found' })

    logInfo('Retrying OCR processing', { user, fuelId: id })

    try {
      const parsed = await parseReceipt(fuel.photo_path)
      const addr = [parsed.station_address, parsed.station_zip, parsed.station_city].filter(Boolean).join(' ')
      const geo = await geocodeAddress(addr)
      const lat = geo?.lat || null
      const lon = geo?.lon || null

      db.prepare(`UPDATE fuel SET
        ts=?, liters=?, price_per_l=?, amount_fuel=?, amount_total=?,
        station_name=?, station_zip=?, station_city=?, station_address=?,
        lat=?, lon=?, ocr_text=?, ocr_error=NULL WHERE id=? AND user=?`)
        .run(parsed.ts, parsed.liters, parsed.price_per_l, parsed.amount_fuel, parsed.amount_total,
          parsed.station_name, parsed.station_zip, parsed.station_city, parsed.station_address,
          lat, lon, JSON.stringify(parsed), fuel.id, user)

      logInfo('OCR retry successful', { user, fuelId: id })
      res.json({ ok: true, parsed })
    } catch (e) {
      const errorMsg = e.message || String(e)
      db.prepare('UPDATE fuel SET ocr_error=? WHERE id=? AND user=?').run(errorMsg, fuel.id, user)
      logError('OCR retry failed', { user, fuelId: id, error: errorMsg })
      res.json({ ok: false, error: errorMsg })
    }
  })

  // API Endpoints
  router.get('/api/fuel', limiters.api, (req, res) => {
    const limit = Math.min(Number(req.query.limit || 50), 200)
    const offset = Math.max(Number(req.query.offset || 0), 0)
    const rows = db.prepare('SELECT * FROM fuel ORDER BY ts DESC LIMIT ? OFFSET ?').all(limit, offset)
    res.json(rows)
  })

  router.get('/api/fuel/months', limiters.api, (req, res) => {
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

  router.get('/api/trips', limiters.api, (req, res) => {
    const limit = Math.min(Number(req.query.limit || 20), 200)
    const offset = Math.max(Number(req.query.offset || 0), 0)
    const rows = db.prepare(`
      WITH diffs AS (
        SELECT ts, device, LAG(ts) OVER (PARTITION BY device ORDER BY ts) prev_ts
        FROM car_track
      ), trips AS (
        SELECT device, ts start_ts, LEAD(ts) OVER (PARTITION BY device ORDER BY ts) end_ts
        FROM diffs
        WHERE prev_ts IS NULL OR strftime('%s',ts)-strftime('%s',prev_ts) > 900
      )
      SELECT t.device, t.start_ts, t.end_ts,
        (SELECT SUM(dist_m) FROM car_track WHERE device=t.device AND ts BETWEEN t.start_ts AND t.end_ts) as dist_m,
        (SELECT AVG(spd_kmh) FROM car_track WHERE device=t.device AND ts BETWEEN t.start_ts AND t.end_ts AND spd_kmh > 0) as avg_spd
      FROM trips t
      WHERE t.end_ts IS NOT NULL
      ORDER BY start_ts DESC
      LIMIT ? OFFSET ?`).all(limit, offset)
    res.json(rows)
  })

  router.get('/api/trip/:start', limiters.api, (req, res) => {
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

  return router
}
