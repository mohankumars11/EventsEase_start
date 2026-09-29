import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Ticket, Sparkles, ArrowRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { allOffers, accentOf } from '../../lib/allOffers'

/**
 * Every offer in the app, in one bar split into two cards that keep changing.
 *
 * ── The shape, and why it is two and not four ─────────────────────────────
 * This was a 2×2 of four static tiles that swapped a whole page at a time.
 * Four tiles is four things asking to be read at once, in a band 260px tall,
 * for content that is fundamentally a ticker — and a page-swap of four means
 * the offer somebody was reading vanishes along with three others.
 *
 * Two cards is the right count because there are exactly two kinds of offer,
 * and each card owns one:
 *
 *   left    CELEBRATIONS — the first-booking 10%, the early bird, the repeat
 *           credit, the referral. Thousands of rupees, on the primary revenue
 *           line, and they live in code rather than the coupons table (see
 *           lib/allOffers), which is why they used to appear nowhere here.
 *   right   THE SHOP — live coupon rows, exactly what checkout will accept.
 *
 * So the split is not decorative: the two halves of the business each get a
 * permanent window, and neither can crowd the other out no matter how many
 * coupons marketing adds. A customer glancing at this bar always sees one of
 * each rather than four of whichever happens to sort first.
 *
 * ── They cycle independently, and out of phase ────────────────────────────
 * Each card advances through its own list on its own timer, and the right one
 * is deliberately offset by half a beat. Two cards flipping in unison reads as
 * the page reloading; staggered, it reads as two live tickers, and the eye
 * always has one settled card to land on.
 *
 * ── The whole card is the target ──────────────────────────────────────────
 * Tapping anywhere navigates to where the offer is used — the shop for a
 * coupon, the planner for a celebration saving, the account for the referral.
 * Copyable codes get a copy control INSIDE that, which is why the card is a
 * `div` with an onClick rather than a `<Link>` wrapping a `<button>`: nested
 * interactive elements are invalid markup and a tap lands on whichever the
 * browser prefers. The inner control stops propagation, so copying does not
 * also navigate.
 *
 * ── Two kinds of promise, two different controls ──────────────────────────
 * A shop coupon is arithmetic — copy, paste, the checkout deducts it. A
 * celebration offer is a promise a coordinator honours on a quote. They cannot
 * wear the same button: "COPY CODE" on a wedding offer promises a till that
 * does not exist for celebrations. `action` decides which control is drawn.
 *
 * Both cards stop on touch, permanently — somebody who has reached for a code
 * must not have it pulled away — and under reduced motion the bar renders every
 * offer stacked instead, so nothing is unreachable.
 */

const BEAT_MS = 4600
const PER_PAGE = 2

export default function OffersGrid() {
  const reduced = useReducedMotion()
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const stage = useRef(null)

  const offers = useMemo(() => allOffers(), [])

  // Two cards, both rotating. This used to split by which half of the business
  // an offer belonged to — celebrations on the left, shop coupons on the right
  // — which is a distinction the customer no longer has to care about because
  // there is only one half left.
  //
  // Dealt alternately rather than sliced down the middle, so the two cards are
  // never showing consecutive offers from the same list, and an odd count
  // leaves the extra on the left rather than emptying the right.
  const { left, right } = useMemo(() => ({
    left:  offers.filter((_, i) => i % 2 === 0),
    right: offers.filter((_, i) => i % 2 === 1),
  }), [offers])

  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (offers.length === 0) return null

  const running = !reduced && onScreen && !held

  return (
    <section aria-labelledby="offers-heading" className="px-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="offers-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            <Ticket size={16} className="shrink-0 text-saffron-700" />
            Every offer, right now
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-mute">
            {offers.length} live on every celebration.
          </p>
        </div>
      </div>

      <div
        ref={stage}
        onPointerDown={() => setHeld(true)}
        onMouseEnter={() => setHeld(true)}
        /* No onMouseLeave. Once somebody has engaged with a bar of discount
           codes, resuming rotation the moment their pointer drifts off is how a
           code disappears between reading it and typing it. */
        className={reduced ? 'grid grid-cols-2 gap-2.5' : 'grid grid-cols-2 gap-2.5'}
      >
        {reduced ? (
          offers.map(o => <OfferCard key={o.id} offer={o} onHold={() => setHeld(true)} />)
        ) : (
          <>
            <Ticker items={left}  running={running} offset={0}         onHold={() => setHeld(true)} />
            <Ticker items={right} running={running} offset={BEAT_MS / 2} onHold={() => setHeld(true)} />
          </>
        )}
      </div>
    </section>
  )
}

/**
 * One of the two windows. Advances through its own list on its own timer.
 *
 * `offset` staggers the right-hand card by half a beat via a one-shot timeout
 * that starts the interval late. Doing it with a CSS delay instead would only
 * stagger the ANIMATION while both cards still changed content in lockstep.
 */
