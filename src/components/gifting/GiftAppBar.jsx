import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, X, ArrowLeft, ChevronDown, MapPin, AlertCircle } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import { useCart } from '../../context/CartContext'
import { useCity } from '../../context/CityContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The storefront's bar — the brand, where it is going, and what is in the bag.
 *
 * ── The three slots, in this order, on every shop screen ─────────────────
 * Mark · destination · bag. The mark sits top-left and never moves, because
 * it is the one element on the screen that answers "whose shop is this" and a
 * brand that appears only on the home screen is a brand nobody remembers. On
 * a deep screen the back arrow takes the leftmost position and the mark steps
 * one place right rather than disappearing — losing the way back is worse
 * than a slightly tighter lockup, and losing the brand entirely is worse than
 * both.
 *
 * ── Why the destination is two lines ─────────────────────────────────────
 * "Deliver to" above the city is not decoration. Every delivery app in the
 * market prints a bare place name in this slot, and a bare place name is
 * ambiguous the first time you see it: is that where I am, or where this is
 * going? The label removes the question for the cost of one 10px line, and
 * the pincode underneath is what actually decides serviceability, so it is
 * shown rather than hidden behind the tap.
 *
 * The search field is the only row that scrolls away. The destination and the
 * bag stay, because both are answers to questions people ask mid-scroll.
 */

// Real catalogue terms. A placeholder that names things you could actually
// ask for gets typed into far more often than one that says "Search" — but
// only if everything it proposes returns results, so these are checked
// against live shelves rather than invented.
const SEARCH_HINTS = [
  'red roses, delivered today',
  'eggless chocolate cake',
  'Mysore silk saree',
  'rakhi with sweets',
  'balloon arch for a birthday',
  'griha pravesh kit',
]

export default function GiftAppBar({
  query = '',
  onQueryChange,
  backTo,
  title,
  subtitle,
  /** Hide the search row entirely — the cart and checkout use this. */
  compact = false,
}) {
  const navigate = useNavigate()
  const { cartCount, cartPath } = useCart()
  const { city, chosen, servable, openCityPicker } = useCity()
  const reduced = useReducedMotion()
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const barRef = useRef(null)

  // Router's own position counter; 0 means this entry opened the session, so
  // navigate(-1) would drop the visitor out of the app entirely.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  // Publish the bar's real height so anything sticking underneath it (the
  // listing page's filter row) positions against a measurement rather than a
  // magic number that is wrong on any phone with a different notch or font
  // size.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--shop-appbar-h', `${el.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => obs.disconnect()
  }, [compact, title])

  useEffect(() => {
    if (reduced || focused || query || compact) return
    const id = setInterval(() => setHint(h => (h + 1) % SEARCH_HINTS.length), 2800)
    return () => clearInterval(id)
  }, [reduced, focused, query, compact])

  return (
    <header ref={barRef} className="shop-appbar sticky top-0 z-40 pt-safe">
      <div className="mx-auto max-w-6xl px-4 pb-2.5 pt-2.5">
        <div className="flex items-center gap-2.5">
          {backTo && (
            canGoBack ? (
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="-ml-1.5 tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-surface-sunk/[0.07]"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Link
                to={backTo}
                aria-label="Back"
                className="-ml-1.5 tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-surface-sunk/[0.07]"
              >
                <ArrowLeft size={20} />
              </Link>
            )
          )}

          {/* The mark is a link on every screen. On a deep page it is the way
              back to the shop root, which is the gesture people already
              expect from a logo and the one route that is otherwise three
              taps away. */}
          <Link to="/shop" aria-label="Sambramo shop home" className="shrink-0">
            <SambramoMark size={30} />
          </Link>

          {title ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold leading-tight text-ink">{title}</p>
              {subtitle && <p className="truncate text-[11px] text-ink-mute">{subtitle}</p>}
            </div>
          ) : (
            <button
              onClick={openCityPicker}
              aria-haspopup="dialog"
              aria-label={chosen ? `Delivering to ${city}. Change` : 'Set your delivery city'}
              className="tap-tall group min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left transition-colors active:bg-surface-sunk/[0.07]"
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.09em] text-ink-mute">
                Deliver to
              </span>
              <span className="flex items-center gap-1 text-[14px] font-extrabold leading-tight text-ink">
                {chosen && !servable
                  ? <AlertCircle size={13} className="shrink-0 text-amber-600" />
                  : <MapPin size={13} className="shrink-0 text-chilli-600" />}
                <span className="truncate">{chosen ? city : 'Choose your city'}</span>
                <ChevronDown size={13} className="shrink-0 text-ink-mute transition-transform group-active:translate-y-px" />
                {/* Unset is the one thing on this bar asking to be tapped. */}
                {!chosen && <span className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chilli-500" />}
              </span>
              {/* The third line exists for exactly one message. There is no
                  pincode on the city record, and inventing one to fill the
                  slot would put a number on screen that decides
                  serviceability and is not true. So the line appears only
                  when we cannot deliver — which is the one thing worth a
                  third line, and the thing every price below it depends on. */}
              {chosen && !servable && (
                <span className="block text-[11px] font-semibold leading-tight text-amber-700">
                  We do not deliver here yet
                </span>
              )}
            </button>
          )}

          <Link
            to={cartPath}
            aria-label={`Bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            className="relative tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-transform active:scale-95"
          >
            <ShoppingBag size={21} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-chilli-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-[color:var(--bar)]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        {!compact && onQueryChange && (
          <div className="relative mt-2.5">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              type="search"
              enterKeyHint="search"
              aria-label="Search the shop"
              placeholder={focused ? 'Search cakes, flowers, gifts, silk…' : `Try "${SEARCH_HINTS[hint]}"`}
              className="h-11 w-full rounded-2xl border border-hairline/12 bg-surface-sunk/[0.04] pl-10 pr-10 text-[13px] font-medium text-ink outline-none transition placeholder:text-ink-mute focus:border-forest-600 focus:bg-white"
            />
            {query && (
              <button
                onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-sunk/10 text-ink-mute"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
