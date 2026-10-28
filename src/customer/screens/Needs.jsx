/**
 * What you need — one card per service in the plan. Each opens the brief
 * (screens/Brief.jsx): the partner's own questions, in the customer's
 * words, so the next screen shows only masters who do exactly that.
 *
 * Optional, but encouraged (Mohan, 2026-10-27): forcing every answer
 * stresses people, so the customer can go on at any time and come back —
 * the screen says plainly why answering is worth it (only the masters who
 * fit, not everyone), walks through the rest one tap at a time, and
 * "No preference" is a one-tap answer. Removing a service takes it out of
 * the plan.
 */
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, ListChecks, Target, X, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan, needsFor as planNeeds } from '../state/PlanContext'
import { answered, loadCuisines, loadDishes, needsFor } from '../lib/needs'
import { plural } from '../lib/format'
import { ActionBar, BackHeader, Journey, Sheet } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { needsSummary } from '../ui/needs'
import Buddy, { sambu } from '../ui/Buddy'

export default function Needs() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const [, setReady] = useState(0)
  const [removing, setRemoving] = useState(null)
  useEffect(() => { Promise.all([loadCuisines(supabase), loadDishes(supabase)]).then(() => setReady(n => n + 1)).catch(() => {}) }, [])
  if (!o) return <Navigate to="/" replace />
  const ev = plan.event.occasionId === o.id ? plan.event : { venue: 'need' }
  const { needed } = planNeeds(o, plan.picks[o.id] ?? {}, ev)
  const asking = needed.filter(t => needsFor(t).length)
  const isDone = t => answered(plan.needsOf(o.id, t)) > 0
  const done = asking.filter(isDone).length
  const left = asking.length - done
  const next = asking.find(t => !isDone(t))
  const pct = asking.length ? Math.round((done / asking.length) * 100) : 100
  /* Sambu's lines: always about the next tap, and why it is worth it. */
  const lines = left ? [
    done ? `Nice — ${done} done! You’re on ${TRADE[next].label} next. How many hours, what style? 20 seconds, I promise.` : `Hi, I’m Sambu! 👋 Tell me what you need from each service and I’ll work out your exact price — so you can pay instantly.`,
    `Still there? Just ${plural(left, 'more service')} to go — then your masters and prices are ready ⚡`,
    'No calls, no haggling, no waiting for quotes. Your answers ARE your price.',
    left === 1 ? 'Almost there! 🎉 One more and you’re done.' : `Feeling stuck? Tap “No preference” inside — that’s a fine answer too.`,
  ] : ['All done! 🎉 Your masters and their prices are ready — tap “Find my perfect masters”.']

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title="What you need" sub={o.name} />
      <Journey at={2} occasionId={o.id} />

      {/* Why this matters — said once, plainly. */}
      <section className="mx-3 mt-1 overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]" data-needs-intro>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]"><Zap size={13} className="fill-current" />Your answers are your price</p>
        <h2 className="mt-1 text-[21px] font-black leading-[1.12] tracking-[-0.035em]">Tell us what you need — we price it for you.</h2>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-[var(--ink-3)]">How many hours, how many guests, what style: we turn it into each master’s exact price and show only the ones who can do it. Add one and pay instantly — no calls, no waiting for quotes.</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[[ListChecks, 'Tap a service'], [Target, 'Hours & style'], [Zap, 'Your exact price']].map(([I, t], k) => (
            <span key={t} className="flex flex-col items-center gap-1 rounded-[14px] bg-[#FBF8F4] px-1 py-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F3ECFF] text-[var(--brand)]"><I size={14} /></span>
              <span className="text-[10.5px] font-extrabold leading-tight text-[var(--ink-2)]">{k + 1}. {t}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Progress */}
      <div className="mx-4 mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFE7DD]"><div className="h-full rounded-full bg-gradient-to-r from-[#16A34A] to-[#0C831F] transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        <span className="shrink-0 text-[12px] font-extrabold text-[var(--ink-2)]">{done} of {asking.length} done</span>
      </div>

      <div className="mt-3 space-y-2 px-3">
        {asking.map(t => {
          const sum = isDone(t) ? (needsSummary(t, plan.needsOf(o.id, t)) || 'Answered') : ''
          const first = t === next
          return (
            <div key={t} className={'flex items-center gap-2 rounded-[20px] bg-white p-2.5 transition ' + (sum ? 'shadow-[0_0_0_1.5px_#BFE6CC]' : first ? 'shadow-[0_0_0_2px_#7C3AED,0_12px_24px_-18px_rgba(91,33,182,.8)]' : 'shadow-[0_0_0_1px_#EFE7DD]')} data-needs={t} data-done={!!sum}>
              <button type="button" onClick={() => navigate(`/brief/${t}?o=${o.id}`)} className="cx-press flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="relative shrink-0">
                  <ArtFill art={serviceArt(t)} tone={sum ? '#E9F8EF' : '#FBEFE6'} className="h-14 w-14 rounded-[16px]" inset="10%" />
                  {sum && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#0C831F] text-white ring-2 ring-white"><Check size={12} strokeWidth={3.2} /></span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold tracking-[-0.02em]">{TRADE[t].label}</span>
                  <span className={'block truncate text-[12px] font-bold ' + (sum ? 'text-[#0B7A45]' : 'text-[var(--ink-3)]')}>{sum || 'Tap to choose what you want'}</span>
                </span>
                <span className={'shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ' + (sum ? 'bg-[#E9F8EF] text-[#0B6B3D]' : 'bg-[#4C1D95] text-white' + (first ? ' animate-pulse' : ''))}>{sum ? 'Edit' : 'Tell us'}</span>
              </button>
              <button type="button" onClick={() => setRemoving(t)} aria-label={`Remove ${TRADE[t].label}`} className="cx-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ink-3)] hover:bg-[#F6F1EA]" data-remove-need={t}><X size={16} /></button>
            </div>
          )
        })}
        {!asking.length && <p className="rounded-[18px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-2)]">These services need nothing more from you — the masters are ready.</p>}
      </div>

      <ActionBar note={left ? `Tip: tell us about ${plural(left, 'more service')} for exact matches — or go on and come back any time` : 'All set — we’ll show only the masters who fit'}>
        {left ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(`/brief/${next}?o=${o.id}&flow=1`)} className="cx-press cx-btn flex h-14 min-w-0 flex-1 items-center justify-center gap-1 rounded-[18px] px-3 text-[13.5px] font-extrabold" data-next-need>
              <span className="truncate">Next: {TRADE[next].label}</span>
            </button>
            <button type="button" onClick={() => navigate(`/o/${o.id}/match`)} className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-1.5 rounded-[18px] text-[14.5px] font-extrabold" data-find>
              Find my masters<ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => navigate(`/o/${o.id}/match`)} className="cx-press flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#0C831F] text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(12,131,31,.9)]" data-find>
            Find my perfect masters<ChevronRight size={18} />
          </button>
        )}
      </ActionBar>

      <Buddy id={`needs-${o.id}`} lines={lines} action={next ? { label: `Tell us about ${TRADE[next].label}`, onClick: () => navigate(`/brief/${next}?o=${o.id}&flow=1`) } : null} bottom={124}
        skip={left ? { label: 'In a hurry? See all masters', onClick: () => navigate(`/o/${o.id}/match`) } : null} />

      <Sheet open={!!removing} onClose={() => setRemoving(null)} title={removing ? `Remove ${TRADE[removing].label}?` : ''}>
        {removing && (
          <div className="pb-3">
            <p className="text-[13.5px] font-semibold text-[var(--ink-2)]">It comes off your plan. You can add it back from the plan screen any time.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRemoving(null)} className="cx-press cx-btn h-12 rounded-[16px] text-[14px] font-extrabold">Keep it</button>
              <button type="button" onClick={() => { sambu(`${TRADE[removing].label} is off your plan — add it back any time.`); plan.setPick(o.id, removing, 'skip'); setRemoving(null) }} className="cx-press h-12 rounded-[16px] bg-[#1C1033] text-[14px] font-extrabold text-white" data-confirm-remove>Remove</button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  )
}
