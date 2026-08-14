import { useMemo } from 'react'
import {
  Pencil, Info, TrendingDown, Receipt, Users, UtensilsCrossed, Palette,
  ListChecks, Sparkles, PhoneCall, Leaf, ShieldCheck, Ticket,
} from 'lucide-react'
import { formatINR, humanDate } from '../../utils/format'
import { slotByKey } from '../../lib/demand'
import { BOOKING_MODES } from '../../data/celebrationTiers'
import { COURSES, dishesFor } from '../../data/cuisineMenus'
import { BRAND } from '../../config/sambramo'
import ContactBlock from './ContactBlock'

/**
 * The review — every decision and every rupee, on one page.
 *
 * ── Why this stopped being a sheet ──────────────────────────────────────
 * Review used to be a modal that slid up over the builder: you tapped a bar
 * pinned to the bottom of the screen and a panel took the viewport, capped
 * at 92dvh, with the breakdown scrolling inside a window inside a scrolling
 * page. Two consequences, both reported:
 *
 *   The bar itself sat over the content for the entire build, so on a phone
 *   the last option of every step lived underneath it.
 *
 *   A modal is the wrong container for the longest content in the flow.
 *   Nesting a scroll region inside a covered page hides more than it shows,
 *   and it made "review" feel like a thing that could ambush you at any
 *   point rather than the last thing you do.
 *
 * So review is a STEP now — the sixth and final one. It owns the page, it
 * scrolls like a page, and nothing is behind it to be hidden. The pinned bar
 * below it carries one primary action and a price you can tap; it no longer
 * carries the review itself.
 *
 * ── The spine ───────────────────────────────────────────────────────────
 * The sections are numbered and joined by a vertical rule. That is not
 * decoration: a quote is a chain of decisions where each one changed the
 * next (the scale set the dish allowance, the guest count stretched the
 * décor, the mode earned the discount), and a flat stack of cards loses
 * that. The spine says "this followed from that", top to bottom, and every
 * node has an Edit that jumps straight back to the step that owns it.
 *
 * ── What gets shown ─────────────────────────────────────────────────────
 * Everything. The dish names course by course, not "menu: 18 items". The
 * plate arithmetic — base, premium dishes, extra dishes, bulk band — not
 * just ₹690. The décor split between installation, table work, theme and
 * add-ons. Each service with its unit maths spelled out. Then the money
 * spine: subtotal, saving, fee, each tax slab at its own rate, total.
 *
 * The number at the top is a RANGE and stays one. Sambramo has no signed
 * caterer yet; a figure to the rupee would imply a rate card that does not
 * exist. See utils/quote.js.
 */
