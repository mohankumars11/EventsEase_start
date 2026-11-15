/**
 * Filters, the way Zomato and Swiggy do them (Mohan, 2026-11-14: "every
 * specific option that is available … inside a filter, not a radio button
 * … veg, non-veg, type, budget, price, ratings, every customisation …
 * build an amazing filtering option everywhere").
 *
 *   <FilterBar facets={FACETS} value={f} onChange={setF} sorts={SORTS} sort={s} onSort={setS} count={shown.length} />
 *
 * One "Filters" button (with a count of what is applied), a "Sort" button,
 * and a chip for every applied value with an × — then the sheet: each
 * facet a titled row of pills, single or multi, a range as bands, and a
 * footer that says how many results the choice leaves.
 *
 * A facet: { id, label, type: 'one' | 'many' | 'toggle', options: [{ id, label, icon? }], hint? }
 * `value` is { [facetId]: id | id[] | true }; an empty value is "any".
 */
import { useState } from 'react'
import { ArrowUpDown, Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { Sheet } from './kit'

const isOn = (f, v) => (f.type === 'many' ? Array.isArray(v) && v.length > 0 : f.type === 'toggle' ? v === true : v != null && v !== '')
export const appliedCount = (facets, value) => facets.filter(f => isOn(f, value?.[f.id])).length

/** Does one row pass every applied facet? `get(row, facetId)` reads the row's value(s). */
export function passes(row, facets, value, get) {
  for (const f of facets) {
    const v = value?.[f.id]
    if (!isOn(f, v)) continue
    const have = get(row, f.id)
    if (f.type === 'toggle') { if (!have) return false; continue }
    const set = new Set(Array.isArray(have) ? have.map(String) : have == null ? [] : [String(have)])
    if (f.type === 'many') { if (!(f.anyOf ? v.some(x => set.has(String(x))) : v.every(x => set.has(String(x))))) return false; continue }
    if (!set.has(String(v))) return false
  }
  return true
}

function Pill({ on, onClick, children, data }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} data-filter-pill={data}
      className={'cx-press flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-extrabold transition-colors ' + (on ? 'bg-[#1C1033] text-white' : 'bg-white text-[#2E1A4F] shadow-[inset_0_0_0_1.5px_#E9E3F2]')}>
      {on && <Check size={13} strokeWidth={3.2} />}{children}
    </button>
  )
}

