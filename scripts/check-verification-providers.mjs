#!/usr/bin/env node
/**
 * The provider seam, and the promise it has to keep.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ASSERTION THAT MATTERS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   With no provider configured, nothing anywhere reads "verified".
 *
 * Sambramo has no contract with a KYC provider. A screen that said
 * "Identity verified" on the strength of a checksum would be the same
 * class of lie as a fake payout confirmation — and this codebase has
 * been careful about that everywhere else, so it gets a guard here.
 *
 * Also asserted: `unavailable` never means invalid, a throwing provider
 * degrades instead of exploding, and the mock is deterministic.
 *
 *   node scripts/check-verification-providers.mjs
 *   node scripts/check-verification-providers.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/verify-providers.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/verify-providers-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/providers/index.js'))}`,
  `export { MockProvider, TEST_IDENTITIES, scenarioFor } from ${JSON.stringify(join(ROOT, 'src/lib/verification/providers/mock.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const {
  VerificationService, NullProvider, MockProvider, PROVIDER_STATUS,
  resolveProvider, providerColumns, TEST_IDENTITIES, scenarioFor, notChecked,
} = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const METHODS = ['verifyIdentity', 'verifyBusiness', 'readDocument', 'matchFace', 'verifyBankAccount']

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nWITH NO PROVIDER, NOTHING IS VERIFIED\n')

const bare = new VerificationService(NullProvider)
ok('the service reports itself unconfigured', bare.configured === false)

for (const m of METHODS) {
  const r = await bare[m]({ holderName: 'TEST_IDENTITY_VALID', number: '1234' })
  ok(`${m} returns not_checked`, r.providerStatus === PROVIDER_STATUS.NOT_CHECKED,
     r.providerStatus)
  ok(`${m} never claims verified`, r.providerStatus !== PROVIDER_STATUS.VERIFIED)
  ok(`${m} says why`, typeof r.says === 'string' && r.says.length > 10)
}

ok('an unknown provider name resolves to the null provider',
   resolveProvider('signzy') === NullProvider)
ok('an empty name does too', resolveProvider('') === NullProvider)
ok('and "mock" resolves only when asked for by name',
   resolveProvider('mock') === MockProvider)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA PROVIDER THAT THROWS DEGRADES, IT DOES NOT EXPLODE\n')

const exploding = {
  name: 'exploding',
  async verifyIdentity() { throw new Error('socket hang up') },
}
const brittle = new VerificationService(exploding)
const thrown = await brittle.verifyIdentity({ number: '1' })
ok('a thrown error becomes unavailable',
   thrown.providerStatus === PROVIDER_STATUS.UNAVAILABLE, thrown.providerStatus)
ok('UNAVAILABLE IS NOT INVALID — the wording never blames the document',
   !/invalid|wrong|incorrect|fake/i.test(thrown.says), thrown.says)
ok('and it tells the partner what happens next', /review/i.test(thrown.says))
ok('the underlying error is kept for an operator', /socket hang up/.test(thrown.error ?? ''))

/* A provider covering only some methods must not crash on the others. */
const partial = new VerificationService({ name: 'partial', async verifyIdentity() { return notChecked() } })
const uncovered = await partial.verifyBankAccount({})
ok('a method the provider does not implement is not_checked',
   uncovered.providerStatus === PROVIDER_STATUS.NOT_CHECKED)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE MOCK IS DETERMINISTIC\n')

const mock = new VerificationService(MockProvider)

const twice = [
  await mock.verifyIdentity({ holderName: 'Ravi Kumar', number: '999' }),
  await mock.verifyIdentity({ holderName: 'Ravi Kumar', number: '999' }),
]
ok('the same input gives the same status', twice[0].providerStatus === twice[1].providerStatus)
ok('and the same reference', twice[0].reference === twice[1].reference, twice.map(t => t.reference).join(' vs '))
ok('a different input gives a different reference',
   (await mock.verifyIdentity({ holderName: 'Ravi Kumar', number: '111' })).reference !== twice[0].reference)

ok('an ordinary name takes the happy path',
   twice[0].providerStatus === PROVIDER_STATUS.VERIFIED)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY NAMED TEST IDENTITY BEHAVES\n')

const named = {
  TEST_IDENTITY_VALID: PROVIDER_STATUS.VERIFIED,
  TEST_IDENTITY_MISMATCH: PROVIDER_STATUS.MISMATCH,
  TEST_DOCUMENT_EXPIRED: PROVIDER_STATUS.NOT_FOUND,
  TEST_PROVIDER_TIMEOUT: PROVIDER_STATUS.UNAVAILABLE,
  TEST_MANUAL_REVIEW: PROVIDER_STATUS.PENDING,
}
for (const [name, want] of Object.entries(named)) {
  const r = await mock.verifyIdentity({ holderName: name })
  ok(`${name} -> ${want}`, r.providerStatus === want, r.providerStatus)
}

