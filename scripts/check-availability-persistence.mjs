#!/usr/bin/env node
/**
 * Does marking a day ACTUALLY save?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner taps a date, chooses Available, taps Save, and the month
 * comes back identical. It has had two separate causes, and both were
 * invisible from the UI:
 *
 *   1. The sheet sent `status: 'AVAILABLE'`, which is not in
 *      CHECK (status IN ('BLOCKED','LIMITED','OPEN')) -- migration 021.
 *      Postgres rejected every open-day save. Limited and Blocked
 *      worked, which is why it survived: the one state that failed was
 *      the state the sheet opens on.
 *
 *   2. `setDayStatus` then DELETED the OPEN row it had just written,
 *      on the grounds that a row matching the defaults said nothing the
 *      matching engine needed. True, and irrelevant -- it is the tap a
 *      partner makes most, and the app threw it away.
 *
 * Both are fixed. This script is what stops them coming back, and it
 * asserts the thing the partner actually cares about: that the mark is
 * still there after a full re-login.
 *
 * ── Why a second session, not a second query ────────────────────────
 * Re-reading on the same client proves nothing that local state would
 * not also pass. Every assertion below re-reads through a SEPARATE
 * client holding a SEPARATE freshly-minted session -- the script's
 * stand-in for "log out, log back in, look again".
 *
 * ── Why never the service role ──────────────────────────────────────
 * It has BYPASSRLS. A suite written with it passes against a database
 * with no policies at all. It is used here for three things only:
 * choosing the partner, reading the row back for a truthful diff, and
 * restoring what the run changed.
 *
 *   node scripts/check-availability-persistence.mjs
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
if (!URL_ || !ANON || !SVC) {
  console.error('\n  x .env is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}
const admin = createClient(URL_, SVC, { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

/* A fresh login for this partner, every time it is called. Same user,
   new session, new client -- which is the whole point. */
async function freshSession(email) {
  const { data: link, error } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`generateLink: ${error.message}`)
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: e2 } = await c.auth.verifyOtp({
    token_hash: link.properties.hashed_token, type: 'email' })
  if (e2) throw new Error(`verifyOtp: ${e2.message}`)
  return c
}

/* ── Pick a partner who can actually write ──────────────────────────
   migration 116 splits the write policies onto owns_active_vendor,
   which excludes verification_status = 'suspended'. Choosing a
   suspended partner would fail every write for a reason that has
   nothing to do with what is being tested. */
const { data: candidates } = await admin
  .from('vendors')
  .select('id, profile_id, business_name, verification_status')
  .not('profile_id', 'is', null)
  .neq('verification_status', 'suspended')
  .limit(40)

let partner = null, email = null, client = null
for (const v of candidates ?? []) {
  const { data: prof } = await admin
    .from('profiles').select('email').eq('id', v.profile_id).maybeSingle()
  if (!prof?.email) continue
  try {
    client = await freshSession(prof.email)
    partner = v; email = prof.email
    break
  } catch { /* try the next one */ }
}
if (!partner) {
  console.log('\n  x could not mint a session for any active partner\n')
  process.exit(1)
}
console.log(`\n  partner = ${partner.business_name}  (${email})`)

/* Far enough out that no real booking or test hold lives there. */
const IST_OFFSET_MIN = 330
const todayIST = new Date(Date.now() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10)
const DATE = new Date(Date.parse(`${todayIST}T00:00:00+05:30`) + 200 * 86_400_000)
  .toISOString().slice(0, 10)
console.log(`  date    = ${DATE}  (today IST is ${todayIST})\n`)

/* ── Remember what was there, and put it back at the end ────────────
   This is the production database. A probe that writes must restore. */
const { data: original } = await admin
  .from('vendor_availability').select('*')
  .eq('vendor_id', partner.id).eq('slot_date', DATE).maybeSingle()

