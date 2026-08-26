/**
 * Who buys the groceries.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ASSUMPTION THIS FIXES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every price in this app assumed full catering: we buy the provisions, we
 * cook them, we serve them, and the customer pays one per-plate rate for all
 * three. That is how a caterer quotes, and it is NOT how a very large share
 * of Indian families actually feed a function.
 *
 * The common pattern — at a gruha pravesha, a namakarana, a mundan, a
 * seventieth — is that the family buys the provisions themselves. The rice,
 * the dal, the oil, the vegetables, the ghee, sometimes the whole list from
 * a wholesale market the uncle knows. Then a cook is hired to come and cook
 * it. Sometimes it is the family's own cook, who has cooked for them for
 * twenty years and whose place at that function is not negotiable.
 *
 * A quote that silently assumes we are buying the groceries is wrong for
 * that family by more than half the food cost — and worse, it is wrong in a
 * way they cannot see. They read "₹450 a plate", think it is the cook's
 * charge, and get a shock at the confirmation. The single most common
 * argument in Indian catering is about exactly this line.
 *
 * So the flow asks, in the words a family uses, and the estimate moves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE PLATE HAS THREE PARTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A per-plate rate is not one thing. It is:
 *
 *   provisions  the raw material — rice, dal, oil, vegetables, milk, ghee,
 *               meat, the sweets' ingredients. Bought in a market, and the
 *               part that moves with commodity prices week to week.
 *   kitchen     the cooking — the master cook and his team, fuel, vessels,
 *               the temporary kitchen, and the hours before anybody arrives.
 *   service     getting it to the guest — the serving team, crockery,
 *               transport, the hot-boxes, and clearing afterwards.
 *
 * Splitting them is what lets the question be answered honestly, and it is
 * also the axis a market index moves along: provisions track mandi rates,
 * kitchen and service track wages. Both jobs need the same split, so it is
 * declared once here.
 *
 * The shares are the industry rule of thumb for Indian volume catering —
 * provisions are a little under three-fifths of a plate, and the rest splits
 * roughly evenly between cooking and serving. They are estimates like every
 * other number in this catalogue and are labelled as such wherever they
 * surface. What matters is that they are DECLARED, so a coordinator and a
 * customer are arguing about a number they can both see.
 */

export const PLATE_SPLIT = {
  provisions: 0.58,
  kitchen: 0.20,
  service: 0.22,
}

/**
 * The four honest answers to "who is doing the food".
 *
 * `pays` lists which parts of the plate the customer is billed for. The
 * fourth — the family doing all of it — is not in this table because it is
 * the existing `includeCatering: false`, and adding a mode that bills nothing
 * would be two ways of saying one thing.
 *
 * ── Why "we buy, you cook" charges for service ──────────────────────────
 * Because somebody still has to serve four hundred people and wash up after
 * them, and a family that has hired a cook has not solved that. The mode
 * where they genuinely have solved it is `family_kitchen`, which is a cook
 * AND a serving team the family already has — usually because a community
 * kitchen or a mutt is doing the whole meal. That one bills provisions only.
 */
export const SOURCING_MODES = [
  {
    id: 'full',
    emoji: '🍽️',
    name: 'You do all of it',
    desc: 'We buy the provisions, our cooks cook them at your venue, and our team serves and clears. One rate, one person answerable.',
    pays: ['provisions', 'kitchen', 'service'],
    includes: [
      'Every ingredient sourced and quality-checked',
      'Master cook and kitchen team on site',
      'Serving team, crockery and hot-boxes',
      'Clearing and waste removal afterwards',
    ],
    note: 'The usual answer, and the only one where a single person is answerable if the sambar is late.',
  },
  {
    id: 'family_provisions',
    emoji: '🛒',
    name: 'We buy the groceries — you cook and serve',
    desc: 'You buy the rice, dal, oil and vegetables yourself. We bring the cooks, the vessels, the fuel and the serving team.',
    pays: ['kitchen', 'service'],
    includes: [
      'A costed shopping list, by weight, sent two weeks ahead',
      'Master cook and kitchen team on site',
      'Vessels, fuel and the temporary kitchen',
      'Serving team, crockery and clearing',
    ],
    note: 'We send the list and the quantities. What you spend at the market is yours and is not in this estimate.',
  },
  {
    id: 'family_cook',
    emoji: '👨‍🍳',
    name: 'Our own cook is doing the food',
    desc: 'Your cook, your recipes. We source and deliver the provisions to his list, and put a serving team behind him.',
    pays: ['provisions', 'service'],
    includes: [
      'Every ingredient sourced to your cook’s own list',
      'Delivered to the venue the evening before',
      'Vessels and fuel, if he needs them',
      'Serving team, crockery and clearing',
    ],
    note: 'Common when a family cook or a mutt kitchen is doing the meal. We work to his list, not ours.',
  },
  {
    id: 'family_kitchen',
    emoji: '🏠',
    name: 'The cooking and serving are both ours',
    desc: 'A community or family kitchen is handling the whole meal. We only source and deliver the provisions.',
    pays: ['provisions'],
    includes: [
      'Provisions sourced at wholesale rates',
      'Delivered by weight against your list',
      'Bills and weighing slips handed over',
      'Nothing else — no cooks, no serving team',
    ],
    note: 'Cheapest by a distance, and the most work for you. Choose it only if the kitchen is genuinely arranged.',
  },
]

export const SOURCING_BY_ID = Object.fromEntries(SOURCING_MODES.map(m => [m.id, m]))

/** The default: full catering, which is what every quote assumed before. */
export const DEFAULT_SOURCING = 'full'

/**
 * What share of the plate rate this mode bills.
 *
 * Returns 1 for an unknown mode rather than 0 — an id nobody has taught this
 * table yet must never silently produce a free meal.
 */
export function plateShareFor(modeId) {
  const mode = SOURCING_BY_ID[modeId]
  if (!mode) return 1
  return mode.pays.reduce((sum, part) => sum + (PLATE_SPLIT[part] ?? 0), 0)
}

/**
 * The parts of the plate this mode does NOT bill, for the copy that has to
 * say so out loud. A customer who is buying their own groceries must be told
 * in the estimate that the groceries are not in it.
 */
export function excludedPartsFor(modeId) {
  const mode = SOURCING_BY_ID[modeId]
  if (!mode) return []
  return Object.keys(PLATE_SPLIT).filter(part => !mode.pays.includes(part))
}

/**
 * Two label sets, because the two uses need different grammar.
 *
 * `PART_LABEL` is written to be dropped into a sentence — "this figure does
 * not include the groceries" — so it is lower-case and carries its article.
 * `PART_HEADING` is a legend entry standing on its own. Rendering the first
 * through a `capitalize` class produced "The Groceries" and "Serving And
 * Clearing", which is a title where a label belonged.
 */
export const PART_LABEL = {
  provisions: 'the groceries',
  kitchen: 'the cooking',
  service: 'serving and clearing',
}

export const PART_HEADING = {
  provisions: 'Groceries',
  kitchen: 'Cooking',
  service: 'Serving & clearing',
}
