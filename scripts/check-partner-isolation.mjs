#!/usr/bin/env node
/**
 * Can Partner A reach anything belonging to Partner B?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONLY WAY TO ASK THIS HONESTLY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two REAL sessions, both minted the way the app mints one — magic link
 * through the anon key — and every attempt made as Partner A against
 * rows owned by Partner B.
 *
 * Service-role is never used to make an attempt. It bypasses RLS
 * entirely, so a suite written with it passes on a database with no
 * policies at all. It is used here for exactly two things: choosing the
 * two partners, and cleaning up.
 *
 * ── Reading zero rows is the pass ───────────────────────────────────
 * RLS does not raise on a forbidden SELECT; it filters. So a leak looks
 * like a successful query with rows in it, which is why every read
 * below asserts a COUNT rather than the absence of an error. A suite
 * that checks `!error` on a read proves nothing about RLS.
 *
 *   node scripts/check-partner-isolation.mjs
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
const admin = createClient(URL_, SVC, { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

/** A session for a vendor, or null when that vendor has no usable email. */
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

/* Two partners who each actually own rows — a partner with nothing is a
   vacuous test, because zero rows come back whether RLS works or not. */
const { data: candidates } = await admin
  .from('vendors').select('id, profile_id, business_name')
  .not('profile_id', 'is', null).limit(40)

const withRows = []
for (const v of candidates ?? []) {
  const { count } = await admin.from('vendor_services')
    .select('id', { count: 'exact', head: true }).eq('vendor_id', v.id)
  if (count > 0) withRows.push({ ...v, services: count })
  if (withRows.length >= 12) break
}

let A = null, B = null
for (const v of withRows) {
  const s = await sessionFor(v)
  if (!s) continue
  if (!A) { A = s; continue }
  if (v.profile_id !== A.vendor.profile_id) { B = s; break }
}
if (!A || !B) {
  console.log('\n  x could not mint two distinct partner sessions\n')
  process.exit(1)
}
console.log(`\n  A = ${A.vendor.business_name}  (${A.email})`)
console.log(`  B = ${B.vendor.business_name}  (${B.email})\n`)

/* Every partner-owned table, and the column that says whose row it is.
   Listed rather than discovered, so a table added later is absent from
   this suite loudly — a discovery loop would silently cover nothing new
   and keep reporting green. */
const OWNED = [
  ['partner_listings',        'vendor_id'],
  ['vendor_services',         'vendor_id'],
  ['vendor_availability',     'vendor_id'],
  ['vendor_documents',        'vendor_id'],
  ['vendor_payout_details',   'vendor_id'],
  ['partner_payout_accounts', 'vendor_id'],
  ['partner_work',            'vendor_id'],
  ['vendor_photos',           'vendor_id'],
  ['payout_claims',           'vendor_id'],
  ['partner_jobs',            'vendor_id'],
  ['dispatch_offers',         'vendor_id'],
  ['vendor_verification_events', 'vendor_id'],
  ['vendor_subscriptions',    'vendor_id'],
]

console.log('READS — A asking for B\'s rows\n')

for (const [table, col] of OWNED) {
  /* Does B actually own any? A table where B owns nothing cannot
     demonstrate isolation, and saying so is better than a green tick
     that means "there was nothing to leak". */
  const { count: owned, error: ownErr } = await admin
    .from(table).select('*', { count: 'exact', head: true }).eq(col, B.vendor.id)
  if (ownErr) { console.log(`  · ${table} — not readable even as service role, skipped`); continue }
  if (!owned) { console.log(`  · ${table} — B owns none, nothing to leak`); continue }

  const { data: leaked, error } = await A.client
    .from(table).select('id').eq(col, B.vendor.id).limit(50)
  if (error) { ok(`${table}: A is refused outright`, true); continue }
  ok(`${table}: A reads 0 of B's ${owned}`, (leaked?.length ?? 0) === 0,
     `read ${leaked.length} row(s)`)
}

console.log('\nREADS — A asking for A\'s own rows (isolation must not mean lockout)\n')

for (const [table, col] of [['partner_listings','vendor_id'], ['vendor_services','vendor_id']]) {
  const { count: owned } = await admin
    .from(table).select('*', { count: 'exact', head: true }).eq(col, A.vendor.id)
  if (!owned) { console.log(`  · ${table} — A owns none`); continue }
  const { data: own } = await A.client.from(table).select('id').eq(col, A.vendor.id)
  ok(`${table}: A still reads their own ${owned}`, (own?.length ?? 0) === owned,
     `read ${own?.length} of ${owned}`)
}

