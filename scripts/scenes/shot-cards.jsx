import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import VendorServiceList from '../../src/components/vendor/VendorServiceList'

const ago = h => new Date(Date.now() - h * 3600e3).toISOString()
const noop = () => {}

const THREE = [
  { id: 'a', name: 'Wedding stage & backdrop', category: 'Decoration & Floral',
    price: 28000, unit: 'per event', min_quantity: 1, lead_time_days: 3,
    is_active: true, review_status: 'live', reviewed_at: ago(30), created_at: ago(50),
    description: 'Full floral backdrop, drapes and couple seating.' },
  { id: 'b', name: 'Vehicle decoration', category: 'Decoration & Floral',
    price: 4500, unit: 'per event', min_quantity: 1, lead_time_days: 1,
    is_active: true, review_status: 'under_review', created_at: ago(6),
    description: 'Fresh flowers, ribbons and a name plate.' },
  { id: 'c', name: 'Mandap setup', category: 'Decoration & Floral',
    price: 62000, unit: 'per event', min_quantity: 1, lead_time_days: 7,
    is_active: false, review_status: 'rejected', reviewed_at: ago(2), created_at: ago(20),
    review_note: 'Add a photograph of a mandap you have actually built — the two on the listing are stock images.',
    description: 'Six pillar mandap with homa space.' },
]

export default function ShotCards() {
  return (
    <MemoryRouter><ToastProvider>
      <div style={{ padding: 14, background: '#faf8f5' }}>
        <VendorServiceList
          vendor={{ id: 'v', category: 'Decoration & Floral' }}
          services={THREE}
          onAdd={noop} onUpdate={noop} onRemove={noop}
          onOpenCalendar={noop} onOpenJobs={noop}
        />
      </div>
    </ToastProvider></MemoryRouter>
  )
}
