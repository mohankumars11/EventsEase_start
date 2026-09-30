import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The three onboarding cards, full screen, as supplied.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ARTWORK IS THE SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Each card is a finished composition that already contains its own
 * headline, its service labels, its benefits row, its "Skip", its call to
 * action and its pagination dots. Nothing here redraws any of that.
 *
 * An earlier pass rebuilt card two as a DOM grid of service tiles,
 * because baked type cannot resize and a 941px-wide poster puts about six
 * pixels of cap height on a 360px screen. That objection does not apply
 * to these: they are 853x1844, an aspect of 0.4626, which is within a
 * percent of 390x844 and 412x915 and about a percent off 360x800. They
 * were drawn for this screen. Rebuilding them would replace approved
 * artwork with an approximation of it.
 *
 * ── What the overlays are for ──────────────────────────────────────
 * The CTA and the Skip are pixels. They cannot receive a tap. So there
 * are transparent buttons positioned over them: same place, no visible
 * duplicate, a real hit area and an accessible name. They are sized in
 * percentages of the slide, which is only safe because the aspect very
 * nearly matches -- cover crops roughly five pixels a side on the
 * narrowest target here rather than the ten percent the previous posters
 * needed.
 *
 * ── And why there are no dots below ────────────────────────────────
 * The artwork draws them. A second set underneath would be two
 * paginations disagreeing with each other on the same screen.
 */

const CARDS = [
  {
    id: 'grow',
    base: '/onboarding/card-1-grow',
    alt: 'Grow your event business. Turn your skill into more bookings. '
       + 'Catering and cooks, photography and videography, DJ and entertainment, '
       + 'decorations and florists, beauty and wellness, logistics and transport, '
       + 'venues and equipment, priests and traditional services.',
    cta: 'Join as a Partner',
  },
  {
    id: 'services',
    base: '/onboarding/card-2-services',
    alt: 'Every event needs experts like you. List your services and get bookings '
       + 'across multiple event categories.',
    cta: 'See How It Works',
  },
  {
    id: 'earnings',
    base: '/onboarding/card-3-earnings',
    alt: 'More bookings, more earnings, greater opportunities. Get discovered by '
       + 'customers, manage bookings and grow your event business with secure payments.',
    cta: 'Join as a Partner',
  },
]

/* Where the flow goes when onboarding is done or skipped. */
const NEXT = '/partner/location-permission'

export default function PartnerOnboarding() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)

  /* Scroll position is the truth, not state: a swipe and a button press
     can otherwise disagree about which card is showing. */
  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / (el.clientWidth || 1)))
  }, [])

  const goTo = useCallback(i => {
    const el = railRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  /* The CTA advances, and on the last card it leaves. Both cards one and
     three say "Join as a Partner", so the label cannot decide this --
     position does. */
  const onCta = () => (index >= CARDS.length - 1 ? navigate(NEXT) : goTo(index + 1))

  /* Preload the next card so a swipe does not land on a blank slide.
     Only the neighbour: fetching all three at once on a cold start costs
     700KB before the first screen has settled. */
  useEffect(() => {
    const next = CARDS[index + 1]
    if (!next) return
    const img = new Image()
    img.src = `${next.base}-720.webp`
  }, [index])

  return (
    <div className="native-screen relative bg-[#16012E]">
      <div ref={railRef} onScroll={onScroll} className="native-rail">
        {CARDS.map((c, i) => (
          <section
            key={c.id}
            className="native-slide"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${CARDS.length}`}
          >
            <img
              src={`${c.base}-720.webp`}
              srcSet={`${c.base}-720.webp 720w, ${c.base}-853.webp 853w`}
              sizes="100vw"
              alt={c.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'low'}
              draggable="false"
              /* cover, centred. The aspect is within about a percent of
                 every target handset, so this crops a few pixels off the
                 sides and nothing that matters. */
              className="absolute inset-0 h-full w-full select-none object-cover object-center"
            />

            {/* Over the CTA drawn into the artwork. Transparent: the
                button a partner sees is the painted one, and this is the
                thing that makes it work. */}
            <button
              type="button"
              onClick={onCta}
              aria-label={i >= CARDS.length - 1 ? `${c.cta}, continue to location access` : c.cta}
              className="absolute inset-x-[6%] bottom-[6.5%] h-[7.2%] rounded-full
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            />

            {/* Over the painted "Skip". Sits inside the safe area so it
                is never under the status bar on a notched device. */}
            <button
              type="button"
              onClick={() => navigate(NEXT)}
              aria-label="Skip onboarding and continue to location access"
              className="safe-top absolute right-0 top-0 h-[7%] w-[30%]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            />
          </section>
        ))}
      </div>
    </div>
  )
}
