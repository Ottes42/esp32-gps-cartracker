#!/usr/bin/env node

import fs from 'node:fs/promises'

// ---------- CLI args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.split('=')
    return [k.replace(/^--/, ''), v ?? true]
  })
)

// Defaults
const START = args.start || (() => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday->6, Mon->0, Tue->1, etc.
  const lastMonday = new Date(now.getTime() - daysToLastMonday * 24 * 60 * 60 * 1000)
  return lastMonday.toISOString().split('T')[0] // Format as YYYY-MM-DD
})()
const WEEKS = Number(args.weeks ?? 1)
const OUTFILE = args.outfile || 'example_drives.csv'
const SERVER = args.server || null // e.g. https://gps.yourdomain.tld
const UPLOAD_NAME = args.uploadName || OUTFILE.split('/').pop()
const AUTH = args.auth || process.env.BASIC_AUTH || '' // "user:pass"
const SEED = Number(args.seed ?? 1337)

// ---------- Rand utils (deterministic) ----------
function mulberry32 (a) { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const rnd = mulberry32(SEED)
function randn (std = 1) { // Box-Muller
  const u = 1 - rnd(); const v = 1 - rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std
}
function clamp (x, lo, hi) { return Math.max(lo, Math.min(hi, x)) }
function lerp (a, b, t) { return a + (b - a) * t }

// ---------- Geo helpers ----------
const toRad = d => d * Math.PI / 180
const toDeg = r => r * 180 / Math.PI

function bearingDeg (lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function * interpolateCoords (lat1, lon1, lat2, lon2, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    yield [lerp(lat1, lat2, t), lerp(lon1, lon2, t)]
  }
}

// ---------- Points of interest (approx) ----------
const POI = {
  badHomburg_Bahnhof: { lat: 50.2268, lon: 8.6184, alt: 190 },
  eschborn_Mitte: { lat: 50.1433, lon: 8.5715, alt: 140 },
  friedberg_Kaiser: { lat: 50.3367, lon: 8.7526, alt: 155 }, // Kaiserstraße
  darmstadt_Lichtwiese: { lat: 49.8589, lon: 8.6738, alt: 160 }
}

// ---------- Speed profiles ----------
function speedProfile (i, n, vmax = 95, accelS = 50, decelS = 70, dt = 5) {
  // accelerate -> cruise -> decelerate, add a little noise
  const accelSteps = Math.max(1, Math.round(accelS / dt))
  const decelSteps = Math.max(1, Math.round(decelS / dt))
  const plateau = Math.max(0, n - accelSteps - decelSteps)

  let v
  if (i < accelSteps) {
    v = vmax * (i / accelSteps)
  } else if (i < accelSteps + plateau) {
    v = vmax + randn(2.5)
  } else {
    const k = i - (accelSteps + plateau)
    v = vmax * (1 - k / decelSteps)
  }
  return clamp(v, 0, vmax + 12)
}

function speedProfileMinute (i, n, vmax = 90) {
  if (i === 0 || i === n - 1) return 0
  const t = i / (n - 1)
  let v = vmax * Math.sin(Math.PI * t) // smooth up/down
  v += randn(3)
  return clamp(v, 0, vmax + 10)
}

// ---------- Build a single trip ----------
function buildTrip ({ startISO, stepSec, durationMin, a, b, temp0 = 21.5, temp1 = 24.5, hum0 = 60, hum1 = 48 }) {
  const rows = []
  const n = Math.floor((durationMin * 60) / stepSec) + 1
  const brg = bearingDeg(a.lat, a.lon, b.lat, b.lon)
  const hdopBase = 0.9 + rnd() * 0.4 // 0.9..1.3
  const satsBase = 8 + Math.floor(rnd() * 4) // 8..11

  let idx = 0
  for (const [lat, lon] of interpolateCoords(a.lat, a.lon, b.lat, b.lon, n)) {
    const ts = new Date(Date.parse(startISO) + idx * stepSec * 1000).toISOString().replace('.000Z', 'Z')
    const t = n === 1 ? 0 : idx / (n - 1)
    const alt = lerp(a.alt || 170, b.alt || 170, t)

    let v
    if (stepSec <= 5) {
      v = speedProfile(idx, n, 100 + rnd() * 8, 40 + 10 * rnd(), 60 + 15 * rnd(), stepSec)
    } else {
      v = speedProfileMinute(idx, n, 92 + rnd() * 6)
    }

    const hdop = clamp(hdopBase + randn(0.1), 0.6, 2.5)
    const sats = clamp(satsBase + Math.round(randn(0.8)), 6, 13)
    const course = (brg + randn(2)) % 360

    const temp = lerp(temp0, temp1, t) + randn(0.1)
    const hum = clamp(lerp(hum0, hum1, t) + randn(0.3), 30, 85)

    rows.push([
      ts,
      lat.toFixed(6),
      lon.toFixed(6),
      alt.toFixed(1),
      v.toFixed(1), // spd_kmh
      hdop.toFixed(2),
      String(sats),
      course.toFixed(1),
      temp.toFixed(1),
      hum.toFixed(1)
    ])

    idx++
  }
  return rows
}

// ---------- Weekly plan ----------
function * weeklyPlan (startMondayISO, weeks) {
  const start = new Date(startMondayISO + 'T00:00:00Z')
  if (Number.isNaN(start.getTime())) throw new Error('Bad --start date, use YYYY-MM-DD')

  for (let w = 0; w < weeks; w++) {
    const base = new Date(start.getTime() + w * 7 * 24 * 3600 * 1000)
    const isFirstWeek = w === 0

    // 3× per week: Bad Homburg → Eschborn, 5s step for first week, 1min for others
    const stepSec = isFirstWeek ? 5 : 60

    // Monday: Bad Homburg → Eschborn (8:00) + return (17:30)
    yield { start: atTime(base, 1, 8, 0), stepSec, durMin: 25, a: POI.badHomburg_Bahnhof, b: POI.eschborn_Mitte }
    yield { start: atTime(base, 1, 17, 30), stepSec, durMin: 25, a: POI.eschborn_Mitte, b: POI.badHomburg_Bahnhof }

    // Wednesday: Bad Homburg → Eschborn (8:00) + return (17:30)
    yield { start: atTime(base, 3, 8, 0), stepSec, durMin: 25, a: POI.badHomburg_Bahnhof, b: POI.eschborn_Mitte }
    yield { start: atTime(base, 3, 17, 30), stepSec, durMin: 25, a: POI.eschborn_Mitte, b: POI.badHomburg_Bahnhof }

    // Friday: Bad Homburg → Eschborn (8:00) + return (17:30)
    yield { start: atTime(base, 5, 8, 0), stepSec, durMin: 25, a: POI.badHomburg_Bahnhof, b: POI.eschborn_Mitte }
    yield { start: atTime(base, 5, 17, 30), stepSec, durMin: 25, a: POI.eschborn_Mitte, b: POI.badHomburg_Bahnhof }

    // Tuesday: Friedberg Kaiserstraße (18:30) + return (20:00)
    yield { start: atTime(base, 2, 18, 30), stepSec: 60, durMin: 25, a: POI.badHomburg_Bahnhof, b: POI.friedberg_Kaiser }
    yield { start: atTime(base, 2, 20, 0), stepSec: 60, durMin: 25, a: POI.friedberg_Kaiser, b: POI.badHomburg_Bahnhof }

    // Saturday: Darmstadt Lichtwiese (10:00) + return (15:00)
    yield { start: atTime(base, 6, 10, 0), stepSec: 60, durMin: 60, a: POI.badHomburg_Bahnhof, b: POI.darmstadt_Lichtwiese }
    yield { start: atTime(base, 6, 15, 0), stepSec: 60, durMin: 60, a: POI.darmstadt_Lichtwiese, b: POI.badHomburg_Bahnhof }
  }
}

function atTime (baseMonday, dow, hh, mm) { // dow: 1=Mon..7=Sun
  const d = new Date(baseMonday.getTime())
  const delta = (dow - 1)
  d.setUTCDate(d.getUTCDate() + delta)
  d.setUTCHours(hh, mm, 0, 0)
  return d.toISOString().replace('.000Z', 'Z')
}

// ---------- Main ----------
async function main () {
  const header = 'timestamp,lat,lon,alt,speed_kmh,hdop,satellites,course,temp_c,hum_pct'
  const allRows = [header]

  for (const trip of weeklyPlan(START, WEEKS)) {
    const rows = buildTrip({
      startISO: trip.start,
      stepSec: trip.stepSec,
      durationMin: trip.durMin,
      a: trip.a,
      b: trip.b,
      temp0: 21 + rnd() * 3,
      temp1: 24 + rnd() * 3,
      hum0: 55 + rnd() * 10,
      hum1: 45 + rnd() * 10
    })
    for (const r of rows) allRows.push(r.join(','))
  }

  await fs.writeFile(OUTFILE, allRows.join('\n'), 'utf8')
  console.log(`CSV written: ${OUTFILE} (${allRows.length - 1} rows)`)

  if (SERVER) {
    if (!AUTH.includes(':')) {
      console.error('No Basic Auth. Pass --auth=user:pass or env BASIC_AUTH.')
      process.exit(2)
    }
    const b64 = Buffer.from(AUTH).toString('base64')
    const body = await fs.readFile(OUTFILE, 'utf8')

    const url = `${SERVER.replace(/\/$/, '')}/upload/${encodeURIComponent(UPLOAD_NAME)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${b64}`,
        'Content-Type': 'text/csv'
      },
      body
    })
    const txt = await res.text()
    console.log('Upload:', res.status, txt.slice(0, 200))
    if (!res.ok) process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
