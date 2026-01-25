import './types/express.d.ts'
import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import authRoutes from './routes/auth'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json())

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Routes
  app.use('/auth', authRoutes)

  // 404 + error handling (must be last)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
