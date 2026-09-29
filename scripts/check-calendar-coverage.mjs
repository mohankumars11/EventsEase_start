#!/usr/bin/env node
/**
 * Does the app tell one story about how far ahead the calendar speaks?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE SURFACES, ONE FACT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The Jobs card, the Calendar tab and the nightly sweep each used to
 * decide independently whether a partner was behind. So a partner could
 * be told on Jobs that their calendar stops on the 30th, tap through to
 * the Calendar — the one screen where it can be fixed — and find no
 * mention of it. Three opinions about one fact is how a status stops
 * being believed.
 *
 * They now read `useCalendarCoverage`, and this asserts that they do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HORIZON MUST ROLL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `today + six months`, recomputed. A fixed end date is right on the day
 * it is written, drifts for six months, and is then actively wrong for
 * ever. A literal year in the source is the bug this guards.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND THE NUDGE MUST STAY RATIONED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Grading the sweep by severity means MORE partners qualify — a thin
 * calendar now gets a sentence where before only an empty one did. That
 * is the point, and it is also exactly how a reminder becomes a thing
 * people switch off. So the silences have to widen with the severity,
 * and a partner who has said "I am open until then" must be left alone.
 *
 *   node scripts/check-calendar-coverage.mjs
 *   node scripts/check-calendar-coverage.mjs --sabotage
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

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

const read = p => readFileSync(join(ROOT, p), 'utf8')
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const { horizonDays, severityOf } = await loadSrc({
  'src/hooks/useCalendarCoverage.js': ['horizonDays', 'severityOf'],
})
const { assessChange, coverageOf } = await loadSrc({
  'src/lib/calendarAlerts.js': ['assessChange', 'coverageOf'],
})

const hookSrc = read('src/hooks/useCalendarCoverage.js')
const nudge = read('src/components/vendor/CalendarNudge.jsx')
const month = read('src/components/partner/CalendarMonth.jsx')
const daySheet = read('src/components/partner/DayDetailSheet.jsx')
const sweep = read('api/_lib/calendarSweep.js')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE HORIZON ROLLS')
console.log('')

ok('six months from September is ~181 days',
   Math.abs(horizonDays(6, '2026-09-25') - 181) <= 1, String(horizonDays(6, '2026-09-25')))
ok('six months from December is ~182 days',
   Math.abs(horizonDays(6, '2026-12-31') - 182) <= 2, String(horizonDays(6, '2026-12-31')))
ok('crossing a year boundary still works',
   horizonDays(6, '2026-11-15') > 170 && horizonDays(6, '2026-11-15') < 195)

ok('no literal year is baked into the hook',
   !/\b20\d\d\b/.test(strip(hookSrc)),
   'a fixed date is right once and wrong for ever after')
ok('the horizon is derived from a month count',
   /setUTCMonth\(end\.getUTCMonth\(\)\s*\+\s*months\)/.test(hookSrc))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('SEVERITY SAYS HOW FAR BEHIND, NOT HOW LOUD')
console.log('')

const CASES = [
  [{ fraction: 0, statedDays: 0, hasStandingWeek: false }, 'empty', 'nothing at all'],
  [{ fraction: 0, statedDays: 0, hasStandingWeek: true }, 'short',
   'a standing week is a default, not a statement about December'],
  [{ fraction: 0.2, statedDays: 12, hasStandingWeek: false }, 'short'],
  [{ fraction: 0.49, statedDays: 88, hasStandingWeek: false }, 'short'],
  [{ fraction: 0.5, statedDays: 91, hasStandingWeek: false }, 'thin'],
  [{ fraction: 0.99, statedDays: 179, hasStandingWeek: false }, 'thin'],
  [{ fraction: 1, statedDays: 183, hasStandingWeek: false }, 'ok'],
  [{ fraction: 2, statedDays: 400, hasStandingWeek: false }, 'ok', 'a year ahead is not more than ok'],
]
for (const [input, want, why] of CASES) {
  const got = severityOf(input)
  ok(`${JSON.stringify(input.fraction)} stated=${input.statedDays}${input.hasStandingWeek ? ' +week' : ''} → ${want}${why ? `  (${why})` : ''}`,
     got === want, `got "${got}"`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('ALL THREE SURFACES READ THE SAME HOOK')
console.log('')

ok('the Jobs card reads it', /useCalendarCoverage\(/.test(nudge))
ok('the Calendar tab reads it', /useCalendarCoverage\(/.test(month))
ok('the Jobs card no longer thresholds on its own',
   !/coverage\.level !== LEVEL\.WARN/.test(strip(nudge)),
   'that gate switched the card off for anybody with a standing week')
ok('the card branches on one boolean',
   /if \(!coverage\.needsUpdate\) return null/.test(nudge))
ok('and "I am open until then" is honoured',
   /confirmedAhead < 30/.test(hookSrc),
   'a partner who answered the question must not be asked again inside the window')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE SWEEP GRADES, AND WIDENS ITS SILENCE AS IT DOES')
console.log('')

ok('there is a per-severity quiet window', /QUIET_FOR\s*=\s*\{/.test(sweep))
ok('an empty calendar is the only weekly one',
   /empty:\s*7/.test(sweep) && /short:\s*14/.test(sweep) && /thin:\s*30/.test(sweep))
ok('the lookback reaches the longest window',
   /LOOKBACK_DAYS = Math\.max\(\.\.\.Object\.values\(QUIET_FOR\)\)/.test(sweep),
   'a 7-day lookback cannot enforce a 30-day silence')
ok('the query uses it', /LOOKBACK_DAYS \* 86400000/.test(sweep))
ok('it records WHEN, not merely whether', /toldAt\[r\.vendor_id\]/.test(sweep))
ok('an opted-out partner is still never swept', /optedOut\.has\(v\.id\)/.test(sweep))
ok('a failed availability read still aborts',
   /if \(availRes\.error\) return/.test(sweep),
   'warning a whole city because a SELECT timed out is the worst thing this file could do')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('BLOCKING A DATE SAYS WHAT BLOCKING DOES')
console.log('')

const today = '2026-09-25'
const one = assessChange({ dates: ['2026-10-12'], status: 'BLOCKED', todayISO: today })
ok('a free date still gets the consequence line',
   one.signals.some(s => s.id === 'blocked'),
   'this is the one thing the partner is actually deciding')
ok('and it is quiet, not an alert',
   one.level === 'info' && !one.needsConfirm,
   'a line that fires every time must never be the loud one')
ok('it names the date', /12 October/.test(one.signals.find(s => s.id === 'blocked').says))
ok('and says existing work is not cancelled',
   /not cancelled/.test(one.signals.find(s => s.id === 'blocked').says),
   'that is the fear this sentence exists to answer')

const clash = assessChange({
  dates: ['2026-10-12'], status: 'BLOCKED', todayISO: today,
  jobs: [{ event_date: '2026-10-12', status: 'paid' }],
})
ok('a date with confirmed work is still red and still two-press',
   clash.level === 'red' && clash.needsConfirm)

const opening = assessChange({ dates: ['2026-10-12'], status: 'OPEN', todayISO: today })
ok('opening a date says nothing about blocking',
   !opening.signals.some(s => s.id === 'blocked'))

ok('the day sheet runs through the same engine',
   /assessChange\(/.test(daySheet),
   'two implementations of "is this worth interrupting them" will drift')
ok('and takes its confirm from it',
   /const needsConfirm = alert\.needsConfirm/.test(daySheet))
ok('changing the decision disarms the confirm',
   /useEffect\(\(\) => \{ setConfirmBlock\(false\) \}, \[status, slots\]\)/.test(daySheet),
   'arming a block then switching to Limited must not be one tap from a blocked day')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('SAVING SAYS WHAT WAS SAVED')
console.log('')

ok('the confirmation names the date', /<strong>\{shortDay\}<\/strong>/.test(daySheet))
ok('and the state it is now in',
   /STATES\.find\(x => x\.id === status\)\?\.label/.test(daySheet),
   'a raw status word is not a sentence')
ok('and it is inline, not a second sheet',
   !/createPortal/.test(daySheet.slice(daySheet.indexOf('data-saved'))),
   'a sheet that opens a sheet to confirm the first turns two taps into four')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('COVERAGE IS COMPUTED FROM DATES, NOT GUESSED')
console.log('')

const c = coverageOf({
  availability: { '2026-09-26': {}, '2026-09-30': {} },
  weeklyRules: [{ weekday: 0 }], todayISO: today,
})
ok('a standing week does not fill six months',
   c.months.every(m => m.covered < 1 || m.openDays === 0),
   'it did, and produced "your calendar stops at 30 September" above six full bars')
ok('but it is recorded alongside', c.months.every(m => m.standing === true))
ok('the first blank month is named', c.firstBlank?.label === 'Oct')

/* ══════════════════════════════════════════════════════════════════ */
if (sabotage) {
  ran++
  if (severityOf({ fraction: 0, statedDays: 0, hasStandingWeek: true }) === 'short') {
    bad++
    fails.push('sabotage: expected the standing-week rule to be broken, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('')
}
process.exitCode = bad ? 1 : 0
