import { useMemo, useState } from 'react'
import { Check, ChevronRight, Search, Leaf, Drumstick, Flame } from 'lucide-react'
import {
  KITCHEN_TYPES, cuisinesFor, regionsFor, coursesForCuisine, dietOf,
} from '../../data/cateringFunnel'
import { CUISINES, CUISINE_BY_ID } from '../../data/cuisineMenus'
import MenuUpload from './MenuUpload'
import { mergeAdditions } from '../../data/catalogueAdditions'
import { registryCourses } from '../../data/dishRegistry'

/**
 * The catering funnel, on screen.
 *
 * The filtering itself lives in data/cateringFunnel.js so it can be
 * tested without a DOM — which matters, because "a pure-veg kitchen never
 * sees Mughlai" is a claim that should be asserted rather than eyeballed
 * in a screenshot.
 */

/* The icon per kitchen type. Here rather than in the data, because a
   lucide component inside a data file makes that file un-importable in
   node and therefore un-testable. */
const KITCHEN_ICON = { pure_veg: Leaf, both: Flame, pure_nonveg: Drumstick }

/* ══════════════════════════════════════════════════════════════════════
   SLIDE 1 · THE DIETARY GATEKEEPER
   ══════════════════════════════════════════════════════════════════════ */

export function KitchenStep({ value, onChange }) {
  return (
    <div className="space-y-2.5">
      <p className="mb-1 text-[13px] leading-relaxed text-ink-soft">
        This one answer decides everything we show you next. Nothing after
        it will be food you do not cook.
      </p>
      {KITCHEN_TYPES.map(k => {
        const on = value === k.id
        const Icon = KITCHEN_ICON[k.id] ?? Leaf
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onChange(k.id)}
            aria-pressed={on}
            className={`flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left ring-1 transition active:scale-[0.99] ${
              on ? 'bg-forest-50 ring-2 ring-forest-600' : 'bg-white ring-ink/[0.06]'
            }`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              on ? 'bg-forest-600 text-white' : 'bg-ink/[0.04] text-ink-mute'
            }`}>
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold leading-tight text-ink">
                {k.label}
              </span>
              <span className="block text-[12px] leading-snug text-ink-soft">{k.scan}</span>
            </span>
            {on && <Check size={18} className="shrink-0 text-forest-600" />}
          </button>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   SLIDE 2 · THE REGION, THEN THE KITCHEN INSIDE IT
   ══════════════════════════════════════════════════════════════════════

   ── Why this stopped being one flat list of chips ────────────────────

   It was sixteen small pills under region headings. Two things were
   wrong with that, and both were pointed at directly.

   A pill is the wrong size for the decision. "Chettinad" in a rounded
   rectangle is a filter tag; a caterer is being asked whether they cook
   a whole tradition properly, and the control should carry the weight of
   that question — the name, the local name, and a line of what is
   actually in it.

   And "South Indian" is not one cuisine. A flat list either collapses
   Karnataka, Udupi, Tamil, Andhra and Kerala into one word, which is
   useless for matching, or lists all sixteen at once, which is the
   bombarding this whole redesign exists to stop.

   ── So: two levels, one screen ───────────────────────────────────────

   The regions are the cards. Tapping one opens the kitchens inside it,
   right there — no extra screen, no back button, and the stepper keeps
   one honest "Cuisines" dot.

   A caterer who does Karnataka and Kerala but not Andhra taps South
   Indian and says exactly that. One who does no South Indian food never
   sees those five at all.

   ── Closing a region clears what was inside it ───────────────────────

   Deliberate. Leaving the selections behind means a caterer can be
   matched to Chettinad weddings through a closed region they cannot see
   — a claim made on their behalf that they have no way to withdraw. */

/* The scan line under each region is BUILT from the cuisines actually in
   it, not typed out. A hand-written "Karnataka, Udupi, Tamil…" goes
   stale the first time a cuisine is added and nobody notices, because
   nothing about it looks wrong. */
const REGION_EMOJI = {
  'South Indian': '🥥', 'North Indian': '🫓', 'East Indian': '🐟',
  'West Indian': '🥘', 'Dietary': '🌱', 'Asian': '🥢',
  'Western': '🍽', 'Snacks': '🥟', 'Mixed': '🍱',
}

export function CuisineStep({ kitchen, value = [], onChange }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState([])

  const regions = useMemo(() => regionsFor(kitchen), [kitchen])
  const available = useMemo(() => cuisinesFor(kitchen), [kitchen])
  const hidden = CUISINES.length - available.length

  /* Searching skips the two levels entirely. Somebody typing "chettinad"
     knows what they want and should not have to work out which region we
     filed it under. */
  const searching = q.trim().length > 0
  const found = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return available.filter(c =>
      c.name.toLowerCase().includes(t)
      || String(c.localName ?? '').toLowerCase().includes(t)
      || String(c.region ?? '').toLowerCase().includes(t))
  }, [available, q])

  function toggleCuisine(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  function toggleRegion(r) {
    if (open.includes(r.id)) {
      setOpen(open.filter(x => x !== r.id))
      /* and take its cuisines with it — see the note above */
      const inside = new Set(r.items.map(c => c.id))
      onChange(value.filter(id => !inside.has(id)))
    } else {
      setOpen([...open, r.id])
    }
  }

  return (
    <div className="space-y-3.5">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Open the regions you cook, then tick the kitchens inside them. There
        is no limit — a caterer running three counters at one wedding should
        say all three.
      </p>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Or search — Udupi, Chettinad, Awadhi…"
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </div>

      {/* Said plainly rather than silently. A caterer who notices a cuisine
          missing should learn WHY, not wonder whether the app forgot it. */}
      {hidden > 0 && !searching && (
        <p className="rounded-2xl bg-ink/[0.02] px-3.5 py-2.5 text-[12px] leading-snug text-ink-soft">
          {hidden} {hidden === 1 ? 'cuisine is' : 'cuisines are'} hidden because they
          do not fit a {kitchen === 'pure_veg' ? 'pure vegetarian' : 'non-vegetarian'} kitchen.
          Change that answer and they come back.
        </p>
      )}

      {searching ? (
        <div className="space-y-2">
          {found.map(c => (
            <CuisineCard key={c.id} c={c} on={value.includes(c.id)} onTap={() => toggleCuisine(c.id)} />
          ))}
          {!found.length && (
            <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
              Nothing matches “{q}”. Tell us what you cook and we will add it.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {regions.map(r => {
            const isOpen = open.includes(r.id)
            const chosenHere = r.items.filter(c => value.includes(c.id)).length

            return (
              <div
                key={r.id}
                className={`overflow-hidden rounded-[20px] transition ${
                  chosenHere ? 'bg-forest-50 ring-2 ring-forest-600'
                    : isOpen ? 'bg-white ring-1 ring-ink/[0.10]'
                    : 'bg-white ring-1 ring-ink/[0.07]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleRegion(r)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 p-3.5 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.04] text-[21px]">
                    {REGION_EMOJI[r.id] ?? '🍲'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-extrabold text-ink">{r.label}</span>
                      {chosenHere > 0 && (
                        <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10.5px] font-extrabold text-white">
                          {chosenHere}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] leading-snug text-ink-mute">
                      {r.items.map(c => c.name).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className={`shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-ink/[0.06] bg-ink/[0.015] p-2.5">
                    {r.items.map(c => (
                      <CuisineCard
                        key={c.id}
                        c={c}
                        on={value.includes(c.id)}
                        onTap={() => toggleCuisine(c.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * One cuisine, full width.
 *
 * The local name is on it because that is what a caterer calls it —
 * somebody who cooks Arasu Uta every weekend should not have to work out
 * that we have written "Royal Mysuru Feast". The blurb is the scan line:
 * enough to be sure this is the tradition they mean before they claim it.
 */
function CuisineCard({ c, on, onTap }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={on}
      className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${
        on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
           : 'bg-white text-ink ring-1 ring-ink/[0.08]'
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px] ${
        on ? 'bg-white/15' : 'bg-ink/[0.04]'
      }`}>
        {c.emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[14px] font-extrabold leading-tight">{c.name}</span>
          {c.localName && (
            <span className={`text-[11.5px] font-bold ${on ? 'text-white/70' : 'text-ink-mute'}`}>
              {c.localName}
            </span>
          )}
        </span>
        {c.blurb && (
          <span className={`mt-0.5 block text-[11.5px] leading-snug ${on ? 'text-white/75' : 'text-ink-mute'}`}>
            {c.blurb}
          </span>
        )}
      </span>

      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        on ? 'bg-white text-forest-700' : 'ring-1 ring-ink/15'
      }`}>
        {on && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  )
}


/* ══════════════════════════════════════════════════════════════════════
   SLIDE 3 · THE FOCUSED GRID
   ══════════════════════════════════════════════════════════════════════ */

/**
 * A dish picker, folded by course.
 *
 * Used for two different kinds of screen and deliberately does not know
 * which it is on: one cuisine's own courses, or a shared library. The
 * caller decides what to pass, which is what stops the 584-dish South
 * Indian card being repeated under all six South Indian cuisines.
 *
 * ── Three ways to answer, because there are three kinds of caterer ──
 *
 * "All" per course, for the one who really does make 61 palyas.
 *
 * "Tick everything on this screen", asked for twice, and right: a South
 * Indian kitchen with 584 dishes in front of it cannot tap 584 times,
 * and a form that demands it gets abandoned or lied to. The honest
 * counterweight is not a cap — it is that the number is read back as a
 * claim, in large type, above the button that made it. "584 of 584
 * ticked" is a sentence somebody corrects themselves.
 *
 * And a text box, because no list is complete. What a caterer types
 * there is flagged for an operator rather than dropped into the
 * catalogue: the difference between a curated list and a free-text mess
 * is who gets to add to it.
 *
 * ── The menu card, on this screen ──────────────────────────────────
 *
 * A caterer who has their menu printed already should be able to hand it
 * over at the moment they are being asked to type it out, not eight
 * screens later. It is the same MenuUpload used at the end; the state
 * lives in AddItemFlow so it makes no difference which screen it is
 * given on.
 */
/* ── A dish is either a registry row or a bare name ──────────────────
   The registry carries an id, a description and a diet; the older
   libraries are still arrays of strings. Both arrive here, and every
   selection is stored by KEY — the id when there is one.

   Names cannot be matched on. "Arachuvitta Sambar", "Arachuvitta
   sambar" and "Araichuvitta Sambhar" are three caterers cooking one
   dish, and a string comparison finds one of them without saying it
   dropped the other two. So anything that has an id is stored by id, and
   what a caterer ticks becomes an answer dispatch can reason about
   rather than a label. See data/dishRegistry.js. */
const asDish = d => (typeof d === 'string'
  ? { key: d, name: d }
  : { key: d.id, name: d.name, note: d.note, diet: d.diet })

export function DishPickerStep({
  title, blurb, emoji, courses = [], chosen = [], onChange,
  note = '', onNote, uploads, onUploads,
}) {
  const [open, setOpen] = useState(null)
  const picked = new Set(chosen)

  const rows = useMemo(
    () => courses.map(c => ({ ...c, items: c.dishes.map(asDish) })),
    [courses])

  const total = rows.reduce((n, c) => n + c.items.length, 0)
  const mine = rows.reduce((n, c) => n + c.items.filter(d => picked.has(d.key)).length, 0)
  const everything = total > 0 && mine === total

  function toggle(key) {
    onChange(picked.has(key) ? chosen.filter(x => x !== key) : [...chosen, key])
  }
  function toggleCourse(c) {
    const keys = c.items.map(d => d.key)
    const all = keys.every(k => picked.has(k))
    onChange(all
      ? chosen.filter(x => !keys.includes(x))
      : [...new Set([...chosen, ...keys])])
  }
  function toggleScreen() {
    const here = rows.flatMap(c => c.items.map(d => d.key))
    onChange(everything
      ? chosen.filter(x => !here.includes(x))
      : [...new Set([...chosen, ...here])])
  }

  return (
    <>
      <div className="mb-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[15px] font-extrabold leading-tight text-ink">
          {emoji && <span className="mr-1.5">{emoji}</span>}{title}
        </p>
        {blurb && (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{blurb}</p>
        )}
        {/* The count read back as a claim. A number somebody has to look at
            is a number they correct — the honest answer to over-ticking,
            rather than a cap that punishes the honest. */}
        <p className="mt-2 text-[19px] font-extrabold tracking-tight text-ink tabular-nums">
          {mine}
          <span className="ml-1.5 text-[12px] font-bold text-ink-mute">of {total} ticked</span>
        </p>

        {/* Directly under the number it changes, so tapping it and seeing
            "584 of 584" is one glance rather than two screens apart. */}
        {total > 0 && (
          <button
            type="button"
            onClick={toggleScreen}
            className={`mt-2.5 w-full rounded-full py-2.5 text-[13px] font-extrabold transition ${
              everything ? 'bg-ink/[0.05] text-ink-soft' : 'bg-plum-950 text-white'
            }`}
          >
            {everything ? `Clear all ${total}` : `Tick everything on this screen (${total})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {rows.map(c => {
          const n = c.items.filter(d => picked.has(d.key)).length
          const isOpen = open === c.id
          const full = n === c.items.length
          return (
            <div key={c.id} className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.06]">
              <div className="flex items-center gap-2 p-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="text-[14px] font-extrabold leading-tight text-ink">
                      {c.label}
                    </span>
                    {c.nonVeg && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-rose-800">
                        Non-veg
                      </span>
                    )}
                  </span>
                  <span className="block text-[11.5px] text-ink-mute">
                    {c.scan ? `${c.scan} · ` : ''}
                    {n ? `${n} of ${c.items.length}` : c.items.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleCourse(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                    full ? 'bg-forest-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
                  }`}
                >
                  {full ? 'Clear' : 'All'}
                </button>
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </div>

              {isOpen && (
                <div className="border-t border-ink/[0.06] p-3.5">
                  {/* A registry dish carries a line of what it is, and a
                      caterer deciding whether they cook "Menaskai" needs
                      that line more than they need a tighter grid. Bare
                      names stay as chips — there is nothing more to show. */}
                  <div className={c.items.some(d => d.note) ? 'space-y-1.5' : 'flex flex-wrap gap-1.5'}>
                    {c.items.map(d => {
                      const on = picked.has(d.key)
                      return d.note ? (
                        <button
                          key={d.key} type="button" onClick={() => toggle(d.key)} aria-pressed={on}
                          className={`flex w-full items-start gap-2.5 rounded-2xl p-2.5 text-left transition ${
                            on ? 'bg-forest-600 text-white'
                               : 'bg-ink/[0.02] text-ink ring-1 ring-ink/[0.06]'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            on ? 'bg-white text-forest-700' : 'ring-1 ring-ink/15'
                          }`}>
                            {on && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-1.5">
                              <span className="text-[13px] font-extrabold leading-tight">{d.name}</span>
                              {d.diet === 'nonveg' && (
                                <span className={`rounded-full px-1.5 text-[9px] font-extrabold uppercase tracking-wide ${
                                  on ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  Non-veg
                                </span>
                              )}
                            </span>
                            <span className={`mt-0.5 block text-[11px] leading-snug ${
                              on ? 'text-white/75' : 'text-ink-mute'
                            }`}>
                              {d.note}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <button
                          key={d.key} type="button" onClick={() => toggle(d.key)} aria-pressed={on}
                          className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                            on ? 'bg-forest-600 text-white'
                               : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.07]'
                          }`}
                        >
                          {d.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!rows.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          We have no dishes on file for this yet. Tell us what you cook and we
          will add them.
        </p>
      )}

      {/* ── Anything we have not thought of ──────────────────────────────
          No list of 584 is complete, and the dish a caterer is known for
          is exactly the one likeliest to be missing from it. */}
      {onNote && (
        <div className="mt-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[13.5px] font-extrabold text-ink">
            Something you make that is not on the list?
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            Type it here. A person reads these — if it belongs in the list, we
            add it, and every caterer after you gets to tick it.
          </p>
          <textarea
            value={note}
            onChange={e => onNote(e.target.value)}
            rows={3}
            placeholder="Kaipuli gojju, uppu huli saaru, my grandmother's chutney pudi…"
            className="mt-2.5 w-full resize-y rounded-2xl bg-ink/[0.02] p-3 text-[13.5px] leading-relaxed text-ink ring-1 ring-ink/[0.08] placeholder:text-ink-mute"
          />
        </div>
      )}

      {/* ── The printed card, here rather than eight screens later ───── */}
      {onUploads && (
        <div className="mt-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[13.5px] font-extrabold text-ink">
            You already have this printed
          </p>
          <p className="mt-0.5 mb-2.5 text-[12px] leading-relaxed text-ink-soft">
            Photograph your menu card or send the file. We will do the typing
            and show you what we read before anything goes live.
          </p>
          <MenuUpload value={uploads} onChange={onUploads} />
        </div>
      )}
    </>
  )
}

/** One cuisine, its own courses, and nothing belonging to another. */
export function CuisineDishStep({
  cuisineId, kitchen, chosen, onChange, note, onNote, uploads, onUploads,
  additions = [],
}) {
  const cuisine = CUISINE_BY_ID[cuisineId]
  /* The code list, then whatever an operator has added since the last
     deploy folded in. mergeAdditions is a no-op when there are none, and
     the fetch behind them returns [] on every failure — a caterer on a
     patchy connection gets the 840 dishes we already have rather than an
     error. See data/catalogueAdditions.js. */
  /* ── The registry first, where it has this cuisine ─────────────────
     Tamil, Andhra, Kerala, Karnataka and Udupi have registry entries
     with ids, descriptions and an explicit diet, and those are the ones
     dispatch can match a customer's menu card against.

     The rest fall back to cuisineMenus, which is names only. That is a
     real difference and it is not hidden: a cuisine on the old path
     produces a listing that cannot be matched dish-for-dish, and the
     fix is to give it registry entries, not to paper over it here. */
  const fromRegistry = useMemo(
    () => registryCourses(cuisineId, dietOf(kitchen)),
    [cuisineId, kitchen])

  const courses = useMemo(
    () => mergeAdditions(
      fromRegistry.length ? fromRegistry : coursesForCuisine(cuisineId, kitchen),
      additions, cuisineId),
    [cuisineId, kitchen, additions, fromRegistry])
  return (
    <DishPickerStep
      title={cuisine?.name ?? cuisineId}
      blurb={cuisine?.blurb}
      emoji={cuisine?.emoji}
      courses={courses}
      chosen={chosen}
      onChange={onChange}
      note={note}
      onNote={onNote}
      uploads={uploads}
      onUploads={onUploads}
    />
  )
}
