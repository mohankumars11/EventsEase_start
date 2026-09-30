import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const VERSION = 'sambramo-custom-quote-v1'
const FEE_RATE = 0.15

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

  let createdLineId = null
  let createdOfferId = null
  try {
    const quoted = Math.max(1, Math.round(Number(response.customer_amount_paise)))
    const fee = Math.max(0, Math.round(Number(response.platform_fee_paise)))
    const partner = Math.max(1, quoted - fee)
    const now = new Date().toISOString()
    const demand = request.canonical_demand ?? {}

    const { data: line, error: lineError } = await db
      .from('booking_lines')
      .insert({
        request_id: request.booking_request_id,
        service_id: request.offering_id ?? request.trade_id,
        service_name: request.service_name ?? request.offering_id ?? request.trade_id,
        trade: request.trade_id,
        spec_mode: 'quote',
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
        pricing_state: 'INSTANT_BOOK',
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
        status: 'accepted',
        accepted_at: now,
        policy_version: VERSION,
      })
      .select('id')
      .single()
    if (lineError) throw lineError
    createdLineId = line.id

    const { data: offer, error: offerError } = await db
      .from('dispatch_offers')
      .insert({
        line_id: line.id,
        vendor_id: response.vendor_id,
        wave: 1,
        distance_m: Number((request.service_location ?? {}).distance_m) || null,
        partner_amount_paise: partner,
        status: 'ACCEPTED',
        offered_at: now,
        expires_at: response.quote_valid_until ?? new Date(Date.now() + 3600000).toISOString(),
        responded_at: now,
        accepted_at: now,
      })
      .select('id')
      .single()
    if (offerError) throw offerError
    createdOfferId = offer.id

    const { error: updateLineError } = await db
      .from('booking_lines')
      .update({ accepted_offer_id: offer.id })
      .eq('id', line.id)
    if (updateLineError) throw updateLineError

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
    if (createdOfferId) await db.from('dispatch_offers').delete().eq('id', createdOfferId)
    if (createdLineId) await db.from('booking_lines').delete().eq('id', createdLineId)
    await db.from('sambramo_quote_requests')
      .update({ state: request.state, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('customer_id', authn.user.id)
    return res.status(500).json({ error: e.message ?? 'Could not accept that quote' })
  }
}
