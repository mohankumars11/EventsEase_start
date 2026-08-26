// What each of the fifteen celebrations actually needs, in the order a family
// decides it.
//
// ══════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ══════════════════════════════════════════════════════════════════════
//
// The app already knew *what* it sells. `eventServicesData.js` lists 24–30
// services against every occasion, `servicePacks.js` prices ~160 real packages
// under them, `cuisineMenus.js` holds seventeen full spreads. What nothing
// held was the SEQUENCE — the order a person actually thinks in, and the
// question that has to be asked before the next one makes sense.
//
// So every planning surface fell back on the same shape: here are thirty
// services in a grid, here is a price, tick what you want. That is a
// procurement form. Nobody plans their mother's sixtieth on a procurement
// form. A family plans in a fixed order, and the order is not the order a
// catalogue sorts in:
//
//   1. what kind of function is this, exactly     (a 5-year-old's party and a
//                                                  shashtiabdapoorthi are not
//                                                  the same birthday)
//   2. how many people, and where
//   3. the ritual, if there is one — because the muhurtham fixes the clock
//      and everything else is arranged around it
//   4. the food, which is what guests will actually talk about afterwards
//   5. how it looks
//   6. how it is remembered
//   7. how the guests are looked after
//   8. what they carry home
//   9. the unglamorous things that decide whether any of it works — power,
//      parking, washrooms, the clearing crew
//
// This file encodes that order, per occasion, as a list of chapters. One
// chapter is one decision, shown on its own screen, with its real options
// underneath it. Nothing is a grid.
//
// ══════════════════════════════════════════════════════════════════════
// THE RULE ABOUT PRICE
// ══════════════════════════════════════════════════════════════════════
//
// No chapter in this file carries a number, and the screens that render them
// show none. That is not squeamishness, it is how this market works: a
// five-figure estimate shown to somebody who has answered two questions is
// not transparency, it is a stranger quoting at you before hello — and the
// reaction to being quoted at is to leave and ring the caterer your cousin
// used. The prices are real and they are all in `servicePacks.js`; they are
// revealed once, at the end, itemised, against a plan the customer built
// themselves and can therefore recognise.
//
// A pack is still described honestly at the point of choosing — what is in
// it, how long the crew stays, what is NOT included. Somebody choosing "Full
// day — candid + traditional" over "Half day — one photographer" is making
// the expensive choice knowingly, on what they get, rather than on a number
// they are comparing to a budget they have not set yet.
//
// ══════════════════════════════════════════════════════════════════════
// THE TWO KINDS OF CHAPTER
// ══════════════════════════════════════════════════════════════════════
//
//   kind: 'choice'    A question about the celebration itself, whose answer
//                     changes what gets asked afterwards. It books nothing.
//                     "Whose birthday is it?" is the whole reason the app can
//                     stop offering a bouncy castle for a 60th.
//
//   kind: 'service'   One service, with its real packs from servicePacks.js.
//                     `packIds` filters and orders them for THIS occasion —
//                     a naming ceremony should not be offered the multi-day
//                     wedding photography package, and a wedding should be
//                     offered it first.
//
// `showIf(ctx)` gates a chapter on what has already been answered. `ctx` is
// `{ flags, circleId, guests, venueKind, outdoor }`. Gating is what keeps
// fifteen occasions from becoming one long questionnaire: a Close Circle
// birthday at home is nine chapters, a Grand wedding is twenty-three, and
// neither is shown a single question that does not apply to it.
//
// `recommend` names the pack to pre-select per circle. Pre-selecting matters
// more than it looks: a chapter that opens with nothing chosen asks the
// customer to have an opinion about crew sizes, and most people do not have
// one. A chapter that opens on a sensible answer they can change asks them
// only to disagree, which is much easier.

import { SERVICE_PACKS, PACK_BY_ID } from './servicePacks'

/* ── Chapter builders ──────────────────────────────────────────────────
   Written as small factories rather than repeated literals, because
   "photography" is genuinely the same decision at fifteen occasions and
   only its framing differs. What must NOT be shared is the copy: the
   reason a family books a photographer for a namakarana is not the reason
   they book one for a corporate annual day, and a shared sentence would be
   true of neither. So the factory takes the sentence. */

const svc = ({ serviceId, ...rest }) => ({
  kind: 'service',
  id: rest.id ?? serviceId,
  serviceId,
  optional: true,
  multi: false,
  ...rest,
})

const ask = rest => ({ kind: 'choice', optional: false, ...rest })

/** Every pack under a service, in catalogue order — the default option set. */
const allPacks = serviceId => (SERVICE_PACKS[serviceId]?.packs ?? []).map(p => p.id)

/* ══════════════════════════════════════════════════════════════════════
   WHERE IT HAPPENS — and why that question is not the same question twice
   ══════════════════════════════════════════════════════════════════════

   Until this pass, every occasion was asked the identical venue question with
   the identical seven answers: your home, already booked, community hall,
   banquet hall, garden or lawn, resort or farmhouse. One list, fifteen
   occasions, and for a good half of them the list was visibly wrong.

   The clearest case, and the one that started this: a griha pravesha was
   offered a resort. A gruhapravesha is the rite of entering THE NEW HOUSE. It
   cannot be held at a resort, a lawn or a banquet hall — not as a matter of
   taste but as a matter of what the ceremony is. Offering the choice does not
   read as flexibility, it reads as an app that does not know what it is
   selling, and the family closes it. The same failure ran through the
   catalogue: a bhoomi pooja is on the plot, a vahana pooja is around the
   vehicle, a shop opening is in front of the shutter, an aksharabhyasa is at
   the temple or in front of the house lamp.

   So the venue question now belongs to the occasion. Three shapes:

     `fixed`    There is exactly ONE honest answer. It is shown as a card that
                is already chosen, explained rather than offered, and the flow
                moves on. A choice with one real answer is not a choice; it is
                a delay dressed as respect.

     `options`  Answers particular to this occasion — "at the temple", "at the
                showroom on delivery", "at our office", "on the site". These
                are first-class, not an "other" box.

     `packIds`  Which of the hire-able venues genuinely apply, in the order
                this occasion would consider them. An empty list removes the
                "let us find one" group completely, because for a vahana pooja
                there is nothing to find.

   A `fixed` venue can still carry a second answer, and often should: plenty of
   families hold the pooja at the new flat and the lunch at a hall down the
   road, and pretending otherwise is the same error in the other direction.

   `outdoor: true` on an option is what turns on the generator, the misting
   fans and the portable washrooms further down. It is set from the real
   answer rather than guessed — a bhoomi pooja is the most outdoor function in
   the catalogue and used to be treated as indoors because "the site" was not
   an answer anybody could give. */

/**
 * The headcount an occasion opens on, before anybody has said anything.
 *
 * 110–120 was the single default everywhere, and it is the right one for a
 * birthday, a wedding or a reception — the size of function this app was
 * built around, and a number most families recognise as "the usual one".
 *
 * It is the wrong one for half of what the life-cycle audit added, and wrong
 * in the most expensive direction. A vahana pooja is four people in a
 * showroom delivery bay. An aksharabhyasa is a child, two parents and a
 * purohit, before school. Opening those on 120 guests prices in lunch for a
 * hundred and twenty people, and greets somebody who came to garland a
 * scooter with a six-figure estimate — which is exactly the failure the
 * no-price-until-the-end rule exists to prevent, arriving through a forgotten
 * default rather than through a decision anybody made.
 *
 * Anybody can still move the number, and moving it is the point of both
 * screens that read this. This only decides what they see before they touch
 * anything.
 *
 * The numbers are the median a coordinator would expect, not a floor and not
 * an ambition: a half-saree at 150 because in coastal Andhra it genuinely is,
 * a reception at 250 because that is what a reception is for.
 */
export const OCCASION_DEFAULT_GUESTS = {
  vehicle_pooja: 15,
  aksharabhyasa: 20,
  bhoomi_pooja:  40,
  farewell:      45,
  annaprashana:  60,
  mundan:        60,
  shop_opening:  60,
  haldi:        120,
  half_saree:   150,
  reception:    250,
}

/** 110 stays the answer for every occasion the table above does not name. */
export const DEFAULT_GUESTS = 110

export function defaultGuestsFor(occasionId) {
  return OCCASION_DEFAULT_GUESTS[occasionId] ?? DEFAULT_GUESTS
}

export const OWN_VENUE = 'own_venue'
export const BOOKED_VENUE = 'booked_venue'

const HOME_INCLUDES = [
  'Site visit and layout plan',
  'Power and access check',
  'Society or neighbour coordination',
  'Furniture moved and put back',
]

const atHome = (desc, name = 'At home, or our own place') => ({
  id: OWN_VENUE, emoji: '🏠', name, desc, includes: HOME_INCLUDES,
})

const alreadyBooked = (desc = 'Tell your coordinator which one, and we work to its rules, its timings and its restrictions.') => ({
  id: BOOKED_VENUE, emoji: '✅', name: 'We have already booked a venue', desc,
})

const atTemple = (desc, name = 'At the temple') => ({
  id: 'temple', emoji: '🛕', name, desc, outdoor: true,
  includes: [
    'Temple office spoken to and the slot confirmed',
    'Purohit coordinated with the temple’s own',
    'Everything carried in and carried out',
    'Prasada distribution at the gate',
  ],
})

const atOffice = (desc, name = 'At our own office') => ({
  id: 'office', emoji: '🏢', name, desc,
  includes: [
    'Floor survey and a layout that fits the desks',
    'Facilities and security coordination',
    'Silent setup outside working hours',
    'Everything cleared before the next morning',
  ],
})

/** The venue block for an occasion that can genuinely be held anywhere. */
const anywhere = ({ why, packIds = ['venue_community', 'venue_banquet', 'venue_lawn', 'venue_resort'], homeDesc, extra = [] }) => ({
  question: 'Where is it happening?',
  why,
  options: [
    atHome(homeDesc ?? 'Your house, the terrace, or the apartment clubhouse. No hire charge — we survey the space and plan the layout around your furniture.'),
    alreadyBooked(),
    ...extra,
  ],
  packIds,
})

/** The default, for an occasion nobody has written a venue block for yet. */
export const GENERIC_VENUE = anywhere({
  why: 'This decides more than it looks: an outdoor function needs power, fans and washrooms that a banquet hall already has. Tell us now and we only ask about the things you actually need.',
})

/** Venue answers that put the function outdoors, from the packs themselves. */
const OUTDOOR_PACKS = new Set(['venue_lawn', 'venue_resort'])

/**
 * The venue question for this occasion, normalised.
 *
 * Returns `{ question, why, footnote, fixed, options, packIds }` where every
 * entry in `options` is a finished card — a custom answer or a resolved venue
 * pack — so the step renders one list and does not have to know which is which.
 */
export function venueStepFor(occasionId) {
  const block = blueprintFor(occasionId).venue ?? GENERIC_VENUE
  const resolve = opt => {
    if (!opt?.pack) return opt
    const pack = PACK_BY_ID[opt.pack]
    if (!pack) return null
    return {
      id: pack.id,
      emoji: pack.emoji,
      name: pack.name,
      desc: pack.blurb,
      includes: pack.includes,
      note: pack.note,
      outdoor: OUTDOOR_PACKS.has(pack.id),
      hired: true,
    }
  }
  return {
    question: block.question ?? 'Where is it happening?',
    why: block.why ?? GENERIC_VENUE.why,
    footnote: block.footnote ?? null,
    findLabel: block.findLabel ?? 'Or let us find one',
    fixed: block.fixed ? resolve(block.fixed) : null,
    options: (block.options ?? []).map(resolve).filter(Boolean),
    hired: (block.packIds ?? []).map(id => resolve({ pack: id })).filter(Boolean),
  }
}

/** Every venue answer this occasion accepts, flat — for lookups. */
function venueAnswers(occasionId) {
  const step = venueStepFor(occasionId)
  return [step.fixed, ...step.options, ...step.hired].filter(Boolean)
}

/** The answer chosen, as a coordinator should read it in the request. */
export function venueLabelFor(occasionId, value) {
  if (!value) return 'Not decided'
  return venueAnswers(occasionId).find(o => o.id === value)?.name ?? 'Not decided'
}

/** Does this answer put the function under the sky? Gates the groundwork. */
export function isOutdoorVenue(occasionId, value) {
  if (!value) return false
  return !!venueAnswers(occasionId).find(o => o.id === value)?.outdoor
}

/**
 * The answer to pre-select on arrival.
 *
 * Only ever a `fixed` venue — an occasion with one honest answer opens on it
 * already chosen. Everything else opens on nothing, because guessing between
 * a hall and a lawn on somebody's behalf is guessing about the budget.
 */
export function defaultVenueFor(occasionId) {
  return venueStepFor(occasionId).fixed?.id ?? null
}

/* ══════════════════════════════════════════════════════════════════════
   IS THERE A MEAL AT ALL?
   ══════════════════════════════════════════════════════════════════════

   The flow used to require a cuisine and a full menu from every customer,
   because every occasion in the original fifteen feeds people. Half of what
   this pass added does not. A vahana pooja is forty minutes in a temple yard
   and ends with a packet of kesari bath; a shop opening feeds nobody and hands
   out two thousand sweet boxes; an aksharabhyasa is a slate and a lamp before
   school.

   Forcing those customers through five courses of a Karnataka spread to reach
   the end of the flow does two bad things at once: it wastes four screens, and
   it produces an estimate with ₹65,000 of catering in it for a function with
   no lunch — which is not a mistake anybody forgives.

   So an occasion can declare its meal optional, and the flow asks once. `no`
   removes the cuisine screen, every course screen, and the catering line from
   the quote. `yes` behaves exactly as it always did.

   Occasions where the meal is the point — a wedding, a gruhapravesha, a
   half-saree — do NOT get this question. Offering to skip lunch at a function
   whose whole social contract is lunch is its own kind of not listening. */
const mealOptional = ({ question, why, yes, no }) => ({
  optional: true,
  question,
  why,
  yes: { emoji: '🍽️', name: yes.name, desc: yes.desc },
  no: { emoji: '🚫', name: no.name, desc: no.desc },
})

/* ══════════════════════════════════════════════════════════════════════
   HOW LONG A JOURNEY IS ALLOWED TO BE
   ══════════════════════════════════════════════════════════════════════

   Measured after the ten new occasions landed, at each occasion's own
   default headcount:

     aksharabhyasa   24 screens      a twenty-minute rite before school
     vehicle_pooja   26 screens      a garland and a lemon in a delivery bay
     mundan          31 screens
     reception       41 screens

   Twenty-four screens to arrange a slate, a lamp and a purohit is not a
   guided journey, it is an endurance test — and the person who abandons it
   at screen nine is the person who would have booked. A wedding earns
   twenty-something screens because a wedding genuinely is twenty-something
   decisions. Nothing else in this catalogue does.

   Three things were making every occasion the same length, and each is
   fixed by a field on the blueprint rather than by deleting anything. That
   distinction matters: the answer is not a shorter catalogue, it is the
   same catalogue asked at the right altitude.

   ── 1 · `core` — which decisions earn their own screen ─────────────────

   A chapter is either CORE (its own screen, in the order a family decides
   it) or an EXTRA, and every extra for the whole occasion is collected onto
   ONE screen near the end: a shelf of compact cards that open in place.

   Nothing is removed. A family that wants the drone, the misting fans and
   the sky lanterns can still have all three; they are simply not three
   separate interruptions between the cake and the photographer. The
   groundwork chapters are the clearest case — a generator, portable
   washrooms and an ambulance are exactly the things nobody arrives wanting
   and some functions genuinely need, which is the definition of a shelf
   rather than of a question.

   `core` is a list of chapter ids, and it is deliberately short: five for a
   vahana pooja, thirteen for a wedding. An occasion with no `core` list
   keeps every chapter as its own screen, so this can never silently swallow
   an occasion nobody has looked at yet.

   ── 2 · `decor` — what decoration MEANS at this occasion ───────────────

   The décor step asked all twenty-five occasions the same three questions
   from the same six-rung ladder: how much, what colour, what extras. For a
   new vehicle it offered "Home Touch — the entrance, the cake table, and
   the corner everyone photographs", which is a description of a birthday
   party, on a screen about a motorcycle. There is no cake table. There is
   no room.

   So decoration belongs to the occasion, in one of three shapes:

     'none'    the occasion already has a decoration chapter of its own and
               the generic ladder is pure noise. A vahana pooja's decoration
               IS the garland, and it was chosen eight screens ago.
     'own'     one screen of setups written for this occasion — "rangoli and
               a toran at the gate", "banana stems either side of the
               shutter". Each maps to a real décor level underneath, so the
               quote engine is untouched and the price is the same price.
     'levels'  the generic ladder, kept for the occasions it was written for:
               a wedding, a reception, a sangeet — functions in a hall where
               how-much and what-colour genuinely are two decisions.

   ── 3 · `menu` — one screen or seven ───────────────────────────────────

   Seven course screens is right for a family choosing a wedding spread and
   absurd for twenty people at an aksharabhyasa. Below the point where the
   menu is a project, all seven courses go on one screen as sections that
   open in place, pre-filled with our suggestion — so the honest default is
   one tap, and the family who wants to go through it dish by dish still can.

   'auto' decides on the headcount, which is the right axis: the same
   occasion at forty guests and at four hundred genuinely is a different
   amount of deciding. */

/**
 * Which chapters are core — for THIS customer, not for this occasion.
 *
 * `core` may be a list or a function of the same ctx `showIf` receives, and
 * for any occasion whose first question genuinely changes the celebration it
 * is a function. A four-year-old's birthday and a grandfather's
 * shashtiabdapoorthi are the same entry in this file and share almost
 * nothing: one leads with a bouncy castle and a fondant cake, the other with
 * a homa, a veena and a wall of photographs from sixty years. Handing both
 * families the identical six screens is the generic-catalogue failure this
 * whole file exists to avoid, one level further in.
 *
 * A choice chapter is ALWAYS core. It gates what comes after it, so it can
 * never be filed on a shelf behind the questions it decides.
 */
export function coreChapters(occasionId, chapters, ctx) {
  const declared = blueprintFor(occasionId).core
  const core = typeof declared === 'function' ? declared(safeCtx(ctx)) : declared
  if (!core) return chapters
  const set = new Set(core)
  return chapters.filter(ch => ch.kind === 'choice' || set.has(ch.id))
}

/** Everything else, for the one shelf screen. */
export function extraChapters(occasionId, chapters, ctx) {
  const declared = blueprintFor(occasionId).core
  const core = typeof declared === 'function' ? declared(safeCtx(ctx)) : declared
  if (!core) return []
  const set = new Set(core)
  return chapters.filter(ch => ch.kind === 'service' && !set.has(ch.id))
}

/* ── Décor ─────────────────────────────────────────────────────────── */

/** The generic ladder: how much → what colour → what extras. */
const decorLevels = ({ why } = {}) => ({ mode: 'levels', why })

/**
 * No generic décor screens at all.
 *
 * `because` is shown nowhere — it is here so that the next person to read
 * this file knows the omission was a decision rather than an oversight.
 */
const decorNone = ({ because }) => ({ mode: 'none', because })

/**
 * One screen, written for this occasion.
 *
 * Every option carries `levelId` and `themeId` so the estimate is produced
 * by exactly the same code path as the generic ladder. This changes what the
 * customer is asked, never what anything costs.
 */
const decorOwn = ({ question, why, options, skipLabel = 'No decoration needed' }) => ({
  mode: 'own', question, why, options, skipLabel,
})

/**
 * The décor question for this occasion and this answer.
 *
 * Also a function where it needs to be. "How is the room being set up?" has
 * a different set of true answers for a teenager's birthday (a neon sign, a
 * light rig, a photo wall) and for a seventieth (a garlanded chair, a
 * lamp, and sixty years of photographs on a wall) — and offering the second
 * family a balloon arch is the same species of mistake as offering a griha
 * pravesha a resort.
 */
export function decorStepFor(occasionId, ctx) {
  const declared = blueprintFor(occasionId).decor
  const block = typeof declared === 'function' ? declared(safeCtx(ctx)) : declared
  return block ?? { mode: 'levels' }
}

/** The décor option chosen, by its own name rather than the rung's. */
export function decorOptionFor(occasionId, choiceId, ctx) {
  const block = decorStepFor(occasionId, ctx)
  if (block.mode !== 'own') return null
  return block.options.find(o => o.id === choiceId) ?? null
}

/* ── The menu ──────────────────────────────────────────────────────── */

/**
 * Above this headcount the menu is a project worth seven screens; below it,
 * it is one screen with seven sections. 75 is the top of the Close Circle
 * band in guestCircles.js — the same seam every other size decision uses.
 */
const MENU_SCREEN_THRESHOLD = 75

export function menuModeFor(occasionId, guests) {
  const declared = blueprintFor(occasionId).menu ?? 'auto'
  if (declared !== 'auto') return declared
  return (guests ?? 0) >= MENU_SCREEN_THRESHOLD ? 'courses' : 'single'
}

/* ── Reusable chapters, each taking its own reason ─────────────────── */

