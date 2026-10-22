#!/usr/bin/env node
/**
 * A synthetic marketplace for the customer app: verified partners for
 * every one of the 34 trades, LIVE through the real listing engine.
 *
 *   node --env-file=.env scripts/seed-synthetic-marketplace.mjs --dry-run
 *   node --env-file=.env scripts/seed-synthetic-marketplace.mjs [--per=10] [trade_id …]
 *   node --env-file=.env scripts/seed-synthetic-marketplace.mjs --purge
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THROUGH THE ENGINE, NOT STRAIGHT INTO THE TABLES
 * ══════════════════════════════════════════════════════════════════════
 * A listing is not a row. submit_listing_version turns a partner's answers
 * into rate rules, catalogue lines, packages, resources and the customer
 * price, and resolve_booking reads exactly those. Rows written by hand
 * would render in the app and then fail at the moment a customer books.
 * So each partner is submitted the way the e2e suite submits one
 * (scripts/e2e-all-trades-booking.mjs): the demo partner creates and
 * submits the service through RLS, then the service is moved onto its
 * synthetic owner and published as review does on approval.
 *
 * ── Instant ─────────────────────────────────────────────────────────
 * Instant Book & Pay needs an ACTIVATED Route account (migration
 * 20261010_15). Each synthetic partner gets one with a fake `acc_syn_…`
 * id. Real partners keep the gate; nothing global is lifted. A captured
 * TEST payment to one of these will create a transfer Razorpay rejects,
 * which is the honest outcome for an account that does not exist.
 *
 * ── Removal ─────────────────────────────────────────────────────────
 * Every vendor carries is_synthetic = true AND verification_note = TAG.
 * --purge removes exactly those, children first. A partner that has a
 * paid booking cannot be removed (sambramo_route_transfers and the escrow
 * ledger are RESTRICT / append-only by design) and is reported, not forced.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { TRADES, PREFIXES, CATERING_MENUS } from './data/synthetic-marketplace.mjs'

const TAG = 'synthetic-marketplace-2026-10-22'
const DRY = process.argv.includes('--dry-run'), PURGE = process.argv.includes('--purge')
const PER = Number((process.argv.find(a => a.startsWith('--per=')) ?? '').split('=')[1]) || 10
const ONLY = process.argv.slice(2).filter(a => !a.startsWith('--'))
const PHOTO_CACHE = resolve('scripts/data/synthetic-partner-photos.json')

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const PARTNER = 'sambramo.partner.test@gmail.com'

/* ── Deterministic randomness: the same run produces the same partners ── */
function rngFor(seed) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]
const between = (r, lo, hi) => lo + (hi - lo) * r()
const round = (n, to) => Math.max(to, Math.round(n / to) * to)
const sample = (r, xs, n) => { const a = [...xs]; const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out }

/* ── Licences, accepted as review would accept them ─────────────────
 * A regulated trade answers QUOTE until its licences are verified
 * (`licence_pending_fssai` → requirement VER-TRADE-FSSAI). A synthetic
 * partner has no documents to upload, so the seed records them as
 * accepted, exactly as e2e-all-trades-booking does for its test vendor.
 * Real partners are untouched: these rows hang off synthetic vendors only. */
const LICENCES = {
  bar_beverages: ['FSSAI'], catering_food: ['FSSAI'], power_cooling: ['ELECTRICAL'], security_services: ['PSARA'],
  valet_parking: ['DL'], venue: ['PROPERTY'],
  medium_large_goods_vehicle: ['RC', 'INSURANCE', 'DL'], mini_truck_pickup: ['RC', 'INSURANCE', 'DL'], passenger_transport: ['RC', 'INSURANCE', 'DL'],
}
async function acceptLicences(vendorId, c) {
  const docs = (LICENCES[c.id] ?? []).map(d => `VER-TRADE-${d}`)
  if (!docs.length) return
  const { data: have } = await admin.from('vendor_documents').select('requirement_id').eq('vendor_id', vendorId).in('requirement_id', docs)
  const add = docs.filter(d => !(have ?? []).some(h => h.requirement_id === d))
  if (!add.length) return
  const { error } = await admin.from('vendor_documents').insert(add.map(d => ({ vendor_id: vendorId, kind: 'other', requirement_id: d, trade: c.name,
    storage_path: `synthetic/${d}.pdf`, status: 'accepted', reviewed_at: new Date().toISOString() })))
  if (error) throw new Error(`licences: ${error.message}`)
}

