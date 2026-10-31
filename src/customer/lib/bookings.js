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
import { lineList, lineAdvance, toListAt, marginPct } from '../../../api/_lib/listPrice.js'

export const LINE_STATE = {
  dispatching: { label: 'Request sent · waiting for them to accept', tone: 'wait' },
  accepted: { label: 'Accepted · pay to confirm', tone: 'act' },
  paid: { label: 'Confirmed', tone: 'ok' },
  in_progress: { label: 'Happening now', tone: 'ok' },
  delivered: { label: 'Delivered', tone: 'ok' },
  settled: { label: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'off' },
  expired: { label: 'Expired', tone: 'off' },
}

/* The offer chosen at checkout, kept for the payment that follows an
   accept. The server re-checks it then; this only remembers the choice. */
const VKEY = 'sbm.cx.voucher.pending'
export function rememberVoucher(id) { try { localStorage.setItem(VKEY, JSON.stringify({ id, at: Date.now() })) } catch { /* private mode */ } }
export function pendingVoucher() {
  try { const v = JSON.parse(localStorage.getItem(VKEY) ?? 'null'); return v && Date.now() - v.at < 14 * 86400000 ? v.id : null } catch { return null }
}
export function clearVoucher() { try { localStorage.removeItem(VKEY) } catch { /* private mode */ } }

/** Who has the request now, who is next, until when (migration 197). Empty until it is pasted. */
export async function requestQueue(lineId) {
  const { data, error } = await supabase.rpc('my_request_queue', { p_line_id: lineId })
  return error ? [] : data ?? []
}
/** Lapsed requests move on now rather than at the next minute's sweep. */
export const nudgeRequests = () => supabase.rpc('sweep_request_timeouts').then(() => {}, () => {})

export async function myBookings(userId) {
  if (!userId) return { lines: [], quotes: [] }
  const [r1, r2] = await Promise.all([
    supabase.from('booking_requests')
      .select('id, occasion_name, event_date, time_note, area_label, city, created_at, booking_lines(id, service_id, service_name, trade, status, quoted_amount_paise, pricing_snapshot, paid_at, accepted_at)')
      .eq('customer_id', userId).order('created_at', { ascending: false }).limit(40),
    supabase.from('sambramo_quote_requests')
      .select('id, service_name, vendor_service_id, trade_id, state, event_date, start_time, expires_at, created_at, canonical_demand, sambramo_quote_responses(id, status, customer_amount_paise, quote_valid_until, notes)')
      .eq('customer_id', userId).order('created_at', { ascending: false }).limit(40),
  ])
  /* What vouchers took off (193). Best effort: before 193 there is none. */
  const allLines = (r1.data ?? []).flatMap(req => req.booking_lines ?? [])
  const saved = {}
  if (allLines.length) {
    const { data: d } = await supabase.from('booking_line_discounts').select('line_id, discount_paise, voucher_code').in('line_id', allLines.map(l => l.id))
    for (const x of d ?? []) saved[x.line_id] = x
  }
  /* Amounts here are the customer's: the Sambramo price (api/_lib/listPrice.js),
     not the partner's quote that quoted_amount_paise holds. */
  const lines = (r1.data ?? []).flatMap(req => (req.booking_lines ?? []).map(l => ({
    ...l, request: { id: req.id, occasion: req.occasion_name, date: req.event_date, time: req.time_note, area: req.area_label },
    listPaise: lineList(l),
    savedPaise: Number(saved[l.id]?.discount_paise) || 0,
    voucherCode: saved[l.id]?.voucher_code ?? null,
    advancePaise: lineAdvance(l),
  })))
  const quotes = (r2.data ?? []).filter(q => q.state !== 'INSTANT_BOOK').map(q => {
    const open = (q.sambramo_quote_responses ?? []).find(x => x.status === 'SUBMITTED' && (!x.quote_valid_until || new Date(x.quote_valid_until) > new Date()))
    const m = q.canonical_demand?.margin_pct != null ? Number(q.canonical_demand.margin_pct) : marginPct(q.trade_id)
    // The partner's quote, at the Sambramo price the customer will pay on accepting it.
    const response = open ? { ...open, customer_amount_paise: toListAt(open.customer_amount_paise, m) } : null
    return { ...q, response, offerPaise: q.canonical_demand?.customer_offer_list_paise ?? q.canonical_demand?.customer_offer_paise ?? null }
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
