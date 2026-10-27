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
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Loader2, Lock, MailOpen, MapPin, Phone, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { payLines } from '../../lib/payLines'
import { enableAlerts } from '../../lib/push'
import { usePlan } from '../state/PlanContext'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { plural, rupees, whenLabel } from '../lib/format'
import { previewLine, bookLine } from '../lib/booking'
import { partnersFor } from '../lib/market'
import { confirmPaid } from '../lib/bookings'
import { ActionBar, BackHeader, Photo, Sheet, Journey } from '../ui/kit'
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
        const said = [wants && `Needs: ${wants}`, note.trim()].filter(Boolean).join(' | ')
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

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+170px)]">
      <BackHeader title="Checkout" sub={`${plural(lines.length, 'master')}${occ ? ` · ${occ.name}` : ''}`} />
      <Journey flow={occ ? 'celebration' : 'service'} at={occ ? 4 : 3} />

      <Block title="When & where">
        <Row icon={CalendarDays} onClick={() => setSheet('when')} value={ev.date ? whenLabel(ev.date, ev.time) + (ev.hours ? ` · ${ev.hours} h` : '') : null} placeholder="Pick the day and start time" />
        <Row icon={MapPin} onClick={() => setSheet('place')} value={place ? `${place.area}${place.address ? ` · ${place.address}` : ''}` : null} placeholder="Where is the event?" />
      </Block>

      <Block title="Who masters should call">
        <label className="flex items-center gap-3 rounded-[16px] bg-[var(--am-50)] px-4 py-3.5 ring-1 ring-[var(--am-200)]">
          <Phone size={19} className="text-[var(--brand)]" />
          <span className="text-[15px] font-extrabold text-[var(--ink-3)]">+91</span>
          <input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" className="cx-num flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:text-[var(--ink-3)]" data-phone />
        </label>
      </Block>

      <Block title={ready ? (loading ? 'Getting exact prices…' : 'Your exact total') : 'Your masters'}>
        <ul className="overflow-hidden rounded-[22px] shadow-[0_0_0_1px_var(--line)]">
          {res.map(({ line: l, q }, i) => (
            <li key={l.key} className={(i ? 'border-t border-[var(--line)] ' : '') + 'flex items-center gap-3 bg-white p-3'} data-checkout-line={l.tradeId} data-path={q?.path ?? ''}>
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[var(--am-100)]"><Photo src={l.cover} className="absolute inset-0 h-full w-full object-cover" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold">{l.name}</p>
                <p className="truncate text-[12px] font-bold text-[var(--ink-3)]">
                  {!ready ? TRADE[l.tradeId]?.label
                    : !q || q.loading ? 'Checking availability…'
                      : q.path === 'INSTANT' ? <span className="text-[#946200]"><Zap size={11} className="mr-0.5 inline fill-[var(--gold)] text-[var(--gold)]" />Confirms now{q.advance_paise && q.advance_paise < q.customer_paise ? ` · ${rupees(q.advance_paise)} now` : ''}</span>
                        : q.path === 'QUOTE' ? <span><Clock3 size={11} className="mr-0.5 inline" />Master prices it · {q.reasons_text?.[0] ?? 'custom request'}</span>
                          : <span className="text-[#C8112A]">{q.reasons_text?.[0] ?? 'Not available'}</span>}
                </p>
              </div>
              <span className="shrink-0 text-right">
                {q?.loading ? <Loader2 size={16} className="animate-spin text-[var(--ink-3)]" />
                  : q?.path === 'INSTANT' ? <span className="cx-num text-[14.5px] font-extrabold">{rupees(q.customer_paise)}</span>
                    : q && ['NOT_ELIGIBLE', 'ERROR'].includes(q.path) ? <Link to={`/s/${l.tradeId}${l.occasionId ? `?o=${l.occasionId}` : ''}`} className="text-[12.5px] font-extrabold text-[var(--brand)]">Change</Link>
                      : null}
              </span>
            </li>
          ))}
        </ul>
        {blocked.length > 0 && (
          <p className="mt-2 flex items-start gap-2 rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#9B1A2A]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />{plural(blocked.length, 'master')} cannot take this booking. Change them, or continue without.
          </p>
        )}
      </Block>

      <Block title="What happens next">
        {instant.length > 0 && <Step icon={Zap} gold title={`${plural(instant.length, 'master')} confirm the moment you pay`} body={`${instant.map(r => TRADE[r.line.tradeId]?.label).join(', ')}. One payment, held in escrow until each delivers.`} />}
        {quoteLines.length > 0 && <Step icon={Clock3} title={`${plural(quoteLines.length, 'master')} send you a quote`} body={`${quoteLines.map(r => TRADE[r.line.tradeId]?.label).join(', ')}. Compare and accept in Plans; you pay only then.`} />}
        <Step icon={ShieldCheck} title="Safe if plans change" body="Each master’s own cancellation terms apply, shown on their page." />
      </Block>

      <Block title="Anything masters should know?">
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Theme, colours, traditions, timings…"
          className="w-full resize-none rounded-[16px] bg-[var(--am-50)] px-4 py-3.5 text-[14px] font-semibold outline-none ring-1 ring-[var(--am-200)] placeholder:text-[var(--ink-3)]" />
      </Block>

      <ActionBar note={!ready ? 'Add the time and place to see the exact total' : user ? 'Razorpay · UPI, cards, netbanking' : 'You sign in with your email before paying'}>
        <div className="mb-2 flex items-end justify-between px-1">
          <span className="text-[13px] font-bold text-[var(--ink-2)]">{instant.length ? <>Pay now{total > dueNow ? <span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">of {rupees(total)} total</span> : null}</> : 'Nothing to pay now'}</span>
          <span className="cx-num text-[24px] font-extrabold tracking-[-0.03em]">{instant.length ? rupees(dueNow) : '—'}</span>
        </div>
        <button type="button" disabled={!canPay} onClick={pay} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-pay>
          {phase === 'booking' ? <><Loader2 size={18} className="animate-spin" />Booking your masters…</>
            : phase === 'paying' ? <><Loader2 size={18} className="animate-spin" />Opening payment…</>
              : <><Lock size={17} />{!user ? 'Sign in & confirm' : instant.length ? `Confirm & pay ${rupees(dueNow) ?? ''}` : 'Send requests'}</>}
        </button>
      </ActionBar>

      <WhenSheet open={sheet === 'when'} onClose={() => setSheet(null)} date={ev.date} time={ev.time} hours={ev.hours} onPick={w => { plan.setEvent(w); setSheet(null) }} />
      <PlaceSheet open={sheet === 'place'} onClose={() => setSheet(null)} value={place} onPick={p => { plan.setPlace(p); setSheet(null) }} />
      <SignInSheet open={sheet === 'signin'} onClose={() => setSheet(null)} onDone={() => setSheet(null)} />
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
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold text-[var(--ink)]">Next: invite your guests</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">WhatsApp invites with RSVP — see who’s coming</span></span>
            </button>
          )}
          <button type="button" onClick={() => navigate('/plans')} className={'cx-press cx-cta h-12 w-full rounded-[16px] text-[14px] font-extrabold ' + (phase === 'done' && occ ? 'mt-2' : 'mt-5')} data-see-plans>See my plans</button>
        </div>
      </Sheet>
    </main>
  )
}

