/**
 * Cities — the app's spine.
 *
 * Sambramo is a geographically bound product. A price, a delivery, a
 * coordinator and a vendor are all "in a city"; there is no version of this
 * app where the city is decoration. Yet until now it was exactly that: a
 * hardcoded `BRAND.primaryCity` string printed into two app bars, one of them
 * beside a chevron that opened nothing. A customer in Mysore — a city we are
 * actually live in — read "Bengaluru" on every screen and had no way to say
 * otherwise, and the first time the app asked where they were was the address
 * field at checkout.
 *
 * So the city moves out of BRAND and becomes a domain object with the facts
 * that actually differ between one city and the next. `BRAND.pilotCities` is
 * now derived from this list rather than typed alongside it, on the same
 * principle the brand taglines already follow in config/sambramo.js: hold the
 * source once, derive every other form, and the two can never disagree.
 *
 * What is deliberately *not* here: delivery SLAs, cut-off times, slot windows.
 * Sambramo is pre-launch and sources per order — FulfilmentNote says so on
 * five screens. Inventing "same-day by 2pm" per city would make this file the
 * one place in the codebase that lies. Everything below is either structurally
 * true (which cities are open, what runs in them) or a coverage note we can
 * stand behind.
 */

/** @typedef {'concierge' | 'shop'} Offering */

export const CITIES = [
  {
    slug: 'bengaluru',
    name: 'Bengaluru',
    // What a person calls it out loud, for the picker's search box. Sambramo's
    // audience types "Bangalore" far more often than "Bengaluru".
    aliases: ['Bangalore', 'Bengaluru', 'BLR'],
    state: 'Karnataka',
    live: true,
    offerings: ['concierge', 'shop'],
    // Used to centre the map when someone drops a delivery pin, and to sort
    // the picker by distance when we have a location fix.
    coords: { lat: 12.9716, lon: 77.5946 },
    // One line, honest, city-specific. This is what the picker shows under
    // the name and what the shop repeats when the city changes.
    coverage: 'Full city — concierge celebrations and shop delivery.',
    // The neighbourhoods a customer recognises, so "do you come to my part of
    // town" has an answer before they fill a cart. Coverage is city-wide; this
    // is orientation, not a whitelist.
    knownAreas: ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar', 'HSR Layout', 'Hebbal'],
  },
  {
    slug: 'mysore',
    name: 'Mysore',
    aliases: ['Mysuru', 'Mysore'],
    state: 'Karnataka',
    live: true,
    offerings: ['concierge', 'shop'],
    coords: { lat: 12.2958, lon: 76.6394 },
    coverage: 'Full city — concierge celebrations and shop delivery.',
    knownAreas: ['Vijayanagar', 'Kuvempunagar', 'Gokulam', 'Saraswathipuram', 'Hebbal'],
  },
]

/** The cities you can actually order in today. */
export const LIVE_CITIES = CITIES.filter(c => c.live)

/** The default, for a first-time visitor who has not chosen yet. */
export const DEFAULT_CITY = LIVE_CITIES[0]

/**
 * Every spelling we accept, mapped to the canonical city name.
 *
 * This supersedes the four-entry CITY_ALIASES map that used to sit in
 * utils/cityPilot.js. That map and this list were two places recording the
 * same fact — adding a third pilot city meant remembering to edit both, and
 * the one you forget is the one that silently stops matching a geocoder
 * result.
 */
const ALIAS_TO_NAME = new Map(
  CITIES.flatMap(c => [
    [c.name.toLowerCase(), c.name],
    [c.slug, c.name],
    ...c.aliases.map(a => [a.toLowerCase(), c.name]),
  ])
)

/** "bangalore" / " Mysuru " / "BLR" → "Bengaluru" / "Mysore". Unknown input is trimmed and returned as typed. */
export function normalizeCity(name) {
  const key = name?.trim().toLowerCase()
  if (!key) return ''
  return ALIAS_TO_NAME.get(key) ?? name.trim()
}

/** The full city record for any spelling of its name, or null if we aren't there. */
export function findCity(name) {
  const canonical = normalizeCity(name)
  return CITIES.find(c => c.name === canonical) ?? null
}

/** Can somebody actually order here today? */
export function isLiveCity(name) {
  return !!findCity(name)?.live
}

/**
 * Straight-line distance in km, for ranking the picker when we have a fix.
 * Haversine — a few lines beats a dependency for two cities, and it stays
 * correct if the list grows to twenty.
 */
export function distanceKm(a, b) {
  const R = 6371
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** The live city nearest a coordinate, so "use my location" can answer even from out of town. */
export function nearestLiveCity(coords) {
  if (!coords) return null
  return LIVE_CITIES.reduce(
    (best, c) => {
      const d = distanceKm(coords, c.coords)
      return !best || d < best.distance ? { city: c, distance: d } : best
    },
    null
  )
}
