import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const POLICY_VERSION = 'sambramo-custom-quote-v2'
const PARTNER_RESPONSE_MINUTES = 7
const DEFAULT_RADIUS_KM = 40
const MAX_PARTNERS = 5

const TRADE_NAMES = Object.freeze({
  E01:'Catering & Food',E02:'Photography',E03:'Videography',E04:'Decoration & Floral',
  E05:'Venue',E06:'DJ & Music',E07:'Live Entertainment',E08:'Bridal Makeup & Hair',
  E09:'Wedding Planning',E10:'Tent & Furniture',E11:'Invitation & Printing',
  E12:'Transportation',E13:'Event Lighting',E14:'Cake & Desserts',E15:'Mehendi Artist',
  E16:'Anchor & MC',E17:'Sound & AV',E18:'Valet Parking',E19:'Security Services',
  E20:'Bar & Beverages',E21:'Guest Services',E22:'Power & Cooling',E23:'Safety & Facilities',
  E24:'Priest & Rituals',E25:'Gifts & Favours',E26:'Trousseau & Gift Packing',
  L01:'Mini Truck / Pickup',L02:'Medium / Large Goods Vehicle',L03:'Passenger Transport',
  L04:'Event Equipment Rental',L05:'Loading & Unloading Crew',L06:'Warehouse / Storage',
  L07:'Event Materials Supplier',L08:'End-to-End Event Logistics',
})

function cleanText(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max) || null
}

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Authentication required' })

  const body = req.body ?? {}
  const tradeId = cleanText(body.tradeId, 20)
  const serviceName = cleanText(body.serviceName, 160)
  const eventDate = cleanText(body.eventDate, 20)
  const location = body.location && typeof body.location === 'object' ? body.location : {}
  const lat = Number(location.lat ?? location.latitude)
  const lng = Number(location.lng ?? location.longitude ?? location.lon)
  const guestCount = Math.max(1, Math.round(Number(body.guestCount) || 1))
  if (!tradeId || !serviceName || !eventDate || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Trade, service, date and a resolved location are required.' })
  }

  const tradeName = TRADE_NAMES[tradeId]
  if (!tradeName) return res.status(400).json({ error: 'Unsupported Sambramo trade.' })
  const summary = cleanText(body.summary, 3000)
  const demand = body.demand && typeof body.demand === 'object' ? body.demand : {}
  const notes = cleanText(body.notes, 3000)
  const groupId = crypto.randomUUID()

  const { data: booking, error: bookingError } = await db.rpc('create_booking_request', {
    p_customer_id: authn.user.id,
    p_occasion_id: 'custom-' + tradeId,
    p_occasion_name: 'Sambramo custom · ' + serviceName,
    p_event_date: eventDate,
    p_guest_count: guestCount,
    p_radius_km: Math.max(5, Math.min(100, Number(body.radiusKm) || DEFAULT_RADIUS_KM)),
    p_lat: lat,
    p_lng: lng,
    p_address_text: cleanText(location.address, 500),
    p_area_label: cleanText(location.area, 160),
    p_city: cleanText(location.city, 120),
    p_policy_version: POLICY_VERSION,
    p_time_note: cleanText(body.timeNote, 80),
    p_notes: notes || summary,
  })
  if (bookingError) return res.status(500).json({ error: bookingError.message })
  if (!booking?.ok || !booking?.request_id) {
    return res.status(422).json({ error: booking?.detail || 'That location could not be matched.' })
  }

  const pointWkt = 'SRID=4326;POINT(' + lng + ' ' + lat + ')'
  const { data: matches, error: matchError } = await db.rpc('match_partners', {
    p_trade: tradeName,
    p_point: pointWkt,
    p_radius_m: Math.max(5000, Math.min(100000, (Number(body.radiusKm) || DEFAULT_RADIUS_KM) * 1000)),
    p_date: eventDate,
    p_allow_synthetic: false,
    p_limit: MAX_PARTNERS,
    p_exclude: [],
  })
  if (matchError) return res.status(500).json({ error: matchError.message })

  const candidates = Array.isArray(matches) ? matches : []
  if (!candidates.length) {
    return res.status(200).json({ ok: true, state: 'UNAVAILABLE', bookingRequestId: booking.request_id, quoteGroupId: groupId, partnersContacted: 0 })
  }

  const rows = []
  for (const match of candidates.slice(0, MAX_PARTNERS)) {
    const { data: service } = await db
      .from('vendor_services')
      .select('id, vendor_id, name')
      .eq('vendor_id', match.vendor_id)
      .eq('category', tradeName)
      .eq('is_active', true)
      .eq('review_status', 'live')
      .order('sort_order')
      .limit(1)
      .maybeSingle()

    rows.push({
      customer_id: authn.user.id,
      vendor_id: match.vendor_id,
      vendor_service_id: service?.id ?? null,
      trade_id: tradeId,
      offering_id: service?.id ?? cleanText(body.offeringId, 120) ?? tradeId,
      service_name: serviceName,
      event_date: eventDate,
      start_time: cleanText(body.startTime, 20),
      end_time: cleanText(body.endTime, 20),
      service_location: {
        city: cleanText(location.city, 120),
        area: cleanText(location.area, 160),
        address: cleanText(location.address, 500),
        lat,
        lng,
        distance_m: Number(match.distance_m) || null,
      },
      canonical_demand: {
        ...demand,
        guestCount,
        summary,
        note: notes,
        tradeId,
        tradeName,
      },
      state: 'VENDOR_QUOTE',
      missing_inputs: [],
      required_actions: [],
      expires_at: new Date(Date.now() + PARTNER_RESPONSE_MINUTES * 60 * 1000).toISOString(),
      quote_group_id: groupId,
      booking_request_id: booking.request_id,
      reference_photo_url: cleanText(body.referencePhotoUrl, 1000),
    })
  }

  const { data: inserted, error } = await db
    .from('sambramo_quote_requests')
    .insert(rows)
    .select('id, vendor_id')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({
    ok: true,
    state: 'VENDOR_QUOTE',
    bookingRequestId: booking.request_id,
    quoteGroupId: groupId,
    partnersContacted: inserted?.length ?? 0,
    partnerResponseWindowMinutes: PARTNER_RESPONSE_MINUTES,
    quoteRequestIds: (inserted ?? []).map(x => x.id),
  })
}
