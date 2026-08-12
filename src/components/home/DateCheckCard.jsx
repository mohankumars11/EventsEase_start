import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarSearch, ArrowRight } from 'lucide-react'
import EventDateSheet from '../plan/EventDateSheet'
import { useDateInterest } from '../../hooks/useDateDemand'
import { busiestDates } from '../../lib/demand'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useCity } from '../../context/CityContext'

/**
 * A date lookup that keeps talking.
 *
 * Two earlier versions of this were wrong in opposite directions. A full
 * month grid took most of a phone screen for a control nobody had asked for
 * yet; a single static line then said one thing and had nothing left to say
 * on the second look. This is the middle: one compact card whose message
 * rotates, so a customer scrolling past twice gets two different reasons to
 * tap.
 *
 * ── Why the button never moves ───────────────────────────────────────
 *
 * Only the message above rotates. "Check available dates" is pinned, because
 * a target that moves under a thumb is a target people stop aiming at — the
 * rotation is there to keep the pitch fresh, not to make the action a moving
 * one.
 *
 * ── What it is allowed to claim ──────────────────────────────────────
 *
 * Slides come in two kinds. Evergreen ones state things that are true of the
 * business at any time — enquiring is free, weekends are the first thing
 * families ask for, earlier notice means more vendors. Demand slides quote
 * real enquiry counts and only exist when there are real counts to quote;
 * with an empty database they are simply not in the deck. Nothing here
 * invents a number or calls a date unavailable.
 */

const ROTATE_MS = 4200

export default function DateCheckCard() {
  const navigate = useNavigate()
  // `city` always has a value — it falls back to a default nobody picked, so
  // only a deliberate choice narrows the counts or gets named in the copy.
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null

  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()
  const { interestByDate } = useDateInterest(city)

  const hot = useMemo(
    () => busiestDates({ interestByDate, city }, { limit: 3 }),
    [interestByDate, city],
  )

  /**
   * The deck. Demand slides lead when they exist — a real number is the
   * strongest thing this card can say — and the evergreen ones carry it the
   * rest of the time.
   */
  const slides = useMemo(() => {
    const out = []

    if (hot.length > 0) {
      const top = hot[0]
      const [, m, d] = top.iso.split('-').map(Number)
      const when = new Date(Number(top.iso.slice(0, 4)), m - 1, d)
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      out.push({
        key: 'top-date',
        emoji: '🔥',
        title: `${when} — ${top.count} enquiries`,
        body: 'Enquiries are coming in for this date. Check yours before the vendors are committed.',
        accent: 'text-saffron-300',
      })
      if (hot.length > 1) {
        out.push({
          key: 'hot-count',
          emoji: '📈',
          title: `${hot.length} dates in high demand`,
          body: `Families${city ? ` across ${city}` : ''} are already asking about these days.`,
          accent: 'text-saffron-300',
        })
      }
    }

    out.push(
      // Identity slide. When there is no demand data this is what the card
      // opens on, because a first-time reader needs to know what it *is*
      // before it starts selling — "Weekends go first" on its own does not
      // say "this is where you check your date".
      {
        key: 'check',
        emoji: '📅',
        title: 'Is your date still open?',
        body: 'Check the day you have in mind before you plan anything else.',
        accent: 'text-white/70',
      },
      {
        key: 'weekend',
        emoji: '🗓️',
        title: 'Weekends go first',
        body: 'Most families want a Saturday — and so does everyone else planning one.',
        accent: 'text-amber-300',
      },
      {
        key: 'free',
        emoji: '🤝',
        title: 'Free to enquire',
        body: 'Tell us the date. One coordinator, one price, nothing to pay to ask.',
        accent: 'text-emerald-300',
      },
      {
        key: 'early',
        emoji: '⏳',
        title: 'The earlier we know, the more we can hold',
        body: 'Decorators and caterers commit weeks ahead. Your date is what lets us reserve them.',
        accent: 'text-plum-300',
      },
    )
    return out
  }, [hot, city])

  // Stop the timer under reduced motion rather than freezing on whichever
  // slide happened to be up — the first one is the one that should show.
  useEffect(() => {
    if (reduced || slides.length < 2) return
    const id = setInterval(() => setI(n => (n + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [reduced, slides.length])

  // A shorter deck after data loads must not strand the index past its end.
  useEffect(() => { setI(n => (n < slides.length ? n : 0)) }, [slides.length])

  const slide = slides[i] ?? slides[0]

  function handleConfirm(picked) {
    const params = new URLSearchParams({ date: picked.event_date })
    if (picked.time_slot) params.set('slot', picked.time_slot)
    navigate(`/plan/custom?${params}`)
  }

  return (
    <>
      <section aria-labelledby="date-check-heading" className="px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="home-card group relative block w-full overflow-hidden p-3 text-left"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-saffron-400/10 blur-2xl"
          />

          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-400/15 text-[17px] ring-1 ring-saffron-400/25">
              {/* The emoji carries the slide's mood; the magnifier stays as
                  the constant that says "this is the lookup". */}
              <span key={slide.key} className="animate-fade-in">{slide.emoji}</span>
            </span>

            {/* Fixed height so a two-line body never resizes the card
                mid-rotation and shoves the page under the reader's thumb. */}
            <span className="h-[38px] min-w-0 flex-1 overflow-hidden">
              <span key={slide.key} className="block animate-fade-in">
                <span id="date-check-heading" className={`block truncate text-[13px] font-extrabold ${slide.accent}`}>
                  {slide.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-tight text-white/45 line-clamp-2">
                  {slide.body}
                </span>
              </span>
            </span>
          </span>

          {/* The one thing that never moves. */}
          <span className="mt-2.5 flex items-center gap-2">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-saffron-400 py-2 text-[11px] font-extrabold text-plum-950">
              <CalendarSearch size={13} />
              Check available dates
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {slides.map((s, n) => (
                <span
                  key={s.key}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    n === i ? 'w-3 bg-saffron-400' : 'w-1 bg-white/20'
                  }`}
                />
              ))}
            </span>
          </span>
        </button>
      </section>

      <EventDateSheet
        open={open}
        onClose={() => setOpen(false)}
        city={city}
        value={{}}
        onConfirm={handleConfirm}
      />
    </>
  )
}
