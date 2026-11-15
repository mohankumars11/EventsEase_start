#!/usr/bin/env node
/**
 * Experiences end to end, on LIVE data — the customer app's own code and
 * the server's own code, joined the way a real booking joins them:
 *
 *   node --env-file=.env scripts/check-experience-e2e.mjs
 *
 *   1 · Photography coverage: the hours a customer picks reach the price,
 *       the partner's brief and the booking request, as numbers.
 *   2 · Eligibility: for every experience of every package trade, the
 *       customer's matcher (market.js → quote.js) and the server's rule
 *       (sambramo_package_fit) agree EXACTLY on which partners can deliver
 *       it — and every partner who cannot is excluded, never quoted.
 *   3 · Pricing & booking: a matched partner's request goes through the
 *       real booking endpoint (preview); the package priced is the package
 *       shown, at the price shown, and the line the server would write
 *       carries the experience, its criteria, the package snapshot, the
 *       coverage hours and the verdict.
 *   4 · Backups: the server's own priceBackups keeps only backups that
 *       deliver the same experience — including ones the phone sent with
 *       no experience at all — and each kept backup carries its own verdict.
 *
 * Writes nothing. The client modules are bundled with esbuild (they use
 * Vite's extensionless imports and import.meta.env), the server ones are
 * imported as they are.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exitCode = 1 }
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts)
const anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }
const need = (c, what) => { if (!c) { fail++; console.log(`  ✗ NO CASE TO TEST: ${what}`) } return !!c }

/* The customer app's modules, bundled. Written inside the repo so the
   externals (react, lucide) resolve from its node_modules. */
const out = join(ROOT, 'tmp', 'e2e-client.mjs')
mkdirSync(dirname(out), { recursive: true })
await esbuild.build({
  stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export { partnersFor, rank } from './src/customer/lib/market'
    export { quote, withQuotes, askOf, asLine } from './src/customer/lib/quote'
    export { hoursOf, experienceOf, packageFits } from './src/customer/lib/experience'
    export { loadExperienceTiers, experienceTiers } from './src/customer/lib/needs'
    export { requestFor } from './src/customer/lib/booking'
    export { lineOf } from './src/customer/lib/liveMatch'
    export { briefFor } from './src/customer/lib/brief'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON),
    'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' },
})
const C = await import(pathToFileURL(out).href)
const S = await import(pathToFileURL(join(ROOT, 'api/_lib/anchorBook.js')).href)

const probe = await anon.from('sambramo_experience_tiers').select('trade_id').limit(1)
if (probe.error) { console.error('Migration 208 is not applied (', probe.error.message, ')'); process.exitCode = 2 }
else await run()

