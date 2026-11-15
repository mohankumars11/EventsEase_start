/**
 * Screen 1 of 5 — the event, one question at a time (Mohan, 2026-11-10).
 *
 *   date → time & length → guests → where → budget (optional)
 *        → the occasion's own questions, one card each
 *        → "a few more details" (the optional ones, together, skippable)
 *        → the event card: everything they said, set like an invitation
 *        → "How should we arrange it?" — a dialog, not a page
 *
 * It was one long form with every field at once. Mohan: "many of the
 * customers might get bored looking at radio options … make them
 * connected instead of scrolling across the entire app". So each card
 * asks one thing, carries the occasion's own logo, answers by tapping an
 * icon tile, and slides on by itself the moment a single tap answers it.
 * The bar of segments under the stage rail says how far along they are.
 *
 * Every choice can be typed instead (ui/choiceTiles `other`): a custom
 * time, exact hours, the name of the place, an answer none of the tiles
 * had. And the place card leads with "Book a venue with us" — the venue
 * partners, browsed and booked first (Mohan, 2026-11-11).
 *
 * Nothing about the facts changed: the same defaults (6 PM, 4 hours, the
 * occasion's usual head count, the place the phone gave at sign-up), the
 * same per-occasion answers pruned as conditions change
 * (lib/occasionPlan), the same plan.setEvent on every change — so the
 * plan screen and the live match read exactly what they read before.
 * Coming back to this screen with a date already set opens on the event
 * card, with an Edit for every line.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Check, ChevronLeft, ChevronRight, Clock3, Home, IndianRupee, Landmark, LocateFixed, MapPin, Minus, MoreHorizontal,
  BadgeCheck, PenLine, Pencil, Plus, Search, Sun, Sunrise, Sunset, Moon, Timer, Trees, Users, UtensilsCrossed, Wallet,
} from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { iso, timeLabel } from '../lib/format'
import { ActionBar, BackHeader } from '../ui/kit'
import { MonthCalendar } from './WhenSheet'
import EventJourney from '../ui/EventJourney'
import OccasionLogo from '../ui/OccasionLogo'
import { IconTiles, answeredTile, isOther } from '../ui/choiceTiles'
import EventCard, { hoursLabel } from '../ui/EventCard'
import { usualTime, peopleAsk } from '../data/occasionProfile'
import { useProgress } from '../lib/progress'
import Glyph3D from '../ui/Glyph3D'
import { HowSheet, useHow } from '../ui/HowChoice'
import { optionIcon } from '../lib/optionIcon'
import { pruneAnswers, questionsFor } from '../lib/occasionPlan'
import { tilesFor, tileUrl, DEFAULT_TILES } from '../../lib/slippyMap'
import { useAuth } from '../../context/AuthContext'
import PlaceSheet from './PlaceSheet'

const toMin = t => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
const toTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const TIMES = Array.from({ length: 36 }, (_, i) => toTime(6 * 60 + i * 30)) // 6:00 AM – 11:30 PM
const TIME_PICKS = ['09:00', '11:00', '13:00', '16:00', '18:00', '19:00', '20:00', '21:00']
const HOUR_PICKS = [2, 3, 4, 6, 12, 24]
const GUEST_PICKS = [10, 25, 50, 100, 200, 500]
/* Where it happens. "Help me find one" is the only answer that puts a venue
   in the plan; the rest say where it is, which is what masters travel to. */
export const VENUES = [['bookvenue', 'Book a venue with us'], ['have', 'I have a venue'], ['need', 'Help me find one'], ['home', 'At my home'], ['restaurant', 'At a restaurant'], ['banquet', 'Banquet hall'], ['outdoor', 'Outdoor'], ['other', 'Other']]
const VENUE_ICON = { bookvenue: Landmark, have: MapPin, need: Search, home: Home, restaurant: UtensilsCrossed, banquet: Landmark, outdoor: Trees, other: MoreHorizontal }
const KIND = { restaurant: 'dining', banquet: 'banquet', outdoor: 'lawn' }
/* Choices that say enough on their own — no name to type, straight on. */
const NO_NAME = new Set(['home', 'need', 'bookvenue'])
/* Every wallet, from a family get-together to a crorepati wedding (Mohan, 2026-11-13). */
export const BUDGETS = [['', 'Not sure yet'], ['lt50k', 'Under ₹50,000'], ['50k-1l', '₹50,000 – ₹1 L'], ['1l-1.5l', '₹1 L – ₹1.5 L'], ['1.5l-3l', '₹1.5 L – ₹3 L'], ['3l-5l', '₹3 L – ₹5 L'], ['5l-10l', '₹5 L – ₹10 L'], ['10l-20l', '₹10 L – ₹20 L'], ['20l-40l', '₹20 L – ₹40 L'], ['40l+', '₹40 L and above']]
const FEEL = { lt50k: 'tight', '50k-1l': 'tight', '1l-1.5l': 'moderate', '1.5l-3l': 'moderate', '3l-5l': 'premium', '5l+': 'premium', '5l-10l': 'premium', '10l-20l': 'premium', '20l-40l': 'premium', '40l+': 'premium' }
const AT_HOME = new Set(['home', 'newhome'])
/* An occasion that says where it happens is not offered a venue (Mohan,
   2026-11-13: "when it is a housewarming ceremony, why do you ask venue
   questions? You should not even show them the venue things"): the place
   question asks for THAT place, in its own words, and the partner-venue
   card never appears. `tiles` are the only other answers that make sense;
   `labels` say them for this kind of place. */
