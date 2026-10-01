/**
 * Sambramo partner pricing UX catalog.
 *
 * This file is intentionally separate from authoritative pricing data.
 * It contains partner-facing controls, presets and copy suggestions.
 * Saved values still go through the existing vendor_service_id scoped RPC.
 */

export const ROYAL_AMETHYST = '#2A085C'

export const COMMON_PRICING_UNITS = [
  ['package', 'Package'],
  ['per event', 'Per event'],
  ['per hour', 'Per hour'],
  ['per day', 'Per day'],
  ['per trip', 'Per trip'],
  ['per km', 'Per km'],
  ['per person', 'Per person'],
  ['per guest', 'Per guest'],
  ['per item', 'Per item'],
  ['per piece', 'Per piece'],
  ['per batch', 'Per batch'],
  ['per function', 'Per function'],
  ['per project', 'Per project'],
  ['custom quote', 'Custom quote'],
]

const COMMON_SELECTS = {
  menu: ['Chef-curated menu', 'Customer-selected menu', 'Multi-cuisine menu', 'Fixed package menu', 'Custom menu'],
  cuisine: ['South Indian', 'North Indian', 'Multi-cuisine', 'Continental', 'Asian', 'Regional / Traditional', 'Custom'],
  service_style: ['Buffet', 'Plated service', 'Family style', 'Live counters', 'Cocktail / reception service', 'Custom'],
  coverage_hours: ['2', '4', '6', '8', '10', '12', 'Full day'],
  photographers: ['1', '2', '3', '4', '5+'],
  videographers: ['1', '2', '3', '4', '5+'],
  album: ['No album', 'Standard album', 'Premium album', 'Luxury album', 'Digital album'],
  reels: ['0', '1', '2', '3', '5', '8', '10+'],
  drone: ['Not included', 'Included', 'Available as add-on', 'Subject to venue permission'],
  highlight: ['Not included', 'Highlight film', '2–3 minute edit', '5–8 minute edit', 'Custom edit'],
  stage: ['Not included', 'Basic stage', 'Standard stage', 'Premium stage', 'Custom stage'],
  backdrop: ['Not included', 'Fabric backdrop', 'Floral backdrop', 'LED backdrop', 'Premium custom backdrop'],
  mandap: ['Not included', 'Basic mandap', 'Traditional mandap', 'Floral mandap', 'Premium custom mandap'],
  entrance: ['Not included', 'Basic entrance', 'Floral entrance', 'Theme entrance', 'Premium custom entrance'],
  flowers: ['Artificial', 'Fresh seasonal', 'Premium fresh', 'Mixed floral', 'Custom floral design'],
  lighting: ['Basic', 'Ambient', 'Decorative', 'Premium', 'Custom'],
  dimensions: ['Standard', 'Small venue', 'Medium venue', 'Large venue', 'Site measurement required'],
  slot: ['Morning', 'Afternoon', 'Evening', 'Night', 'Full day', 'Custom time slot'],
  rental: ['Venue rental', 'Per plate', 'Half-day rental', 'Full-day rental', 'Custom quote'],
  tent: ['Open lawn canopy', 'Waterproof canopy', 'Pagoda tent', 'Air-cooled tent', 'Premium themed tent'],
  paper: ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', 'Luxury board'],
  finish: ['Matte', 'Gloss', 'Textured', 'Foil', 'Embossed', 'Premium custom'],
  delivery: ['Pickup', 'Local delivery', 'Doorstep delivery', 'Express delivery', 'Delivery + setup'],
  vehicle: ['Sedan', 'SUV', 'Tempo Traveller', 'Minibus', 'Luxury vehicle', 'Partner fleet / custom'],
  vehicle_class: ['Mini pickup', 'LCV', 'Medium truck', 'Large truck', 'Dedicated event freight'],
  fuel_policy: ['Fuel included', 'Fuel extra', 'Fuel by route', 'Customer-provided fuel'],
  route: ['Local Bengaluru', 'Within city limits', 'Bengaluru + outskirts', 'Intercity', 'Route survey required'],
  ac: ['AC', 'Non-AC', 'AC on request', 'Climate-controlled'],
  waiting: ['30 min included', '60 min included', '90 min included', '2 hours included', 'Charged after included time'],
  fixtures: ['4–8', '9–16', '17–32', '33–64', '65+'],
  coverage: ['Head table / stage', 'Small venue', 'Medium venue', 'Large venue', 'Outdoor area', 'Full venue'],
  operator: ['Not included', '1 operator', '2 operators', 'Dedicated operator team', 'Available as add-on'],
  power: ['Standard venue power', 'Single phase', 'Three phase', 'Dedicated power required', 'Generator required'],
  flavour: ['Vanilla', 'Chocolate', 'Red velvet', 'Butterscotch', 'Fresh fruit', 'Regional / custom'],
  customization: ['Standard design', 'Name / message', 'Theme matched', 'Photo / print', 'Fully custom'],
  coverage: ['Standard coverage', 'Bridal only', 'Bridal + family', 'Venue-wide', 'Custom'],
  function: ['Wedding', 'Engagement', 'Reception', 'Pre-wedding', 'Corporate', 'Other event'],
  makeup: ['Traditional', 'HD', 'Airbrush', 'Natural / soft glam', 'Premium editorial'],
  hair: ['Basic styling', 'Blow-dry + styling', 'Curls / waves', 'Updo', 'Premium styling'],
  draping: ['Not included', 'Standard saree drape', 'Pleated drape', 'Designer drape', 'Custom draping'],
  scope: ['Day-of coordination', 'Wedding week', 'Partial planning', 'Full planning', 'Destination planning'],
  product: ['Standard product', 'Premium product', 'Luxury product', 'Branded product', 'Custom product'],
  paper: ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', 'Luxury board'],
  finish: ['Matte', 'Gloss', 'Textured', 'Foil', 'Embossed', 'Premium custom'],
  compliance: ['Compliant / ready', 'Documents available', 'Approval required', 'Customer venue compliance', 'Custom review'],
  technical: ['Basic rider', 'Standard rider', 'Professional rider', 'Venue-specific rider', 'Custom technical rider'],
  rehearsal: ['Not included', '1 rehearsal', '2 rehearsals', 'Venue rehearsal', 'Custom rehearsal plan'],
  language: ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bilingual', 'Multilingual', 'Custom'],
  event_type: ['Wedding', 'Birthday', 'Corporate', 'Product launch', 'Reception', 'Private celebration', 'Custom event'],
  parking_distance: ['On-site', 'Up to 100 m', '100–250 m', '250–500 m', 'Off-site shuttle needed'],
  waste: ['No waste service', 'Basic bins', 'Collection + disposal', 'Segregated waste handling', 'Custom waste plan'],
  first_aid: ['Not included', 'Basic first-aid kit', 'Medic on call', 'Dedicated first-aid desk', 'Custom medical support'],
  ritual: ['Puja', 'Wedding rituals', 'Engagement rituals', 'Housewarming', 'Naming ceremony', 'Custom ritual'],
  tradition: ['South Indian', 'North Indian', 'Kannada', 'Tamil', 'Telugu', 'Malayali', 'Pan-Indian', 'Custom tradition'],
  samagri: ['Partner supplied', 'Customer supplied', 'Basic samagri included', 'Complete samagri included', 'Custom samagri list'],
  packaging: ['Standard pack', 'Premium pack', 'Luxury pack', 'Corporate pack', 'Custom packaging'],
  personalization: ['None', 'Name / initials', 'Message card', 'Logo / branding', 'Theme personalization', 'Fully custom'],
  packing_type: ['Gift wrap', 'Box packing', 'Hamper packing', 'Trousseau packing', 'Premium presentation'],
  box: ['Cardboard', 'Rigid box', 'Magnetic box', 'Wooden box', 'Luxury custom box'],
  material: ['Paper', 'Cardboard', 'Fabric', 'Wood', 'Metal', 'Mixed premium material'],
  inventory: ['Standard inventory', 'Event inventory', 'Furniture inventory', 'AV / technical inventory', 'Custom inventory'],
  equipment: ['Furniture', 'Stage equipment', 'AV equipment', 'Lighting equipment', 'Decor equipment', 'Custom equipment'],
  sku: ['Partner SKU entry', 'Catalog SKU', 'Custom SKU'],
  rental_period: ['4 hours', '8 hours', '1 day', '2 days', '3 days', '1 week', 'Custom period'],
  deposit: ['No deposit', '10%', '20%', '30%', '50%', 'Custom deposit'],
  overtime: ['Not available', 'Hourly overtime', '30-minute blocks', 'After-shift premium', 'Custom'],
  handling: ['Standard handling', 'Fragile handling', 'Heavy handling', 'Loading + unloading', 'On-site placement', 'Custom handling'],
  storage_type: ['Indoor storage', 'Covered storage', 'Pallet storage', 'Racked storage', 'Climate-controlled', 'Open yard'],
  security: ['Standard', 'CCTV monitored', 'Guarded', 'Restricted access', 'High-security / dedicated bay'],
  waste: ['No waste service', 'Basic bins', 'Collection + disposal', 'Segregated waste handling', 'Custom waste plan'],
  fleet: ['Partner vehicle', '2–3 vehicles', '4–6 vehicles', '7–10 vehicles', 'Dedicated event fleet'],
  crew: ['1–2 staff', '3–4 staff', '5–8 staff', '9–12 staff', 'Dedicated event crew'],
}

