#!/usr/bin/env node
/**
 * The commission has to be checkable, and it has to close.
 *
 * Four numbers are printed next to each other on the earnings screen —
 * what the customer paid, what Sambramo kept, what was deposited with
 * the authorities, and what reaches the partner. If they do not add up
 * on screen, the screen is worse than one that showed nothing, because
 * it invites exactly the question it cannot answer.
 *
 * Pure: paise in, paise out. No browser, no database.
 *
 *   node scripts/check-earnings-math.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/earnings-math.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/earnings-entry.mjs')

writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/earningsStatement.js'))}`,
  `export { partnerEarnings, partnerDeductions, lineSplit } from ${JSON.stringify(join(ROOT, 'src/lib/instantPricing.js'))}`,
  `export { PLATFORM_FEE_RATE } from ${JSON.stringify(join(ROOT, 'src/config/instantBooking.js'))}`,
  `export { TAX } from ${JSON.stringify(join(ROOT, 'src/config/legal.js'))}`,
  /* The document models. A payment slip is a thing a partner can hold,
     forward and argue from, so its arithmetic belongs in the file that
     asserts the four numbers close — not in a component nobody tests. */
  `export { slipModel, statementModel, documentNo } from ${JSON.stringify(join(ROOT, 'src/lib/documents/slipModel.js'))}`,
].join('\n'))

const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { jobMoney, statement, financialYear, inFY, annualGrossInr, slipModel, statementModel, documentNo,
        partnerEarnings, partnerDeductions, lineSplit, PLATFORM_FEE_RATE, TAX } = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const job = (over = {}) => ({
  line_id: 'L', status: 'delivered', event_date: '2025-06-14',
  quoted_amount_paise: 1200000, partner_amount_paise: null, ...over,
})

console.log('\nTHE FOUR PARTS ADD UP\n')

const m = jobMoney(job())
ok('customer = commission + share',
   m.customerPaise === m.commissionPaise + m.sharePaise,
   `${m.customerPaise} vs ${m.commissionPaise}+${m.sharePaise}`)
ok('share = tcs + tds + net',
   m.sharePaise === m.tcsPaise + m.tdsPaise + m.netPaise,
   `${m.sharePaise} vs ${m.tcsPaise}+${m.tdsPaise}+${m.netPaise}`)
ok('nothing is negative',
   [m.customerPaise, m.commissionPaise, m.sharePaise, m.tcsPaise, m.tdsPaise, m.netPaise].every(n => n >= 0))
ok('the rate is named, not guessed', m.commissionRate === PLATFORM_FEE_RATE, String(m.commissionRate))

console.log('\nTHE FEE COMES OFF ONCE\n')

/* The defect this file was written after: the offer card put
   `partner_amount_paise` — already net of the fee — through
   partnerEarnings, so the fee came off twice and the offer disagreed
   with the earnings screen about the same job. */
const quoted = 1200000
const split = lineSplit(quoted)
const fromQuote = partnerEarnings(quoted).netPaise
const fromShare = partnerDeductions(split.partner_amount_paise).netPaise
ok('quote and share reach the same net', fromQuote === fromShare, `${fromQuote} vs ${fromShare}`)
ok('putting a share through the gross entry point is visibly wrong',
   partnerEarnings(split.partner_amount_paise).netPaise < fromShare,
   'the double-charge must still be detectable, or this test proves nothing')
ok('the split closes against the CHECK constraint',
   split.platform_fee_paise + split.partner_amount_paise === split.quoted_amount_paise)

console.log('\nTDS\n')

const withPan = jobMoney(job(), { hasPan: true, annualGrossInr: 120000 })
const noPan = jobMoney(job(), { hasPan: false, annualGrossInr: 120000 })
ok('a PAN below the threshold waives TDS', withPan.tdsPaise === 0 && withPan.tdsWaived)
ok('no PAN means TDS applies', noPan.tdsPaise > 0 && !noPan.tdsWaived)
ok('waiving TDS raises the net', withPan.netPaise > noPan.netPaise)
const over = jobMoney(job(), { hasPan: true, annualGrossInr: TAX.tdsExemptionThresholdInr + 1 })
ok('a PAN above the threshold does NOT waive it', over.tdsPaise > 0)
ok('TCS never depends on the PAN', withPan.tcsPaise === noPan.tcsPaise)

console.log('\nA ROW WITH NO QUOTE IS NOT GUESSED\n')

