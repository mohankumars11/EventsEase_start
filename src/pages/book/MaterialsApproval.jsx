/**
 * "Your decorator needs these things bought for your event."
 *   /materials/:quoteId
 *
 * ── Why this screen is itemised, and expires ───────────────────────
 * This is the only point at which a customer is asked for money AFTER
 * they have already paid for a booking. A post-booking charge that is
 * not itemised, not optional, and not time-bounded is the thing people
 * mean when they say an app charged them twice. So:
 *
 *   - every line, with its quantity and its price, before consent
 *   - the total they will pay, stated once, as the only figure
 *   - anything already covered by the price they paid, shown as
 *     already covered and NOT added again
 *   - an expiry, because material prices move and a week-old quote is
 *     not a price
 *   - Decline is a real, equal choice, not a grey link
 *
 * Approval is not payment. approve_procurement_quote only marks it
 * approved; the money goes through api/create-materials-payment and is
 * not recorded until the webhook writes the ledger row.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, Check, Clock, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { payMaterials } from '../../lib/payLines'
import { rupees } from '../../lib/tierPackages'
import { useAuth } from '../../context/AuthContext'
import { useToast, friendlyError } from '../../context/ToastContext'
import { configFor } from '../../data/trades'

const hoursLeft = iso => Math.max(0, Math.round((new Date(iso) - Date.now()) / 3600000))

export default function MaterialsApproval() {
  const { quoteId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState(undefined)
  const [busy, setBusy] = useState(false)

  const read = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_procurement_quote', { p_quote_id: quoteId })
    if (error) { setQ(null); return }
    setQ(data ?? null)
  }, [quoteId])

  useEffect(() => { read() }, [read])

  if (q === undefined) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-plum-600" /></div>
  }
  if (!q) {
    return <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <p className="text-[15px] font-extrabold text-ink">This list is not available</p>
      <p className="mt-1 text-[13px] text-ink/60">It may have been withdrawn, or it belongs to someone else.</p>
    </div>
  }

  const trade = configFor(q.trade_id)
  const expired = q.expires_at && new Date(q.expires_at) < new Date()
  const open = q.status === 'sent' && !expired

  const approveAndPay = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('approve_procurement_quote', { p_quote_id: q.id })
    if (error) { setBusy(false); return toast.error(friendlyError(error)) }

    const r = await payMaterials({ quoteId: q.id })
    setBusy(false)
    if (!r.ok && !r.dismissed) { await read(); return toast.error(r.error ?? 'Could not open the payment') }

    /* A closed sheet is not a payment. The webhook is the only witness,
       so this re-reads rather than congratulating anybody. */
    toast.success('Confirming your payment…')
    setTimeout(read, 2500)
  }

  const decline = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('decline_procurement_quote', {
      p_quote_id: q.id, p_reason: 'Declined by customer',
    })
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    toast.success('Declined. Your partner can send an updated list.')
    read()
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-ink/70">
        <ArrowLeft size={20} />
      </button>

      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">
        {trade?.name ?? q.trade_id}
      </p>
      <h1 className="mt-1 text-[22px] font-extrabold leading-tight text-ink">
        Materials for your event
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-snug text-ink/60">
        Your partner needs these bought for the day. Here is exactly what, and
        exactly what it costs.
      </p>

      {open && q.expires_at && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-50 px-3 py-1.5 text-[12px] font-extrabold text-saffron-900 ring-1 ring-saffron-200">
          <Clock size={13} /> Prices held for {hoursLeft(q.expires_at)} more hours
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.07]">
        <p className="flex items-center gap-1.5 border-b border-ink/[0.06] px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink/45">
          <Package size={13} /> What will be bought
        </p>
        <ul className="divide-y divide-ink/[0.05] px-4">
          {(q.items ?? []).map((i, k) => (
            <li key={k} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-ink">{i.name}</p>
                <p className="text-[11.5px] text-ink/50">
                  {Number(i.qty)} {i.unit} × {rupees(i.unit_cost_paise)}
                </p>
              </div>
              <p className="shrink-0 text-[13.5px] font-extrabold text-ink">{rupees(i.amount_paise)}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5 border-t border-ink/[0.06] px-4 py-3">
          <div className="flex justify-between text-[13px] font-semibold text-ink/70">
            <span>Materials</span><span>{rupees(q.subtotal_paise)}</span>
          </div>
          {q.platform_handling_paise > 0 && (
            <div className="flex justify-between text-[13px] font-semibold text-ink/70">
              <span>Handling</span><span>{rupees(q.platform_handling_paise)}</span>
            </div>
          )}
          {q.tax_paise > 0 && (
            <div className="flex justify-between text-[13px] font-semibold text-ink/70">
              <span>Tax</span><span>{rupees(q.tax_paise)}</span>
            </div>
          )}
          {q.already_included_paise > 0 && (
            /* Shown so nobody wonders whether they are paying twice, and
               deliberately NOT added into the total. */
            <div className="flex justify-between text-[13px] font-semibold text-forest-700">
              <span>Already covered by your booking</span>
              <span>−{rupees(q.already_included_paise)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-ink/[0.06] pt-2 text-[16px] font-extrabold text-ink">
            <span>You pay now</span><span>{rupees(q.total_paise)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-ink/55">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest-600" />
        This money is held for these materials. Anything not spent comes back to you.
      </p>

      {open ? (
        <div className="mt-5 space-y-2">
          <button type="button" onClick={approveAndPay} disabled={busy}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15.5px] font-extrabold text-white disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={17} />}
            Approve and pay {rupees(q.total_paise)}
          </button>
          <button type="button" onClick={decline} disabled={busy}
            className="h-[48px] w-full rounded-full text-[14px] font-extrabold text-ink/65 ring-1 ring-ink/10">
            Not now
          </button>
        </div>
      ) : (
        <p className="mt-5 rounded-[18px] bg-ink/[0.03] px-4 py-3 text-center text-[13px] font-bold text-ink/60">
          {q.status === 'funded' || q.status === 'settled' ? 'Paid — thank you.'
            : q.status === 'approved' ? 'Approved. Finishing the payment…'
            : q.status === 'declined' ? 'You declined this list.'
            : expired ? 'This list expired. Your partner can send an updated one.'
            : `This list is ${q.status}.`}
        </p>
      )}
    </div>
  )
}
