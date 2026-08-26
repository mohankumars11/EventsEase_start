// The quote engine.
//
// One pure function turns a configuration into a number, and every surface
// that shows a price calls it. That is the whole point: the builder screen,
// the summary bar, the enquiry we send to a coordinator and whatever the admin
// console shows later must all agree, and the only way they agree is by not
// each doing their own arithmetic.
//
// ── The formula ─────────────────────────────────────────────────────────
//
//   fixed      = coordination fee + decor (installation × stretch + theme)
//                + decor add-ons
//   variable   = guests × per-plate
//   per-plate  = (cuisine base + premium dishes chosen) × batch multiplier
//   subtotal   = fixed + variable
//   discounted = subtotal × (1 − bundle discount)
//   total      = discounted × (1 + platform fee)
//
// Two things about the order of operations are deliberate:
//
//   The bundle discount comes off BEFORE the platform fee, so the fee shrinks
//   with the discount rather than quietly clawing part of it back. Doing it
//   the other way is a rounding difference of a few hundred rupees and a
//   credibility difference of rather more.
//
//   The batch multiplier applies to the whole plate cost including premium
//   dishes, because bulk economics apply to the paneer as much as to the rice.
//
// ── What this deliberately does NOT do ──────────────────────────────────
// It does not return a single hard number as the customer-facing figure. It
// returns a total AND a range, and the UI shows the range. Sambramo has no
// signed supplier behind this catalogue yet; a number presented to the rupee
// implies a rate card that does not exist. The range is honest and, per the
// pricing brief, still converts — what kills conversion is "contact us", not
// "approximately".

import {
  PLATFORM_FEE_RATE, BUNDLE_DISCOUNT_RATE, TIER_BY_ID, BOOKING_MODES, batchBandFor,
} from '../data/celebrationTiers'
import { plateShareFor, excludedPartsFor, DEFAULT_SOURCING } from '../data/cateringModel'
import { rateFactor } from '../data/marketRates'
import { CUISINE_BY_ID, COURSES, dishesFor } from '../data/cuisineMenus'
import { DECOR_LEVEL_BY_ID, DECOR_THEMES, DECOR_ADDONS, decorStretch } from '../data/decorPackages'
import { SERVICE_BY_ID, serviceCost, defaultQty } from '../data/servicePricing'
import { taxFor, TAX_LABEL } from '../data/taxes'

const round10 = n => Math.round(n / 10) * 10

/**
 * How much of a plate is raw ingredient, and therefore how much of it the
 * market index is allowed to move.
 *
 * Re-declared from data/cateringModel.js rather than imported as a live
 * value, because it is used in arithmetic here and a reader following the
 * multiplication needs the number in front of them. If the split there ever
 * changes, this is the second place to change — the check script asserts they
 * agree.
 */
const PLATE_PROVISION_SHARE = 0.58
const round500 = n => Math.round(n / 500) * 500

/**
 * The estimate's width.
 *
 * ±5% either side of the computed total. Wide enough to absorb a venue's
 * elevator, a caterer's seasonal vegetable rate and a Saturday-in-November
 * premium; narrow enough that the customer knows what they are budgeting.
 */
export const ESTIMATE_SPREAD = 0.05

/**
 * What a dish beyond the tier's allowance adds, per plate.
 *
 * Flat rather than per-dish: the cost of one more item on a buffet is mostly
 * the extra vessel, the extra serving hand and the extra prep, and those are
 * the same whether the item is a palya or a paneer dish. Anything genuinely
 * expensive already carries its own `delta` on top of this.
 */
export const EXTRA_DISH_RATE = 30

/**
 * Per-plate cost for a configured menu.
 *
 * `dishPremium` sums only the dishes actually ticked, so a menu of everyday
 * items costs the base rate and the family that adds mutton biryani and kaju
 * katli sees exactly what those two decisions cost. Itemised rather than
 * absorbed, because "why is my plate ₹690" is the single most-asked question
 * in this business.
 */
