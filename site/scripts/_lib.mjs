/** Shared helpers for the check scripts. */
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST = join(SITE, 'dist')

export function htmlFiles(dir = DIST, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    statSync(p).isDirectory() ? htmlFiles(p, out) : p.endsWith('.html') && out.push(p)
  }
  return out
}

/** dist/occasions/wedding/index.html -> /occasions/wedding/ */
export const pathOf = f => {
  const rel = f.slice(DIST.length).split(sep).join('/')
  return rel.replace(/index\.html$/, '') || '/'
}

const failures = []
export const fail = msg => failures.push(msg)

export function report(name, count) {
  if (failures.length) {
    console.error(`\n${name}: ${failures.length} failure(s) across ${count} pages\n`)
    for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`)
    if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`)
    console.error('')
    process.exit(1)
  }
  console.log(`${name}: ok (${count} pages)`)
}
