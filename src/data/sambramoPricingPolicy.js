/**
 * Sambramo's product-level pricing policy for all 34 trades.
 * A trade is a family. The sellable offering is what gets classified.
 */
export const PRICING_STATES = Object.freeze({
  INSTANT_BOOK: 'INSTANT_BOOK',
  INSTANT_QUOTE: 'INSTANT_QUOTE',
  PROVISIONAL_QUOTE: 'PROVISIONAL_QUOTE',
  VENDOR_QUOTE: 'VENDOR_QUOTE',
  QUOTE_ACTION_REQUIRED: 'QUOTE_ACTION_REQUIRED',
  UNAVAILABLE: 'UNAVAILABLE',
})

export const PRICING_MODES = Object.freeze({
  AUTONOMOUS: 'AUTONOMOUS',
  VENDOR_ASSISTED: 'VENDOR_ASSISTED',
})

const rows = [
  ['E01','Catering & Food','Guests + menu package + service style + duration',['Custom menu','site cooking','unusual dietary/operations','large multi-day']],
  ['E02','Photography','Coverage hours + crew + deliverables',['Destination','commercial production','special crew','complex production']],
  ['E03','Videography','Coverage + hours + crew + deliverables',['Cinematic production','technical rider','multi-location','special drone/production']],
  ['E04','Decoration & Floral','Catalog setup or measured standard package',['Bespoke design','custom structure','site measurement','weather/exterior complexity']],
  ['E05','Venue','Slot + capacity + package + availability',['Exclusive hire','multi-day','custom layout','special venue rules']],
  ['E06','DJ & Music','DJ package + duration + standard rig',['Large/outdoor rig','custom production','special rights']],
  ['E07','Live Entertainment','Catalogued act + duration + rider tier',['Custom troupe','special rider','large production']],
  ['E08','Bridal Makeup & Hair','Package + artist count + timing',['Large group','destination','unusual start time']],
  ['E09','Wedding Planning','Predefined coordination package',['Full planning','multi-function','bespoke production']],
  ['E10','Tent & Furniture','SKU + quantity + duration',['Custom structure','weatherproofing','complex outdoor access']],
  ['E11','Invitation & Printing','Catalog specification + quantity',['Bespoke artwork','special material','bulk/rush']],
  ['E12','Transportation','Known vehicle + route + duration',['Complex itinerary','special transport','unusual access']],
  ['E13','Event Lighting','Catalog fixture/package + coverage',['Rigging','engineering','custom coverage/power']],
  ['E14','Cake & Desserts','Weight/servings + flavor + standard design',['Sculpted','complex multi-tier','destination setup']],
  ['E15','Mehendi Artist','Artist count + package + hours',['Complex design','very large group','difficult timing']],
  ['E16','Anchor & MC','Language + event type + duration',['Custom script','multi-host','rehearsal']],
  ['E17','Sound & AV','Catalog AV package + scope',['Large PA','LED','projection','rigging/site engineering']],
  ['E18','Valet Parking','Vehicle volume + attendants + hours',['Complex traffic','parking layout']],
  ['E19','Security Services','Guard count + hours + standard event profile',['High-risk','special protection','crowd plan']],
  ['E20','Bar & Beverages','Structured non-regulated beverage package',['Alcohol','permits','custom stock','regulated operation']],
  ['E21','Guest Services','Staff count + shift + standard role',['Specialist support','complex guest care']],
  ['E22','Power & Cooling','Known kVA + catalog unit + duration',['Unknown load','cable routing','site engineering']],
  ['E23','Safety & Facilities','Catalog facility package + quantity',['Medical','fire','emergency','site-specific plan']],
  ['E24','Priest & Rituals','Defined ceremony + duration + travel',['Custom ritual','multiple priests','long-distance travel']],
  ['E25','Gifts & Favours','Catalog SKU + quantity',['Bespoke sourcing','personalization','bulk customization']],
  ['E26','Trousseau & Gift Packing','Standard design + quantity',['Custom design','on-site','high-volume','short lead']],
  ['L01','Mini Truck / Pickup','Vehicle + route + load + distance',['Unknown dimensions','access restrictions','special handling']],
  ['L02','Medium / Large Goods Vehicle','Vehicle class + lane + payload',['Heavy/special handling','complex interstate movement','access constraints']],
  ['L03','Passenger Transport','Vehicle seats + route + distance + duration',['Multi-day circuit','complex itinerary','special access']],
  ['L04','Event Equipment Rental','Catalog asset + quantity + day + delivery/setup',['Custom bundle','engineering','special site requirements']],
  ['L05','Loading & Unloading Crew','Crew role × shift + overtime',['Specialist handling','difficult access','heavy materials']],
  ['L06','Warehouse / Storage','Space × period + handling units',['Environmental controls','security','special handling','high value']],
  ['L07','Event Materials Supplier','Catalog SKU × quantity + delivery',['Bulk sourcing','custom procurement','bespoke materials']],
  ['L08','End-to-End Event Logistics','Predefined logistics package',['Integrated project orchestration','multi-trade coordination','site survey']],
]

const QUOTE_FIRST = new Set(['E09','E20','L08'])

