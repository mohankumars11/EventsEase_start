/**
 * Every list the Anchor & MC flow offers.
 *
 * Event and language ids match partnerSpecs.js 'Anchor & MC' so the
 * answers stay matchable by dispatch, which reads those same ids.
 */

export const YEARS = ['0–2', '2–5', '6–10', '10–15', '15+']

export const EVENT_GROUPS = [
  { id: 'weddings', label: 'Weddings', items: [
    { id: 'sangeet', label: 'Sangeet' }, { id: 'reception', label: 'Reception' },
    { id: 'haldi', label: 'Haldi' }, { id: 'mehendi', label: 'Mehendi' },
    { id: 'engagement', label: 'Engagement' }, { id: 'wedding', label: 'Wedding ceremony' },
    { id: 'destination', label: 'Destination wedding' },
  ] },
  { id: 'corporate', label: 'Corporate', items: [
    { id: 'conference', label: 'Conferences' }, { id: 'gala', label: 'Galas' },
    { id: 'awards', label: 'Awards nights' }, { id: 'launch', label: 'Launches' },
    { id: 'dealer_meet', label: 'Dealer meets' }, { id: 'mice', label: 'MICE' },
  ] },
  { id: 'private', label: 'Private', items: [
    { id: 'birthday', label: 'Milestone birthdays' }, { id: 'kids', label: 'Kids birthdays' },
    { id: 'baby_shower', label: 'Baby showers' }, { id: 'anniversary', label: 'Anniversaries' },
    { id: 'reunion', label: 'Reunions' },
  ] },
  { id: 'community', label: 'College & community', items: [
    { id: 'college', label: 'College fests' }, { id: 'school', label: 'School events' },
    { id: 'religious', label: 'Religious functions' },
  ] },
]

export const LANGUAGES = [
  'Kannada', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Urdu', 'Konkani', 'Tulu',
]

export const PROFICIENCY = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'conversational', label: 'Conversational' },
]

export const STYLES = [
  'High-energy', 'Elegant & formal', 'Humorous', 'Interactive / games', 'Storyteller',
  'Bilingual switching', 'Corporate & scripted', 'Traditional & ritual-aware', 'I sing as well',
]

export const MIN_HOURS = [1, 2, 3, 4]
export const MAX_HOURS = [4, 6, 8, 10, 12]
export const VIP_STOPS = [2, 3, 4, 5, 6]

export const ADDONS = [
  { id: 'custom_script', label: 'Custom script & research', suggest: 5000 },
  { id: 'rehearsal', label: 'Pre-event tech rehearsal', suggest: 3000 },
  { id: 'pre_event_call', label: 'Pre-event planning call', suggest: 1000 },
  { id: 'outfit_changes', label: 'Multiple outfit changes', suggest: 2500 },
  { id: 'wardrobe', label: 'Thematic wardrobe sourcing', suggest: 4000 },
  { id: 'wireless_mic', label: 'Premium wireless mic (own)', suggest: 1500 },
  { id: 'game_props', label: 'Game props & materials', suggest: 2000 },
  { id: 'co_anchor', label: 'Co-anchor / duo partner', suggest: 8000 },
  { id: 'shadow', label: 'Backstage shadow assistant', suggest: 2500 },
  { id: 'social_post', label: 'Social media collaboration post', suggest: 3000 },
]

/* Which add-ons each tier includes by default, as in the reference. A
   partner can change these per package on the Packages step. */
export const TIER_DEFAULTS = {
  ESSENTIAL: [],
  SIGNATURE: ['custom_script', 'pre_event_call'],
  VIP: ['custom_script', 'pre_event_call', 'outfit_changes', 'game_props', 'wireless_mic'],
}

export const SLA_HOURS = [2, 4, 8, 24]

export const ADVANCE = [
  { value: 30, label: '30%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' },
]

export const CANCELLATION = [
  { id: 'flexible', title: 'Flexible', body: 'Full refund up to 7 days before the event.' },
  { id: 'moderate', title: 'Moderate', body: '50% refund up to 5 days before.' },
  { id: 'strict', title: 'Strict', body: 'Advance is non-refundable.' },
]

export const TRAVEL_BILLING = [
  { id: 'client_books', title: 'Client books travel', body: 'Flight or train plus a 4-star stay, arranged by the client.' },
  { id: 'flat_fee', title: 'Flat outstation surcharge', body: 'One fixed amount added to any outstation booking.' },
]

export const RIDER = [
  { id: 'pa_system', label: 'Client provides a professional PA system and a cordless mic.' },
  { id: 'green_room', label: 'Client provides a green room and standard crew meals.' },
]

export const STEPS = [
  { id: 'identity', label: 'Identity & media', short: 'Identity' },
  { id: 'skills', label: 'Skills', short: 'Skills' },
  { id: 'pricing', label: 'Pricing', short: 'Pricing' },
  { id: 'addons', label: 'Add-ons', short: 'Add-ons' },
  { id: 'packages', label: 'Packages', short: 'Packages' },
  { id: 'rules', label: 'Rules', short: 'Rules' },
  { id: 'publish', label: 'Publish', short: 'Publish' },
]
