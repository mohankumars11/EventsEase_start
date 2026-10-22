/**
 * One occasion: what it takes, and the customer's answers about it.
 *
 * ── No price on this screen ─────────────────────────────────────────
 * The customer has told us one word ("Haldi"). An estimate now would be
 * a stranger quoting at them; the first rupee figure they see is a real
 * partner's own price on the next screen, and the total is the sum of
 * partners they picked. The bar at the foot therefore carries a count,
 * not an amount.
 *
 * ── Every optional row has a plain "No" ─────────────────────────────
 * Next to "Add", with "Add" the highlighted one. A family that does not
 * want a DJ at a naming ceremony should not have to ignore the row.
 */
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarDays, Check, ChevronRight, Heart, Loader2, MapPin, Minus, Plus, Share2, Users, Wand2 } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { photoFor } from '../data/photos.generated'
import { usePlan, needsFor } from '../state/PlanContext'
import { partnersFor, rank } from '../lib/market'
import { dayLabel, plural, timeLabel } from '../lib/format'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import { useCity } from '../../context/CityContext'
import WhenSheet from './WhenSheet'

const TIERS = [
  { id: 'must', title: 'Must-haves', sub: 'This occasion does not happen without them' },
  { id: 'often', title: 'Most families add', sub: 'Optional, and usually worth it' },
  { id: 'extra', title: 'Nice touches', sub: 'If you want to go further' },
]