const WHERE_ASK = {
  home: { title: 'Where will it be?', sub: 'Most families host it at home — many book a small hall. Masters come to either.', or: 'or tell us where', tiles: ['home', 'bookvenue', 'have', 'other'], labels: { bookvenue: 'Book a hall with us', have: 'A hall we have' } },
  newhome: { title: 'Where’s the new home?', sub: 'The ceremony happens at the house — pin the address.', or: 'somewhere else?', tiles: ['home', 'have', 'other'], labels: { home: 'At the new home', have: 'A hall nearby' } },
  premises: { title: 'Where’s the office?', sub: 'Masters set up at your premises.', or: 'somewhere else?', tiles: ['have', 'banquet', 'other'], labels: { have: 'Our premises' } },
  school: { title: 'Where’s the school?', sub: 'Masters set up on the school grounds.', or: 'somewhere else?', tiles: ['have', 'outdoor', 'other'], labels: { have: 'At the school' } },
  campus: { title: 'Which campus?', sub: 'Masters set up on campus.', or: 'somewhere else?', tiles: ['have', 'outdoor', 'other'], labels: { have: 'On campus' } },
  site: { title: 'Where’s the site?', sub: 'The ground or site masters travel to.', or: 'what kind of place?', tiles: ['outdoor', 'have', 'other'], labels: { have: 'A booked ground' } },
  route: { title: 'Where does it start?', sub: 'The starting point — masters meet you there.', or: 'what kind of place?', tiles: ['have', 'outdoor', 'other'], labels: { have: 'A fixed start point' } },
  online: { title: 'Where are you hosting from?', sub: 'An online event — anything physical is delivered here.', or: 'somewhere else?', tiles: ['home', 'have', 'other'], labels: { have: 'An office or studio' } },
}
const NONE = '__none' // an option whose value is '' ("Not fixed", "Not sure yet") as a tile id

