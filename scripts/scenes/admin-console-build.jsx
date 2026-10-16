/**
 * The admin console as built on feature/admin-partner-customer-lifecycle.
 *
 * PostgREST is stubbed at the scene level so the components under test
 * are the real ExecutiveOverview and PartnerConsole, unmodified. The
 * row shapes follow the live tables, and the counts are deliberately
 * small and plausible rather than impressive — a screenshot that
 * invents a thousand partners is a screenshot nobody can trust.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import AdminShell from '../../src/components/admin/AdminShell'
import ExecutiveOverview from '../../src/components/admin/ExecutiveOverview'

const iso = d => new Date(Date.now() - d * 864e5).toISOString()

const VENDORS = [
  { id: 'v1', business_name: 'Lens & Light Studio', city: 'Bengaluru', area: 'Jayanagar', created_at: iso(30), is_verified: true, verification_status: 'verified', accepting_jobs: true, is_synthetic: false },
  { id: 'v2', business_name: 'Annapoorna Caterers', city: 'Mysuru', area: 'Gokulam', created_at: iso(12), is_verified: false, verification_status: 'submitted', accepting_jobs: false, is_synthetic: false },
  { id: 'v3', business_name: 'Jai Decor & Florals', city: 'Mysuru', area: 'Gayathripuram', created_at: iso(6), is_verified: false, verification_status: 'submitted', accepting_jobs: false, is_synthetic: false },
  { id: 'v4', business_name: 'Beat Drop DJs', city: 'Bengaluru', area: 'Indiranagar', created_at: iso(3), is_verified: false, verification_status: 'draft', accepting_jobs: false, is_synthetic: false },
  { id: 'v5', business_name: 'Sugar & Spice', city: 'Mysuru', area: 'Vijayanagar', created_at: iso(1), is_verified: false, verification_status: 'draft', accepting_jobs: false, is_synthetic: false },
]

const TABLES = {
  vendors: VENDORS,
  vendor_services: [
    { id: 's1', vendor_id: 'v1', category: 'Photography', review_status: 'live', is_active: true },
    { id: 's2', vendor_id: 'v2', category: 'Catering & Food', review_status: 'under_review', is_active: true },
    { id: 's3', vendor_id: 'v3', category: 'Decoration & Floral', review_status: 'under_review', is_active: true },
    { id: 's4', vendor_id: 'v4', category: 'DJ & Music', review_status: 'draft', is_active: false },
  ],
  vendor_documents: [
    { id: 'd1', vendor_id: 'v1', kind: 'pan', status: 'accepted' },
    { id: 'd2', vendor_id: 'v2', kind: 'fssai', status: 'pending' },
    { id: 'd3', vendor_id: 'v3', kind: 'aadhaar', status: 'pending' },
  ],
  vendor_payout_details: [{ id: 'p1', vendor_id: 'v1', method: 'bank' }],
  partner_payout_accounts: [{ id: 'pa1', vendor_id: 'v1', route_status: 'activated' }],
  sambramo_trade_packages: [
    { id: 'tp1', status: 'UNDER_REVIEW' }, { id: 'tp2', status: 'UNDER_REVIEW' }, { id: 'tp3', status: 'LIVE' },
  ],
  sambramo_catering_packages: [{ id: 'cp1', status: 'ACTION_REQUIRED' }],
  booking_lines: [
    { id: 'b1', status: 'paid', quoted_amount_paise: 2500000 },
    { id: 'b2', status: 'accepted', quoted_amount_paise: 1800000 },
  ],
  dispatch_offers: [{ id: 'o1', status: 'OFFERED' }, { id: 'o2', status: 'ACCEPTED' }],
  payout_claims: [{ id: 'c1', status: 'requested', amount_paise: 2300000 }],
  partner_referrals: [{ id: 'r1', status: 'registered' }, { id: 'r2', status: 'invited' }],
  partner_work: [{ id: 'w1', vendor_id: 'v1', review_status: 'live' }],
  partner_listings: [],
  partner_events: [],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const rows = TABLES[m[1]] ?? []
    const headers = { 'content-type': 'application/json' }
    /* head:true + count=exact asks for a count, not rows: the server
       answers with content-range and an empty body. Getting this wrong
       makes every KPI render zero. */
    if ((init?.method ?? 'GET') === 'HEAD' || /count=exact/.test(init?.headers?.Prefer ?? '')) {
      return new Response('[]', { status: 200, headers: { ...headers, 'content-range': `0-0/${rows.length}` } })
    }
    return new Response(JSON.stringify(rows), { status: 200, headers: { ...headers, 'content-range': `0-${rows.length}/${rows.length}` } })
  }
  if (u.includes('/rest/v1/rpc/')) return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  return real(input, init)
}

export default function AdminConsoleBuild() {
  return (
    <MemoryRouter><ToastProvider>
      <AdminShell
        activeNav="overview"
        onNavigate={() => {}}
        badges={{ vendors: 2, pricing: 3 }}
        profile={{ full_name: 'Mohan', role: 'admin' }}
        onRefresh={() => {}}
        refreshing={false}
      >
        <ExecutiveOverview onNavigate={() => {}} />
      </AdminShell>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
    </ToastProvider></MemoryRouter>
  )
}
