import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AddItemFlow from '../../components/vendor/AddItemFlow'
import { useVendorAccount } from '../../hooks/useVendorAccount'
import { configFor } from '../../data/trades'
import { afterSubmission, onboardPath } from '../../lib/tradeRoutes'

/**
 * /partner/onboard/:tradeId — one trade's own onboarding, opened directly.
 *
 * The service selector, the Jobs confirmation and More → My services all
 * open a trade here. It used to be `/dashboard/vendor?tab=list&start=…`,
 * which put the trade flow behind the dashboard: its loading state, its
 * terms gate, its tab handling and a `start` parameter consumed by an
 * effect on the Listing tab — any of which could leave the partner on a
 * dashboard tab instead of in their trade.
 *
 * The trade comes from the canonical registry id in the URL (the display
 * name is accepted too, for old links), so every trade resolves to its own
 * flow — Anchor & MC to AnchorOnboardingFlow, Catering & Food to its 13
 * stages, the rest to ListingOnboardingFlow — exactly as AddItemFlow
 * already decides. A trade the partner has already listed opens that
 * listing (edit), never a second one. Drafts are keyed per trade
 * (`<vendorId>:<tradeId>`), so opening one trade never touches another's.
 *
 *   submitted  → account into the operator queue → Jobs with ?submitted=
 *   Save & exit / Back → Jobs if they have a listing, else the selector
 */
export default function TradeOnboarding() {
  const { tradeId } = useParams()
  const navigate = useNavigate()
  const config = configFor(decodeURIComponent(tradeId ?? ''))
  const { loading, vendor, services, addService, updateService } = useVendorAccount()
  const existing = useMemo(
    () => (config ? services.find(s => s.category === config.name) ?? null : null),
    [services, config])

  useEffect(() => { document.getElementById('listing-scroll')?.scrollTo({ top: 0 }) }, [tradeId])

  if (!config) return <Navigate to="/partner/services" replace />
  if (loading) {
    return <div className="native-screen flex items-center justify-center bg-[#fbfaff]"><Loader2 size={26} className="animate-spin text-plum-600" /></div>
  }
  if (!vendor) return <Navigate to="/partner/setup" replace />

  const leave = () => navigate(services.length ? '/dashboard/vendor' : '/partner/setup', { replace: true })
  const onClose = (next, result) => {
    if (result) return afterSubmission(navigate, existing?.category ?? config.name, result)
    if (typeof next === 'string') { navigate(onboardPath(next), { replace: true }); return }
    leave()
  }

  return (
    <div data-screen="trade-onboarding" data-trade-id={config.id} className="native-screen bg-[#fbfaff]">
      <AddItemFlow
        key={`${config.id}:${existing?.id ?? 'new'}`}
        existing={services}
        startTrade={config.name}
        editing={existing}
        vendorId={vendor.id}
        onAdd={addService}
        onUpdate={updateService}
        onClose={onClose}
      />
    </div>
  )
}
