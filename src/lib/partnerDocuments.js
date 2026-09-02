import { supabase } from './supabase'
import { compressImage } from './imageUpload'
import { isMissingTable } from './serviceCatalog'

/**
 * A partner's proof of who they are (migration 093).
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * The app tells a customer "we check every master before sending them
 * work", and until 093 there was nowhere in the schema to put the thing
 * being checked. An operator approving a decorator was approving a
 * business name and a pincode somebody typed into a form.
 *
 * ── Optional, and it has to stay that way for now ────────────────────
 * A master signing up on a Sunday does not have a scan of their PAN to
 * hand, and a hard gate at that moment costs us the supply this business
 * does not yet have. So nothing here blocks anything. Uploading is what
 * turns "under review" into a verified badge faster, and the screen says
 * so rather than demanding.
 *
 * ── The bucket is PRIVATE, which changes how reading works ───────────
 * Every other bucket in this codebase is public-read, correctly, because
 * they hold shop photographs. This one holds government ID, so there is
 * no durable URL to store or cache: `signedUrlFor` mints a short-lived
 * one at the moment somebody taps "View". A URL kept in state would be
 * an expired string within the hour, which is exactly the bug that shape
 * invites.
 *
 * ── Absent-table tolerance is deliberate ─────────────────────────────
 * Migrations here are applied by hand in the Supabase dashboard, so
 * "the code is deployed and 093 is not pasted yet" is a normal state
 * that lasts as long as it takes somebody to open a browser tab. Every
 * read returns `{ unavailable: true }` rather than throwing, and the
 * Account screen hides the section instead of showing a red box a
 * partner can do nothing about. Same call decorPhotos.js made.
 */

const BUCKET = 'partner-documents'

/** Storage's own "no such bucket", which is not a Postgres code. */
function isMissingBucket(error) {
  if (!error) return false
  return /bucket not found|not found/i.test(error.message ?? '')
}

/**
 * What we ask for, in the order it is worth asking.
 *
 * Aadhaar first because every master in this market has one on their
 * phone already; PAN second because it is the one the payout side will
 * eventually need anyway (TDS above ₹20,000 a year — see PayoutDetails).
 * GST and a shop licence are for the businesses large enough to have
 * them, and are worth showing precisely because most partners will not:
 * a decorator who HAS a GST number is telling a reviewer something real
 * about the size of their operation.
 */
export const DOCUMENT_KINDS = [
  {
    id: 'aadhaar',
    label: 'Aadhaar card',
    hint: 'Front side is enough. This is the fastest way to get verified.',
    last4Label: 'Last 4 digits',
    last4Pattern: /^[0-9]{4}$/,
    last4Hint: 'The last four digits only — we never store the full number.',
    recommended: true,
  },
  {
    id: 'pan',
    label: 'PAN card',
    hint: 'Needed once your earnings pass ₹20,000 in a year. Adding it now saves a chase later.',
    last4Label: 'Last 4 characters',
    last4Pattern: /^[0-9A-Z]{4}$/,
    last4Hint: 'The last four characters of the PAN, e.g. 234F.',
    recommended: true,
  },
  {
    id: 'gst',
    label: 'GST certificate',
    hint: 'Only if your business is registered. Most masters are not, and that is fine.',
    last4Label: 'Last 4 characters',
    last4Pattern: /^[0-9A-Z]{4}$/,
    last4Hint: 'The last four characters of the GSTIN.',
  },
  {
    id: 'shop_licence',
    label: 'Shop or trade licence',
    hint: 'A municipal licence, a Udyam certificate, or anything official with your business name on it.',
  },
]

export const KIND_BY_ID = Object.fromEntries(DOCUMENT_KINDS.map(k => [k.id, k]))

/* ═══════════════════════════════════════════════════════════
   Reading
═══════════════════════════════════════════════════════════ */

/**
 * Every document this partner has uploaded, keyed by kind.
 *
 * Returns `{ byKind, unavailable }`. `unavailable` means 093 has not been
 * applied to this database yet — a state the caller renders as "not here"
 * rather than as an error.
 */
