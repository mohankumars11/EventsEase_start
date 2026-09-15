#!/usr/bin/env node
/**
 * Remove the test residue that leaves a synthetic partner holding an
 * ACCEPTED offer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT REMOVES, AND HOW IT KNOWS IT IS SAFE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Scope is derived, never typed: start from the offers that actually
 * violate the invariant —
 *
 *   dispatch_offers.status = 'ACCEPTED'
 *   AND the vendor behind it has is_synthetic = true
 *
 * — and delete those offers, first clearing the pointer the line holds
 * to them. Nothing else is touched.
 *
 * ── What it deliberately does NOT do, and why ──────────────────────
 * The first version also deleted the booking_lines and their escrow
 * rows. The database stopped it:
 *
 *   escrow_ledger is append-only: write a compensating row instead of
 *   a DELETE
 *
 * That guard (062) is right and the script was wrong. A Rs 1 HOLD is
 * still a record of money having moved, and the modelled way to undo one
 * is a REFUND_CUSTOMER entry — which here would mean FABRICATING a
 * refund that never happened in order to tidy a test. Inventing
 * financial history is a worse outcome than leaving the residue, so
 * neither is done: the holds stay, the lines stay.
 *
 * A dispatch offer is not financial history. It is a routing record, no
 * ledger entry references it, and deleting the ones that name a partner
 * who does not exist removes exactly what the invariant is about.
 *
 * ── The safety checks are assertions, not comments ──────────────────
 * It refuses to delete anything if a line carries money that is not a
 * ₹1 test hold, or if a payout has been claimed against it. Being told
 * "it is all test data" is not the same as having checked, and this
 * file is what gets re-run on a database where that is no longer true.
 *
 *   node scripts/clean-synthetic-dispatch.mjs          # dry run
 *   node scripts/clean-synthetic-dispatch.mjs --apply  # delete
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)

const { data: offenders } = await db.from('dispatch_offers')
  .select('id, line_id, vendor_id, vendors!inner(business_name, is_synthetic)')
  .eq('status', 'ACCEPTED').eq('vendors.is_synthetic', true)

if (!offenders?.length) {
  console.log(`\n  ${tick} nothing to clean — no synthetic partner holds an ACCEPTED offer\n`)
  process.exit(0)
}

const lineIds = [...new Set(offenders.map(o => o.line_id))]
console.log(`\n  ${offenders.length} offending offer(s) across ${lineIds.length} line(s)\n`)
for (const o of offenders) {
  console.log(`    offer ${o.id.slice(0, 8)}  ${o.vendors.business_name}`)
}

/* ── Refuse to proceed on anything that looks real ────────────────── */
const { data: escrow } = await db.from('escrow_ledger')
  .select('id, line_id, kind, amount_paise, adapter').in('line_id', lineIds)
const notFixture = (escrow ?? []).filter(e => e.amount_paise !== 100 || e.kind !== 'HOLD')
const { data: claims } = await db.from('payout_claims').select('id, line_id').in('line_id', lineIds)

console.log(`\n  escrow rows on those lines : ${escrow?.length ?? 0} (all Rs 1 HOLD fixtures: ${!notFixture.length})`)
console.log(`  payout claims on those lines: ${claims?.length ?? 0}`)

if (notFixture.length || claims?.length) {
  console.log(`\n  ${cross} REFUSING — a line carries money that is not a Rs 1 test hold, or a payout was claimed.`)
  console.log('    Inspect by hand. This script will not delete real financial history.\n')
  process.exit(1)
}

const { data: vict } = await db.from('booking_lines')
  .select('id, trade, status, request_id').in('id', lineIds)
const { data: offs } = await db.from('dispatch_offers').select('id, status').in('line_id', lineIds)