export const FIELD_OVERRIDES = {
  min_guests: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  guests: { control: 'stepper', presets: [10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  people: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10, 12, 20] },
  performers: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 12] },
  sets: { control: 'stepper', presets: [1, 2, 3, 4, 5] },
  functions: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10] },
  venues: { control: 'stepper', presets: [1, 2, 3, 4, 5] },
  stops: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20] },
  staff: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 12, 20] },
  guards: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  supervisors: { control: 'stepper', presets: [0, 1, 2, 3, 4] },
  attendants: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  entry_points: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8] },
  vehicles: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 15, 20] },
  chairs: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500] },
  tables: { control: 'stepper', presets: [5, 10, 15, 20, 30, 40, 50, 75] },
  area: { control: 'stepper', presets: [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000] },
  rental_days: { control: 'stepper', presets: [1, 2, 3, 4, 5, 7] },
  included_km: { control: 'stepper', presets: [5, 10, 20, 30, 50, 75, 100, 150, 250, 500] },
  included_hours: { control: 'stepper', presets: [1, 2, 4, 6, 8, 10, 12, 24] },
  extra_km: { control: 'currency', presets: [5, 8, 10, 12, 15, 20, 25, 30] },
  duration: { control: 'duration', presets: [1, 2, 3, 4, 6, 8, 10, 12] },
  coverage_hours: { control: 'duration', presets: [2, 4, 6, 8, 10, 12] },
  shift_hours: { control: 'duration', presets: [4, 6, 8, 10, 12, 24] },
  hours: { control: 'duration', presets: [2, 4, 6, 8, 10, 12] },
  shift: { control: 'duration', presets: [4, 6, 8, 10, 12] },
  runtime: { control: 'duration', presets: [2, 4, 6, 8, 10, 12, 24] },
  cable: { control: 'stepper', presets: [10, 25, 50, 75, 100, 150, 200] },
  fixtures: { control: 'choice', options: COMMON_SELECTS.fixtures },
  weight: { control: 'choice', options: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '3 kg', '5 kg', '10 kg+'] },
  servings: { control: 'stepper', presets: [2, 4, 6, 8, 10, 12] },
  tiers: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6] },
  quantity: { control: 'stepper', presets: [10, 25, 50, 100, 150, 200, 300, 500, 1000] },
  moq: { control: 'stepper', presets: [1, 5, 10, 25, 50, 100, 250, 500, 1000] },
  stock: { control: 'stepper', presets: [0, 10, 25, 50, 100, 250, 500, 1000] },
  mics: { control: 'stepper', presets: [1, 2, 4, 6, 8, 12, 16] },
  speakers: { control: 'stepper', presets: [2, 4, 6, 8, 10, 12, 16] },
  subwoofers: { control: 'stepper', presets: [0, 1, 2, 4, 6, 8] },
  audience: { control: 'stepper', presets: [25, 50, 100, 150, 200, 300, 500, 750, 1000] },
  payload: { control: 'stepper', presets: [250, 500, 750, 1000, 1500, 2500, 5000, 7500, 10000] },
  tonnage: { control: 'choice', options: ['1 T', '2 T', '5 T', '7.5 T', '10 T', '16 T', '20 T', '25 T'] },
  cable: { control: 'choice', options: ['10 m', '25 m', '50 m', '75 m', '100 m', '150 m', '200 m'] },
  capacity: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  toilets: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  priests: { control: 'stepper', presets: [1, 2, 3, 4, 5, 7, 10] },
  items: { control: 'stepper', presets: [5, 10, 20, 30, 50, 75, 100] },
  packing_type: { control: 'choice', options: COMMON_SELECTS.packing_type },
  box: { control: 'choice', options: COMMON_SELECTS.box },
  storage_type: { control: 'choice', options: COMMON_SELECTS.storage_type },
  security: { control: 'choice', options: COMMON_SELECTS.security },
}

