/**
 * Your event, day by day — the journey and the schedule as ONE dated
 * timeline (Mohan, 2026-11-13: "event journey and schedule are verbose …
 * customise it per occasion and per the services chosen … what happens
 * before, on the day and after … use icons, less text, minimal scrolling
 * … tell them the master will call, and they can follow every master on
 * a live map on the day — this is where trust is built").
 *
 * A strip of dated stops (Today · D-14 · D-7 · D-2 · D-1 · the day · after),
 * only the ones that have something to do; tap one and its card shows the
 * few things that happen then, each marked with the service doing it. The
 * lines come from the occasion's own blueprint timeline first, then from
 * what each chosen service really does to get ready (a caterer buys fresh
 * produce the day before; a priest sends the samagri list). The day itself
 * carries the live-tracking promise: every master's route on the map.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, CalendarClock, MapPin, Navigation, Phone, Radio } from 'lucide-react'
import { TRADE_GROUPS } from '../data/trades'

/* A service shows its group's 3D mark (food, media, space, rituals …). */
const GROUP = Object.fromEntries(TRADE_GROUPS.flatMap(g => g.trades.map(t => [t.id, `svc:${g.id}`])))
import Glyph3D from './Glyph3D'

const atDay = (iso, off) => { const d = iso ? new Date(`${iso}T00:00:00`) : new Date(); d.setDate(d.getDate() + off); return d }
const short = d => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/* What each service does to get ready, and when (days before the event). */
const PREP = {
  venue: [[-7, 'Walk through the hall, fix the layout']],
  catering_food: [[-7, 'Menu locked, headcount confirmed'], [-1, 'Fresh vegetables, groceries & flowers for the counters bought'], [0, 'Cooking from dawn, served hot on time']],
  restaurant: [[-3, 'Table or private room held for your group']],
  decoration_floral: [[-3, 'Flowers and props ordered'], [0, 'Set-up starts 4–6 hours before guests arrive']],
  photography: [[-2, 'Shot list and family names shared'], [21, 'Edited photos delivered in your app']],
  videography: [[-2, 'Key moments agreed'], [30, 'Highlight film delivered']],
  cake_desserts: [[-3, 'Design and flavour signed off'], [-1, 'Baked fresh'], [0, 'Delivered two hours before']],
  priest_rituals: [[-3, 'Pooja samagri list sent to you'], [0, 'Rituals at the muhurtham']],
  bridal_makeup_hair: [[-7, 'Trial look, if you asked for one'], [0, 'Ready two hours before the first photo']],
  mehendi_artist: [[-1, 'Fresh cones made; mehendi a day ahead so the colour deepens']],
  dj_music: [[-2, 'Your playlist and must-plays shared'], [0, 'Sound check before guests arrive']],
  live_entertainment: [[-2, 'Act timing set with your schedule']],
  anchor_mc: [[-2, 'Script and names run through']],
  sound_av: [[0, 'Sound check an hour before']],
  event_lighting: [[0, 'Lights up and tested before dusk']],
  tent_furniture: [[-1, 'Tent, chairs and tables put up']],
  event_equipment_rental: [[-1, 'Equipment delivered and checked']],
  passenger_transport: [[-1, 'Pickup points and times shared']],
  invitation_printing: [[-21, 'Printed cards proofed and delivered']],
  gifts_favours: [[-3, 'Return gifts packed and labelled']],
  bar_beverages: [[-2, 'Drinks menu and stock confirmed']],
  guest_services: [[-1, 'Guest list and seating shared with the hosts']],
  security_services: [[0, 'Guards briefed at the gate']],
  valet_parking: [[0, 'Valets in place before the first car']],
  safety_facilities: [[-1, 'Washrooms and first aid set up']],
}
/* The stops, in order; a stop with nothing to do is left out. */
const STOPS = [[-21, '3 weeks'], [-14, '2 weeks'], [-7, 'A week'], [-3, '3 days'], [-2, '2 days'], [-1, 'Eve'], [0, 'The day'], [21, 'After']]

