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
 * This is also why "Use my current location" appears under "At my place"
 * and nowhere near "At a venue": GPS answers a question the venue case is
 * not asking, and offering it there would reintroduce the exact bug above
 * wearing the clothes of a convenience feature.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE COORDINATE NOW ARRIVES ALREADY RESOLVED
 * ══════════════════════════════════════════════════════════════════════
 *
 * This module used to look pincodes up itself, in a table compiled into
 * the bundle. Migration 085 moved that to the database so an area can be
 * opened with a row update instead of a Play Store release, and a
 * database lookup is asynchronous.
 *
 * Rather than make every caller await — `whereIsReady` is read inside a
 * `useMemo` on the booking screen — the RESOLUTION happens once, in the
 * UI, at the moment the customer picks a place, and the resolved point is
 * carried on the `where` object itself:
 *
 *   { kind, pincode, area, district, lat, lng, status, … }
 *
 * So the functions here stay synchronous and stay pure. They read a
 * decision that has already been made instead of making a network call in
 * the middle of a render. `lib/pincodeDirectory.js` is what does the
 * asking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ANSWERS TO "WHERE"
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
 * The offline bootstrap lookup.
 *
 * Kept for the one caller that has no async path available and for
 * `lib/pincodeDirectory.js` to fall back to when the network drops
 * mid-booking. It only knows the 88 committed Bengaluru pincodes, and it
 * CANNOT tell "we do not serve there" from "that is not a pincode" —
 * which is the whole reason serviceability moved to the database.
 *
 * New code should call `lookupPincode` from `lib/pincodeDirectory.js`.
 */
export function resolvePincode(raw) {
  const pin = String(raw ?? '').replace(/\D/g, '')
  if (pin.length !== 6) return null

  const hit = PINCODES[pin]
  if (!hit || hit.lat == null) return null

  return {
    pincode: pin,
    area: hit.area,
    district: hit.district,
    lat: hit.lat,
    lng: hit.lng,
    precision: PRECISION.area,
    serviceable: true,
  }
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

  // A saved address carries its own coordinate (migration 057 added
  // `customer_addresses.location`) and so does a pincode the customer has
  // just resolved through the directory. Both land in the same two
  // fields, and `precision` is what separates them on screen.
  const hasPoint = where.lat != null && where.lng != null

  if (where.kind === 'home') {
    if (!hasPoint) return null
    return {
      lat: where.lat,
      lng: where.lng,
      areaLabel: where.area ?? where.pincode ?? 'Home',
      addressText: where.addressText ?? '',
      precision: where.precision === PRECISION.exact ? PRECISION.exact : PRECISION.area,
    }
  }

  if (where.kind === 'venue') {
    if (!hasPoint) return null
    return {
      lat: where.lat,
      lng: where.lng,
      areaLabel: where.area ?? where.pincode ?? 'Venue',
      // The venue's NAME is the useful half for a master — "Sri Krishna
      // Kalyana Mantapa" tells them more about the job than a street
      // does. It is not scrubbed as contact detail because it is not one.
      addressText: [where.venueName, where.area, where.pincode].filter(Boolean).join(', '),
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
 * rather than showing an empty matching screen. Each `reason` below gets
 * its own sentence on screen, because they are genuinely different
 * situations and only one of them is the customer's mistake.
 */
export function dispatchability(where) {
  if (!where || !where.kind || where.kind === 'undecided') {
    return { ok: false, reason: 'no_location', scan: 'Tell us where it is' }
  }

  const status = where.status ?? (where.lat != null ? 'served' : 'incomplete')

  if (status === 'incomplete') {
    return { ok: false, reason: 'incomplete', scan: 'Finish the pincode' }
  }

  if (status === 'unknown') {
    return {
      ok: false,
      reason: 'unknown_pincode',
      scan: 'Check that pincode',
      detail: 'Those six digits are not a pincode we can find. Worth a second look.',
    }
  }

  if (status === 'not_served') {
    return {
      ok: false,
      reason: 'not_served',
      scan: 'Not in our area yet',
      detail: 'We are matching masters in Bengaluru first. Leave it with us and we will tell you the day we reach you.',
    }
  }

  const point = dispatchPointFor(where)
  if (!point) {
    return { ok: false, reason: 'no_point', scan: 'Pick the area again' }
  }

  return { ok: true, point }
}

/** Whether the offline bootstrap is the pilot table or the real directory. */
export const pincodeSource = () => PINCODE_SOURCE