export const TRADE_ADDONS = {
  E01: ['Live counter station', 'Welcome drink station', 'Dessert counter', 'Service staff upgrade', 'Premium crockery / cutlery'],
  E02: ['Drone coverage', 'Same-day teaser', 'Extra photographer', 'Album upgrade', 'Photo booth'],
  E03: ['Drone coverage', 'Same-day highlight', 'Extra videographer', 'Vertical reel pack', 'Cinematic teaser'],
  E04: ['Fresh floral upgrade', 'LED backdrop', 'Entrance décor', 'Ceiling décor', 'Theme customization'],
  E05: ['Extra hour', 'Additional seating block', 'Cleaning support', 'Power backup', 'Venue décor coordination'],
  E06: ['Extra hour', 'LED wall', 'Uplighting package', 'Additional subwoofer', 'DJ console upgrade'],
  E07: ['Extra performance set', 'Backline / instruments', 'Costume support', 'Rehearsal session', 'Travel extension'],
  E08: ['Family makeup slot', 'HD upgrade', 'Airbrush upgrade', 'Draping service', 'Hair extension styling'],
  E09: ['Extra planning meeting', 'Guest RSVP management', 'Vendor coordination', 'On-site coordinator', 'Destination travel coordination'],
  E10: ['Premium chairs', 'Table linen upgrade', 'Stage upgrade', 'Cooling package', 'Installation support'],
  E11: ['Rush printing', 'Premium paper', 'Foil finish', 'Envelope upgrade', 'Delivery + assembly'],
  E12: ['Extra km', 'Extra hour', 'Airport / railway transfer', 'Meet-and-greet', 'Additional vehicle'],
  E13: ['Extra lighting zone', 'Operator upgrade', 'Power distribution', 'Rigging support', 'Site installation'],
  E14: ['Fondant design', 'Extra tier', 'Dessert table', 'Custom topper', 'Express delivery'],
  E15: ['Extra artist', 'Extended hours', 'Family henna slots', 'Premium bridal design', 'Travel extension'],
  E16: ['Bilingual hosting', 'Extended hosting time', 'Rehearsal', 'Games / crowd engagement', 'Additional event segment'],
  E17: ['LED wall', 'Extra microphone', 'Stage monitor', 'Operator upgrade', 'Recording / streaming'],
  E18: ['Additional attendant', 'Extended hours', 'Shuttle support', 'Premium vehicle handling', 'Late-night extension'],
  E19: ['Additional guard', 'Female security staff', 'Supervisor upgrade', 'Crowd barricade support', 'Extended shift'],
  E20: ['Welcome drink station', 'Mocktail bar', 'Live juice counter', 'Extra bartender', 'Glassware upgrade'],
  E21: ['Additional host staff', 'Registration desk', 'Usher team', 'Concierge upgrade', 'Extended hours'],
  E22: ['Additional kVA', 'Extended runtime', 'Cable extension', 'Cooling unit', 'Dedicated operator'],
  E23: ['Additional portable toilet', 'Waste collection', 'First-aid desk', 'Sanitation upgrade', 'Extended service'],
  E24: ['Complete samagri', 'Additional priest', 'Extended ritual support', 'Traditional instruments', 'Travel support'],
  E25: ['Premium packaging', 'Personalization', 'Branded insert', 'Gift assembly', 'Express delivery'],
  E26: ['Luxury box upgrade', 'Ribbon personalization', 'Branded tag', 'Assembly support', 'Pickup / delivery'],
  L01: ['Extra km', 'Extra hour', 'Loading support', 'Waiting time', 'Additional trip'],
  L02: ['Extra km', 'Loading support', 'Unloading support', 'Waiting time', 'Dedicated vehicle upgrade'],
  L03: ['Extra km', 'Extra hour', 'Waiting time', 'Additional vehicle', 'Driver overtime'],
  L04: ['Extra rental day', 'Installation support', 'Pickup / return handling', 'Premium equipment upgrade', 'Damage waiver'],
  L05: ['Extra crew member', 'Overtime block', 'Heavy handling', 'Night shift', 'Equipment handling'],
  L06: ['Extra storage volume', 'Extended storage day', 'Loading / unloading', 'Premium security', 'Dedicated bay'],
  L07: ['Branded packaging', 'Bulk delivery', 'Rush fulfillment', 'Assembly / packing', 'Custom material sourcing'],
  L08: ['Additional stop', 'Extra vehicle', 'Extra crew', 'Route survey', 'Event-day coordinator'],
}

