import express from 'express'
import { bootstrapAdmin, login, me } from '../controllers/authController.js/index.js'
import { protect } from '../models/middleware/authMiddleware.js'

const router = express.Router()

router.post('/bootstrap', bootstrapAdmin)
router.post('/login', login)
router.get('/me', protect, me)

export default router