/* ── Purge ──────────────────────────────────────────────────────────── */
async function purge() {
  let vq = admin.from('vendors').select('id').eq('is_synthetic', true).eq('verification_note', TAG)
  if (ONLY.length) vq = vq.in('category', ONLY.map(id => TRADE_NAME[id]).filter(Boolean))
  const { data: vendors } = await vq
  const vids = (vendors ?? []).map(v => v.id)
  console.log(`purge: ${vids.length} synthetic marketplace vendors`)
  if (!vids.length) return
  const inChunks = async (ids, fn) => { for (let i = 0; i < ids.length; i += 80) await fn(ids.slice(i, i + 80)) }
  const svcs = []
  await inChunks(vids, async ids => { const { data } = await admin.from('vendor_services').select('id').in('vendor_id', ids); svcs.push(...(data ?? []).map(s => s.id)) })
  const lvs = []
  await inChunks(svcs, async ids => { const { data } = await admin.from('sambramo_listing_versions').select('id').in('vendor_service_id', ids); lvs.push(...(data ?? []).map(x => x.id)) })
  const soft = async (table, col, ids) => {
    await inChunks(ids, async chunk => {
      const { error } = await admin.from(table).delete().in(col, chunk)
      if (error && !/does not exist|schema cache/i.test(error.message)) console.log(`  ! ${table}: ${error.message}`)
    })
  }
  const { data: menus } = lvs.length ? await admin.from('sambramo_catering_menus').select('id').in('listing_version_id', lvs.slice(0, 500)) : { data: [] }
  await soft('sambramo_catering_menu_items', 'menu_id', (menus ?? []).map(m => m.id))
  for (const t of ['sambramo_catering_menus', 'sambramo_live_counters', 'sambramo_trade_packages', 'sambramo_catalogue_items',
    'sambramo_rate_rules', 'sambramo_addon_rules']) await soft(t, 'listing_version_id', lvs)
  for (const t of ['sambramo_booking_decisions', 'sambramo_partner_price_books', 'sambramo_trade_packages', 'sambramo_resources']) await soft(t, 'vendor_service_id', svcs)
  await soft('sambramo_listing_versions', 'id', lvs)
  await soft('vendor_services', 'id', svcs)
  await soft('partner_payout_accounts', 'vendor_id', vids)
  await soft('vendor_documents', 'vendor_id', vids)
  await soft('vendors', 'id', vids)
  const { count } = await admin.from('vendors').select('id', { count: 'exact', head: true }).in('id', vids.slice(0, 300))
  console.log(`purge: ${count ?? 0} of these left${count ? ' (they have bookings or payments and are kept on purpose)' : ''}`)
}
const { TRADE_REGISTRY } = await import(pathToFileURL(resolve('src/data/trades/registry.js')).href)
const TRADE_NAME = Object.fromEntries(TRADE_REGISTRY.map(t => [t.id, t.name]))
if (PURGE) { await purge(); process.exit(0) }

