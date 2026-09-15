#!/usr/bin/env node
/**
 * Migration 125, proved as the weakest caller.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS ASKING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The three tables 125 adds are the first in this app that a partner
 * WRITES to. Documents, listings and payout details are all things a
 * partner owns; a notification is something we say about them, and a
 * message has a sender that decides who is believed to have said it.
 * Both are new ways to get authorship wrong.
 *
 * So, as Partner A, with a real session minted the way the app mints
 * one:
 *
 *   1 · Can I read Partner B's notifications?      must be 0 rows
 *   2 · Can I write myself a notification?         must be refused
 *   3 · Can I rewrite what a notification says?    must be silently kept
 *   4 · Can I read Partner B's thread?             must be 0 rows
 *   5 · Can I post into Partner B's thread?        must be refused
 *   6 · Can I send a message AS Sambramo?          must come back 'partner'
 *   7 · Can I read Partner B's preferences?        must be 0 rows
 *
 * Service-role is used for exactly two things: picking the partners and
 * planting the rows that make the test non-vacuous. Never to make an
 * attempt — a suite written with it passes against a database with no
 * policies at all.
 *
 * ── Reading zero rows is the pass, and zero rows can also be a lie ──
 * RLS filters rather than raising, so a leak looks like a successful
 * query. Every read below is a COUNT against a row this script has just
 * planted and verified is visible to its owner, so "0" means hidden
 * rather than absent.
 *
 *   node scripts/check-inbox-isolation.mjs
 *
 * Exit 2 means 125 has not been applied yet. That is not a pass.
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
/**
 * Everything runs inside one function so that a stop is a RETURN.
 *
 * `process.exit()` on Windows, with an undici socket still pooled from
 * the probe below or from any supabase call, trips
 * `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and reports
 * 127 — so "125 is not applied" came back looking like a crash, and a
 * genuine 1 would have too. The code is set on `process.exitCode` and
 * the loop is allowed to drain on its own.
 */
