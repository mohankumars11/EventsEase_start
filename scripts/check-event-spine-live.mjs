#!/usr/bin/env node
/**
 * Migration 202 against the LIVE database — run after pasting it:
 *
 *   node --env-file=.env scripts/check-event-spine-live.mjs
 *
 * Proves, as the roles that matter (the live DB carries policies the repo
 * does not show, so this asks the database itself, never the service role):
 *   · every plan has an event code, every requirement a requirement code
 *   · every trade in the registry has a readable code_ref (34, 35 once 212 is applied)
 *   · saving a configuration versions it; an incomplete one is NOT dispatchable
 *   · a complete one is, and one tap claims it
 *   · the SAME tap retried returns the SAME batch — no duplicate
 *   · a SECOND tap finds nothing left to send — no duplicate dispatch
 *   · "already arranged" and "not needed" close a requirement and stop dispatch
 *   · handing a requirement to a planner is refused when there is no planner
 *   · another customer can neither read nor move any of it
 *   · a failed dispatch is put back to ready by the server-only close
 * Everything it creates is deleted at the end.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exit(1) }
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

async function session(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return c
}

const probe = await admin.from('event_plan_services').select('requirement_code, owner, state, config_version').limit(1)
// No hard process.exit anywhere in this file: on Windows/Node 24 it races
// the HTTP client's open handles, trips a libuv assertion and reports 127
// instead of the real result. Setting exitCode and letting the loop drain
// gives the right code every time.
if (probe.error) {
  console.error('Migration 202 is not applied (', probe.error.message, ')')
  process.exitCode = 2
} else await run()

async function run() {

console.log('Codes')
const refs = await admin.from('sambramo_trade_registry').select('id, code_ref')
ok(refs.data?.length >= 34 && refs.data.every(r => r.code_ref), `all ${refs.data?.length} trades have a code_ref (${refs.data?.filter(r => r.code_ref).length})`)
ok(new Set(refs.data.map(r => r.code_ref)).size === refs.data.length, 'every code_ref is unique')
const noCode = await admin.from('event_plans').select('id', { count: 'exact', head: true }).is('plan_code', null)
ok((noCode.count ?? 0) === 0, `no plan is missing its event code (${noCode.count} missing)`)

console.log('A customer configures a requirement')
const me = await session('mohanpes328a@gmail.com')
const { data: whoami } = await me.auth.getUser()
const myId = whoami.user.id
const key = `spine-check-${Date.now()}`
const plan = await me.from('event_plans').insert({
  customer_id: myId, client_key: key, occasion_id: 'birthday-party',
  context: { guests: 60, date: '2027-01-20' }, status: 'active',
}).select('id, plan_code, fulfilment_mode').single()
ok(!plan.error && /^SBM-EVT-\d{4}$/.test(plan.data?.plan_code ?? ''), `event code issued: ${plan.data?.plan_code ?? plan.error?.message}`)
if (!plan.data) { console.error(`cannot create the test event: ${plan.error?.message}`); process.exitCode = 1; return }
const planId = plan.data.id

const mk = async (trade) => (await me.from('event_plan_services')
  .insert({ plan_id: planId, trade_id: trade, recommendation_status: 'CORE', decision: 'selected' })
  .select('id, requirement_code, owner, state, config_version').single())
const photo = await mk('photography')
const decor = await mk('decoration_floral')
const cater = await mk('catering_food')
ok(photo.data?.requirement_code === `${plan.data.plan_code}-PHOTO-01`, `requirement code: ${photo.data?.requirement_code ?? photo.error?.message}`)
ok(decor.data?.requirement_code?.endsWith('-DECOR-01'), `second trade gets its own code: ${decor.data?.requirement_code}`)
ok(photo.data?.state === 'selected' && photo.data?.owner === 'marketplace', 'a new requirement starts selected / marketplace')
ok(photo.data?.config_version === 0, 'config_version starts at 0 — never configured')

const notYet = await me.rpc('sambramo_requirement_is_dispatchable', { p_id: photo.data.id })
ok(notYet.data === false, 'an unconfigured requirement is NOT dispatchable')

/* Since 203 the server decides what is missing, from the published
   template; required answers live in data/requiredAnswers.js. A DJ needs
   the kind of act — so a DJ is where "missing" can be tested. Photography
   needs nothing beyond the event, so it is ready the moment it is saved. */
