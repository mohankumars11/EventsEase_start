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

/* The eleven stages of the full Anchor & MC listing (master spec §4). The
   seven-step STEPS above stays the live flow until each stage is built. */
export const STAGES = [
  { id: 'about', label: 'About you', short: 'About' },
  { id: 'location', label: 'Your location', short: 'Location' },
  { id: 'events', label: 'Experience & events', short: 'Events' },
  { id: 'languages', label: 'Languages & styles', short: 'Languages' },
  { id: 'pricing', label: 'Pricing & booking types', short: 'Pricing' },
  { id: 'extras', label: 'Extra services & charges', short: 'Extras' },
  { id: 'packages', label: 'Essential, Signature & VIP', short: 'Packages' },
  { id: 'availability', label: 'Availability & travel', short: 'Calendar' },
  { id: 'rules', label: 'Booking & cancellation', short: 'Rules' },
  { id: 'payout', label: 'Identity & bank details', short: 'ID & Bank' },
  { id: 'review', label: 'Review & publish', short: 'Publish' },
]

export const TRAVEL_SCOPE = [
  { id: '10', label: '10 km' }, { id: '25', label: '25 km' }, { id: '50', label: '50 km' },
  { id: '100', label: '100 km' }, { id: 'state', label: 'My state' }, { id: 'india', label: 'All India' },
  { id: 'intl', label: 'International' }, { id: 'custom', label: 'Custom' },
]

export const PRICING_MODELS = [
  { id: 'hour', label: 'Per hour', hint: 'A rate for every hour on stage.' },
  { id: 'session', label: 'Per session', hint: 'One function, one ceremony, one stage slot.' },
  { id: 'event', label: 'Per event', hint: 'One fixed price for the whole event.' },
  { id: 'half_day', label: 'Half-day', hint: 'Up to 4 hours.' },
  { id: 'full_day', label: 'Full-day', hint: 'Up to 8 hours.' },
  { id: 'multi_day', label: 'Multi-day', hint: 'Events over several days.' },
]

/* ── v3 lists (master spec §5–§15) ───────────────────────────────────── */
export const ROLES = [
  { id: 'anchor', label: 'Anchor' }, { id: 'mc', label: 'MC' },
  { id: 'both', label: 'Both' }, { id: 'other', label: 'Other' },
]

/* Ids for the original groups match partnerSpecs so dispatch can still match. */
export const EVENT_GROUPS_V3 = [
  { id: 'weddings', label: 'Weddings', items: [
    ['haldi', 'Haldi'], ['mehendi', 'Mehendi'], ['sangeet', 'Sangeet'], ['engagement', 'Engagement'],
    ['reception', 'Wedding reception'], ['cocktail', 'Cocktail party'], ['destination', 'Destination wedding'],
    ['wedding_anniversary', 'Wedding anniversary'] ] },
  { id: 'corporate', label: 'Corporate', items: [
    ['conference', 'Conference'], ['annual_day', 'Annual day'], ['launch', 'Product launch'], ['awards', 'Awards ceremony'],
    ['dealer_meet', 'Dealer meet'], ['team_building', 'Team building'], ['gala', 'Corporate gala'], ['town_hall', 'Town hall'], ['mice', 'MICE event'] ] },
  { id: 'private', label: 'Private', items: [
    ['birthday', 'Birthday'], ['kids', "Children's birthday"], ['anniversary', 'Anniversary'], ['baby_shower', 'Baby shower'],
    ['reunion', 'Reunion'], ['private_party', 'Private party'] ] },
  { id: 'public', label: 'Public & entertainment', items: [
    ['concert', 'Concert'], ['festival', 'Festival'], ['fashion_show', 'Fashion show'], ['sports', 'Sports event'],
    ['mall_activation', 'Mall activation'], ['trade_show', 'Trade show'], ['public_celebration', 'Public celebration'] ] },
  { id: 'virtual', label: 'Virtual & institutional', items: [
    ['webinar', 'Webinar'], ['online_conference', 'Online conference'], ['podcast', 'Podcast'], ['college', 'College fest'],
    ['school', 'School annual day'], ['ngo', 'NGO event'] ] },
  { id: 'government', label: 'Government & protocol', items: [
    ['govt_function', 'Government function'], ['inauguration', 'Inauguration'], ['protocol', 'Protocol event'] ] },
  { id: 'media', label: 'Media & voice-over', items: [
    ['voice_over', 'Voice-over'], ['tv_host', 'TV / digital hosting'], ['ad_film', 'Ad film'] ] },
].map(g => ({ ...g, items: g.items.map(([id, label]) => ({ id, label })) }))

