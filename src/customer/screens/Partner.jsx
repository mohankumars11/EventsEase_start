/**
 * One partner, as the partner built them.
 *
 * ── The same storefront the partner previews ───────────────────────
 * The body is <TradeListingCard> / <AnchorProfileCard> — the components
 * the partner app's "customer preview" renders from the same listing,
 * with the same media in the same order. A partner who checks their
 * preview is looking at this screen. Nothing on it is re-implemented
 * here, so the two cannot drift apart.
 *
 * What this screen adds is only the customer's side: back, save, and the
 * two actions at the foot.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, HandCoins, Heart, Loader2, Zap } from 'lucide-react'
import TradeListingCard from '../../components/customer/TradeListingCard'
import AnchorProfileCard from '../../components/customer/AnchorProfileCard'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { partnerDetail, partnersFor } from '../lib/market'
import { rupees } from '../lib/format'
import { ActionBar, BackHeader, Empty } from '../ui/kit'

export default function Partner() {
  const { serviceId } = useParams()
  const [q] = useSearchParams()
  const tradeId = q.get('t')
  const occasion = OCCASION[q.get('o')] ?? null
  const t = TRADE[tradeId]
  const navigate = useNavigate()
  const plan = usePlan()
  const [detail, setDetail] = useState(undefined)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let live = true
    partnerDetail(serviceId, tradeId).then(d => live && setDetail(d)).catch(() => live && setDetail(null))
    partnersFor(tradeId).then(l => live && setSummary(l.find(x => x.serviceId === serviceId) ?? null)).catch(() => {})
    return () => { live = false }
  }, [serviceId, tradeId])

  const occId = occasion?.id ?? null
  const line = plan.lineFor(occId, tradeId)
  const added = line?.serviceId === serviceId
  const saved = plan.isSaved(serviceId)
  const name = summary?.name ?? detail?.listing?.profile?.display_name ?? detail?.listing?.profile?.stage_name ?? ''

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
      <BackHeader title={name} sub={t ? `${t.label}${occasion ? ` · for ${occasion.name}` : ''}` : null}
        right={<button type="button" onClick={() => summary && plan.toggleSaved(summary)} aria-label={saved ? 'Saved' : 'Save'} aria-pressed={saved}
          className="cx-press cx-btn grid h-11 w-11 place-items-center rounded-full"><Heart size={19} className={saved ? 'fill-[#FF4D7E] text-[#FF4D7E]' : ''} /></button>} />

      {detail === undefined && <div className="grid place-items-center py-32"><Loader2 className="animate-spin text-[var(--brand)]" /></div>}
      {detail === null && <div className="pt-10"><Empty title="This master is not taking bookings" body="Their listing may be paused or under review." action={<Link to={`/s/${tradeId}`} className="font-extrabold text-[var(--brand)]">See other masters</Link>} /></div>}
      {detail && (detail.anchor ? (
        <AnchorProfileCard profile={detail.listing.profile ?? {}} city={detail.listing.city} media={detail.media}
          rating={detail.listing.rating ? Number(detail.listing.rating).toFixed(1) : null}
          reviewCount={detail.profile?.review_count ?? 0} verified
          packages={(detail.listing.packages ?? []).map(k => ({ ...k, inclusions: (k.inclusions ?? []).map(id => detail.listing.addons?.find(a => a.addon_id === id)?.label ?? id) }))} />
      ) : (
        <TradeListingCard listing={{ ...detail.listing, rating: detail.listing.rating, review_count: detail.profile?.review_count }} tradeName={t?.name} media={detail.media} />
      ))}

      {detail && (
        <ActionBar note={summary?.instant ? 'Instant: confirmed the moment you pay. Money is held until your event.' : 'They confirm availability before you pay.'}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(`/negotiate/${serviceId}?t=${tradeId}${occId ? `&o=${occId}` : ''}`)}
              className="cx-press cx-btn flex h-14 shrink-0 items-center gap-2 rounded-[18px] px-4 text-[14px] font-extrabold" data-negotiate>
              <HandCoins size={18} />Negotiate
            </button>
            {added ? (
              <button type="button" onClick={() => navigate('/plan')} className="cx-press flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-[var(--ok)] text-[15px] font-extrabold text-white">
                <Check size={18} strokeWidth={3} />In your plan · Review
              </button>
            ) : (
              <button type="button" disabled={!summary} onClick={() => summary && plan.add(summary, occId)} data-add-plan
                className="cx-press cx-cta flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold">
                {summary?.instant && <Zap size={17} className="fill-[var(--gold)] text-[var(--gold)]" />}
                Add to plan{summary?.fromPaise ? <span className="cx-num font-bold opacity-80">· {rupees(summary.fromPaise)}{summary.fromKind === 'package' ? '' : ` ${summary.fromUnit}`}</span> : null}
              </button>
            )}
          </div>
        </ActionBar>
      )}
    </main>
  )
}
