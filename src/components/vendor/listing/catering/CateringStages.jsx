/**
 * Catering & Food — the stages that are forms: business profile, cuisines,
 * capacity, pricing & booking rules, availability & preparation, food safety.
 * The builders (dishes, menus, counters, packages) live in their own files.
 * Same controls as every other trade; answers land in `a.answers` (or
 * `a.cuisines`) so the shared draft, payload and review read them.
 */
import { useMemo, useState } from 'react'
import { Search, X, ShieldCheck, Lock } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, OptionCard, SectionTitle } from '../../anchor/ui'
import { ADVANCE, CANCELLATION_V3, SLA_V3, NOTICE_DAYS, HORIZON_MONTHS } from '../../anchor/options'
import { BasicsStage, AvailabilityStage } from '../stages'
import ComplianceStage from '../ComplianceStage'
import { SERVICES, PREP_LOCATIONS, SERVICE_STYLES, SERVICE_AREAS, useFoodTaxonomy, toR, toP } from './options'
import { profileDone, cuisinesDone, capacityDone, pricingRulesDone, prepDone, DECLARATIONS, foodSafetyDone } from './rules'
export { profileDone, cuisinesDone, capacityDone, pricingRulesDone, prepDone, DECLARATIONS, foodSafetyDone }


const num = x => { const c = String(x).replace(/[^\d]/g, ''); return c === '' ? null : Number(c) }
function Num({ label, hint, value, onChange, suffix, required }) {
  return (
    <div className="mt-3 first:mt-0">
      <Label required={required} hint={hint}>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1"><TextField inputMode="numeric" value={value ?? ''} onChange={x => onChange(num(x))} /></div>
        {suffix && <span className="text-[12px] font-bold text-ink/50">{suffix}</span>}
      </div>
    </div>
  )
}
const Multi = ({ options, value, onChange }) => <ChipRow multi options={options} value={value ?? []} onChange={onChange} />

/* ── 1. Business & service profile ──────────────────────────────────── */
export function ProfileStage({ a, put, vendorId, config, tried }) {
  const s = a.answers ?? {}
  const set = patch => put('answers')({ ...s, ...patch })
  return (
    <>
      <BasicsStage value={a.basics} set={put('basics')} vendorId={vendorId} config={config} />
      <Card className={`mt-3 ${tried && !(s.services ?? []).length ? 'ring-2 ring-rose-300' : ''}`}>
        <Label required>What catering services do you provide?</Label>
        <Multi options={[...SERVICES, 'Other']} value={s.services} onChange={x => set({ services: x })} />
        {(s.services ?? []).includes('Other') && (
          <div className="mt-3"><Label required>Tell us what other food service you provide.</Label>
            <TextField value={s.services_other} onChange={x => set({ services_other: x })} max={120} /></div>
        )}
      </Card>
      <Card className="mt-3">
        <Label required>Where is your food prepared?</Label>
        <div className="space-y-2">{PREP_LOCATIONS.map(p => <OptionCard key={p} on={s.prep_location === p} title={p} onClick={() => set({ prep_location: p })} />)}</div>
      </Card>
      <Card className="mt-3">
        <Label required>How do you serve food?</Label>
        <Multi options={[...SERVICE_STYLES, 'Other']} value={s.service_styles} onChange={x => set({ service_styles: x })} />
      </Card>
      <Card className="mt-3">
        <Label required hint="Travel costs are set separately, on Availability.">Where can you provide catering?</Label>
        <ChipRow options={SERVICE_AREAS.map(x => x[0])} value={s.service_area} onChange={x => set({ service_area: x })} format={id => SERVICE_AREAS.find(x => x[0] === id)[1]} />
      </Card>
    </>
  )
}

