#!/usr/bin/env node
/**
 * Does the right partner get asked for the right document?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TWO FAILURES, AND THEY PULL IN OPPOSITE DIRECTIONS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Ask too little and a caterer serves food with no FSSAI. Ask too much
 * and a photographer abandons onboarding at a screen demanding a food
 * licence — which is the specific example the spec calls out, so it is
 * the specific thing asserted here.
 *
 * Every case below is the acceptance test from §18 written as an
 * assertion. Pure: no browser, no database, about a second.
 *
 *   node scripts/check-verification-requirements.mjs
 *   node scripts/check-verification-requirements.mjs --verbose
 *   node scripts/check-verification-requirements.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/verification-reqs.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/verification-reqs-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/requirements.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/documentTypes.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const {
  requirementsFor, TRADE_TIERS, TIER, tiersFor, scopeFor,
  ALL_REQUIREMENT_IDS, DOCUMENT_TYPES, verificationLabel,
} = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (name, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${name}${d ? `\n      ${d}` : ''}`) }
  if (verbose || !cond) console.log(`  ${cond ? tick : cross} ${name}${cond ? '' : `   <-- ${d}`}`)
}

/** The document types a trade's checklist asks for. */
const typesFor = (trades, answers = {}) =>
  requirementsFor({ trades, answers }).map(r => r.documentType)
const idsFor = (trades, answers = {}) =>
  requirementsFor({ trades, answers }).map(r => r.id)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE CHECKLIST IS THE TRADE\'S, NOT EVERYBODY\'S\n')

const catering = typesFor(['Catering & Food'])
ok('a caterer is asked for FSSAI', catering.includes('fssai'), catering.join(','))
ok('a caterer is asked for identity', catering.includes('aadhaar'))

const photo = typesFor(['Photography'])
/* The spec's headline example. */
ok('a PHOTOGRAPHER IS NEVER ASKED FOR FSSAI', !photo.includes('fssai'), photo.join(','))
ok('a photographer is not asked for vehicle papers',
   !photo.includes('rc') && !photo.includes('dl'), photo.join(','))
ok('a photographer IS asked for identity', photo.includes('aadhaar'))

const decor = typesFor(['Decoration & Floral'])
ok('a decorator is not asked for vehicle papers',
   !decor.includes('rc') && !decor.includes('dl'), decor.join(','))
ok('a decorator is not asked for FSSAI', !decor.includes('fssai'))

const transport = typesFor(['Transportation'])
for (const t of ['dl', 'rc', 'insurance']) {
  ok(`transport is asked for ${t}`, transport.includes(t), transport.join(','))
}
ok('transport is not asked for FSSAI', !transport.includes('fssai'))

const venue = typesFor(['Venue'])
ok('a venue is asked to prove it can let the place',
   venue.includes('property_proof'), venue.join(','))

const security = typesFor(['Security Services'])
ok('security is asked for PSARA', security.includes('psara'), security.join(','))
ok('event lighting is NOT asked for PSARA',
   !typesFor(['Event Lighting']).includes('psara'))
ok('event lighting IS asked for an electrical licence',
   typesFor(['Event Lighting']).includes('electrical_licence'))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nADDING AND REMOVING A TRADE\n')

const both = typesFor(['Photography', 'Transportation'])
ok('adding Transport brings its documents in', both.includes('dl') && both.includes('rc'))
ok('and Photography still brings none of its own vehicle papers',
   !typesFor(['Photography']).includes('dl'))

const removed = typesFor(['Photography'])
ok('removing Transport takes its documents out of the checklist',
   !removed.includes('dl') && !removed.includes('rc') && !removed.includes('insurance'),
   removed.join(','))

/* Two trades that need two DIFFERENT documents must produce two
   requirements — the exact collision migration 143 fixes. */
const cateringVenue = idsFor(['Catering & Food', 'Venue'])
ok('Catering + Venue produce two separate trade requirements',
   cateringVenue.includes('VER-TRADE-FSSAI') && cateringVenue.includes('VER-TRADE-PROPERTY'),
   cateringVenue.join(','))