const timeIcon = t => { const h = Number(t.slice(0, 2)); return h < 12 ? Sunrise : h < 16 ? Sun : h < 19 ? Sunset : Moon }
const step = n => (n >= 1000 ? 100 : n >= 200 ? 25 : n >= 50 ? 10 : 1)
export default function EventFlow() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user, profile } = useAuth()
  const mine = plan.event.occasionId === occasionId
  const ev0 = mine ? plan.event : plan.eventOf(occasionId) ?? {}
  const [f, setF] = useState(() => ({
    date: ev0.date ?? null, time: ev0.time ?? (o ? usualTime(o)[0] : '18:00'), hours: ev0.hours ?? (o ? usualTime(o)[1] : 4), guests: ev0.guests ?? (o && peopleAsk(o).who === 'couple' ? 2 : o?.bands?.[1] ?? 50), company: ev0.company ?? null,
    venueChoice: ev0.venueChoice ?? (o?.where === 'ask' ? null : AT_HOME.has(o?.where) ? 'home' : 'have'),
    venueOther: ev0.venueOther ?? '', budget: ev0.budget ?? '',
  }))
  const [answers, setAnswers] = useState(() => plan.answersOf(occasionId))
  useProgress(o?.id, 0, !!o)
  /* ?edit=q:diet — another screen sending the customer back to ONE question
     (the menu card's "Edit" on the diet it already knows). */
  const [params] = useSearchParams()
  const editKey = params.get('edit')
  const backTo = params.get('back') === '1' // sent here by another screen: Done returns there
  const [at, setAt] = useState(() => editKey || (ev0.date ? 'ready' : 'date'))
  /* Editing ONE detail from the event card (Mohan, 2026-11-13: "when
     clicked on edit it goes to that section, and to come back we have to
     keep pressing Next … navigate directly"): the answer saves itself,
     and Done — or the tap that answers a tile — goes straight back. */
  const [editing, setEditing] = useState(!!editKey)
  const editingRef = useRef(editing)
  editingRef.current = editing
  const [dir, setDir] = useState(1)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [customTime, setCustomTime] = useState(false)
  const [customHours, setCustomHours] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const howState = useHow(occasionId)
  const place = plan.place?.lat ? plan.place : savedWhere()
  const set = patch => setF(x => ({ ...x, ...patch }))
  const first = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0]

  /* Today: nothing earlier than two hours from now, on the half hour. */
  const today = iso(new Date())
  const earliest = useMemo(() => { const n = new Date(); return Math.ceil((n.getHours() * 60 + n.getMinutes() + 120) / 30) * 30 }, [])
  const times = f.date === today ? TIMES.filter(t => toMin(t) >= earliest) : TIMES
  useEffect(() => { if (f.date === today && toMin(f.time) < earliest && times.length) set({ time: times[0] }) }, [f.date]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Saved as it changes — the plan screen and the live match read it. */
  const facts = () => ({
    occasionId, date: f.date, time: f.time, hours: f.hours, guests: f.guests, company: f.company,
    venue: ['need', 'bookvenue'].includes(f.venueChoice) || (!f.venueChoice && o?.where === 'ask') ? 'need' : 'have', venueKind: KIND[f.venueChoice] ?? null,
    venueChoice: f.venueChoice, bookVenue: f.venueChoice === 'bookvenue', venueOther: NO_NAME.has(f.venueChoice) ? '' : f.venueOther.trim(), budget: f.budget,
    answers,
    context: { ...(mine ? plan.event.context ?? {} : {}), ...(f.venueChoice === 'home' ? { venueType: 'home' } : {}), ...(FEEL[f.budget] ? { budget: FEEL[f.budget] } : {}) },
  })
  useEffect(() => { if (o) plan.setEvent(facts()) }, [f, answers]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!o) return
    const kept = pruneAnswers(o, { event: { ...f, venueChoice: f.venueChoice }, answers })
    if (JSON.stringify(kept) !== JSON.stringify(answers)) { setAnswers(kept); return }
    plan.setAnswers(occasionId, kept)
  }, [answers, f.venueChoice, f.guests]) // eslint-disable-line react-hooks/exhaustive-deps

  /* The cards, worked out every render: a question can appear or vanish
     with an answer, so the list is read by key, never by a stored index. */
  const qs = o ? questionsFor(o, { event: f, answers }) : []
  const need = qs.filter(q => !q.optional)
  const extra = qs.filter(q => q.optional)
  /* An optional question lives on the combined 'more' card, but the event
     card can open it on its own (Mohan, 2026-11-13: 'when I click on the
     food preference it goes to the calendar'): it gets its own slide. */
  const lone = at.startsWith('q:') && extra.some(x => `q:${x.k}` === at) ? [at] : []
  const slides = ['date', 'time', 'guests', 'where', 'budget', ...need.map(q => `q:${q.k}`), ...lone, ...(extra.length ? ['more'] : [])]
  const slidesRef = useRef(slides)
  slidesRef.current = slides
  const idx = at === 'ready' ? slides.length : Math.max(0, slides.indexOf(at))
  useEffect(() => { if (at !== 'ready' && !slides.includes(at)) setAt(slides[Math.min(idx, slides.length - 1)]) }, [at, slides.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0) }, [at])

  if (!o) return <Navigate to="/" replace />

  const goTo = (key, d = 1) => { setDir(d); setAt(key) }
  /* Done with the one detail being edited: back to the card, or to the
     screen that sent the customer here. */
  const finish = () => { setEditing(false); editingRef.current = false; if (backTo) { navigate(-1); return } goTo('ready', 1) }
  const next = () => { if (editingRef.current) return finish(); setAt(cur => { setDir(1); const s = slidesRef.current, i = s.indexOf(cur); return i + 1 < s.length ? s[i + 1] : 'ready' }) }
  /* A single tap that answers the card moves on by itself, after a beat
     long enough to see the tile light up. */
  const advance = () => setTimeout(next, 320)
  /* While editing one detail, the arrows still walk the questions. */
  const step1 = d => { const i = slides.indexOf(at); const k = slides[i + d]; if (k) goTo(k, d); else finish() }
  const back = () => {
    if (editing) return step1(-1)
    if (at === 'ready') return goTo(slides[slides.length - 1], -1)
    const i = slides.indexOf(at)
    if (i > 0) goTo(slides[i - 1], -1)
    else navigate(-1)
  }
  const setAnswer = (k, v) => setAnswers(a => ({ ...a, [k]: v }))
  const pickHow = k => {
    plan.setEvent(facts())
    if (!plan.place?.lat && place?.lat) plan.setPlace({ area: place.area, lat: place.lat, lng: place.lng, city: place.city ?? 'Bengaluru', address: place.address ?? '' })
    howState.choose(k, { ev: facts(), place: place ?? null })
    setHowOpen(false)
    navigate(`/o/${o.id}/plan`)
  }

  const first2 = new Date(); first2.setHours(0, 0, 0, 0)
  const last = new Date(first2); last.setDate(last.getDate() + 365)
  const q = at.startsWith('q:') ? qs.find(x => `q:${x.k}` === at) : null

  /* ── Each card: what it asks and what answers it ───────────────── */
  const card = (() => {
    switch (at) {
      case 'date': return {
        kicker: 'The date', title: `When is your ${o.name.toLowerCase()}?`, sub: 'Pick the day — every master is checked for it.', ok: !!f.date,
        body: (
          <div data-field="date">
            <div className="-mx-1"><MonthCalendar value={f.date} first={first2} last={last} onPick={d => { set({ date: d }); advance() }} /></div>
            <DateHook date={f.date} o={o} />
          </div>
        ),
      }
      case 'time': {
        /* A time or a length none of the tiles has: the last tile is a pen
           and opens the exact control (Mohan, 2026-11-11: "add custom"). */
        const custom = customTime || !TIME_PICKS.includes(f.time)
        const customH = customHours || !HOUR_PICKS.includes(f.hours)
        return {
        kicker: 'The time', title: 'What time does it start?', sub: 'And roughly how long it runs.', ok: true,
        body: (
          <div className="space-y-4" data-field="time">
            <IconTiles cols={4} data="time" value={custom ? 'custom' : f.time}
              items={[...TIME_PICKS.filter(t => times.includes(t)).map(t => ({ id: t, label: timeLabel(t), icon: timeIcon(t) })), { id: 'custom', label: custom ? timeLabel(f.time) : 'Custom', icon: PenLine }]}
              onChange={v => { if (v === 'custom') setCustomTime(true); else if (v) { setCustomTime(false); set({ time: v }) } }} compact />
            {custom && (
              <label className="cx-rise flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2.5 text-[12.5px] font-bold text-[var(--ink-2)] shadow-[inset_0_0_0_2px_#7C3AED]" data-time-custom>
                <span className="flex items-center gap-1.5"><Clock3 size={15} className="text-[var(--brand)]" />Any time you like</span>
                <input type="time" value={f.time} step={300} min={f.date === today ? toTime(earliest) : undefined} onChange={e => e.target.value && set({ time: e.target.value })}
                  className="cx-num rounded-[10px] bg-[#F8F5FD] px-2 py-1.5 text-[15px] font-extrabold text-[var(--ink)] outline-none" data-time-input />
              </label>
            )}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-[var(--ink)]"><Timer size={15} className="text-[var(--brand)]" />How long?</p>
              <IconTiles cols={3} data="hours" value={customH ? 'custom' : String(f.hours)}
                items={[...HOUR_PICKS.map(h => ({ id: String(h), label: hoursLabel(h), icon: Timer })), { id: 'custom', label: customH ? hoursLabel(f.hours) : 'Custom', icon: PenLine }]}
                onChange={v => { if (v === 'custom') setCustomHours(true); else if (v) { setCustomHours(false); set({ hours: Number(v) }) } }} compact />
              {customH && (
                <div className="cx-rise mt-2 flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2 shadow-[inset_0_0_0_2px_#7C3AED]" data-hours-custom>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ink-2)]"><Timer size={15} className="text-[var(--brand)]" />Exact hours</span>
                  <span className="flex items-center gap-1.5">
                    <button type="button" onClick={() => set({ hours: Math.max(1, f.hours - 1) })} aria-label="Fewer hours" className="cx-press grid h-9 w-9 place-items-center rounded-full bg-[#F4EEFF] text-[#5B21B6]"><Minus size={16} /></button>
                    <input inputMode="numeric" value={f.hours} onChange={e => set({ hours: Math.min(72, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)) })} aria-label="Hours"
                      className="cx-num w-12 bg-transparent text-center text-[18px] font-black text-[var(--ink)] outline-none" data-hours-input />
                    <button type="button" onClick={() => set({ hours: Math.min(72, f.hours + 1) })} aria-label="More hours" className="cx-solid shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] cx-press grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white"><Plus size={16} /></button>
                  </span>
                </div>
              )}
            </div>
          </div>
        ),
        }
      }
      case 'guests': { const ask = peopleAsk(o); return {
        kicker: ask.kicker, title: ask.title, sub: ask.sub, ok: f.guests > 0 && (!ask.company || !!f.company),
        body: <People ask={ask} guests={f.guests} company={f.company} onChange={set} onNext={advance} />,
      } }
      case 'where': {
        const wa = WHERE_ASK[o.where] ?? null
        const tiles = VENUES.filter(([k]) => (wa ? wa.tiles.includes(k) : k !== 'bookvenue'))
        return {
        kicker: 'The place', title: wa?.title ?? 'Where’s the celebration?', sub: wa?.sub ?? (f.venueChoice === 'bookvenue' ? 'We’ll show venues near this spot.' : 'Masters travel to this spot.'),
        ok: !!f.venueChoice && (f.venueChoice !== 'other' || !!f.venueOther.trim()),
        body: (
          <div className="space-y-3.5" data-field="where" data-where-kind={o.where}>
            {!wa && <BookVenue on={f.venueChoice === 'bookvenue'} onClick={() => { set({ venueChoice: 'bookvenue' }); advance() }} />}
            <MiniMap place={place} onChange={() => setPlaceOpen(true)} />
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]"><span className="h-px flex-1 bg-[#EEE9F7]" />{wa?.or ?? 'or tell us where it is'}<span className="h-px flex-1 bg-[#EEE9F7]" /></p>
            <IconTiles data="venue" value={f.venueChoice === 'bookvenue' ? null : f.venueChoice} cols={2}
              items={tiles.map(([k, l]) => ({ id: k, label: wa?.labels?.[k] ?? l, icon: VENUE_ICON[k] }))}
              onChange={v => { set({ venueChoice: v }); if (v && NO_NAME.has(v)) advance() }} />
            {f.venueChoice && !NO_NAME.has(f.venueChoice) && (
              <label className="cx-rise flex h-12 items-center gap-2 rounded-[14px] bg-white px-3.5 shadow-[inset_0_0_0_2px_#7C3AED]" data-venue-name>
                <PenLine size={15} className="shrink-0 text-[#7C3AED]" />
                <input value={f.venueOther} onChange={e => set({ venueOther: e.target.value.slice(0, 80) })} autoFocus data-venue-other
                  placeholder={f.venueChoice === 'other' ? 'Where is it? e.g. our office terrace' : 'Name of the place (optional)'}
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[var(--ink)] outline-none placeholder:text-[#A79DB9]" />
              </label>
            )}
          </div>
        ),
      } }
      case 'budget': return {
        kicker: 'The budget', title: 'Roughly what’s the budget?', sub: 'Optional — it helps us suggest the right masters.', ok: true, optional: true,
        body: (
          <IconTiles data="budget" cols={2} value={f.budget === '' ? NONE : f.budget}
            items={BUDGETS.map(([k, l]) => ({ id: k || NONE, label: l, icon: k ? (/^(3l|5l|10l|20l|40l)/.test(k) ? Wallet : IndianRupee) : undefined }))}
            onChange={v => { set({ budget: !v || v === NONE ? '' : v }); if (v) advance() }} />
        ),
      }
      case 'more': return {
        kicker: 'Almost done', title: 'A few more details', sub: 'All optional — skip anything you’re unsure of.', ok: true, optional: true,
        body: <div className="space-y-5" data-ask-more>{extra.map(x => <div key={x.k} data-ask={x.k}><p className="mb-2 text-[13.5px] font-black leading-snug text-[var(--ink)]">{x.label}</p><Answer q={x} value={answers[x.k]} onChange={v => setAnswer(x.k, v)} compact /></div>)}</div>,
      }
      default: return q ? {
        kicker: `About your ${o.name.toLowerCase()}`, title: q.label, sub: q.help ?? null, ok: answeredTile(answers[q.k]),
        /* A typed answer never advances by itself — they are still typing. */
        body: <div data-ask={q.k}><Answer q={q} value={answers[q.k]} onChange={v => { setAnswer(q.k, v); if (['one', 'yesno', 'select'].includes(q.type) && v != null && !isOther(v)) advance() }} /></div>,
      } : null
    }
  })()

  return (
    <main className="cx-enter min-h-[100dvh] overflow-x-clip bg-white pb-[calc(env(safe-area-inset-bottom,0px)+104px)]" data-event-details data-slide={at}>
      <BackHeader title={o.name} onBack={back} />
      <EventJourney at={0} occasionId={o.id} />

      {/* How far along: one segment per card, the current one filling. */}
      {editing && at !== 'ready' && (
        <p className="mx-4 mt-3.5 flex items-center gap-2 rounded-[14px] bg-[#F4EEFF] px-3 py-2 text-[12px] font-extrabold text-[#3B1670]" data-editing-one><Pencil size={13} />Changing one detail — Done takes you straight back{backTo ? '' : ' to your card'}</p>
      )}
      {at !== 'ready' && !editing && (
        <div className="mx-4 mt-3.5 flex items-center gap-2.5" data-slide-progress>
          <div className="flex flex-1 gap-1">
            {slides.map((s, i) => (
              <span key={s} className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[#EEE9F7]">
                <span className={'absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] transition-transform duration-500 ' + (i < idx ? 'scale-x-100' : i === idx ? 'scale-x-[.55]' : 'scale-x-0')} />
              </span>
            ))}
          </div>
          <span className="shrink-0 text-[11px] font-black tabular-nums text-[var(--ink-3)]">{idx + 1}/{slides.length}</span>
        </div>
      )}

      {at === 'ready'
        ? <EventCard o={o} f={f} place={place} qs={qs} answers={answers} first={first} venues={VENUES} budgets={BUDGETS} onEdit={k => { setEditing(true); editingRef.current = true; goTo(k, -1) }} />
        : card && (
          <section key={at} className={'mx-4 mt-3.5 ' + (dir > 0 ? 'cx-slide-in' : 'cx-slide-back')}>
            <div className="rounded-[26px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F8,0_26px_50px_-36px_rgba(58,18,144,.7)]">
              <div className="flex items-center gap-3">
                <OccasionLogo occasion={o} size={50} />
                <div className="min-w-0">
                  <p className="truncate text-[10.5px] font-black uppercase tracking-[0.13em] text-[var(--brand)]">{card.kicker}</p>
                  <h2 className="text-[21px] font-black leading-[1.12] tracking-[-0.035em] text-[#1C1033]">{card.title}</h2>
                </div>
              </div>
              {card.sub && <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{card.sub}</p>}
              <div className="mt-4">{card.body}</div>
            </div>
          </section>
        )}

      <ActionBar>
        {at === 'ready' ? (
          <button type="button" onClick={() => setHowOpen(true)} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-create-plan>
            See everything my event needs<ChevronRight size={19} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={back} aria-label="Previous" className="cx-press cx-btn grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[18px]" data-slide-back><ChevronLeft size={22} /></button>
            {editing && <button type="button" onClick={() => step1(1)} aria-label="Next question" className="cx-press cx-btn order-last grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[18px]" data-slide-forward><ChevronRight size={22} /></button>}
            {card?.optional && !editing && <button type="button" onClick={next} className="cx-press h-[56px] shrink-0 rounded-[18px] px-4 text-[14px] font-extrabold text-[var(--ink-2)]" data-slide-skip>Skip</button>}
            <button type="button" disabled={!card?.ok} onClick={next} className="cx-press cx-cta flex h-[56px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[18px] text-[15.5px] font-extrabold" data-slide-next>
              {!card?.ok && at === 'date' ? 'Pick a date to continue' : !card?.ok ? 'Choose one to continue' : editing ? (backTo ? 'Done' : 'Done · my card') : idx === slides.length - 1 ? 'Create my event card' : 'Next'}{card?.ok && (editing ? <Check size={18} strokeWidth={3} /> : <ChevronRight size={18} />)}
            </button>
          </div>
        )}
      </ActionBar>

      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} value={plan.place?.lat ? plan.place : place} onPick={p => { plan.setPlace(p); setPlaceOpen(false) }} />
      <HowSheet open={howOpen} onClose={() => setHowOpen(false)} current={howState.how} onPick={pickHow} />
    </main>
  )
}

