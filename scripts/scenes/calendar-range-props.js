/**
 * The props both range-sheet scenes share.
 *
 * Split out so the two shots differ in exactly one thing -- the mode --
 * and a change to the fixture cannot make them disagree about anything
 * else. Plain .js: no JSX here, only data.
 */
const TODAY = new Date().toISOString().slice(0, 10)

export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* Confirmed work three days out, inside the range the sheet opens on,
   so the clash signal is live rather than hypothetical. */
const jobs = [
  { line_id: '1', event_date: addDays(TODAY, 3), status: 'accepted',
    occasion_name: 'Sharma Sangeet', service_name: 'Catering' },
]

/* Real enquiry counts. The 2 is deliberate: it sits below
   INTEREST_FLOOR and must produce no line at all, because "2 enquiries"
   printed on a date reads as "nobody wants this". */
const interestByDate = new Map([
  [addDays(TODAY, 4), { total: 7 }],
  [addDays(TODAY, 5), { total: 4 }],
  [addDays(TODAY, 6), { total: 9 }],
  [addDays(TODAY, 7), { total: 2 }],
])

const noop = async () => {}

export const MODE_FOR = { blocked: 'BLOCKED', open: 'OPEN' }

export const SHEET_PROPS = {
  jobs,
  availability: {},
  weeklyRules: [],
  interestByDate,
  maxPerDay: 1,
  initialFrom: addDays(TODAY, 3),
  onSetRange: noop,
  onClearDays: noop,
  onClose: noop,
}
