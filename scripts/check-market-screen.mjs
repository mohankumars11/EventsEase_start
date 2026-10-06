#!/usr/bin/env node
/**
 * Does "Great! Let's get started" actually say what it is meant to say?
 *
 * The screen was written, routed, and never navigated to — so nothing
 * had ever rendered it. Now that the stage gate sends every new partner
 * here, it is on the one path no partner can avoid, and its six steps
 * are a promise about the rest of setup.
 *
 *   node scripts/check-market-coming-soon.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/market-coming-soon.png',
  '--scenes', 'scripts/scenes/market-coming-soon.jsx',
  '--scale', '1',
  '--wait', '20000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)
const lines = out.split('\n')

console.log("\n  A partner in Mysuru — the city we have not opened\n")

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(lines.slice(-14).join('\n'))
  process.exit(1)
}

const failures = [...new Set(
  lines.filter(l => l.includes('MKT: ')).map(l => l.replace(/^.*MKT: /, '').trim()))]

if (!out.includes('MKT-DONE')) {
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

console.log(`  ${tick} coming-soon, names both cities, asks about serving first, captures interest, never rejects`)
console.log(`  ${tick} shots/market-coming-soon.png\n`)
