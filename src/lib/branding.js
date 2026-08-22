import { supabase } from './supabase'
import { compressImage, extFor } from './imageUpload'

const BUCKET = 'product-images'
const PREFIX = 'brand'

/**
 * The logo the app draws, and how an admin replaces it.
 *
 * ── Why the fetch is a module-level promise ───────────────────────────────
 * The mark renders in the app bar, the tab bar, every celebration card, both
 * auth screens and the splash. If each of those asked the database, opening
 * Home would fire twenty identical queries for one string.
 *
 * So the query happens once per page load and every consumer awaits the same
 * promise. That is also why this is not React context: the value is
 * effectively static for a session, and threading a provider through would
 * make a component that just wants to draw a logo depend on being inside it.
 *
 * ── It must work before migration 056 is pasted ───────────────────────────
 * Same contract as the rest of the app: a missing table resolves to null and
 * every surface draws the built-in Spencerian mark. Nobody sees an error,
 * because there is nothing they could do about one, and the app has a
 * perfectly good logo either way.
 */
const ABSENT = new Set(['42P01', 'PGRST205', 'PGRST204', '42703'])
const isAbsent = e =>
  !!e && (ABSENT.has(e.code) || /does not exist|schema cache/i.test(e.message ?? ''))

let cache = null

/** `{ url, alt }`, or `{ url: null }` when nothing has been uploaded. */
export function fetchBranding() {
  if (cache) return cache
  cache = supabase
    .from('app_branding')
    .select('logo_url, logo_alt')
    .eq('id', 'default')
    .maybeSingle()
    .then(({ data, error }) => {
      if (error && !isAbsent(error)) {
        // A real error is still not the customer's problem — the fallback
        // mark is not a degraded experience, it is the design.
        return { url: null, alt: 'Sambramo' }
      }
      return { url: data?.logo_url ?? null, alt: data?.logo_alt ?? 'Sambramo' }
    })
    // A failed fetch must not poison the cache for the rest of the session.
    .catch(() => { cache = null; return { url: null, alt: 'Sambramo' } })
  return cache
}

/** Drop the memo so the next read sees a fresh upload. */
export function invalidateBranding() {
  cache = null
}

/**
 * Replace the logo.
 *
 * ── Why the path is timestamped and the old file is left ──────────────────
 * Overwriting a fixed path means every cached copy in every browser and CDN
 * keeps serving the old mark, and the admin who just uploaded concludes it
 * did not work. A new path per upload is its own cache-buster. The previous
 * file is not deleted: it costs nothing, and it is the only way back if
 * somebody uploads the wrong image on a Friday.
 *
 * ── Why it is compressed but not resized hard ─────────────────────────────
 * A logo is drawn at 132px on the splash and 20px in a tab bar, so it needs
 * enough pixels for the largest use on a 3x screen — about 400px — and no
 * more. `compressImage` caps the long edge at 1600 and re-encodes; that is
 * generous rather than wasteful, and it keeps a PNG's transparency, which a
 * hard resize to 400 would not be worth risking.
 */
export async function uploadLogo(file, { userId } = {}) {
  if (!file) throw new Error('Choose a file first.')
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
    throw new Error('PNG, JPG, WEBP or SVG only.')
  }

  // SVG is already vector and canvas compression would rasterise it, which is
  // the one thing you must not do to a logo somebody supplied as vector.
  const isSvg = file.type === 'image/svg+xml'
  const blob = isSvg ? file : await compressImage(file)
  const ext = isSvg ? 'svg' : extFor(blob.type)
  const path = `${PREFIX}/logo-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: isSvg ? 'image/svg+xml' : blob.type,
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = pub?.publicUrl
  if (!url) throw new Error('Uploaded, but no public URL came back.')

  const { error: rowError } = await supabase
    .from('app_branding')
    .update({ logo_url: url, updated_at: new Date().toISOString(), updated_by: userId ?? null })
    .eq('id', 'default')

  if (rowError) {
    if (isAbsent(rowError)) {
      throw new Error('The file uploaded, but migration 056 has not been applied — paste supabase/migrations/056_app_branding.sql and upload again.')
    }
    throw new Error(rowError.message)
  }

  invalidateBranding()
  return url
}

/** Put the drawn mark back. The uploaded file is left in storage. */
export async function clearLogo() {
  const { error } = await supabase
    .from('app_branding')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', 'default')
  if (error) throw new Error(error.message)
  invalidateBranding()
}
