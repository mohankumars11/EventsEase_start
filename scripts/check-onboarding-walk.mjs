#!/usr/bin/env node
/**
 * Can a new partner get from the sign-up page into the Listing tab?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE PATH EVERY PARTNER TAKES, AND NOTHING TESTED IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * check-flow-walk proves a partner can list something. This proves they
 * can get as far as being able to.
 *
 * Onboarding shipped with `setSaving(false)` on a component whose setter
 * is `setLoading`. The ReferenceError was swallowed by the surrounding
 * catch and shown to the partner as "setSaving is not defined", in place
 * of the sentence written for exactly that moment — and it sat on the
 * one branch nobody clicks: a pincode we do not serve.
 *
 * The screens are asserted, not photographed. A screenshot of step 1
 * proves step 1 renders and says nothing about whether Continue does
 * anything, which is the failure that actually happens here.
 *
 *   node scripts/check-onboarding-walk.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/onboarding-walk.png',
  '--scenes', 'scripts/scenes/onboarding-walk.jsx',
  '--scale', '1',
  '--wait', '25000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)

console.log('\n  Onboarding, walked from the first field to a signed agreement\n')

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(out.split('\n').slice(-14).join('\n'))
  process.exit(1)
}

const lines = out.split('\n')
const failures = lines.filter(l => l.includes('ONB: '))

/* Anything the page threw that is not this guard's own reporting.
   React logs a caught throw itself, so a real failure appears here as
   well as in ONB: — both are wanted, one names the step and the other
   carries the message. */
const noise = /Warning:|deprecat|DevTools|Download the React|ONB-DONE|ONB: /i
const others = lines
  .filter(l => /^\s+ERR |ReferenceError|TypeError|is not defined|is not a function/.test(l))
  .filter(l => !noise.test(l))

const uniq = items => [...new Set(
  items.map(l => l.replace(/^.*ONB: /, '').replace(/^\s*ERR /, '').trim()))]

/* Errors first. An exception mid-walk aborts it, so a broken step
   arrives here as a MISSING ONB-DONE line — and a guard whose first
   sentence is "raise --wait" sends whoever reads it hunting a timeout
   instead of reading the ReferenceError two lines above. */
if (others.length) {
  const u = uniq(others)
  console.log(`  x ${u.length} error(s) thrown while walking`)
  for (const i of u.slice(0, 12)) console.log('      ' + i)
}

if (failures.length) {
  const u = uniq(failures)
  console.log(`  x ${u.length} step(s) did not behave`)
  for (const i of u) console.log('      ' + i)
}

/* ══════════════════════════════════════════════════════════════════════
   A RUN THAT DID NOT FINISH IS NOT A PASS
   ══════════════════════════════════════════════════════════════════════

   The scene prints ONB-DONE exactly once, at the end, whatever happened.
   Without this line a walk that crashed on step 2 would produce no
   ONB: failures and no errors this filter recognises, and would print a
   green tick. Three guards in this repo were vacuous the first time they
   were run; this is the check that makes it impossible here. */
if (!out.includes('ONB-DONE')) {
  console.log('  x the walk never reached its end marker\n')
  console.log(out.split('\n').slice(-16).join('\n'))
  process.exit(1)
}

if (others.length || failures.length) {
  console.log('')
  process.exit(1)
}

console.log(`  ${tick} location, business, attribution, agreement, signature — all reached\n`)