/* ── Photos: a pool of real work per trade, from Pexels, cached ───────── */
async function photoPool() {
  const cache = existsSync(PHOTO_CACHE) ? JSON.parse(readFileSync(PHOTO_CACHE, 'utf8')) : {}
  const key = process.env.PEXELS_API_KEY
  for (const [id, t] of Object.entries(TRADES)) {
    if (cache[id]?.length >= 24) continue
    if (!key) { console.log(`  no PEXELS_API_KEY, ${id} has no photos`); continue }
    const seen = new Set(), out = []
    for (const query of t.q) {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30`, { headers: { Authorization: key } })
      if (!r.ok) { console.log(`  pexels ${r.status} for "${query}"`); continue }
      for (const p of (await r.json()).photos ?? []) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        out.push({ id: p.id, url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1000`, alt: p.alt || '', credit: `Photo by ${p.photographer} on Pexels` })
      }
    }
    cache[id] = out
    console.log(`  photos ${id}: ${out.length}`)
    writeFileSync(PHOTO_CACHE, JSON.stringify(cache, null, 1))
  }
  return cache
}

/* ── Answers a real partner of this trade would plausibly give ─────── */
const NUM = [
  [/year/, 3, 22], [/radius/, 15, 60], [/edited_images/, 250, 900], [/delivery_days/, 15, 45], [/highlight/, 3, 8],
  [/planning_months/, 2, 8], [/onsite_days/, 1, 4], [/functions/, 1, 5], [/change_limit|revisions/, 2, 4],
  [/cameras/, 1, 3], [/payload_kg/, 750, 9000], [/max_item_kg/, 50, 200], [/seats/, 4, 45], [/bags/, 2, 20],
  [/available_sqft/, 400, 6000], [/sqft/, 1500, 20000], [/servings/, 8, 40], [/watts/, 100, 1000], [/colours/, 1, 4],
  [/minutes/, 30, 180], [/shift_hours/, 8, 8], [/included_hours/, 3, 6], [/max_hours/, 6, 12], [/setup_hours|install_hours/, 2, 6],
  [/cleanup/, 1, 3], [/hours/, 2, 8], [/lead|prep_days|prep_hours/, 1, 5], [/notice/, 0, 2], [/parking/, 40, 300],
  [/min_billable|min_guests/, 50, 100], [/^min_/, 1, 3], [/count/, 1, 6], [/max_staff/, 20, 60],
  /* What a business can turn out in a day: a gifting studio packs hundreds. */
  [/capacity_per_day/, 15, 60], [/units_per_day|pieces_per_day|sets_per_day|max_orders/, 80, 600],
  [/guest|audience|capacity|attendees|visitors|people_per_day|guests_per/, 150, 1200],
  [/per_day|per_hour|concurrent|simultaneous|events_per|max_per_day|edits_per|units_per|pieces_per|sets_per|max_orders/, 2, 6],
  [/staff|team|crew|workers|guards|artists|performers|technicians|valets|drivers|photographers|videographers|priests|coordinators|supervisors|vehicles|counters/, 2, 12],
  [/qty|quantity|stock|total/, 20, 400],
]
const POOL = /^(staff|staff_pool|workers|guards|valets|crew|crews)$/
function numberFor(r, q, c) {
  const hit = NUM.find(([re]) => re.test(q.id))
  let [lo, hi] = hit ? [hit[1], hit[2]] : [1, 50]
  /* A staffing business's pool is its product: ten is small, not large. */
  if (c?.archetype === 'STAFFING' && POOL.test(q.id)) [lo, hi] = [12, 60]
  if (q.min != null) lo = Math.max(lo, q.min)
  if (q.max != null) hi = Math.min(hi, q.max)
  if (hi < lo) hi = lo
  return Math.round(between(r, lo, hi))
}
const realOptions = (q, c) => (q.options ?? []).filter(o => !/^other/i.test(o.id) && !/^other/i.test(o.label ?? '') && o.id !== 'none'
  && !(q.id === 'service_type' && c.redirects && o.id in c.redirects))
