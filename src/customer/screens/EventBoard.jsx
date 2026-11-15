/**
 * The live checkout — /o/:occasionId/board for one celebration, /board
 * for everything in flight (Mohan, 2026-11-13: "the checkout page should
 * be recurring till he finds a master … ₹0 while masters are being found;
 * when a master accepts they see the actual quotation, review, accept,
 * and get the payment link").
 *
 * It is a bill that fills itself in. Every request sent (plan.bookings,
 * written by LiveMatch and Checkout) is read back from the database as
 * it changes:
 *   a request to one master (197)   waiting → accepted at their price → paid
 *   a price request (compare mode)  waiting → replied with a price
 *                                   → review · negotiate · accept
 * The total counts only prices masters actually gave — an accepted
 * booking, or the lowest reply so far for a service still being compared;
 * until then the bill reads ₹0 and says why. Accepting books the line;
 * paying happens right here (lib/payLines → Razorpay), never on another
 * screen. Supabase realtime + a quiet 15-second re-read keep it live.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { BadgeCheck, Bell, Check, ChevronDown, CreditCard, HandCoins, Loader2, Lock, Maximize2, MessageCircle, Radar, Scale, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { payLines } from '../../lib/payLines'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { copyFor } from '../data/requirementCopy'
import { TAG } from '../data/visualCatalogue'
import { usePlan } from '../state/PlanContext'
import { myBookings, acceptQuote, confirmPaid, nudgeRequests, pendingVoucher, clearVoucher } from '../lib/bookings'
import { dayLabel, plural, rupees } from '../lib/format'
import { needsSummary } from '../ui/needs'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import { QuoteThread } from '../../components/vendor/MenuQuote'
import EventJourney from '../ui/EventJourney'
import PlannerDecisions from '../ui/PlannerDecisions'
import SignInSheet from './SignInSheet'
import { useProgress } from '../lib/progress'
import { TRADE_BY_CODE } from '../../data/trades/registry'
import { savedWhere } from '../lib/where'
import { alertsGranted } from '../lib/alerts'
import { enableAlerts } from '../../lib/push'
import { serviceArt } from '../data/art'
import { ArtFill } from '../ui/art'
import LiveMap from '../ui/LiveMap'
import AlertsAsk from '../ui/AlertsAsk'

const STATE_WORD = { waiting: 'Finding your master', replied: 'Quotation in — review it', accepted: 'Accepted · pay to confirm', confirmed: 'Confirmed', closed: 'Closed' }

export default function EventBoard() {
  const { occasionId = null } = useParams()
  const o = occasionId ? OCCASION[occasionId] : null
  useProgress(o?.id, 4, !!o)
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const [detail, setDetail] = useState(null)       // the reply being looked at
  const [asks, setAsks] = useState({})             // quote request id -> the caterer asked something
  const [signIn, setSignIn] = useState(false)
  const [fOpen, setFOpen] = useState(false)
  const [show, setShow] = useState('all')     // all | waiting | replied | accepted | confirmed
  const [order, setOrder] = useState('plan')  // plan | low
  const local = plan.bookings.filter(b => (occasionId ? b.occasionId === occasionId : true) && (b.lineId || b.quoteRequestId))
  /* What this phone sent, plus anything the server holds that this phone
     does not remember (a reinstall, another device): every recent price
     request — for one event, those for its date. */
  const known = new Set(local.map(b => b.quoteRequestId).filter(Boolean))
  const evDate = o ? (plan.eventOf?.(o.id)?.date ?? plan.event.date) : null
  const sent = [...local, ...(data?.quotes ?? [])
    .filter(q => !known.has(q.id) && (!o || (evDate && q.event_date === evDate)) && Date.now() - new Date(q.created_at).getTime() < 14 * 864e5)
    .map(q => ({ key: `srv:${q.id}`, quoteRequestId: q.id, serviceId: q.vendor_service_id, name: q.service_name, cover: null,
      tradeId: TRADE_BY_CODE[q.trade_id]?.id ?? q.trade_id, occasionId: o?.id ?? null, at: new Date(q.created_at).getTime() }))]

  const load = useCallback(async () => {
    if (!user) return
    await nudgeRequests()
    try { setData(await myBookings(user.id)) } catch (e) { setMsg(e.message) }
    const ids = sent.filter(b => b.quoteRequestId).map(b => b.quoteRequestId)
    if (ids.length) supabase.from('sambramo_quote_messages').select('quote_request_id, sender_role, created_at').in('quote_request_id', ids).order('created_at')
      .then(({ data: m }) => { const last = {}; for (const r of m ?? []) last[r.quote_request_id] = r.sender_role; setAsks(Object.fromEntries(Object.entries(last).map(([k, v]) => [k, v === 'partner']))) }, () => {})
  }, [user, plan.bookings, occasionId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`cx-board-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sambramo_quote_requests', filter: `customer_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sambramo_quote_responses' }, () => load())
      .subscribe()
    const tick = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    return () => { supabase.removeChannel(ch); clearInterval(tick) }
  }, [load, user])

  /* Each sent request, with what the database says about it now. */
  const items = sent.map(b => {
    const line = b.lineId ? data?.lines.find(l => l.id === b.lineId) : null
    const quote = b.quoteRequestId ? data?.quotes.find(q => q.id === b.quoteRequestId) : null
    const price = line && ['accepted', 'paid', 'in_progress'].includes(line.status) ? line.listPaise : quote?.response?.customer_amount_paise ?? null
    const state = line ? ({ dispatching: 'waiting', accepted: 'accepted', paid: 'confirmed', in_progress: 'confirmed' }[line.status] ?? line.status)
      : quote ? (quote.response ? 'replied' : ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(quote.state) ? 'waiting' : 'closed') : 'waiting'
    const reply = quote?.response?.partner_components?.menu ?? null
    const guests = Number(quote?.canonical_demand?.menu?.guests) || Number(plan.event.guests) || 0
    const plates = Math.max(guests, Number(reply?.minGuests) || 0)
    return { b, line, quote, price, state, reply, plates, perPlate: reply && price && plates ? Math.round(price / plates) : null, changed: (reply?.changes ?? []).length }
  })
  const byTrade = [...new Set(items.map(x => x.b.tradeId))].map(t => ({ t, occ: OCCASION[items.find(x => x.b.tradeId === t)?.b.occasionId] ?? o, items: items.filter(x => x.b.tradeId === t) }))
  /* The total: a confirmed or accepted price, else the lowest reply. */
  const priceOf = g => {
    const firm = g.items.find(x => ['accepted', 'confirmed'].includes(x.state) && x.price)
    if (firm) return firm.price
    const askedAs = g.items.filter(x => x.state === 'replied' && x.price && !x.changed).map(x => x.price)
    const any = g.items.filter(x => x.state === 'replied' && x.price).map(x => x.price)
    return askedAs.length ? Math.min(...askedAs) : any.length ? Math.min(...any) : null
  }
  const priced = byTrade.map(priceOf)
  const total = priced.reduce((s, x) => s + (x ?? 0), 0)
  const firm = byTrade.reduce((s, g) => s + (g.items.find(x => ['accepted', 'confirmed'].includes(x.state))?.price ?? 0), 0)
  const n = { waiting: byTrade.filter(g => g.items.every(x => x.state === 'waiting')).length, priced: byTrade.filter((g, i) => priced[i] != null).length, confirmed: byTrade.filter(g => g.items.some(x => x.state === 'confirmed')).length }
  const due = items.filter(x => x.state === 'accepted' && x.line)
  const dueTotal = due.reduce((s, x) => s + (Number(x.line.advancePaise) || Number(x.price) || 0), 0)
  const title = o ? o.name : 'Checkout'
  const day = o ? dayLabel(plan.event.date) : `${plural(byTrade.length, 'service')} in flight`

  async function accept(x, approved = false) {
    /* Changes to the customer's menu are approved explicitly, never by accident. */
    if (x.changed && !approved) { setDetail(x); return }
    setBusy(x.quote.response.id); setMsg('')
    try { await acceptQuote(x.quote.response.id, { approveChanges: approved }); setDetail(null); await load(); setMsg(`${x.b.name} accepted — pay below to lock your date.`) } catch (e) { setMsg(e.message) } finally { setBusy(null) }
  }
  /* The payment link: one Razorpay payment for every accepted line. */
  async function pay(lineIds, label) {
    if (!user) { setSignIn(true); return }
    setBusy('pay'); setMsg('')
    const vid = pendingVoucher()
    let r = await payLines({ lineIds, part: 'advance', description: label, voucherId: vid })
    if (!r.ok && r.code === 'voucher') { clearVoucher(); r = await payLines({ lineIds, part: 'advance', description: label }) }
    if (r.ok && vid) clearVoucher()
    const c = await confirmPaid(r)
    setBusy(null)
    setMsg(r.ok ? (c?.ok ? 'Paid and confirmed — your master has been told.' : 'Payment received — confirming with Razorpay.') : r.dismissed ? '' : r.error ?? 'Payment did not go through.')
    setTimeout(load, 1200)
  }

  /* ── The live window (Mohan, 2026-11-15) ─────────────────────────────
     The Rapido moment after "Ask all masters live": the map with the
     masters asked, a sheet over it that says what is happening right now,
     a clock to the first reply-by, and every master's card filling in as
     they answer — compare, chat, negotiate, accept. */
  const place = plan.place?.lat ? plan.place : savedWhere()
  const [, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(k => k + 1), 1000); return () => clearInterval(t) }, [])
  const [askAlerts, setAskAlerts] = useState(false)
  const [alertsOn, setAlertsOn] = useState(null)
  useEffect(() => {
    alertsGranted().then(ok => {
      setAlertsOn(ok)
      if (ok || !sent.length) return
      try { if (sessionStorage.getItem(ALERTS_ASKED)) return; sessionStorage.setItem(ALERTS_ASKED, '1') } catch { /* private mode: ask anyway */ }
      setAskAlerts(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [cmp, setCmp] = useState([])          // quote request ids ticked to compare
  const [cmpOpen, setCmpOpen] = useState(false)
  const [mapFull, setMapFull] = useState(false)
  const live = items.filter(x => x.state === 'waiting')
  const quoted = items.filter(x => x.state === 'replied')
  const booked = items.filter(x => ['accepted', 'confirmed'].includes(x.state))
  const nextBy = live.map(x => x.quote?.expires_at ?? x.line?.reply_by ?? x.b.replyBy).filter(Boolean).map(d => new Date(d).getTime()).filter(t => t > Date.now()).sort((a, b) => a - b)[0] ?? null
  const left = nextBy ? nextBy - Date.now() : 0
  const clock = left > 0 ? `${Math.floor(left / 3600000) ? `${Math.floor(left / 3600000)}h ` : ''}${String(Math.floor((left % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}s` : null
  const headline = !sent.length ? 'Nothing sent yet'
    : booked.length && !live.length && !quoted.length ? 'You’re booked'
      : quoted.length ? `${quoted.length} ${quoted.length === 1 ? 'quotation is' : 'quotations are'} in`
        : `Asking ${items.length} ${items.length === 1 ? 'master' : 'masters'} live`
  const mapMasters = items.map(x => ({ id: x.b.serviceId ?? x.b.key, tradeId: x.b.tradeId }))
  const picked = items.filter(x => x.quote && cmp.includes(x.quote.id))
  const toggle = id => setCmp(c => (c.includes(id) ? c.filter(k => k !== id) : [...c, id].slice(-3)))
  const answered = items.filter(x => x.state !== 'waiting').length
  const negotiateTo = x => `/negotiate/${x.b.serviceId}?t=${x.b.tradeId}${x.b.occasionId ? `&o=${x.b.occasionId}` : ''}`

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+124px)]" data-event-board data-board-scope={o ? 'event' : 'all'}>
      <BackHeader title={title} sub={day} onBack={() => navigate(o ? `/o/${o.id}/plan` : '/plans')} />
      {o && <PlannerDecisions userId={user?.id} occasionId={o.id} context={plan.event} />}
      {o && <EventJourney at={4} occasionId={o.id} />}

      {/* The map — tap it to open it full screen. */}
      <div className="relative mt-2">
        <button type="button" onClick={() => setMapFull(true)} aria-label="Open the map full screen" className="block w-full text-left" data-map-expand>
          <LiveMap full height={250} place={place} searching={live.length > 0} count={items.length || null} masters={mapMasters} />
        </button>
        <span aria-hidden className="pointer-events-none absolute bottom-9 right-3 z-[3] grid h-10 w-10 place-items-center rounded-full bg-white text-[#1C1033] shadow-[0_6px_16px_-6px_rgba(0,0,0,.45)]"><Maximize2 size={17} strokeWidth={2.4} /></span>
      </div>

      {/* The sheet over it: what is happening, now. */}
      <section className="relative z-[2] -mt-6 rounded-t-[26px] bg-white px-4 pb-1 pt-2.5 shadow-[0_-14px_30px_-22px_rgba(28,16,51,.55)]" data-live-window>
        <span aria-hidden className="mx-auto mb-2.5 block h-1.5 w-11 rounded-full bg-[#E3DEEE]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-black leading-[1.1] tracking-[-0.035em] text-[#1C1033]" data-live-headline>{headline}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ink-3)]">
              <span className={'h-2 w-2 shrink-0 rounded-full bg-[#16A34A] ' + (live.length ? 'cx-live-dot' : '')} />
              <span className="truncate">Live near {place?.area ?? 'you'}</span>
            </p>
          </div>
          {clock && (
            <span className="shrink-0 rounded-[14px] bg-[#F4EEFF] px-2.5 py-1.5 text-center" data-reply-clock>
              <span className="block text-[9.5px] font-black uppercase tracking-[0.12em] text-[#7C3AED]">Replies within</span>
              <span className="cx-num block text-[14px] font-black text-[#2E1065]">{clock}</span>
            </span>
          )}
        </div>
        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#EEE9F5]" role="progressbar" aria-label="Replies so far">
          {live.length && !answered
            ? <span className="cx-progress-run block h-full w-1/3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6]" />
            : <span className="block h-full rounded-full bg-gradient-to-r from-[#16A34A] to-[#7C3AED] transition-[width] duration-700" style={{ width: `${Math.max(6, Math.round((answered / Math.max(1, items.length)) * 100))}%` }} />}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center" data-board-counters>
          {[['Asked', items.length, '#6D28D9', '#F6F1FF'], ['Quoted', quoted.length + booked.length, '#B45309', '#FFF7E8'], ['Booked', booked.length, '#0B7A45', '#ECFDF3']].map(([l, v, c, bg]) => (
            <div key={l} className="rounded-[14px] py-2" style={{ background: bg }}><dt className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: c }}>{l}</dt><dd className="cx-num text-[19px] font-black leading-tight" style={{ color: c }}>{v}</dd></div>
          ))}
        </dl>
        {alertsOn
          ? <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-[#0B7A45]" data-alerts-on><Bell size={13} className="fill-current" />Alerts on — we’ll ping you the moment a master replies</p>
          : alertsOn === false && sent.length > 0 && (
            <button type="button" onClick={() => setAskAlerts(true)} className="mx-auto mt-2.5 flex items-center gap-1.5 rounded-full bg-[#EEF4FF] px-3.5 py-2 text-[12.5px] font-extrabold text-[#0F4FC4]" data-alerts-turn-on><Bell size={14} />Turn on alerts — we’ll ping you</button>
          )}
      </section>

      {msg && <p className="mx-4 mt-3 rounded-[14px] bg-[#F4EEFF] px-3 py-2.5 text-[12.5px] font-bold text-[#3B1670]" data-board-msg>{msg}</p>}
      {!sent.length && <p className="mx-4 mt-4 rounded-[18px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-2)] shadow-[0_0_0_1px_#EEE8F8]">Nothing asked yet. <Link to={o ? `/o/${o.id}/plan` : '/'} className="font-extrabold text-[var(--brand)]">{o ? 'Back to your plan' : 'Plan a celebration or book a service'}</Link></p>}

      {/* Every service, and every master asked for it — filling in live. */}
      <div className="mt-3 space-y-5 px-3" data-board>
        {byTrade.map((g, gi) => {
          const top = g.items.some(x => x.state === 'confirmed') ? 'confirmed' : g.items.some(x => x.state === 'accepted') ? 'accepted' : g.items.some(x => x.state === 'replied') ? 'replied' : g.items.every(x => x.state === 'closed') ? 'closed' : 'waiting'
          const asked = needsSummary(g.t, plan.needsOf(g.items[0]?.b.occasionId ?? null, g.t))
          const nQuoted = g.items.filter(x => ['replied', 'accepted', 'confirmed'].includes(x.state)).length
          const sorted = [...g.items].sort((a, b) => (RANK[a.state] - RANK[b.state]) || ((a.price ?? Infinity) - (b.price ?? Infinity)))
          return (
            <section key={g.t} data-board-service={g.t} data-board-state={top}>
              <div className="flex items-center gap-3 px-1">
                <ArtFill art={serviceArt(g.t)} tone="#F6F1FF" className="h-11 w-11 shrink-0 rounded-[14px]" inset="8%" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-black tracking-[-0.02em] text-[#1C1033]">{g.occ ? copyFor(g.occ, g.t).title : TRADE[g.t]?.label ?? g.t}</span>
                  <span className="block truncate text-[11.5px] font-bold text-[var(--ink-3)]">{plural(g.items.length, 'master')} asked · {nQuoted} replied{!o && g.occ ? ` · ${g.occ.name}` : ''}</span>
                </span>
                {priced[gi] != null && <span className="shrink-0 text-right"><span className="block text-[9.5px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{top === 'replied' ? 'From' : 'Price'}</span><span className="cx-num block text-[16px] font-black text-[#1C1033]">{rupees(priced[gi])}</span></span>}
              </div>
              {asked && <p className="mt-1.5 truncate px-1 text-[11.5px] font-semibold text-[var(--ink-3)]"><b className="text-[var(--ink-2)]">You asked for:</b> {asked}</p>}
              <ul className="mt-2.5 space-y-2.5">
                {sorted.map(x => (
                  <MasterRow key={x.b.lineId ?? x.b.quoteRequestId} x={x} busy={busy} question={!!(x.quote && asks[x.quote.id])}
                    picked={!!(x.quote && cmp.includes(x.quote.id))} onPick={() => x.quote && toggle(x.quote.id)}
                    onReview={() => setDetail(x)} onAccept={() => accept(x)} onPay={() => pay([x.line.id], x.b.name)} negotiate={negotiateTo(x)} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {/* The bill, line by line — nothing added at the end. */}
      {total > 0 && (
        <section className="mx-3 mt-5 rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F8,0_18px_36px_-30px_rgba(58,18,144,.7)]" data-bill-breakdown>
          <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{firm === total ? 'Your bill' : 'Your bill so far'}</p>
          <p className="cx-num mt-0.5 text-[30px] font-black leading-none tracking-[-0.03em] text-[#1C1033]" data-running-total>{rupees(total)}</p>
          <dl className="mt-2.5 divide-y divide-dashed divide-[#E9E3F2] text-[13px]">
            {byTrade.map((g, gi) => priced[gi] != null && (
              <div key={g.t} className="flex justify-between gap-2 py-1.5"><dt className="min-w-0 truncate font-bold text-[var(--ink-2)]">{TRADE[g.t]?.label ?? g.t}{g.items.some(x => ['accepted', 'confirmed'].includes(x.state)) ? '' : ' · lowest quote'}</dt><dd className="cx-num shrink-0 font-extrabold">{rupees(priced[gi])}</dd></div>
            ))}
            <div className="flex justify-between gap-2 py-1.5"><dt className="font-bold text-[var(--ink-2)]">Sambramo booking fee</dt><dd className="font-extrabold text-[#0B7A45]">₹0</dd></div>
          </dl>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[var(--ink-3)]"><Lock size={12} className="mt-px shrink-0" />Held in escrow by Razorpay; released to each master only after they deliver. A master who cancels means a full refund.</p>
        </section>
      )}

      {/* Two or three ticked: compare them side by side. */}
      {picked.length >= 2 && (
        <button type="button" onClick={() => setCmpOpen(true)} className="cx-press fixed left-1/2 z-[140] flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#1C1033] px-4 text-[13.5px] font-extrabold text-white shadow-[0_14px_28px_-12px_rgba(28,16,51,.8)]" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }} data-compare-open>
          <Scale size={15} />Compare {picked.length} quotations
        </button>
      )}
      <CompareSheet open={cmpOpen} items={picked} busy={busy} onClose={() => setCmpOpen(false)} onAccept={x => { setCmpOpen(false); accept(x) }} />
      <ReplySheet x={detail} busy={busy} onClose={() => setDetail(null)} onAccept={x => accept(x, true)} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false); load() }} why="to pay and lock your date" />
      <AlertsAsk open={askAlerts} place={place} masters={mapMasters}
        onAllow={() => { setAskAlerts(false); if (user?.id) enableAlerts({ profileId: user.id, app: 'customer' }).then(() => alertsGranted().then(setAlertsOn)).catch(() => {}) }}
        onLater={() => setAskAlerts(false)} />
      {mapFull && createPortal(
        <div className="cx cx-ask-fade fixed inset-0 z-[420] bg-[#EEF0F3]" role="dialog" aria-label="Live map" data-map-full>
          <LiveMap full bare height={typeof window !== 'undefined' ? window.innerHeight : 800} place={place} searching={live.length > 0} count={items.length || null} masters={mapMasters} />
          <button type="button" onClick={() => setMapFull(false)} aria-label="Close the map" className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-white text-[#0B0B14] shadow-[0_6px_16px_-6px_rgba(0,0,0,.45)]" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }} data-map-close><ChevronDown size={24} strokeWidth={2.4} /></button>
          <div className="absolute inset-x-3 rounded-[22px] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(28,16,51,.6)]" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
            <p className="text-[18px] font-black tracking-[-0.03em] text-[#1C1033]">{headline}</p>
            <p className="mt-0.5 text-[12.5px] font-bold text-[var(--ink-3)]">{answered} of {items.length} replied{clock ? ` · replies within ${clock}` : ''}</p>
          </div>
        </div>, document.body)}
      <ActionBar note={due.length ? 'Held in escrow until the event is delivered' : null}>
        {due.length ? (
          <button type="button" disabled={busy === 'pay'} onClick={() => pay(due.map(x => x.line.id), o ? `${o.name} · ${plural(due.length, 'master')}` : `Sambramo · ${plural(due.length, 'master')}`)} className="cx-press cx-solid flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#16A34A] to-[#0B7A45] text-[16px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(11,122,69,.95)]" data-board-pay>
            {busy === 'pay' ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}Pay {rupees(dueTotal)} · confirm {plural(due.length, 'master')}
          </button>
        ) : (
          <div className="flex h-[56px] items-center justify-center gap-2.5 rounded-[18px] bg-[#F4F0FA] text-[14.5px] font-extrabold text-[#3B1670]" data-board-waiting>
            {data || !user ? <Radar size={18} /> : <Loader2 size={18} className="animate-spin" />}{!sent.length ? 'Nothing to pay yet' : quoted.length ? 'Accept a quotation to book · ₹0 till then' : `Waiting for ${plural(live.length, 'master')} · ₹0 due`}
          </div>
        )}
      </ActionBar>
    </main>
  )
}

const ALERTS_ASKED = 'sbm.cx.alerts.asked'
const RANK = { confirmed: 0, accepted: 1, replied: 2, waiting: 3, closed: 4 }

/* "Reading your brief" — three dots, the way a chat shows someone typing. */
const Typing = () => (
  <span className="flex items-center gap-[3px]" aria-hidden>
    {[0, 1, 2].map(i => <span key={i} className="h-[5px] w-[5px] animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />)}
  </span>
)
const TONE = { waiting: '#7C3AED', replied: '#B45309', accepted: '#0B7A45', confirmed: '#0B7A45', closed: '#A49DB5' }

/*
 * One master in the live window. Waiting: their work, "reading your brief".
 * Replied: their price, and the four things to do with it — compare, chat,
 * negotiate, accept. Accepted: pay to lock the date. Booked: done.
 */
function MasterRow({ x, busy, question, picked, onPick, onReview, onAccept, onPay, negotiate }) {
  const tone = TONE[x.state] ?? '#7C3AED'
  return (
    <li className={'relative overflow-hidden rounded-[20px] bg-white p-3 shadow-[0_0_0_1px_#ECE6F4,0_14px_28px_-24px_rgba(58,18,144,.7)] ' + (x.state === 'closed' ? 'opacity-60' : '')} data-board-item={x.state}>
      <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: tone }} />
      <div className="flex items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[15px] bg-[#F3EEF9]">
          {x.b.cover ? <Photo src={x.b.cover} className="h-full w-full object-cover" /> : <ArtFill art={serviceArt(x.b.tradeId)} tone="#F3EEF9" className="h-full w-full" inset="10%" />}
          {x.state === 'waiting' && <span aria-hidden className="cx-shimmer absolute inset-0 opacity-40" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-extrabold text-[#1C1033]">{x.b.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: tone }}>
            {x.state === 'waiting' ? <><Typing />Reading your brief</>
              : x.state === 'replied' ? <><HandCoins size={12} />Quotation in{x.perPlate ? ` · ${rupees(x.perPlate)}/plate` : ''}</>
                : x.state === 'accepted' ? <><Check size={12} />Accepted · pay to lock the date</>
                  : x.state === 'confirmed' ? <><BadgeCheck size={12} />Booked · date locked</>
                    : x.quote?.state === 'UNAVAILABLE' ? 'Not this time' : 'Closed'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {x.price ? <span className="cx-num block text-[18px] font-black leading-tight text-[#1C1033]">{rupees(x.price)}</span> : <span className="block text-[11px] font-bold text-[var(--ink-3)]">₹ —</span>}
          {question && <span className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] font-extrabold text-[#6D28D9]"><MessageCircle size={11} />New question</span>}
        </span>
      </div>
      {x.state === 'replied' && (
        <div className="mt-3 flex items-center gap-1.5" data-board-actions>
          <button type="button" onClick={onPick} aria-pressed={picked} className={'flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-extrabold ' + (picked ? 'bg-[#1C1033] text-white' : 'bg-white text-[#3A3450] shadow-[inset_0_0_0_1.5px_#E4DDF0]')} data-compare-pick>
            {picked ? <Check size={12} strokeWidth={3} /> : <Scale size={12} />}Compare
          </button>
          <button type="button" onClick={onReview} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-review>
            <MessageCircle size={12} />{x.changed ? `${x.changed} change${x.changed === 1 ? '' : 's'}` : 'Chat'}
          </button>
          <Link to={negotiate} className="flex h-9 shrink-0 items-center rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-negotiate>Negotiate</Link>
          <button type="button" disabled={!!busy} onClick={onAccept} className="cx-cta flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-3 text-[12px] font-extrabold" data-accept>
            {busy === x.quote?.response?.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}Accept
          </button>
        </div>
      )}
      {x.state === 'accepted' && x.line && (
        <button type="button" disabled={!!busy} onClick={onPay} className="cx-solid mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#16A34A] to-[#0B7A45] text-[12.5px] font-extrabold text-white" data-pay-line>
          <CreditCard size={14} />Pay {rupees(Number(x.line.advancePaise) || x.price)} · lock the date
        </button>
      )}
    </li>
  )
}

/* Two or three quotations side by side; what differs is what to read. */
function CompareSheet({ open, items, busy, onClose, onAccept }) {
  const rows = [
    ['Price', x => (x.price ? rupees(x.price) : '—')],
    ['A plate', x => (x.perPlate ? rupees(x.perPlate) : '—')],
    ['Menu', x => (x.reply ? (x.changed ? `${x.changed} change${x.changed === 1 ? '' : 's'}` : 'As you asked') : '—')],
    ['Holds until', x => (x.quote?.response?.quote_valid_until ? new Date(x.quote.response.quote_valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')],
    ['Covers', x => ((x.quote?.response?.partner_components?.lines ?? []).map(l => String(l.description).replace(/^Food — .*/, 'Food')).concat(x.quote?.response?.inclusions ?? [])).filter(Boolean).slice(0, 3).join(', ') || '—'],
  ].filter(([, f]) => items.some(x => f(x) !== '—'))
  const low = Math.min(...items.map(x => x.price ?? Infinity))
  return (
    <Sheet open={open} onClose={onClose} title="Compare quotations">
      <div className="grid gap-2 pb-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }} data-compare-sheet>
        {items.map(x => (
          <div key={x.quote.id} className={'rounded-[18px] p-3 ' + (x.price === low ? 'bg-[#ECFDF3] shadow-[inset_0_0_0_1.5px_#9BE3B9]' : 'bg-[#FAF8FD] shadow-[inset_0_0_0_1px_#ECE6F4]')}>
            <p className="truncate text-[13.5px] font-black text-[#1C1033]">{x.b.name}</p>
            <p className={'text-[10px] font-black uppercase tracking-[0.12em] text-[#0B7A45] ' + (x.price === low ? '' : 'invisible')}>Lowest</p>
            <dl className="mt-2 space-y-1.5">
              {rows.map(([k, f]) => <div key={k}><dt className="text-[9.5px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{k}</dt><dd className="line-clamp-2 text-[12.5px] font-extrabold text-[#1C1033]">{f(x)}</dd></div>)}
            </dl>
            <button type="button" disabled={!!busy} onClick={() => onAccept(x)} className="cx-cta mt-3 h-10 w-full rounded-full text-[12.5px] font-extrabold">Accept</button>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/*
 * One master's reply: the price, what it covers, how long it holds, and —
 * for a menu — every dish they would change, highlighted. A changed menu
 * is accepted only with "Approve changes & accept". The customer can
 * answer a question or ask for a revised quote here.
 */
function ReplySheet({ x, busy, onClose, onAccept }) {
  const r = x?.reply
  const lines = x?.quote?.response?.partner_components?.lines ?? []
  const covers = lines.map(l => String(l.description).replace(/^Food — .*/, 'Food')).filter(Boolean)
  const free = lines.filter(l => l.charged === false).map(l => l.description)
  const until = x?.quote?.response?.quote_valid_until
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  async function askRevision() {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('sambramo_quote_messages').insert({ quote_request_id: x.quote.id, sender_role: 'customer', sender_id: u?.user?.id, kind: 'revision_request', body: text.trim() })
    setSent(error ? (/check/i.test(error.message) ? 'Keep phone numbers and emails out — contacts are shared once you book.' : 'Revised quotes switch on with the next update.') : 'Sent — they can send a new price for the same request.')
    if (!error) setText('')
  }
  return (
    <Sheet open={!!x} onClose={onClose} title={x ? `${x.b.name} · quotation` : ''}
      footer={x?.state === 'replied' ? (
        <button type="button" disabled={!!busy} onClick={() => onAccept(x)} className="cx-press cx-cta flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-extrabold" data-approve-accept>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}{x.changed ? 'Approve changes & accept' : 'Accept this quotation'}
        </button>
      ) : null}>
      {x && (
        <div className="space-y-3 pb-2" data-reply-sheet>
          {x.price && (
            <div className="rounded-[16px] bg-[#FAF8FD] p-3">
              <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Their price for your request</p>
              <p className="cx-num text-[26px] font-black">{rupees(x.price)}</p>
              <p className="text-[12px] font-bold text-[var(--ink-2)]">{x.perPlate ? `${rupees(x.perPlate)} a plate · ${x.plates} plates` : ''}{r?.minGuests ? ` · minimum ${r.minGuests}` : ''}</p>
              {until && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">Holds until {new Date(until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>}
            </div>
          )}
          {x.changed > 0 && (
            <div className="rounded-[16px] bg-[#FFF7E6] p-3" data-reply-changes>
              <p className="text-[13px] font-extrabold text-[#7A4B00]">They changed your menu</p>
              <ul className="mt-1 space-y-0.5 text-[12.5px] font-semibold text-[#5C3A00]">
                {r.changes.map((c, i) => <li key={i}>{c.action === 'swap' ? `${c.from_name} → ${c.to_name}` : c.action === 'remove' ? `Drops ${c.from_name}` : c.action === 'add' ? `Adds ${c.to_name}` : c.note}</li>)}
              </ul>
              <p className="mt-1.5 text-[11px] font-bold text-[#8A5300]">A different menu — not compared like-for-like with quotes for yours.</p>
            </div>
          )}
          {!x.changed && r && <p className="flex items-center gap-1.5 rounded-[14px] bg-[#E9F8EF] px-3 py-2 text-[12.5px] font-extrabold text-[#0B6B3D]"><Check size={14} />Your menu, exactly as you sent it</p>}
          {covers.length > 0 && <p className="text-[12.5px] font-semibold text-[var(--ink-2)]"><b>The price covers:</b> {covers.join(', ')}{free.length ? ` (${free.join(', ')} at no extra cost)` : ''}</p>}
          {x.quote?.response?.notes && <p className="text-[12.5px] font-semibold text-[var(--ink-2)]"><b>From the master:</b> {x.quote.response.notes}</p>}
          <Link to={`/p/${x.b.serviceId}`} className="block text-[12.5px] font-extrabold text-[var(--brand)]" data-view-partner>View their profile and work</Link>
          {x.quote && (
            <div className="rounded-[16px] bg-white p-3 shadow-[inset_0_0_0_1.5px_#ECE6F4]">
              <p className="text-[13px] font-extrabold">Questions</p>
              <QuoteThread requestId={x.quote.id} role="customer" />
            </div>
          )}
          {x.state === 'replied' && (
            <div className="rounded-[16px] bg-white p-3 shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-revise>
              <p className="text-[13px] font-extrabold">Ask for a revised quotation</p>
              <textarea rows={2} value={text} onChange={e => setText(e.target.value.slice(0, 500))} placeholder="e.g. Can you do it for 120 guests? Drop the live counter?" className="mt-1.5 w-full rounded-[12px] bg-[#FAF8FD] p-2.5 text-[13px] font-semibold outline-none" />
              <button type="button" disabled={!text.trim()} onClick={askRevision} className="mt-1.5 h-10 w-full rounded-[12px] bg-[#F4EEFF] text-[13px] font-extrabold text-[#4C1D95] disabled:opacity-50">Send to {x.b.name}</button>
              {sent && <p className="mt-1 text-[11.5px] font-bold text-[var(--ink-2)]">{sent}</p>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
