import express from 'express'
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItem,
  getMenuItems,
  getPublicMenu,
  updateMenuItem,
} from '../controllers/menuController.js'
import { protect, requireRole } from '../models/middleware/authMiddleware.js'

const router = express.Router()

router.get('/public/:tableCode', getPublicMenu)
router.get('/', getMenuItems)
router.get('/:id', getMenuItem)
router.post('/', protect, requireRole('admin'), createMenuItem)
router.put('/:id', protect, requireRole('admin'), updateMenuItem)
router.delete('/:id', protect, requireRole('admin'), deleteMenuItem)

export default router
