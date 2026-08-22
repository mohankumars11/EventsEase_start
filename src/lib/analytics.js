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
export function sumValue(lines) { return lines.reduce((s, l) => s + lineValue(l), 0) }
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
export function areaDemand({ events = [], enquiries = [], interest = [] } = {}) {
  const cities = new Map()

  const city = key => {
    const k = normaliseCity(key)
    if (!k) return null
    if (!cities.has(k)) {
      cities.set(k, {
        city: k, events: 0, enquiries: 0, interest: 0, customers: new Set(),
      })
    }
    return cities.get(k)
  }

  for (const e of events) {
    if (e.status === 'CANCELLED') continue
    const row = city(e.city)
    if (row) {
      row.events += 1
      if (e.customer_id) row.customers.add(e.customer_id)
    }
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
      .map(c => ({ ...c, customers: c.customers.size,
                   signals: c.events + c.enquiries + c.interest }))
      .sort((a, b) => b.signals - a.signals || b.events - a.events),
  }
}

export function normaliseCity(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())
}
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
export function customerStats(profiles = [], events = [], payments = [], today = new Date()) {
  /* A "buyer" used to mean somebody with an order. It means somebody with a
     celebration now, and spend is the sum of their verified payments rather
     than order totals — the only two payment states with a witness behind
     them are GATEWAY_VERIFIED and ADMIN_VERIFIED. */
  const VERIFIED = new Set(['GATEWAY_VERIFIED', 'ADMIN_VERIFIED'])
  const paidFor = new Map()
  for (const p of payments) {
    if (!VERIFIED.has(p.status)) continue
    const key = p.event_id ?? p.enquiry_id
    if (!key) continue
    paidFor.set(key, (paidFor.get(key) ?? 0) + (Number(p.amount) || 0))
  }

  const byCustomer = new Map()
  for (const e of events) {
    if (!e.customer_id) continue
    if (!byCustomer.has(e.customer_id)) byCustomer.set(e.customer_id, [])
    byCustomer.get(e.customer_id).push(e)
  }

  const rows = profiles.map(p => {
    const mine = byCustomer.get(p.id) ?? []
    const dates = mine.map(e => new Date(e.created_at)).sort((a, b) => a - b)
    return {
      ...p,
      eventCount: mine.length,
      totalSpend: mine.reduce((s, e) => s + (paidFor.get(e.id) ?? 0), 0),
      firstEvent: dates[0] ?? null,
      lastEvent:  dates.at(-1) ?? null,
      daysSince:  dates.length ? daysBetween(dates.at(-1), today) : null,
      repeat:     mine.length > 1,
    }
  })

  const buyers = rows.filter(r => r.eventCount > 0)
  const repeatBuyers = buyers.filter(r => r.repeat)
  const revenue = buyers.reduce((s, r) => s + r.totalSpend, 0)

  return {
    rows: rows.sort((a, b) => b.totalSpend - a.totalSpend || b.eventCount - a.eventCount),
    totalCustomers: profiles.length,
    buyers: buyers.length,
    repeatBuyers: repeatBuyers.length,
    repeatRate: buyers.length ? Math.round((repeatBuyers.length / buyers.length) * 100) : 0,
    revenue,
    avgPerCustomer: buyers.length ? Math.round(revenue / buyers.length) : 0,
  }
}

/**
 * New vs returning buyers by month — does growth come from new people or the
 * same people coming back?
 */
export function acquisitionByMonth(events = [], months = 6, today = new Date()) {
  const live = [...events.filter(e => e.status !== 'CANCELLED')]
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
  for (const e of live) {
    const t = new Date(e.created_at)
    const b = buckets.get(`${t.getFullYear()}-${t.getMonth()}`)
    const isNew = e.customer_id && !seen.has(e.customer_id)
    if (e.customer_id) seen.add(e.customer_id)
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
export function headline({
  events = [], enquiries = [], payments = [], proposalValue = 0,
  windowDays = 30, today = new Date(),
} = {}) {
  const end      = addDays(startOfDay(today), 1)
  const currFrom = addDays(end, -windowDays)
  const prevFrom = addDays(currFrom, -windowDays)

  const inWindow = (rows, from, to) => rows.filter(r => {
    const t = new Date(r.created_at)
    return t >= from && t < to
  })

  /* Collected means the money is actually ours. GATEWAY_VERIFIED and
     ADMIN_VERIFIED are the two states with a witness behind them — a webhook
     or a human who looked at the bank. CUSTOMER_CLAIMED_PAID is a claim, and
     counting a claim as revenue is how a dashboard starts lying. */
  const VERIFIED = new Set(['GATEWAY_VERIFIED', 'ADMIN_VERIFIED'])
  const paid     = payments.filter(p => VERIFIED.has(p.status))
  const claimed  = payments.filter(p => p.status === 'CUSTOMER_CLAIMED_PAID')
  const amount   = rows => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const currPaid = inWindow(paid, currFrom, end)
  const prevPaid = inWindow(paid, prevFrom, currFrom)
  const currEvents = inWindow(events, currFrom, end)
  const prevEvents = inWindow(events, prevFrom, currFrom)
  const currEnq = inWindow(enquiries, currFrom, end)
  const prevEnq = inWindow(enquiries, prevFrom, currFrom)

  return {
    windowDays,
    revenue:        amount(currPaid),
    revenueDelta:   pctDelta(amount(currPaid), amount(prevPaid)),
    revenueAllTime: amount(paid),
    // Somebody has pressed "I've paid" and nothing has confirmed it arrived.
    unconfirmed:    amount(inWindow(claimed, currFrom, end)),
    requests:       currEvents.length,
    requestsDelta:  pctDelta(currEvents.length, prevEvents.length),
    enquiries:      currEnq.length,
    enquiriesDelta: pctDelta(currEnq.length, prevEnq.length),
    // What a settled celebration is worth on average, verified only.
    aov:            currPaid.length
      ? Math.round(amount(currPaid) / new Set(currPaid.map(p => p.event_id ?? p.enquiry_id)).size)
      : 0,
    proposalValue,
  }
}
