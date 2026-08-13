/**
 * The admin console's information architecture.
 *
 * ── What was wrong with the last one ─────────────────────────────────────
 * The previous sidebar grouped by VERB — "Understand", "Work the queues",
 * "What we sell". That reads well in the abstract and works badly in the hand,
 * because it splits one subject across three places. Event requests sat under
 * queues, event services under what-we-sell, and the demand for those services
 * under understand. Answering a single question about the concierge business
 * meant visiting three groups and remembering which was which.
 *
 * It also spent six of its eighteen slots on the same screen. New Requests,
 * Under Review, Vendor Sourcing, Proposals, Confirmed and Upcoming were one
 * table with six different `status` filters, each given a permanent line in
 * the navigation. That is a filter wearing a nav item's clothes: it makes the
 * sidebar look full of features and makes the one real feature hard to find.
 *
 * ── What this is instead ─────────────────────────────────────────────────
 * Grouped by SUBJECT. Everything about celebrations is under Events;
 * everything about a shop order is under Orders; everything about a person is
 * under People. The rule is that a question should be answerable without
 * leaving its group.
 *
 * The six status views collapse into one Event Requests screen whose tabs are
 * the statuses — the same information, one entry point, five slots returned.
 *
 * ── The registry is data ─────────────────────────────────────────────────
 * The shell renders whatever is here. That is what lets the sidebar, the
 * command palette and the page header agree on the title, the description and
 * the badge of every screen without three lists drifting apart — which is the
 * same failure PROJECT_SUMMARY documents for the brand strings.
 */

export const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'overview', label: 'Command Center', emoji: '🏠',
        title: 'Command Center',
        description: 'Where the business is, and what needs you today.',
      },
      {
        id: 'inbox', label: 'Activity Inbox', emoji: '🔔', badge: 'unread',
        title: 'Activity Inbox',
        description: 'Everything that has happened on the customer side, newest first.',
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    hint: 'The concierge business',
    emoji: '🎉',
    items: [
      {
        id: 'requests', label: 'Event Requests', emoji: '📋', badge: 'new',
        title: 'Event Requests',
        description: 'Every celebration somebody has asked us to arrange, from first enquiry to delivered.',
      },
      {
        id: 'enquiries', label: 'Enquiries & Quotes', emoji: '💬', badge: 'enquiries',
        title: 'Enquiries & Quotes',
        description: 'Service enquiries waiting on a price, and the quotes already sent.',
      },
      {
        id: 'services', label: 'Event Services', emoji: '🎪',
        title: 'Event Services',
        description: 'Everything bookable for a celebration — photograph it, rewrite it, add to it.',
      },
      {
        id: 'dates', label: 'Dates & Demand', emoji: '📆',
        title: 'Dates & Demand',
        description: 'Which dates people are asking about, and what makes them busy.',
      },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    hint: 'The shop business',
    emoji: '🛍️',
    items: [
      {
        id: 'allorders', label: 'All Orders', emoji: '🧾', badge: 'orders',
        title: 'All Orders',
        description: 'Every shop order, newest first. Open any one for its full journey.',
      },
      {
        id: 'lifecycle', label: 'Order Lifecycle', emoji: '🔄',
        title: 'Order Lifecycle',
        description: 'The pipe from placed to delivered, and the two places orders pile up.',
      },
      {
        id: 'returns', label: 'Returns & Refunds', emoji: '↩️', badge: 'returns',
        title: 'Returns & Refunds',
        description: 'What came back, why, and what we owe — measured against the policy.',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    hint: 'What we sell',
    emoji: '🏬',
    items: [
      {
        id: 'catalog', label: 'Shop Products', emoji: '🖼️',
        title: 'Shop Products',
        description: 'Add a product, fix a price, replace a stock photo with the real thing.',
      },
      {
        id: 'studio', label: 'Content Studio', emoji: '🎛️',
        title: 'Content Studio',
        description: 'Decor, cuisines, tiers, festivals and offers — everything else a customer sees.',
      },
    ],
  },
  {
    id: 'people',
    label: 'People',
    hint: 'Customers & partners',
    emoji: '👥',
    items: [
      {
        id: 'customers', label: 'Customers', emoji: '🙋',
        title: 'Customers',
        description: 'Who buys, how often, and whether they come back.',
      },
      {
        id: 'complaints', label: 'Complaints', emoji: '⚠️', badge: 'complaints',
        title: 'Complaints',
        description: 'Someone told us something went wrong and is waiting for an answer.',
      },
      {
        id: 'reviews', label: 'Reviews', emoji: '⭐',
        title: 'Reviews',
        description: 'What customers said in public, and your replies.',
      },
      {
        id: 'vendors', label: 'Partners', emoji: '🤝', badge: 'vendors',
        title: 'Partners',
        description: 'The kitchens, decorators and suppliers who actually deliver the work.',
      },
    ],
  },
  {
    id: 'insight',
    label: 'Insight',
    hint: 'Where the demand is',
    emoji: '📈',
    items: [
      {
        id: 'products', label: 'Product Intelligence', emoji: '📦',
        title: 'Product Intelligence',
        description: 'Every item in the shop, ranked by what it actually does.',
      },
      {
        id: 'geography', label: 'Area Demand', emoji: '🗺️',
        title: 'Area Demand',
        description: 'Where orders ship, where celebrations are planned, and where to open next.',
      },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.id, groupLabel: g.label })))
export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map(i => [i.id, i]))

/**
 * Old ids that are in muscle memory, in bookmarks, and in the `nav` field of
 * every notification kind. They resolve rather than dead-ending on a blank
 * screen — the same reason the customer-facing routes keep their redirects.
 */
export const NAV_ALIASES = {
  new_requests:    'requests',
  under_review:    'requests',
  vendor_sourcing: 'requests',
  proposals:       'requests',
  confirmed:       'requests',
  upcoming:        'requests',
  orders:          'allorders',
  support:         'returns',
}

export function resolveNav(id) {
  if (NAV_BY_ID[id]) return id
  return NAV_ALIASES[id] ?? 'overview'
}
