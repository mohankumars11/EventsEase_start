import { EVENT_DATA } from './eventServicesData'
import { CELEBRATION_TIERS } from './celebrationTiers'
import { entryPriceFor, PACKAGE_COUNT } from './occasionPackages'
import { GENERATED_DECOR_PHOTOS } from '../config/generatedDecorSamples'

/**
 * The photographs for one occasion, already resolved and committed.
 *
 * GENERATED_DECOR_PHOTOS is keyed `occasionId/variant` — "birthday/balloon-arch",
 * "birthday/dessert-table" — with exactly four per occasion across all fifteen,
 * which happens to line up one-to-one with EVENT_DATA's ids.
 *
 * These are static URLs, so a card can cycle through all four for free. The
 * alternative — RemoteImage's live `query` search — is capped at 24 lookups
 * per page load app-wide, and fifteen occasions times four frames is sixty.
 */
function photosFor(occasionId) {
  const prefix = `${occasionId}/`
  return Object.entries(GENERATED_DECOR_PHOTOS)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, photo]) => photo?.url)
    .filter(Boolean)
}

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
  /** Four real photographs of this occasion, for the card to cycle. */
  photos: photosFor(e.id),
  serviceCount: e.services.length,
  // Every occasion offers the same eight scales — that is the point of a
  // ladder. The count used to differ per occasion because the packages were
  // hand-written and some occasions had simply had fewer of them typed out.
  packageCount: PACKAGE_COUNT,
  // The honest entry price: the cheapest real booking at the smallest rung,
  // computed for this occasion's own cuisine, decor and services.
  fromPrice: entryPriceFor(e.id),
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
