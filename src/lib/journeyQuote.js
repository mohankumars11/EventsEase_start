// Turning a journey's answers into one number, once, at the end.
//
// ── Why the journey does not just call buildQuote ───────────────────────
// It does — but it has to translate first. The builder speaks in
// `servicePricing.js` service ids, one base rate each. The journey speaks in
// `servicePacks.js` packages: "Half day — one photographer" and "Wedding —
// multi-day coverage" are both `photography`, and they are ten times apart.
// Handing `serviceIds: ['photography']` to the quote engine after somebody
// chose multi-day coverage would produce an estimate for a booking they did
// not make.
//
// So this module resolves every chosen pack to a finished line — the right
// rate, the right unit, the right quantity for this headcount — and passes
// them to `buildQuote` as `extras`. Catering still comes from the menu, décor
// from the décor step, and coordination from the tier, exactly as before. The
// three never overlap, which is the whole reason live counters and the bar are
// left inside the menu step rather than being sold twice.
//
// ── One place, on purpose ───────────────────────────────────────────────
// The reveal screen, the summary the customer scrolls, the note a coordinator
// reads and the row written to `service_enquiries` all call this. They cannot
// disagree, because there is nothing for them to disagree about.

import { PACK_BY_ID, packCost, defaultPackQty, packUnitLabel } from '../data/servicePacks'
import { SERVICE_BY_ID } from '../data/servicePricing'
import { buildQuote } from '../utils/quote'
import { pricingTierFor, allowanceFor } from '../data/guestCircles'
import { CUISINE_BY_ID } from '../data/cuisineMenus'

/**
 * Every pack the customer has chosen, priced, in chapter order.
 *
 * `selections` is `{ [chapterId]: { packIds: [], qty: { [packId]: n } } }`.
 * Chapter order is preserved rather than sorted by price or by service,
 * because the summary reads back as the journey the customer just walked —
 * "the cake, then the seating, then the photographer" — and re-sorting it
 * makes them hunt for the decision they want to change.
 */
export function resolvePacks(chapters, selections, guestCount) {
  const out = []
  for (const chapter of chapters) {
    if (chapter.kind !== 'service') continue
    const picked = selections?.[chapter.id]?.packIds ?? []
    for (const packId of picked) {
      const pack = PACK_BY_ID[packId]
      if (!pack) continue
      const qty = selections[chapter.id]?.qty?.[packId] ?? defaultPackQty(pack, guestCount)
      const amount = packCost(pack, guestCount, qty)
      out.push({
        key: `pack_${packId}`,
        chapterId: chapter.id,
        serviceId: chapter.serviceId,
        packId,
        pack,
        qty,
        amount,
        label: `${pack.emoji ?? '•'} ${pack.name}`,
        // The detail line is what stops "₹35,000" being an argument later. It
        // states the rate and the multiplier separately, so a per-guest pack
        // that looks expensive in total is visibly ₹120 a head rather than an
        // unexplained five-figure row.
        detail: pack.unit === 'guest'
          ? `₹${pack.price} per guest × ${guestCount}`
          : pack.unit === 'unit'
            ? `${qty} × ₹${pack.price.toLocaleString('en-IN')} ${packUnitLabel(pack)}`
            : 'For the event',
      })
    }
  }
  return out
}

/** What one chapter's current selection costs, for the summary rail. */
export function chapterTotal(chapter, selections, guestCount) {
  return resolvePacks([chapter], selections, guestCount).reduce((sum, l) => sum + l.amount, 0)
}

/**
 * The whole estimate for a journey.
 *
 * Returns `null` until there is genuinely something to price — a circle and a
 * headcount. Every screen before the reveal is built on the assumption that
 * this returns nothing useful, and none of them ask for it.
 */
export function journeyQuote(state, chapters) {
  const {
    circleId, guests, cuisineId, vegOnly, menu,
    decorLevelId, themeId, addonIds, selections, includeCatering = true,
  } = state
  if (!circleId || !guests) return null

  const tier = pricingTierFor(circleId, guests)
  const extras = resolvePacks(chapters, selections, guests)
  // The allowance the customer was actually shown on the menu step. Passed
  // explicitly so the extra-dish surcharge is charged against the promise the
  // app made, not against the pricing rung underneath it.
  const circleAllowance = allowanceFor(circleId)

  const quote = buildQuote({
    tierId: tier.id,
    guestCount: guests,
    cuisineId: includeCatering ? cuisineId : null,
    vegOnly,
    menu,
    decorLevelId,
    themeId,
    addonIds,
    // Deliberately empty: everything the journey sells comes through `extras`
    // as a named package. Passing service ids as well would bill the
    // photographer twice — once at the pack rate the customer chose, once at
    // the flat base rate in servicePricing.js.
    serviceIds: [],
    mode: 'full',
    includeCatering,
    includeDecor: !!decorLevelId && decorLevelId !== 'none',
    extras,
    menuAllowance: circleAllowance,
  })
  if (!quote) return null

  return { ...quote, circleAllowance, tier }
}

