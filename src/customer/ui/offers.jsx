/**
 * The offer tags — the quick-commerce strip of what is running, one at a
 * time, on Home, the masters lists and the plan. Each is something the
 * app does or a policy it keeps; the welcome offer is Mohan's (it is
 * applied by the team at checkout until a coupon engine exists).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgePercent, ChevronRight, RotateCcw, ShieldCheck, Zap } from 'lucide-react'

export const OFFERS = [
  { icon: BadgePercent, text: '10% off your first celebration', sub: 'On your first celebration booking', cta: 'Book a celebration', to: '/explore#celebrations', fg: '#B45309', bg: '#FFF4DA' },
  { icon: Zap, text: 'Instant booking — no waiting for quotes', sub: 'Pick a master, pay, done', cta: 'Book instantly', to: '/s', fg: '#6D28D9', bg: '#F3ECFF' },
  { icon: ShieldCheck, text: 'Pay safely — held till your event is done', sub: 'Secured by Razorpay, released after delivery', cta: 'How it works', to: '/help', fg: '#0B6B3D', bg: '#E9F8EF' },
  { icon: RotateCcw, text: 'Full refund before a master accepts', sub: 'Clear cancellation, no small print', cta: 'See the policy', to: '/help#cancellation', fg: '#1D4ED8', bg: '#EAF1FF' },
]

export function OfferStrip({ className = '' }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % OFFERS.length), 2600); return () => clearInterval(t) }, [])
  const o = OFFERS[i]
  return (
    <Link to={o.to} className={'cx-press flex h-9 items-center gap-2 overflow-hidden rounded-[12px] px-3 transition-colors duration-500 ' + className} style={{ background: o.bg, color: o.fg }} data-offer-strip>
      <o.icon size={15} className="shrink-0" />
      <span key={i} className="cx-rise min-w-0 flex-1 truncate text-[12.5px] font-extrabold">{o.text}</span>
      <ChevronRight size={15} className="shrink-0 opacity-70" />
    </Link>
  )
}

/* The offer deck: real ticket cards, one in view, moving on by themselves
   every 2.6 s and holding while a thumb is on them. */
export function OfferDeck({ className = '' }) {
  const [i, setI] = useState(0)
  const [hold, setHold] = useState(0)
  useEffect(() => { const t = setInterval(() => { if (Date.now() > hold) setI(n => (n + 1) % OFFERS.length) }, 2600); return () => clearInterval(t) }, [hold])
  return (
    <div className={'overflow-hidden ' + className} onTouchStart={() => setHold(Date.now() + 5000)} data-offer-deck>
      <div className="flex gap-2.5 px-3 transition-transform duration-500 ease-out" style={{ transform: `translateX(calc(-${i} * (84% + 10px)))` }}>
        {OFFERS.map(o => (
          <Link key={o.text} to={o.to} className="cx-press relative flex w-[84%] shrink-0 overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_#EEE6FA,0_12px_24px_-18px_rgba(58,18,144,.6)]">
            <span className="grid w-[70px] shrink-0 place-items-center" style={{ background: o.bg, color: o.fg }}><o.icon size={26} /></span>
            <span className="min-w-0 flex-1 border-l border-dashed border-[#E7E1F0] p-3">
              <span className="block text-[14px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--ink)]">{o.text}</span>
              <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{o.sub}</span>
              <span className="mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-extrabold" style={{ color: o.fg }}>{o.cta}<ChevronRight size={14} /></span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1">{OFFERS.map((_, k) => <span key={k} className={'h-1.5 rounded-full transition-all ' + (k === i ? 'w-4 bg-[var(--brand)]' : 'w-1.5 bg-[#E1D9EE]')} />)}</div>
    </div>
  )
}
