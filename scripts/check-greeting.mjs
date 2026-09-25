#!/usr/bin/env node
/**
 * Does the app greet the right person at the right hour?
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWENTY-ONE COMBINATIONS AND A FREE-TEXT NAME BOX
 * ══════════════════════════════════════════════════════════════════════
 *
 * Seven weekdays times three bands is twenty-one sentences, and the
 * interesting ones are all boundaries: 04:59, 05:00, 11:59, 12:00,
 * 16:59, 17:00, and midnight. Nobody verifies those by changing the
 * device clock and looking, which is why the band logic sat inside a
 * React component unchecked for as long as it did.
 *
 * The name is worse. `profiles.full_name` is free text a person typed
 * about themselves, so it arrives as "Rahul", "Sri Rahul Sharma",
 * "R. Sharma", "MOHAN KUMAR", "anusha decor", and sometimes as an email
 * address. Greeting somebody as "Sri", "R", or "Priya@x.com" is worse
 * than not greeting them by name at all -- so the rule that decides
 * when to give up is the part most worth asserting.
 *
 *   node scripts/check-greeting.mjs
 *   node scripts/check-greeting.mjs --sabotage
 */
import { loadSrc } from './lib/loadSrc.mjs'

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

const { wishFor, firstNameOf, dayLineFor, greetingFor, msUntilNextBand, BANDS } =
  await loadSrc({
    'src/lib/greeting.js':
      ['wishFor', 'firstNameOf', 'dayLineFor', 'greetingFor', 'msUntilNextBand', 'BANDS'],
  })

/* A fixed Friday so the weekday assertions do not drift with the day
   this runs. 2026-09-25 is a Friday. */
const at = (h, m = 0, day = 25) => new Date(2026, 8, day, h, m, 0)

console.log('')
console.log('THE BANDS, AT EVERY BOUNDARY')
console.log('')

const BAND_CASES = [
  [0, 0, BANDS.EVENING, 'midnight is still evening, not night'],
  [4, 59, BANDS.EVENING],
  [5, 0, BANDS.MORNING, 'the morning starts exactly here'],
  [11, 59, BANDS.MORNING],
  [12, 0, BANDS.AFTERNOON],
  [16, 59, BANDS.AFTERNOON],
  [17, 0, BANDS.EVENING],
  [23, 59, BANDS.EVENING],
]
for (const [h, m, want, why] of BAND_CASES) {
  const got = wishFor(at(h, m))
  ok(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} → ${want}${why ? `  (${why})` : ''}`,
     got === want, `got "${got}"`)
}

/* There is no "Good night" band, on purpose: a partner reading this at
   2am is working, and wishing them goodnight over a live jobs list is
   the app telling them to stop. */
ok('there is no Good night band, at any hour',
   Array.from({ length: 24 }, (_, h) => wishFor(at(h))).every(w => !/night/i.test(w)))

console.log('')
console.log('EVERY WEEKDAY, NEVER HARD-CODED')
console.log('')

/* 2026-09-21 is a Monday. */
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
WEEK.forEach((name, i) => {
  const line = dayLineFor(at(9, 0, 21 + i))
  ok(`${name} → "Happy ${name}!"`, line === `Happy ${name}!`, `got "${line}"`)
})

/* Comments are stripped first. The module's own doc comment uses
   "Happy Friday!" as an EXAMPLE, and failing on an example would teach
   the next person to delete the example rather than to keep the rule.
   What matters is that no weekday is baked into the code. */
const greetingSrc = await import('node:fs').then(fs =>
  fs.readFileSync(new URL('../src/lib/greeting.js', import.meta.url), 'utf8'))
const greetingCode = greetingSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

ok('nothing in the module hard-codes a weekday',
   !/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/.test(greetingCode),
   'a literal weekday outside a comment is the bug this guards')

ok('and it asks the date for the name of the day',
   /toLocaleDateString\([^)]*weekday/.test(greetingCode))

console.log('')
console.log('THE NAME, AND WHEN TO GIVE UP ON IT')
console.log('')

const NAME_CASES = [
  ['Rahul', 'Rahul'],
  ['Rahul Sharma', 'Rahul'],
  ['  rahul  ', 'Rahul', 'trimmed and title-cased'],
  ['MOHAN KUMAR', 'Mohan', 'shouted names are not shouted back'],
  ['Sri Rahul Sharma', 'Rahul', 'an honorific is not a name'],
  ['Mr Rahul', 'Rahul'],
  ['Smt. Priya', 'Priya'],
  ['R. Sharma', 'Sharma', 'initial-first is how South Indian names are written'],
  ['R', null, 'a lone initial is not a name'],
  ['', null],
  ['   ', null],
  [null, null],
  [undefined, null],
  ['priya@example.com', null, 'an email is not a name'],
  ['Decor 24x7', null, 'a business with a number in it is not a person'],
  ['9876543210', null, 'a phone number is not a name'],
]
for (const [input, want, why] of NAME_CASES) {
  const got = firstNameOf(input)
  ok(`${JSON.stringify(input)} → ${JSON.stringify(want)}${why ? `  (${why})` : ''}`,
     got === want, `got ${JSON.stringify(got)}`)
}

console.log('')
console.log('THE WHOLE LINE')
console.log('')

const withName = greetingFor({ fullName: 'Rahul Sharma', date: at(9) })
ok('a name gets a comma', withName.wish === 'Good morning, Rahul', withName.wish)
ok('and the day line beside it', withName.dayLine === 'Happy Friday!', withName.dayLine)

const without = greetingFor({ fullName: '', date: at(19) })
ok('no name loses the comma rather than trailing one',
   without.wish === 'Good evening', without.wish)
ok('and never renders a dangling separator',
   !/[,:]\s*$/.test(without.wish) && !without.wish.includes('undefined')
   && !without.wish.includes('null'),
   without.wish)

const unusable = greetingFor({ fullName: 'Decor 24x7', date: at(13) })
ok('an unusable name is dropped, not printed',
   unusable.wish === 'Good afternoon' && unusable.name === null, unusable.wish)

console.log('')
console.log('THE TIMER RE-ARMS AT THE BAND, NOT ON A LOOP')
console.log('')

for (const [h, m, wantHours] of [[4, 0, 1], [11, 0, 1], [16, 0, 1], [18, 0, 11]]) {
  const ms = msUntilNextBand(at(h, m))
  const hrs = ms / 3_600_000
  ok(`${String(h).padStart(2, '0')}:00 waits ${wantHours}h`,
     Math.abs(hrs - wantHours) < 0.001, `got ${hrs.toFixed(3)}h`)
}
ok('the wait is always positive, at every hour',
   Array.from({ length: 24 }, (_, h) => msUntilNextBand(at(h, 30))).every(ms => ms > 0),
   'a zero or negative wait spins the timer')

/* ══════════════════════════════════════════════════════════════════ */
if (sabotage) {
  ran++
  if (firstNameOf('Sri Rahul') === 'Rahul') {
    bad++
    fails.push('sabotage: expected the honorific rule to be broken, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('')
}
process.exitCode = bad ? 1 : 0
