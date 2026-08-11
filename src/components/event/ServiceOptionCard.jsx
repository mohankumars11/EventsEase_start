import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, ChevronDown, ShoppingCart, Star, Sparkles, ArrowRight, Leaf, Info,
} from 'lucide-react'
import { serviceOptionsFor, optionCountFor } from '../../data/serviceOptions'
import { CUISINES, CUISINE_GROUPS, CUISINE_BY_ID, COURSES, dishesFor } from '../../data/cuisineMenus'
import { VISIBLE_DECOR_LEVELS, DECOR_THEMES, DECOR_ADDONS } from '../../data/decorPackages'
import { serviceCost, serviceUnitLabel, defaultQty } from '../../data/servicePricing'
import { perPlateFor, decorCostFor } from '../../utils/quote'
import { formatINR } from '../../utils/format'
import RatingBadge from '../reviews/RatingBadge'

/**
 * One service, opened up.
 *
 * ── What this replaces ──────────────────────────────────────────────────
 * A row: emoji, name, one line of description, "Add to Cart". For most of the
 * catalogue that row was the entire offer, and for the three services people
 * care most about it was actively misleading — "Catering & Buffet — Full
 * buffet, live counters, multi-cuisine" is a category label pretending to be a
 * product. Somebody deciding between us and the caterer their neighbour used
 * is deciding on the food, and the page would not show them the food.
 *
 * So every service opens, and what is inside comes from the real catalogue:
 * the cuisines and their dish lists, the decor ladder and what each level
 * installs, or the curated option list in serviceOptions.js. "Add to Cart" is
 * still there; it is now the last thing on the card rather than the only thing
 * on it.
 *
 * ── Nothing in here is a form ───────────────────────────────────────────
 * The options are shown, not collected. A customer ticking forty dishes on a
 * catalogue page and then being asked to do it again in the builder would be
 * the worst of both screens, and this page has no quote engine attached to
 * hold the answers. The tick marks say "this is what comes as standard at your
 * size"; the builder is where choices are actually made and priced, and every
 * expanded card offers a route into it.
 *
 * `guestCount` is the page's headcount, and every number rendered here is
 * computed at it — a per-plate rate at forty guests is genuinely not the rate
 * at four hundred, and showing one figure for both is the thing that makes a
 * customer feel quoted at rather than priced.
 */
