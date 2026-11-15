#!/usr/bin/env node
/**
 * Who may cancel, and who may see what a booking holds (migration 196).
 *
 *   node --env-file=.env scripts/check-cancel-security-live.mjs
 *
 * READ-ONLY: it calls cancel_line only on an id that cannot exist, and
 * cancellation_quote (which moves nothing) on real lines.
 *   1. anon cannot EXECUTE cancellation_quote or cancel_line
 *   2. a signed-in customer gets `not_yours` on somebody else's line
 *   3. the owner still gets a quote, on policy 2026-10-28
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const EMAIL = 'mohanpes328a@gmail.com'
const Z = '00000000-0000-4000-8000-000000000000'
let bad = 0
const say = (ok, m) => { if (!ok) bad++; console.log(`  ${ok ? '✓' : '✗'} ${m}`) }

for (const [f, args] of [['cancellation_quote', { p_line_id: Z }], ['cancel_line', { p_line_id: Z }]]) {
  const r = await anon.rpc(f, args)
  say(!!r.error, `anon ${f} → ${r.error ? `refused (${r.error.code})` : `RAN: ${JSON.stringify(r.data)}`}`)
}

const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
const { data: s } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const me = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } })

const { data: theirs } = await admin.from('booking_lines').select('id, booking_requests!inner(customer_id)').neq('booking_requests.customer_id', s.user.id).limit(1)
if (theirs?.[0]) {
  const r = await me.rpc('cancellation_quote', { p_line_id: theirs[0].id })
  say(r.data?.reason === 'not_yours', `someone else's line → ${JSON.stringify(r.data ?? r.error?.code)}`)
} else console.log('  · no other customer\'s line to try')

const { data: mine } = await admin.from('booking_lines').select('id, booking_requests!inner(customer_id)').eq('booking_requests.customer_id', s.user.id).limit(1)
if (mine?.[0]) {
  const r = await me.rpc('cancellation_quote', { p_line_id: mine[0].id })
  say(r.data?.ok === true && r.data?.policy === '2026-10-28', `own line → ${r.data?.ok ? `quote on policy ${r.data.policy} (${r.data.rung})` : JSON.stringify(r.data ?? r.error)}`)
} else console.log('  · the test account has no line to quote')

console.log(bad ? `\n${bad} FAILED` : '\nall good')
process.exit(bad ? 1 : 0)
