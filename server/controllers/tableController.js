import { getDb } from '../config/db.js'
import asyncHandler from '../utils/asyncHandler.js'
import { normalizeTableCode } from '../utils/formatters.js'

const tableSelect = `
  select
    id,
    name,
    table_code as code,
    seating_capacity as "seatingCapacity",
    location,
    is_active as "isActive",
    created_at as "createdAt",
    updated_at as "updatedAt"
  from cafe_tables
`

const getTableByIdOrThrow = async (sql, id) => {
  const [table] = await sql.unsafe(`${tableSelect} where id = $1 limit 1`, [id])

  if (!table) {
    const error = new Error('Table not found.')
    error.statusCode = 404
    throw error
  }

  return table
}

export const getTables = asyncHandler(async (_req, res) => {
  const sql = getDb()
  const tables = await sql.unsafe(`${tableSelect} order by name asc`)
  res.json({ tables })
})

export const getTable = asyncHandler(async (req, res) => {
  const sql = getDb()
  const table = await getTableByIdOrThrow(sql, req.params.id)
  res.json({ table })
})

export const getPublicTable = asyncHandler(async (req, res) => {
  const sql = getDb()
  const code = normalizeTableCode(req.params.code)
  const [table] = await sql.unsafe(
    `${tableSelect} where table_code = $1 and is_active = true limit 1`,
    [code],
  )

  if (!table) {
    res.status(404)
    throw new Error('Table not found or inactive.')
  }

  res.json({
    table: {
      ...table,
      menuUrl: `/menu/${table.code}`,
    },
  })
})

export const createTable = asyncHandler(async (req, res) => {
  const { name, code, seatingCapacity = 0, location, isActive = true } = req.body

  if (!name) {
    res.status(400)
    throw new Error('Table name is required.')
  }

  const sql = getDb()
  const [table] = await sql`
    insert into cafe_tables (name, table_code, seating_capacity, location, is_active)
    values (
      ${name.trim()},
      ${normalizeTableCode(code || name)},
      ${Number(seatingCapacity) || 0},
      ${location?.trim() || null},
      ${Boolean(isActive)}
    )
    returning
      id,
      name,
      table_code as code,
      seating_capacity as "seatingCapacity",
      location,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  res.status(201).json({ table })
})

export const updateTable = asyncHandler(async (req, res) => {
  const sql = getDb()
  const existing = await getTableByIdOrThrow(sql, req.params.id)

  const payload = {
    name: req.body.name?.trim() || existing.name,
    code:
      req.body.code !== undefined
        ? normalizeTableCode(req.body.code || existing.code)
        : existing.code,
    seatingCapacity:
      req.body.seatingCapacity !== undefined
        ? Number(req.body.seatingCapacity) || 0
        : existing.seatingCapacity,
    location:
      req.body.location !== undefined
        ? req.body.location?.trim() || null
        : existing.location,
    isActive:
      req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
  }

  const [table] = await sql`
    update cafe_tables
    set
      name = ${payload.name},
      table_code = ${payload.code},
      seating_capacity = ${payload.seatingCapacity},
      location = ${payload.location},
      is_active = ${payload.isActive},
      updated_at = now()
    where id = ${req.params.id}
    returning
      id,
      name,
      table_code as code,
      seating_capacity as "seatingCapacity",
      location,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  res.json({ table })
})

export const deleteTable = asyncHandler(async (req, res) => {
  const sql = getDb()
  await getTableByIdOrThrow(sql, req.params.id)

  const [{ count }] = await sql`
    select count(*)::int as count
    from orders
    where table_id = ${req.params.id}
      and status not in ('served', 'cancelled')
  `

  if (count > 0) {
    res.status(409)
    throw new Error('This table still has active orders attached to it.')
  }

  await sql`delete from cafe_tables where id = ${req.params.id}`
  res.status(204).send()
})
