import { ArrowRight, Landmark } from 'lucide-react'
import { formatINR } from '../../../utils/format'
import { destinationOf, payoutReady } from '../../../lib/documents/mask'

/**
 * What is yours right now, and where it will land.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ROWS FROM THE REFERENCE DESIGN ARE DELIBERATELY ABSENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * (Carried verbatim from EarningsSummary.jsx, which this replaces. The
 * argument is the most valuable thing in the module and must not be lost
 * with the file.)
 *
 * The design this was built from shows "Customer tips", "Incentives"
 * and "Adjustments". None of the three exists: there is no tip column,
 * no incentive table and no adjustment ledger anywhere in the schema.
 *
 * Rendering them as ₹0 would be a placeholder a partner reads as a
 * feature, and rendering them with a number would be inventing money.
 * A partner shown ₹1,180 of tips will ask where it went, and the honest
 * answer -- that it was never real -- is the most expensive sentence
 * this app could ever have to say. They come back when there is a
 * column behind them.
 *
 * Migration 140 gives adjustments a column. Tips and incentives still
 * have none, and stay absent until they do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "ASK FOR IT" IS ONE BUTTON, AND IT USED NOT TO BE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `claim_payment(p_line_id)` settles ONE line. There was no bulk payout
 * call, so a single button claiming everything would have been N round
 * trips with a partial-failure story nobody had designed -- which is why
 * the screen this replaces sent the partner down to the jobs instead.
 *
 * Migration 138 adds `claim_all_ready()`, which does the loop inside one
 * transaction and returns what it claimed and what it skipped. Until
 * that is pasted the button is not rendered, because `onClaim` is only
 * passed once the RPC exists.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DARK IS A STRIP, NOT A CARD
 * ══════════════════════════════════════════════════════════════════════
 *
 * The screen it replaced opened with a plum gradient card, which was the
 * only dark surface left in the partner app's BODY. The converted
 * screens put dark in a `bg-plum-950` header strip and nowhere else, and
 * a third dark treatment — neither plum-950 nor plum-600 — is how a
 * design system stops being one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE FIGURE, AND IT IS THE ACTIONABLE ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Ready to claim, not lifetime earnings. Two large totals on one screen,
 * one of them a lifetime sum and one of them claimable, is the pair most
 * easily confused — and the confusion is expensive in the direction
 * where somebody believes the larger number is available.
 */
export default function EarningsHero({
  readyPaise = 0, readyCount = 0, payout, onClaim, onAddPayout, claiming = false,
}) {
  const ready = payoutReady(payout)
  const has = readyPaise > 0

  return (
    <section className="overflow-hidden rounded-[22px] bg-plum-950 p-4 text-white">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white/60">
        Ready to claim
      </p>
      <p className="mt-1 font-serif text-[32px] font-extrabold leading-none tracking-tight tabular-nums">
        {formatINR(Math.round(readyPaise / 100))}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold leading-snug text-white/70">
        {has
          ? `${readyCount} ${readyCount === 1 ? 'job is' : 'jobs are'} done and past the holding window.`
          : 'Nothing is claimable yet. Money becomes yours a day after the event.'}
      </p>

      {/* Rendered only when there is an RPC behind it. A button that
          looks live and does nothing is worse on this screen than no
          button at all — see `claim_all_ready` above. Until 138 is
          pasted, the partner claims from the job, which works today. */}
      {has && ready && onClaim && (
        <button
          type="button" onClick={onClaim} disabled={claiming}
          className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-saffron-500 px-4 text-[13.5px] font-extrabold text-plum-950 disabled:opacity-60"
        >
          {claiming ? 'Asking…' : `Ask for ${formatINR(Math.round(readyPaise / 100))}`}
          {!claiming && <ArrowRight size={15} />}
        </button>
      )}

      {has && ready && !onClaim && (
        <p className="mt-3 rounded-[14px] bg-white/10 px-3 py-2.5 text-[12px] font-semibold leading-snug text-white/80">
          Open any job marked <span className="font-extrabold text-white">Ready</span> below
          to ask for its payment.
        </p>
      )}

      {/* A partner with money ready and nowhere to send it is the worst
          state this screen can show, so it is said here rather than
          further down. */}
      {has && !ready && (
        <button
          type="button" onClick={onAddPayout}
          className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-saffron-500 px-4 text-[13px] font-extrabold text-plum-950"
        >
          {payout ? 'We are checking your account' : 'Add your bank account'}
          <ArrowRight size={14} />
        </button>
      )}

      <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[11.5px] text-white/60">
        <Landmark size={12} className="shrink-0" />
        {/* Never "wallet". There is no balance held here — money goes
            straight to a bank account, and calling it a wallet would
            describe a product that does not exist. */}
        <span className="min-w-0 truncate">
          {payout
            ? `Paid straight to ${destinationOf(payout)}`
            : 'Paid straight to your bank. No wallet, no balance held here.'}
        </span>
      </p>
    </section>
  )
}
