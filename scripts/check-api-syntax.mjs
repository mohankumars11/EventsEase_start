#!/usr/bin/env node
/**
 * Every serverless function must at least parse.
 *
 * api/create-booking-payment.js shipped with `const db` declared twice. Vite
 * never sees api/, so `npm run build` stayed green while every instant
 * payment returned a 500. This runs `node --check` over api/**\/*.js first.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT } from './lib/loadSrc.mjs'

const files = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p) }
    else if (/\.(m?js)$/.test(name)) files.push(p)
  }
})(join(ROOT, 'api'))

const bad = []
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' })
  if (r.status !== 0) bad.push([f.replace(ROOT, '').replace(/\\/g, '/'), (r.stderr || '').trim().split('\n').slice(0, 5).join('\n')])
}

if (bad.length) {
  console.error(`\n  ${bad.length} api file(s) do not parse:\n`)
  for (const [f, e] of bad) console.error(`  ${f}\n${e.replace(/^/gm, '    ')}\n`)
  process.exit(1)
}
console.log(`  api syntax ok (${files.length} files)`)
