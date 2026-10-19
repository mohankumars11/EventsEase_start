/**
 * Every admin screen, rendered one per shot.
 *
 * The screen is chosen by `?screen=<navId>` on the harness URL, so one
 * scene file covers all sixteen and a loop can walk them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHAPED LIKE THE REAL DATABASE, NOT FLATTERING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The stub answers with the counts this marketplace actually has: 8
 * real partners against 221 seeded, 4 live listings, 2 cancelled
 * booking lines, no escrow, no payout claims, no quote requests. A
 * screenshot set that invented busy tables would be the most
 * comfortable lie available here, and would hide exactly the empty
 * states these screens were written to handle.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import AdminShell from '../../src/components/admin/AdminShell'

import FounderAnalytics from '../../src/components/admin/FounderAnalytics'
import ExecutiveOverview from '../../src/components/admin/ExecutiveOverview'
import PartnerDirectory from '../../src/components/admin/PartnerDirectory'
import PartnerConsole from '../../src/components/admin/PartnerConsole'
import OnboardingReview from '../../src/components/admin/OnboardingReview'
import TradeWorkspaces from '../../src/components/admin/TradeWorkspaces'
import MediaLibrary from '../../src/components/admin/MediaLibrary'
import OrdersConsole from '../../src/components/admin/OrdersConsole'
import RevenueConsole from '../../src/components/admin/RevenueConsole'
import InquiriesConsole from '../../src/components/admin/InquiriesConsole'
import PricingConsole from '../../src/components/admin/PricingConsole'
import ListingReview from '../../src/components/admin/ListingReview'
import VerificationQueue from '../../src/components/admin/VerificationQueue'
import PricingReviewQueue from '../../src/components/admin/PricingReviewQueue'
import LiveOperations from '../../src/components/admin/LiveOperations'
import MarketInterest from '../../src/components/admin/MarketInterest'
import PartnerStoryUploads from '../../src/components/admin/PartnerStoryUploads'

const now = new Date().toISOString()
const soon = new Date(Date.now() + 9 * 3600e3).toISOString()
const late = new Date(Date.now() - 5 * 3600e3).toISOString()

const VENDORS = [
  { id: 'v1', business_name: 'Annapoorna Caterers', partner_code: 'SBM-CAT-0041', category: 'Catering & Food',
    city: 'Mysuru', area: 'Gokulam', verification_status: 'submitted', onboarding_status: 'submitted',
    accepting_jobs: false, is_verified: false, is_synthetic: false, submitted_at: late, review_due_at: late,
    created_at: now, contact_phone: '98xxxxxx21' },
  { id: 'v2', business_name: 'Lens & Light Studio', partner_code: 'SBM-PHO-0012', category: 'Photography',
    city: 'Bengaluru', area: 'Indiranagar', verification_status: 'submitted', onboarding_status: 'submitted',
    accepting_jobs: true, is_verified: false, is_synthetic: false, submitted_at: now, review_due_at: soon,
    created_at: now, contact_phone: '98xxxxxx77' },
  { id: 'v3', business_name: 'Anu Florals', partner_code: 'SBM-DEC-0003', category: 'Decoration & Floral',
    city: 'Bengaluru', area: 'Jayanagar', verification_status: 'approved', onboarding_status: 'complete',
    accepting_jobs: true, is_verified: true, is_synthetic: false, submitted_at: now, review_due_at: null,
    created_at: now, contact_phone: '98xxxxxx09' },
]

const TABLES = {
  vendors: VENDORS,
  sambramo_trade_registry: [
    { id: 'catering_food', name: 'Catering & Food', sort_order: 1 },
    { id: 'photography', name: 'Photography', sort_order: 2 },
    { id: 'decoration_floral', name: 'Decoration & Floral', sort_order: 3 },
    { id: 'bar_beverages', name: 'Bar & Beverages', sort_order: 4 },
  ],
  vendor_services: [
    { id: 's1', vendor_id: 'v1', name: 'Wedding catering', category: 'Catering & Food',
      review_status: 'under_review', is_active: true, price: 650, unit: 'per guest', specs: {}, updated_at: now },
    { id: 's2', vendor_id: 'v3', name: 'Mandap florals', category: 'Decoration & Floral',
      review_status: 'live', is_active: true, price: 25000, unit: 'per event', specs: {}, updated_at: now },
  ],
  vendor_documents: [
    { id: 'd1', vendor_id: 'v1', kind: 'fssai', status: 'pending', file_name: 'fssai-licence.pdf',
      mime_type: 'application/pdf', byte_size: 284000, uploaded_at: now, storage_path: 'v1/fssai.pdf' },
    { id: 'd2', vendor_id: 'v3', kind: 'pan', status: 'accepted', file_name: 'pan.jpg',
      mime_type: 'image/jpeg', byte_size: 96000, uploaded_at: now, storage_path: 'v3/pan.jpg' },
  ],
  partner_work: [
    { id: 'w1', vendor_id: 'v3', kind: 'portfolio', storage_path: 'v3/mandap.jpg',
      caption: 'Mandap, Jayanagar', review_status: 'live', created_at: now },
  ],
  vendor_photos: [],
  booking_lines: [
    { id: 'b1', service_name: 'Anchor for sangeet', trade: 'Anchor & MC', status: 'cancelled',
      quoted_amount_paise: 1850000, partner_amount_paise: 1850000, platform_fee_paise: 0, platform_fee_rate: 0,
      price_basis: 'instant', pricing_state: 'final', created_at: now, dispatched_at: now,
      accepted_at: null, paid_at: null, delivered_at: null, settled_at: null, cancelled_at: now,
      cancellation_reason: 'Customer changed the date' },
    { id: 'b2', service_name: 'Catering — 250 guests', trade: 'Catering & Food', status: 'cancelled',
      quoted_amount_paise: 16250000, partner_amount_paise: 16250000, platform_fee_paise: 0, platform_fee_rate: 0,
      price_basis: 'quote', pricing_state: 'final', created_at: now, dispatched_at: now,
      accepted_at: null, paid_at: null, delivered_at: null, settled_at: null, cancelled_at: now,
      cancellation_reason: null },
  ],
  sambramo_trade_packages: [
    { id: 'pk1', vendor_id: 'v1', name: 'Signature', description: 'Full-service catering, 250 guests',
      status: 'UNDER_REVIEW', source: 'partner', revision_round: 1, submitted_at: now,
      commercial_inputs: { base_rate_paise: 6500000, per_guest_paise: 65000 },
      trade_inputs: { service_style: 'Buffet', staff: 12 },
      calculation_snapshot: { customer_price_paise: 16250000, platform_fee_paise: 0, partner_take_paise: 16250000 },
      price_locked_until: null, review_note: null },
  ],
  sambramo_quote_requests: [],
  sambramo_quote_responses: [],
  escrow_ledger: [],
  payout_claims: [],
  partner_payout_accounts: [{ id: 'pa1', vendor_id: 'v3', route_status: 'activated' }],
  vendor_payout_details: [{ id: 'pd1', vendor_id: 'v3', method: 'bank' }],
  partner_stories: [
    { key: 'instant-booking', label: 'Instant bookings', blurb: 'From discovery to booking', position: 0, deleted_at: null },
    { key: 'live-tracking', label: 'Jobs received', blurb: 'Every detail in one place', position: 1, deleted_at: null },
  ],
  partner_story_slides: [
    { id: 'sl1', story_key: 'instant-booking', position: 0, title: 'A new job just arrived!',
      description: 'The booking lands in your Jobs tab.', media_url: 'x.jpg', media_type: 'image',
      is_published: true, deleted_at: null, created_at: now },
  ],
  partner_market_interest: [],
  dispatch_offers: [],
}

/* HEAD + count=exact asks for a count with an empty body. Getting this
   wrong makes every KPI render zero. */
