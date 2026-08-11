import { useState, useMemo, useEffect } from 'react'
import { X, Minus, Plus, Check, Info, Leaf } from 'lucide-react'
import { formatINR } from '../../utils/format'
import {
  buildOptionGroups, defaultSelections, computeOrder, selectionSignature,
} from '../../config/customizers'
import { cakeFacts } from '../../data/cakeStyles'
import ProductImage from './ProductImage'
import ImageSourceBadge from './ImageSourceBadge'
import FulfilmentNote from './FulfilmentNote'

/**
 * Configure a product before it goes in the cart.
 *
 * These are not things you add — they are things you specify. A cake has a
 * weight, a flavour, an egg preference and a message piped on top; a balloon
 * arch has a colour theme and the question of who climbs the ladder; a havan
 * kit has a tradition, a muhurat and a gotra for the sankalp; a hamper has a
 * tier and a handwritten card. Every one of those is a decision the customer
 * has to make, the fulfiller has to be told, and most of them change the
 * price. CustomizeModal — a quantity stepper and one free-text box — cannot
 * carry any of it.
 *
 * The sheet itself knows none of those specifics. It renders whatever
 * `buildOptionGroups` returns for the product's category, so a new category
 * is a new builder and nothing here changes.
 *
 * ── Why the price is in the button ─────────────────────────────────────
 * Every selection updates the total on the confirm button itself, live. The
 * alternative — reveal the real number in the cart — is how a ₹899 cake shows
 * up as ₹1,412 two screens later, and the customer is right to be annoyed.
 *
 * ── Why it is a bottom sheet ───────────────────────────────────────────
 * There can be a dozen groups. A centred dialog with that much inside it
 * becomes a scrolling box floating in the middle of a scrolling page on a
 * phone, where most of this shop is used. The sheet pins the header and the
 * total to the frame and lets only the options move.
 */
