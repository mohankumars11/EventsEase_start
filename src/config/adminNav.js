/**
 * The admin console's information architecture.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PARTNERS, AND NOTHING ELSE, ON PURPOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This was five groups and eighteen screens: Events, Catalogue, People,
 * Insight, Overview. All of it has been removed, and the components with
 * it — not hidden behind a flag, deleted.
 *
 * The reason is that the partner side had no operator interface at all.
 * "Partners" was one table with Approve and Reject on each row, which
 * answers exactly one question — is this business real — while the
 * lifecycle has nine more, each in a different table, each answerable
 * only from the SQL editor. The cost was measurable: a real caterer sat
 * with an unread listing for days while this console showed her as
 * approved and partner_readiness reported her dispatchable.
 *
 * A console covering five subjects badly was the reason the one subject
 * with a live defect had nowhere to be fixed. So it covers one subject,
 * completely.
 *
 * ── What that cost, stated rather than glossed ──────────────────────
 * The concierge screens are gone and there are real rows behind them —
 * 109 booking requests, 244 lines, 1,119 dispatch offers. They are
 * recoverable from git history and from nowhere else. That was the
 * explicit instruction, and this note exists so the next person finds
 * the reason rather than the hole.
 *
 * The customer app is next; when it exists, Customers becomes the second
 * group here and the same standard applies — everything about a subject,
 * or it does not go in.
 *
 * ── The registry is still data ──────────────────────────────────────
 * The shell renders whatever is here, so the sidebar, the command
 * palette and the page header agree on every screen's title, description
 * and badge without three lists drifting apart.
 */

export const NAV = [
  {
    id: 'partners',
    label: 'Partners',
    hint: 'The masters who do the work',
    items: [
      {
        id: 'partners', label: 'Partner console', emoji: '🤝',
        badge: 'vendors',
        description: 'Every partner, their listings, their documents and what they can be offered.',
      },
      {
        id: 'pricing-review', label: 'Pricing review', emoji: '💰',
        badge: 'pricing',
        description: 'Submitted partner pricing revisions. Approve the new version or request changes without changing the live customer price.',
      },
      {
        id: 'listing-review', label: 'Listing review · all trades', emoji: '🧾',
        description: 'Review and publish listing versions, open seasonal windows, tune the pricing settings, and see what the booking engine decided.',
      },
      {
        id: 'verification', label: 'Verification queue', emoji: '🪪',
        description: 'Applications waiting on a decision, oldest deadline first, with what was entered beside what was read off the document.',
      },
      {
        id: 'lifecycle', label: 'Partner lifecycle', emoji: '🧭',
        description: 'One partner, end to end: the day they signed up, every trade they listed, what each document and payout and listing is doing, and where they are stuck right now.',
      },
    ],
  },

  {
    id: 'money',
    label: 'Money',
    hint: 'What came in, what is owed, what went out',
    items: [
      {
        id: 'advances', label: 'Materials advances', emoji: '🧾',
        badge: 'advances',
        description: 'Partners asking to be funded before an event, and bills waiting to be checked against the photographs of what arrived.',
      },
      {
        id: 'money', label: 'Payouts & adjustments', emoji: '🏦',
        description: 'What each partner is owed, the claims and batches that pay it, and every bonus, penalty, reimbursement and recovery on the account.',
      },
      {
        id: 'audit', label: 'Audit trail', emoji: '🔎',
        description: 'Every movement of money and every verification decision, with who did it and when. Read-only by design.',
      },
    ],
  },

  {
    id: 'operations',
    label: 'Operations',
    hint: 'What is happening right now',
    items: [
      {
        id: 'live-ops', label: 'Live trips', emoji: '🚚',
        description: 'Every partner on the road, sorted by trouble rather than by time — the late one and the silent one first.',
      },
    ],
  },

  {
    id: 'markets',
    label: 'Markets',
    hint: 'Where we are, and where we are wanted',
    items: [
      {
        id: 'city-interest', label: 'City interest', emoji: '🗺️',
        description: 'Partners waiting in cities we have not opened, and which trades they are — the figure a launch decision is made on.',
      },
    ],
  },

  {
    id: 'people',
    label: 'Customers',
    hint: 'The other half, when it exists',
    items: [
      {
        id: 'customers', label: 'Customers', emoji: '👤',
        description: 'Who booked what, and everything that happened to their event. The customer app is not built yet, so this says so rather than showing an empty table.',
      },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.id, groupLabel: g.label })))
export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map(i => [i.id, i]))

/**
 * Old ids, so a bookmark or a ?nav= link from before this collapse does
 * not land on an error.
 *
 * Every one of them resolves to the partner console. That is honest for
 * the partner-shaped ones (`vendors` WAS this screen) and deliberately
 * blunt for the rest: the screen a link points at no longer exists, and
 * sending somebody to the one console there is beats a blank page.
 */
export const NAV_ALIASES = {
  vendors: 'partners',
  overview: 'partners',
  inbox: 'partners',
  requests: 'partners',
  enquiries: 'partners',
  services: 'partners',
  dates: 'partners',
  decorphotos: 'partners',
  catalogue: 'partners',
  content: 'partners',
  brand: 'partners',
  complaints: 'partners',
  reviews: 'partners',
  geography: 'partners',
}

export function resolveNav(id) {
  if (NAV_BY_ID[id]) return id
  return NAV_ALIASES[id] ?? 'partners'
}
