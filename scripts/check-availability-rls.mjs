#!/usr/bin/env node
/**
 * Can partner A touch partner B's calendar? Can a stranger?
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASKED AS THE WEAKEST CALLER, NEVER AS THE SERVICE ROLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The service role has BYPASSRLS, so a suite written with it passes
 * against a database with no policies at all. Every attempt below is
 * made through a REAL session minted the way the app mints one, or
 * through the bare anon key with no session. The service role is used
 * for three things only: choosing the partners, proving there is
 * something worth stealing, and cleaning up.
 *
 * ── A vacuous pass is worse than a failure ──────────────────────────
 * RLS does not raise on a forbidden SELECT; it FILTERS. So a leak looks
 * like a successful query, and "zero rows" can mean either "blocked" or
 * "there was nothing there". This script asserts with the service role
 * that B genuinely owns availability rows BEFORE asking A to read them,
 * and fails loudly when there is nothing to test — which is exactly the
 * trap check-listing-rls fell into while a real leak was wide open.
 *
 * ── A probe that writes must restore ────────────────────────────────
 * This is the production database. Every row written here is removed,
 * and anything overwritten is put back.
 *
 *   node scripts/check-availability-rls.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const URL_ = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(URL_, SVC, { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

async function sessionFor(vendor) {
  const { data: prof } = await admin
    .from('profiles').select('email').eq('id', vendor.profile_id).maybeSingle()
  if (!prof?.email) return null
  const { data: link, error } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email: prof.email })
  if (error) return null
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: e2 } = await c.auth.verifyOtp({
    token_hash: link.properties.hashed_token, type: 'email' })
  if (e2) return null
  return { client: c, email: prof.email, vendor }
}

const { data: candidates } = await admin
  .from('vendors')
  .select('id, profile_id, business_name, verification_status')
  .not('profile_id', 'is', null)
  .neq('verification_status', 'suspended')
  .limit(40)

let A = null, B = null
for (const v of candidates ?? []) {
  const s = await sessionFor(v)
  if (!s) continue
  if (!A) { A = s; continue }
  if (v.profile_id !== A.vendor.profile_id) { B = s; break }
}
if (!A || !B) {
  console.log('\n  x could not mint two distinct partner sessions\n')
  process.exit(1)
}
console.log(`\n  A = ${A.vendor.business_name}  (${A.email})`)
console.log(`  B = ${B.vendor.business_name}  (${B.email})\n`)

/* Far out, so no real booking lives there. */
const IST = 330
const todayIST = new Date(Date.now() + IST * 60_000).toISOString().slice(0, 10)
const DATE = new Date(Date.parse(`${todayIST}T00:00:00+05:30`) + 210 * 86_400_000)
  .toISOString().slice(0, 10)

const { data: bHad } = await admin.from('vendor_availability').select('*')
  .eq('vendor_id', B.vendor.id).eq('slot_date', DATE).maybeSingle()

