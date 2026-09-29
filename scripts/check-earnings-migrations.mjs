#!/usr/bin/env node
/**
 * Did 136-141 actually apply?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT "I PASTED IT, SO IT IS THERE"
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations here are applied by hand, one paste at a time, and a file
 * that half-applies is the failure this project has already had: a
 * SECURITY DEFINER function CREATEs successfully and fails at call time,
 * a CHECK swap aborts and rolls back silently, a GRANT is forgotten so a
 * function exists that no partner may execute.
 *
 * So this asks the DATABASE, not the repo.
 *
 * ── READ-ONLY, and deliberately so ──────────────────────────────────
 *
 * Every RPC below is called with arguments that provably hit an EARLY
 * RETURN, before any INSERT:
 *
 *   settle_payout_claim(random uuid)      -> no_claim
 *   fail_payout_claim(random uuid)        -> no_claim
 *   settle_payout_batch(random uuid)      -> no_batch
 *   open_payout_batch(random uuid, [])    -> no_payout_details
 *   add_partner_adjustment(penalty, +1)   -> wrong_sign
 *   reverse_partner_adjustment(random)    -> no_adjustment
 *   claim_all_ready()                     -> not_a_partner (no auth.uid)
 *
 * This matters. `check-booking-capture.mjs` writes a Rs 1 fixture into
 * the production escrow ledger, which is append-only, so it can never be
 * run twice cleanly. This file does not write anything, ever.
 *
 *   node scripts/check-earnings-migrations.mjs
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
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const NOWHERE = '00000000-0000-0000-0000-000000000000'

/** Can we select these columns? 42703 = column, 42P01 = table. */
async function cols(table, list) {
  const { error } = await db.from(table).select(list.join(', ')).limit(1)
  return error ? error.message : null
}

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args)
  /* PGRST202 is "could not find the function", which is what a missing
     migration looks like from here. Anything else means it ran. */
  if (error) return { missing: /PGRST202|Could not find the function/i.test(error.message), error }
  return { data }
}

console.log('\n136 · money_audit\n')
{
  const e = await cols('money_audit',
    ['id', 'at', 'actor_id', 'actor_role', 'action', 'subject_type',
     'subject_id', 'vendor_id', 'line_id', 'amount_paise', 'before', 'after', 'reason'])
  ok('the table exists with every column', !e, e)
}

console.log('\n137 · a payout can fail\n')
{
  const e = await cols('payout_claims',
    ['id', 'status', 'failed_at', 'failure_code', 'failure_reason',
     'attempt', 'supersedes_id', 'idempotency_key'])
  ok('payout_claims has the failure columns', !e, e)

  const r = await rpc('claim_payment', { p_line_id: NOWHERE })
  ok('claim_payment still answers a one-argument call',
     !r.missing, r.error?.message ?? '')
  ok('and refuses a line that is not yours',
     r.data?.ok === false && r.data?.reason === 'not_yours', JSON.stringify(r.data))

  const r2 = await rpc('claim_payment', { p_line_id: NOWHERE, p_idempotency_key: 'probe' })
  ok('and takes the new idempotency key', !r2.missing, r2.error?.message ?? '')
}

console.log('\n138 · batches\n')
{
  const e = await cols('payout_batches',
    ['id', 'vendor_id', 'status', 'method', 'destination', 'amount_paise',
     'reference', 'idempotency_key', 'opened_at', 'paid_at', 'failed_at', 'settled_by'])
  ok('payout_batches exists', !e, e)

  const e2 = await cols('payout_claims', ['batch_id'])
  ok('payout_claims.batch_id exists', !e2, e2)

  const r = await rpc('open_payout_batch',
    { p_vendor_id: NOWHERE, p_claim_ids: [], p_idempotency_key: null })
  ok('open_payout_batch exists', !r.missing, r.error?.message ?? '')
  ok('and stops before writing when there is nowhere to pay',
     r.data?.ok === false && r.data?.reason === 'no_payout_details', JSON.stringify(r.data))

  const r2 = await rpc('claim_all_ready', { p_idempotency_key: null })
  ok('claim_all_ready exists', !r2.missing, r2.error?.message ?? '')
  ok('and refuses a caller who is not a partner',
     r2.data?.ok === false && r2.data?.reason === 'not_a_partner', JSON.stringify(r2.data))
}

console.log('\n139 · settling\n')
{
  const r = await rpc('settle_payout_claim',
    { p_claim_id: NOWHERE, p_reference: 'probe', p_adapter: 'ManualPayout',
      p_gateway_transfer_id: null, p_has_pan: null })
  ok('settle_payout_claim exists', !r.missing, r.error?.message ?? '')
  /* service_role satisfies caller_is_operator(), so getting past the
     gate to no_claim proves BOTH that the function is there and that the
     operator check works. */
  ok('the operator gate lets service_role through to no_claim',
     r.data?.ok === false && r.data?.reason === 'no_claim', JSON.stringify(r.data))

  const r2 = await rpc('fail_payout_claim',
    { p_claim_id: NOWHERE, p_code: 'other', p_reason: 'probe' })
  ok('fail_payout_claim exists', !r2.missing && r2.data?.reason === 'no_claim',
     JSON.stringify(r2.data ?? r2.error?.message))

  const r3 = await rpc('reject_payout_claim', { p_claim_id: NOWHERE, p_reason: 'probe' })
  ok('reject_payout_claim exists', !r3.missing && r3.data?.reason === 'no_claim',
     JSON.stringify(r3.data ?? r3.error?.message))

  const r4 = await rpc('settle_payout_batch',
    { p_batch_id: NOWHERE, p_reference: 'probe', p_adapter: 'ManualPayout',
      p_gateway_transfer_id: null })
  ok('settle_payout_batch exists', !r4.missing && r4.data?.reason === 'no_batch',
     JSON.stringify(r4.data ?? r4.error?.message))

  const r5 = await rpc('fail_payout_batch',
    { p_batch_id: NOWHERE, p_code: 'other', p_reason: 'probe' })
  ok('fail_payout_batch exists', !r5.missing && r5.data?.reason === 'no_batch',
     JSON.stringify(r5.data ?? r5.error?.message))
}

