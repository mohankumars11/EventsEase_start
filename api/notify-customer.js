/**
 * Tell a customer that something happened to their booking.
 *
 * POST /api/notify-customer
 *   { lineId, event: 'accepted' | 'paid' | 'delivered' }
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CUSTOMER WAS NEVER NOTIFIED OF ANYTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `notifyPartners` has existed since dispatch was built. There was no
 * counterpart. So a customer who pressed "Find my masters" and then, as
 * the screen itself invites them to, closed the app, was never told
 * anything again — a master could accept four minutes later and the only
 * way to find out was to reopen the app and look.
 *
 * That is the promise on the matching screen ("You can close the app —
 * we will alert you the moment someone accepts") going unkept, which is
 * worse than never having made it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS AN ENDPOINT AND NOT A TRIGGER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious place is a Postgres trigger on `booking_lines`, and it is
 * the wrong one: sending an HTTP request from inside a transaction means
 * a slow FCM response holds a row lock on the line a master is trying to
 * accept, and a failed send rolls back the acceptance. The accept must
 * succeed whether or not anybody can be told about it.
 *
 * So the acceptance commits first, in the database, where
 * `uq_offer_one_winner` decides it — and this is called afterwards. It
 * re-reads the line rather than trusting the caller: the body carries a
 * line id and nothing else that matters.
 *
 * If this call never happens the customer still finds out. Their board
 * is subscribed to Realtime with a poll underneath, and the push is the
 * thing that reaches them when the board is closed. Best effort, by
 * design.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { sendPush, pushConfigured } from './_lib/fcm.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** What each event sounds like on a lock screen. */
const COPY = {
  accepted: (svc, who) => ({
    title: `${who ?? 'A master'} accepted your ${String(svc).toLowerCase()}`,
    body: 'They are holding your date. Pay to confirm them.',
  }),
  paid: (svc) => ({
    title: 'Your date is blocked',
    body: `${svc} is confirmed. Your master will call you shortly.`,
  }),
  delivered: (svc) => ({
    title: `${svc} is done`,
    body: 'Tell us if anything was not right, within 24 hours.',
  }),
}

export default async function handler(req, res) {
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })
  if (!pushConfigured()) return res.status(200).json({ sent: 0, skipped: 'not_configured' })

  const { lineId, event = 'accepted' } = req.body ?? {}
  if (!lineId) return res.status(400).json({ error: 'lineId required' })
  if (!COPY[event]) return res.status(400).json({ error: 'unknown event' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Everything is re-read. The caller names a line and nothing else.
  const { data: line } = await db
    .from('booking_lines')
    .select('id, service_name, request_id, booking_requests!inner(customer_id)')
    .eq('id', lineId)
    .maybeSingle()

  if (!line) return res.status(200).json({ sent: 0, skipped: 'no_such_line' })

  const customerId = line.booking_requests?.customer_id
  if (!customerId) return res.status(200).json({ sent: 0, skipped: 'no_customer' })

  // Who won it, for the sentence. Absent is fine — the copy falls back.
  let who = null
  if (event === 'accepted') {
    const { data: offer } = await db
      .from('dispatch_offers')
      .select('vendors(business_name)')
      .eq('line_id', lineId).eq('status', 'ACCEPTED').maybeSingle()
    who = offer?.vendors?.business_name ?? null
  }

  const { data: tokens } = await db
    .from('push_tokens')
    .select('token, platform')
    .eq('profile_id', customerId)
    .eq('app', 'customer')
    .lt('failure_count', 5)

  if (!tokens?.length) return res.status(200).json({ sent: 0, skipped: 'no_device' })

  const { title, body } = COPY[event](line.service_name, who)

  let sent = 0
  const dead = []
  await Promise.all(tokens.map(async t => {
    const r = await sendPush({
      token: t.token,
      platform: t.platform,
      title,
      body,
      url: '/track',
      lineId,
      // Not 120 seconds. A customer's notification is not racing a
      // 45-second offer window — it is news, and news an hour late is
      // still worth having. The partner's TTL is short for the opposite
      // reason: a job that has gone must not still be buzzing.
      ttlSeconds: 3600,
    })
    if (r.ok) sent++
    else if (r.reason === 'dead_token') dead.push(t.token)
  }))

  if (dead.length) await db.from('push_tokens').delete().in('token', dead)

  return res.status(200).json({ sent, of: tokens.length })
}
