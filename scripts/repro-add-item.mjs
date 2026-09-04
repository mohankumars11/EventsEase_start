/**
 * Walk the add-item flow and catch what it throws.
 *
 * Reported as "it is going to try again page" -- the error boundary. A
 * screenshot of that tells you nothing; the console message tells you
 * everything, so this listens to Runtime.exceptionThrown and console
 * errors while clicking the same buttons a partner clicks.
 *
 *   node scripts/repro-add-item.mjs            (expects dist/)
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, mkdtempSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist')
const PORT = 4347
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon' }

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('\n  dist/ is missing.\n'); process.exit(1)
}

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let p = join(DIST, url)
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(PORT)

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
              'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const profile = mkdtempSync(join(tmpdir(), 'sb-repro-'))
const CDP = 9471
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--disable-dev-shm-usage', 'about:blank'], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))
await sleep(2500)

const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const problems = []

ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params?.exceptionDetails
    problems.push('THROWN  ' + (d?.exception?.description ?? d?.text ?? '?').split('\n').slice(0, 3).join(' | '))
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') {
    problems.push('CONSOLE ' + (m.params.args ?? []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 220))
  }
})
await new Promise(r => ws.addEventListener('open', r))
const send = (m, p = {}) => new Promise(res => { const n = ++id; pending.set(n, { res }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value

await send('Runtime.enable')
await send('Page.enable')

/* A real session, so the dashboard renders at all. */
const sess = JSON.parse(readFileSync(join(ROOT, '.demo-partner-session.json'), 'utf8'))
const env = readFileSync(join(ROOT, '.env'), 'utf8')
const raw = env.match(/^VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]*)/m)?.[1] ?? ''
const ref = String(raw).trim().replace(/^https:\/\//, '').split('.')[0]

await send('Page.navigate', { url: `http://localhost:${PORT}/` })
await sleep(1200)
await ev(`localStorage.setItem('sb-${ref}-auth-token', ${JSON.stringify(JSON.stringify(sess))})`)
await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/vendor?tab=list` })
await sleep(6000)
await ev(`document.querySelectorAll('.brand-aqua').forEach(e => e.style.display='none')`)

const click = text => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>!x.disabled&&x.textContent.includes(${JSON.stringify(text)}));if(!b)return 'NOT FOUND: ${text.replace(/'/g, '')}';b.click();return 'clicked'})()`)
const broken = () => ev(`document.body.innerText.includes('Something went wrong') || document.body.innerText.includes('Try again')`)
/* The MODAL's header, not the page's. The first version read
   document.querySelector('header'), which finds the dashboard's, so
   every step printed "What you offer" and told me nothing about
   which screen the flow was actually on. */
const heading = () => ev(`(() => {
  const m = document.querySelector('.fixed.inset-0 header')
  return ((m ?? document.querySelector('header'))?.innerText ?? '?').split('\n')[0]
})()`)

async function step(label, text) {
  const r = await click(text)
  await sleep(1100)
  const bad = await broken()
  console.log(`  ${bad ? '✗' : '·'} ${label.padEnd(30)} ${r}   [${await heading()}]`)
  if (bad) { console.log('    ERROR BOUNDARY'); return false }
  return true
}

console.log('')
console.log('  The exact path reported')
console.log('')

async function fresh() {
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/vendor?tab=list` })
  await sleep(4500)
  await ev(`document.querySelectorAll('.brand-aqua').forEach(e => e.style.display='none')`)
}

{
  console.log('  -- Catering, North Indian festive')
  await fresh()
  await step('open', 'Add what you do')
  await step('trade', 'Catering & Food')
  await step('offering', 'Catering')
  await step('continue', 'Continue')
  await step('diet veg', 'Vegetarian only')
  await step('cuisine', 'North Indian festive')
  await step('continue 1', 'Continue')
  await step('continue 2', 'Continue')
  await step('continue 3', 'Continue')
  console.log('')
}

for (const off of ['Welcome drinks', 'Customised menu']) {
  console.log(`  -- ${off}`)
  await fresh()
  await step('open', 'Add what you do')
  await step('trade', 'Catering & Food')
  await step('offering', off)
  await step('continue 1', 'Continue')
  await step('continue 2', 'Continue')
  await step('continue 3', 'Continue')
  console.log('')
}

console.log('')
console.log('  Walking every catering offering')
console.log('')

/* Each offering, one at a time, because the report is that picking any of
   them lands on the same screen -- or on the error boundary. */
const OFFERINGS = ['Cook at your place', 'Welcome drinks', 'Sweets & mithai',
                   'Live food counters', 'Customised menu']

for (const off of OFFERINGS) {
  console.log(`  ── ${off}`)
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/vendor?tab=list` })
  await sleep(4500)
  await ev(`document.querySelectorAll('.brand-aqua').forEach(e => e.style.display='none')`)
  if (!await step('open', 'Add what you do')) break
  if (!await step('trade', 'Catering & Food')) break
  if (!await step('offering', off)) break
  if (!await step('continue', 'Continue')) break
  if (!await step('continue', 'Continue')) break
  if (!await step('continue', 'Continue')) break
  if (!await step('continue', 'Continue')) break
  console.log('')
}

browser.kill(); server.close()

console.log(`\n  ${problems.length} console problems\n`)
for (const p of [...new Set(problems)].slice(0, 12)) console.log('   ' + p)
console.log('')
