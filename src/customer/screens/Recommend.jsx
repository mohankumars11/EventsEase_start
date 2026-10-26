/**
 * What it takes: every service the occasion needs, end to end, in the
 * order the day happens — from the invitations and the venue, through
 * the rituals, the food and the music, to the pack-up and getting
 * everyone home. Then the add-ons, and one button: Find masters.
 *
 * ── What is on, and why ─────────────────────────────────────────────
 * Essentials and the template's recommendations arrive switched on —
 * that is the recommendation. Tapping one off says "I have this" (an
 * essential) or "not for us" (anything else). The end-of-day services
 * and the add-ons arrive off: they are offered, never assumed.
 *
 * Still no price (memory: no price before the reveal). The bar counts
 * services; the first rupee is a real master's own.
 */
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Check, ChevronRight, MapPin, Pencil, Sparkles, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan, needsFor } from '../state/PlanContext'
import { dayLabel, plural, timeLabel } from '../lib/format'
import { ActionBar, BackHeader, Journey } from '../ui/kit'
import { AddOnCard, ArtFill } from '../ui/art'
import { SettingUp } from '../ui/needs'
import { VENUE_KINDS } from './Occasion'

const PHASES = [
  { id: 'prep', title: 'Before the day', sub: 'Planning, invitations and the looks', trades: ['wedding_planning', 'invitation_printing', 'bridal_makeup_hair', 'mehendi_artist', 'trousseau_gift_packing'] },
  { id: 'place', title: 'The venue & set-up', sub: 'Where it happens and how it looks', trades: ['venue', 'decoration_floral', 'tent_furniture', 'event_lighting', 'sound_av', 'power_cooling', 'event_equipment_rental', 'event_materials_supplier'] },
  { id: 'day', title: 'On the day', sub: 'Rituals, food, music and the memories', trades: ['priest_rituals', 'catering_food', 'cake_desserts', 'bar_beverages', 'photography', 'videography', 'anchor_mc', 'dj_music', 'live_entertainment', 'guest_services', 'gifts_favours'] },
  { id: 'care', title: 'Guests & safety', sub: 'Arrivals, security and care', trades: ['valet_parking', 'security_services', 'safety_facilities'] },
  { id: 'after', title: 'Wrap-up & home', sub: 'Pack-up, clean-up and getting everyone home', trades: ['end_to_end_event_logistics', 'transportation', 'passenger_transport', 'loading_unloading_crew', 'mini_truck_pickup', 'medium_large_goods_vehicle', 'warehouse_storage'] },
]
const PHASE_OF = Object.fromEntries(PHASES.flatMap(p => p.trades.map(t => [t, p.id])))
const IN_JOURNEY = new Set(['care', 'after'])
const BADGE = { must: 'Essential', often: 'Recommended', extra: 'Suggested' }

