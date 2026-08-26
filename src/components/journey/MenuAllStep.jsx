import { useState } from 'react'
import { Check, ChevronDown, Info, Plus, RotateCcw } from 'lucide-react'
import { COURSES, dishesFor } from '../../data/cuisineMenus'
import { StepFrame } from './JourneyChrome'

/**
 * The whole menu on one screen, for the functions that are not a wedding.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The course-per-screen flow is genuinely good and it is staying. Asking
 * "what are they drinking when they walk in?" on its own screen, with a real
 * sentence explaining why it matters, is how somebody planning a four-hundred
 * guest wedding ends up with a spread they chose rather than a package they
 * accepted. For that customer, seven screens is seven decisions worth making.
 *
 * For twenty people at an aksharabhyasa it is seven screens of a form. The
 * family is not designing a banquet; they are feeding the grandparents before
 * school. Six of the seven screens will be answered with whatever we already
 * suggested, and the seventh — the sweets — is the only one anybody had an
 * opinion about.
 *
 * So below the point where the menu is a project, all seven courses go on one
 * screen as sections that open in place. The spread arrives already filled in
 * from the cuisine choice, every section shows what is in it without being
 * opened, and a family who wants to go through it dish by dish still can. The
 * honest default is one tap.
 *
 * `menuModeFor()` in data/celebrationBlueprints.js decides which flow a
 * customer gets, on headcount rather than on occasion — because the same
 * occasion at forty guests and at four hundred genuinely is a different
 * amount of deciding.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS NOT DIFFERENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The rules. Going over the included count is still allowed and still says
 * what it costs, in the same words, for the same reason: a surcharge nobody
 * was warned about is worse at the reveal than a number was early. Tapping a
 * dish still opens what it goes with. Nothing here is a cut-down menu — it is
 * the same menu, asked once.
 */
export default function MenuAllStep({
  cuisine, vegOnly, menu, allowance, extraRate, onToggleDish, onResetCourse, onOpenDish,
}) {
  // Opening on the sweets rather than on nothing: it is the course families
  // actually have an opinion about, and an accordion where every section is
  // shut reads as a page that has not loaded.
  const [open, setOpen] = useState(() => new Set(['sweets']))

  const shown = COURSES.filter(
    c => (allowance?.[c.id] ?? 0) > 0 || (menu?.[c.id] ?? []).length > 0,
  )

  const total = shown.reduce((n, c) => n + (menu?.[c.id]?.length ?? 0), 0)
  const over = shown.reduce(
    (n, c) => n + Math.max(0, (menu?.[c.id]?.length ?? 0) - (allowance?.[c.id] ?? 0)), 0,
  )

  function toggleSection(id) {
    setOpen(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <StepFrame
      overline={`The menu · ${cuisine.name}`}
      question="Here is the spread. Change anything you like."
      why="Already filled in from the cuisine you chose — this is what we would send if you said nothing else. Open any course to swap a dish, or leave it exactly as it is."
      footnote="Tap a dish to see what it is traditionally served with."
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk/[0.06] px-3 py-1.5 text-[11.5px] font-extrabold text-ink-soft">
          {total} dishes chosen
        </span>
        {over > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11.5px] font-extrabold text-amber-800 ring-1 ring-amber-200">
            <Info size={12} /> {over} over — ₹{over * extraRate} a plate extra
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {shown.map(course => {
          const chosen = menu?.[course.id] ?? []
          const allowed = allowance?.[course.id] ?? 0
          const dishes = dishesFor(cuisine, course.id, { vegOnly })
          const isOpen = open.has(course.id)
          const courseOver = Math.max(0, chosen.length - allowed)

          return (
            <div
              key={course.id}
              className={`overflow-hidden rounded-[22px] bg-white transition-all ${
                isOpen ? 'ring-2 ring-saffron-400' : 'ring-1 ring-hairline/[0.12]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(course.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.995]"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[14px] font-extrabold leading-snug text-ink">{course.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      courseOver > 0
                        ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                        : 'bg-surface-sunk/[0.06] text-ink-mute'
                    }`}>
                      {chosen.length}{allowed > 0 ? ` of ${allowed}` : ' extra'}
                    </span>
                  </span>
                  {/* What is in it, without opening it. The whole point of
                      collapsing this screen is lost if reading the spread
                      still costs seven taps. */}
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft">
                    {chosen.length
                      ? dishes.filter(d => chosen.includes(d.id)).map(d => d.name).join(', ')
                      : <span className="text-ink-mute">{course.hint} — nothing chosen</span>}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={`mt-0.5 shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.02] p-3">
                  {allowed === 0 && (
                    <p className="mb-2.5 flex items-start gap-2 rounded-xl bg-surface-sunk/[0.05] px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
                      <Info size={13} className="mt-0.5 shrink-0 text-ink-mute" />
                      Not part of the spread at this size — anything here is ₹{extraRate} a plate on
                      top. Plenty of families do add one.
                    </p>
                  )}
                  {courseOver > 0 && (
                    <p className="mb-2.5 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11.5px] leading-snug text-amber-800 ring-1 ring-amber-100">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      {courseOver} more than this size includes — ₹{courseOver * extraRate} a plate
                      extra, counted at the end. Nothing is being blocked.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {dishes.map(dish => {
                      const picked = chosen.includes(dish.id)
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => onToggleDish(course.id, dish.id, dish)}
                          aria-pressed={picked}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.995] ${
                            picked ? 'bg-white ring-2 ring-teal-400' : 'bg-white ring-1 ring-hairline/[0.1]'
                          }`}
                        >
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded ${
                            picked ? 'bg-teal-600 text-white' : 'ring-2 ring-hairline/20'
                          }`}>
                            {picked ? <Check size={12} strokeWidth={3.2} /> : <Plus size={11} className="text-ink-mute" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className={dish.veg ? 'text-green-600' : 'text-red-600'}>●</span>
                              <span className="truncate text-[13.5px] font-bold text-ink">{dish.name}</span>
                            </span>
                          </span>
                          {dish.delta > 0 && (
                            <span className="shrink-0 rounded-full bg-plum-50 px-2 py-0.5 text-[10px] font-extrabold text-plum-700">
                              +₹{dish.delta}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onResetCourse(course.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold text-ink-mute transition-colors hover:bg-surface-sunk/[0.06]"
                    >
                      <RotateCcw size={12} /> Back to our suggestion
                    </button>
                    {chosen.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const first = dishes.find(d => chosen.includes(d.id))
                          if (first) onOpenDish(course.id, first)
                        }}
                        className="rounded-full px-3 py-1.5 text-[11.5px] font-bold text-plum-700 transition-colors hover:bg-plum-50"
                      >
                        What goes with these? →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </StepFrame>
  )
}
