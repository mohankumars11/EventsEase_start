/**
 * The package cards, for every trade and on both surfaces.
 *
 * ── Why this exists ─────────────────────────────────────────────────
 * The Essential/Signature/VIP card was written four times:
 *
 *   anchor/StepsCommercial.jsx   the good one -- embla, tier icons,
 *                                scale/fade on select, badge, edit, dots
 *   listing/stages.jsx           a plainer control, for 32 trades
 *   catering/Services.jsx        a third, with its own tier names
 *   pricing/PricingControlCenter a fourth, a snap row
 *
 * and on the Pricing tab the 32 engine trades got none of them -- they
 * got <Section title="Packages"> with a <Line k={name} v={price}/>, a
 * flat text list, where Anchor & MC got the carousel. Same partner, same
 * app, two different ideas of what a package is.
 *
 * This is StepsCommercial's treatment, lifted, parameterised, and used
 * by all of them. It is deliberately presentational: it takes a
 * normalised list and renders it. Where the numbers come from -- a draft
 * in local state, a published listing version, a catering menu -- stays
 * the caller's business.
 *
 * ── What it shows, and what it must never show ──────────────────────
 * The headline figure is THE PARTNER'S OWN RATE, and it is labelled as
 * such. The Anchor card used to print the customer price at 32px with
 * "Customer price · you receive X" under it. A partner-facing screen
 * showing a customer total derived from the platform fee is the exact
 * disclosure the pricing brief removes: the fee is the platform's
 * business, the rate is theirs. So: one figure, theirs, named.
 */
import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'motion/react'
import { Pencil, Check, X, Lock, RefreshCw, ChevronRight } from 'lucide-react'
import { lookFor, isFeatured } from './tierLook'
import { rupees } from '../../../lib/tierPackages'

/* A package the carousel can draw. Callers normalise into this.
 *   key        ESSENTIAL | SIGNATURE | VIP | PREMIUM | anything
 *   name       'Signature'
 *   ratePaise  the PARTNER's rate, in paise
 *   unit       'per event' | 'per plate' | 'per hour' ...
 *   meta       '4 hours' | '150 guests'            (optional chip)
 *   inclusions [{ id, label, included }]           (optional)
 *   badge      'Most popular'                      (optional)
 *   edited     true once the partner changed it    (optional)
 *   status     'In review' | 'Live' | ...          (optional chip)
 */