/* ── 3. Cuisines & food styles ──────────────────────────────────────── */
export function CuisineStage({ a, put, tried }) {
  const tax = useFoodTaxonomy()
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')
  const picked = a.cuisines ?? []
  const toggle = id => put('cuisines')(picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id])
  const groups = useMemo(() => tax.groups.map(g => ({ ...g, styles: g.styles.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || g.name.toLowerCase().includes(q.toLowerCase())) }))
    .filter(g => g.styles.length), [tax, q])
  const customs = picked.filter(id => id.startsWith('custom:'))
  return (
    <>
      <SectionTitle title="Which cuisines can you confidently prepare and serve?" sub="Choose the food styles you actually offer. You can select multiple cuisines and add your own style if it is not listed." />
      <div className="sticky top-0 z-10 -mx-1 mb-2 bg-[#fbfaff] px-1 pb-2">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-ink/[0.08]">
          <Search size={16} className="text-ink/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search cuisines — Udupi, Chettinad, Thai…" className="h-11 w-full bg-transparent text-[14px] font-semibold outline-none" />
        </div>
        {picked.length > 0 && <p className="mt-2 text-[12px] font-extrabold text-plum-700">{picked.length} selected</p>}
      </div>
      {groups.map(g => (
        <Card key={g.id} className="mt-3">
          <p className="mb-2 text-[13px] font-extrabold text-ink">{g.name}</p>
          {/* value is every pick across groups; ChipRow toggles the tapped one and hands back the whole list */}
          <ChipRow multi size="sm" options={g.styles.map(s => s.id)} value={picked} onChange={put('cuisines')}
            format={id => g.styles.find(s => s.id === id).name} />
        </Card>
      ))}
      <Card className="mt-3">
        <Label hint="Shown on your listing. A Sambramo reviewer checks custom styles before they become a standard choice.">Add your own style</Label>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1"><TextField value={custom} onChange={setCustom} max={40} placeholder="e.g. Havyaka cuisine" /></div>
          <button type="button" disabled={!custom.trim()} onClick={() => { put('cuisines')([...picked, `custom:${custom.trim()}`]); setCustom('') }}
            className="h-[50px] rounded-2xl bg-plum-700 px-4 text-[13px] font-extrabold text-white disabled:opacity-40">Add</button>
        </div>
        {customs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{customs.map(c => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-[12.5px] font-bold text-amber-900 ring-1 ring-amber-200">
            {c.slice(7)} · in review<button type="button" aria-label="Remove" onClick={() => toggle(c)}><X size={13} /></button></span>))}</div>}
      </Card>
      {tried && !picked.length && <p className="mt-2 text-center text-[12px] font-bold text-rose-600">Pick at least one cuisine.</p>}
      <p className="mt-3 px-1 text-[11.5px] leading-snug text-ink/50">These are the styles you can cook — not a promise about every dish. Each dish carries its own dietary details.</p>
    </>
  )
}

/* ── 4. Guest capacity & service types ──────────────────────────────── */
export function CapacityStage({ a, put }) {
  const s = a.answers ?? {}
  const set = patch => put('answers')({ ...s, ...patch })
  return (
    <>
      <SectionTitle title="Guest capacity & service" sub="What your kitchen and team can do — the booking engine never sells more than this." />
      <Card>
        <Num required label="Most guests at one event" value={s.max_guests} onChange={x => set({ max_guests: x })} suffix="guests" />
        <Num required label="Total guests you can cook for in a day" hint="Across every event that day." value={s.guests_per_day} onChange={x => set({ guests_per_day: x })} suffix="guests" />
        <Num required label="Events you can cater on the same day" value={s.events_per_day} onChange={x => set({ events_per_day: x })} />
        <Num required label="Serving staff available" value={s.staff} onChange={x => set({ staff: x })} suffix="people" />
        <Num label="Serving staff per 100 guests" value={s.staff_per_100} onChange={x => set({ staff_per_100: x })} />
        <Num label="Service hours included per event" value={s.service_hours} onChange={x => set({ service_hours: x })} suffix="hours" />
      </Card>
      {s.guests_per_day > 0 && s.max_guests > s.guests_per_day && <p className="mt-2 text-center text-[12px] font-bold text-rose-600">A day's capacity cannot be below one event's.</p>}
    </>
  )
}

/* ── 9. Pricing & minimum orders (+ booking rules) ──────────────────── */
export function PricingRulesStage({ a, put }) {
  const s = a.answers ?? {}, b = a.booking ?? {}
  const set = patch => put('answers')({ ...s, ...patch })
  const setB = patch => put('booking')({ ...b, ...patch })
  return (
    <>
      <SectionTitle title="Pricing & minimum orders" sub="Each menu, counter and package has its own price. These rules apply to every catering booking." />
      <Card>
        <Num required label="Minimum billable guests" hint="A smaller party is billed as this many." value={s.min_billable_guests} onChange={x => set({ min_billable_guests: x })} suffix="guests" />
        <div className="mt-4" />
        <Label required hint="Children are never half-price unless you say so on a menu.">Children</Label>
        <div className="space-y-2">
          <OptionCard on={s.child_policy === 'same'} title="Same price as adults" onClick={() => set({ child_policy: 'same' })} />
          <OptionCard on={s.child_policy === 'per_menu'} title="Set a child price on each menu" body="Only menus where you enter a child price charge it." onClick={() => set({ child_policy: 'per_menu' })} />
        </div>
      </Card>
      <Card className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold">Instant booking</p><p className="text-[12px] text-ink/55">When everything a customer asks for is priced and you have capacity.</p></div>
          <Toggle on={b.instant !== false} label="Instant booking" onChange={x => setB({ instant: x })} />
        </div>
        <div className="mt-4" /><Label required>Advance at booking</Label>
        <Segmented id="cat-adv" options={ADVANCE} value={b.advance_pct} onChange={x => setB({ advance_pct: x })} />
        <div className="mt-4" /><Label required>Cancellation policy</Label>
        <div className="space-y-2">{CANCELLATION_V3.map(c => <OptionCard key={c.id} on={b.cancellation === c.id} title={c.title} body={c.body} onClick={() => setB({ cancellation: c.id })} />)}</div>
      </Card>
      <Card className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[14px] font-extrabold">Accept custom quotes</p><p className="text-[12px] text-ink/55">Requests outside your menus come to you, pre-filled.</p></div>
          <Toggle on={b.custom_quotes !== false} label="Custom quotes" onChange={x => setB({ custom_quotes: x })} />
        </div>
        {b.custom_quotes !== false && <><div className="mt-3" /><Label required>Time to respond</Label>
          <ChipRow options={SLA_V3} value={b.quote_hours} onChange={x => setB({ quote_hours: x })} format={h => `${h} hrs`} /></>}
      </Card>
    </>
  )
}

