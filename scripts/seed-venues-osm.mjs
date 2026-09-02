/**
 * Bengaluru's halls, from OpenStreetMap.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY OSM AND NOT GOOGLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The plan this project runs on already refused to scrape vendor
 * listings, for two reasons that apply here unchanged: it breaks those
 * services' terms, and loading a business into our database as a
 * bookable entity when nobody there has heard of us is a DPDP Act
 * problem the moment we act on it.
 *
 * Google Places is the same refusal. Their terms permit caching a
 * place_id and very little else; a table of their venue data is not
 * something we may keep.
 *
 * OpenStreetMap is ODbL. Storing it, deriving from it and showing it are
 * all explicitly allowed, and the only obligation is attribution —
 * "Venue data © OpenStreetMap contributors", which the venue picker
 * carries.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FILTER IS THE INTERESTING PART
 * ══════════════════════════════════════════════════════════════════════
 *
 * A plain amenity query over Bengaluru returns 402 named places, and
 * roughly a third of them are not venues at all. `amenity=community_centre`
 * in this city is mostly BBMP ward halls, welfare associations and
 * political party offices: "JDS Office", "S.C/S.T Welfare assocition",
 * "Bus staf&Reds".
 *
 * Seeding those would put 129 un-bookable rows into a dropdown a partner
 * is meant to find themselves in, and a customer is meant to browse. An
 * impossible option reads as "this app does not know what it sells" —
 * so they are dropped here rather than filtered at read time, because a
 * row that should never be offered should never exist.
 *
 * What survives is ~273 real ones: kalyana mantapas, choultries,
 * convention halls, samudaya bhavanas.
 *
 * ── What this leaves out, and why that is fine ──────────────────────
 *
 * OSM is thin on exactly the venues this market cares most about. Many
 * mantapas are simply not mapped. So this seed is HALF the supply, not
 * all of it — the partner-adds flow (VenueClaim) is the other half, and
 * always will be. A seed that pretended to be complete would be worse
 * than one that admits it is not: a manager who cannot find their hall
 * in a "complete" list concludes the app is broken.
 *
 * ── Idempotent ──────────────────────────────────────────────────────
 *
 * Upserts on `osm_id`, which has a partial unique index. Running it
 * twice changes nothing. It never touches a row whose status has moved
 * past 'unclaimed' — once a human has claimed a hall, OSM is no longer
 * the authority on it.
 *
 * Usage:  node --env-file=.env scripts/seed-venues-osm.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { BENGALURU_AREAS } from '../src/data/bengaluruAreas.js'

const DRY = process.argv.includes('--dry')

/* Greater Bengaluru. South, west, north, east — the order Overpass wants,
   which is not the order anybody says coordinates in. */
const BBOX = '12.83,77.45,13.14,77.78'

/* Three amenity tags, and no name regex.
   A regex over an unbounded name across this bbox times out on the public
   Overpass instance (504, reproducibly). Classification is cheap and
   happens below, on data we already have. */
const QUERY = `[out:json][timeout:90];
(
  nwr["amenity"="events_venue"](${BBOX});
  nwr["amenity"="community_centre"](${BBOX});
  nwr["amenity"="conference_centre"](${BBOX});
);
out center;`

/* Reads as a place people hold functions in. */
const EVENTY = /kalyana|kalyan|mantap|mandap|choultry|convention|banquet|samudaya|bhavan|bhavana|palace|paradise|garden|lawn|resort|hall$/i

/* Reads as somebody's office. Applied after EVENTY, so "Ambedkar Bhavan"
   survives and "Youth welfare association" does not. */
const JUNK = /office|party|association|sangha|sanga|union|welfare|police|library|school|college|hospital|depot|staff|training|society|trust|ward/i

/* Name to venue_kind. Ordered: the first match wins, so the more specific
   patterns come first. Everything unmatched stays 'hall', which is the
   honest answer — a manager can correct it in one tap, and a wrong
   confident guess is harder to notice than a blank one. */
const KINDS = [
  [/kalyana|kalyan|mantap|mandap|choultry/i, 'mantapa'],
  [/convention|exhibition/i,                 'convention'],
  [/resort/i,                                'resort'],
  [/hotel|inn$|residency/i,                  'hotel'],
  [/lawn|garden|farm/i,                      'lawn'],
  [/rooftop|terrace/i,                       'rooftop'],
  [/club\s?house|auditorium|samudaya|bhavan/i, 'clubhouse'],
]

function kindFor(name) {
  for (const [re, kind] of KINDS) if (re.test(name)) return kind
  return 'hall'
}

/* Nearest area centroid.
 *
 * Only 27 of 273 OSM rows carry addr:postcode, so the pincode cannot be
 * the geography. The app already has 41 area centroids in
 * data/bengaluruAreas.js and every other screen speaks in those names, so
 * a venue says "Jayanagar" the same way a partner and a customer do.
 *
 * Equirectangular rather than haversine: over 30 km the error is metres,
 * and this only has to pick a winner among centroids 2 km apart. */
