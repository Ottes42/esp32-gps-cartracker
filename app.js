import express from 'express'
import { createConfig, ensureDirectories } from './lib/config.js'
import { createLogger, setLoggerConfig } from './lib/logger.js'
import { initializeDatabase } from './lib/database.js'
import { createHelpers } from './lib/helpers.js'
import { createMiddleware } from './lib/middleware.js'
import { createRoutes } from './lib/routes.js'

// Configuration with defaults for testing
export const createApp = (configOverrides = {}) => {
  // Initialize configuration
  const config = createConfig(configOverrides)
  ensureDirectories(config)

  // Configure global logger settings
  setLoggerConfig({ silent: configOverrides.silentLogger || false })

  // Initialize logger (creates global instance used by modules)
  createLogger()

  // Initialize database
  const db = initializeDatabase(config.DB_FILE)

  // Initialize helpers with dependency injection
  const helpers = createHelpers(config)

  // Initialize middleware
  const { authMiddleware, limiters, setupBasicMiddleware } = createMiddleware()

  // Create Express app
  const app = express()

  // Setup basic middleware
  setupBasicMiddleware(app)

  // Add authentication middleware (applies to all routes except /health)
  app.use('/api', authMiddleware)
  app.use('/upload', authMiddleware)
  app.use('/uploadReceipt', authMiddleware)
  app.use('/retryReceipt', authMiddleware)

  // Setup routes
  const routes = createRoutes(db, helpers, limiters, config)
  app.use('/', routes)

  // Attach helpers to app for testing (maintains backward compatibility)
  app.helpers = {
    db,
    parseReceipt: helpers.parseReceipt,
    geocodeAddress: helpers.geocodeAddress,
    distanceKm: helpers.distanceKm
  }

  return app
}