export default function Occasion() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const { city } = useCity()
  const plan = usePlan()
  const { event, setEvent, setPick, add } = plan
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!o) return <Navigate to="/" replace />

  const picks = plan.picks[o.id] ?? {}
  const ev = event.occasionId === o.id ? event : { ...event, guests: null, venue: 'need' }
  const { rows, needed } = needsFor(o, picks, ev)
  const p = photoFor(o.id) ?? photoFor(`cat:${o.category}`)
  const focus = () => { if (event.occasionId !== o.id) setEvent({ occasionId: o.id, guests: null, venue: 'need' }) }
  const guests = ev.guests

  async function bestForMe() {
    focus(); setBusy(true)
    try {
      for (const t of needed) {
        const list = rank(await partnersFor(t))
        if (list[0]) add(list[0], o.id)
      }
      navigate('/plan')
    } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <div className="relative">
        <div className="cx-tile cx-scrim-strong aspect-square max-h-[460px] w-full !rounded-none" style={{ '--tone': p?.tone }}>
          <Photo src={p?.url} alt={p?.alt} eager />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-16 text-white">
            <Link to={`/c/${o.category}`} className="cx-glass inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-extrabold">{o.categoryLabel}</Link>
            <h1 className="cx-display mt-2 text-[36px]">{o.name}</h1>
          </div>
        </div>
        <div className="absolute inset-x-0 top-0">
          <BackHeader transparent right={<div className="flex gap-2">
            <button type="button" aria-label="Save" className="cx-press cx-glass-light grid h-11 w-11 place-items-center rounded-full"><Heart size={19} /></button>
            <button type="button" aria-label="Share" onClick={() => navigator.share?.({ title: o.name, url: location.href }).catch(() => {})} className="cx-press cx-glass-light grid h-11 w-11 place-items-center rounded-full"><Share2 size={18} /></button>
          </div>} />
        </div>
      </div>

      {/* The event, in four facts. */}
      <section className="cx-card relative z-10 mx-4 -mt-10 grid grid-cols-2 gap-px overflow-hidden !rounded-[26px] bg-[var(--line)]" aria-label="Your event">
        <Fact icon={CalendarDays} label="When" value={event.date ? dayLabel(event.date) : 'Pick a day'} sub={event.time ? `Starts ${timeLabel(event.time)}` : event.date ? 'Add a start time' : null} empty={!event.date} onClick={() => setSheet('date')} />
        <Fact icon={MapPin} label="Where" value={o.whereLabel ?? city} sub={o.whereLabel ? city : null} />
        <Fact icon={Users} label={o.people} value={guests ? guests.toLocaleString('en-IN') : 'How many?'} empty={!guests} onClick={() => { focus(); setSheet('guests') }} />
        {o.where === 'ask' ? (
          <div className="bg-white p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]"><Building2 size={14} />Venue</p>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--soft)] p-0.5">
              {[['need', 'Find one'], ['have', 'Have one']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => { focus(); setEvent({ occasionId: o.id, venue: v }) }}
                  className={'rounded-[10px] py-1.5 text-[12px] font-extrabold transition ' + (ev.venue === v ? 'bg-white text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)]')}>{l}</button>
              ))}
            </div>
          </div>
        ) : <Fact icon={Check} label="Planned for" value={plural(o.must.length, 'essential')} sub="Set by the occasion" />}
      </section>

      <section className="mt-7">
        {TIERS.map(tier => {
          const list = rows.filter(r => r.tier === tier.id)
          if (!list.length) return null
          return (
            <div key={tier.id} className="mb-6">
              <div className="px-4 pb-2.5">
                <h2 className="text-[19px] font-extrabold tracking-[-0.03em]">{tier.title}</h2>
                <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">{tier.sub}</p>
              </div>
              <ul className="mx-4 overflow-hidden rounded-[24px] shadow-[0_0_0_1px_var(--line)]">
                {list.map((r, i) => <NeedRow key={r.tradeId} row={r} first={!i} occasion={o}
                  onPick={v => { focus(); setPick(o.id, r.tradeId, v) }} />)}
              </ul>
            </div>
          )
        })}
      </section>

      <ActionBar note="Free to plan. Nothing is charged until you confirm.">
        <div className="flex gap-2">
          <button type="button" onClick={bestForMe} disabled={!needed.length || busy}
            className="cx-press cx-btn flex h-14 shrink-0 items-center gap-2 rounded-[18px] px-4 text-[13.5px] font-extrabold disabled:opacity-40" data-best>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}Best for me
          </button>
          <button type="button" disabled={!needed.length} onClick={() => { focus(); navigate(`/o/${o.id}/match`) }}
            className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-find>
            Find partners · {needed.length}<ChevronRight size={18} />
          </button>
        </div>
      </ActionBar>

      <WhenSheet open={sheet === 'date'} onClose={() => setSheet(null)} date={event.date} time={event.time} hours={event.hours} onPick={w => { setEvent(w); setSheet(null) }} />
      <GuestSheet open={sheet === 'guests'} onClose={() => setSheet(null)} occasion={o} value={guests}
        onPick={n => { setEvent({ occasionId: o.id, guests: n }); setSheet(null) }} />
    </main>
  )
}

function Fact({ icon: Icon, label, value, sub = null, onClick, empty = false }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={'bg-white p-3.5 text-left ' + (onClick ? 'cx-press active:bg-[var(--soft)]' : '')}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]"><Icon size={14} />{label}</p>
      <p className={'mt-1.5 truncate text-[15.5px] font-extrabold tracking-[-0.02em] ' + (empty ? 'text-[var(--brand)]' : '')}>{value}</p>
      {sub && <p className="truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
    </Tag>
  )
}

