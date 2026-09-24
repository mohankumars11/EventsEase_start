import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, Upload, ShieldCheck, Info, TriangleAlert } from 'lucide-react'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { requirementsFor } from '../../../data/compliance'
import { evaluateAll } from '../../../lib/verification/satisfaction'
import { fetchVerificationPolicy } from '../../../lib/verificationPolicy'
import DocumentCapture from '../../../components/partner/DocumentCapture'
import IdentityChoice from '../../../components/partner/IdentityChoice'
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
  verified:   'bg-forest-50 text-forest-700 ring-forest-200',
  checked:    'bg-plum-50 text-plum-700 ring-plum-200',
  pending:    'bg-amber-50 text-amber-800 ring-amber-200',
  incomplete: 'bg-amber-50 text-amber-800 ring-amber-200',
  rejected:   'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  expired:    'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  none:       'bg-ink/[0.04] text-ink-mute ring-ink/[0.08]',
}

/**
 * What a document row is actually saying, from the columns that exist.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE DIFFERENT CLAIMS, AND THEY ARE NOT INTERCHANGEABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   checked    the NUMBER's own check digit agrees with the rest of it
 *              (`checksum_ok`, migration 142). Offline arithmetic. It
 *              catches typos and invented numbers and proves nothing
 *              about a person.
 *   verified   an operator accepted the document (`status`, 093), or a
 *              licensed provider confirmed it (`provider_status`, 142).
 *   uploaded   it is sitting in the queue.
 *
 * Collapsing these into one green tick is how a marketplace ends up
 * telling a customer that somebody was verified when a checksum passed.
 * The captions below say which one happened.
 */
function rowState(verdict, doc) {
  if (!verdict) return doc ? 'pending' : 'none'
  /* evaluateAll already decided none / incomplete / expired / rejected /
     pending / verified. The only refinement here is cosmetic: a pending
     document whose NUMBER checked out gets its own word, because
     "checks out" and "verified" are different claims and the partner
     should be able to see which one they have. */
  if (verdict.state === 'pending' && doc?.checksum_ok) return 'checked'
  return verdict.state
}

const STATE_CAPTION = {
  verified:   'Verified',
  checked:    'Number checks out — document still being read',
  pending:    'Sent — being checked',
  rejected:   'Sent back — please upload it again',
  expired:    'Expired — upload a current one',
}

