#!/usr/bin/env node
/**
 * The payment ladder, checked.
 *
 *   node scripts/check-payment-schedule.mjs
 *   node scripts/check-payment-schedule.mjs --verbose
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `config/celebrationPayments.js` makes a promise on screen, in these words:
 * "Splitting it costs you nothing extra. Whichever plan you pick the total is
 * the same, and so is the GST inside it." That sentence is the most
 * load-bearing thing on the payment page — most people in this market assume
 * instalments carry a surcharge, and being the ones who say plainly that they
 * do not is the whole trust play.
 *
 * A sentence like that cannot live as a comment. If a split is edited, a
 * rounding rule changes, or the hold stops being credited, the arithmetic
 * drifts and the product starts lying — silently, on a five-figure sum, with
 * nothing failing. So it is asserted here instead.
 *
 * Also checked: that no unlock gate ever promises a customer something their
 * booking does not include, and that a CLAIMED payment unlocks nothing.
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

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
  PAYMENT_PLANS, UNLOCK_GATES, buildSchedule, unlocksFor,
  fullPaymentDiscountPct, refundForCancellation, REFUND_TIERS,
  EVENT_DATA, LOCK_AMOUNT,
} = mod

const failures = []
const warnings = []
const fail = m => failures.push(m)
const warn = m => warnings.push(m)
const inr = n => '₹' + Number(n).toLocaleString('en-IN')

const PLANS = Object.keys(PAYMENT_PLANS)
const TOTALS = [12000, 27500, 49999, 50000, 73333, 100000, 123457, 250000, 999999, 1500001]
const WHEN = { eventDate: '2026-12-01', approvedAt: '2026-08-16' }

/* ── 1 · Every plan's splits sum to exactly 1 ──────────────────────────── */
for (const id of PLANS) {
  const sum = PAYMENT_PLANS[id].splits.reduce((s, n) => s + n, 0)
  if (Math.abs(sum - 1) > 1e-9) {
    fail(`plan "${id}": splits sum to ${sum}, not 1 — the ladder does not add up to the bill`)
  }
  if (PAYMENT_PLANS[id].splits.some(s => s <= 0)) fail(`plan "${id}": has a zero or negative split`)
}

/* ── 2 · Every plan bills the whole total, at any amount ───────────────── */
for (const plan of PLANS) {
  for (const total of TOTALS) {
    const s = buildSchedule({ confirmedTotal: total, plan, ...WHEN })
    if (s.basis !== 'confirmed') { fail(`${plan} @ ${total}: basis should be 'confirmed'`); continue }

    const billed = s.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    if (billed !== s.totalPayable) {
      fail(`${plan} @ ${inr(total)}: instalments bill ${inr(billed)} against a payable total of ${inr(s.totalPayable)} (out by ${inr(billed - s.totalPayable)})`)
    }
    if (s.rows.some(r => r.amount != null && r.amount < 0)) fail(`${plan} @ ${inr(total)}: an instalment is negative`)
    if (s.rows.length !== PAYMENT_PLANS[plan].splits.length) fail(`${plan}: wrong number of instalments`)

    // Due dates must be ordered and land before the day.
    const dates = s.rows.map(r => r.dueAt).filter(Boolean)
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] < dates[i - 1]) fail(`${plan} @ ${inr(total)}: instalment ${i + 1} is due before instalment ${i}`)
    }
    const eventTime = new Date(WHEN.eventDate).getTime()
    if (dates.some(d => d.getTime() > eventTime)) {
      fail(`${plan} @ ${inr(total)}: an instalment falls after the celebration — everything must be collected before the day`)
    }
  }
}