export function perPlateFor({ cuisine, menu, menuAllowance, vegOnly = false, guestCount }) {
  if (!cuisine) {
    return { base: 0, dishPremium: 0, extraDishes: 0, extraDishCost: 0, perPlate: 0, premiumDishes: [], band: batchBandFor(guestCount || 1) }
  }

  const premiumDishes = []
  let dishPremium = 0
  let hasNonVegDish = false
  let extraDishes = 0
  for (const course of COURSES) {
    const chosen = menu?.[course.id] ?? []
    const available = dishesFor(cuisine, course.id, { vegOnly })
    for (const id of chosen) {
      const dish = available.find(d => d.id === id)
      if (!dish) continue
      if (!dish.veg) hasNonVegDish = true
      if (!dish.delta) continue
      dishPremium += dish.delta
      premiumDishes.push({ course: course.id, name: dish.name, delta: dish.delta })
    }
    // Dishes past what the tier includes are allowed and priced, never
    // blocked. A family that wants one more sweet should be able to have it
    // for a stated ₹30 a plate; being told "upgrade your package to add
    // jalebi" is the moment somebody closes the app and rings a caterer.
    const allowed = menuAllowance?.[course.id] ?? chosen.length
    if (chosen.length > allowed) extraDishes += chosen.length - allowed
  }
  const extraDishCost = extraDishes * EXTRA_DISH_RATE

  // A non-veg menu is a second kitchen line — separate vessels, separate
  // staff, separate storage — so the base rate steps up the moment one
  // non-veg dish is on the list, rather than being smeared across every
  // vegetarian order in the cuisine.
  const base = !vegOnly && hasNonVegDish && cuisine.nonVegPlate
    ? cuisine.nonVegPlate
    : cuisine.basePlate

  const band = batchBandFor(guestCount || 1)
  return {
    base,
    dishPremium,
    extraDishes,
    extraDishCost,
    band,
    perPlate: round10((base + dishPremium + extraDishCost) * band.multiplier),
    premiumDishes,
  }
}

/**
 * Decor cost for a level, theme and set of extras at this guest count.
 *
 * `stretch` is the honest part: a Classic setup in a 600-guest hall needs more
 * drape than a Classic setup in a 120-guest one, and quoting the same number
 * for both is how a decorator ends up asking for more money on site.
 */
export function decorCostFor({ level, themeId, addonIds = [], guestCount }) {
  if (!level || level.id === 'none') {
    return { installation: 0, tableWork: 0, themeDelta: 0, addons: [], addonTotal: 0, stretch: 1, total: 0 }
  }
  const stretch = decorStretch(level, guestCount)
  const installation = round10(level.fixedCost * stretch)
  const tableWork = round10(level.perGuestTouch * (guestCount || 0))
  const theme = DECOR_THEMES.find(t => t.id === themeId)
  const themeDelta = theme?.delta ?? 0
  const addons = DECOR_ADDONS.filter(a => addonIds.includes(a.id))
  const addonTotal = addons.reduce((sum, a) => sum + a.price, 0)

  return {
    installation, tableWork, themeDelta, addons, addonTotal, stretch,
    theme: theme ?? null,
    total: installation + tableWork + themeDelta + addonTotal,
  }
}

/**
 * The whole quote.
 *
 * Returns `null` for a configuration that cannot be priced — no tier, no guest
 * count, or the bespoke tier — rather than a zero. A zero renders as "₹0" on
 * some surface eventually, and "₹0" for a wedding is worse than no number.
 */
