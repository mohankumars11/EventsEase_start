/**
 * Shared plumbing for the two scripts that put photographs into the catalog:
 *
 *   resolve-product-images.mjs   assigns a photo to products already in the
 *                                database (emits UPDATEs).
 *   generate-cake-catalog.mjs    creates new cake products with a photo
 *                                already attached (emits INSERTs).
 *
 * They must agree on one thing above all else, and it is the reason this
 * module exists: DEDUPLICATION. Migration 017 gave every birthday cake the
 * same photograph, and the fix only holds if both generators check against
 * the *same* live set of already-assigned photo ids. Two private copies of
 * `fetchAssignedPhotoIds` would be one edit away from drifting apart.
 *
 * Nothing here writes to the database. Reads go through the public anon key
 * (products are world-readable by RLS); writes happen when a human pastes
 * the generated SQL into the Supabase SQL editor.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/* ── .env, without adding a dependency ──────────────────────────────── */
export function loadEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const value = m[2].replace(/^["'](.*)["']$/, '$1')
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}

/* ── Photo sources ──────────────────────────────────────────────────────
 * Both return an array of candidates so the dedup pass can walk past a
 * photo that is already spoken for. Pexels is the default: 200 requests/
 * hour against Unsplash's 50, and its licence permits commercial use
 * without mandatory attribution (we store credit anyway).
 */
const PER_PAGE = 10

export async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/')

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}`
              + `&per_page=${PER_PAGE}&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) return []

  const data = await res.json()
  return (data.photos ?? []).map(p => ({
    id:     `pexels:${p.id}`,
    // large2x is ~1880px wide — the HD requirement. `large` is 940px and
    // visibly soft on a retina product hero.
    url:    p.src.large2x,
    alt:    p.alt || null,
    credit: `Photo by ${p.photographer} on Pexels`,
  }))
}

export async function searchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY || process.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY is not set.')

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}`
              + `&per_page=${PER_PAGE}&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } })
  if (res.status === 403 || res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) return []

  const data = await res.json()
  return (data.results ?? []).map(p => ({
    id:     `unsplash:${p.id}`,
    url:    `${p.urls.raw}&fm=jpg&w=1600&q=80&fit=max`,
    alt:    p.alt_description || null,
    credit: `Photo by ${p.user.name} on Unsplash`,
  }))
}

// Pacing between searches, so a long run stays under 200 req/hr on Pexels
// and 50 on Unsplash.
export const pacingMs = source => (source === 'unsplash' ? 1200 : 350)
export const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ── Dedup against the live catalog ─────────────────────────────────────
 *
 * The in-run dedup set only knows about the current pass. Pexels caps a free
 * key at 200 requests/hour against a ~500-product catalogue, so the shop can
 * only ever be filled across several runs — and without this, run two happily
 * re-assigns photos run one already used. That is migration 017's bug
 * returning by a side door, which is why it is checked against the live rows
 * rather than against the generated files.
 *
 * Both sources embed the photo id in the URL path:
 *   https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg
 *   https://images.unsplash.com/photo-1664032655802-ef0a6895619a
 */
export function photoIdFromUrl(url) {
  const pexels = url.match(/images\.pexels\.com\/photos\/(\d+)\//)
  if (pexels) return `pexels:${pexels[1]}`
  const unsplash = url.match(/images\.unsplash\.com\/(photo-[A-Za-z0-9_-]+)/)
  if (unsplash) return `unsplash:${unsplash[1]}`
  return null
}

export function supabaseHeaders() {
  const base = process.env.VITE_SUPABASE_URL
  const key  = process.env.VITE_SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env')
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}` } }
}

export async function fetchAssignedPhotoIds() {
  const { base, headers } = supabaseHeaders()
  const res = await fetch(`${base}/rest/v1/products?select=image_url&image_url=not.is.null`, { headers })
  if (!res.ok) return new Set()

  const ids = new Set()
  for (const row of await res.json()) {
    const id = photoIdFromUrl(row.image_url ?? '')
    if (id) ids.add(id)
  }
  return ids
}

/* ── SQL emission ───────────────────────────────────────────────────── */
export const sqlStr = v => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)

// A theme hint already names the product type ("…birthday cake"), and so
// does the category term ("cake dessert food photography"), which produced
// queries like "pink fondant doll birthday cake cake dessert food
// photography". Repeated words don't help the search and make the --dry-run
// output hard to read.
export function dedupeWords(text) {
  const seen = new Set()
  return text
    .split(/\s+/)
    .filter(word => {
      const key = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!key) return true          // punctuation-only tokens pass through
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' ')
}
