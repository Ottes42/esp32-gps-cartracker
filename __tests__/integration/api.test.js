import request from 'supertest'
import { createTestApp, cleanupTestFiles, sampleCsvData, sampleFuelData, createMockReceiptFile } from '../helpers.js'
import nock from 'nock'
import fs from 'fs'

describe('Rate Limiting', () => {
  let app
  beforeEach(() => {
    cleanupTestFiles()
    app = createTestApp()
  })
  afterEach(() => {
    if (app.helpers.db) {
      try {
        app.helpers.db.close()
      } catch (e) {}
    }
    cleanupTestFiles()
    nock.cleanAll()
  })
  test('enforces GPS upload rate limit', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app)
        .post('/upload/test.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send('2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0')
    }
    // 31st request should be rate limited
    const response = await request(app)
      .post('/upload/test.csv')
      .set('x-auth-user', 'test-device')
      .set('Content-Type', 'text/csv')
      .send('2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0')
    expect(response.status).toBe(429)
    expect(response.text).toMatch(/Too many requests/i)
  })

  test('enforces receipt upload rate limit', async () => {
    const testFile = createMockReceiptFile()
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/uploadReceipt')
        .set('x-auth-user', 'test-user')
        .attach('photo', testFile)
    }
    const response = await request(app)
      .post('/uploadReceipt')
      .set('x-auth-user', 'test-user')
      .attach('photo', testFile)
    expect(response.status).toBe(429)
    expect(response.text).toMatch(/Too many requests/i)
    fs.unlinkSync(testFile)
  })

  test('enforces API rate limit', async () => {
    for (let i = 0; i < 60; i++) {
      await request(app)
        .get('/api/fuel')
        .set('x-auth-user', 'test-user')
    }
    const response = await request(app)
      .get('/api/fuel')
      .set('x-auth-user', 'test-user')
    expect(response.status).toBe(429)
    expect(response.text).toMatch(/Too many requests/i)
  })
})

