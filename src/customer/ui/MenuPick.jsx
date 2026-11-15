/**
 * The catering preference, as menu cards written for the occasion
 * (Mohan, 2026-11-13): the diet was asked at event details, so it is one
 * line here. Then the cuisine as clean state cards; tap one and a FULL
 * SCREEN opens with three to five menus Sambramo composed for this very
 * day — a haldi brunch, a naming-ceremony lunch, a reception dinner
 * (lib/occasionMenus) — never a generic list. Tap a menu and its card
 * opens full screen: Veg · Jain · Satvik · Non-veg editions, every dish
 * swappable or removable, a dish of your own typed in, then "Use this
 * menu". Nothing leaves this screen for a separate studio, and nothing is
 * sent from here: the menu is saved on the plan and goes with the
 * catering quotation at the end of preferences.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, BadgeCheck, Check, ChevronRight, Leaf, Loader2, Pencil, PenLine, Plus, Search, TriangleAlert, Users, X } from 'lucide-react'
import { Sheet } from './kit'
import { IconTiles } from './choiceTiles'
import { catalogueNow, catalogueFast, familiesFor, dishCount, sectionName, alternativesFor, flagsFor, menuFlags, SERVES, mealFor } from '../lib/menuStudio'
import { occasionMenus, editionsFor, recipeFor, studioFor, fitsEdition, EDITIONS } from '../lib/occasionMenus'
import { foodNeeds, wayOf } from '../data/visualCatalogue'
import { loadMaster, searchMaster } from '../lib/dishSearch'
import { peopleLine } from '../data/occasionProfile'

/* The event-details answer → the catalogue's diet. */
const FROM_EVENT = { veg: 'veg', nonveg: 'non_veg', both: 'mixed', vegan: 'vegan', jain: 'jain' }
const DIETS = [{ id: 'veg', label: 'Veg' }, { id: 'non_veg', label: 'Non-veg' }, { id: 'mixed', label: 'Both' }, { id: 'vegan', label: 'Vegan' }, { id: 'jain', label: 'Jain' }]
const DIET_WORD = Object.fromEntries(DIETS.map(d => [d.id, d.label]))
const EDITION_WORD = Object.fromEntries(EDITIONS.map(e => [e.id, e.label]))
const MEAL_WORD = { breakfast: 'Breakfast', lunch: 'Lunch', hightea: 'High tea', dinner: 'Dinner' }
/* Light solid cards, the way a quick-commerce shelf tiles them: [card, ink]. */
const CARD = [
  ['#FFF1DE', '#8A4B08'], ['#E6F6EC', '#146B3A'], ['#FDE7E9', '#9F1D2E'], ['#E7F0FF', '#1D4ED8'], ['#F3E8FF', '#5B21B6'], ['#FFF8D6', '#7A5A00'],
  ['#E0F5F5', '#0F6E6A'], ['#FFE9F3', '#B0215F'], ['#EEF2E0', '#4D6B10'], ['#E9EEFF', '#3730A3'], ['#FDEBDD', '#9A3412'], ['#E5F4FF', '#075985'],
]
const cardTone = i => CARD[i % CARD.length]
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function MenuPick({ o, ev, place, needs, set, answers = {} }) {
  const navigate = useNavigate()
  const [cat, setCat] = useState(() => catalogueNow())
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(null)      // null | 'menus' | 'card'
  const [viewing, setViewing] = useState(null)  // the composed menu whose card is open
  const [draft, setDraft] = useState(null)      // the editable copy on the card
  const [swap, setSwap] = useState(null)        // { si, i } — i = -1 adds to the course
  const [typing, setTyping] = useState(null)
  const [typed, setTyped] = useState('')
  useEffect(() => { catalogueFast(setCat).then(c => setCat(x => x ?? c), () => setFailed(true)); loadMaster().catch(() => {}) }, [])
  /* A full-screen stage owns the scroll while it is open. */
  useEffect(() => {
    if (!stage) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [stage])

  const fromEvent = FROM_EVENT[answers.diet] ?? null
  const diet = needs.$studioDiet ?? fromEvent ?? needs.$diet?.[0] ?? 'veg'
  const meal = needs.$meal ?? mealFor(ev.time)
  const guests = Number(needs.$guests) || Number(ev.guests) || 50
  const city = place?.city ?? (place?.area ? 'bengaluru' : '')
  const studio = needs.$studio ?? null
  const family = needs.$family ?? studio?.family ?? null
  const recipe = useMemo(() => recipeFor(o, ev), [o, ev.company])
  const ctx = { occasion: o, ev, diet, meal, city }

  /* Styles that have menus for THIS day, home state first. */
  const fams = useMemo(() => (cat ? familiesFor(cat, { city }).filter(f => occasionMenus(cat, { ...ctx, family: f.id }).length > 0) : []), [cat, city, diet, meal, o, ev.company])
  const menus = useMemo(() => (cat && family ? occasionMenus(cat, { ...ctx, family }) : []), [cat, family, diet, meal, city, o, ev.company])
  const editions = useMemo(() => (cat && viewing ? editionsFor(cat, viewing, recipe, diet) : []), [cat, viewing, recipe, diet])
  /* A day that is served vegetarian (a haldi, a housewarming, a memorial) says so, rather than showing veg cards under a non-veg heading. */
  const vegDay = ['non_veg', 'mixed'].includes(diet) && !recipe.editions.includes('non_veg')
  const dietWord = vegDay ? 'veg — this day is served vegetarian' : diet === 'mixed' ? 'veg & non-veg cards' : DIET_WORD[diet].toLowerCase()
  const fam = cat && family ? cat.families.find(f => f.id === family) : null

  const setDiet = d => { set({ $studioDiet: d, $diet: [d] }); if (studio) set({ $studioDiet: d, $diet: [d], $studio: null, $edition: null }) }
  const openFamily = f => { set({ $family: f.id }); setStage('menus') }
  const openMenu = m => { setViewing(m); setDraft(studioFor(cat, m, m.edition, { occasion: o, ev })); setStage('card') }
  const openChosen = () => { setViewing(menus.find(m => m.id === studio.composed) ?? null); setDraft(studio); setStage('card') }
  const switchEdition = e => {
    if (!viewing || !draft) return
    const next = studioFor(cat, viewing, e, { occasion: o, ev })
    /* The customer's own dishes stay through an edition change. */
    for (const s of draft.sections) for (const i of s.items) if (i.typed) { const t = next.sections.find(x => x.id === s.id); if (t) t.items.push(i); else next.sections.push({ id: s.id, items: [i] }) }
    setDraft(next)
  }
  const use = () => {
    set({ $studio: { ...draft, clientKey: studio?.clientKey ?? uuid() }, $menu: null, $family: draft.family, $edition: draft.edition ?? null })
    setStage(null); setViewing(null)
  }
  const setServe = s => { const sv = SERVES.find(x => x.id === s); set({ $serve: s, service_styles: [...new Set([...foodNeeds([wayOf(needs)]).service_styles, ...(sv?.styles ?? [])])] }) }
  const edit = fn => setDraft(d => ({ ...d, sections: fn(d.sections.map(s => ({ ...s, items: [...s.items] }))).filter(s => s.items.length) }))
  const addTyped = sid => {
    const name = typed.trim()
    if (!name) return
    edit(ss => { const s = ss.find(x => x.id === sid); s.items.push({ id: `typed:${Date.now()}`, name, diet: 'veg', typed: true }); return ss })
    setTyped(''); setTyping(null)
  }
  const flags = draft && cat ? menuFlags(cat, draft, diet, needs.$allergies ?? '') : []
  const mealWord = MEAL_WORD[meal] ?? 'Lunch'

  if (failed) return <p className="rounded-[14px] bg-[#FFF4F4] p-3 text-[12.5px] font-bold text-[#B42318]">The menus could not load. Check your connection.</p>
  if (!cat) return <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--ink-3)]"><Loader2 size={16} className="animate-spin text-[#7C3AED]" />Opening the menu book…</p>

  return (
    <div className="space-y-5" data-menu-pick>
      {/* 1 · Diet: already answered at event details — said once, with an Edit. */}
      {fromEvent && !needs.$studioDiet ? (
        <div className="flex items-center gap-3 rounded-[16px] bg-[#F3FBF5] p-3 shadow-[inset_0_0_0_1.5px_#C7EBD3]" data-menu-diet-chosen>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#1B7F4A] shadow-[0_0_0_1px_#C7EBD3]"><Leaf size={19} strokeWidth={2.3} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-black uppercase tracking-[0.12em] text-[#0B7A45]">You chose</span>
            <span className="block text-[15px] font-black leading-tight text-[#1C1033]">{DIET_WORD[diet]} · {peopleLine(o, ev)} · {mealWord}</span>
            <span className="block text-[11px] font-semibold text-[var(--ink-3)]">From your event details — caterers price per plate</span>
          </span>
          <button type="button" onClick={() => navigate(`/o/${o.id}?edit=q:diet&back=1`)} className="cx-press flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[#0B7A45] shadow-[0_0_0_1.5px_#C7EBD3]" data-menu-diet-edit><Pencil size={12} />Edit</button>
        </div>
      ) : (
        <section>
          <p className="text-[15px] font-black tracking-[-0.02em]">Food preference</p>
          <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">This decides which menus you see · {peopleLine(o, ev)}, {mealWord.toLowerCase()}</p>
          <div className="mt-2.5"><IconTiles data="menu-diet" cols={3} compact value={diet} items={DIETS.map(d => ({ ...d, icon: ['veg', 'vegan', 'jain'].includes(d.id) ? Leaf : undefined }))} onChange={v => v && setDiet(v)} /></div>
        </section>
      )}

      {/* 2 · The chosen menu, or the styles to choose from. */}
      {studio ? (
        <section className="overflow-hidden rounded-[22px] bg-[#FFFCF5] shadow-[0_0_0_1px_#EDE2CB,0_14px_30px_-20px_rgba(76,29,149,.35)]" data-menu-ready>
          <header className="bg-gradient-to-r from-[#2A124F] to-[#5B21B6] px-4 py-3 text-white">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#F4D99A]"><BadgeCheck size={12} />Your {o.name.toLowerCase()} menu</p>
            <p className="mt-0.5 text-[18px] font-black leading-tight">{studio.name}</p>
            <p className="text-[11.5px] font-semibold text-white/80">{[cat.families.find(f => f.id === studio.family)?.name, EDITION_WORD[studio.edition] ?? DIET_WORD[diet], `${dishCount(studio)} dishes · ${studio.sections.length} courses`, peopleLine(o, ev)].filter(Boolean).join(' · ')}</p>
          </header>
          <div className="px-4 py-3">
            <p className="text-[12.5px] font-semibold leading-snug text-[#5A4A1E]">{studio.sections.flatMap(s => s.items.map(i => i.name)).slice(0, 7).join(' · ')}{dishCount(studio) > 7 ? ` · and ${dishCount(studio) - 7} more` : ''}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={openChosen} className="cx-solid shadow-[0_8px_18px_-10px_rgba(20,10,40,.55)] cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-[13px] font-extrabold text-white" data-menu-open><Pencil size={14} />Open menu card</button>
              <button type="button" onClick={() => setStage('menus')} className="cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-white text-[13px] font-extrabold text-[#5B21B6] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-menu-change>Change menu</button>
            </div>
          </div>
        </section>
      ) : (
        <section>
          <p className="text-[15px] font-black tracking-[-0.02em]">Which style of food?</p>
          <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{fams.length} styles with {dietWord} menus written for a {recipe.words[meal]?.toLowerCase() ?? 'celebration'} · yours first</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2" data-menu-families>
            {fams.map((f, i) => {
              const [card, ink] = cardTone(i)
              const n = occasionMenus(cat, { ...ctx, family: f.id }).length
              return (
                <button key={f.id} type="button" onClick={() => openFamily(f)} data-family={f.id}
                  className="cx-press relative flex min-h-[92px] flex-col rounded-[16px] p-3 text-left shadow-[0_0_0_1px_rgba(28,16,51,.05),0_8px_18px_-16px_rgba(28,16,51,.4)]" style={{ background: card, color: ink }}>
                  <span className="block text-[13.5px] font-black leading-[1.1] tracking-[-0.02em] text-[#1C1033]">{f.name}</span>
                  <span className="mt-0.5 block text-[9.5px] font-black uppercase tracking-[0.18em]">style</span>
                  <span className="mt-auto w-fit rounded-full bg-white/70 px-2 py-[2px] text-[10.5px] font-extrabold">{n} {n === 1 ? 'menu' : 'menus'}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 3 · How it is served, and staff — the two that move the price. */}
      <section>
        <p className="text-[15px] font-black tracking-[-0.02em]">How should it be served?</p>
        <div className="mt-2.5"><IconTiles data="menu-serve" cols={3} compact value={needs.$serve ?? null} items={SERVES.map(s => ({ id: s.id, label: s.label }))} other="Another way of serving" onChange={v => v && setServe(v)} /></div>
      </section>
      <button type="button" role="switch" aria-checked={!!needs.$staff} onClick={() => set({ $staff: !needs.$staff })} data-staff-toggle
        className="cx-press flex w-full items-center justify-between rounded-[16px] bg-white p-3 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]">
        <span className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#F4EEFF] text-[#6D28D9]"><Users size={17} /></span><span><span className="block text-[14px] font-extrabold">Serving staff</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">About one for every 25 guests</span></span></span>
        <span className={'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ' + (needs.$staff ? 'bg-[#7C3AED]' : 'bg-[#E4DDF0]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (needs.$staff ? 'right-[3px]' : 'left-[3px]')} /></span>
      </button>
      <label className="block">
        <span className="text-[13px] font-black">Allergies or things to avoid <span className="font-semibold text-[var(--ink-3)]">(optional)</span></span>
        <input value={needs.$allergies ?? ''} onChange={e => set({ $allergies: e.target.value.slice(0, 300) })} placeholder="e.g. no peanuts, one guest is lactose intolerant"
          className="mt-1.5 h-11 w-full rounded-[14px] bg-white px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-allergies />
      </label>

      {/* ── Full screen: the style's menus for this day ──────────────── */}
      {stage === 'menus' && fam && (
        <Stage onBack={() => setStage(null)} kicker={`Sambramo menus · ${fam.name}`} title={`For your ${o.name.toLowerCase()}`}
          sub={`${menus.length} ${menus.length === 1 ? 'menu' : 'menus'} written for a ${(recipe.words[meal] ?? 'celebration').toLowerCase()} · ${dietWord} · every dish swappable`} data="menus">
          <div className="flex flex-wrap gap-1.5 px-4 pt-3" data-menu-why>
            {[`Written for your ${o.name.toLowerCase()}`, peopleLine(o, ev), mealWord].map(c => <span key={c} className="rounded-full bg-[#F4EEFF] px-2.5 py-1 text-[11px] font-extrabold text-[#4C1D95]">{c}</span>)}
          </div>
          <ul className="space-y-3 px-4 pb-6 pt-3" data-menu-list>
            {menus.map((m, i) => {
              const [card, ink] = cardTone(i)
              const mine = studio?.composed === m.id
              const n = m.sections.reduce((k, s) => k + s.dishes.length, 0)
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => openMenu(m)} data-menu={m.id}
                    className={'cx-press block w-full overflow-hidden rounded-[22px] text-left shadow-[0_0_0_1px_rgba(28,16,51,.06),0_16px_30px_-22px_rgba(28,16,51,.45)] ' + (mine ? 'ring-[2.5px] ring-[#7C3AED]' : '')} style={{ background: card }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: ink }}>{EDITION_WORD[m.edition]} · {n} dishes · {m.sections.length} courses</span>
                        <DietMark d={m.diet === 'veg' ? 'veg' : 'non_veg'} />
                      </div>
                      <h3 className="mt-1 text-[19px] font-black leading-[1.08] tracking-[-0.03em] text-[#1C1033]">{m.name}</h3>
                      <p className="mt-1 text-[12.5px] font-semibold leading-snug text-[#3B2A5A]">{m.line}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.sections.flatMap(s => s.dishes).slice(0, 6).map(id => <span key={id} className="rounded-full bg-white/80 px-2 py-[3px] text-[11px] font-bold text-[#1C1033]">{cat.dishes[id]?.name}</span>)}
                        {n > 6 && <span className="rounded-full bg-white/50 px-2 py-[3px] text-[11px] font-bold text-[#1C1033]">+{n - 6} more</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/70 px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold" style={{ color: ink }}>{mine ? 'Your menu' : 'Open the menu card'}</span>
                      <span className={'grid h-8 w-8 place-items-center rounded-full text-white ' + (mine ? 'bg-[#16A34A]' : 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]')}>{mine ? <Check size={15} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={2.8} />}</span>
                    </div>
                  </button>
                </li>
              )
            })}
            {!menus.length && <li className="rounded-[14px] bg-[#FAF8FD] p-3 text-[12.5px] font-semibold text-[var(--ink-2)]">No {DIET_WORD[diet].toLowerCase()} menu in this style for a {(recipe.words[meal] ?? 'celebration').toLowerCase()} yet — pick another style.</li>}
          </ul>
          <div className="px-4 pb-8">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Other styles</p>
            <div className="cx-noscroll mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {fams.filter(f => f.id !== family).map(f => <button key={f.id} type="button" onClick={() => set({ $family: f.id })} className="cx-press shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#2E1A4F] shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-family-chip={f.id}>{f.name}</button>)}
            </div>
          </div>
        </Stage>
      )}

      {/* ── Full screen: one menu card, every dish yours to change ───── */}
      {stage === 'card' && draft && (
        <Stage onBack={() => setStage(viewing ? 'menus' : null)} kicker={`Your ${o.name.toLowerCase()} menu`} title={draft.name}
          sub={[fam?.name ?? cat.families.find(f => f.id === draft.family)?.name, EDITION_WORD[draft.edition] ?? DIET_WORD[diet], `${dishCount(draft)} dishes · ${draft.sections.length} courses`, peopleLine(o, ev)].filter(Boolean).join(' · ')} data="card" dark
          footer={(
            <div className="flex items-center gap-2">
              {viewing && <button type="button" onClick={() => setStage('menus')} className="cx-press h-[54px] shrink-0 rounded-[18px] bg-[#F4EEFF] px-4 text-[13px] font-extrabold text-[#4C1D95]" data-menu-others>Other menus</button>}
              <button type="button" onClick={use} className="cx-press cx-cta flex h-[54px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-menu-use>
                <Check size={18} strokeWidth={3} /><span className="truncate">{studio?.composed === draft.composed || (!viewing && studio) ? 'Done' : 'Use this menu'}</span>
              </button>
            </div>
          )}>
          {draft.line && <p className="px-4 pt-3 text-[12.5px] font-semibold leading-snug text-[#5A4A1E]">{draft.line}</p>}
          {editions.length > 1 && (
            <div className="px-4 pt-3" data-menu-editions>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Edition</p>
              <div className="mt-1.5 grid gap-1 rounded-[14px] bg-[#F4F1F8] p-1" style={{ gridTemplateColumns: `repeat(${editions.length}, minmax(0, 1fr))` }}>
                {editions.map(e => (
                  <button key={e.id} type="button" onClick={() => switchEdition(e.id)} aria-pressed={draft.edition === e.id} data-edition={e.id}
                    className={'h-10 rounded-[11px] text-[12.5px] font-extrabold transition ' + (draft.edition === e.id ? 'bg-white text-[#1C1033] shadow-[0_1px_3px_rgba(28,16,51,.14)]' : 'text-[var(--ink-3)]')}>{e.label}</button>
                ))}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[var(--ink-3)]">{editions.find(e => e.id === draft.edition)?.line} · the caterer confirms every dish</p>
            </div>
          )}
          {flags.length > 0 && <p className="mx-4 mt-3 flex items-start gap-1.5 rounded-[12px] bg-[#FFF7E6] px-3 py-2 text-[11.5px] font-bold text-[#7A4B00]" data-menu-flags><TriangleAlert size={13} className="mt-px shrink-0" />{flags.length} {flags.length === 1 ? 'dish needs' : 'dishes need'} a change for your diet — marked below. Swap, or the caterer confirms.</p>}
          <div className="space-y-4 px-4 pb-8 pt-4">
            {draft.sections.map((s, si) => (
              <div key={s.id} data-menu-section={s.id}>
                <div className="flex items-center justify-between rounded-full bg-gradient-to-r from-[#2E1065] to-[#5B21B6] px-3.5 py-1.5 text-white">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]">{sectionName(cat, s.id)}</span>
                  <span className="text-[11px] font-black">{s.items.length}</span>
                </div>
                <ul className="mt-1 divide-y divide-[#F3EBDA]">
                  {s.items.map((d, i) => {
                    const f = d.typed ? [] : flagsFor(cat.dishes[d.id], diet, needs.$allergies ?? '')
                    return (
                      <li key={(d.id ?? d.name) + i} className="flex items-center gap-2.5 py-2" data-menu-dish>
                        <DietMark d={d.diet} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-extrabold text-[#1C1033]">{d.name}</span>
                          {!d.typed && cat.dishes[d.id]?.desc && !d.replaces && <span className="block truncate text-[11px] font-semibold text-[var(--ink-3)]">{cat.dishes[d.id].desc}</span>}
                          {d.replaces && <span className="block truncate text-[10.5px] font-bold text-[#0B6B3D]">Instead of {d.replaces}</span>}
                          {d.typed && <span className="block text-[10.5px] font-bold text-[#6B4FA0]">Your own dish</span>}
                          {f.map(x => <span key={x} className="block truncate text-[10.5px] font-bold text-[#9A5B00]">{x}</span>)}
                        </span>
                        {!d.typed && <button type="button" onClick={() => setSwap({ si, i })} className="cx-press flex h-8 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-swap><ArrowLeftRight size={12} />Swap</button>}
                        <button type="button" onClick={() => edit(ss => { ss[si].items.splice(i, 1); return ss })} aria-label={`Remove ${d.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#FFF1F2] text-[#9B1A2A]" data-remove><X size={14} /></button>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-1 flex items-center gap-3">
                  <button type="button" onClick={() => setSwap({ si, i: -1 })} className="flex items-center gap-1 text-[12px] font-extrabold text-[#6D28D9]" data-menu-add-dish><Plus size={13} />Add a dish</button>
                  {typing === s.id ? (
                    <label className="cx-rise flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-white px-3 shadow-[inset_0_0_0_2px_#7C3AED]">
                      <PenLine size={14} className="text-[#7C3AED]" />
                      <input autoFocus value={typed} onChange={e => setTyped(e.target.value.slice(0, 60))} onKeyDown={e => e.key === 'Enter' && addTyped(s.id)} placeholder="A dish of your own" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none" data-menu-typed />
                      <button type="button" onClick={() => addTyped(s.id)} className="text-[12px] font-extrabold text-[var(--brand)]">Add</button>
                    </label>
                  ) : (
                    <button type="button" onClick={() => { setTyping(s.id); setTyped('') }} className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--ink-3)]" data-menu-add><PenLine size={13} />Type my own</button>
                  )}
                </div>
              </div>
            ))}
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink-3)]"><BadgeCheck size={13} className="text-[#7C3AED]" />A Sambramo menu · every caterer who fits quotes their own price for exactly this</p>
          </div>
        </Stage>
      )}

      <SwapSheet cat={cat} diet={diet} studio={draft} at={swap} onClose={() => setSwap(null)}
        onPick={d => {
          edit(ss => {
            if (swap.i < 0) { ss[swap.si].items.push({ id: d.id, name: d.name, diet: d.diet }); return ss }
            const cur = ss[swap.si].items[swap.i]
            ss[swap.si].items[swap.i] = d.original ? { id: d.id, name: d.name, diet: d.diet } : { id: d.id, name: d.name, diet: d.diet, replaces: cur.replaces ?? cur.name, replacesId: cur.replacesId ?? cur.id }
            return ss
          })
          setSwap(null)
        }} />
    </div>
  )
}

/* A full-screen stage inside preferences: its own header, scroll and
   footer. Rendered on <body> — the preference card animates in with a
   transform, and a fixed element inside a transformed parent is pinned to
   that parent, not the screen. */
function Stage({ onBack, kicker, title, sub, children, footer = null, dark = false, data }) {
  return createPortal(
    <div className="cx-enter fixed inset-0 z-[170] flex flex-col bg-[#FAF8FD]" data-menu-stage={data}>
      <header className={'shrink-0 px-4 pb-3 ' + (dark ? 'bg-gradient-to-r from-[#2A124F] to-[#5B21B6] text-white' : 'bg-white shadow-[0_1px_0_#EEE8F8]')} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <div className="flex items-start gap-2.5">
          <button type="button" onClick={onBack} aria-label="Back" className={'cx-press mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ' + (dark ? 'bg-white/15 text-white' : 'bg-[#F4EEFF] text-[#5B21B6]')} data-stage-back><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1">
            <p className={'text-[10px] font-black uppercase tracking-[0.2em] ' + (dark ? 'text-[#F4D99A]' : 'text-[var(--brand)]')}>{kicker}</p>
            <h2 className="text-[20px] font-black leading-[1.1] tracking-[-0.03em]">{title}</h2>
            {sub && <p className={'mt-0.5 text-[11.5px] font-semibold ' + (dark ? 'text-white/80' : 'text-[var(--ink-3)]')}>{sub}</p>}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: footer ? 0 : 'env(safe-area-inset-bottom, 0px)' }}>{children}</div>
      {footer && <div className="shrink-0 border-t border-[var(--line)] bg-white/95 px-4 pt-2.5 backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>{footer}</div>}
    </div>,
    document.body,
  )
}

function SwapSheet({ cat, diet, studio, at, onClose, onPick }) {
  const adding = at?.i === -1
  const cur = at && studio && !adding ? studio.sections[at.si]?.items[at.i] : null
  const sec = at && studio ? studio.sections[at.si] : null
  const [q, setQ] = useState('')
  const [, bump] = useState(0)
  useEffect(() => { setQ(''); loadMaster().then(() => bump(n => n + 1)).catch(() => {}) }, [at])
  const taken = useMemo(() => new Set(studio?.sections.flatMap(s => s.items.map(i => i.id)) ?? []), [studio])
  const edition = studio?.edition ?? (['veg', 'jain', 'vegan'].includes(diet) ? 'veg' : null)
  /* This style's own dishes first — they keep the menu a Karnataka menu —
     then the whole catalogue, 2,500+ dishes, searchable. Every list keeps
     the edition's promise: a Jain card is only offered Jain-safe dishes. */
  const alts = useMemo(() => (sec && q.trim().length < 2 ? alternativesFor(cat, studio, sec.id, cur?.id ?? null, diet).filter(d => !edition || fitsEdition(d, edition)).slice(0, 12) : []), [cat, studio, at, cur, diet, sec, q, edition])
  const more = sec ? searchMaster({ q, section: sec.id, edition, taken: new Set([...taken, ...alts.map(d => d.id)]), family: studio?.family, limit: q.trim().length >= 2 ? 40 : 30 }) : []
  const row = (d, own) => (
    <li key={d.id}><button type="button" onClick={() => onPick({ id: d.id, name: d.name, diet: d.diet ?? 'veg' })} className="cx-press flex w-full items-center gap-2.5 rounded-[14px] bg-white p-2.5 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-swap-to={d.id}>
      <DietMark d={d.diet} /><span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{d.name}</span>{d.desc && <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{d.desc}</span>}</span>
      {own === false && <span className="shrink-0 rounded-full bg-[#F6F3FA] px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink-2)]">Other style</span>}
    </button></li>
  )
  return (
    <Sheet open={!!(cur || (adding && sec))} onClose={onClose} title={adding && sec ? `Add to ${sectionName(cat, sec.id)}` : cur ? `Instead of ${cur.name}` : ''}>
      <label className="sticky top-0 z-10 mb-2 flex h-11 items-center gap-2 rounded-[14px] bg-[#FAF8FD] px-3 shadow-[inset_0_0_0_1.5px_#E9E3F2] focus-within:shadow-[inset_0_0_0_2px_#7C3AED]">
        <Search size={16} className="shrink-0 text-[var(--ink-3)]" />
        <input value={q} onChange={e => setQ(e.target.value.slice(0, 40))} placeholder="Search 2,500+ dishes" className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold outline-none" data-swap-search />
        {edition && <span className="shrink-0 rounded-full bg-[#E9F8EF] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#0B6B3D]">{({ veg: 'Veg', jain: 'Jain', satvik: 'Satvik', non_veg: 'Any' })[edition]} only</span>}
      </label>
      <ul className="space-y-1.5 pb-2" data-swap-list>
        {cur?.replacesId && cat.dishes[cur.replacesId] && (
          <li><button type="button" onClick={() => onPick({ ...cat.dishes[cur.replacesId], original: true })} className="cx-press flex w-full items-center gap-2.5 rounded-[14px] bg-[#F4EEFF] p-2.5 text-left" data-swap-back>
            <DietMark d={cat.dishes[cur.replacesId].diet} /><span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">Back to {cat.dishes[cur.replacesId].name}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Sambramo’s original</span></span>
          </button></li>
        )}
        {alts.length > 0 && <li className="pt-1 text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">From this style</li>}
        {alts.map(d => row(d, d.own ? undefined : false))}
        {more.length > 0 && <li className="pt-2 text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{q.trim().length >= 2 ? `Matching “${q.trim()}”` : 'From the full Sambramo catalogue'}</li>}
        {more.map(d => row(d))}
        {!alts.length && !more.length && <li className="text-[13px] font-semibold text-[var(--ink-3)]">{q.trim().length >= 2 ? 'No dish by that name — type it as your own under the course.' : 'Loading the catalogue…'}</li>}
      </ul>
    </Sheet>
  )
}

/* The square-and-dot diet mark Indian menus carry. */
function DietMark({ d }) {
  const c = d === 'non_veg' ? '#B42318' : d === 'egg' ? '#B7791F' : '#1B7F4A'
  return <span aria-label={d} className="grid h-3.5 w-3.5 shrink-0 place-items-center border-[1.5px]" style={{ borderColor: c }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /></span>
}
