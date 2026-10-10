/**
 * The Pricing tab.
 *
 * Listings whose trade has a pricing profile (Anchor & MC) get the Pricing
 * Control Center, read from their published listing version. Every other
 * trade keeps SambramoPricingStudio until it is ported, so nothing that
 * works today changes for them.
 */
import { useMemo, useState } from 'react'
import { Loader2, Sparkles, ArrowRight, CircleAlert, Hourglass } from 'lucide-react'
import PricingControlCenter, { SeasonalUpdate } from './PricingControlCenter'
import TradePricing from './TradePricing'
import { useEngineReady, onEngine } from '../../../lib/tradeEngine'
import SambramoPricingStudio from '../SambramoPricingStudio'
import AnchorProfileCard from '../../customer/AnchorProfileCard'
import { Sheet } from '../anchor/ui'
import { hasProfileFor } from '../../../data/tradePricingProfiles'
import { useAnchorPricing } from '../../../hooks/useAnchorPricing'
import { ADDONS_V3, EVENT_GROUPS_V3, CANCELLATION_V3 } from '../anchor/options'
import { buildListingPayload } from '../anchor/payload'
import { rupees } from '../../../lib/tierPackages'
import { supabase } from '../../../lib/supabase'
import { useToast, friendlyError } from '../../../context/ToastContext'

const MODEL_UNIT = { hour: '/hr', multi_day: '/day' }
const MODEL_LABEL = { hour: 'Per hour', session: 'Per session', event: 'Per event', half_day: 'Half-day', full_day: 'Full-day', multi_day: 'Multi-day' }
const UNIT_LABEL = { per_event: 'per event', per_session: 'per session', per_hour: 'per hour', per_day: 'per day' }
const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const ROLE = { anchor: 'Anchor', mc: 'MC', both: 'Anchor & MC' }
const TRAVEL = { included_radius: 'Included within your area', flat: 'Flat outstation fee', per_km: 'Per km beyond your area', customer_arranged: 'Customer arranges travel & stay', custom: 'Custom quote' }
const label = id => ADDONS_V3.find(a => a.id === id)?.label ?? id
const title = t => t.charAt(0) + t.slice(1).toLowerCase()

export default function PricingTab({ vendor, services = [], onOpenListings, onEditListing, onOpenPayout }) {
  const engineReady = useEngineReady()
  const anchors = services.filter(s => hasProfileFor(s.category))
  const engine = engineReady ? services.filter(s => onEngine(s.category)) : []
  const others = services.filter(s => !hasProfileFor(s.category) && !engine.includes(s))
  if (engineReady === null && services.some(s => onEngine(s.category))) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>
  if (!anchors.length && !engine.length) return <SambramoPricingStudio vendor={vendor} services={services} onOpenListings={onOpenListings} />
  return (
    <div className="space-y-6">
      {anchors.map(s => <AnchorPricing key={s.id} service={s} onEdit={() => onEditListing?.(s)} onOpenPayout={onOpenPayout} />)}
      {engine.map(s => <TradePricing key={s.id} service={s} onEdit={() => onEditListing?.(s)} onOpenPayout={onOpenPayout} />)}
      {others.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Your other services</p>
          <SambramoPricingStudio vendor={vendor} services={others} onOpenListings={onOpenListings} />
        </div>
      )}
    </div>
  )
}

