#!/usr/bin/env node
/**
 * Open the real Razorpay sheet and photograph it.
 *
 *   node --env-file=.env scripts/see-checkout.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY
 * ══════════════════════════════════════════════════════════════════════
 *
 * "UPI is not showing" has now been diagnosed twice from the outside and
 * fixed twice without ever being looked at. The first fix was a display
 * config the account could not fill; the second was a capability probe
 * the browser was not allowed to make. Both were reasoned, both shipped,
 * neither changed the screen.
 *
 * Everything about this is observable — a real order, the real
 * checkout.js, the real options object — so it should be observed.
 *
 * This makes a genuine order through the deployed API, constructs the
 * sheet with EXACTLY the options src/lib/razorpayCheckout.js builds, and
 * saves a picture. Whatever is on that picture is the answer.
 *
 * The sheet renders in a cross-origin iframe, so its text cannot be read
 * from the page. The screenshot is the readout, deliberately.
 *
 * Nothing is ever paid: the sheet is photographed and the process is
 * killed. The order expires on Razorpay's side.
 */
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, existsSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT, readEnv } from './lib/loadSrc.mjs'

const API = process.env.SEE_API ?? 'https://sambramoh.vercel.app'
const OUT = join(ROOT, 'docs', 'test-report')
mkdirSync(OUT, { recursive: true })

const url = readEnv('VITE_SUPABASE_URL')
const anonKey = readEnv('VITE_SUPABASE_ANON_KEY')
const admin = createClient(url, readEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })

const session = async email => {
  const { data: l, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`${email}: ${error.message}`)
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ token_hash: l.properties.hashed_token, type: 'email' })
  if (e2) throw new Error(`${email}: ${e2.message}`)
  return s.session
}

console.log('\n  Building a real order…\n')

const cust = await session('sambramo.customer.test@gmail.com')

const disp = await fetch(`${API}/api/dispatch-booking`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    customerId: cust.user.id, occasionId: 'birthday', occasionName: 'Checkout probe',
    eventDate: new Date(Date.now() + 86400000 * 29).toISOString().slice(0, 10),
    guestCount: 30, radiusKm: 60, lat: 12.9352, lng: 77.6245,
    addressText: 'Koramangala', areaLabel: 'Koramangala', city: 'Bengaluru',
    lines: [{ serviceId: 'photography', durationId: 'photo_half_day', options: {}, note: null }],
  }),
}).then(r => r.json())

const lineId = disp.lines?.[0]?.lineId
if (!lineId) { console.error('  dispatch failed: ' + JSON.stringify(disp).slice(0, 200)); process.exit(1) }

/* Whichever real partner was actually offered this line.
   Pinning one vendor breaks whenever they already hold a job on the
   date -- match_partners excludes them, and the script then dies on a
   null offer for no reason worth debugging. */
const REAL = {
  "16ddc83e-a01d-42e6-9407-9f19e73ecaed": "sambramo.partner.test@gmail.com",
  "7c2141c2-a8e6-49cf-bdeb-44c0f09653d4": "mohanias2022@gmail.com",
  "ebbb8f56-fb69-4a29-a13e-213cc907334a": "sambramo.partner1.test@gmail.com",
}
const { data: offers } = await admin.from("dispatch_offers")
  .select("id, vendor_id").eq("line_id", lineId).eq("status", "OFFERED")
