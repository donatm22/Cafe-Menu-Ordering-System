import { getDb } from '../config/db.js'
import asyncHandler from '../utils/asyncHandler.js'
import { parsePriceToCents } from '../utils/formatters.js'

const menuSelect = `
  select
    mi.id,
    mi.name,
    mi.description,
    mi.image_url as "imageUrl",
    mi.price_cents as "priceCents",
    round(mi.price_cents / 100.0, 2)::float as price,
    mi.is_available as "isAvailable",
    mi.sort_order as "sortOrder",
    mi.created_at as "createdAt",
    mi.updated_at as "updatedAt",
    c.id as "categoryId",
    c.name as "categoryName"
  from menu_items mi
  join categories c on c.id = mi.category_id
`

const getMenuItemByIdOrThrow = async (sql, id) => {
  const [item] = await sql.unsafe(`${menuSelect} where mi.id = $1 limit 1`, [id])

  if (!item) {
    const error = new Error('Menu item not found.')
    error.statusCode = 404
    throw error
  }

  return item
}

const ensureCategoryExists = async (sql, categoryId) => {
  const [category] = await sql`
    select id from categories where id = ${categoryId} limit 1
  `

  if (!category) {
    const error = new Error('Selected category does not exist.')
    error.statusCode = 400
    throw error
  }
}

export const getMenuItems = asyncHandler(async (req, res) => {
  const sql = getDb()
  const filters = []

  if (req.query.categoryId) {
    filters.push(sql`mi.category_id = ${req.query.categoryId}`)
  }

  if (req.query.available === 'true') {
    filters.push(sql`mi.is_available = true`)
  }

  const whereClause = filters.length
    ? sql`where ${sql.join(filters, sql` and `)}`
    : sql``

  const items = await sql`
    ${sql.unsafe(menuSelect)}
    ${whereClause}
    order by c.name asc, mi.sort_order asc, mi.name asc
  `

  res.json({ items })
})

export const getMenuItem = asyncHandler(async (req, res) => {
  const sql = getDb()
  const item = await getMenuItemByIdOrThrow(sql, req.params.id)
  res.json({ item })
})

export const getPublicMenu = asyncHandler(async (req, res) => {
  const sql = getDb()
  const tableCode = req.params.tableCode.trim().toUpperCase()

  const [table] = await sql`
    select
      id,
      name,
      table_code as code,
      seating_capacity as "seatingCapacity",
      location,
      is_active as "isActive"
    from cafe_tables
    where table_code = ${tableCode} and is_active = true
    limit 1
  `

  if (!table) {
    res.status(404)
    throw new Error('Table not found or inactive.')
  }

  const categories = await sql`
    select
      id,
      name,
      description,
      sort_order as "sortOrder"
    from categories
    where is_active = true
    order by sort_order asc, name asc
  `

  const items = await sql`
    ${sql.unsafe(menuSelect)}
    where mi.is_available = true and c.is_active = true
    order by c.sort_order asc, mi.sort_order asc, mi.name asc
  `

  res.json({
    table,
    categories,
    items,
  })
})

export const createMenuItem = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    imageUrl,
    price,
    categoryId,
    isAvailable = true,
    sortOrder = 0,
  } = req.body

  if (!name || price === undefined || !categoryId) {
    res.status(400)
    throw new Error('name, price, and categoryId are required.')
  }

  const sql = getDb()
  await ensureCategoryExists(sql, categoryId)

  const [item] = await sql`
    insert into menu_items (
      name,
      description,
      image_url,
      price_cents,
      category_id,
      is_available,
      sort_order
    )
    values (
      ${name.trim()},
      ${description?.trim() || null},
      ${imageUrl?.trim() || null},
      ${parsePriceToCents(price)},
      ${categoryId},
      ${Boolean(isAvailable)},
      ${Number(sortOrder) || 0}
    )
    returning
      id,
      name,
      description,
      image_url as "imageUrl",
      price_cents as "priceCents",
      round(price_cents / 100.0, 2)::float as price,
      is_available as "isAvailable",
      sort_order as "sortOrder",
      created_at as "createdAt",
      updated_at as "updatedAt",
      category_id as "categoryId"
  `

  res.status(201).json({ item })
})

export const updateMenuItem = asyncHandler(async (req, res) => {
  const sql = getDb()
  const existing = await getMenuItemByIdOrThrow(sql, req.params.id)
  const nextCategoryId = req.body.categoryId || existing.categoryId

  await ensureCategoryExists(sql, nextCategoryId)

  const payload = {
    name: req.body.name?.trim() || existing.name,
    description:
      req.body.description !== undefined
        ? req.body.description?.trim() || null
        : existing.description,
    imageUrl:
      req.body.imageUrl !== undefined ? req.body.imageUrl?.trim() || null : existing.imageUrl,
    priceCents:
      req.body.price !== undefined
        ? parsePriceToCents(req.body.price)
        : existing.priceCents,
    categoryId: nextCategoryId,
    isAvailable:
      req.body.isAvailable !== undefined
        ? Boolean(req.body.isAvailable)
        : existing.isAvailable,
    sortOrder:
      req.body.sortOrder !== undefined
        ? Number(req.body.sortOrder) || 0
        : existing.sortOrder,
  }

  const [item] = await sql`
    update menu_items
    set
      name = ${payload.name},
      description = ${payload.description},
      image_url = ${payload.imageUrl},
      price_cents = ${payload.priceCents},
      category_id = ${payload.categoryId},
      is_available = ${payload.isAvailable},
      sort_order = ${payload.sortOrder},
      updated_at = now()
    where id = ${req.params.id}
    returning
      id,
      name,
      description,
      image_url as "imageUrl",
      price_cents as "priceCents",
      round(price_cents / 100.0, 2)::float as price,
      is_available as "isAvailable",
      sort_order as "sortOrder",
      created_at as "createdAt",
      updated_at as "updatedAt",
      category_id as "categoryId"
  `

  res.json({ item })
})

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const sql = getDb()
  await getMenuItemByIdOrThrow(sql, req.params.id)

  await sql`delete from menu_items where id = ${req.params.id}`
  res.status(204).send()
})
