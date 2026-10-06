#!/usr/bin/env node
/**
 * Read-only audit of every storage bucket: what is in it, and at what
 * path shape. Writes nothing, deletes nothing.
 *
 * Exists to answer "did the purge actually find everything?" -- the
 * purge assumes partner files live under <vendor_id>/ in three buckets.
 * This checks that assumption against what is really there.
 *
 *   node scripts/audit-storage-buckets.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

async function main() {
  const { data: buckets, error } = await db.storage.listBuckets()
  if (error) { console.error('  listBuckets:', error.message); return 1 }

  const { data: vendors } = await db
    .from('vendors').select('id').not('profile_id', 'is', null)
  const vendorIds = new Set((vendors || []).map(v => v.id))

  for (const b of buckets) {
    const { data: top, error: e } = await db.storage.from(b.name).list('', { limit: 1000 })
    if (e) { console.log(`\n  ${b.name}: ${e.message}`); continue }

    const folders = top.filter(i => i.id === null)
    const files   = top.filter(i => i.id !== null)

    console.log(`\n  ${b.name}  (public=${b.public})`)
    console.log(`    ${folders.length} folder(s), ${files.length} loose file(s) at root`)

    /* Does any top-level folder look like a live partner? If files sit
       under something that is NOT a vendor id, the purge never saw them. */
    let partnerFolders = 0, otherFolders = []
    for (const f of folders) {
      if (vendorIds.has(f.name)) partnerFolders++
      else otherFolders.push(f.name)
    }
    if (partnerFolders) console.log(`    ${partnerFolders} folder(s) named after a live vendor id`)
    if (otherFolders.length) {
      console.log(`    ${otherFolders.length} folder(s) NOT a live vendor id:`)
      for (const f of otherFolders.slice(0, 15)) {
        const { data: inner } = await db.storage.from(b.name).list(f, { limit: 1000 })
        console.log(`        ${f}/  (${(inner || []).length} entr(y/ies))`)
      }
      if (otherFolders.length > 15) console.log(`        ... and ${otherFolders.length - 15} more`)
    }
    for (const f of files.slice(0, 10)) console.log(`        ${f.name}`)
  }
  console.log('')
  return 0
}

process.exitCode = await main()
