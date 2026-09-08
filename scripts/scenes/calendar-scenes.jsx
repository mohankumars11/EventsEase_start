/**
 * The calendar at a real phone width, and the day sheet with a location.
 *
 * The grid does not scroll, it squeezes: page px-4 + card p-3 + grid
 * gap-1 left 40px cells on a 360px handset, under both the 44pt iOS and
 * 48dp Android minimum, each holding a date, a "3 left" badge and a note
 * dot. Shot at 360 because that is where it hurts.
 */
import React, { useState } from 'react'
import DayStatusSheet from '../../src/components/vendor/DayStatusSheet'
import { ToastProvider } from '../../src/context/ToastContext'

export default function CalendarScenes() {
  const [open, setOpen] = useState(true)
  return (
    <ToastProvider>
      <div id="cal" style={{ width: 360, margin: '0 auto', minHeight: 1060, background: '#faf9f7' }}>
        {open && (
          <DayStatusSheet
            date={new Date(2026, 10, 14)}
            current="OPEN"
            hasRow={false}
            currentSlots={null}
            currentNote=""
            currentWhere={null}
            reason={null}
            isDayOff={false}
            maxPerDay={2}
            onSave={async () => {}}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </ToastProvider>
  )
}
