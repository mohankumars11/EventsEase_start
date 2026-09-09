import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import PartnerLanding from '../../src/pages/partner/PartnerLanding'

export default function ShotLanding() {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={{
        user: null, profile: null, signInWithGoogle: async () => {},
      }}>
        <PartnerLanding />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
