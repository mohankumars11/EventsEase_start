/**
 * The two screens a venue owner now gets that nobody had before: what
 * the hall really costs, and showing the hall itself.
 */
import React, { useState } from 'react'
import VenueTerms from '../../src/components/vendor/VenueTerms'
import WorkUpload from '../../src/components/vendor/WorkUpload'
import { workPromptsFor } from '../../src/data/workPrompts'

function Label({ children }) {
  return (
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
      textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{children}</p>
  )
}

export default function VenueWorkScenes() {
  const [terms, setTerms] = useState({
    basis: 'per_day', rent: '85000', deposit: '25000', advance_pct: '30',
    kitchen_royalty: '15000', overtime_hour: '5000', generator: '4000',
  })
  const [work, setWork] = useState([
    { kind: 'photo', path: 'a', caption: 'The 600-seat hall, set for a reception' },
    { kind: 'video', path: 'b', caption: 'Walk-through from the gate' },
    { kind: 'testimonial', key: 't1', said_by: 'Suresh K', said_about: 'Wedding, Feb',
      body: 'They told us the generator charge before we booked. Nobody else did.' },
  ])
  return (
    <div id="venue" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Label>Venue · what the hall costs</Label>
      <VenueTerms value={terms} onChange={setTerms} />
      <div style={{ height: 22 }} />
      <Label>Venue · show them the place</Label>
      <WorkUpload value={work} onChange={setWork} trade="Venue" copy={workPromptsFor('Venue')} />
    </div>
  )
}
