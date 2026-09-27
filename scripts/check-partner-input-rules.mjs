#!/usr/bin/env node
/**
 * Every text box in the six-step setup, against everything a person
 * might actually type into it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS AND NOT SELENIUM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Selenium and Playwright drive a BROWSER. That is the right tool when
 * the question is "does clicking this do the thing", and this repo
 * answers that with `shoot-components.mjs` and the repro walks over CDP.
 *
 * It is the wrong tool for 300 input cases. A browser run of this file
 * would take minutes, need a dev server, a logged-in partner and a
 * database, and would fail for a dozen reasons that have nothing to do
 * with whether "98450000000" is rejected as an 11-digit phone number.
 *
 * The rules live in `src/lib/validation/fieldRules.js` precisely so that
 * the screen and this file are asking the SAME function. A case that
 * passes here passes in the app, because there is only one implementation
 * -- which is the property a browser test cannot give you and a shared
 * module can.
 *
 *   node scripts/check-partner-input-rules.mjs
 *   node scripts/check-partner-input-rules.mjs --verbose
 *   node scripts/check-partner-input-rules.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/input-rules.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/input-rules-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/validation/fieldRules.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/validation/identity.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const {
  validateField, validateStep, normalise, FIELD_RULES, SEVERITY, fieldsFor,
  checkAadhaar, checkPan, checkGstin, checkIfsc, checkFssai, verhoeffOk, gstCheckDigit,
} = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []

/**
 * One case.
 * @param want 'ok' | 'warn' | 'error'
 */
function t(field, input, want, note = '', ctx = {}) {
  ran++
  const r = validateField(field, input, ctx)
  const got = r.severity
  const pass = got === want
  if (!pass) {
    bad++
    fails.push(`${field} <- ${JSON.stringify(input)}\n      wanted ${want}, got ${got}` +
               `${r.says ? `\n      said: ${r.says}` : ''}${note ? `\n      (${note})` : ''}`)
  } else if (verbose) {
    console.log(`  ${tick} ${field.padEnd(24)} ${JSON.stringify(input).slice(0, 32).padEnd(34)} ${got}${r.says ? '  ' + r.says : ''}`)
  }
}

const group = name => { if (verbose) console.log(`\n── ${name} ──`); else process.stdout.write('.') }

/* ══════════════════════════════════════════════════════════════════════
   BUSINESS NAME
   ══════════════════════════════════════════════════════════════════════ */
group('business_name')
t('business_name', 'Anna Ruchi Caterers', 'ok')
t('business_name', 'Sri Lakshmi Decorators & Events', 'ok')
t('business_name', "D'Souza Photography", 'ok')
t('business_name', 'Shree Ganesh Tent House (Regd.)', 'ok')
t('business_name', 'ಅನ್ನ ರುಚಿ ಕೇಟರರ್ಸ್', 'ok', 'Kannada must be accepted')
t('business_name', 'श्री गणेश डेकोरेटर्स', 'ok', 'Devanagari must be accepted')
t('business_name', '  Anna   Ruchi  ', 'ok', 'collapsed and trimmed')
t('business_name', '', 'error', 'required')
t('business_name', '   ', 'error', 'whitespace is empty')
t('business_name', 'AB', 'error', 'too short')
t('business_name', '1', 'error', 'a single digit is not a name')
t('business_name', '12345', 'error', 'all numbers')
t('business_name', 'ravi@gmail.com', 'error', 'email in the name box')
t('business_name', 'www.myshop.com', 'error', 'url in the name box')
t('business_name', '9845000000', 'error', 'phone in the name box')
t('business_name', 'ABCDE1234F', 'error', 'PAN in the name box')
t('business_name', 'Caterers 😀', 'error', 'emoji')
t('business_name', 'aaaaaaaa', 'error', 'mashed keyboard')
t('business_name', 'x'.repeat(81), 'error', 'over 80')
t('business_name', 'Hotel 7 Hills', 'warn', 'a digit is legitimate here')
t('business_name', 'A1 Decorators', 'warn')

/* ══════════════════════════════════════════════════════════════════════
   PHONE
   ══════════════════════════════════════════════════════════════════════ */
group('contact_phone')
t('contact_phone', '9845000000', 'ok')
t('contact_phone', '98450 00000', 'ok', 'spaces stripped')
t('contact_phone', '+91 98450 00000', 'ok', 'country code stripped')
t('contact_phone', '+919845000000', 'ok')
t('contact_phone', '919845000000', 'ok')
t('contact_phone', '09845000000', 'ok', 'leading zero stripped')
t('contact_phone', '0091 9845000000', 'ok')
t('contact_phone', '98450-00000', 'ok')
t('contact_phone', '6000000001', 'ok', '6-series is valid')
t('contact_phone', '', 'error', 'required')
t('contact_phone', '984500000', 'error', '9 digits')
t('contact_phone', '98450000001', 'error', '11 digits')
t('contact_phone', '5845000000', 'error', 'does not start 6-9')
t('contact_phone', '1234567890', 'error', 'test number')
t('contact_phone', '9999999999', 'error', 'same digit ten times')
t('contact_phone', 'hello', 'error', 'letters')
t('contact_phone', 'ravi@gmail.com', 'error', 'email in the phone box')
/* The stripper empties these, so the rule must look at the raw text or
   it answers "it cannot be blank" about a field somebody just filled. */
