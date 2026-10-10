/**
 * Stage 10 · Identity Verification & Bank Details, and Stage 11 · Review & publish.
 *
 * Stage 10 is the real form, inline, in every trade's onboarding (Anchor &
 * MC, Catering & Food and the shared engine flow all render PayoutStage):
 *
 *   Step 1  identity     the existing verification system — IdentityChoice,
 *                        the provider-gated Aadhaar flow, private uploads
 *                        (components/partner/identity/IdentityPanel)
 *   Step 2  PAN          the PAN number + the PAN card requirement
 *   Step 3  bank         searchable bank list, Razorpay IFSC lookup, account
 *                        typed twice, consent
 *   Step 4  UPI          optional, alongside the bank account
 *   Step 5  status       read back from the backend: vendor_documents,
 *                        vendor_payout_details.verified_at, and the Razorpay
 *                        Route status the server fetched
 *
 * Saving the bank details starts payout activation through the existing
 * Route setup (POST /api/anchor?op=route-setup) behind the scenes — no
 * Razorpay login, no trip to More. Identity and payout belong to the
 * ACCOUNT, so a partner's next trade opens this step with everything
 * already filed and its real state. A listing can still be submitted while
 * verification is pending; Instant Book & Pay stays off until Razorpay
 * reports the payout account activated (server rule, migration 20261010_15).
 */
import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Landmark, Sparkles, RefreshCw, Check, Clock3, AlertTriangle, ChevronDown, CreditCard, Smartphone } from 'lucide-react'
import { SectionTitle } from '../ui'
import ReadinessChecklist from '../../pricing/ReadinessChecklist'
import RazorpayBadge from '../../../partner/payout/RazorpayBadge'
import PayoutOnboardingForm from '../../bank/PayoutOnboardingForm'
import { useIdentityRequirements, IdentitySection, PanDocumentSection, STATE_LABEL } from '../../../partner/identity/IdentityPanel'
import { supabase } from '../../../../lib/supabase'
import { rupees } from '../../../../lib/tierPackages'
import { destinationShort } from '../../../../lib/documents/mask'
import { routeSetup } from '../../../../lib/payoutRoute'
import { identityStatus, payoutStatus, PAYOUT } from '../../../../lib/partnerAccountStatus'
import { normalise } from '../../../../lib/validation/fieldRules'
import { useFieldCheck, FieldMessage } from '../../../partner/FieldCheck'

/** Where each shared thing is managed outside onboarding (Jobs card, selector). */
export const ACCOUNT_LINKS = {
  identity: '/dashboard/vendor?tab=account&screen=verification',
  bank: '/dashboard/vendor?tab=account&screen=bank',
  payouts: '/partner/payouts',
}

export function usePayoutStatus(vendorId) {
  const [s, setS] = useState({ loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!vendorId) { setS({ loading: false, identity: 'not_started', payout: PAYOUT.NOT_STARTED, active: false }); return }
    let alive = true
    Promise.all([
      supabase.from('vendor_payout_details').select('method, upi_id, account_number, pan, verified_at').eq('vendor_id', vendorId).maybeSingle(),
      supabase.from('partner_payout_accounts').select('route_account_id, route_status').eq('vendor_id', vendorId).maybeSingle(),
      supabase.from('vendors').select('is_verified').eq('id', vendorId).maybeSingle(),
      supabase.from('vendor_documents').select('requirement_id, status').eq('vendor_id', vendorId),
    ]).then(([d, a, v, docs]) => {
      if (!alive) return
      const byReq = Object.fromEntries((docs.data ?? []).map(r => [r.requirement_id, r.status]))
      const payout = payoutStatus(d.data, a.data)
      setS({
        loading: false, details: d.data, account: a.data, verified: !!v.data?.is_verified,
        identity: identityStatus(v.data, byReq), payout, active: payout === PAYOUT.ACTIVE,
        destination: d.data ? destinationShort(d.data) : null,
      })
    })
    return () => { alive = false }
  }, [vendorId, tick])
  const reload = useCallback(() => setTick(t => t + 1), [])
  return { ...s, reload }
}

