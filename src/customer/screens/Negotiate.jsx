/**
 * Make an offer.
 *
 * Structured rather than a blank chat, because a partner decides on two
 * things — the number, and whether the reason makes it worth it to them
 * (a weekday, payment in full, several services in one booking). The
 * chips put those reasons one tap away; the message stays optional.
 *
 * Sending goes through the booking engine with `negotiate` (lib/booking
 * sendOffer → api/anchor?op=book): it always becomes a quote request to
 * that partner, with the offer, the reasons and the note at the top of
 * their inbox. Their reply lands in Plans, where it is accepted
 * (api/accept-custom-quote) and paid like any booking. The offer itself
 * is never a price anyone can pay — only the partner's quote is.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, HandCoins, Loader2, MapPin, Minus, Plus, Send } from 'lucide-react'
import { TRADE } from '../data/trades'
import { partnersFor } from '../lib/market'
import { rupees, whenLabel } from '../lib/format'
import { sendOffer } from '../lib/booking'
import { useAuth } from '../../context/AuthContext'
import { enableAlerts } from '../../lib/push'
import { usePlan } from '../state/PlanContext'
import { OCCASION } from '../data/occasions'
import SignInSheet from './SignInSheet'
import WhenSheet from './WhenSheet'
import PlaceSheet from './PlaceSheet'
import { ActionBar, BackHeader, Photo, RatingChip, Sheet } from '../ui/kit'

const REASONS = ['Booking several services', 'Weekday event', 'Paying in full now', 'Flexible on date', 'Fewer guests than usual', 'Repeat customer']

export default function Negotiate() {
  const { serviceId } = useParams()
  const [q] = useSearchParams()
  const tradeId = q.get('t')
  const t = TRADE[tradeId]
  const [p, setP] = useState(null)
  const [offer, setOffer] = useState(null)
  const [reasons, setReasons] = useState([])
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sheet, setSheet] = useState(null)
  const { user, profile } = useAuth()
  const plan = usePlan()
  const navigate = useNavigate()
  const occasion = OCCASION[q.get('o')] ?? null
  const ev = occasion && plan.event.occasionId === occasion.id ? plan.event : { ...plan.event, guests: plan.event.guests ?? 50 }
  const place = plan.place
  const ready = !!(ev.date && ev.time && place?.lat)

  async function send() {
    if (!user) { setSheet('signin'); return }
    if (!ev.date || !ev.time) { setSheet('when'); return }
    if (!place?.lat) { setSheet('place'); return }
    setBusy(true); setErr('')
    try {
      const line = { serviceId, tradeId, fromRef: p.fromRef, fromKind: p.fromKind, fromUnit: p.fromUnit, fromLabel: p.fromLabel, qty: null }
      const r = await sendOffer(line, ev, place, { offer_paise: offer, reasons, message: msg.trim() || undefined },
        { venue: { address: place.address, area: place.area, city: 'Bengaluru' } })
      if (!r?.quoteRequestId) throw new Error(r?.reasons_text?.[0] ?? r?.error ?? 'The master cannot take this request.')
      plan.recordBookings([{ key: `offer:${serviceId}:${Date.now()}`, tradeId, serviceId, name: p.name, cover: p.cover, occasionId: occasion?.id ?? null,
        path: 'QUOTE', quoteRequestId: r.quoteRequestId, bookingRequestId: r.bookingRequestId, offerPaise: offer, at: Date.now() }])
      if (profile?.id) enableAlerts({ profileId: profile.id, app: 'customer' }).catch(() => {})
      setSent({ hours: r.respondWithinHours ?? p.quoteHours ?? 4 })
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  useEffect(() => {
    partnersFor(tradeId).then(l => {
      const x = l.find(y => y.serviceId === serviceId)
      setP(x ?? null)
      if (x?.fromPaise) setOffer(Math.round((x.fromPaise * 0.9) / 10000) * 10000)
    }).catch(() => setP(null))
  }, [serviceId, tradeId])

  const base = p?.fromPaise ?? 0
  const pct = useMemo(() => (base && offer ? Math.round((1 - offer / base) * 100) : 0), [base, offer])
  const stepPaise = base > 5000000 ? 500000 : base > 1000000 ? 100000 : 10000

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+130px)]">
      <BackHeader title="Make an offer" sub={t?.label} />
      {p && (
        <section className="mx-4 mt-1 flex items-center gap-3 rounded-[22px] bg-[var(--soft)] p-2.5 pr-4">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[17px] bg-[var(--brand-tint)]"><Photo src={p.cover} className="absolute inset-0 h-full w-full object-cover" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold tracking-[-0.02em]">{p.name}</p>
            <div className="mt-1 flex items-center gap-2"><RatingChip rating={p.rating} reviews={p.reviews} glass={false} /><span className="text-[12px] font-bold text-[var(--ink-3)]">{p.area}</span></div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">Their price</p>
            <p className="cx-num text-[16px] font-extrabold">{rupees(base)}</p>
          </div>
        </section>
      )}

      <section className="mx-4 mt-5 rounded-[26px] bg-[var(--brand-deep)] p-5 text-white">
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white/60"><HandCoins size={15} />Your offer</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setOffer(o => Math.max(stepPaise, (o ?? base) - stepPaise))} aria-label="Lower" className="cx-press cx-btn grid h-12 w-12 place-items-center rounded-[16px]"><Minus size={20} /></button>
          <p className="cx-num text-center text-[38px] font-extrabold tracking-[-0.04em]">{rupees(offer ?? base) ?? '—'}</p>
          <button type="button" onClick={() => setOffer(o => Math.min(base, (o ?? base) + stepPaise))} aria-label="Raise" className="cx-press cx-btn grid h-12 w-12 place-items-center rounded-[16px]"><Plus size={20} /></button>
        </div>
        <p className="mt-1 text-center text-[12.5px] font-bold text-white/65">{pct > 0 ? `${pct}% below their price` : 'Their asking price'}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[5, 10, 15].map(n => {
            const v = Math.round((base * (1 - n / 100)) / 1000) * 1000
            return <button key={n} type="button" onClick={() => setOffer(v)} className={'cx-press rounded-[14px] py-2.5 text-[13px] font-extrabold ' + (pct === n ? 'bg-[var(--gold)] text-[var(--brand-deep)]' : 'cx-btn')}>−{n}%</button>
          })}
        </div>
      </section>

      <section className="mx-4 mt-5">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Why it works for them</h2>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {REASONS.map(r => {
            const on = reasons.includes(r)
            return <button key={r} type="button" onClick={() => setReasons(s => (on ? s.filter(x => x !== r) : [...s, r]))} aria-pressed={on}
              className={'cx-press rounded-full px-3.5 py-2 text-[13px] font-bold ' + (on ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>{r}</button>
          })}
        </div>
        <textarea rows={3} value={msg} onChange={e => setMsg(e.target.value)} maxLength={400} placeholder="Add a note (optional)"
          className="mt-4 w-full resize-none rounded-[18px] bg-[var(--soft)] px-4 py-3.5 text-[14px] font-semibold outline-none placeholder:text-[var(--ink-3)]" />
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[var(--ink-3)]">
          {p?.quoteHours ? `They usually reply within ${p.quoteHours} hours. ` : ''}If they accept, that price is locked for you and you pay through the app as usual.
        </p>
      </section>

      <ActionBar note={err || (ready ? `${whenLabel(ev.date, ev.time)} · ${place.area}` : 'We ask for the day, time and place before it is sent')}>
        {!ready && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSheet('when')} className="cx-press cx-btn flex items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-[12.5px] font-extrabold"><CalendarDays size={15} />{ev.date && ev.time ? whenLabel(ev.date, ev.time) : 'Add day & time'}</button>
            <button type="button" onClick={() => setSheet('place')} className="cx-press cx-btn flex items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-[12.5px] font-extrabold"><MapPin size={15} />{place?.area ?? 'Add the place'}</button>
          </div>
        )}
        <button type="button" disabled={!p || !offer || busy} onClick={send} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-send-offer>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}{user ? 'Send offer' : 'Sign in & send offer'} · {rupees(offer ?? base)}
        </button>
      </ActionBar>
      <WhenSheet open={sheet === 'when'} onClose={() => setSheet(null)} date={plan.event.date} time={plan.event.time} hours={plan.event.hours} onPick={w => { plan.setEvent(w); setSheet(null) }} />
      <PlaceSheet open={sheet === 'place'} onClose={() => setSheet(null)} value={place} onPick={x => { plan.setPlace(x); setSheet(null) }} />
      <SignInSheet open={sheet === 'signin'} onClose={() => setSheet(null)} onDone={() => setSheet(null)} why="to send your offer" />
      <Sheet open={!!sent} onClose={() => navigate('/plans')} title="Offer sent">
        <div className="pb-4">
          <CheckCircle2 size={44} className="text-[var(--ok)]" />
          <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[var(--ink-2)]">
            {p?.name} has your offer of {rupees(offer)}. They reply within {sent?.hours} hours — accept or counter from Plans, and you pay only if you accept.
          </p>
          <button type="button" onClick={() => navigate('/plans')} className="cx-press cx-cta mt-5 h-12 w-full rounded-[16px] text-[14px] font-extrabold">See my plans</button>
        </div>
      </Sheet>
    </main>
  )
}