ok('and their ids are distinct, so one upload cannot satisfy both',
   new Set(cateringVenue).size === cateringVenue.length)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nCONDITIONAL REQUIREMENTS ARE NOT ASKED UNPROMPTED\n')

ok('a caterer is not asked for a liquor permit by default',
   !typesFor(['Catering & Food']).includes('liquor_permit'))
ok('and is once they say they pour alcohol',
   typesFor(['Catering & Food'], { serves_alcohol: true }).includes('liquor_permit'))
ok('GST is not asked unless the partner says they are registered',
   !typesFor(['Photography']).includes('gst'))
ok('and is once they say they are',
   typesFor(['Photography'], { gst_registered: true }).includes('gst'))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY TRADE IS ACCOUNTED FOR\n')

/* The seed is the authority. A trade missing from TRADE_TIERS falls
   silently through to baseline, which is how a caterer stops being
   asked about food without anybody noticing. */
const seed = readFileSync(
  join(ROOT, 'supabase/migrations/107_catalogue_seed.generated.sql'), 'utf8')
const seeded = [...seed.matchAll(/VALUES \('SBM-TRD-\d+', '([^']+)'/g)].map(m => m[1])

ok('the seed file was found and parsed', seeded.length >= 26, `${seeded.length} trades`)
const missing = seeded.filter(t => !TRADE_TIERS[t])
ok('every seeded trade has a tier', missing.length === 0, missing.join(', '))
const extra = Object.keys(TRADE_TIERS).filter(t => !seeded.includes(t))
ok('and no tier names a trade that does not exist', extra.length === 0, extra.join(', '))

ok('every trade gets identity at minimum',
   seeded.every(t => typesFor([t]).includes('aadhaar')))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY REQUIREMENT IS CAPTURABLE\n')

const all = requirementsFor({ trades: Object.keys(TRADE_TIERS), answers: {
  gst_registered: true, serves_alcohol: true, commercial_vehicle: true,
} })

ok('every requirement resolves to a known document type',
   all.every(r => !!DOCUMENT_TYPES[r.documentType]),
   all.filter(r => !DOCUMENT_TYPES[r.documentType]).map(r => r.id).join(','))

ok('every requirement carries a storable kind',
   all.every(r => typeof r.kind === 'string' && r.kind.length > 0))

/* 142's CHECK is the authority on what vendor_documents will accept.
   A document type with a kind outside it fails at upload with a
   constraint error that reads like a bug in the uploader. */
const mig142 = readFileSync(
  join(ROOT, 'supabase/migrations/142_an_id_is_checked_not_guessed.sql'), 'utf8')
const kindBlock = mig142.slice(mig142.indexOf('vendor_documents_kind_allowed'))
const allowedKinds = [...kindBlock.slice(0, 400).matchAll(/'([a-z_]+)'/g)].map(m => m[1])
const badKinds = [...new Set(all.map(r => r.kind))].filter(k => !allowedKinds.includes(k))
ok('every kind is one migration 142 accepts', badKinds.length === 0,
   `${badKinds.join(',')} — allowed: ${allowedKinds.join(',')}`)

ok('a two-sided document says so',
   DOCUMENT_TYPES.aadhaar.backRequired && DOCUMENT_TYPES.dl.backRequired)
ok('a one-sided document does not ask for a back',
   !DOCUMENT_TYPES.pan.backRequired)
ok('every expiring document sets a minimum validity',
   all.filter(r => r.expiryRequired).every(r => Number(r.minimumValidityDays) > 0),
   all.filter(r => r.expiryRequired && !r.minimumValidityDays).map(r => r.id).join(','))
ok('every requirement has a file-type list and a size cap',
   all.every(r => Array.isArray(r.allowedFileTypes) && r.allowedFileTypes.length > 0 && r.maximumFileSize > 0))
ok('the Aadhaar number is never stored in full',
   DOCUMENT_TYPES.aadhaar.storeNumber === 'last4')
ok('ALL_REQUIREMENT_IDS covers everything the engine can emit',
   all.every(r => ALL_REQUIREMENT_IDS.includes(r.id)),
   all.filter(r => !ALL_REQUIREMENT_IDS.includes(r.id)).map(r => r.id).join(','))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nENFORCEMENT IS ONE SWITCH\n')

const offNow = requirementsFor({ trades: ['Catering & Food'] })
ok('with MANDATORY_FROM unset nothing is required',
   offNow.every(r => r.required === false))

const onNow = requirementsFor({ trades: ['Catering & Food'], mandatoryFrom: new Date('2026-01-01') })
ok('turning it on makes the enforceable ones required',
   onNow.some(r => r.required === true))
ok('and leaves the un-enforceable ones optional',
   onNow.some(r => r.required === false))
ok('FSSAI is one of the ones that gates',
   onNow.find(r => r.documentType === 'fssai')?.required === true)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nDECLINING SCOPES DOWN, IT DOES NOT SHUT OUT\n')

const pcc = requirementsFor({ trades: ['Mehendi Artist'] })
  .find(r => r.documentType === 'police_clearance')
ok('a tier-1 trade is offered a background check', !!pcc)
ok('and it is marked declinable', pcc?.declinable === true)
ok('it is NOT enforceable, so it can never silently block',
   pcc?.enforceable === false)

const scoped = scopeFor({
  trades: ['Mehendi Artist', 'Invitation & Printing', 'Photography'],
  declined: ['VER-SAFETY-PCC'],
})
ok('declining blocks the trades that needed it',
   scoped.blockedTrades.includes('Mehendi Artist') && scoped.blockedTrades.includes('Photography'),
   scoped.blockedTrades.join(','))
ok('and leaves the ones that did not',
   scoped.allowedTrades.includes('Invitation & Printing'), scoped.allowedTrades.join(','))
ok('the partner is told why, and how to undo it',
   /change your mind|police clearance/i.test(scoped.reason ?? ''))

const notDeclined = scopeFor({ trades: ['Mehendi Artist'], declined: [] })
ok('declining nothing blocks nothing', notDeclined.blockedTrades.length === 0)

/* A requirement that is not declinable must not be scope-able, or a
   partner could shed a statutory licence by "declining" it. */
const cannot = scopeFor({ trades: ['Catering & Food'], declined: ['VER-TRADE-FSSAI'] })
ok('a statutory requirement cannot be declined away',
   cannot.blockedTrades.length === 0, cannot.blockedTrades.join(','))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE LABEL NEVER OVERSTATES WHAT HAPPENED\n')

ok('a checksum alone never reads as verified',
   verificationLabel({ status: 'pending', checksumOk: true, documentType: 'aadhaar' })
     === 'Number checks out — being reviewed')
ok('an operator accepting it reads as document verified',
   verificationLabel({ status: 'accepted', documentType: 'shop_licence' }) === 'Document verified')
ok('a provider verifying an ID reads as identity verified',
   verificationLabel({ providerStatus: 'verified', documentType: 'aadhaar' }) === 'Identity verified')
ok('a provider verifying a GSTIN reads as business registration verified',
   verificationLabel({ providerStatus: 'verified', documentType: 'gst' })
     === 'Business registration verified')
ok('an unavailable provider is never read as invalid',
   verificationLabel({ providerStatus: 'unavailable' }) === 'Manual review required')
ok('nothing anywhere says "Government Verified"',
   !['pending', 'accepted', 'rejected'].some(s =>
     ['aadhaar', 'pan', 'gst', 'dl'].some(d =>
       /government/i.test(verificationLabel({ status: s, documentType: d })))))

if (sabotage) {
  ran++
  const t = typesFor(['Photography'])
  if (!t.includes('fssai')) {
    bad++
    fails.push('sabotage: expected the photographer rule to be broken, and it was not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails.slice(0, 20)) console.log('  ' + f + '\n')
}
process.exitCode = bad ? 1 : 0
