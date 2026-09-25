/**
 * Which campaigns apply to this partner, decided on the device.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE AUDIENCE IS EVALUATED HERE AND NOT IN SQL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The alternative is a per-partner query on every Earnings render to
 * decide whether to show a marketing card. That is a real cost paid on
 * every visit for something decorative, and it puts a campaign
 * predicate — the most frequently edited thing in this system — inside
 * a function that needs a migration to change.
 *
 * So the server returns the live campaigns and the device decides. The
 * facts the predicate needs (lifecycle, coverage, trades, whether the
 * profile is finished) are all things the app already holds.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AN UNKNOWN KEY MEANS NO MATCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * `RULES` is a closed list. A campaign whose audience names something
 * not in it does not render — it does not render to everybody.
 *
 * That direction matters because the audience is operator-authored and
 * arrives from a table. The failure mode of "ignore what you do not
 * understand" is a campaign promising money to every partner in the
 * city because somebody typed `max_coverage_dayz`. The failure mode of
 * this direction is a card that does not appear, which somebody
 * notices and fixes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO REWARD VALUE IS EVER COMPUTED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Amounts come from the row, in paise, and are formatted for display
 * and nothing else. Nothing in the frontend decides what anybody is
 * owed; `referral_progress()` says whether a threshold is met and an
 * operator pays through `record_adjustment`.
 */

/**
 * Each rule takes the audience value and the partner facts, and returns
 * true when the campaign still applies.
 */
const RULES = {
  /* ['LIVE'] — the partner lifecycle from partnerOnboarding.js */
  lifecycle: (want, f) => Array.isArray(want) && want.includes(f.lifecycle),

  /* A campaign for partners who are BEHIND. 120 means "show this to
     anybody covering less than 120 days", which is how a calendar
     campaign reaches exactly the people it is about. */
  max_coverage_days: (want, f) =>
    Number.isFinite(f.coverageDays) && f.coverageDays < Number(want),

  min_coverage_days: (want, f) =>
    Number.isFinite(f.coverageDays) && f.coverageDays >= Number(want),

  /* ['Photography', 'Videography'] — matched against the trades the
     partner actually lists, so a seasonal campaign can be aimed. */
  trades: (want, f) =>
    Array.isArray(want) && (f.trades ?? []).some(t => want.includes(t)),

  cities: (want, f) =>
    Array.isArray(want) && !!f.city && want.includes(f.city),

  /* true → only partners with an unfinished profile. */
  profile_incomplete: (want, f) => Boolean(want) === Boolean(f.profileIncomplete),

  /* true → only partners who have completed at least one event. */
  has_completed_event: (want, f) => Boolean(want) === Boolean(f.hasCompletedEvent),
}

/**
 * Does one campaign apply?
 *
 * Every key in the audience must pass. An empty audience matches
 * everybody, which is the sensible reading of "no targeting".
 */
export function promotionApplies(promotion, facts = {}) {
  const audience = promotion?.audience ?? {}
  const keys = Object.keys(audience)
  if (!keys.length) return true

  for (const key of keys) {
    const rule = RULES[key]
    /* Closed list. See the header: silence is the safe direction for a
       predicate nobody reviewed. */
    if (!rule) return false
    if (!rule(audience[key], facts)) return false
  }
  return true
}

/** Inside its window, and switched on. Mirrors the RLS policy in 154. */
export function promotionIsLive(promotion, now = Date.now()) {
  if (!promotion?.active) return false
  if (promotion.start_at && new Date(promotion.start_at).getTime() > now) return false
  if (promotion.end_at && new Date(promotion.end_at).getTime() <= now) return false
  if (promotion.max_redemptions != null
      && (promotion.redeemed_count ?? 0) >= promotion.max_redemptions) return false
  return true
}

/**
 * The campaigns to show, in order, capped.
 *
 * Capped at three because a carousel a partner has to swipe four times
 * to get past is an obstacle between them and their earnings, which is
 * what they opened the tab for.
 */
export function selectPromotions(rows, facts = {}, { limit = 3, dismissed = [], now = Date.now() } = {}) {
  const skip = new Set(dismissed)
  return (rows ?? [])
    .filter(p => !skip.has(p.id))
    .filter(p => promotionIsLive(p, now))
    .filter(p => promotionApplies(p, facts))
    .sort((a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0)
      || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .slice(0, limit)
}

/**
 * Paise to something a person reads.
 *
 * Here rather than in a component because the unit is the thing that
 * goes wrong: every amount in this database is paise, and a component
 * that prints `reward_paise` directly promises a hundred times too
 * much. Returns null for no amount, so a caller renders nothing rather
 * than "₹0".
 */
export function rewardLabel(paise) {
  if (paise == null || !Number.isFinite(Number(paise))) return null
  const rupees = Number(paise) / 100
  if (rupees <= 0) return null
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
