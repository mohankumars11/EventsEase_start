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
 * One compact card whose message rotates, so a customer scrolling past twice
 * gets two different reasons to tap rather than the same sentence twice.
 *
 * ── Contrast ─────────────────────────────────────────────────────────
 *
 * The first version coloured the whole headline per slide, which put
 * plum-300 and emerald-300 text on a plum ground — technically a colour,
 * practically unreadable. Colour now lives in a small eyebrow pill where it
 * labels the slide, and the headline is plain white at full weight. The body
 * is white/70 rather than white/45: this is the pitch, not fine print.
 *
 * ── Why the button never moves ───────────────────────────────────────
 *
 * Only the message rotates. "Available dates" is pinned, because a target
 * that moves under a thumb is one people stop aiming at.
 *
 * ── What it is allowed to claim ──────────────────────────────────────
 *
 * Evergreen slides state things true of the business at any hour. Demand
 * slides quote real enquiry counts and only exist when there are real counts
 * to quote. The seasonal slide only appears when the season is genuinely
 * near — a "wedding season is coming" banner running in June is the kind of
 * claim customers notice is fake.
 */

const ROTATE_MS = 4000

/**
 * Peak celebration seasons in Karnataka, as [startMonth, endMonth] (1-based).
 * Broad and safely true: the wedding run really is the winter months, and
 * the second one really is late spring.
 */
const SEASONS = [
  { months: [11, 12, 1, 2], lead: [10], label: 'Wedding season',
    title: 'Wedding season is here', soon: 'Wedding season is almost here',
    body: 'Muhurtham dates go furthest ahead of any day in the year. Lock yours before the decorators are gone.' },
  { months: [4, 5], lead: [3], label: 'Summer season',
    title: 'Summer wedding season is here', soon: 'Summer wedding season is close',
    body: 'School holidays and the second wedding run land together — family dates fill fastest now.' },
]

function seasonSlide(now = new Date()) {
  const m = now.getMonth() + 1
  for (const s of SEASONS) {
    if (s.months.includes(m)) {
      return { key: `season-${s.label}`, emoji: '💍', eyebrow: s.label,
               tone: 'bg-saffron-400/20 text-saffron-200', title: s.title, body: s.body }
    }
    if (s.lead.includes(m)) {
      return { key: `season-soon-${s.label}`, emoji: '💍', eyebrow: 'Coming up',
               tone: 'bg-saffron-400/20 text-saffron-200', title: s.soon, body: s.body }
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
    () => busiestDates({ interestByDate, city }, { limit: 3 }),
    [interestByDate, city],
  )

  const slides = useMemo(() => {
    const out = []

    // Demand slides lead when they exist — a real number is the strongest
    // thing this card can say.
    if (hot.length > 0) {
      const top = hot[0]
      const [, m, d] = top.iso.split('-').map(Number)
      const when = new Date(Number(top.iso.slice(0, 4)), m - 1, d)
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      out.push({
        key: 'top-date', emoji: '🔥', eyebrow: 'In demand',
        tone: 'bg-saffron-400/20 text-saffron-200',
        title: `${when} — ${top.count} enquiries`,
        body: 'Families are already asking about this date. Check yours before the vendors are committed.',
      })
      if (hot.length > 1) {
        out.push({
          key: 'hot-count', emoji: '📈', eyebrow: 'High demand',
          tone: 'bg-saffron-400/20 text-saffron-200',
          title: `${hot.length} dates are filling with enquiries`,
          body: `See which days${city ? ` in ${city}` : ''} are busiest before you commit to one.`,
        })
      }
    }

    // Identity first among the evergreens: a first-time reader needs to know
    // what the card is before it starts selling.
    out.push({
      key: 'check', emoji: '📅', eyebrow: 'Check first',
      tone: 'bg-white/10 text-white/80',
      title: 'Is your date still open?',
      body: 'Check the day you have in mind before you plan anything else.',
    })

    const season = seasonSlide()
    if (season) out.push(season)

    out.push(
      {
        key: 'weekend', emoji: '🗓️', eyebrow: 'Weekends',
        tone: 'bg-amber-400/20 text-amber-200',
        title: 'Weekends book first',
        body: 'Saturdays are the first thing families ask for — and everyone else asks for them too.',
      },
      {
        key: 'hold', emoji: '🔒', eyebrow: 'Hold your slot',
        tone: 'bg-plum-400/25 text-plum-100',
        title: 'Tell us the date, we hold the team',
        body: 'A coordinator is reserved for your day the moment we know it. No advance to ask.',
      },
      {
        key: 'free', emoji: '🤝', eyebrow: 'No cost',
        tone: 'bg-emerald-400/20 text-emerald-200',
        title: 'Free to enquire',
        body: 'One coordinator, one price, and you approve every rupee before anything is booked.',
      },
      {
        key: 'early', emoji: '⏳', eyebrow: 'Lead time',
        tone: 'bg-white/10 text-white/80',
        title: 'The earlier we know, the more we hold',
        body: 'Decorators and caterers commit weeks ahead. Your date is what lets us reserve them.',
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
   * Onward to the occasion picker, not the six-step form.
   *
   * "Use this date" used to land on "What are you celebrating? Step 1 of 6",
   * which reads as a form appearing out of nowhere. /plan asks the same
   * question with the offers, the prices and the full-celebration cards
   * around it, and it forwards this query string into the wizard when the
   * customer is ready for it.
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
          className="home-card group relative block w-full overflow-hidden p-3 text-left"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-saffron-400/10 blur-2xl"
          />

          <span className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[15px] ring-1 ring-white/15">
              <span key={slide.key} className="animate-fade-in">{slide.emoji}</span>
            </span>

            {/* Height-locked so a two-line body never resizes the card
                mid-rotation and shoves the page under the reader's thumb. */}
            <span className="h-[46px] min-w-0 flex-1 overflow-hidden">
              <span key={slide.key} className="block animate-fade-in">
                <span className={`inline-block rounded px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide ${slide.tone}`}>
                  {slide.eyebrow}
                </span>
                <span id="date-check-heading" className="mt-0.5 block truncate text-[13px] font-extrabold text-white">
                  {slide.title}
                </span>
                <span className="block truncate text-[11px] leading-tight text-white/70">
                  {slide.body}
                </span>
              </span>
            </span>
          </span>

          {/* The one thing that never moves. */}
          <span className="mt-2 flex items-center gap-2">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-saffron-400 py-1.5 text-[11px] font-extrabold text-plum-950">
              <CalendarSearch size={12} />
              Available dates
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {slides.map((s, n) => (
                <span
                  key={s.key}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    n === i ? 'w-3 bg-saffron-400' : 'w-1 bg-white/25'
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
