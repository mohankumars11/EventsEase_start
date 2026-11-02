import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'

/**
 * The Menu Studio catalogue, owned by the admin (migration 200).
 *
 * Customers choose from these menus (customer app, screens/MenuStudio);
 * every caterer who fits prices the one a customer sends. So an edit here
 * reaches every customer at once, with no release:
 *
 *   Menus          name, line, diet, meals, service, tags, photo, on/off,
 *                  review; dishes by section — add, remove, reorder, move,
 *                  and a dish's own description and diet
 *   Cuisines       the families customers see, their regions and home cities
 *   Occasion rules which menus suit an occasion, its template or category
 *   Sections       Welcome Drinks … Special Additions: order and visibility
 *
 * A template edit bumps its version (trigger in 200), so a customer menu
 * still records exactly what it started from. Dishes stay in the shared
 * master catalogue (Food catalogue review) — removing one from a menu never
 * deletes the dish.
 */
const csv = a => (a ?? []).join(', ')
const list = s => String(s ?? '').split(',').map(x => x.trim()).filter(Boolean)
const Pill = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${on ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/70 ring-1 ring-ink/[0.06]'}`}>{children}</button>
)
const Field = ({ label, children }) => <label className="block"><span className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-ink/50">{label}</span>{children}</label>
const input = 'w-full rounded-xl bg-white px-3 py-2 text-[13px] font-semibold ring-1 ring-ink/10 outline-none focus:ring-plum-500'

