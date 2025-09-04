import fs from 'fs'

export const createConfig = (overrides = {}) => {
  const config = {
    DATA_PATH: process.env.DATA_PATH || 'data/gps/',
    GEMINI_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    ...overrides
  }

  // Compute derived paths
  config.DB_FILE = config.DB_FILE || (config.DATA_PATH + (process.env.DB_FILE || 'cartracker.db'))
  config.GEOCACHE = config.GEOCACHE || (config.DATA_PATH + (process.env.GEOCACHE || 'geocache.json'))
  config.UPLOAD_DIR = config.UPLOAD_DIR || (config.DATA_PATH + (process.env.UPLOAD_DIR || 'uploads/'))

  return config
}

export const ensureDirectories = (config) => {
  // Create directories if they don't exist
  if (!fs.existsSync(config.UPLOAD_DIR)) {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true })
  }
}
