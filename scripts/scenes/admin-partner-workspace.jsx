/**
 * The partner review panel at desktop width.
 *
 * It used to be `max-w-lg` — a 512px column pinned right, with three
 * quarters of a 1920px screen dimmed behind it, holding every document,
 * package, payout and audit row a reviewer needs. This shot exists to
 * prove the panel now uses the workspace, and to keep proving it.
 *
 * The console is stubbed by table name so the panel opens with a
 * partner that has documents, listings and money attached.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import PartnerConsole from '../../src/components/admin/PartnerConsole'

const now = new Date().toISOString()
const VENDOR = {
  id: '11111111-1111-4111-8111-111111111111',
  business_name: 'Annapoorna Caterers',
  partner_code: 'SBM-CAT-0041',
  city: 'Mysuru', area: 'Gokulam', pincode: '570002',
  verification_status: 'submitted', is_verified: false,
  accepting_jobs: false, is_synthetic: false, created_at: now,
}

const TABLES = {
  vendors: [VENDOR],
  vendor_services: [
    { id: 's1', vendor_id: VENDOR.id, name: 'Wedding catering', category: 'Catering & Food',
      review_status: 'under_review', is_active: true, price: 650, unit: 'per guest', created_at: now },
  ],
  vendor_documents: [
    { id: 'd1', vendor_id: VENDOR.id, kind: 'fssai', status: 'pending', file_name: 'fssai-licence.pdf', created_at: now },
    { id: 'd2', vendor_id: VENDOR.id, kind: 'pan', status: 'accepted', file_name: 'pan.jpg', created_at: now },
  ],
  vendor_payout_details: [{ id: 'p1', vendor_id: VENDOR.id, method: 'bank' }],
  partner_payout_accounts: [{ id: 'pa1', vendor_id: VENDOR.id, route_status: 'activated' }],
  booking_lines: [{ id: 'b1', vendor_id: VENDOR.id, status: 'paid', quoted_amount_paise: 4500000, created_at: now }],
  partner_work: [{ id: 'w1', vendor_id: VENDOR.id, review_status: 'live' }],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const rows = TABLES[m[1]] ?? []
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  if (u.includes('/rest/v1/rpc/')) return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

function Driver() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let dead = false
    /* The console opens on Overview; the partner rows live under the
       registry tab, so the tab has to be clicked before the row exists. */
    let stage = 'tab'
    const t = setInterval(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      if (stage === 'tab') {
        const tab = btns.find(b => /Partner registry/.test(b.textContent || ''))
        if (!tab) return
        tab.click(); stage = 'row'; return
      }
      const row = btns.find(b => /Annapoorna Caterers/.test(b.textContent || ''))
      if (!row) return
      clearInterval(t)
      row.click()
      setTimeout(() => { if (!dead) setReady(true) }, 900)
    }, 180)
    return () => { dead = true; clearInterval(t) }
  }, [])
  return ready
    ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 4 }}>rendered</p>
    : null
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell
        activeNav="partners" onNavigate={() => {}} badges={{ vendors: 1, pricing: 0 }}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}
      >
        <PartnerConsole />
      </AdminShell>
      <Driver />
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
