import express from 'express'
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from '../controllers/categoryController.js'
import { protect, requireRole } from '../models/middleware/authMiddleware.js'

const router = express.Router()

router.get('/', getCategories)
router.get('/:id', getCategory)
router.post('/', protect, requireRole('admin'), createCategory)
router.put('/:id', protect, requireRole('admin'), updateCategory)
router.delete('/:id', protect, requireRole('admin'), deleteCategory)

export default router
