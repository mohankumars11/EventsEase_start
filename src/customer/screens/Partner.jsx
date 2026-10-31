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
 * two actions at the foot — and the customer's terms (2026-10-31): every
 * price as the customer pays it, how far the master is, and Sambramo's own
 * flow and cancellation policy instead of the listing's label.
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
import { toList } from '../../../api/_lib/listPrice.js'
import { rupees } from '../lib/format'
import { ActionBar, BackHeader, Empty } from '../ui/kit'

/* Every price on the storefront in the customer's terms — partner price +
   Sambramo margin, as on the masters list and the bill (api/_lib/listPrice.js).
   Without this the body showed the partner's own rate under a button that
   showed the customer's: ₹60,326 against ₹80,234 for one setup. */
function listed(x, tradeId) {
  if (Array.isArray(x)) return x.map(y => listed(y, tradeId))
  if (!x || typeof x !== 'object') return x
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'customer_paise' && Number(v) > 0 ? toList(Number(v), tradeId) : listed(v, tradeId)]))
}
const SAMBRAMO_TERMS = { cancellation: { title: 'Sambramo policy', body: 'Nothing to pay until they accept. After that, by how far away your event is.' } }

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
  const shown = detail ? listed(detail.listing, tradeId) : null
  const nearby = { km: summary?.distanceKm ?? null, area: plan.place?.area ?? null }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
      <BackHeader title={name} sub={t ? `${t.label}${occasion ? ` · for ${occasion.name}` : ''}` : null}
        right={<button type="button" onClick={() => summary && plan.toggleSaved(summary)} aria-label={saved ? 'Saved' : 'Save'} aria-pressed={saved}
          className="cx-press cx-btn grid h-11 w-11 place-items-center rounded-full"><Heart size={19} className={saved ? 'fill-[#FF4D7E] text-[#FF4D7E]' : ''} /></button>} />

      {detail === undefined && <div className="grid place-items-center py-32"><Loader2 className="animate-spin text-[var(--brand)]" /></div>}
      {detail === null && <div className="pt-10"><Empty title="This master is not taking bookings" body="Their listing may be paused or under review." action={<Link to={`/s/${tradeId}`} className="font-extrabold text-[var(--brand)]">See other masters</Link>} /></div>}
      {detail && (detail.anchor ? (
        <AnchorProfileCard profile={shown.profile ?? {}} city={shown.city} media={detail.media}
          rating={shown.rating ? Number(shown.rating).toFixed(1) : null}
          reviewCount={detail.profile?.review_count ?? 0} verified
          packages={(shown.packages ?? []).map(k => ({ ...k, inclusions: (k.inclusions ?? []).map(id => shown.addons?.find(a => a.addon_id === id)?.label ?? id) }))} />
      ) : (
        <TradeListingCard listing={{ ...shown, rating: shown.rating, review_count: detail.profile?.review_count }} tradeName={t?.name} media={detail.media}
          tradeIcon={t?.icon ?? null} nearby={nearby} customerTerms={SAMBRAMO_TERMS} />
      ))}

      {detail && (
        <ActionBar note="Add them, send your request — you pay only after they accept. Money is held until your event.">
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
                {summary?.instant && <Zap size={17} className="shrink-0 fill-[var(--gold)] text-[var(--gold)]" />}
                <span className="flex flex-col items-start leading-tight">
                  <span>Add to plan</span>
                  {summary?.fromPaise ? <span className="cx-num text-[11.5px] font-bold opacity-85">from {rupees(summary.fromPaise)}{summary.fromKind === 'package' ? '' : ` ${summary.fromUnit}`}</span> : null}
                </span>
              </button>
            )}
          </div>
        </ActionBar>
      )}
    </main>
  )
}
