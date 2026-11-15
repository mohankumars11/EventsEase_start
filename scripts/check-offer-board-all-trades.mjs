#!/usr/bin/env node
/**
 * The offer board for EVERY trade, on live data — the regression guard for
 * "the board only knew packages": catering by the plate, venues by the
 * slot, rentals by the item must all still find their masters.
 *
 *   node --env-file=.env scripts/check-offer-board-all-trades.mjs
 *
 * For each of the 34 trades, with no experience chosen: every master the
 * old one-match engine could have offered (anyone with a priced option)
 * must be accounted for — on the board, or "not free on your date" — never
 * silently dropped; and every price on the board is the server's.
 * Writes nothing.
 */
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

const out = join(ROOT, 'tmp', 'board-all.mjs')
await esbuild.build({ stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export * from './src/customer/lib/offerBoard'
    export { loadExperienceTiers, loadCuisines } from './src/customer/lib/needs'
    export { partnersFor } from './src/customer/lib/market'
    export { TRADES } from './src/customer/data/trades'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON), 'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' } })
const B = await import(pathToFileURL(out).href)
const offersHandler = (await import(pathToFileURL(join(ROOT, 'api/_lib/offers.js')).href)).default
const price = async payload => { let o = null, st = 0; await offersHandler({ method: 'POST', headers: {}, body: payload },
  { status(c) { st = c; return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }); if (st !== 200) throw new Error(o?.error); return o.offers }

await Promise.all([B.loadExperienceTiers(anon), B.loadCuisines(anon)])
const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
const event = { date: day, time: '10:00', guests: 50, hours: 4 }, place = { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' }
const rows = []
for (const t of B.TRADES.map(x => x.id)) {
  const all = await B.partnersFor(t, { lat: place.lat, lng: place.lng, limit: 100 }).catch(() => [])
  const priced = all.filter(p => p.fromRef)
  if (!priced.length) { rows.push([t, all.length, 0, 0, 0, 0, '']); continue }
  const board = await B.buildBoard({ tradeId: t, occasionId: 'birthday-party', event, place, needs: {} }, { price })
  /* Page 1 holds at most 12; the rest are counted by `total`. */
  const onPage = new Set([...board.masters.map(m => m.partner.serviceId), ...board.unavailable.map(u => u.partner.serviceId)])
  const firstTwelve = priced.length <= 12 ? priced : null
  const lost = firstTwelve ? firstTwelve.filter(p => !onPage.has(p.serviceId)).map(p => p.name) : []
  const badPrice = board.masters.flatMap(m => m.offers).filter(o => o.price != null && !(o.price > 0))
  rows.push([t, all.length, board.total, board.masters.length, board.unavailable.length, board.close.length, lost.join(', ')])
  ok(lost.length === 0 && board.total >= Math.min(priced.length, 1) && !badPrice.length,
    `${t}: ${board.masters.length} on the board, ${board.unavailable.length} not free${lost.length ? ` — DROPPED: ${lost.join(', ')}` : ''}`)
}
console.log('\n  trade                         partners  eligible  board  not-free  close')
for (const [t, n, e, b, u, c] of rows) console.log(`  ${t.padEnd(30)}${String(n).padStart(8)}${String(e).padStart(10)}${String(b).padStart(7)}${String(u).padStart(10)}${String(c).padStart(7)}`)
console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail ? 1 : 0
