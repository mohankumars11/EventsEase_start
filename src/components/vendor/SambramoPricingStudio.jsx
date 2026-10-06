import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, CircleCheck, Clock3, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CateringPricingStudio from './CateringPricingStudio'
import SambramoTradePictogram from './SambramoTradePictogram'
import PricingPictogram from './PricingPictogram'
import TradePricingStudio from './TradePricingStudio'
import { normalizeTrade } from '../../data/sambramoBusinessPreview'
import { transactionLaneFor, transactionLaneCopy } from '../../lib/sambramoTransactionLane'

const CATERING = 'Catering & Food'

export default function SambramoPricingStudio({ vendor, services = [], onOpenListings = null, onExit = null, onboarding = false }) {
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [statusByService, setStatusByService] = useState({})
  const [revisionByService, setRevisionByService] = useState({})
  const [packageSummary, setPackageSummary] = useState({ live: 0, draft: 0, review: 0, revisions: 0 })
  const [loadingStatus, setLoadingStatus] = useState(false)

  const listed = useMemo(
    () => (Array.isArray(services) ? services : []).filter(s => String(s.category ?? '').trim()),
    [services],
  )
  const selected = listed.find(s => s.id === selectedServiceId) ?? null

  useEffect(() => {
    let alive = true
    const ids = listed.map(s => s.id).filter(Boolean)
    if (!ids.length) { setStatusByService({}); return }
    setLoadingStatus(true)
    Promise.all([
      supabase.from('sambramo_trade_packages').select('id,vendor_service_id,status,parent_package_id,revision_round').in('vendor_service_id', ids),
      supabase.from('sambramo_partner_price_books').select('vendor_service_id,status').in('vendor_service_id', ids),
      supabase.from('sambramo_catering_packages').select('id,vendor_service_id,status,parent_package_id').in('vendor_service_id', ids),
    ]).then(([packagesRes, pricesRes, cateringRes]) => {
      if (!alive) return
      const out = {}
      for (const id of ids) {
        const p = (packagesRes.data ?? []).filter(x => x.vendor_service_id === id)
        const pb = (pricesRes.data ?? []).filter(x => x.vendor_service_id === id && ['active','draft'].includes(x.status))
        const cp = (cateringRes.data ?? []).filter(x => x.vendor_service_id === id)
        out[id] = p.some(x => x.status === 'LIVE') || cp.some(x => x.status === 'ACTIVE')
          ? 'ENABLED'
          : p.some(x => ['UNDER_REVIEW','ACTION_REQUIRED'].includes(x.status))
            ? 'REVIEWING'
            : p.length || pb.length || cp.length ? 'CONFIGURED' : 'NOT_CONFIGURED'
      }
      setStatusByService(out)
      setRevisionByService(Object.fromEntries(ids.map(id => [id, (packagesRes.data ?? []).filter(x => x.vendor_service_id === id && (x.parent_package_id || Number(x.revision_round || 0) > 0)).length + (cateringRes.data ?? []).filter(x => x.vendor_service_id === id && x.parent_package_id).length])))
      const allPackages = [...(packagesRes.data ?? []), ...(cateringRes.data ?? [])]
      setPackageSummary({
        live: allPackages.filter(x => ['LIVE','ACTIVE'].includes(x.status)).length,
        draft: allPackages.filter(x => x.status === 'DRAFT').length,
        review: allPackages.filter(x => ['UNDER_REVIEW','ACTION_REQUIRED'].includes(x.status)).length,
        revisions: allPackages.filter(x => x.parent_package_id || Number(x.revision_round || 0) > 0).length,
      })
      setLoadingStatus(false)
    }).catch(() => { if (alive) setLoadingStatus(false) })
    return () => { alive = false }
  }, [listed])

  if (selected) {
    const config = normalizeTrade(selected.category, selected.trade_id)
    if (selected.category === CATERING) {
      return <CateringPricingStudio vendor={vendor} service={selected} onboarding={onboarding} onBack={() => (onboarding && onExit ? onExit() : setSelectedServiceId(null))} onOpenListings={onOpenListings} />
    }
    return <TradePricingStudio vendor={vendor} service={selected} config={config} onBack={() => (onboarding && onExit ? onExit() : setSelectedServiceId(null))} onOpenListings={onOpenListings} onboarding={onboarding} />
  }

  if (!listed.length) {
    return (
      <section className="rounded-[28px] bg-white p-5 ring-1 ring-ink/[0.07]">
        <SambramoTradePictogram trade="End-to-End Event Logistics" size="md" showSparkle={false} title={false} />
        <h2 className="mt-4 text-[21px] font-extrabold text-plum-950">Pricing starts with a listing.</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">Add the service you actually provide. Sambramo will then open the pricing controls that belong to that service.</p>
        {onOpenListings && <button type="button" onClick={onOpenListings} className="mt-4 w-full rounded-2xl bg-plum-700 py-3 text-[13px] font-extrabold text-white">Go to my listings</button>}
      </section>
    )
  }

  return (
    <div className="partner-mobile space-y-4 pb-6">
      {onboarding && onExit ? (
        <button type="button" onClick={onExit} className="rounded-full bg-plum-50 px-3 py-1.5 text-[11px] font-extrabold text-plum-700 ring-1 ring-plum-100">
          ← Back to Business, Services & Pricing
        </button>
      ) : null}
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <PricingPictogram />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">Partner pricing</p>
            <h2 className="mt-1 text-[23px] font-extrabold leading-tight">Price what you actually sell.</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">Only services already listed by this partner appear below. Each one opens its own trade-specific pricing catalog.</p>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusSummary label="Live" count={packageSummary.live} tone="bg-forest-50 text-forest-800" />
        <StatusSummary label="Draft" count={packageSummary.draft} tone="bg-surface text-ink-soft" />
        <StatusSummary label="Review" count={packageSummary.review} tone="bg-amber-50 text-amber-800" />
        <StatusSummary label="Revisions" count={packageSummary.revisions} tone="bg-plum-50 text-plum-700" />
      </section>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Your listed services</p>
        <h3 className="mt-0.5 text-[19px] font-extrabold text-ink">{listed.length} service{listed.length === 1 ? '' : 's'}</h3>
      </div>
      <div className="space-y-2.5">
        {listed.map(service => {
          const config = normalizeTrade(service.category, service.trade_id)
          const status = statusByService[service.id] ?? 'NOT_CONFIGURED'
          return (
            <button key={service.id} type="button" data-pricing-trade={service.category || service.trade || "trade"} onClick={() => setSelectedServiceId(service.id)} className="w-full rounded-[24px] bg-white p-4 text-left ring-1 ring-ink/[0.07] transition active:scale-[0.995]">
              <div className="flex items-start gap-3">
                <SambramoTradePictogram trade={service.category || service.trade} size="sm" showSparkle={false} title={false} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-extrabold text-ink">{service.name || service.category}</span>
                    <StatusPill status={status} loading={loadingStatus} />
                  </span>
                  <span className="mt-1 block text-[11.5px] text-ink-mute">{service.category === CATERING ? 'Menu packages · per-guest pricing · structured extras' : config.name + ' · trade-specific packages · pricing rules · add-ons'}</span>
                  <span className="mt-1.5 inline-flex rounded-full bg-plum-50 px-2 py-1 text-[9.5px] font-extrabold text-plum-700 ring-1 ring-plum-100">
                    {transactionLaneCopy(transactionLaneFor({ tradeId: service.trade_id, pricingUnit: service.unit }), { concise: true })}
                    {revisionByService[service.id] ? ` · ${revisionByService[service.id]} revision${revisionByService[service.id] === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
                <ChevronRight size={17} className="mt-1 shrink-0 text-ink-mute" />
              </div>
            </button>
          )
        })}
      </div>
      <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-start gap-2.5">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-plum-700" />
          <div>
            <p className="text-[12.5px] font-black text-ink">Pricing Control Center</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Live packages stay customer-live while any edited version becomes a new revision. Sambramo reviews the revision before the new price replaces the current one.</p>
          </div>
        </div>
      </section>
      <section className="rounded-[24px] bg-surface p-4">
        <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink"><CircleCheck size={15} className="text-plum-600" /> Listing-driven by design</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">A partner never configures pricing for an unrelated trade. The editor reads the exact vendor service listing and its captured capabilities.</p>
      </section>
    </div>
  )
}

function StatusSummary({ label, count, tone }) {
  return <div className={`rounded-2xl p-3 ring-1 ring-ink/[0.06] ${tone}`}>
    <p className="text-[9px] font-extrabold uppercase tracking-wide opacity-70">{label}</p>
    <p className="mt-1 text-[18px] font-black">{count}</p>
  </div>
}

function StatusPill({ status, loading }) {
  if (loading) return <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-extrabold text-ink-mute">Checking</span>
  if (status === 'ENABLED') return <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[9px] font-extrabold text-forest-700">Pricing enabled</span>
  if (status === 'REVIEWING') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold text-amber-800">Pricing under review</span>
  if (status === 'CONFIGURED') return <span className="rounded-full bg-plum-50 px-2 py-0.5 text-[9px] font-extrabold text-plum-700">Pricing configured</span>
  return <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-extrabold text-ink-mute">Not configured</span>
}
