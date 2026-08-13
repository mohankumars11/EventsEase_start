// One service, bookable on its own, end to end.
//
// ── The problem ─────────────────────────────────────────────────────────
// The plan hub grew a "Need just one thing?" shelf — the right idea, and the
// door that never existed. But tapping a service on it selected a chip, and the
// only thing you could do with a selection was press "Get a quote", which threw
// the customer into the six-step celebration wizard: what occasion, how many
// guests, what budget, when shall we call you.
//
// Somebody who wants a cook for Sunday lunch has now been asked which
// celebration package they would like. Somebody who taps "Theme Decoration"
// because they want to see decorations is shown a form. The shelf promised
// "pick a single service and we'll arrange only that" and then did the exact
// thing it promised not to.
//
// ── What this file is ───────────────────────────────────────────────────
// The resolver that makes a service into a *product*: what its real choices
// are, where they come from, and what one costs. Three shapes, because the
// catalogue genuinely has three:
//
//   kind: 'decor'  the setup catalogue in decorThemes.js, filtered to the
//                  families that belong to this service. Tapping "Balloon Arch"
//                  shows balloon setups, not all eighty.
//   kind: 'menu'   the cuisine catalogue in cuisineMenus.js — sixteen cuisines,
//                  seven courses each, every dish tickable and priced per plate.
//   kind: 'packs'  the priced packages in servicePacks.js: three to five named
//                  options with what is delivered and what it costs.
//
// Nothing here invents data. It routes a service id to the catalogue that
// already answers for it, which is what stops the single-service door and the
// celebration builder from ever quoting two different numbers for the same
// thing.

import { TOP_SERVICES } from './planCatalog'
import { SERVICE_PACKS, packsFrom } from './servicePacks'
import { DECOR_FAMILIES, THEMES_BY_FAMILY, themeFrom } from './decorThemes'
import { CUISINES } from './cuisineMenus'
import { batchBandFor } from './celebrationTiers'

/**
 * Which decoration families a décor service opens on.
 *
 * `decor` is the front door and shows everything; the rest are the same
 * catalogue entered through a narrower gate, because somebody who tapped
 * "Mandap Decoration" has already told us what they want and should not have
 * to scroll past jungle safari to reach it.
 *
 * The families are not exclusive — a mandap is also a floral setup — so the
 * page always offers "see all decorations" as a way out of the filter.
 */
const DECOR_ROUTES = {
  decor:        null,                                    // everything
  stage:        ['stage', 'light'],
  floral:       ['floral', 'wedding', 'ritual'],
  balloon_arch: ['balloon'],
  mandap:       ['wedding', 'regional'],
  lighting:     ['light', 'stage'],
  candle_setup: ['romantic', 'light'],
  tent:         ['outdoor'],
}

/** Services whose options are the cuisine catalogue. */
const MENU_ROUTES = {
  catering:       { courses: null,        label: 'the full spread' },
  cooks:          { courses: null,        label: 'what they will cook' },
  menu:           { courses: null,        label: 'every dish, every cuisine' },
  welcome_drinks: { courses: ['welcome'], label: 'the arrival drinks' },
}

/**
 * The line under the service name at the top of its page.
 *
 * Written per service rather than reusing `desc` from the catalogue, because
 * `desc` is a list of nouns sized for a card ("Balloons, florals, props &
 * themed setups") and this is the sentence that has to make somebody stay.
 */
const HERO_COPY = {
  decor:        'Eighty-odd setups, every one of them priced. Pick the one you want, tell us how big the room is, and book it — no forms, no callback.',
  menu:         'Sixteen cuisines and several hundred dishes. Build the actual menu, dish by dish, and watch the per-plate rate move as you do.',
  catering:     'Sixteen cuisines and several hundred dishes. Build the actual menu, dish by dish, and watch the per-plate rate move as you do.',
  cooks:        'Cooks who come to your kitchen and make the meal in front of you. Choose the cuisine and the dishes; they bring the rest.',
  welcome_drinks: 'What guests are handed at the door. Panaka, kokum, sherbets, filter coffee — priced per head, served for as long as you need.',
}

/**
 * Everything the detail page needs about one service.
 *
 * Returns `null` for an id that is not in the catalogue, so the route can show
 * a real "we don't have that" page rather than rendering an empty shell.
 */
