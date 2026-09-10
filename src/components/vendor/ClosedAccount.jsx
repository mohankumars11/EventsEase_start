import { MessageCircle, Lock } from 'lucide-react'
import { BRAND } from '../../config/sambramo'

/**
 * The door, when the account behind it is closed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS HAD TO BE A GATE AND NOT A BANNER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Closing an account did nothing. `set_vendor_verification` wrote
 * `verification_status = 'suspended'`, and then:
 *
 *   the banner checked `suspended_at`, which that RPC never set, so it
 *     did not render -- the partner was shown "Not verified, no jobs are
 *     sent yet", which reads like an onboarding step they had not got to
 *
 *   nothing gated the app -- ProtectedRoute tests `profiles.role` and
 *     nothing else -- so a closed partner went on editing listings,
 *     setting their calendar and changing their payout details
 *
 * A banner would not have been enough even if it had rendered. Somebody
 * whose account is shut needs to be told plainly and given a way to
 * argue with it, not left to discover it by never being offered work.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DELIBERATELY DOES NOT SAY
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Deleted." Nothing is. Their listings, their calendar, their documents
 * and their history are all still there and a closure is reversible in
 * one click from the console -- so the copy says paused and kept, which
 * is true, rather than gone, which is not. A partner told their work is
 * gone does not come back to argue; they tell other partners.
 *
 * The reason is shown only when an operator wrote one. A blank quoted as
 * a reason is worse than no reason at all.
 */
export default function ClosedAccount({ vendor, onSignOut }) {
  const reason = vendor?.suspended_reason || vendor?.verification_note || null

  const message =
    `Hello Sambramo, my partner account is closed`
    + (vendor?.partner_code ? ` (${vendor.partner_code})` : '')
    + `. I would like to talk about it.`

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-plum-950 px-6 py-12">
      <div className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink/[0.06]">
          <Lock size={20} className="text-ink-soft" />
        </span>

        <h1 className="mt-4 text-[19px] font-extrabold leading-tight text-ink">
          Your account is closed
        </h1>
        <p className="mt-2 text-[13.5px] leading-snug text-ink-mute">
          You are not being offered work at the moment. Nothing has been deleted —
          your listings, your calendar and your history are all still here.
        </p>

        {reason && (
          <p className="mt-3 rounded-2xl bg-ink/[0.03] px-3.5 py-2.5 text-left text-[12.5px] leading-snug text-ink">
            <span className="font-extrabold">Why: </span>{reason}
          </p>
        )}

        {/* The only way forward from this screen, so it is the only
            full-width button on it. A closed partner with a question and
            nowhere to put it is a partner who tells other partners. */}
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 py-3.5 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
        >
          <MessageCircle size={17} /> Talk to our team
        </a>

        {vendor?.partner_code && (
          <p className="mt-3 text-[11.5px] text-ink-mute">
            Quote{' '}
            <span className="select-all font-mono font-bold text-royal-700">
              {vendor.partner_code}
            </span>
            {' '}and we will find you straight away.
          </p>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 text-[12.5px] font-extrabold text-ink-mute underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
