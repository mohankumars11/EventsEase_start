/**
 * The customer's bookings and quote requests, as they stand in the
 * database — RLS returns only their own rows.
 *
 * Two sources, one list: booking_requests with their booking_lines (what
 * was booked instantly or accepted from a quote), and
 * sambramo_quote_requests with the partner's response (what is waiting on
 * a partner, or waiting on the customer to accept).
 */
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/api'
import { authHeaders } from '../../lib/payLines'

export const LINE_STATE = {
  dispatching: { label: 'Finding your partner', tone: 'wait' },
  accepted: { label: 'Holding your date · pay to confirm', tone: 'act' },
  paid: { label: 'Confirmed', tone: 'ok' },
  in_progress: { label: 'Happening now', tone: 'ok' },
  delivered: { label: 'Delivered', tone: 'ok' },
  settled: { label: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'off' },
  expired: { label: 'Expired', tone: 'off' },
}

export async function myBookings(userId) {
  if (!userId) return { lines: [], quotes: [] }
  const [r1, r2] = await Promise.all([
    supabase.from('booking_requests')
      .select('id, occasion_name, event_date, time_note, area_label, city, created_at, booking_lines(id, service_id, service_name, trade, status, quoted_amount_paise, pricing_snapshot, paid_at, accepted_at)')
      .eq('customer_id', userId).order('created_at', { ascending: false }).limit(40),
    supabase.from('sambramo_quote_requests')
      .select('id, service_name, vendor_service_id, state, event_date, start_time, expires_at, created_at, canonical_demand, sambramo_quote_responses(id, status, customer_amount_paise, quote_valid_until, notes)')
      .eq('customer_id', userId).order('created_at', { ascending: false }).limit(40),
  ])
  const lines = (r1.data ?? []).flatMap(req => (req.booking_lines ?? []).map(l => ({
    ...l, request: { id: req.id, occasion: req.occasion_name, date: req.event_date, time: req.time_note, area: req.area_label },
    advancePaise: Math.min(Number(l.quoted_amount_paise) || 0, Number(l.pricing_snapshot?.advance_paise) || Number(l.quoted_amount_paise) || 0),
  })))
  const quotes = (r2.data ?? []).filter(q => q.state !== 'INSTANT_BOOK').map(q => {
    const open = (q.sambramo_quote_responses ?? []).find(x => x.status === 'SUBMITTED' && (!x.quote_valid_until || new Date(x.quote_valid_until) > new Date()))
    return { ...q, response: open ?? null, offerPaise: q.canonical_demand?.customer_offer_paise ?? null }
  })
  return { lines, quotes, error: r1.error?.message ?? r2.error?.message ?? null }
}

/** Accept a partner's quote: the server books it (an accepted line) and returns what to pay. */
export async function acceptQuote(quoteResponseId) {
  const r = await fetch(apiUrl('/api/accept-custom-quote'), { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ quoteResponseId }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? 'Could not accept the quote.')
  return j
}

/**
 * Tell the server a payment went through, with Razorpay's signed proof, so
 * the booking is confirmed (and the partner told) now rather than when the
 * webhook arrives. The server verifies the signature and re-reads the
 * payment from Razorpay; the webhook remains the authority, and whichever
 * lands second is a no-op.
 */
export async function confirmPaid(p) {
  if (!p?.ok || !p.paymentId || !p.orderId || !p.signature) return null
  try {
    const r = await fetch(apiUrl('/api/anchor?op=confirm-payment'), { method: 'POST', headers: await authHeaders(),
      body: JSON.stringify({ orderId: p.orderId, paymentId: p.paymentId, signature: p.signature }) })
    return await r.json().catch(() => null)
  } catch { return null }
}