function AnchorPricing({ service, onEdit, onOpenPayout }) {
  const toast = useToast()
  const d = useAnchorPricing(service)
  const [sheet, setSheet] = useState(null)       // 'preview' | 'seasonal' | {tier}
  const [proposed, setProposed] = useState({})
  const [busy, setBusy] = useState(false)
  const answers = service.specs?.anchor_v3 ?? null

  const view = useMemo(() => d.current ? toView(d, service) : null, [d, service])

  if (d.loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div>
  if (d.empty || !view) {
    return (
      <div className="rounded-[22px] bg-gradient-to-br from-plum-50 to-white p-5 ring-1 ring-plum-100">
        <p className="text-[16px] font-extrabold text-plum-950">Finish your Anchor & MC setup</p>
        <p className="mt-1 text-[13px] text-ink/60">Your packages and prices appear here once you submit them.</p>
        <button type="button" onClick={onEdit} className="mt-4 flex h-11 items-center gap-1.5 rounded-full bg-plum-700 px-5 text-[13.5px] font-extrabold text-white">
          Continue setup <ArrowRight size={15} />
        </button>
      </div>
    )
  }

  const pendingOverLive = d.live && d.pending
  const banner = (<>
    {d.current.status === 'ACTION_REQUIRED' || d.current.status === 'REJECTED' ? (
      <div className="flex gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
        <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
        <div><p className="text-[13.5px] font-extrabold text-rose-900">Sambramo asked for changes</p>
          <p className="mt-0.5 text-[12.5px] text-rose-900/80">{d.current.review_note || 'Open your listing to see what to change.'}</p>
          <button type="button" onClick={onEdit} className="mt-2 text-[12.5px] font-extrabold text-rose-800 underline">Update listing</button></div>
      </div>
    ) : null}
    {pendingOverLive && (
      <div className="flex gap-2.5 rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200">
        <Hourglass size={17} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-[12.5px] font-semibold text-amber-900">
          Version {d.pending.version} is {d.pending.status === 'ACTION_REQUIRED' ? 'waiting for your changes' : 'with our team for review'}. Customers keep seeing your live prices until it is approved.
        </p>
      </div>
    )}
    {d.seasonal.filter(v => v.status === 'LIVE').map(v => (
      <div key={v.id} className="flex gap-2.5 rounded-[20px] bg-white p-4 ring-1 ring-amber-200">
        <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[12.5px] font-semibold text-ink/75">Seasonal prices are live for events from {fmt(v.effective_from)} to {fmt(v.effective_to)}.</p>
      </div>
    ))}
  </>)

  const liveRules = d.rules
  const seasonalFields = d.window ? liveRules.filter(r => d.window.permitted_fields?.includes(r.model)).map(r => ({
    id: r.model, label: `${MODEL_LABEL[r.model]} (you earn)`, current_paise: r.take_home_paise,
  })).concat(liveRules.filter(r => !d.window.permitted_fields?.includes(r.model)).map(r => ({
    id: r.model, label: MODEL_LABEL[r.model], current_paise: r.take_home_paise, locked: true,
  }))) : []

  async function submitSeasonal() {
    if (!answers) { toast.error('Open your listing once to refresh it, then try again.'); return }
    setBusy(true)
    try {
      const next = structuredClone(answers)
      for (const [model, rupeesTyped] of Object.entries(proposed)) {
        if (String(rupeesTyped).trim() !== '' && next.pricing?.[model]) next.pricing[model].rate = String(rupeesTyped)
      }
      const payload = buildListingPayload(next)
      const { error } = await supabase.rpc('submit_seasonal_listing_version', {
        p_vendor_service_id: service.id, p_window_id: d.window.id, p_payload: payload,
      })
      if (error) throw error
      toast.success('Seasonal prices sent for review.')
      setSheet(null); setProposed({}); d.reload()
    } catch (e) { toast.error(friendlyError(e)) } finally { setBusy(false) }
  }

  const pkg = typeof sheet === 'object' && sheet ? view.packages.find(p => p.tier === sheet.tier) : null

  return (
    <>
      <PricingControlCenter data={view} banner={banner}
        onEdit={onEdit} onPayout={onOpenPayout}
        onSeasonal={() => setSheet('seasonal')} onPreview={() => setSheet('preview')}
        onViewPackage={tier => setSheet({ tier })} />

      <Sheet open={sheet === 'preview'} onOpenChange={o => !o && setSheet(null)} title="What customers see">
        <AnchorProfileCard profile={d.current.profile} city={view.listing.city}
          packages={view.packages.map(p => ({ tier: p.tier, name: p.name, hours: p.hours, customer_paise: p.price_paise, inclusions: p.inclusions }))} />
      </Sheet>

      <Sheet open={sheet === 'seasonal'} onOpenChange={o => !o && setSheet(null)} title="Update seasonal prices">
        {d.window && (
          <SeasonalUpdate window={{ from: d.window.event_from, to: d.window.event_to }} fields={seasonalFields}
            value={proposed} onChange={setProposed} onSubmit={busy ? undefined : submitSeasonal} />
        )}
      </Sheet>

      <Sheet open={!!pkg} onOpenChange={o => !o && setSheet(null)} title={pkg ? pkg.name : ''}>
        {pkg && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-plum-50 p-4">
              <p className="text-[28px] font-extrabold text-ink">{rupees(pkg.price_paise)}</p>
              <p className="text-[12.5px] font-bold text-ink/55">Customer pays · you receive {rupees(pkg.take_home_paise)}</p>
              <p className="mt-1 text-[12px] font-bold text-plum-700">{pkg.edited ? 'Your price' : 'Recommended price'} · based on your {MODEL_LABEL[pkg.basis] ?? 'rate'}</p>
            </div>
            <Row k="Hours included" v={`${pkg.hours} hours`} />
            {pkg.extra_hour_paise && <Row k="Each extra hour" v={rupees(pkg.extra_hour_paise)} />}
            <p className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Included</p>
            {pkg.inclusions.length ? pkg.inclusions.map(i => <p key={i} className="text-[13px] font-semibold">✓ {i}</p>) : <p className="text-[13px] text-ink/55">Hosting only.</p>}
            <p className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Customer can add</p>
            {view.addons.filter(a => !a.in.includes(title(pkg.tier))).map(a => <Row key={a.name} k={a.name} v={`${rupees(a.paise)} ${a.unit}`} />)}
          </div>
        )}
      </Sheet>
    </>
  )
}

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-ink/[0.05] py-2 text-[13px]"><span className="text-ink/55">{k}</span><span className="text-right font-bold">{v}</span></div>
)
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

