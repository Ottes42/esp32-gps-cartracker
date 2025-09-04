import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

export const createMiddleware = () => {
  // Authentication middleware (applies to all routes except /health)
  const authMiddleware = (req, res, next) => {
    let authUser = req.get('x-auth-user')
    // Only allow development header from localhost/127.0.0.1
    if (authUser === 'development') {
      if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
        return res.status(401).json({ error: 'Authentication required' })
      }
    } else if (authUser === undefined && req.hostname === 'localhost') {
      authUser = 'development'
    }

    // In production, proxy must inject real username
    if (!authUser) {
      return res.status(401).json({ error: 'X-Auth-User header missing - check proxy configuration' })
    }

    req.authUser = authUser
    next()
  }

  // Define reusable rate limiters
  const limiters = {
    gpsUpload: rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests/minute
      standardHeaders: true,
      legacyHeaders: false
    }),
    receiptUpload: rateLimit({
      windowMs: 60 * 1000,
      max: 10, // 10 requests/minute
      standardHeaders: true,
      legacyHeaders: false
    }),
    api: rateLimit({
      windowMs: 60 * 1000,
      max: 60, // 60 requests/minute
      standardHeaders: true,
      legacyHeaders: false
    })
  }

  const setupBasicMiddleware = (app) => {
    app.use(cors())
    app.use(express.json())
    app.use(express.static('public'))
  }

  return {
    authMiddleware,
    limiters,
    setupBasicMiddleware
  }
}
