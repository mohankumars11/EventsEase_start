/**
 * Book an Anchor & MC partner at their published price — or get a quote.
 *
 *   POST /api/book-anchor
 *   { vendorServiceId, request: { tier?, event_date, start_time, hours, days?, guests,
 *     languages[], event_category, addons[], lat, lng }, venue: { address, area, city },
 *     note?, preview? }
 *
 * The decision is resolve_anchor_booking (migration 20261010_05), never the
 * client:
 *   INSTANT       → booking request + an ACCEPTED line for THIS partner
 *                   (book_partner_line: partner lock + calendar re-check).
 *                   The client then pays the advance via create-booking-payment.
 *   QUOTE         → a quote request to this partner, pre-filled with every
 *                   line the engine could price; the rest are flagged.
 *   NOT_ELIGIBLE  → the reasons, in plain English.
 * `preview: true` resolves without writing anything (no login needed).
 * Every non-preview decision is logged to sambramo_booking_decisions.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'
import { PLATFORM_FEE_RATE } from './_lib/tradeNames.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const VERSION = 'anchor-engine-v1'
const TRADE = 'Anchor & MC'
const TRADE_CODE = 'E16'

const REASON_TEXT = {
  listing_not_found: 'This partner is not listed.',
  not_live: 'This partner is not taking bookings yet.',
  date_required: 'Choose an event date.',
  hours_required: 'Choose how long you need them.',
  partner_not_verified: 'This partner is not verified yet.',
  partner_paused: 'This partner has paused bookings.',
  event_not_hosted: 'This partner does not host this kind of event.',
  short_notice: 'This date is too soon for this partner.',
  beyond_booking_window: 'This partner is not taking bookings that far ahead.',
  date_blocked: 'This partner is not available on that date.',
  weekday_closed: 'This partner does not work on that day.',
  date_full: 'This partner is fully booked on that date.',
  audience_over_capacity: 'Your guest count is above what this partner usually hosts.',
  longer_than_partner_hosts: 'Your event is longer than this partner hosts in one go.',
  multi_day_not_priced: 'Multi-day events are priced by the partner.',
  package_not_found: 'That package is not available.',
  no_rule_fits_duration: 'No standard price covers that duration.',
  extra_hours_not_priced: 'Extra hours need the partner to price them.',
  outside_travel_area: 'Your venue is outside this partner’s travel area.',
  instant_booking_off: 'This partner confirms every booking personally.',
  partner_payout_not_active: 'This partner is still setting up instant payments.',
  custom_quotes_off: 'This partner does not take custom requests.',
}
const explain = r => REASON_TEXT[r]
  ?? (r.startsWith('language_') ? `This partner does not host in ${r.slice(9)}.`
    : r.startsWith('addon_not_offered_') ? 'One of your extras is not offered by this partner.'
    : r.startsWith('addon_short_notice_') ? 'One of your extras needs more notice.'
    : r)

const clean = (v, n = 500) => String(v ?? '').trim().slice(0, n) || null

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const body = req.body ?? {}
  const vendorServiceId = clean(body.vendorServiceId, 60)
  const r = body.request && typeof body.request === 'object' ? body.request : null
  if (!vendorServiceId || !r) return res.status(400).json({ error: 'vendorServiceId and request are required.' })

  const { data: resolution, error: resErr } = await db.rpc('resolve_anchor_booking', {
    p_vendor_service_id: vendorServiceId, p_req: r,
  })
  if (resErr) return res.status(500).json({ error: resErr.message })
  const out = { ...resolution, reasons_text: (resolution.reasons ?? []).map(explain) }
  if (body.preview) return res.status(200).json(out)

  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Sign in to book.' })
  const customerId = authn.user.id

  const log = patch => db.from('sambramo_booking_decisions').insert({
    vendor_service_id: vendorServiceId, customer_id: customerId, path: resolution.path,
    reasons: resolution.reasons ?? [], request: r, customer_total_paise: resolution.customer_paise ?? null, ...patch,
  }).then(() => {}, () => {})

  if (resolution.path === 'NOT_ELIGIBLE') { await log({}); return res.status(200).json(out) }

  const lat = Number(r.lat), lng = Number(r.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Choose the venue on the map.' })
  const venue = body.venue ?? {}
  const { data: svc } = await db.from('vendor_services').select('id, name, vendor_id').eq('id', vendorServiceId).maybeSingle()

  const { data: booking, error: bErr } = await db.rpc('create_booking_request', {
    p_customer_id: customerId,
    p_occasion_id: r.event_category ? `anchor-${r.event_category}` : 'anchor',
    p_occasion_name: `Anchor & MC · ${clean(r.event_category, 60) ?? 'event'}`,
    p_event_date: r.event_date,
    p_guest_count: Math.max(1, Math.round(Number(r.guests) || 1)),
    p_radius_km: 25,
    p_lat: lat, p_lng: lng,
    p_address_text: clean(venue.address), p_area_label: clean(venue.area, 160), p_city: clean(venue.city, 120),
    p_policy_version: VERSION,
    p_time_note: clean(`${r.start_time ?? ''} · ${r.hours}h${Number(r.days) > 1 ? ` × ${r.days} days` : ''}`, 80),
    p_notes: clean(body.note, 1000),
  })
  if (bErr || !booking?.ok) return res.status(500).json({ error: bErr?.message ?? booking?.detail ?? 'Could not create the booking.' })

  /* ── INSTANT ───────────────────────────────────────────────────────── */
  if (resolution.path === 'INSTANT') {
    const quoted = resolution.customer_paise
    const partner = resolution.take_home_paise
    const { data: booked, error } = await db.rpc('book_partner_line', {
      p_line: {
        request_id: booking.request_id,
        service_id: vendorServiceId, service_name: svc?.name ?? TRADE, trade: TRADE,
        customer_note: clean(body.note, 1000),
        quoted_amount_paise: quoted, platform_fee_rate: PLATFORM_FEE_RATE,
        platform_fee_paise: quoted - partner, partner_amount_paise: partner,
        price_basis: { kind: 'partner_published', version: VERSION, listing_version_id: resolution.listing_version_id },
        pricing_state: 'INSTANT_BOOK', pricing_version: VERSION, policy_version: VERSION,
        // Immutable: the rule, package, lines, fee and terms this price came from.
        pricing_snapshot: { ...resolution, request: r, captured_at: new Date().toISOString() },
      },
      p_vendor_id: resolution.vendor_id, p_partner_paise: partner, p_spec_mode: 'standard',
    })
    if (error) return res.status(500).json({ error: error.message })
    if (!booked?.ok) {
      await log({})
      return res.status(409).json({ ...out, path: 'NOT_ELIGIBLE', reasons: [booked?.reason], reasons_text: ['This partner was just booked for that date.'] })
    }
    await log({ booking_line_id: booked.line_id })
    return res.status(200).json({ ...out, lineId: booked.line_id, bookingRequestId: booking.request_id })
  }

  /* ── QUOTE ─────────────────────────────────────────────────────────── */
  const hours = Number(resolution.quote_hours) || 4
  const { data: q, error: qErr } = await db.from('sambramo_quote_requests').insert({
    customer_id: customerId, vendor_id: resolution.vendor_id ?? svc?.vendor_id, vendor_service_id: vendorServiceId,
    trade_id: TRADE_CODE, offering_id: vendorServiceId, service_name: svc?.name ?? TRADE,
    event_date: r.event_date, start_time: clean(r.start_time, 20), end_time: null,
    service_location: { city: clean(venue.city, 120), area: clean(venue.area, 160), address: clean(venue.address), lat, lng,
      distance_m: resolution.distance_km != null ? Math.round(resolution.distance_km * 1000) : null },
    canonical_demand: { ...r, tradeId: TRADE_CODE, tradeName: TRADE, note: clean(body.note, 1000),
      summary: (out.reasons_text ?? []).join(' '), reasons: resolution.reasons, engine: VERSION },
    state: 'VENDOR_QUOTE', missing_inputs: resolution.reasons ?? [], required_actions: [],
    // The partner's own response window, set by the server clock.
    expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
    booking_request_id: booking.request_id,
  }).select('id').single()
  if (qErr) return res.status(500).json({ error: qErr.message })

  const priced = (resolution.lines ?? []).map((l, i) => ({
    quote_request_id: q.id, vendor_id: resolution.vendor_id ?? svc?.vendor_id, sort_order: i,
    description: l.description, quantity: Math.max(1, Number(l.qty) || 1), unit: l.kind === 'extra_hours' ? 'hour' : 'item',
    unit_take_home_paise: Math.round((Number(l.take_home_paise) || 0) / Math.max(1, Number(l.qty) || 1)),
    charged: Number(l.take_home_paise) > 0, generated: true,
    generated_unit_paise: Math.round((Number(l.take_home_paise) || 0) / Math.max(1, Number(l.qty) || 1)),
  }))
  const flagged = (resolution.reasons ?? [])
    .filter(x => ['outside_travel_area', 'multi_day_not_priced', 'extra_hours_not_priced', 'no_rule_fits_duration', 'package_not_found'].includes(x) || x.startsWith('addon_not_offered_'))
    .map((x, i) => ({
      quote_request_id: q.id, vendor_id: resolution.vendor_id ?? svc?.vendor_id, sort_order: priced.length + i,
      description: explain(x).replace(/\.$/, ''), quantity: 1, unit: 'item', unit_take_home_paise: 0, needs_partner: true,
    }))
  if (priced.length + flagged.length) await db.from('sambramo_quote_line_items').insert([...priced, ...flagged])

  await log({ quote_request_id: q.id })
  return res.status(200).json({ ...out, quoteRequestId: q.id, bookingRequestId: booking.request_id, respondWithinHours: hours })
}