console.log('\nWRITES — A reaching into B\n')

/* A read that returns nothing usually means a write cannot find the row
   either, but "usually" is not a security property: UPDATE and DELETE
   are governed by their own policies. */
const { data: bListing } = await admin
  .from('partner_listings').select('id, status, review_note')
  .eq('vendor_id', B.vendor.id).limit(1).maybeSingle()

if (bListing) {
  await A.client.from('partner_listings')
    .update({ status: 'live', review_note: 'approved by me' }).eq('id', bListing.id)
  const { data: after } = await admin
    .from('partner_listings').select('status, review_note').eq('id', bListing.id).single()
  ok("A cannot change B's listing status",
     after.status === bListing.status, `status moved to ${after.status}`)
  ok("A cannot write B's review note",
     after.review_note === bListing.review_note, `note became "${after.review_note}"`)

  const del = await A.client.from('partner_listings').delete().eq('id', bListing.id)
  const { count: still } = await admin.from('partner_listings')
    .select('id', { count: 'exact', head: true }).eq('id', bListing.id)
  ok("A cannot delete B's listing", still === 1, 'the row is gone')
} else {
  console.log('  · B has no container row to attack')
}

const { data: bService } = await admin
  .from('vendor_services').select('id, price, review_status')
  .eq('vendor_id', B.vendor.id).limit(1).maybeSingle()

if (bService) {
  await A.client.from('vendor_services')
    .update({ price: 1, review_status: 'live' }).eq('id', bService.id)
  const { data: after } = await admin
    .from('vendor_services').select('price, review_status').eq('id', bService.id).single()
  ok("A cannot reprice B's offering", Number(after.price) === Number(bService.price),
     `price became ${after.price}`)
  ok("A cannot publish B's offering", after.review_status === bService.review_status,
     `review_status became ${after.review_status}`)
}

/* The partner row itself.

   ── This attempt RESTORES whatever it manages to change ─────────────
   The first version of this file did not, and it succeeded: it renamed
   a real partner's business to "OWNED BY A" and left it there. A guard
   that damages production data can be run once and then never trusted
   again — the same reason check-booking-capture carries its warning.
   Every field written below is read first and put back after. */
const { data: bBefore } = await admin
  .from('vendors').select('business_name, is_verified, contact_phone')
  .eq('id', B.vendor.id).single()

await A.client.from('vendors')
  .update({ business_name: 'OWNED BY A', is_verified: true, contact_phone: '0000000000' })
  .eq('id', B.vendor.id)
const { data: bAfter } = await admin
  .from('vendors').select('business_name, is_verified, contact_phone')
  .eq('id', B.vendor.id).single()

const renamed = bAfter.business_name !== bBefore.business_name
ok("A cannot rename B's business", !renamed, `renamed to "${bAfter.business_name}"`)
ok("A cannot change B's contact number",
   bAfter.contact_phone === bBefore.contact_phone, `became ${bAfter.contact_phone}`)

if (renamed || bAfter.contact_phone !== bBefore.contact_phone || bAfter.is_verified !== bBefore.is_verified) {
  await admin.from('vendors').update({
    business_name: bBefore.business_name,
    is_verified: bBefore.is_verified,
    contact_phone: bBefore.contact_phone,
  }).eq('id', B.vendor.id)
  console.log(`      (restored ${bBefore.business_name})`)
}

console.log('\nSELF — what A may and may not do to their own rows\n')

/* Own trust columns. 067's trigger restores these on any partner-side
   update, silently, which is the behaviour a control would otherwise
   pretend to have. */
const { data: aBefore } = await admin
  .from('vendors').select('is_verified, verification_status, status, subscription_plan')
  .eq('id', A.vendor.id).single()

await A.client.from('vendors')
  .update({ is_verified: true, status: 'APPROVED', subscription_plan: 'pro' })
  .eq('id', A.vendor.id)
const { data: aAfter } = await admin
  .from('vendors').select('is_verified, status, subscription_plan')
  .eq('id', A.vendor.id).single()

ok('A cannot verify themselves', aAfter.is_verified === aBefore.is_verified,
   `is_verified became ${aAfter.is_verified}`)
ok('A cannot approve themselves', aAfter.status === aBefore.status,
   `status became ${aAfter.status}`)
ok('A cannot upgrade their own plan', aAfter.subscription_plan === aBefore.subscription_plan,
   `plan became ${aAfter.subscription_plan}`)

