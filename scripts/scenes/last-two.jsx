/**
 * Set availability and Service area, mounted from src/.
 */
import React from 'react'
import SetAvailability from '../../src/components/partner/SetAvailability'
import ServiceArea from '../../src/components/partner/ServiceArea'

const VENDOR = {
  id: 'v1', business_name: 'Annapurna Catering Services',
  area: 'Jayanagar', city: 'Bengaluru', service_radius_km: 50,
  /* A real PostGIS GeoJSON point, as PostgREST returns it. */
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
}

const Box = ({ id, title, children }) => (
  <div style={{ marginBottom: 26 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{title}</p>
    <div id={id} data-shot={id}
         style={{ width: 390, background: '#f4f4f6', borderRadius: 24, padding: 14,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

export default function LastTwo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>
      <Box id="shotAvail" title="Set availability · a day, or a run of them">
        <SetAvailability
          date={new Date().toISOString().slice(0, 10)}
          availability={{}}
          onSetDay={async () => {}}
          onSetRange={async () => {}}
        />
      </Box>

      <Box id="shotArea" title="Service area · the ring, and what it reaches">
        <ServiceArea vendor={VENDOR} onSave={async () => {}} />
      </Box>
    </div>
  )
}