export default function MenuCatalogueAdmin() {
  const toast = useToast()
  const [tab, setTab] = useState('menus')
  const [data, setData] = useState(null)
  const [missing, setMissing] = useState(false)
  const load = useCallback(async () => {
    const [s, f, t, r] = await Promise.all([
      supabase.from('sambramo_menu_sections').select('*').order('sort'),
      supabase.from('sambramo_cuisine_families').select('*').order('sort'),
      supabase.from('sambramo_menu_templates').select('*').order('sort'),
      supabase.from('sambramo_occasion_menu_rules').select('*').order('scope').order('key'),
    ])
    if (s.error || f.error || t.error) { setMissing(true); return }
    setData({ sections: s.data, families: f.data, menus: t.data, rules: r.data ?? [] })
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (table, row, key = 'id') => {
    const { error } = await supabase.from(table).update(row).eq(key, row[key])
    if (error) toast?.error?.(friendlyError(error)); else { toast?.success?.('Saved'); load() }
  }
  const create = async (table, row) => {
    const { error } = await supabase.from(table).insert(row)
    if (error) toast?.error?.(friendlyError(error)); else { toast?.success?.('Added'); load() }
  }

  if (missing) return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/[0.06]">
      <p className="text-[16px] font-extrabold">Menu catalogue isn’t switched on yet</p>
      <p className="mt-1 text-[13px] text-ink/60">Paste <code>supabase/migrations/200_menu_studio.sql</code> in the SQL editor, then run <code>node --env-file=.env scripts/apply-menu-catalogue.mjs</code>. Customers already see the built-in menus meanwhile.</p>
    </div>
  )
  if (!data) return <p className="p-6 text-[13px] text-ink/50">Loading the catalogue…</p>
  return (
    <div className="space-y-4" data-admin-menus>
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink/[0.06]">
        <p className="text-[18px] font-extrabold">Menu catalogue</p>
        <p className="text-[12.5px] text-ink/60">{data.families.length} cuisines · {data.menus.length} menus ({data.menus.filter(m => m.active).length} live, {data.menus.filter(m => m.review_status === 'needs_review').length} to review) · {data.rules.length} occasion rules</p>
        <div className="mt-3 flex gap-2">{[['menus', 'Menus'], ['families', 'Cuisines'], ['rules', 'Occasion rules'], ['sections', 'Sections']].map(([k, l]) => <Pill key={k} on={tab === k} onClick={() => setTab(k)}>{l}</Pill>)}</div>
      </div>
      {tab === 'menus' && <Menus data={data} save={save} create={create} reload={load} toast={toast} />}
      {tab === 'families' && <Families data={data} save={save} create={create} />}
      {tab === 'rules' && <Rules data={data} save={save} create={create} />}
      {tab === 'sections' && (
        <div className="space-y-2">{data.sections.map(s => <SectionRow key={s.id} s={s} save={save} />)}</div>
      )}
    </div>
  )
}

function Menus({ data, save, create, reload, toast }) {
  const [fam, setFam] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const shown = data.menus.filter(m => (fam === 'all' || m.family_id === fam) && m.name.toLowerCase().includes(q.toLowerCase()))
  const fresh = () => {
    const name = prompt('New menu name')
    if (!name) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
    create('sambramo_menu_templates', { id, family_id: fam === 'all' ? data.families[0].id : fam, name, diet: 'veg', active: false, review_status: 'needs_review', sort: 9990 })
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1"><Pill on={fam === 'all'} onClick={() => setFam('all')}>All</Pill>{data.families.map(f => <Pill key={f.id} on={fam === f.id} onClick={() => setFam(f.id)}>{f.name}</Pill>)}</div>
      <div className="flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search menus" className={input} /><button type="button" onClick={fresh} className="shrink-0 rounded-xl bg-plum-700 px-4 text-[13px] font-extrabold text-white">New menu</button></div>
      {shown.map(m => (
        <div key={m.id} className="rounded-2xl bg-white ring-1 ring-ink/[0.06]">
          <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center gap-3 p-3 text-left" data-admin-menu={m.id}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-ink/20'}`} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{m.name}</span><span className="block text-[11.5px] text-ink/55">{data.families.find(f => f.id === m.family_id)?.name} · {m.diet} · v{m.version} · {m.review_status.replace('_', ' ')}</span></span>
          </button>
          {open === m.id && <MenuEditor m={m} data={data} save={save} reload={reload} toast={toast} />}
        </div>
      ))}
    </div>
  )
}

function MenuEditor({ m, data, save, reload, toast }) {
  const [f, setF] = useState({ name: m.name, line: m.line ?? '', diet: m.diet, meals: csv(m.meals), serve: csv(m.serve), tags: csv(m.tags), active: m.active, review_status: m.review_status })
  const [items, setItems] = useState(null)
  const [dishes, setDishes] = useState({})
  const [q, setQ] = useState('')
  const [hits, setHits] = useState([])
  const [into, setInto] = useState(data.sections[0]?.id)
  const [photo, setPhoto] = useState({ file: null, licence: 'Owned by Sambramo', attribution: '' })
  useEffect(() => {
    supabase.from('sambramo_menu_template_items').select('*').eq('template_id', m.id).order('sort').then(async ({ data: rows }) => {
      setItems(rows ?? [])
      const ids = (rows ?? []).map(r => r.dish_id)
      if (ids.length) { const { data: d } = await supabase.from('sambramo_master_dishes').select('id, name, description, suggested_diet, contains_egg').in('id', ids); setDishes(Object.fromEntries((d ?? []).map(x => [x.id, x]))) }
    })
  }, [m.id])
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return }
    const t = setTimeout(() => supabase.rpc('search_master_dishes', { p_q: q.trim(), p_limit: 12 }).then(({ data: d }) => setHits(d ?? [])), 250)
    return () => clearTimeout(t)
  }, [q])
  const bySection = useMemo(() => data.sections.map(s => ({ s, rows: (items ?? []).filter(i => i.section_id === s.id) })), [items, data.sections])
  const move = (row, d) => setItems(all => {
    const same = all.filter(i => i.section_id === row.section_id)
    const k = same.indexOf(row), j = k + d
    if (j < 0 || j >= same.length) return all
    ;[same[k], same[j]] = [same[j], same[k]]
    return [...all.filter(i => i.section_id !== row.section_id), ...same]
  })
  async function saveAll() {
    await save('sambramo_menu_templates', { id: m.id, name: f.name, line: f.line || null, diet: f.diet, meals: list(f.meals), serve: list(f.serve), tags: list(f.tags), active: f.active, review_status: f.review_status })
    const rows = data.sections.flatMap(s => items.filter(i => i.section_id === s.id).map((i, k) => ({ template_id: m.id, dish_id: i.dish_id, section_id: s.id, label: i.label ?? null, sort: k })))
    const del = await supabase.from('sambramo_menu_template_items').delete().eq('template_id', m.id)
    const ins = rows.length ? await supabase.from('sambramo_menu_template_items').insert(rows) : { error: null }
    if (del.error || ins.error) toast?.error?.(friendlyError(del.error ?? ins.error)); else reload()
  }
  async function saveDish(id, patch) {
    const { error } = await supabase.from('sambramo_master_dishes').update(patch).eq('id', id)
    if (error) toast?.error?.(friendlyError(error)); else { setDishes(d => ({ ...d, [id]: { ...d[id], ...patch } })); toast?.success?.('Dish saved') }
  }
  async function upload() {
    if (!photo.file) return
    const path = `menus/${m.id}/${crypto.randomUUID()}.${(photo.file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`
    const up = await supabase.storage.from('menu-catalogue').upload(path, photo.file, { contentType: photo.file.type })
    if (up.error) { toast?.error?.(friendlyError(up.error)); return }
    const url = supabase.storage.from('menu-catalogue').getPublicUrl(path).data.publicUrl
    const id = `upload-${crypto.randomUUID().slice(0, 12)}`
    const a = await supabase.from('sambramo_catalogue_assets').insert({ id, subject_kind: 'menu', subject_id: m.id, url, source: 'sambramo', licence: photo.licence,
      attribution: photo.attribution || null, kind: photo.licence === 'Owned by Sambramo' ? 'sambramo_original' : 'inspiration', usage_status: 'active' })
    if (a.error) { toast?.error?.(friendlyError(a.error)); return }
    await save('sambramo_menu_templates', { id: m.id, hero_asset_id: id })
  }
  return (
    <div className="space-y-3 border-t border-ink/[0.06] p-3" data-admin-editor>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Name"><input className={input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="One line"><input className={input} value={f.line} onChange={e => setF({ ...f, line: e.target.value })} /></Field>
        <Field label="Diet"><select className={input} value={f.diet} onChange={e => setF({ ...f, diet: e.target.value })}>{['veg', 'mixed', 'non_veg'].map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Review"><select className={input} value={f.review_status} onChange={e => setF({ ...f, review_status: e.target.value })}>{['needs_review', 'reviewed', 'rejected'].map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Meals (breakfast, lunch, hightea, dinner)"><input className={input} value={f.meals} onChange={e => setF({ ...f, meals: e.target.value })} /></Field>
        <Field label="Served (buffet, leaf, plated, family, counters, packed)"><input className={input} value={f.serve} onChange={e => setF({ ...f, serve: e.target.value })} /></Field>
        <Field label="Tags — what occasion rules match"><input className={input} value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} /></Field>
        <label className="flex items-center gap-2 pt-5 text-[13px] font-bold"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} />Live for customers</label>
      </div>
      <div className="rounded-xl bg-ink/[0.02] p-2.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink/50">Photo</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input type="file" accept="image/*" onChange={e => setPhoto({ ...photo, file: e.target.files?.[0] ?? null })} className="text-[12px]" />
          <select className="rounded-lg bg-white px-2 py-1.5 text-[12px] ring-1 ring-ink/10" value={photo.licence} onChange={e => setPhoto({ ...photo, licence: e.target.value })}>{['Owned by Sambramo', 'Pexels License', 'Licensed — written permission'].map(l => <option key={l}>{l}</option>)}</select>
          <input placeholder="Attribution (photographer)" className="rounded-lg bg-white px-2 py-1.5 text-[12px] ring-1 ring-ink/10" value={photo.attribution} onChange={e => setPhoto({ ...photo, attribution: e.target.value })} />
          <button type="button" disabled={!photo.file} onClick={upload} className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-40">Upload</button>
        </div>
        <p className="mt-1 text-[11px] text-ink/50">Only photos Sambramo owns or is licensed to use. Never a caterer’s food passed off as ours, or ours as theirs.</p>
      </div>
      {!items ? <p className="text-[12px] text-ink/50">Loading dishes…</p> : bySection.filter(x => x.rows.length).map(({ s, rows }) => (
        <div key={s.id}>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-plum-700">{s.name}</p>
          {rows.map(r => <DishRow key={r.dish_id} r={r} d={dishes[r.dish_id]} sections={data.sections} onMove={d => move(r, d)} onRemove={() => setItems(all => all.filter(i => i !== r))}
            onSection={sid => setItems(all => all.map(i => (i === r ? { ...i, section_id: sid } : i)))} onSaveDish={patch => saveDish(r.dish_id, patch)} />)}
        </div>
      ))}
      <div className="rounded-xl bg-ink/[0.02] p-2.5">
        <div className="flex gap-2"><input className={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Add a dish — search the 2,700+ catalogue" />
          <select className="rounded-xl bg-white px-2 text-[12px] ring-1 ring-ink/10" value={into} onChange={e => setInto(e.target.value)}>{data.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        {hits.map(h => (
          <button key={h.id} type="button" disabled={items?.some(i => i.dish_id === h.id)} onClick={() => { setItems(all => [...all, { template_id: m.id, dish_id: h.id, section_id: into, label: null }]); setDishes(d => ({ ...d, [h.id]: { id: h.id, name: h.name, suggested_diet: h.suggested_diet } })) }}
            className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-left text-[12.5px] font-semibold ring-1 ring-ink/10 disabled:opacity-40">{h.name} <span className="text-ink/45">· {h.suggested_diet ?? 'diet not set'} · {h.review_status}</span></button>
        ))}
      </div>
      <button type="button" onClick={saveAll} className="w-full rounded-xl bg-plum-700 py-2.5 text-[13px] font-extrabold text-white" data-admin-save>Save menu</button>
    </div>
  )
}

