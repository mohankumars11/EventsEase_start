import { useEffect, useRef } from 'react'
import { Minus, Plus, Users, Phone } from 'lucide-react'
import { GUEST_CIRCLES, circleForGuests, dishCountFor, MAX_PRICEABLE_GUESTS } from '../../data/guestCircles'
import { SERVICE_PACKS, PACK_BY_ID } from '../../data/servicePacks'
import { BRAND } from '../../config/sambramo'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/* ══════════════════════════════════════════════════════════════════════
   1 · THE HEADCOUNT
   ══════════════════════════════════════════════════════════════════════

   The first question, and the right one: it is the only answer that changes
   every other answer. How many plates, how big a stage, whether there is a
   generator, whether the food is a leaf meal in sittings or a standing
   buffet — all of it follows from this number and nothing else does anything
   useful without it.

   It is also the question a family can answer immediately, which is why it
   goes first. Opening on "what is your budget" or "which package" asks
   somebody to have already made the decision they came here to make. */

const PRESETS = [25, 60, 120, 250, 500, 1000]

export function GuestStep({ guests, onGuests }) {
  const circle = circleForGuests(guests)
  const beyond = guests > MAX_PRICEABLE_GUESTS

  function nudge(by) {
    const step = guests >= 500 ? 50 : guests >= 150 ? 25 : guests >= 50 ? 10 : 5
    onGuests(Math.max(10, Math.min(9999, guests + by * step)))
  }

  return (
    <StepFrame
      overline="Who is coming"
      question="How many people are you expecting?"
      why="A rough number is fine — it can change later, and your coordinator will confirm the final count a week before. Everything below is shaped by this one answer."
    >
      <div className="a-card p-5">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Fewer guests"
            onClick={() => nudge(-1)}
            className="grid h-12 w-12 place-items-center rounded-full bg-surface-sunk/[0.06] text-ink-soft transition-transform active:scale-95"
          >
            <Minus size={20} />
          </button>
          <label className="flex flex-col items-center">
            <span className="sr-only">Number of guests</span>
            <input
              type="number"
              inputMode="numeric"
              value={guests}
              min={10}
              max={9999}
              onChange={e => onGuests(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
              onBlur={e => { if ((Number(e.target.value) || 0) < 10) onGuests(10) }}
              className="w-[5.5ch] border-0 bg-transparent text-center font-serif text-[46px] font-extrabold tabular-nums leading-none text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute">guests</span>
          </label>
          <button
            type="button"
            aria-label="More guests"
            onClick={() => nudge(1)}
            className="grid h-12 w-12 place-items-center rounded-full bg-surface-sunk/[0.06] text-ink-soft transition-transform active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {PRESETS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onGuests(n)}
              aria-pressed={guests === n}
              className="a-chip"
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* The read-back. Not a price, and deliberately not one: this is the
          app showing it understood the answer, which is what earns the next
          question. A number here instead would turn "how many are coming"
          into "how much will this cost", four taps into a nine-minute flow,
          and the whole point of the flow is that it does not do that. */}
      {beyond ? (
        <div className="a-card mt-4 p-5">
          <p className="text-[14px] font-extrabold text-ink">That is a very large gathering.</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Past about {MAX_PRICEABLE_GUESTS.toLocaleString('en-IN')} guests, an automatic estimate
            stops being honest — a function that size is planned around the venue, and the number
            depends on things nobody can guess from a form. Carry on if you like, or talk to us
            directly and we will scope it properly.
          </p>
          <a
            href={`tel:${BRAND.supportPhone.replace(/\s/g, '')}`}
            className="a-btn-ghost mt-3.5 w-full text-[13.5px]"
          >
            <Phone size={15} /> {BRAND.supportPhone}
          </a>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-sunk/[0.05] px-4 py-3.5">
          <span aria-hidden="true" className="text-[22px] leading-none">{circle.emoji}</span>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-extrabold text-ink">
              That is a {circle.name} celebration
            </span>{' '}
            <span className="text-ink-mute">({circle.localName})</span> — {circle.reads.toLowerCase()}
          </p>
        </div>
      )}
    </StepFrame>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2 · THE CIRCLE
   ══════════════════════════════════════════════════════════════════════

   Four options, and only four.

   The pricing ladder underneath has eight rungs and needs them — the
   economics of thirty plates and three thousand are genuinely different. But
   eight is not a question, it is a comprehension test: "The Full Celebration"
   and "Special Day" read as the same thing on a phone, and a customer asked
   to tell them apart before they have chosen anything will pick neither.
   Four gatherings anybody can recognise on sight, and the rung is resolved
   underneath from the real headcount. See data/guestCircles.js.

   The circle matching the number is pre-selected, and moving to a different
   one carries the headcount with it — because somebody deliberately tapping
   "Full House" after typing 120 is telling us they expect the hall to fill,
   and the app should believe them rather than argue. */

export function CircleStep({ guests, circleId, onCircle, onGuests }) {
  const suggested = circleForGuests(guests)
  const scrolledFor = useRef(null)

  // Preselect on arrival, once, so the step opens on an answer rather than on
  // four blanks. Never re-runs for a circle the customer chose themselves.
  useEffect(() => {
    if (!circleId) onCircle(suggested.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(circle) {
    onCircle(circle.id)
    // Only when the current number is genuinely outside the circle. Snapping
    // 140 to 110 because somebody tapped the circle it was already in would
    // overwrite a number they typed deliberately.
    if (guests < circle.guests.min || guests > circle.guests.max) {
      onGuests(circle.guests.typical)
    }
    scrolledFor.current = circle.id
  }

  return (
    <StepFrame
      overline="The shape of it"
      question="Which of these is your celebration?"
      why={`We have picked the one that matches ${guests} guests. Change it if your celebration feels like a different size — it decides how big the spread is, how much of a stage there is, and how many people we put on the day.`}
    >
      <div className="space-y-3">
        {GUEST_CIRCLES.map(circle => {
          const selected = circleId === circle.id
          return (
            <button
              key={circle.id}
              type="button"
              onClick={() => choose(circle)}
              aria-pressed={selected}
              className={`relative flex w-full overflow-hidden rounded-[24px] text-left transition-all active:scale-[0.995] ${
                selected
                  ? 'shadow-[0_12px_32px_-18px_rgba(42,30,20,0.5)] ring-2 ring-saffron-400'
                  : 'ring-1 ring-hairline/[0.12]'
              } ${circle.surface}`}
            >
              {/* The one place this circle's colour runs at full strength. */}
              <span aria-hidden="true" className={`w-1 shrink-0 ${circle.spine}`} />

              <span className="min-w-0 flex-1 p-4">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-[20px] leading-none">{circle.emoji}</span>
                  <span className="text-[15px] font-extrabold leading-tight text-ink">{circle.name}</span>
                  <span className={`text-[12px] font-bold ${circle.ink}`}>{circle.localName}</span>
                  {suggested.id === circle.id && !selected && (
                    <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-ink-soft">
                      Matches {guests}
                    </span>
                  )}
                </span>

                <span className="mt-1 block text-[12.5px] font-semibold text-ink-soft">
                  {circle.tagline}
                </span>
                <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-mute">
                  {circle.description}
                </span>

                <span className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-bold text-ink-soft">
                    <Users size={10} /> {circle.guests.min}–{circle.guests.max} guests
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-bold text-ink-soft">
                    {dishCountFor(circle.id)}-dish spread
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-bold text-ink-soft">
                    {circle.venueHint}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </StepFrame>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3 · WHERE
   ══════════════════════════════════════════════════════════════════════

   Asked here rather than at the end, because it is not admin — it changes
   what the rest of the flow offers. A lawn or a marquee turns on the
   generator, the misting fans and the portable washrooms further down; a
   banquet hall turns them off. Asking at the end would mean either offering
   a generator to everybody or to nobody, and both are wrong.

   "I have my own place" and "already booked" are first-class answers, not
   an escape hatch. A large share of gruha praveshas and namakaranas happen
   at home, and a flow that treats that as the exception makes those families
   feel like they are using it wrong. */

export const OWN_VENUE = 'own_venue'
export const BOOKED_VENUE = 'booked_venue'

/** Venue answers that put the function outdoors, which gates the groundwork. */
const OUTDOOR_PACKS = new Set(['venue_lawn', 'venue_resort'])

export function outdoorFor(venueChoice) {
  return OUTDOOR_PACKS.has(venueChoice)
}

export function VenueStep({ value, onChange, city, onOpenCityPicker }) {
  const packs = (SERVICE_PACKS.venue?.packs ?? []).map(p => p.id).map(id => PACK_BY_ID[id])

  return (
    <StepFrame
      overline="Where"
      question="Where is it happening?"
      why="This decides more than it looks: an outdoor function needs power, fans and washrooms that a banquet hall already has. Tell us now and we only ask about the things you actually need."
      footnote={`Everything is arranged in ${city}. Change your city from the home screen if that is wrong.`}
    >
      <div className="space-y-2.5">
        <OptionCard
          emoji="🏠"
          name="At home, or our own place"
          desc="Your house, the terrace, or the apartment clubhouse. No hire charge — we survey the space and plan the layout around your furniture."
          includes={['Site visit and layout plan', 'Power and access check', 'Society coordination', 'Furniture moved and put back']}
          selected={value === OWN_VENUE}
          onToggle={() => onChange(OWN_VENUE)}
        />
        <OptionCard
          emoji="✅"
          name="We have already booked a venue"
          desc="Tell your coordinator which one and we work to its rules, its timings and its restrictions."
          selected={value === BOOKED_VENUE}
          onToggle={() => onChange(BOOKED_VENUE)}
        />

        <p className="pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
          Or let us find one
        </p>

        {packs.filter(p => p && p.id !== 'venue_home').map(pack => (
          <OptionCard
            key={pack.id}
            emoji={pack.emoji}
            name={pack.name}
            desc={pack.blurb}
            includes={pack.includes}
            note={pack.note}
            selected={value === pack.id}
            onToggle={() => onChange(pack.id)}
          />
        ))}
      </div>

      {onOpenCityPicker && (
        <button
          type="button"
          onClick={onOpenCityPicker}
          className="mt-4 w-full rounded-2xl bg-surface-sunk/[0.05] px-4 py-3 text-[12.5px] font-bold text-ink-soft"
        >
          Planning somewhere other than {city}? Change city
        </button>
      )}
    </StepFrame>
  )
}
