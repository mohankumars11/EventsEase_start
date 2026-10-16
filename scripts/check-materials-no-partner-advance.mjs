#!/usr/bin/env node
/**
 * The materials advance never touches the booking's own money.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS GUARD'S PREMISE CHANGED, DELIBERATELY
 * ══════════════════════════════════════════════════════════════════════
 *
 * It used to assert that a partner is NEVER paid anything through the
 * materials flow. That was right for the itemised-quote design, where
 * the customer paid a second time and the platform bought on their
 * behalf. It is wrong now: the whole point of the advance is that the
 * partner IS paid, before the event, so he can place an order.
 *
 * What still must hold is narrower and more important:
 *
 *   1. The advance never enters escrow_ledger. Two things break if it
 *      does -- uq_escrow_one_partner_release permits exactly ONE
 *      RELEASE_PARTNER row per line (062:122), and routeRelease.js:76
 *      computes platformPaise = held - partnerTransfers, so money that
 *      left escrow without being a Route transfer is booked as
 *      RELEASE_PLATFORM: the customer's materials money would be
 *      reported as Sambramo's commission.
 *   2. It never becomes a booking_lines row, which would make it a
 *      phantom job on the partner's calendar and earnings (059:188-193,
 *      141:91).
 *   3. Money out is matched by money back. An advance is squared off at
 *      review: either the balance is paid, or the unspent part is
 *      recovered. A flow that can pay twice is the failure here.
 *   4. A partner cannot write their own verdict.
 *
 *   node scripts/check-materials-no-partner-advance.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => { try { return readFileSync(join(ROOT, p), 'utf8') } catch { return null } }

/* Match CODE, not prose about code. The migration's header explains at
   length why it avoids escrow_ledger, and an earlier version of this
   guard failed on its own documentation. */
const codeOf = src => (src ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
const sqlCodeOf = src => (src ?? '').replace(/^\s*--.*$/gm, ' ')

let ran = 0, bad = 0
const ok = (name, cond, detail) => {
  ran++
  if (cond) { console.log(`  ✓ ${name}`); return }
  bad++
  console.log(`  ✗ ${name}${detail ? `   <-- ${detail}` : ''}`)
}

console.log('\n  The materials advance stays out of the booking\'s money\n')

const sqlSrc = read('supabase/migrations/20261013_01_materials_advance.sql')
const sql = sqlCodeOf(sqlSrc)
const libSrc = read('src/lib/materialsAdvance.js')
const lib = codeOf(libSrc)
const cardSrc = read('src/components/partner/materials/MaterialsCard.jsx')

ok('the advance migration exists', !!sqlSrc)
ok('the advance library exists', !!libSrc)
ok('the partner card exists', !!cardSrc)

/* 1 · never escrow */
ok('the migration never writes escrow_ledger',
   !!sql && !/escrow_ledger/.test(sql),
   'escrow is the booking money; routeRelease would misreport it as commission')
ok('the library never writes escrow_ledger',
   !!lib && !/escrow_ledger/.test(lib))
ok('the migration never creates a booking_lines row',
   !!sql && !/insert\s+into\s+public\.booking_lines/i.test(sql),
   'a materials line becomes a phantom job')
ok('routeRelease is untouched by this feature',
   !/materials_advance|advance_adjustment/i.test(codeOf(read('api/_lib/routeRelease.js'))),
   'the release math must not learn about advances')

/* 2 · money moves only through the audited path */
ok('money moves through add_partner_adjustment, not a raw insert',
   !!sql && /add_partner_adjustment/.test(sql)
   && !/insert\s+into\s+public\.partner_adjustments/i.test(sql),
   'the RPC is operator-gated, sign-checked and audited; a raw insert is none of those')
ok('the advance is a positive reimbursement',
   !!sql && /'reimbursement',\s*p_paise/.test(sql))
ok('an unspent advance is recovered, not forgiven',
   !!sql && /'recovery'/.test(sql),
   'money out with no way back is a gift')
ok('the balance paid is the bill minus what was advanced',
   !!sql && /p_approved_paise\s*-\s*coalesce\(v_adv\.advance_paise/.test(sql),
   'paying the full bill after advancing part of it pays twice')
ok('an approval cannot exceed the bill',
   !!sql && /cannot approve more than the bill/.test(sqlSrc ?? ''))
ok('each adjustment is referenced once',
   !!sql && /uq_advance_one_advance_adjustment/.test(sql)
   && /uq_advance_one_settle_adjustment/.test(sql)
   && /uq_advance_one_recovery_adjustment/.test(sql))

/* 3 · the partner does not decide their own claim */
ok('a verdict guard exists',
   !!sql && /guard_advance_self_review/.test(sql))
ok('the guard exempts only operators',
   !!sql && /if public\.caller_is_operator\(\)\s*then\s*return new;/.test(sql))
ok('a partner cannot write approved_paise or the adjustment ids',
   !!sql && /new\.approved_paise\s+is distinct from old\.approved_paise/.test(sql)
   && /new\.settle_adjustment_id\s+is distinct from old\.settle_adjustment_id/.test(sql))
ok('a partner cannot promote themselves into a decided state',
   !!sql && /only Sambramo can move this to/.test(sqlSrc ?? ''))
ok('a new bill resets the verdict',
   !!sql && /new\.bill_path is distinct from old\.bill_path/.test(sql),
   'the reviewer accepted a different file')

/* 4 · an advance only opens on a booking somebody paid for */
ok('an advance cannot open on an unpaid booking',
   !!sql && /not in \('paid', 'in_progress'\)/.test(sql),
   'nobody buys flowers for a booking that was never paid for')
ok('only the partner on the booking can claim',
   !!sql && /only the partner on this booking can/.test(sqlSrc ?? ''))

/* 5 · evidence, not arithmetic */
ok('a claim requires a bill and a supplier',
   !!sql && /advance_evidence_is_complete/.test(sql))
ok('the card requires a photo before submitting',
   /Add at least one photo/.test(read('src/components/partner/materials/AdvanceSheet.jsx') ?? ''),
   'an invoice alone is a PDF; a photograph is the goods')
ok('bills go to the vendor-keyed private bucket',
   !!lib && /'partner-documents'/.test(lib) && !/'partner-uploads'/.test(lib),
   'partner-uploads is auth-uid keyed and partly public')
ok('reads of private files go through signed URLs',
   !!lib && /createSignedUrl/.test(lib))

/* 6 · the retired design is really gone */
ok('the second customer charge is removed',
   read('api/create-materials-payment.js') === null
   && read('api/_lib/materialsCapture.js') === null
   && read('src/pages/book/MaterialsApproval.jsx') === null,
   'the itemised-quote path was replaced, not left dormant')
ok('the webhook no longer has a materials branch',
   !/materialsQuoteFor/.test(codeOf(read('api/razorpay-webhook.js'))))

console.log(`\n${bad ? '✗' : '✓'} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
