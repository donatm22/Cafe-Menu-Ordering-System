import express from 'express'
import {
  createOrder,
  getOrder,
  getOrders,
  trackOrder,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { protect, requireRole } from '../models/middleware/authMiddleware.js'

const router = express.Router()

router.post('/', createOrder)
router.get('/track/:orderNumber', trackOrder)
router.get('/', protect, requireRole('admin', 'staff'), getOrders)
router.get('/:id', protect, requireRole('admin', 'staff'), getOrder)
router.patch('/:id/status', protect, requireRole('admin', 'staff'), updateOrderStatus)

export default router
