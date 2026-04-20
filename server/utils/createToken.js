import jwt from 'jsonwebtoken'

export const createToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET || 'development-only-secret-change-me',
    {
      expiresIn: '7d',
    },
  )
