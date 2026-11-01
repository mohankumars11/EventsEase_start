/**
 * An occasion on ONE screen (Mohan, 2026-11-01: "keep popping up every
 * input one after another on the one specific screen itself").
 *
 *   When → What time → How long → Guests → Venue (only where it can be anywhere)
 *
 * Each answer folds into a chip at the top and the next question slides
 * in under it; a chip is a tap to change it. After the last answer the
 * plan grows underneath — every service it takes, as tiles, each a tap to
 * drop or add — with the food question and "Anything special?" on the
 * same screen, so there is no second screen of questions and no
 * "setting up your party" pause. One button then matches masters live
 * (LiveMatch.jsx).
 *
 * Words are kept to the minimum: a question is two or three words, an
 * answer is one tap. No price here — the first rupee is a real master's,
 * on the live screen.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Check, ChevronDown, ClipboardList, Clock3, LayoutGrid, KeyRound, MapPin, Minus, Moon, Plus, Radar, Search, Sparkles, Sun, Sunrise, Sunset, Timer, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { occasionArt, serviceArt } from '../data/art'
import { usePlan, needsFor, contextFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { partnersFor } from '../lib/market'
import { dayLabel, iso, timeLabel } from '../lib/format'
import { AboutEvent } from '../ui/aboutEvent'
import { ActionBar, BackHeader, Sheet } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { MonthCalendar } from './WhenSheet'
import { Question } from './Brief'
import { needsFor as tradeQuestions, loadCuisines, loadDishes } from '../lib/needs'
import { needsSummary } from '../ui/needs'
import { supabase } from '../../lib/supabase'
import PlaceSheet from './PlaceSheet'

const spring = { type: 'spring', stiffness: 420, damping: 34 }
const toMin = t => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
const toTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
/* Today, nothing earlier than two hours from now, on the half hour. */
const earliestOn = date => {
  if (date !== iso(new Date())) return 0
  const n = new Date()
  return Math.ceil((n.getHours() * 60 + n.getMinutes() + 120) / 30) * 30
}
const SLOTS = [
  ['10:00', 'Morning', Sunrise, 'from-[#FFF6DD] to-[#FFE6C2]', 'text-[#A35A00]'],
  ['13:00', 'Afternoon', Sun, 'from-[#FFF9E6] to-[#FFEFB8]', 'text-[#9A6B00]'],
  ['18:00', 'Evening', Sunset, 'from-[#FFEDE6] to-[#FFD3DF]', 'text-[#B1365B]'],
  ['20:00', 'Night', Moon, 'from-[#EEE9FF] to-[#DCD2FF]', 'text-[#4C2BB0]'],
]
const HOURS = [[2, '2 hrs'], [3, '3 hrs'], [4, '4 hrs'], [6, '6 hrs'], [10, 'Full day'], [null, 'Not sure']]
const DIETS = [['veg', 'Veg'], ['non_veg', 'Non-veg'], ['mixed', 'Both']]
const NEXT = { date: 'Date', time: 'Time', hours: 'Hours', guests: 'Guests', venue: 'Venue' }
/* Only the fields "Anything special?" owns are kept in event.context. */
const ABOUT_KEYS = ['venueProvides', 'setting', 'formats', 'food', 'drinks', 'media', 'travel', 'public', 'children', 'accessibility', 'privacy', 'budget']
const onlyAbout = c => Object.fromEntries(Object.entries(c).filter(([k, v]) => ABOUT_KEYS.includes(k) && v != null && !(Array.isArray(v) && !v.length)))