function textFor(r, q, p) {
  if (/venue_name|display_name|business_name/.test(q.id)) return p.name
  if (/registration/.test(q.id)) return `KA-0${1 + Math.floor(r() * 5)}-${pick(r, ['AB', 'MN', 'EF', 'HJ'])}-${1000 + Math.floor(r() * 8999)}`
  if (/damage/.test(q.id)) return 'Damage beyond normal wear is charged at repair cost, assessed together at pickup.'
  if (/routes/.test(q.id)) return 'Across Bengaluru; outstation within 300 km on request.'
  if (/power_needs/.test(q.id)) return 'Single-phase 5 kW per 20 fixtures; we bring our own distribution boards.'
  if (/access_hours/.test(q.id)) return '7 am – 10 pm, all days'
  if (/description|deliverables/.test(q.id)) return `${p.name} ${p.line}.`
  if (/exclusions/.test(q.id)) return 'Venue rental, food and travel outside Bengaluru are quoted separately.'
  if (q.type === 'textarea') return `${p.name} ${p.line}.`
  return p.name
}
function answer(r, q, c, p, price) {
  switch (q.type) {
    case 'single': { const o = realOptions(q, c); return o.length ? pick(r, o).id : q.options?.[0]?.id }
    case 'multi': { const o = realOptions(q, c); return sample(r, o.length ? o : q.options ?? [], 2 + Math.floor(r() * 3)).map(x => x.id) }
    case 'number': return numberFor(r, q, c)
    case 'money': return round(price * between(r, 0.12, 0.35), 50) * 100
    case 'toggle': return q.id === 'hazardous_excluded' ? true : r() < 0.6
    case 'url': return `https://www.instagram.com/${p.slug}`
    case 'dimensions': return { l: String(10 + Math.floor(r() * 30)), w: String(8 + Math.floor(r() * 20)), h: String(6 + Math.floor(r() * 10)), unit: q.unit ?? 'ft' }
    case 'photos': return Array.from({ length: q.min ?? 1 }, (_, i) => ({ kind: 'photo', path: `synthetic/${p.slug}/${i}.jpg`, caption: 'Work' }))
    case 'time': return /cutoff/.test(q.id) ? '22:30' : '10:00'
    case 'date': return '2026-09-01'
    default: return textFor(r, q, p)
  }
}

const RULE = { TIME_PERFORMER: 'hour', PERSONAL_SERVICE: 'per_person', STAFFING: 'per_staff_hour', PER_GUEST_FOOD: 'per_guest',
  TRIP_VEHICLE: 'per_trip', STORAGE_CAPACITY: 'capacity_period', PROJECT_QUOTE: 'fixed' }
const PRICE_FIELDS = ['price', 'unit_price', 'rate', 'fee', 'per_piece', 'base_rate']

