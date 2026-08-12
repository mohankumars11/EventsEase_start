import { useEffect } from 'react'
import { Check, Users, ArrowRight, X, Sparkles } from 'lucide-react'
import { TIER_BY_ID } from '../../data/celebrationTiers'
import { tierContentFor } from '../../data/occasionTierContent'
import { tierServicesFor } from '../../data/occasionPackages'

/**
 * "You're in this circle." — the moment a scale gets decided.
 *
 * ── Why an interruption is the right answer here ────────────────────────
 * The guest count picks the tier for you. That is the good part of the
 * design and it was also the confusing part: you tapped "220", something
 * changed somewhere in a list of six cards you had already scrolled past,
 * and nothing told you what. People reported it as the page "choosing its
 * own option" — which is exactly what it was doing, silently.
 *
 * A tier is not a minor preference. It sets the dish allowance, the décor
 * level, the pre-ticked services and the coordination fee, so a change made
 * on your behalf has to be *stated* and *agreed to* rather than inferred
 * from a moved highlight. Hence a dialog: it names the circle you landed
 * in, shows what comes with it, and offers the one thing the old screen
 * made you scroll to the bottom of six cards to find — the way forward.
 *
 * ── When it does NOT fire ───────────────────────────────────────────────
 * Typing in the guest field. A dialog on every keystroke between "2" and
 * "220" would be unusable, so only *discrete* acts open it: tapping a guest
 * chip, or tapping a tier card. Typed counts still move the highlight and
 * still update the price — they just do it quietly, the way typing should.
 *
 * ── Two shapes, one component ───────────────────────────────────────────
 * Confirming (the tier you are in already, after tapping its card) and
 * switching (the count now suggests a different tier than the one you had
 * deliberately chosen). The second must never overwrite the first silently:
 * somebody who picked Close Circle for 90 guests on purpose gets asked, and
 * "keep what I had" is a real button, not a dismiss X they have to guess at.
 *
 * ── "What this circle brings with it" has to mean THIS circle ───────────
 * The list under that heading came off the tier, which describes the ladder
 * generically. So a baby shower that landed on Royal Mysuru was told its scale
 * brings a mandap — at the exact moment the dialog is asking the customer to
 * agree to the scale. `eventId` makes the list the occasion's own.
 */
export default function TierMatchDialog({
  tierId, eventId, currentTierId, guestCount, nextLabel, onConfirm, onDismiss,
}) {
  // Escape closes, and the page behind holds still while it is open. Same
  // rule as any other cover: whichever gesture the user reaches for first
  // has to work.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onDismiss?.() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onDismiss])

  const tier = TIER_BY_ID[tierId]
  if (!tier) return null

  const current = currentTierId && currentTierId !== tierId ? TIER_BY_ID[currentTierId] : null
  const fits = guestCount >= tier.guests.min && guestCount <= tier.guests.max
  const content = eventId
    ? tierContentFor(eventId, tier, tierServicesFor(eventId, tier))
    : tier

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onDismiss}
        className="absolute inset-0 bg-plum-950/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-match-title"
        className="relative w-full sm:max-w-md max-h-[88dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.3)] sm:shadow-2xl"
      >
        {/* The grab handle reads as "this can be dismissed" before anyone
            hunts for the X — on a phone that is the first thing a thumb
            tries. */}
        <div className="shrink-0 flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 active:bg-gray-100 sm:text-white/70 sm:active:bg-white/15"
        >
          <X size={18} />
        </button>

        <div className={`shrink-0 px-5 pt-5 pb-4 text-center ${tier.accent}`}>
          <span className="text-4xl block" aria-hidden="true">{tier.emoji}</span>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] font-bold text-gray-500">
            {current ? 'A better fit for this many guests' : 'This is your circle'}
          </p>
          <h2 id="tier-match-title" className="mt-1 text-2xl font-extrabold text-gray-900 leading-tight">
            {tier.name}
          </h2>
          <p className="text-sm italic text-gray-500">{tier.localName}</p>

          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white px-3 py-1.5 text-xs font-bold text-gray-700">
            <Users size={13} className="text-plum-600" />
            {fits
              ? `Your ${guestCount} guests sit inside ${tier.guests.min}–${tier.guests.max}`
              : `Built for ${tier.guests.min}–${tier.guests.max} guests`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm font-medium text-gray-700">{tier.tagline}</p>

          <p className="mt-3 text-[11px] uppercase tracking-wider font-bold text-gray-400">
            What this circle brings with it
          </p>
          <ul className="mt-2 space-y-1.5">
            {content.highlights.map(h => (
              <li key={h} className="flex items-start gap-2 text-sm text-gray-600">
                <Check size={14} className="mt-0.5 shrink-0 text-green-600" />
                {h}
              </li>
            ))}
          </ul>

          {/* Said plainly, because this is the whole reason the dialog is
              worth interrupting for: agreeing changes four other screens. */}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-plum-50 border border-plum-100 px-3 py-2.5 text-xs leading-relaxed text-plum-800">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-plum-500" />
            <span>
              Choosing this fills your menu to {tier.menuAllowance.starters} starters
              and {tier.menuAllowance.curries} curries, sets décor to its recommended level and pre-ticks{' '}
              {tier.includedServices.length} services. Every one of them stays editable.
            </span>
          </p>

          {current && (
            <p className="mt-3 text-xs text-gray-500">
              You had picked <strong className="text-gray-700">{current.name}</strong>. Keep it if that was
              deliberate — a small setup at a big function is a real choice, not a mistake.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-4 space-y-2 pb-safe">
          <button
            type="button"
            onClick={() => onConfirm(tier.id)}
            className="w-full min-h-[52px] rounded-xl bg-plum-700 text-white text-base font-bold flex items-center justify-center gap-2 active:bg-plum-800"
          >
            {current ? `Move to ${tier.name}` : 'Yes, that is us'}
            <span className="opacity-70">·</span>
            <span className="inline-flex items-center gap-1 font-semibold">
              {nextLabel} <ArrowRight size={16} />
            </span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 active:bg-gray-50"
          >
            {current ? `Keep ${current.name}` : 'Let me look at the other scales'}
          </button>
        </div>
      </div>
    </div>
  )
}
