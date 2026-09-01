import { useEffect, useMemo, useRef, useState } from 'react'
import { Landmark, Smartphone, Check, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BANKS, bankForCode, codeForBank } from '../../data/indianBanks'
import { lookupIfsc, looksLikeIfsc } from '../../lib/ifsc'

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

const VERIFIED = 'rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-extrabold text-forest-700'
const PENDING = 'rounded-full bg-saffron-400/20 px-2.5 py-1 text-[11px] font-extrabold text-saffron-900'

export default function PayoutDetails({ vendorId }) {
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

  /* What the IFSC service said. Its own state rather than folded into
     the form: it is evidence about what was typed, not a value. */
  const [branch, setBranch] = useState(null)
  const [checking, setChecking] = useState(false)

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

  /* The lookup, debounced, and only once the shape is right. */
  const timer = useRef()
  useEffect(() => {
    clearTimeout(timer.current)
    setBranch(null)
    const code = ifsc.trim().toUpperCase()
    if (!looksLikeIfsc(code)) { setChecking(false); return }

    setChecking(true)
    timer.current = setTimeout(async () => {
      const r = await lookupIfsc(code)
      setChecking(false)
      setBranch(r)
      // A partner who typed the code before picking the bank should not
      // then have to pick it — the code already said which bank it is.
      if (r.ok && !bank) {
        const known = BANKS.find(b => b.name === r.bank)
        if (known) setBank(known.name)
      }
    }, 450)
    return () => clearTimeout(timer.current)
  }, [ifsc, bank])

  /* Does the code belong to the bank that was picked? */
  const bankMismatch = useMemo(() => {
    if (!bank || !looksLikeIfsc(ifsc)) return false
    const want = codeForBank(bank)
    return !!want && ifsc.trim().toUpperCase().slice(0, 4) !== want
  }, [bank, ifsc])

  const digits = accNo.replace(/\D/g, '')
  const ready = method === 'upi'
    ? /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())
    : !!accName.trim() && digits.length >= 9 && digits === accNo2.replace(/\D/g, '')
        && looksLikeIfsc(ifsc) && !bankMismatch && branch?.ok === true

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    const payload = method === 'upi'
      ? { vendor_id: vendorId, method: 'upi', upi_id: upiId.trim(),
          account_name: null, account_number: null, ifsc: null }
      : { vendor_id: vendorId, method: 'bank',
          account_name: accName.trim(), account_number: digits,
          ifsc: ifsc.trim().toUpperCase(), upi_id: null }
    if (pan.trim()) payload.pan = pan.trim().toUpperCase()

    const { data, error: e } = await supabase
      .from('vendor_payout_details').upsert(payload, { onConflict: 'vendor_id' })
      .select().maybeSingle()

    setSaving(false)
    if (e) { setError(e.message); return }
    setRow(data); setSaved(true); setAccNo(''); setAccNo2('')
  }

  if (loading) {
    return <div className="card p-5 text-[13px] text-ink-mute">Loading your payout details…</div>
  }

  const verified = !!row?.verified_at

  return (
    <section className="card p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-[19px] font-extrabold text-ink">How you get paid</h3>
        {row && (
          <span className={verified ? VERIFIED : PENDING}>
            {verified ? 'Verified' : 'Being checked'}
          </span>
        )}
      </header>

      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">
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
            id="po-upi" className="input" inputMode="email" autoCapitalize="none"
            placeholder="name@oksbi"
            value={upiId}
            onChange={e => { setUpiId(e.target.value); setSaved(false) }}
          />
          <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">
            The one on your phone's UPI app. Money reaches you in seconds.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3.5">
          <div>
            <label className="label" htmlFor="po-bank">Your bank</label>
            <select
              id="po-bank" className="input"
              value={bank}
              onChange={e => { setBank(e.target.value); setSaved(false) }}
            >
              <option value="">Choose your bank…</option>
              {BANKS.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="po-ifsc">IFSC code</label>
            <input
              id="po-ifsc" className="input uppercase" autoCapitalize="characters"
              placeholder="CNRB0001234" maxLength={11}
              value={ifsc}
              onChange={e => { setIfsc(e.target.value.toUpperCase()); setSaved(false) }}
            />

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
              id="po-name" className="input" placeholder="As printed in your passbook"
              value={accName}
              onChange={e => { setAccName(e.target.value); setSaved(false) }}
            />
          </div>

          <div>
            <label className="label" htmlFor="po-acc">Account number</label>
            <input
              id="po-acc" className="input" inputMode="numeric"
              placeholder={row?.account_number ? 'Enter again to change it' : ''}
              value={accNo}
              onChange={e => { setAccNo(e.target.value); setSaved(false) }}
            />
            {row?.account_number && !accNo && (
              <p className="mt-1 text-[11.5px] font-semibold text-ink-mute">
                Currently ending {String(row.account_number).slice(-4)}.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="po-acc2">Account number again</label>
            <input
              id="po-acc2" className="input" inputMode="numeric"
              value={accNo2}
              onChange={e => { setAccNo2(e.target.value); setSaved(false) }}
            />
            {/* Typed twice because a transposed digit is the one mistake
                that silently succeeds — the money leaves, and it lands
                somewhere real that is not you. */}
            {accNo2 && digits !== accNo2.replace(/\D/g, '') && (
              <p className="mt-1 text-[12px] font-bold text-rose-700">
                These two do not match.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3.5">
        <label className="label" htmlFor="po-pan">PAN <span className="font-semibold text-ink-mute">(optional for now)</span></label>
        <input
          id="po-pan" className="input uppercase" autoCapitalize="characters" maxLength={10}
          placeholder="ABCDE1234F"
          value={pan}
          onChange={e => { setPan(e.target.value.toUpperCase()); setSaved(false) }}
        />
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
        disabled={!ready || saving}
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
