import { supabase } from './supabase'
import { prepareImage, extFor } from './productImages'

/**
 * Everything the Product Studio reads and writes.
 *
 * ── What this module is for ──────────────────────────────────────────────
 * The person who runs this shop does not write code, has no intention of
 * opening a SQL editor, and is the only one who knows what the products
 * actually are. So every field that decides what a customer sees — the
 * shelves, the photographs, the clips, the story, the questions, the prices,
 * the launch rating — has to be reachable from a form. This module is the
 * layer under those forms.
 *
 * ── Two rules it never breaks ────────────────────────────────────────────
 *
 * 1. A missing migration is a FEATURE THAT IS OFF, not an error. Migrations
 *    here are applied by hand and a deploy does not run them, so every read
 *    below returns an empty set when its table is missing (42P01) and every
 *    product write retries without the new columns when they are missing
 *    (42703). The storefront then renders exactly as it does today. This is
 *    the same shape `celebrationReviews.js` uses for migration 050.
 *
 * 2. Provenance is never lost. A generated clip, a stock lookalike and a real
 *    photograph are all legitimate things to put on a product page, and they
 *    are not the same claim. `source` travels with every piece of media from
 *    the upload button to the badge the customer reads.
 */

const MISSING_TABLE  = '42P01'
const MISSING_COLUMN = '42703'
const MEDIA_BUCKET   = 'product-media'
const IMAGE_BUCKET   = 'product-images'

/**
 * True when the failure is "migration 051 has not been applied yet".
 *
 * The Postgres codes are only half the answer. PostgREST resolves table names
 * against its own schema cache and never reaches Postgres when the name is
 * unknown — so a missing table comes back as `PGRST205` with "Could not find
 * the table 'public.x' in the schema cache", and a missing view or function as
 * `PGRST202`. Checking only for 42P01 therefore misses the single most common
 * case, which is exactly what happened the first time this screen was rendered
 * against a database without 051: one un-caught error rejected the whole load
 * and the studio showed zero products next to a Postgres error string.
 */
export function isNotInstalled(err) {
  if (!err) return false
  if (err.code === MISSING_TABLE || err.code === MISSING_COLUMN) return true
  if (err.code === 'PGRST205' || err.code === 'PGRST202') return true
  return /could not find the (table|view|function|column)/i.test(err.message ?? '')
}

