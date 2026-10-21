/** The story rail: are the names readable and is the ring alive? */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import PartnerStories from '../../src/components/partner/PartnerStories'

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: 12, background: '#fff' }}>
        <PartnerStories />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
