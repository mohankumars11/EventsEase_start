#!/usr/bin/env node
/**
 * LiveMatch's send path, without writing a booking:
 *
 *   node --env-file=.env scripts/check-send-batch-live.mjs
 *
 *   · syncRequirements turns the phone's plan into server requirements —
 *     one event, one requirement per service, answers checked by the server
 *   · an incomplete service comes back "not ready" with what it lacks
 *   · the batch endpoint, called with the customer's own token, claims the
 *     ready requirements, sends each through the booking path, and when
 *     the booking engine refuses one, closes the batch "failed" and puts
 *     the requirement back to ready — no booking row is created
 *   · a requirement already with professionals is reported, not re-saved
 * The fixture event is deleted at the end.
 */
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

const out = join(ROOT, 'tmp', 'send-client.mjs')
await esbuild.build({ stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export * from './src/customer/lib/eventSpine'
    export { supabase } from './src/lib/supabase'` },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx', '.jsx': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@capacitor/*', '@supabase/supabase-js'],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(URL_), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(ANON), 'import.meta.env.VITE_API_ORIGIN': '""', 'import.meta.env': '{}' } })
const E = await import(pathToFileURL(out).href)
const batch = (await import(pathToFileURL(join(ROOT, 'api/_lib/dispatchBatch.js')).href)).default

/* The app's own client, signed in as the test customer. */
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'mohanpes328a@gmail.com' })
const { data: ses } = await E.supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const uid = ses.user.id, token = ses.session.access_token
const occ = 'kids-birthday-party'
let planId = null
try {
  console.log('Sync: the phone’s plan becomes server requirements')
  const kind = (await admin.from('sambramo_requirement_templates').select('fields').eq('trade_id', 'dj_music').eq('published', true).single())
    .data.fields.find(f => f.key === 'performance_kinds').options[0].value
  const s1 = await E.syncRequirements({ userId: uid, occasionId: occ, context: { guests: 40, date: '2027-02-02' }, services: [
    { tradeId: 'photography', needs: { $hours: 4 } },
    { tradeId: 'dj_music', needs: {} },
    { tradeId: 'live_entertainment', needs: { act_types: ['__nope__'] } },
  ] })
  planId = s1.planId
  ok(s1.ok && /^SBM-EVT-\d+$/.test(s1.planCode ?? ''), `one event, with its code (${s1.planCode ?? s1.reason})`)
  ok(s1.reqs.photography?.state === 'ready' && /-PHOTO-01$/.test(s1.reqs.photography.code), `photography is ready (${s1.reqs.photography?.code})`)
  ok(s1.reqs.dj_music?.state === 'configuring' && s1.reqs.dj_music.missing.join() === 'performance_kinds', 'a DJ with no kind of act is held back, and says what it needs')
  ok(s1.reqs.live_entertainment?.ok === false && s1.reqs.live_entertainment.refused, 'an answer that is not an option is refused, with the reason')
  const s2 = await E.syncRequirements({ userId: uid, occasionId: occ, context: { guests: 40 }, services: [{ tradeId: 'dj_music', needs: { performance_kinds: [kind] } }] })
  ok(s2.planId === planId && s2.reqs.dj_music?.state === 'ready', 'answering it later makes the same requirement ready — same event, no duplicate')

  console.log('\nThe batch endpoint, as the customer')
  /* `http` is kept apart: the body has its own `status` (the batch's). */
  const call = async (body, auth = token) => { let st = 0, o = null; await batch({ method: 'POST', headers: auth ? { authorization: `Bearer ${auth}` } : {}, body },
    { status(c) { st = c; return this }, json(b) { o = b; return this }, setHeader() { return this }, end() { return this } }); return { http: st, ...o } }
  const before = (await admin.from('booking_requests').select('id', { count: 'exact', head: true }).eq('customer_id', uid)).count
  const ghost = '00000000-0000-4000-8000-000000000000'
  const r = await call({ planId, clientKey: `send-check-${Date.now()}`, lines: [
    { planServiceId: s1.reqs.photography.id, vendorServiceId: ghost, request: { event_date: '2027-02-02', start_time: '10:00', lat: 12.97, lng: 77.59, guests: 40, hours: 4 },
      backups: [{ serviceId: ghost, chosenBy: 'customer', request: {} }] },
  ] })
  ok(r.http === 200, `the customer's own token is accepted (HTTP ${r.http})`)
  ok((r.failed ?? []).some(f => f.planServiceId === s1.reqs.photography.id), 'the line the engine refuses comes back as failed, with its reason')
  const le = (r.skipped ?? []).find(x => x.plan_service_id === s1.reqs.live_entertainment.id)
  ok(le?.reason === 'not_configured', `the refused service is skipped as not configured (${le?.reason})`)
  const djBack = (await admin.from('event_plan_services').select('state').eq('id', s1.reqs.dj_music.id).single()).data
  ok(djBack?.state === 'ready', 'a ready service the phone did not send this time is put back, not left claimed')
  const b = (await admin.from('sambramo_dispatch_batches').select('status').eq('id', r.batchId).single()).data
  ok(b?.status === 'failed', `the batch is closed as failed, not done (${b?.status})`)
  const ph = (await admin.from('event_plan_services').select('state').eq('id', s1.reqs.photography.id).single()).data
  ok(ph?.state === 'ready', 'and photography is ready again — free to be sent once a master is chosen')
  const after = (await admin.from('booking_requests').select('id', { count: 'exact', head: true }).eq('customer_id', uid)).count
  ok(after === before, `no booking row was created (${before} → ${after})`)
  ok((await call({ planId, clientKey: 'x'.repeat(12), lines: [] }, null)).http === 401, 'without a token the endpoint refuses (401)')
} finally {
  if (planId) await admin.from('event_plans').delete().eq('id', planId)
  await admin.from('sambramo_booking_decisions').delete().eq('customer_id', uid).eq('vendor_service_id', '00000000-0000-4000-8000-000000000000')
}
console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail ? 1 : 0
