export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  res.status(404)
  next(error)
}

export const errorHandler = (error, _req, res, _next) => {
  const statusCode =
    res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : error.statusCode || 500

  if (error.code === '23505') {
    res.status(409).json({
      message: 'A record with one of those unique values already exists.',
      details: error.detail,
    })
    return
  }

  if (error.code === '23503') {
    res.status(400).json({
      message: 'This action references a related record that does not exist.',
      details: error.detail,
    })
    return
  }

  if (error.code === '22P02') {
    res.status(400).json({
      message: 'One of the provided values has an invalid format.',
      details: error.message,
    })
    return
  }

  res.status(statusCode).json({
    message: error.message || 'Something went wrong.',
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : {
          stack: error.stack,
        }),
  })
}