/**
 * The plan as a coordinator reads it on a phone at eight in the morning.
 *
 * Deliberately not the quote breakdown — `quoteToText` already writes that.
 * This is the part the quote cannot express: which questions were asked, what
 * the family answered, and which packages by name. A coordinator ringing this
 * customer needs to be able to say "you chose the full-day photographer and
 * the banana-leaf seating", and that sentence is not derivable from a total.
 */
export function journeyToText(state, chapters) {
  const lines = []
  const { selections, choices, guests } = state

  for (const chapter of chapters) {
    if (chapter.kind === 'choice') {
      const answer = choices?.[chapter.id]
      const ids = Array.isArray(answer) ? answer : answer ? [answer] : []
      if (!ids.length) continue
      const names = ids
        .map(id => chapter.options.find(o => o.id === id)?.name)
        .filter(Boolean)
      if (names.length) lines.push(`  ${chapter.question}\n    → ${names.join(', ')}`)
      continue
    }

    const picked = selections?.[chapter.id]?.packIds ?? []
    // A typed request is reported whether or not a package was also chosen.
    // "The same halwai who did my brother's wedding" is the most actionable
    // line a coordinator can be handed, and it must not be swallowed just
    // because the customer also ticked a pack next to it.
    const custom = (selections?.[chapter.id]?.custom ?? '').trim()
    if (custom) lines.push(`  ${chapter.title} — THEY ASKED FOR: ${custom}`)
    if (!picked.length) {
      // Recorded rather than omitted. "Skipped: photography" tells a
      // coordinator not to ring about it; silence tells them nothing, and
      // they ring.
      if (selections?.[chapter.id]?.skipped) {
        lines.push(`  ${chapter.title} — declined (${chapter.skipLabel ?? 'not needed'})`)
      }
      continue
    }
    for (const packId of picked) {
      const pack = PACK_BY_ID[packId]
      if (!pack) continue
      const qty = selections[chapter.id]?.qty?.[packId] ?? defaultPackQty(pack, guests)
      const svc = SERVICE_BY_ID[chapter.serviceId]
      const head = svc?.name ?? chapter.title
      lines.push(
        `  ${head}: ${pack.name}`
        + (pack.unit === 'unit' && qty > 1 ? ` × ${qty}` : '')
        + `\n    ${pack.includes?.slice(0, 3).join(' · ') ?? ''}`,
      )
    }
  }

  return lines.length ? `WHAT THEY CHOSE\n${lines.join('\n')}` : ''
}

/**
 * The `services` array written to `service_enquiries`.
 *
 * Shaped exactly like the celebration builder's, so the coordinator console,
 * the tracker and `lib/celebrations.js` read a journey request and a builder
 * request with the same code. A second shape here would be a second set of
 * admin screens within a month.
 */
export function journeyServiceRows(state, chapters) {
  const { guests, cuisineId, vegOnly, menu, includeCatering = true } = state
  const cuisine = includeCatering ? CUISINE_BY_ID[cuisineId] : null
  const packs = resolvePacks(chapters, state.selections, guests)

  return [
    cuisine && {
      id: 'catering',
      name: `Catering — ${cuisine.name}`,
      emoji: cuisine.emoji,
      unit_price: null,
      qty: guests,
      details: { cuisine: cuisine.id, vegOnly, menu },
    },
    ...packs.map(p => ({
      id: p.serviceId,
      name: p.pack.name,
      emoji: p.pack.emoji ?? '•',
      unit_price: p.pack.price,
      qty: p.qty,
      details: {
        pack: p.packId,
        unit: p.pack.unit,
        amount: p.amount,
        // Every line in a journey request was chosen on its own screen, with
        // the alternatives visible. Nothing here is a pre-tick we inherited,
        // which is exactly what the co-booking recommender needs to know —
        // see the `picked_by` note in CelebrationBuilder.
        picked_by: 'customer',
      },
    })),
  ].filter(Boolean)
}
