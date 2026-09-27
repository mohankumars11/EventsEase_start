#!/usr/bin/env node
/**
 * The risk engine, and the line it must not cross.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEVER AN AUTOMATIC BAN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every signal here has an innocent explanation and several are COMMON —
 * a household sharing one bank account, a shared family handset,
 * somebody who forgot they had already signed up. A system that
 * suspended on any of them would be suspending real partners weekly.
 *
 * So the only automatic consequence permitted is MANUAL_REVIEW, and
 * that is asserted rather than trusted.
 *
 *   node scripts/check-risk-engine.mjs
 *   node scripts/check-risk-engine.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/risk-engine.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/risk-engine-entry.mjs')
writeFileSync(ENTRY,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/risk.js'))}\n`)
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { assessRisk, collectSignals, scoreRisk, explainRisk, SIGNALS, RISK } = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA CLEAN APPLICATION IS LOW RISK\n')

const clean = assessRisk({
  enteredName: 'Rajesh Kumar', documentName: 'Rajesh Kumar',
  dateOfBirth: '1990-04-12',
})
ok('nothing suspicious scores LOW', clean.band === RISK.LOW, JSON.stringify(clean.score))
ok('and raises no signals', clean.signals.length === 0)
ok('and does not go to manual review', clean.requiresManualReview === false)
ok('and says nothing to the partner', clean.says === null)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONE WEAK SIGNAL NEVER REACHES HIGH\n')

const weak = [
  ['a shared phone', { sharedPhoneAccounts: 1 }],
  ['one expired document', { expiredDocuments: 1 }],
  ['a business trading name', { businessName: 'Anna Ruchi', registeredName: 'Suresh Foods Pvt Ltd' }],
]
for (const [label, facts] of weak) {
  const r = assessRisk(facts)
  ok(`${label} does not reach HIGH`, r.band !== RISK.HIGH, `${r.band} (${r.score})`)
  ok(`${label} does not force manual review`, r.requiresManualReview === false)
}

const ocr = assessRisk({
  enteredFields: { number: 'ABCPE1234F' },
  ocrFields: { number: 'ABCPE1234X' },
})
ok('OCR disagreeing alone does not reach HIGH', ocr.band !== RISK.HIGH, `${ocr.band} (${ocr.score})`)
ok('because a misread photo is likelier than a forgery',
   SIGNALS.OCR_DISAGREES.weight < SIGNALS.DUPLICATE_DOCUMENT.weight)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONE STRONG SIGNAL DOES\n')

const dup = assessRisk({ duplicateDocumentAccounts: 1 })
ok('a duplicate document number reaches HIGH', dup.band === RISK.HIGH, `${dup.band} (${dup.score})`)
ok('and goes to manual review', dup.requiresManualReview === true)

const dob = assessRisk({ dateOfBirth: '2019-01-01' })
ok('a 6-year-old partner reaches HIGH', dob.band === RISK.HIGH, `${dob.band} (${dob.score})`)
ok('and the signal names the age', /years old/.test(dob.signals[0]?.detail ?? ''))

const old = assessRisk({ dateOfBirth: '1890-01-01' })
ok('a 135-year-old partner does too', old.band === RISK.HIGH)

const adult = assessRisk({ dateOfBirth: '1990-04-12' })
ok('an ordinary adult raises nothing', adult.signals.length === 0)

const nameMismatch = assessRisk({ enteredName: 'Rajesh Kumar', documentName: 'Ramesh Kumar' })
ok('a name mismatch reaches HIGH', nameMismatch.band === RISK.HIGH, `${nameMismatch.score}`)

const nameOk = assessRisk({ enteredName: 'Rajesh Kumar', documentName: 'Rajesh K.' })
ok('but a partial name match raises nothing',
   nameOk.signals.length === 0, JSON.stringify(nameOk.signals.map(s => s.key)))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nWEAK SIGNALS ADD UP\n')

const several = assessRisk({
  sharedPhoneAccounts: 1, sharedBankAccounts: 1, expiredDocuments: 1,
})
ok('three weak signals together reach HIGH', several.band === RISK.HIGH, `${several.score}`)
ok('and all three are listed', several.signals.length === 3)

const two = assessRisk({ sharedPhoneAccounts: 1, expiredDocuments: 1 })
ok('two weak ones sit at MEDIUM', two.band === RISK.MEDIUM, `${two.band} (${two.score})`)
ok('and MEDIUM does not force review', two.requiresManualReview === false)

const failures = assessRisk({ failedAttempts: 3 })
ok('three failed attempts is a signal', failures.signals.length === 1)
ok('but two is not', assessRisk({ failedAttempts: 2 }).signals.length === 0)

ok('three signups in a day is a signal', assessRisk({ accountsFromDeviceLast24h: 3 }).signals.length === 1)
ok('but two is not', assessRisk({ accountsFromDeviceLast24h: 2 }).signals.length === 0)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE ONLY CONSEQUENCE IS A PERSON LOOKING\n')

const worst = assessRisk({
  duplicateDocumentAccounts: 3, sharedBankAccounts: 2, sharedPhoneAccounts: 2,
  enteredName: 'Rajesh Kumar', documentName: 'Priya Sharma',
  dateOfBirth: '2020-01-01', expiredDocuments: 2, failedAttempts: 9,
  accountsFromDeviceLast24h: 8,
})
ok('the worst possible case is still only HIGH', worst.band === RISK.HIGH)
ok('it asks for review', worst.requiresManualReview === true)
ok('it has no ban, block or suspend field',
   !('banned' in worst) && !('blocked' in worst) && !('suspended' in worst),
   Object.keys(worst).join(','))
ok('and what it says to the partner is not an accusation',
   !/fraud|suspicious|fake|banned/i.test(worst.says ?? ''), worst.says ?? '')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY SIGNAL CARRIES ITS INNOCENT EXPLANATION\n')

ok('every declared signal has a weight, a label and an innocent reading',
   Object.values(SIGNALS).every(s => s.weight > 0 && s.label && s.innocent),
   Object.entries(SIGNALS).filter(([, s]) => !s.innocent).map(([k]) => k).join(','))

const explained = explainRisk(worst)
ok('the operator view carries them through',
   explained.every(e => e.innocent && e.label))
ok('so a queue never lists a suspicion without its ordinary explanation',
   explained.length === worst.signals.length)

ok('no label accuses the partner',
   Object.values(SIGNALS).every(s => !/fraud|criminal|liar|fake/i.test(s.label)))

if (sabotage) {
  ran++
  if (assessRisk({ sharedPhoneAccounts: 1 }).band !== RISK.HIGH) {
    bad++
    fails.push('sabotage: expected a single weak signal to wrongly reach HIGH')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