function listingFor(c, p, r) {
  const t = TRADES[c.id]
  const rate = t.rate ? round(between(r, t.rate[0], t.rate[1]), t.rate[1] > 5000 ? 500 : 10) : null
  const itemBase = t.item ?? t.rate ?? [1000, 5000]
  const qs = [...c.screens.flatMap(s => s.questions), ...(c.pricing.fields ?? []), ...(c.resources.fields ?? [])]
  const answers = Object.fromEntries(qs.filter(q => q.required || r() < 0.7).filter(q => q.type !== 'money' || q.required)
    .map(q => [q.id, answer(r, q, c, p, rate ?? itemBase[0])]))
  const items = []
  if (c.catalogue) {
    const n = 2 + Math.floor(r() * 3)
    const names = t.items ? sample(r, t.items, n) : []
    for (let i = 0; i < n; i++) {
      const it = Object.fromEntries(c.catalogue.fields.filter(f => f.required || (f.type !== 'photos' && r() < 0.6))
        .map(f => [f.id, answer(r, f, c, p, itemBase[0])]))
      if ('name' in it || c.catalogue.fields.some(f => f.id === 'name')) it.name = names[i] ?? `${p.name} ${c.catalogue.noun ?? 'item'} ${i + 1}`
      /* A décor package is sold per setup; the random pick made mandaps "per piece". */
      if (c.id === 'decoration_floral' && 'price_unit' in it) it.price_unit = c.catalogue.fields.find(f => f.id === 'price_unit').options.find(o => /setup/i.test(o.label ?? o.id))?.id ?? it.price_unit
      const pf = c.catalogue.fields.find(f => PRICE_FIELDS.includes(f.id) && f.type === 'money')
      if (pf) it[pf.id] = round(between(r, itemBase[0], itemBase[1]) * (1 + i * 0.35), itemBase[1] > 20000 ? 500 : 10) * 100
      for (const k of ['min_order', 'min_qty', 'min_staff']) if (k in it) it[k] = 1
      if ('lead_days' in it) it.lead_days = Math.floor(r() * 3)
      if ('max_staff' in it) it.max_staff = 25
      items.push({ item_key: `${c.catalogue.key}_${i + 1}`, answers: it })
    }
  }
  const kind = RULE[c.archetype] && c.pricing.kinds.includes(RULE[c.archetype]) ? RULE[c.archetype] : null
  /* An hourly rule's qty IS hours, and lands in max_hours numeric(5,2). */
  const maxQty = ['hour', 'session'].includes(kind) ? 12 : 999
  const rules = kind && rate ? { [kind]: { on: true, amount_paise: rate * 100, min_qty: 1, max_qty: maxQty, hours: 4, included_qty: 10 } } : {}
  const a = {
    basics: { display_name: p.name, bio: p.bio, legal_name: `${p.name} (synthetic)`, tagline: p.tagline },
    location: {}, answers, rules, packages: [], addons: {},
    catalogue: items,
    availability: { min_notice_days: Math.floor(r() * 2), horizon_months: 12, travel_model: 'customer_arranged' },
    booking: { instant: true, advance_pct: 30, cancellation: pick(r, ['flexible', 'flexible', 'moderate', 'strict']), custom_quotes: true, quote_hours: pick(r, [2, 4, 6]) },
  }
  return a
}

