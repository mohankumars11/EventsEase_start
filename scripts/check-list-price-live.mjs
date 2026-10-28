#!/usr/bin/env node
/**
 * Does the booking engine, through the API, quote the Sambramo price?
 *
 *   node --env-file=.env scripts/check-list-price-live.mjs [apiOrigin]
 *   (default apiOrigin http://127.0.0.1:4000 — scripts/serve-api-local.mjs)
 *
 * For a few trades it takes live listings (anon, as the app does), asks
 * /api/anchor?op=book for a PREVIEW (writes nothing) and checks that:
 *   customer_paise  = toList(base_paise, trade)   the Sambramo price
 *   base_paise      present                       the floor offers respect
 *   take_home_paise absent                        the partner's take-home is not the customer's
 *   advance_paise   ≤ customer_paise
 */
import { createClient } from '@supabase/supabase-js'
import { toList, marginPct } from '../api/_lib/listPrice.js'

const API = (process.argv[2] ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const TRADES = [['photography', 'Photography'], ['decoration_floral', 'Decoration & Floral'], ['dj_music', 'DJ & Music'], ['videography', 'Videography']]
const day = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10)
let ok = 0, bad = 0, tried = 0

for (const [slug, name] of TRADES) {
  const { data: rows, error } = await db.rpc('public_listings', { p_trade: name, p_lat: 12.9716, p_lng: 77.5946, p_limit: 6 })
  if (error) { console.log(`  ${slug}: listings error ${error.message}`); continue }
  for (const r of rows ?? []) {
    const { data: v } = await db.from('sambramo_listing_versions').select('id').eq('vendor_service_id', r.vendor_service_id).eq('status', 'LIVE').maybeSingle()
    const { data: pk } = v ? await db.from('sambramo_trade_packages').select('commercial_inputs, trade_inputs').eq('listing_version_id', v.id).eq('status', 'LIVE').limit(1) : { data: [] }
    const p = pk?.[0]
    const request = { event_date: day, start_time: '17:00', lat: 12.9716, lng: 77.5946, guests: 80, hours: Number(p?.trade_inputs?.duration_hours) || 4,
      ...(p?.commercial_inputs?.tier ? { package: p.commercial_inputs.tier } : {}) }
    const res = await fetch(`${API}/api/anchor?op=book`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vendorServiceId: r.vendor_service_id, request, preview: true }) })
    const q = await res.json().catch(() => null)
    if (!q || q.path !== 'INSTANT') continue
    tried++
    const want = toList(q.base_paise, slug)
    const fine = q.base_paise > 0 && q.customer_paise === want && !('take_home_paise' in q) && (!q.advance_paise || q.advance_paise <= q.customer_paise)
    fine ? ok++ : bad++
    console.log(`  ${fine ? '✓' : '✗'} ${slug.padEnd(18)} partner ₹${Math.round(q.base_paise / 100).toLocaleString('en-IN').padStart(7)} → Sambramo ₹${Math.round(q.customer_paise / 100).toLocaleString('en-IN').padStart(7)} (+${Math.round(marginPct(slug) * 100)}%)${q.advance_paise ? ` · advance ₹${Math.round(q.advance_paise / 100).toLocaleString('en-IN')}` : ''}${fine ? '' : ` · expected ₹${want / 100}, take_home ${'take_home_paise' in q}`}`)
    break
  }
}
console.log(`\n${ok} priced correctly, ${bad} wrong, ${tried} instant previews`)
process.exit(bad || !tried ? 1 : 0)
