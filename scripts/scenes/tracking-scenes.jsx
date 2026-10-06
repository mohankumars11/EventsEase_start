/**
 * The tracking screen at each point in a journey, mounted from src/.
 *
 * The sessions here are shaped exactly like rows from
 * `tracking_sessions`, so what is photographed is the real component
 * reading the real columns. Nothing is drawn.
 *
 * `TrackingMap` reads the trail from supabase, which the harness points
 * at 127.0.0.1:9 — so it renders its genuine "waiting for your first
 * location fix" state, which is also what a partner sees in the first
 * fifteen seconds after tapping Start trip.
 */
import React from 'react'
import LiveTracking from '../../src/components/partner/LiveTracking'
import OnlineToggle from '../../src/components/partner/OnlineToggle'

const soon = mins => new Date(Date.now() + mins * 60000).toISOString()

const JOB = {
  line_id: 'l1',
  service_name: 'Wedding reception catering, 220 plates',
  area_label: 'Leela Palace, Bengaluru',
  event_date: '2026-09-15',
}

/* LiveTracking reads its session through fetchSession, which the stub
   cannot answer. These scenes pass the row in directly by pre-seeding
   the component through initialSession. */
const Box = ({ id, title, children }) => (
  <div style={{ marginBottom: 26 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
      {title}
    </p>
    <div id={id} data-shot={id}
         style={{ width: 390, background: '#f7f7f8', borderRadius: 24, padding: 14,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

export default function TrackingScenes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>
      <Box id="shotOnline" title="Jobs header · the switch that stops the work">
        <div style={{ background: '#2E1065', borderRadius: 18, padding: 16 }}>
          <p style={{ font: '700 10px/1 ui-monospace', letterSpacing: '.2em',
                      color: '#c4b5fd', margin: 0 }}>SAMBRAMO PARTNER</p>
          <p style={{ font: '800 19px/1.2 system-ui', color: '#fff', margin: '6px 0 10px' }}>
            Annapurna Catering
          </p>
          <OnlineToggle vendorId="shot" initial />
        </div>
      </Box>

      <Box id="shotIdle" title="Before departure">
        <LiveTracking job={JOB} initialSession={null} />
      </Box>

      <Box id="shotOnWay" title="On the way">
        <LiveTracking job={JOB} initialSession={{
          id: 's1', mode: 'arrival', status: 'active',
          distance_remaining_m: 8400, eta_at: soon(28),
          geofence_entered_at: null, arrival_confirmed_at: null,
        }} />
      </Box>

      <Box id="shotNear" title="Inside the geofence — it prompts, it does not arrive">
        <LiveTracking job={JOB} initialSession={{
          id: 's2', mode: 'arrival', status: 'active',
          distance_remaining_m: 140, eta_at: soon(2),
          geofence_entered_at: soon(-1), arrival_confirmed_at: null,
        }} />
      </Box>

      <Box id="shotArrived" title="Arrived — and location sharing has stopped">
        <LiveTracking job={JOB} initialSession={{
          id: 's3', mode: 'arrival', status: 'arrived',
          distance_remaining_m: 40, arrived_at: soon(-3),
          geofence_entered_at: soon(-6), arrival_confirmed_at: soon(-3),
        }} />
      </Box>

      <Box id="shotTrip" title="Transport — the journey is the service, so it runs on">
        <LiveTracking job={{ ...JOB, service_name: 'Tempo traveller, airport transfer' }}
          initialSession={{
            id: 's4', mode: 'trip', status: 'arrived',
            distance_remaining_m: 90, arrived_at: soon(-2),
            geofence_entered_at: soon(-4), arrival_confirmed_at: soon(-2),
          }} />
      </Box>
    </div>
  )
}