export default function ReviewBoard({
  quote, blocked, submitting, onSubmit, onEdit,
  occasionName, occasionEmoji, mode,
  cuisine, menu, vegOnly, specialRequests, cateringOn, decorOn,
  eventDate, onEventDate, city, onCity, offer, onClearOffer,
  contact, onContact, timeSlot, onTimeSlot,
}) {
  // Dish ids → names, course by course. Done here rather than in the JSX so
  // an empty course disappears entirely instead of rendering a bare heading.
  const menuByCourse = useMemo(() => {
    if (!cuisine || !menu) return []
    return COURSES.map(course => {
      const chosen = menu[course.id] ?? []
      if (!chosen.length) return null
      const available = dishesFor(cuisine, course.id, { vegOnly })
      const dishes = chosen.map(id => available.find(d => d.id === id)).filter(Boolean)
      if (!dishes.length) return null
      return { course, dishes }
    }).filter(Boolean)
  }, [cuisine, menu, vegOnly])

  if (!quote) {
    return (
      <div className="card p-8 text-center border-2 border-dashed border-gray-200">
        <p className="text-4xl mb-2">🧾</p>
        <p className="text-sm text-gray-500">
          Pick an occasion and a scale, and everything you choose gets itemised here before you send it.
        </p>
      </div>
    )
  }

  const dishCount = menuByCourse.reduce((n, m) => n + m.dishes.length, 0)
  const bookingMode = BOOKING_MODES[mode]

  return (
    <div className="space-y-5">
      {/* ── The headline ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-plum-800 via-plum-700 to-plum-900 text-white shadow-lg">
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mute">
            Your celebration, priced
          </p>
          <p className="mt-1 text-base font-bold text-ink-soft">
            {occasionEmoji} {occasionName}
          </p>
          <p className="mt-3 text-3xl sm:text-4xl font-extrabold leading-none">
            {formatINR(quote.range.low)}
            <span className="text-ink-mute font-bold"> – </span>
            {formatINR(quote.range.high)}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            All taxes in · about {formatINR(quote.perGuest)} per guest
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-hairline/10 border-t border-hairline/10 text-center">
          <Stat label="Scale" value={quote.tier.name} sub={quote.tier.localName} />
          <Stat label="Guests" value={String(quote.guests)} sub={quote.plate.band.label} />
          <Stat
            label="Booked as"
            value={bookingMode?.name ?? '—'}
            sub={quote.bundle.applied ? `${Math.round(quote.bundle.rate * 100)}% saved` : 'no bundle'}
          />
        </div>
      </div>

      {/* ── The spine ──────────────────────────────────────────────── */}
      <div className="relative pl-9 sm:pl-11">
        {/* One continuous rule behind the nodes. Inset so it starts and ends
            inside the first and last card rather than dangling into space. */}
        <span
          aria-hidden="true"
          className="absolute left-[15px] sm:left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-saffron-400/60 via-white/20 to-transparent"
        />

        <div className="space-y-4">
          <Node n={1} icon={Sparkles} title="The occasion" onEdit={() => onEdit('occasion')}>
            <Row
              label={occasionName}
              detail={eventDate
                ? `${humanDate(eventDate)}${timeSlot ? ` · ${slotByKey(timeSlot)?.label}` : ''} · ${city}`
                : `${city} · date not fixed yet`}
            />
            <p className="mt-2 text-[11px] text-gray-500">
              Set the date, the time of day and how we reach you in step 6 below.
            </p>
          </Node>

          <Node n={2} icon={Users} title="The scale" onEdit={() => onEdit('scale')}>
            <Row
              label={`${quote.tier.emoji} ${quote.tier.name} — ${quote.tier.localName}`}
              detail={`${quote.guests} guests · built for ${quote.tier.guests.min}–${quote.tier.guests.max}`}
            />
            <Row label="Coordination" detail={quote.tier.coordination} value={quote.coordination} />
          </Node>

          {quote.cuisine ? (
            <Node n={3} icon={UtensilsCrossed} title="The food" onEdit={() => onEdit('food')}>
              <Row
                label={`${quote.cuisine.emoji} ${quote.cuisine.name}`}
                detail={`${dishCount} dishes${vegOnly ? ' · pure vegetarian' : ' · veg & non-veg'}`}
                value={quote.catering.total}
              />

              {/* The plate arithmetic, opened up. "Why is my plate ₹690" is
                  the most-asked question in this business; answering it
                  before it is asked is most of what this page is for. */}
              <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3 space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500">
                  How the plate rate is built
                </p>
                <Micro label={`${quote.cuisine.name} base rate`} value={`₹${quote.plate.base}`} />
                {quote.plate.dishPremium > 0 && (
                  <Micro
                    label={`Premium dishes (${quote.plate.premiumDishes.map(d => d.name).join(', ')})`}
                    value={`+₹${quote.plate.dishPremium}`}
                  />
                )}
                {quote.plate.extraDishes > 0 && (
                  <Micro
                    label={`${quote.plate.extraDishes} dish${quote.plate.extraDishes === 1 ? '' : 'es'} beyond the scale's allowance`}
                    value={`+₹${quote.plate.extraDishCost}`}
                  />
                )}
                {quote.plate.band.multiplier !== 1 && (
                  <Micro
                    label={`${quote.plate.band.label} — cooking for ${quote.guests}`}
                    value={`×${quote.plate.band.multiplier}`}
                    good={quote.plate.band.multiplier < 1}
                  />
                )}
                <div className="flex items-baseline justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-xs font-bold text-gray-700">Per plate</span>
                  <span className="text-sm font-extrabold text-gray-900">₹{quote.plate.perPlate}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">× {quote.guests} guests</span>
                  <span className="text-sm font-bold text-plum-700">{formatINR(quote.catering.total)}</span>
                </div>
              </div>

              {/* Every dish by name. A coordinator reads the same list in the
                  enquiry note, so "that is not what I ordered" has nowhere
                  left to come from. */}
              {menuByCourse.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                    The menu, course by course
                  </p>
                  <div className="space-y-2">
                    {menuByCourse.map(({ course, dishes }) => (
                      <div key={course.id} className="rounded-xl border border-gray-100 px-3.5 py-2.5">
                        <p className="text-xs font-bold text-gray-700">
                          {course.label}
                          <span className="ml-1.5 font-medium text-gray-500">{dishes.length}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          {dishes.map((d, i) => (
                            <span key={d.id}>
                              {i > 0 && <span className="text-gray-300"> · </span>}
                              <span className={d.veg ? 'text-green-600' : 'text-red-500'}>●</span>{' '}
                              {d.name}
                            </span>
                          ))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vegOnly && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700">
                  <Leaf size={12} /> Pure vegetarian throughout
                </p>
              )}

              {specialRequests?.trim() && (
                <div className="mt-3 rounded-xl bg-saffron-50 border border-saffron-200 px-3.5 py-2.5">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-saffron-700">
                    Noted for the kitchen
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-700 whitespace-pre-line">{specialRequests}</p>
                </div>
              )}
            </Node>
          ) : (
            /* Two different absences that used to read as one. "Switched off"
               shown to somebody who simply has not opened the Food step yet
               is a lie that sends them to the wrong screen to fix it. */
            <Node
              n={3}
              icon={UtensilsCrossed}
              title="The food"
              muted
              onEdit={() => onEdit(cateringOn ? 'food' : 'services')}
            >
              <p className="text-sm text-gray-500">
                {cateringOn
                  ? 'No cuisine picked yet — there is no food in this estimate. Pick one and the menu fills itself in.'
                  : 'Not included — catering is switched off under Everything else.'}
              </p>
            </Node>
          )}

          {quote.decor.level && quote.decor.level.id !== 'none' ? (
            <Node n={4} icon={Palette} title="The décor" onEdit={() => onEdit('decor')}>
              <Row
                label={`${quote.decor.level.emoji ?? '🎨'} ${quote.decor.level.name}`}
                detail={quote.decor.stretch > 1
                  ? `Scaled up ×${quote.decor.stretch.toFixed(2)} for ${quote.guests} guests`
                  : 'At this guest count, no scaling'}
                value={quote.decor.total}
              />
              <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3 space-y-1.5">
                <Micro label="Installation, setup and clearing" value={formatINR(quote.decor.installation)} />
                <Micro label={`Table styling × ${quote.guests}`} value={formatINR(quote.decor.tableWork)} />
                {quote.decor.themeDelta > 0 && (
                  <Micro label={`Theme — ${quote.decor.theme?.name}`} value={`+${formatINR(quote.decor.themeDelta)}`} />
                )}
                {quote.decor.addons.map(a => (
                  <Micro key={a.id} label={`Add-on — ${a.name}`} value={`+${formatINR(a.price)}`} />
                ))}
              </div>
            </Node>
          ) : (
            <Node
              n={4}
              icon={Palette}
              title="The décor"
              muted
              onEdit={() => onEdit(decorOn ? 'decor' : 'services')}
            >
              <p className="text-sm text-gray-500">
                {decorOn
                  ? 'No décor level chosen yet — nothing decorative is in this estimate.'
                  : 'Not included — décor is switched off under Everything else.'}
              </p>
            </Node>
          )}

          <Node
            n={5}
            icon={ListChecks}
            title={`Everything else${quote.services.length ? ` (${quote.services.length})` : ''}`}
            onEdit={() => onEdit('services')}
            muted={quote.services.length === 0}
          >
            {quote.services.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing extra picked yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {quote.services.map(({ service, qty, amount }) => (
                  <div key={service.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{service.emoji} {service.name}</p>
                      <p className="text-xs text-gray-500">
                        {service.unit === 'per_guest'
                          ? `₹${service.base} per guest × ${quote.guests}`
                          : service.unit === 'per_unit'
                            ? `${qty} × ₹${service.base} per ${service.unitLabel ?? 'unit'}`
                            : service.scales ? `Scaled to ${quote.guests} guests` : 'For the event'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Node>

          {/* ── Who we call, and when ────────────────────────────────────
              The last link in the chain, and the only one that is required.
              A request that cannot be followed up is not a request — see
              ContactBlock for why this was missing and what it cost. */}
          <Node n={6} icon={PhoneCall} title="How we reach you">
            <ContactBlock
              contact={contact}
              onContact={onContact}
              eventDate={eventDate}
              onEventDate={onEventDate}
              timeSlot={timeSlot}
              onTimeSlot={onTimeSlot}
              city={city}
              onCity={onCity}
            />
          </Node>
        </div>
      </div>

      {/* ── The money, line by line ────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-900 text-white">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mute">
            How the number is built
          </p>
          <p className="text-sm font-bold">Nothing added after this line</p>
        </div>

        <div className="px-5 py-3 space-y-2">
          <Money label="Everything above, added up" value={quote.subtotal} />

          {quote.bundle.applied && (
            <Money
              label={
                <span className="inline-flex items-center gap-1.5 text-green-700">
                  <TrendingDown size={13} />
                  Whole-celebration saving ({Math.round(quote.bundle.rate * 100)}%)
                </span>
              }
              detail="Food, décor and coordination booked together"
              value={-quote.bundle.amount}
              tone="green"
            />
          )}

          <Money
            label="Sambramo platform fee"
            detail={`${Math.round(quote.platformFee.rate * 100)}% — sourcing, negotiating and standing behind the booking`}
            value={quote.platformFee.amount}
          />

          {quote.tax.parts.map(part => (
            <Money
              key={part.key}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Receipt size={13} className="text-gray-500" />
                  {quote.tax.label} on {part.label}
                </span>
              }
              detail={`at ${Math.round(part.rate * 100)}%`}
              value={part.amount}
            />
          ))}
        </div>

        <div className="px-5 py-4 bg-plum-50 border-t-2 border-plum-100">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800">Estimated total</p>
              <p className="text-[11px] text-gray-500">incl. all taxes</p>
            </div>
            <p className="text-right text-xl font-extrabold text-plum-800 leading-tight">
              {formatINR(quote.range.low)}
              <span className="text-plum-700"> – </span>
              {formatINR(quote.range.high)}
            </p>
          </div>
        </div>

        {/* The claimed coupon sits BELOW the total and is not subtracted from
            it, which is the honest arrangement: this page shows what the
            configuration costs, and the discount is applied to the document a
            coordinator sends back. Showing it as a struck-through line here
            would be inventing a number no system has agreed to. */}
        {offer && (
          <div className="flex items-start justify-between gap-3 border-t border-dashed border-gray-200 bg-saffron-50 px-5 py-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-saffron-800">
                <Ticket size={14} /> {offer.name} — {offer.headline}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-saffron-700/80">
                {offer.code && <span className="font-mono font-bold">{offer.code}</span>}
                {offer.code && ' · '}
                Goes with your request. Your coordinator takes it off the confirmed quote — it is not in the
                estimate above.
              </p>
            </div>
            {onClearOffer && (
              <button
                type="button"
                onClick={onClearOffer}
                className="shrink-0 -mr-1 min-h-[44px] px-2.5 text-xs font-bold text-saffron-800 underline underline-offset-2"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Send it ────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <p className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />
          <span>
            <strong className="text-gray-700">This is an estimate, not a final quote — it can vary slightly.</strong>{' '}
            Built from current {BRAND.pilotCities.join(' and ')} market rates. A coordinator confirms venue access,
            date and vendor availability, then sends you a final figure to approve. Nothing is booked until you do.
          </span>
        </p>

        {blocked && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            {blocked.message}
          </p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !!blocked}
          className="w-full min-h-[54px] rounded-xl bg-saffron-500 text-ink font-bold text-base active:bg-saffron-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Get this confirmed →'}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck size={12} /> Free to send. Nothing to pay to get a confirmed quote.
        </p>
      </div>
    </div>
  )
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function Stat({ label, value, sub }) {
  return (
    <div className="px-2 py-3 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">{label}</p>
      <p className="mt-0.5 text-sm font-bold truncate">{value}</p>
      <p className="text-[10px] text-ink-mute truncate">{sub}</p>
    </div>
  )
}

/**
 * One link in the chain: a numbered node on the rule, a card beside it, and
 * the way back to the step that owns it. Edit is a real target (44px) rather
 * than a hover-revealed pencil — nothing on this page may depend on hover.
 */
function Node({ n, icon: Icon, title, children, onEdit, muted }) {
  return (
    <section className="relative">
      <span
        aria-hidden="true"
        /* The ring is the page's ground, not cream — it exists to punch the
           node out of the spine rule behind it, so it has to match whatever
           it is drawn on. See planBuilder.css. */
        className={`absolute -left-9 sm:-left-11 top-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-extrabold ring-4 ring-[#1a0730] ${
          muted ? 'bg-white/15 text-white/60' : 'bg-saffron-500 text-plum-950'
        }`}
      >
        {n}
      </span>

      <div className={`card p-4 sm:p-5 ${muted ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <Icon size={15} className="text-plum-600" />
            {title}
          </h3>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 -mr-1 inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-plum-700 active:text-plum-900"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

function Row({ label, detail, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
      {value != null && (
        <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(value)}</p>
      )}
    </div>
  )
}

function Micro({ label, value, good }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-xs text-gray-500">{label}</span>
      <span className={`shrink-0 text-xs font-bold ${good ? 'text-green-700' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function Money({ label, detail, value, tone }) {
  const negative = value < 0
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
      <p className={`shrink-0 text-sm font-bold ${tone === 'green' ? 'text-green-700' : 'text-gray-900'}`}>
        {negative ? '−' : ''}{formatINR(Math.abs(value))}
      </p>
    </div>
  )
}
