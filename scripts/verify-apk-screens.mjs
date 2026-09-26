#!/usr/bin/env node
/**
 * Does the apk actually show the new screens?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every check so far proved a FILE was correct: the strings are in the
 * bundle, the bundle is in the apk, the apk has the right version. All
 * true, all verified, and none of it answered the only question that
 * matters — does a partner opening this build see the new screens.
 *
 * So this runs the apk's OWN bundled assets. Not dist/, not src/: the
 * `assets/public` directory is unzipped straight out of the .apk and
 * served, so what is exercised is byte-for-byte what is on the phone.
 *
 * A real partner session is minted (generateLink + verifyOtp, per the
 * pattern in the repo) and written into localStorage before the app
 * boots, because every screen worth checking is behind a login.
 *
 *   node scripts/verify-apk-screens.mjs <path-to.apk>
 *
 * Writes one screenshot per tab and asserts a marker unique to the new
 * build is present on each.
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './lib/loadSrc.mjs'

const apk = resolve(ROOT, process.argv[2] ?? '')
if (!existsSync(apk)) {
  console.error('\n  usage: node scripts/verify-apk-screens.mjs <path-to.apk>\n')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

/* ── 1 · Unzip the apk's web assets ──────────────────────────────── */
const work = mkdtempSync(join(tmpdir(), 'sambramo-apk-'))
const web = join(work, 'public')

/* Expand-Archive refuses anything not named .zip, however well-formed
   the zip inside it is. Copied rather than renamed, so the apk that was
   handed over is left exactly as it was. */
const asZip = join(work, 'apk.zip')
execFileSync('powershell', ['-NoProfile', '-Command',
  `Copy-Item -LiteralPath '${apk}' -Destination '${asZip}'; ` +
  `Expand-Archive -LiteralPath '${asZip}' -DestinationPath '${work}\\apk' -Force`],
  { stdio: 'pipe' })

const inner = join(work, 'apk', 'assets', 'public')
if (!existsSync(inner)) {
  console.error('\n  No assets/public inside that apk.\n'); process.exit(1)
}
execFileSync('powershell', ['-NoProfile', '-Command',
  `Copy-Item -Path '${inner}' -Destination '${web}' -Recurse -Force`], { stdio: 'pipe' })

const indexHtml = readFileSync(join(web, 'index.html'), 'utf8')
const entry = indexHtml.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
const version = existsSync(join(web, 'version.json'))
  ? JSON.parse(readFileSync(join(web, 'version.json'), 'utf8')) : {}

console.log(`\n  apk      ${apk.split(/[\\/]/).pop()}`)
console.log(`  entry    ${entry}`)
console.log(`  built    ${version.builtAt ?? 'unknown'}  (${version.surface ?? '?'})\n`)

/* ── 2 · A real partner session ──────────────────────────────────── */
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                           { auth: { persistSession: false } })
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
                          { auth: { persistSession: false } })

const EMAIL = process.env.PARTNER_EMAIL ?? 'sambramo.partner.test@gmail.com'

const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: EMAIL,
})
if (linkErr) { console.error('  could not mint a link:', linkErr.message); process.exit(1) }

/* Redeemed on the ANON client. On the service-role one every assertion
   afterwards would be testing the service role's permissions. */
const { data: fresh, error: otpErr } = await anon.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
})
if (otpErr) { console.error('  could not redeem it:', otpErr.message); process.exit(1) }
console.log(`  session  ${fresh.user.email}\n`)

/* supabase-js v2 keys its storage on the project ref. */
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const storageKey = `sb-${ref}-auth-token`

/* ── 3 · Serve the apk's assets ──────────────────────────────────── */
const PORT = 4363
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
}
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file = join(web, url === '/' ? 'index.html' : url.replace(/^\//, ''))
  /* The single-page fallback Capacitor itself applies: anything without
     a dot in its last segment gets index.html. */
  if (!existsSync(file)) {
    if (!/\.[a-z0-9]+$/i.test(url)) file = join(web, 'index.html')
    else { res.statusCode = 404; return res.end('not found') }
  }
  res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
  res.end(readFileSync(file))
})
server.listen(PORT)

/* ── 4 · Drive it ────────────────────────────────────────────────── */
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
              'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const CDP = 9479