const ACTIVATION_TEXT = {
  [PAYOUT.ACTIVE]: ['Active', 'good'],
  [PAYOUT.ACTIVATION_PENDING]: ['Pending provider confirmation', 'wait'],
  [PAYOUT.ACTION_REQUIRED]: ['Action required — Razorpay needs more details', 'act'],
  [PAYOUT.RESTRICTED]: ['Restricted — contact Sambramo support', 'act'],
}
const STEP_HINT = {
  bank: 'Razorpay pays out to a bank account — add one above.',
  pan: 'Add your PAN above to start payout activation.',
  contact: 'Add your email and 10-digit phone number to your profile to start payout activation.',
  location: 'Confirm your business location to start payout activation.',
}
const TONE = { good: 'bg-forest-50 text-forest-700', wait: 'bg-amber-50 text-amber-800', act: 'bg-rose-50 text-rose-700', none: 'bg-ink/[0.05] text-ink-mute' }

export function PayoutStage({ status, vendorId }) {
  const idr = useIdentityRequirements(vendorId)
  const [activation, setActivation] = useState(null)   // { ok, body } from the Route setup
  const [busy, setBusy] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const idState = status.verified ? 'verified' : idr.stateOf('VER-ID-IDENTITY')
  const identityDone = idState === 'verified'

  /* Saved bank + PAN → continue Razorpay activation on the server. */
  async function activate(row) {
    if (!row || row.method !== 'bank' || !row.pan) { status.reload?.(); return }
    setBusy(true)
    setActivation(await routeSetup('setup'))
    setBusy(false)
    status.reload?.()
  }
  async function refreshAll() {
    setBusy(true)
    await idr.refresh()
    if (status.account?.route_account_id) setActivation(await routeSetup('status'))
    setBusy(false)
    status.reload?.()
  }

  const d = status.details
  const panState = idr.pan.length ? idr.stateOf('VER-TAX-PAN') : 'none'
  const rows = [
    { key: 'identity', I: ShieldCheck, label: 'Identity verification', text: STATE_LABEL[idState] ?? 'Not started',
      tone: idState === 'verified' ? 'good' : ['rejected', 'expired', 'incomplete'].includes(idState) ? 'act' : idState === 'none' ? 'none' : 'wait' },
    { key: 'pan', I: CreditCard, label: 'PAN details',
      text: panState === 'verified' ? 'Verified' : panState !== 'none' ? STATE_LABEL[panState] : d?.pan ? 'Saved — checked when payouts are activated' : 'Not added',
      tone: panState === 'verified' ? 'good' : d?.pan || panState !== 'none' ? 'wait' : 'none' },
    { key: 'bank', I: Landmark, label: 'Bank account',
      text: !d?.account_number ? 'Not added' : d.verified_at ? 'Verified' : 'Details saved — verification pending',
      tone: !d?.account_number ? 'none' : d.verified_at ? 'good' : 'wait' },
    { key: 'upi', I: Smartphone, label: 'UPI', text: d?.upi_id ? 'Saved — not verified' : 'Not added', tone: d?.upi_id ? 'wait' : 'none' },
    { key: 'activation', I: Sparkles, label: 'Payout activation',
      text: ACTIVATION_TEXT[status.payout]?.[0] ?? (activation && !activation.ok ? (STEP_HINT[activation.body?.step] ?? activation.body?.error ?? 'Not started') : 'Not started'),
      tone: ACTIVATION_TEXT[status.payout]?.[1] ?? (activation && !activation.ok ? 'act' : 'none') },
  ]

  return (
    <>
      <SectionTitle title="Identity Verification & Bank Details"
        sub="Verify your identity and add where you want to receive your Sambramo earnings. You only need to complete shared account details once." />

      <section data-section="step-identity" className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Step 1</p>
        <div className="flex items-start justify-between gap-2">
          <h2 className="mt-0.5 text-[16px] font-extrabold text-ink">Verify your identity</h2>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${TONE[rows[0].tone]}`}>{rows[0].text}</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-ink/60">We need to verify who you are before completing your payout setup.</p>
        {identityDone && !showIdentity ? (
          <button type="button" onClick={() => setShowIdentity(true)} className="mt-3 flex items-center gap-1 text-[12.5px] font-extrabold text-plum-700">
            <Check size={14} /> Verified — show details <ChevronDown size={14} />
          </button>
        ) : (
          <div className="mt-3">{idr.loading ? <p className="text-[12.5px] text-ink-mute">Loading your verification…</p> : <IdentitySection idr={idr} vendorId={vendorId} />}</div>
        )}
      </section>

      <PayoutOnboardingForm
        vendorId={vendorId}
        onSaved={activate}
        panExtra={idr.pan.length ? <PanDocumentSection idr={idr} vendorId={vendorId} /> : null}
        identityNote={!identityDone && (
          <p data-testid="identity-pending-note" className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-amber-900">
            <Clock3 size={14} className="mt-0.5 shrink-0" />
            Your identity verification is still in progress. You can save your bank details now — payout activation continues when the required verification is complete.
          </p>
        )}
      />

      <section data-section="step-status" className="mt-5 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Step 5</p>
        <div className="flex items-center justify-between gap-2">
          <h2 className="mt-0.5 text-[16px] font-extrabold text-ink">Verification and payout status</h2>
          <button type="button" onClick={refreshAll} disabled={busy} aria-label="Refresh status"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-plum-50 text-plum-700"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /></button>
        </div>
        <ul className="mt-2 divide-y divide-ink/[0.05]">
          {rows.map(r => (
            <li key={r.key} data-status={r.key} data-tone={r.tone} className="flex items-center gap-3 py-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[r.tone]}`}><r.I size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-ink">{r.label}</span>
                <span className="block text-[12px] font-semibold text-ink/60">{r.text}</span>
              </span>
              {r.tone === 'act' && <AlertTriangle size={15} className="shrink-0 text-rose-600" />}
            </li>
          ))}
        </ul>
        {activation?.body?.step === 'contact' && <ContactFix onSaved={() => activate({ ...status.details, method: status.details?.method, pan: status.details?.pan })} />}
        <RazorpayBadge className="mt-2" />
      </section>

      <p className="mt-3 px-1 text-[12px] leading-snug text-ink/55">
        {status.active ? 'Payouts are active. Instant Book & Pay switches on once this listing is approved.'
          : 'You can continue and submit this listing for review now. Instant Book & Pay stays off until your identity is verified and Razorpay activates your payouts — customers can still send you requests.'}
      </p>
    </>
  )
}

