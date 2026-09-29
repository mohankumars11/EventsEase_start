import { useEffect, useState } from 'react'
import { X, Check, Loader2, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

/**
 * Cancelling one service.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PRICE IS SHOWN BEFORE THE BUTTON, NOT AFTER
 * ══════════════════════════════════════════════════════════════════════
 *
 * A cancellation inside 48 hours costs the customer 10% and inside 12
 * hours costs half. Discovering that from a refund that is smaller than
 * expected is the single most reliable way to turn a cancellation into a
 * complaint — and `config/legal.js` names it: `hidden_costs` under the
 * CCPA 2023 dark-pattern guidelines, and a straightforward breach of the
 * Consumer Protection (E-Commerce) Rules 2020 requirement that
 * cancellation terms be disclosed before the act.
 *
 * So the sheet opens by ASKING the server what it would cost, and shows
 * the two numbers before there is anything to press. The confirm button
 * carries the refund figure on its face.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE NUMBER COMES FROM THE SERVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * `config/policies.js` has the same ladder and could compute it here,
 * instantly, with no round trip. It is not used, because a refund
 * quoted by the browser and a refund paid by the database are two
 * numbers that will eventually disagree — and the customer will have
 * read the wrong one.
 *
 * `cancellation_quote()` and `cancel_line()` share one implementation in
 * migration 081, so what is shown is what is paid, by construction.
 */
export default function CancelLine({ line, onCancelled, onClose, onSwap }) {
  const [quote, setQuote] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(null)

  /* Asked as the sheet opens, before anything is pressable.
   *
   * In an effect rather than a lazy useState initialiser: a side effect
   * during render runs twice under StrictMode and is not guaranteed to
   * run at all if React discards the render. */
  useEffect(() => {
    let dead = false
    supabase.rpc('cancellation_quote', { p_line_id: line.id }).then(({ data, error }) => {
      if (dead) return
      if (error) { setProblem(missingMigration(error) ? MISSING : error.message); return }
      if (!data?.ok) { setProblem('Could not work out the refund.'); return }
      setQuote(data)
    })
    return () => { dead = true }
  }, [line.id])

  async function confirm() {
    setBusy(true); setProblem(null)
    const { data, error } = await supabase.rpc('cancel_line', {
      p_line_id: line.id, p_reason: reason.trim() || null,
    })
    setBusy(false)
    if (error) { setProblem(missingMigration(error) ? MISSING : error.message); return }
    if (!data?.ok) { setProblem(data?.scan ?? 'Could not cancel this'); return }
    // Cancelled. Offer the swap rather than just closing — somebody who
    // drops a photographer usually still wants a photographer.
    setDone(data)
  }

  const held = quote?.held_paise ?? 0
  const paid = held > 0

  /* ── Cancelled, and the obvious next question answered ────────────
     A customer who drops a photographer usually still wants one — they
     dropped THIS photographer, or changed the shape of the day. Closing
     the sheet and returning them to a board with a gap in it makes them
     work out on their own that starting again is the way to replace it.

     Booking again rather than swapping in place, and stated plainly:
     the cancelled line is a real row with its own refund and its own
     master, and quietly reusing it would make one booking's history
     into two bookings' history. */
  if (done) {
    return (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md rounded-t-[26px] bg-white p-5 text-center sm:rounded-[26px]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
            <Check size={26} strokeWidth={3} />
          </span>
          <h2 className="mt-3 font-serif text-[20px] font-extrabold text-ink">
            {line.service_name} is cancelled
          </h2>
          {done.refunded_paise > 0 && (
            <p className="mt-1.5 text-[13px] font-bold text-forest-800">
              {formatINR(Math.round(done.refunded_paise / 100))} is on its way back to you
            </p>
          )}
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
            Everything else on your booking is untouched.
          </p>

          <button
            onClick={() => { onCancelled?.(done); onSwap?.() }}
            className="mt-4 w-full rounded-2xl bg-saffron-400 py-3.5 text-[14.5px] font-extrabold text-plum-950"
          >
            Book a different {String(line.service_name).toLowerCase()}
          </button>
          <button
            onClick={() => onCancelled?.(done)}
            className="mt-1.5 w-full py-2 text-[13px] font-bold text-ink-mute"
          >
            No thanks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-[26px] bg-white p-5 sm:rounded-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-[20px] font-extrabold leading-tight text-ink">
              Cancel {line.service_name}?
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Only this service. Everything else on your booking stays.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.05]">
            <X size={18} />
          </button>
        </div>

        {!quote && !problem && (
          <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-mute">
            <Loader2 size={15} className="animate-spin" /> Working out your refund…
          </p>
        )}

        {quote && (
          <>
            {/* Both numbers, before there is a button. */}
            {paid ? (
              <div className="mt-4 space-y-2 rounded-2xl bg-surface-sunk/[0.05] p-4">
                <Row label="You paid" value={formatINR(Math.round(held / 100))} />
                <Row
                  label="You get back"
                  value={formatINR(Math.round(quote.refund_paise / 100))}
                  strong
                />
                {quote.partner_paise > 0 && (
                  <Row
                    label="Goes to your master"
                    value={formatINR(Math.round(quote.partner_paise / 100))}
                    muted
                  />
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-forest-50 p-3.5 text-[13px] font-semibold text-forest-900 ring-1 ring-forest-200/60">
                Nothing has been charged, so there is nothing to refund.
              </p>
            )}

            {/* Why it is not the whole amount. Said plainly, as a
                reason and not an apology — the master really did turn
                other work down. */}
            {quote.partner_paise > 0 && (
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
                Your master cleared this date for you and turned other work down,
                so {quote.partner_pct}% of what you paid goes to them. This is
                the rate agreed when you booked.
              </p>
            )}

            <label className="mt-4 block">
              <span className="text-[12px] font-bold text-ink-soft">
                Anything we should know? <span className="font-semibold text-ink-mute">(optional)</span>
              </span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="Plans changed, found someone else, booked by mistake…"
                className="mt-1.5 w-full resize-none rounded-2xl bg-surface-sunk/[0.06] p-3 text-[13px] text-ink outline-none ring-1 ring-ink/[0.06] focus:ring-plum-300"
              />
            </label>

            <button
              onClick={confirm}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[14.5px] font-extrabold text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {paid
                ? `Cancel and refund ${formatINR(Math.round(quote.refund_paise / 100))}`
                : 'Cancel this service'}
            </button>
          </>
        )}

        {problem && (
          <p className="mt-3 flex items-start gap-1.5 text-[12px] font-bold leading-snug text-amber-800">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />{problem}
          </p>
        )}

        <button onClick={onClose} className="mt-2 w-full py-2 text-[13px] font-bold text-ink-mute">
          Keep it
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, strong, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[13px] ${strong ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${
        strong ? 'text-[16px] font-extrabold text-forest-700'
        : muted ? 'text-[13px] font-bold text-ink-mute'
        : 'text-[13.5px] font-bold text-ink'}`}>
        {value}
      </span>
    </div>
  )
}

const MISSING = 'Cancelling is not switched on yet — migration 081 has not been applied.'
const missingMigration = e => /does not exist|schema cache/i.test(e?.message ?? '')