console.log('\n140 · adjustments\n')
{
  const e = await cols('partner_adjustments',
    ['id', 'vendor_id', 'line_id', 'kind', 'amount_paise', 'reason',
     'effective_on', 'reverses_id', 'settled_claim_id', 'created_by', 'created_at'])
  ok('partner_adjustments exists', !e, e)

  /* A positive penalty is refused BEFORE the insert -- the sign guard is
     the first thing after caller_is_operator(). Nothing is written. */
  const r = await rpc('add_partner_adjustment',
    { p_vendor_id: NOWHERE, p_kind: 'penalty', p_amount_paise: 1,
      p_reason: 'probe, not written', p_line_id: null })
  ok('add_partner_adjustment exists', !r.missing, r.error?.message ?? '')
  ok('and refuses a penalty with the wrong sign, before writing',
     r.data?.ok === false && r.data?.reason === 'wrong_sign', JSON.stringify(r.data))

  const r2 = await rpc('reverse_partner_adjustment', { p_id: NOWHERE, p_reason: 'probe' })
  ok('reverse_partner_adjustment exists',
     !r2.missing && r2.data?.reason === 'no_adjustment',
     JSON.stringify(r2.data ?? r2.error?.message))
}

console.log('\n141 · the view\n')
{
  const e = await cols('partner_jobs', ['line_id', 'platform_fee_paise', 'platform_fee_rate', 'settled_at'])
  ok('partner_jobs gained its three columns', !e, e)

  const WANT = [
    'line_id', 'vendor_id', 'trade', 'event_date',
    'line_status', 'settled_at',
    'quoted_amount_paise', 'platform_fee_paise', 'platform_fee_rate', 'partner_amount_paise',
    'held_paise', 'is_funded', 'released_partner_paise', 'remitted_tcs_paise',
    'remitted_tds_paise', 'released_platform_paise', 'penalty_partner_paise',
    'refunded_customer_paise', 'last_movement_at',
    'claim_id', 'claim_status', 'claim_destination', 'claim_reference',
    'claim_failure_code', 'claim_attempt',
    'batch_id', 'batch_status', 'batch_reference',
    'adjustments_paise', 'adjustment_count', 'dispute_status',
    'claimable_at', 'payout_state',
  ]
  const e2 = await cols('partner_earnings', WANT)
  ok(`partner_earnings exists with all ${WANT.length} columns`, !e2, e2)

  /* The view joins payout_batches and partner_adjustments, so selecting
     from it at all is evidence 138 and 140 are in too. */
  const { data, error } = await db.from('partner_earnings')
    .select('line_id, payout_state, claimable_at').limit(5)
  ok('and it reads', !error, error?.message ?? '')
  if (data?.length) {
    console.log(`     ${data.length} row(s) visible to service_role, e.g. ${data[0].payout_state}`)
  } else if (!error) {
    /* Be precise about what an empty result does and does not prove.
       TWO different things produce zero rows here and this probe cannot
       tell them apart:

         a) the database has no accepted bookings at all
         b) the view gates on `v.profile_id = auth.uid() OR get_my_role()
            IN ('admin','event_coordinator')`, and service_role has
            neither an auth.uid() nor a profiles row -- so it is filtered
            out exactly like any other non-owner

       On a pre-launch database both are true at once. Reading zero rows
       is therefore evidence the view PARSES and EXECUTES, and no
       evidence whatsoever that it ISOLATES. That needs two real partner
       sessions and real rows -- see check-partner-isolation.mjs. */
    const { count } = await db.from('booking_lines')
      .select('*', { count: 'exact', head: true })
    console.log(`     0 rows. booking_lines holds ${count ?? '?'} row(s) in total,`)
    console.log('     and service_role is filtered out by the view\'s own WHERE')
    console.log('     regardless. This proves the view runs, NOT that it isolates.')
  }
}

console.log('\nWHAT STILL CANNOT BE PROVEN WITHOUT WRITING\n')
console.log('  The widened escrow_ledger CHECK (REMIT_TCS, REMIT_TDS,')
console.log("  counterparty 'authority') is only exercised by a real settle.")
console.log('  It cannot be probed read-only, and escrow_ledger is')
console.log('  append-only so a probe row could never be removed.')
console.log('  If it did not apply, the first settle_payout_claim aborts its')
console.log('  own transaction and writes NOTHING -- which is safe, and is')
console.log('  why settle-claim.mjs has a dry run.\n')

console.log(`${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