function areaFor(lat, lng) {
  let best = null, bestD = Infinity
  for (const a of BENGALURU_AREAS) {
    const x = (a.lng - lng) * Math.cos((lat * Math.PI) / 180)
    const y = a.lat - lat
    const d = x * x + y * y
    if (d < bestD) { bestD = d; best = a }
  }
  /* Roughly 8 km, squared, in degrees. Beyond that the nearest centroid is
     not a description of where something is — better to say nothing than
     to file a Devanahalli resort under Hebbal. */
  return bestD > 0.0052 ? null : best.name
}

/* Public Overpass is a free service run on donated hardware and it says
   no often: 429 when you have asked recently, 504 when the query is
   expensive, 406 with no User-Agent. Two mirrors and a backoff, because
   the alternative is a seeding script that works on the third try and
   looks broken on the first two. */
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function overpass() {
  let last = null
  for (let attempt = 0; attempt < MIRRORS.length * 2; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(QUERY),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          /* Overpass answers 406 without one. */
          'user-agent': 'Sambramo/1.0 (venue seed; mohanpes328@gmail.com)',
        },
      })
      if (r.ok) {
        const els = (await r.json()).elements ?? []
        /* A 200 carrying nothing is not an answer.
           Bengaluru has hundreds of these; a mirror that returns zero has
           an incomplete extract or a half-finished query, and taking it at
           face value wipes the seed to nothing while reporting success.
           Observed exactly that way on the second run: "upserted 0", no
           error anywhere. */
        if (els.length) return els
        last = `200 but empty from ${new URL(url).host}`
        console.log(`  ${last} — retrying`)
      } else {
        last = `${r.status} from ${new URL(url).host}`
        console.log(`  ${last} — retrying`)
      }
    } catch (e) {
      last = `${e.message} from ${new URL(url).host}`
      console.log(`  ${last} — retrying`)
    }
    await sleep(4000 * (1 + Math.floor(attempt / MIRRORS.length)))
  }
  throw new Error(`Overpass would not answer. Last: ${last}`)
}

const elements = await overpass()

const rows = []
let dropped = 0
for (const e of elements) {
  const name = e.tags?.name?.trim()
  if (!name) { dropped++; continue }

  const eventy = EVENTY.test(name)
    || e.tags.amenity === 'events_venue'
    || e.tags.amenity === 'conference_centre'
  if (!eventy || JUNK.test(name)) { dropped++; continue }

  /* `center` for ways and relations, plain lat/lon for nodes. */
  const lat = e.lat ?? e.center?.lat
  const lng = e.lon ?? e.center?.lon
  if (lat == null || lng == null) { dropped++; continue }

  rows.push({
    name,
    venue_kind: kindFor(name),
    area_label: areaFor(lat, lng),
    pincode: e.tags['addr:postcode'] ?? null,
    address_line: [e.tags['addr:housenumber'], e.tags['addr:street']]
      .filter(Boolean).join(' ') || null,
    source: 'osm',
    osm_id: `${e.type}/${e.id}`,
    status: 'unclaimed',
    lat, lng,
  })
}

console.log(`\n  Overpass returned   ${elements.length}`)
console.log(`  kept                ${rows.length}`)
console.log(`  dropped             ${dropped}`)
const byKind = {}
for (const r of rows) byKind[r.venue_kind] = (byKind[r.venue_kind] ?? 0) + 1
console.log(`  by kind             ${JSON.stringify(byKind)}`)
console.log(`  outside every area  ${rows.filter(r => !r.area_label).length}`)

if (DRY) {
  console.log('\n  --dry, nothing written.\n')
  for (const r of rows.slice(0, 10))
    console.log(`   · ${r.name.slice(0, 44).padEnd(46)} ${r.venue_kind.padEnd(11)} ${r.area_label ?? '-'}`)
  process.exit(0)
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('\n  Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

/* `lat` and `lng` are ordinary columns and a trigger in 094 builds the
   geography from them. So this is one plain upsert with no follow-up RPC.
   The first cut wrote the rows and then set locations through a
   SECURITY DEFINER function, which worked here — the seeder is
   service_role — and could never have worked for a partner dropping a pin
   on their own venue.

   Chunked: one 273-row statement that fails tells you nothing about which
   row was wrong. */
let written = 0, skipped = 0
for (let i = 0; i < rows.length; i += 50) {
  const chunk = rows.slice(i, i + 50)
  const { error } = await db.from('venues')
    .upsert(chunk, { onConflict: 'osm_id', ignoreDuplicates: false })
  if (error) { console.error(`  chunk ${i}: ${error.message}`); skipped += chunk.length; continue }
  written += chunk.length
}

console.log(`\n  upserted            ${written}`)
if (skipped) console.log(`  skipped             ${skipped}`)
console.log('\n  Venue data © OpenStreetMap contributors (ODbL).\n')
if (skipped) process.exit(1)
