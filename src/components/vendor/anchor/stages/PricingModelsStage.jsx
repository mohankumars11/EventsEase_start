/**
 * Stage 5 · How do you charge?
 *
 * A partner picks the ways they charge and only those open. Every open
 * model must end with an exact amount and clear limits, so the booking
 * engine never has to guess: what is included, and what each extra hour,
 * session or day costs. The customer price under each amount is the same
 * 8% gross-up the server uses.
 */
import { AnimatePresence, motion } from 'motion/react'
import { Clock, Mic2, CalendarCheck, Sun, SunMedium, CalendarRange } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, SectionTitle } from '../ui'
import { PRICING_MODELS } from '../options'
import { customerPaise, rupees } from '../../../../lib/tierPackages'

const ICON = { hour: Clock, session: Mic2, event: CalendarCheck, half_day: SunMedium, full_day: Sun, multi_day: CalendarRange }
const digits = x => x.replace(/\D/g, '').slice(0, 7)

function Money({ label, value, onChange, hint, required = true }) {
  const n = Number(value) || 0
  return (
    <div>
      <Label required={required} hint={hint}>{label}</Label>
      <TextField prefix="₹" inputMode="numeric" value={value} onChange={x => onChange(digits(x))} placeholder="0" />
      {n > 0 && <p className="mt-1.5 text-[12px] font-bold text-plum-700">Customer pays {rupees(customerPaise(n))}</p>}
    </div>
  )
}

const Gap = () => <div className="mt-4" />

function ModelFields({ id, v, put }) {
  const f = (k, val) => put({ ...v, [k]: val })
  switch (id) {
    case 'hour': return (<>
      <Money label="You earn per hour" value={v.rate} onChange={x => f('rate', x)} />
      <Gap /><Label required>Minimum paid hours</Label>
      <ChipRow size="sm" options={[1, 2, 3, 4]} value={v.min_hours} onChange={x => f('min_hours', x)} format={h => `${h} hr${h > 1 ? 's' : ''}`} />
      <Gap /><Label required>Longest standard booking</Label>
      <ChipRow size="sm" options={[4, 6, 8, 10, 12]} value={v.max_hours} onChange={x => f('max_hours', x)} format={h => `${h} hrs`} />
      <Gap /><Money label="Overtime, per hour" value={v.overtime} onChange={x => f('overtime', x)} />
      <Gap /><Label hint="How overtime is counted.">Billed in steps of</Label>
      <Segmented id="ot-step" options={[{ value: 30, label: '30 min' }, { value: 60, label: '60 min' }]} value={v.ot_step} onChange={x => f('ot_step', x)} />
      <Gap /><Label hint="Free minutes before overtime starts.">Grace period</Label>
      <Segmented id="ot-grace" options={[{ value: 0, label: 'None' }, { value: 15, label: '15 min' }, { value: 30, label: '30 min' }]} value={v.grace} onChange={x => f('grace', x)} />
    </>)
    case 'session': return (<>
      <Money label="Price for one session" value={v.rate} onChange={x => f('rate', x)} hint="One function, ceremony or stage slot." />
      <Gap /><Label required>Hours included in a session</Label>
      <ChipRow size="sm" options={[1, 1.5, 2, 3]} value={v.hours} onChange={x => f('hours', x)} format={h => `${h} hrs`} />
      <Gap /><Money label="Each additional session" value={v.extra} onChange={x => f('extra', x)} />
    </>)
    case 'event': return (<>
      <Money label="Price for a complete event" value={v.rate} onChange={x => f('rate', x)} />
      <Gap /><Label required>Hours included</Label>
      <ChipRow size="sm" options={[3, 4, 5, 6, 8]} value={v.hours} onChange={x => f('hours', x)} format={h => `${h} hrs`} />
      <Gap /><Label required>Functions included</Label>
      <ChipRow size="sm" options={[1, 2, 3, 4]} value={v.functions} onChange={x => f('functions', x)} />
      <Gap /><Money label="Each extra function" value={v.extra} onChange={x => f('extra', x)} />
      <Gap /><div className="flex items-center justify-between"><span className="text-[13.5px] font-extrabold text-ink">Rehearsal included</span><Toggle on={!!v.rehearsal} onChange={x => f('rehearsal', x)} label="Rehearsal included" /></div>
    </>)
    case 'half_day': return (<>
      <Money label="You earn for a half-day" value={v.rate} onChange={x => f('rate', x)} />
      <Gap /><Label required>Hours included</Label>
      <ChipRow size="sm" options={[3, 4, 5]} value={v.hours ?? 4} onChange={x => f('hours', x)} format={h => `${h} hrs`} />
      <Gap /><Label>Functions included</Label>
      <ChipRow size="sm" options={[1, 2, 3]} value={v.functions} onChange={x => f('functions', x)} />
    </>)
    case 'full_day': return (<>
      <Money label="You earn for a full day" value={v.rate} onChange={x => f('rate', x)} />
      <Gap /><Label required>Hours included</Label>
      <ChipRow size="sm" options={[6, 8, 10, 12]} value={v.hours ?? 8} onChange={x => f('hours', x)} format={h => `${h} hrs`} />
      <Gap /><div className="flex items-center justify-between"><span className="text-[13.5px] font-extrabold text-ink">Breaks & waiting included</span><Toggle on={v.breaks !== false} onChange={x => f('breaks', x)} label="Breaks included" /></div>
    </>)
    case 'multi_day': return (<>
      <Money label="You earn per day" value={v.rate} onChange={x => f('rate', x)} />
      <Gap /><Label required>Hours per day</Label>
      <ChipRow size="sm" options={[4, 6, 8, 10]} value={v.hours} onChange={x => f('hours', x)} format={h => `${h} hrs`} />
      <Gap /><Label required>Most days at this rate</Label>
      <ChipRow size="sm" options={[2, 3, 4, 5, 7]} value={v.max_days} onChange={x => f('max_days', x)} format={d => `${d} days`} />
      <Gap /><Label hint="Off the daily rate when days are back to back.">Consecutive-day discount</Label>
      <Segmented id="md-disc" options={[{ value: 0, label: 'None' }, { value: 5, label: '5%' }, { value: 10, label: '10%' }, { value: 15, label: '15%' }]} value={v.discount ?? 0} onChange={x => f('discount', x)} />
      <Gap /><div className="flex items-center justify-between"><span className="text-[13.5px] font-extrabold text-ink">Needs overnight stay</span><Toggle on={!!v.overnight} onChange={x => f('overnight', x)} label="Overnight stay" /></div>
    </>)
    default: return null
  }
}

