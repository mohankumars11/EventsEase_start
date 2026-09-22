#!/usr/bin/env node
/**
 * Is the red alert actually rare?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE PROPERTY THAT MATTERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * calendarAlerts.js claims red is reserved for three situations. That
 * claim is worth exactly nothing as a comment: the failure mode is
 * gradual, somebody adds a fourth red signal that seems important at the
 * time, and six weeks later every block raises a red banner and the
 * partner has learned to press through it.
 *
 * So the middle section here does not test the three red cases. It tests
 * the OPPOSITE: it sweeps a large set of ordinary blocks and asserts
 * that none of them reaches red. An assertion about absence is the only
 * kind that catches a signal nobody thought to check.
 *
 *   node scripts/check-calendar-alerts.mjs
 *   node scripts/check-calendar-alerts.mjs --sabotage
 */
import { loadSrc } from './lib/loadSrc.mjs'

const { LEVEL, RED_SIGNALS, BLACKOUT_WINDOW_DAYS, DEMAND_RED_DATES,
        assessChange, coverageOf, expandRange, quickRanges } = await loadSrc({
  'src/lib/calendarAlerts.js': [
    'LEVEL', 'RED_SIGNALS', 'BLACKOUT_WINDOW_DAYS', 'DEMAND_RED_DATES',
    'assessChange', 'coverageOf', 'expandRange', 'quickRanges',
  ],
})

const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const TODAY = '2026-09-22'
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const demand = pairs => new Map(pairs.map(([d, n]) => [d, { total: n }]))
const job = (date, status = 'accepted') => ({ event_date: date, status, service_name: 'Catering' })

/* An ordinary partner: open, nothing marked, no standing week. */
const base = extra => assessChange({ availability: {}, jobs: [], weeklyRules: [], maxPerDay: 1, todayISO: TODAY, ...extra })

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE RANGE IS WHAT A PERSON MEANS BY A RANGE\n')

const r = expandRange('2026-09-14', '2026-09-16')
ok('14th to 16th is three days, not two', r.days.length === 3, `got ${r.days.length}`)
ok('both ends are included',
   r.days[0] === '2026-09-14' && r.days[2] === '2026-09-16')
ok('a backwards range is empty, not reversed',
   expandRange('2026-09-16', '2026-09-14').days.length === 0)
ok('one day is one day', expandRange('2026-09-14', '2026-09-14').days.length === 1)

const long = expandRange('2026-01-01', '2026-12-31', 90)
ok('the cap holds at 90', long.days.length === 90)
ok('and it says it truncated', long.truncated === true,
   'a silent truncation is how somebody blocks 90 days believing they blocked 300')
ok('a range inside the cap does not claim truncation', r.truncated === false)
ok('a nonsense date is empty, not NaN',
   expandRange('not-a-date', '2026-09-16').days.length === 0)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE NAMED SPANS LAND WHERE THEY SAY\n')

/* 2026-09-22 is a Tuesday. Every weekday is swept, because "this
   weekend" is the kind of arithmetic that is right six days out of
   seven and wrong on the seventh. */
const WEEK = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23',
              '2026-09-24', '2026-09-25', '2026-09-26']

const weekendOf = d => quickRanges(d).find(([l]) => l === 'This weekend')

ok('this weekend is always a Saturday and a Sunday',
   WEEK.every(d => {
     const [, a, b] = weekendOf(d)
     return new Date(`${a}T00:00:00Z`).getUTCDay() === 6
         && new Date(`${b}T00:00:00Z`).getUTCDay() === 0
   }),
   WEEK.map(d => `${d}->${weekendOf(d)[1]}`).join(' '))

ok('and it never starts in the past',
   WEEK.every(d => weekendOf(d)[1] >= d),
   'offering a range half of which has already happened is offering nothing')

ok('a Sunday rolls forward rather than pointing backwards',
   weekendOf('2026-09-20')[1] === '2026-09-26',
   `Sunday gave ${weekendOf('2026-09-20')[1]}`)

ok('a Saturday means today and tomorrow',
   weekendOf('2026-09-26')[1] === '2026-09-26')

const monthEnd = quickRanges('2026-09-22').find(([l]) => l === 'Rest of this month')
ok('the rest of the month ends on the last day of it',
   monthEnd[2] === '2026-09-30', monthEnd[2])
ok('February is handled by the calendar, not by a table',
   quickRanges('2028-02-10').find(([l]) => l === 'Rest of this month')[2] === '2028-02-29',
   'a leap year is where a hand-written month length goes wrong')

