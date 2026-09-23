#!/usr/bin/env node
/**
 * Does the app refuse a photograph of a laptop, and does it still
 * refuse to call anything "verified"?
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO FAILURES, PULLING IN OPPOSITE DIRECTIONS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first is the one this feature was built for: any sharp, well-lit
 * image passed every check, because every check was about the pixels and
 * none was about the subject. A laptop uploaded as an Aadhaar card was
 * accepted in silence.
 *
 * The second is the one this feature could easily CAUSE. Now that
 * something reads the card, it is one careless sentence from telling a
 * partner they are "verified" -- and a customer is deciding whether to
 * let this person into their home on the strength of that word. Reading
 * a card with a camera proves nothing about whether it is real. A forged
 * Aadhaar photographs exactly like a genuine one.
 *
 * So half of this file tests that documents are checked, and half tests
 * that the checking never overclaims.
 *
 *   node scripts/check-document-classify.mjs
 *   node scripts/check-document-classify.mjs --sabotage
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

const { judgeReading, CONFIDENT_ENOUGH, policyFrom, requirementsFor, verificationLabel } =
  await loadSrc({
    'src/lib/verification/providers/vision.js': ['judgeReading', 'CONFIDENT_ENOUGH'],
    'src/lib/verification/policy.js': ['policyFrom'],
    'src/lib/verification/requirements.js': ['requirementsFor'],
    'src/lib/verification/documentTypes.js': ['verificationLabel'],
  })

const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const read = rel => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null)
const strip = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*(--|\/\/).*$/gm, '')

const AADHAAR = { id: 'VER-ID-IDENTITY', label: 'Aadhaar', detectAs: ['aadhaar'], holderNameRequired: true }
const FSSAI = { id: 'VER-TRADE-FSSAI', label: 'FSSAI licence', detectAs: ['fssai_licence'] }
const NOC = { id: 'VER-TRADE-FIRE', label: 'Fire NOC' }   // no detectAs on purpose

const reading = o => ({ providerStatus: 'checked', isDocument: true, legible: true, confidence: 0.9, ...o })

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA LAPTOP IS NOT AN AADHAAR CARD\n')

const laptop = judgeReading(
  reading({ documentType: 'not_a_document', isDocument: false, whatYouSee: 'a laptop on a desk' }),
  AADHAAR)

ok('a photo of a laptop is refused', laptop.ok === false)
ok('and the refusal is fatal, so nothing is uploaded', laptop.fatal === true)
ok('and it NAMES what it saw',
   /laptop/i.test(laptop.says),
   `"Invalid document" teaches nobody anything — got: ${laptop.says}`)
ok('and it says what to do next',
   /photograph the document/i.test(laptop.says), laptop.says)

const wrongDoc = judgeReading(reading({ documentType: 'pan' }), AADHAAR)
ok('a PAN card filed as Aadhaar is refused', wrongDoc.ok === false && wrongDoc.fatal === true)
ok('and it names the document it actually is',
   /PAN card/i.test(wrongDoc.says), wrongDoc.says)

const unreadable = judgeReading(reading({ documentType: 'aadhaar', legible: false }), AADHAAR)
ok('an illegible photo is refused', unreadable.fatal === true)
ok('and it asks for better light rather than blaming the document',
   /light|frame/i.test(unreadable.says), unreadable.says)

const right = judgeReading(reading({ documentType: 'aadhaar' }), AADHAAR)
ok('the right document passes', right.ok === true && right.fatal === false)

/* ---- The EXPECTED document is named properly too ------------------
   A screenshot caught "not aadhaar" and "not fssai licence": the code
   was lowercasing the requirement's label, so every refusal read like a
   machine complaining. The guard had not noticed because it only ever
   matched on the DETECTED name. These check the other half. */
const wrongWay = judgeReading(reading({ documentType: 'pan' }), AADHAAR)
ok('the expected document gets an article',
   /not an Aadhaar card/.test(wrongWay.says), wrongWay.says)
ok('and it is not lowercased',
   !/ aadhaar|fssai licence|pan card,/.test(wrongWay.says), wrongWay.says)
ok('the success line reads as a sentence',
   /That is an Aadhaar card/.test(right.says), right.says)
ok('so does the illegible one',
   /read an Aadhaar card in that photo/.test(unreadable.says), unreadable.says)

/* Every sentence any requirement can produce, swept for the same
   fault. A bare lowercase document word is the tell. */
const SWEEP = ['aadhaar', 'pan', 'gst_certificate', 'fssai_licence', 'driving_licence', 'vehicle_rc']
for (const want of SWEEP) {
  const req = { id: 'X', label: want, detectAs: [want] }
  const out = judgeReading(reading({ documentType: 'not_a_document', isDocument: false, whatYouSee: 'a wall' }), req)
  ok(`"${want}" is named in words, not as an id`,
     !out.says.includes(want) || want === 'pan',
     out.says)
}

