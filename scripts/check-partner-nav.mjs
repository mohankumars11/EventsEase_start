/**
 * The partner tab bar, asserted rather than admired.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS EXISTS TO CATCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * This bar has now been wrong in three different ways in three days: a
 * scrolling strip, then two bars with different tabs, then one bar that
 * was invisible until you signed in. Each was reported by a person
 * looking at a screen, and each passed build, lint and smoke.
 *
 * The rules it must hold, all of which are one careless edit away:
 *
 *   1  ONE bar, five tabs, same five signed in or out. Two vocabularies
 *      for one app is the bug that was reported.
 *   2  It is on the landing. An app whose navigation appears only after
 *      sign-in does not look like an app.
 *   3  Signed out, the tabs LEAD somewhere. A bar of dead buttons is
 *      worse than no bar: broken rather than locked.
 *   4  The tap is not lost. Tapping Earnings and signing in should end on
 *      Earnings, which is what ?next= carries.
 *   5  Google is on the first screen, not two taps in.
 *
 * Falsifiable: drop a tab, remove ?next=, or hide the bar behind
 * `profile` again and this fails. Verified by doing exactly that.
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdtempSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist')
const PORT = 4319
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon' }

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('\n  No dist/. Run: VITE_SURFACE=partner npm run build\n'); process.exit(1)
}

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let f = join(DIST, url === '/' ? 'index.html' : url.slice(1))
  if (!existsSync(f) || !extname(f)) f = join(DIST, 'index.html')
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' })
  res.end(readFileSync(f))
}).listen(PORT)

/* Forward slashes: Node accepts them on Windows, and they survive being
   written through a shell heredoc, which backslashes do not. */
const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
const EDGE = CANDIDATES.find(existsSync)
if (!EDGE) { console.error('\n  No browser found.\n'); server.close(); process.exit(1) }

const CDP = 9451
const profile = mkdtempSync(join(tmpdir(), 'sb-nav-'))
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--disable-dev-shm-usage', 'about:blank'], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))
await sleep(2500)

const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
const page = list.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id).res(msg.result); pending.delete(msg.id) }
})
await new Promise(r => ws.addEventListener('open', r))
const send = (m, p = {}) => new Promise(res => { const n = ++id; pending.set(n, { res }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const evalJs = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value

await send('Page.enable')
/* `/` and not `/partner/join`, deliberately.
 *
 * The APK opens the root, and RootScreen redirects a signed-out partner
 * to the landing. Testing the landing directly would prove the landing
 * is right while saying nothing about the screen a partner ACTUALLY sees
 * when the splash finishes -- which is the thing being asked about, and
 * the thing a broken redirect would take away without touching any of
 * the files this check otherwise covers. */
await send('Page.navigate', { url: `http://localhost:${PORT}/` })
await sleep(5000)
await evalJs(`document.querySelectorAll('.brand-aqua').forEach(e => e.style.display='none')`)

const landedOn = await evalJs('location.pathname')

const nav = await evalJs(`(() => {
  const bars = document.querySelectorAll('nav[aria-label="Partner sections"]')
  if (bars.length !== 1) return { bars: bars.length }
  const links = [...bars[0].querySelectorAll('a')]
  return {
    bars: 1,
    labels: links.map(a => a.textContent.trim()),
    hrefs:  links.map(a => a.getAttribute('href')),
    google: !!document.body.innerText.includes('Continue with Google'),
  }
})()`)

const EXPECT = ['Jobs', 'Earnings', 'Listing', 'Calendar', 'Account']
const fails = []

/* Rule 0: the splash hands off to the landing, not to a dead root. */
if (landedOn !== '/partner/join')
  fails.push(`opening / landed on ${landedOn}, expected /partner/join`)

if (nav.bars !== 1) fails.push(`expected exactly 1 tab bar on the landing, found ${nav.bars}`)
else {
  if (JSON.stringify(nav.labels) !== JSON.stringify(EXPECT))
    fails.push(`tabs are ${JSON.stringify(nav.labels)}, expected ${JSON.stringify(EXPECT)}`)

  // Rule 3 and 4: every tab but Jobs must reach sign-in AND carry the tap.
  nav.hrefs.forEach((h, i) => {
    const label = nav.labels[i]
    if (label === 'Jobs') return
    if (!h || h === '#') fails.push(`${label} tab leads nowhere (href ${h})`)
    else if (!h.startsWith('/login')) fails.push(`${label} tab goes to ${h}, expected sign-in`)
    else if (!h.includes('next=')) fails.push(`${label} tab loses the tap: ${h}`)
  })

  if (!nav.google) fails.push('no "Continue with Google" on the landing')
}

browser.kill(); server.close()

console.log(`
  Opening / as a signed-out partner, the way the APK does
`)
console.log(`  landed on          ${landedOn}`)
console.log(`  tab bars           ${nav.bars}`)
if (nav.labels) console.log(`  tabs               ${nav.labels.join(' · ')}`)
if (nav.hrefs) for (const [i, h] of nav.hrefs.entries()) console.log(`    ${nav.labels[i].padEnd(9)} -> ${h}`)
console.log(`  Google on page     ${nav.google ? 'yes' : 'NO'}`)

if (fails.length) { console.error('\n  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n'); process.exit(1) }
console.log('\n  One bar, five tabs, every tap remembered.\n')
