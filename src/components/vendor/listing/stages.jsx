/**
 * The shared stages every trade's listing walks through, beside the trade's
 * own screens: about, extras, packages, capacity, availability, booking rules.
 * Built from the same controls as the Anchor & MC flow; nothing here is
 * specific to one trade — the trade config decides what each shows.
 */
import { useRef, useState } from 'react'
import { CalendarDays, ChevronRight, Camera, Lock, Users, Truck, Boxes, Building2, Gauge, Briefcase, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, OptionCard, SectionTitle } from '../anchor/ui'
import { ADVANCE, CANCELLATION_V3, SLA_V3, NOTICE_DAYS, HORIZON_MONTHS, TRAVEL_MODELS } from '../anchor/options'
import WorkUpload from '../WorkUpload'
import QuestionRenderer, { questionsDone } from './QuestionRenderer'
import { resourcesFor } from './payload'
import { customerFrom } from './PricingRulesEditor'
import CalendarFullScreen from '../../partner/calendar/CalendarFullScreen'
import { useVendorAccount } from '../../../hooks/useVendorAccount'
import { uploadAvatar, initialsFor } from '../../../lib/partnerAvatar'

const toR = p => (p === undefined || p === null || p === '' ? '' : String(Math.round(Number(p) / 100)))
const toP = r => (r === '' ? undefined : Math.round(Number(r) * 100))
const inr = p => `₹${Math.round((Number(p) || 0) / 100).toLocaleString('en-IN')}`

/* ── About your service (shared profile, per-trade override) ─────────── */

export const basicsDone = v => !!v?.display_name?.trim() && (v?.bio ?? '').trim().length >= 40 && !!v?.legal_name?.trim()

export function BasicsStage({ value, set, vendorId, config }) {
  const v = value ?? {}
  const fileIn = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function pick(file) {
    if (!file) return
    setBusy(true); setErr('')
    const r = await uploadAvatar(vendorId, file)
    setBusy(false)
    if (r.ok) set({ ...v, avatar_url: r.url }); else setErr(r.says)
  }
  return (
    <>
      <SectionTitle title={`Your ${config.serviceNoun}`} sub="What customers see first. Filled from your account — change anything for this service." />
      <Card>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileIn.current?.click()}
            className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-plum-100 to-plum-200 ring-4 ring-white">
            {v.avatar_url
              ? <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[22px] font-extrabold text-plum-700">{initialsFor(v.display_name || config.name)}</span>}
            <span className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-plum-700 text-white ring-2 ring-white"><Camera size={14} /></span>
          </button>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink">{busy ? 'Uploading…' : 'Photo or logo'}</p>
            {err && <p className="mt-1 text-[12px] font-bold text-rose-600">{err}</p>}
          </div>
          <input ref={fileIn} type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])} />
        </div>
      </Card>
      <Card className="mt-3">
        <Label required>Name customers see</Label>
        <TextField value={v.display_name} onChange={x => set({ ...v, display_name: x })} max={60} />
        <div className="mt-4" />
        <Label hint="One line under your name.">Tagline</Label>
        <TextField value={v.tagline} onChange={x => set({ ...v, tagline: x })} max={80} />
        <div className="mt-4" />
        <Label required hint="At least 40 characters: what you do, for whom, and what makes it yours.">About this service</Label>
        <TextField multiline value={v.bio} onChange={x => set({ ...v, bio: x })} max={600} />
      </Card>
      <Card className="mt-3 bg-[#f7f6fb]">
        <Label required right={<span className="inline-flex items-center gap-1"><Lock size={11} /> Private</span>}
          hint="Your name or business name as on your documents. Never shown to customers.">Legal name</Label>
        <TextField value={v.legal_name} onChange={x => set({ ...v, legal_name: x })} max={80} />
      </Card>
      <div className="mt-3">
        <WorkUpload value={v.work ?? []} onChange={w => set({ ...v, work: w })} trade={config.name}
          copy={{ photoTitle: 'Photos of your work', photoHint: 'Real work, not stock photos.' }} />
      </div>
    </>
  )
}

