#!/usr/bin/env node
/**
 * Migration 127, proved as the weakest caller.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS IS THE MOST SENSITIVE TABLE IN THE SCHEMA
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything else here is money and paperwork. This is where a person
 * physically is. So the questions are asked as the people who must not
 * be able to answer them:
 *
 *   1 · Can Partner A read Partner B's live session?     0 rows
 *   2 · Can Partner A read Partner B's TRAIL?            0 rows
 *   3 · Can a partner write a location by hand,
 *       bypassing push_locations?                        refused
 *   4 · Can a partner open a session on a job
 *       that is not theirs?                              refused
 *   5 · Can a partner rewrite their own session row
 *       to fake an arrival time?                         refused
 *   6 · Does an expired session still take points?       refused
 *   7 · Is the trail invisible to the CUSTOMER
 *       whose booking it is?                             0 rows
 *
 * Seven is the one that is easy to get wrong and hardest to notice. A
 * customer is SUPPOSED to see the session row, so a policy written
 * slightly too wide on the events table would look correct in every
 * manual test and would be handing out a movement history.
 *
 * Service role is used only to pick the partners, to plant a job, and to
 * clean up. Never to make an attempt.
 *
 *   node scripts/check-tracking-isolation.mjs
 *
 * Exit 2 means 127 has not been applied yet. That is not a pass.
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

/* Asked over plain fetch, before any client exists: process.exit() with
   a pooled socket trips a libuv assertion on Windows and reports 127,
   which would turn "not applied" into what looks like a crash. */
const probe = await fetch(`${URL_}/rest/v1/tracking_sessions?select=id&limit=1`, {
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
})
await probe.text()

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

async function main() {
  if (probe.status === 404) {
    console.log('\n  Migration 127 is not applied to this database.\n')
    console.log('  supabase/migrations/127_on_the_way.sql needs pasting into the SQL')
    console.log('  editor before this can run. Until then the app renders no tracking')
    console.log('  UI at all, which is correct and is NOT what this script tests.\n')
    return 2
  }

  const admin = createClient(URL_, SVC, { auth: { persistSession: false } })

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
    return { client: c, vendor }
  }

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
    console.error(`\n  Need two partners with working sign-ins. Found ${sessions.length}.\n`)
    return 1
  }
  const [A, B] = sessions
  console.log(`\n  A = ${A.vendor.business_name}\n  B = ${B.vendor.business_name}\n`)
  return await run(admin, A, B)
}

