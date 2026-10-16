/**
 * Steps 5–7: the generated packages, when a job becomes a custom quote,
 * and the booking terms that make instant payment possible.
 */
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Pencil, Check, X, Inbox, Timer, FilePen, Send } from 'lucide-react'
import {
  Card, Label, TextField, Chip, ChipRow, Segmented, Toggle, OptionCard, Sheet, SectionTitle,
} from './ui'
import { ADDONS, ADDONS_V3, SLA_HOURS, ADVANCE, CANCELLATION, TRAVEL_BILLING, RIDER, TIER_DEFAULTS } from './options'
import { rupees, takeHomeOf } from '../../../lib/tierPackages'
import PackageCarousel from '../packages/PackageCarousel'

const label = id => ADDONS_V3.find(a => a.id === id)?.label ?? ADDONS.find(a => a.id === id)?.label ?? id

/** Merge the generated tier with whatever the partner changed on it. */
export function finalPackages(generated, overrides = {}, offered = {}) {
  return generated.map(t => {
    const o = overrides[t.tier] ?? {}
    const inclusions = (o.inclusions ?? TIER_DEFAULTS[t.tier]).filter(id => id in offered || id === 'pre_event_call')
    return {
      ...t,
      generated_price_paise: t.price_paise,
      price_paise: o.price_paise ?? t.price_paise,
      duration_hours: o.duration_hours ?? t.duration_hours,
      inclusions,
      edited: o.price_paise != null || o.duration_hours != null || o.inclusions != null,
    }
  })
}

/* ═══ 5 · Packages ═════════════════════════════════════════════════════ */
/** Anchor's tier -> the shape PackageCarousel draws.
 *
 *  `price_paise` on an anchor package is the CUSTOMER price, so the rate
 *  the partner is shown is takeHomeOf() of it -- their own number, not a
 *  total derived from the platform fee. The carousel labels it
 *  "Your rate" and there is no second line quoting the customer. */
export function toCardPackages(pkgs, offered) {
  const ids = Object.keys(offered).concat('pre_event_call').filter((x, k, arr) => arr.indexOf(x) === k)
  return pkgs.map(p => ({
    key: p.tier,
    name: p.name,
    ratePaise: takeHomeOf(p.price_paise),
    unit: 'per event',
    meta: `${p.duration_hours} hours`,
    base: `${p.duration_hours} hours of hosting`,
    badge: p.badge,
    edited: p.edited,
    inclusions: ids.map(id => ({ id, label: label(id), included: p.inclusions.includes(id) })),
  }))
}

export function PackagesStep({ generated, overrides, setOverrides, offered, maxHours, onRegenerate }) {
  const pkgs = finalPackages(generated, overrides, offered)
  const [editing, setEditing] = useState(null)

  return (
    <>
      <SectionTitle title="Your packages" sub="Built from your rate. Swipe through, edit anything, then continue." />

      <PackageCarousel
        packages={toCardPackages(pkgs, offered)}
        editable
        onEdit={p => setEditing(p.key)}
        onReset={onRegenerate}
      />

      <EditSheet tier={editing} pkg={pkgs.find(p => p.tier === editing)} offered={offered} maxHours={maxHours}
        onClose={() => setEditing(null)}
        onSave={o => { setOverrides({ ...overrides, [editing]: o }); setEditing(null) }} />
    </>
  )
}

function EditSheet({ tier, pkg, offered, maxHours, onClose, onSave }) {
  const [price, setPrice] = useState('')
  const [hours, setHours] = useState(null)
  const [inc, setInc] = useState([])
  useEffect(() => {
    if (!pkg) return
    setPrice(String(Math.round(pkg.price_paise / 100)))
    setHours(pkg.duration_hours)
    setInc(pkg.inclusions)
  }, [tier]) // eslint-disable-line react-hooks/exhaustive-deps
  const hourOpts = [1, 2, 3, 4, 5, 6, 8, 10, 12].filter(h => h <= (maxHours || 12))
  const ids = Object.keys(offered).concat('pre_event_call').filter((x, k, a) => a.indexOf(x) === k)
  return (
    <Sheet open={!!tier} onOpenChange={o => !o && onClose()} title={pkg ? `Edit ${pkg.name}` : ''}>
      {pkg && (
        <>
          <Label hint={`Suggested: ${rupees(takeHomeOf(pkg.generated_price_paise))}. Changes go to our team for review.`}>Your rate</Label>
          <TextField prefix="₹" inputMode="numeric" value={price} onChange={x => setPrice(x.replace(/\D/g, '').slice(0, 7))} />
          <p className="mt-1.5 text-[12px] font-bold text-forest-700">You receive {rupees(takeHomeOf(Number(price) * 100))}</p>
          <div className="mt-5" />
          <Label>Hours included</Label>
          <ChipRow size="sm" options={hourOpts} value={hours} onChange={setHours} format={h => `${h}h`} />
          <div className="mt-5" />
          <Label>Included in this package</Label>
          <div className="flex flex-wrap gap-2">
            {ids.map(id => (
              <Chip key={id} size="sm" on={inc.includes(id)} onClick={() => setInc(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])}>{label(id)}</Chip>
            ))}
          </div>
          <button type="button" disabled={!(Number(price) > 0)}
            onClick={() => onSave({ price_paise: Number(price) * 100, duration_hours: hours, inclusions: inc })}
            className="mt-6 h-[52px] w-full rounded-full bg-plum-700 text-[15px] font-extrabold text-white disabled:opacity-30">Save package</button>
        </>
      )}
    </Sheet>
  )
}

