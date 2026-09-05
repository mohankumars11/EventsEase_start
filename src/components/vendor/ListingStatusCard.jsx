import { Check, Clock, Sparkles, AlertCircle, CalendarDays, ArrowRight } from 'lucide-react'

/**
 * Where a submitted listing actually is, and when it moves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE GAP THIS FILLS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner spends ten minutes describing their kitchen, taps Submit, and
 * then nothing happens for a day. No screen tells them what state they
 * are in, how long it takes, or what "under review" even means.
 *
 * That silence is the single most likely moment for somebody to lose
 * interest in the whole platform, and it is a silence we create. A
 * partner who cannot see progress assumes there is none.
 *
 * So the card shows the whole journey at once — where they have been,
 * where they are, and what comes next — with a real timeframe against the
 * middle step.
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

const STAGES = [
  { id: 'submitted', label: 'Submitted',      icon: Check },
  { id: 'review',    label: 'Under review',   icon: Clock },
  { id: 'live',      label: 'Ready for jobs', icon: Sparkles },
]

/* Each state paints the whole card, because the state IS the message.
   A grey card saying "live" and a grey card saying "rejected" make a
   partner read carefully to find out which; a green one and an amber one
   are understood from across a kitchen. */
const TONE = {
  review: {
    shell: 'bg-plum-950 text-white',
    chip: 'bg-saffron-400 text-plum-950',
    body: 'text-white/70',
    rule: 'bg-white/15',
  },
  live: {
    shell: 'bg-forest-700 text-white',
    chip: 'bg-white text-forest-800',
    body: 'text-white/75',
    rule: 'bg-white/20',
  },
  rejected: {
    shell: 'bg-amber-50 text-ink ring-1 ring-amber-300',
    chip: 'bg-amber-500 text-white',
    body: 'text-amber-900',
    rule: 'bg-amber-300/50',
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
  const at = STAGES.findIndex(s => s.id === (status === 'rejected' ? 'review' : status === 'live' ? 'live' : 'review'))
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

  return (
    <div className={`overflow-hidden rounded-[24px] ${tone.shell}`}>
      <div className="p-5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${tone.chip}`}>
          {status === 'live' ? <Sparkles size={12} />
            : status === 'rejected' ? <AlertCircle size={12} />
            : <Clock size={12} />}
          {status === 'live' ? 'Live' : status === 'rejected' ? 'Needs a change' : 'Under review'}
        </span>

        <p className="mt-3 font-display text-[23px] font-extrabold leading-tight">
          {headline}
        </p>

        <p className={`mt-1.5 text-[13px] leading-relaxed ${tone.body}`}>
          {status === 'live'
            ? 'Customers can see you from now. Jobs arrive with the price already on them — you tap yes or no.'
            : status === 'rejected'
              ? (note ?? 'We have written what to fix on each one. Change it and it goes straight back for checking.')
              : overdue
                ? 'This one is taking us longer than usual. It is read by a person and it has not been forgotten.'
                : 'Somebody at Sambramo reads every one by hand — usually within 24 hours.'}
        </p>

        {/* ── The journey ──────────────────────────────────────────────
            All three stages at once, because "under review" only means
            something next to what came before it and what comes after. */}
        <ol className="mt-4 flex items-start">
          {STAGES.map((s, i) => {
            const done = i < at || (status === 'live' && i <= at)
            const current = i === at && status !== 'live'
            const bad = current && status === 'rejected'
            const Icon = s.icon
            return (
              <li key={s.id} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    bad ? 'bg-amber-500 text-white'
                    : done ? (status === 'rejected' ? 'bg-amber-400 text-white' : 'bg-white text-plum-950')
                    : current ? `${tone.chip} animate-pulse`
                    : status === 'rejected' ? 'bg-amber-200 text-amber-800' : 'bg-white/15'
                  }`}>
                    {bad ? <AlertCircle size={15} /> : done ? <Check size={15} /> : <Icon size={15} />}
                  </span>
                  <span className={`text-center text-[10.5px] font-extrabold leading-tight ${
                    done || current ? '' : tone.body
                  }`}>
                    {s.label}
                  </span>
                  {/* The timing lives under the stage it belongs to. */}
                  {s.id === 'review' && status === 'review' && (
                    <span className={`text-center text-[9.5px] font-bold ${tone.body}`}>
                      {elapsed ? `sent ${elapsed}` : 'usually 24 hrs'}
                    </span>
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <span aria-hidden="true" className={`mt-4 h-[2px] w-full flex-1 ${
                    i < at ? 'bg-white' : tone.rule
                  }`} />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* ── The one thing worth doing next ─────────────────────────────
          Different in each state, and never nothing. A card with no next
          action is a card somebody reads once and never returns to. */}
      {status === 'review' && (
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex w-full items-center gap-3 border-t border-white/10 bg-white/[0.06] p-4 text-left transition active:bg-white/[0.12]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-plum-950">
            <CalendarDays size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold">Block the days you are busy</span>
            <span className="block text-[12px] leading-snug text-white/65">
              Two minutes, and it decides which jobs you are offered the day you go live.
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-white/60" />
        </button>
      )}

      {status === 'live' && (
        <button
          type="button"
          onClick={onOpenJobs}
          className="flex w-full items-center gap-3 border-t border-white/10 bg-white/[0.08] p-4 text-left transition active:bg-white/[0.14]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-forest-800">
            <Sparkles size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold">See your jobs</span>
            <span className="block text-[12px] leading-snug text-white/70">
              A typical job on Sambramo pays ₹6,587.
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-white/70" />
        </button>
      )}
    </div>
  )
}
