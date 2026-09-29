import { VENDOR_CATEGORIES } from '../config/vendor'
import { tradeIdFor } from '../data/catalogueIds.generated'

/**
 * The 34 trades, each with the id the database knows it by.
 *
 * The names are VENDOR_CATEGORIES, in that order — the list a partner
 * signs up from, so the Trade Champion screen reads in the order they
 * have already seen. The ids are `listing_trades.id` (SBM-TRD-001…034,
 * migration 106), which is what an invitation and a referral store: a
 * renamed trade keeps its id, and a referral written against it does not
 * quietly fall out of every count.
 *
 * `check-trade-champion.mjs` fails the build if any name has no id, if
 * two share one, or if this list and the seeded table disagree.
 */
const LOGISTICS_TRADE_IDS = {
  'Mini Truck / Pickup': 'SBM-TRD-027',
  'Medium / Large Goods Vehicle': 'SBM-TRD-028',
  'Passenger Transport': 'SBM-TRD-029',
  'Event Equipment Rental': 'SBM-TRD-030',
  'Loading & Unloading Crew': 'SBM-TRD-031',
  'Warehouse / Storage': 'SBM-TRD-032',
  'Event Materials Supplier': 'SBM-TRD-033',
  'End-to-End Event Logistics': 'SBM-TRD-034',
}

export const PARTNER_TRADES = VENDOR_CATEGORIES.map(name => ({
  name,
  id: tradeIdFor(name) ?? LOGISTICS_TRADE_IDS[name] ?? null,
}))

const BY_ID = new Map(PARTNER_TRADES.map(t => [t.id, t]))

export const tradeById = id => BY_ID.get(id) ?? null