const { data: tpl } = await admin.from('sambramo_requirement_templates')
  .select('fields, required_keys').eq('trade_id', 'dj_music').eq('published', true).single()
ok(tpl.required_keys.length >= 1, `a DJ has a required answer to test with (${tpl.required_keys.join(', ')})`)
const allReq = Object.fromEntries(tpl.required_keys.map(k => { const f = tpl.fields.find(x => x.key === k); return [k, f?.options?.length ? [f.options[0].value] : true] }))
const dj = await mk('dj_music')

const half = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: dj.data.id, p_config: {} })
ok(half.data?.[0]?.out_state === 'configuring' && half.data?.[0]?.out_version === 1, `incomplete save → configuring, version 1 (${half.error?.message ?? ''})`)
ok((half.data?.[0]?.out_missing ?? []).includes(tpl.required_keys[0]), `the server names the missing answer (${(half.data?.[0]?.out_missing ?? []).join(', ')})`)
ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: dj.data.id })).data === false,
  'a requirement with a missing answer is NOT dispatchable')
const full = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: dj.data.id, p_config: allReq })
ok(full.data?.[0]?.out_state === 'ready' && full.data?.[0]?.out_version === 2, 'complete save → ready, version 2')
ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: dj.data.id })).data === true,
  'a configured requirement IS dispatchable')
/* Out of the way, so the batch below has exactly one requirement to claim. */
await me.rpc('sambramo_set_requirement_owner', { p_plan_service_id: dj.data.id, p_owner: 'not_needed' })

const ph = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: photo.data.id, p_config: {} })
ok(ph.data?.[0]?.out_state === 'ready', 'photography, with nothing but the event, is ready')

console.log('Ownership')
await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: decor.data.id, p_config: {} })
const arranged = await me.rpc('sambramo_set_requirement_owner', { p_plan_service_id: decor.data.id, p_owner: 'arranged', p_note: 'my cousin is doing it' })
ok(arranged.data?.[0]?.out_owner === 'arranged' && arranged.data?.[0]?.out_state === 'closed', `"already arranged" closes it (${arranged.error?.message ?? ''})`)
ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: decor.data.id })).data === false,
  'an arranged requirement is never dispatched')
const audit = await me.from('sambramo_requirement_ownership_audit').select('from_owner, to_owner').eq('plan_service_id', decor.data.id)
ok(audit.data?.some(r => r.from_owner === 'marketplace' && r.to_owner === 'arranged'), 'the ownership change is on the audit trail')
const noPlanner = await me.rpc('sambramo_set_requirement_owner', { p_plan_service_id: cater.data.id, p_owner: 'planner' })
ok(!!noPlanner.error, `handing to a planner is refused with no planner engaged (${noPlanner.error?.message?.slice(0, 48) ?? 'NOT REFUSED'})`)

console.log('One tap, and only one')
const tap = `${key}-tap1`
const b1 = await me.rpc('sambramo_open_dispatch_batch', { p_plan_id: planId, p_client_key: tap })
const batch1 = b1.data?.[0]
ok(!b1.error && batch1?.out_ready?.length === 1, `one requirement claimed, not three (${batch1?.out_ready?.length} — ${b1.error?.message ?? ''})`)
ok(batch1?.out_ready?.[0] === photo.data.id, 'the claimed one is the configured one')
const reasons = (batch1?.out_skipped ?? []).reduce((m, s) => ({ ...m, [s.reason]: (m[s.reason] ?? 0) + 1 }), {})
ok(reasons.already_arranged === 1, 'décor skipped as already_arranged')
ok(reasons.not_configured === 1, 'catering skipped as not_configured')

