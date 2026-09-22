#!/usr/bin/env node
/**
 * Did 142 and 143 actually apply?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ASK THE DATABASE AND NOT THE REPO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations here are pasted by hand. A file existing in
 * supabase/migrations proves somebody wrote it, not that anybody ran it
 * — and this project has already shipped code against a migration that
 * had not been applied, which is how the review clock came to be written,
 * wired, screenshotted and inert all at once.
 *
 * ══════════════════════════════════════════════════════════════════════
 * READ-ONLY, AND THAT IS ENFORCED BY THE ARGUMENTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two of these functions WRITE when called properly. They are called
 * with arguments that provably hit an early return first:
 *
 *   submit_for_review()          service_role has no auth.uid(), so the
 *                                vendor lookup misses and it returns
 *                                not_a_partner before any UPDATE
 *   extend_review(…, 0, …)       p_hours <= 0 is refused as bad_hours
 *                                before the UPDATE is reached
 *   document_expiry_state(date)  IMMUTABLE, pure
 *   review_sla_hours()           IMMUTABLE, pure
 *
 * `check-booking-capture.mjs` writes a Rs 1 fixture into the production
 * escrow ledger, which is append-only, so it can never be run twice
 * cleanly. This file writes nothing, ever, and can be run on a whim.
 *
 *   node scripts/check-verification-migrations.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const NOWHERE = '00000000-0000-0000-0000-000000000000'

/** One column at a time, so a failure names the column and not the set. */
async function column(table, col) {
  const { error } = await db.from(table).select(col).limit(1)
  return error ? error.message : null
}

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args)
  if (error) {
    const missing = /PGRST202|Could not find the function/i.test(error.message)
    return { missing, error }
  }
  return { data }
}

console.log('\n142 · THE THREE-TIER VERIFICATION VOCABULARY\n')
for (const c of ['checksum_ok', 'checksum_rule', 'checked_at',
                 'provider_status', 'provider_name', 'provider_ref', 'provider_at',
                 'holder_name', 'expires_on']) {
  const e = await column('vendor_documents', c)
  ok(`vendor_documents.${c}`, !e, e)
}

console.log('\n142 · THE REVIEW CLOCK\n')
for (const c of ['review_due_at', 'review_extended', 'review_note']) {
  const e = await column('vendors', c)
  ok(`vendors.${c}`, !e, e)
}

{
  const r = await rpc('review_sla_hours', {})
  ok('review_sla_hours() exists', !r.missing, r.error?.message ?? '')
  /* The SLA is a function rather than a literal so the promise on screen
     and the deadline in the database cannot drift. If this is not 24,
     ReviewCountdown is promising something the database will not keep. */
  ok('and the SLA is 24 hours', r.data === 24, `got ${JSON.stringify(r.data)}`)
}

{
  const r = await rpc('submit_for_review', {})
  ok('submit_for_review() exists', !r.missing, r.error?.message ?? '')
  ok('and refuses a caller with no partner row, writing nothing',
     r.data?.ok === false && r.data?.reason === 'not_a_partner',
     JSON.stringify(r.data))
}

{
  /* p_hours = 0 is refused before the UPDATE. Proves the function is
     there and that its guard works, without touching a row. */
  const r = await rpc('extend_review', { p_vendor_id: NOWHERE, p_hours: 0, p_note: null })
  ok('extend_review() exists', !r.missing, r.error?.message ?? '')
  ok('and refuses a nonsense extension before writing',
     r.data?.ok === false && r.data?.reason === 'bad_hours',
     JSON.stringify(r.data))
}

console.log('\n143 · ONE ROW PER REQUIREMENT\n')
for (const c of ['requirement_id', 'listing_id', 'trade',
                 'back_path', 'issuing_authority', 'issue_date']) {
  const e = await column('vendor_documents', c)
  ok(`vendor_documents.${c}`, !e, e)
}

console.log('\n143 · THE EXPIRY LADDER\n')
{
  const cases = [
    ['no expiry date', null, 'no_expiry'],
    ['long in the future', '2099-01-01', 'valid'],
    ['already past', '2000-01-01', 'expired'],
  ]
  for (const [label, input, want] of cases) {
    const r = await rpc('document_expiry_state', { p_expires_on: input })
    ok(`document_expiry_state · ${label}`, r.data === want,
       r.missing ? 'function missing' : `got ${JSON.stringify(r.data)}`)
  }

  /* The 30-day warning, computed against IST rather than the server's
     idea of today — the boundary every other date in this product is
     anchored to. */
  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
  const far = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10)
  const a = await rpc('document_expiry_state', { p_expires_on: soon })
  const b = await rpc('document_expiry_state', { p_expires_on: far })
  ok('a document expiring in 10 days warns', a.data === 'expiring_soon', JSON.stringify(a.data))
  ok('one expiring in 200 days does not', b.data === 'valid', JSON.stringify(b.data))
}

console.log('\nWHAT THE TRANSACTION BOUNDARY PROVES\n')

/* ── A stronger claim than it looks ──────────────────────────────────
   PostgREST cannot read pg_catalog, so a constraint cannot be probed
   directly. But both migrations are a single BEGIN … COMMIT, and
   Postgres gives no partial commits: either every statement in the
   file took effect or none did.

   So the LAST object each file creates is a witness for everything
   before it. document_expiry_state() is the final statement of 143,
   after the UNIQUE swap -- if it answers, the swap ran. */
{
  const t143 = await rpc('document_expiry_state', { p_expires_on: null })
  ok('143 committed whole, so UNIQUE (vendor_id, kind) is gone',
     !t143.missing && t143.data === 'no_expiry',
     'its last statement answers, so the constraint swap before it ran')

  const t142 = await rpc('review_sla_hours', {})
  ok('142 committed whole, so the kind CHECK is widened and the guard armed',
     !t142.missing && t142.data === 24,
     'the kind CHECK and guard_document_self_verify precede it in the file')
}

console.log('\nSTILL UNPROVEN, EXERCISED IN PHASE 2\n')
console.log('  · requirement_id NOT NULL — needs an attempted null insert')
console.log('  · guard_document_self_verify refusing a PARTNER write, which')
console.log('    needs a real partner session rather than service_role')
console.log('  check-document-capture.mjs asserts both on the first upload.\n')


console.log(`${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