/** Read helper: an absent table yields an empty list rather than a crash. */
async function softSelect(build) {
  try {
    const { data, error } = await build()
    if (error) throw error
    return { rows: data ?? [], installed: true }
  } catch (err) {
    if (isNotInstalled(err)) return { rows: [], installed: false }
    throw err
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Products
   ══════════════════════════════════════════════════════════════════════ */

/**
 * The columns migration 051 adds. Named here so a write can strip exactly
 * these and retry — rather than the alternative, which is probing the schema
 * on every save or guessing from the error message which column was rejected.
 */
const STUDIO_COLUMNS = [
  'subtitle', 'highlights', 'specs', 'badge', 'mrp',
  'same_day', 'prep_hours', 'sort_order', 'seed_rating', 'seed_rating_count',
]

/** Columns from earlier migrations that may also be absent on an old database. */
const LATER_COLUMNS = ['is_active', 'occasion', 'image_alt', 'image_credit']

/**
 * Insert or update a product, surviving a database that is behind on
 * migrations.
 *
 * On 42703 the studio columns are dropped and the write is retried, so an
 * admin editing a price on an un-migrated database gets the price saved and a
 * warning about the rest, instead of a red toast and a lost edit. The return
 * value reports which happened so the caller can say so.
 */
export async function saveProduct(patch, { id } = {}) {
  const row = { ...patch }
  // Empty strings are not the same as "no value" — a blank subtitle should
  // clear the column, but a blank number must not be written as NaN.
  for (const k of ['price', 'mrp', 'prep_hours', 'sort_order', 'seed_rating', 'seed_rating_count']) {
    if (k in row) row[k] = row[k] === '' || row[k] === null ? null : Number(row[k])
    if (k in row && Number.isNaN(row[k])) row[k] = null
  }

  async function attempt(body) {
    return id
      ? supabase.from('products').update(body).eq('id', id).select().single()
      : supabase.from('products').insert(body).select().single()
  }

  let { data, error } = await attempt(row)

  if (error?.code === MISSING_COLUMN) {
    const reduced = { ...row }
    for (const c of [...STUDIO_COLUMNS, ...LATER_COLUMNS]) delete reduced[c]
    const retry = await attempt(reduced)
    if (retry.error) throw retry.error
    return { product: retry.data, degraded: true }
  }

  if (error) throw error
  return { product: data, degraded: false }
}

/* ── Bulk ─────────────────────────────────────────────────────────────────

   Adding three hundred products one form at a time is not a workflow, it is a
   reason the catalogue never gets filled in. The console takes a paste — out
   of a spreadsheet, out of a WhatsApp message, out of anywhere — and this
   turns it into rows.

   The parser is deliberately forgiving about SHAPE and strict about MEANING:
   it will accept tabs, pipes or commas and a header row or none, because
   those are formatting accidents; it will not guess a price, because a
   product that silently lands at ₹0 is worse than one that fails to import.
*/

export const BULK_FIELDS = ['name', 'price', 'category', 'occasion', 'description', 'emoji', 'mrp', 'subtitle']

/** Header spellings a non-technical person actually types. */
const HEADER_ALIASES = {
  name: 'name', product: 'name', item: 'name', title: 'name',
  price: 'price', cost: 'price', rate: 'price', amount: 'price', mrp: 'mrp',
  'strike price': 'mrp', 'old price': 'mrp',
  category: 'category', shelf: 'category', type: 'category',
  occasion: 'occasion', festival: 'occasion',
  description: 'description', details: 'description', about: 'description',
  emoji: 'emoji', icon: 'emoji',
  subtitle: 'subtitle', tagline: 'subtitle',
}

function splitLine(line, delim) {
  if (delim !== ',') return line.split(delim)
  // Minimal CSV: quoted fields may contain commas. Anything more elaborate
  // than that is a sign the file should have been pasted as tab-separated,
  // which is what copying out of a spreadsheet gives you anyway.
  const out = []
  let cur = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ }
      else quoted = !quoted
    } else if (ch === ',' && !quoted) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Parse pasted text into candidate products.
 *
 * Returns `{ columns, rows }` where every row carries its own `errors`, so the
 * console can show a preview table with the bad lines marked and still import
 * the good ones. Nothing is written here.
 */
export function parseBulk(text, { defaultCategory = null } = {}) {
  const lines = String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { columns: [], rows: [] }

  // Whichever delimiter appears most on the first line wins.
  const delim = ['\t', '|', ','].reduce((best, d) =>
    (lines[0].split(d).length > lines[0].split(best).length ? d : best), '\t')

  const first = splitLine(lines[0], delim).map(c => c.trim().toLowerCase())
  const looksLikeHeader = first.some(c => c in HEADER_ALIASES) && !/^\d/.test(first[1] ?? '')

  const columns = looksLikeHeader
    ? first.map(c => HEADER_ALIASES[c] ?? null)
    // No header: assume the order the console prints above the box.
    : ['name', 'price', 'category', 'description']

  const body = looksLikeHeader ? lines.slice(1) : lines

  const rows = body.map((line, i) => {
    const cells = splitLine(line, delim).map(c => c.trim().replace(/^"|"$/g, ''))
    const row = { _line: i + 1 + (looksLikeHeader ? 1 : 0), errors: [] }

    columns.forEach((key, ci) => {
      if (!key || cells[ci] === undefined || cells[ci] === '') return
      row[key] = cells[ci]
    })

    if (!row.name) row.errors.push('No name')

    if (row.price === undefined) {
      row.errors.push('No price')
    } else {
      // "₹1,299", "1299/-", "Rs 1299" all mean the same number to a person.
      const n = Number(String(row.price).replace(/[^\d.]/g, ''))
      if (!Number.isFinite(n) || n <= 0) row.errors.push(`Price "${row.price}" is not a number`)
      else row.price = n
    }

    if (row.mrp !== undefined) {
      const m = Number(String(row.mrp).replace(/[^\d.]/g, ''))
      row.mrp = Number.isFinite(m) && m > 0 ? m : null
    }

    if (!row.category) {
      if (defaultCategory) row.category = defaultCategory
      else row.errors.push('No category')
    }

    return row
  })

  return { columns, rows, delim, hadHeader: looksLikeHeader }
}

/**
 * Write parsed rows.
 *
 * Inserted in chunks rather than as one statement: a single 300-row insert
 * that trips one constraint rolls back all 300, and the admin is left with
 * nothing imported and no idea which line was wrong. In chunks, the failure is
 * bounded and reported per chunk.
 */
export async function importProducts(rows, { chunkSize = 40 } = {}) {
  const valid = rows.filter(r => !r.errors?.length)
  const payload = valid.map(r => {
    const body = {
      name: r.name,
      price: r.price,
      category: r.category,
      description: r.description ?? null,
      emoji: r.emoji ?? '🎁',
    }
    if (r.occasion) body.occasion = r.occasion
    if (r.mrp) body.mrp = r.mrp
    if (r.subtitle) body.subtitle = r.subtitle
    return body
  })

  const inserted = []
  const failures = []

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)
    let { data, error } = await supabase.from('products').insert(chunk).select('id, name')

    if (error?.code === MISSING_COLUMN) {
      const reduced = chunk.map(({ mrp, subtitle, occasion, ...rest }) => rest)
      ;({ data, error } = await supabase.from('products').insert(reduced).select('id, name'))
    }

    if (error) failures.push({ from: i + 1, to: i + chunk.length, message: error.message })
    else inserted.push(...(data ?? []))
  }

  return { inserted, failures, skipped: rows.length - valid.length }
}

