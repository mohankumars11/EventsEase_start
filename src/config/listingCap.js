/**
 * How many trades one partner may list.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THERE IS A CAP AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two reasons, and the second is the one that matters.
 *
 * Dispatch: a partner listed under eight trades is eligible for eight
 * times as many requests as the specialist next to them. Nothing in the
 * matching is wrong when that happens — it is working exactly as told —
 * which is what makes it hard to see and hard to argue with.
 *
 * Quality: every listing carries its own price book, catalogue, media,
 * calendar and compliance. A partner with six of them maintains six,
 * and in practice maintains two and lets four go stale. A stale listing
 * is worse than no listing: it takes the booking and then disappoints.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THREE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Measured against the live partner table on 2026-10-21 — seven real
 * partners with at least one listing:
 *
 *     1 trade    2 partners
 *     2 trades   3 partners
 *     3 trades   1 partner
 *     6 trades   1 partner  (a test account: Photography, Mini Truck,
 *                Anchor & MC, Bridal Makeup, Venue and Decoration is
 *                not a business anyone runs)
 *
 * So three covers six of the seven without touching anybody, and the
 * seventh is not a real case.
 *
 * It also matches the clusters this market actually produces. A
 * photographer does photography and videography. A decorator does
 * decoration, tents and lighting. A caterer does catering, beverages
 * and tents. Each of those is three. The fourth is where a trade list
 * stops describing a specialist and starts describing an event company
 * — and an event company has its own trades, which is what the
 * overflow suggestion points at.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS NEVER RETROACTIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner already above the cap keeps every listing they have. The
 * cap governs ADDING. Hiding somebody's existing work to enforce a rule
 * invented afterwards would be taking away something they built, and
 * the dispatch argument does not justify that.
 */

export const MAX_TRADES = 3

/**
 * Where a genuine multi-service business belongs instead.
 *
 * These are real trades in the registry, not a consolation prize: a firm
 * that does everything is selling coordination, and coordination is what
 * these two price. Listing eight specialisms separately describes a
 * company that does not exist as eight specialists.
 */
export const OVERFLOW_TRADES = [
  { id: 'wedding_planning', name: 'Wedding Planning',
    why: 'You run the whole event and bring your own teams.' },
  { id: 'end_to_end_event_logistics', name: 'End-to-End Event Logistics',
    why: 'You move, set up and run everything for an event.' },
]

/** Can one more be added? */
export const canAddTrade = count => (count ?? 0) < MAX_TRADES

/** What to say when they cannot, in the partner's terms rather than ours. */
export function capMessage(count = MAX_TRADES) {
  return {
    title: `${MAX_TRADES} services is the limit`,
    body: count > MAX_TRADES
      ? `You already have ${count}. Nothing is being removed — you keep every listing you have made.`
      : 'Each service has its own prices, photos, calendar and paperwork to keep current. '
        + 'Three is what a specialist can keep genuinely up to date, and a stale listing '
        + 'takes the booking and then disappoints the customer.',
    suggestion: 'If you really do run several of these, list once under the trade that '
      + 'describes the whole job — you will be found for all of it instead of competing '
      + 'with yourself across separate cards.',
    options: OVERFLOW_TRADES,
  }
}
