import { createApp } from '../app.js'
import fs from 'fs'
import path from 'path'

// Test helper functions
export const testConfig = {
  DATA_PATH: '/tmp/test-gps/',
  DB_FILE: ':memory:', // Use in-memory SQLite database for tests
  GEOCACHE: '/tmp/test-gps/test-geocache.json',
  UPLOAD_DIR: '/tmp/test-gps/uploads/',
  GEMINI_KEY: 'test-key',
  GEMINI_MODEL: 'test-model'
}

export const cleanupTestFiles = () => {
  try {
    if (fs.existsSync('/tmp/test-gps')) {
      fs.rmSync('/tmp/test-gps', { recursive: true, force: true })
    }
  } catch (e) {
    // Silently ignore cleanup errors in tests
  }
}

export const createTestApp = (config = {}) => {
  const mergedConfig = { ...testConfig, ...config }
  return createApp(mergedConfig)
}

export const sampleCsvData = `2025-08-18T08:00:00Z,50.1109,8.6821,100.0,50.5,1.2,8,90.0,22.5,65.0
2025-08-18T08:01:00Z,50.1110,8.6822,101.0,52.2,1.1,9,91.0,22.4,65.1
2025-08-18T08:02:00Z,50.1111,8.6823,102.0,48.8,1.0,10,92.0,22.3,65.2`

export const sampleFuelData = {
  ts: '2025-08-18T07:30:00Z',
  liters: 45.2,
  price_per_l: 1.659,
  amount_fuel: 75.01,
  amount_total: 75.01,
  station_name: 'Shell',
  station_zip: '60311',
  station_city: 'Frankfurt',
  station_address: 'Hauptstraße 123'
}

// Mock file creation for receipt testing
export const createMockReceiptFile = (filename = 'test-receipt.jpg') => {
  const testFile = path.join('/tmp', filename)
  // Create a dummy image file (just empty bytes for testing)
  fs.writeFileSync(testFile, Buffer.alloc(1024))
  return testFile
}
