import { supabase } from './supabase'
import { isNotInstalled } from './productStudio'

/**
 * Customisations the admin defines, rather than ones a developer wrote.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 * `src/config/customizers/` answers "what can be changed about this product"
 * for four categories, in code. This answers it for every other product, from
 * the database, and lets the four coded ones be refined without a deploy.
 *
 * The two are MERGED, not swapped — see `mergeOptionGroups`. Cakes keep their
 * weight ladder and their egg question; the admin adds a candle pack on top.
 *
 * ── The rule this module exists to hold ──────────────────────────────────
 * Everything downstream — the sheet, the price on the button, the cart line's
 * identity, the note that reaches whoever packs the box — already works off
 * one group shape, defined in config/customizers/engine.js. So this module's
 * only real job is to produce that exact shape, and to never produce a subtly
 * different one. A DB group that priced as an add-on where the code group
 * priced as absolute would overcharge silently, which is why `absolute`
 * travels through the view rather than being inferred here.
 */

/** Migration 053 not applied yet — an empty catalogue, not an error. */
const EMPTY = { global: [], byCategory: new Map(), byProduct: new Map(), installed: false }

let cache = null
let inFlight = null

/**
 * Every option group in the shop, in one read.
 *
 * One query for the whole catalogue rather than one per product, because the
 * decision this feeds — does tapping ADD open a sheet or drop straight into
 * the cart — has to be made the instant a thumb lands on a grid of twenty
 * cards. A query per card would be twenty requests to answer a question about
 * a table that holds tens of rows.
 */
