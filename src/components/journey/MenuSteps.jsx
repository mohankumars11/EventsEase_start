import { useMemo } from 'react'
import { Check, Leaf, RotateCcw, Plus, Info } from 'lucide-react'
import {
  CUISINES, CUISINE_BY_ID, COURSES, dishesFor,
} from '../../data/cuisineMenus'
import { StepFrame } from './JourneyChrome'

/* ══════════════════════════════════════════════════════════════════════
   1 · THE CUISINE
   ══════════════════════════════════════════════════════════════════════

   Seventeen spreads, shown as cards rather than as a dropdown.

   A <select> was the old answer and it was wrong in a specific way: it made
   "Karnataka Traditional" and "Multi-Cuisine Grand Buffet" look like the same
   kind of thing at the same level of commitment, and it hid fifteen of the
   seventeen behind a tap. Food is the single thing guests talk about
   afterwards, and it was the one decision the app presented as a form field.

   ── The ordering is the recommendation ────────────────────────────────
   Each occasion names the cuisines that lead for it (`cuisineLead` in
   celebrationBlueprints.js) — a namakarana opens on Karnataka Traditional and
   Udupi, a sangeet opens on North Indian and Mughlai. Everything else is
   still there, grouped by region, in the same list. Nothing is hidden; the
   order simply stops a Mysuru family scrolling past Continental & Italian to
   find their own food. */

export function CuisineStep({ cuisineId, onCuisine, lead = [], vegOnly, onVegOnly }) {
  const ordered = useMemo(() => {
    const leadSet = new Set(lead)
    const first = lead.map(id => CUISINE_BY_ID[id]).filter(Boolean)
    const rest = CUISINES.filter(c => !leadSet.has(c.id))
    return { first, rest }
  }, [lead])

  const cuisine = CUISINE_BY_ID[cuisineId]

  return (
    <StepFrame
      overline="The food"
      question="What are we cooking?"
      why="This is the part your guests will still be talking about next month. Pick a kitchen and the entire spread opens up — every course, every dish, already arranged into a sensible menu you can change."
    >
      {ordered.first.length > 0 && (
        <>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            Usually chosen for this occasion
          </p>
          <div className="mb-5 grid grid-cols-2 gap-2.5">
            {ordered.first.map(c => (
              <CuisineCard key={c.id} cuisine={c} selected={cuisineId === c.id} onSelect={() => onCuisine(c.id)} />
            ))}
          </div>
        </>
      )}

      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
        Everything else we cook
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {ordered.rest.map(c => (
          <CuisineCard key={c.id} cuisine={c} selected={cuisineId === c.id} onSelect={() => onCuisine(c.id)} />
        ))}
      </div>

      {/* The diet switch belongs with the cuisine, not three screens later:
          choosing it afterwards means rebuilding a menu the customer has
          already looked at, and watching half of it vanish. */}
      {cuisine?.hasNonVeg && (
        <div className="mt-5 rounded-2xl bg-surface-sunk/[0.05] p-4">
          <p className="text-[13px] font-extrabold text-ink">How is it being served?</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onVegOnly(true)}
              aria-pressed={vegOnly}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-colors ${
                vegOnly ? 'bg-green-600 text-white' : 'bg-white text-ink-soft ring-1 ring-hairline/[0.12]'
              }`}
            >
              <Leaf size={14} /> Pure vegetarian
            </button>
            <button
              type="button"
              onClick={() => onVegOnly(false)}
              aria-pressed={!vegOnly}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-colors ${
                !vegOnly ? 'bg-chilli-600 text-white' : 'bg-white text-ink-soft ring-1 ring-hairline/[0.12]'
              }`}
            >
              🍗 Veg &amp; non-veg
            </button>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mute">
            Non-veg is cooked on a separate line with separate vessels. Say so in the special
            requests if it needs to be a separate kitchen entirely.
          </p>
        </div>
      )}
    </StepFrame>
  )
}

