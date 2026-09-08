#!/usr/bin/env node
/**
 * Does every dashboard tab's component actually mount?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS FOR — THE SECOND TIME
 * ══════════════════════════════════════════════════════════════════════
 *
 * VendorServiceList used TradeGrid, ListingPitch and ListingTracker and
 * imported none of them: a patch script called replace() without
 * asserting its anchor matched, all three edits silently no-opped, and
 * the file built clean. At render it threw "ListingPitch is not
 * defined" — and because the error boundary wraps the whole route and
 * the tabs are a query parameter, one broken tab showed the sad face on
 * ALL FIVE.
 *
 * This is exactly the ListChecks bug: a bare identifier, which esbuild
 * and Vite treat as a runtime global like `window`. check-flow-renders
 * was written for that class and only ever mounted AddItemFlow, so the
 * Listing tab's own component was never mounted by anything.
 *
 * So this mounts what each tab renders. Same shape as
 * check-flow-renders, same reason, wider net.
 *
 * ── And mounting is not working ─────────────────────────────────────
 * VendorServiceList then mounted perfectly while tapping a trade did
 * nothing: the same splice had removed the {picking && <AddItemFlow/>}
 * block, so the grid set state nothing read. Every component rendered
 * and this guard passed. The last step taps a trade and requires the
 * flow to appear — the one thing that screen exists to do.
 *
 *   node scripts/check-tabs-render.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/tabs-render.png',
  '--scenes', 'scripts/scenes/smoke-scenes.jsx',
  '--scale', '1',
  '--wait', '9000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)

console.log('\n  Dashboard tabs, mounted for real\n')

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(out.split('\n').slice(-12).join('\n'))
  process.exit(1)
}

const lines = out.split('\n')
const done = lines.some(l => l.includes('SMOKE-DONE'))
const failures = [...new Set(
  lines.filter(l => l.includes('SMOKE:')).map(l => l.replace(/^.*SMOKE: /, '').trim()))]

/* A run that did not finish is not a pass — the same rule the flow
   guards learnt, for the same reason. */
if (!done) {
  console.log('  x the scene never finished mounting')
  for (const f of failures) console.log('      ' + f)
  console.log('\n  Something threw before the last component was reached.\n')
  process.exit(1)
}

if (failures.length) {
  console.log(`  x ${failures.length} component${failures.length > 1 ? 's' : ''} threw`)
  for (const f of failures) console.log('      ' + f)
  console.log('\n  The error boundary wraps the whole route, so one of these')
  console.log('  shows "Something went wrong" on every tab.\n')
  process.exit(1)
}

console.log(`  ${tick} every tab component mounts, nothing thrown\n`)
