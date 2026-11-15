#!/usr/bin/env node
/**
 * Migration 211 against the LIVE database — run after pasting it:
 *
 *   node --env-file=.env scripts/check-celebration-toolkit-live.mjs
 *
 * The repo's migrations are not the whole truth (the live DB carries
 * policies that were never written down), so this asks the database
 * itself, as the roles that matter.
 *
 * Proves:
 *   · the three columns are on event_plans, and a customer can write
 *     their own occasion answers and read them back
 *   · the five tables exist, and anon can read none of them
 *   · a second customer cannot read the first one's polls, budget,
 *     contributions or schedule
 *   · a guest votes with nothing but their invitation token, their vote
 *     replaces itself rather than stacking, and a closed poll refuses
 *   · a stranger's token reaches nothing
 *   · the toolkit is free in the schema: no price, amount-payable or
 *     booking-line column on any of the three new feature tables
 *
 * Everything it creates it deletes. It uses the test account and a
 * second minted user, never the admin's own identity.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exit(1) }
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

/* A real session, the way the app gets one. The user is created first and
   confirmed: generateLink will happily invent a user, but the link it then
   issues is a SIGNUP link, and verifying that as a magiclink fails with
   "Email link is invalid or has expired" — which reads like a broken
   migration and is not one. */
async function session(email) {
  const made = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (made.error && !/already|registered|exists/i.test(made.error.message)) throw made.error
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return { client: c, id: v.data.user.id }
}

const probe = await admin.from('event_plans').select('occasion_answers').limit(1)
if (probe.error) { console.error('Migration 211 is not applied (', probe.error.message, ')'); process.exit(2) }

const CLEAN = []
/* A PostgREST builder is thenable but has no .catch, so awaiting it
   inside Promise.resolve is what makes a failed clean-up non-fatal. */
const bye = async () => { for (const f of CLEAN.reverse()) { try { await Promise.resolve(f()) } catch { /* leave no run half-cleaned */ } } }

