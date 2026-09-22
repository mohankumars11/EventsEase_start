#!/usr/bin/env node
/**
 * The Earnings filter, asserted on a device that is not in India.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FAILURES THIS CATCHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1  A range built from the device clock. `event_date` is a calendar day
 *    in India. At 23:30 UTC on the 30th, India is already on the 1st, so
 *    a device-local "Today" shows yesterday's money under today's
 *    heading. This file runs with TZ=UTC on purpose — see the spawn at
 *    the bottom — because in IST the bug is invisible.
 *
 * 2  A fabricated comparison. A partner's first month has no previous
 *    month, and "+100% vs last month" against a period they were not on
 *    the platform for is a number the app invented. `delta` must be null
 *    and the reason must say which kind of nothing it was.
 *
 * 3  A total that its own rows do not add up to. The KPI figure, the
 *    chart series and the by-service breakdown are three views of one
 *    pass; if they ever disagree, this fails.
 *
 * 4  annualGrossInr derived from the filtered rows. It decides the TDS
 *    waiver and is measured over the whole financial year — derived from
 *    "Today" it drops under the threshold and every net on screen jumps.
 *
 * Pure: rows in, numbers out. No browser, no database.
 *
 *   node scripts/check-earnings-period.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFileSync, readFileSync } from 'node:fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ── Re-run under TZ=UTC, once ────────────────────────────────────────
   The whole point is to fail on a device that is not in India. Running
   this in IST proves nothing, and remembering to set TZ by hand is the
   sort of instruction that gets lost. */
if (!process.env.__EARNINGS_TZ) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'UTC', __EARNINGS_TZ: '1' },
  })
  process.exit(r.status ?? 1)
}

const OUT = join(ROOT, 'node_modules/.cache/earnings-period.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/earnings-period-entry.mjs')

writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/earningsRange.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/earningsSeries.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/payoutState.js'))}`,
  `export { annualGrossInr } from ${JSON.stringify(join(ROOT, 'src/lib/earningsStatement.js'))}`,
].join('\n'))

const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const {
  buildRange, daysIn, shiftISO, inRange, hasPriorData,
  earningsSeries, payoutState, PAYOUT_STATES, isRetryable, annualGrossInr,
} = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