function NeedRow({ row, first, occasion, onPick }) {
  const t = TRADE[row.tradeId], p = photoFor(`trade:${row.tradeId}`)
  const why = occasion.why[row.tradeId] ?? t.why
  const must = row.tier === 'must'
  const st = row.state
  return (
    <li className={(first ? '' : 'border-t border-[var(--line)] ') + 'bg-white transition ' + (st === 'skip' || st === 'have' ? 'bg-[#FCFBFE]' : '')} data-need={row.tradeId} data-state={st}>
      <div className="flex items-center gap-3 p-3">
        <Link to={`/s/${row.tradeId}?o=${occasion.id}`} className={'relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[16px] bg-[var(--soft)] transition ' + (st === 'skip' || st === 'have' ? 'opacity-45 grayscale' : '')}>
          <Photo src={p?.url} className="absolute inset-0 h-full w-full object-cover" />
        </Link>
        <Link to={`/s/${row.tradeId}?o=${occasion.id}`} className="min-w-0 flex-1">
          <p className={'text-[15px] font-extrabold tracking-[-0.015em] ' + (st === 'skip' || st === 'have' ? 'text-[var(--ink-3)] line-through decoration-2' : '')}>{t.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--ink-2)]">
            {st === 'have' ? 'You have this covered' : st === 'skip' ? 'Not needed for this one' : why}
          </p>
        </Link>
        <div className="shrink-0">
          {must ? (
            <div className="grid grid-cols-2 gap-0.5 rounded-[12px] bg-[var(--soft)] p-0.5">
              {[['need', 'Need'], ['have', 'Have']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => onPick(v)} aria-pressed={st === v}
                  className={'rounded-[10px] px-2.5 py-1.5 text-[12px] font-extrabold transition ' + (st === v ? (v === 'need' ? 'bg-[var(--brand-deep)] text-white' : 'bg-white text-[var(--ink)] shadow-sm') : 'text-[var(--ink-3)]')}>{l}</button>
              ))}
            </div>
          ) : st === 'need' ? (
            <button type="button" onClick={() => onPick('off')} className="cx-press cx-pop flex items-center gap-1 rounded-full bg-[var(--ok-tint)] px-3 py-2 text-[12.5px] font-extrabold text-[var(--ok)]"><Check size={15} strokeWidth={3} />Added</button>
          ) : st === 'skip' ? (
            <button type="button" onClick={() => onPick('off')} className="cx-press rounded-full px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)]">Undo</button>
          ) : (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onPick('skip')} className="cx-press rounded-full px-2.5 py-2 text-[12.5px] font-extrabold text-[var(--ink-3)]">No</button>
              <button type="button" onClick={() => onPick('need')} className="cx-press cx-btn flex items-center gap-1 rounded-full px-3 py-2 text-[12.5px] font-extrabold ring-1 ring-[var(--am-300)]"><Plus size={14} strokeWidth={3} />Add</button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function GuestSheet({ open, onClose, occasion, value, onPick }) {
  const [n, setN] = useState(value ?? occasion.bands[1])
  const step = n >= 1000 ? 100 : n >= 200 ? 25 : n >= 50 ? 10 : 1
  return (
    <Sheet open={open} onClose={onClose} title={`How many ${occasion.people.toLowerCase()}?`}
      footer={<button type="button" onClick={() => onPick(n)} className="cx-press cx-cta h-14 w-full rounded-[18px] text-[15px] font-extrabold">Use {n.toLocaleString('en-IN')}</button>}>
      <div className="flex items-center justify-between gap-4 rounded-[22px] bg-[var(--am-50)] p-3 ring-1 ring-[var(--am-200)]">
        <button type="button" onClick={() => setN(x => Math.max(1, x - step))} aria-label="Fewer" className="cx-press cx-btn grid h-12 w-12 place-items-center rounded-[16px]"><Minus size={20} /></button>
        <input inputMode="numeric" value={n} onChange={e => setN(Math.max(1, Math.min(100000, Number(e.target.value.replace(/\D/g, '')) || 1)))}
          className="cx-num w-full bg-transparent text-center text-[38px] font-extrabold tracking-[-0.04em] outline-none" aria-label="Number" />
        <button type="button" onClick={() => setN(x => Math.min(100000, x + step))} aria-label="More" className="cx-press cx-btn grid h-12 w-12 place-items-center rounded-[16px]"><Plus size={20} /></button>
      </div>
      <p className="mb-2 mt-4 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Usual for this occasion</p>
      <div className="flex flex-wrap gap-2 pb-2">
        {occasion.bands.map(b => (
          <button key={b} type="button" onClick={() => setN(b)} className={'cx-press cx-num rounded-full px-4 py-2.5 text-[14px] font-extrabold ' + (n === b ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>
            {b.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
