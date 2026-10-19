/**
 * The partner app, screen by screen, at phone width.
 *
 * Chosen by `?screen=<id>`, same as the admin set. Phone width because
 * that is the only width a partner ever sees this at — a partner screen
 * photographed on a desktop canvas hides exactly the overflow and
 * truncation problems worth finding.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MONEY IS THE PARTNER'S, NOT THE CUSTOMER'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every figure in these fixtures is partner take-home in integer paise,
 * because that is what these components are built to show. Putting a
 * customer total on a partner screen is the specific mistake this app
 * is careful about, and a fixture that did it would make a screenshot
 * that looks right and teaches the wrong thing.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'

import OfferInbox from '../../src/components/vendor/OfferInbox'
import MyJobs from '../../src/components/vendor/MyJobs'
import Earnings from '../../src/components/vendor/Earnings'
import ClaimPayment from '../../src/components/vendor/ClaimPayment'
import PayoutHistory from '../../src/components/vendor/PayoutHistory'
import CustomQuoteInbox from '../../src/components/vendor/CustomQuoteInbox'
import MyServices from '../../src/components/vendor/MyServices'
import TradeGrid from '../../src/components/vendor/TradeGrid'
import OfferHistory from '../../src/components/vendor/OfferHistory'
import PartnerStories from '../../src/components/partner/PartnerStories'
import JobTimeline from '../../src/components/partner/JobTimeline'
import LiveTracking from '../../src/components/partner/LiveTracking'
import JobsStats from '../../src/components/partner/JobsStats'
import UpcomingWeek from '../../src/components/partner/UpcomingWeek'
import ReviewDial from '../../src/components/partner/ReviewDial'

const now = new Date()
const iso = (mins = 0) => new Date(now.getTime() + mins * 60000).toISOString()
const eventDate = new Date(now.getTime() + 12 * 864e5).toISOString().slice(0, 10)

const VENDOR_ID = '11111111-1111-4111-8111-111111111111'
const LINE_ID = 'aaaaaaaa-1111-4111-8111-111111111111'

/* Partner take-home. Integer paise everywhere. */
const OFFERS = [
  { id: 'o1', offer_id: 'o1', line_id: LINE_ID, vendor_id: VENDOR_ID, status: 'OFFERED',
    service_name: 'Wedding photography', trade: 'Photography', partner_amount_paise: 2500000,
    event_date: eventDate, area_label: 'Indiranagar', city: 'Bengaluru', distance_m: 4200,
    expires_at: iso(45), created_at: iso(-10), guest_count: 150 },
  { id: 'o2', offer_id: 'o2', line_id: 'bbbb', vendor_id: VENDOR_ID, status: 'OFFERED',
    service_name: 'Reception coverage', trade: 'Photography', partner_amount_paise: 1800000,
    event_date: eventDate, area_label: 'Koramangala', city: 'Bengaluru', distance_m: 9100,
    expires_at: iso(120), created_at: iso(-30), guest_count: 80 },
]

const LINES = [
  { id: LINE_ID, vendor_id: VENDOR_ID, service_name: 'Wedding photography', trade: 'Photography',
    status: 'paid', partner_amount_paise: 2500000, quoted_amount_paise: 2500000, platform_fee_paise: 0,
    event_date: eventDate, area_label: 'Indiranagar', city: 'Bengaluru',
    created_at: iso(-2880), dispatched_at: iso(-2880), accepted_at: iso(-2800),
    paid_at: iso(-2700), delivered_at: null, settled_at: null, cancelled_at: null },
  { id: 'l2', vendor_id: VENDOR_ID, service_name: 'Engagement shoot', trade: 'Photography',
    status: 'settled', partner_amount_paise: 1200000, quoted_amount_paise: 1200000, platform_fee_paise: 0,
    event_date: '2026-09-28', area_label: 'Jayanagar', city: 'Bengaluru',
    created_at: iso(-40000), accepted_at: iso(-39000), paid_at: iso(-38000),
    delivered_at: iso(-20000), settled_at: iso(-19000), cancelled_at: null },
]

/* These components read purpose-built VIEWS, not the base tables:
   partner_offer_feed, partner_jobs, partner_earnings, partner_readiness.
   Seeding dispatch_offers and booking_lines produced empty screens that
   looked like a rendering bug and were a fixture bug. */
const FEED = [
  { offer_id: 'o1', line_id: LINE_ID, vendor_id: VENDOR_ID, status: 'OFFERED', wave: 1,
    distance_m: 4200, partner_amount_paise: 2500000, offered_at: iso(-10), expires_at: iso(45),
    service_id: 's1', service_name: 'Wedding photography', trade: 'Photography', spec_mode: 'instant',
    customer_note: 'Two shooters, candid plus traditional.', reference_photo_url: null,
    occasion_name: 'Wedding', event_date: eventDate, time_note: 'From 9 am',
    guest_count: 150, area_label: 'Indiranagar', city: 'Bengaluru' },
  { offer_id: 'o2', line_id: 'bbbbbbbb-2222-4222-8222-222222222222', vendor_id: VENDOR_ID,
    status: 'OFFERED', wave: 1, distance_m: 9100, partner_amount_paise: 1800000,
    offered_at: iso(-30), expires_at: iso(120), service_id: 's1', service_name: 'Reception coverage',
    trade: 'Photography', spec_mode: 'instant', customer_note: null, reference_photo_url: null,
    occasion_name: 'Reception', event_date: eventDate, time_note: 'Evening',
    guest_count: 80, area_label: 'Koramangala', city: 'Bengaluru' },
]

