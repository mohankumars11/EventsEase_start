import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Flame, X, ArrowRight, Users } from 'lucide-react'
import { useDateInterest } from '../../hooks/useDateDemand'
import { busiestDates } from '../../lib/demand'
import { humanDate } from '../../utils/format'
import { useCity } from '../../context/CityContext'

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
  const { city: cityName, chosen } = useCity()
  const city = chosen ? cityName : null
  const { interestByDate } = useDateInterest(city)

  const [open, setOpen] = useState(false)
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
            aria-label="Dates people are asking about"
            className="pointer-events-auto mx-4 mb-2 w-[min(24rem,calc(100vw-2rem))] animate-pop-in rounded-2xl border border-plum-700 bg-plum-950 p-4 shadow-2xl shadow-black/50 outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-extrabold text-white">
                  Dates people are asking about
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Real enquiries{city ? ` in ${city}` : ''} — tell us yours before the vendors go.
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
                <Link
                  key={d.iso}
                  to={`/plan/custom?date=${d.iso}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                >
                  <span className="text-[12px] font-extrabold text-white">
                    {humanDate(d.iso)}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${d.level.chipDark}`}>
                    <Users size={9} />{d.headline}
                  </span>
                  <ArrowRight size={13} className="ml-auto shrink-0 text-white/30" />
                </Link>
              ))}
            </div>

            <Link
              to="/plan/custom"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-saffron-400 py-2.5 text-[12px] font-extrabold text-plum-950"
            >
              Check your own date <ArrowRight size={13} />
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="pointer-events-auto mb-3 flex items-center gap-2 rounded-full bg-saffron-400 px-4 py-2.5 text-[12px] font-extrabold text-plum-950 shadow-lg shadow-black/30"
        >
          <span className="relative flex items-center">
            <Flame size={14} />
            {!open && (
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-crimson-600 animate-pulse-ring" />
            )}
          </span>
          {dates.length} {dates.length === 1 ? 'date is' : 'dates are'} filling fast
        </button>
      </div>
    </>
  )
}
