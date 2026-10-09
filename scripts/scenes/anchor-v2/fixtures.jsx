/**
 * Anchor & MC v2 flow, photographed one step at a time.
 * The real AnchorOnboardingFlow from src/, `embedded` so the whole step
 * renders top to bottom with its header and footer, given filled answers.
 */
import React from 'react'
import AnchorOnboardingFlow from '../../../src/components/vendor/anchor/AnchorOnboardingFlow'

export const FILLED = {
  identity: {
    stage_name: 'Anchor Rhea Live', tagline: 'High-energy wedding & corporate host',
    bio: '8 years hosting weddings, sangeets and corporate galas across Karnataka. Bilingual, quick on my feet, and I keep a crowd of 800 laughing.',
    city: { city: 'Bengaluru', label: 'Indiranagar, Bengaluru' },
    showreel: 'https://youtube.com/watch?v=abc123', instagram: 'https://instagram.com/anchorrhea', work: [],
  },
  skills: {
    years: '6–10', events: ['sangeet', 'reception', 'destination', 'conference', 'awards', 'birthday', 'kids'],
    languages: [{ name: 'Kannada', level: 'native' }, { name: 'English', level: 'fluent' }, { name: 'Hindi', level: 'conversational' }],
    styles: ['High-energy', 'Interactive / games', 'Elegant & formal'],
  },
  pricing: { take_home_per_hour: '5000', min_duration_hours: 2, max_duration_hours: 8, vip_multiplier: 4 },
  addons: { on: { custom_script: '5000', rehearsal: '3000', pre_event_call: '1000', outfit_changes: '2500', game_props: '2000', social_post: '3000' }, overtime: '5000' },
  overrides: {},
  rules: { custom_quotes: true, min_budget: '100000', sla_hours: 4 },
  publish: { instant: true, advance: 30, cancellation: 'flexible', outstation: true, travel_billing: 'client_books', rider: ['pa_system', 'green_room'] },
}

const ORDER = ['identity', 'skills', 'pricing', 'addons', 'packages', 'rules', 'publish']
const EMPTY = { identity: {}, skills: {}, pricing: { vip_multiplier: 4 }, addons: { on: {} }, overrides: {}, rules: { custom_quotes: true }, publish: { instant: true } }

/* Filled up to and including the step on screen, empty after it, so the
   rail shows the progress a partner would actually have made. */
function upTo(step) {
  const n = ORDER.indexOf(step)
  const out = { ...EMPTY }
  ORDER.slice(0, n + 1).forEach(k => { if (k !== 'packages') out[k] = FILLED[k] })
  return out
}

export function Step({ step, answers }) {
  answers = answers ?? upTo(step)
  return (
    <div style={{ width: 390, margin: '0 auto' }}>
      <AnchorOnboardingFlow embedded trade="Anchor & MC" vendorId={null}
        initialStep={step} initialAnswers={answers} onClose={() => {}} />
    </div>
  )
}
