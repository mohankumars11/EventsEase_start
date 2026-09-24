import { BadgeCheck, Clock, Landmark, Pencil, TriangleAlert } from 'lucide-react'
import { destinationOf } from '../../../lib/documents/mask'

/**
 * Where the money goes — read-only, with one way out to the form.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FORM IS NOT DUPLICATED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `PayoutDetails.jsx` collects the account and lives under More → Bank
 * and payments. The reference design puts an editable bank card on the
 * earnings dashboard, and copying the form would mean two components
 * writing `vendor_payout_details` — which is how an account number gets
 * half-saved in one place while the other still shows the old one.
 *
 * So this panel states the destination and links across, using the
 * `onAddPayout` hand-off `VendorDashboard` already wires to `setTab
 * ('account')`. One writer, one truth.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERIFIED IS A DIFFERENT FACT FROM PRESENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migration 090's trigger clears `verified_at` whenever the method, UPI
 * id, account number or IFSC changes — precisely so that editing an
 * account cannot silently re-point a verified payout at a new one. A
 * partner who has just edited their details therefore drops back to
 * "being checked", and saying so here is what stops them wondering why
 * the claim button went away.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO RAZORPAY BADGE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design carries "payouts sent securely via Razorpay".
 * Razorpay is integrated for taking money FROM customers and for nothing
 * else: no Route, no RazorpayX, and `escrow_ledger.adapter` has never
 * held anything but 'ManualPayout'. Claiming a payout integration that
 * does not exist would be a lie on a financial screen.
 */
export default function BankPanel({ payout, onAddPayout }) {
  if (!payout) {
    return (
      <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <h2 className="text-[13.5px] font-extrabold text-ink">Where should we pay you?</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
          Add a bank account or UPI id. Nothing can be paid out until
          there is somewhere to send it.
        </p>
        <button
          type="button" onClick={onAddPayout}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white"
        >
          Add your account
        </button>
      </section>
    )
  }

  const verified = !!payout.verified_at

  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[13.5px] font-extrabold text-ink">Your account</h2>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ring-1 ${
          verified
            ? 'bg-forest-50 text-forest-700 ring-forest-200'
            : 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60'
        }`}>
          {verified ? <BadgeCheck size={11} /> : <Clock size={11} />}
          {verified ? 'Verified' : 'Being checked'}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5 rounded-[14px] bg-page-sunk px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-600/10 text-plum-700">
          <Landmark size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-ink">
            {destinationOf(payout)}
          </span>
          <span className="block text-[11px] text-ink-mute">
            {payout.method === 'upi' ? 'UPI' : 'Bank transfer'}
          </span>
        </span>
        {/* ── On the card, next to the thing it changes ───────────────
            There was a "Change account" button, four paragraphs further
            down, after the verification note and the no-wallet note. It
            did the same thing -- but somebody looking at the account
            number and wanting to change it looks NEXT TO the account
            number, and finding nothing there concludes there is no way.

            The long one below stays: this one is a shortcut for the
            person who already knows what they want, that one carries
            the sentence explaining that editing restarts the check. */}
        <button
          type="button" onClick={onAddPayout}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-plum-700 ring-1 ring-plum-200 active:scale-[0.97]"
        >
          Change
        </button>
      </div>

      {!verified && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-mute">
          <TriangleAlert size={12} className="mt-0.5 shrink-0 text-saffron-800" />
          We check a new account before the first payout. Editing it starts
          that check again.
        </p>
      )}

      <p className="mt-2.5 text-[11.5px] leading-snug text-ink-mute">
        Your earnings are paid directly into this account. There is no
        wallet and no balance held here.
      </p>

      <button
        type="button" onClick={onAddPayout}
        className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-ink/[0.04] px-3.5 text-[12.5px] font-extrabold text-ink-soft"
      >
        <Pencil size={12} /> Change account
      </button>
    </section>
  )
}
