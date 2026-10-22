/**
 * The plan, reviewed: every partner picked, grouped by the celebration
 * they were picked for, split into what confirms instantly and what
 * waits for a quote.
 *
 * The amount here is the sum of "from" prices the customer can see on
 * each card — the floor, said as such. The exact total depends on hours,
 * guests and items, and the booking engine states it at checkout before
 * anything is charged.
 */
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock3, Trash2, Users, Zap } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { photoFor } from '../data/photos.generated'
import { usePlan } from '../state/PlanContext'
import { dayLabel, plural, rupees } from '../lib/format'
import { planFloor } from '../lib/estimate'
import { ActionBar, BackHeader, Empty, Photo } from '../ui/kit'

export default function PlanReview() {
  const plan = usePlan()
  const navigate = useNavigate()
  const groups = Object.values(plan.basket.reduce((m, l) => {
    const k = l.occasionId ?? 'solo'
    ;(m[k] ??= { occasionId: l.occasionId, lines: [] }).lines.push(l)
    return m
  }, {}))
  const instant = plan.basket.filter(l => l.instant)
  const quote = plan.basket.filter(l => !l.instant)
  const floor = planFloor(plan.basket, plan.event)
  const instantFloor = planFloor(instant, plan.event)

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title="Your plan" sub={plan.basket.length ? `${plural(plan.basket.length, 'partner')} · ${instant.length} instant · ${quote.length} on quote` : null} />
      {!plan.basket.length && (
        <div className="pt-8"><Empty title="Nothing in your plan yet" body="Pick an occasion and we will show you exactly what it needs."
          action={<Link to="/" className="cx-press cx-cta inline-flex h-12 items-center rounded-[16px] px-5 text-[14px] font-extrabold">Start planning</Link>} /></div>
      )}

      {groups.map(g => {
        const o = OCCASION[g.occasionId]
        const p = o ? photoFor(o.id) ?? photoFor(`cat:${o.category}`) : null
        const ev = o && plan.event.occasionId === o.id ? plan.event : null
        return (
          <section key={g.occasionId ?? 'solo'} className="mt-3">
            <div className="mx-4 flex items-center gap-3 rounded-[22px] bg-[var(--brand-deep)] p-2.5 pr-4 text-white">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-white/10"><Photo src={p?.url} className="absolute inset-0 h-full w-full object-cover" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-extrabold tracking-[-0.02em]">{o ? o.name : 'Single services'}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] font-bold text-white/70">
                  <span className="flex items-center gap-1"><CalendarDays size={13} />{plan.event.date ? dayLabel(plan.event.date) : 'Date not set'}</span>
                  {ev?.guests && <span className="flex items-center gap-1"><Users size={13} />{ev.guests.toLocaleString('en-IN')}</span>}
                </p>
              </div>
              {o && <Link to={`/o/${o.id}/match`} className="text-[12.5px] font-extrabold text-[#C9B2FF]">Edit</Link>}
            </div>
            <ul className="mx-4 mt-2 overflow-hidden rounded-[24px] shadow-[0_0_0_1px_var(--line)]">
              {g.lines.map((l, i) => {
                const t = TRADE[l.tradeId]
                return (
                  <li key={l.key} className={(i ? 'border-t border-[var(--line)] ' : '') + 'flex items-center gap-3 bg-white p-3'} data-line={l.tradeId}>
                    <Link to={`/p/${l.serviceId}?t=${l.tradeId}${l.occasionId ? `&o=${l.occasionId}` : ''}`} className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[17px] bg-[var(--brand-tint)]">
                      <Photo src={l.cover} className="absolute inset-0 h-full w-full object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--brand)]">{t?.label}</p>
                      <p className="truncate text-[14.5px] font-extrabold tracking-[-0.015em]">{l.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[12px] font-bold text-[var(--ink-2)]">
                        {l.fromPaise ? <span className="cx-num">{rupees(l.fromPaise)} <span className="font-semibold text-[var(--ink-3)]">{l.fromKind === 'package' ? 'package' : l.fromUnit}</span></span> : <span>On request</span>}
                        {l.instant
                          ? <span className="flex items-center gap-0.5 text-[#946200]"><Zap size={12} className="fill-[var(--gold)] text-[var(--gold)]" />Instant</span>
                          : <span className="flex items-center gap-0.5 text-[var(--ink-3)]"><Clock3 size={12} />Quote{l.quoteHours ? ` in ${l.quoteHours}h` : ''}</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => plan.remove(l.key)} aria-label={`Remove ${l.name}`} className="cx-press grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--ink-3)] active:bg-[var(--soft)]"><Trash2 size={17} /></button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {plan.basket.length > 0 && (
        <section className="cx-card mx-4 mt-5 p-4" aria-label="Summary">
          <Row k={`Confirms instantly (${instant.length})`} v={rupees(instantFloor.paise) ?? '—'} />
          <Row k={`Waits for a quote (${quote.length})`} v={quote.length ? 'After they reply' : '—'} />
          <div className="my-3 h-px bg-[var(--line)]" />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] font-extrabold">Your plan, from</p>
              <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{floor.open ? `${floor.open} priced by quantity at checkout · ` : ''}Exact total before you pay</p>
            </div>
            <p className="cx-num text-[26px] font-extrabold tracking-[-0.03em]">{rupees(floor.paise) ?? '—'}</p>
          </div>
        </section>
      )}

      {plan.basket.length > 0 && (
        <ActionBar note="Paid through Razorpay. Held in escrow until the partner delivers.">
          <button type="button" onClick={() => navigate('/checkout')} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-checkout>
            Continue to checkout<ArrowRight size={18} />
          </button>
        </ActionBar>
      )}
    </main>
  )
}

function Row({ k, v }) {
  return <div className="flex items-center justify-between py-1 text-[13.5px] font-bold"><span className="text-[var(--ink-2)]">{k}</span><span className="cx-num">{v}</span></div>
}