const legacy = jobMoney(job({ quoted_amount_paise: null, partner_amount_paise: 1054000 }))
ok('marked un-itemised', legacy.itemised === false)
ok('commission is null, not invented', legacy.commissionPaise === null)
ok('customer price is null, not invented', legacy.customerPaise === null)
ok('the share is still real', legacy.sharePaise === 1054000)
ok('the deductions still come off it', legacy.netPaise < legacy.sharePaise)
ok('and it still closes',
   legacy.sharePaise === legacy.tcsPaise + legacy.tdsPaise + legacy.netPaise)

console.log('\nTHE FINANCIAL YEAR IS APRIL TO MARCH\n')

ok('June 2025 is FY 2025',  financialYear(new Date('2025-06-14')).startYear === 2025)
ok('Feb 2026 is still FY 2025', financialYear(new Date('2026-02-10')).startYear === 2025)
ok('1 April 2026 starts FY 2026', financialYear(new Date('2026-04-01')).startYear === 2026)
const fy = financialYear(new Date('2025-06-14'))
ok('the label reads FY 2025-26', fy.label === 'FY 2025–26', fy.label)
ok('31 March is inside',  inFY({ event_date: '2026-03-31' }, fy))
ok('1 April next is outside', !inFY({ event_date: '2026-04-01' }, fy))
ok('a job with no date is outside', !inFY({ event_date: null }, fy))

console.log('\nTHE STATEMENT\n')

const jobs = [
  job({ line_id: 'a', quoted_amount_paise: 1200000 }),
  job({ line_id: 'b', quoted_amount_paise: 800000 }),
  job({ line_id: 'c', quoted_amount_paise: 500000, status: 'cancelled' }),
  job({ line_id: 'd', quoted_amount_paise: 900000, event_date: '2024-06-14' }),
  job({ line_id: 'e', quoted_amount_paise: null, partner_amount_paise: 300000 }),
]
const st = statement(jobs, { fy })
ok('cancelled work is not a sale', st.jobs === 3, String(st.jobs))
ok('last year is not this year', st.customerPaise === 2000000, String(st.customerPaise))
ok('the un-itemised row is counted and named', st.unitemised === 1)
ok('tax deposited is kept apart from commission',
   st.taxDepositedPaise === st.tcsPaise + st.tdsPaise && st.taxDepositedPaise !== st.commissionPaise)
/* ── The four figures must add up ON SCREEN ──────────────────────
   The screen prints billed, commission, tax and a total. A reader
   subtracting the middle two from the first must land exactly on the
   last, or the statement is worse than one showing less. An older row
   carries a share and no customer price, so its share is its own line
   and is counted here the same way the screen counts it. */
ok('un-itemised share is carried, not dropped',
   st.unitemisedSharePaise === 300000, String(st.unitemisedSharePaise))
ok('the statement closes exactly as printed',
   st.customerPaise - st.commissionPaise - st.taxDepositedPaise + st.unitemisedSharePaise === st.netPaise,
   `${st.customerPaise}-${st.commissionPaise}-${st.taxDepositedPaise}+${st.unitemisedSharePaise} vs ${st.netPaise}`)

/* And with nothing un-itemised, the extra line is absent and the three
   figures close on their own. */
const clean = statement([job({ line_id: 'x', quoted_amount_paise: 1200000 })], { fy })
ok('with no older rows there is no extra line', clean.unitemisedSharePaise === 0)
ok('and it still closes',
   clean.customerPaise - clean.commissionPaise - clean.taxDepositedPaise === clean.netPaise,
   `${clean.customerPaise}-${clean.commissionPaise}-${clean.taxDepositedPaise} vs ${clean.netPaise}`)

console.log('\nTHE THRESHOLD IS MEASURED ON THE YEAR, NOT THE JOB\n')

ok('gross is in rupees, not paise', annualGrossInr(jobs, fy) === 23000, String(annualGrossInr(jobs, fy)))
ok('cancelled work is out of the threshold too',
   annualGrossInr([job({ status: 'cancelled' })], fy) === 0)
ok('an empty year is zero, not NaN', annualGrossInr([], fy) === 0)

console.log('\nROUNDING CANNOT LEAK A RUPEE\n')

let leaked = null
for (const q of [1, 99, 100, 333, 7777, 123457, 999999, 10000001]) {
  const e = partnerEarnings(q)
  const back = e.feePaise + e.tcsPaise + e.tdsPaise + e.netPaise
  if (e.grossPaise !== back) leaked = `${q}: ${e.grossPaise} vs ${back}`
}
ok('every awkward amount closes to the paise', leaked === null, leaked ?? '')

