import { TRADE_FOR_SERVICE } from '../config/vendor'
import { SERVICE_BY_ID } from './servicePricing'
import { SERVICE_OPTIONS } from './instantOptions'

/**
 * What a partner can say they do — picked, never typed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY FREE TEXT WAS COSTING PARTNERS WORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vendor_services.name` was a text box and `category` was a dropdown
 * bolted on later. A real partner on this platform has a row reading
 * "videpgraphy" — one transposed letter — and that row has never been
 * offered a single job, because `match_partners` joins on the trade and
 * nothing was there to match.
 *
 * Nobody told them. Nothing could: the app had no idea what a service
 * was supposed to be called, so it could not tell a typo from a
 * speciality.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SO THE LIST IS THE CUSTOMER'S OWN CATALOGUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Derived at runtime from the three modules that already decide what a
 * customer can order:
 *
 *   config/vendor.js         which trade each service dispatches as
 *   data/servicePricing.js   what each service is called
 *   data/instantOptions.js   the real variants inside a service —
 *                            candid vs posed, eggless vs regular,
 *                            4 drummers vs 8
 *
 * Derived rather than retyped, and that is the whole point: a partner
 * can only offer things a customer can actually book, and adding a
 * service to the customer catalogue makes it offerable by partners the
 * same day. A hand-copied list would be wrong within a month and wrong
 * silently.
 *
 * ── Why the variants matter ─────────────────────────────────────────
 * "Photography" tells a coordinator nothing. "Candid" and "Posed &
 * family" are different jobs, different kit and different money, and a
 * partner who only does one should be able to say so. They are the same
 * strings the customer picks from, so the two sides describe the work
 * with one vocabulary.
 */

/* Services that servicePricing deliberately excludes, because decor and
   catering are priced by their own engines (instantSetups.js). They are
   still real things to offer, so they need a name here — and only here,
   which is why the list is short and static rather than another map to
   keep in sync. */
const FALLBACK_NAMES = {
  floral:      'Floral decoration',
  stage:       'Stage decoration',
  mandap:      'Mandap setup',
  balloon:     'Balloon decoration',
  decor:       'Theme decoration',
  catering:    'Catering',
  cooks:       'Cook at your place',
  welcome_drinks: 'Welcome drinks',
  live_music:  'Live band or classical',
  entertainment: 'Performers',
  choreography: 'Dance choreography',
  kids_play:   'Kids play zone',
  bridal_wear: 'Bridal / groom styling',
  av_setup:    'Sound & AV setup',
  invitations: 'Invitations & printing',
  transport:   'Guest transport',
  bouncers:    'Security / bouncers',
  venue:       'Venue',
  tent:        'Tent & shamiana',
  cleanup:     'Venue cleanup',
  dining:      'Seating & dining setup',
  photobooth:  'Photo booth',
  memory_wall: 'Memory wall',
  sweets:      'Sweets & mithai',
  ice_cream:   'Ice cream counter',
  vehicle_decor: 'Car decoration',
  drum:        'Dhol / nadaswaram',
  lighting:    'Event lighting',
}

function nameFor(serviceId) {
  return SERVICE_BY_ID?.[serviceId]?.name
    ?? FALLBACK_NAMES[serviceId]
    ?? serviceId
}

/** Every trade `match_partners` can match on, in catalogue order. */
export const TRADES = [...new Set(Object.values(TRADE_FOR_SERVICE))].sort()

/**
 * The offerings inside one trade.
 *
 * @returns [{ serviceId, name, variants: [{ id, label }] }]
 */
export function offeringsForTrade(trade) {
  const ids = Object.entries(TRADE_FOR_SERVICE)
    .filter(([, t]) => t === trade)
    .map(([id]) => id)

  return ids.map(serviceId => {
    const groups = SERVICE_OPTIONS?.[serviceId] ?? []
    /* Only the groups that describe WHAT IS DELIVERED. A dietary
       restriction or a language is a detail of one booking, not a
       different service a partner chooses to offer, and putting them
       here would ask somebody to tick "eggless" as though it were a
       line of business. */
    const variants = groups
      .filter(g => g.setup || /kind|type|style|coverage|much|how many|which service/i.test(g.question ?? ''))
      .flatMap(g => g.choices.map(c => ({ id: `${serviceId}:${g.id}:${c.id}`, label: c.label })))

    return { serviceId, name: nameFor(serviceId), variants }
  })
}

/** Every offering across every trade, for search. */
export function allOfferings() {
  return TRADES.flatMap(trade =>
    offeringsForTrade(trade).map(o => ({ ...o, trade })))
}

/**
 * The trade a catalogue name belongs to.
 *
 * The reason this file exists: a saved service can always be traced back
 * to a trade dispatch understands, because it was never typed.
 */
export function tradeForOfferingName(name) {
  const hit = allOfferings().find(o => o.name === name)
  return hit?.trade ?? null
}
