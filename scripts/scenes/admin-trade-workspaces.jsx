/**
 * Trade workspaces, with both halves of the truth on screen: a typed
 * profile row filling its own columns, and a legacy listing whose
 * answers predate the questionnaire and cannot fit them.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import TradeWorkspaces from '../../src/components/admin/TradeWorkspaces'

const now = new Date().toISOString()
const TABLES = {
  sambramo_trade_registry: [
    { id: 'bar_beverages', name: 'Bar & Beverages' },
    { id: 'catering_food', name: 'Catering & Food' },
    { id: 'videography', name: 'Videography' },
  ],
  partner_bar_beverages_profiles: [
    { id: 'p1', vendor_id: '11111111-1111-4111-8111-111111111111', service_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      display_name: 'Coastal Bar Co.', beverage_types: ['Mocktails', 'Tea and coffee'], supply_scope: 'Drinks, staff and equipment',
      events: ['Weddings', 'Corporate events'], guests_per_hour: 300, mobile_bar: true, bar_stations: 3, bartenders: 6,
      glassware_included: true, ice_included: true, garnish_included: false, setup_teardown_included: true,
      needs_water_power: true, updated_at: now },
  ],
  vendor_services: [
    { id: 'bbbbbbbb-2222-4222-8222-222222222222', vendor_id: '22222222-2222-4222-8222-222222222222',
      name: 'Bar service — old submission', category: 'Bar & Beverages', review_status: 'under_review', updated_at: now,
      specs: { 'bar:stations': 2, 'bar:staff': 4, 'ops:trust:years': 6, 'drinks:kind': ['mocktails'], legacy_notes: 'from v2 form' } },
  ],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    let rows = TABLES[m[1]] ?? []
    if (m[1] === 'sambramo_trade_registry' && /id=eq\.([a-z_]+)/.test(u)) {
      const want = /id=eq\.([a-z_]+)/.exec(u)[1]
      rows = rows.filter(r => r.id === want)
    }
    return new Response(JSON.stringify(rows), {
      status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` },
    })
  }
  return real(input, init)
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav="trade-workspaces" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <TradeWorkspaces />
      </AdminShell>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
