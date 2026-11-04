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
import { ArrowLeftRight, BadgePercent, CalendarCheck2, Check, ChevronRight, ClipboardList, Clock3, Loader2, Lock, MapPin, Phone, Send, ShieldCheck, Sparkles, Star, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { payLines } from '../../lib/payLines'
import { enableAlerts } from '../../lib/push'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { occasionArt, serviceArt } from '../data/art'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { dayLabel, plural, timeLabel } from '../lib/format'
import { quoteLine, requestLine } from '../lib/booking'
import { matchTrade, priceOne, some, lineOf } from '../lib/liveMatch'
import { asLine } from '../lib/quote'
import { loadCuisines } from '../lib/needs'
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
import SignInSheet from './SignInSheet'
import InviteReady from '../ui/InviteReady'

const spring = { type: 'spring', stiffness: 420, damping: 34 }
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
  const plan = usePlan()
  const { user, profile } = useAuth()
  const ev = plan.event
  const place = plan.place?.lat ? plan.place : savedWhere()
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const [params] = useSearchParams()
  const planner = params.get('planner') === '1'
  const services = useMemo(() => (valid ? needsFor(o, plan.picks[o.id] ?? {}, ev).needed : []), [valid, o, plan.picks, ev])
  const needed = useMemo(() => (planner ? [PLANNER] : services), [planner, services])
  const who = planner ? 'planner' : 'master'
  const seed = `${user?.id ?? 'guest'}|${ev.date}|${o?.id}`
  const [rows, setRows] = useState({}) // tradeId → { near, match, backups, pool, stage }
  const [phase, setPhase] = useState('matching') // matching | ready | sending | sent | paying | paid | unpaid | error
  const [swap, setSwap] = useState(null)
  const [signIn, setSignIn] = useState(false)
  const [phone, setPhone] = useState(profile?.phone?.replace(/^\+91/, '') ?? '')
  const [voucher, setVoucher] = useState(null)
  const [sent, setSent] = useState(null)
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
      await loadCuisines(supabase).catch(() => {})
      const t0 = Date.now()
      await some(needed.map((t, i) => async () => {
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
  const instant = landed.filter(x => x.r.match.q.path === 'INSTANT')
  const total = instant.reduce((s, x) => s + Number(x.r.match.q.customer_paise || 0), 0)
  const allNear = list.every(x => x.r.near != null)
  const stageOk = [list.some(x => x.r.near != null), allNear, phase !== 'matching']
  const phoneOk = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))
  const canSend = ['ready', 'error', 'unpaid'].includes(phase) && landed.length > 0
  const askPhone = () => { phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => phoneRef.current?.focus(), 300) }
  const venue = { address: place?.address || [place?.area, place?.city].filter(Boolean).join(', ') || null, area: place?.area ?? null, city: place?.city ?? null }
  const guestsText = ev.guests ? `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}` : null

  /* send(): the best match per service, theirs alone (197). send(true):
     "Compare & negotiate" — the brief goes as a price request to every
     master who fits (up to ten a service); the board shows their prices
     live and the customer accepts one (Mohan, 2026-11-02: optional, a
     button at the end). */
  async function send(all = false) {
    const compare = all === true ? 10 : 1
    if (!user) { setSignIn(true); return }
    setPhase('sending')
    const tel = `+91${phone.replace(/\D/g, '').slice(-10)}`
    if (profile?.id && profile.phone !== tel) supabase.from('profiles').update({ phone: tel }).eq('id', profile.id).then(() => {}, () => {})
    const results = []
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
          guests: Number(nd.$guests) || Number(ev.guests) || null, allergies: nd.$allergies, instructions: nd.$instructions, refs: nd.$refs ?? [], menuId: st.menuId ?? null }) : null
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
    plan.recordBookings(results)
    linkBookings(user.id, results).catch(() => {})
    if (profile?.id) enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => {})
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
          <section className="px-4 pt-2">
            <h2 className="text-[26px] font-black leading-[1.05] tracking-[-0.04em]">{phase === 'matching' ? `Finding your ${who}${planner ? '' : 's'}` : landed.length ? (planner ? 'Your planner is ready' : 'Your masters are ready') : `No ${who} is free`}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-[var(--ink-3)]">
              <span className={'h-2 w-2 rounded-full ' + (phase === 'matching' ? 'cx-live-dot bg-[#16A34A]' : 'bg-[#16A34A]')} />
              Live · near {place?.area ?? 'you'} · {dayLabel(ev.date)}{ev.time ? `, ${timeLabel(ev.time)}` : ''}
            </p>
          </section>

          <Radar active={phase === 'matching'} dots={Math.min(near, 16)} faces={landed.map(x => x.r.match.line.cover).slice(0, 6)} art={occasionArt(o)} tone={o.tone} count={near} />

          <div className="mx-4 mt-1 grid grid-cols-3 gap-2" data-stages>
            {[[MapPin, 'Nearby'], [Users, 'Your needs'], [CalendarCheck2, `Free ${dayLabel(ev.date).split(',')[0]}`]].map(([Icon, label], i) => (
              <span key={label} className={'flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-extrabold transition-colors ' + (stageOk[i] ? 'bg-[#EAF8EF] text-[#0B5B30]' : 'bg-[#F6F3FA] text-[var(--ink-3)]')} data-stage-ok={stageOk[i]}>
                {stageOk[i] ? <Check size={14} strokeWidth={3.2} /> : <Icon size={14} />}{label}
              </span>
            ))}
          </div>

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
            {list.filter(x => x.r.stage !== 'none').map(({ t, r }, i) => <MatchCard key={t} t={t} r={r} i={i} guests={ev.guests} onSwap={() => setSwap({ t })} name={planner ? 'Event planner' : copyFor(o, t).title} fee={planner} />)}
            {gaps.length > 0 && (
              <div className="rounded-[22px] bg-[#FFF8F3] p-3.5 shadow-[0_0_0_1px_#FBE3D3]" data-gaps>
                <p className="text-[14px] font-extrabold">No {who} free {dayLabel(ev.date).split(',')[0]} for</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {gaps.map(({ t }) => (
                    <Link key={t} to={`/s/${t}?o=${o.id}`} className="cx-press flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[12.5px] font-extrabold shadow-[0_0_0_1px_#F6DCCB]" data-gap={t}>
                      <ArtFill art={serviceArt(t)} tone="#FFF1E7" className="h-7 w-7 rounded-full" inset="10%" />{copyFor(o, t).title}<ChevronRight size={14} className="text-[#C2652A]" />
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] font-bold text-[#9A4A12]">Tap one to pick a master yourself, or go ahead without it.</p>
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

      {done && <Done o={o} ev={ev} phase={phase} sent={sent} total={planner ? 0 : total} planner={planner} services={services.length} />}

      {!done && (
        <ActionBar>
          {phase === 'matching' ? (
            <div className="flex h-[58px] items-center justify-center gap-2.5 rounded-[20px] bg-[#F4F0FA] text-[15px] font-extrabold text-[#3B1670]" data-matching>
              <Loader2 size={18} className="animate-spin" />Matching {landed.length}/{needed.length}
            </div>
          ) : landed.length ? (
            <>
              <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
                {/* No price, not even an estimate, until a master accepts with theirs
                    (Mohan, 2026-11-02): the masters' own rates still choose who is
                    matched and who backs them up, behind the scenes. */}
                <span>
                  <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Price</span>
                  <span className="block text-[16px] font-black leading-tight tracking-[-0.02em]" data-total>When they accept</span>
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
              {!planner && ['ready', 'error'].includes(phase) && (
                <button type="button" onClick={phoneOk ? () => send(true) : askPhone} className="cx-press mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[16px] text-[13.5px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-compare-all>
                  Compare &amp; negotiate with every master
                </button>
              )}
            </>
          ) : (
            <Link to={`/o/${o.id}/match?all=1`} className="cx-press cx-cta flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] text-[15.5px] font-extrabold">See all masters<ChevronRight size={18} /></Link>
          )}
        </ActionBar>
      )}

      <SwapSheet swap={swap} rows={rows} onClose={() => setSwap(null)} onPick={choose} occasionId={o.id} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to send your requests" />
    </main>
  )
}

/* The radar: rings, a sweep, a dot for every master found nearby, and the
   matched masters' faces landing on it. Dots are centred with margins, not
   translate — the pop-in animation owns `transform`. */
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
        <span className="flex items-center gap-1 text-[11.5px] font-extrabold text-[#0B6B3D]"><CalendarCheck2 size={13} />{quote ? 'Replies with a price' : 'Free on your date'}</span>
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
      {t && <Link to={`/s/${t}?o=${occasionId}`} className="mb-3 flex items-center justify-center gap-1 text-[13px] font-extrabold text-[var(--brand)]">See every master<ChevronRight size={15} /></Link>}
    </Sheet>
  )
}

const by = sent => (sent?.replyBy ? `By ${new Date(sent.replyBy).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : 'We alert you')

function Done({ o, ev, phase, sent, total, planner = false, services = 0 }) {
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
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link to={`/o/${o.id}/board`} className="cx-press flex h-[54px] items-center justify-center rounded-[18px] bg-[#F4EEFF] text-[14.5px] font-extrabold text-[#3B1670]" data-track>Track live</Link>
        <Link to="/" className="cx-press cx-cta flex h-[54px] items-center justify-center gap-1.5 rounded-[18px] text-[14.5px] font-extrabold"><Sparkles size={16} />Home</Link>
      </div>
      <InviteReady occasion={o} where="checkout" className="mt-5" />
    </section>
  )
}
