/**
 * Route transfers around a captured booking payment.
 *
 * onCapture: for each funded line whose partner has an ACTIVATED Route
 *   account, move the partner's share of what was captured into that
 *   account, ON HOLD. Share = captured × partner_amount / quoted, so an
 *   advance and a balance each transfer their own proportion and together
 *   equal the partner's amount exactly once the line is fully paid.
 * Partners without Route stay on the existing manual payout path, which
 *   is untouched.
 *
 * Never throws and never fails the webhook: the money is already recorded
 * in escrow by then. A transfer that could not be created is stored as
 * 'failed' with Razorpay's reason, for the release job / an admin to retry.
 */
import { transferFromPayment } from './razorpayRoute.js'

export async function routeTransfersForCapture(db, { entity, lineIds }) {
  try {
    const paymentId = entity.id
    const captured = Number(entity.amount ?? 0)
    const { data: lines } = await db.from('booking_lines')
      .select('id, quoted_amount_paise, partner_amount_paise, status, accepted_offer_id')
      .in('id', lineIds)
    const fundable = (lines ?? []).filter(l => ['accepted', 'paid'].includes(l.status) && l.accepted_offer_id)
    if (!fundable.length || !captured) return { ok: true, transfers: 0 }
    const { data: offers } = await db.from('dispatch_offers').select('id, vendor_id').in('id', fundable.map(l => l.accepted_offer_id))
    const vendorOf = Object.fromEntries((offers ?? []).map(o => [o.id, o.vendor_id]))

    const totalQuoted = fundable.reduce((t, l) => t + (l.quoted_amount_paise || 0), 0) || 1
    let made = 0
    for (const l of fundable) {
      const vendorId = vendorOf[l.accepted_offer_id]
      if (!vendorId) continue
      const { data: acct } = await db.from('partner_payout_accounts')
        .select('route_account_id, route_status').eq('vendor_id', vendorId).maybeSingle()
      if (!acct?.route_account_id || acct.route_status !== 'activated') continue

      const lineCaptured = Math.round(captured * (l.quoted_amount_paise || 0) / totalQuoted)
      const amount = Math.floor(lineCaptured * (l.partner_amount_paise || 0) / (l.quoted_amount_paise || 1))
      if (amount <= 0) continue

      // Claim the slot first: unique (payment_id, line_id) makes a webhook retry a no-op.
      const { data: row, error: claimErr } = await db.from('sambramo_route_transfers').insert({
        line_id: l.id, vendor_id: vendorId, payment_id: paymentId,
        route_account_id: acct.route_account_id, amount_paise: amount, status: 'pending',
      }).select('id').single()
      if (claimErr) continue   // 23505: already handled on an earlier delivery

      const t = await transferFromPayment(paymentId, {
        account: acct.route_account_id, amountPaise: amount, notes: { line_id: l.id },
      })
      const transfer = t.data?.items?.[0]
      await db.from('sambramo_route_transfers').update(t.ok && transfer
        ? { transfer_id: transfer.id, status: 'on_hold', updated_at: new Date().toISOString() }
        : { status: 'failed', error: t.error ?? 'No transfer returned', updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (t.ok) made++
    }
    return { ok: true, transfers: made }
  } catch (e) {
    return { ok: false, error: e?.message }
  }
}

/** account.* and transfer.* webhooks → our rows. */
export async function routeWebhook(db, event, payload) {
  if (event.startsWith('transfer.')) {
    const t = payload?.payload?.transfer?.entity
    if (!t?.id) return null
    const status = { 'transfer.processed': 'processed', 'transfer.failed': 'failed', 'transfer.reversed': 'reversed' }[event]
    if (status) await db.from('sambramo_route_transfers').update({ status, updated_at: new Date().toISOString() }).eq('transfer_id', t.id)
    return { ok: true, transfer: t.id, status }
  }
  if (event.startsWith('account.') || event.startsWith('product.')) {
    const acc = payload?.payload?.account?.entity ?? payload?.payload?.merchant_product?.entity
    const accountId = acc?.account_id ?? acc?.id
    if (!accountId) return null
    const map = {
      'account.activated': 'activated', 'account.suspended': 'suspended', 'account.rejected': 'rejected',
      'account.needs_clarification': 'needs_clarification', 'account.under_review': 'under_review',
      'product.route.activated': 'activated', 'product.route.needs_clarification': 'needs_clarification',
      'product.route.under_review': 'under_review', 'product.route.rejected': 'rejected',
    }
    const status = map[event]
    if (status) await db.from('partner_payout_accounts').update({ route_status: status, route_updated_at: new Date().toISOString() })
      .eq('route_account_id', accountId)
    return { ok: true, account: accountId, status }
  }
  return null
}