export default function ComplianceStep() {
  const navigate = useNavigate()
  const { loading, account, markStepComplete, updateVendor, refresh } = usePartnerOnboarding()
  const [busy, setBusy] = useState(false)
  /* One open at a time. A screen with nine expanded upload forms is a
     screen nobody finishes; a requirement opens when it is tapped. */
  const [openId, setOpenId] = useState(null)

  /* The rulebook, read once. Null until it arrives and null for ever if
     146 was never pasted -- which the engine reads as "nothing is
     mandatory", i.e. exactly today's behaviour. See the header of
     lib/verificationPolicy.js for why that is the safe direction. */
  const [policy, setPolicy] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetchVerificationPolicy()
      .then(r => { if (!cancelled) setPolicy(r.policy) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const trades = useMemo(() => (account.listings ?? []).map(l => l.trade), [account.listings])
  /* ── Which ID this partner chose ───────────────────────────────────
     Persisted on the vendor row (152) rather than held in state: the
     chooser has to survive a reload, a second device and the operator
     queue, or a partner who uploaded a passport is asked for an Aadhaar
     card again on their next sign-in. NULL means the default. */
  const identityChoice = account.vendor?.identity_document ?? null
  const answers = useMemo(
    () => ({ identity_document: identityChoice }), [identityChoice])
  const reqs = useMemo(
    () => requirementsFor({ trades, policy, answers }), [trades, policy, answers])
  /* Keyed by requirement, not by kind. `evaluateAll` decides whether
     each one is actually satisfied — two sides where declared, a
     number, a holder name, an expiry that has not passed — rather than
     the old test of "is there a row under this kind", which let one
     food licence satisfy a venue authorisation. */
  const byRequirement = account.documents?.byRequirement ?? {}
  const evaluated = useMemo(
    () => evaluateAll(reqs, byRequirement), [reqs, byRequirement])
  const docs = evaluated.results

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

  /* The requirement that carries the chooser, and whether anything has
     been filed under it yet. A stored row pins the type: swapping it
     would leave a photograph of a passport filed as an Aadhaar card. */
  const identityReq = reqs.find(r => r.id === 'VER-ID-IDENTITY') ?? null
  const identityUploaded = !!byRequirement['VER-ID-IDENTITY']

  const requiredCount = evaluated.requiredTotal
  const satisfied = evaluated.requiredSatisfied
  const tradeNames = [...new Set(groups.trade.map(r => r.trade))].join(' and ')

  const shared = {
    docs,
    openId,
    onOpen: id => setOpenId(cur => (cur === id ? null : id)),
    vendorId: account.vendor?.id,
    onUploaded: refresh,
    /* 143 added `listing_id` and nothing has ever populated it, so every
       document filed from this screen was unattributable to the trade it
       was uploaded for. The requirement already knows its trade; this
       maps it back to the listing row. */
    listingFor: trade =>
      (account.listings ?? []).find(l => l.trade === trade)?.id ?? null,
    /* The identity document the selfie is compared against. Null until
       one has been uploaded, which is the correct order: there is
       nothing to compare a face to before the ID exists, and the selfie
       requirement says so rather than failing silently. */
    identityDoc: byRequirement['VER-ID-IDENTITY'] ?? null,
  }

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

      {/* What is true right now, rather than what a constant says.
          `requiredCount` counts the requirements the policy table
          actually marks mandatory for THESE trades, so the banner
          changes on the day a rule comes into force without anybody
          editing this file. */}
      <p className="mb-5 flex items-start gap-2 rounded-2xl bg-plum-50 px-3.5 py-3 text-[12.5px] leading-snug text-plum-900 ring-1 ring-plum-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        {requiredCount === 0 ? (
          <span>
            Nothing here is being enforced yet, so you can continue without it.
            Adding what you have now means you are checked sooner — and some of
            these become necessary before you can take jobs.
          </span>
        ) : (
          <span>
            {requiredCount === 1 ? 'One of these is' : `${requiredCount} of these are`}{' '}
            <strong>needed before you can take jobs</strong>. The rest help us check
            you sooner. You can come back to any of them.
          </span>
        )}
      </p>

      {!trades.length && (
        <p className="rounded-2xl bg-amber-50 px-3.5 py-3 text-[12.5px] font-semibold leading-snug text-amber-900">
          Add a service in step 1 first — what you need to verify depends on what
          you do.
        </p>
      )}

      {/* Above the Identity section rather than inside it: the choice
          decides WHICH row is rendered below, so a partner meeting it
          after the Aadhaar row has already appeared has been asked for
          the wrong document first. */}
      <IdentityChoice
        value={identityChoice}
        options={identityReq?.acceptsTypes ?? []}
        locked={!!identityUploaded}
        onChange={async kind => {
          await updateVendor({ identity_document: kind })
          await refresh()
        }}
      />

      <Section title="Identity" items={groups.identity} {...shared} />
      <Section title="Your business" items={groups.business} {...shared} />
      {!!groups.trade.length && (
        <Section title={`For ${tradeNames}`} items={groups.trade} {...shared} />
      )}
    </StepShell>
  )
}

function Section({ title, items, docs, openId, onOpen, vendorId, onUploaded, listingFor, identityDoc }) {
  if (!items.length) return null
  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map(r => {
          const verdict = docs[r.id]
          const have = verdict?.row ?? null
          /* ── `verified_at` does not exist on vendor_documents ───────
             This read was `have?.verified_at`, a column 093 never
             created and 142 never added. It was always undefined, so
             the 'verified' branch below — its tick, its tone and its
             caption — was unreachable, and a document an operator had
             accepted months ago still read "Sent — being checked".

             The real columns are `status` (093: pending | accepted |
             rejected, written by an operator) and `provider_status`
             (142: not_checked | pending | verified | …, written by a
             verification provider). Both are consulted, and they are
             NOT the same claim — see `rowState`. */
          const state = rowState(verdict, have)
          const open = openId === r.id
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
                    : state === 'rejected' || state === 'expired' ? <TriangleAlert size={15} />
                    : state === 'checked' || state === 'pending' ? <ShieldCheck size={15} />
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
                    {STATE_CAPTION[state]
                      ?? `Not started · ${KIND_BY_ID[r.documentKind]?.label ?? 'document'}`}
                  </p>
                  {/* An unfinished document is not a failed one, and the
                      difference is whether the partner is told what is
                      still missing. "Still needs the back, the expiry
                      date" is a task; a red cross is a dead end. */}
                  {verdict?.says && (
                    <p className="mt-1 text-[11.5px] leading-snug text-saffron-800">
                      {verdict.says}
                    </p>
                  )}

                  {/* The control this screen never had. Until now it
                      rendered state only, and the upload lived on a
                      different screen entirely -- so a partner read
                      "Not started" with nothing to tap. */}
                  <button
                    type="button"
                    onClick={() => onOpen?.(r.id)}
                    className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 text-[12px] font-extrabold text-ink-soft"
                  >
                    {open ? 'Close' : state === 'none' ? 'Add it' : 'Update'}
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-3">
                  <DocumentCapture
                    requirement={r}
                    verdict={verdict}
                    vendorId={vendorId}
                    listingId={listingFor?.(r.trade) ?? null}
                    compareWith={r.needsConsent ? identityDoc : null}
                    onUploaded={onUploaded}
                    onClose={() => onOpen?.(r.id)}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
