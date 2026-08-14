import { Link } from 'react-router-dom'
import { Check, Users, ArrowRight, Eye, Sparkles, RefreshCw } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * "You belong here." — the answer, attached to the question that produced it.
 *
 * ── The complaint this exists to answer ─────────────────────────────────
 * A customer opens the birthday page, types their real headcount into the
 * guest control, and nothing appears to happen. That was very nearly true.
 * Three things did move, and not one of them was where the customer was
 * looking:
 *
 *   · The scale's name changed inside OccasionPulse — 14px, in a header block
 *     ABOVE the control being typed into.
 *   · One of nine 40px segments in the dial's ladder gained a background tint
 *     and a slightly wider bar. No words. On a phone the `title` tooltip that
 *     would have named it cannot be opened at all.
 *   · A card somewhere further down the page gained a border.
 *
 * So the page did answer, in three places, none of them legible, and the
 * customer's own report was that entering a count "doesn't activate any of
 * the scales". They were right: nothing said, in words, at the point of
 * interaction, which group they had landed in.
 *
 * This is that sentence, and it sits directly under the control rather than
 * anywhere else on the page. It names the scale, states the band the count
 * falls in, prices it at the count actually typed, lists what comes with it,
 * and offers the two things somebody wants next — look at it, or build it.
 * It updates on every keystroke and every frame of a drag, because a verdict
 * that waits for a blur event is a verdict that is not attached to the act.
 *
 * ── Why it does not wait to be confirmed ────────────────────────────────
 * The old answer to "the app is choosing my scale silently" was a modal on
 * every boundary crossing. That fixes silence with interruption, and the
 * interruption is worse: it fires mid-decision, it covers the ladder the
 * customer is reading, and by the third one it is dismissed unread. A
 * statement that is always on screen and always current needs no permission,
 * because nothing is being decided behind anyone's back — the customer can
 * see the decision, in words, the entire time they are making it.
 *
 * ── Past the top rung ───────────────────────────────────────────────────
 * A count above the ladder has no price on purpose (see BESPOKE_TIER), so the
 * verdict says so in a sentence instead of rendering a band. Inventing a
 * figure for a 6,000-guest event would be a guess wearing a price tag.
 */
export default function ScaleVerdict({
  tier, quote, guestCount, eventId, bespoke = false,
  suggested, onAdoptSuggested, onSeeDetails,
}) {
  if (!tier) return null

  const fits = !bespoke && guestCount >= tier.guests.min && guestCount <= tier.guests.max

  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-hairline/10 bg-white">
      {/* The rung's own colour at full strength, carrying the verdict. This is
          the line the customer's eye lands on after they let go of the
          number, so it says the conclusion rather than a label. */}
      <p className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white ${tier.spine ?? 'bg-gradient-to-b from-plum-500 to-berry-500'}`}>
        <Check size={12} />
        {bespoke
          ? `${guestCount.toLocaleString('en-IN')} guests — beyond the ladder`
          : `Your ${guestCount.toLocaleString('en-IN')} guests → you belong here`}
      </p>

      <div className={`p-4 ${tier.surface ?? 'bg-white'}`}>
        <div className="flex items-start gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${tier.accent ?? 'border-gray-200 bg-gray-50'}`}>
            {tier.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] font-extrabold leading-tight text-gray-900">{tier.name}</h3>
            <p className={`text-[13px] font-semibold italic ${tier.ink ?? 'text-gray-500'}`}>{tier.localName}</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-gray-700 ring-1 ring-black/5">
              <Users size={11} />
              {bespoke
                ? `Built for ${tier.guests.min.toLocaleString('en-IN')}+ guests`
                : fits
                  ? `${tier.guests.min}–${tier.guests.max} guests — yours sits inside it`
                  : `Built for ${tier.guests.min}–${tier.guests.max} guests`}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[13px] font-medium leading-snug text-gray-700">{tier.tagline}</p>

        {bespoke ? (
          <p className="mt-3 rounded-xl bg-white/85 px-3.5 py-3 text-[12px] leading-relaxed text-gray-600 ring-1 ring-black/5">
            We will not put an automatic number on a celebration this size — at{' '}
            {guestCount.toLocaleString('en-IN')} guests one would be a guess. A coordinator builds it
            with you and you see every line before agreeing to any of it.
          </p>
        ) : quote?.range ? (
          <div className="mt-3 rounded-xl bg-white/85 px-3.5 py-3 ring-1 ring-black/5">
            {/* Never "a full {name}" — half the ladder is named with a
                leading article ("The Full Celebration"), and lowercasing it to
                fit the sentence produced "a full the full celebration". The
                name stands on its own and the clause follows it. */}
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {tier.name} — everything in, for {guestCount.toLocaleString('en-IN')} guests
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold leading-none text-gray-900">
              {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              Food, décor and this scale's services, taxes included
              {quote.perGuest ? ` — about ${formatINR(quote.perGuest)} a guest` : ''}.
            </p>
          </div>
        ) : null}

        {tier.highlights?.length > 0 && (
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {tier.highlights.slice(0, 4).map(h => (
              <li key={h} className="flex items-start gap-1.5 text-[12px] leading-snug text-gray-700">
                <Check size={11} className="mt-0.5 shrink-0 text-green-600" />
                {h}
              </li>
            ))}
          </ul>
        )}

        {/* ── What to do about it ──────────────────────────────────
            Two verbs, because there are two people reading this: the one who
            wants to check the detail before committing, and the one who has
            seen enough and wants their own price. Neither should have to
            scroll the page to find the next move. */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {!bespoke && (
            <Link
              to={`/plan/build/${eventId}?tier=${tier.id}&guests=${guestCount}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold text-ink transition-transform active:scale-[0.98]"
              style={{ background: 'var(--event-ink)' }}
            >
              Build my celebration <ArrowRight size={14} />
            </Link>
          )}
          <button
            type="button"
            onClick={onSeeDetails}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3.5 text-[13px] font-extrabold text-ink transition-transform active:scale-[0.98] hover:bg-gray-800"
          >
            <Eye size={14} /> See what's included
          </button>
        </div>

        {/* The headcount has moved past the scale that was deliberately
            chosen. Offered, never applied — somebody who picked a small setup
            for a big function made a real choice, and a page that quietly
            undoes it is a page that cannot be trusted with the next one. */}
        {suggested && suggested.id !== tier.id && (
          <button
            type="button"
            onClick={onAdoptSuggested}
            className="mt-2.5 flex w-full items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-left ring-1 ring-black/5 transition-colors hover:bg-white"
          >
            <RefreshCw size={13} className="shrink-0 text-gray-500" />
            <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-gray-600">
              {guestCount.toLocaleString('en-IN')} guests normally points to{' '}
              <strong className="font-extrabold text-gray-900">{suggested.name}</strong>. Keep{' '}
              {tier.name} if that was deliberate, or switch.
            </span>
            <span className={`shrink-0 text-[11px] font-extrabold ${suggested.ink ?? 'text-plum-700'}`}>
              Switch →
            </span>
          </button>
        )}

        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-snug text-gray-500">
          <Sparkles size={10} className="mt-0.5 shrink-0" />
          Every scale is on the page below — this one is simply the one your headcount lands in.
          Nothing is booked and nothing is charged until you approve a final quote.
        </p>
      </div>
    </div>
  )
}