export async function fetchDocuments(vendorId) {
  if (!vendorId) return { byKind: {}, unavailable: false }

  const { data, error } = await supabase
    .from('vendor_documents')
    .select('*')
    .eq('vendor_id', vendorId)

  if (error) {
    return { byKind: {}, unavailable: isMissingTable(error) }
  }

  return {
    byKind: Object.fromEntries((data ?? []).map(r => [r.kind, r])),
    unavailable: false,
  }
}

/**
 * A URL that works for ten minutes and then does not.
 *
 * Ten rather than an hour: this is opened by tapping "View", looked at,
 * and closed. A URL that outlives the glance is a URL that can be
 * forwarded, and the whole reason this bucket is private is that these
 * files should not travel.
 */
export async function signedUrlFor(storagePath) {
  if (!storagePath) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600)
  if (error) return null
  return data?.signedUrl ?? null
}

/* ═══════════════════════════════════════════════════════════
   Writing
═══════════════════════════════════════════════════════════ */

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Put one document in, and record that it is there.
 *
 * ── Photographs are compressed; PDFs are not ─────────────────────────
 * A phone camera produces a 4 MB JPEG of an Aadhaar card that is
 * completely legible at 1600px, and shipping the original over a
 * Bengaluru mobile connection is a minute of somebody's afternoon for no
 * gain. A PDF cannot go through a canvas at all, so it goes up as it is
 * and the size limit is the only guard.
 *
 * Quality is 0.9 rather than the 0.82 the shop uses. This is a document
 * with small print on it that a human has to read a number off; ringing
 * on the digits is the one artefact that would make the upload useless.
 *
 * ── The row is written AFTER the file lands ──────────────────────────
 * Reversed, a failed upload leaves a row pointing at nothing and the
 * reviewer's queue fills with documents that cannot be opened. This
 * order can instead leave an orphaned FILE if the row insert fails,
 * which costs storage and confuses nobody.
 */
export async function uploadDocument({ vendorId, kind, file, last4 }) {
  if (!vendorId) throw new Error('No partner profile yet.')
  if (!KIND_BY_ID[kind]) throw new Error('Unknown document type.')
  if (!file) throw new Error('Choose a file first.')

  const isPdf = file.type === 'application/pdf'
  if (!isPdf && !file.type?.startsWith('image/')) {
    throw new Error('Upload a photo or a PDF.')
  }

  const body = isPdf ? file : await compressImage(file, { maxEdge: 1600, quality: 0.9 })

  if (body.size > MAX_BYTES) {
    throw new Error('That file is too large. Try a photo instead of a scan.')
  }

  const ext = isPdf ? 'pdf' : (body.type === 'image/webp' ? 'webp' : 'jpg')
  const path = `${vendorId}/${kind}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: body.type, upsert: false })

  if (upErr) {
    if (isMissingBucket(upErr)) {
      throw new Error('Document uploads are not switched on yet. Our team will be in touch.')
    }
    throw new Error(upErr.message)
  }

  const row = {
    vendor_id: vendorId,
    kind,
    storage_path: path,
    file_name: file.name ?? null,
    mime_type: body.type ?? null,
    byte_size: body.size ?? null,
    number_last4: last4 ? String(last4).toUpperCase().slice(-4) : null,
  }

  const { data, error } = await supabase
    .from('vendor_documents')
    .upsert(row, { onConflict: 'vendor_id,kind' })
    .select()
    .maybeSingle()

  if (error) {
    /* The row did not land, so nothing will ever point at the file we
       just uploaded. Take it back out rather than paying for it forever
       — the same reasoning contentStudio.js gives for its own cleanup. */
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(error.message)
  }

  return data
}

/**
 * Take one back down.
 *
 * The row goes first here, unlike the upload. If the storage delete then
 * fails we are left with a file nothing points at, which costs a few
 * kilobytes; the other order would leave a row in the reviewer's queue
 * pointing at a file that no longer exists, which costs somebody's time.
 */
export async function removeDocument(row) {
  if (!row?.id) return
  const { error } = await supabase.from('vendor_documents').delete().eq('id', row.id)
  if (error) throw new Error(error.message)
  if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {})
  }
}

/* Asking to be checked — draft → submitted — is a plain column write on
   `vendors`, so it does NOT live here. It goes through the dashboard's own
   `updateVendor`, which echoes the row back into state; a second path to
   the same column would mean the screen and the account hook disagreeing
   about a partner's verification status. 067's guard trigger is what
   actually enforces that this is the only transition a partner may make. */
