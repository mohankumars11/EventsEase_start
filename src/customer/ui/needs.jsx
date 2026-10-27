/**
 * The requirement summary and the "setting up" moment. (The questions
 * themselves are asked full-screen by screens/Brief.jsx.)
 *
 * SettingUp is the beat between telling us about the event and seeing
 * the plan: a ring fills while four honest lines tick green (each is what
 * the next screen really did), then it gets out of the way. Shown once
 * per occasion per session, so going back and forth never replays it.
 */
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { needsFor } from '../lib/needs'

/** "pick any" answers as one short line: "Candid, Traditional · Kannada". */
export function needsSummary(tradeId, value = {}) {
  const qs = needsFor(tradeId)
  const picked = qs.filter(q => q.kind !== 'toggle').map(q => (Array.isArray(value[q.key]) ? value[q.key] : []).map(id => q.options.find(o => o.id === id)?.label).filter(Boolean).join(', ')).filter(Boolean)
  const musts = qs.filter(q => q.kind === 'toggle' && value[q.key] === true).length
  const typed = Object.entries(value).filter(([k, v]) => k.endsWith('__typed') && Array.isArray(v)).flatMap(([, v]) => v)
  const said = [...picked, ...typed.map(x => `“${x}”`), musts ? `${musts} must-have${musts > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
  return said || (value.$any ? 'Any master is fine' : '')
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