/* ── Extras & add-ons (from the trade's own list) ───────────────────── */

export const extrasDone = v => Object.values(v ?? {}).every(x => !x?.on || Number(x.take_home_paise) > 0)

export function ExtrasStage({ config, value, set, fee, tried }) {
  const v = value ?? {}
  return (
    <>
      <SectionTitle title="Extras & add-ons" sub="Switch on what you offer. Customers add them at booking; included ones are never charged twice." />
      {config.addons.map(ad => {
        const x = v[ad.id] ?? {}
        const bad = tried && x.on && !(Number(x.take_home_paise) > 0)
        return (
          <Card key={ad.id} className={`mt-3 ${bad ? 'ring-2 ring-rose-300' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-extrabold text-ink">{ad.label}</p>
                <p className="text-[12px] font-bold text-ink/45">{ad.unit.replace('per_', 'per ')}</p>
              </div>
              <Toggle on={!!x.on} label={ad.label} onChange={on => set({ ...v, [ad.id]: { ...x, on } })} />
            </div>
            {x.on && (
              <div className="mt-3">
                <Label required>You earn</Label>
                <TextField prefix="₹" inputMode="numeric" value={toR(x.take_home_paise)}
                  onChange={r => set({ ...v, [ad.id]: { ...x, take_home_paise: toP(r.replace(/\D/g, '').slice(0, 8)) } })} />
                {Number(x.take_home_paise) > 0 && <p className="mt-1.5 text-[12px] font-bold text-forest-700">Customer pays {inr(customerFrom(Number(x.take_home_paise), fee))}</p>}
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}

/* ── Packages (tier trades): suggested from the base rate, then yours ── */

export const packagesDone = v => (v ?? []).length > 0 && v.every(p => Number(p.take_home_paise) > 0 && p.name)

export function PackagesStage({ config, value, set, suggested, offered, fee, onRegenerate }) {
  const pkgs = value?.length ? value : suggested
  const put = (i, patch) => set(pkgs.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  if (!pkgs.length) return <p className="rounded-2xl bg-amber-50 p-4 text-[13px] font-bold text-amber-900">Set how you charge first. Your packages are suggested from it.</p>
  const addonIds = Object.entries(offered ?? {}).filter(([, x]) => x?.on).map(([id]) => id)
  return (
    <>
      <SectionTitle title={config.pricing.packages.label} sub="Suggested from your own rates. Change any price — we keep the suggestion beside yours for review." />
      {pkgs.map((p, i) => (
        <Card key={p.key} className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[16px] font-extrabold text-ink">{p.name}</p>
            {p.badge && <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-extrabold text-plum-700">{p.badge}</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-[2]">
              <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">You earn</p>
              <TextField prefix="₹" inputMode="numeric" value={toR(p.take_home_paise)} onChange={r => put(i, { take_home_paise: toP(r.replace(/\D/g, '').slice(0, 9)) })} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Hours</p>
              <TextField inputMode="decimal" value={p.hours ?? ''} onChange={r => put(i, { hours: Number(r.replace(/[^\d.]/g, '')) || null })} />
            </div>
          </div>
          <p className="mt-2 text-[12px] font-bold text-ink/55">
            Customer pays {inr(customerFrom(Number(p.take_home_paise) || 0, fee))}
            {p.generated_take_home_paise && p.generated_take_home_paise !== p.take_home_paise && <> · suggested {inr(p.generated_take_home_paise)}</>}
          </p>
          {addonIds.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11.5px] font-extrabold text-ink/55">Included at no extra charge</p>
              <ChipRow size="sm" multi options={addonIds} value={p.inclusions ?? []} onChange={x => put(i, { inclusions: x })}
                format={id => config.addons.find(a => a.id === id)?.label ?? id} />
            </div>
          )}
        </Card>
      ))}
      <button type="button" onClick={onRegenerate} className="mt-3 w-full text-center text-[12.5px] font-extrabold text-plum-700">Start again from my rates</button>
    </>
  )
}

/* ── What you can supply at once ────────────────────────────────────── */

const KIND_ICON = { staff: Users, vehicle: Truck, equipment: Boxes, space: Building2, capacity: Gauge, production: Gauge, project: Briefcase }

export const resourcesDone = (config, a) => questionsDone(config.resources.fields ?? [], a.answers)
  && (['TIME_PERFORMER', 'PROJECT_QUOTE'].includes(config.archetype) || resourcesFor(config, a).length > 0)

export function ResourcesStage({ config, a, setAnswers, tried }) {
  const list = resourcesFor(config, a)
  return (
    <>
      <SectionTitle title={config.resources.title ?? 'What you can supply'} sub="This is what stops two customers booking the same thing. It is checked on every booking." />
      <QuestionRenderer questions={config.resources.fields ?? []} answers={a.answers} set={setAnswers} trade={config.name} tried={tried} />
      <Card className="mt-3">
        <p className="mb-2 text-[13px] font-extrabold text-ink">We will reserve, per booking</p>
        {list.length === 0
          ? <p className="text-[12.5px] font-bold text-amber-700">Nothing yet — fill in your team, stock or capacity{config.catalogue ? ` and your ${config.catalogue.nounPlural}` : ''}.</p>
          : list.map(r => {
            const I = KIND_ICON[r.kind] ?? Gauge
            return (
              <div key={r.resource_key} className="flex items-center gap-3 border-t border-ink/[0.05] py-2 first:border-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><I size={15} /></span>
                <span className="flex-1 text-[13px] font-bold text-ink">{r.label}</span>
                <span className="text-[13px] font-extrabold text-ink">{r.quantity} {r.unit === 'unit_per_day' ? '/ day' : ''}</span>
              </div>
            )
          })}
      </Card>
    </>
  )
}

/* ── Availability & travel ──────────────────────────────────────────── */

function CalendarLauncher({ onClose }) {
  const acc = useVendorAccount()
  return (
    <CalendarFullScreen onBack={onClose} vendorId={acc.vendor?.id} vendor={acc.vendor}
      availability={acc.availability} weeklyRules={acc.weeklyRules} availabilityError={acc.availabilityError}
      onSetDay={acc.setDayStatus} onSetRange={acc.setRangeStatus} onClearDays={acc.clearDays} onSaveWeeklyRules={acc.saveWeeklyRules} />
  )
}

export const availabilityDone = (v, isTrip) => v?.min_notice_days != null && !!v?.horizon_months
  && (isTrip || (!!v?.travel_model && (v.travel_model !== 'flat' || Number(v.travel_fee_paise) > 0)
    && (v.travel_model !== 'per_km' || Number(v.travel_per_km_paise) > 0)))

export function AvailabilityStage({ value, set, isTrip }) {
  const v = value ?? {}
  const [cal, setCal] = useState(false)
  return (
    <>
      <SectionTitle title="Availability & travel" sub="Your dates live in your Calendar — the same one for every service you offer." />
      <button type="button" onClick={() => setCal(true)}
        className="flex w-full items-center gap-3 rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-900 p-4 text-left text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><CalendarDays size={20} /></span>
        <span className="flex-1"><span className="block text-[15px] font-extrabold">Open my calendar</span>
          <span className="block text-[12px] text-plum-100">Mark available, limited or blocked dates.</span></span>
        <ChevronRight size={18} />
      </button>
      <Card className="mt-3">
        <Label required hint="How far ahead a customer must book.">Minimum notice</Label>
        <ChipRow size="sm" options={NOTICE_DAYS} value={v.min_notice_days} onChange={x => set({ ...v, min_notice_days: x })}
          format={d => (d === 0 ? 'Same day' : `${d} day${d > 1 ? 's' : ''}`)} />
        <div className="mt-4" />
        <Label required>Booking window</Label>
        <ChipRow size="sm" options={HORIZON_MONTHS} value={v.horizon_months} onChange={x => set({ ...v, horizon_months: x })} format={m => `${m} months`} />
      </Card>
      {!isTrip && (
        <Card className="mt-3">
          <Label required hint="For venues outside the distance you set on the Location step.">Travel outside your area</Label>
          <div className="space-y-2">
            {TRAVEL_MODELS.map(t => <OptionCard key={t.id} on={v.travel_model === t.id} title={t.title} body={t.body} onClick={() => set({ ...v, travel_model: t.id })} />)}
          </div>
          {v.travel_model === 'flat' && (<div className="mt-3"><Label required>Outstation fee, you earn</Label>
            <TextField prefix="₹" inputMode="numeric" value={toR(v.travel_fee_paise)} onChange={x => set({ ...v, travel_fee_paise: toP(x.replace(/\D/g, '')) })} /></div>)}
          {v.travel_model === 'per_km' && (<div className="mt-3"><Label required>Per km beyond your area, you earn</Label>
            <TextField prefix="₹" inputMode="numeric" value={toR(v.travel_per_km_paise)} onChange={x => set({ ...v, travel_per_km_paise: toP(x.replace(/\D/g, '')) })} /></div>)}
        </Card>
      )}
      {cal && <CalendarLauncher onClose={() => setCal(false)} />}
    </>
  )
}

/* ── Booking & cancellation (no trade-specific rider) ───────────────── */

export const bookingDone = v => !!v?.advance_pct && !!v?.cancellation && (v?.custom_quotes === false || !!v?.quote_hours)

export function BookingStage({ value, set }) {
  const v = value ?? {}
  return (
    <>
      <SectionTitle title="Booking & cancellation" sub="These make instant payment safe for you and the customer." />
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold text-ink">Instant booking</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Customers book and pay without waiting for you, when everything is priced.</p></div>
          <Toggle on={v.instant !== false} label="Instant booking" onChange={x => set({ ...v, instant: x })} />
        </div>
      </Card>
      <Card className="mt-3"><Label required>Advance at booking</Label>
        <Segmented id="l-adv" options={ADVANCE} value={v.advance_pct} onChange={x => set({ ...v, advance_pct: x })} /></Card>
      <Card className="mt-3"><Label required>Cancellation policy</Label>
        <div className="space-y-2">{CANCELLATION_V3.map(c => <OptionCard key={c.id} on={v.cancellation === c.id} title={c.title} body={c.body} onClick={() => set({ ...v, cancellation: c.id })} />)}</div>
      </Card>
      <Card className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold text-ink">Accept custom quotes</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink/55">Requests outside your published prices come to you to price.</p></div>
          <Toggle on={v.custom_quotes !== false} label="Accept custom quotes" onChange={x => set({ ...v, custom_quotes: x })} />
        </div>
        {v.custom_quotes !== false && (<><div className="mt-4" />
          <Label required hint="If you do not respond in time, the request may go to another partner.">Time to respond</Label>
          <ChipRow options={SLA_V3} value={v.quote_hours} onChange={x => set({ ...v, quote_hours: x })} format={h => `${h} hrs`} /></>)}
      </Card>
    </>
  )
}

/* A tick list for the review stage. */
export function Tick({ ok, children, onEdit }) {
  return (
    <motion.button type="button" onClick={onEdit} whileTap={{ scale: 0.99 }}
      className="flex w-full items-center gap-3 border-t border-ink/[0.05] py-2.5 text-left first:border-0">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
        {ok ? <Check size={13} strokeWidth={3} /> : '!'}
      </span>
      <span className="flex-1 text-[13px] font-bold text-ink">{children}</span>
      <span className="text-[12px] font-extrabold text-plum-700">Edit</span>
    </motion.button>
  )
}
