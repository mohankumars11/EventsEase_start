/** The growth carousel, all three cards laid out flat for inspection. */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerGrowthCarousel from '../../src/components/partner/PartnerGrowthCarousel'
export default function Scene() {
  return (
    <MemoryRouter>
      <div style={{ width: 430, margin: '0 auto', padding: 14, background: '#fff' }}>
        <PartnerGrowthCarousel onGrow={() => {}} onInvite={() => {}} onProfile={() => {}} />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </MemoryRouter>
  )
}
