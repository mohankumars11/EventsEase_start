/**
 * Book a service on its own — /brief/:tradeId without an occasion
 * (Mohan, 2026-11-13: "Book a service should also take over these specific
 * inputs — whenever a person books photography, the specific event he is
 * looking for, the specific number").
 *
 * Four real pages, one question each (Mohan, 2026-11-15: "give the actual
 * page, mention what that step is, and going forward cover the previous
 * one in green, like the others"):
 *
 *   ( ✓ )─( ✓ )─(  Guests 3/4  )─( ◎ )
 *   Step 3 · Guests — how many are coming. Next: Details
 *
 *   1. Occasion — a search over all 438, the common ones one tap away.
 *      A photographer for a naming ceremony and one for a product launch
 *      are different asks, so this comes first.
 *   2. Date — a real month calendar, not a strip of days ("give the actual
 *      calendar itself — some people might not know how to use it"):
 *      weekend shortcuts on top, past days greyed, swipe for months.
 *   3. Guests — a big number, and the sizes that suit this occasion.
 *   4. Details — the same occasion-aware questions a celebration gets
 *      (ui/PrefPanel on data/prefSpecs).
 *
 * Finished steps are green ticks that take you back. Everything is saved
 * under needs['solo:<trade>'], which the masters list already reads, and
 * travels with the request.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Minus, Plus, SlidersHorizontal, Tag, Users } from 'lucide-react'
import { OCCASION, OCCASIONS } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { iso } from '../lib/format'
import { peopleAsk, peopleLine } from '../data/occasionProfile'
import PrefPanel from '../ui/PrefPanel'
import { ActionBar, BackHeader } from '../ui/kit'
import { ArtFill } from '../ui/art'
import OccasionLogo from '../ui/OccasionLogo'
import OccasionPicker from '../ui/OccasionPicker'

const SUGGEST = ['birthday-party', 'wedding-ceremony', 'wedding-reception', 'engagement-ceremony', 'housewarming-ceremony', 'naming-ceremony', 'baby-shower', 'haldi-ceremony', 'wedding-anniversary', 'corporate-annual-day', 'farewell-party', 'product-launch']
const OTHER_DAY = 'friends-get-together' // the plain gathering every other day is asked as
const STEPS = [
  ['Occasion', Tag, 'what the day is'],
  ['Date', CalendarDays, 'pick the day'],
  ['Guests', Users, 'how many are coming'],
  ['Details', SlidersHorizontal, 'what moves the price'],
]
/* Venues and restaurants are chosen by looking — photos, rooms, capacity —
   so they open as a list, filtered to this date and headcount. Every other
   service is asked for live: the request goes to the masters who fit, and
   they reply with exact prices (Mohan, 2026-11-13). */
const BROWSE = new Set(['venue', 'restaurant'])

