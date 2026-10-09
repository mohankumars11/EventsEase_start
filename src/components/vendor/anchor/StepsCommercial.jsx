/**
 * Steps 5–7: the generated packages, when a job becomes a custom quote,
 * and the booking terms that make instant payment possible.
 */
import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'motion/react'
import { Award, Crown, Gem, Pencil, Check, X, RefreshCw, Inbox, Timer, FilePen, Send } from 'lucide-react'
import {
  Card, Label, TextField, Chip, ChipRow, Segmented, Toggle, OptionCard, Sheet, SectionTitle,
} from './ui'
import { ADDONS, SLA_HOURS, ADVANCE, CANCELLATION, TRAVEL_BILLING, RIDER, TIER_DEFAULTS } from './options'
import { rupees, takeHomeOf } from '../../../lib/tierPackages'

const TIER_LOOK = {
  ESSENTIAL: { icon: Award, from: 'from-amber-50', ring: 'ring-amber-200', tint: 'text-amber-700' },
  SIGNATURE: { icon: Crown, from: 'from-plum-50', ring: 'ring-plum-500', tint: 'text-plum-700' },
  VIP: { icon: Gem, from: 'from-sky-50', ring: 'ring-sky-200', tint: 'text-sky-700' },
}
const label = id => ADDONS.find(a => a.id === id)?.label ?? id

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
export function PackagesStep({ generated, overrides, setOverrides, offered, maxHours, onRegenerate }) {
  const pkgs = finalPackages(generated, overrides, offered)
  const [emblaRef, embla] = useEmblaCarousel({ align: 'center', startIndex: 1, containScroll: false })
  const [sel, setSel] = useState(1)
  const [editing, setEditing] = useState(null)

  const onSelect = useCallback(() => embla && setSel(embla.selectedScrollSnap()), [embla])
  useEffect(() => { if (!embla) return; onSelect(); embla.on('select', onSelect); return () => embla.off('select', onSelect) }, [embla, onSelect])

  return (
    <>
      <SectionTitle title="Your packages" sub="Built from your take-home. Swipe through, edit anything, then continue." />

      <div className="-mx-4 overflow-hidden pb-2 pt-4" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {pkgs.map((p, i) => {
            const look = TIER_LOOK[p.tier]
            const Icon = look.icon
            const active = i === sel
            return (
              <div key={p.tier} className="min-w-0 shrink-0 grow-0 basis-[78%] px-1.5">
                <motion.div animate={{ scale: active ? 1 : 0.92, opacity: active ? 1 : 0.6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`relative rounded-[26px] bg-gradient-to-b ${look.from} to-white p-5 ring-1 ${p.tier === 'SIGNATURE' ? 'ring-2' : ''} ${look.ring}`}>
                  {p.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-plum-600 to-fuchsia-500 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg">
                      ★ {p.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white ${look.tint} shadow-sm`}><Icon size={18} /></span>
                      <span className="text-[17px] font-extrabold text-ink">{p.name}</span>
                    </span>
                    <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p.tier)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink/60 shadow-sm"><Pencil size={15} /></button>
                  </div>

                  <p className="mt-4 text-[32px] font-extrabold leading-none tracking-tight text-ink">{rupees(p.price_paise)}</p>
                  <p className="mt-1 text-[12px] font-bold text-ink/50">
                    Customer price · you receive {rupees(takeHomeOf(p.price_paise))}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-ink/70 ring-1 ring-ink/[0.07]">
                    {p.duration_hours} hours
                  </span>

                  <div className="mt-4 space-y-1.5">
                    {Object.keys(offered).concat('pre_event_call').filter((x, k, arr) => arr.indexOf(x) === k).map(id => {
                      const inc = p.inclusions.includes(id)
                      return (
                        <p key={id} className={`flex items-center gap-2 text-[12.5px] ${inc ? 'font-bold text-ink' : 'text-ink/35 line-through'}`}>
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${inc ? 'bg-forest-600 text-white' : 'bg-ink/10 text-ink/40'}`}>
                            {inc ? <Check size={10} strokeWidth={3.5} /> : <X size={10} strokeWidth={3} />}
                          </span>
                          {label(id)}
                        </p>
                      )
                    })}
                  </div>
                  {p.edited && <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-plum-600">Edited by you</p>}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {pkgs.map((p, i) => (
          <button key={p.tier} type="button" aria-label={`Show ${p.name}`} onClick={() => embla?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${i === sel ? 'w-6 bg-plum-700' : 'w-2 bg-ink/15'}`} />
        ))}
      </div>

      <button type="button" onClick={onRegenerate}
        className="mx-auto mt-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200">
        <RefreshCw size={14} /> Reset to generated prices
      </button>

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
          <Label hint={`Generated: ${rupees(pkg.generated_price_paise)}. Changes go to our team for review.`}>Customer price</Label>
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
