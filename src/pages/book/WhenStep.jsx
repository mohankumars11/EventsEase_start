import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { StepFrame } from '../../components/journey/JourneyChrome'
import { EVENT_DATA } from '../../data/eventServicesData'
import { setEventDate, planHrefFor } from '../../hooks/useEventDate'

/**
 * "When is it?" — the one question that decides everything after it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE OCCASION GRID NOW COMES HERE FIRST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tapping "Birthday" used to go straight to /celebrate/birthday — the
 * twenty-nine chapter journey — whatever the date was. That is right for
 * a wedding in October and wrong for a birthday on Saturday: a family
 * three days out does not want to be asked which gravies go with the
 * chapati, they want a decorator.
 *
 * It also made instant booking invisible. The flow existed and was
 * reachable only by tapping the date card on the home screen first, so
 * somebody opening the app and tapping the thing they came for never saw
 * it at all.
 *
 * So the grid asks WHEN, and `planHrefFor` decides the rest:
 *
 *   0–2 days    → book directly. A coordinator cannot source by Saturday.
 *   3–30 days   → the two doors. Both are real; the customer picks.
 *   31+ days    → the guided journey, unchanged.
 *   flexible    → the journey, whatever the date.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DATE IS SAVED, NOT JUST PASSED
 * ══════════════════════════════════════════════════════════════════════
 *
 * `setEventDate` writes to the shared store every calendar in this app
 * reads. Without it the next screen would ask again — which is the exact
 * complaint hooks/useEventDate was built to end, and its header describes
 * the app looking like it had not been listening.
 */

function nextDays(n = 21) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const dayLabel = (d, i) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
    : d.toLocaleDateString('en-IN', { weekday: 'short' })

export default function WhenStep() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const occasionId = params.get('occasion')
  const occasion = occasionId ? EVENT_DATA[occasionId] : null

  function choose(d, flexible = false) {
    const picked = {
      event_date: d ? d.toISOString().slice(0, 10) : null,
      flexible_date: flexible,
    }
    if (picked.event_date) setEventDate(picked)
    navigate(planHrefFor(picked, occasionId))
  }

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
        question="When is it?"
        why="Close by, and we can book you masters directly. Further out, a coordinator plans it with you."
      >
        <div className="grid grid-cols-4 gap-2">
          {nextDays().map((d, i) => (
            <button
              key={i}
              onClick={() => choose(d)}
              className="rounded-2xl bg-white px-2 py-3 text-center ring-1 ring-ink/[0.08] transition active:scale-[0.97]"
            >
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-ink-mute">
                {dayLabel(d, i)}
              </span>
              <span className="mt-0.5 block text-[17px] font-extrabold tabular-nums text-ink">
                {d.getDate()}
              </span>
              <span className="block text-[9.5px] font-bold text-ink-mute">
                {d.toLocaleDateString('en-IN', { month: 'short' })}
              </span>
            </button>
          ))}
        </div>

        {/* Both real answers for somebody who cannot name a day. A date
            picker that only accepts a date turns "sometime in December"
            into a guess, and a guessed date blocks a real master's real
            calendar. */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => choose(null, true)}
            className="w-full rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-ink/[0.08] transition active:scale-[0.99]"
          >
            <span className="block text-[14px] font-extrabold text-ink">Further ahead</span>
            <span className="block text-[12px] font-semibold text-ink-mute">
              More than three weeks away — we will plan it with you
            </span>
          </button>

          <button
            onClick={() => choose(null, true)}
            className="w-full rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-ink/[0.08] transition active:scale-[0.99]"
          >
            <span className="block text-[14px] font-extrabold text-ink">Not fixed yet</span>
            <span className="block text-[12px] font-semibold text-ink-mute">
              We will work around it
            </span>
          </button>
        </div>
      </StepFrame>
    </div>
  )
}
