/**
 * The trip screen, with real streets under it.
 *
 *   node scripts/shoot-components.mjs shots/trip-live.png \
 *     --scenes scripts/scenes/trip-live.jsx --width 430 --wait 4000
 */
import React from 'react'
import RouteMap from '../../src/components/partner/RouteMap'
import JobChat from '../../src/components/partner/JobChat'
import LocationGate from '../../src/components/partner/LocationGate'

const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()
const noop = async () => {}

/* Indiranagar to the Leela Palace, down 100 Feet Road and up Old
   Airport Road, with the doubling back at the Domlur flyover left in.
   The line is the fixes as recorded, never smoothed. */
const DRIVE = [
  [12.9784, 77.6408], [12.9770, 77.6395], [12.9751, 77.6382],
  [12.9733, 77.6371], [12.9718, 77.6361], [12.9702, 77.6349],
  [12.9689, 77.6334], [12.9681, 77.6312], [12.9676, 77.6290],
  [12.9684, 77.6271], [12.9697, 77.6262], [12.9709, 77.6259],
  [12.9721, 77.6251], [12.9735, 77.6239], [12.9748, 77.6226],
  [12.9759, 77.6212], [12.9766, 77.6197], [12.9772, 77.6181],
].map(([lat, lng]) => ({ lat, lng }))

const CHAT = [
  { id: 'a', sender: 'customer', body: 'Which gate will you come to?',
    created_at: hoursAgo(0.6), read_at: hoursAgo(0.55) },
  { id: 'b', sender: 'partner', body: 'I have set off and am on my way now.',
    created_at: hoursAgo(0.4), read_at: hoursAgo(0.3) },
  { id: 'c', sender: 'customer', body: 'Perfect. The main gate is fine.',
    created_at: hoursAgo(0.2), read_at: null },
]

const Label = ({ children, note }) => (
  <>
    <p data-scene-label style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
       textTransform: 'uppercase', color: '#111827', margin: '20px 0 3px' }}>{children}</p>
    {note && <p data-scene-label style={{ font: '400 11.5px/1.4 system-ui',
       color: '#4b5563', margin: '0 0 8px' }}>{note}</p>}
  </>
)

export default function TripLiveScenes() {
  return (
    <div style={{ width: 430, margin: '0 auto', background: '#fff', padding: 16 }}>
      <Label note="Real OpenStreetMap tiles. The gold line is the partner's own fixes; the kink is the Domlur flyover being shut. Zoom, pan, and a crosshair that says whether it is still following.">
        The map, mid-journey
      </Label>
      <RouteMap
        trail={DRIVE}
        me={DRIVE[DRIVE.length - 1]}
        destination={{ lat: 12.9606, lng: 77.6167 }}
        height={300}
      />

      <Label note="Android's dialog can only be raised by asking for the permission, so this button IS the OS prompt.">
        When location is off
      </Label>
      <LocationGate onGranted={noop} compact />

      <Label note="Opens when the line is paid for, closes a week after the event. The quick lines fill the box rather than sending.">
        Messaging the customer
      </Label>
      <JobChat lineId="demo" initialRows={CHAT} initialCanWrite />
    </div>
  )
}
