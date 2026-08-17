import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, Ticket, Sparkles, ArrowRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePublicOffers } from '../../hooks/usePublicOffers'
import { allOffers, pageBy, accentOf } from '../../lib/allOffers'

/**
 * Every offer in the app, four at a time, advancing on its own.
 *
 * ── Why a paged 2×2 and not the horizontal rail it replaces ───────────────
 * The rail showed shop coupons only, one and a half tiles at a time, and drifted
 * sideways by one tile every four seconds. Three things were wrong with it:
 *
 *   It was half the offers. The four celebration savings — first booking 10%,
 *   early bird 7%, repeat 15%, ₹1,000 referral — live in code rather than the
 *   `coupons` table (see lib/allOffers for why) and so appeared nowhere on this
 *   screen. Those are the ones worth thousands of rupees, attached to the half
 *   of the business the revenue comes from.
 *
 *   A partially-visible tile is not a preview, it is a cropped tile. The rail's
 *   248px tiles on a 390px phone meant the second one was always cut in half,
 *   which reads as a layout that has overflowed rather than as an invitation.
 *
 *   Sideways drift fights the reader. It moved by one tile while somebody was
 *   reading tile one, so the thing being read slid away mid-sentence.
 *
 * A page of four swaps instead of slides: everything on screen is whole,
 * nothing moves while it is being read, and one glance takes in four offers
 * rather than one and a half. Twelve offers become three pages instead of a
 * swipe most people never make.
 *
 * ── Two kinds of promise, two different controls ──────────────────────────
 * A shop coupon is arithmetic — copy the code, paste it, the checkout deducts
 * it. A celebration offer is a promise a coordinator honours on a quote. They
 * cannot wear the same button: a "COPY CODE" on a wedding offer promises money
 * off at a till that does not exist for celebrations. `action` on each tile
 * ('copy' | 'claim' | 'auto') decides which control is drawn, and `scope`
 * labels which half of the business it belongs to.
 *
 * ── The page swap is a fade, not a slide ──────────────────────────────────
 * Four tiles sliding out while four slide in is eight things moving in a 200px
 * band, which on a phone reads as the page glitching. Opacity plus a two-pixel
 * lift is enough to say "these are different offers now" and costs one
 * composited layer.
 *
 * Stops on touch, permanently — a customer who has reached for a code is the
 * one person who must not have it pulled away — and never runs under reduced
 * motion, where all pages render stacked instead so nothing is unreachable.
 */

const PAGE_MS = 5200
const PER_PAGE = 4

export default function OffersGrid() {
  const coupons = usePublicOffers()
  const reduced = useReducedMotion()
  const toast = useToast()
  const [copied, setCopied] = useState(null)
  const [page, setPage] = useState(0)
  const [held, setHeld] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const stage = useRef(null)

  const offers = useMemo(() => allOffers(coupons), [coupons])
  const pages = useMemo(() => pageBy(offers, PER_PAGE), [offers])

  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = !reduced && onScreen && !held && pages.length > 1

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setPage(p => (p + 1) % pages.length), PAGE_MS)
    return () => clearInterval(id)
  }, [running, pages.length])

  // The coupon list arrives asynchronously, so the page count can shrink under
  // a page index that was already valid. Without this the grid renders empty
  // until the next tick.
  useEffect(() => { if (page >= pages.length) setPage(0) }, [page, pages.length])

  if (offers.length === 0) return null

  async function copy(code) {
    setHeld(true)
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000)
      toast.success(`${code} copied — paste it at checkout.`)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The code is legible on the tile either way, so this is a downgrade
      // rather than a failure.
      toast.info(`Use code ${code} at checkout.`)
    }
  }

  const shown = reduced ? offers : (pages[page] ?? pages[0] ?? [])

  return (
    <section aria-labelledby="offers-heading" className="px-4">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="offers-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            <Ticket size={16} className="shrink-0 text-saffron-700" />
            Every offer, right now
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-mute">
            Celebrations and the shop — {offers.length} live.
          </p>
        </div>

        {pages.length > 1 && !reduced && (
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => { setPage(i); setHeld(true) }}
                aria-label={`Offers page ${i + 1}`}
                className="tap-tall px-1 py-2"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    i === page ? 'w-5 bg-saffron-500' : 'w-1.5 bg-ink/20'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={stage}
        onPointerDown={() => setHeld(true)}
        onMouseEnter={() => setHeld(true)}
        /* No onMouseLeave. Once somebody has engaged with a grid of discount
           codes, resuming the rotation the moment their pointer drifts off is
           how a code disappears between reading it and typing it. */
        className="grid grid-cols-2 gap-2.5"
      >
        {shown.map((offer, i) => (
          <OfferTile
            key={`${page}-${offer.id}`}
            offer={offer}
            index={i}
            copied={copied === offer.code}
            onCopy={() => copy(offer.code)}
          />
        ))}
      </div>
    </section>
  )
}

