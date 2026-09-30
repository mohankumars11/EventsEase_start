import { CITIES, normalizeCity, findCity } from './cities'

/**
 * Where Sambramo is open FOR PARTNERS.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT config/cities.js
 * ══════════════════════════════════════════════════════════════════════
 *
 * cities.js answers a customer's question: can I order here. This answers
 * a different one: can a business join here. They are not the same
 * question and they do not have the same answer at the same time — you
 * open a market to partners BEFORE customers, because a city with
 * customers and no supply is a city of failed bookings.
 *
 * Today the two lists disagree on Mysore, and that disagreement is real
 * rather than a bug in this file: cities.js has it `live: true` for
 * ordering, and partner recruitment is Bengaluru only. Whoever changes
 * that should change it here, deliberately, rather than have it follow
 * the customer list by accident.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE LIST, NOT A CONDITION SPRINKLED THROUGH THE APP
 * ══════════════════════════════════════════════════════════════════════
 *
 * The rule that has to hold as this grows to five cities: no screen
 * anywhere says the word "Bengaluru" in a condition. A screen asks this
 * module what the market is and renders what it is told, so opening
 * Mysuru is one line here and no UI work at all.
 *
 * The city facts themselves — coordinates, aliases, the state — are NOT
 * repeated. They are in cities.js and looked up, because a second copy
 * of Bengaluru's latitude is a second copy that can be wrong.
 */

export const MARKET_STATUS = {
  ACTIVE:      'ACTIVE',
  COMING_SOON: 'COMING_SOON',
}

/* Partner-side status per city, keyed on the canonical name from
   cities.js. Anything not named here is COMING_SOON: a city we have
   never heard of is somewhere we are not, and defaulting the other way
   would silently open recruitment in a city with no operator. */
const PARTNER_STATUS = {
  Bengaluru: { id: 'BLR', status: MARKET_STATUS.ACTIVE, launchDate: '2026-09-01' },
  Mysore:    { id: 'MYS', status: MARKET_STATUS.COMING_SOON, launchDate: null },
}

/** Every market we know about, live or not. */
export const MARKETS = CITIES.map(c => {
  const p = PARTNER_STATUS[c.name] ?? { id: null, status: MARKET_STATUS.COMING_SOON, launchDate: null }
  return {
    marketId:  p.id ?? c.slug.slice(0, 3).toUpperCase(),
    name:      c.name,
    city:      c.name,
    state:     c.state,
    country:   'India',
    status:    p.status,
    launchDate: p.launchDate,
    coords:    c.coords,
  }
})

export const ACTIVE_MARKETS = MARKETS.filter(m => m.status === MARKET_STATUS.ACTIVE)

/**
 * The one market recruitment is open in.
 *
 * Singular today and deliberately a function, not a constant: the day a
 * second one opens, the callers that ask "which city should I offer to
 * serve" need the list, and a constant named `THE_LAUNCH_CITY` would
 * have to be hunted down and deleted from every one of them.
 */
export const launchMarkets = () => ACTIVE_MARKETS

/** The market for a city name, in any spelling. Null when we are not there. */
export function marketFor(cityName) {
  const canonical = normalizeCity(cityName)
  return MARKETS.find(m => m.city === canonical) ?? null
}

/** Is recruitment open in this city? */
export function isActiveMarket(cityName) {
  return marketFor(cityName)?.status === MARKET_STATUS.ACTIVE
}

/**
 * What a detected city means for the partner in front of us.
 *
 * @returns { status, market, city, state, knownCity }
 *   status     ACTIVE      they are in a market we recruit in
 *              COMING_SOON we know the city, we are not open in it
 *   knownCity  false when the geocoder gave us a name cities.js has
 *              never heard of — still COMING_SOON, but the screen must
 *              not claim we are "coming to" somewhere we have no plan
 *              for. It is an interest to capture, not a promise.
 */
export function marketCheck(cityName, stateName = null) {
  const canonical = normalizeCity(cityName ?? '')
  const known = findCity(canonical)
  const market = marketFor(canonical)

  return {
    status: market?.status ?? MARKET_STATUS.COMING_SOON,
    market,
    city: canonical || null,
    state: stateName ?? known?.state ?? null,
    knownCity: !!known,
  }
}
