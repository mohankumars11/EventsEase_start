import { supabase } from './supabase'

// Uploading a real photograph of a product, from the device you took it on.
//
// The point of the whole feature: a customer should receive what they saw.
// Until an admin puts a real photo here, every product carries a licensed
// lookalike labelled "Representative image" (see ImageSourceBadge). This
// module is how that becomes "Actual product photo".
//
// Everything happens in the browser. There is no server to resize on —
// the only serverless functions in this project are the two Razorpay
// endpoints — so compression is done on a canvas before upload.

const BUCKET   = 'product-images'
const MAX_EDGE = 1600   // px on the longest side
const QUALITY  = 0.82

/* ── Quality modes ────────────────────────────────────────────────────────

   `compressImage` below was written for one input: a 4 MB phone photo of a
   cake, destined for a 144px grid tile. Downscaling that to 1600px of WebP at
   0.82 is exactly right — nobody can see the difference on a photograph, and
   the page weight matters more.

   It is the wrong answer for the other thing people paste: a SCREENSHOT. A
   crop from a supplier's PDF is line art, product text, spec tables and hard
   edges. Lossy WebP at 0.82 puts ringing on every letter, and 1600px throws
   away the pixels the text needed — so the paste visibly degrades what was on
   the clipboard, which is not a tradeoff anyone asked for.

   So the mode is a choice, and 'original' means what it says: when the file is
   already within the bucket's limits, it is uploaded BYTE FOR BYTE. Not
   re-encoded at a higher quality — not re-encoded at all. That is the only
   way to promise no loss, because every canvas round-trip loses something.  */

// The two buckets an image can land in, and why there are two.
//
// `product-images` (migration 025) caps at 5 MB, which is right for the
// compressed WebP it was built for. `product-media` (migration 051) caps at
// 50 MB and accepts the same three image types. So a 22 MB scan does not have
// to be degraded to fit — it goes in the larger bucket, untouched. Shrinking
// a file the admin explicitly asked to keep, in order to satisfy a limit that
// another bucket does not have, would be the wrong trade.
export const ORIGINAL_MAX_BYTES = 5 * 1024 * 1024        // product-images
export const LARGE_MAX_BYTES    = 50 * 1024 * 1024       // product-media
const KEEPABLE = ['image/png', 'image/jpeg', 'image/webp']

export const QUALITY_MODES = {
  original: {
    id: 'original',
    label: 'Original quality',
    hint: 'Uploaded exactly as it is. Best for screenshots, PDFs and anything with text.',
    // Only used when the file is too big to keep verbatim.
    maxEdge: 4096,
    quality: 0.95,
  },
  balanced: {
    id: 'balanced',
    label: 'Optimised for the web',
    hint: 'Smaller files, faster pages. Best for photographs.',
    maxEdge: MAX_EDGE,
    quality: QUALITY,
  },
}

/**
 * Downscale and re-encode a camera image to WebP.
 *
 * A modern phone photo is 3-5 MB of 4000px JPEG. Uploaded raw across a
 * 341-product catalogue that is well over the 1 GB Supabase free tier,
 * and every shopper on a Bengaluru mobile connection then downloads a
 * 4 MB file to fill a 144px grid tile. At 1600px/WebP each product costs
 * roughly 200 KB — sharp on a retina hero, ~70 MB for the whole shop.
 *
 * Returns a Blob. Throws if the file isn't a decodable image.
 */
export async function compressImage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that image. Try a JPEG or PNG.')
  })

  const scale  = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width  = Math.round(bitmap.width  * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise(resolve =>
    // Safari below 16 has no WebP encoder and silently hands back a PNG,
    // which is larger than the JPEG we started with. Ask for WebP, check
    // what we actually got, and fall back to JPEG rather than ship a
    // 3 MB PNG. The bucket's allowed_mime_types permits both.
    canvas.toBlob(b => resolve(b), 'image/webp', quality)
  )

  if (blob && blob.type === 'image/webp') return blob

  return new Promise(resolve =>
    canvas.toBlob(b => resolve(b), 'image/jpeg', quality)
  )
}

/** Width and height without decoding the whole file twice. */
export async function imageSize(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return size
  } catch {
    return null
  }
}

/**
 * Get a file ready to upload, honouring the quality mode.
 *
 * Returns `{ blob, kept, width, height, reason }`. `kept: true` means the
 * original bytes are being uploaded untouched and the pixels are identical to
 * what was on the clipboard — which is the whole point of 'original' mode, and
 * the thing the console reports back so it is not just a claim.
 *
 * The fallbacks matter as much as the happy path. A 12 MB PNG cannot go into a
 * 5 MB bucket however much anyone wants the original, so it is re-encoded at
 * 4096px/0.95 rather than failing — and `reason` says so, so the admin finds
 * out from the screen instead of from a customer.
 */