for (const [label, n] of [['Next 7 days', 7], ['Next 30 days', 30], ['Next 90 days', 90]]) {
  const [, a, b] = quickRanges(TODAY).find(([l]) => l === label)
  ok(`${label} really is ${n} days`, expandRange(a, b).days.length === n,
     `got ${expandRange(a, b).days.length}`)
}

ok('every named span starts today or later',
   quickRanges(TODAY).every(([, a]) => a >= TODAY))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nRED IS RARE — THE SWEEP\n')

/* Every ordinary block anybody plausibly performs. None may reach red. */
const ordinary = []
for (let start = 1; start <= 120; start += 7) {
  for (const len of [1, 2, 3, 5, 7, 14]) {
    const from = addDays(TODAY, start)
    ordinary.push(expandRange(from, addDays(from, len - 1)).days)
  }
}

const reds = ordinary.filter(dates =>
  base({ dates, status: 'BLOCKED' }).level === LEVEL.RED)

ok(`${ordinary.length} ordinary blocks, none of them red`,
   reds.length === 0,
   `${reds.length} reached red, e.g. ${reds[0]?.[0]}..${reds[0]?.[reds[0].length - 1]}`)

/* Two Tuesdays in November: the example in the module header. */
const tuesdays = base({ dates: ['2026-11-03', '2026-11-10'], status: 'BLOCKED' })
ok('two Tuesdays in November is not a warning',
   tuesdays.level === LEVEL.INFO, `got ${tuesdays.level}`)
ok('and it does not arm the confirm', tuesdays.needsConfirm === false)

/* A weekend block is informational, never escalating. */
const weekend = base({ dates: ['2026-10-03', '2026-10-04'], status: 'BLOCKED' })
ok('a weekend block stays informational', weekend.level === LEVEL.INFO)
ok('the weekend signal exists but is info-level',
   weekend.signals.find(s => s.id === 'weekend')?.level === LEVEL.INFO)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nRED IS EARNED — THE THREE CASES\n')

const clash = base({ dates: ['2026-10-05'], status: 'BLOCKED', jobs: [job('2026-10-05')] })
ok('confirmed work on a blocked date is red', clash.level === LEVEL.RED)
ok('and it arms the confirm', clash.needsConfirm === true)
ok('it names the date rather than counting',
   clash.signals.find(s => s.id === 'clash')?.dates?.[0] === '2026-10-05')
ok('it says the booking is not cancelled',
   /does not cancel/.test(clash.signals.find(s => s.id === 'clash').says),
   'the worst thing this screen could do is cancel a wedding silently')

const cancelled = base({
  dates: ['2026-10-05'], status: 'BLOCKED',
  jobs: [job('2026-10-05', 'cancelled')],
})
ok('a CANCELLED job on the date is not a clash', cancelled.level !== LEVEL.RED,
   'pressing twice over a job that is already off is friction for nothing')

const everything = expandRange(TODAY, addDays(TODAY, BLACKOUT_WINDOW_DAYS + 5)).days
const dark = base({ dates: everything, status: 'BLOCKED' })
ok('closing the whole month is red', dark.level === LEVEL.RED)
ok('and it says the partner will get nothing',
   /not be offered a single job/.test(dark.signals.find(s => s.id === 'blackout').says))

const nearlyDark = base({
  dates: expandRange(TODAY, addDays(TODAY, BLACKOUT_WINDOW_DAYS - 3)).days,
  status: 'BLOCKED',
})
ok('leaving a couple of days open is a warning, not red',
   nearlyDark.level === LEVEL.WARN, `got ${nearlyDark.level}`)

const oneWanted = base({
  dates: ['2026-10-12'], status: 'BLOCKED',
  interestByDate: demand([['2026-10-12', 4]]),
})
ok('one in-demand date is a warning', oneWanted.level === LEVEL.WARN)
ok('and it prints the real count',
   /4 families have asked/.test(oneWanted.signals.find(s => s.id === 'demand').says),
   oneWanted.signals.find(s => s.id === 'demand')?.says)

const manyWanted = base({
  dates: ['2026-10-12', '2026-10-13', '2026-10-14'], status: 'BLOCKED',
  interestByDate: demand([['2026-10-12', 4], ['2026-10-13', 9], ['2026-10-14', 3]]),
})
ok(`${DEMAND_RED_DATES} in-demand dates is red`, manyWanted.level === LEVEL.RED)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNO NUMBER IS INVENTED\n')

const belowFloor = base({
  dates: ['2026-10-12'], status: 'BLOCKED',
  interestByDate: demand([['2026-10-12', 2]]),
})
ok('two enquiries is below the floor and says nothing',
   !belowFloor.signals.some(s => s.id === 'demand'),
   '"2 enquiries" on a date reads as "nobody wants this"')

