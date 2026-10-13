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
        <p className="whitespace-normal break-words text-[13.5px] font-bold text-ink">{k}</p>
        {sub && <p className="text-[11.5px] text-ink/50">{sub}</p>}
      </div>
      <p className="max-w-[55%] whitespace-normal break-words text-right text-[13.5px] font-extrabold text-ink">{v}</p>
    </div>
  )
}

export default function TradeListingCard({ listing, tradeName, onPick, showBookingCtaPreview = false }) {
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
        <Section icon={Package} title="Packages & pricing">
          <div className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory items-stretch gap-3">
              {packages.map(pkg => {
                const PackageSurface = onPick ? "button" : "div"
                return (
                  <PackageSurface key={pkg.key ?? pkg.name} type={onPick ? "button" : undefined}
                    onClick={onPick ? () => onPick(pkg) : undefined}
                    className={"relative flex w-[78%] max-w-[300px] shrink-0 snap-center flex-col rounded-[22px] bg-gradient-to-b from-plum-50 to-white p-4 text-left ring-1 ring-plum-100 " + (onPick ? "active:scale-[0.99]" : "")}>
                    {String(pkg.tier ?? pkg.key ?? "").toUpperCase() === "SIGNATURE" && (
                      <span className="absolute right-3 top-3 rounded-full bg-plum-700 px-2.5 py-1 text-[9px] font-extrabold uppercase text-white">★ Popular</span>
                    )}
                    <p className="pr-16 text-[14.5px] font-extrabold text-ink">{pkg.name}</p>
                    {pkg.hours && <p className="mt-0.5 text-[11.5px] font-bold text-ink/50">{pkg.hours} hours</p>}
                    <p className="mt-3 text-[24px] font-extrabold tracking-tight text-ink">{rupees(pkg.customer_paise)}</p>
                    {!!(pkg.inclusions ?? []).length && (
                      <div className="mt-3 space-y-1.5">
                        {(pkg.inclusions ?? []).map((inc, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink/70">
                            <Check size={12} className="mt-0.5 shrink-0 text-forest-600" strokeWidth={3} />
                            <span>{typeof inc === "string" ? inc : inc.label ?? inc.id}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {onPick && <span className="mt-auto flex items-center gap-1 pt-4 text-[12px] font-extrabold text-plum-700">View details ›</span>}
                  </PackageSurface>
                )
              })}
            </div>
          </div>
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
          {catalogue.map(c => (
            <Row key={c.item_key} k={c.name} v={c.customer_paise ? rupees(c.customer_paise) : 'On request'}
              sub={[unitOf(c.unit), c.lead_days && `${c.lead_days} days notice`].filter(Boolean).join(' · ')} />
          ))}

        </Section>
      )}

      {addons.length > 0 && (
        <Section icon={Plus} title="Optional extras">
          {addons.map(a => (
            <Row key={a.addon_id} k={a.label} v={rupees(a.customer_paise)} sub={unitOf(a.unit)} />
          ))}
        </Section>
      )}

      <Section icon={Info} title="Booking & payment terms">
        {terms.instant != null && <Row k="Booking mode" v={terms.instant === true || terms.instant === 'true' ? 'Instant Book & Pay' : 'Booking request'} />}
        {(terms.advance_pct ?? terms.advance_percent) != null && (
          <Row k="Advance payment" v={String(terms.advance_pct ?? terms.advance_percent) + '% at booking'} />
        )}
        {terms.payment_policy && <Row k="Payment terms" v={String(terms.payment_policy).replace(/_/g, ' ')} />}
        {terms.min_notice_days != null && (
          <Row k="Book at least" v={String(terms.min_notice_days) + ' day' + (Number(terms.min_notice_days) === 1 ? '' : 's') + ' ahead'} />
        )}
        {terms.cancellation && (
          <Row k="Cancellation" v={String(terms.cancellation).replace(/^./, c => c.toUpperCase())}
            sub={terms.cancellation_policy ?? terms.cancellation_details ?? CANCELLATION_COPY[terms.cancellation] ?? 'Check the booking terms for the policy that applies to this listing.'} />
        )}
        {terms.reschedule_policy && <Row k="Rescheduling" v={String(terms.reschedule_policy).replace(/_/g, ' ')} />}
        {(terms.charges ?? []).map((c, i) => (
          <Row key={i} k={c.label} v={rupees(c.customer_paise)} sub={c.role} />
        ))}
      </Section>

      {showBookingCtaPreview && (
        <div className="border-t border-ink/[0.06] p-4">
          <div aria-label="Customer action preview" className={"flex min-h-[52px] items-center justify-center gap-2 rounded-full px-5 text-center text-[14px] font-extrabold text-white " + ((terms.instant === true || terms.instant === 'true') ? "bg-gradient-to-r from-plum-700 to-violet-600 shadow-lg shadow-plum-700/15" : "bg-slate-400")}>
            {(terms.instant === true || terms.instant === 'true') ? "Instant Book & Pay" : "Instant booking is not enabled"} <span aria-hidden="true">→</span>
          </div>
          <p className="mt-2 text-center text-[10.5px] text-ink/45">Customer action preview · live booking checks availability and the final payable amount.</p>
        </div>
      )}
    </div>
  )
}
