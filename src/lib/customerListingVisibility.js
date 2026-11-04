/**
 * Customer-market visibility boundary.
 *
 * Synthetic/demo records help exercise the partner and operator workflows,
 * but they are not customer supply. Require an explicit non-synthetic vendor
 * flag and reject any listing whose published content still marks it synthetic.
 */
export function isCustomerVisibleListing({ vendorIsSynthetic, profile, answers } = {}) {
  if (vendorIsSynthetic !== false) return false
  if (profile?.synthetic === true || answers?.synthetic === true) return false
  return true
}
