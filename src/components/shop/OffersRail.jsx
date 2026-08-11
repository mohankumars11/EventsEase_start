import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Ticket, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePublicOffers } from '../../hooks/usePublicOffers'
import { formatINR } from '../../utils/format'

/**
 * The offers strip at the top of the shop.
 *
 * Every coupon on it is a row in `coupons` that the checkout's
 * `validate_coupon` RPC will actually accept — same table, same `active` and
 * `expires_at` filters. Nothing here is decorative copy: a customer who taps
 * a tile, copies the code and pastes it into the cart gets exactly the
 * discount the tile promised, or the tile isn't rendered. Hardcoding a
 * "FLAT 20% OFF" banner is how a storefront ends up advertising a code its
 * own checkout rejects.
 *
 * RLS on `coupons` returns public codes (issued_to IS NULL) to anonymous
 * visitors and additionally the signed-in customer's personal codes — so a
 * referral reward shows up here for the person who earned it, without this
 * component knowing anything about who that is.
 *
 * Renders nothing at all when there are no live offers. An empty "Offers"
 * heading over a blank rail is worse than no rail.
 */
export default function OffersRail() {
  const offers = usePublicOffers()
  const [copied, setCopied] = useState(null)
  const toast = useToast()
  const reduced = useReducedMotion()
  const railRef = useRef(null)

  // Drift the rail one tile every few seconds so the strip advertises more
  // than its first two offers to someone who never swipes it. Stops the
  // moment they touch it — `scroll-snap` plus a hijacked scroll position is
  // the single most annoying thing a carousel can do — and never starts
  // under reduced motion.
  useEffect(() => {
    if (reduced || offers.length < 2) return
    const el = railRef.current
    if (!el) return
    let stopped = false
    const stop = () => { stopped = true }
    el.addEventListener('pointerdown', stop, { once: true })
    el.addEventListener('wheel', stop, { once: true, passive: true })

    const id = setInterval(() => {
      if (stopped || document.hidden) return
      const tile = el.firstElementChild?.getBoundingClientRect().width ?? 260
      const step  = tile + 12                                  // + gap-3
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' })
    }, 4200)

    return () => {
      clearInterval(id)
      el.removeEventListener('pointerdown', stop)
      el.removeEventListener('wheel', stop)
    }
  }, [reduced, offers.length])

  if (offers.length === 0) return null

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000)
      toast.success(`${code} copied — paste it at checkout.`)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app
      // browsers. The code is legible on the tile either way, so this is a
      // downgrade, not a failure.
      toast.info(`Use code ${code} at checkout.`)
    }
  }

  return (
    <section aria-labelledby="offers-heading">
      <div className="flex items-end justify-between px-4 mb-3">
        <div>
          <h2 id="offers-heading" className="text-white font-extrabold text-[15px] flex items-center gap-2">
            <Ticket size={16} className="text-saffron-300" /> Offers for you
          </h2>
          <p className="text-white/50 text-[11px] mt-0.5">Tap to copy · applies at checkout</p>
        </div>
        <span className="text-white/40 text-[11px] font-semibold flex items-center">
          Swipe <ChevronRight size={12} />
        </span>
      </div>

      <div
        ref={railRef}
        // `scroll-pl-4` so a snapped tile lands at the page's left margin
        // rather than flush against the screen edge — without it the drift
        // scrolls the rail's own padding away and the first tile looks cut off.
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-pl-4 px-4 pb-1"
      >
        {offers.map(o => (
          <OfferTile
            key={o.id}
            offer={o}
            copied={copied === o.code}
            onCopy={() => copy(o.code)}
          />
        ))}
      </div>
    </section>
  )
}

function OfferTile({ offer, copied, onCopy }) {
  const headline = offer.discount_type === 'percent'
    ? `${Number(offer.discount_value)}% OFF`
    : `${formatINR(offer.discount_value)} OFF`

  // The condition, stated on the tile rather than in fine print at the
  // bottom — "15% off" that turns out to need ₹1,499 is the moment a
  // customer stops believing the next banner.
  const condition = Number(offer.min_order_amount) > 0
    ? `on orders above ${formatINR(offer.min_order_amount)}`
    : 'on any order'
  const cap = offer.discount_type === 'percent' && offer.max_discount
    ? `up to ${formatINR(offer.max_discount)}`
    : null

  return (
    <button
      type="button"
      onClick={onCopy}
      className="group relative snap-start shrink-0 w-[248px] text-left overflow-hidden
                 rounded-2xl bg-gradient-to-br from-chilli-600 via-chilli-500 to-chilli-700
                 ring-1 ring-white/15 p-3.5 active:scale-[0.98] transition-transform"
    >
      {/* Sheen — the only always-on motion on the tile. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/20 blur-md animate-sheen"
      />
      {/* Perforation, so the tile reads as a coupon and not as an ad. Painted
          in the host canvas's own ground (--coupon-notch) because this rail
          runs on both the green storefront and the plum home. */}
      <span aria-hidden="true" className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--coupon-notch, #072a20)' }} />
      <span aria-hidden="true" className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--coupon-notch, #072a20)' }} />

      <div className="relative">
        <p className="text-white font-extrabold text-xl leading-none tracking-tight">
          {headline}
          {cap && <span className="ml-1.5 text-[10px] font-bold text-white/70 align-middle">{cap}</span>}
        </p>
        <p className="text-white/80 text-[11px] font-medium mt-1 leading-snug line-clamp-1">{condition}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="flex-1 border border-dashed border-white/45 rounded-lg px-2 py-1.5 text-white font-mono font-bold text-xs tracking-widest text-center">
            {offer.code}
          </span>
          <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
            {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={13} />}
          </span>
        </div>
      </div>
    </button>
  )
}
