import { useState } from 'react'
import { Repeat2, Share2, Check, Users } from 'lucide-react'
import { OFFER_BY_ID } from '../../data/celebrationOffers'
import { BRAND } from '../../config/sambramo'

/**
 * What this booking earns after it is over.
 *
 * ── Why it sits at the end and not in the offers rail ───────────────────
 * The rail at the top is about the price of THIS celebration — things a
 * customer takes before they send the request. These two are different in
 * kind: neither can be claimed today, both are consequences of going ahead.
 * Mixed into the rail they read as coupons that mysteriously have no Claim
 * button; placed after the breakdown, at the moment somebody is deciding
 * whether to send, they are the argument for sending.
 *
 * It is also the honest place for them. A wedding is four functions and a
 * family that liked the first one books the rest; "your next one starts at
 * 15% off" is worth more to this business than another 3% off the first, and
 * it costs nothing until the customer has already been served once.
 *
 * ── The referral is deliberately low-tech ───────────────────────────────
 * There is no referral code system, no tracking link and no attribution
 * table — so this does not pretend there is one. Share sends a message and
 * tells the friend to mention the referrer's number when they book, which is
 * exactly how this gets honoured at pilot scale: a coordinator matches it by
 * hand, the same way they match the UPI price-lock payment.
 *
 * Writing it that way is not a compromise, it is the only version that is
 * true. A "your referral link" button generating a URL nothing reads would
 * be a feature that silently fails for every customer who uses it.
 */
export default function RewardsCard({ occasionName }) {
  const [shared, setShared] = useState(false)

  const next = OFFER_BY_ID.next_celebration
  const referral = OFFER_BY_ID.referral

  const message = [
    `I'm planning ${occasionName ? `a ${occasionName.toLowerCase()}` : 'a celebration'} with Sambramo — you see the whole price on screen before anyone calls you.`,
    '',
    `If you book, mention my number and we each get ₹1,000 off.`,
    'https://sambramoh.vercel.app/plan/build',
  ].join('\n')

  async function share() {
    // The platform sheet where there is one — on Android that is every app
    // the customer already shares to, which beats any list we could build.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sambramo', text: message })
        return
      } catch {
        /* Dismissed, or the sheet refused. Fall through to the clipboard so
           the action still does something rather than silently nothing. */
      }
    }
    try {
      await navigator.clipboard.writeText(message)
      setShared(true)
      setTimeout(() => setShared(false), 2200)
    } catch {
      /* Clipboard blocked too. The WhatsApp link below still works. */
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-plum-800 via-plum-900 to-[#160528] text-white shadow-lg ring-1 ring-white/10">
      <div className="border-b border-hairline/10 px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
          And after the day itself
        </p>
      </div>

      <div className="divide-y divide-hairline/10 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-400/15 ring-1 ring-saffron-400/30">
              <Repeat2 size={17} className="text-saffron-700" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">{next.name}</p>
              <p className="text-lg font-extrabold leading-none text-saffron-700">{next.headline}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/70">{next.blurb}</p>
          <p className="mt-2 text-[11px] leading-snug text-white/70">{next.terms}</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-400/15 ring-1 ring-rose-400/30">
              <Users size={17} className="text-rose-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">{referral.name}</p>
              <p className="text-lg font-extrabold leading-none text-rose-300">{referral.headline}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-mute">{referral.blurb}</p>

          <button
            type="button"
            onClick={share}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-surface-sunk/[0.07] px-4 text-sm font-bold text-ink ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.07] active:bg-surface-sunk/[0.07]"
          >
            {shared
              ? <><Check size={15} className="text-emerald-700" /> Message copied</>
              : <><Share2 size={15} /> Share with a friend</>}
          </button>
          <p className="mt-2 text-[11px] leading-snug text-ink-mute">
            They mention your number when they book — we match it by hand and credit you both. Questions:{' '}
            <a href={`tel:${BRAND.supportPhone}`} className="text-ink-mute underline underline-offset-2">
              {BRAND.supportPhone}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
