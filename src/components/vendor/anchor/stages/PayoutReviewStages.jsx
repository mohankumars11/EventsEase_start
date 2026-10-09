/**
 * Stage 10 · Verification & payout, and Stage 11 · Review & publish.
 *
 * Payout is shown, not collected here: identity goes through the existing
 * Compliance step and bank details through the existing Bank step (and
 * Razorpay). A partner can submit pricing before payouts are active; they
 * just cannot be booked instantly until they are, and stage 11 says so.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Landmark, ChevronRight, Sparkles } from 'lucide-react'
import { Card, SectionTitle } from '../ui'
import ReadinessChecklist from '../../pricing/ReadinessChecklist'
import { supabase } from '../../../../lib/supabase'
import { rupees } from '../../../../lib/tierPackages'

export function usePayoutStatus(vendorId) {
  const [s, setS] = useState({ loading: true })
  useEffect(() => {
    if (!vendorId) { setS({ loading: false }); return }
    let alive = true
    Promise.all([
      supabase.from('vendor_payout_details').select('method, verified_at').eq('vendor_id', vendorId).maybeSingle(),
      supabase.from('partner_payout_accounts').select('route_account_id').eq('vendor_id', vendorId).maybeSingle(),
      supabase.from('vendors').select('is_verified').eq('id', vendorId).maybeSingle(),
    ]).then(([d, a, v]) => {
      if (!alive) return
      setS({ loading: false, details: d.data, route: a.data?.route_account_id ?? null, verified: !!v.data?.is_verified })
    })
    return () => { alive = false }
  }, [vendorId])
  return s
}

export function PayoutStage({ status, onOpenPayout }) {
  const navigate = useNavigate()
  const rows = [
    { icon: ShieldCheck, label: 'Identity verification', ok: status.verified, pending: !status.verified,
      note: status.verified ? 'Verified' : 'Complete it in Compliance', go: () => navigate('/partner/setup/compliance') },
    { icon: Landmark, label: 'Bank or UPI details', ok: !!status.details, note: status.details ? (status.details.verified_at ? 'Verified' : 'Saved, being checked') : 'Not added yet',
      go: () => navigate('/partner/setup/bank') },
    { icon: Sparkles, label: 'Razorpay payout account', ok: !!status.route, note: status.route ? 'Active' : 'Set up after your bank details are verified', go: onOpenPayout },
  ]
  return (
    <>
      <SectionTitle title="Verification & payout" sub="So customers can pay you instantly, and Razorpay can pay you out." />
      <Card className="!p-0 overflow-hidden">
        {rows.map(r => (
          <button key={r.label} type="button" onClick={r.go} className="flex w-full items-center gap-3 border-b border-ink/[0.05] px-4 py-3.5 text-left last:border-0">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${r.ok ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-700'}`}><r.icon size={18} /></span>
            <span className="flex-1"><span className="block text-[13.5px] font-extrabold text-ink">{r.label}</span>
              <span className={`block text-[11.5px] font-bold ${r.ok ? 'text-forest-700' : 'text-amber-700'}`}>{r.note}</span></span>
            <ChevronRight size={17} className="text-ink/30" />
          </button>
        ))}
      </Card>
      <p className="mt-3 px-1 text-[12px] leading-snug text-ink/50">You can submit your listing now. Instant Book & Pay switches on once payouts are active.</p>
    </>
  )
}

export function ReviewStage({ items, state, quotesOk, tiers, name, langs }) {
  return (
    <>
      <SectionTitle title="Review & publish" sub="Submit for review. Your profile goes live once Sambramo approves it." />
      <ReadinessChecklist state={state} items={items} quotesOk={quotesOk} />
      <div className="mt-3 rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-200"><Sparkles size={14} /> Ready to submit</p>
        <p className="mt-2 text-[18px] font-extrabold">{name || 'Your profile'}</p>
        <p className="text-[12.5px] text-plum-100">{langs || 'No languages yet'}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {tiers.map(p => (
            <div key={p.tier} className="rounded-xl bg-white/10 p-2 text-center">
              <p className="text-[10px] font-extrabold uppercase text-plum-200">{p.name}</p>
              <p className="text-[13.5px] font-extrabold">{rupees(p.price_paise)}</p>
              <p className="text-[10.5px] text-plum-200">{p.duration_hours} hrs</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
