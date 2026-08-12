import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, X, ArrowRight, Users, CalendarSearch } from 'lucide-react'
import EventDateSheet from '../plan/EventDateSheet'
import { useDateInterest } from '../../hooks/useDateDemand'
import { busiestDates } from '../../lib/demand'
import { humanDate } from '../../utils/format'
import { useCity } from '../../context/CityContext'
import { useEventDate, setEventDate, planHrefFor } from '../../hooks/useEventDate'

/**
 * A standing pill that says how many dates people are already asking about,
 * and opens the list.
 *
 * A section further down the page is something you scroll past once. This
 * stays on screen, so the fact that other families are already booking the
 * dates you are considering is present while you browse rather than
 * announced once and forgotten.
 *
 * It does not interrupt: no auto-open, no timer, no reappearing after
 * dismissal within a session. The pill is the whole nudge, and tapping is
 * the only thing that expands it.
 *
 * ── Tapping opens the calendar, it does not leave the page ───────────
 *
 * "Check your date" used to navigate to /plan, which answers a question the
 * customer had not asked yet: they came here to look at *their* date, and
 * arrived on a screen about occasions with no calendar on it. The date is
 * what this panel is about, so tapping anything here opens the calendar over
 * the home screen — and a listed date opens it already sitting on that day,
 * so a customer curious about 22 Nov can see it in its month with the rest of
 * the calendar around it, and move off it if it does not suit.
 *
 * Only once a date *and* a time of day are chosen does anyone leave: then it
 * goes to /plan, with the date saved (see useEventDate) so every other
 * calendar in the app already knows it.
 *
 * ── Nothing here is invented ─────────────────────────────────────────
 *
 * Every date listed cleared the real-interest floor in lib/demand.js, and
 * every count is enquiries that actually happened — through the site, or
 * logged by the team with a note saying where they came from. With no real
 * interest yet, this renders nothing at all rather than an empty promise.
 */

// Sits below the chat dock (z-45) and the bottom nav (z-50), matching the
// ladder the rest of the app's floating chrome uses.
const DISMISS_KEY = 'sambramo_date_badge_dismissed'

export default function DateInterestBadge() {
  const navigate = useNavigate()
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null
  const { interestByDate } = useDateInterest(city)
  const saved = useEventDate()

  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // What the calendar opens on: a tapped date, or whatever was already saved.
  const [seed, setSeed] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const panelRef = useRef(null)

  const dates = useMemo(
    () => busiestDates({ interestByDate, city }, { limit: 6 }),
    [interestByDate, city],
  )

  // Escape closes the panel — the pill itself stays.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function dismiss() {
    setOpen(false)
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* storage off; fine */ }
  }

  /** Open the calendar — on `iso` if a listed date was tapped, else on the
   *  date already saved, else on nothing. The panel closes underneath it. */
  function openCalendar(iso) {
    setSeed(iso ? { ...(saved ?? {}), event_date: iso } : saved)
    setSheetOpen(true)
    setOpen(false)
  }

  function handleConfirm(picked) {
    setEventDate(picked)
    navigate(planHrefFor(picked))
  }

  // No real interest anywhere, or the customer closed it this session.
  if (dates.length === 0 || dismissed) return null

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center pb-bottom-nav">
        {open && (
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Dates in high demand"
            className="pointer-events-auto mx-4 mb-2 w-[min(24rem,calc(100vw-2rem))] animate-pop-in rounded-2xl border border-plum-700 bg-plum-950 p-4 shadow-2xl shadow-black/50 outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-extrabold text-white">
                  These dates are in high demand
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Enquiries are coming in{city ? ` across ${city}` : ''}. Open any date to
                  see it in the calendar — yours may be quieter.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {dates.map(d => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => openCalendar(d.iso)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-left ring-1 ring-white/10 transition-colors hover:bg-white/10"
                >
                  <span className="text-[12px] font-extrabold text-white">
                    {humanDate(d.iso)}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${d.level.chipDark}`}>
                    <Users size={9} />{d.headline}
                  </span>
                  <ArrowRight size={13} className="ml-auto shrink-0 text-white/30" />
                </button>
              ))}
            </div>

            {/* The way in for somebody whose date is not on the list — which
                is most people, and the reason this panel exists at all. */}
            <button
              type="button"
              onClick={() => openCalendar(null)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-400 py-2.5 text-[12px] font-extrabold text-plum-950"
            >
              <CalendarSearch size={13} />
              {saved?.event_date ? 'Change your date' : 'Check your date'}
            </button>
            <p className="mt-1.5 text-center text-[10px] text-white/40">
              Every date is open — pick yours and we'll hold the Masters.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="pointer-events-auto mb-3 flex items-center gap-2 rounded-full bg-teal-400 px-4 py-2.5 text-[12px] font-extrabold text-plum-950 shadow-lg shadow-black/30"
        >
          <span className="relative flex items-center">
            <TrendingUp size={14} />
            {!open && (
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-crimson-600 animate-pulse-ring" />
            )}
          </span>
          {dates.length} {dates.length === 1 ? 'date' : 'dates'} in high demand
        </button>
      </div>

      <EventDateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        city={city}
        value={seed}
        onConfirm={handleConfirm}
      />
    </>
  )
}
