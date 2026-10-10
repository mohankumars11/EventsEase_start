/**
 * Live counters, catering packages and extras (spec Parts 11–13).
 *
 * A counter is a bookable service of its own: dishes, how many servings and
 * hours its price covers, staff, equipment and its own price model — never a
 * dish flag, never "unlimited". A package combines the partner's real menus
 * and counters (by key) with stated inclusions and exclusions; tiers are
 * optional. Extras are priced by their own unit and never charged twice when
 * a package includes them.
 */
import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Archive, ArchiveRestore, ChefHat, Package, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, Sheet, SectionTitle, OptionCard } from '../../anchor/ui'
import { COUNTER_TEMPLATES, COUNTER_PRICE_MODELS, EVENT_TYPES, INCLUDED_SERVICES, ADDON_TEMPLATES, ADDON_UNIT_LABEL, slugKey, toR, toP, inr, customer } from './options'
import { counterProblems, countersDone, packageProblems, packagesDone, extrasDone } from './rules'
export { counterProblems, countersDone, packageProblems, packagesDone, extrasDone }

const n = x => Number(String(x).replace(/[^\d.]/g, '')) || null
const Field = ({ label, children, required, hint }) => <div className="mt-3"><Label required={required} hint={hint}>{label}</Label>{children}</div>
const Money = ({ value, onChange }) => <TextField prefix="₹" inputMode="numeric" value={toR(value)} onChange={x => onChange(toP(x))} />
const Int = ({ value, onChange, placeholder }) => <TextField inputMode="numeric" value={value ?? ''} onChange={x => onChange(n(x))} placeholder={placeholder} />

/* ══ Live counters ═════════════════════════════════════════════════════ */
function CounterEditor({ c, set, dishes, fee, tried }) {
  const put = patch => set({ ...c, ...patch })
  const probs = tried ? counterProblems(c) : []
  const model = c.price_model
  return (
    <div>
      <Label required>Counter type</Label>
      {COUNTER_TEMPLATES.map(([group, types]) => (
        <div key={group} className="mb-2"><p className="mb-1 text-[11px] font-extrabold uppercase text-ink/40">{group}</p>
          <ChipRow size="sm" options={types} value={c.counter_type} onChange={x => put({ counter_type: x, name: c.name || x })} /></div>
      ))}
      <Field label="Counter name" required><TextField value={c.name} onChange={x => put({ name: x })} max={60} /></Field>
      <Field label="Description"><TextField multiline rows={2} value={c.description} onChange={x => put({ description: x })} max={200} /></Field>
      <Field label="Dishes served at this counter" required hint="From your Food Catalogue.">
        <ChipRow multi size="sm" options={dishes.filter(d => d.active !== false).map(d => d.item_key)} value={c.dish_keys ?? []} onChange={x => put({ dish_keys: x })}
          format={k => dishes.find(d => d.item_key === k)?.name ?? k} /></Field>
      <Field label="How do you charge?" required>
        <ChipRow size="sm" options={COUNTER_PRICE_MODELS.map(x => x[0])} value={model} onChange={x => put({ price_model: x })} format={id => COUNTER_PRICE_MODELS.find(x => x[0] === id)[1]} /></Field>
      {model && model !== 'quote' && <Field label={{ per_event: 'Price per counter per event', per_hour: 'Price per counter per hour', per_guest: 'Price per guest', per_serving: 'Price per serving', fixed: 'Fixed package price' }[model] + ', you earn'} required>
        <Money value={c.price_paise} onChange={x => put({ price_paise: x })} />
        {c.price_paise > 0 && <p className="mt-1 text-[12px] font-bold text-forest-700">Customer pays {inr(customer(c.price_paise, fee))}</p>}</Field>}
      <div className="flex gap-2">
        <div className="flex-1"><Field label={model === 'per_hour' ? 'Minimum hours' : 'Hours the price covers'} required={['per_event', 'fixed', 'per_hour'].includes(model)}><Int value={c.duration_hours} onChange={x => put({ duration_hours: x })} /></Field></div>
        <div className="flex-1"><Field label="Servings included" required={['per_event', 'fixed'].includes(model)}><Int value={c.included_servings} onChange={x => put({ included_servings: x })} /></Field></div>
      </div>
      {['per_event', 'fixed', 'per_hour'].includes(model) && <div className="flex gap-2">
        <div className="flex-1"><Field label="Each extra serving" hint="Empty = more goes to a quote."><Money value={c.extra_serving_paise} onChange={x => put({ extra_serving_paise: x })} /></Field></div>
        <div className="flex-1"><Field label="Each extra hour"><Money value={c.extra_hour_paise} onChange={x => put({ extra_hour_paise: x })} /></Field></div>
      </div>}
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Servings per hour"><Int value={c.serving_capacity} onChange={x => put({ serving_capacity: x })} /></Field></div>
        <div className="flex-1"><Field label="Chefs / staff"><Int value={c.chefs} onChange={x => put({ chefs: x })} /></Field></div>
        <div className="flex-1"><Field label="Run at once" required><Int value={c.available_qty} onChange={x => put({ available_qty: x })} /></Field></div>
      </div>
      <Field label="Equipment included"><TextField value={c.equipment} onChange={x => put({ equipment: x })} max={120} placeholder="e.g. 2 dosa tawas, gas burner" /></Field>
      <Field label="Power / water needed at the venue"><TextField value={c.power_water} onChange={x => put({ power_water: x })} max={120} /></Field>
      <Field label="Space needed"><TextField value={c.space_required} onChange={x => put({ space_required: x })} max={60} placeholder="e.g. 8 × 6 ft" /></Field>
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Setup (min)"><Int value={c.setup_minutes} onChange={x => put({ setup_minutes: x })} /></Field></div>
        <div className="flex-1"><Field label="Dismantle (min)"><Int value={c.dismantle_minutes} onChange={x => put({ dismantle_minutes: x })} /></Field></div>
        <div className="flex-1"><Field label="Lead (days)"><Int value={c.lead_days} onChange={x => put({ lead_days: x })} /></Field></div>
      </div>
      <Field label="Indoor / outdoor"><Segmented id="ctr-io" value={c.indoor_outdoor ?? 'both'} onChange={x => put({ indoor_outdoor: x })}
        options={[{ value: 'indoor', label: 'Indoor' }, { value: 'outdoor', label: 'Outdoor' }, { value: 'both', label: 'Both' }]} /></Field>
      {probs.length > 0 && <p className="mt-3 text-[12px] font-bold text-rose-600">Still needed: {probs.join(', ')}.</p>}
    </div>
  )
}

