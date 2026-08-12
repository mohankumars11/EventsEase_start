import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarSearch, ArrowRight } from 'lucide-react'
import EventDateSheet from '../plan/EventDateSheet'
import { useDateInterest } from '../../hooks/useDateDemand'
import { busiestDates } from '../../lib/demand'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useCity } from '../../context/CityContext'
import { CATALOGUE_PHOTOS } from '../../config/imagery'

/**
 * A date lookup that keeps talking.
 *
 * One compact card whose message rotates, so a customer scrolling past twice
 * gets two different reasons to tap rather than the same sentence twice.
 *
 * ── Photographs, not emoji ───────────────────────────────────────────
 *
 * Each slide carries a real photo from CATALOGUE_PHOTOS — the same
 * pre-resolved URLs the shop and the landing reels use. Pre-resolved
 * matters: a live Unsplash search per slide would burn the page's 24-search
 * budget on decoration and leave the actual product tiles as emoji. The
 * emoji stays underneath as the fallback, so a failed image degrades to a
 * tile rather than a hole.
 *
 * ── Colour ───────────────────────────────────────────────────────────
 *
 * Berry, not saffron. The yellow was the app's generic CTA accent, so this
 * card read as one more of the same on a screen that already has several;
 * berry-400 on plum is both further from the ground and unused elsewhere on
 * this screen, which is what makes it findable. Dark text on a light berry
 * chip clears contrast comfortably at 11px, which white-on-berry does not.
 *
 * ── What it is allowed to claim ──────────────────────────────────────
 *
 * Demand slides speak in aggregate — how many dates are busy, never which —
 * and only exist when there are real counts behind them. Naming a specific
 * day on a card this small is noise to everyone whose event is in a
 * different month.
 */

const ROTATE_MS = 4000

const photo = (category, occasion) => CATALOGUE_PHOTOS?.[category]?.[occasion] ?? null

/**
 * Peak celebration seasons in Karnataka, as 1-based months. Broad and safely
 * true: the wedding run really is the winter months, and the second one
 * really is late spring.
 */
const SEASONS = [
  { months: [11, 12, 1, 2], lead: [10], label: 'Wedding season',
    title: 'Wedding season is here', soon: 'Wedding season is almost here',
    body: 'Muhurtham dates go furthest ahead of any day in the year.' },
  { months: [4, 5], lead: [3], label: 'Summer season',
    title: 'Summer wedding season is here', soon: 'Summer wedding season is close',
    body: 'School holidays and the second wedding run land together.' },
]

