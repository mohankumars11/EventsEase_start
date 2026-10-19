/** Sambramo founder and operations control-centre navigation. Partner lifecycle only. */
export const NAV = [
  {
    id: 'executive', label: 'Executive', hint: 'Partner network health at a glance',
    items: [
      { id: 'overview', label: 'Partner control tower', emoji: '✦', description: 'Executive view of partner supply, live cards, listing quality, uploads, pricing and lifecycle risks.' },
    ],
  },
  {
    id: 'partners', label: 'Partner lifecycle', hint: 'Every partner, listing, upload and decision',
    items: [
      { id: 'directory', label: 'Partner directory', emoji: '☰', description: 'Every partner, with server-side filters, saved views, sorting and column control.' },
      { id: 'partners', label: 'Partner 360 registry', emoji: '🤝', badge: 'vendors', description: 'Partner identity, onboarding, every listing card, documents, portfolio work, payout readiness and lifecycle history.' },
      { id: 'pricing-review', label: 'Pricing review', emoji: '₹', badge: 'pricing', description: 'Review submitted partner price revisions while protecting currently published prices.' },
      { id: 'listing-review', label: 'Listings & Anchor / MC', emoji: '▦', description: 'Review and publish service cards, listing revisions and trade-specific pricing.' },
      { id: 'onboarding-review', label: 'Onboarding review', emoji: '✓', description: 'The submitted form rebuilt question by question, with required gaps and the approve / reject / revise decision.' },
      { id: 'trade-workspaces', label: 'Trade workspaces', emoji: '▤', description: 'One typed table per trade — every onboarding answer in its own column, with legacy submissions shown separately.' },
      { id: 'verification', label: 'Identity verification', emoji: '▣', description: 'Partner applications, uploaded evidence, verification status and operator decisions.' },
    ],
  },
  {
    id: 'operations', label: 'Operations', hint: 'Partner readiness and live work',
    items: [
      { id: 'inquiries', label: 'Custom inquiries', emoji: '✉', description: 'Quote requests, partner responses and the stored deadline each one is held to.' },
      { id: 'pricing-packages', label: 'Pricing & packages', emoji: '◎', description: 'Partner-submitted packages, the inputs behind each price, and the approve or send-back decision.' },
      { id: 'revenue', label: 'Payments & revenue', emoji: '₹', description: 'Booked, collected, owed and paid kept apart, each naming the table and column it came from.' },
      { id: 'orders', label: 'Bookings & orders', emoji: '◫', description: 'Every booking line, its lifecycle timestamps and the money recorded against it.' },
      { id: 'media', label: 'Media library', emoji: '▧', description: 'Portfolio work, compliance documents and listing photos, with the review decision on each.' },
      { id: 'live-ops', label: 'Live operations', emoji: '◉', description: 'Operational work, partner availability and active service signals.' },
      { id: 'story-uploads', label: 'Partner story uploads', emoji: '▶', description: 'Photos, reels and videos for the four guide stories a partner sees on the Jobs tab.' },
    ],
  },
  {
    id: 'markets', label: 'Market expansion', hint: 'Partner supply by geography',
    items: [
      { id: 'city-interest', label: 'City interest', emoji: '⌖', description: 'Partner interest outside current markets and trade coverage for future expansion decisions.' },
    ],
  },
]
export const NAV_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.id, groupLabel: g.label })))
export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map(i => [i.id, i]))
export const NAV_ALIASES = {
  vendors: 'partners', overview: 'overview', customers: 'partners',
  inbox: 'partners', requests: 'partners', enquiries: 'partners',
  services: 'partners', dates: 'partners', decorphotos: 'partners',
  catalogue: 'partners', content: 'partners', brand: 'overview',
  complaints: 'partners', reviews: 'partners', geography: 'city-interest',
}
export function resolveNav(id) {
  if (NAV_BY_ID[id]) return id
  return NAV_ALIASES[id] || 'overview'
}
