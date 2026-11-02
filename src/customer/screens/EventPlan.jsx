/**
 * Screen 2 of 3 — the event plan, invitation-style (spec 2026-11-02 §4).
 *
 * The hero is the customer's own invitation, made from what they just
 * told us (the app's real invitation designs — InviteCard), never a stock
 * photo that may not match the occasion. Under it, what the occasion
 * takes, from the 360° engine: core and triggered services ticked, a few
 * useful optional ones offered unticked, everything else one tap away in
 * "Add more", and "Something else" for what no list has.
 *
 * A row is a checkbox (keep / drop — instantly reversible, so no confirm)
 * and a tap target (its own choices, in a sheet: cuisine, photo style,
 * theme…). Nothing here is compulsory; "Find my masters" works on the
 * plan as it stands.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, ClipboardList, LayoutGrid, Pencil, Plus, Radar, Share2, X } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { INCLUDES } from '../data/serviceTiming'
import { usePlan, needsFor } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { partnersFor } from '../lib/market'
import { needsFor as tradeQuestions, loadCuisines, loadDishes } from '../lib/needs'
import { needsSummary } from '../ui/needs'
import { dayLabel, timeLabel } from '../lib/format'
import { supabase } from '../../lib/supabase'
import { templatesFor, TEMPLATES, themeString } from '../data/inviteTemplates'
import InviteCard from '../ui/InviteCard'
import { ActionBar, BackHeader, Sheet } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { Question } from './Brief'
import { Progress } from './EventFlow'
import { useAuth } from '../../context/AuthContext'

const DIETS = [['veg', 'Veg'], ['non_veg', 'Non-veg'], ['mixed', 'Both']]

export default function EventPlan() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const { user, profile } = useAuth()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const picks = o ? plan.picks[o.id] ?? {} : {}
  const p360 = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev])
  const [sheet, setSheet] = useState(null) // { edit: t } | 'add'
  const [how, setHow] = useState('each')
  const [other, setOther] = useState('')
  const [, setFood] = useState(0)
  const place = plan.place?.lat ? plan.place : savedWhere()
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase)]).then(() => setFood(n => n + 1)).catch(() => {}) }, [])
  /* The live screen loads while the customer reads the plan. */
  useEffect(() => { import('./LiveMatch').catch(() => {}) }, [])

  /* Masters live near the event for this plan (lists capped at 40 → "40+"). */
  const tradesKey = (p360?.needed ?? []).join(',')
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

  const needed = p360.needed
  const offered = p360.rows.filter(r => r.status === 'OPTIONAL' && r.state === 'off').slice(0, 3).map(r => r.tradeId)
  const rest = p360.rows.filter(r => !needed.includes(r.tradeId) && !offered.includes(r.tradeId)).map(r => r.tradeId)
  const pick = (t, v) => plan.setPick(o.id, t, v)
  const toggle = t => pick(t, needed.includes(t) ? 'skip' : 'need')
  const food = plan.needsOf(o.id, 'catering_food')
  const diet = food.$diet?.[0] ?? null
  const custom = ev.custom ?? []
  const addCustom = () => { const v = other.trim(); if (v) { plan.setEvent({ custom: [...custom, v].slice(0, 8) }); setOther('') } }
  const first = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0]
  const inv = {
    title: first ? `${first}’s ${o.name}` : o.name, event_date: ev.date ?? '', start_time: ev.time ?? '',
    venue_name: place?.area ?? '', theme: themeString((templatesFor(o)[0] ?? TEMPLATES[0]).id, { art: true, live: true }),
  }
  const go = () => navigate(`/o/${o.id}/live${how === 'planner' ? '?planner=1' : ''}`)

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+110px)]" data-event-plan>
      <BackHeader title="Your event plan" onBack={() => navigate(`/o/${o.id}`)} right={<span className="pr-1 text-[12px] font-bold text-[var(--ink-3)]">2 of 3</span>} />
      <Progress at={2} />

      {/* The invitation — made from their details, shareable as it is. */}
      <section className="mx-4 mt-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FBF3FF] via-white to-[#F1E9FF] p-4 shadow-[0_0_0_1px_#EDE3FB]" data-plan-hero>
        <div className="flex items-start gap-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7C3AED]">Planned for you</p>
            <h2 className="mt-1 text-[22px] font-black leading-[1.08] tracking-[-0.035em]">Your {o.name.toLowerCase()} is planned.</h2>
            <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">Pick what you need. The right masters are matched live.</p>
          </div>
          <span className="w-[96px] shrink-0 rotate-[3deg] drop-shadow-[0_14px_20px_rgba(91,33,182,.28)]"><InviteCard inv={inv} occasion={o} theme={inv.theme} size="mini" /></span>
        </div>
        <button type="button" onClick={() => navigate(`/o/${o.id}`)} className="mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left text-[12.5px] font-bold text-[#3B1670]" data-plan-facts>
          <span>{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</span>
          {ev.guests ? <span>{ev.guests.toLocaleString('en-IN')} guests</span> : null}
          {place?.area && <span>{place.area}</span>}
          <Pencil size={13} className="text-[var(--brand)]" />
        </button>
        <Link to={`/invites/new?o=${o.id}&step=review`} className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#DB2777]" data-plan-share><Share2 size={14} />Share the invitation</Link>
      </section>

      {/* Two ways to book: each service matched live, or one planner for all. */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-2" data-how>
        {[['each', LayoutGrid, 'I’ll organise', 'Matched live'], ['planner', ClipboardList, 'One planner', 'Runs it all']].map(([k, Icon, title, sub]) => (
          <button key={k} type="button" onClick={() => setHow(k)} aria-pressed={how === k} data-how-pick={k}
            className={'cx-press flex items-center gap-2.5 rounded-[16px] p-2.5 text-left transition-colors ' + (how === k ? 'bg-[#F1E9FF] shadow-[inset_0_0_0_1.5px_#7C3AED]' : 'bg-white shadow-[inset_0_0_0_1.5px_#E9E3F2]')}>
            <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-full ' + (how === k ? 'bg-[#7C3AED] text-white' : 'bg-[#F4EEFF] text-[var(--brand)]')}><Icon size={17} /></span>
            <span className="min-w-0"><span className="block text-[13.5px] font-extrabold">{title}</span><span className="block truncate text-[11px] font-semibold text-[var(--ink-3)]">{sub}</span></span>
          </button>
        ))}
      </div>

      <section className="mt-5 px-4" data-plan-list>
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-[17px] font-black tracking-[-0.025em]">{how === 'planner' ? 'Your planner arranges' : 'What would you like to arrange?'}</h3>
          {nearby?.n > 0 && <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-extrabold text-[#0B6B3D]" data-nearby><span className="cx-live-dot h-2 w-2 rounded-full bg-[#16A34A]" />{nearby.n}{nearby.more ? '+' : ''} nearby</span>}
        </div>
        <ul className="mt-2.5 divide-y divide-[#F1EDF7] overflow-hidden rounded-[18px] shadow-[0_0_0_1px_#EEE8F6]">
          {[...needed, ...offered].map(t => {
            const on = needed.includes(t)
            const said = needsSummary(t, plan.needsOf(o.id, t))
            return (
              <li key={t} className="bg-white" data-req={t} data-on={on}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? 'Remove' : 'Add'} ${TRADE[t].label}`} onClick={() => toggle(t)} data-req-check={t}
                    className={'cx-press grid h-6 w-6 shrink-0 place-items-center rounded-[7px] transition-colors ' + (on ? 'bg-[#7C3AED] text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_#CFC4E3]')}>
                    {on && <Check size={15} strokeWidth={3.2} />}
                  </button>
                  <button type="button" onClick={() => setSheet({ edit: t })} className="flex min-w-0 flex-1 items-center gap-3 text-left" data-req-open={t}>
                    <ArtFill art={serviceArt(t)} tone="#F6F1FF" className={'h-11 w-11 shrink-0 rounded-[12px] ' + (on ? '' : 'opacity-60')} inset="10%" />
                    <span className="min-w-0 flex-1">
                      <span className={'block truncate text-[14.5px] font-extrabold ' + (on ? '' : 'text-[var(--ink-2)]')}>{TRADE[t].label}</span>
                      <span className={'block truncate text-[11.5px] font-semibold ' + (said ? 'text-[#0B6B3D]' : 'text-[var(--ink-3)]')}>{said || (INCLUDES[t] ?? []).slice(0, 3).join(', ') || TRADE[t].why}</span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-[var(--ink-3)]" />
                  </button>
                </div>
                {t === 'catering_food' && on && (
                  <div className="flex gap-1.5 px-3 pb-2.5 pl-[96px]" data-diet>
                    {DIETS.map(([k, l]) => (
                      <button key={k} type="button" onClick={() => plan.setNeeds(`${o.id}:catering_food`, { ...food, $diet: diet === k ? [] : [k] })} aria-pressed={diet === k} data-diet-pick={k}
                        className={'cx-press flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-bold ' + (diet === k ? 'bg-[#1C1033] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>
                        {k === 'mixed' ? <><Mark kind="veg" /><Mark kind="non_veg" /></> : <Mark kind={k} />}{l}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {custom.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5" data-custom>
            {custom.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-[#F4EEFF] py-1.5 pl-3 pr-1.5 text-[12.5px] font-bold text-[#3B1670]">
                {c}<button type="button" onClick={() => plan.setEvent({ custom: custom.filter((_, j) => j !== i) })} aria-label={`Remove ${c}`} className="grid h-5 w-5 place-items-center rounded-full bg-white"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setSheet('add')} className="cx-press flex h-11 shrink-0 items-center gap-1.5 rounded-[14px] px-3.5 text-[13px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-add-more><Plus size={16} />Add more</button>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[#FAF8FD] px-3 shadow-[inset_0_0_0_1px_#EEE9F5]">
            <input value={other} onChange={e => setOther(e.target.value.slice(0, 60))} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="Something else? Type it"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold outline-none placeholder:text-[#A79DB9]" data-other-input />
            {other.trim() && <button type="button" onClick={addCustom} className="shrink-0 text-[13px] font-extrabold text-[var(--brand)]" data-other-add>Add</button>}
          </label>
        </div>
      </section>

      <ActionBar>
        <button type="button" disabled={!needed.length} onClick={go} className="cx-press cx-cta flex h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] text-[16px] font-extrabold" data-find-live>
          <span className="cx-live-dot h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />{how === 'planner' ? 'Find my planner' : `Find my masters · ${needed.length}`}<Radar size={18} />
        </button>
      </ActionBar>

      {/* A service's own choices — optional; what is picked narrows the match. */}
      <Sheet open={!!sheet?.edit} onClose={() => setSheet(null)} title={sheet?.edit ? TRADE[sheet.edit].label : ''}
        footer={sheet?.edit ? (
          <button type="button" onClick={() => { if (!needed.includes(sheet.edit)) pick(sheet.edit, 'need'); setSheet(null) }} className="cx-press cx-cta h-12 w-full rounded-[16px] text-[14.5px] font-extrabold" data-edit-done>
            {needed.includes(sheet.edit) ? 'Done' : 'Add to my plan'}
          </button>
        ) : null}>
        {sheet?.edit && (() => {
          const qs = tradeQuestions(sheet.edit).filter(q => q.group === 'choose' && q.kind !== 'dishes' && q.key !== '$diet' && q.key !== '$years').slice(0, 2)
          const cur = plan.needsOf(o.id, sheet.edit)
          const set = (k, v) => plan.setNeeds(`${o.id}:${sheet.edit}`, { ...plan.needsOf(o.id, sheet.edit), [k]: v })
          return (
            <div className="space-y-3 pb-2" data-edit={sheet.edit}>
              <p className="text-[13px] font-semibold text-[var(--ink-2)]">{o.why?.[sheet.edit] ?? TRADE[sheet.edit].why}.</p>
              {qs.map(q => <Question key={q.key} q={q} value={cur[q.key] ?? []} onChange={v => set(q.key, v)} occasion={o} typed={cur[q.key + '__typed'] ?? []} onTyped={v => set(q.key + '__typed', v)} />)}
            </div>
          )
        })()}
      </Sheet>

      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Add a requirement">
        <ul className="max-h-[60dvh] overflow-y-auto pb-3" data-add-list>
          {rest.map(t => (
            <li key={t}>
              <button type="button" onClick={() => { pick(t, 'need'); setSheet(null) }} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-2.5 text-left last:border-0">
                <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-10 w-10 shrink-0 rounded-[12px]" inset="10%" />
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{TRADE[t].label}</span><span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{TRADE[t].why}</span></span>
                <Plus size={18} className="shrink-0 text-[var(--brand)]" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </main>
  )
}

/* The marks every Indian food packet carries: a dot for veg, a triangle for non-veg. */
function Mark({ kind }) {
  const c = kind === 'veg' ? '#0C831F' : '#A0381B'
  return (
    <span className="grid h-[14px] w-[14px] shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-white" style={{ borderColor: c }}>
      {kind === 'veg' ? <span className="h-[6px] w-[6px] rounded-full" style={{ background: c }} />
        : <span className="h-[6px] w-[7px]" style={{ background: c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />}
    </span>
  )
}
