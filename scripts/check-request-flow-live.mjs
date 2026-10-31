#!/usr/bin/env node
/**
 * Is migration 197 (request → accept → pay) live, and is it shut to the
 * people it should be shut to?
 *
 *   node --env-file=.env scripts/check-request-flow-live.mjs
 *
 * READ-ONLY. request_partner_line is called with a booking request id
 * that cannot exist, so it answers `no_request` before writing anything.
 *   1. request_partner_line exists, and only the server may call it
 *   2. the queue table (it holds each master's take-home) is unreadable
 *      to a signed-in customer
 *   3. a customer can read their own queue (empty for a line not theirs)
 *      and nudge the sweep; anon can do neither
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const EMAIL = 'mohanpes328a@gmail.com'
const Z = '00000000-0000-4000-8000-000000000000'
let bad = 0
const say = (ok, m) => { if (!ok) bad++; console.log(`  ${ok ? '✓' : '✗'} ${m}`) }

const line = { request_id: Z, service_id: Z, service_name: 'check', trade: 'check', quoted_amount_paise: 100, platform_fee_rate: 0, platform_fee_paise: 0, partner_amount_paise: 100 }
const srv = await admin.rpc('request_partner_line', { p_line: line, p_vendor_id: Z, p_partner_paise: 100, p_backups: [], p_spec_mode: 'standard' })
say(srv.data?.reason === 'no_request', `server: request_partner_line → ${srv.error ? `ERROR ${srv.error.code} ${srv.error.message}` : JSON.stringify(srv.data)}`)

const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
const { data: s } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const me = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } })

const cust = await me.rpc('request_partner_line', { p_line: line, p_vendor_id: Z, p_partner_paise: 100, p_backups: [], p_spec_mode: 'standard' })
say(!!cust.error, `customer cannot call request_partner_line → ${cust.error ? `refused (${cust.error.code})` : 'RAN'}`)
const q = await me.from('sambramo_request_queue').select('id, partner_amount_paise').limit(1)
say(!q.error && (q.data ?? []).length === 0, `customer reads the queue table → ${q.error ? q.error.code : `${q.data.length} rows`}`)
const mine = await me.rpc('my_request_queue', { p_line_id: Z })
say(!mine.error && Array.isArray(mine.data) && mine.data.length === 0, `my_request_queue(not mine) → ${mine.error ? mine.error.code : JSON.stringify(mine.data)}`)
const sweep = await me.rpc('sweep_request_timeouts')
say(!sweep.error && Number.isInteger(sweep.data), `customer nudges the sweep → ${sweep.error ? sweep.error.code : sweep.data}`)
const offers = await me.rpc('my_request_offers')
say(!offers.error && Array.isArray(offers.data), `my_request_offers → ${offers.error ? offers.error.code : `${offers.data.length} offers`}`)
for (const f of ['sweep_request_timeouts', 'my_request_offers']) {
  const r = await anon.rpc(f)
  say(!!r.error, `anon ${f} → ${r.error ? `refused (${r.error.code})` : 'RAN'}`)
}

console.log(bad ? `\n${bad} FAILED${srv.error?.code === 'PGRST202' ? ' — 197 is not pasted yet' : ''}` : '\nall good — 197 is live')
process.exit(bad ? 1 : 0)
