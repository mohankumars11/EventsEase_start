import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WEEKDAYS } from '../../config/vendor'
import { toISODate } from '../../utils/format'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * A month of dates, padded to whole weeks, with the paging chrome.
 *
 * Presentational only — it knows how a calendar is shaped and nothing about
 * what the dates mean. Callers render each day themselves via `renderDay`,
 * which is what lets the vendor's availability editor and the customer's
 * date picker share one grid while showing completely different things.
 *
 * Lifted from VendorAvailability, which had this inline and was the only
 * calendar in the codebase until now.
 */
export default function MonthGrid({
  cursor,
  onCursor,
  minDate,           // Date — months before this one are unreachable
  renderDay,         // (date, { iso, isToday, isPast }) => ReactNode
  className = '',
}) {
  /**
   * Leading and trailing blanks are rendered rather than skipped: a grid that
   * starts the 1st under the wrong weekday column is a calendar people
   * misread, and they pick the wrong day because of it.
   */
  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const total = new Date(year, month + 1, 0).getDate()
    const out = Array.from({ length: first.getDay() }, () => null)
    for (let d = 1; d <= total; d++) out.push(new Date(year, month, d))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  const todayISO = toISODate(new Date())
  const floorISO = minDate ? toISODate(minDate) : null

  // Paging back past the floor month is pointless, so the control says so.
  const atFloor = minDate
    ? cursor.getFullYear() === minDate.getFullYear() && cursor.getMonth() === minDate.getMonth()
    : false

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={atFloor}
          aria-label="Previous month"
          className="p-2 rounded-lg text-gray-400 hover:text-plum-600 hover:bg-plum-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="font-display font-bold text-gray-900" aria-live="polite">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Next month"
          className="p-2 rounded-lg text-gray-400 hover:text-plum-600 hover:bg-plum-50 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map(d => (
          <div key={d.id} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide py-1">
            {d.short}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="aspect-square" />
          const iso = toISODate(date)
          return (
            <div key={iso} className="aspect-square">
              {renderDay(date, {
                iso,
                isToday: iso === todayISO,
                isPast: floorISO ? iso < floorISO : false,
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
