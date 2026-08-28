#!/usr/bin/env node
/**
 * Put a real master into the dispatch pool, and mint their session.
 *
 *   node scripts/demo-partner.mjs
 *
 * ── What this does, and why none of it is a shortcut ─────────────────
 * Everything here is a step the CEO performs for every real partner, in
 * the order the product performs it:
 *
 *   1. the profile is marked `vendor`      — they get the partner app
 *   2. the business is APPROVED            — set_vendor_verification()
 *   3. a location is pinned                — set_vendor_location()
 *   4. a trade is listed                   — vendor_services
 *
 * Miss any one and `match_partners()` will not find them, silently. That
 * is worth seeing performed once: "the partner signed up and gets no
 * jobs" will be a real support ticket, and it is almost always one of
 * these four.
 *
 * The session at the end is a genuine magic-link login, not a bypass —
 * the offer inbox reads `partner_offer_feed` under RLS, so nothing
 * renders without one.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { readEnv, ROOT } from './lib/loadSrc.mjs'

const SUPA_URL = readEnv('VITE_SUPABASE_URL')
const admin = createClient(SUPA_URL, readEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

/* ── The master ────────────────────────────────────────────────────── */
const { data: vendors } = await admin
  .from('vendors').select('*').eq('is_synthetic', false).not('profile_id', 'is', null).limit(1)

const vendor = vendors?.[0]
if (!vendor) {
  console.error('\n  No real partner with a login. Sign up once as a vendor in the app.\n')
  process.exit(1)
}

console.log(`\n  Onboarding "${vendor.business_name}"\n`)

/* 1 · The profile has to say vendor, or the route guard sends them to
 *     the customer dashboard and they never see a job. */
const { error: roleErr } = await admin
  .from('profiles').update({ role: 'vendor' }).eq('id', vendor.profile_id)
console.log(`   role → vendor            ${roleErr ? '✗ ' + roleErr.message : '✓'}`)

/* The area TEXT has to agree with the PIN.
 *
 * This partner's profile read "Gayathripiram, Mysore" while their
 * coordinate sat in Koramangala. Dispatch used the pin and the human read
 * the text, so both were confidently wrong in different directions — and
 * a partner whose profile names one city while jobs arrive from another
 * will conclude the app is broken. They would be half right. */
await admin.from('vendors')
  .update({ area: 'Koramangala', city: 'Bengaluru' }).eq('id', vendor.id)
console.log('   area text ↔ pin agree    ✓')

/* 2 · Approval. `match_partners()` filters on is_verified, so an
 *     unapproved partner is invisible to dispatch by design. */
const { data: ver } = await admin.rpc('set_vendor_verification', {
  p_vendor_id: vendor.id, p_status: 'approved', p_note: 'Demo onboarding',
})
console.log(`   approved                 ${ver?.ok ? '✓' : '✗ ' + (ver?.reason ?? 'failed')}`)

/* 3 · A location. Koramangala, so the demo booking is on their doorstep. */
const { data: loc } = await admin.rpc('set_vendor_location', {
  p_vendor_id: vendor.id, p_lat: 12.9339, p_lng: 77.6200,
})
console.log(`   located in Koramangala   ${loc?.ok ? '✓' : '✗ ' + (loc?.detail ?? loc?.reason)}`)

/* 4 · Their trade. match_partners joins on vendor_services.category, so
 *     a partner with no rows here matches nothing whatever else is set. */
const trade = vendor.category ?? 'DJ & Music'
const { data: existing } = await admin
  .from('vendor_services').select('id').eq('vendor_id', vendor.id).eq('category', trade)

if (!existing?.length) {
  await admin.from('vendor_services').insert({
    vendor_id: vendor.id,
    name: trade,
    category: trade,
    unit: 'per event',
    is_active: true,
  })
}
console.log(`   lists "${trade}"${' '.repeat(Math.max(0, 18 - trade.length))} ✓`)

/* 5 · Make sure the date is open. A BLOCKED row would hide them from
 *     every Saturday dispatch and look like a matching bug. */
const saturday = (() => {
  const d = new Date()
  do { d.setDate(d.getDate() + 1) } while (d.getDay() !== 6)
  return d.toISOString().slice(0, 10)
})()
await admin.from('vendor_availability').delete().eq('vendor_id', vendor.id).eq('slot_date', saturday)
console.log(`   ${saturday} open          ✓`)

/* ── Can dispatch actually see them now? ───────────────────────────── */
const { data: point } = await admin.rpc('point_of', { p_lat: 12.9352, p_lng: 77.6245 })
const { data: found } = await admin.rpc('match_partners', {
  p_trade: trade, p_point: point, p_radius_m: 5000, p_date: saturday,
  p_allow_synthetic: false, p_limit: 10, p_exclude: [],
})
const visible = (found ?? []).some(m => m.vendor_id === vendor.id)

/* When the answer is no, say which rule said no.
 *
 * This used to print "one of the four steps did not take", which is
 * wrong on the case that actually happens. `match_partners` has a fifth
 * rule the four steps above know nothing about: a master already holding
 * an ACCEPTED offer on that date is not offered a second job that day.
 *
 * So a leftover accept from yesterday's test makes a correctly onboarded
 * partner look broken, and the message sends you to re-check four things
 * that are all fine. A diagnostic that points at the wrong cause costs
 * more than no diagnostic. */
let why = 'one of the four steps did not take'
if (!visible) {
  const { data: busy } = await admin
    .from('dispatch_offers')
    .select('line_id, booking_lines!inner(status, booking_requests!inner(event_date))')
    .eq('vendor_id', vendor.id)
    .eq('status', 'ACCEPTED')
  const sameDay = (busy ?? []).filter(
    o => o.booking_lines?.booking_requests?.event_date === saturday
      && !['cancelled', 'expired'].includes(o.booking_lines?.status),
  )
  if (sameDay.length) {
    why = `they already accepted a job on ${saturday}, so dispatch will not offer a second`
  }
}
console.log(`\n   dispatch can see them:   ${visible ? 'yes' : 'NO - ' + why}`)

/* ── Their session ─────────────────────────────────────────────────── */
const { data: prof } = await admin.from('profiles').select('email').eq('id', vendor.profile_id).single()

if (!prof?.email) {
  console.log('\n   (no email on the profile — cannot mint a session)\n')
  process.exit(0)
}

const { data: link, error: le } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: prof.email,
})
if (le) { console.log(`\n   session: ✗ ${le.message}\n`); process.exit(1) }

const anon = createClient(SUPA_URL, readEnv('VITE_SUPABASE_ANON_KEY'), { auth: { persistSession: false } })
const { data: s, error: ve } = await anon.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
})
if (ve) { console.log(`\n   session: ✗ ${ve.message}\n`); process.exit(1) }

const ref = SUPA_URL.match(/https:\/\/([a-z0-9]+)\./)[1]
writeFileSync(join(ROOT, '.demo-partner-session.json'), JSON.stringify({
  storageKey: `sb-${ref}-auth-token`,
  session: s.session,
  vendorId: vendor.id,
  businessName: vendor.business_name,
  trade,
}, null, 2))

console.log(`\n   session written to .demo-partner-session.json`)
console.log(`\n   Open: http://localhost:5173/dashboard/vendor\n`)
