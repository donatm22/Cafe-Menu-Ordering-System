import cors from 'cors'
import express from 'express'

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Cafe API is running.',
    timestamp: new Date().toISOString(),
  })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
