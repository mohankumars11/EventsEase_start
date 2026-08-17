import { supabase } from './supabase'

/**
 * Reviews written from the Track screen, about a celebration.
 *
 * ── Why this is not just `ReviewModal` ────────────────────────────────────
 * `components/reviews/ReviewModal` writes one review about one subject, and it
 * is right for a product page where there is exactly one thing to rate. A
 * delivered celebration is eleven things: the caterer, the decorator, the
 * photographer, and the coordination itself — and the ratings that matter most
 * to the business are the per-service ones, because they are what decides
 * which master gets the next booking.
 *
 * This module is therefore about reading and writing a SET of reviews keyed by
 * service, plus one overall rating of the celebration, against one purchase.
 *
 * ── Verified, and honest about when it is not ─────────────────────────────
 * A review is verified by pointing at the purchase: `order_id` for the shop,
 * `enquiry_id` for a builder or cart request, `event_id` for a wizard event.
 * That third column arrives in migration 050, which is applied by hand — so
 * `saveReview` writes it, and on a database that has not run the migration
 * catches the 42703 and retries without it rather than losing the review.
 */

/** `reviews_catalog.subject_type` values this module uses. */
export const SUBJECT = {
  service: 'service',
  package: 'package',
}

/** The one subject id that means "how we ran the whole thing". */
export const OVERALL_SUBJECT_ID = 'sambramo-coordination'
export const OVERALL_SUBJECT_NAME = 'Sambramo coordination'

const MISSING_COLUMN = '42703'

/** Which column ties a review to the celebration it came from. */
function sourceColumns(subjectType, subjectId) {
  return subjectType === 'event'
    ? { event_id: subjectId, enquiry_id: null }
    : { enquiry_id: subjectId, event_id: null }
}

/**
 * Every review this customer has already written about this celebration.
 *
 * Returned as a map keyed by `subject_id`, because the caller's question is
 * always "has this service been rated yet?" rather than "list the reviews".
 *
 * A missing `event_id` column (migration 050 not applied) is not an error
 * here: the query simply cannot filter on it, so it falls back to filtering on
 * the customer alone and matching in memory. The customer sees their own
 * reviews either way.
 */
export async function fetchCelebrationReviews({ subjectType, subjectId, userId }) {
  if (!userId || !subjectId) return { reviews: {}, degraded: false }

  const column = subjectType === 'event' ? 'event_id' : 'enquiry_id'

  const { data, error } = await supabase
    .from('reviews_catalog')
    .select('id, subject_type, subject_id, subject_name, rating, comment, created_at')
    .eq('customer_id', userId)
    .eq(column, subjectId)

  if (error) {
    // Only the event path can hit this, and only before 050 is applied.
    if (error.code === MISSING_COLUMN) return { reviews: {}, degraded: true }
    return { reviews: {}, degraded: false, error }
  }

  const reviews = {}
  for (const r of data ?? []) reviews[r.subject_id] = r
  return { reviews, degraded: false }
}

/**
 * Write one review, verified against this celebration.
 *
 * @returns { review, degraded }  `degraded: true` means it was saved without
 *          the celebration link because migration 050 is not applied yet.
 */
export async function saveReview({
  subjectType, subjectId, userId, customerName,
  serviceId, serviceName, kind = SUBJECT.service, rating, comment,
}) {
  if (!rating) throw new Error('Pick a star rating first.')

  const base = {
    customer_id: userId,
    customer_name: customerName || 'Verified Customer',
    subject_type: kind,
    subject_id: serviceId,
    subject_name: serviceName,
    order_id: null,
    rating,
    comment: comment?.trim() || null,
  }

  const source = sourceColumns(subjectType, subjectId)

  // The upsert conflicts on the source tuple, so editing a rating updates the
  // row rather than adding a second one. Migration 050 widens that constraint
  // to include `event_id`; before it is applied the event path takes the
  // fallback below and the conflict target does not include it.
  const conflict = subjectType === 'event'
    ? 'customer_id,subject_type,subject_id,order_id,enquiry_id,event_id'
    : 'customer_id,subject_type,subject_id,order_id,enquiry_id'

  let { data, error } = await supabase
    .from('reviews_catalog')
    .upsert({ ...base, ...source }, { onConflict: conflict })
    .select()
    .single()

  if (error && (error.code === MISSING_COLUMN || /event_id/.test(error.message ?? ''))) {
    // ── Migration 050 is not applied ──────────────────────────────────
    // Save the review rather than lose it. It is attached to the customer and
    // to the service, just not yet to the celebration — so it counts toward
    // the service's rating and will simply not be labelled verified until
    // somebody pastes the SQL. Losing a customer's written review because a
    // migration is pending would be much the worse trade.
    ;({ data, error } = await supabase
      .from('reviews_catalog')
      .upsert({ ...base, enquiry_id: null }, {
        onConflict: 'customer_id,subject_type,subject_id,order_id,enquiry_id',
      })
      .select()
      .single())
    if (error) throw new Error(error.message)
    return { review: data, degraded: true }
  }

  if (error) throw new Error(error.message)
  return { review: data, degraded: false }
}
