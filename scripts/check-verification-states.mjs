#!/usr/bin/env node
/**
 * Can a partner make themselves verified?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ANSWER HAS TO BE NO IN SQL, NOT IN REACT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The partner app is a WebView holding an anon key. Anybody who wants
 * to can call PostgREST directly with it, so a rule enforced in a
 * component is enforced only for people who use the component.
 *
 * This reads migrations 144, 145 and 147 and asserts the guarantees are
 * where they have to be. It is a STATIC read -- it cannot prove the
 * trigger fires, only that it exists and says the right thing. The live
 * probe (check-verification-migrations.mjs) proves it was applied, and
 * a real partner session proves it bites.
 *
 *   node scripts/check-verification-states.mjs
 *   node scripts/check-verification-states.mjs --sabotage
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIG = join(ROOT, 'supabase/migrations')
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

const read = prefix => {
  const f = readdirSync(MIG).find(x => x.startsWith(prefix))
  return f ? readFileSync(join(MIG, f), 'utf8') : null
}
/* Comments first, always. Every one of these files EXPLAINS the rule it
   enforces, in prose containing the exact strings searched for, and a
   checker that reads its own documentation as evidence is vacuous. */
const strip = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*--.*$/gm, '')

const m144 = read('144_'), m145 = read('145_'), m147 = read('147_')
const c144 = strip(m144), c145 = strip(m145), c147 = strip(m147)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE MIGRATIONS ARE PRESENT\n')
ok('144 · cases, attempts, events', !!m144)
ok('145 · the state machine', !!m145)
ok('147 · the dispatch gate', !!m147)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE CASE STATES ARE DECLARED, AND ONLY THOSE\n')

const WANT = ['in_progress', 'submitted', 'verifying', 'manual_review',
              'requires_action', 'verified', 'rejected']
const checkBlock = c144.slice(c144.indexOf('status'), c144.indexOf('attempt_no'))
for (const s of WANT) {
  ok(`the case can be ${s}`, checkBlock.includes(`'${s}'`))
}

