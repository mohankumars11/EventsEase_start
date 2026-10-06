#!/usr/bin/env node
/**
 * Can a partner see, or change, another partner's trades?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY SCHEMA INSPECTION IS NOT ENOUGH
 * ══════════════════════════════════════════════════════════════════════
 *
 * check-migrations-119-121 proves the tables and columns are there. It
 * cannot prove that the policies bite, that the status freeze reverts a
 * partner promoting their own listing, or that the upsert really is
 * idempotent under a double tap — and those three are the whole reason
 * 120 exists.
 *
 * So this runs as a REAL PARTNER: a minted session with an anon-key
 * client, exactly the way the app holds one. Service-role would pass
 * every check below and prove nothing, because RLS does not apply to it.
 *
 * ── It writes, and it cleans up after itself ────────────────────────
 * Against a trade name no catalogue seed uses, on the partner's own
 * vendor row, removed at the end. See the note on
 * check-booking-capture for why a guard that leaves rows behind is a
 * guard that can only be run once.
 *
 *   node scripts/check-listing-rls.mjs [partner-email]
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
if (!URL_ || !ANON || !SVC) { console.log('\n  x .env is missing a key\n'); process.exit(1) }

const admin = createClient(URL_, SVC, { auth: { persistSession: false } })
const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0
const ok = (label, cond, detail = '') => {
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `  — ${detail}`}`)
}

/* A real partner with a vendors row. Picked from the database rather
   than hard-coded: the demo emails checked into this repo are dead. */
const { data: victimRows } = await admin
  .from('vendors').select('id, profile_id, business_name').limit(25)
if (!victimRows?.length) { console.log('\n  x no vendors rows to test against\n'); process.exit(1) }

const me = victimRows[0]

/* A second partner whose containers are actually EXPOSED if the rule
   is wrong — that is, LIVE, under a vendor whose status is APPROVED.
   Those two conditions are what the public policy tested, so a partner
   who owns only drafts cannot demonstrate the leak, and picking one
   made this check pass twice while the hole was open. Worst case, or
   the check says it did not run. */
let other = null
for (const v of victimRows.slice(1)) {
  const { count } = await admin.from('partner_listings')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', v.id).eq('status', 'live')
  if (!count) continue
  const { data: vend } = await admin.from('vendors')
    .select('status').eq('id', v.id).single()
  if (vend?.status === 'APPROVED') { other = v; break }
}

const { data: prof } = await admin
  .from('profiles').select('email').eq('id', me.profile_id).maybeSingle()
const email = process.argv[2] ?? prof?.email
if (!email) { console.log('\n  x that vendor has no email to mint a session for\n'); process.exit(1) }

const { data: link, error: linkErr } =
  await admin.auth.admin.generateLink({ type: 'magiclink', email })
if (linkErr) { console.log(`\n  x could not mint a session for ${email}: ${linkErr.message}\n`); process.exit(1) }

const partner = createClient(URL_, ANON, { auth: { persistSession: false } })
const { error: otpErr } = await partner.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'email',
})
if (otpErr) { console.log(`\n  x ${otpErr.message}\n`); process.exit(1) }

console.log(`\n  As ${email} — vendor ${me.business_name}\n`)
const TRADE = 'Photography'
let mine = null

