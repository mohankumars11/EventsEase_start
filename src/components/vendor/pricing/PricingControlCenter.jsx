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
  ChevronDown, Lock, Sparkles, Zap, Wallet, Eye, Award, Crown, Gem, Check, Pencil, MapPin, Languages, Users,
  Clock, Mic2, CalendarCheck, Sun, SunMedium, CalendarRange, ArrowRight,
} from 'lucide-react'
import { rupees } from '../../../lib/tierPackages'

const MODEL = {
  hour: ['Per hour', Clock], session: ['Per session', Mic2], event: ['Per event', CalendarCheck],
  half_day: ['Half-day', SunMedium], full_day: ['Full-day', Sun], multi_day: ['Multi-day', CalendarRange],
}
const TIER = { ESSENTIAL: [Award, 'text-amber-700', 'from-amber-50'], SIGNATURE: [Crown, 'text-plum-700', 'from-plum-50'], VIP: [Gem, 'text-sky-700', 'from-sky-50'] }
const STATUS_LOOK = {
  LIVE: ['Live', 'bg-forest-600 text-white'], UNDER_REVIEW: ['Submitted for review', 'bg-amber-100 text-amber-900'],
  ACTION_REQUIRED: ['Changes requested', 'bg-rose-100 text-rose-800'], DRAFT: ['Draft', 'bg-ink/10 text-ink/70'],
  APPROVED: ['Approved', 'bg-forest-100 text-forest-800'], SUSPENDED: ['Suspended', 'bg-rose-600 text-white'],
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
      <div>
        <h1 className="text-[clamp(1.35rem,6vw,1.6rem)] font-extrabold leading-tight tracking-tight text-plum-950">Pricing Control Center</h1>
        <p className="mt-1 text-[13px] text-ink/60">Manage your services, packages, prices and booking rules in one place.</p>
      </div>

      {/* G · status first: it answers "can I change anything, and can people book me" */}
      <div className="rounded-[22px] bg-gradient-to-br from-plum-800 to-plum-950 p-4 text-white">
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusClass}`}>● {statusLabel}</span>
          <span className="text-[11.5px] font-bold text-plum-200">Version {d.version}{d.published_at ? ` · since ${fmtDate(d.published_at)}` : ''}</span>
        </div>
        {locked && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-white/10 p-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-plum-200" />
            <p className="text-[12.5px] leading-snug text-plum-50">
              <b className="text-white">Your prices are protected for 15 days after publication.</b> Your next regular price update is available on <b className="text-white">{fmtDate(d.price_locked_until)}</b>. You can still manage your calendar.
            </p>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="rounded-2xl bg-white/10 p-3 text-left">
            <Zap size={16} className={d.instant_ready ? 'text-emerald-300' : 'text-amber-300'} />
            <p className="mt-1 text-[12px] font-extrabold">Instant Book & Pay</p>
            <p className="text-[11px] text-plum-200">{d.instant_ready ? 'Ready' : `${d.instant_missing} item${d.instant_missing === 1 ? '' : 's'} to finish`}</p>
          </button>
          <button type="button" onClick={onPayout} className="rounded-2xl bg-white/10 p-3 text-left">
            <Wallet size={16} className={d.payout_status === 'active' ? 'text-emerald-300' : 'text-amber-300'} />
            <p className="mt-1 text-[12px] font-extrabold">Payouts</p>
            <p className="text-[11px] text-plum-200">{d.payout_status === 'active' ? 'Active · Razorpay' : 'Action needed'} ›</p>
          </button>
        </div>
      </div>

      {banner}

      {d.seasonal && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[22px] bg-gradient-to-r from-amber-50 to-rose-50 p-4 ring-1 ring-amber-200">
          <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-amber-800"><Sparkles size={14} /> Seasonal price update available</p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink/75">{d.seasonal.name}: Sambramo has opened a price-update window. Submit by <b>{fmtDate(d.seasonal.deadline)}</b>.</p>
          <button type="button" onClick={onSeasonal} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[13.5px] font-extrabold text-white">
            Update seasonal prices <ArrowRight size={15} />
          </button>
        </motion.div>
      )}

      {/* C · the three packages, swipeable */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Your packages</p>
        <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {d.packages.map(p => {
            const [Icon, tint, from] = TIER[p.tier]
            return (
              <div key={p.tier} className={`w-[72%] shrink-0 snap-center rounded-[22px] bg-gradient-to-b ${from} to-white p-4 ring-1 ${p.tier === 'SIGNATURE' ? 'ring-2 ring-plum-500' : 'ring-ink/[0.07]'}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white ${tint} shadow-sm`}><Icon size={16} /></span><span className="text-[15px] font-extrabold">{p.name}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${p.status === 'LIVE' ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800'}`}>{p.status === 'LIVE' ? 'Live' : p.status === 'ACTION_REQUIRED' ? 'Changes requested' : 'In review'}</span>
                </div>
                <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight">{rupees(p.price_paise)}</p>
                <p className="mt-1 text-[11.5px] font-bold text-ink/50">{p.hours} hrs{p.sessions ? ` · ${p.sessions} function${p.sessions > 1 ? 's' : ''}` : ''}</p>
                <div className="mt-2.5 space-y-1">
                  {p.inclusions.slice(0, 3).map(i => <p key={i} className="flex items-center gap-1.5 text-[12px] font-semibold"><Check size={12} className="text-forest-600" strokeWidth={3} />{i}</p>)}
                </div>
                <button type="button" onClick={() => onViewPackage?.(p.tier)} className="mt-3 flex items-center gap-1 text-[12.5px] font-extrabold text-plum-700">View details <ArrowRight size={13} /></button>
              </div>
            )
          })}
        </div>
      </div>

      <Section title="My listing">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-plum-100 to-plum-200 text-[18px] font-extrabold text-plum-700">{d.listing.initials}</span>
          <div className="min-w-0"><p className="text-[15px] font-extrabold">{d.listing.stage_name}</p><p className="text-[12px] text-ink/55">{d.listing.role} · {d.listing.years} yrs · {d.listing.tagline}</p></div>
        </div>
        <div className="mt-3 space-y-2 text-[12.5px]">
          <p className="flex items-center gap-2"><MapPin size={14} className="text-plum-600" />{d.listing.city} · travels {d.listing.travel}</p>
          <p className="flex items-center gap-2"><Languages size={14} className="text-plum-600" />{d.listing.languages}</p>
          <p className="flex items-center gap-2"><Users size={14} className="text-plum-600" />Up to {d.listing.audience} guests · {d.listing.formats}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{d.listing.events.map(e => <span key={e} className="rounded-full bg-plum-50 px-2.5 py-1 text-[11.5px] font-bold text-plum-800">{e}</span>)}</div>
        <button type="button" onClick={onPreview} className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold text-plum-700 ring-2 ring-plum-200"><Eye size={15} /> Preview my customer profile</button>
      </Section>

      <Section title="My pricing models" count={d.models.length}>
        <div className="space-y-2">
          {d.models.map(m => {
            const [label, Icon] = MODEL[m.id]
            return (
              <div key={m.id} className="rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13.5px] font-extrabold"><Icon size={15} className="text-plum-600" />{label}</span>
                  <span className="text-[14px] font-extrabold">{rupees(m.customer_paise)}<span className="text-[11px] font-bold text-ink/45">{m.unit}</span></span>
                </div>
                <p className="mt-1 text-[11.5px] text-ink/55">{m.rules}</p>
              </div>
            )
          })}
        </div>
        <EditButton locked={locked && !d.editable} until={d.price_locked_until} onClick={() => onEdit?.('pricing')} />
      </Section>

      <Section title="Extra services" count={d.addons.length}>
        {d.addons.map(a => (
          <div key={a.name} className="flex items-center justify-between border-b border-ink/[0.05] py-2 last:border-0">
            <div><p className="text-[13px] font-bold">{a.name}</p><p className="text-[11px] text-ink/50">{a.in.length ? `Included in ${a.in.join(', ')}` : 'Available separately'}</p></div>
            <span className="text-[13px] font-extrabold">{rupees(a.paise)}<span className="text-[10.5px] text-ink/45"> {a.unit}</span></span>
          </div>
        ))}
      </Section>

      <Section title="Other booking charges">
        {d.charges.map(c => <Row key={c.k} k={c.k} v={c.v} />)}
      </Section>

      <Section title="Booking & payment rules">
        {d.rules.map(c => <Row key={c.k} k={c.k} v={c.v} />)}
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

