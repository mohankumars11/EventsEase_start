/**
 * My Bookings (Mohan's reference, 2026-10-26): every booking, live, in
 * four tabs (All · Upcoming · Completed · Cancelled), "Loved their
 * service? Book again" after one that went ahead, and the services worth
 * adding to the next event. Celebrations still being planned on this
 * phone sit at the top, so nothing in progress is hidden.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { myPlans, planFromSaved } from '../lib/eventPlans'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, CalendarDays, CloudDownload, MailOpen, Search, Sparkles } from 'lucide-react'
import { usePlan, needsFor } from '../state/PlanContext'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { occasionArt } from '../data/art'
import { dayLabel, plural } from '../lib/format'
import { ArtFill, ServiceCard } from '../ui/art'
import Booked, { TABS } from './Booked'

const MORE = ['decoration_floral', 'photography', 'dj_music', 'cake_desserts', 'bridal_makeup_hair', 'catering_food', 'live_entertainment', 'gifts_favours']

export default function Plans() {
  const plan = usePlan()
  const [tab, setTab] = useState('all')
  const ids = [...new Set([plan.event.occasionId, ...plan.basket.map(l => l.occasionId)].filter(Boolean))]
  const solo = plan.basket.filter(l => !l.occasionId)

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <header className="cx-safe-top flex items-start justify-between gap-3 px-4 pb-1">
        <div className="pt-2">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.04em]">My Bookings</h1>
          <p className="text-[13px] font-semibold text-[var(--ink-3)]">All your events, in one place</p>
        </div>
        <div className="flex gap-1.5 pt-2">
          <Link to="/search" aria-label="Search" className="cx-press grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_0_0_1px_#EEE6FA]"><Search size={18} /></Link>
          <Link to="/notifications" aria-label="Notifications" className="cx-press grid h-10 w-10 place-items-center rounded-full bg-[var(--am-50)] text-[var(--am-ink)]"><Bell size={18} /></Link>
        </div>
      </header>

      <div className="cx-noscroll flex gap-2 overflow-x-auto px-4 py-3" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={'cx-press shrink-0 rounded-full px-5 py-2.5 text-[13px] font-extrabold transition ' + (tab === id ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_8px_18px_-10px_rgba(109,40,217,.9)]' : 'bg-[var(--am-50)] text-[var(--am-ink)]')}>{label}</button>
        ))}
      </div>

      {(tab === 'all' || tab === 'upcoming') && (ids.length > 0 || solo.length > 0) && (
        <section className="px-4 pb-4">
          <h2 className="pb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Being planned</h2>
          <div className="space-y-2">
            {ids.map(id => {
              const o = OCCASION[id]
              if (!o) return null
              const ev = plan.event.occasionId === id ? plan.event : { venue: 'need' }
              const { needed } = needsFor(o, plan.picks[id] ?? {}, ev)
              const picked = needed.filter(t => plan.lineFor(id, t))
              const next = needed.find(t => !plan.lineFor(id, t))
              const pct = needed.length ? Math.round((picked.length / needed.length) * 100) : 0
              return (
                <div key={id} className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#EEE6FA]" data-plan-card={id}>
                <Link to={next ? `/o/${id}/match` : '/plan'} className="cx-press flex gap-3 p-2.5">
                  <ArtFill art={occasionArt(o)} tone={o.tone} className="h-[78px] w-[78px] shrink-0 rounded-[14px]" inset="10%" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold tracking-[-0.02em]">{o.name}</p>
                    <p className="flex items-center gap-1 text-[11.5px] font-bold text-[var(--ink-3)]"><CalendarDays size={12} />{plan.event.date && plan.event.occasionId === id ? dayLabel(plan.event.date) : 'Date not set'} · {picked.length}/{plural(needed.length, 'master')}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--soft)]"><div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#5B21C8]" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1.5 flex items-center justify-between text-[12px] font-extrabold text-[var(--brand)]">{next ? `Next: ${TRADE[next].label}` : 'Ready to pay'}<ArrowRight size={14} /></p>
                  </div>
                </Link>
                <Link to={`/invites/new?o=${id}`} className="flex items-center gap-2 border-t border-[#F3EEF9] bg-[#FFF8FB] px-3 py-2.5 text-[12.5px] font-extrabold text-[#BE185D]" data-plan-invite={id}>
                  <MailOpen size={15} />Invite guests · see who’s coming<ArrowRight size={14} className="ml-auto" />
                </Link>
                </div>
              )
            })}
            {solo.length > 0 && (
              <Link to="/plan" className="cx-press flex items-center justify-between rounded-[20px] bg-white p-3.5 text-[14px] font-extrabold shadow-[0_0_0_1px_#EEE6FA]">
                Single services · {plural(solo.length, 'master')} picked<ArrowRight size={16} className="text-[var(--brand)]" />
              </Link>
            )}
          </div>
        </section>
      )}

      {(tab === 'all' || tab === 'upcoming') && <SavedPlans skip={ids} onResume={row => { const { event, picks } = planFromSaved(row); plan.setEvent(event); Object.entries(picks).forEach(([t, v]) => plan.setPick(row.occasion_id, t, v)) }} />}

      <Booked tab={tab} />

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[18px] font-black tracking-[-0.03em]">Add more for your next event</h2>
            <p className="text-[12px] font-semibold text-[var(--ink-3)]">Make it bigger and better in one tap</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--am-50)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--brand)]"><Sparkles size={12} />Recommended</span>
        </div>
        <div className="cx-rail cx-noscroll !gap-2 !px-3">
          {MORE.map(t => <div key={t} className="w-[31%] max-w-[150px]"><ServiceCard tradeId={t} /></div>)}
        </div>
      </section>
    </main>
  )
}

/* Plans saved to the account from another phone (or before a reinstall):
   one tap puts the plan — date, guests, event details, choices — back. */
function SavedPlans({ skip, onResume }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  useEffect(() => { if (user) myPlans(user.id).then(setRows).catch(() => {}) }, [user])
  const list = rows.filter(r => OCCASION[r.occasion_id] && !skip.includes(r.occasion_id) && r.status !== 'archived')
  if (!list.length) return null
  return (
    <section className="px-4 pb-4" data-saved-plans>
      <h2 className="pb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Saved on your account</h2>
      <div className="space-y-2">
        {list.map(r => {
          const o = OCCASION[r.occasion_id]
          return (
            <button key={r.id} type="button" onClick={() => { onResume(r); navigate(`/o/${o.id}/plan`) }} className="cx-press flex w-full items-center gap-3 rounded-[18px] bg-white p-2.5 text-left shadow-[0_0_0_1px_#EEE6FA]" data-resume={o.id}>
              <ArtFill art={occasionArt(o)} tone={o.tone} className="h-14 w-14 shrink-0 rounded-[12px]" inset="10%" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{o.name}</span>
                <span className="block text-[11.5px] font-bold text-[var(--ink-3)]">{r.context?.date ? dayLabel(r.context.date) : 'Date not set'} · {r.status === 'booked' ? 'Booked' : 'Planning'}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--am-100)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--am-ink)]"><CloudDownload size={14} />Resume</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