/**
 * Apply one change to many products at once — the other half of "not one by
 * one". A price rise across a shelf, a badge on the twelve Diwali items, a
 * seasonal shelf switched off in one go.
 *
 * `mode` for a price: 'set' writes the number, 'percent' multiplies, 'delta'
 * adds. Percent and delta are the ones that matter, because the real request
 * is never "make everything ₹599" — it is "put all the cakes up 10%".
 */
export async function bulkUpdate(ids, { field, value, mode = 'set' }) {
  if (!ids?.length) return { updated: 0 }

  if (field === 'price' && mode !== 'set') {
    // Read-modify-write, because Postgres cannot express `price = price * 1.1`
    // through PostgREST. Rounded to the rupee: a catalogue with ₹658.9 in it
    // prints badly everywhere and reconciles worse.
    const { data, error } = await supabase.from('products').select('id, price').in('id', ids)
    if (error) throw error
    let updated = 0
    for (const p of data ?? []) {
      const next = mode === 'percent'
        ? Math.round(Number(p.price) * (1 + Number(value) / 100))
        : Math.round(Number(p.price) + Number(value))
      if (!Number.isFinite(next) || next < 0) continue
      const { error: e } = await supabase.from('products').update({ price: next }).eq('id', p.id)
      if (!e) updated++
    }
    return { updated }
  }

  const patch = { [field]: value }
  let { error, count } = await supabase
    .from('products').update(patch, { count: 'exact' }).in('id', ids)

  if (error?.code === MISSING_COLUMN) {
    return { updated: 0, degraded: true, field }
  }
  if (error) throw error
  return { updated: count ?? ids.length }
}

/**
 * Put products on sale, and then go and check.
 *
 * ── Why this is not just `bulkUpdate(ids, { field: 'is_active', ... })` ──
 * "I clicked Put on sale and it never appeared on the site" is the report this
 * exists to answer. The write almost always succeeded — what failed was
 * somewhere else, and the admin had no way to tell which, because the only
 * feedback was a toast that said "1 product updated" whether or not a customer
 * could see anything.
 *
 * So this writes, then RE-READS the rows with the same filter the storefront
 * uses, and reports what is actually true afterwards. A confirmation that the
 * console did not verify is not a confirmation.
 *
 * Two things can still hide a correctly-published product, and both are
 * returned rather than assumed away:
 *
 *   · RLS silently matching zero rows — an update that is not permitted comes
 *     back as a success with a count of 0, which reads identically to a
 *     success. The re-read catches it.
 *   · the SHELF being retired. `shop_categories.is_active = false` removes the
 *     tile from the storefront, so every product on it is live and unreachable.
 *     That is the single most confusing state this console can be in, and it
 *     is not visible from the product row at all.
 */
