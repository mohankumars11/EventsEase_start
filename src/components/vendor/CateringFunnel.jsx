import { useMemo, useState } from 'react'
import { Check, ChevronRight, Search, Leaf, Drumstick, Flame } from 'lucide-react'
import {
  KITCHEN_TYPES, cuisinesFor, cuisinesByRegion, coursesForCuisine,
} from '../../data/cateringFunnel'
import { CUISINES, CUISINE_BY_ID } from '../../data/cuisineMenus'

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
   SLIDE 2 · THE CUISINE LOCK
   ══════════════════════════════════════════════════════════════════════ */

export function CuisineStep({ kitchen, value = [], onChange }) {
  const [q, setQ] = useState('')
  const available = useMemo(() => cuisinesFor(kitchen), [kitchen])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return available
    return available.filter(c =>
      c.name.toLowerCase().includes(t)
      || String(c.localName ?? '').toLowerCase().includes(t)
      || String(c.region ?? '').toLowerCase().includes(t))
  }, [available, q])

  const groups = useMemo(() => cuisinesByRegion(shown), [shown])
  const hidden = CUISINES.length - available.length

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Tick every one you cook properly. There is no limit — a caterer who
        runs three counters at one wedding should say so.
      </p>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search — Udupi, Chettinad, Awadhi…"
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </div>

      {/* Said plainly rather than silently. A caterer who notices a cuisine
          missing should learn WHY, not wonder whether the app forgot it. */}
      {hidden > 0 && (
        <p className="rounded-2xl bg-ink/[0.02] px-3.5 py-2.5 text-[12px] leading-snug text-ink-soft">
          {hidden} {hidden === 1 ? 'cuisine is' : 'cuisines are'} hidden because they
          do not fit a {kitchen === 'pure_veg' ? 'pure vegetarian' : 'non-vegetarian'} kitchen.
          Change that answer and they come back.
        </p>
      )}

      {groups.map(g => (
        <div key={g.region}>
          <p className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
            {g.region}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(c => {
              const on = value.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={on}
                  className={`rounded-full px-3.5 py-2 text-left text-[13px] font-bold transition ${
                    on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                       : 'bg-white text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  <span className="mr-1">{c.emoji}</span>{c.name}
                  {on && c.localName && (
                    <span className="ml-1.5 font-semibold opacity-70">{c.localName}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!shown.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          Nothing matches “{q}”. Tell us what you cook and we will add it.
        </p>
      )}
    </div>
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
 * "All" stays per course — a caterer who really does make 61 palyas
 * should not tick 61 boxes — but there is deliberately no single tap that
 * claims a whole screen, because that is the Check All trap with one
 * button on it.
 */
export function DishPickerStep({ title, blurb, emoji, courses = [], chosen = [], onChange }) {
  const [open, setOpen] = useState(null)
  const picked = new Set(chosen)

  const total = courses.reduce((n, c) => n + c.dishes.length, 0)
  const mine = courses.reduce((n, c) => n + c.dishes.filter(d => picked.has(d)).length, 0)

  function toggle(name) {
    onChange(picked.has(name) ? chosen.filter(x => x !== name) : [...chosen, name])
  }
  function toggleCourse(c) {
    const all = c.dishes.every(d => picked.has(d))
    onChange(all
      ? chosen.filter(x => !c.dishes.includes(x))
      : [...new Set([...chosen, ...c.dishes])])
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
      </div>

      <div className="space-y-2">
        {courses.map(c => {
          const n = c.dishes.filter(d => picked.has(d)).length
          const isOpen = open === c.id
          const full = n === c.dishes.length
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
                    {n ? `${n} of ${c.dishes.length}` : c.dishes.length}
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
                <div className="flex flex-wrap gap-1.5 border-t border-ink/[0.06] p-3.5">
                  {c.dishes.map(d => {
                    const on = picked.has(d)
                    return (
                      <button
                        key={d} type="button" onClick={() => toggle(d)} aria-pressed={on}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                          on ? 'bg-forest-600 text-white'
                             : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.07]'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!courses.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          We have no dishes on file for this yet. Tell us what you cook and we
          will add them.
        </p>
      )}
    </>
  )
}

/** One cuisine, its own courses, and nothing belonging to another. */
export function CuisineDishStep({ cuisineId, kitchen, chosen, onChange }) {
  const cuisine = CUISINE_BY_ID[cuisineId]
  const courses = useMemo(() => coursesForCuisine(cuisineId, kitchen), [cuisineId, kitchen])
  return (
    <DishPickerStep
      title={cuisine?.name ?? cuisineId}
      blurb={cuisine?.blurb}
      emoji={cuisine?.emoji}
      courses={courses}
      chosen={chosen}
      onChange={onChange}
    />
  )
}
