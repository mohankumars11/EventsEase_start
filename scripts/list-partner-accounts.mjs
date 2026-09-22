#!/usr/bin/env node
/**
 * List the partner accounts. Read-only: writes nothing, deletes nothing.
 *
 * The companion to purge-partner-storage.mjs, which needs the addresses
 * as arguments. Run this, copy the last line, paste it there.
 *
 *   node scripts/list-partner-accounts.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n  .env is missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

async function main() {
  /* Only vendor rows with a login. is_synthetic seed rows have
     profile_id IS NULL (migration 071) and no account to delete. */
  const { data: vendors, error } = await db
    .from('vendors')
    .select('id, business_name, profile_id, verification_status')
    .not('profile_id', 'is', null)
  if (error) { console.error('  vendors:', error.message); return 1 }

  const byProfile = new Map(vendors.map(v => [v.profile_id, v]))

  const rows = []
  for (let page = 1; ; page++) {
    const { data, error: e } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (e) { console.error('  listUsers:', e.message); return 1 }
    for (const u of data.users) {
      const v = byProfile.get(u.id)
      if (v) rows.push({ email: u.email, business: v.business_name, status: v.verification_status })
    }
    if (data.users.length < 1000) break
  }

  if (!rows.length) { console.log('\n  No partner accounts.\n'); return 0 }

  console.log(`\n  ${rows.length} partner account(s):\n`)
  for (const r of rows) {
    console.log(`    ${r.email}   ${r.business || ''}  [${r.status || '-'}]`)
  }
  console.log('\n  --- emails, ready to paste ---\n')
  console.log('  ' + rows.map(r => r.email).join(' ') + '\n')
  return 0
}

process.exitCode = await main()