async function main() {
/* ── Is 125 even there? ─────────────────────────────────────────────
   Asked over plain fetch, BEFORE any supabase client exists. A client
   keeps sockets open, and process.exit() with one in flight trips a
   libuv assertion on Windows that replaces the exit code with 127 —
   which would turn "125 is not applied" into what looks like a crash. */
const probe = await fetch(`${URL_}/rest/v1/partner_notifications?select=id&limit=1`, {
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
})
await probe.text()  // drain, so the socket can be returned and closed
if (probe.status === 404) {
  console.log('\n  Migration 125 is not applied to this database.\n')
  console.log('  supabase/migrations/125_somewhere_to_say_it.sql needs pasting into')
  console.log('  the SQL editor before this can run. Until then the app hides the')
  console.log('  three sections rather than showing a partner an error, which is')
  console.log('  correct behaviour and is NOT what this script is testing.\n')
  return 2
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

/* ── Two partners who can both actually sign in ──────────────────── */
const { data: candidates } = await admin
  .from('vendors').select('id, profile_id, business_name')
  .not('profile_id', 'is', null).limit(20)

const sessions = []
for (const v of candidates ?? []) {
  if (sessions.length === 2) break
  const s = await sessionFor(v)
  if (s) sessions.push(s)
}
if (sessions.length < 2) {
  console.error('\n  Need two partners with working sign-ins. Found ' + sessions.length + '.\n')
  return 1
}
const [A, B] = sessions
console.log(`\n  A = ${A.vendor.business_name}\n  B = ${B.vendor.business_name}\n`)

/* ── Plant rows on B, so "zero" means hidden and not absent ──────── */
const MARK = `isolation-probe-${Date.now()}`
const { data: notif, error: notifErr } = await admin
  .from('partner_notifications')
  .insert({ vendor_id: B.vendor.id, kind: 'system', title: MARK,
            body: 'Planted by check-inbox-isolation.mjs' })
  .select('id, title').single()
if (notifErr) { console.error('  Could not plant a notification: ' + notifErr.message); return 1 }

const { data: msg, error: msgErr } = await admin
  .from('partner_messages')
  .insert({ vendor_id: B.vendor.id, sender: 'operator', body: MARK })
  .select('id').single()
if (msgErr) { console.error('  Could not plant a message: ' + msgErr.message); return 1 }

await admin.from('partner_notification_prefs')
  .upsert({ vendor_id: B.vendor.id, payouts: false }, { onConflict: 'vendor_id' })

const planted = []

try {
  console.log('THE ROWS ARE REALLY THERE\n')

  const bSees = await B.client.from('partner_notifications')
    .select('id').eq('id', notif.id)
  ok('B can see B\'s own notification', (bSees.data ?? []).length === 1,
     'the test is vacuous if the owner cannot see it either')

  const bThread = await B.client.from('partner_messages').select('id').eq('id', msg.id)
  ok('B can see B\'s own message', (bThread.data ?? []).length === 1)

  console.log('\nA CANNOT READ B\n')

  const aNotif = await A.client.from('partner_notifications')
    .select('id, title').eq('vendor_id', B.vendor.id)
  ok('A reads none of B\'s notifications', (aNotif.data ?? []).length === 0,
     `${(aNotif.data ?? []).length} rows came back`)

  const aByMark = await A.client.from('partner_notifications')
    .select('id').eq('title', MARK)
  ok('and cannot find it by searching for it', (aByMark.data ?? []).length === 0)

  const aMsg = await A.client.from('partner_messages')
    .select('id, body').eq('vendor_id', B.vendor.id)
  ok('A reads none of B\'s thread', (aMsg.data ?? []).length === 0,
     `${(aMsg.data ?? []).length} rows came back`)

  const aPrefs = await A.client.from('partner_notification_prefs')
    .select('vendor_id').eq('vendor_id', B.vendor.id)
  ok('A reads none of B\'s preferences', (aPrefs.data ?? []).length === 0)

  console.log('\nA CANNOT WRITE WHAT ONLY WE MAY WRITE\n')

  /* A notification a partner can write is a notification a partner can
     write to somebody else's feed. There is no INSERT policy at all. */
  const selfNotify = await A.client.from('partner_notifications')
    .insert({ vendor_id: A.vendor.id, kind: 'payout', title: 'Your payout is on the way' })
    .select('id')
  ok('A cannot write a notification to their own feed',
     !!selfNotify.error || (selfNotify.data ?? []).length === 0,
     'a partner wrote themselves a payout notice')
  if (!selfNotify.error && selfNotify.data?.[0]) planted.push(['partner_notifications', selfNotify.data[0].id])

  const notifyB = await A.client.from('partner_notifications')
    .insert({ vendor_id: B.vendor.id, kind: 'system', title: 'Written by A' })
    .select('id')
  ok('A cannot write into B\'s feed',
     !!notifyB.error || (notifyB.data ?? []).length === 0)
  if (!notifyB.error && notifyB.data?.[0]) planted.push(['partner_notifications', notifyB.data[0].id])

  /* B may mark their own read. B must not be able to change what it
     says while doing so -- that is the guard trigger, not the policy. */
  const rewrite = await B.client.from('partner_notifications')
    .update({ title: 'Rewritten by B', read_at: new Date().toISOString() })
    .eq('id', notif.id).select('title, read_at').maybeSingle()
  ok('B may mark it read', !!rewrite.data?.read_at,
     rewrite.error?.message ?? 'read_at did not take')
  ok('but the title is put back by the trigger', rewrite.data?.title === MARK,
     `title is now "${rewrite.data?.title}"`)

  const deleteMine = await B.client.from('partner_notifications')
    .delete().eq('id', notif.id).select('id')
  ok('B cannot delete a notification', (deleteMine.data ?? []).length === 0,
     'a partner deleted a decision about their own account')

  console.log('\nA MESSAGE CANNOT CLAIM TO BE FROM US\n')

  const intoB = await A.client.from('partner_messages')
    .insert({ vendor_id: B.vendor.id, body: 'Posted by A into B' }).select('id')
  ok('A cannot post into B\'s thread', !!intoB.error || (intoB.data ?? []).length === 0)
  if (!intoB.error && intoB.data?.[0]) planted.push(['partner_messages', intoB.data[0].id])

  const asUs = await A.client.from('partner_messages')
    .insert({ vendor_id: A.vendor.id, sender: 'operator',
              body: 'Your payout was sent. -- Sambramo' })
    .select('id, sender').single()
  ok('A can write in their own thread', !asUs.error, asUs.error?.message ?? '')
  ok('and the trigger stamps it "partner" whatever they sent',
     asUs.data?.sender === 'partner', `sender came back "${asUs.data?.sender}"`)
  if (asUs.data?.id) planted.push(['partner_messages', asUs.data.id])

  const editOwn = await A.client.from('partner_messages')
    .update({ body: 'I never said that' }).eq('id', asUs.data?.id ?? msg.id).select('id')
  ok('A cannot edit a message after sending it', (editOwn.data ?? []).length === 0,
     'a thread that can be rewritten is not a record')

  console.log('\nPREFERENCES ARE OWN-ROW ONLY\n')

  const setOwn = await A.client.from('partner_notification_prefs')
    .upsert({ vendor_id: A.vendor.id, reviews: false }, { onConflict: 'vendor_id' })
    .select('vendor_id, reviews').maybeSingle()
  ok('A can set their own preferences', setOwn.data?.reviews === false,
     setOwn.error?.message ?? 'nothing came back')
  if (setOwn.data) planted.push(['partner_notification_prefs', A.vendor.id])

  const setB = await A.client.from('partner_notification_prefs')
    .upsert({ vendor_id: B.vendor.id, payouts: true }, { onConflict: 'vendor_id' })
    .select('vendor_id')
  ok('A cannot set B\'s preferences', !!setB.error || (setB.data ?? []).length === 0)

  /* Read back with service role: a refused write that silently changed
     the row anyway would pass the assertion above. */
  const { data: bPref } = await admin.from('partner_notification_prefs')
    .select('payouts').eq('vendor_id', B.vendor.id).maybeSingle()
  ok('and B\'s row is untouched', bPref?.payouts === false,
     `B.payouts is ${bPref?.payouts}`)

} finally {
  /* ── Put the database back ──────────────────────────────────────
     An earlier isolation script in this repo renamed a real partner
     and left it that way. Everything this one planted is removed,
     including anything a FAILING assertion managed to write. */
  await admin.from('partner_notifications').delete().eq('id', notif.id)
  await admin.from('partner_messages').delete().eq('id', msg.id)
  await admin.from('partner_notification_prefs').delete().eq('vendor_id', B.vendor.id)
  for (const [table, id] of planted) {
    const col = table === 'partner_notification_prefs' ? 'vendor_id' : 'id'
    await admin.from(table).delete().eq(col, id)
  }
  const { data: left } = await admin.from('partner_notifications').select('id').eq('title', MARK)
  const { data: leftMsg } = await admin.from('partner_messages').select('id').eq('body', MARK)
  ok('nothing this script planted is still there',
     (left ?? []).length === 0 && (leftMsg ?? []).length === 0)
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
return bad ? 1 : 0
}

process.exitCode = await main()
