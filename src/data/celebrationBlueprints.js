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

import { SERVICE_PACKS } from './servicePacks'

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

/* ── Reusable chapters, each taking its own reason ─────────────────── */

const photography = ({ why, packIds = ['photo_half_day', 'photo_full_day'], recommend, question = 'Who is photographing this?', showIf }) => svc({
  serviceId: 'photography',
  title: 'Photos',
  emoji: '📸',
  question,
  why,
  packIds,
  recommend: recommend ?? { close: 'photo_half_day', family: 'photo_full_day', full_house: 'photo_full_day', grand: 'photo_full_day' },
  skipLabel: 'A cousin with a good phone is doing it',
  showIf,
})

const videography = ({ why, packIds = ['video_event', 'video_cinematic'], recommend, showIf }) => svc({
  serviceId: 'videography',
  title: 'Video',
  emoji: '🎬',
  question: 'Do you want it filmed as well?',
  why,
  packIds,
  recommend: recommend ?? { close: null, family: 'video_event', full_house: 'video_cinematic', grand: 'video_cinematic' },
  skipLabel: 'Photographs are enough',
  showIf,
})

const dining = ({ why, packIds = ['dining_leaf', 'dining_round', 'dining_buffet_standing', 'dining_floor', 'dining_lounge'], recommend }) => svc({
  serviceId: 'dining',
  title: 'Seating',
  emoji: '🪑',
  question: 'How are people sitting to eat?',
  why,
  packIds,
  recommend: recommend ?? { close: 'dining_floor', family: 'dining_buffet_standing', full_house: 'dining_round', grand: 'dining_round' },
  skipLabel: 'The venue provides all of it',
})

const returnGifts = ({ why, packIds = ['gift_budget', 'gift_mid', 'gift_premium'], recommend }) => svc({
  serviceId: 'return_gifts',
  title: 'Return gifts',
  emoji: '🎁',
  question: 'What does everybody take home?',
  why,
  packIds,
  recommend: recommend ?? { close: 'gift_budget', family: 'gift_budget', full_house: 'gift_mid', grand: 'gift_mid' },
  skipLabel: 'We have already bought them',
})

const invitations = ({ why }) => svc({
  serviceId: 'invitations',
  title: 'Invites',
  emoji: '💌',
  question: 'How is everybody being invited?',
  why,
  packIds: ['invite_digital', 'invite_printed', 'invite_luxury', 'invite_stationery'],
  multi: true,
  recommend: { close: 'invite_digital', family: 'invite_digital', full_house: 'invite_printed', grand: 'invite_printed' },
  skipLabel: 'The invitations are already out',
})