export async function publishProducts(ids, { active = true } = {}) {
  if (!ids?.length) return { confirmed: [], failed: [], shelves: [] }

  const { error } = await supabase
    .from('products')
    .update({ is_active: active })
    .in('id', ids)

  // The column arrives with migration 037. Without it every product is on sale
  // already, so this is a no-op rather than a failure.
  if (error && error.code !== MISSING_COLUMN) throw error

  const { data, error: readErr } = await supabase
    .from('products')
    .select('id, name, category, is_active, image_url, price')
    .in('id', ids)
  if (readErr) throw readErr

  const rows = data ?? []
  const wanted = active
  const confirmed = rows.filter(p => (p.is_active !== false) === wanted)
  const failed = rows.filter(p => (p.is_active !== false) !== wanted)

  return {
    confirmed,
    failed,
    shelves: [...new Set(confirmed.map(p => p.category))],
    // Worth surfacing separately: a live product with no photograph renders as
    // an emoji tile, which an admin scanning the shelf for it will not
    // recognise as the thing they just published.
    withoutPhoto: confirmed.filter(p => !p.image_url).length,
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Media — the gallery and the clips
   ══════════════════════════════════════════════════════════════════════ */

export async function fetchMedia(productId) {
  return softSelect(() => supabase
    .from('product_media').select('*')
    .eq('product_id', productId)
    .order('sort_order').order('created_at'))
}

/** Every product's media in one read, for the coverage counts on the list. */
export async function fetchMediaCounts() {
  const { rows, installed } = await softSelect(() => supabase
    .from('product_media').select('product_id, kind').eq('is_active', true))
  const counts = {}
  for (const m of rows) {
    const c = counts[m.product_id] ?? (counts[m.product_id] = { image: 0, video: 0 })
    c[m.kind] = (c[m.kind] ?? 0) + 1
  }
  return { counts, installed }
}

async function nextSort(productId) {
  const { rows } = await fetchMedia(productId)
  return rows.length ? Math.max(...rows.map(r => r.sort_order ?? 0)) + 10 : 10
}

/** Register a piece of media that is already at a URL. */
export async function addMedia(productId, media) {
  const row = {
    product_id: productId,
    kind: media.kind ?? 'image',
    url: media.url,
    poster_url: media.poster_url ?? null,
    alt: media.alt ?? null,
    caption: media.caption ?? null,
    source: media.source ?? 'actual',
    credit: media.credit ?? null,
    duration_s: media.duration_s ?? null,
    sort_order: media.sort_order ?? await nextSort(productId),
  }
  const { data, error } = await supabase.from('product_media').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateMedia(id, patch) {
  const { data, error } = await supabase
    .from('product_media')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMedia(id) {
  const { error } = await supabase.from('product_media').delete().eq('id', id)
  if (error) throw error
}

/** Move one item up or down by swapping sort orders with its neighbour. */
export async function reorderMedia(list, id, direction) {
  const i = list.findIndex(m => m.id === id)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return list
  const a = list[i], b = list[j]
  await updateMedia(a.id, { sort_order: b.sort_order ?? (j + 1) * 10 })
  await updateMedia(b.id, { sort_order: a.sort_order ?? (i + 1) * 10 })
  const next = [...list]
  next[i] = b; next[j] = a
  return next
}

/**
 * Upload an image into the gallery.
 *
 * Compressed by the same canvas path the single product photo uses — a 4 MB
 * phone JPEG times eight gallery slots is 32 MB on a product page nobody will
 * wait for. `makePrimary` also points `products.image_url` at it, which is
 * what puts the photo on the grid tile.
 */
export async function uploadGalleryImage(productId, file, {
  source = 'actual', alt, caption, makePrimary = false, quality = 'balanced',
} = {}) {
  // 'original' keeps the pasted bytes exactly — see prepareImage. The
  // extension has to follow the ACTUAL type now rather than assuming
  // webp-or-jpg, because a kept PNG screenshot stays a PNG and serving it as
  // .jpg makes some CDNs and image tools guess wrong about it.
  // `bucket` is chosen by prepareImage, not fixed here: an untouched 22 MB
  // scan cannot go in product-images (5 MB) but fits product-media (50 MB), and
  // shrinking it to satisfy the smaller bucket would throw away exactly what
  // 'original' was asked to preserve.
  const { blob, kept, bucket, width, height, reason } = await prepareImage(file, { mode: quality })
  const ext  = extFor(blob.type)
  // A random suffix as well as the clock. Pasting eight screenshots at once
  // starts eight uploads inside the same millisecond, and `upsert: false`
  // turns a path collision into a failed upload for every file but the first.
  const path = `${productId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const target = bucket === 'product-media' ? MEDIA_BUCKET : IMAGE_BUCKET
  const { error: upErr } = await supabase.storage
    .from(target)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

  const { data: { publicUrl } } = supabase.storage.from(target).getPublicUrl(path)
  const media = await addMedia(productId, { kind: 'image', url: publicUrl, source, alt, caption })

  if (makePrimary) await setPrimaryImage(productId, publicUrl, source)
  // `kept` and the dimensions travel back so the console can say what actually
  // happened to the file rather than implying nothing did.
  return { ...media, _kept: kept, _width: width, _height: height, _reason: reason }
}

/* ── Getting pictures in ───────────────────────────────────────────────────

   The file picker was the only way in, and it is the worst of the four ways
   somebody actually has a picture on hand:

     · they just pressed Win+Shift+S / Ctrl+Shift+4 and it is on the CLIPBOARD
     · they have a folder open and want to DRAG a dozen across
     · they have the file and will pick it — but eight of them, not one
     · they are looking at it in another tab and can copy the image ADDRESS

   All four end up as a Blob or a URL, so they all end at `uploadGalleryImage`.
   What follows is only the funnel into it.
*/

/** Everything image-shaped in a paste or a drop, in the order it was given. */
export function imagesFromTransfer(dataTransfer) {
  if (!dataTransfer) return []
  const out = []

  // `items` carries a pasted screenshot (which has no entry in `files` on some
  // browsers); `files` carries a drag from the file system. Reading both and
  // de-duplicating is what makes one handler serve paste AND drop.
  for (const item of dataTransfer.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) out.push(file)
    }
  }
  for (const file of dataTransfer.files ?? []) {
    if (file.type.startsWith('image/') && !out.some(f => f.name === file.name && f.size === file.size)) {
      out.push(file)
    }
  }
  return out
}

/** Any http(s) image URLs in a paste — one per line, so a list works too. */
export function imageUrlsFromText(text) {
  return String(text ?? '')
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(s => /^https?:\/\//i.test(s))
}

/**
 * Fetch a remote image into a Blob so it can be re-hosted.
 *
 * Deliberately re-hosted rather than stored as a link. A URL pasted from
 * somebody else's site is a photo that disappears the day they reorganise
 * their bucket, and it leaks every shopper's IP to that host. `addMedia` with
 * `source: 'link'` still exists for when a link is genuinely what is wanted —
 * this is for "I found the picture, put it in our shop".
 *
 * CORS is the catch and it cannot be worked around from the browser: a host
 * that does not send Access-Control-Allow-Origin cannot be read into a canvas
 * at all. So the failure is reported as what it is, with the fallback named.
 */
export async function fetchImageAsFile(url) {
  let res
  try {
    res = await fetch(url, { mode: 'cors' })
  } catch {
    throw new Error(
      'That site will not let us copy the image directly. Save it to your ' +
      'computer and drag it in, or use “From a link” to point at it instead.'
    )
  }
  if (!res.ok) throw new Error(`That link returned ${res.status}.`)

  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('That link is not an image.')

  const name = (url.split('/').pop() || 'image').split('?')[0]
  return new File([blob], name, { type: blob.type })
}

/**
 * Upload many images as one job, reporting each one as it lands.
 *
 * Never `Promise.all`. Eight 4 MB screenshots decoded onto canvases at the
 * same moment is how a mid-range phone browser drops the tab, and one failure
 * in the middle of a Promise.all loses the results of the ones that succeeded.
 * Sequential, with each result surfaced as it happens, means a part-failed
 * batch still leaves every good photo in the gallery and names the bad one.
 *
 * `makePrimaryIfFirst` points the tile at the very first image only when the
 * product has none — pasting more photos onto a product that already has a
 * chosen tile photo must not silently replace it.
 */
export async function uploadGalleryImages(productId, files, {
  source = 'actual',
  makePrimaryIfFirst = false,
  quality = 'balanced',
  onProgress,
} = {}) {
  const added = []
  const failures = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.({ index: i, total: files.length, name: file.name || 'pasted image', phase: 'uploading' })
    try {
      const media = await uploadGalleryImage(productId, file, {
        source,
        quality,
        makePrimary: makePrimaryIfFirst && i === 0,
      })
      added.push(media)
    } catch (err) {
      failures.push({ name: file.name || `image ${i + 1}`, message: err.message })
    }
  }

  onProgress?.(null)
  return { added, failures }
}

/**
 * Grab a still from a video, in the browser, for use as its poster.
 *
 * Without one, a clip is a black rectangle until it buffers — on a product
 * page that reads as a broken image. Seeks a little way in rather than to 0,
 * because the first frame of a phone clip is very often the lens still
 * focusing.
 *
 * Returns null rather than throwing: a missing poster degrades to a slightly
 * worse-looking card, and failing the whole upload over it would be worse.
 */
export async function posterFromVideo(file, { at = 0.6 } = {}) {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    const meta = await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve({ w: video.videoWidth, h: video.videoHeight, d: video.duration })
      video.onerror = () => reject(new Error('Could not read that video.'))
      setTimeout(() => reject(new Error('Timed out reading that video.')), 15000)
    })

    await new Promise((resolve, reject) => {
      video.onseeked = resolve
      video.onerror = () => reject(new Error('Could not seek that video.'))
      video.currentTime = Math.min(at, Math.max(0, (meta.d || 1) - 0.1))
    })

    const scale = Math.min(1, 1280 / Math.max(meta.w || 1, meta.h || 1))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round((meta.w || 1280) * scale)
    canvas.height = Math.round((meta.h || 720) * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8))
    return { blob, duration: meta.d ?? null }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Above this, the clip is a problem for the person watching it, not for us. */
export const VIDEO_WARN_BYTES = 20 * 1024 * 1024
export const VIDEO_MAX_BYTES  = 50 * 1024 * 1024

/**
 * Upload a clip.
 *
 * `source` is not decoration. 'actual' is footage of the thing that will
 * arrive; 'ai' is generated. Both are legitimate on a product page and they
 * are different claims, so the badge that renders beside the clip is driven
 * from here and the studio makes the choice explicit at upload time rather
 * than defaulting it.
 */
export async function uploadVideo(productId, file, { source = 'actual', caption, alt, onProgress } = {}) {
  if (!file?.type?.startsWith('video/')) throw new Error('That file is not a video.')
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error(`That clip is ${(file.size / 1048576).toFixed(0)} MB. The limit is 50 MB — trim it, or export at 720p.`)
  }

  onProgress?.('Reading the clip…')
  const poster = await posterFromVideo(file)

  let posterUrl = null
  if (poster?.blob) {
    onProgress?.('Saving the cover frame…')
    const pPath = `${productId}/poster-${Date.now()}.jpg`
    const { error: pErr } = await supabase.storage
      .from(MEDIA_BUCKET).upload(pPath, poster.blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (!pErr) {
      posterUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(pPath).data.publicUrl
    }
  }

  onProgress?.('Uploading…')
  const ext  = (file.name.split('.').pop() || 'mp4').toLowerCase()
  const path = `${productId}/clip-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (error) {
    // The bucket only exists after 051. Say which file to run rather than
    // showing a storage error nobody outside this repo can act on.
    if (/bucket/i.test(error.message)) {
      throw new Error('Video storage is not set up yet — run migration 051_product_studio.sql in the Supabase SQL editor.')
    }
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)

  return addMedia(productId, {
    kind: 'video',
    url: publicUrl,
    poster_url: posterUrl,
    source,
    caption,
    alt,
    duration_s: poster?.duration ?? null,
  })
}

/** Point the product's single tile image at a gallery URL. */
export async function setPrimaryImage(productId, url, source = 'actual') {
  const { error } = await supabase.from('products').update({
    image_url: url,
    image_source: source === 'ai' ? 'stock' : source,
    image_updated_at: new Date().toISOString(),
  }).eq('id', productId)
  if (error && error.code !== MISSING_COLUMN) throw error
}

/* ══════════════════════════════════════════════════════════════════════
   FAQs
   ══════════════════════════════════════════════════════════════════════ */

/**
 * The questions that apply to one product: its own, its shelf's, and the
 * shop's.
 *
 * Returned in that precedence order — most specific first — because a
 * customer scanning the block should meet the answer about THIS product
 * before the one about delivery in general.
 */
export async function fetchFaqs({ productId = null, category = null, scope = 'resolved' } = {}) {
  const { rows, installed } = await softSelect(() => {
    let q = supabase.from('product_faqs').select('*')
    if (scope === 'product')       q = q.eq('product_id', productId)
    else if (scope === 'category') q = q.is('product_id', null).eq('category', category)
    else if (scope === 'global')   q = q.is('product_id', null).is('category', null)
    return q.order('sort_order').order('created_at')
  })

  if (scope !== 'resolved') return { faqs: rows, installed }

  const own    = rows.filter(r => r.product_id === productId)
  const shelf  = rows.filter(r => !r.product_id && r.category === category)
  const global = rows.filter(r => !r.product_id && !r.category)
  return { faqs: [...own, ...shelf, ...global], installed }
}

export async function saveFaq(faq) {
  const row = {
    product_id: faq.product_id ?? null,
    category: faq.category ?? null,
    question: faq.question?.trim(),
    answer: faq.answer?.trim(),
    sort_order: Number.isFinite(+faq.sort_order) ? +faq.sort_order : 100,
    is_active: faq.is_active !== false,
    updated_at: new Date().toISOString(),
  }
  if (!row.question || !row.answer) throw new Error('A question and an answer are both required.')

  const { data, error } = faq.id
    ? await supabase.from('product_faqs').update(row).eq('id', faq.id).select().single()
    : await supabase.from('product_faqs').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteFaq(id) {
  const { error } = await supabase.from('product_faqs').delete().eq('id', id)
  if (error) throw error
}

/**
 * Paste a whole FAQ set at once — `Question | Answer`, one per line, or a
 * blank-line-separated block with the question on the first line.
 *
 * Both shapes exist because both are how people actually have this written
 * down already.
 */
export function parseFaqBulk(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return []

  if (raw.includes('|')) {
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
      const [q, ...rest] = line.split('|')
      return { question: q.trim(), answer: rest.join('|').trim() }
    }).filter(f => f.question && f.answer)
  }

  return raw.split(/\n\s*\n/).map(block => {
    const [q, ...rest] = block.split(/\r?\n/)
    return { question: (q ?? '').trim().replace(/^Q[:.]\s*/i, ''), answer: rest.join(' ').trim().replace(/^A[:.]\s*/i, '') }
  }).filter(f => f.question && f.answer)
}

export async function importFaqs(faqs, scope) {
  const rows = faqs.map((f, i) => ({
    product_id: scope.product_id ?? null,
    category: scope.category ?? null,
    question: f.question,
    answer: f.answer,
    sort_order: (i + 1) * 10,
  }))
  const { data, error } = await supabase.from('product_faqs').insert(rows).select()
  if (error) throw error
  return data ?? []
}

/* ══════════════════════════════════════════════════════════════════════
   The story
   ══════════════════════════════════════════════════════════════════════ */

/**
 * The named beats, and what each one is for.
 *
 * This list is the reason the storyboard editor is not an anonymous pile of
 * slides. Each scene states the question it answers, so somebody filling it in
 * has a prompt rather than a blank box — which is the difference between a
 * story getting written and a story staying empty.
 */
export const SCENES = [
  { id: 'craft',     label: 'How it is made',    icon: '🪡', accent: 'plum',
    prompt: 'Who makes it, where, and what makes it different from the one on any other app.' },
  { id: 'packaging', label: 'How it arrives',    icon: '🎀', accent: 'plum',
    prompt: 'The box, the ribbon, the card. What they see before they see the gift.' },
  { id: 'moment',    label: 'The moment',        icon: '💛', accent: 'rose',
    prompt: 'The reaction it is actually bought for — the ten seconds after the door opens.' },
  { id: 'speed',     label: 'How fast',          icon: '⚡', accent: 'saffron',
    prompt: 'Same-day, within hours, the cut-off time. Say the real number.' },
  { id: 'promise',   label: 'If it goes wrong',  icon: '🛡️', accent: 'emerald',
    prompt: 'One number to call, whoever made it. What we actually do about it.' },
  { id: 'custom',    label: 'Something else',    icon: '✨', accent: 'ink',
    prompt: 'Anything this product needs said that the beats above do not cover.' },
]

export const SCENE_BY_ID = Object.fromEntries(SCENES.map(s => [s.id, s]))
export const ACCENTS = ['saffron', 'plum', 'emerald', 'rose', 'ink']

/**
 * The slides for one product, resolved.
 *
 * Precedence is by SCENE, not by row: a product that writes its own
 * `packaging` slide replaces the shelf's packaging slide but keeps the shelf's
 * `moment` and the shop's `speed`. Overriding one beat must not silently drop
 * the other two — that is how a product page ends up with a single orphan
 * slide and nobody understands why.
 */
export async function fetchStory({ productId = null, category = null, scope = 'resolved' } = {}) {
  const { rows, installed } = await softSelect(() => {
    let q = supabase.from('product_story_slides').select('*')
    if (scope === 'product')       q = q.eq('product_id', productId)
    else if (scope === 'category') q = q.is('product_id', null).eq('category', category)
    else if (scope === 'global')   q = q.is('product_id', null).is('category', null)
    return q.order('sort_order').order('created_at')
  })

  if (scope !== 'resolved') return { slides: rows, installed }

  const bySpecificity = [
    rows.filter(r => !r.product_id && !r.category),
    rows.filter(r => !r.product_id && r.category === category),
    rows.filter(r => r.product_id === productId),
  ]

  const merged = new Map()
  for (const tier of bySpecificity) {
    for (const slide of tier) {
      // 'custom' slides are additive — several may coexist — so they key on
      // their own id rather than collapsing onto one another.
      merged.set(slide.scene === 'custom' ? `custom:${slide.id}` : slide.scene, slide)
    }
  }

  return {
    slides: [...merged.values()].sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100)),
    installed,
  }
}

export async function saveSlide(slide) {
  const row = {
    product_id: slide.product_id ?? null,
    category: slide.category ?? null,
    scene: slide.scene ?? 'custom',
    kicker: slide.kicker?.trim() || null,
    title: slide.title?.trim(),
    body: slide.body?.trim() || null,
    image_url: slide.image_url || null,
    video_url: slide.video_url || null,
    icon: slide.icon || SCENE_BY_ID[slide.scene]?.icon || null,
    accent: ACCENTS.includes(slide.accent) ? slide.accent : 'saffron',
    sort_order: Number.isFinite(+slide.sort_order) ? +slide.sort_order : 100,
    is_active: slide.is_active !== false,
    updated_at: new Date().toISOString(),
  }
  if (!row.title) throw new Error('A slide needs a title.')

  const { data, error } = slide.id
    ? await supabase.from('product_story_slides').update(row).eq('id', slide.id).select().single()
    : await supabase.from('product_story_slides').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteSlide(id) {
  const { error } = await supabase.from('product_story_slides').delete().eq('id', id)
  if (error) throw error
}

/**
 * A starting storyboard, so a new shelf is never a blank editor.
 *
 * The copy is a prompt written in the brand's voice, not filler to ship — the
 * console marks these as drafts until an admin has edited them, because
 * "Wrapped like it matters" on a shelf of pooja diyas is worse than saying
 * nothing.
 */
export function storyTemplate({ category = null, productId = null, productName = null } = {}) {
  const subject = productName || category || 'this'
  return [
    { scene: 'packaging', kicker: 'Before it leaves us', title: 'Wrapped like it matters',
      body: `Every ${subject} order is packed by hand — the box, the ribbon, the card in your handwriting.`,
      icon: '🎀', accent: 'plum', sort_order: 10, product_id: productId, category },
    { scene: 'moment', kicker: 'The part that is not on the invoice', title: 'The ten seconds after the door opens',
      body: 'That is what is actually being bought. The timing, the note and the handover are planned backwards from it.',
      icon: '💛', accent: 'rose', sort_order: 20, product_id: productId, category },
    { scene: 'speed', kicker: 'Same city, same day', title: 'Ordered this morning, there this evening',
      body: 'Bengaluru and Mysuru, within hours. Nothing sits in a warehouse.',
      icon: '⚡', accent: 'saffron', sort_order: 30, product_id: productId, category },
  ]
}

export async function importSlides(slides) {
  const { data, error } = await supabase.from('product_story_slides').insert(
    slides.map(s => ({ ...s, updated_at: new Date().toISOString() }))
  ).select()
  if (error) throw error
  return data ?? []
}

/* ══════════════════════════════════════════════════════════════════════
   Ratings
   ══════════════════════════════════════════════════════════════════════ */

/**
 * The rating to print next to each product, and where it came from.
 *
 * Falls back to `review_aggregates` (migration 012) when the 051 view is
 * missing, so the console still shows real ratings on an un-migrated database
 * — it just cannot show a baseline, because there is nowhere to store one.
 */
export async function fetchRatings() {
  const view = await softSelect(() => supabase.from('product_ratings').select('*'))
  if (view.installed) {
    return {
      ratings: Object.fromEntries(view.rows.map(r => [r.product_id, r])),
      installed: true,
    }
  }

  const legacy = await softSelect(() => supabase
    .from('review_aggregates').select('*').eq('subject_type', 'product'))
  return {
    ratings: Object.fromEntries(legacy.rows.map(r => [r.subject_id, {
      product_id: r.subject_id,
      rating: r.avg_rating,
      review_count: r.review_count,
      rating_source: r.review_count > 0 ? 'customer' : 'none',
    }])),
    installed: false,
  }
}

/**
 * Set or clear a product's launch baseline.
 *
 * Kept deliberately narrow. This writes two columns on `products`; it cannot
 * and must not write a row into `reviews_catalog`, because a fabricated review
 * with a customer's name on it is not recoverable from afterwards — not by a
 * customer reading it, and not by us. The baseline shows only while a product
 * has no real reviews, and the storefront labels it.
 */
export async function setSeedRating(productId, rating, count) {
  const patch = {
    seed_rating: rating === null || rating === '' ? null : Number(rating),
    seed_rating_count: count === null || count === '' ? null : Number(count),
  }
  const { error } = await supabase.from('products').update(patch).eq('id', productId)
  if (error?.code === MISSING_COLUMN) {
    throw new Error('Launch ratings need migration 051_product_studio.sql — run it in the Supabase SQL editor.')
  }
  if (error) throw error
}

/** The real reviews for one product, for the moderation panel. */
export async function fetchProductReviews(productId) {
  const { data, error } = await supabase
    .from('reviews_catalog').select('*')
    .eq('subject_type', 'product').eq('subject_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function replyToReview(reviewId, reply) {
  const { error } = await supabase.from('reviews_catalog').update({
    admin_reply: reply?.trim() || null,
    admin_reply_at: reply?.trim() ? new Date().toISOString() : null,
  }).eq('id', reviewId)
  if (error) throw error
}