/* ── 11. Availability & preparation schedule ────────────────────────── */
export function PrepStage({ a, put }) {
  const v = a.availability ?? {}
  const set = patch => put('availability')({ ...v, ...patch })
  return (
    <>
      <AvailabilityStage value={v} set={put('availability')} isTrip={false} />
      <Card className="mt-3">
        <p className="mb-1 text-[14px] font-extrabold">Preparation deadlines</p>
        <Num required label="Menu must be final" hint="Days before the event the customer can still change dishes." value={v.menu_freeze_days} onChange={x => set({ menu_freeze_days: x })} suffix="days before" />
        <Num required label="Final guest count by" value={v.guest_confirm_days} onChange={x => set({ guest_confirm_days: x })} suffix="days before" />
        <Num label="Setup before service" value={v.setup_minutes} onChange={x => set({ setup_minutes: x })} suffix="minutes" />
        <Num label="Teardown after service" value={v.teardown_minutes} onChange={x => set({ teardown_minutes: x })} suffix="minutes" />
        <Num label="Travel buffer between events" value={v.travel_buffer_minutes} onChange={x => set({ travel_buffer_minutes: x })} suffix="minutes" />
      </Card>
    </>
  )
}

/* ── 12. Food safety & business details ─────────────────────────────── */
export const FSSAI_TYPES = [['basic_registration', 'FSSAI Basic Registration'], ['state_licence', 'FSSAI State Licence'], ['central_licence', 'FSSAI Central Licence']]
export function FoodSafetyStage({ a, put, vendorId, config, tried }) {
  const s = a.answers ?? {}, f = s.fssai ?? {}
  const set = patch => put('answers')({ ...s, fssai: { ...f, ...patch } })
  const decl = s.declarations ?? []
  const numberBad = tried && !/^\d{14}$/.test(String(f.number ?? ''))
  return (
    <>
      <SectionTitle title="Food safety & business details" sub="FSSAI details are checked by the Sambramo team. Until they are, customers can still request quotes; instant booking switches on once verified." />
      <Card>
        <Label required>Registration / licence type</Label>
        <div className="space-y-2">{FSSAI_TYPES.map(([id, label]) => <OptionCard key={id} on={f.type === id} title={label} onClick={() => set({ type: id })} />)}</div>
        <div className="mt-4" />
        <Label required hint="14 digits, as printed on your certificate.">FSSAI number</Label>
        <TextField inputMode="numeric" value={f.number} onChange={x => set({ number: x.replace(/\D/g, '').slice(0, 14) })} valid={/^\d{14}$/.test(String(f.number ?? ''))} />
        {numberBad && <p className="mt-1 text-[12px] font-bold text-rose-600">An FSSAI number is 14 digits.</p>}
        <div className="mt-4" />
        <Label required>Valid until</Label>
        <TextField inputMode="numeric" value={f.expiry} placeholder="YYYY-MM-DD" onChange={x => set({ expiry: x.replace(/[^\d-]/g, '').slice(0, 10) })} />
        <div className="mt-4" />
        <Label required>Premises where food is prepared</Label>
        <TextField multiline rows={2} value={f.premises} onChange={x => set({ premises: x })} max={200} />
        <div className="mt-4" />
        <Label required>Person responsible for food operations</Label>
        <TextField value={f.responsible} onChange={x => set({ responsible: x })} max={60} />
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-ink/45"><Lock size={12} /> Never shown to customers.</p>
      </Card>
      <div className="mt-3"><ComplianceStage config={config} answers={s} vendorId={vendorId} /></div>
      <Card className="mt-3">
        <Label required>Food information & handling</Label>
        <div className="space-y-2">
          {DECLARATIONS.map(([id, text]) => {
            const on = decl.includes(id)
            return (
              <button key={id} type="button" onClick={() => put('answers')({ ...s, declarations: on ? decl.filter(x => x !== id) : [...decl, id] })}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ${on ? 'bg-forest-50 ring-1 ring-forest-500/50' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${on ? 'text-forest-600' : 'text-ink/25'}`} />
                <span className="text-[12.5px] font-semibold leading-snug text-ink/80">{text}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[11.5px] leading-snug text-ink/50">Claims such as "organic", "allergen-free" or "certified" are not shown unless you send the proof and Sambramo accepts it.</p>
      </Card>
    </>
  )
}

export { NOTICE_DAYS, HORIZON_MONTHS, toR, toP }
