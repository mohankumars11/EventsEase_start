#!/usr/bin/env node
/**
 * Apply migration 212 (trade #35, Restaurant & Dining) over PostgREST.
 *
 *   node --env-file=.env scripts/apply-restaurant-trade.mjs [--check]
 *
 * The migration is rows only — a registry row, a pricing-policy row and a
 * verification-policy row — so it needs no SQL editor: every write here is
 * an upsert on the key, safe to run twice. --check reads instead of writes
 * and exits non-zero if the trade is not live.
 *
 * Why over PostgREST: migrations are pasted by hand on this project
 * (sambramo-migrations-by-hand), and a customer can meet the restaurant
 * trade in the app the moment the registry row exists.
 */
import { createClient } from '@supabase/supabase-js'

const CHECK = process.argv.includes('--check')
const url = process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (node --env-file=.env)'); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

const REGISTRY = {
  id: 'restaurant', code: 'E27', code_ref: 'RESTO', name: 'Restaurant & Dining', sort_order: 35, archetype: 'PER_GUEST_FOOD', tiers: true, regulated: true,
  allowed_kinds: ['per_person', 'per_guest', 'fixed', 'quote'],
  required_answers: ['restaurant_name', 'cuisines', 'diet', 'dining_modes', 'meal_formats', 'photos', 'seating_capacity', 'advance_notice_hours'],
  resource_model: 'capacity', catalogue_key: 'packages',
  compliance: [
    { doc: 'VER-TRADE-FSSAI', always: true, when: null, blocks_instant: true },
    { doc: 'VER-TRADE-LIQUOR', always: false, when: { q: 'alcohol', truthy: true }, blocks_instant: false },
  ],
}
const POLICY = { trade_id: 'restaurant', platform_fee_rate: 0.08 }
const VERIFY = { requirement_id: 'VER-TRADE-FSSAI', market: null, trade: 'Restaurant & Dining', service: null, mandatory_from: '2026-11-01', note: 'A restaurant serving a celebration is food service under the FSS Act 2006.' }

let bad = 0
const ok = (label, pass, detail = '') => { console.log(`${pass ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`); if (!pass) bad++ }

if (!CHECK) {
  const r1 = await db.from('sambramo_trade_registry').upsert(REGISTRY, { onConflict: 'id' })
  ok('registry row upserted', !r1.error, r1.error?.message)
  const r2 = await db.from('sambramo_trade_pricing_policy').upsert(POLICY, { onConflict: 'trade_id', ignoreDuplicates: true })
  ok('pricing policy row', !r2.error, r2.error?.message)
  const { data: have, error: e3 } = await db.from('verification_policy').select('id').eq('trade', VERIFY.trade).eq('requirement_id', VERIFY.requirement_id).is('market', null).is('service', null)
  if (e3 && /does not exist|schema cache/i.test(e3.message)) console.log('· verification_policy not present (146 not applied) — skipped')
  else if (e3) ok('verification policy read', false, e3.message)
  else if (have?.length) console.log('· verification policy row already there')
  else { const r3 = await db.from('verification_policy').insert(VERIFY); ok('verification policy row', !r3.error, r3.error?.message) }
}

const { data: reg } = await db.from('sambramo_trade_registry').select('id, code, name, sort_order, archetype, required_answers').eq('id', 'restaurant').maybeSingle()
ok('trade registry has restaurant', !!reg, reg ? `${reg.code} · ${reg.name} · #${reg.sort_order} · ${reg.archetype}` : 'missing')
ok('required answers match the trade file', JSON.stringify(reg?.required_answers) === JSON.stringify(REGISTRY.required_answers))
const { data: pol } = await db.from('sambramo_trade_pricing_policy').select('trade_id, platform_fee_rate').eq('trade_id', 'restaurant').maybeSingle()
ok('pricing policy 8%', Number(pol?.platform_fee_rate) === 0.08)
const { data: id } = await db.rpc('sambramo_trade_id', { p_key: 'Restaurant & Dining' })
ok('sambramo_trade_id resolves the name', id === 'restaurant', String(id))
console.log(bad ? `\n${bad} check(s) failed` : '\nRestaurant & Dining is live in the registry.')
process.exit(bad ? 1 : 0)