export function buildQuote({
  tierId,
  guestCount,
  cuisineId,
  vegOnly = false,
  menu = {},
  decorLevelId,
  themeId,
  addonIds = [],
  serviceIds = [],
  serviceQty = {},
  mode = 'full',
  includeCatering = true,
  /**
   * Who is buying the groceries. See data/cateringModel.js — a very large
   * share of Indian families buy the provisions themselves and hire a cook,
   * and a quote that assumes otherwise is wrong for them by more than half
   * the food cost, in a way they cannot see until the confirmation.
   */
  cateringMode = DEFAULT_SOURCING,
  includeDecor = true,
  extras = [],
  menuAllowance = null,
}) {
  const tier = TIER_BY_ID[tierId]
  const guests = Number(guestCount) || 0
  if (!tier || guests < 1) return null

  const cuisine = includeCatering ? CUISINE_BY_ID[cuisineId] : null
  const level = includeDecor ? DECOR_LEVEL_BY_ID[decorLevelId] : null

  // The allowance the SURFACE showed, when it differs from the tier's own.
  //
  // The guided journey groups the eight pricing rungs into four circles and
  // states one dish allowance per circle (see data/guestCircles.js). The
  // resolved rung underneath can include fewer dishes — so without this
  // override the engine would charge ₹30 a plate as a surcharge on dishes the
  // app itself pre-ticked and called "included". Being surprised by a charge
  // for something you were told came as standard is the single fastest way to
  // lose a customer at the reveal.
  const allowance = menuAllowance ?? tier.menuAllowance
  const plate = perPlateFor({ cuisine, menu, menuAllowance: allowance, vegOnly, guestCount: guests })

  /**
   * Two adjustments, in this order, and both are visible in the result.
   *
   * `provisionFactor` moves the INGREDIENT part of the plate with mandi
   * rates — the only genuinely live input this engine has (see
   * data/marketRates.js). It resolves to exactly 1 whenever the index is
   * missing, stale or has never been refreshed, so the default behaviour is
   * the committed baseline rather than a silent drift.
   *
   * `plateShare` then bills only the parts of the plate this customer is
   * actually buying. A family sourcing their own groceries pays for the
   * cooking and the serving and not for the provisions.
   */
  const provisionFactor = rateFactor('provisions')
  const marketedPerPlate = cuisine
    ? round10(plate.perPlate * (1 + PLATE_PROVISION_SHARE * (provisionFactor - 1)))
    : 0
  const plateShare = cuisine ? plateShareFor(cateringMode) : 0
  const billedPerPlate = round10(marketedPerPlate * plateShare)
  const cateringTotal = cuisine ? billedPerPlate * guests : 0
  const decor = decorCostFor({ level, themeId, addonIds, guestCount: guests })
  const coordination = tier.coordinationFee

  const services = serviceIds
    .map(id => SERVICE_BY_ID[id])
    .filter(Boolean)
    .map(s => {
      const qty = serviceQty[s.id] ?? defaultQty(s, guests)
      return { service: s, qty, amount: serviceCost(s, guests, qty) }
    })
  const servicesTotal = services.reduce((sum, s) => sum + s.amount, 0)

  /**
   * Already-priced lines the caller worked out for itself.
   *
   * ── Why this exists ───────────────────────────────────────────────────
   * `serviceIds` prices against `servicePricing.js`, which carries ONE base
   * rate per service — right for the builder's tick-list, and not enough for
   * the guided journey, which sells the named packages in `servicePacks.js`:
   * "Half day — one photographer" and "Wedding — multi-day coverage" are the
   * same `photography` service and a ten-fold difference in price. Collapsing
   * them onto one base rate would mean the estimate at the end of the journey
   * described a booking nobody made.
   *
   * So the journey resolves its own packs — it is the surface that knows the
   * quantity, the unit and which pack was chosen — and hands the results in
   * here as finished lines. They join the subtotal exactly where `services`
   * does, which is what keeps the bundle discount, the platform fee and the
   * GST split all correct without either side knowing about the other.
   *
   * Each entry is `{ key, label, detail, amount }`. Anything without a
   * positive numeric amount is dropped rather than trusted: a NaN reaching
   * the subtotal turns the whole quote into "₹NaN", which is the one output
   * worse than no price at all.
   */
  const extraLines = (extras ?? [])
    .filter(e => e && Number.isFinite(Number(e.amount)) && Number(e.amount) > 0)
    .map(e => ({
      key: e.key ?? `extra_${e.label}`,
      label: e.label,
      detail: e.detail ?? '',
      amount: Math.round(Number(e.amount)),
      serviceId: e.serviceId ?? null,
      packId: e.packId ?? null,
      qty: e.qty ?? 1,
    }))
  const extrasTotal = extraLines.reduce((sum, e) => sum + e.amount, 0)

  const subtotal = coordination + decor.total + cateringTotal + servicesTotal + extrasTotal

  // The discount is only real when there is actually a bundle to discount.
  // Applying it to a decor-only booking would be a 10% price cut in exchange
  // for nothing, dressed up as a saving — and the intent flags are not enough
  // to establish that, because a half-built configuration has
  // `includeCatering` true from the first render and no cuisine picked until
  // several taps later. The saving has to be checked against what is actually
  // in the quote, not what the customer said they wanted.
  //
  // Note there is no `?? BOOKING_MODES[mode].bundleDiscount` fallback here.
  // There was, and it silently handed the full-celebration mode its 10% back
  // on the branch where `bundled` had just refused it — the guard above
  // computed correctly and then changed nothing. The mode's own rate stays in
  // BOOKING_MODES as the declarative thing the picker card reads; what gets
  // charged is decided here, once.
  const bundled = mode === 'full' && includeCatering && includeDecor
    && !!cuisine && !!level && level.id !== 'none'
  const bundleRate = bundled ? BUNDLE_DISCOUNT_RATE : 0
  const bundleAmount = Math.round(subtotal * bundleRate)
  const discountedSubtotal = subtotal - bundleAmount

  const platformFeeAmount = Math.round(discountedSubtotal * PLATFORM_FEE_RATE)
  const preTax = discountedSubtotal + platformFeeAmount

  // Tax is computed on the DISCOUNTED component values, not on the headline
  // ones — you are not taxed on money you were never charged. The discount is
  // spread across the components in proportion to their size so each slab is
  // applied to what that component actually costs after the saving.
  const share = subtotal > 0 ? discountedSubtotal / subtotal : 1
  const tax = taxFor({
    cateringBase: cateringTotal * share,
    servicesBase: (decor.total + servicesTotal + extrasTotal) * share,
    platformBase: coordination * share + platformFeeAmount,
  })

  const total = preTax + tax.total

  return {
    tier,
    guests,
    cuisine,
    plate,
    catering: {
      // `perPlate` is what the customer is BILLED per plate, which is the
      // number that has to match the total. `fullPerPlate` is what the whole
      // plate would cost if we did all of it — kept so the estimate can show
      // what choosing to buy your own groceries actually saved, which is the
      // entire reason for asking.
      perPlate: billedPerPlate,
      fullPerPlate: marketedPerPlate,
      basePerPlate: plate.perPlate,
      guests,
      total: cateringTotal,
      mode: cateringMode,
      share: plateShare,
      excludes: excludedPartsFor(cateringMode),
      provisionFactor,
    },
    decor: { level, ...decor },
    services,
    servicesTotal,
    extras: extraLines,
    extrasTotal,
    coordination,
    subtotal,
    bundle: { applied: bundleRate > 0, rate: bundleRate, amount: bundleAmount },
    discountedSubtotal,
    platformFee: { rate: PLATFORM_FEE_RATE, amount: platformFeeAmount },
    preTax,
    tax: { ...tax, label: TAX_LABEL },
    total,
    perGuest: guests ? Math.round(total / guests) : 0,
    range: {
      low: round500(total * (1 - ESTIMATE_SPREAD)),
      high: round500(total * (1 + ESTIMATE_SPREAD)),
    },
  }
}

