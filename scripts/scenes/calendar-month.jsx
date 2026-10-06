/**
 * The rebuilt month, in every state a day can be in.
 *
 * Mounted without a session or a dev server — see shoot-components.mjs.
 * The point of the shot is that NO cell is blank: the bug this screen
 * was rebuilt for was a partner tapping Available and seeing the month
 * come back identical.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import MonthGrid, { CalendarLegend } from '../../src/components/partner/MonthGrid'

/* September 2026. The 21st is today, so the grid should ring it. */
const CURSOR = new Date(2026, 8, 1)

const availability = {
  '2026-09-03': { status: 'OPEN' },
  '2026-09-05': { status: 'BLOCKED', reason: 'travel' },
  '2026-09-07': { status: 'LIMITED', slots_total: 2, slots_booked: 1 },
  '2026-09-12': { status: 'BLOCKED', reason: 'personal' },
  '2026-09-16': { status: 'LIMITED', slots_total: 3 },
  '2026-09-20': { status: 'BLOCKED', reason: 'holiday' },
  '2026-09-23': { status: 'OPEN', hours: [{ start: '14:00', end: '20:00' }] },
  '2026-09-29': { status: 'LIMITED', slots_total: 1 },
}

/* A standing Sunday off, in the CORRECT convention: 0 is Sunday.
   Stored as Monday=0 this used to close Saturdays. */
const weeklyRules = [
  { weekday: 0, is_available: false, effective_from: '2026-01-01' },
]

const job = (id, date, name) => ({
  line_id: id, event_date: date, occasion_name: name, service_name: name,
  trade: 'Photography', status: 'paid', time_note: '10:00 AM – 4:00 PM',
  area_label: 'Jayanagar', distance_m: 6000, partner_amount_paise: 2400000,
})

const jobs = [
  job('a', '2026-09-07', 'Mehendi'),
  job('b', '2026-09-09', 'Reception'),
  job('c', '2026-09-09', 'Sangeet'),
  job('d', '2026-09-18', 'Birthday'),
  job('e', '2026-09-24', 'Corporate'),
  job('f', '2026-09-24', 'Engagement'),
]

/* The day that looks fine and is not — a far job straight after a near
   one. The rose outline is the only mark that means "do something". */
const conflicts = { '2026-09-24': 'TIGHT' }

export default function CalendarMonthScene() {
  const [cursor, setCursor] = React.useState(CURSOR)
  const [selected, setSelected] = React.useState('2026-09-24')
  return (
    <MemoryRouter>
      <div data-scene="calendar-month"
           style={{ width: 430, background: '#fff', padding: 12,
                    display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MonthGrid
          jobs={jobs}
          availability={availability}
          weeklyRules={weeklyRules}
          conflicts={conflicts}
          maxPerDay={2}
          selected={selected}
          onSelect={setSelected}
          cursor={cursor}
          onCursor={setCursor}
        />
        <CalendarLegend />
      </div>
    </MemoryRouter>
  )
}
