/**
 * How a partner charges, for any trade: the rule kinds that trade allows
 * (its config's pricing.kinds), each switched on with an exact amount and
 * its limits, plus the trade's own pricing questions (minimums, fees…).
 *
 * The partner chooses whether they type what they EARN or what the
 * CUSTOMER PAYS; the other number is shown live from the trade's fee and
 * the server computes it again on submit.
 */
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, SectionTitle } from '../anchor/ui'
import QuestionRenderer from './QuestionRenderer'
import { RULE_KINDS } from '../../../data/trades/schema'

const toR = p => (p === undefined || p === null || p === '' ? '' : String(Math.round(Number(p) / 100)))
const toP = r => (r === '' ? undefined : Math.round(Number(r) * 100))
const inr = p => `₹${Math.round((Number(p) || 0) / 100).toLocaleString('en-IN')}`
const num = x => { const c = String(x).replace(/[^\d.]/g, ''); return c === '' ? null : Number(c) }

/** Customer price from take-home, and back — same rounding as the server. */
export const customerFrom = (take, fee) => Math.round(take / (1 - fee) / 10) * 10
export const takeFrom = (cust, fee) => Math.floor((cust * (1 - fee)) / 10) * 10

/* What the limits mean for each kind. */
const LIMITS = {
  hour: { min: 'Shortest booking', max: 'Longest booking', suffix: 'hours' },
  per_person: { min: 'Fewest people', max: 'Most people', suffix: 'people' },
  per_guest: { min: 'Minimum guests billed', max: 'Most guests', suffix: 'guests' },
  per_unit: { min: 'Minimum quantity', max: 'Maximum quantity', suffix: 'units' },
  per_staff_hour: { min: 'Minimum paid hours', suffix: 'hours' },
  per_km: { min: 'Minimum km charged', suffix: 'km' },
  vehicle_hour: { min: 'Minimum hours', suffix: 'hours' },
  capacity_period: { min: 'Minimum periods', suffix: 'periods' },
}
const INCLUDED = {
  session: { label: 'Hours included', suffix: 'hours', field: 'hours' },
  event: { label: 'Hours included', suffix: 'hours', field: 'hours' },
  half_day: { label: 'Hours included', suffix: 'hours', field: 'hours' },
  full_day: { label: 'Hours included', suffix: 'hours', field: 'hours' },
  per_staff_shift: { label: 'Shift length', suffix: 'hours', field: 'included_qty' },
  per_trip: { label: 'Kilometres included in the fare', suffix: 'km', field: 'included_qty' },
  space: { label: 'Hours included per slot', suffix: 'hours', field: 'hours' },
}

function Small({ label, value, onChange, suffix }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">{label}</p>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1"><TextField inputMode="decimal" value={value ?? ''} onChange={x => onChange(num(x))} /></div>
        {suffix && <span className="text-[11.5px] font-bold text-ink/45">{suffix}</span>}
      </div>
    </div>
  )
}