const again = await me.rpc('sambramo_open_dispatch_batch', { p_plan_id: planId, p_client_key: tap })
ok(again.data?.[0]?.out_batch_id === batch1.out_batch_id, 'the same tap retried returns the SAME batch — no duplicate')
const batches = await me.from('sambramo_dispatch_batches').select('id').eq('plan_id', planId)
ok(batches.data?.length === 1, `one batch row exists, not two (${batches.data?.length})`)

const b2 = await me.rpc('sambramo_open_dispatch_batch', { p_plan_id: planId, p_client_key: `${key}-tap2` })
ok(b2.data?.[0]?.out_ready?.length === 0, 'a second tap has nothing left to send — no duplicate dispatch')
ok((b2.data?.[0]?.out_skipped ?? []).some(s => s.reason === 'already_sent'), 'and says photography was already sent')

console.log('A failed dispatch is put back')
await admin.rpc('sambramo_close_dispatch_batch', { p_batch_id: batch1.out_batch_id, p_dispatched: [] })
const back = await me.from('event_plan_services').select('state, dispatch_batch_id').eq('id', photo.data.id).single()
ok(back.data?.state === 'ready' && back.data?.dispatch_batch_id === null, 'nothing dispatched → the requirement is ready again')
const closed = await me.from('sambramo_dispatch_batches').select('status').eq('id', batch1.out_batch_id).single()
ok(closed.data?.status === 'failed', 'and the batch reads failed, not done')
ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: photo.data.id })).data === true, 'so it can be sent again')

console.log('Only the server may close a batch or link a line')
const sneak = await me.rpc('sambramo_close_dispatch_batch', { p_batch_id: batch1.out_batch_id, p_dispatched: [photo.data.id] })
ok(!!sneak.error, `a customer cannot close a batch (${sneak.error?.code ?? 'NOT REFUSED'})`)
const sneak2 = await me.rpc('sambramo_link_line_to_requirement', { p_line_id: photo.data.id, p_plan_service_id: photo.data.id })
ok(!!sneak2.error, `a customer cannot link a booking line (${sneak2.error?.code ?? 'NOT REFUSED'})`)

console.log('The server-owned columns are the server’s (204)')
const refused = r => !!r.error && r.error.code === '42501'
ok(refused(await me.from('event_plan_services').update({ config_version: 99 }).eq('id', photo.data.id).select('id')),
  'a customer cannot set config_version by hand')
ok(refused(await me.from('event_plan_services').update({ state: 'ready', missing_fields: [] }).eq('id', cater.data.id).select('id')),
  'a customer cannot mark a requirement ready by hand')
ok(refused(await me.from('event_plan_services').insert({ plan_id: planId, trade_id: 'dj_music', decision: 'selected',
  state: 'ready', config_version: 7, config: { anything: true } }).select('id')),
  'a customer cannot INSERT a requirement already ready (validation cannot be skipped)')
ok(refused(await me.from('event_plan_services').update({ owner: 'not_needed' }).eq('id', cater.data.id).select('id')),
  'owner moves only through sambramo_set_requirement_owner')
ok(refused(await me.from('event_plan_services').update({ trade_id: 'videography' }).eq('id', photo.data.id).select('id')),
  'a configured requirement cannot be moved to another trade')
ok(refused(await me.from('event_plans').update({ plan_code: 'SBM-EVT-HACK' }).eq('id', planId).select('id')),
  'a customer cannot rewrite the event code')

/* The writes the app really makes must keep working. */
const mode = await me.from('event_plans').update({ fulfilment_mode: 'hybrid', fulfilment_mode_set_at: '2000-01-01T00:00:00Z' }).eq('id', planId).select('fulfilment_mode, fulfilment_mode_set_at').single()
ok(!mode.error && mode.data?.fulfilment_mode === 'hybrid', 'choosing how the event is organised still works')
ok(mode.data && !mode.data.fulfilment_mode_set_at?.startsWith('2000'), 'and when it was chosen is the server’s clock, not the phone’s')
const save = await me.from('event_plan_services').upsert(
  [{ plan_id: planId, trade_id: 'catering_food', recommendation_status: 'CORE', decision: 'recommended', vendor_service_id: null }],
  { onConflict: 'plan_id,trade_id' }).select('id')
