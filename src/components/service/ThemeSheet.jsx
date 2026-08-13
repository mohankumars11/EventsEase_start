import { useState, useEffect } from 'react'
import { X, Check, Plus, Sparkles, MapPin, ShoppingCart } from 'lucide-react'
import OptionArt from './OptionArt'
import ImageSourceBadge from '../shop/ImageSourceBadge'
import { themeCost, DECOR_SCALES } from '../../data/decorThemes'
import { DECOR_ADDONS } from '../../data/decorPackages'
import { THEME_PHOTOS } from '../../config/generatedServicePhotos'
import { formatINR } from '../../utils/format'

/**
 * The setup, opened — and the last screen before it is in the cart.
 *
 * ── Why a sheet rather than a route ─────────────────────────────────────
 * The grid is the shop and this is the shelf-edge: people open three or four
 * setups before choosing one, and a full page navigation for each loses their
 * scroll position and their place in the family they were browsing. A sheet
 * closes back to exactly where they were.
 *
 * ── What it has to do that the card cannot ──────────────────────────────
 *   the full inclusion list      what a crew actually installs, all of it
 *   the scale, changeable here   somebody may have opened this before
 *                                answering "how big", and making them close
 *                                the sheet to change it loses the sale
 *   the extras                   the fourteen add-ons a decorator would
 *                                otherwise ring about three days beforehand
 *   the arithmetic               installation + table work + extras, itemised,
 *                                so the total is a sum and not an assertion
 */
