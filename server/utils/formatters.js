export const normalizeTableCode = (value) =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export const parsePriceToCents = (value) => {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error('Price must be a valid positive number.')
  }

  return Math.round(numericValue * 100)
}