export function CounterBuilder({ a, put, fee }) {
  const counters = a.counters ?? [], dishes = a.dishes ?? []
  const [open, setOpen] = useState(null), [tried, setTried] = useState(false)
  const legacy = dishes.filter(d => d.legacy?.counter_price_paise && !d.legacy?.counter_migrated)
  const blank = (seed = {}) => ({ counter_key: slugKey('counter'), counter_type: null, name: '', description: '', dish_keys: [], price_model: null,
    price_paise: null, duration_hours: null, included_servings: null, available_qty: 1, chefs: 1, indoor_outdoor: 'both', status: 'active', ...seed })
  const save = () => {
    if (counterProblems(open).length) { setTried(true); return }
    put('counters')(counters.some(x => x.counter_key === open.counter_key) ? counters.map(x => (x.counter_key === open.counter_key ? open : x)) : [...counters, open])
    if (open.from_dish) put('dishes')(dishes.map(d => (d.item_key === open.from_dish ? { ...d, legacy: { ...d.legacy, counter_migrated: true, needs_review: false }, pricing_status: 'ok' } : d)))
    setOpen(null)
  }
  return (
    <>
      <SectionTitle title="Live Counters" sub="Each counter is a service with its own dishes, capacity and price. Skip this if you don't run counters." />
      {legacy.map(d => (
        <div key={d.item_key} className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="flex-1"><p className="text-[12.5px] font-semibold text-amber-900">Your earlier form priced <b>{d.name}</b> at <b>{inr(d.legacy.counter_price_paise)} per counter</b>. Confirm it as a counter — say how many hours and servings that covers.</p>
            <button type="button" onClick={() => { setOpen(blank({ name: `${d.name} Counter`, dish_keys: [d.item_key], price_model: 'per_event', price_paise: d.legacy.counter_price_paise, from_dish: d.item_key })); setTried(false) }}
              className="mt-2 rounded-full bg-amber-900 px-3 py-1.5 text-[12px] font-extrabold text-white">Create counter from this</button></div>
        </div>
      ))}
      {counters.map(c => { const p = counterProblems(c); return (
        <Card key={c.counter_key} className={`mt-3 ${c.status === 'archived' ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><ChefHat size={18} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-extrabold">{c.name}</p>
              <p className="truncate text-[12px] font-bold text-ink/55">{c.price_model === 'quote' ? 'Custom quote' : c.price_paise ? `${inr(customer(c.price_paise, fee))} ${COUNTER_PRICE_MODELS.find(x => x[0] === c.price_model)?.[1].toLowerCase()}` : 'No price'}
                {c.duration_hours ? ` · ${c.duration_hours} h` : ''}{c.included_servings ? ` · ${c.included_servings} servings` : ''}</p>
              {p.length > 0 && c.status !== 'archived' && <p className="text-[11.5px] font-bold text-amber-700">Needs: {p[0]}</p>}</div>
            <button type="button" aria-label="Edit" onClick={() => { setOpen({ ...c }); setTried(false) }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-plum-700"><Pencil size={15} /></button>
            <button type="button" aria-label="Archive" onClick={() => put('counters')(counters.map(x => (x.counter_key === c.counter_key ? { ...x, status: x.status === 'archived' ? 'active' : 'archived' } : x)))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-ink/60">{c.status === 'archived' ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>
          </div>
        </Card>) })}
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => { setOpen(blank()); setTried(false) }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-plum-300 bg-white py-4 text-[14px] font-extrabold text-plum-700"><Plus size={17} /> Add a live counter</motion.button>
      <Sheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }} title="Live counter">
        {open && <CounterEditor c={open} set={setOpen} dishes={dishes} fee={fee} tried={tried} />}
        <button type="button" onClick={save} className="mt-4 h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">Save counter</button>
      </Sheet>
    </>
  )
}

/* ══ Catering packages ═════════════════════════════════════════════════ */
export const TIERS = [[null, 'No tier'], ['ESSENTIAL', 'Essential'], ['SIGNATURE', 'Signature'], ['PREMIUM', 'Premium']]
function PackageEditor({ p, set, a, fee, tried }) {
  const put = patch => set({ ...p, ...patch })
  const menus = (a.menus ?? []).filter(m => m.status !== 'archived'), counters = (a.counters ?? []).filter(c => c.status !== 'archived')
  const extras = (a.extras ?? []).filter(x => x.on)
  const probs = tried ? packageProblems(p, a) : []
  return (
    <div>
      <Field label="What would you like to call this catering package?" required><TextField value={p.name} onChange={x => put({ name: x })} max={60} placeholder="e.g. Karnataka Traditional Wedding Feast" /></Field>
      <Field label="Description"><TextField multiline rows={2} value={p.description} onChange={x => put({ description: x })} max={240} /></Field>
      <Field label="Tier" hint="Optional. Only use tiers if they genuinely differ."><ChipRow size="sm" options={TIERS.map(t => t[0])} value={p.tier ?? null} onChange={x => put({ tier: x })} format={id => TIERS.find(t => t[0] === id)[1]} /></Field>
      <Field label="Menus in this package" required><ChipRow multi size="sm" options={menus.map(m => m.menu_key)} value={p.menu_keys ?? []} onChange={x => put({ menu_keys: x })} format={k => menus.find(m => m.menu_key === k)?.name} /></Field>
      {counters.length > 0 && <Field label="Live counters included"><ChipRow multi size="sm" options={counters.map(c => c.counter_key)} value={p.counter_keys ?? []} onChange={x => put({ counter_keys: x })} format={k => counters.find(c => c.counter_key === k)?.name} /></Field>}
      {extras.length > 0 && <Field label="Extras included at no charge"><ChipRow multi size="sm" options={extras.map(x => x.id)} value={p.included_addons ?? []} onChange={x => put({ included_addons: x })} format={id => extras.find(x => x.id === id)?.label} /></Field>}
      <Field label="Services included"><ChipRow multi size="sm" options={INCLUDED_SERVICES.map(x => x[0])} value={p.included_services ?? []} onChange={x => put({ included_services: x })} format={id => INCLUDED_SERVICES.find(x => x[0] === id)[1]} /></Field>
      <Field label="Not included"><TextField value={p.exclusions} onChange={x => put({ exclusions: x })} max={200} placeholder="e.g. Venue rental, decoration, alcohol" /></Field>
      <Field label="Events"><ChipRow multi size="sm" options={EVENT_TYPES} value={p.event_types ?? []} onChange={x => put({ event_types: x })} /></Field>
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Min guests" required><Int value={p.guest_min} onChange={x => put({ guest_min: x })} /></Field></div>
        <div className="flex-1"><Field label="Max guests"><Int value={p.guest_max} onChange={x => put({ guest_max: x })} /></Field></div>
        <div className="flex-1"><Field label="Hours" required><Int value={p.hours} onChange={x => put({ hours: x })} /></Field></div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Serving staff"><Int value={p.staff} onChange={x => put({ staff: x })} /></Field></div>
        <div className="flex-[2]"><Field label="Equipment / setup"><TextField value={p.equipment} onChange={x => put({ equipment: x })} max={80} /></Field></div>
      </div>
      <Field label="How is this package priced?" required>
        <Segmented id="pkg-price" value={p.price_model} onChange={x => put({ price_model: x })} options={[{ value: 'per_guest', label: 'Per guest' }, { value: 'fixed', label: 'Fixed price' }]} /></Field>
      <Field label={p.price_model === 'fixed' ? 'Package price, you earn' : 'Price per guest, you earn'} required><Money value={p.price_paise} onChange={x => put({ price_paise: x })} />
        {p.price_paise > 0 && <p className="mt-1 text-[12px] font-bold text-forest-700">Customer pays {inr(customer(p.price_paise, fee))}{p.price_model === 'per_guest' ? ' per guest' : ''}
          {p.price_model === 'fixed' && p.guest_min ? ` · ≈ ${inr(customer(p.price_paise, fee) / p.guest_min)} per guest at ${p.guest_min}` : ''}</p>}</Field>
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Each extra guest"><Money value={p.extra_guest_paise} onChange={x => put({ extra_guest_paise: x })} /></Field></div>
        <div className="flex-1"><Field label="Child price"><Money value={p.child_price_paise} onChange={x => put({ child_price_paise: x })} /></Field></div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1"><Field label="Each extra counter"><Money value={p.extra_counter_paise} onChange={x => put({ extra_counter_paise: x })} /></Field></div>
        <div className="flex-1"><Field label="Overtime per hour"><Money value={p.overtime_paise} onChange={x => put({ overtime_paise: x })} /></Field></div>
      </div>
      {probs.length > 0 && <p className="mt-3 text-[12px] font-bold text-rose-600">Still needed: {probs.join(', ')}.</p>}
    </div>
  )
}

export function PackageBuilder({ a, put, fee }) {
  const packages = a.packages ?? []
  const [open, setOpen] = useState(null), [tried, setTried] = useState(false)
  const blank = () => ({ key: slugKey('pkg'), name: '', tier: null, menu_keys: [], counter_keys: [], included_addons: [], included_services: [], price_model: 'per_guest', status: 'active' })
  const save = () => {
    if (packageProblems(open, a).length) { setTried(true); return }
    put('packages')(packages.some(x => x.key === open.key) ? packages.map(x => (x.key === open.key ? open : x)) : [...packages, open]); setOpen(null)
  }
  return (
    <>
      <SectionTitle title="Catering Packages" sub="A complete offer: your menus plus counters, staff and setup. Optional — customers can also book a menu on its own." />
      {packages.map(p => { const q = packageProblems(p, a); return (
        <Card key={p.key} className={`mt-3 ${p.status === 'archived' ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-plum-700">{p.tier ? <Sparkles size={18} /> : <Package size={18} />}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-extrabold">{p.name}{p.tier ? <span className="ml-1.5 rounded-full bg-plum-100 px-2 py-0.5 text-[10.5px] text-plum-700">{TIERS.find(t => t[0] === p.tier)?.[1]}</span> : null}</p>
              <p className="truncate text-[12px] font-bold text-ink/55">{p.price_paise ? `${inr(customer(p.price_paise, fee))} ${p.price_model === 'per_guest' ? 'per guest' : 'fixed'}` : 'No price'} · {p.guest_min ?? '—'}–{p.guest_max ?? '∞'} guests · {(p.menu_keys ?? []).length} menus · {(p.counter_keys ?? []).length} counters</p>
              {q.length > 0 && p.status !== 'archived' && <p className="text-[11.5px] font-bold text-amber-700">Needs: {q[0]}</p>}</div>
            <button type="button" aria-label="Edit" onClick={() => { setOpen({ ...p }); setTried(false) }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-plum-700"><Pencil size={15} /></button>
            <button type="button" aria-label="Archive" onClick={() => put('packages')(packages.map(x => (x.key === p.key ? { ...x, status: x.status === 'archived' ? 'active' : 'archived' } : x)))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-ink/60">{p.status === 'archived' ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>
          </div>
        </Card>) })}
      <motion.button type="button" whileTap={{ scale: 0.98 }} disabled={!(a.menus ?? []).length} onClick={() => { setOpen(blank()); setTried(false) }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-plum-300 bg-white py-4 text-[14px] font-extrabold text-plum-700 disabled:opacity-40"><Plus size={17} /> Add a catering package</motion.button>
      {!(a.menus ?? []).length && <p className="mt-2 text-center text-[12px] font-bold text-ink/50">Create a menu first — packages are built from menus.</p>}
      <Sheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }} title="Catering package">
        {open && <PackageEditor p={open} set={setOpen} a={a} fee={fee} tried={tried} />}
        <button type="button" onClick={save} className="mt-4 h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">Save package</button>
      </Sheet>
    </>
  )
}

/* ══ Extra services & charges ══════════════════════════════════════════ */
export function ExtrasBuilder({ a, put, fee, tried }) {
  const list = a.extras?.length ? a.extras : ADDON_TEMPLATES.map(([id, label, unit]) => ({ id, label, unit, on: false }))
  const set = next => put('extras')(next)
  const upd = (id, patch) => set(list.map(x => (x.id === id ? { ...x, ...patch } : x)))
  const [custom, setCustom] = useState('')
  return (
    <>
      <SectionTitle title="Extra services & charges" sub="Switch on what you offer. Each has its own unit; anything a package includes is never charged again." />
      {list.map(x => {
        const bad = tried && x.on && !(Number(x.take_home_paise) > 0)
        return (
          <Card key={x.id} className={`mt-3 ${bad ? 'ring-2 ring-rose-300' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[14px] font-extrabold">{x.label}</p><p className="text-[11.5px] font-bold text-ink/45">{ADDON_UNIT_LABEL[x.unit] ?? x.unit}</p></div>
              <Toggle on={!!x.on} label={x.label} onChange={on => upd(x.id, { on })} />
            </div>
            {x.on && <div className="mt-2">
              <div className="flex gap-2">
                <div className="flex-[2]"><Field label="You earn" required><Money value={x.take_home_paise} onChange={v => upd(x.id, { take_home_paise: v })} /></Field></div>
                <div className="flex-1"><Field label="Minimum"><Int value={x.min_qty} onChange={v => upd(x.id, { min_qty: v })} /></Field></div>
                <div className="flex-1"><Field label="Lead days"><Int value={x.lead_days} onChange={v => upd(x.id, { lead_days: v })} /></Field></div>
              </div>
              {x.take_home_paise > 0 && <p className="mt-1 text-[12px] font-bold text-forest-700">Customer pays {inr(customer(x.take_home_paise, fee))} {ADDON_UNIT_LABEL[x.unit]}</p>}
              <Field label="Description"><TextField value={x.description} onChange={v => upd(x.id, { description: v })} max={120} /></Field>
              <Field label="Staff / equipment it needs"><TextField value={x.requires} onChange={v => upd(x.id, { requires: v })} max={80} /></Field>
            </div>}
          </Card>
        )
      })}
      <Card className="mt-3"><Label>Add your own extra</Label>
        <div className="flex gap-2"><div className="min-w-0 flex-1"><TextField value={custom} onChange={setCustom} max={50} placeholder="e.g. Welcome paan station" /></div>
          <button type="button" disabled={!custom.trim()} onClick={() => { set([...list, { id: slugKey('extra'), label: custom.trim(), unit: 'per_event', on: true }]); setCustom('') }}
            className="h-[50px] rounded-2xl bg-plum-700 px-4 text-[13px] font-extrabold text-white disabled:opacity-40">Add</button></div></Card>
    </>
  )
}
