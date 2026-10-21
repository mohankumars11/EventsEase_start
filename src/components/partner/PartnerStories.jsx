import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Check, ChevronLeft, ChevronRight, MapPin, MessageCircle, Navigation, Wallet, X, Zap } from 'lucide-react'
import instantBookingScreen from '../../../shots/01-listing-card.png'
import jobsScreen from '../../../shots/apk-tab-jobs.png'
import tripScreen from '../../../shots/trip-live.png'
import paymentScreen from '../../../screenshots/money-and-more.png'

/* Which partner_story_slides key holds each story's uploaded cards.
   The app's ids and the table's CHECK were written by different hands:
   only `start-trip` is spelled the same in both. Mapping here means an
   upload reaches the right story today, with no migration to paste. */
const SLIDE_KEY = {
  'instant-bookings': 'instant-booking',
  'jobs-received': 'live-tracking',
  'start-trip': 'start-trip',
  'event-payment': 'event-complete',
}

const DURATION = 14000
const INSTANT_GUIDE = [
  { title: 'A new job just arrived!', description: 'When a customer books an event, you’ll get an instant notification in your Jobs tab.', image: instantBookingScreen, alt: 'Customer event booking and instant booking price', label: 'NEW BOOKING', points: ['A customer books a listed service.', 'Keep internet on to receive notifications.', 'Open Jobs to see the new booking.'] },
  { title: 'Open your Jobs tab', description: 'The new job appears with the important event details. Tap it to view the full booking.', image: jobsScreen, alt: 'SAMBRAMO Partner Jobs tab and booking details', label: 'REVIEW DETAILS', points: ['Event date and time', 'Event location', 'Package value and full details'] },
  { title: 'Choose your response', description: 'After reviewing the details, choose the option that suits your availability.', image: jobsScreen, alt: 'SAMBRAMO Partner booking response options', label: 'YOUR CHOICE', points: ['Accept — confirm you can take the job.', 'Negotiate — discuss or clarify details.', 'Pass — decline if you are unavailable.'] },
]

const BUILT_IN_STORIES = [
  {
    id: 'instant-bookings',
    shortTitle: 'Instant bookings',
    eyebrow: 'FROM DISCOVERY TO BOOKING',
    title: 'Get booked.\nWithout the back-and-forth.',
    description: 'Customers can choose your listed service and package directly.',
    steps: ['Keep your services and prices up to date.', 'A customer chooses a package and event date.', 'Open Jobs to review the booking details.'],
    takeaway: 'Keep your profile ready for the next booking.',
    image: instantBookingScreen,
    imageAlt: 'SAMBRAMO service listing and package screen',
    icon: Zap,
    visualTitle: 'A new booking',
    visualSub: 'Package selected · Details ready',
    visualState: 'BOOKING RECEIVED',
    visualTone: 'violet',
  },
  {
    id: 'jobs-received',
    shortTitle: 'Jobs received',
    eyebrow: 'EVERY DETAIL IN ONE PLACE',
    title: 'A new job.\nA clear next step.',
    description: 'Know what the customer needs before you head to the event.',
    steps: ['Open the Jobs tab and select the booking.', 'Check the date, time, venue and requirements.', 'Use in-app messages to coordinate.'],
    takeaway: 'Review the details before you accept or prepare.',
    image: jobsScreen,
    imageAlt: 'SAMBRAMO Partner Jobs tab',
    icon: MessageCircle,
    visualTitle: 'Job details',
    visualSub: 'Event · Venue · Customer message',
    visualState: 'READY TO REVIEW',
    visualTone: 'violet',
  },
  {
    id: 'start-trip',
    shortTitle: 'Start your trip',
    eyebrow: 'KEEP THE CUSTOMER IN THE LOOP',
    title: 'Start your trip.\nShare the journey.',
    description: 'Live tracking helps your customer see your progress to the venue.',
    steps: ['Open the correct job when you are ready to travel.', 'Tap Start Trip and allow location sharing when prompted.', 'Use in-app chat if plans or arrival time change.'],
    takeaway: 'Live location. In-app messages. Fewer calls.',
    image: tripScreen,
    imageAlt: 'SAMBRAMO live trip tracking screen',
    icon: Navigation,
    visualTitle: 'Trip in progress',
    visualSub: 'Live location sharing',
    visualState: 'TRACKING ACTIVE',
    visualTone: 'violet',
  },
  {
    id: 'event-payment',
    shortTitle: 'Event done · Payment',
    eyebrow: 'WRAP UP WITH CONFIDENCE',
    title: 'Event complete.\nPayment in view.',
    description: 'Finish the job and check your payment status in the app.',
    steps: ['Complete the agreed event service.', 'Mark the job complete if that action is available.', 'Check payment status and follow the payout instructions shown.'],
    takeaway: 'One place to check job completion and payment status.',
    image: paymentScreen,
    imageAlt: 'SAMBRAMO earnings and payment screen',
    icon: Wallet,
    visualTitle: 'Event completed',
    visualSub: 'Payment status · View details',
    visualState: 'CHECK PAYMENT',
    visualTone: 'violet',
  },
]

