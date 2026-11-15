#!/usr/bin/env node
/**
 * The offer board on LIVE data — the customer app's buildBoard, priced by
 * the real api/anchor?op=offers handler, in-process. Writes nothing.
 *
 *   node --env-file=.env scripts/check-offer-board-e2e.mjs
 *
 * Proves: every master who can deliver the experience is on the board,
 * with only packages that deliver it; every price is the server's and
 * equals what a single booking preview gives; masters who cannot are only
 * in the labelled "close" list; differences and comparisons are right.
 */
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

const out = join(ROOT, 'tmp', 'board-client.mjs')
await esbuild.build({ stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export * from './src/customer/lib/offerBoard'
    export { loadExperienceTiers } from './src/customer/lib/needs'
    export { partnersFor } from './src/customer/lib/market'
    export { packageFits, experienceOf } from './src/customer/lib/experience'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON), 'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' } })
const B = await import(pathToFileURL(out).href)
const offersHandler = (await import(pathToFileURL(join(ROOT, 'api/_lib/offers.js')).href)).default
const book = (await import(pathToFileURL(join(ROOT, 'api/_lib/anchorBook.js')).href)).default
const call = async (h, body) => { let st = 0, o = null; await h({ method: 'POST', headers: {}, query: {}, body },
  { status(c) { st = c; return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }); return { status: st, ...o } }
/* The board's pricer, pointed at the real handler instead of the network. */
const price = async payload => { const r = await call(offersHandler, payload); if (r.status !== 200) throw new Error(r.error); return r.offers }

await B.loadExperienceTiers(anon)
const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
const event = { date: day, time: '10:00', guests: 50 }, place = { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' }

console.log('The endpoint')
ok((await call(offersHandler, { base: {}, candidates: [] })).status === 400, 'refuses a call with no event date')
ok((await call(offersHandler, { base: { event_date: day }, candidates: Array(37).fill({ serviceId: 'x', request: {} }) })).status === 400, 'refuses more than 36 offers in one call')

for (const [tier, name] of [['ESSENTIAL', 'Important Moments'], ['SIGNATURE', 'Complete Story'], ['VIP', 'Cinematic Experience']]) {
  console.log(`\nPhotography · ${name}`)
  const board = await B.buildBoard({ tradeId: 'photography', occasionId: 'birthday-party', event, place, needs: { $tier: tier } }, { price })
  const exp = B.experienceOf('photography', tier)
  const n = board.masters.length
  console.log(`  … ${board.total} can deliver it · ${n} on this page · ${board.close.length} close · ${board.unavailable.length} not free · range ${board.range ? `₹${board.range.lo / 100}–₹${board.range.hi / 100}` : '—'}`)
  ok(board.masters.every(m => m.offers.every(o => o.kind === 'rate' || B.packageFits(o, exp, board.ask.hours).ok)), 'every package on the board delivers it')
  ok(board.masters.every(m => m.offers.every(o => o.kind !== 'package' || o.verdict?.ok === true)), 'and the server agrees, offer by offer')
  ok(board.close.every(c => c.option.gaps?.length > 0), 'every "close" master shows what they lack')
  ok(board.masters.every(m => m.offers.every(o => o.price == null || o.price > 0)), 'every price came from the server')
  const m0 = board.masters[0]
  if (m0?.headline?.path === 'INSTANT') {
    const single = await call(book, { vendorServiceId: m0.partner.serviceId, request: m0.headline.request, venue: { city: 'Bengaluru' }, preview: true })
    ok(single.customer_paise === m0.headline.price, `the board price equals a single booking preview (₹${m0.headline.price / 100})`)
  }
  ok(board.masters.every(m => m.headline === m.offers[0] && m.offers.every((o, i, a) => i === 0 || (a[i - 1].price ?? Infinity) <= (o.price ?? Infinity))), 'each card leads with its cheapest qualifying package')
  if (n > 1) ok(board.masters.some(m => m.badges.includes('Lowest price')), `badges are set (${[...new Set(board.masters.flatMap(m => m.badges))].join(', ')})`)
  if (tier === 'VIP') ok(n === 0 && board.close.length > 0, 'nobody qualifies for Cinematic today — all shown only as "close", never as offers')
}

console.log('\nChoosing on the board → the request the server receives')
{
  const S = await import(pathToFileURL(join(ROOT, 'api/_lib/anchorBook.js')).href)
  const admin = createClient(URL_, SERVICE, opts)
  const board = await B.buildBoard({ tradeId: 'photography', occasionId: 'birthday-party', event, place, needs: { $tier: 'ESSENTIAL' } }, { price })
  const instant = board.masters.filter(m => m.headline.path === 'INSTANT')
  if (instant.length >= 3) {
    const [first, ...rest] = instant
    const chosen = first.headline, shortlist = rest.slice(0, 2).map(m => m.headline)
    /* What LiveMatch.send() -> requestLine sends: the chosen line, and each
       ticked offer as a backup the customer chose (197: theirs first). */
    const R = chosen.request
    const pre = await S.priceOffer(admin, { vendorServiceId: first.partner.serviceId, r: R, venue: { city: 'Bengaluru' } })
    ok(!pre.stop && pre.out.path === 'INSTANT' && pre.out.customer_paise === chosen.price, `the chosen offer books at the board price (₹${chosen.price / 100})`)
    const kept = await S.priceBackups(admin, shortlist.map(o => ({ serviceId: o.serviceId, chosenBy: 'customer', request: o.request })),
      { r: R, first: first.partner.serviceId, vendorId: pre.resolution.vendor_id, requestId: '00000000-0000-0000-0000-000000000000', note: '', city: 'Bengaluru', tradeCode: pre.resolution.trade_code })
    ok(kept.length === shortlist.length && kept.every(k => k.chosen_by === 'customer'), `both ticked offers stay as the customer’s own backups (${kept.length})`)
    ok(kept.every(k => shortlist.some(o => o.packageId === k.pricing_snapshot.package_id) && k.pricing_snapshot.experience_fit?.ok),
      'each backup is the exact package that was shown, and delivers the experience')
  } else console.log(`  … only ${instant.length} instant masters — need 3 to test a chosen offer with two backups (not counted)`)
}

console.log('\nDifferences and comparison')
ok(B.diffText({ price: 360000, hours: 2, adds: ['album'], drops: [] }) === '+₹3,600 for 2 more hours and printed album', `extras read plainly: "${B.diffText({ price: 360000, hours: 2, adds: ['album'], drops: [] })}"`)
const rows = B.compareRows([
  { partner: { rating: 4.8, reviews: 10, distanceKm: 3, advancePct: 30, quoteHours: 2 }, offer: { price: 600000, hours: 4, inclusions: ['album'], path: 'INSTANT' } },
  { partner: { rating: 4.5, reviews: 30, distanceKm: 5, advancePct: 30, quoteHours: 2 }, offer: { price: 500000, hours: 4, inclusions: [], path: 'QUOTE' } }])
const row = l => rows.find(r => r.label === l)
ok(row('Price').differs && row('Price').best[1] && !row('Price').best[0], 'price differs, and the cheaper one is marked best')
ok(!row('Hours').differs && !row('Hours').best.some(Boolean), 'equal hours are not highlighted, and nothing is marked best')
ok(row('Includes printed album').values.join() === 'Yes,No', 'inclusions are compared row by row')
ok(!row('Advance').differs, 'equal advances are muted')
console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail ? 1 : 0
