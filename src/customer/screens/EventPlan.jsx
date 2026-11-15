/**
 * Screen 2 of 5 — Your Plan (Mohan, 2026-11-10, to his reference screen).
 *
 *   hero          the occasion's own picture under string lights, its
 *                 name, and the plan's three hooks ("Meet · Share · Capture")
 *   summary bar   date & time · guests · place · edit
 *   Your Plan     every service the occasion needs, as 3D tiles: a green
 *                 tick when it is in, a + when it is not — one tap each
 *   Free toolkit  invitations, RSVP, chat… a rail, ₹0
 *   Add-ons       "make your event even more special", quick-commerce
 *                 style: an ADD button that becomes ADDED
 *   Journey       five stages, the occasion's own mark on the big day
 *   Schedule      D-7 … the day … after, dated from the event, each line
 *                 drawn from the blueprint's timeline and what is in the plan
 *   footer        the estimate, and the way on: Preferences
 *
 * Preferences are no longer opened by tapping a service here — "not
 * clicking on the photography to customise it" — they are the next step
 * (screens/Preferences.jsx), one service after another. And "how should
 * we arrange it" is asked as a dialog after the event card, not as a
 * gate at the top of this screen; if somebody arrives here without having
 * answered it, the same dialog opens over the plan.
 *
 * The estimate is read from live masters near the event and is labelled
 * an estimate wherever it appears — nothing is charged until a master
 * accepts and the customer pays. lib/occasionPlan.js decides what is on
 * the plan; this file only draws it.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  BarChart3, CalendarClock, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDot, Coins, Gift, ListChecks, Lock, MailOpen, MapPin,
  MessagesSquare, PenLine, Pencil, Play, Plus, Route, BadgeCheck, Share2, Users, Wallet, X,
} from 'lucide-react'
import { CATEGORIES, OCCASION } from '../data/occasions'
import { categoryArt, hdArtFor, occasionArt, serviceArt } from '../data/art'
import { copyFor } from '../data/requirementCopy'
import { TRADE } from '../data/trades'
import { myInvitations } from '../lib/rsvp'
import { shareOut } from '../lib/share'
import { warmCatalogue } from '../lib/menuStudio'
import { useProgress } from '../lib/progress'
import { TAG, byOrder, OPS } from '../data/visualCatalogue'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { partnersFor } from '../lib/market'
import { loadCuisines, loadDishes, loadExperienceTiers } from '../lib/needs'
import { timeLabel } from '../lib/format'
import { supabase } from '../../lib/supabase'
import EventJourney from '../ui/EventJourney'
import EventTimeline from '../ui/EventTimeline'
import { ArrangedStrip, EstimatedSummary, ToolkitDetail } from '../ui/celebration'
import { planEstimate } from '../lib/planBudget'
import { BackHeader, Sheet } from '../ui/kit'
import { Thumb } from '../ui/prefs'
import { HowSheet, useHow } from '../ui/HowChoice'
import { saveAnswers } from '../lib/celebration'
import { useAuth } from '../../context/AuthContext'
import Glyph3D from '../ui/Glyph3D'
import OccasionLogo from '../ui/OccasionLogo'
import { optionIcon } from '../lib/optionIcon'

const rupees = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')
const atDay = (isoDate, offset) => { const [y, m, d] = isoDate.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + offset); return x }
const shortDay = d => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

export default function EventPlan() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  useProgress(o?.id, 1, !!o)
  const plan = usePlan()
  const { user } = useAuth()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const picks = o ? plan.picks[o.id] ?? {} : {}
  const p = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev])
  const { how, choose } = useHow(occasionId)
  const [howOpen, setHowOpen] = useState(() => !how)
  const [sheet, setSheet] = useState(null) // 'add' | 'estimate'
  const [feature, setFeature] = useState(null)
  const [other, setOther] = useState('')
  const place = plan.place?.lat ? plan.place : savedWhere()
  /* The preferences step needs these; they load while the plan is read. */
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase), loadExperienceTiers(supabase)]).catch(() => {}) }, [])
  useEffect(() => { import('./Preferences').catch(() => {}); import('./LiveMatch').catch(() => {}); warmCatalogue() }, [])

  /* Masters live near the event for what is selected (lists capped at 40). */
  const tradesKey = (p?.needed ?? []).join(',')
  const [nearby, setNearby] = useState(null)
  useEffect(() => {
    if (!tradesKey) return
    let live = true
    const at = place?.lat ? { lat: place.lat, lng: place.lng } : {}
    Promise.all(tradesKey.split(',').map(t => partnersFor(t, at).then(l => l.length).catch(() => 0)))
      .then(ns => { if (live) setNearby({ n: ns.reduce((s, x) => s + x, 0), more: ns.some(x => x >= 40) }) })
    return () => { live = false }
  }, [tradesKey, place?.lat, place?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const cat1 = p?.occasionPlan ?? null
  const [budget, setBudget] = useState({ loading: true, low: null, high: null, priced: 0, open: 0 })
  useEffect(() => {
    if (!tradesKey) { setBudget({ loading: false, low: null, high: null, priced: 0, open: 0 }); return }
    let live = true
    setBudget(b => ({ ...b, loading: true }))
    planEstimate(tradesKey.split(','), { guests: ev.guests, hours: ev.hours }, place?.lat ? { lat: place.lat, lng: place.lng } : {})
      .then(r => { if (live) setBudget({ ...r, loading: false }) })
      .catch(() => { if (live) setBudget({ loading: false, low: null, high: null, priced: 0, open: 0 }) })
    return () => { live = false }
  }, [tradesKey, ev.guests, ev.hours, place?.lat, place?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  /* The answers belong to the event, not the phone (211; degrades quietly). */
  const answersKey = cat1 ? JSON.stringify(cat1.answers) : ''
  useEffect(() => {
    if (!cat1 || !user?.id || !answersKey || answersKey === '{}') return
    saveAnswers({ userId: user.id, occasionId: o.id, answers: cat1.answers, version: cat1.version, category: cat1.categoryId, context: { ...ev, place: place ?? null } }).catch(() => {})
  }, [answersKey, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />

  const row = t => p.rows.find(r => r.tradeId === t)
  const on = t => row(t)?.state === 'need'
  const pick = (t, v) => plan.setPick(o.id, t, v)

  /* The plan's services and its add-ons, in one shape whether or not the
     occasion has a blueprint (every one of the 438 does today). */
  const services = cat1
    ? cat1.recommended.map(r => ({ ...r, toggle: next => { if (r.addonId && !next) pick(`+${r.addonId}`, 'off'); pick(r.tradeId, next ? 'need' : 'skip') } }))
    : [...p.essential, ...p.needed.filter(t => !p.essential.includes(t))].filter(t => t !== 'videography').sort(byOrder)
      .map(t => ({ id: t, tradeId: t, name: copyFor(o, t).title, hook: TAG[t] ?? '', kind: row(t)?.kind === 'ESSENTIAL' ? 'essential' : 'recommended', on: on(t), toggle: next => pick(t, next ? 'need' : 'skip') }))
  const addons = cat1
    ? cat1.addons.map(a => ({ ...a, toggle: next => pick(`+${a.id}`, next ? 'need' : 'off') }))
    : p.enhance.filter(t => !services.some(s => s.tradeId === t) && !OPS.has(t)).sort(byOrder)
      .map(t => ({ id: t, tradeId: t, name: copyFor(o, t).title, hook: TAG[t] ?? 'Extra', line: copyFor(o, t).line, on: on(t), toggle: next => pick(t, next ? 'need' : 'off') }))
  const added = services.filter(s => s.on).length
  const rest = p.rows.map(r => r.tradeId).filter(t => !on(t) && !services.some(s => s.tradeId === t && s.on))
  const custom = ev.custom ?? []
  const addCustom = () => { const v = other.trim(); if (v) { plan.setEvent({ custom: [...custom, v].slice(0, 8) }); setOther('') } }
  const pickHow = k => { choose(k, { ev, place: place ?? null }); setHowOpen(false) }
  const go = () => { if (!how) { setHowOpen(true); return } navigate(how === 'planner' ? `/o/${o.id}/planner` : `/o/${o.id}/prefs`) }
  const range = budget.loading ? 'Reading live prices…' : budget.low == null ? 'Priced on request' : budget.low === budget.high ? rupees(budget.low) : `${rupees(budget.low)} – ${rupees(budget.high)}`

  return (
    <main className="cx-enter min-h-[100dvh] overflow-x-clip bg-white pb-[calc(env(safe-area-inset-bottom,0px)+112px)]" data-event-plan>
      <BackHeader title={o.name} onBack={() => navigate(`/o/${o.id}`)} />
      <EventJourney at={1} occasionId={o.id} />

      <PlanHero o={o} hooks={services.filter(s => s.on).map(s => s.hook).filter(Boolean)} ev={ev} place={place} onEdit={() => navigate(`/o/${o.id}`)} />

      {/* The place first (Mohan, 2026-11-11): a venue to book, or a restaurant
          to book or order from, before the rest of the plan is arranged. */}
      {/* Two in a row when the event needs both (Mohan, 2026-11-14). */}
      {(() => {
        const kinds = [(ev.bookVenue || p.needed.includes('venue')) && 'venue', p.needed.includes('restaurant') && 'restaurant'].filter(Boolean)
        return kinds.length ? <div className={'mx-3 mt-3 grid gap-2 ' + (kinds.length > 1 ? 'grid-cols-2' : 'grid-cols-1')} data-place-first-row>{kinds.map(k => <PlaceFirst key={k} o={o} ev={ev} place={place} kind={k} compact={kinds.length > 1} />)}</div> : null
      })()}

      {how && (
        <button type="button" onClick={() => setHowOpen(true)} className="cx-press mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-[14px] bg-[#F7F3FF] px-3 py-2 text-left" data-how-chosen={how}>
          <Glyph3D id={how === 'planner' ? 'svc:plan' : 'all'} size={28} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-[#2E1A4F]">{how === 'planner' ? 'A Planning Master arranges it all for you' : 'You pick what you need — we line up masters'}</span>
          <span className="shrink-0 text-[11.5px] font-black text-[var(--brand)]">Change</span>
        </button>
      )}

      {/* ── Your Plan ─────────────────────────────────────────────── */}
      <section className="mx-3 mt-4 rounded-[24px] bg-white p-3 shadow-[0_0_0_1px_#EEE8F8,0_20px_40px_-34px_rgba(58,18,144,.7)]" data-your-plan>
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="flex items-center gap-2 text-[19px] font-black tracking-[-0.03em] text-[#1C1033]"><CheckCircle2 size={22} className="fill-[#16A34A] text-white" />Your Plan</h2>
          <span className="text-[12px] font-black text-[#0B7A45]" data-added>{added} {added === 1 ? 'service' : 'services'} added</span>
        </div>
        <p className="px-1 text-[11.5px] font-semibold text-[var(--ink-3)]">Tap to add or remove — you’ll choose the details next.</p>
        <div className="mt-3 grid grid-cols-3 gap-2" data-plan-tiles>
          {services.map(s => <ServiceTile key={s.id} s={s} />)}
          <button type="button" onClick={() => setSheet('add')} className="cx-press flex flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-[#DCCDF7] p-2 text-[#6D28D9]" data-add-more>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F1EAFF]"><Plus size={20} strokeWidth={2.6} /></span>
            <span className="text-[12px] font-extrabold">Add more</span>
          </button>
        </div>
        {nearby?.n > 0 && (
          <p className="mt-3 flex items-center gap-1.5 px-1 text-[11.5px] font-extrabold text-[#0B6B3D]" data-nearby>
            <span className="cx-live-dot h-2 w-2 rounded-full bg-[#16A34A]" />{nearby.n}{nearby.more ? '+' : ''} masters nearby for what you’ve chosen
          </p>
        )}
      </section>


      {/* ── Add-ons ───────────────────────────────────────────────── */}
      {addons.length > 0 && (
        <section className="mt-6 px-4" data-addons>
          <h2 className="text-[19px] font-black tracking-[-0.03em] text-[#1C1033]">Add-ons</h2>
          <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">Make your event even more special</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">{addons.map(a => <AddOn key={a.id} a={a} />)}</div>
        </section>
      )}

      {/* The free toolkit — RSVP, invitations, budget — under the add-ons (Mohan, 2026-11-13). */}
      {cat1 && <Toolkit toolkit={cat1.toolkit} onOpen={setFeature} o={o} userId={user?.id} />}
      {cat1 && <ArrangedStrip rows={cat1.arranged} onUndo={r => pick(r.tradeId, 'need')} />}

      <EventTimeline o={o} ev={ev} needed={p.needed} timeline={cat1?.timeline} />

      {/* ── Anything else ─────────────────────────────────────────── */}
      <section className="mt-6 px-4" data-something-else>
        {custom.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5" data-custom>
            {custom.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-[#F4EEFF] py-1.5 pl-3 pr-1.5 text-[12.5px] font-bold text-[#3B1670]">
                {c}<button type="button" onClick={() => plan.setEvent({ custom: custom.filter((_, j) => j !== i) })} aria-label={`Remove ${c}`} className="grid h-5 w-5 place-items-center rounded-full bg-white"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <label className="flex h-12 items-center gap-2 rounded-[14px] bg-[#FAF8FD] px-3.5 shadow-[inset_0_0_0_1px_#EEE9F5]">
          <PenLine size={16} className="shrink-0 text-[#A78BFA]" />
          <input value={other} onChange={e => setOther(e.target.value.slice(0, 60))} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="Something else? Type it"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-[#A79DB9]" data-other-input />
          {other.trim() && <button type="button" onClick={addCustom} className="shrink-0 text-[13px] font-extrabold text-[var(--brand)]" data-other-add>Add</button>}
        </label>
      </section>

      {/* ── The way on: the estimate, and preferences next ────────── */}
      <div className="fixed inset-x-0 bottom-0 z-[130] bg-white/95 px-3 pt-2.5 shadow-[0_-12px_30px_-22px_rgba(58,18,144,.55)] backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }} data-plan-footer>
        <div className="mx-auto flex max-w-[540px] items-stretch gap-2">
          <button type="button" onClick={() => setSheet('estimate')} className="cx-press flex min-w-0 flex-1 items-center gap-2 rounded-[18px] bg-[#FFFAEB] px-2.5 py-2 text-left shadow-[inset_0_0_0_1px_#FBE7B5]" data-estimate-open>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FFE071] to-[#F5A70F] text-[#6B3E00]"><Coins size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-[#8A6A2A]">Estimated total<ChevronRight size={11} /></span>
              <span className="block truncate text-[12.5px] font-black tracking-[-0.025em] text-[#1C1033]" data-estimate>{range}</span>
            </span>
          </button>
          <button type="button" disabled={!p.needed.length} onClick={go} className="cx-press flex w-[42%] shrink-0 items-center justify-center gap-1 rounded-[18px] bg-gradient-to-r from-[#16A34A] to-[#0B7A45] px-2 text-[14.5px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(11,122,69,.95)] disabled:opacity-50" data-plan-next>
            {how === 'planner' ? 'Find my Planning Master' : 'Preferences'}<ChevronRight size={18} />
          </button>
        </div>
      </div>

      <Sheet open={!!feature} onClose={() => setFeature(null)} title="Free with your event"><ToolkitDetail feature={feature} /></Sheet>
      <Sheet open={sheet === 'estimate'} onClose={() => setSheet(null)} title="Your estimate">
        <div className="-mx-4 -mt-6 pb-3"><EstimatedSummary budget={budget} counts={{ services: added, addons: addons.filter(a => a.on).length }} /></div>
      </Sheet>
      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Add something">
        <ul className="max-h-[60dvh] overflow-y-auto pb-3" data-add-list>
          {rest.map(t => (
            <li key={t}>
              <button type="button" onClick={() => { pick(t, 'need'); setSheet(null) }} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-2.5 text-left last:border-0">
                <Thumb o={o} t={t} className="h-11 w-11 shrink-0 rounded-[12px]" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{TRADE[t]?.label ?? copyFor(o, t).title}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{copyFor(o, t).title} · {copyFor(o, t).line}</span></span>
                <Plus size={18} className="shrink-0 text-[var(--brand)]" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <HowSheet open={howOpen} onClose={() => { setHowOpen(false); if (!how) pickHow('each') }} current={how} onPick={pickHow} />
    </main>
  )
}

/* ── Book the place first: venues, or restaurants ─────────────────── */
function PlaceFirst({ o, ev, place, kind, compact = false }) {
  const venue = kind === 'venue'
  const guests = Number(ev.guests) || 0
  const [n, setN] = useState(null)
  useEffect(() => {
    let live = true
    partnersFor(kind, place?.lat ? { lat: place.lat, lng: place.lng } : {})
      .then(list => { if (live) setN(venue ? list.filter(x => (x.spaces ?? []).some(s => !s.capacity || s.capacity >= guests) || Number(x.facets?.max_capacity) >= guests).length : list.length) })
      .catch(() => { if (live) setN(0) })
    return () => { live = false }
  }, [kind, place?.lat, place?.lng, guests]) // eslint-disable-line react-hooks/exhaustive-deps
  /* A partner card (Mohan, 2026-11-12: "very clean, professional — it should
     say these are OUR partnered restaurants, our partnered venues"): a light
     glossy panel, the mark, what we have for them, and one full CTA. */
  const T = venue
    ? { from: '#F6F0FF', to: '#E6D8FF', ink: '#2E1065', accent: '#6D28D9', cta: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', glow: 'rgba(91,33,182,.55)' }
    : { from: '#ECFBF2', to: '#CFEFDC', ink: '#063B22', accent: '#0B7A45', cta: 'linear-gradient(135deg, #16A34A 0%, #0B6B3D 100%)', glow: 'rgba(11,107,61,.55)' }
  /* One slim row (Mohan, 2026-11-13: "venue, restaurant covering a lot of
     the space — a person needs to scroll to see the actual plan"): the
     mark, who we have, one arrow. The plan sits right under it. */
  const line = n == null ? 'Checking who fits…'
    : venue ? (n ? `${n} partner ${n === 1 ? 'venue holds' : 'venues hold'} ${guests.toLocaleString('en-IN')} on ${shortDay(atDay(ev.date, 0))} · exact prices` : 'Adding partner venues near you every week')
      : (n ? `${n} partner ${n === 1 ? 'restaurant' : 'restaurants'} near ${place?.area ?? 'you'} · tables or order in` : 'Signing up partner restaurants near you')
  return (
    <Link to={`/o/${o.id}/${venue ? 'venues' : 'restaurants'}`} data-place-first={kind}
      className={'cx-press relative flex overflow-hidden rounded-[20px] shadow-[0_0_0_1px_rgba(28,16,51,.06),0_18px_34px_-26px_rgba(28,16,51,.55)] ' + (compact ? 'min-h-[150px] flex-col p-3' : 'items-center gap-3 p-2.5 pr-3')}
      style={{ background: `linear-gradient(135deg, ${T.from} 0%, ${T.to} 100%)` }}>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-white/80 to-transparent" />
      <span className={'relative flex items-start justify-between ' + (compact ? 'w-full' : '')}>
        <span className="relative grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[14px] bg-white/90 shadow-[0_10px_20px_-12px_rgba(28,16,51,.5)]"><Glyph3D id={venue ? 'venue' : 'svc:food'} size={38} lift /></span>
        {compact && <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: T.cta, boxShadow: `0 10px 18px -10px ${T.glow}` }}><ChevronRight size={16} strokeWidth={2.8} /></span>}
      </span>
      <span className={'relative min-w-0 flex-1 ' + (compact ? 'mt-2.5' : '')}>
        <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: T.accent }}><BadgeCheck size={11} />{venue ? 'Partner venues' : 'Partner restaurants'}</span>
        <span className={'block font-black leading-[1.1] tracking-[-0.02em] ' + (compact ? 'text-[14.5px]' : 'text-[15.5px]')} style={{ color: T.ink }}>{venue ? 'Book your venue first' : 'Book a table, or order in'}</span>
        <span className={'block text-[11px] font-semibold ' + (compact ? 'line-clamp-2 leading-snug' : 'truncate')} style={{ color: T.ink, opacity: .72 }} data-place-line>{line}</span>
      </span>
      {!compact && <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: T.cta, boxShadow: `0 10px 18px -10px ${T.glow}` }}><ChevronRight size={18} strokeWidth={2.8} /></span>}
    </Link>
  )
}

/* ── The hero: the occasion under string lights ──────────────────── */
function PlanHero({ o, hooks, ev, place, onEdit }) {
  const cat = CATEGORIES.find(c => c.id === o.category)
  const art = occasionArt(o).kind === 'art' ? (hdArtFor(`occ-${o.id}`) ?? occasionArt(o).src) : cat && categoryArt(cat).kind === 'art' ? categoryArt(cat).src : null
  const tag = [...new Set(hooks)].slice(0, 3)
  return (
    <section className="mx-3 mt-3" data-plan-hero>
      <div className="relative h-[176px] overflow-hidden rounded-[26px]" style={{ background: 'linear-gradient(135deg, #F4ECFF 0%, #E5D4FF 55%, #FDE4F1 100%)' }}>
        <Lights />
        {art
          ? <img src={art} alt="" className="absolute bottom-0 right-0 h-[92%] w-[60%] object-contain object-right-bottom mix-blend-multiply" />
          : <span className="absolute bottom-6 right-6"><OccasionLogo occasion={o} size={92} /></span>}
        <div className="relative z-10 flex h-full w-[52%] flex-col justify-center pl-4">
          <span className="w-fit rounded-full border border-[#7C3AED]/40 bg-white/70 px-2 py-[2px] text-[9.5px] font-black uppercase tracking-[0.18em] text-[#5B21B6]">Plan</span>
          <h1 className="mt-1.5 text-[25px] font-black italic leading-[1.02] tracking-[-0.02em] text-[#2E1065]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{o.name}</h1>
          {tag.length > 0 && <p className="mt-1.5 text-[11.5px] font-extrabold italic text-[#6D28D9]">{tag.join(' · ')}</p>}
          <span className="mt-1 block h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FDE68A]" />
        </div>
      </div>
      <div className="relative z-10 mx-2 -mt-6 flex items-stretch rounded-[18px] bg-white p-2 shadow-[0_0_0_1px_#EEE8F8,0_16px_32px_-20px_rgba(58,18,144,.6)]" data-plan-facts>
        <Fact icon={CalendarDays} a={atDay(ev.date, 0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} b={[atDay(ev.date, 0).toLocaleDateString('en-IN', { weekday: 'short' }), ev.time ? timeLabel(ev.time) : ''].filter(Boolean).join(' · ')} grow="flex-[1.25]" />
        <span className="my-1 w-px bg-[#EEE8F8]" />
        <Fact icon={Users} a={Number(ev.guests || 0).toLocaleString('en-IN')} b="Guests" grow="flex-[.85]" />
        <span className="my-1 w-px bg-[#EEE8F8]" />
        <Fact icon={MapPin} a={place?.area ?? 'Location'} b={place?.city ?? (place?.area ? '' : 'Not set')} grow="flex-[1.2]" />
        <button type="button" onClick={onEdit} aria-label="Edit event details" className="cx-press ml-1 grid w-10 shrink-0 place-items-center rounded-[13px] bg-[#F4EEFF] text-[#6D28D9]" data-plan-edit><Pencil size={16} /></button>
      </div>
    </section>
  )
}
function Fact({ icon: Icon, a, b, grow = 'flex-1' }) {
  return (
    <span className={'min-w-0 px-2 py-0.5 ' + grow}>
      <span className="flex items-center gap-1 text-[12.5px] font-black leading-tight text-[#1C1033]"><Icon size={13} className="shrink-0 text-[#7C3AED]" /><span className="truncate">{a}</span></span>
      {b && <span className="mt-0.5 block truncate pl-[17px] text-[10.5px] font-semibold leading-tight text-[var(--ink-3)]">{b}</span>}
    </span>
  )
}
/* A string of bulbs across the top of the hero, twinkling out of step. */
function Lights() {
  const C = ['#FFD54A', '#FF7AB6', '#7FE7FF', '#FFE9A8', '#B9F6CA']
  const pts = Array.from({ length: 13 }, (_, i) => { const x = 8 + i * 30, y = 10 + Math.sin((i / 12) * Math.PI) * 16; return [x, y] })
  return (
    <svg viewBox="0 0 380 44" className="pointer-events-none absolute inset-x-0 top-0 h-11 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`M0 6 ${pts.map(([x, y]) => `L${x} ${y}`).join(' ')} L380 6`} fill="none" stroke="#B9A4DA" strokeWidth="1" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y + 4} r="6" fill={C[i % C.length]} opacity=".28" className="cx-g3-spark" style={{ animationDelay: `${(i % 5) * 0.45}s` }} />
          <circle cx={x} cy={y + 4} r="2.6" fill={C[i % C.length]} />
        </g>
      ))}
    </svg>
  )
}

/* ── One service on the plan: the picture, a tick or a plus ───────── */
function ServiceTile({ s }) {
  const art = s.tradeId ? serviceArt(s.tradeId) : null
  return (
    <button type="button" onClick={() => s.toggle(!s.on)} aria-pressed={s.on} data-plan-row={s.id} data-on={s.on ? '1' : '0'}
      className={'cx-press relative flex flex-col items-center rounded-[18px] p-1.5 pb-2 text-center transition-[box-shadow,background] duration-200 ' + (s.on ? 'bg-[#FBF8FF] shadow-[0_0_0_1.6px_#CDB4FF,0_10px_22px_-18px_rgba(76,29,149,.9)]' : 'bg-white shadow-[0_0_0_1.2px_#EEE9F5]')}>
      <span className={'relative block aspect-square w-full overflow-hidden rounded-[14px] transition-opacity ' + (s.on ? '' : 'opacity-60')} style={{ background: 'radial-gradient(120% 100% at 50% 20%, #FFFFFF 0%, #F3EDFF 70%)' }}>
        {art?.src && (art.kind === 'art'
          ? <img src={art.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />
          : <img src={art.src} alt="" loading="lazy" className="absolute inset-[16%] h-[68%] w-[68%] object-contain" />)}
      </span>
      <span className={'absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full ring-2 ring-white transition-colors ' + (s.on ? 'cx-pop bg-[#16A34A] text-white' : 'bg-[#6D28D9] text-white')}>
        {s.on ? <Check size={13} strokeWidth={3.4} /> : <Plus size={13} strokeWidth={3.4} />}
      </span>
      <span className="mt-1.5 line-clamp-2 min-h-[2.4em] text-[11.5px] font-extrabold leading-[1.2] tracking-[-0.01em] text-[#1C1033]">{s.name}</span>
      {s.kind === 'essential'
        ? <span className="mt-0.5 rounded-full bg-[#FFF1E7] px-1.5 py-[1px] text-[8.5px] font-black uppercase tracking-[0.08em] text-[#B45309]">Essential</span>
        : s.hook ? <span className="mt-0.5 text-[10px] font-black text-[#7C3AED]">{s.hook}</span> : null}
    </button>
  )
}

/* ── The free toolkit, as a rail ───────────────────────────────────── */
const KIT = {
  invitations: [MailOpen, '#FDECF4', 'linear-gradient(135deg,#FF7AB6,#DB2777)', '#BE185D'],
  rsvp: [ListChecks, '#E9F8EF', 'linear-gradient(135deg,#4ADE80,#15803D)', '#0B7A45'],
  chat: [MessagesSquare, '#EAF1FF', 'linear-gradient(135deg,#60A5FA,#1D4ED8)', '#1D4ED8'],
  community: [Users, '#FFF1E6', 'linear-gradient(135deg,#FDBA74,#EA580C)', '#C2410C'],
  polls: [BarChart3, '#F1EAFF', 'linear-gradient(135deg,#A78BFA,#6D28D9)', '#6D28D9'],
  budget: [Wallet, '#FFF8DB', 'linear-gradient(135deg,#FCD34D,#D97706)', '#A16207'],
  schedule: [CalendarClock, '#E6FAF7', 'linear-gradient(135deg,#5EEAD4,#0F766E)', '#0F766E'],
}
function Toolkit({ toolkit, onOpen, o, userId }) {
  /* The invitation already made for this occasion opens as itself, never as a new one (Mohan, 2026-11-13). */
  const [inv, setInv] = useState(null)
  useEffect(() => { if (userId && o) myInvitations().then(l => setInv((l ?? []).find(x => x.occasion_id === o.id) ?? null)).catch(() => {}) }, [userId, o?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const linkOf = f => (['invitations', 'rsvp', 'chat', 'community'].includes(f.key) ? (inv ? `/invites/${inv.id}` : `/invites/new?o=${o?.id ?? ''}`) : f.to)
  const share = async () => {
    const link = inv ? `${location.origin}/invites/${inv.id}` : `${location.origin}/o/${o?.id}`
    await shareOut({ title: o?.name ?? 'Our celebration', text: inv ? `You're invited — ${o?.name}. RSVP here: ${link}` : `Planning our ${o?.name} on Sambramo: ${link}` })
  }
  if (!toolkit?.features?.length) return null
  return (
    <section className="mt-6" data-toolkit>
      <div className="flex items-end justify-between gap-2 px-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[19px] font-black tracking-[-0.03em] text-[#1C1033]"><Gift size={20} className="text-[#DB2777]" />Free with your event</h2>
          <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">Invites, RSVP and group tools — nothing to book</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={share} className="cx-press flex items-center gap-1 rounded-full bg-[#FDECF4] px-2.5 py-1 text-[11px] font-black text-[#BE185D]" data-toolkit-share><Share2 size={12} />Share link</button>
          <span className="rounded-full bg-gradient-to-br from-[#16A34A] to-[#0B6B3D] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_6px_14px_-8px_rgba(11,107,61,.95)]">₹0</span>
        </span>
      </div>
      {inv && <p className="mx-4 mt-1 text-[11.5px] font-bold text-[#BE185D]" data-toolkit-invite>Your invitation is ready · {(inv.invitation_guests ?? []).filter(g => g.status === 'yes').length} coming</p>}
      <div className="cx-noscroll mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {toolkit.features.map(f => {
          const [Icon, ground, grad, ink] = KIT[f.key] ?? [Gift, '#F4EEFF', 'linear-gradient(135deg,#A78BFA,#6D28D9)', '#6D28D9']
          const body = (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-[13px] text-white shadow-[0_8px_16px_-10px_rgba(20,15,31,.6)]" style={{ background: grad }}><Icon size={19} strokeWidth={2.3} /></span>
              <span className="mt-2 block text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: ink }}>{f.hook}</span>
              <span className="block text-[12.5px] font-extrabold leading-tight text-[#1C1033]">{f.label}</span>
              <span className="mt-auto flex items-center gap-1 pt-1.5 text-[10.5px] font-black" style={{ color: ink }}>{f.ready ? <>Open<ChevronRight size={12} /></> : <><Lock size={10} />Coming soon</>}</span>
            </>
          )
          const cls = 'cx-press flex min-h-[132px] w-[112px] shrink-0 flex-col rounded-[18px] p-2.5 text-left'
          return f.ready && linkOf(f)
            ? <Link key={f.key} to={linkOf(f)} className={cls} style={{ background: ground }} data-toolkit-feature={f.key}>{body}</Link>
            : <button key={f.key} type="button" onClick={() => onOpen?.(f)} className={cls} style={{ background: ground }} data-toolkit-feature={f.key}>{body}</button>
        })}
      </div>
    </section>
  )
}

/* ── An add-on, shelf style: ADD becomes ADDED ─────────────────────── */
function AddOn({ a }) {
  const Icon = optionIcon(`${a.name} ${a.hook ?? ''} ${a.icon ?? ''}`)
  return (
    <div className={'flex flex-col rounded-[18px] p-3 transition-shadow ' + (a.on ? 'bg-[#F3FBF5] shadow-[0_0_0_1.6px_#86D4A4]' : 'bg-white shadow-[0_0_0_1.2px_#EEE9F5,0_10px_22px_-20px_rgba(58,18,144,.6)]')} data-addon={a.id} data-on={a.on ? '1' : '0'}>
      <span className="flex items-start gap-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#F3ECFF] to-[#E4D6FF] text-[#6D28D9]"><Icon size={19} strokeWidth={2.2} /></span>
        <span className="min-w-0">
          <span className="block text-[13px] font-black leading-tight tracking-[-0.01em] text-[#1C1033]">{a.name}</span>
          {a.hook && <span className="block text-[10.5px] font-black text-[#7C3AED]">{a.hook}</span>}
        </span>
      </span>
      <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--ink-2)]">{a.line}</span>
      {a.reason && <span className="mt-1 line-clamp-1 text-[10px] font-bold text-[#7C5BC7]">{a.reason}</span>}
      <button type="button" onClick={() => a.toggle(!a.on)} aria-pressed={a.on} data-addon-toggle={a.id}
        className={'cx-press mt-auto flex h-9 items-center justify-center gap-1 rounded-[11px] pt-0 text-[12.5px] font-black tracking-[0.04em] transition-colors ' + (a.on ? 'mt-2.5 bg-[#16A34A] text-white' : 'mt-2.5 border-[1.5px] border-[#16A34A] bg-white text-[#0C831F]')}>
        {a.on ? <><Check size={14} strokeWidth={3} />ADDED</> : <><Plus size={14} strokeWidth={3} />ADD</>}
      </button>
    </div>
  )
}

/* ── The event journey: five stages, the occasion's own on the day ─── */
function Journey({ o, ev, needed, timeline }) {
  const has = t => needed.includes(t)
  const home = ev.venueChoice === 'home'
  const stages = [
    { mark: 'svc:plan', label: 'Plan & Confirm', line: timeline?.before?.[0] ?? 'Confirm the plan and the date' },
    { mark: has('catering_food') ? 'svc:food' : has('decoration_floral') ? 'svc:space' : 'svc:gifts', label: has('catering_food') ? 'Procure & Prepare' : 'Masters Prepare', line: timeline?.before?.[1] ?? 'Your masters get ready for your day' },
    { mark: home ? 'property' : 'svc:space', label: home ? 'Set up at Home' : 'Set up at Venue', line: timeline?.before?.[2] ?? 'Masters arrive and set up' },
    { mark: o.category, label: 'Enjoy the Day', line: (timeline?.during ?? []).slice(0, 3).join(' · ') || 'Your celebration, run for you' },
    { mark: has('photography') ? 'svc:media' : 'special', label: 'Wrap up & Memories', line: (timeline?.after ?? []).slice(0, 2).join(' · ') || 'Photos shared, thanks said' },
  ]
  const [at, setAt] = useState(null)
  const play = () => {
    let k = 0
    setAt(0)
    const t = setInterval(() => { k += 1; if (k >= stages.length) { clearInterval(t); return } setAt(k) }, 1100)
  }
  return (
    <section className="mx-3 mt-6 rounded-[24px] bg-gradient-to-br from-[#FBF8FF] to-[#F3ECFF] p-3 shadow-[0_0_0_1px_#EEE6FB]" data-journey-rail>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em] text-[#1C1033]"><Route size={19} className="text-[#7C3AED]" />Your Event Journey</h2>
        <button type="button" onClick={play} className="cx-solid cx-press flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-3 py-1.5 text-[11.5px] font-extrabold text-white shadow-[0_8px_16px_-10px_rgba(91,33,182,.95)]" data-journey-play>
          <Play size={11} className="fill-current" />Play journey
        </button>
      </div>
      <div className="cx-noscroll mt-3 flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((s, i) => (
          <div key={s.label} className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setAt(i)} aria-pressed={at === i}
              className={'cx-press flex w-[86px] flex-col items-center rounded-[16px] bg-white px-1 pb-2 pt-1.5 text-center transition-[box-shadow,transform] duration-300 ' + (at === i ? '-translate-y-0.5 shadow-[0_0_0_2px_#7C3AED,0_12px_22px_-14px_rgba(91,33,182,.9)]' : 'shadow-[0_0_0_1px_#ECE4FA]')}>
              <Glyph3D id={s.mark} size={46} />
              <span className="mt-0.5 text-[10.5px] font-extrabold leading-tight text-[#2E1A4F]">{s.label}</span>
            </button>
            {i < stages.length - 1 && <ChevronRight size={14} className={'shrink-0 transition-colors ' + (at != null && i < at ? 'text-[#16A34A]' : 'text-[#B9A4DA]')} />}
          </div>
        ))}
      </div>
      <p key={at ?? 'none'} className="cx-rise mt-2 rounded-[13px] bg-white px-3 py-2 text-[12px] font-semibold leading-snug text-[#3B2A5C]" data-journey-line>
        {at == null ? 'Tap a stage, or play the journey, to see what happens when.' : <><b className="text-[#6D28D9]">{stages[at].label}:</b> {stages[at].line}</>}
      </p>
    </section>
  )
}

