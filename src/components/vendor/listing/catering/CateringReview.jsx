/**
 * Review everything (spec Part 17): the real saved data per section with
 * Edit, what is still missing, a customer preview and a booking-readiness
 * check. Nothing here is decorative — every line reads `a`.
 */
import { useState } from 'react'
import { Eye, ShieldCheck, Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, Sheet, SectionTitle } from '../../anchor/ui'
import { MenuPreview } from './MenuBuilder'
import { menuProblems, dishProblems, counterProblems, packageProblems, foodSafetyDone } from './rules'
import { CATERING_STAGES } from './cateringFlow'
import { useFoodTaxonomy, inr, customer, ADDON_UNIT_LABEL } from './options'

function Section({ id, title, ok, lines, missing, go }) {
  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-700'}`}>{ok ? <Check size={12} strokeWidth={3} /> : '!'}</span>{title}</p>
        <button type="button" onClick={() => go(id)} className="text-[12.5px] font-extrabold text-plum-700">Edit</button>
      </div>
      {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-1 text-[12.5px] text-ink/70">{l}</p>)}
      {missing?.length > 0 && <p className="mt-1.5 text-[12px] font-bold text-amber-700">Missing: {missing.join(' · ')}</p>}
    </Card>
  )
}

export default function CateringReview({ a, done, go, fee, payout }) {
  const tax = useFoodTaxonomy()
  const [preview, setPreview] = useState(false)
  const [ready, setReady] = useState(false)
  const s = a.answers ?? {}, av = a.availability ?? {}, b = a.booking ?? {}
  const dishes = (a.dishes ?? []).filter(d => d.active !== false)
  const menus = (a.menus ?? []).filter(m => m.status !== 'archived')
  const counters = (a.counters ?? []).filter(c => c.status !== 'archived')
  const packages = (a.packages ?? []).filter(p => p.status !== 'archived')
  const extras = (a.extras ?? []).filter(x => x.on)
  const cname = id => id.startsWith('custom:') ? `${id.slice(7)} (in review)` : tax.groups.flatMap(g => g.styles).find(x => x.id === id)?.name ?? id
  const unpricedDishes = dishes.filter(d => d.pricing_status === 'needs_price' || d.legacy?.needs_review)

  const checks = [
    ['Every section complete', CATERING_STAGES.slice(0, -1).every(x => done.has(x.id))],
    ['At least one priced menu', menus.some(m => m.price_model !== 'quote' && m.price_paise > 0)],
    ['FSSAI details entered (verification by Sambramo after submit)', foodSafetyDone(a)],
    ['Capacity set (guests per day, events at once, staff)', s.guests_per_day > 0 && s.events_per_day > 0 && s.staff > 0],
    ['Payout account ready for instant payments', !!payout?.route],
  ]
  return (
    <>
      <SectionTitle title="Review everything" sub="This is exactly what Sambramo reviews. Your listing goes live after approval; prices are then protected for 15 days." />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPreview(true)} className="flex items-center justify-center gap-1.5 rounded-[18px] bg-gradient-to-r from-plum-700 to-fuchsia-600 py-3 text-[13px] font-extrabold text-white"><Eye size={15} /> Preview my customer listing</button>
        <button type="button" onClick={() => setReady(true)} className="flex items-center justify-center gap-1.5 rounded-[18px] bg-white py-3 text-[13px] font-extrabold text-plum-700 ring-1 ring-plum-200"><ShieldCheck size={15} /> Review booking readiness</button>
      </div>

      <Section id="cat_profile" title="Business profile" ok={done.has('cat_profile')} go={go}
        lines={[a.basics?.display_name, (s.services ?? []).join(', '), s.prep_location, (s.service_styles ?? []).join(', ')]} />
      <Section id="cat_cuisines" title="Cuisines & food styles" ok={done.has('cat_cuisines')} go={go} lines={[(a.cuisines ?? []).map(cname).join(', ') || 'None yet']} />
      <Section id="cat_dishes" title={`Dish catalogue · ${dishes.length}`} ok={done.has('cat_dishes')} go={go}
        lines={[dishes.slice(0, 6).map(d => d.name).join(', ') + (dishes.length > 6 ? ` +${dishes.length - 6} more` : ''),
          `${dishes.filter(d => d.standalone?.on).length} sold separately · ${dishes.filter(d => d.diet === 'veg').length} vegetarian`]}
        missing={[...dishes.filter(d => dishProblems(d).length).map(d => `${d.name || 'Unnamed'}: ${dishProblems(d)[0]}`), ...unpricedDishes.map(d => `${d.name}: ${d.legacy?.needs_review ? 'review old value' : 'price'}`)].slice(0, 4)} />
      <Section id="cat_menus" title={`Menus · ${menus.length}`} ok={done.has('cat_menus')} go={go}
        lines={menus.map(m => `${m.name} — ${m.price_model === 'quote' ? 'custom quote' : `${inr(customer(m.price_paise, fee))} ${m.price_model === 'per_person' ? 'per guest' : 'fixed'}`} · ${(m.items ?? []).length} dishes · min ${m.min_guests ?? '—'}`)}
        missing={menus.filter(m => menuProblems(m, a.dishes).length).map(m => `${m.name || 'Untitled'}: ${menuProblems(m, a.dishes)[0]}`)} />
      <Section id="cat_counters" title={`Live counters · ${counters.length}`} ok={done.has('cat_counters')} go={go}
        lines={counters.length ? counters.map(c => `${c.name} — ${c.price_model === 'quote' ? 'quote' : inr(customer(c.price_paise, fee))} · ${c.duration_hours ?? '—'} h · ${c.included_servings ?? '—'} servings`) : ['No counters (optional)']}
        missing={counters.filter(c => counterProblems(c).length).map(c => `${c.name}: ${counterProblems(c)[0]}`)} />
      <Section id="cat_packages" title={`Catering packages · ${packages.length}`} ok={done.has('cat_packages')} go={go}
        lines={packages.length ? packages.map(p => `${p.name} — ${inr(customer(p.price_paise, fee))} ${p.price_model === 'per_guest' ? 'per guest' : 'fixed'} · ${p.guest_min}–${p.guest_max ?? '∞'} guests`) : ['No packages (optional)']}
        missing={packages.filter(p => packageProblems(p, a).length).map(p => `${p.name}: ${packageProblems(p, a)[0]}`)} />
      <Section id="cat_extras" title={`Extras · ${extras.length}`} ok={done.has('cat_extras')} go={go}
        lines={extras.map(x => `${x.label} — ${inr(customer(x.take_home_paise, fee))} ${ADDON_UNIT_LABEL[x.unit] ?? ''}`)} />
      <Section id="cat_pricing" title="Pricing & booking rules" ok={done.has('cat_pricing')} go={go}
        lines={[`Minimum billable guests: ${s.min_billable_guests ?? '—'}`, `Children: ${s.child_policy === 'per_menu' ? 'price per menu' : 'same as adults'}`,
          `Advance ${b.advance_pct ?? '—'}% · ${b.cancellation ?? '—'} cancellation · instant ${b.instant === false ? 'off' : 'on'}`]} />
      <Section id="cat_capacity" title="Capacity" ok={done.has('cat_capacity')} go={go}
        lines={[`Up to ${s.max_guests ?? '—'} guests per event · ${s.guests_per_day ?? '—'} per day · ${s.events_per_day ?? '—'} events a day · ${s.staff ?? '—'} staff`]} />
      <Section id="cat_prep" title="Availability & preparation" ok={done.has('cat_prep')} go={go}
        lines={[`Notice ${av.min_notice_days ?? '—'} days · menu final ${av.menu_freeze_days ?? '—'} days before · guest count ${av.guest_confirm_days ?? '—'} days before`]} />
      <Section id="cat_safety" title="Food safety & business" ok={done.has('cat_safety')} go={go}
        lines={[s.fssai?.number ? `FSSAI ${s.fssai.number} · valid until ${s.fssai.expiry ?? '—'} · verification pending until Sambramo checks it` : 'FSSAI not entered']} />

      <Sheet open={preview} onOpenChange={o => !o && setPreview(false)} title="Your customer listing">
        <p className="mb-2 text-[18px] font-extrabold">{a.basics?.display_name}</p>
        {a.basics?.tagline && <p className="mb-3 text-[12.5px] text-ink/60">{a.basics.tagline}</p>}
        {packages.map(p => (
          <div key={p.key} className="mb-2 flex justify-between rounded-2xl bg-plum-50 p-3"><span className="text-[13.5px] font-extrabold">{p.name}</span>
            <span className="text-[13.5px] font-extrabold">{inr(customer(p.price_paise, fee))}{p.price_model === 'per_guest' ? '/guest' : ''}</span></div>))}
        {menus.map(m => <div key={m.menu_key} className="mb-3"><MenuPreview menu={m} dishes={a.dishes ?? []} tax={tax} fee={fee} /></div>)}
        {counters.length > 0 && <><p className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Live counters</p>
          {counters.map(c => <p key={c.counter_key} className="text-[13px]">{c.name} · {c.price_model === 'quote' ? 'on request' : inr(customer(c.price_paise, fee))}</p>)}</>}
      </Sheet>
      <Sheet open={ready} onOpenChange={o => !o && setReady(false)} title="Booking readiness">
        {checks.map(([l, okk]) => (
          <div key={l} className="flex items-center gap-3 border-t border-ink/[0.05] py-2.5 first:border-0">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${okk ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-700'}`}>{okk ? <Check size={13} strokeWidth={3} /> : <AlertTriangle size={13} />}</span>
            <span className="text-[13px] font-bold">{l}</span>
          </div>))}
        <p className="mt-3 text-[12px] leading-snug text-ink/55">Instant Book & Pay needs all of these plus Sambramo's approval and FSSAI verification. Until then, customers can still send you requests that you price.</p>
        {CATERING_STAGES.slice(0, -1).filter(x => !done.has(x.id)).map(x => (
          <button key={x.id} type="button" onClick={() => { setReady(false); go(x.id) }} className="mt-2 flex w-full items-center justify-between rounded-2xl bg-amber-50 p-3 text-left text-[12.5px] font-extrabold text-amber-900">
            Finish: {x.label}<ChevronRight size={15} /></button>))}
      </Sheet>
    </>
  )
}