export async function loadOptionCatalog({ force = false } = {}) {
  if (force) { cache = null; inFlight = null }
  if (cache) return cache
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('product_options_resolved')
        .select('*')
        .order('sort_order')
      if (error) throw error

      const global = []
      const byCategory = new Map()
      const byProduct = new Map()

      for (const row of data ?? []) {
        const group = toGroup(row)
        if (row.product_id) {
          if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
          byProduct.get(row.product_id).push(group)
        } else if (row.category) {
          if (!byCategory.has(row.category)) byCategory.set(row.category, [])
          byCategory.get(row.category).push(group)
        } else {
          global.push(group)
        }
      }

      cache = { global, byCategory, byProduct, installed: true }
      return cache
    } catch (err) {
      // A missing table is the feature being off. Anything else — offline, RLS
      // — also degrades to "no extra options" rather than blocking ADD, since
      // the code builders are still there and a customer must never be unable
      // to buy a cake because an optional table did not answer.
      if (!isNotInstalled(err)) console.warn('Product options unavailable:', err.message)
      cache = EMPTY
      return cache
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Drop the cache after an edit in the console. */
export function invalidateOptionCatalog() {
  cache = null
  inFlight = null
}

/** A `product_options_resolved` row, in the shape engine.js already speaks. */
function toGroup(row) {
  return {
    id: row.key,
    label: row.label,
    // `help` reaches the customer under three different prop names depending
    // on the group type, because ProductCustomizeSheet already renders each
    // type differently: `text` is the body of an info card, `hint` is the line
    // under a heading, `placeholder` is inside the box. One field in the
    // console, put wherever that type actually shows it.
    text:        row.type === 'info' ? (row.help ?? undefined) : undefined,
    placeholder: row.type === 'text' ? (row.help ?? undefined) : undefined,
    hint:        row.type === 'info' || row.type === 'text' ? undefined : (row.help ?? undefined),
    type: row.type ?? 'single',
    role: row.role ?? 'addon',
    max: row.max_select ?? undefined,
    maxLength: row.max_length ?? 120,
    required: row.required ?? false,
    options: (row.options ?? []).map(o => ({
      id: o.id,
      label: o.label,
      note: o.note ?? undefined,
      // Numeric comes back as a string over PostgREST. An unconverted "149"
      // makes `base + addOnTotal` string-concatenate, and the customer is shown
      // a price of "8990149".
      price: o.price == null ? 0 : Number(o.price),
      absolute: o.absolute == null ? undefined : Number(o.absolute),
      default: Boolean(o.default),
      image_url: o.image_url ?? undefined,
    })),
    _db: true,
    _scope: row.product_id ? 'product' : row.category ? 'category' : 'shop',
  }
}

/**
 * The groups that apply to one product, broadest first, most specific last.
 *
 * Deduplicated on `key`: a product-level 'wrap' REPLACES the shelf's 'wrap'
 * rather than rendering under it. Two questions with the same name and
 * different prices is the failure mode of a scoped system, and it is the
 * customer who has to work out which one is real.
 */
export function optionsForProduct(catalog, product) {
  if (!product) return []
  const byKey = new Map()
  for (const g of catalog.global) byKey.set(g.id, g)
  for (const g of catalog.byCategory.get(product.category) ?? []) byKey.set(g.id, g)
  for (const g of catalog.byProduct.get(product.id) ?? []) byKey.set(g.id, g)

  return [...byKey.values()].filter(g => g.type === 'info' || g.options.length > 0 || g.type === 'text')
}

/**
 * Code groups and admin groups, as one list.
 *
 * An admin group whose key matches a code group's id REPLACES it IN PLACE —
 * position preserved, not appended to the end. That is what makes "the cake
 * weight ladder, but with our prices" possible: the customer still meets the
 * questions in the order the builder intended, and the sheet has no way to
 * tell which of them came from where.
 *
 * Everything else is appended in scope order, so shop-wide extras sit after
 * the category's own questions rather than in front of them.
 */
export function mergeOptionGroups(codeGroups = [], dbGroups = []) {
  const overrides = new Map(dbGroups.map(g => [g.id, g]))
  const used = new Set()

  const merged = codeGroups.map(g => {
    const override = overrides.get(g.id)
    if (!override) return g
    used.add(g.id)
    return override
  })

  for (const g of dbGroups) {
    if (!used.has(g.id)) merged.push(g)
  }
  return merged
}

/* ══════════════════════════════════════════════════════════════════════
   The console side
   ══════════════════════════════════════════════════════════════════════ */

/** The raw groups for one scope, for editing. Values come nested. */
export async function fetchOptionGroups({ productId = null, category = null } = {}) {
  try {
    let q = supabase
      .from('product_option_groups')
      .select('*, values:product_option_values(*)')

    if (productId) q = q.eq('product_id', productId)
    else if (category) q = q.is('product_id', null).eq('category', category)
    else q = q.is('product_id', null).is('category', null)

    const { data, error } = await q.order('sort_order')
    if (error) throw error

    const rows = (data ?? []).map(g => ({
      ...g,
      values: [...(g.values ?? [])].sort(
        (a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.label.localeCompare(b.label)
      ),
    }))
    return { groups: rows, installed: true }
  } catch (err) {
    if (isNotInstalled(err)) return { groups: [], installed: false }
    throw err
  }
}

/** Everything that applies to a product, INCLUDING inherited scopes, read-only. */
export async function fetchInheritedGroups(product) {
  const out = []
  for (const scope of [{}, { category: product.category }]) {
    const { groups, installed } = await fetchOptionGroups(scope)
    if (!installed) return { groups: [], installed: false }
    out.push(...groups.map(g => ({ ...g, _inherited: scope.category ? 'shelf' : 'shop' })))
  }
  return { groups: out, installed: true }
}

const SLUG = s => String(s ?? '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40)

export { SLUG as slugify }

/**
 * Write one group and its values.
 *
 * Values are replaced wholesale rather than diffed. The alternative is three
 * round trips of insert/update/delete reconciliation to save a list of five
 * radio buttons, and a half-applied diff leaves a question with two defaults
 * or none. Deleting and re-inserting under the same `key` keeps the identity
 * that matters — the key is what the cart signature hashes, not the row id.
 */
export async function saveOptionGroup(group, values, { productId = null, category = null } = {}) {
  const key = SLUG(group.key || group.label)
  if (!key) throw new Error('That question needs a name.')
  if (!group.label?.trim()) throw new Error('That question needs a label.')

  const row = {
    product_id: productId,
    category: productId ? null : category,
    key,
    label: group.label.trim(),
    help: group.help?.trim() || null,
    type: group.type || 'single',
    role: group.role || 'addon',
    max_select: group.type === 'multi' && group.max_select ? Number(group.max_select) : null,
    max_length: group.type === 'text' && group.max_length ? Number(group.max_length) : null,
    required: Boolean(group.required),
    sort_order: Number.isFinite(+group.sort_order) ? +group.sort_order : 100,
    is_active: group.is_active !== false,
    updated_at: new Date().toISOString(),
  }

  // Upsert on the scope's unique key, so saving twice edits rather than
  // duplicating — see the three partial indexes in migration 053.
  const conflict = productId ? 'product_id,key' : category ? 'category,key' : 'key'
  const { data: saved, error } = await supabase
    .from('product_option_groups')
    .upsert(row, { onConflict: conflict })
    .select()
    .single()
  if (error) throw error

  if (group.type === 'single' || group.type === 'multi') {
    await supabase.from('product_option_values').delete().eq('group_id', saved.id)

    const clean = (values ?? [])
      .filter(v => v.label?.trim())
      .map((v, i) => ({
        group_id: saved.id,
        key: SLUG(v.key || v.label) || `opt-${i + 1}`,
        label: v.label.trim(),
        note: v.note?.trim() || null,
        price: v.price === '' || v.price == null ? 0 : Number(v.price),
        absolute: v.absolute === '' || v.absolute == null ? null : Number(v.absolute),
        // Only a 'single' needs a default, and it needs exactly one — a radio
        // group with two defaults renders whichever the engine finds first,
        // which is a coin flip on the price shown before anyone touches it.
        is_default: group.type === 'single' && Boolean(v.is_default),
        image_url: v.image_url?.trim() || null,
        sort_order: (i + 1) * 10,
        is_active: v.is_active !== false,
      }))

    if (group.type === 'single' && clean.length && !clean.some(v => v.is_default)) {
      clean[0].is_default = true
    }
    if (group.type === 'single') {
      let seen = false
      for (const v of clean) {
        if (v.is_default && seen) v.is_default = false
        if (v.is_default) seen = true
      }
    }

    if (clean.length) {
      const { error: vErr } = await supabase.from('product_option_values').insert(clean)
      if (vErr) throw vErr
    }
  }

  invalidateOptionCatalog()
  return saved
}

export async function deleteOptionGroup(id) {
  const { error } = await supabase.from('product_option_groups').delete().eq('id', id)
  if (error) throw error
  invalidateOptionCatalog()
}

export async function reorderOptionGroup(list, id, direction) {
  const i = list.findIndex(g => g.id === id)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return list

  const a = list[i], b = list[j]
  await supabase.from('product_option_groups').update({ sort_order: b.sort_order ?? (j + 1) * 10 }).eq('id', a.id)
  await supabase.from('product_option_groups').update({ sort_order: a.sort_order ?? (i + 1) * 10 }).eq('id', b.id)
  invalidateOptionCatalog()

  const next = [...list]
  next[i] = b; next[j] = a
  return next
}

/* ── Starting points ──────────────────────────────────────────────────────

   A blank "add a question" form is a wall. Somebody who has never built a
   product configurator does not know that a size ladder should be `absolute`
   and a gift wrap should not, and getting that one field wrong is the
   difference between a ₹2,400 saree and a ₹1,200 one.

   These are the shapes that recur across every shelf this shop has, priced at
   zero so nothing is charged that the admin did not type. They are inserted as
   a normal group and are fully editable afterwards — a template, not a mode.
*/
export const OPTION_TEMPLATES = [
  {
    id: 'size',
    icon: '📏',
    title: 'Size or weight',
    blurb: 'A ladder where each step replaces the price — the way a cake weight or a hamper tier works.',
    group: { key: 'size', label: 'Size', type: 'single', role: 'spec', help: 'Pick the size you need' },
    values: [
      { label: 'Small', absolute: '', is_default: true },
      { label: 'Medium', absolute: '' },
      { label: 'Large', absolute: '' },
    ],
    hint: 'Fill in the price of each step under “replaces price”. Leave the one that matches the catalogue price as it is.',
  },
  {
    id: 'colour',
    icon: '🎨',
    title: 'Colour or finish',
    blurb: 'One choice out of several, at no extra cost.',
    group: { key: 'colour', label: 'Colour', type: 'single', role: 'spec' },
    values: [
      { label: 'As pictured', price: 0, is_default: true },
      { label: 'Tell us below', price: 0 },
    ],
  },
  {
    id: 'wrap',
    icon: '🎀',
    title: 'Gift wrapping',
    blurb: 'Priced extras added on top of the product.',
    group: { key: 'wrap', label: 'Gift wrapping', type: 'single', role: 'addon' },
    values: [
      { label: 'Standard gift wrap', price: 0, is_default: true },
      { label: 'Premium fabric wrap', price: 149 },
      { label: 'No wrapping — I’ll wrap it', price: 0 },
    ],
  },
  {
    id: 'addons',
    icon: '➕',
    title: 'Add-ons',
    blurb: 'Tick as many as you like — chocolates, a card, a candle.',
    group: { key: 'addons', label: 'Add something to it', type: 'multi', role: 'addon', max_select: 4 },
    values: [
      { label: 'Greeting card', price: 49 },
      { label: 'Box of chocolates', price: 299 },
      { label: 'Fresh flower bunch', price: 249 },
    ],
  },
  {
    id: 'message',
    icon: '✍️',
    title: 'A message',
    blurb: 'Free text that reaches whoever packs it. Quoted first in the order note.',
    group: { key: 'message', label: 'Message on the card', type: 'text', role: 'note', max_length: 120, help: 'Leave blank for none' },
    values: [],
  },
  {
    id: 'delivery',
    icon: '🚚',
    title: 'When it arrives',
    blurb: 'Delivery windows, recorded on their own line of the order.',
    group: { key: 'delivery', label: 'Delivery', type: 'single', role: 'schedule' },
    values: [
      { label: 'Standard — 10am to 8pm', price: 0, is_default: true },
      { label: 'Fixed 2-hour slot', price: 99 },
      { label: 'Midnight — 11pm to 12:30am', price: 199 },
    ],
  },
  {
    id: 'note',
    icon: 'ℹ️',
    title: 'Something they should know',
    blurb: 'No input — a fact shown inside the sheet before they choose.',
    group: { key: 'know', label: 'Please note', type: 'info', role: 'spec' },
    values: [],
  },
]
