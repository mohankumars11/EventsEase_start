#!/usr/bin/env node
/**
 * Mode B (migration 210) against the LIVE database, as the people involved:
 * the customer, the planner they asked, a planner they did not ask, and a
 * stranger. Everything it creates is deleted at the end — fixture planners
 * (throwaway users with fixture vendors), the event, the brief, the quote,
 * the engagement and the booking rows used to prove the fee-paid trigger.
 *
 *   node --env-file=.env scripts/check-planner-mode-b-live.mjs
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts), anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }
const refused = r => !!r.error || (Array.isArray(r.data) && r.data.length === 0)

async function sessionFor(email) {
  const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const c = createClient(URL_, ANON, opts)
  const { data: s } = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  return { c, uid: s.user.id }
}
const ts = Date.now(), made = { users: [], vendors: [], requests: [], lines: [], offers: [], quotes: [], plan: null }
async function fixturePlanner(tag) {
  const email = `sambramo.planner.${tag}.${ts}@example.com`
  const { data: u } = await admin.auth.admin.createUser({ email, email_confirm: true })
  made.users.push(u.user.id)
  const { data: v, error } = await admin.from('vendors').insert({ business_name: `Fixture Planner ${tag}`, profile_id: u.user.id, category: 'Wedding Planning', is_synthetic: true })
    .select('id').single()
  if (error) throw new Error(`cannot make a fixture planner: ${error.message}`)
  made.vendors.push(v.id)
  return { ...(await sessionFor(email)), vendorId: v.id }
}

const probe = await admin.from('sambramo_planner_briefs').select('id').limit(1)
if (probe.error) { console.error('Migration 210 is not applied (', probe.error.message, ')'); process.exitCode = 2 }
else await run().catch(e => { fail++; console.log('  ✗ stopped:', e.message) }).finally(cleanup)

async function run() {
  console.log('Targets')
  const { data: sla } = await anon.from('sambramo_sla_targets').select('kind, ack_minutes, respond_minutes').eq('kind', 'planner_proposal').single()
  ok(sla?.ack_minutes === 2 && sla?.respond_minutes === 30, `the planner target is readable: acknowledge in ${sla?.ack_minutes} min, propose in ${sla?.respond_minutes}`)

  const me = await sessionFor('mohanpes328a@gmail.com')
  const asked = await fixturePlanner('asked'), other = await fixturePlanner('other')
  const strangerEmail = `sambramo.stranger.${ts}@example.com`
  made.users.push((await admin.auth.admin.createUser({ email: strangerEmail, email_confirm: true })).data.user.id)
  const stranger = await sessionFor(strangerEmail)

  const { data: plan } = await me.c.from('event_plans').insert({ customer_id: me.uid, client_key: `planner-check-${ts}`, occasion_id: 'birthday-party',
    context: { guests: 80, date: '2027-03-03' }, status: 'active' }).select('id, plan_code').single()
  made.plan = plan.id

  console.log('\nThe brief')
  const { data: brief, error: bErr } = await me.c.from('sambramo_planner_briefs').insert({ plan_id: plan.id, customer_id: me.uid, scope: 'plan_coordinate',
    priorities: ['Food', 'Guest comfort'], arranged_trades: ['venue'], planner_trades: ['catering_food', 'decoration_floral'], status: 'draft' }).select('*').single()
  ok(!bErr && brief?.status === 'draft', `the customer writes a draft brief (${bErr?.message ?? 'draft'})`)
  ok(!refused(await me.c.from('sambramo_planner_briefs').update({ theme: 'pastel garden' }).eq('id', brief.id).select('id')), 'and can edit it while it is a draft')
  ok(!(await stranger.c.from('sambramo_planner_briefs').select('id').eq('id', brief.id)).data?.length, 'a stranger cannot read it')
  const sent = await me.c.rpc('sambramo_send_planner_brief', { p_brief_id: brief.id })
  const due = sent.data?.[0]
  const mins = t => Math.round((new Date(t) - Date.now()) / 60000)
  ok(!sent.error && due?.out_group && mins(due.out_ack_due) <= 2 && mins(due.out_proposal_due) >= 28, `sent: answers due by the target (${mins(due?.out_ack_due)} / ${mins(due?.out_proposal_due)} min)`)
  ok(refused(await me.c.from('sambramo_planner_briefs').update({ theme: 'changed' }).eq('id', brief.id).select('id')), 'once sent, it cannot be quietly edited')
  ok(!!(await stranger.c.rpc('sambramo_send_planner_brief', { p_brief_id: brief.id })).error, 'nobody else can send it')

  console.log('\nThe planner asked, and the one not asked')
  const { data: q, error: qErr } = await admin.from('sambramo_quote_requests').insert({ customer_id: me.uid, vendor_id: asked.vendorId, trade_id: 'E09',
    service_name: 'Fixture Planner asked', event_date: '2027-03-03', canonical_demand: { note: 'Plan and coordinate' }, state: 'VENDOR_QUOTE',
    service_location: {}, quote_group_id: due.out_group, planner_brief_id: brief.id }).select('id').single()
  if (qErr) throw new Error(`fixture quote request: ${qErr.message}`)
  made.quotes.push(q.id)
  ok((await asked.c.from('sambramo_planner_briefs').select('id').eq('id', brief.id)).data?.length === 1, 'the planner asked can read the brief')
  ok(!(await other.c.from('sambramo_planner_briefs').select('id').eq('id', brief.id)).data?.length, 'a planner NOT asked cannot')
  ok(!!(await other.c.rpc('sambramo_planner_acknowledge', { p_quote_request_id: q.id })).error, 'nor say "on it" to it')
  const ack = await asked.c.rpc('sambramo_planner_acknowledge', { p_quote_request_id: q.id })
  ok(!ack.error && !!ack.data, 'the asked planner says "on it"')
  const seen = (await me.c.from('sambramo_quote_requests').select('acknowledged_at').eq('id', q.id).single()).data
  ok(!!seen?.acknowledged_at, 'and the customer sees it — as an acknowledgement, with no proposal yet')

  console.log('\nThe proposal')
  const { data: resp, error: rErr } = await admin.from('sambramo_quote_responses').insert({ quote_request_id: q.id, vendor_id: asked.vendorId,
    partner_amount_paise: 2000000, customer_amount_paise: 2300000, platform_fee_rate: 0.08, platform_fee_paise: 160000, status: 'SUBMITTED',
    inclusions: ['Vendor sourcing'], exclusions: ['Travel'], proposal: { approach: 'Garden evening', timeline: [{ when: '2 weeks before', what: 'Décor final' }],
      payment_schedule: [{ when: 'on booking', pct: 30 }] }, quote_valid_until: new Date(Date.now() + 7 * 864e5).toISOString() }).select('id').single()
  if (rErr) throw new Error(`fixture response: ${rErr.message}`)
  /* Same keys on every row: a bulk insert sends the union of keys and fills
     the gaps with explicit nulls, which skip column defaults. */
  const li = await admin.from('sambramo_quote_line_items').insert([
    { quote_request_id: q.id, vendor_id: asked.vendorId, quote_version: 1, sort_order: 0, description: 'Planning fee', quantity: 1, unit: 'event', unit_take_home_paise: 2000000, charged: true, is_estimate: false, estimate_note: null, source: 'planner_fee' },
    { quote_request_id: q.id, vendor_id: asked.vendorId, quote_version: 1, sort_order: 1, description: 'Catering for 80', quantity: 1, unit: 'estimate', unit_take_home_paise: 9600000, charged: false, is_estimate: true, estimate_note: 'until booked', source: 'sambramo_partner' }])
  if (li.error) throw new Error(`fixture line items: ${li.error.message}`)
  const mine = await me.c.from('sambramo_quote_responses').select('proposal, inclusions').eq('id', resp.id).single()
  ok(mine.data?.proposal?.approach === 'Garden evening', 'the customer reads the structured proposal')
  const ls = (await me.c.from('sambramo_quote_line_items').select('source, is_estimate, charged').eq('quote_request_id', q.id)).data ?? []
  ok(ls.some(l => l.source === 'planner_fee' && l.charged) && ls.some(l => l.source === 'sambramo_partner' && l.is_estimate && !l.charged),
    'the fee is the only charged line; the vendor cost is an estimate, never added to it')

  console.log('\nAccepted → engagement, pending the fee')
  ok(!!(await me.c.rpc('sambramo_set_requirement_owner', { p_plan_service_id: '00000000-0000-0000-0000-000000000000', p_owner: 'planner' })).error, '(sanity) a bogus requirement is refused')
  const eng = await admin.rpc('sambramo_open_planner_engagement', { p_quote_request_id: q.id, p_response_id: resp.id, p_booking_line_id: null })
  ok(!eng.error && !!eng.data, 'accepting opens the engagement')
  ok(!!(await me.c.rpc('sambramo_open_planner_engagement', { p_quote_request_id: q.id, p_response_id: resp.id, p_booking_line_id: null })).error, 'which only the server can do')
  const e1 = (await me.c.from('sambramo_planner_engagements').select('status, vendor_id').eq('id', eng.data).single()).data
  ok(e1?.status === 'pending_payment' && e1.vendor_id === asked.vendorId, 'pending until the fee is paid')
  ok((await asked.c.from('sambramo_planner_engagements').select('id').eq('id', eng.data)).data?.length === 1, 'the planner sees it')
  ok(!(await other.c.from('sambramo_planner_engagements').select('id').eq('id', eng.data)).data?.length, 'another planner does not')
  ok(!!(await asked.c.rpc('sambramo_planner_event', { p_plan_id: plan.id })).error, 'not engaged yet: the planner cannot open the event')

  console.log('\nThe fee is paid → engaged (the real trigger, on a real payment state)')
  const fx = { customer_id: me.uid, occasion_id: 'birthday-party', occasion_name: 'Birthday Party', event_date: '2027-03-03', guest_count: 80, status: 'open',
    location: 'SRID=4326;POINT(77.5946 12.9716)', address_text: 'Planner check', city: 'Bengaluru', area_label: 'Indiranagar', policy_version: 'trades-engine-v1', radius_km: 25 }
  const { data: br, error: brErr } = await admin.from('booking_requests').insert(fx).select('id').single()
  if (brErr) throw new Error(`fixture booking request: ${brErr.message}`)
  made.requests.push(br.id)
  const { data: line, error: lErr } = await admin.from('booking_lines').insert({ request_id: br.id, service_id: `planner-fee-${ts}`, service_name: 'Planning fee',
    trade: 'Wedding Planning', quoted_amount_paise: 1000, platform_fee_rate: 0.08, platform_fee_paise: 80, partner_amount_paise: 920, status: 'pending',
    policy_version: 'sambramo-custom-quote-v2', spec_mode: 'quote' }).select('id').single()
  if (lErr) throw new Error(`fixture line: ${lErr.message}`)
  made.lines.push(line.id)
  await admin.from('sambramo_planner_engagements').update({ booking_line_id: line.id }).eq('id', eng.data)
  const now = new Date().toISOString()
  const { data: off, error: oErr } = await admin.from('dispatch_offers').insert({ line_id: line.id, vendor_id: asked.vendorId, wave: 1, partner_amount_paise: 920,
    status: 'ACCEPTED', offered_at: now, accepted_at: now, expires_at: new Date(Date.now() + 36e5).toISOString() }).select('id').single()
  if (oErr) throw new Error(`fixture offer: ${oErr.message}`)
  made.offers.push(off.id)
  const paid = await admin.from('booking_lines').update({ status: 'paid', accepted_offer_id: off.id, accepted_at: now, paid_at: now }).eq('id', line.id)
  ok(!paid.error, `the fee line reaches paid (${paid.error?.message ?? 'paid'})`)
  const e2 = (await me.c.from('sambramo_planner_engagements').select('status, engaged_at').eq('id', eng.data).single()).data
  ok(e2?.status === 'engaged' && !!e2.engaged_at, 'paying the fee engages the planner')
  ok((await me.c.from('event_plans').select('fulfilment_mode').eq('id', plan.id).single()).data?.fulfilment_mode === 'planner', 'and the event says a planner runs it')

  console.log('\nThe planner’s workspace')
  const view = await asked.c.rpc('sambramo_planner_event', { p_plan_id: plan.id })
  ok(!view.error && view.data?.plan?.code === plan.plan_code && view.data.brief?.scope === 'plan_coordinate', 'the engaged planner opens the event and its brief')
  ok(!(view.data?.brief ?? {}).customer_id, 'without the customer’s id')
  ok(!!(await other.c.rpc('sambramo_planner_event', { p_plan_id: plan.id })).error, 'another planner cannot')
  const deco = await asked.c.rpc('sambramo_planner_propose_requirement', { p_plan_id: plan.id, p_trade_id: 'decoration_floral', p_config: {}, p_note: 'Pastel stage' })
  ok(!deco.error && /-DECOR-\d+$/.test(deco.data?.[0]?.out_code ?? ''), `the planner proposes décor (${deco.data?.[0]?.out_code ?? deco.error?.message})`)
  const dj = await asked.c.rpc('sambramo_planner_propose_requirement', { p_plan_id: plan.id, p_trade_id: 'dj_music', p_config: {}, p_note: null })
  ok(dj.data?.[0]?.out_state === 'configuring' && dj.data[0].out_missing.join() === 'performance_kinds', 'a proposal missing a required answer says so')
  ok(!!(await asked.c.rpc('sambramo_planner_propose_requirement', { p_plan_id: plan.id, p_trade_id: 'dj_music', p_config: { performance_kinds: ['__nope__'] } })).error, 'an impossible answer is refused')
  const { data: ph } = await me.c.from('event_plan_services').insert({ plan_id: plan.id, trade_id: 'photography', decision: 'selected' }).select('id').single()
  await me.c.rpc('sambramo_set_requirement_owner', { p_plan_service_id: ph.id, p_owner: 'customer' })
  ok(!!(await asked.c.rpc('sambramo_planner_propose_requirement', { p_plan_id: plan.id, p_trade_id: 'photography', p_config: {} })).error,
    'the planner cannot take over a service the customer is arranging — no duplicate fulfilment')

  console.log('\nThe customer decides')
  ok(!!(await asked.c.rpc('sambramo_customer_decide_requirement', { p_plan_service_id: deco.data[0].out_id, p_approve: true })).error, 'the planner cannot approve their own proposal')
  ok(!!(await stranger.c.rpc('sambramo_customer_decide_requirement', { p_plan_service_id: deco.data[0].out_id, p_approve: true })).error, 'nor can a stranger')
  ok((await me.c.rpc('sambramo_customer_decide_requirement', { p_plan_service_id: deco.data[0].out_id, p_approve: true })).data === 'planner', 'the customer approves décor → the planner’s')
  ok((await me.c.rpc('sambramo_customer_decide_requirement', { p_plan_service_id: dj.data[0].out_id, p_approve: false })).data === 'not_needed', 'and declines the DJ → not needed')
  const own = await me.c.rpc('sambramo_set_requirement_owner', { p_plan_service_id: ph.id, p_owner: 'planner' })
  ok(!own.error && own.data?.[0]?.out_owner === 'planner', 'with a planner engaged, the customer can hand them a service')
}