/* ── The schedule: dated from the event, from the plan itself ──────── */
function Schedule({ o, ev, needed, timeline }) {
  const has = t => needed.includes(t)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const b = timeline?.before ?? [], d = timeline?.during ?? [], a = timeline?.after ?? []
  /* A generic step is dropped when the occasion's own timeline already
     says it in its own words — no "send the invitations" twice. */
  const said = b.join(' ').toLowerCase()
  const unless = (re, job) => (re.test(said) ? null : job)
  const rows = [
    { off: -7, mark: 'svc:plan', jobs: ['Confirm your plan', has('venue') && unless(/venue/, 'Lock the venue'), has('catering_food') && unless(/menu|food/, 'Finalise the menu'), b[0]] },
    { off: -5, mark: has('decoration_floral') ? 'svc:space' : 'special', jobs: [unless(/invit/, 'Send the invitations'), has('decoration_floral') && unless(/d[ée]cor|theme/, 'Pick the décor theme'), has('cake_desserts') && unless(/cake/, 'Choose the cake'), b[1]] },
    { off: -2, mark: 'svc:gifts', jobs: [unless(/headcount|rsvp/, 'Confirm the headcount'), has('photography') && unless(/shot list|photo/, 'Share the shot list'), b[2]] },
    { off: -1, mark: 'svc:move', jobs: ['Reconfirm timings with masters', has('passenger_transport') && 'Share pickup points', has('decoration_floral') && 'Décor prep'] },
    { off: 0, mark: o.category, jobs: d.length ? d : ['Masters arrive and set up', 'Your celebration'] },
    { off: 1, mark: has('photography') ? 'svc:media' : 'svc:gifts', jobs: a.length ? a : ['Share the photographs', 'Say thank you'] },
  ].map(r => ({ ...r, day: atDay(ev.date, r.off), jobs: [...new Set(r.jobs.filter(Boolean))].slice(0, 3) }))
    .filter(r => r.off >= 0 || r.day >= today)
  return (
    <section className="mx-3 mt-5 rounded-[24px] bg-white p-3 shadow-[0_0_0_1px_#EEE8F8,0_20px_40px_-34px_rgba(58,18,144,.7)]" data-schedule>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em] text-[#1C1033]"><CalendarClock size={19} className="text-[#7C3AED]" />Your Event Schedule</h2>
        <span className="shrink-0 rounded-full bg-[#F4EEFF] px-2.5 py-1 text-[11px] font-extrabold text-[#5B21B6]">{shortDay(atDay(ev.date, 0))}</span>
      </div>
      <ol className="relative mt-3 space-y-2 pl-4">
        <span aria-hidden className="absolute bottom-4 left-[5px] top-4 w-[2px] rounded-full bg-gradient-to-b from-[#C4B5FD] via-[#8B5CF6] to-[#C4B5FD]" />
        {rows.map(r => {
          const day = r.off === 0
          return (
            <li key={r.off} className="relative" data-schedule-row={r.off}>
              <span aria-hidden className={'absolute -left-4 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ring-[3px] ring-white ' + (day ? 'bg-[#6D28D9]' : 'bg-[#A78BFA]')} />
              <div className={'flex items-center gap-2.5 rounded-[16px] p-2 ' + (day ? 'bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_12px_24px_-14px_rgba(91,33,182,.95)]' : 'bg-[#FAF8FE] shadow-[inset_0_0_0_1px_#F0EBF8]')}>
                <Glyph3D id={r.mark} size={34} />
                <span className="w-[74px] shrink-0">
                  <span className="block text-[13.5px] font-black leading-tight">{day ? 'Event Day' : r.off > 0 ? 'After' : `D - ${-r.off}`}</span>
                  <span className={'block text-[10.5px] font-bold leading-tight ' + (day ? 'text-white/80' : 'text-[var(--ink-3)]')}>{shortDay(r.day)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {r.jobs.map(j => (
                    <span key={j} className={'flex items-start gap-1.5 text-[11.5px] font-bold leading-snug ' + (day ? 'text-white' : 'text-[#2E1A4F]')}>
                      <CircleDot size={12} className={'mt-[2px] shrink-0 ' + (day ? 'text-[#FDE68A]' : 'text-[#16A34A]')} />{j}
                    </span>
                  ))}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
