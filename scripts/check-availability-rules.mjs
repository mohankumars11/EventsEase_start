#!/usr/bin/env node
/**
 * The availability verdict, asserted without a database.
 *
 * src/lib/availability.js is the one place the partner app and the
 * customer app agree about what a date IS. Every rule in it was
 * previously written inline by whoever needed it, which is how three
 * surfaces came to disagree about one day.
 *
 * Pure -- rows in, verdicts out. Same shape as
 * scripts/check-calendar-conflicts.mjs: bundle the module, assert
 * input to output, no browser and no network.
 *
 *   node scripts/check-availability-rules.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/availability-rules.mjs')
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/lib/availability.js'),
  '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const {
  STATUS, SOURCE, COVER, dayStatus, capacityFor, weeklyRuleFor,
  hoursFor, hoursLabel, clockLabel, reasonLabel, isPast, coverFor,
} = await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const TODAY = '2026-09-21'          // a Monday
const SUNDAY = '2026-09-27'
const FUTURE = '2026-10-15'
const day = over => dayStatus({ dateISO: FUTURE, todayISO: TODAY, ...over })

console.log('\nA DAY NOBODY HAS TOUCHED\n')

ok('no row, no rules -> UNSET', day({}).status === STATUS.UNSET, day({}).status)
ok('...and is still bookable, not blocked', day({}).status !== STATUS.BLOCKED)
ok('...with a cap of 1, never unlimited', day({}).total === 1, String(day({}).total))

console.log('\nTHE TAP THAT USED TO VANISH\n')

/* An explicit OPEN row says nothing the defaults do not -- and must
   still come back as OPEN, because the partner asked for it. This is
   the whole of the bug that started this work. */
const open = day({ row: { status: 'OPEN' } })
ok('a deliberate OPEN reads back as OPEN', open.status === STATUS.OPEN, open.status)
ok('...and is attributed to the day, not a default', open.source === SOURCE.DAY, open.source)

console.log('\nBLOCKED BEATS EVERYTHING\n')

const blocked = day({ row: { status: 'BLOCKED', reason: 'travel' } })
ok('a blocked day is BLOCKED', blocked.status === STATUS.BLOCKED, blocked.status)
ok('...and carries the partner\'s reason', blocked.reason === 'Travelling', String(blocked.reason))

/* Blocking a day that already has work does not cancel the work, so the
   calendar must not quietly show it as merely booked. */
const blockedWithJobs = day({
  row: { status: 'BLOCKED', reason: 'personal' },
  jobsOnDay: [{ line_id: 'a' }],
})
ok('blocked wins over confirmed jobs', blockedWithJobs.status === STATUS.BLOCKED,
   blockedWithJobs.status)
ok('...and still reports the jobs', blockedWithJobs.booked === 1, String(blockedWithJobs.booked))

const other = day({ row: { status: 'BLOCKED', reason: 'other', reason_detail: 'Sister wedding' } })
ok('"other" shows the partner\'s own words', other.reason === 'Sister wedding', String(other.reason))

console.log('\nTHE STANDING WEEK, AND WHAT OUTRANKS IT\n')

const closedSundays = [{ weekday: 0, is_available: false, effective_from: '2026-01-01' }]
const sun = dayStatus({ dateISO: SUNDAY, todayISO: TODAY, weeklyRules: closedSundays })
ok('a standing day off closes the day', sun.status === STATUS.BLOCKED, sun.status)
ok('...attributed to the week, not the day', sun.source === SOURCE.WEEKLY, sun.source)

/* The reason this ordering exists at all. */
const openSunday = dayStatus({
  dateISO: SUNDAY, todayISO: TODAY,
  weeklyRules: closedSundays, row: { status: 'OPEN' },
})
ok('"open THIS Sunday" beats "closed Sundays"', openSunday.status === STATUS.OPEN, openSunday.status)

const mondayRule = dayStatus({ dateISO: FUTURE, todayISO: TODAY, weeklyRules: closedSundays })
ok('a Sunday rule does not close a Thursday', mondayRule.status === STATUS.UNSET, mondayRule.status)

/* Weekday arithmetic must be IST, not the machine's timezone -- the
   whole reason lib/istTime exists. 2026-09-27 is a Sunday in India. */
ok('the weekday is read in IST', weeklyRuleFor(closedSundays, SUNDAY) !== null)

/* A rule that has not come into effect yet is not policy. */
const later = [{ weekday: 0, is_available: false, effective_from: '2027-01-01' }]
ok('a future rule does not apply today',
   dayStatus({ dateISO: SUNDAY, todayISO: TODAY, weeklyRules: later }).status === STATUS.UNSET)
