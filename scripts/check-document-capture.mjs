#!/usr/bin/env node
/**
 * Phase 2's acceptance table, as assertions.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE THAT MATTERS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Catering + Venue: an FSSAI upload does NOT satisfy the Venue
 *   requirement.
 *
 * That was the live bug. Five trade requirements shared the kind
 * 'shop_licence', vendor_documents had UNIQUE (vendor_id, kind), and
 * `complianceDone` tested `documents[r.documentKind]` — so one photograph
 * of a food licence marked a venue authorisation satisfied. It showed as
 * a tick, which is worse than showing as a gap.
 *
 * Everything else here is the rest of the table from the plan.
 *
 *   node scripts/check-document-capture.mjs
 *   node scripts/check-document-capture.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/doc-capture.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/doc-capture-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/requirements.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/satisfaction.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { requirementsFor, evaluateRequirement, evaluateAll, DOC_STATE, daysUntil } = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const TODAY = '2026-09-22'
const reqOf = (trades, id) => requirementsFor({ trades }).find(r => r.id === id)

/** A complete row for a requirement, so tests subtract rather than add. */
function fullRow(r, over = {}) {
  const row = { kind: r.kind, requirement_id: r.id, storage_path: 'a/front.jpg', status: 'pending' }
  if (r.backRequired) row.back_path = 'a/back.jpg'
  if (r.numberRequired) row.number_last4 = '1234'
  if (r.holderNameRequired) row.holder_name = 'Ravi Kumar'
  if (r.issuingAuthorityRequired) row.issuing_authority = 'BBMP'
  if (r.expiryRequired) row.expires_on = '2030-01-01'
  return { ...row, ...over }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nCROSS-REQUIREMENT SATISFACTION IS IMPOSSIBLE\n')

const both = requirementsFor({ trades: ['Catering & Food', 'Venue'] })
const fssai = both.find(r => r.id === 'VER-TRADE-FSSAI')
const venue = both.find(r => r.id === 'VER-TRADE-PROPERTY')
ok('Catering + Venue produce both requirements', !!fssai && !!venue)

/* The partner uploads ONE document: their FSSAI licence. */
const onlyFssai = { 'VER-TRADE-FSSAI': fullRow(fssai) }
const evaluated = evaluateAll(both, onlyFssai, TODAY)

ok('the FSSAI requirement is satisfied',
   evaluated.results['VER-TRADE-FSSAI'].satisfied === true)
ok('AN FSSAI UPLOAD DOES NOT SATISFY THE VENUE REQUIREMENT',
   evaluated.results['VER-TRADE-PROPERTY'].satisfied === false,
   'this is the bug migration 143 exists to fix')
ok('and the venue requirement reports nothing uploaded',
   evaluated.results['VER-TRADE-PROPERTY'].state === DOC_STATE.NONE)

/* A legacy row (pre-143, no requirement_id) under a SHARED kind must
   not be attributed to any one of the five that share it. */
const legacyShared = { 'legacy:shop_licence': { kind: 'shop_licence', storage_path: 'x.jpg' } }
const legacyEval = evaluateAll(both, legacyShared, TODAY)
ok('a legacy shop_licence row satisfies neither of the five sharing the kind',
   legacyEval.results['VER-TRADE-PROPERTY'].satisfied === false)

/* But a legacy row under an UNSHARED kind should still count, or a
   partner's existing Aadhaar would vanish the day 143 lands. */
const aadhaarReq = reqOf(['Photography'], 'VER-ID-IDENTITY')
const legacyAadhaar = { 'legacy:aadhaar': fullRow(aadhaarReq, { requirement_id: null }) }
ok('a legacy Aadhaar still counts, so nothing vanishes the day 143 lands',
   evaluateAll([aadhaarReq], legacyAadhaar, TODAY).results['VER-ID-IDENTITY'].satisfied === true)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE TRADE DECIDES THE CHECKLIST\n')

const ids = t => requirementsFor({ trades: [t] }).map(r => r.documentType)
ok('Photography: no FSSAI', !ids('Photography').includes('fssai'))
ok('Catering: FSSAI present', ids('Catering & Food').includes('fssai'))
for (const d of ['dl', 'rc', 'insurance', 'puc']) {
  ok(`Transport: ${d} present`, ids('Transportation').includes(d))
}
ok('Transport: no FSSAI', !ids('Transportation').includes('fssai'))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA FILE IS NOT A SATISFIED REQUIREMENT\n')

const dl = reqOf(['Transportation'], 'VER-TRADE-DL')
ok('the DL requirement wants two sides, a number, a name and an expiry',
   dl.frontRequired && dl.backRequired && dl.numberRequired
   && dl.holderNameRequired && dl.expiryRequired)

const only = over => evaluateRequirement(dl, { ...fullRow(dl), ...over }, TODAY)

ok('missing the back is incomplete',
   only({ back_path: null }).state === DOC_STATE.INCOMPLETE)
ok('and it names the back', only({ back_path: null }).missing.includes('back'))
ok('missing the number is incomplete', only({ number_last4: null }).missing.includes('number'))
ok('missing the holder name is incomplete', only({ holder_name: null }).missing.includes('holder name'))
ok('missing the expiry date is incomplete', only({ expires_on: null }).missing.includes('expiry date'))
ok('a complete one is satisfied', only({}).satisfied === true)

/* A requirement that does NOT declare a field must not demand it. */
const pan = reqOf(['Photography'], 'VER-TAX-PAN')
ok('PAN is one-sided, so no back is demanded',
   evaluateRequirement(pan, fullRow(pan), TODAY).satisfied === true)
ok('and a PAN row with no expiry is still satisfied',
   evaluateRequirement(pan, { ...fullRow(pan), expires_on: null }, TODAY).satisfied === true)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nAN EXPIRED DOCUMENT IS NOT A DOCUMENT\n')

const fssaiReq = reqOf(['Catering & Food'], 'VER-TRADE-FSSAI')
const expired = evaluateRequirement(fssaiReq, fullRow(fssaiReq, { expires_on: '2020-01-01' }), TODAY)
ok('an expired licence is not satisfied', expired.satisfied === false)
ok('and it says so plainly', /expired/i.test(expired.says ?? ''))
ok('its state is expired, not incomplete', expired.state === DOC_STATE.EXPIRED)

const soon = evaluateRequirement(fssaiReq, fullRow(fssaiReq, { expires_on: '2026-10-05' }), TODAY)
ok('one expiring in under 30 days is still satisfied', soon.satisfied === true)
ok('but is flagged as expiring soon', soon.expiringSoon === true)

ok('completeness is reported before expiry, so the fixable thing comes first',
   evaluateRequirement(fssaiReq,
     fullRow(fssaiReq, { expires_on: '2020-01-01', number_last4: null }), TODAY)
     .state === DOC_STATE.INCOMPLETE)

ok('daysUntil is IST-anchored', daysUntil('2026-09-23', TODAY) === 1)
ok('and negative once past', daysUntil('2026-09-21', TODAY) === -1)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nREJECTED AND VERIFIED\n')

const rejected = evaluateRequirement(fssaiReq,
  fullRow(fssaiReq, { status: 'rejected', review_note: 'The photo is cut off.' }), TODAY)
ok('a rejected document is not satisfied', rejected.satisfied === false)
ok('and the reviewer note is what the partner reads', /cut off/.test(rejected.says))

ok('an operator-accepted document reads as verified',
   evaluateRequirement(fssaiReq, fullRow(fssaiReq, { status: 'accepted' }), TODAY)
     .state === DOC_STATE.VERIFIED)
ok('a provider-verified one does too',
   evaluateRequirement(fssaiReq, fullRow(fssaiReq, { provider_status: 'verified' }), TODAY)
     .state === DOC_STATE.VERIFIED)
ok('an uploaded but unreviewed one is pending, not verified',
   evaluateRequirement(fssaiReq, fullRow(fssaiReq), TODAY).state === DOC_STATE.PENDING)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nSUBMISSION GATE\n')

const cateringReqs = requirementsFor({ trades: ['Catering & Food'] })
ok('with MANDATORY_FROM unset, nothing blocks submission',
   evaluateAll(cateringReqs, {}, TODAY).canSubmit === true)

const enforced = requirementsFor({
  trades: ['Catering & Food'], mandatoryFrom: new Date('2026-01-01'),
})
const nothingUploaded = evaluateAll(enforced, {}, TODAY)
ok('once enforcement is on, a missing mandatory requirement blocks it',
   nothingUploaded.canSubmit === false)
ok('and it counts how many are outstanding',
   nothingUploaded.requiredSatisfied < nothingUploaded.requiredTotal)

const satisfiedAll = Object.fromEntries(
  enforced.filter(r => r.required).map(r => [r.id, fullRow(r)]))
ok('satisfying every mandatory one unblocks it',
   evaluateAll(enforced, satisfiedAll, TODAY).canSubmit === true)

const expiredMandatory = Object.fromEntries(
  enforced.filter(r => r.required).map(r => [r.id, fullRow(r, { expires_on: '2020-01-01' })]))
ok('an EXPIRED mandatory document does not unblock it',
   evaluateAll(enforced, expiredMandatory, TODAY).canSubmit === false)

if (sabotage) {
  ran++
  const s = evaluateAll(both, onlyFssai, TODAY)
  if (s.results['VER-TRADE-PROPERTY'].satisfied === false) {
    bad++
    fails.push('sabotage: expected cross-requirement satisfaction to be broken')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
