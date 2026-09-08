import React, { useMemo, useState } from 'react'
import { Check, ChevronDown, UtensilsCrossed } from 'lucide-react'
import { menuDishGroups, coveredMenus, menuProgress } from '../../lib/menuCoverage'

/**
 * What a caterer cooks, asked as dishes rather than as our packaging.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Four cards headed "Option 1 · Everyday feast · from ₹450 a plate ·
 * min 100", with a tick box each — the customer's menu, the customer's
 * price, the customer's minimum, shown to the person who cooks it.
 *
 * A caterer is not choosing an option. Ticking Option 2 meant accepting
 * sixteen dishes as a block, so a kitchen that cooks fifteen of them had
 * two bad answers and no good one: tick it and hope nobody orders the
 * sixteenth, or leave it and vanish from a card they could nearly serve.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SO THE SCREEN IS THE DISHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Grouped the way a meal is served — welcome, starters, rice and breads,
 * curries, sides, sweets — with a tick against each, Select all on every
 * group, and one Select all at the top for a kitchen that does the lot.
 *
 * The cards are then worked out rather than asked about. Tick everything
 * on Option 2 and Option 2 turns green, and the count says how far off
 * the others are: "Option 3 · 14 of 17". That number is the useful one —
 * it tells a caterer that three more ticks put them on another card,
 * which is a thing they can act on.
 *
 * ── Folded, and Continue never blocks ────────────────────────────────
 * A hundred tick boxes open at once is not a form. Every course is shut
 * until opened, and a caterer who wants to come back to it on a slow
 * afternoon can — the screen is not a gate.
 */
export default function MenuDishStep({
  menus, picked, onChange, onMenusChange, linesOf, counters, chosenCounters, onToggleCounter,
}) {
  const [open, setOpen] = useState(null)
  const groups = useMemo(() => menuDishGroups(menus, linesOf), [menus, linesOf])
  const have = useMemo(() => new Set(picked), [picked])

  const all = useMemo(() => groups.flatMap(g => g.dishes.map(d => d.id)), [groups])
  const allOn = all.length > 0 && all.every(id => have.has(id))

  /* The cards this adds up to, recomputed on every tick. Handed upward so
     the rate screen and the saved listing keep speaking in menu ids —
     nothing downstream knows this screen changed. */
  const covered = useMemo(
    () => coveredMenus(menus, picked, linesOf), [menus, picked, linesOf])

  React.useEffect(() => { onMenusChange(covered) }, [covered.join('|')]) // eslint-disable-line

  function toggle(id) {
    onChange(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function toggleGroup(g) {
    const ids = g.dishes.map(d => d.id)
    const on = ids.every(id => have.has(id))
    onChange(prev => (on
      ? prev.filter(x => !ids.includes(x))
      : [...new Set([...prev, ...ids])]))
  }

  if (!menus.length) {
    return (
      <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
        Pick your cuisines on the last screen and the dishes for them
        appear here.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Tick every dish you can cook. We work out which menu cards that
          covers — you never have to take a whole card you cannot serve.
        </p>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : all)}
          className="shrink-0 rounded-full bg-forest-600 px-3.5 py-1.5 text-[12px] font-extrabold text-white"
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {/* ── What the ticks add up to ─────────────────────────────────
          Read back as a count of a count, because "you cover 2 cards"
          is a claim and "Option 3 · 14 of 17" is a thing to act on. */}
      <div className="mb-3 rounded-[20px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
          Menu cards you can serve
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {menus.map(m => {
            const { need, got } = menuProgress(m, picked, linesOf)
            const done = need > 0 && got === need
            return (
              <span
                key={m.id}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${
                  done ? 'bg-forest-600 text-white'
                       : 'bg-ink/[0.04] text-ink-soft ring-1 ring-ink/[0.08]'
                }`}
              >
                {done ? <Check size={11} className="mr-1 inline" /> : null}
                {m.name}
                {!done && <span className="ml-1 font-bold opacity-70">{got} of {need}</span>}
              </span>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {groups.map(g => {
          const ids = g.dishes.map(d => d.id)
          const n = ids.filter(id => have.has(id)).length
          const isOpen = open === g.id
          return (
            <div key={g.id} className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.06]">
              <div className="flex items-center gap-2 p-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n ? 'bg-forest-600 text-white' : 'bg-ink/[0.04] text-ink-mute'
                  }`}>
                    <UtensilsCrossed size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold leading-tight text-ink">
                      {g.label}
                    </span>
                    <span className="block text-[11.5px] font-semibold text-ink-mute">
                      {n ? `${n} of ${g.dishes.length} ticked` : `${g.dishes.length} dishes`}
                    </span>
                  </span>
                  <ChevronDown
                    size={17}
                    className={`ml-auto shrink-0 text-ink-mute transition ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11.5px] font-extrabold ${
                    n === g.dishes.length
                      ? 'bg-forest-50 text-forest-700 ring-1 ring-forest-200'
                      : 'bg-ink/[0.04] text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  {n === g.dishes.length ? 'Clear' : 'All'}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-ink/[0.06] p-2.5">
                  {g.dishes.map(d => {
                    const on = have.has(d.id)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggle(d.id)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition ${
                          on ? 'bg-forest-50' : ''
                        }`}
                      >
                        <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md ring-1 ${
                          on ? 'bg-forest-600 ring-forest-600' : 'bg-white ring-ink/[0.18]'
                        }`}>
                          {on && <Check size={12} className="text-white" />}
                        </span>
                        <span className="min-w-0 text-[13px] font-semibold leading-snug text-ink">
                          {d.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Counters are a different thing to buy — a stall somebody stands
          at, not a course in the meal — so they stay their own question
          rather than being folded into a group of dishes. */}
      {counters?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
            Live counters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {counters.map(c => {
              const on = chosenCounters.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCounter(c.id)}
                  aria-pressed={on}
                  className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                    on ? 'bg-forest-600 text-white ring-2 ring-forest-600'
                       : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
