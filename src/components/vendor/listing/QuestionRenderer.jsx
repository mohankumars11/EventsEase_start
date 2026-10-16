/**
 * Renders any trade's questions from its config (src/data/trades/<id>.js).
 *
 * The trade file says WHAT to ask; this decides HOW, from the same controls
 * the Anchor & MC flow is built from — chips, segmented pills, toggles,
 * steppers, cards. No native selects, radios or checkboxes.
 *
 *   single   ≤ 3 short options → Segmented, otherwise chips
 *   multi    chips (+ "Other" free text when the question allows it)
 *   number   stepper with min / max and a suffix
 *   money    ₹ field; the answer is stored in PAISE (what the server prices)
 *   toggle   switch row
 *   text / textarea / url / time / date / dimensions / photos
 *
 * `showWhen` hides a question until its condition holds; a hidden question's
 * answer is ignored by questionDone() and by the payload.
 */
import { Minus, Plus, Link2 } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle } from '../anchor/ui'
import WorkUpload from '../WorkUpload'
import { holds } from '../../../data/trades'

const toRupees = p => (p === undefined || p === null || p === '' ? '' : String(Math.round(Number(p) / 100)))
const toPaise = r => (r === '' ? undefined : Math.round(Number(r) * 100))
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i

/** Is this one question answered well enough to move on? */
export function questionDone(q, answers) {
  if (!holds(q.showWhen, answers)) return true
  const v = answers?.[q.id]
  if (!q.required) {
    if (q.type === 'url' && v) return URL_RE.test(v)
    return true
  }
  switch (q.type) {
    case 'multi': return Array.isArray(v) && v.length > 0
    case 'photos': return Array.isArray(v) && v.filter(x => x.kind !== 'testimonial').length >= (q.min ?? 1)
    case 'toggle': return v === true || v === false
    case 'number': return v !== undefined && v !== '' && Number(v) >= (q.min ?? -Infinity) && Number(v) <= (q.max ?? Infinity)
    case 'money': return Number(v) > 0
    case 'url': return URL_RE.test(v ?? '')
    case 'dimensions': return !!v && Number(v.l) > 0 && Number(v.w) > 0
    default: return v !== undefined && v !== null && String(v).trim() !== '' && (q.type !== 'single' || v !== 'other' || !!answers?.[`${q.id}_other`])
  }
}

export const questionsDone = (qs, answers) => qs.every(q => questionDone(q, answers))

function Stepper({ value, onChange, min = 0, max = 100000, suffix }) {
  const n = value === undefined || value === '' ? null : Number(value)
  const step = max > 1000 ? (n >= 1000 ? 100 : 10) : 1
  const set = x => onChange(Math.min(max, Math.max(min, x)))
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Less" onClick={() => set((n ?? min) - step)}
        className="flex h-[50px] w-12 items-center justify-center rounded-2xl bg-[#f4f2f9] text-plum-700 ring-1 ring-ink/[0.06]"><Minus size={18} /></button>
      <div className="min-w-0 flex-1">
        <TextField inputMode="decimal" value={n ?? ''} placeholder={String(min)}
          onChange={x => { const c = x.replace(/[^\d.]/g, ''); onChange(c === '' ? '' : Number(c)) }} />
      </div>
      {suffix && <span className="shrink-0 text-[12.5px] font-extrabold text-ink/50">{suffix}</span>}
      <button type="button" aria-label="More" onClick={() => set((n ?? min - step) + step)}
        className="flex h-[50px] w-12 items-center justify-center rounded-2xl bg-plum-700 text-white"><Plus size={18} /></button>
    </div>
  )
}

function Dimensions({ value, onChange, unit = 'ft' }) {
  const v = value ?? {}
  const box = k => (
    <div className="min-w-0 flex-1">
      <TextField inputMode="decimal" value={v[k] ?? ''} placeholder={k.toUpperCase()}
        onChange={x => onChange({ ...v, unit, [k]: x.replace(/[^\d.]/g, '') })} />
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      {box('l')}<span className="font-extrabold text-ink/40">×</span>{box('w')}<span className="font-extrabold text-ink/40">×</span>{box('h')}
      <span className="shrink-0 text-[12.5px] font-extrabold text-ink/50">{unit}</span>
    </div>
  )
}

