/**
 * Stage 9 · Booking & cancellation.
 *
 * What makes instant payment safe for both sides, and how custom quotes
 * reach the partner. Every policy states its exact deadlines and refunds.
 */
import { motion } from 'motion/react'
import { Inbox, FilePen, Timer, Send, Check } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, OptionCard, SectionTitle } from '../ui'
import { ADVANCE, CANCELLATION_V3, SLA_V3, RIDER } from '../options'

export default function RulesStage({ value, set }) {
  const v = value ?? {}
  const rider = v.rider ?? []
  return (
    <>
      <SectionTitle title="Booking & cancellation" sub="These make instant payment safe for you and the customer." />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold text-ink">Instant booking</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Customers can book your packages without waiting for you.</p></div>
          <Toggle on={v.instant !== false} label="Instant booking" onChange={x => set({ ...v, instant: x })} />
        </div>
      </Card>

      <Card className="mt-3">
        <Label required>Advance at booking</Label>
        <Segmented id="adv" options={ADVANCE} value={v.advance_pct} onChange={x => set({ ...v, advance_pct: x })} />
      </Card>

      <Card className="mt-3">
        <Label required>Cancellation policy</Label>
        <div className="space-y-2">
          {CANCELLATION_V3.map(c => <OptionCard key={c.id} on={v.cancellation === c.id} title={c.title} body={c.body} onClick={() => set({ ...v, cancellation: c.id })} />)}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold text-ink">Accept custom quotes</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Events outside your packages come to you to price.</p></div>
          <Toggle on={v.custom_quotes !== false} label="Accept custom quotes" onChange={x => set({ ...v, custom_quotes: x })} />
        </div>
        {v.custom_quotes !== false && (
          <>
            <div className="mt-4" />
            <Label required hint="If you do not respond in time, the request may be offered to another partner.">Time allowed to respond</Label>
            <ChipRow options={SLA_V3} value={v.quote_hours} onChange={x => set({ ...v, quote_hours: x })} format={h => `${h} hrs`} />
            <div className="mt-4" />
            <Label hint="Optional. Skip requests below this budget.">Minimum budget</Label>
            <TextField prefix="₹" inputMode="numeric" value={v.min_budget} placeholder="No minimum"
              onChange={x => set({ ...v, min_budget: x.replace(/\D/g, '').slice(0, 8) })} />
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-plum-950 p-3 text-center text-white">
              {[[Inbox, 'Customer asks'], [FilePen, 'We pre-fill it'], [Timer, 'You review'], [Send, 'Customer pays']].map(([I, t], i) => (
                <div key={t}><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><I size={16} /></span>
                  <p className="mt-1 text-[10px] font-bold leading-tight text-plum-100">{i + 1}. {t}</p></div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="mt-3">
        <Label required hint="Customers see these before they pay. Tap each to confirm.">Technical rider</Label>
        <div className="space-y-2">
          {RIDER.map(r => {
            const on = rider.includes(r.id)
            return (
              <motion.button key={r.id} type="button" whileTap={{ scale: 0.98 }}
                onClick={() => set({ ...v, rider: on ? rider.filter(x => x !== r.id) : [...rider, r.id] })}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ${on ? 'bg-forest-50 ring-1 ring-forest-500/50' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? 'bg-forest-600 text-white' : 'ring-2 ring-ink/15'}`}>{on && <Check size={13} strokeWidth={3.5} />}</span>
                <span className="text-[12.5px] font-semibold leading-snug text-ink/80">{r.label}</span>
              </motion.button>
            )
          })}
        </div>
      </Card>
    </>
  )
}

export const rulesStageDone = v => !!v?.advance_pct && !!v?.cancellation
  && (v?.custom_quotes === false || !!v?.quote_hours) && (v?.rider?.length ?? 0) === RIDER.length
