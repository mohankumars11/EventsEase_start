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
  { icon: BadgePercent, text: '10% off your first celebration', to: '/explore#celebrations', fg: '#B45309', bg: '#FFF4DA' },
  { icon: Zap, text: 'Instant booking — no waiting for quotes', to: '/s', fg: '#6D28D9', bg: '#F3ECFF' },
  { icon: ShieldCheck, text: 'Pay safely — held till your event is done', to: '/help', fg: '#0B6B3D', bg: '#E9F8EF' },
  { icon: RotateCcw, text: 'Full refund before a master accepts', to: '/help#cancellation', fg: '#1D4ED8', bg: '#EAF1FF' },
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
