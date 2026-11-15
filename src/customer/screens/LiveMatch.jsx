/**
 * Live matching (Mohan, 2026-11-01): "that moment, live masters matching,
 * so the customer feels it is happening — and is ready to pay".
 *
 * The radar is not decoration. Every dot is a real master near the event,
 * the three ticks are the engine's real stages (lib/liveMatch):
 *   Nearby        live masters in each trade around the venue
 *   Your needs    only those who do what was asked, for this many guests
 *   Free on <day> each candidate put to the booking engine as a preview;
 *                 the first one free at an exact price is the match
 * A result is only ever revealed, never invented: when nobody fits, the
 * row says so and offers the full list.
 *
 * Then ONE button sends every request. Each goes to its master alone,
 * with the backups behind it (migration 197) — never broadcast, so no
 * master loses work they never had a chance at. The customer's number
 * reaches a master only after payment (jobDetail.contactReleased; notes are
 * scrubbed of numbers by 068/073), which is also what keeps the booking —
 * and the money — on Sambramo until the event.
 *
 * Until 197 is pasted the engine answers the old way (an instant master
 * holds the date at once); then the payment opens straight away.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, BadgeCheck, BadgePercent, Bell, CalendarCheck2, Check, ChevronRight, ClipboardList, Clock3, Loader2, Lock, MapPin, Phone, Plus, Send, ShieldCheck, Zap, Star, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { payLines } from '../../lib/payLines'
import { enableAlerts } from '../../lib/push'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { occasionArt, serviceArt } from '../data/art'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { dayLabel, plural, timeLabel, rupees } from '../lib/format'
import { quoteLine, requestLine, requestFor } from '../lib/booking'
import { syncRequirements, dispatchEverything } from '../lib/eventSpine'
import { matchTrade, priceOne, some, lineOf } from '../lib/liveMatch'
import { asLine } from '../lib/quote'
import { loadCuisines, loadExperienceTiers, needsFor as questionsFor } from '../lib/needs'
import { buildBoard } from '../lib/offerBoard'
import OfferBoard from '../ui/OfferBoard'
import { myVouchers, bookingVouchers } from '../lib/rewards'
import { confirmPaid, rememberVoucher } from '../lib/bookings'
import { linkBookings } from '../lib/eventPlans'
import { needsSummary } from '../ui/needs'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import EventJourney from '../ui/EventJourney'
import { copyFor } from '../data/requirementCopy'
import { briefFor } from '../lib/brief'
import { loadCatalogue, snapshotFor } from '../lib/menuStudio'
import { ArtFill } from '../ui/art'
import { useProgress } from '../lib/progress'
import SignInSheet from './SignInSheet'
import InviteShare from '../ui/InviteShare'
import LiveMap from '../ui/LiveMap'
import AlertsAsk from '../ui/AlertsAsk'

const spring = { type: 'spring', stiffness: 420, damping: 34 }
/* Are notifications already allowed? Native first, then the browser. */
async function alertsGranted() {
  try {
    if (window.Capacitor) { const { PushNotifications } = await import('@capacitor/push-notifications'); return (await PushNotifications.checkPermissions()).receive === 'granted' }
  } catch { /* plugin missing */ }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}
const nap = ms => new Promise(r => setTimeout(r, ms))
/* "One planner for all" (?planner=1): the whole plan goes to one event
   planner as the brief — for the host who hands it over rather than books
   each service. Same rules: one request at a time with backups, they
   accept, then the customer pays; the number is released after payment. */
const PLANNER = 'wedding_planning'

