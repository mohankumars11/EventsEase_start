import React from 'react'
import PackageCarousel from '../../src/components/vendor/packages/PackageCarousel'

const TIERED = [
  { key: 'ESSENTIAL', name: 'Essential', ratePaise: 175000, unit: 'per event', meta: '2 hours',
    inclusions: [{ id: 'a', label: 'Custom script writing & research', included: true },
                 { id: 'b', label: 'Pre-event planning call', included: false }] },
  { key: 'SIGNATURE', name: 'Signature', ratePaise: 175000, unit: 'per event', meta: '4 hours', badge: 'Most popular',
    inclusions: [{ id: 'a', label: 'Custom script writing & research', included: true },
                 { id: 'b', label: 'Pre-event planning call', included: true }] },
  { key: 'VIP', name: 'VIP', ratePaise: 600000, unit: 'per event', meta: '6 hours', edited: true,
    inclusions: [{ id: 'a', label: 'Custom script writing & research', included: true },
                 { id: 'b', label: 'Pre-event planning call', included: true }] },
]
const PRICING_TAB = TIERED.map((p, i) => ({ ...p, badge: undefined, edited: false,
  status: ['Live', 'In review', 'Action needed'][i], inclusions: undefined }))

export default function PackageParity() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 12, background: '#fbfaff' }}>
      <p style={{ font: '800 13px system-ui', margin: '8px 4px' }}>Onboarding — editable</p>
      <PackageCarousel packages={TIERED} editable onEdit={() => {}} onReset={() => {}} />
      <p style={{ font: '800 13px system-ui', margin: '24px 4px 8px' }}>Pricing tab — status + details</p>
      <PackageCarousel packages={PRICING_TAB} onViewDetails={() => {}} />
      <p data-ready style={{ font: '700 11px system-ui', color: '#888', marginTop: 16 }}>rendered</p>
    </div>
  )
}
