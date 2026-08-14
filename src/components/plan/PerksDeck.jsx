import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Copy, Check, Share2, Crown, MessageCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { MEMBERSHIP } from '../../config/membership'

/**
 * The reasons to book with us rather than with the decorator your cousin used.
 *
 * Three of them, in the order they actually persuade:
 *
 *   Membership   the standing reason to come back
 *   Referral     the reason to bring someone else
 *   Support      the reason to trust it at all, pre-launch
 *
 * ── Why the membership does not take money ─────────────────────────────
 * Sambramo is pre-launch and sources per order — there is no billing, no
 * renewal, and no way to honour a subscription that has been charged for. So
 * this card announces the programme and opens a conversation instead of a
 * checkout. Every benefit listed is one the business can already deliver by
 * hand for a founding member; nothing here promises an automated entitlement
 * that no code exists to enforce.
 *
 * That is a real constraint rather than a design preference: a paid tier whose
 * perks silently fail to apply at checkout is worse than no paid tier, and it
 * would be the one thing on the site that took money for something imaginary.
 */
export default function PerksDeck() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const referralCode = profile?.referral_code
  const link = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : null

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function shareLink() {
    if (!link) return
    if (navigator.share) {
      navigator.share({
        title: BRAND.name,
        text: 'Plan celebrations & shop gifts with Sambramo — use my link to get started:',
        url: link,
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  const whatsappHref =
    `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
      `Hi! I'd like to know more about ${MEMBERSHIP.name}.`
    )}`

  return (
    <section aria-labelledby="perks-heading" className="space-y-3 px-4">
      <h2 id="perks-heading" className="text-[17px] font-extrabold text-ink">
        More reasons to plan with us
      </h2>

      {/* ── Membership ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-plum-800 via-plum-700 to-berry-700 p-5 ring-1 ring-white/20">
        {/* A single slow sheen. The card is the most valuable thing on the
            page and earns one piece of movement; anything more competes with
            the buttons under it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-saffron-400 text-plum-950">
            <Crown size={20} strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-[19px] font-bold leading-tight text-white">
                {MEMBERSHIP.name}
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-saffron-300">
                {MEMBERSHIP.status}
              </span>
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              {MEMBERSHIP.pitch}
            </p>
          </div>
        </div>

        <ul className="relative mt-4 space-y-2">
          {MEMBERSHIP.benefits.map(b => (
            <li key={b} className="flex items-start gap-2 text-[12px] leading-relaxed text-white/85">
              <Check size={13} className="mt-0.5 shrink-0 text-saffron-300" strokeWidth={3} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-4 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 py-3 text-[13px] font-extrabold text-plum-950 transition-transform active:scale-[0.98]"
        >
          <MessageCircle size={16} />
          {MEMBERSHIP.cta}
        </a>
        <p className="relative mt-2 text-center text-[10px] leading-relaxed text-white/60">
          {MEMBERSHIP.disclaimer}
        </p>
      </div>

      {/* ── Referral ─────────────────────────────────────────────────────
          Only for signed-in customers with a code: `referral_code` is written
          by migration 019, and rendering a share card whose link is
          `/signup?ref=undefined` would hand people a broken invitation. Signed
          -out visitors get the sign-up prompt instead, which is the honest
          version of the same offer. */}
      {referralCode ? (
        <div className="rounded-3xl bg-gradient-to-br from-saffron-400 to-amber-500 p-5 text-plum-950">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Gift size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold leading-tight">Refer a friend</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
                They get a welcome coupon, you get one when their first order completes.
                Your code is <span className="font-mono font-bold">{referralCode}</span>.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={shareLink}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-[12px] font-extrabold text-amber-700"
            >
              <Share2 size={14} /> Share invite
            </button>
            <button
              onClick={copyLink}
              aria-label="Copy referral link"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2.5 text-[12px] font-bold text-white ring-1 ring-white/20"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/signup"
          className="flex items-center gap-3 rounded-3xl bg-surface-sunk/[0.06] p-4 ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.06]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron-400/15 text-saffron-300">
            <Gift size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-ink">
              Create an account, get a referral code
            </span>
            <span className="block text-[11px] leading-relaxed text-ink-mute">
              Invite friends and you both get a coupon on their first order.
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-ink-mute" />
        </Link>
      )}
    </section>
  )
}
