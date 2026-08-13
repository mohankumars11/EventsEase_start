/**
 * Every number the admin dashboard shows, computed in one place.
 *
 * ── Why a module and not twelve useMemos ─────────────────────────────────
 * The dashboard's numbers used to be derived inline, per tab, from whatever
 * that tab had fetched. Revenue counted `payment_status === 'paid'`; the
 * Customer 360 tab counted the same thing again a few hundred lines down; the
 * order funnel counted `status` and quietly included cancelled orders. Three
 * definitions of "a sale" in one screen is how a founder ends up with three
 * answers to "how are we doing".
 *
 * So the definitions live here, once, as pure functions over plain rows. No
 * React, no supabase — which also means they can be reasoned about, and the
 * comments below can say what each number MEANS rather than how it is drawn.
 *
 * ── The two definitions that matter most ─────────────────────────────────
 * DEMAND  — every order line that a customer actually placed, cancelled ones
 *           excluded. This counts an order whose UPI payment has not been
 *           confirmed yet, because the customer chose the product either way.
 *           Demand is the signal for what to stock and what to photograph.
 *
 * REVENUE — only `payment_status === 'paid'`. Money that arrived.
 *
 * Keeping them apart is not pedantry here. Sambramo takes UPI with no gateway
 * callback (see PROJECT_SUMMARY § Payments), so an order sits 'pending' until
 * an admin eyeballs the bank statement and confirms it. If demand and revenue
 * were the same number, every unconfirmed payment would look like a customer
 * who never wanted the thing. The gap between the two curves IS the admin's
 * confirmation backlog, and the dashboard draws it deliberately.
 */

/* ── Dates ─────────────────────────────────────────────────────────────── */

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/**
 * Local-midnight yyyy-mm-dd. Not `toISOString().slice(0,10)`, which converts
 * to UTC first and so returns *yesterday* for the first five and a half hours
 * of every Indian day — the same trap `toISODate` in utils/format documents.
 */
export function dayKey(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000)
}

/* ── Order lines ───────────────────────────────────────────────────────── */

/**
 * Flatten orders into line items, carrying down the order-level facts each
 * line needs to be counted by time, place and payment state.
 *
 * Cancelled orders are dropped here rather than at each call site: a cancelled
 * order is neither demand nor revenue, and forgetting that filter in one of a
 * dozen aggregations is exactly the class of bug this module exists to stop.
 */
export function orderLines(orders = []) {
  const lines = []
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    for (const item of o.order_items ?? []) {
      lines.push({
        ...item,
        order_id:       o.id,
        customer_id:    o.customer_id,
        created_at:     o.created_at,
        order_status:   o.status,
        payment_status: o.payment_status,
        paid:           o.payment_status === 'paid',
        address:        o.address ?? null,
      })
    }
  }
  return lines
}

export const paidOnly = lines => lines.filter(l => l.paid)

/** Money on a line. `subtotal` is the source of truth; the product falls back. */
const lineValue = l => Number(l.subtotal ?? (l.unit_price ?? 0) * (l.qty ?? 0)) || 0
const lineQty   = l => Number(l.qty ?? 0) || 0

export function sumValue(lines) { return lines.reduce((s, l) => s + lineValue(l), 0) }
export function sumQty(lines)   { return lines.reduce((s, l) => s + lineQty(l), 0) }

export function between(lines, from, to) {
  return lines.filter(l => {
    const t = new Date(l.created_at)
    return t >= from && t < to
  })
}

/**
 * Percentage change, with the divide-by-zero case answered honestly.
 *
 * Going from 0 to anything is reported as +100% rather than Infinity, and
 * 0 → 0 as 0 rather than NaN. Both are lies by a small margin; both are less
 * of a lie than "∞%" on a founder's dashboard on day three.
 */
