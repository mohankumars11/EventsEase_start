/**
 * The shared kit every occasion blueprint is written with.
 *
 * One file of builders, clause shorthands, the questions that repeat
 * across occasions, and the default words for each of the 34 trades.
 * A category's blueprint file imports this and writes only what is
 * particular to its occasions — which is the whole point: the parts
 * that repeat live here ONCE, so a reviewer reading
 * data/weddingBlueprints.js sees only the decisions, not the plumbing.
 *
 * ── The clause grammar ──────────────────────────────────────────────
 * Conditions are arrays, not functions, so a blueprint stays JSON:
 * versionable, diffable, sendable to the server. lib/occasionPlan.js
 * evaluates them, and every clause is a FACT the customer gave us.
 *
 *   venue(...)   the venue answer is one of these
 *   ans(k, ...)  answers[k] is (or contains) one of these
 *   notAns(k,..) it is not
 *   has(k)       answered, and not empty or "none"
 *   from(n)      at least n guests
 *   some(...)    any one of them passes
 *
 * ── Writing a new category ──────────────────────────────────────────
 * Import the kit, write the occasions, call `checkTrades` at the end so
 * an invented trade id fails at import rather than in front of a
 * customer, and register the file in data/blueprints.js.
 */
import { TRADE } from './trades'

/* ── Builders ─────────────────────────────────────────────────────── */
export const B = (id, hook, statement, o) => ({ id, hook, statement, v: 1, formats: ['home', 'restaurant', 'venue', 'outdoor'], ...o })
export const Q = (k, label, type, o = {}) => ({ k, label, type, ...o })
export const S = (trade, kind, hook, line, o = {}) => ({ trade, kind, hook, line, ...o })
export const X = (id, hook, line, icon, o = {}) => ({ id, hook, line, icon, ...o })

/* ── Clause shorthands ────────────────────────────────────────────── */
export const venue = (...v) => ['venue', ...v]
export const notVenue = (...v) => ['not', ['venue', ...v]]
export const ans = (k, ...v) => ['ans', k, ...v]
export const notAns = (k, ...v) => ['not', ['ans', k, ...v]]
export const has = k => ['has', k]
export const notHas = k => ['not', ['has', k]]
export const some = (...c) => ['any', ...c]
export const from = n => ['guests', n]
export const gt = (k, n) => ['gt', k, n]

/* ── The questions that repeat ────────────────────────────────────── */

/** Where food comes from. Asked the same way wherever it is asked. */
export const FOOD_WAY = Q('food_way', 'How is food being arranged?', 'one', {
  options: [['catering', 'Caterer at the venue'], ['restaurant', 'We’re eating at a restaurant'], ['order', 'We’ll order in'], ['home', 'Cooking at home'], ['none', 'No food needed']],
  help: 'This decides whether we look for a caterer or a table.',
})
export const DIET = Q('diet', 'Food preference', 'one', { options: [['veg', 'Veg'], ['nonveg', 'Non-veg'], ['both', 'Both'], ['vegan', 'Vegan'], ['jain', 'Jain / no onion-garlic']], when: [notAns('food_way', 'none')], noOther: true })
export const ALLERGY = Q('allergy', 'Any allergies or dietary needs we should pass on?', 'text', { optional: true, max: 160, when: [notAns('food_way', 'none')] })
/** The same two, where the occasion asks about food another way. */
export const DIET_ONLY = Q('diet', 'Food preference', 'one', { options: [['veg', 'Veg'], ['nonveg', 'Non-veg'], ['both', 'Both'], ['vegan', 'Vegan'], ['jain', 'Jain / no onion-garlic']], noOther: true })
export const ALLERGY_ONLY = Q('allergy', 'Any allergies or dietary needs we should pass on?', 'text', { optional: true, max: 160 })

export const PHOTOS = Q('photos', 'Photography', 'one', {
  options: [['yes', 'Yes, please'], ['candid', 'Candid only, no posing'], ['no', 'No photography']],
  help: 'We’ll never put a camera where you don’t want one.',
})
/** For a ceremony with moments a family may not want photographed. */
export const PHOTO_LIMITS = Q('photo_limits', 'Any moments that must not be photographed?', 'text', {
  optional: true, max: 160, when: [notAns('photos', 'no')],
  help: 'We pass this to the photographer as a rule, not a preference.',
})

export const CAKE_Q = Q('cake', 'The cake', 'one', { options: [['order', 'Order one for us'], ['have', 'We’ve arranged it'], ['none', 'No cake']] })

/**
 * A practitioner is never assumed — for any ceremony, in any category.
 * This is the one question that must be asked rather than inferred, and
 * "we have our own" is a real answer that stops us selling a second.
 */
