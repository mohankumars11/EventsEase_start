import { useMemo, useState } from 'react'
import { Calculator, ChevronRight, CircleCheck, PackagePlus, UtensilsCrossed } from 'lucide-react'
import CateringPricingStudio from './CateringPricingStudio'
import TradePricingEditor from './TradePricingEditor'

const CATERING = 'Catering & Food'

export default function SambramoPricingStudio({ vendor, services = [], onOpenListings = null }) {
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const serviceRows = Array.isArray(services) ? services : []
  const listed = useMemo(
    () => serviceRows.filter(s => String(s?.category ?? '').trim() && s?.id),
    [serviceRows],
  )
  const selected = listed.find(s => s.id === selectedServiceId) ?? null

  if (selected?.category === CATERING) {
    return <CateringPricingStudio vendor={vendor} service={selected}
      onBack={() => setSelectedServiceId(null)} onOpenListings={onOpenListings} />
  }

  if (selected) {
    return <TradePricingEditor vendor={vendor} service={selected}
      onBack={() => setSelectedServiceId(null)} onOpenListings={onOpenListings} />
  }

  if (!listed.length) {
    return (
      <section className="rounded-[28px] bg-white p-5 ring-1 ring-ink/[0.07]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum-50 text-plum-700"><Calculator size={22}/></div>
        <h2 className="mt-4 text-[21px] font-extrabold text-plum-950">Pricing starts with a listing.</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">Add the service you actually provide. Sambramo will then open the pricing controls that belong to that service.</p>
        {onOpenListings && <button type="button" onClick={onOpenListings} className="mt-4 w-full rounded-2xl bg-plum-700 py-3 text-[13px] font-extrabold text-white">Go to my listings</button>}
      </section>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-950 via-plum-800 to-violet-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Calculator size={20}/></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">Partner pricing</p>
            <h2 className="mt-1 text-[23px] font-extrabold leading-tight">Price what you actually sell.</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">Only the services you have actually listed appear here. Select a listing to open its trade-specific pricing studio.</p>
          </div>
        </div>
      </section>

      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">Your listed services</p>
        <h3 className="mt-0.5 text-[19px] font-extrabold text-ink">{listed.length} service{listed.length === 1 ? '' : 's'} available to price</h3>
      </div>

      <div className="space-y-2.5">
        {listed.map(service => {
          const catering = service.category === CATERING
          return (
            <button key={service.id} type="button" onClick={() => setSelectedServiceId(service.id)}
              className="w-full rounded-[24px] bg-white p-4 text-left ring-1 ring-ink/[0.07] transition active:scale-[0.995]">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${catering ? 'bg-plum-50 text-plum-700' : 'bg-violet-50 text-violet-700'}`}>
                  {catering ? <UtensilsCrossed size={18}/> : <PackagePlus size={18}/>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14.5px] font-extrabold text-ink">{service.name || service.category}</span>
                    {catering && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[9.5px] font-extrabold text-forest-700">Pricing ready</span>}
                  </span>
                  <span className="mt-1 block text-[11.5px] text-ink-mute">
                    {catering ? 'Menu packages · per-guest pricing · structured extras' : 'Trade-specific packages · pricing rules · add-ons'}
                  </span>
                </span>
                <ChevronRight size={17} className="mt-1 shrink-0 text-ink-mute"/>
              </div>
            </button>
          )
        })}
      </div>

      <section className="rounded-[24px] bg-surface p-4">
        <div className="flex items-center gap-2 text-[12px] font-extrabold text-ink"><CircleCheck size={15} className="text-plum-600"/>Listing-driven by design</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">The global Sambramo trade catalogue is never used as a partner pricing picker. This screen only receives the partner's real service listings, and the backend stores each package against that exact listing.</p>
      </section>
    </div>
  )
}
