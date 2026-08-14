import { useState, useMemo } from 'react'
import { Check, Users, Sparkles, ArrowRight, ChevronDown, Minus, Plus, Layers } from 'lucide-react'
import { CELEBRATION_TIERS, BESPOKE_TIER } from '../../data/celebrationTiers'
import { tierContentFor } from '../../data/occasionTierContent'
import { tierServicesFor, tiersForOccasion, quoteForOccasion } from '../../data/occasionPackages'
import { formatINR } from '../../utils/format'

/**
 * The scale picker.
 *
 * ── The three problems this shape exists to fix ─────────────────────────
 * 1. The headcount was asked twice. The occasion page has a whole control for
 *    it (GuestScaleDial), and the customer arrives here having already moved
 *    it — then the first thing this step did was ask "How many guests are you
 *    expecting?" as though the last screen had not happened. `prefilled` says
 *    the number came with them, and the control becomes a confirmation with an
 *    edit rather than a fresh question.
 *
 * 2. The answer moved out of sight. A count of 220 lit a card somewhere in a
 *    list of eight, and on a phone that card was usually below the fold — so
 *    the app appeared to decide silently. The match is now stated at the top,
 *    in words, on the colour of the rung it names, with the price and the way
 *    forward on it. Nothing about the customer's scale requires scrolling to
 *    find, and choosing a rung never scrolls the page: the banner rewrites
 *    itself where the customer is already looking.
 *
 * 3. Eight cards with nothing to choose between them. The full ladder is still
 *    here — it has to be, somebody planning for 90 guests may well want the
 *    bigger setup — but it is folded behind one line that says how many there
 *    are and invites the comparison, instead of being eight screens the
 *    customer must scroll past to reach the next step. Each rung carries its
 *    own colour and its own floor price now, so the list is scannable when it
 *    is opened.
 *
 * ── Discrete taps say so ────────────────────────────────────────────────
 * The quick-count chips pass a second argument, and the builder uses it to
 * open the confirmation dialog (see TierMatchDialog). Typing into the field
 * does not — a dialog between "2" and "220" would fire three times on the
 * way to one number.
 *
 * ── The cards describe the occasion, not a wedding ──────────────────────
 * `eventId` comes from the step before this one, and it changes what each rung
 * says it contains, and what it costs. Without one (someone deep-linked
 * straight to /plan/build) the generic copy stands and the price lines are
 * omitted rather than guessed.
 */

/** How much one tap of the stepper moves the count, sized to where you are. */
function stepFor(guests) {
  if (guests < 50) return 5
  if (guests < 200) return 10
  if (guests < 600) return 25
  if (guests < 1500) return 50
  return 100
}

