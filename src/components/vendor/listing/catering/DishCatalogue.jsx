/**
 * My Food Catalogue — the partner's own dishes (spec Parts 7–8).
 *
 * A dish is a reusable food item. Menus point at it by item_key; removing it
 * from a menu never deletes it, and archiving it keeps every menu that used
 * it readable. Two ways in: pick a template from the shared master catalogue
 * (search_master_dishes, 2,000+ dishes, aliases and transliterations), or
 * create your own. Partner prices, serving sizes and recipes stay here —
 * the master row is never touched.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Archive, ArchiveRestore, Search, BookOpen, PenLine, AlertTriangle, Loader2, Utensils, Check } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Segmented, Toggle, Sheet, SectionTitle } from '../../anchor/ui'
import { supabase } from '../../../../lib/supabase'
import WorkUpload from '../../WorkUpload'
import { DIETS, DIET_LABEL, SERVING_UNITS, STANDALONE_UNITS, ALLERGENS, useFoodTaxonomy, slugKey, toR, toP, inr, customer } from './options'
import { dishProblems, dishesDone } from './rules'
export { dishProblems, dishesDone }

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const blankDish = () => ({ item_key: slugKey('dish'), name: '', master_dish_id: null, category_id: null, cuisine_ids: [], description: '',
  diet: null, diet_note: '', serving: { qty: null, unit: null }, ingredients: [], allergens: [], allergen_note: '', cross_contact: '',
  photos: [], menu_eligible: true, standalone: { on: false }, active: true, pricing_status: 'ok', legacy: null })

/* ── Pick from the shared catalogue ─────────────────────────────────── */
function MasterSearch({ open, onClose, onPick, cuisines, have, tax }) {
  const [q, setQ] = useState('')
  const [cuisine, setCuisine] = useState(null)
  const [course, setCourse] = useState(null)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { setPage(0) }, [q, cuisine, course])
  useEffect(() => {
    if (!open) return
    let live = true
    setBusy(true)
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('search_master_dishes', { p_q: q || null, p_cuisine: cuisine, p_course: course, p_limit: 30, p_offset: page * 30 })
      if (!live) return
      setBusy(false)
      if (error) { setErr('The food catalogue is not available right now — create your own dish instead.'); setRows([]); return }
      setErr(''); setTotal(data?.[0]?.total ?? 0)
      setRows(r => (page === 0 ? data : [...r, ...data]))
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [open, q, cuisine, course, page])
  const myCuisines = cuisines.filter(c => !c.startsWith('custom:'))
  const cname = id => tax.groups.flatMap(g => g.styles).find(s => s.id === id)?.name ?? id
  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }} title="Choose from Food Catalogue">
      <div className="flex items-center gap-2 rounded-2xl bg-[#f4f2f9] px-3">
        <Search size={16} className="text-ink/40" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search — e.g. bisi bele, halwa, kosambari" className="h-11 w-full bg-transparent text-[14px] font-semibold outline-none" />
      </div>
      {myCuisines.length > 0 && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCuisine(null)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${!cuisine ? 'bg-plum-700 text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>All cuisines</button>
        {myCuisines.map(c => <button key={c} type="button" onClick={() => setCuisine(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${cuisine === c ? 'bg-plum-700 text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{cname(c)}</button>)}
      </div>}
      <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCourse(null)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${!course ? 'bg-ink text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>All courses</button>
        {tax.courses.map(c => <button key={c.id} type="button" onClick={() => setCourse(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${course === c.id ? 'bg-ink text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{c.name}</button>)}
      </div>
      {err && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[12.5px] font-bold text-amber-900">{err}</p>}
      {!err && <p className="mt-2 text-[12px] font-bold text-ink/45">{busy && !rows.length ? 'Searching…' : `${total} dishes`}</p>}
      <div className="mt-2 space-y-1.5">
        {rows.map(r => {
          const already = have.has(r.id) || have.has(norm(r.name))
          return (
            <button key={r.id} type="button" disabled={already} onClick={() => onPick(r)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#faf9fd] p-3 text-left ring-1 ring-ink/[0.06] disabled:opacity-50">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold text-ink">{r.name}</span>
                <span className="block truncate text-[11.5px] font-bold text-ink/50">
                  {tax.categories.find(c => c.id === r.category_id)?.name ?? ''}{r.cuisine_ids?.length ? ` · ${r.cuisine_ids.slice(0, 2).map(cname).join(', ')}` : ''}
                  {r.aliases?.length ? ` · also “${r.aliases[0]}”` : ''}
                </span>
              </span>
              {already ? <span className="flex items-center gap-1 text-[11.5px] font-extrabold text-forest-700"><Check size={13} /> Added</span>
                : <Plus size={17} className="text-plum-700" />}
            </button>
          )
        })}
      </div>
      {rows.length < total && <button type="button" onClick={() => setPage(p => p + 1)} className="mt-3 w-full rounded-full bg-[#f4f2f9] py-2.5 text-[13px] font-extrabold text-plum-700">{busy ? <Loader2 size={14} className="mx-auto animate-spin" /> : 'Show more'}</button>}
      <p className="mt-3 text-[11.5px] text-ink/45">Can't find it? Close this and choose "Create my own dish" — it can be added to the shared catalogue after review.</p>
    </Sheet>
  )
}

/* ── The dish form ──────────────────────────────────────────────────── */
function DishEditor({ dish, set, tax, cuisines, fee, tried }) {
  const d = dish
  const put = patch => set({ ...d, ...patch })
  const sa = d.standalone ?? { on: false }
  const putSa = patch => put({ standalone: { ...sa, ...patch } })
  const problems = tried ? dishProblems(d) : []
  const myCuisines = [...new Set([...cuisines.filter(c => !c.startsWith('custom:')), ...(d.cuisine_ids ?? [])])]
  const cname = id => tax.groups.flatMap(g => g.styles).find(s => s.id === id)?.name ?? id
  const courseName = id => tax.courses.find(c => c.id === id)?.name ?? id
  const catsByCourse = useMemo(() => tax.courses.map(c => ({ ...c, cats: tax.categories.filter(x => x.course === c.id) })).filter(c => c.cats.length), [tax])
  const [courseOpen, setCourseOpen] = useState(() => tax.categories.find(c => c.id === d.category_id)?.course ?? null)
  return (
    <div>
      {d.legacy?.needs_review && (
        <div className="mb-3 flex gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-[12.5px] font-semibold text-amber-900">
            {d.legacy.counter_price_paise ? <>Your old form had this as <b>{inr(d.legacy.counter_price_paise)} per counter</b>. A counter is now a service of its own — create it under Live Counters; this dish's price was not changed.</>
              : <>Your old serving size "<b>{d.serving?.legacy_text}</b>" could not be read as a quantity. Please confirm it below.</>}
          </p>
        </div>
      )}
      {d.master_dish_id && <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-plum-700"><BookOpen size={13} /> From the Sambramo food catalogue — adjust anything for your kitchen.</p>}
      <Label required>What is the name of this dish?</Label>
      <TextField value={d.name} onChange={x => put({ name: x })} max={80} placeholder="e.g. Bisi Bele Bath" />
      <div className="mt-4" />
      <Label required>Which part of the meal does this dish belong to?</Label>
      <div className="flex flex-wrap gap-1.5">
        {catsByCourse.map(c => (
          <button key={c.id} type="button" onClick={() => setCourseOpen(courseOpen === c.id ? null : c.id)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${courseOpen === c.id || tax.categories.find(x => x.id === d.category_id)?.course === c.id ? 'bg-plum-700 text-white' : 'bg-[#f4f2f9] text-ink/70'}`}>{c.name}</button>
        ))}
      </div>
      {courseOpen && <div className="mt-2 rounded-2xl bg-[#faf9fd] p-2.5 ring-1 ring-ink/[0.05]">
        <ChipRow size="sm" options={catsByCourse.find(c => c.id === courseOpen).cats.map(c => c.id)} value={d.category_id}
          onChange={x => put({ category_id: x })} format={id => tax.categories.find(c => c.id === id).name} />
      </div>}
      {d.category_id && <p className="mt-1.5 text-[12px] font-bold text-forest-700">✓ {tax.categories.find(c => c.id === d.category_id)?.name} · {courseName(tax.categories.find(c => c.id === d.category_id)?.course)}</p>}
      {myCuisines.length > 0 && <><div className="mt-4" /><Label>Which cuisine does this dish belong to?</Label>
        <ChipRow multi size="sm" options={myCuisines} value={d.cuisine_ids ?? []} onChange={x => put({ cuisine_ids: x })} format={cname} /></>}
      <div className="mt-4" />
      <Label>Describe this dish for customers</Label>
      <TextField multiline rows={2} value={d.description} onChange={x => put({ description: x })} max={200} />
      <div className="mt-4" />
      <Label required hint={d.suggested_diet && !d.diet_confirmed ? `Suggested: ${DIET_LABEL[d.suggested_diet]} — please confirm.` : undefined}>Dietary class</Label>
      <ChipRow size="sm" options={DIETS.map(x => x[0])} value={d.diet} onChange={x => put({ diet: x, diet_confirmed: true })} format={id => DIET_LABEL[id]} />
      {d.diet === 'other' && <div className="mt-2"><TextField value={d.diet_note} onChange={x => put({ diet_note: x })} max={80} placeholder="Explain, e.g. contains gelatin" /></div>}
      <div className="mt-4" />
      <Label hint="Required when you sell this dish on its own.">What is one serving?</Label>
      <div className="flex gap-2">
        <div className="w-24"><TextField inputMode="decimal" value={d.serving?.qty ?? ''} onChange={x => put({ serving: { ...d.serving, qty: Number(x.replace(/[^\d.]/g, '')) || null } })} /></div>
        <div className="min-w-0 flex-1"><ChipRow size="sm" options={SERVING_UNITS.map(x => x[0])} value={d.serving?.unit} onChange={x => put({ serving: { ...d.serving, unit: x } })} format={id => SERVING_UNITS.find(x => x[0] === id)[1]} /></div>
      </div>
      <div className="mt-4" />
      <Label>Allergens customers should know about</Label>
      <ChipRow multi size="sm" options={ALLERGENS} value={d.allergens ?? []} onChange={x => put({ allergens: x })} />
      <div className="mt-2"><TextField value={d.allergen_note} onChange={x => put({ allergen_note: x })} max={160} placeholder="Ingredients or other allergens (optional)" /></div>
      <div className="mt-2"><TextField value={d.cross_contact} onChange={x => put({ cross_contact: x })} max={120} placeholder="Possible cross-contact, e.g. made in a kitchen that handles nuts" /></div>

      <div className="mt-4">
        <WorkUpload value={d.photos ?? []} onChange={x => put({ photos: x })} trade="Catering & Food"
          copy={{ photoTitle: 'Dish photo (recommended)', photoHint: 'A real photo of your own preparation. Optional.' }} />
      </div>

      <Card className="mt-4 bg-[#faf9fd]">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[13.5px] font-extrabold">Can you include this dish in one or more menus?</p>
            <p className="text-[11.5px] text-ink/55">Menus carry their own price — including a dish does not charge it again.</p></div>
          <Toggle on={d.menu_eligible !== false} label="Menu eligible" onChange={x => put({ menu_eligible: x })} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div><p className="text-[13.5px] font-extrabold">Can customers order this dish separately?</p></div>
          <Toggle on={!!sa.on} label="Sold separately" onChange={x => putSa({ on: x })} />
        </div>
        {sa.on && <div className="mt-3">
          <Label required>How do you charge for this dish?</Label>
          <ChipRow size="sm" options={STANDALONE_UNITS.map(x => x[0])} value={sa.unit} onChange={x => putSa({ unit: x })} format={id => STANDALONE_UNITS.find(x => x[0] === id)[1]} />
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-[2]"><p className="mb-1 text-[11.5px] font-extrabold text-ink/55">You earn</p>
              <TextField prefix="₹" inputMode="numeric" value={toR(sa.price_paise)} onChange={x => putSa({ price_paise: toP(x) })} /></div>
            <div className="min-w-0 flex-1"><p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Minimum</p>
              <TextField inputMode="numeric" value={sa.min_qty ?? ''} onChange={x => putSa({ min_qty: Number(x.replace(/\D/g, '')) || null })} /></div>
            <div className="min-w-0 flex-1"><p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Step</p>
              <TextField inputMode="numeric" value={sa.increment ?? ''} onChange={x => putSa({ increment: Number(x.replace(/\D/g, '')) || null })} /></div>
          </div>
          {sa.price_paise > 0 && <p className="mt-1.5 text-[12px] font-bold text-forest-700">Customer pays {inr(customer(sa.price_paise, fee))}</p>}
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-1"><p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Lead time (days)</p>
              <TextField inputMode="numeric" value={sa.lead_days ?? ''} onChange={x => putSa({ lead_days: Number(x.replace(/\D/g, '')) || 0 })} /></div>
            <div className="min-w-0 flex-1"><p className="mb-1 text-[11.5px] font-extrabold text-ink/55">Most per day</p>
              <TextField inputMode="numeric" value={sa.max_capacity ?? ''} onChange={x => putSa({ max_capacity: Number(x.replace(/\D/g, '')) || null })} /></div>
          </div>
        </div>}
      </Card>
      {problems.length > 0 && <p className="mt-3 text-[12px] font-bold text-rose-600">Still needed: {problems.join(', ')}.</p>}
    </div>
  )
}

/* ── The catalogue screen ───────────────────────────────────────────── */
export default function DishCatalogue({ a, put, fee, legacyDishes = [] }) {
  const tax = useFoodTaxonomy()
  const dishes = a.dishes ?? []
  const setDishes = put('dishes')
  const [open, setOpen] = useState(null)          // dish being edited
  const [isNew, setIsNew] = useState(false)
  const [tried, setTried] = useState(false)
  const [search, setSearch] = useState(false)
  const [f, setF] = useState({ q: '', cuisine: null, course: null, diet: null, priced: false, inMenu: false, archived: false })
  const inMenus = useMemo(() => new Set((a.menus ?? []).flatMap(m => (m.items ?? []).map(i => i.dish_key))), [a.menus])
  const have = useMemo(() => new Set([...dishes.map(d => d.master_dish_id).filter(Boolean), ...dishes.map(d => norm(d.name))]), [dishes])
  const courseOf = d => tax.categories.find(c => c.id === d.category_id)?.course ?? 'other'

  const shown = dishes.filter(d => (f.archived ? d.active === false : d.active !== false)
    && (!f.q || norm(d.name).includes(norm(f.q))) && (!f.cuisine || (d.cuisine_ids ?? []).includes(f.cuisine))
    && (!f.course || courseOf(d) === f.course) && (!f.diet || d.diet === f.diet)
    && (!f.priced || d.standalone?.on) && (!f.inMenu || inMenus.has(d.item_key)))
  const grouped = tax.courses.map(c => ({ ...c, items: shown.filter(d => courseOf(d) === c.id) })).filter(c => c.items.length)

  const startNew = (seed = {}) => { setOpen({ ...blankDish(), ...seed }); setIsNew(true); setTried(false) }
  const save = () => {
    if (dishProblems(open).length) { setTried(true); return }
    const clean = { ...open, pricing_status: open.standalone?.on && !(open.standalone.price_paise > 0) ? 'needs_price' : (open.legacy?.counter_price_paise ? 'needs_review' : 'ok') }
    setDishes(isNew ? [...dishes, clean] : dishes.map(x => (x.item_key === clean.item_key ? clean : x)))
    setOpen(null)
  }
  const archive = (d, on) => setDishes(dishes.map(x => (x.item_key === d.item_key ? { ...x, active: on } : x)))
  const importLegacy = () => setDishes([...dishes, ...legacyDishes.filter(n => !have.has(norm(n))).map(n => ({ ...blankDish(), name: n }))])

  const chip = (on, onClick, label) => <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? 'bg-plum-700 text-white' : 'bg-white text-ink/70 ring-1 ring-ink/[0.08]'}`}>{label}</button>
  return (
    <>
      <SectionTitle title="My Food Catalogue" sub="Every dish you cook, once. Menus and counters pick from here — a dish can be in many menus." />
      <div className="grid grid-cols-2 gap-2">
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setSearch(true)}
          className="flex flex-col items-start gap-1 rounded-[20px] bg-gradient-to-br from-plum-700 to-plum-900 p-3.5 text-left text-white">
          <BookOpen size={18} /><span className="text-[13.5px] font-extrabold">Choose from Food Catalogue</span><span className="text-[11px] text-plum-100">2,000+ dishes</span>
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => startNew()}
          className="flex flex-col items-start gap-1 rounded-[20px] bg-white p-3.5 text-left ring-1 ring-plum-200">
          <PenLine size={18} className="text-plum-700" /><span className="text-[13.5px] font-extrabold text-ink">Create my own dish</span><span className="text-[11px] text-ink/50">Anything not listed</span>
        </motion.button>
      </div>
      {legacyDishes.length > 0 && legacyDishes.some(n => !have.has(norm(n))) && (
        <button type="button" onClick={importLegacy} className="mt-2 w-full rounded-2xl bg-amber-50 p-3 text-left text-[12.5px] font-bold text-amber-900 ring-1 ring-amber-200">
          Import {legacyDishes.filter(n => !have.has(norm(n))).length} dishes from your earlier catering listing →
        </button>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-ink/[0.08]">
        <Search size={16} className="text-ink/40" />
        <input value={f.q} onChange={e => setF({ ...f, q: e.target.value })} placeholder="Search your dishes" className="h-11 w-full bg-transparent text-[14px] font-semibold outline-none" />
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {chip(!f.diet, () => setF({ ...f, diet: null }), 'All diets')}
        {DIETS.slice(0, 4).map(([id, l]) => chip(f.diet === id, () => setF({ ...f, diet: f.diet === id ? null : id }), l))}
        {chip(f.priced, () => setF({ ...f, priced: !f.priced }), 'Sold separately')}
        {chip(f.inMenu, () => setF({ ...f, inMenu: !f.inMenu }), 'In a menu')}
        {chip(f.archived, () => setF({ ...f, archived: !f.archived }), 'Archived')}
      </div>
      {(a.cuisines ?? []).filter(c => !c.startsWith('custom:')).length > 0 && <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
        {chip(!f.cuisine, () => setF({ ...f, cuisine: null }), 'All cuisines')}
        {(a.cuisines ?? []).filter(c => !c.startsWith('custom:')).map(c => chip(f.cuisine === c, () => setF({ ...f, cuisine: f.cuisine === c ? null : c }), tax.groups.flatMap(g => g.styles).find(s => s.id === c)?.name ?? c))}
      </div>}
      <p className="mt-2 px-1 text-[12.5px] font-extrabold text-ink/60">{shown.length} dish{shown.length === 1 ? '' : 'es'}</p>

      {grouped.map(g => (
        <div key={g.id} className="mt-3">
          <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">{g.name}</p>
          {g.items.map(d => {
            const probs = dishProblems(d)
            const status = d.legacy?.needs_review ? ['Review needed', 'text-amber-700']
              : probs.length ? [`Needs: ${probs[0].toLowerCase()}`, 'text-rose-600']
              : d.standalone?.on ? [`${inr(customer(d.standalone.price_paise, fee))} ${STANDALONE_UNITS.find(u => u[0] === d.standalone.unit)?.[1].toLowerCase()}`, 'text-ink/60']
              : ['In menus only', 'text-ink/50']
            return (
              <Card key={d.item_key} className="mb-2">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${d.diet === 'non_veg' ? 'bg-rose-50 text-rose-600' : 'bg-forest-50 text-forest-700'}`}><Utensils size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-ink">{d.name || 'Unnamed dish'}</p>
                    <p className={`truncate text-[12px] font-bold ${status[1]}`}>{tax.categories.find(c => c.id === d.category_id)?.name ?? 'No category'} · {status[0]}{inMenus.has(d.item_key) ? ' · in menu' : ''}</p>
                  </div>
                  <button type="button" aria-label="Edit" onClick={() => { setOpen({ ...d }); setIsNew(false); setTried(false) }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-plum-700"><Pencil size={15} /></button>
                  <button type="button" aria-label={d.active === false ? 'Restore' : 'Archive'} onClick={() => archive(d, d.active === false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f2f9] text-ink/60">{d.active === false ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>
                </div>
              </Card>
            )
          })}
        </div>
      ))}
      {!dishes.length && <Card className="mt-3"><p className="text-[13px] font-bold text-ink/55">No dishes yet. Start from the Food Catalogue — it's faster than typing.</p></Card>}
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => startNew()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-plum-300 bg-white py-4 text-[14px] font-extrabold text-plum-700"><Plus size={17} /> Add another dish</motion.button>

      <MasterSearch open={search} onClose={() => setSearch(false)} cuisines={a.cuisines ?? []} have={have} tax={tax}
        onPick={r => { setSearch(false); startNew({ name: r.name, master_dish_id: r.id, category_id: r.category_id, suggested_diet: r.suggested_diet,
          cuisine_ids: (r.cuisine_ids ?? []).filter(c => (a.cuisines ?? []).includes(c)) }) }} />
      <Sheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }} title={isNew ? 'New dish' : 'Edit dish'}>
        {open && <DishEditor dish={open} set={setOpen} tax={tax} cuisines={a.cuisines ?? []} fee={fee} tried={tried} />}
        <button type="button" onClick={save} className="mt-4 h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">Save dish</button>
      </Sheet>
    </>
  )
}
