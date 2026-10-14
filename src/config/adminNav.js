/** Sambramo control-centre navigation registry. */
export const NAV = [
  {
    id: 'executive', label: 'Executive', hint: 'The company, in one operating picture',
    items: [
      { id: 'overview', label: 'Founder control tower', emoji: '✦', description: 'Executive KPIs, partner supply, live cards, customer demand and operational risk.' },
    ],
  },
  {
    id: 'customers', label: 'Customer lifecycle', hint: 'Every customer relationship and support trail',
    items: [
      { id: 'customers', label: 'Customer 360', emoji: '◎', description: 'Customer profiles joined to celebrations, orders, enquiries, complaints, internal notes and account audit.' },
    ],
  },
  {
    id: 'partners', label: 'Partner lifecycle', hint: 'Every partner, listing, upload and decision',
    items: [
      { id: 'partners', label: 'Partner 360 registry', emoji: '🤝', badge: 'vendors', description: 'Partner identity, onboarding, every listing card, evidence upload, portfolio item, payout readiness and lifecycle history.' },
      { id: 'pricing-review', label: 'Pricing review', emoji: '₹', badge: 'pricing', description: 'Submitted partner pricing revisions. Approve or request changes without unintentionally changing the live customer price.' },
      { id: 'listing-review', label: 'Listing & Anchor / MC', emoji: '▦', description: 'Review and publish service cards, listing versions and trade-specific pricing.' },
      { id: 'verification', label: 'Identity verification', emoji: '▣', description: 'Partner applications, uploaded identity evidence and verification decisions.' },
    ],
  },
  {
    id: 'operations', label: 'Operations', hint: 'What is happening right now',
    items: [
      { id: 'live-ops', label: 'Live operations', emoji: '◉', description: 'Operational work, partner dispatch signals and active issues.' },
    ],
  },
  {
    id: 'markets', label: 'Market expansion', hint: 'Where the network is and where it is wanted',
    items: [
      { id: 'city-interest', label: 'City interest', emoji: '⌖', description: 'Partner interest outside current markets and trade coverage for launch decisions.' },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.id, groupLabel: g.label })))
export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map(i => [i.id, i]))

export const NAV_ALIASES = {
  vendors: 'partners', overview: 'overview', customers: 'customers',
  inbox: 'partners', requests: 'partners', enquiries: 'customers',
  services: 'partners', dates: 'customers', decorphotos: 'partners',
  catalogue: 'partners', content: 'partners', brand: 'overview',
  complaints: 'customers', reviews: 'partners', geography: 'city-interest',
}

export function resolveNav(id) {
  if (NAV_BY_ID[id]) return id
  return NAV_ALIASES[id] || 'overview'
}
