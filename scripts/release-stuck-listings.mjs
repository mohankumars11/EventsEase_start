#!/usr/bin/env node
/**
 * The closing one-off from 112, in the form that actually runs.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT THE SQL EDITOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * 112's AFTERWARDS block says to paste the UPDATE into the SQL editor
 * "as service_role". The editor is not the service role: it runs as
 * `postgres` with no JWT claims, so auth.role() is NULL, auth.uid() is
 * NULL, and caller_is_operator() is therefore FALSE.
 *
 * trg_freeze_review_status is BEFORE UPDATE FOR EACH ROW, and on a
 * non-operator it puts review_status back:
 *
 *     IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
 *       NEW.review_status := OLD.review_status;
 *
 * The UPDATE reports a row count and changes nothing -- the exact
 * silent half-completion 112 was written to end. PostgREST with the
 * service role key DOES set the claim, so the trigger lets it through.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO KINDS OF STUCK, AND ONLY ONE IS A BACKFILL
 * ══════════════════════════════════════════════════════════════════════
 *
 * 112's WHERE clause is `v.is_verified AND s.review_status='under_review'`,
 * which cannot tell apart:
 *
 *   PRE-APPROVAL   submitted before the vendor was approved. A
 *                  coordinator clicked Approve believing this went live.
 *                  Releasing it finishes what they intended.
 *
 *   POST-APPROVAL  added after approval. Nobody has ever read it.
 *                  Releasing it publishes an unreviewed listing into
 *                  dispatch, which is not a backfill -- it is a
 *                  decision, and not this script's to make.
 *
 * So they are counted separately and --apply touches PRE-APPROVAL only.
 * Use --include-unreviewed to release the others, deliberately.
 *
 *   node scripts/release-stuck-listings.mjs                       # dry run
 *   node scripts/release-stuck-listings.mjs --apply               # pre-approval only
 *   node scripts/release-stuck-listings.mjs --apply --include-unreviewed
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const ALSO_UNREVIEWED = process.argv.includes('--include-unreviewed')

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const { data: stuck, error } = await db.from('vendor_services')
  .select('id, vendor_id, category, created_at').eq('review_status', 'under_review')
if (error) { console.error('  ' + error.message); process.exit(1) }

const ids = [...new Set(stuck.map(s => s.vendor_id))]
const { data: vendors } = await db.from('vendors')
  .select('id, business_name, is_verified, verified_at').in('id', ids.length ? ids : ['-'])
const byId = Object.fromEntries((vendors ?? []).map(v => [v.id, v]))

const pre = [], post = [], unverified = []
for (const s of stuck) {
  const v = byId[s.vendor_id]
  if (!v?.is_verified) { unverified.push({ s, v }); continue }
  ;(v.verified_at && s.created_at > v.verified_at ? post : pre).push({ s, v })
}

const show = (label, rows) => {
  console.log(`\n  ${label}: ${rows.length}`)
  for (const { s, v } of rows)
    console.log(`     ${s.id}  ${(v?.business_name ?? '?').padEnd(28)} ${s.category}`)
}
console.log(`\n  ${stuck.length} listing(s) at under_review`)
show('PRE-APPROVAL  (approval was given, release finishes it)', pre)
show('POST-APPROVAL (never reviewed by anyone)', post)
show('vendor not verified (correctly waiting, not touched)', unverified)

const targets = [...pre, ...(ALSO_UNREVIEWED ? post : [])]
if (!APPLY) {
  console.log(`\n  Dry run — nothing written. --apply would release ${targets.length}.\n`)
  process.exit(0)
}
if (!targets.length) { console.log('\n  Nothing to release.\n'); process.exit(0) }

const { data: done, error: uErr } = await db.from('vendor_services')
  .update({ review_status: 'live', reviewed_at: new Date().toISOString() })
  .in('id', targets.map(t => t.s.id)).select('id, review_status')
if (uErr) { console.error('\n  ' + uErr.message + '\n'); process.exit(1) }

/* The trigger reverts silently, so trust the row back, not the call. */
const live = (done ?? []).filter(r => r.review_status === 'live')
console.log(`\n  ${live.length} of ${targets.length} now live.`)
if (live.length !== targets.length)
  console.error('  Some rows came back still under_review — the freeze trigger\n'
    + '  rejected this caller. Nothing was released.\n')
console.log()
process.exit(live.length === targets.length ? 0 : 1)