export const SAMBRAMO_PRICING_POLICY = Object.freeze(
  Object.fromEntries(rows.map(([id,name,determinants,customTriggers]) => [
    id,
    Object.freeze({
      tradeId: id,
      tradeName: name,
      defaultMode: QUOTE_FIRST.has(id) ? PRICING_MODES.VENDOR_ASSISTED : PRICING_MODES.AUTONOMOUS,
      defaultState: QUOTE_FIRST.has(id) ? PRICING_STATES.VENDOR_QUOTE : PRICING_STATES.INSTANT_BOOK,
      determinants,
      customTriggers,
      customQuote: true,
      customFirst: QUOTE_FIRST.has(id),
    }),
  ])),
)

export const SAMBRAMO_TRADE_COUNT = Object.keys(SAMBRAMO_PRICING_POLICY).length

export function pricingPolicyFor(tradeId) {
  return SAMBRAMO_PRICING_POLICY[tradeId] ?? null
}

function textOf(value) {
  return Array.isArray(value)
    ? value.join(' ')
    : value && typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? '')
}

export function classifyPricingRequest({
  tradeId,
  deterministic = false,
  requiredInputsComplete = false,
  availabilityConfirmed = false,
  complianceClear = true,
  customRequested = false,
  provisionalPossible = false,
  bespokeSignals = [],
} = {}) {
  const policy = pricingPolicyFor(tradeId)
  if (!policy) return { state: PRICING_STATES.UNAVAILABLE, mode: null, reason: 'unknown_trade' }

  const hasBespokeSignal = textOf(bespokeSignals).toLowerCase().trim().length > 0 || customRequested
  if (!complianceClear) {
    return { state: PRICING_STATES.QUOTE_ACTION_REQUIRED, mode: PRICING_MODES.VENDOR_ASSISTED, reason: 'compliance' }
  }
  if (hasBespokeSignal) {
    return {
      state: provisionalPossible ? PRICING_STATES.PROVISIONAL_QUOTE : PRICING_STATES.VENDOR_QUOTE,
      mode: PRICING_MODES.VENDOR_ASSISTED,
      reason: 'bespoke_request',
    }
  }
  if (policy.customFirst) {
    return {
      state: provisionalPossible ? PRICING_STATES.PROVISIONAL_QUOTE : PRICING_STATES.VENDOR_QUOTE,
      mode: PRICING_MODES.VENDOR_ASSISTED,
      reason: 'trade_is_custom_first',
    }
  }
  if (deterministic && requiredInputsComplete && availabilityConfirmed) {
    return { state: PRICING_STATES.INSTANT_BOOK, mode: PRICING_MODES.AUTONOMOUS, reason: 'deterministic' }
  }
  if (deterministic && requiredInputsComplete) {
    return { state: PRICING_STATES.INSTANT_QUOTE, mode: PRICING_MODES.AUTONOMOUS, reason: 'deterministic_waiting_availability' }
  }
  if (provisionalPossible) {
    return { state: PRICING_STATES.PROVISIONAL_QUOTE, mode: PRICING_MODES.VENDOR_ASSISTED, reason: 'missing_measurement_or_data' }
  }
  return { state: PRICING_STATES.VENDOR_QUOTE, mode: PRICING_MODES.VENDOR_ASSISTED, reason: 'custom_data_required' }
}

export function stateCopy(state) {
  return ({
    [PRICING_STATES.INSTANT_BOOK]: {
      eyebrow: 'Instant booking',
      title: 'Priced now',
      body: 'Sambramo calculates the customer price from the structured service and eligibility checks.',
      cta: 'Book now',
    },
    [PRICING_STATES.INSTANT_QUOTE]: {
      eyebrow: 'Instant quote',
      title: 'Your price is calculated',
      body: 'The calculation is complete; final booking waits for the required availability confirmation.',
      cta: 'Continue',
    },
    [PRICING_STATES.PROVISIONAL_QUOTE]: {
      eyebrow: 'Provisional',
      title: 'We have the shape of it',
      body: 'One measurement, site detail or structured input is still needed. Sambramo keeps the request moving.',
      cta: 'Complete details',
    },
    [PRICING_STATES.VENDOR_QUOTE]: {
      eyebrow: 'Sambramo custom quote',
      title: 'We are collecting the right quote',
      body: 'Your requirement stays inside Sambramo. Eligible partners respond here and Sambramo presents the normalized options.',
      cta: 'See quotes in Sambramo',
    },
    [PRICING_STATES.QUOTE_ACTION_REQUIRED]: {
      eyebrow: 'Action required',
      title: 'One detail is needed',
      body: 'Sambramo needs the missing requirement or compliance input before it can price this safely.',
      cta: 'Complete requirement',
    },
    [PRICING_STATES.UNAVAILABLE]: {
      eyebrow: 'Not available',
      title: 'We cannot safely book this yet',
      body: 'There is no verified eligible supply for the current requirement and location.',
      cta: 'Change requirement',
    },
  })[state] ?? {
    eyebrow: 'Sambramo pricing',
    title: 'Checking your request',
    body: 'We are resolving the right pricing lane.',
    cta: 'Continue',
  }
}

export function tradePricingSummary() {
  return Object.values(SAMBRAMO_PRICING_POLICY).map(p => ({
    ...p,
    standardLabel: p.customFirst ? 'Custom-first' : 'Instant lane + custom',
  }))
}
