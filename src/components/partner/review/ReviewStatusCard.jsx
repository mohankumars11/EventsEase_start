import { Clock, ArrowRight, ChevronRight, CalendarDays, PlayCircle, Store, Info } from 'lucide-react'
import ReviewDial from '../ReviewDial'
import { useReviewClock } from '../ReviewCountdown'
import illustration from '../../../assets/review/reviewing.webp'

/**
 * What is happening to this partner's profile, while they wait.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS A COMPONENT, NOT A PICTURE OF ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The design came from a rendered mockup. Only the illustration is taken
 * from it — cropped to 24KB and marked decorative. Everything else reads
 * real state:
 *
 *   the ring and the numbers   `vendors.review_due_at`, via useReviewClock
 *   the trade name             the partner's own services
 *   the timestamp              `vendors.submitted_at`
 *   all four tap targets       real routes on the existing dashboard
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CLOCK IS THE BACKEND'S, NOT THIS SCREEN'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * `useReviewClock` counts toward `review_due_at`, which
 * `submit_for_review()` writes from `review_sla_hours()` and only an
 * operator can move with `extend_review()`. There is no
 * `setTimeout(24h)` here and the device clock decides nothing but the
 * current instant. Close the app, change the phone's time, come back:
 * the deadline is the same because it was never ours.
 *
 * The seconds are why it reads as running rather than as a label
 * somebody typed. The header pill shows the same instant as "23h" —
 * same hook, two renderings, so they cannot disagree.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY YELLOW, AND WHY NOTHING ON IT IS WHITE TEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `saffron-400` with `plum-950` measures 9.13:1 — the brief's #FFD21F is
 * within 1.15:1 of the token, so this uses the token and the design
 * system keeps one yellow. White text on that ground is **1.45:1** and
 * must never appear here; the only white type on this card is inside the
 * dark button, where it is 15.24:1.
 */
export default function ReviewStatusCard({
  dueAt,
  submittedAt,
  extended = 0,
  extensionNote = null,
  onOpenCalendar,
  onOpenHowItWorks,
  onOpenListing,
  listingCount = 0,
  listingNames = null,
}) {
  const { left, dial } = useReviewClock({ dueAt, submittedAt })
  const over = !!left?.over

  return (
    <section
      className="mb-4 overflow-hidden rounded-[22px] bg-saffron-400 p-4 text-plum-950"
      aria-label="Profile review"
    >
      <p className="flex items-center gap-2 text-[13px] font-extrabold">
        <Clock size={15} className="shrink-0" />
        With our team
      </p>

      {/* ── Three columns, never stacked ───────────────────────────────
          Headline and sentence on the left, ring in the middle,
          illustration on the right. Siblings in a flex, so the ring can
          never land on the headline and the illustration can never land
          on the ring — which is what happens when a decorative image is
          absolutely positioned and the text below it grows. */}
      <div className="mt-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[26px] font-extrabold leading-[1.05] tracking-tight">
            {over ? 'Still with our team' : 'We’re reviewing your profile'}
          </h2>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-plum-950/80">
            {over
              ? 'This is taking longer than the 24 hours we aim for. Somebody is on it — you do not need to do anything.'
              : 'Our team is verifying your details and listed services. This usually takes up to 24 hours.'}
          </p>
        </div>

        {/* The dial and the art share a column so the art cannot push
            the dial off the edge at 360px. */}
        <div className="relative flex shrink-0 items-start">
          <ReviewDial
            fraction={dial.fraction}
            label={dial.long ?? dial.label}
            sub={dial.sub}
            over={dial.over}
            tone="light"
            size={104}
          />
          {/* Decorative, and clipped by the card's overflow-hidden so it
              can bleed off the right edge the way the reference does
              without widening the card at 360px. */}
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            className="pointer-events-none -mr-8 -mt-1 hidden h-[118px] w-auto select-none xs:block"
          />
        </div>
      </div>

      {/* ── What happens next, in cream ────────────────────────────── */}
      <div className="mt-3 flex items-start gap-2.5 rounded-[16px] bg-white/60 px-3 py-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-600 text-white">
          <Info size={12} strokeWidth={3} />
        </span>
        <p className="text-[12px] font-semibold leading-snug text-plum-950/85">
          We will tell you the moment your listing goes live.
          {extended > 0
            ? ` We have extended the review ${extended === 1 ? 'once' : `${extended} times`}${extensionNote ? ` — ${extensionNote}` : ''}.`
            : ' If it takes a little longer, we will extend the window and keep you updated.'}
        </p>
      </div>

      {/* ── Two actions, never two yellow buttons ──────────────────── */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-plum-950 px-3 text-[13px] font-extrabold text-white transition active:scale-[0.98]"
        >
          <CalendarDays size={15} className="shrink-0" />
          <span className="truncate">Update calendar</span>
          <ArrowRight size={14} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={onOpenHowItWorks}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-white/75 px-3 text-[13px] font-extrabold text-plum-950 transition active:scale-[0.98]"
        >
          <PlayCircle size={15} className="shrink-0" />
          <span className="truncate">See how it works</span>
          <ArrowRight size={14} className="shrink-0" />
        </button>
      </div>

      {/* ── The thing actually being reviewed ──────────────────────────
          Rendered only when there is something to name. A row reading
          "See the listing being reviewed" above a blank line is worse
          than no row: it tells a partner something exists and then does
          not show it. */}
      {onOpenListing && listingCount > 0 && (
        <button
          type="button"
          onClick={onOpenListing}
          className="mt-2 flex w-full items-center gap-3 rounded-[16px] bg-white/60 px-3 py-2.5 text-left transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-plum-200 text-plum-800">
            <Store size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold leading-tight">
              {listingCount === 1
                ? 'See the listing being reviewed'
                : `See the ${listingCount} listings being reviewed`}
            </span>
            {listingNames && (
              <span className="mt-0.5 block truncate text-[12px] font-semibold text-plum-950/55">
                {listingNames}
              </span>
            )}
          </span>
          <ChevronRight size={16} className="shrink-0 text-plum-950/50" />
        </button>
      )}

      {submittedAt && (
        <p className="mt-2.5 text-[11.5px] font-bold text-plum-950/80">
          Sent {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {' · '}
          {new Date(submittedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </section>
  )
}
