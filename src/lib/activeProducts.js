import { supabase } from './supabase'

/**
 * Product reads that never surface a retired product.
 *
 * ── The leak ──────────────────────────────────────────────────────────────
 * `Shop` and `ShopCategory` both filter `is_active = true`. Two other places
 * that put products in front of customers did not: the home screen's shop
 * rail and the home screen's search. Both selected an explicit column list
 * that omitted `is_active` and then never filtered on it, so a product the
 * admin had taken off the shelf still appeared on the app's front screen and
 * still opened a live product page with a working Add button.
 *
 * ── Why they were written that way ────────────────────────────────────────
 * Not carelessness. `is_active` arrives in migration 037, migrations here are
 * applied by hand, and a `.eq('is_active', true)` against a database that has
 * not had 037 pasted into it does not return zero rows — it returns error
 * 42703 and the rail renders nothing at all. Choosing an explicit column list
 * was how those two call sites stayed alive on an un-migrated database, and
 * the leak was the price.
 *
 * ── What this does instead ────────────────────────────────────────────────
 * Ask for the filter; if Postgres says the column does not exist, run the
 * query again without it. So:
 *
 *   037 applied      retired products are filtered out, which is correct
 *   037 not applied  every product shows, which is exactly today's behaviour
 *
 * There is no third case, and no database on which this is worse than what it
 * replaces. The same 42703-and-retry shape is already used by
 * `lib/celebrationReviews`, `lib/productStudio` and `PlanningWizard`.
 *
 * The absence is remembered per page load, so a shop with 037 missing pays
 * for one failed round trip rather than one per rail.
 */

const MISSING_COLUMN = '42703'

/** null = not yet known. Reset on reload, which is when a migration would land. */
let columnPresent = null

function isMissingColumn(error) {
  if (!error) return false
  return error.code === MISSING_COLUMN ||
    /is_active/.test(error.message ?? '') && /does not exist|schema cache/i.test(error.message ?? '')
}

/**
 * The common case: select these columns, only from products still on sale.
 *
 * @param columns  explicit column list, WITHOUT `is_active` — it is appended
 *                 here when the column is available, so a caller cannot ask
 *                 for a column that may not exist.
 * @param shape    (query) => query — the rest of the query (filters, order,
 *                 limit). Must be pure; it is applied to a fresh builder on
 *                 the retry.
 */
export async function selectActive(columns, shape = q => q) {
  const attempt = (withFilter) => {
    const cols = withFilter ? `${columns}, is_active` : columns
    let q = supabase.from('products').select(cols)
    if (withFilter) q = q.eq('is_active', true)
    return shape(q)
  }

  if (columnPresent === false) return attempt(false)

  const res = await attempt(true)
  if (res.error && isMissingColumn(res.error)) {
    // Migration 037 is not applied on this database. Say so once, then stop
    // asking — and return the unfiltered rows rather than an empty shelf.
    columnPresent = false
    if (import.meta.env.DEV) {
      console.warn(
        '[activeProducts] `products.is_active` is absent — migration 037 has not ' +
        'been applied to this database. Retired products cannot be filtered out ' +
        'until it is.'
      )
    }
    return attempt(false)
  }

  if (!res.error) columnPresent = true
  return res
}
