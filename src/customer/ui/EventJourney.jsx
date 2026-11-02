/**
 * Where the customer is in planning their event (spec 2026-11-02 §7) —
 * five named stages instead of a thin bar: done ones carry a green tick,
 * the current one is Royal Amethyst, the rest wait quietly. Finished
 * stages link back; the rail never jumps ahead of an unfinished one.
 */
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const STAGES = ['Details', 'Your plan', 'Preferences', 'Masters', 'Confirm']
const ROUTE = id => [`/o/${id}`, `/o/${id}/plan`, `/o/${id}/plan`, `/o/${id}/live`, '/plans']

export default function EventJourney({ at = 0, occasionId = null }) {
  const to = occasionId ? ROUTE(occasionId) : []
  return (
    <ol className="mx-3 flex items-start" aria-label={`Step ${at + 1} of ${STAGES.length}: ${STAGES[at]}`} data-journey={at}>
      {STAGES.map((label, i) => {
        const done = i < at, now = i === at
        const dot = (
          <span className={'grid h-[22px] w-[22px] place-items-center rounded-full text-[10.5px] font-black transition-colors ' +
            (done ? 'bg-[#16A34A] text-white' : now ? 'bg-[#6D28D9] text-white shadow-[0_0_0_4px_#EDE4FF]' : 'bg-white text-[#B3AAC4] shadow-[inset_0_0_0_1.5px_#E2DCEC]')}>
            {done ? <Check size={12} strokeWidth={3.4} /> : i + 1}
          </span>
        )
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <span className={'h-[2px] flex-1 ' + (i === 0 ? 'opacity-0' : done || now ? 'bg-[#86D4A4]' : 'bg-[#ECE8F3]')} />
              {done && to[i] ? <Link to={to[i]} aria-label={`Back to ${label}`}>{dot}</Link> : dot}
              <span className={'h-[2px] flex-1 ' + (i === STAGES.length - 1 ? 'opacity-0' : done ? 'bg-[#86D4A4]' : 'bg-[#ECE8F3]')} />
            </div>
            <span className={'w-full truncate px-0.5 text-center text-[10px] font-extrabold ' + (now ? 'text-[#4C1D95]' : done ? 'text-[#15803D]' : 'text-[#ADA4BE]')}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
