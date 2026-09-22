#!/usr/bin/env node
/**
 * Does the right partner get asked for the right document?
 *
 * The failure this guards: one checklist for twenty-six trades, where a
 * caterer was never asked about food and a mehendi artist was asked for
 * a GST certificate. Pure — no browser, no database.
 *
 *   node scripts/check-compliance-engine.mjs
 */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve, dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ── Bundled, not imported directly ──────────────────────────────────
   compliance.js is now a shim over src/lib/verification/, and it uses
   the extensionless import style the whole repo uses. Vite resolves
   that; bare node ESM does not, and fails with ERR_MODULE_NOT_FOUND
   pointing at a file that is plainly there. Every other pure guard in
   this directory bundles first for the same reason. */
const OUT = join(ROOT, 'node_modules/.cache/compliance-engine.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/compliance-engine-entry.mjs')
writeFileSync(ENTRY,
  `export * from ${JSON.stringify(join(ROOT, 'src/data/compliance.js'))}\n`)
const built = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (built.status !== 0) { console.error(built.stderr ?? built.stdout); process.exit(1) }

const { requirementsFor, ALL_REQUIREMENT_IDS, MANDATORY_FROM } =
  await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let failed = 0
const ok = (name, cond, detail = '') => {
  if (!cond) failed++
  console.log(`  ${cond ? tick : cross} ${name}${cond ? '' : `  ${detail}`}`)
}

const ids = t => requirementsFor(t).map(r => r.id)

console.log('\nWHO IS ASKED FOR WHAT\n')

/* ── The ids narrowed when the engine landed ─────────────────────────
   VER-TRADE-FOOD became VER-TRADE-FSSAI, VER-TRADE-VENUE became
   VER-TRADE-PROPERTY, and VER-TRADE-TRANSPORT split into the four
   documents it always meant. The BEHAVIOURS asserted here are
   unchanged — see src/data/compliance.js for the mapping. */
const mehendi = ids(['Mehendi Artist'])
ok('a mehendi artist is asked for identity', mehendi.includes('VER-ID-IDENTITY'))
ok('...and not for a food licence', !mehendi.includes('VER-TRADE-FSSAI'))
ok('...and not for vehicle papers', !mehendi.includes('VER-TRADE-DL'))

const caterer = ids(['Catering & Food'])
ok('a caterer IS asked about food', caterer.includes('VER-TRADE-FSSAI'), `got ${caterer.join(', ')}`)

ok('a transporter is asked for vehicle papers', ids(['Transportation']).includes('VER-TRADE-RC'))
ok('a venue is asked who may let it', ids(['Venue']).includes('VER-TRADE-PROPERTY'))
ok('security is asked for credentials', ids(['Security Services']).includes('VER-TRADE-PSARA'))

/* A partner with two trades is asked for both trades' documents and the
   base set ONCE — being asked for Aadhaar twice is how a form teaches
   somebody it is not paying attention. */
const both = ids(['Catering & Food', 'Venue'])
ok('two trades get both documents', both.includes('VER-TRADE-FSSAI') && both.includes('VER-TRADE-PROPERTY'))
ok('...and identity only once',
  both.filter(i => i === 'VER-ID-IDENTITY').length === 1,
  `appeared ${both.filter(i => i === 'VER-ID-IDENTITY').length} times`)

/* A trade nobody has written rules for yet must still work, and must
   ask for the minimum rather than everything. */
const unknown = ids(['Kite Flying'])
ok('an unknown trade still gets the base set', unknown.includes('VER-ID-IDENTITY'))
ok('...and nothing trade-specific', !unknown.some(i => i.startsWith('VER-TRADE-')))

ok('no trade at all still works', ids([]).length > 0)

console.log('\nNOTHING IS MANDATORY YET (§31)\n')

const everything = requirementsFor(['Catering & Food', 'Venue', 'Transportation'])
ok('MANDATORY_FROM is unset', MANDATORY_FROM === null, String(MANDATORY_FROM))
ok('so nothing is marked required', everything.every(r => !r.required),
  everything.filter(r => r.required).map(r => r.id).join(', '))
/* But the switch has to be real: at least one requirement must be
   ENFORCEABLE, or turning enforcement on later would change nothing. */
ok('...though some are enforceable when it is set', everything.some(r => r.enforceable))

console.log('\nIDS ARE STABLE AND UNIQUE\n')

ok('no duplicate requirement ids',
  new Set(ALL_REQUIREMENT_IDS).size === ALL_REQUIREMENT_IDS.length)
ok('every id matches the VER- shape',
  ALL_REQUIREMENT_IDS.every(i => /^VER-[A-Z]+-[A-Z]+$/.test(i)),
  ALL_REQUIREMENT_IDS.filter(i => !/^VER-[A-Z]+-[A-Z]+$/.test(i)).join(', '))
/* Every requirement must point at a real upload slot, or it is a row a
   partner cannot satisfy. */
/* Widened by migration 142, which added seven kinds so that a food
   licence and a vehicle RC stop both being filed as 'shop_licence'. */
const KINDS = ['aadhaar', 'pan', 'gst', 'shop_licence', 'other',
               'fssai', 'dl', 'rc', 'udyam', 'police_clearance', 'insurance', 'selfie']
ok('every requirement has an upload slot',
  everything.every(r => KINDS.includes(r.documentKind)),
  everything.filter(r => !KINDS.includes(r.documentKind)).map(r => r.documentKind).join(', '))

console.log(failed ? `\n${cross} ${failed} failed\n` : `\n${tick} all passed\n`)
process.exit(failed ? 1 : 0)