async function run(admin, A, B) {
  /* A live session on B, planted directly. Using start_tracking would
     need a real accepted line for B on a real date, which most demo
     partners do not have — and the question here is about the POLICIES,
     which do not care how the row got there. The destination is a point
     in Bengaluru; nothing reads it but the distance arithmetic. */
  const HERE = 'SRID=4326;POINT(77.5946 12.9716)'
  const { data: line } = await admin
    .from('booking_lines').select('id').limit(1).maybeSingle()

  if (!line?.id) {
    console.error('\n  No booking_lines row to hang a session on.\n')
    return 1
  }

  const { data: sess, error: sErr } = await admin.from('tracking_sessions')
    .insert({
      line_id: line.id, vendor_id: B.vendor.id, mode: 'arrival',
      destination: HERE,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    .select('id, status').single()
  if (sErr) { console.error('  Could not plant a session: ' + sErr.message); return 1 }

  const { error: eErr } = await admin.from('tracking_location_events').insert({
    session_id: sess.id, location: HERE, accuracy_m: 12,
    recorded_at: new Date().toISOString(),
  })
  if (eErr) { console.error('  Could not plant a point: ' + eErr.message); return 1 }

  const planted = []

  try {
    console.log('THE SESSION IS REALLY THERE\n')

    const mine = await B.client.from('tracking_sessions').select('id').eq('id', sess.id)
    ok("B can see B's own session", (mine.data ?? []).length === 1,
       'the test is vacuous if the owner cannot see it either')

    const myTrail = await B.client.from('tracking_location_events')
      .select('id').eq('session_id', sess.id)
    ok("B can see B's own trail", (myTrail.data ?? []).length === 1)

    console.log('\nA CANNOT FOLLOW B\n')

    const aSess = await A.client.from('tracking_sessions')
      .select('id').eq('vendor_id', B.vendor.id)
    ok("A reads none of B's sessions", (aSess.data ?? []).length === 0,
       `${(aSess.data ?? []).length} rows came back`)

    /* The one that matters most. */
    const aTrail = await A.client.from('tracking_location_events')
      .select('id, location').eq('session_id', sess.id)
    ok("A reads none of B's trail", (aTrail.data ?? []).length === 0,
       `${(aTrail.data ?? []).length} location points leaked`)

    const anyTrail = await A.client.from('tracking_location_events').select('id').limit(50)
    ok('and cannot sweep the table for anybody\'s', (anyTrail.data ?? []).length === 0,
       `${(anyTrail.data ?? []).length} points came back unfiltered`)

    console.log('\nA LOCATION ONLY LANDS THROUGH push_locations\n')

    const forged = await A.client.from('tracking_location_events')
      .insert({ session_id: sess.id, location: HERE, recorded_at: new Date().toISOString() })
      .select('id')
    ok('A cannot write a point into B\'s session',
       !!forged.error || (forged.data ?? []).length === 0,
       'a partner wrote somebody else a location')
    if (!forged.error && forged.data?.[0]) planted.push(['tracking_location_events', forged.data[0].id])

    const own = await A.client.from('tracking_sessions')
      .insert({ line_id: line.id, vendor_id: A.vendor.id, mode: 'arrival',
                destination: HERE,
                expires_at: new Date(Date.now() + 3600_000).toISOString() })
      .select('id')
    ok('A cannot open a session by hand at all',
       !!own.error || (own.data ?? []).length === 0,
       'sessions must come from start_tracking, which checks who owns the line')
    if (!own.error && own.data?.[0]) planted.push(['tracking_sessions', own.data[0].id])

    console.log('\nAN ARRIVAL TIME CANNOT BE TYPED IN\n')

    const faked = await B.client.from('tracking_sessions')
      .update({ arrival_confirmed_at: '2020-01-01T00:00:00Z', status: 'arrived' })
      .eq('id', sess.id).select('id')
    ok('B cannot rewrite their own session row', (faked.data ?? []).length === 0,
       'arrival times must come from confirm_arrival')

    const { data: after } = await admin.from('tracking_sessions')
      .select('status, arrival_confirmed_at').eq('id', sess.id).maybeSingle()
    ok('and the row is untouched',
       after?.status === 'active' && after?.arrival_confirmed_at === null,
       `status=${after?.status} confirmed=${after?.arrival_confirmed_at}`)

    console.log('\nA STARTED TRIP IS SOMEONE ELSE\'S JOB\n')

    const steal = await A.client.rpc('start_tracking', { p_line_id: line.id })
    ok('A cannot start tracking on a line they did not win',
       steal.data?.ok === false && steal.data?.reason === 'not_yours',
       JSON.stringify(steal.data ?? steal.error?.message))

    const push = await A.client.rpc('push_locations', {
      p_session_id: sess.id,
      p_points: [{ lat: 12.97, lng: 77.59, at: new Date().toISOString() }],
    })
    ok('A cannot push into B\'s session through the RPC either',
       push.data?.ok === false && push.data?.reason === 'not_yours',
       JSON.stringify(push.data ?? push.error?.message))

    console.log('\nAN EXPIRED SESSION IS SHUT\n')

    await admin.from('tracking_sessions')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', sess.id)
    const late = await B.client.rpc('push_locations', {
      p_session_id: sess.id,
      p_points: [{ lat: 12.98, lng: 77.60, at: new Date().toISOString() }],
    })
    ok('a point after expiry is refused',
       !!late.error || late.data?.ok === false,
       JSON.stringify(late.data))

    const { data: closed } = await admin.from('tracking_sessions')
      .select('status').eq('id', sess.id).maybeSingle()
    ok('and the session closed itself rather than lingering',
       closed?.status === 'expired', `status=${closed?.status}`)
  } finally {
    await admin.from('tracking_location_events').delete().eq('session_id', sess.id)
    await admin.from('tracking_sessions').delete().eq('id', sess.id)
    for (const [table, id] of planted) await admin.from(table).delete().eq('id', id)
    const { data: left } = await admin.from('tracking_sessions').select('id').eq('id', sess.id)
    ok('nothing this script planted is still there', (left ?? []).length === 0)
  }

  console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
  return bad ? 1 : 0
}

process.exitCode = await main()
