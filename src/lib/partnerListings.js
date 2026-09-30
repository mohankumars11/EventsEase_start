import { supabase } from './supabase'

/**
 * A partner's trades, one row each.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE PARTNER + ONE TRADE = ONE LISTING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vendor_services` holds OFFERINGS — "Floral decoration", "Mandap
 * setup" — each with its own price and its own review state. A decorator
 * has ten of them and they are ten different jobs.
 *
 * What was missing is the thing above them: the partner's Decoration
 * business, as one object with one status, that can be opened, paused
 * and reviewed as a whole. Without it the app had to guess by grouping a
 * text column at read time, and a guess is why tapping Photography twice
 * could start a second Photography.
 *
 * Migration 120 makes that container a table with UNIQUE (vendor_id,
 * trade) behind it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT WORKS BEFORE THE MIGRATION IS APPLIED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations here are pasted into the SQL editor by hand, so there is
 * always a window where the code is deployed and the table is not. Every
 * read below falls back to grouping vendor_services by category — the
 * same answer, computed rather than stored.
 *
 * The difference is honest and worth naming: in fallback mode the rule
 * is enforced by the app only, so two devices racing can still make two
 * containers. `source` on every result says which mode produced it, so
 * nothing downstream has to assume.
 */

/** Every state a trade can be in. §12, minus one that would be a lie. */
export const LISTING_STATUS = {
  draft:           { label: 'Draft',           tone: 'gray',  partner: 'Not finished yet' },
  incomplete:      { label: 'Incomplete',      tone: 'amber', partner: 'Something is missing' },
  under_review:    { label: 'Under review',    tone: 'amber', partner: 'We are reading it' },
  live:            { label: 'Live',            tone: 'green', partner: 'Customers can find you' },
  requires_action: { label: 'Action required', tone: 'rose',  partner: 'We need a change' },
  rejected:        { label: 'Not accepted',    tone: 'rose',  partner: 'We could not accept this' },
  paused:          { label: 'Paused',          tone: 'gray',  partner: 'You paused this' },
  hidden:          { label: 'Hidden',          tone: 'gray',  partner: 'Not shown right now' },
  suspended:       { label: 'Suspended',       tone: 'rose',  partner: 'On hold — talk to us' },
}

/* NOT a status. `verified` is a claim about a BUSINESS, it is set by an
   operator through set_vendor_verification(), and it lives on
   vendors.verification_status. A listing status that reads as a badge
   is how a tick nobody awarded ends up on a screen. */

/** Worst first: what a partner has to deal with outranks what is earning. */
const LADDER = [
  'suspended', 'requires_action', 'rejected', 'incomplete',
  'under_review', 'live', 'paused', 'hidden', 'draft',
]

/**
 * The status of a trade, read off the offerings inside it.
 *
 * Used to derive a container before 120 is applied, and to CHECK one
 * afterwards — a container saying `live` with every offering sent back
 * is a disagreement somebody needs to see.
 */
export function statusFromOfferings(offerings = []) {
  if (!offerings.length) return 'draft'
  const seen = new Set(offerings.map(o => {
    if (o.review_status === 'rejected') return 'requires_action'
    if (o.review_status === 'live') return o.is_active === false ? 'paused' : 'live'
    return 'under_review'
  }))
  return LADDER.find(s => seen.has(s)) ?? 'draft'
}

/* Whether 120 has been applied. Asked once per page load, not per call:
   every answer is the same until somebody pastes SQL, and a missing
   table costs a round trip to find out. */
let hasTable = null

async function tableExists() {
  if (hasTable !== null) return hasTable
  const { error } = await supabase.from('partner_listings').select('id').limit(1)
  /* 42P01 undefined_table. Any other error (a network blip, RLS) is not
     evidence the table is missing, and caching "missing" on a blip would
     silently drop the app into fallback mode for the whole session. */
  hasTable = !(error && (error.code === '42P01' || /does not exist/i.test(error.message ?? '')))
  return hasTable
}

/**
 * Every trade this partner has, with the offerings inside it.
 *
 * @returns [{ id, trade, status, offerings, source }]
 *          `id` is null in fallback mode — there is no container row to
 *          point at, and a caller that needs one must say so.
 */
