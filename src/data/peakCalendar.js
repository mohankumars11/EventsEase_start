/**
 * Calendar pressure — the half of the demand signal that needs no database.
 *
 * The whole point of this file is that it is true on day one. A brand-new
 * concierge has no booking history, so a calendar driven only by counts would
 * show 340 identical empty days. But some dates genuinely *are* harder than
 * others, for reasons that have nothing to do with how many customers
 * Sambramo has yet: a Saturday in December is harder than a Tuesday in July
 * for every decorator in Bengaluru, and that is worth telling people.
 *
 * What is NOT in here is anything invented. No booked counts, no "23 people
 * viewing", no numbers at all — those come from real rows via date_demand()
 * or they don't appear. See src/lib/demand.js, which enforces that.
 */

import { UPCOMING_FESTIVALS } from './eventServicesData'

// Re-exported so demand.js has one import for calendar data. The dates live
// in eventServicesData because the home screen already counts down to them;
// duplicating the list here is how the two would drift apart.
export { UPCOMING_FESTIVALS }

/**
 * A festival puts pressure on the days *around* it, not just the day itself —
 * a Diwali party on the Saturday before is competing for the same decorators.
 */
export const FESTIVAL_HALO_DAYS = 2

/**
 * Seasons when celebrations cluster in Karnataka.
 *
 * These are broad and safely true — the wedding season really does run from
 * roughly mid-November to mid-February, and the market really does go quiet
 * during Ashada. Stated as seasons rather than specific dates precisely
 * because that is the level at which they can be asserted honestly.
 *
 * `from`/`to` are MM-DD, year-agnostic. A window whose `to` is earlier than
 * its `from` wraps across new year — see inSeasonWindow() in demand.js.
 */
export const SEASON_WINDOWS = [
  {
    id: 'wedding-winter',
    from: '11-15',
    to: '02-15',
    label: 'Wedding season',
    note: 'Peak wedding months across Karnataka — decorators and caterers book out earliest now.',
    weight: 2,
  },
  {
    id: 'wedding-summer',
    from: '04-20',
    to: '05-31',
    label: 'Summer wedding season',
    note: 'The second wedding season, and school holidays — family events cluster here.',
    weight: 2,
  },
  {
    id: 'festive-run',
    from: '09-20',
    to: '11-10',
    label: 'Festive season',
    note: 'Navratri through Diwali. Vendors are stretched across festival work as well as private events.',
    weight: 2,
  },
  {
    id: 'ashada-quiet',
    from: '07-05',
    to: '08-05',
    label: 'Ashada',
    note: 'Traditionally a quiet month for weddings — easier to get the vendors you want.',
    // Negative: this window makes dates *easier*, and saying so is what makes
    // the rest of the calendar credible. A calendar where every day is busy
    // is a calendar nobody believes.
    weight: -1,
  },
]

/**
 * Auspicious dates, from a published panchang.
 *
 * DELIBERATELY EMPTY. On a muhurtham the whole city's vendor bench is spoken
 * for, which makes these the strongest honest signal this calendar can carry
 * — but only if they are right. A wrong muhurtham is both a false claim and
 * embarrassing in front of exactly the families who would catch it, so these
 * are not something to guess at.
 *
 * Seed them through Admin → Peak dates, which records a `source` per row, or
 * add them here with the same discipline:
 *
 *   { date: '2026-11-22', label: 'Shubha muhurtham',
 *     note: 'An auspicious wedding date — the city books out weeks ahead.',
 *     weight: 3, source: 'Udupi panchanga 2026-27' }
 *
 * Update annually. Like UPCOMING_FESTIVALS, no `daysOut` is stored, so
 * nothing here can go quietly stale.
 */
export const MUHURTHAM_DATES = []
