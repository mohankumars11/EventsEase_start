/**
 * The When capsule: a desk-calendar block for the day and a clock face for
 * the start time, side by side. Tapping either opens the same sheet.
 */
import { CalendarDays } from 'lucide-react'
import { fromIso, timeLabel } from '../lib/format'

const DOW = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
const MON = new Intl.DateTimeFormat('en-IN', { month: 'short' })
const LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'long' })
const endOf = (t, h) => { const m = (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

/** A small analogue clock whose hands show `time` ('19:30'). */
export function ClockFace({ time, size = 44 }) {
  const [h, m] = time ? time.split(':').map(Number) : [10, 10]
  const hr = ((h % 12) + m / 60) * 30, mn = m * 6
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
      <defs><linearGradient id="cxclk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3ECFF" /><stop offset="1" stopColor="#E2D3FF" /></linearGradient></defs>
      <circle cx="22" cy="22" r="20.5" fill="url(#cxclk)" stroke="#D6C2FF" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="22" y1="4.5" x2="22" y2={i % 3 ? 6.5 : 8} stroke={i % 3 ? '#B9A3EC' : '#6A2BD9'} strokeWidth={i % 3 ? 1.2 : 2} strokeLinecap="round" transform={`rotate(${i * 30} 22 22)`} />
      ))}
      <line x1="22" y1="22" x2="22" y2="12.5" stroke="#2B0E66" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hr} 22 22)`} style={{ transition: 'transform .5s' }} />
      <line x1="22" y1="22" x2="22" y2="8" stroke="#6A2BD9" strokeWidth="2" strokeLinecap="round" transform={`rotate(${mn} 22 22)`} style={{ transition: 'transform .5s' }} />
      <circle cx="22" cy="22" r="2.4" fill="#2B0E66" />
      <circle cx="22" cy="22" r="1" fill="#F6B42C" />
    </svg>
  )
}

export default function WhenCapsule({ date, time, hours = null, onOpen, compact = false }) {
  const d = fromIso(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const rel = d ? Math.round((d - today) / 864e5) : null
  const sub = d ? (rel === 0 ? 'Today' : rel === 1 ? 'Tomorrow' : LONG.format(d)) : 'Pick a day'
  const [tm, ap] = time ? timeLabel(time).split(' ') : [null, null]
  return (
    <button type="button" onClick={onOpen} data-when
      className={'cx-press grid w-full grid-cols-2 gap-1.5 rounded-[24px] bg-[var(--am-100)] p-1.5 text-left ring-1 ring-[var(--am-200)] ' + (compact ? '' : 'shadow-[0_16px_32px_-24px_rgba(58,18,144,.7)]')}>
      <span className="flex items-center gap-3 rounded-[19px] bg-white p-2.5 pr-3">
        <span className="flex w-[46px] shrink-0 flex-col overflow-hidden rounded-[12px] text-center ring-1 ring-[var(--am-200)]">
          <span className="bg-[var(--brand-deep)] py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-white">{d ? DOW.format(d) : 'Day'}</span>
          <span className="cx-num py-0.5 text-[19px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--ink)]">{d ? d.getDate() : <CalendarDays size={17} className="mx-auto my-[3px] text-[var(--brand)]" />}</span>
          <span className="pb-0.5 text-[9.5px] font-extrabold uppercase text-[var(--ink-3)]">{d ? MON.format(d) : '—'}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Date</span>
          <span className={'block truncate text-[14.5px] font-extrabold tracking-[-0.02em] ' + (d ? '' : 'text-[var(--brand)]')}>{sub}</span>
        </span>
      </span>
      <span className="flex items-center gap-3 rounded-[19px] bg-white p-2.5 pr-3">
        <ClockFace time={time} size={46} />
        <span className="min-w-0">
          <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Starts</span>
          {tm ? <span className="block truncate text-[14.5px] font-extrabold tracking-[-0.02em]"><span className="cx-num">{tm}</span> <span className="text-[12px] text-[var(--ink-2)]">{ap}</span></span>
            : <span className="block text-[14.5px] font-extrabold tracking-[-0.02em] text-[var(--brand)]">Pick a time</span>}
          {tm && hours ? <span className="cx-num block truncate text-[11px] font-bold text-[var(--ink-3)]">until {timeLabel(endOf(time, hours))}</span> : null}
        </span>
      </span>
    </button>
  )
}