function DishRow({ r, d, sections, onMove, onRemove, onSection, onSaveDish }) {
  const [edit, setEdit] = useState(false)
  const [desc, setDesc] = useState(d?.description ?? '')
  const [diet, setDiet] = useState(d?.suggested_diet ?? '')
  useEffect(() => { setDesc(d?.description ?? ''); setDiet(d?.suggested_diet ?? '') }, [d])
  return (
    <div className="mt-1 rounded-lg bg-white px-2 py-1.5 ring-1 ring-ink/[0.06]">
      <div className="flex items-center gap-1.5 text-[12.5px]">
        <button type="button" onClick={() => setEdit(!edit)} className="min-w-0 flex-1 truncate text-left font-bold">{r.label ?? d?.name ?? r.dish_id} <span className="font-semibold text-ink/45">{d?.suggested_diet ?? ''}</span></button>
        <button type="button" onClick={() => onMove(-1)} className="px-1 text-ink/50" aria-label="Up">↑</button>
        <button type="button" onClick={() => onMove(1)} className="px-1 text-ink/50" aria-label="Down">↓</button>
        <select value={r.section_id} onChange={e => onSection(e.target.value)} className="rounded bg-ink/[0.03] px-1 text-[11px]">{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button type="button" onClick={onRemove} className="px-1 font-extrabold text-red-600" aria-label="Remove from menu">×</button>
      </div>
      {edit && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <input value={desc} onChange={e => setDesc(e.target.value.slice(0, 240))} placeholder="What it is, for a customer" className="min-w-0 flex-1 rounded bg-ink/[0.03] px-2 py-1 text-[12px]" />
          <select value={diet} onChange={e => setDiet(e.target.value)} className="rounded bg-ink/[0.03] px-1 text-[12px]">{['', 'veg', 'egg', 'non_veg', 'vegan', 'jain'].map(x => <option key={x} value={x}>{x || 'not set'}</option>)}</select>
          <button type="button" onClick={() => onSaveDish({ description: desc || null, suggested_diet: diet || null })} className="rounded bg-ink px-2 py-1 text-[11.5px] font-extrabold text-white">Save dish</button>
        </div>
      )}
    </div>
  )
}

