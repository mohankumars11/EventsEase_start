
/**
 * The admin's inbox.
 *
 * ── Derived, not stored ──────────────────────────────────────────────────
 * There is no `notifications` table and that is the design, not a shortcut.
 * A notifications table is a COPY of something that already happened
 * somewhere else, which gives you two ways to be wrong: an insert that fails
 * (the order exists, nobody is told) and an insert that succeeds against a
 * transaction that later rolls back (a notification for an order that never
 * existed). Both are the classic failure of this pattern and both are
 * unfixable after the fact, because there is no way to tell which side lied.
 *
 * So the feed is a VIEW over the rows the dashboard already loads:
 * complaints, service enquiries, celebration requests, reviews,
 * vendor applications, waitlist signups. It cannot drift from the truth
 * because it IS the truth, re-read. It is also complete on day one — every
 * order ever placed has a notification, including the ones from before this
 * feature existed.
 *
 * The one thing that genuinely cannot be derived is whether a human has
 * looked at something. That, and only that, is stored
 * (`admin_notification_state`, migration 039).
 *
 * ── Stable keys ──────────────────────────────────────────────────────────
 * Read state is keyed by `${type}:${row id}`, never by array position or by
 * timestamp. A key has to survive a refetch, a re-sort and a row being
 * updated, or "mark as read" un-reads itself the next time the page loads.
 * Where one row can raise more than one notification over its life (an order
 * is placed, then its payment is claimed), the key includes the stage.
 */

/**
 * Notification kinds, in priority order.
 *
 * `priority` decides ordering within the same minute and which ones are
 * allowed to interrupt with a toast. Only `high` pops — a toast for every
 * event is an alert system nobody keeps switched on, and once it is switched
 * off the genuinely urgent ones are gone too.
 */
export const KINDS = {
  complaint:        { label: 'Complaint',            emoji: '⚠️', priority: 'high',   nav: 'complaints', tone: 'critical' },
  event_request:    { label: 'Celebration request',  emoji: '🎉', priority: 'high',   nav: 'new_requests', tone: 'good'  },
  enquiry:          { label: 'Service enquiry',      emoji: '📋', priority: 'normal', nav: 'enquiries', tone: 'good'     },
  vendor_applied:   { label: 'Partner application',  emoji: '🤝', priority: 'normal', nav: 'vendors',   tone: 'good'     },
  review:           { label: 'New review',           emoji: '⭐', priority: 'low',    nav: 'reviews',   tone: 'good'     },
  city_interest:    { label: 'Waitlist signup',      emoji: '🗺️', priority: 'low',    nav: 'geography', tone: 'good'     },
}

const shortId = id => String(id ?? '').slice(0, 8).toUpperCase()

/**
 * Build the whole feed.
 *
 * Everything is derived from rows already in memory, so this is a pure
 * function over the dashboard's data — no fetching, no ordering assumptions,
 * and cheap enough to recompute on every render.
 */
