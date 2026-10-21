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

/* ── Where "Join as a Partner" goes: straight to sign-in ─────────────

   It used to go to location permission, then location capture, then a
   confirmation, then a city check, and only then to sign-in — seven
   screens and a dozen taps before a partner could say yes.

   Every partner app worth copying does the opposite. Uber Driver,
   Rapido Captain and Porter Partner take the phone number first, because
   signing up IS the commitment, and ask for city and location inside
   onboarding where the reason is obvious. Swiggy and Zomato ask for
   location up front only because their CUSTOMER apps need it to show
   anything at all; a partner does not.

   Nothing downstream needed those screens to run first: sign-in and
   setup read nothing they stored, and every listing asks for its own
   service location. What the city check did that is lost here is
   recording interest from cities we are not in yet — said in the commit,
   because it is a real trade. */
const SIGN_IN = '/partner/login'

/* Long enough to read a headline and its line beneath, short enough
   that a partner who is not reading is not kept waiting. */
const AUTO_ADVANCE_MS = 4200

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

  /* ── What the painted button promises, it does ─────────────────────
     Cards one and three say "Join as a Partner", and that now goes to
     sign-in from wherever it is pressed — one tap, not three. Card two
     says "See How It Works"; sending that to a sign-in form would make
     the label a lie, so it moves on to the card that does the showing. */
  const onCta = i => (CARDS[i].cta === 'See How It Works' ? goTo(i + 1) : navigate(SIGN_IN))

  /* ── The cards move on their own ───────────────────────────────────
     A partner had to tap three times to see three cards. They advance
     every few seconds now, stop on the last (an intro that loops is one
     nobody can finish reading), and pause for as long as a finger is on
     the screen so a partner who is reading is not dragged off the card.

     Under reduced motion they do not advance at all: that is the setting
     saying do not move things for me, and swiping still works. */
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (reduced || held || index >= CARDS.length - 1) return
    const t = setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [index, held, reduced, goTo])

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
    /* #5B21A8 behind the artwork, not #16012E. That near-navy is what a
       partner saw for the moment before each card painted, and it is the
       colour the brand is moving away from. This is the same purple the
       splash ends on, so the handover from splash to first card is one
       continuous ground and the card fades in over it. */
    <div className="native-screen relative bg-[#5B21A8]">
      <div ref={railRef} onScroll={onScroll} className="native-rail"
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}>
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
              className="partner-intro-card absolute inset-0 h-full w-full select-none object-cover object-center"
            />

            {/* Over the CTA drawn into the artwork. Transparent: the
                button a partner sees is the painted one, and this is the
                thing that makes it work. */}
            <button
              type="button"
              onClick={() => onCta(i)}
              aria-label={c.cta === 'See How It Works' ? `${c.cta}, next card` : `${c.cta}, continue to sign in`}
              className="absolute inset-x-[6%] bottom-[6.5%] h-[7.2%] rounded-full
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            />

            {/* Over the painted "Skip". Sits inside the safe area so it
                is never under the status bar on a notched device. */}
            <button
              type="button"
              /* Skip means "skip the introduction", so it goes where Join
                 goes rather than into a location prompt the partner never
                 asked for. */
              onClick={() => navigate(SIGN_IN)}
              aria-label="Skip the introduction and continue to sign in"
              className="safe-top absolute right-0 top-0 h-[7%] w-[30%]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            />
          </section>
        ))}
      </div>

      {/* ── How long until the next card ───────────────────────────────
          The artwork paints its own dots, so this is not pagination — it
          is the timer, a hairline at the very top that fills while a card
          waits to move on. Without it the advance arrives as a surprise.
          Nothing renders on the last card, which does not move. */}
      {!reduced && index < CARDS.length - 1 && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-10 px-4">
          <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/20">
            <div
              key={index}
              className="partner-intro-timer h-full rounded-full bg-white"
              style={{ animationDuration: `${AUTO_ADVANCE_MS}ms`, animationPlayState: held ? 'paused' : 'running' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