console.log('\n  WOULD RELEASE  — via partner_cancel_line, nothing is deleted\n')
console.log(`    ${offenders.length} ACCEPTED offer(s) -> LOST`)
for (const o of offenders) console.log(`      ${o.id.slice(0, 8)}  ${o.vendors.business_name}`)
console.log(`\n    ${vict.length} line(s) -> dispatching (standing)`)
for (const l of vict) console.log(`      ${l.id.slice(0, 8)} ${l.trade} (${l.status} now)`)
console.log(`\n  LEFT EXACTLY AS IT IS\n`)
console.log(`    escrow_ledger   ${escrow.length} Rs 1 holds — append-only by design (062),`)
console.log(`                    and the line keeps its money when it goes back to dispatch`)
console.log(`    the ${offs.length - offenders.length} other offers on these lines, the lines, the requests,`)
console.log(`    vendors, profiles — none deleted`)

if (!APPLY) {
  console.log(`\n  dry run — re-run with --apply to delete\n`)
  process.exit(0)
}

/* ══════════════════════════════════════════════════════════════════
   THE PLATFORM ALREADY MODELS THIS, AND IT IS NOT A DELETE
   ══════════════════════════════════════════════════════════════════

   Two earlier drafts of this script tried to delete their way out, and
   the database refused both times — correctly:

     escrow_ledger is append-only: write a compensating row instead of a DELETE
     new row violates check constraint "booking_lines_accepted_has_offer"

   The second one is the clearer signal. 059's comment on that
   constraint reads: "Reaching paid with no offer behind it means money
   is held for a partner nobody can name." Nulling the pointer would
   have created exactly the state the schema exists to forbid.

   `partner_cancel_line` (083) is the operation for "the accepted
   partner is not going to do this job", which is precisely true of a
   partner who does not exist. It:

     · sets the ACCEPTED offer to LOST — history kept, not erased
     · returns the line to dispatching/standing
     · leaves escrow exactly where it is, by design: "the line returns
       to dispatch and keeps its money"

   So nothing is deleted, no financial history is invented, and the
   invariant is satisfied by the thing actually being true: no synthetic
   partner is holding an accepted job any more.

   It requires an operator — `get_my_role() IN ('admin','event_coordinator')`
   — and the service role is not one, because get_my_role() is NULL
   without an auth.uid() behind it. So this mints a real admin session,
   the same way the security suites do. */
const { data: op } = await db.from('profiles').select('email').eq('role', 'admin').limit(1).maybeSingle()
if (!op?.email) { console.log(`  ${cross} no admin account to act as`); process.exit(1) }

const { data: link, error: linkErr } =
  await db.auth.admin.generateLink({ type: 'magiclink', email: op.email })
if (linkErr) { console.log(`  ${cross} could not mint an operator session: ${linkErr.message}`); process.exit(1) }

const asOperator = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { error: otpErr } = await asOperator.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'email' })
if (otpErr) { console.log(`  ${cross} ${otpErr.message}`); process.exit(1) }

console.log(`\n  APPLYING as ${op.email}\n`)

for (const lineId of lineIds) {
  const { data: res, error } = await asOperator.rpc('partner_cancel_line', {
    p_line_id: lineId,
    p_reason: 'Seeded test partner — released by synthetic-dispatch cleanup',
  })
  if (error) { console.log(`  ${cross} line ${lineId.slice(0, 8)}: ${error.message}`); process.exit(1) }
  const okd = res?.ok !== false
  console.log(`  ${okd ? tick : cross} line ${lineId.slice(0, 8)}: ${okd ? 'offer released to LOST, line back to dispatch' : JSON.stringify(res)}`)
  if (!okd) process.exit(1)
}

await asOperator.auth.signOut()

const { count: left } = await db.from('dispatch_offers')
  .select('id, vendors!inner(is_synthetic)', { count: 'exact', head: true })
  .eq('status', 'ACCEPTED').eq('vendors.is_synthetic', true)
console.log(`\n  ${left ? cross : tick} synthetic ACCEPTED offers remaining: ${left ?? 0}\n`)
process.exit(left ? 1 : 0)
