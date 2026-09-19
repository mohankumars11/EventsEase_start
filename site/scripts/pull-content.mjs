/**
 * Pull the product's real data into site/content/*.json.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The marketing site must describe the product that exists, not a copy of it
 * somebody maintains by hand. Every occasion name, every service, every tier
 * and every price band on sambramo.com comes from the same files the app
 * ships. A hand-typed Markdown copy of EVENT_DATA would be wrong within a
 * month and nobody would notice.
 *
 * But Vercel builds the site with Root Directory `site`, which means ../src
 * is not uploaded and build.mjs cannot read it. So this runs LOCALLY (and in
 * CI), writes a narrow projection to content/*.json, and those files are
 * committed. check-drift.mjs re-hashes the sources and fails if the snapshot
 * has gone stale.
 *
 * That is exactly the shape of scripts/build-api-bundle.mjs: a committed
 * artifact plus a staleness gate, because the deploy target cannot see the
 * sources. Same problem, same answer.
 *
 * WHY esbuild AND NOT import()
 *
 * src/config/sambramo.js:3 is `import { LIVE_CITIES } from './cities'` —
 * extensionless. Vite resolves that; Node's ESM resolver refuses it with
 * ERR_MODULE_NOT_FOUND. scripts/lib/loadSrc.mjs already solves this for the
 * repo's other gate scripts, so we use it rather than inventing a second way.
 *
 * WHAT IS DELIBERATELY NOT COPIED
 *
 * `BRAND.descriptor` — it reads "India's human-assisted concierge celebration
 * service". sambramo.js's own comments record that "India's" was removed from
 * categoryLine and partnerCategoryLine because an unverifiable national claim
 * is what the ASCI code and the Consumer Protection Act 2019 treat as
 * misleading. The ban was never applied to `descriptor`. A site engineered to
 * be quoted by AI assistants is the worst possible place to publish a claim
 * you cannot stand behind, so the site uses SITE_DESCRIPTOR below instead.
 *
 * Tailwind class strings (gradient, bgColor, textColor…) — they are tuned for
 * a 430px app shell and mean nothing here.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSrc, ROOT } from '../../scripts/lib/loadSrc.mjs'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(SITE, 'content')

/* ── The coverage allowlist ──────────────────────────────────────────────
 *
 * NOT derived from LIVE_CITIES, and that is the whole point.
 *
 * src/config/cities.js currently has Mysore as `live: true` with full
 * concierge coverage, and BRAND.pilotCities is derived from it. For
 * customers the business is Bengaluru only. Deriving from LIVE_CITIES would
 * put Mysore back on the marketing site automatically, on this run and on
 * every future content refresh, and nobody would be told.
 *
 * So the site holds its own list, and fails loudly if a city named here has
 * gone missing from CITIES rather than silently shipping one fewer page.
 */
const SITE_CITIES = ['bengaluru']

/** The one-sentence definition. Every noun in it is provable. */
const SITE_DESCRIPTOR =
  'Sambramo is a human-assisted concierge celebration service in Bengaluru. Event booking, end to end.'

/* URL slugs are hyphenated, ids are not.
 *
 * The product's ids are snake_case — `thread_ceremony`, `baby_shower`,
 * `full_celebration`. In a URL an underscore is a word JOINER to Google and
 * a hyphen is a word SEPARATOR, so /occasions/thread_ceremony/ is one token
 * and /occasions/thread-ceremony/ is two. On a site whose job is to be found
 * for "thread ceremony in Bengaluru", that is not a cosmetic difference.
 *
 * So every record carries both: `id` for looking things up against the
 * product's own data, `slug` for the URL. Nothing derives one from the other
 * at render time. */
const slugOf = id => String(id).toLowerCase().replace(/[_\s]+/g, '-')

/* Site-local display overrides.
 *
 * `royal_mysuru` — "Royal Mysuru", 600–1200 guests, "Palace-city scale".
 * It is a SIZE metaphor, not a coverage claim, but it renders in the footer
 * of all 153 pages and in the tier table of every occasion page. On a site
 * that serves Bengaluru and says so about forty times, a place name from a
 * city we do not serve, repeated on every page, is exactly the ambiguity
 * that makes a reader — or a model summarising the site — conclude we cover
 * Mysuru too.
 *
 * The tier already carries its own Kannada name, Arasu Vaibhava (royal
 * splendour), so nothing is invented here: the local name is promoted and
 * the English gloss drops the city. The id is untouched, so the site and
 * celebrationTiers.js still agree about which tier this is. */
const TIER_OVERRIDES = {
  royal_mysuru: {
    name: 'Arasu Vaibhava', slug: 'royal-scale',
    tagline: 'Palace scale, done properly',
    // Cleared, or the lockup renders "Arasu Vaibhava · Arasu Vaibhava":
    // the local name has been promoted into the name slot.
    localName: null,
  },
}

/* Files whose contents the snapshot depends on. check-drift.mjs re-hashes
   exactly this list, so adding a source here is what makes it guarded. */
