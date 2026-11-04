/**
 * A restaurant order is eligible only when the partner explicitly declared
 * the restaurant / cloud-kitchen bulk-delivery capability during onboarding.
 * This is intentionally independent of the customer-facing menu catalogue.
 */
export const RESTAURANT_KITCHEN = 'Restaurant or cloud kitchen — we deliver bulk orders ourselves'

export function isRestaurantOrderListing(partner) {
  const kitchenTypes = [].concat(partner?.facets?.kitchen_type ?? [])
  return kitchenTypes.includes(RESTAURANT_KITCHEN)
}
