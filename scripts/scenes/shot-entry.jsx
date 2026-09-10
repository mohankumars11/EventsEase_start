import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import PartnerEntry from '../../src/pages/partner/PartnerEntry'

/**
 * The partner app's front door, photographed signed-out.
 *
 * The context is a stub with the three auth calls the screen destructures.
 * They are never invoked in a shot — nothing is clicked — but leaving them
 * undefined would mean the screenshot passes while a real tap throws, and
 * a picture that cannot be trusted is worse than no picture.
 */
const stub = {
  user: null,
  profile: null,
  loading: false,
  sendEmailOtp: async () => {},
  verifyEmailOtp: async () => ({}),
  signInWithGoogle: async () => {},
}

export default function ShotEntry() {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={stub}>
        <PartnerEntry />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