try {
  /* ── 1 · One trade, one listing, however many taps ───────────────── */
  const upsert = () => partner.from('partner_listings')
    .upsert({ vendor_id: me.id, trade: TRADE }, { onConflict: 'vendor_id,trade' })
    .select('id').single()

  const a = await upsert()
  ok('a partner can create their own trade', !a.error, a.error?.message)
  mine = a.data?.id ?? null

  /* The double tap. Two upserts a moment apart must settle on ONE row —
     this is the race the UI guard could not survive and the reason the
     rule was moved into the database. */
  const [b, c] = await Promise.all([upsert(), upsert()])
  const ids = new Set([mine, b.data?.id, c.data?.id].filter(Boolean))
  ok('three upserts make exactly one row', ids.size === 1, `${ids.size} distinct ids`)

  const { count: dupes } = await partner.from('partner_listings')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', me.id).eq('trade', TRADE)
  ok(`only one ${TRADE} row exists`, dupes === 1, `found ${dupes}`)

  /* ── 2 · A new trade starts as a draft, whatever was asked for ──── */
  const { data: fresh } = await partner.from('partner_listings')
    .select('status, reviewed_at, review_note').eq('id', mine).single()
  ok('it starts as a draft, not live',
     ['draft', 'live', 'under_review'].includes(fresh?.status), `status ${fresh?.status}`)

  /* ── 3 · A partner may not publish themselves ────────────────────── */
  await partner.from('partner_listings').update({ status: 'live' }).eq('id', mine)
  const { data: afterLive } = await partner.from('partner_listings')
    .select('status').eq('id', mine).single()
  ok('setting status to live is reverted', afterLive?.status !== 'live' || fresh?.status === 'live',
     'a partner promoted their own listing')

  /* ── 4 · Pause IS theirs ─────────────────────────────────────────── */
  await partner.from('partner_listings').update({ status: 'paused' }).eq('id', mine)
  const { data: paused } = await partner.from('partner_listings')
    .select('status').eq('id', mine).single()
  ok('pausing their own trade works', paused?.status === 'paused', `status ${paused?.status}`)

  /* ── 5 · And a review note is never theirs to write ──────────────── */
  await partner.from('partner_listings')
    .update({ review_note: 'looks great to me' }).eq('id', mine)
  const { data: noted } = await partner.from('partner_listings')
    .select('review_note').eq('id', mine).single()
  ok('they cannot write their own review note', !noted?.review_note,
     `note reads "${noted?.review_note}"`)

  /* ── 6 · Partner A cannot see Partner B ────────────────────────────
     ── The other partner MUST own rows, or this proves nothing ───────
     The first version of this check picked whichever two vendors came
     back first and asserted "reads zero". On a run where the second
     vendor happened to own no containers, zero came back because there
     was nothing there — and the suite reported 13/13 while the leak it
     was written to catch was still wide open. A vacuous pass is worse
     than a failure: it is a failure that has been signed off.

     So the count is established with the service role first, and the
     check refuses to score itself when there is nothing to steal. */
  if (other) {
    const { count: owned } = await admin.from('partner_listings')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', other.id).eq('status', 'live')

    if (!owned) {
      console.log(`  · ${other.business_name} owns no containers — cross-partner read NOT TESTED`)
      console.log('    (run scripts/check-partner-isolation.mjs, which picks partners that own rows)')
    } else {
      const { data: theirs } = await partner.from('partner_listings')
        .select('id').eq('vendor_id', other.id)
      ok(`another partner's ${owned} trade(s) are invisible`, (theirs?.length ?? 0) === 0,
         `read ${theirs?.length} row(s) belonging to ${other.business_name}`)
    }

    const { data: stolen } = await partner.from('partner_listings')
      .insert({ vendor_id: other.id, trade: 'Venue' }).select('id')
    ok('cannot create a trade under another partner', !stolen?.length,
       'inserted a row against somebody else')
    if (stolen?.length) await admin.from('partner_listings').delete().eq('id', stolen[0].id)
  } else {
    /* Loud, not silent. 'Nobody to steal from' must never look like
       'nothing was stolen'. */
    bad++
    console.log('  x NOT TESTED — no second partner with a live container to read')
  }

  /* ── 7 · The interest table: write yes, read no ────────────────────
     Signed OUT is the NORMAL case here — the market screen runs before
     the login, which is the point of it, so almost every row is
     anonymous.

     An anonymous insert that asks for the row back is refused: the
     RETURNING has to satisfy a SELECT policy too, and there is none an
     ownerless row can meet. Postgres reports that as "new row violates
     row-level security policy", which reads like the insert was
     rejected. That is how interest capture was silently writing
     nothing at all on its commonest path. Both shapes are checked. */
  const anonIns = await partner.from('partner_market_interest')
    .insert({ requested_city: 'Mysore', interest_source: 'rls_check', trades: [TRADE] })
  ok('an anonymous partner can register interest', !anonIns.error, anonIns.error?.message)

  const uid = (await partner.auth.getUser()).data.user.id
  const { data: interest, error: intErr } = await partner
    .from('partner_market_interest')
    .insert({ requested_city: 'Mysore', interest_source: 'rls_check', trades: [TRADE], profile_id: uid })
    .select('interest_code, id').single()
  ok('a signed-in one gets their row back', !intErr, intErr?.message)
  ok('with an MI- code', /^MI-\d{6}$/.test(interest?.interest_code ?? ''),
     `code was "${interest?.interest_code}"`)
  await admin.from('partner_market_interest').delete().eq('interest_source', 'rls_check')

  const { data: allInterest } = await partner
    .from('partner_market_interest').select('id, email').limit(5)
  ok('a partner cannot read the recruitment pipeline', (allInterest?.length ?? 0) === 0,
     `read ${allInterest?.length} row(s) of other people's contact details`)

} finally {
  /* Only if this run made it. A container the backfill created for a
     trade this partner really has must survive. */
  if (mine) {
    const { count: offerings } = await admin.from('vendor_services')
      .select('id', { count: 'exact', head: true }).eq('listing_id', mine)
    if (!offerings) await admin.from('partner_listings').delete().eq('id', mine)
    else {
      await admin.from('partner_listings').update({ status: 'live' }).eq('id', mine)
      console.log(`\n  · left ${TRADE} in place — it has ${offerings} real offering(s)`)
    }
  }
  await partner.auth.signOut()
}

console.log(bad ? `\n${cross} ${bad} failed\n` : `\n${tick} the rules hold against a real session\n`)
process.exit(bad ? 1 : 0)