/** One question. `answers` is the whole namespace so `Other` text can live beside it. */
export function Question({ q, answers, set, trade, tried }) {
  const v = answers?.[q.id]
  const put = val => set({ ...answers, [q.id]: val })
  const bad = tried && !questionDone(q, answers)
  const ids = (q.options ?? []).map(o => o.id)
  const label = id => q.options.find(o => o.id === id)?.label ?? 'Other'

  let control
  switch (q.type) {
    case 'single': {
      const opts = q.other ? [...ids, 'other'] : ids
      control = opts.length <= 3 && opts.every(id => label(id).length <= 14)
        ? <Segmented id={q.id} options={opts.map(id => ({ value: id, label: label(id) }))} value={v} onChange={put} />
        : <ChipRow options={opts} value={v} onChange={put} format={label} />
      break
    }
    case 'multi':
      control = <ChipRow multi options={q.other ? [...ids, 'other'] : ids} value={v ?? []} onChange={put} format={label} max={q.maxSelect} />
      break
    case 'number':
      control = <Stepper value={v} onChange={put} min={q.min ?? 0} max={q.max ?? 100000} suffix={q.suffix} />
      break
    case 'money':
      control = <TextField prefix="₹" inputMode="numeric" value={toRupees(v)} placeholder="0"
        onChange={x => put(toPaise(x.replace(/\D/g, '').slice(0, 9)))} />
      break
    case 'toggle':
      return (
        <Card className="mt-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13.5px] font-extrabold text-ink">{q.label}{q.required && <span className="ml-0.5 text-rose-500">*</span>}</p>
              {q.hint && <p className="mt-0.5 text-[12px] leading-snug text-ink/55">{q.hint}</p>}
            </div>
            <Toggle on={!!v} label={q.label} onChange={put} />
          </div>
        </Card>
      )
    case 'textarea':
      control = <TextField multiline value={v} onChange={put} max={q.max ?? 500} placeholder={q.placeholder} />
      break
    case 'url':
      control = (
        <div className="flex items-center gap-2">
          <span className="flex h-[50px] w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f2f9] text-plum-700"><Link2 size={18} /></span>
          <div className="min-w-0 flex-1"><TextField inputMode="url" value={v} onChange={x => put(x.trim())} placeholder="https://" valid={URL_RE.test(v ?? '')} /></div>
        </div>
      )
      break
    case 'time':
      control = <ChipRow size="sm" options={['06:00', '08:00', '10:00', '12:00', '16:00', '18:00', '20:00', '22:00']} value={v} onChange={put} />
      break
    case 'date':
      control = <TextField inputMode="numeric" value={v} onChange={x => put(x.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" />
      break
    case 'dimensions':
      control = <Dimensions value={v} onChange={put} unit={q.unit} />
      break
    case 'photos':
      return (
        <div className={bad ? 'mt-3 rounded-[22px] ring-2 ring-rose-300' : 'mt-3'}>
          <WorkUpload value={v ?? []} onChange={put} trade={trade}
            copy={{ photoTitle: q.label, photoHint: q.hint ?? (q.min ? 'At least ' + q.min + '.' : undefined) }} />
        </div>
      )
    default:
      control = <TextField value={v} onChange={put} max={q.max} placeholder={q.placeholder} />
  }

  const otherPicked = q.other && (q.type === 'multi' ? (v ?? []).includes('other') : v === 'other')
  return (
    <Card className={`mt-3 ${bad ? 'ring-2 ring-rose-300' : ''}`}>
      <Label required={q.required} hint={q.hint}>{q.label}</Label>
      {control}
      {otherPicked && (
        <div className="mt-3">
          <TextField value={answers?.[`${q.id}_other`]} onChange={x => set({ ...answers, [`${q.id}_other`]: x })} max={120} placeholder="Tell us what" />
        </div>
      )}
      {bad && <p className="mt-2 text-[12px] font-bold text-rose-600">{q.type === 'multi' ? 'Pick at least one.' : 'This is needed.'}</p>}
    </Card>
  )
}

/** A list of questions, hidden ones skipped. */
export default function QuestionRenderer({ questions, answers, set, trade, tried }) {
  return (
    <>
      {questions.filter(q => holds(q.showWhen, answers)).map(q => (
        <Question key={q.id} q={q} answers={answers} set={set} trade={trade} tried={tried} />
      ))}
    </>
  )
}