/* ── 3 · THE CLAIM: every plan costs the same, and carries the same tax ── */
for (const total of TOTALS) {
  const taxTotal = Math.round(total * 0.14)
  const billed = {}
  const taxed = {}

  for (const plan of PLANS) {
    const s = buildSchedule({ confirmedTotal: total, taxTotal, plan, ...WHEN })
    billed[plan] = s.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    taxed[plan]  = s.rows.reduce((sum, r) => sum + (r.gst ?? 0), 0)
  }

  const discountGap = Math.round(total * fullPaymentDiscountPct)
  for (const plan of PLANS) {
    // Only `full` may differ, and only by exactly the full-payment discount.
    const expected = plan === 'full' ? billed.quarters - discountGap : billed.quarters
    if (billed[plan] !== expected) {
      fail(`@ ${inr(total)}: "${plan}" bills ${inr(billed[plan])} but "quarters" bills ${inr(billed.quarters)} — the screen says splitting it costs nothing extra`)
    }
    if (Math.abs(taxed[plan] - taxTotal) > 1) {
      fail(`@ ${inr(total)}: "${plan}" carries ${inr(taxed[plan])} of GST against the quote's ${inr(taxTotal)} — instalments must not add or lose tax`)
    }
  }
  if (verbose) {
    console.log(`  ${inr(total).padStart(12)}  ` +
      PLANS.map(p => `${p} ${inr(billed[p])}`).join('  ·  '))
  }
}

/* ── 4 · No rupee figures before a confirmed quote ─────────────────────── */
for (const plan of PLANS) {
  const s = buildSchedule({ confirmedTotal: null, plan })
  if (s.basis !== 'none') fail(`${plan}: an unpriced schedule must report basis "none"`)
  if (s.rows.some(r => r.amount != null)) {
    fail(`${plan}: an unpriced schedule put a rupee figure on an instalment — that number would be derived from an estimate nobody has agreed to`)
  }
  if (s.rows.some(r => r.gst != null)) fail(`${plan}: an unpriced schedule showed a GST figure`)
  if (s.hold.amount !== LOCK_AMOUNT) fail('the flat ₹1,000 hold should still show before a quote exists')
}

/* ── 5 · A claim unlocks nothing ───────────────────────────────────────── */
{
  const claimed = buildSchedule({
    confirmedTotal: 100000, plan: 'quarters', ...WHEN,
    payments: [{ milestone_id: 'pay-25', status: 'CUSTOMER_CLAIMED_PAID' }],
  })
  const row = claimed.rows.find(r => r.id === 'pay-25')
  if (row.settled) fail('a CUSTOMER_CLAIMED_PAID instalment reported settled — a claim is a sentence somebody typed, not money that arrived')
  if (row.status !== 'checking') fail(`a claimed instalment should read "checking", got "${row.status}"`)
  if (claimed.paidPct !== 0) fail('a claimed-but-unverified payment moved the unlock gauge')
  if (claimed.gates.some(g => g.open)) fail('a claim opened an unlock gate')
  if (claimed.paidTotal !== 0) fail('a claimed-but-unverified payment was counted as paid')

  for (const status of ['ADMIN_VERIFIED', 'GATEWAY_VERIFIED']) {
    const s = buildSchedule({
      confirmedTotal: 100000, plan: 'quarters', ...WHEN,
      services: ['venue', 'catering', 'decor', 'photography', 'cake'],
      payments: [{ milestone_id: 'pay-25', status }],
    })
    if (!s.rows.find(r => r.id === 'pay-25').settled) fail(`${status} should settle its instalment`)
    if (!s.gates.find(g => g.atPct === 0.25)?.open) fail(`${status} at 25% should open the first gate`)
    if (s.gates.find(g => g.atPct === 0.50)?.open) fail(`${status} at 25% must NOT open the 50% gate`)
  }
}

