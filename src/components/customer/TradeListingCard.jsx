/**
 * A partner of any trade, as a customer sees them.
 *
 * The direct analogue of AnchorProfileCard, and written for the same
 * reason its header gives: it is built ONLY from what listing_public()
 * returns, so legal name, bank details, documents, review notes, the
 * partner's take-home and the platform fee are not in its input at all
 * and cannot leak through it. The SQL strips private keys out of
 * `answers` and `attributes` by regex before they ever reach the client
 * (20261010_09:838), and every amount in the payload is customer_paise.
 *
 * Used by BOTH the customer page and the partner's "Preview my customer
 * listing", exactly as AnchorProfileCard is. That is the point: a
 * preview rendered by a second component is a preview that drifts, and
 * a drifting preview is how internal fields end up on a customer screen.
 *
 * Anchor & MC keeps AnchorProfileCard -- it has a profile shape of its
 * own (role, languages, event groups) that the engine trades do not.
 */
import { MapPin, Star, Check, Clock, Package, Boxes, Plus, Info } from 'lucide-react'
import { rupees } from '../../lib/tierPackages'

const UNIT_LABEL = {
  per_hour: 'per hour', per_day: 'per day', per_event: 'per event', per_guest: 'per guest',
  per_plate: 'per plate', per_item: 'per item', per_km: 'per km', per_vehicle: 'per vehicle',
  per_piece: 'per piece', per_kg: 'per kg', per_sqft: 'per sq ft', per_person: 'per person',
}
const unitOf = u => UNIT_LABEL[u] ?? String(u ?? '').replace(/^per_/, 'per ').replace(/_/g, ' ')

const CANCELLATION_COPY = {
  flexible: 'Full refund up to 7 days before the event.',
  moderate: 'Full refund up to 14 days before the event.',
  strict: 'Part refund — see the full policy at checkout.',
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="border-t border-ink/[0.06] px-5 py-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink/45">
        {Icon && <Icon size={13} />}{title}
      </p>
      {children}
    </div>
  )
}

function Row({ k, v, sub }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold text-ink">{k}</p>
        {sub && <p className="text-[11.5px] text-ink/50">{sub}</p>}
      </div>
      <p className="shrink-0 text-[13.5px] font-extrabold text-ink">{v}</p>
    </div>
  )
}

export default function TradeListingCard({ listing, tradeName, onPick }) {
  if (!listing) return null
  const p = listing.profile ?? {}
  const terms = listing.terms ?? {}
  const packages = listing.packages ?? []
  const catalogue = listing.catalogue ?? []
  const rules = listing.rules ?? []
  const addons = listing.addons ?? []

  /* The cheapest real number on the listing, whatever shape the trade
     prices in. "From" is honest where a single headline price is not. */
  const entry = [
    ...packages.map(x => x.customer_paise),
    ...rules.map(x => x.customer_paise),
    ...catalogue.map(x => x.customer_paise),
  ].filter(n => Number(n) > 0).sort((a, b) => a - b)[0]

  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-ink/[0.07]">
      <div className="bg-gradient-to-br from-plum-700 to-plum-950 p-5 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/70">
          {tradeName ?? listing.trade_id}
        </p>
        <h2 className="mt-1 text-[22px] font-extrabold leading-tight">
          {p.business_name ?? p.stage_name ?? p.name ?? 'This partner'}
        </h2>
        {p.tagline && <p className="mt-1 text-[13px] leading-snug text-white/80">{p.tagline}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-white/85">
          {listing.city && <span className="flex items-center gap-1.5"><MapPin size={14} />{listing.city}</span>}
          {Number(listing.rating) > 0 && (
            <span className="flex items-center gap-1.5"><Star size={14} className="fill-current" />{Number(listing.rating).toFixed(1)}</span>
          )}
          {terms.instant === 'true' && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-extrabold">Instant booking</span>
          )}
        </div>

        {entry > 0 && (
          <p className="mt-4 text-[13px] font-bold text-white/80">
            From <span className="text-[24px] font-extrabold text-white">{rupees(entry)}</span>
          </p>
        )}
      </div>

      {packages.length > 0 && (
        <Section icon={Package} title="Packages">
          {packages.map(pkg => (
            <button key={pkg.key ?? pkg.name} type="button" onClick={() => onPick?.(pkg)}
              className="block w-full border-b border-ink/[0.05] py-2.5 text-left last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-extrabold text-ink">{pkg.name}</p>
                  {pkg.hours && <p className="text-[11.5px] text-ink/50">{pkg.hours} hours</p>}
                </div>
                <p className="shrink-0 text-[15px] font-extrabold text-ink">{rupees(pkg.customer_paise)}</p>
              </div>
              {!!(pkg.inclusions ?? []).length && (
                <div className="mt-1.5 space-y-1">
                  {(pkg.inclusions ?? []).slice(0, 4).map((inc, i) => (
                    <p key={i} className="flex items-center gap-1.5 text-[12px] text-ink/70">
                      <Check size={11} className="shrink-0 text-forest-600" strokeWidth={3} />
                      {typeof inc === 'string' ? inc : inc.label ?? inc.id}
                    </p>
                  ))}
                </div>
              )}
            </button>
          ))}
        </Section>
      )}

      {rules.length > 0 && (
        <Section icon={Clock} title="How they charge">
          {rules.map((r, i) => (
            <Row key={i} k={r.label ?? r.kind} v={rupees(r.customer_paise)}
              sub={[unitOf(r.unit), r.included_hours && `${r.included_hours} hrs included`,
                r.min_qty && `min ${r.min_qty}`].filter(Boolean).join(' · ')} />
          ))}
        </Section>
      )}

      {catalogue.length > 0 && (
        <Section icon={Boxes} title="What you can order">
          {catalogue.slice(0, 12).map(c => (
            <Row key={c.item_key} k={c.name} v={c.customer_paise ? rupees(c.customer_paise) : 'On request'}
              sub={[unitOf(c.unit), c.lead_days && `${c.lead_days} days notice`].filter(Boolean).join(' · ')} />
          ))}
          {catalogue.length > 12 && (
            <p className="pt-1.5 text-[12px] font-bold text-ink/45">+{catalogue.length - 12} more</p>
          )}
        </Section>
      )}

      {addons.length > 0 && (
        <Section icon={Plus} title="Optional extras">
          {addons.map(a => (
            <Row key={a.addon_id} k={a.label} v={rupees(a.customer_paise)} sub={unitOf(a.unit)} />
          ))}
        </Section>
      )}

      <Section icon={Info} title="Booking terms">
        {terms.min_notice_days != null && (
          <Row k="Book at least" v={`${terms.min_notice_days} day${Number(terms.min_notice_days) === 1 ? '' : 's'} ahead`} />
        )}
        {terms.cancellation && (
          <Row k="Cancellation" v={String(terms.cancellation).replace(/^./, c => c.toUpperCase())}
            sub={CANCELLATION_COPY[terms.cancellation]} />
        )}
        {(terms.charges ?? []).map((c, i) => (
          <Row key={i} k={c.label} v={rupees(c.customer_paise)} sub={c.role} />
        ))}
      </Section>
    </div>
  )
}
