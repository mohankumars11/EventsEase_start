import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, AlertTriangle, Lock, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { bankForCode, codeForBank } from '../../../data/indianBanks'
import { looksLikeIfsc } from '../../../lib/ifsc'
import { last4 } from '../../../lib/documents/mask'
import { normalise } from '../../../lib/validation/fieldRules'
import { parseServerError } from '../../../lib/validation/serverError'
import { useFieldCheck, FieldMessage, useServerErrors, focusFirstInvalid, anyError } from '../../partner/FieldCheck'
import BankPicker, { useIfscLookup } from './BankPicker'

/**
 * Steps 2–4 of "Identity Verification & Bank Details": PAN, the bank
 * account, and an optional UPI ID — saved together with one button.
 *
 * The same record, rules and lookups as More → Bank & payments
 * (PayoutDetails): one vendor_payout_details row per partner (upsert on
 * vendor_id, so it can never be duplicated), the fieldRules checks the
 * server repeats in migration 159, the bank list and Razorpay's IFSC
 * service via BankPicker. Bank and UPI are stored side by side — the
 * table allows both; `method` records the one payouts use, and Razorpay
 * Route settles to a bank account, so a bank account wins when there is one.
 *
 * Saving is not verifying. The row's `verified_at` is written only by an
 * operator or the payout provider, and a changed destination clears it
 * (migration 090's trigger). This form never shows "verified" itself.
 *
 * Never asked: a UPI PIN, a card PIN, a net-banking password.
 */
const Section = ({ n, title, sub, children, testid }) => (
  <section data-section={testid} className="mt-5 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Step {n}</p>
    <h2 className="mt-0.5 text-[16px] font-extrabold text-ink">{title}</h2>
    {sub && <p className="mt-1 text-[12.5px] leading-snug text-ink/60">{sub}</p>}
    <div className="mt-3">{children}</div>
  </section>
)

