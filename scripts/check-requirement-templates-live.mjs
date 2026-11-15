#!/usr/bin/env node
/**
 * Migration 203 against the LIVE database — run after pasting it and
 * loading the rows:
 *
 *   node --env-file=.env scripts/apply-requirement-templates.mjs --apply
 *   node --env-file=.env scripts/check-requirement-templates-live.mjs
 *
 * Proves, as the roles that matter:
 *   · all 34 trades have exactly one published template
 *   · anyone may read a template (both apps render from it); nobody but
 *     an admin may write one
 *   · the server decides what is missing — the phone's opinion is gone
 *   · an option that is not on the template is REFUSED, not stored
 *   · a non-vegetarian dish cannot enter a pure-vegetarian menu
 *   · an UNREVIEWED dish is not treated as vegetarian either
 *   · a saved configuration records the template version it answered
 * Everything it creates is deleted at the end.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exitCode = 1 }
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

const probe = await admin.from('sambramo_requirement_templates').select('trade_id').limit(1)
if (probe.error) {
  console.error('Migration 203 is not applied (', probe.error.message, ')')
  process.exitCode = 2
} else await run()

async function run() {
  console.log('Templates')
  const pub = await admin.from('sambramo_requirement_templates').select('trade_id, version, fields, required_keys').eq('published', true)
  ok(pub.data?.length === 34, `34 trades have a published template (${pub.data?.length})`)
  ok(new Set(pub.data.map(r => r.trade_id)).size === pub.data.length, 'exactly one published version per trade')
  const cater = pub.data.find(r => r.trade_id === 'catering_food')
  /* Required = data/requiredAnswers.js: what a master cannot quote without.
     Catering's own sheet (Menu Studio) carries the diet and the menu, so the
     template requires nothing — the dietary rule below still applies to any
     dish that is sent. */
  ok((cater?.required_keys ?? []).length === 0, 'catering requires nothing beyond its own sheet (the Menu Studio menu carries the diet)')
  const dj = pub.data.find(r => r.trade_id === 'dj_music')
  ok(dj?.required_keys?.join() === 'performance_kinds', `a DJ needs the kind of act and nothing else (${dj?.required_keys?.join()})`)
  ok(pub.data.find(r => r.trade_id === 'photography')?.required_keys?.length === 0, 'photography needs nothing beyond hours and the experience')
  const cuisine = (cater?.fields ?? []).find(f => f.key === '$cuisine')
  ok((cuisine?.options?.length ?? 0) > 0, `cuisine has options to validate against (${cuisine?.options?.length ?? 0})`)
  const dishes = (cater?.fields ?? []).find(f => f.key === '$dishes')
  ok(dishes && dishes.options.length === 0, 'the dish catalogue is NOT frozen into the template')
  ok((await anon.from('sambramo_requirement_templates').select('trade_id').limit(1)).data?.length === 1, 'anyone may read a template')
  ok(!!(await anon.from('sambramo_requirement_templates').insert({ trade_id: 'photography', version: 99, fields: [], source_fingerprint: 'x' })).error,
    'anon cannot write one')

  console.log('The server decides what is missing')
  const me = await session('mohanpes328a@gmail.com')
  const { data: who } = await me.auth.getUser()
  const key = `tpl-check-${Date.now()}`
  const plan = await me.from('event_plans').insert({
    customer_id: who.user.id, client_key: key, occasion_id: 'birthday-party',
    context: { guests: 40 }, status: 'active',
  }).select('id').single()
  if (!plan.data) { console.error(`cannot create the test event: ${plan.error?.message}`); process.exitCode = 1; return }
  const planId = plan.data.id
  const req = async trade => (await me.from('event_plan_services')
    .insert({ plan_id: planId, trade_id: trade, decision: 'selected' }).select('id, requirement_code').single()).data

  const photo = await req('photography')
  const djReq = await req('dj_music')
  const empty = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: djReq.id, p_config: {} })
  ok(!empty.error && empty.data?.[0]?.out_state === 'configuring', `an empty configuration is not ready (${empty.data?.[0]?.out_state ?? empty.error?.message})`)
  ok((empty.data?.[0]?.out_missing ?? []).join() === 'performance_kinds', `and the server names what is missing (${(empty.data?.[0]?.out_missing ?? []).join(', ')})`)

  /* The phone no longer gets a say: 202's three-argument form is gone. */
  const old = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: djReq.id, p_config: {}, p_missing: [] })
  ok(!!old.error, `the phone cannot declare nothing missing any more (${old.error?.code ?? 'STILL ACCEPTED'})`)

  const kind = dj.fields.find(f => f.key === 'performance_kinds').options[0].value
  const done = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: djReq.id, p_config: { performance_kinds: [kind] } })
  ok(done.data?.[0]?.out_state === 'ready', `answering it makes the DJ ready (${done.error?.message ?? kind})`)
  const saved = await me.from('event_plan_services').select('template_version').eq('id', djReq.id).single()
  ok(saved.data?.template_version === dj.version, `the saved answer records the template version it answered (v${saved.data?.template_version})`)
  const tpl = pub.data.find(r => r.trade_id === 'photography')
  const good = {}
  const ph0 = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: photo.id, p_config: {} })
  ok(ph0.data?.[0]?.out_state === 'ready', 'photography with nothing but the event is ready — no question can block it')

  console.log('An impossible answer is refused, not stored')
  /* Optional or not, an answer must be one the template offers. */
  const bogus = await me.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: photo.id, p_config: { specialties: ['__not_an_option__'] } })
  ok(!!bogus.error && /not available/i.test(bogus.error.message), `an optional answer that is not an option is refused too (${bogus.error?.message?.slice(0, 50) ?? 'ACCEPTED'})`)
  const bogusReq = await me.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: djReq.id, p_config: { performance_kinds: ['__not_an_option__'] } })
  ok(!!bogusReq.error, 'and so is a required one')
  const after = await me.from('event_plan_services').select('config').eq('id', photo.id).single()
  ok(!JSON.stringify(after.data?.config ?? {}).includes('__not_an_option__'), 'and nothing of it was stored')

  console.log('Pure vegetarian means pure vegetarian')
  const cat = await req('catering_food')
  const cFields = cater.fields
  const base = Object.fromEntries(cater.required_keys.filter(k => k !== '$dishes').map(k => {
    const f = cFields.find(x => x.key === k)
    return [k, f?.options?.length ? [f.options[0].value] : true]
  }))
  base.$diet = ['veg']

  const { data: nonVeg } = await admin.from('sambramo_master_dishes').select('id, name').eq('suggested_diet', 'non_veg').eq('active', true).limit(2)
  const sneak = await me.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: cat.id, p_config: { ...base, $dishes: nonVeg.map(d => d.id) } })
  ok(!!sneak.error && /not available/i.test(sneak.error.message),
    `a non-veg dish cannot enter a veg menu — "${nonVeg[0]?.name}" refused (${sneak.error?.message?.slice(0, 44) ?? 'ACCEPTED'})`)

  const { data: unreviewed } = await admin.from('sambramo_master_dishes')
    .select('id, name').eq('suggested_diet', 'veg').neq('review_status', 'reviewed').eq('active', true).limit(1)
  if (unreviewed?.length) {
    const grey = await me.rpc('sambramo_save_requirement_config', {
      p_plan_service_id: cat.id, p_config: { ...base, $dishes: [unreviewed[0].id] } })
    ok(!!grey.error, `an UNREVIEWED dish is not vegetarian either — "${unreviewed[0].name}" refused`)
  } else ok(true, 'no unreviewed veg dish in the catalogue to test with (skipped)')

  const { data: ok_veg } = await admin.from('sambramo_master_dishes')
    .select('id, name').eq('suggested_diet', 'veg').eq('review_status', 'reviewed').eq('active', true).limit(3)
  const fine = await me.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: cat.id, p_config: { ...base, $dishes: ok_veg.map(d => d.id) } })
  ok(!fine.error && fine.data?.[0]?.out_state === 'ready', `verified vegetarian dishes are accepted (${fine.error?.message ?? ''})`)

  /* A non-veg customer is not restricted — the rule is one-directional. */
  const mixed = await me.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: cat.id, p_config: { ...base, $diet: ['non_veg'], $dishes: nonVeg.map(d => d.id) } })
  ok(!mixed.error, `a non-vegetarian menu may contain non-vegetarian dishes (${mixed.error?.message ?? ''})`)

  console.log('205 — what "fits a diet" means')
  const fits205 = await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: nonVeg[0].id, p_diets: ['veg'] })
  if (fits205.error?.code === 'PGRST202') console.log('  … 205 not applied — skipped (not counted)')
  else {
    ok(fits205.data === false, 'a non-veg dish does not fit a veg menu')
    ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: nonVeg[0].id, p_diets: ['veg', 'non_veg'] })).data === true,
      'a MIXED menu (veg + non-veg ticked) is not restricted')
    const mixedSave = await me.rpc('sambramo_save_requirement_config', {
      p_plan_service_id: cat.id, p_config: { ...base, $diet: ['veg', 'non_veg'], $dishes: [...ok_veg.map(d => d.id), nonVeg[0].id] } })
    ok(!mixedSave.error, `a mixed menu saves with both kinds of dish (${mixedSave.error?.message?.slice(0, 50) ?? ''})`)
    ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: '__no_such_dish__', p_diets: ['non_veg'] })).data === false,
      'an unknown dish fits nothing, not even non-veg')
    const { data: vj } = await admin.from('sambramo_master_dishes').select('id, suggested_diet')
      .in('suggested_diet', ['vegan', 'jain']).eq('review_status', 'reviewed').limit(1)
    if (vj?.length) ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: vj[0].id, p_diets: ['veg'] })).data === true,
      `a reviewed ${vj[0].suggested_diet} dish fits a veg menu`)
    else console.log('  … no REVIEWED vegan or jain dish exists yet — that rule is untested against live data (not counted)')
    const backlog = await me.from('sambramo_diet_review_backlog').select('dish_id, menus_blocked').limit(500)
    ok(!backlog.error, `the review backlog is readable (${backlog.error?.message ?? backlog.data?.length + ' dishes'})`)
    ok(!(await anon.from('sambramo_diet_review_backlog').select('dish_id').limit(1)).data?.length, 'but not by anon')
  }

  console.log('208 — the experience is an answer the server checks')
  const tierTpl = pub.data.filter(r => (r.fields ?? []).some(f => f.key === '$tier'))
  if (!tierTpl.length) console.log('  … no template carries $tier yet — run apply-requirement-templates --apply after 208 (not counted)')
  else {
    ok(tierTpl.length === 8, `8 trades’ templates offer an experience (${tierTpl.map(r => r.trade_id).join(', ')})`)
    const pf = pub.data.find(r => r.trade_id === 'photography').fields.find(f => f.key === '$tier')
    ok(pf && pf.required === false && pf.options.map(o => o.value).join() === 'ESSENTIAL,SIGNATURE,VIP',
      `photography: optional, ESSENTIAL/SIGNATURE/VIP (labelled ${pf?.options.map(o => o.label).join(' / ')})`)
    ok(!tierTpl.some(r => r.required_keys.includes('$tier')), 'never mandatory — a customer may state their own hours instead')
    const ph = photo   // one requirement per trade per event (190's unique key) — reuse it
    const okTier = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: ph.id, p_config: { ...good, $tier: 'SIGNATURE' } })
    ok(!okTier.error && okTier.data?.[0]?.out_state === 'ready', `a real experience saves (${okTier.error?.message ?? 'ready'})`)
    const badTier = await me.rpc('sambramo_save_requirement_config', { p_plan_service_id: ph.id, p_config: { ...good, $tier: 'PLATINUM' } })
    ok(!!badTier.error && /not available/.test(badTier.error.message), 'an experience that does not exist is refused, not stored')
    const v = (await me.from('event_plan_services').select('template_version').eq('id', ph.id).single()).data?.template_version
    ok(v === pub.data.find(r => r.trade_id === 'photography').version, `the answer names the template version that offered the experience (v${v})`)
  }

  console.log('And the guard still agrees')
  const d = await me.rpc('sambramo_requirement_is_dispatchable', { p_id: cat.id })
  ok(d.data === true, 'a fully configured requirement is dispatchable')
  const d2 = await me.rpc('sambramo_requirement_is_dispatchable', { p_id: (await req('venue')).id })
  ok(d2.data === false, 'an untouched one is not')

  await admin.from('event_plans').delete().eq('id', planId)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
