/**
 * Normalize the event facts consumed by the deterministic recommendation engine.
 *
 * Venue choice is authoritative over a previously saved venue type. This is
 * important when a customer edits an event (for example, home -> restaurant):
 * stale context must never keep suppressing or activating services.
 */
const VENUE_TYPE = {
  banquet: 'banquet',
  lawn: 'outdoor',
  rooftop: 'outdoor',
  hotel: 'hotel',
  resort: 'destination',
  farmhouse: 'outdoor',
  dining: 'restaurant',
  restaurant: 'restaurant',
  community: 'banquet',
  convention: 'banquet',
  ground: 'outdoor',
};

const VENUE_CHOICE_TYPE = {
  home: 'home',
  restaurant: 'restaurant',
  banquet: 'banquet',
  outdoor: 'outdoor',
};

const WHERE_TYPE = {
  home: 'home',
  newhome: 'home',
  school: 'campus',
  campus: 'campus',
  premises: 'office',
  site: 'outdoor',
  online: 'virtual',
};

const PICK_LISTS = [
  ['need', 'added'],
  ['have', 'arranged'],
  ['skip', 'excluded'],
  ['later', 'later'],
];

/**
 * Build the one canonical context for recommendations and venue matching.
 * Customer choices replace the derived fields; unanswered details stay
 * unanswered rather than being inferred.
 */
export function contextFor(occasion, picks = {}, event = {}) {
  const context = { ...(event.context ?? {}) };

  for (const field of ['date', 'time', 'hours', 'guests']) {
    if (!Object.prototype.hasOwnProperty.call(event, field)) continue;
    const value = event[field];
    if (value == null || value === '') delete context[field];
    else context[field] = value;
  }

  // These are derived from the current event controls, not free-form About
  // answers. Delete old values first so an edit cannot leave stale decisions.
  for (const field of ['added', 'arranged', 'excluded', 'later']) delete context[field];
  for (const [pick, field] of PICK_LISTS) {
    const values = Object.keys(picks).filter(tradeId => picks[tradeId] === pick);
    if (values.length) context[field] = values;
  }

  // An explicit venue choice wins even when an older local plan stored a
  // different venueType. "Need" and "Other" intentionally remain unknown
  // unless a concrete venue kind was selected.
  let venueType;
  if (event.venueChoice != null) {
    venueType = VENUE_CHOICE_TYPE[event.venueChoice];
    if (!venueType && event.venueChoice === 'need' && event.venueKind) {
      venueType = VENUE_TYPE[event.venueKind];
    }
  } else if (event.venueKind != null) {
    venueType = VENUE_TYPE[event.venueKind];
  } else {
    venueType = WHERE_TYPE[occasion?.where] ?? context.venueType;
  }

  if (venueType) context.venueType = venueType;
  else delete context.venueType;

  // Venue booking is also derived from the current answer, not a stale
  // property inherited from a previous version of this event.
  if (Object.prototype.hasOwnProperty.call(event, 'venue')) {
    delete context.venueBooked;
    if (event.venue === 'have') context.venueBooked = true;
  }

  return context;
}
