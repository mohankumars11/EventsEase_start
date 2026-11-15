/**
 * Choosing what a requirement should be — the questions behind each
 * service on the plan (food style, décor theme, cake, photo hours, the
 * partner app's own trade questions, a reference photo).
 *
 * Lifted out of screens/EventPlan.jsx on 2026-11-10 so it can live on
 * its own step: Mohan wants the plan to be the plan, and preferences to
 * be the NEXT screen (screens/Preferences.jsx), "not clicking on the
 * photography to customise it". ChoosePanel is the panel itself;
 * ChooseSheet keeps the old sheet around it for anywhere that still
 * wants one. Every pick is an icon tile now — no radio circles, no grey
 * chips (ui/choiceTiles.jsx).
 */
import { useState } from 'react'
import { isWedding, isCorp, isCampus, isPublic, isBaby, isKids, isSchool } from '../data/occasionProfile'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, Plus, X } from 'lucide-react'
import TierCards from './TierCards'
import { serviceArt } from '../data/art'
import { copyFor } from '../data/requirementCopy'
import { photoFor } from '../data/requirementPhotos.generated'
import { wayOf, themesFor, CAKES, DECOR_THEMES, COLOURS, FONTS, FOOD_WAYS, foodNeeds, COOK_TEAM, INGREDIENTS, DRINKS, DECOR_ELEMENTS, CAKE_OPTIONS, PHOTO_HOURS, PHOTO_EXTRAS, ENTERTAINERS, designFamilies } from '../data/visualCatalogue'
import { SERVE } from '../lib/sambramoMenu'
import { needsFor as tradeQuestions, experienceTiers } from '../lib/needs'
import { hoursOf } from '../lib/experience'
import { requiredFor } from '../data/requiredAnswers'
import { uploadReference } from '../lib/referencePhotos'
import { Question } from '../screens/Brief'
import { Photo, Sheet } from './kit'
import { ArtFill } from './art'
import { IconTiles } from './choiceTiles'