export default function ProductCustomizeSheet({ product, onClose, onConfirm }) {
  const groups = useMemo(() => buildOptionGroups(product), [product])
  const [selections, setSelections] = useState(() => defaultSelections(groups))
  const [qty, setQty] = useState(1)

  // Cake-only facts (veg mark, serving size). Everything else in this sheet is
  // category-agnostic; these two are worth the special case because they are
  // the first things a cake buyer looks for.
  const facts = useMemo(() => (product.category === 'Cakes' ? cakeFacts(product) : null), [product])
  const order = useMemo(
    () => computeOrder(product, groups, selections),
    [product, groups, selections]
  )

  // Esc closes, and the sheet owns the page's scroll while it is open —
  // without this the list behind it scrolls under your finger on mobile.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  function pickSingle(groupId, optionId) {
    setSelections(s => ({ ...s, [groupId]: optionId }))
  }

  function toggleMulti(group, optionId) {
    setSelections(s => {
      const current = s[group.id] ?? []
      if (current.includes(optionId)) {
        return { ...s, [group.id]: current.filter(id => id !== optionId) }
      }
      // At the cap, the tick is refused rather than silently dropping the
      // oldest choice — the customer picked both of those on purpose.
      if (group.max && current.length >= group.max) return s
      return { ...s, [group.id]: [...current, optionId] }
    })
  }

  function confirm() {
    onConfirm({
      qty,
      unitPrice: order.unitPrice,
      selections,
      lines: order.lines,
      signature: selectionSignature(selections),
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Customise ${product.name}`}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative shrink-0">
          <ProductImage
            src={product.image_url}
            query={product.name}
            emoji={product.emoji}
            alt={product.image_alt || product.name}
            className="w-full h-32 sm:h-40 sm:rounded-t-3xl rounded-t-3xl"
            scrim
          >
            <ImageSourceBadge source={product.image_source} size="sm" className="absolute bottom-2 left-3" />
          </ProductImage>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-2">
            {facts?.veg && <VegMark className="mt-1" />}
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 leading-snug">{product.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {[product.occasion, facts?.serves, facts?.pieces && `${facts.pieces} pieces`]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Options ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {groups.map(group => (
            <OptionGroup
              key={group.id}
              group={group}
              selection={selections[group.id]}
              onPickSingle={optionId => pickSingle(group.id, optionId)}
              onToggleMulti={optionId => toggleMulti(group, optionId)}
              onText={value => setSelections(s => ({ ...s, [group.id]: value }))}
            />
          ))}

          <FulfilmentNote variant="card" />
        </div>

        {/* ── Total ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4 space-y-3 bg-white sm:rounded-b-3xl">
          {order.addOnTotal > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatINR(order.base)} cake + {formatINR(order.addOnTotal)} extras</span>
              <span className="font-semibold text-gray-700">{formatINR(order.unitPrice)} each</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 border-gray-200 rounded-xl shrink-0">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Reduce quantity"
                className="p-2.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                <Minus size={15} />
              </button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                aria-label="Increase quantity"
                className="p-2.5 text-gray-500 hover:text-gray-800"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={confirm}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold shadow-sm transition-colors"
            >
              Add to cart · {formatINR(order.unitPrice * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── One group of options ─────────────────────────────────────────────── */
function OptionGroup({ group, selection, onPickSingle, onToggleMulti, onText }) {
  if (group.type === 'info') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
        <Info size={14} className="text-gray-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-gray-600">{group.label}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{group.text}</p>
        </div>
      </div>
    )
  }

  const chosen = Array.isArray(selection) ? selection : []
  const atCap  = group.type === 'multi' && group.max && chosen.length >= group.max

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="text-sm font-bold text-gray-900">{group.label}</h4>
        <span className="text-[11px] text-gray-400 shrink-0">
          {group.required ? 'Required' : group.type === 'multi' && group.max ? `Up to ${group.max}` : 'Optional'}
        </span>
      </div>
      {group.hint && <p className="text-xs text-gray-400 -mt-1.5 mb-2">{group.hint}</p>}

      {group.type === 'text' ? (
        <div>
          <input
            value={selection ?? ''}
            onChange={e => onText(e.target.value.slice(0, group.maxLength))}
            placeholder={group.placeholder}
            maxLength={group.maxLength}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400"
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">
            {(selection ?? '').length}/{group.maxLength}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {group.options.map(option => {
            const isMulti  = group.type === 'multi'
            const selected = isMulti ? chosen.includes(option.id) : selection === option.id
            // A capped group greys out only what isn't already ticked, so the
            // customer can still change their mind without hunting for which
            // box to clear.
            const blocked  = isMulti && atCap && !selected

            return (
              <button
                key={option.id}
                type="button"
                disabled={blocked}
                onClick={() => (isMulti ? onToggleMulti(option.id) : onPickSingle(option.id))}
                className={[
                  'w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors',
                  selected ? 'border-saffron-400 bg-saffron-50' : 'border-transparent hover:bg-gray-50',
                  blocked ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'shrink-0 w-4 h-4 border-2 flex items-center justify-center',
                    isMulti ? 'rounded' : 'rounded-full',
                    selected ? 'border-saffron-500 bg-saffron-500 text-white' : 'border-gray-300',
                  ].join(' ')}
                >
                  {selected && <Check size={11} strokeWidth={3.5} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-800 leading-snug">{option.label}</span>
                  {option.note && <span className="block text-[11px] text-gray-400 mt-0.5">{option.note}</span>}
                </span>

                {/* Grey is reserved for "this costs nothing". A weight option
                    always shows a real price, so keying the colour on
                    `option.price` — which is the *delta* and is 0 for the
                    cake's own size — printed the selected weight's ₹1,199 in
                    disabled grey. */}
                <span className={`shrink-0 text-xs font-semibold ${
                  option.absolute != null || option.price ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {option.absolute != null
                    ? formatINR(option.absolute)
                    : option.price
                      ? `+${formatINR(option.price)}`
                      : 'Free'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

// The green-square-in-a-box mark every Indian food listing uses for "no egg,
// no meat". Recognised instantly, and the one thing customers check first.
export function VegMark({ className = '' }) {
  return (
    <span
      title="Eggless — pure veg"
      aria-label="Eggless, pure veg"
      className={`inline-flex items-center justify-center w-3.5 h-3.5 border border-green-600 rounded-[3px] shrink-0 ${className}`}
    >
      <Leaf size={8} className="text-green-600" fill="currentColor" />
    </span>
  )
}