const JOBS = [
  { line_id: LINE_ID, offer_id: 'o1', vendor_id: VENDOR_ID, partner_profile_id: null, status: 'paid',
    service_id: 's1', service_name: 'Wedding photography', trade: 'Photography', spec_mode: 'instant',
    customer_note: 'Two shooters, candid plus traditional.', reference_photo_url: null,
    partner_amount_paise: 2500000, quoted_amount_paise: 2500000, distance_m: 4200,
    accepted_at: iso(-2800), paid_at: iso(-2700), delivered_at: null, settled_at: null,
    request_id: 'r1', occasion_name: 'Wedding', event_date: eventDate, time_note: 'From 9 am',
    guest_count: 150, area_label: 'Indiranagar', city: 'Bengaluru', is_funded: true,
    platform_fee_paise: 0, platform_fee_rate: 0 },
  { line_id: 'l2', offer_id: 'o0', vendor_id: VENDOR_ID, partner_profile_id: null, status: 'settled',
    service_id: 's2', service_name: 'Engagement shoot', trade: 'Photography', spec_mode: 'instant',
    customer_note: null, reference_photo_url: null,
    partner_amount_paise: 1200000, quoted_amount_paise: 1200000, distance_m: 6100,
    accepted_at: iso(-39000), paid_at: iso(-38000), delivered_at: iso(-20000), settled_at: iso(-19000),
    request_id: 'r0', occasion_name: 'Engagement', event_date: '2026-09-28', time_note: 'Morning',
    guest_count: 40, area_label: 'Jayanagar', city: 'Bengaluru', is_funded: true,
    platform_fee_paise: 0, platform_fee_rate: 0 },
]

const EARNINGS = JOBS.map(j => ({
  line_id: j.line_id, vendor_id: VENDOR_ID, offer_id: j.offer_id, request_id: j.request_id,
  service_id: j.service_id, service_name: j.service_name, trade: j.trade,
  occasion_name: j.occasion_name, event_date: j.event_date, area_label: j.area_label, city: j.city,
  line_status: j.status, accepted_at: j.accepted_at, paid_at: j.paid_at,
  delivered_at: j.delivered_at, settled_at: j.settled_at, cancelled_at: null,
  quoted_amount_paise: j.quoted_amount_paise, platform_fee_paise: 0, platform_fee_rate: 0,
  partner_amount_paise: j.partner_amount_paise,
  held_paise: j.status === 'paid' ? j.partner_amount_paise : 0, is_funded: true,
  released_partner_paise: j.status === 'settled' ? j.partner_amount_paise : 0,
  remitted_tcs_paise: 0, remitted_tds_paise: 0, released_platform_paise: 0,
  penalty_partner_paise: 0, refunded_customer_paise: 0, last_movement_at: j.settled_at ?? j.paid_at,
  claim_id: j.status === 'settled' ? 'pc1' : null,
  claim_status: j.status === 'settled' ? 'settled' : null,
  claim_amount_paise: j.status === 'settled' ? j.partner_amount_paise : null,
  claim_method: j.status === 'settled' ? 'bank' : null, claim_destination: null,
  claim_requested_at: j.status === 'settled' ? iso(-19500) : null,
  claim_settled_at: j.settled_at, claim_reference: j.status === 'settled' ? 'UTR9912' : null,
  claim_failure_code: null, claim_failure_reason: null, claim_attempt: 1,
  batch_id: null, batch_status: null, batch_reference: null, batch_paid_at: null,
  adjustments_paise: 0, adjustment_count: 0, dispute_status: null,
  claimable_at: j.status === 'paid' ? iso(-100) : null,
  payout_state: j.status === 'paid' ? 'claimable' : 'settled',
}))

