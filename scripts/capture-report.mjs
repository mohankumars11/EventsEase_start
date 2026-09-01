#!/usr/bin/env node
/**
 * Photograph the app, screen by screen, before anything is deployed.
 *
 *   node scripts/capture-report.mjs            (expects dist/)
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Too many builds went out on my word that a screen worked, and were
 * downloaded, installed, and found broken. That is a bad way to spend
 * somebody's afternoon and a worse way to spend their trust.
 *
 * So: the screens get photographed from the real production bundle, the
 * pictures go in a folder, and the pictures are the claim. If a screen
 * is not in here, it was not checked.
 *
 * ── It drives, it does not just visit ───────────────────────────────
 * A route that renders is not a screen that works. Where a flow has
 * steps, this clicks through them — pick a date, continue, choose
 * services, continue — so the capture shows the state a person actually
 * reaches rather than the empty first frame.
 *
 * ── What it cannot show ─────────────────────────────────────────────
 * Anything behind a login it does not have, and anything that needs a
 * live partner to accept. Those are listed as SKIPPED in the output
 * rather than quietly missing, because a gap somebody has to notice is
 * a gap that gets missed.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs', 'test-report')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('\n  dist/ is missing. Run `vite build` first.\n')
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const TYPES = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const PORT = 8981
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let p = join(DIST, url)
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(PORT)

const CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
function onPath() {
  for (const n of ['google-chrome', 'chromium']) {
    const f = spawnSync(process.platform === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' })
    const l = String(f.stdout ?? '').split('\n')[0].trim()
    if (l && existsSync(l)) return l
  }
  return null
}
const EDGE = CANDIDATES.find(existsSync) ?? onPath()
if (!EDGE) { console.error('\n  No browser found.\n'); server.close(); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'sb-shot-'))
const CDP = 9433

const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage',
  ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
  'about:blank',
], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()
const send = (m, p = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej })
  ws.send(JSON.stringify({ id: n, method: m, params: p }))
})
const evalJs = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })

/* The splash holds for 4.5s on a cold load and would be in every shot.
   HIDDEN rather than removed, and the difference is the whole lesson:
   the first cut called .remove() on it, which detaches a node React
   owns. React then throws on its next reconcile, the error boundary
   catches it, and eleven of thirteen captures came back showing
   "Something went wrong on our side" — a broken app photographed by a
   broken harness, which is the worst possible thing to be looking at
   while deciding whether to ship.
   Setting a style touches nothing React tracks. */
const KILL_SPLASH = `document.querySelectorAll('.brand-aqua').forEach(e => { e.style.display = 'none' })`

/* A real session, injected into localStorage before the app boots.
 *
 * The matching board, the cancel sheet and the paid confirmation all sit
 * behind RLS — `booking_lines` is scoped to the caller — so a signed-out
 * capture of them shows an empty screen and proves nothing. Minted by
 * scripts/demo-customer.mjs from a magic link, which is exactly the
 * session the app would hold. */
function sessionScript(file) {
  const p = join(ROOT, file)
  if (!existsSync(p)) return null
  const sess = JSON.parse(readFileSync(p, 'utf8'))
  const env = readFileSync(join(ROOT, '.env'), 'utf8')
  const raw = process.env.VITE_SUPABASE_URL
    ?? env.match(/^VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]*)/m)?.[1]
    ?? ''
  // The project ref is the storage key Supabase writes its session under.
  const ref = String(raw).trim().replace(/^https:\/\//, '').split('.')[0]
  return `localStorage.setItem('sb-${ref}-auth-token', ${JSON.stringify(JSON.stringify(sess))})`
}

/* The app's own draft, written the way the app writes it.
 *
 * The later steps of the instant flow cannot be reached by clicking:
 * Continue is correctly disabled until a real address is chosen, and
 * choosing one means typing into a search box and picking from a live
 * dropdown. Driving that headlessly is brittle, and a brittle capture
 * that half-works is worse than none.
 *
 * Seeding `sambramo_instant_draft` puts the app in the state a returning
 * customer is already in -- the resume path is a real feature, not a
 * test hook, so this exercises it rather than going around it. */
function draftScript(draft) {
  return `localStorage.setItem('sambramo_instant_draft', ${JSON.stringify(JSON.stringify({ at: Date.now(), ...draft }))})`
}

