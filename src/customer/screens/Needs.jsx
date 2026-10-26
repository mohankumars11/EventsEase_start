/**
 * What you need — one card per service in the plan, each asking that
 * service's questions in the customer's words (lib/needs.js). The next
 * screen then shows only masters who do exactly that. Every question is
 * optional; "Skip" shows everyone.
 */
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { serviceArt } from '../data/art'
import { usePlan, needsFor as planNeeds } from '../state/PlanContext'
import { loadCuisines, needsFor } from '../lib/needs'
import { plural } from '../lib/format'
import { ActionBar, BackHeader, Journey } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { NeedsPicker, needsSummary } from '../ui/needs'

export default function Needs() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const [, setReady] = useState(0)
  const [open, setOpen] = useState(null)
  useEffect(() => { loadCuisines(supabase).then(() => setReady(n => n + 1)).catch(() => {}) }, [])
  if (!o) return <Navigate to="/" replace />
  const ev = plan.event.occasionId === o.id ? plan.event : { venue: 'need' }
  const { needed } = planNeeds(o, plan.picks[o.id] ?? {}, ev)
  const asking = needed.filter(t => needsFor(t).length)
  const first = open ?? asking[0]
  const told = asking.filter(t => needsSummary(t, plan.needsOf(o.id, t))).length

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title="What you need" sub={o.name} />
      <Journey at={2} />
      <section className="px-4 pb-3 pt-1">
        <h2 className="text-[23px] font-black leading-[1.1] tracking-[-0.035em]">Tell us exactly what you want.</h2>
        <p className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">We’ll show only the masters who do it — no scrolling through everyone.</p>
      </section>
      <div className="space-y-2.5 px-3">
        {asking.map(t => {
          const on = t === first
          const sum = needsSummary(t, plan.needsOf(o.id, t))
          return (
            <section key={t} className={'overflow-hidden rounded-[20px] bg-white transition ' + (on ? 'shadow-[0_0_0_1.5px_#D9C6FF,0_14px_28px_-20px_rgba(58,18,144,.7)]' : 'shadow-[0_0_0_1px_#EFE7DD]')} data-needs={t}>
              <button type="button" onClick={() => setOpen(on ? '__none' : t)} className="flex w-full items-center gap-3 p-3 text-left">
                <ArtFill art={serviceArt(t)} tone="#FBEFE6" className="h-12 w-12 shrink-0 rounded-[14px]" inset="10%" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold tracking-[-0.02em]">{TRADE[t].label}</span>
                  <span className={'block truncate text-[12px] font-bold ' + (sum ? 'text-[#0B7A45]' : 'text-[var(--ink-3)]')}>{sum || 'Any master is fine — or tell us more'}</span>
                </span>
                <ChevronRight size={18} className={'shrink-0 text-[var(--ink-3)] transition ' + (on ? 'rotate-90' : '')} />
              </button>
              {on && (
                <div className="border-t border-[#F3EEF9] px-3.5 pb-4 pt-3">
                  <NeedsPicker tradeId={t} value={plan.needsOf(o.id, t)} onChange={v => plan.setNeeds(`${o.id}:${t}`, v)} />
                </div>
              )}
            </section>
          )
        })}
        {!asking.length && <p className="rounded-[18px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-2)]">These services need nothing more from you — the masters are ready.</p>}
      </div>
      <ActionBar note={told ? `${plural(told, 'service')} tailored to you` : 'Everything here is optional'}>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/o/${o.id}/match`)} className="cx-press cx-btn flex h-14 shrink-0 items-center gap-1.5 rounded-[18px] px-4 text-[13.5px] font-extrabold" data-skip-needs><SlidersHorizontal size={16} />Skip</button>
          <button type="button" onClick={() => navigate(`/o/${o.id}/match`)} className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-find>
            Find my masters<ChevronRight size={18} />
          </button>
        </div>
      </ActionBar>
    </main>
  )
}