ok(!save.error, `savePlan’s upsert still works (${save.error?.message ?? ''})`)


console.log('Another customer')
const otherEmail = `sambramo.spinecheck.${Date.now()}@example.com`
await admin.auth.admin.createUser({ email: otherEmail, email_confirm: true })
const other = await session(otherEmail)
ok(!(await other.from('event_plans').select('id').eq('id', planId)).data?.length, 'cannot read the event')
ok(!(await other.from('event_plan_services').select('id').eq('plan_id', planId)).data?.length, 'cannot read its requirements')
ok(!(await other.from('sambramo_dispatch_batches').select('id').eq('plan_id', planId)).data?.length, 'cannot read its batches')
ok(!!(await other.rpc('sambramo_set_requirement_owner', { p_plan_service_id: photo.data.id, p_owner: 'not_needed' })).error,
  'cannot move somebody else’s requirement')
ok(!!(await other.rpc('sambramo_save_requirement_config', { p_plan_service_id: photo.data.id, p_config: allReq })).error,
  'cannot configure somebody else’s requirement')
ok(!(await anon.from('event_plan_services').select('id').eq('plan_id', planId)).data?.length, 'anon reads nothing')

console.log('Nothing contradicts itself')
const bad = await admin.from('event_plan_services').select('id, decision, owner')
  .or('and(decision.eq.removed,owner.not.in.("not_needed","marketplace")),and(decision.eq.arranged,owner.not.in.("arranged","marketplace"))')
ok((bad.data?.length ?? 0) === 0, `no requirement's decision contradicts its owner (${bad.data?.length ?? 0})`)


console.log('Destructive probes — run last')
/* If 204 is missing these deletes SUCCEED, so they run after everything
   else: earlier assertions must never pass against an event that is gone. */
/* An installed APK re-sends `decision` for every row in one upsert. A stale
   answer on a DISPATCHED row must not fail the save — it must just lose. */
const b3 = await me.rpc('sambramo_open_dispatch_batch', { p_plan_id: planId, p_client_key: `${key}-tap3` })
ok(b3.data?.[0]?.out_ready?.includes(photo.data.id), 'photography is claimed again (it was put back to ready)')
const stale = await me.from('event_plan_services').upsert(
  [{ plan_id: planId, trade_id: 'photography', recommendation_status: 'CORE', decision: 'recommended' }],
  { onConflict: 'plan_id,trade_id' }).select('decision, state').single()
ok(!stale.error, `a stale answer on a dispatched service does not fail the save (${stale.error?.message ?? ''})`)
ok(stale.data?.decision === 'selected' && stale.data?.state === 'dispatched', 'and it does not win: still selected, still dispatched')
ok(refused(await me.from('event_plan_services').delete().eq('id', photo.data.id).select('id')),
  'a service with professionals cannot be deleted')
ok(refused(await me.from('event_plans').delete().eq('id', planId).select('id')),
  'nor can the whole event (a cascade would otherwise skip the guard)')
await admin.rpc('sambramo_close_dispatch_batch', { p_batch_id: b3.data[0].out_batch_id, p_dispatched: [] })


console.log('When the line ends, the requirement comes back (204)')
/* Real booking rows, made with the service role and deleted below. They
   only ever move to expired/cancelled, so nothing that keys on a line's
   status fires for real: referral facts need delivered/settled (158), the
   day recount needs an ACCEPTED offer (132), and there are no reservations
   or escrow rows. Each one consumes a booking code (SBM-BKG-nnnn) — a gap
   in the sequence, nothing more. */
const otherId = (await other.auth.getUser()).data.user.id
const fx = cust => ({ customer_id: cust, occasion_id: 'birthday-party', occasion_name: 'Birthday Party', event_date: '2027-03-01',
  guest_count: 40, status: 'open', location: 'SRID=4326;POINT(77.5946 12.9716)', address_text: 'Spine check, Bengaluru',
  city: 'Bengaluru', area_label: 'Indiranagar', policy_version: 'trades-engine-v1', radius_km: 25 })