export default function FilterBar({ facets = [], value = {}, onChange, sorts = null, sort = null, onSort = null, count = null, label = 'Filters', quick = [], className = '' }) {
  const [open, setOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const n = appliedCount(facets, value)
  const set = (f, id) => {
    const cur = value[f.id]
    if (f.type === 'toggle') return onChange({ ...value, [f.id]: !cur })
    if (f.type === 'many') { const arr = Array.isArray(cur) ? cur : []; return onChange({ ...value, [f.id]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] }) }
    onChange({ ...value, [f.id]: cur === id ? null : id })
  }
  const clear = () => onChange({})
  const clearOne = (f, id = null) => {
    if (f.type === 'many' && id != null) return onChange({ ...value, [f.id]: (value[f.id] ?? []).filter(x => x !== id) })
    onChange({ ...value, [f.id]: null })
  }
  /* The applied values, as chips. */
  const chips = facets.flatMap(f => {
    const v = value[f.id]
    if (!isOn(f, v)) return []
    if (f.type === 'toggle') return [{ f, id: null, text: f.label }]
    const name = id => f.options?.find(o => String(o.id) === String(id))?.label ?? String(id)
    return (Array.isArray(v) ? v : [v]).map(id => ({ f, id, text: name(id) }))
  })
  const sortLabel = sorts?.find(([k]) => k === sort)?.[1] ?? null

  return (
    <>
      <div className={'cx-noscroll flex items-center gap-1.5 overflow-x-auto px-3 ' + className} data-filter-bar>
        <button type="button" onClick={() => setOpen(true)} data-filter-open
          className={'cx-press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold ' + (n ? 'bg-[#1C1033] text-white' : 'bg-white text-[#2E1A4F] shadow-[inset_0_0_0_1.5px_#E3D5FA]')}>
          <SlidersHorizontal size={15} />{label}{n ? ` · ${n}` : ''}
        </button>
        {sorts && (
          <button type="button" onClick={() => setSortOpen(true)} data-sort-open
            className={'cx-press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold ' + (sort && sort !== sorts[0][0] ? 'bg-[#F1EAFF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#C4B5FD]' : 'bg-white text-[#2E1A4F] shadow-[inset_0_0_0_1.5px_#E3D5FA]')}>
            <ArrowUpDown size={14} />{sortLabel && sort !== sorts[0][0] ? sortLabel : 'Sort'}
          </button>
        )}
        {quick.map(q => {
          const f = facets.find(x => x.id === q.facet)
          if (!f) return null
          const on = f.type === 'toggle' ? value[f.id] === true : f.type === 'many' ? (value[f.id] ?? []).includes(q.id) : value[f.id] === q.id
          return <Pill key={`${q.facet}:${q.id ?? 'on'}`} on={on} onClick={() => set(f, q.id)} data={`${q.facet}:${q.id ?? 'on'}`}>{q.icon && <q.icon size={13} />}{q.label}</Pill>
        })}
        {chips.filter(c => !quick.some(q => q.facet === c.f.id && (q.id == null || q.id === c.id))).map(c => (
          <button key={`${c.f.id}:${c.id}`} type="button" onClick={() => clearOne(c.f, c.id)} className="cx-press flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#F1EAFF] px-3 text-[12.5px] font-extrabold text-[#4C1D95]" data-filter-chip={`${c.f.id}:${c.id}`}>
            {c.text}<X size={13} />
          </button>
        ))}
        {n > 0 && <button type="button" onClick={clear} className="cx-press flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-extrabold text-[var(--ink-3)]" data-filter-clear><RotateCcw size={12} />Clear</button>}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={label}
        footer={(
          <div className="flex items-center gap-2 pb-2">
            <button type="button" onClick={clear} disabled={!n} className="cx-press h-12 shrink-0 rounded-[16px] bg-[#F4EEFF] px-4 text-[13.5px] font-extrabold text-[#4C1D95] disabled:opacity-40" data-filter-reset>Clear all</button>
            <button type="button" onClick={() => setOpen(false)} className="cx-press cx-cta flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-extrabold" data-filter-apply>
              {count == null ? 'Show results' : count === 0 ? 'Nothing matches — loosen one' : `Show ${count} ${count === 1 ? 'result' : 'results'}`}
            </button>
          </div>
        )}>
        <div className="space-y-5 pb-3" data-filter-sheet>
          {facets.map(f => (
            <section key={f.id} data-facet={f.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{f.label}</h3>
                {f.type === 'many' && <span className="text-[10.5px] font-bold text-[var(--ink-3)]">{f.anyOf ? 'any of these' : 'must have all'}</span>}
              </div>
              {f.hint && <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--ink-3)]">{f.hint}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.type === 'toggle'
                  ? <Pill on={value[f.id] === true} onClick={() => set(f)} data={`${f.id}:on`}>{f.icon && <f.icon size={13} />}{f.on ?? f.label}</Pill>
                  : (f.options ?? []).map(o => {
                    const on = f.type === 'many' ? (value[f.id] ?? []).includes(o.id) : value[f.id] === o.id
                    return <Pill key={o.id} on={on} onClick={() => set(f, o.id)} data={`${f.id}:${o.id}`}>{o.icon && <o.icon size={13} />}{o.label}{o.count != null && <span className={'text-[10.5px] ' + (on ? 'text-white/70' : 'text-[var(--ink-3)]')}>{o.count}</span>}</Pill>
                  })}
              </div>
            </section>
          ))}
        </div>
      </Sheet>

      {sorts && (
        <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
          <ul className="space-y-1.5 pb-4" data-sort-sheet>
            {sorts.map(([k, text, sub]) => (
              <li key={k}>
                <button type="button" onClick={() => { onSort?.(k); setSortOpen(false) }} aria-pressed={sort === k} data-sort={k}
                  className={'cx-press flex h-[52px] w-full items-center justify-between rounded-[14px] px-3.5 text-left ' + (sort === k ? 'bg-[#F4EEFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
                  <span><span className="block text-[14px] font-extrabold text-[#1C1033]">{text}</span>{sub && <span className="block text-[11px] font-semibold text-[var(--ink-3)]">{sub}</span>}</span>
                  {sort === k && <Check size={17} strokeWidth={3} className="text-[#7C3AED]" />}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  )
}
