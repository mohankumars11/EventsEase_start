import { supabase } from './supabase'

/**
 * A partner's own work — the photographs, the video, the words.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS TABLE HAS BEEN WRITE-ONLY SINCE THE DAY IT SHIPPED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migration 110 created `partner_work`, gave it a review ladder and a
 * public read policy, and `AddItemFlow` has been inserting into it ever
 * since. Nothing has ever read it. Not the partner, not an operator, not
 * a customer — a repo-wide search for a SELECT against it returned
 * nothing at all.
 *
 * Three consequences, all of them live until now:
 *
 *   a partner uploads once, during the creation of their FIRST listing,
 *     and can never see it again — the `work` step is skipped on edit
 *
 *   `review_status` can never leave 'under_review', because nothing
 *     reads the queue, so the public policy (`review_status = 'live'`)
 *     has matched zero rows for its entire existence
 *
 *   three separate places tell the partner "you can add this later from
 *     your listing tab" — AddItemFlow twice, WorkUpload once. There has
 *     never been such a place
 *
 * So every byte a partner has uploaded is storage cost and nothing else.
 * This module is the missing half.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHAPED LIKE partnerDocuments.js, DELIBERATELY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Same bucket-with-signed-URLs problem, same "the migration may not be
 * applied yet" problem, so the same answers: `{ rows, unavailable }`
 * rather than a throw, and a null URL rather than an exception. A
 * partner on a bad connection gets a missing thumbnail, never a blank
 * screen where their listings were.
 */

const BUCKET = 'partner-uploads'

/* The two errors that mean "110 has not been applied here", rather than
   "something went wrong". Same list partnerDocuments.js uses. */
const isMissingTable = err =>
  err?.code === '42P01' || /relation .* does not exist/i.test(err?.message ?? '')

/**
 * Everything a partner has uploaded, in the order they arranged it.
 *
 * ── `serviceId` scopes it to one listing ────────────────────────────
 *
 * Without it this returns the whole body of work, which is what every
 * caller wanted while a partner had one trade. With it, a listing gets
 * its own uploads PLUS anything unscoped: a decorator's mandap photos
 * on the decoration card, their general work everywhere, and their
 * showreel nowhere near either.
 *
 * `service_id` arrived in migration 186. On a database where it has not
 * been pasted the filter would fail as an unknown column, so the query
 * falls back to the unscoped read rather than returning an empty
 * gallery — a partner seeing no photographs would reasonably conclude
 * the app had lost them.
 */
export async function fetchWork(vendorId, serviceId = null) {
  if (!vendorId) return { rows: [], unavailable: false }

  const base = () => supabase
    .from('partner_work')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (serviceId) {
    const { data, error } = await base().or(`service_id.is.null,service_id.eq.${serviceId}`)
    if (!error) return { rows: data ?? [], unavailable: false }
    if (!/service_id/.test(error?.message ?? '')) {
      return { rows: [], unavailable: isMissingTable(error) }
    }
    /* 186 not applied here — fall through to the unscoped read. */
  }

  const { data, error } = await base()
  if (error) return { rows: [], unavailable: isMissingTable(error) }
  return { rows: data ?? [], unavailable: false }
}

/**
 * Signed URLs for a whole gallery, in ONE request.
 *
 * `createSignedUrls` — plural — exists precisely for this. A twenty
 * photograph portfolio through the singular call is twenty round trips
 * on a phone, which is the difference between a strip that appears and
 * one that fills in over several seconds.
 *
 * Returns a map keyed by path, so a caller can look up whatever it has
 * without caring about ordering. A path that fails simply has no entry
 * and its tile renders as missing rather than as an error.
 */
export async function signedUrlsFor(paths, seconds = 600) {
  const wanted = [...new Set((paths ?? []).filter(Boolean))]
  if (!wanted.length) return {}

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(wanted, seconds)

  if (error) return {}
  return Object.fromEntries(
    (data ?? [])
      .filter(d => d.signedUrl && !d.error)
      .map(d => [d.path, d.signedUrl]))
}

/**
 * Save what WorkUpload collected.
 *
 * The rows AddItemFlow.submit() has always built, lifted out so there is
 * one definition of what a work row is. A testimonial with no body is
 * dropped — it is an empty quote, and an empty quote on a partner's
 * profile is worse than one fewer.
 *
 * `sort_order` continues from what they already have, so adding to a
 * portfolio appends rather than shuffling it.
 */
export async function addWork(vendorId, items, startAt = 0, serviceId = null) {
  if (!vendorId || !items?.length) return { added: 0, error: null }

  const rows = items.map((w, i) => ({
    vendor_id: vendorId,
    /* Stamped only when the upload happened inside a listing. Undefined
       rather than null when there is none, so the column is simply not
       sent and this still works where 186 is unapplied. */
    ...(serviceId ? { service_id: serviceId } : {}),
    kind: w.kind,
    storage_path: w.path ?? null,
    caption: w.caption?.trim() || null,
    said_by: w.said_by?.trim() || null,
    said_about: w.said_about?.trim() || null,
    body: w.body?.trim() || null,
    sort_order: startAt + i,
  })).filter(r => r.kind !== 'testimonial' || r.body)

  if (!rows.length) return { added: 0, error: null }

  const { error } = await supabase.from('partner_work').insert(rows)
  if (error) {
    // WorkUpload stores files before the review row. If the row write is
    // rejected (for example while a required media migration is pending),
    // remove only the newly uploaded objects so a failed save cannot leak
    // orphaned portfolio files.
    const uploadedPaths = rows.map(row => row.storage_path).filter(Boolean)
    if (uploadedPaths.length) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths).catch(() => {})
    }
  }
  return { added: error ? 0 : rows.length, error: error ?? null }
}

/** A caption or a quote, corrected. Never the review status. */
export async function updateWork(id, patch) {
  const { data, error } = await supabase
    .from('partner_work').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/**
 * The row first, then the file.
 *
 * That order on purpose. If the object delete fails we are left with a
 * file nobody references, which costs a fraction of a paisa. The other
 * order risks a row pointing at a file that is gone — a broken tile on
 * a partner's own portfolio, which they cannot fix and will report.
 */
export async function removeWork(row) {
  const { error } = await supabase.from('partner_work').delete().eq('id', row.id)
  if (error) throw error
  if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {})
  }
}

/** Swap two rows' places. Same two-write shape the listing arrows use. */
export async function reorderWork(a, b) {
  await supabase.from('partner_work').update({ sort_order: b.sort_order }).eq('id', a.id)
  await supabase.from('partner_work').update({ sort_order: a.sort_order }).eq('id', b.id)
}
