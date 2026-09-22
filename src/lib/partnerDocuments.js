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
 * Every document this partner has uploaded.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KEYED BY REQUIREMENT, NOT BY KIND
 * ══════════════════════════════════════════════════════════════════════
 *
 * `byKind` was the original index and it was wrong in a way that showed
 * as a tick rather than as a gap. Five trade requirements share the kind
 * 'shop_licence' -- a food licence, a venue lease, vehicle papers, agency
 * credentials, service credentials -- so a partner listing Catering AND
 * Venue had ONE slot for two unrelated documents, and `complianceDone`
 * counted both as satisfied off a single upload.
 *
 * Migration 143 re-keys the table on `requirement_id` and drops
 * UNIQUE (vendor_id, kind). `byRequirement` is the index that matches it.
 *
 * `byKind` is still returned for callers not yet moved across, and it is
 * lossy ON PURPOSE where two requirements share a kind -- last row wins.
 * Do not add a new caller to it.
 *
 * Returns `{ byRequirement, byKind, rows, unavailable }`. `unavailable`
 * means 093 has not been applied to this database -- a state the caller
 * renders as "not here" rather than as an error.
 */
export async function fetchDocuments(vendorId) {
  if (!vendorId) return { byRequirement: {}, byKind: {}, rows: [], unavailable: false }

  const { data, error } = await supabase
    .from('vendor_documents')
    .select('*')
    .eq('vendor_id', vendorId)

  if (error) {
    return { byRequirement: {}, byKind: {}, rows: [], unavailable: isMissingTable(error) }
  }

  const rows = data ?? []

  /* A row written before 143 has no requirement_id. It is indexed under
     its kind so nothing a partner already uploaded vanishes from the
     screen -- 143 backfills the column, but a device can read before
     that paste has happened. */
  const byRequirement = {}
  for (const r of rows) {
    byRequirement[r.requirement_id ?? `legacy:${r.kind}`] = r
  }

  return {
    byRequirement,
    byKind: Object.fromEntries(rows.map(r => [r.kind, r])),
    rows,
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
export async function uploadDocument({
  vendorId, requirementId, kind, file, side = 'front',
  number, holderName, issuingAuthority, issueDate, expiryDate,
  checksumOk, checksumRule, listingId, trade, existing,
}) {
  if (!vendorId) throw new Error('No partner profile yet.')
  if (!requirementId) throw new Error('Which requirement is this for?')
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
  /* The requirement is in the path, not just the kind. Two documents
     that share a kind -- a food licence and a venue lease are both
     'shop_licence' -- would otherwise be told apart only by a
     timestamp, which is not something a reviewer can read. */
  const path = `${vendorId}/${requirementId}-${side}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: body.type, upsert: false })

  if (upErr) {
    if (isMissingBucket(upErr)) {
      throw new Error('Document uploads are not switched on yet. Our team will be in touch.')
    }
    throw new Error(upErr.message)
  }

  /* ── One row per requirement, two sides on it ──────────────────────
     A second row for the back would put the uniqueness rule back where
     143 took it from. The side decides which column the path lands in,
     and an existing row's other side is carried across so uploading a
     back does not erase the front. */
  const row = {
    vendor_id: vendorId,
    requirement_id: requirementId,
    kind,
    listing_id: listingId ?? null,
    trade: trade ?? null,
    file_name: file.name ?? null,
    mime_type: body.type ?? null,
    byte_size: body.size ?? null,
  }

  if (side === 'back') {
    row.back_path = path
    row.storage_path = existing?.storage_path ?? path
  } else {
    row.storage_path = path
    if (existing?.back_path) row.back_path = existing.back_path
  }

  /* Only ever the last four. The full number is not stored, and for
     Aadhaar that is not a preference -- the Act restricts it. */
  if (number != null && String(number).trim() !== '') {
    /* Was `/s/g`, which is not the same thing as `/\s/g` and behaved
       nothing like it: it stripped every lowercase LETTER S and left
       whitespace untouched. A number typed with spaces kept them, and
       the CHECK at 093:153 (`^[A-Z0-9]{4}$`) then rejected the row with
       a raw Postgres constraint error in front of the partner. */
    row.number_last4 = String(number).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-4)
  }
  if (holderName) row.holder_name = String(holderName).trim()
  if (issuingAuthority) row.issuing_authority = String(issuingAuthority).trim()
  if (issueDate) row.issue_date = issueDate
  if (expiryDate) row.expires_on = expiryDate

  /* checksum_ok is write-once (142's guard raises on a later change), so
     it is sent only when this upload actually computed one. */
  if (typeof checksumOk === 'boolean' && existing?.checksum_ok == null) {
    row.checksum_ok = checksumOk
    row.checksum_rule = checksumRule ?? null
    row.checked_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('vendor_documents')
    .upsert(row, { onConflict: 'vendor_id,requirement_id' })
    .select()
    .maybeSingle()

  if (error) {
    /* The row did not land, so nothing will ever point at the file we
       just uploaded. Take it back out rather than paying for it forever
       -- the same reasoning contentStudio.js gives for its own cleanup. */
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(error.message)
  }

  return data
}

/**
 * The fields, without a new file.
 *
 * A number, a holder name, an expiry date -- everything the requirement
 * declares besides the images. Separate from `uploadDocument` because
 * that one demands a file and should keep demanding one: a call that
 * silently accepts `file: null` is a call that silently uploads
 * nothing.
 *
 * Upserts on (vendor_id, requirement_id), so this creates the row when
 * a partner fills the details in before photographing anything.
 */
export async function saveDocumentDetails({
  vendorId, requirementId, kind, listingId, trade, existing,
  number, holderName, issuingAuthority, issueDate, expiryDate,
  checksumOk, checksumRule, classification,
}) {
  if (!vendorId) throw new Error('No partner profile yet.')
  if (!requirementId) throw new Error('Which requirement is this for?')

  const row = {
    vendor_id: vendorId,
    requirement_id: requirementId,
    kind,
    listing_id: listingId ?? null,
    trade: trade ?? null,
  }

  /* storage_path is NOT NULL on vendor_documents (093), so a
     details-first save needs a placeholder until an image lands. The
     empty string is used rather than a fake path: nothing will try to
     sign it, and `evaluateRequirement` already treats a falsy
     storage_path as a missing front. */
  if (!existing?.storage_path) row.storage_path = ''

  if (number != null && String(number).trim() !== '') {
    row.number_last4 = String(number).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-4)
  }
  if (holderName != null) row.holder_name = String(holderName).trim() || null
  if (issuingAuthority != null) row.issuing_authority = String(issuingAuthority).trim() || null
  if (issueDate != null) row.issue_date = issueDate || null
  if (expiryDate != null) row.expires_on = expiryDate || null

  /* Write-once: 142's guard raises if checksum_ok is changed after the
     fact, so it is sent only when this save actually computed one. */
  if (typeof checksumOk === 'boolean' && existing?.checksum_ok == null) {
    row.checksum_ok = checksumOk
    row.checksum_rule = checksumRule ?? null
    row.checked_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('vendor_documents')
    .upsert(row, { onConflict: 'vendor_id,requirement_id' })
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
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