export default function EventFlow() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const mine = plan.event.occasionId === occasionId
  const ev0 = mine ? plan.event : {}
  const steps = ['date', 'time', 'hours', 'guests', ...(o?.where === 'ask' ? ['venue'] : [])]
  const [a, setA] = useState(() => ({ date: ev0.date ?? null, time: ev0.time ?? null, hours: ev0.hours ?? null, guests: ev0.guests ?? null, venue: o?.where === 'ask' ? (ev0.date ? ev0.venue ?? null : null) : 'need' }))
  const [done, setDone] = useState(() => new Set(ev0.date && ev0.time ? steps : ev0.date ? ['date'] : []))
  /* Old links ask for one step (?step=when|guests|venue|about): open it. */
  const [params] = useSearchParams()
  const asked = { when: 'date', guests: 'guests', venue: 'venue' }[params.get('step')] ?? null
  const [edit, setEdit] = useState(() => (asked && steps.includes(asked) && ev0.date ? asked : null))
  const [sheet, setSheet] = useState(null) // 'place' | { edit: tradeId } | { remove: tradeId }
  /* Cuisine and dish names load from the catalogue once; catering's
     questions wait for them. */
  const [, setFood] = useState(0)
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase)]).then(() => setFood(n => n + 1)).catch(() => {}) }, [])
  const [more, setMore] = useState(params.get('step') === 'about')
  const [about, setAbout] = useState(ev0.context ?? {})
  const [how, setHow] = useState(params.get('how') === 'planner' ? 'planner' : 'each')
  const stepRef = useRef(null)
  const planRef = useRef(null)
  const current = edit ?? steps.find(s => !done.has(s)) ?? null
  const complete = steps.every(s => done.has(s))
  const place = plan.place?.lat ? plan.place : savedWhere()
  const picks = o ? plan.picks[o.id] ?? {} : {}
  const ev = { ...plan.event, ...a, occasionId, venue: a.venue ?? 'need', context: about }
  const evKey = JSON.stringify([a, about])
  const p360 = useMemo(() => (o && complete ? needsFor(o, picks, ev) : null), [o, complete, picks, evKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = complete && !edit ? planRef.current : stepRef.current
    if (!el) return
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: complete && !edit ? 'start' : 'center' }), 140)
    return () => clearTimeout(t)
  }, [current, complete]) // eslint-disable-line react-hooks/exhaustive-deps

  /* How many masters are live near the event for this plan — counted from
     the same lists the live match reads, which also warms them up. A list
     is capped at 40, so a full one reads "40+". */
  /* The live screen's code loads while the customer is still here, so
     "Find my masters" opens at once — no chunk fetch on the tap. */
  useEffect(() => { if (complete) import('./LiveMatch').catch(() => {}) }, [complete])
  const tradesKey = (p360?.needed ?? []).join(',')
  const [nearby, setNearby] = useState(null)
  useEffect(() => {
    if (!tradesKey) return
    let live = true
    const at = place?.lat ? { lat: place.lat, lng: place.lng } : {}
    Promise.all(tradesKey.split(',').map(t => partnersFor(t, at).then(l => l.length).catch(() => 0)))
      .then(ns => { if (live) setNearby({ n: ns.reduce((s, x) => s + x, 0), more: ns.some(x => x >= 40) }) })
    return () => { live = false }
  }, [tradesKey, place?.lat, place?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />

  const answer = (step, patch) => {
    const next = { ...a, ...patch }
    const d = new Set([...done, step])
    /* A new day can make the chosen start time impossible (today, too soon). */
    if (step === 'date' && next.time && toMin(next.time) < earliestOn(next.date)) { next.time = null; d.delete('time') }
    setA(next); setDone(d); setEdit(null)
    plan.setEvent({ occasionId: o.id, ...(mine ? {} : { venueKind: null, context: {} }), date: next.date, time: next.time, hours: next.hours, guests: next.guests, venue: next.venue ?? 'need' })
  }
  const pick = (t, v) => plan.setPick(o.id, t, v)
  const food = plan.needsOf(o.id, 'catering_food')
  const diet = food.$diet?.[0] ?? null
  const setDiet = d => plan.setNeeds(`${o.id}:catering_food`, { ...food, $diet: d ? [d] : [] })
  const needed = p360?.needed ?? []
  const addable = (p360?.rows ?? []).filter(r => (r.status === 'OPTIONAL' && r.state === 'off') || r.state === 'skip').slice(0, 10)
  const go = () => {
    plan.setEvent({ occasionId: o.id, ...a, venue: a.venue ?? 'need', context: about })
    if (!plan.place?.lat && place?.lat) plan.setPlace({ area: place.area, lat: place.lat, lng: place.lng, city: place.city ?? 'Bengaluru', address: place.address ?? '' })
    navigate(`/o/${o.id}/live${how === 'planner' ? '?planner=1' : ''}`)
  }
  const chip = {
    date: [CalendarDays, a.date && dayLabel(a.date)],
    time: [Clock3, a.time && timeLabel(a.time)],
    hours: [Timer, a.hours ? (a.hours >= 10 ? 'Full day' : `${a.hours} hrs`) : 'Hours not sure'],
    guests: [Users, a.guests ? `${a.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : 'Guests not sure'],
    venue: [a.venue === 'have' ? KeyRound : Search, a.venue === 'have' ? 'Own venue' : 'Need a venue'],
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+130px)]" data-event-flow>
      <BackHeader title={o.name} sub={complete ? `${needed.length} services · tap to change` : `${done.size} of ${steps.length}`}
        right={<ArtFill art={occasionArt(o)} tone={o.tone} className="h-11 w-11 shrink-0 rounded-[14px]" inset="10%" />} />
      <div className="mx-4 h-[5px] overflow-hidden rounded-full bg-[#F1EDF7]">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#C026D3]" initial={false} animate={{ width: `${(done.size / steps.length) * 100}%` }} transition={spring} />
      </div>

      {/* What is answered, as chips — each a tap to change */}
      {done.size > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4" data-answers>
          <AnimatePresence initial={false}>
            {steps.filter(s => done.has(s) && s !== current).map(s => {
              const [Icon, text] = chip[s]
              return (
                <motion.button key={s} layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring}
                  type="button" onClick={() => setEdit(s)} className="flex items-center gap-1.5 rounded-full bg-[#F4EEFF] py-2 pl-2.5 pr-3.5 text-[13px] font-extrabold text-[#3B1670]" data-answer={s}>
                  <Icon size={15} className="text-[var(--brand)]" />{text}
                </motion.button>
              )
            })}
            {complete && (
              <motion.button key="place" layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
                type="button" onClick={() => setSheet('place')} className="flex items-center gap-1.5 rounded-full bg-[#EAF8EF] py-2 pl-2.5 pr-3.5 text-[13px] font-extrabold text-[#0B5B30]" data-answer="place">
                <MapPin size={15} className="text-[#0C831F]" />{place?.area ?? 'Add location'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* The one question being asked */}
      <AnimatePresence mode="wait" initial={false}>
        {current && (
          <motion.section key={current} ref={stepRef} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={spring}
            className="px-4 pt-6" data-step={current}>
            {current === 'date' && <DateStep value={a.date} onPick={d => answer('date', { date: d })} />}
            {current === 'time' && <TimeStep date={a.date} value={a.time} onPick={t => answer('time', { time: t })} />}
            {current === 'hours' && (
              <>
                <Q>How long?</Q>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {HOURS.map(([h, label]) => (
                    <Pill key={label} on={done.has('hours') && a.hours === h} onClick={() => answer('hours', { hours: h })} data-hours={h ?? 'unsure'}>{label}</Pill>
                  ))}
                </div>
              </>
            )}
            {current === 'guests' && <GuestsStep occasion={o} value={a.guests} onPick={g => answer('guests', { guests: g })} />}
            {current === 'venue' && (
              <>
                <Q>Venue?</Q>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <BigChoice icon={KeyRound} on={a.venue === 'have'} onClick={() => answer('venue', { venue: 'have' })} tone="from-[#EAF8EF] to-[#D5F2E0]" ink="text-[#0B5B30]">I have one</BigChoice>
                  <BigChoice icon={Search} on={a.venue === 'need'} onClick={() => answer('venue', { venue: 'need' })} tone="from-[#F3ECFF] to-[#E6DAFF]" ink="text-[#4C1D95]">Find me one</BigChoice>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* What is still to come — a few taps, then the masters */}
      {!complete && !edit && (
        <div className="px-4 pt-8" data-up-next>
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Up next</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {steps.filter(s => !done.has(s) && s !== current).map(s => {
              const Icon = chip[s][0]
              return <span key={s} className="flex items-center gap-1.5 rounded-full border border-dashed border-[#DDD3EE] px-3 py-2 text-[13px] font-bold text-[#A49BB6]"><Icon size={15} />{NEXT[s]}</span>
            })}
            <span className="flex items-center gap-1.5 rounded-full border border-dashed border-[#CDEFDC] px-3 py-2 text-[13px] font-bold text-[#3C7A5A]"><Radar size={15} />Your masters, live</span>
          </div>
        </div>
      )}

      {/* The plan, grown under the answers */}
      {complete && !edit && p360 && (
        <motion.section ref={planRef} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }} className="scroll-mt-24 px-4 pt-7" data-plan>
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-[23px] font-black tracking-[-0.035em]">Your plan</h2>
            {nearby?.n > 0
              ? <span className="flex items-center gap-1.5 rounded-full bg-[#EAF8EF] px-2.5 py-1 text-[12px] font-extrabold text-[#0B6B3D]" data-nearby><span className="cx-live-dot h-2 w-2 rounded-full bg-[#16A34A]" />{nearby.n}{nearby.more ? '+' : ''} masters nearby</span>
              : <span className="rounded-full bg-[#F4EEFF] px-2.5 py-1 text-[12px] font-extrabold text-[#3B1670]">{needed.length} services</span>}
          </div>
          {/* Two ways to book (2026-11-01): each service matched live, or the
              whole plan handed to one planner — for the host too busy to book. */}
          <div className="mt-3 grid grid-cols-2 gap-2.5" data-how>
            {[['each', LayoutGrid, 'Each service', 'Matched live'], ['planner', ClipboardList, 'One planner', 'Runs it all']].map(([k, Icon, title, sub]) => (
              <motion.button key={k} type="button" whileTap={{ scale: 0.96 }} onClick={() => setHow(k)} aria-pressed={how === k} data-how-pick={k}
                className={'flex items-center gap-2.5 rounded-[20px] p-3 text-left transition-colors ' + (how === k ? 'bg-[#1C1033] text-white' : 'bg-white shadow-[0_0_0_1.5px_#ECE6F4]')}>
                <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-full ' + (how === k ? 'bg-white/15' : 'bg-[#F4EEFF] text-[var(--brand)]')}><Icon size={19} /></span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-black tracking-[-0.02em]">{title}</span>
                  <span className={'block text-[11.5px] font-bold ' + (how === k ? 'text-white/70' : 'text-[var(--ink-3)]')}>{sub}</span>
                </span>
              </motion.button>
            ))}
          </div>
          {how === 'planner' && <p className="mt-3 text-[13px] font-extrabold text-[#3B1670]" data-planner-note>Your planner arranges all of these:</p>}
          <div className="mt-3 grid grid-cols-3 gap-2.5" data-plan-grid>
            {needed.map((t, i) => <Tile key={t} t={t} on i={i} said={needsSummary(t, plan.needsOf(o.id, t))} onClick={() => setSheet({ edit: t })} />)}
          </div>

          {needed.includes('catering_food') && (
            <div className="mt-6" data-diet>
              <p className="text-[16px] font-black tracking-[-0.02em]">Food</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                {DIETS.map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setDiet(diet === k ? null : k)} aria-pressed={diet === k} data-diet-pick={k}
                    className={'cx-press flex h-14 items-center justify-center gap-2 rounded-[18px] text-[14.5px] font-extrabold transition ' + (diet === k ? 'bg-[#1C1033] text-white' : 'bg-white shadow-[0_0_0_1.5px_#ECE6F4]')}>
                    {k === 'mixed' ? <span className="flex gap-0.5"><DietMark kind="veg" /><DietMark kind="non_veg" /></span> : <DietMark kind={k} />}{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {addable.length > 0 && (
            <div className="mt-6" data-addons>
              <p className="flex items-center gap-1.5 text-[16px] font-black tracking-[-0.02em]"><Plus size={17} className="text-[var(--brand)]" />Add more</p>
              <div className="cx-noscroll -mx-4 mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-1">
                {addable.map(r => <div key={r.tradeId} className="w-[96px] shrink-0"><Tile t={r.tradeId} on={false} onClick={() => pick(r.tradeId, 'need')} /></div>)}
              </div>
            </div>
          )}

          <button type="button" onClick={() => setMore(m => !m)} aria-expanded={more} className="cx-press mt-6 flex w-full items-center gap-3 rounded-[20px] bg-[#FAF8FD] px-4 py-3.5 text-left shadow-[inset_0_0_0_1px_#EEE9F5]" data-special>
            <Sparkles size={18} className="shrink-0 text-[var(--gold)]" />
            <span className="flex-1 text-[14.5px] font-extrabold">Anything special?</span>
            <span className="text-[12px] font-bold text-[var(--ink-3)]">Optional</span>
            <ChevronDown size={18} className={'shrink-0 text-[var(--ink-3)] transition ' + (more ? 'rotate-180' : '')} />
          </button>
          {more && (
            <div className="cx-enter mt-3">
              <AboutEvent occasion={o} ctx={contextFor(o, {}, { ...ev, context: about })} onChange={c => setAbout(onlyAbout(c))} />
            </div>
          )}
        </motion.section>
      )}

      {complete && !edit && (
        <ActionBar>
          <button type="button" disabled={!needed.length} onClick={go} className="cx-press cx-cta relative flex h-[58px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[20px] text-[16px] font-extrabold" data-find-live>
            <span className="cx-live-dot h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />{how === 'planner' ? 'Find my planner live' : 'Find my masters live'}<Radar size={19} />
          </button>
        </ActionBar>
      )}

      <PlaceSheet open={sheet === 'place'} onClose={() => setSheet(null)} value={plan.place} onPick={p => { plan.setPlace(p); setSheet(null) }} />
      {/* A service's own choices — cuisine, photo style, décor theme… — one
          tap away on its tile, never a screen of questions (2026-11-01).
          Optional; what is picked narrows the live match. */}
      <Sheet open={!!sheet?.edit} onClose={() => setSheet(null)} title={sheet?.edit ? TRADE[sheet.edit].label : ''}
        footer={sheet?.edit ? (
          <div className="grid gap-1.5">
            <button type="button" onClick={() => setSheet(null)} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold" data-edit-done>Done</button>
            <button type="button" onClick={() => setSheet({ remove: sheet.edit })} className="h-10 w-full text-[13px] font-bold text-[#B42318]" data-edit-remove>Remove from plan</button>
          </div>
        ) : null}>
        {sheet?.edit && (
          <div className="space-y-3 pb-2" data-edit={sheet.edit}>
            {tradeQuestions(sheet.edit).filter(q => q.group === 'choose' && q.kind !== 'dishes' && q.key !== '$diet' && q.key !== '$years').slice(0, 2).map(q => {
              const cur = plan.needsOf(o.id, sheet.edit)
              const set = (k, v) => plan.setNeeds(`${o.id}:${sheet.edit}`, { ...plan.needsOf(o.id, sheet.edit), [k]: v })
              return <Question key={q.key} q={q} value={cur[q.key] ?? []} onChange={v => set(q.key, v)} occasion={o}
                typed={cur[q.key + '__typed'] ?? []} onTyped={v => set(q.key + '__typed', v)} />
            })}
            {!tradeQuestions(sheet.edit).some(q => q.group === 'choose' && q.kind !== 'dishes' && q.key !== '$diet' && q.key !== '$years') && (
              <p className="text-[13.5px] font-semibold text-[var(--ink-2)]">{o.why?.[sheet.edit] ?? TRADE[sheet.edit].why}. Nothing to choose — we match the best one.</p>
            )}
          </div>
        )}
      </Sheet>
      <Sheet open={!!sheet?.remove} onClose={() => setSheet(null)} title={sheet?.remove ? `Remove ${TRADE[sheet.remove].label}?` : ''}
        footer={sheet?.remove ? (
          <div className="grid gap-2">
            <button type="button" onClick={() => setSheet(null)} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold" data-keep>Keep it</button>
            <button type="button" onClick={() => { pick(sheet.remove, 'have'); setSheet(null) }} className="h-11 w-full rounded-[16px] bg-[#F4F1F8] text-[13.5px] font-extrabold text-[var(--ink-2)]">I already have it</button>
            <button type="button" onClick={() => { pick(sheet.remove, 'skip'); setSheet(null) }} className="h-10 w-full text-[13px] font-bold text-[#B42318]" data-remove-anyway>Remove</button>
          </div>
        ) : null}>
        {sheet?.remove && (
          <div className="flex items-center gap-3 pb-2">
            <ArtFill art={serviceArt(sheet.remove)} tone="#F6F1FF" className="h-14 w-14 shrink-0 rounded-[14px]" inset="10%" />
            <p className="text-[14px] font-semibold leading-snug text-[var(--ink-2)]">{o.why?.[sheet.remove] ?? TRADE[sheet.remove].why}.</p>
          </div>
        )}
      </Sheet>
    </main>
  )
}

function Q({ children }) {
  return <h2 className="text-[28px] font-black leading-[1.05] tracking-[-0.04em]">{children}</h2>
}

function Pill({ on, onClick, children, ...rest }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClick} aria-pressed={!!on} {...rest}
      className={'flex h-[58px] items-center justify-center rounded-[18px] text-[15px] font-extrabold transition-colors ' + (on ? 'bg-[var(--brand)] text-white shadow-[0_12px_22px_-14px_rgba(106,43,217,.95)]' : 'bg-white shadow-[0_0_0_1.5px_#ECE6F4]')}>
      {children}
    </motion.button>
  )
}

function BigChoice({ icon: Icon, on, onClick, tone, ink, children }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick} aria-pressed={on}
      className={'flex h-[128px] flex-col items-center justify-center gap-2.5 rounded-[26px] bg-gradient-to-br ' + tone + ' ' + (on ? 'ring-[2.5px] ring-[var(--brand)]' : '')}>
      <span className={'grid h-14 w-14 place-items-center rounded-full bg-white shadow-[0_10px_20px_-12px_rgba(40,10,90,.5)] ' + ink}><Icon size={26} /></span>
      <span className={'text-[16px] font-black tracking-[-0.02em] ' + ink}>{children}</span>
    </motion.button>
  )
}

/* The month calendar the app already had (WhenSheet), whole and inline —
   Mohan, 2026-11-01: "the same calendar, display the entire calendar".
   A tap answers; the date chip above is the way back to change it. */
function DateStep({ value, onPick }) {
  const [first, last] = useMemo(() => {
    const a = new Date(); a.setHours(0, 0, 0, 0)
    const b = new Date(a); b.setDate(b.getDate() + 119)
    return [a, b]
  }, [])
  return (
    <>
      <Q>When?</Q>
      <MonthCalendar value={value} onPick={onPick} first={first} last={last} />
    </>
  )
}

function TimeStep({ date, value, onPick }) {
  const min = earliestOn(date)
  const [m, setM] = useState(() => Math.max(min, toMin(value) ?? 19 * 60))
  return (
    <>
      <Q>What time?</Q>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {SLOTS.map(([t, label, Icon, tone, ink]) => {
          const off = toMin(t) < min
          return (
            <motion.button key={t} type="button" whileTap={{ scale: 0.95 }} disabled={off} onClick={() => onPick(t)} aria-pressed={value === t} data-slot={t}
              className={'relative flex h-[92px] flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-br p-3.5 text-left disabled:opacity-35 ' + tone + ' ' + (value === t ? 'ring-[2.5px] ring-[var(--brand)]' : '')}>
              <Icon size={26} className={ink} />
              <span>
                <span className={'block text-[15.5px] font-black tracking-[-0.02em] ' + ink}>{label}</span>
                <span className="block text-[12.5px] font-bold text-[#5B4A6E]">{timeLabel(t)}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[20px] bg-[#FAF8FD] p-2 shadow-[inset_0_0_0_1px_#EEE9F5]" data-other-time>
        <button type="button" onClick={() => setM(x => Math.max(min, x - 30))} aria-label="30 minutes earlier" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_0_0_1px_#ECE6F4]"><Minus size={18} /></button>
        <span className="cx-num flex-1 text-center text-[19px] font-black tracking-[-0.02em]">{timeLabel(toTime(m))}</span>
        <button type="button" onClick={() => setM(x => Math.min(1410, x + 30))} aria-label="30 minutes later" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_0_0_1px_#ECE6F4]"><Plus size={18} /></button>
        <button type="button" onClick={() => onPick(toTime(m))} className="cx-press h-11 rounded-full bg-[#1C1033] px-5 text-[14px] font-extrabold text-white" data-time-ok>OK</button>
      </div>
    </>
  )
}

function GuestsStep({ occasion, value, onPick }) {
  const [n, setN] = useState(value ?? occasion.bands[1])
  const step = n >= 1000 ? 100 : n >= 200 ? 25 : n >= 50 ? 10 : 1
  const set = x => setN(Math.max(1, Math.min(100000, x)))
  return (
    <>
      <Q>How many {occasion.people.toLowerCase()}?</Q>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {occasion.bands.map(b => <Pill key={b} on={value === b} onClick={() => onPick(b)} data-band={b}><span className="cx-num">{b.toLocaleString('en-IN')}</span></Pill>)}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[20px] bg-[#FAF8FD] p-2 shadow-[inset_0_0_0_1px_#EEE9F5]">
        <button type="button" onClick={() => set(n - step)} aria-label="Fewer" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_0_0_1px_#ECE6F4]"><Minus size={18} /></button>
        <input inputMode="numeric" value={n} onChange={e => set(Number(e.target.value.replace(/\D/g, '')) || 1)} aria-label="Number of guests"
          className="cx-num min-w-0 flex-1 bg-transparent text-center text-[22px] font-black tracking-[-0.03em] outline-none" />
        <button type="button" onClick={() => set(n + step)} aria-label="More" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_0_0_1px_#ECE6F4]"><Plus size={18} /></button>
        <button type="button" onClick={() => onPick(n)} className="cx-press h-11 rounded-full bg-[#1C1033] px-5 text-[14px] font-extrabold text-white" data-guests-ok>OK</button>
      </div>
      <button type="button" onClick={() => onPick(null)} className="mt-3 text-[13px] font-extrabold text-[var(--ink-3)] underline decoration-dotted underline-offset-4" data-guests-unsure>Not sure yet</button>
    </>
  )
}

function Tile({ t, on, i = 0, said = null, onClick }) {
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(i, 9) * 0.035 }} whileTap={{ scale: 0.95 }}
      onClick={onClick} aria-pressed={on} data-tile={t}
      className={'relative flex w-full flex-col items-center rounded-[22px] p-1.5 pb-2.5 text-center ' + (on ? 'bg-white shadow-[0_0_0_1.5px_#E2D5FA,0_16px_28px_-22px_rgba(91,33,168,.9)]' : 'bg-[#FAF8FD] shadow-[inset_0_0_0_1px_#EEE9F5]')}>
      <ArtFill art={serviceArt(t)} tone={on ? '#F6F1FF' : '#F3F0F8'} className={'aspect-square w-full rounded-[17px] ' + (on ? '' : 'opacity-75')} inset="12%" />
      <span className="mt-1.5 line-clamp-2 min-h-[30px] px-0.5 text-[12px] font-extrabold leading-[1.2] tracking-[-0.01em]">{TRADE[t].label}</span>
      {on && <span className={'mt-0.5 line-clamp-1 px-1 text-[10.5px] font-bold ' + (said ? 'text-[#0B6B3D]' : 'text-[var(--brand)]')}>{said ?? 'Tap to choose'}</span>}
      <span className={'absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full ' + (on ? 'bg-[#0C831F] text-white shadow-[0_4px_10px_-4px_rgba(12,131,31,.9)]' : 'bg-white text-[var(--brand)] shadow-[0_0_0_1px_#E2D5FA]')}>
        {on ? <Check size={13} strokeWidth={3.4} /> : <Plus size={14} strokeWidth={3} />}
      </span>
    </motion.button>
  )
}

/* The marks every Indian food packet carries: a dot for veg, a triangle for non-veg. */
function DietMark({ kind }) {
  const c = kind === 'veg' ? '#0C831F' : '#A0381B'
  return (
    <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[3px] border-2 bg-white" style={{ borderColor: c }}>
      {kind === 'veg' ? <span className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
        : <span className="h-[7px] w-[8px]" style={{ background: c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />}
    </span>
  )
}
