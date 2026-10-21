/** The three intro cards, with routes that report where a tap went. */
import React from 'react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import PartnerOnboarding from '../../src/pages/partner/PartnerOnboarding'
function Landed() { const l = useLocation(); return <p data-landed={l.pathname} style={{ padding: 20 }}>LANDED {l.pathname}</p> }
export default function Scene() {
  return (
    <MemoryRouter initialEntries={['/partner/onboarding']}>
      <div style={{ width: 412, height: 890, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
        <Routes>
          <Route path="/partner/onboarding" element={<PartnerOnboarding />} />
          <Route path="*" element={<Landed />} />
        </Routes>
        <p data-ready style={{ position: 'absolute', bottom: 0, font: '700 9px system-ui', color: '#fff' }}>rendered</p>
      </div>
    </MemoryRouter>
  )
}
