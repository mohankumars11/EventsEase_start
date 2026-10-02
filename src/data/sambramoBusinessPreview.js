/**
 * Sambramo Business Preview + Listing Lifecycle configuration.
 *
 * One renderer, 34 trade-specific storefront schemas.
 * This file defines UI structure and readiness semantics only.
 * It never becomes the authoritative source of vendor rates.
 */

export const PREVIEW_VERSION = 1

const F = (key, label, type = 'text') => ({ key, label, type })

const trade = (trade_id, name, pillar, mode, templates, fields, extra = {}) => ({
  trade_id,
  name,
  pillar,
  mode,
  templates,
  fields,
  siteMode: 'NONE',
  sections: ['hero', 'offerings', 'service_area', 'availability'],
  ...extra,
})

export const TRADE_PREVIEW_CONFIG = [
  trade('E01', 'Catering & Food', 'Events', 'HYBRID',
    [['CATERING_CLASSIC', 'Classic Catering'], ['CATERING_PREMIUM', 'Premium Catering'], ['CATERING_LIVE', 'Live Counter Experience']],
    [F('menu', 'Menu'), F('cuisine', 'Cuisine'), F('min_guests', 'Minimum guests', 'number'), F('service_style', 'Service style'), F('rate', 'Partner supply rate', 'currency')],
    { sections: ['hero', 'offerings', 'menu', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E02', 'Photography', 'Events', 'PACKAGE',
    [['PHOTO_ESSENTIAL', 'Essential Coverage'], ['PHOTO_CLASSIC', 'Classic Wedding'], ['PHOTO_PREMIUM', 'Premium Wedding'], ['PHOTO_CINEMATIC', 'Cinematic Collection']],
    [F('coverage_hours', 'Coverage hours', 'number'), F('photographers', 'Photographers', 'number'), F('album', 'Album'), F('reels', 'Reels', 'number'), F('drone', 'Drone')],
    { sections: ['hero', 'portfolio', 'offerings', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E03', 'Videography', 'Events', 'PACKAGE',
    [['VIDEO_ESSENTIAL', 'Essential Video'], ['VIDEO_FILM', 'Wedding Film'], ['VIDEO_CINEMATIC', 'Cinematic Production'], ['VIDEO_PREMIUM', 'Premium Film']],
    [F('coverage_hours', 'Coverage hours', 'number'), F('videographers', 'Videographers', 'number'), F('highlight', 'Highlight film'), F('reels', 'Reels', 'number'), F('drone', 'Drone')],
    { sections: ['hero', 'portfolio', 'offerings', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E04', 'Decoration & Floral', 'Events', 'HYBRID',
    [['DECOR_BASIC', 'Basic Decor'], ['DECOR_CLASSIC', 'Classic Decor'], ['DECOR_PREMIUM', 'Premium Decor'], ['DECOR_LUXURY', 'Luxury Floral'], ['DECOR_THEME', 'Custom Theme']],
    [F('stage', 'Stage'), F('backdrop', 'Backdrop'), F('mandap', 'Mandap'), F('entrance', 'Entrance'), F('flowers', 'Flowers'), F('lighting', 'Lighting'), F('dimensions', 'Dimensions')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'portfolio', 'offerings', 'components', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E05', 'Venue', 'Events', 'HYBRID',
    [['VENUE_RENTAL', 'Hall Rental'], ['VENUE_PLATE', 'Per Plate Package'], ['VENUE_ALL_IN', 'All-Inclusive'], ['VENUE_PREMIUM', 'Premium Venue']],
    [F('capacity', 'Capacity', 'number'), F('slot', 'Slot'), F('rental', 'Rental price', 'currency'), F('per_plate', 'Per-person price', 'currency')],
    { sections: ['hero', 'gallery', 'offerings', 'capacity', 'policies', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E06', 'DJ & Music', 'Events', 'PACKAGE',
    [['DJ_BASIC', 'DJ Basic'], ['DJ_SOUND', 'DJ + Sound'], ['DJ_LIGHTING', 'DJ + Sound + Lighting'], ['DJ_PREMIUM', 'Premium DJ Experience']],
    [F('duration', 'Duration', 'number'), F('speakers', 'Speakers', 'number'), F('subwoofers', 'Subwoofers', 'number'), F('lighting', 'Lighting'), F('led', 'LED wall')]),
  trade('E07', 'Live Entertainment', 'Events', 'PACKAGE',
    [['LIVE_SOLO', 'Solo Artist'], ['LIVE_DUO', 'Duo / Trio'], ['LIVE_BAND', 'Band'], ['LIVE_DANCE', 'Dance Troupe'], ['LIVE_PREMIUM', 'Premium Act']],
    [F('performers', 'Performers', 'number'), F('duration', 'Performance duration', 'number'), F('sets', 'Sets', 'number'), F('technical', 'Technical rider')]),
  trade('E08', 'Bridal Makeup & Hair', 'Events', 'PACKAGE',
    [['MAKEUP_BASIC', 'Bridal Basic'], ['MAKEUP_HD', 'HD Bridal'], ['MAKEUP_AIRBRUSH', 'Airbrush Bridal'], ['MAKEUP_PREMIUM', 'Bridal Premium'], ['MAKEUP_FAMILY', 'Family Makeup']],
    [F('function', 'Function'), F('makeup', 'Makeup type'), F('hair', 'Hair styling'), F('draping', 'Draping'), F('people', 'People', 'number')]),
  trade('E09', 'Wedding Planning', 'Events', 'CUSTOM',
    [['PLAN_DAY_OF', 'Day-of Coordination'], ['PLAN_WEEK', 'Wedding Week'], ['PLAN_PARTIAL', 'Partial Planning'], ['PLAN_FULL', 'Full Planning'], ['PLAN_DESTINATION', 'Destination Planning']],
    [F('functions', 'Functions', 'number'), F('guests', 'Guest count', 'number'), F('venues', 'Venues', 'number'), F('scope', 'Planning scope')],
    { sections: ['hero', 'offerings', 'scope', 'service_area', 'availability', 'quote_readiness'] }),
  trade('E10', 'Tent & Furniture', 'Events', 'HYBRID',
    [['TENT_50', '50 Guest Setup'], ['TENT_100', '100 Guest Setup'], ['TENT_200', '200 Guest Setup'], ['TENT_RECEPTION', 'Reception Setup'], ['TENT_OUTDOOR', 'Premium Outdoor Setup']],
    [F('tent', 'Tent type'), F('chairs', 'Chairs', 'number'), F('tables', 'Tables', 'number'), F('area', 'Area', 'number'), F('rental_days', 'Rental days', 'number')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'offerings', 'inventory', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E11', 'Invitation & Printing', 'Events', 'PACKAGE',
    [['INV_DIGITAL', 'Digital Invitation'], ['INV_STANDARD', 'Standard Printed'], ['INV_PREMIUM', 'Premium Printed'], ['INV_LUXURY', 'Luxury Invitation Box']],
    [F('product', 'Product'), F('quantity', 'Quantity', 'number'), F('paper', 'Paper / GSM'), F('finish', 'Finish'), F('delivery', 'Delivery')]),
  trade('E12', 'Event Cars & Guest Transfers', 'Events', 'RATE_CARD',
    [['CAR_SEDAN', 'Sedan Transfer'], ['CAR_SUV', 'SUV Transfer'], ['CAR_TEMPO', 'Tempo Traveller'], ['CAR_SHUTTLE', 'Premium Guest Shuttle'], ['CAR_LUXURY', 'Luxury Wedding Car']],
    [F('vehicle', 'Vehicle'), F('seats', 'Seats', 'number'), F('included_km', 'Included km', 'number'), F('included_hours', 'Included hours', 'number'), F('extra_km', 'Extra km', 'currency')],
    { sections: ['hero', 'vehicles', 'offerings', 'rate_card', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E13', 'Event Lighting', 'Events', 'PACKAGE',
    [['LIGHT_BASIC', 'Basic Lighting'], ['LIGHT_STAGE', 'Stage Lighting'], ['LIGHT_WEDDING', 'Wedding Lighting'], ['LIGHT_PREMIUM', 'Premium Lighting']],
    [F('fixtures', 'Fixture count', 'number'), F('coverage', 'Coverage'), F('operator', 'Operator'), F('power', 'Power requirement')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'portfolio', 'offerings', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E14', 'Cake & Desserts', 'Events', 'CATALOG',
    [['CAKE_CLASSIC', 'Classic Cake'], ['CAKE_PREMIUM', 'Premium Cake'], ['CAKE_DESIGNER', 'Designer Cake'], ['CAKE_WEDDING', 'Wedding Tier Cake'], ['DESSERT_TABLE', 'Dessert Table']],
    [F('weight', 'Weight', 'number'), F('servings', 'Servings', 'number'), F('flavour', 'Flavour'), F('tiers', 'Tiers', 'number'), F('customization', 'Customization')]),
  trade('E15', 'Mehendi Artist', 'Events', 'PACKAGE',
    [['MEHENDI_BRIDAL', 'Bridal Basic'], ['MEHENDI_GRANDEUR', 'Bridal Grandeur'], ['MEHENDI_FAMILY', 'Family Package'], ['MEHENDI_GUEST', 'Guest Package']],
    [F('coverage', 'Coverage'), F('artists', 'Artists', 'number'), F('guests', 'Guest count', 'number'), F('duration', 'Hours', 'number')]),
  trade('E16', 'Anchor & MC', 'Events', 'PACKAGE',
    [['MC_BASIC', 'Basic Host'], ['MC_PRO', 'Professional Anchor'], ['MC_BILINGUAL', 'Bilingual Anchor'], ['MC_PREMIUM', 'Premium Event Host']],
    [F('language', 'Language'), F('event_type', 'Event type'), F('duration', 'Duration', 'number'), F('rehearsal', 'Rehearsal')]),
  trade('E17', 'Sound & AV', 'Events', 'HYBRID',
    [['AV_SMALL', 'Small Event AV'], ['AV_WEDDING', 'Wedding AV'], ['AV_CORPORATE', 'Corporate AV'], ['AV_PREMIUM', 'Premium AV Production']],
    [F('audience', 'Audience', 'number'), F('speakers', 'Speakers', 'number'), F('mics', 'Microphones', 'number'), F('led', 'LED wall'), F('operator', 'Operator')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'equipment', 'offerings', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E18', 'Valet Parking', 'Events', 'PACKAGE',
    [['VALET_4H', '4-Hour Valet'], ['VALET_8H', '8-Hour Valet'], ['VALET_DAY', 'Full-Day Valet']],
    [F('vehicles', 'Expected vehicles', 'number'), F('attendants', 'Attendants', 'number'), F('duration', 'Duration', 'number'), F('parking_distance', 'Parking distance')]),
  trade('E19', 'Security Services', 'Events', 'HYBRID',
    [['SEC_BASIC', 'Basic Event Security'], ['SEC_WEDDING', 'Wedding Security'], ['SEC_CROWD', 'Crowd Control'], ['SEC_PREMIUM', 'Premium Security Team']],
    [F('guards', 'Guards', 'number'), F('supervisors', 'Supervisors', 'number'), F('shift_hours', 'Shift hours', 'number'), F('entry_points', 'Entry points', 'number')]),
  trade('E20', 'Bar & Beverages', 'Events', 'HYBRID',
    [['BAR_MOCKTAIL', 'Mocktail Package'], ['BAR_WELCOME', 'Welcome Drinks'], ['BAR_JUICE', 'Juice Package'], ['BAR_COUNTER', 'Live Beverage Counter'], ['BAR_NONALCOHOLIC', 'Non-Alcoholic Bar']],
    [F('menu', 'Menu'), F('guests', 'Guests', 'number'), F('servings', 'Servings / person', 'number'), F('bartenders', 'Bartenders', 'number'), F('compliance', 'Compliance status')],
    { sections: ['hero', 'offerings', 'menu', 'addons', 'compliance', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E21', 'Guest Services', 'Events', 'PACKAGE',
    [['GUEST_REG', 'Registration Team'], ['GUEST_WELCOME', 'Welcome Desk'], ['GUEST_USHER', 'Usher Team'], ['GUEST_HOSPITALITY', 'Guest Hospitality Team'], ['GUEST_CONCIERGE', 'Premium Concierge']],
    [F('staff', 'Staff', 'number'), F('hours', 'Hours', 'number'), F('language', 'Language'), F('supervisor', 'Supervisor')]),
  trade('E22', 'Power & Cooling', 'Events', 'HYBRID',
    [['POWER_5KVA', '5 KVA Power'], ['POWER_10KVA', '10 KVA Power'], ['POWER_25KVA', '25 KVA Event Power'], ['COOLING', 'Cooling Package'], ['POWER_COOLING', 'Power + Cooling']],
    [F('capacity', 'Capacity / kVA', 'number'), F('runtime', 'Runtime', 'number'), F('operator', 'Operator'), F('cable', 'Cable length', 'number')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'equipment', 'offerings', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E23', 'Safety & Facilities', 'Events', 'HYBRID',
    [['SAFE_BASIC', 'Basic Facility Package'], ['SAFE_WEDDING', 'Wedding Facility Pack'], ['SAFE_OUTDOOR', 'Outdoor Facility Pack'], ['SAFE_PREMIUM', 'Premium Safety Package']],
    [F('toilets', 'Portable toilets', 'number'), F('waste', 'Waste service'), F('first_aid', 'First aid'), F('duration', 'Duration', 'number')],
    { siteMode: 'OPTIONAL_SURVEY', sections: ['hero', 'offerings', 'facilities', 'measurements', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('E24', 'Priest & Rituals', 'Events', 'PACKAGE',
    [['PUJA_BASIC', 'Basic Puja'], ['PUJA_WEDDING', 'Wedding Ceremony'], ['PUJA_TRADITIONAL', 'Traditional Wedding Package'], ['PUJA_COMPLETE', 'Complete Ritual Package']],
    [F('ritual', 'Ritual type'), F('tradition', 'Tradition'), F('language', 'Language'), F('priests', 'Priests', 'number'), F('samagri', 'Samagri')]),
  trade('E25', 'Gifts & Favours', 'Events', 'CATALOG',
    [['GIFT_BUDGET', 'Budget Favours'], ['GIFT_CLASSIC', 'Classic Gifts'], ['GIFT_PREMIUM', 'Premium Gifts'], ['GIFT_CORPORATE', 'Corporate Gifts'], ['GIFT_PERSONALIZED', 'Personalized Favours']],
    [F('product', 'Product'), F('quantity', 'Quantity', 'number'), F('packaging', 'Packaging'), F('personalization', 'Personalization'), F('lead_time', 'Lead time', 'number')]),
  trade('E26', 'Trousseau & Gift Packing', 'Events', 'PACKAGE',
    [['TROUSSEAU_BASIC', 'Basic Packing'], ['TROUSSEAU_PREMIUM', 'Premium Trousseau'], ['TROUSSEAU_LUXURY', 'Luxury Gift Box'], ['TROUSSEAU_COMPLETE', 'Complete Wedding Packing']],
    [F('packing_type', 'Packing type'), F('box', 'Box type'), F('items', 'Item count', 'number'), F('material', 'Material'), F('personalization', 'Personalization')]),
  trade('L01', 'Mini Truck / Pickup', 'Logistics', 'RATE_CARD',
    [['TRUCK_LOCAL', 'Mini Pickup — Local'], ['TRUCK_EVENT', 'Event Material Transport'], ['TRUCK_DEDICATED', 'Dedicated Event Pickup'], ['TRUCK_HALF_DAY', 'Half-Day Vehicle']],
    [F('vehicle', 'Vehicle class'), F('payload', 'Payload', 'number'), F('included_km', 'Included km', 'number'), F('included_hours', 'Included hours', 'number'), F('extra_km', 'Extra km', 'currency')],
    { sections: ['hero', 'vehicle', 'rate_card', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('L02', 'Medium / Large Goods Vehicle', 'Logistics', 'RATE_CARD',
    [['LGV_LIGHT', 'Light Goods Vehicle'], ['LGV_MEDIUM', 'Medium Truck'], ['LGV_LARGE', 'Large Truck'], ['LGV_FREIGHT', 'Dedicated Event Freight']],
    [F('vehicle_class', 'Vehicle class'), F('tonnage', 'Tonnage', 'number'), F('payload', 'Payload', 'number'), F('route', 'Route'), F('fuel_policy', 'Fuel policy')],
    { sections: ['hero', 'vehicle', 'rate_card', 'route_rules', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('L03', 'Group Passenger Transport', 'Logistics', 'RATE_CARD',
    [['PASS_9', '9-Seater'], ['PASS_12', '12-Seater'], ['PASS_16', '16-Seater'], ['PASS_25', '25-Seater'], ['PASS_35', '35-Seater'], ['PASS_49', '49-Seater']],
    [F('vehicle', 'Vehicle'), F('seats', 'Seats', 'number'), F('ac', 'AC / Non-AC'), F('included_km', 'Included km', 'number'), F('waiting', 'Waiting')],
    { sections: ['hero', 'vehicle', 'rate_card', 'route_rules', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('L04', 'Event Equipment Rental', 'Logistics', 'CATALOG',
    [['EQUIP_BASIC', 'Basic Equipment Pack'], ['EQUIP_WEDDING', 'Wedding Equipment Pack'], ['EQUIP_STAGE', 'Stage & Furniture Pack'], ['EQUIP_PREMIUM', 'Premium Event Equipment']],
    [F('equipment', 'Equipment'), F('sku', 'SKU'), F('quantity', 'Quantity', 'number'), F('rental_period', 'Rental period'), F('deposit', 'Security deposit', 'currency')]),
  trade('L05', 'Loading & Unloading Crew', 'Logistics', 'RATE_CARD',
    [['CREW_2', '2-Person Crew'], ['CREW_4', '4-Person Crew'], ['CREW_6', '6-Person Crew'], ['CREW_HEAVY', 'Heavy Handling Team']],
    [F('crew_size', 'Crew size', 'number'), F('shift', 'Shift duration', 'number'), F('overtime', 'Overtime'), F('handling', 'Handling scope')],
    { sections: ['hero', 'crew', 'rate_card', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('L06', 'Warehouse / Storage', 'Logistics', 'RATE_CARD',
    [['STORAGE_SHORT', 'Short-Term Storage'], ['STORAGE_EVENT', 'Event Inventory Storage'], ['STORAGE_PALLET', 'Pallet Storage'], ['STORAGE_SECURE', 'Secure Storage']],
    [F('storage_type', 'Storage type'), F('capacity', 'Capacity', 'number'), F('duration', 'Duration', 'number'), F('handling', 'Handling'), F('security', 'Security level')]),
  trade('L07', 'Event Materials Supplier', 'Logistics', 'CATALOG',
    [['MATERIALS_STANDARD', 'Standard Materials'], ['MATERIALS_BULK', 'Bulk Event Materials'], ['MATERIALS_BRANDED', 'Branded Materials'], ['MATERIALS_CUSTOM', 'Custom Materials']],
    [F('sku', 'SKU'), F('product', 'Product'), F('unit', 'Unit'), F('price', 'Price', 'currency'), F('moq', 'MOQ', 'number'), F('stock', 'Stock', 'number')],
    { sections: ['hero', 'catalog', 'offerings', 'inventory', 'delivery', 'addons', 'service_area', 'availability', 'pricing_readiness'] }),
  trade('L08', 'End-to-End Event Logistics', 'Logistics', 'CUSTOM',
    [['LOG_SMALL', 'Small Event Logistics'], ['LOG_WEDDING', 'Wedding Day Logistics'], ['LOG_VENDOR', 'Multi-Vendor Coordination'], ['LOG_EVENT_DAY', 'Event-Day Logistics']],
    [F('functions', 'Functions', 'number'), F('venues', 'Venues', 'number'), F('stops', 'Stops', 'number'), F('fleet', 'Fleet'), F('crew', 'Manpower')],
    { siteMode: 'SURVEY_OR_CUSTOM', sections: ['hero', 'project_scope', 'offerings', 'route', 'fleet', 'manpower', 'measurements', 'service_area', 'quote_readiness'] }),
]

export const TRADE_BY_ID = Object.fromEntries(TRADE_PREVIEW_CONFIG.map(x => [x.trade_id, x]))
export const TRADE_BY_NAME = Object.fromEntries(TRADE_PREVIEW_CONFIG.map(x => [x.name, x]))

const TRADE_ALIASES = {
  'Emcee / anchor': 'Anchor & MC',
  'Emcee / Anchor': 'Anchor & MC',
  'Warehouse / storage': 'Warehouse / Storage',
  'Warehouse / Storage': 'Warehouse / Storage',
  'Transportation': 'Group Passenger Transport',
}

export const normalizeTrade = (tradeName, tradeId) => {
  const alias = TRADE_ALIASES[tradeName] ?? TRADE_ALIASES[String(tradeName ?? '').trim()]
  return (
    TRADE_BY_ID[tradeId] ??
    TRADE_BY_NAME[tradeName] ??
    TRADE_BY_NAME[alias] ??
    TRADE_PREVIEW_CONFIG.find(x => x.name.toLowerCase() === String(alias ?? tradeName ?? '').toLowerCase()) ??
    TRADE_PREVIEW_CONFIG[0]
  )
}

export const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'bg-white/10 text-white ring-white/15', description: 'Your customer storefront is still being prepared.' },
  READY_TO_SUBMIT: { label: 'Ready to submit', tone: 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/25', description: 'All currently required setup checks have passed.' },
  UNDER_REVIEW: { label: 'Under review', tone: 'bg-amber-300/15 text-amber-100 ring-amber-200/20', description: 'Sambramo is reviewing this submission. Minimum review window: 2 hours.' },
  ACTION_REQUIRED: { label: 'Action required', tone: 'bg-rose-400/15 text-rose-100 ring-rose-300/20', description: 'Sambramo sent this submission back for correction.' },
  LIVE: { label: 'LIVE', tone: 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/25', description: 'Customers can see the approved version.' },
  PAUSED: { label: 'Paused', tone: 'bg-white/10 text-white ring-white/15', description: 'Your storefront is hidden until you resume it.' },
}

export const PRICING_STATES = {
  CONFIGURED: { label: 'Pricing configured', detail: 'Structured partner inputs are saved. Sambramo validates final eligibility at booking time.' },
  INSTANT_QUOTE: { label: 'Instant quote lane', detail: 'This trade supports a controlled machine-generated quote lane when all determinants are known.' },
  PROVISIONAL_QUOTE: { label: 'Provisional quote', detail: 'A measurement or verification step remains.' },
  QUOTE_ACTION_REQUIRED: { label: 'Action required', detail: 'Sambramo needs more information before a final result.' },
  UNAVAILABLE: { label: 'Unavailable', detail: 'Eligibility, capacity or availability does not currently pass.' },
}

export function storefrontStatus(vendor, listings = []) {
  if (!vendor) return 'DRAFT'
  if (vendor.verification_status === 'rejected') return 'ACTION_REQUIRED'
  if (vendor.verification_status === 'submitted') return 'UNDER_REVIEW'
  if (vendor.is_verified && vendor.status === 'APPROVED') return 'LIVE'
  const hasConfigured = listings.some(l => (l.offerings?.length ?? 0) > 0)
  return hasConfigured ? 'READY_TO_SUBMIT' : 'DRAFT'
}

export function pricingReadiness(listing) {
  const offerings = listing?.offerings ?? []
  if (!offerings.length) return { state: 'UNAVAILABLE', ready: false, blockers: ['Add at least one sellable offering.'] }
  const active = offerings.filter(o => o.is_active !== false)
  if (!active.length) return { state: 'UNAVAILABLE', ready: false, blockers: ['No active offering is available.'] }

  const packages = active.flatMap(o => Array.isArray(o.pricing_packages) ? o.pricing_packages : [])
    .filter(p => p.status !== 'ARCHIVED')
  const tradeId = normalizeTrade(listing.trade, listing.trade_id).trade_id

  if (!packages.length) {
    return { state: 'UNAVAILABLE', ready: false, blockers: ['Configure at least one pricing package for every listed service.'] }
  }

  if (['E09', 'E20', 'L08'].includes(tradeId)) {
    return { state: 'INSTANT_QUOTE', ready: true, blockers: [], note: 'The final quote remains controlled by the Sambramo server-side engine.' }
  }

  const hasConfiguredRate = packages.some(p => Number(p?.price?.rate_paise ?? 0) > 0)
  if (!hasConfiguredRate) {
    return { state: 'QUOTE_ACTION_REQUIRED', ready: false, blockers: ['Add a positive commercial rate before pricing can be enabled.'] }
  }

  const hasLive = packages.some(p => p.status === 'LIVE')
  return {
    state: hasLive ? 'CONFIGURED' : 'CONFIGURED',
    ready: true,
    blockers: [],
    note: hasLive
      ? 'An approved pricing package is enabled for this listing.'
      : 'Pricing is configured for this listing and will become customer-live after the required review.'
  }
}
