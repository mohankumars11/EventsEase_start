/**
 * Stage 6 · Extra services & charges.
 *
 * Only switched-on add-ons are ever bookable, and each must carry a price
 * and a unit; the backend never guesses one. Which packages INCLUDE an
 * add-on is decided on the Packages step, so it is never charged twice.
 * Surcharges exist only when switched on here with exact amounts.
 */
import { AnimatePresence, motion } from 'motion/react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, SectionTitle } from '../ui'
import { ADDONS_V3, ADDON_UNITS } from '../options'
import { customerPaiseWith, rupees } from '../../../../lib/tierPackages'

const digits = x => x.replace(/\D/g, '').slice(0, 7)

export default function ExtrasStage({ value, set, hasHourlyOvertime }) {
  const v = value ?? {}
  const on = v.on ?? {}
  const put = (id, patch) => set({ ...v, on: { ...on, [id]: { ...on[id], ...patch } } })
  return (
    <>
      <SectionTitle title="Extra services & charges" sub="Switch on what you offer and set its price. Customers add these to any package." />

      <div className="space-y-2.5">
        {ADDONS_V3.map(a => {
          const active = a.id in on
          const fee = on[a.id]?.fee
          return (
            <motion.div key={a.id} layout className={`rounded-[20px] bg-white p-3.5 transition-colors ${active ? 'ring-2 ring-forest-500/60' : 'ring-1 ring-ink/[0.07]'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[13.5px] font-extrabold ${active ? 'text-ink' : 'text-ink/70'}`}>{a.label}</span>
                <Toggle on={active} label={a.label} onChange={x => {
                  const next = { ...on }
                  if (x) next[a.id] = { fee: String(a.suggest), unit: a.unit, notice: 0 }; else delete next[a.id]
                  set({ ...v, on: next })
                }} />
              </div>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-[70px] text-[12px] font-bold text-ink/50">You earn</span>
                        <div className="flex-1"><TextField prefix="₹" inputMode="numeric" value={fee} onChange={x => put(a.id, { fee: digits(x) })} /></div>
                      </div>
                      {Number(fee) > 0 && <p className="pl-[78px] text-[11.5px] font-bold text-plum-700">Customer pays {rupees(customerPaiseWith(Number(fee) * 100))}</p>}
                      <Segmented id={`unit-${a.id}`} options={ADDON_UNITS} value={on[a.id]?.unit ?? a.unit} onChange={x => put(a.id, { unit: x })} />
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-ink/50">Notice needed</span>
                        <ChipRow size="sm" options={[0, 1, 3, 7]} value={on[a.id]?.notice ?? 0} onChange={x => put(a.id, { notice: x })}
                          format={d => d === 0 ? 'None' : `${d}d`} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {!hasHourlyOvertime && (
        <Card className="mt-4 bg-amber-50/60 !ring-amber-200">
          <Label required hint="Charged per extra hour beyond the package.">Overtime, you earn per hour</Label>
          <TextField prefix="₹" inputMode="numeric" value={v.overtime} onChange={x => set({ ...v, overtime: digits(x) })} placeholder="5000" />
        </Card>
      )}

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[14px] font-extrabold text-ink">Charge for waiting time</p><p className="text-[12px] text-ink/55">When the event starts late.</p></div>
          <Toggle on={!!v.waiting} label="Waiting time" onChange={x => set({ ...v, waiting: x ? { free_minutes: 30, fee: '1000' } : null })} />
        </div>
        {v.waiting && (
          <div className="mt-3 space-y-2.5">
            <Label>Free waiting</Label>
            <ChipRow size="sm" options={[15, 30, 60]} value={v.waiting.free_minutes} onChange={x => set({ ...v, waiting: { ...v.waiting, free_minutes: x } })} format={m => `${m} min`} />
            <Label>Then, you earn per 30 minutes</Label>
            <TextField prefix="₹" inputMode="numeric" value={v.waiting.fee} onChange={x => set({ ...v, waiting: { ...v.waiting, fee: digits(x) } })} />
          </div>
        )}
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[14px] font-extrabold text-ink">Late-night or holiday rate</p><p className="text-[12px] text-ink/55">Only applied when you switch it on here.</p></div>
          <Toggle on={!!v.surcharge} label="Late-night or holiday rate" onChange={x => set({ ...v, surcharge: x ? { pct: 20, after: '22:00', holidays: true } : null })} />
        </div>
        {v.surcharge && (
          <div className="mt-3 space-y-2.5">
            <Label>Extra on top of your price</Label>
            <ChipRow size="sm" options={[10, 15, 20, 25, 50]} value={v.surcharge.pct} onChange={x => set({ ...v, surcharge: { ...v.surcharge, pct: x } })} format={p => `${p}%`} />
            <Label>Late-night starts at</Label>
            <ChipRow size="sm" options={['21:00', '22:00', '23:00']} value={v.surcharge.after} onChange={x => set({ ...v, surcharge: { ...v.surcharge, after: x } })} />
            <div className="flex items-center justify-between"><span className="text-[13px] font-bold text-ink">Also on public holidays</span>
              <Toggle on={!!v.surcharge.holidays} label="Public holidays" onChange={x => set({ ...v, surcharge: { ...v.surcharge, holidays: x } })} /></div>
          </div>
        )}
      </Card>
    </>
  )
}

export const extrasDone = (v, hasHourlyOvertime) =>
  (hasHourlyOvertime || Number(v?.overtime) > 0)
  && Object.values(v?.on ?? {}).every(a => String(a.fee ?? '').trim() !== '' && Number(a.fee) >= 0)
  && (!v?.waiting || Number(v.waiting.fee) > 0)
