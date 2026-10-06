#!/usr/bin/env node
/**
 * Does "Great! Let's get started" actually say what it is meant to say?
 *
 * The screen was written, routed, and never navigated to — so nothing
 * had ever rendered it. Now that the stage gate sends every new partner
 * here, it is on the one path no partner can avoid, and its six steps
 * are a promise about the rest of setup.
 *
 *   node scripts/check-six-step-home.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/six-step-home.png',
  '--scenes', 'scripts/scenes/six-step-home.jsx',
  '--scale', '1',
  '--wait', '20000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)
const lines = out.split('\n')

console.log("\n  The master onboarding home — six steps, five of them locked\n")

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(lines.slice(-14).join('\n'))
  process.exit(1)
}

const failures = [...new Set(
  lines.filter(l => l.includes('HOME: ')).map(l => l.replace(/^.*HOME: /, '').trim()))]

if (!out.includes('HOME-DONE')) {
  console.log('  x the scene never finished — the screen probably threw\n')
  console.log(lines.filter(l => /ERR |Error|not defined|not a function/.test(l)).slice(0, 8).join('\n'))
  process.exit(1)
}

if (failures.length) {
  console.log(`  x ${failures.length} problem(s):\n`)
  failures.forEach(f => console.log(`      ${f}`))
  console.log('')
  process.exit(1)
}

console.log(`  ${tick} six steps in order, only step 1 open, no Complete Later, progress shown`)
console.log(`  ${tick} shots/six-step-home.png\n`)
