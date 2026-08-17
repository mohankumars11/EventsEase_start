#!/usr/bin/env node
/**
 * The celebration settlement, checked.
 *
 *   node scripts/check-payment-schedule.mjs
 *   node scripts/check-payment-schedule.mjs --verbose
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `config/celebrationPayments.js` makes a promise on screen, in these words:
 * "One payment, and it is done. The number your coordinator confirms is the
 * whole cost of your celebration — GST included, no instalments to keep track
 * of, no balance collected after the day."
 *
 * A sentence like that cannot live as a comment. If the credit rules change, a
 * rounding rule moves, or the hold stops coming off the total, the arithmetic
 * drifts and the product starts lying — silently, on a five-figure sum, with
 * nothing failing. So it is asserted here instead.
 *
 * ── What it also guards ───────────────────────────────────────────────────
 *   · that money collected under the RETIRED instalment ladder is credited
 *     rather than re-charged. This is the single most expensive thing that
 *     could go wrong in this change: a customer who paid 25% under the old
 *     config being asked for 100% again.
 *   · that a CLAIMED payment releases nothing.
 *   · that no release line promises a customer something their booking does
 *     not include.
 *   · that api/create-milestone-payment.js — a second, un-importable copy of
 *     these rules — has not drifted.
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

const dir = mkdtempSync(join(tmpdir(), 'pay-settlement-'))
const entry = join(dir, 'entry.mjs')
const abs = p => JSON.stringify(join(ROOT, p).split('\\').join('/'))

writeFileSync(entry, `
export * from ${abs('src/config/celebrationPayments.js')}
export { EVENT_DATA } from ${abs('src/data/eventServicesData.js')}
export { LOCK_AMOUNT } from ${abs('src/data/celebrationTiers.js')}
`)

const outfile = join(dir, 'bundle.mjs')
await esbuild.build({ entryPoints: [entry], outfile, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const mod = await import(pathToFileURL(outfile).href)
rmSync(dir, { recursive: true, force: true })

const {
  buildSettlement, unlocksFor, RELEASE_KEYS, refundForCancellation, REFUND_TIERS,
  SETTLEMENT_ID, LEGACY_MILESTONE_IDS, EVENT_DATA, LOCK_AMOUNT,
} = mod

const failures = []
const warnings = []
const fail = m => failures.push(m)
const warn = m => warnings.push(m)
const inr = n => '₹' + Number(n).toLocaleString('en-IN')

const TOTALS = [12000, 27500, 49999, 50000, 73333, 100000, 123457, 250000, 999999, 1500001]
const WHEN = { eventDate: '2026-12-01', approvedAt: '2026-08-16' }
const paidRow = (id, amount = null) => ({ milestone_id: id, amount, status: 'ADMIN_VERIFIED' })

/* ── 1 · There is exactly one payment, and it is the whole quote ───────── */
for (const total of TOTALS) {
  const s = buildSettlement({ confirmedTotal: total, ...WHEN })
  if (s.basis !== 'confirmed') { fail(`@ ${inr(total)}: basis should be 'confirmed'`); continue }
  if (s.settlement.amount !== total) {
    fail(`@ ${inr(total)}: the one payment asks ${inr(s.settlement.amount)} — it must be the whole confirmed quote`)
  }
  if (s.settlement.amount < 0) fail(`@ ${inr(total)}: the payment is negative`)
  if (s.outstanding !== total) fail(`@ ${inr(total)}: outstanding is ${inr(s.outstanding)}, should be the full quote`)
  if (s.settled) fail(`@ ${inr(total)}: an unpaid celebration reported settled`)
  if (verbose) console.log(`  ${inr(total).padStart(12)}  one payment of ${inr(s.settlement.amount)}`)
}

/* ── 2 · The GST inside it is the quote's own, never added to ──────────── */
for (const total of TOTALS) {
  const taxTotal = Math.round(total * 0.14)
  const s = buildSettlement({ confirmedTotal: total, taxTotal, ...WHEN })
  if (s.settlement.gst !== taxTotal) {
    fail(`@ ${inr(total)}: the payment carries ${inr(s.settlement.gst)} of GST against the quote's ${inr(taxTotal)} — one payment must not add or lose tax`)
  }
  if (s.settlement.amount !== total) {
    fail(`@ ${inr(total)}: tax was added on top of the confirmed total — it is tax-inclusive`)
  }
}