function OfferTile({ offer, index, copied, onCopy }) {
  const accent = accentOf(offer.accent)
  const onLight = accent.ink !== '#ffffff'

  const body = (
    <>
      {/* Perforations, so the tile reads as a coupon rather than an advert.
          These are not holes: they are opaque circles pushed half outside an
          `overflow-hidden` tile and painted the colour of whatever is behind
          it, so the eye completes them as bites out of the edge. That only
          works while the fill matches the ground, which is why it reads
          --notch from the host canvas rather than naming a colour. */}
      <span aria-hidden="true" className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--notch, #FFFFFF)' }} />
      <span aria-hidden="true" className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--notch, #FFFFFF)' }} />

      <div className="relative flex h-full flex-col">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em] ${
            onLight ? 'bg-black/15 text-black/70' : 'bg-white/20 text-white/90'
          }`}
        >
          {offer.scope === 'celebration' ? <Sparkles size={8} strokeWidth={3} /> : <Ticket size={8} strokeWidth={3} />}
          {offer.scopeLabel}
        </span>

        <p
          className="mt-1.5 text-[19px] font-extrabold leading-none tracking-tight"
          style={{ color: accent.ink }}
        >
          {offer.headline}
          {offer.cap && (
            <span className="ml-1 align-middle text-[9px] font-bold opacity-70">{offer.cap}</span>
          )}
        </p>

        <p
          className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug opacity-80"
          style={{ color: accent.ink }}
        >
          {offer.name}
        </p>

        <div className="mt-auto pt-2.5">
          {offer.action === 'copy' && (
            <span
              className={`flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 ${
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
            </span>
          )}

          {offer.action === 'claim' && (
            <span
              className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 ${
                onLight ? 'bg-black/12' : 'bg-white/18'
              }`}
            >
              <span className="truncate font-mono text-[10px] font-bold tracking-wider" style={{ color: accent.ink }}>
                {offer.code}
              </span>
              {/* Not "copy". The code travels with the enquiry and comes off the
                  quote a coordinator sends — see lib/allOffers. Saying "copy"
                  here would promise a checkout that does not exist for
                  celebrations. */}
              <span className="shrink-0 text-[9px] font-extrabold opacity-75" style={{ color: accent.ink }}>
                on your quote
              </span>
            </span>
          )}

          {offer.action === 'auto' && (
            <span
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-extrabold ${
                onLight ? 'bg-black/12' : 'bg-white/18'
              }`}
              style={{ color: accent.ink }}
            >
              Applies itself
              <ArrowRight size={10} strokeWidth={3} className="ml-auto shrink-0" />
            </span>
          )}
        </div>
      </div>
    </>
  )

  const shell =
    'rise-in group relative flex min-h-[132px] flex-col overflow-hidden rounded-2xl p-3 text-left shadow-[0_10px_24px_-16px_rgba(0,0,0,0.6)] transition-transform active:scale-[0.98]'
  const style = {
    '--rise-delay': `${index * 70}ms`,
    background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)`,
  }

  // A tile with a copyable code is a button; everything else is a link to the
  // screen where the offer is actually used. Rendering all four as buttons
  // would leave the celebration offers with nowhere to go, and all four as
  // links would make copying a code a navigation.
  return offer.action === 'copy' ? (
    <button type="button" onClick={onCopy} className={shell} style={style}>{body}</button>
  ) : (
    <Link to={offer.to} className={shell} style={style}>{body}</Link>
  )
}
