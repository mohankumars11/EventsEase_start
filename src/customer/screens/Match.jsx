/**
 * Find masters: for every service the occasion needs, the masters who can
 * do it, best first, one tap to put each in the cart — or "Best of each"
 * to fill every service with its top-ranked master at once.
 *
 * One rail per service rather than one long list, because the decision is
 * made per service ("which photographer?") and a family compares within a
 * trade, never across trades. The rail header says how many are live and
 * how many book instantly, so an empty or thin trade is visible before
 * anyone scrolls into it.
 */
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRight, Loader2, MessageSquareQuote, Scale, Wand2 } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { usePlan, needsFor } from '../state/PlanContext'
import { partnersFor, rank } from '../lib/market'
import { dayLabel, plural } from '../lib/format'
import { BackHeader, PlanBar, Journey } from '../ui/kit'
import { PartnerCard, PartnerCardSkeleton } from '../ui/cards'
import CompareSheet from './CompareSheet'

export default function Match() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const plan = usePlan()
  const [compare, setCompare] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!o) return <Navigate to="/" replace />
  const ev = plan.event.occasionId === o.id ? plan.event : { venue: 'need' }
  const { needed } = needsFor(o, plan.picks[o.id] ?? {}, ev)
  const chosen = needed.filter(t => plan.lineFor(o.id, t)).length
  const facts = [plan.event.date && dayLabel(plan.event.date), ev.guests && `${ev.guests.toLocaleString('en-IN')} ${o.people.toLowerCase()}`].filter(Boolean).join(' · ')

  async function bestOfEach() {
    setBusy(true)
    try {
      for (const t of needed) {
        if (plan.lineFor(o.id, t)) continue
        const top = rank(await partnersFor(t).catch(() => []))[0]
        if (top) plan.add(top, o.id)
      }
    } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+110px)]">
      <BackHeader title={`Masters for ${o.name}`} sub={facts || 'Add a date and guest count for exact prices'} />
      <Journey at={2} />
      <div className="px-4 pt-1">
        <div className="flex items-center gap-3 rounded-[20px] bg-[var(--brand-tint)] px-4 py-3">
          <div className="relative h-11 w-11 shrink-0">
            <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2D6FF" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(chosen / Math.max(needed.length, 1)) * 97.4} 97.4`} className="transition-all duration-500" />
            </svg>
            <span className="cx-num absolute inset-0 grid place-items-center text-[12px] font-extrabold text-[var(--brand-deep)]">{chosen}/{needed.length}</span>
          </div>
          <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-[var(--brand-deep)]">
            {chosen === needed.length && needed.length ? 'Every service has a master. Review your plan when ready.' : `Pick a master for each service — ${plural(needed.length - chosen, 'to go', 'to go')}.`}
          </p>
          {chosen < needed.length && (
            <button type="button" disabled={busy} onClick={bestOfEach} className="cx-press flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[var(--am-ink)] shadow-[0_0_0_1px_var(--am-300)]" data-best>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}Best of each
            </button>
          )}
        </div>
      </div>
      {needed.map(t => <Rail key={t} tradeId={t} occasion={o} onCompare={list => setCompare({ tradeId: t, list })} />)}
      <PlanBar withTabs={false} />
      <CompareSheet open={!!compare} onClose={() => setCompare(null)} tradeId={compare?.tradeId} partners={compare?.list ?? []} occasionId={o.id} />
    </main>
  )
}

function Rail({ tradeId, occasion, onCompare }) {
  const t = TRADE[tradeId]
  const plan = usePlan()
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let live = true
    partnersFor(tradeId).then(l => live && setList(rank(l))).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [tradeId])
  const line = plan.lineFor(occasion.id, tradeId)
  const instant = list?.filter(p => p.instant).length ?? 0
  return (
    <section className="mt-6" data-rail={tradeId}>
      <div className="flex items-end justify-between gap-3 px-4 pb-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.03em]"><t.icon size={19} className="text-[var(--brand)]" />{t.label}</h2>
          <p className="truncate text-[12.5px] font-semibold text-[var(--ink-3)]">
            {line ? <span className="font-extrabold text-[var(--ok)]">✓ {line.name}</span> : list ? `${plural(list.length, 'master')} live · ${instant} instant` : 'Finding masters…'}
          </p>
        </div>
        {list?.length > 1 && (
          <button type="button" onClick={() => onCompare(list.slice(0, 3))} className="cx-press cx-btn flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-extrabold">
            <Scale size={15} />Compare
          </button>
        )}
      </div>
      <div className="cx-rail cx-noscroll">
        {!list && !err && [0, 1, 2].map(i => <PartnerCardSkeleton key={i} className="w-[46%] max-w-[210px]" />)}
        {list?.map(p => (
          <PartnerCard key={p.serviceId} partner={p} className="w-[46%] max-w-[210px]" added={line?.serviceId === p.serviceId}
            href={`/p/${p.serviceId}?t=${tradeId}&o=${occasion.id}`}
            onAdd={x => (line?.serviceId === x.serviceId ? plan.remove(line.key) : plan.add(x, occasion.id))}
            saved={plan.isSaved(p.serviceId)} onSave={x => plan.toggleSaved(x)} />
        ))}
        {list?.length > 0 && (
          <Link to={`/s/${tradeId}?o=${occasion.id}`} className="cx-press cx-btn flex aspect-square w-[30%] max-w-[140px] flex-col items-center justify-center gap-2 self-start rounded-[22px] text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm"><ChevronRight size={20} /></span>
            <span className="text-[12.5px] font-extrabold">See all {list.length}</span>
          </Link>
        )}
        {(list?.length === 0 || err) && (
          <div className="w-[88%] rounded-[22px] bg-[var(--soft)] p-4">
            <p className="flex items-center gap-2 text-[14px] font-extrabold"><MessageSquareQuote size={18} className="text-[var(--brand)]" />No {t.label.toLowerCase()} live near you yet</p>
            <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-[var(--ink-2)]">{err ? 'We could not load masters just now. Go back and open this again.' : 'Masters for this are being verified. Your other services can still be booked now.'}</p>
          </div>
        )}
      </div>
    </section>
  )
}