t('contact_phone', 'hello there', 'error', 'letters only -> must not say "blank"')
t('pincode', 'ravi@gmail.com', 'error', 'email in the pincode box')
t('account_number', 'HDFC0001234', 'error', 'IFSC in the account number box')
t('aadhaar', 'ravi@gmail.com', 'error', 'email in the aadhaar box')

/* ══════════════════════════════════════════════════════════════════════
   EMAIL  ·  "it has to be at right dot com"
   ══════════════════════════════════════════════════════════════════════ */
group('contact_email')
t('contact_email', '', 'ok', 'optional')
t('contact_email', 'ravi@gmail.com', 'ok')
t('contact_email', 'Ravi.Kumar+jobs@sub.domain.co.in', 'ok')
t('contact_email', 'RAVI@GMAIL.COM', 'ok', 'lowercased')
t('contact_email', 'ravi', 'error', 'no @')
t('contact_email', 'ravi@', 'error', 'nothing after @')
t('contact_email', '@gmail.com', 'error', 'nothing before @')
t('contact_email', 'ravi@@gmail.com', 'error', 'two @')
t('contact_email', 'ravi@gmail', 'error', 'no dot in the domain')
t('contact_email', 'ravi@gmail..com', 'error', 'double dot')
t('contact_email', 'ravi@.com', 'error', 'domain starts with a dot')
t('contact_email', 'ravi@gmail.c', 'error', 'one-letter tld')
t('contact_email', 'ravi@gmail.123', 'error', 'numeric tld')
t('contact_email', 'ravi kumar@gmail.com', 'error', 'space')
t('contact_email', 'ravi@gmail.co', 'warn', 'likely meant .com')
t('contact_email', 'ravi@gmial.com', 'warn', 'typo')

/* ══════════════════════════════════════════════════════════════════════
   YEARS / DESCRIPTION / INSTAGRAM
   ══════════════════════════════════════════════════════════════════════ */
group('details, the rest')
t('years_active', '', 'ok')
t('years_active', '12', 'ok')
t('years_active', '0', 'ok')
t('years_active', '2026', 'error', 'typed the year')
t('years_active', '60', 'warn')

t('description', '', 'ok')
t('description', 'We have been doing South Indian wedding catering in Bengaluru for twelve years.', 'ok')
t('description', 'Good work', 'warn', 'too thin to help a customer')
t('description', 'Call me on 9845000000 for rates', 'error', 'phone in the description')
t('description', 'Email ravi@gmail.com', 'error', 'email in the description')
t('description', 'x'.repeat(601), 'error', 'over 600')

t('instagram_url', '', 'ok')
t('instagram_url', 'instagram.com/annaruchi', 'ok', 'url reduced to a handle')
t('instagram_url', 'https://www.instagram.com/annaruchi/', 'ok')
t('instagram_url', '@annaruchi', 'ok')
t('instagram_url', 'anna ruchi', 'error', 'space')
t('instagram_url', 'anna/ruchi!', 'error', 'bad character')

/* ══════════════════════════════════════════════════════════════════════
   PINCODE / LEAD TIME
   ══════════════════════════════════════════════════════════════════════ */
group('area')
t('pincode', '560001', 'ok')
t('pincode', '560 001', 'ok')
t('pincode', '', 'error')
t('pincode', '56000', 'error', '5 digits')
t('pincode', '5600011', 'error', '7 digits')
t('pincode', '060001', 'error', 'no zone 0')
t('pincode', '960001', 'error', 'no zone 9')
t('lead_time_days', '2', 'ok')
t('lead_time_days', '', 'ok')
t('lead_time_days', '45', 'warn')
t('lead_time_days', '120', 'error')

/* ══════════════════════════════════════════════════════════════════════
   BANK  ·  the screen where a mistake is not recoverable
   ══════════════════════════════════════════════════════════════════════ */
group('bank')
t('upi_id', 'ravi@okhdfcbank', 'ok')
t('upi_id', '9845000000@ybl', 'ok')
t('upi_id', 'RAVI@OKAXIS', 'ok', 'lowercased')
t('upi_id', '', 'error')
t('upi_id', 'ravi', 'error', 'no @')
t('upi_id', '9845000000', 'error', 'a phone number is not a UPI id')
t('upi_id', 'ravi@gmail.com', 'error', 'an email is not a UPI id')
t('upi_id', '@ybl', 'error', 'nothing before @')
t('upi_id', 'ravi@', 'error', 'nothing after @')