export function pctDelta(curr, prev) {
  if (!prev) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

/* ── Time series ───────────────────────────────────────────────────────── */

/**
 * A dense daily series over the last `days` days, ending today.
 *
 * Dense matters: a gap-free axis is the difference between "we sold nothing on
 * Tuesday" and "Tuesday is missing", and a sparse series drawn as a line
 * silently connects Monday to Wednesday as though Tuesday never happened.
 */
export function dailySeries(lines, days = 30, today = new Date()) {
  const end = startOfDay(today)
  const buckets = new Map()
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i)
    buckets.set(dayKey(d), { iso: dayKey(d), date: d, revenue: 0, demand: 0, units: 0, orders: new Set() })
  }
  for (const l of lines) {
    const b = buckets.get(dayKey(new Date(l.created_at)))
    if (!b) continue
    const v = lineValue(l)
    b.demand += v
    b.units  += lineQty(l)
    b.orders.add(l.order_id)
    if (l.paid) b.revenue += v
  }
  return [...buckets.values()].map(b => ({
    iso:     b.iso,
    label:   b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    revenue: b.revenue,
    demand:  b.demand,
    units:   b.units,
    orders:  b.orders.size,
  }))
}

/** Monthly buckets, oldest first — the view a founder reads for a trend. */
export function monthlySeries(lines, months = 6, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), 1)
  const buckets = new Map()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue: 0, demand: 0, units: 0, orders: new Set(),
    })
  }
  for (const l of lines) {
    const t = new Date(l.created_at)
    const b = buckets.get(`${t.getFullYear()}-${t.getMonth()}`)
    if (!b) continue
    const v = lineValue(l)
    b.demand += v
    b.units += lineQty(l)
    b.orders.add(l.order_id)
    if (l.paid) b.revenue += v
  }
  return [...buckets.values()].map(b => ({ ...b, orders: b.orders.size }))
}

/**
 * A 7×N grid of units sold, weekday × week — the "when do people buy" heatmap.
 *
 * Weekday is the y-axis rather than the x because celebrations cluster on
 * weekends, and a Sat/Sun band running across the top of the grid is the whole
 * point of drawing it.
 */
export function weekdayHeatmap(lines, weeks = 12, today = new Date()) {
  const end = startOfDay(today)
  // Wind back to the Sunday that starts the earliest week, so columns are
  // whole weeks rather than a ragged offset.
  const firstDay = addDays(end, -(weeks * 7 - 1))
  const start = addDays(firstDay, -firstDay.getDay())
  const cells = new Map()
  for (const l of lines) {
    const t = startOfDay(new Date(l.created_at))
    if (t < start || t > end) continue
    const k = dayKey(t)
    cells.set(k, (cells.get(k) ?? 0) + lineQty(l))
  }

  const columns = []
  for (let w = 0; ; w++) {
    const colStart = addDays(start, w * 7)
    if (colStart > end) break
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(colStart, d)
      days.push({
        iso: dayKey(date),
        date,
        future: date > end,
        value: cells.get(dayKey(date)) ?? 0,
      })
    }
    columns.push({ label: colStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), days })
  }
  const max = Math.max(0, ...[...cells.values()])
  return { columns, max }
}

/* ── Per-product demand ────────────────────────────────────────────────── */

/**
 * One row per product, with everything needed to answer "should we keep
 * selling this, photograph it, or drop it".
 *
 * Built from the CATALOGUE outward rather than from the order lines inward.
 * The difference is the whole point: aggregating order lines gives you the
 * products that sold, and the single most useful list on a pre-launch
 * dashboard is the opposite one — the 300-odd products nobody has ever
 * ordered. A product with no rows in `order_items` cannot appear in a
 * group-by over `order_items`, so it has to start from `products`.
 *
 * Order lines that no longer match a catalogue row (product deleted, or an
 * older order placed before migration 022 snapshotted the category) are kept
 * as their own rows, flagged `orphan`, rather than dropped — their revenue is
 * real and silently losing it would make the totals disagree with Revenue.
 */
