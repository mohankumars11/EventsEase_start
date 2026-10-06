#!/usr/bin/env node
/**
 * What can somebody do with nothing but the public key?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS GUARD EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * On 2026-09-14 a client holding only the anon key — no session, no
 * account — could UPDATE any row of `profiles` and `vendors`, including
 * setting `role = 'admin'`. The anon key is compiled into the bundle
 * and served to anybody who opens the site.
 *
 * Nothing in this repo was wrong. Every policy in supabase/migrations is
 * correct; the permissive grant was made against the live database,
 * outside version control, and no file here recorded it. Reading the
 * migrations could never have found it, and did not, for months.
 *
 * So the guard asks the DATABASE, as the weakest possible caller. That
 * is the only question whose answer cannot be faked by a tidy repo.
 *
 * ── Every probe restores what it changes ────────────────────────────
 * It writes to real rows, because a hole only shows on a row that
 * exists. Each value is read first, written, verified, and put straight
 * back — see the note in check-partner-isolation about the version of
 * that suite which renamed a real partner and left it renamed.
 *
 *   node scripts/check-anon-access.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon  = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,  { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

/** Try to write one column as anon; report whether it landed; undo it. */
async function cannotWrite(table, col, value) {
  const { data: row } = await admin.from(table).select(`id, ${col}`).limit(1).maybeSingle()
  if (!row) return { skipped: true }
  await anon.from(table).update({ [col]: value }).eq('id', row.id)
  const { data: after } = await admin.from(table).select(col).eq('id', row.id).single()
  const changed = String(after[col]) === String(value)
  if (changed) await admin.from(table).update({ [col]: row[col] }).eq('id', row.id)
  return { changed, restored: changed }
}

console.log('\nWRITES — a client with no session at all\n')

for (const [table, col, val] of [
  ['vendors',  'description',  'ANON_PROBE'],
  ['vendors',  'business_name','ANON_PROBE'],
  ['profiles', 'full_name',    'ANON_PROBE'],
]) {
  const r = await cannotWrite(table, col, val)
  if (r.skipped) { console.log(`  · ${table}.${col} — no rows`); continue }
  ok(`anon cannot write ${table}.${col}`, !r.changed,
     r.restored ? 'IT WROTE — value restored' : 'it wrote')
}

/* The one that turns a leak into a takeover. Probed against a vendor
   profile, never the real operator account. */
const { data: victim } = await admin.from('profiles')
  .select('id, email, role').eq('role', 'vendor').limit(1).maybeSingle()
if (victim) {
  await anon.from('profiles').update({ role: 'admin' }).eq('id', victim.id)
  const { data: after } = await admin.from('profiles').select('role').eq('id', victim.id).single()
  const escalated = after.role === 'admin'
  if (escalated) await admin.from('profiles').update({ role: victim.role }).eq('id', victim.id)
  ok('anon cannot make anybody an admin', !escalated, 'PRIVILEGE ESCALATION — reverted')
}

console.log('\nREADS — what leaks to a client with no session\n')

const { count: profAll } = await admin.from('profiles').select('id', { count: 'exact', head: true })
const { count: profAnon } = await anon.from('profiles').select('id', { count: 'exact', head: true })
ok('anon cannot read the user table', (profAnon ?? 0) === 0,
   `read ${profAnon} of ${profAll} profiles — names, emails and roles`)

const { data: payouts } = await anon.from('vendor_payout_details').select('id').limit(1)
ok('anon cannot read payout details', (payouts?.length ?? 0) === 0, 'bank and UPI details are readable')

const { data: interest } = await anon.from('partner_market_interest').select('id, email').limit(1)
ok('anon cannot read the recruitment pipeline', (interest?.length ?? 0) === 0,
   'partner contact details are readable')

/* The marketplace is SUPPOSED to be readable, and a fix that shut it
   would be a different kind of breakage. Asserted so the lock-down
   cannot quietly go too far. */
console.log('\nSTILL PUBLIC, ON PURPOSE\n')
const { count: vendorsAnon } = await anon.from('vendors').select('id', { count: 'exact', head: true })
ok('anon CAN still browse the marketplace', (vendorsAnon ?? 0) > 0, 'customer browsing is broken')
/* ── Offerings moved surface in 124, and the test had to move with it ─
   This asked `vendor_services` directly, which was right until 124: the
   base table carried review notes, review status and the partner's spec
   answers alongside the price, and a row policy hands out the whole row.
   The catalogue is `public_vendor_services` now — the same offerings,
   the columns a customer needs, and nothing from the review file.

   Both halves are asserted, because "service discovery still works" and
   "the private table stopped answering" are two different claims and
   this file would be worth little if it proved only the first. */
const { count: svcAnon } = await anon
  .from('public_vendor_services').select('id', { count: 'exact', head: true })
ok('anon CAN still see offerings, via the public catalogue', (svcAnon ?? 0) > 0,
   'service discovery is broken')

const { count: baseAnon } = await anon
  .from('vendor_services').select('id', { count: 'exact', head: true })
ok('...and NOT via the base table', !baseAnon,
   `read ${baseAnon} row(s) straight off vendor_services`)

console.log(`\n  ${bad ? cross : tick} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
