import { supabase } from './supabase'
import { SHOP_CATEGORIES } from '../config/shop'

/**
 * The shelves — from the database when there is one, from code when there
 * is not.
 *
 * ── Why this is not just a table read ────────────────────────────────────
 * `SHOP_CATEGORIES` in config/shop.js has been the list since the shop
 * existed. It is imported by fourteen screens, it carries the taglines the
 * storefront prints, and it is the thing a route matches against. Migration
 * 051 adds `shop_categories` so an admin can add a seventh shelf without a
 * deploy — but migrations here are applied by hand, so for some window (and
 * possibly a long one) the table does not exist and the app still has to run.
 *
 * So: the config list is the FLOOR and the table is the AUTHORITY. Anything in
 * the table wins for the fields it sets; anything only in the config is still
 * offered; a shelf switched off in the table disappears from the storefront
 * but is still resolvable by id, because `order_items` from last month point
 * at it and a retired shelf must not render an order line as blank.
 *
 * The merge happens here, once, rather than in every caller — which is the
 * same reason config/dataviz.js exists.
 */

// Postgres says 42P01; PostgREST says PGRST205 and never gets that far. Both
// mean the same thing here — the table is not there yet, which is not an error.
const MISSING_TABLE = '42P01'
const isMissing = err =>
  err?.code === MISSING_TABLE ||
  err?.code === 'PGRST205' ||
  /could not find the table/i.test(err?.message ?? '')

/**
 * The two values migration 051 writes when it has nothing better to put there.
 *
 * The emoji is compared with the variation selector (U+FE0F) stripped, because
 * '🛍' and '🛍️' are different strings and which one is stored depends on how
 * the SQL file reached the editor — and on this project that is a paste
 * through PowerShell, which mangles UTF-8.
 */
const SEED_SORT = 100
const isPlaceholderEmoji = e => !e || e.replace(/️/g, '') === '\u{1F6CD}'

/** A config entry, in the shape a database row has. */
function fromConfig(c, i) {
  return {
    id: c.id,
    label: c.label,
    emoji: c.emoji ?? '🛍️',
    tagline: c.tagline ?? null,
    blurb: null,
    hero_image_url: null,
    kind: 'shop',
    sort_order: (i + 1) * 10,
    is_active: true,
    // Tells the console this shelf has no row yet, so it can offer to write
    // one instead of pretending an edit was saved.
    _source: 'config',
  }
}

/** The built-in shelves, always available, even offline. */
export const FALLBACK_CATEGORIES = SHOP_CATEGORIES.map(fromConfig)

/**
 * Every shelf, merged and sorted.
 *
 * `kind` filters to one surface ('shop' or 'celebration'); pass 'all' for the
 * console, which edits both. `includeInactive` is for the console too — the
 * storefront must never see a retired shelf, and the console must never lose
 * one.
 */
export async function fetchCategories({ kind = 'shop', includeInactive = false } = {}) {
  let rows = []
  let live = false

  try {
    const { data, error } = await supabase
      .from('shop_categories')
      .select('*')
      .order('sort_order')
      .order('label')

    if (error) throw error
    rows = data ?? []
    live = true
  } catch (err) {
    // No table yet (051 not applied). Not an error — the shop has always
    // worked from the config list and continues to.
    if (!isMissing(err)) {
      // A real failure (offline, RLS) still falls back rather than blanking
      // the storefront, but it is worth surfacing in the console.
      live = false
    }
  }

  const byId = new Map()
  // Config first so the table's copy overwrites it, field by field, rather
  // than the other way round.
  for (const c of FALLBACK_CATEGORIES) byId.set(c.id, c)
  for (const r of rows) {
    const base = byId.get(r.id)
    byId.set(r.id, {
      ...base,
      ...r,
      // A NULL tagline in the table must not erase the one config carries —
      // that is a blank line on the shelf header, not an intentional edit.
      tagline: r.tagline ?? base?.tagline ?? null,
      // ── Placeholders are not edits ────────────────────────────────────
      // Migration 051 seeds every shelf from `products` with emoji '🛍️' and
      // sort_order 100, then tries to overwrite those with the real values in
      // a second statement. On this database that second statement did not
      // take: every row still reads 🛍️ / 100.
      //
      // That is invisible until something actually renders the table — and
      // then a live read replaces 🎂🎁💐🎈🪔🪆 with six identical shopping
      // bags and collapses the shelf order to alphabetical. So the same rule
      // the migration states for itself is enforced here, where it can be
      // relied on: a value that is still 051's own default means "nobody has
      // chosen one", and the config value wins. Anything else was typed by a
      // person and is left alone.
      emoji: isPlaceholderEmoji(r.emoji) ? (base?.emoji ?? '🛍️') : r.emoji,
      sort_order: r.sort_order === SEED_SORT && base ? base.sort_order : r.sort_order,
      _source: 'db',
    })
  }

  let out = [...byId.values()]
  if (kind !== 'all') out = out.filter(c => (c.kind ?? 'shop') === kind)
  if (!includeInactive) out = out.filter(c => c.is_active !== false)

  out.sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.label.localeCompare(b.label))
  return { categories: out, live }
}

/**
 * Create or update a shelf.
 *
 * An upsert rather than an insert-or-update pair: the console edits shelves
 * that exist only in config/shop.js as freely as ones that exist as rows, and
 * the first save of a config-only shelf has to write the row that was never
 * there. `id` is the primary key and the string stored on every product, so it
 * is set once at creation and never edited afterwards — see `renameCategory`
 * for what changing it would actually involve.
 */
export async function saveCategory(cat) {
  const row = {
    id: cat.id,
    label: cat.label?.trim() || cat.id,
    emoji: cat.emoji || null,
    tagline: cat.tagline?.trim() || null,
    blurb: cat.blurb?.trim() || null,
    hero_image_url: cat.hero_image_url || null,
    kind: cat.kind || 'shop',
    sort_order: Number.isFinite(+cat.sort_order) ? +cat.sort_order : 100,
    is_active: cat.is_active !== false,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('shop_categories')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Rename a shelf across everything that stores its name.
 *
 * The id is the string in `products.category`, so renaming is a data
 * migration, not an edit. Both writes are needed and they are not atomic from
 * the browser — products move first, so the worst interruption leaves products
 * on a shelf whose row is missing (they still render, via the config fallback
 * or as their own id) rather than a shelf with nothing on it.
 *
 * `order_items.category` (migration 022) is deliberately NOT touched. That
 * column is a snapshot of what the customer bought under, and rewriting
 * history to match a new name is how last quarter's numbers stop reconciling.
 */
export async function renameCategory(oldId, newId, patch = {}) {
  if (!oldId || !newId || oldId === newId) throw new Error('Nothing to rename.')

  const { error: moveErr } = await supabase
    .from('products').update({ category: newId }).eq('category', oldId)
  if (moveErr) throw moveErr

  const { data: existing } = await supabase
    .from('shop_categories').select('*').eq('id', oldId).maybeSingle()

  await saveCategory({ ...(existing ?? {}), ...patch, id: newId })

  if (existing) {
    await supabase.from('shop_categories').delete().eq('id', oldId)
  }
  return newId
}

/** How many live products sit on each shelf. Powers the counts in the console. */
export async function fetchCategoryCounts() {
  const { data, error } = await supabase.from('products').select('category')
  if (error) throw error
  const counts = {}
  for (const r of data ?? []) counts[r.category] = (counts[r.category] ?? 0) + 1
  return counts
}
