/** The Pricing & Listings screen, for measuring how tall it is. */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import PricingTab from '../../src/components/vendor/pricing/PricingTab'

const SERVICES = [
  { id: 's1', name: 'Wedding day coverage', category: 'Photography', price: 20000, unit: 'per event', is_active: true, review_status: 'under_review' },
  { id: 's2', name: 'Hall booking', category: 'Venue', price: 25000, unit: 'per event', is_active: true, review_status: 'under_review' },
  { id: 's3', name: 'Mandap florals', category: 'Decoration & Floral', price: 15000, unit: 'per event', is_active: true, review_status: 'live' },
]
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/rpc/')) return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 430, margin: '0 auto', background: '#f6f5fa' }}>
        <PricingTab vendor={{ id: 'v1', business_name: 'Eagle Photography' }} services={SERVICES} />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
