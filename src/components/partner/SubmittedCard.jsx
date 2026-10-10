import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { CheckCircle2, X, ArrowRight, Plus, Landmark } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { pendingTrades } from '../../lib/tradeQueue'
import { usePayoutStatus, ACCOUNT_LINKS } from '../vendor/anchor/stages/PayoutReviewStages'
import RazorpayBadge from './payout/RazorpayBadge'
import { onboardPath } from '../../lib/tradeRoutes'

/**
 * The confirmation a partner lands on after submitting a service.
 *
 * Rendered on the Jobs tab when the URL carries ?submitted=<trade>
 * (&version=<listing version id>), which VendorServiceList sets only after
 * the server accepted the submission. The status shown is read back from
 * sambramo_listing_versions — the server's answer, not the screen's hope.
 *
 * If payouts are not active it says so plainly: the listing can be
 * reviewed and approved, but Instant Book & Pay stays off until Razorpay
 * activates the payout account.
 */
const VERSION_TEXT = {
  UNDER_REVIEW: 'Under review',
  LIVE: 'Live',
  ACTION_REQUIRED: 'Changes requested',
  REJECTED: 'Not approved',
  DRAFT: 'Draft',
}

export default function SubmittedCard({ vendorId, services = [] }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const trade = params.get('submitted')
  const versionId = params.get('version')
  const [version, setVersion] = useState(null)
  const payout = usePayoutStatus(trade !== null ? vendorId : null)

  useEffect(() => {
    if (!versionId) return
    supabase.from('sambramo_listing_versions').select('status, vendor_service_id').eq('id', versionId).maybeSingle()
      .then(({ data }) => setVersion(data ?? null))
  }, [versionId])

  if (trade === null) return null
  const service = services.find(s => s.id === version?.vendor_service_id)
  const name = service?.category ?? trade
  const have = new Set(services.map(s => s.category))
  const next = pendingTrades().find(t => t !== name && !have.has(t)) ?? null
  const dismiss = () => setParams(prev => {
    const q = new URLSearchParams(prev); q.delete('submitted'); q.delete('version'); return q
  }, { replace: true })

  return (
    <motion.div data-testid="submitted-card" data-status={version?.status ?? ''}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative mb-4 overflow-hidden rounded-[24px] bg-white p-4 ring-1 ring-forest-200 shadow-[0_12px_30px_rgba(21,128,61,0.10)]">
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink/40"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-600 text-white"><CheckCircle2 size={22} /></span>
        <div className="min-w-0">
          <p className="text-[15.5px] font-extrabold leading-tight text-ink">Your service has been submitted for review.</p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink/60">Your listing is now under review. You can track its status in the app.</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-ink/70">
            {name}
            {version?.status && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-800 ring-1 ring-amber-200">{VERSION_TEXT[version.status] ?? version.status}</span>}
          </p>
        </div>
      </div>

      {!payout.loading && !payout.active && (
        <div data-testid="submitted-payout" className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-amber-900"><Landmark size={14} /> Payout setup is incomplete</p>
          <p className="mt-1 text-[12px] leading-snug text-amber-900/80">
            Customers can still send you requests. Instant Book &amp; Pay switches on only after approval and once Razorpay activates your payouts.
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => navigate(ACCOUNT_LINKS.payouts)} className="rounded-full bg-amber-900 px-3.5 py-1.5 text-[12px] font-extrabold text-white">Open Payouts</button>
            <RazorpayBadge label="Secured by" />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {next && (
          <button type="button" data-cta="continue-next" onClick={() => navigate(onboardPath(next))}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[13.5px] font-extrabold text-white">
            Continue Setting Up Another Service · {next} <ArrowRight size={15} />
          </button>
        )}
        <button type="button" data-cta="add-another" onClick={() => navigate('/partner/services')}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-extrabold text-plum-700 ring-1 ring-plum-200">
          <Plus size={15} /> Add Another Service
        </button>
      </div>
    </motion.div>
  )
}