/* Razorpay needs the partner's mobile number to create the payout account.
   When the server says it is missing (step 'contact'), it is asked for
   here — the same profiles.phone and the same owner_phone rule as More →
   Partner profile — and activation is retried, without leaving the step. */
function ContactFix({ onSaved }) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const check = useFieldCheck('owner_phone', phone, { showAll: !!phone })
  const digits = String(normalise('owner_phone', phone) ?? '').replace(/D/g, '').slice(-10)
  async function save() {
    if (check.isError || digits.length !== 10) { setErr('Enter your 10-digit mobile number.'); return }
    setBusy(true); setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({ phone: normalise('owner_phone', phone) }).eq('id', user?.id)
    setBusy(false)
    if (error) { setErr('Could not save that number. Try again.'); return }
    onSaved?.()
  }
  return (
    <div data-testid="contact-fix" className="mt-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <label className="label" htmlFor="ob-phone">Mobile number for payouts</label>
      <input {...check.inputProps} id="ob-phone" className={'input' + check.ring} inputMode="tel" autoComplete="tel" placeholder="98765 43210"
        value={phone} onChange={e => setPhone(e.target.value)} />
      <FieldMessage check={check} />
      {err && <p className="mt-1 text-[12px] font-bold text-rose-700">{err}</p>}
      <button type="button" data-cta="save-phone" onClick={save} disabled={busy}
        className="mt-2 rounded-full bg-plum-700 px-4 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save number & continue activation'}</button>
    </div>
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
