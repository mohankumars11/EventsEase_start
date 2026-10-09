import React from 'react'
import CalendarFullScreen from '../../../src/components/partner/calendar/CalendarFullScreen'

/* The real Calendar tab, full screen. Days open through the month, a
   couple blocked, one limited — the state from Mohan's screenshot. */
const av = {}
for (let d = 6; d <= 31; d++) av[`2026-10-${String(d).padStart(2, '0')}`] = { status: 'OPEN', slots_total: 2, slots_booked: 0 }
av['2026-10-11'] = { status: 'BLOCKED', slots_total: 0, slots_booked: 0 }
av['2026-10-24'] = { status: 'LIMITED', slots_total: 2, slots_booked: 1 }

export default function Scene() {
  return (
    <div style={{ width: 390, margin: '0 auto' }}>
      <CalendarFullScreen embedded vendorId={null} vendor={{ id: null, max_events_per_day: 2, lead_time_days: 1 }}
        availability={av} weeklyRules={[]} onBack={() => {}}
        onSetDay={async () => {}} onSetRange={async () => {}} onClearDays={async () => {}} onSaveWeeklyRules={async () => {}} />
    </div>
  )
}
