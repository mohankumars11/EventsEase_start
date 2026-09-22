#!/usr/bin/env node
/**
 * Remove the uploaded files belonging to partner accounts, over the
 * Storage API.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT SQL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `DELETE FROM storage.objects` raises 42501 — Supabase installs a
 * BEFORE DELETE trigger, storage.protect_delete(), that refuses every
 * direct delete whatever the role, because removing the row leaves the
 * file orphaned in the bucket with nothing left pointing at it. The
 * Storage API removes both halves.
 *
 * ── Run this BEFORE the SQL purge ────────────────────────────────────
 * Paths are <vendor_id>/<kind>-<epoch>.<ext> (migrations 093, 102). Once
 * auth.users is deleted the vendor rows cascade away, and with them the
 * only record of which prefixes were theirs. So: files first, rows after.
 *
 *   node scripts/purge-partner-storage.mjs a@x.com b@y.com           # dry run
 *   node scripts/purge-partner-storage.mjs --apply a@x.com b@y.com   # removes
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

/* partner-avatars was missing from this list until an audit of the live
   buckets found a partner photograph sitting in it. Its RLS checks
   (storage.foldername(name))[1] against the caller's vendor rows, so it
   is keyed the same way as the rest -- it was simply never listed. */
const BUCKETS = ['partner-documents', 'partner-uploads', 'ai-uploads', 'partner-avatars']

const APPLY  = process.argv.includes('--apply')
const EMAILS = process.argv.slice(2)
  .filter(a => !a.startsWith('--'))
  .map(e => e.toLowerCase())

if (EMAILS.length === 0) {
  console.error('\n  Pass the partner emails as arguments.\n')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const URL = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('\n  .env is missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}

async function main() {
  const db = createClient(URL, KEY, { auth: { persistSession: false } })

  /* ── Emails → auth user ids ──────────────────────────────────────────
     There is no getUserByEmail in supabase-js v2, so the admin list is
     paged through and matched locally. Unmatched emails are reported
     rather than skipped silently: a typo in the list would otherwise read
     exactly like an account that was already clean. */
  const found = new Map()
    for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) { console.error('  listUsers failed:', error.message); return 1 }
    for (const u of data.users) {
      const e = (u.email || '').toLowerCase()
      if (EMAILS.includes(e)) found.set(e, u.id)
    }
    if (data.users.length < 1000) break
  }

  const missing = EMAILS.filter(e => !found.has(e))
  if (missing.length) console.log(`  not in auth.users: ${missing.join(', ')}`)
  if (found.size === 0) { console.log('\n  Nothing to do.\n'); return 0 }

  /* ── User ids → vendor ids, which ARE the storage path prefixes ─────── */
  const { data: vendors, error: vErr } = await db
    .from('vendors')
    .select('id, business_name, profile_id')
    .in('profile_id', [...found.values()])

  if (vErr) { console.error('  vendors lookup failed:', vErr.message); return 1 }

  console.log(`\n  ${found.size} account(s), ${vendors.length} vendor row(s)\n`)

  /* ── The prefixes to sweep ──────────────────────────────────────────
     NOT just vendor ids. An audit of the live buckets found partner
     files under the AUTH USER id as well -- partner-uploads is keyed
     that way for at least one account. Missing those left a partner's
     documents in the bucket after their account was deleted, with
     nothing left to find them by. Both id spaces are UUIDs and cannot
     collide, so sweeping both is safe and costs one list() each. */
  const prefixes = [
    ...vendors.map(v => ({ id: v.id, label: v.business_name || 'vendor' })),
    ...[...found.entries()].map(([email, id]) => ({ id, label: email })),
  ]

  if (!prefixes.length) { console.log('\n  Nothing to sweep.\n'); return 0 }

  /* ── List each prefix, then remove what is there ─────────────────────
     list() is not recursive. Every partner bucket is one flat level of
     files under the id, so one call per prefix is the whole tree — but a
     nested folder would be missed, so anything that comes back as a
     folder (null id) is reported instead of being quietly left behind. */
  let removed = 0, skipped = 0
  for (const bucket of BUCKETS) {
    for (const pfx of prefixes) {
      const { data: items, error } = await db.storage.from(bucket).list(pfx.id, { limit: 1000 })
      if (error) { console.error(`  ${bucket}/${pfx.id}: ${error.message}`); continue }
      if (!items.length) continue

      const files   = items.filter(i => i.id !== null).map(i => `${pfx.id}/${i.name}`)
      const folders = items.filter(i => i.id === null).map(i => `${pfx.id}/${i.name}/`)

      for (const f of folders) console.log(`  ! nested folder, not removed: ${bucket}/${f}`)
      if (!files.length) continue

      console.log(`  ${bucket}/${pfx.id}  (${pfx.label})  ${files.length} file(s)`)
      for (const f of files) console.log(`      ${f.split('/').pop()}`)

      if (APPLY) {
        const { error: rmErr } = await db.storage.from(bucket).remove(files)
        if (rmErr) { console.error(`      remove failed: ${rmErr.message}`); skipped += files.length }
        else removed += files.length
      } else {
        skipped += files.length
      }
    }
  }

  console.log(APPLY
    ? `\n  Removed ${removed} file(s)${skipped ? `, ${skipped} failed` : ''}.\n`
    : `\n  Dry run — ${skipped} file(s) would be removed. Re-run with --apply.\n`)

  return 0
}

process.exitCode = await main()
