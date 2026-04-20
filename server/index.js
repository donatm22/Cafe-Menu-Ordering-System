import 'dotenv/config'
import app from './config/server.js'
import { checkDbConnection } from './config/db.js'

const port = process.env.PORT || 5000

const startServer = async () => {
  if (process.env.DATABASE_URL) {
    await checkDbConnection()
    console.log('Supabase PostgreSQL connection is ready.')
  } else {
    console.warn('DATABASE_URL is not set. API routes that need the database will fail until it is configured.')
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