/* ── An answer, by the question's type ─────────────────────────────── */
/* Every choice can be typed instead (`other`), except yes/no. */
function Answer({ q, value, onChange, compact = false }) {
  if (q.type === 'one' || q.type === 'select' || q.type === 'yesno') {
    const opts = q.type === 'yesno' ? [['yes', 'Yes'], ['no', 'No']] : q.options
    return (
      <IconTiles data={q.k} compact={compact} value={value === '' ? NONE : value ?? null} other={q.type !== 'yesno' && !q.noOther}
        items={opts.map(([v, l]) => ({ id: v === '' ? NONE : v, label: l }))}
        onChange={v => onChange(v === NONE ? '' : v)} />
    )
  }
  if (q.type === 'many') return <IconTiles data={q.k} multi compact={compact} other value={Array.isArray(value) ? value : []} items={q.options.map(([v, l]) => ({ id: v, label: l }))} onChange={onChange} />
  if (q.type === 'number') {
    const n = value === '' || value == null ? '' : Number(value)
    return (
      <input inputMode="numeric" value={n} placeholder={q.placeholder ?? '0'} data-number={q.k}
        onChange={e => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw === '' ? '' : Math.min(Number(raw), q.max ?? 99999)) }}
        className="cx-num h-14 w-full rounded-[16px] bg-[#F8F5FD] px-4 text-center text-[24px] font-black text-[var(--ink)] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
    )
  }
  return (
    <input value={value ?? ''} placeholder={q.placeholder ?? 'Type here'} maxLength={q.max ?? 120} onChange={e => onChange(e.target.value)} data-text={q.k}
      className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold text-[var(--ink)] shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
  )
}

