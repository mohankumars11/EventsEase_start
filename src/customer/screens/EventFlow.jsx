/**
 * Screen 1 of 3 — the event, on one compact screen (spec 2026-11-02 §3).
 *
 *   date · start time · duration · guests · location · venue · budget (optional)
 *
 * Everything is visible at once with a sensible default already in it —
 * 6 PM, 4 hours, the occasion's usual head count, the location the phone
 * gave at sign-up — so the date is often the only thing to choose. The
 * date opens the full month calendar the app already had; time, duration
 * and budget are the phone's own pickers (native selects), which are the
 * fastest controls a phone has. Every change is kept on the phone, so
 * leaving and coming back loses nothing.
 *
 * "Create my event plan" → EventPlan.jsx (screen 2). No price here.
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarDays, ChevronDown, ChevronRight, Clock3, Hourglass, IndianRupee, LocateFixed, MapPin, Minus, Plus, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { occasionArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { dayLabel, iso, timeLabel } from '../lib/format'
import { ActionBar, BackHeader, Sheet } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { MonthCalendar } from './WhenSheet'
import PlaceSheet from './PlaceSheet'

const toMin = t => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
const toTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const TIMES = Array.from({ length: 36 }, (_, i) => toTime(6 * 60 + i * 30)) // 6:00 AM – 11:30 PM
const HOURS = [[1, '1 hour'], [2, '2 hours'], [3, '3 hours'], [4, '4 hours'], [5, '5 hours'], [6, '6 hours'], [8, '8 hours'], [10, '10 hours'], [12, 'Full day'], [24, '2 days'], [48, '3 days']]
/* Where it happens. "Help me find one" is the only answer that puts a venue
   in the plan; the rest say where it is, which is what masters travel to. */
export const VENUES = [['have', 'I have a venue'], ['need', 'Help me find one'], ['home', 'At my home'], ['restaurant', 'At a restaurant'], ['banquet', 'Banquet hall'], ['outdoor', 'Outdoor'], ['other', 'Other']]
const KIND = { restaurant: 'dining', banquet: 'banquet', outdoor: 'lawn' }
export const BUDGETS = [['', 'Not sure yet'], ['lt50k', 'Under ₹50,000'], ['50k-1l', '₹50,000 – ₹1,00,000'], ['1l-1.5l', '₹1,00,000 – ₹1,50,000'], ['1.5l-3l', '₹1,50,000 – ₹3,00,000'], ['3l-5l', '₹3,00,000 – ₹5,00,000'], ['5l+', 'Above ₹5,00,000']]
const FEEL = { lt50k: 'tight', '50k-1l': 'tight', '1l-1.5l': 'moderate', '1.5l-3l': 'moderate', '3l-5l': 'premium', '5l+': 'premium' }
const AT_HOME = new Set(['home', 'newhome'])

