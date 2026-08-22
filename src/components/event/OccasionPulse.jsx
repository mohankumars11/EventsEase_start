import { Users, Sparkles, ShieldCheck, UtensilsCrossed, Palette, TrendingUp } from 'lucide-react'
import { formatINR } from '../../utils/format'
import DetailRotator from '../common/DetailRotator'

/**
 * The occasion page's live answer, sitting where three dead numbers used to.
 *
 * ── What this replaces, and why it had to go ────────────────────────────
 * The header carried three tiles — "Scales to pick from 8 / 10–3500 guests",
 * "Starting at ₹26,750 / incl. taxes", "Services we arrange 24" — under a row
 * of three signature pills that wrapped to two or three lines on a phone.
 *
 * Every one of those figures was a constant. Eight scales is eight scales
 * whether you have twenty guests or two thousand; ₹26,750 is the floor of the
 * smallest rung and is the wrong number for all but the handful of customers
 * actually planning for ten people. So the most prominent block on the page —
 * the one directly under the occasion's name — answered a question nobody had
 * asked and then never moved again, no matter what the customer did below it.
 * Six lines of screen spent on a page that could not react.
 *
 * This is the same space spent on the one number the customer came for: what
 * *their* celebration costs, at *their* headcount, recomputed by the same
 * buildQuote() the builder and the tier cards use. Type 340 and the band moves,
 * the per-guest figure moves, and the scale above it renames itself. Nothing
 * here is written down; all of it is derived, which is why it is true for all
 * fifteen occasions rather than for the one somebody remembered to update.
 *
 * ── The rotating line ───────────────────────────────────────────────────
 * The three signature pills are not deleted — they are worth saying, they were
 * just costing three rows to say three things. They now share one line with
 * everything else the header wants to claim (what is priced in, the cuisine,
 * the decor level, that nothing is charged until it is approved), cycling
 * through the same rotator the storefront cards use. Eight facts in one row
 * instead of three facts in three, and the block is never a dead rectangle.
 *
 * Under `prefers-reduced-motion` the rotator stacks every line instead of
 * cycling — see DetailRotator. It costs the height back, which is the correct
 * trade for somebody who has asked for no movement.
 *
 * ── Past the top rung ───────────────────────────────────────────────────
 * A count above the ladder resolves to BESPOKE_TIER, which deliberately has no
 * price. The block says so in words rather than rendering "₹—", because the
 * whole reason that rung carries no number is that inventing one for a
 * 6,000-guest event would be a guess wearing a price tag.
 */
