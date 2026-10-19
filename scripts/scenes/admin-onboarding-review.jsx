/**
 * The onboarding review, exercising all four answer states at once:
 * answered, required-but-missing, skipped-optional, and never-asked.
 *
 * The never-asked case is the one worth photographing. `supply_scope_
 * custom` only appears when supply_scope is "Custom combination"; this
 * partner chose "Drinks, staff and equipment", so the question was
 * never put to them. Marking it missing would send a revision request
 * for something the form hid.
 */
import React, { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'
import OnboardingReview from '../../src/components/admin/OnboardingReview'

const now = new Date().toISOString()
const VENDOR = {
  id: '11111111-1111-4111-8111-111111111111', business_name: 'Coastal Bar Co.',
  partner_code: 'SBM-BAR-0007', category: 'Bar & Beverages', city: 'Bengaluru',
  verification_status: 'submitted', submitted_at: now, review_due_at: now,
}

const TABLES = {
  sambramo_trade_registry: [{ id: 'bar_beverages', name: 'Bar & Beverages' }],
  vendors: [VENDOR],
  vendor_services: [{ id: 's1', name: 'Bar service', category: 'Bar & Beverages', specs: {}, review_status: 'under_review', updated_at: now }],
  partner_bar_beverages_profiles: [{
    id: 'p1', vendor_id: VENDOR.id, service_id: 's1', trade_id: 'bar_beverages',
    display_name: 'Coastal Bar Co.',
    beverage_types: ['Mocktails', 'Tea and coffee', 'Juice and soft drinks'],
    supply_scope: 'Drinks, staff and equipment',
    supply_scope_custom: null,
    events: ['Weddings', 'Corporate events'],
    guests_per_hour: 300,
    mobile_bar: true, bar_stations: 3, bartenders: null,
    glassware_included: true, ice_included: false, garnish_included: null,
    setup_teardown_included: true, needs_water_power: true,
    updated_at: now,
  }],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    const rows = TABLES[m[1]] ?? []
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
      const b = Array.from(document.querySelectorAll('button')).find(x => /Coastal Bar Co\./.test(x.textContent || ''))
      if (!b) return
      clearInterval(t)
      b.click()
      setTimeout(() => { if (!dead) setReady(true) }, 900)
    }, 150)
    return () => { dead = true; clearInterval(t) }
  }, [])
  return ready ? <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p> : null
}

export default function Scene() {
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav="onboarding-review" onNavigate={() => {}} badges={{}}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <OnboardingReview />
      </AdminShell>
      <Driver />
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
