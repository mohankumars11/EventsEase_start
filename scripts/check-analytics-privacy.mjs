#!/usr/bin/env node
/**
 * Can anything sensitive reach the telemetry table?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS THE GUARD THAT MATTERS MOST
 * ══════════════════════════════════════════════════════════════════════
 *
 * An analytics payload is the easiest place in a codebase for something
 * sensitive to end up. It is a free-form bag, it gets added under time
 * pressure at the end of a task, and nobody reviews it with the care
 * they give a form. A key named `pan` reaching this table is a data
 * breach wearing a product-metrics hat.
 *
 * This app holds Aadhaar numbers, PAN numbers, bank accounts and
 * photographs of identity documents. So there are three layers, and
 * this asserts all three:
 *
 *   1 · `scrub()` drops it on the device, by key and by shape
 *   2 · a trigger in 156 REJECTS the row if anything gets past
 *   3 · no call site passes anything it should not — checked by
 *       reading every `track(...)` in the tree
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND THE VOCABULARY HAS TO STAY CLOSED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A free-text event name produces `calendar_updated`, `calendarUpdated`
 * and `Calendar Updated` within a month, in three files, and then
 * nothing can be counted. Every name sent must be in `EVENTS`.
 *
 *   node scripts/check-analytics-privacy.mjs
 *   node scripts/check-analytics-privacy.mjs --sabotage
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

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

const read = p => readFileSync(join(ROOT, p), 'utf8')
const trackSrc = read('src/lib/track.js')
const migration = read('supabase/migrations/156_what_the_app_is_actually_used_for.sql')

const { scrub, EVENTS } = await loadSrc({ 'src/lib/track.js': ['scrub', 'EVENTS'] })

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE SCRUBBER DROPS IT ON THE DEVICE')
console.log('')

const DIRTY = {
  aadhaar: '123412341234', pan: 'ABCDE1234F', contact_phone: '9876543210',
  customer_phone: '9812345678', account_number: '50100123456789',
  upi_id: 'anu@hdfc', ifsc: 'HDFC0001234', email: 'a@b.com',
  full_name: 'Anusha Rao', address: '12 4th Cross',
  passport: 'A1234567', voter_id: 'ABC1234567', number_last4: '4321',
  provider_response: { raw: 'x' }, raw_response: 'x', otp: '123456',
  document_number: 'X', card_number: '4111111111111111', cvv: '123',
  bank_name: 'HDFC',
}
const cleaned = scrub(DIRTY)
ok(`every forbidden key is dropped (${Object.keys(DIRTY).length} tried)`,
   Object.keys(cleaned).length === 0,
   `survived: ${Object.keys(cleaned).join(', ')}`)

/* Shape, under an innocent key name. A key-name rule cannot catch
   `{ id: '123412341234' }` and that is exactly how it happens. */
const SHAPES = { id: '123412341234', ref: 'ABCDE1234F', code: '9876543210' }
ok('and an identity SHAPE is dropped under any key name',
   Object.keys(scrub(SHAPES)).length === 0,
   `survived: ${JSON.stringify(scrub(SHAPES))}`)

ok('a nested object never travels',
   Object.keys(scrub({ nested: { a: 1 } })).length === 0,
   'an object is a place to hide one level below a key check')

ok('long free text is trimmed',
   scrub({ note: 'x'.repeat(400) }).note?.length === 120,
   'a long string is where a name or an address ends up')

ok('but ordinary metrics survive',
   JSON.stringify(scrub({ days: 5, severity: 'short', count: 3, ok: true }))
   === JSON.stringify({ days: 5, severity: 'short', count: 3, ok: true }))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('AND THE DATABASE REFUSES IT ANYWAY')
console.log('')

ok('there is a BEFORE INSERT trigger', /BEFORE INSERT OR UPDATE ON public\.partner_events/.test(migration))
ok('it raises rather than strips',
   /RAISE EXCEPTION[\s\S]{0,200}may not contain/.test(migration),
   'a silently emptied payload teaches nobody')
ok('it checks key names', /jsonb_object_keys\(NEW\.props\)/.test(migration))
ok('and it checks the VALUE shape too',
   /NEW\.props::text ~ '/.test(migration),
   'a key-name rule cannot catch { id: <12 digits> }')