function toView(d, service) {
  const v = d.current, prof = v.profile ?? {}, br = v.booking_rules ?? {}, tr = v.travel_rules ?? {}
  const loc = service.specs?.anchor_v3?.location ?? {}
  const byModel = Object.fromEntries(d.rules.map(r => [r.model, r]))
  const hourRule = byModel.hour
  const order = { ESSENTIAL: 0, SIGNATURE: 1, VIP: 2 }
  const items = d.readiness?.items ?? []

  const packages = d.packages
    .filter(p => p.commercial_inputs?.tier && p.status !== 'ARCHIVED')
    .sort((a, b) => order[a.commercial_inputs.tier] - order[b.commercial_inputs.tier])
    .map(p => {
      const t = p.commercial_inputs.tier, ti = p.trade_inputs ?? {}, snap = p.calculation_snapshot ?? {}
      const rule = byModel[snap.basis]
      return {
        tier: t, name: p.name, status: p.status,
        price_paise: Number(ti.customer_paise) || 0, take_home_paise: Number(ti.take_home_paise) || 0,
        hours: Number(ti.duration_hours) || 0, sessions: rule?.included_sessions ?? null,
        inclusions: (p.commercial_inputs.inclusions ?? []).map(label),
        edited: !!ti.edited_by_partner, basis: snap.basis,
        extra_hour_paise: rule?.extra_hour_take_home_paise ? Math.round(rule.extra_hour_take_home_paise / (1 - (snap.platform_fee_rate ?? 0.08)) / 10) * 10 : null,
      }
    })

  const gross = take => take ? Math.round(take / 0.92 / 10) * 10 : null
  const charges = [
    hourRule?.extra_hour_take_home_paise && { k: 'Overtime', v: `${rupees(gross(hourRule.extra_hour_take_home_paise))} per hour · ${hourRule.overtime_step_minutes ?? 60}-min steps after ${hourRule.overtime_grace_minutes ?? 0} min` },
    Object.values(byModel).find(r => r.extra_session_take_home_paise) && { k: 'Extra function', v: `${rupees(gross(Object.values(byModel).find(r => r.extra_session_take_home_paise).extra_session_take_home_paise))} each` },
    { k: 'Travel', v: TRAVEL[tr.model] ?? '—' },
    tr.flat_take_home_paise && { k: 'Outstation fee', v: rupees(gross(tr.flat_take_home_paise)) },
    tr.per_km_take_home_paise && { k: 'Per km', v: rupees(gross(tr.per_km_take_home_paise)) },
    br.waiting && { k: 'Waiting time', v: `${br.waiting.free_minutes} min free, then ${rupees(gross(br.waiting.fee_take_home_paise))} / 30 min` },
    br.surcharge && { k: 'Late-night / holiday', v: `+${br.surcharge.pct}% after ${br.surcharge.after}${br.surcharge.holidays ? ', and on holidays' : ''}` },
  ].filter(Boolean)

  return {
    status: v.status === 'REJECTED' ? 'ACTION_REQUIRED' : v.status,
    version: v.version, published_at: d.live?.published_at, price_locked_until: d.live?.price_locked_until,
    editable: !d.live, now: new Date().toISOString(),
    instant_ready: d.readiness?.state === 'READY_FOR_INSTANT_BOOKING',
    instant_missing: items.filter(i => i.status !== 'pass').length,
    payout_status: items.find(i => i.id === 'payout')?.status === 'pass' ? 'active' : 'pending',
    seasonal: d.window && d.live ? { name: d.window.name, deadline: d.window.closes_at } : null,
    packages,
    listing: {
      initials: (prof.stage_name ?? '?').slice(0, 2).toUpperCase(), stage_name: prof.stage_name,
      role: prof.role === 'other' ? prof.role_other : ROLE[prof.role] ?? 'Anchor & MC', years: prof.years, tagline: prof.tagline ?? '',
      city: [loc.locality, loc.city].filter(Boolean).join(', ') || '—',
      travel: tr.scope ? (/^\d+$/.test(tr.scope) ? `up to ${tr.scope} km` : tr.scope) : '—',
      languages: (prof.languages ?? []).map(l => `${l.name} (${l.level})`).join(' · '),
      audience: prof.max_audience ? Number(prof.max_audience).toLocaleString('en-IN') : '—',
      formats: (prof.formats ?? []).join(', '),
      events: (prof.events ?? []).map(e => EVENT_LABEL[e] ?? e),
    },
    models: d.rules.map(r => ({
      id: r.model, customer_paise: r.customer_paise, unit: MODEL_UNIT[r.model] ?? '',
      rules: [r.included_hours && `${r.included_hours} hrs included`, r.min_hours && `min ${r.min_hours} hrs`, r.max_hours && `max ${r.max_hours} hrs`,
        r.included_sessions && `${r.included_sessions} function${r.included_sessions > 1 ? 's' : ''}`,
        r.multi_day?.max_days && `up to ${r.multi_day.max_days} days`].filter(Boolean).join(' · ') || 'Fixed price',
    })),
    addons: d.addons.map(a => ({ name: a.label, paise: a.customer_paise, unit: UNIT_LABEL[a.unit] ?? '', in: (a.included_in ?? []).map(title) })),
    charges,
    rules: [
      { k: 'Instant booking', v: br.instant === false ? 'Off' : 'On' },
      { k: 'Custom quotes', v: br.custom_quotes === false ? 'Off' : `On · reply within ${br.quote_hours ?? '—'} hrs` },
      { k: 'Advance', v: br.advance_pct ? `${br.advance_pct}% at booking` : '—' },
      { k: 'Cancellation', v: CANCELLATION_V3.find(c => c.id === br.cancellation)?.title ?? '—' },
      { k: 'Minimum notice', v: br.min_notice_days != null ? `${br.min_notice_days} days` : '—' },
    ],
  }
}


