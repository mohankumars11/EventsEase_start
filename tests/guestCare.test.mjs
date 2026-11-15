/**
 * Guest care: the host's arrivals board is counted from the guests' own
 * travel answers. (The database side — rsvp_travel, the circle functions —
 * is migration 192 and is checked live once it is applied.)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/guestCare.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: { contents: "export { careTally, missing192, circleLink } from './src/customer/lib/guestCare.js'", resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' },
  plugins: [{ name: 'stub-supabase', setup: b => b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: join(ROOT, 'tests/stubs/supabase.mjs') })) }],
})
const G = await import(pathToFileURL(out).href)

const guests = [
  { id: 'a', name: 'Ravi', status: 'attending', adults: 2, kids: 1, vip: false, travel: { mode: 'flight', ref: '6E 517', arrive_at: '2026-11-14T09:30', pickup: true, stay: true, rooms: 1, nights: 2 } },
  { id: 'b', name: 'Meena', status: 'attending', adults: 1, kids: 0, vip: true, travel: { mode: 'train', arrive_at: '2026-11-14T11:00', pickup: true } },
  { id: 'c', name: 'Suresh', status: 'declined', adults: 0, kids: 0, vip: true, travel: { mode: 'flight', pickup: true, stay: true, rooms: 3, nights: 3 } },
  { id: 'd', name: 'Kavya', status: 'maybe', adults: 1, kids: 0, travel: { mode: 'car', drop: true } },
  { id: 'e', name: 'Lakshmi', status: 'pending', adults: 0, kids: 0 },
]

test('pickups count people, rooms count room-nights, declined guests are left out', () => {
  const t = G.careTally(guests)
  assert.equal(t.withTravel, 3)
  assert.equal(t.pickups, 3 + 1)
  assert.equal(t.pickupGuests, 2)
  assert.equal(t.rooms, 1)
  assert.equal(t.roomNights, 2)
  assert.equal(t.drops, 1)
  assert.equal(t.vip, 1)
  assert.deepEqual(t.byMode, { flight: 1, train: 1, car: 1 })
})

test('the arrivals board puts VIPs first, then by arrival time', () => {
  assert.deepEqual(G.careTally(guests).arrivals.map(g => g.name), ['Meena', 'Ravi', 'Kavya'])
})

test('a missing migration is recognised, so the screens hide the feature instead of erroring', () => {
  assert.ok(G.missing192({ code: 'PGRST202', message: 'Could not find the function public.circle_feed' }))
  assert.ok(G.missing192({ code: '42703', message: 'column invitations.care does not exist' }))
  assert.ok(!G.missing192({ code: 'P0001', message: 'Join the circle first' }))
})

test('a circle link opens the join page', () => {
  assert.match(G.circleLink('abc123'), /\/rsvp\/circle\/abc123$/)
})
