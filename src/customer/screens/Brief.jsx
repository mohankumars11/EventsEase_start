/**
 * The brief: everything you want from one master, on one screen.
 *
 *   /brief/:tradeId?o=<occasionId>
 *
 * Every question the partner answered when they listed (lib/needs.js),
 * as big tappable tiles (few options), a chip cloud (many), switches for
 * must-haves, and for catering the real dishes caterers list, searchable
 * by course. The count at the foot is live: it is the number of masters
 * who meet everything picked so far, recomputed on every tap — so the
 * customer watches the list narrow to exactly their kind of master.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Minus, Plus, RotateCcw, Search, Sparkles, X, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { partnersFor } from '../lib/market'
import { answered, courseLabel, filterByNeeds, loadCuisines, loadDishes, needsFor } from '../lib/needs'
import { plural, rupees } from '../lib/format'
import { askOf, asksFor, priceRange, withQuotes } from '../lib/quote'
import Buddy from '../ui/Buddy'
import { ArtFill } from '../ui/art'

export const NOUN = {
  photography: 'photographer', videography: 'videographer', catering_food: 'caterer', decoration_floral: 'decorator', venue: 'venue',
  bridal_makeup_hair: 'makeup artist', mehendi_artist: 'mehendi artist', dj_music: 'DJ', live_entertainment: 'performers', cake_desserts: 'cake',
  priest_rituals: 'priest', anchor_mc: 'anchor', sound_av: 'sound & AV', event_lighting: 'lighting', tent_furniture: 'tent & furniture',
}

export default function Brief() {
  const { tradeId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const plan = usePlan()
  const t = TRADE[tradeId]
  const occ = OCCASION[params.get('o')] ?? null
  const key = `${occ?.id ?? 'solo'}:${tradeId}`
  const saved = plan.needsOf(occ?.id ?? null, tradeId)
  const [picks, setPicks] = useState(saved)
  const [all, setAll] = useState(null)
  const [, bump] = useState(0)

  useEffect(() => {
    let live = true
    const masters = partnersFor(tradeId).catch(() => [])
    Promise.all([loadCuisines(supabase), tradeId === 'catering_food' ? loadDishes(supabase) : null].map(p => Promise.resolve(p).catch(() => null)))
      .then(() => { if (live) bump(n => n + 1); return masters })
      .then(l => live && setAll(l))
    return () => { live = false }
  }, [tradeId])

  const qs = needsFor(tradeId)
  const guests = occ && plan.event.occasionId === occ.id ? plan.event.guests : null
  const fit = useMemo(() => filterByNeeds(all, tradeId, picks, guests), [all, tradeId, picks, guests])
  /* The answers that make the price: hours and guests, priced per master. */
  const can = useMemo(() => asksFor(tradeId, all), [tradeId, all])
  const shown = useMemo(() => withQuotes(fit.list, askOf(picks, { guests })), [fit.list, picks, guests])
  const range = priceRange(shown)
  const [cheer, setCheer] = useState(null)
  if (!t) return null
  const choose = qs.filter(q => q.group === 'choose')
  const must = qs.filter(q => q.group === 'must')
  const n = answered(picks)
  const set = (k, v) => setPicks(p => { const { $any, ...rest } = p; return { ...rest, [k]: v } })
  const setQty = (k, v) => { setPicks(p => ({ ...p, [k]: v })); setCheer(k === '$hours' ? `${v} hours — great choice! Prices updated ⚡` : `${v.toLocaleString('en-IN')} guests — got it! Food bill worked out.`) }
  const keepQty = p => Object.fromEntries(Object.entries({ $hours: p.$hours, $guests: p.$guests }).filter(([, v]) => v))
  const done = () => {
    plan.setNeeds(key, picks)
    if (occ && picks.$guests && plan.event.occasionId === occ.id) plan.setEvent({ guests: picks.$guests })
    navigate(-1)
  }
  const noun = NOUN[tradeId] ?? t.label.toLowerCase()
  const lines = [
    can.hours && !picks.$hours ? `You’re on ${t.label} — how many hours do you need? One tap and I’ll show your exact price.` : null,
    can.guests && !picks.$guests && !guests ? 'How many guests are coming? I’ll work out the food bill for you.' : null,
    range ? `${plural(range.n, 'master')} can do it — from ${rupees(range.lo)}. Tap Done to see them and add one.` : null,
    'Not sure what to pick? “No preference” is a perfectly good answer 🙂',
    'Still there? A couple more taps and you can pay instantly — no calls, no waiting ⚡',
  ].filter(Boolean)

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
      <header className="cx-safe-top sticky top-0 z-[120] bg-[#FFF8F2]/95 px-3 pb-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_0_0_1px_#EFE7DD]"><ArrowLeft size={20} /></button>
          <ArtFill art={serviceArt(tradeId)} tone="#FBEFE6" className="h-11 w-11 shrink-0 rounded-[14px]" inset="8%" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16.5px] font-extrabold tracking-[-0.02em]">Your {NOUN[tradeId] ?? t.label.toLowerCase()}</p>
            <p className="truncate text-[11.5px] font-bold text-[var(--ink-3)]">{occ ? `For your ${occ.name}` : t.label}</p>
          </div>
          <span className={'shrink-0 rounded-full px-2.5 py-1.5 text-[12px] font-extrabold transition ' + (fit.list && fit.exact ? 'bg-[#E9F8EF] text-[#0B6B3D]' : 'bg-[#FFF4DA] text-[#7A4B00]')} data-live-count>
            {shown ? `${shown.length} ${fit.exact ? 'match' : 'closest'}` : '…'}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#F1E9DF]"><div className="h-full rounded-full bg-gradient-to-r from-[#16A34A] to-[#0C831F] transition-all duration-500" style={{ width: `${Math.min(100, (n / Math.max(4, Math.min(qs.length, 8))) * 100)}%` }} /></div>
      </header>

      <section className="px-4 pb-2 pt-3">
        <h1 className="text-[24px] font-black leading-[1.1] tracking-[-0.04em]">What do you need from your {NOUN[tradeId] ?? t.label.toLowerCase()}?</h1>
        <p className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">Whatever you tap, we match to what each master listed — you’ll see only the ones who do exactly that{fit.total ? `, out of ${fit.total}` : ''}.</p>
        {(can.hours || can.guests) && (
          <section className="cx-pop mt-3 rounded-[22px] bg-gradient-to-br from-[#FFF8EA] to-[#FFEFD6] p-3.5 shadow-[0_0_0_1.5px_#FFD9A0]" data-instant-price>
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]"><Zap size={13} className="fill-current" />Your instant price</p>
            {can.hours && <Qty label={`How many hours do you need your ${noun}?`} unit="hours" options={[2, 3, 4, 5, 6, 8, 10, 12]} value={picks.$hours ?? null} step={1} min={1} max={24} onChange={v => setQty('$hours', v)} />}
            {can.guests && <Qty label="How many guests?" unit="guests" options={[25, 50, 100, 150, 200, 300, 500]} value={picks.$guests ?? guests ?? null} step={10} min={10} max={5000} onChange={v => setQty('$guests', v)} />}
            <p className="mt-3 text-[13.5px] font-extrabold text-[#7A3E00]" data-price-range>
              {range ? <>{plural(range.n, 'master')} · <span className="text-[#0C831F]">{range.text}</span>{picks.$hours ? ` for ${picks.$hours} h` : ''}</> : 'Tap a number — every master’s price updates instantly.'}
            </p>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[#8A5A1A]">Masters who can’t do it drop out. Add one and pay — no calls, no waiting for quotes.</p>
          </section>
        )}
        <button type="button" onClick={() => setPicks(p => (p.$any ? keepQty(p) : { ...keepQty(p), $any: true }))} aria-pressed={!!picks.$any}
          className={'cx-press mt-3 flex w-full items-center gap-2.5 rounded-[16px] px-3.5 py-3 text-left transition ' + (picks.$any ? 'bg-[#EEFAF2] shadow-[inset_0_0_0_2px_#16A34A]' : 'bg-white shadow-[inset_0_0_0_1px_#EDE5DA]')} data-any>
          <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full ' + (picks.$any ? 'bg-[#0C831F] text-white' : 'ring-[1.5px] ring-[#D9D0C4]')}>{picks.$any && <Check size={14} strokeWidth={3} />}</span>
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">No preference — any {NOUN[tradeId] ?? 'master'} is fine</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">We’ll show every verified master for this</span></span>
        </button>
      </section>

      <div className="space-y-3 px-3 pt-2">
        {choose.map(q => <Question key={q.key} q={q} value={picks[q.key] ?? []} onChange={v => set(q.key, v)} occasion={occ}
          typed={picks[q.key + '__typed'] ?? []} onTyped={v => set(q.key + '__typed', v)} />)}
        {must.length > 0 && (
          <section className="rounded-[22px] bg-white p-3.5 shadow-[0_0_0_1px_#EFE7DD]" data-q="must">
            <p className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.02em]"><Sparkles size={16} className="text-[#0C831F]" />Must-haves</p>
            <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">Switch on only what you can’t do without.</p>
            <div className="mt-2 divide-y divide-[#F4EEE6]">
              {must.map(q => (
                <button key={q.key} type="button" onClick={() => set(q.key, picks[q.key] === true ? undefined : true)} aria-pressed={picks[q.key] === true} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug text-[var(--ink)]">{q.title.replace(/\?$/, '')}</span>
                  <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 ' + (picks[q.key] === true ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}>
                    <span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ' + (picks[q.key] === true ? 'left-[21px]' : 'left-[3px]')} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {!qs.length && <p className="rounded-[20px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-2)]">Nothing more to ask — every {t.label.toLowerCase()} master here can do it.</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-[#F1E9DF] bg-white/95 px-3 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="mx-auto flex max-w-[540px] gap-2">
          <button type="button" onClick={() => setPicks({})} disabled={!n} className="cx-press flex h-14 shrink-0 items-center gap-1.5 rounded-[18px] bg-[#F6F1EA] px-4 text-[13.5px] font-extrabold text-[var(--ink-2)] disabled:opacity-40" data-clear><RotateCcw size={16} />Clear</button>
          <button type="button" onClick={done} className="cx-press flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#0C831F] text-[15.5px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(12,131,31,.9)] disabled:bg-[#CFE9D7] disabled:shadow-none" data-show-masters>
            {!n ? `Show all ${shown?.length ?? ''} masters`.replace('  ', ' ') : !shown ? 'Finding masters…' : range ? `Done · ${plural(range.n, 'master')} from ${rupees(range.lo)}` : picks.$any ? `Done · all ${shown.length} masters` : fit.exact ? `Done · ${plural(shown.length, 'master')} match` : `Done · ${shown.length} closest`}
          </button>
        </div>
        {fit.list && !fit.exact && <p className="mt-1.5 text-center text-[11.5px] font-bold text-[#8A5A00]">No one does all of it yet — these come closest.</p>}
      </div>
      <Buddy id={`brief-${tradeId}`} lines={lines} cheer={cheer} bottom={104} />
    </main>
  )
}

/* A number the price is made of: quick picks, and − / + for anything else. */
function Qty({ label, unit, options, value, step, min, max, onChange }) {
  const v = value ?? null
  return (
    <div className="mt-2.5" data-qty={unit}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1C1033]">{label}</p>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-[0_0_0_1px_#F4D9AE]">
          <button type="button" onClick={() => onChange(Math.max(min, (v ?? options[2]) - step))} aria-label={`Fewer ${unit}`} className="cx-press grid h-7 w-7 place-items-center rounded-full bg-[#FFF4E2] text-[#B45309]"><Minus size={14} strokeWidth={3} /></button>
          <span className="cx-num min-w-[34px] text-center text-[15px] font-black text-[#1C1033]">{v ?? '–'}</span>
          <button type="button" onClick={() => onChange(Math.min(max, (v ?? options[2] - step) + step))} aria-label={`More ${unit}`} className="cx-press grid h-7 w-7 place-items-center rounded-full bg-[#FFF4E2] text-[#B45309]"><Plus size={14} strokeWidth={3} /></button>
        </span>
      </div>
      <div className="cx-noscroll -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {options.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={v === o}
            className={'cx-press shrink-0 rounded-[13px] px-3.5 py-2 text-[13.5px] font-extrabold transition ' + (v === o ? 'bg-[#1C1033] text-white shadow-[0_8px_16px_-10px_rgba(28,16,51,.9)]' : 'bg-white text-[#5A3B12] shadow-[inset_0_0_0_1px_#F4D9AE]')}>
            {o.toLocaleString('en-IN')}{unit === 'hours' ? ' h' : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

/* One question: tiles for a few options, a chip cloud for many, a search for dishes. */
function Question({ q, value, onChange, occasion, typed, onTyped }) {
  const [open, setOpen] = useState(false)
  const toggle = id => onChange(q.kind === 'single' ? (value[0] === id ? [] : [id]) : value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  if (q.kind === 'dishes') return <Dishes q={q} value={value} onChange={onChange} occasion={occasion} typed={typed} onTyped={onTyped} />
  if (!q.options.length) return null
  const tiles = q.options.length <= 6
  const shown = tiles || open ? q.options : q.options.slice(0, 10)
  return (
    <section className="rounded-[22px] bg-white p-3.5 shadow-[0_0_0_1px_#EFE7DD]" data-q={q.key}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-extrabold tracking-[-0.02em]">{q.title}</p>
        <span className="shrink-0 text-[11px] font-bold text-[var(--ink-3)]">{q.kind === 'single' ? 'pick one' : value.length ? `${value.length} picked` : 'pick any'}</span>
      </div>
      {tiles ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {shown.map(o => {
            const on = value.includes(o.id)
            return (
              <button key={o.id} type="button" onClick={() => toggle(o.id)} aria-pressed={on}
                className={'cx-press relative flex min-h-[54px] items-center rounded-[16px] px-3 py-2.5 pr-8 text-left text-[13px] font-bold leading-snug transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_2px_#16A34A]' : 'bg-[#FBF8F4] text-[var(--ink)] shadow-[inset_0_0_0_1px_#EDE5DA]')}>
                {o.label}
                <span className={'absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full transition ' + (on ? 'cx-pop bg-[#0C831F] text-white' : 'ring-[1.5px] ring-[#D9D0C4]')}>{on && <Check size={12} strokeWidth={3.4} />}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {shown.map(o => {
            const on = value.includes(o.id)
            return (
              <button key={o.id} type="button" onClick={() => toggle(o.id)} aria-pressed={on}
                className={'cx-press flex items-center gap-1 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-[#FBF8F4] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#EDE5DA]')}>
                {on && <Check size={13} strokeWidth={3} />}{o.label}
              </button>
            )
          })}
          {q.options.length > 10 && (
            <button type="button" onClick={() => setOpen(x => !x)} className="flex items-center gap-1 rounded-full px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)]">
              {open ? 'Show less' : `+${q.options.length - 10} more`}<ChevronDown size={14} className={open ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      )}
      <TypeIt typed={typed} onTyped={onTyped} hint={q.key === '$years' ? null : 'Not listed? Type what you need'} />
    </section>
  )
}

/* The dishes caterers actually list: search, a course row, and the picked tray. */
function Dishes({ q, value, onChange, occasion, typed, onTyped }) {
  const [term, setTerm] = useState('')
  const [course, setCourse] = useState('all')
  const courses = useMemo(() => [...new Set(q.options.map(d => d.course))], [q.options])
  const list = q.options.filter(d => (course === 'all' || d.course === course) && (!term || d.label.toLowerCase().includes(term.toLowerCase()))).slice(0, 40)
  const picked = q.options.filter(d => value.includes(d.id))
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  if (!q.options.length) return null
  return (
    <section className="rounded-[22px] bg-white p-3.5 shadow-[0_0_0_1px_#EFE7DD]" data-q="dishes">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-extrabold tracking-[-0.02em]">Build your menu card</p>
        <span className="shrink-0 text-[11px] font-bold text-[var(--ink-3)]">{picked.length ? `${picked.length} on your menu` : `${q.options.length} dishes on offer`}</span>
      </div>
      {(picked.length > 0 || typed.length > 0) && <MenuCard dishes={[...picked, ...typed.map(x => ({ id: `t:${x}`, label: x, course: 'your_own_dishes' }))]} title={occasion?.name}
        onRemove={id => (String(id).startsWith('t:') ? onTyped(typed.filter(x => `t:${x}` !== id)) : toggle(id))} />}
      <label className="mt-2.5 flex h-11 items-center gap-2 rounded-[13px] bg-[#FBF8F4] px-3 shadow-[inset_0_0_0_1px_#EDE5DA]">
        <Search size={16} className="text-[var(--ink-3)]" />
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search a dish — biryani, holige, payasa…" className="h-full flex-1 bg-transparent text-[13.5px] font-semibold outline-none placeholder:text-[#A39C8F]" />
      </label>
      <div className="cx-noscroll -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {['all', ...courses].map(c => (
          <button key={c} type="button" onClick={() => setCourse(c)} className={'shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ' + (course === c ? 'bg-[#1C1033] text-white' : 'bg-[#F6F1EA] text-[var(--ink-2)]')}>{c === 'all' ? 'All' : courseLabel(c)}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map(d => {
          const on = value.includes(d.id)
          return (
            <button key={d.id} type="button" onClick={() => toggle(d.id)} aria-pressed={on}
              className={'cx-press flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-[#FBF8F4] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#EDE5DA]')}>
              {on && <Check size={13} strokeWidth={3} />}{d.label}
            </button>
          )
        })}
        {!list.length && <p className="py-2 text-[12.5px] font-semibold text-[var(--ink-3)]">No caterer lists that yet — type it below and we’ll ask.</p>}
      </div>
      <TypeIt typed={typed} onTyped={onTyped} hint="Dish not listed? Type it" quiet />
    </section>
  )
}

/* The customer's own menu card, set like a printed one: the occasion at
   the top, the dishes under their courses. Tap a dish to take it off. */
function MenuCard({ dishes, title, onRemove }) {
  const byCourse = dishes.reduce((m, d) => ((m[d.course] ??= []).push(d), m), {})
  return (
    <div className="relative mt-3 overflow-hidden rounded-[18px] bg-[#FFFBF3] px-4 py-4 text-center shadow-[inset_0_0_0_1.5px_#E9D7B0,0_10px_22px_-16px_rgba(120,80,20,.6)]" data-menu-card>
      <div className="pointer-events-none absolute inset-[6px] rounded-[13px] border border-dashed border-[#E2CC9C]" />
      <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#A47A2C]">Menu</p>
      <p className="mt-0.5 text-[18px] font-black tracking-[-0.02em] text-[#3B2A0F]">{title ?? 'Your celebration'}</p>
      <p className="mx-auto mt-1 h-px w-16 bg-[#E2CC9C]" />
      {Object.entries(byCourse).map(([c, list]) => (
        <div key={c} className="mt-3">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#A47A2C]">{courseLabel(c)}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1">
            {list.map(d => (
              <button key={d.id} type="button" onClick={() => onRemove(d.id)} className="group flex items-center gap-1 text-[13.5px] font-bold text-[#3B2A0F]">
                {d.label}<X size={12} className="text-[#C9A867] opacity-70 group-active:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-3 text-[10.5px] font-bold text-[#A47A2C]">Only caterers who cook every dish here are shown</p>
    </div>
  )
}

/* "Not listed? Type it" — the customer's own words, kept as chips, sent to
   the master with the booking. They do not narrow the list. */
function TypeIt({ typed = [], onTyped, hint, quiet = false }) {
  const [text, setText] = useState('')
  if (!hint) return null
  const add = () => { const v = text.trim(); if (v && !typed.includes(v)) onTyped([...typed, v]); setText('') }
  return (
    <div className="mt-2.5">
      {!quiet && typed.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {typed.map(x => <button key={x} type="button" onClick={() => onTyped(typed.filter(y => y !== x))} className="flex items-center gap-1 rounded-full bg-[#1C1033] py-1.5 pl-3 pr-2 text-[12px] font-bold text-white">{x}<X size={13} /></button>)}
        </div>
      )}
      <label className="flex h-10 items-center gap-2 rounded-[12px] border border-dashed border-[#D9CFC2] bg-white px-3 focus-within:border-solid focus-within:border-[#16A34A]">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={hint} maxLength={80}
          className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold outline-none placeholder:text-[#A39C8F]" data-type-it />
        {text.trim() && <button type="button" onClick={add} className="shrink-0 rounded-full bg-[#0C831F] px-3 py-1 text-[11.5px] font-extrabold text-white">Add</button>}
      </label>
    </div>
  )
}