const noDemandData = base({ dates: ['2026-10-12'], status: 'BLOCKED' })
ok('no demand data means no demand claim',
   !noDemandData.signals.some(s => s.id === 'demand'))
ok('and the block still works without it', noDemandData.level === LEVEL.INFO)

const everySays = [clash, dark, manyWanted, oneWanted, weekend, tuesdays]
  .flatMap(a => a.signals.map(s => s.says))
ok('nothing claims a percentage',
   !everySays.some(t => /\d+\s?%/.test(t)), everySays.find(t => /\d+\s?%/.test(t)) ?? '')
ok('nothing projects earnings',
   !everySays.some(t => /₹|rupee|earn \d/i.test(t)))
ok('nothing compares the partner to other partners',
   !everySays.some(t => /partners like you|other partners|average partner/i.test(t)))
ok('every signal has something to say',
   everySays.every(t => typeof t === 'string' && t.length > 10))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nOPENING UP IS NOT A WARNING\n')

for (const status of ['OPEN', 'LIMITED']) {
  const a = base({
    dates: everything, status,
    jobs: [job(everything[2])],
    interestByDate: demand([[everything[3], 12]]),
  })
  ok(`a huge ${status} range is never above info`, a.level === LEVEL.INFO, `got ${a.level}`)
  ok(`and ${status} never arms the confirm`, a.needsConfirm === false)
}

const reopen = base({
  dates: ['2026-10-05'], status: 'OPEN',
  availability: { '2026-10-05': { status: 'BLOCKED' } },
})
ok('reopening a blocked day says so',
   /reopens/.test(reopen.signals.find(s => s.id === 'reopen').says))

const cleared = base({ dates: ['2026-10-05', '2026-10-06'], status: null })
ok('clearing explains the standing week takes over',
   /usual week/.test(cleared.signals.find(s => s.id === 'standing').says),
   'clear and open are different writes and must read differently')
ok('clearing is informational', cleared.level === LEVEL.INFO)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONLY THREE SIGNALS CAN EVER BE RED\n')

/* Sweep every shape this module can produce and collect which signal
   ids actually carried a red level. */
const seen = new Set()
const shapes = [clash, dark, manyWanted, oneWanted, weekend, tuesdays, reopen, cleared, nearlyDark]
for (const a of shapes) {
  for (const s of a.signals) if (s.level === LEVEL.RED) seen.add(s.id)
}
ok('the red signals observed are a subset of the declared three',
   [...seen].every(id => RED_SIGNALS.includes(id)),
   [...seen].filter(id => !RED_SIGNALS.includes(id)).join(', '))
ok('and all three are reachable', RED_SIGNALS.every(id => seen.has(id)),
   RED_SIGNALS.filter(id => !seen.has(id)).join(', ') + ' never reached red')

ok('needsConfirm is true exactly when the level is red',
   shapes.every(a => a.needsConfirm === (a.level === LEVEL.RED)))

ok('an empty range says nothing at all',
   base({ dates: [], status: 'BLOCKED' }).signals.length === 0)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nCOVERAGE MEASURES DISTANCE, NOT ACTIVITY\n')

const empty = coverageOf({ availability: {}, weeklyRules: [], todayISO: TODAY })
ok('an empty calendar is stale', empty.stale === true)
ok('and it is measured at zero days', empty.days === 0)

const oneTap = coverageOf({
  availability: { [addDays(TODAY, 3)]: { slot_date: addDays(TODAY, 3), status: 'BLOCKED' } },
  weeklyRules: [], todayISO: TODAY,
})
ok('one marked day near today is still stale', oneTap.stale === true,
   'the old rule went quiet for the rest of the year on the strength of one tap')

const standing = coverageOf({
  availability: {}, weeklyRules: [{ weekday: 0, is_available: false }], todayISO: TODAY,
})
ok('a standing week counts as having told us', standing.stale === false,
   'somebody who said "never Sundays" has described every Sunday there will be')

const far = coverageOf({
  availability: { [addDays(TODAY, 120)]: { slot_date: addDays(TODAY, 120), status: 'OPEN' } },
  weeklyRules: [], todayISO: TODAY,
})
ok('a calendar stated 120 days out is not stale', far.stale === false)
ok('and it is silent at that distance', far.says === null)

const past = coverageOf({
  availability: { '2026-01-01': { slot_date: '2026-01-01', status: 'OPEN' } },
  weeklyRules: [], todayISO: TODAY,
})
ok('dates in the past do not count as coverage', past.stale === true)

if (sabotage) {
  ran++
  if (tuesdays.level !== LEVEL.RED) {
    bad++
    fails.push('sabotage: expected an ordinary two-day block to be red, and it was not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
