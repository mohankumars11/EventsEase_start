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
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgePercent, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Loader2, Lock, MailOpen, MapPin, PartyPopper, Phone, ReceiptText, Share2, Sparkles, Zap } from 'lucide-react'
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
import { myVouchers, usable } from '../lib/rewards'
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
  const dueNow = instant.reduce((s, r) => s + (Number(r.q.advance_paise) || Number(r.q.customer_paise) || 0), 0)
  const total = instant.reduce((s, r) => s + (Number(r.q.customer_paise) || 0), 0)
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
    const p = await payLines({ lineIds, part: 'advance', description: occ ? `${occ.name} · ${plural(lineIds.length, 'master')}` : `Sambramo · ${plural(lineIds.length, 'master')}` })
    const confirmed = await confirmPaid(p)
    setOutcome({ paid: lineIds.length, sent, failed, error: p.error ?? null, confirmed: !!confirmed?.ok })
    setPhase(p.ok ? 'done' : p.dismissed ? 'unpaid' : 'error')
  }

  /* ── The screen (Mohan, 2026-10-28: Blinkit's checkout, for events) ── */
  const have = lines.map(l => l.tradeId)
  const deals = [...new Map(lines.flatMap(l => companions(l.tradeId, have).map(([t, hook]) => [t, { t, hook, with: l.tradeId }]))).values()].slice(0, 6)
  const alsoLike = occ ? needsFor(occ, plan.picks[occ.id] ?? {}, ev).rows.filter(r => !have.includes(r.tradeId) && r.state !== 'skip' && !deals.some(d => d.t === r.tradeId)).slice(0, 6).map(r => r.tradeId) : []
  const welcome = vouchers.find(v => v.kind === 'welcome_pct' && usable(v))
  const balance = Math.max(0, total - dueNow)
  const forWhom = place?.for ?? savedWhere()?.for ?? null
  async function shareCheckout() {
    const text = `${occ ? `${occ.name} on Sambramo` : 'My Sambramo plan'}${ev.date ? ` · ${whenLabel(ev.date, ev.time)}` : ''}\n${lines.map(l => `• ${TRADE[l.tradeId]?.label}: ${l.name}`).join('\n')}${total ? `\nTotal ${rupees(total)}` : ''}`
    if (navigator.share) { try { await navigator.share({ title: 'Our celebration plan', text }) } catch { /* dismissed */ } } else { try { await navigator.clipboard.writeText(text) } catch { /* off */ } }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#F3F4F8] pb-[calc(env(safe-area-inset-bottom,0px)+170px)]" data-checkout>
      <header className="cx-safe-top sticky top-0 z-[120] flex items-center gap-2 bg-white px-3 pb-2.5 shadow-[0_6px_14px_-12px_rgba(20,15,31,.5)]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press grid h-11 w-11 place-items-center rounded-full shadow-[0_0_0_1px_#E7E3EE]"><ArrowLeft size={20} /></button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-extrabold">Checkout</p>
        <button type="button" onClick={shareCheckout} className="cx-press flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold shadow-[0_0_0_1px_#E7E3EE]" data-share-plan><Share2 size={16} />Share</button>
      </header>

      {/* Special deals: what people add with what you picked */}
      {deals.length > 0 && (
        <Card title="Often booked together">
          <div className="cx-noscroll -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {deals.map(d => (
              <div key={d.t} className="w-[78%] max-w-[300px] shrink-0 overflow-hidden rounded-[18px] bg-[#F3ECFF]" data-deal={d.t}>
                <div className="m-1.5 flex items-center gap-3 rounded-[14px] bg-white p-2.5">
                  <ArtFill art={serviceArt(d.t)} tone="#F6F1FF" className="h-14 w-14 shrink-0 rounded-[12px]" inset="8%" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{TRADE[d.t]?.label}</span><span className="line-clamp-2 block text-[11.5px] font-semibold text-[var(--ink-3)]">{d.hook}</span></span>
                  <Link to={`/s/${d.t}${occ ? `?o=${occ.id}` : ''}`} className="shrink-0 rounded-[10px] px-3.5 py-2 text-[13px] font-extrabold text-[#5B21B6] shadow-[inset_0_0_0_1.5px_#7C3AED]">ADD</Link>
                </div>
                <p className="flex items-center gap-1.5 px-3 pb-2 pt-0.5 text-[12px] font-bold text-[#5B21B6]"><Sparkles size={13} />Pairs perfectly with your {TRADE[d.with]?.label.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* The event and its masters */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[22px] bg-white">
        <div className="flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#F3ECFF] text-[#7C3AED]"><PartyPopper size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-black tracking-[-0.02em]">{instant.length && !quoteLines.length ? 'Confirmed the moment you pay' : occ ? occ.name : 'Your masters'}</span>
            <span className="block truncate text-[12.5px] font-semibold text-[var(--ink-3)]">{plural(lines.length, 'master')}{ev.date ? ` · ${whenLabel(ev.date, ev.time)}` : ''}</span>
          </span>
          <button type="button" onClick={() => setSheet('when')} className="shrink-0 text-[13px] font-extrabold text-[#5B21B6]">{ev.date ? 'Change' : 'Add date'}</button>
        </div>
        <div className="cx-zigzag bg-[#F6F3FA] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--ink-2)]">
          {!ready ? 'Add the date, start time and venue — then every price below is exact.' : loading ? 'Checking every master’s availability for your date…' : blocked.length ? `${plural(blocked.length, 'master')} can’t take this date — change or remove them.` : 'Every master below is free on your date.'}
        </div>
        <ul>
          {res.map(({ line: l, q }, i) => (
            <li key={l.key} className={(i ? 'border-t border-[#F1EFF5] ' : '') + 'flex items-center gap-3 p-4'} data-checkout-line={l.tradeId} data-path={q?.path ?? ''}>
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#F6F3FA]"><Photo src={l.cover} className="absolute inset-0 h-full w-full object-cover" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold">{l.name}</p>
                <p className="truncate text-[12px] font-semibold text-[var(--ink-3)]">{TRADE[l.tradeId]?.label}{l.hours ? ` · ${l.hours} h` : ''}{l.guests ? ` · ${l.guests} guests` : ''}</p>
                <p className="truncate text-[11.5px] font-bold">
                  {!ready ? <span className="text-[var(--ink-3)]">Price confirmed when the date is set</span>
                    : !q || q.loading ? <span className="text-[var(--ink-3)]">Checking…</span>
                      : q.path === 'INSTANT' ? <span className="text-[#0B6B3D]"><Zap size={11} className="mr-0.5 inline fill-[#F5B301] text-[#F5B301]" />Confirms instantly{q.advance_paise && q.advance_paise < q.customer_paise ? ` · ${rupees(q.advance_paise)} now` : ''}</span>
                        : q.path === 'QUOTE' ? <span className="text-[#B45309]"><Clock3 size={11} className="mr-0.5 inline" />Master sends a price</span>
                          : <span className="text-[#C8112A]">{q.reasons_text?.[0] ?? 'Not available'}</span>}
                </p>
                <button type="button" onClick={() => { plan.toggleSaved({ ...l, reviews: null, distanceKm: null }); plan.remove(l.key) }} className="mt-0.5 text-[11.5px] font-bold text-[var(--ink-3)] underline-offset-2 hover:underline">Move to saved</button>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {hasQty(l) && (
                  <span className="flex items-center rounded-[10px] bg-[#5B21B6] text-white">
                    <button type="button" onClick={() => plan.setQty(l.key, Math.max(1, (l.qty ?? 1) - 1))} className="px-2.5 py-1.5 text-[15px] font-black" aria-label="Fewer">−</button>
                    <span className="cx-num min-w-[18px] text-center text-[13px] font-black">{l.qty ?? 1}</span>
                    <button type="button" onClick={() => plan.setQty(l.key, (l.qty ?? 1) + 1)} className="px-2.5 py-1.5 text-[15px] font-black" aria-label="More">+</button>
                  </span>
                )}
                {q?.loading ? <Loader2 size={16} className="animate-spin text-[var(--ink-3)]" />
                  : q?.path === 'INSTANT' ? <span className="cx-num text-[15px] font-black">{rupees(q.customer_paise)}</span>
                    : q && ['NOT_ELIGIBLE', 'ERROR'].includes(q.path) ? <Link to={`/s/${l.tradeId}${l.occasionId ? `?o=${l.occasionId}` : ''}`} className="text-[12.5px] font-extrabold text-[#5B21B6]">Change</Link>
                      : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {alsoLike.length > 0 && (
        <Card title="You might also like">
          <div className="grid grid-cols-3 gap-2">
            {alsoLike.map(t => (
              <Link key={t} to={`/s/${t}?o=${occ.id}`} className="cx-press relative overflow-hidden rounded-[16px] bg-[#FBF9FD] p-2 shadow-[inset_0_0_0_1px_#EFEAF5]" data-also={t}>
                <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="aspect-square w-full rounded-[12px]" inset="8%" />
                <span className="mt-1.5 line-clamp-2 block text-[12px] font-extrabold leading-tight">{TRADE[t]?.label}</span>
                <span className="mt-1 inline-block rounded-[8px] px-2 py-0.5 text-[11px] font-extrabold text-[#5B21B6] shadow-[inset_0_0_0_1.5px_#7C3AED]">ADD</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Coupons */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[22px] bg-white">
        {welcome ? (
          <div className="flex items-center gap-3 bg-[#F0F5FF] p-4" data-coupon={welcome.code}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1D4ED8] text-white"><BadgePercent size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold text-[#1D4ED8]">Your 25% welcome voucher is saved</span><span className="block truncate text-[12px] font-semibold text-[var(--ink-2)]">{welcome.code} · up to ₹1,500 on your first booking</span></span>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4"><BadgePercent size={20} className="text-[#1D4ED8]" /><span className="text-[13.5px] font-bold text-[var(--ink-2)]">Sign in to collect your welcome vouchers</span></div>
        )}
        <Link to="/rewards" className="flex items-center justify-center gap-1 border-t border-[#F1EFF5] py-3 text-[13.5px] font-bold text-[var(--ink-2)]">See all coupons<ChevronRight size={15} /></Link>
      </section>

      {/* Bill details */}
      <Card title="Bill details">
        <BillRow icon={ReceiptText} label="Masters’ total" value={total ? rupees(total) : ready ? (loading ? '…' : '—') : 'After the date'} note={quoteLines.length ? `+ ${plural(quoteLines.length, 'quote')} to come` : null} />
        <BillRow icon={Lock} label="Pay now" value={instant.length ? rupees(dueNow) : '—'} note={balance ? 'advance — confirms your masters' : null} />
        {balance > 0 && <BillRow icon={CalendarDays} label="Balance before the event" value={rupees(balance)} />}
        <div className="mt-2 flex items-center justify-between border-t border-[#F1EFF5] pt-3">
          <span className="text-[16px] font-black">Grand total</span><span className="cx-num text-[16px] font-black">{total ? rupees(total) : '—'}</span>
        </div>
        <p className="mt-1 text-[11.5px] font-semibold text-[var(--ink-3)]">Includes taxes and the platform fee. Held safely until each master delivers.</p>
      </Card>

      {/* GSTIN */}
      <button type="button" onClick={() => setSheet('gst')} className="cx-press mx-3 mt-3 flex w-[calc(100%-24px)] items-center gap-3 rounded-[22px] bg-white p-4 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#EEF4FF] text-[#1D4ED8]"><BadgePercent size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold">{gstin ? `GSTIN · ${gstin}` : 'Add GSTIN'}</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">For company events — claim GST input credit</span></span>
        <ChevronRight size={18} className="text-[var(--ink-3)]" />
      </button>

      {/* Instructions for masters */}
      <Card title="Instructions for your masters">
        <div className="grid grid-cols-2 gap-2">
          {TIPS.map(([id, label, emoji]) => (
            <button key={id} type="button" onClick={() => setTips(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id]))} aria-pressed={tips.includes(id)}
              className={'cx-press flex min-h-[64px] flex-col justify-between rounded-[16px] p-3 text-left transition ' + (tips.includes(id) ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-[#F8F7FB]')} data-tip={id}>
              <span className="flex items-center justify-between"><span className="text-[18px]">{emoji}</span><span className={'grid h-5 w-5 place-items-center rounded-[6px] ' + (tips.includes(id) ? 'bg-[#7C3AED] text-white' : 'ring-[1.5px] ring-[#7C3AED]/50')}>{tips.includes(id) && <Check size={12} strokeWidth={3.4} />}</span></span>
              <span className="text-[12.5px] font-bold leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Theme, colours, traditions, timings…"
          className="mt-2 w-full resize-none rounded-[14px] bg-[#F8F7FB] px-3.5 py-3 text-[13.5px] font-semibold outline-none focus:ring-2 focus:ring-[#C4B5FD]" />
      </Card>

      {/* Contact, and booking for someone else */}
      <section className="mx-3 mt-3 rounded-[22px] bg-white p-4">
        <label className="flex items-center gap-3">
          <Phone size={18} className="text-[#5B21B6]" />
          <span className="text-[14px] font-extrabold text-[var(--ink-3)]">+91</span>
          <input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your mobile — masters call this" className="cx-num min-w-0 flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:text-[var(--ink-3)]" data-phone />
        </label>
        <div className="mt-3 flex items-center justify-between border-t border-[#F1EFF5] pt-3">
          <span className="text-[14px] font-bold">{other.name ? `On-site: ${other.name}${other.phone ? ` · ${other.phone}` : ''}` : forWhom ? `For ${forWhom.name}` : 'Booking for someone else?'}</span>
          <button type="button" onClick={() => setSheet('other')} className="text-[13.5px] font-extrabold text-[#5B21B6]">{other.name ? 'Edit' : 'Add details'}</button>
        </div>
      </section>

      {/* Give back — the slot for a real NGO partner */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[22px] bg-white">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#ECFDF5] to-[#EFF6FF] p-4">
          <span className="text-[28px]">🤝</span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-black text-[#0B4F2A]">Celebrate with a cause</span><span className="block text-[12px] font-semibold text-[#3C7A5A]">Share your joy — add a meal for a child with every celebration. Launching soon with our NGO partner.</span></span>
        </div>
      </section>

      {/* Cancellation, in short */}
      <section className="mx-3 mt-3 rounded-[22px] bg-white p-4" data-checkout-policy>
        <p className="text-[14.5px] font-extrabold">Cancellation policy</p>
        <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-[var(--ink-2)]">Free until a master accepts. After that, what comes back depends on how close your event is — more if you take Sambramo credit. If a master cancels, you get everything back.</p>
        <Link to="/legal/cancellation" className="mt-1.5 inline-flex items-center text-[12.5px] font-extrabold text-[#5B21B6]">Read the full policy<ChevronRight size={14} /></Link>
        <p className="mt-2 text-[11px] font-semibold text-[var(--ink-3)]">By paying you agree to our <Link to="/legal/terms" className="font-extrabold text-[#5B21B6]">terms</Link>.</p>
      </section>

      {/* The bar: where, how you pay, and the one button */}
      <div className="fixed inset-x-0 bottom-0 z-[130] bg-white shadow-[0_-10px_24px_-18px_rgba(20,15,31,.6)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
        <button type="button" onClick={() => setSheet('place')} className="flex w-full items-center gap-3 border-b border-[#F1EFF5] bg-[#FBFAFD] px-4 py-2.5 text-left">
          <MapPin size={20} className="shrink-0 text-[#DB2777]" />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-extrabold">{place ? <>Celebrating at <b>{place.area}</b></> : 'Where is the celebration?'}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{place?.address ?? (place ? place.area : 'Add the venue to see exact prices')}</span></span>
          <span className="shrink-0 text-[13px] font-extrabold text-[#5B21B6]">{place ? 'Change' : 'Add'}</span>
        </button>
        <div className="flex items-center gap-3 px-4 pt-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">Pay using</span>
            <span className="block truncate text-[13.5px] font-extrabold">UPI · cards · netbanking</span>
          </span>
          <button type="button" disabled={!canPay} onClick={pay} className="cx-press cx-cta flex h-[56px] min-w-[62%] items-center justify-between gap-2 rounded-[16px] px-4 disabled:opacity-60" data-pay>
            {phase === 'booking' || phase === 'paying' ? <span className="flex w-full items-center justify-center gap-2 text-[15px] font-extrabold"><Loader2 size={18} className="animate-spin" />{phase === 'booking' ? 'Booking…' : 'Opening payment…'}</span> : (
              <>
                <span className="text-left leading-tight"><span className="cx-num block text-[16px] font-black">{instant.length ? rupees(dueNow) : '₹0'}</span><span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/80">{instant.length ? (balance ? 'Pay now' : 'Total') : 'Nothing now'}</span></span>
                <span className="flex items-center gap-1 text-[16px] font-extrabold">{!user ? 'Sign in' : instant.length ? 'Pay & confirm' : 'Send requests'}<ChevronRight size={18} /></span>
              </>
            )}
          </button>
        </div>
        {!ready && <p className="px-4 pt-1.5 text-center text-[11px] font-bold text-[var(--ink-3)]">Add the date, time and venue to pay</p>}
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
    <section className="mx-3 mt-3 rounded-[22px] bg-white p-4">
      {title && <h2 className="mb-3 text-[18px] font-black tracking-[-0.02em]">{title}</h2>}
      {children}
    </section>
  )
}

function BillRow({ icon: Icon, label, value, note }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-[var(--ink-2)]" />
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-[var(--ink)]">{label}</span>{note && <span className="block text-[11px] font-semibold text-[var(--ink-3)]">{note}</span>}</span>
      <span className="cx-num shrink-0 text-[13.5px] font-bold">{value}</span>
    </div>
  )
}
