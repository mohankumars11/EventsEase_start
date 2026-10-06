import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, PackagePlus, Pencil, Plus, Store } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import SambramoPricingStudio from '../../../components/vendor/SambramoPricingStudio'
import { ensureVendorRow } from '../../../lib/ensureVendor'
import SambramoTradePictogram from '../../../components/vendor/SambramoTradePictogram'

export default function BusinessServicesStep() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { loading, account, refresh, profile } = usePartnerOnboarding()
  const vendor = account.vendor
  const listings = account.listings ?? []
  const pricingByService = account.pricing?.byService ?? {}
  const [saving, setSaving] = useState(false)
  const [serviceNavBusy, setServiceNavBusy] = useState(false)
  const [error, setError] = useState('')
  const [pricingService, setPricingService] = useState(null)

  const serviceRows = useMemo(() => listings.flatMap(listing =>
    (listing.offerings ?? []).map(offering => ({
      listing, offering, pricing: pricingByService[offering.id] ?? { ready: false, live: 0, draft: 0, review: 0 },
    }))
  ), [listings, pricingByService])

  const allReady = serviceRows.length > 0
    && serviceRows.every(row => ['live','under_review'].includes(row.listing.derived))
    && serviceRows.every(row => row.pricing.ready)

  async function openServicePicker() {
    if (serviceNavBusy || saving) return
    setServiceNavBusy(true)
    setError('')
    try {
      let activeVendor = vendor
      if (!activeVendor?.id) {
        const ensured = await ensureVendorRow({ profile })
        if (!ensured?.id) throw new Error(ensured?.reason ?? 'We could not prepare your partner profile. Please try again.')
        await refresh()
        activeVendor = { ...(account.vendor ?? {}), id: ensured.id }
      }
      navigate('/partner/services?from=setup')
    } catch (e) {
      setError(e?.message ?? 'Could not open the service picker.')
    } finally {
      setServiceNavBusy(false)
    }
  }

  async function saveAndContinue() {
    if (saving || !vendor?.id) return
    if (!allReady) return
    setSaving(true); setError('')
    try {
      await refresh()
      navigate('/partner/setup/area')
    } catch (e) {
      setError(e?.message ?? 'Could not continue to service area.')
    } finally { setSaving(false) }
  }


  if (loading) return <div className="native-screen flex items-center justify-center bg-white"><Loader2 size={26} className="animate-spin text-plum-600" /></div>

  if (pricingService) return (
    <div className="native-screen flex flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6">
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

  return (
    <StepShell stepId="business" cta={allReady ? 'Continue to service area & availability' : 'Choose services & pricing'} canContinue={allReady} busy={saving} onContinue={saveAndContinue}>
      <h1 className="partner-title">Services &amp; pricing</h1>
      <p className="partner-subtitle">Choose the trades you actually provide. Then create one customer-ready package and price it.</p>



      {params.get('serviceAdded') && (
        <section className="mt-4 rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
              <Check size={14} strokeWidth={3} />
            </span>
            <div>
              <p className="text-[13px] font-extrabold text-forest-800">Service added successfully</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest-800/80">
                Your service is ready. Configure its pricing below, then continue to service area & availability.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Customer-ready services</p><h2 className="mt-1 text-[18px] font-extrabold text-ink">{serviceRows.length} service{serviceRows.length === 1 ? '' : 's'} configured</h2></div><button type="button" disabled={serviceNavBusy || saving} onClick={openServicePicker} className="flex h-9 items-center gap-1.5 rounded-full bg-plum-50 px-3 text-[11px] font-extrabold text-plum-700 disabled:opacity-50"><Plus size={14} /> {serviceNavBusy ? 'Opening…' : 'Add service'}</button></div>
        {!serviceRows.length ? <button type="button" data-action="choose-first-service" disabled={serviceNavBusy || saving} onClick={openServicePicker} className="mt-4 w-full rounded-2xl border border-dashed border-plum-200 bg-plum-50/40 p-5 text-center transition active:scale-[0.99] disabled:opacity-50"><PackagePlus size={22} className="mx-auto text-plum-600" /><p className="mt-2 text-[13px] font-extrabold text-ink">Choose your first service</p><p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Tap here to choose Photography, Catering, Logistics or any other service you provide.</p><span className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-full bg-plum-700 px-4 text-[12px] font-extrabold text-white">Choose a service</span></button> : <ul className="mt-4 space-y-2.5">{listings.map(listing => (listing.offerings ?? []).map(offering => { const pricing = pricingByService[offering.id] ?? {}; const listingReady = ['live','under_review'].includes(listing.derived); const priceReady = !!pricing.ready; return <li key={offering.id}><div className="rounded-[20px] bg-surface p-3.5 ring-1 ring-ink/[0.06]"><div className="flex items-start gap-3"><span className="relative shrink-0"><SambramoTradePictogram trade={listing.trade} size="md" showSparkle={false} title={false} /><span className={"absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white " + (listingReady && priceReady ? 'bg-forest-600 text-white' : 'bg-white text-plum-700')}>{listingReady && priceReady ? <Check size={10} strokeWidth={3} /> : <PackagePlus size={9} />}</span></span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-extrabold text-ink">{offering.name || listing.trade}</p><p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-mute">{listing.trade}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className={"rounded-full px-2 py-1 text-[9.5px] font-extrabold " + (listingReady ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800')}>{listingReady ? 'Listing ready' : 'Listing needs setup'}</span><span className={"rounded-full px-2 py-1 text-[9.5px] font-extrabold " + (priceReady ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800')}>{priceReady ? 'Pricing ready' : 'Pricing needed'}</span></div></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => navigate('/dashboard/vendor?tab=list&edit=' + encodeURIComponent(listing.id) + '&return=setup')} className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-white text-[11.5px] font-extrabold text-plum-700 ring-1 ring-ink/[0.08]"><Pencil size={14} /> {listingReady ? 'Edit listing' : 'Configure listing'}</button><button type="button" disabled={!listingReady} onClick={() => setPricingService({ ...offering, category: listing.trade, trade: listing.trade })} className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-plum-700 text-[11.5px] font-extrabold text-white disabled:opacity-40"><PackagePlus size={14} /> {priceReady ? 'Manage pricing' : 'Set pricing'}</button></div></div></li> }))}</ul>}
      </section>

      <section className="mt-4 rounded-[20px] bg-plum-50 p-4 ring-1 ring-plum-100"><div className="flex items-center gap-2 text-[12px] font-extrabold text-plum-950"><Check size={14} /> One customer-ready offer per listed service</div><p className="mt-1.5 text-[11.5px] leading-relaxed text-plum-900/75">A partner can add more packages after going live. Onboarding needs one usable customer offer for every listed service that will be submitted.</p></section>
    </StepShell>
  )
}