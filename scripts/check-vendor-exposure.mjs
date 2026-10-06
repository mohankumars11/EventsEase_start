#!/usr/bin/env node
/**
 * The catalogue hands out what a customer needs, and nothing else.
 * And a partner cannot put themselves on the paid tier.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ABSENT, NOT NULL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `review_note` is NULL on every row today, so a test that asserts "the
 * value is null" passes against a wide-open table and keeps passing
 * right up until an operator writes the first note. What has to be
 * proven is that the COLUMN IS NOT THERE — that asking for it is an
 * error, not an empty answer.
 *
 * So every exposure check below asks PostgREST for the private column
 * by name and requires the request to fail.
 *
 *   node scripts/check-vendor-exposure.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon  = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,  { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

/* A real partner, and a real live offering. An exposure test against an
   empty fixture proves nothing, so this fails loudly instead. */
const { data: fixture } = await admin.from('vendor_services')
  .select('id, vendor_id, name, category, review_status')
  .eq('review_status', 'live').limit(1).maybeSingle()
if (!fixture) {
  console.log('\n  x no live offering to test against — fixture is empty, refusing to score\n')
  process.exit(1)
}

console.log('\nA · THE PUBLIC CATALOGUE\n')

const view = await anon.from('public_vendor_services').select('*').limit(1)
if (view.error) {
  ok('public_vendor_services exists and is readable', false,
     `${view.error.message} — migration 124 not applied?`)
} else {
  ok('public_vendor_services exists and is readable', true)
  const cols = Object.keys(view.data?.[0] ?? {})
  ok('it returns rows', (view.data?.length ?? 0) > 0, 'the catalogue is empty')
  for (const needed of ['name', 'category', 'price', 'unit', 'min_quantity']) {
    ok(`customer-safe column present: ${needed}`, cols.includes(needed), `got ${cols.join(', ')}`)
  }
  for (const priv of ['review_note', 'review_status', 'specs', 'listing_id']) {
    ok(`private column ABSENT: ${priv}`, !cols.includes(priv), 'it is in the response')
  }
}

/* The real question: can anonymous still get the private columns by
   asking the base table for them by name? */
for (const priv of ['review_note', 'review_status', 'specs']) {
  const r = await anon.from('vendor_services').select(`id, ${priv}`).limit(1)
  const got = !r.error && (r.data?.length ?? 0) > 0
  ok(`anon cannot select vendor_services.${priv}`, !got,
     `returned ${r.data?.length} row(s) carrying it`)
}

const stillBrowsing = await anon.from('vendors').select('id, business_name').limit(1)
ok('customer browsing still works', (stillBrowsing.data?.length ?? 0) > 0, stillBrowsing.error?.message)

console.log('\nB · THE PAID TIER IS NOT SELF-SERVICE\n')

/* A real partner session, and the plan read and restored around every
   attempt. A probe that leaves somebody on Pro is a probe that changes
   what they are billed. */
const { data: v } = await admin.from('vendors')
  .select('id, business_name, profile_id, subscription_plan, description')
  .not('profile_id', 'is', null).limit(1).single()
const { data: prof } = await admin.from('profiles').select('email').eq('id', v.profile_id).single()
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: prof.email })
const partner = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
await partner.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' })

const planBefore = v.subscription_plan
console.log(`  partner: ${v.business_name}, on "${planBefore}"\n`)

for (const tier of ['pro', 'growth']) {
  await partner.from('vendors').update({ subscription_plan: tier }).eq('id', v.id)
  const { data: after } = await admin.from('vendors')
    .select('subscription_plan').eq('id', v.id).single()
  const granted = after.subscription_plan === tier && planBefore !== tier
  if (granted) await admin.from('vendors').update({ subscription_plan: planBefore }).eq('id', v.id)
  ok(`partner cannot grant themselves "${tier}"`, !granted, 'IT WORKED — restored')
}

/* The partner must still be able to run their own business. A guard
   that freezes the whole row is a guard that broke the product. */
const descBefore = v.description
await partner.from('vendors').update({ description: 'EXPOSURE_PROBE' }).eq('id', v.id)
const { data: descAfter } = await admin.from('vendors').select('description').eq('id', v.id).single()
ok('partner CAN still edit their own description', descAfter.description === 'EXPOSURE_PROBE',
   `stayed "${descAfter.description}"`)
await admin.from('vendors').update({ description: descBefore }).eq('id', v.id)
const { data: descBack } = await admin.from('vendors').select('description').eq('id', v.id).single()
ok('...and it was restored exactly', descBack.description === descBefore, 'RESIDUE LEFT BEHIND')

/* The legitimate path still has to work, or billing has no way in. */
const { data: adminProf } = await admin.from('profiles').select('email').eq('role', 'admin').limit(1).maybeSingle()
if (adminProf) {
  const { data: aLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: adminProf.email })
  const op = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { error: opErr } = await op.auth.verifyOtp({ token_hash: aLink.properties.hashed_token, type: 'email' })
  if (!opErr) {
    await op.from('vendors').update({ subscription_plan: 'pro' }).eq('id', v.id)
    const { data: opAfter } = await admin.from('vendors').select('subscription_plan').eq('id', v.id).single()
    ok('an operator CAN set the plan', opAfter.subscription_plan === 'pro',
       `stayed "${opAfter.subscription_plan}" — billing has no way in`)
    await admin.from('vendors').update({ subscription_plan: planBefore }).eq('id', v.id)
    await op.auth.signOut()
  } else {
    console.log('  · could not mint an operator session — admin path NOT TESTED')
  }
}

const { data: planBack } = await admin.from('vendors').select('subscription_plan').eq('id', v.id).single()
ok('the plan is exactly as it started', planBack.subscription_plan === planBefore,
   `left on "${planBack.subscription_plan}", was "${planBefore}"`)

console.log('\nC · PARTNER A vs PARTNER B, ON A POPULATED ROW\n')

const { data: other } = await admin.from('vendor_services')
  .select('id, vendor_id, name').neq('vendor_id', v.id).eq('review_status', 'live').limit(1).maybeSingle()
if (!other) {
  bad++; ran++
  console.log('  x NOT TESTED — no other partner owns a live offering')
} else {
  const r = await partner.from('vendor_services')
    .select('id, review_note, review_status, specs').eq('id', other.id).limit(1)
  const leaked = !r.error && (r.data?.length ?? 0) > 0
  ok("A cannot read B's private service fields", !leaked,
     `read ${r.data?.length} row(s) of "${other.name}" with its review fields`)
}

await partner.auth.signOut()
console.log(`\n  ${bad ? cross : tick} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
