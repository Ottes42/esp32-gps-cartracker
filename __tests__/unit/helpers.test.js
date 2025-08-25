import { createTestApp, cleanupTestFiles, sampleFuelData } from '../helpers.js'
import nock from 'nock'
import fs from 'fs'

describe('Helper Functions', () => {
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

  describe('distanceKm', () => {
    test('calculates distance between two points correctly', () => {
      // Distance between Frankfurt and Munich (approx 300km)
      const frankfurtLat = 50.1109
      const frankfurtLon = 8.6821
      const munichLat = 48.1351
      const munichLon = 11.5820

      const distance = app.helpers.distanceKm(frankfurtLat, frankfurtLon, munichLat, munichLon)

      // Should be approximately 300km (allowing for some variance)
      expect(distance).toBeGreaterThan(290)
      expect(distance).toBeLessThan(310)
    })

    test('returns 0 for identical coordinates', () => {
      const distance = app.helpers.distanceKm(50.1109, 8.6821, 50.1109, 8.6821)
      expect(distance).toBe(0)
    })

    test('handles negative coordinates', () => {
      const distance = app.helpers.distanceKm(-33.8688, 151.2093, -37.8136, 144.9631)
      // Distance between Sydney and Melbourne (approx 713km)
      expect(distance).toBeGreaterThan(700)
      expect(distance).toBeLessThan(720)
    })
  })

  describe('geocodeAddress', () => {
    test('returns null for empty address', async () => {
      const result = await app.helpers.geocodeAddress('')
      expect(result).toBeNull()
    })

    test('returns null for whitespace-only address', async () => {
      const result = await app.helpers.geocodeAddress('   ')
      expect(result).toBeNull()
    })

    test('geocodes address successfully', async () => {
      // Mock the Nominatim API response
      nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query({
          format: 'json',
          q: 'Frankfurt Hauptstraße',
          limit: '1',
          countrycodes: 'de'
        })
        .reply(200, [{
          lat: '50.1109',
          lon: '8.6821',
          display_name: 'Hauptstraße, Frankfurt am Main, Germany'
        }])

      const result = await app.helpers.geocodeAddress('Frankfurt Hauptstraße')

      expect(result).toEqual({
        lat: 50.1109,
        lon: 8.6821
      })
    })

    test('caches geocoding results', async () => {
      // Mock the first API call
      const scope = nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query({
          format: 'json',
          q: 'Frankfurt Test',
          limit: '1',
          countrycodes: 'de'
        })
        .reply(200, [{
          lat: '50.1109',
          lon: '8.6821'
        }])

      // First call should hit the API
      const result1 = await app.helpers.geocodeAddress('Frankfurt Test')
      expect(result1).toEqual({ lat: 50.1109, lon: 8.6821 })
      expect(scope.isDone()).toBe(true)

      // Second call should use cache (no additional API call expected)
      const result2 = await app.helpers.geocodeAddress('Frankfurt Test')
      expect(result2).toEqual({ lat: 50.1109, lon: 8.6821 })
    })

    test('handles API error gracefully', async () => {
      nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query(true)
        .reply(500, 'Internal Server Error')

      const result = await app.helpers.geocodeAddress('Invalid Address')
      expect(result).toBeNull()
    })

    test('returns null when no results found', async () => {
      nock('https://nominatim.openstreetmap.org')
        .get('/search')
        .query(true)
        .reply(200, [])

      const result = await app.helpers.geocodeAddress('Nonexistent Address')
      expect(result).toBeNull()
    })
  })

  describe('parseReceipt', () => {
    test('throws error when GEMINI_KEY is missing', async () => {
      const appNoKey = createTestApp({ GEMINI_KEY: '' })
      const testFile = '/tmp/test-receipt.jpg'
      fs.writeFileSync(testFile, 'dummy content')

      await expect(appNoKey.helpers.parseReceipt(testFile))
        .rejects.toThrow('GEMINI_API_KEY missing')

      fs.unlinkSync(testFile)
      appNoKey.helpers.db.close()
    })

    test('processes receipt successfully', async () => {
      const testFile = '/tmp/test-receipt.jpg'
      fs.writeFileSync(testFile, 'dummy image content')

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

      const result = await app.helpers.parseReceipt(testFile)

      expect(result).toEqual(sampleFuelData)

      fs.unlinkSync(testFile)
    })

    test('handles Gemini API error', async () => {
      const testFile = '/tmp/test-receipt.jpg'
      fs.writeFileSync(testFile, 'dummy image content')

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(500, 'API Error')

      await expect(app.helpers.parseReceipt(testFile))
        .rejects.toThrow('Gemini API error: 500 API Error')

      fs.unlinkSync(testFile)
    })

    test('handles invalid JSON response', async () => {
      const testFile = '/tmp/test-receipt.jpg'
      fs.writeFileSync(testFile, 'dummy image content')

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(200, {
          candidates: [{
            content: {
              parts: [{
                text: 'This is not valid JSON'
              }]
            }
          }]
        })

      await expect(app.helpers.parseReceipt(testFile))
        .rejects.toThrow('No JSON found in Gemini response')

      fs.unlinkSync(testFile)
    })

    test('handles missing critical fields', async () => {
      const testFile = '/tmp/test-receipt.jpg'
      fs.writeFileSync(testFile, 'dummy image content')

      const incompleteData = { station_name: 'Shell' } // Missing ts and amount_total

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/test-model:generateContent')
        .query({ key: 'test-key' })
        .reply(200, {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(incompleteData)
              }]
            }
          }]
        })

      await expect(app.helpers.parseReceipt(testFile))
        .rejects.toThrow('Critical fields missing from receipt')

      fs.unlinkSync(testFile)
    })
  })
})