export default function LiveMatch() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  useProgress(o?.id, 3, !!o)
  const plan = usePlan()
  const { user, profile } = useAuth()
  const ev = plan.event
  const place = plan.place?.lat ? plan.place : savedWhere()
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  /* The board prices for the same city the request is later sent with (venue.city below), so a city margin can never make the two differ. */
  const boardPlace = place ? { ...place, city: place.city ?? 'Bengaluru' } : place
  const [params] = useSearchParams()
  const planner = params.get('planner') === '1'
  /* ?only=photography,venue — one service sent on its own from its quotation
     card (Mohan, 2026-11-11: "send it now, or find the masters at the end");
     ?master=<serviceId> opens that master's offers first (the Venues and
     Restaurants screens' "Book this"). */
  const only = (params.get('only') ?? '').split(',').filter(t => TRADE[t])
  const master = params.get('master')
  const services = useMemo(() => (valid ? needsFor(o, plan.picks[o.id] ?? {}, ev).needed : []), [valid, o, plan.picks, ev])
  const needed = useMemo(() => (planner ? [PLANNER] : only.length ? only : services), [planner, services, only.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const who = planner ? 'planner' : 'master'
  const seed = `${user?.id ?? 'guest'}|${ev.date}|${o?.id}`
  const [rows, setRows] = useState({}) // tradeId → { near, match, backups, pool, stage }
  const [phase, setPhase] = useState('matching') // matching | ready | sending | sent | paying | paid | unpaid | error
  const [swap, setSwap] = useState(null)
  const [boardFor, setBoardFor] = useState(null) // tradeId whose offer board is open
  const autoOpened = useRef(false)
  useEffect(() => {
    if (master && only.length === 1 && rows[only[0]]?.stage === 'offers' && !autoOpened.current) { autoOpened.current = true; setBoardFor(only[0]) }
  }, [master, rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const attempt = useRef(0) // bumps after a send that failed somewhere, so a retry is a new batch
  const [signIn, setSignIn] = useState(false)
  const [phone, setPhone] = useState(profile?.phone?.replace(/^\+91/, '') ?? '')
  const [voucher, setVoucher] = useState(null)
  const [sent, setSent] = useState(null)
  const [askAlerts, setAskAlerts] = useState(false)
  const phoneRef = useRef(null)
  /* Is request → accept → pay (197) live? Until it is pasted, sending holds
     the masters' dates and the advance is taken at once — the screen must
     not promise "₹0 now". my_request_queue is read-only and owner-scoped. */
  const [requestLive, setRequestLive] = useState(null)
  useEffect(() => {
    if (!user) return
    supabase.rpc('my_request_queue', { p_line_id: '00000000-0000-4000-8000-000000000000' })
      .then(({ error }) => setRequestLive(!error), () => setRequestLive(false))
  }, [user])
  useEffect(() => { if (profile?.phone && !phone) setPhone(profile.phone.replace(/^\+91/, '')) }, [profile?.phone]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) myVouchers(user.id).then(v => { const b = bookingVouchers(v); setVoucher(b.find(x => x.kind === 'welcome_pct') ?? b[0] ?? null) }).catch(() => {}) }, [user])

  const sig = JSON.stringify([needed, ev.date, ev.time, ev.hours, ev.guests, place?.lat, place?.lng])
  useEffect(() => {
    if (!valid || !needed.length) return
    let live = true
    setRows(Object.fromEntries(needed.map(t => [t, { stage: 'near' }])))
    setPhase('matching')
    ;(async () => {
      /* Experiences too: arriving here straight from a reload must not drop
         the customer's chosen experience (it did, until 2026-11-03). */
      await Promise.all([loadCuisines(supabase), loadExperienceTiers(supabase)].map(x => x.catch(() => {})))
      const t0 = Date.now()
      await some(needed.map((t, i) => async () => {
        /* Every master who can deliver it, each with every package of theirs
           that does, priced for the date — the board (Mohan, 2026-11-03). The
           radar is its loading moment; nothing is chosen for the customer. */
        if (!planner) {
          const board = await buildBoard({ tradeId: t, occasionId: o.id, event: ev, place: boardPlace, needs: plan.needsOf(o.id, t) }).catch(() => null)
          await nap(Math.max(0, 700 + i * 320 - (Date.now() - t0)))
          if (live) setRows(x => ({ ...x, [t]: { stage: board?.masters?.length ? 'offers' : 'none', board, near: board?.total ?? 0 } }))
          return
        }
        const r = await matchTrade(t, { occasionId: o.id, event: ev, place, needs: plan.needsOf(o.id, t), seed,
          onPool: n => { if (live) setRows(x => ({ ...x, [t]: { ...(x[t] ?? {}), stage: 'date', near: n } })) } })
        /* The result is real; only its reveal is paced, one service after
           another, so the customer can watch each land. */
        await nap(Math.max(0, 700 + i * 320 - (Date.now() - t0)))
        if (live) setRows(x => ({ ...x, [t]: { ...r, stage: r.match ? 'done' : 'none' } }))
      }), 3)
      if (live) setPhase('ready')
    })()
    return () => { live = false }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />

  const list = needed.map(t => ({ t, r: rows[t] ?? { stage: 'near' } }))
  const near = list.reduce((s, x) => s + (x.r.near ?? 0), 0)
  const landed = list.filter(x => x.r.stage === 'done')
  const gaps = list.filter(x => x.r.stage === 'none')
  const toChoose = list.filter(x => x.r.stage === 'offers')

  /* The customer chose an offer on a board: it becomes this service's line,
     exactly as a match was — send() is unchanged — and the other masters they
     ticked to compare become their backups, theirs first (197). */
  function chooseOffer(t, offer, partner, backups) {
    const line = { ...offer.line, name: partner.name, cover: partner.cover, rating: partner.rating, distanceKm: partner.distanceKm }
    setRows(x => ({ ...x, [t]: { ...x[t], stage: 'done', chosen: true,
      match: { line, partner, offer, q: { path: offer.path, customer_paise: offer.price } },
      backups: backups.map(b => ({ ...b.line, chosenBy: 'customer', customer_paise: b.price })) } }))
    setBoardFor(null)
  }
  const instant = landed.filter(x => x.r.match.q.path === 'INSTANT')
  const total = instant.reduce((s, x) => s + Number(x.r.match.q.customer_paise || 0), 0)
  const allNear = list.every(x => x.r.near != null)
  const stageOk = [list.some(x => x.r.near != null), allNear, phase !== 'matching']
  const phoneOk = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))
  const canSend = ['ready', 'error', 'unpaid'].includes(phase) && landed.length > 0
  const askPhone = () => { phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => phoneRef.current?.focus(), 300) }
  const venue = { address: place?.address || `${place?.area ?? ''}, Bengaluru`, area: place?.area ?? null, city: 'Bengaluru' }
  const guestsText = ev.guests ? `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : null

  /* send(): the best match per service, theirs alone (197). send(true):
     "Compare & negotiate" — the brief goes as a price request to every
     master who fits (up to ten a service); the board shows their prices
     live and the customer accepts one (Mohan, 2026-11-02: optional, a
     button at the end). */
  /* What the master reads: the customer's choices, and anything typed on the plan. */
  function noteFor(t) {
    const nd = plan.needsOf(o.id, t)
    const wants = briefFor(o, t, nd)
    const also = (ev.custom ?? []).length ? `Also: ${ev.custom.join(', ')}` : null
    const where = ev.venueChoice === 'other' && ev.venueOther ? `Venue: ${ev.venueOther}` : null
    const told = nd.$instructions && t !== 'catering_food' ? `From the customer: ${String(nd.$instructions).trim()}` : null
    return [wants && `Needs: ${wants}`, told, also, where].filter(Boolean).join(' · ') || undefined
  }

  async function send(all = false) {
    const compare = all === true ? 10 : 1
    if (!user) { setSignIn(true); return }
    setPhase('sending')
    const tel = `+91${phone.replace(/\D/g, '').slice(-10)}`
    if (profile?.id && profile.phone !== tel) supabase.from('profiles').update({ phone: tel }).eq('id', profile.id).then(() => {}, () => {})
    const results = []
    /* One event on the server (202–206): every chosen service becomes a
       requirement with a code, its answers checked by the server, and the
       whole tap goes as ONE batch — a service already with professionals is
       never sent twice, and a double tap is the same batch. Only when the
       spine is unavailable (signed out of it, or before 202) does the old
       per-line path below run — never silently mixed with this one. */
    if (!planner && compare === 1) {
      const sync = await syncRequirements({ userId: user.id, occasionId: o.id, context: { ...ev, place: place ?? null },
        services: landed.map(({ t }) => ({ tradeId: t, needs: plan.needsOf(o.id, t) })) })
      if (sync.ok) {
        const lines = [], early = []
        for (const { t, r } of landed) {
          const q = sync.reqs[t], line = r.match.line
          const base = { key: line.key, tradeId: t, serviceId: line.serviceId, name: line.name, cover: line.cover, occasionId: o.id, requirementCode: q?.code ?? null }
          if (q?.state === 'dispatched') { early.push({ ...base, path: 'ALREADY_SENT', reasons: ['Already with professionals'] }); continue }
          if (!q?.ok || q.state !== 'ready') {
            early.push({ ...base, path: 'INCOMPLETE', reasons: [q?.message ?? (q?.missing?.length ? `${copyFor(o, t).title}: tell us first — ${q.missing.map(k => questionsFor(t).find(x => x.key === k)?.title ?? k).join(', ')}` : 'Could not save this service')] })
            continue
          }
          lines.push({ base, planServiceId: q.id, vendorServiceId: line.serviceId, request: requestFor(line, ev, place), venue, note: noteFor(t),
            backups: (r.backups ?? []).map(b => ({ serviceId: b.serviceId, chosenBy: b.chosenBy ?? 'sambramo', request: requestFor(b, ev, place) })) })
        }
        const sig = lines.map(l => `${l.planServiceId}:${l.vendorServiceId}:${l.request.package_id ?? l.request.rule_kind ?? ''}`).sort().join('|')
        const clientKey = `snd-${[...sig].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}-${attempt.current}`
        const out = lines.length ? await dispatchEverything({ planId: sync.planId, clientKey, lines: lines.map(({ base, ...l }) => l) }) : { ok: true, sent: [], failed: [], skipped: [] }
        if (!out.ok) { attempt.current++; setSent({ results: [{ path: 'ERROR', reasons: [out.reason] }] }); setPhase('error'); return }
        for (const l of lines) {
          const s2 = (out.sent ?? []).find(x => x.planServiceId === l.planServiceId)
          const f2 = (out.failed ?? []).find(x => x.planServiceId === l.planServiceId)
          results.push(s2
            ? { ...l.base, path: s2.path, lineId: s2.lineId, bookingRequestId: s2.requestId, amountPaise: s2.price, replyBy: s2.replyBy, backups: s2.backups, at: Date.now() }
            : { ...l.base, path: 'ERROR', reasons: f2?.reasons?.length ? f2.reasons : [String(f2?.reason ?? 'Could not send')] })
        }
        results.push(...early)
        if (results.some(x => x.path === 'ERROR')) attempt.current++
      }
    }
    if (!results.length) {
    for (const { t, r } of landed) {
      const line = r.match.line
      try {
        const wants = briefFor(o, t, plan.needsOf(o.id, t))
        const food = needsSummary('catering_food', plan.needsOf(o.id, 'catering_food'))
        /* "Something else" the customer typed on the plan travels with every request. */
        const also = (ev.custom ?? []).length ? `Also: ${ev.custom.join(', ')}` : null
        const where = ev.venueChoice === 'other' && ev.venueOther ? `Venue: ${ev.venueOther}` : null
        const note = (planner
          ? [`Plan the whole ${o.name}`, services.map(x => TRADE[x]?.label).filter(Boolean).join(', '), guestsText, food && `Food: ${food}`, also, where]
          : [wants && `Needs: ${wants}`, also, where]).filter(Boolean).join(' · ') || undefined
        /* A planner prices THIS event (their listed package is a wedding's):
           the brief goes as a request for their fee, not a booking at it. */
        /* Catering built in the Menu Studio goes as the structured menu too. */
        const st = t === 'catering_food' ? plan.needsOf(o.id, t).$studio : null
        const nd = st ? plan.needsOf(o.id, t) : null
        const menu = st ? snapshotFor(await loadCatalogue({ live: false }), st, { diet: nd.$studioDiet ?? nd.$diet?.[0] ?? 'veg', meal: nd.$meal, serve: nd.$serve,
          guests: Number(nd.$guests) || Number(ev.guests) || null, allergies: nd.$allergies, refs: nd.$refs ?? [], menuId: st.menuId ?? null,
          /* The edition the customer chose on the menu card is a promise the caterer must read. */
          instructions: [nd.$instructions, { jain: 'JAIN edition — no onion, garlic or root vegetables', satvik: 'SATVIK edition — no onion or garlic' }[st.edition]].filter(Boolean).join(' · ') || null }) : null
        if (!planner && compare > 1) {
          /* Compare: the brief goes to the best N as price requests. */
          const others = (r.pool ?? []).filter(p => p.serviceId !== line.serviceId).slice(0, compare - 1).map(p => lineOf(asLine(p), o.id))
          const group = crypto.randomUUID() // accepting one closes the rest
          /* Four at a time: ten requests take seconds, not half a minute. */
          const sentNow = await some([line, ...others].map(l => () => quoteLine(l, ev, place, { note, venue, group, menu }).catch(e => ({ path: 'ERROR', reasons_text: [e.message] }))), 4)
          ;[line, ...others].forEach((l, k) => {
            const b = sentNow[k]
            results.push({ key: `${l.key}:${l.serviceId}`, tradeId: t, serviceId: l.serviceId, name: l.name, cover: l.cover, occasionId: o.id,
              path: b.path, lineId: null, quoteRequestId: b.quoteRequestId ?? null, bookingRequestId: b.bookingRequestId ?? null, reasons: b.reasons_text ?? [], at: Date.now() })
          })
          continue
        }
        const b = planner ? await quoteLine(line, ev, place, { note, venue, menu }) : await requestLine(line, ev, place, { note, venue, backups: r.backups ?? [] })
        results.push({ key: line.key, tradeId: t, serviceId: line.serviceId, name: line.name, cover: line.cover, occasionId: o.id,
          path: b.path, lineId: b.lineId ?? null, quoteRequestId: b.quoteRequestId ?? null, bookingRequestId: b.bookingRequestId ?? null,
          amountPaise: b.customer_paise ?? null, reasons: b.reasons_text ?? [], replyBy: b.replyBy ?? null, backups: b.backups ?? 0, at: Date.now() })
      } catch (e) {
        results.push({ key: line.key, tradeId: t, name: line.name, path: 'ERROR', reasons: [e.message] })
      }
    }
    }
    plan.recordBookings(results)
    linkBookings(user.id, results).catch(() => {})
    if (profile?.id) alertsGranted().then(ok => (ok ? enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => {}) : setAskAlerts(true)))
    const requested = results.filter(x => x.path === 'REQUEST')
    const held = results.filter(x => x.lineId && x.path !== 'REQUEST')
    if (requested.length && voucher?.id) rememberVoucher(voucher.id)
    setSent({ results, requested, held, replyBy: requested.map(x => x.replyBy).filter(Boolean).sort()[0] ?? null })
    if (!held.length) {
      const ok = requested.length || results.some(x => x.quoteRequestId)
      if (ok && compare > 1 && !planner) { navigate(`/o/${o.id}/board`); return }
      setPhase(ok ? 'sent' : 'error'); return
    }
    await pay(held.map(x => x.lineId))
  }

  /* The old path (197 not pasted): the masters already hold the date — one payment for all of them. */
  async function pay(lineIds) {
    setPhase('paying')
    const desc = `${o.name} · ${plural(lineIds.length, 'master')}`
    let p = await payLines({ lineIds, part: 'advance', voucherId: voucher?.id ?? null, description: desc })
    if (!p.ok && p.code === 'voucher') p = await payLines({ lineIds, part: 'advance', description: desc })
    await confirmPaid(p)
    setPhase(p.ok ? 'paid' : 'unpaid')
  }

  async function choose(p) {
    const t = swap
    setSwap({ t, busy: p.serviceId })
    const m = await priceOne(p, { occasionId: o.id, event: ev, place })
    if (m) setRows(x => ({ ...x, [t]: { ...x[t], match: m, backups: (x[t].backups ?? []).filter(b => b.serviceId !== p.serviceId), stage: 'done' } }))
    setSwap(m ? null : { t, busy: null, failed: p.serviceId })
  }

  const done = ['sent', 'paid'].includes(phase)
  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+190px)]" data-live-match data-phase={phase}>
      <BackHeader title={done ? 'All set' : planner ? 'Matching planner' : 'Matching masters'} sub={[o.name, guestsText].filter(Boolean).join(' · ')}
        right={<ArtFill art={occasionArt(o)} tone={o.tone} className="h-11 w-11 shrink-0 rounded-[14px]" inset="10%" />} />
      {!done && <EventJourney at={3} occasionId={o.id} />}

      {!done && (
        <>
          {/* The map, edge to edge, the masters on it. */}
          <div className="mt-2">
            <LiveMap full height={300} place={place} searching={phase === 'matching'} count={near || null}
              masters={list.flatMap(({ t, r }) => (r.board?.masters ?? []).map(m => ({ id: m.partner.serviceId, tradeId: t }))
                .concat(r.match?.line ? [{ id: r.match.line.serviceId, tradeId: t }] : []))} />
          </div>
          {/* The sheet rising over it: what is happening, and a bar that moves while it does. */}
          <section className="relative z-[2] -mt-6 rounded-t-[26px] bg-white px-4 pb-1 pt-2.5 text-center shadow-[0_-14px_30px_-22px_rgba(28,16,51,.55)]" data-match-sheet>
            <span aria-hidden className="mx-auto mb-2.5 block h-1.5 w-11 rounded-full bg-[#E3DEEE]" />
            <h2 className="text-[22px] font-black leading-[1.1] tracking-[-0.035em]">{phase === 'matching' ? `Finding your ${who}${planner ? '' : 's'}` : landed.length ? (planner ? 'Your planner is ready' : 'Your masters are ready') : toChoose.length ? `${toChoose.reduce((s, x) => s + (x.r.board?.total ?? 0), 0)} masters can do it — choose yours` : `No ${who} is free yet`}</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] font-bold text-[var(--ink-3)]">
              <span className={'h-2 w-2 rounded-full ' + (phase === 'matching' ? 'cx-live-dot bg-[#16A34A]' : 'bg-[#16A34A]')} />
              <span className="truncate">{phase === 'matching' ? 'Searching' : 'Live'} near {place?.area ?? 'you'} · {dayLabel(ev.date)}</span>
            </p>
            <div className="mx-auto mt-3 h-[5px] w-full overflow-hidden rounded-full bg-[#EEE9F5]" role="progressbar" aria-label="Matching progress" data-match-progress>
              {phase === 'matching'
                ? <span className="cx-progress-run block h-full w-1/3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6]" />
                : <span className="block h-full rounded-full bg-[#16A34A] transition-[width] duration-700" style={{ width: `${Math.max(8, Math.round(((list.length - list.filter(x => x.r.stage === 'near').length) / Math.max(1, list.length)) * 100))}%` }} />}
            </div>
          </section>
          <LiveFeed list={list} phase={phase} place={place} ev={ev} o={o} />
          {/* Nobody waits on this screen: add more meanwhile, we tell you when a master accepts. */}
          {!planner && (
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-[#F6F0FF] to-[#EDE3FF] p-3 shadow-[inset_0_0_0_1px_#E3D5FA]" data-while-you-wait>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[#6D28D9] shadow-[0_8px_18px_-12px_rgba(76,29,149,.6)]"><Bell size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-black leading-tight text-[#2E1065]">No need to wait here</span>
                <span className="block text-[11.5px] font-semibold leading-snug text-[#5B4A7A]">We notify you the moment a master replies or accepts. Meanwhile add anything else your {o.name.toLowerCase()} needs.</span>
              </span>
              <Link to={`/o/${o.id}/plan`} className="cx-solid cx-solid-flat shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] cx-press flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#1C1033] px-3 text-[12px] font-extrabold text-white" data-add-more-live><Plus size={14} />Add more</Link>
            </div>
          )}

          {planner && (
            <section className="mx-4 mt-5 rounded-[22px] bg-[#F7F3FF] p-3.5 shadow-[inset_0_0_0_1px_#E7DCFB]" data-brief>
              <p className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#3B1670]"><ClipboardList size={16} />Your planner arranges all {services.length}</p>
              <div className="cx-noscroll -mx-3.5 mt-2.5 flex gap-1.5 overflow-x-auto px-3.5">
                {services.map(t => (
                  <span key={t} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[12px] font-extrabold shadow-[0_0_0_1px_#E7DCFB]">
                    <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-6 w-6 rounded-full" inset="10%" />{copyFor(o, t).title}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5 space-y-2.5 px-4" data-matches>
            {list.filter(x => x.r.stage !== 'none').map(({ t, r }, i) => (r.stage === 'offers'
              ? <OffersRow key={t} t={t} r={r} i={i} name={copyFor(o, t).title} onOpen={() => setBoardFor(t)} />
              : <MatchCard key={t} t={t} r={r} i={i} guests={ev.guests} onSwap={() => (planner ? setSwap({ t }) : setBoardFor(t))} name={planner ? 'Event planner' : copyFor(o, t).title} fee={planner} />))}
            {gaps.length > 0 && (
              <div className="rounded-[22px] bg-[#FFF8F3] p-3.5 shadow-[0_0_0_1px_#FBE3D3]" data-gaps>
                <p className="text-[14px] font-extrabold">No {who} free {dayLabel(ev.date).split(',')[0]} for</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {gaps.map(({ t }) => (
                    <Link key={t} to={`/o/${o.id}/prefs?t=${t}`} className="cx-press flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[12.5px] font-extrabold shadow-[0_0_0_1px_#F6DCCB]" data-gap={t}>
                      <ArtFill art={serviceArt(t)} tone="#FFF1E7" className="h-7 w-7 rounded-full" inset="10%" />{copyFor(o, t).title}<ChevronRight size={14} className="text-[#C2652A]" />
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] font-bold text-[#9A4A12]">Tap one to loosen its choices, or go ahead without it — we tell you when a master frees up.</p>
              </div>
            )}
          </section>

          {phase !== 'matching' && landed.length > 0 && (<>
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mx-4 mt-4 rounded-[22px] bg-[#FAF8FD] p-3.5 shadow-[inset_0_0_0_1px_#EEE9F5]" data-contact>
              <label className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--brand)] shadow-[0_0_0_1px_#ECE6F4]"><Phone size={17} /></span>
                <span className="text-[14px] font-extrabold text-[var(--ink-3)]">+91</span>
                <input ref={phoneRef} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d]/g, '').slice(-10))} placeholder="Mobile number" aria-label="Mobile number"
                  className="cx-num min-w-0 flex-1 bg-transparent text-[17px] font-extrabold tracking-[0.02em] outline-none placeholder:font-bold placeholder:text-[#B9B0C9]" data-phone />
                {phoneOk && <Check size={18} strokeWidth={3} className="shrink-0 text-[#0C831F]" />}
              </label>
              <p className="mt-2 flex items-center gap-1.5 pl-1 text-[11.5px] font-bold text-[var(--ink-3)]"><Lock size={12} />{planner ? 'Your planner sees' : 'Masters see'} your number only after you pay</p>
            </motion.section>
          </>)}
        </>
      )}

      {done && <Done o={o} ev={ev} phase={phase} sent={sent} total={planner ? 0 : total} planner={planner} services={services.length} next={params.get('next')} only={only} />}

      {!done && (
        <ActionBar>
          {phase === 'matching' ? (
            <div className="flex h-[58px] items-center justify-center gap-2.5 rounded-[20px] bg-[#F4F0FA] text-[15px] font-extrabold text-[#3B1670]" data-matching>
              <Loader2 size={18} className="animate-spin" />Matching {landed.length}/{needed.length}
            </div>
          ) : landed.length ? (
            <>
              <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
                {/* The customer saw every price on the boards and chose (Mohan,
                    2026-11-03) — so the total is shown; a master who replies with a
                    price adds theirs when they do. */}
                <span>
                  <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{planner ? 'Price' : 'Your total'}</span>
                  <span className="cx-num block text-[16px] font-black leading-tight tracking-[-0.02em]" data-total>{!planner && total > 0 ? rupees(total) : 'When they accept'}</span>
                </span>
                {requestLive === false ? (
                  <span className="text-right">
                    <span className="block text-[14px] font-black text-[#0C831F]">Advance now</span>
                    <span className="block text-[11.5px] font-bold text-[var(--ink-3)]">masters hold your date</span>
                  </span>
                ) : (
                  <span className="text-right">
                    <span className="block text-[15px] font-black text-[#0C831F]">₹0 now</span>
                    <span className="block text-[11.5px] font-bold text-[var(--ink-3)]">{planner ? 'pay once you accept their fee' : 'pay after they accept'}</span>
                  </span>
                )}
              </div>
              {voucher && <p className="mb-2 flex items-center gap-1.5 rounded-[12px] bg-[#FFF6E0] px-3 py-1.5 text-[12px] font-extrabold text-[#8A5300]" data-offer><BadgePercent size={14} />{voucher.kind === 'welcome_pct' ? '25% off' : 'Your offer'} applies when you pay</p>}
              {phase === 'error' && <p className="mb-2 rounded-[12px] bg-[#FFF1F0] px-3 py-1.5 text-[12px] font-bold text-[#B42318]" data-send-error>{sent?.results?.flatMap(x => x.reasons ?? [])[0] ?? 'Could not send — try again.'}</p>}
              <button type="button" disabled={!canSend} onClick={!phoneOk ? askPhone : phase === 'unpaid' ? () => pay(sent.held.map(x => x.lineId)) : () => send(false)} className="cx-press cx-cta flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[20px] text-[16px] font-extrabold" data-send>
                {phase === 'sending' || phase === 'paying' ? <><Loader2 size={18} className="animate-spin" />{phase === 'paying' ? 'Opening payment…' : 'Sending…'}</>
                  : phase === 'unpaid' ? <>Pay now<ChevronRight size={18} /></>
                    : !phoneOk ? <><Phone size={17} />Add your mobile number</> : requestLive === false ? <>Book · pay advance<ChevronRight size={18} /></> : <><Send size={18} />{planner ? 'Send to planner' : `Send ${plural(landed.length, 'request')}`}</>}
              </button>
              {!planner && toChoose.length > 0 && (
                <p className="mt-2 text-center text-[12px] font-bold text-[var(--ink-3)]" data-still-to-choose>Still to choose: {toChoose.map(x => copyFor(o, x.t).title).join(', ')}</p>
              )}
              {planner && ['ready', 'error'].includes(phase) && (
                <button type="button" onClick={phoneOk ? () => send(true) : askPhone} className="cx-press mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[16px] text-[13.5px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-compare-all>
                  Compare &amp; negotiate with every master
                </button>
              )}
            </>
          ) : toChoose.length ? (
            <button type="button" onClick={() => setBoardFor(toChoose[0].t)} className="cx-press cx-cta flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] text-[15.5px] font-extrabold" data-choose-first>
              Choose your {(TRADE[toChoose[0].t]?.label ?? copyFor(o, toChoose[0].t).title).toLowerCase()} master<ChevronRight size={18} />
            </button>
          ) : (
            <Link to={`/o/${o.id}/match?all=1`} className="cx-press cx-cta flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] text-[15.5px] font-extrabold">See all masters<ChevronRight size={18} /></Link>
          )}
        </ActionBar>
      )}

      <SwapSheet swap={swap} rows={rows} onClose={() => setSwap(null)} onPick={choose} occasionId={o.id} />
      <OfferBoard open={!!boardFor} onClose={() => setBoardFor(null)} title={boardFor ? copyFor(o, boardFor).title : ''} tradeId={boardFor} occasionId={o.id}
        event={ev} place={boardPlace} needs={boardFor ? plan.needsOf(o.id, boardFor) : {}} initial={boardFor ? rows[boardFor]?.board : null} focus={master}
        onChoose={(offer, partner, backups) => chooseOffer(boardFor, offer, partner, backups)} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to send your requests" />
      {/* "Keep your phone away — we’ll ping you" — asked right after sending, when it means something. */}
      <AlertsAsk open={askAlerts} place={place}
        masters={(sent?.results ?? []).filter(x => x.serviceId).map(x => ({ id: x.serviceId, tradeId: x.tradeId }))}
        onAllow={() => { setAskAlerts(false); if (profile?.id) enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => {}) }}
        onLater={() => setAskAlerts(false)} />
    </main>
  )
}

const Radar2 = () => <span className="relative grid h-4 w-4 place-items-center"><span className="absolute h-4 w-4 animate-ping rounded-full bg-[#7C3AED]/30" /><span className="h-2 w-2 rounded-full bg-[#7C3AED]" /></span>

/* The live feed: what the engine is doing, in the customer's words, each
   line a fact from the rows — never a slogan (Mohan, 2026-11-14: "keep
   informing the user … real time, nothing fake, everything ID-verified"). */
function LiveFeed({ list, phase, place, ev, o }) {
  const where = place?.area ?? 'you'
  const day = dayLabel(ev.date).split(',')[0]
  const lines = []
  for (const { t, r } of list) {
    const name = TRADE[t]?.label ?? copyFor(o, t).title
    if (r.stage === 'near') lines.push({ k: `${t}:near`, on: false, text: `Checking ${name.toLowerCase()} masters near ${where}…` })
    else if (r.stage === 'offers') lines.push({ k: `${t}:offers`, on: true, text: `${r.board.total} ${name.toLowerCase()} ${r.board.total === 1 ? 'master is' : 'masters are'} free on ${day}${r.board.range ? ` · from ${rupees(r.board.range.lo)}` : ''}` })
    else if (r.stage === 'done') lines.push({ k: `${t}:done`, on: true, text: `${r.match.line.name} picked for ${name.toLowerCase()}` })
    else if (r.stage === 'none') lines.push({ k: `${t}:none`, on: false, warn: true, text: `Nobody free for ${name.toLowerCase()} on ${day} yet — we keep looking` })
    else lines.push({ k: `${t}:date`, on: false, text: `${r.near ?? ''} ${name.toLowerCase()} masters — checking ${day}…` })
  }
  const verified = list.reduce((s, x) => s + (x.r.board?.total ?? 0), 0)
  return (
    <ul className="mx-3 mt-3 space-y-1.5" data-live-feed>
      {lines.map(l => (
        <li key={l.k} className={'cx-rise flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-[12.5px] font-bold ' + (l.on ? 'bg-[#EAF8EF] text-[#0B5B30]' : l.warn ? 'bg-[#FFF8F3] text-[#9A4A12]' : 'bg-[#F6F3FA] text-[var(--ink-2)]')} data-feed={l.k}>
          {l.on ? <Check size={14} strokeWidth={3.2} className="shrink-0" /> : <Loader2 size={14} className={'shrink-0 ' + (l.warn ? '' : 'animate-spin')} />}<span className="min-w-0 flex-1">{l.text}</span>
        </li>
      ))}
      <li className="flex items-center gap-2.5 rounded-[14px] bg-[#F6F3FA] px-3 py-2 text-[12.5px] font-bold text-[var(--ink-2)]" data-feed="verified">
        <BadgeCheck size={14} className="shrink-0 text-[#7C3AED]" /><span className="min-w-0 flex-1">{verified ? `All ${verified} ID-verified by Sambramo · ` : 'Every master is ID-verified · '}₹0 to request · pay only after one accepts</span>
        {phase === 'matching' && <span className="cx-live-dot h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />}
      </li>
    </ul>
  )
}

/* The radar: rings, a sweep, a dot for every master found nearby, and the
   matched masters' faces landing on it. Dots are centred with margins, not
   translate — the pop-in animation owns `transform`. (Kept; the map took its place on 2026-11-14.) */
function Radar({ active, dots, faces, art, tone, count }) {
  const at = i => { const a = (i * 137.5 * Math.PI) / 180, r = 30 + ((i * 53) % 58); return { left: `${50 + r * Math.cos(a) * 0.5}%`, top: `${50 + r * Math.sin(a) * 0.5}%` } }
  return (
    <div className="relative mx-auto my-4 h-[230px] w-[230px]" data-radar>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#FBF8FF_0%,#F3ECFF_70%,#EDE3FF_100%)] shadow-[0_24px_50px_-30px_rgba(91,33,168,.75)]" />
      {[0.33, 0.62, 0.9].map(s => <div key={s} className="absolute rounded-full border border-[#DCCDFB]" style={{ inset: `${(1 - s) * 50}%` }} />)}
      {active && <><div className="cx-radar-sweep" /><div className="cx-radar-ping" /></>}
      {Array.from({ length: dots }, (_, i) => <span key={i} className="cx-blip absolute -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_0_3px_rgba(139,92,246,.18)]" style={{ ...at(i), animationDelay: `${i * 70}ms` }} />)}
      {faces.map((src, i) => (
        <span key={i} className="cx-blip absolute -ml-5 -mt-5 h-10 w-10 overflow-hidden rounded-full bg-white ring-[3px] ring-white shadow-[0_8px_16px_-8px_rgba(40,10,90,.7)]" style={at(i * 3 + 1)}>
          <Photo src={src} className="h-full w-full object-cover" />
        </span>
      ))}
      <div className="absolute left-1/2 top-1/2 grid h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_12px_28px_-14px_rgba(91,33,168,.8)]">
        <ArtFill art={art} tone={tone} className="h-[58px] w-[58px] rounded-full" inset="12%" />
      </div>
      {count > 0 && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1C1033] px-3 py-1.5 text-[12px] font-extrabold text-white shadow-[0_10px_20px_-10px_rgba(28,16,51,.9)]" data-near-count>{count} masters checked</span>}
    </div>
  )
}

/* A service whose offers are in: how many masters can deliver it, the price
   range, and the way into its board. Nothing is chosen until the customer
   chooses. */
function OffersRow({ t, r, i, name, onOpen }) {
  const b = r.board
  const exp = b?.ask?.experience
  const faces = (b?.masters ?? []).slice(0, 4).map(m => m.partner.cover).filter(Boolean)
  return (
    <motion.button type="button" onClick={onOpen} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.02 * i }}
      className="cx-press flex w-full items-center gap-3 rounded-[22px] bg-white p-3 text-left shadow-[0_0_0_1px_#E9E1F7,0_18px_30px_-26px_rgba(91,33,168,.9)]" data-match={t} data-state="offers">
      <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-[60px] w-[60px] shrink-0 rounded-[16px]" inset="12%" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-extrabold text-[var(--brand)]">{name}{exp ? ` · ${exp.name}` : ''}</span>
        <span className="block text-[15px] font-black tracking-[-0.02em]">{b.total} can deliver it</span>
        <span className="mt-0.5 block text-[12px] font-bold text-[var(--ink-3)]">{b.range ? `${rupees(b.range.lo)}${b.range.hi !== b.range.lo ? ` – ${rupees(b.range.hi)}` : ''}` : 'They send prices'} · compare and choose</span>
      </span>
      <span className="flex shrink-0 -space-x-2">
        {faces.map((f, k) => <span key={k} className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-white"><Photo src={f} className="h-full w-full object-cover" /></span>)}
      </span>
      <ChevronRight size={18} className="shrink-0 text-[var(--ink-3)]" />
    </motion.button>
  )
}

function MatchCard({ t, r, i, guests, onSwap, name, fee = false }) {
  const m = r.match
  const label = name ?? TRADE[t]?.label ?? t
  if (r.stage !== 'done') {
    return (
      <div className="flex items-center gap-3 rounded-[22px] bg-white p-3 shadow-[0_0_0_1px_#EEE8F6]" data-match={t} data-state="scan">
        <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-[60px] w-[60px] shrink-0 rounded-[16px]" inset="12%" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-extrabold">{label}</p>
          <p className="mt-0.5 text-[12px] font-bold text-[var(--ink-3)]">{r.near != null ? `Checking ${r.near} masters…` : 'Looking nearby…'}</p>
          <div className="cx-scan mt-2 h-2 w-3/4 rounded-full" />
        </div>
      </div>
    )
  }
  const quote = m.q.path === 'QUOTE'
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: 0.02 * i }}
      className="overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#E9E1F7,0_18px_30px_-26px_rgba(91,33,168,.9)]" data-match={t} data-state="done" data-path={m.q.path}>
      <div className="flex items-center gap-3 p-3">
        <span className="relative h-[64px] w-[64px] shrink-0">
          <span className="absolute inset-0 overflow-hidden rounded-[18px] bg-[#F6F3FA]">{m.line.cover ? <Photo src={m.line.cover} className="h-full w-full object-cover" /> : <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-full w-full" inset="12%" />}</span>
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#0C831F] text-white ring-[2.5px] ring-white"><Check size={13} strokeWidth={3.4} /></span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-extrabold text-[var(--brand)]">{label}</p>
          <p className="truncate text-[15px] font-black tracking-[-0.02em]">{m.line.name}</p>
          <p className="mt-0.5 flex items-center gap-2 overflow-hidden whitespace-nowrap text-[12px] font-bold text-[var(--ink-3)]">
            {m.line.rating ? <span className="flex shrink-0 items-center gap-0.5 text-[#B7791F]"><Star size={12} className="fill-current" />{Number(m.line.rating).toFixed(1)}</span> : <span className="shrink-0 text-[#0B6B3D]">New</span>}
            {m.line.distanceKm != null && <span className="shrink-0">{Number(m.line.distanceKm).toFixed(1)} km</span>}
            {(r.backups?.length ?? 0) > 0 && <span className="flex min-w-0 items-center gap-0.5"><ShieldCheck size={12} className="shrink-0" /><span className="truncate">+{r.backups.length}</span></span>}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#F3EFF8] bg-[#FCFBFE] px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-extrabold text-[#0B6B3D]"><CalendarCheck2 size={13} className="shrink-0" />
          <span className="truncate">{m.offer ? [m.offer.kind === 'rate' ? 'By the hour' : m.offer.label ? `“${m.offer.label}”` : null, m.offer.summary, m.offer.price ? rupees(m.offer.price) : 'they send a price'].filter(Boolean).join(' · ') : quote ? 'Replies with a price' : 'Free on your date'}</span></span>
        <button type="button" onClick={onSwap} className="cx-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold text-[var(--brand)]" data-swap={t}><ArrowLeftRight size={13} />Change</button>
      </div>
    </motion.div>
  )
}

function SwapSheet({ swap, rows, onClose, onPick, occasionId }) {
  const t = swap?.t
  const r = t ? rows[t] : null
  const current = r?.match?.line?.serviceId
  const others = (r?.pool ?? []).filter(p => p.serviceId !== current).slice(0, 6)
  return (
    <Sheet open={!!t} onClose={onClose} title={t ? (t === PLANNER ? 'Other planners' : `Other ${(TRADE[t]?.label ?? '').toLowerCase()} masters`) : ''}>
      <ul className="pb-3" data-swap-list>
        {others.map(p => (
          <li key={p.serviceId}>
            <button type="button" disabled={!!swap?.busy} onClick={() => onPick(p)} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left last:border-0">
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[#F6F3FA]"><Photo src={p.cover} className="h-full w-full object-cover" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{p.name}</span>
                <span className="flex items-center gap-2 text-[12px] font-bold text-[var(--ink-3)]">
                  {p.rating ? <span className="flex items-center gap-0.5 text-[#B7791F]"><Star size={11} className="fill-current" />{Number(p.rating).toFixed(1)}</span> : 'New'}
                  {p.distanceKm != null && <span>{Number(p.distanceKm).toFixed(1)} km</span>}
                  {swap?.failed === p.serviceId && <span className="text-[#B42318]">Not free that day</span>}
                </span>
              </span>
              {swap?.busy === p.serviceId ? <Loader2 size={17} className="shrink-0 animate-spin text-[var(--brand)]" /> : <ChevronRight size={17} className="shrink-0 text-[var(--ink-3)]" />}
            </button>
          </li>
        ))}
        {!others.length && <li className="py-6 text-center text-[13px] font-semibold text-[var(--ink-3)]">No one else fits this request yet.</li>}
      </ul>
      {t && <Link to={`/s/${t}?o=${occasionId}&all=1`} className="mb-3 flex items-center justify-center gap-1 text-[13px] font-extrabold text-[var(--brand)]">See every master<ChevronRight size={15} /></Link>}
    </Sheet>
  )
}

const by = sent => (sent?.replyBy ? `By ${new Date(sent.replyBy).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : 'We alert you')

function Done({ o, ev, phase, sent, total, planner = false, services = 0, next = null, only = [] }) {
  const paid = phase === 'paid'
  const n = paid ? sent?.held?.length ?? 0 : sent?.requested?.length ?? 0
  const steps = paid
    ? [['Masters confirmed', 'Your date is held', true], ['Advance paid', 'Held safely until your event', true], ['Event day', dayLabel(ev.date), false]]
    : planner
      ? [['Brief sent', 'To your planner, theirs alone', true], ['Planner replies', 'With their fee for your event', false], ['You accept and pay', 'Block with a token, or pay in full', false], ['Planner arranges it all', plural(services, 'service'), false], ['Event day', dayLabel(ev.date), false]]
      : [['Requests sent', `To ${plural(n, 'master')}, one each`, true], ['Masters accept', by(sent), false], ['You pay', 'Only after they accept', false], ['Event day', dayLabel(ev.date), false]]
  return (
    <section className="px-4 pt-2" data-done={phase}>
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
        className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full bg-[#0C831F] text-white shadow-[0_20px_40px_-18px_rgba(12,131,31,.9)]">
        <Check size={48} strokeWidth={3.2} />
      </motion.div>
      <h2 className="mt-5 text-center text-[26px] font-black tracking-[-0.04em]">{paid ? 'Booked!' : planner ? 'Sent to your planner!' : 'Requests sent!'}</h2>
      <p className="mt-1 text-center text-[13.5px] font-bold text-[var(--ink-3)]">{o.name} · {dayLabel(ev.date)}</p>
      <ol className="mt-6 rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]" data-timeline>
        {steps.map(([title, sub, ok], i) => (
          <li key={title} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-[2px] bg-[#EEE8F6]" />}
            <span className={'relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full ' + (ok ? 'bg-[#0C831F] text-white' : 'bg-white text-[var(--ink-3)] ring-2 ring-[#E4DDF0]')}>{ok ? <Check size={14} strokeWidth={3.2} /> : <Clock3 size={13} />}</span>
            <span><span className="block text-[14.5px] font-extrabold">{title}</span><span className="block text-[12px] font-bold text-[var(--ink-3)]">{sub}</span></span>
          </li>
        ))}
      </ol>
      {/* One service sent: carry on with the next while the masters reply (Mohan, 2026-11-13). */}
      {only.length > 0 && (
        <div className="mt-4 rounded-[20px] bg-gradient-to-br from-[#F6F0FF] to-[#EDE3FF] p-3.5 shadow-[inset_0_0_0_1px_#E3D5FA]" data-next-service>
          <p className="text-[13.5px] font-extrabold text-[#2E1065]">We’ll notify you the moment a master accepts</p>
          <p className="text-[12px] font-semibold text-[#5B4A7A]">Your {only.map(t => (TRADE[t]?.label ?? t).toLowerCase()).join(', ')} quotation is with the masters. Keep planning — confirm it from your live checkout when they reply.</p>
          <Link to={`/o/${o.id}/prefs${next ? `?t=${next}` : ''}`} className="cx-press cx-cta mt-2.5 flex h-12 w-full items-center justify-center gap-1.5 rounded-[15px] text-[14px] font-extrabold" data-next-go>
            {next ? <>Next: {TRADE[next]?.label ?? next}<ChevronRight size={17} /></> : <>Back to my preferences<ChevronRight size={17} /></>}
          </Link>
        </div>
      )}
      {/* While masters reply: add more, follow it live, or go home — we notify either way (Mohan, 2026-11-14). */}
      <div className="mt-4 rounded-[20px] bg-[#F3FBF5] p-3.5 shadow-[inset_0_0_0_1px_#C7EBD3]" data-notify-note>
        <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#0B4F2A]"><Bell size={15} />We’ll notify you the moment a master accepts</p>
        <p className="mt-0.5 text-[12px] font-semibold text-[#2F6B4A]">Every master is ID-verified. Nothing is paid until you confirm one on your live checkout.</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {!planner && <Link to={`/o/${o.id}/plan`} className="cx-press flex h-[54px] flex-col items-center justify-center rounded-[18px] bg-[#F4EEFF] text-[12.5px] font-extrabold text-[#3B1670]" data-add-more-done><Plus size={16} />Add more</Link>}
        <Link to={`/o/${o.id}/board`} className={'cx-press flex h-[54px] flex-col items-center justify-center rounded-[18px] bg-[#F4EEFF] text-[12.5px] font-extrabold text-[#3B1670] ' + (planner ? 'col-span-2' : '')} data-track><Radar2 />Track live</Link>
        <Link to="/" className="cx-press cx-cta flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-[18px] text-[12.5px] font-extrabold"><Zap size={16} />Home</Link>
      </div>
      <InviteShare o={o} className="mt-5" />
    </section>
  )
}