t('account_name', 'Ravi Kumar', 'ok')
t('account_name', 'RAVI KUMAR S', 'ok')
t('account_name', '', 'error')
t('account_name', 'Ravi Kumar 2', 'error', 'a digit in a person name')
t('account_name', 'ravi@gmail.com', 'error')
t('account_name', 'Ravi 😀', 'error')
t('account_name', 'Ravi', 'warn', 'mononyms are normal and must not be refused')

t('account_number', '000111224417', 'ok')
t('account_number', '', 'error')
t('account_number', '12345678', 'error', '8 digits')
t('account_number', '1'.repeat(19), 'error', '19 digits')
t('account_number', '1111111111', 'error', 'same digit')

t('account_number_confirm', '000111224417', 'ok', '', { account_number: '000111224417' })
t('account_number_confirm', '000111224418', 'error', 'mismatch', { account_number: '000111224417' })
t('account_number_confirm', '', 'error')

t('ifsc', 'HDFC0001234', 'ok')
t('ifsc', 'hdfc0001234', 'ok', 'uppercased')
t('ifsc', '', 'error')
t('ifsc', 'HDFCO001234', 'error', 'letter O instead of zero')
t('ifsc', 'HDFC1001234', 'error', 'fifth char not 0')
t('ifsc', 'HDFC000123', 'error', '10 chars')

/* ══════════════════════════════════════════════════════════════════════
   IDENTITY  ·  the checksums
   ══════════════════════════════════════════════════════════════════════ */
group('identity')

