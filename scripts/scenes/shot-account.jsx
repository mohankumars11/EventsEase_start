import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthContext } from '../../src/context/AuthContext'
import PartnerAccount from '../../src/components/vendor/PartnerAccount'

const VENDOR = {
  id: '00000000-0000-0000-0000-000000000000',
  business_name: 'Sri Lakshmi Decorators',
  category: 'Decoration & Floral',
  area: 'Jayanagar', city: 'Bengaluru', pincode: '560041',
  status: 'PENDING_REVIEW', is_verified: false, verification_status: 'draft',
  service_radius_km: 15, daily_capacity: 2,
  subscription_plan: null, contact_phone: '', whatsapp_phone: '',
  website_url: '', instagram_url: '',
}

export default function ShotAccount() {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={{
        user: { id: 'shot' }, profile: { full_name: 'Ramesh Kumar' },
        fetchProfile: async () => {},
      }}>
        <ToastProvider>
          <div style={{ padding: 12, background: '#faf8f5' }}>
            <PartnerAccount
              vendor={VENDOR}
              profile={{ full_name: 'Ramesh Kumar' }}
              onUpdateVendor={async () => {}}
              onSignOut={() => {}}
            />
          </div>
        </ToastProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
