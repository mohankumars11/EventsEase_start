/**
 * The review card in its three states, and the per-listing screen.
 *
 * `?state=submitted|approved|rejected` picks the countdown's state;
 * `?state=listings` renders ListingsUnderReview against a stubbed
 * fetch, so the per-listing clocks can be read rather than assumed.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'
import ListingsUnderReview from '../../src/components/partner/review/ListingsUnderReview'

const now = Date.now()
const ago = h => new Date(now - h * 3600e3).toISOString()

const real = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const u = String(input?.url ?? input)
  if (u.includes('/rest/v1/partner_listings')) {
    return new Response(JSON.stringify([
      { id: 'l1', trade: 'Photography', trade_id: 'photography', status: 'submitted', submitted_at: ago(70), reviewed_at: null, review_note: null },
      { id: 'l2', trade: 'Venue', trade_id: 'venue', status: 'submitted', submitted_at: ago(5), reviewed_at: null, review_note: null },
      { id: 'l3', trade: 'Decoration & Floral', trade_id: 'decoration_floral', status: 'live', submitted_at: ago(200), reviewed_at: ago(180), review_note: null },
      { id: 'l4', trade: 'Anchor & MC', trade_id: 'anchor_mc', status: 'rejected', submitted_at: ago(96), reviewed_at: ago(80), review_note: 'Your rate card is missing a per-hour price.' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (u.includes('/rest/v1/vendor_services')) {
    return new Response(JSON.stringify([
      { id: 's1', name: 'Wedding day coverage', category: 'Photography', review_status: 'under_review', is_active: true },
      { id: 's2', name: 'Hall booking', category: 'Venue', review_status: 'under_review', is_active: true },
    ]), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (u.includes('/rest/v1/')) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return real(input, init)
}

export default function Scene() {
  const state = new URLSearchParams(window.location.search).get('state') || 'submitted'
  return (
    <MemoryRouter><AuthProvider><ToastProvider>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 12, background: '#f6f5fa' }}>
        {state === 'listings'
          ? <ListingsUnderReview vendorId="v1" onOpenTrade={() => {}} />
          : (
            <ReviewCountdown
              status={state}
              submittedAt={ago(state === 'submitted' ? 3 : 30)}
              dueAt={new Date(now + 21 * 3600e3).toISOString()}
              extended={0}
              note={state === 'rejected' ? 'Your rate card is missing a per-hour price.' : null}
              onOpenCalendar={() => {}}
              listingCount={4}
              listingNames={'Photography · Venue · Decoration & Floral'}
              onOpenListing={() => {}}
              onHowItWorks={() => {}}
            />
          )}
        <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
      </div>
    </ToastProvider></AuthProvider></MemoryRouter>
  )
}