const photography = ({ why, packIds = ['photo_half_day', 'photo_full_day'], recommend, question = 'Who is photographing this?', showIf, ...narrowing }) => svc({
  serviceId: 'photography',
  title: 'Photos',
  emoji: '📸',
  question,
  why,
  packIds,
  recommend: recommend ?? { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
  skipLabel: 'A cousin with a good phone is doing it',
  showIf,
  ...narrowing,
})

const videography = ({ why, packIds = ['video_event', 'video_cinematic'], recommend, showIf, ...narrowing }) => svc({
  serviceId: 'videography',
  title: 'Video',
  emoji: '🎬',
  question: 'Do you want it filmed as well?',
  why,
  packIds,
  recommend: recommend ?? { close: null, family: 'video_event', full_house: 'video_cinematic', grand: 'video_cinematic' },
  skipLabel: 'Photographs are enough',
  showIf,
  ...narrowing,
})

const dining = ({ why, packIds = ['dining_leaf', 'dining_round', 'dining_buffet_standing', 'dining_floor', 'dining_lounge'], recommend, showIf, ...narrowing }) => svc({
  serviceId: 'dining',
  title: 'Seating',
  emoji: '🪑',
  question: 'How are people sitting to eat?',
  why,
  packIds,
  recommend: recommend ?? { close: 'dining_floor', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' },
  skipLabel: 'The venue provides all of it',
  showIf,
  ...narrowing,
})

const returnGifts = ({ why, packIds = ['gift_budget', 'gift_mid', 'gift_premium', 'gift_kids'], recommend, showIf, ...narrowing }) => svc({
  serviceId: 'return_gifts',
  title: 'Return gifts',
  emoji: '🎁',
  question: 'What does everybody take home?',
  why,
  packIds,
  recommend: recommend ?? { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
  skipLabel: 'We have already bought them',
  showIf,
  ...narrowing,
})

const invitations = ({ why, showIf, ...narrowing }) => svc({
  serviceId: 'invitations',
  title: 'Invites',
  emoji: '💌',
  question: 'How is everybody being invited?',
  why,
  packIds: ['invite_digital', 'invite_printed', 'invite_luxury', 'invite_stationery'],
  multi: true,
  recommend: { close: 'invite_digital', family: 'invite_digital', full_house: 'invite_printed', grand: 'invite_printed' },
  skipLabel: 'The invitations are already out',
  showIf,
  ...narrowing,
})

const cleanup = ({ why, showIf, ...narrowing }) => svc({
  serviceId: 'cleanup',
  title: 'After',
  emoji: '🧹',
  question: 'Who clears up afterwards?',
  why,
  packIds: ['clean_basic', 'clean_deep', 'clean_green'],
  recommend: { close: 'clean_basic', family: 'clean_basic', full_house: 'clean_deep', grand: 'clean_deep' },
  skipLabel: 'The venue handles the clearing',
  showIf,
  ...narrowing,
})

/**
 * The chapters nobody asks for and every large or outdoor function needs.
 *
 * Gated hard, because offering a 62 kVA generator to somebody planning a
 * thirty-guest birthday in their living room makes the whole app look like it
 * is not listening. They appear for a marquee, a lawn, or a headcount past
 * the point where the venue's own supply stops being enough.
 */
const groundwork = [
  svc({
    serviceId: 'power',
    title: 'Power',
    emoji: '⚡',
    question: 'What happens if the power goes?',
    why: 'The one failure a guest never forgives, and the one nobody plans for. A silent set behind the kitchen means the lights, the sound and the cold storage never notice.',
    packIds: ['power_25kva', 'power_62kva', 'power_ups'],
    recommend: { full_house: 'power_25kva', grand: 'power_62kva' },
    skipLabel: 'The venue has its own backup',
    showIf: ctx => ctx.outdoor || ctx.guests >= 150,
  }),
  svc({
    serviceId: 'cooling',
    title: 'Comfort',
    emoji: '🌬️',
    question: 'How warm is it going to be?',
    why: 'An afternoon function on a Bengaluru lawn in April empties out by three o’clock. Misting fans down the dining side is the cheapest thing on this whole page and the one guests thank you for.',
    packIds: ['cool_pedestal', 'cool_misting', 'cool_heaters'],
    multi: true,
    recommend: {},
    skipLabel: 'It is indoors and air-conditioned',
    showIf: ctx => ctx.outdoor && ctx.guests >= 60,
  }),
  svc({
    serviceId: 'washrooms',
    title: 'Washrooms',
    emoji: '🚻',
    question: 'Are there enough washrooms?',
    why: 'Two toilets for four hundred people is the detail that decides whether the elders in your family stay past lunch.',
    packIds: ['wash_standard', 'wash_luxury'],
    recommend: {},
    skipLabel: 'The venue has plenty',
    showIf: ctx => ctx.outdoor && ctx.guests >= 150,
  }),
  svc({
    serviceId: 'valet',
    title: 'Parking',
    emoji: '🅿️',
    question: 'Where is everybody parking?',
    why: 'Cars on both sides of the road and a neighbour arguing with your guests is how a function is remembered for the wrong reason. Marshals cost less than the argument.',
    packIds: ['valet_marshals', 'valet_full'],
    recommend: { full_house: 'valet_marshals', grand: 'valet_full' },
    skipLabel: 'Parking is not a problem here',
    showIf: ctx => ctx.guests >= 120,
  }),
  svc({
    serviceId: 'medical',
    title: 'Safety',
    emoji: '🚑',
    question: 'Is there anybody there if somebody feels unwell?',
    why: 'At a function with fifty guests over seventy, this is not paranoia. A first-aider in the corner nobody notices is the whole point of them.',
    packIds: ['med_first_aid', 'med_nurse', 'med_ambulance'],
    recommend: { grand: 'med_first_aid' },
    skipLabel: 'Not needed for this one',
    showIf: ctx => ctx.guests >= 250,
  }),
  svc({
    serviceId: 'bouncers',
    title: 'Security',
    emoji: '🛡️',
    question: 'Do you want somebody on the gate?',
    why: 'Not for trouble — for the gift table, the parked cars, and knowing that the person walking in at ten at night was invited.',
    packIds: ['sec_guard', 'sec_bouncer', 'sec_ladies'],
    recommend: { grand: 'sec_guard' },
    skipLabel: 'No security needed',
    showIf: ctx => ctx.guests >= 250,
  }),
]

/**
 * The groundwork, minus the questions this occasion asks in its own words.
 *
 * Two occasions ask a groundwork question better than the generic version
 * does, because they know something it does not:
 *
 *   housewarming  "Where are eighty cars going in an apartment complex?" is
 *                 a sharper question than "Where is everybody parking?", and
 *                 it is the single most common complaint after a gruha
 *                 pravesha.
 *   shop_opening  the crowd being managed is on a public pavement outside
 *                 somebody else's shop, which is a different job from a
 *                 guard on a gate.
 *
 * Both used to get BOTH — their own chapter, then the generic one eleven
 * screens later, asking the same thing again with worse copy. Two different
 * chapter ids, so nothing collided and nothing failed; the customer was just
 * asked about parking twice, which is exactly how an app stops feeling like
 * it is paying attention.
 */
const groundworkWithout = (...serviceIds) =>
  groundwork.filter(ch => !serviceIds.includes(ch.serviceId))

/* ══════════════════════════════════════════════════════════════════════
   THE OCCASIONS
   ══════════════════════════════════════════════════════════════════════ */

export const BLUEPRINTS = {

  /* ───────────────────────── BIRTHDAY ───────────────────────────────
     The most-planned occasion in the catalogue and the one most damaged by
     a generic flow, because "birthday" covers a four-year-old's cartoon
     party and a grandfather's shashtiabdapoorthi — two functions with
     almost nothing in common except the word. The first question sorts
     them, and everything after it is filtered on the answer. */
  birthday: {
    id: 'birthday',
    opening: 'Let’s build this birthday one piece at a time.',
    promise: 'A short set of questions, and they change with whose birthday it is. Nothing is booked, and there is no price until you have seen everything.',
    cuisineLead: ['karnataka', 'north_indian', 'indo_chinese', 'chaat_street', 'multi_cuisine'],
    vegDefault: true,

    /* ── Six birthdays, not one ────────────────────────────────────────
       This is the occasion the whole answer-aware design was built for,
       because "birthday" in this catalogue covers a four-year-old's cartoon
       party and a grandfather's shashtiabdapoorthi — two functions with
       nothing in common except the word, and until now they were offered
       the same six screens and the same five cakes.

       Each of these lists is what a family planning THAT birthday names
       without being prompted. Everything absent from a list still exists
       and is one tap away on the extras shelf; it is simply not standing
       between them and the cake. */
    core: ctx => {
      if (ctx.flags.elder) {
        // A sixtieth or seventieth is a rite first and a party second. The
        // morning homa fixes the clock, the veena lets three generations
        // talk through lunch, and the wall of photographs is the thing the
        // family actually stands at. No DJ, no play zone, no fireworks.
        return ['priest', 'pooja', 'cake', 'dining', 'live_music', 'memory_wall', 'photography', 'return_gifts']
      }
      if (ctx.flags.milestone) {
        // A thirtieth or a fiftieth is the one that gets photographed
        // properly and talked about after, so the film and the host earn
        // their screens where a return gift does not.
        return ['cake', 'dining', 'dj', 'emcee', 'photography', 'videography', 'memory_wall']
      }
      if (ctx.flags.kids) {
        // Under twelve. What decides whether this party works is what the
        // children are doing, and everything else is arranged around it.
        return ['cake', 'dining', 'kids_play', 'folk', 'photography', 'return_gifts']
      }
      // Teenager, or an adult birthday. Music, a corner to photograph in,
      // and food that keeps coming.
      return ['cake', 'dining', 'dj', 'photobooth', 'photography']
    },

    /* ── And the decoration is not one question either ─────────────────
       "Home Touch — the entrance, the cake table, and the corner everyone
       photographs" is a fair description of an adult birthday at home and a
       poor one of a jungle-safari party for thirty eight-year-olds, and an
       actively wrong one of a shashtiabdapoorthi, where the decoration is a
       garlanded chair, a lamp and a photo wall. */
    decor: ctx => {
      if (ctx.flags.elder) {
        return decorOwn({
          question: 'How is the hall being set up?',
          why: 'At a sixtieth the decoration has two jobs: somewhere the elders are seated and honoured, and somewhere the family can stand and look at photographs. A balloon arch is for a different birthday.',
          options: [
            {
              id: 'seat_lamp',
              emoji: '🪔',
              name: 'The seat, the lamp and the entrance',
              desc: 'Garlanded chairs for the couple or the elder, a traditional lamp, and the door done with a toran and rangoli.',
              includes: ['Garlanded seating for the elders', 'Brass lamp and pooja corner', 'Mango-leaf toran and rangoli at the door', 'Set up before the muhurtham, cleared after'],
              levelId: 'home_touch',
              themeId: 'marigold_temple',
            },
            {
              id: 'stage_wall',
              emoji: '🖼️',
              name: 'A felicitation stage and a photo wall',
              desc: 'A proper front of the room for the felicitation and the speeches, the memory wall mounted well, and the tables styled.',
              includes: ['Felicitation backdrop with fresh florals', 'Memory wall mounting and lighting', 'Table centrepieces and linen', 'Warm lighting through the hall'],
              levelId: 'classic',
              themeId: 'traditional_red_gold',
            },
            {
              id: 'full_hall',
              emoji: '✨',
              name: 'The whole hall, designed',
              desc: 'For a shashtiabdapoorthi with three hundred guests — a designer draws it, and the palette runs through the stage, the tables and the entrance.',
              includes: ['Designed stage with layered draping and florals', 'Entrance installation and welcome signage', 'Photo and tribute corner', 'Full table styling and uplighting', 'Designer visit before the day'],
              levelId: 'signature',
              themeId: 'mysuru_royal',
            },
          ],
          skipLabel: 'The hall or the family is decorating it',
        })
      }
      if (ctx.flags.kids) {
        return decorOwn({
          question: 'What is the party themed as?',
          why: 'For anybody under twelve the decoration IS the party — the child chose a theme weeks ago and will be looking for it the moment they walk in. What changes is how much of the room it covers, not what colour it is.',
          options: [
            {
              id: 'backdrop',
              emoji: '🎈',
              name: 'A themed backdrop and balloons',
              desc: 'The theme they picked, on an 8ft backdrop behind the cake table, with a balloon arch and the entrance done.',
              includes: ['Themed backdrop, about 8 ft', 'Balloon arch or pillars in the theme', 'Cake table styling', 'Entrance and name banner', 'Setup and clearing by our team'],
              levelId: 'home_touch',
              themeId: 'pastel',
            },
            {
              id: 'themed_room',
              emoji: '🦸',
              name: 'The room done to the theme',
              desc: 'Backdrop, balloons, themed props through the space, a dressed food table and the children’s seating.',
              includes: ['Everything in the backdrop setup', 'Themed props and standees through the room', 'Children’s table styling', 'Ceiling balloon or drape work', 'Warm lighting'],
              levelId: 'classic',
              themeId: 'pastel',
            },
            {
              id: 'designed_party',
              emoji: '🎪',
              name: 'A designed party set',
              desc: 'A designer builds the theme as a set — entrance, backdrop, play corner and photo wall all in one world. For a hall party.',
              includes: ['Designed themed entrance installation', 'Full backdrop and photo wall', 'Decorated play and activity corner', 'Full table styling', 'Designer visit before the day'],
              levelId: 'signature',
              themeId: 'pastel',
            },
          ],
          skipLabel: 'We have the decoration sorted',
        })
      }
      if (ctx.flags.loud && !ctx.flags.milestone) {
        // Teenager or a straightforward adult birthday. Light, not floral.
        return decorOwn({
          question: 'How is the space being set up?',
          why: 'A teenage or adult birthday is lit rather than decorated. What people photograph is a corner and a sign, and what makes the room feel like an evening is the lighting — not centrepieces.',
          options: [
            {
              id: 'lights_corner',
              emoji: '💡',
              name: 'Lighting and a photo corner',
              desc: 'Festoon and fairy lighting across the space, a backdrop worth standing in front of, and the food and cake table dressed.',
              includes: ['Festoon or fairy lighting across the space', 'Photo backdrop, about 8 ft', 'Cake and food table styling', 'Entrance styling', 'Setup and clearing by our team'],
              levelId: 'home_touch',
              themeId: 'white_gold',
            },
            {
              id: 'neon_night',
              emoji: '🎧',
              name: 'A proper night look',
              desc: 'Uplighting through the room, a neon or light-up name sign, a styled photo wall and the tables done.',
              includes: ['Ambient uplighting through the room', 'Neon or light-up name sign', 'Styled photo wall with props', 'Table styling and linen', 'Dance-floor lighting wash'],
              levelId: 'classic',
              themeId: 'white_gold',
            },
            {
              id: 'designed_night',
              emoji: '✨',
              name: 'Designed by a stylist',
              desc: 'For a big evening in a hall — a designer draws the look and it runs through the entrance, the floor, the bar and the photo corner.',
              includes: ['Designed entrance and stage installation', 'Programmed lighting design', 'Photo installation and selfie corner', 'Full table and lounge styling', 'Designer visit before the day'],
              levelId: 'signature',
              themeId: 'rose_gold',
            },
          ],
          skipLabel: 'No decoration — just the lights that are there',
        })
      }
      // A milestone. This is the one the generic ladder was actually written
      // for: a styled function in a hall, where how-much and what-colour are
      // genuinely two separate decisions.
      return decorLevels()
    },

    chapters: [
      ask({
        id: 'who',
        title: 'Whose',
        emoji: '🎈',
        question: 'Whose birthday are we planning?',
        why: 'It changes almost everything below — the cake, the entertainment, whether there is a ritual in the morning, how loud the evening gets, and how many questions we ask you at all.',
        options: [
          { id: 'toddler', emoji: '🧸', name: 'A little one, under five', desc: 'Short, bright, and finished before the afternoon nap.', flags: { kids: true, toddler: true, ritual: false, loud: false } },
          { id: 'child', emoji: '🦸', name: 'A child, five to twelve', desc: 'A theme they chose themselves, games, and thirty screaming friends.', flags: { kids: true, ritual: false, loud: true } },
          { id: 'teen', emoji: '🎧', name: 'A teenager', desc: 'Music, lights, a photo corner, and adults kept at a respectful distance.', flags: { kids: false, teen: true, ritual: false, loud: true } },
          { id: 'adult', emoji: '🥂', name: 'An adult birthday', desc: 'Friends and family together, dinner, and a proper evening of it.', flags: { kids: false, adult: true, ritual: false, loud: true } },
          { id: 'milestone', emoji: '✨', name: 'A milestone — 18th, 21st, 30th, 40th, 50th', desc: 'The one that gets photographed properly and talked about after.', flags: { kids: false, ritual: false, loud: true, milestone: true } },
          { id: 'elder', emoji: '🪔', name: 'An elder — 60th, 70th, 80th', desc: 'Shashtiabdapoorthi, sahasrachandra darshana, or simply the day the whole family comes.', flags: { kids: false, ritual: true, loud: false, elder: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Blessing',
        emoji: '🙏',
        question: 'Is there a pooja or a homa in the morning?',
        why: 'A shashtiabdapoorthi or an ayushya homa is fixed to a muhurtham, and the whole day is arranged around it. Telling us now means the kitchen and the decorators work to that clock instead of against it.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'No ritual — straight to the celebration',
        showIf: ctx => ctx.flags.ritual || ctx.flags.elder,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Shall we bring the samagri?',
        why: 'The list the purohit sends the night before, sourced and laid out before he arrives, so nobody is driving to Malleshwaram at six in the morning.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'What are we cutting?',
        why: 'The one photograph that ends up framed. Everything else on this page is the evening — this is the minute.',
        // The declared superset. `packsFor` narrows it to the answer, which is
        // the whole point: a fondant cartoon cake and a dessert table are not
        // things anybody orders for a seventieth, and a 1kg cream cake does
        // not feed a hall of three hundred.
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant', 'cake_tiered', 'cake_dessert_table'],
        packsFor: ctx => {
          if (ctx.flags.toddler) return ['cake_cream_1kg', 'cake_photo', 'cake_fondant']
          if (ctx.flags.kids) return ['cake_fondant', 'cake_photo', 'cake_cream_1kg', 'cake_dessert_table']
          if (ctx.flags.elder) return ['cake_cream_1kg', 'cake_photo', 'cake_tiered']
          if (ctx.flags.milestone) return ['cake_tiered', 'cake_fondant', 'cake_dessert_table', 'cake_cream_1kg']
          return ['cake_cream_1kg', 'cake_photo', 'cake_tiered', 'cake_dessert_table']
        },
        recommendFor: ctx => {
          if (ctx.flags.toddler) return { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_photo', grand: 'cake_photo' }
          if (ctx.flags.kids) return { close: 'cake_fondant', family: 'cake_fondant', full_house: 'cake_fondant', grand: 'cake_dessert_table' }
          if (ctx.flags.elder) return { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_photo', grand: 'cake_tiered' }
          if (ctx.flags.milestone) return { close: 'cake_tiered', family: 'cake_tiered', full_house: 'cake_tiered', grand: 'cake_dessert_table' }
          return { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_tiered', grand: 'cake_tiered' }
        },
      }),
      dining({
        why: 'A children’s party runs standing and spilling; a sixtieth needs the elders seated with a table to put a plate down on. The two cost differently and feel completely different.',
        // A leaf meal at a teenager's birthday and a lounge setup at a
        // shashtiabdapoorthi are both answers nobody wants offered to them.
        packsFor: ctx => {
          if (ctx.flags.elder) return ['dining_leaf', 'dining_round', 'dining_floor']
          if (ctx.flags.kids) return ['dining_floor', 'dining_buffet_standing', 'dining_round']
          if (ctx.flags.teen) return ['dining_buffet_standing', 'dining_lounge', 'dining_round']
          return ['dining_round', 'dining_buffet_standing', 'dining_lounge', 'dining_leaf']
        },
        recommendFor: ctx => {
          if (ctx.flags.elder) return { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_round' }
          if (ctx.flags.kids) return { close: 'dining_floor', family: 'dining_floor', full_house: 'dining_buffet_standing', grand: 'dining_round' }
          return { close: 'dining_round', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' }
        },
      }),
      svc({
        serviceId: 'kids_play',
        title: 'For the kids',
        emoji: '🎠',
        question: 'What are the children doing while the adults talk?',
        why: 'Unoccupied children decide how long the adults stay. A supervised corner is the difference between a party that ends at eight and one that ends at six.',
        packIds: ['kids_bouncy', 'kids_play_zone', 'kids_activity'],
        // A bouncy castle for a two-year-old is an insurance claim; soft play
        // and an activity table are what that age actually gets.
        packsFor: ctx => (ctx.flags.toddler ? ['kids_activity', 'kids_play_zone'] : ['kids_bouncy', 'kids_play_zone', 'kids_activity']),
        recommendFor: ctx => (ctx.flags.toddler
          ? { close: 'kids_activity', family: 'kids_activity', full_house: 'kids_play_zone', grand: 'kids_play_zone' }
          : { close: 'kids_activity', family: 'kids_bouncy', full_house: 'kids_play_zone', grand: 'kids_play_zone' }),
        skipLabel: 'No children coming, or they will amuse themselves',
        showIf: ctx => ctx.flags.kids || ctx.guests >= 100,
      }),
      svc({
        serviceId: 'folk',
        title: 'The act',
        emoji: '🎩',
        question: 'Is somebody performing?',
        why: 'Forty minutes of a magician holds a room of eight-year-olds better than any amount of decoration, and the parents remember who booked it.',
        packIds: ['folk_magic_kids', 'folk_mascot', 'folk_south'],
        // A mascot delights a four-year-old and embarrasses a ten-year-old.
        packsFor: ctx => (ctx.flags.toddler ? ['folk_mascot', 'folk_magic_kids'] : ['folk_magic_kids', 'folk_mascot']),
        recommendFor: ctx => (ctx.flags.toddler
          ? { close: 'folk_mascot', family: 'folk_mascot', full_house: 'folk_mascot', grand: 'folk_magic_kids' }
          : { close: 'folk_magic_kids', family: 'folk_magic_kids', full_house: 'folk_magic_kids', grand: 'folk_magic_kids' }),
        skipLabel: 'No performer',
        showIf: ctx => ctx.flags.kids,
      }),
      svc({
        serviceId: 'dj',
        title: 'Music',
        emoji: '🎵',
        question: 'What is the music?',
        why: 'A rig too big for the room is worse than no rig at all — it clears the floor. These are sized to the space, not to the wattage.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        // A teenager wants the rig; a children's party wants a speaker and a
        // playlist, and a premium console at one is money set on fire.
        packsFor: ctx => {
          if (ctx.flags.kids) return ['dj_house', 'dj_standard']
          if (ctx.flags.teen) return ['dj_standard', 'dj_premium', 'dj_house']
          return ['dj_house', 'dj_standard', 'dj_premium']
        },
        recommendFor: ctx => {
          if (ctx.flags.kids) return { close: 'dj_house', family: 'dj_house', full_house: 'dj_standard', grand: 'dj_standard' }
          if (ctx.flags.teen) return { close: 'dj_standard', family: 'dj_standard', full_house: 'dj_premium', grand: 'dj_premium' }
          return { close: 'dj_house', family: 'dj_standard', full_house: 'dj_standard', grand: 'dj_premium' }
        },
        skipLabel: 'A speaker and a playlist is fine',
        showIf: ctx => ctx.flags.loud,
      }),
      svc({
        serviceId: 'live_music',
        title: 'Live',
        emoji: '🎻',
        question: 'Live music instead, or as well?',
        why: 'For a sixtieth or a seventieth, a veena or a flute through the meal does what a DJ cannot. Elders stay, and conversation is still possible.',
        packIds: ['music_classical_duo', 'music_band', 'music_ghazal_sufi'],
        packsFor: ctx => (ctx.flags.elder
          ? ['music_classical_duo', 'music_ghazal_sufi']
          : ['music_band', 'music_ghazal_sufi', 'music_classical_duo']),
        recommendFor: ctx => (ctx.flags.elder
          ? { close: 'music_classical_duo', family: 'music_classical_duo', full_house: 'music_classical_duo', grand: 'music_classical_duo' }
          : { close: 'music_ghazal_sufi', family: 'music_band', full_house: 'music_band', grand: 'music_band' }),
        skipLabel: 'No live music',
        showIf: ctx => ctx.flags.elder || ctx.flags.milestone,
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Is somebody running the evening?',
        why: 'Without a host, the cake gets cut whenever, half the guests miss it, and the speeches never happen. With one, the evening has a shape.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The family will run it',
        showIf: ctx => ctx.guests >= 100 || ctx.flags.milestone,
      }),
      photography({
        why: 'Somebody has to be looking at the face when the candles go out, and it cannot be the person holding the cake.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommendFor: ctx => (ctx.flags.elder || ctx.flags.milestone
          ? { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' }
          : { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' }),
      }),
      videography({
        why: 'A three-minute film gets watched every year. Four hundred photographs get watched once.',
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A booth in the corner?',
        why: 'It gives every guest something to do in the first twenty minutes, which is the awkward part of every party, and it prints the only souvenir anyone keeps.',
        packIds: ['booth_classic', 'booth_360', 'booth_mirror'],
        // The 360 spinner is the entire point at a teenager's party and a
        // trip hazard at a seventieth.
        packsFor: ctx => {
          if (ctx.flags.teen || ctx.flags.milestone) return ['booth_360', 'booth_mirror', 'booth_classic']
          if (ctx.flags.elder) return ['booth_classic', 'booth_mirror']
          return ['booth_classic', 'booth_mirror', 'booth_360']
        },
        recommendFor: ctx => (ctx.flags.teen || ctx.flags.milestone
          ? { close: 'booth_classic', family: 'booth_360', full_house: 'booth_360', grand: 'booth_360' }
          : { family: 'booth_classic', full_house: 'booth_classic', grand: 'booth_mirror' }),
        skipLabel: 'No booth',
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'Memory wall',
        emoji: '🖼️',
        question: 'A wall of photographs from the years?',
        why: 'At a sixtieth this is where the whole family ends up standing, pointing, and telling each other stories. It is worth more than the stage.',
        packIds: ['memwall_string', 'memwall_timeline', 'memwall_tribute_film'],
        recommendFor: ctx => (ctx.flags.elder
          ? { close: 'memwall_string', family: 'memwall_timeline', full_house: 'memwall_timeline', grand: 'memwall_tribute_film' }
          : { close: 'memwall_string', family: 'memwall_string', full_house: 'memwall_timeline', grand: 'memwall_timeline' }),
        skipLabel: 'Not this time',
        showIf: ctx => ctx.flags.elder || ctx.flags.milestone,
      }),
      svc({
        serviceId: 'fireworks',
        title: 'The moment',
        emoji: '🎆',
        question: 'Something for the cake-cutting itself?',
        why: 'Cold pyro is indoor-safe and smokeless, and it turns fifteen seconds into the clip that goes on every family group.',
        packIds: ['fire_cold_pyro', 'fire_lantern', 'fire_outdoor'],
        // Never offered where there are toddlers in the room.
        packsFor: ctx => (ctx.flags.toddler ? ['fire_lantern'] : ['fire_cold_pyro', 'fire_lantern', 'fire_outdoor']),
        recommend: { full_house: 'fire_cold_pyro', grand: 'fire_cold_pyro' },
        skipLabel: 'Just the candles',
      }),
      returnGifts({
        why: 'In this city a guest who leaves empty-handed notices. It does not have to be expensive — it has to exist.',
        packsFor: ctx => (ctx.flags.kids
          ? ['gift_kids', 'gift_budget', 'gift_mid']
          : ['gift_budget', 'gift_mid', 'gift_premium']),
        recommendFor: ctx => (ctx.flags.kids
          ? { close: 'gift_kids', family: 'gift_kids', full_house: 'gift_kids', grand: 'gift_mid' }
          : { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' }),
      }),
      invitations({
        why: 'A digital invite reaches the WhatsApp groups in an hour. A printed card is what you hand to the people you are asking properly.',
      }),
      ...groundwork,
      cleanup({
        why: 'Balloons, plates, and a hall you promised to hand back by eleven. Somebody is doing this at midnight — the only question is whether it is you.',
      }),
    ],
  },

  /* ──────────────────── FIRST BIRTHDAY ──────────────────────────────
     Its own occasion in the catalogue and rightly so: in most Karnataka
     families this is two functions in one day — an ayushya homa or
     annaprashana in the morning with the elders, and a themed party in
     the evening with the parents' friends. Ask which, because a flow
     that assumes one insults the other. */
  first_birthday: {
    id: 'first_birthday',
    opening: 'The first one. Let’s get every part of it right.',
    promise: 'A few questions about the morning and the evening. No price until the end.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'north_indian', 'multi_cuisine'],
    vegDefault: true,
    venue: anywhere({
      why: 'Most first birthdays are at home or in a small hall, because the baby has to nap somewhere and the grandparents have to sit down. Tell us which and we plan the room around both.',
      homeDesc: 'Your house or the apartment clubhouse — where the baby is comfortable and there is somewhere to put a cot.',
      packIds: ['venue_community', 'venue_banquet', 'venue_lawn', 'venue_resort'],
    }),
    core: ctx => (ctx.flags.party && !ctx.flags.ritual
      ? ['cake', 'dining', 'kids_play', 'photography', 'videography', 'return_gifts']
      : ctx.flags.party
        ? ['priest', 'pooja', 'cake', 'dining', 'photography', 'videography', 'return_gifts']
        : ['priest', 'pooja', 'nadaswaram', 'dining', 'photography', 'return_gifts']),
    decor: ctx => (ctx.flags.party ? decorLevels() : decorOwn({
      question: 'How is the house being set up?',
      why: 'A morning ayushya homa with the grandparents needs three things decorated: the homa corner, the child’s seat, and the door. There is no stage and no cake table, because there is no cake yet.',
      options: [
        {
          id: 'homa_corner',
          emoji: '🪔',
          name: 'The homa corner and the entrance',
          desc: 'The kunda laid out and decorated, a small floral seat for the child, and a toran and rangoli at the door.',
          includes: ['Homa corner laid out and decorated', 'Floral seat or cradle for the child', 'Mango-leaf toran and rangoli', 'Set up before the muhurtham'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'homa_room',
          emoji: '🌼',
          name: 'The corner and the whole room',
          desc: 'The above, plus the seating for the elders, a name backdrop for the family photographs, and warm lighting.',
          includes: ['Everything in the corner setup', 'Name backdrop for family photographs', 'Elder seating and table styling', 'Warm lighting through the room'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'The family is doing the decoration',
    })),
    chapters: [
      ask({
        id: 'shape',
        title: 'The day',
        emoji: '🌅',
        question: 'What does the day look like?',
        why: 'Most families in this city do both — the homa with the elders in the morning, the party with friends in the evening. They need different food, different décor and different people, and it is much cheaper to plan them together than twice.',
        options: [
          { id: 'ritual_only', emoji: '🪔', name: 'The traditional function only', desc: 'Ayushya homa or annaprashana, the elders, and a proper lunch.', flags: { ritual: true, party: false } },
          { id: 'party_only', emoji: '🎈', name: 'A themed birthday party only', desc: 'Décor, cake, photographs, and the parents’ friends.', flags: { ritual: false, party: true } },
          { id: 'both', emoji: '🌗', name: 'Both — ritual in the morning, party in the evening', desc: 'One day, two functions. We plan them as one so nothing is booked twice.', flags: { ritual: true, party: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'The rite',
        emoji: '🙏',
        question: 'Which rite is being performed?',
        why: 'Ayushya homa for long life, annaprashana for the first solid food, or both together. The purohit fixes the muhurtham and everything else follows it.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family priest is coming',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the homa kunda?',
        why: 'Sourced from the list your purohit sends, laid out and lit before the muhurtham. It is the job that always falls to somebody at five in the morning.',
        packIds: ['pooja_basic', 'pooja_homam_kit', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the muhurtham?',
        why: 'The sound every South Indian family associates with a house that has something to celebrate. Nothing else marks the moment the same way.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe', 'shehnai_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Recorded music is fine',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'What kind of cake?',
        why: 'A one-year-old will put their whole hand in it, which is the photograph. Choose accordingly — fondant sculpts beautifully but does not smash.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant', 'cake_dessert_table', 'cake_tiered'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_fondant', full_house: 'cake_fondant', grand: 'cake_tiered' },
        skipLabel: 'We have the cake sorted',
        showIf: ctx => ctx.flags.party,
      }),
      dining({
        why: 'A traditional lunch for the elders wants a banana-leaf pankti. An evening party wants standing tables so people move around.',
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_round', grand: 'dining_round' },
      }),
      photography({
        question: 'Who is photographing the first birthday?',
        why: 'You will not remember this day. The photographs are the only version of it your child will ever have, and there is no second attempt.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_prewedding'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'The homa, the first spoonful, the cake on the face. Three minutes, watched every year for twenty years.',
      }),
      svc({
        serviceId: 'nanny',
        title: 'Childcare',
        emoji: '👶',
        question: 'Somebody to help with the little ones?',
        why: 'A trained minder means the parents get to be at their own child’s function instead of running after everybody else’s.',
        packIds: ['nanny_standard', 'nanny_creche'],
        recommend: { family: 'nanny_standard', full_house: 'nanny_standard', grand: 'nanny_creche' },
        skipLabel: 'The family will manage',
      }),
      svc({
        serviceId: 'kids_play',
        title: 'For the kids',
        emoji: '🎠',
        question: 'Anything for the older children?',
        why: 'Cousins between four and ten are the ones who get bored first and loudest.',
        packIds: ['kids_bouncy', 'kids_activity', 'kids_play_zone'],
        recommend: { family: 'kids_activity', full_house: 'kids_bouncy', grand: 'kids_play_zone' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.party,
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A booth for the guests?',
        why: 'Prints handed to grandparents on the day, which is the one souvenir they will actually keep.',
        packIds: ['booth_classic', 'booth_mirror'],
        recommend: { full_house: 'booth_classic', grand: 'booth_classic' },
        skipLabel: 'No booth',
        showIf: ctx => ctx.flags.party,
      }),
      returnGifts({
        why: 'Silver for the close family, something small and useful for everybody else — that is how it is done here, and both are below.',
        packIds: ['gift_kids', 'gift_mid', 'gift_premium', 'gift_budget'],
        recommend: { close: 'gift_mid', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Grandparents want a card in hand. Everyone else wants it forwardable.' }),
      ...groundwork,
      cleanup({ why: 'A homa leaves ash and a party leaves everything else. Both cleared the same evening.' }),
    ],
  },

  /* ───────────────────── BABY SHOWER ───────────────────────────────
     Two quite different functions share the English name: the Kannada /
     Telugu seemantha or valakappu, which is a rite with green bangles,
     an oonjal and the women of both families — and the imported baby
     shower with games and a dessert table. Plenty of families now do a
     hybrid. Asking is the whole point. */
  baby_shower: {
    id: 'baby_shower',
    opening: 'Let’s plan the shower — and get the mum-to-be looked after properly.',
    promise: 'Everything below is optional and nothing shows a price until the end.',
    cuisineLead: ['karnataka', 'tamil', 'andhra', 'north_indian', 'chaat_street'],
    vegDefault: true,
    venue: anywhere({
      why: 'A seemantha or godh bharai is usually at the mother-to-be’s parents’ house or a small hall nearby, because she should not be travelling far in the seventh month. That is why there is no resort on this list.',
      homeDesc: 'The family home or the apartment clubhouse — a sofa she can actually rest on, and a washroom that is not down a corridor.',
      packIds: ['venue_community', 'venue_banquet', 'venue_lawn'],
    }),
    core: ctx => (ctx.flags.ritual
      ? ['priest', 'pooja', 'makeup', 'dining', 'photography', 'return_gifts']
      : ['makeup', 'cake', 'dining', 'emcee', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the room being set up?',
      why: 'A seemantha is a seated function in a house or a small hall, and the decoration is one corner of it: where she sits, and what is behind her in every photograph. There is no stage and no dance floor.',
      options: [
        {
          id: 'seat_corner',
          emoji: '🌸',
          name: 'The seat, and a floral corner',
          desc: 'A decorated chair or swing for her, a flower backdrop behind it, and the entrance done. Everything the photographs need and nothing else.',
          includes: ['Decorated seat or jhula', 'Floral or drape backdrop, about 8 ft', 'Entrance toran and rangoli', 'Set up before guests arrive, cleared after'],
          levelId: 'home_touch',
          themeId: 'pastel',
        },
        {
          id: 'full_room',
          emoji: '🎀',
          name: 'The whole room styled',
          desc: 'The seat, the backdrop, the gift and bangle table, hanging florals, and the tables the guests sit at.',
          includes: ['Everything in the corner setup', 'Bangle and gift table styling', 'Hanging floral or drape work', 'Table centrepieces and linen', 'Pathway and ambient lighting'],
          levelId: 'classic',
          themeId: 'pastel',
        },
        {
          id: 'designed',
          emoji: '✨',
          name: 'Designed by a stylist',
          desc: 'A designer draws the setup before anything is ordered and the palette runs through the whole room. For a large hall function.',
          includes: ['Designer visit and a drawn plan', 'Designed backdrop with fresh florals', 'Photo corner installation', 'Full table styling and uplighting'],
          levelId: 'signature',
          themeId: 'pastel',
        },
      ],
      skipLabel: 'The family is decorating it themselves',
    }),
    chapters: [
      ask({
        id: 'style',
        title: 'Style',
        emoji: '🤰',
        question: 'What kind of shower is this?',
        why: 'A seemantha and a games-and-cupcakes shower want completely different rooms, food and music. Plenty of families do both in one afternoon, which works well if it is planned that way from the start.',
        options: [
          { id: 'traditional', emoji: '🪷', name: 'Traditional — seemantha / valakappu', desc: 'Bangle ceremony, oonjal, the elders, a proper lunch on a leaf.', flags: { ritual: true, games: false } },
          { id: 'modern', emoji: '🎀', name: 'A modern baby shower', desc: 'Décor corner, games, dessert table, photographs.', flags: { ritual: false, games: true } },
          { id: 'both', emoji: '🌸', name: 'Both, in one afternoon', desc: 'The rite first with the elders, then the fun once they have eaten.', flags: { ritual: true, games: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'The rite',
        emoji: '🙏',
        question: 'Is a purohit conducting the seemantha?',
        why: 'Most families in Karnataka keep the ritual short and do it before lunch. He will send a samagri list a week ahead.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_home_pooja', grand: 'priest_homam' },
        skipLabel: 'The elders of the family will conduct it',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri, bangles and the thamboola bags?',
        why: 'Green bangles for every woman who comes, arishina-kumkuma, blouse pieces and betel. The list is long and it is always the thing somebody forgets.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_basic', grand: 'pooja_homam_kit' },
        skipLabel: 'The family has bought everything',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'mehendi',
        title: 'Mehendi',
        emoji: '🤲',
        question: 'Mehendi for the mum-to-be and the guests?',
        why: 'An artist in the corner turns the waiting part of the afternoon into the part everybody enjoys.',
        packIds: ['mehendi_guest', 'mehendi_bridal', 'mehendi_premium'],
        recommend: { close: 'mehendi_guest', family: 'mehendi_guest', full_house: 'mehendi_guest', grand: 'mehendi_premium' },
        skipLabel: 'No mehendi',
      }),
      svc({
        serviceId: 'makeup',
        title: 'Getting ready',
        emoji: '💄',
        question: 'Somebody to help her get ready?',
        why: 'Draping a nine-yard saree at seven months is a two-person job, and she is going to be photographed all day.',
        packIds: ['makeup_guest', 'makeup_bridal'],
        recommend: { family: 'makeup_guest', full_house: 'makeup_guest', grand: 'makeup_bridal' },
        skipLabel: 'She has it covered',
      }),
      svc({
        serviceId: 'cake',
        title: 'Sweet table',
        emoji: '🧁',
        question: 'A cake or a dessert table?',
        why: 'Not traditional, and now expected at almost every shower in the city. It is also the corner people photograph.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_dessert_table', 'cake_fondant'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_dessert_table', full_house: 'cake_dessert_table', grand: 'cake_dessert_table' },
        skipLabel: 'No cake',
        showIf: ctx => ctx.flags.games,
      }),
      dining({
        why: 'A seemantha lunch is served seated, on a leaf, in the old order. A modern shower is standing and grazing. Say which and the kitchen plans differently.',
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'emcee',
        title: 'Games',
        emoji: '🎙️',
        question: 'Somebody to run the games?',
        why: 'Left to the family, the games start an hour late and half the room is on their phones. A host keeps forty women of four generations in the same activity.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The cousins are running it',
        showIf: ctx => ctx.flags.games,
      }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Music through the afternoon?',
        why: 'A veena or a flute under the conversation, rather than a speaker over it.',
        packIds: ['music_classical_duo', 'music_band'],
        recommend: { full_house: 'music_classical_duo', grand: 'music_classical_duo' },
        skipLabel: 'A playlist is fine',
      }),
      photography({
        question: 'Who is photographing it?',
        why: 'This is the last function before everything changes, and the photographs of her at this moment are the ones the family will want later.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_prewedding'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'Short, and worth it — the oonjal and the blessings, not the whole afternoon.', recommend: { full_house: 'video_event', grand: 'video_cinematic' } }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Anyone watching from abroad?',
        why: 'A grandmother in Chennai or a sister in Dallas who cannot travel. A private link, not a public one.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: {},
        skipLabel: 'Everybody is coming',
      }),
      returnGifts({
        why: 'Blouse pieces, bangles and thamboola for the women who come — this is not optional in most families, it is the function.',
        packIds: ['gift_mid', 'gift_premium', 'gift_budget'],
        recommend: { close: 'gift_mid', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Usually a WhatsApp card and a phone call to the elders. Both are below.' }),
      ...groundwork,
      cleanup({ why: 'Flowers, leaves and forty plates. Cleared before the family sits down to eat what is left.' }),
    ],
  },

  /* ─────────────────── NAMING CEREMONY ─────────────────────────────
     Namakarana. A morning rite fixed to a muhurtham, a cradle, and a
     lunch. The whole flow is built around the clock the purohit sets. */
  naming_ceremony: {
    id: 'naming_ceremony',
    opening: 'Namakarana. Let’s arrange the morning properly.',
    promise: 'Everything is built around your muhurtham. No price until you have seen the whole plan.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'jain_satvik', 'andhra'],
    vegDefault: true,
    venue: {
      question: 'Where is the namakarana being held?',
      why: 'A homa needs shelter, a lamp needs still air, and a newborn should not be out for long. Those three facts remove most of a generic venue list, so this one only offers what a namakarana is actually held in.',
      options: [
        atHome('The house or the apartment clubhouse. Most namakaranas are, and it is the easiest thing for a mother six weeks after a delivery.'),
        atTemple('The temple your family goes to. We speak to the office, confirm the slot and coordinate with their purohit.'),
        alreadyBooked(),
      ],
      packIds: ['venue_community', 'venue_banquet'],
      footnote: 'No lawn or resort on this list — a homa in open wind is a problem the decorator cannot fix.',
    },
    core: ctx => (ctx.flags.homa
      ? ['priest', 'pooja', 'nadaswaram', 'dining', 'photography', 'return_gifts']
      : ['priest', 'pooja', 'dining', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the house being set up?',
      why: 'A namakarana needs three things decorated and nothing else: where the homa sits, the cradle, and the door people come through. A stage and a dance floor would be somebody else’s function.',
      options: [
        {
          id: 'cradle',
          emoji: '🌼',
          name: 'The cradle and the pooja corner',
          desc: 'A floral cradle, the homa space laid out properly, and rangoli and a mango toran at the door.',
          includes: ['Floral cradle decoration', 'Homa and pooja corner setup', 'Rangoli and mango-leaf toran at the entrance', 'Setup before the muhurtham, cleared after'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'cradle_room',
          emoji: '🪷',
          name: 'Cradle, corner and the whole room',
          desc: 'The above, plus the seating area, the name backdrop the family photographs happen against, and lighting.',
          includes: ['Everything in the cradle setup', 'Name backdrop for family photographs', 'Guest seating and table styling', 'Warm lighting through the room'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
        {
          id: 'hall',
          emoji: '✨',
          name: 'A full hall setup',
          desc: 'For a namakarana in a booked hall with two hundred guests — designed backdrop, entrance installation and every table.',
          includes: ['Designed backdrop with fresh florals', 'Entrance installation and welcome signage', 'Full table styling', 'Ambient and stage lighting'],
          levelId: 'signature',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'The family is arranging the decoration',
    }),
    chapters: [
      ask({
        id: 'rite',
        title: 'The rite',
        emoji: '🪷',
        question: 'What is being performed?',
        why: 'Some families do the namakarana alone; many combine it with the cradle ceremony, and some add the ayushya homa. It changes the length of the morning and how much samagri is needed.',
        options: [
          { id: 'naming', emoji: '📿', name: 'Namakarana only', desc: 'The name spoken into the ear, the blessings, and lunch.', flags: { homa: false, cradle: false } },
          { id: 'cradle', emoji: '🛏️', name: 'Namakarana with the cradle ceremony', desc: 'Tottilu — the baby placed in the decorated cradle by the aunts.', flags: { homa: false, cradle: true } },
          { id: 'full', emoji: '🔥', name: 'With a homa as well', desc: 'Ayushya homa or punyahavachana before the naming. A longer morning.', flags: { homa: true, cradle: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting it?',
        why: 'A vadhyar who knows your family’s sampradaya, arriving early, with the muhurtham confirmed against your child’s nakshatra.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the setup?',
        why: 'Kalasha, mango leaves, the homa kunda if there is one, and the whole list your vadhyar sends — bought and laid out before he arrives.',
        packIds: ['pooja_basic', 'pooja_homam_kit', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family has it',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram at the muhurtham?',
        why: 'The first thing a South Indian family listens for. It is what tells the street that something good is happening in this house.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe', 'shehnai_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'bhajan',
        title: 'Devotional',
        emoji: '🎼',
        question: 'Bhajans or a Carnatic sitting after the rite?',
        why: 'Half an hour of devotional singing while the lunch is laid keeps the room together instead of everybody drifting to their cars.',
        packIds: ['bhajan_mandali', 'bhajan_carnatic', 'bhajan_chowki'],
        recommend: { full_house: 'bhajan_mandali', grand: 'bhajan_carnatic' },
        skipLabel: 'Not needed',
      }),
      dining({
        why: 'A namakarana lunch is a leaf meal, served seated, in order. Anything else reads as a party rather than a rite.',
        packIds: ['dining_leaf', 'dining_floor', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      photography({
        question: 'Who is photographing the morning?',
        why: 'The name being spoken, the cradle, the grandparents holding the baby. Nobody in the room will be free to take these.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'The rite itself, unedited, so the child can hear their own naming one day.' }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Family who cannot travel?',
        why: 'A namakarana is at seven in the morning on a weekday as often as not. Half the family is at work or overseas.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single', grand: 'stream_multi' },
        skipLabel: 'Everybody will be there',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Welcoming',
        emoji: '🙋',
        question: 'Somebody to receive the guests?',
        why: 'At a morning function the hosts are inside at the homa. Without ushers, arriving guests stand at the gate.',
        packIds: ['hosp_ushers', 'hosp_guest_manager'],
        recommend: { full_house: 'hosp_ushers', grand: 'hosp_ushers' },
        skipLabel: 'Cousins will handle it',
      }),
      returnGifts({
        why: 'Arishina-kumkuma, a small silver piece for the close family, thamboola for everybody. The thing the elders will notice.',
        packIds: ['gift_mid', 'gift_budget', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Short notice is normal here — the muhurtham is often fixed only days ahead. Digital reaches everybody the same evening.' }),
      ...groundwork,
      cleanup({ why: 'Homa ash, leaves, and a hall to hand back. Cleared while the family is still eating.' }),
    ],
  },

  /* ───────────────────── ANNIVERSARY ────────────────────────────── */
  anniversary: {
    id: 'anniversary',
    opening: 'How many years, and how would you like to mark them?',
    promise: 'A short flow. No price until you have chosen everything.',
    cuisineLead: ['north_indian', 'karnataka', 'continental', 'multi_cuisine', 'mughlai'],
    vegDefault: false,
    venue: anywhere({
      why: 'An anniversary runs from a table for two to a hall for four hundred, and the answer here is what tells us which one we are planning.',
      homeDesc: 'The terrace, the garden or the dining room — where most of the anniversaries we do actually happen.',
    }),
    // The widest spread of any occasion here. A candlelit table for two and a
    // shashtipoorthi for three hundred are both "anniversary", and the first
    // one is three decisions.
    core: ctx => {
      if (ctx.flags.intimate) return ['cake', 'dining', 'photography']
      if (ctx.flags.milestone) return ['priest', 'cake', 'dining', 'live_music', 'memory_wall', 'photography', 'return_gifts']
      if (ctx.flags.party) return ['cake', 'dining', 'dj', 'photography', 'return_gifts']
      return ['cake', 'dining', 'photography', 'return_gifts']
    },
    decor: ctx => {
      if (ctx.flags.intimate) {
        return decorOwn({
          question: 'How is the table being set up?',
          why: 'For two people the decoration is one table and the light around it. Anything more is a hall setup with two chairs in it, which is the opposite of the evening you are booking.',
          options: [
            {
              id: 'candle_table',
              emoji: '🕯️',
              name: 'A candlelit table',
              desc: 'Candle pathway to the table, floating flowers, fairy lights and rose petals. Set up while you are out and cleared after.',
              includes: ['Candle pathway and table candles', 'Floating flowers and petal work', 'Fairy lights around the space', 'Set up in your absence, cleared after'],
              levelId: 'home_touch',
              themeId: 'rose_gold',
            },
            {
              id: 'terrace',
              emoji: '🌙',
              name: 'A terrace or garden setting',
              desc: 'The table, plus a draped canopy, a floral arch to sit under and lighting through the whole space.',
              includes: ['Draped canopy over the table', 'Floral arch and backdrop', 'Lighting across the terrace or garden', 'Weather backup arranged'],
              levelId: 'classic',
              themeId: 'rose_gold',
            },
          ],
          skipLabel: 'No setup — just the dinner',
        })
      }
      if (ctx.flags.milestone) {
        return decorOwn({
          question: 'How is the hall being set up?',
          why: 'A fiftieth or a shashtipoorthi is a felicitation. What the decoration has to give you is a front of the room where the couple are honoured, and a wall the family stands at.',
          options: [
            {
              id: 'stage_wall',
              emoji: '🖼️',
              name: 'A felicitation stage and a photo wall',
              desc: 'Garlanded seating at the front, a floral backdrop for the speeches, and the memory wall mounted and lit.',
              includes: ['Garlanded seating for the couple', 'Floral felicitation backdrop', 'Memory wall mounting and lighting', 'Entrance and welcome board'],
              levelId: 'classic',
              themeId: 'traditional_red_gold',
            },
            {
              id: 'designed',
              emoji: '✨',
              name: 'The whole hall, designed',
              desc: 'A designer draws it, and the palette runs through the stage, the tables and the entrance. For three hundred guests.',
              includes: ['Designed stage with layered draping and florals', 'Entrance installation and signage', 'Photo and tribute corner', 'Full table styling and uplighting'],
              levelId: 'signature',
              themeId: 'mysuru_royal',
            },
          ],
          skipLabel: 'The hall or the family is decorating it',
        })
      }
      return decorLevels()
    },
    chapters: [
      ask({
        id: 'mood',
        title: 'The shape',
        emoji: '💍',
        question: 'What kind of evening is this?',
        why: 'A surprise dinner for two and a golden jubilee with three hundred relatives are both anniversaries, and almost nothing below is the same for the two of them.',
        options: [
          { id: 'couple', emoji: '🕯️', name: 'Just the two of us', desc: 'A private dinner, set up somewhere beautiful, with nobody else there.', flags: { intimate: true, ritual: false, party: false } },
          { id: 'family', emoji: '🏡', name: 'Family dinner at home', desc: 'Children, grandchildren, a cake, and a proper meal.', flags: { intimate: false, ritual: false, party: false } },
          { id: 'party', emoji: '🥂', name: 'A full party', desc: 'Friends, music, a stage, photographs.', flags: { intimate: false, ritual: false, party: true } },
          { id: 'milestone', emoji: '👑', name: 'A milestone — 25th, 50th, 60th', desc: 'Silver, golden or diamond. Often with a pooja in the morning and a reception in the evening.', flags: { intimate: false, ritual: true, party: true, milestone: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Blessing',
        emoji: '🙏',
        question: 'A pooja or a vow renewal in the morning?',
        why: 'For a silver or golden anniversary many families do a Satyanarayana pooja or a sashtiapthapoorthi-style rite before the evening function.',
        packIds: ['priest_home_pooja', 'priest_homam', 'priest_wedding'],
        recommend: { family: 'priest_home_pooja', full_house: 'priest_home_pooja', grand: 'priest_homam' },
        skipLabel: 'No ritual',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'What are you cutting?',
        why: 'The photograph that goes next to the wedding one. For a fiftieth, a tiered cake is worth the difference.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_tiered', 'cake_dessert_table'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_tiered', grand: 'cake_tiered' },
        skipLabel: 'No cake',
      }),
      dining({ why: 'For an anniversary the elders sit. Round tables, seated service, and somewhere to put a glass down.', recommend: { close: 'dining_round', family: 'dining_round', full_house: 'dining_round', grand: 'dining_lounge' } }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎷',
        question: 'Live music?',
        why: 'A saxophone or a ghazal singer through dinner is the single thing that most changes how an anniversary feels. A DJ makes it a birthday.',
        packIds: ['music_classical_duo', 'music_ghazal_sufi', 'music_band', 'music_dj_band'],
        recommend: { close: 'music_classical_duo', family: 'music_classical_duo', full_house: 'music_ghazal_sufi', grand: 'music_band' },
        skipLabel: 'No live music',
      }),
      svc({
        serviceId: 'dj',
        title: 'DJ',
        emoji: '🎵',
        question: 'And a DJ later in the evening?',
        why: 'Songs from the year they married, then everything the grandchildren want. Two crowds, one floor.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        recommend: { full_house: 'dj_standard', grand: 'dj_standard' },
        skipLabel: 'No DJ',
        showIf: ctx => ctx.flags.party,
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'The years',
        emoji: '🖼️',
        question: 'A display of the years together?',
        why: 'At a twenty-fifth or a fiftieth this is where everybody ends up standing. A tribute film shown once, mid-evening, stops the room.',
        packIds: ['memwall_string', 'memwall_timeline', 'memwall_tribute_film'],
        recommend: { close: 'memwall_string', family: 'memwall_string', full_house: 'memwall_timeline', grand: 'memwall_tribute_film' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody to run the evening?',
        why: 'Speeches at an anniversary happen or they do not, and what decides it is whether one person is holding the microphone and the clock.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The children will run it',
        showIf: ctx => ctx.flags.party || ctx.flags.milestone,
      }),
      photography({
        why: 'They were photographed properly once, decades ago, and probably not since. This is the second time.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_prewedding'],
      }),
      videography({ why: 'The speeches, mostly. Those are the part the family plays back.' }),
      svc({
        serviceId: 'fireworks',
        title: 'The moment',
        emoji: '🎆',
        question: 'Something for the cake-cutting?',
        why: 'Cold pyro is indoor-safe and it makes fifteen seconds look like a film.',
        packIds: ['fire_cold_pyro', 'fire_outdoor', 'fire_lantern'],
        recommend: { grand: 'fire_cold_pyro' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.party,
      }),
      returnGifts({ why: 'A small hamper for the guests who came a long way, especially at a milestone.', packIds: ['gift_mid', 'gift_premium', 'gift_budget'], recommend: { full_house: 'gift_mid', grand: 'gift_premium' } }),
      invitations({ why: 'For a fiftieth, a printed card is part of the occasion. For a tenth, a WhatsApp invite is plenty.' }),
      ...groundwork,
      cleanup({ why: 'Cleared the same night so nobody spends the morning after their anniversary stacking chairs.' }),
    ],
  },

  /* ─────────────────── HOUSEWARMING ────────────────────────────────
     Griha Pravesha. The one occasion where the clock is genuinely
     non-negotiable — the muhurtham is often before sunrise — and where
     the rite, not the party, is the event. */
  housewarming: {
    id: 'housewarming',
    opening: 'Griha Pravesha. Let’s get the morning right, then the lunch.',
    promise: 'Built around your muhurtham. No price until you have seen everything.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'andhra', 'jain_satvik'],
    vegDefault: true,
    // The occasion that made this whole venue rework necessary. A gruha
    // pravesha is the rite of entering THE NEW HOUSE; offering a resort as an
    // alternative is not flexibility, it is not knowing what the ceremony is.
    // The second answer is the real one families take — pooja at the flat,
    // lunch at a hall down the road, because a new flat has no kitchen.
    venue: {
      question: 'The pooja is at the new house. Where is the lunch?',
      why: 'The rite itself can only happen at the house you are entering, so we have not asked. What families genuinely differ on is the meal afterwards — a house with no kitchen, no gas connection and eighty guests is a real problem, and a hall two streets away is a real answer.',
      fixed: {
        id: 'new_home',
        emoji: '🔑',
        name: 'The pooja is at the new home',
        desc: 'Where else. We survey the flat or the house beforehand, plan where the homa kunda sits, and work out how a kitchen with no gas yet feeds your guests.',
        includes: [
          'Site visit before the muhurtham',
          'Homa placement and smoke clearance checked',
          'Power, water and lift access confirmed',
          'Society permission drafted for you',
        ],
      },
      options: [
        {
          id: 'new_home',
          emoji: '🏠',
          name: 'Everything at the new house',
          desc: 'Pooja and lunch both, served in the empty rooms or on the terrace. Our kitchen team works out of a temporary setup — this is the most common answer.',
          includes: ['Temporary cooking setup outside the house', 'Serving team who bring everything', 'Floor or leaf seating planned room by room', 'The house left clean the same afternoon'],
        },
        {
          id: 'hall_nearby',
          emoji: '🍽️',
          name: 'Pooja at the house, lunch at a hall nearby',
          desc: 'For a large guest list, or a flat where two hundred people genuinely will not fit. We find and book the hall within walking or two-minute driving distance.',
          includes: ['Hall shortlisted within a kilometre', 'Rate negotiated and booked', 'Guests directed from the flat to the hall', 'Both ends coordinated on one timeline'],
        },
      ],
      packIds: [],
      footnote: 'No lawn, no resort, no banquet hall as the main venue — a gruha pravesha is held at the house being entered, and that is not a preference.',
    },
    core: ctx => (ctx.flags.homa
      ? ['priest', 'pooja', 'nadaswaram', 'precleanup', 'dining', 'photography', 'return_gifts']
      : ['priest', 'pooja', 'precleanup', 'dining', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the house being decorated?',
      why: 'A gruha pravesha decorates the THRESHOLD. Everything that matters happens at the door — the kalasha carried over it, the first step, the photograph. The inside of a house with no furniture in it yet is not where this money goes.',
      options: [
        {
          id: 'threshold',
          emoji: '🪷',
          name: 'The entrance, done properly',
          desc: 'Mango-leaf toran across the door, banana stems either side, a fresh rangoli on the morning, and the pooja corner laid out.',
          includes: ['Fresh mango-leaf toran across the main door', 'Banana stems at both sides of the entrance', 'Hand-drawn rangoli on the morning', 'Homa and kalasha corner setup', 'Cleared the same afternoon'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'threshold_rooms',
          emoji: '🌿',
          name: 'Entrance and the rooms',
          desc: 'The threshold work, plus floral through the main rooms, the dining area styled, and lighting for a house with no fittings up yet.',
          includes: ['Everything in the entrance setup', 'Floral work through the main rooms', 'Dining area styling for the lunch', 'Temporary warm lighting where fittings are not in'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
        {
          id: 'full',
          emoji: '✨',
          name: 'Entrance, rooms and the compound',
          desc: 'For a house with a compound and two hundred guests — the approach, the gate, a shaded seating area outside, and the whole interior.',
          includes: ['Everything in the rooms setup', 'Gate and approach styling', 'Shaded outdoor seating area', 'Pathway lighting from the gate', 'Designer visit before the day'],
          levelId: 'signature',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'We are decorating the house ourselves',
    }),
    chapters: [
      ask({
        id: 'rite',
        title: 'The rite',
        emoji: '🏠',
        question: 'Which pooja is being performed?',
        why: 'It decides how long the morning runs, how much samagri is needed, and when your guests can realistically be asked to arrive.',
        options: [
          { id: 'simple', emoji: '🪔', name: 'A simple gruhapravesha', desc: 'Kalasha, milk boiled over, the first entry. An hour, then lunch.', flags: { homa: false } },
          { id: 'ganapati', emoji: '🐘', name: 'Ganapati homa and Vaastu shanti', desc: 'The usual full form. Two to three hours before the entry.', flags: { homa: true } },
          { id: 'satyanarayana', emoji: '📿', name: 'Satyanarayana pooja as well', desc: 'Often done the same morning or the following Sunday.', flags: { homa: true, extended: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting it?',
        why: 'A vadhyar who will confirm the muhurtham against the house’s direction and your family’s tradition, and who arrives before you do.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri, kalasha and the homa setup?',
        why: 'Navadhanya, the copper kalasha, mango leaves, the cow if your family keeps that custom, and the whole list your purohit sends. Bought and laid out the night before, in a house that has no kitchen yet.',
        packIds: ['pooja_basic', 'pooja_homam_kit', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the entry?',
        why: 'Playing as you carry the kalasha over the threshold. It is the sound of the moment, and the neighbours will come out to watch.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe', 'shehnai_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'cleanup',
        id: 'precleanup',
        title: 'Before',
        emoji: '🧽',
        question: 'Does the house need a clean before the pooja?',
        why: 'A handover-fresh flat is full of cement dust, paint flecks and stickers on every window. The morning of the muhurtham is not when to discover that.',
        packIds: ['clean_deep', 'clean_basic'],
        recommend: { close: 'clean_deep', family: 'clean_deep', full_house: 'clean_deep', grand: 'clean_deep' },
        skipLabel: 'The house is ready',
      }),
      dining({
        why: 'A gruhapravesha lunch is served on a leaf, seated, and it is the part the guests actually judge. Standing buffets in a new empty flat do not work — there is nowhere to put anything down.',
        packIds: ['dining_leaf', 'dining_floor', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      svc({
        serviceId: 'bhajan',
        title: 'Devotional',
        emoji: '🎼',
        question: 'Bhajans while lunch is laid?',
        why: 'Keeps the house full and warm through the gap between the rite ending and the food being ready, which is otherwise the flattest hour of the day.',
        packIds: ['bhajan_mandali', 'bhajan_carnatic', 'bhajan_chowki'],
        recommend: { full_house: 'bhajan_mandali', grand: 'bhajan_carnatic' },
        skipLabel: 'Not needed',
      }),
      photography({
        question: 'Who is photographing the entry?',
        why: 'The first step over the threshold, the milk boiling over, both families in the doorway of a house you saved years for.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'Short. The entry and the blessings, not the whole morning.' }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Family watching from elsewhere?',
        why: 'Parents in another town who cannot travel at five in the morning, and the sibling abroad who paid part of the down payment.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single' },
        skipLabel: 'Everybody will be here',
      }),
      svc({
        serviceId: 'valet',
        id: 'parking_apartment',
        title: 'Parking',
        emoji: '🅿️',
        question: 'Where are eighty cars going in an apartment complex?',
        why: 'The single most common complaint after a gruhapravesha, and the fastest way to start badly with the neighbours you are about to live among.',
        packIds: ['valet_marshals', 'valet_full'],
        recommend: { family: 'valet_marshals', full_house: 'valet_marshals', grand: 'valet_full' },
        skipLabel: 'There is plenty of parking',
      }),
      returnGifts({
        why: 'Arishina-kumkuma and a small useful thing. In most families the guests brought a gift for the house, so this is the return.',
        packIds: ['gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
      }),
      invitations({ why: 'A gruhapravesha invite goes out late because the muhurtham is fixed late. Digital is what actually reaches people in time.' }),
      ...groundworkWithout('valet'),
      cleanup({ why: 'Two hundred banana leaves and a homa kunda, out of a brand-new house, the same afternoon.' }),
    ],
  },

  /* ─────────────────── GET TOGETHER ─────────────────────────────── */
  get_together: {
    id: 'get_together',
    opening: 'Let’s put this together without it taking over your week.',
    promise: 'Short and simple. Skip anything you do not need — the price comes at the end.',
    cuisineLead: ['indo_chinese', 'north_indian', 'chaat_street', 'karnataka', 'continental'],
    vegDefault: false,
    venue: anywhere({
      why: 'The most open question in the catalogue — a get-together is whatever the host wants it to be. Where it is decides the noise limit, the closing time and whether we bring power.',
      packIds: ['venue_community', 'venue_banquet', 'venue_lawn', 'venue_resort'],
      extra: [atOffice('The office cafeteria, the terrace or a floor cleared for the evening. Most team get-togethers we do are here.')],
    }),
    core: ctx => {
      if (ctx.flags.speeches) return ['dining', 'emcee', 'cake', 'photography']
      if (ctx.flags.formal) return ['dining', 'emcee', 'photography']
      if (ctx.flags.kids) return ['dining', 'dj', 'kids_play', 'photography']
      return ['dining', 'dj', 'cake', 'photography']
    },
    decor: decorOwn({
      question: 'How much setting up is there?',
      why: 'A get-together is the one occasion where decoration is genuinely optional — most of them need lights, somewhere to put the food, and nothing else. Choose the smallest thing that is true.',
      options: [
        {
          id: 'lights_only',
          emoji: '💡',
          name: 'Lights and a food table',
          desc: 'Fairy lights across the space, the buffet table dressed, and a corner that photographs well. Set up and taken down the same evening.',
          includes: ['Fairy or festoon lighting across the space', 'Buffet and drinks table styling', 'One photographable corner', 'Setup and clearing by our team'],
          levelId: 'home_touch',
          themeId: 'white_gold',
        },
        {
          id: 'themed',
          emoji: '🎈',
          name: 'A themed setup',
          desc: 'A backdrop, balloons or florals to a theme, table styling and proper lighting. For a party with a reason rather than a Saturday.',
          includes: ['Themed backdrop, about 8 ft', 'Balloon or floral installation', 'Table centrepieces and linen', 'Pathway and ambient lighting'],
          levelId: 'classic',
          themeId: 'pastel',
        },
      ],
      skipLabel: 'No decoration — just the food and the music',
    }),
    chapters: [
      ask({
        id: 'kind',
        title: 'Who',
        emoji: '🥳',
        question: 'Who is coming?',
        why: 'The food and the music are completely different for the office and for the old school batch, and neither is what a society Sunday needs.',
        options: [
          { id: 'friends', emoji: '🎉', name: 'Friends — a reunion or a catch-up', desc: 'Late, loud, and nobody wants a stage.', flags: { loud: true, formal: false } },
          { id: 'office', emoji: '💼', name: 'The team from work', desc: 'A meal, some structure, and everybody home at a reasonable hour.', flags: { loud: false, formal: true } },
          { id: 'society', emoji: '🏘️', name: 'The apartment or the street', desc: 'All ages, children everywhere, and food that suits everybody.', flags: { loud: true, formal: false, kids: true } },
          { id: 'farewell', emoji: '👋', name: 'A farewell or a welcome', desc: 'Somebody is leaving or arriving, and there will be speeches.', flags: { loud: false, formal: true, speeches: true } },
        ],
      }),
      dining({ why: 'Standing and grazing keeps a get-together moving. Seated dinner turns it into a function, which may or may not be what you want.', recommend: { close: 'dining_buffet_standing', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' } }),
      svc({
        serviceId: 'dj',
        title: 'Music',
        emoji: '🎵',
        question: 'What is playing?',
        why: 'A house rig in a clubhouse is right. A hall rig in a clubhouse gets the security called.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        recommend: { close: 'dj_house', family: 'dj_house', full_house: 'dj_standard', grand: 'dj_standard' },
        skipLabel: 'A speaker and a playlist',
        showIf: ctx => ctx.flags.loud,
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody to hold it together?',
        why: 'For a farewell especially: without a host the speeches either do not happen or all happen at once.',
        packIds: ['emcee_standard', 'emcee_full', 'emcee_corporate'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'We will manage',
        showIf: ctx => ctx.flags.speeches || ctx.flags.formal,
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'Is there a cake?',
        why: 'For a farewell there usually is, and it is what gets photographed.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_dessert_table'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg' },
        skipLabel: 'No cake',
      }),
      svc({
        serviceId: 'kids_play',
        title: 'For the kids',
        emoji: '🎠',
        question: 'Anything for the children?',
        why: 'At a society function there will be thirty of them and nobody has planned for it.',
        packIds: ['kids_bouncy', 'kids_activity', 'kids_play_zone'],
        recommend: { family: 'kids_bouncy', full_house: 'kids_play_zone' },
        skipLabel: 'No children',
        showIf: ctx => ctx.flags.kids,
      }),
      photography({
        why: 'Somebody has to be taking these, and if it is one of the guests they spend the evening working.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: null, family: 'photo_half_day', full_house: 'photo_half_day', grand: 'photo_full_day' },
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A booth?',
        why: 'At a reunion, the prints are what everybody takes home and puts on a desk.',
        packIds: ['booth_classic', 'booth_360', 'booth_mirror'],
        recommend: { family: 'booth_classic', full_house: 'booth_classic' },
        skipLabel: 'No booth',
      }),
      invitations({ why: 'A group message and a digital card. Nothing printed needed here.' }),
      ...groundwork,
      cleanup({ why: 'Clubhouses charge a fine if it is not spotless by morning, and it is always one person who ends up doing it.' }),
    ],
  },

  /* ────────────────────── WEDDING ─────────────────────────────────
     The longest flow in the app, and it earns the length: a wedding is
     three to six separate functions, and the mistake every planning tool
     makes is treating it as one. Ask which functions FIRST — everything
     after that is filtered on the answer, so a court marriage with a
     lunch never sees a baraat chapter. */
  wedding: {
    id: 'wedding',
    opening: 'A wedding is several functions. Let’s take them one at a time.',
    promise: 'This is the longest one — around fifteen questions. You can skip any of them, and there is no price until the end.',
    cuisineLead: ['mysuru_royal', 'karnataka', 'north_indian', 'multi_cuisine', 'tamil', 'andhra'],
    vegDefault: true,
    venue: {
      question: 'Where is the wedding?',
      why: 'The single biggest decision in this flow and the one everything else is arranged around. It sets the muhurtham window, the catering rules, the decorator’s access and whether we are bringing power and washrooms with us.',
      options: [
        alreadyBooked('Almost every wedding has the hall booked before anything else. Tell your coordinator which, and we work to its kitchen rules, its decor restrictions and its access timings.'),
        atHome('A home wedding — the compound, the street outside, a pandal over both. Still done, and we plan the whole build rather than the hall.'),
      ],
      packIds: ['venue_community', 'venue_banquet', 'venue_resort', 'venue_lawn'],
    },
    // Thirteen, which is what a wedding genuinely is. Everything else — the
    // drone, the stream, the transport, the signage, the groundwork — is on
    // the shelf, where a family who wants it finds it all in one place
    // instead of one interruption at a time.
    core: ctx => {
      const base = ['priest', 'pooja', 'makeup', 'bridal_wear', 'wedding_car',
        'dining', 'photography', 'videography', 'return_gifts', 'invitations']
      // The pre-wedding functions only earn a screen if they were ticked on
      // the first question. A family doing only the muhurtham should not be
      // asked how many mehendi artists they need.
      if (ctx.flags.haldi || ctx.flags.mehendi) base.splice(2, 0, 'mehendi')
      if (ctx.flags.sangeet) base.splice(3, 0, 'choreography', 'dj')
      if (ctx.flags.north) base.push('baraat')
      if (ctx.flags.south) base.push('nadaswaram')
      return base
    },
    decor: decorLevels(),
    chapters: [
      ask({
        id: 'functions',
        title: 'Functions',
        emoji: '💒',
        question: 'Which functions are we planning?',
        why: 'This is the question everything else depends on. A muhurtham and a reception are two events with two guest lists, two menus and two décor plans — and pricing them as one is how families end up with a bill they did not expect.',
        multi: true,
        options: [
          { id: 'nischitartha', emoji: '🤝', name: 'Nischitartha / engagement', desc: 'The formal agreement between the families.', flags: { nischitartha: true } },
          { id: 'haldi', emoji: '💛', name: 'Haldi / arishina shastra', desc: 'Morning, at home, informal and very photographed.', flags: { haldi: true } },
          { id: 'mehendi', emoji: '🤲', name: 'Mehendi', desc: 'An afternoon for the bride’s side.', flags: { mehendi: true } },
          { id: 'sangeet', emoji: '💃', name: 'Sangeet', desc: 'Dance, music, and both families performing at each other.', flags: { sangeet: true } },
          { id: 'muhurtham', emoji: '🔥', name: 'Muhurtham / the wedding itself', desc: 'The rite. Fixed to the clock, everything else arranged around it.', flags: { muhurtham: true } },
          { id: 'reception', emoji: '🥂', name: 'Reception', desc: 'The evening, the stage, and the long queue to the couple.', flags: { reception: true } },
        ],
      }),
      ask({
        id: 'tradition',
        title: 'Tradition',
        emoji: '🪔',
        question: 'Which tradition are we following?',
        why: 'It decides the purohit, the rites, the music at the muhurtham and — more than anything else — the food. A Kannada Brahmin wedding lunch and a Malabar sadhya are not variations of each other.',
        options: [
          { id: 'kannada', emoji: '🟡', name: 'Kannada', desc: 'Brahmin, Lingayat, Vokkaliga or another Karnataka tradition.', flags: { south: true } },
          { id: 'tamil_telugu', emoji: '🟠', name: 'Tamil or Telugu', desc: 'Iyer, Iyengar, Reddy, Kamma and others.', flags: { south: true } },
          { id: 'north', emoji: '🔴', name: 'North Indian', desc: 'Phere, baraat, and a very different evening.', flags: { north: true } },
          { id: 'other_faith', emoji: '⚪', name: 'Christian, Muslim, or another faith', desc: 'Tell your coordinator and we will arrange exactly what is needed.', flags: { other_faith: true } },
          { id: 'mixed', emoji: '🌈', name: 'Two traditions together', desc: 'Both sets of rites, both menus, one day. We have done this before.', flags: { south: true, north: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting the rites?',
        why: 'A wedding purohit does the pre-wedding poojas, the muhurtham and the post-wedding rites, over two or three days. This is not a one-morning booking.',
        packIds: ['priest_wedding', 'priest_homam', 'priest_home_pooja'],
        recommend: { close: 'priest_homam', family: 'priest_wedding', full_house: 'priest_wedding', grand: 'priest_wedding' },
        skipLabel: 'The family purohit is doing it',
        showIf: ctx => ctx.flags.muhurtham,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'All the samagri, across the days?',
        why: 'Every function has its own list, and the lists arrive one at a time from three different people. Handled as one order, it stops being somebody’s full-time job for a week.',
        packIds: ['pooja_homam_kit', 'pooja_basic', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
        showIf: ctx => ctx.flags.muhurtham,
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram or shehnai for the muhurtham?',
        why: 'At a South Indian wedding this is not decoration — the vadya marks each stage of the rite, and the elders will know immediately if it is a recording.',
        packIds: ['nadaswaram_troupe', 'nadaswaram_pair', 'shehnai_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.muhurtham,
      }),
      svc({
        serviceId: 'mehendi',
        title: 'Mehendi',
        emoji: '🤲',
        question: 'Bridal mehendi, and artists for the guests?',
        why: 'Bridal mehendi takes five to seven hours. If there is only one artist, the aunts are queuing until midnight and it becomes the story of the day.',
        packIds: ['mehendi_bridal', 'mehendi_premium', 'mehendi_guest'],
        recommend: { close: 'mehendi_bridal', family: 'mehendi_bridal', full_house: 'mehendi_premium', grand: 'mehendi_premium' },
        skipLabel: 'Already arranged',
        showIf: ctx => ctx.flags.mehendi || ctx.flags.haldi,
      }),
      svc({
        serviceId: 'makeup',
        title: 'Bridal makeup',
        emoji: '💄',
        question: 'Who is doing the bride’s makeup?',
        why: 'A multi-day package matters more than the day rate: the same artist across haldi, muhurtham and reception means one look that develops, and no four-a.m. panic finding somebody for day two.',
        packIds: ['makeup_bridal', 'makeup_multi_day', 'makeup_groom', 'makeup_guest'],
        recommend: { close: 'makeup_bridal', family: 'makeup_bridal', full_house: 'makeup_multi_day', grand: 'makeup_multi_day' },
        skipLabel: 'Already booked',
      }),
      svc({
        serviceId: 'bridal_wear',
        title: 'Draping',
        emoji: '👰',
        question: 'Help with draping and dressing?',
        why: 'A nine-yard madisaru or a lehenga at four in the morning is not a thing to be improvising, and the person who normally does it is also a guest.',
        packIds: ['bridal_draping', 'bridal_stylist', 'bridal_trousseau'],
        recommend: { family: 'bridal_draping', full_house: 'bridal_draping', grand: 'bridal_stylist' },
        skipLabel: 'The family will manage',
      }),
      svc({
        serviceId: 'baraat',
        title: 'Baraat',
        emoji: '🎺',
        question: 'Is there a procession?',
        why: 'A baraat needs a band, light poles, a route, and somebody managing traffic. Booked late, you get whichever band was free.',
        packIds: ['baraat_basic', 'baraat_full'],
        recommend: { family: 'baraat_basic', full_house: 'baraat_full', grand: 'baraat_full' },
        skipLabel: 'No procession',
        showIf: ctx => ctx.flags.north || ctx.flags.mixed,
      }),
      svc({
        serviceId: 'wedding_car',
        title: 'The car',
        emoji: '🚗',
        question: 'How are the couple arriving and leaving?',
        why: 'The departure photograph is one of the three everybody prints, and a decorated car costs less than most people assume.',
        packIds: ['car_sedan', 'car_luxury', 'car_vintage', 'car_ghodi'],
        recommend: { close: 'car_sedan', family: 'car_sedan', full_house: 'car_luxury', grand: 'car_vintage' },
        skipLabel: 'We have it covered',
      }),
      svc({
        serviceId: 'choreography',
        title: 'Sangeet',
        emoji: '🕺',
        question: 'Is somebody choreographing the sangeet?',
        why: 'Four rehearsals turn "the cousins will do something" into the twenty minutes everybody talks about afterwards.',
        packIds: ['choreo_couple', 'choreo_family', 'choreo_full_show'],
        recommend: { close: 'choreo_couple', family: 'choreo_family', full_house: 'choreo_family', grand: 'choreo_full_show' },
        skipLabel: 'The family is sorting it',
        showIf: ctx => ctx.flags.sangeet,
      }),
      svc({
        serviceId: 'dj',
        title: 'Sound',
        emoji: '🎵',
        question: 'What is the sound and lighting rig?',
        why: 'A sangeet in a hall of four hundred needs a production rig, not a party speaker. Under-specified sound is the most common regret at a wedding.',
        packIds: ['dj_standard', 'dj_premium', 'dj_house'],
        recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_premium', grand: 'dj_premium' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.sangeet || ctx.flags.reception,
      }),
      svc({
        serviceId: 'live_music',
        title: 'Live music',
        emoji: '🎻',
        question: 'Live music at the reception?',
        why: 'A live band or a ghazal set makes a reception feel like an evening rather than a queue with a soundtrack.',
        packIds: ['music_band', 'music_ghazal_sufi', 'music_classical_duo', 'music_dj_band'],
        recommend: { full_house: 'music_band', grand: 'music_dj_band' },
        skipLabel: 'A DJ is enough',
        showIf: ctx => ctx.flags.reception,
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Who is running the programme?',
        why: 'Somebody has to tell four hundred people when to eat, when to come to the stage, and when the couple are cutting the cake. Without them it is chaos with good food.',
        packIds: ['emcee_full', 'emcee_standard', 'emcee_corporate'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_full', grand: 'emcee_full' },
        skipLabel: 'A family member is doing it',
        showIf: ctx => ctx.flags.sangeet || ctx.flags.reception,
      }),
      dining({
        why: 'A muhurtham lunch is a leaf pankti in sittings. A reception is round tables or a standing buffet. Most weddings need both, on the same day, and that is a plan rather than an accident.',
        packIds: ['dining_leaf', 'dining_round', 'dining_buffet_standing', 'dining_lounge', 'dining_floor'],
        recommend: { close: 'dining_leaf', family: 'dining_leaf', full_house: 'dining_round', grand: 'dining_round' },
      }),
      photography({
        question: 'Who is photographing the wedding?',
        why: 'The single largest line on most wedding bills, and the only one you still have in thirty years. Multi-day coverage costs less than booking three separate photographers, and it looks like one wedding rather than three.',
        packIds: ['photo_wedding_full', 'photo_full_day', 'photo_prewedding', 'photo_half_day'],
        recommend: { close: 'photo_full_day', family: 'photo_full_day', full_house: 'photo_wedding_full', grand: 'photo_wedding_full' },
      }),
      videography({
        why: 'The film is what gets watched. The album gets opened twice.',
        packIds: ['video_wedding_cinema', 'video_cinematic', 'video_event', 'video_invite'],
        recommend: { close: 'video_cinematic', family: 'video_cinematic', full_house: 'video_wedding_cinema', grand: 'video_wedding_cinema' },
      }),
      svc({
        serviceId: 'drone',
        title: 'Aerial',
        emoji: '🚁',
        question: 'Aerial coverage?',
        why: 'One shot — the whole mantapa, the whole family, from above — that no other camera can take. Needs permission at some venues, which we handle.',
        packIds: ['drone_basic', 'drone_full'],
        recommend: { full_house: 'drone_basic', grand: 'drone_full' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'livestream',
        title: 'Streaming',
        emoji: '📡',
        question: 'Streaming for family who cannot travel?',
        why: 'There is always somebody — a grandmother who cannot fly, a brother who could not get leave. A private link is the difference between them watching and them being told about it.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single', grand: 'stream_multi' },
        skipLabel: 'Everybody is coming',
      }),
      svc({
        serviceId: 'transport',
        title: 'Guest travel',
        emoji: '🚌',
        question: 'How are out-of-town guests getting there?',
        why: 'Fifty relatives at a hotel four kilometres from the mantapa, at six in the morning, is either one shuttle or fifteen phone calls.',
        packIds: ['trans_bus', 'trans_tempo', 'trans_cabs'],
        recommend: { full_house: 'trans_bus', grand: 'trans_bus' },
        skipLabel: 'Everybody is local',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Guest care',
        emoji: '🙋',
        question: 'Somebody looking after the guests?',
        why: 'On the day, both families are inside the rite. Ushers, a guest desk and a cloakroom are what stop arriving relatives standing in the car park.',
        packIds: ['hosp_ushers', 'hosp_guest_manager', 'hosp_cloakroom'],
        multi: true,
        recommend: { family: 'hosp_ushers', full_house: 'hosp_ushers', grand: 'hosp_guest_manager' },
        skipLabel: 'The cousins are handling it',
      }),
      svc({
        serviceId: 'fireworks',
        title: 'The finish',
        emoji: '🎆',
        question: 'Anything for the entry or the send-off?',
        why: 'Cold pyro for the couple’s entry, or lanterns as they leave. Fifteen seconds, and it is the clip that travels.',
        packIds: ['fire_cold_pyro', 'fire_outdoor', 'fire_lantern'],
        recommend: { full_house: 'fire_cold_pyro', grand: 'fire_outdoor' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.reception,
      }),
      returnGifts({
        why: 'Thamboola for every guest at the muhurtham, and something better for the wedding party. Both are expected, and running out is remembered.',
        packIds: ['gift_mid', 'gift_premium', 'gift_budget'],
        recommend: { close: 'gift_mid', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'The printed card is part of the asking in this market — you hand it over in person to the people who matter. Digital goes to everybody else, and to the groups.' }),
      svc({
        serviceId: 'signage',
        title: 'Signage',
        emoji: '🪧',
        question: 'Welcome boards and seating signs?',
        why: 'A convention centre with three functions on the same day and no sign saying which hall is yours is a genuine problem, not a nicety.',
        packIds: ['sign_welcome', 'sign_seating'],
        multi: true,
        recommend: { full_house: 'sign_welcome', grand: 'sign_seating' },
        skipLabel: 'Not needed',
      }),
      ...groundwork,
      cleanup({ why: 'Three days of functions in a hall you have to hand back by noon. This is a crew, not a favour.' }),
    ],
  },

  /* ───────────────────── ENGAGEMENT ─────────────────────────────── */
  engagement: {
    id: 'engagement',
    opening: 'Nischitartha. Let’s arrange the day the families agree.',
    promise: 'Around ten questions, all skippable. The price comes once at the end.',
    cuisineLead: ['karnataka', 'north_indian', 'tamil', 'andhra', 'multi_cuisine'],
    vegDefault: true,
    venue: anywhere({
      why: 'An engagement is the first event both families attend together, so the room matters more than its size. It also sets what we need to bring — a lawn in April needs fans and a generator.',
      packIds: ['venue_community', 'venue_banquet', 'venue_resort', 'venue_lawn'],
    }),
    core: ctx => (ctx.flags.ritual && !ctx.flags.party
      ? ['priest', 'pooja', 'nadaswaram', 'dining', 'photography', 'return_gifts']
      : ctx.flags.ritual
        ? ['priest', 'makeup', 'cake', 'dining', 'photography', 'return_gifts']
        : ['makeup', 'cake', 'dining', 'dj', 'photography', 'return_gifts']),
    decor: decorLevels(),
    chapters: [
      ask({
        id: 'format',
        title: 'Format',
        emoji: '💍',
        question: 'What form is it taking?',
        why: 'A nischitartha with the rites and a ring-exchange party are different afternoons with different guest lists, and the food and décor follow from which one this is.',
        options: [
          { id: 'ritual', emoji: '🪔', name: 'Traditional nischitartha', desc: 'Purohit, the exchange of trays, the lagna patrike read out.', flags: { ritual: true, party: false } },
          { id: 'ring', emoji: '💫', name: 'A ring ceremony', desc: 'Short and modern — the rings, photographs, and a meal.', flags: { ritual: false, party: true } },
          { id: 'both', emoji: '🌗', name: 'Both — rites in the morning, party after', desc: 'The elders get the tradition, the friends get the evening.', flags: { ritual: true, party: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who conducts the nischitartha?',
        why: 'He reads the lagna patrike, fixes the wedding muhurtham in front of both families, and blesses the exchange. This is the appointment the whole wedding date depends on.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'The family purohit is coming',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Trays & samagri',
        emoji: '🪔',
        question: 'The exchange trays and samagri?',
        why: 'Thamboola, fruit, blouse pieces, sweets, the arishina-kumkuma — arranged on trays, counted, and carried in. Both sides are watching, and both sides count.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the exchange?',
        why: 'Marks the moment the two families formally agree. Recorded music at a nischitartha reads as a shortcut.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe', 'shehnai_pair'],
        recommend: { family: 'nadaswaram_pair', full_house: 'nadaswaram_pair', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'makeup',
        title: 'Getting ready',
        emoji: '💄',
        question: 'Makeup and styling for the couple?',
        why: 'These photographs go on the wedding invitation. It is worth an artist rather than a cousin.',
        packIds: ['makeup_bridal', 'makeup_guest', 'makeup_groom'],
        recommend: { close: 'makeup_guest', family: 'makeup_bridal', full_house: 'makeup_bridal', grand: 'makeup_bridal' },
        skipLabel: 'Already arranged',
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake for the evening?',
        why: 'Common now at ring ceremonies, and it gives the evening a moment that is not a queue.',
        packIds: ['cake_cream_1kg', 'cake_tiered', 'cake_dessert_table'],
        recommend: { family: 'cake_cream_1kg', full_house: 'cake_tiered' },
        skipLabel: 'No cake',
        showIf: ctx => ctx.flags.party,
      }),
      dining({ why: 'A nischitartha lunch is seated and traditional. A ring-ceremony evening works standing.', recommend: { close: 'dining_leaf', family: 'dining_leaf', full_house: 'dining_round', grand: 'dining_round' } }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Music through the function?',
        why: 'A classical duo suits a nischitartha; a band suits an engagement party. They are not interchangeable.',
        packIds: ['music_classical_duo', 'music_band', 'music_ghazal_sufi'],
        recommend: { family: 'music_classical_duo', full_house: 'music_classical_duo', grand: 'music_band' },
        skipLabel: 'No live music',
      }),
      svc({
        serviceId: 'dj',
        title: 'DJ',
        emoji: '🎵',
        question: 'A DJ for the evening?',
        why: 'If the friends are coming after the elders leave, this is what the second half is.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        recommend: { full_house: 'dj_standard', grand: 'dj_standard' },
        skipLabel: 'No DJ',
        showIf: ctx => ctx.flags.party,
      }),
      photography({
        question: 'Who is photographing it?',
        why: 'The engagement photographs are what go on the wedding invitation and the save-the-date. They are working images as much as memories.',
        packIds: ['photo_full_day', 'photo_half_day', 'photo_prewedding'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'Often cut into the save-the-date film, so it pays for itself twice.', packIds: ['video_event', 'video_cinematic', 'video_invite'] }),
      returnGifts({ why: 'Thamboola for the guests, and something better for the other family. Both sides are watching this one closely.', packIds: ['gift_mid', 'gift_premium', 'gift_budget'], recommend: { family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' } }),
      invitations({ why: 'Usually close family only, so a printed card for the elders and a message for the rest.' }),
      ...groundwork,
      cleanup({ why: 'Cleared the same evening, particularly if this is at home.' }),
    ],
  },

  /* ────────────────────── SANGEET ───────────────────────────────── */
  sangeet: {
    id: 'sangeet',
    opening: 'The night before. Let’s make it the one people remember.',
    promise: 'Around ten questions. Nothing priced until you have built the whole evening.',
    cuisineLead: ['north_indian', 'mughlai', 'indo_chinese', 'chaat_street', 'multi_cuisine'],
    vegDefault: false,
    venue: anywhere({
      why: 'A sangeet needs a floor, a sound limit that lets you use it, and somewhere the rehearsals can happen the day before. Not every hall gives you all three, and we check before booking.',
      homeDesc: 'The terrace, the compound or the clubhouse. Works beautifully up to about a hundred, and the noise rules are yours rather than a hall manager’s.',
      packIds: ['venue_banquet', 'venue_resort', 'venue_lawn', 'venue_community'],
    }),
    core: ctx => {
      if (ctx.flags.production) return ['choreography', 'dj', 'emcee', 'entertainment', 'dining', 'photography', 'videography']
      if (ctx.flags.bar) return ['dj', 'bar', 'dining', 'emcee', 'photography']
      return ['choreography', 'dj', 'dining', 'photography']
    },
    decor: decorLevels(),
    chapters: [
      ask({
        id: 'format',
        title: 'Format',
        emoji: '💃',
        question: 'What kind of night is it?',
        why: 'A family dance evening and a full production with a run sheet want different rigs, different stages and different budgets — and the difference is mostly the sound and the lighting, not the food.',
        options: [
          { id: 'family', emoji: '🏠', name: 'A family dance night', desc: 'Both sides perform, everybody joins in at the end.', flags: { production: false } },
          { id: 'cocktail', emoji: '🍹', name: 'Cocktail evening with a DJ', desc: 'Less performing, more dancing, a bar and a long night.', flags: { production: false, bar: true } },
          { id: 'production', emoji: '🎬', name: 'A full production', desc: 'Run sheet, rehearsals, LED wall, an emcee, and a real show.', flags: { production: true } },
        ],
      }),
      svc({
        serviceId: 'choreography',
        title: 'Choreography',
        emoji: '🕺',
        question: 'Who is choreographing?',
        why: 'The difference between four rehearsed minutes and twenty minutes of cousins arguing on stage. Book it early — the good ones go months ahead.',
        packIds: ['choreo_family', 'choreo_couple', 'choreo_full_show'],
        recommend: { close: 'choreo_couple', family: 'choreo_family', full_house: 'choreo_family', grand: 'choreo_full_show' },
        skipLabel: 'The family is handling it',
      }),
      svc({
        serviceId: 'dj',
        title: 'Sound & lights',
        emoji: '🎵',
        question: 'What is the rig?',
        why: 'The one thing that decides whether a sangeet works. Undersized sound in a hall of three hundred means the back half cannot hear the song they are meant to be dancing to.',
        packIds: ['dj_premium', 'dj_standard', 'dj_house'],
        recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_premium', grand: 'dj_premium' },
        skipLabel: 'The venue provides it',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Who is running the show?',
        why: 'Somebody has to call the acts, fill the gaps while the next group changes, and keep it under two hours. Without them a sangeet runs to midnight and loses the room.',
        packIds: ['emcee_full', 'emcee_standard'],
        recommend: { close: 'emcee_standard', family: 'emcee_standard', full_house: 'emcee_full', grand: 'emcee_full' },
        skipLabel: 'A cousin is doing it',
      }),
      svc({
        serviceId: 'entertainment',
        title: 'The act',
        emoji: '💫',
        question: 'A professional act as well?',
        why: 'One booked act in the middle raises the whole evening and gives the family performers something to follow rather than compete with.',
        packIds: ['ent_dance_troupe', 'ent_cheer_led', 'ent_stilt_welcome'],
        recommend: { full_house: 'ent_dance_troupe', grand: 'ent_cheer_led' },
        skipLabel: 'The family is the entertainment',
      }),
      svc({
        serviceId: 'folk',
        title: 'Folk',
        emoji: '🪗',
        question: 'A folk troupe for the welcome?',
        why: 'Dollu kunitha or a bhangra troupe at the door does more for arrivals than any amount of décor.',
        packIds: ['folk_south', 'folk_north', 'folk_mascot'],
        recommend: { full_house: 'folk_south', grand: 'folk_north' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'bar',
        title: 'Drinks',
        emoji: '🍹',
        question: 'What is being served to drink?',
        why: 'A mocktail counter serves everybody, including the half of the room that does not drink and usually gets a jug of water.',
        packIds: ['bar_mocktail', 'bar_full', 'bar_flair'],
        recommend: { family: 'bar_mocktail', full_house: 'bar_mocktail', grand: 'bar_full' },
        skipLabel: 'The caterer is handling drinks',
      }),
      dining({ why: 'A sangeet is standing and moving. Round tables kill the floor you need for dancing.', recommend: { close: 'dining_buffet_standing', family: 'dining_buffet_standing', full_house: 'dining_buffet_standing', grand: 'dining_lounge' } }),
      photography({
        why: 'The most photogenic function of the wedding and the one most often under-covered, because everybody assumes the wedding photographer is already there.',
        packIds: ['photo_full_day', 'photo_half_day', 'photo_wedding_full'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_wedding_full' },
      }),
      videography({ why: 'The performances. This is the footage that actually gets rewatched.', packIds: ['video_cinematic', 'video_event', 'video_wedding_cinema'] }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A 360 booth?',
        why: 'At a sangeet a spinner booth is not a novelty — it is the thing every guest posts that night, which is half the point of the evening.',
        packIds: ['booth_360', 'booth_mirror', 'booth_classic'],
        recommend: { family: 'booth_classic', full_house: 'booth_360', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      ...groundwork,
      cleanup({ why: 'A sangeet ends late and the muhurtham is at dawn. Somebody clears it overnight.' }),
    ],
  },

  /* ─────────────── THREAD CEREMONY / UPANAYANAM ─────────────────── */
  thread_ceremony: {
    id: 'thread_ceremony',
    opening: 'Upanayanam. A long morning — let’s arrange it properly.',
    promise: 'Everything below is built around the muhurtham. No price until the end.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'jain_satvik', 'andhra'],
    vegDefault: true,
    venue: {
      question: 'Where is the upanayanam?',
      why: 'A homa runs for two to three hours and needs shelter, still air and somewhere the smoke can go. That rules out the open-lawn end of a generic venue list, which is why this one is shorter.',
      options: [
        atHome('The house or the compound, with a pandal over the homa kunda. The most common answer, and the one most families’ traditions assume.'),
        atTemple('The temple hall your family uses. We confirm the slot, coordinate with their purohit and carry everything in and out.'),
        alreadyBooked(),
      ],
      packIds: ['venue_community', 'venue_banquet'],
    },
    core: ['priest', 'pooja', 'nadaswaram', 'dining', 'photography', 'return_gifts'],
    decor: decorOwn({
      question: 'How is the pandal being set up?',
      why: 'An upanayanam runs for three hours around a homa kunda, and everything decorated is within about ten feet of it. The rest of the space needs shade and seating, not styling.',
      options: [
        {
          id: 'ritual',
          emoji: '🪷',
          name: 'The homa space and the entrance',
          desc: 'The kunda area laid out and decorated, seating mats for the family, and a toran and rangoli at the door.',
          includes: ['Homa kunda area decorated and laid out', 'Seating mats and family arrangement', 'Mango-leaf toran and rangoli at the entrance', 'Setup before the muhurtham'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'pandal',
          emoji: '⛺',
          name: 'A decorated pandal',
          desc: 'A shamiana over the rite and the guests, draped and floral, with the dining area styled for the leaf meal.',
          includes: ['Draped pandal over the rite and seating', 'Floral work at the kunda and the entrance', 'Dining area styling for the leaf meal', 'Lighting through the pandal'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
        {
          id: 'full',
          emoji: '✨',
          name: 'Full traditional setup',
          desc: 'For an upanayanam in a mantapa with three hundred guests — designed floral work, entrance installation and every table.',
          includes: ['Designed floral work across the mantapa', 'Entrance installation and signage', 'Full seating and table styling', 'Designer visit before the day'],
          levelId: 'signature',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'The mantapa decorates it, or the family is',
    }),
    chapters: [
      ask({
        id: 'shape',
        title: 'The rite',
        emoji: '📿',
        question: 'How is it being performed?',
        why: 'A single upanayanam and two brothers together are quite different mornings, and the kashi yatra procession adds an hour and a route to manage.',
        options: [
          { id: 'single', emoji: '👦', name: 'One boy', desc: 'The usual form — homa, the thread, the bhiksha.', flags: { yatra: false } },
          { id: 'multiple', emoji: '👦👦', name: 'Brothers or cousins together', desc: 'Two or three at once. Longer, and more samagri.', flags: { yatra: false, multiple: true } },
          { id: 'with_yatra', emoji: '🚶', name: 'With the kashi yatra procession', desc: 'The walk out with the umbrella and the stick, and the uncle who brings him back.', flags: { yatra: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Vadhyar',
        emoji: '🙏',
        question: 'Who is conducting the upanayanam?',
        why: 'A long rite with a homa, the gayatri upadesha, and the bhiksha. It needs a vadhyar who does these regularly and two assistants, not one man rushing.',
        packIds: ['priest_homam', 'priest_wedding', 'priest_home_pooja'],
        recommend: { close: 'priest_homam', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_wedding' },
        skipLabel: 'The family vadhyar is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the homa kunda?',
        why: 'One of the longest lists in the tradition — the kunda, the samidha, the yajnopavita, the danda, the deer skin, the new clothes. Sourced against your vadhyar’s own list.',
        packIds: ['pooja_homam_kit', 'pooja_basic', 'pooja_annadanam'],
        recommend: { close: 'pooja_homam_kit', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram through the rite?',
        why: 'It plays through the homa and leads the kashi yatra out of the hall. This is one of the few functions where it is genuinely part of the ceremony rather than atmosphere.',
        packIds: ['nadaswaram_troupe', 'nadaswaram_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not needed',
      }),
      dining({
        why: 'A madi meal, on a leaf, in sittings — often two or three sittings because the rite runs long and people eat as they are free.',
        packIds: ['dining_leaf', 'dining_floor', 'dining_round'],
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      photography({
        question: 'Who is photographing it?',
        why: 'A rite the boy will not remember and will want to see. The bhiksha, the thread, the whole family around him.',
        packIds: ['photo_full_day', 'photo_half_day'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'The gayatri upadesha itself, recorded, is something families keep for generations.' }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Relatives who cannot travel?',
        why: 'An upanayanam is on a weekday morning at an hour set by the almanac. Half the family cannot make it, and they mind.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single' },
        skipLabel: 'Everybody is coming',
      }),
      svc({
        serviceId: 'bhajan',
        title: 'Devotional',
        emoji: '🎼',
        question: 'A devotional sitting after the rite?',
        why: 'Fills the hour between the homa ending and lunch being ready, which is when a hall otherwise empties.',
        packIds: ['bhajan_carnatic', 'bhajan_mandali'],
        recommend: { full_house: 'bhajan_carnatic', grand: 'bhajan_carnatic' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Welcoming',
        emoji: '🙋',
        question: 'Somebody to receive the guests?',
        why: 'The family is inside the homa from five in the morning. Everybody arriving after that needs somebody to meet them.',
        packIds: ['hosp_ushers', 'hosp_guest_manager'],
        recommend: { full_house: 'hosp_ushers', grand: 'hosp_ushers' },
        skipLabel: 'Cousins will do it',
      }),
      returnGifts({
        why: 'Thamboola, arishina-kumkuma and a small silver item for the close family. This is a rite where the elders notice what was given.',
        packIds: ['gift_mid', 'gift_budget', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Printed for the elders and the relatives from out of town. Digital for everybody else.' }),
      ...groundwork,
      cleanup({ why: 'Homa ash, leaves and three sittings’ worth of plates, cleared while the family is still receiving people.' }),
    ],
  },

  /* ────────────────────── SEEMANTHAM ────────────────────────────── */
  seemantham: {
    id: 'seemantham',
    opening: 'Seemantham. Let’s plan the afternoon around her.',
    promise: 'Short and gentle. No price until you have chosen everything.',
    cuisineLead: ['tamil', 'andhra', 'karnataka', 'udupi', 'jain_satvik'],
    vegDefault: true,
    venue: {
      question: 'Where is the seemantham?',
      why: 'Traditionally at the mother-to-be’s parents’ house, and practically, wherever she is most comfortable sitting for three hours in her seventh or eighth month. That is the whole reason this list is short.',
      options: [
        atHome('Her parents’ house or your own, which is where the great majority of these happen.', 'At home — usually her parents’ house'),
        alreadyBooked(),
      ],
      packIds: ['venue_community', 'venue_banquet'],
      footnote: 'No lawn or resort here on purpose — an eight-month pregnancy and an outdoor afternoon function do not belong on the same page.',
    },
    core: ctx => (ctx.flags.bangles
      ? ['priest', 'pooja', 'makeup', 'mehendi', 'dining', 'photography', 'return_gifts']
      : ['priest', 'pooja', 'makeup', 'dining', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the room being set up?',
      why: 'She sits in one place for three hours and every photograph is taken there. That seat and what is behind it is the whole decoration; the rest of the house is a house.',
      options: [
        {
          id: 'seat',
          emoji: '🌺',
          name: 'The seat and a floral backdrop',
          desc: 'A decorated chair or swing, a flower backdrop, the arati and bangle table, and the entrance.',
          includes: ['Decorated seat or jhula', 'Floral backdrop, about 8 ft', 'Arati and bangle table styling', 'Entrance toran and rangoli'],
          levelId: 'home_touch',
          themeId: 'traditional_red_gold',
        },
        {
          id: 'room',
          emoji: '🎀',
          name: 'The whole room',
          desc: 'The seat and backdrop, plus hanging florals, guest seating styled, and lighting warm enough to photograph in.',
          includes: ['Everything in the seat setup', 'Hanging floral or drape work', 'Guest seating and table styling', 'Warm ambient lighting'],
          levelId: 'classic',
          themeId: 'traditional_red_gold',
        },
      ],
      skipLabel: 'The family is doing the decoration',
    }),
    chapters: [
      ask({
        id: 'style',
        title: 'The rite',
        emoji: '🪷',
        question: 'What form is it taking?',
        why: 'Seemantham, valaikappu and the modern shower are three different afternoons, and many families now run two of them together. It changes the guest list, the food and the music.',
        options: [
          { id: 'seemantham', emoji: '📿', name: 'Seemantham with the rites', desc: 'Purohit, the homa, the blessings of the elders.', flags: { ritual: true, bangles: false } },
          { id: 'valaikappu', emoji: '💚', name: 'Valaikappu / bangle ceremony', desc: 'Green and red bangles, the oonjal, the women of both families.', flags: { ritual: false, bangles: true } },
          { id: 'both', emoji: '🌸', name: 'Both together', desc: 'The rites in the morning, the bangles and the lunch after.', flags: { ritual: true, bangles: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Is a purohit conducting the rites?',
        why: 'A seemantham homa is performed in the seventh or eighth month at a muhurtham. Everything else in the day is arranged after that hour is fixed.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'The family purohit is coming',
        showIf: ctx => ctx.flags.ritual,
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri, bangles and thamboola?',
        why: 'Glass bangles in the right two colours for every woman who comes, blouse pieces, arishina-kumkuma, betel and fruit. Counted, bagged and ready — because running short of bangles is a real problem at a valaikappu.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family has bought it all',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the blessings?',
        why: 'Played as she is seated and the elders come forward one by one. It gives the afternoon its shape.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe'],
        recommend: { family: 'nadaswaram_pair', full_house: 'nadaswaram_pair', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'makeup',
        title: 'Getting ready',
        emoji: '💄',
        question: 'Help with the saree and her hair?',
        why: 'She will be seated and photographed for three hours in a heavy silk saree at eight months. Somebody who does this professionally makes the day considerably easier for her.',
        packIds: ['makeup_guest', 'makeup_bridal'],
        recommend: { close: 'makeup_guest', family: 'makeup_guest', full_house: 'makeup_bridal', grand: 'makeup_bridal' },
        skipLabel: 'The family will help',
      }),
      svc({
        serviceId: 'mehendi',
        title: 'Mehendi',
        emoji: '🤲',
        question: 'Mehendi for her and the guests?',
        why: 'Traditional at a valaikappu, and it keeps the room occupied while the kitchen finishes.',
        packIds: ['mehendi_bridal', 'mehendi_guest', 'mehendi_premium'],
        recommend: { family: 'mehendi_guest', full_house: 'mehendi_bridal', grand: 'mehendi_premium' },
        skipLabel: 'No mehendi',
      }),
      dining({ why: 'A seemantham lunch is a full leaf meal, served seated, with the sweets the tradition calls for. It is the part the aunts will discuss afterwards.', recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_leaf' } }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Music through the afternoon?',
        why: 'A veena or a Carnatic sitting under the conversation. Nothing amplified — the room is talking, and it should be able to.',
        packIds: ['music_classical_duo', 'music_band'],
        recommend: { family: 'music_classical_duo', full_house: 'music_classical_duo', grand: 'music_classical_duo' },
        skipLabel: 'No live music',
      }),
      photography({
        question: 'Who is photographing it?',
        why: 'The last set of photographs of her before the baby, surrounded by every woman in both families. There is no retake.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_prewedding'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({ why: 'The blessings, mostly — the elders speaking to her one at a time.' }),
      returnGifts({
        why: 'Bangles, blouse pieces and thamboola for every woman who came. In this tradition this is not a courtesy, it is the ceremony.',
        packIds: ['gift_mid', 'gift_premium', 'gift_budget'],
        recommend: { close: 'gift_mid', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Mostly phone calls and a digital card in this one — it is a close-family function.' }),
      ...groundwork,
      cleanup({ why: 'Flowers, leaves and lunch for sixty, cleared before evening.' }),
    ],
  },

  /* ─────────────────────── RETIREMENT ───────────────────────────── */
  retirement: {
    id: 'retirement',
    opening: 'Thirty-five years of work. Let’s give it an evening.',
    promise: 'Around nine questions. The price arrives once, at the end.',
    cuisineLead: ['karnataka', 'north_indian', 'multi_cuisine', 'udupi', 'continental'],
    vegDefault: true,
    venue: anywhere({
      why: 'A retirement runs one of two ways — the office does it, or the family does it — and the room says which. Both are worth doing properly, and they need different things.',
      homeDesc: 'The house or the apartment clubhouse, for a family send-off rather than an office one.',
      packIds: ['venue_banquet', 'venue_community', 'venue_resort', 'venue_lawn'],
      extra: [atOffice('The office, the auditorium or the department floor — the send-off colleagues organise, with the family invited.')],
    }),
    core: ctx => (ctx.flags.formal
      ? ['memory_wall', 'emcee', 'av_setup', 'dining', 'photography', 'gifting']
      : ['memory_wall', 'dining', 'cake', 'photography', 'gifting']),
    decor: decorOwn({
      question: 'How is the room being set up?',
      why: 'A send-off needs a wall people stand at, a front of the room to be felicitated in, and lighting that does not make the photographs orange. It does not need a mandap.',
      options: [
        {
          id: 'simple',
          emoji: '🖼️',
          name: 'The tribute wall and the front',
          desc: 'The photo wall set up properly, a backdrop at the front for the felicitation, and the entrance done.',
          includes: ['Tribute wall installation and mounting', 'Backdrop at the front of the room', 'Entrance and welcome board', 'Setup and clearing by our team'],
          levelId: 'home_touch',
          themeId: 'white_gold',
        },
        {
          id: 'styled',
          emoji: '🎊',
          name: 'The room styled around it',
          desc: 'The wall and the front, plus table styling, stage lighting and a photo corner for the colleagues.',
          includes: ['Everything in the tribute setup', 'Table centrepieces and linen', 'Stage and ambient lighting', 'Photo corner for group photographs'],
          levelId: 'classic',
          themeId: 'white_gold',
        },
      ],
      skipLabel: 'The venue or the office is handling it',
    }),
    chapters: [
      ask({
        id: 'host',
        title: 'Who',
        emoji: '🎓',
        question: 'Who is hosting this?',
        why: 'An office farewell and a family celebration have almost nothing in common — different room, different speeches, different food, and a completely different length.',
        options: [
          { id: 'office', emoji: '💼', name: 'The office', desc: 'Colleagues, a felicitation, and everybody home by nine.', flags: { formal: true, tribute: true } },
          { id: 'family', emoji: '🏡', name: 'The family', desc: 'Children, grandchildren, and the people they worked beside for decades.', flags: { formal: false, tribute: true } },
          { id: 'both', emoji: '🤝', name: 'Both together', desc: 'Colleagues and family in one room, which is the version that actually means something.', flags: { formal: true, tribute: true } },
        ],
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'The tribute',
        emoji: '🖼️',
        question: 'How are the years being shown?',
        why: 'This is the whole event. A timeline wall or a short film is what turns a dinner into a farewell, and it is the thing they will take home.',
        packIds: ['memwall_tribute_film', 'memwall_timeline', 'memwall_string'],
        recommend: { close: 'memwall_string', family: 'memwall_timeline', full_house: 'memwall_timeline', grand: 'memwall_tribute_film' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Who is running the evening?',
        why: 'A retirement is speeches. Without somebody holding the microphone and the order, either nobody speaks or eleven people do, at length.',
        packIds: ['emcee_standard', 'emcee_corporate', 'emcee_full'],
        recommend: { close: 'emcee_standard', family: 'emcee_standard', full_house: 'emcee_corporate', grand: 'emcee_corporate' },
        skipLabel: 'A colleague is doing it',
      }),
      svc({
        serviceId: 'av_setup',
        title: 'AV',
        emoji: '🖥️',
        question: 'Projector and microphones?',
        why: 'A tribute film with no screen, or four speeches with one hand-held mic passed around, is the most common way this evening goes flat.',
        packIds: ['av_basic', 'av_conference', 'av_hybrid'],
        recommend: { close: 'av_basic', family: 'av_basic', full_house: 'av_conference', grand: 'av_conference' },
        skipLabel: 'The venue provides it',
      }),
      dining({ why: 'Seated, at round tables. People at a retirement want to talk to the person next to them, not stand holding a plate.', recommend: { close: 'dining_round', family: 'dining_round', full_house: 'dining_round', grand: 'dining_round' } }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake for the cutting?',
        why: 'There is always one, and it is the photograph that goes on the office noticeboard.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_tiered'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_tiered', grand: 'cake_tiered' },
        skipLabel: 'No cake',
      }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Music through the evening?',
        why: 'Something from their years — ghazals, old film songs, a classical duo. It ages the room in the right direction.',
        packIds: ['music_classical_duo', 'music_ghazal_sufi', 'music_band'],
        recommend: { family: 'music_classical_duo', full_house: 'music_ghazal_sufi', grand: 'music_band' },
        skipLabel: 'No live music',
      }),
      photography({
        why: 'Colleagues of thirty years standing together for the last time. Somebody needs to be taking that.',
        packIds: ['photo_half_day', 'photo_full_day'],
      }),
      videography({ why: 'The speeches. That is the whole reason.', recommend: { family: 'video_event', full_house: 'video_event', grand: 'video_cinematic' } }),
      svc({
        serviceId: 'gifting',
        title: 'The gift',
        emoji: '🎀',
        question: 'Is there a presentation gift?',
        why: 'A hamper for the guest of honour, and something small for everybody who came. Both are usual.',
        packIds: ['hamper_luxury', 'hamper_corporate', 'hamper_festive'],
        recommend: { close: 'hamper_festive', family: 'hamper_luxury', full_house: 'hamper_luxury', grand: 'hamper_luxury' },
        skipLabel: 'Already arranged',
      }),
      returnGifts({ why: 'Something for the colleagues who came after a full day’s work.', packIds: ['gift_budget', 'gift_mid'], recommend: { full_house: 'gift_budget', grand: 'gift_mid' } }),
      invitations({ why: 'An email invite for the office, a printed card for the family elders.' }),
      ...groundwork,
      cleanup({ why: 'Cleared the same night — most offices book the hall by the hour.' }),
    ],
  },

  /* ─────────────────────── GRADUATION ───────────────────────────── */
  graduation: {
    id: 'graduation',
    opening: 'They finished. Let’s mark it properly.',
    promise: 'Eight or nine quick questions, and the price at the end.',
    cuisineLead: ['indo_chinese', 'north_indian', 'continental', 'chaat_street', 'multi_cuisine'],
    vegDefault: false,
    venue: anywhere({
      why: 'A graduation party is a family lunch and a friends’ evening pretending to be one event. Where it is decides which of the two it actually becomes.',
      homeDesc: 'The house, the terrace or the clubhouse — the cheapest and the loudest, in the good sense.',
      packIds: ['venue_community', 'venue_banquet', 'venue_lawn', 'venue_resort'],
    }),
    core: ctx => (ctx.flags.young
      ? ['cake', 'dining', 'dj', 'photobooth', 'photography']
      : ['cake', 'dining', 'memory_wall', 'photography', 'emcee']),
    decor: decorOwn({
      question: 'How is it being set up?',
      why: 'A graduation party is a wall to photograph the certificate against and a room the friends will stay in. Anything more elaborate is being bought for the parents rather than the graduate.',
      options: [
        {
          id: 'photo_wall',
          emoji: '🎓',
          name: 'A photo wall and lights',
          desc: 'A backdrop with the name and the year, props, festoon lighting, and the food table dressed.',
          includes: ['Name and year backdrop, about 8 ft', 'Graduation props for photographs', 'Festoon or fairy lighting', 'Food and cake table styling'],
          levelId: 'home_touch',
          themeId: 'white_gold',
        },
        {
          id: 'full',
          emoji: '✨',
          name: 'The room styled',
          desc: 'The backdrop, plus table styling, a photo corner and proper lighting. For a hall rather than a house.',
          includes: ['Designed backdrop and entrance arch', 'Photo corner installation', 'Table centrepieces and linen', 'Pathway and ambient lighting'],
          levelId: 'classic',
          themeId: 'rose_gold',
        },
      ],
      skipLabel: 'No decoration needed',
    }),
    chapters: [
      ask({
        id: 'level',
        title: 'What for',
        emoji: '🎓',
        question: 'What are we celebrating?',
        why: 'A tenth-standard result party and a return from a master’s abroad are different rooms with different guests, and the second one usually has a flight to work around.',
        options: [
          { id: 'school', emoji: '📗', name: 'Board results — 10th or 12th', desc: 'Family, neighbours, and everybody who tutored them.', flags: { young: true } },
          { id: 'college', emoji: '🎓', name: 'Degree or engineering', desc: 'Friends and family, and the first job to announce.', flags: { young: true } },
          { id: 'pg', emoji: '📘', name: 'Postgraduate or professional', desc: 'A longer road, and the people who funded it.', flags: { young: false } },
          { id: 'abroad', emoji: '✈️', name: 'Home from studying abroad', desc: 'Everybody wants to see them, and the date is fixed by a flight.', flags: { young: false, travel: true } },
        ],
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'What are we cutting?',
        why: 'A photo-print cake with the convocation photograph on it is the cheapest thing on this page and the one that gets posted.',
        packIds: ['cake_photo', 'cake_cream_1kg', 'cake_fondant', 'cake_dessert_table', 'cake_tiered'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_photo', full_house: 'cake_photo', grand: 'cake_tiered' },
        skipLabel: 'No cake',
      }),
      dining({ why: 'Standing and moving suits a graduation party — the point is that people mix.', recommend: { close: 'dining_buffet_standing', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' } }),
      svc({
        serviceId: 'dj',
        title: 'Music',
        emoji: '🎵',
        question: 'What is playing?',
        why: 'Their playlist, loud enough. This is one of the few functions where the guest of honour should choose the music.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        recommend: { close: 'dj_house', family: 'dj_house', full_house: 'dj_standard', grand: 'dj_standard' },
        skipLabel: 'A speaker is fine',
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'The years',
        emoji: '🖼️',
        question: 'A display of how they got here?',
        why: 'School photographs, the first day of college, the results. Parents cry at this and it is worth every rupee.',
        packIds: ['memwall_string', 'memwall_timeline', 'memwall_tribute_film'],
        recommend: { close: 'memwall_string', family: 'memwall_string', full_house: 'memwall_timeline', grand: 'memwall_timeline' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A booth with the cap and gown?',
        why: 'The props are the point. Every friend who comes wants the photograph with them in it.',
        packIds: ['booth_classic', 'booth_360', 'booth_mirror'],
        recommend: { close: 'booth_classic', family: 'booth_classic', full_house: 'booth_360', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      photography({
        why: 'The convocation photographs are formal and identical. These are the ones that look like them.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      svc({
        serviceId: 'ice_cream',
        title: 'Dessert',
        emoji: '🍦',
        question: 'A dessert counter?',
        why: 'At a young crowd’s party this outperforms a formal sweet course, and it keeps working all evening.',
        packIds: ['dessert_icecream', 'dessert_candy_cart', 'dessert_nitrogen', 'dessert_paan'],
        recommend: { close: 'dessert_icecream', family: 'dessert_icecream', full_house: 'dessert_nitrogen', grand: 'dessert_nitrogen' },
        skipLabel: 'The menu has dessert',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody to run the evening?',
        why: 'If there are speeches from the parents and the teachers, one person holding it together makes the difference.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The family will manage',
      }),
      returnGifts({ why: 'Small and useful — this is a young crowd and most of them are students.', packIds: ['gift_budget', 'gift_mid'], recommend: { family: 'gift_budget', full_house: 'gift_budget', grand: 'gift_mid' } }),
      invitations({ why: 'Digital, forwarded through the class group. Nothing printed needed.' }),
      ...groundwork,
      cleanup({ why: 'Cleared the same night, which at a young party is not something to leave to the guests.' }),
    ],
  },

  /* ──────────────────── CORPORATE EVENT ─────────────────────────── */
  corporate_event: {
    id: 'corporate_event',
    opening: 'Let’s scope this properly, one decision at a time.',
    promise: 'Around twelve questions. One consolidated estimate at the end, with GST shown separately.',
    cuisineLead: ['multi_cuisine', 'north_indian', 'continental', 'indo_chinese', 'karnataka'],
    vegDefault: false,
    venue: {
      question: 'Where is it being held?',
      why: 'A corporate event lives on logistics — access for a truck, a lift that takes a screen, power for the rig, and a security desk that has your vendor list. All of it follows from this answer.',
      options: [
        atOffice('Your own floor, cafeteria or auditorium. Cheapest, and the one with the most rules — we work to your facilities and security process.'),
        alreadyBooked('Tell your coordinator which venue and we deal with its AV vendor, its exclusivity clauses and its overtime rates.'),
      ],
      packIds: ['venue_banquet', 'venue_resort', 'venue_lawn', 'venue_community'],
      footnote: 'No "at home" on this list — if a team event is at somebody’s house, plan it as a Get-Together instead and the flow will fit it better.',
    },
    core: ctx => {
      if (ctx.flags.av && !ctx.flags.stage) return ['av_setup', 'emcee', 'dining', 'livestream']
      if (ctx.flags.travel) return ['dining', 'transport', 'entertainment', 'photography']
      if (ctx.flags.awards) return ['av_setup', 'emcee', 'dining', 'gifting', 'photography', 'signage']
      if (ctx.flags.press) return ['av_setup', 'emcee', 'signage', 'dining', 'photography', 'videography']
      return ['av_setup', 'emcee', 'entertainment', 'dining', 'kids_play', 'photography']
    },
    decor: ctx => ((ctx.flags.av && !ctx.flags.stage) || ctx.flags.travel
      ? decorOwn({
        question: 'How much setting up is there?',
        why: 'A town hall and an offsite are rooms with a screen in them. Branding, a lit backdrop and clear signage is the whole job — a floral installation would be somebody else’s event.',
        options: [
          {
            id: 'branded',
            emoji: '🪧',
            name: 'Backdrop, branding and signage',
            desc: 'A branded backdrop behind the speaker, standees, wayfinding and a dressed registration desk.',
            includes: ['Branded stage backdrop', 'Standees and wayfinding signage', 'Registration desk styling', 'Setup and clearing outside working hours'],
            levelId: 'home_touch',
            themeId: 'white_gold',
          },
          {
            id: 'branded_room',
            emoji: '💡',
            name: 'Branding and the room lit',
            desc: 'The branding, plus lighting across the room and the seating and table setup for a full day.',
            includes: ['Everything in the branding setup', 'Ambient and stage lighting', 'Seating and table styling', 'Breakout area setup'],
            levelId: 'classic',
            themeId: 'white_gold',
          },
        ],
        skipLabel: 'Facilities or marketing is handling it',
      })
      : decorLevels()),
    chapters: [
      ask({
        id: 'type',
        title: 'Type',
        emoji: '🏢',
        question: 'What kind of event is this?',
        why: 'An annual day and a product launch share a venue and nothing else. The AV, the stage, the run sheet and the catering all follow from this one answer.',
        options: [
          { id: 'annual_day', emoji: '🎊', name: 'Annual day / family day', desc: 'Employees and families, performances, awards, and children everywhere.', flags: { stage: true, kids: true, awards: true } },
          { id: 'launch', emoji: '🚀', name: 'Product launch or press event', desc: 'Media, a demo, a backdrop that has to photograph well.', flags: { stage: true, press: true, brand: true } },
          { id: 'townhall', emoji: '🗣️', name: 'Town hall or conference', desc: 'Presentations, a panel, and everybody able to hear at the back.', flags: { av: true } },
          { id: 'offsite', emoji: '🏝️', name: 'Offsite or team outing', desc: 'A day away, activities, and travel to arrange.', flags: { travel: true } },
          { id: 'awards', emoji: '🏆', name: 'Awards night or annual dinner', desc: 'A stage, a host, a run sheet and dinner after.', flags: { stage: true, awards: true, formal: true } },
        ],
      }),
      svc({
        serviceId: 'av_setup',
        title: 'AV',
        emoji: '🖥️',
        question: 'What does the AV need to do?',
        why: 'The one line nobody scopes correctly and everybody notices. Screens, mics, a mixing desk, and somebody sitting at it all day.',
        packIds: ['av_conference', 'av_basic', 'av_hybrid'],
        recommend: { close: 'av_basic', family: 'av_basic', full_house: 'av_conference', grand: 'av_hybrid' },
        skipLabel: 'The venue supplies AV',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Who is hosting?',
        why: 'A corporate MC keeps a three-hour programme on a run sheet and covers the ten minutes when the CEO’s slides do not load. That is what you are paying for.',
        packIds: ['emcee_corporate', 'emcee_full', 'emcee_standard'],
        recommend: { close: 'emcee_standard', family: 'emcee_standard', full_house: 'emcee_corporate', grand: 'emcee_corporate' },
        skipLabel: 'Someone internal is hosting',
      }),
      svc({
        serviceId: 'entertainment',
        title: 'Entertainment',
        emoji: '💫',
        question: 'Is there a performance?',
        why: 'One professional act between the awards and the dinner is what stops an annual day feeling like a longer meeting.',
        packIds: ['ent_dance_troupe', 'ent_cheer_led', 'ent_stilt_welcome'],
        recommend: { full_house: 'ent_dance_troupe', grand: 'ent_cheer_led' },
        skipLabel: 'Employees are performing',
        showIf: ctx => ctx.flags.stage,
      }),
      svc({
        serviceId: 'dj',
        title: 'Sound & music',
        emoji: '🎵',
        question: 'Sound and a DJ for after?',
        why: 'The half hour after the formal programme is when the event either becomes a party or empties out.',
        packIds: ['dj_standard', 'dj_premium', 'dj_house'],
        recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_standard', grand: 'dj_premium' },
        skipLabel: 'No DJ',
      }),
      dining({
        why: 'A conference lunch has forty minutes and needs to move. An awards dinner is seated and served. Getting this wrong costs you the second half of the programme.',
        recommend: { close: 'dining_buffet_standing', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'bar',
        title: 'Drinks',
        emoji: '🍹',
        question: 'What is being served to drink?',
        why: 'A mocktail counter serves the whole room, which a bar does not.',
        packIds: ['bar_mocktail', 'bar_full', 'bar_flair'],
        recommend: { family: 'bar_mocktail', full_house: 'bar_mocktail', grand: 'bar_full' },
        skipLabel: 'Standard tea, coffee and juice',
      }),
      photography({
        question: 'Who is covering it?',
        why: 'Corporate photographs are working assets — the internal newsletter, the careers page, next year’s deck. Brief them, and they deliver on the same day.',
        packIds: ['photo_full_day', 'photo_half_day'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'A two-minute highlights film is what the company actually uses afterwards. The full recording is for compliance.',
        packIds: ['video_cinematic', 'video_event', 'video_invite'],
        recommend: { family: 'video_event', full_house: 'video_cinematic', grand: 'video_cinematic' },
      }),
      svc({
        serviceId: 'livestream',
        title: 'Streaming',
        emoji: '📡',
        question: 'Are remote teams joining?',
        why: 'For a town hall this is not optional any more. Multi-camera matters if anybody is expected to watch for more than twenty minutes.',
        packIds: ['stream_multi', 'stream_single'],
        recommend: { family: 'stream_single', full_house: 'stream_multi', grand: 'stream_multi' },
        skipLabel: 'Everybody is in the room',
      }),
      svc({
        serviceId: 'signage',
        title: 'Branding',
        emoji: '🪧',
        question: 'Branding and wayfinding?',
        why: 'Backdrop, standees, registration desk, and signs to the hall. At a press event the backdrop is the photograph that gets published.',
        packIds: ['sign_welcome', 'sign_seating'],
        multi: true,
        recommend: { family: 'sign_welcome', full_house: 'sign_welcome', grand: 'sign_seating' },
        skipLabel: 'Marketing is handling it',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Registration',
        emoji: '🙋',
        question: 'Registration desk and hosts?',
        why: 'Two hundred people arriving in fifteen minutes needs a desk, badges and somebody who knows where everything is.',
        packIds: ['hosp_ushers', 'hosp_guest_manager', 'hosp_cloakroom'],
        multi: true,
        recommend: { family: 'hosp_ushers', full_house: 'hosp_ushers', grand: 'hosp_guest_manager' },
        skipLabel: 'Handled internally',
      }),
      svc({
        serviceId: 'transport',
        title: 'Travel',
        emoji: '🚌',
        question: 'Are people being bussed?',
        why: 'An offsite lives or dies on the travel. One shuttle from the office beats a hundred people finding their own way and forty arriving late.',
        packIds: ['trans_bus', 'trans_tempo', 'trans_cabs'],
        recommend: { full_house: 'trans_bus', grand: 'trans_bus' },
        skipLabel: 'People are making their own way',
        showIf: ctx => ctx.flags.travel || ctx.guests >= 150,
      }),
      svc({
        serviceId: 'kids_play',
        title: 'For the kids',
        emoji: '🎠',
        question: 'Children coming to the family day?',
        why: 'A family day with no plan for the children is a family day everybody leaves at four.',
        packIds: ['kids_play_zone', 'kids_bouncy', 'kids_activity'],
        recommend: { family: 'kids_bouncy', full_house: 'kids_play_zone', grand: 'kids_play_zone' },
        skipLabel: 'Employees only',
        showIf: ctx => ctx.flags.kids,
      }),
      svc({
        serviceId: 'gifting',
        title: 'Gifting',
        emoji: '🎀',
        question: 'Gifts or awards to hand out?',
        why: 'Branded hampers for attendees, and something better for the award winners. Ordered together, they arrive together.',
        packIds: ['hamper_corporate', 'hamper_festive', 'hamper_luxury'],
        recommend: { close: 'hamper_festive', family: 'hamper_corporate', full_house: 'hamper_corporate', grand: 'hamper_luxury' },
        skipLabel: 'Procurement is handling it',
      }),
      invitations({ why: 'Digital invites and on-day stationery — agenda cards, name badges, table numbers.' }),
      ...groundwork,
      cleanup({ why: 'Most corporate venues bill by the hour past the booked window. This is a fixed cost against a variable one.' }),
    ],
  },


  /* ═══════════════════════ NEW VEHICLE ═══════════════════════════════
     The occasion this catalogue was most obviously missing.

     Roughly every new vehicle sold in India gets a garland, a lemon under
     the wheel and a trip to a temple, and the arranging of it is done by
     whoever in the family is free that morning — usually badly, always in a
     hurry, and inside a delivery window the showroom controls. Nobody sells
     it as a service, which is exactly why it belongs here.

     ── The one thing this flow gets right that a generic one cannot ──────
     "Vehicle" is not one thing. A Bullet, a Swift, a school van and a
     tractor are four different mornings with four different decorations,
     four different rites and four completely different amounts of money.
     So the first question sorts them, and every chapter after it is gated
     on the answer: nobody buying a scooter is offered a drone, and nobody
     inaugurating a lorry is offered a fondant cake.

     ── And the flow is SHORT ─────────────────────────────────────────────
     This is the one occasion in the catalogue where the customer is under
     time pressure while using the app — often standing in a showroom with
     the keys in the other hand. A scooter pooja is eight screens. That is
     deliberate, and it is why the meal question is a gate rather than five
     screens of menu. */
  vehicle_pooja: {
    id: 'vehicle_pooja',
    opening: 'Congratulations. Let’s get the pooja and the photographs right.',
    promise: 'A short one — built around your delivery slot. No price until you have seen everything.',
    cuisineLead: ['karnataka', 'udupi', 'north_indian', 'chaat_street', 'multi_cuisine'],
    vegDefault: true,
    venue: {
      question: 'Where is the pooja happening?',
      why: 'This is the only decision here with a clock attached. A showroom gives you a delivery bay for about forty minutes; a temple gives you a slot; your own portico gives you the whole morning. What can be set up depends entirely on which.',
      options: [
        {
          id: 'showroom',
          emoji: '🏬',
          name: 'At the showroom, on delivery',
          desc: 'The decorator and the photographer meet you in the delivery bay. The most common answer, and the tightest window.',
          includes: [
            'Delivery slot confirmed with the showroom',
            'Decorator on site fifteen minutes before you',
            'Permission asked for a carpet and a name board',
            'Everything cleared before you drive out',
          ],
          note: 'Some showrooms will not allow an outside decorator into the bay. We check yours before confirming anything.',
        },
        {
          id: 'temple',
          emoji: '🛕',
          name: 'At the temple',
          desc: 'The vehicle is driven to the temple and the archana done there. We meet you at the gate with the garland, the samagri and the prasada packets.',
          outdoor: true,
          includes: [
            'Archana booked in your name and nakshatra',
            'Garland, coconut, lemons and camphor carried in',
            'Prasada packets for whoever is with you',
            'Photographer briefed on where he is allowed to stand',
          ],
        },
        {
          id: 'own_venue',
          emoji: '🏠',
          name: 'At home, in the portico or the compound',
          desc: 'The purohit comes to you, the rangoli goes down in front of the gate, and there is no clock on any of it.',
          includes: [
            'Purohit at your door at the muhurtham',
            'Rangoli and toran at the gate',
            'Full decoration, with time to photograph it',
            'Sweets handed out to the street',
          ],
        },
        {
          id: 'workplace',
          emoji: '🏭',
          name: 'At the office, the yard or the site',
          desc: 'For a commercial vehicle joining a fleet — done where it will actually work, with the crew who will drive it.',
          outdoor: true,
          includes: ['Setup at the yard or the site gate', 'Pooja with the driver and the crew', 'Sweets for the whole shift', 'Company name board fitted'],
        },
      ],
      packIds: [],
      footnote: 'No halls, lawns or resorts on this list — a vahana pooja happens where the vehicle is.',
    },
    food: mealOptional({
      question: 'Is there a meal afterwards, or just sweets?',
      why: 'Most vehicle poojas end with a packet of kesari bath and everybody going to work. Some become a full family lunch. Both are completely normal, and answering honestly here saves you four screens of menu and a large number in the estimate.',
      yes: { name: 'Yes — there is a proper meal', desc: 'Family coming home for lunch afterwards. We will plan the spread with you.' },
      no: { name: 'No meal — sweets and prasada only', desc: 'The usual. Skip straight past the menu; the sweets are a question further down.' },
    }),
    /* ── Ten vehicles, and they are not one journey ────────────────────
       Somebody who has just bought a scooter is standing in a delivery bay
       with about forty minutes. Somebody whose tractor is arriving in a
       village has the whole day and half the street coming. The first
       question already sorted them; this is what the sorting is FOR. */
    core: ctx => {
      // Four. Samagri stays in core even here: if a purohit is coming, the
      // coconut and the lemons are not an optional extra, and the question
      // takes one tap.
      if (ctx.flags.quick) return ['priest', 'pooja', 'vehicle_decor', 'vehicle_photography']
      if (ctx.flags.commercial) return ['priest', 'pooja', 'vehicle_decor', 'drum', 'sweets', 'vehicle_photography', 'gifting']
      if (ctx.flags.car) return ['priest', 'pooja', 'vehicle_decor', 'vehicle_photography', 'sweets', 'vehicle_care']
      return ['priest', 'pooja', 'vehicle_decor', 'vehicle_photography', 'sweets']
    },
    // The decoration IS the garland, and it was chosen on its own screen
    // eight questions ago. Running the generic ladder afterwards would offer
    // a motorcycle "Home Touch — the entrance, the cake table, and the corner
    // everyone photographs", which is a description of a birthday party.
    decor: decorNone({
      because: 'the vehicle_decor chapter is this occasion’s decoration, in full',
    }),
    chapters: [
      ask({
        id: 'vehicle',
        title: 'What you bought',
        emoji: '🔑',
        question: 'What have you bought?',
        why: 'Everything below changes on this answer — the decoration, the length of the rite, whether a drone is worth anything, and how many sweet boxes the street is expecting. A tractor and a scooter are not the same morning.',
        options: [
          { id: 'bike', emoji: '🏍️', name: 'A motorcycle', desc: 'Bullet, Classic, sports or commuter — the garland goes on the handlebars.', flags: { twoWheeler: true } },
          { id: 'scooter', emoji: '🛵', name: 'A scooter or a moped', desc: 'The most-bought vehicle in the country, and the one nobody arranges anything for.', flags: { twoWheeler: true } },
          { id: 'ev_two', emoji: '⚡', name: 'An electric two-wheeler', desc: 'Ather, Ola, iQube, Chetak. Same rite, and no exhaust to work around with the camphor.', flags: { twoWheeler: true, ev: true } },
          { id: 'car', emoji: '🚗', name: 'A car', desc: 'Hatchback, sedan or SUV — decided over months, and worth a proper morning.', flags: { car: true } },
          { id: 'ev_car', emoji: '🔋', name: 'An electric car', desc: 'We keep the camphor and the lamp well away from the charging port. It matters.', flags: { car: true, ev: true } },
          { id: 'luxury', emoji: '🏎️', name: 'A luxury or imported car', desc: 'The one the dealership does a handover ceremony for. Photographs to match.', flags: { car: true, luxury: true, big: true } },
          { id: 'auto', emoji: '🛺', name: 'An auto-rickshaw', desc: 'A livelihood rather than a purchase. The pooja matters more here than almost anywhere.', flags: { commercial: true } },
          { id: 'commercial', emoji: '🚚', name: 'A lorry, tempo or goods vehicle', desc: 'Banana stems at the cabin, a heavy garland, and the name painted across the front.', flags: { commercial: true, big: true } },
          { id: 'tractor', emoji: '🚜', name: 'A tractor or farm equipment', desc: 'The biggest of these celebrations by a distance, and usually the whole village attends.', flags: { commercial: true, big: true, farm: true } },
          { id: 'fleet', emoji: '🚌', name: 'A bus, van or fleet vehicle', desc: 'A school van, a staff bus, or several at once joining a fleet.', flags: { commercial: true, big: true, fleet: true } },
        ],
      }),
      ask({
        id: 'occasion_kind',
        title: 'The morning',
        emoji: '🌅',
        question: 'How much of a thing is this?',
        why: 'Some families want the archana done and the keys in hand inside half an hour. Others have waited years for this and want the street to see it. Both are normal; they are planned completely differently.',
        options: [
          { id: 'quick', emoji: '⏱️', name: 'Quick and traditional', desc: 'Garland, lemon, archana, photograph, done. Under an hour.', flags: { quick: true } },
          { id: 'family', emoji: '👨‍👩‍👧', name: 'The family is coming', desc: 'Parents, in-laws and a few neighbours, sweets handed round, photographs taken properly.', flags: {} },
          { id: 'celebration', emoji: '🎉', name: 'A proper celebration', desc: 'A long-awaited purchase. Full decoration, a band if you want one, and a meal afterwards.', flags: { big: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'The rite',
        emoji: '🙏',
        question: 'Who is performing the vahana pooja?',
        why: 'A purohit who does these regularly knows both the short form and the long one, brings his own kit, and will not keep a showroom delivery bay waiting while somebody fetches a coconut.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_home_pooja', grand: 'priest_homam' },
        skipLabel: 'The temple priest or a family elder is doing it',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Shall we bring the samagri?',
        why: 'Coconut, lemons, kumkuma, camphor, agarbatti, a garland and the plantain — the list somebody in every family ends up buying at seven in the morning on the way to the showroom.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_basic', grand: 'pooja_homam_kit' },
        skipLabel: 'We have bought everything already',
      }),
      svc({
        serviceId: 'vehicle_decor',
        title: 'The vehicle',
        emoji: '🚗',
        question: 'How is the vehicle being dressed?',
        why: 'This is the photograph. Everything else about this morning is forty minutes long; the garland on the bonnet is what stays on the family group for the next decade.',
        packIds: ['vdec_two_wheeler', 'vdec_car_classic', 'vdec_car_premium', 'vdec_commercial'],
        // The whole reason the first question exists. Offering somebody who
        // has just bought a Bullet a "Car — full floral handover" with a red
        // carpet at the driver door is the app not having listened to the
        // answer it asked for two screens ago.
        packsFor: ctx => {
          if (ctx.flags.twoWheeler) return ['vdec_two_wheeler']
          if (ctx.flags.commercial) return ['vdec_commercial', 'vdec_car_classic']
          if (ctx.flags.luxury) return ['vdec_car_premium', 'vdec_car_classic']
          return ['vdec_car_classic', 'vdec_car_premium']
        },
        recommendFor: ctx => {
          if (ctx.flags.twoWheeler) return { close: 'vdec_two_wheeler', family: 'vdec_two_wheeler', full_house: 'vdec_two_wheeler', grand: 'vdec_two_wheeler' }
          if (ctx.flags.commercial) return { close: 'vdec_commercial', family: 'vdec_commercial', full_house: 'vdec_commercial', grand: 'vdec_commercial' }
          if (ctx.flags.luxury) return { close: 'vdec_car_premium', family: 'vdec_car_premium', full_house: 'vdec_car_premium', grand: 'vdec_car_premium' }
          return { close: 'vdec_car_classic', family: 'vdec_car_classic', full_house: 'vdec_car_premium', grand: 'vdec_car_premium' }
        },
        skipLabel: 'We are buying the garland ourselves',
      }),
      svc({
        serviceId: 'photography',
        id: 'vehicle_photography',
        title: 'Photos',
        emoji: '📸',
        question: 'Who is photographing the handover?',
        why: 'The keys change hands in about four seconds, and the person receiving them cannot photograph it. What most families are left with is a phone picture under a showroom fluorescent tube.',
        packIds: ['photo_half_day', 'photo_full_day'],
        // Forty minutes in a delivery bay is never a full day, whatever the
        // headcount elsewhere in the flow says.
        packsFor: ctx => (ctx.flags.quick ? ['photo_half_day'] : ['photo_half_day', 'photo_full_day']),
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_half_day', grand: 'photo_full_day' },
        skipLabel: 'A phone is fine for this',
      }),
      svc({
        serviceId: 'videography',
        id: 'vehicle_videography',
        title: 'Video',
        emoji: '🎬',
        question: 'A short film of it?',
        why: 'Ninety seconds — the shutter going up, the garland going on, the first drive out. It is the single most-shared thing anybody makes out of a day like this.',
        packIds: ['video_invite', 'video_event', 'video_cinematic'],
        recommend: { family: 'video_invite', full_house: 'video_event', grand: 'video_cinematic' },
        skipLabel: 'Photographs are enough',
      }),
      svc({
        serviceId: 'drone',
        title: 'Aerial',
        emoji: '🚁',
        question: 'A drone shot of the first drive?',
        why: 'One overhead pass as the vehicle leaves. It earns its place on an open road or a farm and nowhere else — inside a city showroom there is nothing for it to see, and we would rather say so than take the money.',
        packIds: ['drone_basic', 'drone_full'],
        recommend: { grand: 'drone_basic' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.luxury || ctx.flags.farm || ctx.flags.big,
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram at the gate?',
        why: 'Traditional for the first entry of anything into a house — a bride, a kalasha, or a vehicle. Fifteen minutes of it, as you drive in.',
        packIds: ['nadaswaram_pair', 'shehnai_pair'],
        recommend: { grand: 'nadaswaram_pair' },
        skipLabel: 'Not this time',
        showIf: ctx => ctx.flags.big || ctx.flags.farm,
      }),
      svc({
        serviceId: 'drum',
        title: 'The band',
        emoji: '🥁',
        question: 'Dhol or a band for the drive home?',
        why: 'For a tractor arriving in a village or a lorry joining a fleet this is not decoration, it is the announcement. The whole street comes out for it.',
        packIds: ['drum_dhol', 'drum_chende', 'drum_band'],
        recommend: { full_house: 'drum_dhol', grand: 'drum_band' },
        skipLabel: 'No band',
        showIf: ctx => ctx.flags.big || ctx.flags.commercial,
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Sweets for the street and the office?',
        why: 'The part of this occasion that actually costs money, and the part everybody underestimates. Neighbours, the office, the watchman, the temple — the count is always higher than the guest list.',
        packIds: ['sweet_temple', 'sweet_traditional', 'sweet_premium', 'sweet_corporate'],
        // A branded office box belongs to a fleet purchase, not to a family
        // buying a scooter; a scooter buys a hundred temple packets.
        packsFor: ctx => {
          if (ctx.flags.fleet || ctx.flags.commercial) return ['sweet_corporate', 'sweet_traditional', 'sweet_temple']
          if (ctx.flags.quick) return ['sweet_temple', 'sweet_traditional']
          return ['sweet_temple', 'sweet_traditional', 'sweet_premium']
        },
        recommendFor: ctx => (ctx.flags.commercial
          ? { close: 'sweet_traditional', family: 'sweet_corporate', full_house: 'sweet_corporate', grand: 'sweet_corporate' }
          : { close: 'sweet_temple', family: 'sweet_traditional', full_house: 'sweet_traditional', grand: 'sweet_premium' }),
        skipLabel: 'We will buy the sweets ourselves',
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake as well?',
        why: 'Increasingly common with a first car, and genuinely nice if there are children in the house. A photo cake of the vehicle needs two days’ notice.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant'],
        recommend: { family: 'cake_cream_1kg', full_house: 'cake_photo', grand: 'cake_fondant' },
        skipLabel: 'No cake',
        showIf: ctx => !ctx.flags.quick,
      }),
      svc({
        serviceId: 'vehicle_care',
        title: 'Protection',
        emoji: '✨',
        question: 'Detailing, coating or accessories?',
        why: 'Booked for a day AFTER the pooja, at a workshop, never on the morning itself. It is on this page because the showroom will quote you for exactly this at roughly three times the price while you are still holding the keys.',
        packIds: ['vcare_bike_polish', 'vcare_detail', 'vcare_coating', 'vcare_accessories'],
        // A ₹22,000 ceramic coating quoted against a ₹90,000 scooter is not
        // an upsell, it is an error. Seat covers and 7D mats cut to a model
        // are equally meaningless on a motorcycle.
        packsFor: ctx => (ctx.flags.twoWheeler
          ? ['vcare_bike_polish']
          : ['vcare_detail', 'vcare_coating', 'vcare_accessories']),
        multi: true,
        recommend: {},
        skipLabel: 'No — nothing extra for the vehicle',
      }),
      svc({
        serviceId: 'gifting',
        title: 'For the driver',
        emoji: '🎀',
        question: 'Something for whoever will be driving it?',
        why: 'For a commercial vehicle the driver is the person whose year this changes. A shawl and a small gift on the day is how that is marked, and it is remembered for a long time.',
        packIds: ['hamper_festive', 'hamper_corporate'],
        recommend: { family: 'hamper_festive', full_house: 'hamper_corporate', grand: 'hamper_corporate' },
        skipLabel: 'Not needed',
        showIf: ctx => !!ctx.flags.commercial,
      }),
      // Both of these only exist if people come back to the house. For the
      // scooter bought on a Tuesday morning — which is most of them — the
      // flow ends at the sweets, and it should.
      returnGifts({
        why: 'Only if the family is coming home afterwards — a small thing for the people who took a morning off to be there.',
        packIds: ['gift_budget', 'gift_mid'],
        recommend: { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
        showIf: ctx => ctx.guests >= 25,
      }),
      // Almost never shown, and it has to be here: a tractor pooja in a village
      // with three hundred people and a lunch on the threshing floor needs
      // parking marshals and a generator exactly as much as a wedding does.
      // Every one of these is gated past a headcount a showroom handover
      // never reaches.
      ...groundwork,
      cleanup({
        why: 'Flowers off the bonnet, the coconut swept up, and the portico back to normal before you have to park in it.',
        showIf: ctx => ctx.guests >= 25,
      }),
    ],
  },

  /* ═══════════════════ HALF-SAREE / RITU KALA ════════════════════════
     Missing from the original fifteen, and it should not have been. In
     coastal Andhra, Telangana and much of Tamil Nadu the langa voni runs at
     genuine wedding scale — four hundred guests, a stage, a videographer and
     a full leaf meal — and a family planning one was being handed the
     birthday flow.

     ── The line this copy walks ──────────────────────────────────────────
     The function marks a girl's coming of age, and the app is talking to her
     parents while she is very likely reading over their shoulder. So nothing
     here names the reason, everything names the celebration, and she is the
     guest of honour rather than the subject. That is also exactly how the
     invitation is worded in every family that holds one. */
  half_saree: {
    id: 'half_saree',
    opening: 'Let’s plan the half-saree function properly.',
    promise: 'Around fifteen questions, in the order a family decides them. No price until the end.',
    cuisineLead: ['andhra', 'tamil', 'karnataka', 'udupi', 'multi_cuisine'],
    vegDefault: true,
    venue: anywhere({
      why: 'A langa voni is either a morning at home with the close family or an evening function with a stage — and the two need completely different rooms. This answer also decides whether we bring power and fans with us.',
      homeDesc: 'The house or the apartment clubhouse, with a pandal in the compound if the numbers need one.',
      packIds: ['venue_community', 'venue_banquet', 'venue_lawn', 'venue_resort'],
    }),
    core: ctx => {
      if (ctx.flags.stage) return ['priest', 'pooja', 'bridal_wear', 'makeup', 'dining', 'nadaswaram', 'photography', 'videography', 'emcee', 'return_gifts']
      if (ctx.flags.hall) return ['priest', 'pooja', 'bridal_wear', 'makeup', 'dining', 'nadaswaram', 'photography', 'return_gifts']
      return ['priest', 'pooja', 'bridal_wear', 'dining', 'photography', 'return_gifts']
    },
    decor: ctx => (ctx.flags.hall ? decorLevels() : decorOwn({
      question: 'How is the room being set up?',
      why: 'For the rite and close family, the decoration is where she sits and what is behind her. A stage belongs to the evening version of this function, not the morning one.',
      options: [
        {
          id: 'seat',
          emoji: '🌺',
          name: 'The seat and a floral backdrop',
          desc: 'A decorated seat, a flower backdrop for the photographs, the arati thalis laid out, and the entrance done.',
          includes: ['Decorated seat for the honoree', 'Floral backdrop, about 8 ft', 'Arati and gift table styling', 'Entrance toran and rangoli'],
          levelId: 'home_touch',
          themeId: 'traditional_red_gold',
        },
        {
          id: 'room',
          emoji: '🌼',
          name: 'The whole room',
          desc: 'The seat and backdrop, plus hanging florals, the family seating styled and warm lighting through the space.',
          includes: ['Everything in the seat setup', 'Hanging floral or drape work', 'Family seating and table styling', 'Warm lighting for photographs'],
          levelId: 'classic',
          themeId: 'traditional_red_gold',
        },
      ],
      skipLabel: 'The family is doing the decoration',
    })),
    chapters: [
      ask({
        id: 'scale_kind',
        title: 'The day',
        emoji: '🌺',
        question: 'What kind of function is this?',
        why: 'These range from a morning rite with twenty relatives to an evening reception with a stage and four hundred guests. Both are called the same thing and almost nothing about them is the same.',
        options: [
          { id: 'ritual_only', emoji: '🪔', name: 'The rite, and close family', desc: 'The pooja, the elders, the gifts, and lunch at home. A morning.', flags: { ritual: true } },
          { id: 'traditional', emoji: '🌼', name: 'Traditional function with lunch', desc: 'The rite in the morning, a hall, and a leaf meal for both sides of the family.', flags: { ritual: true, hall: true } },
          { id: 'grand', emoji: '✨', name: 'A full function with a stage', desc: 'An evening reception — stage, entry, photographer, and the whole extended family.', flags: { ritual: true, hall: true, stage: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'The rite',
        emoji: '🙏',
        question: 'Who is conducting the ceremony?',
        why: 'A purohit who knows this particular samskara and your family’s tradition. The sequence genuinely differs between Telugu, Tamil and Kannada families, and it matters to the grandmothers in the room.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the ritual items?',
        why: 'Haldi, kumkuma, the five fruits, the arati thalis, the coconut, and the bangles the aunts will distribute. Bought and laid out the night before rather than at six in the morning.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      svc({
        serviceId: 'bridal_wear',
        title: 'Draping',
        emoji: '🥻',
        question: 'Somebody to drape the half-saree?',
        why: 'The langa voni is being worn for the first time, in front of everybody, and it has to sit correctly for four hours and photograph well doing it. A draper takes twenty minutes and removes the one thing that can go visibly wrong.',
        packIds: ['bridal_draping', 'bridal_stylist', 'bridal_trousseau'],
        recommend: { close: 'bridal_draping', family: 'bridal_draping', full_house: 'bridal_stylist', grand: 'bridal_stylist' },
        skipLabel: 'Her mother and aunts are doing it',
      }),
      svc({
        serviceId: 'makeup',
        title: 'Makeup',
        emoji: '💄',
        question: 'Makeup and hair?',
        why: 'Age-appropriate and photograph-appropriate are the two things to get right, and a stylist who does these regularly knows the difference. Jasmine, a plait, and nothing that looks like a bridal trial.',
        packIds: ['makeup_guest', 'makeup_bridal', 'makeup_multi_day'],
        recommend: { close: 'makeup_guest', family: 'makeup_guest', full_house: 'makeup_bridal', grand: 'makeup_bridal' },
        skipLabel: 'No professional makeup',
      }),
      svc({
        serviceId: 'mehendi',
        title: 'Mehendi',
        emoji: '🪷',
        question: 'Mehendi the evening before?',
        why: 'Usually the night before, at home, with the cousins. It is the part of the whole occasion the honoree actually looks forward to.',
        packIds: ['mehendi_guest', 'mehendi_bridal', 'mehendi_premium'],
        recommend: { close: 'mehendi_guest', family: 'mehendi_guest', full_house: 'mehendi_bridal', grand: 'mehendi_bridal' },
        skipLabel: 'No mehendi',
      }),
      dining({
        why: 'A half-saree lunch is a leaf meal, seated, and the extended family will measure it against the last one they attended. This is not the occasion for a standing buffet.',
        packIds: ['dining_leaf', 'dining_floor', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the entry?',
        why: 'Playing as she walks in. In a Telugu or Tamil family this is not an extra — it is what the entry sounds like.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Music through the meal?',
        why: 'A veena or a flute duo through lunch, which lets the elders keep talking. A DJ at a function with three generations in the room empties the hall.',
        packIds: ['music_classical_duo', 'music_band'],
        recommend: { full_house: 'music_classical_duo', grand: 'music_classical_duo' },
        skipLabel: 'No live music',
        showIf: ctx => !!ctx.flags.hall,
      }),
      photography({
        question: 'Who is photographing this?',
        why: 'The photographs from this function end up in the wedding album ten years later. It is worth somebody who has shot one before and knows what the elders will want framed.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'The entry, the rite, and the blessings from the elders. Ten minutes of film that will be watched again at her wedding.',
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo corner',
        emoji: '🤳',
        question: 'A corner for the cousins?',
        why: 'It gives thirty teenagers something to do that is not standing near the food, and it is where half the photographs anybody keeps come from.',
        packIds: ['booth_classic', 'booth_360', 'booth_mirror'],
        recommend: { full_house: 'booth_classic', grand: 'booth_360' },
        skipLabel: 'No booth',
        showIf: ctx => ctx.flags.stage || ctx.guests >= 150,
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody running the evening?',
        why: 'With a stage and four hundred guests, somebody has to hold the running order — otherwise the entry happens while half the hall is still at the buffet.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The family will run it',
        showIf: ctx => ctx.flags.stage || ctx.guests >= 200,
      }),
      returnGifts({
        why: 'Blouse pieces, arishina-kumkuma and a small gift for the women — the tradition at this function specifically. Counted properly, because running out is remembered.',
        packIds: ['gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'Printed for the elders and digital for everybody else, worded the way this function is traditionally worded.' }),
      ...groundwork,
      cleanup({ why: 'Four hundred leaves, a stage and a floral backdrop, cleared the same night — because the hall is booked again from ten tomorrow.' }),
    ],
  },

  /* ═════════════════ MUNDAN / CHUDAKARANA ════════════════════════════
     A temple morning and a lunch. It needs its own flow because half of it
     happens somewhere we do not control: a tonsure at Tirupati,
     Dharmasthala or the family temple has a queue, a slot, and rules about
     what may be carried in. Planned as "a small birthday" it produces a
     decorated hall that nobody reaches until two in the afternoon. */
  mundan: {
    id: 'mundan',
    opening: 'Let’s plan the mundan, and what happens after it.',
    promise: 'Ten or so questions. Nothing is booked, and the price comes at the end.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'north_indian', 'multi_cuisine'],
    vegDefault: true,
    venue: {
      question: 'Where is the tonsure being done?',
      why: 'A temple has a queue and a slot and will not wait for you. A rite at home runs on your own muhurtham. Everything after it — the lunch, the photographs, the travel — is arranged completely differently in each case.',
      options: [
        atTemple('The temple your family goes to. We confirm the slot, coordinate with their purohit, and carry everything in and out.', 'At our family temple'),
        {
          id: 'pilgrimage',
          emoji: '🚌',
          name: 'At a pilgrimage temple',
          desc: 'Tirupati, Dharmasthala, Palani, Ghati Subramanya. A travel day as much as a function, and it starts at four in the morning.',
          outdoor: true,
          includes: [
            'Slot and darshan timing checked for your date',
            'Travel and a meeting point for the whole party',
            'Everything carried, because nothing can be bought there',
            'Prasada distribution arranged at the gate',
          ],
          note: 'Big temples restrict cameras and outside materials. We confirm the rules for yours before quoting.',
        },
        atHome('The homa, the barber and the first lock of hair, all in the house, on your own clock.', 'At home, with a purohit'),
        alreadyBooked(),
      ],
      packIds: ['venue_community', 'venue_banquet'],
      footnote: 'No lawns or resorts — a chudakarana is held at a temple or at home.',
    },
    food: mealOptional({
      question: 'Is there a lunch afterwards?',
      why: 'Some families do the tonsure at the temple and go home. Most feed whoever came. Telling us now decides whether the next four screens are about food, or are skipped entirely.',
      yes: { name: 'Yes — a meal for everybody who came', desc: 'At home or at a hall. We will plan the spread with you.' },
      no: { name: 'No meal — the temple, and home', desc: 'The rite and the prasada only. Skip the menu.' },
    }),
    core: ctx => (ctx.venueKind === 'pilgrimage'
      ? ['priest', 'pooja', 'transport', 'photography', 'dining', 'return_gifts']
      : ['priest', 'pooja', 'dining', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the house being set up?',
      why: 'Most of this morning happens at a temple, where nothing may be decorated at all. What can be is the house the child is brought back to — the door, and the corner the lunch is served from.',
      options: [
        {
          id: 'entrance',
          emoji: '🌿',
          name: 'The entrance, for the return',
          desc: 'Mango-leaf toran, a rangoli at the door and a small floral corner for the arati when the child comes back in.',
          includes: ['Mango-leaf toran across the door', 'Hand-drawn rangoli on the morning', 'Floral arati corner', 'Cleared the same afternoon'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'entrance_room',
          emoji: '🎀',
          name: 'Entrance and the lunch room',
          desc: 'The door work, plus the dining area styled for the meal and a small backdrop for the family photographs.',
          includes: ['Everything in the entrance setup', 'Dining area styling for the meal', 'Small backdrop for family photographs', 'Warm lighting'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'No decoration — it is at the temple',
    }),
    chapters: [
      ask({
        id: 'age',
        title: 'The child',
        emoji: '👶',
        question: 'How old is the child?',
        why: 'A one-year-old and a three-year-old are two completely different mornings for everybody present, and it decides whether the lunch is at home with a cot in the next room or at a hall.',
        options: [
          { id: 'infant', emoji: '🍼', name: 'Under a year', desc: 'Short, quiet, and everything arranged around a nap.', flags: { infant: true } },
          { id: 'toddler', emoji: '🧸', name: 'One to three', desc: 'The usual age, and the one that needs a distraction ready.', flags: {} },
          { id: 'older', emoji: '🎈', name: 'Older than three', desc: 'Old enough to have an opinion about it, which changes how the morning is handled.', flags: { older: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is performing the chudakarana?',
        why: 'The rite is short but it is fixed to a muhurtham, and in most traditions there is a homa before it. A purohit who does these knows how to keep a fifteen-month-old still for the four minutes that matter.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'The temple priest is performing it',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the homa setup?',
        why: 'The homa kit, the silver razor if your family keeps one, turmeric, and the cloth the hair is collected in. All of it on the list the purohit sends the night before.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      svc({
        serviceId: 'transport',
        title: 'Getting there',
        emoji: '🚌',
        question: 'How is everybody getting to the temple?',
        why: 'A pilgrimage tonsure is a convoy leaving at four in the morning with grandparents, a baby and a great deal of luggage. One tempo traveller beats six cars and four wrong turns.',
        packIds: ['trans_tempo', 'trans_bus', 'trans_cabs'],
        recommend: { close: 'trans_cabs', family: 'trans_tempo', full_house: 'trans_bus', grand: 'trans_bus' },
        skipLabel: 'We are making our own way',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram at the house?',
        why: 'As the child is brought back in after the tonsure. Fifteen minutes, and it turns an arrival into a return.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe'],
        recommend: { full_house: 'nadaswaram_pair', grand: 'nadaswaram_pair' },
        skipLabel: 'Not this time',
      }),
      dining({
        why: 'A mundan lunch is a family lunch — floor seating at home for thirty, a leaf meal in a hall for a hundred and fifty. Neither works standing, with a toddler in the room.',
        packIds: ['dining_floor', 'dining_leaf', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_floor', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake at home afterwards?',
        why: 'Not traditional, and completely normal now — particularly when the mundan and the first birthday fall within a month of each other.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant'],
        recommend: { family: 'cake_cream_1kg', full_house: 'cake_cream_1kg', grand: 'cake_photo' },
        skipLabel: 'No cake',
      }),
      photography({
        question: 'Who is photographing the tonsure?',
        why: 'The face at the first cut is the photograph, and it happens once. Temples restrict where a camera may stand, and somebody who has shot one there already knows where that is.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'Short — the homa, the first cut, and the child being brought home. Not the whole morning.',
        packIds: ['video_invite', 'video_event'],
        recommend: { family: 'video_invite', full_house: 'video_event', grand: 'video_event' },
      }),
      svc({
        serviceId: 'nanny',
        title: 'For the children',
        emoji: '👶',
        question: 'Somebody to help with the small ones?',
        why: 'A room full of cousins under five, a mother holding the child of the hour, and a lunch to get through. A trained minder for four hours is the cheapest sanity on this page.',
        packIds: ['nanny_standard', 'nanny_creche'],
        recommend: { full_house: 'nanny_standard', grand: 'nanny_creche' },
        skipLabel: 'The family will manage',
        showIf: ctx => ctx.guests >= 60,
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Sweets for the neighbours and the temple?',
        why: 'Prasada at the temple gate and a box to the houses on either side. Small money, and it is what makes the day known.',
        packIds: ['sweet_temple', 'sweet_traditional', 'sweet_premium'],
        recommend: { close: 'sweet_temple', family: 'sweet_traditional', full_house: 'sweet_traditional', grand: 'sweet_premium' },
        skipLabel: 'We will buy them ourselves',
      }),
      returnGifts({
        why: 'Arishina-kumkuma and a small thing for the women who came. Modest by tradition at this function — it is not a wedding.',
        packIds: ['gift_budget', 'gift_mid'],
        recommend: { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
      }),
      invitations({ why: 'Almost always digital for this one — the muhurtham is confirmed late and half the family is being told on a group.' }),
      ...groundwork,
      cleanup({ why: 'A homa kunda and a hundred leaves, out of a house with a toddler asleep in it.' }),
    ],
  },

  /* ══════════════════ ANNAPRASHANA / FIRST RICE ══════════════════════
     Choroonu in Kerala, mukhe bhaat in Bengal, annaprashana nearly
     everywhere else. A short rite, an enormous number of photographs, and
     three generations in one room — which is the whole planning problem,
     because the room is usually a flat and half the people in it are over
     seventy or under three. */
  annaprashana: {
    id: 'annaprashana',
    opening: 'Let’s plan the first rice properly.',
    promise: 'Around a dozen questions, most of them quick. The price comes once, at the end.',
    cuisineLead: ['karnataka', 'udupi', 'bengali', 'kerala', 'tamil'],
    vegDefault: true,
    venue: {
      question: 'Where is the annaprashana?',
      why: 'A newborn, a homa and a lamp all want the same thing: shelter and still air. That removes most of a generic venue list, so this one only offers what these are actually held in.',
      options: [
        atHome('The house or the apartment clubhouse — where the baby can be put down and the grandparents can sit.'),
        atTemple('The family temple, which is the tradition in Kerala especially. We book the slot and coordinate with their purohit.'),
        alreadyBooked(),
      ],
      packIds: ['venue_community', 'venue_banquet'],
      footnote: 'No lawn or resort here — a homa in open wind with a six-month-old is not something a decorator can fix.',
    },
    core: ctx => (ctx.flags.hall
      ? ['priest', 'pooja', 'dining', 'cake', 'photography', 'videography', 'return_gifts']
      : ['priest', 'pooja', 'dining', 'photography', 'return_gifts']),
    decor: decorOwn({
      question: 'How is the room being set up?',
      why: 'Everything about this rite happens on one mat: the child, the silver bowl, the tray of objects, and three generations leaning over it. That is what gets decorated.',
      options: [
        {
          id: 'seat',
          emoji: '🍚',
          name: 'The seat, the tray and the door',
          desc: 'A decorated seat or lap-mat for the child, the tray of objects laid out properly, and a toran and rangoli at the entrance.',
          includes: ['Decorated seat or mat for the child', 'Tray of objects laid out and dressed', 'Mango-leaf toran and rangoli', 'Set up before the muhurtham'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'backdrop',
          emoji: '🌼',
          name: 'A name backdrop and the room',
          desc: 'The seat and tray, plus a floral backdrop for the family photographs, guest seating styled, and lighting.',
          includes: ['Everything in the seat setup', 'Floral name backdrop for photographs', 'Guest seating and table styling', 'Warm lighting through the room'],
          levelId: 'classic',
          themeId: 'pastel',
        },
        {
          id: 'hall',
          emoji: '✨',
          name: 'A full hall setup',
          desc: 'For a mukhe bhaat with two hundred guests — a designed backdrop, an entrance installation and every table styled.',
          includes: ['Designed backdrop with fresh florals', 'Entrance installation and welcome signage', 'Full table styling', 'Ambient and stage lighting'],
          levelId: 'signature',
          themeId: 'pastel',
        },
      ],
      skipLabel: 'The family is arranging the decoration',
    }),
    chapters: [
      ask({
        id: 'tradition',
        title: 'Tradition',
        emoji: '🍚',
        question: 'Which tradition are you following?',
        why: 'The rite differs more than people expect. The Bengali mukhe bhaat puts the maternal uncle at the centre of it, the Kerala choroonu is at the temple, and the payasam is not the same payasam. It changes the purohit, the menu and the setup.',
        options: [
          { id: 'south', emoji: '🪔', name: 'South Indian annaprashana', desc: 'At home or the temple, with a homa, the silver spoon and payasam.', flags: { south: true } },
          { id: 'bengali', emoji: '🍛', name: 'Bengali mukhe bhaat', desc: 'The mama feeds the first mouthful, and it is a full function with a proper spread.', flags: { bengali: true, hall: true } },
          { id: 'kerala', emoji: '🌴', name: 'Kerala choroonu', desc: 'Usually at the temple — Guruvayur or the family temple — followed by a sadya.', flags: { temple: true, south: true } },
          { id: 'north', emoji: '🕉️', name: 'North Indian annaprashan', desc: 'A havan at home, the tray of objects, and a lunch for the family.', flags: { north: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting it?',
        why: 'Short rite, fixed muhurtham, and a homa before it in most families. Somebody who has done these knows to keep it to twenty-five minutes, because the baby has a limit and everybody in the room knows what it is.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the ritual items?',
        why: 'The silver bowl and spoon, the tray of objects for the child to choose from, the new clothes, and the samagri for the homa. One list, sourced together, laid out before the purohit arrives.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      dining({
        why: 'Three generations in one room, and the oldest of them need a chair and somewhere to put a plate down. This decision is what determines whether the grandparents stay for the whole lunch.',
        packIds: ['dining_leaf', 'dining_floor', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_leaf', full_house: 'dining_leaf', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake as well?',
        why: 'Common now, and it makes the afternoon feel like an occasion to the cousins who are too young to care about a homa.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant'],
        recommend: { family: 'cake_cream_1kg', full_house: 'cake_photo', grand: 'cake_fondant' },
        skipLabel: 'No cake',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram during the rite?',
        why: 'Through the feeding itself. It covers the gap while the baby decides whether to cooperate, which is not a small thing.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe'],
        recommend: { full_house: 'nadaswaram_pair', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'bhajan',
        title: 'Devotional',
        emoji: '🎼',
        question: 'Bhajans while lunch is laid?',
        why: 'Fills the flat hour between the rite ending and the food being ready, which is otherwise when guests start looking at their phones.',
        packIds: ['bhajan_mandali', 'bhajan_carnatic'],
        recommend: { full_house: 'bhajan_mandali', grand: 'bhajan_carnatic' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.guests >= 80,
      }),
      photography({
        question: 'Who is photographing the first mouthful?',
        why: 'The face when the payasam lands is what the whole family is here for, and it happens exactly once. Nobody holding a baby can take it.',
      }),
      videography({
        why: 'Twenty minutes of film — the homa, the feeding and the tray of objects. Watched every year on that date.',
      }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Family watching from elsewhere?',
        why: 'Grandparents who cannot travel, and the sibling abroad. For a rite this short, a stream is the difference between them seeing it and hearing about it.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single', grand: 'stream_multi' },
        skipLabel: 'Everybody will be here',
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo corner',
        emoji: '🤳',
        question: 'A corner for the family photographs?',
        why: 'Every family group wants one with the baby, and without a set corner it happens in a doorway with a fridge in the background.',
        packIds: ['booth_classic', 'booth_mirror'],
        recommend: { full_house: 'booth_classic', grand: 'booth_mirror' },
        skipLabel: 'No booth',
        showIf: ctx => ctx.guests >= 80,
      }),
      svc({
        serviceId: 'nanny',
        title: 'For the children',
        emoji: '👶',
        question: 'Help with the small ones?',
        why: 'The mother will be holding the baby all day and cannot also watch four cousins under six. Four hours of a trained minder is the whole difference.',
        packIds: ['nanny_standard', 'nanny_creche'],
        recommend: { full_house: 'nanny_standard', grand: 'nanny_creche' },
        skipLabel: 'The family will manage',
        showIf: ctx => ctx.guests >= 60,
      }),
      returnGifts({
        why: 'Silver, or a small useful thing, and arishina-kumkuma for the women. One of the occasions where families genuinely do spend on the return gift.',
        packIds: ['gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Sweets for the neighbours?',
        why: 'A box to the flats on the floor and one to the office. Cheap, and it is how the news travels.',
        packIds: ['sweet_traditional', 'sweet_temple', 'sweet_premium'],
        recommend: { close: 'sweet_temple', family: 'sweet_traditional', full_house: 'sweet_traditional', grand: 'sweet_premium' },
        skipLabel: 'We will buy them ourselves',
      }),
      invitations({ why: 'Digital, almost always — the date is fixed to a muhurtham that is confirmed about ten days out.' }),
      ...groundwork,
      cleanup({ why: 'A homa kunda, a hundred leaves, and a flat that has a sleeping baby in it by four o’clock.' }),
    ],
  },

  /* ═══════════════════════ RECEPTION ═════════════════════════════════
     Priced as a line inside "wedding" until now, which is wrong in the way
     that costs a family the most money. A reception is a different day, a
     different hall and a different guest list — the office, the neighbours,
     the people who could not attend a muhurtham at 5:40 in the morning —
     and it is frequently the more expensive of the two, because it is the
     one with a stage, a buffet and four hundred people arriving at once. */
  reception: {
    id: 'reception',
    opening: 'Let’s plan the reception as its own evening.',
    promise: 'About eighteen questions. Nothing is booked, and there is no price until you have seen everything.',
    cuisineLead: ['multi_cuisine', 'north_indian', 'mysuru_royal', 'mughlai', 'indo_chinese'],
    vegDefault: false,
    venue: {
      question: 'Where is the reception?',
      why: 'A reception is judged on how quickly four hundred people get through the door, the stage and the buffet. That is a property of the room more than of anything we can bring, so it is the first thing to fix.',
      options: [
        alreadyBooked('Most receptions have the hall booked first. Tell your coordinator which one and we work to its kitchen rules, its decor restrictions and its access timings.'),
        atHome('A reception in the compound, with a pandal. Works up to about two hundred and gives you the timings a hall would not.'),
      ],
      packIds: ['venue_banquet', 'venue_community', 'venue_resort', 'venue_lawn'],
    },
    core: ctx => {
      // The same evening as the muhurtham means the couple have been awake
      // since three and the hall is being rebuilt around them. Fewer
      // decisions is not a compromise there, it is the correct plan.
      if (ctx.flags.tight) return ['dining', 'makeup', 'photography', 'videography', 'emcee', 'return_gifts']
      if (ctx.flags.bar) return ['dining', 'bar', 'live_counters', 'dj', 'live_music', 'photography', 'emcee']
      return ['dining', 'live_counters', 'cake', 'makeup', 'wedding_car', 'dj', 'photography', 'videography', 'emcee', 'return_gifts']
    },
    decor: decorLevels(),
    chapters: [
      ask({
        id: 'kind',
        title: 'The evening',
        emoji: '🥂',
        question: 'What kind of reception is this?',
        why: 'A reception on the same evening as the muhurtham and one hosted a week later by the other side are two different events with two different guest lists — and one of them has a couple who have been awake since three in the morning.',
        options: [
          { id: 'same_day', emoji: '⏰', name: 'The same evening as the wedding', desc: 'Straight after the muhurtham. Everything has to be built while the wedding is still going on.', flags: { sameDay: true, tight: true } },
          { id: 'separate', emoji: '📅', name: 'A separate day', desc: 'The usual — its own hall, its own invitation, its own guest list.', flags: {} },
          { id: 'hometown', emoji: '🏘️', name: 'A second reception in the hometown', desc: 'For the family and the village who could not travel to the wedding.', flags: { hometown: true } },
          { id: 'cocktail', emoji: '🍸', name: 'A cocktail reception', desc: 'Evening, standing, a bar and a live band rather than a leaf meal.', flags: { standing: true, bar: true } },
        ],
      }),
      dining({
        why: 'This is where the seating decision is most visible: a standing buffet moves four hundred people in ninety minutes, a seated meal takes three hours and is what the elders came for. Choose the one that matches the list you actually invited.',
        packIds: ['dining_round', 'dining_buffet_standing', 'dining_leaf', 'dining_lounge'],
        recommend: { close: 'dining_round', family: 'dining_round', full_house: 'dining_buffet_standing', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'live_counters',
        title: 'Live counters',
        emoji: '🥘',
        question: 'Live counters as well as the meal?',
        why: 'Counters are what stops the queue at a reception. Chaat and a dosa counter absorb the first forty minutes, which is when everybody arrives at once and the main buffet is not open yet.',
        packIds: ['counter_chaat', 'counter_dosa', 'counter_grill', 'counter_pasta_global'],
        multi: true,
        recommend: { full_house: 'counter_chaat', grand: 'counter_chaat' },
        skipLabel: 'The buffet is enough',
      }),
      svc({
        serviceId: 'bar',
        title: 'Drinks',
        emoji: '🍹',
        question: 'A bar or a mocktail counter?',
        why: 'At an Indian reception the mocktail counter does more work than the bar — it is where the people who are not drinking spend the evening, and it keeps them out of the buffet queue.',
        packIds: ['bar_mocktail', 'bar_full', 'bar_flair'],
        recommend: { full_house: 'bar_mocktail', grand: 'bar_mocktail' },
        skipLabel: 'No bar',
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'Is there a cake cutting?',
        why: 'Standard at a reception now, and it gives the evening a moment with a time on it — which is what stops a reception being three hours of a queue.',
        packIds: ['cake_tiered', 'cake_fondant', 'cake_dessert_table', 'cake_cream_1kg'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_tiered', full_house: 'cake_tiered', grand: 'cake_tiered' },
        skipLabel: 'No cake',
      }),
      svc({
        serviceId: 'makeup',
        title: 'Styling',
        emoji: '💄',
        question: 'Makeup and styling for the evening?',
        why: 'A reception look is a different one from the muhurtham, done in about an hour, usually in a hall side room with bad light. A stylist who does receptions brings their own.',
        packIds: ['makeup_bridal', 'makeup_multi_day', 'makeup_groom', 'makeup_guest'],
        multi: true,
        recommend: { close: 'makeup_bridal', family: 'makeup_bridal', full_house: 'makeup_bridal', grand: 'makeup_multi_day' },
        skipLabel: 'Already arranged',
      }),
      svc({
        serviceId: 'wedding_car',
        title: 'The entry',
        emoji: '🚗',
        question: 'How is the couple arriving?',
        why: 'The entry is the second-most photographed minute of the evening. A decorated car at the porch, or a vintage one, is the whole difference between arriving and making an entrance.',
        packIds: ['car_sedan', 'car_luxury', 'car_vintage'],
        recommend: { family: 'car_sedan', full_house: 'car_luxury', grand: 'car_vintage' },
        skipLabel: 'We are arranging the car',
      }),
      svc({
        serviceId: 'dj',
        title: 'Music',
        emoji: '🎵',
        question: 'What is the music?',
        why: 'A reception rig has two jobs — background for two hours of a queue, then a floor for the last forty minutes. A rig sized only for the second one makes conversation impossible all evening.',
        packIds: ['dj_house', 'dj_standard', 'dj_premium'],
        recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_standard', grand: 'dj_premium' },
        skipLabel: 'No DJ',
      }),
      svc({
        serviceId: 'live_music',
        title: 'Live',
        emoji: '🎻',
        question: 'Live music as well, or instead?',
        why: 'A band or a ghazal duo through the meal is what a reception with three generations in the room actually needs. The DJ can have the last hour.',
        packIds: ['music_band', 'music_ghazal_sufi', 'music_classical_duo', 'music_dj_band'],
        recommend: { full_house: 'music_band', grand: 'music_band' },
        skipLabel: 'No live music',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody running the evening?',
        why: 'Without a host, the cake gets cut while the photographer is eating and the speeches never happen. This is the cheapest thing on the page that changes how the whole evening feels.',
        packIds: ['emcee_standard', 'emcee_full'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_standard', grand: 'emcee_full' },
        skipLabel: 'The family will run it',
      }),
      svc({
        serviceId: 'entertainment',
        title: 'The act',
        emoji: '💃',
        question: 'Any performances?',
        why: 'A dance troupe for the entry, or stilt walkers at the door. Fifteen minutes of it changes the temperature of an evening that is otherwise a very long queue.',
        packIds: ['ent_stilt_welcome', 'ent_dance_troupe', 'ent_cheer_led'],
        recommend: { grand: 'ent_stilt_welcome' },
        skipLabel: 'No performances',
        showIf: ctx => ctx.guests >= 250,
      }),
      photography({
        question: 'Who is photographing the reception?',
        why: 'Four hundred stage photographs, each one a family that will ask for theirs. This is a two-photographer evening at almost any size, and one photographer means half of them never get sent.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_wedding_full'],
        recommend: { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_wedding_full' },
      }),
      videography({
        why: 'The entry, the cake, the speeches and the floor. A reception film is shorter than a wedding film and gets watched a great deal more often.',
        packIds: ['video_event', 'video_cinematic', 'video_wedding_cinema'],
        recommend: { close: 'video_event', family: 'video_event', full_house: 'video_cinematic', grand: 'video_wedding_cinema' },
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo booth',
        emoji: '🤳',
        question: 'A booth away from the stage?',
        why: 'It takes pressure off the stage queue, which is the single biggest complaint at every reception ever held. Guests who have been photographed already stop queueing.',
        packIds: ['booth_360', 'booth_classic', 'booth_mirror'],
        recommend: { full_house: 'booth_classic', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Streaming it for family abroad?',
        why: 'Half the reason a hometown reception exists is the people who could not travel. If some of them still cannot, this is how they attend.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { full_house: 'stream_single', grand: 'stream_multi' },
        skipLabel: 'Everybody will be here',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Guests',
        emoji: '🙋',
        question: 'Ushers and a cloakroom?',
        why: 'Four hundred people arriving inside twenty minutes, most carrying a gift and looking for somewhere to put it. Without ushers that is a bottleneck at the door and a pile on a table.',
        packIds: ['hosp_ushers', 'hosp_guest_manager', 'hosp_cloakroom'],
        multi: true,
        recommend: { full_house: 'hosp_ushers', grand: 'hosp_guest_manager' },
        skipLabel: 'The family will manage the door',
      }),
      svc({
        serviceId: 'fireworks',
        title: 'The moment',
        emoji: '🎆',
        question: 'Something for the entry or the cake?',
        why: 'Cold pyro is indoor-safe and smokeless. Fifteen seconds of it is what turns the entry into the clip that goes on every family group that night.',
        packIds: ['fire_cold_pyro', 'fire_outdoor', 'fire_lantern'],
        recommend: { full_house: 'fire_cold_pyro', grand: 'fire_cold_pyro' },
        skipLabel: 'Not needed',
      }),
      returnGifts({
        why: 'Four hundred of them, counted, at the door, with somebody handing them out. The counting is the part that goes wrong.',
        packIds: ['gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_mid', full_house: 'gift_mid', grand: 'gift_premium' },
      }),
      invitations({ why: 'A reception invitation goes to a wider and more formal list than the wedding — the office, the neighbours, the business contacts. Printed still matters for this one.' }),
      svc({
        serviceId: 'signage',
        title: 'Signage',
        emoji: '🪧',
        question: 'Welcome board and wayfinding?',
        why: 'A hall with three functions running in it on a Saturday, and your guests looking for yours. One board at the gate solves it.',
        packIds: ['sign_welcome', 'sign_seating'],
        multi: true,
        recommend: { full_house: 'sign_welcome', grand: 'sign_welcome' },
        skipLabel: 'Not needed',
      }),
      ...groundwork,
      cleanup({ why: 'Halls charge by the hour past the booked window, and a reception always overruns. This is a fixed cost against a variable one.' }),
    ],
  },

  /* ═══════════════ SHOP & BUSINESS OPENING ═══════════════════════════
     Entirely absent from the catalogue, and one of the largest single-day
     celebration spends in the country outside a wedding. A new shop, clinic,
     showroom, office or restaurant opens with a homa at dawn, a ribbon at
     the muhurtham, a band on the pavement, and sweet boxes going out for a
     fortnight afterwards.

     ── Why it is not just "corporate event" ──────────────────────────────
     A corporate event is indoors, invited, and run to an agenda. This is on
     a pavement, uninvited by design — the whole point is that the street
     sees it — and its success is counted in footfall rather than in
     attendance. Almost nothing transfers. */
  shop_opening: {
    id: 'shop_opening',
    opening: 'Let’s open it properly. The morning first, then the street.',
    promise: 'Around sixteen questions, built around your muhurtham. No price until the end.',
    cuisineLead: ['karnataka', 'north_indian', 'chaat_street', 'indo_chinese', 'multi_cuisine'],
    vegDefault: true,
    venue: {
      question: 'Where is the opening?',
      why: 'At the premises — that is what an opening is, so we have not asked. What we do need to know is what happens to the people you invited, because a shop floor is not somewhere forty guests can sit down for lunch.',
      fixed: {
        id: 'the_premises',
        emoji: '🏪',
        name: 'At the new premises',
        desc: 'Where else. We survey the frontage beforehand — how wide the pavement is, where an arch can stand, whether the board can be lit, and what the neighbouring shops will tolerate.',
        includes: [
          'Frontage survey and a layout for the morning',
          'Pavement width and local permission checked',
          'Power drawn without tripping a new connection',
          'Everything cleared before trading starts',
        ],
      },
      options: [
        {
          id: 'the_premises',
          emoji: '🏪',
          name: 'Everything at the premises',
          desc: 'Homa, ribbon, band and refreshments all at the shop. The usual answer.',
          outdoor: true,
          includes: ['Homa setup inside before the shutter opens', 'Arch, carpet and crowd management outside', 'Refreshment counter that does not block the door', 'Full clear-down before trading'],
        },
        {
          id: 'hall_nearby',
          emoji: '🍽️',
          name: 'Opening at the shop, lunch at a hall nearby',
          desc: 'For a launch where the guests you actually invited need to sit down somewhere that is not a shop floor.',
          includes: ['Hall found and booked within walking distance', 'Guests directed from the shop to the hall', 'Both ends run on one timeline', 'Separate arrangements for the street and for the invited'],
        },
      ],
      packIds: [],
      footnote: 'A shop opening happens at the shop. The only real question is where the people who came for it sit down.',
    },
    food: mealOptional({
      question: 'Is there a meal, or refreshments only?',
      why: 'Most openings hand out sweets, tea and a snack to whoever walks past, and feed nobody a proper meal. Some do a full lunch for invited guests. Telling us now decides whether we plan a kitchen or a counter.',
      yes: { name: 'Yes — a proper meal for invited guests', desc: 'A lunch or dinner for the people you invited. We will plan the spread.' },
      no: { name: 'Refreshments and sweets only', desc: 'Tea, a snack and sweet boxes for the street. Skip the menu screens.' },
    }),
    core: ctx => (ctx.flags.footfall
      ? ['priest', 'inauguration', 'drum', 'signage', 'sweets', 'photography']
      : ['priest', 'inauguration', 'signage', 'sweets', 'photography', 'emcee']),
    decor: decorOwn({
      question: 'How is the frontage being decorated?',
      why: 'Everything a passer-by sees happens in the two metres in front of your shutter. That is what gets decorated — not an interior nobody has walked into yet, and not a stage there is no room for.',
      options: [
        {
          id: 'frontage',
          emoji: '🌿',
          name: 'Banana stems and a toran',
          desc: 'The traditional minimum, and it reads instantly: banana stems either side of the shutter, a mango-leaf toran across it, and a rangoli on the pavement.',
          includes: ['Banana stems at both sides of the shutter', 'Mango-leaf toran across the frontage', 'Rangoli on the pavement', 'Set up before the muhurtham, cleared before trading'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'arch',
          emoji: '🎊',
          name: 'A floral arch and carpet',
          desc: 'An arch across the entrance, a red carpet to the door, marigold along the frontage, and the interior counters dressed.',
          includes: ['Floral or balloon arch across the entrance', 'Red carpet from the road to the door', 'Marigold work along the full frontage', 'Interior counter and till styling', 'Pavement permission checked'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
        {
          id: 'launch',
          emoji: '✨',
          name: 'A full launch set',
          desc: 'For a showroom opening — designed entrance installation, lit signage, an interior styled for photographs, and a stage for the chief guest.',
          includes: ['Designed entrance installation', 'Lit nameboard and façade treatment', 'Interior styled for press photographs', 'Small stage for the ribbon and the speeches', 'Designer visit before the day'],
          levelId: 'signature',
          themeId: 'traditional_red_gold',
        },
      ],
      skipLabel: 'We are decorating the shop ourselves',
    }),
    chapters: [
      ask({
        id: 'business',
        title: 'The business',
        emoji: '🏪',
        question: 'What are you opening?',
        why: 'A jewellery showroom, a clinic and a restaurant all open on the same morning ritual and then diverge completely — in who is invited, what the street expects, and whether a band on the pavement helps you or embarrasses you.',
        options: [
          { id: 'retail', emoji: '🛍️', name: 'A shop or retail store', desc: 'Groceries, garments, mobile, hardware. Footfall from day one is the entire point.', flags: { footfall: true } },
          { id: 'showroom', emoji: '💎', name: 'A showroom', desc: 'Jewellery, vehicles, furniture, electronics. The most elaborate openings in the country.', flags: { footfall: true, grandOpen: true } },
          { id: 'food', emoji: '🍽️', name: 'A restaurant, café or bakery', desc: 'The opening IS the marketing, and the first week decides the next year.', flags: { footfall: true, tasting: true } },
          { id: 'clinic', emoji: '🩺', name: 'A clinic, lab or pharmacy', desc: 'Quieter and more formal — a chief guest, a lamp, and a professional guest list.', flags: { formal: true } },
          { id: 'office', emoji: '🏢', name: 'An office or a new branch', desc: 'A homa, the team, and a photograph for the company page.', flags: { formal: true } },
          { id: 'factory', emoji: '🏭', name: 'A factory, warehouse or workshop', desc: 'A machine pooja as much as an opening, and the staff are the guests.', flags: { formal: true, industrial: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'The homa',
        emoji: '🙏',
        question: 'Which rite is being performed?',
        why: 'A Ganapati homa before the shutter goes up is standard, and for a factory there is usually a machine or yantra pooja as well. The muhurtham for it is what the entire morning is built around.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is doing it',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri and the homa setup?',
        why: 'Delivered to a premises with no cupboards, no kitchen and quite possibly no water yet. That is the actual difficulty, and it is why this is worth handing over.',
        packIds: ['pooja_basic', 'pooja_homam_kit', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'We are arranging it',
      }),
      svc({
        serviceId: 'inauguration',
        title: 'The ribbon',
        emoji: '✂️',
        question: 'How is it being inaugurated?',
        why: 'The four minutes every photograph comes from. Without somebody whose job it is, this is three people holding scissors and nobody sure when to cut.',
        packIds: ['inaug_ribbon', 'inaug_full', 'inaug_chief_guest'],
        multi: true,
        recommend: { close: 'inaug_ribbon', family: 'inaug_ribbon', full_house: 'inaug_full', grand: 'inaug_full' },
        skipLabel: 'We will handle the ribbon ourselves',
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the opening?',
        why: 'Playing from before dawn until the shutter goes up. On a South Indian commercial street this is the sound that tells four hundred people something has opened.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe', 'shehnai_pair'],
        recommend: { close: 'nadaswaram_pair', family: 'nadaswaram_pair', full_house: 'nadaswaram_troupe', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'drum',
        title: 'The band',
        emoji: '🥁',
        question: 'A band on the pavement?',
        why: 'Pure footfall. Twenty minutes of chende or dhol outside a new shop pulls a crowd that a hoarding cannot, and the crowd is the point of the morning.',
        packIds: ['drum_dhol', 'drum_chende', 'drum_band'],
        recommend: { family: 'drum_dhol', full_house: 'drum_chende', grand: 'drum_band' },
        skipLabel: 'No band',
        showIf: ctx => !!ctx.flags.footfall,
      }),
      svc({
        serviceId: 'folk',
        title: 'The act',
        emoji: '🪗',
        question: 'A troupe or performers outside?',
        why: 'Dollu kunitha or a stilt walker at the door holds a pavement crowd for an hour rather than four minutes. For a showroom opening this is the single most effective spend on the page.',
        packIds: ['folk_south', 'folk_north', 'folk_mascot'],
        recommend: { full_house: 'folk_south', grand: 'folk_south' },
        skipLabel: 'No performers',
        showIf: ctx => ctx.flags.footfall || ctx.flags.grandOpen,
      }),
      svc({
        serviceId: 'signage',
        title: 'Branding',
        emoji: '🪧',
        question: 'Boards, standees and the hoarding?',
        why: 'The nameplate under a cloth, a welcome board at the door, the opening-offer standee inside, and the flex on the road. This is the part of the morning that is still working next week.',
        packIds: ['sign_welcome', 'sign_seating'],
        multi: true,
        recommend: { close: 'sign_welcome', family: 'sign_welcome', full_house: 'sign_welcome', grand: 'sign_welcome' },
        skipLabel: 'Our own printer is doing it',
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Sweet boxes for the street and the customers?',
        why: 'The biggest line on this page and the one everybody underestimates. Everybody who walks in on day one gets a box, and so does every shop on the street, and so does every customer for a week.',
        packIds: ['sweet_corporate', 'sweet_traditional', 'sweet_temple', 'sweet_premium'],
        multi: true,
        recommend: { close: 'sweet_traditional', family: 'sweet_corporate', full_house: 'sweet_corporate', grand: 'sweet_corporate' },
        skipLabel: 'We are ordering the sweets ourselves',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody on the mic?',
        why: 'To announce the muhurtham, introduce the chief guest, keep the pavement moving and read the opening offers out. Without one, a hundred people stand around waiting for something to be announced.',
        packIds: ['emcee_standard', 'emcee_corporate', 'emcee_full'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_corporate', grand: 'emcee_corporate' },
        skipLabel: 'We will manage',
      }),
      photography({
        question: 'Who is photographing the opening?',
        why: 'The ribbon, the chief guest, the first customer and the frontage — and every one of those goes straight onto a page, a poster and a WhatsApp status. This is marketing collateral, not memories.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'A one-minute reel of the shutter going up, the crowd, and the first sale. It is the launch advertisement, and it costs less than one hoarding.',
        packIds: ['video_invite', 'video_event', 'video_cinematic'],
        recommend: { close: 'video_invite', family: 'video_invite', full_house: 'video_event', grand: 'video_cinematic' },
      }),
      svc({
        serviceId: 'drone',
        title: 'Aerial',
        emoji: '🚁',
        question: 'A drone pass over the frontage?',
        why: 'Worth it only for a large showroom, a factory, or a frontage with a real crowd outside it. In a narrow commercial street it cannot fly, and we will tell you that rather than take the money.',
        packIds: ['drone_basic', 'drone_full'],
        recommend: { grand: 'drone_basic' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.grandOpen || ctx.flags.industrial,
      }),
      svc({
        serviceId: 'gifting',
        title: 'Gifting',
        emoji: '🎀',
        question: 'Hampers for the chief guest and the first customers?',
        why: 'Somebody was asked to cut the ribbon, and somebody was the first sale. Both should leave with something, and neither should be handed the same box as the street.',
        packIds: ['hamper_festive', 'hamper_corporate', 'hamper_luxury'],
        recommend: { family: 'hamper_festive', full_house: 'hamper_corporate', grand: 'hamper_luxury' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'hospitality',
        title: 'Front of house',
        emoji: '🙋',
        question: 'Ushers and a reception desk?',
        why: 'On day one your own staff are still learning the shop. Somebody else should be receiving guests, collecting numbers and pointing people at the counter.',
        packIds: ['hosp_ushers', 'hosp_guest_manager', 'hosp_cloakroom'],
        recommend: { full_house: 'hosp_ushers', grand: 'hosp_guest_manager' },
        skipLabel: 'Our team will handle it',
      }),
      svc({
        serviceId: 'bouncers',
        // Its own id, because `groundwork` further down carries a `bouncers`
        // chapter too and two chapters cannot share one.
        id: 'pavement_crowd',
        title: 'Crowd',
        emoji: '🛡️',
        question: 'Somebody managing the pavement?',
        why: 'A queue outside a new shop is the goal and also the problem — it blocks the neighbours’ doors and the road. Two marshals is the difference between a crowd and a complaint.',
        packIds: ['sec_guard', 'sec_bouncer', 'sec_ladies'],
        recommend: { full_house: 'sec_guard', grand: 'sec_bouncer' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.flags.footfall || ctx.guests >= 150,
      }),
      invitations({ why: 'A printed card for the trade and the chief guest, and a digital one for everybody else. Both need to carry the muhurtham time, not just the date.' }),
      ...groundworkWithout('bouncers'),
      cleanup({ why: 'The homa ash, the arch, the flowers and four hundred tea cups — off a pavement you have to trade on tomorrow morning.' }),
    ],
  },

  /* ═════════════════════ BHOOMI POOJA ════════════════════════════════
     The rite that starts a house, and the hardest function in the whole
     catalogue to actually hold — because it is held on a bare plot.

     There is no shade, no power, no water, no washroom and no parking, and
     the guests are the family elders. Every generic flow treats those as
     optional extras behind a guest-count gate. Here they ARE the event, so
     the venue answer marks the site as outdoors and the groundwork chapters
     come up for everybody rather than for the large ones only. */
  bhoomi_pooja: {
    id: 'bhoomi_pooja',
    opening: 'Let’s get the ground-breaking right — starting with the shade.',
    promise: 'Thirteen or so questions, most of them about things nobody thinks of until the morning. No price until the end.',
    cuisineLead: ['karnataka', 'udupi', 'tamil', 'andhra', 'jain_satvik'],
    vegDefault: true,
    venue: {
      question: 'The pooja is on the site. Where does everybody eat?',
      why: 'A bhoomi pooja happens on the plot — that is the entire ceremony, so we have not asked. What genuinely varies is what happens at eleven o’clock, when forty relatives are standing on rubble in the sun and are hungry.',
      fixed: {
        id: 'the_site',
        emoji: '🧱',
        name: 'On the site itself',
        desc: 'We visit the plot beforehand and plan what has to be carried in: shade, seating, water, power and a washroom. This is the only occasion in the catalogue with none of those already there.',
        includes: [
          'Site visit and an access check for a tempo',
          'Levelling and clearing where the homa will sit',
          'Shade, water and seating planned for the guest count',
          'Everything carried in and carried out the same day',
        ],
      },
      options: [
        {
          id: 'the_site',
          emoji: '⛺',
          name: 'Everything on the site, under a pandal',
          desc: 'A shamiana over the pooja and the seating, a temporary kitchen at the edge, and the meal served on the plot. The traditional answer.',
          outdoor: true,
          includes: ['Pandal over the rite and the dining', 'Temporary kitchen and water supply', 'Portable washroom for the elders', 'Full clear-down before dusk'],
        },
        {
          id: 'home_after',
          emoji: '🏠',
          name: 'Pooja on the site, lunch at home',
          desc: 'The rite on the plot, then everybody drives to the house. Simplest if the site is close and the guest list is small.',
          outdoor: true,
          includes: ['Rite and seating on the plot only', 'Guests directed to the house afterwards', 'Meal arranged at the house', 'One timeline across both ends'],
        },
        {
          id: 'hall_nearby',
          emoji: '🍽️',
          name: 'Pooja on the site, lunch at a hall nearby',
          desc: 'For a large family, or a plot with no vehicle access. We find a hall within a few minutes and run both ends on one clock.',
          outdoor: true,
          includes: ['Hall shortlisted near the site', 'Rate negotiated and booked', 'Transport between the two arranged', 'Both ends coordinated'],
        },
      ],
      packIds: [],
      footnote: 'No banquet halls or resorts as the venue — the rite is the ground itself.',
    },
    core: ['priest', 'pooja', 'dining', 'photography'],
    decor: decorOwn({
      question: 'What is being set up on the plot?',
      why: 'There is nothing here. No walls, no shade, no power and no floor — so "decoration" on a bhoomi pooja means the structure the rite happens under, and it is the difference between a ceremony and forty people standing on rubble in the sun.',
      options: [
        {
          id: 'rite_corner',
          emoji: '🪔',
          name: 'The homa corner only',
          desc: 'The kunda area levelled, laid out and decorated, with a small canopy over it and the kalasha dressed. For a rite with fifteen people.',
          includes: ['Kunda area levelled and laid out', 'Small canopy over the rite', 'Kalasha and samagri arrangement dressed', 'Everything carried in and out the same day'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'pandal',
          emoji: '⛺',
          name: 'A pandal over the rite and the guests',
          desc: 'A shamiana covering the ceremony and the seating, draped and floral, with the approach from the road marked.',
          includes: ['Shamiana over the rite and the seating', 'Draping and floral work at the kunda', 'Approach path from the road marked and dressed', 'Seating laid out under cover'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
        {
          id: 'full_site',
          emoji: '🏗️',
          name: 'The whole site set up',
          desc: 'For a commercial ground-breaking with contractors and staff — pandal, a stage, branding, and a dining area on the plot.',
          includes: ['Large pandal over rite, seating and dining', 'Stage and branded backdrop', 'Site signage and safety marking', 'Full dining area on the plot', 'Designer and site visit before the day'],
          levelId: 'signature',
          themeId: 'white_gold',
        },
      ],
      skipLabel: 'The contractor is putting up the shamiana',
    }),
    chapters: [
      ask({
        id: 'rite',
        title: 'The rite',
        emoji: '🧱',
        question: 'Which rite is being performed?',
        why: 'It sets the length of the morning, the samagri list, and how much of a structure has to be standing before anybody arrives.',
        options: [
          { id: 'bhoomi', emoji: '🪔', name: 'Bhoomi pooja / ground-breaking', desc: 'The nagara pratishtha, the first dig, and the kalasha. Two hours or so.', flags: {} },
          { id: 'shilanyas', emoji: '🧱', name: 'Shilanyas / foundation stone', desc: 'The first stone laid in the foundation trench, usually with the whole family present.', flags: { extended: true } },
          { id: 'vaastu', emoji: '🧭', name: 'Vaastu shanti before construction', desc: 'A fuller homa, run by a vaastu-following purohit, before any digging starts.', flags: { homa: true, extended: true } },
          { id: 'commercial', emoji: '🏗️', name: 'A commercial or apartment project', desc: 'Contractors, engineers and staff as well as family. A working site with a ceremony on it.', flags: { homa: true, commercial: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting it?',
        why: 'A purohit who will read the plot against your family tradition and the vaastu, confirm the muhurtham, and tell you which corner the first dig goes in. That last one is not a detail to guess at.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_homam', full_house: 'priest_homam', grand: 'priest_homam' },
        skipLabel: 'Our family purohit is coming',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'Samagri, kalasha and the homa setup?',
        why: 'Navadhanya, the copper kalasha, the silver naga, bricks, cement for the first stone, mango leaves, and the whole list — carried to a plot with nothing on it. There is no shop to run to.',
        packIds: ['pooja_basic', 'pooja_homam_kit', 'pooja_annadanam'],
        recommend: { close: 'pooja_basic', family: 'pooja_homam_kit', full_house: 'pooja_homam_kit', grand: 'pooja_homam_kit' },
        skipLabel: 'The family is arranging it',
      }),
      dining({
        why: 'On a plot this is not a preference — it is whether there is anywhere at all to sit. Floor seating under a pandal is the traditional answer and it works; a standing buffet on rubble does not.',
        packIds: ['dining_floor', 'dining_leaf', 'dining_round', 'dining_buffet_standing'],
        recommend: { close: 'dining_floor', family: 'dining_floor', full_house: 'dining_leaf', grand: 'dining_leaf' },
      }),
      svc({
        serviceId: 'nadaswaram',
        title: 'Mangala vadya',
        emoji: '🪈',
        question: 'Nadaswaram for the first dig?',
        why: 'Playing as the ground is broken. On an empty plot with no walls it is the only thing that makes the moment feel like a ceremony rather than a site visit.',
        packIds: ['nadaswaram_pair', 'nadaswaram_troupe'],
        recommend: { family: 'nadaswaram_pair', full_house: 'nadaswaram_pair', grand: 'nadaswaram_troupe' },
        skipLabel: 'Not this time',
      }),
      photography({
        question: 'Who is photographing the first dig?',
        why: 'The photograph that goes at the front of the album you make when the house is finished — the family standing on bare ground, three years before it is a house.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'Short. The homa, the first dig, and the blessings — not the whole morning.',
        packIds: ['video_invite', 'video_event'],
        recommend: { family: 'video_invite', full_house: 'video_event', grand: 'video_event' },
      }),
      svc({
        serviceId: 'drone',
        title: 'Aerial',
        emoji: '🚁',
        question: 'A drone shot of the plot?',
        why: 'The one occasion where a drone genuinely earns its place — an overhead of the empty plot, taken once, which cannot ever be taken again once the foundation goes in.',
        packIds: ['drone_basic', 'drone_full'],
        recommend: { family: 'drone_basic', full_house: 'drone_basic', grand: 'drone_full' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Sweets for the workers and the neighbours?',
        why: 'The mason, the contractor and his crew are at this ceremony, and they will be on this site for two years. This is the first thing you ever give them.',
        packIds: ['sweet_traditional', 'sweet_temple', 'sweet_premium'],
        recommend: { close: 'sweet_temple', family: 'sweet_traditional', full_house: 'sweet_traditional', grand: 'sweet_premium' },
        skipLabel: 'We will arrange them',
      }),
      returnGifts({
        why: 'A small thing for the family who came and stood in the sun. Modest — this is a beginning, not a celebration of anything finished.',
        packIds: ['gift_budget', 'gift_mid'],
        recommend: { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
      }),
      svc({
        serviceId: 'transport',
        title: 'Getting there',
        emoji: '🚌',
        question: 'How is everybody reaching the site?',
        why: 'A plot on the edge of the city, an unmade approach road, and forty relatives who have never been there. One vehicle from the house beats twelve cars and four phone calls asking for the location.',
        packIds: ['trans_tempo', 'trans_bus', 'trans_cabs'],
        recommend: { family: 'trans_tempo', full_house: 'trans_bus', grand: 'trans_bus' },
        skipLabel: 'Everybody is making their own way',
        showIf: ctx => ctx.guests >= 40,
      }),
      invitations({ why: 'Digital only, in practice — the muhurtham is confirmed a week out, and the location needs a map pin far more than it needs a card.' }),
      ...groundwork,
      cleanup({ why: 'A homa kunda, a pandal and a hundred leaves, off a plot that has to be handed to a contractor on Monday.' }),
    ],
  },

  /* ═════════════ AKSHARABHYASA / VIDYARAMBHAM ════════════════════════
     The smallest occasion in the catalogue, deliberately kept that way.

     A child is shown the first letter — usually on Vijayadashami morning,
     at a temple or in front of the house lamp, in about twenty minutes. The
     temptation is to inflate it into a party; the honest flow is eight
     questions and a short one. A family that wanted a party would have
     tapped Birthday. */
  aksharabhyasa: {
    id: 'aksharabhyasa',
    opening: 'Let’s keep this one small and get it right.',
    promise: 'Eight or nine questions, and most families skip half of them. The price comes at the end.',
    cuisineLead: ['karnataka', 'udupi', 'kerala', 'tamil', 'jain_satvik'],
    vegDefault: true,
    venue: {
      question: 'Where is the aksharabhyasa?',
      why: 'Almost always the temple or the house lamp — and on Vijayadashami the temple will have a queue of forty families behind you. Which one decides whether we are booking a slot or bringing a purohit to your door.',
      options: [
        atTemple('Vijayadashami morning at the temple, with a hundred other families. We book the slot early and hold your place.'),
        atHome('In front of the lamp at home, with a purohit and the grandparents. Quieter, and you keep your own timing.'),
        alreadyBooked(),
      ],
      packIds: ['venue_community'],
      footnote: 'No halls, lawns or resorts — this is a twenty-minute rite, not a function.',
    },
    food: mealOptional({
      question: 'Is there a lunch afterwards?',
      why: 'Most families do this before school and eat at home. Some make a lunch of it for the grandparents. There is no expectation either way, and saying so now saves you four screens.',
      yes: { name: 'Yes — a lunch for the family', desc: 'A meal at home or a hall afterwards. We will plan the spread.' },
      no: { name: 'No — the rite, and home', desc: 'Prasada, and back to a normal day. Skip the menu.' },
    }),
    // Three. This is a twenty-minute rite before school, and a family that
    // wanted a party would have tapped Birthday.
    core: ['priest', 'pooja', 'photography'],
    decor: decorOwn({
      question: 'Is anything being set up?',
      why: 'Most families do this in front of the lamp they already have. If you want anything at all it is a clean corner, flowers, and the slate and rice tray laid out properly — and it is completely normal to want none of it.',
      options: [
        {
          id: 'corner',
          emoji: '🪔',
          name: 'The pooja corner, laid out',
          desc: 'Flowers, the lamp dressed, the Saraswati photograph framed, and the slate and rice tray arranged for the photograph.',
          includes: ['Floral work at the pooja corner', 'Lamp and Saraswati frame dressed', 'Slate and rice tray arranged', 'Rangoli at the door'],
          levelId: 'home_touch',
          themeId: 'marigold_temple',
        },
        {
          id: 'room',
          emoji: '🌼',
          name: 'The corner and a small backdrop',
          desc: 'The above, plus a backdrop for the family photograph and seating for the grandparents. For a morning you are making a lunch of.',
          includes: ['Everything in the corner setup', 'Small backdrop for the family photograph', 'Seating arrangement for the elders', 'Warm lighting'],
          levelId: 'classic',
          themeId: 'marigold_temple',
        },
      ],
      skipLabel: 'Nothing — the lamp at home is enough',
    }),
    chapters: [
      ask({
        id: 'occasion',
        title: 'The day',
        emoji: '✏️',
        question: 'When is it being done?',
        why: 'Vijayadashami is the traditional day and also the busiest morning of the year at every temple in the state. If that is your date, the arrangements have to be made differently — and earlier.',
        options: [
          { id: 'vijayadashami', emoji: '🪔', name: 'On Vijayadashami', desc: 'The traditional morning. Every temple is full, and slots go weeks ahead.', flags: { busy: true } },
          { id: 'muhurtham', emoji: '📅', name: 'On a muhurtham our purohit gives', desc: 'A quieter day chosen for the child. Everything about it is easier.', flags: {} },
          { id: 'school', emoji: '🎒', name: 'Before the first day of school', desc: 'Tied to the admission rather than the calendar, and usually at home.', flags: { home: true } },
        ],
      }),
      svc({
        serviceId: 'priest',
        title: 'Purohit',
        emoji: '🙏',
        question: 'Who is conducting it?',
        why: 'Twenty minutes of it, and it wants somebody who will sit at the child’s level and not rush. On Vijayadashami a temple purohit has forty families to get through, which is worth knowing before you choose.',
        packIds: ['priest_home_pooja', 'priest_homam'],
        recommend: { close: 'priest_home_pooja', family: 'priest_home_pooja', full_house: 'priest_home_pooja', grand: 'priest_home_pooja' },
        skipLabel: 'The temple priest is doing it',
      }),
      svc({
        serviceId: 'pooja',
        title: 'Samagri',
        emoji: '🪔',
        question: 'The slate, the rice tray and the samagri?',
        why: 'A slate and chalk, a tray of raw rice, a new book, the Saraswati photograph, flowers and the lamp. Small things, every one of which somebody has to buy the evening before.',
        packIds: ['pooja_basic', 'pooja_homam_kit'],
        recommend: { close: 'pooja_basic', family: 'pooja_basic', full_house: 'pooja_basic', grand: 'pooja_basic' },
        skipLabel: 'We have everything',
      }),
      photography({
        question: 'Who is photographing the first letter?',
        why: 'A hand over a hand, writing "Om" in rice. It takes four seconds, both parents are holding the child, and it is the only photograph anybody wants from this morning.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_half_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'Ninety seconds of it, if you want it at all. Most families do not, and that is a perfectly good answer.',
        packIds: ['video_invite', 'video_event'],
        recommend: { family: 'video_invite', full_house: 'video_invite', grand: 'video_event' },
      }),
      svc({
        serviceId: 'bhajan',
        title: 'Devotional',
        emoji: '🎼',
        question: 'A Saraswati bhajan sitting?',
        why: 'Only if you are making a morning of it at home with the grandparents. At the temple there is already more sound than anybody needs.',
        packIds: ['bhajan_carnatic', 'bhajan_mandali'],
        recommend: { grand: 'bhajan_carnatic' },
        skipLabel: 'Not needed',
        showIf: ctx => !!ctx.flags.home || ctx.guests >= 40,
      }),
      svc({
        serviceId: 'sweets',
        title: 'Sweets',
        emoji: '🍬',
        question: 'Prasada and sweets to hand out?',
        why: 'Kesari bath at the temple gate and a box to the neighbours. That is the whole extent of it, and it is enough.',
        packIds: ['sweet_temple', 'sweet_traditional'],
        recommend: { close: 'sweet_temple', family: 'sweet_temple', full_house: 'sweet_traditional', grand: 'sweet_traditional' },
        skipLabel: 'We will buy them ourselves',
      }),
      returnGifts({
        why: 'A pencil box, a slate or a small book for the cousins who came. Nothing more is expected at this one.',
        packIds: ['gift_kids', 'gift_budget'],
        recommend: { close: 'gift_kids', family: 'gift_kids', full_house: 'gift_budget', grand: 'gift_budget' },
      }),
      cleanup({ why: 'Only if you have made a lunch of it. Otherwise there is genuinely nothing to clear, and you should skip this.' }),
    ],
  },

  /* ══════════════════════ HALDI & MEHENDI ════════════════════════════
     Treated as a line inside the sangeet until now, which is how a family
     ends up with a sangeet stage and no marigold. Haldi is a separate
     morning with its own decor language — matkas, marigold, yellow, floor
     seating, water — its own dress code, and one quite specific problem:
     everything gets ruined, including the venue, including the lens. */
  haldi: {
    id: 'haldi',
    opening: 'Let’s plan the haldi morning — and where the turmeric ends up.',
    promise: 'Around fourteen questions. Nothing is booked, and the price comes at the end.',
    cuisineLead: ['north_indian', 'karnataka', 'chaat_street', 'gujarati_rajasthani', 'multi_cuisine'],
    vegDefault: true,
    venue: anywhere({
      why: 'Haldi ruins floors, and every banquet hall in the country knows it — many will not allow it indoors at all, and the rest charge for the cleaning. A terrace or a lawn is the honest answer, and we read the venue’s rules before booking anything.',
      homeDesc: 'The terrace, the compound or the garden. Easiest by a distance, because it is your own floor.',
      packIds: ['venue_lawn', 'venue_resort', 'venue_community', 'venue_banquet'],
    }),
    core: ctx => {
      if (ctx.flags.haldi && ctx.flags.mehendi) return ['mehendi', 'dining', 'drum', 'photography', 'videography']
      if (ctx.flags.mehendi) return ['mehendi', 'dining', 'live_counters', 'photography']
      return ['dining', 'drum', 'photography', 'videography']
    },
    decor: ctx => (ctx.flags.mehendi && !ctx.flags.haldi
      ? decorOwn({
        question: 'How is the mehendi being set up?',
        why: 'A mehendi is forty women sitting still for two hours with their hands out. What the decoration has to provide is somewhere comfortable to sit, light the artists can actually work in, and a wall the cousins photograph against.',
        options: [
          {
            id: 'seating',
            emoji: '🪷',
            name: 'Low seating and good light',
            desc: 'Cushions and low tables for the artists and the guests, warm working light, and a floral corner.',
            includes: ['Cushioned low seating and mats', 'Low tables for the artists', 'Warm working light where they sit', 'Floral corner for photographs'],
            levelId: 'home_touch',
            themeId: 'marigold_temple',
          },
          {
            id: 'full_mehendi',
            emoji: '🌼',
            name: 'A full mehendi setup',
            desc: 'The seating and light, plus a marigold canopy, a decorated seat for the bride, a photo wall and a paan or chaat corner dressed.',
            includes: ['Marigold canopy over the seating', 'Decorated bridal seat', 'Marigold photo wall', 'Counter and food area styling', 'Ambient and working lighting'],
            levelId: 'classic',
            themeId: 'marigold_temple',
          },
        ],
        skipLabel: 'No decoration — just the artists',
      })
      : decorOwn({
        question: 'How is the haldi being set up?',
        why: 'A haldi has its own decor language and it is nothing like a sangeet: matkas, marigold curtains, low seating, yellow, and a floor that is allowed to be ruined. A draped stage would be in the wrong place all morning.',
        options: [
          {
            id: 'marigold',
            emoji: '💛',
            name: 'Marigold, matkas and a seat',
            desc: 'Marigold curtains and strings, painted matkas, a decorated low seat, and the floor covered so nobody is paying for it later.',
            includes: ['Marigold curtains and hanging strings', 'Painted matkas and traditional props', 'Decorated low seat for the couple', 'Floor covering across the haldi area', 'Cleared the same day'],
            levelId: 'home_touch',
            themeId: 'marigold_temple',
          },
          {
            id: 'full_haldi',
            emoji: '🌼',
            name: 'The whole morning set up',
            desc: 'The marigold work, plus a canopy, a photo wall, the food counters dressed and seating for the guests who are staying dry.',
            includes: ['Everything in the marigold setup', 'Canopy over the haldi area', 'Marigold photo wall with props', 'Counter and food area styling', 'Guest seating away from the splash'],
            levelId: 'classic',
            themeId: 'marigold_temple',
          },
          {
            id: 'designed_haldi',
            emoji: '✨',
            name: 'Designed by a stylist',
            desc: 'For a lawn haldi with three hundred guests — a designer builds the whole yellow world, entrance to photo corner.',
            includes: ['Designed entrance and canopy installation', 'Full marigold and floral installation', 'Photo installation and swing', 'Lounge seating and counter styling', 'Designer visit before the day'],
            levelId: 'signature',
            themeId: 'marigold_temple',
          },
        ],
        skipLabel: 'The family is doing the decoration',
      })),
    chapters: [
      ask({
        id: 'functions',
        title: 'Which',
        emoji: '💛',
        question: 'Which functions are we planning?',
        why: 'Haldi and mehendi are often the same morning and often two different days. They need completely different setups — one is wet and yellow, the other needs good light and somewhere for forty women to sit still for two hours.',
        multi: true,
        options: [
          { id: 'haldi', emoji: '💛', name: 'Haldi', desc: 'Morning, outdoors, marigold and matkas, and everybody in yellow.', flags: { haldi: true, messy: true } },
          { id: 'mehendi', emoji: '🪷', name: 'Mehendi', desc: 'Afternoon into evening — seating, light, and artists working right through it.', flags: { mehendi: true, seated: true } },
          { id: 'both', emoji: '🌼', name: 'Both, on the same day', desc: 'Haldi in the morning, mehendi after lunch, one setup that has to do both.', flags: { haldi: true, mehendi: true, messy: true, seated: true } },
        ],
      }),
      svc({
        serviceId: 'mehendi',
        title: 'Mehendi',
        emoji: '🪷',
        question: 'How many artists do you need?',
        why: 'This is arithmetic rather than taste: one artist does about six pairs of hands an hour. Forty women and two artists is a queue that is still going at midnight — and the bride’s own mehendi takes four hours on its own.',
        packIds: ['mehendi_bridal', 'mehendi_guest', 'mehendi_premium'],
        multi: true,
        recommend: { close: 'mehendi_bridal', family: 'mehendi_bridal', full_house: 'mehendi_premium', grand: 'mehendi_premium' },
        skipLabel: 'No mehendi at this function',
        showIf: ctx => !!ctx.flags.mehendi,
      }),
      svc({
        serviceId: 'makeup',
        title: 'Getting ready',
        emoji: '💄',
        question: 'Makeup for the morning?',
        why: 'A haldi look has to survive turmeric and photograph well doing it, which is a different job from a bridal trial. Most stylists price it inside a multi-day package, and that is usually the cheaper way round.',
        packIds: ['makeup_guest', 'makeup_bridal', 'makeup_multi_day'],
        recommend: { close: 'makeup_guest', family: 'makeup_bridal', full_house: 'makeup_multi_day', grand: 'makeup_multi_day' },
        skipLabel: 'Already arranged with the bridal team',
      }),
      dining({
        why: 'A haldi crowd eats standing, in the garden, out of a bowl, with turmeric on their hands. A mehendi crowd cannot use their hands at all for two hours — which is a genuine catering problem, and one we plan around.',
        packIds: ['dining_lounge', 'dining_floor', 'dining_buffet_standing', 'dining_round'],
        recommend: { close: 'dining_floor', family: 'dining_lounge', full_house: 'dining_lounge', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'live_counters',
        title: 'Counters',
        emoji: '🥘',
        question: 'Live counters for the morning?',
        why: 'A chaat counter and a dosa counter is exactly right for a function where people eat in stages across four hours rather than sitting down at once. It is also the only food that survives a mehendi queue.',
        packIds: ['counter_chaat', 'counter_dosa', 'counter_grill', 'counter_pasta_global'],
        multi: true,
        recommend: { family: 'counter_chaat', full_house: 'counter_chaat', grand: 'counter_chaat' },
        skipLabel: 'The main spread is enough',
      }),
      svc({
        serviceId: 'ice_cream',
        title: 'Something cold',
        emoji: '🍦',
        question: 'An ice cream or paan counter?',
        why: 'A haldi is a hot morning outdoors, and this is the counter people actually queue at. A paan counter at the end of a mehendi is the traditional close.',
        packIds: ['dessert_icecream', 'dessert_paan', 'dessert_candy_cart', 'dessert_nitrogen'],
        multi: true,
        recommend: { family: 'dessert_icecream', full_house: 'dessert_icecream', grand: 'dessert_paan' },
        skipLabel: 'Not needed',
      }),
      svc({
        serviceId: 'drum',
        title: 'The dhol',
        emoji: '🥁',
        question: 'Dhol for the haldi?',
        why: 'The single most important booking of the morning, and the cheapest. A haldi without a dhol is forty people politely applying turmeric; with one it is the function everybody remembers from the entire wedding.',
        packIds: ['drum_dhol', 'drum_chende', 'drum_band'],
        recommend: { close: 'drum_dhol', family: 'drum_dhol', full_house: 'drum_dhol', grand: 'drum_band' },
        skipLabel: 'No dhol',
        showIf: ctx => !!ctx.flags.haldi,
      }),
      svc({
        serviceId: 'dj',
        title: 'Music',
        emoji: '🎵',
        question: 'Sound for the rest of it?',
        why: 'Something to carry the four hours the dhol is not playing. A small rig outdoors, not a sangeet rig — this is a morning function, and the neighbours have not been invited.',
        packIds: ['dj_house', 'dj_standard'],
        recommend: { close: 'dj_house', family: 'dj_house', full_house: 'dj_standard', grand: 'dj_standard' },
        skipLabel: 'A speaker and a playlist is fine',
      }),
      svc({
        serviceId: 'folk',
        title: 'The act',
        emoji: '🪗',
        question: 'A folk troupe?',
        why: 'Dollu kunitha, a lavani troupe or a bhangra group for twenty minutes. It gives the morning a shape and gets the older relatives out of their chairs, which nothing else on this page does.',
        packIds: ['folk_south', 'folk_north'],
        recommend: { full_house: 'folk_north', grand: 'folk_north' },
        skipLabel: 'No performers',
        showIf: ctx => ctx.guests >= 100,
      }),
      photography({
        question: 'Who is photographing the haldi?',
        why: 'The best photographs of the entire wedding come from this morning — the light is right, nobody is posing, and everybody is laughing. It also destroys a lens, so book somebody who expects that.',
        packIds: ['photo_half_day', 'photo_full_day', 'photo_wedding_full'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'The haldi reel is the one that gets posted the same evening, before the wedding has even happened.',
        packIds: ['video_invite', 'video_event', 'video_cinematic'],
        recommend: { close: 'video_invite', family: 'video_event', full_house: 'video_cinematic', grand: 'video_cinematic' },
      }),
      svc({
        serviceId: 'drone',
        title: 'Aerial',
        emoji: '🚁',
        question: 'A drone over the haldi?',
        why: 'One overhead of everybody in yellow around the bride. It is a shot that only works outdoors, and only works at this function.',
        packIds: ['drone_basic', 'drone_full'],
        recommend: { full_house: 'drone_basic', grand: 'drone_basic' },
        skipLabel: 'Not needed',
        showIf: ctx => ctx.outdoor,
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo corner',
        emoji: '🤳',
        question: 'A corner for the cousins?',
        why: 'A marigold wall and a set of props. At a mehendi, where half the guests are sitting still with their hands out, it is the only thing the other half can do.',
        packIds: ['booth_classic', 'booth_360', 'booth_mirror'],
        recommend: { full_house: 'booth_classic', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      returnGifts({
        why: 'A potli, bangles, or a small favour for the women. At a mehendi specifically this is expected rather than optional.',
        packIds: ['gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
      }),
      invitations({ why: 'Usually one card covering all the pre-wedding functions, with the haldi timing on it — which people do miss, because it is the one that starts at eight in the morning.' }),
      ...groundwork,
      cleanup({ why: 'Turmeric on a floor, marigold everywhere, and a venue that will charge you for both if it is still there tomorrow. The one occasion where the deep clean is genuinely not optional.' }),
    ],
  },

  /* ═══════════════════════ FAREWELL ══════════════════════════════════
     The occasion nobody plans and everybody attends: the dinner before a
     flight. A son leaving for a master's abroad, a family moving cities, a
     colleague transferring, parents closing a house after thirty years.

     Emotionally the heaviest evening in this catalogue and structurally the
     simplest — one room, one meal, and a way for people to say something.
     Everything in this flow is built around that last part, because it is
     the part that always gets forgotten and is always the reason the
     evening happened at all. */
  farewell: {
    id: 'farewell',
    opening: 'Let’s make the last evening worth the trouble.',
    promise: 'Twelve or so questions, and you can skip most of them. The price comes once, at the end.',
    cuisineLead: ['north_indian', 'karnataka', 'indo_chinese', 'multi_cuisine', 'chaat_street'],
    vegDefault: false,
    venue: anywhere({
      why: 'A farewell is an evening of people talking to one person. A room that is too big for the number, or too loud, is the one thing that stops that happening — so this answer matters more here than the size of it does.',
      homeDesc: 'The house that is being packed up, or the terrace. For a family send-off this is almost always the right answer.',
      packIds: ['venue_banquet', 'venue_community', 'venue_resort', 'venue_lawn'],
      extra: [atOffice('The office, the cafeteria, or a floor cleared for the evening — for a colleague’s send-off.')],
    }),
    core: ctx => (ctx.flags.speeches || ctx.flags.office
      ? ['dining', 'memory_wall', 'av_setup', 'emcee', 'photography', 'gifting']
      : ['dining', 'memory_wall', 'cake', 'photography', 'gifting']),
    decor: decorOwn({
      question: 'How is the room being set up?',
      why: 'The decoration on this evening has one job: give people somewhere to stand together and something to stand in front of. A stage would put the person leaving on the wrong side of the room.',
      options: [
        {
          id: 'wall_lights',
          emoji: '🖼️',
          name: 'The memory wall and warm light',
          desc: 'The photo wall mounted and lit properly, festoon lighting across the room, and the table dressed.',
          includes: ['Memory wall mounting and lighting', 'Festoon or fairy lighting', 'Dining and cake table styling', 'Setup and clearing by our team'],
          levelId: 'home_touch',
          themeId: 'white_gold',
        },
        {
          id: 'styled',
          emoji: '✨',
          name: 'The room styled around it',
          desc: 'The wall and the lighting, plus a photo corner, table styling and a small front of the room for the speeches.',
          includes: ['Everything in the memory wall setup', 'Photo corner with a guest book', 'Full table styling and linen', 'Small backdrop for the speeches', 'Ambient lighting through the room'],
          levelId: 'classic',
          themeId: 'white_gold',
        },
      ],
      skipLabel: 'No decoration — just the room',
    }),
    chapters: [
      ask({
        id: 'kind',
        title: 'The send-off',
        emoji: '✈️',
        question: 'Who is leaving, and where to?',
        why: 'A student flying out for a master’s and a colleague transferring branches are two completely different evenings — one has grandparents crying at a dining table, the other has forty people in a booked restaurant. The rest of this flow follows from which.',
        options: [
          { id: 'abroad', emoji: '🎓', name: 'Going abroad to study', desc: 'The whole family comes, the grandparents especially, and it runs long.', flags: { family: true, emotional: true } },
          { id: 'work_abroad', emoji: '🌍', name: 'Moving abroad for work', desc: 'Family and friends together, usually a weekend, usually a proper dinner.', flags: { family: true, emotional: true } },
          { id: 'city', emoji: '🚚', name: 'Moving to another city', desc: 'A house being packed up, and the neighbours who want to say goodbye.', flags: { family: true } },
          { id: 'colleague', emoji: '💼', name: 'A colleague leaving the team', desc: 'The office send-off — speeches, a memento, and dinner somewhere booked.', flags: { office: true, speeches: true } },
          { id: 'elders_move', emoji: '🏡', name: 'Parents moving to be with family', desc: 'A house being closed after thirty years, and the whole street invited.', flags: { family: true, emotional: true, elder: true } },
        ],
      }),
      dining({
        why: 'The room decides whether people talk to each other or eat in a queue. For an evening whose entire purpose is people saying things to one person, seated beats standing every single time.',
        packIds: ['dining_round', 'dining_lounge', 'dining_buffet_standing', 'dining_floor', 'dining_leaf'],
        recommend: { close: 'dining_round', family: 'dining_round', full_house: 'dining_buffet_standing', grand: 'dining_round' },
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'The years',
        emoji: '🖼️',
        question: 'A wall of photographs, or a film?',
        why: 'This is the thing that makes the evening. A timeline of somebody’s twenty-two years, or their eleven years on a team, is where everybody ends up standing and telling each other stories — and it is the one thing the person leaving actually takes with them.',
        packIds: ['memwall_string', 'memwall_timeline', 'memwall_tribute_film'],
        recommend: { close: 'memwall_string', family: 'memwall_timeline', full_house: 'memwall_timeline', grand: 'memwall_tribute_film' },
        skipLabel: 'Not this time',
      }),
      svc({
        serviceId: 'av_setup',
        title: 'For the speeches',
        emoji: '🖥️',
        question: 'A screen and a microphone?',
        why: 'Somebody has made a slideshow. Somebody else wants to say something and cannot be heard past the third table. Both of those are the reason the evening exists, and both need equipment.',
        packIds: ['av_basic', 'av_conference', 'av_hybrid'],
        recommend: { close: 'av_basic', family: 'av_basic', full_house: 'av_basic', grand: 'av_conference' },
        skipLabel: 'We will manage without',
      }),
      svc({
        serviceId: 'cake',
        title: 'Cake',
        emoji: '🎂',
        question: 'A cake to cut?',
        why: 'It gives the evening a moment with a time on it, which is what stops a farewell drifting into people quietly looking at their watches.',
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_tiered'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_photo', grand: 'cake_tiered' },
        skipLabel: 'No cake',
      }),
      svc({
        serviceId: 'emcee',
        title: 'Host',
        emoji: '🎙️',
        question: 'Somebody running the evening?',
        why: 'Without a host, the speeches either do not happen at all or all happen at once at half past eleven. With one, everybody who wanted to say something gets ninety seconds, and the evening ends on the right note.',
        packIds: ['emcee_standard', 'emcee_corporate', 'emcee_full'],
        recommend: { family: 'emcee_standard', full_house: 'emcee_standard', grand: 'emcee_corporate' },
        skipLabel: 'A friend is doing it',
        showIf: ctx => ctx.flags.speeches || ctx.guests >= 60,
      }),
      svc({
        serviceId: 'live_music',
        title: 'Music',
        emoji: '🎻',
        question: 'Live music through dinner?',
        why: 'A ghazal or a guitar duo at conversation volume. For an evening this heavy a DJ is the wrong instrument entirely — people came to talk.',
        packIds: ['music_ghazal_sufi', 'music_classical_duo', 'music_band'],
        recommend: { full_house: 'music_ghazal_sufi', grand: 'music_band' },
        skipLabel: 'No live music',
      }),
      svc({
        serviceId: 'dj',
        title: 'Later',
        emoji: '🎵',
        question: 'Music for after the speeches?',
        why: 'Once the serious part is over the friends will want an hour of it. A small rig, and only if the room is right for one.',
        packIds: ['dj_house', 'dj_standard'],
        recommend: { full_house: 'dj_house', grand: 'dj_standard' },
        skipLabel: 'A playlist is fine',
        showIf: ctx => !ctx.flags.elder,
      }),
      photography({
        question: 'Who is photographing the evening?',
        why: 'The last photograph of everybody in one room, which is exactly the one nobody remembers to take. In a year it is the only one anybody looks for.',
        packIds: ['photo_half_day', 'photo_full_day'],
        recommend: { close: 'photo_half_day', family: 'photo_half_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
      }),
      videography({
        why: 'The speeches, mostly. A recording of what people said is the thing that gets watched on a bad week eight thousand kilometres away.',
        packIds: ['video_event', 'video_cinematic'],
        recommend: { family: 'video_event', full_house: 'video_event', grand: 'video_cinematic' },
      }),
      svc({
        serviceId: 'livestream',
        title: 'For those away',
        emoji: '📡',
        question: 'Streaming it for family elsewhere?',
        why: 'At a farewell this is nearly always needed, because the family is already scattered — that is usually the reason somebody is leaving in the first place.',
        packIds: ['stream_single', 'stream_multi'],
        recommend: { family: 'stream_single', full_house: 'stream_single', grand: 'stream_multi' },
        skipLabel: 'Everybody will be here',
      }),
      svc({
        serviceId: 'photobooth',
        title: 'Photo corner',
        emoji: '🤳',
        question: 'A booth with a printer?',
        why: 'Instant prints, and a book everybody signs beside it. That book is the single most-kept object anybody has ever taken onto a flight.',
        packIds: ['booth_classic', 'booth_mirror', 'booth_360'],
        recommend: { family: 'booth_classic', full_house: 'booth_classic', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      svc({
        serviceId: 'gifting',
        title: 'The gift',
        emoji: '🎀',
        question: 'A gift or a memento?',
        why: 'It has to fit in a suitcase with a 23kg limit, which quietly rules out most of what people instinctively buy. We keep that in mind when we suggest.',
        packIds: ['hamper_festive', 'hamper_corporate', 'hamper_luxury'],
        recommend: { close: 'hamper_festive', family: 'hamper_festive', full_house: 'hamper_corporate', grand: 'hamper_luxury' },
        skipLabel: 'Already sorted',
      }),
      returnGifts({
        why: 'Only if it is a large evening. At a family send-off nobody expects to be given anything, and offering it can read oddly.',
        packIds: ['gift_budget', 'gift_mid'],
        recommend: { full_house: 'gift_budget', grand: 'gift_mid' },
      }),
      invitations({ why: 'Digital, and usually about four days out — because these are decided late, and the date moves with a visa or a joining letter.' }),
      ...groundwork,
      cleanup({ why: 'A house that is being packed up, or a hall that has to be handed back. Either way somebody is doing this at midnight.' }),
    ],
  },

}

/* ── Fallback ──────────────────────────────────────────────────────────
   An occasion with no blueprint of its own still gets a real journey
   rather than an apology. Nothing in the app should ever route somebody
   into an empty flow because a slug was added to EVENT_DATA and not
   here. */
export const GENERIC_BLUEPRINT = {
  id: 'generic',
  opening: 'Let’s build this one piece at a time.',
  promise: 'Skip anything you do not need. The price comes once, at the end.',
  cuisineLead: ['karnataka', 'north_indian', 'multi_cuisine', 'udupi', 'indo_chinese'],
  vegDefault: true,
  chapters: [
    dining({ why: 'How people sit to eat changes the whole feel of a function, and it is the first thing guests notice.' }),
    svc({
      serviceId: 'cake',
      title: 'Cake',
      emoji: '🎂',
      question: 'Is there a cake?',
      why: 'If there is a cutting moment, this is it.',
      packIds: allPacks('cake'),
      recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_tiered', grand: 'cake_tiered' },
      skipLabel: 'No cake',
    }),
    svc({
      serviceId: 'dj',
      title: 'Music',
      emoji: '🎵',
      question: 'What is the music?',
      why: 'Sized to the room, not to the wattage.',
      packIds: allPacks('dj'),
      recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_standard', grand: 'dj_premium' },
      skipLabel: 'A playlist is fine',
    }),
    photography({ why: 'Somebody has to be taking these, and it should not be a guest.' }),
    videography({ why: 'A short film gets watched. A folder of photographs gets opened once.' }),
    returnGifts({ why: 'A guest who leaves empty-handed notices.' }),
    invitations({ why: 'Digital reaches everybody the same evening; printed is what you hand over in person.' }),
    ...groundwork,
    cleanup({ why: 'Somebody is doing this at midnight. The only question is who.' }),
  ],
}

/** The blueprint for an occasion, always. */
export function blueprintFor(occasionId) {
  return BLUEPRINTS[occasionId] ?? { ...GENERIC_BLUEPRINT, id: occasionId ?? 'generic' }
}

/** Every gate in this file reads the same shape, whatever the caller passed. */
function safeCtx(ctx) {
  return { flags: {}, guests: 0, circleId: 'family', outdoor: false, venueKind: null, ...ctx }
}

/**
 * The chapters this particular customer should actually see, with their
 * options already narrowed to the answer they gave.
 *
 * Two jobs, and the second one is new.
 *
 * `showIf` decides WHETHER a chapter appears, which is what keeps a
 * thirty-guest birthday at home from being asked about generators and
 * ambulances. A chapter with no `showIf` is always shown.
 *
 * `packsFor` and `recommendFor` then decide WHAT IS ON IT. This is the part
 * that was missing: the flow correctly stopped offering a magician at a
 * sixtieth, and then offered that family the identical five cakes it offers a
 * four-year-old — a 1kg cream cake, a photo cake, a fondant cartoon cake, a
 * tiered cake and a dessert table. Two of those five are things nobody has
 * ever ordered for a shashtiabdapoorthi, and their presence on the card is
 * the app admitting it does not know whose birthday this is.
 *
 * So a chapter may declare `packIds` as the full set it could ever offer —
 * which is what scripts/check-celebration-journey.mjs validates, and it must
 * stay a plain array for that reason — and `packsFor(ctx)` as the subset that
 * is true for this answer. The result is filtered back against the declared
 * set, so a narrowing function can never smuggle in a pack the checker has
 * not seen, and an empty or unusable result falls back to the full list
 * rather than rendering a question with no answers.
 */
export function chaptersFor(occasionId, ctx) {
  const c = safeCtx(ctx)
  return blueprintFor(occasionId).chapters
    .filter(ch => typeof ch.showIf !== 'function' || ch.showIf(c))
    .map(ch => narrow(ch, c))
}

function narrow(chapter, ctx) {
  if (!chapter.packsFor && !chapter.recommendFor) return chapter

  const declared = chapter.packIds ?? []
  let packIds = declared
  if (chapter.packsFor) {
    const allowed = new Set(declared)
    const picked = (chapter.packsFor(ctx) ?? []).filter(id => allowed.has(id))
    if (picked.length) packIds = picked
  }

  // A recommendation for a pack this answer no longer offers pre-selects
  // nothing, so the screen opens blank and every customer is asked to have an
  // opinion about crew sizes. Dropped rather than left dangling.
  const source = chapter.recommendFor ? chapter.recommendFor(ctx) : chapter.recommend
  const recommend = {}
  for (const [circleId, packId] of Object.entries(source ?? {})) {
    if (packId && packIds.includes(packId)) recommend[circleId] = packId
  }

  return { ...chapter, packIds, recommend }
}