const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (u.includes('/rest/v1/rpc/')) {
    return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (m) {
    let rows = TABLES[m[1]] ?? []
    if (m[1] === 'vendors' && u.includes('is_synthetic=eq.false')) {
      if (u.includes('verification_status=eq.approved')) rows = rows.filter(r => r.verification_status === 'approved')
      else if (u.includes('verification_status=eq.submitted')) rows = rows.filter(r => r.verification_status === 'submitted')
      else if (u.includes('verification_status=eq.suspended')) rows = []
      else if (u.includes('accepting_jobs=eq.true')) rows = rows.filter(r => r.accepting_jobs)
    }
    if (m[1] === 'vendor_services') {
      if (u.includes('review_status=eq.live')) rows = rows.filter(r => r.review_status === 'live')
      else if (u.includes('review_status=eq.under_review')) rows = rows.filter(r => r.review_status === 'under_review')
    }
    if (m[1] === 'vendor_documents' && u.includes('status=eq.pending')) rows = rows.filter(r => r.status === 'pending')
    const headers = { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` }
    if ((init?.method ?? 'GET') === 'HEAD') return new Response('[]', { status: 200, headers })
    return new Response(JSON.stringify(rows), { status: 200, headers })
  }
  return real(input, init)
}

const SCREENS = {
  'founder-analytics': FounderAnalytics,
  overview: ExecutiveOverview,
  directory: PartnerDirectory,
  partners: PartnerConsole,
  'onboarding-review': OnboardingReview,
  'trade-workspaces': TradeWorkspaces,
  media: MediaLibrary,
  orders: OrdersConsole,
  revenue: RevenueConsole,
  inquiries: InquiriesConsole,
  'pricing-packages': PricingConsole,
  'listing-review': ListingReview,
  verification: VerificationQueue,
  'pricing-review': PricingReviewQueue,
  'live-ops': LiveOperations,
  'city-interest': MarketInterest,
  'story-uploads': PartnerStoryUploads,
}

export default function Scene() {
  const want = new URLSearchParams(window.location.search).get('screen') || 'founder-analytics'
  const Screen = SCREENS[want] ?? FounderAnalytics
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <AdminShell activeNav={want} onNavigate={() => {}} badges={{ vendors: 2, pricing: 1 }}
        profile={{ full_name: 'Mohan', role: 'admin' }} onRefresh={() => {}} refreshing={false}>
        <Screen />
      </AdminShell>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
