#!/usr/bin/env node
/**
 * Do the preference specs name only what partners can answer?
 *
 *   node scripts/check-pref-specs.mjs
 *
 * For every trade and a sample occasion of every kind (a wedding, a first
 * birthday, a Valentine's dinner, a bachelor party, a housewarming, a
 * launch, a school day…): every `pick` id in data/prefSpecs.js must be an
 * option the partner app really offers on that question, and every décor
 * moment's `svc` (data/decorMoments.js) must be a service in
 * src/data/trades/decoration_floral.js, word for word. A pick that is not
 * a partner option would silently match nobody.
 *
 * Bundles with esbuild first (Vite-style extensionless imports).
 */
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'pref-specs-'))
const entry = join(dir, 'entry.mjs')
const root = process.cwd().replace(/\\/g, '/')
writeFileSync(entry, `
  export { specFor, pickId } from '${root}/src/customer/data/prefSpecs.js'
  export { momentsFor } from '${root}/src/customer/data/decorMoments.js'
  export { TRADE_CONFIGS, questionsOf } from '${root}/src/data/trades/index.js'
  export { OCCASIONS } from '${root}/src/customer/data/occasions.js'
`)
const out = join(dir, 'bundle.mjs')
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', jsx: 'automatic',
  loader: { '.webp': 'empty', '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  plugins: [{ name: 'glob', setup(b) { b.onResolve({ filter: /^\.\.\/art\/.*\.webp$/ }, a => ({ path: a.path, namespace: 'x' })); b.onLoad({ filter: /.*/, namespace: 'x' }, () => ({ contents: 'export default ""' })) } }] })
const { specFor, pickId, momentsFor, TRADE_CONFIGS, questionsOf, OCCASIONS } = await import(pathToFileURL(out).href)

const options = {}
for (const c of TRADE_CONFIGS) options[c.id] = Object.fromEntries(questionsOf(c).filter(q => q.scope.startsWith('screen') && q.options?.length).map(q => [q.id, q.options.map(o => o.id)]))
const decorServices = new Set(questionsOf(TRADE_CONFIGS.find(c => c.id === 'decoration_floral')).find(q => q.id === 'services').options.map(o => o.label))

const SAMPLE = ['wedding-ceremony', 'first-birthday', 'valentines-day-celebration', 'bachelor-party', 'housewarming-ceremony', 'naming-ceremony', 'haldi-ceremony',
  'diwali-celebration', 'friends-get-together', 'milestone-birthday', 'memorial-gathering', 'school-annual-day', 'college-fest', 'product-launch', 'kids-birthday-party']
const occs = SAMPLE.map(id => OCCASIONS.find(o => o.id === id)).filter(Boolean)
if (occs.length < SAMPLE.length) console.log(`note: ${SAMPLE.length - occs.length} sample ids not in the catalogue (${SAMPLE.filter(id => !OCCASIONS.find(o => o.id === id)).join(', ')})`)
let bad = 0, checked = 0
const fail = m => { console.log('✗ ' + m); bad++ }
const ev = { guests: 120, hours: 4 }
for (const c of TRADE_CONFIGS) {
  for (const o of occs) {
    const { qs } = specFor(o, c.id, ev)
    for (const q of qs) {
      if (!q.map) continue
      const have = options[c.id]?.[q.k]
      if (!have) { fail(`${c.id}: spec maps "${q.k}" but the partner has no such option question`); continue }
      for (const id of (q.pick ?? []).map(pickId)) { checked++; if (!have.includes(id)) fail(`${c.id} · ${o.id}: pick "${id}" is not an option of ${q.k}`) }
      if (q.pick && !q.pick.length) fail(`${c.id} · ${o.id}: ${q.k} has an empty pick list`)
    }
    if (qs.length > 5) fail(`${c.id} · ${o.id}: ${qs.length} questions — more than five is a directory`)
  }
}
for (const o of OCCASIONS) for (const m of momentsFor(o)) { checked++; if (!decorServices.has(m.svc)) fail(`moment "${m.label}" (${o.id}): "${m.svc}" is not a decorator service`) }
const sizes = new Set(OCCASIONS.map(o => momentsFor(o).length))
console.log(`checked ${checked} picks and moments across ${TRADE_CONFIGS.length} trades × ${occs.length} occasions; moments per occasion: ${[...sizes].sort().join('/')}`)
console.log(bad ? `${bad} problem(s)` : '✓ every pick and every moment is something a partner really offers')
process.exit(bad ? 1 : 0)
