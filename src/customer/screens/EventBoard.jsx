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
import { BadgeCheck, Check, Clock3, CreditCard, FileText, HandCoins, Loader2, Lock, MessageCircle, Radar, Scale, SlidersHorizontal, TriangleAlert, X } from 'lucide-react'
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
  const sent = plan.bookings.filter(b => (occasionId ? b.occasionId === occasionId : true) && (b.lineId || b.quoteRequestId))

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

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#FAF8FD] pb-[calc(env(safe-area-inset-bottom,0px)+124px)]" data-event-board data-board-scope={o ? 'event' : 'all'}>
      <BackHeader title={title} sub={day} onBack={() => navigate(o ? `/o/${o.id}/plan` : '/plans')} />
      {o && <PlannerDecisions userId={user?.id} occasionId={o.id} context={plan.event} />}
      {o && <EventJourney at={4} occasionId={o.id} />}

      {/* ── The bill that fills itself in ─────────────────────────── */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-30px_rgba(58,18,144,.7)]" data-board-total>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1C1033] via-[#3B1670] to-[#5B21B6] p-4 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <p className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#F4D99A]"><span className="cx-live-dot h-2 w-2 rounded-full bg-[#4ADE80]" />Live checkout</p>
          <p className="cx-num relative mt-1 text-[36px] font-black leading-none tracking-[-0.03em]" data-running-total>{rupees(total) ?? '₹0'}</p>
          <p className="relative mt-1.5 text-[12.5px] font-semibold text-white/80">
            {!sent.length ? 'Nothing sent yet' : total ? (firm === total ? 'Confirmed prices from your masters' : 'So far — only prices masters have given you') : 'Nothing to pay until a master accepts — we are finding them now'}
          </p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-[#F3EFF8] text-center" data-board-counters>
          {[['Finding', n.waiting, Radar, '#6D28D9'], ['Quoted', n.priced, HandCoins, '#B45309'], ['Confirmed', n.confirmed, BadgeCheck, '#0B7A45']].map(([l, v, I, c]) => (
            <div key={l} className="py-2.5"><dt className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]"><I size={11} style={{ color: c }} />{l}</dt><dd className="cx-num text-[18px] font-black" style={{ color: c }}>{v}</dd></div>
          ))}
        </dl>
      </section>

      {/* The bill, line by line — nothing added at the end (Mohan, 2026-11-13: "very technical, very transparent"). */}
      {total > 0 && (
        <section className="mx-3 mt-3 rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE8F8]" data-bill-breakdown>
          <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">How your bill adds up</p>
          <dl className="mt-1.5 divide-y divide-dashed divide-[#E9E3F2] text-[13px]">
            {byTrade.map((g, gi) => priced[gi] != null && (
              <div key={g.t} className="flex justify-between gap-2 py-1.5"><dt className="min-w-0 truncate font-bold text-[var(--ink-2)]">{TRADE[g.t]?.label ?? g.t}{g.items.some(x => ['accepted', 'confirmed'].includes(x.state)) ? '' : ' · quoted'}</dt><dd className="cx-num shrink-0 font-extrabold">{rupees(priced[gi])}</dd></div>
            ))}
            <div className="flex justify-between gap-2 py-1.5"><dt className="font-bold text-[var(--ink-2)]">Sambramo booking fee</dt><dd className="font-extrabold text-[#0B7A45]">₹0</dd></div>
            <div className="flex justify-between gap-2 py-1.5"><dt className="font-bold text-[var(--ink-2)]">Welcome offer</dt><dd className="text-right text-[12px] font-extrabold text-[#0B7A45]">25% off, up to ₹2,500 · applied at payment</dd></div>
            <div className="flex justify-between gap-2 py-2"><dt className="font-black">Total so far</dt><dd className="cx-num font-black">{rupees(total)}</dd></div>
          </dl>
          {dueTotal > 0 && (
            <div className="mt-1 grid grid-cols-2 gap-2 text-center">
              <span className="rounded-[13px] bg-[#E9F8EF] px-2 py-2"><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#0B6B3D]">Pay now</span><span className="cx-num block text-[15px] font-black text-[#063B22]">{rupees(dueTotal)}</span></span>
              <span className="rounded-[13px] bg-[#FAF8FD] px-2 py-2"><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Before the event</span><span className="cx-num block text-[15px] font-black">{rupees(Math.max(0, firm - dueTotal)) ?? '₹0'}</span></span>
            </div>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[var(--ink-3)]"><Lock size={12} className="mt-px shrink-0" />Held in escrow by Razorpay; released to each master only after they deliver. A master who cancels means a full refund.</p>
        </section>
      )}

      {msg && <p className="mx-4 mt-3 rounded-[14px] bg-[#F4EEFF] px-3 py-2.5 text-[12.5px] font-bold text-[#3B1670]" data-board-msg>{msg}</p>}
      {!sent.length && <p className="mx-4 mt-4 rounded-[18px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-2)] shadow-[0_0_0_1px_#EEE8F8]">Nothing on your checkout yet. <Link to={o ? `/o/${o.id}/plan` : '/'} className="font-extrabold text-[var(--brand)]">{o ? 'Back to your plan' : 'Plan a celebration or book a service'}</Link></p>}

      {/* Filters, in one sheet (Mohan, 2026-11-13: "a filter button, not radio buttons"). */}
      {byTrade.length > 1 && (
        <div className="mt-3 flex items-center gap-2 px-3" data-board-filters>
          <button type="button" onClick={() => setFOpen(true)} className="cx-press flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-extrabold text-[#2E1A4F] shadow-[0_0_0_1.5px_#E3D5FA]" data-board-filter-open>
            <SlidersHorizontal size={14} />Filters{(show !== 'all') + (order !== 'plan') ? ` · ${(show !== 'all') + (order !== 'plan')}` : ''}
          </button>
          {show !== 'all' && <button type="button" onClick={() => setShow('all')} className="cx-press flex h-9 items-center gap-1 rounded-full bg-[#F1EAFF] px-3 text-[12px] font-extrabold text-[#5B21B6]">{STATE_WORD[show]}<X size={13} /></button>}
          {order === 'low' && <button type="button" onClick={() => setOrder('plan')} className="cx-press flex h-9 items-center gap-1 rounded-full bg-[#F1EAFF] px-3 text-[12px] font-extrabold text-[#5B21B6]">Lowest price first<X size={13} /></button>}
        </div>
      )}
      <Sheet open={fOpen} onClose={() => setFOpen(false)} title="Filter quotations">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Show</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[['all', 'Everything'], ['waiting', 'Still finding'], ['replied', 'Quotation in'], ['accepted', 'Accepted'], ['confirmed', 'Confirmed']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setShow(k)} aria-pressed={show === k} className={'cx-press h-11 rounded-[13px] text-[13px] font-extrabold ' + (show === k ? 'bg-[#F4EEFF] text-[#3B1670] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>{l}</button>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Order</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 pb-2">
          {[['plan', 'As planned'], ['low', 'Lowest price first']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setOrder(k)} aria-pressed={order === k} className={'cx-press h-11 rounded-[13px] text-[13px] font-extrabold ' + (order === k ? 'bg-[#F4EEFF] text-[#3B1670] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>{l}</button>
          ))}
        </div>
        <button type="button" onClick={() => setFOpen(false)} className="cx-press cx-cta mb-2 mt-2 h-12 w-full rounded-[15px] text-[14px] font-extrabold">Show results</button>
      </Sheet>

      {/* ── One bill line per service ─────────────────────────────── */}
      <div className="mt-3 space-y-3 px-3" data-board>
        {byTrade.map((g, gi) => ({ g, gi })).filter(({ g }) => show === 'all' || g.items.some(x => x.state === show))
          .sort((a, b) => (order === 'low' ? (priced[a.gi] ?? Infinity) - (priced[b.gi] ?? Infinity) : a.gi - b.gi))
          .map(({ g, gi }) => {
          const many = g.items.length > 1
          const asked = needsSummary(g.t, plan.needsOf(g.items[0]?.b.occasionId ?? null, g.t))
          const top = g.items.some(x => x.state === 'confirmed') ? 'confirmed' : g.items.some(x => x.state === 'accepted') ? 'accepted' : g.items.some(x => x.state === 'replied') ? 'replied' : g.items.every(x => x.state === 'closed') ? 'closed' : 'waiting'
          return (
            <section key={g.t} className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#ECE6F4]" data-board-service={g.t} data-board-state={top}>
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#E9E3F2] px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-extrabold text-[#1C1033]">{g.occ ? copyFor(g.occ, g.t).title : TRADE[g.t]?.label ?? g.t}</span>
                  <span className={'flex items-center gap-1 text-[11px] font-bold ' + (top === 'confirmed' || top === 'accepted' ? 'text-[#0B6B3D]' : top === 'replied' ? 'text-[#B45309]' : 'text-[var(--ink-3)]')}>
                    {top === 'waiting' ? <Radar size={11} /> : top === 'replied' ? <FileText size={11} /> : <Check size={11} />}{STATE_WORD[top]}{!o && g.occ ? ` · ${g.occ.name}` : ''}{many ? ` · comparing ${g.items.length}` : ''}
                  </span>
                </span>
                <span className="cx-num shrink-0 text-right text-[16px] font-black text-[#1C1033]">{priced[gi] ? rupees(priced[gi]) : <span className="text-[12px] font-bold text-[var(--ink-3)]">₹ —</span>}</span>
              </div>
              {asked && <p className="truncate px-3.5 pt-2 text-[11px] font-semibold text-[var(--ink-3)]"><b className="text-[var(--ink-2)]">Your quotation:</b> {asked}</p>}
              <ul>
                {g.items.map(x => (
                  <li key={x.b.lineId ?? x.b.quoteRequestId} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#F7F4FA] px-3.5 py-2.5 last:border-0" data-board-item={x.state}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[12px] bg-[#F3EEF9]">{x.b.cover && <Photo src={x.b.cover} className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-extrabold">{x.b.name}</span>
                      <span className={'flex items-center gap-1 text-[11.5px] font-bold ' + (['replied', 'accepted', 'confirmed'].includes(x.state) ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>
                        {x.state === 'waiting' ? <><Clock3 size={12} />Awaiting their quotation</>
                          : x.state === 'replied' ? <><HandCoins size={12} />Quoted {rupees(x.price)}{x.perPlate ? ` · ${rupees(x.perPlate)}/plate` : ''}</>
                            : x.state === 'accepted' ? <><Check size={12} />Accepted {rupees(x.price)} · pay to confirm</>
                              : x.state === 'confirmed' ? <><BadgeCheck size={12} />Confirmed · date locked</> : 'Closed'}
                      </span>
                    </span>
                    {(x.state === 'replied' || x.state === 'accepted' || (x.quote && asks[x.quote.id])) && <span className="flex basis-full flex-wrap items-center justify-end gap-1.5 pl-[52px]" data-board-actions>
                      {x.state === 'replied' && x.reply && (
                        <button type="button" onClick={() => setDetail(x)} className={'cx-press flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold ' + (x.changed ? 'bg-[#FFF3DC] text-[#8A5300]' : 'bg-[#E9F8EF] text-[#0B6B3D]')} data-menu-reply={x.changed ? 'changed' : 'as-asked'}>
                          {x.changed ? <><TriangleAlert size={12} />{x.changed} change{x.changed === 1 ? '' : 's'}</> : <><Check size={12} />As asked</>}
                        </button>
                      )}
                      {x.quote && asks[x.quote.id] && <button type="button" onClick={() => setDetail(x)} className="cx-press flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11px] font-extrabold text-[#4C1D95]" data-question><MessageCircle size={12} />Question</button>}
                      {x.state === 'replied' && (
                        <span className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={() => setDetail(x)} className="cx-press flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[11.5px] font-extrabold text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-review><FileText size={12} />Review</button>
                          <Link to={`/negotiate/${x.b.serviceId}?t=${x.b.tradeId}${x.b.occasionId ? `&o=${x.b.occasionId}` : ''}`} className="cx-press flex h-8 items-center rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-negotiate>Negotiate</Link>
                          <button type="button" disabled={!!busy} onClick={() => accept(x)} className="cx-solid cx-solid-flat shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] cx-press flex h-8 items-center gap-1 rounded-full bg-[#7C3AED] px-2.5 text-[11.5px] font-extrabold text-white" data-accept>
                            {busy === x.quote.response.id ? <Loader2 size={13} className="animate-spin" /> : null}Accept
                          </button>
                        </span>
                      )}
                      {x.state === 'accepted' && x.line && (
                        <button type="button" disabled={!!busy} onClick={() => pay([x.line.id], x.b.name)} className="cx-press flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#16A34A] to-[#0B7A45] px-3 text-[11.5px] font-extrabold text-white" data-pay-line>
                          <CreditCard size={12} />Pay {rupees(Number(x.line.advancePaise) || x.price)}{Number(x.line.advancePaise) && Number(x.line.advancePaise) < x.price ? ' now' : ''}
                        </button>
                      )}
                    </span>}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="mx-4 mt-4 flex items-start gap-2 text-[12px] font-semibold leading-snug text-[var(--ink-3)]"><Scale size={15} className="mt-px shrink-0" /><span>Review each quotation, negotiate if you like — you pay only for the master you accept. Masters see your number only after you pay.</span></p>

      <ReplySheet x={detail} busy={busy} onClose={() => setDetail(null)} onAccept={x => accept(x, true)} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false); load() }} why="to pay and lock your date" />
      <ActionBar note={due.length ? 'Held in escrow until the event is delivered' : null}>
        {due.length ? (
          <button type="button" disabled={busy === 'pay'} onClick={() => pay(due.map(x => x.line.id), o ? `${o.name} · ${plural(due.length, 'master')}` : `Sambramo · ${plural(due.length, 'master')}`)} className="cx-press flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#16A34A] to-[#0B7A45] text-[16px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(11,122,69,.95)]" data-board-pay>
            {busy === 'pay' ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}Pay {rupees(dueTotal)} · confirm {plural(due.length, 'master')}
          </button>
        ) : (
          <div className="flex h-[56px] items-center justify-center gap-2.5 rounded-[18px] bg-[#F4F0FA] text-[14.5px] font-extrabold text-[#3B1670]" data-board-waiting>
            {data || !user ? <Radar size={18} /> : <Loader2 size={18} className="animate-spin" />}{!sent.length ? 'Nothing to pay yet' : n.priced ? `${n.priced} of ${byTrade.length} services priced · accept one to pay` : 'Finding your masters · ₹0 due'}
          </div>
        )}
      </ActionBar>
    </main>
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
