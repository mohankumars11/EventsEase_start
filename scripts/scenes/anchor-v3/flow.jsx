/**
 * The real 11-stage AnchorOnboardingFlow, `embedded`, filled up to the
 * stage on screen so the rail shows genuine progress.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import AnchorOnboardingFlow from '../../../src/components/vendor/anchor/AnchorOnboardingFlow'
import { STAGES } from '../../../src/components/vendor/anchor/options'

const FILLED = {
  about: {
    stage_name: 'Anchor Rhea Live', role: 'both', years: '6–10', tagline: 'High-energy wedding & corporate host',
    bio: '8 years hosting weddings, sangeets and corporate galas across Karnataka. Bilingual, quick on my feet, and I keep a crowd of 800 laughing.',
    legal_name: 'Rhea Sharma', video_url: 'https://www.youtube.com/watch?v=abc123', instagram: 'https://instagram.com/anchorrhea', work: [],
  },
  location: { lat: 12.9784, lng: 77.6408, source: 'gps', confirmed: true, formatted_address: '12th Main Rd, HAL 2nd Stage, Indiranagar', locality: 'Indiranagar', city: 'Bengaluru', postal_code: '560038', state: 'Karnataka', travel_scope: '50' },
  events: { events: ['sangeet', 'reception', 'destination', 'conference', 'awards', 'birthday'], audience: '1000', max_audience: 1000, formats: ['Indoor', 'Outdoor', 'Hybrid'] },
  languages: { languages: [{ name: 'Kannada', level: 'native' }, { name: 'English', level: 'fluent' }, { name: 'Hindi', level: 'conversational' }], styles: ['High-energy & interactive', 'Formal & professional'] },
  pricing: { models: ['hour', 'half_day', 'full_day'], hour: { rate: '5000', min_hours: 2, max_hours: 8, overtime: '6000', ot_step: 60, grace: 15 }, half_day: { rate: '15000', hours: 4, functions: 2 }, full_day: { rate: '25000', hours: 8, breaks: true } },
  extras: { on: { custom_script: { fee: '5000', unit: 'per_event', notice: 3 }, pre_event_call: { fee: '1000', unit: 'per_event', notice: 0 }, rehearsal: { fee: '3000', unit: 'per_session', notice: 1 }, outfit_changes: { fee: '2500', unit: 'per_event', notice: 0 } }, waiting: { free_minutes: 30, fee: '1000' } },
  overrides: {},
  availability: { min_notice_days: 3, horizon_months: 12, max_consecutive_hours: 8, rest_hours: 2, multiple_per_day: false, travel_model: 'customer_arranged', hotel_required: true },
  rules: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4, rider: ['pa_system', 'green_room'] },
}
const EMPTY = { about: {}, location: {}, events: {}, languages: {}, pricing: { models: [] }, extras: { on: {} }, overrides: {}, availability: {}, rules: { instant: true, custom_quotes: true } }
const KEY = { about: 'about', location: 'location', events: 'events', languages: 'languages', pricing: 'pricing', extras: 'extras', availability: 'availability', rules: 'rules' }

export function Stage({ id }) {
  const n = STAGES.findIndex(s => s.id === id)
  const answers = { ...EMPTY }
  STAGES.slice(0, n + 1).forEach(s => { if (KEY[s.id]) answers[KEY[s.id]] = FILLED[KEY[s.id]] })
  return (
    <MemoryRouter>
      <div style={{ width: 390, margin: '0 auto' }}>
        <AnchorOnboardingFlow embedded trade="Anchor & MC" vendorId={null} initialStep={id} initialAnswers={answers} onClose={() => {}} />
      </div>
    </MemoryRouter>
  )
}