/**
 * The quote as a customer reads it, top to bottom.
 *
 * Built here rather than in JSX so the same breakdown can go into the enquiry
 * note a coordinator receives — the customer and the coordinator look at
 * identical lines, which removes an entire category of "that is not what the
 * app told me" conversation.
 */
export function quoteLines(quote) {
  if (!quote) return []
  const lines = []

  if (quote.cuisine) {
    lines.push({
      key: 'catering',
      label: `Catering — ${quote.cuisine.name}`,
      detail: `${quote.guests} guests × ₹${quote.catering.perPlate}/plate (${quote.plate.band.label.toLowerCase()})`
        + (quote.catering.share < 1 ? ` — ${Math.round(quote.catering.share * 100)}% of a full plate, you are buying the rest` : ''),
      amount: quote.catering.total,
    })
  }
  if (quote.decor.level && quote.decor.level.id !== 'none') {
    lines.push({
      key: 'decor',
      label: `Decor — ${quote.decor.level.name}`,
      detail: quote.decor.stretch > 1
        ? `Installation scaled for ${quote.guests} guests, plus table styling`
        : 'Installation, setup and clearing, plus table styling',
      amount: quote.decor.installation + quote.decor.tableWork,
    })
    if (quote.decor.themeDelta > 0) {
      lines.push({ key: 'theme', label: `Theme — ${quote.decor.theme?.name}`, detail: 'Premium florals', amount: quote.decor.themeDelta })
    }
    for (const addon of quote.decor.addons) {
      lines.push({ key: `addon_${addon.id}`, label: addon.name, detail: 'Add-on', amount: addon.price })
    }
  }
  for (const { service, qty, amount } of quote.services) {
    lines.push({
      key: `svc_${service.id}`,
      label: `${service.emoji} ${service.name}`,
      detail: service.unit === 'per_guest'
        ? `₹${service.base} per guest × ${quote.guests}`
        : service.unit === 'per_unit'
          ? `${qty} × ₹${service.base} per ${service.unitLabel ?? 'unit'}`
          : service.scales ? `Scaled to ${quote.guests} guests` : 'For the event',
      amount,
    })
  }

  for (const extra of quote.extras ?? []) {
    lines.push({ key: extra.key, label: extra.label, detail: extra.detail, amount: extra.amount })
  }

  lines.push({
    key: 'coordination',
    label: `Coordination — ${quote.tier.name}`,
    detail: quote.tier.coordination,
    amount: quote.coordination,
  })

  return lines
}

