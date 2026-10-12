#!/usr/bin/env node
/**
 * A partner is never paid a cash advance out of materials money.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULE THIS GUARDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The materials workflow collects money from a customer for things that
 * have to be bought for their booking. None of it may reach the partner
 * as an early payout. Their service earnings stay on the existing
 * completion-based release path and are not touched by any of this.
 *
 * Three concrete ways that could break, all of them one line of code:
 *
 *   1. The materials webhook branch calls routeTransfersForCapture,
 *      which pays partner_amount_paise to the partner's Route account
 *      ON CAPTURE (api/_lib/routeTransfers.js:25-58).
 *   2. Materials money is written to escrow_ledger, where
 *      routeRelease.js:74-78 computes platformPaise = held - partner
 *      and books anything untransferred as RELEASE_PLATFORM.
 *   3. A materials amount becomes a booking_lines row, which makes it a
 *      job on the partner's calendar and earnings (059:188-193, 141:91).
 *
 * The enforcement of (1) is an ABSENCE — a call that is not made — and
 * an absence is exactly what a future edit restores without noticing.
 * So it is asserted here instead of described in a comment.
 *
 *   node scripts/check-materials-no-partner-advance.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => { try { return readFileSync(join(ROOT, p), 'utf8') } catch { return null } }

/* Match CODE, not prose about code.
   materialsCapture's header explains at length why it does NOT call
   routeTransfersForCapture and does NOT touch escrow_ledger -- and the
   first version of this guard failed on its own documentation. A check
   that cannot tell a call from a sentence about a call teaches people
   to delete the sentence. */
const codeOf = src => (src ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ')

let ran = 0, bad = 0
const ok = (name, cond, detail) => {
  ran++
  if (cond) { console.log(`  ✓ ${name}`); return }
  bad++
  console.log(`  ✗ ${name}${detail ? `   <-- ${detail}` : ''}`)
}

console.log('\n  Materials money never becomes a partner advance\n')

const captureSrc = read('api/_lib/materialsCapture.js')
const webhookSrc = read('api/razorpay-webhook.js')
const endpointSrc = read('api/create-materials-payment.js')
const capture = captureSrc && codeOf(captureSrc)
const webhook = webhookSrc && codeOf(webhookSrc)
const endpoint = endpointSrc && codeOf(endpointSrc)

ok('the materials capture library exists', !!capture)
ok('the materials endpoint exists', !!endpoint)

/* 1 · the capture path never transfers to a partner */
ok('materialsCapture does not call routeTransfersForCapture',
   !!capture && !/routeTransfersForCapture/.test(capture),
   'that call pays the partner on capture')
ok('materialsCapture does not import the Route transfer library',
   !!capture && !/routeTransfers/.test(capture))
ok('materialsCapture never writes escrow_ledger',
   !!capture && !/escrow_ledger/.test(capture),
   'materials belong on procurement_ledger; escrow is the service money')
ok('materialsCapture never writes booking_lines',
   !!capture && !/from\(['"]booking_lines['"]\)/.test(capture),
   'a materials line becomes a phantom job')
ok('materialsCapture writes procurement_ledger',
   !!capture && /from\(['"]procurement_ledger['"]\)/.test(capture))
ok('its HOLD counterparty is the customer, never the partner',
   !!capture && /kind: 'HOLD'[\s\S]{0,200}counterparty: 'customer'/.test(capture))

/* 2 · the webhook's materials branch returns before any transfer */
if (webhook) {
  const branch = webhook.slice(
    webhook.indexOf('const materials = await materialsQuoteFor'),
    webhook.indexOf('refund.processed') > 0 ? webhook.indexOf('refund.processed') : undefined)
  ok('the webhook has a materials branch',
     webhook.includes('materialsQuoteFor'))
  ok('the materials branch does not transfer to a partner',
     branch.length > 0 && !/routeTransfersForCapture/.test(branch),
     'the booking branch transfers; this one must not')
  ok('the materials branch returns rather than falling through',
     /captureMaterialsPayment[\s\S]{0,260}return res\.status\(200\)/.test(branch))
}

/* 3 · the amount is never taken from the client */
ok('the endpoint re-reads the amount from the database',
   !!endpoint && /from\('procurement_quotes'\)[\s\S]{0,400}total_paise/.test(endpoint),
   'a client that names its own amount can name 1 rupee')
ok('the endpoint refuses a quote that is not approved',
   !!endpoint && /status !== 'approved'/.test(endpoint))
ok('the endpoint refuses an expired quote',
   !!endpoint && /expires_at/.test(endpoint))
ok('the endpoint refuses a quote it has already funded',
   !!endpoint && /'funded'/.test(endpoint))
ok('the endpoint refuses live keys without a live webhook secret',
   !!endpoint && /RAZORPAY_WEBHOOK_SECRET_LIVE/.test(endpoint),
   'otherwise a payment is taken and never recorded')
ok('the endpoint checks the quote belongs to the caller',
   !!endpoint && /customer_id !== user\.id/.test(endpoint))

/* 4 · the schema itself refuses to bill a non-incremental decision */
const reqSql = read('supabase/migrations/20261012_04_booking_materials.sql')
ok('only MATERIALS_INCREMENTAL may carry a chargeable estimate',
   !!reqSql && /materials_only_incremental_is_chargeable/.test(reqSql),
   'the constraint that stops an included booking being billed')
ok('the procurement ledger is append-only',
   /procurement_ledger_no_update/.test(read('supabase/migrations/20261012_05_quotes_and_procurement_ledger.sql') ?? ''))
ok('the procurement ledger cannot be overspent',
   /procurement_ledger_solvency/.test(read('supabase/migrations/20261012_05_quotes_and_procurement_ledger.sql') ?? ''))

/* 5 · supplier payment cannot use an unconfirmed rail */
const railSql = read('supabase/migrations/20261012_06_suppliers_and_rails.sql')
ok('the supplier payment rail is off by default',
   !!railSql && /route_supplier_enabled boolean not null default false/.test(railSql))
ok('turning the rail on needs a named human and a written confirmation',
   !!railSql && /rail_on_needs_a_named_confirmation/.test(railSql))
ok('a non-manual supplier payment is blocked while the rail is off',
   !!railSql && /supplier_payment_rail_gate/.test(railSql))
ok('no supplier payout library exists yet',
   read('api/_lib/supplierPayouts.js') === null,
   'a stub that "works later" is what gets switched on by accident')

console.log(`\n${bad ? '✗' : '✓'} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
