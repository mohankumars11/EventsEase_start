/**
 * The real ListingOnboardingFlow, embedded, filled for a sample trade so
 * every stage can be photographed:  ?stage=<id>&trade=<id>
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import ListingOnboardingFlow from '../../../src/components/vendor/listing/ListingOnboardingFlow'

const P = 100
export const SAMPLES = {
  photography: {
    basics: { display_name: 'Lens & Light Studio', tagline: 'Candid weddings across Karnataka', bio: 'Eight years of candid and traditional wedding photography — calm on the day, quick delivery after.', legal_name: 'Arjun Rao' },
    location: { lat: 12.9784, lng: 77.6408, source: 'gps', confirmed: true, formatted_address: 'Indiranagar, Bengaluru', locality: 'Indiranagar', city: 'Bengaluru', postal_code: '560038', state: 'Karnataka', travel_scope: '50' },
    answers: { specialties: ['candid', 'traditional', 'pre_wedding'], events: ['weddings', 'engagements', 'receptions'], styles: ['documentary'], years: 8, formats: ['online_gallery', 'printed_album'], equipment: ['full_frame_bodies', 'prime_lenses'], service_radius_km: 150, overtime_per_hour: 3000 * P, extra_photographer: 2500 * P, team: 4, events_per_day: 2, edits_per_month: 12, travel_buffer_minutes: 90, portfolio: [] },
    catalogue: [
      { item_key: 'p1', answers: { coverage: 'full_day', hours: 8, photographers: 2, edited_images: 600, retouch: 'standard', album: 'printed_album', delivery_days: 30, raw: false, price: 60000 * P } },
      { item_key: 'p2', answers: { coverage: 'ceremony_session', hours: 4, photographers: 1, edited_images: 250, retouch: 'basic_colour', album: 'digital_album', delivery_days: 14, price: 25000 * P } },
    ],
    rules: { hour: { on: true, amount_paise: 5000 * P, min_qty: 2, max_qty: 12 }, full_day: { on: true, amount_paise: 35000 * P, hours: 8 } },
    packages: [],
    addons: { album: { on: true, take_home_paise: 12000 * P }, drone: { on: true, take_home_paise: 8000 * P } },
    availability: { min_notice_days: 7, horizon_months: 12, travel_model: 'per_km', travel_per_km_paise: 20 * P },
    booking: { instant: true, advance_pct: 30, cancellation: 'moderate', custom_quotes: true, quote_hours: 12 },
  },
}

export default function Flow({ trade = 'photography', stage = 'basics' }) {
  return (
    <MemoryRouter>
      <div style={{ width: 390, margin: '0 auto' }}>
        <ListingOnboardingFlow embedded trade={trade} vendorId={null} initialStep={stage} initialAnswers={SAMPLES[trade]} />
      </div>
    </MemoryRouter>
  )
}
