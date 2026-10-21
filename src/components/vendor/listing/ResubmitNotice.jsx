import { Clock3, ShieldCheck } from 'lucide-react'

/**
 * What pressing Submit does to a listing that already exists.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAID AT THE BUTTON, BECAUSE THAT IS WHERE THE DECISION IS MADE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A note at the top of the review screen is read on the way in and
 * forgotten by the time the thumb reaches Submit. This sits directly
 * above the button, so the consequence and the action are on the same
 * line of sight.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO DIFFERENT CONSEQUENCES, AND THEY MUST NOT BE BLURRED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Under review: submitting again writes a new version and archives the
 * one being read (submit_listing_version), so the 24-hour clock really
 * does start again. Worth knowing before you press it.
 *
 * Live: the listing STAYS LIVE and stays bookable while the change is
 * read. That is deliberate policy, in migration 117 — "taking it down for
 * a price typo teaches partners never to update prices". So a live
 * partner must not be told they are going back into a 24-hour window:
 * it would be false, and the lesson they would learn from it is the one
 * that policy exists to prevent.
 */
export default function ResubmitNotice({ status }) {
  const s = String(status ?? '').toLowerCase()
  const live = s === 'live' || s === 'approved'
  const reviewing = s === 'under_review' || s === 'submitted'

  if (!live && !reviewing && !s) return null

  const { Icon, tone, title, body } = live
    ? {
        Icon: ShieldCheck,
        tone: 'bg-forest-50 text-forest-900 ring-forest-200',
        title: 'Your listing stays live',
        body: 'Customers can keep booking you. We review your changes within 24 hours, and they go live once approved.',
      }
    : reviewing
      ? {
          Icon: Clock3,
          tone: 'bg-amber-50 text-amber-900 ring-amber-200',
          title: 'This restarts your 24-hour review',
          body: 'Submitting again replaces the version we are reading, so the review starts over from now.',
        }
      : {
          Icon: Clock3,
          tone: 'bg-plum-50 text-plum-900 ring-plum-200',
          title: 'We review this within 24 hours',
          body: 'Your changes go to our team for a fresh read.',
        }

  return (
    <div className={`mb-2.5 flex items-start gap-2.5 rounded-2xl px-3 py-2.5 ring-1 ${tone}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="text-[12px] leading-snug">
        <span className="font-extrabold">{title}.</span>{' '}
        <span className="opacity-85">{body}</span>
      </p>
    </div>
  )
}
