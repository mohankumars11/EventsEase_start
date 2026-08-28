#!/usr/bin/env node
/**
 * Clear the test bookings that are holding a master's calendar.
 *
 *   node scripts/free-partner-date.mjs                 # what is holding them
 *   node scripts/free-partner-date.mjs --all --confirm # release every test hold
 *
 * ── Why this is needed at all ─────────────────────────────────────────
 * `match_partners` will not offer a master a second job on a date they
 * have already accepted one for. That rule is correct — a decorator with
 * one Saturday cannot do two Saturday weddings — and it is also why the
 * only real partner in the network stops being dispatchable after the
 * first end-to-end test of the day.
 *
 * The symptom is "no masters found" on a date where a master plainly
 * exists, which reads exactly like a matching bug and is not one.
 *
 * ── What it will not touch ────────────────────────────────────────────
 * A line with money against it. `escrow_ledger` is append-only by trigger
 * and the FK from it to `booking_lines` is RESTRICT — a paid line cannot
 * be deleted and must not be cancelled behind a customer's back. Those
 * are listed and skipped, loudly, because "the script said it cleared
 * everything" must never be true when it did not.
 */
import { createClient } from '@supabase/supabase-js'
import { readEnv } from './lib/loadSrc.mjs'

const db = createClient(
  readEnv('VITE_SUPABASE_URL'),
  readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
)

const args    = process.argv.slice(2)
const doAll   = args.includes('--all')
const confirm = args.includes('--confirm')
const onDate  = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? null

/* Every accepted offer held by a real (non-synthetic) master. */
const { data: vendors } = await db
  .from('vendors')
  .select('id, business_name')
  .eq('is_synthetic', false)
  .not('profile_id', 'is', null)

if (!vendors?.length) {
  console.log('\n  No real partners in the network.\n')
  process.exit(0)
}

const { data: offers } = await db
  .from('dispatch_offers')
  .select('id, vendor_id, line_id')
  .eq('status', 'ACCEPTED')
  .in('vendor_id', vendors.map(v => v.id))

if (!offers?.length) {
  console.log('\n  No accepted offers. Every partner is free.\n')
  process.exit(0)
}

const { data: lines } = await db
  .from('booking_lines')
  .select('id, status, service_name, request_id, quoted_amount_paise')
  .in('id', offers.map(o => o.line_id))

const { data: requests } = await db
  .from('booking_requests')
  .select('id, event_date')
  .in('id', [...new Set((lines ?? []).map(l => l.request_id))])

const dateOf = id => requests?.find(r => r.id === id)?.event_date ?? '?'
const nameOf = id => vendors.find(v => v.id === id)?.business_name ?? id

/* Money is the line this script does not cross. */
const { data: paid } = await db
  .from('escrow_ledger')
  .select('line_id')
  .in('line_id', (lines ?? []).map(l => l.id))
const funded = new Set((paid ?? []).map(r => r.line_id))

console.log('\n  Accepted jobs held by real partners:\n')

const releasable = []
for (const o of offers) {
  const line = lines?.find(l => l.id === o.line_id)
  if (!line) continue
  const date = dateOf(line.request_id)
  if (onDate && date !== onDate) continue

  const money = funded.has(line.id)
  console.log(
    `    ${date}  ${nameOf(o.vendor_id).padEnd(18)} ${(line.service_name ?? '').padEnd(22)}` +
    `${money ? '  HAS MONEY — will not touch' : ''}`,
  )
  if (!money) releasable.push({ offer: o.id, line: line.id })
}

if (!releasable.length) {
  console.log('\n  Nothing releasable.\n')
  process.exit(0)
}

if (!doAll || !confirm) {
  console.log(`\n  ${releasable.length} releasable. To free them:`)
  console.log('    node scripts/free-partner-date.mjs --all --confirm\n')
  process.exit(0)
}

/* Cancel the LINE and lose the OFFER, rather than deleting either.
 *
 * `uq_offer_one_winner` is a partial index on status = 'ACCEPTED', so
 * moving the offer out of that status is what actually frees the master —
 * and it leaves the history of the test intact, which is the whole reason
 * dispatch_offers is append-only in spirit. */
for (const r of releasable) {
  await db.from('dispatch_offers').update({ status: 'LOST' }).eq('id', r.offer)
  await db.from('booking_lines').update({ status: 'cancelled' }).eq('id', r.line)
}

console.log(`\n  Released ${releasable.length}. Those partners are dispatchable again.\n`)