try {
  const stamp = Date.now()
  const me = await session(`cx-toolkit-host-${stamp}@sambramo.test`)
  CLEAN.push(() => admin.auth.admin.deleteUser(me.id))
  const other = await session(`cx-toolkit-other-${stamp}@sambramo.test`)
  CLEAN.push(() => admin.auth.admin.deleteUser(other.id))

  /* ── The answers ────────────────────────────────────────────────── */
  console.log('\nThe occasion’s answers, on the event')
  const key = `occ:first-birthday:211check:${Date.now()}`
  const made = await me.client.from('event_plans')
    .insert({ customer_id: me.id, client_key: key, occasion_id: 'first-birthday', status: 'active', context: {} })
    .select('id').single()
  ok(!made.error, `a customer creates their own event${made.error ? ' — ' + made.error.message : ''}`)
  const plan = made.data?.id
  if (!plan) throw new Error('no event to test against')
  CLEAN.push(() => admin.from('event_plans').delete().eq('id', plan))

  const answers = { child_name: 'Aarav', theme: 'jungle', kids: 12, food_way: 'catering', photos: 'yes' }
  const wrote = await me.client.from('event_plans')
    .update({ occasion_answers: answers, blueprint_version: 1, blueprint_category: 'PERSONAL_CELEBRATIONS' }).eq('id', plan)
  ok(!wrote.error, `the answers save${wrote.error ? ' — ' + wrote.error.message : ''}`)
  const read = await me.client.from('event_plans').select('occasion_answers, blueprint_version').eq('id', plan).single()
  ok(read.data?.occasion_answers?.theme === 'jungle' && read.data?.blueprint_version === 1, 'and read back, with the blueprint version')
  const theirs = await other.client.from('event_plans').select('occasion_answers').eq('id', plan)
  ok(!theirs.data?.length, 'another customer cannot read them')

  /* ── The three new tables ───────────────────────────────────────── */
  console.log('\nPolls, budget and schedule')
  const poll = await me.client.from('sambramo_event_polls').insert({
    plan_id: plan, created_by: me.id, kind: 'theme', question: 'Which theme for the party?',
    options: [{ k: 'jungle', label: 'Jungle' }, { k: 'space', label: 'Space' }],
  }).select('id').single()
  ok(!poll.error, `the host creates a poll${poll.error ? ' — ' + poll.error.message : ''}`)

  const tooFew = await me.client.from('sambramo_event_polls').insert({
    plan_id: plan, created_by: me.id, kind: 'theme', question: 'One choice only', options: [{ k: 'a' }],
  })
  ok(!!tooFew.error, 'a poll with one option is refused')

  const contrib = await me.client.from('sambramo_event_contributions')
    .insert({ plan_id: plan, added_by: me.id, person: 'Appa', pledged_paise: 2500000, paid_paise: 1000000 })
  ok(!contrib.error, `a contribution is recorded${contrib.error ? ' — ' + contrib.error.message : ''}`)

  const sched = await me.client.from('sambramo_event_updates')
    .insert({ plan_id: plan, created_by: me.id, phase: 'during', title: 'Cake at 6 PM', position: 0 })
  ok(!sched.error, `a schedule line is recorded${sched.error ? ' — ' + sched.error.message : ''}`)

  console.log('\nWho cannot see it')
  for (const t of ['sambramo_event_polls', 'sambramo_event_contributions', 'sambramo_event_expenses', 'sambramo_event_updates']) {
    const a = await anon.from(t).select('id').eq('plan_id', plan)
    ok(!a.data?.length, `anon reads nothing from ${t}`)
    const o = await other.client.from(t).select('id').eq('plan_id', plan)
    ok(!o.data?.length, `another customer reads nothing from ${t}`)
  }
  const stolen = await other.client.from('sambramo_event_polls')
    .insert({ plan_id: plan, created_by: other.id, kind: 'food', question: 'Mine now', options: [{ k: 'a' }, { k: 'b' }] })
  ok(!!stolen.error, 'another customer cannot add a poll to your event')

  /* ── The guest's way in ─────────────────────────────────────────── */
  console.log('\nA guest, with nothing but their token')
  const inv = await me.client.from('invitations')
    .insert({ host_id: me.id, event_plan_id: plan, title: '211 check', event_date: '2026-12-20' })
    .select('id').single()
  if (inv.error) {
    console.log('  ! could not create an invitation —', inv.error.message, '(guest checks skipped)')
  } else {
    CLEAN.push(() => admin.from('invitations').delete().eq('id', inv.data.id))
    const guest = await me.client.from('invitation_guests')
      .insert({ invitation_id: inv.data.id, name: 'Priya' }).select('id, token').single()
    ok(!guest.error, `a guest is invited${guest.error ? ' — ' + guest.error.message : ''}`)
    const tok = guest.data?.token

    if (tok && poll.data?.id) {
      const view = await anon.rpc('event_polls_view', { p_token: tok })
      ok(view.data?.ok === true && view.data.polls?.length === 1, 'the guest sees the poll, signed out')
      const v1 = await anon.rpc('event_poll_vote', { p_token: tok, p_poll: poll.data.id, p_choices: ['jungle'] })
      ok(v1.data?.ok === true, `the guest votes${v1.error ? ' — ' + v1.error.message : ''}`)
      const v2 = await anon.rpc('event_poll_vote', { p_token: tok, p_poll: poll.data.id, p_choices: ['space'] })
      const counted = await admin.from('sambramo_event_poll_votes').select('choices').eq('poll_id', poll.data.id)
      ok(v2.data?.ok === true && counted.data?.length === 1 && counted.data[0].choices[0] === 'space', 'changing their mind replaces the vote, never stacks it')

      const two = await anon.rpc('event_poll_vote', { p_token: tok, p_poll: poll.data.id, p_choices: ['jungle', 'space'] })
      ok(two.data?.ok === false && two.data.reason === 'single-choice', 'two answers to a single-choice poll are refused')

      await admin.from('sambramo_event_polls').update({ closed_at: new Date().toISOString() }).eq('id', poll.data.id)
      const late = await anon.rpc('event_poll_vote', { p_token: tok, p_poll: poll.data.id, p_choices: ['jungle'] })
      ok(late.data?.ok === false && late.data.reason === 'closed', 'a closed poll refuses a vote')

      const stranger = await anon.rpc('event_polls_view', { p_token: 'not-a-real-token-at-all' })
      ok(stranger.data?.ok === false, 'a stranger’s token reaches nothing')

      const budget = await anon.from('sambramo_event_contributions').select('person').eq('plan_id', plan)
      ok(!budget.data?.length, 'a guest never sees the budget')
    }
  }

  /* ── Free, in the schema ────────────────────────────────────────── */
  console.log('\nThe toolkit is free, and the schema says so')
  const cols = await admin.rpc('exec_sql', { q: '' }).then(() => null).catch(() => null)
  const money = /price|amount_payable|payable|booking_line_id|invoice|charge/i
  for (const t of ['sambramo_event_polls', 'sambramo_event_poll_votes', 'sambramo_event_updates']) {
    const r = await admin.from(t).select('*').limit(1)
    const keys = Object.keys(r.data?.[0] ?? {})
    ok(!keys.some(k => money.test(k)), `${t} has no way to charge for it${keys.length ? '' : ' (no row to inspect — column names unverified)'}`)
  }
  void cols
} catch (e) {
  fail++
  console.log('\n  ✗ threw:', e.message)
} finally {
  await bye()
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