export function productDemand(products = [], lines = [], { windowDays = 30, today = new Date() } = {}) {
  const end = addDays(startOfDay(today), 1)          // through end of today
  const currFrom = addDays(end, -windowDays)
  const prevFrom = addDays(currFrom, -windowDays)

  const byProduct = new Map()
  const orphans = new Map()

  for (const p of products) {
    byProduct.set(p.id, {
      id: p.id,
      name: p.name,
      category: p.category,
      occasion: p.occasion ?? null,
      price: Number(p.price) || 0,
      emoji: p.emoji,
      image_url: p.image_url ?? null,
      image_source: p.image_source ?? null,
      is_active: p.is_active !== false,
      orphan: false,
      lines: [],
    })
  }

  for (const l of lines) {
    const row = byProduct.get(l.product_id)
    if (row) { row.lines.push(l); continue }
    // No catalogue match — bucket by the name snapshotted on the line.
    const key = l.product_name ?? 'Unknown product'
    if (!orphans.has(key)) {
      orphans.set(key, {
        id: `orphan:${key}`,
        name: key,
        category: l.category ?? 'Uncategorized',
        occasion: l.occasion ?? null,
        price: Number(l.unit_price) || 0,
        emoji: '📦',
        image_url: null, image_source: null, is_active: false,
        orphan: true,
        lines: [],
      })
    }
    orphans.get(key).lines.push(l)
  }

  const rows = [...byProduct.values(), ...orphans.values()].map(row => {
    const { lines: ls, ...rest } = row
    const paid = ls.filter(l => l.paid)
    const curr = between(ls, currFrom, end)
    const prev = between(ls, prevFrom, currFrom)
    const dates = ls.map(l => new Date(l.created_at)).sort((a, b) => a - b)

    const demandUnits = sumQty(ls)
    const paidUnits   = sumQty(paid)

    return {
      ...rest,
      // Demand: everything a customer placed. Revenue: what was paid for.
      demandUnits,
      demandValue:  sumValue(ls),
      units:        paidUnits,
      revenue:      sumValue(paid),
      orders:       new Set(ls.map(l => l.order_id)).size,
      buyers:       new Set(ls.map(l => l.customer_id).filter(Boolean)).size,
      // How much of the demand actually turned into money. On direct UPI this
      // is a payment-confirmation number, not a customer-intent one.
      paidRate:     demandUnits ? Math.round((paidUnits / demandUnits) * 100) : null,
      currUnits:    sumQty(curr),
      prevUnits:    sumQty(prev),
      trend:        pctDelta(sumQty(curr), sumQty(prev)),
      firstSold:    dates[0] ?? null,
      lastSold:     dates.at(-1) ?? null,
      daysSinceSale: dates.length ? daysBetween(dates.at(-1), today) : null,
      everSold:     ls.length > 0,
    }
  })

  return rows.sort((a, b) => b.revenue - a.revenue || b.demandUnits - a.demandUnits)
}

/**
 * Split the catalogue into the four things a founder can act on.
 *
 * Deliberately four named buckets and not a scatter plot with quadrant labels:
 * "Stars / Sleepers / Steady / Never sold" is a to-do list, and the underlying
 * scatter is drawn alongside it for anyone who wants the shape.
 *
 *   star    — selling, and selling more than it was
 *   fading  — selling, but less than it was  (a photo or a price problem)
 *   steady  — selling flat
 *   dormant — has sold before, nothing in the current window
 *   unsold  — never sold at all; the biggest bucket pre-launch, by design
 */
export function productBuckets(rows) {
  const out = { star: [], fading: [], steady: [], dormant: [], unsold: [] }
  for (const r of rows) {
    if (!r.everSold)                       { out.unsold.push(r);  continue }
    if (r.currUnits === 0)                 { out.dormant.push(r); continue }
    if (r.trend >= 20)                     { out.star.push(r);    continue }
    if (r.trend <= -20)                    { out.fading.push(r);  continue }
    out.steady.push(r)
  }
  return out
}

/* ── Categories & occasions ────────────────────────────────────────────── */

/**
 * Revenue, demand and unit share per shop category.
 *
 * Every known category is returned even at zero, in SHOP_CATEGORIES order, so
 * the colour assigned to a category never moves when its sales do — the
 * recolour-on-filter failure the palette rules exist to prevent. Callers may
 * sort the returned array freely; the `id` carries the colour, not the index.
 */