function seasonSlide(now = new Date()) {
  const m = now.getMonth() + 1
  for (const s of SEASONS) {
    const inSeason = s.months.includes(m)
    if (!inSeason && !s.lead.includes(m)) continue
    return {
      key: `season-${s.label}-${inSeason}`,
      emoji: '💍',
      img: photo('Flowers', 'Wedding'),
      eyebrow: inSeason ? s.label : 'Coming up',
      tone: 'bg-berry-400/20 text-berry-200',
      title: inSeason ? s.title : s.soon,
      body: s.body,
    }
  }
  return null
}

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
    () => busiestDates({ interestByDate, city }, { limit: 6 }),
    [interestByDate, city],
  )

  const slides = useMemo(() => {
    const out = []

    // Demand leads when it is real — but in aggregate. Which day is busy is
    // the calendar's job to show, not a one-line card's.
    if (hot.length > 0) {
      const total = hot.reduce((n, d) => n + d.count, 0)
      out.push({
        key: 'demand', emoji: '🔥', img: photo('Hampers', 'Wedding'),
        eyebrow: 'High demand', tone: 'bg-berry-400/20 text-berry-200',
        title: hot.length === 1
          ? 'One date is in high demand'
          : `${hot.length} dates are in high demand`,
        body: `${total} enquiries already${city ? ` in ${city}` : ''} — check yours before the vendors are committed.`,
      })
    }

    // Identity first among the evergreens: a first-time reader needs to know
    // what the card is before it starts selling.
    out.push({
      key: 'check', emoji: '📅', img: photo('Cakes', 'Birthday'),
      eyebrow: 'Check first', tone: 'bg-white/15 text-white/85',
      title: 'Is your date still open?',
      body: 'Check the day you have in mind before you plan anything else.',
    })

    const season = seasonSlide()
    if (season) out.push(season)

    out.push(
      {
        key: 'weekend', emoji: '🗓️', img: photo('Flowers', 'Wedding'),
        eyebrow: 'Weekends', tone: 'bg-teal-400/20 text-teal-200',
        title: 'Weekends book first',
        body: 'Saturdays are the first thing families ask for.',
      },
      {
        key: 'hold', emoji: '🔒', img: photo('Hampers', 'Diwali'),
        eyebrow: 'Hold your slot', tone: 'bg-berry-400/20 text-berry-200',
        title: 'Tell us the date, we hold the team',
        body: 'A coordinator is reserved for your day the moment we know it.',
      },
      {
        key: 'free', emoji: '🤝', img: photo('Flowers', 'Anniversary'),
        eyebrow: 'No cost', tone: 'bg-emerald-400/20 text-emerald-200',
        title: 'Free to enquire',
        body: 'One coordinator, one price, and you approve every rupee.',
      },
      {
        key: 'early', emoji: '⏳', img: photo('Cakes', 'Baby Shower'),
        eyebrow: 'Lead time', tone: 'bg-sky-400/20 text-sky-200',
        title: 'The earlier we know, the more we hold',
        body: 'Decorators and caterers commit weeks ahead.',
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

  /**
   * Onward to the occasion picker, not the six-step form. /plan asks the
   * same question with the offers and prices around it, and forwards this
   * query string into the wizard when the customer is ready for it.
   */
  function handleConfirm(picked) {
    const params = new URLSearchParams({ date: picked.event_date })
    if (picked.time_slot) params.set('slot', picked.time_slot)
    navigate(`/plan?${params}`)
  }

  return (
    <>
      <section aria-labelledby="date-check-heading" className="px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="home-card group relative block w-full overflow-hidden p-2.5 text-left"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-berry-400/10 blur-2xl"
          />

          <span className="flex items-center gap-2.5">
            {/* Emoji tile underneath, photo fades in on top — never a blank
                frame, and a failed image just leaves the tile showing. */}
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-[15px] ring-1 ring-white/15">
              <span key={`e-${slide.key}`} className="animate-fade-in">{slide.emoji}</span>
              {slide.img && (
                <img
                  key={`i-${slide.key}`}
                  src={slide.img}
                  alt=""
                  loading="lazy"
                  className="animate-fade-in absolute inset-0 h-full w-full object-cover"
                />
              )}
            </span>

            {/* Height-locked so a two-line body never resizes the card
                mid-rotation and shoves the page under the reader's thumb. */}
            <span className="h-[42px] min-w-0 flex-1 overflow-hidden">
              <span key={slide.key} className="block animate-fade-in">
                <span className={`inline-block rounded px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide ${slide.tone}`}>
                  {slide.eyebrow}
                </span>
                <span id="date-check-heading" className="mt-0.5 block truncate text-[13px] font-extrabold text-white">
                  {slide.title}
                </span>
                <span className="block truncate text-[10px] leading-tight text-white/70">
                  {slide.body}
                </span>
              </span>
            </span>
          </span>

          {/* The one thing that never moves. */}
          <span className="mt-2 flex items-center gap-2">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-berry-400 py-1.5 text-[11px] font-extrabold text-plum-950">
              <CalendarSearch size={12} />
              Available dates
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {slides.map((s, n) => (
                <span
                  key={s.key}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    n === i ? 'w-3 bg-berry-400' : 'w-1 bg-white/25'
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