function StatusChip({ status }) {
  if (!status) return null
  const tone = /live|approved|published/i.test(status)
    ? 'bg-forest-50 text-forest-700 ring-forest-200'
    : /reject|change|action/i.test(status)
      ? 'bg-chilli-50 text-chilli-700 ring-chilli-200'
      : 'bg-saffron-50 text-saffron-800 ring-saffron-200'
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${tone}`}>
      {status}
    </span>
  )
}

export function PackageCard({
  pkg, active = true, editable, onEdit, onViewDetails, compact = false,
  onEditPrice, priceEditLocked = false, priceEditDate = null, pricePolicyLabel = '15-day policy',
}) {
  const look = lookFor(pkg.key)
  const Icon = look.icon
  const visibleInclusions = compact ? (pkg.inclusions ?? []).slice(0, 3) : (pkg.inclusions ?? [])
  const hiddenInclusions = Math.max(0, (pkg.inclusions?.length ?? 0) - visibleInclusions.length)
  return (
    <motion.div
      animate={{ scale: active ? 1 : 0.96, opacity: active ? 1 : 0.72 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative flex h-full flex-col rounded-[24px] bg-gradient-to-b ${look.from} to-white ${compact ? 'p-4' : 'p-5'} ring-1 ${isFeatured(pkg.key) ? 'ring-2' : ''} ${look.ring}`}
    >
      {pkg.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-plum-600 to-fuchsia-500 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg">
          ★ {pkg.badge}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`flex ${compact ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'} shrink-0 items-center justify-center bg-white ${look.tint} shadow-sm`}>
            <Icon size={compact ? 16 : 18} />
          </span>
          <span className={`truncate font-extrabold text-ink ${compact ? 'text-[15px]' : 'text-[17px]'}`}>{pkg.name}</span>
        </span>
        {editable
          ? (
            <button type="button" aria-label={`Edit ${pkg.name}`} onClick={() => onEdit?.(pkg)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink/60 shadow-sm">
              <Pencil size={15} />
            </button>
          )
          : <StatusChip status={pkg.status} />}
      </div>

      {/* The partner's rate, named as theirs. Never a customer total. */}
      <p className={`break-words font-extrabold leading-none tracking-tight text-ink ${compact ? 'mt-3 text-[27px]' : 'mt-4 text-[30px]'}`}>{Number(pkg.ratePaise) > 0 ? rupees(pkg.ratePaise) : 'Price on request'}</p>
      <p className="mt-1 text-[12px] font-bold text-ink/50">
        {Number(pkg.ratePaise) > 0 ? 'Your rate' : 'Saved rate not available'}{Number(pkg.ratePaise) > 0 && pkg.unit ? ' · ' + pkg.unit : ''}
      </p>

      {pkg.meta && (
        <span className={`inline-flex self-start rounded-full bg-white px-3 py-1 font-extrabold text-ink/70 ring-1 ring-ink/[0.07] ${compact ? 'mt-2 text-[11px]' : 'mt-3 text-[12px]'}`}>
          {pkg.meta}
        </span>
      )}

      {/* The core deliverable, always ticked, always first.
          Essential's inclusion list is legitimately empty -- it is the
          tier with no extras -- and an empty list rendered an empty
          card: a package with a price and nothing under it. Naming what
          the base tier actually buys is the difference between "no
          add-ons" and "nothing". */}
      {(pkg.base || !pkg.inclusions?.length) && (
        <div className={compact ? 'mt-3' : 'mt-4'}>
          <p className={`flex items-center gap-2 font-bold text-ink ${compact ? 'text-[12px]' : 'text-[12.5px]'}`}>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
              <Check size={10} strokeWidth={3.5} />
            </span>
            <span className="min-w-0">{pkg.base ?? 'Core service'}</span>
          </p>
        </div>
      )}

      {!!visibleInclusions.length && (
        <div className={`space-y-1.5 ${compact ? 'mt-2' : 'mt-2'}`}>
          {visibleInclusions.map(inc => (
            <p key={inc.id}
              className={`flex items-center gap-2 ${compact ? 'text-[12px]' : 'text-[12.5px]'} ${inc.included ? 'font-bold text-ink' : 'text-ink/35 line-through'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${inc.included ? 'bg-forest-600 text-white' : 'bg-ink/10 text-ink/40'}`}>
                {inc.included ? <Check size={10} strokeWidth={3.5} /> : <X size={10} strokeWidth={3} />}
              </span>
              <span className="min-w-0 line-clamp-1">{inc.label}</span>
            </p>
          ))}
          {hiddenInclusions > 0 && <p className="pl-6 text-[11px] font-semibold text-plum-700">+{hiddenInclusions} more inclusions</p>}
        </div>
      )}

      {pkg.edited && (
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-plum-600">Edited by you</p>
      )}

      {compact ? (
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          {onViewDetails ? (
            <button type="button" onClick={() => onViewDetails(pkg)}
              className="inline-flex min-w-0 items-center gap-0.5 pb-1 text-[12px] font-extrabold text-plum-700">
              View details <ChevronRight size={14} />
            </button>
          ) : <span />}
          {onEditPrice ? (
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button type="button" disabled={priceEditLocked} onClick={() => onEditPrice(pkg)}
                aria-label={priceEditLocked ? `Price editing locked for ${pkg.name}` : `Edit price for ${pkg.name}`}
                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-plum-200 bg-white px-2.5 text-[11.5px] font-extrabold text-plum-700 shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-ink/[0.03] disabled:text-ink/45">
                {priceEditLocked ? <Lock size={12} /> : <Pencil size={12} />} Edit price
              </button>
              <span className="text-[9.5px] font-semibold text-ink/45">{priceEditLocked && priceEditDate ? `Unlocks ${priceEditDate}` : pricePolicyLabel}</span>
            </div>
          ) : null}
        </div>
      ) : onViewDetails ? (
        <button type="button" onClick={() => onViewDetails(pkg)}
          className="mt-4 inline-flex items-center gap-1 self-start text-[13px] font-extrabold text-plum-700">
          View details <ChevronRight size={15} />
        </button>
      ) : null}
    </motion.div>
  )
}

export default function PackageCarousel({
  packages = [],
  editable = false,
  onEdit,
  onEditPrice,
  priceEditLocked = false,
  priceEditDate = null,
  pricePolicyLabel = '15-day policy',
  compact = false,
  onViewDetails,
  onReset,
  resetLabel = 'Reset to generated prices',
  startIndex = 1,
}) {
  const start = Math.min(startIndex, Math.max(packages.length - 1, 0))
  const [emblaRef, embla] = useEmblaCarousel({ align: 'center', startIndex: start, containScroll: false })
  const [sel, setSel] = useState(start)

  const onSelect = useCallback(() => embla && setSel(embla.selectedScrollSnap()), [embla])
  useEffect(() => {
    if (!embla) return
    onSelect()
    embla.on('select', onSelect)
    return () => embla.off('select', onSelect)
  }, [embla, onSelect])

  if (!packages.length) return null

  return (
    <div data-package-carousel>
      <div className="-mx-4 overflow-hidden pb-2 pt-4" ref={emblaRef}>
        {/* items-stretch so three cards with different inclusion counts
            end level instead of stepping down the row. */}
        <div className="flex touch-pan-y items-stretch">
          {packages.map((p, i) => (
            <div key={p.key ?? p.name ?? i} className="min-w-0 shrink-0 grow-0 basis-[78%] px-1.5">
              <PackageCard pkg={p} active={i === sel} editable={editable}
                compact={compact} onEditPrice={onEditPrice} priceEditLocked={priceEditLocked}
                priceEditDate={priceEditDate} pricePolicyLabel={pricePolicyLabel}
                onEdit={onEdit} onViewDetails={onViewDetails} />
            </div>
          ))}
        </div>
      </div>

      {packages.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {packages.map((p, i) => (
            <button key={p.key ?? p.name ?? i} type="button" aria-label={`Show ${p.name}`}
              onClick={() => embla?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${i === sel ? 'w-6 bg-plum-700' : 'w-2 bg-ink/15'}`} />
          ))}
        </div>
      )}

      {onReset && (
        <button type="button" onClick={onReset}
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200">
          <RefreshCw size={14} /> {resetLabel}
        </button>
      )}
    </div>
  )
}
