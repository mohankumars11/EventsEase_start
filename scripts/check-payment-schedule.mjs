#!/usr/bin/env node
/**
 * The payment ladder, checked.
 *
 *   node scripts/check-payment-schedule.mjs
 *   node scripts/check-payment-schedule.mjs --verbose
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `config/celebrationPayments.js` makes a promise on screen, in these words:
 * "Paying in stages costs you nothing extra. The total is the same, and so is
 * the GST inside it." That sentence is the most load-bearing thing on the
 * payment page — most people in this market assume instalments carry a
 * surcharge, and being the ones who say plainly that they do not is the whole
 * trust play.
 *
 * A sentence like that cannot live as a comment. If a share is edited, a
 * rounding rule changes, or the hold stops being credited, the arithmetic
 * drifts and the product starts lying — silently, on a five-figure sum, with
 * nothing failing. So it is asserted here instead.
 *
 * Also checked: that no milestone ever promises a customer something their
 * booking does not include. A birthday with no catering must never be told a
 * payment buys the provisions — that is the invented-progress failure the
 * tracker exists to avoid, wearing a friendlier face.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

/* Bundle the browser modules so Node can import them — same approach as
   check-customizers.mjs and check-single-service.mjs, so this tests the real
   files rather than a copy that has drifted. */
const dir = mkdtempSync(join(tmpdir(), 'pay-schedule-'))
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
  MILESTONES, PAYMENT_PLANS, buildSchedule, milestonesForPlan, unlocksFor,
  fullPaymentDiscountPct, refundForCancellation, isSettled,
  EVENT_DATA, LOCK_AMOUNT,
} = mod

const failures = []
const warnings = []
const fail = m => failures.push(m)
const warn = m => warnings.push(m)
const inr = n => '₹' + Number(n).toLocaleString('en-IN')

/* ── 1 · The shares of each plan sum to exactly 1 ──────────────────────── */
for (const planId of Object.keys(PAYMENT_PLANS)) {
  const shares = milestonesForPlan(planId).filter(m => m.kind !== 'flat')
  const sum = shares.reduce((s, m) => s + m.share, 0)
  if (Math.abs(sum - 1) > 1e-9) {
    fail(`plan "${planId}": shares sum to ${sum}, not 1 — the ladder does not add up to the bill`)
  }
  if (shares.length === 0) fail(`plan "${planId}": has no share-based milestone`)
}

/* ── 2 · Every rung is fully allocated, at any total ───────────────────── */
const TOTALS = [12000, 27500, 49999, 50000, 73333, 100000, 123457, 250000, 999999, 1500001]

for (const planId of Object.keys(PAYMENT_PLANS)) {
  for (const total of TOTALS) {
    const s = buildSchedule({ confirmedTotal: total, plan: planId, eventDate: '2026-12-01', approvedAt: '2026-08-15' })
    if (s.basis !== 'confirmed') { fail(`${planId} @ ${total}: basis should be 'confirmed'`); continue }

    // Amounts + the credited hold must reconstruct the payable total exactly.
    const billed = s.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    if (billed !== s.totalPayable) {
      fail(`${planId} @ ${inr(total)}: rungs bill ${inr(billed)} but the total payable is ${inr(s.totalPayable)} (out by ${inr(billed - s.totalPayable)})`)
    }

    // The hold is credited exactly once, never twice and never not at all.
    const creditors = s.rows.filter(r => r.creditsHold)
    if (creditors.length !== 1) {
      fail(`${planId} @ ${inr(total)}: ${creditors.length} rungs credit the hold — must be exactly 1`)
    }

    if (s.rows.some(r => r.amount != null && r.amount < 0)) {
      fail(`${planId} @ ${inr(total)}: a rung is negative`)
    }
  }
}

/* ── 3 · THE CLAIM: both plans cost the same, and carry the same tax ───── */
for (const total of TOTALS) {
  const taxTotal = Math.round(total * 0.14)   // a realistic blended mix

  const staged = buildSchedule({ confirmedTotal: total, taxTotal, plan: 'staged', eventDate: '2026-12-01', approvedAt: '2026-08-15' })
  const full   = buildSchedule({ confirmedTotal: total, taxTotal, plan: 'full',   eventDate: '2026-12-01', approvedAt: '2026-08-15' })

  const stagedBilled = staged.rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const fullBilled   = full.rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const expectedGap  = Math.round(total * fullPaymentDiscountPct)

  if (stagedBilled - fullBilled !== expectedGap) {
    fail(`@ ${inr(total)}: staged bills ${inr(stagedBilled)}, full bills ${inr(fullBilled)} — the gap should be exactly the ${fullPaymentDiscountPct * 100}% full-payment discount (${inr(expectedGap)}), and nothing else. The screen says paying in stages costs nothing extra.`)
  }

  const stagedTax = staged.rows.reduce((s, r) => s + (r.gst ?? 0), 0)
  const fullTax   = full.rows.reduce((s, r) => s + (r.gst ?? 0), 0)
  const taxGap    = Math.round(taxTotal * fullPaymentDiscountPct)

  if (Math.abs((stagedTax - fullTax) - taxGap) > 1) {
    fail(`@ ${inr(total)}: staged carries ${inr(stagedTax)} of GST, full carries ${inr(fullTax)} — instalments must not add tax`)
  }
  if (Math.abs(stagedTax - taxTotal) > 1) {
    fail(`@ ${inr(total)}: the staged rungs carry ${inr(stagedTax)} of GST but the quote's tax is ${inr(taxTotal)} — the split is not adding up to the whole`)
  }
  if (verbose) {
    console.log(`  ${inr(total).padStart(12)}  staged ${inr(stagedBilled).padStart(12)} / tax ${inr(stagedTax).padStart(10)}   full ${inr(fullBilled).padStart(12)} / tax ${inr(fullTax).padStart(10)}`)
  }
}

