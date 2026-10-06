#!/usr/bin/env node
/**
 * Does "Great! Let's get started" actually say what it is meant to say?
 *
 * The screen was written, routed, and never navigated to — so nothing
 * had ever rendered it. Now that the stage gate sends every new partner
 * here, it is on the one path no partner can avoid, and its six steps
 * are a promise about the rest of setup.
 *
 *   node scripts/check-what-you-offer.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts/shoot-components.mjs'),
  'shots/what-you-offer.png',
  '--scenes', 'scripts/scenes/what-you-offer.jsx',
  '--scale', '1',
  '--wait', '20000',
], { cwd: ROOT, encoding: 'utf8' })

const out = (r.stdout ?? '') + (r.stderr ?? '')
const tick = String.fromCharCode(10003)
const lines = out.split('\n')

console.log("\n  What you offer — 26 trades, multi-select\n")

if (r.status !== 0) {
  console.log('  x the harness did not finish\n')
  console.log(lines.slice(-14).join('\n'))
  process.exit(1)
}

const failures = [...new Set(
  lines.filter(l => l.includes('OFFER: ')).map(l => l.replace(/^.*OFFER: /, '').trim()))]

if (!out.includes('OFFER-DONE')) {
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

console.log(`  ${tick} all 26 trades, each with what it covers, multi-select, honest count`)
console.log(`  ${tick} shots/what-you-offer.png\n`)
