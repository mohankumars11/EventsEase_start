#!/usr/bin/env node
/**
 * Can an anonymous caller read what only an operator should see?
 *
 *   node scripts/check-admin-rls.mjs
 *
 * Hiding a button is not security. The console's new tables carry RLS
 * policies written in migrations 173-178, but a policy that was never
 * exercised is a claim, not a control. This asks the database directly,
 * with the ANON key the browser holds, and fails if anything that
 * should be operator-only comes back.
 */
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(['.env','.env.local'].flatMap(f => {
  try { return readFileSync(f,'utf8').split('\n') } catch { return [] }
}).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))
const U = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
if (!U || !ANON) { console.error('missing url or anon key'); process.exit(1) }
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` }

/* RLS filters rather than raising, so an empty 200 is a PASS and a
   non-empty 200 is the failure. A test that only checks for an error
   proves nothing here. */
const MUST_BE_EMPTY = [
  'partner_bar_beverages_profiles', 'partner_catering_food_profiles',
  'partner_photography_profiles', 'partner_venue_profiles',
  'partner_catering_food_items',
  'vendor_documents', 'partner_payout_accounts', 'payout_claims',
  'partner_adjustments', 'escrow_ledger', 'sambramo_partner_private',
  'partner_story_slide_events', 'partner_story_events',
]

let bad = 0, checked = 0
for (const t of MUST_BE_EMPTY) {
  const r = await fetch(`${U}/rest/v1/${t}?select=*&limit=3`, { headers: H })
  const body = await r.text()
  if (r.status === 404 || /does not exist|not find the table/i.test(body)) {
    console.log(`  SKIP ${t.padEnd(38)} not present`)
    continue
  }
  checked++
  let rows = []
  try { rows = JSON.parse(body) } catch { /* an error object, not rows */ }
  if (Array.isArray(rows) && rows.length > 0) {
    console.log(`  LEAK ${t.padEnd(38)} ${rows.length} row(s) readable as anon`)
    bad++
  } else {
    console.log(`  ok   ${t.padEnd(38)} ${r.status} ${Array.isArray(rows) ? 'empty' : 'refused'}`)
  }
}

/* The operator predicate itself must not be callable by anyone — if
   caller_is_operator() returns true for anon, every policy above is
   decoration. */
const rpc = await fetch(`${U}/rest/v1/rpc/caller_is_operator`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: '{}' })
const rpcBody = (await rpc.text()).trim()
const operatorAsAnon = rpcBody === 'true'
console.log(`\n  caller_is_operator() as anon -> ${rpcBody || rpc.status}`)
if (operatorAsAnon) { console.log('  LEAK anon is treated as an operator'); bad++ }

/* ── the part that makes the rest mean anything ───────────────────────
   Most operator-only tables are empty today, so "anon saw nothing" is
   not evidence: an empty table returns nothing to everyone. Plant one
   row with the service key, read it back as anon, remove it. If anon
   can see the planted row then every ok above was an accident of there
   being no data. */
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.log()
  console.log('  no service key - planted-row check skipped, so the result above is weak')
} else {
  const SH = { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'content-type': 'application/json' }
  const vend = await (await fetch(U + '/rest/v1/vendors?select=id&limit=1', { headers: SH })).json()
  const vendorId = Array.isArray(vend) && vend[0] ? vend[0].id : null
  if (!vendorId) {
    console.log()
    console.log('  no vendor row to attach a probe to - planted-row check skipped')
  } else {
    const ins = await fetch(U + '/rest/v1/partner_bar_beverages_profiles', {
      method: 'POST',
      headers: Object.assign({}, SH, { Prefer: 'return=representation' }),
      body: JSON.stringify({ vendor_id: vendorId, trade_id: 'bar_beverages', display_name: 'RLS probe - delete me' }),
    })
    if (!ins.ok) {
      console.log()
      console.log('  could not plant a probe row (' + ins.status + ') - check skipped: ' + (await ins.text()).slice(0, 140))
    } else {
      const made = await ins.json()
      const row = made[0]
      const seen = await (await fetch(U + '/rest/v1/partner_bar_beverages_profiles?select=id,display_name&limit=5', { headers: H })).json()
      const n = Array.isArray(seen) ? seen.length : 0
      const visible = Array.isArray(seen) && seen.some(r => r.id === row.id)
      console.log()
      console.log('  planted 1 row as service-role; anon sees ' + n)
      if (visible) { console.log('  LEAK the planted row is readable as anon'); bad++ }
      else console.log('  ok   planted row invisible to anon - RLS is doing work, not just an empty table')
      await fetch(U + '/rest/v1/partner_bar_beverages_profiles?id=eq.' + row.id, { method: 'DELETE', headers: SH })
      console.log('  probe row removed')
    }
  }
}

console.log(`\n${bad ? `FAIL — ${bad} problem(s) across ${checked} tables` : `PASS — ${checked} operator-only tables return nothing to anon`}`)
process.exit(bad ? 1 : 0)