export default function EventTimeline({ o, ev, needed, timeline }) {
  const before = timeline?.before ?? [], during = timeline?.during ?? [], after = timeline?.after ?? []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = ev.date ? Math.round((atDay(ev.date, 0) - today) / 86400000) : 30
  const stops = useMemo(() => {
    const at = {}
    const add = (off, mark, text) => { const k = off >= 14 ? 21 : off >= 1 ? 21 : off; (at[k] ??= []).push({ mark, text }) }
    /* Today: the booking itself, in the app. */
    const now = { off: 'now', label: 'Today', date: today, items: [
      { mark: 'svc:plan', text: 'Send your quotations — masters reply with exact prices' },
      { mark: 'all', text: 'Accept one, pay to lock the date — the rest is held in escrow' },
    ] }
    /* The occasion's own before-steps, spread across the weeks. */
    const spread = [-14, -7, -2]
    before.slice(0, 3).forEach((t, i) => add(spread[i], 'svc:plan', t))
    if (!before.some(t => /invit/i.test(t))) add(-14, 'svc:invite', 'Send the e-invite — guests RSVP in one tap')
    add(-3, 'svc:invite', 'RSVP closes — your headcount goes to every master')
    for (const t of needed) for (const [off, text] of PREP[t] ?? []) if (off <= 0) add(off, `svc:${t}`, text)
    /* The day: the occasion's own run of events, and live tracking. */
    during.slice(0, 3).forEach(t => add(0, o.category, t))
    /* After: what happens next. */
    after.slice(0, 2).forEach(t => add(21, 'special', t))
    for (const t of needed) for (const [off, text] of PREP[t] ?? []) if (off > 0) add(21, `svc:${t}`, text)
    add(21, 'all', 'Masters paid only once you confirm it was delivered')
    const list = STOPS.filter(([off]) => at[off]?.length && (off >= 0 || off >= -days)).map(([off, label]) => ({ off, label, date: atDay(ev.date, off >= 21 ? 3 : off), items: at[off].slice(0, 4) }))
    return [now, ...list]
  }, [ev.date, needed.join('|'), o.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const dayIndex = stops.findIndex(s => s.off === 0)
  const [sel, setSel] = useState(Math.max(0, dayIndex))
  const cur = stops[Math.min(sel, stops.length - 1)]
  const strip = useRef(null)
  /* It moves on its own (Mohan, 2026-11-14: "nobody would come to know they
     can click — keep navigating one by one automatically, and let the user
     click too"): a stop every 3.2 s; a tap holds it there for 15 s. */
  const hold = useRef(0)
  useEffect(() => {
    if (stops.length < 2) return
    const t = setInterval(() => { if (Date.now() < hold.current) return; setSel(s => (s + 1) % stops.length) }, 3200)
    return () => clearInterval(t)
  }, [stops.length])
  const choose = i => { hold.current = Date.now() + 15000; setSel(i) }
  useEffect(() => { const el = strip.current?.children[sel]; if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - strip.current.offsetLeft - 8, behavior: 'smooth' }) }, [sel])
  const glyphFor = m => (m === 'svc:invite' ? GROUP.invitation_printing ?? 'svc:guests' : m.startsWith('svc:') && GROUP[m.slice(4)] ? GROUP[m.slice(4)] : m)

  return (
    <section className="mx-3 mt-5 rounded-[24px] bg-white p-3 shadow-[0_0_0_1px_#EEE8F8,0_20px_40px_-34px_rgba(58,18,144,.7)]" data-event-timeline>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em] text-[#1C1033]"><CalendarClock size={19} className="text-[#7C3AED]" />Your event, day by day</h2>
        <span className="shrink-0 rounded-full bg-[#F4EEFF] px-2.5 py-1 text-[11px] font-extrabold text-[#5B21B6]">{days > 0 ? `In ${days} days` : days === 0 ? 'Today' : short(atDay(ev.date, 0))}</span>
      </div>
      <p className="mt-0.5 px-1 text-[11px] font-semibold text-[var(--ink-3)]">Plays through every stop — tap any day to hold it.</p>

      {/* The dated stops. */}
      <div ref={strip} className="cx-noscroll relative mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" data-timeline-stops>
        {stops.map((s, i) => {
          const on = i === sel, day = s.off === 0
          return (
            <button key={String(s.off)} type="button" role="tab" aria-selected={on} onClick={() => choose(i)} data-stop={s.off}
              className={'cx-press relative flex w-[66px] shrink-0 flex-col items-center overflow-hidden rounded-[14px] py-1.5 text-center transition-[background,box-shadow] ' + (on ? (day ? 'bg-gradient-to-b from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_10px_20px_-12px_rgba(91,33,182,.95)]' : 'bg-[#1C1033] text-white') : day ? 'bg-[#F4EEFF] text-[#4C1D95]' : 'bg-[#FAF8FD] text-[#2E1A4F] shadow-[inset_0_0_0_1px_#EEE9F5]')}>
              {on && <span key={`p${sel}`} aria-hidden className="cx-story absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#FDE68A]" style={{ animationDuration: '3.2s' }} />}
              <span className="text-[9.5px] font-black uppercase tracking-[0.1em] opacity-75">{s.label}</span>
              <span className="text-[12.5px] font-black leading-tight">{s.off === 'now' ? 'Now' : s.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span className="mt-0.5 flex h-1.5 gap-0.5">{s.items.slice(0, 4).map((_, k) => <span key={k} className={'h-1.5 w-1.5 rounded-full ' + (on ? 'bg-[#FDE68A]' : 'bg-[#A78BFA]')} />)}</span>
            </button>
          )
        })}
      </div>

      {/* What happens then. */}
      <ul key={String(cur.off)} className="cx-rise mt-2 space-y-1.5" data-timeline-items>
        {cur.items.map((x, k) => (
          <li key={k} className="flex items-center gap-2.5 rounded-[14px] bg-[#FAF8FD] p-2 shadow-[inset_0_0_0_1px_#F0EBF8]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white shadow-[0_0_0_1px_#EEE8F8]"><Glyph3D id={glyphFor(x.mark)} size={28} /></span>
            <span className="min-w-0 flex-1 text-[12.5px] font-bold leading-snug text-[#2E1A4F]">{x.text}</span>
          </li>
        ))}
      </ul>

      {/* On the day: every master, live — the trust line. */}
      {cur.off === 0 && (
        <div className="cx-rise mt-2 overflow-hidden rounded-[18px] bg-[#0F0A1F] text-white" data-live-tracking>
          <div className="relative h-[86px]" style={{ background: 'radial-gradient(120% 120% at 20% 30%, #1E3A5F 0%, #0F0A1F 70%)' }}>
            <span aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <svg aria-hidden viewBox="0 0 320 86" className="absolute inset-0 h-full w-full">
              <path d="M18 70 C 80 70, 90 24, 160 30 S 250 64, 300 20" fill="none" stroke="#A78BFA" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
              <circle r="6" fill="#FDE68A"><animateMotion dur="4s" repeatCount="indefinite" path="M18 70 C 80 70, 90 24, 160 30 S 250 64, 300 20" /></circle>
            </svg>
            <span className="absolute right-3 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#22C55E] ring-4 ring-[#22C55E]/25"><MapPin size={15} /></span>
            <span className="absolute left-3 top-2 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ring-white/20"><Radio size={10} className="text-[#4ADE80]" />Live on the day</span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-2.5 text-center text-[10.5px] font-bold leading-tight text-white/85">
            <span className="flex flex-col items-center gap-1"><Phone size={15} className="text-[#FDE68A]" />Your master calls before setting off</span>
            <span className="flex flex-col items-center gap-1"><Navigation size={15} className="text-[#FDE68A]" />Follow their route live on your map</span>
            <span className="flex flex-col items-center gap-1"><BadgeCheck size={15} className="text-[#FDE68A]" />Arrived, setting up, done — in your app</span>
          </div>
        </div>
      )}
    </section>
  )
}
