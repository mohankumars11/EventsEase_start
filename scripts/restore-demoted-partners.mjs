/* Restore every partner the upsert clobber demoted.
   Same query as 099's backfill: a profile marked 'customer' that owns a
   vendor row is, by definition, a partner. 099's trigger only fires on
   INSERT, so a row demoted afterwards stays demoted. */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) throw new Error('missing env')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: cust, error: e1 } = await db
  .from('profiles').select('id, full_name, email').eq('role', 'customer')
if (e1) throw e1

const ids = (cust ?? []).map(c => c.id)
const { data: v, error: e2 } = ids.length
  ? await db.from('vendors').select('profile_id, business_name, status').in('profile_id', ids)
  : { data: [], error: null }
if (e2) throw e2

const byProfile = new Map((v ?? []).map(x => [x.profile_id, x]))
const stuck = (cust ?? []).filter(c => byProfile.has(c.id))

console.log(`  profiles marked customer : ${cust?.length ?? 0}`)
console.log(`  of those, owning a vendor: ${stuck.length}`)

for (const r of stuck) {
  const biz = byProfile.get(r.id)
  const { error } = await db.from('profiles').update({ role: 'vendor' }).eq('id', r.id)
  console.log(`   ${error ? 'FAILED' : 'restored'}  ${r.email ?? r.full_name}  ->  ${biz.business_name} (${biz.status})`)
  if (error) console.log('     ' + error.message)
}
console.log(stuck.length ? '\n  done' : '\n  nothing to restore')
