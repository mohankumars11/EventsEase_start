import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { tradeNameFor, PLATFORM_FEE_RATE } from './_lib/tradeNames.js'
import { authenticatedUser } from './_lib/auth.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// One platform fee across instant bookings and quotes (was 0.15 here only).
const FEE_RATE = PLATFORM_FEE_RATE
const VERSION = 'sambramo-custom-quote-v2'
const CUSTOMER_ACCEPT_MINUTES = 10

const money = value => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
const list = value => Array.isArray(value) ? value.map(x => String(x).trim()).filter(Boolean).slice(0, 50) : []

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Authentication required' })

  const body = req.body ?? {}
  const quoteRequestId = String(body.quoteRequestId ?? '')

  /* Line items, when sent, ARE the quote: the total is computed here from
     them and any client total is ignored. Included lines are kept at ₹0;
     an estimate must say why. */
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, 60).map((l, i) => ({
    sort_order: i,
    description: String(l.description ?? '').trim().slice(0, 200),
    quantity: Math.max(0.01, Number(l.quantity) || 1),
    unit: String(l.unit ?? 'item').trim().slice(0, 30) || 'item',
    unit_take_home_paise: Math.max(0, Math.round(Number(l.unit_take_home_paise) || 0)),
    charged: l.charged !== false,
    generated: !!l.generated,
    generated_unit_paise: l.generated_unit_paise != null ? Math.round(Number(l.generated_unit_paise)) : null,
    is_estimate: !!l.is_estimate,
    is_discount: !!l.is_discount,
    estimate_note: l.is_estimate ? String(l.estimate_note ?? '').trim().slice(0, 300) || null : null,
  })) : null
  if (lines) {
    if (lines.some(l => !l.description)) return res.status(400).json({ error: 'Every line needs a description.' })
    if (lines.some(l => l.is_estimate && !l.estimate_note)) return res.status(400).json({ error: 'Explain each line marked as an estimate.' })
  }
  const partnerAmountPaise = lines
    // A discount line subtracts; the quote can never go below zero.
    ? Math.max(0, Math.round(lines.filter(l => l.charged).reduce((t, l) => t + (l.is_discount ? -1 : 1) * l.quantity * l.unit_take_home_paise, 0)))
    : money(body.partnerAmountPaise)
  if (!quoteRequestId || (body.decline !== true && partnerAmountPaise <= 0)) return res.status(400).json({ error: 'Quote request and positive partner quote are required.' })

  const { data: vendor } = await db
    .from('vendors')
    .select('id, profile_id, is_verified, verification_status')
    .eq('profile_id', authn.user.id)
    .maybeSingle()
  if (!vendor?.id) return res.status(403).json({ error: 'Partner account not found.' })
  if (!vendor.is_verified || vendor.verification_status !== 'approved') return res.status(403).json({ error: 'Only approved partners can submit customer quotes.' })

  const { data: request } = await db
    .from('sambramo_quote_requests')
    .select('id, vendor_id, trade_id, event_date, service_location, state, expires_at, quote_group_id, canonical_demand')
    .eq('id', quoteRequestId)
    .eq('vendor_id', vendor.id)
    .maybeSingle()

  if (!request) return res.status(404).json({ error: 'Quote request not found.' })
  if (!['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(request.state)) return res.status(409).json({ error: 'That request is no longer open.' })
  if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) return res.status(409).json({ error: 'That quote window has closed.' })

  // The partner declines: the request leaves their queue and the customer sees it closed.
  if (body.decline === true) {
    await db.from('sambramo_quote_requests').update({ state: 'UNAVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', request.id).eq('vendor_id', vendor.id)
    return res.status(200).json({ ok: true, declined: true })
  }

  /* Availability is a live promise. A partner can receive a request at 14:00,
     block the date at 14:02, and still have the request sitting in the inbox.
     Do the same server-side eligibility check again immediately before the
     quote is sent so the calendar remains the authority for dispatch. */
  /* A directed Anchor & MC quote (from the booking engine) exists BECAUSE the
     event may be outside the partner's area, so the distance re-match does
     not apply; the date and capacity are re-checked under the partner lock
     when the customer accepts (book_accepted_quote). */
  const directed = /^(anchor|trades)-engine/.test(String(request.canonical_demand?.engine ?? ''))
  const location = request.service_location && typeof request.service_location === 'object'
    ? request.service_location : {}
  const lat = Number(location.lat)
  const lng = Number(location.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(409).json({ error: 'This request has no usable event location, so we cannot confirm live availability.' })
  }
  if (!directed) {
    const point = `SRID=4326;POINT(${lng} ${lat})`
    const { data: eligible, error: eligibilityError } = await db.rpc('match_partners', {
      // match_partners compares vendor_services.category, which is the trade
      // NAME; the request stores the code. Passing the code matched nobody.
      p_trade: tradeNameFor(request.trade_id),
      p_point: point,
      p_radius_m: 100000,
      p_date: request.event_date,
      p_allow_synthetic: false,
      p_limit: 100,
      p_exclude: [],
    })
    if (eligibilityError) return res.status(503).json({ error: 'We could not confirm your live calendar. Please try again.' })
    if (!(eligible ?? []).some(row => String(row.vendor_id) === String(vendor.id))) {
      await db.from('sambramo_quote_requests')
        .update({ state: 'UNAVAILABLE', updated_at: new Date().toISOString() })
        .eq('id', request.id).eq('vendor_id', vendor.id)
      return res.status(409).json({ error: 'You are no longer available for this request on the selected date. Sambramo has removed it from your quote queue.' })
    }

  }

  /* A directed quote (from the trades engine) is charged at its trade's own
     fee policy, like the instant price would have been; others keep 8%. */
  let feeRate = FEE_RATE
  if (directed) {
    const { data: tf } = await db.rpc('sambramo_trade_fee', { p_trade: request.canonical_demand?.tradeName ?? tradeNameFor(request.trade_id) ?? request.trade_id })
    if (Number(tf) > 0 && Number(tf) < 0.5) feeRate = Number(tf)
  }
  const customerAmountPaise = Math.max(partnerAmountPaise + 100, Math.round(partnerAmountPaise / (1 - feeRate)))
  const platformFeePaise = customerAmountPaise - partnerAmountPaise
  // A directed quote is for a planned event: give the customer two days, not minutes.
  const acceptMinutes = directed ? 48 * 60 : CUSTOMER_ACCEPT_MINUTES
  const validUntil = new Date(Date.now() + acceptMinutes * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('sambramo_quote_responses')
    .upsert({
      quote_request_id: quoteRequestId,
      vendor_id: vendor.id,
      partner_amount_paise: partnerAmountPaise,
      partner_components: lines ? { lines } : (body.partnerComponents && typeof body.partnerComponents === 'object' ? body.partnerComponents : {}),
      inclusions: list(body.inclusions),
      exclusions: list(body.exclusions),
      quote_valid_until: validUntil,
      notes: String(body.notes ?? '').trim().slice(0, 4000) || null,
      customer_amount_paise: customerAmountPaise,
      platform_fee_rate: feeRate,
      platform_fee_paise: platformFeePaise,
      pricing_version: VERSION,
      status: 'SUBMITTED',
    }, { onConflict: 'quote_request_id,vendor_id' })
    .select('id, customer_amount_paise, quote_valid_until, status')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  /* Each send is a new version of the line items; earlier versions are kept. */
  if (lines?.length) {
    const { data: prev } = await db.from('sambramo_quote_line_items').select('quote_version')
      .eq('quote_request_id', quoteRequestId).order('quote_version', { ascending: false }).limit(1)
    const version = (prev?.[0]?.quote_version ?? 0) + 1
    await db.from('sambramo_quote_line_items').insert(lines.map(l => ({ ...l, quote_request_id: quoteRequestId, vendor_id: vendor.id, quote_version: version })))
  }

  return res.status(200).json({
    ok: true,
    responseId: data.id,
    customerAmountPaise: data.customer_amount_paise,
    quoteValidUntil: data.quote_valid_until,
    customerAcceptWindowMinutes: acceptMinutes,
    status: data.status,
    quoteGroupId: request.quote_group_id,
  })
}