/* ── Who's coming: the question the occasion deserves ───────────────
   A couple's occasion asks who is celebrating first — just the two of
   them needs no count at all (data/occasionProfile peopleAsk). Everyone
   else gets the count, with picks and words sized to the kind of day. */
function People({ ask, guests, company, onChange, onNext }) {
  if (!ask.company) return <Guests value={guests} onChange={g => onChange({ guests: g })} picks={ask.picks} />
  return (
    <div className="space-y-3.5" data-field="people">
      <IconTiles data="company" cols={2} value={company} items={ask.company.map(c => ({ id: c.id, label: c.label, line: c.line, icon: c.icon }))}
        onChange={id => { const c = ask.company.find(x => x.id === id); if (!c) { onChange({ company: null }); return } onChange({ company: id, guests: id === 'two' ? 2 : guests > 2 ? guests : c.guests }); if (id === 'two') onNext() }} />
      {company && company !== 'two' && (
        <div className="cx-rise" data-company-count>
          <p className="mb-2 text-[13.5px] font-black leading-snug text-[var(--ink)]">{ask.countTitle} <span className="text-[11.5px] font-bold text-[var(--ink-3)]">{ask.countSub}</span></p>
          <Guests value={guests} onChange={g => onChange({ guests: g })} picks={ask.picks} />
        </div>
      )}
    </div>
  )
}

