import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, PackagePlus, Pencil, Plus, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import SambramoPricingStudio from '../../../components/vendor/SambramoPricingStudio'

export default function BusinessServicesStep() {
  const navigate = useNavigate()
  const { loading, account, refresh } = usePartnerOnboarding()
  const vendor = account.vendor
  const listings = account.listings ?? []
  const pricingByService = account.pricing?.byService ?? {}
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pricingService, setPricingService] = useState(null)

  useEffect(() => {
    if (!vendor) return
    setBusinessName(vendor.business_name ?? '')
    setDescription(vendor.description ?? '')
    setContactPhone(vendor.contact_phone ?? '')
  }, [vendor?.id, vendor?.business_name, vendor?.description, vendor?.contact_phone])

  const serviceRows = useMemo(() => listings.flatMap(listing =>
    (listing.offerings ?? []).map(offering => ({
      listing, offering, pricing: pricingByService[offering.id] ?? { ready: false, live: 0, draft: 0, review: 0 },
    }))
  ), [listings, pricingByService])

  const allReady = Boolean(String(businessName).trim())
    && serviceRows.length > 0
    && serviceRows.every(row => ['live','under_review'].includes(row.listing.derived))
    && serviceRows.every(row => row.pricing.ready)

  async function saveAndContinue() {
    if (saving || !vendor?.id) return
    if (!String(businessName).trim()) { setError('Business name is required.'); return }
    if (!allReady) return
    setSaving(true); setError('')
    try {
      const { error: err } = await supabase.from('vendors').update({
        business_name: businessName.trim(),
        description: description.trim() || null,
        contact_phone: contactPhone.trim() || null,
      }).eq('id', vendor.id)
      if (err) throw err
      await refresh()
      navigate('/partner/setup/area')
    } catch (e) {
      setError(e?.message ?? 'Could not save your business details.')
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
    <StepShell stepId="business" cta={allReady ? 'Continue to service area & availability' : 'Complete business, services & pricing'} canContinue={allReady} busy={saving} onContinue={saveAndContinue}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">Business, services &amp; pricing</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">Set up the business customers will book, define what you provide, and price each customer-ready service.</p>

      <section className="mt-5 rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><Store size={17} /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Business basics</p><p className="text-[12px] text-ink-mute">Email is already known from sign-in. These basics complete the business record.</p></div></div>
        <label className="mt-4 block"><span className="mb-1.5 block text-[12.5px] font-extrabold text-plum-950">Business name <span className="text-rose-600">*</span></span><input value={businessName} onChange={e => { setBusinessName(e.target.value); setError('') }} placeholder="Your registered business name" className="w-full rounded-2xl bg-surface px-4 py-3.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.10] outline-none focus:ring-2 focus:ring-plum-500" /></label>
        <label className="mt-3 block"><span className="mb-1.5 block text-[12.5px] font-extrabold text-plum-950">Contact number <span className="text-[10.5px] font-semibold text-ink-mute">(optional)</span></span><input value={contactPhone} onChange={e => setContactPhone(e.target.value)} inputMode="tel" placeholder="Can be added later" className="w-full rounded-2xl bg-surface px-4 py-3.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.10] outline-none focus:ring-2 focus:ring-plum-500" /></label>
        <label className="mt-3 block"><span className="mb-1.5 block text-[12.5px] font-extrabold text-plum-950">Business description <span className="text-[10.5px] font-semibold text-ink-mute">(optional)</span></span><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What customers should know about your business" className="w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-[13px] font-semibold leading-relaxed text-ink ring-1 ring-ink/[0.10] outline-none focus:ring-2 focus:ring-plum-500" /></label>
        {error && <p className="mt-3 rounded-2xl bg-rose-50 px-3.5 py-3 text-[12px] font-bold text-rose-700">{error}</p>}
      </section>

      <section className="mt-4 rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Customer-ready services</p><h2 className="mt-1 text-[18px] font-extrabold text-ink">{serviceRows.length} service{serviceRows.length === 1 ? '' : 's'} configured</h2></div><button type="button" onClick={() => navigate('/partner/services?from=setup')} className="flex h-9 items-center gap-1.5 rounded-full bg-plum-50 px-3 text-[11px] font-extrabold text-plum-700"><Plus size={14} /> Add service</button></div>
        {!serviceRows.length ? <div className="mt-4 rounded-2xl border border-dashed border-plum-200 bg-plum-50/40 p-5 text-center"><PackagePlus size={22} className="mx-auto text-plum-600" /><p className="mt-2 text-[13px] font-extrabold text-ink">Choose your first service</p><p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">Each service gets its own listing setup, pricing package and customer preview.</p></div> : <ul className="mt-4 space-y-2.5">{listings.map(listing => (listing.offerings ?? []).map(offering => { const pricing = pricingByService[offering.id] ?? {}; const listingReady = ['live','under_review'].includes(listing.derived); const priceReady = !!pricing.ready; return <li key={offering.id}><div className="rounded-[20px] bg-surface p-3.5 ring-1 ring-ink/[0.06]"><div className="flex items-start gap-3"><span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + (listingReady && priceReady ? 'bg-forest-600 text-white' : 'bg-plum-700 text-white')}>{listingReady && priceReady ? <Check size={17} strokeWidth={3} /> : <PackagePlus size={17} />}</span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-extrabold text-ink">{offering.name || listing.trade}</p><p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-mute">{listing.trade}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className={"rounded-full px-2 py-1 text-[9.5px] font-extrabold " + (listingReady ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800')}>{listingReady ? 'Listing ready' : 'Listing needs setup'}</span><span className={"rounded-full px-2 py-1 text-[9.5px] font-extrabold " + (priceReady ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800')}>{priceReady ? 'Pricing ready' : 'Pricing needed'}</span></div></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => navigate('/dashboard/vendor?tab=list&start=' + encodeURIComponent(listing.trade) + '&return=setup')} className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-white text-[11.5px] font-extrabold text-plum-700 ring-1 ring-ink/[0.08]"><Pencil size={14} /> {listingReady ? 'Edit listing' : 'Configure listing'}</button><button type="button" disabled={!listingReady} onClick={() => setPricingService({ ...offering, category: listing.trade, trade: listing.trade })} className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-plum-700 text-[11.5px] font-extrabold text-white disabled:opacity-40"><PackagePlus size={14} /> {priceReady ? 'Manage pricing' : 'Set pricing'}</button></div></div></li> }))}</ul>}
      </section>

      <section className="mt-4 rounded-[20px] bg-plum-50 p-4 ring-1 ring-plum-100"><div className="flex items-center gap-2 text-[12px] font-extrabold text-plum-950"><Check size={14} /> One customer-ready offer per listed service</div><p className="mt-1.5 text-[11.5px] leading-relaxed text-plum-900/75">A partner can add more packages after going live. Onboarding needs one usable customer offer for every listed service that will be submitted.</p></section>
    </StepShell>
  )
}