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
import { Check, ChevronRight, ClipboardList, LayoutGrid, Pencil, Plus, Radar, Share2, Sparkles, X } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { serviceArt } from '../data/art'
import { copyFor, introFor } from '../data/requirementCopy'
import { photoFor } from '../data/requirementPhotos.generated'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { partnersFor } from '../lib/market'
import { needsFor as tradeQuestions, loadCuisines, loadDishes } from '../lib/needs'
import { needsSummary } from '../ui/needs'
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
  const p = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev])
  const [sheet, setSheet] = useState(null) // { edit: t } | 'add'
  const [how, setHow] = useState('each')
  const [other, setOther] = useState('')
  const [allExtra, setAllExtra] = useState(false)
  const [, setFood] = useState(0)
  const place = plan.place?.lat ? plan.place : savedWhere()
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase)]).then(() => setFood(n => n + 1)).catch(() => {}) }, [])
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
  const arrange = [...p.essential, ...p.needed.filter(t => !p.essential.includes(t))]
  const extra = p.enhance.filter(t => !arrange.includes(t))
  const rest = p.rows.filter(r => !arrange.includes(r.tradeId) && !extra.includes(r.tradeId)).map(r => r.tradeId)
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
          {arrange.map(t => <ReqCard key={t} o={o} t={t} on={on(t)} said={needsSummary(t, plan.needsOf(o.id, t))} why={row(t)?.reason}
            onToggle={() => pick(t, on(t) ? 'skip' : 'need')} onOpen={() => setSheet({ edit: t })} />)}
        </div>
      </section>

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
                <ReqCard o={o} t={t} small on={on(t)} popular={row(t)?.kind === 'RECOMMENDED'} onToggle={() => pick(t, on(t) ? 'off' : 'need')} onOpen={() => setSheet({ edit: t })} />
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

      <ExploreSheet o={o} t={sheet?.edit} plan={plan} on={sheet?.edit ? on(sheet.edit) : false} why={sheet?.edit ? row(sheet.edit)?.reason : null}
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

function ReqCard({ o, t, on, said = null, why = null, popular = false, small = false, onToggle, onOpen }) {
  const c = copyFor(o, t)
  return (
    <article className={'overflow-hidden rounded-[20px] bg-white transition-shadow ' + (on ? 'shadow-[0_0_0_2px_#7C3AED,0_16px_30px_-22px_rgba(91,33,168,.9)]' : 'shadow-[0_0_0_1px_#ECE6F4]')} data-req={t} data-on={on}>
      <button type="button" onClick={onOpen} className="block w-full text-left" data-req-open={t}>
        <span className="relative block">
          <Thumb o={o} t={t} tag className="aspect-[4/3] w-full" />
          {popular && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-[#9D174D]">Popular</span>}
        </span>
        <span className="block px-2.5 pt-2">
          <span className={'line-clamp-2 block font-extrabold leading-[1.2] tracking-[-0.015em] ' + (small ? 'text-[12.5px]' : 'text-[13.5px]')}>{c.title}</span>
          {!small && <span className={'mt-0.5 line-clamp-2 block text-[11px] font-semibold leading-snug ' + (said ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>{said || why || c.line}</span>}
        </span>
      </button>
      <div className="flex items-center justify-between gap-1 px-2.5 pb-2.5 pt-2">
        <button type="button" onClick={onOpen} className="flex items-center gap-0.5 text-[11.5px] font-extrabold text-[var(--brand)]">Explore<ChevronRight size={13} /></button>
        <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? 'Remove' : 'Add'} ${c.title}`} onClick={onToggle} data-req-check={t}
          className={'cx-press flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-extrabold transition-colors ' + (on ? 'bg-[#7C3AED] text-white' : 'bg-[#F4EEFF] text-[#4C1D95]')}>
          {on ? <><Check size={13} strokeWidth={3.2} />Added</> : <><Plus size={13} strokeWidth={3} />Add</>}
        </button>
      </div>
    </article>
  )
}

/* A requirement's choices: the partner app's own questions for that trade. */
function ExploreSheet({ o, t, plan, on, why, onClose, onPick }) {
  const c = t ? copyFor(o, t) : null
  const ph = t ? photoFor(o.template, t) : null
  const qs = t ? tradeQuestions(t).filter(q => q.group === 'choose' && q.kind !== 'dishes' && q.key !== '$years').slice(0, 3) : []
  const cur = t ? plan.needsOf(o.id, t) : {}
  const set = (k, v) => plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), [k]: v })
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
        <div className="space-y-3 pb-2" data-edit={t}>
          {ph && (
            <figure className="overflow-hidden rounded-[18px]">
              <span className="relative block aspect-[16/9] bg-[#F3EEF9]"><Photo src={ph.url} alt={ph.alt} className="absolute inset-0 h-full w-full object-cover" /></span>
              <figcaption className="pt-1 text-[10.5px] font-semibold text-[var(--ink-3)]">Inspiration · {ph.credit}</figcaption>
            </figure>
          )}
          <p className="text-[13px] font-semibold leading-snug text-[var(--ink-2)]">{why ? `${why}. ` : ''}{c.line}.</p>
          {qs.map(q => <Question key={q.key} q={q} value={cur[q.key] ?? []} onChange={v => set(q.key, v)} occasion={o} typed={cur[q.key + '__typed'] ?? []} onTyped={v => set(q.key + '__typed', v)} />)}
        </div>
      )}
    </Sheet>
  )
}
