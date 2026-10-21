/**
 * Edit listing must reach the questionnaire, not bounce to Pricing.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPRODUCES
 * ══════════════════════════════════════════════════════════════════════
 *
 * VendorServiceList deletes ?edit= the instant it opens the flow, so a
 * redirect that tested the parameter fired one render later and threw
 * the partner out to Pricing. This mounts the real component with the
 * parameter, lets it be consumed, and then asks what is on screen.
 */
import React from 'react'
import { MemoryRouter, Routes, Route, useSearchParams, Navigate } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import VendorServiceList from '../../src/components/vendor/VendorServiceList'

const SERVICES = [
  { id: 'svc-1', name: 'Wedding day coverage', category: 'Photography', price: 20000, unit: 'per event', is_active: true, review_status: 'under_review', specs: {} },
]
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/rpc/')) return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  if (u.includes('/rest/v1/')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

/* The dashboard's own rule, copied verbatim so the test exercises the
   decision rather than a paraphrase of it. */
function ListRoute() {
  const [params, setParams] = useSearchParams()
  const [listFlowOpen, setListFlowOpen] = React.useState(
    () => !!(params.get('start') || params.get('edit')))
  React.useEffect(() => {
    if (params.get('start') || params.get('edit')) setListFlowOpen(true)
  }, [params])

  if (!listFlowOpen) return <Navigate to="/pricing" replace />
  return (
    <VendorServiceList
      flowOnly
      onFlowDone={() => setListFlowOpen(false)}
      vendor={{ id: 'v1' }}
      services={SERVICES}
      onAdd={async () => ({ id: 'svc-2' })}
      onUpdate={async () => {}}
      onRemove={async () => {}}
      editListing={params.get('edit')}
      onEditConsumed={() => setParams(p => { const n = new URLSearchParams(p); n.delete('edit'); return n }, { replace: true })}
      startTrade={params.get('start')}
      onStartConsumed={() => setParams(p => { const n = new URLSearchParams(p); n.delete('start'); return n }, { replace: true })}
    />
  )
}

export default function Scene() {
  const edit = new URLSearchParams(window.location.search).get('edit') ?? 'svc-1'
  return (
    <MemoryRouter initialEntries={[`/list?tab=list&edit=${edit}`]}>
      <AuthProvider><ToastProvider>
        <div style={{ maxWidth: 430, margin: '0 auto', background: '#f6f5fa', minHeight: 400 }}>
          <Routes>
            <Route path="/list" element={<ListRoute />} />
            <Route path="/pricing" element={<p data-landed="pricing" style={{ padding: 16, font: '700 14px system-ui' }}>PRICING TAB — the bug</p>} />
          </Routes>
          <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
        </div>
      </ToastProvider></AuthProvider>
    </MemoryRouter>
  )
}
