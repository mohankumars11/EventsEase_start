import React, { useState } from 'react'
import { Shell } from './shell'
import LocationStage from '../../../src/components/vendor/anchor/stages/LocationStage'
export default function Scene() {
  const [v, set] = useState({ lat: 12.9784, lng: 77.6408, source: 'gps', confirmed: true, formatted_address: '12th Main Rd, HAL 2nd Stage, Indiranagar', locality: 'Indiranagar', city: 'Bengaluru', postal_code: '560038', travel_scope: '50' })
  return <Shell stage="location"><LocationStage value={v} set={set} /></Shell>
}
