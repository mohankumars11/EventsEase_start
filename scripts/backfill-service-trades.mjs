#!/usr/bin/env node
/**
 * Give every service row a trade, so its partner can be matched.
 *
 *   node scripts/backfill-service-trades.mjs           (dry run)
 *   node scripts/backfill-service-trades.mjs --confirm
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE ROWS EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * `match_partners` joins on `vendor_services.category`. A blank category
 * matches nothing, so the partner is invisible to dispatch for that
 * service — permanently, with no error on any screen.
 *
 * The service form made the trade an optional "Tag as …" link carrying
 * `hidden sm:inline-flex`, which means it did not render on a phone at
 * all. Every service a partner added from their phone had a null
 * category.
 *
 * The form is fixed. These are the rows it already wrote.
 *
 * ── How a trade is chosen ───────────────────────────────────────────
 * From the service NAME first, against the same map dispatch uses, so a
 * row called "Photography" becomes Photography and not a guess. Failing
 * that, the vendor's own category — which is what the partner told us
 * they do.
 *
 * A row that matches neither is left alone and printed. Writing a
 * plausible wrong trade would be worse than leaving it unmatched: the
 * partner would start receiving jobs they do not do, accept one, and
 * find out on the day.
 */
import { createClient } from '@supabase/supabase-js'
import { loadSrc, readEnv } from './lib/loadSrc.mjs'

const CONFIRM = process.argv.includes('--confirm')
const db = createClient(readEnv('VITE_SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } })

const { TRADE_FOR_SERVICE } = await loadSrc({ 'src/config/vendor.js': ['TRADE_FOR_SERVICE'] })
const TRADES = [...new Set(Object.values(TRADE_FOR_SERVICE))]

/* Words that name a trade unambiguously.
 *
 * Explicit, because the first cut used a fuzzy "does the name contain a
 * trade's first word" rule and its dry run mapped "Buffet" to
 * Videography. That is the failure this whole script warns about,
 * produced by the script itself — a plausible wrong trade means the
 * partner starts receiving jobs they do not do.
 *
 * A short list that is right beats a clever rule that is usually right,
 * on a table with 598 rows and no undo. */
const KEYWORDS = {
  'photography': 'Photography',
  'photo': 'Photography',
  'videography': 'Videography',
  'video': 'Videography',
  'catering': 'Catering & Food',
  'buffet': 'Catering & Food',
  'food': 'Catering & Food',
  'cook': 'Catering & Food',
  'meal': 'Catering & Food',
  'cake': 'Cake & Desserts',
  'dessert': 'Cake & Desserts',
  'decor': 'Decoration & Floral',
  'floral': 'Decoration & Floral',
  'flower': 'Decoration & Floral',
  'stage': 'Decoration & Floral',
  'balloon': 'Decoration & Floral',
  'mandap': 'Decoration & Floral',
  'dj': 'DJ & Music',
  'sound': 'Sound & AV',
  'light': 'Event Lighting',
  'mehendi': 'Mehendi Artist',
  'henna': 'Mehendi Artist',
  'makeup': 'Bridal Makeup & Hair',
  'bridal': 'Bridal Makeup & Hair',
  'anchor': 'Anchor & MC',
  'emcee': 'Anchor & MC',
  'tent': 'Tent & Furniture',
  'furniture': 'Tent & Furniture',
  'transport': 'Transportation',
  'security': 'Security Services',
  'venue': 'Venue',
  'invitation': 'Invitation & Printing',
}

/** Does this service name name a trade, without guessing? */
function tradeFromName(name) {
  const n = String(name ?? '').toLowerCase().trim()
  if (!n) return null

  // An exact trade name — the commonest case, because the form used to
  // suggest the vendor's own category as the service name too.
  const exact = TRADES.find(t => t.toLowerCase() === n)
  if (exact) return exact

  // A keyword, longest first so "videography" wins over "video".
  const hit = Object.keys(KEYWORDS)
    .sort((a, b) => b.length - a.length)
    .find(k => n.includes(k))

  return hit ? KEYWORDS[hit] : null
}

const { data: rows } = await db
  .from('vendor_services')
  .select('id, vendor_id, name, category, is_active')

const { data: vendors } = await db.from('vendors').select('id, business_name, category, is_synthetic')
const vendorOf = new Map((vendors ?? []).map(v => [v.id, v]))

const broken = (rows ?? []).filter(r => !r.category || !String(r.category).trim())

console.log(`\n  ${rows?.length ?? 0} service rows · ${broken.length} without a trade\n`)

const plan = []
const stuck = []

for (const r of broken) {
  const v = vendorOf.get(r.vendor_id)
  /* Only the NAME is trusted.
   *
   * The vendor's own category was a tempting fallback and it is wrong
   * here: sariyo's row is called "videpgraphy" — a typo for videography
   * — and their vendor category is Photography, so the fallback would
   * have quietly filed a videography service as photography. The
   * partner would then be offered photography jobs for a row they meant
   * as video.
   *
   * A row nobody can read is left for a human. The form now has a
   * required trade picker, so fixing it is one tap in the app — far
   * cheaper than discovering the wrong trade on an event day. */
  const fromName = tradeFromName(r.name)
  const line = `${String(v?.business_name ?? '?').slice(0, 18).padEnd(18)} "${String(r.name ?? '').slice(0, 24)}"`

  if (fromName) {
    plan.push({ id: r.id, trade: fromName })
    console.log(`    ${line}  →  ${fromName}`)
  } else {
    stuck.push({ ...r, vendor: v?.business_name, vendorCategory: v?.category })
    console.log(`    ${line}  →  CANNOT TELL from the name — left for the partner`)
  }
}

if (stuck.length) {
  console.log(`\n  ${stuck.length} row(s) left unmatched on purpose. A plausible wrong`)
  console.log('  trade is worse than none: the partner starts receiving jobs they')
  console.log('  do not do, accepts one, and finds out on the day.')
}

if (!CONFIRM) {
  console.log(`\n  Dry run. Re-run with --confirm to write ${plan.length} row(s).\n`)
  process.exit(0)
}

for (const p of plan) {
  const { error } = await db.from('vendor_services').update({ category: p.trade }).eq('id', p.id)
  if (error) console.log('    FAILED', p.id, error.message)
}
console.log(`\n  Wrote ${plan.length} row(s). Those partners are now matchable.\n`)
