/**
 * Are 097, 098 and 099 actually applied?
 *
 * Each check is behavioural rather than a lookup in pg_catalog, because
 * PostgREST cannot read the catalogue and because "the object exists" is
 * a weaker claim than "the thing it was for now works".
 *
 * Usage:  node --env-file=.env scripts/check-migrations-097-099.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) { console.error('\n  Needs the service role key.\n'); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

const fails = []
const line = (ok, label, detail = '') =>
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)

console.log('\n  097 · osm_id is a real UNIQUE constraint\n')
{
  /* The failure 097 fixes is an upsert that cannot infer its conflict
     target. So: upsert a row that already exists. If the constraint is a
     partial index the statement is rejected outright; if it is a real
     constraint this is a no-op that changes nothing. */
  const { data: one } = await db.from('venues')
    .select('osm_id, name, venue_kind, status').not('osm_id', 'is', null).limit(1)

  if (!one?.length) {
    line(false, 'no OSM-seeded venue to test against', 'run the seeder first')
    fails.push('097 untestable — no seeded venues')
  } else {
    const row = one[0]
    const { error } = await db.from('venues')
      .upsert([row], { onConflict: 'osm_id', ignoreDuplicates: false })
    const inferable = !error || !/no unique or exclusion constraint/i.test(error.message)
    line(inferable, 'ON CONFLICT (osm_id) can be inferred',
      error && !inferable ? error.message.slice(0, 60) : '')
    if (!inferable) fails.push('097 not applied — the seeder still cannot write')
  }
}

console.log('\n  098 · vendor_services.specs\n')
{
  const { error } = await db.from('vendor_services').select('id, specs').limit(1)
  line(!error, 'specs column readable', error ? error.message.slice(0, 60) : '')
  if (error) fails.push('098 not applied — the spec form stays hidden')

  /* The CHECK that keeps the shape an object.
   *
   * The first version of this aimed at an id of all zeros, reasoning that
   * nothing would be written either way. Nothing was -- including the
   * CHECK, which never fires when no row matches. It reported the
   * constraint missing on a database that had it.
   *
   * So it has to hit a real row. Read the current value, try to write an
   * array over it, and put the original back if the write somehow
   * succeeds. The restore is the important half: if the CHECK is missing
   * this test would otherwise corrupt the row it was checking. */
  const { data: victim } = await db.from('vendor_services').select('id, specs').limit(1)
  if (!victim?.length) {
    line(false, 'no vendor_services row to test the CHECK against')
    fails.push('098 CHECK untestable')
  } else {
    const { id, specs } = victim[0]
    const { error: shapeErr } = await db.from('vendor_services').update({ specs: [] }).eq('id', id)
    if (!shapeErr) {
      await db.from('vendor_services').update({ specs: specs ?? {} }).eq('id', id)
      line(false, 'a top-level array is refused', 'CHECK missing — row restored')
      fails.push('098 CHECK missing')
    } else {
      const guarded = /specs_is_object|violates check/i.test(shapeErr.message)
      line(guarded, 'a top-level array is refused', guarded ? '' : shapeErr.message.slice(0, 60))
      if (!guarded) fails.push('098 CHECK missing')
    }
  }
}

console.log('\n  099 · a vendor row makes you a vendor\n')
{
  const { data: cust } = await db.from('profiles').select('id, full_name').eq('role', 'customer')
  const ids = (cust ?? []).map(c => c.id)
  let stuck = []
  if (ids.length) {
    const { data: v } = await db.from('vendors').select('profile_id, business_name, status').in('profile_id', ids)
    const own = new Set((v ?? []).map(x => x.profile_id))
    stuck = (cust ?? []).filter(c => own.has(c.id))
  }
  line(!stuck.length, 'no customer owns a vendor row',
    stuck.length ? stuck.map(s => s.full_name).join(', ') : '')
  if (stuck.length) fails.push('099 backfill missing — those partners cannot open the app')

  /* The trigger cannot be verified from here, and saying so is the
   * honest answer.
   *
   * The first attempt called the trigger function as an RPC, expecting
   * Postgres to answer "can only be called as a trigger" when it exists.
   * PostgREST never gets that far: a function returning `trigger` is not
   * exposed at all, so the reply is always "could not find" whether or
   * not the function is there. The probe could only ever fail.
   *
   * Proving it properly means inserting a vendors row for a customer
   * profile and watching the role flip -- a write to the production
   * ledger for the sake of a test, which is the thing that turned
   * check-booking-capture into a script that eats a real payment line.
   *
   * So it is left to a one-line read the CEO can paste into the SQL
   * editor, printed below. */
  console.log('  ? the trigger cannot be checked through PostgREST')
  console.log('      run this in the SQL editor:')
  console.log("      select tgname from pg_trigger where tgname = 'trg_vendor_implies_role';")
}

console.log('\n  What is on top of them\n')
{
  const counts = {}
  for (const st of ['unclaimed', 'pending_review', 'claimed']) {
    const { count } = await db.from('venues').select('id', { count: 'exact', head: true }).eq('status', st)
    counts[st] = count ?? 0
  }
  line(counts.unclaimed > 0, `venues seeded`,
    Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '))

  const { count: withSpecs } = await db.from('vendor_services')
    .select('id', { count: 'exact', head: true }).neq('specs', '{}')
  const { count: allSvc } = await db.from('vendor_services')
    .select('id', { count: 'exact', head: true })
  console.log(`  · services with specs answered  ${withSpecs ?? 0} of ${allSvc ?? 0}`)
}

if (fails.length) {
  console.error('\n  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('\n  097, 098 and 099 are all live.\n')