/* ── 3 · Nothing is ever collected after the day ───────────────────────── */
{
  const eventTime = new Date(WHEN.eventDate).getTime()
  const s = buildSettlement({ confirmedTotal: 100000, ...WHEN })
  if (!s.settlement.dueAt) {
    fail('an approved celebration produced no due date')
  } else if (s.settlement.dueAt.getTime() > eventTime - 2 * 86400000) {
    fail('the payment falls inside 2 days of the celebration — nobody should be chasing money at a wedding')
  }
  // Approved five days out: due immediately rather than at a date past the day.
  const late = buildSettlement({ confirmedTotal: 100000, eventDate: '2026-12-01', approvedAt: '2026-11-27' })
  if (late.settlement.dueAt.getTime() > new Date('2026-11-29').getTime()) {
    fail('a celebration approved days before the event was given a due date past the last collection point')
  }
  // No approval yet means no due date — a date on an unapproved plan is a
  // demand for money against something nobody has agreed to.
  const unapproved = buildSettlement({ confirmedTotal: 100000, eventDate: WHEN.eventDate })
  if (unapproved.settlement.dueAt !== null) fail('an unapproved celebration was given a payment due date')
}

/* ── 4 · No rupee figure before a confirmed quote ──────────────────────── */
{
  const s = buildSettlement({ confirmedTotal: null, ...WHEN })
  if (s.basis !== 'none') fail('an unpriced celebration must report basis "none"')
  if (s.settlement.amount != null) {
    fail('an unpriced celebration put a rupee figure on the payment — that number would be derived from an estimate nobody has agreed to')
  }
  if (s.settlement.gst != null) fail('an unpriced celebration showed a GST figure')
  if (s.outstanding != null) fail('an unpriced celebration reported an outstanding amount')
  if (s.hold.amount !== LOCK_AMOUNT) fail('the flat ₹1,000 hold should still show before a quote exists')
}

/* ── 5 · A claim releases nothing ──────────────────────────────────────── */
{
  const claimed = buildSettlement({
    confirmedTotal: 100000, ...WHEN,
    services: ['venue', 'catering', 'decor', 'photography', 'cake'],
    payments: [{ milestone_id: SETTLEMENT_ID, amount: 100000, status: 'CUSTOMER_CLAIMED_PAID' }],
  })
  if (claimed.settled) fail('a CUSTOMER_CLAIMED_PAID payment reported settled — a claim is a sentence somebody typed, not money that arrived')
  if (claimed.settlement.status !== 'checking') fail(`a claimed payment should read "checking", got "${claimed.settlement.status}"`)
  if (claimed.released) fail('a claim released the work the payment funds')
  if (claimed.paid !== 0) fail('a claimed-but-unverified payment was counted as paid')
  if (claimed.outstanding !== 100000) fail('a claim reduced what is outstanding')

  for (const status of ['ADMIN_VERIFIED', 'GATEWAY_VERIFIED']) {
    const s = buildSettlement({
      confirmedTotal: 100000, ...WHEN,
      services: ['venue', 'catering', 'decor', 'photography', 'cake'],
      payments: [{ milestone_id: SETTLEMENT_ID, amount: 100000, status }],
    })
    if (!s.settled) fail(`${status} should settle the celebration`)
    if (!s.released) fail(`${status} should release the work`)
    if (s.outstanding !== 0) fail(`${status} left ${inr(s.outstanding)} outstanding`)
    if (s.paid !== 100000) fail(`${status} recorded ${inr(s.paid)} paid against a ${inr(100000)} quote`)
  }
}

/* ── 6 · The hold comes off the payment, exactly once ──────────────────── */
for (const total of TOTALS) {
  const s = buildSettlement({
    confirmedTotal: total, ...WHEN,
    payments: [paidRow('hold', LOCK_AMOUNT)],
  })
  if (s.settlement.amount !== total - LOCK_AMOUNT) {
    fail(`@ ${inr(total)}: with the hold paid the payment asks ${inr(s.settlement.amount)} — should be ${inr(total - LOCK_AMOUNT)}`)
  }
  if (!s.settlement.creditsHold) fail(`@ ${inr(total)}: the paid hold was not shown as credited`)
  if (s.paid !== LOCK_AMOUNT) fail(`@ ${inr(total)}: the paid hold was not counted toward what has been paid`)
  // And once settled, the customer has paid the whole quote — hold included.
  const done = buildSettlement({
    confirmedTotal: total, ...WHEN,
    payments: [paidRow('hold', LOCK_AMOUNT), paidRow(SETTLEMENT_ID, total - LOCK_AMOUNT)],
  })
  if (done.paid !== total) fail(`@ ${inr(total)}: a settled celebration reports ${inr(done.paid)} paid against a ${inr(total)} quote`)
  if (done.outstanding !== 0) fail(`@ ${inr(total)}: a settled celebration still owes ${inr(done.outstanding)}`)
}

/* ── 7 · THE EXPENSIVE ONE: the retired ladder is credited, not re-charged ─
 *
 * Anybody who paid an instalment under the four-plan config still has that
 * money with us. Asking them for the whole quote again is the single worst
 * outcome of removing the ladder, so it is asserted at every combination.
 */