const COMMON_DESCRIPTIONS = [
  ({ name, fieldNames }) => `Professional ${name} package with ${fieldNames[0] ?? 'defined scope'}, ${fieldNames[1] ?? 'clear inclusions'} and coordinated event-day service.`,
  ({ name, template }) => `${name} package based on the ${template ?? 'Sambramo starter'} structure, with transparent pricing and configurable extras.`,
  ({ name, fieldNames }) => `Flexible ${name} setup with ${fieldNames[0] ?? 'structured requirements'}, ${fieldNames[1] ?? 'clear service coverage'} and optional upgrades.`,
  ({ name }) => `Customer-ready ${name} package with defined capacity, service coverage and a clear commercial basis.`,
  ({ name }) => `End-to-end ${name} support with a simple package structure, optional add-ons and review-ready pricing.`,
]

export function getDescriptionSuggestions(config) {
  const fieldNames = (config?.fields ?? []).slice(0, 3).map(f => f.label.toLowerCase())
  const templates = config?.templates ?? []
  return COMMON_DESCRIPTIONS.map((builder, index) => builder({
    name: config?.name ?? 'service',
    fieldNames,
    template: templates[index]?.[1],
  }))
}

export function getPackageNameSuggestions(config) {
  return (config?.templates ?? []).slice(0, 5).map(t => t[1])
}

