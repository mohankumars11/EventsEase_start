/**
 * The plan — the 360° engine's recommendation for this occasion, grouped
 * by lifecycle phase (bundle README §3.3–3.4).
 *
 *   shortlist      CORE + triggered CONDITIONAL (+ anything the customer added),
 *                  grouped under the phase where each happens, each with its reason
 *   covered        services the venue / occasion already provides, or that the
 *                  customer already arranged — shown, not suggested
 *   questions      CONDITIONAL services still waiting on context: one tap to answer
 *   add-ons        OPTIONAL upgrades — offered, never pre-ticked
 *   everything     the other trades, searchable (NOT_DEFAULT is never auto-shown)
 *
 * Per service: remove, "Already arranged", "Save for later", or add back.
 * "Recommended" here never means "available" — availability is only what a
 * master confirms on the next screens. No prices on this screen.
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BookmarkPlus, CalendarDays, Check, ChevronRight, CircleHelp, MapPin, MoreHorizontal, Pencil, Plus, Search, Sparkles, Undo2, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan, needsFor, contextFor } from '../state/PlanContext'
import { savePlan } from '../lib/eventPlans'
import { dayLabel, plural, timeLabel } from '../lib/format'
import { ActionBar, BackHeader, Journey, Sheet } from '../ui/kit'
import { AddOnCard, ArtFill } from '../ui/art'
import { SettingUp } from '../ui/needs'
import { VENUE_KINDS } from './Occasion'

const BADGE = { CORE: ['Essential', 'bg-[#FFF1D6] text-[#8A5300]'], CONDITIONAL: ['For your event', 'bg-[var(--am-100)] text-[var(--am-ink)]'], OPTIONAL: ['Add-on', 'bg-[#E9F7F0] text-[#0B7A45]'], NOT_DEFAULT: ['Added', 'bg-[#EEF2F6] text-[#475569]'] }

export default function Recommend() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [menu, setMenu] = useState(null)
  const [findOpen, setFindOpen] = useState(false)
  const [saved, setSaved] = useState(null)
  const ev = plan.event
  const picks = plan.picks[occasionId] ?? {}
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const plan360 = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev])

  /* Save to the account when signed in (migration 190); otherwise it stays on this phone. */
  useEffect(() => {
    if (!plan360 || !ready) return
    const t = setTimeout(async () => {
      const statuses = Object.fromEntries(plan360.result.services.map(s => [s.tradeId, s.status]))
      const r = await savePlan({ userId: user?.id, occasionId: o.id, context: contextFor(o, picks, ev), picks, statuses, lines: plan.basket.filter(l => l.occasionId === o.id), ruleVersion: plan360.result.ruleVersion })
      setSaved(r.ok ? 'account' : 'phone')
    }, 800)
    return () => clearTimeout(t)
  }, [plan360, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />
  const { rows, needed, result } = plan360
  const row = t => rows.find(r => r.tradeId === t)
  const covered = rows.filter(r => r.coveredByVenue || r.alreadyArranged)
  const later = rows.filter(r => r.savedForLater)
  const addOns = rows.filter(r => r.status === 'OPTIONAL' && r.state === 'off')
  const removed = rows.filter(r => r.customerExcluded)
  const pick = (t, v) => { plan.setPick(o.id, t, v); setMenu(null) }
  const venueText = o.whereLabel ?? (ev.venue === 'have' ? 'Your own venue' : ev.venueKind ? VENUE_KINDS[ev.venueKind].label : 'Venue to find')

  if (!ready) return <SettingUp id={`plan-${o.id}`} title={`Setting up your ${o.name}…`} onDone={() => setReady(true)}
    lines={[`${dayLabel(ev.date)} locked in`, ev.guests ? `Planning for ${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : 'Sizing it to your guests', `Picking what a ${o.name.toLowerCase()} needs`, 'Grouping it from set-up to clean-up']} />

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title={o.name} sub={o.categoryShort} />
      <Journey at={1} />

      <section className="px-4 pt-1">
        <h2 className="text-[24px] font-extrabold leading-[1.08] tracking-[-0.035em]">Your {o.name}, end to end</h2>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-3)]">{plural(needed.length, 'service')} recommended, from set-up to clean-up. Remove anything you don’t need.</p>
        <div className="cx-noscroll -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <Fact icon={CalendarDays} onClick={() => navigate(`/o/${o.id}?step=when`)}>{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</Fact>
          <Fact icon={Users} onClick={() => navigate(`/o/${o.id}?step=guests`)} empty={!ev.guests}>{ev.guests ? `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : 'Guests?'}</Fact>
          <Fact icon={MapPin} onClick={o.where === 'ask' ? () => navigate(`/o/${o.id}?step=venue`) : null}>{venueText}</Fact>
          <Fact icon={Pencil} onClick={() => navigate(`/o/${o.id}?step=about`)}>Event details</Fact>
        </div>
      </section>

      {result.followUps.length > 0 && (
        <button type="button" onClick={() => navigate(`/o/${o.id}?step=about`)} className="cx-press mx-3 mt-4 flex w-[calc(100%-24px)] items-center gap-3 rounded-[18px] bg-[#FFF8E6] p-3 text-left ring-1 ring-[#F6DFA2]" data-followups>
          <CircleHelp size={20} className="shrink-0 text-[#B45309]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold text-[#7A4B00]">{plural(result.followUps.length, 'quick question')} to sharpen this plan</span>
            <span className="block truncate text-[12px] font-semibold text-[#8A6420]">{result.followUps.map(q => q.text).join(' · ')}</span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-[#B45309]" />
        </button>
      )}

      {result.phases.map(p => (
        <section key={p.id} className="mt-6" data-phase={p.key}>
          <div className="flex items-baseline gap-2 px-4 pb-2">
            <span className="cx-num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-extrabold text-white">{p.id}</span>
            <h3 className="text-[16.5px] font-extrabold tracking-[-0.025em]">{p.title}</h3>
          </div>
          <ul className="mx-3 overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_var(--line)]">
            {p.tradeIds.map((t, i) => <Row key={t} r={row(t)} first={!i} onMenu={() => setMenu(t)} onRemove={() => pick(t, 'skip')} />)}
          </ul>
        </section>
      ))}

      {covered.length > 0 && (
        <section className="mt-6" data-covered>
          <h3 className="px-4 pb-2 text-[14px] font-extrabold text-[#0B6B3D]">Already covered</h3>
          <div className="mx-3 space-y-1.5">
            {covered.map(r => (
              <div key={r.tradeId} className="flex items-center gap-2.5 rounded-[14px] bg-[#F1FBF5] px-3 py-2.5">
                <Check size={16} strokeWidth={3} className="shrink-0 text-[#0C831F]" />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold">{TRADE[r.tradeId].label}</span><span className="block truncate text-[11.5px] font-semibold text-[#3C7A5A]">{r.reason}</span></span>
                {r.alreadyArranged && <button type="button" onClick={() => pick(r.tradeId, 'off')} className="shrink-0 text-[12px] font-extrabold text-[var(--brand)]">Undo</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      {addOns.length > 0 && (
        <section className="mt-7" data-addons>
          <div className="px-4 pb-3">
            <h3 className="flex items-center gap-1.5 text-[16.5px] font-extrabold tracking-[-0.025em]"><Sparkles size={16} className="text-[var(--gold)]" />Make it unforgettable</h3>
            <p className="text-[12px] font-semibold text-[var(--ink-3)]">Optional add-ons — only if you want them</p>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3">
            {addOns.slice(0, 9).map(r => <AddOnCard key={r.tradeId} tradeId={r.tradeId} why={o.why[r.tradeId] ?? TRADE[r.tradeId].why} on={false} onToggle={() => pick(r.tradeId, 'need')} />)}
          </div>
        </section>
      )}

      {(later.length > 0 || removed.length > 0) && (
        <section className="mt-6 px-4" data-parked>
          {later.length > 0 && <Parked title="Saved for later" items={later} onBack={t => pick(t, 'need')} />}
          {removed.length > 0 && <Parked title="Removed" items={removed} onBack={t => pick(t, 'off')} />}
        </section>
      )}

      <button type="button" onClick={() => setFindOpen(true)} className="cx-press mx-3 mt-6 flex w-[calc(100%-24px)] items-center gap-2.5 rounded-[16px] bg-[#FAF8FD] px-3.5 py-3 text-left shadow-[inset_0_0_0_1px_#E7E1F0]" data-find-any>
        <Search size={17} className="text-[var(--brand)]" /><span className="flex-1 text-[13.5px] font-extrabold text-[var(--ink-2)]">Need something else? Search all 34 services</span><ChevronRight size={16} className="text-[var(--ink-3)]" />
      </button>
      <p className="mt-4 px-4 text-center text-[11px] font-semibold text-[var(--ink-3)]">
        {saved === 'account' ? 'Saved to your account · ' : saved === 'phone' ? 'Saved on this phone · ' : ''}Recommendations {result.ruleVersion}
      </p>

      <ActionBar note="Recommended isn’t booked — masters confirm availability next. Nothing is charged until you pay.">
        <button type="button" disabled={!needed.length} onClick={() => navigate(`/o/${o.id}/needs`)} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-find>
          Continue · {plural(needed.length, 'service')}<ChevronRight size={19} />
        </button>
      </ActionBar>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ? TRADE[menu].label : ''}>
        {menu && (
          <div className="grid gap-2 pb-3">
            <p className="text-[12.5px] font-semibold text-[var(--ink-2)]">{row(menu)?.reason}</p>
            <MenuItem icon={Check} onClick={() => pick(menu, 'have')}>I’ve already arranged this</MenuItem>
            <MenuItem icon={BookmarkPlus} onClick={() => pick(menu, 'later')}>Save for later</MenuItem>
            <MenuItem icon={X} onClick={() => pick(menu, 'skip')}>Remove from my plan</MenuItem>
            <MenuItem icon={ChevronRight} onClick={() => { setMenu(null); navigate(`/s/${menu}?o=${o.id}`) }}>See masters for this</MenuItem>
          </div>
        )}
      </Sheet>
      <FindAny open={findOpen} onClose={() => setFindOpen(false)} rows={rows} onAdd={t => { pick(t, 'need'); setFindOpen(false) }} />
    </main>
  )
}

function Row({ r, first, onMenu, onRemove }) {
  const t = TRADE[r.tradeId]
  const [label, cls] = BADGE[r.addedByCustomer && r.status !== 'CORE' ? 'NOT_DEFAULT' : r.status]
  return (
    <li className={(first ? '' : 'border-t border-[var(--line)] ') + 'flex items-center gap-3 p-3'} data-need={r.tradeId} data-status={r.status}>
      <ArtFill art={serviceArt(r.tradeId)} tone="#F6F1FF" className="h-[52px] w-[52px] shrink-0 rounded-[14px]" inset="12%" />
      <button type="button" onClick={onMenu} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14.5px] font-extrabold tracking-[-0.015em]">{t.label}</span>
          <span className={'shrink-0 rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold uppercase tracking-[0.05em] ' + cls}>{label}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[12px] font-semibold leading-snug text-[var(--ink-2)]">{r.reason}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onMenu} aria-label="More options" className="cx-press grid h-8 w-8 place-items-center rounded-full text-[var(--ink-3)]"><MoreHorizontal size={18} /></button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${t.label}`} className="cx-press grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-white" data-remove><Check size={15} strokeWidth={3} /></button>
      </div>
    </li>
  )
}

function Parked({ title, items, onBack }) {
  return (
    <div className="mb-3">
      <p className="pb-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(r => <button key={r.tradeId} type="button" onClick={() => onBack(r.tradeId)} className="flex items-center gap-1 rounded-full bg-[#F4F1F8] px-3 py-1.5 text-[12px] font-bold text-[var(--ink-2)]"><Undo2 size={12} />{TRADE[r.tradeId].label}</button>)}
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, onClick, children }) {
  return <button type="button" onClick={onClick} className="cx-press flex items-center gap-3 rounded-[14px] bg-[#FAF8FD] px-3.5 py-3 text-left text-[14px] font-bold"><Icon size={17} className="text-[var(--brand)]" />{children}</button>
}

/* Every trade, searchable — including the ones never suggested by default. */
function FindAny({ open, onClose, rows, onAdd }) {
  const [q, setQ] = useState('')
  const list = rows.filter(r => r.state !== 'need' && (!q || TRADE[r.tradeId].label.toLowerCase().includes(q.toLowerCase())))
  return (
    <Sheet open={open} onClose={onClose} title="Add a service">
      <label className="flex h-11 items-center gap-2 rounded-[13px] bg-[#FAF8FD] px-3 shadow-[inset_0_0_0_1px_#E7E1F0]">
        <Search size={16} className="text-[var(--ink-3)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Photography, tent, valet…" className="h-full flex-1 bg-transparent text-[14px] font-semibold outline-none" />
      </label>
      <ul className="mt-2 max-h-[50dvh] overflow-y-auto pb-2">
        {list.map(r => (
          <li key={r.tradeId}>
            <button type="button" onClick={() => onAdd(r.tradeId)} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-2.5 text-left last:border-0">
              <ArtFill art={serviceArt(r.tradeId)} tone="#F6F1FF" className="h-10 w-10 shrink-0 rounded-[12px]" inset="10%" />
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{TRADE[r.tradeId].label}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{r.reason}</span></span>
              <Plus size={18} className="shrink-0 text-[var(--brand)]" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function Fact({ icon: Icon, children, onClick, empty = false }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick ?? undefined}
      className={'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12.5px] font-extrabold ' + (onClick ? 'cx-press ' : '') + (empty ? 'border border-dashed border-[var(--am-300)] bg-white text-[var(--brand)]' : 'bg-[var(--am-100)] text-[var(--am-ink)]')}>
      <Icon size={14} />{children}
    </Tag>
  )
}