async function run() {
  await C.loadExperienceTiers(anon)

  console.log('1 · Photography coverage — one number, from the chip to the booking')
  const forms = [['2 hours', 2], ['4 hours', 4], ['6 hours', 6], ['Full day', 8], [6, 6], ['6', 6], ['', null], [null, null], ['abc', null], [0, null], [-2, null]]
  ok(forms.every(([v, w]) => C.hoursOf(v) === w), `every stored form reads as a number: ${forms.map(([v]) => `${JSON.stringify(v)}→${C.hoursOf(v)}`).join(' ')}`)
  ok(C.askOf({ $hours: '6 hours' }, { guests: 50 }).hours === 6, 'a plan saved before the fix ("6 hours") reaches the price as 6 — it was NaN')
  const fake = { tradeId: 'photography', serviceId: 'svc', name: 'Test', offers: [
    { type: 'package', paise: 400000, hours: 4, label: 'Short', inclusions: [], ref: { type: 'package', key: 'ESSENTIAL', hours: 4, packageId: 'p4' } },
    { type: 'package', paise: 600000, hours: 6, label: 'Mid', inclusions: ['album'], ref: { type: 'package', key: 'SIGNATURE', hours: 6, packageId: 'p6' } },
    { type: 'package', paise: 800000, hours: 8, label: 'Long', inclusions: ['album'], ref: { type: 'package', key: 'VIP', hours: 8, packageId: 'p8' } }] }
  const q6 = C.quote(fake, C.askOf({ $hours: '6 hours' }, { guests: 50 }))
  ok(q6?.line?.fromRef?.packageId === 'p6' && q6.paise === 600000, `"6 hours" is priced on the 6-hour package (₹${(q6?.paise ?? 0) / 100}), not the cheaper 4-hour one`)
  ok(C.quote(fake, C.askOf({ $hours: 'Full day' }, { guests: 50 }))?.line?.fromRef?.packageId === 'p8', '"Full day" is priced on the 8-hour package')
  const line6 = C.lineOf(C.asLine({ ...fake, quote: q6 }), 'birthday-party')
  const req6 = C.requestFor(line6, { date: '2027-01-10', time: '10:00', guests: 50 }, { lat: 12.97, lng: 77.59 })
  ok(req6.hours === 6 && req6.package === 'SIGNATURE' && req6.package_id === 'p6',
    `the booking request asks for 6 h of exactly that package (hours ${req6.hours}, package_id ${req6.package_id})`)
  const brief = v => C.briefFor({}, 'photography', { $hours: v })
  ok(/Coverage: 6 hours/.test(brief(6)) && /Coverage: 6 hours/.test(brief('6 hours')) && !/hours hours/.test(brief(6) + brief('6 hours')),
    `the partner reads "Coverage: 6 hours" whichever form was stored ("${brief(6)}")`)
  const exp4 = C.experienceOf('photography', 'SIGNATURE')
  const qExp = C.quote(fake, { hours: C.hoursOf('2 hours'), guests: 50, experience: exp4 })
  ok(qExp?.line?.fromRef?.packageId === 'p4' && qExp.line.experience?.hours === 4,
    'choosing Complete Story lifts a 2-hour ask to its 4-hour minimum, and the request carries 4')
  ok(/Experience: Complete Story \(at least 4 h\)/.test(C.briefFor({}, 'photography', { $tier: 'SIGNATURE', $hours: 4 })),
    'and the partner reads "Experience: Complete Story (at least 4 h)"')

  console.log('\n2 · Who can deliver each experience — the phone and the server must agree, partner by partner')
  const tiers = (await anon.from('sambramo_experience_tiers').select('*').eq('active', true).eq('model', 'PARTNER_PACKAGE').order('sort')).data ?? []
  const fitDb = async (id, t) => (await anon.rpc('sambramo_package_fit', { p_package_id: id, p_trade_id: t.trade_id, p_tier: t.tier })).data?.[0]?.qualifies === true
  const HOURLY = new Set(['hour']), COVERS = new Set(['session', 'event', 'half_day', 'full_day', 'fixed'])
  const table = []
  for (const trade of [...new Set(tiers.map(t => t.trade_id))]) {
    const list = await C.partnersFor(trade, { limit: 100 })
    /* By id OR by name: 10 live anchor listings carry only the name (209). */
    const tname = (await admin.from('sambramo_trade_registry').select('name').eq('id', trade).single()).data?.name
    const lvs = (await admin.from('sambramo_listing_versions').select('id, vendor_service_id').eq('status', 'LIVE')
      .or(`trade_id.eq.${trade},and(trade_id.is.null,trade.eq."${tname}")`)).data ?? []
    const byService = Object.fromEntries(lvs.map(l => [l.vendor_service_id, l.id]))
    const ids = lvs.map(l => l.id)
    const pks = ids.length ? (await admin.from('sambramo_trade_packages').select('id, listing_version_id, name, commercial_inputs, trade_inputs').eq('status', 'LIVE').in('listing_version_id', ids)).data ?? [] : []
    const rules = ids.length ? (await admin.from('sambramo_rate_rules').select('listing_version_id, rule_kind, max_hours, included_hours').in('listing_version_id', ids)).data ?? [] : []
    for (const t of tiers.filter(x => x.trade_id === trade)) {
      const exp = C.experienceOf(trade, t.tier)
      const quoted = C.withQuotes(list, { guests: 50, experience: exp }) ?? []
      const clientIn = new Set(quoted.filter(p => p.quote).map(p => p.serviceId))
      let byPkg = 0, byRate = 0, mismatch = []
      for (const p of list) {
        const lv = byService[p.serviceId]
        /* The server's own answer, from the database: a LIVE package that
           sambramo_package_fit passes, or — only when nothing must be
           included — an hourly rate or a session that covers the hours. */
        const mine = pks.filter(x => x.listing_version_id === lv)
        const pkgOk = (await Promise.all(mine.map(x => fitDb(x.id, t)))).some(Boolean)
        const rateOk = !(t.required_inclusions ?? []).length && rules.some(r => r.listing_version_id === lv &&
          ((HOURLY.has(r.rule_kind) && (!r.max_hours || Number(r.max_hours) >= Number(t.min_hours)))
            || (COVERS.has(r.rule_kind) && Number(r.included_hours ?? 0) >= Number(t.min_hours))))
        const serverIn = pkgOk || rateOk
        if (serverIn !== clientIn.has(p.serviceId)) mismatch.push(p.name)
        if (clientIn.has(p.serviceId)) {
          const q = quoted.find(x => x.serviceId === p.serviceId).quote
          if (q.line.fromRef?.type === 'package') {
            byPkg++
            if (!(await fitDb(q.line.fromRef.packageId, t))) mismatch.push(`${p.name} (chosen package fails the server)`)
          } else byRate++
        }
      }
      ok(mismatch.length === 0, `${trade} · ${t.name}: phone and server agree on all ${list.length}${mismatch.length ? ` — DISAGREE: ${mismatch.join(', ')}` : ''}`)
      table.push({ trade, tier: t.tier, name: t.name, min: Number(t.min_hours), inc: (t.required_inclusions ?? []).join('+'), of: list.length, pkg: byPkg, rate: byRate, out: list.length - byPkg - byRate })
    }
  }
  console.log('\n  eligible partners per experience (live data):')
  console.log('  ' + 'trade'.padEnd(20) + 'experience'.padEnd(23) + 'needs'.padEnd(16) + 'package  rate  excluded')
  for (const r of table) console.log('  ' + r.trade.padEnd(20) + r.name.padEnd(23) + `≥${r.min} h${r.inc ? ' + ' + r.inc : ''}`.padEnd(16) +
    `${String(r.pkg).padStart(4)}  ${String(r.rate).padStart(5)}  ${String(r.out).padStart(5)} / ${r.of}`)

  console.log('\n3 · Pricing and booking — the real endpoint (preview: nothing is written)')
  const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const event = { date: day, time: '10:00', guests: 50 }, place = { lat: 12.9716, lng: 77.5946 }
  const preview = async body => {
    let o = null
    const res = { status() { return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }
    await S.default({ method: 'POST', headers: {}, query: { op: 'book' }, body: { ...body, preview: true } }, res)
    return o
  }
  const im = C.experienceOf('photography', 'ESSENTIAL')
  const photo = await C.partnersFor('photography', { limit: 100 })
  const matched = (C.withQuotes(photo, { guests: 50, experience: im }) ?? []).filter(p => p.quote?.line?.fromRef?.type === 'package')
  let P = null, R = null, GOT = null
  if (need(matched.length, 'a photographer matched to Important Moments by a package')) {
    P = matched[0]
    R = C.requestFor(C.lineOf(C.asLine(P), 'birthday-party'), event, place)
    ok(!!R.package_id && R.experience?.tier === 'ESSENTIAL' && R.experience?.trade === 'photography', `the phone's request names the exact package and the experience (${P.name}: "${P.quote.line.fromLabel}")`)
    GOT = await preview({ vendorServiceId: P.serviceId, request: R, venue: { city: 'Bengaluru' } })
    ok(GOT?.path === 'INSTANT', `the endpoint can book it instantly (${GOT?.path}${GOT?.reasons_text?.length ? ' — ' + GOT.reasons_text.join('; ') : ''})`)
    ok(GOT?.package_id === R.package_id, 'the package priced is the package shown')
    ok(Number(GOT?.customer_paise) === Number(P.quote.paise), `at the price shown (shown ₹${P.quote.paise / 100}, priced ₹${(GOT?.customer_paise ?? 0) / 100})`)
    ok(GOT?.experience_fit?.ok === true && GOT.experience_fit.package?.id === R.package_id, 'judged eligible by the server, on that package')
    ok(!JSON.stringify(GOT?.experience_fit ?? {}).includes('take_home'), 'the partner’s take-home is not in what the phone receives')

    /* The row the server writes — the handler's own functions, in its order:
       resolve_booking → experienceFit → lineFrom. request_partner_line (197)
       stores p_line.pricing_snapshot verbatim, on the line and in the queue. */
    const { data: resolution } = await admin.rpc('resolve_booking', { p_vendor_service_id: P.serviceId, p_req: R })
    resolution.experience_fit = await S.experienceFit(admin, resolution, R)
    const row = S.lineFrom(resolution, { requestId: '00000000-0000-0000-0000-000000000000', serviceId: P.serviceId, name: P.name,
      trade: resolution.trade_name, note: '', fee: 0.08, r: R, list: GOT?.customer_paise, listAdv: null, margin: GOT?.margin_pct, city: 'Bengaluru' })
    const s = row.pricing_snapshot.experience_fit
    ok(s?.tier === 'ESSENTIAL' && s.version >= 1 && s.min_hours === 2 && Array.isArray(s.required_inclusions) && !!s.checked_at,
      `the booking keeps the criteria: Important Moments v${s?.version}, ≥${s?.min_hours} h, inclusions [${s?.required_inclusions}]`)
    ok(s?.package_id === R.package_id && !!s.package?.name && s.package.coverage_hours >= 2 && Array.isArray(s.package.inclusions),
      `the package id and its snapshot: "${s?.package?.name}" (label ${s?.package?.label}), ${s?.package?.coverage_hours} h, [${s?.package?.inclusions}]`)
    ok(s?.coverage_hours >= 2 && s.ok === true && Array.isArray(s.gaps) && s.gaps.length === 0, `the coverage hours (${s?.coverage_hours}) and the verdict (eligible)`)
    ok(row.pricing_snapshot.request?.package_id === R.package_id && row.pricing_snapshot.request?.experience?.tier === 'ESSENTIAL',
      'and the request exactly as the phone sent it')

    /* Forged and stale requests: what an old or tampered phone could send. */
    const shortOffer = (P.offers ?? []).find(o => o.type === 'package' && Number(o.hours) < 2)
    if (shortOffer) {
      const forged = await preview({ vendorServiceId: P.serviceId, request: { ...R, package: shortOffer.ref.key, hours: shortOffer.hours, package_id: shortOffer.ref.packageId }, venue: { city: 'Bengaluru' } })
      ok(forged?.path === 'NOT_QUALIFIED', `their ${shortOffer.hours} h "${shortOffer.label}" sent as Important Moments is refused (${forged?.path})`)
    } else console.log(`  … ${P.name} has no package under 2 h to forge with (not counted)`)
    const other = (P.offers ?? []).find(o => o.type === 'package' && o.ref.packageId !== R.package_id)
    if (need(other, 'a second package of the same photographer')) {
      const { experience, ...plain } = R
      const swapped = await preview({ vendorServiceId: P.serviceId, request: { ...plain, package_id: other.ref.packageId }, venue: { city: 'Bengaluru' } })
      ok(swapped?.path === 'NOT_QUALIFIED' && (swapped.reasons ?? []).includes('package_changed'),
        'with NO experience chosen too: shown one package, priced another → refused')
    }
  }

  console.log('\n4 · Backups — the server’s own priceBackups, the same rule as the first master')
  if (need(P && GOT?.vendor_id, 'a primary booking to hang backups on')) {
    const others = photo.filter(x => x.serviceId !== P.serviceId)
    const shortOf = x => (x.offers ?? []).find(o => o.type === 'package' && Number(o.hours) < 2)
    const goodOf = x => { const q = C.quote(x, { guests: 50, experience: im }); return q?.line?.fromRef?.type === 'package' ? q : null }
    const bad = others.filter(shortOf).slice(0, 2)
    const good = others.filter(x => !bad.includes(x) && goodOf(x)).slice(0, 2)
    /* A backup the phone sent WITHOUT any experience, on a 1-hour package —
       an old app, or a bug. The server must hold it to the first master's
       experience anyway, and drop it. */
    const forgetful = x => {
      const o = shortOf(x)
      return { serviceId: x.serviceId, chosenBy: 'sambramo',
        request: C.requestFor(C.lineOf({ ...x, fromRef: o.ref, fromKind: 'package', fromUnit: 'package', fromPaise: o.paise, fromLabel: o.label, askHours: o.hours }, 'birthday-party'), event, place) }
    }
    const proper = x => ({ serviceId: x.serviceId, chosenBy: 'sambramo', request: C.requestFor(C.lineOf(C.asLine({ ...x, quote: goodOf(x) }), 'birthday-party'), event, place) })
    if (need(bad.length && good.length, `backups of both kinds (${bad.length} short, ${good.length} qualifying)`)) {
      const raw = [...bad.map(forgetful), ...good.map(proper)]
      ok(raw.slice(0, bad.length).every(b => !b.request.experience), 'the short backups were sent with no experience at all')
      const kept = await S.priceBackups(admin, raw, { r: R, first: P.serviceId, vendorId: GOT.vendor_id, requestId: '00000000-0000-0000-0000-000000000000',
        note: '', city: 'Bengaluru', tradeCode: GOT.trade_code })
      const keptIds = kept.map(k => k.service_id)
      ok(bad.every(x => !keptIds.includes(x.serviceId)), `every short backup was dropped (${bad.map(x => x.name).join(', ')})`)
      ok(good.every(x => keptIds.includes(x.serviceId)), `every qualifying backup was kept (${good.map(x => x.name).join(', ')} → kept ${kept.length})`)
      ok(kept.every(k => k.pricing_snapshot?.experience_fit?.ok === true && k.pricing_snapshot.experience_fit.tier === 'ESSENTIAL'),
        'each kept backup carries ITS OWN verdict — what the line will hold if the request hops to it')
      ok(kept.every(k => k.pricing_snapshot.experience_fit.package_id === k.pricing_snapshot.package_id && k.pricing_snapshot.experience_fit.package?.coverage_hours >= 2),
        'and its own package snapshot, at least 2 h')
      ok(kept.every(k => k.pricing_snapshot.request?.experience?.tier === 'ESSENTIAL'), 'the experience was carried onto every backup’s request')
      const g = good[0], q = goodOf(g)
      const otherPkg = (g.offers ?? []).find(o => o.type === 'package' && o.ref.packageId !== q.line.fromRef.packageId)
      if (otherPkg) {
        const req = { ...proper(g).request, package_id: otherPkg.ref.packageId }
        const k2 = await S.priceBackups(admin, [{ serviceId: g.serviceId, chosenBy: 'sambramo', request: req }], { r: R, first: P.serviceId,
          vendorId: GOT.vendor_id, requestId: '00000000-0000-0000-0000-000000000000', note: '', city: 'Bengaluru', tradeCode: GOT.trade_code })
        ok(k2.length === 0, 'a backup shown one package and priced another is dropped too')
      }
    }
  }

  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