export function getAddonSuggestions(config) {
  return (TRADE_ADDONS[config?.trade_id] ?? [
    'Priority service upgrade',
    'Extended service time',
    'Additional resource',
    'Premium setup',
    'Custom requirement',
  ]).map((name, index) => ({
    id: `${config?.trade_id ?? 'trade'}-addon-${index}`,
    name,
    hint: 'Suggested for this trade',
    unit: defaultAddonUnit(config),
  }))
}

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}

export function getFieldSchema(field, config) {
  const key = field?.key
  const override = FIELD_OVERRIDES[key]
  if (override) return { ...field, ...override }
  if (COMMON_SELECTS[key]) return { ...field, control: 'choice', options: COMMON_SELECTS[key] }
  if (field?.type === 'currency') return { ...field, control: 'currency', presets: [50, 100, 250, 500, 1000, 2500, 5000, 10000] }
  if (field?.type === 'number') return { ...field, control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10, 12, 20, 25, 50, 100] }
  return { ...field, control: 'choice', options: ['Standard', 'Premium', 'Included', 'Available as add-on', 'Site-specific', 'Custom'] }
}

export function getNumericPresets({ key, config, kind = 'quantity' }) {
  const schema = getFieldSchema({ key, type: 'number', label: key }, config)
  if (kind === 'currency') return schema.presets ?? [100, 250, 500, 1000, 2500, 5000, 10000]
  if (kind === 'duration') return schema.presets ?? [1, 2, 4, 6, 8, 12]
  return schema.presets ?? [1, 2, 4, 5, 10, 25, 50, 100]
}

