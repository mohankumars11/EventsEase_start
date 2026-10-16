/**
 * Upgrade a Catering & Food onboarding draft to the catalogue / menu /
 * counter model — without losing a single dish.
 *
 * The old draft kept dishes as `a.catalogue[] = { item_key, answers }` with
 *   answers = { name, meal_category, description, diet, serving_size (text),
 *               allergens (text), pricing ('included_in_a_menu' | 'per_person'
 *               | 'per_counter'), price (paise), min_qty }
 * and "Full menu" rows mixed in with dishes.
 *
 * Schema 2 (this file):
 *   a.dishes[]   { item_key, name, …structured fields…, legacy: {old answers} }
 *   a.menus[]    menus; an old "Full menu" row becomes a DRAFT menu (no price
 *                invented, its old price kept as a suggestion to confirm)
 *   a.counters[] live counters (created by the partner, never inferred)
 *   a.packages[] catering packages
 *
 * Rules (spec Part 3):
 *   • every item_key survives; nothing is deleted
 *   • "Included in a menu" → menu_eligible, NOT sold standalone
 *   • "Per person" → standalone per serving at the SAME rate
 *   • "Per counter" → kept as legacy.counter_price + needs_review; never turned
 *     into a dish price
 *   • no price → pricing_status 'needs_price'; nothing is invented
 *   • free-text serving sizes are parsed only when unambiguous ("150 g",
 *     "2 pieces", "250 ml"); otherwise kept as legacy text and flagged
 * Idempotent: a schema-2 draft is returned unchanged.
 */

export const CATERING_DRAFT_SCHEMA = 2

/* Old category ids → new food-category ids (taxonomy in seed/categories.json). */
const OLD_CATEGORY = {
  welcome_drink: 'bev_traditional', starter: 'st_vegetable', main_course: 'gr_vegetable', bread: 'br_other',
  rice: 'rc_regional', dessert: 'ds_other', live_counter: 'ad_live_counter',
}
const DIET = { vegetarian: 'veg', non_vegetarian: 'non_veg', vegan: 'vegan', jain: 'jain' }

const UNIT_WORDS = [
  [/^(g|gm|gms|gram|grams)$/, 'g'], [/^(kg|kgs|kilo|kilogram|kilograms)$/, 'kg'], [/^(ml|millilitre|milliliter|millilitres)$/, 'ml'],
  [/^(l|ltr|litre|liter|litres)$/, 'l'], [/^(pc|pcs|piece|pieces|no|nos)$/, 'piece'], [/^(cup|cups)$/, 'cup'],
  [/^(glass|glasses)$/, 'glass'], [/^(plate|plates|portion|portions|serving|servings)$/, 'portion'],
]
/** "150 g", "2 pieces per person", "250ml" → {qty, unit}; null when unclear. */
export function parseServing(text) {
  const t = String(text ?? '').trim().toLowerCase()
  if (!t) return null
  const m = t.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)/)
  if (!m) return null
  const unit = UNIT_WORDS.find(([re]) => re.test(m[2]))?.[1]
  return unit ? { qty: Number(m[1]), unit } : null
}

export function isCateringDraftV2(a) { return a?._schema === CATERING_DRAFT_SCHEMA }

export function migrateCateringDraft(a) {
  if (!a || isCateringDraftV2(a)) return a
  const old = Array.isArray(a.catalogue) ? a.catalogue : []
  const dishes = [], menus = [...(a.menus ?? [])]
  for (const it of old) {
    const x = it?.answers ?? {}
    const legacy = { ...x }
    if (x.meal_category === 'full_menu') {
      // A whole menu typed as one row: becomes a draft menu with no dishes yet.
      menus.push({
        menu_key: it.item_key, name: x.name || 'Untitled menu', description: x.description ?? '',
        diet: DIET[x.diet] ?? 'veg', price_model: x.pricing === 'per_person' ? 'per_person' : 'quote',
        suggested_price_paise: Number(x.price) || null, price_paise: null,   // the partner confirms the price
        items: [], status: 'draft', legacy, needs_review: true,
      })
      continue
    }
    const serving = parseServing(x.serving_size)
    const price = Number(x.price) || 0
    const pricing = x.pricing ?? 'included_in_a_menu'
    dishes.push({
      item_key: it.item_key,
      name: x.name ?? '',
      master_dish_id: null,
      category_id: OLD_CATEGORY[x.meal_category] ?? 'ad_other',
      cuisine_ids: [],
      description: x.description ?? '',
      diet: DIET[x.diet] ?? null,
      serving: serving ? { ...serving, legacy_text: x.serving_size ?? null } : { qty: null, unit: null, legacy_text: x.serving_size ?? null },
      ingredients: [],
      allergens: [],
      allergen_note: x.allergens ?? '',
      photos: x.photos ?? [],
      menu_eligible: true,
      standalone: pricing === 'per_person' && price > 0
        ? { on: true, unit: 'per_serving', price_paise: price, min_qty: Number(x.min_qty) || null, increment: null, lead_days: null, max_capacity: null }
        : { on: false },
      active: true,
      pricing_status: pricing === 'per_counter' ? 'needs_review' : pricing === 'per_person' && !price ? 'needs_price' : 'ok',
      legacy: {
        ...legacy,
        counter_price_paise: pricing === 'per_counter' ? (price || null) : null,
        needs_review: pricing === 'per_counter' || (!serving && !!x.serving_size),
      },
    })
  }
  const { catalogue, ...rest } = a // eslint-disable-line no-unused-vars
  return {
    ...rest,
    _schema: CATERING_DRAFT_SCHEMA,
    _legacy_catalogue: old,             // the untouched original, kept for audit
    cuisines: a.cuisines ?? [],
    dishes,
    menus,
    counters: a.counters ?? [],
    packages: Array.isArray(a.packages) ? a.packages : [],
  }
}

/** Old-flow catering listing (vendor_services.specs) → dishes to offer as a one-tap import. */
export function dishesFromOldListing(specs = {}) {
  const names = new Set()
  for (const m of specs.menus ?? []) for (const line of m.lines ?? m.items ?? []) if (line?.name ?? line) names.add(String(line.name ?? line).trim())
  for (const d of specs.dishes ?? []) names.add(String(d.name ?? d).trim())
  return [...names].filter(Boolean)
}
