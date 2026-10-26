/**
 * The requirement picker and the "setting up" moment.
 *
 * NeedsPicker asks one service's questions (lib/needs.js) as chips: tap to
 * choose, green when chosen, single-choice questions swap rather than
 * stack. Everything is optional — a question left alone filters nothing.
 *
 * SettingUp is the beat between telling us about the event and seeing
 * the plan: a ring fills while four honest lines tick green (each is what
 * the next screen really did), then it gets out of the way. Shown once
 * per occasion per session, so going back and forth never replays it.
 */
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { needsFor } from '../lib/needs'

export function NeedsPicker({ tradeId, value = {}, onChange }) {
  const qs = needsFor(tradeId)
  if (!qs.length) return null
  const toggle = (q, id) => {
    const cur = value[q.key] ?? []
    const next = q.kind === 'single' ? (cur[0] === id ? [] : [id]) : cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    onChange({ ...value, [q.key]: next })
  }
  return (
    <div className="space-y-3.5">
      {qs.map(q => (
        <div key={q.key} data-need-q={q.key}>
          <p className="text-[13px] font-extrabold tracking-[-0.01em] text-[var(--ink)]">{q.title}{q.kind === 'multi' && <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-3)]">pick any</span>}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {q.options.map(o => {
              const on = (value[q.key] ?? []).includes(o.id)
              return (
                <button key={o.id} type="button" onClick={() => toggle(q, o.id)} aria-pressed={on}
                  className={'cx-press flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ' + (on ? 'bg-[#E9F8EF] text-[#0B6B3D] shadow-[inset_0_0_0_1.5px_#0C831F]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E3DEEA]')}>
                  {on && <Check size={13} strokeWidth={3} />}{o.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** "pick any" answers as one short line: "Candid, Traditional · Kannada". */
export function needsSummary(tradeId, value = {}) {
  return needsFor(tradeId).map(q => (value[q.key] ?? []).map(id => q.options.find(o => o.id === id)?.label).filter(Boolean).join(', ')).filter(Boolean).join(' · ')
}

const SEEN = 'sbm.cx.setup.'
export function SettingUp({ id, title, lines, onDone }) {
  const [step, setStep] = useState(0)
  const [skip] = useState(() => { try { return sessionStorage.getItem(SEEN + id) === '1' } catch { return false } })
  useEffect(() => {
    if (skip) { onDone(); return }
    const t = setInterval(() => setStep(s => s + 1), 620)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (skip || step <= lines.length) return
    try { sessionStorage.setItem(SEEN + id, '1') } catch { /* storage off */ }
    const t = setTimeout(onDone, 380)
    return () => clearTimeout(t)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps
  if (skip) return null
  const pct = Math.min(1, step / lines.length)
  const done = step >= lines.length
  return (
    <div className="cx-enter fixed inset-0 z-[300] flex flex-col items-center justify-center bg-white px-8" role="status" aria-live="polite" data-setting-up>
      <div className="relative h-[132px] w-[132px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#F1ECF8" strokeWidth="9" />
          <circle cx="60" cy="60" r="52" fill="none" stroke={done ? '#0C831F' : '#7C3AED'} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${pct * 326.7} 326.7`} className="transition-all duration-500 ease-out" />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          {done ? <span className="cx-pop grid h-14 w-14 place-items-center rounded-full bg-[#0C831F] text-white"><Check size={30} strokeWidth={3} /></span>
            : <span className="cx-num text-[28px] font-black tracking-[-0.04em] text-[#3A1290]">{Math.round(pct * 100)}%</span>}
        </span>
      </div>
      <p className="mt-6 text-center text-[21px] font-black leading-tight tracking-[-0.035em]">{done ? 'You’re all set!' : title}</p>
      <ul className="mt-5 w-full max-w-[300px] space-y-2.5">
        {lines.map((l, i) => (
          <li key={l} className={'flex items-center gap-2.5 text-[13.5px] font-bold transition-all duration-300 ' + (i < step ? 'text-[var(--ink)] opacity-100' : 'translate-y-1 text-[var(--ink-3)] opacity-40')}>
            <span className={'grid h-5 w-5 shrink-0 place-items-center rounded-full transition ' + (i < step ? 'bg-[#0C831F] text-white' : 'bg-[#F1ECF8]')}>{i < step && <Check size={12} strokeWidth={3.2} />}</span>{l}
          </li>
        ))}
      </ul>
    </div>
  )
}