for (const total of [50000, 100000, 123457]) {
  const each = Math.round(total * 0.25)
  for (const legacy of [['pay-25'], ['pay-25', 'pay-50'], ['pay-25', 'pay-50', 'pay-75']]) {
    const payments = legacy.map(id => paidRow(id, each))
    const s = buildSettlement({ confirmedTotal: total, ...WHEN, payments })
    const expected = total - each * legacy.length
    if (s.settlement.amount !== expected) {
      fail(`@ ${inr(total)} with ${legacy.join('+')} already paid: asked for ${inr(s.settlement.amount)}, should be ${inr(expected)} — that money is already in our account`)
    }
    if (!s.settlement.creditsLadder) fail(`@ ${inr(total)}: ${legacy.join('+')} was not flagged as credited`)
    if (s.legacyPaid !== each * legacy.length) fail(`@ ${inr(total)}: legacyPaid is ${inr(s.legacyPaid)}, should be ${inr(each * legacy.length)}`)
    if (verbose) console.log(`  ${inr(total).padStart(12)}  ${legacy.join('+').padEnd(24)} → ${inr(s.settlement.amount)} left`)
  }
  // Somebody whose old instalments already cover the quote owes nothing, is
  // settled, and is never shown a negative amount.
  const full = buildSettlement({
    confirmedTotal: total, ...WHEN,
    payments: ['pay-25', 'pay-50', 'pay-75'].map(id => paidRow(id, Math.ceil(total / 3))),
  })
  if (!full.settled) fail(`@ ${inr(total)}: a celebration whose old instalments cover the quote must read settled`)
  if (full.settlement.amount !== 0) fail(`@ ${inr(total)}: over-credited celebration asked for ${inr(full.settlement.amount)} — must clamp to zero, never negative`)
}

/* ── 8 · A CLAIMED legacy instalment is not credit either ──────────────── */
{
  const s = buildSettlement({
    confirmedTotal: 100000, ...WHEN,
    payments: [{ milestone_id: 'pay-25', amount: 25000, status: 'CUSTOMER_CLAIMED_PAID' }],
  })
  if (s.settlement.amount !== 100000) {
    fail('an unverified legacy claim was credited against the quote — the same rule that makes a claim release nothing')
  }
}

/* ── 9 · Release lines never promise what a booking does not include ───── */
for (const [eventId, ev] of Object.entries(EVENT_DATA)) {
  const serviceIds = (ev.services ?? []).map(s => (typeof s === 'string' ? s : s.id)).filter(Boolean)
  if (serviceIds.length === 0) { warn(`${eventId}: no services in EVENT_DATA, skipped`); continue }

  const s = buildSettlement({ confirmedTotal: 100000, services: serviceIds, ...WHEN })
  if (s.releases.length === 0) fail(`${eventId}: the payment releases nothing at all — it would be unexplained`)
  if (s.releases.some(l => !l.line?.trim())) fail(`${eventId}: produced an empty release line`)

  const provisionIds = ['catering', 'cooks', 'menu', 'cake', 'live_counters', 'bar', 'welcome_drinks', 'ice_cream']
  const hasFood = serviceIds.some(id => provisionIds.includes(id))
  if (s.releases.some(l => l.key === 'provisions') && !hasFood) {
    fail(`${eventId}: promises "provisions bought and your cooks confirmed" on a booking with no catering`)
  }
}
{
  const bare = unlocksFor(['provisions', 'materials', 'staffing'], [])
  if (bare.length > 0) fail('a booking with no services was promised provisions, materials or crew')
  if (RELEASE_KEYS.length === 0) fail('nothing is released by the payment')
}

/* ── 10 · Cancellation refunds are bounded and explained ───────────────── */
{
  const settled = buildSettlement({
    confirmedTotal: 100000, ...WHEN,
    payments: [paidRow('hold', LOCK_AMOUNT), paidRow(SETTLEMENT_ID, 99000)],
  })
  for (const daysOut of [60, 30, 21, 20, 7, 6, 3, 2, 0]) {
    const when = new Date(new Date(WHEN.eventDate).getTime() - daysOut * 86400000)
    const r = refundForCancellation({ settlement: settled, eventDate: WHEN.eventDate, now: when })
    if (r.total > r.paid) fail(`cancel at T-${daysOut}d refunds ${inr(r.total)} of ${inr(r.paid)} paid — more than was taken`)
    if (r.total < 0) fail(`cancel at T-${daysOut}d refunds a negative amount`)
    if (r.lines.some(l => !l.reason)) fail(`cancel at T-${daysOut}d withholds money with no reason to read out`)
    if (verbose) console.log(`  cancel T-${String(daysOut).padStart(2)}d → ${inr(r.total).padStart(10)} of ${inr(r.paid)}`)
  }
  // The hold, before any plan is approved, comes back whole.
  const heldOnly = buildSettlement({ confirmedTotal: null, payments: [paidRow('hold', LOCK_AMOUNT)] })
  const r = refundForCancellation({ settlement: heldOnly, eventDate: WHEN.eventDate, now: new Date('2026-11-30') })
  if (r.total !== LOCK_AMOUNT) fail(`the ₹1,000 hold must come back in full before a plan is approved, got ${inr(r.total)}`)
  // A celebration part-paid under the old ladder and then cancelled is still
  // owed a refund line for the money it handed over.
  const stranded = buildSettlement({ confirmedTotal: 100000, ...WHEN, payments: [paidRow('pay-25', 25000)] })
  const sr = refundForCancellation({ settlement: stranded, eventDate: WHEN.eventDate, now: new Date('2026-09-01') })
  if (sr.paid !== 25000) fail('a celebration part-paid under the retired ladder was refunded nothing on cancellation')
  if (REFUND_TIERS.some(t => t.pct > 1 || t.pct < 0)) fail('a refund tier is outside 0–100%')
}