function CuisineCard({ cuisine, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col rounded-[20px] p-3.5 text-left transition-all active:scale-[0.98] ${
        selected
          ? 'bg-white shadow-[0_10px_26px_-16px_rgba(42,30,20,0.45)] ring-2 ring-saffron-400'
          : 'bg-white ring-1 ring-hairline/[0.12]'
      }`}
    >
      <span className="flex items-start justify-between gap-1">
        <span aria-hidden="true" className="text-[24px] leading-none">{cuisine.emoji}</span>
        {selected && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-saffron-500 text-white">
            <Check size={12} strokeWidth={3.2} />
          </span>
        )}
      </span>
      <span className="mt-2 text-[13px] font-extrabold leading-tight text-ink">{cuisine.name}</span>
      {cuisine.localName && (
        <span className="text-[11px] font-bold text-saffron-700">{cuisine.localName}</span>
      )}
      <span className="mt-1 text-[11px] leading-snug text-ink-mute line-clamp-3">{cuisine.blurb}</span>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2 · ONE COURSE AT A TIME
   ══════════════════════════════════════════════════════════════════════

   Seven courses, seven screens, rather than one page of forty tick boxes.

   The old menu builder put the whole spread on a single scroll, which is
   correct as a catalogue and exhausting as a decision. Broken into courses it
   becomes seven small, obvious questions — "what are they drinking when they
   arrive", "what goes round with the drinks", "rice or rotis" — each of which
   a person can answer in ten seconds on a phone.

   ── Why it opens already filled in ────────────────────────────────────
   Because a family should never be looking at an empty menu wondering what a
   Mysuru wedding is supposed to have on it. The circle's allowance is
   pre-ticked from the top of each course, which is a complete, sensible
   spread they could serve as-is, and every swap is one tap.

   ── Over the allowance is allowed, and priced ─────────────────────────
   Never refused. A family that wants one more sweet should be able to have
   it; being told "upgrade your package to add jalebi" is the moment somebody
   closes the app and rings a caterer. What the extra costs is stated here in
   per-plate terms — the only place in this flow where a number appears before
   the reveal, because a surcharge the customer was not told about is worse
   than an early number. */

export function CourseStep({
  course, cuisine, vegOnly, menu, allowance, onToggleDish, onResetCourse, onOpenDish, extraRate,
}) {
  const dishes = dishesFor(cuisine, course.id, { vegOnly })
  const chosen = menu?.[course.id] ?? []
  const allowed = allowance?.[course.id] ?? 0
  const over = Math.max(0, chosen.length - allowed)

  return (
    <StepFrame
      overline={`The menu · ${cuisine.name}`}
      question={courseQuestion(course.id)}
      why={courseWhy(course.id)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ${
            over > 0 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-surface-sunk/[0.06] text-ink-soft'
          }`}
        >
          {chosen.length} chosen
          {allowed > 0 && <span className="font-bold text-ink-mute">· {allowed} included</span>}
        </span>
        <button
          type="button"
          onClick={onResetCourse}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold text-ink-mute transition-colors hover:bg-surface-sunk/[0.06]"
        >
          <RotateCcw size={12} /> Back to our suggestion
        </button>
      </div>

      {allowed === 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-surface-sunk/[0.05] px-3.5 py-2.5 text-[11.5px] leading-snug text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0 text-ink-mute" />
          Not part of the spread at this size — anything you add here is ₹{extraRate} a plate on top.
          Plenty of families do add one.
        </p>
      )}
      {over > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11.5px] leading-snug text-amber-800 ring-1 ring-amber-100">
          <Info size={13} className="mt-0.5 shrink-0" />
          {over} more than this size includes — that is ₹{over * extraRate} a plate extra, and it is
          counted in your estimate at the end. Nothing is being blocked.
        </p>
      )}

      <div className="space-y-2">
        {dishes.map(dish => {
          const picked = chosen.includes(dish.id)
          return (
            <button
              key={dish.id}
              type="button"
              onClick={() => onToggleDish(course.id, dish.id, dish)}
              aria-pressed={picked}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.995] ${
                picked
                  ? 'bg-white shadow-[0_8px_22px_-16px_rgba(42,30,20,0.4)] ring-2 ring-teal-400'
                  : 'bg-white ring-1 ring-hairline/[0.1]'
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                  picked ? 'bg-teal-600 text-white' : 'ring-2 ring-hairline/20'
                }`}
              >
                {picked ? <Check size={13} strokeWidth={3.2} /> : <Plus size={12} className="text-ink-mute" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={dish.veg ? 'text-green-600' : 'text-red-600'}>●</span>
                  <span className="truncate text-[14px] font-bold text-ink">{dish.name}</span>
                </span>
                {dish.note && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-mute">{dish.note}</span>
                )}
              </span>
              {dish.delta > 0 && (
                <span className="shrink-0 rounded-full bg-plum-50 px-2 py-0.5 text-[10.5px] font-extrabold text-plum-700">
                  +₹{dish.delta}/plate
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* The nudge that makes the pairing sheet discoverable for anybody who
          arrived by ticking rather than by tapping a dish they care about. */}
      {chosen.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const first = dishes.find(d => chosen.includes(d.id))
            if (first) onOpenDish(course.id, first)
          }}
          className="mt-4 w-full rounded-2xl bg-surface-sunk/[0.05] px-4 py-3 text-[12.5px] font-bold text-plum-700"
        >
          What goes with these? →
        </button>
      )}
    </StepFrame>
  )
}

/* The question, per course. Written as the sentence somebody would actually
   say, because "Curries & gravies" is a heading and "What are the rotis being
   eaten with?" is a question a person can answer without thinking. */
function courseQuestion(id) {
  return {
    welcome: 'What are they drinking when they walk in?',
    starters: 'What is going round while people arrive?',
    mains: 'Rice, rotis, or both?',
    curries: 'And what goes with it?',
    accompaniments: 'What else is on the leaf?',
    sweets: 'How does the meal finish?',
    counters: 'A chef cooking in front of your guests?',
  }[id] ?? 'What would you like?'
}

function courseWhy(id) {
  return {
    welcome:
      'A cold drink in the hand at the door is the cheapest hospitality there is, and the first thing a guest actually feels.',
    starters:
      'This is the awkward half hour while people arrive and nobody has sat down. Something passed round fixes it.',
    mains:
      'The base of the meal. A mixed crowd usually wants one rice and one bread — the elders will go for the rice.',
    curries:
      'The dish everybody judges the caterer on. Two is the usual answer: one rich, one lighter.',
    accompaniments:
      'Palya, kosambari, papad, pickle, curd. Small things, and their absence is noticed before anything else on the leaf.',
    sweets:
      'The last thing they eat and the one they mention on the way out. Worth one more than you think.',
    counters:
      'A live counter is where the queue forms and the photographs happen. It is the difference between food and an occasion.',
  }[id] ?? ''
}

/** Which courses this circle actually gets a screen for. */
export function courseStepsFor(allowance, menu) {
  return COURSES.filter(c => (allowance?.[c.id] ?? 0) > 0 || (menu?.[c.id] ?? []).length > 0)
}
