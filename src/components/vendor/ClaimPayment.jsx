import { useEffect, useState } from 'react'
import { Banknote, Check, Loader2, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

/**
 * The partner asks for their money.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A BUTTON AND NOT A SILENT TRANSFER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Escrow releases 24 hours after the event, and until Razorpay Route is
 * live that release is a person running a transfer against the ledger.
 * Between "owed" and "arrived" there was nothing at all: no record the
 * partner had asked, nothing for an operator to work from, and nothing
 * for the partner to point at when it was late.
 *
 * This is that record. It is NOT a second approval on money already
 * earned — the partner is owed it either way — it is the request queue,
 * and it exists so both sides are looking at the same list.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT SAYS WHY, NOT JUST NO
 * ══════════════════════════════════════════════════════════════════════
 *
 * `claimable()` returns a reason and a sentence, never a bare false.
 * "You cannot claim this" with no explanation is the most infuriating
 * thing a payments screen can say to somebody who is owed money — so
 * every locked state here names what is missing and, where it is time,
 * says the date.
 *
 * ── A review is invited, never required ─────────────────────────────
 * The gate does not include the customer leaving a rating. A partner's
 * earnings must not be held hostage to whether somebody else could be
 * bothered — that is their money depending on another person's
 * inaction. The ask sits next to the claim and changes nothing about it.
 */
export default function ClaimPayment({ lineId, onClaimed }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    let dead = false
    supabase.rpc('claimable', { p_line_id: lineId }).then(({ data, error }) => {
      if (dead) return
      setState(error ? { ok: false, reason: 'error', says: error.message } : data)
    })
    return () => { dead = true }
  }, [lineId])

  async function claim() {
    setBusy(true)
    const { data, error } = await supabase.rpc('claim_payment', { p_line_id: lineId })
    setBusy(false)
    if (error) { setState({ ok: false, reason: 'error', says: error.message }); return }
    if (!data?.ok) { setState(data); return }
    setDone(data)
    onClaimed?.(data)
  }

  if (!state) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-ink/[0.03] px-4 py-3 text-[12.5px] font-semibold text-ink-mute">
        <Loader2 size={13} className="animate-spin" /> Checking…
      </div>
    )
  }

  if (done) {
    return (
      <div className="mt-3 rounded-[18px] bg-forest-50 p-4 ring-1 ring-forest-200">
        <p className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-forest-800">
          <Check size={15} /> Claimed
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-forest-800/85">
          {formatINR(Math.round(done.amount_paise / 100))} going to {done.destination}.
          Sambramo sends it within one working day and you will see it here when it goes.
        </p>
      </div>
    )
  }

  /* Owed, and everything is in place. The only state with a button. */
  if (state.ok) {
    return (
      <div className="mt-3 rounded-[20px] bg-saffron-400/12 p-4 ring-1 ring-saffron-300/60">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-saffron-800">
          Yours to claim
        </p>
        <p className="mt-1 font-serif text-[28px] font-extrabold leading-none tracking-tight text-ink">
          {formatINR(Math.round((state.amount_paise ?? 0) / 100))}
        </p>

        {/* Where it goes, stated before the tap rather than after. The
            partner chose this account in Account; showing it here means
            nobody claims into an account they forgot they changed. */}
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-ink/[0.06]">
          <Banknote size={16} className="shrink-0 text-ink-mute" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-ink-mute">
              Paid into
            </span>
            <span className="block truncate text-[13.5px] font-extrabold text-ink">
              {state.destination}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:opacity-50"
        >
          {busy
            ? <><Loader2 size={15} className="animate-spin" /> Claiming…</>
            : <>Claim {formatINR(Math.round((state.amount_paise ?? 0) / 100))} <ArrowRight size={16} /></>}
        </button>

        <p className="mt-2 text-center text-[11.5px] font-semibold text-ink-mute">
          Wrong account? Change it in Account before you claim.
        </p>
      </div>
    )
  }

  /* Not yet. Every one of these names what is missing. */
  const says = state.says ?? 'Not ready to claim yet.'
  const isTime = state.reason === 'too_soon'
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-[18px] bg-ink/[0.03] px-4 py-3">
      <Lock size={14} className="mt-0.5 shrink-0 text-ink-mute" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-extrabold text-ink">{says}</p>
        {isTime && state.at && (
          <p className="mt-0.5 text-[11.5px] font-semibold text-ink-mute">
            From {new Date(state.at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
