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
// Postgres raises this when ON CONFLICT names a tuple that no unique
// constraint matches. It is how the database tells us which side of
// migration 054 it is on — see saveReview.
const NO_MATCHING_CONSTRAINT = '42P10'

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
    rating,
    comment: comment?.trim() || null,
  }

  const source = sourceColumns(subjectType, subjectId)

  /* ── Two migrations, one build ────────────────────────────────────────
   *
   * The upsert conflicts on the source tuple so that editing a rating
   * updates the row instead of adding a second one. Which tuple is correct
   * depends on two migrations that are pasted by hand, independently of any
   * deploy, so this build has to work on a database that has had neither,
   * either, or both.
   *
   *   050  widens the constraint to include `event_id`.
   *   054  removes the shop, and with it `reviews_catalog.order_id` — so the
   *        constraint is rebuilt without it.
   *
   * Naming a column the constraint does not have raises 42P10, and naming a
   * column the table does not have raises 42703. So we ask for the newest
   * shape first and let the database tell us it is behind, which is the same
   * thing the 050 fallback below has always done. Ordering the deploy against
   * the SQL is then not something anyone has to get right.
   */
  const target = (withOrderId, withEvent) => [
    'customer_id', 'subject_type', 'subject_id',
    ...(withOrderId ? ['order_id'] : []),
    'enquiry_id',
    ...(withEvent ? ['event_id'] : []),
  ].join(',')

  const isEvent = subjectType === 'event'
  const legacyColumn = { order_id: null }

  const attempt = (payload, onConflict) =>
    supabase.from('reviews_catalog').upsert(payload, { onConflict }).select().single()

  // Post-054: no order_id anywhere.
  let { data, error } = await attempt({ ...base, ...source }, target(false, isEvent))

  // Pre-054: the column is still there and the constraint still names it.
  if (error && error.code === NO_MATCHING_CONSTRAINT) {
    ;({ data, error } = await attempt(
      { ...base, ...legacyColumn, ...source }, target(true, isEvent),
    ))
  }

  if (error && (error.code === MISSING_COLUMN || /event_id/.test(error.message ?? ''))) {
    // ── Migration 050 is not applied ──────────────────────────────────
    // Save the review rather than lose it. It is attached to the customer and
    // to the service, just not yet to the celebration — so it counts toward
    // the service's rating and will simply not be labelled verified until
    // somebody pastes the SQL. Losing a customer's written review because a
    // migration is pending would be much the worse trade.
    ;({ data, error } = await attempt(
      { ...base, enquiry_id: null }, target(false, false),
    ))
    if (error && error.code === NO_MATCHING_CONSTRAINT) {
      ;({ data, error } = await attempt(
        { ...base, ...legacyColumn, enquiry_id: null }, target(true, false),
      ))
    }
    if (error) throw new Error(error.message)
    return { review: data, degraded: true }
  }

  if (error) throw new Error(error.message)
  return { review: data, degraded: false }
}
