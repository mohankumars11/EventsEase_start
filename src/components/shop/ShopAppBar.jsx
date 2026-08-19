import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, X, ArrowLeft } from 'lucide-react'
import VoiceSearchButton from '../common/VoiceSearchButton'
import SambramoMark from '../ui/SambramoMark'
import CityButton from '../common/CityButton'
import { useCart } from '../../context/CartContext'
import { useCity } from '../../context/CityContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { BRAND } from '../../config/sambramo'

/**
 * The storefront's app bar — the Android pattern, not a website header.
 *
 * Sticky, dark, and it owns the three things a shopper needs at every scroll
 * position: where they're ordering to, a way to search, and the cart. The
 * search field is the only one that scrolls away; the location and cart row
 * stays, because both are answers to questions people ask mid-scroll.
 *
 * The rotating search placeholder is the one piece of theatre here, and it
 * earns its place: an empty box labelled "Search" gets typed into far less
 * often than one that keeps naming things you could ask for. The suggestions
 * are real catalogue terms, so anything it proposes returns results.
 */
const SEARCH_HINTS = [
  'chocolate truffle cake',
  'birthday balloons',
  'rose bouquet',
  'rakhi hamper',
  'pooja thali',
  'anniversary gift',
]

export default function ShopAppBar({
  query = '',
  onQueryChange,
  backTo,
  title,
  subtitle,
}) {
  const navigate = useNavigate()
  const { cartCount, cartPath } = useCart()
  const { cityRecord } = useCity()
  const reduced = useReducedMotion()
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const barRef = useRef(null)

  // React Router's own position counter; 0 means this entry opened the
  // session, so `navigate(-1)` would drop the visitor out of the app.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  // Publish the bar's real height as a custom property, so anything that has
  // to stick underneath it (the category filter row) can position against a
  // measurement instead of a magic number. The bar's height changes with the
  // notch inset, the search field's presence and the browser's font size —
  // three things a hardcoded `top-[7.75rem]` gets wrong on somebody's phone,
  // leaving either a gap or a filter row hidden behind the search box.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty('--shop-appbar-h', `${el.offsetHeight}px`)
    }
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || focused || query) return
    const id = setInterval(() => setHint(h => (h + 1) % SEARCH_HINTS.length), 2600)
    return () => clearInterval(id)
  }, [reduced, focused, query])

  return (
    <header ref={barRef} className="shop-appbar sticky top-0 z-40 pt-safe backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
        {/* ── Row 1: where to, who we are, what's in the bag ── */}
        <div className="flex items-center gap-3">
          {backTo ? (
            // Real navigation, not a fixed destination. `backTo="/shop"` on the
            // product page sent Shop → Cakes → a product → back to the *shop
            // root*, losing the shelf and the filters the customer had set;
            // it is the fallback for a cold open (a shared link, a refresh),
            // where there is nothing behind this entry to return to.
            canGoBack ? (
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="-ml-1 tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-surface-sunk/[0.07]"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Link
                to={backTo}
                aria-label="Back"
                className="-ml-1 tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-surface-sunk/[0.07]"
              >
                <ArrowLeft size={20} />
              </Link>
            )
          ) : (
            <SambramoMark size={30} className="shrink-0" />
          )}

          {title ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold leading-tight text-ink">{title}</p>
              {subtitle && <p className="truncate text-[11px] text-ink-mute">{subtitle}</p>}
            </div>
          ) : (
            /* The same control as the home bar, in the same slot, opening the
               same sheet. It used to be a static <p> printing the hardcoded
               BRAND.primaryCity with no chevron — so the storefront asserted a
               delivery city the shopper had never chosen and could not change,
               while the home screen two taps away drew a chevron next to it.

               Naming the chosen city rather than the pilot list matters most
               here: "Delivering across Bengaluru & Mysore" is true of the
               company but says nothing about *this* cart, and letting someone
               fill one before finding out at the address field is how a
               basket gets abandoned. */
            <CityButton
              subtitle={
                cityRecord
                  ? `Delivering across ${cityRecord.name}`
                  : `Delivering across ${BRAND.pilotCities.join(' & ')}`
              }
            />
          )}

          <Link
            to={cartPath}
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            className="relative tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 active:scale-95 transition-transform"
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-chilli-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-[color:var(--bar)]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* ── Row 2: search ── */}
        {onQueryChange && (
          <div className="relative mt-3">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forest-600" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              type="search"
              enterKeyHint="search"
              aria-label="Search the shop"
              placeholder={focused ? 'Search cakes, gifts, flowers…' : `Search "${SEARCH_HINTS[hint]}"`}
              className="h-12 w-full rounded-2xl bg-white pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.8)] outline-none ring-2 ring-transparent focus:ring-saffron-400"
            />
            {/* Clear when there is something to clear, microphone when there
                is not — the same swap home makes, because it is the same
                field doing the same job in a different room. */}
            {query ? (
              <button
                onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                <X size={14} />
              </button>
            ) : (
              <VoiceSearchButton
                onResult={onQueryChange}
                tint="text-forest-600 active:bg-forest-50"
              />
            )}
          </div>
        )}
      </div>
    </header>
  )
}
