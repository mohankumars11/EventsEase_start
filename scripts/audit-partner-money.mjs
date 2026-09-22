#!/usr/bin/env node
/**
 * Read-only. Which partner accounts have work that money has moved on.
 *
 * The purge stalls on booking_lines_accepted_has_offer: deleting a
 * partner deletes their dispatch_offers, the FK nulls
 * booking_lines.accepted_offer_id, and a line at 'paid' with no offer
 * behind it is exactly what migration 059 forbids -- money held for a
 * partner nobody can name.
 *
 * This says how big that is before anything is decided.
 *
 *   node scripts/audit-partner-money.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const LOCKED = ['accepted', 'paid', 'in_progress', 'delivered', 'settled']

async function main() {
  const { data: vendors, error: vE } = await db
    .from('vendors').select('id, business_name, profile_id').not('profile_id', 'is', null)
  if (vE) { console.error('  vendors:', vE.message); return 1 }
  const vendorById = new Map(vendors.map(v => [v.id, v]))

  const { data: lines, error: lE } = await db
    .from('booking_lines')
    .select('id, status, trade, quoted_amount_paise, partner_amount_paise, accepted_offer_id, accepted_at')
    .in('status', LOCKED)
  if (lE) { console.error('  booking_lines:', lE.message); return 1 }

  if (!lines.length) { console.log('\n  No booking lines past accepted.\n'); return 0 }

  /* The line does not carry vendor_id -- the accepted offer does. */
  const offerIds = lines.map(l => l.accepted_offer_id).filter(Boolean)
  const { data: offers, error: oE } = await db
    .from('dispatch_offers').select('id, vendor_id').in('id', offerIds)
  if (oE) { console.error('  dispatch_offers:', oE.message); return 1 }
  const vendorByOffer = new Map((offers || []).map(o => [o.id, o.vendor_id]))

  console.log(`\n  ${lines.length} booking line(s) at or past 'accepted':\n`)
  const perVendor = new Map()
  for (const l of lines) {
    const vid = vendorByOffer.get(l.accepted_offer_id)
    const v   = vendorById.get(vid)
    const key = v ? `${v.business_name} (${vid})` : `not a live partner (${vid || 'no offer'})`
    if (!perVendor.has(key)) perVendor.set(key, [])
    perVendor.get(key).push(l)
  }
  for (const [k, ls] of perVendor) {
    const total = ls.reduce((s, l) => s + (l.quoted_amount_paise || 0), 0)
    console.log(`    ${k}`)
    for (const l of ls) {
      console.log(`        ${l.status.padEnd(12)} ${l.trade || ''}  ${l.quoted_amount_paise} paise  partner ${l.partner_amount_paise}`)
    }
    console.log(`        subtotal ${total}\n`)
  }

  const { data: led, error: eE } = await db
    .from('escrow_ledger').select('id, amount_paise, kind, created_at')
  if (!eE) console.log(`  escrow_ledger: ${(led || []).length} row(s)`)
  else console.log(`  escrow_ledger: ${eE.message}`)

  console.log('')
  return 0
}

process.exitCode = await main()