const profile = join(work, 'edge')
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  `http://127.0.0.1:${PORT}/`], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

let targets = []
for (let i = 0; i < 40; i++) {
  await sleep(500)
  try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json() } catch { /* not up */ }
  if (targets.some(t => t.type === 'page')) break
}
const page = targets.find(t => t.type === 'page')
if (!page) { console.error('  Edge never opened its port.'); browser.kill(); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    logs.push('UNCAUGHT ' + (d?.exception?.description ?? d?.text ?? 'error'))
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    if (m.params.type === 'error') {
      logs.push('CONSOLE.ERROR ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
    }
    logs.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
  }
}
const send = (method, params = {}) =>
  new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',
  { width: 430, height: 900, deviceScaleFactor: 1, mobile: true })

/* The session, written before the app boots. */
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
await sleep(1200)
await send('Runtime.evaluate', { expression:
  `localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fresh.session))})` })

const shots = join(ROOT, 'shots')
const capture = async (name) => {
  const h = Math.ceil((await send('Runtime.evaluate',
    { expression: 'document.documentElement.scrollHeight' })).result.value)
  await send('Emulation.setDeviceMetricsOverride',
    { width: 430, height: Math.min(h, 3000), deviceScaleFactor: 1, mobile: true })
  await sleep(400)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(join(shots, name), Buffer.from(shot.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride',
    { width: 430, height: 900, deviceScaleFactor: 1, mobile: true })
}

const textNow = async () =>
  (await send('Runtime.evaluate', { expression: 'document.body.innerText' })).result?.value ?? ''

/**
 * Navigate, then wait for the splash to LEAVE.
 *
 * SplashScreen is `fixed inset-0 z-[200]` and holds for 4500ms plus a
 * 520ms fade. A fixed wait of 3.5s photographed the splash on every
 * route while the app rendered underneath it -- which is why some text
 * assertions passed against screenshots that showed nothing but the
 * poster.
 *
 * Polled rather than slept: the app also has to finish its own first
 * read, and a number tuned to this machine is a number that is wrong on
 * a slower one.
 */
const goto = async (hash, timeout = 20000) => {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${hash}` })
  const started = Date.now()
  while (Date.now() - started < timeout) {
    await sleep(400)
    const gone = await send('Runtime.evaluate', { expression:
      '!document.querySelector(".splash-ground") && document.body.innerText.trim().length > 40' })
    if (gone.result?.value === true) { await sleep(900); return }
  }
}

/* ── 5 · The tabs, and a marker unique to THIS build on each ─────── */
console.log('WHAT THE APK ACTUALLY RENDERS\n')

const TABS = [
  ['Onboarding · details', '/partner/setup/details', 'apk-setup-details.png',
   [['Business name', 'the field'], ['Contact number', 'the phone field']]],
  ['Onboarding · bank',    '/partner/setup/bank',    'apk-setup-bank.png',
   [['IFSC', 'the IFSC field']]],
  ['Onboarding · area',    '/partner/setup/area',    'apk-setup-area.png',
   [['Notice you need', 'the lead-time field']]],
  ['Onboarding · verify', '/partner/setup/compliance', 'apk-setup-verify.png',
   [['Which ID would you like to use', 'the NEW identity chooser'],
    ['Voter ID', 'the NEW voter ID option'],
    ['Passport', 'the NEW passport option'],
    ['a person reads the card', 'the NEW honesty line on the weaker IDs']]],
  ['Jobs',     '/dashboard/vendor?tab=offers',       'apk-tab-jobs.png',
   [['Under review', 'the status pill'], ['Sambramo', 'the wordmark'],
    ['With our team', 'the review card'],
    ['See the', 'the NEW listing button on the review card']]],
  ['Calendar', '/dashboard/vendor?tab=availability', 'apk-tab-calendar.png',
   [['Set dates', 'the NEW header button (was "Block dates")'],
    ['Set a range of dates', 'the MERGED tools row (was two rows opening one sheet)'],
    ['Calendar coverage', 'the NEW coverage strip — Jobs said it and Calendar did not'],
    ['Open the next', 'the NEW one-tap coverage button'],
    ['Available, limited or blocked', 'the row naming all four modes']]],
  ['Earnings', '/dashboard/vendor?tab=earnings',     'apk-tab-earnings.png',
   [['Ready to claim', 'the hero'],
    ['Grow the Sambramo community', 'the NEW campaign carousel, configured not compiled'],
    ['₹2,500', 'the reward, read from the row in paise']]],
  ['More',     '/dashboard/vendor?tab=account',      'apk-tab-more.png',
   [['Sambramo Partner \u00b7', 'the NEW build stamp'], ['bundle ', 'the NEW bundle line']]],
  /* ── The bell's destination ────────────────────────────────────────
     It used to land on the More LIST, one level short, leaving the
     partner to find the Notifications row themselves. */
  ['Notifications', '/dashboard/vendor?tab=account&screen=notifications',
   'apk-screen-notifications.png',
   [['Notifications', 'the screen the bell now opens'],
    ['Calendar', 'the NEW calendar preference, unreachable for two migrations']]],
  /* The avatar's destination, likewise. */
  ['Partner profile', '/dashboard/vendor?tab=account&screen=profile',
   'apk-screen-profile.png',
   [['Partner profile', 'the screen the avatar now opens']]],
  ['Referral', '/dashboard/vendor?tab=account&screen=referral',
   'apk-screen-referral.png',
   [['Grow the Sambramo community', 'the NEW referral screen, titled from the campaign'],
    ['Share your code', 'the share action'],
    ['0 of 20', 'progress against the CONFIGURED threshold, not a constant']]],
  ['Settings', '/dashboard/vendor?tab=account&screen=settings',
   'apk-screen-settings.png',
   [['Partner terms', 'the NEW terms row — Settings held only Close account'],
    ['bundle ', 'the build stamp']]],
]

/**
 * Wait for a needle, rather than photographing once and hoping.
 *
 * Several of these markers arrive from the network AFTER first paint --
 * the campaign carousel fetches promotions, the referral screen fetches
 * progress, the notification list fetches rows. A single `textNow()`
 * straight after the splash leaves catches them on a good run and
 * misses them on a slow one, which is how this harness reported the
 * carousel present and then absent on two runs of the SAME apk.
 *
 * A flaky check is worse than no check: it teaches whoever sees it to
 * re-run until green, and the one time it means something they re-run
 * until green too.
 */
const waitForText = async (needle, ms = 8000) => {
  const want = needle.toLowerCase()
  const until = Date.now() + ms
  let text = ''
  do {
    text = await textNow()
    if (text.toLowerCase().includes(want)) return { found: true, text }
    await sleep(400)
  } while (Date.now() < until)
  return { found: false, text }
}

for (const [label, url, file, markers] of TABS) {
  await goto(url)
  console.log(`  ${label}`)

  /* The first marker is polled; by the time it lands the rest of the
     screen has settled too, so the others are checked against that
     same text rather than each paying the wait again. */
  let text = await textNow()
  for (const [needle, why] of markers) {
    if (!text.toLowerCase().includes(needle.toLowerCase())) {
      const r = await waitForText(needle)
      text = r.text
    }
    ok(`    ${why}`, text.toLowerCase().includes(needle.toLowerCase()),
       `"${needle}" not on screen`)
  }

  /* Photographed last, so the picture shows the settled screen rather
     than the one the first assertion raced. */
  await capture(file)
}

/* ══════════════════════════════════════════════════════════════════
   THE CALLBACKS, MADE TO FIRE
   ══════════════════════════════════════════════════════════════════

   A validated field says nothing while its value is valid, which is
   exactly what a partner with a finished profile sees: their own
   correct details and no messages. "There are no callbacks" and "every
   field is currently correct" look identical.

   So this types WRONG values in and photographs what comes back.
   React tracks input state through its own value setter, so a plain
   `el.value = x` is silently ignored -- the native setter has to be
   called and an input event dispatched, or the component never learns
   anything changed. */
console.log('')
console.log('  Callbacks, with deliberately wrong values')

const typeInto = async (labelText, value) => {
  const expr = `(() => {
    const label = [...document.querySelectorAll('label,span,p')]
      .find(n => n.textContent.trim().startsWith(${JSON.stringify(labelText)}))
    if (!label) return 'no label'
    const field = label.closest('label') ?? label.parentElement
    const el = field?.querySelector('input,textarea')
      ?? field?.nextElementSibling?.querySelector?.('input,textarea')
    if (!el) return 'no input'
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', { bubbles: true }))
    /* focusout, not blur. React 17+ delegates onBlur through focusout
       at the root container, and a dispatched blur event -- even with
       bubbles forced on -- never reaches the handler. ValidatedField
       only reveals its message once touched is set, which onBlur does,
       so a blur that never arrives reads exactly like a field with no
       validation on it at all.
       No backticks in this comment: it lives inside a template literal
       and one would end it. */
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    return 'ok'
  })()`
  const r = await send('Runtime.evaluate', { expression: expr })
  return r.result?.value
}

await goto('/partner/setup/details')
await typeInto('Business name', '99999')
await typeInto('Contact number', '98')
await sleep(900)
const badText = await textNow()
await capture('apk-callbacks.png')

for (const [needle, why] of [
  ['An Indian mobile number has 10', 'the phone-length callback fires'],
  ['a business name needs words in it', 'the all-digits-name callback fires'],
]) {
  ok(`    ${why}`, badText.toLowerCase().includes(needle.toLowerCase()), `"${needle}" did not appear`)
}

/* ══════════════════════════════════════════════════════════════════
   IT HAS TO FIT ON A REAL PHONE
   ══════════════════════════════════════════════════════════════════

   This harness ran every check at 430px, which is a large modern
   handset. The phones partners actually carry are narrower -- 360px is
   still the commonest Android width in India, and a Redmi or a Moto G
   sits there. A card that overflows at 360 and fits at 430 passes every
   assertion above and is broken on the device it was built for.

   Horizontal overflow is the specific failure worth catching, because
   it is invisible in a screenshot: the page simply scrolls sideways and
   a CTA ends up off the right edge where nobody finds it. A few pixels
   of tolerance because a sub-pixel rounding on a transform is not a
   layout bug.

   The bottom nav is checked too: it is `fixed`, so content that ends
   underneath it is unreachable rather than merely ugly. */
/* ══════════════════════════════════════════════════════════════════
   A NOTIFICATION HAS TO GO SOMEWHERE
   ══════════════════════════════════════════════════════════════════

   Asserting that the Notification Center RENDERS says nothing about
   whether tapping a row does anything. `href` has been written into
   every notification since migration 125 and was read by no UI at all
   until recently -- so "the screen exists" and "the screen works" were
   two very different claims and only one of them was checked.

   This taps a real row and reads `location.search` afterwards. */
/* ══════════════════════════════════════════════════════════════════
   EVERY SCREEN IN More, OPENED
   ══════════════════════════════════════════════════════════════════

   The TABS table above checks a handful of screens by looking for a
   word on them. That proves the ones it names render; it says nothing
   about the other six, and "Something went wrong" on a partner's phone
   is exactly a screen nobody opened here.

   This opens all of them and attributes any error to the screen that
   produced it, rather than reporting one anonymous console error at the
   end of the run. */
console.log('')
console.log('  Every screen in More opens without throwing')

const SCREENS = ['profile', 'services', 'business', 'area', 'verification',
                 'bank', 'notifications', 'messages', 'reviews', 'referral',
                 'help', 'settings', 'terms']

for (const screen of SCREENS) {
  const before = logs.length
  await goto(`/dashboard/vendor?tab=account&screen=${screen}`)
  await sleep(600)

  const fresh = logs.slice(before)
  const broke = fresh.find(l => /^UNCAUGHT|^CONSOLE\.ERROR|Unhandled render error/i.test(l))
  const boundary = (await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `document.body.innerText.includes('Something went wrong')`,
  })).result?.value

  ok(`    ${screen}`, !broke && !boundary,
     broke ? broke.slice(0, 120) : 'the error boundary caught something')
}

console.log('')
console.log('  A notification goes where it says')

const DEEP = [
  ['calendar',     'tab=availability'],
  ['payout',       'tab=earnings'],
  ['verification', 'screen=verification'],
]

for (const [kind, expect] of DEEP) {
  await goto('/dashboard/vendor?tab=account&screen=notifications')

  const tapped = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const el = document.querySelector('[data-notification="${kind}"]')
      if (!el) return 'absent'
      el.click()
      return 'tapped'
    })()`,
  })

  if (tapped.result?.value !== 'tapped') {
    console.log(`    · no ${kind} notification on this account; skipped`)
    continue
  }

  await sleep(1500)
  const where = (await send('Runtime.evaluate',
    { returnByValue: true, expression: 'location.search' })).result?.value ?? ''

  ok(`    a ${kind} notification opens ${expect}`,
     where.includes(expect),
     `landed on "${where}"`)
}