/* Put back anything that moved. See the note on B's row above. */
if (aAfter.is_verified !== aBefore.is_verified
    || aAfter.status !== aBefore.status
    || aAfter.subscription_plan !== aBefore.subscription_plan) {
  await admin.from('vendors').update({
    is_verified: aBefore.is_verified,
    status: aBefore.status,
    subscription_plan: aBefore.subscription_plan,
  }).eq('id', A.vendor.id)
  console.log(`      (restored plan ${aBefore.subscription_plan}, status ${aBefore.status})`)
}

/* The one verification transition that IS theirs — 067 allows
   draft/rejected -> submitted, and that is how documents get sent. An
   isolation pass that broke this would be a pass that broke the
   product. */
if (['draft', 'rejected'].includes(aBefore.verification_status)) {
  await A.client.from('vendors')
    .update({ verification_status: 'submitted' }).eq('id', A.vendor.id)
  const { data: v } = await admin
    .from('vendors').select('verification_status').eq('id', A.vendor.id).single()
  ok('A CAN still submit their documents', v.verification_status === 'submitted',
     `stayed at ${v.verification_status}`)
  await admin.from('vendors')
    .update({ verification_status: aBefore.verification_status }).eq('id', A.vendor.id)
} else {
  console.log(`  · A is already "${aBefore.verification_status}" — the submit transition is not available to check`)
}

/* Their own listing status: draft -> live must be refused, pause must
   work, and pause must not smuggle anything past review. */
const TRADE = 'Photography'
const { data: own } = await A.client.from('partner_listings')
  .upsert({ vendor_id: A.vendor.id, trade: TRADE }, { onConflict: 'vendor_id,trade' })
  .select('id, status').single()

if (own?.id) {
  const started = own.status
  for (const target of ['live', 'suspended', 'hidden']) {
    await A.client.from('partner_listings').update({ status: target }).eq('id', own.id)
    const { data: r } = await admin
      .from('partner_listings').select('status').eq('id', own.id).single()
    ok(`A cannot set their own listing to ${target}`, r.status !== target || started === target,
       `status is now ${r.status}`)
  }

  await A.client.from('partner_listings').update({ status: 'paused' }).eq('id', own.id)
  const { data: p } = await admin
    .from('partner_listings').select('status').eq('id', own.id).single()
  ok('A CAN pause their own trade', p.status === 'paused', `status is ${p.status}`)

  /* Pause must not be a side door: coming back has to be a request to
     be looked at, not a promotion. */
  await A.client.from('partner_listings').update({ status: 'under_review' }).eq('id', own.id)
  const { data: q } = await admin
    .from('partner_listings').select('status, reviewed_at').eq('id', own.id).single()
  ok('un-pausing asks for review, never goes live', q.status === 'under_review',
     `status is ${q.status}`)
  ok('...and clears the old decision', q.reviewed_at === null, 'reviewed_at survived')

  await A.client.from('partner_listings')
    .update({ review_note: 'I approve of myself' }).eq('id', own.id)
  const { data: n } = await admin
    .from('partner_listings').select('review_note').eq('id', own.id).single()
  ok('A cannot write their own review note', !n.review_note, `note reads "${n.review_note}"`)

  /* Idempotency, under the shape a double tap actually takes. */
  const taps = await Promise.all([1, 2, 3].map(() => A.client.from('partner_listings')
    .upsert({ vendor_id: A.vendor.id, trade: TRADE }, { onConflict: 'vendor_id,trade' })
    .select('id').single()))
  const ids = new Set(taps.map(t => t.data?.id).filter(Boolean))
  ok('three simultaneous taps make one container', ids.size === 1, `${ids.size} ids`)

  const { count: dupes } = await admin.from('partner_listings')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', A.vendor.id).eq('trade', TRADE)
  ok(`still exactly one ${TRADE} container`, dupes === 1, `found ${dupes}`)

  /* Leave it as it was. A container the backfill made for a trade this
     partner really has must survive this suite. */
  const { count: offerings } = await admin.from('vendor_services')
    .select('id', { count: 'exact', head: true }).eq('listing_id', own.id)
  if (!offerings) await admin.from('partner_listings').delete().eq('id', own.id)
  else await admin.from('partner_listings').update({ status: started }).eq('id', own.id)
}

await A.client.auth.signOut()
await B.client.auth.signOut()

console.log(`\n  ${bad ? cross : tick} ${ran - bad}/${ran} partner-isolation checks passed\n`)
process.exit(bad ? 1 : 0)
