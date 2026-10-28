/**
 * Checkout: the exact total, then one payment.
 *
 * ── The reveal ──────────────────────────────────────────────────────
 * Once the day, the start time and the place are known, every line is
 * put to the booking engine as a PREVIEW (no login, nothing written).
 * What comes back is the real decision — INSTANT with the exact price
 * and the advance due now, QUOTE (the partner prices it), or NOT_ELIGIBLE
 * with the reasons in plain English. Nothing on this screen is an
 * estimate once the previews are in.
 *
 * ── The payment ─────────────────────────────────────────────────────
 * "Confirm & pay" books each instant line (api/anchor?op=book →
 * book_partner_line, which re-checks availability under the partner's
 * lock), sends each quote line to its partner, then opens ONE Razorpay
 * payment for every instant line (lib/payLines: native sheet in the app,
 * web checkout otherwise). The Razorpay webhook, never this screen,
 * records the money; money is held until the partner delivers.
 *
 * ── The money, 2026-10-28 ────────────────────────────────────────────
 * Every price is the Sambramo price (api/_lib/listPrice.js: partner price
 * + margin); the bill says "Booking fee ₹0" because nothing is added at
 * the end. An offer is picked here and CHECKED by the server, which takes
 * it off the Razorpay order — the bill below is computed by the same
 * applyOffer() so the two agree to the rupee. The schedule (payNow): in
 * full under ₹25,000 or within 7 days of the event; otherwise the advance
 * (never under the trade's floor) or the whole amount, the customer's
 * choice. Everything sits in escrow until the event is delivered.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, BadgePercent, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, CreditCard, Gift, HandCoins, Loader2, Lock, MailOpen, MapPin, PartyPopper, Phone, ReceiptText, Share2, ShieldCheck, Sparkles, Ticket, Users, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { payLines } from '../../lib/payLines'
import { enableAlerts } from '../../lib/push'
import { usePlan, needsFor } from '../state/PlanContext'
import { companions } from '../data/crossSell'
import { serviceArt } from '../data/art'
import { ArtFill } from '../ui/art'
import { hasQty } from '../lib/estimate'
import { savedWhere } from '../lib/where'
import { myVouchers, bookingVouchers, daysLeft } from '../lib/rewards'
import { applyOffer, payNow, canSplit, balanceDueOn, advanceFloor, PAY_RULES } from '../../../api/_lib/listPrice.js'
import { LADDER } from '../data/policies'
import { shareOut } from '../lib/share'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { plural, rupees, whenLabel } from '../lib/format'
import { previewLine, bookLine } from '../lib/booking'
import { partnersFor } from '../lib/market'
import { confirmPaid } from '../lib/bookings'
import { Photo, Sheet, Journey } from '../ui/kit'
import SignInSheet from './SignInSheet'
import WhenSheet from './WhenSheet'
import PlaceSheet from './PlaceSheet'
import { needsSummary } from '../ui/needs'
import { linkBookings } from '../lib/eventPlans'
import { loadCuisines } from '../lib/needs'
import { supabase as sb } from '../../lib/supabase'

export default function Checkout() {
  const { user, profile } = useAuth()
  const plan = usePlan()
  useEffect(() => { loadCuisines(sb).catch(() => {}) }, []) // cuisine names for the requirements note
  const navigate = useNavigate()
  const ev = plan.event
  const [phone, setPhone] = useState(profile?.phone?.replace(/^\+91/, '') ?? '')
  const [note, setNote] = useState('')
  const [tips, setTips] = useState([])
  const [gstin, setGstin] = useState('')
  const [other, setOther] = useState({ name: '', phone: '' })
  const [vouchers, setVouchers] = useState([])
  useEffect(() => { if (user) myVouchers(user.id).then(setVouchers).catch(() => {}) }, [user])
  const [pickedId, setPickedId] = useState(undefined) // undefined: the best one; null: none
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')
  const [full, setFull] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [quotes, setQuotes] = useState({})
  const [phase, setPhase] = useState('idle') // idle | booking | paying | done | unpaid | error
  const [outcome, setOutcome] = useState(null)
  const lines = plan.basket
  const eventFor = l => (l.occasionId && l.occasionId === ev.occasionId ? ev : { ...ev, guests: ev.guests ?? 50 })
  const place = plan.place
  const ready = !!(ev.date && ev.time && place?.lat) && lines.every(l => l.fromRef)
  useEffect(() => { if (profile?.phone && !phone) setPhone(profile.phone.replace(/^\+91/, '')) }, [profile?.phone]) // eslint-disable-line react-hooks/exhaustive-deps

  /* A line saved by an older build may not say what its price was FOR
     (no fromRef) — asking the engine then prices the wrong thing (no
     package → per person × every guest). Refresh it from the live listing
     first; the partner and the occasion stay the same. */
  useEffect(() => {
    const stale = lines.filter(l => !l.fromRef)
    if (!stale.length) return
    ;(async () => {
      for (const l of stale) {
        const found = (await partnersFor(l.tradeId).catch(() => [])).find(p => p.serviceId === l.serviceId)
        /* No priced item, or no longer live: mark it checked so checkout can
           proceed and the engine says what is wrong in its own words. */
        plan.add(found ? (found.fromRef ? found : { ...found, fromRef: { type: 'none' } }) : { ...l, fromRef: { type: 'none' } }, l.occasionId)
      }
    })()
  }, [lines.map(l => `${l.key}:${!!l.fromRef}`).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  /* The reveal: ask the engine about every line whenever the facts change. */
  const sig = JSON.stringify([ev.date, ev.time, ev.hours, ev.guests, place?.lat, place?.lng, lines.map(l => [l.key, l.serviceId, l.qty])])
  useEffect(() => {
    if (!ready) return
    let live = true
    setQuotes(Object.fromEntries(lines.map(l => [l.key, { loading: true }])))
    ;(async () => {
      for (const l of lines) {
        try {
          const r = await previewLine(l, eventFor(l), place)
          if (live) setQuotes(q => ({ ...q, [l.key]: r }))
        } catch (e) {
          if (live) setQuotes(q => ({ ...q, [l.key]: { path: 'ERROR', reasons_text: [e.message] } }))
        }
      }
    })()
    return () => { live = false }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const res = lines.map(l => ({ line: l, q: quotes[l.key] ?? null }))
  const instant = res.filter(r => r.q?.path === 'INSTANT')
  const quoteLines = res.filter(r => r.q?.path === 'QUOTE')
  const blocked = res.filter(r => r.q && ['NOT_ELIGIBLE', 'ERROR'].includes(r.q.path))
  const loading = ready && res.some(r => !r.q || r.q.loading)
  /* The money. `base` is the partner's price — the floor no offer goes
     under; a server that does not send it (older build) gets no offer. */
  const sched = instant.map(r => {
    const list = Number(r.q.customer_paise) || 0
    return { key: r.line.key, trade: r.line.tradeId, list, base: Number(r.q.base_paise) || list, advance: Number(r.q.advance_paise) || list }
  })
  const offers = bookingVouchers(vouchers)
  const firstOffer = offers.find(v => v.kind === 'welcome_pct') ?? offers[0] ?? null
  const picked = pickedId === undefined ? firstOffer : offers.find(v => v.id === pickedId) ?? null
  const billAt = (f, v = picked) => {
    const rows = sched.map(x => ({ list: x.list, base: x.base, due: payNow({ list: x.list, advance: x.advance, eventDate: ev.date, trade: x.trade }, { full: f }) }))
    return v ? applyOffer(rows, v) : rows.map(x => ({ discount: 0, charge: x.due }))
  }
  const sum = (a, k) => a.reduce((n, x) => n + x[k], 0)
  const total = sum(sched, 'list')
  const nowBill = billAt(full)
  const saving = sum(nowBill, 'discount')
  const dueNow = sum(nowBill, 'charge')
  const splittable = sched.some(x => payNow({ list: x.list, advance: x.advance, eventDate: ev.date, trade: x.trade }) < x.list)
  const advNow = sum(billAt(false), 'charge')
  const fullNow = sum(billAt(true), 'charge')
  const savingOf = v => sum(billAt(full, v), 'discount')
  const phoneOk = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))
  const canPay = ready && !loading && phoneOk && (instant.length + quoteLines.length) > 0 && phase === 'idle'
  const occ = OCCASION[ev.occasionId]

  async function pay() {
    if (!user) { setSheet('signin'); return }
    setPhase('booking')
    const tel = `+91${phone.replace(/\D/g, '').slice(-10)}`
    if (profile?.id && profile.phone !== tel) supabase.from('profiles').update({ phone: tel }).eq('id', profile.id).then(() => {}, () => {})
    const venue = { address: place.address, area: place.area, city: 'Bengaluru' }
    const results = []
    for (const r of [...instant, ...quoteLines]) {
      try {
        /* The customer's requirements travel with the booking, so the master
           reads "Candid, Drone · Kannada" before they accept. */
        const wants = needsSummary(r.line.tradeId, plan.needsOf(r.line.occasionId, r.line.tradeId))
        const who = other.name.trim() ? `On-site contact: ${other.name.trim()}${other.phone.trim() ? ` (${other.phone.trim()})` : ''}` : (place?.for?.name ? `Booked for ${place.for.name}${place.for.phone ? ` (${place.for.phone})` : ''}` : null)
        const said = [wants && `Needs: ${wants}`, ...tips.map(t => TIP_TEXT[t]), who, gstin && `GSTIN: ${gstin}`, note.trim()].filter(Boolean).join(' | ')
        const b = await bookLine(r.line, eventFor(r.line), place, { note: said || undefined, venue })
        results.push({ key: r.line.key, tradeId: r.line.tradeId, serviceId: r.line.serviceId, name: r.line.name, cover: r.line.cover, occasionId: r.line.occasionId,
          path: b.path, lineId: b.lineId ?? null, quoteRequestId: b.quoteRequestId ?? null, bookingRequestId: b.bookingRequestId ?? null,
          amountPaise: b.customer_paise ?? null, reasons: b.reasons_text ?? [], at: Date.now() })
      } catch (e) {
        results.push({ key: r.line.key, name: r.line.name, path: 'ERROR', reasons: [e.message] })
      }
    }
    plan.recordBookings(results)
    linkBookings(user?.id, results).catch(() => {}) // the saved 360° plan learns what was booked
    const lineIds = results.filter(r => r.lineId).map(r => r.lineId)
    const sent = results.filter(r => r.quoteRequestId).length
    const failed = results.filter(r => !r.lineId && !r.quoteRequestId)
    /* Ask for alerts once something is in flight — quotes and confirmations arrive later. */
    if (profile?.id) enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => {})
    if (!lineIds.length) { setOutcome({ paid: 0, sent, failed }); setPhase(sent ? 'done' : 'error'); return }
    setPhase('paying')
    await charge({ lineIds, sent, failed, voucherId: saving > 0 ? picked?.id : null })
  }

  /* One Razorpay payment for every instant line. The server re-checks the
     offer; if it refuses it (used, not a first booking…), the masters are
     still holding the date and the customer chooses to pay without it. */
  async function charge({ lineIds, sent = 0, failed = [], voucherId = null }) {
    setPhase('paying')
    const p = await payLines({ lineIds, part: 'advance', full, voucherId,
      description: occ ? `${occ.name} · ${plural(lineIds.length, 'master')}` : `Sambramo · ${plural(lineIds.length, 'master')}` })
    if (!p.ok && p.code === 'voucher') { setOutcome({ paid: 0, sent, failed, lineIds, error: p.error }); setPhase('offer'); return }
    const confirmed = await confirmPaid(p)
    setOutcome({ paid: lineIds.length, sent, failed, lineIds, error: p.error ?? null, confirmed: !!confirmed?.ok })
    setPhase(p.ok ? 'done' : p.dismissed ? 'unpaid' : 'error')
  }
  function applyCode() {
    const c = code.trim().toUpperCase()
    const v = vouchers.find(x => String(x.code).toUpperCase() === c)
    if (!c) return
    if (!v) { setCodeMsg('That code isn’t on your account.'); return }
    if (!offers.includes(v)) { setCodeMsg(v.kind === 'free_rsvp' ? 'That one is for invitations — use it when you create one.' : 'That code has been used or has expired.'); return }
    setPickedId(v.id); setCode(''); setCodeMsg(savingOf(v) > 0 ? '' : 'Applied — it lowers the price once the masters are priced.')
  }

  /* ── The screen (Mohan, 2026-10-28): the moment business becomes revenue.
     Plum, amethyst, gold and mint — never sky blue — and one button. ── */
  const have = lines.map(l => l.tradeId)
  const deals = [...new Map(lines.flatMap(l => companions(l.tradeId, have).map(([t, hook]) => [t, { t, hook, with: l.tradeId }]))).values()].slice(0, 6)
  const alsoLike = occ ? needsFor(occ, plan.picks[occ.id] ?? {}, ev).rows.filter(r => !have.includes(r.tradeId) && r.state !== 'skip' && !deals.some(d => d.t === r.tradeId)).slice(0, 6).map(r => r.tradeId) : []
  const grand = Math.max(0, total - saving)
  const balance = Math.max(0, grand - dueNow)
  const dueBy = balanceDueOn(ev.date)
  const forWhom = place?.for ?? savedWhere()?.for ?? null
  const floorPct = Math.round(Math.max(...sched.map(x => advanceFloor(x.trade)), PAY_RULES.minAdvance) * 100)
  const steps = [['Plan', true], ['Masters', lines.length > 0], ['Details', ready && phoneOk], ['Pay', phase === 'done']]
  async function shareCheckout() {
    const text = `${occ ? `${occ.name} on Sambramo` : 'My Sambramo plan'}${ev.date ? ` · ${whenLabel(ev.date, ev.time)}` : ''}\n${lines.map(l => `• ${TRADE[l.tradeId]?.label}: ${l.name}`).join('\n')}${total ? `\nTotal ${rupees(grand)}` : ''}`
    await shareOut({ title: 'Our celebration plan', text })
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#F5F2FA] pb-[calc(env(safe-area-inset-bottom,0px)+178px)]" data-checkout>
      <header className="cx-safe-top sticky top-0 z-[120] bg-white px-3 pb-2 shadow-[0_6px_14px_-12px_rgba(27,11,51,.45)]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press grid h-11 w-11 place-items-center rounded-full shadow-[0_0_0_1px_#ECE6F4]"><ArrowLeft size={20} /></button>
          <p className="min-w-0 flex-1 truncate text-[17px] font-black tracking-[-0.02em]">Checkout</p>
          <button type="button" onClick={shareCheckout} className="cx-press flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold shadow-[0_0_0_1px_#ECE6F4]" data-share-plan><Share2 size={16} />Share</button>
        </div>
        {/* Where they are: three done, one to go */}
        <ol className="mt-2 flex items-center px-1" data-checkout-steps>
          {steps.map(([label, done], i) => (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <span className="flex flex-col items-center gap-0.5">
                <span className={'grid h-7 w-7 place-items-center rounded-full text-[12px] font-black ' + (done ? 'bg-[#F0E9FF] text-[#5B21A8]' : i === steps.findIndex(s => !s[1]) ? 'bg-[#5B21A8] text-white shadow-[0_0_0_4px_#EDE4FF]' : 'bg-[#F3F1F7] text-[#A29BB4]')}>{done ? <Check size={14} strokeWidth={3.2} /> : i + 1}</span>
                <span className={'text-[10.5px] font-extrabold ' + (done || i === steps.findIndex(s => !s[1]) ? 'text-[#3B1670]' : 'text-[#A29BB4]')}>{label}</span>
              </span>
              {i < steps.length - 1 && <span className={'mx-1 mb-4 h-[2px] flex-1 rounded ' + (done ? 'bg-[#C9B5F5]' : 'bg-[#ECE8F3]')} />}
            </li>
          ))}
        </ol>
      </header>

      {/* The event, in four facts — each one a tap to change */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EEE8F6]">
        <div className="flex items-center gap-3 p-4 pb-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-gradient-to-br from-[#7C3AED] to-[#C026D3] text-white shadow-[0_10px_18px_-10px_rgba(124,58,237,.9)]"><PartyPopper size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[18px] font-black tracking-[-0.02em]">{occ ? occ.name : 'Your celebration'}</span>
            <span className="block truncate text-[12.5px] font-semibold text-[var(--ink-3)]">{plural(lines.length, 'master')} · {instant.length && !quoteLines.length ? 'confirmed the moment you pay' : 'prices checked live'}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#F1EDF7]">
          <Fact icon={CalendarDays} label="Date" value={ev.date ? whenLabel(ev.date) : 'Add date'} onClick={() => setSheet('when')} />
          <Fact icon={Clock3} label="Starts" value={ev.time ? `${ev.time}${ev.hours ? ` · ${ev.hours} h` : ''}` : 'Add time'} onClick={() => setSheet('when')} />
          <Fact icon={Users} label="Guests" value={ev.guests ? `${ev.guests} guests` : '—'} />
          <Fact icon={MapPin} label="Venue" value={place?.area ?? 'Add venue'} onClick={() => setSheet('place')} />
        </div>
        <div className="cx-zigzag bg-[#F7F4FB] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--ink-2)]">
          {!ready ? 'Add the date, start time and venue — then every price below is exact.' : loading ? 'Checking every master’s availability for your date…' : blocked.length ? `${plural(blocked.length, 'master')} can’t take this date — change or remove them.` : 'Every master below is free on your date.'}
        </div>
      </section>

      {/* The masters */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EEE8F6]">
        <h2 className="px-4 pt-4 text-[17px] font-black tracking-[-0.02em]">Your masters</h2>
        <ul>
          {res.map(({ line: l, q }, i) => (
            <li key={l.key} className={(i ? 'border-t border-[#F3F0F7] ' : '') + 'flex items-center gap-3 p-4'} data-checkout-line={l.tradeId} data-path={q?.path ?? ''}>
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] bg-[#F6F3FA]"><Photo src={l.cover} className="absolute inset-0 h-full w-full object-cover" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold">{l.name}</p>
                <p className="truncate text-[12px] font-semibold text-[var(--ink-3)]">{TRADE[l.tradeId]?.label}{l.hours ? ` · ${l.hours} h` : ''}{l.guests ? ` · ${l.guests} guests` : ''}</p>
                <p className="truncate text-[11.5px] font-bold">
                  {!ready ? <span className="text-[var(--ink-3)]">Price confirmed when the date is set</span>
                    : !q || q.loading ? <span className="text-[var(--ink-3)]">Checking…</span>
                      : q.path === 'INSTANT' ? <span className="text-[#0B7A4B]"><Zap size={11} className="mr-0.5 inline fill-[#F5B301] text-[#F5B301]" />Free on your date · confirms instantly</span>
                        : q.path === 'QUOTE' ? <span className="text-[#B45309]"><Clock3 size={11} className="mr-0.5 inline" />Master sends a price</span>
                          : <span className="text-[#C8112A]">{q.reasons_text?.[0] ?? 'Not available'}</span>}
                </p>
                <button type="button" onClick={() => { plan.toggleSaved({ ...l, reviews: null, distanceKm: null }); plan.remove(l.key) }} className="mt-0.5 text-[11.5px] font-bold text-[var(--ink-3)] underline-offset-2 hover:underline">Move to saved</button>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {hasQty(l) && (
                  <span className="flex items-center rounded-[11px] bg-[#3B1670] text-white">
                    <button type="button" onClick={() => plan.setQty(l.key, Math.max(1, (l.qty ?? 1) - 1))} className="px-2.5 py-1.5 text-[15px] font-black" aria-label="Fewer">−</button>
                    <span className="cx-num min-w-[18px] text-center text-[13px] font-black">{l.qty ?? 1}</span>
                    <button type="button" onClick={() => plan.setQty(l.key, (l.qty ?? 1) + 1)} className="px-2.5 py-1.5 text-[15px] font-black" aria-label="More">+</button>
                  </span>
                )}
                {q?.loading ? <Loader2 size={16} className="animate-spin text-[var(--ink-3)]" />
                  : q?.path === 'INSTANT' ? <span className="cx-num text-[15.5px] font-black">{rupees(q.customer_paise)}</span>
                    : q && ['NOT_ELIGIBLE', 'ERROR'].includes(q.path) ? <Link to={`/s/${l.tradeId}${l.occasionId ? `?o=${l.occasionId}` : ''}`} className="text-[12.5px] font-extrabold text-[#5B21A8]">Change</Link>
                      : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Often booked together */}
      {deals.length > 0 && (
        <Card title="Often booked together">
          <div className="cx-noscroll -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {deals.map(d => (
              <div key={d.t} className="w-[78%] max-w-[300px] shrink-0 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#F4EDFF] to-[#FDF0F7]" data-deal={d.t}>
                <div className="m-1.5 flex items-center gap-3 rounded-[14px] bg-white p-2.5">
                  <ArtFill art={serviceArt(d.t)} tone="#F6F1FF" className="h-14 w-14 shrink-0 rounded-[12px]" inset="8%" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{TRADE[d.t]?.label}</span><span className="line-clamp-2 block text-[11.5px] font-semibold text-[var(--ink-3)]">{d.hook}</span></span>
                  <Link to={`/s/${d.t}${occ ? `?o=${occ.id}` : ''}`} className="shrink-0 rounded-[10px] px-3.5 py-2 text-[13px] font-extrabold text-[#5B21A8] shadow-[inset_0_0_0_1.5px_#7C3AED]">ADD</Link>
                </div>
                <p className="flex items-center gap-1.5 px-3 pb-2 pt-0.5 text-[12px] font-bold text-[#5B21A8]"><Sparkles size={13} />Pairs perfectly with your {TRADE[d.with]?.label.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Offers — picked here, checked by the server, taken off the payment */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EEE8F6]" data-offers>
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 text-[17px] font-black tracking-[-0.02em]"><Ticket size={19} className="text-[#C026D3]" />Offers for you</h2>
          <Link to="/rewards" className="flex items-center text-[12.5px] font-extrabold text-[#5B21A8]">All<ChevronRight size={15} /></Link>
        </div>
        {offers.length ? (
          <div className="cx-noscroll flex gap-2.5 overflow-x-auto px-4 pb-1 pt-3">
            {offers.map(v => {
              const on = picked?.id === v.id
              const save = savingOf(v)
              return (
                <button key={v.id} type="button" onClick={() => setPickedId(on ? null : v.id)} aria-pressed={on} data-offer={v.code}
                  className={'cx-press relative w-[230px] shrink-0 overflow-hidden rounded-[18px] p-3.5 text-left transition ' + (on ? 'bg-gradient-to-br from-[#FFFFFF] via-[#F6F0FF] to-[#FFF1F8] text-[var(--ink)] shadow-[inset_0_0_0_2px_#7C3AED,0_14px_26px_-18px_rgba(91,33,168,.8)]' : 'bg-[#FBF8FF] text-[var(--ink)] shadow-[inset_0_0_0_1.5px_#E4D8F8]')}>
                  <span aria-hidden className={'absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white ' + (on ? 'shadow-[inset_0_0_0_2px_#7C3AED]' : 'shadow-[inset_0_0_0_1.5px_#E4D8F8]')} />
                  <span className="flex items-center justify-between">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ' + (on ? 'bg-[#5B21A8] text-white' : 'bg-[#F0E9FF] text-[#5B21A8]')}>{v.kind === 'welcome_pct' ? 'Welcome' : 'Referral'}</span>
                    <span className={'grid h-5 w-5 place-items-center rounded-full ' + (on ? 'bg-[#0E9F6E] text-white' : 'ring-[1.5px] ring-[#C9B5F5]')}>{on && <Check size={12} strokeWidth={3.4} />}</span>
                  </span>
                  <span className="mt-2 block text-[22px] font-black leading-none tracking-[-0.02em] text-[#3B1670]">{v.terms?.pct ?? 25}% off</span>
                  <span className="mt-1 block text-[11.5px] font-bold text-[var(--ink-3)]">Up to {rupees(v.terms?.cap_paise ?? 250000)}{daysLeft(v) != null ? ` · ${daysLeft(v)} days left` : ''}</span>
                  <span className="cx-code mt-2 block border-t border-dashed border-[#E4D8F8] pt-2 text-[11px] text-[#5B21A8]">{v.code}</span>
                  {save > 0 && <span className="mt-1 block text-[12px] font-black text-[#0B7A4B]">{on ? `Applied · you save ${rupees(save)}` : `Save ${rupees(save)}`}</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="px-4 pt-2 text-[12.5px] font-semibold text-[var(--ink-3)]">{user ? 'Your welcome offer appears here once it’s on your account.' : 'Sign in to collect your welcome offer — 25% off your first booking.'}</p>
        )}
        <div className="flex items-center gap-2 p-4 pt-3">
          <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCodeMsg('') }} placeholder="Have a code? SAMBRAMO…" maxLength={32}
            className="cx-num h-11 min-w-0 flex-1 rounded-[13px] bg-[#F7F4FB] px-3.5 text-[13.5px] font-extrabold tracking-[0.04em] outline-none ring-1 ring-[#E9E2F3] focus:ring-2 focus:ring-[#C4B5FD]" data-code-input />
          <button type="button" onClick={applyCode} disabled={!code.trim()} className="cx-press h-11 shrink-0 rounded-[13px] px-4 text-[13.5px] font-extrabold text-[#5B21A8] shadow-[inset_0_0_0_1.5px_#7C3AED] disabled:opacity-40">Apply</button>
        </div>
        {codeMsg && <p className="-mt-2 px-4 pb-3 text-[12px] font-bold text-[#9D174D]">{codeMsg}</p>}
      </section>

      {/* Payment schedule — the customer's choice when the booking allows it */}
      {instant.length > 0 && (
        <Card title="Payment schedule">
          {splittable ? (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" data-schedule>
              <Plan on={!full} onClick={() => setFull(false)} title={`Pay advance`} sub={`At least ${floorPct}% · confirms now`} amount={advNow} foot={grand - advNow > 0 ? `${rupees(grand - advNow)} by ${dueBy ? dueBy.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'the event'}` : null} />
              <Plan on={full} onClick={() => setFull(true)} title="Pay in full" sub="Nothing more to pay" amount={fullNow} badge="Recommended" />
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-[14px] bg-[#F7F4FB] px-3 py-2.5 text-[12.5px] font-semibold text-[var(--ink-2)]"><Lock size={15} className="mt-0.5 shrink-0 text-[#5B21A8]" />Paid in full today — bookings under {rupees(PAY_RULES.fullBelowPaise)}, and anything within {PAY_RULES.fullWithinDays} days of the event, are confirmed with one payment.</p>
          )}
        </Card>
      )}

      {/* The bill */}
      <Card title="Bill details">
        <BillRow icon={ReceiptText} label="Masters’ total" value={total ? rupees(total) : ready ? (loading ? '…' : '—') : 'After the date'} note={quoteLines.length ? `+ ${plural(quoteLines.length, 'quote')} to come` : null} />
        {saving > 0 && <BillRow icon={BadgePercent} label={`Offer · ${picked?.code}`} value={`− ${rupees(saving)}`} tone="save" />}
        <BillRow icon={Gift} label="Booking fee" value={<span className="rounded-[6px] bg-[#E7F8EF] px-1.5 py-0.5 text-[11.5px] font-black text-[#0B7A4B]">₹0</span>} note="No charges added at the end — ever" />
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-[#E6DFF0] pt-3">
          <span className="text-[16px] font-black">Grand total</span><span className="cx-num text-[17px] font-black">{total ? rupees(grand) : '—'}</span>
        </div>
        {instant.length > 0 && <div className="mt-1 flex items-center justify-between text-[13px] font-bold text-[var(--ink-2)]"><span>Pay now</span><span className="cx-num">{rupees(dueNow)}</span></div>}
        {balance > 0 && <div className="flex items-center justify-between text-[13px] font-bold text-[var(--ink-3)]"><span>Balance by {dueBy ? dueBy.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'the event'}</span><span className="cx-num">{rupees(balance)}</span></div>}
        {saving > 0 && <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#FFF4D6] to-[#FFE9F3] px-3 py-2.5 text-[13px] font-black text-[#7A3E00]" data-you-save>🎉 You save {rupees(saving)} on this booking</p>}
        <p className="mt-2 text-[11.5px] font-semibold text-[var(--ink-3)]">The price you see is final — nothing is added at the end.</p>
      </Card>

      {/* Escrow, live — the promise that makes people pay, one step at a time */}
      <EscrowLive pay={instant.length ? dueNow : 0} date={ev.date} masters={instant.length || lines.length} />

      {/* Instructions for masters */}
      <Card title="Instructions for your masters">
        <div className="grid grid-cols-2 gap-2">
          {TIPS.map(([id, label, emoji]) => (
            <button key={id} type="button" onClick={() => setTips(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id]))} aria-pressed={tips.includes(id)}
              className={'cx-press flex min-h-[64px] flex-col justify-between rounded-[16px] p-3 text-left transition ' + (tips.includes(id) ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-[#F8F6FB]')} data-tip={id}>
              <span className="flex items-center justify-between"><span className="text-[18px]">{emoji}</span><span className={'grid h-5 w-5 place-items-center rounded-[6px] ' + (tips.includes(id) ? 'bg-[#7C3AED] text-white' : 'ring-[1.5px] ring-[#7C3AED]/50')}>{tips.includes(id) && <Check size={12} strokeWidth={3.4} />}</span></span>
              <span className="text-[12.5px] font-bold leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Theme, colours, traditions, timings…"
          className="mt-2 w-full resize-none rounded-[14px] bg-[#F8F6FB] px-3.5 py-3 text-[13.5px] font-semibold outline-none focus:ring-2 focus:ring-[#C4B5FD]" />
      </Card>

      {/* Contact, someone else, GSTIN */}
      <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]">
        <label className="flex items-center gap-3">
          <Phone size={18} className="text-[#5B21A8]" />
          <span className="text-[14px] font-extrabold text-[var(--ink-3)]">+91</span>
          <input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your mobile — masters call this" className="cx-num min-w-0 flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:text-[var(--ink-3)]" data-phone />
          {phoneOk && <CheckCircle2 size={18} className="text-[#0B7A4B]" />}
        </label>
        <div className="mt-3 flex items-center justify-between border-t border-[#F3F0F7] pt-3">
          <span className="text-[14px] font-bold">{other.name ? `On-site: ${other.name}${other.phone ? ` · ${other.phone}` : ''}` : forWhom ? `For ${forWhom.name}` : 'Booking for someone else?'}</span>
          <button type="button" onClick={() => setSheet('other')} className="text-[13.5px] font-extrabold text-[#5B21A8]">{other.name ? 'Edit' : 'Add details'}</button>
        </div>
        <button type="button" onClick={() => setSheet('gst')} className="mt-3 flex w-full items-center justify-between border-t border-[#F3F0F7] pt-3 text-left">
          <span className="min-w-0"><span className="block text-[14px] font-bold">{gstin ? `GSTIN · ${gstin}` : 'Add GSTIN'}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">For company events — claim GST input credit</span></span>
          <ChevronRight size={18} className="text-[var(--ink-3)]" />
        </button>
      </section>

      {/* Cancellation — one line, folded; the ladder opens on a tap (Mohan: no verbose policy on the pay screen) */}
      <details className="group mx-3 mt-3 rounded-[20px] bg-white shadow-[0_0_0_1px_#EEE8F6]" data-checkout-policy>
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
          <ShieldCheck size={18} className="shrink-0 text-[#5B21A8]" />
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold">Cancellation policy</span><span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">Full refund until a master accepts</span></span>
          <ChevronRight size={18} className="shrink-0 text-[var(--ink-3)] transition group-open:rotate-90" />
        </summary>
        <div className="border-t border-[#F3F0F7] px-4 pb-4 pt-3">
          <ul className="space-y-1">
            {LADDER.map(r => (
              <li key={r.when} className="flex items-baseline justify-between gap-3 text-[12px] font-semibold"><span className="text-[var(--ink-2)]">{r.when}</span><span className="shrink-0 font-extrabold text-[var(--ink)]">{r.refund}</span></li>
            ))}
          </ul>
          <Link to="/legal/cancellation" className="mt-2 inline-flex items-center text-[12.5px] font-extrabold text-[#5B21A8]">View the full policy<ChevronRight size={14} /></Link>
        </div>
      </details>
      <p className="mx-4 mt-2 text-[11px] font-semibold text-[var(--ink-3)]">If a master cancels, you get everything back. By paying you agree to our <Link to="/legal/terms" className="font-extrabold text-[#5B21A8]">terms</Link>.</p>

      {/* Give back — the slot for a real NGO partner */}
      <section className="mx-3 mt-3 flex items-center gap-3 rounded-[24px] bg-gradient-to-r from-[#ECFDF5] to-[#FDF4FF] p-4">
        <span className="text-[28px]">🤝</span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-black text-[#0B4F2A]">Celebrate with a cause</span><span className="block text-[12px] font-semibold text-[#3C7A5A]">Share your joy — add a meal for a child with every celebration. Launching soon with our NGO partner.</span></span>
      </section>

      {alsoLike.length > 0 && (
        <Card title="You might also like">
          <div className="grid grid-cols-3 gap-2">
            {alsoLike.map(t => (
              <Link key={t} to={`/s/${t}?o=${occ.id}`} className="cx-press relative overflow-hidden rounded-[16px] bg-[#FBF9FD] p-2 shadow-[inset_0_0_0_1px_#EFEAF5]" data-also={t}>
                <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="aspect-square w-full rounded-[12px]" inset="8%" />
                <span className="mt-1.5 line-clamp-2 block text-[12px] font-extrabold leading-tight">{TRADE[t]?.label}</span>
                <span className="mt-1 inline-block rounded-[8px] px-2 py-0.5 text-[11px] font-extrabold text-[#5B21A8] shadow-[inset_0_0_0_1.5px_#7C3AED]">ADD</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* The bar: where, how you pay, and the one button */}
      <div className="fixed inset-x-0 bottom-0 z-[130] bg-white shadow-[0_-12px_26px_-18px_rgba(27,11,51,.55)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
        <button type="button" onClick={() => setSheet('place')} className="flex w-full items-center gap-3 border-b border-[#F3F0F7] bg-[#FBFAFD] px-4 py-2.5 text-left">
          <MapPin size={20} className="shrink-0 text-[#C026D3]" />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-extrabold">{place ? <>Celebrating at <b>{place.area}</b></> : 'Where is the celebration?'}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{place?.address ?? (place ? place.area : 'Add the venue to see exact prices')}</span></span>
          <span className="shrink-0 text-[13px] font-extrabold text-[#5B21A8]">{place ? 'Change' : 'Add'}</span>
        </button>
        <div className="flex items-center gap-3 px-4 pt-2.5">
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-1.5"><span className="cx-num text-[21px] font-black tracking-[-0.02em]">{instant.length ? rupees(dueNow) : '₹0'}</span>{saving > 0 && <s className="cx-num text-[12px] font-bold text-[var(--ink-3)]">{rupees(sum(billAt(full, null), 'charge'))}</s>}</span>
            <span className="block truncate text-[11px] font-extrabold text-[var(--ink-3)]">{instant.length ? (balance ? `Advance · ${rupees(balance)} later` : saving ? `You save ${rupees(saving)}` : 'Total · nothing more to pay') : 'Nothing to pay now'}</span>
          </span>
          <button type="button" disabled={!canPay} onClick={pay} className="cx-press cx-cta cx-pay flex h-[56px] min-w-[56%] items-center justify-center gap-2 rounded-[18px] px-5 text-[16px] font-extrabold disabled:opacity-60" data-pay>
            {phase === 'booking' || phase === 'paying' ? <><Loader2 size={18} className="animate-spin" />{phase === 'booking' ? 'Booking…' : 'Opening payment…'}</>
              : <><Lock size={17} />{!user ? 'Sign in to pay' : instant.length ? 'Pay securely' : 'Send requests'}<ChevronRight size={18} /></>}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 px-4 pt-1.5 text-[10.5px] font-bold text-[var(--ink-3)]">
          {!ready ? 'Add the date, time and venue to pay' : <><ShieldCheck size={12} className="text-[#0B7A4B]" />Secured by Razorpay · UPI · Cards · Netbanking · Wallets</>}
        </p>
      </div>

      <WhenSheet open={sheet === 'when'} onClose={() => setSheet(null)} date={ev.date} time={ev.time} hours={ev.hours} onPick={w => { plan.setEvent(w); setSheet(null) }} />
      <PlaceSheet open={sheet === 'place'} onClose={() => setSheet(null)} value={place} onPick={p => { plan.setPlace(p); setSheet(null) }} />
      <SignInSheet open={sheet === 'signin'} onClose={() => setSheet(null)} onDone={() => setSheet(null)} />
      <Sheet open={sheet === 'gst'} onClose={() => setSheet(null)} title="Add GSTIN"
        footer={<button type="button" onClick={() => setSheet(null)} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold">Save</button>}>
        <div className="space-y-2 pb-2">
          <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))} placeholder="15-character GSTIN" className="cx-num h-12 w-full rounded-[13px] bg-[#F8F7FB] px-3.5 text-[15px] font-extrabold tracking-[0.06em] outline-none ring-1 ring-[#E7E1F0]" />
          <p className="text-[12px] font-semibold text-[var(--ink-3)]">Masters raise their invoice on this GSTIN. {gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin) ? 'That doesn’t look like a valid GSTIN yet.' : ''}</p>
        </div>
      </Sheet>
      <Sheet open={sheet === 'other'} onClose={() => setSheet(null)} title="Booking for someone else?"
        footer={<button type="button" onClick={() => setSheet(null)} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold">Save</button>}>
        <div className="space-y-2 pb-2">
          <p className="text-[12.5px] font-semibold text-[var(--ink-2)]">A surprise, or you’re booking for family? Masters will coordinate with this person on the day.</p>
          <input value={other.name} onChange={e => setOther(x => ({ ...x, name: e.target.value }))} maxLength={80} placeholder="Their name" className="h-12 w-full rounded-[13px] bg-[#F8F7FB] px-3.5 text-[15px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
          <input value={other.phone} onChange={e => setOther(x => ({ ...x, phone: e.target.value }))} inputMode="tel" maxLength={16} placeholder="Their phone" className="h-12 w-full rounded-[13px] bg-[#F8F7FB] px-3.5 text-[15px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
        </div>
      </Sheet>
      {/* The server would not take the offer — the date is still held */}
      <Sheet open={phase === 'offer'} onClose={() => setPhase('unpaid')} title="Your offer wasn’t applied"
        footer={<div className="grid gap-2">
          <button type="button" onClick={() => { setPickedId(null); charge({ lineIds: outcome?.lineIds ?? [], sent: outcome?.sent ?? 0, failed: outcome?.failed ?? [] }) }} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold" data-pay-without>Pay without the offer</button>
          <button type="button" onClick={() => setPhase('unpaid')} className="h-11 w-full rounded-[16px] text-[13.5px] font-extrabold text-[#5B21A8]">Pay later from Plans</button>
        </div>}>
        <p className="pb-2 text-[14px] font-semibold leading-relaxed text-[var(--ink-2)]">{outcome?.error ?? 'This offer can’t be used on this booking.'} Your masters are holding the date.</p>
      </Sheet>
      <Sheet open={['done', 'unpaid', 'error'].includes(phase)} onClose={() => navigate('/plans')} title={phase === 'done' ? 'You are booked' : phase === 'unpaid' ? 'Booked — payment pending' : 'Something went wrong'}>
        <div className="pb-4">
          {phase === 'done' && <Journey flow={occ ? 'celebration' : 'service'} at={9} className="-mx-4 mb-2" />}
          {phase === 'done' && <CheckCircle2 size={44} className="text-[var(--ok)]" />}
          <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[var(--ink-2)]">
            {phase === 'done' && (outcome?.paid ? (outcome.confirmed ? `${plural(outcome.paid, 'master')} confirmed. They have been told and will call you before the day.` : `${plural(outcome.paid, 'master')} confirmed once Razorpay reports the payment — usually seconds.`) : '')}
            {phase === 'done' && outcome?.sent ? ` ${plural(outcome.sent, 'quote request')} sent; you will be notified when they reply.` : ''}
            {phase === 'unpaid' && 'Your masters are holding the date. Finish the payment from Plans to confirm them.'}
            {phase === 'error' && (outcome?.error ?? outcome?.failed?.[0]?.reasons?.[0] ?? 'Nothing was booked. Please try again.')}
          </p>
          {outcome?.failed?.length > 0 && phase !== 'error' && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">Not booked: {outcome.failed.map(f => f.name).join(', ')}.</p>}
          {phase === 'done' && occ && (
            <button type="button" onClick={() => navigate(`/invites/new?o=${occ.id}`)} className="cx-press mt-5 flex w-full items-center gap-3 rounded-[16px] bg-[#FDF0F6] p-3 text-left ring-1 ring-[#F5D0E4]" data-done-invite>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#DB2777]"><MailOpen size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold text-[var(--ink)]">Next: invite your guests</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Your first invitation is free — see who’s coming</span></span>
            </button>
          )}
          <button type="button" onClick={() => navigate('/plans')} className={'cx-press cx-cta h-12 w-full rounded-[16px] text-[14px] font-extrabold ' + (phase === 'done' && occ ? 'mt-2' : 'mt-5')} data-see-plans>See my plans</button>
        </div>
      </Sheet>
    </main>
  )
}

const TIPS = [['call', 'Call me before arriving', '📞'], ['surprise', 'It’s a surprise — don’t call the guest of honour', '🤫'], ['parking', 'Parking available at the venue', '🅿️'], ['elders', 'Elders at home — keep set-up quiet', '🙏']]
const TIP_TEXT = { call: 'Please call before arriving', surprise: 'It is a SURPRISE — do not contact the guest of honour', parking: 'Parking is available at the venue', elders: 'Elders at home — please keep set-up quiet' }

function Card({ title, children }) {
  return (
    <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE8F6]">
      {title && <h2 className="mb-3 text-[17px] font-black tracking-[-0.02em]">{title}</h2>}
      {children}
    </section>
  )
}

function Fact({ icon: Icon, label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag {...(onClick ? { type: 'button', onClick } : {})} className="flex items-center gap-2.5 bg-white px-4 py-3 text-left">
      <Icon size={17} className="shrink-0 text-[#7C3AED]" />
      <span className="min-w-0"><span className="block text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">{label}</span><span className="block truncate text-[13.5px] font-extrabold">{value}</span></span>
    </Tag>
  )
}

function Plan({ on, onClick, title, sub, amount, foot, badge }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={'cx-press relative flex flex-col rounded-[18px] p-3.5 text-left transition ' + (on ? 'bg-[#F6F0FF] shadow-[inset_0_0_0_2px_#5B21A8]' : 'bg-[#FBFAFD] shadow-[inset_0_0_0_1.5px_#ECE6F4]')} data-plan={title}>
      {badge && <span className="absolute -top-2 right-3 rounded-full bg-gradient-to-r from-[#0E9F6E] to-[#10B981] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-white">{badge}</span>}
      <span className="flex items-center gap-2"><span className={'grid h-[18px] w-[18px] place-items-center rounded-full ' + (on ? 'bg-[#5B21A8]' : 'ring-2 ring-[#C9B5F5]')}>{on && <span className="h-[7px] w-[7px] rounded-full bg-white" />}</span><span className="text-[14px] font-extrabold">{title}</span></span>
      <span className="cx-num mt-2 text-[19px] font-black tracking-[-0.02em]">{rupees(amount)}</span>
      <span className="text-[11.5px] font-bold text-[var(--ink-3)]">{sub}</span>
      {foot && <span className="mt-1 text-[11px] font-bold text-[#7A3E00]">{foot}</span>}
    </button>
  )
}

/* The escrow promise, live (Mohan, 2026-10-28): light, strong ink, real
   icons, and the five steps lighting up one after another — what happens
   to the money, in order, with the amount the customer is about to pay. */
function EscrowLive({ pay, date, masters }) {
  const [at, setAt] = useState(0)
  const reduce = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (reduce.current) { setAt(4); return }
    const t = setInterval(() => setAt(x => (x + 1) % 6), 1100)
    return () => clearInterval(t)
  }, [])
  const day = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'your date'
  const steps = [
    [CreditCard, pay ? `You pay ${rupees(pay)}` : 'You pay', 'UPI, card or netbanking — through Razorpay', 'Now'],
    [Lock, 'Held securely in escrow', 'Sambramo holds it. No master can touch it yet.', 'Instantly'],
    [BadgeCheck, `${masters > 1 ? 'Your masters are' : 'Your master is'} confirmed`, 'Told at once — they call you before the day', 'In seconds'],
    [PartyPopper, 'Your event happens', 'You celebrate; we stay on call', day],
    [HandCoins, 'Released to your masters', 'Only after the event is delivered', 'After the event'],
  ]
  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1.5px_#CDEFDC]" data-escrow>
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#E9FBF2] to-[#F4FDF8] px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#0E9F6E] text-white shadow-[0_8px_16px_-10px_rgba(14,159,110,.9)]"><ShieldCheck size={21} strokeWidth={2.4} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-black tracking-[-0.01em] text-[#064E3B]">Your payment is protected</span><span className="block text-[12px] font-bold text-[#047857]">Held in escrow until your event is delivered</span></span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-[10.5px] font-black uppercase tracking-[0.08em] text-[#047857] ring-1 ring-[#BFEBD5]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />Live</span>
      </div>
      <ol className="relative px-4 pb-3 pt-3">
        <span aria-hidden className="absolute bottom-7 left-[35px] top-7 w-[2px] rounded bg-[#E3F5EC]" />
        <span aria-hidden className="absolute left-[35px] top-7 w-[2px] rounded bg-gradient-to-b from-[#10B981] to-[#0E9F6E] transition-all duration-700 ease-out" style={{ height: `calc((100% - 56px) * ${Math.min(at, 4) / 4})` }} />
        {steps.map(([Icon, title, sub, when], i) => {
          const done = i < at, now = i === Math.min(at, 4)
          return (
            <li key={title} className="relative flex items-center gap-3 py-2" data-escrow-step={i}>
              <span className={'relative z-[1] grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-all duration-500 ' + (done ? 'bg-[#0E9F6E] text-white' : now ? 'bg-white text-[#0E9F6E] shadow-[0_0_0_2px_#10B981,0_0_0_7px_rgba(16,185,129,.16)]' : 'bg-[#F3F8F5] text-[#9BB3A6]')}>
                {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} strokeWidth={2.3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={'block text-[14px] font-extrabold transition-colors duration-500 ' + (done || now ? 'text-[#0F2A1E]' : 'text-[#7C8E84]')}>{title}</span>
                <span className="block truncate text-[11.5px] font-semibold text-[#5E7268]">{sub}</span>
              </span>
              <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold transition-colors duration-500 ' + (now ? 'bg-[#0E9F6E] text-white' : done ? 'bg-[#E7F8EF] text-[#047857]' : 'bg-[#F3F8F5] text-[#7C8E84]')}>{when}</span>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-[#EAF6EF] px-4 py-2.5 text-[11.5px] font-bold text-[#3F5A4C]">If a master cancels, every rupee comes back to you.</p>
    </section>
  )
}

function BillRow({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={16} className={'mt-0.5 shrink-0 ' + (tone === 'save' ? 'text-[#0B7A4B]' : 'text-[var(--ink-2)]')} />
      <span className="min-w-0 flex-1"><span className={'block text-[13.5px] font-semibold ' + (tone === 'save' ? 'text-[#0B7A4B]' : 'text-[var(--ink)]')}>{label}</span>{note && <span className="block text-[11px] font-semibold text-[var(--ink-3)]">{note}</span>}</span>
      <span className={'cx-num shrink-0 text-[13.5px] font-bold ' + (tone === 'save' ? 'text-[#0B7A4B]' : '')}>{value}</span>
    </div>
  )
}