export default function OccasionPulse({
  event, profile, tier, guestCount, quote, entryPrice, bespoke = false, tierCount,
}) {
  // What the line cycles through. Ordered so the first thing a customer sees
  // is the occasion's own promise rather than an operational detail, and
  // filtered of falsy entries so an occasion with no cuisine or no priced
  // services simply contributes fewer lines instead of an empty one.
  const facts = [
    ...profile.signature.map((s, i) => ({
      key: `sig-${i}`, icon: Sparkles, text: s, color: 'var(--event-glow-ink)',
    })),
    tier?.cuisine && {
      key: 'cuisine',
      icon: UtensilsCrossed,
      text: `${tier.cuisine.name}${tier.vegOnly ? ', pure veg' : ''} — every dish choosable`,
    },
    tier?.decor && {
      key: 'decor',
      icon: Palette,
      text: `${tier.decor.name} decor comes as standard at this scale`,
    },
    tier?.services?.length > 0 && {
      key: 'services',
      icon: Sparkles,
      text: `${tier.services.length} services already priced in — untick any of them`,
    },
    {
      key: 'catalogue',
      icon: TrendingUp,
      text: `${tierCount} scales and ${event.services.length} services, all bookable alone`,
    },
    {
      key: 'trust',
      icon: ShieldCheck,
      text: 'Nothing is charged and no vendor is held until you approve it',
    },
  ]

  return (
    <div className="overflow-hidden rounded-3xl bg-surface-sunk/[0.06] ring-1 ring-hairline/10 backdrop-blur-sm">
      {/* ── The scale, named ─────────────────────────────────────
          Renamed live as the count changes. The customer is told which circle
          they are in before they are told what it costs, because the price is
          meaningless without it — and because a number that changes with no
          label changing alongside it reads as the page being unstable. */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <span className="text-[22px] leading-none" aria-hidden="true">{tier?.emoji ?? event.emoji}</span>
        <div className="min-w-0 flex-1">
          <p key={tier?.id} className="fact-swap truncate text-[14px] font-extrabold leading-tight text-ink">
            {tier?.name ?? event.name}
          </p>
          <p className="truncate text-[10.5px] font-medium italic text-ink-mute">
            {tier?.localName ?? profile.promise}
          </p>
        </div>
        {tier?.guests && (
          <span
            className="event-tint flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold"
          >
            <Users size={10} />
            {bespoke ? `${tier.guests.min}+` : `${tier.guests.min}–${tier.guests.max}`}
          </span>
        )}
      </div>

      {/* ── The number ───────────────────────────────────────────
          Keyed on the value so each new figure rises into place rather than
          swapping character by character — the same treatment the storefront
          gives a changing line, for the same reason: a number that mutates
          silently is a number nobody notices has mutated. */}
      <div className="px-4 pb-3.5 pt-2">
        {bespoke ? (
          <>
            <p className="font-serif text-[21px] font-bold leading-tight text-ink">
              Past what we will auto-price
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              {guestCount.toLocaleString('en-IN')} guests is beyond the ladder. A coordinator builds
              this with you and you see every line before agreeing to any of it — no automatic number,
              because at this size one would be a guess.
            </p>
          </>
        ) : quote?.range ? (
          <>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-mute">
              Your estimate, all in
            </p>
            <p
              key={`${quote.range.low}-${quote.range.high}`}
              className="fact-swap font-serif text-[25px] font-bold leading-tight text-ink sm:text-[29px]"
            >
              {formatINR(quote.range.low)}
              <span className="mx-1 text-ink-mute">–</span>
              {formatINR(quote.range.high)}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-mute">
              for <strong className="font-extrabold text-ink-soft">{guestCount.toLocaleString('en-IN')} guests</strong>
              {quote.perGuest ? <> · about {formatINR(quote.perGuest)} a head</> : null} · incl. taxes
            </p>

            {/* ── The floor, kept in view ─────────────────────
                The header used to lead with this number alone ("Starting at
                ₹26,750") and it was wrong for almost everybody, because it is
                the cheapest rung at its smallest headcount. Repricing against
                the real count fixes that — and introduces the opposite
                failure, because a page that opens on ₹2,75,000 tells a family
                planning a lunch for thirty that this app is not for them.
                celebrationTiers.js is explicit that Close Circle exists so
                somebody with ₹10,000 has a real door in; the door has to stay
                visible. Both numbers, each labelled as what it is. */}
            {Number.isFinite(entryPrice) && tier?.guests?.min > 10 && (
              <p className="mt-1.5 text-[10.5px] leading-snug text-ink-mute">
                Planning something smaller? We start at{' '}
                <strong className="font-bold text-ink-mute">{formatINR(entryPrice)}</strong> for ten
                people.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-serif text-[21px] font-bold leading-tight text-ink">
              Tell us the headcount
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              It is the one thing that moves the price most. Put a rough number in below and every
              figure on this page prices itself against it.
            </p>
          </>
        )}
      </div>

      {/* ── The line that keeps moving ───────────────────────── */}
      <div className="border-t border-hairline/10 bg-surface-sunk/[0.06] px-4 py-2.5">
        <DetailRotator
          facts={facts}
          interval={3200}
          height={16}
          lineClassName="text-ink-mute"
        />
      </div>
    </div>
  )
}
