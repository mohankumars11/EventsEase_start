/**
 * Find masters, for a whole celebration — Blinkit's shape.
 *
 * Down the left, every service the plan includes, each with where it
 * stands: a green tick once a master is picked, an amber dot while it is
 * still open. On the right, the masters for the selected one (ui/masters),
 * already narrowed to what the customer said they need. A service can be
 * taken out of the plan from here, and "Best of each" fills every open
 * one with its top match in one tap.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan, needsFor } from '../state/PlanContext'
import { partnersFor, rank } from '../lib/market'
import { filterByNeeds, loadCuisines } from '../lib/needs'
import { dayLabel, plural } from '../lib/format'
import { BackHeader, Journey, PlanBar } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { MastersPanel } from '../ui/masters'
import { OfferStrip } from '../ui/offers'
import { needsSummary } from '../ui/needs'
import Buddy from '../ui/Buddy'

export default function Match() {
  const { occasionId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const o = OCCASION[occasionId]
  const plan = usePlan()
  const [busy, setBusy] = useState(false)
  const ev = o && plan.event.occasionId === o.id ? plan.event : { venue: 'need' }
  const { needed, rows } = o ? needsFor(o, plan.picks[o.id] ?? {}, ev) : { needed: [], rows: [] }
  const sel = needed.includes(params.get('t')) ? params.get('t') : needed[0]
  const choose = t => setParams({ t }, { replace: true })
  useEffect(() => { window.scrollTo({ top: 0 }) }, [sel])
  if (!o) return <Navigate to="/" replace />

  const chosen = needed.filter(t => plan.lineFor(o.id, t)).length
  const facts = [plan.event.date && dayLabel(plan.event.date), ev.guests && `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}`].filter(Boolean).join(' · ')
  const removeService = t => {
    const line = plan.lineFor(o.id, t)
    if (line) plan.remove(line.key)
    plan.setPick(o.id, t, 'skip')
    const rest = needed.filter(x => x !== t)
    if (rest.length) choose(rest[0])
  }
  async function bestOfEach() {
    setBusy(true)
    try {
      await loadCuisines(supabase).catch(() => {})
      for (const t of needed) {
        if (plan.lineFor(o.id, t)) continue
        const all = await partnersFor(t).catch(() => [])
        const top = rank(filterByNeeds(all, t, plan.needsOf(o.id, t), ev.guests).list ?? [])[0]
        if (top) plan.add(top, o.id)
      }
    } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+110px)]">
      <BackHeader title={`Masters for ${o.name}`} sub={facts || 'Add a date and guest count for exact prices'} />
      <Journey at={3} occasionId={o.id} />

      <div className="mx-3 mb-2.5 flex items-center gap-3 rounded-[18px] bg-[var(--brand-tint)] px-3 py-2.5">
        <Ring done={chosen} of={needed.length} />
        <p className="min-w-0 flex-1 text-[12.5px] font-bold leading-snug text-[var(--brand-deep)]">
          {needed.length && chosen === needed.length ? 'Every service has a master. You’re all set!' : `${plural(needed.length - chosen, 'service')} still open — pick or let us choose.`}
        </p>
        {chosen < needed.length && (
          <button type="button" disabled={busy} onClick={bestOfEach} className="cx-press flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[var(--am-ink)] shadow-[0_0_0_1px_var(--am-300)]" data-best>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}Best of each
          </button>
        )}
        {needed.length > 0 && chosen === needed.length && <button type="button" onClick={() => navigate('/plan')} className="cx-press shrink-0 rounded-full bg-[#0C831F] px-3.5 py-2 text-[12px] font-extrabold text-white">Review</button>}
      </div>
      <OfferStrip className="mx-3 mb-2.5" />

      <div className="flex">
        <nav className="sticky top-[calc(env(safe-area-inset-top,0px)+60px)] max-h-[calc(100dvh-140px)] w-[84px] shrink-0 self-start overflow-y-auto border-r border-[#F1ECF8] pb-6 cx-noscroll" aria-label="Your services">
          {needed.map(t => {
            const on = t === sel
            const done = !!plan.lineFor(o.id, t)
            const told = !!needsSummary(t, plan.needsOf(o.id, t))
            return (
              <button key={t} type="button" onClick={() => choose(t)} aria-current={on ? 'true' : undefined} className="relative flex w-full flex-col items-center gap-1 px-1 py-2.5 text-center" data-side={t} data-done={done}>
                {on && <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l-full bg-[#0C831F]" />}
                <span className="relative">
                  <ArtFill art={serviceArt(t)} tone={done ? '#E9F8EF' : on ? '#F3ECFF' : '#F7F4FB'} className={'h-[52px] w-[52px] rounded-full ' + (done ? 'ring-2 ring-[#16A34A]' : '')} inset="14%" />
                  <span className={'absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white ' + (done ? 'bg-[#0C831F] text-white' : told ? 'bg-[#F59E0B]' : 'bg-[#E5E0EA]')}>
                    {done && <Check size={12} strokeWidth={3.4} />}
                  </span>
                </span>
                <span className={'text-[10.5px] leading-tight ' + (on ? 'font-extrabold text-[var(--ink)]' : 'font-semibold text-[var(--ink-2)]')}>{TRADE[t].label}</span>
                <span className={'text-[9.5px] font-extrabold ' + (done ? 'text-[#0C831F]' : 'text-[#B45309]')}>{done ? 'Done' : 'Pending'}</span>
              </button>
            )
          })}
          <Link to={`/o/${o.id}/plan`} className="flex flex-col items-center gap-1 px-1 py-2.5 text-center">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dashed border-[#D9CCF2] text-[var(--brand)]"><Plus size={20} /></span>
            <span className="text-[10.5px] font-extrabold text-[var(--brand)]">Add more</span>
          </Link>
        </nav>

        <div className="min-w-0 flex-1">
          {sel ? (
            <>
              <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-black tracking-[-0.03em]">{TRADE[sel].label}</p>
                  <p className={'truncate text-[11.5px] font-bold ' + (plan.lineFor(o.id, sel) ? 'text-[#0C831F]' : 'text-[var(--ink-3)]')}>
                    {plan.lineFor(o.id, sel) ? `✓ ${plan.lineFor(o.id, sel).name} — you’re set` : (o.why[sel] ?? TRADE[sel].why)}
                  </p>
                </div>
                <button type="button" onClick={() => removeService(sel)} aria-label={`Remove ${TRADE[sel].label}`} className="cx-press flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#F7F5FA] px-3 text-[12px] font-extrabold text-[var(--ink-2)]" data-remove-service>
                  <Trash2 size={14} />Remove
                </button>
              </div>
              <MastersPanel key={sel} tradeId={sel} occasionId={o.id} guests={ev.guests ?? null}
                onCompanion={t => { if (!needed.includes(t)) plan.setPick(o.id, t, 'need'); choose(t) }} />
            </>
          ) : (
            <p className="p-6 text-center text-[13.5px] font-semibold text-[var(--ink-2)]">No services in this plan. <Link to={`/o/${o.id}/plan`} className="font-extrabold text-[var(--brand)]">Add some</Link></p>
          )}
        </div>
      </div>
      <PlanBar withTabs={false} />
      <Buddy id={`match-${o.id}`} bottom={124} lines={[
        'These are your masters, priced for what you asked. Tap Add on the one you like — that’s it ⚡',
        'Comparing? Tap Compare and pick up to three side by side.',
        'Still there? Add one master per service and pay for all of it in one go.',
      ]} />
    </main>
  )
}

function Ring({ done, of }) {
  return (
    <span className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2D6FF" strokeWidth="4" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={of && done === of ? '#0C831F' : 'var(--brand)'} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(done / Math.max(of, 1)) * 97.4} 97.4`} className="transition-all duration-500" />
      </svg>
      <span className="cx-num absolute inset-0 grid place-items-center text-[11.5px] font-extrabold text-[var(--brand-deep)]">{done}/{of}</span>
    </span>
  )
}
