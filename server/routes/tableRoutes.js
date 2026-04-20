import express from 'express'
import {
  createTable,
  deleteTable,
  getPublicTable,
  getTable,
  getTables,
  updateTable,
} from '../controllers/tableController.js'
import { protect, requireRole } from '../models/middleware/authMiddleware.js'

const router = express.Router()

router.get('/public/:code', getPublicTable)
router.get('/', protect, requireRole('admin'), getTables)
router.get('/:id', protect, requireRole('admin'), getTable)
router.post('/', protect, requireRole('admin'), createTable)
router.put('/:id', protect, requireRole('admin'), updateTable)
router.delete('/:id', protect, requireRole('admin'), deleteTable)

export default router