const SOURCES = [
  'src/config/sambramo.js',
  'src/config/cities.js',
  'src/config/legal.js',
  'src/config/membership.js',
  'src/data/eventServicesData.js',
  'src/data/celebrationTiers.js',
  'src/data/festivals.js',
  'src/config/vendor.js',
  // Not read by this script — guarded by it. styles/tokens.css transcribes
  // the palette, the ink ramp and the aurora gradient from these two files.
  // Listing them here means a palette change on the app side fails
  // check-drift.mjs instead of leaving the marketing site quietly off-brand.
  'tailwind.config.js',
  'src/index.css',
]

const die = (msg) => { console.error(`\npull-content: ${msg}\n`); process.exit(1) }

function sha(file) {
  // \r\n normalised and read as UTF-8, not as bytes. A byte hash passes on
  // Windows and fails on Linux CI, which build-api-bundle.mjs learned the
  // hard way and recorded in its own header.
  const text = readFileSync(join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function lastmod(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', file],
      { cwd: ROOT, encoding: 'utf8' }).trim() || null
  } catch { return null }
}

const write = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n', 'utf8')
  const n = Array.isArray(data) ? data.length : Object.keys(data).length
  console.log(`  content/${name.padEnd(18)} ${String(n).padStart(4)} top-level keys`)
}

// ─────────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })
console.log('\npull-content: loading src/ through esbuild\n')

const M = await loadSrc({
  'src/config/sambramo.js':       ['BRAND', 'CTA', 'SERVICE_CATEGORIES', 'CUSTOMER_TIMELINE'],
  'src/config/cities.js':         ['CITIES'],
  'src/config/legal.js':          ['ENTITY', 'GRIEVANCE', 'BOOKING_TERMS', 'TAX', 'DARK_PATTERNS', 'complianceGaps'],
  'src/config/membership.js':     ['MEMBERSHIP'],
  'src/data/eventServicesData.js': ['EVENT_LIST', 'UPCOMING_FESTIVALS'],
  'src/data/celebrationTiers.js': ['CELEBRATION_TIERS', 'BESPOKE_TIER', 'LOCK_AMOUNT', 'PLATFORM_FEE_RATE', 'BUNDLE_DISCOUNT_RATE'],
  'src/data/festivals.js':        ['FESTIVALS'],
  'src/config/vendor.js':         ['VENDOR_CATEGORIES', 'SERVICES_FOR_TRADE'],
})

/* ── brand ─────────────────────────────────────────────────────────────── */

const B = M.BRAND
if (!B?.name) die('BRAND did not load')

write('brand.json', {
  name: B.name,
  tagline: B.tagline,
  taglineParts: B.taglineParts,
  signature: B.signature,
  signatureParts: B.signatureParts,
  categoryLine: B.categoryLine,
  emotion: B.emotion,
  // The site's own one-liner. NOT BRAND.descriptor — see the header.
  descriptor: SITE_DESCRIPTOR,
  supportPhone: B.supportPhone,
  // Display and dial forms held separately so no template ever reformats the
  // number by hand. NAP consistency is byte-level or it is nothing.
  supportPhoneDial: '+' + String(B.supportPhone).replace(/\D/g, ''),
  whatsapp: B.whatsappNumber,
  // .com, not the .in address still in BRAND.supportEmail — the canonical
  // domain is sambramo.com and the NAP must agree with itself everywhere.
  email: 'hello@sambramo.com',
  emailSupport: 'support@sambramo.com',
  emailPartners: 'partners@sambramo.com',
  emailGrievance: 'grievance@sambramo.com',
  hours: 'Monday to Saturday, 9am to 8pm',
  cta: M.CTA,
  serviceCategories: M.SERVICE_CATEGORIES,
  timeline: M.CUSTOMER_TIMELINE,
})

/* ── cities ────────────────────────────────────────────────────────────── */

const cities = SITE_CITIES.map(slug => {
  const c = M.CITIES.find(x => x.slug === slug)
  if (!c) die(`SITE_CITIES names "${slug}" but src/config/cities.js has no such city.\n` +
              `  Either the slug changed or the city was removed. Fix one or the other —\n` +
              `  do not let the site quietly ship one page fewer.`)
  return {
    slug: c.slug, name: c.name, aliases: c.aliases, state: c.state,
    coords: c.coords, coverage: c.coverage, knownAreas: c.knownAreas,
  }
})
write('cities.json', cities)

/* ── occasions and services ────────────────────────────────────────────── */

const svcSeen = new Map()
const occasions = M.EVENT_LIST.map(e => {
  const services = (e.services ?? []).filter(Boolean).map(s => {
    if (!svcSeen.has(s.id)) svcSeen.set(s.id, { ...s, occasions: [] })
    svcSeen.get(s.id).occasions.push(e.id)
    return s.id
  })
  return {
    id: e.id, slug: slugOf(e.id),
    name: e.name, tagline: e.tagline, description: e.description,
    emoji: e.emoji ?? e.icon ?? null, services,
  }
})
write('occasions.json', occasions)

