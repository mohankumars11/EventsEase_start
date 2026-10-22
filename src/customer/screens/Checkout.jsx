/**
 * Checkout: where the event is, who to call, and one payment for every
 * instant partner in the plan.
 *
 * ── How payment works (and what is wired today) ─────────────────────
 * Each instant line is booked through /api/anchor?op=book, which returns
 * a booking line; every line id then goes into ONE Razorpay payment via
 * lib/payLines (native sheet in the app, web checkout otherwise). The
 * Razorpay webhook — never this screen — records the money, which is
 * held until the partner delivers. Quote lines are sent as requests and
 * paid once the partner's quote is accepted.
 *
 * In this build the screen, the sign-in and the summary are real; the
 * booking call is the next step, and the button says so rather than
 * pretending to charge.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock3, Lock, MapPin, Phone, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlan } from '../state/PlanContext'
import { TRADE } from '../data/trades'
import { dayLabel, plural, rupees, whenLabel } from '../lib/format'
import { planFloor } from '../lib/estimate'
import { ActionBar, BackHeader, Sheet } from '../ui/kit'
import SignInSheet from './SignInSheet'
import WhenSheet from './WhenSheet'

export default function Checkout() {
  const { user, profile } = useAuth()
  const plan = usePlan()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [note, setNote] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const instant = plan.basket.filter(l => l.instant)
  const quote = plan.basket.filter(l => !l.instant)
  const floor = planFloor(instant, plan.event).paise
  const ready = plan.event.date && plan.event.time && address.trim().length > 5 && /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))

  function pay() {
    if (!user) { setSignIn(true); return }
    setPending(true)
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title="Checkout" sub={`${plural(plan.basket.length, 'partner')} · ${plan.event.date ? dayLabel(plan.event.date) : 'date needed'}`} />

      <Block title="When & where">
        <button type="button" onClick={() => setDateOpen(true)} className="cx-press flex w-full items-center gap-3 rounded-[16px] bg-[var(--soft)] px-4 py-3.5 text-left">
          <CalendarDays size={19} className="text-[var(--brand)]" />
          <span className={'flex-1 text-[15px] font-extrabold ' + (plan.event.date && plan.event.time ? '' : 'text-[var(--brand)]')}>{plan.event.date ? whenLabel(plan.event.date, plan.event.time) : 'Pick the day and start time'}</span>
        </button>
        <label className="mt-2 flex items-start gap-3 rounded-[16px] bg-[var(--soft)] px-4 py-3.5">
          <MapPin size={19} className="mt-0.5 text-[var(--brand)]" />
          <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Event address — house, street, area"
            className="flex-1 resize-none bg-transparent text-[14.5px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
        </label>
      </Block>

      <Block title="Who partners should call">
        <label className="flex items-center gap-3 rounded-[16px] bg-[var(--soft)] px-4 py-3.5">
          <Phone size={19} className="text-[var(--brand)]" />
          <span className="text-[15px] font-extrabold text-[var(--ink-3)]">+91</span>
          <input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" className="cx-num flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:text-[var(--ink-3)]" />
        </label>
      </Block>

      <Block title="What happens next">
        {instant.length > 0 && <Step icon={Zap} gold title={`${plural(instant.length, 'partner')} confirm instantly`} body={`${instant.map(l => TRADE[l.tradeId]?.label).join(', ')}. Booked the moment the payment goes through.`} />}
        {quote.length > 0 && <Step icon={Clock3} title={`${plural(quote.length, 'partner')} send a quote`} body={`${quote.map(l => TRADE[l.tradeId]?.label).join(', ')}. You compare, negotiate and pay only when you accept.`} />}
        <Step icon={ShieldCheck} title="Your money is held until the day" body="Partners are paid after they deliver. Cancellation terms are each partner's own, shown on their page." />
      </Block>

      <Block title="Anything partners should know?">
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Theme, colours, traditions, timings…"
          className="w-full resize-none rounded-[16px] bg-[var(--soft)] px-4 py-3.5 text-[14px] font-semibold outline-none placeholder:text-[var(--ink-3)]" />
      </Block>

      <ActionBar note={user ? 'Razorpay · UPI, cards, netbanking' : 'You will sign in with your email before paying'}>
        <div className="mb-2 flex items-end justify-between px-1">
          <span className="text-[13px] font-bold text-[var(--ink-2)]">Pay now, from</span>
          <span className="cx-num text-[22px] font-extrabold tracking-[-0.03em]">{rupees(floor) ?? '₹0'}</span>
        </div>
        <button type="button" disabled={!ready} onClick={pay} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-pay>
          <Lock size={17} />{user ? 'Confirm & pay securely' : 'Sign in & pay'}
        </button>
      </ActionBar>

      <WhenSheet open={dateOpen} onClose={() => setDateOpen(false)} date={plan.event.date} time={plan.event.time} hours={plan.event.hours} onPick={w => { plan.setEvent(w); setDateOpen(false) }} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} />
      <Sheet open={pending} onClose={() => setPending(false)} title="Almost there">
        <p className="pb-4 text-[14px] font-semibold leading-relaxed text-[var(--ink-2)]">
          Your plan, address and contact are ready. The booking-and-payment step connects to the live partners next — nothing has been charged.
        </p>
        <button type="button" onClick={() => { setPending(false); navigate('/plans') }} className="cx-press mb-2 h-12 w-full rounded-[16px] bg-[var(--soft)] text-[14px] font-extrabold">See my plans</button>
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

function Step({ icon: Icon, title, body, gold = false }) {
  return (
    <div className="flex gap-3 border-b border-[var(--line)] py-3 last:border-0">
      <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ' + (gold ? 'bg-[#FFF4DA]' : 'bg-[var(--brand-tint)]')}>
        <Icon size={18} className={gold ? 'fill-[var(--gold)] text-[#B87A00]' : 'text-[var(--brand)]'} />
      </span>
      <div>
        <p className="text-[14px] font-extrabold tracking-[-0.01em]">{title}</p>
        <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-[var(--ink-2)]">{body}</p>
      </div>
    </div>
  )
}