export function categoryDemand(categories = [], lines = []) {
  const map = new Map()
  for (const l of lines) {
    const key = l.category || 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(l)
  }
  const known = categories.map(c => {
    const ls = map.get(c.id) ?? []
    map.delete(c.id)
    return buildCategoryRow(c.id, c.label, c.emoji, ls)
  })
  // Anything left is a category no longer in SHOP_CATEGORIES — an old
  // 'Hampers' line from before migration 031, say. Shown, never dropped.
  const legacy = [...map.entries()].map(([id, ls]) => buildCategoryRow(id, id, '📦', ls))
  return [...known, ...legacy]
}

function buildCategoryRow(id, label, emoji, ls) {
  const paid = ls.filter(l => l.paid)
  return {
    id, label, emoji,
    revenue:     sumValue(paid),
    demandValue: sumValue(ls),
    units:       sumQty(paid),
    demandUnits: sumQty(ls),
    orders:      new Set(ls.map(l => l.order_id)).size,
    products:    new Set(ls.map(l => l.product_id ?? l.product_name)).size,
  }
}

/** Same shape, keyed by the occasion snapshot (Diwali, Birthday, …). */
export function occasionDemand(lines = []) {
  const map = new Map()
  for (const l of lines) {
    const key = l.occasion || 'No occasion'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(l)
  }
  return [...map.entries()]
    .map(([id, ls]) => buildCategoryRow(id, id, '🎊', ls))
    .sort((a, b) => b.demandValue - a.demandValue)
}

/* ── Geography ─────────────────────────────────────────────────────────── */

/**
 * Where the demand is, from every table that knows a place.
 *
 * Four sources, and they are NOT interchangeable, so they stay in separate
 * columns rather than being summed into one "demand" figure:
 *
 *   orders            — a shop delivery address. Money, or nearly.
 *   events            — a concierge request with a city on it.
 *   enquiries         — a service enquiry with a location JSONB.
 *   interest          — a waitlist signup from OUTSIDE the pilot cities.
 *                       This is the only one that is not a customer yet, and
 *                       it is the one that answers "where do we open next".
 *
 * `address` is free text a customer typed into a form, so the city is
 * normalised (trim + title case) before grouping — otherwise "bengaluru",
 * "Bengaluru " and "BENGALURU" are three cities on the founder's map.
 */
export function areaDemand({ orders = [], events = [], enquiries = [], interest = [] } = {}) {
  const cities = new Map()
  const pincodes = new Map()

  const city = key => {
    const k = normaliseCity(key)
    if (!k) return null
    if (!cities.has(k)) {
      cities.set(k, {
        city: k, orders: 0, revenue: 0, units: 0,
        events: 0, enquiries: 0, interest: 0, pincodes: new Set(), customers: new Set(),
      })
    }
    return cities.get(k)
  }

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const addr = o.address ?? {}
    const row = city(addr.city)
    if (row) {
      row.orders += 1
      row.units += (o.order_items ?? []).reduce((s, i) => s + (Number(i.qty) || 0), 0)
      if (o.payment_status === 'paid') row.revenue += Number(o.total) || 0
      if (o.customer_id) row.customers.add(o.customer_id)
      if (addr.pincode) row.pincodes.add(String(addr.pincode))
    }
    const pin = String(addr.pincode ?? '').trim()
    if (/^\d{6}$/.test(pin)) {
      if (!pincodes.has(pin)) {
        pincodes.set(pin, { pincode: pin, city: normaliseCity(addr.city) || '—', orders: 0, revenue: 0, units: 0 })
      }
      const p = pincodes.get(pin)
      p.orders += 1
      p.units += (o.order_items ?? []).reduce((s, i) => s + (Number(i.qty) || 0), 0)
      if (o.payment_status === 'paid') p.revenue += Number(o.total) || 0
    }
  }

  for (const e of events) {
    if (e.status === 'CANCELLED') continue
    const row = city(e.city)
    if (row) row.events += 1
  }

  for (const e of enquiries) {
    const row = city(e.location?.city)
    if (row) row.enquiries += 1
  }

  for (const r of interest) {
    const row = city(r.city)
    if (row) row.interest += 1
  }

  return {
    cities: [...cities.values()]
      .map(c => ({ ...c, pincodes: c.pincodes.size, customers: c.customers.size,
                   signals: c.orders + c.events + c.enquiries + c.interest }))
      .sort((a, b) => b.signals - a.signals || b.revenue - a.revenue),
    pincodes: [...pincodes.values()].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue),
  }
}

