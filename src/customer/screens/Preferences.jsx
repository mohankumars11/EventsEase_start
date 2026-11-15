/**
 * Screen 3 of 5 — Preferences (Mohan, 2026-11-10 / 11).
 *
 * The plan says WHAT, this says HOW — and only the how that moves the
 * price or the match. Every service on the plan sits in a rail across the
 * top; below it, that service's few questions (data/prefSpecs, drawn by
 * ui/PrefPanel), every tile typeable. When they are answered, the
 * service's QUOTATION: what was chosen and what the masters nearby are
 * estimated at for exactly that (ui/QuoteCard). From there, two ways on:
 * send this one service to the masters now, or save it and do the next —
 * everything saved goes together from the Masters step at the end.
 *
 * Catering opens its menu card here (ui/MenuPick); a venue points to the
 * venues screen; video rides on photography's card, as it always has.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Home as HomeIcon, Pencil, Radar, Send, Trash2 } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { serviceArt } from '../data/art'
import { TRADE } from '../data/trades'
import { copyFor } from '../data/requirementCopy'
import { usePlan, needsFor } from '../state/PlanContext'
import { loadCuisines, loadDishes, loadExperienceTiers } from '../lib/needs'
import { savedWhere } from '../lib/where'
import { dayLabel } from '../lib/format'
import { recordProgress } from '../lib/progress'
import { estimateFor, rangeText } from '../lib/prefPrice'
import { supabase } from '../../lib/supabase'
import EventJourney from '../ui/EventJourney'
import { BackHeader, Sheet } from '../ui/kit'
import PrefPanel, { linesFor, questionsFor } from '../ui/PrefPanel'
import QuoteCard from '../ui/QuoteCard'

export default function Preferences() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const picks = o ? plan.picks[o.id] ?? {} : {}
  const p = useMemo(() => (valid ? needsFor(o, picks, ev) : null), [valid, o, picks, ev])
  const place = plan.place?.lat ? plan.place : savedWhere()
  const answers = o ? plan.answersOf(o.id) : {}
  const [, bump] = useState(0)
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase), loadExperienceTiers(supabase)]).then(() => bump(n => n + 1)).catch(() => {}) }, [])
  useEffect(() => { import('./LiveMatch').catch(() => {}); import('../lib/menuStudio').then(m => m.warmCatalogue()).catch(() => {}) }, [])
  /* Video rides on photography's card, as it always has. */
  const trades = (p?.needed ?? []).filter(t => !(t === 'videography' && p.needed.includes('photography')))
  const [sp] = useSearchParams()
  const [at, setAt] = useState(() => { const k = trades.indexOf(sp.get('t')); return k >= 0 ? k : 0 })
  /* ?t=photography&add=1 — a service booked from the Services tab for an
     event already being planned: it joins the plan and opens here. */
  const jumped = useRef(false)
  useEffect(() => {
    const want = sp.get('t')
    if (valid && want && TRADE[want] && sp.get('add') === '1' && picks[want] !== 'need') plan.setPick(o.id, want, 'need')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = trades.indexOf(sp.get('t'))
    if (k >= 0 && !jumped.current) { jumped.current = true; setAt(k) }
  }, [trades.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const [stage, setStage] = useState({}) // tradeId → 'ask' | 'quote'
  useEffect(() => { window.scrollTo(0, 0) }, [at, stage])
  /* The running estimate (Mohan, 2026-11-13: "estimated price should keep
     popping up … transparent"): every service on the plan, priced for
     exactly what was chosen so far, from the masters listed near the event. */
  const [run, setRun] = useState(null)
  const needsKey = JSON.stringify(trades.map(x => plan.needsOf(o?.id, x)))
  useEffect(() => {
    if (!o || !trades.length) return
    let live = true
    Promise.all(trades.filter(x => x !== 'venue').map(x => estimateFor(x, plan.needsOf(o.id, x), ev, place).catch(() => null))).then(rs => {
      if (!live) return
      const ok = rs.filter(r => r?.low != null)
      setRun({ low: ok.reduce((s, r) => s + r.low, 0) || null, high: ok.reduce((s, r) => s + r.high, 0) || null, priced: ok.length, of: rs.length })
    })
    return () => { live = false }
  }, [needsKey, ev.guests, ev.hours, place?.lat]) // eslint-disable-line react-hooks/exhaustive-deps
  /* "Continue" lands on the service being chosen. */
  const tNow = trades[Math.min(at, trades.length - 1)]
  useEffect(() => { if (o && tNow) recordProgress(o.id, 2, `/o/${o.id}/prefs?t=${tNow}`) }, [o?.id, tNow]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />
  if (!trades.length) return <Navigate to={`/o/${o.id}/plan`} replace />

  const i = Math.min(at, trades.length - 1)
  const t = trades[i]
  const cur = plan.needsOf(o.id, t)
  const noQuote = t === 'venue'
  const st = noQuote ? 'ask' : stage[t] ?? (cur.$done ? 'quote' : 'ask')
  const label = x => TRADE[x]?.label ?? copyFor(o, x).title
  /* "Catering", "Photography", "Décor" — what fits on a button. */
  const short = x => label(x).replace(/ & .*$/, '').replace(/^Event /, '').toLowerCase()
  const done = x => !!plan.needsOf(o.id, x).$done
  const on = x => p.rows.find(r => r.tradeId === x)?.state === 'need'
  const pick = (x, v) => plan.setPick(o.id, x, v)
  const mark = () => plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), $done: true })
  const last = i === trades.length - 1
  const lines = linesFor(o, t, cur, ev)
  const { line } = questionsFor(o, t, ev)
  const art = serviceArt(t)

  const toQuote = () => setStage(s => ({ ...s, [t]: 'quote' }))
  /* Back to the questions — and, from a line on the quotation, to THAT question. */
  const toAsk = label => {
    setStage(s => ({ ...s, [t]: 'ask' }))
    if (typeof label === 'string') setTimeout(() => { try { document.querySelector(`[data-field="${CSS.escape(label)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* no such field */ } }, 380)
  }
  const setNote = v => plan.setNeeds(`${o.id}:${t}`, { ...plan.needsOf(o.id, t), $instructions: v })
  /* Nothing goes to a master without a yes (Mohan, 2026-11-13: "are you
     sure you want to send this … every button should sync with every
     service"): one service now, or every quotation at the end, each
     behind a sheet that says what is being sent and to whom. */
  const [confirm, setConfirm] = useState(null) // 'one' | 'all'
  const goLive = only => {
    mark(); setConfirm(null)
    const nxt = only ? trades.find((x, k) => k > i && !done(x)) ?? trades.find(x => x !== only && !done(x)) : null
    navigate(only ? `/o/${o.id}/live?only=${only}${nxt ? `&next=${nxt}` : ''}` : `/o/${o.id}/live`)
  }
  const saveNext = () => { mark(); if (last) setConfirm('all'); else setAt(i + 1) }
  const sendNow = () => { mark(); setConfirm('one') }
  const choicesOf = x => linesFor(o, x, plan.needsOf(o.id, x), ev).length
  const back = () => { if (st === 'quote') toAsk(); else if (i > 0) setAt(i - 1); else navigate(`/o/${o.id}/plan`) }

  return (
    <main className={'cx-enter min-h-[100dvh] overflow-x-clip bg-white ' + (st === 'quote' ? 'pb-[calc(env(safe-area-inset-bottom,0px)+200px)]' : 'pb-[calc(env(safe-area-inset-bottom,0px)+124px)]')} data-preferences data-pref-stage={st}>
      <BackHeader title="Preferences" sub={o.name} onBack={() => navigate(`/o/${o.id}/plan`)} />
      <EventJourney at={2} occasionId={o.id} />

      <section className="px-4 pt-3">
        <h1 className="text-[22px] font-black leading-tight tracking-[-0.035em] text-[#1C1033]">Make it yours</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-2)]">A few quick choices per service — each one prices itself. Type your own answer anytime.</p>
      </section>

      {/* Every service on the plan: done ones ticked, the one being chosen lit. */}
      <div className="cx-noscroll mt-1 flex gap-2 overflow-x-auto px-4 pb-1 pt-2.5" data-pref-tabs>
        {trades.map((x, k) => {
          const a = serviceArt(x), here = k === i, ok = done(x)
          return (
            <button key={x} type="button" onClick={() => setAt(k)} aria-pressed={here} data-pref-tab={x} data-pref-done={ok ? '1' : '0'}
              className={'cx-press relative flex w-[82px] shrink-0 flex-col items-center rounded-[16px] p-1.5 pb-2 text-center transition-[background,box-shadow] ' + (here ? 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-[0_12px_22px_-12px_rgba(91,33,182,.95)]' : 'bg-white text-[#2E1A4F] shadow-[0_0_0_1.2px_#EEE9F5]')}>
              {/* The whole picture, never cropped (Mohan, 2026-11-11). */}
              <span className={'relative block h-[60px] w-full overflow-hidden rounded-[12px] ' + (here ? 'bg-white/90' : 'bg-[#F8F5FD]')}>
                {a?.src && <img src={a.src} alt="" className={a.kind === 'art' ? 'absolute inset-0 h-full w-full object-contain p-0.5' : 'absolute inset-[14%] h-[72%] w-[72%] object-contain'} loading="lazy" />}
              </span>
              <span className="mt-1 line-clamp-2 text-[10.5px] font-extrabold leading-[1.15]">{label(x)}</span>
              <span className={'absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white ' + (ok ? 'bg-[#16A34A] text-white' : here ? 'bg-[#FFD84A] text-[#5E3500]' : 'bg-[#E9E3F2] text-[#8E869E]')}>
                {ok ? <Check size={11} strokeWidth={3.4} /> : <span className="text-[9.5px] font-black">{k + 1}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {run && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-[14px] bg-[#FFFAEB] px-3 py-2 shadow-[inset_0_0_0_1px_#FBE7B5]" data-running-estimate>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#8A6A2A]">Your estimate so far</span>
            <span className="cx-num block truncate text-[15px] font-black text-[#1C1033]">{rangeText(run) ?? 'Priced as masters reply'}</span>
          </span>
          <span className="shrink-0 text-right text-[10.5px] font-bold leading-tight text-[#8A6A2A]">{run.priced} of {run.of} priced<br />from live listings</span>
        </div>
      )}

      {/* The service being chosen. */}
      <section key={t + st} className="cx-slide-in mx-3 mt-3" data-pref-service={t}>
        {st === 'ask' ? (
          <div className="rounded-[24px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-36px_rgba(58,18,144,.75)]">
            <div className="flex items-center gap-3">
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-[#F6F1FF]">
                {art?.src && <img src={art.src} alt="" className={art.kind === 'art' ? 'absolute inset-0 h-full w-full object-contain p-0.5' : 'absolute inset-[14%] h-[72%] w-[72%] object-contain'} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">Service {i + 1} of {trades.length} · for your {o.name.toLowerCase()}</p>
                <h2 className="truncate text-[19px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">{label(t)}</h2>
                {(line ?? copyFor(o, t).line) && <p className="truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{line ?? copyFor(o, t).line}</p>}
              </div>
            </div>
            <div className="mt-4">
              <PrefPanel o={o} t={t} ev={ev} place={place} plan={plan} answers={answers} video={on('videography')} onVideo={v => pick('videography', v ? 'need' : 'off')} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3">
              <button type="button" onClick={() => pick(t, 'have')} className="cx-press flex h-10 items-center justify-center gap-1.5 rounded-[13px] bg-[#F4F1F8] text-[12px] font-extrabold text-[var(--ink-2)]" data-pref-have><HomeIcon size={14} />I already have this</button>
              <button type="button" onClick={() => pick(t, 'skip')} className="cx-press flex h-10 items-center justify-center gap-1.5 rounded-[13px] bg-[#F4F1F8] text-[12px] font-extrabold text-[var(--ink-2)]" data-pref-skip><Trash2 size={14} />Not needed</button>
            </div>
          </div>
        ) : (
          <>
            <QuoteCard o={o} t={t} lines={lines} needs={cur} ev={ev} place={place} onEdit={toAsk} onNote={setNote} />
            <button type="button" onClick={toAsk} className="cx-press mx-auto mt-3 flex items-center gap-1.5 text-[12.5px] font-extrabold text-[var(--brand)]" data-pref-edit><Pencil size={13} />Change my choices</button>
          </>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-[var(--line)] bg-white/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="mx-auto max-w-[540px]">
          {st === 'quote' && (
            <button type="button" onClick={sendNow} className="cx-press mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-[13.5px] font-extrabold text-[var(--brand)] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-pref-send-now>
              <Send size={15} /><span className="truncate">Send {short(t)} quotation now</span>
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={back} aria-label="Previous" className="cx-press cx-btn grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[18px]" data-pref-back><ChevronLeft size={22} /></button>
            {st === 'ask' && !noQuote ? (
              <button type="button" onClick={toQuote} className="cx-press cx-cta flex h-[56px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-pref-next>
                <span className="truncate">See {short(t)} quotation</span><ChevronRight size={18} className="shrink-0" />
              </button>
            ) : (
              <button type="button" onClick={saveNext} className={'cx-press flex h-[56px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold text-white ' + (last ? 'bg-gradient-to-r from-[#16A34A] to-[#0B7A45] shadow-[0_12px_24px_-14px_rgba(11,122,69,.95)]' : 'cx-cta')} data-pref-save>
                {last ? <><span className="cx-live-dot h-2.5 w-2.5 rounded-full bg-[#BBF7D0]" />Save &amp; find my masters<Radar size={18} /></> : <><span className="truncate">Save · next: {label(trades[i + 1])}</span><ChevronRight size={18} className="shrink-0" /></>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Are you sure? — what goes, to whom, and that nothing is paid now. */}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'one' ? `Send your ${label(t).toLowerCase()} quotation?` : `Send ${trades.length === 1 ? 'your quotation' : `all ${trades.length} quotations`}?`}>
        <div className="space-y-3 pb-2" data-confirm-send={confirm ?? ''}>
          {confirm === 'one' ? (
            <>
              <ul className="divide-y divide-[#EEE8F8] rounded-[16px] bg-[#FAF8FD] px-3 py-1" data-confirm-lines>
                {(lines.length ? lines : [{ label: 'Package', value: 'Standard — the master quotes their usual' }]).slice(0, 7).map(l => (
                  <li key={l.label} className="flex items-start justify-between gap-3 py-2 text-[12.5px]"><span className="shrink-0 font-bold text-[var(--ink-3)]">{l.label}</span><span className="text-right font-extrabold text-[#1C1033]">{l.value}</span></li>
                ))}
              </ul>
              <p className="text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">Masters near <b>{place?.area ?? 'you'}</b> who do exactly this get your quotation and reply with an exact price for <b>{dayLabel(ev.date)}</b>. Nothing is paid now — you confirm the one you like.</p>
              <button type="button" onClick={() => goLive(t)} className="cx-press cx-cta flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-confirm-yes><Send size={16} />Yes, send my {label(t).toLowerCase()} quotation</button>
              <button type="button" onClick={() => { setConfirm(null); if (!last) setAt(i + 1) }} className="cx-press h-11 w-full rounded-[14px] bg-[#F4EEFF] text-[13px] font-extrabold text-[#4C1D95]" data-confirm-later>{last ? 'Not yet — keep it saved' : `Not yet — save it, next: ${label(trades[i + 1])}`}</button>
            </>
          ) : (
            <>
              <ul className="divide-y divide-[#EEE8F8] rounded-[16px] bg-[#FAF8FD] px-3 py-1" data-confirm-services>
                {trades.map(x => (
                  <li key={x} className="flex items-center gap-2.5 py-2 text-[13px]">
                    <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full ' + (done(x) ? 'bg-[#16A34A] text-white' : 'bg-[#EEE9F5] text-[#8E869E]')}><Check size={13} strokeWidth={3} /></span>
                    <span className="min-w-0 flex-1 truncate font-extrabold text-[#1C1033]">{label(x)}</span>
                    <span className="shrink-0 text-[11.5px] font-bold text-[var(--ink-3)]">{x === 'venue' ? 'partner venues' : choicesOf(x) ? `${choicesOf(x)} choices` : 'standard package'}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">Each quotation goes to the masters near <b>{place?.area ?? 'you'}</b> who fit it, for <b>{dayLabel(ev.date)}</b>. They reply with exact prices; you compare, accept and only then pay.</p>
              <button type="button" onClick={() => goLive(null)} className="cx-press flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#16A34A] to-[#0B7A45] text-[15px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(11,122,69,.95)]" data-confirm-all><Radar size={17} />Send &amp; find my masters</button>
              <button type="button" onClick={() => setConfirm(null)} className="cx-press h-11 w-full rounded-[14px] bg-[#F4EEFF] text-[13px] font-extrabold text-[#4C1D95]" data-confirm-edit>Keep editing</button>
            </>
          )}
        </div>
      </Sheet>
    </main>
  )
}
