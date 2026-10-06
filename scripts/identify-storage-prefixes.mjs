#!/usr/bin/env node
/**
 * Read-only. Takes the top-level folder names found by
 * audit-storage-buckets.mjs and says what each UUID actually is:
 * an auth user, a vendor (live or synthetic), or a product.
 *
 *   node scripts/identify-storage-prefixes.mjs <uuid> [<uuid> ...]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'))

async function main() {
  if (!IDS.length) { console.error('\n  Pass UUIDs as arguments.\n'); return 1 }

  const { data: vendors } = await db
    .from('vendors').select('id, business_name, profile_id').in('id', IDS)
  const { data: products } = await db
    .from('products').select('id, name').in('id', IDS)

  const users = new Map()
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) { console.error('  listUsers:', error.message); return 1 }
    for (const u of data.users) if (IDS.includes(u.id)) users.set(u.id, u.email)
    if (data.users.length < 1000) break
  }

  console.log('')
  for (const id of IDS) {
    const v = (vendors  || []).find(x => x.id === id)
    const p = (products || []).find(x => x.id === id)
    const e = users.get(id)

    if (v) console.log(`  ${id}  VENDOR  ${v.business_name}  ${v.profile_id ? 'has login' : 'SYNTHETIC (no login)'}`)
    else if (e) console.log(`  ${id}  AUTH USER  ${e}`)
    else if (p) console.log(`  ${id}  PRODUCT  ${p.name}`)
    else console.log(`  ${id}  ORPHAN -- matches no vendor, user or product`)
  }
  console.log('')
  return 0
}

process.exitCode = await main()
