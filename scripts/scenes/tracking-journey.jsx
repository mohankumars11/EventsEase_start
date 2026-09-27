/**
 * The journey line, with points on it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE EXISTING SCENES SHOW "WAITING FOR YOUR FIRST LOCATION FIX"
 * ══════════════════════════════════════════════════════════════════════
 *
 * `TrackingMap` reads the trail from `tracking_location_events`, which
 * only the partner who laid it and an operator can read. The harness has
 * no session, so the component correctly renders the empty state — which
 * is honest and is not what anybody wants to look at.
 *
 * `initialTrail` hands the points in, exactly as `initialSession` hands
 * in the row. The coordinates below are a real drive: Indiranagar to the
 * Leela Palace, down 100 Feet Road and up Old Airport Road, with the
 * doubling-back at the Domlur flyover left in.
 *
 * ── What this is NOT ────────────────────────────────────────────────
 * There are no street tiles under this line and there deliberately never
 * have been. A partner in traffic navigates from Google Maps, which has
 * a voice and knows which flyover shut. See the header of TrackingMap.
 * This answers the two questions Maps cannot: how much is left, and is
 * my location still being shared.
 *
 *   node scripts/shoot-components.mjs shots/tracking-journey.png \
 *     --scenes scripts/scenes/tracking-journey.jsx --width 430
 */
import React from 'react'
import LiveTracking from '../../src/components/partner/LiveTracking'

const soon = mins => new Date(Date.now() + mins * 60000).toISOString()

const JOB = {
  line_id: 'l1',
  service_name: 'Wedding reception catering, 220 plates',
  area_label: 'Leela Palace, Bengaluru',
  event_date: '2026-09-23',
}

/* Indiranagar → Leela Palace. Real road, real doubling back: the trail
   is drawn from the points as recorded, never smoothed, so a route that
   went wrong looks like it went wrong. */
const DRIVE = [
  [12.9784, 77.6408], [12.9770, 77.6395], [12.9751, 77.6382],
  [12.9733, 77.6371], [12.9718, 77.6361], [12.9702, 77.6349],
  [12.9689, 77.6334], [12.9681, 77.6312], [12.9676, 77.6290],
  /* the flyover was shut; they came back round */
  [12.9684, 77.6271], [12.9697, 77.6262], [12.9709, 77.6259],
  [12.9721, 77.6251], [12.9735, 77.6239], [12.9748, 77.6226],
  [12.9759, 77.6212], [12.9766, 77.6197], [12.9772, 77.6181],
].map(([lat, lng]) => ({ lat, lng }))

const Box = ({ title, note, children }) => (
  <div style={{ marginBottom: 26 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px' }}>
      {title}
    </p>
    {note && (
      <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 8px' }}>
        {note}
      </p>
    )}
    <div style={{ width: 398, background: '#f7f7f8', borderRadius: 24, padding: 14,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

export default function TrackingJourneyScenes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>

      <Box
        title="Halfway, with the trail drawn"
        note="Eighteen fixes so far. The line is the points as recorded — the kink is the Domlur flyover being shut."
      >
        <LiveTracking
          job={JOB}
          initialTrail={DRIVE}
          initialSession={{
            id: 's1', mode: 'arrival', status: 'active',
            destination: { type: 'Point', coordinates: [77.6167, 12.9606] },
            distance_remaining_m: 4200, eta_at: soon(14),
            geofence_entered_at: null, arrival_confirmed_at: null,
          }}
        />
      </Box>

      <Box
        title="Nearly there"
        note="Inside the 200 m fence the button turns primary and the sentence changes. It does NOT mark anybody arrived — a driver at the light outside the gate is inside the fence and is not there yet."
      >
        <LiveTracking
          job={JOB}
          initialTrail={DRIVE}
          initialSession={{
            id: 's2', mode: 'arrival', status: 'active',
            destination: { type: 'Point', coordinates: [77.6167, 12.9606] },
            distance_remaining_m: 140, eta_at: soon(2),
            geofence_entered_at: soon(-1), arrival_confirmed_at: null,
          }}
        />
      </Box>
    </div>
  )
}
