import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import TermsGate from '../../src/components/vendor/TermsGate'

export default function ShotTerms() {
  return (
    <MemoryRouter>
      <TermsGate vendorId="00000000-0000-0000-0000-000000000000" onAccepted={() => {}} />
    </MemoryRouter>
  )
}
