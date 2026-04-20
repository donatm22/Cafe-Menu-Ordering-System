import cors from 'cors'
import express from 'express'
import authRoutes from '../routes/authRoutes.js'
import categoryRoutes from '../routes/categoryRoutes.js'
import menuRoutes from '../routes/menuRoutes.js'
import orderRoutes from '../routes/orderRoutes.js'
import tableRoutes from '../routes/tableRoutes.js'
import { checkDbConnection } from './db.js'
import asyncHandler from '../utils/asyncHandler.js'
import { errorHandler, notFound } from '../models/middleware/errorMiddleware.js'

const app = express()

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : true

app.use(
  cors({
    origin: allowedOrigins,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    if (!process.env.DATABASE_URL) {
      res.json({
        status: 'warning',
        message: 'API is running, but DATABASE_URL is not configured yet.',
        database: 'not-configured',
        timestamp: new Date().toISOString(),
      })
      return
    }

    await checkDbConnection()

    res.json({
      status: 'ok',
      message: 'Cafe API and Supabase PostgreSQL are connected.',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  }),
)

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/tables', tableRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