/**
 * The plain-text version, for the note that reaches a coordinator.
 *
 * Written for a person to read on a phone at 8am, not for a parser.
 */
export function quoteToText(quote, { menu, cuisine, vegOnly } = {}) {
  if (!quote) return ''
  const out = []
  out.push(`${quote.tier.name} (${quote.tier.localName}) — ${quote.guests} guests`)
  out.push('')

  for (const line of quoteLines(quote)) {
    out.push(`${line.label} — ₹${line.amount.toLocaleString('en-IN')}  (${line.detail})`)
  }
  out.push('')
  out.push(`Subtotal: ₹${quote.subtotal.toLocaleString('en-IN')}`)
  if (quote.bundle.applied) {
    out.push(`Full-celebration saving (${Math.round(quote.bundle.rate * 100)}%): −₹${quote.bundle.amount.toLocaleString('en-IN')}`)
  }
  out.push(`Sambramo platform fee (${Math.round(quote.platformFee.rate * 100)}%): ₹${quote.platformFee.amount.toLocaleString('en-IN')}`)
  for (const part of quote.tax.parts) {
    out.push(`GST on ${part.label} @ ${Math.round(part.rate * 100)}%: ₹${part.amount.toLocaleString('en-IN')}`)
  }
  out.push(`Estimated total incl. taxes: ₹${quote.range.low.toLocaleString('en-IN')} – ₹${quote.range.high.toLocaleString('en-IN')}`)
  out.push('(Estimate, not a locked quote — the final figure may vary slightly.)')

  if (cuisine && menu) {
    out.push('')
    out.push(`MENU — ${cuisine.name}${vegOnly ? ' (pure veg)' : ''}`)
    for (const course of COURSES) {
      const chosen = menu[course.id] ?? []
      if (!chosen.length) continue
      const available = dishesFor(cuisine, course.id, { vegOnly })
      const names = chosen.map(id => available.find(d => d.id === id)?.name).filter(Boolean)
      if (names.length) out.push(`  ${course.label}: ${names.join(', ')}`)
    }
  }
  return out.join('\n')
}

/**
 * Minimum order values, for the single-service door.
 *
 * The reason these exist is margin, not gatekeeping: an hour of coordination
 * on a ₹3,000 booking earns ₹60 and costs more than that to deliver. Returns
 * the failing rule rather than a boolean so the UI can say which one and by
 * how much — "minimum 20 plates, you have 12" is actionable, "does not meet
 * minimum" is not.
 */
export function checkMinimums({ mode, guestCount, decorTotal, includeCatering, includeDecor }) {
  if (mode !== 'individual') return null
  const mins = BOOKING_MODES.individual.minimums
  if (includeCatering && guestCount < mins.catering.min) {
    return { rule: 'catering', message: `Catering on its own starts at ${mins.catering.min} plates — you have ${guestCount}. Fewer than that, and the shop can deliver instead.` }
  }
  if (includeDecor && !includeCatering && decorTotal < mins.decor.min) {
    return { rule: 'decor', message: `Decor on its own starts at ₹${mins.decor.min.toLocaleString('en-IN')}. Add a little more, or browse party essentials in the shop.` }
  }
  return null
}