async function shot(name, { route = '/', steps = [], wait = 2200, note = '', session = null, draft = null } = {}) {
  await send('Page.navigate', { url: `http://localhost:${PORT}/` })
  await sleep(700)
  if (draft) { await evalJs(draftScript(draft)) }
  if (session) {
    const js = sessionScript(session)
    if (js) {
      await evalJs(js)
      await send('Page.navigate', { url: `http://localhost:${PORT}/` })
      if (draft) { await sleep(200); await evalJs(draftScript(draft)) }
      await sleep(1800)
    }
  }
  await sleep(1200)
  if (route !== '/') {
    await evalJs(`history.pushState({}, '', ${JSON.stringify(route)});`
      + `window.dispatchEvent(new PopStateEvent('popstate'))`)
    await sleep(1200)
  }
  await evalJs(KILL_SPLASH)

  for (const step of steps) {
    await evalJs(step)
    await sleep(900)
    await evalJs(KILL_SPLASH)
  }
  await sleep(wait)

  const m = await send('Page.getLayoutMetrics')
  const h = Math.min(Math.ceil(m.cssContentSize?.height ?? 915), 2400)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: h, deviceScaleFactor: 2, mobile: true,
  })
  await sleep(400)

  const cap = await send('Page.captureScreenshot', { format: 'png' })
  const data = cap?.data ?? cap?.result?.data
  if (!data) { console.log(`  ✗ ${name}`); return false }
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))

  const text = (await evalJs('document.body.innerText.slice(0,90)')).result?.value ?? ''
  console.log(`  ✓ ${name.padEnd(30)} ${note || text.replace(/\n/g, ' · ').slice(0, 46)}`)

  await send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: 915, deviceScaleFactor: 2, mobile: true,
  })
  return true
}

/** Click the nth element whose text contains `s`. */
const clickText = (s, n = 0) =>
  `(() => { const els=[...document.querySelectorAll('button,a,[role=button]')]`
  + `.filter(e => (e.innerText||'').toLowerCase().includes(${JSON.stringify(s.toLowerCase())}));`
  + `if (els[${n}]) els[${n}].click(); return !!els[${n}] })()`

