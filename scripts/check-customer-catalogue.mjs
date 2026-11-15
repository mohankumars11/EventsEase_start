#!/usr/bin/env node
/**
 * The customer app's occasion catalogue, checked.
 *
 *   node scripts/check-customer-catalogue.mjs [--list]
 *
 * Fails on: an event with no template, a duplicate id, a season pick that
 * does not resolve, a venue offered where the location is settled (a
 * housewarming is at the new home), a DJ or a cake at a memorial, a tent
 * or valet at an online event, and any category with no featured event.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/customer-catalogue.mjs')
mkdirSync(dirname(OUT), { recursive: true })
await build({
  stdin: { contents: `export * from './src/customer/data/occasions.js'; export * from './src/customer/data/trades.js'`, resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', jsx: 'automatic',
})
const C = await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)

let bad = 0
const fail = (m) => { bad++; console.log(`  ✗ ${m}`) }
const ids = new Set()
for (const o of C.OCCASIONS) {
  if (ids.has(o.id)) fail(`duplicate id ${o.id}`)
  ids.add(o.id)
  const all = [...o.must, ...o.often, ...o.extra]
  if (o.where !== 'ask' && all.includes('venue')) fail(`${o.name}: venue offered but location is "${o.whereLabel}"`)
  if (o.template === 'memorial' && all.some(x => ['dj_music', 'cake_desserts', 'bar_beverages'].includes(x))) fail(`${o.name}: festive service at a memorial`)
  if (o.where === 'online' && all.some(x => ['tent_furniture', 'valet_parking', 'venue', 'security_services'].includes(x))) fail(`${o.name}: physical-site service online`)
  if (!o.must.length) fail(`${o.name}: no essentials`)
}
for (const c of C.CATEGORIES) if (!c.events.some(e => e.f)) fail(`category ${c.id} has nothing featured`)
for (const m of Array.from({ length: 12 }, (_, i) => i)) {
  const picks = C.inSeason(new Date(2026, m, 15))
  if (picks.length < 3) fail(`season ${m + 1}: only ${picks.length} picks resolve`)
}
console.log(`customer catalogue: ${C.CATEGORIES.length} categories, ${C.OCCASIONS.length} occasions, ${C.FEATURED.length} featured, ${C.TRADES.length} trades`)
if (process.argv.includes('--list')) for (const c of C.CATEGORIES) console.log(`  ${c.label}: ${c.events.length}`)
console.log(bad ? `FAILED: ${bad}` : 'ok')
process.exit(bad ? 1 : 0)
