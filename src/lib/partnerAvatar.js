import { supabase } from './supabase'

/**
 * The partner's photograph (migration 129).
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS DOWNSCALED BEFORE IT LEAVES THE PHONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A photograph off a modern phone camera is three to eight megabytes.
 * The bucket's limit is three, so a straight upload would fail for most
 * people — and even under the limit, a partner on a mobile connection
 * paying for their own data should not spend eight megabytes on a
 * 40-pixel circle in a header.
 *
 * So the file is drawn into a canvas at 512px on its longest side and
 * re-encoded as JPEG. That is more than the header needs and enough for
 * a listing card, and it lands at roughly sixty kilobytes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PATH CARRIES THE VENDOR ID, BECAUSE THE POLICY READS IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `<vendor_id>/avatar-<epoch>.jpg`. The storage policy compares
 * `(storage.foldername(name))[1]` against the caller's own vendor rows,
 * which is what stops one partner overwriting another's photograph by
 * editing a path. The epoch defeats the CDN cache: replacing a picture
 * at a fixed name leaves the old one on screen for hours, and a partner
 * who cannot see their new photograph will upload it four more times.
 */

const BUCKET = 'partner-avatars'
const MAX_EDGE = 512
const QUALITY = 0.82

/** Absent-bucket and absent-column tolerance, as everywhere else here. */
const missing = error =>
  /avatar_url|column|bucket|not found|does not exist|schema cache/i.test(error?.message ?? '')

/**
 * Draw the file down to something sensible.
 *
 * Resolves to a Blob, or null if the browser could not read the file as
 * an image — a partner picking a PDF by accident gets told, not a
 * failed upload with a storage error in it.
 */
export async function downscale(file) {
  if (!file?.type?.startsWith('image/')) return null

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  /* White underneath: a transparent PNG re-encoded as JPEG goes black
     otherwise, and a partner's face on a black square is a bug report. */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return new Promise(resolve =>
    canvas.toBlob(b => resolve(b), 'image/jpeg', QUALITY))
}

/**
 * Upload and record it.
 *
 * The column is written only after the object is in the bucket — the
 * other order leaves a row pointing at a URL that 404s, which renders as
 * a broken image and is worse than no photograph.
 */
export async function uploadAvatar(vendorId, file) {
  if (!vendorId) return { ok: false, says: 'No account.' }

  const blob = await downscale(file)
  if (!blob) return { ok: false, says: 'That file is not an image we can read.' }

  const path = `${vendorId}/avatar-${Date.now()}.jpg`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (upErr) {
    return {
      ok: false,
      unavailable: missing(upErr),
      says: missing(upErr)
        ? 'Photographs are not switched on for this account yet.'
        : 'That did not upload. Try again.',
    }
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = pub?.publicUrl
  if (!url) return { ok: false, says: 'That did not upload. Try again.' }

  const { error: rowErr } = await supabase
    .from('vendors').update({ avatar_url: url }).eq('id', vendorId)

  if (rowErr) {
    /* The object is orphaned rather than left half-wired. A bucket with
       a stray file is tidier than a profile pointing at a picture the
       partner never sees applied. */
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    return { ok: false, unavailable: missing(rowErr), says: 'That did not save.' }
  }

  return { ok: true, url }
}

/** Take it off, and remove the object behind it. */
export async function removeAvatar(vendorId, currentUrl) {
  if (!vendorId) return { ok: false }

  const { error } = await supabase
    .from('vendors').update({ avatar_url: null }).eq('id', vendorId)
  if (error) return { ok: false, says: 'That did not save.' }

  /* Best effort. The column is what the app reads, so a file left in the
     bucket is invisible — and failing the whole action because a delete
     did not land would leave the partner with a picture they asked to
     remove still on screen. */
  const path = pathFromUrl(currentUrl)
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {})

  return { ok: true }
}

function pathFromUrl(url) {
  if (!url) return null
  const i = url.indexOf(`/${BUCKET}/`)
  return i === -1 ? null : url.slice(i + BUCKET.length + 2)
}

/** Two letters, for everyone who has not added a photograph. */
export function initialsFor(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('') || 'S'
}