/* ── The count, big, with the fastest ways to change it ─────────────── */
function Guests({ value, onChange, picks = GUEST_PICKS }) {
  const clamp = n => Math.max(1, Math.min(100000, n))
  return (
    <div data-field="guests">
      <div className="flex items-center justify-between gap-3 rounded-[22px] bg-gradient-to-br from-[#F7F2FF] to-[#EFE6FF] p-2.5">
        <button type="button" onClick={() => onChange(clamp(value - step(value)))} aria-label="Fewer guests" className="cx-press grid h-12 w-12 place-items-center rounded-[15px] bg-white text-[#5B21B6] shadow-[0_6px_14px_-10px_rgba(58,18,144,.8)]"><Minus size={20} strokeWidth={2.6} /></button>
        <div className="min-w-0 text-center">
          <input inputMode="numeric" value={value} aria-label="Number of guests" onChange={e => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 1))}
            className="cx-num w-[120px] bg-transparent text-center text-[40px] font-black leading-none tracking-[-0.04em] text-[#2E1065] outline-none" />
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7C5BC7]">guests</p>
        </div>
        <button type="button" onClick={() => onChange(clamp(value + step(value)))} aria-label="More guests" className="cx-solid cx-press grid h-12 w-12 place-items-center rounded-[15px] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_8px_16px_-8px_rgba(91,33,182,.95)]"><Plus size={20} strokeWidth={2.6} /></button>
      </div>
      <input type="range" min="1" max="500" value={Math.min(value, 500)} onChange={e => onChange(Number(e.target.value))} aria-label="Guests slider" className="cx-range mt-4 w-full" />
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {picks.map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={value === n}
            className={'cx-press flex flex-col items-center rounded-[13px] py-2 text-[13px] font-black transition-colors ' + (value === n ? 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white' : 'bg-white text-[#2E1A4F] shadow-[0_0_0_1.2px_#ECE6F6]')}>
            <Users size={13} className={value === n ? 'text-white/80' : 'text-[#9A8DBB]'} />{n >= 10000 ? '10k+' : n >= 1000 ? `${n / 1000}k` : n}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── "Book a venue with us": the venue partners, first ─────────────── */
function BookVenue({ on, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} data-book-venue
      className={'cx-press relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] p-3 text-left text-white shadow-[0_18px_34px_-18px_rgba(76,29,149,.9)] ' + (on ? 'ring-[3px] ring-[#FFD84A]' : '')}
      style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 55%, #A855F7 100%)' }}>
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <Glyph3D id="venue" size={54} lift />
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#FFE071]"><BadgeCheck size={11} />Verified venue partners</span>
        <span className="mt-0.5 block text-[16.5px] font-black leading-tight tracking-[-0.02em]">Book a venue with us</span>
        <span className="block text-[11.5px] font-semibold leading-snug text-white/85">Halls, lawns and rooftops that fit your guests — exact prices, your date locked when you book</span>
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#5B21B6]">{on ? <Check size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={2.8} />}</span>
    </button>
  )
}

/* ── The place, on its real streets ────────────────────────────────── */
/* Why to decide now: weekends and muhurtham days go first. */
function DateHook({ date, o }) {
  const d = date ? new Date(`${date}T00:00:00`) : null
  const weekend = d && [0, 6].includes(d.getDay())
  const days = d ? Math.round((d - new Date(new Date().toDateString())) / 86400000) : null
  const line = !d ? 'Saturdays and Sundays are the first dates masters lose — most are blocked 4–6 weeks ahead.'
    : weekend ? `A weekend date — the most asked-for day. Choose your preferences and block your masters before someone else does.`
      : days != null && days <= 7 ? 'Less than a week away — masters near you accept fastest when the request goes out today.'
        : 'A weekday — more masters free, and the best chance of your first choice.'
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-[16px] bg-gradient-to-r from-[#FFF4E5] to-[#FFF9EF] p-3 shadow-[inset_0_0_0_1px_#FBE2BA]" data-date-hook={weekend ? 'weekend' : d ? 'weekday' : 'none'}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#FFB020] to-[#F07A00] text-white shadow-[0_6px_14px_-8px_rgba(240,122,0,.9)]"><Timer size={17} strokeWidth={2.4} /></span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-black text-[#7A3E00]">{weekend ? '🔥 Weekends book out first' : d ? 'Lock your masters’ date' : 'Book months ahead, lock the date today'}</span>
        <span className="block text-[11.5px] font-semibold leading-snug text-[#8A5A1E]">{line} Nothing is paid until a master accepts.</span>
      </span>
    </div>
  )
}

function MiniMap({ place, onChange }) {
  const centre = place?.lat ? { lat: Number(place.lat), lng: Number(place.lng) } : { lat: 12.9716, lng: 77.5946 }
  const tiles = tilesFor({ centre, zoom: 15, width: 360, height: 96 })
  return (
    <div className="relative h-[96px] overflow-hidden rounded-[18px] bg-[#EEF0F2]" data-field="place">
      <div className="absolute left-1/2 top-0 h-[96px] w-[360px] -translate-x-1/2">
        {tiles.map(t => <img key={t.key} src={tileUrl(DEFAULT_TILES, t)} alt="" className="absolute h-[256px] w-[256px] max-w-none" style={{ left: t.left, top: t.top }} loading="lazy" draggable={false} />)}
      </div>
      <span className="absolute left-1/2 top-[48px] grid h-8 w-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-[#6D28D9] text-white ring-[3px] ring-white"><MapPin size={15} /></span>
      <div className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-2 rounded-[13px] bg-white/95 p-1 pl-2.5 shadow-[0_8px_18px_-10px_rgba(30,8,70,.55)]">
        <LocateFixed size={15} className="shrink-0 text-[#6D28D9]" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-[#2E1A4F]">{place?.area ? `${place.address || place.area}${place.city && !place.address ? `, ${place.city}` : ''}` : 'Choose the location'}</span>
        <button type="button" onClick={onChange} className="cx-press flex shrink-0 items-center gap-1 rounded-full bg-[#F1EAFF] px-2.5 py-1.5 text-[11.5px] font-extrabold text-[#5B21B6]" data-place-change><Pencil size={11} />Change</button>
      </div>
    </div>
  )
}