function Families({ data, save, create }) {
  return (
    <div className="space-y-2">
      {data.families.map(f => <FamilyRow key={f.id} f={f} save={save} />)}
      <button type="button" onClick={() => { const name = prompt('Cuisine name'); if (name) create('sambramo_cuisine_families', { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, sort: 999, active: false }) }}
        className="w-full rounded-xl bg-plum-700 py-2.5 text-[13px] font-extrabold text-white">Add a cuisine</button>
    </div>
  )
}
function FamilyRow({ f, save }) {
  const [v, setV] = useState({ name: f.name, region: f.region ?? '', line: f.line ?? '', cities: csv(f.cities), cuisine_ids: csv(f.cuisine_ids), active: f.active })
  return (
    <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06] sm:grid-cols-2">
      <Field label="Name"><input className={input} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Regional variations"><input className={input} value={v.region} onChange={e => setV({ ...v, region: e.target.value })} /></Field>
      <Field label="One line"><input className={input} value={v.line} onChange={e => setV({ ...v, line: e.target.value })} /></Field>
      <Field label="Home cities (raise it there)"><input className={input} value={v.cities} onChange={e => setV({ ...v, cities: e.target.value })} /></Field>
      <Field label="Catalogue cuisine ids"><input className={input} value={v.cuisine_ids} onChange={e => setV({ ...v, cuisine_ids: e.target.value })} /></Field>
      <div className="flex items-end justify-between gap-2">
        <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={v.active} onChange={e => setV({ ...v, active: e.target.checked })} />Live</label>
        <button type="button" onClick={() => save('sambramo_cuisine_families', { id: f.id, name: v.name, region: v.region, line: v.line, cities: list(v.cities).map(c => c.toLowerCase()), cuisine_ids: list(v.cuisine_ids), active: v.active })} className="rounded-xl bg-ink px-4 py-2 text-[12.5px] font-extrabold text-white">Save</button>
      </div>
    </div>
  )
}

