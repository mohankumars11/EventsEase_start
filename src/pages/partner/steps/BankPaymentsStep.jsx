import { useState } from 'react'
import ValidatedField from '../../../components/partner/ValidatedField'
import { validateField } from '../../../lib/validation/fieldRules'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Check } from 'lucide-react'
import StepShell, { Field, inputClass } from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import { destinationShort } from '../../../lib/documents/mask'

/**
 * Step 5 · where the money goes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE LEAST INFORMATION THAT CAN PAY SOMEBODY
 * ══════════════════════════════════════════════════════════════════════
 *
 * A UPI id, or a name, account number and IFSC. Nothing else is asked
 * because nothing else is needed, and every extra field on a screen
 * about somebody's bank is a reason to close the app.
 *
 * Never collected, at all: a card number, a CVV, a UPI PIN, a net
 * banking password. Sambramo pays money OUT; none of those would ever
 * be used, and a form that asks for them teaches partners to hand them
 * over to whoever asks next.
 *
 * ── It goes to the row, not to the device ──────────────────────────
 * Written straight to `vendor_payout_details`, which is behind RLS and
 * which anon cannot read — verified by check-anon-access. Nothing here
 * touches localStorage, and the existing value comes back masked.
 */
export default function BankPaymentsStep() {
  const navigate = useNavigate()
  const { loading, account, refresh } = usePartnerOnboarding()
  const v = account.vendor
  const existing = account.payout

  const [method, setMethod] = useState('upi')
  const [upi, setUpi] = useState('')
  const [holder, setHolder] = useState('')
  const [number, setNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  /* Errors stay quiet until the partner has tried to move on. Shouting
     at somebody halfway through typing an account number is how a form
     that is technically correct comes to feel hostile. Same behaviour
     as PartnerDetailsStep. */
  const [showAll, setShowAll] = useState(false)

  /* ---- One definition of "valid", not two ------------------------
     These were three regexes written inline, a second opinion sitting
     beside FIELD_RULES and free to disagree with it: the inline IFSC
     test accepted any eleven characters with a zero fifth, while the
     rule also knows a real code's bank prefix cannot be digits. A form
     whose button disagrees with its own error messages is a form that
     blocks somebody who has fixed everything it complained about. */
  const ready = method === 'upi'
    ? validateField('upi_id', upi).ok
    : ['account_name', 'account_number', 'ifsc'].every((f, i) =>
        validateField(f, [holder, number, ifsc][i]).ok)

  async function save() {
    if (!v?.id || busy) return
    /* Everything it has been holding back, said at once, rather than a
       button that will not move and no explanation of why. */
    if (!ready) { setShowAll(true); return }
    setBusy(true); setError(null)
    try {
      /* ── The column is `account_name` ────────────────────────────
         Not `account_holder`, which is what this wrote and what the
         label above the field says. PostgREST answered "Could not find
         the 'account_holder' column ... in the schema cache" and the
         partner saw it on the screen, which is how it was found —
         migration 090 has named it `account_name` since the table was
         created, and PayoutDetails on the More tab had it right all
         along. Two forms writing one table, and only one of them was
         checked against the schema. */
      const row = method === 'upi'
        ? { vendor_id: v.id, method: 'upi', upi_id: upi.trim(),
            account_name: null, account_number: null, ifsc: null }
        : {
            vendor_id: v.id, method: 'bank', upi_id: null,
            account_name: holder.trim(),
            account_number: number.trim(),
            ifsc: ifsc.trim().toUpperCase(),
          }
      const { error: err } = await supabase
        .from('vendor_payout_details').upsert(row, { onConflict: 'vendor_id' })
      if (err) throw err
      await refresh()
      navigate('/partner/setup/review')
    } catch (e) {
      setError(e?.message ?? 'Could not save those details. Check them and try again.')
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

  /* Already added: shown masked, with the option to replace it. Never
     re-displayed in full — there is no screen that needs to. */
  if (existing) {
    const masked = existing.method === 'upi'
      ? existing.upi_id
      : destinationShort(existing)
    return (
      <StepShell stepId="bank" cta="Continue to review" onContinue={() => navigate('/partner/setup/review')}>
        <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
          Bank &amp; payments
        </h1>
        <div className="mt-6 rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200">
          <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-forest-800">
            <Check size={14} /> Payout account added
          </p>
          <p className="mt-2 font-mono text-[15px] font-semibold text-forest-900">{masked}</p>
          <p className="mt-1 text-[12px] text-forest-800">
            {existing.verified_at ? 'Verified' : 'We will confirm it before your first payout.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setMethod(existing.method === 'upi' ? 'bank' : 'upi'); }}
          className="mt-3 text-[12.5px] font-extrabold text-plum-700 underline"
        >
          Use a different account
        </button>
      </StepShell>
    )
  }

  return (
    <StepShell stepId="bank" canContinue busy={busy} onContinue={save}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Bank &amp; payments
      </h1>
      <p className="mb-5 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        Add the account where your Sambramo earnings will be paid.
      </p>

      <div className="mb-5 flex gap-2">
        {[['upi', 'UPI'], ['bank', 'Bank account']].map(([id, label]) => (
          <button
            key={id} type="button" data-method={id}
            onClick={() => setMethod(id)}
            aria-pressed={method === id}
            className={`flex-1 rounded-2xl py-3 text-[13.5px] font-extrabold transition ${
              method === id ? 'bg-plum-600 text-white' : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- Every box here is checked as it is typed ----------------
           These four were plain <input>s while FIELD_RULES already held
           a rule for each of them -- upi_id, account_name,
           account_number and ifsc, all written and all unreachable.
           The money fields were the last place in the six steps where a
           wrong value was accepted in silence, which is also the worst
           place for it: a mistyped IFSC is a payout that bounces a
           fortnight later.

           `ifsc` knows the fifth character of a real code is a zero.
           `account_number` knows the length banks actually issue. The
           rules are in src/lib/validation/fieldRules.js and are what
           check-partner-input-rules' 162 assertions cover. */}
      {method === 'upi' ? (
        <ValidatedField
          field="upi_id" value={upi} onChange={setUpi} showAll={showAll}
          label="UPI ID" hint="The one you already receive money on."
          placeholder="yourname@okhdfcbank" autoComplete="off" />
      ) : (
        <>
          <ValidatedField
            field="account_name" value={holder} onChange={setHolder} showAll={showAll}
            label="Account holder name" hint="Exactly as the bank has it."
            autoComplete="name" />
          <ValidatedField
            field="account_number" value={number} onChange={setNumber} showAll={showAll}
            label="Account number" inputMode="numeric" autoComplete="off" />
          <ValidatedField
            field="ifsc" value={ifsc} onChange={v => setIfsc(String(v).toUpperCase())}
            showAll={showAll} label="IFSC"
            hint="Eleven characters, and the fifth is always a zero."
            placeholder="HDFC0001234" autoComplete="off" />
        </>
      )}

      <p className="flex items-start gap-2 rounded-2xl bg-ink/[0.03] px-3.5 py-3 text-[12px] leading-snug text-ink-soft">
        <Lock size={13} className="mt-0.5 shrink-0" />
        <span>
          Stored securely and visible only to you and our payouts team. We never ask
          for a PIN, a CVV or a banking password — Sambramo only sends money out.
        </span>
      </p>

      {error && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}
    </StepShell>
  )
}
