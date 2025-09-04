import winston from 'winston'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Global configuration for logger
let globalLoggerConfig = { silent: false }
let globalLogger = null

export const setLoggerConfig = (config) => {
  globalLoggerConfig = { ...globalLoggerConfig, ...config }
  // Reset global logger when config changes
  globalLogger = null
}

// Create logger with appropriate configuration for development vs production
export const createLogger = (overrides = {}) => {
  if (globalLogger && !overrides) {
    return globalLogger
  }

  const config = { ...globalLoggerConfig, ...overrides }
  const logLevel = config.logLevel || (isDevelopment ? 'debug' : 'info')

  const formats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ]

  // In development, use colorized console output with more detail
  if (isDevelopment) {
    formats.push(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
        return `${timestamp} [${level}] ${message}${metaStr}`
      })
    )
  } else {
    // In production, use JSON format for structured logging
    formats.push(winston.format.json())
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(...formats),
    transports: [
      new winston.transports.Console({
        silent: config.silent || false
      })
    ]
  })

  if (!overrides) {
    globalLogger = logger
  }

  return logger
}

// Helper functions that use the global logger
export const logInfo = (message, meta = {}) => {
  const logger = globalLogger || createLogger()
  logger.info(message, meta)
}

export const logError = (message, meta = {}) => {
  const logger = globalLogger || createLogger()
  logger.error(message, meta)
}

export const logWarn = (message, meta = {}) => {
  const logger = globalLogger || createLogger()
  logger.warn(message, meta)
}

export const logDebug = (message, meta = {}) => {
  const logger = globalLogger || createLogger()
  logger.debug(message, meta)
}
