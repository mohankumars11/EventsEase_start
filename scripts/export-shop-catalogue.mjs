#!/usr/bin/env node
/**
 * Dump every shop table to JSON before migration 054 drops them.
 *
 *   node scripts/export-shop-catalogue.mjs
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 * The shop is being removed and the tables are being dropped rather than
 * archived. Two things in them are not reproducible:
 *
 *   1. ~700 curated products — Indian-market names, INR pricing, and 48
 *      culturally specific occasion tags — plus roughly 190 KB of per-product
 *      image URLs hand-assigned across migrations 016/017/021/023/024/026/028.
 *      Heritage & Crafts (047/048: Mysore silk, rare handloom, carvings) is in
 *      here too, and it is the shelf most likely to come back one day as an
 *      event add-on.
 *   2. `orders` rows, if any real customer ever checked out. Those are invoice
 *      records. Under s.36 of the CGST Act books and invoices are retained for
 *      72 months, and a DROP destroys them with no way back.
 *
 * The migration files stay in git as the audit trail for the schema. This
 * script is the audit trail for the *rows*.
 *
 * ── Why the service-role key ──────────────────────────────────────────────
 * `products` is world-readable, so an anon key would dump the catalogue fine.
 * `orders` is not: its RLS policy is `customer_id = auth.uid()`, so an
 * anonymous client reads zero rows whether the table holds none or ten
 * thousand. Counting orders with the anon key would report "0" and look like
 * reassurance. This needs SUPABASE_SERVICE_ROLE_KEY to tell the difference
 * between "empty" and "hidden from you", which is the whole point of running
 * it. The key is read from .env and never printed.
 *
 * Output: backup/shop-catalogue-<ISO date>.json  (backup/ is gitignored —
 * order rows carry customer addresses.)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env'), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)

const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('✗ VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env')
  console.log('  The anon key is not enough: orders is behind RLS and would')
  console.log('  report 0 rows whether or not any exist.')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

/* Every table migration 054 drops. Order matters only for readability. */
const TABLES = [
  'products',
  'product_media',
  'product_faqs',
  'product_option_groups',
  'product_option_values',
  'product_story_slides',
  'shop_categories',
  'coupons',
  'orders',
  'order_items',
  'order_events',
  'return_requests',
]

/* PostgREST caps a request; page rather than trust a single select. */
const PAGE = 1000

async function dump(table) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1)

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { table, missing: true, rows: [] }
      }
      throw new Error(`${table}: ${error.code ?? ''} ${error.message}`)
    }
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return { table, missing: false, rows }
}

const results = []
for (const table of TABLES) {
  try {
    results.push(await dump(table))
  } catch (err) {
    console.log(`✗ ${table}: ${err.message}`)
    process.exit(1)
  }
}

const payload = {
  exportedAt: new Date().toISOString(),
  project: url.replace(/^https:\/\/([^.]+).*/, '$1'),
  reason: 'Pre-054 shop removal. See scripts/export-shop-catalogue.mjs.',
  tables: Object.fromEntries(
    results.map(r => [r.table, r.missing ? null : r.rows]),
  ),
}

const dir = join(ROOT, 'backup')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const out = join(dir, `shop-catalogue-${new Date().toISOString().slice(0, 10)}.json`)
writeFileSync(out, JSON.stringify(payload, null, 2), 'utf8')

/* ── Report ─────────────────────────────────────────────────────────────── */
const width = Math.max(...TABLES.map(t => t.length))
for (const r of results) {
  const count = r.missing ? 'already gone' : `${r.rows.length} rows`
  console.log(`  ${r.table.padEnd(width)}  ${count}`)
}

const orders = results.find(r => r.table === 'orders')
const orderCount = orders?.missing ? 0 : (orders?.rows.length ?? 0)

console.log(`\n→ ${out}`)

if (orderCount > 0) {
  console.log(
    `\n⚠  ${orderCount} real order${orderCount === 1 ? '' : 's'} found.\n` +
    '   These are invoice records, and s.36 of the CGST Act asks for 72 months\n' +
    '   of retention. Copy this JSON somewhere outside the repo BEFORE running\n' +
    '   migration 054 — the DROP is permanent and there is no second chance.',
  )
} else {
  console.log(
    '\n✓ No order rows. Nothing with a retention obligation is being destroyed;\n' +
    '  the catalogue above is the only thing this file is preserving.',
  )
}