/* ── 11 · The serverless copy has not drifted ──────────────────────────────
 *
 * `api/create-milestone-payment.js` cannot import from `src/` — a Vercel
 * function is bundled separately — so it carries its own copy of these rules.
 * That is a second source of truth for the amount actually charged to a real
 * card, which is the worst possible thing to let drift silently.
 */
{
  const api = readFileSync(join(ROOT, 'api/create-milestone-payment.js'), 'utf8')

  const apiSettlement = api.match(/const SETTLEMENT_ID = '([^']*)'/)?.[1]
  const apiLegacy = api.match(/const LEGACY_MILESTONE_IDS = \[([^\]]*)\]/)?.[1]
  const lockLine = api.match(/const LOCK_AMOUNT = (\d+)/)?.[1]
  const methodLine = api.match(/const PAYMENT_METHOD = '([a-z]*)'/)?.[1]

  if (apiSettlement !== SETTLEMENT_ID) {
    fail(`the endpoint settles milestone "${apiSettlement}" but the app writes "${SETTLEMENT_ID}" — a paid celebration would never be recognised`)
  }
  if (!apiLegacy) {
    fail('could not read LEGACY_MILESTONE_IDS out of api/create-milestone-payment.js')
  } else {
    const ids = apiLegacy.split(',').map(t => t.trim().replace(/'/g, '')).filter(Boolean)
    const missing = LEGACY_MILESTONE_IDS.filter(id => !ids.includes(id))
    if (missing.length) {
      fail(`the endpoint does not credit retired instalments [${missing}] — a customer who already paid one would be charged for it twice`)
    }
  }
  if (Number(lockLine) !== LOCK_AMOUNT) fail(`the endpoint's LOCK_AMOUNT is ${lockLine}, the app's is ${LOCK_AMOUNT}`)

  // The ladder must be gone from the endpoint too, not just from the config.
  if (/const PLAN_SPLITS/.test(api)) {
    fail('api/create-milestone-payment.js still carries PLAN_SPLITS — the instalment ladder is only half removed')
  }
  if (/payment_type:\s*isLast/.test(api)) {
    fail('api/create-milestone-payment.js still records advances — every celebration payment is now `full`')
  }

  // UPI is the whole zero-MDR argument. If this ever becomes null or 'card',
  // every celebration starts costing ~2.36% against a 2% platform fee.
  if (methodLine !== 'upi') {
    fail(`api/create-milestone-payment.js collects by "${methodLine}" — anything but UPI carries MDR that exceeds the platform fee`)
  }
}

/* ── 12 · The instalment ladder is gone from the config ────────────────── */
for (const gone of ['PAYMENT_PLANS', 'PLAN_LIST', 'defaultPlanFor', 'buildSchedule', 'UNLOCK_GATES']) {
  if (mod[gone] !== undefined) {
    fail(`config/celebrationPayments.js still exports "${gone}" — a caller could still build a part payment`)
  }
}

/* ── Report ───────────────────────────────────────────────────────────── */
console.log('')
if (warnings.length) {
  console.log(`⚠  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`)
  warnings.forEach(w => console.log('   ' + w))
  console.log('')
}
if (failures.length) {
  console.log(`✗  ${failures.length} failure${failures.length === 1 ? '' : 's'}`)
  failures.forEach(f => console.log('   ' + f))
  process.exit(1)
}
console.log(`✓  settlement passed across ${TOTALS.length} totals and ${Object.keys(EVENT_DATA).length} occasions`)
console.log('   one payment for the whole confirmed quote; a claim releases nothing;')
console.log('   the hold and every retired instalment are credited, never re-charged;')
console.log('   nothing is collected after the day.')
process.exit(0)
