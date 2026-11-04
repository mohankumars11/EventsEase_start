/**
 * Screen 2 — the event plan, as a celebration, not a checklist (spec
 * 2026-11-02 "occasion-first catalogue").
 *
 *   hero          the customer's own invitation, under the occasion's own
 *                 headline (data/requirementCopy.introFor)
 *   Let's arrange these   the ESSENTIAL requirements (lib/blueprint),
 *                 as photo cards in the customer's words — never a trade name
 *   Make it extra special RECOMMENDED first, then OPTIONAL — offered, not ticked
 *   Explore       a requirement's own choices in a sheet: the questions the
 *                 PARTNER app defines for that trade (lib/needs ← data/trades,
 *                 cuisines and dishes from the catalogue tables), "I already
 *                 have this", "Not needed"
 *
 * Every card maps to a canonical trade id; the words and photos are a
 * layer over it (data/requirementCopy.js, requirementPhotos.generated.js —
 * Pexels inspiration photographs, labelled as such, never a partner's work).
 * No price anywhere before a master accepts.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, ClipboardList, LayoutGrid, Pencil, Plus, Radar, Share2, Sparkles, X } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { serviceArt } from '../data/art'
import { copyFor, introFor } from '../data/requirementCopy'
import { photoFor } from '../data/requirementPhotos.generated'
import { wayOf, themesFor, CAKES, DECOR_THEMES, ACTION, TAG, COLOURS, FONTS, FOOD_WAYS, foodNeeds, COOK_TEAM, INGREDIENTS, DRINKS, DECOR_ELEMENTS, CAKE_OPTIONS, PHOTO_HOURS, PHOTO_EXTRAS, ENTERTAINERS, designFamilies, byOrder, OPS } from '../data/visualCatalogue'
import { SERVE } from '../lib/sambramoMenu'
import { usePlan, needsFor } from '../state/PlanContext'
import { savePlan, savedContextFor } from '../lib/eventPlans'
import { savedWhere } from '../lib/where'
import { partnersFor } from '../lib/market'
import { needsFor as tradeQuestions, loadCuisines, loadDishes } from '../lib/needs'
import { briefFor } from '../lib/brief'
import { uploadReference } from '../lib/referencePhotos'
import { dayLabel, timeLabel } from '../lib/format'
import { supabase } from '../../lib/supabase'
import { templatesFor, TEMPLATES, themeString } from '../data/inviteTemplates'
import InviteCard from '../ui/InviteCard'
import EventJourney from '../ui/EventJourney'
import { ActionBar, BackHeader, Photo, Sheet } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { Question } from './Brief'
import { useAuth } from '../../context/AuthContext'

export default function EventPlan() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user, profile } = useAuth()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const picks = o ? plan.picks[o.id] ?? {} : {}
  const p = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev, plan.rulesRevision])
  const [sheet, setSheet] = useState(null) // { edit: t } | 'add'
  const [how, setHow] = useState('each')
  const [other, setOther] = useState('')
  const [allExtra, setAllExtra] = useState(false)
  const [, setFood] = useState(0)
  const [accountSave, setAccountSave] = useState('device')
  const place = plan.place?.lat ? plan.place : savedWhere()
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase)]).then(() => setFood(n => n + 1)).catch(() => {}) }, [])

  /* The active customer flow autosaves to migration 190. Until the server
     confirms the write, the plan remains available from PlanContext on this
     device and the UI never claims cross-device sync prematurely. */
  useEffect(() => {
    if (!valid || !p) return
    if (!user?.id) { setAccountSave('device'); return }
    let current = true
    setAccountSave('saving')
    const timer = setTimeout(async () => {
      const statuses = Object.fromEntries(p.result.services.map(service => [service.tradeId, service.status]))
      const result = await savePlan({
        userId: user.id,
        occasionId: o.id,
        context: savedContextFor(o, picks, ev, plan.place, plan.needs),
        picks,
        statuses,
        lines: plan.basket.filter(line => line.occasionId === o.id),
        ruleVersion: p.result.ruleVersion,
      })
      if (current) setAccountSave(result.ok ? 'account' : 'device')
    }, 700)
    return () => { current = false; clearTimeout(timer) }
  }, [valid, user?.id, o?.id, p, picks, ev, plan.basket, plan.place, plan.needs])

  useEffect(() => { import('./LiveMatch').catch(() => {}) }, []) // the next screen loads while they read

  /* Masters live near the event for what is selected (lists capped at 40). */
  const tradesKey = (p?.needed ?? []).join(',')
  const [nearby, setNearby] = useState(null)
  useEffect(() => {
    if (!tradesKey) return
    let live = true
    const at = place?.lat ? { lat: place.lat, lng: place.lng } : {}
    Promise.all(tradesKey.split(',').map(t => partnersFor(t, at).then(l => l.length).catch(() => 0)))
      .then(ns => { if (live) setNearby({ n: ns.reduce((s, x) => s + x, 0), more: ns.some(x => x >= 40) }) })
    return () => { live = false }
  }, [tradesKey, place?.lat, place?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />

  const row = t => p.rows.find(r => r.tradeId === t)
  const on = t => row(t)?.state === 'need'
  const pick = (t, v) => plan.setPick(o.id, t, v)
  /* Essentials, plus anything the customer added from elsewhere. */
  /* Photos and video are one card: video rides on photography's sheet. */
  const photoCard = [...p.essential, ...p.enhance, ...p.needed].includes('photography')
  const arrange = [...p.essential, ...p.needed.filter(t => !p.essential.includes(t))].filter(t => !(photoCard && t === 'videography')).sort(byOrder)
  const extra = p.enhance.filter(t => !arrange.includes(t) && !OPS.has(t) && !(photoCard && t === 'videography')).sort(byOrder)
  const rest = p.rows.filter(r => !arrange.includes(r.tradeId) && !extra.includes(r.tradeId) && !r.coveredByVenue && !r.alreadyArranged).map(r => r.tradeId)
  const intro = introFor(o)
  const custom = ev.custom ?? []
  const addCustom = () => { const v = other.trim(); if (v) { plan.setEvent({ custom: [...custom, v].slice(0, 8) }); setOther('') } }
  const first = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0]
  const inv = {
    title: first ? `${first}’s ${o.name}` : o.name, event_date: ev.date ?? '', start_time: ev.time ?? '',
    venue_name: place?.area ?? '', theme: themeString((templatesFor(o)[0] ?? TEMPLATES[0]).id, { art: true, live: true }),
  }
  const go = () => navigate(`/o/${o.id}/live${how === 'planner' ? '?planner=1' : ''}`)
  const shownExtra = allExtra ? extra : extra.slice(0, 6)

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-event-plan>
      <BackHeader title={o.name} onBack={() => navigate(`/o/${o.id}`)} />
      <EventJourney at={1} occasionId={o.id} />

      {/* The invitation — made from their details, shareable as it is. */}
      <section className="mx-4 mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FBF3FF] via-white to-[#EFE6FF] p-4 shadow-[0_0_0_1px_#EDE3FB]" data-plan-hero>
        <div className="flex items-start gap-3.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-[23px] font-black leading-[1.08] tracking-[-0.035em]">{intro.title}</h1>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--ink-2)]">{intro.line}</p>
          </div>
          <span className="w-[92px] shrink-0 rotate-[3deg] drop-shadow-[0_14px_20px_rgba(91,33,182,.28)]"><InviteCard inv={inv} occasion={o} theme={inv.theme} size="mini" /></span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => navigate(`/o/${o.id}`)} className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-left text-[12.5px] font-bold text-[#3B1670]" data-plan-facts>
            <span>{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</span>
            {ev.guests ? <span>{ev.guests.toLocaleString('en-IN')} guests</span> : null}
            {place?.area && <span>{place.area}</span>}
            <Pencil size={13} className="text-[var(--brand)]" />
          </button>
          <Link to={`/invites/new?o=${o.id}&step=review`} className="flex shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-[#DB2777]" data-plan-share><Share2 size={14} />Share</Link>
        </div>
        <p className="mt-2 text-[10.5px] font-bold text-[#6B5A83]" data-account-save>
          {accountSave === 'saving' ? 'Saving your plan…' : accountSave === 'account' ? 'Saved to your account' : 'Saved on this device'}
        </p>
      </section>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-2" data-how>
        {[['each', LayoutGrid, 'I’ll organise', 'Matched live'], ['planner', ClipboardList, 'One planner', 'Runs it all']].map(([k, Icon, title, sub]) => (
          <button key={k} type="button" onClick={() => setHow(k)} aria-pressed={how === k} data-how-pick={k}
            className={'cx-press flex items-center gap-2.5 rounded-[16px] p-2.5 text-left transition-colors ' + (how === k ? 'bg-[#F1E9FF] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#E9E3F2]')}>
            <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-full ' + (how === k ? 'bg-[#7C3AED] text-white' : 'bg-[#F4EEFF] text-[var(--brand)]')}><Icon size={17} /></span>
            <span className="min-w-0"><span className="block text-[13.5px] font-extrabold">{title}</span><span className="block truncate text-[11px] font-semibold text-[var(--ink-3)]">{sub}</span></span>
          </button>
        ))}
      </div>

      {/* Let's arrange these — the essentials, as photographs. */}
      <section className="mt-6 px-4" data-arrange>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-[19px] font-black tracking-[-0.03em]">{how === 'planner' ? 'Your planner arranges' : 'Let’s arrange these'}</h2>
          {nearby?.n > 0 && <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-extrabold text-[#0B6B3D]" data-nearby><span className="cx-live-dot h-2 w-2 rounded-full bg-[#16A34A]" />{nearby.n}{nearby.more ? '+' : ''} masters nearby</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3" data-arrange-grid>
          {arrange.map(t => <ReqCard key={t} o={o} t={t} on={on(t)} video={t === 'photography' && on('videography')} said={briefFor(o, t, plan.needsOf(o.id, t))} why={row(t)?.reason}
            onToggle={() => pick(t, on(t) ? 'skip' : 'need')} onOpen={() => setSheet({ edit: t })} />)}
        </div>
      </section>

      {p.covered.length > 0 && (
        <section className="mt-6 px-4" data-covered>
          <h2 className="text-[16px] font-black tracking-[-0.02em]">Already taken care of</h2>
          <p className="mt-1 text-[12px] font-semibold text-[var(--ink-3)]">We’ll keep these out of your booking list to avoid paying twice.</p>
          <div className="mt-2 grid gap-2">
            {p.covered.map(r => (
              <div key={r.tradeId} className="flex items-center gap-3 rounded-[15px] bg-[#F7F4FB] px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EDE6F8] text-[#5B3A87]"><Check size={15} strokeWidth={3} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-extrabold">{copyFor(o, r.tradeId).title}</span>
                  <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{r.reason ?? (r.alreadyArranged ? 'You’ve already arranged this' : 'Included at your venue')}</span>
                </span>
                <span className="shrink-0 text-[10.5px] font-extrabold text-[#23734D]">{r.coveredByVenue ? 'Included' : 'Arranged'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Make it extra special — offered, never pre-ticked. */}
      {extra.length > 0 && (
        <section className="mt-7" data-extra>
          <div className="flex items-end justify-between gap-2 px-4">
            <h2 className="flex items-center gap-1.5 text-[19px] font-black tracking-[-0.03em]"><Sparkles size={18} className="text-[#C026D3]" />Make it extra special</h2>
            {extra.length > 6 && <button type="button" onClick={() => setAllExtra(x => !x)} className="shrink-0 text-[12.5px] font-extrabold text-[var(--brand)]">{allExtra ? 'Fewer' : `All ${extra.length}`}</button>}
          </div>
          <div className={allExtra ? 'mt-3 grid grid-cols-2 gap-3 px-4' : 'cx-noscroll mt-3 flex gap-3 overflow-x-auto px-4 pb-1'}>
            {shownExtra.map(t => (
              <div key={t} className={allExtra ? '' : 'w-[150px] shrink-0'}>
                <ReqCard o={o} t={t} small on={on(t)} video={t === 'photography' && on('videography')} popular={row(t)?.kind === 'RECOMMENDED'} onToggle={() => pick(t, on(t) ? 'off' : 'need')} onOpen={() => setSheet({ edit: t })} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 px-4">
        {custom.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5" data-custom>
            {custom.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-[#F4EEFF] py-1.5 pl-3 pr-1.5 text-[12.5px] font-bold text-[#3B1670]">
                {c}<button type="button" onClick={() => plan.setEvent({ custom: custom.filter((_, j) => j !== i) })} aria-label={`Remove ${c}`} className="grid h-5 w-5 place-items-center rounded-full bg-white"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[#FAF8FD] px-3.5 shadow-[inset_0_0_0_1px_#EEE9F5]">
            <input value={other} onChange={e => setOther(e.target.value.slice(0, 60))} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="Something else? Type it"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-[#A79DB9]" data-other-input />
            {other.trim() && <button type="button" onClick={addCustom} className="shrink-0 text-[13px] font-extrabold text-[var(--brand)]" data-other-add>Add</button>}
          </label>
          <button type="button" onClick={() => setSheet('add')} className="cx-press flex h-12 shrink-0 items-center gap-1 rounded-[14px] px-3.5 text-[13px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-add-more><Plus size={16} />More</button>
        </div>
      </section>

      <ActionBar>
        <button type="button" disabled={!p.needed.length} onClick={go} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] text-[16px] font-extrabold" data-find-live>
          <span className="cx-live-dot h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />{how === 'planner' ? 'Find my planner' : 'Find my masters'}<Radar size={18} />
        </button>
      </ActionBar>

      <ChooseSheet o={o} t={sheet?.edit} plan={plan} place={place} on={sheet?.edit ? on(sheet.edit) : false} why={sheet?.edit ? row(sheet.edit)?.reason : null}
        video={on('videography')} onVideo={v => pick('videography', v ? 'need' : 'off')} ensure={() => { if (sheet?.edit && !on(sheet.edit)) pick(sheet.edit, 'need') }}
        onClose={() => setSheet(null)} onPick={v => { pick(sheet.edit, v); setSheet(null) }} />

      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Add something">
        <ul className="max-h-[60dvh] overflow-y-auto pb-3" data-add-list>
          {[...extra, ...rest].filter(t => !on(t)).map(t => (
            <li key={t}>
              <button type="button" onClick={() => { pick(t, 'need'); setSheet(null) }} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-2.5 text-left last:border-0">
                <Thumb o={o} t={t} className="h-11 w-11 shrink-0 rounded-[12px]" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{copyFor(o, t).title}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{copyFor(o, t).line}</span></span>
                <Plus size={18} className="shrink-0 text-[var(--brand)]" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </main>
  )
}

/* The photograph for a requirement — Pexels inspiration, labelled — else the service art. */
function Thumb({ o, t, className = '', tag = false }) {
  const ph = photoFor(o.template, t)
  if (!ph) return <ArtFill art={serviceArt(t)} tone="#F6F1FF" className={className} inset="10%" />
  return (
    <span className={'relative block overflow-hidden bg-[#F3EEF9] ' + className}>
      <Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" />
      {tag && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white/90">Inspiration</span>}
    </span>
  )
}

function ReqCard({ o, t, on, said = null, why = null, popular = false, small = false, video = false, onToggle, onOpen }) {
  const c = copyFor(o, t)
  return (
    <article className={'overflow-hidden rounded-[20px] bg-white transition-shadow ' + (on ? 'shadow-[0_0_0_2px_#7C3AED,0_16px_30px_-22px_rgba(91,33,168,.9)]' : 'shadow-[0_0_0_1px_#ECE6F4]')} data-req={t} data-on={on}>
      <button type="button" onClick={onOpen} className="block w-full text-left" data-req-open={t}>
        <span className="relative block">
          <Thumb o={o} t={t} tag={!small} className="aspect-[4/3] w-full" />
          {popular && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-[#9D174D]">Popular</span>}
          {TAG[t] && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-[#3B1670]" data-tag={t}>{TAG[t]}{video ? ' & video' : ''}</span>}
        </span>
        <span className="block px-2.5 pt-2">
          <span className={'block truncate font-extrabold leading-[1.25] tracking-[-0.015em] ' + (small ? 'text-[12.5px]' : 'text-[13.5px]')}>{c.title}</span>
          <span className={'mt-0.5 block truncate text-[11px] font-semibold leading-snug ' + (said ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>{said || why || c.line}</span>
        </span>
      </button>
      <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-2">
        <button type="button" onClick={onOpen} className="cx-press flex h-8 min-w-0 flex-1 items-center justify-center rounded-full bg-[#F4EEFF] px-1.5 text-[12px] font-extrabold text-[#4C1D95]" data-req-action={t}>
          <span className="truncate">{small ? 'Choose' : ACTION[t] ?? 'Choose'}</span>
        </button>
        <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? 'Remove' : 'Add'} ${c.title}`} onClick={onToggle} data-req-check={t}
          className={'cx-press grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ' + (on ? 'bg-[#7C3AED] text-white' : 'bg-white text-[#7C3AED] shadow-[inset_0_0_0_1.5px_#CDBCF2]')}>
          {on ? <Check size={15} strokeWidth={3.2} /> : <Plus size={15} strokeWidth={3} />}
        </button>
      </div>
    </article>
  )
}

function Section({ title, sub = null, children }) {
  return (
    <section>
      <p className="text-[15px] font-black tracking-[-0.02em]">{title}</p>
      {sub && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/* Single-pick chips. */
function Chips({ items, value, onPick, data }) {
  return (
    <div className="flex flex-wrap gap-2" data-chips={data}>
      {items.map(x => (
        <button key={x.id} type="button" onClick={() => onPick(value === x.id ? null : x.id)} aria-pressed={value === x.id} data-chip={x.id}
          className={'cx-press rounded-full px-3.5 py-2 text-[12.5px] font-bold ' + (value === x.id ? 'bg-[#1C1033] text-white' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
          {x.label}
        </button>
      ))}
    </div>
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
function ChooseSheet({ o, t, plan, place, on, why, video, onVideo, ensure, onClose, onPick }) {
  const c = t ? copyFor(o, t) : null
  const ph = t ? photoFor(o.template, t) : null
  const cur = t ? plan.needsOf(o.id, t) : {}
  const set = patch => { plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), ...patch }); ensure() }
  const all = t ? tradeQuestions(t) : []
  const q = key => all.find(x => x.key === key)
  const rest = all.filter(x => x.group === 'choose' && x.kind !== 'dishes' && !['$diet', '$cuisine', '$years', 'service_styles', 'prep_location'].includes(x.key))
  /* A partner's option list covers every occasion; offer only what can
     apply to this one — no "Wedding cake" for a first birthday. */
  const fits = label => {
    const l = String(label).toLowerCase()
    if (o.category !== 'wedding' && /wedding|bridal|bride|groom|haldi|mehendi|sangeet|engagement|pre-wedding|trousseau/.test(l)) return false
    if (['life', 'wedding', 'festivals'].includes(o.category) && /corporate|product|conference|fashion/.test(l)) return false
    return true
  }
  const ask = (x, i) => x && <Question key={x.key ?? i} q={{ ...x, options: (x.options ?? []).filter(op => fits(op.label ?? op)) }} value={cur[x.key] ?? []} onChange={v => set({ [x.key]: v })} occasion={o} typed={cur[x.key + '__typed'] ?? []} onTyped={v => set({ [x.key + '__typed']: v })} />

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
      {t && (
        <div className="space-y-5 pb-2" data-edit={t}>
          {ph && !['decoration_floral', 'cake_desserts'].includes(t) && (
            <figure>
              <span className="relative block aspect-[16/8] overflow-hidden rounded-[18px] bg-[#F3EEF9]"><Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" /></span>
              <figcaption className="pt-1 text-[10.5px] font-semibold text-[var(--ink-3)]">Inspiration · {ph.credit}</figcaption>
            </figure>
          )}
          <p className="text-[13px] font-semibold leading-snug text-[var(--ink-2)]">{why ? `${why}. ` : ''}{c.line}.</p>

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
              <Section title="How long should they stay?"><OneChips items={PHOTO_HOURS} value={cur.$hours ?? null} onPick={v => set({ $hours: v })} data="photo-hours" /></Section>
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
      )}
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

function RefPhotos({ refs, onChange }) {
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
function OneChips({ items, value, onPick, data }) {
  return (
    <div className="flex flex-wrap gap-2" data-chips={data}>
      {items.map(x => (
        <button key={x} type="button" onClick={() => onPick(value === x ? null : x)} aria-pressed={value === x} data-chip={x}
          className={'cx-press rounded-full px-3.5 py-2 text-[12.5px] font-bold ' + (value === x ? 'bg-[#1C1033] text-white' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>{x}</button>
      ))}
    </div>
  )
}

/* Pick any of a few words. */
function ManyChips({ items, value = [], onChange, data }) {
  return (
    <div className="flex flex-wrap gap-2" data-chips={data}>
      {items.map(x => {
        const on = value.includes(x)
        return (
          <button key={x} type="button" onClick={() => onChange(on ? value.filter(v => v !== x) : [...value, x])} aria-pressed={on} data-chip={x}
            className={'cx-press flex items-center gap-1 rounded-full px-3.5 py-2 text-[12.5px] font-bold ' + (on ? 'bg-[#F1E9FF] text-[#4C1D95] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1.5px_#ECE6F4]')}>
            {on && <Check size={13} strokeWidth={3} />}{x}
          </button>
        )
      })}
    </div>
  )
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