function Ticker({ items, running, offset, onHold }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!running || items.length < 2) return
    let interval
    const start = setTimeout(() => {
      interval = setInterval(() => setI(n => (n + 1) % items.length), BEAT_MS)
    }, offset)
    return () => { clearTimeout(start); clearInterval(interval) }
  }, [running, items.length, offset])

  // The coupon list arrives asynchronously and can shrink under a valid index.
  useEffect(() => { if (i >= items.length) setI(0) }, [i, items.length])

  const offer = items[i % items.length]
  if (!offer) return null

  return (
    <div className="relative">
      {/* Keyed on the offer, so React remounts and the entrance animation
          replays on every beat — that fade-and-lift is the only cue that the
          card has changed to a different offer. */}
      <OfferCard key={offer.id} offer={offer} onHold={onHold} animate />
      {items.length > 1 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-1.5 flex items-center gap-1">
          {items.map((i2, n) => (
            <span
              key={i2.id}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                n === i % items.length ? 'bg-white/85' : 'bg-white/25'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OfferCard({ offer, onHold, animate = false }) {
  const accent = accentOf(offer.accent)
  const onLight = accent.ink !== '#ffffff'
  const navigate = useNavigate()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  async function copy(e) {
    // The copy control lives inside the card, and the card navigates. Without
    // this, copying a code would also send you to the shop.
    e.stopPropagation()
    onHold?.()
    try {
      await navigator.clipboard.writeText(offer.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(`${offer.code} copied — paste it at checkout.`)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The code is legible on the card either way, so this is a downgrade
      // rather than a failure.
      toast.info(`Use code ${offer.code} at checkout.`)
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(offer.to)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(offer.to) } }}
      aria-label={`${offer.headline} — ${offer.name}`}
      className={`${animate ? 'rise-in' : ''} relative flex min-h-[128px] cursor-pointer flex-col overflow-hidden rounded-[24px] p-3.5 pb-4 text-left shadow-[0_14px_30px_-16px_rgba(0,0,0,0.6)] transition-transform active:scale-[0.98]`}
      style={{ background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)` }}
    >
      {/* Perforations, so the card reads as a coupon rather than an advert.
          These are not holes: they are opaque circles pushed half outside an
          `overflow-hidden` card and painted the colour of whatever is behind
          it, so the eye completes them as bites out of the edge. That only
          works while the fill matches the ground, which is why it reads
          --notch from the host canvas rather than naming a colour. */}
      <span aria-hidden="true" className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--notch, #FFFFFF)' }} />
      <span aria-hidden="true" className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--notch, #FFFFFF)' }} />

      <span
        className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em] ${
          onLight ? 'bg-black/15 text-black/70' : 'bg-white/20 text-white/90'
        }`}
      >
        <Sparkles size={8} strokeWidth={3} />
        {offer.scopeLabel}
      </span>

      <p className="mt-1.5 text-[19px] font-extrabold leading-none tracking-tight" style={{ color: accent.ink }}>
        {offer.headline}
        {offer.cap && <span className="ml-1 align-middle text-[9px] font-bold opacity-70">{offer.cap}</span>}
      </p>

      <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug opacity-80" style={{ color: accent.ink }}>
        {offer.name}
      </p>

      <div className="mt-auto pt-2.5">
        {offer.action === 'copy' && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy code ${offer.code}`}
            className={`flex w-full items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 ${
              onLight ? 'border-black/30' : 'border-white/45'
            }`}
          >
            <span className="flex-1 truncate text-center font-mono text-[11px] font-bold tracking-widest"
                  style={{ color: accent.ink }}>
              {offer.code}
            </span>
            <span style={{ color: accent.ink }}>
              {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={11} />}
            </span>
          </button>
        )}

        {offer.action === 'claim' && (
          <span className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 ${onLight ? 'bg-black/12' : 'bg-white/18'}`}>
            <span className="truncate font-mono text-[10px] font-bold tracking-wider" style={{ color: accent.ink }}>
              {offer.code}
            </span>
            {/* Not "copy". The code travels with the enquiry and comes off the
                quote a coordinator sends — see lib/allOffers. */}
            <span className="shrink-0 text-[9px] font-extrabold opacity-75" style={{ color: accent.ink }}>
              on your quote
            </span>
          </span>
        )}

        {offer.action === 'auto' && (
          <span
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-extrabold ${onLight ? 'bg-black/12' : 'bg-white/18'}`}
            style={{ color: accent.ink }}
          >
            Applies itself
            <ArrowRight size={10} strokeWidth={3} className="ml-auto shrink-0" />
          </span>
        )}
      </div>
    </div>
  )
}
