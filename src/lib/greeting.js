/**
 * "Good morning, Rahul" / "Happy Friday!"
 *
 * ══════════════════════════════════════════════════════════════════════
 * PURE, BECAUSE THE INTERESTING CASES ARE ALL EDGE CASES
 * ══════════════════════════════════════════════════════════════════════
 *
 * This lived inside JobsHeader.jsx, which meant the only way to check
 * that 4:59am says "Good evening" and 5:00am says "Good morning" was to
 * change the device clock and look. Twenty-one combinations of weekday
 * and band, plus a dozen ways an Indian name can be written, is not a
 * thing anybody verifies by looking.
 *
 * So the rules live here with no React in them and
 * `scripts/check-greeting.mjs` asserts every one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BANDS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   05:00  Good morning
 *   12:00  Good afternoon
 *   17:00  Good evening
 *
 * Evening runs through the small hours on purpose. There is no "Good
 * night" band: a partner reading this at 2am is working, and wishing
 * them goodnight over a live jobs list is the app telling them to stop.
 *
 * Device clock, not server. A partner in Dubai at 9am should read "Good
 * morning" even though it is 10:30 in Bengaluru -- the greeting is about
 * where the person is, unlike every date in the rest of this app, which
 * is IST because that is where the event is.
 */

export const BANDS = {
  MORNING: 'Good morning',
  AFTERNOON: 'Good afternoon',
  EVENING: 'Good evening',
}

export function wishFor(date = new Date()) {
  const h = date.getHours()
  if (h >= 17 || h < 5) return BANDS.EVENING
  return h < 12 ? BANDS.MORNING : BANDS.AFTERNOON
}

/**
 * Milliseconds until the band changes.
 *
 * Without this the greeting is fixed at whatever it was when the
 * component mounted, and this is an app a partner leaves open on the
 * jobs list all day -- so it would still read "Good morning" at four in
 * the afternoon.
 */
export function msUntilNextBand(date = new Date()) {
  const h = date.getHours()
  const bound = h < 5 ? 5 : h < 12 ? 12 : h < 17 ? 17 : 29 /* 29 = 05:00 tomorrow */
  const next = new Date(date)
  next.setHours(bound % 24, 0, 0, 0)
  if (bound >= 24) next.setDate(next.getDate() + 1)
  return next - date
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE FIRST NAME, AND WHEN THERE ISN'T ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `profiles.full_name` is free text a person typed about themselves, so
 * it arrives as "Rahul", "Rahul Sharma", "  rahul  ", "R. Sharma",
 * "Sri Rahul Sharma", and sometimes as the business name because that is
 * what the box in front of them seemed to want.
 *
 * ── Returning null is a real answer ─────────────────────────────────
 * "Good morning, ." and "Good morning, Decor" are both worse than "Good
 * morning." on its own. So anything this cannot confidently read as a
 * person's given name comes back null and the greeting simply has no
 * name in it. The line still works; it just stops being personal.
 *
 * ── Honorifics are dropped ──────────────────────────────────────────
 * "Mr Rahul" greeted as "Mr" is the failure this is most likely to hit
 * in India, where Sri/Smt/Shri are commonly typed into a name box.
 *
 * ── A single initial is not a name ──────────────────────────────────
 * "R. Sharma" gives "Sharma", not "R" -- South Indian names are
 * routinely written initial-first, where the initial is the father's
 * name or the village and the given name is the part after it.
 */
const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'sri', 'shri', 'smt', 'smt.', 'sree', 'thiru', 'selvi', 'kumari',
])

export function firstNameOf(fullName) {
  const raw = String(fullName ?? '').trim()
  if (!raw) return null

  /* Anything with a digit or an @ in it is not somebody's name -- it is
     a phone number, an email, or a business with a number in it. */
  if (/[@\d]/.test(raw)) return null

  const parts = raw
    .split(/\s+/)
    .map(p => p.replace(/[.,]+$/, '').trim())
    .filter(Boolean)
    .filter(p => !HONORIFICS.has(p.toLowerCase().replace(/\.$/, '')))

  /* A lone initial is skipped in favour of what follows it. If the
     initial is ALL there is, there is no name to use. */
  const named = parts.filter(p => p.replace(/[^\p{L}]/gu, '').length > 1)
  const pick = named[0]
  if (!pick) return null

  /* Longer than this is a business, a sentence, or a mistake. */
  if (pick.length > 20) return null

  /* Typed in caps or in lower case far more often than not. Title case
     is what a person would write if they were being careful, and it is
     what the greeting should show either way. */
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase()
}

/**
 * "Happy Friday!"
 *
 * Deliberately the device's own weekday and deliberately never
 * hard-coded. It reads as warmth rather than as information, which is
 * the point -- the line above it is the one carrying the status.
 */
export function dayLineFor(date = new Date()) {
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' })
  return `Happy ${weekday}!`
}

/**
 * The whole greeting, in one call.
 *
 * Returns `{ wish, dayLine }` where `wish` already carries the name when
 * there is one to carry, so a caller never has to assemble the comma.
 */
export function greetingFor({ fullName = null, date = new Date() } = {}) {
  const name = firstNameOf(fullName)
  const base = wishFor(date)
  return {
    wish: name ? `${base}, ${name}` : base,
    dayLine: dayLineFor(date),
    name,
  }
}
