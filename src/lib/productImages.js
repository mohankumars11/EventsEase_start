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
