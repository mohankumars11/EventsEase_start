import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import VendorOnboarding from '../../src/pages/onboarding/VendorOnboarding'

export default function ShotOnboarding() {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'shot' }, profile: null }}>
        <VendorOnboarding />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
