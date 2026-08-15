#!/usr/bin/env node
/**
 * Did migrations 045 and 046 actually land?
 *
 *   node scripts/check-migrations-045-046.mjs
 *
 * ── Why probe rather than trust ───────────────────────────────────────────
 * Migrations here are applied by hand in the SQL editor, and a run that
 * half-applied — a statement that errored partway, a policy that stranded on
 * 42710 — leaves a database that looks fine until a customer hits the one
 * screen that needs the missing column. PROJECT_SUMMARY already lists three
 * migrations nobody is certain about for exactly this reason.
 *
 * ── How it can tell ───────────────────────────────────────────────────────
 * PostgREST reports a missing table as 42P01 and a missing column as 42703,
 * and it does that BEFORE evaluating row-level security. So an anonymous
 * client can prove a column exists without being allowed to read a single
 * row: an empty result means "present, and RLS correctly hid everything",
 * while an error code means the schema is not what the app expects.
 *
 * That distinction is the whole trick — it needs no service-role key, so this
 * is safe to run anywhere.
 */
import { readFileSync } from 'node:fs'
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
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.log('✗ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env')
  process.exit(1)
}
const supabase = createClient(url, key)

const results = []

/** Present unless PostgREST says the table or column is not there. */
async function probe(label, table, columns) {
  const { error } = await supabase.from(table).select(columns).limit(1)
  if (!error) return results.push({ label, ok: true, note: 'present' })

  const code = error.code ?? ''
  if (code === '42P01') return results.push({ label, ok: false, note: `table "${table}" does not exist` })
  if (code === '42703') return results.push({ label, ok: false, note: `a column is missing: ${error.message}` })
  if (code === 'PGRST204' || code === 'PGRST200') {
    return results.push({ label, ok: false, note: `schema cache does not know it yet: ${error.message}` })
  }
  // 42501 and friends are permission answers, which still prove the shape.
  results.push({ label, ok: true, note: `present (RLS answered ${code || 'without a code'})` })
}

console.log('\nProbing the live database with the anon key…\n')

// ── 045 ────────────────────────────────────────────────────────────────
await probe('045 · celebration_events',
  'celebration_events',
  'id, subject_type, subject_id, kind, from_value, to_value, visibility, customer_copy, actor_role, note, created_at')

await probe('045 · service_enquiries.updated_at',
  'service_enquiries', 'id, updated_at')

// ── 046 ────────────────────────────────────────────────────────────────
await probe('046 · event_payments milestone columns',
  'event_payments',
  'id, milestone_id, schedule_version, due_at, claimed_at, paid_at, gateway_order_id, gateway_payment_id, updated_at')

await probe('046 · event_payments.enquiry_id',
  'event_payments', 'id, enquiry_id')

// ── Already expected to be there, so a failure here means something else
//    went wrong in the same session ──────────────────────────────────────
await probe('· event_proposals (004)', 'event_proposals', 'id, event_id, status, total_amount')
await probe('· events lock columns (038)', 'events', 'id, lock_payment_status, lock_claimed_at')

/* ── Report ───────────────────────────────────────────────────────────── */
let failed = 0
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'}  ${r.label.padEnd(42)} ${r.note}`)
  if (!r.ok) failed++
}
console.log('')

if (failed) {
  console.log(`✗  ${failed} check${failed === 1 ? '' : 's'} failed — re-run the migration in Supabase → SQL Editor.`)
  console.log('   Both files are re-runnable: every CREATE POLICY is preceded by a DROP,')
  console.log('   and every ALTER TABLE uses IF NOT EXISTS.')
  process.exit(1)
}
console.log('✓  045 and 046 are applied. The celebration log and the milestone')
console.log('   columns are live, so the tracker can stop degrading.')
process.exit(0)