export function getMinimumOrderPresets(config, unit) {
  if (config?.trade_id === 'E01') return [25, 50, 75, 100, 150, 200, 300, 500]
  if (String(unit).includes('guest') || String(unit).includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (String(unit).includes('hour')) return [1, 2, 4, 6, 8]
  if (String(unit).includes('day')) return [1, 2, 3, 5, 7]
  if (String(unit).includes('trip')) return [1, 2, 3, 4, 5]
  if (String(unit).includes('item') || String(unit).includes('piece')) return [1, 5, 10, 25, 50, 100, 250]
  return [1, 2, 5, 10, 25]
}

export function getIncludedQuantityPresets(config, unit) {
  if (config?.trade_id === 'E01') return [25, 50, 75, 100, 150, 200, 300, 500]
  if (String(unit).includes('guest') || String(unit).includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (String(unit).includes('item') || String(unit).includes('piece')) return [1, 5, 10, 25, 50, 100]
  if (config?.mode === 'RATE_CARD') return [0, 1, 5, 10, 20, 30, 50, 100]
  return [0, 1, 2, 4, 5, 10, 20, 50]
}

export const LEAD_TIME_PRESETS = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30]

export const TRAVEL_POLICIES = [
  ['included', 'Included in package'],
  ['zone_based', 'Zone-based'],
  ['per_km', 'Per km'],
  ['customer_pickup', 'Customer pickup'],
  ['quote', 'Quote on request'],
]

export const PACKAGE_TIERS = [
  ['essential', 'Essential'],
  ['standard', 'Standard'],
  ['classic', 'Classic'],
  ['premium', 'Premium'],
  ['luxury', 'Luxury'],
  ['custom', 'Custom'],
]

export const PRICE_PRESETS = [250, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000]

export const INCLUSIONS_BY_MODE = {
  PACKAGE: ['Setup / service crew', 'Standard equipment', 'Basic coordination', 'Customer support'],
  RATE_CARD: ['Driver / operator', 'Standard loading support', 'Standard service window', 'Digital order updates'],
  CATALOG: ['Standard packing', 'Local delivery option', 'Basic quality check', 'Order confirmation'],
  HYBRID: ['Core service scope', 'Standard setup', 'Event-day coordination', 'Customer support'],
  CUSTOM: ['Scope discussion', 'Dedicated coordination', 'Custom requirements handling', 'Final quote before confirmation'],
}

export const EXCLUSIONS_BY_MODE = {
  PACKAGE: ['Extra time beyond included duration', 'Out-of-area travel', 'Special equipment', 'Customer-requested upgrades'],
  RATE_CARD: ['Waiting beyond included time', 'Toll / parking where applicable', 'Extra route distance', 'Special handling'],
  CATALOG: ['Rush fulfilment', 'Custom branding', 'Special delivery windows', 'Non-standard quantities'],
  HYBRID: ['Out-of-scope upgrades', 'Extra duration', 'Additional travel', 'Special site requirements'],
  CUSTOM: ['Third-party charges', 'Unapproved scope additions', 'Last-minute changes', 'Non-standard logistics'],
}