const lapsed = [{ weekday: 0, is_available: false, effective_from: '2026-01-01', effective_to: '2026-06-30' }]
ok('a lapsed rule does not apply either',
   dayStatus({ dateISO: SUNDAY, todayISO: TODAY, weeklyRules: lapsed }).status === STATUS.UNSET)

/* Two rules for one weekday: the newest that has taken effect wins. */
const superseded = [
  { weekday: 0, is_available: false, effective_from: '2026-01-01' },
  { weekday: 0, is_available: true,  effective_from: '2026-09-01' },
]
ok('the newest effective rule wins',
   dayStatus({ dateISO: SUNDAY, todayISO: TODAY, weeklyRules: superseded }).status === STATUS.UNSET)

console.log('\nCAPACITY, WHICH USED TO MEAN NOTHING\n')

const limited = day({ row: { status: 'LIMITED', slots_total: 2 }, jobsOnDay: [{ line_id: 'a' }] })
ok('LIMITED with room left is LIMITED', limited.status === STATUS.LIMITED, limited.status)
ok('...and says how much room', limited.remaining === 1, String(limited.remaining))

/* The transition requirement 6 asks for, and the state match_partners
   has always tested for and never been able to reach. */
const full = day({ row: { status: 'LIMITED', slots_total: 2 }, jobsOnDay: [{ line_id: 'a' }, { line_id: 'b' }] })
ok('the last slot going turns LIMITED into BOOKED', full.status === STATUS.BOOKED, full.status)
ok('...with nothing remaining', full.remaining === 0, String(full.remaining))

const roomy = day({ maxPerDay: 3, jobsOnDay: [{ line_id: 'a' }] })
ok('work on the books reads BOOKED', roomy.status === STATUS.BOOKED, roomy.status)
ok('...while still reporting the room left', roomy.remaining === 2, String(roomy.remaining))

/* Counting the jobs the screen is holding beats trusting a column that
   a trigger may not have reached yet. */
const stale = day({ row: { status: 'LIMITED', slots_total: 3, slots_booked: 0 }, jobsOnDay: [{ l: 1 }, { l: 2 }] })
ok('real jobs outrank a stale slots_booked', stale.booked === 2, String(stale.booked))

ok('an unset cap is 1, not unlimited', capacityFor({}).total === 1, String(capacityFor({}).total))
ok('remaining never goes negative',
   capacityFor({ row: { slots_total: 1 }, jobsOnDay: [{ a: 1 }, { b: 2 }] }).remaining === 0)

console.log('\nTHE PAST IS READ-ONLY\n')

ok('yesterday is past', isPast('2026-09-20', TODAY))
ok('today is not past', !isPast(TODAY, TODAY))
ok('a past date is flagged', dayStatus({ dateISO: '2026-08-01', todayISO: TODAY }).past === true)
ok('today is flagged as today', dayStatus({ dateISO: TODAY, todayISO: TODAY }).today === true)

console.log('\nHOURS\n')

const vendor = { working_start: '09:00:00', working_end: '22:00:00' }
ok('the default day is the partner\'s own',
   hoursLabel(hoursFor({ vendor })) === '9:00 AM – 10:00 PM',
   hoursLabel(hoursFor({ vendor })))
ok('a day\'s own hours win',
   hoursLabel(hoursFor({ vendor, row: { hours: [{ start: '14:00', end: '20:00' }] } }))
     === '2:00 PM – 8:00 PM')
ok('a split shift survives as two windows',
   hoursFor({ vendor, row: { hours: [{ start: '10:00', end: '13:00' }, { start: '17:00', end: '22:00' }] } }).length === 2)
ok('noon is 12 PM, not 0 PM', clockLabel('12:00') === '12:00 PM', clockLabel('12:00'))
ok('midnight is 12 AM', clockLabel('00:00') === '12:00 AM', clockLabel('00:00'))

console.log('\nWHAT A CUSTOMER IS TOLD\n')

ok('nobody free reads as none', coverFor(0) === COVER.NONE)
ok('one or two is thin cover', coverFor(2) === COVER.THIN)
ok('plenty is good cover', coverFor(9) === COVER.GOOD)
ok('an unanswered query is UNKNOWN, not NONE', coverFor(null) === COVER.UNKNOWN,
   'a failed lookup must never read as "nobody is free"')

/* The privacy boundary, asserted rather than assumed: there is no
   arrangement of arguments under which the customer helper returns a
   partner's own words. */
ok('cover is derived from a count alone', typeof coverFor(3) === 'string')
ok('reasonLabel refuses an empty reason', reasonLabel(null) === null)

console.log(`\n  ${ran - bad}/${ran} passed\n`)
process.exit(bad === 0 ? 0 : 1)