const STORY_CSS = `
@keyframes partnerStoryImageDrift {
  0% { transform: scale(1.02) translate3d(0,0,0); }
  100% { transform: scale(1.12) translate3d(-1.2%, -1%, 0); }
}
@keyframes partnerStoryProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }\n@keyframes partnerStoryRise {
  from { opacity: 0; transform: translate3d(0,18px,0); }
  to { opacity: 1; transform: translate3d(0,0,0); }
}
@keyframes partnerStorySweep {
  0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
  18% { opacity: .25; }
  55% { opacity: .08; }
  100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
}
@keyframes partnerStoryPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(196,167,255,.08); }
  50% { box-shadow: 0 0 0 9px rgba(196,167,255,.03); }
}
.partner-story-image { animation: partnerStoryImageDrift 14s linear both; }
.partner-story-rise { animation: partnerStoryRise .55s cubic-bezier(.2,.75,.25,1) both; }
.partner-story-sweep { animation: partnerStorySweep 5s ease-in-out infinite; }
.partner-story-pulse { animation: partnerStoryPulse 2.8s ease-in-out infinite; }
.partner-story-ring { position: relative; }
.partner-story-ring::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9999px;
  background: conic-gradient(#C4A7FF, #6D28D9, #4B0082, #C4A7FF);
  animation: partnerStoryRing 3.4s linear infinite;
  z-index: -1;
}
@media (prefers-reduced-motion: reduce) {
  .partner-story-image,.partner-story-rise,.partner-story-sweep,.partner-story-pulse { animation: none !important; }
  .partner-story-ring::before { animation: none !important; }
}
`

/**
 * Four cinematic, screen-led onboarding stories for the partner Jobs tab.
 * Uses real app screenshots as the visual anchor and keeps instructions short.
 * The story source is intentionally local for now; an admin-published source
 * can replace STORIES later without changing the viewer.
 */
