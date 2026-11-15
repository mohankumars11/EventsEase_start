#!/usr/bin/env node
/**
 * Migration 207 against the LIVE database — run after pasting it:
 *
 *   node --env-file=.env scripts/check-dish-diet-review-live.mjs
 *
 * Proves, as the roles that matter:
 *   · only an admin can certify a dish's diet — not a customer, not anon
 *   · a verdict sets the diet, marks the dish reviewed, keeps contains_egg
 *     honest and records who said so and when
 *   · a wrong tag can be CORRECTED (veg → egg), and the correction is a
 *     second audit row, not an overwrite of the first
 *   · the audit trail cannot be written or rewritten from a client
 *   · the per-menu queue agrees with 205's backlog, on the real catalogue
 *
 * Touches no real dish and no real menu: it certifies a temporary,
 * INACTIVE fixture dish (invisible to every picker) and deletes it. The
 * admin is a throwaway user promoted for the run and deleted after —
 * never the real admin account.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exitCode = 1 }
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts)
const anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

async function session(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, opts)
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return c
}

const probe = await admin.from('sambramo_diet_review_by_menu').select('template_id').limit(1)
if (probe.error) {
  console.error('Migration 207 is not applied (', probe.error.message, ')')
  process.exitCode = 2
} else await run()

async function run() {
  const ts = Date.now()
  const dishId = `zz-vegcheck-${ts}`
  const adminEmail = `sambramo.vegcheck.admin.${ts}@example.com`
  let adminUserId = null
  try {
    const fx = await admin.from('sambramo_master_dishes').insert({
      id: dishId, name: 'Veg check fixture (temporary)', suggested_diet: 'veg', review_status: 'needs_review', active: false,
    }).select('id').single()
    if (fx.error) { console.error('cannot create the fixture dish:', fx.error.message); process.exitCode = 1; return }

    const made = await admin.auth.admin.createUser({ email: adminEmail, email_confirm: true })
    adminUserId = made.data.user.id
    await admin.from('profiles').upsert({ id: adminUserId, email: adminEmail, role: 'admin' }, { onConflict: 'id' })
    const boss = await session(adminEmail)
    const me = await session('mohanpes328a@gmail.com')
    const role = await boss.rpc('get_my_role')
    if (role.data !== 'admin') { console.error(`could not make a throwaway admin (role = ${role.data}) — nothing to test`); process.exitCode = 1; return }

    console.log('Who may certify')
    const certify = (c, ids, v) => c.rpc('sambramo_review_dish_diet', { p_dish_ids: ids, p_verdict: v })
    ok(!!(await certify(anon, [dishId], 'veg')).error, 'anon cannot')
    const asCustomer = await certify(me, [dishId], 'veg')
    ok(asCustomer.error?.code === '42501', `a customer cannot (${asCustomer.error?.code ?? 'ALLOWED'})`)
    ok((await certify(boss, [dishId], 'probably_veg')).error?.code === '22023', 'an unknown diet is refused')
    ok(!!(await certify(boss, Array.from({ length: 101 }, (_, i) => `x${i}`), 'veg')).error, 'more than 100 at once is refused')
    const untouched = await admin.from('sambramo_master_dishes').select('review_status').eq('id', dishId).single()
    ok(untouched.data?.review_status === 'needs_review', 'and none of that changed the dish')

    console.log('Certifying')
    const v1 = await certify(boss, [dishId], 'veg')
    ok(v1.data === 1, `the admin certifies it pure vegetarian (${v1.error?.message ?? v1.data + ' changed'})`)
    const d1 = (await admin.from('sambramo_master_dishes')
      .select('review_status, suggested_diet, contains_egg, diet_reviewed_by, diet_reviewed_at').eq('id', dishId).single()).data
    ok(d1?.review_status === 'reviewed' && d1?.suggested_diet === 'veg', 'reviewed, and veg')
    ok(d1?.contains_egg === false, 'pure vegetarian means no egg (contains_egg = false)')
    ok(d1?.diet_reviewed_by === adminUserId && !!d1?.diet_reviewed_at, 'who and when are recorded on the dish')
    ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: dishId, p_diets: ['veg'] })).data === true,
      'it now fits a vegetarian menu')

    const v2 = await certify(boss, [dishId], 'egg')
    ok(v2.data === 1, 'a wrong tag can be corrected: re-certified as containing egg')
    const d2 = (await admin.from('sambramo_master_dishes').select('suggested_diet, contains_egg').eq('id', dishId).single()).data
    ok(d2?.suggested_diet === 'egg' && d2?.contains_egg === true, 'egg, and contains_egg = true')
    ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: dishId, p_diets: ['veg'] })).data === false,
      'so it no longer fits a vegetarian menu')
    ok((await admin.rpc('sambramo_dish_fits_diets', { p_dish_id: dishId, p_diets: ['non_veg'] })).data === true,
      'but a non-vegetarian menu may still have it')

    console.log('The audit trail')
    const trail = (await boss.from('sambramo_dish_diet_reviews')
      .select('verdict, previous_diet, previous_status, reviewed_by').eq('dish_id', dishId).order('reviewed_at')).data ?? []
    ok(trail.length === 2, `two verdicts, two rows — the correction did not overwrite the first (${trail.length})`)
    ok(trail[0]?.previous_status === 'needs_review' && trail[0]?.verdict === 'veg', 'first: needs_review → veg')
    ok(trail[1]?.previous_diet === 'veg' && trail[1]?.verdict === 'egg', 'second: veg → egg')
    ok(trail.every(r => r.reviewed_by === adminUserId), 'each names the admin who gave it')
    ok(!!(await boss.from('sambramo_dish_diet_reviews').insert({ dish_id: dishId, verdict: 'veg', reviewed_by: adminUserId })).error,
      'not even an admin can write a verdict around the function')
    const rewrite = await boss.from('sambramo_dish_diet_reviews').update({ verdict: 'veg' }).eq('dish_id', dishId).select('id')
    ok(!!rewrite.error || !rewrite.data?.length, 'nor rewrite one')
    ok(!(await me.from('sambramo_dish_diet_reviews').select('id').eq('dish_id', dishId)).data?.length, 'a customer cannot read the trail')

    console.log('The queue, on the real catalogue')
    ok(!(await anon.from('sambramo_diet_review_by_menu').select('template_id').limit(1)).data?.length, 'anon cannot read it')
    const byMenu = (await me.from('sambramo_diet_review_by_menu').select('template_id, to_review, needs_swap, review_ids, swap_ids')).data ?? []
    const vegMenus = await admin.from('sambramo_menu_templates').select('id', { count: 'exact', head: true })
      .eq('active', true).neq('review_status', 'rejected').in('diet', ['veg', 'vegan', 'jain'])
    ok(byMenu.length === vegMenus.count, `one row per vegetarian menu (${byMenu.length} of ${vegMenus.count})`)
    ok(byMenu.every(m => m.review_ids.length === m.to_review && m.swap_ids.length === m.needs_swap), 'counts match their id lists')
    const backlog = (await me.from('sambramo_diet_review_backlog').select('dish_id, problem').limit(5000)).data ?? []
    const fromMenus = new Set(byMenu.flatMap(m => m.review_ids))
    const fromBacklog = new Set(backlog.filter(b => b.problem === 'to_review').map(b => b.dish_id))
    ok(fromMenus.size === fromBacklog.size && [...fromMenus].every(id => fromBacklog.has(id)),
      `the per-menu queue and 205's backlog agree on what needs review (${fromMenus.size} dishes)`)
    ok(backlog.every(b => ['to_review', 'hidden_dish', 'wrong_for_menu'].includes(b.problem)), 'every backlog row names its problem')
    const usable = byMenu.filter(m => m.to_review + m.needs_swap === 0).length
    console.log(`  \u2026 today: ${usable} of ${byMenu.length} vegetarian menus can reach vegetarian customers`)
  } finally {
    await admin.from('sambramo_master_dishes').delete().eq('id', dishId)
    if (adminUserId) await admin.auth.admin.deleteUser(adminUserId).catch(() => {})
    const gone = await admin.from('sambramo_master_dishes').select('id').eq('id', dishId)
    const trailGone = await admin.from('sambramo_dish_diet_reviews').select('id').eq('dish_id', dishId)
    ok(!gone.data?.length && !trailGone.data?.length, 'the fixture dish and its trail are gone')
  }
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