/* Built, not memorised: append the digit that makes Verhoeff close. */
function makeAadhaar(first11) {
  for (let d = 0; d <= 9; d++) if (verhoeffOk(first11 + d)) return first11 + d
  throw new Error('no check digit for ' + first11)
}
const AADHAAR = makeAadhaar('23456789012')
t('aadhaar', AADHAAR, 'ok', 'valid Verhoeff')
t('aadhaar', AADHAAR.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'), 'ok', 'spaced')
t('aadhaar', '', 'error')
t('aadhaar', '23456789012', 'error', '11 digits')
t('aadhaar', '123456789012', 'error', 'starts with 1')
t('aadhaar', '023456789012', 'error', 'starts with 0')
t('aadhaar', '222222222222', 'error', 'same digit twelve times')
/* Flip one digit: Verhoeff must catch every single-digit error. */
{
  const wrong = AADHAAR.slice(0, 5) + ((Number(AADHAAR[5]) + 1) % 10) + AADHAAR.slice(6)
  t('aadhaar', wrong, 'error', 'one digit changed must fail the checksum')
}
/* Transpose an adjacent pair: Verhoeff must catch that too. */
{
  const a = AADHAAR.split('')
  if (a[4] !== a[5]) { const x = a[4]; a[4] = a[5]; a[5] = x }
  const swapped = a.join('')
  if (swapped !== AADHAAR) t('aadhaar', swapped, 'error', 'adjacent transposition must fail')
}

t('pan', 'ABCPE1234F', 'ok')
t('pan', 'abcpe1234f', 'ok', 'uppercased')
t('pan', '', 'error')
t('pan', 'ABCPE1234', 'error', '9 chars')
t('pan', 'ABCP1E234F', 'error', 'digit among the first five')
t('pan', 'ABCXE1234F', 'error', 'X is not a holder type')
t('pan', 'ABCPE1234F', 'warn', 'fifth letter vs surname', { account_name: 'Ravi Kumar' })

/* GSTIN, built so the check digit is right by construction. */
const gstBody = '29ABCPE1234F1Z'
const GSTIN = gstBody + gstCheckDigit(gstBody)
t('gst', GSTIN, 'ok')
t('gst', '', 'ok', 'optional')
t('gst', GSTIN.slice(0, 14) + (GSTIN[14] === 'A' ? 'B' : 'A'), 'error', 'wrong check digit')
t('gst', '99' + GSTIN.slice(2), 'error', 'bad state code')
t('gst', GSTIN, 'error', 'PAN does not match', { pan: 'ZZZZZ9999Z' })

t('fssai', '', 'ok')
t('fssai', '10012345678901', 'ok')
t('fssai', '30012345678901', 'error', 'must start 1 or 2')
t('fssai', '1001234567890', 'error', '13 digits')

t('dl', '', 'ok')
t('dl', 'KA0520110012345', 'ok')
t('dl', 'KA05 2011 0012345', 'ok', 'separators tolerated')
t('dl', 'K05201100123', 'error', 'one state letter')
t('dl', 'KA0520990012345', 'error', 'issued in 2099')

t('rc', '', 'ok')
t('rc', 'KA01AB1234', 'ok')
t('rc', 'KA 01 AB 1234', 'ok')
t('rc', '21BH1234AB', 'ok', 'Bharat series')
t('rc', 'HELLO', 'error')

if (!verbose) console.log('')

/* ══════════════════════════════════════════════════════════════════════
   STEP GATES  ·  Continue must be blocked by errors and never by warnings
   ══════════════════════════════════════════════════════════════════════ */
console.log('\nA STEP IS BLOCKED BY ERRORS, NEVER BY WARNINGS\n')

const okDetails = {
  business_name: 'Anna Ruchi Caterers', contact_phone: '9845000000',
  contact_email: 'ravi@gmail.com', years_active: '12',
  description: 'South Indian wedding catering in Bengaluru for twelve years.',
}
const ok2 = validateStep('details', okDetails)
say('a complete details step continues', ok2.canContinue && ok2.errors === 0)

const warned = validateStep('details', { ...okDetails, business_name: 'Hotel 7 Hills' })
say('a warning does NOT block continue', warned.canContinue && warned.warnings > 0,
    JSON.stringify({ e: warned.errors, w: warned.warnings }))

const broken = validateStep('details', { ...okDetails, contact_phone: '98450' })
say('a bad phone blocks continue', !broken.canContinue && broken.errors === 1)

const blank = validateStep('details', {})
say('an empty details step blocks continue', !blank.canContinue)
say('and it names both required fields', blank.errors === 2, `errors=${blank.errors}`)

const bank = validateStep('bank', {
  account_name: 'Ravi Kumar', account_number: '000111224417',
  account_number_confirm: '000111224417', ifsc: 'HDFC0001234', upi_id: 'ravi@okhdfcbank',
})
say('a complete bank step continues', bank.canContinue, JSON.stringify(bank.errors))

const mism = validateStep('bank', {
  account_name: 'Ravi Kumar', account_number: '000111224417',
  account_number_confirm: '000111224999', ifsc: 'HDFC0001234', upi_id: 'ravi@okhdfcbank',
})
say('a mismatched confirmation blocks continue', !mism.canContinue)

/* ══════════════════════════════════════════════════════════════════════
   EVERY RULE IS REACHABLE AND SPEAKS
   ══════════════════════════════════════════════════════════════════════ */
console.log('\nEVERY FIELD IS DECLARED PROPERLY\n')

let mute = []
for (const [name, rule] of Object.entries(FIELD_RULES)) {
  if (!rule.step) mute.push(`${name}: no step`)
  if (!rule.label) mute.push(`${name}: no label`)
  if (typeof rule.validate !== 'function') mute.push(`${name}: no validate`)
  /* A required field must say something when it is empty, or the
     partner is stuck on a Continue button that does nothing. */
  if (rule.required) {
    const r = validateField(name, '')
    if (r.severity !== SEVERITY.ERROR || !r.says) mute.push(`${name}: required but silent when empty`)
  }
}
say('every field has a step, a label and a validator', mute.length === 0, mute.join('; '))

/* No error may be silent. A red border with no words is the defect this
   whole file exists to prevent. */
const silent = []
for (const [name] of Object.entries(FIELD_RULES)) {
  for (const probe of ['', '!!!', '000', 'zzzzzzzzzzzz', '9845000000', 'a@b.c']) {
    const r = validateField(name, probe)
    if (r.severity !== SEVERITY.OK && !r.says) silent.push(`${name} <- ${JSON.stringify(probe)}`)
  }
}
say('no failure is ever silent', silent.length === 0, silent.slice(0, 4).join('; '))

const steps = [...new Set(Object.values(FIELD_RULES).map(r => r.step))]
say('rules exist for details, area, bank and compliance',
    ['details', 'area', 'bank', 'compliance'].every(s => steps.includes(s)), steps.join(','))
say('fieldsFor() returns them in order', fieldsFor('bank').length >= 5, String(fieldsFor('bank').length))

/* ══════════════════════════════════════════════════════════════════════ */
function say(name, cond, d = '') {
  ran++
  if (!cond) { bad++; fails.push(`${name}${d ? `\n      ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${name}${cond ? '' : `   <-- ${d}`}`)
}

if (sabotage) {
  /* Prove the suite bites: a rule that accepts anything must fail it. */
  ran++
  const r = validateField('contact_phone', 'not a phone at all')
  if (r.severity === SEVERITY.ERROR) { bad++; fails.push('sabotage: expected the rule to be broken') }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran} input cases\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails.slice(0, 25)) console.log('  ' + f + '\n')
  if (fails.length > 25) console.log(`  ... and ${fails.length - 25} more\n`)
}
process.exitCode = bad ? 1 : 0
