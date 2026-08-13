import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import LockPayment from './LockPayment'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'

/**
 * The price lock, as one thing, for every screen that ends a request.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * The lock was built into the celebration builder and nowhere else. That is
 * one of three ways a customer can finish: they can also add a scale to the
 * enquiry cart and send it, or complete the six-step wizard — and both of
 * those ended on a page that said "no payment now" and never mentioned the
 * ₹1,000 hold at all. So a customer who picked any of the eight scales from
 * an occasion page and pressed through to the end was never offered the one
 * thing that holds their date, and the feature looked broken because from
 * where they were standing it was missing.
 *
 * Every ending now renders this. The claimed panel and the honest wording
 * that goes with it live here rather than being retyped per page, because
 * the moment they diverge one screen starts promising something the others
 * do not — and this is the screen where the promise involves money.
 *
 * ── What `onClaim` is for ───────────────────────────────────────────────
 * Where a claim gets recorded differs by surface: the builder and the cart
 * write `lock_payment_status` on their `service_enquiries` rows (migration
 * 034), the wizard writes it on its `events` row (migration 038). Each
 * caller passes its own writer, and each one swallows its own failure — the
 * request is already safely stored by the time this renders, so the worst
 * case is a coordinator who reconciles by hand, which is what happens anyway
 * given UPI tells this app nothing. Throwing here would show an error over a
 * saved request to somebody who has just paid.
 */
export default function PriceLock({
  reference,
  amount = LOCK_AMOUNT,
  quote = null,
  headline,
  blurb,
  claimedTitle = 'Payment noted — we are checking for it now',
  claimedBody,
  whatsappText,
  onClaim,
  onSkip,
  skipLabel,
  claimed: claimedInitially = false,
}) {
  const [claimed, setClaimed] = useState(claimedInitially)

  async function claim() {
    // Flipped before the write and regardless of its outcome, deliberately.
    // See the note above: a failed write is a reconciliation problem, not
    // something to tell the customer their payment did not happen over.
    setClaimed(true)
    try {
      await onClaim?.()
    } catch (err) {
      console.warn('Price-lock claim not recorded:', err?.message ?? err)
    }
  }

  if (claimed) {
    return (
      <div className="card space-y-2 border-2 border-green-200 bg-green-50 p-5 text-center">
        <ShieldCheck size={28} className="mx-auto text-green-600" />
        <p className="font-bold text-gray-900">{claimedTitle}</p>
        <p className="text-xs leading-relaxed text-gray-600">
          {claimedBody
            ?? `UPI does not tell us automatically when money arrives, so a person is matching your ${formatINR(amount)} against the bank. You will get a message once it is confirmed and your date is held. It is adjusted against your final invoice, and refundable.`}
        </p>
      </div>
    )
  }

  return (
    <LockPayment
      enquiryId={reference}
      quote={quote}
      amount={amount}
      headline={headline}
      blurb={blurb}
      whatsappText={whatsappText}
      onClaimed={claim}
      onSkip={onSkip}
      skipLabel={skipLabel}
    />
  )
}
