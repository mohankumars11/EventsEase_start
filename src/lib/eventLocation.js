import { PINCODES, PINCODE_SOURCE } from '../config/generatedPincodes'

/**
 * Where the event happens — which is not where the customer is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MISTAKE THIS MODULE EXISTS TO STOP
 * ══════════════════════════════════════════════════════════════════════
 *
 * The booking flow first shipped asking "Which part of Bengaluru?" and
 * dispatched from the answer. That question is ambiguous in exactly the
 * way that matters: a customer reads it as "where am I", and dispatch
 * needs "where is the work".
 *
 * A family living in Bellandur booking a mantapa in Rajajinagar would
 * have had masters matched around Bellandur — fourteen kilometres from
 * the job. Every one of them either declines on arrival at the detail, or
 * worse accepts and finds out on the day. Both cost supply, and supply is
 * the side this marketplace can least afford to lose.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A RIDE-HAILING PROBLEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * An auto or a bike taxi picks you up WHERE YOU ARE, NOW. Both facts are
 * knowable from the phone in your hand, and the whole model rests on
 * them.
 *
 * Neither is true here. The work happens somewhere else, on a date that
 * has not arrived, and the customer's own position is irrelevant to
 * matching — it is a sensible DEFAULT (most home events are near home)
 * and never a constraint.
 *
 * So the radius is always MASTER → VENUE. A decorator's ten kilometres is
 * about their van and their evening, not about the customer's commute.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE HONEST ANSWERS TO "WHERE"
 * ══════════════════════════════════════════════════════════════════════
 *
 *   home      the customer's own address — birthdays, housewarmings,
 *             poojas, naming ceremonies. Most instant bookings.
 *
 *   venue     a hall, a mantapa, a farmhouse. The customer may live
 *             across the city and it does not matter.
 *
 *   undecided common when pre-booking, and a real answer rather than a
 *             failure. Dispatch cannot run without a point, so this
 *             routes to a coordinator instead of showing a countdown
 *             against nobody.
 */

/** How precisely a pincode locates something. Shown to the customer. */
export const PRECISION = {
  exact:  'exact',   // a saved address with its own coordinate
  area:   'area',    // a pincode centroid — good to ~2 km
  none:   'none',    // undecided
}

/**
 * Resolve six digits to a point.
 *
 * Returns null rather than guessing. A pincode this dataset does not
 * carry is a real answer — "we do not serve there yet" — and inventing a
 * centroid for it would dispatch masters at a place nobody named.
 */
export function resolvePincode(raw) {
  const pin = String(raw ?? '').replace(/\D/g, '')
  if (pin.length !== 6) return null

  const hit = PINCODES[pin]
  if (!hit) return null

  return {
    pincode: pin,
    area: hit.area,
    district: hit.district,
    lat: hit.lat,
    lng: hit.lng,
    // `approx` rows come from the data.gov.in refresh with no verified
    // centroid behind them. The UI must not imply precision it lacks.
    precision: hit.approx ? PRECISION.area : PRECISION.area,
    serviceable: hit.lat != null,
  }
}

/** Is this a pincode we can actually dispatch into? */
export function isServiceable(raw) {
  return !!resolvePincode(raw)?.serviceable
}

/**
 * The dispatch point for a booking, from whichever answer was given.
 *
 * One function, so no screen can decide this a second way. A second
 * implementation would eventually take the customer's address for a
 * venue booking, which is the bug this file is named after.
 */
export function dispatchPointFor(where) {
  if (!where) return null

  if (where.kind === 'home') {
    // A saved address may carry its own coordinate (migration 057 added
    // `customer_addresses.location`). Fall back to its pincode.
    if (where.lat != null && where.lng != null) {
      return {
        lat: where.lat, lng: where.lng,
        areaLabel: where.area ?? where.pincode ?? 'Home',
        addressText: where.addressText ?? '',
        precision: PRECISION.exact,
      }
    }
    const p = resolvePincode(where.pincode)
    return p && {
      lat: p.lat, lng: p.lng,
      areaLabel: p.area,
      addressText: where.addressText ?? '',
      precision: PRECISION.area,
    }
  }

  if (where.kind === 'venue') {
    const p = resolvePincode(where.pincode)
    if (!p) return null
    return {
      lat: p.lat, lng: p.lng,
      areaLabel: p.area,
      // The venue's NAME is the useful half for a master — "Sri Krishna
      // Kalyana Mantapa" tells them more about the job than a street
      // does. It is not scrubbed as contact detail because it is not one.
      addressText: [where.venueName, p.area, p.pincode].filter(Boolean).join(', '),
      venueName: where.venueName ?? null,
      precision: PRECISION.area,
    }
  }

  // undecided — deliberately no point. See the header.
  return null
}

/**
 * Can this booking be dispatched at all?
 *
 * Separated from `dispatchPointFor` so a caller can explain WHY not,
 * rather than showing an empty matching screen. "We do not serve that
 * pincode yet" and "you have not told us where" are different sentences
 * and the customer can act on both.
 */
export function dispatchability(where) {
  if (!where || where.kind === 'undecided') {
    return { ok: false, reason: 'no_location', scan: 'Tell us where it is' }
  }
  const point = dispatchPointFor(where)
  if (!point) {
    return {
      ok: false,
      reason: 'not_serviced',
      scan: 'Not in our area yet',
      detail: `We are matching masters in Bengaluru first. Leave your pincode and we will tell you when we reach it.`,
    }
  }
  return { ok: true, point }
}

/** Whether the pincode table is the bootstrap or the real directory. */
export const pincodeSource = () => PINCODE_SOURCE
