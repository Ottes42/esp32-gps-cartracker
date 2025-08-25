import { createTestApp, cleanupTestFiles } from '../helpers.js'

describe('Database Operations', () => {
  let app
  let db

  beforeEach(() => {
    cleanupTestFiles()
    app = createTestApp()
    db = app.helpers.db
  })

  afterEach(() => {
    if (db) {
      try {
        db.close()
      } catch (e) {
        // Ignore close errors in tests
      }
    }
    cleanupTestFiles()
  })

  describe('car_track table', () => {
    test('creates table with correct schema', () => {
      // Test that we can insert a complete record
      const stmt = db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon, alt_m, spd_kmh, hdop, sats, course, temp_c, hum_pct, dt_s, dist_m, filename) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

      const result = stmt.run(
        'test-device', '2025-08-18T08:00:00Z', 50.1109, 8.6821, 100.5, 60.2,
        1.2, 8, 90.5, 22.3, 65.1, 60.0, 1500.0, 'test.csv'
      )

      expect(result.lastInsertRowid).toBeDefined()
      expect(result.changes).toBe(1)
    })

    test('handles NULL values correctly', () => {
      const stmt = db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon) VALUES (?, ?, ?, ?)`)

      const result = stmt.run('test-device', '2025-08-18T08:00:00Z', null, null)

      expect(result.changes).toBe(1)

      const row = db.prepare('SELECT * FROM car_track WHERE device = ?').get('test-device')
      expect(row.lat).toBeNull()
      expect(row.lon).toBeNull()
    })

    test('index on device and ts works', () => {
      // Insert multiple records
      const stmt = db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon) VALUES (?, ?, ?, ?)`)

      stmt.run('device1', '2025-08-18T08:00:00Z', 50.0, 8.0)
      stmt.run('device1', '2025-08-18T08:01:00Z', 50.1, 8.1)
      stmt.run('device2', '2025-08-18T08:00:00Z', 51.0, 9.0)

      // Query should efficiently use index
      const rows = db.prepare('SELECT * FROM car_track WHERE device = ? ORDER BY ts').all('device1')
      expect(rows).toHaveLength(2)
      expect(rows[0].ts).toBe('2025-08-18T08:00:00Z')
      expect(rows[1].ts).toBe('2025-08-18T08:01:00Z')
    })

    test('supports distance calculations', () => {
      const stmt = db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon, dist_m) VALUES (?, ?, ?, ?, ?)`)

      stmt.run('device1', '2025-08-18T08:00:00Z', 50.0, 8.0, 0) // First point
      stmt.run('device1', '2025-08-18T08:01:00Z', 50.1, 8.1, 1234.5) // Distance from previous

      const rows = db.prepare('SELECT SUM(dist_m) as total FROM car_track WHERE device = ?').get('device1')
      expect(rows.total).toBe(1234.5)
    })
  })

  describe('fuel table', () => {
    test('creates table with correct schema', () => {
      const stmt = db.prepare(`INSERT INTO fuel 
        (ts, liters, price_per_l, amount_fuel, amount_total, station_name, station_zip, 
         station_city, station_address, full_tank, lat, lon, photo_path, ocr_text, user) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

      const result = stmt.run(
        '2025-08-18T08:00:00Z', 45.2, 1.659, 75.01, 75.01, 'Shell', '60311',
        'Frankfurt', 'Hauptstraße 123', 1, 50.1109, 8.6821, '/path/to/photo.jpg',
        '{"parsed": "data"}', 'test-user'
      )

      expect(result.lastInsertRowid).toBeDefined()
      expect(result.changes).toBe(1)
    })

    test('handles OCR errors', () => {
      const stmt = db.prepare(`INSERT INTO fuel 
        (ts, photo_path, ocr_error, user) VALUES (?, ?, ?, ?)`)

      const result = stmt.run('2025-08-18T08:00:00Z', '/path/to/photo.jpg', 'OCR failed', 'test-user')

      expect(result.changes).toBe(1)

      const row = db.prepare('SELECT * FROM fuel WHERE user = ?').get('test-user')
      expect(row.ocr_error).toBe('OCR failed')
      expect(row.liters).toBeNull()
    })

    test('supports fuel consumption queries', () => {
      const stmt = db.prepare(`INSERT INTO fuel 
        (ts, liters, amount_total, station_name, user, full_tank) 
        VALUES (?, ?, ?, ?, ?, ?)`)

      // Insert multiple fuel records
      stmt.run('2025-08-18T08:00:00Z', 45.2, 75.01, 'Shell', 'test-user', 1)
      stmt.run('2025-08-17T08:00:00Z', 40.5, 65.57, 'Aral', 'test-user', 1)
      stmt.run('2025-08-16T08:00:00Z', 38.1, 61.23, 'BP', 'test-user', 1)

      // Test monthly aggregation query (simplified)
      const monthlyData = db.prepare(`
        SELECT substr(ts,1,7) as month, 
               SUM(amount_total) as cost, 
               SUM(liters) as liters
        FROM fuel 
        WHERE user = ? AND amount_total IS NOT NULL
        GROUP BY month 
        ORDER BY month DESC
      `).all('test-user')

      expect(monthlyData).toHaveLength(1) // All in same month
      expect(monthlyData[0].month).toBe('2025-08')
      expect(monthlyData[0].cost).toBeCloseTo(201.81, 2) // Sum of all amounts
      expect(monthlyData[0].liters).toBeCloseTo(123.8, 1) // Sum of all liters
    })

    test('supports user isolation', () => {
      const stmt = db.prepare(`INSERT INTO fuel 
        (ts, liters, amount_total, user) VALUES (?, ?, ?, ?)`)

      stmt.run('2025-08-18T08:00:00Z', 45.2, 75.01, 'user1')
      stmt.run('2025-08-18T08:00:00Z', 40.5, 65.57, 'user2')

      const user1Records = db.prepare('SELECT * FROM fuel WHERE user = ?').all('user1')
      const user2Records = db.prepare('SELECT * FROM fuel WHERE user = ?').all('user2')

      expect(user1Records).toHaveLength(1)
      expect(user2Records).toHaveLength(1)
      expect(user1Records[0].amount_total).toBe(75.01)
      expect(user2Records[0].amount_total).toBe(65.57)
    })

    test('supports OCR retry workflow', () => {
      // Insert record with OCR error
      let stmt = db.prepare(`INSERT INTO fuel 
        (ts, photo_path, ocr_error, user) VALUES (?, ?, ?, ?)`)

      const result = stmt.run('2025-08-18T08:00:00Z', '/path/to/photo.jpg', 'Initial OCR failed', 'test-user')
      const id = result.lastInsertRowid

      // Update with successful OCR data
      stmt = db.prepare(`UPDATE fuel SET
        liters=?, price_per_l=?, amount_total=?, station_name=?, ocr_error=NULL 
        WHERE id=? AND user=?`)

      const updateResult = stmt.run(45.2, 1.659, 75.01, 'Shell', id, 'test-user')
      expect(updateResult.changes).toBe(1)

      // Verify update
      const updated = db.prepare('SELECT * FROM fuel WHERE id = ?').get(id)
      expect(updated.ocr_error).toBeNull()
      expect(updated.liters).toBe(45.2)
      expect(updated.station_name).toBe('Shell')
    })
  })

  describe('Complex Queries', () => {
    test('trip detection query works correctly', () => {
      // Insert GPS data with time gaps to create separate trips
      const stmt = db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon, spd_kmh) VALUES (?, ?, ?, ?, ?)`)

      // Trip 1: Two points close in time
      stmt.run('device1', '2025-08-18T08:00:00Z', 50.0, 8.0, 50)
      stmt.run('device1', '2025-08-18T08:05:00Z', 50.1, 8.1, 60)

      // Gap > 15 minutes (900 seconds)
      // Trip 2: Two points close in time
      stmt.run('device1', '2025-08-18T09:00:00Z', 50.2, 8.2, 70)
      stmt.run('device1', '2025-08-18T09:05:00Z', 50.3, 8.3, 80)

      // Test the trip detection query from the API
      const trips = db.prepare(`
        WITH diffs AS (
          SELECT ts, device, LAG(ts) OVER (PARTITION BY device ORDER BY ts) prev_ts
          FROM car_track
        ), trips AS (
          SELECT device, ts start_ts, LEAD(ts) OVER (PARTITION BY device ORDER BY ts) end_ts
          FROM diffs
          WHERE prev_ts IS NULL OR strftime('%s',ts)-strftime('%s',prev_ts) > 900
        )
        SELECT device, start_ts, end_ts FROM trips WHERE end_ts IS NOT NULL
      `).all()

      expect(trips.length).toBeGreaterThan(0)
      expect(trips[0]).toHaveProperty('device')
      expect(trips[0]).toHaveProperty('start_ts')
      expect(trips[0]).toHaveProperty('end_ts')
    })

    test('consumption calculation between full tanks', () => {
      const fuelStmt = db.prepare(`INSERT INTO fuel 
        (ts, liters, user, full_tank) VALUES (?, ?, ?, ?)`)

      const trackStmt = db.prepare(`INSERT INTO car_track 
        (device, ts, dist_m) VALUES (?, ?, ?)`)

      // Insert two full tank records
      fuelStmt.run('2025-08-18T08:00:00Z', 45.2, 'test-user', 1)
      fuelStmt.run('2025-08-15T08:00:00Z', 40.0, 'test-user', 1) // Earlier fill-up

      // Insert distance data between the two fill-ups
      trackStmt.run('test-user', '2025-08-16T08:00:00Z', 50000) // 50km
      trackStmt.run('test-user', '2025-08-17T08:00:00Z', 30000) // 30km

      // Query consumption calculation (like in the API)
      const fills = db.prepare(`SELECT * FROM fuel 
        WHERE user=? AND liters IS NOT NULL AND full_tank=1 
        ORDER BY ts DESC LIMIT 2`).all('test-user')

      expect(fills).toHaveLength(2)

      const distQuery = db.prepare(`SELECT SUM(dist_m) d FROM car_track 
        WHERE device=? AND ts BETWEEN ? AND ?`).get('test-user', fills[1].ts, fills[0].ts)

      expect(distQuery.d).toBe(80000) // 50km + 30km in meters

      // Calculate consumption: (liters / distance_m) * 100000 = liters per 100km
      const consumption = (fills[0].liters / distQuery.d) * 100000
      expect(consumption).toBeCloseTo(56.5, 1) // 45.2L per 80km = ~56.5L/100km
    })
  })
})
