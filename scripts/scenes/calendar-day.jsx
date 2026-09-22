/**
 * The day sheet, on a phone-width viewport.
 *
 * The thing this shot exists to catch is the sheet rendering OFF-SCREEN.
 * It is `position: fixed`, and any transform on an ancestor — including
 * the identity transform a settled entrance animation leaves behind —
 * makes that ancestor the containing block. It has happened here before,
 * and it looks like the sheet simply not opening.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import DayDetailSheet from '../../src/components/partner/DayDetailSheet'

const VENDOR = {
  id: 'v1', business_name: 'Lens & Light Studio',
  max_events_per_day: 2, working_start: '09:00:00', working_end: '22:00:00',
}

const availability = {
  '2026-10-24': { status: 'LIMITED', slots_total: 2, slots_booked: 1, note: 'Second half only' },
}

const jobsOnDay = [{
  line_id: 'a', occasion_name: 'Anjali & Rohan Reception',
  service_name: 'Candid photography', trade: 'Photography', status: 'paid',
  event_date: '2026-10-24', time_note: '6:00 PM – 11:00 PM',
  area_label: 'Indiranagar', partner_amount_paise: 3400000,
}]

const pendingOnDay = [{
  offer_id: 'o1', line_id: 'b', occasion_name: 'Naming ceremony',
  service_name: 'Half-day shoot', event_date: '2026-10-24',
  time_note: '9:00 AM – 1:00 PM', area_label: 'Malleshwaram',
  expires_at: '2026-10-01T10:00:00Z', partner_amount_paise: 900000,
}]

export default function CalendarDayScene() {
  return (
    <MemoryRouter>
      {/* 430x900 so the fixed sheet has a viewport to pin to. */}
      <div data-scene="calendar-day" style={{ width: 430, height: 900, background: '#f6f5f9' }}>
        <DayDetailSheet
          date="2026-10-24"
          vendor={VENDOR}
          availability={availability}
          weeklyRules={[]}
          jobsOnDay={jobsOnDay}
          pendingOnDay={pendingOnDay}
          onSetDay={async () => {}}
          onClearDay={async () => {}}
          onClose={() => {}}
        />
      </div>
    </MemoryRouter>
  )
}
