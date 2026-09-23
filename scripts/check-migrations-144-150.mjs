#!/usr/bin/env node
/**
 * Did 144 to 150 actually land?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WRITING A MIGRATION IS NOT APPLYING ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every migration in this repo is pasted into the SQL editor by hand, so
 * the filesystem says nothing at all about the database. A file that
 * exists and was never pasted looks exactly like one that was, and the
 * app degrades quietly around it — which is the correct behaviour and
 * also the reason nobody notices for a week.
 *
 * This asks the live database. Read-only: every RPC below is called with
 * arguments that provably hit an early return or a NULL lookup, so
 * nothing is written and nothing is decided.
 *
 *   node scripts/check-migrations-144-150.mjs
 *
 * A failure here is not a bug in the code. It means a file still needs
 * pasting, and it names which one.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const NOWHERE = '00000000-0000-0000-0000-000000000000'

/** A table is there if selecting from it does not say it is not. */
async function table(name) {
  const { error } = await db.from(name).select('*').limit(1)
  return error ? error.message : null
}

async function column(t, col) {
  const { error } = await db.from(t).select(col).limit(1)
  return error ? error.message : null
}

/** An RPC exists if calling it fails for any reason OTHER than absence. */
async function fn(name, args = {}) {
  const { data, error } = await db.rpc(name, args)
  if (!error) return { exists: true, data }
  const missing = error.code === 'PGRST202' || /could not find the function/i.test(error.message)
  return { exists: !missing, error: error.message, data: null }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n144 · A VERIFICATION HAS A CASE FILE\n')

for (const t of ['verification_cases', 'verification_attempts',
                 'verification_events', 'risk_signals', 'verification_audit']) {
  const err = await table(t)
  ok(t, err === null, err ?? '')
}

for (const [t, c] of [
  ['verification_cases', 'attempt_no'],
  ['verification_cases', 'risk_band'],
  ['verification_cases', 'review_due_at'],
  ['verification_attempts', 'outcome'],
  ['verification_events', 'direction'],
  ['risk_signals', 'weight'],
]) {
  const err = await column(t, c)
  ok(`${t}.${c}`, err === null, err ?? '')
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n145 · A PARTNER CANNOT VERIFY THEMSELVES\n')

/* The argument NAMES matter: PostgREST resolves an overload by keyword,
   so a probe that guesses them reports "could not find the function"
   for a function that is sitting right there. These are copied from
   145 rather than remembered -- the first version of this file guessed,
   and wrongly accused 145 of not being applied.

   `open_verification_case()` and `submit_verification_case()` take no
   arguments at all: they read auth.uid(). Called as service_role that
   is NULL, so each takes its "no vendor for this caller" branch and
   returns without writing. The other two are given a case id that does
   not exist, which is the same early return. */
for (const [name, args] of [
  ['open_verification_case', {}],
  ['submit_verification_case', {}],
  ['decide_verification_case', { p_case_id: NOWHERE, p_decision: 'rejected', p_note: 'probe' }],
  ['record_verification_attempt', { p_case_id: NOWHERE, p_kind: 'probe', p_outcome: 'skipped' }],
]) {
  const r = await fn(name, args)
  ok(`${name}() exists`, r.exists, r.error ?? '')
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n146 + 149 · ENFORCEMENT IS A ROW, AND THE ROWS ARE IN\n')

const polErr = await table('verification_policy')
ok('verification_policy', polErr === null, polErr ?? '')

const viewErr = await table('verification_policy_live')
ok('verification_policy_live', viewErr === null, viewErr ?? '')

const mandatory = await fn('requirement_is_mandatory', {
  p_requirement_id: 'VER-ID-IDENTITY', p_trade: null, p_market: null,
  p_service: null, p_on: null,
})
ok('requirement_is_mandatory() exists', mandatory.exists, mandatory.error ?? '')

/* 149's eight rows, by id. Named individually so a partial paste is
   visible rather than averaged away. */
const { data: rows, error: rowsErr } = await db
  .from('verification_policy')
  .select('requirement_id, trade, mandatory_from')
  .order('requirement_id')

if (rowsErr) {
  ok('149 seeded its rows', false, rowsErr.message)
} else {
  const seen = (rows ?? []).map(r => `${r.requirement_id}|${r.trade ?? '*'}`)
  const WANT = [
    ['VER-ID-IDENTITY', '*'],
    ['VER-TAX-PAN', '*'],
    ['VER-TRADE-FSSAI', 'Catering & Food'],
    ['VER-TRADE-FSSAI', 'Cake & Desserts'],
    ['VER-TRADE-DL', 'Transportation'],
    ['VER-TRADE-RC', 'Transportation'],
    ['VER-TRADE-INSURANCE', 'Transportation'],
    ['VER-TRADE-PSARA', 'Security Services'],
  ]
  for (const [id, trade] of WANT) {
    ok(`149 · ${id}${trade === '*' ? '' : ` (${trade})`}`,
       seen.includes(`${id}|${trade}`),
       'row absent — 149 not pasted, or the trade name was mistyped')
  }
  const dates = [...new Set((rows ?? []).map(r => r.mandatory_from))]
  console.log(`  · ${rows?.length ?? 0} policy rows, mandatory from ${dates.join(', ') || '(none)'}`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n147 · A PAUSED TRADE STOPS GETTING OFFERS\n')

const why = await fn('why_not_dispatched', {
  p_vendor_id: NOWHERE, p_trade: 'Photography', p_date: null,
})
ok('why_not_dispatched() exists', why.exists, why.error ?? '')

/* match_partners against an empty point with a zero radius: the
   function runs, finds nobody, writes nothing. What is being proved is
   that the REBUILT signature is in place. */
const match = await db.rpc('match_partners', {
  p_trade: 'Photography',
  p_point: 'POINT(77.5946 12.9716)',
  p_radius_m: 1,
  p_date: '2026-01-01',
  p_allow_synthetic: false,
  p_limit: 1,
  p_exclude: [],
})
ok('match_partners() still answers', !match.error, match.error?.message ?? '')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n148 · THE CALENDAR NUDGE AND THREE FIXES\n')

for (const [t, c] of [
  ['partner_notification_prefs', 'calendar'],
  ['vendor_documents', 'detected_type'],
  ['vendor_documents', 'detected_confidence'],
  ['vendor_documents', 'name_match'],
  ['vendor_documents', 'classified_at'],
]) {
  const err = await column(t, c)
  ok(`${t}.${c}`, err === null, err ?? '')
}

/* The kind CHECK really does admit 'calendar'. Inserted against a
   vendor that does not exist, so the FK rejects it AFTER the CHECK has
   been evaluated -- a foreign-key error proves the CHECK passed, and
   nothing lands either way. */
const nudge = await db.from('partner_notifications')
  .insert({ vendor_id: NOWHERE, kind: 'calendar', title: 'probe' })
const kindOk = /foreign key|violates foreign key/i.test(nudge.error?.message ?? '')
ok("partner_notifications accepts kind='calendar'", kindOk,
   nudge.error?.message ?? 'the insert SUCCEEDED, which it must not have')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n150 · CONSENT THAT CAN BE TAKEN BACK\n')

const consentErr = await table('partner_consents')
ok('partner_consents', consentErr === null, consentErr ?? '')

const faceErr = await column('vendor_documents', 'face_match')
ok('vendor_documents.face_match', faceErr === null, faceErr ?? '')

const has = await fn('has_consent', { p_vendor: NOWHERE, p_purpose: 'face_match' })
ok('has_consent() exists', has.exists, has.error ?? '')
ok('and no record means NOT consented', has.data === false,
   `returned ${JSON.stringify(has.data)} — the safe direction is false`)

const setC = await fn('set_consent', {
  p_vendor: NOWHERE, p_purpose: 'face_match', p_granted: true, p_version: 'v1',
})
ok('set_consent() exists', setC.exists, setC.error ?? '')
ok('and it refuses a vendor the caller does not own',
   !setC.data && /consent is given by the person it concerns|insufficient/i.test(setC.error ?? ''),
   setC.error ?? 'it did NOT refuse')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\n148 · AND THE INDEX 143 FAILED TO DROP\n')

/* 093 created the uniqueness as a standalone CREATE UNIQUE INDEX, and
   143 tried to remove it with DROP CONSTRAINT IF EXISTS, which matches
   no index and does not complain. If it survived, a partner listing two
   trades still cannot hold two documents of the same kind.

   Proved by behaviour rather than by reading pg_indexes: two rows, same
   kind, different requirement. Cleaned up immediately either way. */
const { data: anyVendor } = await db.from('vendors').select('id').limit(1)
const vid = anyVendor?.[0]?.id

if (!vid) {
  console.log('  · no vendor to test against; skipped')
} else {
  const mk = (req, n) => ({
    vendor_id: vid, requirement_id: req, kind: 'other',
    storage_path: `__probe__/${n}.jpg`, file_name: `${n}.jpg`,
  })
  const a = await db.from('vendor_documents').upsert(mk('__PROBE_A__', 'a'),
    { onConflict: 'vendor_id,requirement_id' }).select('id').maybeSingle()
  const b = await db.from('vendor_documents').upsert(mk('__PROBE_B__', 'b'),
    { onConflict: 'vendor_id,requirement_id' }).select('id').maybeSingle()

  ok('two documents of the same kind, different requirements, coexist',
     !a.error && !b.error,
     (a.error?.message ?? b.error?.message ?? '') +
     '  <- uq_vendor_document_per_kind survived; 148 not pasted')

  for (const r of [a.data?.id, b.data?.id]) {
    if (r) await db.from('vendor_documents').delete().eq('id', r)
  }
  console.log('  · both probe rows removed')
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('NOT APPLIED, OR APPLIED PARTIALLY\n')
  for (const f of fails) console.log('  ' + f)
  console.log('\n  Paste the named file in supabase/migrations/, in order.\n')
}
process.exitCode = bad ? 1 : 0