export default function PayoutOnboardingForm({ vendorId, onSaved, panExtra = null, identityNote = null }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)

  const [pan, setPan] = useState('')
  const [bank, setBank] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [accName, setAccName] = useState('')
  const [accNo, setAccNo] = useState('')
  const [accNo2, setAccNo2] = useState('')
  const [consent, setConsent] = useState(false)
  const [addUpi, setAddUpi] = useState(null)        // null = not answered, true = add, false = skip
  const [upiId, setUpiId] = useState('')
  const [upiId2, setUpiId2] = useState('')

  useEffect(() => {
    if (!vendorId) { setLoading(false); return }
    let dead = false
    supabase.from('vendor_payout_details').select('*').eq('vendor_id', vendorId).maybeSingle().then(({ data }) => {
      if (dead) return
      setLoading(false)
      if (!data) return
      setRow(data)
      setPan(data.pan ?? '')
      setAccName(data.account_name ?? '')
      setIfsc(data.ifsc ?? '')
      setBank(bankForCode(data.ifsc) ?? '')
      if (data.upi_id) { setAddUpi(true); setUpiId(data.upi_id); setUpiId2(data.upi_id) }
      setConsent(!!data.account_number)
    })
    return () => { dead = true }
  }, [vendorId])

  const { branch, checking, retry } = useIfscLookup(ifsc, bank, setBank)
  const bankMismatch = useMemo(() => {
    if (!bank || !looksLikeIfsc(ifsc)) return false
    const want = codeForBank(bank)
    return !!want && ifsc.trim().toUpperCase().slice(0, 4) !== want
  }, [bank, ifsc])

  const [showAll, setShowAll] = useState(false)
  const server = useServerErrors()
  const digits = normalise('account_number', accNo)
  const hasSavedBank = !!row?.account_number
  const wantsBank = hasSavedBank || !!(accNo || accName.trim() || ifsc.trim() || bank)
  const changingAccount = !!accNo || !hasSavedBank

  const panCheck = useFieldCheck('payout_pan', pan, { showAll, serverError: server.errors.pan, ctx: { account_name: accName } })
  const nameCheck = useFieldCheck('account_name', accName, { showAll, serverError: server.errors.account_name })
  const ifscCheck = useFieldCheck('ifsc', ifsc, { showAll, serverError: server.errors.ifsc })
  const accCheck = useFieldCheck('account_number', accNo, { showAll, serverError: server.errors.account_number })
  const acc2Check = useFieldCheck('account_number_confirm', accNo2, { showAll, ctx: { account_number: digits } })
  const upiCheck = useFieldCheck('upi_id', upiId, { showAll, serverError: server.errors.upi_id })
  const upiMismatch = addUpi && upiId2 && normalise('upi_id', upiId) !== normalise('upi_id', upiId2)

  const bankOk = !wantsBank || (!anyError(nameCheck, ifscCheck) && (!changingAccount || !anyError(accCheck, acc2Check))
    && !bankMismatch && !(branch && !branch.ok && branch.reason === 'not_found') && (consent || !changingAccount))
  const upiOk = !addUpi || (!anyError(upiCheck) && !upiMismatch && !!upiId2)
  const somewhere = wantsBank || addUpi
  const ready = !anyError(panCheck) && bankOk && upiOk && somewhere

  async function save() {
    if (!ready) { setShowAll(true); setTimeout(() => focusFirstInvalid(), 0); if (!somewhere) setError('Add a bank account or a UPI ID so we know where to send your earnings.'); return }
    setSaving(true); setError(null)
    const payload = {
      vendor_id: vendorId,
      method: wantsBank ? 'bank' : 'upi',
      account_name: wantsBank ? normalise('account_name', accName) : null,
      account_number: wantsBank ? (accNo ? digits : row?.account_number ?? null) : null,
      ifsc: wantsBank ? normalise('ifsc', ifsc) : null,
      upi_id: addUpi ? normalise('upi_id', upiId) : null,
    }
    if (normalise('payout_pan', pan)) payload.pan = normalise('payout_pan', pan)
    const { data, error: e } = await supabase.from('vendor_payout_details').upsert(payload, { onConflict: 'vendor_id' }).select().maybeSingle()
    setSaving(false)
    if (e) { if (!server.take(e)) setError(parseServerError(e).says); return }
    setRow(data); setAccNo(''); setAccNo2(''); setSavedAt(new Date())
    onSaved?.(data)
  }

  if (loading) return <p className="mt-4 text-[13px] text-ink-mute">Loading your saved details…</p>

  return (
    <div data-payout-form>
      <Section n={2} testid="pan" title="PAN and tax details"
        sub="Razorpay needs your PAN to activate payouts to your bank, and without it more tax is deducted from each payout.">
        <label className="label" htmlFor="ob-pan">PAN</label>
        <input {...panCheck.inputProps} id="ob-pan" className={'input uppercase' + panCheck.ring} autoCapitalize="characters" autoComplete="off"
          placeholder="ABCDE1234F" value={pan} onChange={e => { server.clear('pan'); setPan(e.target.value.toUpperCase()) }} />
        <FieldMessage check={panCheck} />
        <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">Your personal PAN, or your business PAN if the business is a company or firm. A typed PAN is checked when payouts are activated — it is not marked verified here.</p>
        {panExtra}
      </Section>

      <Section n={3} testid="bank" title="Bank account details" sub="Which bank account should receive your earnings?">
        {identityNote}
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="ob-bank">Bank name</label>
            <BankPicker id="ob-bank" value={bank || (branch?.ok ? branch.bank : '')} onChange={setBank} />
          </div>
          <div>
            <label className="label" htmlFor="ob-ifsc">IFSC code</label>
            <input {...ifscCheck.inputProps} id="ob-ifsc" className={'input uppercase' + ifscCheck.ring} autoCapitalize="characters" placeholder="CNRB0001234"
              value={ifsc} onChange={e => { server.clear('ifsc'); setIfsc(e.target.value.toUpperCase()) }} />
            <FieldMessage check={ifscCheck} />
            {checking && <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-mute"><Loader2 size={12} className="animate-spin" /> Finding your branch…</p>}
            {!checking && branch?.ok && !bankMismatch && (
              <div data-testid="ifsc-branch" className="mt-1.5 rounded-xl bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-800">
                <span className="flex items-center gap-1 font-extrabold"><Check size={13} /> {branch.bank}</span>
                {branch.branch}{branch.city ? ` · ${branch.city}` : ''}{branch.state ? `, ${branch.state}` : ''}{branch.imps ? ' · instant transfer supported' : ''}
              </div>
            )}
            {!checking && branch && !branch.ok && branch.reason === 'not_found' && (
              <p data-testid="ifsc-error" className="mt-1.5 text-[12px] font-bold text-rose-700">No branch has this code. Check it against your passbook or cheque.</p>
            )}
            {!checking && branch && !branch.ok && branch.reason === 'offline' && (
              <p className="mt-1.5 text-[12px] font-bold text-ink-mute">Could not look this code up just now. Your details are kept — <button type="button" onClick={retry} className="underline">try again</button>.</p>
            )}
            {bankMismatch && (
              <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12px] font-bold text-rose-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" />That code belongs to {bankForCode(ifsc) ?? 'another bank'}, not {bank}.</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="ob-name">Account-holder name</label>
            <input {...nameCheck.inputProps} id="ob-name" className={'input' + nameCheck.ring} placeholder="As printed in your passbook"
              value={accName} onChange={e => { server.clear('account_name'); setAccName(e.target.value) }} />
            <FieldMessage check={nameCheck} />
          </div>
          <div>
            <label className="label" htmlFor="ob-acc">Account number</label>
            <input {...accCheck.inputProps} id="ob-acc" className={'input' + (changingAccount ? accCheck.ring : '')} inputMode="numeric" autoComplete="off"
              placeholder={hasSavedBank ? 'Enter again only to change it' : ''} value={accNo} onChange={e => { server.clear('account_number'); setAccNo(e.target.value) }} />
            {changingAccount && <FieldMessage check={accCheck} />}
            {hasSavedBank && !accNo && <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">Saved account ending {last4(row.account_number)}.</p>}
          </div>
          {changingAccount && (
            <div>
              <label className="label" htmlFor="ob-acc2">Confirm account number</label>
              <input {...acc2Check.inputProps} id="ob-acc2" className={'input' + acc2Check.ring} inputMode="numeric" autoComplete="off"
                value={accNo2} onChange={e => setAccNo2(e.target.value)} />
              <FieldMessage check={acc2Check} />
            </div>
          )}
          {changingAccount && (
            <label className="flex items-start gap-2.5 rounded-2xl bg-plum-50/60 p-3 text-[12px] leading-snug text-ink/75">
              <input type="checkbox" data-testid="bank-consent" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-plum-700" />
              <span>This account is mine or my business&apos;s. I authorise Sambramo and Razorpay to verify it and send my earnings to it.</span>
            </label>
          )}
        </div>
      </Section>

      <Section n={4} testid="upi" title="UPI details" sub="Would you also like to add a UPI ID for payouts?">
        <div className="grid grid-cols-2 gap-2">
          {[[true, 'Add UPI ID'], [false, 'Skip for now']].map(([v, l]) => (
            <button key={l} type="button" data-upi-choice={v ? 'add' : 'skip'} aria-pressed={addUpi === v} onClick={() => setAddUpi(v)}
              className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[13px] font-extrabold transition ${addUpi === v ? 'bg-plum-700 text-white' : 'bg-white text-plum-700 ring-1 ring-plum-200'}`}>
              {v && <Plus size={14} />}{l}
            </button>
          ))}
        </div>
        {addUpi && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="ob-upi">UPI ID</label>
              <input {...upiCheck.inputProps} id="ob-upi" className={'input' + upiCheck.ring} inputMode="email" autoCapitalize="none" placeholder="name@oksbi"
                value={upiId} onChange={e => { server.clear('upi_id'); setUpiId(e.target.value) }} />
              <FieldMessage check={upiCheck} />
            </div>
            <div>
              <label className="label" htmlFor="ob-upi2">Confirm UPI ID</label>
              <input id="ob-upi2" data-testid="field-upi_id_confirm" className={'input' + (upiMismatch ? ' ring-2 ring-saffron-400' : '')} inputMode="email" autoCapitalize="none"
                value={upiId2} onChange={e => setUpiId2(e.target.value)} />
              {upiMismatch && <p className="mt-1 text-[12px] font-bold text-saffron-800">These two UPI IDs do not match.</p>}
            </div>
            <p className="text-[11.5px] font-semibold text-ink-mute">We never ask for your UPI PIN. A UPI ID is saved, not verified, until a payout to it succeeds.</p>
          </div>
        )}
      </Section>

      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{error}</p>}
      <button type="button" data-cta="save-payout" onClick={save} disabled={saving}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:opacity-60">
        {saving && <Loader2 size={16} className="animate-spin" />} Save Bank &amp; UPI Details
      </button>
      {savedAt && <p data-testid="payout-saved" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-forest-700"><Check size={14} /> Saved. Verification status is shown below.</p>}
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-mute"><Lock size={12} className="mt-0.5 shrink-0" /> Stored privately. Only you and our payouts team can see it. We never ask for a PIN or a banking password.</p>
    </div>
  )
}
