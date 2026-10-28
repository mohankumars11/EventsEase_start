/**
 * The offer tags — the quick-commerce strip of what is running, one at a
 * time, on Home, the masters lists and the plan. Each is something the
 * app does or a policy it keeps; the welcome offer is Mohan's (it is
 * applied by the team at checkout until a coupon engine exists).
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgePercent, ChevronRight, MailOpen, RotateCcw, ShieldCheck, Zap } from 'lucide-react'

export const OFFERS = [
  { icon: BadgePercent, big: '25% OFF', small: 'your first celebration', text: '25% off your first celebration', sub: 'Up to ₹1,500 · first booking · in your Rewards', cta: 'See my voucher', to: '/rewards', fg: '#B45309', bg: '#FFF4DA', grad: 'linear-gradient(120deg, #FF7A45 0%, #E23744 100%)' },
  { icon: Zap, big: '0 WAIT', small: 'instant booking, no quotes', text: 'Instant booking — no waiting for quotes', sub: 'Pick a master, pay, done', cta: 'Book instantly', to: '/s', fg: '#6D28D9', bg: '#F3ECFF', grad: 'linear-gradient(120deg, #8B5CF6 0%, #4C1D95 100%)' },
  { icon: MailOpen, big: 'FREE RSVP', small: 'WhatsApp invites & headcount', text: 'Free WhatsApp invites with RSVP', sub: 'Know exactly who’s coming', cta: 'Send invites', to: '/invites', fg: '#BE185D', bg: '#FDECF4', grad: 'linear-gradient(120deg, #EC4899 0%, #9D174D 100%)' },
  { icon: ShieldCheck, big: '100% SAFE', small: 'pay held till it’s done', text: 'Pay safely — held till your event is done', sub: 'Secured by Razorpay, released after delivery', cta: 'How it works', to: '/help', fg: '#0B6B3D', bg: '#E9F8EF', grad: 'linear-gradient(120deg, #22C55E 0%, #0B6B3D 100%)' },
  { icon: RotateCcw, big: 'FULL REFUND', small: 'before a master accepts', text: 'Full refund before a master accepts', sub: 'Clear cancellation, all in one place', cta: 'See the policy', to: '/legal/cancellation', fg: '#1D4ED8', bg: '#EAF1FF', grad: 'linear-gradient(120deg, #3B82F6 0%, #1E3A8A 100%)' },
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

/* The offer deck — coupon cards like Swiggy / Zomato: a bold gradient
   ticket with the offer in big type, perforation notches, one action.
   A native swipe carousel (scroll-snap) that also moves on its own every
   3 s, pausing for 6 s after the customer touches it, and loops. */
export function OfferDeck({ className = '' }) {
  const rail = useRef(null)
  const [i, setI] = useState(0)
  const quietUntil = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const el = rail.current
      if (!el || Date.now() < quietUntil.current || document.visibilityState !== 'visible') return
      const cards = [...el.children]
      const next = (i + 1) % cards.length
      el.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' })
    }, 3000)
    return () => clearInterval(t)
  }, [i])
  const onScroll = () => {
    const el = rail.current
    if (!el) return
    const cards = [...el.children]
    const at = cards.reduce((best, c, k) => (Math.abs(c.offsetLeft - cards[0].offsetLeft - el.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - el.scrollLeft) ? k : best), 0)
    if (at !== i) setI(at)
  }
  const hold = () => { quietUntil.current = Date.now() + 6000 }
  return (
    <div className={className} data-offer-deck>
      <div ref={rail} onScroll={onScroll} onTouchStart={hold} onPointerDown={hold} className="cx-noscroll flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-1">
        {OFFERS.map(o => (
          <Link key={o.text} to={o.to} className="cx-press relative flex h-[132px] w-[84%] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-[20px] text-white shadow-[0_14px_28px_-18px_rgba(30,10,60,.8)]" style={{ background: o.grad }} data-offer-card>
            <span className="relative z-10 flex min-w-0 flex-1 flex-col justify-center pl-4 pr-2">
              <span className="text-[30px] font-black leading-none tracking-[-0.04em] drop-shadow-sm">{o.big}</span>
              <span className="mt-1 text-[13px] font-extrabold leading-tight text-white/90">{o.small}</span>
              <span className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold" style={{ color: o.fg }}>{o.cta}<ChevronRight size={14} /></span>
            </span>
            {/* The ticket stub: dashed tear line, notches top and bottom, the icon. */}
            <span className="relative grid w-[92px] shrink-0 place-items-center border-l-2 border-dashed border-white/40">
              <span className="absolute -top-3 left-[-13px] h-6 w-6 rounded-full bg-white" aria-hidden />
              <span className="absolute -bottom-3 left-[-13px] h-6 w-6 rounded-full bg-white" aria-hidden />
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/30"><o.icon size={28} strokeWidth={2.2} /></span>
            </span>
            <span className="pointer-events-none absolute -left-6 -top-10 h-28 w-28 rounded-full bg-white/10" aria-hidden />
          </Link>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1">{OFFERS.map((_, k) => <span key={k} className={'h-1.5 rounded-full transition-all duration-300 ' + (k === i ? 'w-5 bg-[var(--brand)]' : 'w-1.5 bg-[#E1D9EE]')} />)}</div>
    </div>
  )
}