/* The two lists must agree, or one of them is decoration. */
const clientKeys = (trackSrc.match(/const FORBIDDEN\s*=\s*\n?\s*\/\(([^)]*)\)/) ?? [])[1] ?? ''
const sqlKeys = (migration.match(/k ~\* '\(([^)]*)\)'/) ?? [])[1] ?? ''
const shared = ['aadhaar', 'passport', 'voter', 'ifsc', 'account_number',
                'card_number', 'cvv', 'otp', 'number_last4', 'upi_id',
                'bank', 'raw_response', 'provider_response', 'document_number']
for (const key of shared) {
  ok(`"${key}" is refused by both the client and the database`,
     clientKeys.includes(key) && sqlKeys.includes(key),
     `client=${clientKeys.includes(key)} sql=${sqlKeys.includes(key)}`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('NO CALL SITE PASSES ANYTHING IT SHOULD NOT')
console.log('')

/* Every track(...) in the tree, read rather than assumed. */
const files = []
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const full = join(d, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full) }
    else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(full)
  }
}
walk(join(ROOT, 'src'))

const calls = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/\btrack\(\s*EVENTS\.([A-Z_]+)\s*,\s*\{([^}]*)\}/g)) {
    calls.push({ file: relative(ROOT, f), event: m[1], props: m[2] })
  }
}

ok(`there is at least one call site (${calls.length} found)`, calls.length > 0)

const BAD_PROP = /(aadhaar|pan|passport|voter|ifsc|account|card|cvv|otp|last4|upi|bank|raw|provider_response|phone|email|full_name|address|number)\s*:/i
for (const c of calls) {
  const hit = c.props.match(BAD_PROP)
  if (hit) {
    ok(`${c.file} · ${c.event}`, false, `passes "${hit[1]}"`)
  }
}
ok('no call site passes a forbidden prop',
   !calls.some(c => BAD_PROP.test(c.props)))

ok('every event name used is in EVENTS',
   calls.every(c => Object.prototype.hasOwnProperty.call(EVENTS, c.event)),
   calls.filter(c => !EVENTS[c.event]).map(c => c.event).join(', '))

/* A literal string where an EVENTS constant should be. */
const literalCalls = files.flatMap(f =>
  [...readFileSync(f, 'utf8').matchAll(/\btrack\(\s*['"]([a-z_]+)['"]/g)]
    .map(m => `${relative(ROOT, f)}: "${m[1]}"`))
ok('nobody sends a literal event name',
   literalCalls.length === 0, literalCalls.join(', '))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('IT NEVER BLOCKS AND NEVER THROWS')
console.log('')

ok('track() returns nothing to await',
   /export function track\(/.test(trackSrc) && !/export async function track\(/.test(trackSrc),
   'a partner tapping Accept must never wait on a metric')
ok('a failed send is swallowed', /} catch \{[\s\S]{0,400}\}\n\}/.test(trackSrc))
ok('and never retried', /NOT retried/.test(trackSrc),
   'a retrying metric spends a partner data allowance on a train')
ok('the last batch is flushed on visibilitychange',
   /visibilitychange/.test(trackSrc),
   'a backgrounded Android WebView often never fires unload')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('A PARTNER CANNOT READ THE EVENT STREAM')
console.log('')

ok('reading is operator-only',
   /"operators read events"[\s\S]{0,200}caller_is_operator/.test(migration))
ok('and a partner writes only their own',
   /vendor_id IN \(SELECT id FROM public\.vendors WHERE profile_id = auth\.uid\(\)\)/.test(migration))

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))

if (!env.VITE_SUPABASE_URL) {
  console.log('  · no keys in .env; the live half is skipped')
} else {
  const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } })
  const { data: seen, error: seenErr } = await anon
    .from('partner_events').select('id').limit(3)
  const missing = seenErr && /does not exist|schema cache/i.test(seenErr.message)
  if (missing) {
    console.log('  · 156 not applied yet; the live half is skipped')
  } else {
    ok('a signed-out caller reads no events', (seen?.length ?? 0) === 0,
       seenErr ? `refused with ${seenErr.code}` : `read ${seen?.length}`)
  }
}

/* ══════════════════════════════════════════════════════════════════ */
if (sabotage) {
  ran++
  if (Object.keys(scrub({ aadhaar: '123412341234' })).length === 0) {
    bad++
    fails.push('sabotage: expected the scrubber to be broken, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('')
}
process.exitCode = bad ? 1 : 0