/* ── Catering: real dishes from the live food catalogue ─────────────── */
const dishCache = {}
async function dishesFor(cuisine) {
  if (dishCache[cuisine]) return dishCache[cuisine]
  const { data: cats } = await admin.from('sambramo_food_categories').select('id, course_group')
  const group = Object.fromEntries((cats ?? []).map(c => [c.id, c.course_group]))
  const { data } = await admin.from('sambramo_master_dishes').select('id, name, category_id, suggested_diet, allergens')
    .contains('cuisine_ids', [cuisine]).eq('active', true).limit(300)
  return (dishCache[cuisine] = (data ?? []).map(d => ({ ...d, course_group: group[d.category_id] })).filter(d => d.course_group))
}
const COURSES = [['welcome_drinks', 1], ['starters', 2], ['main_gravies', 2], ['dal', 1], ['dry_dishes', 1], ['rice_biryani', 2], ['breads', 1], ['accompaniments', 2], ['desserts', 2]]
async function catererFor(c, p, r) {
  const menus = [], dishes = []
  for (const [mi, m] of sample(r, CATERING_MENUS, 2).entries()) {
    const pool = (await dishesFor(m.cuisine)).filter(d => !m.veg || d.suggested_diet !== 'non_veg')
    const items = []
    for (const [course, n] of COURSES) {
      for (const d of sample(r, pool.filter(x => x.course_group === course), n)) {
        const key = `d_${d.id}`
        if (!dishes.some(x => x.item_key === key)) dishes.push({ item_key: key, name: d.name, category_id: d.category_id, diet: d.suggested_diet === 'non_veg' ? 'non_veg' : 'veg',
          serving: { qty: 150, unit: 'g' }, allergens: Array.isArray(d.allergens) ? d.allergens : [], menu_eligible: true, standalone: { on: false }, active: true })
        items.push({ dish_key: key, course_group: course, included: true })
      }
    }
    if (!items.length) continue
    const plate = round(between(r, TRADES.catering_food.rate[0], TRADES.catering_food.rate[1]) * (1 + mi * 0.3), 10)
    menus.push({ menu_key: `m${mi + 1}`, name: m.name, diet: items.every(i => dishes.find(d => d.item_key === i.dish_key)?.diet === 'veg') ? 'veg' : 'mixed',
      min_guests: 50, max_guests: 1500, price_model: 'per_person', price_paise: plate * 100, status: 'active', cuisine_ids: [m.cuisine], items })
  }
  const fssai = `112${String(19000000000 + Math.floor(r() * 999999999)).slice(0, 11)}`
  return {
    basics: { display_name: p.name, bio: p.bio, legal_name: `${p.name} (synthetic)`, tagline: p.tagline },
    location: {}, cuisines: [...new Set(menus.flatMap(m => m.cuisine_ids))],
    answers: { services: ['Wedding catering'], prep_location: 'At both locations', service_styles: ['Buffet'], service_area: '50',
      max_guests: 1500, guests_per_day: 2000, events_per_day: 2 + Math.floor(r() * 2), staff: 20 + Math.floor(r() * 40), min_billable_guests: 50, child_policy: 'same',
      fssai: { type: 'state_licence', number: fssai, expiry: '2027-03-31', premises: `${p.area} kitchen`, responsible: p.owner },
      declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
    dishes, menus, counters: [], packages: [], extras: [],
    availability: { min_notice_days: 1, horizon_months: 12, menu_freeze_days: 3, guest_confirm_days: 2, travel_model: 'customer_arranged' },
    booking: { instant: true, advance_pct: 30, cancellation: pick(r, ['flexible', 'moderate']), custom_quotes: true, quote_hours: 4 },
  }
}

/* ── One partner, end to end ───────────────────────────────────────── */
const OWNERS = ['Ramesh', 'Kavya', 'Suresh', 'Divya', 'Prakash', 'Ananya', 'Mahesh', 'Lakshmi', 'Kiran', 'Pooja', 'Naveen', 'Shruthi', 'Arjun', 'Meghana', 'Vinay', 'Sneha']
function partnerFor(c, i, localities, used) {
  const t = TRADES[c.id], r = rngFor(`${TAG}:${c.id}:${i}`)
  let name
  for (let k = 0; k < 40 && (!name || used.has(name)); k++) name = `${pick(r, PREFIXES)} ${pick(r, t.suffix)}`
  used.add(name)
  const tier = r() < 0.6 ? 1 : r() < 0.75 ? 2 : 3
  const pool = localities.filter(l => l.tier === tier)
  const area = pick(r, pool.length ? pool : localities)
  const years = 3 + Math.floor(r() * 19)
  const rating = Math.round(between(r, 4.1, 4.95) * 10) / 10
  const owner = pick(r, OWNERS)
  const tagline = pick(r, t.tagline)
  return {
    r, name, owner, tagline, years, rating, area: area.name, line: t.line,
    lat: area.lat + between(r, -0.012, 0.012), lng: area.lng + between(r, -0.012, 0.012),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''),
    reviews: 18 + Math.floor(r() * 340),
    bio: `${name} ${t.line}. Started by ${owner} ${years} years ago in ${area.name}, the team now works across Bengaluru and plans every booking with the family before the day.`,
  }
}

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { TRADE_CONFIGS, buildTradePayload, suggestPackages, buildCateringPayload } = M
const localities = JSON.parse(readFileSync(resolve('scripts/data/bengaluru-localities.json'), 'utf8')).localities
const configs = TRADE_CONFIGS.filter(c => !ONLY.length || ONLY.includes(c.id))

if (DRY) {
  for (const c of configs) {
    const used = new Set()
    for (let i = 0; i < PER; i++) {
      const p = partnerFor(c, i, localities, used)
      const a = c.legacyFlow ? null : c.customFlow === 'catering' ? null : listingFor(c, p, p.r)
      if (a) buildTradePayload(c, a)
      if (i < 2) console.log(`${c.id.padEnd(28)} ${p.name.padEnd(34)} ${p.area.padEnd(18)} ★${p.rating}${a?.catalogue?.length ? `  items ${a.catalogue.length}` : ''}`)
    }
  }
  console.log(`dry run: ${configs.length} trades × ${PER} = ${configs.length * PER} partners, nothing written`)
  process.exit(0)
}

