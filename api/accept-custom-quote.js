import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'
import { tradeNameFor, PLATFORM_FEE_RATE } from './_lib/tradeNames.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const VERSION = 'sambramo-custom-quote-v2'
const FEE_RATE = PLATFORM_FEE_RATE

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Authentication required' })

  const quoteResponseId = String(req.body?.quoteResponseId ?? '')
  if (!quoteResponseId) return res.status(400).json({ error: 'quoteResponseId required' })

  const { data: response } = await db
    .from('sambramo_quote_responses')
    .select('id, quote_request_id, vendor_id, partner_amount_paise, customer_amount_paise, platform_fee_rate, platform_fee_paise, quote_valid_until, inclusions, exclusions, partner_components, notes, status')
    .eq('id', quoteResponseId)
    .maybeSingle()
  if (!response) return res.status(404).json({ error: 'Quote not found' })
  if (response.status !== 'SUBMITTED') return res.status(409).json({ error: 'That quote is no longer open' })
  if (response.quote_valid_until && new Date(response.quote_valid_until).getTime() <= Date.now()) return res.status(409).json({ error: 'That quote has expired' })

  const { data: request } = await db
    .from('sambramo_quote_requests')
    .select('id, customer_id, vendor_service_id, trade_id, offering_id, service_name, event_date, start_time, end_time, service_location, canonical_demand, quote_group_id, booking_request_id, reference_photo_url, state')
    .eq('id', response.quote_request_id)
    .maybeSingle()
  if (!request || request.customer_id !== authn.user.id) return res.status(403).json({ error: 'Not your quote' })
  if (!['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(request.state)) return res.status(409).json({ error: 'Quote request is already resolved' })
  if (!request.booking_request_id) return res.status(409).json({ error: 'Quote request has no booking container' })

  // Calendar is the final eligibility gate for a quote as well as an instant book.
  // A partner can become unavailable in the minutes between receiving a quote and
  // the customer accepting it. Re-run the same matcher used for dispatch so a
  // stale quote can never reserve an unavailable partner/date.
  async function partnerStillEligible() {
    const loc = request.service_location ?? {}
    const lat = Number(loc.lat)
    const lng = Number(loc.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
    // match_partners compares the trade NAME; service_name is the offering.
    const tradeName = request.canonical_demand?.tradeName || tradeNameFor(request.trade_id)
    if (!tradeName) return false
    const pointWkt = 'SRID=4326;POINT(' + lng + ' ' + lat + ')'
    const { data: matches, error: matchError } = await db.rpc('match_partners', {
      p_trade: tradeName,
      p_point: pointWkt,
      p_radius_m: 100000,
      p_date: request.event_date,
      p_allow_synthetic: false,
      p_limit: 25,
      p_exclude: [],
    })
    if (matchError) throw matchError
    return (matches ?? []).some(m => String(m.vendor_id) === String(response.vendor_id))
  }

  // Claim the quote request first. The conditional update makes the
  // accept operation single-winner even when two quotes are tapped nearly
  // simultaneously.
  const { data: claimed } = await db
    .from('sambramo_quote_requests')
    .update({ state: 'INSTANT_BOOK', updated_at: new Date().toISOString() })
    .eq('id', request.id)
    .eq('customer_id', authn.user.id)
    .in('state', ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'])
    .select('id')
    .maybeSingle()
  if (!claimed) return res.status(409).json({ error: 'Another quote is already being accepted' })

  try {
    /* A directed Anchor & MC quote may be outside the partner's area by
       design; its date and capacity are re-checked inside
       book_accepted_quote under the partner lock. */
    const directed = /^(anchor|trades)-engine/.test(String(request.canonical_demand?.engine ?? ''))
    if (!directed && !(await partnerStillEligible())) {
      await db.from('sambramo_quote_requests')
        .update({ state: request.state, updated_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('customer_id', authn.user.id)
      return res.status(409).json({ error: 'That partner is no longer available for this date. Please choose another quote.' })
    }
  } catch (e) {
    await db.from('sambramo_quote_requests')
      .update({ state: request.state, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('customer_id', authn.user.id)
    return res.status(503).json({ error: 'We could not confirm live availability. Please try again.' })
  }

  try {
    const quoted = Math.max(1, Math.round(Number(response.customer_amount_paise)))
    const fee = Math.max(0, Math.round(Number(response.platform_fee_paise)))
    const partner = Math.max(1, quoted - fee)
    const now = new Date().toISOString()
    const demand = request.canonical_demand ?? {}

    /* One transaction in the database: insert the line, take the same
       partner lock accept_offer takes, re-check the calendar and the day's
       capacity, write the ACCEPTED offer. Any refusal writes nothing.
       Migration 20261010_01. */
    const { data: booked, error: bookError } = await db.rpc('book_accepted_quote', {
      p_line: {
        request_id: request.booking_request_id,
        service_id: request.offering_id ?? request.trade_id,
        service_name: request.service_name ?? request.offering_id ?? request.trade_id,
        trade: request.trade_id,
        customer_note: demand.note ?? demand.summary ?? null,
        reference_photo_url: request.reference_photo_url ?? null,
        quoted_amount_paise: quoted,
        platform_fee_rate: Number(response.platform_fee_rate) || FEE_RATE,
        platform_fee_paise: fee,
        partner_amount_paise: partner,
        price_basis: {
          kind: 'vendor_quote',
          version: VERSION,
          vendor_id: response.vendor_id,
          partner_quote_paise: response.partner_amount_paise,
          partner_components: response.partner_components,
          inclusions: response.inclusions,
          exclusions: response.exclusions,
          quote_valid_until: response.quote_valid_until,
        },
        pricing_state: 'INSTANT_QUOTE',
        pricing_version: VERSION,
        pricing_snapshot: {
          pricing_state: 'VENDOR_QUOTE_ACCEPTED',
          vendor_quote_response_id: response.id,
          trade_id: request.trade_id,
          offering_id: request.offering_id,
          partner_quote_paise: response.partner_amount_paise,
          customer_amount_paise: quoted,
          platform_fee_paise: fee,
          captured_at: now,
        },
        policy_version: VERSION,
      },
      p_vendor_id: response.vendor_id,
      p_partner_paise: partner,
      p_offer_expires_at: response.quote_valid_until ?? new Date(Date.now() + 3600000).toISOString(),
      p_distance_m: Number((request.service_location ?? {}).distance_m) || null,
    })
    if (bookError) throw bookError
    if (!booked?.ok) {
      await db.from('sambramo_quote_requests')
        .update({ state: request.state, updated_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('customer_id', authn.user.id)
      return res.status(409).json({ error: 'That partner is no longer available for this date. Please choose another quote.', reason: booked?.reason })
    }
    const line = { id: booked.line_id }

    await db.from('sambramo_quote_responses').update({ status: 'ACCEPTED' }).eq('id', response.id)
    const { data: groupRequests } = request.quote_group_id
      ? await db.from('sambramo_quote_requests').select('id').eq('quote_group_id', request.quote_group_id)
      : { data: [] }
    const ids = (groupRequests ?? []).map(x => x.id)
    if (ids.length) {
      await db.from('sambramo_quote_responses')
        .update({ status: 'WITHDRAWN' })
        .eq('status', 'SUBMITTED')
        .in('quote_request_id', ids)
        .neq('id', response.id)
    }

    return res.status(200).json({ ok: true, lineId: line.id, bookingRequestId: request.booking_request_id, quoteResponseId: response.id, amountPaise: quoted })
  } catch (e) {
    await db.from('sambramo_quote_requests')
      .update({ state: request.state, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('customer_id', authn.user.id)
    return res.status(500).json({ error: e.message ?? 'Could not accept that quote' })
  }
}