export default function TierLadder({
  eventId, guestCount, onGuestCount, selectedId, onSelect, suggestedId,
  prefilled = false, nextLabel = 'Food', onContinue,
}) {
  const [showAll, setShowAll] = useState(false)
  const [editingCount, setEditingCount] = useState(!prefilled)

  // Every rung priced for this occasion, for the "from" line on each card.
  // Memoised upstream; this is a map lookup after the first call.
  const priced = useMemo(
    () => (eventId ? Object.fromEntries(tiersForOccasion(eventId).map(t => [t.id, t])) : {}),
    [eventId],
  )

  // The chosen rung, priced at the headcount the customer actually gave —
  // never at the rung's typical, which would quote a different event.
  const liveQuote = useMemo(
    () => (eventId && selectedId ? quoteForOccasion(eventId, selectedId, guestCount) : null),
    [eventId, selectedId, guestCount],
  )

  const chosen = CELEBRATION_TIERS.find(t => t.id === selectedId) ?? null
  const chosenContent = chosen && eventId
    ? tierContentFor(eventId, chosen, tierServicesFor(eventId, chosen))
    : chosen
  const fits = chosen && guestCount >= chosen.guests.min && guestCount <= chosen.guests.max
  const step = stepFor(guestCount)

  return (
    <div className="space-y-4">
      {/* ── The headcount ───────────────────────────────────────────────
          One control, two framings. Arriving with a number is the common
          path and it gets the short version: what you told us, a stepper,
          and a way to open the full field. */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <Users size={15} className="text-plum-600" />
              {prefilled ? 'Your headcount' : 'How many guests are you expecting?'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {prefilled
                ? 'Carried over from the last screen — nudge it here if it has changed.'
                : 'A rough number is fine — it moves the price more than anything else, and you can change it later.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onGuestCount(Math.max(1, guestCount - step))}
              disabled={guestCount <= 1}
              aria-label={`Fewer guests, in steps of ${step}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition-transform active:scale-90 disabled:opacity-30"
            >
              <Minus size={15} />
            </button>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={guestCount || ''}
              onChange={e => onGuestCount(Math.max(0, Number(e.target.value) || 0))}
              onFocus={() => setEditingCount(true)}
              aria-label="Expected guest count"
              className="w-[86px] rounded-xl border-2 border-gray-200 px-2 py-2 text-center text-lg font-extrabold text-gray-900 focus:border-saffron-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onGuestCount(guestCount + step)}
              aria-label={`More guests, in steps of ${step}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition-transform active:scale-90"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* The presets stay for anyone who has not been asked yet, and are
            hidden from the customer who already answered this on the screen
            before — that row is the part that read as being asked twice. */}
        {editingCount && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[25, 60, 120, 220, 450, 800].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onGuestCount(n, true)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  guestCount === n
                    ? 'border-plum-700 bg-plum-700 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── "You belong here" ───────────────────────────────────────────
          The whole point of the step, said out loud and priced. It replaces
          a moved highlight the customer had to hunt for with a statement
          they cannot miss, and it carries the way on so that agreeing to
          your scale and moving to the next question is one tap. */}
      {chosen && (
        <div
          className={`plan-chosen-banner overflow-hidden rounded-2xl border ${chosen.surface}`}
          style={{ '--rise-delay': '40ms' }}
        >
          {/* The rung's own colour at full strength, as the strip that names
              the decision. Same token as the card spine — a composed class
              string would be invisible to Tailwind's scanner. */}
          <div className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink ${chosen.spine}`}>
            <Check size={12} /> You belong here
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${chosen.accent}`}>
                {chosen.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold leading-tight text-gray-900">{chosen.name}</h3>
                <p className={`text-sm font-semibold italic ${chosen.ink}`}>{chosen.localName}</p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-gray-700 ring-1 ring-black/5">
                  <Users size={12} className="text-plum-600" />
                  {fits
                    ? `Your ${guestCount} guests sit inside ${chosen.guests.min}–${chosen.guests.max}`
                    : `Built for ${chosen.guests.min}–${chosen.guests.max} guests`}
                </p>
              </div>
            </div>

            {/* The price for THIS scale at THIS headcount. The scale is the
                single biggest lever on the estimate, so agreeing to one
                without seeing what it costs is agreeing to nothing.

                Labelled as the FULL cost of the scale, not as the customer's
                running estimate, and the two are different on purpose. The
                bar at the top of the page has only what has actually been
                chosen in it — at this step that is a coordination fee and
                very little else. Without this line saying which is which,
                the same screen carries ₹4,75,500 here and ₹17,000 up there,
                and a customer is right to read that as one of them lying. */}
            {liveQuote && (
              <div className="mt-3.5 rounded-xl bg-white/85 px-4 py-3 ring-1 ring-black/5">
                {/* The name stands on its own — "a full The Full Celebration"
                    is what prefixing it produces on half the ladder. */}
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                  {chosen.name} — everything in, for {guestCount} guests
                </p>
                <p className="mt-0.5 text-2xl font-extrabold leading-none text-gray-900">
                  {formatINR(liveQuote.range.low)} – {formatINR(liveQuote.range.high)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Food, décor and this scale's services, taxes included — about{' '}
                  {formatINR(liveQuote.perGuest)} a guest. Your own estimate at the top of the page
                  fills up to meet it as you choose each part.
                </p>
              </div>
            )}

            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {(chosenContent?.highlights ?? []).map(h => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <Check size={12} className="mt-0.5 shrink-0 text-green-600" />
                  {h}
                </li>
              ))}
            </ul>

            {/* The forward move, on the card that states the decision. */}
            <button
              type="button"
              onClick={onContinue}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-plum-700 px-4 text-base font-bold text-white shadow-lg shadow-plum-900/20 transition-transform active:scale-[0.98] active:bg-plum-800"
            >
              Yes, that is us — next: {nextLabel}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* ── The rest of the ladder, on request ──────────────────────────
          Said as an invitation with a count on it, because "there are eight
          of these and you are on one of them" is information the customer
          wants and a wall of eight cards is not. */}
      <div>
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
          className="plan-glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-surface-sunk/[0.07]"
        >
          <Layers size={17} className="shrink-0 text-saffron-700" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">
              There are {CELEBRATION_TIERS.length} scales in all
            </span>
            <span className="block text-[11px] leading-snug text-ink-mute">
              {showAll
                ? 'Yours is lit. Tap any other to move to it — the price follows.'
                : `Want to see them side by side? Open the ladder and compare${chosen ? ` — ${chosen.name} stays yours until you pick another` : ''}.`}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-ink-mute transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
          />
        </button>

        {showAll && (
          <div className="mt-3 space-y-3">
            {CELEBRATION_TIERS.map((tier, i) => {
              const selected = selectedId === tier.id
              const suggested = suggestedId === tier.id && !selected
              const content = eventId
                ? tierContentFor(eventId, tier, tierServicesFor(eventId, tier))
                : tier
              const from = priced[tier.id]?.from
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onSelect(tier.id)}
                  aria-pressed={selected}
                  style={{ '--rise-delay': `${i * 45}ms` }}
                  /* The rung's own colour, as a wash out to white plus a
                     saturated spine. Eight white slabs were unreadable as a
                     ladder; eight fully tinted cards were unreadable as text.
                     This is the version that is both. */
                  className={`plan-rise relative w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-all ${tier.surface} ${
                    selected ? 'plan-chosen' : 'hover:-translate-y-0.5 hover:shadow-lg'
                  }`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${tier.spine}`} aria-hidden="true" />

                  {selected && (
                    <span className="block bg-gradient-to-r from-saffron-500 to-amber-500 py-1.5 pl-6 pr-5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                      <Check size={12} className="-mt-0.5 mr-1 inline" />
                      Your scale
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-4 py-4 pl-6 pr-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl ${tier.accent}`}>
                          {tier.emoji}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                        <span className={`text-xs font-semibold italic ${tier.ink}`}>{tier.localName}</span>
                        {tier.popular && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.badge}`}>★ Most booked</span>
                        )}
                        {suggested && (
                          <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[10px] font-bold text-plum-700">
                            Fits your {guestCount} guests
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700">{tier.tagline}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{content.description}</p>

                      <ul className="mt-2.5 space-y-1">
                        {content.highlights.slice(0, 3).map(h => (
                          <li key={h} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <Check size={12} className="mt-0.5 shrink-0 text-green-600" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className={`rounded-lg border px-3 py-1.5 ${tier.accent}`}>
                        <p className="text-[10px] leading-tight text-gray-500">Guests</p>
                        <p className="whitespace-nowrap text-sm font-bold text-gray-800">
                          {tier.guests.min}–{tier.guests.max}
                        </p>
                      </div>
                      {Number.isFinite(from) && (
                        <p className="mt-2 whitespace-nowrap text-[11px] leading-tight text-gray-500">
                          from<br />
                          <strong className={`text-sm font-extrabold ${tier.ink}`}>{formatINR(from)}</strong>
                        </p>
                      )}
                      {!selected && (
                        <span className="mt-2 inline-block text-[11px] font-bold text-plum-700">
                          Choose →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* The honest exit. No price, on purpose — see BESPOKE_TIER. */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 pl-6 shadow-sm ${BESPOKE_TIER.surface}`}>
              <span className={`absolute inset-y-0 left-0 w-1.5 ${BESPOKE_TIER.spine}`} aria-hidden="true" />
              <div className="mb-1 flex items-center gap-2">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl ${BESPOKE_TIER.accent}`}>
                  {BESPOKE_TIER.emoji}
                </span>
                <h3 className="text-lg font-bold text-gray-900">{BESPOKE_TIER.name}</h3>
                <span className={`text-xs font-semibold italic ${BESPOKE_TIER.ink}`}>{BESPOKE_TIER.localName}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">{BESPOKE_TIER.tagline}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{BESPOKE_TIER.description}</p>
              <a
                href="/plan/custom"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-plum-700 hover:text-plum-800"
              >
                <Sparkles size={14} /> Tell us about it instead →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
