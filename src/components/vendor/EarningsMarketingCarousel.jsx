import { ArrowRight, BarChart3, CalendarDays, Sparkles } from 'lucide-react'
import PromoDeck from '../home/PromoDeck'

/**
 * Earnings-only marketing deck.
 *
 * This is intentionally separate from the Jobs-tab campaign deck:
 * the Jobs tab talks about acquiring work; Earnings talks about turning
 * completed work into predictable income and keeping the supply calendar
 * healthy.
 *
 * UI only: no new data, tables, pricing, payout rules or backend state.
 * Every action either stays on the existing Earnings route or opens an
 * existing Calendar route.
 */
const slides = [
  {
    key: 'money-at-a-glance',
    to: '/dashboard/vendor?tab=earnings#earnings-over-time',
    background: 'linear-gradient(135deg,#32105f 0%,#6d28d9 58%,#9b4dff 100%)',
    art: '₹',
    eyebrow: 'KNOW YOUR MONEY.',
    title: 'EVERY RUPEE. CLEAR AS DAY.',
    body: 'See earned, pending and paid money at a glance — without digging through screens.',
    cta: 'See your earnings',
  },
  {
    key: 'keep-calendar-full',
    to: '/dashboard/vendor?tab=availability',
    background: 'linear-gradient(135deg,#063f38 0%,#087f6b 52%,#18a779 100%)',
    art: '📅',
    eyebrow: 'MORE AVAILABLE DAYS.',
    title: 'KEEP YOUR CALENDAR OPEN.',
    body: 'More accurate availability gives SAMBRAMO more chances to match you with the right event.',
    cta: 'Open calendar',
  },
  {
    key: 'turn-work-into-growth',
    to: '/dashboard/vendor?tab=earnings#your-work',
    background: 'linear-gradient(135deg,#8f240d 0%,#e24a16 52%,#ff8a24 100%)',
    art: '↗',
    eyebrow: 'GOOD WORK COMPOUNDS.',
    title: 'FINISH. EARN. GROW.',
    body: 'Keep your completed jobs, earnings and service performance easy to follow as your business grows.',
    cta: 'View your work',
  },
]

export default function EarningsMarketingCarousel() {
  const decorated = slides.map(slide => ({
    ...slide,
    // PromoDeck already supplies swipe, dots, reduced-motion handling and
    // accessible navigation. The Lucide imports above intentionally keep
    // this component self-documenting for the three concepts.
  }))

  return (
    <section aria-label="Earnings growth" className="space-y-2">
      <div className="flex items-end justify-between px-5">
        <div>
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-plum-600">
            Your SAMBRAMO growth
          </p>
          <h2 className="mt-0.5 text-[15px] font-extrabold text-ink">
            Work in. Money out. Keep growing.
          </h2>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-plum-50 text-plum-700" aria-hidden="true">
          <Sparkles size={14} />
        </span>
      </div>
      <PromoDeck slides={decorated} interval={6000} />
    </section>
  )
}
