#!/usr/bin/env node
/**
 * Which button a partner is shown, and whether the privacy banner is
 * telling the truth.
 *
 * Two things here are worth more than they look.
 *
 * `shouldBeWatching` decides BOTH whether the GPS watch is held open and
 * whether the screen says "your location is being shared". If those two
 * ever came from different tests, the app would eventually say one and
 * do the other — and that is the single promise this feature cannot
 * break. One function, asserted here.
 *
 * `trackingPhase` decides the button. Showing "I have arrived" as the
 * primary action to somebody eight kilometres away, or "Start trip" to
 * somebody already at the venue, both make a person stop believing the
 * screen.
 *
 * Pure: session rows in, strings and phases out.
 *
 *   node scripts/check-tracking-display.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/tracking-display.mjs')
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/lib/trackingDisplay.js'),
  '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const { PHASE, trackingPhase, statusLine, formatDistance, formatEta,
        formatCountdown, shouldBeWatching } = await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const S = (over = {}) => ({
  id: 's', mode: 'arrival', status: 'active',
  distance_remaining_m: 8400, eta_at: null,
  geofence_entered_at: null, arrival_confirmed_at: null, ...over,
})

console.log('\nTHE PHASE DECIDES THE BUTTON\n')

ok('no session is idle', trackingPhase(null) === PHASE.IDLE)
ok('active and far is on the way', trackingPhase(S()) === PHASE.ON_THE_WAY)
ok('inside the fence is near',
   trackingPhase(S({ geofence_entered_at: '2026-09-15T09:00:00Z' })) === PHASE.NEAR)
ok('confirmed is arrived',
   trackingPhase(S({ arrival_confirmed_at: '2026-09-15T09:02:00Z' })) === PHASE.ARRIVED)
ok('status arrived is arrived', trackingPhase(S({ status: 'arrived' })) === PHASE.ARRIVED)
ok('cancelled is ended', trackingPhase(S({ status: 'cancelled' })) === PHASE.ENDED)
ok('expired is ended', trackingPhase(S({ status: 'expired' })) === PHASE.ENDED)
ok('completed is ended', trackingPhase(S({ status: 'completed' })) === PHASE.ENDED)

/* The fence prompts; it does not arrive. A session inside the fence that
   nobody has confirmed must NOT read as arrived, or a driver stopped at
   the light outside the gate is recorded as having got there. */
ok('the fence alone never means arrived',
   trackingPhase(S({ geofence_entered_at: '2026-09-15T09:00:00Z' })) !== PHASE.ARRIVED)

console.log('\nTHE BANNER AND THE WATCH ARE ONE DECISION\n')

ok('watching while active', shouldBeWatching(S()) === true)
ok('not watching once arrived', shouldBeWatching(S({ status: 'arrived' })) === false)
ok('not watching once cancelled', shouldBeWatching(S({ status: 'cancelled' })) === false)
ok('not watching once expired', shouldBeWatching(S({ status: 'expired' })) === false)
ok('not watching with no session', shouldBeWatching(null) === false)

/* Every phase that is not live must be silent, and every phase that is
   live must be announced. Asserted over the whole set rather than case
   by case, so a new status added later cannot quietly default to "on". */
for (const st of ['active', 'arrived', 'completed', 'cancelled', 'expired']) {
  const live = shouldBeWatching(S({ status: st }))
  const phase = trackingPhase(S({ status: st }))
  if (live !== (phase === PHASE.ON_THE_WAY || phase === PHASE.NEAR)) {
    ok(`${st}: watching agrees with the phase`, false, `watching=${live} phase=${phase}`)
  }
}
ok('watching agrees with the phase in every status', true)

console.log('\nWORDS A DRIVER READS\n')

ok('240 m, not 237', formatDistance(237) === '240 m', formatDistance(237))
ok('under a km stays in metres', formatDistance(980) === '980 m')
ok('8400 m is 8.4 km', formatDistance(8400) === '8.4 km')
ok('nothing known is null, not "0 km"', formatDistance(null) === null)
ok('NaN is null', formatDistance(Number.NaN) === null)

const now = Date.parse('2026-09-15T09:00:00Z')
ok('2h 15m', formatCountdown(new Date(now + 135 * 60000).toISOString(), now) === '2h 15m',
   String(formatCountdown(new Date(now + 135 * 60000).toISOString(), now)))
ok('an exact hour has no minutes',
   formatCountdown(new Date(now + 60 * 60000).toISOString(), now) === '1h')
ok('minutes under an hour', formatCountdown(new Date(now + 28 * 60000).toISOString(), now) === '28m')
/* A countdown that has run out needs a different sentence, not "-4m". */
ok('the past is null, never negative',
   formatCountdown(new Date(now - 4 * 60000).toISOString(), now) === null)
ok('no time is null', formatCountdown(null, now) === null)
ok('a bad date is null', formatEta('not a date') === null)

console.log('\nTHE SENTENCE UNDER THE HEADING\n')

ok('idle says so', statusLine(null) === 'Not started')
ok('near says almost there', /Almost there/.test(statusLine(S({
  geofence_entered_at: '2026-09-15T09:00:00Z', distance_remaining_m: 140 }))))
ok('an arrival session says tracking stopped',
   /stopped/i.test(statusLine(S({ status: 'arrived', mode: 'arrival' }))))
/* A transport job is only halfway through at the pickup, so it must not
   claim location sharing has ended when it has not. */
ok('a trip at the pickup does NOT claim it stopped',
   !/stopped/i.test(statusLine(S({ status: 'arrived', mode: 'trip' }))),
   statusLine(S({ status: 'arrived', mode: 'trip' })))
ok('distance and time read together',
   /8\.4 km to go/.test(statusLine(S({ eta_at: new Date(now).toISOString() }))),
   statusLine(S({ eta_at: new Date(now).toISOString() })))
ok('no fix yet still says something', statusLine(S({ distance_remaining_m: null })) === 'On the way')

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
