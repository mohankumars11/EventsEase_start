import { useState, useEffect, useCallback } from 'react'
import { Star, Check, Loader2, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StarRatingInput from '../reviews/StarRatingInput'
import {
  fetchCelebrationReviews, saveReview, SUBJECT,
  OVERALL_SUBJECT_ID, OVERALL_SUBJECT_NAME,
} from '../../lib/celebrationReviews'

/**
 * How it actually went — rated per service, on the screen that tracked it.
 *
 * ── Why the reviews live in Track and not somewhere else ──────────────────
 * The one moment a customer will rate eleven services is the week after their
 * celebration, on the screen they already have open to look at it. A "rate
 * your booking" email lands to a 2% response rate; the same ask at the bottom
 * of the thing they are already reading, with each service already named and
 * one tap per rating, is the difference between having supplier data and not.
 *
 * And the business case is not really the star average. It is that
 * `event_vendor_options.quality_rating` and `reliability_score` exist on the
 * admin side with nothing feeding them — which service went well is the only
 * signal that decides which master gets the next wedding. This is where that
 * signal comes from.
 *
 * ── Why it does not appear before the celebration is over ─────────────────
 * A rating asked for mid-arrangement measures anxiety, not quality, and it
 * teaches customers that the star prompt is noise. The panel renders only once
 * the celebration has been delivered.
 *
 * ── Overall is a separate subject, deliberately ───────────────────────────
 * "How did we coordinate it" is a different question from "was the
 * photographer good", and collapsing them means a bad caterer sinks the
 * platform's own rating and vice versa. `OVERALL_SUBJECT_ID` keeps the
 * coordination rating on its own subject so both can be read independently.
 */
export default function CelebrationReviews({ subjectType, subjectId, ledger, className = '' }) {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState(null)      // null = loading
  const [degraded, setDegraded] = useState(false)

  const load = useCallback(() => {
    if (!user || !subjectId) { setReviews({}); return }
    let cancelled = false
    fetchCelebrationReviews({ subjectType, subjectId, userId: user.id }).then(res => {
      if (cancelled) return
      setReviews(res.reviews)
      if (res.degraded) setDegraded(true)
    })
    return () => { cancelled = true }
  }, [user, subjectType, subjectId])

  useEffect(() => load(), [load])

  if (!user) return null

  const services = ledger?.services ?? []
  const rated = reviews ? Object.keys(reviews).length : 0

  return (
    <section className={`overflow-hidden a-card ${className}`}>
      <div className="border-b border-hairline/[0.08] px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
          <Star size={15} className="text-saffron-500" /> How did it go?
        </h2>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          {rated > 0
            ? `Thank you — ${rated} rated. You can change any of these at any time.`
            : 'Rate each part of your celebration. It decides which masters we book for the next family, so it is worth the thirty seconds.'}
        </p>
      </div>

      {reviews === null ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunk/[0.06]" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-hairline/[0.06]">
          {/* Sambramo's own line first: it is the one rating the business is
              answerable for, and burying it under eleven suppliers is how it
              never gets given. */}
          <ReviewRow
            emoji="🪔"
            name={OVERALL_SUBJECT_NAME}
            hint="How we sourced, priced and ran the day"
            subjectId={OVERALL_SUBJECT_ID}
            kind={SUBJECT.package}
            existing={reviews[OVERALL_SUBJECT_ID]}
            subjectType={subjectType}
            trackedId={subjectId}
            user={user}
            profile={profile}
            onSaved={load}
            onDegraded={() => setDegraded(true)}
          />

          {services.map(svc => (
            <ReviewRow
              key={svc.key}
              emoji={svc.emoji}
              name={svc.name}
              hint={svc.detail}
              subjectId={svc.id ?? svc.key}
              kind={SUBJECT.service}
              existing={reviews[svc.id ?? svc.key]}
              subjectType={subjectType}
              trackedId={subjectId}
              user={user}
              profile={profile}
              onSaved={load}
              onDegraded={() => setDegraded(true)}
            />
          ))}
        </ul>
      )}

      {/* Said out loud rather than hidden: a review saved without its
          celebration link is still saved, and the customer is told what it
          does and does not carry. */}
      {degraded && (
        <p className="border-t border-hairline/[0.08] bg-surface-sunk/[0.04] px-4 py-2.5 text-[11px] leading-relaxed text-ink-mute">
          Your rating is saved. It is not yet linked to this celebration on our side, so it
          will show as unverified until we finish a pending update.
        </p>
      )}
    </section>
  )
}

/* ── One line ─────────────────────────────────────────────────────────── */

function ReviewRow({
  emoji, name, hint, subjectId, kind, existing,
  subjectType, trackedId, user, profile, onSaved, onDegraded,
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // A rating that arrived from the server after this row mounted (or after
  // somebody rated it) has to win, or editing one row would silently reset
  // the stars on another.
  useEffect(() => {
    setRating(existing?.rating ?? 0)
    setComment(existing?.comment ?? '')
  }, [existing?.rating, existing?.comment])

  /**
   * One tap on a star saves it.
   *
   * No "submit" for the rating itself, deliberately: the whole point of asking
   * here is that it costs nothing, and a two-step form on eleven services is
   * how you get one review instead of eleven. The comment box is the optional
   * second step for the one service somebody has something to say about.
   */
  async function commit(nextRating, nextComment = comment) {
    setBusy(true)
    setError(null)
    try {
      const { degraded } = await saveReview({
        subjectType,
        subjectId: trackedId,
        userId: user.id,
        customerName: profile?.full_name,
        serviceId: String(subjectId),
        serviceName: name,
        kind,
        rating: nextRating,
        comment: nextComment,
      })
      if (degraded) onDegraded?.()
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save that just now.')
    } finally {
      setBusy(false)
    }
  }

  function onStars(value) {
    setRating(value)
    commit(value)
    if (!existing) setOpen(true)     // offer the comment box once, after rating
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.06] text-[15px]">
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-extrabold text-ink">{name}</span>
          {hint && <span className="mt-0.5 block truncate text-[11px] text-ink-mute">{hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {busy && <Loader2 size={13} className="animate-spin text-ink-mute" />}
          {!busy && existing && <Check size={13} className="text-forest-600" />}
          <StarRatingInput value={rating} onChange={onStars} size={19} />
        </span>
      </div>

      {(open || existing?.comment) && (
        <div className="mt-2.5 pl-11">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            onBlur={() => { if (rating && comment !== (existing?.comment ?? '')) commit(rating) }}
            placeholder="Anything worth saying? (optional)"
            className="min-h-[64px] w-full resize-none rounded-xl bg-surface-sunk/[0.05] px-3 py-2 text-[12px] text-ink ring-1 ring-hairline/10 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {comment.trim() && (
            <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ink-mute">
              <MessageSquare size={10} /> Saved when you tap away.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1.5 pl-11 text-[11px] text-chilli-700">{error}</p>
      )}
    </li>
  )
}
