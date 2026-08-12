import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarSearch, ArrowRight, TrendingUp } from 'lucide-react'
import EventDateSheet from '../plan/EventDateSheet'
import { useDateInterest } from '../../hooks/useDateDemand'
import { busiestDates } from '../../lib/demand'
import { useCity } from '../../context/CityContext'

/**
 * A date lookup, not a calendar.
 *
 * The first version put a full month grid on the home screen. Six rows of
 * seven cells is most of a phone screen spent on a control nobody asked for
 * yet, and it pushed everything the customer came for below the fold. A
 * calendar is a thing you open, not a thing you live next to.
 *
 * So this is the question instead — "is your date still open?" — sized like
 * every other card on the screen. The grid lives one tap away in the sheet
 * that already exists for the wizard, which also means there is one calendar
 * in the product rather than two that can drift.
 *
 * ── The demand line ──────────────────────────────────────────────────
 *
 * The chips show real enquiry counts and nothing else. No date is ever
 * called full or unavailable — high demand is a reason to move, not a
 * refusal — and with no real enquiries yet the chips and the demand line
 * simply don't render. The card still does: asking for the date is the
 * whole point, and it works with an empty database.
 */
export default function DateCheckCard() {
  const navigate = useNavigate()
  // `city` always has a value — it falls back to a default nobody picked, so
  // only a deliberate choice narrows the counts.
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null

  const [open, setOpen] = useState(false)
  const { interestByDate } = useDateInterest(city)

  const hot = useMemo(
    () => busiestDates({ interestByDate, city }, { limit: 3 }),
    [interestByDate, city],
  )

  function handleConfirm(picked) {
    const params = new URLSearchParams({ date: picked.event_date })
    if (picked.time_slot) params.set('slot', picked.time_slot)
    if (picked.flexible_date) params.set('flex', String(picked.date_window_days ?? 3))
    navigate(`/plan/custom?${params}`)
  }

  return (
    <>
      <section aria-labelledby="date-check-heading" className="px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="home-card group relative block w-full overflow-hidden p-4 text-left"
        >
          {/* A quiet bloom behind the icon rather than a border or a badge —
              enough to make the card read as the actionable one without
              competing with the offer deck above it. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-saffron-400/10 blur-2xl"
          />

          <span className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron-400/15 ring-1 ring-saffron-400/30">
              <CalendarSearch size={18} className="text-saffron-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span id="date-check-heading" className="block text-[15px] font-extrabold text-white">
                Is your date still open?
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/50">
                Check the day you have in mind before you plan anything else.
              </span>
            </span>
            <ArrowRight
              size={16}
              className="mt-1 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5"
            />
          </span>

          {/* Only renders once real enquiries exist. Until then the card is
              simply an invitation, which is honest and still does its job. */}
          {hot.length > 0 && (
            <span className="mt-3 block">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-saffron-300">
                <TrendingUp size={11} />
                High demand
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {hot.map(d => {
                  const [, m, day] = d.iso.split('-').map(Number)
                  const when = new Date(Number(d.iso.slice(0, 4)), m - 1, day)
                  return (
                    <span
                      key={d.iso}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${d.level.chipDark}`}
                    >
                      {when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      <span className="opacity-60">· {d.count} enquiries</span>
                    </span>
                  )
                })}
              </span>
              <span className="mt-1.5 block text-[10px] leading-snug text-white/40">
                Enquiries are coming in for these dates — vendors get committed early.
              </span>
            </span>
          )}

          <span className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-2.5 text-[12px] font-extrabold text-plum-950">
            Check available dates
            <ArrowRight size={14} />
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
