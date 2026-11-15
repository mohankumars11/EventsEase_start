#!/usr/bin/env node
/**
 * The one step the other experience checks cannot take: a REAL booking,
 * written by the real endpoint, read back from the database.
 *
 *   node --env-file=.env scripts/check-experience-booking-write.mjs          # dry run: shows what it would write
 *   node --env-file=.env scripts/check-experience-booking-write.mjs --write  # writes, checks, removes
 *
 * As the test customer (mohanpes328a), books a live photographer for
 * "Important Moments" in request mode (197) with four backups — two whose
 * package delivers it, two sent with a 1-hour package and no experience
 * at all — then reads back what the database holds:
 *   · the line's pricing_snapshot: criteria, package id, package snapshot,
 *     coverage hours, verdict
 *   · the queue: the first master at position 0, ONLY the qualifying
 *     backups after it, each with its own verdict
 *   · one exclusive offer, to the first master only
 * and then deletes every row it made, and proves none is left.
 *
 * Side effects while it runs (seconds): a booking request and an offer in
 * that photographer's feed. No photographer in the live set has a push
 * token (checked 2026-11-03), so no phone is notified; the script refuses
 * to write if the chosen one has gained a token since. No payment, no
 * escrow. Consumes one booking code (SBM-BKG-nnnn).
 */
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const WRITE = process.argv.includes('--write')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts), anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

