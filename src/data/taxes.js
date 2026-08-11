// GST, as its own line.
//
// ── Why this is data and not a constant ─────────────────────────────────
// Event work is not taxed at one rate. Outdoor catering and event management
// sit in different slabs, and the catering rate itself depends on whether
// input tax credit is being claimed. A single hard-coded 18% would be wrong
// on the largest line of most quotes, and wrong in the customer's favour on
// some and against them on others — both of which end in a corrected invoice
// and an awkward phone call.
//
// ── THESE RATES NEED YOUR ACCOUNTANT ────────────────────────────────────
// The figures below are the common treatment for this kind of business and
// they are a starting point, NOT tax advice. The correct rate depends on
// Sambramo's registration, whether it bills as principal or as an agent on
// each line, and whether ITC is claimed on catering. Have a CA confirm all
// three before a single invoice goes out, then change the numbers here — one
// file, one place, and every surface follows.
//
// Until then the UI says "estimated taxes", because that is what they are.

export const GST_RATES = {
  // Outdoor/event catering, billed without input tax credit.
  catering: 0.05,
  // Décor, rentals, staffing, photography and everything else supplied as a
  // service.
  services: 0.18,
  // Sambramo's own coordination fee and platform fee.
  platform: 0.18,
}

export const TAX_LABEL = 'GST (estimated)'

/**
 * Tax on a quote, computed per component rather than on the grand total.
 *
 * Returns the itemised breakdown as well as the sum, because a customer
 * looking at a five-figure tax line will want to know why, and "18% of
 * everything" would be the wrong answer.
 */
export function taxFor({ cateringBase = 0, servicesBase = 0, platformBase = 0 }) {
  const parts = [
    { key: 'catering', label: 'Catering', base: cateringBase, rate: GST_RATES.catering },
    { key: 'services', label: 'Décor & services', base: servicesBase, rate: GST_RATES.services },
    { key: 'platform', label: 'Coordination & platform fee', base: platformBase, rate: GST_RATES.platform },
  ]
    .filter(p => p.base > 0)
    .map(p => ({ ...p, amount: Math.round(p.base * p.rate) }))

  return { parts, total: parts.reduce((sum, p) => sum + p.amount, 0) }
}