export function normaliseCity(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())
}

/* ── Order lifecycle ───────────────────────────────────────────────────── */

export const ORDER_FLOW = ['placed', 'processing', 'dispatched', 'delivered']

/**
 * The shop order funnel, plus the two things a funnel alone never tells you:
 * what is stuck, and what it is worth.
 *
 * `orders` has `created_at` and `updated_at` but no per-stage timestamps, so
 * "time in stage" is honestly `now - updated_at` — how long since anything
 * last happened to this order. That is the number an operator actually needs
 * ("nobody has touched this in four days"), and it is not dressed up as a
 * stage duration it cannot know.
 *
 * `stuckAfterDays` is the age at which an order at a stage becomes an alert.
 * Placed and processing get 2 days; dispatched gets 3, because a delivery in
 * a second city legitimately takes longer than a warehouse pick.
 */
const STUCK_AFTER = { placed: 2, processing: 2, dispatched: 3 }

export function orderLifecycle(orders = [], today = new Date()) {
  const live = orders.filter(o => o.status !== 'cancelled')

  const stages = ORDER_FLOW.map((status, i) => {
    const at = live.filter(o => o.status === status)
    // Reached = at this stage or any later one. A funnel counts arrivals, not
    // residents: three orders sitting in 'placed' and one delivered is not a
    // 25% delivery rate off a base of one.
    const reached = live.filter(o => ORDER_FLOW.indexOf(o.status) >= i)
    const stuck = at.filter(o => ageInDays(o.updated_at ?? o.created_at, today) >= (STUCK_AFTER[status] ?? Infinity))
    return {
      status,
      at: at.length,
      reached: reached.length,
      value: at.reduce((s, o) => s + (Number(o.total) || 0), 0),
      stuck: stuck.length,
      stuckOrders: stuck,
      oldestDays: at.length ? Math.max(...at.map(o => ageInDays(o.updated_at ?? o.created_at, today))) : 0,
    }
  })

  const cancelled = orders.filter(o => o.status === 'cancelled')
  const awaitingPayment = live.filter(o => o.payment_status === 'pending')

  return {
    stages,
    total: live.length,
    cancelled: cancelled.length,
    cancelledValue: cancelled.reduce((s, o) => s + (Number(o.total) || 0), 0),
    // The direct-UPI backlog: orders the customer says they have paid for and
    // nobody has confirmed against the bank statement yet.
    awaitingPayment: awaitingPayment.length,
    awaitingPaymentValue: awaitingPayment.reduce((s, o) => s + (Number(o.total) || 0), 0),
    awaitingPaymentOrders: awaitingPayment.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    refunded: orders.filter(o => o.payment_status === 'refunded').length,
    // Completion against everything ever placed, cancellations included —
    // the honest denominator.
    completionRate: orders.length
      ? Math.round((live.filter(o => o.status === 'delivered').length / orders.length) * 100)
      : 0,
  }
}

export function ageInDays(ts, today = new Date()) {
  if (!ts) return 0
  return Math.max(0, Math.floor((today - new Date(ts)) / 86400000))
}

/**
 * The concierge funnel — the other half of the business.
 *
 * `stages` here are groups of event statuses rather than single ones, because
 * EVENT_STATUSES has fourteen values and a fourteen-step funnel is a wall, not
 * a chart. The grouping matches the sidebar's operational views so the two
 * cannot tell different stories.
 */
export const EVENT_FUNNEL = [
  { id: 'requested', label: 'Requested',  statuses: ['REQUEST_RECEIVED', 'UNDER_REVIEW'] },
  { id: 'sourcing',  label: 'Sourcing',   statuses: ['CONTACTING_VENDORS', 'QUOTES_COLLECTED'] },
  { id: 'proposed',  label: 'Proposed',   statuses: ['PROPOSAL_PREPARED', 'PROPOSAL_SENT', 'CUSTOMER_REVIEW', 'CUSTOMER_CHANGES_REQUESTED'] },
  { id: 'confirmed', label: 'Confirmed',  statuses: ['APPROVED', 'CONFIRMED', 'IN_COORDINATION'] },
  { id: 'delivered', label: 'Delivered',  statuses: ['COMPLETED'] },
]

