/**
 * The 33-trade Pricing Control Center, against one trade's real shape.
 *
 * PostgREST is stubbed at the scene level so the component under test is
 * the real TradePricing, unmodified. The fixture is photography's
 * actual stored shape (profile / answers / booking_rules / travel_rules
 * read off the live database), so what renders here is what a
 * photographer sees.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import TradePricing from '../../src/components/vendor/pricing/TradePricing'

const VERSION = {
  id: 'v1', version: 1, status: 'UNDER_REVIEW', trade_id: 'photography',
  seasonal_window_id: null, published_at: null, price_locked_until: null, review_note: null,
  profile: {
    display_name: 'Lens & Light Studio',
    bio: 'Candid and traditional wedding photography across Karnataka.',
    events: ['weddings', 'engagements', 'receptions', 'corporate_events'],
  },
  answers: { years: 6, service_radius_km: 120, team: 3, events_per_day: 2 },
  booking_rules: {
    instant: true, custom_quotes: true, quote_hours: 4,
    advance_pct: 100, cancellation: 'flexible', min_notice_days: 3, horizon_months: 6,
    charges: [{ id: 'overtime_per_hour', role: 'overtime', label: 'Overtime per hour', take_home_paise: 150000 }],
  },
  travel_rules: { model: 'included_radius', scope: '120' },
}

const RULES = [
  { id: 'r1', rule_kind: 'per_hour', label: null, unit: 'per_hour', take_home_paise: 500000, included_hours: 4, min_qty: 4, max_qty: 12 },
  { id: 'r2', rule_kind: 'per_event', label: 'Full day', unit: 'per_event', take_home_paise: 3500000, included_hours: 10 },
]
const ADDONS = [
  { id: 'a1', label: 'Second photographer', unit: 'per_event', take_home_paise: 800000, included_in: ['Signature', 'VIP'] },
  { id: 'a2', label: 'Same-day highlight reel', unit: 'per_event', take_home_paise: 1200000, included_in: [] },
]
const PACKAGES = [
  { id: 'p1', name: 'Essential', status: 'LIVE', trade_inputs: { take_home_paise: 2500000, duration_hours: 6 }, commercial_inputs: {} },
  { id: 'p2', name: 'Signature', status: 'UNDER_REVIEW', trade_inputs: { take_home_paise: 4375000, duration_hours: 10 }, commercial_inputs: {} },
]
const READINESS = {
  state: 'PRICING_UNDER_REVIEW', quotes_ok: true,
  items: [
    { id: 'profile', label: 'Identity verified', status: 'pass', next: '' },
    { id: 'pricing', label: 'Pricing approved', status: 'pending', next: 'Our team is reviewing your listing.' },
    { id: 'payout', label: 'Razorpay payout account', status: 'fail', next: 'Complete your payout setup so Razorpay can pay you.' },
  ],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  if (u.includes('sambramo_listing_versions')) return json([VERSION])
  if (u.includes('sambramo_rate_rules')) return json(RULES)
  if (u.includes('sambramo_addon_rules')) return json(ADDONS)
  if (u.includes('sambramo_trade_packages')) return json(PACKAGES)
  if (u.includes('sambramo_catalogue_items')) return json([])
  if (u.includes('sambramo_seasonal_windows')) return json([])
  if (u.includes('rpc/listing_readiness')) return json(READINESS)
  if (u.includes('/rest/v1/')) return json([])
  return real(input, init)
}

export default function TradePricingParity() {
  return (
    <MemoryRouter><ToastProvider>
      <div style={{ width: 390, margin: '0 auto', padding: 12, background: '#fbfaff' }}>
        <TradePricing
          service={{ id: 's1', name: 'Wedding photography', category: 'Photography' }}
          vendor={{ id: 'v', business_name: 'Lens & Light Studio', area: 'Jayanagar', city: 'Bengaluru' }}
          onEdit={() => {}}
          onOpenPayout={() => {}}
        />
        <p data-ready style={{ font: '700 11px system-ui', color: '#999', paddingTop: 10 }}>rendered</p>
      </div>
    </ToastProvider></MemoryRouter>
  )
}