async function cleanup() {
  if (made.plan) await admin.from('event_plans').delete().eq('id', made.plan)
  if (made.offers.length) await admin.from('dispatch_offers').delete().in('id', made.offers)
  if (made.lines.length) await admin.from('booking_lines').delete().in('id', made.lines)
  if (made.requests.length) await admin.from('booking_requests').delete().in('id', made.requests)
  if (made.quotes.length) { await admin.from('sambramo_quote_line_items').delete().in('quote_request_id', made.quotes); await admin.from('sambramo_quote_responses').delete().in('quote_request_id', made.quotes); await admin.from('sambramo_quote_requests').delete().in('id', made.quotes) }
  /* A paid line books the planner's day (132's recount), and deleting the
     vendor cascades to that row — whose audit trigger then points at a vendor
     being deleted. So: the day, its audit, then the vendor. */
  if (made.vendors.length) {
    await admin.from('vendor_availability').delete().in('vendor_id', made.vendors)
    await admin.from('vendor_availability_audit').delete().in('vendor_id', made.vendors)
    const dv = await admin.from('vendors').delete().in('id', made.vendors)
    if (dv.error) console.log('  … vendor cleanup:', dv.error.message)
  }
  for (const u of made.users) await admin.auth.admin.deleteUser(u).catch(() => {})
  const left = await admin.from('vendors').select('id').in('id', made.vendors.length ? made.vendors : ['00000000-0000-0000-0000-000000000000'])
  ok(!left.data?.length, 'every fixture is removed')
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
