import { randomUUID } from 'node:crypto'
import { getDb } from '../config/db.js'
import asyncHandler from '../utils/asyncHandler.js'

const validStatuses = ['new', 'preparing', 'ready', 'served', 'cancelled']
const validPaymentStatuses = ['pending', 'paid']

const orderSelect = `
  select
    o.id,
    o.order_number as "orderNumber",
    o.customer_name as "customerName",
    o.notes,
    o.status,
    o.payment_method as "paymentMethod",
    o.payment_status as "paymentStatus",
    o.total_cents as "totalCents",
    round(o.total_cents / 100.0, 2)::float as total,
    o.created_at as "createdAt",
    o.updated_at as "updatedAt",
    t.id as "tableId",
    t.name as "tableName",
    t.table_code as "tableCode"
  from orders o
  join cafe_tables t on t.id = o.table_id
`

const orderItemSelect = `
  select
    oi.id,
    oi.order_id as "orderId",
    oi.menu_item_id as "menuItemId",
    oi.item_name as name,
    oi.quantity,
    oi.price_cents as "priceCents",
    round(oi.price_cents / 100.0, 2)::float as price,
    oi.line_total_cents as "lineTotalCents",
    round(oi.line_total_cents / 100.0, 2)::float as total,
    oi.created_at as "createdAt"
  from order_items oi
`

const buildOrderNumber = () =>
  `ORD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`

const getOrdersWithItems = async (sql, whereClause, params = []) => {
  const orders = await sql.unsafe(
    `${orderSelect} ${whereClause} order by o.created_at desc`,
    params,
  )

  if (!orders.length) {
    return []
  }

  const orderIds = orders.map((order) => sql`${order.id}`)
  const items = await sql`
    ${sql.unsafe(orderItemSelect)}
    where oi.order_id in (${sql.join(orderIds, sql`, `)})
    order by oi.created_at asc
  `

  const itemsByOrder = items.reduce((groups, item) => {
    groups[item.orderId] = groups[item.orderId] || []
    groups[item.orderId].push(item)
    return groups
  }, {})

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder[order.id] || [],
  }))
}

export const createOrder = asyncHandler(async (req, res) => {
  const { tableCode, items, customerName, notes } = req.body

  if (!tableCode || !Array.isArray(items) || items.length === 0) {
    res.status(400)
    throw new Error('tableCode and at least one order item are required.')
  }

  const normalizedTableCode = tableCode.trim().toUpperCase()
  const normalizedItems = items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: Number(item.quantity) || 0,
  }))

  if (normalizedItems.some((item) => !item.menuItemId || item.quantity < 1)) {
    res.status(400)
    throw new Error('Each order item must include menuItemId and quantity greater than 0.')
  }

  const sql = getDb()
  const [table] = await sql`
    select id, name, table_code as code
    from cafe_tables
    where table_code = ${normalizedTableCode} and is_active = true
    limit 1
  `

  if (!table) {
    res.status(404)
    throw new Error('Table not found or inactive.')
  }

  const distinctIds = [...new Set(normalizedItems.map((item) => item.menuItemId))]
  const menuItems = await sql`
    select
      id,
      name,
      price_cents as "priceCents",
      is_available as "isAvailable"
    from menu_items
    where id in (${sql.join(distinctIds.map((id) => sql`${id}`), sql`, `)})
  `

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]))
  const orderItems = normalizedItems.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)

    if (!menuItem || !menuItem.isAvailable) {
      const error = new Error(`Menu item ${item.menuItemId} is unavailable.`)
      error.statusCode = 400
      throw error
    }

    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: item.quantity,
      priceCents: menuItem.priceCents,
      lineTotalCents: menuItem.priceCents * item.quantity,
    }
  })

  const totalCents = orderItems.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0,
  )

  const createdOrder = await sql.begin(async (transaction) => {
    const [order] = await transaction`
      insert into orders (
        table_id,
        order_number,
        customer_name,
        notes,
        status,
        payment_method,
        payment_status,
        total_cents
      )
      values (
        ${table.id},
        ${buildOrderNumber()},
        ${customerName?.trim() || null},
        ${notes?.trim() || null},
        'new',
        'cash',
        'pending',
        ${totalCents}
      )
      returning
        id,
        order_number as "orderNumber",
        customer_name as "customerName",
        notes,
        status,
        payment_method as "paymentMethod",
        payment_status as "paymentStatus",
        total_cents as "totalCents",
        round(total_cents / 100.0, 2)::float as total,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    for (const item of orderItems) {
      await transaction`
        insert into order_items (
          order_id,
          menu_item_id,
          item_name,
          quantity,
          price_cents,
          line_total_cents
        )
        values (
          ${order.id},
          ${item.menuItemId},
          ${item.name},
          ${item.quantity},
          ${item.priceCents},
          ${item.lineTotalCents}
        )
      `
    }

    return order
  })

  res.status(201).json({
    order: {
      ...createdOrder,
      tableId: table.id,
      tableName: table.name,
      tableCode: table.code,
      items: orderItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        priceCents: item.priceCents,
        price: Number((item.priceCents / 100).toFixed(2)),
        lineTotalCents: item.lineTotalCents,
        total: Number((item.lineTotalCents / 100).toFixed(2)),
      })),
    },
  })
})

export const getOrders = asyncHandler(async (req, res) => {
  const sql = getDb()
  const clauses = []
  const params = []

  if (req.query.status) {
    params.push(req.query.status)
    clauses.push(`o.status = $${params.length}`)
  }

  if (req.query.tableId) {
    params.push(req.query.tableId)
    clauses.push(`o.table_id = $${params.length}`)
  }

  const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : ''
  const orders = await getOrdersWithItems(sql, whereClause, params)
  res.json({ orders })
})

export const getOrder = asyncHandler(async (req, res) => {
  const sql = getDb()
  const orders = await getOrdersWithItems(sql, 'where o.id = $1', [req.params.id])

  if (!orders[0]) {
    res.status(404)
    throw new Error('Order not found.')
  }

  res.json({ order: orders[0] })
})

export const trackOrder = asyncHandler(async (req, res) => {
  const sql = getDb()
  const orders = await getOrdersWithItems(sql, 'where o.order_number = $1', [req.params.orderNumber])

  if (!orders[0]) {
    res.status(404)
    throw new Error('Order not found.')
  }

  res.json({ order: orders[0] })
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus } = req.body

  if (!status && !paymentStatus) {
    res.status(400)
    throw new Error('Provide status or paymentStatus to update the order.')
  }

  if (status && !validStatuses.includes(status)) {
    res.status(400)
    throw new Error(`Status must be one of: ${validStatuses.join(', ')}`)
  }

  if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
    res.status(400)
    throw new Error(`paymentStatus must be one of: ${validPaymentStatuses.join(', ')}`)
  }

  const sql = getDb()
  const [existing] = await sql`
    select id, status, payment_status as "paymentStatus"
    from orders
    where id = ${req.params.id}
    limit 1
  `

  if (!existing) {
    res.status(404)
    throw new Error('Order not found.')
  }

  const [order] = await sql`
    update orders
    set
      status = ${status || existing.status},
      payment_status = ${paymentStatus || existing.paymentStatus},
      updated_at = now()
    where id = ${req.params.id}
    returning
      id,
      order_number as "orderNumber",
      status,
      payment_status as "paymentStatus",
      updated_at as "updatedAt"
  `

  res.json({ order })
})
