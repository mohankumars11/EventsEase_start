#!/usr/bin/env node
/**
 * Can a partner get from the first screen to a submitted listing?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS ADDS OVER check-flow-renders.mjs
 * ══════════════════════════════════════════════════════════════════════
 *
 * That one proves the flow OPENS. This one proves a partner can get OFF
 * the first screen — it ticks, presses Continue, reaches Review, types a
 * name, holds to sign, and submits, then asserts rows came out.
 *
 * The bug that started all this was a missing import and a blank screen.
 * The next one will be a Continue nobody can enable or a gate with no way
 * through, and neither shows up in a photograph of screen one.
 *
 * repro-add-item.mjs was meant to do this and cannot: it serves dist/ on
 * 127.0.0.1, currentSurface() reads the hostname, 127.0.0.1 is not a
 * partner host, and the ?surface= override is behind import.meta.env.DEV
 * which a production build folds away. Every step reported NOT FOUND
 * against a heading that never stopped saying "Sambramo".
 *
 *   node scripts/check-flow-walk.mjs
  */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/flow-walk.png',
  '--scenes', 'scripts/scenes/flow-walk.jsx',
  '--scale', '1',
  /* Twenty-six flows take longer than the default settle, and a shot
     taken mid-loop reports on whichever trades had been reached. */
  '--wait', '45000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)

console.log('\n  Add-item flow, walked to a submitted listing\n')

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(out.split('\n').slice(-14).join('\n'))
  process.exit(1)
}

const lines = out.split('\n')
const done = /WALK-DONE (\d+)\/(\d+)/.exec(out)
const failures = lines.filter(l => l.includes('FLOW:'))

/* Everything the page logged as an error that is not this guard's own
   reporting. React logs a caught throw itself, so a real failure shows
   up here as well as in WALK: — both are wanted, one names the trade and
   the other carries the message. */
const noise = /Warning:|deprecat|DevTools|Download the React|WALK-DONE|FLOW:/i
const others = lines
  .filter(l => /^\s+ERR |ReferenceError|TypeError|is not defined|is not a function/.test(l))
  .filter(l => !noise.test(l))

const report = (head, items) => {
  const uniq = [...new Set(
    items.map(l => l.replace(/^.*WALK: /, '').replace(/^\s*ERR /, '').trim()))]
  console.log(`  x ${uniq.length} ${head}`)
  for (const i of uniq.slice(0, 12)) console.log('      ' + i)
}

/* A run that did not finish is not a pass, however green it looks.
 *
 * The errors are printed FIRST. An exception thrown mid-loop aborts the
 * loop, so a broken flow arrives here as a MISSING WALK-DONE line — and
 * the first version of this said "raise --wait", which sends whoever
 * reads it hunting a timeout instead of looking at the ReferenceError
 * two lines above. A guard that misdiagnoses costs more than one that
 * says nothing.
 */
if (!done || done[1] !== done[2]) {
  if (failures.length) report('trade(s) cannot be submitted', failures)
  if (others.length) report('problem(s) on the way through', others)
  console.log('  x the run did not finish'
    + (done ? ` — ${done[1]} of ${done[2]} trades mounted` : ' — no WALK-DONE line'))
  console.log(failures.length || others.length
    ? '\n  Fix the error above — the loop aborts on a throw.\n'
    : '\n  Nothing was logged either. Raise --wait, or the harness is broken.\n')
  process.exit(1)
}

if (failures.length || others.length) {
  if (failures.length) report('trade(s) cannot be submitted', failures)
  if (others.length) report('problem(s) on the way through', others)
  console.log('\n  This is what a partner sees as')
  console.log('  "Something went wrong on our side".\n')
  process.exit(1)
}

console.log(`  ${tick} all ${done[2]} walked from the first screen to a submitted listing\n`)