/** Exactly the write useVendorAccount.setDayStatus makes. */
const writeDay = (c, status, extra = {}) => c
  .from('vendor_availability')
  .upsert({ vendor_id: partner.id, slot_date: DATE, status, ...extra },
          { onConflict: 'vendor_id,slot_date' })
  .select().single()

/** Read it back as the partner, through a brand-new login. */
async function readAfterRelogin() {
  const c2 = await freshSession(email)
  const { data } = await c2
    .from('vendor_availability').select('*')
    .eq('vendor_id', partner.id).eq('slot_date', DATE).maybeSingle()
  await c2.auth.signOut()
  return data ?? null
}

let failure = null
try {
  /* Start from nothing, so "it was already OPEN" cannot pass for us. */
  await client.from('vendor_availability')
    .delete().eq('vendor_id', partner.id).eq('slot_date', DATE)

  console.log('THE STATE THAT USED TO VANISH\n')

  const { data: openRow, error: openErr } = await writeDay(client, 'OPEN')
  ok('marking a day Available is accepted', !openErr, openErr?.message)
  ok('...and the row comes back', openRow?.status === 'OPEN', openRow?.status)

  const afterOpen = await readAfterRelogin()
  ok('...and survives a full re-login', afterOpen?.status === 'OPEN',
     afterOpen === null ? 'the row is gone' : afterOpen.status)

  console.log('\nTHE STATES THAT ALWAYS WORKED, STILL WORKING\n')

  const { error: limErr } = await writeDay(client, 'LIMITED', { slots_total: 2 })
  ok('Limited is accepted', !limErr, limErr?.message)
  const afterLim = await readAfterRelogin()
  ok('...persists as LIMITED', afterLim?.status === 'LIMITED', afterLim?.status)
  ok('...and keeps its capacity', afterLim?.slots_total === 2, String(afterLim?.slots_total))

  const { error: blkErr } = await writeDay(client, 'BLOCKED', { note: 'probe' })
  ok('Blocked is accepted', !blkErr, blkErr?.message)
  const afterBlk = await readAfterRelogin()
  ok('...persists as BLOCKED', afterBlk?.status === 'BLOCKED', afterBlk?.status)
  ok('...and keeps its private note', afterBlk?.note === 'probe', String(afterBlk?.note))

  console.log('\nTHE CONSTRAINT THAT CAUGHT THE FIRST BUG\n')

  /* If this ever stops failing, the CHECK has been widened and the UI's
     vocabulary is free to drift again. */
  const { error: badErr } = await writeDay(client, 'AVAILABLE')
  ok("'AVAILABLE' is still rejected by the CHECK", !!badErr,
     'the status CHECK no longer guards the vocabulary')

  const stillBlocked = await readAfterRelogin()
  ok('...and the rejected write changed nothing', stillBlocked?.status === 'BLOCKED',
     String(stillBlocked?.status))

  console.log('\nCLEARING A MARK\n')

  const { error: delErr } = await client.from('vendor_availability')
    .delete().eq('vendor_id', partner.id).eq('slot_date', DATE)
  ok('clearing the day is accepted', !delErr, delErr?.message)
  ok('...and the day is genuinely unmarked', (await readAfterRelogin()) === null,
     'a row is still there')
} catch (err) {
  failure = err
} finally {
  /* ── Restore, whatever happened above ────────────────────────────── */
  await admin.from('vendor_availability')
    .delete().eq('vendor_id', partner.id).eq('slot_date', DATE)
  if (original) {
    const { id, created_at, updated_at, location, ...keep } = original
    await admin.from('vendor_availability').insert(keep)
    console.log(`\n  restored the partner's original ${original.status} row on ${DATE}`)
  } else {
    console.log(`\n  ${DATE} had no row before this run, and has none now`)
  }
  await client.auth.signOut()
}

if (failure) {
  console.error(`\n  x the run itself failed: ${failure.message}\n`)
  process.exit(1)
}
console.log(`\n  ${ran - bad}/${ran} passed\n`)
process.exit(bad === 0 ? 0 : 1)
