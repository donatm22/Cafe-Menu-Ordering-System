import { getDb } from '../config/db.js'
import asyncHandler from '../utils/asyncHandler.js'

const categorySelect = `
  select
    id,
    name,
    description,
    sort_order as "sortOrder",
    is_active as "isActive",
    created_at as "createdAt",
    updated_at as "updatedAt"
  from categories
`

const getCategoryByIdOrThrow = async (sql, id) => {
  const [category] = await sql.unsafe(
    `${categorySelect} where id = $1 limit 1`,
    [id],
  )

  if (!category) {
    const error = new Error('Category not found.')
    error.statusCode = 404
    throw error
  }

  return category
}

export const getCategories = asyncHandler(async (req, res) => {
  const sql = getDb()
  const activeOnly = req.query.active === 'true'
  const categories = activeOnly
    ? await sql.unsafe(`${categorySelect} where is_active = true order by sort_order asc, name asc`)
    : await sql.unsafe(`${categorySelect} order by sort_order asc, name asc`)

  res.json({ categories })
})

export const getCategory = asyncHandler(async (req, res) => {
  const sql = getDb()
  const category = await getCategoryByIdOrThrow(sql, req.params.id)
  res.json({ category })
})

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, sortOrder = 0, isActive = true } = req.body

  if (!name) {
    res.status(400)
    throw new Error('Category name is required.')
  }

  const sql = getDb()
  const [category] = await sql`
    insert into categories (name, description, sort_order, is_active)
    values (
      ${name.trim()},
      ${description?.trim() || null},
      ${Number(sortOrder) || 0},
      ${Boolean(isActive)}
    )
    returning
      id,
      name,
      description,
      sort_order as "sortOrder",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  res.status(201).json({ category })
})

export const updateCategory = asyncHandler(async (req, res) => {
  const sql = getDb()
  const existing = await getCategoryByIdOrThrow(sql, req.params.id)

  const payload = {
    name: req.body.name?.trim() || existing.name,
    description:
      req.body.description !== undefined
        ? req.body.description?.trim() || null
        : existing.description,
    sortOrder:
      req.body.sortOrder !== undefined
        ? Number(req.body.sortOrder) || 0
        : existing.sortOrder,
    isActive:
      req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
  }

  const [category] = await sql`
    update categories
    set
      name = ${payload.name},
      description = ${payload.description},
      sort_order = ${payload.sortOrder},
      is_active = ${payload.isActive},
      updated_at = now()
    where id = ${req.params.id}
    returning
      id,
      name,
      description,
      sort_order as "sortOrder",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  res.json({ category })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  const sql = getDb()
  await getCategoryByIdOrThrow(sql, req.params.id)

  const [{ count }] = await sql`
    select count(*)::int as count
    from menu_items
    where category_id = ${req.params.id}
  `

  if (count > 0) {
    res.status(409)
    throw new Error('Remove or reassign menu items before deleting this category.')
  }

  await sql`delete from categories where id = ${req.params.id}`
  res.status(204).send()
})