export function eventFunnel(events = []) {
  const live = events.filter(e => e.status !== 'CANCELLED')
  // Position each event once, up front. A status that matches no stage (a new
  // EVENT_STATUSES value nobody added here) scores -1 and counts toward no
  // stage rather than silently landing in the first one.
  const positions = live.map(e => EVENT_FUNNEL.findIndex(s => s.statuses.includes(e.status)))
  const stages = EVENT_FUNNEL.map((stage, i) => ({
    ...stage,
    at:      positions.filter(p => p === i).length,
    reached: positions.filter(p => p >= i).length,
  }))
  return {
    stages,
    total: live.length,
    cancelled: events.length - live.length,
    conversion: live.length
      ? Math.round((live.filter(e => e.status === 'COMPLETED').length / live.length) * 100)
      : 0,
  }
}

/* ── Event-service demand ──────────────────────────────────────────────── */

/**
 * Which event services people actually ask for.
 *
 * `service_enquiries.services` is a JSONB array of `{id, name, emoji, qty}`
 * snapshotted at enquiry time, and `packages` the same for whole tiers. This
 * is the only demand signal the services side has — there is no `order_items`
 * equivalent for concierge work — which is exactly why it is worth counting:
 * it tells the founder which of the thirty-nine services to line up a supplier
 * for first.
 */
export function serviceDemand(enquiries = []) {
  const map = new Map()
  const packages = new Map()

  for (const e of enquiries) {
    for (const s of e.services ?? []) {
      if (!s?.id) continue
      if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name ?? s.id, emoji: s.emoji ?? '🎪', enquiries: 0, qty: 0, quoted: 0, won: 0 })
      const row = map.get(s.id)
      row.enquiries += 1
      row.qty += Number(s.qty) || 1
      if (e.quoted_price) row.quoted += 1
      if (e.status === 'closed') row.won += 1
    }
    for (const p of e.packages ?? []) {
      if (!p?.id) continue
      if (!packages.has(p.id)) packages.set(p.id, { id: p.id, name: p.name ?? p.id, enquiries: 0 })
      packages.get(p.id).enquiries += 1
    }
  }

  return {
    services: [...map.values()].sort((a, b) => b.enquiries - a.enquiries),
    packages: [...packages.values()].sort((a, b) => b.enquiries - a.enquiries),
  }
}

/* ── Customers ─────────────────────────────────────────────────────────── */

/**
 * Customer value and repeat behaviour.
 *
 * `repeatRate` counts customers with more than one non-cancelled order, not
 * more than one paid order — a second order placed and awaiting UPI
 * confirmation is a customer who came back, whatever the bank has done about
 * it yet.
 */
export function customerStats(profiles = [], orders = [], events = [], today = new Date()) {
  const live = orders.filter(o => o.status !== 'cancelled')
  const byCustomer = new Map()
  for (const o of live) {
    if (!o.customer_id) continue
    if (!byCustomer.has(o.customer_id)) byCustomer.set(o.customer_id, [])
    byCustomer.get(o.customer_id).push(o)
  }

  const rows = profiles.map(p => {
    const mine = byCustomer.get(p.id) ?? []
    const paid = mine.filter(o => o.payment_status === 'paid')
    const myEvents = events.filter(e => e.customer_id === p.id)
    const dates = mine.map(o => new Date(o.created_at)).sort((a, b) => a - b)
    return {
      ...p,
      orderCount: mine.length,
      paidCount:  paid.length,
      totalSpend: paid.reduce((s, o) => s + (Number(o.total) || 0), 0),
      eventCount: myEvents.length,
      firstOrder: dates[0] ?? null,
      lastOrder:  dates.at(-1) ?? null,
      daysSince:  dates.length ? daysBetween(dates.at(-1), today) : null,
      repeat:     mine.length > 1,
    }
  })

  const buyers = rows.filter(r => r.orderCount > 0)
  const revenue = buyers.reduce((s, r) => s + r.totalSpend, 0)
  const paidOrders = live.filter(o => o.payment_status === 'paid')

  return {
    rows: rows.sort((a, b) => b.totalSpend - a.totalSpend || b.orderCount - a.orderCount),
    totalCustomers: profiles.length,
    buyers: buyers.length,
    repeatBuyers: buyers.filter(r => r.repeat).length,
    repeatRate: buyers.length ? Math.round((buyers.filter(r => r.repeat).length / buyers.length) * 100) : 0,
    // Average ORDER value, which is what "AOV" means, computed over paid
    // orders only — mixing in unconfirmed ones would inflate it.
    aov: paidOrders.length ? Math.round(revenue / paidOrders.length) : 0,
    // Average revenue per paying customer. Not called LTV: with a few weeks of
    // history and no churn model, a lifetime-value figure would be fiction.
    revenuePerBuyer: buyers.filter(r => r.totalSpend > 0).length
      ? Math.round(revenue / buyers.filter(r => r.totalSpend > 0).length)
      : 0,
  }
}

