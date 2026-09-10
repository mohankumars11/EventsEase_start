import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import PartnerConsole from '../../src/components/admin/PartnerConsole'

/**
 * The partner console, mounted for real.
 *
 * It fetches with the browser's anon key and no session, so what appears
 * here is whatever `vendors` RLS grants a signed-out reader — which is
 * the point of the shot: it proves the console RENDERS and degrades
 * honestly rather than throwing. What an operator sees with their own
 * JWT is more, never less.
 */
export default function ShotAdminPartner() {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'shot' }, profile: { role: 'admin' }, loading: false }}>
        <div className="bg-[#FCFAFF] p-4">
          <PartnerConsole />
        </div>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