export function resolveService(serviceId) {
  const service = TOP_SERVICES.find(s => s.id === serviceId)
  if (!service) return null

  const blurb = HERO_COPY[serviceId]

  if (serviceId in DECOR_ROUTES) {
    const familyIds = DECOR_ROUTES[serviceId]
    const families = familyIds
      ? DECOR_FAMILIES.filter(f => familyIds.includes(f.id))
      : DECOR_FAMILIES
    const themes = families.flatMap(f => THEMES_BY_FAMILY[f.id] ?? [])
    return {
      service,
      kind: 'decor',
      blurb: blurb ?? `${themes.length} setups you can book directly — priced, with what gets installed listed on every one.`,
      families,
      themes,
      /** The filter is narrower than the catalogue, so offer the way out. */
      showAllLink: !!familyIds,
      from: themes.length ? Math.min(...themes.map(themeFrom)) : null,
      optionCount: themes.length,
      optionNoun: themes.length === 1 ? 'setup' : 'setups',
    }
  }

  if (serviceId in MENU_ROUTES) {
    const route = MENU_ROUTES[serviceId]
    return {
      service,
      kind: 'menu',
      blurb: blurb ?? HERO_COPY.menu,
      courseFilter: route.courses,
      menuLabel: route.label,
      // The honest floor: the cheapest cuisine at the best batch rate.
      from: Math.round(
        Math.min(...CUISINES.map(c => c.basePlate)) * batchBandFor(500).multiplier
      ),
      fromUnit: 'per plate',
      optionCount: CUISINES.length,
      optionNoun: 'cuisines',
    }
  }

  const shelf = SERVICE_PACKS[serviceId]
  if (shelf) {
    const entry = packsFrom(serviceId, 100)
    return {
      service,
      kind: 'packs',
      blurb: blurb ?? shelf.blurb,
      unitHint: shelf.unitHint,
      packs: shelf.packs,
      from: entry?.amount ?? null,
      fromUnit: entry?.unit ?? null,
      optionCount: shelf.packs.length,
      optionNoun: shelf.packs.length === 1 ? 'package' : 'packages',
    }
  }

  // In the catalogue but with nothing priced behind it yet. The page renders
  // the enquiry path for these rather than pretending to be bookable — which
  // is the one case where handing over to a coordinator is the honest answer
  // rather than the lazy one.
  return {
    service,
    kind: 'enquiry',
    blurb: service.desc,
    from: service.priceMin ?? null,
    optionCount: 0,
    optionNoun: 'options',
  }
}

/** Is this service bookable on its own right now? Used by the shelf cards. */
export function isBookable(serviceId) {
  return serviceId in DECOR_ROUTES || serviceId in MENU_ROUTES || serviceId in SERVICE_PACKS
}

/**
 * Every service that can be booked end to end, for the shelf's own count.
 *
 * Computed rather than written down: the moment somebody adds a pack shelf for
 * a service, it starts counting itself, and the headline on the plan hub cannot
 * drift away from what the catalogue actually offers.
 */
export const BOOKABLE_SERVICE_IDS = TOP_SERVICES
  .map(s => s.id)
  .filter(isBookable)

/**
 * The cart line for a configured single-service booking.
 *
 * ── Why the event id is `single-<serviceId>` ────────────────────────────
 * The cart keys an item as `${eventId}__${serviceId}` and groups the cart page,
 * the booking details and the enquiry row by event id. A single-service booking
 * has no occasion, and the two obvious shortcuts are both wrong:
 *
 *   one shared `single` bucket — a cook for Sunday and decor for next month
 *     would share one date, one venue and one enquiry;
 *   the real occasion id — there isn't one, and inventing "birthday" would file
 *     a request for a birthday nobody mentioned.
 *
 * So each service gets its own bucket. A customer booking decor and a
 * photographer gets two cards in the cart, each with its own date and venue,
 * and the coordinator receives two enquiries that can be worked independently
 * — which is exactly what "I only need this one thing" means operationally.
 *
 * `service.id` carries the chosen option, so two different decorations are two
 * different lines rather than one that silently absorbs the other. Note the
 * separator: `__` is the key delimiter the cart splits on, so anything embedded
 * here uses `:` and never `__`.
 */
export function cartLineFor({ service, optionId, optionName, price, summary, qty = 1 }) {
  return {
    eventId: `single-${service.id}`,
    eventName: `${service.name} — booked on its own`,
    service: {
      id: optionId ? `${service.id}:${optionId}` : service.id,
      name: optionName ? `${service.name} — ${optionName}` : service.name,
      emoji: service.emoji,
      desc: summary?.[0] ?? service.desc,
      // The configured price, not the catalogue band. This is what the cart
      // totals and what `unit_price` on the row carries, so the number the
      // customer agreed to on the option card is the number they see at
      // checkout and the number the coordinator is briefed with.
      priceMin: price,
      priceMax: price,
      priceHint: price ? `₹${price.toLocaleString('en-IN')}` : 'Custom quote',
      /** The chosen options, in the customer's words, for the cart and enquiry. */
      summary: summary ?? [],
      /**
       * How many units the price already covers — four guards, two minders.
       *
       * Deliberately NOT the cart's `qty`, which stays 1: `price` above is the
       * total for all of them, so letting the cart multiply by the unit count
       * as well would bill four guards sixteen times. This field is here for
       * the coordinator to read, not for arithmetic.
       */
      unitsBooked: qty,
    },
  }
}