/**
 * New vs returning buyers by month — does growth come from new people or the
 * same people coming back?
 */
export function acquisitionByMonth(orders = [], months = 6, today = new Date()) {
  const live = [...orders.filter(o => o.status !== 'cancelled')]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const seen = new Set()
  const end = new Date(today.getFullYear(), today.getMonth(), 1)
  const buckets = new Map()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      new: 0, returning: 0,
    })
  }
  for (const o of live) {
    const t = new Date(o.created_at)
    const b = buckets.get(`${t.getFullYear()}-${t.getMonth()}`)
    const isNew = o.customer_id && !seen.has(o.customer_id)
    if (o.customer_id) seen.add(o.customer_id)
    if (!b) continue
    if (isNew) b.new += 1
    else b.returning += 1
  }
  return [...buckets.values()]
}

/* ── The headline numbers ──────────────────────────────────────────────── */

/**
 * The figures the Command Center leads with, each against the equivalent prior
 * window so every one of them can carry a delta.
 *
 * `proposalValue` is passed in rather than derived: it comes from
 * `event_proposals`, which is a different table with a different lifecycle,
 * and it is a PIPELINE number — proposals sent, not money received. It is
 * shown beside revenue, never added to it.
 */
export function headline({ orders = [], events = [], proposalValue = 0, windowDays = 30, today = new Date() } = {}) {
  const lines = orderLines(orders)
  const end = addDays(startOfDay(today), 1)
  const currFrom = addDays(end, -windowDays)
  const prevFrom = addDays(currFrom, -windowDays)

  const curr = between(lines, currFrom, end)
  const prev = between(lines, prevFrom, currFrom)
  const currPaid = paidOnly(curr)
  const prevPaid = paidOnly(prev)

  const currOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at) >= currFrom)
  const prevOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at) >= prevFrom && new Date(o.created_at) < currFrom)

  const currEvents = events.filter(e => new Date(e.created_at) >= currFrom)
  const prevEvents = events.filter(e => new Date(e.created_at) >= prevFrom && new Date(e.created_at) < currFrom)

  return {
    windowDays,
    revenue:        sumValue(currPaid),
    revenueDelta:   pctDelta(sumValue(currPaid), sumValue(prevPaid)),
    revenueAllTime: sumValue(paidOnly(lines)),
    demand:         sumValue(curr),
    demandDelta:    pctDelta(sumValue(curr), sumValue(prev)),
    // Money customers committed to that has not been confirmed as received.
    unconfirmed:    sumValue(curr) - sumValue(currPaid),
    orders:         currOrders.length,
    ordersDelta:    pctDelta(currOrders.length, prevOrders.length),
    units:          sumQty(curr),
    aov:            currPaid.length ? Math.round(sumValue(currPaid) / new Set(currPaid.map(l => l.order_id)).size) : 0,
    enquiries:      currEvents.length,
    enquiriesDelta: pctDelta(currEvents.length, prevEvents.length),
    proposalValue,
  }
}
