/**
 * Icon tiles — how every choice in the event flow is answered.
 *
 * Mohan, 2026-11-10: no radio buttons, no grey chips — an icon for each
 * answer, in a tile. The icon is read off the answer's own words
 * (lib/optionIcon), each tile takes the next of six tints so a set reads
 * as different things, and the chosen tile fills with the brand purple
 * and carries a tick, which is the one signal nobody misreads.
 *
 * Short answers stand three to a row, icon over word; longer ones two to
 * a row, icon beside words — decided from the labels themselves, so the
 * same component serves "Veg / Non-veg / Both" and "Everyone pays their
 * own" without a prop.
 *
 * ── "Type my own" (Mohan, 2026-11-11) ───────────────────────────────
 * "If the customer has no answer in the provided options, we are supposed
 * to make him type." With `other`, the last tile is a pen; choosing it
 * opens a box, and what is typed IS the answer — kept inside the same
 * value as `other:<text>` (one string for a single choice, one entry of
 * the array for a multi), so every screen that stores an answer stores a
 * typed one the same way, and nothing downstream needs a second field.
 * Typed text travels to the master in the brief; it never filters who is
 * matched, because free text cannot honestly be matched to a ticked box.
 */
import { Check, PenLine } from 'lucide-react'
import { optionIcon, TILE_TINTS } from '../lib/optionIcon'

export const OTHER = 'other:'
export const isOther = v => typeof v === 'string' && v.startsWith(OTHER)
export const otherText = v => (isOther(v) ? v.slice(OTHER.length) : '')
/** A value's words: the option's label, or what was typed. */
export function labelOf(items, v) {
  if (isOther(v)) return otherText(v)
  const x = (items ?? []).find(i => (typeof i === 'string' ? i : i.id) === v)
  return x == null ? null : typeof x === 'string' ? x : x.label
}
/** Is there an answer here — a chosen option, or typed text with words in it? */
export const answeredTile = v => (Array.isArray(v) ? v.some(answeredTile) : isOther(v) ? otherText(v).trim().length > 0 : !(v == null || v === ''))

/** items: strings, or { id, label, line?, icon? }. value: an id, or ids when `multi`. `other`: true, or the box's placeholder. */
export function IconTiles({ items, value, onChange, multi = false, data, cols = null, compact = false, other = false }) {
  const list = items.map(x => (typeof x === 'string' ? { id: x, label: x } : x))
  if (other) list.push({ id: OTHER, label: 'Type my own', icon: PenLine, own: true })
  const vals = multi ? (value ?? []) : value == null ? [] : [value]
  const typedEntry = vals.find(isOther)
  const picked = id => (id === OTHER ? typedEntry != null : vals.includes(id))
  const tap = id => {
    if (id === OTHER) {
      if (typedEntry != null) return onChange(multi ? vals.filter(v => !isOther(v)) : null)
      return onChange(multi ? [...vals, OTHER] : OTHER)
    }
    onChange(multi ? (picked(id) ? vals.filter(v => v !== id) : [...vals, id]) : (value === id ? null : id))
  }
  const type = text => onChange(multi ? vals.map(v => (isOther(v) ? OTHER + text : v)) : OTHER + text)
  const stacked = cols ? cols >= 3 : list.length >= 3 && list.every(x => String(x.label).length <= 14 && !x.line)
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols ?? (stacked ? 3 : 2)]
  return (
    <div data-tiles={data}>
      <div className={'grid gap-2 ' + grid} role={multi ? 'group' : 'radiogroup'}>
        {list.map((x, i) => {
          const on = picked(x.id)
          const Icon = x.icon ?? optionIcon(x.label)
          const [tint, ink] = x.own ? ['#FFF4D6', '#8A5300'] : TILE_TINTS[i % TILE_TINTS.length]
          return (
            <button key={x.id} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={on} onClick={() => tap(x.id)} data-opt={x.id}
              className={'cx-press relative flex rounded-[16px] text-left transition-[background,box-shadow] duration-200 ' +
                (stacked ? 'flex-col items-center gap-1.5 px-1.5 text-center ' : 'items-center gap-2.5 px-2.5 ') + (compact ? 'py-2 ' : stacked ? 'py-3 ' : 'py-2.5 ') +
                (on ? 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_12px_22px_-12px_rgba(91,33,182,.95)]'
                  : x.own ? 'bg-white text-[#1C1033] shadow-[0_0_0_1.5px_#F2D58C,0_8px_18px_-16px_rgba(58,18,144,.5)]' : 'bg-white text-[#1C1033] shadow-[0_0_0_1.2px_#ECE6F6,0_8px_18px_-16px_rgba(58,18,144,.5)]')}>
              <span className={'grid shrink-0 place-items-center rounded-[12px] transition-colors ' + (compact ? 'h-8 w-8' : 'h-10 w-10')}
                style={{ background: on ? 'rgba(255,255,255,.18)' : tint, color: on ? '#FFFFFF' : ink }}>
                <Icon size={compact ? 16 : 19} strokeWidth={2.2} />
              </span>
              <span className={'min-w-0 ' + (stacked ? '' : 'flex-1')}>
                <span className={'block font-extrabold leading-[1.2] tracking-[-0.01em] ' + (compact ? 'text-[12px]' : 'text-[12.5px]')}>{x.label}</span>
                {x.line && <span className={'mt-0.5 block text-[10.5px] font-semibold leading-snug ' + (on ? 'text-white/80' : 'text-[var(--ink-3)]')}>{x.line}</span>}
              </span>
              {on && <span className="cx-pop absolute right-1.5 top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[#5B21B6]"><Check size={11} strokeWidth={3.4} /></span>}
            </button>
          )
        })}
      </div>
      {other && typedEntry != null && (
        <label className="cx-rise mt-2 flex h-12 items-center gap-2 rounded-[14px] bg-white px-3.5 shadow-[inset_0_0_0_2px_#7C3AED]" data-other-box={data}>
          <PenLine size={15} className="shrink-0 text-[#7C3AED]" />
          <input autoFocus value={otherText(typedEntry)} onChange={e => type(e.target.value.slice(0, 120))} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder={typeof other === 'string' ? other : 'Type what you have in mind'} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[var(--ink)] outline-none placeholder:text-[#A79DB9]" data-other-input />
        </label>
      )}
    </div>
  )
}