export default function Recommend() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const [ready, setReady] = useState(false)
  if (!o) return <Navigate to="/" replace />
  const ev = plan.event
  if (ev.occasionId !== o.id || !ev.date) return <Navigate to={`/o/${o.id}`} replace />

  const { rows, needed } = needsFor(o, plan.picks[o.id] ?? {}, ev)
  const why = t => o.why[t] ?? TRADE[t].why
  const inPhase = rows.filter(r => r.tier !== 'extra' || IN_JOURNEY.has(PHASE_OF[r.tradeId]))
  const addOns = rows.filter(r => r.tier === 'extra' && !IN_JOURNEY.has(PHASE_OF[r.tradeId]))
  const toggle = r => {
    if (r.tradeId === 'venue') return plan.setEvent({ venue: r.state === 'have' ? 'need' : 'have' })
    plan.setPick(o.id, r.tradeId, r.state === 'need' ? (r.tier === 'must' ? 'have' : 'skip') : 'need')
  }
  const venueText = o.whereLabel ?? (ev.venue === 'have' ? 'Your own venue' : ev.venueKind ? VENUE_KINDS[ev.venueKind].label : 'Venue to find')

  if (!ready) return <SettingUp id={`plan-${o.id}`} title={`Setting up your ${o.name}…`} onDone={() => setReady(true)}
    lines={[`${dayLabel(ev.date)} locked in`, ev.guests ? `Planning for ${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : 'Sizing it to your guests', `Picking what a ${o.name.toLowerCase()} needs`, 'Lining up masters near you']} />

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title={o.name} sub={o.categoryShort} />
      <Journey at={1} />

      <section className="px-4 pt-1">
        <h2 className="text-[25px] font-extrabold leading-[1.08] tracking-[-0.035em]">Everything your {o.name} needs</h2>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-3)]">From the venue to getting everyone home. Take off what you don’t need, add what you’d love.</p>
        <div className="cx-noscroll -mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4 pb-1">
          <Fact icon={CalendarDays} onClick={() => navigate(`/o/${o.id}?step=when`)}>{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</Fact>
          <Fact icon={Users} onClick={() => navigate(`/o/${o.id}?step=guests`)} empty={!ev.guests}>{ev.guests ? `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : 'Guests later'}</Fact>
          <Fact icon={MapPin} onClick={o.where === 'ask' ? () => navigate(`/o/${o.id}?step=venue`) : null}>{venueText}</Fact>
        </div>
      </section>

      {PHASES.map(p => {
        const list = inPhase.filter(r => PHASE_OF[r.tradeId] === p.id).sort((x, y) => p.trades.indexOf(x.tradeId) - p.trades.indexOf(y.tradeId))
        if (!list.length) return null
        return (
          <section key={p.id} className="mt-6" data-phase={p.id}>
            <div className="flex items-baseline justify-between gap-3 px-4 pb-2.5">
              <div className="min-w-0">
                <h3 className="text-[17px] font-extrabold tracking-[-0.025em]">{p.title}</h3>
                <p className="text-[12px] font-semibold text-[var(--ink-3)]">{p.sub}</p>
              </div>
              <span className="cx-num shrink-0 text-[12px] font-extrabold text-[var(--brand)]">{list.filter(r => r.state === 'need').length}/{list.length}</span>
            </div>
            <ul className="mx-4 overflow-hidden rounded-[22px] shadow-[0_0_0_1px_var(--line)]">
              {list.map((r, i) => <Row key={r.tradeId} row={r} first={!i} why={why(r.tradeId)} onToggle={() => toggle(r)} />)}
            </ul>
          </section>
        )
      })}

      {addOns.length > 0 && (
        <section className="mt-8" data-addons>
          <div className="px-4 pb-3">
            <h3 className="flex items-center gap-1.5 text-[17px] font-extrabold tracking-[-0.025em]"><Sparkles size={17} className="text-[var(--gold)]" />Make it unforgettable</h3>
            <p className="text-[12px] font-semibold text-[var(--ink-3)]">Add-ons families love for a {o.name.toLowerCase()}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3">
            {addOns.map(r => <AddOnCard key={r.tradeId} tradeId={r.tradeId} why={why(r.tradeId)} on={r.state === 'need'} onToggle={() => toggle(r)} />)}
          </div>
        </section>
      )}

      <ActionBar note="Free to plan. Nothing is charged until you confirm.">
        <button type="button" disabled={!needed.length} onClick={() => navigate(`/o/${o.id}/needs`)} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-find>
          Continue · {plural(needed.length, 'service')}<ChevronRight size={19} />
        </button>
      </ActionBar>
    </main>
  )
}

function Fact({ icon: Icon, children, onClick, empty = false }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick ?? undefined}
      className={'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12.5px] font-extrabold ' + (onClick ? 'cx-press ' : '') + (empty ? 'border border-dashed border-[var(--am-300)] bg-white text-[var(--brand)]' : 'bg-[var(--am-100)] text-[var(--am-ink)]')}>
      <Icon size={14} />{children}{onClick && <Pencil size={11} className="opacity-60" />}
    </Tag>
  )
}

function Row({ row, first, why, onToggle }) {
  const t = TRADE[row.tradeId]
  const on = row.state === 'need'
  const off = row.state === 'have' ? 'You have this covered' : row.state === 'skip' ? 'Not needed for this one' : null
  return (
    <li className={(first ? '' : 'border-t border-[var(--line)] ') + 'bg-white'} data-need={row.tradeId} data-state={row.state}>
      <button type="button" onClick={onToggle} aria-pressed={on} className="cx-press flex w-full items-center gap-3 p-3 text-left active:bg-[var(--am-50)]">
        <ArtFill art={serviceArt(row.tradeId)} tone="#F6F1FF" className={'h-[54px] w-[54px] shrink-0 rounded-[15px] transition ' + (on || row.state === 'off' ? '' : 'opacity-45 grayscale')} inset="12%" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={'truncate text-[14.5px] font-extrabold tracking-[-0.015em] ' + (off ? 'text-[var(--ink-3)]' : '')}>{t.label}</span>
            <span className={'shrink-0 rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold uppercase tracking-[0.06em] ' + (row.tier === 'must' ? 'bg-[#FFF1D6] text-[#8A5300]' : row.tier === 'often' ? 'bg-[var(--am-100)] text-[var(--am-ink)]' : 'bg-[#E9F7F0] text-[#0B7A45]')}>{BADGE[row.tier]}</span>
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[12px] font-semibold leading-snug text-[var(--ink-2)]">{off ?? why}</span>
        </span>
        <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full transition ' + (on ? 'cx-pop bg-[var(--brand)] text-white shadow-[0_6px_14px_-6px_rgba(106,43,217,.9)]' : 'bg-white text-[var(--am-ink)] ring-2 ring-[var(--am-200)]')}>
          {on ? <Check size={15} strokeWidth={3} /> : <span className="text-[16px] font-extrabold leading-none">+</span>}
        </span>
      </button>
    </li>
  )
}

