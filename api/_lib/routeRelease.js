/**
 * Release (or reverse) Razorpay Route transfers that are on hold.
 *
 *   GET /api/anchor?op=route-release     (Vercel Cron; Bearer CRON_SECRET when set)
 *
 * Release: a line DELIVERED at least ROUTE_RELEASE_AFTER_HOURS ago (default
 *   24, the window for a customer to raise a problem) has all its on-hold
 *   transfers released, then ONE RELEASE_PARTNER and ONE RELEASE_PLATFORM
 *   ledger row are written (escrow's own unique indexes allow exactly one
 *   each per line), and the line becomes 'settled'.
 * Reverse: a line cancelled while its transfers are still on hold gets them
 *   reversed back to the platform account; the customer refund itself is
 *   the cancellation flow's job and is not touched here.
 * A line with any transfer not yet on hold (pending/failed) is skipped and
 *   reported — never half-released.
 */
import { createClient } from '@supabase/supabase-js'
import { releaseTransfer, reverseTransfer } from './razorpayRoute.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const AFTER_HOURS = Number(process.env.ROUTE_RELEASE_AFTER_HOURS ?? 24)

function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers?.authorization === `Bearer ${secret}`
}

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorised' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: held } = await db.from('sambramo_route_transfers')
    .select('id, line_id, transfer_id, amount_paise, status').in('status', ['on_hold', 'pending', 'failed'])
  const byLine = {}
  for (const t of held ?? []) (byLine[t.line_id] ??= []).push(t)
  const lineIds = Object.keys(byLine)
  if (!lineIds.length) return res.status(200).json({ ok: true, released: 0, reversed: 0 })

  const { data: lines } = await db.from('booking_lines')
    .select('id, status, delivered_at, quoted_amount_paise, partner_amount_paise').in('id', lineIds)
  const cutoff = Date.now() - AFTER_HOURS * 3600 * 1000
  const report = { released: 0, reversed: 0, skipped: [] }

  for (const l of lines ?? []) {
    const ts = byLine[l.id]
    if (['cancelled', 'expired'].includes(l.status)) {
      for (const t of ts.filter(x => x.status === 'on_hold' && x.transfer_id)) {
        const r = await reverseTransfer(t.transfer_id)
        await db.from('sambramo_route_transfers').update(r.ok
          ? { status: 'reversed', updated_at: new Date().toISOString() }
          : { error: r.error, updated_at: new Date().toISOString() }).eq('id', t.id)
        if (r.ok) report.reversed++
      }
      continue
    }
    const deliveredOk = ['delivered', 'settled'].includes(l.status) && l.delivered_at && new Date(l.delivered_at).getTime() <= cutoff
    if (!deliveredOk) continue
    if (ts.some(t => t.status !== 'on_hold' || !t.transfer_id)) { report.skipped.push({ line: l.id, why: 'transfer not on hold yet' }); continue }

    let all = true
    for (const t of ts) {
      const r = await releaseTransfer(t.transfer_id)
      await db.from('sambramo_route_transfers').update(r.ok
        ? { status: 'released', released_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { error: r.error, updated_at: new Date().toISOString() }).eq('id', t.id)
      if (!r.ok) all = false
    }
    if (!all) { report.skipped.push({ line: l.id, why: 'Razorpay refused a release; will retry' }); continue }

    const partnerPaise = ts.reduce((n, t) => n + Number(t.amount_paise), 0)
    const { data: holds } = await db.from('escrow_ledger').select('amount_paise').eq('line_id', l.id).eq('kind', 'HOLD')
    const heldPaise = (holds ?? []).reduce((n, h) => n + Number(h.amount_paise), 0)
    const platformPaise = heldPaise - partnerPaise
    const rows = [{ line_id: l.id, kind: 'RELEASE_PARTNER', amount_paise: -partnerPaise, counterparty: 'partner', adapter: 'RazorpayRoute' }]
    if (platformPaise > 0) rows.push({ line_id: l.id, kind: 'RELEASE_PLATFORM', amount_paise: -platformPaise, counterparty: 'platform', adapter: 'RazorpayRoute' })
    for (const row of rows) {
      const { error } = await db.from('escrow_ledger').insert(row)
      if (error && error.code !== '23505') report.skipped.push({ line: l.id, why: error.message })
    }
    await db.from('booking_lines').update({ status: 'settled' }).eq('id', l.id).eq('status', 'delivered')
    report.released++
  }
  return res.status(200).json({ ok: true, ...report })
}
