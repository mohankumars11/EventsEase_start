/**
 * The Menu Studio — /o/:occasionId/menu (Mohan, 2026-11-02: "SAMBRAMO
 * creates the menu. Customers customise it. Eligible partners compete to
 * fulfil it. Partners provide actual prices. Customers compare and book.").
 *
 *   ?s=feast    the event, meal, diet and service — and the cuisines for it
 *   ?s=menus    the curated menus of one cuisine (&f=family)
 *   ?s=menu     one menu, as a menu card (&m=menu)
 *   ?s=edit     the customer's copy: swap any dish (no adding or removing —
 *               the menu stays Sambramo's), allergies, notes, a photo
 *   ?s=review   everything, then "Get catering offers"
 *
 * No partner names and no prices anywhere here: the same menu goes to every
 * caterer who fits, and each replies with their own price (EventBoard).
 * The menu travels as a structured snapshot (lib/menuStudio snapshotFor →
 * canonical_demand.menu) and is kept, versioned, in the database once
 * migration 200 is in (save_customer_menu).
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Camera, Check, ChevronDown, ChevronRight, Loader2, Minus, Plus, Send, Sparkles, TriangleAlert, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { dayLabel, timeLabel } from '../lib/format'
import { quoteLine } from '../lib/booking'
import { poolFor, some, lineOf } from '../lib/liveMatch'
import { asLine } from '../lib/quote'
import { linkBookings } from '../lib/eventPlans'
import { uploadReference } from '../lib/referencePhotos'
import { loadCuisines } from '../lib/needs'
import { supabase } from '../../lib/supabase'
import {
  loadCatalogue, familiesFor, rankMenus, dietAllows, startFrom, dishCount, sectionName, alternativesFor,
  flagsFor, menuFlags, snapshotFor, menuText, saveCustomerMenu, DIETS, MEALS, SERVES, mealFor,
} from '../lib/menuStudio'
import { FOOD_WAYS, RESTAURANT_KITCHEN, foodNeeds, wayOf } from '../data/visualCatalogue'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import SignInSheet from './SignInSheet'

const T = 'catering_food'
/* The partner app's cuisine groups (lib/needs $cuisine), per family. */
const GROUP = { karnataka: 'karnataka', tamil: 'tamil_nadu', andhra: 'andhra_telangana', telangana: 'andhra_telangana', kerala: 'kerala', north_indian: 'north_india', kashmiri: 'north_india',
  gujarati: 'west_india', rajasthani: 'west_india', maharashtrian: 'west_india', bengali: 'east_northeast', odia: 'east_northeast', northeast: 'east_northeast', indian_fusion: 'other_indian' }
const DIET_WORD = { veg: 'Vegetarian', non_veg: 'Non-veg', mixed: 'Veg & non-veg' }
const MEAL_WORD = Object.fromEntries(MEALS.map(m => [m.id, m.label]))

export default function MenuStudio() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [cat, setCat] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { loadCatalogue().then(setCat, () => setFailed(true)) }, [])

  const step = params.get('s') ?? 'feast'
  const go = (s, extra = {}) => setParams({ s, ...extra })
  const ev = plan.event
  const place = plan.place?.lat ? plan.place : savedWhere()
  const needs = o ? plan.needsOf(o.id, T) : {}
  const set = patch => plan.setNeeds(`${o.id}:${T}`, { ...plan.needsOf(o.id, T), ...patch })
  /* The customer's choices, with sensible defaults from the event. */
  const ctx = {
    diet: needs.$studioDiet ?? (needs.$diet?.[0] ?? 'veg'), meal: needs.$meal ?? mealFor(ev.time), serve: needs.$serve ?? null,
    guests: Number(needs.$guests) || Number(ev.guests) || 50, allergies: needs.$allergies ?? '', instructions: needs.$instructions ?? '', refs: needs.$refs ?? [],
    way: wayOf(needs),
  }
  const setDiet = d => set({ $studioDiet: d, $diet: ['veg', 'non_veg', 'mixed', 'vegan', 'jain'].includes(d) ? [d] : [] })
  const setServe = s => { const sv = SERVES.find(x => x.id === s); set({ $serve: s, service_styles: [...new Set([...foodNeeds([ctx.way]).service_styles, ...(sv?.styles ?? [])])] }) }
  const setWay = w => { const n = foodNeeds([w]); set({ $ways: [w], prep_location: n.prep_location, kitchen_type: n.kitchen_type, services: n.services, service_styles: [...new Set([...n.service_styles, ...(SERVES.find(x => x.id === ctx.serve)?.styles ?? [])])] }) }
  const studio = needs.$studio ?? null
  const setStudio = st => set({ $studio: st, $menu: null })

  if (!o) return <Navigate to="/" replace />
  if (failed) return <main className="p-6 text-[14px] font-semibold">The menus could not load. Check your connection and try again.</main>
  if (!cat) return <main className="grid min-h-[100dvh] place-items-center bg-white"><Loader2 className="animate-spin text-[#7C3AED]" /></main>

  const head = { feast: ['Food & feast', o.name], menus: ['Choose a menu', null], menu: ['Menu', null], edit: ['Make it yours', null], review: ['Review your menu', null] }[step] ?? ['Food & feast', o.name]
  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+124px)]" data-menu-studio={step}>
      <BackHeader title={head[0]} sub={head[1]} onBack={() => (step === 'feast' ? navigate(`/o/${o.id}/plan`) : navigate(-1))} />
      {step === 'feast' && <Feast cat={cat} o={o} ev={ev} place={place} ctx={ctx} set={set} setDiet={setDiet} setServe={setServe} setWay={setWay} studio={studio} go={go} />}
      {step === 'menus' && <FamilyMenus cat={cat} o={o} ctx={ctx} family={params.get('f')} go={go} />}
      {step === 'menu' && <MenuDetail cat={cat} o={o} ctx={ctx} menuId={params.get('m')} studio={studio}
        onChoose={m => { setStudio({ ...startFrom(cat, m), clientKey: studio?.clientKey ?? crypto.randomUUID() }); go('edit') }} />}
      {step === 'edit' && (studio ? <Customise cat={cat} o={o} ctx={ctx} set={set} studio={studio} setStudio={setStudio} go={go} /> : <Navigate to={`/o/${o.id}/menu`} replace />)}
      {step === 'review' && (studio ? <Review cat={cat} o={o} ev={ev} place={place} ctx={ctx} studio={studio} setStudio={setStudio} setWay={setWay} plan={plan} user={user} navigate={navigate} /> : <Navigate to={`/o/${o.id}/menu`} replace />)}
    </main>
  )
}

