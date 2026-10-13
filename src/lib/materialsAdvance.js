/**
 * The materials advance: reading it, and uploading the evidence for it.
 *
 * ── The bucket, and why this one ───────────────────────────────────
 * `partner-documents`, not `partner-uploads`. Two reasons, both load-
 * bearing:
 *
 *   - its storage policies key on the VENDOR id
 *     (093:85-128), which is what a supplier bill belongs to. The
 *     `partner-uploads` policies key on auth.uid() (102:66-83) despite
 *     that file's own comment claiming otherwise.
 *   - operators can already read all of `partner-documents`, and an
 *     operator has to be able to open the bill to check it. Parts of
 *     `partner-uploads` are readable by anon for approved portfolio
 *     work -- the wrong neighbourhood for somebody's invoice.
 *
 * ── Object first, row second ───────────────────────────────────────
 * Same order as uploadDocument (partnerDocuments.js:227-295): put the
 * file in storage, then write the row, and delete the object if the row
 * fails. A row pointing at a file that is not there is a broken claim a
 * reviewer cannot action; an orphaned object is invisible and harmless.
 *
 * Paths are keys inside a PRIVATE bucket, never URLs. A URL in a column
 * outlives the permission that made it work, so every read goes through
 * a short-lived signed URL.
 */
import { supabase } from './supabase'
import { compressImage } from './imageUpload'

const BUCKET = 'partner-documents'
const MAX_BYTES = 10 * 1024 * 1024
const SIGNED_URL_SECONDS = 600

/** Storage's own "no such bucket", which is not a Postgres code. */
function isMissingBucket(error) {
  if (!error) return false
  return /bucket not found|not found/i.test(error.message ?? '')
}

/** The RPC is absent until 20261013_01 is pasted. That is not an error. */
export function isMissingFunction(error) {
  return error?.code === 'PGRST202' || error?.code === '42883'
}

export async function fetchLineAdvance(lineId) {
  if (!lineId) return null
  const { data, error } = await supabase.rpc('my_line_advance', { p_line_id: lineId })
  if (error) {
    if (isMissingFunction(error)) return null
    throw new Error(error.message)
  }
  return data ?? null
}

export async function signedUrlFor(storagePath) {
  if (!storagePath) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS)
  if (error) return null
  return data?.signedUrl ?? null
}

/** Signed URLs for a list of paths, as a map. Used for the goods photos. */
export async function signedUrlsFor(paths = []) {
  const real = paths.filter(Boolean)
  if (!real.length) return {}
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(real, SIGNED_URL_SECONDS)
  if (error) return {}
  return Object.fromEntries((data ?? []).map(d => [d.path, d.signedUrl]))
}

/**
 * Put one file in the bucket and return its key.
 *
 * `kind` is 'bill' or 'goods' and lands in the path, so a reviewer
 * opening the folder can tell an invoice from a photograph of a crate
 * without opening either.
 */
export async function uploadAdvanceFile({ vendorId, lineId, kind, file }) {
  if (!vendorId) throw new Error('No partner profile yet.')
  if (!file) throw new Error('Choose a file first.')

  const isPdf = file.type === 'application/pdf'
  if (!isPdf && !file.type?.startsWith('image/')) {
    throw new Error('Upload a photo or a PDF.')
  }

  /* A phone photo of a flower-market bill is routinely 4-8 MB and the
     bucket stops at 10. Compressing is the difference between a partner
     being able to claim and not. */
  const body = isPdf ? file : await compressImage(file, { maxEdge: 1600, quality: 0.9 })
  if (body.size > MAX_BYTES) {
    throw new Error('That file is too large. Try a photo rather than a scan.')
  }

  const ext = isPdf ? 'pdf' : (body.type === 'image/webp' ? 'webp' : 'jpg')
  const path = `${vendorId}/advance/${lineId}-${kind}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: body.type, upsert: false })

  if (error) {
    if (isMissingBucket(error)) {
      throw new Error('Uploads are not switched on yet. Our team will be in touch.')
    }
    throw new Error(error.message)
  }
  return { path, bytes: body.size, name: file.name ?? `${kind}.${ext}` }
}

export async function removeAdvanceFile(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

/** Ask for money to place an order. */
export async function requestAdvance({ lineId, paise, reason }) {
  const { data, error } = await supabase.rpc('request_materials_advance', {
    p_line_id: lineId, p_paise: paise, p_reason: reason,
  })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Send the bill and the photographs.
 *
 * The objects are uploaded first; if the row write fails, they are
 * removed again so a half-made claim does not sit in the bucket.
 */
export async function submitEvidence({
  lineId, vendorId, billFile, billAmountPaise, supplierName,
  goodsFiles = [], goodsLocation = null,
}) {
  if (!billFile) throw new Error('Attach the supplier bill.')
  if (!(billAmountPaise > 0)) throw new Error('What does the bill come to?')
  if (!supplierName?.trim()) throw new Error('Who did you buy from?')

  const uploaded = []
  try {
    const bill = await uploadAdvanceFile({ vendorId, lineId, kind: 'bill', file: billFile })
    uploaded.push(bill.path)

    const photos = []
    for (const f of goodsFiles) {
      const p = await uploadAdvanceFile({ vendorId, lineId, kind: 'goods', file: f })
      uploaded.push(p.path)
      photos.push({ path: p.path, at: new Date().toISOString() })
    }

    const { data, error } = await supabase.rpc('submit_advance_evidence', {
      p_line_id: lineId,
      p_bill_path: bill.path,
      p_bill_name: bill.name,
      p_bill_bytes: bill.bytes,
      p_bill_amount_paise: billAmountPaise,
      p_supplier_name: supplierName.trim(),
      p_goods_photos: photos,
      p_goods_location: goodsLocation,
    })
    if (error) throw new Error(error.message)
    return data
  } catch (e) {
    for (const p of uploaded) await removeAdvanceFile(p)
    throw e
  }
}
