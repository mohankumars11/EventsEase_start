import { supabase } from './supabase'
import { compressImage } from './imageUpload'

// Uploading a real photograph of a product, and pointing the row at it.
//
// The point of the feature: a customer should receive what they saw. Until
// an admin puts a real photo here, every product carries a licensed
// lookalike labelled "Representative image" (see ImageSourceBadge). This
// module is how that becomes "Actual product photo".
//
// The canvas compression this depends on now lives in ./imageUpload, which
// the event side also uses. Only what follows is product-specific.

const BUCKET = 'product-images'
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