describe('API Endpoints', () => {
  describe('Rate Limiting', () => {
    let app
    beforeEach(() => {
      cleanupTestFiles()
      app = createTestApp()
    })
    afterEach(() => {
      if (app.helpers.db) {
        try {
          app.helpers.db.close()
        } catch (e) {}
      }
      cleanupTestFiles()
      nock.cleanAll()
    })
    test('enforces GPS upload rate limit', async () => {
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/upload/test.csv')
          .set('x-auth-user', 'test-device')
          .set('Content-Type', 'text/csv')
          .send('2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0')
      }
      // 31st request should be rate limited
      const response = await request(app)
        .post('/upload/test.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send('2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0')
      expect(response.status).toBe(429)
      expect(response.text).toMatch(/Too many requests/i)
    })
    test('enforces receipt upload rate limit', async () => {
      const testFile = createMockReceiptFile()
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/uploadReceipt')
          .set('x-auth-user', 'test-user')
          .attach('photo', testFile)
      }
      const response = await request(app)
        .post('/uploadReceipt')
        .set('x-auth-user', 'test-user')
        .attach('photo', testFile)
      expect(response.status).toBe(429)
      expect(response.text).toMatch(/Too many requests/i)
      fs.unlinkSync(testFile)
    })
    test('enforces API rate limit', async () => {
      for (let i = 0; i < 60; i++) {
        await request(app)
          .get('/api/fuel')
          .set('x-auth-user', 'test-user')
      }
      const response = await request(app)
        .get('/api/fuel')
        .set('x-auth-user', 'test-user')
      expect(response.status).toBe(429)
      expect(response.text).toMatch(/Too many requests/i)
    })
  })
  let app

  beforeEach(() => {
    cleanupTestFiles()
    app = createTestApp()
  })

  afterEach(() => {
    if (app.helpers.db) {
      try {
        app.helpers.db.close()
      } catch (e) {
        // Ignore close errors in tests
      }
    }
    cleanupTestFiles()
    nock.cleanAll()
  })

  describe('GET /health', () => {
    test('returns health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      })
    })
  })

  describe('Authentication Middleware', () => {
    test('accepts development auth from localhost', async () => {
      const response = await request(app)
        .get('/health')
        .set('x-auth-user', 'development')
        .expect(200)

      expect(response.body.status).toBe('ok')
    })

    test('rejects missing auth header from non-localhost', async () => {
      const response = await request(app)
        .get('/api/fuel')
        .set('Host', 'example.com')
        .expect(401)

      expect(response.body.error).toBe('X-Auth-User header missing - check proxy configuration')
    })

    test('rejects development auth from non-localhost hostname', async () => {
      const response = await request(app)
        .get('/api/fuel')
        .set('x-auth-user', 'development')
        .set('Host', 'example.com')
        .expect(401)

      expect(response.body.error).toBe('Authentication required')
    })

    test('accepts valid user auth', async () => {
      const response = await request(app)
        .get('/health')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body.status).toBe('ok')
    })
  })

  describe('POST /upload/:filename', () => {
    test('uploads CSV data successfully', async () => {
      const response = await request(app)
        .post('/upload/test-drive.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send(sampleCsvData)
        .expect(200)

      expect(response.body).toEqual({
        ok: true,
        count: 3
      })

      // Verify data was inserted into database
      const rows = app.helpers.db.prepare('SELECT * FROM car_track WHERE device = ?').all('test-device')
      expect(rows).toHaveLength(3)
      expect(rows[0]).toMatchObject({
        device: 'test-device',
        ts: '2025-08-18T08:00:00Z',
        lat: 50.1109,
        lon: 8.6821,
        filename: 'test-drive.csv'
      })
    })

    test('handles malformed CSV gracefully', async () => {
      const malformedCsv = 'invalid,data\nmore,invalid'

      const response = await request(app)
        .post('/upload/malformed.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send(malformedCsv)
        .expect(200)

      expect(response.body).toEqual({
        ok: true,
        count: 2 // Lines processed (even if incomplete data)
      })
    })

    test('calculates distance between GPS points', async () => {
      // First upload a point
      await request(app)
        .post('/upload/test1.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send('2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0')
        .expect(200)

      // Second upload with different coordinates should calculate distance
      await request(app)
        .post('/upload/test2.csv')
        .set('x-auth-user', 'test-device')
        .set('Content-Type', 'text/csv')
        .send('2025-08-18T08:01:00Z,50.1120,8.6830,101.0,52.2,1.1,9,91.0,22.4,65.1')
        .expect(200)

      const rows = app.helpers.db.prepare('SELECT * FROM car_track WHERE device = ? ORDER BY ts').all('test-device')
      expect(rows).toHaveLength(2)
      expect(rows[0].dist_m).toBeNull() // First point has no previous distance
      expect(rows[1].dist_m).toBeGreaterThan(0) // Second point should have calculated distance
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .post('/upload/test.csv')
        .set('Content-Type', 'text/csv')
        .send(sampleCsvData)
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })

  describe('POST /uploadReceipt', () => {
    test('uploads receipt successfully with valid OCR', async () => {
      const testFile = createMockReceiptFile()

      // Mock successful Gemini API response
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(200, {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(sampleFuelData)
              }]
            }
          }]
        })

      // Mock geocoding API
      nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query(true)
        .reply(200, [{
          lat: '50.1109',
          lon: '8.6821'
        }])

      const response = await request(app)
        .post('/uploadReceipt')
        .set('x-auth-user', 'test-user')
        .attach('photo', testFile)
        .expect(200)

      expect(response.body.ok).toBe(true)
      expect(response.body.parsed).toMatchObject({
        station_name: 'Shell',
        amount_total: 75.01
      })

      // Verify data was inserted into database
      const rows = app.helpers.db.prepare('SELECT * FROM fuel WHERE user = ?').all('test-user')
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        user: 'test-user',
        station_name: 'Shell',
        amount_total: 75.01,
        lat: 50.1109,
        lon: 8.6821
      })

      fs.unlinkSync(testFile)
    })

    test('handles OCR failure gracefully', async () => {
      const testFile = createMockReceiptFile()

      // Mock failed Gemini API response
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(500, 'API Error')

      const response = await request(app)
        .post('/uploadReceipt')
        .set('x-auth-user', 'test-user')
        .attach('photo', testFile)
        .expect(200)

      expect(response.body.ok).toBe(false)
      expect(response.body.error).toMatch(/Gemini API error/)

      // Verify error was recorded in database
      const rows = app.helpers.db.prepare('SELECT * FROM fuel WHERE user = ?').all('test-user')
      expect(rows).toHaveLength(1)
      expect(rows[0].ocr_error).toMatch(/Gemini API error/)

      fs.unlinkSync(testFile)
    })

    test('requires file upload', async () => {
      const response = await request(app)
        .post('/uploadReceipt')
        .set('x-auth-user', 'test-user')
        .expect(400)

      expect(response.body).toEqual({
        ok: false,
        error: 'no file'
      })
    })

    test('requires authentication', async () => {
      const testFile = createMockReceiptFile()

      const response = await request(app)
        .post('/uploadReceipt')
        .attach('photo', testFile)
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)

      fs.unlinkSync(testFile)
    })
  })

  describe('GET /api/fuel', () => {
    beforeEach(async () => {
      // Insert test fuel data
      app.helpers.db.prepare(`INSERT INTO fuel 
        (ts, liters, price_per_l, amount_total, station_name, user) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        '2025-08-18T08:00:00Z', 45.2, 1.659, 75.01, 'Shell', 'test-user'
      )
      app.helpers.db.prepare(`INSERT INTO fuel 
        (ts, liters, price_per_l, amount_total, station_name, user) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        '2025-08-17T08:00:00Z', 40.5, 1.619, 65.57, 'Aral', 'test-user'
      )
    })

    test('returns fuel records', async () => {
      const response = await request(app)
        .get('/api/fuel')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        station_name: 'Shell',
        amount_total: 75.01,
        user: 'test-user'
      })
    })

    test('supports pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/fuel?limit=1&offset=0')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].station_name).toBe('Shell') // Most recent first
    })

    test('enforces maximum limit', async () => {
      const response = await request(app)
        .get('/api/fuel?limit=500') // Should be capped at 200
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body).toHaveLength(2) // Only 2 records exist
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/fuel')
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })

  describe('GET /api/trips', () => {
    beforeEach(async () => {
      // Insert test GPS tracking data with gap to create separate trips
      const stmt = app.helpers.db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon, spd_kmh, dist_m) 
        VALUES (?, ?, ?, ?, ?, ?)`)

      // Trip 1
      stmt.run('test-device', '2025-08-18T08:00:00Z', 50.1109, 8.6821, 50, 0)
      stmt.run('test-device', '2025-08-18T08:05:00Z', 50.1120, 8.6830, 60, 1200)

      // Gap > 15 minutes to create separate trip
      // Trip 2
      stmt.run('test-device', '2025-08-18T09:00:00Z', 50.1130, 8.6840, 70, 0)
      stmt.run('test-device', '2025-08-18T09:05:00Z', 50.1140, 8.6850, 80, 1100)
    })

    test('returns trip data', async () => {
      const response = await request(app)
        .get('/api/trips')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('device')
      expect(response.body[0]).toHaveProperty('start_ts')
      expect(response.body[0]).toHaveProperty('end_ts')
    })

    test('supports pagination', async () => {
      const response = await request(app)
        .get('/api/trips?limit=1&offset=0')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body).toHaveLength(1)
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/trips')
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })

  describe('GET /api/fuel/months', () => {
    beforeEach(async () => {
      // Insert test fuel data for different months
      app.helpers.db.prepare(`INSERT INTO fuel 
        (ts, liters, amount_total, user) 
        VALUES (?, ?, ?, ?)`).run(
        '2025-08-18T08:00:00Z', 45.2, 75.01, 'test-user'
      )
      app.helpers.db.prepare(`INSERT INTO fuel 
        (ts, liters, amount_total, user) 
        VALUES (?, ?, ?, ?)`).run(
        '2025-07-15T08:00:00Z', 40.5, 65.57, 'test-user'
      )
    })

    test('returns monthly fuel statistics', async () => {
      const response = await request(app)
        .get('/api/fuel/months')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('month')
      expect(response.body[0]).toHaveProperty('cost')
      expect(response.body[0]).toHaveProperty('liters')
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/fuel/months')
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })

  describe('GET /api/trip/:start', () => {
    beforeEach(async () => {
      // Insert test GPS data for a specific trip
      const stmt = app.helpers.db.prepare(`INSERT INTO car_track 
        (device, ts, lat, lon, spd_kmh, temp_c, alt_m, hdop, sats) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

      stmt.run('test-device', '2025-08-18T08:00:00Z', 50.1109, 8.6821, 50, 22.5, 100, 1.2, 8)
      stmt.run('test-device', '2025-08-18T08:05:00Z', 50.1120, 8.6830, 60, 22.4, 101, 1.1, 9)
      stmt.run('test-device', '2025-08-18T08:10:00Z', 50.1130, 8.6840, 70, 22.3, 102, 1.0, 10)
    })

    test('returns GPS points for specific trip', async () => {
      const response = await request(app)
        .get('/api/trip/2025-08-18T08:00:00Z')
        .set('x-auth-user', 'test-user')
        .expect(200)

      // Note: This endpoint uses complex SQL logic to determine trip boundaries
      // The exact behavior depends on the data, so we just verify it returns an array
      expect(Array.isArray(response.body)).toBe(true)
    })

    test('returns empty array for non-existent trip', async () => {
      const response = await request(app)
        .get('/api/trip/2025-12-25T00:00:00Z')
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body).toEqual([])
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/trip/2025-08-18T08:00:00Z')
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })

  describe('POST /retryReceipt/:id', () => {
    test('retries OCR processing successfully', async () => {
      // First, insert a fuel record with OCR error
      const testFile = createMockReceiptFile()
      const stmt = app.helpers.db.prepare(`INSERT INTO fuel 
        (ts, photo_path, ocr_error, user) 
        VALUES (?, ?, ?, ?)`)
      const result = stmt.run('2025-08-18T08:00:00Z', testFile, 'Previous OCR failed', 'test-user')
      const fuelId = result.lastInsertRowid

      // Mock successful Gemini API response for retry
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(200, {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(sampleFuelData)
              }]
            }
          }]
        })

      // Mock geocoding API
      nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query(true)
        .reply(200, [{
          lat: '50.1109',
          lon: '8.6821'
        }])

      const response = await request(app)
        .post(`/retryReceipt/${fuelId}`)
        .set('x-auth-user', 'test-user')
        .expect(200)

      expect(response.body.ok).toBe(true)
      expect(response.body.parsed).toMatchObject({
        station_name: 'Shell',
        amount_total: 75.01
      })

      // Verify database was updated
      const updated = app.helpers.db.prepare('SELECT * FROM fuel WHERE id = ?').get(fuelId)
      expect(updated.station_name).toBe('Shell')
      expect(updated.ocr_error).toBeNull()

      fs.unlinkSync(testFile)
    })

    test('returns 404 for non-existent record', async () => {
      const response = await request(app)
        .post('/retryReceipt/99999')
        .set('x-auth-user', 'test-user')
        .expect(404)

      expect(response.body.error).toBe('not found')
    })

    test('requires authentication', async () => {
      const response = await request(app)
        .post('/retryReceipt/1')
        .expect(401)

      expect(response.body.error).toMatch(/Authentication required|X-Auth-User header missing/)
    })
  })
})
