/**
 * Sambramo trade code → the trade NAME stored in vendor_services.category.
 *
 * match_partners() compares against the name. Quote requests store the
 * code. Every endpoint that turns one into the other must use this map;
 * submit-custom-quote passed the raw code, matched nobody, and marked
 * every partner quote UNAVAILABLE.
 */
export const TRADE_NAMES = Object.freeze({
  E01: 'Catering & Food', E02: 'Photography', E03: 'Videography', E04: 'Decoration & Floral',
  E05: 'Venue', E06: 'DJ & Music', E07: 'Live Entertainment', E08: 'Bridal Makeup & Hair',
  E09: 'Wedding Planning', E10: 'Tent & Furniture', E11: 'Invitation & Printing',
  E12: 'Transportation', E13: 'Event Lighting', E14: 'Cake & Desserts', E15: 'Mehendi Artist',
  E16: 'Anchor & MC', E17: 'Sound & AV', E18: 'Valet Parking', E19: 'Security Services',
  E20: 'Bar & Beverages', E21: 'Guest Services', E22: 'Power & Cooling', E23: 'Safety & Facilities',
  E24: 'Priest & Rituals', E25: 'Gifts & Favours', E26: 'Trousseau & Gift Packing',
  L01: 'Mini Truck / Pickup', L02: 'Medium / Large Goods Vehicle', L03: 'Passenger Transport',
  L04: 'Event Equipment Rental', L05: 'Loading & Unloading Crew', L06: 'Warehouse / Storage',
  L07: 'Event Materials Supplier', L08: 'End-to-End Event Logistics',
})

/** The name for a code, or the input itself when it is already a name. */
export function tradeNameFor(codeOrName) {
  const v = String(codeOrName ?? '').trim()
  return TRADE_NAMES[v] ?? (Object.values(TRADE_NAMES).includes(v) ? v : null)
}

/** The single platform fee, as in src/config/instantBooking.js PLATFORM_FEE_RATE. */
export const PLATFORM_FEE_RATE = 0.08
