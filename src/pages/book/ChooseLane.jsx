import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock, MessagesSquare } from 'lucide-react'
import { StepFrame } from '../../components/journey/JourneyChrome'
import { EVENT_DATA } from '../../data/eventServicesData'
import { INSTANT_HORIZON_DAYS, CHOOSE_MIN_DAYS } from '../../config/pricing'

/**
 * Two doors, for a date that is close enough to take either.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ASK AT ALL, HAVING ARGUED FOR A SILENT FORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * `planHrefFor` decides the lane from the date, and for most of the range
 * that decision is not a choice: a wedding in October cannot be
 * dispatched to a master's calendar today, and a decorator for tomorrow
 * cannot wait on a coordinator's callback. At those ends there is one
 * honest answer and asking would be theatre.
 *
 * The middle is different. A naming ceremony in three weeks can genuinely
 * go either way, and the two are not the same product:
 *
 *   · book now      you choose from a rate card, masters accept in
 *                   minutes, you pay only for the ones who said yes
 *   · plan it       a coordinator works through the detail, negotiates,
 *                   and brings back one price for the whole thing
 *
 * A customer who wanted the second and was silently given the first has
 * been handed a quick-booking flow for something they wanted to think
 * about — and the only way back is to abandon and start again.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEVER IN OUR WORDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Instant booking" and "pre-booking" are names for our machinery.
 * Thirty days is where our dispatch model stops working; it is not a fact
 * about anybody's celebration. So neither phrase appears on this screen.
 *
 * Each door says what the customer GETS, and the differences that
 * actually matter to them — how fast, who decides, when they pay. The
 * word "instant" is not one of those differences; "masters accept in
 * minutes" is the same fact stated as an outcome.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEITHER IS RECOMMENDED
 * ══════════════════════════════════════════════════════════════════════
 *
 * No default, no highlighted card, no "most popular" badge. Both get the
 * same weight, because a nudged choice on a screen with two legitimate
 * answers is `interface_interference` — one of the thirteen practices
 * named in config/legal.js — and because we genuinely do not know which
 * one a given family wants.
 */

const DOORS = [
  {
    id: 'instant',
    icon: Clock,
    title: 'Book masters now',
    lede: 'Pick what you need and we will find masters for it straight away.',
    points: [
      'Prices are on screen before you commit',
      'Masters accept in minutes, not days',
      'You pay only for the ones who say yes',
      'Their money is held until 24 hours after the day',
    ],
    cta: 'Start booking',
    href: (qs) => `/book/instant?${qs}`,
  },
  {
    id: 'plan',
    icon: MessagesSquare,
    title: 'Plan it properly',
    lede: 'A coordinator works through the detail with you and arranges the whole thing.',
    points: [
      'We ask about the food, the decor, the traditions',
      'One price for everything, negotiated for you',
      'Better for functions with a lot of moving parts',
      'Nothing to pay while we put it together',
    ],
    cta: 'Plan with a coordinator',
    href: (qs, occasionId) => (occasionId ? `/celebrate/${occasionId}?${qs}` : `/plan?${qs}`),
  },
]

export default function ChooseLane() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const dateISO = params.get('date')
  const occasionId = params.get('occasion')
  const occasion = occasionId ? EVENT_DATA[occasionId] : null

  const qs = params.toString()

  const { label, daysOut } = useMemo(() => {
    if (!dateISO) return { label: null, daysOut: null }
    // Midnight local. `new Date('2026-09-06')` is parsed as UTC and reads
    // as the 5th west of Greenwich — the kind of off-by-one that only
    // shows up for somebody in a timezone nobody tested in.
    const d = new Date(`${dateISO}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return {
      label: d.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
      }),
      daysOut: Math.round((d - today) / 86_400_000),
    }
  }, [dateISO])

  const away = daysOut === 0 ? 'today'
    : daysOut === 1 ? 'tomorrow'
    : daysOut != null ? `${daysOut} days away`
    : null

  return (
    <div className="a-canvas min-h-screen pb-16">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-ink-soft transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <StepFrame
        overline={occasion?.name ?? 'Your celebration'}
        question="How would you like to do this?"
        why={label ? `${label}${away ? ` · ${away}` : ''}. Close enough to book directly, far enough to plan it — both work.` : 'Both work. Pick whichever suits you.'}
      >
        <div className="space-y-3">
          {DOORS.map(door => {
            const Icon = door.icon
            return (
              <Link
                key={door.id}
                to={door.href(qs, occasionId)}
                /* Identical styling for both. See the header: a nudge on a
                   screen with two legitimate answers is interface
                   interference, and we do not know which one they want. */
                className="group block rounded-[26px] bg-white p-5 shadow-[0_14px_30px_-22px_rgba(42,30,20,0.35)] ring-1 ring-ink/[0.07] transition active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron-400/15 text-saffron-700">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-[21px] font-extrabold leading-tight text-ink">
                      {door.title}
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                      {door.lede}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5">
                  {door.points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/25" />
                      {p}
                    </li>
                  ))}
                </ul>

                <span className="mt-4 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-2.5 text-[13.5px] font-extrabold text-ink">
                  {door.cta}
                  <ArrowRight size={16} className="transition group-active:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-mute">
          You can switch later — nothing is charged either way until a master
          accepts and you agree the price.
        </p>
      </StepFrame>
    </div>
  )
}

