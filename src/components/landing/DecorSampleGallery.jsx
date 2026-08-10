import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, ArrowLeft, Sparkles, Check, Camera } from 'lucide-react'
import { SAMPLES_BY_EVENT, FEATURED_SAMPLES, SAMPLE_TOTALS } from '../../config/decorSamples'
import { toWizardType } from '../../data/occasionMap'
import { formatINRRange } from '../../utils/format'
import ImageSourceBadge from '../shop/ImageSourceBadge'

/**
 * The decoration gallery — what a setup actually looks like, per occasion.
 *
 * The rest of this page tells you we arrange décor and lists the services that
 * go into it. Nobody has ever chosen a decorator from a list of services. This
 * is the section that answers the only question a customer is really asking,
 * which is "show me what I am buying".
 *
 * ── The honesty rule, which is not negotiable ─────────────────────────────
 * Every photograph here is a licensed stock photograph of a similar setup, not
 * a photograph of work Sambramo has delivered — Sambramo is pre-launch and has
 * delivered none. That is the same fact ImageSourceBadge exists to state on
 * every product tile, so this gallery uses the same badge, in the same words,
 * on every image.
 *
 * It would be trivial to drop the badge and caption this section "Our recent
 * work". It would also be a lie told to a customer about a real business, and
 * it is the single thing this component must not do. The copy throughout is
 * therefore written in the future tense — "the setup we will build you" — and
 * the badge reads `sample.source`, which flips to 'actual' on its own the day
 * a real event is photographed and its URL replaces the stock one.
 */

/* ═══════════════════════════════════════════════════════════
   Shared helpers
═══════════════════════════════════════════════════════════ */

/**
 * Which shop category sells the physical pieces for a given setup.
 *
 * Derived from the services the sample is built from rather than hardcoded
 * per event: a setup containing a pooja or a priest sends people to the pooja
 * aisle, everything else to party essentials. That keeps the link correct for
 * an event that gains or loses a ritual component later.
 */
function shopCategoryFor(sample) {
  const ritual = sample.includes.some(id => id === 'pooja' || id === 'priest')
  return ritual ? 'Pooja & Essentials' : 'Party Essentials'
}

function planHref(sample) {
  return `/plan?type=${encodeURIComponent(toWizardType(sample.eventId))}`
}

function shopHref(sample) {
  return `/shop/${encodeURIComponent(shopCategoryFor(sample))}`
}

/* ═══════════════════════════════════════════════════════════
   Photo — never collapses, never flashes
═══════════════════════════════════════════════════════════ */

/**
 * Same compositing contract as StorefrontSections' Photo: the tinted plate and
 * the emoji sit underneath at all times and the photograph fades in on top, so
 * a sample the resolver has not reached yet renders as a designed tile rather
 * than a hole in the grid.
 */
