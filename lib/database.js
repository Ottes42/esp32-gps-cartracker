import Database from 'better-sqlite3'
import { logInfo } from './logger.js'

export const initializeDatabase = (dbFile) => {
  logInfo('Initializing database', { dbFile })

  const db = new Database(dbFile)

  // Create car_track table with indexes
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

  // Create fuel table
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

  logInfo('Database initialization completed')
  return db
}