/* A service earns a page when it has something to say. `menu` is
   "Included with catering" at 0/0 — a page for it would be three sentences
   and a price of nothing, which is the thin-content pattern the whole site
   is built to avoid. It still appears in its occasions' service lists. */
const services = [...svcSeen.values()].map(s => ({
  id: s.id, slug: slugOf(s.id), name: s.name, category: s.category, desc: s.desc,
  emoji: s.emoji ?? null,
  priceHint: s.priceHint ?? null,
  priceMin: s.priceMin ?? 0, priceMax: s.priceMax ?? 0,
  occasions: s.occasions,
  hasPage: Boolean(s.desc) && Number(s.priceMax) > 0,
}))
write('services.json', services)

/* ── tiers ─────────────────────────────────────────────────────────────── */

const tierList = M.CELEBRATION_TIERS.map(t => ({
  ...t, slug: slugOf(t.id), ...(TIER_OVERRIDES[t.id] ?? {}),
}))
for (const id of Object.keys(TIER_OVERRIDES)) {
  if (!tierList.some(t => t.id === id)) {
    die(`TIER_OVERRIDES names tier "${id}" but celebrationTiers.js has no such tier.
` +
        `  The override is dead. Remove it, or fix the id.`)
  }
}
write('tiers.json', {
  lockAmount: M.LOCK_AMOUNT,
  platformFeeRate: M.PLATFORM_FEE_RATE,
  bundleDiscountRate: M.BUNDLE_DISCOUNT_RATE,
  tiers: tierList,
  bespoke: { ...M.BESPOKE_TIER, slug: slugOf(M.BESPOKE_TIER?.id ?? 'bespoke') },
})

/* ── festivals ─────────────────────────────────────────────────────────── */

write('festivals.json', {
  festivals: M.FESTIVALS.map(f => ({ ...f, slug: slugOf(f.id) })),
  upcoming: M.UPCOMING_FESTIVALS,
})

/* ── legal ─────────────────────────────────────────────────────────────── */

const gaps = M.complianceGaps()
write('legal.json', {
  entity: M.ENTITY,
  grievance: M.GRIEVANCE,
  bookingTerms: M.BOOKING_TERMS,
  tax: M.TAX,
  darkPatterns: M.DARK_PATTERNS,
  complianceGaps: gaps,
  // Drives <meta name="robots" content="noindex"> on the entity-disclosure
  // and grievance pages. They un-hide themselves the day legal.js is filled
  // in; nobody has to remember to come back and delete a flag.
  launchReady: gaps.length === 0,
})

/* ── membership ────────────────────────────────────────────────────────── */

write('membership.json', M.MEMBERSHIP)

/* ── trades ────────────────────────────────────────────────────────────── */

/* The 26 partner trades, from VENDOR_CATEGORIES rather than from the
   LISTING_YOUR_BUSINESS.md walkthrough — that document is not on this
   branch, and vendor.js is the better source anyway: SERVICES_FOR_TRADE
   maps each trade to the exact catalogue services dispatch will send it.
   That mapping is what makes trade pages and service pages link to each
   other for a real reason rather than because a template said to.

   vendor.js's own comment is worth carrying into the copy: 'Other' was
   removed from this list because match_partners joins on the exact string
   and a partner who picked it produced a row dispatch could never return. */
const slugify = s => s.toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const byId = new Map(services.map(s => [s.id, s]))
const trades = M.VENDOR_CATEGORIES.map(name => {
  const ids = M.SERVICES_FOR_TRADE[name] ?? []
  const own = ids.map(id => byId.get(id)).filter(Boolean)
  return {
    slug: slugify(name),
    name,
    services: own.map(s => s.id),
    // Which occasions a partner in this trade would actually get work from.
    occasions: [...new Set(own.flatMap(s => s.occasions))],
    priceMin: own.length ? Math.min(...own.map(s => s.priceMin).filter(n => n > 0)) : 0,
    priceMax: own.length ? Math.max(...own.map(s => s.priceMax)) : 0,
  }
})
const orphans = trades.filter(t => !t.services.length).map(t => t.name)
if (orphans.length) {
  console.log(`  note: ${orphans.length} trade(s) map to no catalogue service — ` +
              `${orphans.join(', ')}. They still get a page, without a service list.`)
}
write('trades.json', trades)

/* ── the stamp ─────────────────────────────────────────────────────────── */

write('_stamp.json', {
  generatedAt: new Date().toISOString(),
  sources: Object.fromEntries(SOURCES.map(f => [f, { sha: sha(f), lastmod: lastmod(f) }])),
})

console.log(`\npull-content: ${occasions.length} occasions, ` +
            `${services.filter(s => s.hasPage).length}/${services.length} services with pages, ` +
            `${M.CELEBRATION_TIERS.length} tiers, ${M.FESTIVALS.length} festivals, ` +
            `${cities.length} city\n`)
if (gaps.length) {
  console.log(`pull-content: legal.js has ${gaps.length} open compliance gaps —`)
  for (const g of gaps) console.log(`  · ${g}`)
  console.log('  The entity-disclosure and grievance pages will render noindex.\n')
}
