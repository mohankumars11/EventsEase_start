import { supabase } from './supabase'
import { compressImage } from './imageUpload'
import { isMissingTable } from './serviceCatalog'

/**
 * Real photographs for the décor catalogue (migration 044).
 *
 * ── What this is ─────────────────────────────────────────────────────────
 * An overlay of exactly one field. src/data/decorCatalog.js is the authority
 * for every décor setup's name, price, inclusions and size; this module owns
 * only the photograph, because a photograph arrives from a camera rather than
 * from a commit and is the one thing about a setup that cannot wait for a
 * deploy.
 *
 * Every card ships with a licensed Pexels lookalike badged "Representative
 * image". An upload here replaces it and flips the badge to "Actual setup
 * photo" for every visitor, immediately. That badge is the entire point: the
 * day Sambramo has photographed its own work is the day it stops competing on
 * claims and starts competing on evidence, and nothing else on the site moves
 * that needle as far.
 *
 * ── Absent-table tolerance is deliberate, not defensive noise ────────────
 * Migrations in this project are applied BY HAND in the Supabase dashboard, so
 * "the code is deployed and the table is not there yet" is a normal state that
 * lasts as long as it takes somebody to paste some SQL. Every read here
 * therefore treats a missing table as "no overrides" and returns an empty map,
 * and the storefront renders the photographs it shipped with. The alternative
 * is a décor section that goes blank on production between a push and a paste.
 *
 * `isMissingTable` is imported from serviceCatalog rather than re-implemented:
 * the set of Postgres and PostgREST codes that mean "no such table" is not
 * obvious (42P01, PGRST205, and a schema-cache message that matches neither),
 * and two copies of that regex is one copy that will eventually be wrong.
 */

const BUCKET = 'product-images'

/**
 * Décor photos live under `decor/` inside the SHOP's bucket rather than a
 * bucket of their own — the same call migration 037 made for service photos.
 * Migration 025's storage policies key on `bucket_id` alone, so the prefix
 * inherits public-read and admin-only-write unchanged. One bucket and one set
 * of policies to get right instead of three.
 */
const PREFIX = 'decor'

/* ═══════════════════════════════════════════════════════════
   Reading
═══════════════════════════════════════════════════════════ */

/**
 * itemId → { url, alt, credit, source }, in the shape decorCatalog's own
 * resolver produces, so merging is a spread and not a translation.
 *
 * Returns {} when the table is absent, when the request fails, and when
 * nothing has been uploaded — three different situations that the storefront
 * must respond to identically, because the correct response to all of them is
 * "show the photograph you already have".
 */
export async function fetchDecorPhotos() {
  const { data, error } = await supabase
    .from('decor_photos')
    .select('item_id, image_url, image_alt, image_credit, image_source, updated_at')

  if (error) {
    if (isMissingTable(error)) return {}
    // A real failure — a network drop, a policy change — is still not worth
    // breaking a storefront section over. Logged so it is findable, swallowed
    // so the customer never sees it.
    console.warn('decor photos unavailable:', error.message)
    return {}
  }

  return Object.fromEntries(
    (data ?? []).map(row => [row.item_id, {
      url:    row.image_url,
      alt:    row.image_alt || null,
      credit: row.image_credit || null,
      source: row.image_source,
      updatedAt: row.updated_at,
    }])
  )
}

/** Every row, newest first — the admin screen's own read. Throws; it has a UI to show it in. */
export async function fetchDecorPhotoRows() {
  const { data, error } = await supabase
    .from('decor_photos')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/* ═══════════════════════════════════════════════════════════
   Writing
═══════════════════════════════════════════════════════════ */

/**
 * Compress in the browser, upload, point the row at the result.
 *
 * `compressImage` turns a 4 MB phone JPEG into roughly 200 KB of WebP before
 * it leaves the device, because there is no server in this project to resize
 * on — the only serverless functions are the two Razorpay endpoints. Sixty
 * décor setups photographed at full camera resolution would be ~250 MB of a
 * 1 GB free tier, and every customer on a mobile connection would download a
 * 4 MB file to fill a 165px grid tile.
 *
 * Timestamped path rather than a fixed one per item: overwriting in place
 * leaves the old file cached at the same URL behind a one-year cache-control
 * header, so the admin would upload a new photograph and keep seeing the old
 * one with no way to tell why. A new path is a new URL and there is nothing to
 * bust.
 */
export async function uploadDecorPhoto(itemId, file, { alt, source = 'actual', credit = null } = {}) {
  const blob = await compressImage(file)
  const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${PREFIX}/${itemId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('decor_photos')
    .upsert({
      item_id:      itemId,
      image_url:    publicUrl,
      image_alt:    alt || null,
      // Attribution belongs to a stock library, never to our own work. Forcing
      // it null on 'actual' rather than trusting the caller, because a credit
      // line left over from a previous stock upload would print a stranger's
      // byline under a hall we decorated ourselves.
      image_credit: source === 'actual' ? null : credit,
      image_source: source,
      uploaded_by:  user?.id ?? null,
    }, { onConflict: 'item_id' })
    .select()
    .single()

  if (error) {
    // Never leave an object in the bucket that no row points at. It costs
    // storage forever and nothing will ever find it again.
    await supabase.storage.from(BUCKET).remove([path])
    if (isMissingTable(error)) {
      throw new Error(
        'The photo uploaded but there is nowhere to record it yet — migration 044 ' +
        'has not been applied. Run supabase/migrations/044_decor_photos.sql in the ' +
        'Supabase SQL editor, then upload again.'
      )
    }
    throw new Error(`Saved the file but could not record it: ${error.message}`)
  }

  return data
}

/** Edit the caption or the honesty flag without re-uploading the file. */
export async function updateDecorPhoto(itemId, patch) {
  const { data, error } = await supabase
    .from('decor_photos')
    .update(patch)
    .eq('item_id', itemId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Take the photograph down and delete every file behind it.
 *
 * The row and the objects go together. A row deleted without its files leaves
 * storage nobody can find; files deleted without the row leave a card pointing
 * at a 404. Files first, because a failed row delete is recoverable by pressing
 * the button again, whereas a deleted row with orphaned files is invisible.
 *
 * The card falls straight back to the Pexels photograph and the badge returns
 * to "Representative image" on its own — there is nothing else to undo.
 */
export async function removeDecorPhoto(itemId) {
  const { data: files } = await supabase.storage.from(BUCKET).list(`${PREFIX}/${itemId}`)
  if (files?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(files.map(f => `${PREFIX}/${itemId}/${f.name}`))
  }
  const { error } = await supabase.from('decor_photos').delete().eq('item_id', itemId)
  if (error) throw error
}

export { isMissingTable }
