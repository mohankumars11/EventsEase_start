#!/usr/bin/env node
/**
 * Mint a browser session for a real account, for the capture harness.
 *
 *   node scripts/demo-customer.mjs                       (the customer)
 *   node scripts/demo-customer.mjs <email> <out-file>    (anyone)
 *
 * The matching board, the cancel sheet and the paid confirmation are all
 * behind RLS — `booking_lines` is scoped to the caller, so a screenshot
 * of them needs a real session, not a service-role read.
 *
 * A magic link is generated with the admin key and verified immediately,
 * which produces exactly the session the app would have. Written to a
 * gitignored file for the capture script to inject.
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSrc, readEnv, ROOT } from './lib/loadSrc.mjs'

const url = readEnv('VITE_SUPABASE_URL')
const admin = createClient(url, readEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const anon  = createClient(url, readEnv('VITE_SUPABASE_ANON_KEY'),   { auth: { persistSession: false } })

const EMAIL = process.argv[2] ?? 'mohanpes328a@gmail.com'
const FILE  = process.argv[3] ?? '.demo-customer-session.json'

const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
if (error) { console.error('  ' + error.message); process.exit(1) }

// token_hash and type ONLY — passing `email` alongside them is rejected
// by supabase-js with "Only the token_hash and type should be provided".
const { data: sess, error: vErr } = await anon.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: 'email',
})
if (vErr) { console.error('  ' + vErr.message); process.exit(1) }

const out = join(ROOT, FILE)
writeFileSync(out, JSON.stringify(sess.session), 'utf8')
console.log(`  session for ${EMAIL} → ${FILE}`)
