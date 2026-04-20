import jwt from 'jsonwebtoken'
import { getDb } from '../../config/db.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401)
    throw new Error('Authorization token is required.')
  }

  let payload

  try {
    payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'development-only-secret-change-me',
    )
  } catch {
    res.status(401)
    throw new Error('Invalid or expired token.')
  }

  const sql = getDb()
  const [user] = await sql`
    select
      id,
      full_name as "fullName",
      email,
      role,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from admin_users
    where id = ${payload.sub}
    limit 1
  `

  if (!user) {
    res.status(401)
    throw new Error('User no longer exists.')
  }

  req.user = user
  next()
})

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403)
    throw new Error('You do not have permission to access this resource.')
  }

  next()
}
