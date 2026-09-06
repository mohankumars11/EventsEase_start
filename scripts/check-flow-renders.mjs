#!/usr/bin/env node
/**
 * Does the Add-item flow actually mount, for every trade?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * AddItemFlow's stepper used five lucide icons — ListChecks, Soup,
 * ClipboardList, IndianRupee, SendHorizonal — and imported none of them.
 * Building the phases array threw a ReferenceError mid-render, which is
 * the error boundary, on the FIRST screen, for every partner and every
 * trade. It was live for twenty commits and reached a real phone.
 *
 * Three things that should have caught it did not:
 *
 *   the build       esbuild and Vite treat a bare identifier as a runtime
 *                   global, exactly like `window`. Clean build, every time.
 *   the guards      they check DATA — ids, keys, answers. All green while
 *                   the screen that reads the data could not render.
 *   the screenshots they photographed STEPS. OperationsStep, DetailStep
 *                   and ReviewStep all render fine on their own; the flow
 *                   that contains them is what threw.
 *
 * So this mounts the whole flow, once per trade, in a real browser, and
 * fails on anything thrown during render. It is deliberately dumb: it
 * does not assert what the screen says, only that it exists. That is the
 * class of bug that got through.
 *
 * ── Why it wraps the screenshot script ───────────────────────────────
 * A second CDP harness would be a second thing to keep working, and the
 * first one already launches Edge, waits for the port, refuses a stale
 * stylesheet and collects console errors. The scene reports its findings
 * AS console errors so there is one stream to read.
 *
 * ── The three vacuous versions this went through ─────────────────────
 * Worth recording, because each one printed a green tick while the bug
 * it was written for was sitting in the tree:
 *
 *   1  read the error straight after root.render(). React 18 renders
 *      concurrently, so the loop finished and every root was unmounted
 *      before anything drew. Fixed with flushSync.
 *   2  counted `body > div` to decide whether the flow appeared. The
 *      scene's own root makes that at least two, always.
 *   3  reported on whichever trades the loop had reached when the
 *      screenshot fired — eight of twenty-six. Fixed by requiring the
 *      FLOW-DONE line, below, and raising the wait.
 *
 *   node scripts/check-flow-renders.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/flow-renders.png',
  '--scenes', 'scripts/scenes/flow-renders.jsx',
  '--scale', '1',
  /* Twenty-six flows take longer than the default settle, and a shot
     taken mid-loop reports on whichever trades had been reached. */
  '--wait', '25000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)

console.log('\n  Add-item flow, mounted for real\n')

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(out.split('\n').slice(-14).join('\n'))
  process.exit(1)
}

const lines = out.split('\n')
const done = /FLOW-DONE (\d+)\/(\d+)/.exec(out)
const failures = lines.filter(l => l.includes('FLOW:'))

/* Everything the page logged as an error that is not this guard's own
   reporting. React logs a caught throw itself, so a real failure shows
   up here as well as in FLOW: — both are wanted, one names the trade and
   the other carries the message. */
const noise = /Warning:|deprecat|DevTools|Download the React|FLOW-DONE|FLOW:/i
const others = lines
  .filter(l => /^\s+ERR |ReferenceError|TypeError|is not defined|is not a function/.test(l))
  .filter(l => !noise.test(l))

const report = (head, items) => {
  const uniq = [...new Set(
    items.map(l => l.replace(/^.*FLOW: /, '').replace(/^\s*ERR /, '').trim()))]
  console.log(`  x ${uniq.length} ${head}`)
  for (const i of uniq.slice(0, 12)) console.log('      ' + i)
}

/* A run that did not finish is not a pass, however green it looks.
 *
 * The errors are printed FIRST. An exception thrown mid-loop aborts the
 * loop, so a broken flow arrives here as a MISSING FLOW-DONE line — and
 * the first version of this said "raise --wait", which sends whoever
 * reads it hunting a timeout instead of looking at the ReferenceError
 * two lines above. A guard that misdiagnoses costs more than one that
 * says nothing.
 */
if (!done || done[1] !== done[2]) {
  if (failures.length) report('trade(s) do not open', failures)
  if (others.length) report('error(s) while mounting', others)
  console.log('  x the run did not finish'
    + (done ? ` — ${done[1]} of ${done[2]} trades mounted` : ' — no FLOW-DONE line'))
  console.log(failures.length || others.length
    ? '\n  Fix the error above — the loop aborts on a throw.\n'
    : '\n  Nothing was logged either. Raise --wait, or the harness is broken.\n')
  process.exit(1)
}

if (failures.length || others.length) {
  if (failures.length) report('trade(s) do not open', failures)
  if (others.length) report('error(s) while mounting', others)
  console.log('\n  This is what a partner sees as')
  console.log('  "Something went wrong on our side".\n')
  process.exit(1)
}

console.log(`  ${tick} all ${done[2]} trades open, nothing thrown, no console errors\n`)