function Block({ title, children }) {
  return (
    <section className="mx-4 mt-5">
      <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{title}</h2>
      {children}
    </section>
  )
}

function Row({ icon: Icon, value, placeholder, onClick }) {
  return (
    <button type="button" onClick={onClick} className="cx-press mb-2 flex w-full items-center gap-3 rounded-[16px] bg-[var(--am-50)] px-4 py-3.5 text-left ring-1 ring-[var(--am-200)]">
      <Icon size={19} className="shrink-0 text-[var(--brand)]" />
      <span className={'min-w-0 flex-1 truncate text-[14.5px] font-extrabold ' + (value ? '' : 'text-[var(--brand)]')}>{value ?? placeholder}</span>
      <span className="text-[12.5px] font-extrabold text-[var(--brand)]">{value ? 'Change' : 'Add'}</span>
    </button>
  )
}

function Step({ icon: Icon, title, body, gold = false }) {
  return (
    <div className="flex gap-3 border-b border-[var(--line)] py-3 last:border-0">
      <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ' + (gold ? 'bg-[#FFF4DA]' : 'bg-[var(--am-100)]')}>
        <Icon size={18} className={gold ? 'fill-[var(--gold)] text-[#B87A00]' : 'text-[var(--brand)]'} />
      </span>
      <div>
        <p className="text-[14px] font-extrabold tracking-[-0.01em]">{title}</p>
        <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-[var(--ink-2)]">{body}</p>
      </div>
    </div>
  )
}
