import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Search, X } from 'lucide-react'

/**
 * Every part of the plan, at once — and a way straight to any of it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROBLEM THIS SOLVES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The guided journey is right about one thing and wrong about one thing.
 *
 * Right: one decision per screen, in the order a family actually decides, is
 * enormously better than thirty services in a grid. That is not in question
 * and nothing here undoes it — the flow still opens on the first question and
 * still walks you through in order.
 *
 * Wrong: it made that order the ONLY order. A wedding is twenty-seven
 * chapters. A customer who came for a photographer and a cake had to tap
 * "next" past twenty-five other questions to reach them, and a customer who
 * answered chapter four badly had to walk backwards through nine screens to
 * fix it. Both of those people leave, and neither of them was badly served by
 * the questions — they were badly served by the queue.
 *
 * So: a control that opens the whole plan as a board. Every section, what has
 * been chosen, what has been declined, what has not been reached yet — and a
 * tap that goes straight there. The queue is now the default rather than the
 * cage.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS A FILTER AND NOT JUST A LIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Twenty-seven rows is a list nobody reads. The four chips at the top are
 * what make it usable, and each one answers a question somebody actually has
 * standing in front of it:
 *
 *   Everything     "what else is there?"          — browsing
 *   Chosen         "what have I already agreed to?" — reviewing before the end
 *   Declined       "what did I say no to?"          — second thoughts
 *   Not yet        "what is left?"                  — finishing
 *
 * "Declined" is the one that earns the control. Somebody who tapped "no
 * photographer" on screen six and changed their mind on screen nineteen had,
 * before this, no way of finding that screen again short of walking back
 * through thirteen questions. Now it is two taps and the refusal is listed as
 * a first-class state rather than as an absence.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND WHY IT DOES NOT SHOW A PRICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Because it is a board of everything the customer has chosen, and a number
 * against each row would turn it into a shopping basket with a running total
 * — which is the one thing this whole flow exists not to be. What each row
 * carries instead is the NAME of what was chosen: "Full day — candid and
 * traditional". That is what somebody scanning for a mistake is looking for,
 * and it is the thing a price would have replaced.
 */

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'chosen', label: 'Chosen' },
  { id: 'declined', label: 'Declined' },
  { id: 'todo', label: 'Not yet' },
]

const STATUS_STYLE = {
  chosen: 'bg-teal-50 text-teal-700 ring-teal-200/70',
  declined: 'bg-surface-sunk/[0.06] text-ink-mute ring-hairline/10',
  todo: 'bg-amber-50 text-amber-700 ring-amber-200/70',
}

const STATUS_LABEL = {
  chosen: 'Chosen',
  declined: 'Declined',
  todo: 'Not yet',
}

export default function StepJumper({ open, entries, currentKey, onJump, onClose }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  // Opening on "Declined" because that is what was showing last time would be
  // a sheet that appears empty for most people. It opens on everything.
  useEffect(() => {
    if (open) { setFilter('all'); setQuery('') }
  }, [open])

  // The escape key, because this is a full-screen surface on a desktop too.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const counts = useMemo(() => {
    const out = { all: entries.length, chosen: 0, declined: 0, todo: 0 }
    for (const e of entries) out[e.status] = (out[e.status] ?? 0) + 1
    return out
  }, [entries])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter(e => {
      if (filter !== 'all' && e.status !== filter) return false
      if (!needle) return true
      return `${e.title} ${e.summary ?? ''} ${e.section}`.toLowerCase().includes(needle)
    })
  }, [entries, filter, query])

  // Grouped, because a flat list of twenty-seven cards has no shape and the
  // sections are the shape the customer already walked through.
  const groups = useMemo(() => {
    const map = new Map()
    for (const e of shown) {
      if (!map.has(e.section)) map.set(e.section, [])
      map.get(e.section).push(e)
    }
    return [...map.entries()]
  }, [shown])

  if (!open) return null

  return (
    /* Mounted at the page root, outside anything that could carry a transform
       — an ancestor with even an identity transform re-anchors `position:
       fixed` to that ancestor rather than to the viewport, and the sheet
       renders off screen. This codebase has shipped that bug before. */
    <div className="fixed inset-0 z-[60] flex flex-col">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div className="relative mt-auto flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[0_-20px_60px_-24px_rgba(42,30,20,0.6)]">
        {/* ── Head ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-hairline/10 px-4 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline/20" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="type-overline text-saffron-700">Your plan so far</p>
              <h2 className="mt-0.5 font-serif text-[21px] font-extrabold leading-tight tracking-tight text-ink">
                Go straight to any part of it
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
                {counts.chosen} chosen · {counts.declined} declined · {counts.todo} still to look at.
                Nothing has to be answered in order.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft ring-1 ring-hairline/15"
            >
              <X size={17} />
            </button>
          </div>

          {/* Search earns its place past about fifteen chapters, which is most
              occasions in this catalogue. Somebody who knows they want the
              photographer should not have to find it by eye. */}
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-sunk/[0.06] px-3">
            <Search size={15} className="shrink-0 text-ink-mute" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find a part — photos, food, parking…"
              aria-label="Find a part of the plan"
              className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[13.5px] text-ink placeholder:text-ink-mute focus:outline-none"
            />
          </div>

          <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(f => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-saffron-400 to-plum-500 text-white'
                      : 'bg-surface-sunk/[0.06] text-ink-soft'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-white/75' : 'text-ink-mute'}`}>
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── The board ────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {groups.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-mute">
              Nothing here yet. Try another filter.
            </p>
          )}

          {groups.map(([section, items]) => (
            <section key={section} className="mb-5">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
                {section}
              </p>
              {/* Two to a row on a phone. A single column of twenty-seven rows
                  is the queue this control exists to replace; a grid is
                  something you can take in at a glance. */}
              <div className="grid grid-cols-2 gap-2.5">
                {items.map(entry => {
                  const here = entry.key === currentKey
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => { onJump(entry.key); onClose() }}
                      className={`group relative flex h-full flex-col items-start gap-1.5 overflow-hidden rounded-[20px] p-3 text-left transition-all active:scale-[0.98] ${
                        here
                          ? 'bg-white ring-2 ring-saffron-400'
                          : 'bg-white ring-1 ring-hairline/[0.12] hover:ring-hairline/25'
                      }`}
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-sunk/[0.06] text-[18px]">
                          {entry.emoji ?? '•'}
                        </span>
                        {entry.status === 'chosen' && (
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-600 text-white">
                            <Check size={12} strokeWidth={3.2} />
                          </span>
                        )}
                      </span>

                      <span className="text-[13px] font-extrabold leading-tight text-ink">
                        {entry.title}
                      </span>
                      {entry.summary && (
                        <span className="line-clamp-2 text-[11.5px] leading-snug text-ink-mute">
                          {entry.summary}
                        </span>
                      )}

                      <span className="mt-auto flex w-full items-center justify-between gap-1 pt-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ring-1 ${STATUS_STYLE[entry.status]}`}>
                          {here ? 'You are here' : STATUS_LABEL[entry.status]}
                        </span>
                        <ChevronRight size={13} className="shrink-0 text-ink-mute" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
