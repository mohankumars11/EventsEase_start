import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, Package, Sparkles, ChevronDown, ChevronUp, ShoppingCart, Check, Star, Pencil } from 'lucide-react'
import { EVENT_DATA } from '../../data/eventServicesData'
import { toWizardType } from '../../data/occasionMap'
import { formatINR, formatINRRange } from '../../utils/format'
import { SHOW_SERVICE_PRICES, BRAND } from '../../config/sambramo'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ProductImage from '../../components/shop/ProductImage'
import BookingDetailsModal from '../../components/customer/BookingDetailsModal'
import RatingBadge from '../../components/reviews/RatingBadge'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import ReviewModal from '../../components/reviews/ReviewModal'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// Where a guest's pending add waits while they sign in. Session scoped, same
// reasoning as the wizard's draft: one visit's intent, not a standing order.
const CART_INTENT_KEY = 'sambramo_cart_intent'

export default function EventServices() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const event = EVENT_DATA[eventId]
  const [activeTab, setActiveTab]     = useState('services') // 'services' | 'packages'
  const [expandedCat, setExpandedCat] = useState(null)
  const [pendingAdd, setPendingAdd]   = useState(null) // { kind: 'service'|'package', payload }
  const [editingDetails, setEditingDetails] = useState(false)
  const [reviewing, setReviewing]     = useState(null) // { subject, source }
  const [eligible, setEligible]       = useState({}) // `${type}__${id}` -> enquiryId
  const { cart, dispatch, hasItem, hasPkg, totalCount, getEventDetails } = useCart()

  /**
   * The one place anything reaches the cart from this page.
   *
   * Both entry points funnel through here so the signed-out check lives in a
   * single spot — this page is public now, and a guard duplicated across two
   * handlers is a guard that will eventually disagree with itself.
   */
  function commitAdd(kind, payload, details) {
    // The prompt fires here rather than on the button, deliberately: by this
    // point the visitor has already given us the date and the venue, so it
    // reads as "sign in to save this" instead of "prove who you are before
    // you may look". Same reasoning as the wizard, which asks at submit.
    if (!user) {
      try {
        sessionStorage.setItem(CART_INTENT_KEY, JSON.stringify({ eventId, kind, payload, details }))
      } catch {
        // Storage unavailable — signing in still works, the item just is not
        // recoverable, so don't block the journey on it.
      }
      navigate('/login', {
        state: { from: { pathname: location.pathname, search: location.search } },
      })
      return
    }

    const isFirstAdd = getEventDetails(eventId) === null
    if (kind === 'service') {
      dispatch({ type: 'ADD_SERVICE', eventId, eventName: event.name, service: payload, details })
    } else {
      dispatch({ type: 'ADD_PACKAGE', eventId, eventName: event.name, pkg: payload, details })
    }
    // Single-hamper events get their free gift auto-attached the moment
    // this event's first real item is confirmed — no separate click, no
    // second modal. Multi-tier events (birthday) skip this; the customer
    // picks a tier via selectHamper instead.
    if (isFirstAdd) {
      const hampers = event.packages.filter(p => p.type === 'hamper')
      if (hampers.length === 1 && !hasPkg(eventId, hampers[0].id)) {
        dispatch({ type: 'ADD_PACKAGE', eventId, eventName: event.name, pkg: hampers[0], details, complimentary: true })
      }
    }
  }

  // Booking details (date/time/guests/location) only need to be asked once
  // per event — getEventDetails(eventId) is non-null the moment the first
  // item for this event has them, so it doubles as "has this event already
  // been set up" without any separate tracked flag.
  function handleAddClick(kind, payload) {
    const existing = getEventDetails(eventId)
    if (!existing) { setPendingAdd({ kind, payload }); return }
    commitAdd(kind, payload, existing)
  }

  function confirmAdd(details) {
    if (!pendingAdd) return
    commitAdd(pendingAdd.kind, pendingAdd.payload, details)
    setPendingAdd(null)
  }

  // Finish what a guest started, once they come back signed in.
  //
  // Guarded on the event id because the intent is keyed to this page: signing
  // in from somewhere else entirely should not drop a stranger's item into
  // this cart. Cleared on read so a later visit starts clean.
  useEffect(() => {
    if (!user || !event) return
    let intent
    try {
      const raw = sessionStorage.getItem(CART_INTENT_KEY)
      if (!raw) return
      intent = JSON.parse(raw)
      sessionStorage.removeItem(CART_INTENT_KEY)
    } catch {
      return
    }
    if (intent?.eventId !== eventId) return
    commitAdd(intent.kind, intent.payload, intent.details)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId, event])

  function handleUpdateDetails(details) {
    ;[...cart.items, ...cart.packages]
      .filter(i => i.eventId === eventId)
      .forEach(i => dispatch({ type: 'SET_ITEM_DETAILS', key: i.key, details }))
    setEditingDetails(false)
  }

  function selectHamper(hamper) {
    const existing = cart.packages.find(p => p.eventId === eventId && p.pkg.type === 'hamper')
    if (existing) dispatch({ type: 'REMOVE_PACKAGE', key: existing.key })
    dispatch({ type: 'ADD_PACKAGE', eventId, eventName: event.name, pkg: hamper, details: getEventDetails(eventId), complimentary: true })
  }

  // Can this customer review a given service/package right now? — they
  // need a closed enquiry that included it, not yet reviewed.
  const checkEligibility = useCallback(async () => {
    if (!user) { setEligible({}); return }
    const [{ data: enquiries }, { data: myReviews }] = await Promise.all([
      supabase.from('service_enquiries').select('id, services, packages').eq('customer_id', user.id).eq('status', 'closed'),
      supabase.from('reviews_catalog').select('subject_type, subject_id').eq('customer_id', user.id).in('subject_type', ['service', 'package']),
    ])
    const map = {}
    for (const enq of enquiries ?? []) {
      for (const svc of enq.services ?? []) map[`service__${svc.id}`] = enq.id
      for (const pkg of enq.packages ?? []) map[`package__${pkg.id}`] = enq.id
    }
    for (const r of myReviews ?? []) delete map[`${r.subject_type}__${r.subject_id}`]
    setEligible(map)
  }, [user])

  useEffect(() => { checkEligibility() }, [checkEligibility])

  if (!event) {
    return (
      <CustomerLayout>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🤔</div>
          <h2 className="font-bold text-gray-700 mb-2">Event not found</h2>
          <Link to="/services" className="btn-primary">Browse all occasions</Link>
        </div>
      </CustomerLayout>
    )
  }

  // Group services by category
  const byCategory = event.services.reduce((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = []
    acc[svc.category].push(svc)
    return acc
  }, {})

  const categories = Object.keys(byCategory)
  const realPackages = event.packages.filter(p => p.type !== 'hamper')
  const hampers = event.packages.filter(p => p.type === 'hamper')

  const feedbackSubjects = [
    ...event.services.map(s => ({ type: 'service', id: s.id, name: s.name })),
    ...event.packages.map(p => ({ type: 'package', id: p.id, name: p.name })),
  ]

  return (
    <CustomerLayout>
      {/* Hero banner */}
      <div className={`bg-gradient-to-r ${event.heroGradient} text-white`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => navigate('/services')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5"
          >
            <ArrowLeft size={15} /> All events
          </button>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-6xl drop-shadow-lg">{event.emoji}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold drop-shadow">{event.name}</h1>
              <p className="text-white/80 mt-1 text-sm sm:text-base">{event.tagline}</p>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-xl">{event.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              {event.services.length} services available
            </span>
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              {event.packages.length} ready packages
            </span>
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              Sambramo organizes everything
            </span>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-saffron-500 text-saffron-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🛍️ Individual Services
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'packages'
                  ? 'border-saffron-500 text-saffron-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Package size={14} /> Complete Packages
                <span className="ml-1 px-1.5 py-0.5 bg-saffron-100 text-saffron-700 rounded text-[10px] font-bold">Save more</span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* The services cart is customer-only, and under the add-to-cart
                login rule a guest can never have anything in it — so pointing
                a signed-out visitor at it would only bounce them to /login
                from a button that promises a cart. The global header cart
                still covers them. */}
            {user && (
              <button
                onClick={() => navigate('/dashboard/customer/cart')}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-plum-300 transition-colors"
              >
                <ShoppingCart size={15} />
                Cart
                {totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {totalCount > 9 ? '9+' : totalCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => navigate('/plan/custom?type=' + toWizardType(eventId))}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-plum-700 text-white font-semibold text-sm hover:bg-plum-800"
            >
              <Sparkles size={15} />
              Or let us plan it all
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {getEventDetails(eventId) && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setEditingDetails(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              <Pencil size={12} /> Change event details
            </button>
          </div>
        )}

        {/* ── INDIVIDUAL SERVICES TAB ─────────────────────── */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Pick exactly what you need — mix and match from any category. Sambramo will organize this for you.
            </p>

            {categories.map(cat => {
              const svcs = byCategory[cat]
              const isOpen = expandedCat === null || expandedCat === cat
              return (
                <div key={cat} className="card overflow-hidden">
                  <ProductImage query={`Indian ${cat} ${event.name} celebration`} emoji={svcs[0].emoji} className="w-full h-24" />
                  <button
                    onClick={() => setExpandedCat(isOpen && expandedCat === cat ? null : cat)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{svcs[0].emoji}</span>
                      <span className="font-bold text-gray-800">{cat}</span>
                      <span className="text-xs text-gray-400 font-medium">{svcs.length} service{svcs.length > 1 ? 's' : ''}</span>
                    </div>
                    {expandedCat === cat
                      ? <ChevronUp size={16} className="text-gray-400" />
                      : <ChevronDown size={16} className="text-gray-400" />
                    }
                  </button>

                  {expandedCat !== cat && (
                    <div className="divide-y divide-gray-50">
                      {svcs.map(svc => {
                        const inCart = hasItem(eventId, svc.id)
                        return (
                          <div key={svc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl shrink-0">{svc.emoji}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{svc.name}</p>
                                <p className="text-xs text-gray-500 truncate">{svc.desc}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {/* Per-service hints carry their unit inside the
                                      string ("₹250 – ₹800/plate"), so shown in a
                                      scannable list the first number reads as the
                                      price of catering. Behind a flag until the
                                      unit is its own field. */}
                                  <p className="text-xs text-plum-500 font-medium">
                                    {SHOW_SERVICE_PRICES && svc.priceHint ? svc.priceHint : 'Custom quote'}
                                  </p>
                                  <RatingBadge subjectType="service" subjectId={svc.id} />
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              <button
                                onClick={() => !inCart && handleAddClick('service', svc)}
                                disabled={inCart}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-colors ${
                                  inCart
                                    ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                                    : 'bg-saffron-500 text-white hover:bg-saffron-600'
                                }`}
                              >
                                {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
                                {inCart ? 'Added' : 'Add to Cart'}
                              </button>
                              {eligible[`service__${svc.id}`] && (
                                <button
                                  onClick={() => setReviewing({
                                    subject: { type: 'service', id: svc.id, name: svc.name },
                                    source: { enquiryId: eligible[`service__${svc.id}`] },
                                  })}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                                >
                                  <Star size={11} /> Rate &amp; Review
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {user && totalCount > 0 && (
              <div className="sticky bottom-20 md:bottom-4 flex justify-center pointer-events-none">
                <button
                  onClick={() => navigate('/dashboard/customer/cart')}
                  className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-plum-700 text-white font-bold text-base shadow-2xl hover:bg-plum-800"
                >
                  <ShoppingCart size={18} />
                  View Cart ({totalCount}) →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PACKAGES TAB ────────────────────────────────── */}
        {activeTab === 'packages' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500 mb-2">
              Pre-curated bundles — save time, save money, and Sambramo handles every detail.
            </p>
            <p className="text-xs text-gray-500 bg-plum-50 border border-plum-100 rounded-xl px-3 py-2 mb-4 leading-relaxed">
              Ranges are indicative, for {BRAND.primaryCity}. Your final price is confirmed
              once we know your date, guest count and venue — and you approve it before
              anything is booked.
            </p>

            {realPackages.map(pkg => {
              const pkgServices = event.services.filter(s => pkg.includes.includes(s.id))
              const inCart = hasPkg(eventId, pkg.id)

              return (
                <div key={pkg.id} className={`card p-6 relative ${pkg.color}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{pkg.emoji}</span>
                        <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                        {pkg.popular && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${pkg.badge}`}>
                            ★ Most popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{pkg.tagline}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <RatingBadge subjectType="package" subjectId={pkg.id} />
                        {eligible[`package__${pkg.id}`] && (
                          <button
                            onClick={() => setReviewing({
                              subject: { type: 'package', id: pkg.id, name: pkg.name },
                              source: { enquiryId: eligible[`package__${pkg.id}`] },
                            })}
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                          >
                            <Star size={11} /> Rate &amp; Review
                          </button>
                        )}
                      </div>
                    </div>
                    {/* A self-serve catalog that prints "Custom quote" on every
                        card is the enquiry form with extra steps — the whole
                        point of browsing yourself is seeing what things cost.
                        A range is not a quote, and the caveat above the list
                        says so plainly. */}
                    <div className="text-right shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-plum-50 border border-plum-100">
                        <p className="text-[10px] text-gray-400 leading-tight">Typical range</p>
                        <p className="text-xs font-bold text-plum-700 whitespace-nowrap">
                          {formatINRRange(pkg.price_min, pkg.price_max)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Services included */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {pkgServices.map(s => (
                      <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 bg-white/70 border border-white rounded-full text-xs font-medium text-gray-700">
                        {s.emoji} {s.name}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => !inCart && handleAddClick('package', pkg)}
                    disabled={inCart}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
                      inCart
                        ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                        : 'bg-plum-700 text-white hover:bg-plum-800'
                    }`}
                  >
                    {inCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                    {inCart ? 'Added to Cart' : 'Add Package to Cart'}
                  </button>
                </div>
              )
            })}

            {hampers.length === 1 && (
              <div className="card p-5 flex items-center justify-between gap-4 bg-gradient-to-r from-saffron-50 to-pink-50 border-saffron-200">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl shrink-0">{hampers[0].emoji}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{hampers[0].name}</p>
                    <p className="text-xs text-gray-500 truncate">{hampers[0].items.join(' · ')}</p>
                  </div>
                </div>
                <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
                  hasPkg(eventId, hampers[0].id) ? 'bg-green-100 text-green-700' : 'bg-white text-saffron-700 border border-saffron-300'
                }`}>
                  {hasPkg(eventId, hampers[0].id) ? 'Added as your free gift ✓' : '🎁 Free with your booking'}
                </span>
              </div>
            )}

            {hampers.length > 1 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800 text-sm">🎁 Choose your free gift</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hampers.map(h => {
                    const selected = hasPkg(eventId, h.id)
                    return (
                      <div key={h.id} className={`card p-5 space-y-3 ${selected ? 'border-2 border-saffron-400' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{h.emoji}</span>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{h.name}</p>
                            <p className="text-xs text-saffron-600 font-semibold">Worth {formatINR(h.price_min)} — FREE</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {h.items.map(item => (
                            <span key={item} className="flex items-center gap-1 px-2.5 py-1 bg-white/70 border border-white rounded-full text-xs font-medium text-gray-700">
                              🎁 {item}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => !selected && selectHamper(h)}
                          disabled={selected}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${
                            selected
                              ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                              : 'bg-saffron-500 text-white hover:bg-saffron-600'
                          }`}
                        >
                          {selected ? 'Selected as your free gift ✓' : 'Select as free gift'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="card p-5 border-dashed border-2 border-saffron-300 bg-saffron-50 text-center">
              <Sparkles size={24} className="text-saffron-500 mx-auto mb-2" />
              <h4 className="font-bold text-gray-800 mb-1">Need something custom?</h4>
              <p className="text-sm text-gray-500 mb-4">Can't find the right package? Browse individual services and build your own combination.</p>
              <button
                onClick={() => setActiveTab('services')}
                className="px-6 py-2.5 rounded-xl bg-saffron-500 text-white font-semibold text-sm hover:bg-saffron-600"
              >
                Browse individual services →
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <ReviewsScroller subjects={feedbackSubjects} title={`What customers say about ${event.name}`} />
        </div>
      </div>

      {pendingAdd && (
        <BookingDetailsModal
          itemLabel={pendingAdd.payload.name}
          defaults={getEventDetails(eventId)}
          onConfirm={confirmAdd}
          onClose={() => setPendingAdd(null)}
        />
      )}

      {editingDetails && (
        <BookingDetailsModal
          itemLabel={event.name}
          defaults={getEventDetails(eventId)}
          onConfirm={handleUpdateDetails}
          onClose={() => setEditingDetails(false)}
        />
      )}

      {reviewing && (
        <ReviewModal
          subject={reviewing.subject}
          source={reviewing.source}
          onClose={() => setReviewing(null)}
          onSubmitted={checkEligibility}
        />
      )}
    </CustomerLayout>
  )
}