try {
  /* ── Give B something genuinely worth stealing ────────────────────
     Written with the service role so the test does not depend on the
     very policy it is testing. A private note and a blocking reason are
     precisely the columns migration 130 marks partner-facing. */
  const seed = {
    vendor_id: B.vendor.id, slot_date: DATE, status: 'BLOCKED',
    note: 'RLS PROBE - private',
  }
  /* `reason` arrives with migration 130. Until that is pasted the column
     is not there and PostgREST 400s on it, which would make this whole
     run fail for a reason that has nothing to do with RLS. The note
     alone is already a private column worth protecting, so the probe
     degrades to it rather than skipping. */
  const { error: seedErr } = await admin.from('vendor_availability')
    .upsert({ ...seed, reason: 'personal' }, { onConflict: 'vendor_id,slot_date' })
  if (seedErr) {
    console.log(`  - vendor_availability.reason not deployed yet (${seedErr.code ?? 'error'}); testing with note only`)
    await admin.from('vendor_availability')
      .upsert(seed, { onConflict: 'vendor_id,slot_date' })
  }

  const { count: proof } = await admin.from('vendor_availability')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  ok('B owns a row that WOULD leak if the rule were wrong', proof === 1,
     'nothing to steal - this run proves nothing')
  if (proof !== 1) { throw new Error('setup failed') }

  console.log('\nREADING SOMEBODY ELSE\'S CALENDAR\n')

  const { data: aSeesB } = await A.client.from('vendor_availability')
    .select('id, note').eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  ok('A cannot read B\'s day', (aSeesB ?? []).length === 0,
     `${(aSeesB ?? []).length} row(s) returned`)

  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: anonSees } = await anon.from('vendor_availability')
    .select('id, note').eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  /* NOTE: migration 021 left `public_reads_approved_vendor_availability`
     in place and 116 never dropped it, so an anonymous SELECT on an
     APPROVED vendor's availability still succeeds. That is recorded
     here rather than asserted away: if rows come back, the private
     columns must at least be empty, and they are not. */
  if ((anonSees ?? []).length > 0) {
    ok('anon reading a partner\'s private note is a LEAK', false,
       'policy public_reads_approved_vendor_availability (021) exposes note/reason')
  } else {
    ok('anon cannot read a partner\'s day', true)
  }

  console.log('\nWRITING TO SOMEBODY ELSE\'S CALENDAR\n')

  const { error: aWrite } = await A.client.from('vendor_availability')
    .upsert({ vendor_id: B.vendor.id, slot_date: DATE, status: 'OPEN' },
            { onConflict: 'vendor_id,slot_date' })
  ok('A cannot write B\'s day', !!aWrite, 'the write was accepted')

  const { error: anonWrite } = await anon.from('vendor_availability')
    .insert({ vendor_id: B.vendor.id, slot_date: DATE, status: 'OPEN' })
  ok('anon cannot write a partner\'s day', !!anonWrite, 'the write was accepted')

  const { error: aDelete } = await A.client.from('vendor_availability')
    .delete().eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  const { count: survived } = await admin.from('vendor_availability')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  ok('A cannot delete B\'s day', survived === 1,
     aDelete ? 'refused, but the row is gone' : 'the row was deleted')

  console.log('\nB\'S ROW IS STILL B\'S ROW\n')

  const { data: bStill } = await admin.from('vendor_availability')
    .select('status, note').eq('vendor_id', B.vendor.id).eq('slot_date', DATE).maybeSingle()
  ok('...still BLOCKED', bStill?.status === 'BLOCKED', String(bStill?.status))
  ok('...with the note untouched', bStill?.note === 'RLS PROBE - private',
     String(bStill?.note))

  console.log('\nTHE STANDING WEEK (needs migration 131)\n')

  const { error: wkErr } = await A.client.from('vendor_weekly_rules')
    .insert({ vendor_id: B.vendor.id, weekday: 0, is_available: true,
              effective_from: DATE })
  if (/does not exist|schema cache/i.test(wkErr?.message ?? '')) {
    console.log('  - vendor_weekly_rules is not deployed yet; skipped')
  } else {
    ok('A cannot write B\'s standing week', !!wkErr, 'the write was accepted')
    if (!wkErr) {
      await admin.from('vendor_weekly_rules').delete()
        .eq('vendor_id', B.vendor.id).eq('effective_from', DATE)
    }
  }
} finally {
  await admin.from('vendor_availability')
    .delete().eq('vendor_id', B.vendor.id).eq('slot_date', DATE)
  if (bHad) {
    const { id, created_at, updated_at, location, ...keep } = bHad
    await admin.from('vendor_availability').insert(keep)
    console.log(`\n  restored B's original ${bHad.status} row on ${DATE}`)
  } else {
    console.log(`\n  ${DATE} had no row before this run, and has none now`)
  }
  await A.client.auth.signOut()
  await B.client.auth.signOut()
}

console.log(`\n  ${ran - bad}/${ran} passed\n`)
process.exit(bad === 0 ? 0 : 1)