const lineFx = (rid, sid) => ({ request_id: rid, service_id: sid, service_name: 'Spine check', trade: 'Photography',
  quoted_amount_paise: 100, status: 'pending', policy_version: 'sambramo-custom-quote-v2', spec_mode: 'quote', platform_fee_rate: 0.08 })
const made = { lines: [], requests: [] }
const mkReq = async cust => { const r = (await admin.from('booking_requests').insert(fx(cust)).select('id').single()).data; made.requests.push(r.id); return r }
const mkLine = async (rid, sid) => { const l = (await admin.from('booking_lines').insert(lineFx(rid, sid)).select('id, trade_id').single()).data; made.lines.push(l.id); return l }
const st = async () => (await me.from('event_plan_services').select('state, booking_line_id').eq('id', photo.data.id).single()).data
try {
  const br = await mkReq(myId)
  const l1 = await mkLine(br.id, `spine-check-1-${Date.now()}`)
  ok(l1.trade_id === 'photography', `a line booked the ordinary way still gets its trade id (206) — got ${l1.trade_id}`)
  await admin.rpc('sambramo_link_line_to_requirement', { p_line_id: l1.id, p_plan_service_id: photo.data.id })
  ok((await st())?.state === 'dispatched', 'linked to a booking line → dispatched')

  await admin.from('booking_lines').update({ status: 'expired' }).eq('id', l1.id)
  ok((await st())?.state === 'ready', 'the line EXPIRED (nobody accepted) → back to ready, answers kept')
  ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: photo.data.id })).data === true,
    'so “find everything” may send it again')

  /* The customer rebooks, and checkout links the new line the way it always has. */
  const l2 = await mkLine(br.id, `spine-check-2-${Date.now()}`)
  const relink = await me.from('event_plan_services')
    .upsert([{ plan_id: planId, trade_id: 'photography', decision: 'selected', booking_line_id: l2.id }], { onConflict: 'plan_id,trade_id' })
    .select('state, booking_line_id').single()
  ok(!relink.error && relink.data?.booking_line_id === l2.id && relink.data?.state === 'dispatched',
    `checkout may link the rebooking once the old line has ended (${relink.error?.message ?? ''})`)
  ok(refused(await me.from('event_plan_services').update({ booking_line_id: l1.id }).eq('id', photo.data.id).select('id')),
    'but cannot swap a LIVE line out')

  const can = await admin.from('booking_lines').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', l2.id)
  ok(!can.error, `the fixture line can be cancelled (${can.error?.message ?? ''})`)
  ok((await st())?.state === 'selected', 'the booking was CANCELLED → back to selected: sending again is a deliberate choice')
  ok((await me.rpc('sambramo_requirement_is_dispatchable', { p_id: photo.data.id })).data === false,
    'so the next tap does not quietly resend it')

  const theirs = await mkReq(otherId)
  const lx = await mkLine(theirs.id, `spine-check-x-${Date.now()}`)
  ok(refused(await me.from('event_plan_services').update({ booking_line_id: lx.id }).eq('id', photo.data.id).select('id')),
    'nobody can link a line that belongs to another customer')
} finally {
  if (made.lines.length) await admin.from('booking_lines').delete().in('id', made.lines)
  if (made.requests.length) await admin.from('booking_requests').delete().in('id', made.requests)
  const left = await admin.from('booking_requests').select('id', { count: 'exact', head: true }).in('id', made.requests.length ? made.requests : ['00000000-0000-0000-0000-000000000000'])
  ok((left.count ?? 0) === 0, `booking fixtures removed (${made.requests.length} requests, ${made.lines.length} lines)`)
}
await admin.from('event_plans').delete().eq('id', planId)
await admin.auth.admin.deleteUser((await admin.auth.admin.listUsers()).data.users.find(u => u.email === otherEmail)?.id ?? '00000000-0000-0000-0000-000000000000').catch(() => {})
console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail ? 1 : 0
}
