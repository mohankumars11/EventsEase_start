/** The Jobs tab header: wordmark, greeting, name, online toggle. */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import JobsHeader from '../../src/components/partner/JobsHeader'

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

export default function Scene() {
  const name = new URLSearchParams(window.location.search).get('name') || 'Eagle Photography'
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '8px 16px', background: '#fff' }}>
        <JobsHeader businessName={name} fullName="Mohan Kumar" vendorId="v1"
          avatarUrl={null} acceptingJobs unreadAlerts={2}
          onAcceptingChange={() => {}} onOpenProfile={() => {}} onOpenAlerts={() => {}} />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
