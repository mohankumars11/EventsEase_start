#!/usr/bin/env node
/**
 * The Menu Studio's quote lifecycle through the REAL API handlers (called
 * in-process — no server, no browser) against the live database:
 *
 *   1. the test customer sends a Sambramo menu as a quote request
 *      (api/anchor?op=book, quote:true, menu) → canonical_demand.menu
 *   2. the test partner prices it WITH a change
 *      (api/submit-custom-quote, lines + menuReply)
 *   3. the customer tries to accept without approving → refused (409)
 *   4. --accept: the customer approves the change and accepts → booked
 *
 *   node --env-file=.env scripts/e2e-menu-quote.mjs [--accept]
 *
 * Writes real test rows: customer mohanpes328a@gmail.com → partner Eagle
 * Photography (sambramo.partner1.test@gmail.com, the lifecycle test
 * account). The menu rides on Eagle's own service because the synthetic
 * caterers have no logins; the menu path does not depend on the trade.
 * Prints the request id so a screenshot fixture can point at it.
 */
import { createClient } from '@supabase/supabase-js'
import book from '../api/_lib/anchorBook.js'
import submit from '../api/submit-custom-quote.js'
import accept from '../api/accept-custom-quote.js'

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const VENDOR = 'b54f1a5a-a8ab-44d2-900a-2fddc12bc408'
let pass = 0, fail = 0
const ok = (c, l) => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l) } }

async function token(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error) throw v.error
  return v.data.session.access_token
}
/* Call a Vercel-style handler in-process and return { status, body }. */
async function run(handler, body, tok, query = {}) {
  let status = 200, out = null
  const res = { setHeader() {}, status(s) { status = s; return this }, json(j) { out = j; return this }, end() { return this }, send(j) { out = j; return this } }
  await handler({ method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json', origin: 'http://localhost' }, body, query }, res)
  return { status, body: out }
}

const customer = await token('mohanpes328a@gmail.com')
const partner = await token('sambramo.partner1.test@gmail.com')
const { data: svc } = await admin.from('vendor_services').select('id, name').eq('vendor_id', VENDOR).limit(1).maybeSingle()
ok(!!svc, `partner service ${svc?.name}`)
const date = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10)
const menu = {
  templateId: 'ka-traditional-veg-feast', name: 'Traditional Karnataka Vegetarian Feast', cuisine: 'Karnataka', diet: 'veg', meal: 'lunch', serve: 'Banana leaf', guests: 120,
  allergies: 'no peanuts', instructions: 'Less spicy for the children', refs: [], flags: ['Chitranna: Usually contains peanut — you said to avoid it'],
  sections: [
    { id: 'welcome', name: 'Welcome Drinks', dishes: [{ id: 'SBM-MS-panaka', n: 'Panaka', d: 'veg' }] },
    { id: 'mains', name: 'Main Course', dishes: [{ id: 'x1', n: 'Bisi Bele Bath', d: 'veg' }, { id: 'x2', n: 'Chitranna', d: 'veg' }] },
    { id: 'desserts', name: 'Desserts & Sweets', dishes: [{ id: 'x3', n: 'Obbattu', d: 'veg' }, { id: null, n: 'Ellu Bella', d: null, c: 'typed' }] },
  ],
}

console.log('1 · customer sends the menu')
const sent = await run(book, {
  vendorServiceId: svc.id, quote: true, quoteGroup: crypto.randomUUID(), menu,
  request: { event_date: date, start_time: '12:00', lat: 12.9352, lng: 77.6245, guests: 120, hours: 4 },
  note: 'Menu: Traditional Karnataka Vegetarian Feast', venue: { address: 'Koramangala, Bengaluru', area: 'Koramangala', city: 'Bengaluru' },
}, customer, { op: 'book' })
const rid = sent.body?.quoteRequestId
ok(sent.status === 200 && rid, `quote request ${rid ?? JSON.stringify(sent.body).slice(0, 200)}`)
const { data: qr } = await admin.from('sambramo_quote_requests').select('canonical_demand, state').eq('id', rid).maybeSingle()
ok(qr?.canonical_demand?.menu?.sections?.length === 3 && qr.canonical_demand.menu.allergies === 'no peanuts', 'the structured menu is on the request')

console.log('2 · partner prices it, with a change')
const q = await run(submit, {
  quoteRequestId: rid, notes: 'Banana leaf and steel tumblers included',
  lines: [
    { description: 'Food — Traditional Karnataka Vegetarian Feast (per plate)', quantity: 120, unit: 'plate', unit_take_home_paise: 32000 },
    { description: 'Serving staff', quantity: 1, unit: 'item', unit_take_home_paise: 0, charged: false },
    { description: 'Transport', quantity: 1, unit: 'item', unit_take_home_paise: 150000 },
  ],
  menuReply: { perPlatePaise: 32000, minGuests: 100, validDays: 3, changes: [{ action: 'swap', section_id: 'mains', from_dish_id: 'x2', from_name: 'Chitranna', to_name: 'Vangi Bath', note: 'No peanuts' }] },
}, partner)
ok(q.status === 200 && q.body?.responseId, `quote sent ${q.status} ${q.body?.error ?? ''}`)
const { data: resp } = await admin.from('sambramo_quote_responses').select('id, partner_amount_paise, partner_components, quote_valid_until').eq('quote_request_id', rid).maybeSingle()
ok(resp?.partner_amount_paise === 120 * 32000 + 150000, `partner total computed from lines: ₹${resp?.partner_amount_paise / 100}`)
ok(resp?.partner_components?.menu?.kind === 'with_changes' && resp.partner_components.menu.changes[0].to_name === 'Vangi Bath', 'the change is recorded')
const days = (new Date(resp.quote_valid_until) - Date.now()) / 86400000
ok(days > 2.9 && days < 3.1, `holds for the 3 days the partner chose (${days.toFixed(2)})`)

console.log('3 · customer cannot accept a changed menu without approving it')
const blind = await run(accept, { quoteResponseId: resp.id }, customer)
ok(blind.status === 409 && blind.body?.needsApproval === true, `refused: ${blind.body?.error}`)

if (process.argv.includes('--accept')) {
  console.log('4 · customer approves and accepts')
  const yes = await run(accept, { quoteResponseId: resp.id, approveChanges: true }, customer)
  ok(yes.status === 200, `accepted ${yes.status} ${yes.body?.error ?? ''}`)
}
console.log(`\n${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail} · request ${rid}`)
process.exit(fail ? 1 : 0)