const fssai = judgeReading(reading({ documentType: 'fssai_licence' }), FSSAI)
ok('an FSSAI licence passes as an FSSAI licence', fssai.ok === true)
ok('an Aadhaar filed as FSSAI is refused',
   judgeReading(reading({ documentType: 'aadhaar' }), FSSAI).fatal === true)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nUNCERTAINTY IS NOT AN ACCUSATION\n')

const unsure = judgeReading(
  reading({ documentType: 'aadhaar', confidence: CONFIDENT_ENOUGH - 0.2 }), AADHAAR)
ok('a low-confidence reading does NOT refuse', unsure.fatal === false,
   'a laminated card photographed at an angle in a kitchen is a hard image')
ok('it says a person will check it', /person will check/i.test(unsure.says), unsure.says)
ok('and it is marked uncertain rather than passing silently', unsure.uncertain === true)

const noDetect = judgeReading(reading({ documentType: 'other_document' }), NOC)
ok('a requirement with no declared type is never refused on content',
   noDetect.fatal === false,
   'a fire NOC is a municipal letter and looks different in every district')
ok('and it asserts nothing about it', noDetect.says === null)

for (const status of ['unavailable', 'not_checked']) {
  const out = judgeReading({ providerStatus: status, says: 'A person will look at this.' }, AADHAAR)
  ok(`"${status}" never refuses the document`, out.fatal === false,
     'an outage on our side must not read as the partner being wrong')
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNOTHING SAYS VERIFIED\n')

const says = [laptop, wrongDoc, unreadable, right, fssai, unsure, noDetect]
  .map(j => j.says).filter(Boolean)

ok('no message claims the document is verified',
   !says.some(t => /\bverified\b/i.test(t)),
   says.find(t => /\bverified\b/i.test(t)) ?? '')
ok('no message claims a government check',
   !says.some(t => /government|UIDAI|NSDL|GSTN|Parivahan|authentic/i.test(t)))
ok('the successful one says it was READ, nothing more',
   /read successfully/i.test(right.says), right.says)

const endpoint = read('api/verify-document.js')
const provider = read('src/lib/verification/providers/vision.js')
ok('the endpoint exists', !!endpoint)
ok('the provider exists', !!provider)

ok('the provider never returns the verified status',
   !/providerStatus: *['"]verified['"]/.test(strip(provider)),
   'every screen downstream believes that word')
ok('nor does the endpoint',
   !/providerStatus: *['"]verified['"]/.test(strip(endpoint)))

/* The three that need a licensed provider must still be unimplemented
   here, so they fall through to NullProvider's honest not_checked. */
for (const method of ['verifyIdentity', 'verifyBusiness', 'verifyBankAccount']) {
  ok(`the vision provider does not implement ${method}`,
     !new RegExp(`\\b${method}\\s*[(:]`).test(strip(provider)),
     'answering that truthfully means asking UIDAI, GSTN or a bank')
}

ok('verificationLabel still refuses to say Government Verified',
   !/Government Verified/i.test(
     [verificationLabel({ status: 'accepted', providerStatus: 'verified', checksumOk: true, documentType: 'aadhaar' }),
      verificationLabel({ status: 'pending', providerStatus: 'not_checked', checksumOk: true })]
       .map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ')))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE PARTNER CANNOT WRITE THE VERDICT\n')

const capture = strip(read('src/components/partner/DocumentCapture.jsx'))
const m148 = read('supabase/migrations/148_a_calendar_that_runs_out_says_so.sql')

ok('the device never sends detected_type to the database',
   !/detected_type/.test(capture),
   'a partner who could write it could declare a laptop to be an Aadhaar card')
ok('it asks the SERVER to stamp, with a token the server issued',
   /stamp\(saved\.id, read\.stampToken/.test(capture))
ok('148 restores the classification columns for non-operators',
   /NEW\.detected_type\s*:=\s*OLD\.detected_type/.test(m148 ?? ''))
ok('and nulls them on insert',
   /NEW\.detected_type\s*:=\s*NULL/.test(m148 ?? ''))
ok('the stamp path re-reads the event rather than trusting the request',
   /from\('verification_events'\)[\s\S]{0,120}\.eq\('id', stampToken\)/.test(strip(endpoint)))
ok('and refuses a token belonging to another vendor',
   /event\.vendor_id !== doc\.vendor_id/.test(strip(endpoint)))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE CALL REACHES THE SERVER AT ALL\n')

/* The failure this catches is silent and total. Inside the bundled apk
   there is no server: Capacitor answers every unknown path with
   index.html, so a relative fetch returns 200 and a page of HTML, and
   the classifier reads that as a malformed response for ever. The same
   line has already broken dispatch, push and payments in this codebase.

   src/lib/api.js:5 tells the whole story; this makes sure the newest
   caller did not repeat it. */
const visionSrc = strip(read('src/lib/verification/providers/vision.js'))
const captureSrc = strip(read('src/components/partner/DocumentCapture.jsx'))

for (const [name, srcText] of [['vision.js', visionSrc], ['DocumentCapture.jsx', captureSrc]]) {
  ok(`${name} has no bare relative /api fetch`,
     !/fetch\(\s*['"`]\/api\//.test(srcText),
     'a relative path returns index.html inside the apk, with status 200')
  ok(`${name} routes through apiUrl`, /apiUrl\(/.test(srcText))
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE IMAGE AND THE NUMBER DO NOT LINGER\n')

ok('the endpoint requires the caller to be signed in',
   /getUser\(\)/.test(strip(endpoint)) && /Please sign in again/.test(endpoint))
ok('vendor ownership is proved with the CALLER token, so RLS enforces it',
   /asCaller[\s\S]{0,120}from\('vendors'\)/.test(strip(endpoint)))
ok('the image is never written to storage here',
   !/storage\s*\n?\s*\.from|\.upload\(/.test(strip(endpoint)))
ok('the extracted number is never stored by the endpoint',
   !/number:\s*parsed\.number[\s\S]{0,200}insert/.test(strip(endpoint)))
ok('long digit runs are stripped before the raw text is audited',
   /replace\(\/\\d\{6,\}\/g/.test(endpoint),
   'the verdict is worth keeping; a transcription of an Aadhaar number is not')
ok('nothing console-logs the request body',
   !/console\.(log|info|warn|error)\([^)]*imageBase64/.test(endpoint))
ok('the raw model text is never returned to the device',
   !/raw,?\s*\n?\s*\}\)\s*$/m.test(strip(endpoint).split('stampDocument')[0] ?? ''))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nENFORCEMENT IS A ROW, AND AN UNREADABLE ONE MEANS NOTHING\n')

const none = policyFrom([], {})
ok('an empty policy makes nothing mandatory',
   none.isMandatory('VER-ID-IDENTITY') === false)
ok('and requirementsFor agrees',
   requirementsFor({ trades: ['Catering & Food'], policy: none })
     .every(r => r.required === false))

ok('a null policy is read as nothing mandatory',
   requirementsFor({ trades: ['Catering & Food'], policy: null })
     .every(r => r.required === false),
   'assuming "everything required" would lock partners out on a slow SELECT')

const live = policyFrom([
  { requirement_id: 'VER-ID-IDENTITY', market: null, trade: null, mandatory_from: '2026-01-01' },
  { requirement_id: 'VER-TRADE-FSSAI', market: null, trade: 'Catering & Food', mandatory_from: '2026-01-01' },
], { today: '2026-11-02' })

ok('a wildcard rule applies to every trade',
   live.isMandatory('VER-ID-IDENTITY', 'Photography') === true)
ok('a trade rule applies to that trade',
   live.isMandatory('VER-TRADE-FSSAI', 'Catering & Food') === true)
ok('and not to another', live.isMandatory('VER-TRADE-FSSAI', 'Photography') === false)

const future = policyFrom(
  [{ requirement_id: 'VER-ID-IDENTITY', mandatory_from: '2026-11-01' }],
  { today: '2026-09-22' })
ok('a rule dated in the future is not in force yet',
   future.isMandatory('VER-ID-IDENTITY') === false,
   'a partner who onboarded in October must not be retrospectively non-compliant')

const caterer = requirementsFor({ trades: ['Catering & Food'], policy: live })
ok('a caterer is now required to hold FSSAI',
   caterer.find(r => r.id === 'VER-TRADE-FSSAI')?.required === true)
ok('and a photographer is not',
   requirementsFor({ trades: ['Photography'], policy: live })
     .find(r => r.id === 'VER-TRADE-FSSAI') === undefined)

/* ── 149's trade names must exist ──────────────────────────────────
   A typo in the migration does not error. It writes a row that matches
   no trade and silently enforces nothing, which is the worst failure
   mode available to that file. */
const m149 = read('supabase/migrations/149_what_actually_blocks_going_live.sql')
ok('149 is present', !!m149)

const KNOWN_TRADES = new Set(
  requirementsFor({ trades: [] }).length >= 0
    ? ['Catering & Food', 'Cake & Desserts', 'Transportation', 'Security Services']
    : [])
const seeded = [...(m149 ?? '').matchAll(/'(VER-[A-Z-]+)',\s*NULL,\s*'([^']+)'/g)]
ok('149 seeds at least one trade rule', seeded.length > 0)
for (const [, reqId, trade] of seeded) {
  const generated = requirementsFor({ trades: [trade] })
  ok(`149's "${trade}" is a real trade that generates ${reqId}`,
     generated.some(r => r.id === reqId),
     `no requirement ${reqId} is produced for "${trade}" — check the spelling`)
}
ok('every trade named in 149 is one the engine knows',
   seeded.every(([, , t]) => KNOWN_TRADES.has(t)), seeded.map(x => x[2]).join(', '))

if (sabotage) {
  ran++
  if (judgeReading(reading({ documentType: 'not_a_document', isDocument: false }), AADHAAR).fatal) {
    bad++
    fails.push('sabotage: expected a laptop photo to be accepted, and it was refused')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
