/**
 * Payments & revenue with the live shape of the data: two cancelled
 * booking lines, no escrow, no payout claims.
 *
 * The tiles that matter here are the ones that refuse to print a
 * number. "Payouts settled" over an empty payout_claims table is not
 * zero rupees paid — it is unmeasurable — and the screen has to say
 * which of those it means.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import RevenueConsole from '../../src/components/admin/RevenueConsole'

const LINES = [
  { status: 'cancelled', quoted_amount_paise: 1850000, partner_amount_paise: 1850000, platform_fee_paise: 0, paid_at: null, settled_at: null },
  { status: 'cancelled', quoted_amount_paise: 16250000, partner_amount_paise: 16250000, platform_fee_paise: 0, paid_at: null, settled_at: null },
]
const COUNTS = { escrow_ledger: 0, payout_claims: 0 }

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const t = m[1]
    if ((init?.method ?? 'GET') === 'HEAD') {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-0/${COUNTS[t] ?? 0}` } })
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
      <AdminShell activeNav="revenue" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <RevenueConsole />
      </AdminShell>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