/* ── Screen 1 + 2: the event, then cuisines ───────────────────────────── */
function Feast({ cat, o, ev, place, ctx, set, setDiet, setServe, setWay, studio, go }) {
  const fams = familiesFor(cat, { city: place?.city ?? (place?.area ? 'bengaluru' : '') })
  const hidden = fams.filter(f => !cat.menus.some(m => m.family === f.id && dietAllows(m, ctx.diet)))
  const count = f => cat.menus.filter(m => m.family === f.id && dietAllows(m, ctx.diet)).length
  const city = place?.city ?? (place?.area ? 'bengaluru' : '')
  const top = rankMenus(cat, { occasion: o, diet: ctx.diet, meal: ctx.meal, serve: ctx.serve, city }).slice(0, 6)
  return (
    <div className="px-4">
      <h1 className="cx-display mt-3 text-[27px] text-[#1C1033]">Let’s create a feast everyone will remember!</h1>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[12px] font-bold text-[var(--ink-2)]" data-feast-facts>
        <span className="rounded-full bg-[#F6F3FA] px-2.5 py-1">{o.name}</span>
        {place?.area && <span className="rounded-full bg-[#F6F3FA] px-2.5 py-1">{place.area}</span>}
        {ev.date && <span className="rounded-full bg-[#F6F3FA] px-2.5 py-1">{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</span>}
      </div>

      <Label>How do you want your food?</Label>
      <div className="grid grid-cols-3 gap-2" data-food-way>
        {FOOD_WAYS.map(w => (
          <button key={w.id} type="button" onClick={() => setWay(w.id)} aria-pressed={ctx.way === w.id} data-way={w.id}
            className={'cx-press overflow-hidden rounded-[14px] bg-white text-left ' + (ctx.way === w.id ? 'shadow-[0_0_0_2.5px_#7C3AED]' : 'shadow-[0_0_0_1px_#ECE6F4]')}>
            <span className="relative block aspect-[4/3] bg-[#F3EEF9]">{w.photo && <Photo src={w.photo.url} alt={w.photo.alt} className="absolute inset-0 h-full w-full object-cover" />}
              {ctx.way === w.id && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={13} strokeWidth={3.2} /></span>}</span>
            <span className="block px-1.5 pt-1.5 text-[12px] font-extrabold leading-tight">{w.label}</span>
            <span className="block truncate px-1.5 pb-1.5 text-[10px] font-semibold text-[var(--ink-3)]">{w.line}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-[#FAF8FD] p-3" data-guests>
        <span><span className="block text-[14px] font-extrabold">Guests</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Caterers price for this many</span></span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label="Fewer guests" onClick={() => set({ $guests: Math.max(10, ctx.guests - 10) })} className="cx-press grid h-9 w-9 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_#E4DDF0]"><Minus size={16} /></button>
          <span className="cx-num w-12 text-center text-[18px] font-black">{ctx.guests}</span>
          <button type="button" aria-label="More guests" onClick={() => set({ $guests: ctx.guests + 10 })} className="cx-press grid h-9 w-9 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_#E4DDF0]"><Plus size={16} /></button>
        </span>
      </div>

      <Label>Meal</Label>
      <Pills items={MEALS} value={ctx.meal} onPick={v => set({ $meal: v })} data="meal" />
      <Label>Food preference</Label>
      <Pills items={DIETS} value={ctx.diet} onPick={setDiet} data="diet" />
      {['jain', 'vegan', 'eggless'].includes(ctx.diet) && (
        <p className="mt-2 rounded-[12px] bg-[#FFF7E6] px-3 py-2 text-[11.5px] font-semibold leading-snug text-[#7A4B00]">
          {ctx.diet === 'jain' ? 'Jain: every dish without onion, garlic or root vegetables. We mark the dishes that need a Jain version; each caterer confirms they can.'
            : ctx.diet === 'vegan' ? 'Vegan: no dairy, ghee, honey or egg. We mark dishes usually made with dairy; each caterer confirms a vegan version.'
              : 'Eggless: we mark dishes that contain egg so you can swap them.'}
        </p>
      )}
      <Label>How should it be served?</Label>
      <Pills items={SERVES} value={ctx.serve} onPick={setServe} data="serve" />

      {studio && (
        <button type="button" onClick={() => go('edit')} className="cx-press mt-5 flex w-full items-center gap-3 rounded-[18px] bg-[#F4EEFF] p-3 text-left" data-studio-resume>
          <Check size={18} className="shrink-0 text-[#7C3AED]" />
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold text-[#3B1670]">{studio.name}</span><span className="block text-[11.5px] font-bold text-[#6B4FA0]">Your menu · {dishCount(studio)} dishes · tap to edit</span></span>
          <ChevronRight size={18} className="text-[#7C3AED]" />
        </button>
      )}

      <h2 className="mt-6 text-[17px] font-extrabold">Picked for your {o.name.toLowerCase()}</h2>
      <div className="cx-noscroll -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1" data-top-menus>
        {top.map(m => (
          <button key={m.id} type="button" onClick={() => go('menu', { m: m.id })} className="cx-press w-[208px] shrink-0 overflow-hidden rounded-[18px] bg-white text-left shadow-[0_0_0_1px_#ECE6F4]" data-top-menu={m.id}>
            <MenuPhoto m={m} className="aspect-[16/10]" />
            <span className="block truncate px-3 pt-2 text-[13.5px] font-extrabold">{m.name}</span>
            <span className="block truncate px-3 pb-2.5 text-[11.5px] font-semibold text-[var(--ink-3)]">{cat.families.find(f => f.id === m.family)?.name} · {DIET_WORD[m.diet]}</span>
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-[17px] font-extrabold">Choose your cuisine</h2>
      <p className="text-[12px] font-semibold text-[var(--ink-3)]">{cat.families.length} cuisines · {cat.menus.length} menus by Sambramo</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5" data-cuisines>
        {fams.filter(f => !hidden.includes(f)).map(f => {
          const n = count(f)
          const ph = cat.familyPhotos[f.id]
          return (
            <button key={f.id} type="button" disabled={!n} onClick={() => go('menus', { f: f.id })} data-family={f.id}
              className={'cx-press overflow-hidden rounded-[18px] bg-white text-left shadow-[0_0_0_1px_#ECE6F4] ' + (n ? '' : 'opacity-45')}>
              <span className="relative block aspect-[4/3] bg-[#F3EEF9]">
                {ph && <Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-[#3B1670]">{n ? `${n} menus` : 'None for this diet'}</span>
              </span>
              <span className="block truncate px-2.5 pt-2 text-[13.5px] font-extrabold">{f.name}</span>
              <span className="line-clamp-2 block px-2.5 pb-2.5 text-[11px] font-semibold leading-snug text-[var(--ink-3)]">{f.line}</span>
            </button>
          )
        })}
      </div>
      {hidden.length > 0 && <p className="mt-3 text-[11.5px] font-semibold text-[var(--ink-3)]">No {DIETS.find(d => d.id === ctx.diet)?.label.toLowerCase()} menus yet in {hidden.map(f => f.name).join(', ')}.</p>}
      <p className="mt-2 text-[10.5px] font-semibold text-[var(--ink-3)]">Photos are inspiration (Pexels) — not any caterer’s own food.</p>
    </div>
  )
}

/* ── Screen 3: the menus of one cuisine ───────────────────────────────── */
function FamilyMenus({ cat, o, ctx, family, go }) {
  const f = cat.families.find(x => x.id === family)
  if (!f) return <Navigate to={`/o/${o.id}/menu`} replace />
  const list = rankMenus(cat, { occasion: o, diet: ctx.diet, meal: ctx.meal, serve: ctx.serve, family })
  return (
    <div className="px-4">
      <h1 className="cx-display mt-3 text-[26px]">{f.name}</h1>
      <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">{f.region}</p>
      {!list.length && <p className="mt-4 rounded-[16px] bg-[#FAF8FD] p-4 text-[13px] font-semibold">No {DIET_WORD[ctx.diet]?.toLowerCase() ?? ''} menus in {f.name} yet. Change your food preference or pick another cuisine.</p>}
      <div className="mt-4 space-y-3" data-menus>
        {list.map(m => {
          const all = m.sections.flatMap(s => s.dishes)
          return (
            <button key={m.id} type="button" onClick={() => go('menu', { m: m.id })} className="cx-press block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-[0_0_0_1px_#ECE6F4]" data-menu={m.id}>
              <MenuPhoto m={m} className="aspect-[16/8]" />
              <span className="block px-4 pt-3">
                <span className="flex items-center gap-2"><DietMark d={m.diet === 'veg' ? 'veg' : 'non_veg'} /><span className="truncate text-[16px] font-extrabold">{m.name}</span></span>
                <span className="mt-0.5 block text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{m.line}</span>
                <span className="mt-1.5 block text-[11.5px] font-bold text-[#6B4FA0]">{DIET_WORD[m.diet]} · {m.meals.map(x => MEAL_WORD[x]).join(', ')} · {all.length} dishes</span>
              </span>
              <ol className="mt-2 border-t border-[#F3EFF8] px-4 py-2.5 text-[12px] font-semibold text-[var(--ink-2)]">
                {all.slice(0, 5).map((id, i) => <li key={id} className="truncate"><span className="mr-1.5 text-[#B08A3E]">{i + 1}.</span>{cat.dishes[id]?.name}</li>)}
                {all.length > 5 && <li className="text-[#7C3AED]">+ {all.length - 5} more</li>}
              </ol>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Screen 4: one menu, as a menu card ───────────────────────────────── */
function MenuDetail({ cat, o, ctx, menuId, studio, onChoose }) {
  const m = cat.menus.find(x => x.id === menuId)
  if (!m) return <Navigate to={`/o/${o.id}/menu`} replace />
  const sections = m.sections.map(s => ({ id: s.id, items: s.dishes.map(id => ({ id, ...cat.dishes[id] })) }))
  return (
    <>
      <div className="px-4">
        <MenuPhoto m={m} className="mt-2 aspect-[16/9] rounded-[20px]" />
        <MenuCard cat={cat} o={o} title={m.name} family={m.family} diet={m.diet} serve={ctx.serve} meal={ctx.meal} guests={ctx.guests} sections={sections} customerDiet={ctx.diet} allergies={ctx.allergies} />
      </div>
      <ActionBar note="Sambramo’s menu — every caterer who fits quotes their own price for it">
        <button type="button" onClick={() => onChoose(m)} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-choose-menu>
          {studio?.templateId === m.id ? 'Edit this menu' : 'Choose this menu'}
        </button>
      </ActionBar>
    </>
  )
}

/**
 * The menu card: cream paper, a gold rule, numbered dishes section by
 * section — the language of a caterer's menu poster, without a logo or a
 * price (the reference posters Mohan sent, not copied).
 */
function MenuCard({ cat, o, title, family, diet, serve, meal, guests, sections, customerDiet, allergies, compact = false }) {
  const [shut, setShut] = useState({})
  const fam = cat.families.find(f => f.id === family)
  /* Numbered straight through, like a printed menu — even with a section folded. */
  const shown = sections.filter(s => s.items.length)
  const start = shown.map((s, i) => shown.slice(0, i).reduce((t, x) => t + x.items.length, 0))
  return (
    <article className="relative mt-3 overflow-hidden rounded-[22px] bg-[#FFFCF5] shadow-[0_0_0_1px_#EDE2CB,0_10px_30px_-18px_rgba(76,29,149,.35)]" data-menu-card>
      <header className="px-5 pb-3 pt-5 text-center">
        <Rule />
        <p className="mt-2 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-[#9A7637]">Menu for your {o.name}</p>
        <h2 className="cx-display mt-1 text-[24px] leading-tight text-[#2A124F]">{title}</h2>
        <p className="mt-1 text-[12px] font-bold text-[#6E5A36]">{[fam?.name, DIET_WORD[diet], MEAL_WORD[meal], SERVES.find(s => s.id === serve)?.label, guests ? `${guests} guests` : null].filter(Boolean).join(' · ')}</p>
        <Rule />
      </header>
      <div className="px-4 pb-4">
        {shown.map((s, si) => {
          const open = !shut[s.id]
          return (
            <section key={s.id} className="mt-2.5" data-card-section={s.id}>
              <button type="button" onClick={() => setShut(x => ({ ...x, [s.id]: open }))} className="flex w-full items-center justify-between rounded-full bg-[#3B1670] px-3.5 py-1.5 text-left text-white">
                <span className="text-[11.5px] font-extrabold uppercase tracking-[0.14em]">{sectionName(cat, s.id)}</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-white/75">{s.items.length}<ChevronDown size={14} className={open ? '' : '-rotate-90'} /></span>
              </button>
              {open && (
                <ol className="mt-1.5 space-y-1.5">
                  {s.items.map((d, di) => {
                    const n = start[si] + di + 1
                    const flags = d.typed ? [] : flagsFor(cat.dishes[d.id], customerDiet, allergies)
                    return (
                      <li key={d.id ?? d.name} className="flex items-start gap-2.5 px-1" data-card-dish={d.id}>
                        <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#2A124F] text-[10.5px] font-black text-[#F4D99A]">{n}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5"><span className="text-[14px] font-extrabold leading-tight text-[#1C1033]">{d.name}</span><DietMark d={d.diet} /></span>
                          {!compact && d.desc && <span className="block text-[11.5px] font-semibold leading-snug text-[#6E5A36]">{d.desc}</span>}
                          {flags.map(f => <span key={f} className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#9A5B00]"><TriangleAlert size={11} />{f}</span>)}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
        <p className="mt-4 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#9A7637]">A Sambramo menu · caterers quote their own price</p>
      </div>
    </article>
  )
}

/* ── Screen 5: make it yours ─────────────────────────────────────────── */
function Customise({ cat, o, ctx, set, studio, setStudio, go }) {
  const [swap, setSwap] = useState(null)      // { section, index }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const edit = fn => setStudio({ ...studio, sections: fn(studio.sections.map(s => ({ ...s, items: [...s.items] }))) })
  const flags = menuFlags(cat, studio, ctx.diet, ctx.allergies)
  async function addPhoto(file) {
    if (!file) return
    setBusy(true); setErr('')
    try { const url = await uploadReference(file); set({ $refs: [...ctx.refs, url].slice(-3) }) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <>
      <div className="px-4">
        <h1 className="cx-display mt-3 text-[24px]">{studio.name}</h1>
        <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">{dishCount(studio)} dishes, made by Sambramo · tap Swap on any dish you’d like changed</p>
        {ctx.diet === 'jain' && <p className="mt-2 rounded-[12px] bg-[#FFF7E6] px-3 py-2 text-[11.5px] font-bold text-[#7A4B00]" data-diet-review>Your caterer cooks every dish Jain-style — no onion or garlic. {flags.length ? `${flags.length} ${flags.length === 1 ? 'dish is' : 'dishes are'} made with roots, onion or garlic — marked below; swap them.` : ''}</p>}
        {ctx.diet !== 'jain' && flags.length > 0 && <p className="mt-2 rounded-[12px] bg-[#FFF7E6] px-3 py-2 text-[11.5px] font-bold text-[#7A4B00]" data-diet-review>{flags.length} {flags.length === 1 ? 'dish needs' : 'dishes need'} a change for your diet — marked below. Swap them, or leave it to the caterer to confirm.</p>}
        <div className="mt-3 space-y-4" data-edit-sections>
          {studio.sections.map((s, si) => (
            <section key={s.id} data-edit-section={s.id}>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6B4FA0]">{sectionName(cat, s.id)}</h3>
              <ul className="mt-1.5 overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_#ECE6F4]">
                {s.items.map((d, i) => {
                  const f = d.typed ? [] : flagsFor(cat.dishes[d.id], ctx.diet, ctx.allergies)
                  return (
                    <li key={(d.id ?? d.name) + i} className="flex items-center gap-2 border-b border-[#F5F2F9] px-3 py-2.5 last:border-0" data-edit-dish={d.id ?? 'typed'}>
                      <DietMark d={d.diet} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold">{d.name}</span>
                        {d.replaces && <span className="block truncate text-[11px] font-bold text-[#0B6B3D]">Instead of {d.replaces}</span>}
                        {d.typed && <span className="block text-[11px] font-bold text-[#6B4FA0]">Your own dish</span>}
                        {f.map(x => <span key={x} className="block truncate text-[11px] font-bold text-[#9A5B00]">{x}</span>)}
                      </span>
                      {!d.typed && <button type="button" onClick={() => setSwap({ si, i })} className="cx-press flex h-8 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-swap><ArrowLeftRight size={13} />Swap</button>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <Label>Allergies or things to avoid</Label>
        <input value={ctx.allergies} onChange={e => set({ $allergies: e.target.value.slice(0, 300) })} placeholder="e.g. no peanuts, one guest is lactose intolerant"
          className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-allergies />
        <Label>Anything else for the caterer?</Label>
        <textarea rows={3} value={ctx.instructions} onChange={e => set({ $instructions: e.target.value.slice(0, 1000) })} placeholder="Less spicy for the kids, sweets served first, a separate Jain counter…"
          className="w-full rounded-[14px] bg-white p-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-instructions />
        <Label>A photo of what you want <span className="font-semibold text-[var(--ink-3)]">(optional)</span></Label>
        <div className="flex flex-wrap gap-2" data-menu-refs>
          {ctx.refs.map(u => (
            <span key={u} className="relative h-16 w-16 overflow-hidden rounded-[12px] bg-[#F3EEF9]"><img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => set({ $refs: ctx.refs.filter(x => x !== u) })} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"><X size={11} /></button>
            </span>
          ))}
          {ctx.refs.length < 3 && (
            <label className="cx-press grid h-16 w-16 cursor-pointer place-items-center rounded-[12px] bg-[#F6F3FA] text-[#6B4FA0]">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              <input type="file" accept="image/*" className="hidden" onChange={e => addPhoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
        {err && <p className="mt-1.5 text-[12px] font-bold text-[#B42318]">{err}</p>}
      </div>
      <ActionBar>
        <button type="button" disabled={!dishCount(studio)} onClick={() => go('review')} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold disabled:opacity-50" data-to-review>Review my menu</button>
      </ActionBar>
      <SwapSheet cat={cat} ctx={ctx} studio={studio} at={swap} onClose={() => setSwap(null)}
        onPick={d => { edit(ss => { const cur = ss[swap.si].items[swap.i]; ss[swap.si].items[swap.i] = d.original ? { id: d.id, name: d.name, diet: d.diet } : { id: d.id, name: d.name, diet: d.diet, replaces: cur.replaces ?? cur.name, replacesId: cur.replacesId ?? cur.id }; return ss }); setSwap(null) }} />
    </>
  )
}

function SwapSheet({ cat, ctx, studio, at, onClose, onPick }) {
  const cur = at ? studio.sections[at.si]?.items[at.i] : null
  const alts = useMemo(() => (cur ? alternativesFor(cat, studio, studio.sections[at.si].id, cur.id, ctx.diet) : []), [cat, studio, at, cur, ctx.diet])
  return (
    <Sheet open={!!cur} onClose={onClose} title={cur ? `Instead of ${cur.name}` : ''}>
      <ul className="space-y-1.5 pb-2" data-swap-list>
        {cur?.replacesId && cat.dishes[cur.replacesId] && (
          <li>
            <button type="button" onClick={() => onPick({ ...cat.dishes[cur.replacesId], original: true })} className="cx-press flex w-full items-center gap-2.5 rounded-[14px] bg-[#F4EEFF] p-2.5 text-left" data-swap-back>
              <DietMark d={cat.dishes[cur.replacesId].diet} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">Back to {cat.dishes[cur.replacesId].name}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Sambramo’s original</span></span>
            </button>
          </li>
        )}
        {alts.map(d => (
          <li key={d.id}>
            <button type="button" onClick={() => onPick(d)} className="cx-press flex w-full items-center gap-2.5 rounded-[14px] bg-white p-2.5 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]" data-swap-to={d.id}>
              <DietMark d={d.diet} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{d.name}</span>{d.desc && <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{d.desc}</span>}</span>
              {!d.own && <span className="shrink-0 rounded-full bg-[#F6F3FA] px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink-2)]">Other cuisine</span>}
            </button>
          </li>
        ))}
        {!alts.length && <li className="text-[13px] font-semibold text-[var(--ink-3)]">No other dish for this course yet — add a note for the caterer below.</li>}
      </ul>
    </Sheet>
  )
}

/* ── Screen 6: review, then send ─────────────────────────────────────── */
function Review({ cat, o, ev, place, ctx, studio, setStudio, setWay, plan, user, navigate }) {
  const noun = FOOD_WAYS.find(w => w.id === ctx.way)?.noun ?? 'caterer'
  const [phase, setPhase] = useState('idle')   // idle | finding | confirm | sending | error
  const [found, setFound] = useState(null)
  const [msg, setMsg] = useState('')
  const [signIn, setSignIn] = useState(false)
  const fam = cat.families.find(f => f.id === studio.family)
  const sections = studio.sections.map(s => ({ id: s.id, items: s.items.map(i => ({ ...cat.dishes[i.id], ...i })) }))
  const venue = { address: place?.address || `${place?.area ?? ''}, Bengaluru`, area: place?.area ?? null, city: 'Bengaluru' }
  const needs = { ...plan.needsOf(o.id, T), $cuisine: GROUP[studio.family] ? [GROUP[studio.family]] : [] }
  const ready = ev.date && place?.lat

  async function find() {
    if (!user) { setSignIn(true); return }
    setPhase('finding'); setMsg('')
    await loadCuisines(supabase).catch(() => {})
    let r = await poolFor(T, { event: ev, place, needs, seed: o.id })
    /* A restaurant order goes to restaurants only — never to caterers
       dressed up as the closest match. */
    if (ctx.way === 'restaurant') {
      const pool = r.pool.filter(p => [].concat(p.facets?.kitchen_type ?? []).includes(RESTAURANT_KITCHEN))
      r = { ...r, pool, exact: r.exact && pool.length > 0 }
    }
    setFound(r)
    setPhase(r.pool.length ? 'confirm' : 'error')
    if (!r.pool.length) setMsg(ctx.way === 'restaurant' ? 'No restaurant near your venue takes event orders on Sambramo yet.' : `No ${noun} near your venue can take this yet. Try another cuisine, or ask us — we’ll find one.`)
  }
  async function send() {
    setPhase('sending')
    const group = crypto.randomUUID()
    const base = { occasionId: o.id, date: ev.date, guests: ctx.guests, location: { area: place?.area ?? null, lat: place?.lat ?? null, lng: place?.lng ?? null },
      diet: ctx.diet, meal: ctx.meal, serve: ctx.serve, allergies: ctx.allergies, instructions: ctx.instructions, refs: ctx.refs, group, status: 'sent' }
    const saved = await saveCustomerMenu(studio, base)
    const menu = snapshotFor(cat, studio, { ...base, ...(saved ?? {}) })
    const note = [`Menu: ${menuText(cat, studio)}`, ctx.instructions && `Note: ${ctx.instructions}`].filter(Boolean).join(' · ').slice(0, 2000)
    /* The ten best who fit; the server re-checks each one's calendar. */
    const lines = found.pool.slice(0, 10).map(p => lineOf(asLine(p), o.id))
    const sent = await some(lines.map(l => () => quoteLine(l, ev, place, { note, venue, group, menu }).catch(e => ({ path: 'ERROR', reasons_text: [e.message] }))), 4)
    const results = lines.map((l, k) => ({ key: `${l.key}:${l.serviceId}`, tradeId: T, serviceId: l.serviceId, name: l.name, cover: l.cover, occasionId: o.id,
      path: sent[k]?.path ?? 'ERROR', lineId: null, quoteRequestId: sent[k]?.quoteRequestId ?? null, bookingRequestId: sent[k]?.bookingRequestId ?? null, reasons: sent[k]?.reasons_text ?? [], at: Date.now() }))
    const ok = results.filter(x => x.quoteRequestId)
    plan.recordBookings(results)
    linkBookings(user.id, results).catch(() => {})
    plan.setPick(o.id, T, 'need')
    setStudio({ ...studio, menuId: saved?.menuId ?? studio.menuId ?? null, sentAt: Date.now(), group })
    if (!ok.length) { setPhase('error'); setMsg(results[0]?.reasons?.[0] ?? 'Your menu could not be sent. Try again in a moment.'); return }
    navigate(`/o/${o.id}/board`)
  }

  return (
    <>
      <div className="px-4">
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]" data-review-facts>
          {[['Cuisine', fam?.name], ['Guests', ctx.guests], ['When', ev.date ? `${dayLabel(ev.date)}${ev.time ? ` · ${timeLabel(ev.time)}` : ''}` : 'Add a date'], ['Where', place?.area ?? 'Add a place'],
            ['Food', DIETS.find(d => d.id === ctx.diet)?.label], ['Served', SERVES.find(s => s.id === ctx.serve)?.label ?? 'Caterer suggests']].map(([k, v]) => (
            <div key={k} className="rounded-[14px] bg-[#FAF8FD] px-3 py-2"><dt className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{k}</dt><dd className="truncate font-extrabold">{v}</dd></div>
          ))}
        </dl>
        <MenuCard cat={cat} o={o} title={studio.name} family={studio.family} diet={studio.menuDiet} serve={ctx.serve} meal={ctx.meal} guests={ctx.guests} sections={sections} customerDiet={ctx.diet} allergies={ctx.allergies} compact />
        {(ctx.allergies || ctx.instructions || ctx.refs.length > 0) && (
          <div className="mt-3 space-y-1 rounded-[16px] bg-[#FAF8FD] p-3 text-[12.5px] font-semibold" data-review-notes>
            {ctx.allergies && <p><b>Avoid:</b> {ctx.allergies}</p>}
            {ctx.instructions && <p><b>Note:</b> {ctx.instructions}</p>}
            {ctx.refs.length > 0 && <p><b>Photos:</b> {ctx.refs.length} attached</p>}
          </div>
        )}
        {phase === 'confirm' && found && (
          <div className="mt-3 rounded-[18px] bg-[#F4EEFF] p-3.5" data-offer-confirm>
            <p className="text-[14px] font-extrabold text-[#3B1670]"><Sparkles size={15} className="mr-1 inline" />{Math.min(10, found.pool.length)} {noun}{found.pool.length === 1 ? '' : 's'} can be asked</p>
            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-[#5B3E8E]">
              {found.exact ? `They cook ${fam?.name ?? 'this'} food and serve the way you asked.` : `None near you matches every detail — cuisine, diet or service — so these are the closest. They can accept, suggest changes or decline.`}
              {' '}Each replies with their own price for exactly this menu.
            </p>
          </div>
        )}
        {msg && <p className="mt-3 rounded-[14px] bg-[#FFF1F0] px-3 py-2.5 text-[12.5px] font-bold text-[#B42318]" data-offer-error>{msg}</p>}
        {msg && ctx.way === 'restaurant' && <button type="button" onClick={() => { setWay('caterer'); setMsg(''); setPhase('idle') }} className="mt-2 h-10 w-full rounded-[14px] bg-[#F4EEFF] text-[13px] font-extrabold text-[#4C1D95]" data-way-fallback>Hire a caterer instead</button>}
        {!ready && <p className="mt-3 rounded-[14px] bg-[#FFF7E6] px-3 py-2.5 text-[12.5px] font-bold text-[#7A4B00]">Add your event’s date and place first — caterers need both to say yes.</p>}
      </div>
      <ActionBar note={phase === 'confirm' ? 'Your number stays private until you book' : `No price until ${noun}s reply — you compare and choose`}>
        {phase === 'confirm' ? (
          <button type="button" onClick={send} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-send-menu><Send size={17} />Send my menu</button>
        ) : (
          <div className="grid gap-1.5">
            <button type="button" disabled={!ready || ['finding', 'sending'].includes(phase)} onClick={find} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold disabled:opacity-50" data-get-offers>
              {['finding', 'sending'].includes(phase) ? <Loader2 size={18} className="animate-spin" /> : null}{ctx.way === 'restaurant' ? 'Get restaurant offers' : ctx.way === 'cook' ? 'Get offers from cooks' : 'Get catering offers'}
            </button>
            <button type="button" onClick={() => { plan.setPick(o.id, T, 'need'); navigate(`/o/${o.id}/plan`) }} className="h-10 rounded-[14px] text-[13px] font-extrabold text-[#4C1D95]" data-save-to-plan>Save to my plan and send later</button>
          </div>
        )}
      </ActionBar>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false) }} why="to get catering offers" />
    </>
  )
}

/* ── small parts ─────────────────────────────────────────────────────── */
function Label({ children }) { return <p className="mb-1.5 mt-4 text-[13px] font-extrabold">{children}</p> }
function Pills({ items, value, onPick, data }) {
  return (
    <div className="flex flex-wrap gap-1.5" data-pills={data}>
      {items.map(x => (
        <button key={x.id} type="button" onClick={() => onPick(value === x.id ? null : x.id)} aria-pressed={value === x.id} data-pill={x.id}
          className={'cx-press rounded-full px-3.5 py-2 text-[12.5px] font-bold ' + (value === x.id ? 'bg-[#1C1033] text-white' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>{x.label}</button>
      ))}
    </div>
  )
}
/* India's veg / non-veg mark: a square with a dot (veg, green), a triangle (non-veg, brown), egg amber. */
function DietMark({ d }) {
  if (!d) return null
  const c = d === 'veg' ? '#118C4F' : d === 'egg' ? '#C77700' : '#8B2E1A'
  return (
    <span className="grid h-[13px] w-[13px] shrink-0 place-items-center rounded-[2px]" style={{ boxShadow: `inset 0 0 0 1.5px ${c}` }} title={d === 'veg' ? 'Vegetarian' : d === 'egg' ? 'Contains egg' : 'Non-vegetarian'} data-diet-mark={d}>
      {d === 'non_veg' ? <span style={{ width: 0, height: 0, borderLeft: '3.5px solid transparent', borderRight: '3.5px solid transparent', borderBottom: `6px solid ${c}` }} /> : <span className="h-[5px] w-[5px] rounded-full" style={{ background: c }} />}
    </span>
  )
}
function Rule() {
  return <span className="mx-auto flex max-w-[220px] items-center gap-2" aria-hidden><span className="h-px flex-1 bg-[#D8BE84]" /><span className="h-1.5 w-1.5 rotate-45 bg-[#C9A35A]" /><span className="h-px flex-1 bg-[#D8BE84]" /></span>
}
function MenuPhoto({ m, className = '' }) {
  if (!m.photo) return (
    <span className={'relative grid place-items-center overflow-hidden bg-[#FFFCF5] ' + className} data-menu-photo="none">
      <span className="px-4 text-center"><Rule /><span className="cx-display mt-1.5 block text-[16px] leading-tight text-[#2A124F]">{m.name}</span><Rule /></span>
    </span>
  )
  return (
    <span className={'relative block overflow-hidden bg-[#F3EEF9] ' + className} data-menu-photo>
      <Photo src={m.photo.url} alt={m.photo.alt} className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[9.5px] font-bold text-white/90 backdrop-blur">Inspiration</span>
    </span>
  )
}
