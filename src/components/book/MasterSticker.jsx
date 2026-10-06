import { useEffect, useRef, useState } from 'react'
import { stickerFor } from '../../config/instantBooking'
import reachingSrc from '../../assets/masters/reaching.webp'
import pendingSrc from '../../assets/masters/payment-pending.webp'
import confirmedSrc from '../../assets/masters/confirmed.webp'

/**
 * The state of the booking, as a picture.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A PICTURE, WHEN THE ROWS ALREADY SAY IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The rows underneath are precise: which service, which master, how far,
 * how much. They are also six lines of small type, and the person
 * reading them is usually two minutes into waiting for strangers to
 * answer a request about their child's birthday.
 *
 * The sticker answers the only question they are actually asking —
 * *what is happening right now* — before they read a word. It is not
 * decoration and it is not a spinner: it carries one of three real
 * facts, and it cannot show a fact the rows do not also support,
 * because it is derived from the same array they are rendered from.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE STATES, AND WHY THEY RANK IN THIS ORDER
 * ══════════════════════════════════════════════════════════════════════
 *
 * A booking is many lines at once — three masters searching, one waiting
 * to be paid, one confirmed — so "the state" has to be a choice about
 * which of those the customer most needs to see.
 *
 *   PAYMENT PENDING   a master has said yes and is holding a date
 *                     nobody has paid for. This outranks everything: it
 *                     is the one state that is waiting on the CUSTOMER,
 *                     and every minute it goes unseen is a minute a
 *                     master has cleared a Saturday on nothing. The
 *                     unpaid hold expires (migration 082) and the job is
 *                     re-dispatched, so a missed payment loses the
 *                     master they already had.
 *
 *   REACHING MASTERS  work is in progress and nothing is owed. Being
 *                     done FOR them rather than BY them.
 *
 *   CONFIRMED         every line is paid and every date is held. Shown
 *                     only when nothing is searching and nothing is
 *                     owed, because a green "booking confirmed" over a
 *                     service still hunting is a lie the customer would
 *                     discover at the venue.
 *
 * This is the same precedence LiveBookingStrip uses for its headline —
 * money owed beats a search in progress beats a finished thing — and it
 * is deliberately the same, so the home card and this screen can never
 * describe one booking two ways.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ALL THREE ARE IN THE DOM AT ONCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The whole value of this thing is the moment it CHANGES — a master
 * accepts and the screen turns from listening to thumbs-up while the
 * customer is looking at it. Swapping a src at that moment shows a blank
 * box for as long as the decode takes, which is precisely the wrong
 * frame to drop.
 *
 * So all three are mounted and decoded up front and the swap is an
 * opacity change between layers that are already painted. It costs
 * 262 KB once and buys a transition that cannot stutter.
 *
 * The box holds a fixed aspect ratio for the same reason: the three
 * pictures are not identically proportioned, and a height that changed
 * on transition would shove the rows below it down the screen at the
 * exact moment somebody was reading them.
 *
 * ── The rule is not in here ─────────────────────────────────────────
 * `stickerFor` lives in config/instantBooking beside the copy for the
 * same three states. This file owns the pictures and the transition;
 * that file owns which state a booking is in, and can be checked
 * without a bundler that understands .webp.
 */

const STICKERS = {
  pending: {
    src: pendingSrc,
    alt: 'A Sambramo master gives a thumbs up. Booking accepted — payment pending. Complete the payment to block the master’s date.',
    said: 'A master has accepted. Your payment is what blocks their date.',
  },
  reaching: {
    src: reachingSrc,
    alt: 'A Sambramo master listens with a hand to his ear. Master reached, connecting.',
    said: 'Reaching masters near you.',
  },
  confirmed: {
    src: confirmedSrc,
    alt: 'A Sambramo master gives a thumbs up beside a green tick. Booking accepted, your booking is confirmed.',
    said: 'Booking confirmed. Your date is blocked.',
  },
}

export default function MasterSticker({ lines = [], className = '' }) {
  const state = stickerFor(lines)

  /* What the last real state was.
   *
   * `stickerFor` can return null mid-flight — a request whose lines have
   * not loaded yet, or a moment where every line is briefly between
   * states. Collapsing the box to nothing and re-expanding it a beat
   * later is worse than holding the previous picture, so it holds. */
  const [shown, setShown] = useState(state)
  useEffect(() => { if (state) setShown(state) }, [state])

  /* The announcement, for somebody who is not looking at it.
   *
   * Text baked into a picture is invisible to a screen reader, and this
   * picture is the primary status indicator on the screen. `alt` covers
   * a reader that walks the page; this covers a change arriving while
   * they are somewhere else on it. Only on an actual transition — an
   * announcement on first paint would talk over the heading. */
  const first = useRef(true)
  const [said, setSaid] = useState('')
  useEffect(() => {
    if (!shown) return
    if (first.current) { first.current = false; return }
    setSaid(STICKERS[shown].said)
  }, [shown])

  if (!shown) return null

  return (
    <div className={`relative ${className}`}>
      {/* The box, sized once. `aspect-ratio` on the container rather than
          a height on the image: the three stickers differ slightly in
          proportion, and `contain` inside a fixed box means the swap
          never moves the rows below. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '900 / 701' }}>
        {Object.entries(STICKERS).map(([key, s]) => {
          const on = key === shown
          return (
            <img
              key={key}
              src={s.src}
              // Only the visible one is described. Three alts in the
              // accessibility tree would read as three pictures.
              alt={on ? s.alt : ''}
              aria-hidden={on ? undefined : 'true'}
              // Eager and decoded up front: this element exists to be
              // ready before the state changes, not after.
              loading="eager"
              decoding="async"
              draggable="false"
              className={`absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                on ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        })}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{said}</p>
    </div>
  )
}