export const AUDIENCE = [
  { id: '50', label: 'Up to 50', max: 50 }, { id: '100', label: '51–100', max: 100 },
  { id: '250', label: '101–250', max: 250 }, { id: '500', label: '251–500', max: 500 },
  { id: '1000', label: '501–1,000', max: 1000 }, { id: '2500', label: '1,001–2,500', max: 2500 },
  { id: '5000', label: '2,501–5,000', max: 5000 }, { id: 'more', label: 'More than 5,000', max: 100000 },
  { id: 'custom', label: 'Custom' },
]

export const FORMATS = ['Indoor', 'Outdoor', 'Stage-only', 'Walking / moving audience', 'Virtual', 'Hybrid']

export const LANGUAGES_V3 = ['English', 'Hindi', 'Kannada', 'Telugu', 'Tamil', 'Malayalam', 'Marathi', 'Gujarati',
  'Bengali', 'Punjabi', 'Konkani', 'Tulu', 'Urdu', 'Spanish', 'French', 'Arabic', 'German', 'Mandarin']

export const PROFICIENCY_V3 = [
  { value: 'native', label: 'Native' }, { value: 'fluent', label: 'Fluent' }, { value: 'conversational', label: 'Conversational' },
]

export const STYLES_V3 = ['Funny & entertaining', 'Formal & professional', 'High-energy & interactive', 'Storytelling',
  'Poetry & Shayari', 'Games & audience engagement', 'News & interview style']

export const ADDONS_V3 = [
  { id: 'custom_script', label: 'Custom script writing & research', unit: 'per_event', suggest: 5000 },
  { id: 'pre_event_call', label: 'Pre-event planning call', unit: 'per_event', suggest: 1000 },
  { id: 'rehearsal', label: 'Pre-event technical rehearsal', unit: 'per_session', suggest: 3000 },
  { id: 'wardrobe', label: 'Thematic wardrobe', unit: 'per_event', suggest: 4000 },
  { id: 'outfit_changes', label: 'Multiple outfit changes', unit: 'per_event', suggest: 2500 },
  { id: 'wireless_mic', label: 'Premium wireless microphone', unit: 'per_event', suggest: 1500 },
  { id: 'game_props', label: 'Games & audience props', unit: 'per_event', suggest: 2000 },
  { id: 'co_anchor', label: 'Co-anchor / duo partner', unit: 'per_event', suggest: 8000 },
  { id: 'shadow', label: 'Backstage assistant', unit: 'per_event', suggest: 2500 },
  { id: 'social_post', label: 'Social media collaboration', unit: 'per_event', suggest: 3000 },
  { id: 'extra_function', label: 'Additional event function', unit: 'per_session', suggest: 6000 },
]

export const ADDON_UNITS = [
  { value: 'per_event', label: 'Per event' }, { value: 'per_session', label: 'Per session' }, { value: 'per_hour', label: 'Per hour' },
]

export const NOTICE_DAYS = [0, 1, 3, 7, 14]
export const HORIZON_MONTHS = [3, 6, 12, 18]
export const REST_HOURS = [0, 1, 2, 4]
export const MAX_CONSECUTIVE = [4, 6, 8, 10, 12]
export const SLA_V3 = [2, 4, 12, 24]

export const TRAVEL_MODELS = [
  { id: 'included_radius', title: 'Included within my travel area', body: 'No travel charge inside the distance you set.' },
  { id: 'flat', title: 'Flat outstation fee', body: 'One fixed amount for events outside your area.' },
  { id: 'per_km', title: 'Per kilometre', body: 'A rate for every km beyond your area.' },
  { id: 'customer_arranged', title: 'Customer arranges travel & stay', body: 'The customer books and pays for it directly.' },
  { id: 'custom', title: 'Decide per event', body: 'Outstation events always come to you as a custom quote.' },
]

export const CANCELLATION_V3 = [
  { id: 'flexible', title: 'Flexible', body: 'Full refund if cancelled 7+ days before. 50% within 7 days. No refund within 48 hours.' },
  { id: 'moderate', title: 'Moderate', body: '50% refund if cancelled 5+ days before. No refund after that.' },
  { id: 'strict', title: 'Strict', body: 'The advance is not refunded. Any balance paid is refunded if cancelled 7+ days before.' },
]
