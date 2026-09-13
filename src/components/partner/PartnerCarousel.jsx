import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The three cards that explain the partner app, above the login.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE PITCH IS BACK ON THE DOOR, AND WHY IT IS NOT THE OLD PITCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * PartnerEntry's docblock argues that somebody who installed an app
 * called Sambramo Partners has already been sold, and that making them
 * read a pitch before finding the way in asks them to be convinced twice.
 * That still holds, and this does not undo it: the login is on the SAME
 * screen, directly beneath. Nothing here is a step, and nothing here has
 * to be dismissed to get to the field.
 *
 * What it fixes is the other half. A master who was forwarded a link and
 * installed on somebody else's word arrives at a bare email box with no
 * idea what the app does. Three cards above the field cost them nothing
 * and answer it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE IMAGE PER CARD, AND WHY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Each card is a single rendered artwork rather than live type over a
 * photograph. That is the same trade the launch screen makes and it has
 * the same cost: the words inside cannot be translated, cannot resize
 * themselves, and cannot be corrected without re-rendering the picture.
 *
 * It is accepted here for one reason that does not apply elsewhere --
 * these are marketing compositions with a dozen elements each, and
 * rebuilding them as live DOM would be a week of work to arrive at the
 * same pixels. `alt` carries the message for a screen reader, which is
 * the part that actually matters.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MOTION
 * ══════════════════════════════════════════════════════════════════════
 *
 * It advances itself every 4.5s, wraps, and stops permanently the moment
 * the partner swipes or taps a dot. Auto-advance is there to show that
 * more than one card exists; once they have taken control, continuing to
 * move under their thumb is the thing that makes carousels hated.
 *
 * It is a real scroll container with snap points rather than a transform,
 * so the swipe is the platform's own: momentum, rubber-banding and
 * accessibility come free and cost no JavaScript per frame.
 */

const CARDS = [
  {
    id: 'grow',
    base: '/onboarding/card-1-grow',
    alt: 'Grow your event business. Turn your skill into more bookings. '
       + 'Catering, decoration, photography, DJ, venues, logistics, beauty and more, '
       + 'across Bengaluru and beyond.',
  },
  {
    id: 'earnings',
    base: '/onboarding/card-2-earnings',
    alt: 'From bookings to earnings, all in one platform. A customer books, you accept, '
       + 'you deliver the event, and you are paid securely after completion.',
  },
  {
    id: 'refer',
    base: '/onboarding/card-3-refer',
    alt: 'Refer and earn. Invite other event professionals to join Sambramo and earn '
       + 'rewards for every successful signup.',
  },
]

const ADVANCE_MS = 4500

export default function PartnerCarousel() {
  const reduced = useReducedMotion()
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)

  /* Scroll position is the source of truth, not `index`.
     Driving a scroll container from state means a swipe and a timer can
     disagree about where it is; reading the container back keeps the dots
     honest whatever moved it. */
  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const w = el.clientWidth || 1
    setIndex(Math.round(el.scrollLeft / w))
  }, [])

  const goTo = useCallback((i, smooth = true) => {
    const el = railRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !reduced ? 'smooth' : 'auto' })
  }, [reduced])

  /* Auto-advance. Stops for good on the first deliberate interaction, and
     never runs under prefers-reduced-motion -- a carousel that moves on its
     own is exactly the kind of unrequested motion that setting is for. */
  useEffect(() => {
    if (!auto || reduced) return
    const t = setInterval(() => {
      const el = railRef.current
      if (!el) return
      const w = el.clientWidth || 1
      const next = (Math.round(el.scrollLeft / w) + 1) % CARDS.length
      el.scrollTo({ left: next * w, behavior: 'smooth' })
    }, ADVANCE_MS)
    return () => clearInterval(t)
  }, [auto, reduced])

  const takeOver = () => setAuto(false)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What Sambramo Partners does"
      /* A ground behind the card, and a rounded bottom edge.

         The cards are sized by HEIGHT (see the image below), so on most
         handsets there is a strip of ground down each side. It is painted
         the cards' own near-black purple so the strip reads as the frame
         of the hero rather than as a gap, and the bottom corners are
         rounded so the sheet beneath meets a shape rather than a cut. */
      className="relative w-full overflow-hidden rounded-b-[28px] bg-[#1B0433]"
    >
      <div
        ref={railRef}
        onScroll={onScroll}
        onPointerDown={takeOver}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((c, i) => (
          <div
            key={c.id}
            className="w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${CARDS.length}`}
          >
            <img
              src={`${c.base}-720.webp`}
              srcSet={`${c.base}-720.webp 720w, ${c.base}-1080.webp 1080w`}
              sizes="100vw"
              alt={c.alt}
              /* Only the first card is worth fetching before it is needed.
                 The other two are 220KB each and most partners sign in
                 without ever reaching them. */
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'low'}
              draggable="false"
              /* Full width, fixed height, cropped from the TOP.

                 These are portrait posters at aspect 0.56: on a 360px
                 screen an uncropped card is 640px tall and there is no
                 room left for a login. contain was tried and letterboxed
                 it down to about 200px wide, which made the words inside
                 unreadable -- the opposite of the point.

                 So it fills the width and takes 54vh of height, and what
                 gets cropped is the bottom. That is the right end to lose:
                 each poster finishes with its own call to action, and this
                 screen has a real one directly underneath. object-top
                 keeps the headline and the faces, which is what a partner
                 is actually reading. */
              /* Sized by HEIGHT, not width, and never cropped.

                 These are portrait posters at aspect 0.56. Full width on
                 a 360px screen makes them 640px tall and leaves no room to
                 sign in; cropping to fit cut the bottom off every card.
                 Fixing the height instead shows all of each composition
                 and still comes out about 300px wide on that same screen,
                 which is nearly edge to edge.

                 62vh leaves roughly 300px beneath for the consent row,
                 the Google button and the email fallback, now that the
                 sheet no longer overlaps the card to buy itself space. */
              className="mx-auto block h-[62vh] w-auto max-w-full select-none object-contain"
            />
          </div>
        ))}
      </div>

      {/* A scrim along the bottom of the hero.

          The dots were rendering and invisible: they sit over whatever
          the artwork happens to have at that height, and on card two that
          is a white panel. A drop shadow is not enough to rescue white on
          white. This darkens the last fifth of the image so the dots
          always have something to be light against, and it doubles as the
          transition into the sheet -- the crop stops being a hard edge and
          becomes a fade. pointer-events-none so it never eats a swipe. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28
                   bg-gradient-to-t from-black/55 via-black/25 to-transparent"
      />

      {/* Over the artwork, not under it.

          The sheet below pulls up by 20px to overlap the hero, so dots
          placed after the rail in normal flow end up behind it. Absolute,
          near the bottom of the image and clear of the sheet's rounded
          edge, is also simply where a hero carousel's dots belong.

          They are buttons rather than decoration: the only way to reach
          card three without a swipe, which matters on a tablet and to
          anybody driving this from a keyboard. */}
      <div className="absolute inset-x-0 bottom-6 z-10 mx-auto flex w-[62%] items-center gap-1.5">
        {CARDS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { takeOver(); goTo(i) }}
            aria-label={`Show card ${i + 1}: ${c.id}`}
            aria-current={i === index}
            /* Segments rather than dots: three equal bars read as "three
               of these, you are on the first", where three dots of
               different widths only read as decoration. */
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i === index ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
