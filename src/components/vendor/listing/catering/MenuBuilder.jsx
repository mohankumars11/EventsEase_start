/**
 * My Menus — named, priced selections of the partner's own dishes (spec Part 10).
 *
 * A menu holds dish item_keys, never copies of dishes: the same Bisi Bele Bath
 * can sit in three menus, and taking it out of one leaves the others and the
 * catalogue untouched. Courses can be reordered, dishes moved between them,
 * and each line says whether it is included in the menu price or costs extra
 * (an included dish is never charged again). The menu price is always typed
 * and saved by the partner — never summed from dish prices.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Copy, Archive, ArchiveRestore, Eye, ChevronUp, ChevronDown, X, ArrowLeft, Check, Search, Utensils, AlertTriangle } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, Sheet, SectionTitle, OptionCard } from '../../anchor/ui'
import { MENU_DIETS, DIET_LABEL, EVENT_TYPES, INCLUDED_SERVICES, SERVICE_STYLES, useFoodTaxonomy, slugKey, toR, toP, inr, customer } from './options'
import { menuProblems, menusDone } from './rules'
export { menuProblems, menusDone }

const blankMenu = () => ({ menu_key: slugKey('menu'), name: '', description: '', cuisine_ids: [], diet: 'veg', service_style: null, event_types: [],
  min_guests: null, max_guests: null, lead_days: 0, price_model: 'per_person', price_paise: null, child_price_paise: null, extra_guest_paise: null,
  fixed_scope: {}, included_services: [], items: [], status: 'active' })

/* ── Pick dishes from my catalogue ──────────────────────────────────── */
function DishPicker({ open, onClose, dishes, menu, tax, onAdd }) {
  const [q, setQ] = useState(''), [course, setCourse] = useState(null), [diet, setDiet] = useState(null)
  const [picked, setPicked] = useState([])
  const inMenu = new Set((menu.items ?? []).map(i => i.dish_key))
  const courseOf = d => tax.categories.find(c => c.id === d.category_id)?.course ?? 'other'
  const list = dishes.filter(d => d.active !== false && d.menu_eligible !== false && !inMenu.has(d.item_key)
    && (!q || d.name.toLowerCase().includes(q.toLowerCase())) && (!course || courseOf(d) === course) && (!diet || d.diet === diet))
  const close = () => { setPicked([]); onClose() }
  return (
    <Sheet open={open} onOpenChange={o => { if (!o) close() }} title="Add dishes from my catalogue">
      <div className="flex items-center gap-2 rounded-2xl bg-[#f4f2f9] px-3"><Search size={16} className="text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search my dishes" className="h-11 w-full bg-transparent text-[14px] font-semibold outline-none" /></div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {[[null, 'All'], ...tax.courses.map(c => [c.id, c.name])].filter(([id]) => id === null || dishes.some(d => courseOf(d) === id)).map(([id, l]) => (
          <button key={String(id)} type="button" onClick={() => setCourse(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${course === id ? 'bg-plum-700 text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{l}</button>))}
      </div>
      <div className="mt-1 flex gap-1.5">{[[null, 'Any diet'], ['veg', 'Veg'], ['non_veg', 'Non-veg'], ['vegan', 'Vegan'], ['jain', 'Jain']].map(([id, l]) => (
        <button key={String(id)} type="button" onClick={() => setDiet(id)} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${diet === id ? 'bg-ink text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{l}</button>))}</div>
      <div className="mt-3 space-y-1.5">
        {list.map(d => {
          const on = picked.includes(d.item_key)
          return (
            <button key={d.item_key} type="button" onClick={() => setPicked(on ? picked.filter(x => x !== d.item_key) : [...picked, d.item_key])}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${on ? 'bg-plum-50 ring-2 ring-plum-500' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-plum-700 text-white' : 'ring-2 ring-ink/15'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{d.name}</span>
                <span className="block truncate text-[11.5px] font-bold text-ink/50">{tax.categories.find(c => c.id === d.category_id)?.name} · {DIET_LABEL[d.diet] ?? ''}
                  {d.serving?.qty ? ` · ${d.serving.qty} ${d.serving.unit}` : ''}{d.standalone?.on ? ` · ${inr(d.standalone.price_paise)} alone` : ''}</span></span>
            </button>
          )
        })}
        {!list.length && <p className="rounded-2xl bg-[#faf9fd] p-4 text-[12.5px] font-bold text-ink/55">No more dishes match. Add dishes in My Food Catalogue first.</p>}
      </div>
      <button type="button" disabled={!picked.length} onClick={() => { onAdd(picked.map(k => ({ key: k, course: courseOf(dishes.find(d => d.item_key === k)) }))); close() }}
        className="sticky bottom-0 mt-4 h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:from-ink/20 disabled:to-ink/20">
        Add {picked.length || ''} dish{picked.length === 1 ? '' : 'es'} to menu</button>
    </Sheet>
  )
}

/* ── One menu line's settings ───────────────────────────────────────── */
function ItemSheet({ item, dish, tax, onChange, onClose, onRemove }) {
  if (!item) return null
  const put = patch => onChange({ ...item, ...patch })
  return (
    <Sheet open onOpenChange={o => { if (!o) onClose() }} title={dish?.name ?? 'Dish'}>
      <Card className="bg-[#faf9fd]">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[13.5px] font-extrabold">Included in the menu price</p>
          <p className="text-[11.5px] text-ink/55">Switch off to charge it as an extra.</p></div>
          <Toggle on={item.included !== false} label="Included" onChange={x => put({ included: x })} /></div>
        {item.included === false && <div className="mt-3"><Label required>Extra, you earn per guest</Label>
          <TextField prefix="₹" inputMode="numeric" value={toR(item.extra_paise)} onChange={x => put({ extra_paise: toP(x) })} /></div>}
        <div className="mt-4 flex items-center justify-between gap-4"><p className="text-[13.5px] font-extrabold">Required in this menu</p>
          <Toggle on={item.required !== false} label="Required" onChange={x => put({ required: x })} /></div>
      </Card>
      <div className="mt-3"><Label>Course</Label>
        <ChipRow size="sm" options={tax.courses.map(c => c.id)} value={item.course_group} onChange={x => put({ course_group: x })} format={id => tax.courses.find(c => c.id === id).name} /></div>
      <div className="mt-3"><Label hint="e.g. 150 g per guest, 2 pieces">Portion in this menu</Label>
        <TextField value={item.portion} onChange={x => put({ portion: x })} max={60} /></div>
      <div className="mt-3"><Label hint="Dishes sharing a group are alternatives, e.g. “Choose one rice”.">Choice group</Label>
        <div className="flex gap-2"><div className="min-w-0 flex-[2]"><TextField value={item.choice_group} onChange={x => put({ choice_group: x || null })} max={40} placeholder="Choose one rice" /></div>
          <div className="min-w-0 flex-1"><TextField inputMode="numeric" value={item.choice_pick ?? ''} onChange={x => put({ choice_pick: Number(x.replace(/\D/g, '')) || null })} placeholder="Pick 1" /></div></div></div>
      <div className="mt-3"><Label>Preparation notes</Label><TextField value={item.notes} onChange={x => put({ notes: x })} max={120} /></div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onRemove} className="h-[50px] flex-1 rounded-full bg-rose-50 text-[13.5px] font-extrabold text-rose-700">Remove from this menu</button>
        <button type="button" onClick={onClose} className="h-[50px] flex-1 rounded-full bg-plum-700 text-[13.5px] font-extrabold text-white">Done</button>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-ink/45">Removing only takes it out of this menu — it stays in your catalogue.</p>
    </Sheet>
  )
}

/* ── Customer preview ───────────────────────────────────────────────── */
export function MenuPreview({ menu, dishes, tax, fee }) {
  const byKey = Object.fromEntries(dishes.map(d => [d.item_key, d]))
  const courses = tax.courses.map(c => ({ ...c, items: (menu.items ?? []).filter(i => i.course_group === c.id).sort((x, y) => x.sort - y.sort) })).filter(c => c.items.length)
  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.08]">
      <div className="bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">{MENU_DIETS.find(d => d[0] === menu.diet)?.[1]}</p>
        <p className="mt-1 text-[19px] font-extrabold">{menu.name || 'Untitled menu'}</p>
        {menu.description && <p className="mt-0.5 text-[12.5px] text-plum-100">{menu.description}</p>}
        <p className="mt-2 text-[15px] font-extrabold">
          {menu.price_model === 'per_person' && menu.price_paise ? `${inr(customer(menu.price_paise, fee))} per guest`
            : menu.price_model === 'fixed' && menu.price_paise ? `${inr(customer(menu.price_paise, fee))} for up to ${menu.fixed_scope?.guests} guests` : 'Price on request'}
        </p>
        <p className="text-[11.5px] text-plum-200">Minimum {menu.min_guests ?? '—'} guests{menu.lead_days ? ` · book ${menu.lead_days} days ahead` : ''}</p>
      </div>
      <div className="p-4">
        {courses.map(c => (
          <div key={c.id} className="mb-3">
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{c.name}</p>
            {c.items.map(i => { const d = byKey[i.dish_key]; return d && (
              <div key={i.dish_key} className="flex items-start justify-between gap-2 py-1">
                <div><p className="text-[13.5px] font-bold text-ink"><span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm border-2 ${d.diet === 'non_veg' || d.diet === 'egg' ? 'border-rose-600' : 'border-forest-600'}`} />{d.name}{i.choice_group ? <span className="ml-1 text-[11px] font-bold text-ink/45">({i.choice_group})</span> : null}</p>
                  {d.allergens?.length > 0 && <p className="text-[11px] text-ink/45">Contains: {d.allergens.join(', ')}</p>}</div>
                {i.included === false && <span className="shrink-0 text-[12px] font-bold text-ink/60">+{inr(customer(i.extra_paise, fee))}/guest</span>}
              </div>) })}
          </div>
        ))}
        {menu.included_services?.length > 0 && <p className="mt-1 text-[12px] font-bold text-forest-700">Includes: {menu.included_services.map(s => INCLUDED_SERVICES.find(x => x[0] === s)?.[1]).join(', ')}</p>}
      </div>
    </div>
  )
}

/* ── Menu editor (full page inside the stage) ───────────────────────── */
function MenuEditor({ menu: initial, dishes, tax, cuisines, fee, onSave, onCancel }) {
  const [m, setM] = useState(initial)
  const [pick, setPick] = useState(false)
  const [itemKey, setItemKey] = useState(null)
  const [tried, setTried] = useState(false)
  const [preview, setPreview] = useState(false)
  const put = patch => setM(x => ({ ...x, ...patch }))
  const byKey = Object.fromEntries(dishes.map(d => [d.item_key, d]))
  const items = m.items ?? []
  const courses = tax.courses.map(c => ({ ...c, items: items.filter(i => i.course_group === c.id).sort((a, b) => a.sort - b.sort) })).filter(c => c.items.length)
  const setItems = next => put({ items: next.map((i, n) => ({ ...i })) })
  const move = (i, dir) => {
    const same = items.filter(x => x.course_group === i.course_group).sort((a, b) => a.sort - b.sort)
    const k = same.findIndex(x => x.dish_key === i.dish_key), j = k + dir
    if (j < 0 || j >= same.length) return
    const a = same[k], b = same[j]
    setItems(items.map(x => x.dish_key === a.dish_key ? { ...x, sort: b.sort } : x.dish_key === b.dish_key ? { ...x, sort: a.sort } : x))
  }
  const problems = menuProblems(m, dishes)
  const cname = id => tax.groups.flatMap(g => g.styles).find(s => s.id === id)?.name ?? id
  return (
    <>
      <button type="button" onClick={onCancel} className="mb-3 flex items-center gap-1 text-[13px] font-extrabold text-plum-700"><ArrowLeft size={15} /> My Menus</button>
      <SectionTitle title={initial.name ? 'Edit menu' : 'Create a menu'} sub="Pick dishes you already have, arrange them by course, then set the menu's own price." />
      {m.needs_review && <div className="mb-3 flex gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-[12.5px] font-semibold text-amber-900">This menu came from your earlier form{m.suggested_price_paise ? ` with ${inr(m.suggested_price_paise)} per person` : ''}. Add its dishes and confirm the price — nothing is published until you do.</p></div>}
      <Card>
        <Label required>What would you like to call this menu?</Label>
        <TextField value={m.name} onChange={x => put({ name: x })} max={80} placeholder="e.g. Karnataka Traditional Wedding Lunch" />
        <div className="mt-3" /><Label>Description</Label>
        <TextField multiline rows={2} value={m.description} onChange={x => put({ description: x })} max={240} />
        <div className="mt-3" /><Label required>Menu type</Label>
        <ChipRow size="sm" options={MENU_DIETS.map(x => x[0])} value={m.diet} onChange={x => put({ diet: x })} format={id => MENU_DIETS.find(x => x[0] === id)[1]} />
        {cuisines.length > 0 && <><div className="mt-3" /><Label>Cuisine / regional style</Label>
          <ChipRow multi size="sm" options={cuisines.filter(c => !c.startsWith('custom:'))} value={m.cuisine_ids} onChange={x => put({ cuisine_ids: x })} format={cname} /></>}
        <div className="mt-3" /><Label>Service style</Label>
        <ChipRow size="sm" options={SERVICE_STYLES} value={m.service_style} onChange={x => put({ service_style: x })} />
        <div className="mt-3" /><Label>Events this menu suits</Label>
        <ChipRow multi size="sm" options={EVENT_TYPES} value={m.event_types} onChange={x => put({ event_types: x })} />
        <div className="mt-3 flex gap-2">
          <div className="flex-1"><Label required>Minimum guests</Label><TextField inputMode="numeric" value={m.min_guests ?? ''} onChange={x => put({ min_guests: Number(x.replace(/\D/g, '')) || null })} /></div>
          <div className="flex-1"><Label>Maximum guests</Label><TextField inputMode="numeric" value={m.max_guests ?? ''} onChange={x => put({ max_guests: Number(x.replace(/\D/g, '')) || null })} /></div>
          <div className="flex-1"><Label>Lead time</Label><TextField inputMode="numeric" value={m.lead_days ?? ''} onChange={x => put({ lead_days: Number(x.replace(/\D/g, '')) || 0 })} /></div>
        </div>
      </Card>

      <div className="mt-4 flex items-baseline justify-between px-1">
        <p className="text-[15px] font-extrabold text-ink">Dishes in this menu</p><p className="text-[12px] font-bold text-ink/50">{items.length}</p>
      </div>
      {courses.map(c => (
        <Card key={c.id} className="mt-2">
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-600">{c.name}</p>
          {c.items.map((i, n) => { const d = byKey[i.dish_key]; return (
            <div key={i.dish_key} className="flex items-center gap-2 border-t border-ink/[0.05] py-2 first:border-0">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm border-2 ${d?.diet === 'non_veg' || d?.diet === 'egg' ? 'border-rose-600' : 'border-forest-600'}`} />
              <button type="button" onClick={() => setItemKey(i.dish_key)} className="min-w-0 flex-1 text-left">
                <p className={`truncate text-[13.5px] font-bold ${d ? 'text-ink' : 'text-rose-600'}`}>{d?.name ?? 'Missing dish'}{d?.active === false ? ' (archived)' : ''}</p>
                <p className="truncate text-[11.5px] font-bold text-ink/45">{i.included === false ? `Extra ${inr(i.extra_paise)}` : 'Included'}{i.required === false ? ' · optional' : ''}{i.choice_group ? ` · ${i.choice_group}` : ''}</p>
              </button>
              <button type="button" aria-label="Up" disabled={n === 0} onClick={() => move(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2f9] disabled:opacity-30"><ChevronUp size={15} /></button>
              <button type="button" aria-label="Down" disabled={n === c.items.length - 1} onClick={() => move(i, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2f9] disabled:opacity-30"><ChevronDown size={15} /></button>
              <button type="button" aria-label="Remove" onClick={() => setItems(items.filter(x => x.dish_key !== i.dish_key))} className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600"><X size={14} /></button>
            </div>) })}
        </Card>
      ))}
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setPick(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-plum-300 bg-white py-3.5 text-[14px] font-extrabold text-plum-700"><Plus size={17} /> Add dishes from my catalogue</motion.button>

      <Card className="mt-4">
        <Label required>How is this menu priced?</Label>
        <Segmented id="menu-price" value={m.price_model} onChange={x => put({ price_model: x })}
          options={[{ value: 'per_person', label: 'Per guest' }, { value: 'fixed', label: 'Fixed price' }, { value: 'quote', label: 'Custom quote' }]} />
        {m.price_model !== 'quote' && <>
          <div className="mt-3" /><Label required>{m.price_model === 'fixed' ? 'Fixed price, you earn' : 'Price per guest, you earn'}</Label>
          <TextField prefix="₹" inputMode="numeric" value={toR(m.price_paise)} onChange={x => put({ price_paise: toP(x), status: m.status === 'draft' ? 'active' : m.status, needs_review: false })} />
          {m.price_paise > 0 && <p className="mt-1.5 text-[12px] font-bold text-forest-700">Customer pays {inr(customer(m.price_paise, fee))}{m.price_model === 'per_person' ? ' per guest' : ''}</p>}
        </>}
        {m.price_model === 'fixed' && <div className="mt-3 flex gap-2">
          <div className="flex-1"><Label required>Covers guests</Label><TextField inputMode="numeric" value={m.fixed_scope?.guests ?? ''} onChange={x => put({ fixed_scope: { ...m.fixed_scope, guests: Number(x.replace(/\D/g, '')) || null } })} /></div>
          <div className="flex-1"><Label required>Covers hours</Label><TextField inputMode="numeric" value={m.fixed_scope?.hours ?? ''} onChange={x => put({ fixed_scope: { ...m.fixed_scope, hours: Number(x.replace(/\D/g, '')) || null } })} /></div>
        </div>}
        {m.price_model !== 'quote' && <div className="mt-3 flex gap-2">
          <div className="flex-1"><Label hint="Leave empty to refer bigger parties to a quote.">Each extra guest</Label><TextField prefix="₹" inputMode="numeric" value={toR(m.extra_guest_paise)} onChange={x => put({ extra_guest_paise: toP(x) })} /></div>
          <div className="flex-1"><Label hint="Only if you charge children less.">Child price</Label><TextField prefix="₹" inputMode="numeric" value={toR(m.child_price_paise)} onChange={x => put({ child_price_paise: toP(x) })} /></div>
        </div>}
        <div className="mt-3" /><Label>Included with this menu</Label>
        <ChipRow multi size="sm" options={INCLUDED_SERVICES.map(x => x[0])} value={m.included_services} onChange={x => put({ included_services: x })} format={id => INCLUDED_SERVICES.find(x => x[0] === id)[1]} />
      </Card>

      {tried && problems.length > 0 && <p className="mt-3 text-center text-[12.5px] font-bold text-rose-600">Still needed: {problems.join(', ')}.</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setPreview(true)} className="flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f4f2f9] text-[14px] font-extrabold text-plum-700"><Eye size={16} /> Preview</button>
        <button type="button" onClick={() => { if (problems.length) { setTried(true); return } onSave(m) }}
          className="h-[52px] flex-[2] rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">Save menu</button>
      </div>

      <DishPicker open={pick} onClose={() => setPick(false)} dishes={dishes} menu={m} tax={tax}
        onAdd={adds => { const base = items.length; put({ items: [...items, ...adds.map((x, n) => ({ dish_key: x.key, course_group: x.course, sort: base + n, included: true, required: true }))] }) }} />
      <ItemSheet item={items.find(i => i.dish_key === itemKey)} dish={byKey[itemKey]} tax={tax} onClose={() => setItemKey(null)}
        onChange={next => setItems(items.map(i => (i.dish_key === next.dish_key ? next : i)))}
        onRemove={() => { setItems(items.filter(i => i.dish_key !== itemKey)); setItemKey(null) }} />
      <Sheet open={preview} onOpenChange={o => !o && setPreview(false)} title="What customers see"><MenuPreview menu={m} dishes={dishes} tax={tax} fee={fee} /></Sheet>
    </>
  )
}

/* ── My Menus dashboard ─────────────────────────────────────────────── */
export default function MenuBuilder({ a, put, fee, tried }) {
  const tax = useFoodTaxonomy()
  const menus = a.menus ?? [], dishes = a.dishes ?? []
  const setMenus = put('menus')
  const [editing, setEditing] = useState(null)
  const [preview, setPreview] = useState(null)
  const cname = id => tax.groups.flatMap(g => g.styles).find(s => s.id === id)?.name ?? id
  if (editing) return (
    <MenuEditor menu={editing} dishes={dishes} tax={tax} cuisines={a.cuisines ?? []} fee={fee} onCancel={() => setEditing(null)}
      onSave={m => { setMenus(menus.some(x => x.menu_key === m.menu_key) ? menus.map(x => (x.menu_key === m.menu_key ? m : x)) : [...menus, m]); setEditing(null) }} />
  )
  return (
    <>
      <SectionTitle title="My Menus" sub="Build menus from the dishes you already have. You can create different menus for different events, cuisines and budgets." />
      {menus.map(m => {
        const probs = menuProblems(m, dishes)
        return (
          <Card key={m.menu_key} className={`mt-3 ${m.status === 'archived' ? 'opacity-60' : ''} ${tried && m.status !== 'archived' && probs.length ? 'ring-2 ring-rose-300' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-ink">{m.name || 'Untitled menu'}</p>
                <p className="text-[12px] font-bold text-ink/55">{MENU_DIETS.find(d => d[0] === m.diet)?.[1]}{m.cuisine_ids?.length ? ` · ${m.cuisine_ids.map(cname).slice(0, 2).join(', ')}` : ''} · {(m.items ?? []).length} dishes</p>
                <p className="mt-1 text-[13px] font-extrabold text-ink">{m.price_model === 'quote' ? 'Custom quote' : m.price_paise ? `${inr(customer(m.price_paise, fee))} ${m.price_model === 'per_person' ? 'per guest' : 'fixed'}` : 'No price yet'}
                  <span className="font-bold text-ink/50"> · min {m.min_guests ?? '—'} guests</span></p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${m.status === 'archived' ? 'bg-ink/10 text-ink/60' : probs.length ? 'bg-amber-100 text-amber-800' : 'bg-forest-50 text-forest-700'}`}>
                {m.status === 'archived' ? 'Archived' : probs.length ? 'Incomplete' : 'Ready'}</span>
            </div>
            {m.status !== 'archived' && probs.length > 0 && <p className="mt-1.5 text-[11.5px] font-bold text-amber-700">Needs: {probs.slice(0, 2).join(', ')}</p>}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[[Pencil, 'Edit', () => setEditing({ ...m })], [Eye, 'Preview', () => setPreview(m)],
                [Copy, 'Duplicate', () => setMenus([...menus, { ...structuredClone(m), menu_key: slugKey('menu'), name: `${m.name} (copy)` }])],
                [m.status === 'archived' ? ArchiveRestore : Archive, m.status === 'archived' ? 'Restore' : 'Archive',
                  () => setMenus(menus.map(x => (x.menu_key === m.menu_key ? { ...x, status: x.status === 'archived' ? 'active' : 'archived' } : x)))],
              ].map(([I, l, f]) => <button key={l} type="button" onClick={f} className="flex flex-col items-center gap-0.5 rounded-xl bg-[#f4f2f9] py-2 text-[11px] font-extrabold text-plum-700"><I size={15} />{l}</button>)}
            </div>
          </Card>
        )
      })}
      {!dishes.length && <Card className="mt-3"><p className="flex items-center gap-2 text-[13px] font-bold text-ink/60"><Utensils size={16} /> Add dishes to My Food Catalogue first — menus are built from them.</p></Card>}
      <motion.button type="button" whileTap={{ scale: 0.98 }} disabled={!dishes.length} onClick={() => setEditing(blankMenu())}
        className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white disabled:from-ink/20 disabled:to-ink/20"><Plus size={18} /> Create New Menu</motion.button>
      <Sheet open={!!preview} onOpenChange={o => !o && setPreview(null)} title="What customers see">{preview && <MenuPreview menu={preview} dishes={dishes} tax={tax} fee={fee} />}</Sheet>
    </>
  )
}
