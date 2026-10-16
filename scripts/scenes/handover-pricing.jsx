import React from 'react'
import PackageCarousel from '../../src/components/vendor/packages/PackageCarousel'

const ONBOARDING = [
  { key: 'ESSENTIAL', name: 'Essential', ratePaise: 100000, unit: 'per event', meta: '2 hours',
    base: '2 hours of hosting', inclusions: [] },
  { key: 'SIGNATURE', name: 'Signature', ratePaise: 175000, unit: 'per event', meta: '4 hours',
    badge: 'Most popular', base: '4 hours of hosting',
    inclusions: [{ id: 'a', label: 'Custom script writing', included: true },
                 { id: 'b', label: 'Pre-event planning call', included: true },
                 { id: 'c', label: 'Wireless mic', included: false }] },
  { key: 'VIP', name: 'VIP', ratePaise: 600000, unit: 'per event', meta: '6 hours', edited: true,
    base: '6 hours of hosting',
    inclusions: [{ id: 'a', label: 'Custom script writing', included: true },
                 { id: 'b', label: 'Pre-event planning call', included: true },
                 { id: 'c', label: 'Wireless mic', included: true }] },
]
const PRICING = ONBOARDING.map((p, i) => ({ ...p, badge: undefined, edited: false,
  status: ['Live', 'In review', 'Action needed'][i] }))

const H = t => <p style={{ font: '800 12px system-ui', letterSpacing: '.1em',
  textTransform: 'uppercase', color: '#8b8299', margin: '18px 4px 2px' }}>{t}</p>

export default function HandoverPricing() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 12, background: '#fbfaff' }}>
      {H('Onboarding — packages step')}
      <PackageCarousel packages={ONBOARDING} editable onEdit={() => {}} onReset={() => {}} startIndex={0} />
      {H('Pricing tab — same card, status chips')}
      <PackageCarousel packages={PRICING} onViewDetails={() => {}} startIndex={1} />
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', paddingTop: 10 }}>rendered</p>
    </div>
  )
}
