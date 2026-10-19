/**
 * Bookings & orders, against counts that match the live database.
 *
 * The point of this shot is the empty state. bookings=0, escrow=0,
 * payout_claims=0 and two cancelled booking lines is the real shape of
 * this marketplace today, and the screen has to say that rather than
 * draw a funnel over nothing.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import OrdersConsole from '../../src/components/admin/OrdersConsole'

const now = new Date().toISOString()
const LINES = [
  { id: 'aaaaaaaa-1111-4111-8111-111111111111', service_name: 'Anchor for sangeet', trade: 'Anchor & MC',
    status: 'cancelled', quoted_amount_paise: 1850000, partner_amount_paise: 1850000, platform_fee_paise: 0,
    platform_fee_rate: 0, price_basis: 'instant', pricing_state: 'final',
    created_at: now, dispatched_at: now, accepted_at: null, paid_at: null, delivered_at: null,
    settled_at: null, cancelled_at: now, cancellation_reason: 'Customer changed the date' },
  { id: 'bbbbbbbb-2222-4222-8222-222222222222', service_name: 'Catering — 250 guests', trade: 'Catering & Food',
    status: 'cancelled', quoted_amount_paise: 16250000, partner_amount_paise: 16250000, platform_fee_paise: 0,
    platform_fee_rate: 0, price_basis: 'quote', pricing_state: 'final',
    created_at: now, dispatched_at: now, accepted_at: null, paid_at: null, delivered_at: null,
    settled_at: null, cancelled_at: now, cancellation_reason: null },
]
const COUNTS = { bookings: 0, booking_lines: 2, escrow_ledger: 0, payout_claims: 0 }

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const t = m[1]
    const isHead = (init?.method ?? 'GET') === 'HEAD'
    if (isHead) {
      const n = COUNTS[t] ?? 0
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-0/${n}` } })
    }
    const rows = t === 'booking_lines' ? LINES : []
    return new Response(JSON.stringify(rows), {
      status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  return real(input, init)
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav="orders" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <OrdersConsole />
      </AdminShell>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
