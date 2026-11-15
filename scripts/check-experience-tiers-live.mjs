#!/usr/bin/env node
/**
 * Migration 208 against the LIVE database — run after pasting it:
 *
 *   node --env-file=.env scripts/check-experience-tiers-live.mjs
 *
 * Proves:
 *   · the experiences are there, readable by anyone, writable by nobody but
 *     an admin, and an edit is a new version
 *   · sambramo_package_fit judges a package on its real hours and
 *     inclusions — NEVER on its label — on the live partner packages:
 *     a partner's 1-hour "Essential" does NOT deliver "Important Moments",
 *     and a longer package of theirs with a different name DOES
 *   · the hours a customer asks for raise the bar; a missing inclusion, a
 *     package that is not LIVE, and the wrong trade are all named as gaps
 *   · THE BOOKING ENDPOINT ITSELF (api/_lib/anchorBook.js, preview mode —
 *     nothing is written) refuses to price a package as an experience it
 *     does not deliver, and refuses a package other than the one shown
 *
 * It discovers its cases in the live data rather than naming ids, and
 * fails loudly — never passes — when a case it needs does not exist.
 * The only row it writes is an INACTIVE fixture tier (invisible to every
 * customer), deleted at the end.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('run with --env-file=.env'); process.exitCode = 1 }
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts)
const anon = createClient(URL_, ANON, opts)
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }
const need = (c, what) => { if (!c) { fail++; console.log(`  ✗ NO CASE TO TEST: ${what}`) } return !!c }

async function session(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, opts)
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return c
}

/* The real booking endpoint, called the way a phone calls it — preview
   only, so it resolves and checks but writes nothing. */
async function previewBook(body) {
  const { default: book } = await import('../api/_lib/anchorBook.js')
  let status = 0, payload = null
  const res = { status(c) { status = c; return this }, json(b) { payload = b; return this }, setHeader() { return this }, end() { return this } }
  await book({ method: 'POST', headers: {}, query: { op: 'book' }, body: { ...body, preview: true } }, res)
  return { status, ...payload }
}

const probe = await anon.from('sambramo_experience_tiers').select('trade_id').limit(1)
if (probe.error) {
  console.error('Migration 208 is not applied (', probe.error.message, ')')
  process.exitCode = 2
} else await run()

