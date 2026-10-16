/**
 * The canonical trade registry — the one place a trade is defined.
 *
 * Order, ids and names follow Mohan's master spec (Part 2). `name` is the
 * string stored in vendor_services.category and matched by match_partners,
 * so it must not change. `code` is the existing E##/L## code used by
 * api/_lib/tradeNames.js, quote requests and the pricing catalogue.
 *
 * `archetype` decides how a trade is priced and what it reserves:
 *   TIME_PERFORMER     people booked for time (hour/session/event/day)
 *   PERSONAL_SERVICE   per person / look / hand, artists × appointment time
 *   STAFFING           headcount × hours or shifts
 *   PER_GUEST_FOOD     per plate / guest / serving, guest bands, counters
 *   CATALOGUE_PRODUCT  items × quantity, tiers, customisation, production capacity
 *   RENTAL_INVENTORY   items × quantity × rental period, deposit separate
 *   TRIP_VEHICLE       trip / km / hour / day, vehicle + driver reserved
 *   VENUE_SPACE        spaces × slots
 *   STORAGE_CAPACITY   capacity × storage period
 *   PROJECT_QUOTE      fixed-scope packages, otherwise a custom quote
 *
 * `tiers`: whether Essential/Signature/VIP-style comparable packages make
 * sense. Never generated for trades where they would be meaningless.
 */
export const ARCHETYPES = [
  'TIME_PERFORMER', 'PERSONAL_SERVICE', 'STAFFING', 'PER_GUEST_FOOD', 'CATALOGUE_PRODUCT',
  'RENTAL_INVENTORY', 'TRIP_VEHICLE', 'VENUE_SPACE', 'STORAGE_CAPACITY', 'PROJECT_QUOTE',
]

const t = (order, id, code, name, archetype, extra = {}) => ({
  order, id, code, name, archetype, schemaVersion: 1, tiers: false, ...extra,
})

export const TRADE_REGISTRY = [
  t(1, 'anchor_mc', 'E16', 'Anchor & MC', 'TIME_PERFORMER', { tiers: true }),
  t(2, 'bar_beverages', 'E20', 'Bar & Beverages', 'PER_GUEST_FOOD', { regulated: true }),
  t(3, 'bridal_makeup_hair', 'E08', 'Bridal Makeup & Hair', 'PERSONAL_SERVICE', { tiers: true }),
  t(4, 'cake_desserts', 'E14', 'Cake & Desserts', 'CATALOGUE_PRODUCT'),
  t(5, 'catering_food', 'E01', 'Catering & Food', 'PER_GUEST_FOOD', { tiers: true }),
  t(6, 'dj_music', 'E06', 'DJ & Music', 'TIME_PERFORMER', { tiers: true }),
  t(7, 'decoration_floral', 'E04', 'Decoration & Floral', 'PROJECT_QUOTE', { tiers: true }),
  t(8, 'end_to_end_event_logistics', 'L08', 'End-to-End Event Logistics', 'PROJECT_QUOTE'),
  t(9, 'event_equipment_rental', 'L04', 'Event Equipment Rental', 'RENTAL_INVENTORY'),
  t(10, 'event_lighting', 'E13', 'Event Lighting', 'RENTAL_INVENTORY'),
  t(11, 'event_materials_supplier', 'L07', 'Event Materials Supplier', 'CATALOGUE_PRODUCT'),
  t(12, 'gifts_favours', 'E25', 'Gifts & Favours', 'CATALOGUE_PRODUCT'),
  t(13, 'guest_services', 'E21', 'Guest Services', 'STAFFING'),
  t(14, 'invitation_printing', 'E11', 'Invitation & Printing', 'CATALOGUE_PRODUCT'),
  t(15, 'live_entertainment', 'E07', 'Live Entertainment', 'TIME_PERFORMER', { tiers: true }),
  t(16, 'loading_unloading_crew', 'L05', 'Loading & Unloading Crew', 'STAFFING'),
  t(17, 'medium_large_goods_vehicle', 'L02', 'Medium / Large Goods Vehicle', 'TRIP_VEHICLE', { regulated: true }),
  t(18, 'mehendi_artist', 'E15', 'Mehendi Artist', 'PERSONAL_SERVICE', { tiers: true }),
  t(19, 'mini_truck_pickup', 'L01', 'Mini Truck / Pickup', 'TRIP_VEHICLE', { regulated: true }),
  t(20, 'passenger_transport', 'L03', 'Passenger Transport', 'TRIP_VEHICLE', { regulated: true }),
  t(21, 'photography', 'E02', 'Photography', 'TIME_PERFORMER', { tiers: true }),
  t(22, 'power_cooling', 'E22', 'Power & Cooling', 'RENTAL_INVENTORY', { regulated: true }),
  t(23, 'priest_rituals', 'E24', 'Priest & Rituals', 'TIME_PERFORMER'),
  t(24, 'safety_facilities', 'E23', 'Safety & Facilities', 'STAFFING', { regulated: true }),
  t(25, 'security_services', 'E19', 'Security Services', 'STAFFING', { regulated: true }),
  t(26, 'sound_av', 'E17', 'Sound & AV', 'RENTAL_INVENTORY'),
  t(27, 'tent_furniture', 'E10', 'Tent & Furniture', 'RENTAL_INVENTORY'),
  t(28, 'transportation', 'E12', 'Transportation', 'TRIP_VEHICLE', { regulated: true }),
  t(29, 'trousseau_gift_packing', 'E26', 'Trousseau & Gift Packing', 'CATALOGUE_PRODUCT'),
  t(30, 'valet_parking', 'E18', 'Valet Parking', 'STAFFING', { regulated: true }),
  t(31, 'venue', 'E05', 'Venue', 'VENUE_SPACE', { regulated: true }),
  t(32, 'videography', 'E03', 'Videography', 'TIME_PERFORMER', { tiers: true }),
  t(33, 'warehouse_storage', 'L06', 'Warehouse / Storage', 'STORAGE_CAPACITY'),
  t(34, 'wedding_planning', 'E09', 'Wedding Planning', 'PROJECT_QUOTE', { tiers: true }),
]

export const TRADE_BY_ID = Object.fromEntries(TRADE_REGISTRY.map(x => [x.id, x]))
export const TRADE_BY_NAME = Object.fromEntries(TRADE_REGISTRY.map(x => [x.name, x]))
export const TRADE_BY_CODE = Object.fromEntries(TRADE_REGISTRY.map(x => [x.code, x]))

/** Resolve an id, code or exact display name to the registry entry, or null. Never guesses. */
export function tradeOf(key) {
  if (!key) return null
  const k = String(key).trim()
  return TRADE_BY_ID[k] ?? TRADE_BY_CODE[k] ?? TRADE_BY_NAME[k] ?? null
}