function Bands({ bands = [], set, suffix }) {
  const put = (i, k, v) => set(bands.map((b, j) => (j === i ? { ...b, [k]: v } : b)))
  return (
    <div className="mt-3 rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
      <p className="text-[12.5px] font-extrabold text-ink">Price bands <span className="font-bold text-ink/45">(optional)</span></p>
      <p className="mb-2 text-[11.5px] text-ink/50">A different rate for larger groups. Bands must not overlap.</p>
      {bands.map((b, i) => (
        <div key={i} className="mb-2 flex items-end gap-2">
          <Small label="From" value={b.from} onChange={v => put(i, 'from', v)} suffix={suffix} />
          <Small label="To" value={b.to} onChange={v => put(i, 'to', v)} />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">You earn each</p>
            <TextField prefix="₹" inputMode="numeric" value={toR(b.take_home_paise)} onChange={x => put(i, 'take_home_paise', toP(x.replace(/\D/g, '')))} />
          </div>
          <button type="button" aria-label="Remove band" onClick={() => set(bands.filter((_, j) => j !== i))}
            className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => set([...bands, { from: null, to: null, take_home_paise: undefined }])}
        className="flex items-center gap-1 text-[12.5px] font-extrabold text-plum-700"><Plus size={14} /> Add a band</button>
    </div>
  )
}

/* Priced item by item in the trade's own list, not by one amount here. */
export const ITEM_PRICED = ['catalogue', 'rental', 'space']

function RuleCard({ kind, r = {}, set, fee, unitLabels, tried, noun }) {
  const def = RULE_KINDS[kind]
  if (ITEM_PRICED.includes(kind)) {
    return (
      <Card className="mt-3 bg-plum-50/60">
        <p className="text-[14px] font-extrabold text-ink">{def.label}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink/60">Each {noun ?? 'item'} carries its own price — set it on your list.</p>
      </Card>
    )
  }
  const on = !!r.on
  const mode = r.price_mode ?? 'target_net'
  const amt = Number(r.amount_paise) || 0
  const lim = LIMITS[kind], inc = INCLUDED[kind]
  const bad = tried && on && kind !== 'quote' && !(amt > 0)
  return (
    <Card className={`mt-3 ${bad ? 'ring-2 ring-rose-300' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-extrabold text-ink">{def.label}</p>
          {kind === 'quote' && <p className="mt-0.5 text-[12px] text-ink/55">Customers send a request; you price each one.</p>}
        </div>
        <Toggle on={on} label={def.label} onChange={x => set({ ...r, on: x })} />
      </div>
      <AnimatePresence initial={false}>
        {on && kind !== 'quote' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4">
              {unitLabels?.length > 0 && (
                <div className="mb-3">
                  <Label>Charged</Label>
                  <ChipRow size="sm" options={unitLabels} value={r.label} onChange={x => set({ ...r, label: x })} />
                </div>
              )}
              <Segmented id={`mode-${kind}`} value={mode} onChange={x => set({ ...r, price_mode: x })}
                options={[{ value: 'target_net', label: 'I enter what I earn' }, { value: 'customer', label: 'I enter customer price' }]} />
              <div className="mt-3">
                <TextField prefix="₹" inputMode="numeric" value={toR(r.amount_paise)} placeholder="0"
                  onChange={x => set({ ...r, amount_paise: toP(x.replace(/\D/g, '').slice(0, 9)) })} />
              </div>
              {amt > 0 && (
                <p className="mt-2 rounded-xl bg-forest-50 px-3 py-2 text-[12.5px] font-bold text-forest-800">
                  {mode === 'customer'
                    ? <>Customer pays {inr(amt)} · you earn {inr(takeFrom(amt, fee))}</>
                    : <>You earn {inr(amt)} · customer pays {inr(customerFrom(amt, fee))}</>}
                  <span className="font-semibold text-forest-700/70"> ({Math.round(fee * 100)}% Sambramo fee)</span>
                </p>
              )}
              {(lim || inc) && (
                <div className="mt-3 flex gap-2">
                  {inc && <Small label={inc.label} value={r[inc.field]} onChange={v => set({ ...r, [inc.field]: v })} suffix={inc.suffix} />}
                  {lim?.min && <Small label={lim.min} value={r.min_qty} onChange={v => set({ ...r, min_qty: v })} suffix={lim.suffix} />}
                  {lim?.max && <Small label={lim.max} value={r.max_qty} onChange={v => set({ ...r, max_qty: v })} suffix={lim.suffix} />}
                </div>
              )}
              {kind === 'multi_day' && (
                <div className="mt-3 flex gap-2">
                  <Small label="Most days" value={r.max_days} onChange={v => set({ ...r, max_days: v })} suffix="days" />
                  <Small label="Discount from day 2" value={r.discount} onChange={v => set({ ...r, discount: v })} suffix="%" />
                </div>
              )}
              {(kind === 'per_guest' || kind === 'per_unit') && <Bands bands={r.bands} set={b => set({ ...r, bands: b })} suffix={def.qty} />}
              {kind === 'percentage' && (
                <div className="mt-3">
                  <Label required>Percentage of</Label>
                  <ChipRow size="sm" options={['Total vendor spend', 'Agreed budget']} value={r.base} onChange={x => set({ ...r, base: x })} />
                  <div className="mt-3" />
                  <Label required hint="What the fee includes and how it is settled if the spend changes. At least 20 characters.">Policy</Label>
                  <TextField multiline value={r.policy} onChange={x => set({ ...r, policy: x })} max={400} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {bad && <p className="mt-2 text-[12px] font-bold text-rose-600">Enter an amount, or switch this off.</p>}
    </Card>
  )
}

export default function PricingRulesEditor({ config, rules = {}, setRules, answers, setAnswers, fee, tried, trade }) {
  const kinds = config.pricing.kinds
  return (
    <>
      <SectionTitle title="How you charge" sub="Switch on every way you charge. Each needs an exact amount — the customer sees the price before they pay." />
      {kinds.map(k => (
        <RuleCard key={k} kind={k} r={rules[k]} fee={fee} tried={tried} unitLabels={config.pricing.unitLabels?.[k]} noun={config.catalogue?.noun}
          set={v => setRules({ ...rules, [k]: v })} />
      ))}
      {(config.pricing.fields ?? []).length > 0 && (
        <>
          <p className="mb-1 mt-6 text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Minimums & extra charges</p>
          <QuestionRenderer questions={config.pricing.fields} answers={answers} set={setAnswers} trade={trade} tried={tried} />
        </>
      )}
      {config.pricing.note && <p className="mt-4 px-1 text-[12px] leading-relaxed text-ink/55">{config.pricing.note}</p>}
    </>
  )
}
