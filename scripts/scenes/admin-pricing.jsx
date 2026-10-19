/**
 * Pricing & packages against the live shape: real package states, and a
 * review panel that offers a decision rather than a price field.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import PricingConsole from '../../src/components/admin/PricingConsole'

const now = new Date().toISOString()
const PKGS = [
  { id: 'pk1', vendor_id: 'v1', name: 'Signature', description: 'Two-hour anchoring with a co-host',
    status: 'UNDER_REVIEW', source: 'partner', revision_round: 1, submitted_at: now,
    commercial_inputs: { base_rate_paise: 1800000, overtime_rate_paise: 450000, travel_included_km: 25 },
    trade_inputs: { languages: 'Kannada, English', hours: 2, co_host: true },
    calculation_snapshot: { customer_price_paise: 1800000, platform_fee_paise: 0, partner_take_paise: 1800000 },
    price_locked_until: null, review_note: null },
  { id: 'pk2', vendor_id: 'v2', name: 'VIP', description: 'Full-day hosting',
    status: 'UNDER_REVIEW', source: 'partner', revision_round: 2, submitted_at: now,
    commercial_inputs: { base_rate_paise: 4500000 }, trade_inputs: { hours: 8 },
    calculation_snapshot: null, price_locked_until: null, review_note: 'Previous round: overtime rate missing' },
]
const VENDORS = [
  { id: 'v1', business_name: 'Mythri Events', category: 'Anchor & MC' },
  { id: 'v2', business_name: 'Stage Right', category: 'Anchor & MC' },
]

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const rows = m[1] === 'sambramo_trade_packages' ? PKGS : m[1] === 'vendors' ? VENDORS : []
    return new Response(JSON.stringify(rows), {
      status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  return real(input, init)
}

function Driver() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let dead = false
    const t = setInterval(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent || '').trim() === 'Review')
      if (!b) return
      clearInterval(t); b.click()
      setTimeout(() => { if (!dead) setReady(true) }, 700)
    }, 150)
    return () => { dead = true; clearInterval(t) }
  }, [])
  return ready ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p> : null
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav="pricing-packages" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <PricingConsole />
      </AdminShell>
      <Driver />
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