console.log('')
console.log('  Every width a partner actually holds')

const WIDTHS = [360, 375, 390, 412]
const NARROW_ROUTES = [
  ['Jobs', '/dashboard/vendor?tab=offers'],
  ['Calendar', '/dashboard/vendor?tab=availability'],
  ['Earnings', '/dashboard/vendor?tab=earnings'],
  ['More', '/dashboard/vendor?tab=account'],
]

for (const w of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: 860, deviceScaleFactor: 1, mobile: true })
  let worstOver = 0
  let worstRoute = null
  let covered = null

  for (const [label, url] of NARROW_ROUTES) {
    await goto(url)
    /* ── Scrolled to the BOTTOM first ──────────────────────────────
       The first version of this test flagged any control whose box
       crossed the top edge of the fixed tab bar. That is not a bug: on
       a scrollable page almost everything crosses that line at some
       scroll position, and it reported four false failures on content
       that scrolls clear perfectly well.

       The real failure is content that can NEVER be scrolled out from
       under the bar -- a page whose scroll container has no bottom
       padding, so its last row is permanently covered. So: scroll to
       the end, settle, and only then ask what is still underneath. */
    await send('Runtime.evaluate', {
      expression: 'window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })',
    })
    await sleep(350)

    const probe = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const d = document.documentElement
        const over = Math.max(0, d.scrollWidth - d.clientWidth)
        const nav = document.querySelector('nav')
        if (!nav) return { over, buried: null }
        const navTop = nav.getBoundingClientRect().top
        let buried = null
        for (const el of document.querySelectorAll('button, a, input, textarea')) {
          if (nav.contains(el)) continue
          const r = el.getBoundingClientRect()
          if (r.height === 0) continue
          /* Its MIDDLE is under the bar, at the very bottom of the
             scroll. Nothing the partner can do reaches it. */
          const mid = r.top + r.height / 2
          if (mid > navTop + 2 && r.top < window.innerHeight) {
            buried = el.textContent?.trim().slice(0, 30) || el.getAttribute('aria-label') || 'a control'
            break
          }
        }
        return { over, buried }
      })()`,
    })
    const { over = 0, buried = null } = probe.result?.value ?? {}
    if (over > worstOver) { worstOver = over; worstRoute = label }
    if (buried && !covered) covered = `${label}: "${buried}"`
  }

  ok(`    ${w}px — no sideways scroll`, worstOver <= 2,
     `${worstRoute} overflows by ${worstOver}px`)
  ok(`    ${w}px — nothing tappable under the tab bar`, !covered, covered ?? '')
}

await send('Emulation.setDeviceMetricsOverride',
  { width: 430, height: 900, deviceScaleFactor: 1, mobile: true })

console.log('')
const evicted = logs.filter(l => /service worker|stale cache/i.test(l))
if (evicted.length) console.log('  worker log:', evicted[0])

/* ── Anything that actually threw ──────────────────────────────────
   A screen can render its assertions and still be throwing underneath:
   an error inside an effect does not stop the markup, it stops the
   NEXT thing. "Something went wrong" on a partner's phone starts here
   and was invisible to this harness until now. */
const thrown = [...new Set(logs.filter(l =>
  /^UNCAUGHT|^CONSOLE\.ERROR|Minified React error|Rendered (more|fewer) hooks/i.test(l)))]
if (thrown.length) {
  console.log('')
  console.log(`  ${cross} ${thrown.length} error(s) on the console:`)
  for (const t of thrown.slice(0, 8)) console.log('      ' + t.slice(0, 180))
  bad++; ran++
  fails.push(`${thrown.length} console error(s) — see above`)
} else {
  console.log('')
  console.log(`  ${tick} no console errors on any route`)
  ran++
}

ws.close(); browser.kill(); server.close()
try { rmSync(work, { recursive: true, force: true }) } catch { /* windows holds it */ }

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}   screenshots in shots/apk-tab-*.png\n`)
if (fails.length) { console.log('NOT ON SCREEN\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
