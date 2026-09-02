/**
 * The things about venues that must never be true.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE FIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every one of them is a failure a person would notice only after it had
 * cost somebody an event, and none of them shows up as an error in a log.
 *
 *   1  ONE OWNER PER VENUE
 *      Two managers at one hotel both tapping claim is the normal first
 *      day, not a rare race. Two owners means two people editing one
 *      calendar with no idea the other exists.
 *
 *   2  NO SPACE SOLD TWICE FOR ONE SESSION
 *      The unique index makes this impossible; this asserts the index is
 *      still there. An index dropped during a migration is silent until
 *      two weddings arrive at one hall.
 *
 *   3  EVERY BOOKABLE VENUE HAS A LOCATION
 *      `venues_available` returns halls with no coordinates, and then
 *      `venue_alternatives` cannot sort them and dispatch cannot anchor
 *      to them. A NULL location is a hall that half works.
 *
 *   4  NO CLAIMED VENUE WITHOUT A HALL
 *      A claimed venue with no `venue_spaces` row appears nowhere and
 *      earns nothing, and its manager has no way to find that out. This
 *      is the state to go and phone somebody about.
 *
 *   5  NOTHING UNCLAIMED IS BOOKABLE
 *      273 venues were seeded from OSM without their owners' knowledge.
 *      Offering one for booking would be selling a hall we have no
 *      relationship with — the DPDP problem the seed was designed around.
 *
 * Falsifiable: each check was run against a deliberately broken fixture
 * before being trusted.
 *
 * Usage:  node --env-file=.env scripts/check-venue-invariants.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('\n  Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n')
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const fails = []
const line = (ok, label, detail = '') =>
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)

/* Missing tables mean 094 has not been applied. That is a different
   message from "your data is wrong", and conflating them sends somebody
   hunting for a bug in rows that do not exist. */
const probe = await db.from('venues').select('id').limit(1)
if (probe.error) {
  console.error(`\n  Cannot read venues: ${probe.error.message}`)
  console.error('  Apply migration 094 first.\n')
  process.exit(2)
}

console.log('\n  Venue invariants\n')

// ── 1 · One owner per venue ────────────────────────────────────────
{
  const { data } = await db.from('venue_managers').select('venue_id, role')
  const owners = {}
  for (const m of data ?? []) {
    if (m.role !== 'OWNER') continue
    owners[m.venue_id] = (owners[m.venue_id] ?? 0) + 1
  }
  const bad = Object.entries(owners).filter(([, n]) => n > 1)
  line(!bad.length, 'one owner per venue', bad.length ? `${bad.length} with two` : '')
  if (bad.length) fails.push(`venues with more than one OWNER: ${bad.map(([id]) => id).join(', ')}`)
}

// ── 2 · No space sold twice for one session ────────────────────────
{
  const { data } = await db.from('venue_slots').select('space_id, slot_date, session, status')
  const seen = new Set()
  const dupes = []
  for (const s of data ?? []) {
    const k = `${s.space_id}|${s.slot_date}|${s.session}`
    if (seen.has(k)) dupes.push(k)
    seen.add(k)
  }
  line(!dupes.length, 'one slot per space per session', dupes.length ? `${dupes.length} duplicated` : '')
  if (dupes.length) fails.push(`duplicate slots — the unique index is gone: ${dupes.slice(0, 3).join(', ')}`)

  /* The overlap rule, checked from the outside. A full_day row sitting
     next to a morning row on the same date means one of them was written
     without going through venue_space_free. */
  const byDay = {}
  for (const s of data ?? []) (byDay[`${s.space_id}|${s.slot_date}`] ??= []).push(s.session)
  const clashes = Object.entries(byDay)
    .filter(([, ss]) => ss.includes('full_day') && ss.length > 1)
  line(!clashes.length, 'no full_day overlapping a session', clashes.length ? `${clashes.length} clashing` : '')
  if (clashes.length) fails.push(`full_day sits on top of another session: ${clashes.slice(0, 3).map(([k]) => k).join(', ')}`)
}

// ── 3 · Every bookable venue has a location ────────────────────────
{
  const { data } = await db.from('venues').select('id, name, status, lat, lng').eq('status', 'claimed')
  const bad = (data ?? []).filter(v => v.lat == null || v.lng == null)
  line(!bad.length, 'claimed venues have coordinates', bad.length ? `${bad.length} without` : '')
  if (bad.length) fails.push(`claimed with no location: ${bad.map(v => v.name).slice(0, 3).join(', ')}`)
}

// ── 4 · No claimed venue without a hall ────────────────────────────
{
  const { data } = await db.from('venues')
    .select('id, name, spaces:venue_spaces(id)').eq('status', 'claimed')
  const bad = (data ?? []).filter(v => !(v.spaces ?? []).length)
  line(!bad.length, 'claimed venues have at least one hall', bad.length ? `${bad.length} empty` : '')
  /* A warning, not a failure. It is a real state — somebody claimed the
     venue five minutes ago and has not added a hall yet — and failing the
     build for it would make this script cry wolf. */
  if (bad.length) console.log(`      → phone them: ${bad.map(v => v.name).slice(0, 5).join(', ')}`)
}

// ── 5 · Nothing unclaimed is bookable ──────────────────────────────
{
  const { data } = await db.from('venue_spaces')
    .select('id, venue:venues(status, name)')
  const bad = (data ?? []).filter(s => s.venue && s.venue.status !== 'claimed')
  line(!bad.length, 'only claimed venues have halls', bad.length ? `${bad.length} on unclaimed` : '')
  if (bad.length) fails.push(`halls on venues nobody owns: ${bad.map(s => s.venue.name).slice(0, 3).join(', ')}`)
}

// ── The seed, for context ──────────────────────────────────────────
{
  const counts = {}
  for (const st of ['unclaimed', 'pending_review', 'claimed', 'rejected']) {
    const { count } = await db.from('venues')
      .select('id', { count: 'exact', head: true }).eq('status', st)
    counts[st] = count ?? 0
  }
  console.log(`\n  ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join('   ')}`)
}

if (fails.length) {
  console.error('\n  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('\n  All venue invariants hold.\n')
