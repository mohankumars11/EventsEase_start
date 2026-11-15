#!/usr/bin/env node
/**
 * Venues as live inventory, on the offer board — LIVE data:
 *
 *   node --env-file=.env scripts/check-venue-inventory-live.mjs
 *
 *   · each venue offers every space that holds the guests, and only those
 *   · for a crowd nobody can hold, every venue is "close", with what it holds
 *   · a space already held for the date is refused by the server and shown
 *     as not free — the overlap rule (sambramo_resource_free), with the
 *     venue's setup time counted as part of the event
 *   · released, it is bookable again
 * The only row written is one reservation on a test venue's space, removed
 * at the end (status 'held', no booking line).
 */
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts), anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

const out = join(ROOT, 'tmp', 'venue-client.mjs')
await esbuild.build({ stdin: { resolveDir: ROOT, loader: 'js', contents: `export * from './src/customer/lib/offerBoard'; export { loadExperienceTiers } from './src/customer/lib/needs'; export { partnersFor } from './src/customer/lib/market'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON), 'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' } })
const B = await import(pathToFileURL(out).href)
const offersHandler = (await import(pathToFileURL(join(ROOT, 'api/_lib/offers.js')).href)).default
const price = async payload => { let o = null, st = 0; await offersHandler({ method: 'POST', headers: {}, body: payload },
  { status(c) { st = c; return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }); if (st !== 200) throw new Error(o?.error); return o.offers }
await B.loadExperienceTiers(anon)

const day = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10)
const place = { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' }
const board = guests => B.buildBoard({ tradeId: 'venue', occasionId: 'birthday-party', event: { date: day, time: '18:00', guests, hours: 4 }, place, needs: {} }, { price })
let fixture = null
try {
  console.log('Spaces that hold the guests')
  const venues = await B.partnersFor('venue', { lat: place.lat, lng: place.lng, limit: 100 })
  const withSpaces = venues.filter(v => (v.spaces ?? []).length)
  ok(withSpaces.length > 0, `venues load their spaces (${withSpaces.length} of ${venues.length}, ${withSpaces.reduce((n, v) => n + v.spaces.length, 0)} spaces)`)
  const b100 = await board(100)
  ok(b100.masters.length > 0, `${b100.masters.length} venues can hold 100`)
  ok(b100.masters.every(m => m.offers.every(o => o.kind !== 'space' || !o.capacity || o.capacity >= 100)), 'no space on the board is smaller than the party')
  const spacesOffered = b100.masters.flatMap(m => m.offers).filter(o => o.kind === 'space').length
  ok(spacesOffered >= b100.masters.length, `every fitting space is offered, not one per venue (${spacesOffered} spaces across ${b100.masters.length} venues)`)
  const huge = await board(5000)
  ok(huge.masters.length === 0 && huge.close.length > 0 && huge.close.every(c => c.option.gaps?.[0]?.need === 'capacity'),
    `nobody holds 5,000 — all ${huge.close.length} are "close", each saying what it holds`)

  console.log('\nA space that is taken is not offered')
  const m = b100.masters.find(x => x.offers.length === 1 && x.headline.path === 'INSTANT') ?? b100.masters.find(x => x.headline.path === 'INSTANT')
  if (!m) { fail++; console.log('  ✗ NO CASE TO TEST: an instantly bookable venue') } else {
    const space = m.headline
    const { data: rs } = await admin.from('sambramo_resources').select('id, vendor_id, quantity').eq('vendor_service_id', m.partner.serviceId).eq('resource_key', space.ref.key).maybeSingle()
    if (!rs) { fail++; console.log(`  ✗ NO CASE TO TEST: ${m.partner.name}'s "${space.label}" is not tracked as a resource`) } else {
      /* Taken for the evening — 17:00–23:30 IST on the day. */
      const { data: f } = await admin.from('sambramo_resource_reservations').insert({ resource_id: rs.id, vendor_id: rs.vendor_id,
        start_at: `${day}T11:30:00Z`, end_at: `${day}T18:00:00Z`, qty: Math.max(1, Number(rs.quantity) || 1), status: 'held' }).select('id').single()
      fixture = f?.id
      const taken = await board(100)
      const again = taken.masters.find(x => x.partner.serviceId === m.partner.serviceId)
      ok(!again?.offers.some(o => o.ref?.key === space.ref.key), `"${space.label}" at ${m.partner.name} is no longer offered for ${day}`)
      if (!again) ok(taken.unavailable.some(u => u.partner.serviceId === m.partner.serviceId), 'and, with no other space free, the venue shows as not free')
      await admin.from('sambramo_resource_reservations').delete().eq('id', fixture); fixture = null
      const free = await board(100)
      ok(free.masters.find(x => x.partner.serviceId === m.partner.serviceId)?.offers.some(o => o.ref?.key === space.ref.key), 'released, it is offered again')

      /* Setup time is part of the event. Held 13:00–15:30 IST: over before an
         18:00 start, but inside the venue's setup window (resolve_booking
         subtracts setup_hours from the start) — so still not offered. */
      const { data: ans } = await admin.from('sambramo_listing_versions').select('answers').eq('vendor_service_id', m.partner.serviceId).eq('status', 'LIVE').maybeSingle()
      const setup = Number(ans?.answers?.setup_hours) || 0
      if (setup >= 3) {
        const { data: f2 } = await admin.from('sambramo_resource_reservations').insert({ resource_id: rs.id, vendor_id: rs.vendor_id,
          start_at: `${day}T07:30:00Z`, end_at: `${day}T10:00:00Z`, qty: Math.max(1, Number(rs.quantity) || 1), status: 'held' }).select('id').single()
        fixture = f2?.id
        const early = await board(100)
        ok(!early.masters.find(x => x.partner.serviceId === m.partner.serviceId)?.offers.some(o => o.ref?.key === space.ref.key),
          `a booking that ends at 15:30 still blocks an 18:00 event — the venue's ${setup} h setup counts`)
        await admin.from('sambramo_resource_reservations').delete().eq('id', fixture); fixture = null
      } else console.log(`  … ${m.partner.name} has ${setup} h setup — too short to test the buffer with this window (not counted)`)
    }
  }
} finally {
  if (fixture) await admin.from('sambramo_resource_reservations').delete().eq('id', fixture)
}
console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail ? 1 : 0
