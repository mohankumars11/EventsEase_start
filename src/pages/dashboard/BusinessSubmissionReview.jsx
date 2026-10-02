import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Clock3, Eye, FileCheck2, Layers3, Loader2, MapPin, Ruler, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { normalizeTrade, PRICING_STATES, pricingReadiness } from '../../data/sambramoBusinessPreview'

function money(value) {
  const n = Number(value)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    : 'Engine calculated'
}

function SnapshotCard({ listing }) {
  const config = normalizeTrade(listing.trade, listing.trade_id)
  const offerings = listing.offerings ?? []

  return (
    <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.08] shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-plum-950 via-plum-600 to-saffron-400" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">{config.trade_id} · {config.name}</p>
            <h2 className="mt-1 text-[17px] font-black text-ink">{config.name}</h2>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-800 ring-1 ring-amber-200">
            Submitted snapshot
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {offerings.length === 0 ? (
            <div className="rounded-2xl bg-amber-50 px-3 py-3 text-[12px] font-semibold text-amber-900">No sellable offering was captured in this version.</div>
          ) : offerings.map((o) => {
            const lane = ['E09','E20','L08'].includes(config.trade_id) ? 'INSTANT_QUOTE' : 'CONFIGURED'
            return (
              <article key={o.id} className="rounded-[18px] bg-page-sunk p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-extrabold text-ink">{o.name || 'Untitled offering'}</h3>
                    <p className="mt-0.5 text-[10.5px] text-ink-mute">{o.unit || 'per booking'} · minimum {o.min_quantity ?? 1}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-extrabold uppercase tracking-wide text-ink-mute">Partner input</p>
                    <p className="mt-0.5 text-[14px] font-black text-plum-950">{money(o.price)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {config.fields.map(f => {
                    const value = o.specs?.[f.key]
                    if (value === undefined || value === null || value === '') return null
                    return (
                      <span key={f.key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-soft ring-1 ring-ink/[0.06]">
                        {f.label}: {String(value)}
                      </span>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10.5px] font-bold text-plum-700">
                  <ShieldCheck size={12} /> {PRICING_STATES[lane]?.label}: {PRICING_STATES[lane]?.detail}
                </div>
              </article>
            )
          })}
        </div>

        {config.siteMode !== 'NONE' && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-plum-300 bg-plum-50 px-3 py-2.5 text-[11px] font-bold text-plum-800">
            <Ruler size={13} /> This trade can require measurement / survey before a final price.
          </div>
        )}
      </div>
    </section>
  )
}

export default function BusinessSubmissionReview() {
  const navigate = useNavigate()
  const { submissionId } = useParams()
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let alive = true
    async function load() {
      const { data, error } = await supabase
        .from('sambramo_business_submissions')
        .select('id, vendor_id, verification_case_id, revision_no, status, payload, submitted_at, reviewed_at, published_at, review_note')
        .eq('id', submissionId)
        .maybeSingle()

      if (!alive) return
      if (error) setState({ loading: false, data: null, error: error.message })
      else setState({ loading: false, data, error: '' })
    }
    load()
    return () => { alive = false }
  }, [submissionId])

  if (state.loading) return <div className="min-h-[100dvh] grid place-items-center"><Loader2 className="animate-spin text-plum-700" /></div>
  if (state.error || !state.data) return (
    <div className="min-h-[100dvh] bg-page p-6">
      <p className="text-sm font-extrabold text-ink">Submission could not be loaded.</p>
      <p className="mt-1 text-xs text-ink-mute">{state.error || 'The snapshot no longer exists.'}</p>
      <button onClick={() => navigate('/dashboard/admin')} className="mt-4 rounded-full bg-plum-950 px-4 py-2 text-xs font-extrabold text-white">Back to admin</button>
    </div>
  )

  const snapshot = state.data.payload ?? {}
  const vendor = snapshot.vendor ?? {}
  const listings = snapshot.listings ?? []

  return (
    <div className="min-h-[100dvh] bg-page">
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-ink/10">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-plum-600">Sambramo operator console</p>
            <h1 className="truncate text-[16px] font-black text-ink">Customer storefront snapshot</h1>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-800 ring-1 ring-amber-200">
            Rev {state.data.revision_no}/3
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-4">
        <section className="rounded-[26px] bg-gradient-to-br from-plum-950 via-plum-800 to-plum-600 p-5 text-white shadow-[0_18px_48px_rgba(42,8,92,0.22)]">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-plum-200">Submitted version</p>
          <h2 className="mt-1 break-words text-[25px] font-black">{vendor.business_name || 'Partner business'}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70"><MapPin size={12} /> {vendor.city || 'Location not supplied'}{vendor.service_radius_km ? ` · ${vendor.service_radius_km} km radius` : ''}</p>
          <p className="mt-4 text-[12.5px] leading-relaxed text-white/80">{vendor.description || 'No business description was captured.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-white/10"><Clock3 size={11} /> Submitted {new Date(state.data.submitted_at).toLocaleString('en-IN')}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-white/10"><Layers3 size={11} /> {listings.length} trade{listings.length === 1 ? '' : 's'}</span>
          </div>
        </section>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            ['Submission', state.data.status],
            ['Revision', `Round ${state.data.revision_no} of 3`],
            ['Integrity', 'Immutable snapshot'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-ink/[0.07]">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</p>
              <p className="mt-1 text-[12px] font-extrabold text-ink">{String(value).replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>

        {state.data.review_note && (
          <div className="mt-4 rounded-[20px] bg-saffron-400/10 px-4 py-3 text-[12px] font-semibold text-saffron-900 ring-1 ring-saffron-300/40">
            Reviewer note: {state.data.review_note}
          </div>
        )}

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.15em] text-ink-mute">Exact customer-facing version</p>
              <p className="mt-1 text-[15px] font-black text-ink">Everything the partner submitted</p>
            </div>
            <Eye size={17} className="text-plum-700" />
          </div>
          <div className="space-y-3">
            {listings.length ? listings.map(listing => <SnapshotCard key={listing.id ?? listing.trade} listing={listing} />) : (
              <div className="rounded-[22px] bg-white p-7 text-center ring-1 ring-ink/[0.08]">
                <FileCheck2 className="mx-auto text-ink-mute" size={26} />
                <p className="mt-2 text-[13px] font-extrabold text-ink">No trade snapshot</p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex items-center gap-2 rounded-[20px] bg-forest-50 px-4 py-3 text-[11.5px] font-bold text-forest-800 ring-1 ring-forest-200">
          <BadgeCheck size={15} /> Approval and publishing remain operator-controlled in the verification queue.
        </div>
      </main>
    </div>
  )
}
