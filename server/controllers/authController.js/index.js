import bcrypt from 'bcryptjs'
import { getDb } from '../../config/db.js'
import asyncHandler from '../../utils/asyncHandler.js'
import { createToken } from '../../utils/createToken.js'

const mapUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export const bootstrapAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body

  if (!fullName || !email || !password) {
    res.status(400)
    throw new Error('fullName, email, and password are required.')
  }

  if (password.length < 8) {
    res.status(400)
    throw new Error('Password must be at least 8 characters long.')
  }

  const sql = getDb()
  const normalizedEmail = email.trim().toLowerCase()
  const [{ count }] = await sql`select count(*)::int as count from admin_users`

  if (count > 0) {
    res.status(403)
    throw new Error('Bootstrap is only allowed before the first admin user exists.')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const [user] = await sql`
    insert into admin_users (full_name, email, password_hash, role)
    values (${fullName.trim()}, ${normalizedEmail}, ${passwordHash}, 'admin')
    returning
      id,
      full_name as "fullName",
      email,
      role,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  res.status(201).json({
    user: mapUser(user),
    token: createToken(user),
  })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400)
    throw new Error('email and password are required.')
  }

  const sql = getDb()
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await sql`
    select
      id,
      full_name as "fullName",
      email,
      role,
      password_hash as "passwordHash",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from admin_users
    where email = ${normalizedEmail}
    limit 1
  `

  if (!user) {
    res.status(401)
    throw new Error('Invalid email or password.')
  }

  const matches = await bcrypt.compare(password, user.passwordHash)

  if (!matches) {
    res.status(401)
    throw new Error('Invalid email or password.')
  }

  res.json({
    user: mapUser(user),
    token: createToken(user),
  })
})

export const me = asyncHandler(async (req, res) => {
  res.json({
    user: req.user,
  })
})
