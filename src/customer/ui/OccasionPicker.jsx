/**
 * Which occasion? — a dropdown with every one of the 438, by category, and
 * a search (Mohan, 2026-11-15: "for Book a Service the user should be asked
 * which occasion by a dropdown having all the occasions, as per categories
 * and search options — make it amazing and creative").
 *
 *   <OccasionPicker value={occasionId} typed={name} onPick={(id, name) => …} tradeLabel="photography" />
 *
 * Closed, it is one field that reads like a select: the chosen occasion's
 * logo and name, or "Choose from 438 occasions", and a chevron. Open, it is
 * a full screen (a portal, so no animated parent can trap it):
 *   · a search that matches names and category names as you type, the
 *     matched letters marked
 *   · a rail of the categories, each with its 3D mark and its count —
 *     "All" first; a tap narrows the list to that category
 *   · "Popular" leading the full list, then every category as a section
 *     with a sticky header
 *   · at the foot, "Not in the list? Type it" — the day in your own words
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, ChevronDown, ChevronRight, PenLine, Search, X } from 'lucide-react'
import { CATEGORIES, OCCASION, OCCASIONS } from '../data/occasions'
import OccasionLogo from './OccasionLogo'
import Glyph3D from './Glyph3D'

const POPULAR = ['birthday-party', 'wedding-reception', 'engagement-ceremony', 'housewarming-ceremony', 'naming-ceremony', 'baby-shower', 'haldi-ceremony', 'wedding-anniversary', 'corporate-annual-day', 'product-launch']
const SHORT = { life: 'Celebrations', wedding: 'Weddings', festivals: 'Festivals', school: 'School', college: 'College', corporate: 'Corporate', nightlife: 'Nightlife', public: 'Shows', sport: 'Sports', food: 'Dining', retail: 'Fashion', property: 'Property', community: 'Community' }

/* The matched part of a name, marked. */
function Mark({ text, q }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark className="rounded-[3px] bg-[#FFE38A] px-[1px] text-inherit">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

function Row({ o, on, q, onPick, showCat }) {
  const cat = CATEGORIES.find(c => c.id === o.category)
  return (
    <button type="button" onClick={() => onPick(o.id)} aria-pressed={on} data-occ-pick={o.id}
      className={'cx-press flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-left transition-colors ' + (on ? 'bg-[#F1EAFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white')}>
      <OccasionLogo occasion={o} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-extrabold text-[#1C1033]"><Mark text={o.name} q={q} /></span>
        {showCat && <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{cat?.short ?? cat?.label}</span>}
      </span>
      {on ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={14} strokeWidth={3} /></span> : <ChevronRight size={16} className="shrink-0 text-[#C9C2D6]" />}
    </button>
  )
}

export default function OccasionPicker({ value = null, typed = '', onPick, onType, tradeLabel = 'service' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [own, setOwn] = useState(false)
  const [ownText, setOwnText] = useState('')
  const list = useRef(null)
  const input = useRef(null)
  const o = value ? OCCASION[value] : null
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map(c => [c.id, OCCASIONS.filter(x => x.category === c.id).length])), [])
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return null
    const words = s.split(/\s+/)
    return OCCASIONS.map(x => {
      const n = x.name.toLowerCase(), c = (CATEGORIES.find(k => k.id === x.category)?.short ?? '').toLowerCase()
      if (!words.every(w => n.includes(w) || c.includes(w))) return null
      return { x, score: (n.startsWith(s) ? 0 : n.includes(s) ? 1 : 2) + (x.featured ? -0.5 : 0) }
    }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 40).map(h => h.x)
  }, [q])
  const sections = useMemo(() => (cat === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === cat))
    .map(c => ({ c, items: OCCASIONS.filter(x => x.category === c.id).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name)) })), [cat])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
  useEffect(() => { list.current?.scrollTo({ top: 0 }) }, [cat, q])
  const pick = id => { onPick(id, ''); setOpen(false); setQ(''); setOwn(false) }
  const typeOwn = () => { const t = ownText.trim(); if (!t) return; onType?.(t); setOpen(false); setOwn(false) }

  return (
    <>
      {/* Closed: one field, ringed by a slow ring of light until a day is chosen
          (Mohan, 2026-11-15: "occasion is not visible … clean, futuristic").
          The words are short enough never to cut off at phone width. */}
      <button type="button" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 250) }} data-occ-dropdown
        className="cx-press relative block w-full overflow-hidden rounded-[20px] p-[2px] text-left shadow-[0_18px_34px_-22px_rgba(91,33,182,.75)]">
        <span aria-hidden className={(o || typed ? '' : 'cx-live-ring ') + 'absolute left-1/2 top-1/2 aspect-square w-[160%]'}
          style={{ background: o || typed ? '#7C3AED' : 'conic-gradient(from 0deg, #7C3AED, #3B82F6, #22D3EE, #A855F7, #7C3AED)', translate: o || typed ? '-50% -50%' : undefined }} />
        <span className="relative flex h-[64px] items-center gap-3 rounded-[18px] bg-white px-3">
          {o ? <OccasionLogo occasion={o} size={42} /> : <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#EDE4FF] to-[#DCEBFF] text-[#5B21B6]"><Search size={20} strokeWidth={2.5} /></span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">Occasion</span>
            <span className={'block truncate text-[16.5px] font-extrabold tracking-[-0.02em] ' + (o || typed ? 'text-[#1C1033]' : 'text-[#6B6880]')}>{typed || o?.name || `Search ${OCCASIONS.length} occasions`}</span>
          </span>
          <span className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F4EEFF] pl-2.5 pr-1.5 text-[11.5px] font-extrabold text-[#5B21B6]">{o || typed ? 'Change' : 'Browse'}<ChevronDown size={16} strokeWidth={2.6} /></span>
        </span>
      </button>

      {open && createPortal(
        <div className="cx fixed inset-0 z-[420] flex flex-col bg-[#FAF8FD]" role="dialog" aria-modal="true" aria-label="Choose the occasion" data-occ-picker>
          {/* Head: back, the question, the search. */}
          <div className="bg-white pb-2 shadow-[0_10px_24px_-20px_rgba(28,16,51,.5)]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
            <div className="flex items-center gap-2 px-3">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="cx-press cx-btn grid h-11 w-11 shrink-0 place-items-center rounded-full"><ArrowLeft size={20} /></button>
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-[17px] font-extrabold tracking-[-0.02em]">What’s the {tradeLabel} for?</p>
                <p className="truncate text-[12px] font-semibold text-[var(--ink-3)]">{OCCASIONS.length} occasions · {CATEGORIES.length} categories</p>
              </div>
            </div>
            <label className="mx-3 mt-2 flex h-12 items-center gap-2.5 rounded-[15px] bg-[#F6F3FA] px-3.5 focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_#7C3AED]">
              <Search size={18} className="shrink-0 text-[#6D28D9]" />
              <input ref={input} value={q} onChange={e => setQ(e.target.value.slice(0, 60))} placeholder="Search — naming, reception, office party…" className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none" data-occ-search />
              {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="grid h-7 w-7 place-items-center rounded-full bg-[#E9E3F2] text-[#4C1D95]"><X size={14} /></button>}
            </label>
            {/* The categories, each with its mark and count. */}
            {!hits && (
              <div className="cx-noscroll mt-2.5 flex gap-2 overflow-x-auto px-3 pb-1" data-occ-cats>
                {[{ id: 'all', n: OCCASIONS.length }, ...CATEGORIES.map(c => ({ id: c.id, n: counts[c.id] }))].map(c => {
                  const on = cat === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={on} data-occ-cat={c.id}
                      className={'cx-press flex w-[78px] shrink-0 flex-col items-center rounded-[16px] px-1 pb-1.5 pt-2 transition-[background,box-shadow] ' + (on ? 'bg-gradient-to-b from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_10px_20px_-12px_rgba(91,33,182,.95)]' : 'bg-[#F8F5FD] text-[#2E1A4F]')}>
                      <span className={'grid h-11 w-11 place-items-center rounded-full ' + (on ? 'bg-white/90' : 'bg-white')}><Glyph3D id={c.id} size={32} /></span>
                      <span className="mt-1 w-full truncate text-center text-[11px] font-extrabold leading-tight">{c.id === 'all' ? 'All' : SHORT[c.id] ?? c.id}</span>
                      <span className={'text-[10px] font-bold ' + (on ? 'text-white/75' : 'text-[var(--ink-3)]')}>{c.n}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* The list. */}
          <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} data-occ-list>
            {hits ? (
              <section className="pt-3">
                <p className="px-1 pb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{hits.length ? `${hits.length} ${hits.length === 1 ? 'match' : 'matches'}` : 'No occasion by that name'}</p>
                <div className="space-y-1 rounded-[20px] bg-white p-1.5 shadow-[0_0_0_1px_#EEE8F8]">{hits.map(x => <Row key={x.id} o={x} on={x.id === value} q={q.trim()} onPick={pick} showCat />)}</div>
                {!hits.length && <button type="button" onClick={() => { setOwn(true); setOwnText(q) }} className="cx-press mt-2 flex w-full items-center gap-2 rounded-[16px] bg-white p-3 text-[13.5px] font-extrabold text-[#6D28D9] shadow-[0_0_0_1px_#EEE8F8]"><PenLine size={15} />Use “{q.trim()}” as the occasion</button>}
              </section>
            ) : (
              <>
                {cat === 'all' && (
                  <section className="pt-3" data-occ-popular>
                    <p className="px-1 pb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B45309]">Most booked</p>
                    <div className="grid grid-cols-2 gap-2">
                      {POPULAR.map(id => OCCASION[id]).filter(Boolean).map(x => (
                        <button key={x.id} type="button" onClick={() => pick(x.id)} data-occ-pick={x.id}
                          className={'cx-press flex items-center gap-2 rounded-[16px] bg-white p-2 text-left shadow-[0_0_0_1px_#EEE8F8] ' + (x.id === value ? 'ring-2 ring-[#7C3AED]' : '')}>
                          <OccasionLogo occasion={x} size={34} />
                          <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] font-extrabold leading-tight text-[#1C1033]">{x.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {sections.map(({ c, items }) => (
                  <section key={c.id} className="pt-4" data-occ-section={c.id}>
                    <div className="sticky top-0 z-[1] -mx-3 flex items-center gap-2 bg-[#FAF8FD]/95 px-4 py-1.5">
                      <Glyph3D id={c.id} size={24} />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-black tracking-[-0.01em] text-[#1C1033]">{c.label}</p>
                      <span className="shrink-0 rounded-full bg-[#EFE7FF] px-2 py-0.5 text-[10.5px] font-black text-[#5B21B6]">{items.length}</span>
                    </div>
                    <div className="mt-1 space-y-1 rounded-[20px] bg-white p-1.5 shadow-[0_0_0_1px_#EEE8F8]">{items.map(x => <Row key={x.id} o={x} on={x.id === value} q="" onPick={pick} />)}</div>
                  </section>
                ))}
              </>
            )}

            {/* Not in the list: the day in the customer's own words. */}
            <section className="mt-4 rounded-[20px] bg-gradient-to-br from-[#FFF8E6] to-[#FFF1D6] p-3 shadow-[inset_0_0_0_1px_#F6DFA2]" data-occ-own>
              {own ? (
                <label className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-3 shadow-[inset_0_0_0_2px_#F59E0B]">
                  <PenLine size={15} className="shrink-0 text-[#B45309]" />
                  <input autoFocus value={ownText} onChange={e => setOwnText(e.target.value.slice(0, 60))} onKeyDown={e => e.key === 'Enter' && typeOwn()} placeholder="Tell us the occasion" className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none" data-occ-own-input />
                  <button type="button" disabled={!ownText.trim()} onClick={typeOwn} className="cx-solid cx-solid-flat shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] rounded-full bg-[#1C1033] px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-40">Use it</button>
                </label>
              ) : (
                <button type="button" onClick={() => setOwn(true)} className="flex w-full items-center gap-2.5 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#B45309]"><PenLine size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-black text-[#3A1D00]">Not in the list?</span><span className="block text-[12px] font-semibold text-[#8A5A1E]">Type the occasion in your own words</span></span>
                  <ChevronRight size={17} className="shrink-0 text-[#B45309]" />
                </button>
              )}
            </section>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