const offer = (offers ?? []).find(o => REAL[o.vendor_id])
if (!offer) {
  console.error("  no real partner was offered this line: " + JSON.stringify(offers))
  process.exit(1)
}
const part = await session(REAL[offer.vendor_id])
const asPartner = createClient(url, anonKey, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${part.access_token}` } },
})
const { error: ae } = await asPartner.rpc('accept_offer', { p_offer_id: offer.id })
if (ae) { console.error('  accept failed: ' + ae.message); process.exit(1) }

const order = await fetch(`${API}/api/create-booking-payment`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ customerId: cust.user.id, lineIds: [lineId] }),
}).then(r => r.json())

// The customer's own profile, because prefill comes from it in the app.
const { data: me } = await admin.from('profiles')
  .select('full_name, email, phone').eq('id', cust.user.id).maybeSingle()

console.log(`    order       ${order.orderId}`)
console.log(`    amount      ₹${(order.amountPaise / 100).toLocaleString('en-IN')}`)
console.log(`    keyId       ${String(order.keyId).slice(0, 12)}…  (${String(order.keyId).startsWith('rzp_live') ? 'LIVE' : 'TEST'})`)
console.log(`    upiEnabled  ${JSON.stringify(order.upiEnabled)}`)
console.log(`    prefill     name=${JSON.stringify(me?.full_name)} phone=${JSON.stringify(me?.phone)} email=${JSON.stringify(me?.email)}`)

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
if (!EDGE) { console.error('\n  No browser found.\n'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'sb-sheet-'))
const CDP = 9439

/* A phone, not a desktop. Razorpay renders a different sheet on each,
   and UPI intent only makes sense on a handset -- so a desktop capture
   would answer a question nobody asked. */
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
const evalJs = e => send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })

try {
  let wsUrl
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
      wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* waiting */ }
    if (!wsUrl) await sleep(250)
  }
  if (!wsUrl) {
    console.error("  the browser never exposed a debugging port")
    process.exit(1)
  }
  ws = new WebSocket(wsUrl)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result)
  }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' })
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true })

  // The production origin, so the sheet sees the referrer it will really see.
  await send('Page.navigate', { url: `${API}/` })
  await sleep(3000)

  const opts = {
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: 'INR',
    name: 'Sambramo',
    description: 'Test payment · ₹1',
    theme: { color: '#0E8C86', backdrop_color: '#0F3D4C' },
    prefill: {
      name: me?.full_name || undefined,
      email: me?.email || undefined,
      // A real ten-digit number when the profile has none, so the sheet
      // skips its contact screen and shows the METHODS, which is the
      // thing being investigated. SEE_CONTACT overrides it.
      /* Razorpay rejects obviously-fake numbers in LIVE mode --
         +919876543210 comes back "Please enter a valid mobile number" --
         so pass a real one with SEE_CONTACT to reach the methods list. */
      contact: process.env.SEE_CONTACT || me?.phone || undefined,
    },
    retry: { enabled: true, max_count: 3 },
    remember_customer: true,
    ...(order.upiEnabled === true ? {
      config: {
        display: {
          blocks: { upi: { name: 'Pay by UPI', instruments: [{ method: 'upi' }] } },
          sequence: ['block.upi'],
          preferences: { show_default_blocks: true },
        },
      },
    } : {}),
  }

  const loaded = await evalJs(`(async () => {
    if (!window.Razorpay) {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://checkout.razorpay.com/v1/checkout.js'
        s.onload = res; s.onerror = () => rej(new Error('sdk'))
        document.head.appendChild(s)
      })
    }
    return !!window.Razorpay
  })()`)
  console.log(`\n    checkout.js loaded: ${loaded.result?.value}`)

  const opened = await evalJs(`(() => {
    try {
      window.__rzp = new window.Razorpay(${JSON.stringify(opts)})
      window.__rzp.open()
      return 'opened'
    } catch (e) { return 'ERROR ' + (e && e.message || e) }
  })()`)
  console.log(`    open(): ${opened.result?.value}`)

  await sleep(7000)

  /* Razorpay silently drops a prefill contact it does not like and holds
     on its own Contact details screen. The sheet is a cross-origin iframe,
     so it cannot be scripted -- but it can be TYPED INTO, the same way a
     thumb does, through CDP input events at page level. */
  const tap = async (x, y) => {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 })
    }
    await sleep(500)
  }

  await tap(206, 593)                                  // the mobile field
  /* One key event per digit. Input.insertText does not cross into a
     cross-origin iframe -- the field focused and stayed empty, and the
     sheet answered "Please enter your mobile number". Raw key events do
     cross, because they are delivered to the focused element by the
     browser rather than by script. */
  for (const ch of (process.env.SEE_CONTACT || "9876543210")) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch })
    await send("Input.dispatchKeyEvent", { type: "keyUp", text: ch, unmodifiedText: ch })
    await sleep(90)
  }
  await sleep(900)
  await tap(206, 836)                                  // Continue
  console.log("    typed a number and continued")
  await sleep(9000)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const data = shot?.data ?? shot?.result?.data
  if (data) {
    const out = join(OUT, 'razorpay-sheet.png')
    writeFileSync(out, Buffer.from(data, 'base64'))
    console.log(`\n    -> docs/test-report/razorpay-sheet.png\n`)
  } else {
    console.log('\n    no screenshot came back\n')
  }
} finally {
  try { ws?.close() } catch { /* gone */ }
  browser.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* held */ }
  // The booking was only ever scaffolding for the sheet.
  await admin.from('booking_lines').delete().eq('id', lineId)
  await admin.from('booking_requests').delete().eq('id', disp.requestId)
}
