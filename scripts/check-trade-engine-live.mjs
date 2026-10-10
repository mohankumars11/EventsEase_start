#!/usr/bin/env node
/**
 * Is the 34-trade engine installed in the live database? Read-only.
 *
 * Run after pasting 20261010_07, _08 and _09. Uses only the anon key and
 * never writes a row: it reads the registry and fee policy, and calls the
 * engine RPCs with an id that cannot exist, which must answer cleanly
 * (NOT_ELIGIBLE / null) rather than "function does not exist".
 *
 *   node --env-file=.env scripts/check-trade-engine-live.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (run with --env-file=.env).'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })
const NOPE = '00000000-0000-4000-8000-000000000000'

let ran = 0, bad = 0
const ok = (name, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? '✓' : '✗'} ${name}${cond ? '' : `   <-- ${d}`}`) }

const reg = await db.from('sambramo_trade_registry').select('id, allowed_kinds, required_answers')
ok('07: registry has 34 trades', !reg.error && reg.data?.length === 34, reg.error?.message ?? reg.data?.length)
ok('07: every trade has its allowed pricing kinds', !reg.error && reg.data.every(r => r.allowed_kinds?.length > 0))
const pol = await db.from('sambramo_trade_pricing_policy').select('trade_id, platform_fee_rate')
ok('07: a fee policy row per trade (default 8%)', !pol.error && pol.data?.length === 34 && pol.data.every(p => Number(p.platform_fee_rate) === 0.08 || p.platform_fee_rate === null),
  pol.error?.message ?? JSON.stringify(pol.data?.filter(p => Number(p.platform_fee_rate) !== 0.08)))
const fee = await db.rpc('sambramo_customer_paise_for', { p_take_home: 500000, p_trade: 'photography' })
ok('07: server rounding matches the app (₹5,000 → ₹5,435)', fee.data === 543480, fee.error?.message ?? fee.data)

const sub = await db.rpc('submit_listing_version', { p_vendor_service_id: NOPE, p_payload: {} })
// Granted to signed-in partners only, so as anon "permission denied" proves it exists.
ok('08: submit_listing_version exists (and anon cannot call it)', /Listing not found|permission denied/.test(sub.error?.message ?? ''), sub.error?.message)

const res = await db.rpc('resolve_booking', { p_vendor_service_id: NOPE, p_req: { event_date: '2026-12-01' } })
ok('09: resolve_booking exists', !res.error && res.data?.path === 'NOT_ELIGIBLE', res.error?.message ?? JSON.stringify(res.data))
const pub = await db.rpc('listing_public', { p_vendor_service_id: NOPE })
ok('09: listing_public exists', !pub.error, pub.error?.message)
const list = await db.rpc('public_listings', { p_trade: 'photography' })
ok('09: public_listings answers for a trade', !list.error && Array.isArray(list.data), list.error?.message)

console.log(`\ncheck-trade-engine-live: ${ran - bad}/${ran} passed`)
process.exit(bad ? 1 : 0)