const TABLES = {
  partner_offer_feed: FEED,
  partner_jobs: JOBS,
  partner_earnings: EARNINGS,
  partner_readiness: [{ vendor_id: VENDOR_ID, business_name: 'Lens & Light Studio',
    terms_accepted: true, terms_version: '2026-08', payout_added: true, payout_method: 'bank',
    payout_verified: true, pan_added: true, payable: true }],
  dispatch_offers: FEED,
  booking_lines: LINES,
  vendors: [{ id: VENDOR_ID, business_name: 'Lens & Light Studio', partner_code: 'SBM-PHO-0012',
    category: 'Photography', city: 'Bengaluru', area: 'Indiranagar', verification_status: 'submitted',
    is_verified: false, accepting_jobs: true, is_synthetic: false,
    submitted_at: iso(-600), review_due_at: iso(840), review_extended: 0 }],
  vendor_services: [
    { id: 's1', vendor_id: VENDOR_ID, name: 'Wedding photography', category: 'Photography',
      review_status: 'live', is_active: true, price: 25000, unit: 'per event', sort_order: 0 },
    { id: 's2', vendor_id: VENDOR_ID, name: 'Engagement shoot', category: 'Photography',
      review_status: 'under_review', is_active: true, price: 12000, unit: 'per event', sort_order: 1 },
  ],
  payout_claims: [
    { id: 'pc1', line_id: 'l2', vendor_id: VENDOR_ID, amount_paise: 1200000, status: 'settled',
      method: 'bank', requested_at: iso(-19500), settled_at: iso(-19000), reference: 'UTR9912' },
  ],
  partner_adjustments: [],
  sambramo_quote_requests: [
    { id: 'q1', vendor_id: VENDOR_ID, trade_id: 'photography', service_name: 'Three-day wedding coverage',
      event_date: eventDate, start_time: '09:00', end_time: '22:00', service_location: 'Whitefield, Bengaluru',
      state: 'awaiting_partner', expires_at: iso(300), created_at: iso(-120), missing_inputs: [] },
  ],
  sambramo_quote_responses: [],
  partner_story_slides: [],
  partner_stories: [],
  vendor_documents: [],
  partner_work: [],
  partner_messages: [],
  vendor_availability: [],
}

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/rpc/')) {
    /* The partner RPCs this set touches are all reads. */
    if (u.includes('claimable')) return new Response(JSON.stringify({ ok: true, amount_paise: 2500000 }), { status: 200, headers: { 'content-type': 'application/json' } })
    return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const m = /\/rest\/v1\/([a-z_]+)/.exec(u)
  if (m) {
    let rows = TABLES[m[1]] ?? []
    if (m[1] === 'dispatch_offers' && u.includes('status=eq.OFFERED')) rows = rows.filter(r => r.status === 'OFFERED')
    const headers = { 'content-type': 'application/json', 'content-range': `0-${rows.length}/${rows.length}` }
    if ((init?.method ?? 'GET') === 'HEAD') return new Response('[]', { status: 200, headers })
    return new Response(JSON.stringify(rows), { status: 200, headers })
  }
  return real(input, init)
}

const Frame = ({ children, title }) => (
  <div style={{ maxWidth: 430, margin: '0 auto', background: '#fff', minHeight: 760, padding: 12 }}>
    {title && <p style={{ font: '700 11px system-ui', color: '#6b7280', margin: '0 0 8px' }}>{title}</p>}
    {children}
  </div>
)

const SCREENS = {
  offers: () => <Frame title="JOBS · INSTANT BOOKING OFFERS"><OfferInbox vendorId={VENDOR_ID} /></Frame>,
  jobs: () => <Frame title="JOBS · ACCEPTED WORK"><MyJobs vendorId={VENDOR_ID} /></Frame>,
  stories: () => <Frame title="JOBS · PARTNER GUIDE STORIES"><PartnerStories /></Frame>,
  stats: () => <Frame title="JOBS · AT A GLANCE"><JobsStats vendorId={VENDOR_ID} /></Frame>,
  week: () => <Frame title="JOBS · THIS WEEK"><UpcomingWeek vendorId={VENDOR_ID} /></Frame>,
  review: () => <Frame title="REVIEW COUNTDOWN · 24-HOUR SLA"><ReviewDial dueAt={TABLES.vendors[0].review_due_at} /></Frame>,
  timeline: () => <Frame title="JOB · LIFECYCLE"><JobTimeline line={LINES[0]} /></Frame>,
  tracking: () => <Frame title="JOB · LIVE TRACKING"><LiveTracking lineId={LINE_ID} /></Frame>,
  earnings: () => <Frame title="EARNINGS"><Earnings vendorId={VENDOR_ID} /></Frame>,
  claim: () => <Frame title="EARNINGS · CLAIM PAYMENT"><ClaimPayment vendorId={VENDOR_ID} lineId={LINE_ID} /></Frame>,
  payouts: () => <Frame title="EARNINGS · PAYOUT HISTORY"><PayoutHistory vendorId={VENDOR_ID} /></Frame>,
  quotes: () => <Frame title="CUSTOM QUOTE INBOX"><CustomQuoteInbox vendorId={VENDOR_ID} /></Frame>,
  services: () => <Frame title="PRICING · MY LISTINGS"><MyServices vendorId={VENDOR_ID} /></Frame>,
  trades: () => <Frame title="ADD A SERVICE · 34 TRADES"><TradeGrid /></Frame>,
  history: () => <Frame title="JOBS · OFFER HISTORY"><OfferHistory vendorId={VENDOR_ID} /></Frame>,
}

export default function Scene() {
  const want = new URLSearchParams(window.location.search).get('screen') || 'offers'
  const Screen = SCREENS[want] ?? SCREENS.offers
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <Screen />
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