/* ── 6 · Gates open on money paid, not on which plan carried it ────────── */
{
  // A gate with no applicable line is filtered out of the schedule — correct
  // product behaviour (never show an empty gate), but it means these
  // assertions need a booking that actually has food, decor and crew on it,
  // or the gates under test simply would not exist.
  const FULL_BOOKING = ['venue', 'catering', 'decor', 'photography', 'cake']

  const paidHalf = {
    quarters: ['pay-25', 'pay-50'],
    halves:   ['pay-50'],
    most:     [],            // 75% in one go — checked separately below
    full:     [],
  }
  for (const plan of ['quarters', 'halves']) {
    const s = buildSchedule({
      confirmedTotal: 100000, plan, ...WHEN,
      services: FULL_BOOKING,
      payments: paidHalf[plan].map(id => ({ milestone_id: id, status: 'ADMIN_VERIFIED' })),
    })
    if (Math.abs(s.paidPct - 0.5) > 1e-9) fail(`${plan}: paying half reported ${s.paidPct} paid`)
    if (!s.gates.find(g => g.atPct === 0.5)?.open) fail(`${plan}: half paid should open the 50% gate`)
    if (s.gates.find(g => g.atPct === 1)?.open) fail(`${plan}: half paid must not open the final gate`)
  }
  // 75% in one payment must release everything 50% would have.
  const most = buildSchedule({
    confirmedTotal: 100000, plan: 'most', ...WHEN, services: FULL_BOOKING,
    payments: [{ milestone_id: 'pay-75', status: 'ADMIN_VERIFIED' }],
  })
  if (!most.gates.find(g => g.atPct === 0.25)?.open || !most.gates.find(g => g.atPct === 0.5)?.open) {
    fail('paying 75% in one go did not release what 50% releases — paying more, sooner, must never unlock less')
  }
  // Fully paid opens everything, on every plan.
  for (const plan of PLANS) {
    const s0 = buildSchedule({ confirmedTotal: 100000, plan, ...WHEN, services: FULL_BOOKING })
    const s = buildSchedule({
      confirmedTotal: 100000, plan, ...WHEN, services: FULL_BOOKING,
      payments: s0.rows.map(r => ({ milestone_id: r.id, status: 'ADMIN_VERIFIED' })),
    })
    if (!s.allSettled) fail(`${plan}: paying every instalment did not settle the schedule`)
    if (s.gates.some(g => !g.open)) fail(`${plan}: fully paid left a gate closed`)
    if (s.outstanding !== 0) fail(`${plan}: fully paid left ${inr(s.outstanding)} outstanding`)
  }
}

/* ── 7 · The hold is credited exactly once ─────────────────────────────── */
for (const plan of PLANS) {
  const s = buildSchedule({
    confirmedTotal: 100000, plan, ...WHEN,
    payments: [{ milestone_id: 'hold', status: 'ADMIN_VERIFIED' }],
  })
  const creditors = s.rows.filter(r => r.creditsHold)
  if (creditors.length !== 1) fail(`${plan}: ${creditors.length} instalments credit the hold — must be exactly 1`)
  const billed = s.rows.reduce((sum, r) => sum + r.amount, 0)
  if (billed !== 100000 - LOCK_AMOUNT) {
    fail(`${plan}: with the hold paid, instalments bill ${inr(billed)} — should be ${inr(100000 - LOCK_AMOUNT)}`)
  }
}

/* ── 8 · Unlock lines never promise what a booking does not include ────── */
for (const [eventId, ev] of Object.entries(EVENT_DATA)) {
  const serviceIds = (ev.services ?? []).map(s => (typeof s === 'string' ? s : s.id)).filter(Boolean)
  if (serviceIds.length === 0) { warn(`${eventId}: no services in EVENT_DATA, skipped`); continue }

  const s = buildSchedule({ confirmedTotal: 100000, plan: 'quarters', services: serviceIds, ...WHEN })
  if (s.gates.length === 0) fail(`${eventId}: no unlock gate applies at all — every payment would be unexplained`)
  if (s.gates.some(g => g.lines.some(l => !l.line?.trim()))) fail(`${eventId}: produced an empty unlock line`)

  const provisionIds = ['catering', 'cooks', 'menu', 'cake', 'live_counters', 'bar', 'welcome_drinks', 'ice_cream']
  const hasFood = serviceIds.some(id => provisionIds.includes(id))
  const claimsFood = s.gates.some(g => g.lines.some(l => l.key === 'provisions'))
  if (claimsFood && !hasFood) {
    fail(`${eventId}: promises "provisions bought and your cooks confirmed" on a booking with no catering`)
  }
}
{
  const bare = unlocksFor(['provisions', 'materials', 'staffing'], [])
  if (bare.length > 0) fail('a booking with no services was promised provisions, materials or crew')
}