export default function ServiceOptionCard({
  service, eventId, guestCount, vegOnly, inCart, onAdd,
  reviewEnquiryId, onReview, index = 0,
}) {
  const [open, setOpen] = useState(false)
  const options = serviceOptionsFor(service.id)

  return (
    <div
      className="event-card rise-in"
      style={{ '--rise-delay': `${Math.min(index, 12) * 45}ms` }}
    >
      {/* ── The row ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => options && setOpen(o => !o)}
        aria-expanded={options ? open : undefined}
        disabled={!options}
        className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
          options ? 'hover:bg-gray-50' : 'cursor-default'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-xl ring-1 ring-black/5">
          {service.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-extrabold leading-tight text-gray-900">{service.name}</span>
            <RatingBadge subjectType="service" subjectId={service.id} />
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-gray-500">{service.desc}</span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <PriceHint options={options} guestCount={guestCount} />
            {options && (
              <span className="event-tint inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
                <Sparkles size={9} />
                {optionsLabel(service.id, options)}
              </span>
            )}
          </span>
        </span>

        {options && (
          <span className="mt-1 shrink-0 text-gray-300">
            <ChevronDown
              size={18}
              className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        )}
      </button>

      {/* ── What is actually inside it ─────────────────────────── */}
      {open && options && (
        <div className="animate-fade-in border-t border-gray-100 bg-gray-50/70 px-4 py-4">
          {options.blurb && (
            <p className="mb-3.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-gray-600">
              <Info size={12} className="mt-0.5 shrink-0 text-gray-400" />
              {options.blurb}
            </p>
          )}

          {options.kind === 'menu' && (
            <MenuOptions serviceId={service.id} guestCount={guestCount} vegOnly={vegOnly} />
          )}
          {options.kind === 'decor' && <DecorOptions guestCount={guestCount} />}
          {options.kind === 'list' && <ListOptions groups={options.groups} />}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3.5">
            <Link
              to={`/plan/build/${eventId}?guests=${guestCount}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-extrabold text-white transition-transform active:scale-95"
              style={{ background: 'var(--event-ink)' }}
            >
              Configure &amp; price this <ArrowRight size={13} />
            </Link>
            {options.deepLink && (
              <Link
                to={options.deepLink.to}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-bold text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
              >
                {options.deepLink.label} <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── The actions ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5">
        {reviewEnquiryId ? (
          <button
            onClick={onReview}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700"
          >
            <Star size={11} /> Rate &amp; review
          </button>
        ) : (
          <span className="text-[11px] text-gray-400">Arranged and coordinated by Sambramo</span>
        )}

        <button
          onClick={() => !inCart && onAdd()}
          disabled={inCart}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-extrabold transition-transform active:scale-95 ${
            inCart
              ? 'cursor-default bg-green-50 text-green-700 ring-1 ring-green-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
          {inCart ? 'Added' : 'Add to enquiry'}
        </button>
      </div>
    </div>
  )
}

/** "16 options" / "16 cuisines" / "5 decor levels" — what opening this gets you. */
function optionsLabel(serviceId, options) {
  if (options.kind === 'menu') return `${CUISINES.length} cuisines, every dish listed`
  if (options.kind === 'decor') return `${VISIBLE_DECOR_LEVELS.length} levels · ${DECOR_THEMES.length} looks`
  const n = optionCountFor(serviceId)
  return n ? `${n} options` : 'See what is included'
}

/**
 * What this service costs at this guest count.
 *
 * The food and decor services have no entry in servicePricing.js — they are
 * priced by the menu and the decor ladder — so they say where their number
 * comes from instead of showing a misleading one.
 *
 * ── The rate and the total are different numbers ────────────────────────
 * This is the exact bug the whole catalogue used to have, and it is easy to
 * reintroduce: serviceCost() returns the TOTAL, serviceUnitLabel() describes
 * the RATE, and printing one against the other rendered "≈ ₹14,400 per guest"
 * for a dining setup that costs ₹120 a head. A per-guest service therefore
 * states its rate first and its total second, explicitly against the headcount
 * on screen; a per-unit service states how many units it needs and why. Only a
 * fixed-price service has a single number, and it says so.
 */
function PriceHint({ options, guestCount }) {
  const pricing = options?.pricing
  if (!pricing) {
    return (
      <span className="text-[11px] font-bold text-gray-500">
        {options?.kind === 'menu' ? 'Priced per plate' : options?.kind === 'decor' ? 'Priced by level' : 'Custom quote'}
      </span>
    )
  }

  const total = serviceCost(pricing, guestCount)

  if (pricing.unit === 'per_guest') {
    return (
      <span className="text-[11px] font-bold text-gray-700">
        {formatINR(pricing.base)} <span className="font-medium text-gray-400">per guest —</span>{' '}
        ≈ {formatINR(total)} <span className="font-medium text-gray-400">for {guestCount}</span>
      </span>
    )
  }

  if (pricing.unit === 'per_unit') {
    const qty = defaultQty(pricing, guestCount)
    return (
      <span className="text-[11px] font-bold text-gray-700">
        ≈ {formatINR(total)}{' '}
        <span className="font-medium text-gray-400">
          — {qty} {pricing.unitLabel ?? 'unit'}{qty === 1 ? '' : 's'} at {formatINR(pricing.base)} each
        </span>
      </span>
    )
  }

  return (
    <span className="text-[11px] font-bold text-gray-700">
      ≈ {formatINR(total)}{' '}
      <span className="font-medium text-gray-400">{serviceUnitLabel(pricing)}</span>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Food — the cuisines, and every dish under them
═══════════════════════════════════════════════════════════ */

/**
 * The answer to "what will you actually serve".
 *
 * A cuisine chip row, then the full spread for whichever is selected: seven
 * courses, every dish in each. This is the single biggest thing the old page
 * was missing — the catalogue held 16 cuisines and several hundred dishes, and
 * a customer browsing services could see none of it.
 */
function MenuOptions({ serviceId, guestCount, vegOnly }) {
  const [cuisineId, setCuisineId] = useState(CUISINES[0].id)
  const [showVegOnly, setShowVegOnly] = useState(vegOnly)
  const cuisine = CUISINE_BY_ID[cuisineId] ?? CUISINES[0]

  const plate = perPlateFor({
    cuisine, menu: {}, menuAllowance: {}, vegOnly: showVegOnly || !cuisine.hasNonVeg, guestCount,
  })

  // Welcome drinks are their own service, so that card shows only that course.
  const courses = serviceId === 'welcome_drinks'
    ? COURSES.filter(c => c.id === 'welcome')
    : COURSES

  return (
    <div className="space-y-3.5">
      {/* Cuisine picker, grouped by region — sixteen in a flat row is a scroll,
          not a choice. */}
      <div className="space-y-2">
        {CUISINE_GROUPS.map(group => (
          <div key={group.label}>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.ids.map(id => {
                const c = CUISINE_BY_ID[id]
                if (!c) return null
                const active = id === cuisineId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCuisineId(id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      active ? 'text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300'
                    }`}
                    style={active ? { background: 'var(--event-ink)' } : undefined}
                  >
                    <span aria-hidden="true">{c.emoji}</span> {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* The chosen cuisine, and what a plate of it costs at this size. */}
      <div className="rounded-2xl bg-white p-3.5 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-gray-900">
              {cuisine.emoji} {cuisine.name}
              {cuisine.localName && (
                <span className="ml-1.5 text-[11px] font-medium italic text-gray-400">{cuisine.localName}</span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{cuisine.blurb}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-gray-50 px-2.5 py-1.5 text-right ring-1 ring-gray-100">
            <p className="text-[9px] uppercase tracking-wide text-gray-400">Per plate</p>
            <p className="text-[13px] font-extrabold text-gray-900">≈ {formatINR(plate.perPlate)}</p>
            <p className="text-[9px] text-gray-400">{plate.band.label}</p>
          </div>
        </div>

        {cuisine.hasNonVeg && (
          <button
            type="button"
            onClick={() => setShowVegOnly(v => !v)}
            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              showVegOnly ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
            }`}
          >
            <Leaf size={11} /> {showVegOnly ? 'Showing pure veg' : 'Veg & non-veg'}
          </button>
        )}
      </div>

      {/* Every course, every dish. Nothing behind a coordinator call. */}
      <div className="space-y-2.5">
        {courses.map(course => {
          const dishes = dishesFor(cuisine, course.id, { vegOnly: showVegOnly || !cuisine.hasNonVeg })
          if (!dishes.length) return null
          return (
            <div key={course.id} className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-[12px] font-extrabold text-gray-900">{course.label}</p>
                <p className="text-[10px] text-gray-400">{course.hint}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dishes.map(d => (
                  <span
                    key={d.id}
                    title={d.note ?? undefined}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${
                      d.veg
                        ? 'bg-green-50/60 text-gray-700 ring-green-100'
                        : 'bg-rose-50/60 text-gray-700 ring-rose-100'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${d.veg ? 'bg-green-500' : 'bg-rose-500'}`}
                    />
                    {d.name}
                    {d.delta > 0 && (
                      <span className="font-bold text-gray-400">+₹{d.delta}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-gray-500">
        Every dish above is available. How many of each course are included comes from the
        scale you pick — and anything beyond that is added at a stated rate, never blocked.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Décor — how much, what it looks like, and what else
═══════════════════════════════════════════════════════════ */

function DecorOptions({ guestCount }) {
  const [levelId, setLevelId] = useState(VISIBLE_DECOR_LEVELS[1]?.id ?? VISIBLE_DECOR_LEVELS[0].id)
  const level = VISIBLE_DECOR_LEVELS.find(l => l.id === levelId) ?? VISIBLE_DECOR_LEVELS[0]
  const cost = decorCostFor({ level, addonIds: [], guestCount })

  return (
    <div className="space-y-3.5">
      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
          1 · How much decor — this is the part that moves the price
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VISIBLE_DECOR_LEVELS.map(l => {
            const active = l.id === levelId
            const levelCost = decorCostFor({ level: l, addonIds: [], guestCount })
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevelId(l.id)}
                className={`rounded-2xl bg-white p-3 text-left ring-1 transition-all ${
                  active ? 'ring-2' : 'ring-gray-200 hover:ring-gray-300'
                }`}
                style={active ? { '--tw-ring-color': 'var(--event-ink)' } : undefined}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-extrabold text-gray-900">
                    {l.emoji} {l.name}
                  </span>
                  {l.popular && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-700">
                      Most booked
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{l.tagline}</span>
                <span className="mt-1.5 block text-[12px] font-extrabold" style={{ color: 'var(--event-ink)' }}>
                  ≈ {formatINR(levelCost.total)}
                  <span className="ml-1 text-[10px] font-medium text-gray-400">at {guestCount} guests</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3.5 ring-1 ring-gray-200">
        <p className="text-[12px] font-extrabold text-gray-900">
          What {level.name} installs
          <span className="ml-2 text-[10px] font-medium text-gray-400">
            {level.setupHours}h setup · ≈ {formatINR(cost.total)}
          </span>
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {level.inclusions.map(inc => (
            <li key={inc} className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-600">
              <Check size={11} className="mt-0.5 shrink-0 text-green-600" />
              {inc}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
          2 · What it looks like — almost all of these are free
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DECOR_THEMES.map(t => (
            <span
              key={t.id}
              title={t.note ?? undefined}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200"
            >
              {t.name}
              {t.delta > 0 && <span className="font-bold text-gray-400">+{formatINR(t.delta)}</span>}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
          3 · What else — decided here rather than by phone three days before
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {DECOR_ADDONS.map(a => (
            <span
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] ring-1 ring-gray-200"
            >
              <span className="min-w-0 text-gray-700">{a.name}</span>
              <span className="shrink-0 font-extrabold text-gray-500">{formatINR(a.price)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Everything else — the curated lists
═══════════════════════════════════════════════════════════ */

function ListOptions({ groups }) {
  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.label} className="rounded-2xl bg-white p-3.5 ring-1 ring-gray-200">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-[12px] font-extrabold text-gray-900">{group.label}</p>
            {group.hint && <p className="text-[10px] text-gray-400">{group.hint}</p>}
          </div>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {group.items.map(item => (
              <li key={item.name} className="flex items-start gap-1.5">
                <Check size={11} className="mt-1 shrink-0" style={{ color: 'var(--event-ink)' }} />
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-semibold leading-snug text-gray-800">{item.name}</span>
                  {item.note && (
                    <span className="block text-[10.5px] leading-snug text-gray-400">{item.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