const ATTEMPT_OUTCOMES = ['pass', 'fail', 'inconclusive', 'unavailable', 'skipped']
for (const o of ATTEMPT_OUTCOMES) {
  ok(`an attempt can be ${o}`, c144.includes(`'${o}'`))
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA PARTNER OWNS EXACTLY TWO TRANSITIONS\n')

ok('the guard exists', /guard_case_transitions/.test(c145))
ok('it is a BEFORE UPDATE trigger', /BEFORE UPDATE ON public\.verification_cases/.test(c145))
ok('an operator passes through', /caller_is_operator\(\)[\s\S]{0,40}RETURN NEW/.test(c145))
ok('in_progress -> submitted is allowed',
   /OLD\.status = 'in_progress' AND NEW\.status = 'submitted'/.test(c145))
ok('requires_action -> submitted is allowed',
   /OLD\.status = 'requires_action' AND NEW\.status = 'submitted'/.test(c145))

/* The important absence: no partner-reachable path writes 'verified'. */
const guardBody = c145.slice(c145.indexOf('guard_case_transitions'),
                             c145.indexOf('new_case_starts_in_progress'))
ok('NO partner transition mentions verified',
   !/NEW\.status = 'verified'/.test(guardBody), 'a partner could mark themselves verified')
ok('nor rejected', !/NEW\.status = 'rejected'/.test(guardBody))
ok('anything else raises', /RAISE EXCEPTION[\s\S]{0,120}cannot move a case/.test(c145))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE VERDICT FIELDS ARE RESTORED, NOT TRUSTED\n')

for (const col of ['decided_at', 'decided_by', 'decision_note', 'risk_band',
                   'risk_score', 'review_due_at', 'attempt_no']) {
  ok(`${col} is restored from OLD on a partner write`,
     new RegExp(`NEW\\.${col}\\s*:=\\s*OLD\\.${col}`).test(c145))
}

ok('a new case is forced to in_progress',
   /NEW\.status\s*:=\s*'in_progress'/.test(c145))
ok('and its verdict fields are nulled on insert',
   /NEW\.decided_at\s*:=\s*NULL/.test(c145) && /NEW\.risk_band\s*:=\s*NULL/.test(c145))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONLY AN OPERATOR DECIDES\n')

ok('decide_verification_case is operator-gated',
   /decide_verification_case[\s\S]{0,900}caller_is_operator\(\)[\s\S]{0,80}not_permitted/.test(c145))
ok('a rejection must carry a reason',
   /'rejected', 'requires_action'[\s\S]{0,200}no_reason/.test(c145))
ok('and the reason is what the partner reads',
   /The partner reads this/.test(m145))
ok('approving routes through set_vendor_verification, not a raw UPDATE',
   /set_vendor_verification\(v_case\.vendor_id, 'approved'/.test(c145))
ok('every decision is audited',
   /write_verification_audit\(\s*v_status/.test(c145))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE RAW PROVIDER EXCHANGE IS OPERATOR-ONLY\n')

/* ── Match the POLICY, not a window of characters ──────────────────
   The first version asked whether "verification_events" appeared
   within 400 characters of "profile_id = auth.uid()". It does: the
   ALTER TABLE enabling RLS on it sits just above the unrelated
   policy for verification_cases, which is owner-scoped and correctly
   so. The guard reported a leak that was not there.

   What matters is whether any policy whose TARGET is
   verification_events is owner-scoped, so that is what is parsed. */
/* Split rather than a regex: escaping a pattern through a generated
   file lost its backslashes once already, and a policy block is
   trivially delimited by the statement that opens it. */
const policiesOn = table => c144
  .split('CREATE POLICY')
  .slice(1)
  .map(chunk => chunk.slice(0, chunk.indexOf(';') + 1))
  .filter(chunk => chunk.includes('ON public.' + table))

const eventPolicies = policiesOn('verification_events')
ok('verification_events has at least one policy', eventPolicies.length > 0)
ok('and no policy on it is owner-scoped',
   !eventPolicies.some(pol => /profile_id/.test(pol)),
   eventPolicies.filter(pol => /profile_id/.test(pol)).join(' | '))
ok('and none of them permits a write',
   !eventPolicies.some(pol => /FOR (INSERT|UPDATE|DELETE|ALL)/.test(pol)))
ok('it is operator-read',
   /operators read the raw exchange[\s\S]{0,160}caller_is_operator/.test(c144))
ok('and append-only',
   /verification_events_no_update[\s\S]{0,140}BEFORE UPDATE OR DELETE/.test(c144))
ok('the audit is append-only too',
   /verification_audit_no_update[\s\S]{0,140}BEFORE UPDATE OR DELETE/.test(c144))

/* A partner CAN read their own case — that is deliberate. */
ok('a partner can read their own case',
   /case owner reads[\s\S]{0,200}profile_id = auth\.uid\(\)/.test(c144))
ok('and their own attempts',
   /attempt owner reads[\s\S]{0,200}profile_id = auth\.uid\(\)/.test(c144))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE DISPATCH GATE ADDS ONE CLAUSE AND NOTHING ELSE\n')

ok('147 stops paused, suspended and hidden listings',
   /pl\.status IN \('paused', 'suspended', 'hidden'\)/.test(c147))
ok('it is a NOT EXISTS, so a partner with no listing row stays eligible',
   /NOT EXISTS[\s\S]{0,200}partner_listings pl/.test(c147))

/* The clauses 134 had must all still be there. A rebuild that quietly
   drops one is the exact failure 126 committed. */
for (const clause of [
  'v.is_verified = TRUE',
  'v.accepting_jobs = TRUE',
  'ST_DWithin(v.location, p_point, p_radius_m)',
  'v.service_radius_km * 1000',
  "a.status = 'BLOCKED'",
  'weekday_is_open',
  'unpaid_hold_minutes',
  'max_events_per_day',
]) {
  ok(`134's clause survives: ${clause}`, c147.includes(clause))
}

ok('it does NOT smuggle in the review_status gate 126 dropped',
   !/review_status/.test(c147),
   'restoring that belongs in its own migration, as 134 says')

ok('why_not_dispatched exists so an operator can answer the question',
   /why_not_dispatched/.test(c147))
ok('and it is read-only', /LANGUAGE sql[\s\S]{0,40}STABLE/.test(c147))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nPOLICY REPLACES THE CONSTANT\n')

const m146 = read('146_'), c146 = strip(m146)
ok('146 is present', !!m146)
ok('a policy row is scoped by market, trade, service and requirement',
   ['market', 'trade', 'service', 'requirement_id'].every(c => c146.includes(c)))
ok('it carries a version', /version\s+INTEGER/.test(c146))
ok('the lookup prefers the most specific rule',
   /service IS NOT NULL[\s\S]{0,120}trade\s+IS NOT NULL[\s\S]{0,120}market\s+IS NOT NULL/.test(c146))
ok('an empty table means nothing is mandatory',
   /COALESCE\(\([\s\S]{0,900}\), FALSE\)/.test(c146))
ok('every signed-in partner can read the rulebook',
   /anybody signed in reads the policy/.test(c146))
ok('but only operators write it',
   /operators write the policy[\s\S]{0,160}caller_is_operator/.test(c146))
ok('nothing is seeded, so applying it changes nothing today',
   !/^\s*INSERT INTO public\.verification_policy/m.test(c146))

if (sabotage) {
  ran++
  if (!/NEW\.status = 'verified'/.test(guardBody)) {
    bad++
    fails.push('sabotage: expected a partner-reachable path to verified, and found none')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