/* ── 9 · Cancellation refunds are bounded and explained ────────────────── */
{
  const s0 = buildSchedule({ confirmedTotal: 100000, plan: 'quarters', ...WHEN })
  const settled = buildSchedule({
    confirmedTotal: 100000, plan: 'quarters', ...WHEN,
    payments: [
      { milestone_id: 'hold', status: 'ADMIN_VERIFIED' },
      ...s0.rows.slice(0, 2).map(r => ({ milestone_id: r.id, status: 'ADMIN_VERIFIED' })),
    ],
  })
  for (const daysOut of [60, 30, 21, 20, 7, 6, 3, 2, 0]) {
    const when = new Date(new Date(WHEN.eventDate).getTime() - daysOut * 86400000)
    const r = refundForCancellation({ schedule: settled, eventDate: WHEN.eventDate, now: when })
    if (r.total > r.paid) fail(`cancel at T-${daysOut}d refunds ${inr(r.total)} of ${inr(r.paid)} paid — more than was taken`)
    if (r.total < 0) fail(`cancel at T-${daysOut}d refunds a negative amount`)
    if (r.lines.some(l => !l.reason)) fail(`cancel at T-${daysOut}d withholds money with no reason to read out`)
    if (verbose) console.log(`  cancel T-${String(daysOut).padStart(2)}d → ${inr(r.total).padStart(10)} of ${inr(r.paid)}`)
  }
  if (REFUND_TIERS.some(t => t.pct > 1 || t.pct < 0)) fail('a refund tier is outside 0–100%')
}

/* ── 10 · The serverless copy of the plans has not drifted ────────────────
 *
 * `api/create-milestone-payment.js` cannot import from `src/` — a Vercel
 * function is bundled separately — so it carries its own copy of the splits.
 * That is a second source of truth for the amount actually charged to a card,
 * which is the worst possible thing to let drift silently.
 */
{
  const api = readFileSync(join(ROOT, 'api/create-milestone-payment.js'), 'utf8')
  const block = api.match(/const PLAN_SPLITS = \{([\s\S]*?)\n\}/)?.[1]
  const lockLine = api.match(/const LOCK_AMOUNT = (\d+)/)?.[1]
  const methodLine = api.match(/const PAYMENT_METHOD = '([a-z]*)'/)?.[1]

  if (!block || !lockLine) {
    fail('could not read PLAN_SPLITS / LOCK_AMOUNT out of api/create-milestone-payment.js')
  } else {
    for (const plan of PLANS) {
      const row = block.match(new RegExp(`${plan}\\s*:\\s*\\[([^\\]]*)\\]`))?.[1]
      if (!row) { fail(`the endpoint does not know plan "${plan}"`); continue }
      const apiSplits = row.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
      const want = PAYMENT_PLANS[plan].splits
      if (apiSplits.length !== want.length || apiSplits.some((v, i) => Math.abs(v - want[i]) > 1e-9)) {
        fail(`api/create-milestone-payment.js splits "${plan}" as [${apiSplits}] but the config says [${want}] — the endpoint would charge the wrong amount`)
      }
    }
    if (Number(lockLine) !== LOCK_AMOUNT) fail(`the endpoint's LOCK_AMOUNT is ${lockLine}, the app's is ${LOCK_AMOUNT}`)
  }

  // UPI is the whole zero-MDR argument. If this ever becomes null or 'card',
  // every celebration starts costing ~2.36% against a 2% platform fee.
  if (methodLine !== 'upi') {
    fail(`api/create-milestone-payment.js collects by "${methodLine}" — anything but UPI carries MDR that exceeds the platform fee`)
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
console.log(`✓  payment ladder passed across ${PLANS.length} plans, ${TOTALS.length} totals and ${Object.keys(EVENT_DATA).length} occasions`)
console.log('   every plan costs the same and carries the same GST; a claim unlocks nothing;')
console.log('   paying more sooner never unlocks less; everything is collected before the day.')
process.exit(0)
