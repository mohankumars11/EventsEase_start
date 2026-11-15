#!/usr/bin/env node
/**
 * Give every synthetic baker's cakes their OWN photograph (Mohan,
 * 2026-11-15: "the bakers' list shows each baker's cover photo, not a
 * photo of each cake"). Real bakers upload at least one photo per product
 * when they onboard (data/trades/cake_desserts.js, photos min 1); the
 * synthetic ones were seeded without, so the board had nothing to show.
 *
 *   node --env-file=.env scripts/synthetic-product-photos.mjs [--dry-run] [trade_id …]
 *
 * For each ACTIVE catalogue item of a synthetic vendor (is_synthetic and
 * the seeder's TAG) whose media is empty, it searches Pexels for the
 * product's own name ("Red velvet with cream cheese cake") and writes the
 * best photo as the item's media, with the photographer's credit. Real
 * partners are never touched; items that already have media are skipped,
 * so it is safe to run twice. Searches are cached beside the seeder's
 * photo pool.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TAG = 'synthetic-marketplace-2026-10-22'
const CACHE = resolve('scripts/data/synthetic-product-photos.json')
const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const trades = args.filter(a => !a.startsWith('--'))
const TRADES = trades.length ? trades : ['cake_desserts']
const NOUN = { cake_desserts: 'cake', gifts_favours: 'gift', restaurant: 'dish' }

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const key = process.env.PEXELS_API_KEY
if (!key) { console.error('PEXELS_API_KEY is not set'); process.exit(1) }
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

async function photosFor(query) {
  if (cache[query]) return cache[query]
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8`, { headers: { Authorization: key } })
  if (!r.ok) { console.log(`  pexels ${r.status} for "${query}"`); return [] }
  const out = ((await r.json()).photos ?? []).map(p => ({ url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=900&h=900`, alt: p.alt || query, credit: `Photo by ${p.photographer} on Pexels` }))
  cache[query] = out
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
  return out
}

const { data: vendors, error: ve } = await admin.from('vendors').select('id').eq('is_synthetic', true).eq('verification_note', TAG)
if (ve) throw ve
const vids = vendors.map(v => v.id)
let wrote = 0, skipped = 0
for (const trade of TRADES) {
  const { data: services } = await admin.from('vendor_services').select('id').in('vendor_id', vids)
  const { data: versions } = await admin.from('sambramo_listing_versions').select('id').eq('status', 'LIVE').eq('trade_id', trade).in('vendor_service_id', (services ?? []).map(s => s.id))
  const { data: items, error } = await admin.from('sambramo_catalogue_items').select('id, listing_version_id, item_key, name, media').eq('active', true).in('listing_version_id', (versions ?? []).map(v => v.id))
  if (error) throw error
  console.log(`${trade}: ${versions?.length ?? 0} live synthetic listings, ${items.length} products`)
  /* The same product name across bakers gets a different photo each time. */
  const used = {}
  for (const it of items) {
    if (Array.isArray(it.media) && it.media.length) { skipped++; continue }
    const q = /cake|cupcake|brownie|cookie|tart|macaron|donut|muffin|pastr|mithai|sweet|jar/i.test(it.name) ? it.name : `${it.name} ${NOUN[trade] ?? ''}`.trim()
    const list = await photosFor(q)
    if (!list.length) { console.log(`  no photo for "${q}"`); continue }
    const k = (used[q] = (used[q] ?? -1) + 1)
    const ph = list[k % list.length]
    if (DRY) { console.log(`  would set ${it.item_key} "${it.name}" → ${ph.url.slice(0, 70)}…`); continue }
    const { error: ue } = await admin.from('sambramo_catalogue_items').update({ media: [{ url: ph.url, alt: ph.alt, credit: ph.credit, kind: 'product' }] }).eq('id', it.id)
    if (ue) { console.log(`  failed ${it.id}: ${ue.message}`); continue }
    wrote++
  }
}
console.log(DRY ? 'dry run: nothing written' : `wrote ${wrote} product photos, skipped ${skipped} that already had one`)
