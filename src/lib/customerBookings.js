import { supabase } from './supabase'

const TERMINAL_LINES = new Set(['paid', 'delivered', 'cancelled', 'expired'])

const REQUEST_SELECT = [
  'id', 'booking_code', 'occasion_id', 'occasion_name', 'event_date', 'time_note',
  'address_text', 'area_label', 'city', 'radius_km', 'guest_count', 'status',
  'created_at', 'updated_at', 'venue_space_id',
].join(', ')

const LINE_SELECT = [
  'id', 'request_id', 'service_id', 'service_name', 'trade', 'status', 'dispatch_mode',
  'expires_at', 'quoted_amount_paise', 'accepted_offer_id', 'accepted_at', 'paid_at',
  'cancelled_at', 'created_at', 'updated_at',
].join(', ')

export function lineIsLive(line) {
  return !TERMINAL_LINES.has(String(line?.status ?? '').toLowerCase())
}

export function lineLabel(line) {
  const status = String(line?.status ?? '').toLowerCase()
  if (status === 'paid') return 'Paid'
  if (status === 'accepted') return 'Accepted · ready to pay'
  if (status === 'dispatching') return 'Finding a partner'
  if (status === 'expired') return 'Expired'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'delivered') return 'Delivered'
  if (line?.dispatch_mode === 'standing') return 'Still sourcing'
  return 'Received'
}

export async function fetchCustomerBookings(userId) {
  if (!userId) return { bookings: [], error: null }

  const { data: requests, error: requestError } = await supabase
    .from('booking_requests')
    .select(REQUEST_SELECT)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (requestError) return { bookings: [], error: requestError }
  const requestRows = requests ?? []
  if (!requestRows.length) return { bookings: [], error: null }

  const requestIds = requestRows.map(r => r.id)
  const { data: lines, error: lineError } = await supabase
    .from('booking_lines')
    .select(LINE_SELECT)
    .in('request_id', requestIds)
    .order('created_at', { ascending: true })
  if (lineError) return { bookings: [], error: lineError }

  const lineRows = lines ?? []
  const lineIds = lineRows.map(l => l.id)
  let offers = []
  if (lineIds.length) {
    const { data, error: offerError } = await supabase
      .from('dispatch_offers')
      .select('id, line_id, vendor_id, distance_m, status, offered_at, expires_at, accepted_at, vendors(id, business_name)')
      .in('line_id', lineIds)
    if (!offerError) offers = data ?? []
  }

  const offersByLine = new Map()
  for (const offer of offers) {
    const list = offersByLine.get(offer.line_id) ?? []
    list.push(offer)
    offersByLine.set(offer.line_id, list)
  }

  const linesByRequest = new Map()
  for (const line of lineRows) {
    const lineOffers = offersByLine.get(line.id) ?? []
    const enriched = {
      ...line,
      offers: lineOffers,
      acceptedOffer: lineOffers.find(o => o.status === 'ACCEPTED' || o.id === line.accepted_offer_id) ?? null,
    }
    const list = linesByRequest.get(line.request_id) ?? []
    list.push(enriched)
    linesByRequest.set(line.request_id, list)
  }

  return {
    bookings: requestRows.map(request => ({ ...request, lines: linesByRequest.get(request.id) ?? [] })),
    error: null,
  }
}

export function subscribeToCustomerBookings({ userId, requestIds = [], onChange }) {
  if (!userId) return () => {}
  const channels = []

  channels.push(
    supabase.channel('customer-bookings-' + userId + '-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests', filter: 'customer_id=eq.' + userId }, onChange)
      .subscribe(),
  )

  for (const requestId of requestIds) {
    channels.push(
      supabase.channel('customer-bookings-lines-' + requestId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines', filter: 'request_id=eq.' + requestId }, onChange)
        .subscribe(),
    )
    channels.push(
      supabase.channel('customer-booking-offers-' + requestId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_offers' }, (payload) => {
          const lineId = payload?.new?.line_id ?? payload?.old?.line_id
          if (lineId) onChange(payload)
        })
        .subscribe(),
    )
  }

  return () => { for (const channel of channels) supabase.removeChannel(channel) }
}