/* ═══ 6 · Rules ════════════════════════════════════════════════════════ */
export function RulesStep({ value, set }) {
  const v = value ?? {}
  return (
    <>
      <SectionTitle title="Custom quote rules" sub="Big or unusual events come to you as a quote instead of an instant booking." />
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-extrabold text-ink">Accept custom quotes</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Multi-day events, very large audiences, or longer than your packages.</p>
          </div>
          <Toggle on={v.custom_quotes !== false} label="Accept custom quotes" onChange={x => set({ ...v, custom_quotes: x })} />
        </div>
      </Card>

      {v.custom_quotes !== false && (
        <>
          <Card className="mt-3">
            <Label required hint="Only send me a request if the budget is at least this.">Minimum budget</Label>
            <TextField prefix="₹" inputMode="numeric" value={v.min_budget} placeholder="100000"
              onChange={x => set({ ...v, min_budget: x.replace(/\D/g, '').slice(0, 8) })} />
          </Card>
          <Card className="mt-3">
            <Label required hint="If you do not answer in time, the request goes to another anchor.">Reply within</Label>
            <ChipRow options={SLA_HOURS} value={v.sla_hours} onChange={x => set({ ...v, sla_hours: x })} format={h => `${h} hrs`} />
          </Card>
          <div className="mt-4 rounded-[22px] bg-plum-950 p-4 text-white">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-300">How it works</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[[Inbox, 'Client asks'], [FilePen, 'We draft a quote'], [Timer, 'You review in time'], [Send, 'Client pays']].map(([I, t], i) => (
                <div key={t}>
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><I size={18} /></span>
                  <p className="mt-1.5 text-[10.5px] font-bold leading-tight text-plum-100">{i + 1}. {t}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export const rulesDone = v => v?.custom_quotes === false || (Number(v?.min_budget) > 0 && !!v?.sla_hours)

/* ═══ 7 · Publish ══════════════════════════════════════════════════════ */
export function PublishStep({ value, set, summary }) {
  const v = value ?? {}
  const rider = v.rider ?? []
  return (
    <>
      <SectionTitle title="Booking terms" sub="The last step. These make instant payment safe for both sides." />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-extrabold text-ink">Instant booking</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Clients pay and lock your date without waiting for you.</p>
          </div>
          <Toggle on={v.instant !== false} label="Instant booking" onChange={x => set({ ...v, instant: x })} />
        </div>
      </Card>

      <Card className="mt-3">
        <Label required>Advance at booking</Label>
        <Segmented id="advance" options={ADVANCE} value={v.advance} onChange={x => set({ ...v, advance: x })} />
      </Card>

      <Card className="mt-3">
        <Label required>Cancellation policy</Label>
        <div className="space-y-2">
          {CANCELLATION.map(c => <OptionCard key={c.id} on={v.cancellation === c.id} title={c.title} body={c.body} onClick={() => set({ ...v, cancellation: c.id })} />)}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[14px] font-extrabold text-ink">I travel outside my city</p>
          <Toggle on={!!v.outstation} label="Outstation travel" onChange={x => set({ ...v, outstation: x })} />
        </div>
        {v.outstation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="-mx-1 mt-2 space-y-2 overflow-hidden px-1 pb-1 pt-1">
            {TRAVEL_BILLING.map(t => <OptionCard key={t.id} on={v.travel_billing === t.id} title={t.title} body={t.body} onClick={() => set({ ...v, travel_billing: t.id })} />)}
            {v.travel_billing === 'flat_fee' && (
              <TextField prefix="₹" inputMode="numeric" value={v.travel_fee} placeholder="25000"
                onChange={x => set({ ...v, travel_fee: x.replace(/\D/g, '').slice(0, 7) })} />
            )}
          </motion.div>
        )}
      </Card>

      <Card className="mt-3">
        <Label required hint="Tap each to confirm. Clients see these before they pay.">Technical rider</Label>
        <div className="space-y-2">
          {RIDER.map(r => {
            const on = rider.includes(r.id)
            return (
              <motion.button key={r.id} type="button" whileTap={{ scale: 0.98 }}
                onClick={() => set({ ...v, rider: on ? rider.filter(x => x !== r.id) : [...rider, r.id] })}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${on ? 'bg-forest-50 ring-1 ring-forest-500/50' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? 'bg-forest-600 text-white' : 'ring-2 ring-ink/15'}`}>
                  {on && <Check size={13} strokeWidth={3.5} />}
                </span>
                <span className="text-[12.5px] font-semibold leading-snug text-ink/80">{r.label}</span>
              </motion.button>
            )
          })}
        </div>
      </Card>

      {summary}
    </>
  )
}

export const publishDone = v => !!(v?.advance && v?.cancellation && (v?.rider?.length ?? 0) === RIDER.length
  && (!v?.outstation || (v?.travel_billing && (v.travel_billing !== 'flat_fee' || Number(v?.travel_fee) > 0))))