function Rules({ data, save, create }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-ink/60">An occasion uses its own rule if it has one, else its template’s, else its category’s. Tags raise menus carrying them; “avoid” lowers them (never hides).</p>
      {data.rules.map(r => <RuleRow key={r.id} r={r} save={save} />)}
      <button type="button" onClick={() => { const key = prompt('Occasion id (e.g. first-birthday) — or template:<id> / category:<id>'); if (!key) return
        const [scope, k] = key.includes(':') ? key.split(':') : ['occasion', key]; create('sambramo_occasion_menu_rules', { id: `${scope}:${k}`, scope, key: k, tags: [], meals: [], serve: [], avoid: [] }) }}
        className="w-full rounded-xl bg-plum-700 py-2.5 text-[13px] font-extrabold text-white">Add a rule</button>
    </div>
  )
}
function RuleRow({ r, save }) {
  const [v, setV] = useState({ tags: csv(r.tags), meals: csv(r.meals), serve: csv(r.serve), avoid: csv(r.avoid), active: r.active })
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
      <p className="text-[13px] font-extrabold">{r.scope} · {r.key}</p>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-4">
        {['tags', 'meals', 'serve', 'avoid'].map(k => <Field key={k} label={k}><input className={input} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} /></Field>)}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12.5px] font-bold"><input type="checkbox" checked={v.active} onChange={e => setV({ ...v, active: e.target.checked })} />Active</label>
        <button type="button" onClick={() => save('sambramo_occasion_menu_rules', { id: r.id, tags: list(v.tags), meals: list(v.meals), serve: list(v.serve), avoid: list(v.avoid), active: v.active })} className="rounded-xl bg-ink px-4 py-1.5 text-[12.5px] font-extrabold text-white">Save</button>
      </div>
    </div>
  )
}

function SectionRow({ s, save }) {
  const [v, setV] = useState({ name: s.name, sort: s.sort, active: s.active })
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
      <input className={input} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} />
      <input type="number" className={input + ' w-20'} value={v.sort} onChange={e => setV({ ...v, sort: Number(e.target.value) })} />
      <label className="flex items-center gap-1 text-[12px] font-bold"><input type="checkbox" checked={v.active} onChange={e => setV({ ...v, active: e.target.checked })} />Shown</label>
      <button type="button" onClick={() => save('sambramo_menu_sections', { id: s.id, ...v })} className="rounded-xl bg-ink px-3 py-2 text-[12px] font-extrabold text-white">Save</button>
    </div>
  )
}
