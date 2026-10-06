import { useMemo, useState } from 'react'
import { Check, Loader2, PackagePlus, Pencil, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import SambramoPricingStudio from '../../../components/vendor/SambramoPricingStudio'
import { ensureVendorRow } from '../../../lib/ensureVendor'

export default function BusinessServicesStep() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { loading, account, refresh, profile } = usePartnerOnboarding()
  const vendor = account.vendor
  const listings = account.listings ?? []
  const pricingByService = account.pricing?.byService ?? {}
  const [saving, setSaving] = useState(false)
  const [serviceNavBusy, setServiceNavBusy] = useState(false)
  const [pricingService, setPricingService] = useState(null)

  const serviceRows = useMemo(() => listings.flatMap(listing =>
    (listing.offerings ?? []).map(offering => ({
      listing,
      offering,
      pricing: pricingByService[offering.id] ?? { ready: false, live: 0, draft: 0, review: 0 },
    }))
  ), [listings, pricingByService])

  const allReady = serviceRows.length > 0 &&
    serviceRows.every(row => ['live', 'under_review'].includes(row.listing.derived)) &&
    serviceRows.every(row => row.pricing.ready)

  async function openServicePicker() {
    if (serviceNavBusy || saving) return
    setServiceNavBusy(true)
    try {
      let activeVendor = vendor
      if (!activeVendor?.id) {
        const ensured = await ensureVendorRow({ profile })
        if (!ensured?.id) throw new Error(ensured?.reason ?? 'We could not prepare your partner profile.')
        activeVendor = { id: ensured.id }
      }
      await refresh()
      if (activeVendor?.id) navigate('/partner/services?from=setup')
    } catch (e) {
      console.error(e)
    } finally {
      setServiceNavBusy(false)
    }
  }

  async function saveAndContinue() {
    if (saving || !allReady) return
    setSaving(true)
    try {
      await refresh()
      navigate('/partner/setup/area')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="native-screen flex min-h-[100dvh] items-center justify-center bg-white"><Loader2 size={26} className="animate-spin text-plum-600" /></div>
  }

  if (pricingService) {
    return (
      <div className="native-screen partner-v2-screen flex min-h-[100dvh] flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto partner-v2-container pt-4">
          <SambramoPricingStudio
            vendor={vendor}
            services={[pricingService]}
            onboarding
            onExit={() => { setPricingService(null); refresh() }}
            onOpenListings={() => navigate('/dashboard/vendor?tab=list&start=' + encodeURIComponent(pricingService.category) + '&return=setup')}
          />
        </div>
      </div>
    )
  }

  return (
    <StepShell
      stepId="services"
      cta={allReady ? 'Continue to service area & availability' : 'Complete services & pricing'}
      canContinue={allReady}
      busy={saving}
      onContinue={saveAndContinue}
    >
      <div className="partner-v2-feature p-4">
        <p className="partner-v2-meta">Step 2 · services & pricing</p>
        <h2 className="mt-1 partner-v2-section-title">What do you offer?</h2>
        <p className="mt-1.5 partner-v2-body">Choose the trades you actually provide. Each selected trade gets its own catalogue and pricing controls.</p>
      </div>

      {params.get('serviceAdded') && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[18px] bg-forest-50 p-3.5 ring-1 ring-forest-200">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={14} strokeWidth={3} /></span>
          <div>
            <p className="text-[13px] font-extrabold text-forest-800">Service added</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest-800/80">Finish its listing and pricing below.</p>
          </div>
        </div>
      )}

      <section className="mt-4 partner-v2-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="partner-v2-meta">Customer-ready services</p>
            <h2 className="mt-1 partner-v2-section-title">{serviceRows.length} configured</h2>
          </div>
          <button
            type="button"
            disabled={serviceNavBusy || saving}
            onClick={openServicePicker}
            className="partner-v2-secondary inline-flex items-center gap-1.5 px-3"
          >
            <Plus size={14} /> {serviceNavBusy ? 'Opening…' : 'Add service'}
          </button>
        </div>

        {!serviceRows.length ? (
          <button
            type="button"
            disabled={serviceNavBusy || saving}
            onClick={openServicePicker}
            className="mt-4 flex w-full flex-col items-center rounded-[18px] border border-dashed border-plum-200 bg-plum-50/60 p-5 text-center active:scale-[0.99]"
          >
            <PackagePlus size={24} className="text-plum-600" />
            <p className="mt-2 text-[14px] font-extrabold text-ink">Choose your first service</p>
            <p className="mt-1 max-w-[270px] text-[11.5px] leading-relaxed text-ink-mute">Photography, Catering, Venue, Logistics and more.</p>
            <span className="mt-3 inline-flex min-h-[42px] items-center rounded-full bg-plum-700 px-4 text-[12px] font-extrabold text-white">Choose a service</span>
          </button>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {listings.map(listing => (listing.offerings ?? []).map(offering => {
              const pricing = pricingByService[offering.id] ?? {}
              const listingReady = ['live', 'under_review'].includes(listing.derived)
              const priceReady = !!pricing.ready
              return (
                <li key={offering.id}>
                  <div className="partner-v2-list-row">
                    <div className="partner-v2-mini-art bg-plum-50">
                      <img src="/assets/sambramo/trades/fallback.webp" alt="" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-extrabold text-ink">{offering.name || listing.trade}</p>
                      <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-mute">{listing.trade}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className={listingReady ? 'partner-v2-chip bg-forest-50 text-forest-700' : 'partner-v2-chip bg-amber-50 text-amber-800'}>{listingReady ? 'Listing ready' : 'Listing needed'}</span>
                        <span className={priceReady ? 'partner-v2-chip bg-forest-50 text-forest-700' : 'partner-v2-chip bg-amber-50 text-amber-800'}>{priceReady ? 'Pricing ready' : 'Pricing needed'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => navigate('/dashboard/vendor?tab=list&edit=' + encodeURIComponent(listing.id) + '&return=setup')} className="partner-v2-secondary inline-flex items-center justify-center gap-1.5"><Pencil size={14} /> {listingReady ? 'Edit listing' : 'Configure listing'}</button>
                    <button type="button" disabled={!listingReady} onClick={() => setPricingService({ ...offering, category: listing.trade, trade: listing.trade })} className="partner-v2-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-40"><PackagePlus size={14} /> {priceReady ? 'Manage pricing' : 'Set pricing'}</button>
                  </div>
                </li>
              )
            }))}
          </ul>
        )}
      </section>

      <section className="mt-4 partner-v2-feature p-4">
        <div className="flex items-center gap-2 text-[12px] font-extrabold text-plum-950"><Check size={14} /> One customer-ready offer per listed service</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-plum-900/75">Additional packages can be added after you go live. Finish one usable offer for each service submitted.</p>
      </section>
    </StepShell>
  )
}