export default function EventFlow() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const mine = plan.event.occasionId === occasionId
  const ev0 = mine ? plan.event : {}
  const [f, setF] = useState(() => ({
    date: ev0.date ?? null, time: ev0.time ?? '18:00', hours: ev0.hours ?? 4, guests: ev0.guests ?? o?.bands?.[1] ?? 50,
    venueChoice: ev0.venueChoice ?? (o?.where === 'ask' ? null : AT_HOME.has(o?.where) ? 'home' : 'have'),
    venueOther: ev0.venueOther ?? '', budget: ev0.budget ?? '',
  }))
  const [sheet, setSheet] = useState(null) // 'date' | 'place'
  const place = plan.place?.lat ? plan.place : savedWhere()
  const set = patch => setF(x => ({ ...x, ...patch }))

  /* Today: nothing earlier than two hours from now, on the half hour. */
  const today = iso(new Date())
  const earliest = useMemo(() => { const n = new Date(); return Math.ceil((n.getHours() * 60 + n.getMinutes() + 120) / 30) * 30 }, [])
  const times = f.date === today ? TIMES.filter(t => toMin(t) >= earliest) : TIMES
  useEffect(() => { if (f.date === today && toMin(f.time) < earliest && times.length) set({ time: times[0] }) }, [f.date]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Saved as it changes — the plan screen and the live match read it. */
  const facts = () => ({
    occasionId, date: f.date, time: f.time, hours: f.hours, guests: f.guests,
    venue: f.venueChoice === 'need' || (!f.venueChoice && o?.where === 'ask') ? 'need' : 'have', venueKind: KIND[f.venueChoice] ?? null,
    venueChoice: f.venueChoice, venueOther: f.venueChoice === 'other' ? f.venueOther.trim() : '', budget: f.budget,
    context: { ...(mine ? plan.event.context ?? {} : {}), ...(f.venueChoice === 'home' ? { venueType: 'home' } : {}), ...(FEEL[f.budget] ? { budget: FEEL[f.budget] } : {}) },
  })
  useEffect(() => { if (o) plan.setEvent(facts()) }, [f]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />

  const go = () => {
    plan.setEvent(facts())
    if (!plan.place?.lat && place?.lat) plan.setPlace({ area: place.area, lat: place.lat, lng: place.lng, city: place.city ?? 'Bengaluru', address: place.address ?? '' })
    navigate(`/o/${o.id}/plan`)
  }
  const first = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
  const last = (() => { const d = new Date(first); d.setDate(d.getDate() + 119); return d })()

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-event-details>
      <BackHeader title="Event details" right={<span className="pr-1 text-[12px] font-bold text-[var(--ink-3)]">1 of 3</span>} />
      <Progress at={1} />

      <section className="flex items-center gap-3 px-4 pt-4">
        <ArtFill art={occasionArt(o)} tone={o.tone} className="h-[60px] w-[60px] shrink-0 rounded-[18px]" inset="8%" />
        <div className="min-w-0">
          <h1 className="text-[21px] font-black leading-tight tracking-[-0.03em]">{o.name}</h1>
          <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">Tell us the basics — we’ll make the plan.</p>
        </div>
      </section>

      <div className="mt-4 space-y-3.5 px-4">
        <Row icon={CalendarDays} label="Event date">
          <Field onClick={() => setSheet('date')} empty={!f.date} data-field="date">
            {f.date ? dayLabel(f.date) : 'Pick a date'}<CalendarDays size={17} className="text-[var(--brand)]" />
          </Field>
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <Row icon={Clock3} label="Start time">
            <Select value={f.time} onChange={v => set({ time: v })} data-field="time">
              {times.map(t => <option key={t} value={t}>{timeLabel(t)}</option>)}
            </Select>
          </Row>
          <Row icon={Hourglass} label="Duration">
            <Select value={String(f.hours ?? '')} onChange={v => set({ hours: v ? Number(v) : null })} data-field="hours">
              {HOURS.map(([h, l]) => <option key={h} value={h}>{l}</option>)}
              <option value="">Not sure</option>
            </Select>
          </Row>
        </div>

        <Row icon={Users} label="Number of guests">
          <div className="flex h-12 items-center rounded-[14px] bg-white shadow-[inset_0_0_0_1.5px_#E9E3F2]" data-field="guests">
            <button type="button" onClick={() => set({ guests: Math.max(1, f.guests - step(f.guests)) })} aria-label="Fewer guests" className="cx-press grid h-12 w-12 place-items-center text-[var(--ink-2)]"><Minus size={18} /></button>
            <input inputMode="numeric" value={f.guests} onChange={e => set({ guests: Math.max(1, Math.min(100000, Number(e.target.value.replace(/\D/g, '')) || 1)) })} aria-label="Number of guests"
              className="cx-num min-w-0 flex-1 bg-transparent text-center text-[17px] font-extrabold outline-none" />
            <button type="button" onClick={() => set({ guests: Math.min(100000, f.guests + step(f.guests)) })} aria-label="More guests" className="cx-press grid h-12 w-12 place-items-center text-[var(--ink-2)]"><Plus size={18} /></button>
          </div>
        </Row>

        <Row icon={MapPin} label="Event location">
          <Field onClick={() => setSheet('place')} empty={!place?.area} data-field="place">
            <span className="min-w-0 truncate">{place?.area ? `${place.address || place.area}${place.address ? '' : ', Bengaluru'}` : 'Choose the location'}</span>
            <LocateFixed size={17} className="shrink-0 text-[var(--brand)]" />
          </Field>
        </Row>

        <Row icon={Building2} label="Venue">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Venue" data-field="venue">
            {VENUES.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={f.venueChoice === k} onClick={() => set({ venueChoice: k })} data-venue={k}
                className={'cx-press rounded-full px-3.5 py-2.5 text-[13px] font-bold transition-colors ' + (f.venueChoice === k ? 'bg-[#F1E9FF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.5px_#E9E3F2]')}>
                {l}
              </button>
            ))}
          </div>
          {f.venueChoice === 'other' && (
            <input value={f.venueOther} onChange={e => set({ venueOther: e.target.value.slice(0, 80) })} placeholder="Where is it? e.g. our office terrace" autoFocus
              className="mt-2 h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-venue-other />
          )}
        </Row>

        <Row icon={IndianRupee} label={<>Approx. budget <span className="font-semibold text-[var(--ink-3)]">(optional)</span></>}>
          <Select value={f.budget} onChange={v => set({ budget: v })} data-field="budget">
            {BUDGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Row>
      </div>

      <ActionBar>
        <button type="button" disabled={!f.date} onClick={go} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-create-plan>
          {f.date ? <>Create my event plan<ChevronRight size={19} /></> : 'Pick the date to continue'}
        </button>
      </ActionBar>

      <Sheet open={sheet === 'date'} onClose={() => setSheet(null)} title="Event date">
        <div className="pb-4"><MonthCalendar value={f.date} first={first} last={last} onPick={d => { set({ date: d }); setSheet(null) }} /></div>
      </Sheet>
      <PlaceSheet open={sheet === 'place'} onClose={() => setSheet(null)} value={plan.place} onPick={p => { plan.setPlace(p); setSheet(null) }} />
    </main>
  )
}

