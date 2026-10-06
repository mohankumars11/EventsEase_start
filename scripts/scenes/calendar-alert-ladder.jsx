/**
 * The alert ladder, top to bottom.
 *
 * The thing worth looking at here is not that the red panel renders —
 * it is the DISTANCE between the quiet ones and the red one. If an
 * ordinary two-day block looks anything like closing the whole month,
 * the rationing described in lib/calendarAlerts.js has failed, and that
 * failure is visual rather than logical: the guard can prove the level
 * is INFO and still leave a panel that shouts.
 *
 *   node scripts/shoot-components.mjs shots/calendar-range.png \
 *     --scenes scripts/scenes/calendar-range.jsx
 */
import React from 'react'
import { assessChange, LEVEL } from '../../src/lib/calendarAlerts'

const TODAY = new Date().toISOString().slice(0, 10)
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* A real-looking job on a date inside one of the ranges below. */
const jobs = [
  { line_id: '1', event_date: addDays(TODAY, 3), status: 'accepted',
    occasion_name: 'Sharma Sangeet', service_name: 'Catering' },
]

/* Enough enquiries on three dates to reach the red demand signal, and
   two on a fourth so the floor can be seen holding. */
const interestByDate = new Map([
  [addDays(TODAY, 10), { total: 7 }],
  [addDays(TODAY, 11), { total: 4 }],
  [addDays(TODAY, 12), { total: 9 }],
  [addDays(TODAY, 13), { total: 2 }],
])

/* Everything blocked for the next forty days, so "this closes every day
   of the next 30" is reachable. */
const shutMonth = {}
for (let i = 0; i < 40; i++) {
  shutMonth[addDays(TODAY, i)] = { slot_date: addDays(TODAY, i), status: 'BLOCKED' }
}

const noop = async () => {}

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && (
        <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 8px' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

/**
 * The sheet is `position: fixed`, which would stack every copy on top of
 * the last. Each is given its own relative box and the fixed positioning
 * is scoped to it — the same trick the other sheet scenes use.
 *
 * No transform anywhere: an ancestor with one breaks position:fixed and
 * the sheet renders off-screen, which DayDetailSheet's header warns
 * about at length.
 */
function Framed({ children, height = 640 }) {
  return (
    <div style={{
      position: 'relative', height, width: 430, overflow: 'hidden',
      borderRadius: 18, border: '1px solid #e8e6ea', background: '#f6f5f7',
    }}>
      {children}
    </div>
  )
}

/** The alert panel on its own, at each level, for side-by-side reading. */
function Alerts({ label, alert }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ font: '700 10.5px/1.3 system-ui', color: '#b0aeb4', margin: '0 0 4px' }}>
        {label} · level {alert.level} · {alert.needsConfirm ? 'two presses' : 'one press'}
      </p>
      {alert.signals.map(s => (
        <p key={s.id} style={{
          font: s.level === LEVEL.INFO ? '400 11.5px/1.4 system-ui' : '700 12px/1.4 system-ui',
          color: s.level === LEVEL.RED ? '#9f1239' : s.level === LEVEL.WARN ? '#854d0e' : '#8a8a8a',
          background: s.level === LEVEL.RED ? '#fff1f2' : s.level === LEVEL.WARN ? '#fefce8' : 'transparent',
          padding: s.level === LEVEL.INFO ? '2px 4px' : '8px 10px',
          borderRadius: 12, margin: '0 0 5px',
        }}>{s.says}</p>
      ))}
    </div>
  )
}

const base = extra => assessChange({
  availability: {}, jobs, interestByDate, weeklyRules: [],
  maxPerDay: 1, todayISO: TODAY, ...extra,
})

export default function CalendarAlertLadder() {
  return (
    <div style={{ width: 430, margin: '0 auto', padding: 16, background: '#fff' }}>
      <Scene
        title="The alert ladder"
        note="Top to bottom: ordinary, ordinary-with-a-note, warned, then the three that earn red. If the first three look like the last three, the rationing has failed."
      >
        <Alerts
          label="Two Tuesdays in November"
          alert={base({ dates: [addDays(TODAY, 42), addDays(TODAY, 49)], status: 'BLOCKED' })}
        />
        <Alerts
          label="A weekend"
          alert={base({ dates: [addDays(TODAY, 4), addDays(TODAY, 5)], status: 'BLOCKED' })}
        />
        <Alerts
          label="A date two people asked about (below the floor)"
          alert={base({ dates: [addDays(TODAY, 13)], status: 'BLOCKED' })}
        />
        <Alerts
          label="One date four people asked about"
          alert={base({ dates: [addDays(TODAY, 11)], status: 'BLOCKED' })}
        />
        <Alerts
          label="RED - a date with confirmed work"
          alert={base({ dates: [addDays(TODAY, 3)], status: 'BLOCKED' })}
        />
        <Alerts
          label="RED - three dates people are asking about"
          alert={base({
            dates: [addDays(TODAY, 10), addDays(TODAY, 11), addDays(TODAY, 12)],
            status: 'BLOCKED',
          })}
        />
        <Alerts
          label="RED - nothing open left in the next 30"
          alert={base({
            availability: shutMonth,
            dates: Array.from({ length: 35 }, (_, i) => addDays(TODAY, i)),
            status: 'BLOCKED',
          })}
        />
        <Alerts
          label="Opening up - never a warning, whatever the size"
          alert={base({
            dates: Array.from({ length: 35 }, (_, i) => addDays(TODAY, i)),
            status: 'OPEN',
          })}
        />
        <Alerts
          label="Clearing - the standing week takes over"
          alert={base({ dates: [addDays(TODAY, 3), addDays(TODAY, 4)], status: null })}
        />
      </Scene>
    </div>
  )
}
