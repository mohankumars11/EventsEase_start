import { EVENT_DATA } from './eventServicesData'
import { CELEBRATION_TIERS } from './celebrationTiers'

/**
 * Everything Sambramo can be asked for, in the two shapes a customer thinks in.
 *
 * The catalogue already existed — 15 occasions and ~39 distinct services — but
 * it was only ever reachable *through* an occasion: pick "Birthday", then see
 * birthday's services. That order is wrong for a large share of real demand.
 * Plenty of people do not arrive wanting "a birthday package"; they arrive
 * wanting a cook for Sunday, or a decorator, or a photographer, and the app had
 * no way to express that. It offered whole celebrations or nothing, so anyone
 * with a single need bounced.
 *
 * Both views are derived from EVENT_DATA rather than typed out again, so a
 * service added to an occasion appears here automatically and the two can never
 * disagree about what is on sale.
 */

/**
 * Every distinct service across every occasion, grouped by its own category.
 *
 * De-duplicated by id: the same SVC object is referenced by many occasions
 * (nearly every one includes `venue` and `decor`), and listing "Venue Booking"
 * fifteen times is how a catalogue stops looking like a catalogue.
 *
 * `occasions` records how many occasions each service belongs to, which is the
 * closest thing the data has to a popularity signal — a service wanted by
 * twelve occasions genuinely is the common request, and it lets the shelf lead
 * with what most people need instead of with whatever sorts first
 * alphabetically.
 */
export const SERVICES_BY_CATEGORY = (() => {
  const byId = new Map()

  for (const event of Object.values(EVENT_DATA)) {
    for (const svc of event.services) {
      const existing = byId.get(svc.id)
      if (existing) {
        existing.occasions += 1
      } else {
        byId.set(svc.id, { ...svc, occasions: 1 })
      }
    }
  }

  const groups = new Map()
  for (const svc of byId.values()) {
    // `category` is a free-text field on SVC and a handful of services predate
    // it. Bucketing those as "More" beats dropping them, which would silently
    // shrink the catalogue every time someone adds a service and forgets the
    // field.
    const key = svc.category || 'More'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(svc)
  }

  return [...groups.entries()]
    .map(([category, services]) => ({
      category,
      // Most-wanted first within each group.
      services: services.sort((a, b) => b.occasions - a.occasions),
      emoji: services[0]?.emoji ?? '✨',
    }))
    // Largest groups first — the categories with the most to offer earn the
    // top of the shelf.
    .sort((a, b) => b.services.length - a.services.length)
})()

/** Flat list, most broadly wanted first — for the "most booked" rail. */
export const TOP_SERVICES = SERVICES_BY_CATEGORY
  .flatMap(g => g.services)
  .sort((a, b) => b.occasions - a.occasions)

/** Every occasion, as cards. */
export const OCCASIONS = Object.values(EVENT_DATA).map(e => ({
  id: e.id,
  name: e.name,
  emoji: e.emoji ?? e.icon,
  tagline: e.tagline,
  gradient: e.heroGradient ?? e.gradient,
  serviceCount: e.services.length,
  // Hampers are add-ons, not celebrations you can book on their own — counting
  // them would inflate "4 packages" on an occasion that really offers two.
  packageCount: e.packages.filter(p => p.type !== 'hamper').length,
  // The honest entry price for this occasion: the cheapest real package.
  fromPrice: Math.min(
    ...e.packages.filter(p => p.type !== 'hamper').map(p => p.price_min).filter(Number.isFinite)
  ),
}))
  // Cheapest entry first, so the grid opens with the most approachable
  // celebrations rather than with weddings.
  .sort((a, b) => a.fromPrice - b.fromPrice)

/** Headline numbers, computed rather than claimed. */
export const CATALOG_STATS = {
  occasions: OCCASIONS.length,
  services: TOP_SERVICES.length,
  tiers: CELEBRATION_TIERS.length,
  fromPrice: Math.min(...OCCASIONS.map(o => o.fromPrice).filter(Number.isFinite)),
}