export const PRIEST = Q('priest', 'Does your family want a priest or officiant for this?', 'one', {
  options: [['yes', 'Yes, please find one'], ['have', 'We have our family’s priest'], ['no', 'No ceremony']],
  help: 'Entirely your family’s choice — we never assume one.',
})
export const RITUAL_LANG = Q('ritual_language', 'Preferred language for the rituals', 'select', {
  optional: true, when: [ans('priest', 'yes')],
  options: [['', 'No preference'], ['kannada', 'Kannada'], ['telugu', 'Telugu'], ['tamil', 'Tamil'], ['hindi', 'Hindi'], ['malayalam', 'Malayalam'], ['marathi', 'Marathi'], ['bengali', 'Bengali'], ['punjabi', 'Punjabi'], ['sanskrit', 'Sanskrit'], ['urdu', 'Urdu'], ['other', 'Other']],
})
export const RITUAL_KIT = Q('ritual_kit', 'Do you need the ceremony materials arranged?', 'yesno', {
  when: [ans('priest', 'yes', 'have')],
  help: 'A priest we find brings his own; tick this only if you need them separately.',
})
/** The time a family was given. We never calculate one. */
export const GIVEN_TIME = Q('timing_given', 'Has your family been given a time for the ceremony?', 'text', {
  optional: true, max: 60, placeholder: 'e.g. between 10:30 and 11:15',
  help: 'We plan around the time your family was given. We never work one out.',
})

export const THEME = (label = 'Theme', opts) => Q('theme', label, 'one', { optional: true, options: opts })
export const CLEANUP = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { when: [venue('home', 'newhome', 'outdoor', 'other')] })
export const TRANSPORT = Q('transport', 'Do guests need transport arranged?', 'yesno')
export const DRESS_CODE = Q('dress_code', 'Is there a dress code?', 'one', { optional: true, options: [['none', 'No dress code'], ['colour', 'One colour'], ['traditional', 'Traditional'], ['formal', 'Formal'], ['theme', 'A theme']] })
export const MAKEUP = Q('makeup', 'Makeup and hair?', 'yesno', { optional: true })
export const RETURN_GIFTS = Q('return_gifts', 'Return gifts for guests?', 'yesno', { optional: true })
export const ACCESS = Q('access', 'What do your guests need?', 'many', {
  optional: true,
  options: [['seating', 'Seating for everyone'], ['wheelchair', 'Step-free access'], ['quiet', 'Somewhere quiet'], ['elders', 'Comfort for elderly family']],
})
/** For anything the public can walk into. */
export const PUBLIC_SCALE = Q('public_event', 'Is this open to the public?', 'one', {
  options: [['private', 'Invited guests only'], ['community', 'Our community'], ['public', 'Open to anyone']],
  help: 'A public gathering needs permissions, crowd planning and first aid.',
})

/* ── Campus: school and college ask these the same way ───────────── */

/** A campus event is usually on campus, and that changes everything. */
export const CAMPUS_PLACE = Q('place', 'Where is it being held?', 'one', {
  options: [['hall', 'Our hall or auditorium'], ['ground', 'Our grounds'], ['rooms', 'Classrooms or labs'], ['outside', 'A venue outside campus']],
  help: 'On campus we bring what the campus doesn’t have. Outside, we start from the venue.',
})
export const CHIEF_GUEST = Q('chief_guest', 'Is a chief guest coming?', 'yesno', { optional: true })
export const STAGE_NEED = Q('stage', 'The stage', 'one', { options: [['build', 'Please build one'], ['have', 'We have a stage'], ['none', 'No stage needed']] })
export const AV_NEED = Q('av', 'Sound and screens', 'many', {
  optional: true,
  options: [['mics', 'Microphones'], ['speakers', 'Speakers for the crowd'], ['screen', 'A projector or LED screen'], ['recording', 'Record the audio']],
})
export const SEATING_FOR = Q('seating', 'Do you need seating brought in?', 'yesno')
export const REFRESH = Q('refreshments', 'Refreshments', 'one', {
  options: [['full', 'A full meal'], ['snacks', 'Snacks and drinks'], ['water', 'Water only'], ['none', 'Nothing needed']],
})
export const AWARDS = Q('awards', 'Certificates, trophies or medals?', 'many', {
  optional: true, options: [['certificates', 'Certificates'], ['trophies', 'Trophies'], ['medals', 'Medals'], ['sashes', 'Sashes or badges']],
})

export const WHEN_STAGE = [ans('stage', 'build')]
export const WHEN_AV = [has('av')]
export const WHEN_SCREEN = [ans('av', 'screen')]
export const WHEN_SEATS = [ans('seating', 'yes')]
export const WHEN_FED = [ans('refreshments', 'full', 'snacks')]
export const WHEN_MEAL = [ans('refreshments', 'full')]
export const WHEN_OFFSITE = [ans('place', 'outside')]
export const WHEN_ONGROUND = [ans('place', 'ground')]
export const WHEN_PRINTED = [ans('awards', 'certificates')]
export const WHEN_TROPHY = [ans('awards', 'trophies', 'medals', 'sashes')]