export default function SoloBrief() {
  const { tradeId } = useParams()
  const [sp] = useSearchParams()
  const master = sp.get('master') // a master the customer was already looking at
  const navigate = useNavigate()
  const plan = usePlan()
  const t = TRADE[tradeId]
  const key = `solo:${tradeId}`
  const saved = plan.needsOf(null, tradeId)
  const [occId, setOccId] = useState(saved.$occasionId ?? null)
  const [named, setNamed] = useState(saved.$occasionName ?? '')
  const [date, setDate] = useState(saved.$date ?? plan.event.date ?? '')
  const [guests, setGuests] = useState(Number(saved.$guests) || Number(plan.event.guests) || 50)
  const [step, setStep] = useState(saved.$occasionId ? 1 : 0)
  const o = occId ? OCCASION[occId] : null
  const at = o ? Math.max(1, step) : 0
  const place = plan.place?.lat ? plan.place : savedWhere()
  const hits = useMemo(() => SUGGEST.map(id => OCCASION[id]).filter(Boolean), [])
  /* The panel reads and writes the solo key, never an occasion's. */
  const shim = useMemo(() => ({ needsOf: () => plan.needsOf(null, tradeId), setNeeds: (_, v) => plan.setNeeds(key, v) }), [plan, tradeId, key])
  const ev = { occasionId: occId, date: date || null, time: plan.event.time ?? '18:00', hours: plan.event.hours ?? 4, guests, company: null }
  const ask = o ? peopleAsk(o) : null
  const now = new Date()
  const firstIso = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) // a master needs a day to prepare
  /* Each step opens at its top. */
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [at])

  if (!t) return null
  const pick = (id, name = '') => { setOccId(id); setNamed(name); setStep(1); plan.setNeeds(key, { ...plan.needsOf(null, tradeId), $occasionId: id, $occasionName: name || null }) }
  const change = () => { setOccId(null); setStep(0) }
  const back = () => (at === 0 ? navigate(-1) : at === 1 ? change() : setStep(at - 1))
  const done = () => {
    /* The masters are checked for a date — so the date comes first, here, never on another screen. */
    if (!date) { setStep(1); return }
    const needs = { ...plan.needsOf(null, tradeId), $occasionId: occId, $occasionName: named || null, $date: date || null, $guests: guests, $done: true }
    plan.setNeeds(key, needs)
    /* The same answers under the occasion, so the live match reads them; the
       occasion keeps its own event facts (PlanContext.events). */
    plan.setNeeds(`${occId}:${tradeId}`, needs)
    plan.setEvent({ occasionId: occId, date: date || null, guests, time: ev.time, hours: ev.hours, venue: 'have', venueChoice: plan.eventOf(occId)?.venueChoice ?? 'have' })
    plan.setPick(occId, tradeId, 'need')
    if (BROWSE.has(tradeId)) navigate(`/o/${occId}/${tradeId === 'venue' ? 'venues' : 'restaurants'}`, { replace: true })
    else navigate(`/o/${occId}/live?only=${tradeId}${master ? `&master=${master}` : ''}`, { replace: true })
  }
  const noun = n => (n === 1 ? (ask?.noun ?? 'guest') : `${ask?.noun ?? 'guest'}s`)

  return (
    <main className="cx-enter relative min-h-[100dvh] overflow-hidden bg-white pb-[calc(env(safe-area-inset-bottom,0px)+120px)]" data-solo-brief={tradeId} data-solo-step={STEPS[at][0].toLowerCase()}>
      {/* A soft aurora behind the top of the screen — light, never a dark card. */}
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-28 h-[300px] w-[300px] rounded-full bg-[#C4B5FD]/45 blur-[70px]" />
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-[260px] w-[260px] rounded-full bg-[#93C5FD]/45 blur-[70px]" />
      <div className="relative">
        <BackHeader title={t.label} sub="Book a service" onBack={back} transparent />
        <Steps at={at} onGo={i => (i === 0 ? change() : setStep(i))} />

        {at === 0 && (
          <section key="occ" className="cx-rise mx-4 mt-5" data-solo-occasion>
            <div className="flex items-center gap-4">
              <span className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
                <span aria-hidden className="cx-orb-halo absolute inset-0 rounded-full bg-gradient-to-br from-[#A78BFA]/40 to-[#60A5FA]/40" />
                <span aria-hidden className="absolute inset-[3px] rounded-full border border-dashed border-[#7C3AED]/35 [animation:cx-spin_14s_linear_infinite]" />
                <ArtFill art={serviceArt(tradeId)} className="relative h-[62px] w-[62px] rounded-full bg-white shadow-[0_10px_24px_-12px_rgba(58,18,144,.7)]" inset="8%" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">{t.label}</p>
                <h1 className="text-[27px] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#140F1F]">What’s the occasion?</h1>
              </div>
            </div>
            <div className="mt-5"><OccasionPicker value={occId} typed={named} tradeLabel={t.label.toLowerCase()} onPick={id => pick(id)} onType={text => pick(OTHER_DAY, text)} /></div>
            <p className="mt-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#8E869E]"><span className="h-px flex-1 bg-[#ECE7F5]" />Popular for {t.label.toLowerCase()}<span className="h-px flex-1 bg-[#ECE7F5]" /></p>
            <ul className="mt-3 grid grid-cols-2 gap-2.5" data-solo-hits>
              {hits.slice(0, 6).map(x => (
                <li key={x.id}>
                  <button type="button" onClick={() => pick(x.id)} className="cx-press flex h-[64px] w-full items-center gap-2.5 rounded-[18px] bg-white/90 px-2.5 text-left shadow-[inset_0_0_0_1px_#ECE6F4,0_10px_20px_-18px_rgba(58,18,144,.6)] backdrop-blur" data-solo-pick={x.id}>
                    <OccasionLogo occasion={x} size={38} />
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-extrabold leading-[1.2] text-[#1C1033]">{x.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {at > 0 && (
          <section className="mx-4 mt-4 flex items-center gap-3 rounded-[22px] bg-white/90 p-3 shadow-[0_0_0_1px_#EEE8F8,0_18px_36px_-30px_rgba(58,18,144,.8)] backdrop-blur" data-solo-facts>
            <OccasionLogo occasion={o} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7C3AED]">{t.label} for</p>
              <p className="truncate text-[16.5px] font-extrabold leading-tight tracking-[-0.03em] text-[#1C1033]">{named || o.name}</p>
              {at >= 2 && date && <p className="truncate text-[11.5px] font-bold text-[#0F7A3D]">{longDay(date)}{at === 3 ? ` · ${guests.toLocaleString('en-IN')} ${noun(guests)}` : ''}</p>}
            </div>
            <button type="button" onClick={change} className="cx-btn shrink-0 rounded-full px-3.5 py-2 text-[12px] font-extrabold" data-solo-change>Change</button>
          </section>
        )}

        {at === 1 && (
          <section key="date" className="cx-rise mx-4 mt-3 rounded-[26px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F8,0_26px_50px_-36px_rgba(58,18,144,.8)]" data-solo-date-step>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.035em] text-[#1C1033]">When is the {(named || o.name).toLowerCase()}?</h2>
            <p className="mt-1 text-[12.5px] font-semibold text-[#8E869E]">Tap a day on the calendar. Only masters free that day will see your request.</p>
            <MonthCalendar value={date} onChange={setDate} min={firstIso} />
          </section>
        )}

        {at === 2 && (
          <section key="guests" className="cx-rise mx-4 mt-3 rounded-[26px] bg-white p-5 shadow-[0_0_0_1px_#EEE8F8,0_26px_50px_-36px_rgba(58,18,144,.8)]" data-solo-guests-step>
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#7C3AED]">{ask?.kicker ?? 'The guests'}</p>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.035em] text-[#1C1033]">{ask?.countTitle ?? ask?.title ?? 'How many guests?'}</h2>
            <p className="mt-1 text-[12.5px] font-semibold text-[#8E869E]">{ask?.countSub ?? ask?.sub ?? 'A good guess is fine — you can change it later.'}</p>
            <div className="mt-5 flex items-center gap-3 rounded-[24px] bg-[#FAF8FD] p-2.5 shadow-[inset_0_0_0_1px_#ECE6F4]" data-solo-guests>
              <button type="button" onClick={() => setGuests(g => Math.max(1, g - step5(g - 1)))} aria-label="Fewer" className="cx-btn grid h-14 w-14 shrink-0 place-items-center rounded-[18px]"><Minus size={22} strokeWidth={2.6} /></button>
              <span className="min-w-0 flex-1 text-center">
                <input inputMode="numeric" value={guests} onChange={e => setGuests(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} aria-label="How many" className="cx-num w-full bg-transparent text-center text-[44px] font-extrabold leading-none tracking-[-0.04em] text-[#1C1033] outline-none" />
                <span className="block text-[12px] font-bold text-[#8E869E]">{noun(guests)}</span>
              </span>
              <button type="button" onClick={() => setGuests(g => g + step5(g))} aria-label="More" className="cx-solid cx-press grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,.9)]"><Plus size={22} strokeWidth={2.6} /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2" data-solo-presets>
              {(ask?.picks ?? [25, 50, 100, 150, 250]).map(n => (
                <button key={n} type="button" onClick={() => setGuests(n)} aria-pressed={guests === n}
                  className={'h-11 rounded-[14px] text-[14px] font-extrabold ' + (guests === n ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_8px_16px_-8px_rgba(79,70,229,.9)]' : 'bg-white text-[#3A3450] shadow-[inset_0_0_0_1px_#E4DDF0]')}>{n.toLocaleString('en-IN')}</button>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#8E869E]"><Users size={12} />{peopleLine(o, ev)}</p>
          </section>
        )}

        {at === 3 && (
          <section key="details" className="cx-rise mx-4 mt-3 rounded-[26px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F8,0_26px_50px_-36px_rgba(58,18,144,.8)]" data-solo-prefs>
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#7C3AED]">What fits a {(named || o.name).toLowerCase()}</p>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.035em] text-[#1C1033]">Make it yours</h2>
            <p className="mb-3 text-[12.5px] font-semibold text-[#8E869E]">Only what moves the price or the match. Type your own answer anytime.</p>
            <PrefPanel o={o} t={tradeId} ev={ev} place={place} plan={shim} answers={{}} />
          </section>
        )}
      </div>

      {at > 0 && (
        <ActionBar note={at === 1 ? (date ? `${longDay(date)} — next, how many are coming` : 'Pick a day on the calendar to continue') : at === 2 ? 'Next: the details that fit your day' : 'Your answers travel with the request — each master confirms the price when they accept'}>
          {at < 3 ? (
            <button type="button" disabled={at === 1 && !date} onClick={() => setStep(at + 1)} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-solo-next={STEPS[at][0].toLowerCase()}>
              Continue to {STEPS[at + 1][0].toLowerCase()}<ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={done} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-solo-done>
              <Check size={18} strokeWidth={3} />{BROWSE.has(tradeId) ? `See ${tradeId === 'venue' ? 'venues' : 'restaurants'} for this date` : tradeId === 'cake_desserts' ? 'See bakers & prices live' : 'Find my masters live'}<ChevronRight size={18} />
            </button>
          )}
        </ActionBar>
      )}
    </main>
  )
}

/* Where you are: the step you are on spells its name in a lit pill;
   finished steps are green ticks that take you back (the same capsule as
   ui/EventJourney, for a single service). */
function Steps({ at, onGo }) {
  const next = STEPS[at + 1]
  return (
    <div className="mt-1" data-solo-steps={at}>
      <nav className="mx-4 flex items-center rounded-full bg-white/80 p-[5px] shadow-[inset_0_0_0_1px_#ECE4FA,0_10px_24px_-20px_rgba(58,18,144,.7)] backdrop-blur" aria-label={`Step ${at + 1} of ${STEPS.length}: ${STEPS[at][0]}`}>
        {STEPS.map(([label, Icon], i) => {
          const done = i < at, cur = i === at
          const node = cur
            ? (
              <span className="relative flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-3 py-[7px] text-white shadow-[0_8px_16px_-8px_rgba(91,33,182,.95)]" aria-current="step">
                <span aria-hidden className="cx-explore-sheen pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <Icon size={14} strokeWidth={2.6} className="relative shrink-0" />
                <span className="relative truncate text-[12.5px] font-black tracking-[-0.01em]">{label}</span>
                <span className="relative shrink-0 rounded-full bg-white/20 px-1.5 py-[1px] text-[9.5px] font-black">{i + 1}/{STEPS.length}</span>
              </span>
            )
            : (
              <span className={'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full ' + (done ? 'bg-[#16A34A] text-white shadow-[0_4px_10px_-5px_rgba(22,163,74,.9)]' : 'bg-white text-[#A79FBF] shadow-[0_0_0_1px_#E7E0F3]')} title={label}>
                {done ? <Check size={14} strokeWidth={3.2} /> : <Icon size={14} strokeWidth={2.2} />}
              </span>
            )
          return (
            <Fragment key={label}>
              {i > 0 && <span aria-hidden className={'mx-[3px] h-[2px] w-3 shrink-0 rounded-full ' + (i <= at ? 'bg-[#4ADE80]' : 'bg-[#E1D8F1]')} />}
              {done ? <button type="button" onClick={() => onGo(i)} aria-label={`Back to ${label}`} className="shrink-0" data-solo-back={label.toLowerCase()}>{node}</button> : node}
            </Fragment>
          )
        })}
      </nav>
      <p className="mx-4 mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold leading-snug text-[#8E869E]" data-solo-explain>
        <span className="min-w-0 flex-1 truncate"><b className="font-black text-[#5B21B6]">Step {at + 1} · {STEPS[at][0]}</b> — {STEPS[at][2]}</span>
        {next && <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#F5F1FC] px-2 py-[2px] text-[10.5px] font-extrabold text-[#6D28D9]">Next: {next[0]}<ChevronRight size={11} /></span>}
      </p>
    </div>
  )
}

/*
 * The calendar itself (Mohan, 2026-11-15: "give the actual calendar —
 * some people might not know how to use it"). A whole month at a glance:
 * the weekend shortcuts on top (most celebrations are on one), Sunday and
 * Saturday in rose, today ringed, days before the first bookable one greyed
 * out, the chosen day lit. Arrows or a swipe change the month; the line
 * underneath says the day back in words, and how far away it is.
 */
function MonthCalendar({ value, onChange, min }) {
  const minD = dateOf(min)
  const [view, setView] = useState(() => { const d = value && value >= min ? dateOf(value) : minD; return new Date(d.getFullYear(), d.getMonth(), 1) })
  const touch = useRef(null)
  const y = view.getFullYear(), m = view.getMonth()
  const lead = new Date(y, m, 1).getDay()
  const count = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const todayIso = iso(new Date())
  const canPrev = y > minD.getFullYear() || m > minD.getMonth()
  const go = k => { if (k < 0 && !canPrev) return; setView(new Date(y, m + k, 1)) }
  const choose = s => { onChange(s); const d = dateOf(s); if (d.getMonth() !== m || d.getFullYear() !== y) setView(new Date(d.getFullYear(), d.getMonth(), 1)) }
  /* This weekend and the next — the first Saturday that can be booked. */
  const sat = new Date(minD); while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1)
  const plus = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  const quick = [['This Sat', sat], ['This Sun', plus(sat, 1)], ['Next Sat', plus(sat, 7)], ['Next Sun', plus(sat, 8)]].map(([k, d]) => [k, iso(d)])
  const away = value ? Math.round((dateOf(value) - dateOf(todayIso)) / 86400000) : null
  return (
    <div className="mt-4" data-solo-calendar>
      <div className="cx-noscroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-solo-quick>
        {quick.map(([k, s]) => (
          <button key={k} type="button" onClick={() => choose(s)} aria-pressed={value === s}
            className={'flex h-[52px] shrink-0 flex-col items-start justify-center rounded-[16px] px-3.5 ' + (value === s ? 'bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,.9)]' : 'bg-[#FAF8FD] text-[#1C1033] shadow-[inset_0_0_0_1px_#ECE6F4]')}>
            <span className={'text-[10px] font-black uppercase tracking-[0.1em] ' + (value === s ? 'text-white/80' : 'text-[#DB2777]')}>{k}</span>
            <span className="text-[13.5px] font-extrabold">{shortDay(s)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} disabled={!canPrev} aria-label="Previous month" className="cx-btn grid h-10 w-10 place-items-center rounded-full disabled:opacity-35"><ChevronLeft size={19} strokeWidth={2.6} /></button>
        <p key={`${y}-${m}`} className="cx-rise text-[17px] font-extrabold tracking-[-0.02em] text-[#1C1033]" data-solo-month>{MONTH[m]} <span className="text-[#8E869E]">{y}</span></p>
        <button type="button" onClick={() => go(1)} aria-label="Next month" className="cx-btn grid h-10 w-10 place-items-center rounded-full"><ChevronRight size={19} strokeWidth={2.6} /></button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center">
        {DOW.map((d, i) => <span key={d} className={'pb-1.5 text-[10.5px] font-black uppercase tracking-[0.08em] ' + (i === 0 || i === 6 ? 'text-[#DB2777]' : 'text-[#A49DB5]')}>{d.slice(0, 2)}</span>)}
      </div>
      <div key={`g${y}-${m}`} className="cx-rise grid grid-cols-7 gap-y-1"
        onTouchStart={e => { touch.current = e.touches[0].clientX }}
        onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX); if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1) }}>
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const s = iso(new Date(y, m, d)), off = s < min, on = s === value, today = s === todayIso, wk = (lead + d - 1) % 7
          return (
            <button key={s} type="button" disabled={off} onClick={() => choose(s)} aria-pressed={on} aria-label={longDay(s)} data-solo-day={s}
              className="grid h-11 place-items-center disabled:cursor-default">
              <span className={'relative grid h-10 w-10 place-items-center rounded-full text-[14.5px] font-extrabold transition-colors ' + (on
                ? 'cx-pop bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_8px_18px_-6px_rgba(79,70,229,.85)]'
                : off ? 'text-[#D6D0E2]' : (wk === 0 || wk === 6 ? 'text-[#DB2777] ' : 'text-[#1C1033] ') + (today ? 'shadow-[inset_0_0_0_1.5px_#C4B5FD]' : ''))}>
                {d}
                {today && !on && <span className="absolute bottom-[3px] h-1 w-1 rounded-full bg-[#7C3AED]" />}
              </span>
            </button>
          )
        })}
      </div>

      <p className={'mt-3 flex items-center justify-center gap-1.5 rounded-[14px] px-3 py-2.5 text-[13px] font-extrabold ' + (value ? 'bg-[#ECFDF3] text-[#0F7A3D]' : 'bg-[#FAF8FD] text-[#8E869E]')} data-solo-picked>
        {value
          ? <><Check size={15} strokeWidth={3} />{fullDay(value)}{away != null && away >= 0 ? ` · ${away === 0 ? 'today' : away === 1 ? 'tomorrow' : `in ${away} days`}` : ''}</>
          : <><CalendarDays size={15} />Tap a day — weekends are in rose</>}
      </p>
    </div>
  )
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dateOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const longDay = s => { const d = dateOf(s); return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}` }
const shortDay = s => { const d = dateOf(s); return `${d.getDate()} ${MON[d.getMonth()]}` }
const fullDay = s => { const d = dateOf(s); return `${DAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}` }
const step5 = g => (g >= 100 ? 10 : g >= 20 ? 5 : 1)