console.log(`\nRUNNING IN TZ=${process.env.TZ} (offset ${new Date().getTimezoneOffset()} min)\n`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('EVERY BOUNDARY IS INDIA\'S MIDNIGHT\n')

ok('the process really is not in IST', new Date().getTimezoneOffset() === 0,
   'set TZ=UTC; in IST this whole file is vacuous')

ok('a day shifts forward by one calendar day', shiftISO('2026-09-21', 1) === '2026-09-22',
   shiftISO('2026-09-21', 1))
ok('and backward across a month end', shiftISO('2026-10-01', -1) === '2026-09-30',
   shiftISO('2026-10-01', -1))
ok('and backward across a year end', shiftISO('2027-01-01', -1) === '2026-12-31',
   shiftISO('2027-01-01', -1))
ok('a leap day exists', shiftISO('2028-02-28', 1) === '2028-02-29', shiftISO('2028-02-28', 1))

const today = buildRange('today', '2026-09-30')
ok('today is one day long', daysIn(today.from, today.to) === 1, String(daysIn(today.from, today.to)))
ok('today\'s previous window is yesterday', today.prevFrom === '2026-09-29' && today.prevTo === '2026-09-29',
   `${today.prevFrom}..${today.prevTo}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE PREVIOUS WINDOW IS THE SAME LENGTH, AND IMMEDIATELY PRIOR\n')

/* Rolling presets slide: their previous window is contiguous. Calendar
   presets borrow the calendar's meaning instead — "this month" compares
   against the same elapsed days of LAST month, not against the 21 days
   immediately before it, because month-over-month is the comparison a
   partner is actually making. Both rules are asserted, separately. */
const ROLLING = ['today']
const CALENDAR = ['week', 'month', 'last-month', 'fy']

for (const id of [...ROLLING, ...CALENDAR]) {
  const r = buildRange(id, '2026-09-21')
  const n = daysIn(r.from, r.to)
  const p = daysIn(r.prevFrom, r.prevTo)
  ok(`${id}: previous is the same length`, n === p, `${n} days vs ${p} days`)
  ok(`${id}: previous ends strictly before this one starts`,
     r.prevTo < r.from, `${r.prevTo} -> ${r.from}`)
  ok(`${id}: the window is not inverted`, r.from <= r.to, `${r.from}..${r.to}`)
  ok(`${id}: the previous window is not inverted`, r.prevFrom <= r.prevTo,
     `${r.prevFrom}..${r.prevTo}`)
}

for (const id of ROLLING) {
  const r = buildRange(id, '2026-09-21')
  ok(`${id}: previous is contiguous with this one`,
     shiftISO(r.prevTo, 1) === r.from, `${r.prevTo} -> ${r.from}`)
}

const lastMonth = buildRange('last-month', '2026-09-21')
ok('last month is a whole calendar month', lastMonth.from === '2026-08-01' && lastMonth.to === '2026-08-31',
   `${lastMonth.from}..${lastMonth.to}`)
ok('and it compares against the month before it',
   lastMonth.prevFrom === '2026-07-01' && lastMonth.prevTo === '2026-07-31',
   `${lastMonth.prevFrom}..${lastMonth.prevTo}`)

const monthSoFar = buildRange('month', '2026-09-21')
ok('this month runs to today, not to month end', monthSoFar.to === '2026-09-21', monthSoFar.to)
ok('and compares against the same elapsed days last month',
   monthSoFar.prevFrom === '2026-08-01' && monthSoFar.prevTo === '2026-08-21',
   `${monthSoFar.prevFrom}..${monthSoFar.prevTo}`)

/* The 31st compared against a 30-day month must not run past its end. */
const longMonth = buildRange('month', '2026-07-31')
ok('a 31-day month clamps to a 30-day predecessor', longMonth.prevTo === '2026-06-30', longMonth.prevTo)

const custom = buildRange('2026-09-01..2026-09-10', '2026-09-21')
ok('a custom range is honoured verbatim', custom.from === '2026-09-01' && custom.to === '2026-09-10',
   `${custom.from}..${custom.to}`)
ok('and slides back by its own length',
   custom.prevFrom === '2026-08-22' && custom.prevTo === '2026-08-31',
   `${custom.prevFrom}..${custom.prevTo}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA COMPARISON IS NEVER INVENTED\n')

const R = buildRange('month', '2026-09-21')
const j = (over = {}) => ({
  line_id: Math.random().toString(36).slice(2), status: 'delivered',
  is_funded: true, paid_at: '2026-09-02T00:00:00Z', delivered_at: '2026-09-03T00:00:00Z',
  event_date: '2026-09-02', quoted_amount_paise: 1200000, trade: 'Photography', ...over,
})

const firstMonth = earningsSeries([j()], R, { hasPrev: false })
ok('no prior period gives a null delta, not zero', firstMonth.kpis.earned.delta === null,
   String(firstMonth.kpis.earned.delta))
ok('and it says which kind of nothing', firstMonth.kpis.earned.reason === 'no-prior',
   firstMonth.kpis.earned.reason)
ok('nothing is Infinity', Object.values(firstMonth.kpis).every(k => Number.isFinite(k.delta) || k.delta === null),
   JSON.stringify(Object.values(firstMonth.kpis).map(k => k.delta)))

const fromNothing = earningsSeries([j()], R, { hasPrev: true })
ok('an empty prior period is not a percentage', fromNothing.kpis.earned.delta === null,
   String(fromNothing.kpis.earned.delta))
ok('and it reads as up from nothing', fromNothing.kpis.earned.reason === 'from-nothing',
   fromNothing.kpis.earned.reason)

const both = earningsSeries(
  [j(), j({ event_date: '2026-08-10' })], R, { hasPrev: true })
ok('a real prior period gives a real percentage', Number.isFinite(both.kpis.earned.delta),
   String(both.kpis.earned.delta))
ok('equal periods are 0%, not null', both.kpis.earned.delta === 0, String(both.kpis.earned.delta))

ok('hasPriorData is false when nothing predates the range',
   hasPriorData([j()], R) === false)
ok('and true when something does',
   hasPriorData([j(), j({ event_date: '2026-01-01' })], R) === true)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE TOTAL IS WHAT ITS OWN ROWS ADD UP TO\n')

const many = [
  j({ event_date: '2026-09-02', trade: 'Photography' }),
  j({ event_date: '2026-09-05', trade: 'Catering & Food', quoted_amount_paise: 4500000 }),
  j({ event_date: '2026-09-05', trade: 'Photography', quoted_amount_paise: 800000 }),
  j({ event_date: '2026-09-19', trade: 'Decoration & Floral', quoted_amount_paise: 2500000 }),
  j({ event_date: '2026-08-11', trade: 'Photography' }),
  j({ event_date: '2026-09-07', trade: 'Venue', status: 'cancelled' }),
]
const S = earningsSeries(many, R, { hasPrev: true })

const seriesTotal = S.series.reduce((n, d) => n + d.net, 0)
ok('the chart series sums to the KPI total', seriesTotal === S.kpis.earned.value,
   `${seriesTotal} vs ${S.kpis.earned.value}`)

const tradeTotal = S.byTrade.reduce((n, t) => n + t.net, 0)
ok('the by-service breakdown sums to the same total', tradeTotal === S.kpis.earned.value,
   `${tradeTotal} vs ${S.kpis.earned.value}`)

const shares = S.byTrade.reduce((n, t) => n + t.share, 0)
ok('the shares add to 1', Math.abs(shares - 1) < 1e-9, String(shares))

ok('a cancelled job is in none of them',
   S.byTrade.every(t => t.trade !== 'Venue') && S.kpis.jobs.value === 4,
   `jobs counted: ${S.kpis.jobs.value}`)

ok('the series covers every day in the window',
   S.series.length === daysIn(R.from, R.to), `${S.series.length} vs ${daysIn(R.from, R.to)}`)
ok('a quiet day is present and zero',
   S.series.find(d => d.date === '2026-09-03')?.net === 0)

ok('last month is counted as previous, not as current',
   S.kpis.earned.prev > 0 && S.totals.previous.count === 1, JSON.stringify(S.totals.previous))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE THRESHOLD IS A PARAMETER, NOT A DERIVATION\n')

const src = readFileSync(join(ROOT, 'src/lib/earningsSeries.js'), 'utf8')
ok('earningsSeries does not compute annualGrossInr itself',
   !/annualGrossInr\s*\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')),
   'it must be threaded in from the whole FY, never from the filtered rows')

const big = Array.from({ length: 40 }, (_, i) =>
  j({ event_date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, quoted_amount_paise: 2000000 }))
const under = earningsSeries(big, R, { hasPan: true, annualGrossInr: 100000, hasPrev: true })
const over = earningsSeries(big, R, { hasPan: true, annualGrossInr: 900000, hasPrev: true })
ok('a year over the threshold nets less than one under it',
   over.kpis.earned.value < under.kpis.earned.value,
   `${over.kpis.earned.value} vs ${under.kpis.earned.value}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONE JOB IS IN EXACTLY ONE STATE\n')

const cases = [
  ['cancelled', j({ status: 'cancelled' })],
  ['disputed',  j({ status: 'disputed' })],
  ['unfunded',  j({ is_funded: false, paid_at: null })],
  ['held',      j({ delivered_at: null })],
  ['ready',     j({ event_date: '2026-01-01' })],
]
for (const [want, row] of cases) {
  const got = payoutState(row, null, Date.parse('2026-09-21T12:00:00+05:30'))
  ok(`${want} is recognised`, got === want, `got ${got}`)
}
ok('a claimed job outranks ready',
   payoutState(j({ event_date: '2026-01-01' }), { status: 'requested' }) === 'claimed')
ok('a paid claim outranks everything but cancellation',
   payoutState(j({ event_date: '2026-01-01' }), { status: 'paid' }) === 'paid')
ok('a failed payout is its own state', payoutState(j(), { status: 'failed' }) === 'failed')
ok('and it is the one a partner can retry',
   isRetryable('failed') && !isRetryable('rejected') && !isRetryable('claimed'))
ok('every state the ladder can return is declared',
   PAYOUT_STATES.length === 9 && new Set(PAYOUT_STATES).size === 9,
   PAYOUT_STATES.join(','))
ok('the view\'s answer is trusted when present',
   payoutState({ payout_state: 'paid', status: 'delivered' }) === 'paid')

/* The 24-hour window runs from IST midnight, which is the assertion
   that only fails outside India. */
const eve = j({ event_date: '2026-09-21', delivered_at: '2026-09-21T10:00:00Z' })
/* The window opens at event_date + 1 day, IST — the same test
   `claimable()` makes. So 23:59 on the event day is still held, and one
   minute later it is ready. These two lines are the whole bug: on a
   device in UTC the boundary lands 5.5 hours out and one of them
   flips. */
ok('not ready at 23:00 IST on the event day',
   payoutState(eve, null, Date.parse('2026-09-21T23:00:00+05:30')) === 'held')
ok('not ready one minute before midnight IST',
   payoutState(eve, null, Date.parse('2026-09-21T23:59:00+05:30')) === 'held')
ok('ready one minute after midnight IST on the day after',
   payoutState(eve, null, Date.parse('2026-09-22T00:01:00+05:30')) === 'ready')
ok('and still ready a day later',
   payoutState(eve, null, Date.parse('2026-09-23T00:01:00+05:30')) === 'ready')

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
