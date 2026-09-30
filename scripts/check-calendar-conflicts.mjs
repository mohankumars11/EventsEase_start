#!/usr/bin/env node
/**
 * Two bookings that do not overlap can still be impossible.
 *
 * The case this exists for: a caterer finishing in Whitefield at 4pm and
 * starting in Mysuru at 5pm has a clear month grid and an unworkable
 * day. Pure — minutes in, verdicts out, no browser and no database.
 *
 *   node scripts/check-calendar-conflicts.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/calendar-conflicts.mjs')
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/lib/calendarConflicts.js'),
  '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const { conflictsFor, daySeverity, parseTimeNote, travelMinutes, spanOf, clock, mins, SEVERITY } =
  await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const job = (label, note, trade, distanceM) => ({
  line_id: label, occasion_name: label, time_note: note, trade, distance_m: distanceM,
})

console.log('\nREADING THE HOURS OFF A JOB\n')

ok('"10:00 AM – 10:00 PM"', JSON.stringify(parseTimeNote('10:00 AM – 10:00 PM')) === JSON.stringify({ start: 600, end: 1320 }))
ok('"7 AM to 4 PM"',        JSON.stringify(parseTimeNote('7 AM to 4 PM')) === JSON.stringify({ start: 420, end: 960 }))
ok('12 noon is 12:00, not 00:00', parseTimeNote('12:00 PM – 1:00 PM')?.start === 720)
ok('midnight is 00:00',     parseTimeNote('12:00 AM – 2:00 AM')?.start === 0)
/* A reception that ends after midnight must not read as a negative
   span, or every later job looks clear. */
ok('past midnight rolls forward', parseTimeNote('8:00 PM – 1:00 AM')?.end === 1500,
   String(parseTimeNote('8:00 PM – 1:00 AM')?.end))
ok('unreadable note -> null',  parseTimeNote('evening') === null)
ok('missing note -> null',     parseTimeNote(null) === null)

/* A job with no readable hours must be treated as taking the whole day:
   warning wrongly is recoverable, reassuring wrongly is not. */
const vague = spanOf(job('Vague', 'evening', 'Photography', 5000))
ok('an unreadable job blocks the day', !vague.exact && vague.eventEnd - vague.eventStart >= 13 * 60)

console.log('\nTRAVEL\n')

ok('zero distance still costs something', travelMinutes(0) >= 20, String(travelMinutes(0)))
ok('8.4 km is a city hop, not a minute', travelMinutes(8400) >= 25, String(travelMinutes(8400)))
ok('140 km is hours, not minutes', travelMinutes(140000) > 180, String(travelMinutes(140000)))
ok('further is never quicker', travelMinutes(50000) > travelMinutes(10000))

console.log('\nTHE DAY THAT LOOKS FINE AND IS NOT\n')

/* The headline case. Nothing overlaps; the day is impossible. */
const whitefield = job('Ananya Wedding', '7:00 AM – 4:00 PM', 'Catering & Food', 12000)
const mysuru     = job('Corporate Dinner', '5:00 PM – 10:00 PM', 'Catering & Food', 140000)
const far = conflictsFor([whitefield, mysuru])
ok('an hour between Bengaluru and Mysuru is flagged', far.length === 1, `${far.length} conflicts`)
ok('...as TIGHT, not a clash', far[0]?.severity === SEVERITY.TIGHT, far[0]?.severity)
ok('...and says how short it is', (far[0]?.shortfallMin ?? 0) > 60, String(far[0]?.shortfallMin))
console.log(`      "${far[0]?.message}"`)

/* Genuine overlap is a different, harder failure. */
const overlapA = job('Morning Wedding', '10:00 AM – 3:00 PM', 'Photography', 5000)
const overlapB = job('Afternoon Reception', '2:00 PM – 8:00 PM', 'Photography', 5000)
const clash = conflictsFor([overlapA, overlapB])
ok('overlapping events are a CLASH', clash[0]?.severity === SEVERITY.CLASH, clash[0]?.severity)

/* And a day that genuinely works must stay silent — over-warning is
   how a warning stops being read. */
const easyA = job('Morning shoot', '8:00 AM – 11:00 AM', 'Photography', 4000)
const easyB = job('Evening shoot', '6:00 PM – 9:00 PM', 'Photography', 4000)
ok('a comfortable day raises nothing', conflictsFor([easyA, easyB]).length === 0)
ok('one job alone raises nothing', conflictsFor([easyA]).length === 0)
ok('an empty day raises nothing', conflictsFor([]).length === 0)

/* Trade shapes matter: the same two slots are fine for a photographer
   and impossible for a decorator who needs three hours to build. */
const decorA = job('Mandap', '10:00 AM – 1:00 PM', 'Decoration & Floral', 8000)
const decorB = job('Reception decor', '3:00 PM – 7:00 PM', 'Decoration & Floral', 8000)
const photoA = job('Shoot A', '10:00 AM – 1:00 PM', 'Photography', 8000)
const photoB = job('Shoot B', '3:00 PM – 7:00 PM', 'Photography', 8000)
ok('a decorator is warned on a 2h gap', conflictsFor([decorA, decorB]).length === 1)
ok('a photographer is not', conflictsFor([photoA, photoB]).length === 0)

console.log('\nWHAT THE CALENDAR DOT SHOWS\n')

ok('clash beats tight', daySeverity([overlapA, overlapB, whitefield]) === SEVERITY.CLASH)
ok('tight when only tight', daySeverity([whitefield, mysuru]) === SEVERITY.TIGHT)
ok('ok when clear', daySeverity([easyA, easyB]) === SEVERITY.OK)

console.log('\nHOW IT READS\n')

ok('10:15 am', clock(615) === '10:15 am', clock(615))
ok('past midnight is marked', clock(1500).includes('next day'), clock(1500))
ok('2h 30m', mins(150) === '2h 30m', mins(150))
ok('45m', mins(45) === '45m', mins(45))
ok('2h', mins(120) === '2h', mins(120))

console.log(`\n  ${bad ? cross : tick} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