ok('all seven scenarios are declared', Object.keys(TEST_IDENTITIES).length === 7)
ok('the trigger tolerates spacing and case',
   scenarioFor({ holderName: 'test identity mismatch' }) === 'mismatch')

/* A blurry photo is a DOCUMENT problem, not an identity verdict. */
const blurry = await mock.verifyIdentity({ holderName: 'TEST_DOCUMENT_BLURRY' })
ok('a blurry photo does not produce an identity verdict',
   blurry.providerStatus === PROVIDER_STATUS.NOT_CHECKED, blurry.providerStatus)
ok('and it blames the photo, not the number',
   /photo|read/i.test(blurry.says) && !/number is (wrong|invalid)/i.test(blurry.says))

const face = await mock.matchFace({ holderName: 'TEST_FACE_MISMATCH' })
ok('TEST_FACE_MISMATCH mismatches', face.providerStatus === PROVIDER_STATUS.MISMATCH)
ok('and says what to do about it', /lighting|try again/i.test(face.says))
ok('with a confidence a reviewer can weigh', typeof face.confidence === 'number')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nOCR EXTRACTS, IT DOES NOT JUDGE\n')

const read = await mock.readDocument({ holderName: 'Ravi Kumar', number: 'ABCPE1234F' })
ok('a successful read returns fields', !!read.fields)
ok('it echoes rather than inventing a name', read.fields.name === 'Ravi Kumar')
ok('and carries a confidence', read.confidence > 0.5)

const unreadable = await mock.readDocument({ holderName: 'TEST_DOCUMENT_BLURRY' })
ok('an unreadable photo errors', unreadable.providerStatus === PROVIDER_STATUS.ERROR)
ok('with no fields invented', unreadable.fields === null)
ok('and it asks for a clearer photo', /clearer/i.test(unreadable.says))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE COLUMNS WRITTEN MATCH MIGRATION 142\n')

const cols = providerColumns(await mock.verifyIdentity({ holderName: 'Ravi Kumar' }))
ok('provider_status is written', cols.provider_status === PROVIDER_STATUS.VERIFIED)
ok('provider_name is written', cols.provider_name === 'mock')
ok('provider_ref is written', typeof cols.provider_ref === 'string')
ok('provider_at is stamped', typeof cols.provider_at === 'string')
ok('checksum_ok is NOT touched — it is the offline tier, and write-once',
   !('checksum_ok' in cols))

const noneCols = providerColumns(await bare.verifyIdentity({}))
ok('an unconfigured answer stamps no time', noneCols.provider_at === null)
ok('and records not_checked', noneCols.provider_status === PROVIDER_STATUS.NOT_CHECKED)

/* Every status the mock can emit must be one 142's CHECK accepts. */
const mig = readdirSync(join(ROOT, 'supabase/migrations')).find(f => f.startsWith('142_'))
const sql = readFileSync(join(ROOT, 'supabase/migrations', mig), 'utf8')
/* Read to the closing paren of the CHECK, not a fixed number of
   characters. The first version took 500 chars, which the inline
   comments in 142 pushed past -- so it reported 'error' as forbidden
   when the migration plainly allows it. A guard that truncates its own
   evidence produces a confident wrong answer. */
const from = sql.indexOf('vendor_documents_provider_status_allowed')
const block = sql.slice(from, sql.indexOf('));', from))
const allowed = [...block.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
const emitted = Object.values(PROVIDER_STATUS)
const rogue = emitted.filter(s => !allowed.includes(s))
ok('every provider status is one the database accepts', rogue.length === 0,
   `${rogue.join(',')} — allowed: ${allowed.join(',')}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNOTHING OVERSTATES\n')

const everySays = []
for (const m of METHODS) {
  for (const n of Object.keys(TEST_IDENTITIES)) {
    const r = await mock[m]({ holderName: n })
    if (r?.says) everySays.push([m, n, r.says, r.providerStatus])
  }
}
ok('no message says "government"', !everySays.some(([, , s]) => /government/i.test(s)))
ok('no unavailable or not_checked message claims verification',
   !everySays.some(([, , s, st]) =>
     (st === PROVIDER_STATUS.UNAVAILABLE || st === PROVIDER_STATUS.NOT_CHECKED)
     && /\bverified\b/i.test(s)))
ok('every scenario produces a sentence', everySays.length >= 25, String(everySays.length))

if (sabotage) {
  ran++
  const r = await bare.verifyIdentity({ holderName: 'TEST_IDENTITY_VALID' })
  if (r.providerStatus === PROVIDER_STATUS.NOT_CHECKED) {
    bad++
    fails.push('sabotage: expected the unconfigured provider to wrongly verify')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