export default function PricingModelsStage({ value, set }) {
  const v = value ?? {}
  const on = v.models ?? []
  const toggle = id => set({ ...v, models: on.includes(id) ? on.filter(x => x !== id) : [...on, id] })
  return (
    <>
      <SectionTitle title="How do you charge?" sub="Pick every way you charge. Only those open up. Customers book the one that fits their event." />

      <div className="grid grid-cols-2 gap-2">
        {PRICING_MODELS.map(m => {
          const Icon = ICON[m.id]
          const sel = on.includes(m.id)
          return (
            <motion.button key={m.id} type="button" whileTap={{ scale: 0.97 }} onClick={() => toggle(m.id)} aria-pressed={sel}
              className={`rounded-[18px] p-3 text-left transition ${sel ? 'bg-plum-700 text-white shadow-[0_10px_22px_-12px_rgba(91,33,182,0.9)]' : 'bg-white ring-1 ring-ink/[0.08]'}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${sel ? 'bg-white/15' : 'bg-plum-50 text-plum-700'}`}><Icon size={16} /></span>
              <p className="mt-2 text-[13.5px] font-extrabold">{m.label}</p>
              <p className={`text-[11px] leading-snug ${sel ? 'text-plum-100' : 'text-ink/50'}`}>{m.hint}</p>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-3 space-y-3">
        <AnimatePresence initial={false}>
          {PRICING_MODELS.filter(m => on.includes(m.id)).map(m => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <Card>
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{m.label}</p>
                <ModelFields id={m.id} v={v[m.id] ?? {}} put={x => set({ ...v, [m.id]: x })} />
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

const need = {
  hour: m => m.rate > 0 && m.min_hours && m.max_hours && m.overtime > 0,
  session: m => m.rate > 0 && m.hours && m.extra > 0,
  event: m => m.rate > 0 && m.hours && m.functions && m.extra > 0,
  half_day: m => m.rate > 0,
  full_day: m => m.rate > 0,
  multi_day: m => m.rate > 0 && m.hours && m.max_days,
}
export const pricingModelsDone = v => (v?.models?.length ?? 0) > 0
  && v.models.every(id => need[id]?.(Object.fromEntries(Object.entries(v[id] ?? {}).map(([k, x]) => [k, typeof x === 'string' ? Number(x) : x]))))
