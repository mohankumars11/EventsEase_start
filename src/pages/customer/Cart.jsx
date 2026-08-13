import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, Package, CheckCircle2, ChevronRight, Minus, Plus, AlertCircle, Calendar, Clock, Users, MapPin, Pencil, Phone } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { friendlyError } from '../../context/ToastContext'
import AppBar from '../../components/layout/AppBar'
import BookingSheet from '../../components/customer/BookingSheet'
import PriceLock from '../../components/plan/PriceLock'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'

export default function Cart() {
  const { cart, dispatch, totalCount, getEventDetails } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)
  const [editingEvent, setEditingEvent] = useState(null) // eventId currently being edited

  /**
   * What was just sent — ids and the estimate — captured before the cart is
   * emptied.
   *
   * The confirmation screen used to be a boolean, which was enough when all
   * it had to say was "sent". It now offers the price lock, and that needs
   * two things the cleared cart no longer holds: the enquiry ids to record a
   * claim against, and the band the customer was quoted so the panel can
   * name what the ₹1,000 is holding.
   */
  const [sent, setSent] = useState(null) // { ids: string[], low, high }

  const hasAnything = cart.items.length > 0 || cart.packages.length > 0

  /**
   * What the scales in this cart add up to, as a band.
   *
   * A package used to be a hand-written bundle with an invented range, so this
   * summary could only ever say "Custom quote". A package is now a priced
   * celebration tier — the estimate came out of the same quote engine the
   * builder uses — so the cart can state the band it was quoted, which is the
   * number the customer already saw and expects to see again here.
   *
   * Still an estimate, and still says so: the coordinator confirms it against
   * the real date, venue and headcount before anything is booked.
   */
  const pkgLow  = cart.packages.reduce((sum, p) => sum + (p.pkg.price_min ?? 0), 0)
  const pkgHigh = cart.packages.reduce((sum, p) => sum + (p.pkg.price_max ?? p.pkg.price_min ?? 0), 0)
  const hasPackageEstimate = cart.packages.length > 0 && pkgLow > 0

  // What the configured single-service bookings add up to. Only lines that
  // actually carry a price contribute — a service added from an occasion page
  // has none, and counting it as ₹0 would understate the total rather than
  // leave it out.
  const servicesTotal = cart.items.reduce(
    (sum, i) => sum + (Number.isFinite(i.service.priceMin) ? i.service.priceMin * i.qty : 0),
    0
  )

  // Group items by event
  const byEvent = {}
  cart.items.forEach(item => {
    if (!byEvent[item.eventId]) byEvent[item.eventId] = { name: item.eventName, services: [], packages: [] }
    byEvent[item.eventId].services.push(item)
  })
  cart.packages.forEach(p => {
    if (!byEvent[p.eventId]) byEvent[p.eventId] = { name: p.eventName, services: [], packages: [] }
    byEvent[p.eventId].packages.push(p)
  })

  /**
   * The three things a coordinator cannot start work without.
   *
   * Not "is the form filled" — a partial answer is fine and common. These are
   * specifically the ones whose absence makes the request unworkable: no date
   * means nothing can be checked for availability, no city means we cannot say
   * whether we serve it, and no phone means there is no way to come back with
   * the answer. Everything else can be sorted on the call.
   */
  function missingFor(details) {
    const missing = []
    if (!details?.date) missing.push('a date')
    if (!details?.location?.city) missing.push('a city')
    if (!details?.phone) missing.push('a phone number')
    return missing
  }

  /** Buckets that cannot be sent yet, in the order they appear. */
  const incompleteEvents = Object.keys(byEvent).filter(id => missingFor(getEventDetails(id)).length > 0)

  function applyDetailsToEvent(eventId, details) {
    const data = byEvent[eventId]
    if (!data) return
    ;[...data.services, ...data.packages].forEach(i => {
      dispatch({ type: 'SET_ITEM_DETAILS', key: i.key, details })
    })
    setEditingEvent(null)
  }

  /**
   * The note a coordinator actually reads, built from the details.
   *
   * Contact and venue address go here rather than into new columns because
   * service_enquiries has neither, and shipping code that depends on an
   * unapplied migration means the first real request silently loses the phone
   * number. `notes` and `location` both already exist; the structured copy
   * goes into `location` (JSONB) for any admin screen later, and this readable
   * version goes into `notes` for the human working the request tomorrow
   * morning on a phone.
   */
  function noteFor(details) {
    const lines = []
    if (details?.name || details?.phone) {
      lines.push(`Contact: ${[details.name, details.phone].filter(Boolean).join(' · ')}`)
    }
    if (details?.slot) lines.push(`Time of day: ${details.slot.replace('_', ' ')}`)
    if (details?.address) lines.push(`Venue: ${details.address}`)
    if (details?.notes) lines.push(`Customer note: ${details.notes}`)
    return lines.join('\n') || null
  }

  async function proceedToEnquiry() {
    // Sign-in is asked here, not at add. There is something to save at this
    // point and a reason a person can see — the same rule the wizard and the
    // storefront checkout follow. Asking at add-to-cart is what made the
    // single-service page feel broken: the button appeared to discard the
    // customer's work and show them a login screen.
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/customer/cart' } } })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const rows = Object.entries(byEvent).map(([eventId, data]) => {
        const details = getEventDetails(eventId)
        return {
          customer_id: user.id,
          event_id:    eventId,
          event_name:  data.name,
          event_date:  details?.date || cart.eventDates[eventId] || null,
          start_time:  details?.time || null,
          guest_count: details?.guestCount || null,
          location:    details?.location
            ? { ...details.location, address: details.address ?? null, phone: details.phone ?? null, name: details.name ?? null, slot: details.slot ?? null }
            : null,
          notes:       noteFor(details),
          services:    data.services.map(i => ({ id: i.service.id, name: i.service.name, emoji: i.service.emoji, qty: i.qty, unit_price: i.service.priceMin ?? null, chosen: i.service.summary ?? null, details: i.details })),
          packages:    data.packages.map(p => ({ id: p.pkg.id, name: p.pkg.name, type: p.pkg.type, price_min: p.pkg.price_min, price_max: p.pkg.price_max, details: p.details, complimentary: !!p.complimentary })),
          status: 'open',
        }
      })

      // `.select('id')` so the confirmation screen can offer the price lock
      // against the rows it just created. Without the ids there is nothing to
      // record a claim on, which is how this screen ended up being the one
      // ending that never mentioned the lock at all.
      const { data: inserted, error: err } = await supabase
        .from('service_enquiries')
        .insert(rows)
        .select('id')
      if (err) throw err

      const estimateLow  = pkgLow + servicesTotal
      const estimateHigh = (pkgHigh || pkgLow) + servicesTotal

      dispatch({ type: 'CLEAR' })
      setSent({
        ids:  (inserted ?? []).map(r => r.id),
        low:  estimateLow  > 0 ? estimateLow  : null,
        high: estimateHigh > 0 ? estimateHigh : null,
      })
    } catch (err) {
      setError(friendlyError(err, 'Something went wrong submitting your requirements. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Record the claim against every enquiry this send created.
   *
   * One cart can be several enquiries — one per event — and the ₹1,000 holds
   * the request as it was sent, so all of them carry the claim and the same
   * reference. Best-effort by design: see PriceLock.
   */
  async function claimLock() {
    if (!sent?.ids?.length) return
    const { error: err } = await supabase.from('service_enquiries').update({
      lock_payment_status: 'claimed',
      lock_payment_amount: LOCK_AMOUNT,
      lock_payment_ref:    sent.ids[0],
      lock_claimed_at:     new Date().toISOString(),
    }).in('id', sent.ids)
    if (err) console.warn('Price-lock claim not recorded (migration 034 applied?):', err.message)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-cream pb-bottom-nav">
        {/* No back arrow and no cart icon on the confirmation: the cart it
            would return to is the one that was just emptied, and a bag badge
            reading 0 beside "Requirements sent" is the app contradicting its
            own good news. */}
        <AppBar tone="plum" title="Request sent" subtitle="A coordinator picks it up next" cart={false} />
        <div className="mx-auto max-w-md px-4 py-14 text-center space-y-5">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Requirements sent! 🎉</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your requirements have been submitted. Our concierge team will review everything
            and get back to you with confirmed pricing within 24 hours.
          </p>
          {sent.low && (
            <p className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-amber-200">
              {sent.high && sent.high !== sent.low
                ? `${formatINR(sent.low)} – ${formatINR(sent.high)}`
                : formatINR(sent.low)}{' '}
              <span className="font-medium text-gray-400">estimated</span>
            </p>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-1">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">What happens next</p>
            <p className="text-sm text-gray-600">① Our team reviews your requirements</p>
            <p className="text-sm text-gray-600">② You receive confirmed pricing in My Requests</p>
            <p className="text-sm text-gray-600">③ Confirm and we handle the rest</p>
          </div>

          {/* The hold, offered here rather than only in the builder.
              This is the ending that the eight scales reach when they are
              added from an occasion page, and it used to say "no payment now"
              and stop — so the price lock existed for one route through the
              app and was invisible on the one most customers take. */}
          <PriceLock
            reference={sent.ids[0]}
            headline={`Hold this price for ${formatINR(LOCK_AMOUNT)}`}
            onClaim={claimLock}
            onSkip={() => navigate('/dashboard/customer/requests')}
            whatsappText={`Hi Sambramo, I'd like to hold my request (ref ${sent.ids[0]?.slice(0, 8)?.toUpperCase() ?? ''}). Please send me payment details.`}
          />

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/dashboard/customer/requests')}
              className="w-full py-3 rounded-xl bg-saffron-500 text-white font-bold hover:bg-saffron-600"
            >
              Track in My Requests
            </button>
            <button
              onClick={() => navigate('/dashboard/customer')}
              className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-bottom-nav">
      {/* One back control, in the bar, where every other screen keeps it. The
          page used to draw its own directly beneath the shell's "Back" link —
          two arrows, eight pixels apart, doing different things: the shell's
          went home, this one went back. */}
      <AppBar
        tone="plum"
        backTo="/services"
        title="My cart"
        subtitle={`${totalCount} item${totalCount !== 1 ? 's' : ''} selected`}
        cart={false}
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">
        <h1 className="sr-only">My cart</h1>

        {!hasAnything ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="text-6xl">🛒</div>
            <h2 className="font-bold text-gray-800">Your cart is empty</h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">
              Browse a function or festival and add the services you need — a
              cook, a priest, decorations. Nothing is booked until you approve a quote.
            </p>
            <Link
              to="/services"
              className="mt-1 inline-block rounded-xl bg-saffron-500 px-6 py-3 font-bold text-white transition-colors hover:bg-saffron-600"
            >
              Browse occasions
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byEvent).map(([eventId, data]) => (
              <div key={eventId} className="card overflow-hidden">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-800 text-sm">{data.name}</span>
                  <span className="text-xs text-amber-600">{data.services.length + data.packages.length} item{data.services.length + data.packages.length !== 1 ? 's' : ''}</span>
                </div>
                {/* ── What we know, and what is still missing ──────────
                    This block used to render only when details existed, and
                    the button to *add* details lived inside it. So an item
                    with no details had no way to acquire any: the only exit
                    was the "some items are missing event details" warning at
                    the bottom, which told you to go back to the services page.
                    It always renders now, and says which of the three things a
                    coordinator cannot work without is still outstanding. */}
                <div className="px-5 py-2.5 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {getEventDetails(eventId)?.date && (
                    <span className="flex items-center gap-1 text-xs text-amber-700"><Calendar size={12} />{new Date(getEventDetails(eventId).date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  )}
                  {getEventDetails(eventId)?.time && (
                    <span className="flex items-center gap-1 text-xs text-amber-700"><Clock size={12} />{getEventDetails(eventId).time}</span>
                  )}
                  {getEventDetails(eventId)?.guestCount && (
                    <span className="flex items-center gap-1 text-xs text-amber-700"><Users size={12} />{getEventDetails(eventId).guestCount} guests</span>
                  )}
                  {getEventDetails(eventId)?.location?.area && (
                    <span className="flex items-center gap-1 text-xs text-amber-700"><MapPin size={12} />{getEventDetails(eventId).location.area}, {getEventDetails(eventId).location.city}</span>
                  )}
                  {getEventDetails(eventId)?.phone && (
                    <span className="flex items-center gap-1 text-xs text-amber-700"><Phone size={12} />{getEventDetails(eventId).phone}</span>
                  )}
                  {missingFor(getEventDetails(eventId)).length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle size={12} /> Needs {missingFor(getEventDetails(eventId)).join(', ')}
                    </span>
                  )}
                  <button
                    onClick={() => setEditingEvent(eventId)}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 ml-auto"
                  >
                    <Pencil size={11} /> {missingFor(getEventDetails(eventId)).length ? 'Add details' : 'Edit'}
                  </button>
                </div>

                {/* Packages */}
                {data.packages.map(p => (
                  <div key={p.key} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 bg-purple-50/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                        <Package size={18} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {p.pkg.emoji ? `${p.pkg.emoji} ` : ''}{p.pkg.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.pkg.typicalGuests ? `Around ${p.pkg.typicalGuests} guests` : 'Complete celebration'}
                          {p.pkg.includes?.length ? ` · ${p.pkg.includes.length} services included` : ''}
                        </p>
                        <p className="text-xs font-semibold mt-0.5 text-amber-600">
                          {Number.isFinite(p.pkg.price_min) && Number.isFinite(p.pkg.price_max)
                            ? `Est. ${formatINR(p.pkg.price_min)} – ${formatINR(p.pkg.price_max)}`
                            : 'Custom quote'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_PACKAGE', key: p.key })}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {/* Individual services */}
                {data.services.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{item.service.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{item.service.name}</p>
                        {item.service.desc && <p className="text-xs text-gray-400 truncate">{item.service.desc}</p>}

                        {/* A configured single-service booking carries the price
                            the customer agreed to on the option card. Printing
                            "Custom quote" over it — which this line did for
                            every service, unconditionally — threw away the one
                            number they had already been shown and made a
                            completed booking look like an unanswered enquiry.
                            Services added from an occasion page still have no
                            price and still say so. */}
                        {Number.isFinite(item.service.priceMin) && item.service.priceMin > 0 ? (
                          <p className="text-xs text-plum-600 font-bold mt-0.5">
                            Est. {formatINR(item.service.priceMin * item.qty)}
                            {item.qty > 1 && (
                              <span className="text-gray-400 font-medium"> · {formatINR(item.service.priceMin)} each</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-plum-500 font-medium mt-0.5">Custom quote</p>
                        )}

                        {/* What was actually chosen — the cuisine and its dishes,
                            the decoration and its extras, what the package
                            delivers. The coordinator reads the same lines. */}
                        {item.service.summary?.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.service.summary.slice(0, 3).map((line, i) => (
                              <li key={i} className="text-[11px] leading-snug text-gray-500 line-clamp-1">
                                · {line}
                              </li>
                            ))}
                            {item.service.summary.length > 3 && (
                              <li className="text-[11px] text-gray-400">
                                + {item.service.summary.length - 3} more details sent with your request
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button
                          onClick={() => dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty - 1 })}
                          disabled={item.qty <= 1}
                          className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-gray-700">{item.qty}</span>
                        <button
                          onClick={() => dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty + 1 })}
                          className="p-1.5 text-gray-500 hover:text-gray-800"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_ITEM', key: item.key })}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Actionable, where the old warning was not. It used to say
                "reopen them from the services page", which is a instruction to
                leave the cart and navigate back to somewhere that could not
                actually collect the missing fields. The fix is one tap, here. */}
            {incompleteEvents.length > 0 && (
              <button
                onClick={() => setEditingEvent(incompleteEvents[0])}
                className="flex w-full items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-left hover:bg-amber-100 transition-colors"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>{byEvent[incompleteEvents[0]]?.name}</strong> still needs{' '}
                  {missingFor(getEventDetails(incompleteEvents[0])).join(', ')} before we
                  can check availability.
                  <span className="block text-xs text-amber-700/80 mt-0.5">
                    Tap to add — takes about twenty seconds.
                  </span>
                </span>
              </button>
            )}

            {/* Summary */}
            <div className="card p-5 bg-amber-50 border-amber-200 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">📋 Summary</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Individual services</span>
                <span className="font-medium">{cart.items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Packages</span>
                <span className="font-medium">{cart.packages.length}</span>
              </div>
              {hasPackageEstimate && (
                <div className="flex justify-between gap-3 text-sm text-gray-600 border-t border-amber-200 pt-3">
                  <span>Estimated for the scales you picked</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {formatINR(pkgLow)} – {formatINR(pkgHigh)}
                  </span>
                </div>
              )}
              {servicesTotal > 0 && (
                <div className="flex justify-between gap-3 text-sm text-gray-600 border-t border-amber-200 pt-3">
                  <span>Services you configured and priced</span>
                  <span className="font-semibold text-gray-900 text-right">{formatINR(servicesTotal)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-1">
                💬 {servicesTotal > 0
                  ? 'The figures above are the estimates you were shown while choosing, not locked quotes — a coordinator confirms them against your date and venue.'
                  : 'Individual services are quoted rather than listed — our team reviews your exact requirements and sends one final price in'}
                {servicesTotal > 0 ? ' You will see the confirmed price in ' : ' '}
                <strong>My Requests</strong>.
                {hasPackageEstimate && ' The band above is the estimate you were shown, not a locked quote.'}
                {' '}Nothing is charged now.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            {/* One button, and it always does something.
                Disabling it while details are missing would leave the customer
                staring at a greyed-out CTA working out what to fix; instead it
                opens the sheet that fixes it, and only submits once the request
                is actually workable. */}
            <button
              onClick={() => {
                if (incompleteEvents.length) { setEditingEvent(incompleteEvents[0]); return }
                proceedToEnquiry()
              }}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-base hover:bg-amber-600 disabled:opacity-60 shadow-lg flex items-center justify-center gap-2"
            >
              {submitting
                ? 'Sending…'
                : incompleteEvents.length
                  ? 'Add your date & contact to send'
                  : user
                    ? 'Send to our team'
                    : 'Sign in & send to our team'}
              {!submitting && <ChevronRight size={18} />}
            </button>
            <p className="text-xs text-center text-gray-400">
              Nothing is charged to send this — we'll confirm pricing and you decide before anything is
              booked. You can optionally hold your date for {formatINR(LOCK_AMOUNT)} on the next screen.
              {!user && ' Your cart is saved on this device until you sign in.'}
            </p>
          </div>
        )}
      </div>

      {editingEvent && (
        <BookingSheet
          title="Where and when"
          subtitle={byEvent[editingEvent]?.name}
          guestCount={getEventDetails(editingEvent)?.guestCount}
          defaults={getEventDetails(editingEvent)}
          confirmLabel="Save these details"
          onConfirm={details => applyDetailsToEvent(editingEvent, details)}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  )
}
