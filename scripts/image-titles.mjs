#!/usr/bin/env node
/**
 * Write docs/image-prompts/titles.json: what each image id IS, in words —
 *   "occ-dealer-meet": "Dealer Meet, a Corporate & Business occasion"
 * scripts/generate_images.py puts this in front of every scene so the
 * model knows which occasion the card is for, not just the scene line.
 * Re-run whenever occasions.js or trades.js changes.
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/customer-titles.mjs')
mkdirSync(dirname(OUT), { recursive: true })
await build({
  stdin: { contents: `export * from './src/customer/data/occasions.js'; export * from './src/customer/data/trades.js'`, resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', jsx: 'automatic',
})
const C = await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)
const titles = { 'hero-family': 'the home-screen banner of an Indian celebrations app: a family celebrating together' }
for (const c of C.CATEGORIES) titles[`cat-${c.id}`] = `the "${c.short}" category of celebrations (${c.line})`
for (const o of C.OCCASIONS) titles[`occ-${o.id}`] = `${o.name}, a ${o.categoryShort} occasion`
for (const t of C.TRADES) titles[`svc-${t.id}`] = `the ${t.label} service at Indian events (${t.why})`
writeFileSync(join(ROOT, 'docs/image-prompts/titles.json'), JSON.stringify(titles, null, 1) + '\n')
console.log(Object.keys(titles).length, 'titles')