const photos = await photoPool()
const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email: PARTNER })
if (le) throw le
const { data: sess } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const partnerDb = createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } } })
const { data: demoVendor } = await admin.from('vendors').select('id').eq('profile_id', sess.user.id).single()

const { data: existing } = await admin.from('vendors').select('id, business_name, category').eq('verification_note', TAG)
const have = new Map((existing ?? []).map(v => [`${v.category}|${v.business_name}`, v.id]))
let made = 0, skipped = 0, failed = 0

async function seedOne(c, p, i) {
  const key = `${c.name}|${p.name}`
  if (have.has(key)) {
    const { data: live } = await admin.from('vendor_services').select('id, sambramo_listing_versions!inner(status)').eq('vendor_id', have.get(key)).eq('sambramo_listing_versions.status', 'LIVE').limit(1)
    if (live?.length) { await acceptLicences(have.get(key), c); skipped++; return }
  }
  let vendorId = have.get(key)
  if (!vendorId) {
    const { data: v, error } = await admin.from('vendors').insert({
      business_name: p.name, category: c.name, city: 'Bengaluru', area: p.area, description: p.bio,
      service_radius_km: 25 + Math.floor(p.r() * 30), rating_avg: p.rating, years_experience: p.years,
      is_verified: true, verification_status: 'approved', verified_at: new Date().toISOString(), status: 'APPROVED',
      is_synthetic: true, listed_by: 'import', verification_note: TAG, accepting_jobs: true, accepting_bookings: true,
      onboarding_status: 'complete', lead_time_days: 1, max_events_per_day: 2, daily_capacity: 2,
    }).select('id').single()
    if (error) throw new Error(`vendor: ${error.message}`)
    vendorId = v.id
    const { data: loc, error: lerr } = await admin.rpc('set_vendor_location', { p_vendor_id: vendorId, p_lat: p.lat, p_lng: p.lng })
    if (lerr || !loc?.ok) throw new Error(`location: ${lerr?.message ?? loc?.reason}`)
  }
  await admin.from('partner_payout_accounts').upsert({ vendor_id: vendorId, kyc_status: 'verified', kyc_verified_at: new Date().toISOString(),
    route_account_id: `acc_syn_${vendorId.replace(/-/g, '').slice(0, 14)}`, route_status: 'activated', route_updated_at: new Date().toISOString() },
    { onConflict: 'vendor_id' })
  await acceptLicences(vendorId, c)

  const { data: svc, error: e1 } = await partnerDb.from('vendor_services').insert({ vendor_id: demoVendor.id, name: `${p.name}`, category: c.name,
    price: 1000, unit: 'per booking', specs: { synthetic_seed: TAG } }).select('id').single()
  if (e1) throw new Error(`service: ${e1.message}`)
  try {
    let err
    if (c.legacyFlow) {
      const t = TRADES.anchor_mc, hour = round(between(p.r, t.rate[0], t.rate[1]), 500)
      ;({ error: err } = await partnerDb.rpc('submit_anchor_listing_version', { p_vendor_service_id: svc.id, p_payload: {
        legal_name: `${p.name} (synthetic)`,
        profile: { stage_name: p.name, display_name: p.name, tagline: p.tagline, bio: p.bio, events: sample(p.r, ['wedding', 'sangeet', 'corporate', 'birthday', 'reception', 'launch'], 3),
          languages: sample(p.r, [{ name: 'Kannada', level: 'fluent' }, { name: 'English', level: 'fluent' }, { name: 'Hindi', level: 'fluent' }, { name: 'Telugu', level: 'conversational' }, { name: 'Tamil', level: 'conversational' }], 3),
          max_audience: pick(p.r, [300, 500, 1000, 2000]), years: p.years },
        models: { hour: { take_home_paise: hour * 100, min_hours: 2, max_hours: 8, hours: 2, extra_hour_take_home_paise: round(hour * 1.2, 100) * 100 },
          full_day: { take_home_paise: round(hour * 6.5, 500) * 100, hours: 8 } },
        addons: [], overrides: {},
        booking_rules: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4, min_notice_days: 0, horizon_months: 12, max_consecutive_hours: 8 },
        travel_rules: { model: 'customer_arranged' }, location: {} } }))
    } else if (c.customFlow === 'catering') {
      const a = await catererFor(c, p, p.r)
      ;({ error: err } = await partnerDb.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: buildCateringPayload(c, a) }))
    } else {
      const a = listingFor(c, p, p.r)
      if (c.tiers && c.pricing.packages) a.packages = suggestPackages(c, a, { signature_uplift: between(p.r, 1.5, 1.9), vip_factor: between(p.r, 1.9, 2.5) })
      ;({ error: err } = await partnerDb.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: buildTradePayload(c, a) }))
    }
    if (err) throw new Error(`submit: ${err.message}`)

    await admin.from('vendor_services').update({ vendor_id: vendorId, is_active: true }).eq('id', svc.id)
    await admin.from('sambramo_resources').update({ vendor_id: vendorId }).eq('vendor_service_id', svc.id)
    const gallery = sample(p.r, photos[c.id] ?? [], 6)
    const { data: lv, error: e3 } = await admin.from('sambramo_listing_versions').select('id, profile').eq('vendor_service_id', svc.id).eq('status', 'UNDER_REVIEW').single()
    if (e3) throw new Error(`version: ${e3.message}`)
    const { error: e4 } = await admin.from('sambramo_listing_versions').update({
      vendor_id: vendorId, status: 'LIVE', published_at: new Date().toISOString(), reviewed_at: new Date().toISOString(),
      price_locked_until: new Date(Date.now() + 15 * 864e5).toISOString(),
      profile: { ...(lv.profile ?? {}), display_name: p.name, tagline: p.tagline, bio: p.bio, years: p.years,
        cover_url: gallery[0]?.url ?? null, gallery: gallery.map(g => ({ url: g.url, alt: g.alt, credit: g.credit })),
        review_count: p.reviews, synthetic: true },
    }).eq('id', lv.id)
    if (e4) throw new Error(`publish: ${e4.message}`)
    await admin.from('sambramo_trade_packages').update({ status: 'LIVE' }).eq('listing_version_id', lv.id)
    made++
  } catch (e) {
    // Leave nothing half-made under the demo partner's account.
    const { data: lv } = await admin.from('sambramo_listing_versions').select('id').eq('vendor_service_id', svc.id)
    const ids = (lv ?? []).map(x => x.id)
    if (ids.length) {
      for (const t of ['sambramo_trade_packages', 'sambramo_catalogue_items', 'sambramo_rate_rules', 'sambramo_addon_rules']) await admin.from(t).delete().in('listing_version_id', ids)
      await admin.from('sambramo_listing_versions').delete().in('id', ids)
    }
    for (const t of ['sambramo_trade_packages', 'sambramo_resources', 'sambramo_partner_price_books']) await admin.from(t).delete().eq('vendor_service_id', svc.id)
    await admin.from('vendor_services').delete().eq('id', svc.id)
    throw e
  }
}

for (const c of configs) {
  const used = new Set()
  const jobs = Array.from({ length: PER }, (_, i) => [partnerFor(c, i, localities, used), i])
  for (let k = 0; k < jobs.length; k += 3) {
    await Promise.all(jobs.slice(k, k + 3).map(async ([p, i]) => {
      try { await seedOne(c, p, i) } catch (e) { failed++; console.log(`  ✗ ${c.id} #${i} ${p.name}: ${e.message}`) }
    }))
  }
  console.log(`  ${c.id.padEnd(28)} done  (made ${made}, skipped ${skipped}, failed ${failed})`)
}
console.log(`\nsynthetic marketplace: made ${made}, already live ${skipped}, failed ${failed}`)