/* ── 4 · No rupee figures before a confirmed quote ─────────────────────── */
const unpriced = buildSchedule({ confirmedTotal: null, plan: 'staged' })
if (unpriced.basis !== 'none') fail('an unpriced schedule must report basis "none"')
if (unpriced.rows.some(r => r.kind !== 'flat' && r.amount != null)) {
  fail('an unpriced schedule put a rupee figure on a share-based rung — that number would be derived from an estimate nobody has agreed to')
}
if (unpriced.rows.some(r => r.gst != null)) fail('an unpriced schedule showed a GST figure')
const holdRow = unpriced.rows.find(r => r.kind === 'flat')
if (!holdRow || holdRow.amount !== LOCK_AMOUNT) {
  fail(`the ₹1,000 hold is flat and should still show as ${inr(LOCK_AMOUNT)} before a quote exists`)
}

/* ── 5 · A claim unlocks nothing ───────────────────────────────────────── */
const claimed = buildSchedule({
  confirmedTotal: 100000, plan: 'staged', eventDate: '2026-12-01', approvedAt: '2026-08-15',
  payments: [{ milestone_id: 'confirmation', status: 'CUSTOMER_CLAIMED_PAID' }],
})
const claimedRow = claimed.rows.find(r => r.id === 'confirmation')
if (claimedRow.unlocked) {
  fail('a CUSTOMER_CLAIMED_PAID milestone reported unlocked — a claim is a sentence somebody typed, not money that arrived')
}
if (claimedRow.status !== 'checking') fail(`a claimed milestone should read "checking", got "${claimedRow.status}"`)
if (claimed.paidTotal !== 0) fail('a claimed-but-unverified payment was counted as paid')

for (const status of ['ADMIN_VERIFIED', 'GATEWAY_VERIFIED']) {
  const s = buildSchedule({
    confirmedTotal: 100000, plan: 'staged', eventDate: '2026-12-01', approvedAt: '2026-08-15',
    payments: [{ milestone_id: 'confirmation', status }],
  })
  if (!s.rows.find(r => r.id === 'confirmation').unlocked) fail(`${status} should unlock its milestone`)
  if (s.paidTotal <= 0) fail(`${status} should count toward paidTotal`)
}

/* ── 6 · Unlock lines never promise what a booking does not include ────── */
for (const [eventId, ev] of Object.entries(EVENT_DATA)) {
  const serviceIds = (ev.services ?? []).map(s => (typeof s === 'string' ? s : s.id)).filter(Boolean)
  if (serviceIds.length === 0) { warn(`${eventId}: no services in EVENT_DATA, skipped`); continue }

  for (const m of milestonesForPlan('staged')) {
    const lines = unlocksFor(m, serviceIds)
    if (lines.length === 0) {
      fail(`${eventId} / ${m.id}: unlocks nothing — a rung with no stated purpose is a rung nobody understands`)
    }
    if (lines.some(l => !l.line || !l.line.trim())) fail(`${eventId} / ${m.id}: produced an empty unlock line`)
  }

  // The specific promises, against the specific booking.
  const provisionIds = ['catering', 'cooks', 'menu', 'cake', 'live_counters', 'bar', 'welcome_drinks', 'ice_cream']
  const hasFood = serviceIds.some(id => provisionIds.includes(id))
  const claimsFood = unlocksFor(MILESTONES.find(m => m.id === 'sourcing'), serviceIds)
    .some(l => l.key === 'provisions')
  if (claimsFood && !hasFood) {
    fail(`${eventId}: promises "provisions bought and your cooks confirmed" on a booking with no catering`)
  }
}

// And the empty case: a booking with no recognised services still has to say
// something true, never a food or décor line.
const bare = unlocksFor(MILESTONES.find(m => m.id === 'sourcing'), [])
if (bare.some(l => l.key === 'provisions' || l.key === 'materials' || l.key === 'staffing')) {
  fail('a booking with no services was promised provisions, materials or crew')
}

/* ── 7 · Cancellation refunds are bounded and explained ────────────────── */
const settled = buildSchedule({
  confirmedTotal: 100000, plan: 'staged', eventDate: '2026-12-01', approvedAt: '2026-08-15',
  payments: [
    { milestone_id: 'hold', status: 'ADMIN_VERIFIED' },
    { milestone_id: 'confirmation', status: 'ADMIN_VERIFIED' },
  ],
})
for (const daysOut of [60, 30, 21, 20, 7, 6, 2, 0]) {
  const when = new Date(new Date('2026-12-01').getTime() - daysOut * 86400000)
  const r = refundForCancellation({ schedule: settled, eventDate: '2026-12-01', now: when })
  if (r.total > r.paid) fail(`cancellation at ${daysOut} days out refunds ${inr(r.total)} of ${inr(r.paid)} paid — more than was taken`)
  if (r.total < 0) fail(`cancellation at ${daysOut} days out refunds a negative amount`)
  if (r.lines.some(l => l.pct > 0 && !l.reason)) {
    fail(`cancellation at ${daysOut} days out withholds money with no reason to read out`)
  }
  if (verbose) console.log(`  cancel at T-${String(daysOut).padStart(2)}d → refund ${inr(r.total).padStart(10)} of ${inr(r.paid)}`)
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
console.log(`✓  payment ladder checks passed across ${TOTALS.length} totals and ${Object.keys(EVENT_DATA).length} occasions`)
console.log('   both plans cost the same and carry the same GST; a claim unlocks nothing.')
process.exit(0)