async function run() {
  const fx = { trade_id: 'warehouse_storage', tier: 'ESSENTIAL' }
  try {
    console.log('The experiences')
    const tiers = (await anon.from('sambramo_experience_tiers').select('trade_id, tier, name, model, min_hours, required_inclusions')).data ?? []
    ok(tiers.length >= 24, `anyone can read them (${tiers.length})`)
    ok(new Set(tiers.map(t => t.trade_id)).size >= 8, `${new Set(tiers.map(t => t.trade_id)).size} trades have experiences`)
    const ph = Object.fromEntries(tiers.filter(t => t.trade_id === 'photography').map(t => [t.tier, t.name]))
    ok(ph.ESSENTIAL === 'Important Moments' && ph.SIGNATURE === 'Complete Story' && ph.VIP === 'Cinematic Experience', 'photography uses the brief’s names')
    ok(tiers.filter(t => t.model === 'PARTNER_PACKAGE').every(t => Number(t.min_hours) > 0), 'every package experience has a minimum to check')
    const me = await session('mohanpes328a@gmail.com')
    ok(!!(await me.from('sambramo_experience_tiers').insert({ ...fx, name: 'x', model: 'VISUAL_SPECIFICATION' })).error, 'a customer cannot add one')
    ok(!!(await me.from('sambramo_experience_tiers').update({ min_hours: 1 }).eq('trade_id', 'photography').eq('tier', 'VIP').select('tier')).data?.length === false,
      'nor change one')

    await admin.from('sambramo_experience_tiers').insert({ ...fx, name: 'Fixture', model: 'PARTNER_PACKAGE', min_hours: 1, active: false })
    await admin.from('sambramo_experience_tiers').update({ min_hours: 2 }).match(fx)
    const v = (await admin.from('sambramo_experience_tiers').select('version').match(fx).single()).data
    ok(v?.version === 2, `an edit is a new version, so a booking names the definition it was chosen against (v${v?.version})`)
    ok(!(await anon.from('sambramo_experience_tiers').select('tier').match(fx)).data?.length, 'an inactive experience is invisible to customers')

    console.log('Judged on the package, never its label — live partner packages')
    const pk = (await admin.from('sambramo_trade_packages').select('id, listing_version_id, name, status, commercial_inputs, trade_inputs')).data ?? []
    const lv = (await admin.from('sambramo_listing_versions').select('id, trade_id, vendor_service_id, status')).data ?? []
    const hrs = p => Number(p.trade_inputs?.duration_hours) || 0
    const lab = p => String(p.commercial_inputs?.tier ?? '').toUpperCase()
    let A = null
    for (const l of lv.filter(x => x.trade_id === 'photography' && x.status === 'LIVE')) {
      const mine = pk.filter(p => p.listing_version_id === l.id && p.status === 'LIVE')
      const short = mine.find(p => lab(p) === 'ESSENTIAL' && hrs(p) < 2)
      const long = mine.find(p => lab(p) !== 'ESSENTIAL' && hrs(p) >= 2)
      if (short && long) { A = { l, short, long }; break }
    }
    const fit = async (id, trade, tier, hours = null) => (await anon.rpc('sambramo_package_fit', { p_package_id: id, p_trade_id: trade, p_tier: tier, p_hours: hours })).data?.[0]
    const has = (f, need, want) => (f?.gaps ?? []).some(g => g.need === need && (want === undefined || g.want === want))
    if (need(A, 'a photographer whose Essential is under 2 h and who has a longer package')) {
      const s = await fit(A.short.id, 'photography', 'ESSENTIAL')
      ok(s?.qualifies === false && has(s, 'hours'), `their ${hrs(A.short)} h "${A.short.name}" does NOT deliver Important Moments (${JSON.stringify(s?.gaps)})`)
      const g = await fit(A.long.id, 'photography', 'ESSENTIAL')
      ok(g?.qualifies === true, `their ${hrs(A.long)} h "${A.long.name}" DOES — the label is not the test`)
      ok((await fit(A.long.id, 'photography', 'ESSENTIAL', hrs(A.long) + 2))?.qualifies === false, 'asking for more hours raises the bar')
      ok(has(await fit(A.long.id, 'dj_music', 'ESSENTIAL'), 'trade'), 'a photography package never delivers a DJ experience')
      ok(has(await fit(A.long.id, 'photography', 'PLATINUM'), 'experience'), 'an experience that does not exist is named as such')
      ok(has(await fit(A.long.id, 'decoration_floral', 'ESSENTIAL'), 'quote'), 'décor is quoted against, never package-matched')
    }
    const noAlbum = pk.find(p => p.status === 'LIVE' && lv.find(l => l.id === p.listing_version_id)?.trade_id === 'photography'
      && !(p.commercial_inputs?.inclusions ?? []).includes('album'))
    if (need(noAlbum, 'a photography package without an album')) ok(has(await fit(noAlbum.id, 'photography', 'VIP'), 'inclusion', 'album'), 'a missing album is named')
    /* A not-LIVE package in a trade that HAS experiences — a package whose
       listing has no trade (there are some) can only ever answer "no such
       experience", which tests nothing about the status rule. */
    const withExp = new Set(tiers.map(t => t.trade_id))
    const tradeOf = p => lv.find(l => l.id === p.listing_version_id)?.trade_id
    const dead = pk.filter(p => p.status !== 'LIVE' && withExp.has(tradeOf(p)))
    if (need(dead.length, 'a not-LIVE package in a trade with experiences')) {
      /* Asked at each trade's HIGHEST bar, so that — were the function to
         carry on past "not live" — an hours or inclusion gap would appear
         and give the package's details away. At ESSENTIAL nothing falls
         short, and the no-leak assertion below would pass vacuously. */
      const top = Object.fromEntries([...withExp].map(tr => [tr, tiers.filter(t => t.trade_id === tr && t.model === 'PARTNER_PACKAGE')
        .sort((a, b) => Number(b.min_hours) - Number(a.min_hours))[0]?.tier ?? 'VIP']))
      const verdicts = await Promise.all(dead.map(p => fit(p.id, tradeOf(p), top[tradeOf(p)])))
      ok(verdicts.every(f => f?.qualifies === false && has(f, 'live')),
        `none of ${dead.length} not-LIVE packages (${[...new Set(dead.map(p => p.status))].join(', ')}) delivers anything`)
      ok(verdicts.every(f => (f?.gaps ?? []).every(g => g.need === 'live')),
        'and a not-LIVE package reveals nothing but its status — no hours, no inclusions (209)')
    }

    console.log('The booking endpoint itself (preview — nothing is written)')
    if (need(A, 'the same photographer, for the endpoint')) {
      const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const base = { event_date: day, start_time: '10:00', lat: 12.9716, lng: 77.5946, guests: 50 }
      const exp = { trade: 'photography', tier: 'ESSENTIAL', hours: 2 }
      const svc = A.l.vendor_service_id

      /* The control: without an experience, does the engine price this
         package at all on that day? If not, the rest cannot be tested here. */
      const plain = await previewBook({ vendorServiceId: svc, request: { ...base, package: lab(A.long), hours: hrs(A.long) } })
      ok(!plain.experience_fit && plain.path !== 'NOT_QUALIFIED', `with no experience chosen nothing changes (path ${plain.path})`)
      if (need(plain.package_id === A.long.id, `the engine to price "${A.long.name}" on ${day} (got ${plain.path}, package ${plain.package_id}, ${JSON.stringify(plain.reasons_text ?? plain.error)})`)) {
        const short = await previewBook({ vendorServiceId: svc, request: { ...base, package: 'ESSENTIAL', hours: hrs(A.short), package_id: A.short.id, experience: exp } })
        ok(short.path === 'NOT_QUALIFIED' && short.experience_fit?.ok === false,
          `asked to book the ${hrs(A.short)} h package as Important Moments → refused (${short.path})`)
        ok(/Important Moments/.test(short.reasons_text?.[0] ?? ''), `and the first reason says so: "${short.reasons_text?.[0]}"`)

        const good = await previewBook({ vendorServiceId: svc, request: { ...base, package: lab(A.long), hours: hrs(A.long), package_id: A.long.id, experience: exp } })
        ok(good.path !== 'NOT_QUALIFIED' && good.experience_fit?.ok === true && good.experience_fit?.package_id === A.long.id,
          `the ${hrs(A.long)} h "${A.long.name}" is accepted as Important Moments (${good.path})`)
        ok(good.experience_fit?.name === 'Important Moments' && good.experience_fit?.version >= 1,
          'and the verdict carries the experience and its version — what pricing_snapshot will freeze')

        const swapped = await previewBook({ vendorServiceId: svc, request: { ...base, package: 'ESSENTIAL', hours: 2, package_id: A.long.id, experience: exp } })
        /* Refused before the experience is even looked at: shown-is-priced
           is checked for every request that names a package (anchorBook). */
        ok(swapped.path === 'NOT_QUALIFIED' && (swapped.reasons ?? []).includes('package_changed'),
          `shown one package, priced another under a different label → refused (${swapped.path}, ${(swapped.reasons ?? []).join(',')})`)

        const more = await previewBook({ vendorServiceId: svc, request: { ...base, package: lab(A.long), hours: hrs(A.long), package_id: A.long.id,
          experience: { ...exp, hours: hrs(A.long) + 2 } } })
        ok(more.path === 'NOT_QUALIFIED', `asked for ${hrs(A.long) + 2} h, the ${hrs(A.long)} h package is refused`)
      }
    }
  } finally {
    await admin.from('sambramo_experience_tiers').delete().match(fx)
    ok(!(await admin.from('sambramo_experience_tiers').select('tier').match(fx)).data?.length, 'the fixture experience is gone')
  }
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exitCode = fail ? 1 : 0
}
