import { useEffect, useMemo, useState } from 'react'
import { Landmark, Smartphone, Check, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { bankForCode, codeForBank } from '../../data/indianBanks'
import { looksLikeIfsc } from '../../lib/ifsc'
import BankPicker, { useIfscLookup } from './bank/BankPicker'
import { last4 } from '../../lib/documents/mask'
import { normalise } from '../../lib/validation/fieldRules'
import { useFieldCheck, FieldMessage, useServerErrors, focusFirstInvalid, anyError } from '../partner/FieldCheck'
import { parseServerError } from '../../lib/validation/serverError'

/**
 * Where this partner gets paid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SCREEN THAT WAS MISSING ENTIRELY
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner could be matched, accept a job, and have a customer pay for
 * it — and there was nowhere in the product that knew where to send the
 * money. The escrow ledger, the hold, the release and the cancellation
 * ladder were all built on top of an absence.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE TYPED FIELD, NOT FOUR
 * ══════════════════════════════════════════════════════════════════════
 *
 * A form that asks for bank, branch, city and IFSC is four chances to
 * get it wrong, and getting it wrong sends somebody's Saturday to a
 * stranger.
 *
 * The IFSC already contains all four. Typing it fills the branch and the
 * city from Razorpay's IFSC service, confirms the bank against what was
 * picked in the dropdown, and says whether that branch can even take an
 * instant transfer. What remains typed is the account number, which no
 * API on earth can know — and it is typed twice, because a transposed
 * digit is the one mistake that silently succeeds.
 *
 * ── UPI first ───────────────────────────────────────────────────────
 * It is instant, it is free, and it is what a decorator in Bengaluru
 * actually uses. Bank transfer is offered second, for whoever wants it
 * in an account.
 *
 * ── Changing this un-verifies it ────────────────────────────────────
 * Enforced by a trigger in migration 090, not here, because a rule the
 * client owns is a rule the next client forgets. Said out loud in the
 * UI anyway: somebody editing a verified account should know they are
 * restarting the check, not discover it.
 */

export default function PayoutDetails({ vendorId, onSaved }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [method, setMethod] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [bank, setBank] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [accName, setAccName] = useState('')
  const [accNo, setAccNo] = useState('')
  const [accNo2, setAccNo2] = useState('')
  const [pan, setPan] = useState('')


  useEffect(() => {
    if (!vendorId) return
    let dead = false
    supabase.from('vendor_payout_details').select('*').eq('vendor_id', vendorId).maybeSingle()
      .then(({ data }) => {
        if (dead) return
        setLoading(false)
        if (!data) return
        setRow(data)
        setMethod(data.method ?? 'upi')
        setUpiId(data.upi_id ?? '')
        setAccName(data.account_name ?? '')
        setIfsc(data.ifsc ?? '')
        setPan(data.pan ?? '')
        setBank(bankForCode(data.ifsc) ?? '')
        /* The account number is NOT restored into the field. It is shown
           masked below. Re-filling it would mean a partner glancing at
           this screen leaves with a full account number on it, and an
           edit should be a deliberate re-entry rather than a stray tap
           on a pre-filled box. */
      })
    return () => { dead = true }
  }, [vendorId])

  /* What the IFSC service said — evidence about what was typed, not a
     value. The lookup (debounced, Razorpay's IFSC service) is shared with
     the onboarding step: components/vendor/bank/BankPicker. */
  const { branch, checking } = useIfscLookup(ifsc, bank, setBank)

  /* Does the code belong to the bank that was picked? */
  const bankMismatch = useMemo(() => {
    if (!bank || !looksLikeIfsc(ifsc)) return false
    const want = codeForBank(bank)
    return !!want && ifsc.trim().toUpperCase().slice(0, 4) !== want
  }, [bank, ifsc])

  /* ══════════════════════════════════════════════════════════════════
     THE SAME RULES AS THE SETUP STEP, NOT A THIRD SET
     ══════════════════════════════════════════════════════════════════
     This screen had its own regexes and `accNo.replace(/\D/g, '')`,
     so "12345abc6789" was saved as an account number nobody typed, and
     `maxLength` cut a pasted IFSC or PAN to a valid-looking shorter
     one. Now each box asks fieldRules, keeps what was typed, and says
     what is wrong; the bank and branch checks below stay as they were. */
  const [showAll, setShowAll] = useState(false)
  const server = useServerErrors()
  const digits = normalise('account_number', accNo)
  const upiCheck = useFieldCheck('upi_id', upiId, { showAll, serverError: server.errors.upi_id })
  const ifscCheck = useFieldCheck('ifsc', ifsc, { showAll, serverError: server.errors.ifsc })
  const nameCheck = useFieldCheck('account_name', accName, { showAll, serverError: server.errors.account_name })
  const accCheck = useFieldCheck('account_number', accNo, { showAll, serverError: server.errors.account_number })
  const acc2Check = useFieldCheck('account_number_confirm', accNo2, { showAll, ctx: { account_number: digits } })
  const panCheck = useFieldCheck('payout_pan', pan, { showAll, serverError: server.errors.pan,
    ctx: { account_name: accName } })
  const fieldsOk = method === 'upi'
    ? !anyError(upiCheck, panCheck)
    : !anyError(ifscCheck, nameCheck, accCheck, acc2Check, panCheck)
  /* The bank and branch lookups are this screen's own, and stay gates. */
  const ready = fieldsOk && (method === 'upi' || (!bankMismatch && branch?.ok === true && looksLikeIfsc(normalise('ifsc', ifsc))))

  async function save() {
    if (!fieldsOk) { setShowAll(true); setTimeout(() => focusFirstInvalid(), 0); return }
    setSaving(true); setError(null); setSaved(false)
    const payload = method === 'upi'
      ? { vendor_id: vendorId, method: 'upi', upi_id: normalise('upi_id', upiId),
          account_name: null, account_number: null, ifsc: null }
      : { vendor_id: vendorId, method: 'bank',
          account_name: normalise('account_name', accName), account_number: digits,
          ifsc: normalise('ifsc', ifsc), upi_id: null }
    if (normalise('payout_pan', pan)) payload.pan = normalise('payout_pan', pan)

    const { data, error: e } = await supabase
      .from('vendor_payout_details').upsert(payload, { onConflict: 'vendor_id' })
      .select().maybeSingle()

    setSaving(false)
    if (e) {
      /* A refusal from the server (159) goes under its box. The raw
         Postgres sentence is never shown. */
      if (!server.take(e)) setError(parseServerError(e).says)
      return
    }
    setRow(data); setSaved(true); setAccNo(''); setAccNo2('')
    /* The Account tab prints this row's summary on the collapsed fold
       above ("UPI · name@oksbi · being checked"). Without this it would
       still read "Not added yet" immediately after somebody added it. */
    onSaved?.(data)
  }

  if (loading) {
    return <div className="text-[13px] text-ink-mute">Loading your payout details…</div>
  }

  const verified = !!row?.verified_at

  /* ══════════════════════════════════════════════════════════════════
     NO CARD, NO TITLE, NO STATUS PILL
     ══════════════════════════════════════════════════════════════════

     All three used to be here and all three now belong to the Account
     tab's "How you get paid" fold, which supplies the panel, the title,
     and a summary line that already reads "UPI · name@oksbi · being
     checked" while the section is still shut.

     Repeating them inside would put a heading directly under an
     identical heading and a ring 4px inside another ring — and worse,
     two places that could disagree about whether this partner is
     verified. One fact, one place that says it. */
  return (
    <section>
      <p className="text-[13px] leading-relaxed text-ink-mute">
        {row
          ? verified
            ? 'Your earnings go here after each job is delivered.'
            : 'We are checking these details. You can keep taking jobs meanwhile.'
          : 'Add this once. Without it we cannot send you money for the jobs you finish.'}
      </p>

      {/* ── Method. Two cards, not a radio group ─────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          { id: 'upi',  icon: Smartphone, label: 'UPI',  scan: 'Instant, free' },
          { id: 'bank', icon: Landmark,   label: 'Bank', scan: 'Same day' },
        ].map(m => {
          const on = method === m.id
          const Icon = m.icon
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMethod(m.id); setSaved(false) }}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3.5 text-left transition ${
                on ? 'bg-saffron-400/15 ring-2 ring-saffron-400' : 'bg-ink/[0.03] ring-1 ring-ink/[0.07]'
              }`}
            >
              <Icon size={18} className={on ? 'text-saffron-700' : 'text-ink-mute'} />
              <span className="text-[14px] font-extrabold text-ink">{m.label}</span>
              <span className="text-[11.5px] font-semibold text-ink-mute">{m.scan}</span>
            </button>
          )
        })}
      </div>

      {method === 'upi' ? (
        <div className="mt-4">
          <label className="label" htmlFor="po-upi">Your UPI ID</label>
          <input
            {...upiCheck.inputProps}
            id="po-upi" className={'input' + upiCheck.ring} inputMode="email" autoCapitalize="none"
            placeholder="name@oksbi"
            value={upiId}
            onChange={e => { server.clear('upi_id'); setUpiId(e.target.value); setSaved(false) }}
          />
          <FieldMessage check={upiCheck} />
          <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">
            The one on your phone's UPI app. Money reaches you in seconds.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3.5">
          <div>
            <label className="label" htmlFor="po-bank">Your bank</label>
            <BankPicker value={bank} onChange={v => { setBank(v); setSaved(false) }} />
          </div>

          <div>
            <label className="label" htmlFor="po-ifsc">IFSC code</label>
            <input
              {...ifscCheck.inputProps}
              id="po-ifsc" className={'input uppercase' + ifscCheck.ring} autoCapitalize="characters"
              placeholder="CNRB0001234"
              value={ifsc}
              onChange={e => { server.clear('ifsc'); setIfsc(e.target.value.toUpperCase()); setSaved(false) }}
            />
            <FieldMessage check={ifscCheck} />

            {/* Everything the code already knows, so nobody types it. */}
            {checking && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-mute">
                <Loader2 size={12} className="animate-spin" /> Finding your branch…
              </p>
            )}
            {!checking && branch?.ok && !bankMismatch && (
              <div className="mt-1.5 rounded-xl bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-800">
                <span className="font-extrabold">{branch.bank}</span> · {branch.branch}
                <span className="block text-forest-700/80">
                  {branch.city}{branch.state ? `, ${branch.state}` : ''}
                  {branch.imps ? ' · instant transfer supported' : ''}
                </span>
              </div>
            )}
            {!checking && branch && !branch.ok && branch.reason === 'not_found' && (
              <p className="mt-1.5 text-[12px] font-bold text-rose-700">
                No branch has this code. Check it against your passbook or cheque.
              </p>
            )}
            {!checking && branch && !branch.ok && branch.reason === 'offline' && (
              <p className="mt-1.5 text-[12px] font-bold text-ink-mute">
                Could not check the code just now. You can still save it.
              </p>
            )}
            {bankMismatch && (
              <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12px] font-bold text-rose-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                That code belongs to {bankForCode(ifsc) ?? 'another bank'}, not {bank}.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="po-name">Name on the account</label>
            <input
              {...nameCheck.inputProps}
              id="po-name" className={'input' + nameCheck.ring} placeholder="As printed in your passbook"
              value={accName}
              onChange={e => { server.clear('account_name'); setAccName(e.target.value); setSaved(false) }}
            />
            <FieldMessage check={nameCheck} />
          </div>

          <div>
            <label className="label" htmlFor="po-acc">Account number</label>
            <input
              {...accCheck.inputProps}
              id="po-acc" className={'input' + accCheck.ring} inputMode="numeric" autoComplete="off"
              placeholder={row?.account_number ? 'Enter again to change it' : ''}
              value={accNo}
              onChange={e => { server.clear('account_number'); setAccNo(e.target.value); setSaved(false) }}
            />
            <FieldMessage check={accCheck} />
            {row?.account_number && !accNo && (
              <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">
                Currently ending {last4(row.account_number)}.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="po-acc2">Account number again</label>
            <input
              {...acc2Check.inputProps}
              id="po-acc2" className={'input' + acc2Check.ring} inputMode="numeric" autoComplete="off"
              value={accNo2}
              onChange={e => { setAccNo2(e.target.value); setSaved(false) }}
            />
            {/* Typed twice because a transposed digit is the one mistake
                that silently succeeds — the money leaves, and it lands
                somewhere real that is not you. */}
            <FieldMessage check={acc2Check} />
          </div>
        </div>
      )}

      <div className="mt-3.5">
        <label className="label" htmlFor="po-pan">PAN <span className="font-semibold text-ink-mute">(optional for now)</span></label>
        <input
          {...panCheck.inputProps}
          id="po-pan" className={'input uppercase' + panCheck.ring} autoCapitalize="characters" autoComplete="off"
          placeholder="ABCDE1234F"
          value={pan}
          onChange={e => { server.clear('pan'); setPan(e.target.value.toUpperCase()); setSaved(false) }}
        />
        <FieldMessage check={panCheck} />
        <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">
          Needed once your earnings pass ₹20,000 in a year. Adding it now saves a chase later.
        </p>
      </div>

      {verified && (
        <p className="mt-3.5 inline-flex items-start gap-1.5 rounded-xl bg-ink/[0.04] px-3 py-2 text-[12px] font-semibold text-ink-mute">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-forest-700" />
          Changing where money goes means we check it again before the next payout.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || (fieldsOk && !ready)}
        aria-disabled={!ready || saving ? true : undefined}
        className="btn-primary mt-4 w-full disabled:opacity-45"
      >
        {saving ? 'Saving…' : saved ? 'Saved' : row ? 'Update payout details' : 'Save payout details'}
      </button>

      {saved && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-forest-700">
          <Check size={14} /> Saved. We will check these and confirm.
        </p>
      )}
    </section>
  )
}
