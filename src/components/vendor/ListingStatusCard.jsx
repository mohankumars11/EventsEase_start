import { Clock, Sparkles, AlertCircle, CalendarDays, ArrowRight } from 'lucide-react'

/**
 * Where the account as a whole stands, in one strip.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SHRANK FROM 340px TO 72
 * ══════════════════════════════════════════════════════════════════════
 *
 * It was a full-bleed card with a headline, a paragraph, a three-stage
 * stepper with icons and timings, and a footer button — 340px, the top
 * third of the Listing tab, above the listings it was describing.
 *
 * Every one of those parts was right when a partner had ONE listing and
 * had just submitted it. With three listings it was wrong twice over:
 * the stepper says one thing about an account whose three listings are
 * in three different places, and each listing now carries its own four
 * beads on its own card, so the stepper was saying it a second time,
 * less accurately, in ten times the space.
 *
 * What survives is the part no per-listing card can say: how long the
 * wait has been, and the one thing worth doing while it lasts.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY "USUALLY WITHIN 24 HOURS" AND NOT A COUNTDOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * A ticking clock promises a moment. An operator reads these by hand and
 * a Saturday in wedding season is not a Tuesday morning; the first time a
 * countdown hits zero with nothing having happened, the partner stops
 * believing the rest of the app too.
 *
 * "Usually within 24 hours" is what actually happens, and the elapsed
 * time is shown honestly beside it — including when it has run over,
 * because a partner who can see we know it is late is being treated
 * better than one shown a frozen clock.
 */

/* ══════════════════════════════════════════════════════════════════════
   THE BLUE IS THE BRAND BLUE, NOT NAVY
   ══════════════════════════════════════════════════════════════════════

   This was plum-950 (#2e1065) — a near-black indigo that reads as navy
   on a phone and belongs to the customer app's chrome, not to the
   partner one. royal-600 (#2546eb) is the identity colour already in
   the palette: a real blue, bright enough that bold white on it is the
   crispest text pairing this app has.

   The white text here is font-extrabold at 14px and above for exactly
   that reason. Thin white on a mid blue is the one combination that
   looks fine on a designer's monitor and disappears in a decorator's
   hand in daylight. */
const TONE = {
  review: {
    shell: 'bg-royal-600 text-white',
    chip: 'bg-white/20 text-white',
    body: 'text-white/80',
    icon: Clock,
    word: 'Under review',
  },
  live: {
    shell: 'bg-forest-700 text-white',
    chip: 'bg-white/20 text-white',
    body: 'text-white/80',
    icon: Sparkles,
    word: 'Live',
  },
  rejected: {
    shell: 'bg-amber-50 text-ink ring-1 ring-amber-300',
    chip: 'bg-amber-500 text-white',
    body: 'text-amber-900',
    icon: AlertCircle,
    word: 'Needs a change',
  },
}

/** "3 hours ago", "2 days ago" — plain, and honest when it is late. */
function since(iso) {
  if (!iso) return null
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function ListingStatusCard({
  status = 'review',       // 'review' | 'live' | 'rejected'
  count = 1,
  submittedAt = null,
  note = null,
  onOpenCalendar,
  onOpenJobs,
}) {
  const tone = TONE[status] ?? TONE.review
  const Icon = tone.icon
  const elapsed = since(submittedAt)

  /* Over a day and still unread is a real state and the card says so.
     Pretending otherwise is how a partner discovers, on their own, that
     the app's timings are decorative. */
  const overdue = status === 'review' && submittedAt
    && Date.now() - new Date(submittedAt).getTime() > 24 * 3600 * 1000

  const headline =
    status === 'live' ? (count === 1 ? 'Your listing is live' : `All ${count} listings are live`)
    : status === 'rejected' ? (count === 1 ? 'One listing needs a change' : `${count} listings need a change`)
    : count === 1 ? 'We are reading your listing' : `We are reading your ${count} listings`

  const line =
    status === 'live' ? 'Jobs arrive with the price already on them. Tap yes or no.'
    : status === 'rejected' ? (note ?? 'What to fix is on each listing below.')
    : overdue ? 'Taking longer than usual. It is read by a person and it has not been forgotten.'
    : `Read by hand, usually within 24 hours${elapsed ? ` · sent ${elapsed}` : ''}.`

  return (
    <div className={`overflow-hidden rounded-[18px] ${tone.shell}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.chip}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-extrabold leading-tight">{headline}</p>
          <p className={`mt-0.5 text-[12px] font-semibold leading-snug ${tone.body}`}>{line}</p>
        </div>
        {status === 'live' && onOpenJobs && (
          <button
            type="button"
            onClick={onOpenJobs}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-forest-800"
          >
            Jobs
          </button>
        )}
      </div>

      {/* ── The one thing worth doing while they wait ─────────────────
          A whole footer button became one row. It is still here because
          the days a partner is busy decide which jobs they are offered
          on day one, and nothing else on this screen asks for them. */}
      {status === 'review' && onOpenCalendar && (
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex w-full items-center gap-2.5 border-t border-white/15 bg-white/[0.08] px-4 py-2.5 text-left transition active:bg-white/[0.16]"
        >
          <CalendarDays size={15} className="shrink-0 text-white/80" />
          <span className="min-w-0 flex-1 text-[12.5px] font-extrabold leading-snug">
            Block the days you are busy
            <span className="ml-1.5 font-semibold text-white/70">two minutes</span>
          </span>
          <ArrowRight size={15} className="shrink-0 text-white/70" />
        </button>
      )}
    </div>
  )
}
