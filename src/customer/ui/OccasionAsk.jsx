/**
 * The occasion's own questions, inside the Event Details form.
 *
 * Not a second form and not a wizard: the same screen the customer
 * already knows gains a short block headed "About your <occasion>", and
 * the questions in it come from the occasion's blueprint. Choose a
 * different occasion and the block changes with it.
 *
 * Three rules keep it from becoming a questionnaire:
 *
 *  1. Only what changes something. A question earns its place by driving
 *     a recommendation, a match or how the day runs — never by being
 *     interesting. The blueprint is where that is decided.
 *  2. Conditional questions appear and disappear as answers change, and
 *     an answer to a question that has gone away is dropped, so a
 *     changed mind cannot leave a stale fact behind (occasionPlan.prune).
 *  3. Optional questions live under "A few more details", closed, so the
 *     first screen is short. Required ones are always visible.
 *
 * Controls are the phone's fastest: chips for a choice, chips for a
 * multi-choice, a native select for a long list, the numeric keypad for
 * a count. No modals, no steppers, nothing that needs two hands.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { questionsFor } from '../lib/occasionPlan'

export default function OccasionAsk({ occasion, event, answers, onChange }) {
  const qs = useMemo(() => questionsFor(occasion, { event, answers }), [occasion, event, answers])
  const [open, setOpen] = useState(false)
  if (!qs.length) return null

  const need = qs.filter(q => !q.optional)
  const extra = qs.filter(q => q.optional)
  const set = (k, v) => onChange({ ...answers, [k]: v })

  return (
    <section className="mt-1" data-occasion-ask>
      <div className="rounded-[18px] bg-[#FBF9FF] p-3.5 shadow-[inset_0_0_0_1.4px_#EDE5FC]">
        <p className="text-[13px] font-black tracking-[-0.01em] text-[var(--ink)]">About your {occasion.name.toLowerCase()}</p>
        <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--ink-3)]">Only what changes your plan. Skip anything you’re unsure of.</p>

        <div className="mt-3 space-y-3.5">
          {need.map(q => <Ask key={q.k} q={q} value={answers[q.k]} onChange={v => set(q.k, v)} />)}
        </div>

        {extra.length > 0 && (
          <>
            <button type="button" onClick={() => setOpen(o => !o)} data-ask-more
              className="cx-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-[13px] bg-white py-2.5 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.3px_#E6DCFA]">
              {open ? <>Fewer details<ChevronUp size={15} /></> : <>A few more details ({extra.length})<ChevronDown size={15} /></>}
            </button>
            {open && <div className="mt-3.5 space-y-3.5">{extra.map(q => <Ask key={q.k} q={q} value={answers[q.k]} onChange={v => set(q.k, v)} />)}</div>}
          </>
        )}
      </div>
    </section>
  )
}

function Ask({ q, value, onChange }) {
  return (
    <div data-ask={q.k}>
      <label className="mb-1.5 flex items-start gap-1.5 text-[12.5px] font-extrabold leading-snug text-[var(--ink)]">
        <span>{q.label}{q.optional && <span className="font-semibold text-[var(--ink-3)]"> (optional)</span>}</span>
      </label>
      <Control q={q} value={value} onChange={onChange} />
      {q.help && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold leading-snug text-[var(--ink-3)]">
          <HelpCircle size={12} className="mt-[1.5px] shrink-0" />{q.help}
        </p>
      )}
    </div>
  )
}

function Control({ q, value, onChange }) {
  switch (q.type) {
    case 'one':
      return <Chips options={q.options} value={value} onChange={onChange} />

    case 'yesno':
      return <Chips options={[['yes', 'Yes'], ['no', 'No']]} value={value} onChange={onChange} />

    case 'many': {
      const on = Array.isArray(value) ? value : []
      const flip = v => onChange(on.includes(v) ? on.filter(x => x !== v) : [...on, v])
      return (
        <div className="flex flex-wrap gap-2" role="group">
          {q.options.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={on.includes(v)} onClick={() => flip(v)} data-opt={v}
              className={'cx-press rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ' +
                (on.includes(v) ? 'bg-[#F1E9FF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.4px_#E9E3F2]')}>
              {l}
            </button>
          ))}
        </div>
      )
    }

    case 'select':
      return (
        <label className="relative block">
          <select value={value ?? ''} onChange={e => onChange(e.target.value)}
            className="h-11 w-full appearance-none rounded-[13px] bg-white pl-3.5 pr-9 text-[14px] font-bold text-[var(--ink)] shadow-[inset_0_0_0_1.4px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]">
            {q.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
        </label>
      )

    case 'number': {
      const n = value === '' || value == null ? '' : Number(value)
      return (
        <input inputMode="numeric" value={n} placeholder={q.placeholder ?? '0'}
          onChange={e => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw === '' ? '' : Math.min(Number(raw), q.max ?? 99999)) }}
          className="cx-num h-11 w-full rounded-[13px] bg-white px-3.5 text-[15px] font-extrabold text-[var(--ink)] shadow-[inset_0_0_0_1.4px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
      )
    }

    case 'text':
    default:
      return (
        <input value={value ?? ''} placeholder={q.placeholder ?? ''} maxLength={q.max ?? 120}
          onChange={e => onChange(e.target.value)}
          className="h-11 w-full rounded-[13px] bg-white px-3.5 text-[14px] font-semibold text-[var(--ink)] shadow-[inset_0_0_0_1.4px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
      )
  }
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} data-opt={v}
          onClick={() => onChange(value === v ? null : v)}
          className={'cx-press rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ' +
            (value === v ? 'bg-[#F1E9FF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.4px_#E9E3F2]')}>
          {l}
        </button>
      ))}
    </div>
  )
}
