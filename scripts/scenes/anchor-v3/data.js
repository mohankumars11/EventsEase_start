/* Sample data for the v3 mockups. Prices are the real 8% gross-up of the
   sample take-home figures, so the numbers on screen are internally consistent. */
export const CONTROL = {
  status: 'LIVE', version: 3, published_at: '2026-10-02', price_locked_until: '2026-10-17', now: '2026-10-09',
  instant_ready: false, instant_missing: 1, payout_status: 'active',
  seasonal: { name: 'Wedding season 2026–27', deadline: '2026-10-20' },
  packages: [
    { tier: 'ESSENTIAL', name: 'Essential', price_paise: 1086960, hours: 2, sessions: 1, inclusions: ['Hosting & anchoring', 'Run-of-show coordination'] },
    { tier: 'SIGNATURE', name: 'Signature', price_paise: 1902180, hours: 4, sessions: 2, inclusions: ['Custom script & research', 'Pre-event planning call', 'Games & audience props'] },
    { tier: 'VIP', name: 'VIP', price_paise: 4347830, hours: 8, sessions: 3, inclusions: ['Everything in Signature', 'Multiple outfit changes', 'Premium wireless mic'] },
  ],
  listing: {
    initials: 'AR', stage_name: 'Anchor Rhea Live', role: 'Anchor & MC', years: '6–10', tagline: 'High-energy weddings & corporate',
    city: 'Indiranagar, Bengaluru', travel: 'up to 50 km', languages: 'Kannada (native) · English (fluent) · Hindi',
    audience: '1,000', formats: 'Indoor, outdoor, hybrid', events: ['Sangeet', 'Reception', 'Destination wedding', 'Conference', 'Awards'],
  },
  models: [
    { id: 'hour', customer_paise: 543480, unit: '/hr', rules: 'Min 2 hrs · max 8 hrs · overtime ₹6,522/hr in 60-min steps after 15 min grace' },
    { id: 'half_day', customer_paise: 1630430, unit: '', rules: 'Up to 4 hrs · 2 functions · overtime at hourly rate' },
    { id: 'full_day', customer_paise: 2717390, unit: '', rules: 'Up to 8 hrs · breaks & waiting included' },
  ],
  addons: [
    { name: 'Custom script & research', paise: 543480, unit: 'per event', in: ['Signature', 'VIP'] },
    { name: 'Pre-event rehearsal', paise: 326090, unit: 'per session', in: [] },
    { name: 'Multiple outfit changes', paise: 271740, unit: 'per event', in: ['VIP'] },
    { name: 'Co-anchor / duo partner', paise: 869570, unit: 'per event', in: [] },
  ],
  charges: [
    { k: 'Overtime', v: '₹6,522 per hour · 60-min steps' },
    { k: 'Extra function', v: '₹6,522 each' },
    { k: 'Travel within 50 km', v: 'Included' },
    { k: 'Outstation', v: 'Client books travel + 4★ stay' },
    { k: 'Waiting time', v: '30 min free, then ₹1,000 / 30 min' },
  ],
  rules: [
    { k: 'Instant booking', v: 'On' },
    { k: 'Custom quotes', v: 'On · reply within 4 hrs' },
    { k: 'Advance', v: '30% at booking' },
    { k: 'Cancellation', v: 'Flexible · full refund 7 days before' },
    { k: 'Minimum notice', v: '3 days' },
  ],
}