const cleanup = ({ why }) => svc({
  serviceId: 'cleanup',
  title: 'After',
  emoji: '🧹',
  question: 'Who clears up afterwards?',
  why,
  packIds: ['clean_basic', 'clean_deep', 'clean_green'],
  recommend: { close: 'clean_basic', family: 'clean_basic', full_house: 'clean_deep', grand: 'clean_deep' },
  skipLabel: 'The venue handles the clearing',
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
    showIf: ctx => ctx.outdoor,
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

/* ══════════════════════════════════════════════════════════════════════
   THE FIFTEEN
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
    promise: 'Nine or ten quick questions. Nothing is booked, and there is no price until you have seen everything.',
    cuisineLead: ['karnataka', 'north_indian', 'indo_chinese', 'chaat_street', 'multi_cuisine'],
    vegDefault: true,
    chapters: [
      ask({
        id: 'who',
        title: 'Whose',
        emoji: '🎈',
        question: 'Whose birthday are we planning?',
        why: 'It changes almost everything below — the cake, the entertainment, whether there is a ritual in the morning, and how loud the evening gets.',
        options: [
          { id: 'toddler', emoji: '🧸', name: 'A little one, under five', desc: 'Short, bright, and finished before the afternoon nap.', flags: { kids: true, ritual: false, loud: false } },
          { id: 'child', emoji: '🦸', name: 'A child, five to twelve', desc: 'A theme they chose themselves, games, and thirty screaming friends.', flags: { kids: true, ritual: false, loud: true } },
          { id: 'teen', emoji: '🎧', name: 'A teenager', desc: 'Music, lights, a photo corner, and adults kept at a respectful distance.', flags: { kids: false, ritual: false, loud: true } },
          { id: 'adult', emoji: '🥂', name: 'An adult birthday', desc: 'Friends and family together, dinner, and a proper evening of it.', flags: { kids: false, ritual: false, loud: true } },
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
        packIds: ['cake_cream_1kg', 'cake_photo', 'cake_fondant', 'cake_tiered', 'cake_dessert_table'],
        recommend: { close: 'cake_cream_1kg', family: 'cake_cream_1kg', full_house: 'cake_tiered', grand: 'cake_tiered' },
        skipLabel: 'We are getting the cake ourselves',
      }),
      dining({
        why: 'A children’s party runs standing and spilling; a sixtieth needs the elders seated with a table to put a plate down on. The two cost differently and feel completely different.',
      }),
      svc({
        serviceId: 'kids_play',
        title: 'For the kids',
        emoji: '🎠',
        question: 'What are the children doing while the adults talk?',
        why: 'Unoccupied children decide how long the adults stay. A supervised corner is the difference between a party that ends at eight and one that ends at six.',
        packIds: ['kids_bouncy', 'kids_play_zone', 'kids_activity'],
        recommend: { close: 'kids_activity', family: 'kids_bouncy', full_house: 'kids_play_zone', grand: 'kids_play_zone' },
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
        recommend: { close: 'folk_magic_kids', family: 'folk_magic_kids', full_house: 'folk_magic_kids', grand: 'folk_south' },
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
        recommend: { close: 'dj_house', family: 'dj_standard', full_house: 'dj_standard', grand: 'dj_premium' },
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
        recommend: { close: 'music_classical_duo', family: 'music_classical_duo', full_house: 'music_classical_duo', grand: 'music_band' },
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
        recommend: { family: 'booth_classic', full_house: 'booth_classic', grand: 'booth_360' },
        skipLabel: 'No booth',
      }),
      svc({
        serviceId: 'memory_wall',
        title: 'Memory wall',
        emoji: '🖼️',
        question: 'A wall of photographs from the years?',
        why: 'At a sixtieth this is where the whole family ends up standing, pointing, and telling each other stories. It is worth more than the stage.',
        packIds: ['memwall_string', 'memwall_timeline', 'memwall_tribute_film'],
        recommend: { close: 'memwall_string', family: 'memwall_string', full_house: 'memwall_timeline', grand: 'memwall_tribute_film' },
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
        recommend: { full_house: 'fire_cold_pyro', grand: 'fire_cold_pyro' },
        skipLabel: 'Just the candles',
      }),
      returnGifts({
        why: 'In this city a guest who leaves empty-handed notices. It does not have to be expensive — it has to exist.',
        packIds: ['gift_kids', 'gift_budget', 'gift_mid', 'gift_premium'],
        recommend: { close: 'gift_budget', family: 'gift_kids', full_house: 'gift_mid', grand: 'gift_mid' },
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
      ...groundwork,
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

/**
 * The chapters this particular customer should actually see.
 *
 * `showIf` is evaluated against everything answered so far, which is what
 * keeps a thirty-guest birthday at home from being asked about generators and
 * ambulances. A chapter with no `showIf` is always shown.
 */
export function chaptersFor(occasionId, ctx) {
  const safeCtx = { flags: {}, guests: 0, circleId: 'family', outdoor: false, venueKind: null, ...ctx }
  return blueprintFor(occasionId).chapters.filter(
    ch => typeof ch.showIf !== 'function' || ch.showIf(safeCtx),
  )
}