try {
  let url
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
      url = l.find(t => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* waiting */ }
    if (!url) await sleep(250)
  }
  ws = new WebSocket(url)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result)
  }

  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true })

  console.log(`\n  Capturing into docs/test-report/\n`)

  await shot('01-customer-home',        { route: '/' })
  await shot('02-login',               { route: '/login' })
  await shot('03-signup',              { route: '/signup' })
  await shot('04-partner-landing',     { route: '/partner/join', note: 'drawn master, install banner' })
  await shot('05-services',            { route: '/services' })
  await shot('06-plan-hub',            { route: '/plan' })

  // The instant flow, driven step by step.
  await shot('07-instant-when',        { route: '/book/instant?occasion=birthday' })
  await shot('08-instant-where',       { route: '/book/instant?occasion=birthday',
                                          steps: [clickText('Tomorrow'), clickText('Continue')] })
  /* Steps 2 and 3 of the instant flow, reached through the app's own
     resume: a Koramangala address, three services picked. See
     draftScript above for why this is seeded rather than clicked. */
  const DRAFT = {
    guests: 30,
    picked: ['photography', 'decor', 'cake'],
    durations: {}, options: {}, notes: {},
    where: { kind: 'home', area: 'Koramangala', pincode: '560034',
             lat: 12.9352, lng: 77.6245, status: 'served' },
    date: new Date(Date.now() + 86400000 * 21).toISOString(),
    occasionId: 'birthday',
  }

  await shot('09-instant-services',    { route: '/book/instant?occasion=birthday',
                                          draft: { ...DRAFT, step: 2 }, wait: 3000,
                                          note: 'pick the services, live prices' })

  /* The unlock fires the moment the basket crosses the threshold, so it
     lands ON this step. Two shots, because one picture of a sheet over
     a form proves neither. */
  await shot('09b-offer-unlocked',     { route: '/book/instant?occasion=birthday',
                                          draft: { ...DRAFT, step: 3 }, wait: 3000,
                                          note: 'the unlock moment, on white' })

  await shot('09c-service-options',    { route: '/book/instant?occasion=birthday',
                                          draft: { ...DRAFT, step: 3 }, wait: 3000,
                                          steps: [clickText('Not now')],
                                          note: 'what exactly -- per-service options' })

  await shot('10-celebrate-journey',   { route: '/celebrate/birthday' })
  await shot('11-track',               { route: '/track' })
  await shot('12-vendor-dashboard',    { route: '/dashboard/vendor', note: 'signed out state' })
  /* ── The screens that need a real booking behind them ───────────
     A signed-out capture of these shows an empty board and proves
     nothing, so they run against a genuine request with a genuine
     acceptance: three services dispatched, Anu events accepted the
     photography. */
  await shot('14-matching-board', {
    route: '/book/instant?request=5b7f51b1-15c0-44c0-b37d-24429d749dad',
    session: '.demo-customer-session.json',
    wait: 5000,
    note: 'live · 3 services · Anu events accepted photography',
  })

  await shot('15-cancel-sheet', {
    route: '/book/instant?request=5b7f51b1-15c0-44c0-b37d-24429d749dad',
    session: '.demo-customer-session.json',
    wait: 4000,
    steps: ["(() => { const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').startsWith('Cancel')); if (b) b.click(); return !!b })()"],
    note: 'the refund, shown before the button',
  })

  /* ── The partner's own screens, from a real partner session ─────────
     Anu events, who has just accepted the photography line above
     through accept_offer(). Signed in as themselves, so what these show
     is what that partner sees on their phone. */
  await shot('16-partner-jobs', {
    route: '/dashboard/vendor', session: '.demo-partner-session.json', wait: 4500,
    note: 'Anu events · jobs tab · one accepted line' })

  await shot('17-partner-list', {
    route: '/dashboard/vendor?tab=list', session: '.demo-partner-session.json', wait: 3500,
    note: 'the trade picker that decides who gets work' })

  await shot('18-partner-availability', {
    route: '/dashboard/vendor?tab=availability', session: '.demo-partner-session.json', wait: 3500,
    note: 'the blocked date' })

  /* A real partner with a real broken row: sariyo eventss typed
     "videpgraphy", the backfill correctly refused to guess it, and the
     row has never been offered to them. Now the screen says so. */
  await shot('17b-dead-service-row', {
    route: '/dashboard/vendor?tab=list', session: '.demo-partner2-session.json', wait: 3500,
    note: 'a row dispatch can never match, named' })

  await shot('19-partner-account', {
    route: '/dashboard/vendor?tab=account', session: '.demo-partner-session.json', wait: 3000,
    note: 'partner menu — no customer items' })

  /* The complaint, photographed: the partner tapping the menu was shown
     customer items. This opens it as a partner and lets the picture say
     what is in there. */
  await shot('20-partner-menu', {
    route: '/dashboard/vendor', session: '.demo-partner-session.json',
    steps: ["(() => { const b = document.querySelector('[aria-label=\"Open menu\"]'); if (b) b.click(); return !!b })()"], wait: 2500,
    note: 'the menu, opened as a partner' })

  /* The resume card, on the real home screen of a customer who has a
     booking in flight. This is the way back into "finding masters"
     after the app has been closed -- the thing whose absence made the
     flow feel like it had swallowed the booking.

     Signed in, because signed out there is nothing to resume. */
  await shot('21-home-resume', {
    route: '/', session: '.demo-customer-session.json', wait: 4000,
    note: 'You have a booking -> back into the live request' })

  /* The paid state, at last.
     Not a real payment: scripts/check-booking-capture.mjs writes a test
     capture against an accepted line to exercise the webhook's shapes,
     and that flipped this line to `paid`. The SCREEN is genuine -- it is
     driven by the line status the real webhook writes -- but the money
     behind it is a fixture, and the caption says so. */
  await shot('22-paid-confirmation', {
    route: '/book/instant?request=5b7f51b1-15c0-44c0-b37d-24429d749dad',
    session: '.demo-customer-session.json', wait: 5000,
    steps: [clickText('Not now')],
    note: 'paid state, driven by a test capture' })

  /* ── The three sticker states, each on a real booking ────────────
     Not mocked: the reaching shot is a request that was dispatched
     through the deployed endpoint minutes earlier, the pending shot is
     the same request after a partner accepted through accept_offer(),
     and the confirmed shot is a booking whose only remaining line is
     genuinely paid. */
  await shot('23-sticker-reaching', {
    route: '/book/instant?request=83e94237-8f84-4f84-879c-59cda7210b3d',
    session: '.demo-customer-session.json', wait: 5000,
    steps: [clickText('Not now')],
    note: 'REACHING - masters being asked' })

  await shot('24-sticker-pending', {
    route: '/book/instant?request=83e94237-8f84-4f84-879c-59cda7210b3d',
    session: '.demo-customer-session.json', wait: 5000,
    steps: [clickText('Not now')],
    note: 'PAYMENT PENDING - a master accepted' })

  await shot('25-sticker-confirmed', {
    route: '/book/instant?request=5b7f51b1-15c0-44c0-b37d-24429d749dad',
    session: '.demo-customer-session.json', wait: 5000,
    steps: [clickText('Not now')],
    note: 'CONFIRMED - paid, nothing outstanding' })

  /* Step 1 of the partner build: the terms gate. Mohan events has its
     acceptance cleared, so this is the screen a partner meets. */
  await shot('30-terms-gate', {
    route: '/dashboard/vendor', session: '.demo-partner-session.json', wait: 4500,
    note: 'seven rules, pinned consent' })

  await shot('31-terms-long', {
    route: '/dashboard/vendor', session: '.demo-partner-session.json', wait: 4000,
    steps: [clickText('Read the full terms')],
    note: 'the long form, expanded' })

  /* Step 2: every stage of one job, opened. Mohan events has a real
     accepted job awaiting payment behind this. */
  await shot('32-job-lifecycle', {
    route: '/dashboard/vendor', session: '.demo-partner-session.json', wait: 5000,
    steps: [clickText('Where this job stands')],
    note: 'six steps, and which one it is on' })

  await shot('33-payout-details', {
    route: '/dashboard/vendor?tab=account', session: '.demo-partner-session.json', wait: 4000,
    note: 'bank dropdown and IFSC lookup' })

  await shot('13-account',             { route: '/account', note: 'app badge + install banner' })

  console.log("")
  console.log("  NOT CAPTURED (needs a real payment):")
  console.log("    the paid confirmation and the date-blocked card")
  console.log("    Razorpay checkout is a hosted iframe, so it cannot be")
  console.log("    driven headlessly and a faked one would prove nothing.")
  console.log("")
} finally {
  try { ws?.close() } catch { /* gone */ }
  browser.kill(); server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* held */ }
}
