#!/usr/bin/env node
/**
 * Migration 200 against the LIVE database — run after pasting it and
 * scripts/apply-menu-catalogue.mjs:
 *
 *   node --env-file=.env scripts/check-menu-studio-live.mjs
 *
 * Proves, as the roles that matter (the live DB has policies the repo does
 * not show, so this asks the database itself):
 *   · anon reads live menus, sections, families, rules and photos
 *   · anon cannot write a menu, and cannot read anyone's customer menu
 *   · a signed-in customer saves a menu through save_customer_menu, gets
 *     version 1 then 2 for the same client key (no duplicate), and the
 *     first version's dishes are still there
 *   · another customer cannot read it
 *   · a message carrying a phone number or an email is refused
 * The test menu is deleted at the end. Uses the test account
 * mohanpes328a@gmail.com and a second minted user, never the admin.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exit(1) }
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

/* A real session for an email, the way the app gets one (generateLink + verifyOtp). */
async function session(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return c
}

const probe = await anon.from('sambramo_menu_templates').select('id').limit(1)
if (probe.error) { console.error('Migration 200 is not applied (', probe.error.message, ')'); process.exit(2) }

console.log('Catalogue, as anyone')
const t = await anon.from('sambramo_menu_templates').select('id', { count: 'exact', head: true }).eq('active', true)
ok((t.count ?? 0) >= 96, `${t.count} live menus readable`)
const it = await anon.from('sambramo_menu_template_items').select('template_id', { count: 'exact', head: true })
ok((it.count ?? 0) > 1000, `${it.count} menu dishes readable`)
for (const tb of ['sambramo_menu_sections', 'sambramo_cuisine_families', 'sambramo_occasion_menu_rules', 'sambramo_catalogue_assets']) {
  const r = await anon.from(tb).select('*', { count: 'exact', head: true })
  ok(!r.error && r.count > 0, `${tb}: ${r.count}`)
}
const w = await anon.from('sambramo_menu_templates').insert({ id: 'x-anon', family_id: 'karnataka', name: 'x', diet: 'veg' })
ok(!!w.error, 'anon cannot add a menu')
const cm = await anon.from('sambramo_customer_menus').select('id').limit(1)
ok(!cm.data?.length, 'anon reads no customer menus')

console.log('A customer’s menu')
const me = await session('mohanpes328a@gmail.com')
const key = `live-check-${Date.now()}`
const tpl = (await anon.from('sambramo_menu_template_items').select('dish_id, section_id').eq('template_id', 'ka-traditional-veg-feast').limit(6)).data ?? []
const v1 = await me.rpc('save_customer_menu', { p_client_key: key, p_menu: { template_id: 'ka-traditional-veg-feast', name: 'Check', diet: 'veg', guests: 80 }, p_items: tpl.map(r => ({ section_id: r.section_id, dish_id: r.dish_id })) })
ok(!v1.error && v1.data?.[0]?.version === 1, `saved, version 1 ${v1.error?.message ?? ''}`)
const v2 = await me.rpc('save_customer_menu', { p_client_key: key, p_menu: { template_id: 'ka-traditional-veg-feast', name: 'Check', diet: 'veg', guests: 90 }, p_items: [...tpl.slice(1).map(r => ({ section_id: r.section_id, dish_id: r.dish_id })), { section_id: 'special', custom_name: 'Ellu Bella' }] })
const id = v2.data?.[0]?.menu_id
ok(!v2.error && v2.data?.[0]?.version === 2 && id === v1.data?.[0]?.menu_id, 'same client key → same menu, version 2 (no duplicate)')
const both = await me.from('sambramo_customer_menu_items').select('version').eq('menu_id', id)
ok(both.data?.filter(r => r.version === 1).length === tpl.length && both.data?.some(r => r.version === 2), 'version 1 is kept beside version 2')
const other = await session(`sambramo.menucheck.${Date.now()}@example.com`)
const peek = await other.from('sambramo_customer_menus').select('id').eq('id', id)
ok(!peek.data?.length, 'another customer cannot read it')

console.log('Messages keep contacts inside Sambramo')
const { data: qr } = await admin.from('sambramo_quote_requests').select('id, customer_id').limit(1).maybeSingle()
if (qr) {
  for (const body of ['call me on 98450 12345', 'mail me at someone@example.com']) {
    const r = await admin.from('sambramo_quote_messages').insert({ quote_request_id: qr.id, sender_role: 'customer', sender_id: qr.customer_id, body })
    ok(!!r.error, `refused: "${body}"`)
  }
}

await admin.from('sambramo_customer_menus').delete().eq('id', id)
/* The throwaway second customer goes too. */
const { data: ou } = await other.auth.getUser()
if (ou?.user?.id) await admin.auth.admin.deleteUser(ou.user.id)
console.log(`\n${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}`)
process.exit(fail ? 1 : 0)
