// What a cake *is*, derived from the catalogue row.
//
// `products` has one free-text `occasion` column and nothing else describing
// the item. That single tag has to carry the reason someone is buying — a
// bento cake bought for a bride-to-be is tagged 'Bride to Be', because
// tagging it 'Bento' would put a style and an occasion in the same filter row
// and make both useless.
//
// So style, weight, serving size and dietary suitability are read back off
// the name and description here rather than stored. That is deliberate and it
// is also the honest option: adding weight_kg / is_eggless / style columns
// would mean the UI silently mis-renders every row until someone remembers to
// apply the migration, and migrations in this project are applied by hand.
// Everything below degrades to a sensible default when it can't tell.

/* ── Weight ─────────────────────────────────────────────────────────── */

// "(1.5kg)" / "(0.5kg)" / "(500g)". Cupcake boxes and jar sets have no
// weight — "(Box of 12)" is a count, and pretending it's 12kg would be worse
// than admitting we don't know.
export function parseWeightKg(name = '') {
  const kg = name.match(/\((\d+(?:\.\d+)?)\s*kg\)/i)
  if (kg) return parseFloat(kg[1])
  const g = name.match(/\((\d+)\s*g\)/i)
  if (g) return parseFloat(g[1]) / 1000
  return null
}

// "(Set of 3)", "(Box of 12)", "(24 pcs)" — the unit count for anything sold
// by the piece.
export function parsePieceCount(name = '') {
  const m = name.match(/\((?:set|box|pack)\s+of\s+(\d+)\)/i) || name.match(/\((\d+)\s*(?:pcs|pieces)\)/i)
  return m ? parseInt(m[1], 10) : null
}

// Bakery convention: a kilo of celebration cake cuts into 8–10 party slices.
export function servesFor(weightKg) {
  if (!weightKg) return null
  if (weightKg <= 0.35) return '1–2 people'
  if (weightKg <= 0.5)  return '4–6 people'
  if (weightKg <= 1)    return '8–10 people'
  if (weightKg <= 1.5)  return '12–15 people'
  if (weightKg <= 2)    return '16–20 people'
  if (weightKg <= 3)    return '25–30 people'
  return `${Math.round(weightKg * 9)}+ people`
}

/* ── Form ───────────────────────────────────────────────────────────────
 * How the thing is physically served. This is what decides whether the
 * customiser may offer a weight or a shape at all: you cannot order a box of
 * cupcakes "in a heart shape at 2kg", and offering it is how a shop takes an
 * order it can't fulfil.
 */
export const CAKE_FORMS = {
  bento:    { id: 'bento',    label: 'Bento',       resizable: false, shapeable: false },
  cupcakes: { id: 'cupcakes', label: 'Cupcakes',    resizable: false, shapeable: false },
  jars:     { id: 'jars',     label: 'Jar cakes',   resizable: false, shapeable: false },
  tower:    { id: 'tower',    label: 'Tower',       resizable: false, shapeable: false },
  tiered:   { id: 'tiered',   label: 'Tiered cake', resizable: false, shapeable: false },
  round:    { id: 'round',    label: 'Cake',        resizable: true,  shapeable: true  },
}

export function formFor(product) {
  const name = product?.name ?? ''
  if (/bento/i.test(name))                       return CAKE_FORMS.bento
  if (/cupcake/i.test(name))                     return CAKE_FORMS.cupcakes
  if (/jar cake|cake in a jar/i.test(name))      return CAKE_FORMS.jars
  if (/tower/i.test(name))                       return CAKE_FORMS.tower
  if (/tier/i.test(name))                        return CAKE_FORMS.tiered
  return CAKE_FORMS.round
}

/* ── Style ──────────────────────────────────────────────────────────────
 * The browse-by-style rail. One style per cake, most specific first — a
 * "Collage Photo Cake" is a photo cake, not a classic one.
 */
export const CAKE_STYLES = [
  { id: 'bento',    label: 'Bento & mini',     emoji: '🍱', test: /bento/i },
  { id: 'jar',      label: 'Jar cakes',        emoji: '🫙', test: /jar/i },
  { id: 'cupcakes', label: 'Cupcakes',         emoji: '🧁', test: /cupcake/i },
  { id: 'photo',    label: 'Photo cakes',      emoji: '📸', test: /photo/i },
  { id: 'surprise', label: 'Surprise cakes',   emoji: '🎊', test: /pinata|pull-me-up|bomb|surprise|smash/i },
  { id: 'tiered',   label: 'Tiered & tall',    emoji: '🗼', test: /tier|tall|tower/i },
  { id: 'designer', label: 'Designer & fondant', emoji: '🎨', test: /fondant|theme|sculpt|designer|3d/i },
  { id: 'classic',  label: 'Classic cakes',    emoji: '🎂', test: /./ },
]

export function styleFor(product) {
  const haystack = `${product?.name ?? ''} ${product?.description ?? ''}`
  return CAKE_STYLES.find(s => s.test.test(haystack)) ?? CAKE_STYLES[CAKE_STYLES.length - 1]
}

/* ── Diet ───────────────────────────────────────────────────────────────
 * The green dot. In India "pure veg" on a cake means eggless, and it is the
 * single most-asked question at the counter — which is why it gets a marker
 * on the card rather than a line in the description.
 *
 * A cake that isn't explicitly eggless is NOT marked veg. Guessing the
 * permissive answer here would put a green dot on a cake containing egg.
 */
export const DIET_TAGS = [
  { id: 'eggless',     label: 'Eggless',      short: 'Eggless',     test: /eggless|egg-free|egg free/i },
  { id: 'vegan',       label: 'Vegan',        short: 'Vegan',       test: /vegan/i },
  { id: 'sugar-free',  label: 'Sugar-free',   short: 'No sugar',    test: /sugar-?free|diabetic/i },
  { id: 'gluten-free', label: 'Gluten-free',  short: 'Gluten-free', test: /gluten-?free/i },
]

export function dietTagsFor(product) {
  const haystack = `${product?.name ?? ''} ${product?.description ?? ''} ${product?.occasion ?? ''}`
  return DIET_TAGS.filter(t => t.test.test(haystack))
}

// Vegan and pet-safe cakes contain no egg either, so both count as veg.
export function isVeg(product) {
  const tags = dietTagsFor(product).map(t => t.id)
  if (tags.includes('eggless') || tags.includes('vegan')) return true
  return /pet-safe/i.test(product?.description ?? '')
}

/* ── One call for everything a card or sheet needs ──────────────────── */
export function cakeFacts(product) {
  const weightKg = parseWeightKg(product?.name)
  return {
    weightKg,
    pieces: parsePieceCount(product?.name),
    serves: servesFor(weightKg),
    form:   formFor(product),
    style:  styleFor(product),
    diets:  dietTagsFor(product),
    veg:    isVeg(product),
  }
}