const out = join(ROOT, 'tmp', 'e2e-client.mjs')
await esbuild.build({ stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export { partnersFor } from './src/customer/lib/market'
    export { quote, withQuotes, asLine } from './src/customer/lib/quote'
    export { experienceOf } from './src/customer/lib/experience'
    export { loadExperienceTiers } from './src/customer/lib/needs'
    export { requestFor } from './src/customer/lib/booking'
    export { lineOf } from './src/customer/lib/liveMatch'
    export { syncRequirements } from './src/customer/lib/eventSpine'
    export { supabase } from './src/lib/supabase'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*', '@supabase/supabase-js'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON), 'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' } })
const C = await import(pathToFileURL(out).href)
const { default: book } = await import(pathToFileURL(join(ROOT, 'api/_lib/anchorBook.js')).href)
const { default: batchEndpoint } = await import(pathToFileURL(join(ROOT, 'api/_lib/dispatchBatch.js')).href)
const call = async (body, token) => {
  let st = 0, o = null
  const res = { status(c) { st = c; return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }
  await book({ method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, query: { op: 'book' }, body }, res)
  return { status: st, ...o }
}

await C.loadExperienceTiers(anon)
const im = C.experienceOf('photography', 'ESSENTIAL')
const photo = await C.partnersFor('photography', { limit: 100 })
const good = (C.withQuotes(photo, { guests: 50, experience: im }) ?? []).filter(p => p.quote?.line?.fromRef?.type === 'package')
const P = good[0]
const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
const event = { date: day, time: '10:00', guests: 50 }, place = { lat: 12.9716, lng: 77.5946 }
const R = C.requestFor(C.lineOf(C.asLine(P), 'birthday-party'), event, place)
const shortOf = x => (x.offers ?? []).find(o => o.type === 'package' && Number(o.hours) < 2)
const others = photo.filter(x => x.serviceId !== P.serviceId)
const bad = others.filter(shortOf).slice(0, 2)
const fine = good.filter(x => x.serviceId !== P.serviceId && !bad.some(b => b.serviceId === x.serviceId)).slice(0, 2)   // by id: withQuotes returns new objects
const backups = [
  ...bad.map(x => { const o = shortOf(x); return { serviceId: x.serviceId, chosenBy: 'sambramo',
    request: C.requestFor(C.lineOf({ ...x, fromRef: o.ref, fromKind: 'package', fromUnit: 'package', fromPaise: o.paise, fromLabel: o.label, askHours: o.hours }, 'birthday-party'), event, place) } }),
  ...fine.map(x => ({ serviceId: x.serviceId, chosenBy: 'sambramo', request: C.requestFor(C.lineOf(C.asLine(x), 'birthday-party'), event, place) })),
]
const body = { vendorServiceId: P.serviceId, request: R, venue: { city: 'Bengaluru', area: 'Indiranagar', address: 'Sambramo e2e check — removed at once' },
  note: 'Sambramo e2e check — removed at once', mode: 'request', backups }
console.log(`First master: ${P.name} — "${P.quote.line.fromLabel}" (${P.quote.line.fromRef.hours} h) for Important Moments, ${day}`)
console.log(`Backups sent: ${bad.map(x => x.name + ' (1 h, no experience)').join(', ')}, ${fine.map(x => x.name + ' (qualifying)').join(', ')}`)

if (!WRITE) {
  const pv = await call({ ...body, preview: true })
  console.log(`\nDry run: the endpoint would answer ${pv.path} at ₹${pv.customer_paise / 100}, experience ${pv.experience_fit?.ok ? 'delivered' : 'NOT delivered'}.`)
  console.log('Nothing written. Run with --write to book, check and remove.')
} else await write()

async function write() {
  /* Refuse to touch a real phone: the photographer must still have no token. */
  const { data: vend } = await admin.from('vendor_services').select('vendor_id, vendors!inner(profile_id)').eq('id', P.serviceId).single()
  const { count: toks } = await admin.from('push_tokens').select('user_id', { count: 'exact', head: true }).eq('user_id', vend?.vendors?.profile_id ?? '00000000-0000-0000-0000-000000000000')
  if (toks) { console.error(`\n${P.name} now has a push token — refusing to write (it would notify a real phone).`); process.exitCode = 1; return }

  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'mohanpes328a@gmail.com' })
  const { data: s } = await C.supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  let made = null, planId = null
  try {
    console.log('\nWriting a real request, the way LiveMatch.send() does: sync, then one batch…')
    const sync = await C.syncRequirements({ userId: s.user.id, occasionId: 'birthday-party', context: { date: day, guests: 50 },
      services: [{ tradeId: 'photography', needs: { $tier: 'ESSENTIAL', $hours: R.hours } }] })
    planId = sync.planId
    const req = sync.reqs?.photography
    ok(sync.ok && req?.state === 'ready', `the requirement is ready (${req?.code ?? sync.reason})`)
    let st = 0, res = null
    await batchEndpoint({ method: 'POST', headers: { authorization: `Bearer ${s.session.access_token}` }, body: { planId, clientKey: `write-check-${Date.now()}`,
      lines: [{ planServiceId: req.id, vendorServiceId: P.serviceId, request: R, venue: body.venue, note: body.note, backups }] } },
      { status(c) { st = c; return this }, json(b) { res = b; return this }, setHeader() { return this }, end() { return this } })
    const sent = res?.sent?.[0]
    const got = { status: st, path: sent?.path, lineId: sent?.lineId, bookingRequestId: sent?.requestId, backups: sent?.backups, error: res?.error ?? res?.failed?.[0]?.reason }
    made = { request: got.bookingRequestId, line: got.lineId }
    ok(st === 200 && got.path === 'REQUEST' && !!got.lineId, `the batch wrote it (${st} ${got.path ?? ''}${got.error ? ' — ' + got.error : ''})`)
    if (!got.lineId) return
    const linked = (await admin.from('booking_lines').select('plan_service_id, requirement_code').eq('id', got.lineId).single()).data
    ok(linked?.plan_service_id === req.id && linked.requirement_code === req.code, `the line is linked to its requirement (${linked?.requirement_code})`)
    const reqNow = (await admin.from('event_plan_services').select('state, booking_line_id').eq('id', req.id).single()).data
    ok(reqNow?.state === 'dispatched' && reqNow.booking_line_id === got.lineId, 'and the requirement is dispatched — it cannot be sent twice')
    ok(got.backups === fine.length, `${got.backups} backups queued — the ${fine.length} qualifying ones, not the ${bad.length} short ones`)

    console.log('What the database holds')
    const { data: line } = await admin.from('booking_lines').select('status, pricing_snapshot, quoted_amount_paise, trade_id').eq('id', got.lineId).single()
    const f = line?.pricing_snapshot?.experience_fit
    ok(line?.status === 'dispatching' && line.trade_id === 'photography', `the line: ${line?.status}, photography`)
    ok(f?.ok === true && f.tier === 'ESSENTIAL' && f.name === 'Important Moments' && f.version >= 1, `experience criteria saved: ${f?.name} v${f?.version}`)
    ok(f?.min_hours === 2 && Array.isArray(f.required_inclusions), `≥${f?.min_hours} h, inclusions [${f?.required_inclusions}]`)
    ok(f?.package_id === R.package_id && line.pricing_snapshot.package_id === R.package_id, 'the package id shown = the package id priced = the package id saved')
    ok(!!f?.package?.name && f.package.coverage_hours >= 2 && Array.isArray(f.package.inclusions),
      `package snapshot saved: "${f?.package?.name}" (${f?.package?.label}), ${f?.package?.coverage_hours} h, [${f?.package?.inclusions}]`)
    ok(f?.coverage_hours >= 2 && Array.isArray(f.gaps) && f.gaps.length === 0, `coverage ${f?.coverage_hours} h and the verdict saved`)
    ok(line.pricing_snapshot.request?.hours === R.hours && line.pricing_snapshot.request?.experience?.tier === 'ESSENTIAL', 'and the request as sent')

    const { data: queue } = await admin.from('sambramo_request_queue').select('position, service_id, pricing_snapshot').eq('line_id', got.lineId).order('position')
    ok(queue?.[0]?.service_id === P.serviceId, `queue position 0 is ${P.name}`)
    const rest = (queue ?? []).slice(1)
    ok(rest.length === fine.length && rest.every(q => fine.some(x => x.serviceId === q.service_id)), `positions 1–${rest.length}: only the qualifying backups`)
    ok(!(queue ?? []).some(q => bad.some(x => x.serviceId === q.service_id)), 'no short backup anywhere in the queue')
    ok(rest.every(q => q.pricing_snapshot?.experience_fit?.ok === true && q.pricing_snapshot.experience_fit.package?.coverage_hours >= 2),
      'each backup holds its own verdict and package snapshot — what the line becomes on a hop (197 copies it)')

    const { data: offers } = await admin.from('dispatch_offers').select('vendor_id, status').eq('line_id', got.lineId)
    ok(offers?.length === 1 && offers[0].status === 'OFFERED' && offers[0].vendor_id === vend.vendor_id, 'one exclusive offer, to the first master only')
  } finally {
    if (made?.line) {
      await admin.from('sambramo_booking_decisions').delete().eq('booking_line_id', made.line)
      await admin.from('dispatch_offers').delete().eq('line_id', made.line)
      await admin.from('sambramo_request_queue').delete().eq('line_id', made.line)
      await admin.from('booking_lines').delete().eq('id', made.line)        // reservations cascade
    }
    if (made?.request) await admin.from('booking_requests').delete().eq('id', made.request)
    if (planId) await admin.from('event_plans').delete().eq('id', planId)
    if (made) {
      const left = await Promise.all([
        admin.from('booking_requests').select('id').eq('id', made.request ?? '00000000-0000-0000-0000-000000000000'),
        admin.from('booking_lines').select('id').eq('id', made.line ?? '00000000-0000-0000-0000-000000000000'),
        admin.from('sambramo_request_queue').select('id').eq('line_id', made.line ?? '00000000-0000-0000-0000-000000000000'),
        admin.from('dispatch_offers').select('id').eq('line_id', made.line ?? '00000000-0000-0000-0000-000000000000'),
        admin.from('sambramo_resource_reservations').select('id').eq('booking_line_id', made.line ?? '00000000-0000-0000-0000-000000000000'),
      ])
      ok(left.every(r => !r.data?.length), `every row removed (${left.map(r => r.data?.length ?? '?').join('/')} left)`)
    }
  }
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