export default function ThemeSheet({
  theme, scaleId, guestCount, onScale, onClose, onAdd, added,
}) {
  const [addonIds, setAddonIds] = useState([])

  // A different setup is a different booking — carrying the previous one's
  // extras into it would silently add a ₹45,000 LED wall to a candlelit dinner.
  useEffect(() => { setAddonIds([]) }, [theme?.id])

  // The sheet covers the page; the page behind it must not scroll under it.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!theme) return null

  const photo = THEME_PHOTOS[theme.id]
  const cost = themeCost(theme, scaleId, guestCount)
  const addons = DECOR_ADDONS.filter(a => addonIds.includes(a.id))
  const addonTotal = addons.reduce((sum, a) => sum + a.price, 0)
  const total = cost.total + addonTotal

  function toggleAddon(id) {
    setAddonIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
  }

  const summary = [
    `${theme.name} — ${cost.scale.name.toLowerCase()}, ${guestCount} guests`,
    ...addons.map(a => `Add-on: ${a.name}`),
  ]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="animate-fade-in-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        {/* ── The picture and the name ───────────────────────────── */}
        <div className="relative shrink-0">
          <OptionArt
            tint={theme.tint}
            emoji={theme.emoji}
            height={168}
            seed={theme.name.length}
            photo={photo}
            alt={`${theme.name} — representative photograph of a similar setup`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
            >
              <X size={16} />
            </button>
            {/* Says on the photograph itself that it is a lookalike, not our
                portfolio. Sambramo has delivered nothing yet; a reference photo
                a customer could mistake for our own work is the one thing this
                badge exists to prevent — same component, same words, as every
                product tile in the shop. */}
            {photo?.url && (
              <ImageSourceBadge source={photo.source} size="sm" className="absolute left-3 top-3" />
            )}
          </OptionArt>
          <div className="absolute bottom-0 left-0 right-12 p-3.5">
            <h2 className="font-serif text-[19px] font-bold leading-tight text-white drop-shadow-sm">
              {theme.name}
            </h2>
          </div>
        </div>

        {/* ── The detail ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-[12.5px] leading-relaxed text-gray-600">{theme.blurb}</p>

          {theme.bestFor?.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
              <MapPin size={11} className="text-gray-400" />
              Booked most for:
              {theme.bestFor.map(b => (
                <span key={b} className="rounded-md bg-plum-50 px-1.5 py-0.5 font-bold text-plum-700">
                  {b}
                </span>
              ))}
            </p>
          )}

          {/* ── Scale, changeable without leaving ─────────────────── */}
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              1 · How big is the room — this is what moves the price
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DECOR_SCALES.map(s => {
                const active = s.id === scaleId
                const c = themeCost(theme, s.id, guestCount)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onScale(s.id)}
                    aria-pressed={active}
                    className={`rounded-2xl p-2.5 text-left ring-1 transition-all ${
                      active ? 'bg-plum-50 ring-2 ring-plum-500' : 'bg-white ring-gray-200'
                    }`}
                  >
                    <span className="block text-[13px]" aria-hidden="true">{s.emoji}</span>
                    <span className="mt-0.5 block text-[11.5px] font-extrabold leading-tight text-gray-900">
                      {s.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-extrabold text-plum-700">
                      {formatINR(c.total)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── What gets installed ──────────────────────────────── */}
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              2 · What our crew installs
            </p>
            <ul className="space-y-1.5 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
              {theme.includes.map(line => (
                <li key={line} className="flex items-start gap-2 text-[12px] leading-snug text-gray-700">
                  <Check size={12} className="mt-[3px] shrink-0 text-green-600" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* ── The extras ───────────────────────────────────────── */}
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              3 · Anything else — decided here, not by phone three days before
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DECOR_ADDONS.map(a => {
                const on = addonIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAddon(a.id)}
                    aria-pressed={on}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left ring-1 transition-colors ${
                      on ? 'bg-saffron-50 ring-saffron-300' : 'bg-white ring-gray-200'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        on ? 'bg-saffron-400 text-plum-950' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {on ? <Check size={12} strokeWidth={3.5} /> : <Plus size={12} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold leading-snug text-gray-800">{a.name}</span>
                      {a.note && <span className="block text-[10px] text-gray-400">{a.note}</span>}
                    </span>
                    <span className="shrink-0 text-[12px] font-extrabold text-gray-600">
                      +{formatINR(a.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── The arithmetic ───────────────────────────────────── */}
          <div className="mt-4 rounded-2xl bg-plum-950 p-3.5 text-white">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-saffron-300">
              <Sparkles size={11} /> What the number is made of
            </p>
            <dl className="mt-2 space-y-1 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Installation ({cost.scale.name.toLowerCase()})</dt>
                <dd className="font-bold">{formatINR(cost.installation)}</dd>
              </div>
              {cost.tableWork > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/60">Table & seating work × {guestCount}</dt>
                  <dd className="font-bold">{formatINR(cost.tableWork)}</dd>
                </div>
              )}
              {addons.map(a => (
                <div key={a.id} className="flex justify-between gap-3">
                  <dt className="truncate text-white/60">{a.name}</dt>
                  <dd className="font-bold">{formatINR(a.price)}</dd>
                </div>
              ))}
              <div className="mt-1.5 flex justify-between gap-3 border-t border-white/15 pt-1.5 text-[14px]">
                <dt className="font-extrabold">Estimated total</dt>
                <dd className="font-extrabold text-saffron-300">{formatINR(total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[9.5px] leading-snug text-white/40">
              Setup and clearing by our team are included. Estimate for a Bengaluru /
              Mysore date — a coordinator confirms against your venue before booking.
            </p>
          </div>
        </div>

        {/* ── One way out ──────────────────────────────────────────
            This had "Add to cart" and "Book this" side by side — two buttons
            for one intention, differing only in where they navigate
            afterwards. That is a question about our routing, asked of somebody
            who has just finished deciding what they want, and the usual answer
            to it is hesitation. One action now; what happens next is the
            *result*, not a second thing to choose. See BookBar. */}
        <div className="shrink-0 border-t border-gray-100 bg-white p-3 pb-safe">
          {added ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-green-50 px-3.5 py-3 ring-1 ring-green-200">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                <Check size={15} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold leading-tight text-green-800">
                  Added — {formatINR(total)}
                </span>
                <span className="block text-[11px] leading-snug text-green-700/70">
                  Close this and keep browsing, or send it from your cart.
                </span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl bg-white px-3 py-2 text-[12px] font-extrabold text-green-800 ring-1 ring-green-200"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdd({ theme, total, summary, addons })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-3 py-3.5 text-[14px] font-extrabold text-plum-950 transition-transform active:scale-[0.98]"
            >
              <ShoppingCart size={16} /> Add to cart · {formatINR(total)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