export async function prepareImage(file, { mode = 'balanced' } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('That file is not an image.')

  const cfg = QUALITY_MODES[mode] ?? QUALITY_MODES.balanced
  const size = await imageSize(file)

  if (mode === 'original' && KEEPABLE.includes(file.type)) {
    // Byte-for-byte, whenever a bucket will take it. No canvas, no re-encode,
    // no generation loss — a PNG screenshot stays the exact PNG that was
    // pasted, text and all.
    if (file.size <= ORIGINAL_MAX_BYTES) {
      return { blob: file, kept: true, bucket: 'product-images', width: size?.width ?? null, height: size?.height ?? null, reason: null }
    }
    if (file.size <= LARGE_MAX_BYTES) {
      return {
        blob: file, kept: true, bucket: 'product-media',
        width: size?.width ?? null, height: size?.height ?? null,
        reason: `${(file.size / 1048576).toFixed(1)} MB — stored in the large-media bucket, still untouched.`,
      }
    }
  }

  const why = mode !== 'original' ? null
    : !KEEPABLE.includes(file.type)
      ? `${file.type || 'That format'} cannot be stored as-is, so it was converted.`
      : `The original was ${(file.size / 1048576).toFixed(1)} MB, past the ${LARGE_MAX_BYTES / 1048576} MB ceiling, so it was resaved as large as will fit.`

  const blob = await shrinkToFit(file, {
    maxEdge: cfg.maxEdge,
    quality: cfg.quality,
    limit: mode === 'original' ? LARGE_MAX_BYTES : ORIGINAL_MAX_BYTES,
  })
  const after = await imageSize(blob)
  return {
    blob,
    kept: false,
    bucket: blob.size > ORIGINAL_MAX_BYTES ? 'product-media' : 'product-images',
    width: after?.width ?? null,
    height: after?.height ?? null,
    reason: why,
  }
}

/**
 * Re-encode until it actually fits, rather than once and hope.
 *
 * A single pass at 4096px/0.95 turned a 22 MB scan into 6.2 MB — still over
 * the 5 MB bucket cap, so the upload failed with a storage error after the
 * admin had already waited for the compression. Producing a file the bucket
 * will reject is not a smaller file, it is a broken upload, so this steps down
 * until the bytes are genuinely under the limit and gives up honestly rather
 * than looping forever.
 */
async function shrinkToFit(file, { maxEdge, quality, limit }) {
  let edge = maxEdge
  let q = quality
  let blob = await compressImage(file, { maxEdge: edge, quality: q })

  for (let pass = 0; blob.size > limit && pass < 6; pass++) {
    // Quality first — it costs less visible detail than throwing pixels away —
    // then dimensions once quality is as low as is defensible.
    if (q > 0.72) q = Math.max(0.72, q - 0.08)
    else edge = Math.round(edge * 0.75)
    blob = await compressImage(file, { maxEdge: edge, quality: q })
  }
  return blob
}

/** The file extension that actually matches the bytes. */
export function extFor(type) {
  return type === 'image/webp' ? 'webp'
    : type === 'image/png' ? 'png'
      : 'jpg'
}

/**
 * Compress, upload, and point the product row at the result.
 *
 * The row update is what flips image_source to 'actual', so the customer
 * badge and the coverage meter both change on the same write.
 */
export async function uploadProductImage(productId, file, { alt } = {}) {
  const blob = await compressImage(file)
  const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${productId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('products')
    .update({
      image_url:        publicUrl,
      image_source:     'actual',
      image_credit:     null,   // ours now; no attribution to carry
      image_alt:        alt || undefined,
      image_updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single()

  if (error) {
    // Don't leave an orphan object in the bucket paying for storage
    // against a product that never pointed at it.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(`Saved the file but could not update the product: ${error.message}`)
  }

  return data
}

/**
 * Undo an upload: drop every object under the product's folder and clear
 * the row back to a stock photo.
 *
 * `stockUrl` is what image_url should return to — normally the value
 * migration 024 assigned. Passing nothing leaves the product on its emoji
 * tile, which is honest but bare.
 */
export async function revertToStock(productId, stockUrl = null) {
  const { data: files } = await supabase.storage.from(BUCKET).list(productId)
  if (files?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(files.map(f => `${productId}/${f.name}`))
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      image_url:        stockUrl,
      image_source:     'stock',
      image_updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single()

  if (error) throw new Error(`Could not revert: ${error.message}`)
  return data
}

/** Per-category totals for the admin coverage meter (view from migration 025). */
export async function fetchImageCoverage() {
  const { data, error } = await supabase
    .from('product_image_coverage')
    .select('*')
    .order('category')

  if (error) throw new Error(error.message)
  return data ?? []
}
