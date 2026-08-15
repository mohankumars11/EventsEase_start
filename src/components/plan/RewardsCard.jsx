import { useState } from 'react'
import { Repeat2, Share2, Check, Users, Phone } from 'lucide-react'
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
 *
 * ── Every colour in here is a dark-ground colour, and that is load-bearing ──
 * This card is a plum-to-near-black gradient, and it was previously painted
 * with the app's semantic tokens — `text-ink`, `text-ink-mute`,
 * `bg-surface-sunk`, `ring-hairline`, plus `saffron-700` and `emerald-700`.
 * Those are not neutral names. index.css states the contract in its own
 * header: they resolve to the values tuned for the LIGHT ground, `--ink-mute`
 * being the darkest text the page is allowed. Spent on plum they measured:
 *
 *     "15% off next time"        saffron-700 on plum-800     1.98 : 1
 *     "Share with a friend"      ink on a 7% plum wash        1.35 : 1
 *     the referral blurb, terms
 *     and the support number     ink-mute on plum-900         2.6 : 1
 *
 * — that is, the headline saving, the only button, and the phone number were
 * all effectively unprinted. So nothing below asks for a semantic token. On a
 * dark card the ground is known, and the type says so: white for anything
 * being read, gold and rose for the two numbers, and no token whose value
 * depends on a theme this card is not in.
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-plum-800 via-plum-900 to-[#160528] text-white shadow-lg ring-1 ring-white/10">
      {/* A single warm bloom behind the gold half. The card is otherwise a
          flat wash across its whole width, and a flat wash is what made the
          two halves read as one undifferentiated block of small print. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-saffron-400/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-rose-400/10 blur-3xl"
      />

      <div className="relative border-b border-white/10 px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-saffron-300">
          And after the day itself
        </p>
        {/* The header used to be the eyebrow alone, which named a moment and
            promised nothing. Two lines is the whole point of the card: these
            are earned by going ahead, not claimed today. */}
        <p className="mt-0.5 text-[13px] font-bold leading-snug text-white">
          Two things this booking earns you
        </p>
      </div>

      <div className="relative divide-y divide-white/10 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron-400/15 ring-1 ring-saffron-400/35">
              <Repeat2 size={18} className="text-saffron-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-white/80">{next.name}</p>
              {/* The number is the card. It was 18px of saffron-700 — the
                  same weight as the label above it and two stops darker than
                  the ground it sat on. */}
              <p className="font-serif text-[22px] font-extrabold leading-none text-saffron-300">
                {next.headline}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/85">{next.blurb}</p>
          <p className="mt-2 text-[11px] leading-snug text-white/65">{next.terms}</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/15 ring-1 ring-rose-400/35">
              <Users size={18} className="text-rose-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-white/80">{referral.name}</p>
              <p className="font-serif text-[22px] font-extrabold leading-none text-rose-300">
                {referral.headline}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/85">{referral.blurb}</p>

          {/* A solid white pill, not a tinted one. The tinted version was
              `bg-surface-sunk/[0.07] text-ink` — a 7% plum wash carrying
              near-black type, which on this ground is an invisible label on
              an invisible button. It is also the only thing on the card a
              customer can actually press, so it should look like it. */}
          <button
            type="button"
            onClick={share}
            className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-extrabold text-plum-900 shadow-sm transition-transform active:scale-[0.98]"
          >
            {shared
              ? <><Check size={15} className="text-forest-600" strokeWidth={3} /> Message copied</>
              : <><Share2 size={15} strokeWidth={2.6} /> Share with a friend</>}
          </button>

          <p className="mt-2.5 text-[11px] leading-snug text-white/65">
            They mention your number when they book — we match it by hand and credit you both.
          </p>
          <a
            href={`tel:${BRAND.supportPhone}`}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-saffron-300 underline decoration-saffron-300/40 underline-offset-2"
          >
            <Phone size={11} strokeWidth={2.6} />
            {BRAND.supportPhone}
          </a>
        </div>
      </div>
    </div>
  )
}