const step = n => (n >= 1000 ? 100 : n >= 200 ? 25 : n >= 50 ? 10 : 1)

export function Progress({ at }) {
  return (
    <div className="mx-4 flex gap-1.5" aria-label={`Step ${at} of 3`}>
      {[1, 2, 3].map(i => <span key={i} className={'h-[4px] flex-1 rounded-full ' + (i <= at ? 'bg-gradient-to-r from-[#6D28D9] to-[#9333EA]' : 'bg-[#EEE9F5]')} />)}
    </div>
  )
}

function Row({ icon: Icon, label, children }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ink)]"><Icon size={15} className="text-[var(--ink-3)]" />{label}</p>
      {children}
    </div>
  )
}

function Field({ onClick, empty, children, ...rest }) {
  return (
    <button type="button" onClick={onClick} {...rest}
      className={'cx-press flex h-12 w-full items-center justify-between gap-2 rounded-[14px] bg-white px-3.5 text-left text-[15px] font-bold shadow-[inset_0_0_0_1.5px_#E9E3F2] ' + (empty ? 'text-[var(--ink-3)]' : 'text-[var(--ink)]')}>
      {children}
    </button>
  )
}

function Select({ value, onChange, children, ...rest }) {
  return (
    <label className="relative block">
      <select value={value} onChange={e => onChange(e.target.value)} {...rest}
        className="h-12 w-full appearance-none rounded-[14px] bg-white pl-3.5 pr-9 text-[15px] font-bold text-[var(--ink)] shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]">
        {children}
      </select>
      <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
    </label>
  )
}
