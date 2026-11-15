#!/usr/bin/env node
/**
 * Synthetic partners answer their quote requests.
 *
 *   node --env-file=.env scripts/synthetic-partner-replies.mjs            # answer what is open now
 *   node --env-file=.env scripts/synthetic-partner-replies.mjs --watch    # keep answering, every 20 s
 *
 * The seeded partners (scripts/seed-synthetic-marketplace.mjs) have no
 * login, so a customer's offer or quote request to one of them would wait
 * forever. This plays the partner, only for vendors with is_synthetic =
 * true, and writes exactly what api/submit-custom-quote.js writes for a
 * real partner (a SUBMITTED sambramo_quote_responses row, same fee maths)
 * — so the customer side (Plans → Accept & pay) is exercised for real.
 *
 * How it answers, the way a reasonable partner would:
 *   an offer within 12% of their price   → accept it
 *   a lower offer                          → counter halfway
 *   no offer (a quote request)             → quote their engine price
 * Real partners are never touched.
 */
import { createClient } from '@supabase/supabase-js'

const FEE = 0.08
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const round10 = p => Math.round(p / 1000) * 1000

export async function answerOpen({ only = null, log = console.log } = {}) {
  let q = admin.from('sambramo_quote_requests').select('id, vendor_id, service_name, canonical_demand, state, expires_at, vendors!inner(business_name, is_synthetic)')
    .in('state', ['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED']).eq('vendors.is_synthetic', true)
  if (only) q = q.eq('id', only)
  const { data: open, error } = await q
  if (error) throw error
  let n = 0
  for (const r of open ?? []) {
    const { data: had } = await admin.from('sambramo_quote_responses').select('id').eq('quote_request_id', r.id).eq('vendor_id', r.vendor_id).maybeSingle()
    if (had) continue
    const d = r.canonical_demand ?? {}
    const listed = Number(d.listed_paise) || 0
    const offer = Number(d.customer_offer_paise) || 0
    let customer, note
    if (offer && listed && offer >= listed * 0.88) { customer = offer; note = 'Happy to do it at your price. See you on the day!' }
    else if (offer && listed) { customer = round10((offer + listed) / 2); note = `Best we can do is ${'₹' + Math.round(customer / 100).toLocaleString('en-IN')} — that still includes everything in our package.` }
    else if (listed) { customer = listed; note = 'Here is our price for your date and details.' }
    else { const { data: li } = await admin.from('sambramo_quote_line_items').select('quantity, unit_take_home_paise').eq('quote_request_id', r.id)
      const take = (li ?? []).reduce((s, x) => s + (Number(x.quantity) || 1) * (Number(x.unit_take_home_paise) || 0), 0)
      if (!take) continue
      customer = round10(take / (1 - FEE)); note = 'Here is our price for your date and details.' }
    const partner = Math.floor((customer * (1 - FEE)) / 1000) * 1000
    const { error: e } = await admin.from('sambramo_quote_responses').insert({
      quote_request_id: r.id, vendor_id: r.vendor_id, partner_amount_paise: partner, customer_amount_paise: customer,
      platform_fee_rate: FEE, platform_fee_paise: customer - partner, pricing_version: 'sambramo-custom-quote-v2',
      quote_valid_until: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), notes: note, status: 'SUBMITTED',
      partner_components: { synthetic_reply: true }, inclusions: [], exclusions: [],
    })
    if (e) { log(`  ! ${r.vendors.business_name}: ${e.message}`); continue }
    n++
    log(`  ${r.vendors.business_name} → ₹${Math.round(customer / 100).toLocaleString('en-IN')}${offer ? ` (offer ₹${Math.round(offer / 100).toLocaleString('en-IN')})` : ''}`)
  }
  return n
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('synthetic-partner-replies.mjs')) {
  const watch = process.argv.includes('--watch')
  do {
    const n = await answerOpen()
    console.log(`${new Date().toLocaleTimeString('en-IN')} answered ${n}`)
    if (watch) await new Promise(r => setTimeout(r, 20000))
  } while (watch)
}