export function buildFeed({
  complaints = [], enquiries = [],
  events = [], reviews = [], vendors = [], interest = [],
} = {}) {
  const items = []
  const push = (type, id, at, title, detail, extra = {}) => {
    if (!at) return
    items.push({ key: `${type}:${id}`, type, at: new Date(at), title, detail, ...KINDS[type], ...extra })
  }

  for (const c of complaints) {
    push('complaint', c.id, c.created_at,
      `Complaint about a ${c.subject_type}`,
      `${c.profiles?.full_name ?? 'A customer'} — ${(c.message ?? '').slice(0, 90)}`,
      { resolved: c.status === 'resolved' })
  }

  for (const e of enquiries) {
    const n = (e.services?.length ?? 0) + (e.packages?.length ?? 0)
    push('enquiry', e.id, e.created_at,
      `Service enquiry — ${e.event_name ?? 'a celebration'}`,
      `${n} service${n === 1 ? '' : 's'} asked about${e.location?.city ? ` in ${e.location.city}` : ''}.`,
      { resolved: e.status === 'closed' || Boolean(e.quoted_price) })
  }

  for (const e of events) {
    if (e.status === 'CANCELLED') continue
    push('event_request', e.id, e.created_at,
      `Celebration request ${e.event_code ?? shortId(e.id)}`,
      `${e.profiles?.full_name ?? 'Someone'} — ${(e.event_type ?? 'an event').replace(/-/g, ' ')}${e.city ? ` in ${e.city}` : ''}.`,
      { eventId: e.id, resolved: e.status !== 'REQUEST_RECEIVED' })
  }

  for (const v of vendors) {
    if (v.status !== 'PENDING_REVIEW') continue
    push('vendor_applied', v.id, v.created_at,
      `${v.business_name ?? 'A partner'} applied`,
      `${v.category ?? 'Partner'}${v.city ? ` in ${v.city}` : ''} — waiting on review.`)
  }

  for (const r of reviews) {
    push('review', r.id, r.created_at,
      `${r.rating}★ review of ${r.subject_name ?? 'something'}`,
      r.comment ? r.comment.slice(0, 90) : `${r.customer_name ?? 'A customer'} left a rating.`,
      { resolved: Boolean(r.admin_reply) })
  }

  // Waitlist signups are grouped by city rather than listed one by one: five
  // separate "someone in Hubli" lines is noise, while "5 signups from Hubli"
  // is the fact worth acting on.
  const byCity = new Map()
  for (const r of interest) {
    const city = (r.city ?? '').trim()
    if (!city) continue
    if (!byCity.has(city)) byCity.set(city, { count: 0, latest: r.created_at })
    const row = byCity.get(city)
    row.count += 1
    if (r.created_at > row.latest) row.latest = r.created_at
  }
  for (const [city, row] of byCity) {
    push('city_interest', city, row.latest,
      `${row.count} ${row.count === 1 ? 'person wants' : 'people want'} Sambramo in ${city}`,
      'Outside the pilot cities — this is the expansion signal.')
  }

  return items.sort((a, b) => b.at - a.at)
}

/* ── Read state ────────────────────────────────────────────────────────── */

/**
 * Mark each item read/unread against the stored state.
 *
 * Two mechanisms, because they answer two different gestures: `lastSeenAt`
 * handles "mark all as read" in one write and stays correct as new items
 * arrive, and `readKeys` handles reading one item out of a list without
 * dismissing everything above it.
 */
export function applyReadState(items, { lastSeenAt, readKeys = [] } = {}) {
  const seen = lastSeenAt ? new Date(lastSeenAt) : null
  const keys = new Set(readKeys)
  return items.map(it => ({
    ...it,
    read: keys.has(it.key) || (seen ? it.at <= seen : false),
  }))
}

export function unreadCount(items) {
  return items.filter(i => !i.read).length
}

/**
 * Which unread items deserve to interrupt.
 *
 * High priority only, and only things that are still outstanding — a return
 * that has already been refunded should not pop just because the page was
 * reloaded. `since` keeps a reload from replaying the whole backlog as toasts,
 * which is the failure that makes people mute notifications permanently.
 */
export function toastable(items, since) {
  const cutoff = since ? new Date(since) : null
  return items.filter(i =>
    !i.read &&
    i.priority === 'high' &&
    !i.resolved &&
    (!cutoff || i.at > cutoff),
  )
}

/** Group into Today / Yesterday / Earlier — the shape an inbox is read in. */
export function groupByDay(items, now = new Date()) {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7)

  const groups = [
    { id: 'today',     label: 'Today',          items: [] },
    { id: 'yesterday', label: 'Yesterday',      items: [] },
    { id: 'week',      label: 'Earlier this week', items: [] },
    { id: 'older',     label: 'Older',          items: [] },
  ]
  for (const it of items) {
    if (it.at >= startOfToday) groups[0].items.push(it)
    else if (it.at >= startOfYesterday) groups[1].items.push(it)
    else if (it.at >= startOfWeek) groups[2].items.push(it)
    else groups[3].items.push(it)
  }
  return groups.filter(g => g.items.length)
}

/** "4m ago" / "3h ago" / "2d ago" — an inbox reads in elapsed time. */
export function relativeTime(date, now = new Date()) {
  const mins = Math.round((now - new Date(date)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