/** Asked of every occasion, last: already-arranged, in one place. */
export const ARRANGED = Q('arranged', 'Anything already arranged?', 'many', {
  optional: true, help: 'We’ll keep it in your plan and stop suggesting it.',
  options: [['venue', 'Venue'], ['catering_food', 'Food'], ['cake_desserts', 'Cake'], ['decoration_floral', 'Décor'], ['photography', 'Photography'], ['videography', 'Video'], ['dj_music', 'Music'], ['priest_rituals', 'Priest'], ['bridal_makeup_hair', 'Makeup'], ['passenger_transport', 'Transport']],
})

/* ── Conditions that repeat ───────────────────────────────────────── */
export const WHEN_CATER = [venue('home', 'newhome', 'banquet', 'outdoor', 'need', 'have', 'other'), ans('food_way', 'catering')]
export const WHEN_TABLE = [some(venue('restaurant'), ans('food_way', 'restaurant'))]
/* "Help me find one" means a venue — unless they are eating at a
   restaurant, where the place IS the restaurant and offering both would
   be two rows for one decision. */
export const WHEN_VENUE = [venue('need'), notAns('food_way', 'restaurant')]
/* For an occasion that asks about food some other way and so has no
   `food_way` to read. A condition may only name a question its own
   occasion asks — the test enforces it. */
export const WHEN_VENUE_ONLY = [venue('need')]
export const WHEN_TABLE_ONLY = [venue('restaurant')]
export const WHEN_CLEAN = [venue('home', 'newhome', 'outdoor', 'other'), ans('cleanup', 'yes')]
export const WHEN_RIDE = [ans('transport', 'yes')]
export const UNLESS_PHOTO = [ans('photos', 'no')]
export const WHEN_PRIEST = [ans('priest', 'yes')]
export const WHEN_KIT = [ans('ritual_kit', 'yes')]
export const WHEN_PUBLIC = [ans('public_event', 'public', 'community')]

/* ── The default words for a service ──────────────────────────────── */
export const TRADE_WORDS = {
  catering_food: ['Feast', 'Food cooked and served for everyone'],
  cake_desserts: ['Delight', 'Designed, baked and delivered'],
  bar_beverages: ['Sip', 'Mocktails, juices and ice-cream counters'],
  restaurant: ['Dine', 'A table, a room, or a bulk order delivered'],
  venue: ['Gather', 'A place that fits your guests'],
  decoration_floral: ['Transform', 'Theme, flowers and backdrop, set up'],
  tent_furniture: ['Comfort', 'Chairs, tables and canopies'],
  event_lighting: ['Glow', 'Warm lights that change the room'],
  photography: ['Memories', 'Every smile, kept'],
  videography: ['Replay', 'A film, highlights and reels'],
  dj_music: ['Celebrate', 'A DJ with sound and lights'],
  live_entertainment: ['Wonder', 'Performers for your crowd'],
  anchor_mc: ['Host', 'Someone who keeps it moving'],
  sound_av: ['Amplify', 'Speakers, mics and screens'],
  bridal_makeup_hair: ['Glam', 'Makeup and hair for the day'],
  mehendi_artist: ['Adorn', 'Henna for the family'],
  priest_rituals: ['Bless', 'Your family’s rites, your way'],
  trousseau_gift_packing: ['Wrap', 'Trays and gift packing'],
  wedding_planning: ['Coordinate', 'One person for every detail'],
  end_to_end_event_logistics: ['Deliver', 'Transport, crew and set-up'],
  guest_services: ['Welcome', 'Hosts and ushers at the door'],
  passenger_transport: ['Arrive', 'Cars and coaches for guests'],
  valet_parking: ['Park', 'Valets so arrivals stay smooth'],
  security_services: ['Safe', 'Trained security at the door'],
  safety_facilities: ['Restore', 'Cleaning, washrooms and first aid'],
  gifts_favours: ['Share', 'A thank-you for every guest'],
  invitation_printing: ['Invite', 'Printed and boxed invitations'],
  event_materials_supplier: ['Prepare', 'Pooja items and supplies in bulk'],
  event_equipment_rental: ['Equip', 'Stage, podium and rentals'],
  power_cooling: ['Power', 'Silent generators and cooling'],
  transportation: ['Travel', 'Every vehicle, coordinated'],
  mini_truck_pickup: ['Move', 'A tempo when you need one'],
  medium_large_goods_vehicle: ['Haul', 'Trucks for large set-ups'],
  loading_unloading_crew: ['Lift', 'A crew for the heavy things'],
  warehouse_storage: ['Store', 'Space for your event things'],
}

/**
 * Every trade a blueprint names must be a registry id. A blueprint that
 * invents a service is a bug we want at import, not in front of a
 * customer — so this runs at module load, never lazily.
 */
export function checkTrades(blueprints, label) {
  for (const b of blueprints) {
    for (const s of b.plan) if (!TRADE[s.trade]) throw new Error(`${label}: unknown trade ${s.trade} in ${b.id}`)
    for (const a of b.addons) if (a.trade && !TRADE[a.trade]) throw new Error(`${label}: unknown trade ${a.trade} in add-on ${b.id}/${a.id}`)
  }
  return blueprints
}
