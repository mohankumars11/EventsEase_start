/**
 * Every listing and where each one is — at one, at three, and at seven.
 */
import React from 'react'
import ListingTracker from '../../src/components/vendor/ListingTracker'

const day = n => new Date(Date.now() - n * 864e5).toISOString()

const ONE = [
  { id: 1, name: 'Candid photography', review_status: 'under_review', created_at: day(0.02) },
]

const FEW = [
  { id: 1, name: 'Catering', review_status: 'live', is_active: true, reviewed_at: day(2) },
  { id: 2, name: 'Welcome drinks', review_status: 'under_review', created_at: day(1) },
  { id: 3, name: 'Live food counters', review_status: 'rejected', reviewed_at: day(1),
    review_note: 'Your counter list says “live dosa” but the price is per plate. Tell us which.' },
]

const MANY = [
  ...FEW,
  { id: 4, name: 'Cook at your place', review_status: 'live', is_active: true, reviewed_at: day(9) },
  { id: 5, name: 'Sweets & mithai', review_status: 'live', is_active: false, reviewed_at: day(30) },
  { id: 6, name: 'Customised menu', review_status: 'under_review', created_at: day(0.3) },
  { id: 7, name: 'Dessert counter', review_status: 'live', is_active: true, reviewed_at: day(70) },
]

function Case({ label, services }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{label}</p>
      <ListingTracker services={services} onOpenJobs={() => {}} />
    </section>
  )
}

export default function TrackerScenes() {
  return (
    <div id="tracker" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Case label="One listing" services={ONE} />
      <Case label="Three — all shown" services={FEW} />
      <Case label="Seven — folded, but not the one waiting on them" services={MANY} />
    </div>
  )
}
