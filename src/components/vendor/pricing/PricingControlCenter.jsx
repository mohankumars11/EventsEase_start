/**
 * Pricing Control Center — the Pricing tab for trades with a pricing profile.
 *
 * One place for everything the partner set during onboarding, read from
 * the PUBLISHED version. It never regenerates a price on open. Edits go
 * through the onboarding stage they came from, and are refused with a
 * date while the 15-day price lock runs, unless an admin-opened seasonal
 * window allows that field.
 *
 * `data` is the listing version as the server returns it; this component
 * only displays it and raises intents (onEdit, onSeasonal, onPayout...).
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown, Lock, Sparkles, Eye, Award, Crown, Gem, Check, Pencil, MapPin, Languages, Users,
  Clock, Mic2, CalendarCheck, Sun, SunMedium, CalendarRange, ArrowRight,
} from 'lucide-react'
import { rupees } from '../../../lib/tierPackages'
import PackageCarousel from '../packages/PackageCarousel'

const MODEL = {
  hour: ['Per hour', Clock], session: ['Per session', Mic2], event: ['Per event', CalendarCheck],
  half_day: ['Half-day', SunMedium], full_day: ['Full-day', Sun], multi_day: ['Multi-day', CalendarRange],
}
const TIER = { ESSENTIAL: [Award, 'text-amber-700', 'from-amber-50'], SIGNATURE: [Crown, 'text-plum-700', 'from-plum-50'], VIP: [Gem, 'text-sky-700', 'from-sky-50'] }
const humanize = value => String(value || 'Pricing model').replace(/[_-]+/g, ' ').replace(/\\b\\w/g, char => char.toUpperCase())
const STATUS_LOOK = {
  LIVE: ['Live', 'bg-forest-50 text-forest-700 ring-forest-200'],
  UNDER_REVIEW: ['Review in progress', 'bg-amber-50 text-amber-800 ring-amber-200'],
  ACTION_REQUIRED: ['Action needed', 'bg-rose-50 text-rose-800 ring-rose-200'],
  REJECTED: ['Review in progress', 'bg-amber-50 text-amber-800 ring-amber-200'],
  DRAFT: ['Draft', 'bg-ink/5 text-ink/65 ring-ink/10'],
  APPROVED: ['Live', 'bg-forest-50 text-forest-700 ring-forest-200'],
  SUSPENDED: ['Suspended', 'bg-rose-50 text-rose-800 ring-rose-200'],
}
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function Section({ title, count, children, open: open0 = false }) {
  const [open, setOpen] = useState(open0)
  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.07]">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3.5">
        <span className="text-[14.5px] font-extrabold text-ink">{title}{count != null && <span className="ml-1.5 text-ink/40">{count}</span>}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink/40"><ChevronDown size={19} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-ink/[0.06] px-4 pb-4 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Row = ({ k, v }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-[12.5px]">
    <span className="text-ink/55">{k}</span><span className="text-right font-bold text-ink">{v}</span>
  </div>
)

export default function PricingControlCenter({ data, onEdit, onSeasonal, onPayout, onPreview, onViewPackage, banner }) {
  const d = data
  const locked = d.price_locked_until && new Date(d.price_locked_until) > new Date(d.now ?? Date.now())
  const [statusLabel, statusClass] = STATUS_LOOK[d.status] ?? STATUS_LOOK.DRAFT
  return (
    <div className="space-y-3">
      {/* Compact moderation status. The service heading lives just above this component. */}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-[12px] font-extrabold ring-1 ${statusClass}`}>
          <span className="h-2 w-2 rounded-full bg-current opacity-75" />
          {statusLabel}
        </span>
        {d.published_at ? <span className="truncate text-[11px] font-semibold text-ink/45">Live since {fmtDate(d.published_at)}</span> : null}
      </div>

      {/* The two main actions are available before the package carousel. */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onPreview}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-plum-300 bg-white px-2.5 text-[12px] font-extrabold text-plum-700 active:scale-[0.99]">
          <Eye size={15} /> Customer preview
        </button>
        <button type="button" onClick={() => onEdit?.('listing')}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-plum-700 to-violet-600 px-2.5 text-[12px] font-extrabold text-white shadow-sm active:scale-[0.99]">
          <Pencil size={15} /> Edit listing
        </button>
      </div>

      {banner}

      {d.seasonal && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
          <span className="flex min-w-0 items-center gap-2 text-[11.5px] font-bold text-amber-900">
            <Sparkles size={15} className="shrink-0" />
            <span className="truncate">Seasonal price window · until {fmtDate(d.seasonal.deadline)}</span>
          </span>
          <button type="button" onClick={onSeasonal} className="shrink-0 rounded-full bg-amber-800 px-3 py-2 text-[11px] font-extrabold text-white">
            Edit prices
          </button>
        </motion.div>
      )}

      {/* A one-line policy message replaces the oversized price-update panel. */}
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-plum-50/80 px-3 py-2 ring-1 ring-plum-100">
        <CalendarRange size={16} className="shrink-0 text-plum-700" />
        <p className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-ink/65">
          {locked
            ? `Price editing unlocks on ${fmtDate(d.price_locked_until)} · 15-day policy.`
            : d.status === 'LIVE'
              ? 'Price updates follow the 15-day policy.'
              : 'Regular price updates unlock once your listing is live · 15-day policy.'}
        </p>
      </div>

      {/* C · the three packages, swipeable
          Was a fourth hand-rolled copy of the tier card -- a w-[72%]
          snap row with its own TIER map and its own status chip. It is
          now the same PackageCarousel the onboarding step and every
          other trade's Pricing tab use, so the partner meets one card.

          The figure is the partner's rate. It used to be p.price_paise,
          the customer price: a partner-facing screen printing a total
          derived from the platform fee. */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Your packages</p>
        {d.packages.length ? (
          <PackageCarousel
            compact
            packages={d.packages.map(p => ({
              key: p.tier ?? p.key ?? p.name,
              name: p.name,
              ratePaise: Number(p.rate_paise ?? p.take_home_paise) > 0 ? Number(p.rate_paise ?? p.take_home_paise) : null,
              unit: p.unit || 'per event',
              meta: p.hours ? String(p.hours) + ' hrs' + (p.sessions ? ' · ' + p.sessions + ' functions' : '') : p.sessions ? String(p.sessions) + ' functions' : null,
              status: (STATUS_LOOK[p.status] ?? [])[0] ?? p.status,
              base: p.base || (p.hours ? String(p.hours) + ' hours included' : p.name || 'Core service'),
              inclusions: (Array.isArray(p.inclusions) ? p.inclusions : []).map((item, index) => ({ id: String(item?.id ?? item?.label ?? item?.name ?? item) + '-' + index, label: typeof item === 'string' ? item : item?.label ?? item?.name ?? item?.id ?? '', included: item?.included !== false })),
              badge: p.badge,
              edited: p.edited,
            }))}
            onEditPrice={() => d.seasonal ? onSeasonal?.() : !locked ? onEdit?.('pricing') : undefined}
            priceEditLocked={locked && !d.seasonal}
            priceEditDate={d.price_locked_until ? fmtDate(d.price_locked_until) : null}
            pricePolicyLabel={locked && !d.seasonal ? '15-day lock' : '15-day policy'}
            onViewDetails={p => onViewPackage?.(p.key)}
          />
        ) : <p className="rounded-[18px] bg-white p-4 text-[12px] text-ink/55 ring-1 ring-ink/[0.07]">No packages have been saved for this listing yet. The other sections will show any rates and rules that are available.</p>}

      </div>

      <Section title="My listing">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-plum-100 to-plum-200 text-[18px] font-extrabold text-plum-700">{d.listing?.initials || String(d.listing?.stage_name || d.listing?.business_name || 'S').slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[15px] font-extrabold">{d.listing?.stage_name || d.listing?.business_name || d.listing?.name || 'Your listing'}</p>
            <p className="mt-0.5 text-[12px] text-ink/55">{[d.listing?.role, d.listing?.years ? String(d.listing.years) + ' yrs' : null, d.listing?.tagline].filter(Boolean).join(' · ') || 'Your saved partner profile'}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[12.5px]">
          {(d.listing?.city || d.listing?.travel) ? <p className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-plum-600" />{[d.listing?.city, d.listing?.travel ? 'travels ' + d.listing.travel : null].filter(Boolean).join(' · ')}</p> : null}
          {d.listing?.languages ? <p className="flex items-center gap-2"><Languages size={14} className="shrink-0 text-plum-600" />{d.listing.languages}</p> : null}
          {(d.listing?.audience || d.listing?.formats) ? <p className="flex items-center gap-2"><Users size={14} className="shrink-0 text-plum-600" />{[d.listing?.audience ? 'Up to ' + d.listing.audience + ' guests' : null, d.listing?.formats].filter(Boolean).join(' · ')}</p> : null}
        </div>
        {(Array.isArray(d.listing?.events) && d.listing.events.length > 0) ? <div className="mt-3 flex flex-wrap gap-1.5">{d.listing.events.map((event, index) => <span key={String(event) + index} className="rounded-full bg-plum-50 px-2.5 py-1 text-[11.5px] font-bold text-plum-800">{event}</span>)}</div> : null}
        <button type="button" onClick={onPreview} className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold text-plum-700 ring-2 ring-plum-200"><Eye size={15} /> Preview my customer profile</button>
      </Section>

      <Section title="My pricing models" count={d.models.length}>
        {d.models.length ? (
          <div className="space-y-2">
            {d.models.map((model, index) => {
              const [modelLabel, Icon] = MODEL[model.id] ?? [model.label || humanize(model.id), Clock]
              return (
                <div key={model.id || modelLabel || index} className="rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[13.5px] font-extrabold"><Icon size={15} className="shrink-0 text-plum-600" />{modelLabel}</span>
                    <span className="shrink-0 text-[14px] font-extrabold">{Number(model.customer_paise) > 0 ? rupees(model.customer_paise) : 'Price on request'}<span className="text-[11px] font-bold text-ink/45">{model.unit}</span></span>
                  </div>
                  {model.rules ? <p className="mt-1 text-[11.5px] text-ink/55">{model.rules}</p> : null}
                </div>
              )
            })}
          </div>
        ) : <p className="text-[12px] leading-relaxed text-ink/55">No separate pricing models are configured for this listing. Saved package and catalogue rates appear in their sections.</p>}
        <EditButton locked={locked && !d.editable} until={d.price_locked_until} onClick={() => onEdit?.('pricing')} />
      </Section>

      <Section title="Extra services" count={d.addons.length}>
        {d.addons.length ? d.addons.map((addon, index) => (
          <div key={addon.id || addon.name || index} className="flex items-center justify-between gap-3 border-b border-ink/[0.05] py-2 last:border-0">
            <div className="min-w-0"><p className="break-words text-[13px] font-bold">{addon.name}</p><p className="text-[11px] text-ink/50">{addon.in?.length ? 'Included in ' + addon.in.join(', ') : 'Available separately'}</p></div>
            <span className="shrink-0 text-[13px] font-extrabold">{Number(addon.paise) > 0 ? rupees(addon.paise) : 'Price on request'}<span className="text-[10.5px] text-ink/45"> {addon.unit}</span></span>
          </div>
        )) : <p className="text-[12px] text-ink/55">No optional extras are saved for this listing.</p>}
      </Section>

      <Section title="Other booking charges">
        {d.charges?.length ? d.charges.map((charge, index) => <Row key={charge.k || charge.label || index} k={charge.k || charge.label || 'Additional charge'} v={charge.v || charge.value || 'As listed'} />) : <p className="text-[12px] text-ink/55">No additional booking charges are saved.</p>}
      </Section>

      <Section title="Booking & payment rules">
        {d.rules?.length ? d.rules.map((rule, index) => <Row key={rule.k || rule.label || index} k={rule.k || rule.label || 'Booking rule'} v={rule.v || rule.value || 'As listed'} />) : <p className="text-[12px] text-ink/55">Booking rules have not been configured for this listing yet.</p>}
      </Section>


    </div>
  )
}

function EditButton({ locked, until, onClick }) {
  return (
    <button type="button" disabled={locked} onClick={onClick}
      className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-plum-50 text-[13px] font-extrabold text-plum-700 disabled:bg-ink/[0.05] disabled:text-ink/40">
      {locked ? <><Lock size={14} /> Editable from {fmtDate(until)}</> : <><Pencil size={14} /> Edit prices</>}
    </button>
  )
}

/** Side-by-side current vs proposed, only for fields the window permits. */
export function SeasonalUpdate({ window: w, fields, value, onChange, onSubmit }) {
  return (
    <div>
      <p className="text-[12.5px] leading-snug text-ink/60">Applies to events from <b>{fmtDate(w.from)}</b> to <b>{fmtDate(w.to)}</b>. New prices go live only after review. Confirmed bookings keep their price.</p>
      <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-ink/[0.08]">
        <div className="grid grid-cols-[1fr_90px_110px] bg-[#f6f4fb] px-3 py-2 text-[10.5px] font-extrabold uppercase tracking-wide text-ink/45">
          <span>Field</span><span className="text-right">Current</span><span className="text-right">Proposed</span>
        </div>
        {fields.map(f => (
          <div key={f.id} className="grid grid-cols-[1fr_90px_110px] items-center border-t border-ink/[0.06] px-3 py-2.5">
            <span className="text-[13px] font-bold">{f.label}</span>
            <span className="text-right text-[12.5px] text-ink/55">{rupees(f.current_paise)}</span>
            {f.locked
              ? <span className="flex items-center justify-end gap-1 text-[11.5px] font-bold text-ink/35"><Lock size={12} />Locked</span>
              : <input inputMode="numeric" value={value[f.id] ?? ''} onChange={e => onChange({ ...value, [f.id]: e.target.value.replace(/\D/g, '') })}
                  placeholder="₹" className="ml-auto h-9 w-[100px] rounded-xl bg-plum-50 px-2.5 text-right text-[13px] font-extrabold text-plum-800 outline-none ring-1 ring-plum-200 focus:ring-2 focus:ring-plum-500" />}
          </div>
        ))}
      </div>
      <button type="button" onClick={onSubmit} className="mt-4 h-[52px] w-full rounded-full bg-plum-700 text-[15px] font-extrabold text-white">Submit for review</button>
    </div>
  )
}