export async function fetchListings(vendorId) {
  if (!vendorId) return []

  const { data: services = [] } = await supabase
    .from('vendor_services')
    .select('id, name, category, price, unit, review_status, is_active, listing_id, updated_at')
    .eq('vendor_id', vendorId)
    .order('sort_order', { ascending: true })

  const byTrade = new Map()
  for (const s of services ?? []) {
    if (!s.category) continue
    if (!byTrade.has(s.category)) byTrade.set(s.category, [])
    byTrade.get(s.category).push(s)
  }

  if (await tableExists()) {
    const { data: rows = [] } = await supabase
      .from('partner_listings')
      .select('id, trade, trade_id, status, review_note, submitted_at, reviewed_at')
      .eq('vendor_id', vendorId)

    const out = (rows ?? []).map(r => ({
      ...r,
      offerings: byTrade.get(r.trade) ?? [],
      derived: statusFromOfferings(byTrade.get(r.trade) ?? []),
      source: 'table',
    }))

    /* A trade with offerings but no container: a row written before 120
       was applied, or by a script. Shown rather than hidden — a partner
       whose Catering vanished from My Services because a backfill missed
       it would reasonably conclude the app had lost their work. */
    for (const [trade, offerings] of byTrade) {
      if (out.some(o => o.trade === trade)) continue
      out.push({
        id: null, trade, trade_id: null,
        status: statusFromOfferings(offerings),
        offerings, derived: statusFromOfferings(offerings), source: 'orphan',
      })
    }
    return out.sort((a, b) => a.trade.localeCompare(b.trade))
  }

  return [...byTrade.entries()]
    .map(([trade, offerings]) => ({
      id: null, trade, trade_id: null,
      status: statusFromOfferings(offerings),
      offerings, derived: statusFromOfferings(offerings), source: 'grouped',
    }))
    .sort((a, b) => a.trade.localeCompare(b.trade))
}

/**
 * What to do when a partner picks a trade — §13, in one place.
 *
 * Never creates a second container. Returns what the caller should do
 * with the one that exists, or says there is none.
 *
 * @returns { existing: false } | { existing: true, listing, action }
 *   action  'open'     it is live — take them to it
 *           'resume'   a draft they left
 *           'continue' started, not finished
 *           'fix'      an operator asked for a change
 *           'status'   with an operator; show them where it is
 */
export async function listingFor(vendorId, trade) {
  const all = await fetchListings(vendorId)
  const listing = all.find(l => l.trade === trade)
  if (!listing) return { existing: false }

  const action = {
    live:            'open',
    paused:          'open',
    hidden:          'open',
    draft:           'resume',
    incomplete:      'continue',
    requires_action: 'fix',
    rejected:        'fix',
    under_review:    'status',
    suspended:       'status',
  }[listing.status] ?? 'open'

  return { existing: true, listing, action }
}

/**
 * The container for a trade, made if it is not there.
 *
 * Idempotent by the database, not by a read-then-write: two taps a
 * moment apart both reach the upsert, and `UNIQUE (vendor_id, trade)`
 * settles it. Checking first and inserting second is exactly the race
 * that produced duplicate Photographys.
 *
 * Returns the container's id, or null in fallback mode — where there is
 * nothing to create and the offerings themselves carry the trade.
 */
export async function ensureListing(vendorId, trade, tradeId = null) {
  if (!vendorId || !trade) return null
  if (!(await tableExists())) return null

  const { data, error } = await supabase
    .from('partner_listings')
    .upsert(
      { vendor_id: vendorId, trade, trade_id: tradeId },
      { onConflict: 'vendor_id,trade', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (error) {
    /* Losing the race is the expected outcome of two taps, not a
       failure: the row the other tap made is the row we wanted. */
    const { data: existing } = await supabase
      .from('partner_listings').select('id')
      .eq('vendor_id', vendorId).eq('trade', trade).maybeSingle()
    return existing?.id ?? null
  }
  return data?.id ?? null
}

/** Attach an offering to its trade's container. No-op in fallback mode. */
export async function linkOffering(serviceId, listingId) {
  if (!serviceId || !listingId) return
  await supabase.from('vendor_services').update({ listing_id: listingId }).eq('id', serviceId)
}

/**
 * The partner's two transitions. Everything else belongs to an operator
 * and is reverted by 120's trigger, silently and on purpose.
 */
export async function pauseListing(listingId) {
  if (!listingId) return { ok: false, reason: 'no-container' }
  const { error } = await supabase.from('partner_listings')
    .update({ status: 'paused' }).eq('id', listingId)
  return error ? { ok: false, reason: error.message } : { ok: true }
}

export async function resubmitListing(listingId) {
  if (!listingId) return { ok: false, reason: 'no-container' }
  const { error } = await supabase.from('partner_listings')
    .update({ status: 'under_review' }).eq('id', listingId)
  return error ? { ok: false, reason: error.message } : { ok: true }
}

/** Test seam: the table check is cached for the page's lifetime. */
export function __resetTableCache() { hasTable = null }