/* ══════════════════════════════════════════════════════════════════════
   THE SLIP CANNOT DISAGREE WITH THE SCREEN
   ══════════════════════════════════════════════════════════════════════

   A payment slip is a file. It gets forwarded, printed, and handed to an
   accountant, and it outlives the screen it was made from — so a slip
   whose lines do not add up to its own total, or whose total is not the
   net the partner was shown, is the most expensive bug in this module.

   `slipModel()` and the screen both call `jobMoney()`; these assertions
   are what stop a future edit deriving one of them twice. */
console.log('\nTHE SLIP ADDS UP, AND MATCHES THE SCREEN\n')

const slipJob = job({ quoted_amount_paise: 2500000 })
const slipOpts = { hasPan: true, annualGrossInr: 120000 }
const slip = slipModel(slipJob, null, slipOpts)
const screenMoney = jobMoney(slipJob, slipOpts)

const sumLines = ls => ls
  /* A subtotal restates what is above it; adding it would double-count.
     The waived-TDS line is a zero with an explanation, not an amount. */
  .filter(l => !l.subtotal)
  .reduce((n, l) => n + l.paise, 0)

ok('the slip lines sum to its own total',
   sumLines(slip.lines) === slip.total,
   `${sumLines(slip.lines)} vs ${slip.total}`)
ok('and that total is the net the screen shows',
   slip.total === screenMoney.netPaise,
   `${slip.total} vs ${screenMoney.netPaise}`)
ok('the slip names the rate that was actually taken',
   slip.lines.some(l => /8%/.test(l.note ?? '')),
   JSON.stringify(slip.lines.map(l => l.note)))
ok('a waived TDS is explained, not printed as a deduction',
   slip.lines.some(l => l.paise === 0 && /[Ww]aived/.test(l.note ?? '')))
ok('it calls itself a payment slip and not an invoice',
   slip.footnotes.some(f => /not a tax invoice/i.test(f)) &&
   !/invoice/i.test(slip.title))

/* An older row: the customer price and fee are unknowable, and the slip
   must say so rather than print a number nobody can check. */
const legacySlip = slipModel(
  job({ quoted_amount_paise: null, partner_amount_paise: 1054000 }), null, slipOpts)
ok('an un-itemised slip still closes',
   sumLines(legacySlip.lines) === legacySlip.total,
   `${sumLines(legacySlip.lines)} vs ${legacySlip.total}`)
ok('and states why the fee is absent rather than guessing it',
   legacySlip.lines.every(l => !/fee/i.test(l.label)) &&
   legacySlip.lines.some(l => /predates itemised/i.test(l.note ?? '')))

/* An adjustment is its own line BELOW the net, never folded into the
   four-part split — folding it would break "customer = commission +
   share", which is the first assertion in this file. */
const adjusted = slipModel(slipJob, null, {
  ...slipOpts,
  adjustments: [{ kind: 'bonus', amount_paise: 50000, reason: 'Festival bonus' }],
})
ok('an adjustment moves the total by exactly its own amount',
   adjusted.total === slip.total + 50000, `${adjusted.total} vs ${slip.total + 50000}`)
ok('and it still closes with the adjustment on it',
   sumLines(adjusted.lines) === adjusted.total)
ok('a recovery reduces the total', slipModel(slipJob, null, {
  ...slipOpts, adjustments: [{ kind: 'recovery', amount_paise: -25000, reason: 'Overpaid last week' }],
}).total === slip.total - 25000)

const stmtModel = statementModel(st, { fy })
ok('the statement model carries the un-itemised line',
   stmtModel.lines.some(l => /Older jobs/i.test(l.label)))
ok('and closes on the same net the screen prints',
   sumLines(stmtModel.lines) === stmtModel.total && stmtModel.total === st.netPaise,
   `${sumLines(stmtModel.lines)} vs ${stmtModel.total} vs ${st.netPaise}`)

ok('a document number is stable and names its financial year',
   documentNo('PS', 'abcdef01-2345-6789-abcd-ef0123456789', new Date('2026-06-01'))
     === 'SB/PS/FY2627/ABCDEF01',
   documentNo('PS', 'abcdef01-2345-6789-abcd-ef0123456789', new Date('2026-06-01')))

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exit(bad ? 1 : 0)
