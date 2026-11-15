/**
 * "Continue your Haldi Ceremony" — the celebration the customer started
 * and left, offered on Home until it is finished or dismissed (Mohan,
 * 2026-11-13: "like how Rapido keeps popping up the booking you started").
 * One tap goes back to the exact screen (lib/progress); the × hides it,
 * and the plan stays saved under My Bookings.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { STAGES, dismissProgress, latestProgress, onProgress } from '../lib/progress'
import { dayLabel } from '../lib/format'
import { usePlan } from '../state/PlanContext'
import OccasionLogo from './OccasionLogo'

export default function ResumeBar({ className = '' }) {
  const plan = usePlan()
  const [p, setP] = useState(() => latestProgress())
  useEffect(() => onProgress(() => setP(latestProgress())), [])
  const o = p ? OCCASION[p.occasionId] : null
  if (!o) return null
  const date = plan.event.occasionId === o.id && plan.event.date ? dayLabel(plan.event.date) : null
  const next = STAGES[p.stage]
  return (
    <div className={'cx-rise relative mx-3 overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1.5px_#E3D5FA,0_16px_32px_-22px_rgba(58,18,144,.7)] ' + className} data-resume-bar={o.id}>
      <Link to={p.path} className="cx-press flex items-center gap-3 p-2.5 pr-11" data-resume-go>
        <OccasionLogo occasion={o} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#6D28D9]"><span className="cx-live-dot h-2 w-2 rounded-full bg-[#F59E0B]" />Pick up where you left off</span>
          <span className="block truncate text-[14.5px] font-black tracking-[-0.02em] text-[#1C1033]">{o.name}{date ? ` · ${date}` : ''}</span>
          <span className="mt-1 flex items-center gap-1" aria-label={`Step ${p.stage + 1} of 5`}>
            {STAGES.map((s, i) => <span key={s} className={'h-[4px] flex-1 rounded-full ' + (i < p.stage ? 'bg-[#16A34A]' : i === p.stage ? 'bg-[#7C3AED]' : 'bg-[#EEE9F5]')} />)}
          </span>
          <span className="mt-0.5 block text-[11px] font-bold text-[var(--ink-3)]">Step {p.stage + 1} of 5 · {next}</span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white"><ChevronRight size={18} strokeWidth={2.8} /></span>
      </Link>
      <button type="button" onClick={() => dismissProgress(o.id)} aria-label="Dismiss" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#F4F1F8] text-[var(--ink-3)]" data-resume-dismiss><X size={14} /></button>
    </div>
  )
}
