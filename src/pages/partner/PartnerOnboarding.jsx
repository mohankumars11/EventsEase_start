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
    /* Measured from the artwork: the painted button is y 1515-1624 of
       1844. The old fixed tap area covered 30% of it — tap the top of
       the button and nothing happened. */
    hit: { top: 81.6, height: 7.0 },
  },
  {
    id: 'services',
    base: '/onboarding/card-2-services',
    alt: 'Every event needs experts like you. List your services and get bookings '
       + 'across multiple event categories.',
    cta: 'See How It Works',
    hit: { top: 84.0, height: 6.7 },   // painted y 1559-1662: the old area covered 69%
  },
  {
    id: 'earnings',
    base: '/onboarding/card-3-earnings',
    alt: 'More bookings, more earnings, greater opportunities. Get discovered by '
       + 'customers, manage bookings and grow your event business with secure payments.',
    cta: 'Join as a Partner',
    hit: { top: 85.8, height: 6.6 },   // painted y 1592-1693
  },
]

/* ── Where "Join as a Partner" goes: the city check, then sign-in ────

   For one build this went straight to sign-in, to save taps. It was
   the wrong saving. A decorator in Mysuru made an account and only then
   found out we are not in Mysuru yet. That reads as bait, and it lost
   the one thing the check exists to record: which cities have partners
   waiting.

   So location is confirmed BEFORE an account exists. The flow is kept
   short instead:

     Join → why we ask → OS dialog → "Sambramo is live in <city>" → sign-in

   The explanation screen skips itself when the phone has already
   granted location, and the separate "we found you here" screen is
   folded into the market screen, which prints the same address with an
   Update link. Three taps of ours, one of Android's. Sign-in also
   refuses to open without a check on record (PartnerEntry), so a deep
   link cannot go round it. */
const CITY_CHECK = '/partner/location-permission'

/* Long enough to read a headline and its line beneath, short enough
   that a partner who is not reading is not kept waiting. */
const AUTO_ADVANCE_MS = 1500

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
     Cards one and three say "Join as a Partner", and that goes to the
     city check from wherever it is pressed — one tap, not three. Card two
     says "See How It Works"; sending that to a sign-in form would make
     the label a lie, so it moves on to the card that does the showing. */
  const onCta = i => (CARDS[i].cta === 'See How It Works' ? goTo(i + 1) : navigate(CITY_CHECK))

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
              aria-label={c.cta === 'See How It Works' ? `${c.cta}, next card` : `${c.cta}, check your city`}
              /* ── Each card's own button, not one shared position ─────
                 The tap areas were one fixed rectangle for all three
                 cards, which was right while the artwork put every
                 button in the same place. The regenerated cards did not:
                 measured against that rectangle, card 1's button was
                 only 30% tappable and card 2's 69%. Each card now
                 carries the position measured from its own pixels, with
                 10px of slack either side, so the whole painted button
                 works. Re-measure if the artwork changes. */
              style={{ top: `${c.hit.top}%`, height: `${c.hit.height}%` }}
              className="absolute inset-x-[5.5%] rounded-full
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            />

          </section>
        ))}
      </div>

      {/* ── One Skip, drawn by the app, on every card ─────────────────
          The regenerated artwork paints "Skip" on card 3 only, so it
          could no longer be trusted to show one. This is real text,
          outside the rail so it does not scroll away, inside the safe
          area so it is never under the status bar. Card 3's painted
          Skip is removed from the image when it is rendered — see
          scripts/render-onboarding-cards.mjs — so there are never two.

          Skip means "skip the introduction", not "skip the city
          check", so it goes where Join goes.

          The timer line that used to sit here is gone: the artwork
          already paints the position dots, and a second indicator at
          the top was one more thing moving on a screen that should be
          about the picture. */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end px-4">
        <button
          type="button"
          onClick={() => navigate(CITY_CHECK)}
          aria-label="Skip the introduction and check your city"
          className="pointer-events-auto mt-2 rounded-full bg-black/20 px-4 py-1.5 text-[15px] font-semibold text-white backdrop-blur-sm
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