/* The photograph for a requirement — Pexels inspiration, labelled — else the service art. */
export function Thumb({ o, t, className = '', tag = false }) {
  const ph = photoFor(o.template, t)
  if (!ph) return <ArtFill art={serviceArt(t)} tone="#F6F1FF" className={className} inset="10%" />
  return (
    <span className={'relative block overflow-hidden bg-[#F3EEF9] ' + className}>
      <Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" />
      {tag && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white/90">Inspiration</span>}
    </span>
  )
}

export function Section({ title, sub = null, children }) {
  return (
    <section>
      <p className="text-[15px] font-black tracking-[-0.02em]">{title}</p>
      {sub && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/*
 * What to choose for one requirement. Food: how it is arranged (mapped to
 * the catering partners' own answers), diet and cuisine (the partner app's
 * questions), then real menu cards. Décor: themes, colours, the name board
 * and its lettering. Cake: designs, the partner's cake questions, the
 * words on it. Photos: style, and video on the same card. Everything else:
 * that trade's partner-app questions. Choosing anything adds it to the plan.
 */
export function ChoosePanel({ o, t, plan, why = null, video = false, onVideo = () => {}, ensure = () => {}, onClose = () => {} }) {
  const c = t ? copyFor(o, t) : null
  const ph = t ? photoFor(o.template, t) : null
  const cur = t ? plan.needsOf(o.id, t) : {}
  const set = patch => { plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), ...patch }); ensure() }
  const all = t ? tradeQuestions(t) : []
  const q = key => all.find(x => x.key === key)
  /* The experience (migration 208). A package experience has a floor of
     hours: choosing it lifts the customer's hours to that floor and never
     lowers them; clearing it leaves their own hours exactly as they were. */
  const tiers = t ? experienceTiers(t) : []
  const chosenExp = tiers.find(x => x.tier === cur.$tier) ?? null
  const pickExperience = x => {
    if (!x) { set({ $tier: null }); return }
    const patch = { $tier: x.tier }
    if (x.model === 'PARTNER_PACKAGE' && x.min_hours && (hoursOf(cur.$hours) ?? 0) < Number(x.min_hours)) patch.$hours = Number(x.min_hours)
    set(patch)
  }
  /* Required answers first (data/requiredAnswers.js — what a master cannot
     quote without), so the "first few questions" cut below can never hide
     one. A requirement missing one cannot be sent (migration 203). */
  const must = t ? requiredFor(t) : []
  const restAll = all.filter(x => x.group === 'choose' && x.kind !== 'dishes' && !['$diet', '$cuisine', '$years', 'service_styles', 'prep_location'].includes(x.key))
  const rest = [...restAll.filter(x => must.includes(x.key)), ...restAll.filter(x => !must.includes(x.key))]
  /* A partner's option list covers every occasion; offer only what can
     apply to this one — no "Wedding cake" for a first birthday. */
  const fits = label => {
    const l = String(label).toLowerCase()
    if (!isWedding(o) && /wedding|bridal|bride|groom|haldi|mehendi|sangeet|engagement|pre-wedding|trousseau|mandap|baraat/.test(l)) return false
    if (!isCorp(o) && !isCampus(o) && !isPublic(o) && /corporate|product|conference|fashion|registration/.test(l)) return false
    if (!isBaby(o) && /maternity|newborn|naming|seemantha|annaprashana|baby shower|cradle/.test(l)) return false
    if (!isKids(o) && !isSchool(o) && !isBaby(o) && /kids|puppet|children/.test(l)) return false
    return true
  }
  const ask = (x, i) => x && <Question key={x.key ?? i} q={{ ...x, options: (x.options ?? []).filter(op => fits(op.label ?? op)) }} value={cur[x.key] ?? []} onChange={v => set({ [x.key]: v })} occasion={o} typed={cur[x.key + '__typed'] ?? []} onTyped={v => set({ [x.key + '__typed']: v })} />

  if (!t) return null
  return (
        <div className="space-y-5 pb-2" data-edit={t}>
          {ph && !['decoration_floral', 'cake_desserts'].includes(t) && (
            <figure>
              <span className="relative block aspect-[16/8] overflow-hidden rounded-[18px] bg-[#F3EEF9]"><Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" /></span>
              <figcaption className="pt-1 text-[10.5px] font-semibold text-[var(--ink-3)]">Inspiration · {ph.credit}</figcaption>
            </figure>
          )}
          <p className="text-[13px] font-semibold leading-snug text-[var(--ink-2)]">{why ? `${why}. ` : ''}{c.line}.</p>

          {tiers.length > 0 && (
            <Section title="Choose the experience"
              sub={chosenExp?.model === 'VISUAL_SPECIFICATION' ? 'Your decorator quotes for exactly this.' : 'Checked against each professional’s real package — never just its name.'}>
              <ExperiencePicker tiers={tiers} value={cur.$tier ?? null} onPick={pickExperience} />
            </Section>
          )}

          {t === 'catering_food' && (
            <>
              <Section title="How do you want your food?">
                <PhotoMulti items={FOOD_WAYS} value={[wayOf(cur)]} data="food-ways"
                  onChange={v => { const ways = v.slice(-1).length ? v.slice(-1) : [wayOf(cur)]; const n = foodNeeds(ways); set({ $ways: ways, prep_location: n.prep_location, kitchen_type: n.kitchen_type, services: n.services, service_styles: [...new Set([...n.service_styles, ...(SERVE.find(x => x.id === cur.$serve)?.styles ?? [])])] }) }} />
              </Section>
              {(cur.$ways ?? []).includes('cook') && (
                <Section title="Cooking at your place">
                  <OneChips items={COOK_TEAM} value={cur.$cookTeam ?? null} onPick={v => set({ $cookTeam: v })} data="cook-team" />
                  <div className="mt-2"><OneChips items={INGREDIENTS} value={cur.$ingredients ?? null} onPick={v => set({ $ingredients: v })} data="ingredients" /></div>
                </Section>
              )}
              <input value={cur.$customWay ?? ''} onChange={e => set({ $customWay: e.target.value.slice(0, 80) })} placeholder="Something else? Tell us how you’d like it"
                className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-custom-way />
              <StudioEntry o={o} cur={cur} onClose={onClose} />
              <Section title="Drinks">
                <ManyChips items={DRINKS} value={cur.$drinks ?? []} onChange={v => set({ $drinks: v })} data="drinks" />
              </Section>
              <button type="button" role="switch" aria-checked={!!cur.$staff} onClick={() => set({ $staff: !cur.$staff })} data-staff-toggle
                className="cx-press flex w-full items-center justify-between rounded-[16px] bg-white p-3 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]">
                <span><span className="block text-[14px] font-extrabold">Serving staff</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">People to serve and clear</span></span>
                <span className={'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ' + (cur.$staff ? 'bg-[#7C3AED]' : 'bg-[#E4DDF0]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (cur.$staff ? 'right-[3px]' : 'left-[3px]')} /></span>
              </button>
            </>
          )}

          {t === 'decoration_floral' && (
            <>
              {/* Hand-picked photographs only. A stock-search décor wall was
                  tried and measured on 2 Nov: for a first birthday it filled
                  with neon signs, tarot cards and lounges — real designs come
                  from decorators' own work, with their reply. */}
              <Section title="Pick a theme" sub="Inspiration photographs — your decorator recreates the look">
                <PhotoMulti items={themesFor(o).filter(x => x.photo)} value={cur.$themePicks ?? (cur.$theme ? [cur.$theme] : [])} data="themes"
                  onChange={v => set({ $themePicks: v.slice(-2), $theme: v[v.length - 1] ?? null })} />
              </Section>
              <Section title="Or name the theme" sub="Pick up to 3">
                <ThemeWords families={designFamilies(o)} value={cur.$themes ?? []} onChange={v => set({ $themes: v })} />
              </Section>
              <p className="-mt-2 text-[11.5px] font-semibold text-[var(--ink-3)]" data-decor-portfolio-note>Decorators send photos of their own work when they reply. Have a look in mind? Add your photo below.</p>
              <Section title="What should it include?">
                <ManyChips items={DECOR_ELEMENTS} value={cur.$elements ?? []} onChange={v => set({ $elements: v })} data="elements" />
              </Section>
              <Section title="Colours">
                <div className="flex flex-wrap gap-2" data-colours>
                  {COLOURS.map(col => {
                    const sel = (cur.$colours ?? []).includes(col.id)
                    return (
                      <button key={col.id} type="button" aria-pressed={sel} data-colour={col.id}
                        onClick={() => set({ $colours: sel ? cur.$colours.filter(x => x !== col.id) : [...(cur.$colours ?? []), col.id].slice(-2) })}
                        className={'cx-press flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12.5px] font-bold ' + (sel ? 'bg-[#F1E9FF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
                        <span className="flex -space-x-1">{col.swatch.map(s => <span key={s} className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: s, boxShadow: 'inset 0 0 0 1px rgba(28,16,51,.18)' }} />)}</span>{col.label}
                      </button>
                    )
                  })}
                </div>
              </Section>
              <Section title="Name on the backdrop" sub="Optional">
                <input value={cur.$nameText ?? ''} onChange={e => set({ $nameText: e.target.value.slice(0, 40) })} placeholder="e.g. Aarav turns 1"
                  className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-name-text />
                <div className="mt-2 grid grid-cols-2 gap-2" data-fonts>
                  {FONTS.map(f => (
                    <button key={f.id} type="button" onClick={() => set({ $font: f.id })} aria-pressed={cur.$font === f.id} data-font={f.id}
                      className={'cx-press truncate rounded-[14px] px-3 py-2.5 text-center ' + (cur.$font === f.id ? 'bg-[#F1E9FF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
                      <span className="block truncate text-[19px] leading-tight" style={{ fontFamily: f.family, fontWeight: f.id === 'bold' ? 900 : 400 }}>{cur.$nameText || 'Aarav turns 1'}</span>
                      <span className="block text-[10.5px] font-bold text-[var(--ink-3)]">{f.label}</span>
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}

          {t === 'cake_desserts' && (
            <>
              <Section title="Pick a style" sub="Inspiration photographs — your baker makes it their way">
                <PhotoMulti items={CAKES.filter(x => x.photo)} value={cur.$cake ? [cur.$cake] : []} data="cakes"
                  onChange={v => set({ $cake: v[v.length - 1] ?? null })} />
              </Section>
              <Section title="Size and style">
                <OneChips items={CAKE_OPTIONS.weight} value={cur.$weight ?? null} onPick={v => set({ $weight: v })} data="weight" />
                <div className="mt-2"><OneChips items={CAKE_OPTIONS.tiers} value={cur.$tiers ?? null} onPick={v => set({ $tiers: v })} data="tiers" /></div>
                <div className="mt-2"><OneChips items={CAKE_OPTIONS.shape} value={cur.$shape ?? null} onPick={v => set({ $shape: v })} data="shape" /></div>
                <div className="mt-2"><OneChips items={CAKE_OPTIONS.egg} value={cur.$egg ?? null} onPick={v => set({ $egg: v })} data="egg" /></div>
                <div className="mt-2"><OneChips items={CAKE_OPTIONS.delivery} value={cur.$delivery ?? null} onPick={v => set({ $delivery: v })} data="delivery" /></div>
              </Section>
              {rest.slice(0, 2).map(ask)}
              <Section title="Words on the cake" sub="Optional">
                <input value={cur.$cakeText ?? ''} onChange={e => set({ $cakeText: e.target.value.slice(0, 40) })} placeholder="e.g. Happy 1st Birthday Aarav"
                  className="h-12 w-full rounded-[14px] bg-white px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1.5px_#E9E3F2] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" data-cake-text />
              </Section>
            </>
          )}

          {t === 'photography' && (
            <>
              {rest.slice(0, 2).map(ask)}
              <Section title="How long should they stay?"><OneChips items={PHOTO_HOURS.filter(l => !chosenExp?.min_hours || hoursOf(l) >= Number(chosenExp.min_hours))}
                value={PHOTO_HOURS.find(l => hoursOf(l) === hoursOf(cur.$hours)) ?? null}
                onPick={v => set({ $hours: hoursOf(v) })} data="photo-hours" /></Section>
              <Section title="Extras"><ManyChips items={PHOTO_EXTRAS} value={cur.$extras ?? []} onChange={v => set({ $extras: v })} data="photo-extras" /></Section>
              <button type="button" role="switch" aria-checked={video} onClick={() => { onVideo(!video); ensure() }} data-video-toggle
                className="cx-press flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left shadow-[inset_0_0_0_1.5px_#ECE6F4]">
                <Thumb o={o} t="videography" className="h-12 w-12 shrink-0 rounded-[12px]" />
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">Add video coverage</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Film, highlights and reels</span></span>
                <span className={'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ' + (video ? 'bg-[#7C3AED]' : 'bg-[#E4DDF0]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (video ? 'right-[3px]' : 'left-[3px]')} /></span>
              </button>
            </>
          )}

          {t === 'live_entertainment' && (
            <Section title="Who should entertain?" sub="Pick one or more">
              <PhotoMulti items={ENTERTAINERS} value={(cur.$entertainers ?? []).map(l => ENTERTAINERS.find(e => e.label === l)?.id).filter(Boolean)} data="entertainers"
                onChange={ids => set({ $entertainers: ids.map(id => ENTERTAINERS.find(e => e.id === id).label) })} />
            </Section>
          )}
          {!['catering_food', 'decoration_floral', 'cake_desserts', 'photography'].includes(t) && rest.slice(0, 3).map(ask)}
          <RefPhotos refs={cur.$refs ?? []} onChange={refs => set({ $refs: refs })} />
        </div>
  )
}

/** The panel in a sheet, with its three answers at the foot. */
export function ChooseSheet({ o, t, plan, on, why, video, onVideo, ensure, onClose, onPick }) {
  const c = t ? copyFor(o, t) : null
  return (
    <Sheet open={!!t} onClose={onClose} title={c?.title ?? ''}
      footer={t ? (
        <div className="grid gap-1.5 pb-1">
          <button type="button" onClick={() => onPick('need')} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold" data-edit-done>{on ? 'Done' : 'Add to my plan'}</button>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => onPick('have')} className="h-10 rounded-[14px] bg-[#F4F1F8] text-[12.5px] font-extrabold text-[var(--ink-2)]" data-edit-have>I already have this</button>
            <button type="button" onClick={() => onPick('skip')} className="h-10 rounded-[14px] bg-[#F4F1F8] text-[12.5px] font-extrabold text-[var(--ink-2)]" data-edit-skip>Not needed</button>
          </div>
        </div>
      ) : null}>
      <ChoosePanel o={o} t={t} plan={plan} why={why} video={video} onVideo={onVideo} ensure={ensure} onClose={onClose} />
    </Sheet>
  )
}

/* "Other" as a picture: the customer's own photo of what they want (199). */
/*
 * The menu now lives in the Menu Studio (/o/:id/menu): cuisine, Sambramo's
 * curated menus, swaps, diet and how it is served. Here, just the way in —
 * and what was chosen, once it was.
 */
function StudioEntry({ o, cur, onClose }) {
  const navigate = useNavigate()
  const st = cur.$studio
  const n = st ? st.sections.reduce((t, s) => t + s.items.length, 0) : 0
  const open = () => { onClose(); navigate(`/o/${o.id}/menu${st ? '?s=edit' : ''}`) }
  return (
    <button type="button" onClick={open} data-studio-entry={st ? 'chosen' : 'new'}
      className="cx-press flex w-full items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#2A124F] to-[#5B21B6] p-4 text-left text-white">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F4D99A]">{st ? 'Your menu' : 'Menu Studio'}</span>
        <span className="mt-0.5 block truncate text-[17px] font-extrabold">{st ? st.name : 'Create your menu'}</span>
        <span className="block text-[12px] font-semibold text-white/75">{st ? `${n} dishes · tap to change` : 'Pick a cuisine, choose a Sambramo menu, swap any dish'}</span>
      </span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15"><Pencil size={16} /></span>
    </button>
  )
}

/* Theme names for this kind of occasion — words the decorator works from. */
function ThemeWords({ families = [], value = [], onChange }) {
  const themes = [...new Set(families.flatMap(f => DECOR_THEMES[f] ?? []))]
  return <ManyChips items={themes} value={value} onChange={v => onChange(v.slice(-3))} data="theme-words" />
}

export function RefPhotos({ refs, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function add(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange([...refs, await uploadReference(f)].slice(0, 3)) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <section data-ref-photos>
      <p className="text-[15px] font-black tracking-[-0.02em]">Have a photo of what you want?</p>
      <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">Optional — masters see it with your request</p>
      <div className="mt-2.5 flex gap-2">
        {refs.map(u => (
          <span key={u} className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] bg-[#F3EEF9]">
            <Photo src={u} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(refs.filter(x => x !== u))} aria-label="Remove photo" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white"><X size={12} /></button>
          </span>
        ))}
        {refs.length < 3 && (
          <label className="cx-press grid h-[72px] w-[72px] shrink-0 cursor-pointer place-items-center rounded-[14px] border-2 border-dashed border-[#D9CCF2] text-[var(--brand)]" data-ref-add>
            <input type="file" accept="image/*" className="hidden" onChange={add} disabled={busy} />
            {busy ? <span className="text-[11px] font-bold">Adding…</span> : <Plus size={22} />}
          </label>
        )}
      </div>
      {err && <p className="mt-1.5 text-[11.5px] font-bold text-[#B42318]">{err}</p>}
    </section>
  )
}

/* Pick one of a few words. */
/* "Important Moments", "Complete Story", "Cinematic Experience". Each line
   says only what Sambramo checks against the partner's real package —
   hours and named inclusions — never a promise it cannot check. */
export function ExperiencePicker({ tiers, value, onPick }) {
  return <TierCards tiers={tiers} value={value} onPick={onPick} />
}

function OneChips({ items, value, onPick, data }) {
  return <IconTiles data={data} compact value={value} items={items} onChange={v => onPick(v)} />
}

/* Pick any of a few words. */
function ManyChips({ items, value = [], onChange, data }) {
  return <IconTiles data={data} compact multi value={value} items={items} onChange={onChange} />
}

/* Photo tiles, pick any — how the food is arranged, who entertains. */
function PhotoMulti({ items, value = [], onChange, data }) {
  return (
    <div className="grid grid-cols-3 gap-2" data-photo-multi={data}>
      {items.map(x => {
        const on = value.includes(x.id)
        return (
          <button key={x.id} type="button" onClick={() => onChange(on ? value.filter(v => v !== x.id) : [...value, x.id])} aria-pressed={on} data-pick={x.id}
            className={'cx-press overflow-hidden rounded-[14px] bg-white text-left ' + (on ? 'shadow-[0_0_0_2.5px_#7C3AED]' : 'shadow-[0_0_0_1px_#ECE6F4]')}>
            <span className="relative block aspect-[4/3] bg-[#F3EEF9]">
              {x.photo && <Photo src={x.photo.url} alt={x.photo.alt} className="absolute inset-0 h-full w-full object-cover" />}
              {on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={13} strokeWidth={3.2} /></span>}
            </span>
            <span className="block truncate px-1.5 pt-1.5 text-[12px] font-extrabold">{x.label}</span>
            {x.line && <span className="block truncate px-1.5 pb-1.5 text-[10px] font-semibold text-[var(--ink-3)]">{x.line}</span>}
            {!x.line && <span className="block pb-1.5" />}
          </button>
        )
      })}
    </div>
  )
}

