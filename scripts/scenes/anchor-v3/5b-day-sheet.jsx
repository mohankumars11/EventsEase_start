import React from 'react'
import DayDetailSheet from '../../../src/components/partner/DayDetailSheet'

/* The Calendar tab's own day sheet, with the new "Bookable this day" block. */
export default function Scene() {
  return (
    <div style={{ width: 390, height: 1300, margin: '0 auto', position: 'relative' }}>
      <DayDetailSheet date="2026-10-18" vendor={{ id: null, max_events_per_day: 2 }}
        availability={{ '2026-10-18': { status: 'OPEN', slots_total: 2, slots_booked: 1 } }}
        jobsOnDay={[{ id: 'j1', event_date: '2026-10-18', status: 'paid', service_name: 'Reception', time_note: '18:00–21:00', area_label: 'Koramangala' }]}
        pendingOnDay={[]} onSetDay={async () => {}} onClearDay={async () => {}} onApplyToRange={() => {}} onClose={() => {}}
        pricing={{
          seasonal: null,
          prices: [
            { name: 'Essential', paise: 1086960, hours: 2, bookable: true },
            { name: 'Signature', paise: 1902180, hours: 4, bookable: true },
            { name: 'VIP', paise: 4347830, bookable: false, why: 'Day too short' },
          ],
        }} />
    </div>
  )
}
