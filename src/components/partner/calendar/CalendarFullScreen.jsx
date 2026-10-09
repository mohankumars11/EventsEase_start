/**
 * Calendar, full screen, behind VITE_FF_CALENDAR_FULLSCREEN.
 *
 * Not a second calendar. It is the Calendar tab's own CalendarMonth —
 * same hero, Month/Week/List, grid, legend, coverage, availability tools
 * and upcoming bookings, same availability rows and same handlers — drawn
 * over everything so the bottom nav and dashboard are out of the way. The
 * only chrome added is Back, which returns to whoever opened it.
 */
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import CalendarMonth from '../CalendarMonth'

export const CALENDAR_FULLSCREEN = import.meta.env?.VITE_FF_CALENDAR_FULLSCREEN === 'true'

export default function CalendarFullScreen({ onBack, embedded = false, ...calendarProps }) {
  const body = (
    <div className={`${embedded ? 'relative' : 'fixed inset-0 z-[96] overflow-y-auto'} bg-white`}>
      <div className="sticky top-0 z-20 flex items-center bg-white/85 px-2 pb-1 pt-[calc(0.4rem+env(safe-area-inset-top,0px))] backdrop-blur-xl">
        <button type="button" onClick={onBack} aria-label="Back"
          className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[13.5px] font-extrabold text-ink/75 hover:bg-ink/[0.05]">
          <ArrowLeft size={19} /> Back
        </button>
      </div>
      <div className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <CalendarMonth {...calendarProps} />
      </div>
    </div>
  )
  return embedded ? body : createPortal(body, document.body)
}
