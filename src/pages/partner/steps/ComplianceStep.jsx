import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, Upload, ShieldCheck, Info } from 'lucide-react'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { requirementsFor, MANDATORY_FROM } from '../../../data/compliance'
import { KIND_BY_ID } from '../../../lib/partnerDocuments'

/**
 * Step 4 · only what this partner's trades actually require.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A PHOTOGRAPHER IS NEVER ASKED ABOUT FOOD
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every partner used to see the same four rows — Aadhaar, PAN, GST,
 * shop licence — which is two failures at once: the document that
 * matters most for a caterer was missing, and three of the four on
 * screen were rows to scroll past.
 *
 * The list is computed from the trades saved in step 1. A requirement
 * that does not apply is not rendered at all, rather than rendered and
 * marked N/A, because a row somebody cannot satisfy still reads as work
 * they have to do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REQUIRED, OPTIONAL AND "NOT YET" ARE THREE DIFFERENT THINGS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `MANDATORY_FROM` is unset, so nothing blocks anybody today. That is a
 * launch decision, not a statement about the law, and the screen says so
 * in those words — calling a food licence "optional" because the app
 * does not currently enforce it would be the app lying on a subject
 * where lying is expensive.
 *
 * Which is also why finishing this step takes a deliberate tap: with
 * nothing required, it would otherwise complete itself for a partner who
 * never read it.
 */
const STATUS_TONE = {
  verified: 'bg-forest-50 text-forest-700 ring-forest-200',
  uploaded: 'bg-amber-50 text-amber-800 ring-amber-200',
  none: 'bg-ink/[0.04] text-ink-mute ring-ink/[0.08]',
}

export default function ComplianceStep() {
  const navigate = useNavigate()
  const { loading, account, markStepComplete } = usePartnerOnboarding()
  const [busy, setBusy] = useState(false)

  const trades = useMemo(() => (account.listings ?? []).map(l => l.trade), [account.listings])
  const reqs = useMemo(() => requirementsFor(trades), [trades])
  const docs = account.documents ?? {}

  /* Three short sections rather than one long list: who you are, your
     business, and the trade-specific ones that are the whole reason
     this screen is dynamic. */
  const groups = useMemo(() => {
    const g = { identity: [], business: [], trade: [] }
    for (const r of reqs) {
      if (r.id.startsWith('VER-ID')) g.identity.push(r)
      else if (r.trade) g.trade.push(r)
      else g.business.push(r)
    }
    return g
  }, [reqs])

  async function finish() {
    setBusy(true)
    try {
      await markStepComplete('compliance')
      navigate('/partner/setup/bank')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="native-screen flex items-center justify-center bg-white">
        <Loader2 size={26} className="animate-spin text-plum-600" />
      </div>
    )
  }

  const requiredCount = reqs.filter(r => r.required).length
  const satisfied = reqs.filter(r => r.required && docs[r.documentKind]).length
  const tradeNames = [...new Set(groups.trade.map(r => r.trade))].join(' and ')

  return (
    <StepShell
      stepId="compliance"
      cta="Save & continue"
      canContinue={requiredCount === satisfied}
      busy={busy}
      onContinue={finish}
      subProgress={`${reqs.length} requirement${reqs.length === 1 ? '' : 's'} apply to your services`}
    >
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Verify what applies to you
      </h1>
      <p className="mb-5 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        We&apos;ve selected these from the services you added — nothing here is asked
        of every partner.
      </p>

      {!MANDATORY_FROM && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-plum-50 px-3.5 py-3 text-[12.5px] leading-snug text-plum-900 ring-1 ring-plum-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Uploading is not being enforced yet, so you can continue without it.
            Anything marked <strong>Required</strong> will be needed before you can
            take jobs — adding it now means you are checked sooner.
          </span>
        </p>
      )}

      {!trades.length && (
        <p className="rounded-2xl bg-amber-50 px-3.5 py-3 text-[12.5px] font-semibold leading-snug text-amber-900">
          Add a service in step 1 first — what you need to verify depends on what
          you do.
        </p>
      )}

      <Section title="Identity" items={groups.identity} docs={docs} />
      <Section title="Your business" items={groups.business} docs={docs} />
      {!!groups.trade.length && (
        <Section title={`For ${tradeNames}`} items={groups.trade} docs={docs} />
      )}
    </StepShell>
  )
}

function Section({ title, items, docs }) {
  if (!items.length) return null
  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map(r => {
          const have = docs[r.documentKind]
          const state = have?.verified_at ? 'verified' : have ? 'uploaded' : 'none'
          return (
            <li
              key={r.id}
              data-requirement={r.id}
              data-state={state}
              className="rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${STATUS_TONE[state]}`}>
                  {state === 'verified' ? <Check size={15} strokeWidth={3} />
                    : state === 'uploaded' ? <ShieldCheck size={15} />
                    : <Upload size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-extrabold leading-tight text-ink">
                    {r.label}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      r.required ? 'bg-rose-50 text-rose-700' : 'bg-ink/[0.05] text-ink-mute'
                    }`}>
                      {r.required ? 'Required' : 'Optional'}
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-ink-mute">{r.hint}</p>
                  {r.why && (
                    <p className="mt-1 text-[11.5px] italic leading-snug text-ink-mute">{r.why}</p>
                  )}
                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                    {state === 'verified' ? 'Verified'
                      : state === 'uploaded' ? 'Sent — being checked'
                      : `Not started · ${KIND_BY_ID[r.documentKind]?.label ?? 'document'}`}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