function SamplePhoto({ sample, className = '', sizes, eager = false }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-plum-800 to-berry-900 ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-5xl opacity-60 select-none"
      >
        {sample.emoji}
      </span>

      {sample.photo && !failed && (
        <img
          src={sample.photo}
          alt={sample.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`relative w-full h-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.06] motion-reduce:group-hover:scale-100 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Card
═══════════════════════════════════════════════════════════ */

/**
 * One setup.
 *
 * A button rather than a link: it opens the detail overlay, which is where the
 * two real actions live. Putting "Plan this" and "Shop the pieces" on the card
 * itself was the first version and it made a grid of twelve cards carry
 * twenty-four competing controls — the grid stopped reading as photographs and
 * started reading as a form.
 */
function SampleCard({ sample, onOpen, showOccasion = true, eager = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full text-left rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow] duration-200 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-plum-500 focus-visible:ring-offset-2"
    >
      <SamplePhoto
        sample={sample}
        className="h-44 sm:h-52"
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
        eager={eager}
      />

      {/* The occasion, so a card lifted out of its row still says what it is
          for. Hidden on the per-event gallery, where every card shares one. */}
      {showOccasion && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1">
          <span aria-hidden="true">{sample.emoji}</span> {sample.eventName}
        </span>
      )}

      {/* Honesty label, on the image, exactly as the shop does it. */}
      <ImageSourceBadge source={sample.source} size="sm" className="absolute top-3 right-3" />

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-tight mb-1">
          {sample.title}
        </h3>
        <p className="text-gray-500 text-xs leading-snug line-clamp-2 mb-3">{sample.blurb}</p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-plum-700 font-bold text-xs sm:text-sm">
            {formatINRRange(sample.priceMin, sample.priceMax)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-plum-600 group-hover:gap-1.5 transition-all">
            See what's in it <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════
   Detail overlay
═══════════════════════════════════════════════════════════ */

/**
 * The setup, full size, with everything that goes into it and the two doors.
 *
 * ── On speed ──────────────────────────────────────────────────────────────
 * This opens in 120ms and it is the reason the card carries no CTAs. An
 * overlay that a customer taps to see a photograph has to feel like the
 * photograph was already there; anything past about 150ms reads as a page
 * load, and people stop tapping the second card. Only opacity and transform
 * are animated, both compositor-only, so the cost is the same whether the
 * photograph behind it is 40KB or 400KB.
 *
 * The photograph itself is deliberately NOT re-fetched — it is the same URL
 * the card already rendered, so it comes from cache and paints on the first
 * frame.
 */
function SampleOverlay({ sample, onClose, onPrev, onNext }) {
  const closeRef = useRef(null)
  const [entered, setEntered] = useState(false)

  // Mount transparent, then flip on the next frame so the transition actually
  // runs. Two rAFs rather than one: a single frame is not reliably enough for
  // the browser to have committed the initial style, and a missed transition
  // makes the overlay appear to snap rather than open.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  // Escape closes, arrows walk the set. The gallery is a set of photographs
  // and people expect to be able to page through it without going back to the
  // grid each time.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')     { e.preventDefault(); onClose() }
      if (e.key === 'ArrowLeft')  onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  // Lock the page behind the overlay. Restoring the previous value rather than
  // clearing it matters — another overlay (CustomizeModal, BookingDetails) may
  // already own the lock, and blanking it here would unlock the page underneath
  // theirs when this one closes.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previous }
  }, [])

  const total = sample.priceMin || sample.priceMax

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${sample.title} — ${sample.eventName}`}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-plum-950/80 backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
          entered ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-[0.98]'
        }`}
      >
        <div className="relative">
          <SamplePhoto sample={sample} className="h-56 sm:h-80" sizes="(min-width: 640px) 768px, 100vw" eager />

          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={17} />
          </button>

          {onPrev && (
            <button
              onClick={onPrev}
              aria-label="Previous setup"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              aria-label="Next setup"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <span className="inline-flex items-center gap-1.5 text-white/85 text-[11px] font-bold uppercase tracking-wider">
              <span aria-hidden="true">{sample.emoji}</span> {sample.eventName}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
              {sample.title}
            </h2>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {/* The label sits directly under the photograph, before anything
              else is read, because that is the only place it can do its job. */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ImageSourceBadge source={sample.source} />
            {sample.credit && (
              <span className="text-[11px] text-gray-400">{sample.credit}</span>
            )}
          </div>

          <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">{sample.blurb}</p>

          <div className="rounded-2xl border border-gray-100 bg-cream p-4 sm:p-5 mb-6">
            <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-plum-600 mb-3">
              What goes into it
            </h3>
            <ul className="space-y-2.5 mb-4">
              {sample.services.map(svc => (
                <li key={svc.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Check size={11} className="text-plum-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 leading-tight">
                      {svc.emoji} {svc.name}
                    </span>
                    <span className="block text-xs text-gray-500 leading-snug">{svc.desc}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gray-400 whitespace-nowrap">
                    {svc.priceHint}
                  </span>
                </li>
              ))}
            </ul>

            {total > 0 && (
              <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-amber-100">
                <span className="text-sm font-bold text-gray-900">Typical range</span>
                <span className="text-base font-bold text-plum-700">
                  {formatINRRange(sample.priceMin, sample.priceMax)}
                </span>
              </div>
            )}

            {/* The estimate caveat is stated where the number is, not in a
                footer. eventServicesData labels its own figures as researched
                estimates; repeating that here is the difference between a
                guide price and a quote a customer thinks they have been given. */}
            <p className="text-[11px] text-gray-400 leading-relaxed mt-2">
              An estimate for this scope, not a quote — the real figure depends on your
              venue, size and date. We source it and put it in writing, free.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={planHref(sample)} onClick={onClose} className="btn-cta flex-1 justify-center">
              Plan this setup ✨
            </Link>
            <Link
              to={shopHref(sample)}
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-plum-600 text-plum-700 hover:bg-plum-600 hover:text-white font-bold px-5 py-3.5 transition-colors"
            >
              Shop the pieces <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Gallery — the reusable engine behind both public exports
═══════════════════════════════════════════════════════════ */

function Gallery({ samples, showOccasion = true, columns = 'grid-cols-2 lg:grid-cols-4' }) {
  const [openIndex, setOpenIndex] = useState(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const prev  = useCallback(() => setOpenIndex(i => (i > 0 ? i - 1 : samples.length - 1)), [samples.length])
  const next  = useCallback(() => setOpenIndex(i => (i < samples.length - 1 ? i + 1 : 0)), [samples.length])

  if (samples.length === 0) return null

  return (
    <>
      <div className={`grid ${columns} gap-3 sm:gap-5`}>
        {samples.map((sample, i) => (
          <SampleCard
            key={`${sample.eventId}/${sample.id}`}
            sample={sample}
            showOccasion={showOccasion}
            // The first row is above the fold on most screens; letting it
            // lazy-load costs a visible pop on exactly the tiles that decide
            // whether the section is worth scrolling.
            eager={i < 2}
            onOpen={() => setOpenIndex(i)}
          />
        ))}
      </div>

      {openIndex !== null && samples[openIndex] && (
        <SampleOverlay
          sample={samples[openIndex]}
          onClose={close}
          onPrev={samples.length > 1 ? prev : undefined}
          onNext={samples.length > 1 ? next : undefined}
        />
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   1. Landing-page showcase — every occasion, filterable
═══════════════════════════════════════════════════════════ */

/**
 * The occasion filter is the whole design of this section.
 *
 * Sixty setups in one grid is a stock library. Sixty setups behind a row of
 * occasion chips is a catalogue, because the first thing a visitor does is
 * find their own occasion — and the chip row doubles as the proof that we
 * cover all fifteen, which is the claim this section exists to make.
 *
 * Filtering is client-side over a module constant, so switching occasions is
 * instant with no request and no spinner.
 */
export function DecorSampleShowcase() {
  const [eventId, setEventId] = useState('all')

  const occasions = useMemo(
    () =>
      Object.entries(SAMPLES_BY_EVENT)
        .filter(([, list]) => list.length > 0)
        .map(([id, list]) => ({ id, label: list[0].eventName, emoji: list[0].emoji, count: list.length })),
    []
  )

  const shown = eventId === 'all'
    ? FEATURED_SAMPLES
    : SAMPLES_BY_EVENT[eventId] ?? []

  const chip = 'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap'

  return (
    <section id="decor-samples" className="py-16 sm:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        <div className="mb-7 sm:mb-9 reveal">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-plum-600 mb-2">
            Decoration samples
          </p>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                See the setup before you book it
              </h2>
              <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
                {SAMPLE_TOTALS.setups} décor setups across {SAMPLE_TOTALS.occasions} occasions — what
                each one includes, and what that scope typically costs. Tap any of them.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-plum-700 hover:text-plum-900 font-semibold text-sm"
            >
              Full catalogue <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Said once, plainly, above the grid — so nobody has to open a card
            to learn what they are looking at. The per-image badge repeats it
            where somebody who scrolled straight into the grid will see it. */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-cream border border-amber-100 px-4 py-3 mb-6 text-xs sm:text-sm text-gray-600 leading-relaxed">
          <Camera size={16} className="shrink-0 mt-0.5 text-plum-600" />
          <p>
            <span className="font-semibold text-gray-900">These are reference photographs</span> of
            the styles we build, not photographs of our own past events — we are new, and we would
            rather say so. Your setup is built to this brief, in your space, with your colours.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 mb-6">
          <button
            onClick={() => setEventId('all')}
            className={`${chip} ${
              eventId === 'all'
                ? 'bg-plum-700 border-plum-700 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
            }`}
          >
            <Sparkles size={12} /> All occasions
          </button>
          {occasions.map(o => (
            <button
              key={o.id}
              onClick={() => setEventId(o.id)}
              className={`${chip} ${
                eventId === o.id
                  ? 'bg-plum-700 border-plum-700 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
              }`}
            >
              <span aria-hidden="true">{o.emoji}</span> {o.label}
            </button>
          ))}
        </div>

        <Gallery samples={shown} showOccasion={eventId === 'all'} />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   2. Per-event strip — for the occasion's own catalogue page
═══════════════════════════════════════════════════════════ */

/**
 * The same setups, on the page for one occasion.
 *
 * Renders nothing when an occasion has no samples rather than an empty
 * "Samples" heading — an empty gallery is worse than no gallery, the same
 * reasoning CustomerVoices uses for zero reviews.
 */
export function EventDecorSamples({ eventId, className = '' }) {
  const samples = SAMPLES_BY_EVENT[eventId] ?? []
  if (samples.length === 0) return null

  // The section-level badge and caption may only speak for the whole set when
  // the whole set agrees. Once even one of these occasions has a real
  // photograph, "not our own past events" stops being true of the section and
  // the claim retreats to the per-card badges, which are always right.
  const allStock = samples.every(s => s.source === 'stock')

  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-1.5">
        {/* The event name is used verbatim, not lowercased: EVENT_DATA
            carries "Housewarming (Griha Pravesh)" and "Sangeet / Mehendi
            Night", and a blanket toLowerCase() turns those into
            "griha pravesh" mid-sentence. */}
        <h2 className="text-lg font-bold text-gray-900">
          {samples[0].eventName} décor — see it before you book it
        </h2>
        {allStock && <ImageSourceBadge source="stock" size="sm" />}
      </div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        {samples.length} setups we build for this occasion, with what goes into each and the
        typical range.
        {allStock && ' Reference photographs of the style — not our own past events.'}
      </p>

      <Gallery samples={samples} showOccasion={false} columns="grid-cols-2 lg:grid-cols-4" />
    </section>
  )
}

export default DecorSampleShowcase