export default function PartnerStories() {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [viewed, setViewed] = useState([])
  const [progressKey, setProgressKey] = useState(0)
  const [guideSlide, setGuideSlide] = useState(0)
  const [uploaded, setUploaded] = useState({})
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const startedAt = useRef(0)
  const elapsed = useRef(0)
  const touchStart = useRef(null)

  /* Published slides, grouped by story key. Admin uploads land here
     without a new APK: the cards are fetched at launch, not bundled.
     An empty table leaves every story exactly as it ships. */
  /* The story headings now live in `partner_stories` so an operator can
     rename or add one. The built-in four stand in when 172 is not
     applied, or when every row has been archived — an empty rail is
     worse than a stale one. A story the table knows but this build
     does not gets no icon or artwork of its own, so it falls back to
     the first story's glyph and leans on its first uploaded card. */
  const [storyDefs, setStoryDefs] = useState(null)

  useEffect(() => {
    let live = true
    supabase
      .from('partner_stories')
      .select('key, label, blurb, position, deleted_at')
      .order('position')
      .then(({ data, error }) => {
        if (!live || error || !data) return
        setStoryDefs(data.filter(r => !r.deleted_at))
      })
    return () => { live = false }
  }, [])

  const STORIES = useMemo(() => {
    if (!storyDefs?.length) return BUILT_IN_STORIES
    const byKey = Object.fromEntries(BUILT_IN_STORIES.map(b => [SLIDE_KEY[b.id] ?? b.id, b]))
    return storyDefs.map(r => {
      const base = byKey[r.key] ?? BUILT_IN_STORIES[0]
      /* `id` stays the key the SLIDE_KEY map expects, so a built-in
         story keeps finding its uploads; a new one is its own key. */
      return { ...base, id: byKey[r.key] ? base.id : r.key, shortTitle: r.label, eyebrow: r.blurb || base.eyebrow }
    })
  }, [storyDefs])

  useEffect(() => {
    let live = true
    supabase
      .from('partner_story_slides')
      .select('id, story_key, title, media_url, media_type, position')
      .eq('is_published', true)
      .order('position')
      .then(({ data, error }) => {
        if (!live || error || !data) return
        setUploaded(data.reduce((a, r) => { (a[r.story_key] ||= []).push(r); return a }, {}))
      })
    return () => { live = false }
  }, [])

  const deckFor = useMemo(
    () => story => (story ? uploaded[SLIDE_KEY[story.id] ?? story.id] ?? [] : []),
    [uploaded],
  )

  const activeStory = STORIES[activeIndex]
  const deck = deckFor(activeStory)
  const hasDeck = deck.length > 0
  /* Uploaded cards replace the built-in capsule: the artwork already
     carries its own heading and number, so the component's title layer
     would print a second one on top of it. */
  const slides = hasDeck ? deck : (activeStory?.guideSlides ? INSTANT_GUIDE : null)
  const isInstantGuide = Boolean(slides)
  const guide = isInstantGuide ? slides[Math.min(guideSlide, slides.length - 1)] : null

  const close = () => setActiveIndex(-1)
  const open = index => {
    setGuideSlide(0)
    setActiveIndex(index)
    setProgressKey(key => key + 1)
  }
  const previous = () => {
    if (isInstantGuide && guideSlide > 0) { setGuideSlide(i => i - 1); setProgressKey(key => key + 1); return }
    if (activeIndex > 0) {
      setActiveIndex(index => index - 1)
      setProgressKey(key => key + 1)
    }
  }
  const next = () => {
    if (isInstantGuide && guideSlide < slides.length - 1) { setGuideSlide(i => i + 1); setProgressKey(key => key + 1); return }
    if (isInstantGuide && guideSlide === slides.length - 1) { setViewed(current => current.includes(activeIndex) ? current : [...current, activeIndex]); setGuideSlide(0); setActiveIndex(index => index + 1); setProgressKey(key => key + 1); return }
    if (activeIndex >= STORIES.length - 1) {
      close()
      return
    }
    setViewed(current => current.includes(activeIndex) ? current : [...current, activeIndex])
    setActiveIndex(index => index + 1)
    setProgressKey(key => key + 1)
  }

  /* The clock.
     It used to be a setTimeout for the turn plus a CSS animation for
     the bar. Two clocks cannot be paused together: holding the screen
     would freeze the bar and the card would turn underneath it anyway.
     So one rAF loop against wall-clock time drives both, and `elapsed`
     survives a pause so releasing resumes rather than restarts. */
  useEffect(() => {
    if (activeIndex < 0 || paused) return undefined
    startedAt.current = performance.now() - elapsed.current
    let frame = 0
    const tick = now => {
      elapsed.current = now - startedAt.current
      const ratio = Math.min(1, elapsed.current / DURATION)
      setProgress(ratio)
      if (ratio >= 1) {
        elapsed.current = 0
        setViewed(current => current.includes(activeIndex) ? current : [...current, activeIndex])
        if (isInstantGuide && guideSlide < slides.length - 1) setGuideSlide(i => i + 1)
        else if (activeIndex === STORIES.length - 1) { setActiveIndex(-1); setGuideSlide(0) }
        else { setActiveIndex(index => index + 1); setGuideSlide(0) }
        setProgressKey(key => key + 1)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [activeIndex, progressKey, guideSlide, paused, isInstantGuide, slides])

  /* Any move to another card restarts its bar from zero. */
  useEffect(() => { elapsed.current = 0; setProgress(0) }, [activeIndex, guideSlide, progressKey])

  useEffect(() => {
    if (activeIndex < 0) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') previous()
      if (event.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex])

  return (
    <>
      <style>{STORY_CSS}</style>
      <section aria-label="SAMBRAMO Partner stories" className="mb-4 -mx-1">
        <div className="flex items-center justify-between px-1 mb-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4B0082]">Partner stories</p>
            <p className="text-[10px] text-[#81758F] mt-0.5">Quick guides for every booking</p>
          </div>
          <span className="text-[10px] font-semibold text-[#81758F]">{STORIES.length} stories</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5 px-1">
          {STORIES.map((story, index) => {
            const Icon = story.icon
            const hasViewed = viewed.includes(index)
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => open(index)}
                aria-label={`Watch story: ${story.shortTitle}`}
                className="min-w-0 flex flex-col items-center gap-2 text-center active:scale-[0.97] transition-transform"
              >
                <span className={`relative block w-full max-w-[76px] aspect-square rounded-full p-[3px] ${hasViewed ? 'bg-[#16A34A]' : 'bg-gradient-to-br from-[#BFA0FF] via-[#6D28D9] to-[#4B0082] partner-story-ring partner-story-pulse'}`}>
                  <span className="flex h-full w-full rounded-full bg-white p-[3px]">
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#4B0082]">
                      <img src={deckFor(story)[0]?.media_type === 'image' ? deckFor(story)[0].media_url : story.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
                      <span className="absolute inset-0 bg-gradient-to-br from-[#4B0082]/30 via-[#4B0082]/60 to-[#18002E]/90" />
                      <Icon size={22} strokeWidth={2.2} className="relative z-10 text-white drop-shadow" />
                    </span>
                  </span>
                  {/* The badge sits on the OUTER ring, not inside the
                      inner circle: that one is `overflow-hidden
                      rounded-full`, so a badge at its bottom-right
                      corner was clipped away by the curve and a partner
                      never saw that they had watched a story. */}
                  {hasViewed && (
                    <span className="absolute -bottom-0.5 -right-0.5 z-30 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#16A34A] text-white ring-2 ring-white shadow">
                      <Check size={11} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                {/* 9px semi-bold grey was the reported "not even
                    visible". 11px, heavier, and in the body ink —
                    these are the names of the things on the rail, and
                    a label nobody can read is a tile nobody taps. */}
                <span className="line-clamp-2 min-h-[28px] w-full text-[11px] font-extrabold leading-[1.2] tracking-[-0.01em] text-[#17152B]">{story.shortTitle}</span>
              </button>
            )
          })}
        </div>
      </section>

      {activeStory && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B0314]"
          role="dialog"
          aria-modal="true"
          aria-label={activeStory.shortTitle}
          onClick={close}
          onTouchStart={event => { touchStart.current = event.touches[0].clientX }}
          onTouchEnd={event => {
            if (touchStart.current == null) return
            const delta = event.changedTouches[0].clientX - touchStart.current
            if (Math.abs(delta) > 55) delta < 0 ? next() : previous()
            touchStart.current = null
          }}
        >
          <div
            className="relative flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-[#1B0632] sm:h-[min(94dvh,900px)] sm:rounded-[28px]"
            onClick={event => event.stopPropagation()}
          >
            <div className="absolute inset-0 overflow-hidden bg-[#4B0082]">
              <img key={activeStory.id} src={activeStory.image} alt="" className="partner-story-image h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#19002f]/65 via-[#32105e]/35 to-[#10021f]" />
              <div className="partner-story-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute -right-24 top-[24%] h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -right-14 top-[28%] h-44 w-44 rounded-full border border-white/10" />
            </div>

            {/* Instagram's gesture set: tap right for the next card,
                tap left for the previous, hold anywhere to pause.
                These sit above the artwork and below the header, so
                Close and the Back/Next buttons still win a tap. */}
            <button
              type="button" aria-label="Previous card"
              onClick={previous}
              onPointerDown={() => setPaused(true)}
              onPointerUp={() => setPaused(false)}
              onPointerCancel={() => setPaused(false)}
              onPointerLeave={() => setPaused(false)}
              className="absolute left-0 top-16 bottom-20 z-20 w-1/3"
            />
            <button
              type="button" aria-label="Next card"
              onClick={next}
              onPointerDown={() => setPaused(true)}
              onPointerUp={() => setPaused(false)}
              onPointerCancel={() => setPaused(false)}
              onPointerLeave={() => setPaused(false)}
              className="absolute right-0 top-16 bottom-20 z-20 w-2/3"
            />

            {paused && (
              <span className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}
              >
                PAUSED
              </span>
            )}

            {hasDeck && guide && (
              /* The uploaded card, shown whole. object-contain rather
                 than cover: this artwork is composed to the edge and a
                 crop would cut the heading off. */
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                {guide.media_type === 'video'
                  ? <video key={guide.id} src={guide.media_url} className="max-h-full max-w-full object-contain" autoPlay playsInline muted />
                  : <img key={guide.id} src={guide.media_url} alt={guide.title || ''} className="max-h-full max-w-full object-contain" />}
              </div>
            )}

            {/* pt must clear the notch: with viewport-fit=cover the
                sheet starts at y=0, so a flat pt-3 put the bars on top
                of the clock and the signal bars. */}
            <div
              className="relative z-30 flex gap-1 px-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
            >
              {(isInstantGuide ? slides : STORIES).map((story, index) => (
                <div key={isInstantGuide ? `guide-${index}` : story.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                  <div
                    key={`${progressKey}-${index}`}
                    className="h-full rounded-full bg-white"
                    style={{
                      width: (isInstantGuide ? index < guideSlide : index < activeIndex)
                        ? '100%'
                        : (isInstantGuide ? index === guideSlide : index === activeIndex)
                          ? `${progress * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="relative z-30 flex items-center justify-between px-4 pt-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-[#4B0082] text-white">
                  <activeStory.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white">SAMBRAMO PARTNER</p>
                  <p className="truncate text-[10px] text-white/75">{isInstantGuide ? 'YOUR INTERACTIVE PARTNER GUIDE' : activeStory.eyebrow}</p>
                </div>
              </div>
              <button type="button" onClick={close} aria-label="Close stories" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/35 text-white ring-1 ring-white/20">
                <X size={20} />
              </button>
            </div>

            <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-5 pb-2${hasDeck ? ' invisible' : ''}`}>
              <div key={activeStory.id} className="partner-story-rise">
                <p className="max-w-[330px] whitespace-pre-line text-[clamp(28px,7.2vw,40px)] font-black leading-[1.02] tracking-[-0.045em] text-white drop-shadow-lg">
                  {isInstantGuide ? guide.title : activeStory.title}
                </p>
                <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-white/85">{isInstantGuide ? guide.description : activeStory.description}</p>
              </div>

              <div className="relative flex min-h-[190px] flex-1 items-center justify-center py-4">
                <div className="absolute h-56 w-56 rounded-full bg-[#9C6BFF]/25 blur-3xl" />
                <div key={activeStory.id} className="partner-story-rise relative w-full max-w-[310px]">
                  <div className="absolute -inset-2 rounded-[25px] bg-white/10 blur-xl" />
                  <div className="relative overflow-hidden rounded-[22px] border border-white/50 bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,.45)]">
                    <div className="relative h-[clamp(155px,29vh,245px)] overflow-hidden rounded-[15px] bg-[#f4effb]">
                      <img src={(isInstantGuide ? guide.image : activeStory.image) || activeStory.image} alt={isInstantGuide ? guide.alt : activeStory.imageAlt} className="h-full w-full object-cover object-top" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#19002f]/90 to-transparent px-3 pb-3 pt-8">
                        <p className="text-[12px] font-black text-white">{isInstantGuide ? guide.title : activeStory.visualTitle}</p>
                        <p className="mt-0.5 text-[10px] text-white/80">{isInstantGuide ? 'Interactive partner learning capsule' : activeStory.visualSub}</p>
                      </div>
                      <div className="absolute right-2 top-2 rounded-full border border-white/80 bg-white/95 px-2.5 py-1 text-[8px] font-black tracking-[0.08em] text-[#4B0082] shadow-lg">
                        {isInstantGuide ? guide.label : activeStory.visualState}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-1 -top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[#4B0082] text-white shadow-xl">
                    <activeStory.icon size={20} />
                  </div>
                  {activeIndex === 2 && <div className="absolute -left-2 bottom-7 flex items-center gap-1.5 rounded-full border border-white/30 bg-[#1b0632]/90 px-3 py-2 text-[10px] font-bold text-white shadow-xl"><MapPin size={13} className="text-[#C6A6FF]" /> Live location</div>}
                  {activeIndex === 3 && <div className="absolute -left-2 bottom-7 flex items-center gap-1.5 rounded-full border border-white/30 bg-[#1b0632]/90 px-3 py-2 text-[10px] font-bold text-white shadow-xl"><Wallet size={13} className="text-[#C6A6FF]" /> Payment status</div>}
                </div>
              </div>

              <div key={`${activeStory.id}-instructions`} className="partner-story-rise relative z-10 rounded-[22px] border border-white/15 bg-[#21083A]/90 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D8C2FF]">How it works</p>
                  <span className="text-[9px] font-bold text-white/55">{isInstantGuide ? `${guideSlide + 1} / 3` : `${activeIndex + 1} / 4`}</span>
                </div>
                <div className="space-y-2.5">
                  {(isInstantGuide ? (guide.points ?? []) : activeStory.steps).map((step, index) => (
                    <div key={step} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6D28D9] text-[9px] font-black text-white">{index + 1}</span>
                      <p className="text-[11px] leading-[1.4] text-white/90">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3">
                  <Check size={15} className="mt-0.5 shrink-0 text-[#C6A6FF]" />
                  <p className="text-[11px] font-bold leading-relaxed text-white">{isInstantGuide ? 'Swipe or tap Next to continue through the three booking cards.' : activeStory.takeaway}</p>
                </div>
              </div>
            </div>

            <div className="relative z-20 flex items-center justify-between px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={previous} disabled={activeIndex === 0 && (!isInstantGuide || guideSlide === 0)} className="flex h-10 items-center gap-1 rounded-full border border-white/25 px-3 text-[11px] font-bold text-white disabled:opacity-35">
                <ChevronLeft size={15} /> Back
              </button>
              <span className="text-[9px] font-semibold tracking-wide text-white/55">QUICK PARTNER GUIDE</span>
              <button type="button" onClick={next} className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-[11px] font-black text-[#4B0082]">
                {activeIndex === STORIES.length - 1 && (!isInstantGuide || guideSlide === slides.length - 1) ? 'Done' : 'Next'} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
