/**
 * Food & Dining Experiences — one blueprint per occasion.
 *
 * Twenty-two occasions where the thing being sold is eaten, which puts
 * food safety at the centre of every plan rather than at the edge:
 *
 *   · Allergens are declared in writing, at every counter, every time.
 *     Not verbally, not "ask the chef" — in writing, because the person
 *     who needs to know may not be the person who asks.
 *   · Vegetarian food is prepared, stored and served separately, and
 *     Jain requirements are a separate answer again. We never treat
 *     "veg available" as the same thing as "separately prepared".
 *   · Cold chain, temperature control, handwashing and gas safety are
 *     on the plan for anything cooked or held on site, and we keep them
 *     there. A food licence is the vendor's and the organiser's.
 *   · Alcohol is never assumed and never ours. Where there is a bar or
 *     a tasting, the venue or the producer holds the licence and the
 *     legal drinking age applies.
 *   · We make no claim about what any food does for anyone's health.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, CHIEF_GUEST, AWARDS,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a food occasion asks ──────────────────────────── */

const GUESTS = Q('eaters', 'How many people are eating?', 'select', {
  options: [['12', 'Up to 12'], ['60', 'Up to 60'], ['250', 'Up to 250'], ['1500', 'Up to 1500'], ['6000', 'More than 1500']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['restaurant', 'A restaurant or kitchen'], ['venue', 'An event venue'], ['home', 'A home'], ['ground', 'An open ground'], ['street', 'A street or market'], ['find', 'Please find somewhere']],
})
const SERVICE = Q('service', 'How is food served?', 'one', {
  options: [['plated', 'Plated, to the table'], ['buffet', 'A buffet'], ['stalls', 'Stalls or counters'], ['sharing', 'Sharing plates'], ['canapes', 'Canapés, passed'], ['tasting', 'A tasting menu']],
})

/** Separately prepared is a different answer from "veg available". */
const DIET_SPLIT = Q('diet', 'What is being served?', 'one', {
  options: [['veg', 'Vegetarian only'], ['separate', 'Both, prepared and served separately'], ['mixed', 'Both, from one kitchen'], ['jain', 'Jain — no onion or garlic'], ['vegan', 'Vegan']],
  help: 'Separately prepared is not the same as "veg available". We pass whichever you choose to the kitchen as a rule.',
})
const ALLERGENS = Q('allergens', 'How are allergens handled?', 'one', {
  options: [['written', 'Declared in writing at every counter'], ['menu', 'On the menu card'], ['ask', 'Guests ask the staff'], ['collected', 'We have collected guests’ requirements']],
  help: 'In writing is the only version that reaches the person who needs it. We will say so if it is left to asking.',
})
const KITCHEN = Q('kitchen', 'Where is the food cooked?', 'one', {
  options: [['onsite', 'Cooked on site'], ['offsite', 'Cooked off site and brought in'], ['live', 'Live counters in front of guests'], ['mixed', 'A mix'], ['venue', 'The venue’s own kitchen']],
})
const LICENCE = Q('licence', 'Do the caterers or vendors hold a food licence?', 'one', {
  optional: true, options: [['yes', 'Yes'], ['checking', 'We are checking'], ['help', 'We need help with this']],
  help: 'The licence is the vendor’s and the organiser’s. We never treat an unlicensed kitchen as fine.',
})
const DRINKS = Q('drinks', 'Drinks', 'one', {
  options: [['soft', 'Soft drinks and mocktails'], ['bar', 'A licensed bar'], ['pairing', 'A paired tasting of alcohol'], ['venue', 'The venue handles it'], ['none', 'Nothing needed']],
  help: 'Alcohol is the venue’s or the producer’s licence, and the legal drinking age applies. We never arrange it ourselves.',
})
const STAFF = Q('staff', 'Do you need service staff?', 'one', {
  options: [['full', 'Full service'], ['counters', 'Counter staff only'], ['clearing', 'Clearing only'], ['none', 'Not needed']],
})
const TABLEWARE = Q('tableware', 'What is needed to serve on?', 'many', {
  optional: true,
  options: [['crockery', 'Crockery and cutlery'], ['glassware', 'Glassware'], ['linen', 'Linen'], ['disposable', 'Compostable disposables'], ['buffet', 'Buffet counters and chafers']],
})
const WASTE = Q('waste', 'How is food waste handled?', 'one', {
  optional: true, options: [['collect', 'Collected and removed'], ['compost', 'Composted'], ['donate', 'Surplus donated'], ['venue', 'The venue handles it']],
})
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['music', 'Music'], ['mics', 'Microphones'], ['screen', 'Screens'], ['lights', 'Lighting'], ['stage', 'A stage or demo counter']],
})
const SIGNAGE = Q('signage', 'Do you need menus, signage and printed material?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need security or crowd stewarding?', 'yesno', { optional: true })
const SEATS = Q('seating', 'Do you need seating and tables?', 'yesno', { optional: true })

const WHEN_COOKING = [ans('kitchen', 'onsite', 'live', 'mixed')]
const WHEN_LIVE = [ans('kitchen', 'live')]
const WHEN_BROUGHT = [ans('kitchen', 'offsite', 'mixed')]
const WHEN_BAR = [ans('drinks', 'soft', 'bar', 'pairing')]
const WHEN_ALCOHOL = [ans('drinks', 'bar', 'pairing')]
const WHEN_STAFFED = [ans('staff', 'full', 'counters', 'clearing')]
const WHEN_TABLEWARE = [has('tableware')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_WASTE = [ans('waste', 'collect', 'compost', 'donate')]
const WHEN_AV = [has('av')]
const WHEN_MUSIC = [ans('av', 'music')]
const WHEN_PA = [ans('av', 'mics')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_STAGE = [ans('av', 'stage', 'screen')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'ground', 'street')]
const WHEN_OUTSIDE = [ans('place', 'ground', 'street')]
const WHEN_BIG = [ans('eaters', '250', '1500', '6000')]
const WHEN_HUGE = [ans('eaters', '1500', '6000')]
const WHEN_LICENCE_HELP = [ans('licence', 'checking', 'help')]
const WHEN_SEPARATE = [ans('diet', 'separate', 'jain', 'veg', 'vegan')]

export const FOOD_BLUEPRINTS = [

  B('food-festival', 'Feast', 'Fifty kitchens on one ground, each of them a food-safety question.', {
    about: 'The scale makes this a public-health exercise as much as a festival. Every stall needs power, water, waste, a licence and an allergen board — and the ground has to be laid out so a queue never blocks a route.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('stalls', 'How many food stalls?', 'select', { options: [['8', 'Up to 8'], ['25', 'Up to 25'], ['60', 'Up to 60'], ['150', 'More than 60']] }),
      Q('cuisines', 'What kinds of food?', 'many', { options: [['regional', 'Regional Indian'], ['street', 'Street food'], ['international', 'International'], ['desserts', 'Desserts'], ['beverages', 'Beverages'], ['artisan', 'Artisan producers']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, LICENCE, DRINKS, WASTE, AV, SEATS, PHOTOS, SIGNAGE, GUARD, CLEAN,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'Stalls spread so every queue has somewhere to go'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stalls, counters, chafers, handwash points and the seating area'),
      S('power_cooling', 'recommended', 'Supply', 'Power and cold storage per stall, sized stall by stall'),
      S('safety_facilities', 'recommended', 'Keep clean', 'Handwashing, waste, washrooms and the ground cleared each night'),
      S('invitation_printing', 'recommended', 'Declare', 'Allergen boards per stall, menus, a ground map and signage'),
      S('tent_furniture', 'conditional', 'Seat', 'Communal seating and shade, which is where a food festival happens', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter and cold storage, as you chose', { when: WHEN_BAR }),
      S('security_services', 'conditional', 'Steward', 'Gate and ground stewarding, and watch on the cash points', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Admit', 'Gates, tokens and an information point', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the stalls so people can see what they are buying', { when: [some(WHEN_LIT[0], WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Music under the noise, and a mic for announcements', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('photography', 'conditional', 'Shoot', 'The food and the stalls, which is the category that photographs best', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Stall load-in, crew and the move-out, to slots', { when: [ans('stalls', '60', '150')] }),
      S('venue', 'conditional', 'Secure', 'A ground with water, waste and power enough for the kitchens', { when: WHEN_FINDING }),
    ],
    addons: [
      X('allergen_boards', 'Declare', 'A written allergen board at every counter, checked before doors', 'invite', { trade: 'invitation_printing' }),
      X('veg_separation', 'Separate', 'Separate preparation, storage and serving lines for vegetarian food', 'chef', { trade: 'catering_food', when: WHEN_SEPARATE }),
      X('cold_chain', 'Keep cold', 'Cold storage per stall, with temperature checks logged', 'bar_beverages', { trade: 'power_cooling' }),
      X('licence_check', 'Verify', 'A food licence collected from every vendor before they are confirmed', 'schedule', { experience: true, when: WHEN_LICENCE_HELP }),
      X('surplus_donation', 'Give it on', 'Surplus food collected and donated rather than binned', 'heart', { experience: true, when: [ans('waste', 'donate')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Allergen boards in writing at every counter, vegetarian food prepared separately, and a licence from every vendor. These stay on the plan.' },
    timeline: {
      before: ['Licences collected from every vendor before they are confirmed', 'Power, water, gas and cold storage listed per stall', 'Ground laid out so queues never block a walking route'],
      during: ['Gas, fire and temperature checks at every stall before doors', 'Allergen boards up and legible at every counter', 'Waste and handwashing serviced through the day, not after'],
      after: ['Surplus collected and donated where arranged', 'Ground cleared including grease and food waste', 'Vendor settlement and feedback'],
    },
    checklist: ['Licence from every vendor', 'Power and cold storage per stall', 'Allergen boards at every counter', 'Handwashing and waste serviced'],
  }),

  B('street-food-festival', 'Hawk', 'Carts, smoke and queues, in a space that was not built for any of it.', {
    about: 'Smaller stalls, more open flame, and usually a street rather than a ground. Gas safety, fire separation and the pedestrian route are the whole operational plan.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('carts', 'How many carts or stalls?', 'select', { options: [['6', 'Up to 6'], ['20', 'Up to 20'], ['50', 'Up to 50'], ['120', 'More than 50']] }),
      Q('cooking_method', 'How are they cooking?', 'many', { options: [['gas', 'Gas burners'], ['charcoal', 'Charcoal or tandoor'], ['electric', 'Electric'], ['fryers', 'Deep fryers'], ['precooked', 'Pre-cooked, reheated only']] }),
      DIET_SPLIT, ALLERGENS, LICENCE, DRINKS, WASTE, AV, SEATS, PHOTOS, SIGNAGE, GUARD, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Make safe', 'Fire extinguishers per stall, handwashing, waste and the clear-up'),
      S('catering_food', 'recommended', 'Line up', 'Carts placed for fire separation, with queues off the street'),
      S('event_equipment_rental', 'recommended', 'Set', 'Cart pitches, counters, barriers and communal tables'),
      S('power_cooling', 'conditional', 'Supply', 'Power, and cold storage for anything held before service', { when: [some(ans('cooking_method', 'electric'), WHEN_OUTSIDE[0])] }),
      S('invitation_printing', 'recommended', 'Declare', 'Allergen boards, stall signage, a map and safety notices'),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, communal benches and shade', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('security_services', 'conditional', 'Keep clear', 'Stewarding to keep the pedestrian route and the exits open', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter and cold storage, as you chose', { when: WHEN_BAR }),
      S('event_lighting', 'conditional', 'Light', 'Festoon and stall lighting for an evening market', { when: [some(WHEN_LIT[0], WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Play', 'Music at a level that does not fight the queue noise', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('photography', 'conditional', 'Shoot', 'The carts, the cooking and the queues, which is the whole look', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Direct', 'An information point and marshals at the busiest crossings', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('venue', 'conditional', 'Permit', 'A street or ground with permissions, water and waste access', { when: WHEN_FINDING }),
    ],
    addons: [
      X('gas_safety', 'Check', 'Gas and fire checks at every cart before service starts', 'power_cooling', { trade: 'safety_facilities', when: [ans('cooking_method', 'gas', 'charcoal', 'fryers')] }),
      X('fire_separation', 'Space it', 'Carts spaced for fire separation, not just for footfall', 'map', { experience: true }),
      X('allergen_boards', 'Declare', 'A written allergen board at every cart, checked before service', 'invite', { trade: 'invitation_printing' }),
      X('grease_waste', 'Collect', 'Used oil and grease collected separately, not poured away', 'broom', { trade: 'safety_facilities', when: [ans('cooking_method', 'fryers')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Open flame in a street needs fire separation, extinguishers at every cart and a clear pedestrian route. We keep all three on the plan.' },
    timeline: {
      before: ['Street permissions, water and waste access confirmed', 'Carts placed for fire separation and a clear pedestrian route', 'Licences and allergen information collected from every vendor'],
      during: ['Gas and fire checks at every cart before service', 'Route and exits kept clear as queues build', 'Waste and oil collected through the evening'],
      after: ['Street cleaned including grease, the same night', 'Vendor settlement', 'Street reinstated'],
    },
    checklist: ['Fire separation between carts', 'Extinguisher at every cart', 'Allergen boards up', 'Pedestrian route kept clear'],
  }),

  B('restaurant-opening', 'Serve first', 'A kitchen that has never run a full service, doing it in front of people who matter.', {
    about: 'The risk is entirely in the kitchen: a new team, a new pass and a full room on night one. A soft opening before the real one is worth more than anything on this plan.',
    formats: ['restaurant', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('guests_kind', 'Who is coming?', 'many', { options: [['press', 'Press and critics'], ['influencers', 'Creators'], ['industry', 'Industry'], ['neighbours', 'Local community'], ['investors', 'Investors'], ['public', 'The public']] }),
      Q('soft_open', 'Is there a soft opening first?', 'yesno', { help: 'A trial service with a smaller room is the single best thing you can do for opening night.' }),
      Q('ceremony', 'Is there a ribbon or a ceremony?', 'one', {
        optional: true, options: [['ribbon', 'A ribbon cutting'], ['ceremony', 'A ceremony'], ['own', 'We have our own arrangement'], ['none', 'Neither']],
        help: 'Whether there is a ceremony, and of what kind, is entirely the owner’s decision.',
      }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, AV, PHOTOS, SIGNAGE, CHIEF_GUEST,
    ],
    plan: [
      S('catering_food', 'recommended', 'Pace it', 'A menu cut to what the kitchen can actually send on night one'),
      S('decoration_floral', 'recommended', 'Dress', 'The frontage, the entrance and the room, visible from the street'),
      S('photography', 'recommended', 'Shoot', 'Food, room and people — the images the restaurant will use all year', { unless: UNLESS_PHOTO }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose, with the venue’s own licence', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Receive', 'A door list, timed arrivals and hosts who know who every guest is', { when: [some(ans('guests_kind', 'press', 'influencers', 'investors'), WHEN_STAFFED[0])] }),
      S('invitation_printing', 'conditional', 'Present', 'Invitations, menus with allergens, press kits and signage', { when: [some(WHEN_SIGNED[0], ans('guests_kind', 'press'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting set for the room and for the photographs, which differ', { when: [some(WHEN_LIT[0], WHEN_SHOT[0])] }),
      S('priest_rituals', 'conditional', 'Lead', 'A practitioner, only because the owner asked for one', { when: [ans('ceremony', 'ceremony')] }),
      S('sound_av', 'conditional', 'Set', 'Music at the level the room will actually run at, and a mic', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('videography', 'conditional', 'Film', 'A film of the room and the kitchen, for the restaurant to use', { when: WHEN_FILM }),
      S('event_equipment_rental', 'conditional', 'Add', 'Extra service stations, a ribbon setup and outdoor furniture', { when: [some(ans('ceremony', 'ribbon'), WHEN_STAGE[0])] }),
      S('valet_parking', 'optional', 'Receive', 'Valet, because arriving is the first thing a guest experiences'),
      S('venue', 'conditional', 'Overflow', 'A nearby space if more are invited than the room seats', { when: WHEN_FINDING }),
    ],
    addons: [
      X('soft_service', 'Rehearse', 'A full trial service with a smaller room, before the real opening', 'chef', { experience: true, when: [ans('soft_open', 'yes')] }),
      X('menu_cut', 'Shorten it', 'A shorter menu for opening night, so the pass can keep up', 'schedule', { experience: true }),
      X('press_seating', 'Place them', 'Press and critics seated where the kitchen is strongest', 'group', { trade: 'guest_services', when: [ans('guests_kind', 'press')] }),
      X('allergen_menus', 'Declare', 'Allergens printed on every menu, not left to the server to recall', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Whether there is a ceremony, and of what kind, is the owner’s own decision — we never assume one. Allergens go on the menu in writing.' },
    timeline: {
      before: ['Soft service run with a full-length menu, then the menu cut', 'Allergen information printed on every menu', 'Arrivals timed so the kitchen is never hit all at once'],
      during: ['Guests arriving in waves, not together', 'Kitchen running the shortened menu', 'Photographs taken early, before the room fills'],
      after: ['Images delivered within days, while the opening is news', 'Feedback from press and guests collected', 'Kitchen debriefed on what the service exposed'],
    },
    checklist: ['Soft service completed', 'Menu cut for opening night', 'Allergens on every menu', 'Arrivals timed in waves'],
  }),

  B('restaurant-anniversary', 'Mark it', 'A room full of regulars, who already know the menu better than the staff.', {
    about: 'The guests are the restaurant’s own customers, so the measure is whether it feels like a thank-you rather than a promotion. Bringing back old dishes beats any decoration.',
    formats: ['restaurant', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('years', 'How many years?', 'select', { options: [['1', 'One'], ['5', 'Five'], ['10', 'Ten'], ['25', 'Twenty-five or more']] }),
      Q('elements', 'What is planned?', 'many', { options: [['menu', 'A special or revived menu'], ['regulars', 'Inviting regulars'], ['chef', 'The chef cooking in the room'], ['music', 'Live music'], ['offers', 'An anniversary offer'], ['staff', 'Recognising the team']] }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, AV, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('catering_food', 'recommended', 'Cook', 'A menu that says something about the years, not just a set price'),
      S('decoration_floral', 'recommended', 'Dress', 'The room marked for the night, restrained rather than themed'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('live_entertainment', 'conditional', 'Play', 'Music at a level the room can eat and talk through', { when: [some(ans('elements', 'music'), WHEN_MUSIC[0])] }),
      S('photography', 'conditional', 'Record', 'The room, the regulars and the team, which is what this is for', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Tell it', 'Invitations, the anniversary menu with allergens, and signage', { when: [some(WHEN_SIGNED[0], ans('elements', 'menu'))] }),
      S('guest_services', 'conditional', 'Host', 'Reservations managed and regulars greeted by name', { when: WHEN_STAFFED }),
      S('gifts_favours', 'conditional', 'Thank', 'Something for the team, and a small thing for every guest', { when: [ans('elements', 'staff')] }),
      S('event_lighting', 'conditional', 'Warm', 'Lighting a notch warmer than a normal service', { when: WHEN_LIT }),
      S('cake_desserts', 'optional', 'Mark it', 'Something to cut, which an anniversary still wants'),
      S('tent_furniture', 'conditional', 'Extend', 'Extra tables, or outdoor seating if the room overflows', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Overflow', 'A nearby space if more regulars come than the room holds', { when: WHEN_FINDING }),
    ],
    addons: [
      X('revived_dishes', 'Bring back', 'Dishes from the early menu, cooked exactly as they were', 'chef', { trade: 'catering_food', when: [ans('elements', 'menu')] }),
      X('regulars_list', 'Invite properly', 'Long-standing regulars invited personally, not by a mailer', 'phone', { experience: true, when: [ans('elements', 'regulars')] }),
      X('team_recognition', 'Name them', 'The team named and thanked in front of the room', 'group', { experience: true, when: [ans('elements', 'staff')] }),
      X('allergen_menus', 'Declare', 'Allergens printed on the anniversary menu', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Invite the regulars personally. An anniversary that reads as a promotion loses the people it was meant to thank.' },
    timeline: {
      before: ['Regulars identified from the books and invited personally', 'Anniversary menu set, with allergens printed', 'Team told what is planned, and asked what they would like'],
      during: ['Regulars greeted by name at the door', 'The team named in front of the room', 'Photographs of the room as it actually is'],
      after: ['Personal thanks to the guests who came', 'Photographs shared with the team', 'Feedback on the revived dishes'],
    },
    checklist: ['Regulars invited personally', 'Menu set with allergens printed', 'Team recognition planned', 'Lighting set warmer than usual'],
  }),

  B('chefs-table-experience', 'Watch it cook', 'Twelve seats at the pass, and a chef who has to cook and talk at once.', {
    about: 'The smallest and most exposed format in the category. There is nowhere to hide: the guests see the pass, hear the calls and know if a course is late.',
    formats: ['restaurant', 'venue', 'home'],
    ask: [
      GUESTS, PLACE,
      Q('courses', 'How many courses?', 'select', { options: [['5', 'Up to 5'], ['8', 'Up to 8'], ['12', 'Up to 12'], ['15', 'More than 12']] }),
      Q('interaction', 'How much does the chef interact?', 'one', { options: [['narrate', 'Narrates every course'], ['occasional', 'Comes out occasionally'], ['silent', 'Cooks, does not speak'], ['teaches', 'Teaches as they cook']] }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, TABLEWARE, AV, PHOTOS, SIGNAGE,
    ],
    plan: [
      S('catering_food', 'recommended', 'Compose', 'A tasting menu built around what the kitchen can plate in view'),
      S('event_lighting', 'recommended', 'Focus', 'Light on the pass and on the plates, low everywhere else'),
      S('event_equipment_rental', 'conditional', 'Set', 'The counter, stools, service stations and the pass setup', { when: [some(WHEN_TABLEWARE[0], ans('place', 'home', 'venue'))] }),
      S('bar_beverages', 'conditional', 'Pair', 'Drinks paired course by course, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'Plates as they leave the pass, which is a two-second window', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Serve', 'Service staff who can clear twelve covers without breaking the talk', { when: WHEN_STAFFED }),
      S('invitation_printing', 'conditional', 'Print', 'A menu card per guest, with allergens and the wine notes', { when: [some(WHEN_SIGNED[0], WHEN_TABLEWARE[0])] }),
      S('sound_av', 'conditional', 'Carry', 'A discreet mic, so the chef is heard over an extraction fan', { when: [some(WHEN_PA[0], ans('interaction', 'narrate', 'teaches'))] }),
      S('decoration_floral', 'optional', 'Set', 'A counter dressing that does not get in the way of service'),
      S('videography', 'conditional', 'Film', 'The kitchen working, which is content the restaurant can reuse', { when: WHEN_FILM }),
      S('venue', 'conditional', 'Find', 'A kitchen a counter can actually be placed at', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dietary_in_advance', 'Ask first', 'Every guest’s requirements collected a week ahead, not on the night', 'phone', { experience: true }),
      X('chef_mic', 'Be heard', 'A discreet mic, so the chef does not have to shout over extraction', 'sound_av', { trade: 'sound_av', when: [ans('interaction', 'narrate', 'teaches')] }),
      X('plate_lighting', 'Show it', 'Light on the plate at the pass, for the guest and the camera', 'lighting', { trade: 'event_lighting' }),
      X('pace_plan', 'Time it', 'A written timing per course, so twelve courses do not become four hours', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Collect every guest’s dietary requirement a week before. At twelve covers there is no way to improvise around one.' },
    timeline: {
      before: ['Dietary requirements collected individually, a week ahead', 'Menu timed per course and rehearsed on the pass', 'Counter, lighting and mic set and tested'],
      during: ['Courses to the written timing', 'Chef heard without shouting', 'Plates photographed as they leave, not after'],
      after: ['Menu cards given to guests to take', 'Images shared with the kitchen', 'Feedback taken individually'],
    },
    checklist: ['Dietary requirements collected in advance', 'Course timing written and rehearsed', 'Pass lighting set', 'Chef audible over extraction'],
  }),

  B('wine-and-food-evening', 'Pair', 'Glasses in flights, food built to them, and a licence that belongs to somebody else.', {
    about: 'A tasting is a licensed activity and an educational one. The pours are measured, the order matters, and water and spittoons are part of running it properly.',
    formats: ['restaurant', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('flights', 'How many pours or flights?', 'select', { options: [['3', 'Three'], ['5', 'Five'], ['8', 'Eight'], ['12', 'More than eight']] }),
      Q('led_by', 'Who leads the tasting?', 'one', { options: [['sommelier', 'A sommelier'], ['producer', 'The producer'], ['chef', 'The chef'], ['none', 'Nobody — self-guided']] }),
      Q('licence_holder', 'Who holds the alcohol licence?', 'one', {
        options: [['venue', 'The venue'], ['producer', 'The producer'], ['unsure', 'Not sure yet']],
        help: 'Someone must hold it, and it is never us. We will keep this on the plan until it is settled.',
      }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, TABLEWARE, AV, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('bar_beverages', 'recommended', 'Pour', 'Measured pours, glassware per flight, water and spittoons'),
      S('catering_food', 'recommended', 'Match', 'Food built to the pours, served in the order the flight needs'),
      S('event_equipment_rental', 'conditional', 'Lay', 'Tasting mats, glassware, spittoons and the table setup', { when: [some(WHEN_TABLEWARE[0], WHEN_SEATS[0])] }),
      S('invitation_printing', 'recommended', 'Note it', 'Tasting notes per pour, a menu with allergens, and place cards'),
      S('guest_services', 'conditional', 'Serve', 'Staff who can pour a flight in order and keep water topped up', { when: WHEN_STAFFED }),
      S('event_lighting', 'conditional', 'Light', 'Light you can judge a glass by — warm, but not dim', { when: WHEN_LIT }),
      S('sound_av', 'conditional', 'Carry', 'A mic for whoever is leading, and low music between flights', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('photography', 'conditional', 'Shoot', 'The pours, the pairings and the room', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Tables set with room for several glasses per person', { when: WHEN_SEATS }),
      S('decoration_floral', 'optional', 'Dress', 'Table dressing with no scent, which would ruin the tasting'),
      S('passenger_transport', 'conditional', 'Home', 'Transport home, offered because there is alcohol', { when: WHEN_ALCOHOL }),
      S('venue', 'conditional', 'Find', 'A room with the licence, the light and the quiet for a tasting', { when: WHEN_FINDING }),
    ],
    addons: [
      X('measured_pours', 'Pace it', 'Measured pours, water between, and spittoons on every table', 'glass', { trade: 'bar_beverages', when: WHEN_ALCOHOL }),
      X('tasting_notes', 'Explain', 'Printed notes per pour, which is most of what guests take away', 'invite', { trade: 'invitation_printing' }),
      X('no_scent', 'Keep it clean', 'No scented flowers, candles or cleaning products in the room', 'flower', { experience: true }),
      X('rides_home', 'Get home', 'Transport booked for the end of the evening, before it starts', 'bus', { trade: 'passenger_transport', when: WHEN_ALCOHOL }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The alcohol licence is the venue’s or the producer’s, never ours, and the legal drinking age applies. Measured pours, water and transport home are part of running this responsibly.' },
    timeline: {
      before: ['Licence holder confirmed in writing', 'Pour order and food pairings agreed with whoever is leading', 'Dietary requirements collected and the room checked for scent'],
      during: ['Measured pours in order, water and spittoons on every table', 'Notes handed out as each flight is poured', 'Nobody over-served; transport offered'],
      after: ['Notes and the pour list sent to guests', 'Transport confirmed everyone got home', 'Producer and venue settled'],
    },
    checklist: ['Licence holder confirmed', 'Measured pours and spittoons', 'Water on every table', 'Transport home offered'],
  }),

  B('culinary-workshop', 'Cook along', 'Twenty people with knives and heat, which is a supervision problem.', {
    about: 'The hazard is not the food, it is the participants: untrained people using blades and burners. Stations, supervision ratio and a first-aid kit with burn dressings are the plan.',
    formats: ['restaurant', 'venue', 'home'],
    ask: [
      GUESTS, PLACE,
      Q('cuisine', 'What are they cooking?', 'one', { options: [['regional', 'A regional cuisine'], ['baking', 'Baking'], ['international', 'International'], ['technique', 'A technique'], ['kids', 'A children’s session'], ['other', 'Something else']] }),
      Q('hands_on', 'Is it hands-on or a demonstration?', 'one', { options: [['hands', 'Hands-on, everyone cooks'], ['demo', 'A demonstration with tasting'], ['both', 'Demonstration then hands-on']] }),
      Q('stations', 'How many cooking stations?', 'select', { optional: true, options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['15', 'Up to 15'], ['25', 'More than 15']] }),
      Q('supervision', 'What is the supervision ratio?', 'one', {
        options: [['one_four', 'One to four'], ['one_eight', 'One to eight'], ['one_twelve', 'One to twelve'], ['unsure', 'Not decided']],
        help: 'Untrained people with knives and burners need a ratio that is set and kept, especially with children.',
      }),
      DIET_SPLIT, ALLERGENS, KITCHEN, AV, DRINKS, SEATS, PHOTOS, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Station', 'Cooking stations, burners, boards, knives and a demo counter'),
      S('safety_facilities', 'recommended', 'Cover', 'A first-aid kit with burn dressings, extinguishers, and the clear-up'),
      S('catering_food', 'recommended', 'Prepare', 'Ingredients prepped and portioned per station before anyone arrives'),
      S('sound_av', 'conditional', 'Show', 'An overhead camera and a screen, so the back row can see the hands', { when: [some(WHEN_STAGE[0], ans('hands_on', 'demo', 'both'))] }),
      S('invitation_printing', 'recommended', 'Hand out', 'Recipe cards, allergen notes, station labels and safety notices'),
      S('power_cooling', 'conditional', 'Supply', 'Power and gas to every station, and cold storage for ingredients', { when: WHEN_COOKING }),
      S('guest_services', 'conditional', 'Supervise', 'Assistants on the floor at the stated ratio, not just the chef', { when: [notAns('supervision', 'unsure')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Tasting tables, and seating for the demonstration part', { when: [some(WHEN_SEATS[0], ans('hands_on', 'demo', 'both'))] }),
      S('photography', 'conditional', 'Record', 'Participants cooking and the finished dishes', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Refresh', 'Water and drinks, placed away from the burners', { when: WHEN_BAR }),
      S('event_lighting', 'conditional', 'Light', 'Light on the hands at the demonstration counter', { when: WHEN_LIT }),
      S('venue', 'conditional', 'Find', 'A space with ventilation, water, gas and a floor that can get wet', { when: WHEN_FINDING }),
    ],
    addons: [
      X('ratio_staffing', 'Supervise', 'The stated ratio staffed and counted, especially with children', 'group', { trade: 'guest_services', when: [ans('supervision', 'unsure', 'one_eight', 'one_twelve')] }),
      X('overhead_camera', 'See it', 'An overhead camera on the chef’s hands, on a screen', 'media', { trade: 'sound_av', when: [ans('hands_on', 'demo', 'both')] }),
      X('burn_kit', 'Be ready', 'Burn dressings and cold water, which is the injury this will have', 'spa', { trade: 'safety_facilities' }),
      X('take_home', 'Send them off', 'Recipe cards and what they cooked, packed to take home', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Blades and burners with untrained people: the supervision ratio, burn dressings and extinguishers stay on the plan.' },
    timeline: {
      before: ['Ingredients prepped and portioned per station', 'Supervision ratio set and staffed, especially for a children’s session', 'Allergens collected and the recipe adjusted, not worked around'],
      during: ['Safety briefing before knives or burners are touched', 'Assistants on the floor at the ratio throughout', 'Burn kit and extinguisher within reach of every station'],
      after: ['Stations cleaned and equipment counted back', 'Recipe cards and food sent home with participants', 'Any injury recorded'],
    },
    checklist: ['Ingredients prepped per station', 'Supervision ratio staffed', 'Burn dressings and extinguishers', 'Allergens designed into the recipe'],
  }),

  B('bakery-launch', 'Open the oven', 'A counter, a queue down the street, and product that runs out by eleven.', {
    about: 'A retail opening where the stock is perishable and finite. Production volume for day one is the decision everything else hangs on, and it is almost always underestimated.',
    formats: ['restaurant', 'venue'],
    ask: [
      GUESTS, PLACE,
      Q('product', 'What is the range?', 'many', { options: [['bread', 'Bread'], ['pastry', 'Pastry and viennoiserie'], ['cakes', 'Cakes'], ['savoury', 'Savoury'], ['coffee', 'Coffee'], ['celebration', 'Celebration cakes']] }),
      Q('day_one', 'What is planned for opening day?', 'many', { options: [['tasting', 'Free tastings'], ['offers', 'Opening offers'], ['ribbon', 'A ribbon cutting'], ['demo', 'A baking demonstration'], ['press', 'Press and creators'], ['preorders', 'Pre-orders']] }),
      Q('volume', 'Is day-one production volume planned?', 'one', {
        options: [['yes', 'Yes, with a buffer'], ['estimate', 'An estimate'], ['no', 'Not yet']],
        help: 'Running out at eleven is the most common opening-day failure in this category.',
      }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, AV, KITCHEN, PHOTOS, SIGNAGE, GUARD,
    ],
    plan: [
      S('catering_food', 'recommended', 'Bake', 'Day-one volume planned with a buffer, and a plan for selling out'),
      S('decoration_floral', 'recommended', 'Dress', 'The frontage and the counter, which is the whole shop window'),
      S('invitation_printing', 'recommended', 'Label', 'Product labels with allergens, price cards, bags and signage'),
      S('photography', 'conditional', 'Shoot', 'The product and the counter, which the bakery will use for a year', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Queue', 'Someone managing the queue and the first rush at the counter', { when: [some(WHEN_STAFFED[0], WHEN_BIG[0])] }),
      S('event_equipment_rental', 'conditional', 'Set', 'Counters, display units, a demo table and the ribbon setup', { when: [some(ans('day_one', 'demo', 'ribbon'), WHEN_STAGE[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'Coffee and cold drinks at the counter, as you chose', { when: [some(WHEN_BAR[0], ans('product', 'coffee'))] }),
      S('power_cooling', 'conditional', 'Chill', 'Display chillers and cold storage for the perishable range', { when: [some(ans('product', 'cakes', 'pastry', 'celebration'), WHEN_COOKING[0])] }),
      S('security_services', 'conditional', 'Order', 'Queue management on the pavement, which is not your pavement', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Counter and window lighting, which sells baked goods', { when: WHEN_LIT }),
      S('gifts_favours', 'conditional', 'Give', 'Something small for the first customers, counted', { when: [ans('day_one', 'tasting', 'offers')] }),
      S('sound_av', 'conditional', 'Play', 'Music in the shop and a mic for the opening, kept small', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('venue', 'conditional', 'Overflow', 'A nearby space if the queue cannot be held on the street', { when: WHEN_FINDING }),
    ],
    addons: [
      X('volume_buffer', 'Bake more', 'Day-one volume planned with a real buffer, and a sell-out message ready', 'chef', { experience: true, when: [ans('volume', 'estimate', 'no')] }),
      X('allergen_labels', 'Label it', 'Allergens on every product label, not on a sheet behind the counter', 'invite', { trade: 'invitation_printing' }),
      X('queue_plan', 'Hold the line', 'A queue line that does not block the neighbouring shops', 'map', { trade: 'security_services' }),
      X('preorder_system', 'Take orders', 'Pre-orders taken and collected at a separate point from the queue', 'budget', { trade: 'guest_services', when: [ans('day_one', 'preorders')] }),
    ],
    toolkit: { polls: ['date'], note: 'Allergens on every product label. Plan day-one volume with a buffer, and have a message ready for when you sell out — because you will.' },
    timeline: {
      before: ['Day-one volume planned with a buffer and a sell-out message written', 'Allergen labels produced for every product', 'Queue line agreed so it does not block neighbours'],
      during: ['Counter staffed for the first rush, not the average hour', 'Chillers monitored, product rotated', 'Sell-out handled gracefully, with a return date given'],
      after: ['Pavement cleaned', 'Day-one sales reviewed against the volume plan', 'Images delivered for the shop to use'],
    },
    checklist: ['Day-one volume with a buffer', 'Allergens on every label', 'Queue line agreed', 'Chillers and cold storage'],
  }),

  B('food-tasting-event', 'Sample', 'Small portions, many of them, and a palate that has to last to the end.', {
    about: 'Order and portion size are the whole design. Too much of anything early and the later dishes land on a full, tired palate — so pacing, water and a reset between courses matter more than volume.',
    formats: ['restaurant', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('purpose', 'What is the tasting for?', 'one', { options: [['menu', 'Testing a new menu'], ['client', 'A client choosing a menu'], ['product', 'Launching a product'], ['public', 'A public tasting'], ['training', 'Training the team']] }),
      Q('samples', 'How many items are being tasted?', 'select', { options: [['5', 'Up to 5'], ['10', 'Up to 10'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      Q('feedback', 'Are you collecting structured feedback?', 'yesno', { optional: true }),
      DIET_SPLIT, ALLERGENS, KITCHEN, DRINKS, STAFF, TABLEWARE, AV, CLEAN, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('catering_food', 'recommended', 'Portion', 'Small, consistent portions, sent in an order that protects the palate'),
      S('invitation_printing', 'recommended', 'Record', 'Numbered tasting cards with allergens, and feedback sheets'),
      S('event_equipment_rental', 'conditional', 'Lay', 'Tasting tables, numbered settings, water glasses and palate cleansers', { when: [some(WHEN_TABLEWARE[0], WHEN_SEATS[0])] }),
      S('bar_beverages', 'conditional', 'Reset', 'Water throughout, and pairings only where they are part of the test', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Serve', 'Staff who can land twenty items in order and collect the sheets', { when: WHEN_STAFFED }),
      S('event_lighting', 'conditional', 'Show true', 'Neutral light, because warm light changes how food looks and reads', { when: WHEN_LIT }),
      S('photography', 'conditional', 'Document', 'Every item photographed consistently, for the menu that follows', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Hold', 'Cold storage and hot holding, so item twenty is as good as item one', { when: WHEN_COOKING }),
      S('tent_furniture', 'conditional', 'Seat', 'Tables with room for several plates and a glass per person', { when: WHEN_SEATS }),
      S('sound_av', 'conditional', 'Introduce', 'A mic for whoever introduces each item, and nothing louder', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleaning between courses and the clear-up afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A quiet, neutral room — a tasting in a loud room is not a tasting', { when: WHEN_FINDING }),
    ],
    addons: [
      X('tasting_order', 'Sequence', 'An order built to protect the palate, light to heavy, agreed with the chef', 'schedule', { experience: true }),
      X('feedback_sheets', 'Capture', 'Numbered sheets per item, collected as each course is cleared', 'poll', { trade: 'invitation_printing', when: [ans('feedback', 'yes')] }),
      X('neutral_light', 'Judge it', 'Neutral lighting, so colour and doneness read honestly', 'lighting', { trade: 'event_lighting' }),
      X('palate_reset', 'Reset', 'Water and a palate cleanser between every course', 'glass', { trade: 'bar_beverages' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Allergens on every tasting card. Collect requirements before the day — at a tasting there is no way to substitute on the spot.' },
    timeline: {
      before: ['Tasting order agreed with the chef, light to heavy', 'Allergens printed on every numbered card', 'Hot holding and cold storage planned for the full run'],
      during: ['Items sent in order, at consistent portion size', 'Water and a palate cleanser between courses', 'Feedback collected per item, not at the end'],
      after: ['Sheets collated by item, not by guest', 'Images delivered for the menu', 'Kitchen debriefed on what did not hold'],
    },
    checklist: ['Tasting order agreed', 'Allergens on every card', 'Hot holding and cold storage planned', 'Feedback collected per item'],
  }),

  B('pop-up-dining-experience', 'Appear', 'A restaurant built in a space that has no kitchen, for one night.', {
    about: 'Everything a restaurant has, brought in: power, water, cold chain, waste and a pass. The temporary kitchen is the project, and the room is the easy half.',
    formats: ['venue', 'outdoor', 'home'],
    ask: [
      GUESTS, PLACE, SERVICE,
      THEME('Is there a concept or theme?', [['none', 'No theme'], ['cuisine', 'A cuisine'], ['season', 'A season'], ['location', 'The location itself'], ['collab', 'A collaboration'], ['other', 'Something else']]),
      Q('sittings', 'How many sittings?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['rolling', 'Rolling']] }),
      Q('build', 'What has to be brought in?', 'many', { options: [['kitchen', 'A full kitchen'], ['power', 'Power'], ['water', 'Water'], ['cold', 'Cold storage'], ['waste', 'Waste removal'], ['washing', 'Washing up']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, LICENCE, DRINKS, STAFF, TABLEWARE, AV, SIGNAGE, PHOTOS, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'A temporary kitchen, the pass, service stations and the dining setup'),
      S('power_cooling', 'recommended', 'Supply', 'Power, cold storage and hot holding — in a space that has none'),
      S('catering_food', 'recommended', 'Cook', 'A menu designed for a kitchen that does not exist yet'),
      S('safety_facilities', 'recommended', 'Service', 'Handwashing, waste, washing up, and the space returned as found'),
      S('tent_furniture', 'conditional', 'Furnish', 'Tables, chairs, linen and the whole dining room', { when: [some(WHEN_SEATS[0], WHEN_TABLEWARE[0])] }),
      S('event_lighting', 'recommended', 'Transform', 'Lighting, which is what turns a warehouse into a dining room'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service and glassware, as you chose', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Host', 'Bookings, arrivals by sitting, and service staff for the room', { when: WHEN_STAFFED }),
      S('invitation_printing', 'conditional', 'Present', 'Menus with allergens, place cards, tickets and signage', { when: [some(WHEN_SIGNED[0], WHEN_TABLEWARE[0])] }),
      S('decoration_floral', 'conditional', 'Dress', 'The concept built into the room rather than printed on a card', { when: [notAns('theme', 'none')] }),
      S('photography', 'conditional', 'Shoot', 'The room and the food — a pop-up exists afterwards only in images', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Set', 'Music at dining level, and a mic if the chef speaks', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build in, service, and strike out — usually inside one day', { when: [ans('build', 'kitchen', 'power', 'water')] }),
      S('venue', 'conditional', 'Find', 'A space with access, drainage and power — or honest about having none', { when: WHEN_FINDING }),
    ],
    addons: [
      X('kitchen_build', 'Make a kitchen', 'A temporary kitchen with the gas, water and extraction it needs', 'chef', { trade: 'event_equipment_rental', when: [ans('build', 'kitchen')] }),
      X('cold_chain', 'Keep cold', 'Cold storage from the moment ingredients leave the supplier', 'bar_beverages', { trade: 'power_cooling', when: [ans('build', 'cold')] }),
      X('dish_wash', 'Wash up', 'A washing-up station, which a pop-up always forgets until midnight', 'broom', { trade: 'safety_facilities', when: [ans('build', 'washing')] }),
      X('sitting_times', 'Turn it', 'Sitting times with a real turnaround, so the second never runs late', 'schedule', { experience: true, when: [ans('sittings', '2', '3', 'rolling')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A space with no kitchen needs cold chain, handwashing, waste and a licence. All four stay on the plan.' },
    timeline: {
      before: ['Site surveyed for power, water, drainage and access', 'Cold chain planned from supplier to pass', 'Menu designed for the kitchen that will actually exist'],
      during: ['Temperature checks logged through service', 'Sittings turned to the written times', 'Waste and washing up kept up with, not left'],
      after: ['Space returned as found, including drainage and grease', 'Equipment reconciled', 'Images delivered quickly, while interest holds'],
    },
    checklist: ['Site surveyed for power, water and drainage', 'Cold chain planned end to end', 'Washing-up station arranged', 'Sitting turnaround written'],
  }),

  B('bbq-party', 'Grill', 'Fire, meat and people standing near both, usually in a garden.', {
    about: 'Casual to attend and deliberately not casual to run: live flame, raw meat and a crowd. Separation between raw and cooked, and a fire plan, are the two things that matter.',
    formats: ['outdoor', 'home'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('grill_setup', 'Who is cooking?', 'one', { options: [['chef', 'A chef or grill team'], ['host', 'We are cooking'], ['mixed', 'Both'], ['catered', 'Fully catered']] }),
      Q('fuel', 'What are you cooking on?', 'many', { options: [['charcoal', 'Charcoal'], ['gas', 'Gas'], ['wood', 'Wood'], ['electric', 'Electric'], ['tandoor', 'A tandoor']] }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, TABLEWARE, AV, SEATS, KITCHEN, SIGNAGE, PHOTOS, WASTE, CLEAN,
    ],
    plan: [
      S('catering_food', 'conditional', 'Cook', 'A grill team, with raw and cooked kept properly apart', { when: [ans('grill_setup', 'chef', 'mixed', 'catered')] }),
      S('event_equipment_rental', 'recommended', 'Set up', 'Grills, prep tables, serving counters and the seating'),
      S('safety_facilities', 'recommended', 'Make safe', 'An extinguisher and a fire blanket at the grill, and the clear-up'),
      S('tent_furniture', 'conditional', 'Settle', 'Tables, seating, shade and somewhere to stand with a plate', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter with ice and cold storage, as you chose', { when: WHEN_BAR }),
      S('power_cooling', 'conditional', 'Chill', 'Cold storage for raw meat, which a garden does not have', { when: [some(WHEN_COOKING[0], WHEN_OUTSIDE[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light over the grill and the seating, for an evening', { when: [some(WHEN_LIT[0], WHEN_OUTSIDE[0])] }),
      S('dj_music', 'conditional', 'Play', 'Music at a level that does not need shouting over', { when: WHEN_MUSIC }),
      S('guest_services', 'conditional', 'Serve', 'Staff for the counters and the clearing', { when: WHEN_STAFFED }),
      S('photography', 'conditional', 'Capture', 'The grill and the table, which is where the pictures are', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Label', 'Allergen labels on the counter and simple menu cards', { when: WHEN_SIGNED }),
      S('venue', 'conditional', 'Find', 'A garden or space where open flame is actually allowed', { when: WHEN_FINDING }),
    ],
    addons: [
      X('raw_separation', 'Keep apart', 'Separate boards, tongs and surfaces for raw and cooked', 'chef', { trade: 'catering_food' }),
      X('veg_grill', 'Separate grill', 'A grill kept entirely for vegetarian food, never shared', 'chef', { trade: 'event_equipment_rental', when: WHEN_SEPARATE }),
      X('fire_kit', 'Be ready', 'An extinguisher, a fire blanket and a bucket of water at the grill', 'power_cooling', { trade: 'safety_facilities', when: [ans('fuel', 'charcoal', 'wood', 'gas', 'tandoor')] }),
      X('ash_disposal', 'Cool it', 'Ash and coals cooled and disposed of safely, not tipped in a bin', 'broom', { trade: 'safety_facilities', when: [ans('fuel', 'charcoal', 'wood')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Raw and cooked kept separate, a separate grill for vegetarian food, and fire kit at the grill. These stay on the plan.' },
    timeline: {
      before: ['Cold storage arranged for raw meat from arrival', 'Separate boards, tongs and a separate grill for vegetarian food', 'Fire kit placed at the grill and the ash plan agreed'],
      during: ['Raw and cooked never on the same surface', 'Grill attended at all times, never left lit and unwatched', 'Food out of the cold no longer than it should be'],
      after: ['Coals cooled fully before disposal', 'Leftovers chilled or discarded, never left out', 'Space cleaned including grease'],
    },
    checklist: ['Cold storage for raw meat', 'Separate vegetarian grill', 'Fire kit at the grill', 'Safe ash disposal planned'],
  }),

  B('brunch-gathering', 'Linger', 'A long, late, slow meal that people are supposed to stay at.', {
    about: 'The only food occasion designed around people not leaving. Service has to keep going without rushing anyone, which makes the staffing and the drinks pacing the whole craft.',
    formats: ['restaurant', 'home', 'outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('style', 'What kind of brunch?', 'one', { options: [['buffet', 'A buffet'], ['plated', 'Plated courses'], ['sharing', 'Sharing platters'], ['stations', 'Live stations'], ['picnic', 'A picnic']] }),
      Q('hours', 'How long is it running?', 'select', { options: [['2', 'Two hours'], ['3', 'Three hours'], ['4', 'Four hours'], ['open', 'All afternoon']] }),
      Q('occasion_for', 'What is it for?', 'one', { optional: true, options: [['friends', 'Friends'], ['family', 'Family'], ['celebration', 'A celebration'], ['work', 'A work gathering'], ['none', 'No particular reason']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, DRINKS, STAFF, TABLEWARE, AV, SEATS, SIGNAGE, PHOTOS, CLEAN,
    ],
    plan: [
      S('catering_food', 'recommended', 'Keep going', 'Food replenished across the hours, not laid out once and left'),
      S('tent_furniture', 'conditional', 'Settle', 'Comfortable seating people will stay in for four hours', { when: [some(WHEN_SEATS[0], ans('place', 'home', 'ground', 'street'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'Coffee, juices and whatever else you chose, running throughout', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Attend', 'Staff clearing quietly and topping up without hurrying anyone', { when: WHEN_STAFFED }),
      S('power_cooling', 'conditional', 'Hold', 'Hot holding and cold storage, because four hours is a long service', { when: [some(WHEN_COOKING[0], ans('hours', '4', 'open'))] }),
      S('decoration_floral', 'conditional', 'Set', 'Table dressing and flowers, which is most of a brunch’s look', { when: [some(WHEN_TABLEWARE[0], ans('occasion_for', 'celebration'))] }),
      S('event_equipment_rental', 'conditional', 'Lay', 'Buffet counters, chafers, live stations and the table setup', { when: [some(ans('style', 'buffet', 'stations'), WHEN_TABLEWARE[0])] }),
      S('sound_av', 'conditional', 'Underlay', 'Music under the conversation, which is the only volume that works', { when: [some(WHEN_MUSIC[0], WHEN_AV[0])] }),
      S('photography', 'conditional', 'Capture', 'The table and the group, early while the food still looks set', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Label', 'Menu cards with allergens and place cards', { when: WHEN_SIGNED }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleaning afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'Somewhere with light, air and no pressure on the table', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rolling_service', 'Replenish', 'Food replenished in small batches, so the last hour is as good as the first', 'chef', { trade: 'catering_food', when: [ans('hours', '3', '4', 'open')] }),
      X('coffee_station', 'Keep pouring', 'A coffee station that runs all the way through, properly staffed', 'glass', { trade: 'bar_beverages' }),
      X('long_table', 'Seat them together', 'One long table rather than several, which changes the whole feeling', 'chair', { trade: 'tent_furniture', when: WHEN_SEATS }),
      X('no_turn', 'Let them stay', 'No table turn booked, so nobody is asked to leave', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Food out for four hours needs hot holding and cold storage. Replenish in small batches rather than laying everything out at the start.' },
    timeline: {
      before: ['Dietary needs collected and the menu built around them', 'Hot holding and cold storage planned for the full length', 'No table turn booked behind the gathering'],
      during: ['Food replenished in small batches throughout', 'Coffee and drinks running the whole time', 'Clearing done quietly, without hurrying anyone'],
      after: ['Leftovers chilled or given away, not left out', 'Space cleaned', 'Photographs shared'],
    },
    checklist: ['Hot holding and cold storage for the full length', 'Replenishment in small batches', 'Coffee running throughout', 'No table turn booked'],
  }),

  B('private-chef-dinner', 'Cook for them', 'A kitchen that belongs to someone else, and eight people in the next room.', {
    about: 'A domestic kitchen, a chef who has never used it, and no margin. The recce is the whole job: what hobs work, what the oven actually does, where the bins are.',
    formats: ['home', 'venue'],
    ask: [
      GUESTS, PLACE,
      Q('courses', 'How many courses?', 'select', { options: [['3', 'Three'], ['5', 'Five'], ['7', 'Seven'], ['10', 'More than seven']] }),
      Q('kitchen_known', 'Has the chef seen the kitchen?', 'one', {
        options: [['yes', 'Yes'], ['photos', 'Only photographs'], ['no', 'No']],
        help: 'A domestic kitchen is the main risk here. A recce beforehand prevents almost every problem.',
      }),
      Q('occasion_for', 'What is the dinner for?', 'one', { optional: true, options: [['celebration', 'A celebration'], ['business', 'Business'], ['family', 'Family'], ['romantic', 'A private occasion'], ['none', 'No particular reason']] }),
      DIET_SPLIT, ALLERGENS, DRINKS, STAFF, TABLEWARE, AV, KITCHEN, SIGNAGE, PHOTOS, CLEAN,
    ],
    plan: [
      S('catering_food', 'recommended', 'Cook', 'A menu built to what the kitchen can actually do on the night'),
      S('guest_services', 'conditional', 'Serve', 'Service staff, so the chef is not also clearing plates', { when: WHEN_STAFFED }),
      S('event_equipment_rental', 'conditional', 'Supply', 'Crockery, glassware, linen and any equipment the kitchen lacks', { when: WHEN_TABLEWARE }),
      S('bar_beverages', 'conditional', 'Pour', 'Drinks and pairings, as you chose', { when: WHEN_BAR }),
      S('decoration_floral', 'conditional', 'Dress', 'The table, which is the only decoration this needs', { when: [some(WHEN_TABLEWARE[0], ans('occasion_for', 'celebration', 'romantic'))] }),
      S('event_lighting', 'conditional', 'Soften', 'Table and room lighting, lowered from household level', { when: WHEN_LIT }),
      S('safety_facilities', 'conditional', 'Leave it right', 'The kitchen cleaned and left exactly as it was found', { when: WHEN_CLEAN }),
      S('invitation_printing', 'conditional', 'Print', 'A menu card per place, with allergens', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'The table and the plates, discreetly, if the hosts want it', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Chill', 'Cold storage, because a domestic fridge will not hold a dinner', { when: WHEN_COOKING }),
      S('sound_av', 'conditional', 'Set', 'Music at the level of a dinner table', { when: [some(WHEN_MUSIC[0], WHEN_AV[0])] }),
      S('venue', 'conditional', 'Find', 'A private dining room, if the home kitchen cannot carry it', { when: WHEN_FINDING }),
    ],
    addons: [
      X('kitchen_recce', 'See it first', 'The chef visits the kitchen before the menu is written', 'map', { experience: true, when: [ans('kitchen_known', 'photos', 'no')] }),
      X('extra_cold', 'Bring cold', 'Portable cold storage, because a home fridge will not hold a dinner', 'bar_beverages', { trade: 'power_cooling' }),
      X('full_tableware', 'Bring it all', 'Crockery, glassware and linen for every course, counted', 'craft', { trade: 'event_equipment_rental', when: WHEN_TABLEWARE }),
      X('kitchen_handback', 'Leave it clean', 'The kitchen cleaned and photographed, left exactly as found', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { chat: 'organiser', polls: ['food'], note: 'Collect every guest’s requirements beforehand. At eight covers in a home kitchen there is nothing to substitute with.' },
    timeline: {
      before: ['Chef visits the kitchen and writes the menu to it', 'Every guest’s requirements collected individually', 'Cold storage, tableware and equipment gaps listed'],
      during: ['Courses to a written timing, because there is no second kitchen', 'Service staff clearing so the chef stays at the pass', 'Nothing borrowed from the home without asking'],
      after: ['Kitchen cleaned and left exactly as found', 'Hired tableware counted back', 'Menu card left with the hosts'],
    },
    checklist: ['Kitchen seen before the menu is written', 'Guest requirements collected individually', 'Cold storage arranged', 'Kitchen handback agreed'],
  }),

  B('coffee-festival', 'Brew', 'Water, power and extraction at every bar, which is the whole infrastructure.', {
    about: 'Less about cooking than any other festival here and more about utilities: espresso machines draw heavy current and need plumbed or tanked water. Competitions and cuppings add their own rules.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('roasters', 'How many roasters or bars?', 'select', { options: [['6', 'Up to 6'], ['20', 'Up to 20'], ['50', 'Up to 50'], ['100', 'More than 50']] }),
      Q('elements', 'What is on?', 'many', { options: [['tasting', 'Cuppings and tastings'], ['competition', 'Barista competitions'], ['workshops', 'Workshops'], ['equipment', 'Equipment exhibitors'], ['beans', 'Bean sales'], ['talks', 'Talks']] }),
      Q('utilities', 'What does each bar need?', 'many', { options: [['power', 'Heavy power'], ['water', 'Plumbed or tanked water'], ['waste', 'Waste water'], ['grinders', 'Grinders'], ['milk', 'Milk and cold storage']] }),
      DIET_SPLIT, ALLERGENS, LICENCE, DRINKS, WASTE, AV, SEATS, KITCHEN, PHOTOS, SIGNAGE, CLEAN,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Heavy power per bar and cold storage for milk, sized bar by bar'),
      S('event_equipment_rental', 'recommended', 'Plumb', 'Bars, counters, water supply, waste water and the cupping tables'),
      S('catering_food', 'conditional', 'Feed', 'Food that works alongside coffee rather than fighting it', { when: [some(WHEN_COOKING[0], ans('eaters', '250', '1500', '6000'))] }),
      S('safety_facilities', 'recommended', 'Service', 'Waste water, washing, washrooms and the clear-up'),
      S('invitation_printing', 'recommended', 'Label', 'Roaster signage, origin cards, allergen notices and a floor map'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating and standing tables, because people will want to sit with it', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Sound for the competition stage and the talks', { when: [some(WHEN_STAGE[0], ans('elements', 'competition', 'talks'))] }),
      S('guest_services', 'conditional', 'Admit', 'Entry, tokens and an information point', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the bars and the cupping tables, neutral for judging', { when: [some(WHEN_LIT[0], ans('elements', 'tasting', 'competition'))] }),
      S('photography', 'conditional', 'Shoot', 'The bars, the pours and the competitions', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Chill', 'Cold storage and a cold-drinks counter alongside', { when: WHEN_BAR }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Roaster load-in with heavy equipment, to slots', { when: [ans('roasters', '50', '100')] }),
      S('venue', 'conditional', 'Secure', 'A venue with the electrical capacity, which is the real constraint', { when: WHEN_FINDING }),
    ],
    addons: [
      X('power_survey', 'Size it', 'Electrical load surveyed against every machine before the venue is signed', 'power_cooling', { trade: 'power_cooling', when: [ans('utilities', 'power')] }),
      X('water_supply', 'Plumb it', 'Filtered water in and waste water out at every bar', 'glass', { trade: 'event_equipment_rental', when: [ans('utilities', 'water', 'waste')] }),
      X('milk_chain', 'Keep cold', 'Cold storage for milk at every bar, with temperature checks', 'bar_beverages', { trade: 'power_cooling', when: [ans('utilities', 'milk')] }),
      X('cupping_room', 'Judge it', 'A quiet, neutral room for cuppings and competition judging', 'venue', { trade: 'event_equipment_rental', when: [ans('elements', 'tasting', 'competition')] }),
    ],
    toolkit: { polls: ['date'], note: 'Espresso machines draw far more current than a venue expects. Survey the electrical load before the venue is signed.' },
    timeline: {
      before: ['Electrical load surveyed against every machine on the floor', 'Water in and waste water out planned per bar', 'Milk cold storage and allergen signage arranged'],
      during: ['Power monitored across the day as every machine runs', 'Waste water cleared, not allowed to back up', 'Cupping and competition rooms kept neutral and quiet'],
      after: ['Load-out of heavy equipment to slots', 'Waste water and grounds disposed of properly', 'Venue reinstated'],
    },
    checklist: ['Electrical load surveyed', 'Water and waste water per bar', 'Milk cold storage', 'Neutral cupping room'],
  }),

  B('dessert-festival', 'Sweeten', 'Everything on the floor melts, which makes cold chain the whole event.', {
    about: 'The one festival where ambient temperature is the enemy. Chilled display, cold storage and shade decide whether the product survives the afternoon, and children are most of the crowd.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('stalls', 'How many stalls?', 'select', { options: [['8', 'Up to 8'], ['25', 'Up to 25'], ['60', 'Up to 60'], ['120', 'More than 60']] }),
      Q('categories', 'What kinds of dessert?', 'many', { options: [['patisserie', 'Patisserie'], ['icecream', 'Ice cream and gelato'], ['chocolate', 'Chocolate'], ['mithai', 'Indian sweets'], ['bakes', 'Bakes and cookies'], ['drinks', 'Dessert drinks']] }),
      Q('children', 'Are many children expected?', 'yesno', { optional: true }),
      DIET_SPLIT, ALLERGENS, LICENCE, DRINKS, WASTE, AV, SEATS, PHOTOS, SIGNAGE, GUARD, CLEAN,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Keep cold', 'Chilled display and cold storage at every stall, with temperature logs'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stalls, chilled counters, handwash points and the seating'),
      S('catering_food', 'recommended', 'Present', 'Stalls arranged so the heat-sensitive ones are not in the sun'),
      S('safety_facilities', 'recommended', 'Service', 'Handwashing, waste and the clear-up — this floor gets sticky'),
      S('invitation_printing', 'recommended', 'Declare', 'Allergen boards per stall, which matters most where nuts and dairy are'),
      S('tent_furniture', 'conditional', 'Shade', 'Shade over every stall, and seating where people stop to eat', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('guest_services', 'conditional', 'Admit', 'Gates, tokens, an information point and a lost-child point', { when: [some(WHEN_BIG[0], ans('children', 'yes'))] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding and queue management across the stalls', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the counters, which sells dessert more than anything', { when: [some(WHEN_LIT[0], WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Play', 'Music, and a mic for announcements and lost children', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('photography', 'conditional', 'Shoot', 'The counters and the product, before the afternoon heat gets them', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour', 'Coffee and cold drinks alongside, as you chose', { when: WHEN_BAR }),
      S('venue', 'conditional', 'Secure', 'An indoor or shaded venue — direct sun ends this event by two', { when: WHEN_FINDING }),
    ],
    addons: [
      X('cold_chain', 'Hold the chain', 'Cold storage and chilled display per stall, with logged temperatures', 'bar_beverages', { trade: 'power_cooling' }),
      X('nut_dairy_boards', 'Declare', 'Nut and dairy declared prominently at every counter', 'invite', { trade: 'invitation_printing' }),
      X('shade_plan', 'Keep it out of the sun', 'Heat-sensitive stalls sited in shade, planned not improvised', 'map', { experience: true, when: WHEN_OUTSIDE }),
      X('lost_child_point', 'Reunite', 'A staffed, signposted lost-child point, announced at the start', 'group', { trade: 'guest_services', when: [ans('children', 'yes')] }),
    ],
    toolkit: { guardian: true, polls: ['date', 'food'], note: 'Cold chain and allergen boards — especially nuts and dairy — stay on the plan. With children on the floor, so does a lost-child point.' },
    timeline: {
      before: ['Cold storage and chilled display planned per stall', 'Heat-sensitive stalls sited in shade on the ground plan', 'Nut and dairy declarations collected from every stall'],
      during: ['Temperatures checked and logged through the day', 'Allergen boards up and legible at every counter', 'Lost-child point announced at the start'],
      after: ['Ground cleared, including the sticky floor', 'Unsold chilled product disposed of or chilled, never left', 'Vendor settlement'],
    },
    checklist: ['Cold storage per stall', 'Shade for heat-sensitive stalls', 'Nut and dairy declared at every counter', 'Lost-child point staffed'],
  }),
  B('cooking-competition', 'Judge it', 'Identical stations, a clock, and judging that has to be defensible.', {
    about: 'Fairness is the product. Every station identical, the same ingredients, a visible clock and criteria published before entries — without those, the result is an opinion.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE,
      Q('entrants', 'How many competitors or teams?', 'select', { options: [['6', 'Up to 6'], ['16', 'Up to 16'], ['40', 'Up to 40'], ['80', 'More than 40']] }),
      Q('format', 'What is the format?', 'one', { options: [['mystery', 'A mystery box'], ['set', 'A set dish'], ['free', 'Free choice'], ['heats', 'Heats and a final'], ['speed', 'Against the clock']] }),
      Q('judging', 'How is it judged?', 'one', { options: [['blind', 'Blind tasting'], ['panel', 'An open panel'], ['audience', 'Audience vote'], ['mixed', 'A mix']] }),
      Q('supervision', 'What is the supervision ratio at the stations?', 'one', { options: [['one_four', 'One to four'], ['one_eight', 'One to eight'], ['one_twelve', 'One to twelve'], ['unsure', 'Not decided']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, AWARDS, AV, PHOTOS, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Match', 'Identical stations — same burners, same boards, same equipment'),
      S('catering_food', 'recommended', 'Supply', 'Identical ingredient sets, weighed and issued at the same moment'),
      S('safety_facilities', 'recommended', 'Cover', 'Burn dressings, extinguishers at the stations, and the clear-up'),
      S('invitation_printing', 'recommended', 'Publish', 'Criteria, score sheets, station numbers and certificates'),
      S('guest_services', 'conditional', 'Marshal', 'Station supervision, the clock, and plates taken to the judges', { when: [notAns('supervision', 'unsure')] }),
      S('power_cooling', 'conditional', 'Supply', 'Power and cold storage, identical at every station', { when: WHEN_COOKING }),
      S('sound_av', 'conditional', 'Call', 'A clock everyone can see, a PA, and a camera on the judging', { when: [some(WHEN_STAGE[0], WHEN_PA[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies and prizes, and something for every competitor', { when: WHEN_TROPHY }),
      S('tent_furniture', 'conditional', 'Seat', 'Judging table, audience seating and a holding area for plates', { when: [some(WHEN_SEATS[0], ans('judging', 'panel', 'audience', 'mixed'))] }),
      S('photography', 'conditional', 'Capture', 'The stations, the plates and the judging', { when: WHEN_SHOT }),
      S('event_lighting', 'conditional', 'Light', 'Neutral light over the judging table, so colour reads honestly', { when: [some(WHEN_LIT[0], ans('judging', 'blind', 'panel', 'mixed'))] }),
      S('videography', 'conditional', 'Film', 'The judging filmed, which is what settles a protest', { when: WHEN_FILM }),
      S('venue', 'conditional', 'Find', 'A space with ventilation, power and room between stations', { when: WHEN_FINDING }),
    ],
    addons: [
      X('identical_stations', 'Level it', 'Every station built and checked identical before competitors arrive', 'schedule', { experience: true }),
      X('blind_service', 'Anonymise', 'Plates coded and served to judges without any name attached', 'poll', { trade: 'guest_services', when: [ans('judging', 'blind', 'mixed')] }),
      X('published_criteria', 'State it', 'Criteria and the judging panel published before entries close', 'invite', { trade: 'invitation_printing' }),
      X('ingredient_parity', 'Weigh it', 'Ingredient sets weighed and identical, issued at the same moment', 'chef', { trade: 'catering_food', when: [ans('format', 'mystery', 'set', 'speed')] }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the criteria and the panel before entries close, and make every station identical. Fairness is the only thing this event sells.' },
    timeline: {
      before: ['Criteria and the panel published before entries close', 'Stations built identical and checked, one against another', 'Ingredient sets weighed and sealed'],
      during: ['Ingredients issued at the same moment to every station', 'Supervision at the stated ratio, clock visible to all', 'Plates coded before they reach the judges'],
      after: ['Scores published with the criteria visible', 'Stations cleaned and equipment reconciled', 'Any protest handled against the published process'],
    },
    checklist: ['Criteria and panel published', 'Stations built identical', 'Ingredient sets weighed and sealed', 'Plates coded for judging'],
  }),

  B('baking-workshop', 'Prove it', 'Dough that will not wait, in a room where everyone works at a different speed.', {
    about: 'Unlike other cookery classes, the timings are not negotiable: proving, resting and baking happen on their own clock. The session has to be built around the dough, not the schedule.',
    formats: ['venue', 'restaurant', 'home'],
    ask: [
      GUESTS, PLACE,
      Q('what_baking', 'What are they baking?', 'one', { options: [['bread', 'Bread'], ['pastry', 'Pastry'], ['cakes', 'Cakes'], ['cookies', 'Cookies and biscuits'], ['sourdough', 'Sourdough'], ['kids', 'A children’s session']] }),
      Q('take_home', 'Do participants take their bake home?', 'yesno'),
      Q('oven_capacity', 'How many ovens are available?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'More than four']] }),
      Q('supervision', 'What is the supervision ratio?', 'one', { options: [['one_four', 'One to four'], ['one_eight', 'One to eight'], ['one_twelve', 'One to twelve'], ['unsure', 'Not decided']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, AV, DRINKS, PHOTOS, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Bench', 'Work benches, scales, mixers, proving space and tins per person'),
      S('catering_food', 'recommended', 'Pre-stage', 'Ingredients weighed per bench, and doughs started in advance'),
      S('safety_facilities', 'recommended', 'Cover', 'Burn dressings, oven-glove discipline, and the clear-up after'),
      S('invitation_printing', 'recommended', 'Hand out', 'Recipe cards, allergen notes, bench labels and take-home bags'),
      S('power_cooling', 'recommended', 'Supply', 'Oven and mixer power, chilled space, and somewhere warm to prove'),
      S('guest_services', 'conditional', 'Supervise', 'Assistants at the stated ratio, especially around hot ovens', { when: [notAns('supervision', 'unsure')] }),
      S('sound_av', 'conditional', 'Show', 'An overhead camera on the hands, because shaping cannot be described', { when: [some(WHEN_STAGE[0], WHEN_PA[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Benches and seating for the waiting parts, of which there are many', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Record', 'Participants and their bakes, which is what they want afterwards', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Refresh', 'Tea and coffee for the proving waits', { when: WHEN_BAR }),
      S('event_lighting', 'conditional', 'Light', 'Light on the bench, so colour and crumb can be judged', { when: WHEN_LIT }),
      S('venue', 'conditional', 'Find', 'A space with ovens, benches and somewhere warm for proving', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dough_timeline', 'Work backwards', 'A session built around the proving clock, not the other way round', 'schedule', { experience: true }),
      X('pre_started_doughs', 'Stagger it', 'Doughs started in advance, so nobody waits three hours to bake', 'chef', { trade: 'catering_food' }),
      X('oven_rota', 'Share the heat', 'An oven rota, because four ovens will not take twenty bakes at once', 'poll', { experience: true, when: [ans('oven_capacity', '1', '2', '4')] }),
      X('take_home_boxes', 'Send it home', 'Boxes and bags, so a hot bake survives the journey', 'craft', { trade: 'invitation_printing', when: [ans('take_home', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Allergens — flour, nuts, dairy, egg — declared in writing. Build the session around the dough’s clock, not the room’s.' },
    timeline: {
      before: ['Session timed backwards from the proving and baking clock', 'Doughs started in advance so nobody waits idle', 'Allergens written on the recipe card and the bench label'],
      during: ['Supervision at the ratio, especially around hot ovens', 'Oven rota followed so every bake gets its slot', 'Overhead camera on shaping, which cannot be described'],
      after: ['Bakes boxed for the journey home', 'Benches and ovens cleaned', 'Recipe cards sent digitally as well'],
    },
    checklist: ['Session timed to the dough', 'Doughs pre-started', 'Oven rota agreed', 'Allergens on card and bench'],
  }),

  B('brewery-tasting-event', 'Taste through', 'A structured flight, in a room where someone explains what you are drinking.', {
    about: 'Different from a party at a brewery: this is an educational, licensed tasting. Measured pours, an order that builds, water between, and a producer who can talk about what is in the glass.',
    formats: ['venue', 'restaurant'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('flights', 'How many pours?', 'select', { options: [['4', 'Four'], ['6', 'Six'], ['8', 'Eight'], ['12', 'More than eight']] }),
      Q('led_by', 'Who is leading it?', 'one', { options: [['brewer', 'The brewer'], ['sommelier', 'A beer sommelier'], ['host', 'A host'], ['none', 'Self-guided']] }),
      Q('licence_holder', 'Who holds the alcohol licence?', 'one', {
        options: [['venue', 'The venue'], ['brewery', 'The brewery'], ['unsure', 'Not sure yet']],
        help: 'Someone must hold it, and it is never us. The legal drinking age applies at the door.',
      }),
      Q('food_pairing', 'Is there food paired with the pours?', 'yesno'),
      DIET_SPLIT, ALLERGENS, STAFF, TABLEWARE, AV, KITCHEN, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('bar_beverages', 'recommended', 'Pour', 'Measured pours in order, correct glassware, water and spittoons'),
      S('invitation_printing', 'recommended', 'Note it', 'Tasting notes per pour, allergen cards and the running order'),
      S('catering_food', 'conditional', 'Pair', 'Food built to the pours and served in the order the flight needs', { when: [some(ans('food_pairing', 'yes'), WHEN_COOKING[0])] }),
      S('event_equipment_rental', 'conditional', 'Lay', 'Tasting mats, glassware per flight, spittoons and the table setup', { when: [some(WHEN_TABLEWARE[0], WHEN_SEATS[0])] }),
      S('guest_services', 'conditional', 'Serve', 'Staff who can pour a flight in order and keep water topped up', { when: WHEN_STAFFED }),
      S('sound_av', 'conditional', 'Carry', 'A mic for whoever is leading, in a room with hard surfaces', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('event_lighting', 'conditional', 'Show true', 'Light you can judge colour and clarity by', { when: WHEN_LIT }),
      S('tent_furniture', 'conditional', 'Seat', 'Tables with room for several glasses and a water jug per person', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Shoot', 'The pours and the pairings, which is the content this produces', { when: WHEN_SHOT }),
      S('security_services', 'recommended', 'Check', 'Age checking at the door, which a tasting still needs'),
      S('passenger_transport', 'recommended', 'Home', 'Transport home, offered because there is alcohol'),
      S('venue', 'conditional', 'Find', 'A room with the licence, the light and quiet enough to hear a brewer', { when: WHEN_FINDING }),
    ],
    addons: [
      X('measured_pours', 'Pace it', 'Measured pours, water between, spittoons on every table', 'glass', { trade: 'bar_beverages' }),
      X('flight_order', 'Build it', 'An order that builds, light to heavy, agreed with the brewer', 'schedule', { experience: true }),
      X('age_check', 'Verify', 'Age checked at the door, by staff briefed to do it', 'guest_services', { trade: 'security_services' }),
      X('rides_home', 'Get home', 'Transport booked for the end, before the tasting starts', 'bus', { trade: 'passenger_transport' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The licence is the venue’s or the brewery’s, never ours, and the legal drinking age applies at the door. Measured pours, water and transport home are how this is run responsibly.' },
    timeline: {
      before: ['Licence holder confirmed in writing and age policy agreed', 'Pour order and any pairings agreed with the brewer', 'Allergens collected and printed on the cards'],
      during: ['Age checked at the door', 'Measured pours in order, water and spittoons on every table', 'Nobody over-served; transport offered'],
      after: ['Notes and the pour list sent to guests', 'Transport confirmed everyone got home', 'Brewery and venue settled'],
    },
    checklist: ['Licence holder confirmed', 'Age checking at the door', 'Measured pours and water', 'Transport home arranged'],
  }),

  B('farm-to-table-dinner', 'Source it', 'A table in a field, and a supply chain short enough to name every farm.', {
    about: 'The provenance is the product, which means the sourcing has to be real and documented. The site is usually a field with no kitchen, no power and no washroom — all of which have to arrive.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('sourcing', 'How is the food sourced?', 'one', { options: [['onfarm', 'From the farm it is served on'], ['local', 'From named local producers'], ['mixed', 'A mix'], ['unsure', 'Not decided yet']] }),
      Q('site', 'What does the site have?', 'many', { options: [['power', 'Power'], ['water', 'Water'], ['shelter', 'Shelter'], ['toilets', 'Washrooms'], ['access', 'Vehicle access'], ['nothing', 'None of these']] }),
      Q('weather_plan', 'What happens if it rains?', 'one', { options: [['cover', 'Arrange cover'], ['indoor', 'Move indoors'], ['postpone', 'Postpone'], ['risk', 'Take the chance']] }),
      DIET_SPLIT, ALLERGENS, KITCHEN, DRINKS, STAFF, TABLEWARE, AV, SIGNAGE, PHOTOS, SEATS, WASTE,
    ],
    plan: [
      S('catering_food', 'recommended', 'Cook', 'A menu written to what the named producers actually have that week'),
      S('event_equipment_rental', 'recommended', 'Bring it', 'A field kitchen, tables, seating, washrooms and the whole setup'),
      S('power_cooling', 'recommended', 'Supply', 'Power and cold storage, because a field has neither'),
      S('tent_furniture', 'recommended', 'Shelter', 'Cover, long tables, seating, linen and a wet-weather option'),
      S('event_lighting', 'recommended', 'Light', 'Light for a table that will still be sitting after dark'),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, handwashing, waste and the site left as found', { when: [some(ans('site', 'nothing', 'toilets'), WHEN_WASTE[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'Drinks and cold storage, as you chose', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Serve', 'Service staff who can work a long table in a field', { when: WHEN_STAFFED }),
      S('invitation_printing', 'conditional', 'Credit', 'A menu naming every producer, with allergens, and place cards', { when: [some(WHEN_SIGNED[0], WHEN_TABLEWARE[0])] }),
      S('passenger_transport', 'conditional', 'Carry', 'Transport to a site a car may not reach', { when: [ans('site', 'access', 'nothing')] }),
      S('photography', 'conditional', 'Shoot', 'The table in the landscape, which is the image this exists for', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Deliver', 'Everything in and everything out, over ground with no road', { when: [some(ans('site', 'nothing'), WHEN_BROUGHT[0])] }),
      S('venue', 'conditional', 'Find', 'A farm or field that will take a table, a kitchen and a van', { when: WHEN_FINDING }),
    ],
    addons: [
      X('producer_list', 'Name them', 'Every producer named on the menu, and told they are being named', 'invite', { trade: 'invitation_printing', when: [ans('sourcing', 'onfarm', 'local', 'mixed')] }),
      X('wet_weather', 'Cover it', 'Cover that can go up quickly, with a go or no-go time agreed', 'tent', { trade: 'tent_furniture', when: [ans('weather_plan', 'cover')] }),
      X('field_washrooms', 'Provide', 'Washrooms and handwashing, which a field will not have', 'broom', { trade: 'safety_facilities', when: [ans('site', 'toilets', 'nothing')] }),
      X('leave_no_trace', 'Leave it', 'The site returned exactly as found, including the ground under the table', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Cold chain from the producer to the table, handwashing on site, and the field left as found. Name producers only with their agreement.' },
    timeline: {
      before: ['Producers confirmed and the menu written to what they have', 'Site surveyed for access, power, water and drainage', 'Wet-weather plan agreed with a decision time'],
      during: ['Cold chain maintained from the van to the plate', 'Handwashing and washrooms available from arrival', 'Weather watched against the agreed decision time'],
      after: ['Site returned as found, including the ground', 'Producers thanked and named in whatever is published', 'Waste removed, nothing left'],
    },
    checklist: ['Producers confirmed and named with consent', 'Site surveyed for access and services', 'Cold chain planned from producer to plate', 'Wet-weather plan with a decision time'],
  }),

  B('food-truck-festival', 'Roll in', 'Twenty vehicles parked in a line, each one a kitchen with wheels.', {
    about: 'The trucks bring their own kitchens, which removes half the usual problem and adds another: vehicle access, pitch spacing, generators and a ground that will take the weight.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('trucks', 'How many trucks?', 'select', { options: [['5', 'Up to 5'], ['15', 'Up to 15'], ['35', 'Up to 35'], ['70', 'More than 35']] }),
      Q('truck_needs', 'What do the trucks need?', 'many', { options: [['power', 'Mains power instead of generators'], ['water', 'Water'], ['waste', 'Waste and grey water'], ['access', 'Hard standing or access'], ['own', 'They are self-sufficient']] }),
      Q('layout', 'How are they laid out?', 'one', { options: [['line', 'In a line'], ['horseshoe', 'A horseshoe'], ['clusters', 'Clusters around seating'], ['perimeter', 'Around the perimeter']] }),
      DIET_SPLIT, ALLERGENS, LICENCE, DRINKS, WASTE, AV, SEATS, PHOTOS, SIGNAGE, GUARD, CLEAN,
    ],
    plan: [
      S('catering_food', 'recommended', 'Line up', 'Trucks placed with fire separation and queues that do not cross'),
      S('safety_facilities', 'recommended', 'Service', 'Handwashing, washrooms, waste, grey water and the clear-up'),
      S('event_equipment_rental', 'recommended', 'Furnish', 'Communal seating, bins, barriers and the queue lines'),
      S('power_cooling', 'conditional', 'Supply', 'Mains power where it replaces generators, and cold storage', { when: [ans('truck_needs', 'power', 'water')] }),
      S('invitation_printing', 'recommended', 'Map it', 'A ground map, truck signage, allergen boards and menu displays'),
      S('tent_furniture', 'conditional', 'Shade', 'Shade and communal benches, which is where people actually eat', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Festoon lighting across the seating and the truck line', { when: [some(WHEN_LIT[0], WHEN_OUTSIDE[0])] }),
      S('security_services', 'conditional', 'Marshal', 'Stewarding, vehicle marshalling and watch on the cash points', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter alongside the trucks, as you chose', { when: WHEN_BAR }),
      S('sound_av', 'conditional', 'Play', 'Music across the ground and a mic for announcements', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('guest_services', 'conditional', 'Admit', 'Gates, tokens and an information point', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Shoot', 'The line of trucks at dusk, which is the shot this produces', { when: WHEN_SHOT }),
      S('transportation', 'conditional', 'Marshal in', 'Vehicle movements in and out, to slots, with a cleared route', { when: [ans('trucks', '15', '35', '70')] }),
      S('venue', 'conditional', 'Secure', 'A ground with hard standing, vehicle access and waste facilities', { when: WHEN_FINDING }),
    ],
    addons: [
      X('pitch_spacing', 'Space it', 'Pitches set for fire separation and queues that do not merge', 'map', { experience: true }),
      X('vehicle_marshalling', 'Guide them in', 'Marshalled move-in and move-out slots for every vehicle', 'move', { trade: 'security_services', when: [ans('trucks', '15', '35', '70')] }),
      X('grey_water', 'Take it away', 'Grey water and oil collected from every truck, not poured on the ground', 'broom', { trade: 'safety_facilities', when: [ans('truck_needs', 'waste')] }),
      X('allergen_boards', 'Declare', 'A written allergen board on every truck, checked before service', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Fire separation between vehicles, grey water collected rather than poured away, and an allergen board on every truck.' },
    timeline: {
      before: ['Ground checked for hard standing and vehicle access', 'Pitches set for fire separation and queue flow', 'Licences, allergen information and generator details collected per truck'],
      during: ['Vehicles marshalled in, nothing moving once the public is on site', 'Gas and fire checks at every truck before service', 'Grey water and waste collected through the evening'],
      after: ['Marshalled move-out after the public has left', 'Ground cleared including oil and grey water', 'Vendor settlement'],
    },
    checklist: ['Hard standing and vehicle access', 'Fire separation between pitches', 'Grey water and oil collection', 'Allergen board on every truck'],
  }),

  B('catering-showcase', 'Demonstrate', 'A caterer proving to planners that they can do this at scale.', {
    about: 'A sales event disguised as a meal. The audience is professional, so consistency across a hundred covers matters more than any single plate, and the back-of-house is part of what is being shown.',
    formats: ['venue', 'restaurant'],
    ask: [
      GUESTS, PLACE, SERVICE,
      Q('audience_kind', 'Who is being shown?', 'many', { options: [['planners', 'Event planners'], ['corporates', 'Corporate buyers'], ['couples', 'Wedding clients'], ['venues', 'Venue partners'], ['press', 'Press']] }),
      Q('demonstrate', 'What is being demonstrated?', 'many', { options: [['menus', 'Menu range'], ['scale', 'Capacity at scale'], ['live', 'Live counters'], ['plating', 'Plated service'], ['styling', 'Table styling'], ['dietary', 'Dietary range']] }),
      Q('followup', 'Is there a booking or enquiry process on the day?', 'yesno', { optional: true }),
      DIET_SPLIT, ALLERGENS, KITCHEN, DRINKS, STAFF, TABLEWARE, AV, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('catering_food', 'recommended', 'Prove it', 'The same dish, to the same standard, across every cover in the room'),
      S('event_equipment_rental', 'recommended', 'Stage', 'Live counters, buffet stations, plated settings and the styling'),
      S('decoration_floral', 'recommended', 'Style', 'Table styling, which is half of what a planner is buying'),
      S('invitation_printing', 'recommended', 'Document', 'Menus with allergens, capability sheets, price guides and cards'),
      S('guest_services', 'conditional', 'Serve', 'Service staff shown at the standard the caterer is actually selling', { when: WHEN_STAFFED }),
      S('event_lighting', 'conditional', 'Light', 'Lighting for the room and for the photographs the caterer will reuse', { when: [some(WHEN_LIT[0], WHEN_SHOT[0])] }),
      S('photography', 'conditional', 'Shoot', 'Every dish and every setting — the whole point is the portfolio', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service shown at the same standard, as you chose', { when: WHEN_BAR }),
      S('power_cooling', 'conditional', 'Hold', 'Hot holding and cold storage — consistency is what is being proved', { when: WHEN_COOKING }),
      S('tent_furniture', 'conditional', 'Set', 'Tables, linen, crockery and glassware at showcase standard', { when: [some(WHEN_SEATS[0], WHEN_TABLEWARE[0])] }),
      S('sound_av', 'conditional', 'Present', 'A mic and a screen for the capability presentation', { when: [some(WHEN_PA[0], WHEN_STAGE[0])] }),
      S('videography', 'conditional', 'Film', 'A film of the service, which sells capacity better than words', { when: WHEN_FILM }),
      S('venue', 'conditional', 'Find', 'A venue that shows the caterer at the scale they want to sell', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dietary_range', 'Show it all', 'A full vegetarian, Jain and vegan set, plated to the same standard', 'chef', { trade: 'catering_food', when: [ans('demonstrate', 'dietary')] }),
      X('portfolio_shoot', 'Capture it', 'A proper shoot of every dish and setting, for the caterer to keep', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('capability_sheet', 'State it', 'Covers, lead times, kitchen capacity and staffing, in writing', 'invite', { trade: 'invitation_printing' }),
      X('enquiry_desk', 'Follow up', 'A staffed desk taking enquiries, and a follow-up within two days', 'budget', { trade: 'guest_services', when: [ans('followup', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Consistency across every cover is what is being demonstrated. Allergens are declared in writing here too, in front of the people who will ask about them.' },
    timeline: {
      before: ['Menu chosen to show range and to hold across every cover', 'Allergen and dietary sets prepared to the same standard', 'Photographer briefed on every dish and setting to capture'],
      during: ['Every cover sent to the same standard, which is the demonstration', 'Capability sheet given out, not just described', 'Enquiries taken at a staffed desk'],
      after: ['Portfolio images delivered to the caterer', 'Enquiries followed up within two days', 'Venue and staff settled'],
    },
    checklist: ['Menu chosen to hold at scale', 'Dietary range plated to the same standard', 'Capability sheet in writing', 'Enquiry desk staffed'],
  }),

  B('hospitality-food-expo', 'Trade', 'A hall of suppliers, samples all day, and a cold chain that has to hold for three of them.', {
    about: 'A trade show where almost every stand hands out food. Sampling hygiene, cold storage per stand and waste through the day are the operational core, and the buyers are the customers.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE,
      Q('stands', 'How many exhibitor stands?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Four or more']] }),
      Q('exhibitor_needs', 'What do stands need?', 'many', { options: [['power', 'Power'], ['cold', 'Cold storage'], ['water', 'Water'], ['cooking', 'Cooking on stand'], ['waste', 'Waste removal']] }),
      Q('features', 'What else is on?', 'many', { options: [['demos', 'Chef demonstrations'], ['awards', 'Industry awards'], ['competition', 'A competition'], ['seminars', 'Seminars'], ['matchmaking', 'Buyer meetings']] }),
      DIET_SPLIT, ALLERGENS, LICENCE, DRINKS, WASTE, AV, AWARDS, KITCHEN, PHOTOS, SIGNAGE, GUARD, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Construct', 'Shell scheme, stands, demo kitchens, seminar rooms and the aisles'),
      S('power_cooling', 'recommended', 'Distribute', 'Metered power and cold storage per stand, sized stand by stand'),
      S('safety_facilities', 'recommended', 'Service', 'Handwashing, waste through the day, washrooms and the clear-up'),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, a floor plan, stand numbers and the trade catalogue'),
      S('guest_services', 'recommended', 'Admit', 'Trade registration, badge printing and buyer-meeting scheduling'),
      S('catering_food', 'conditional', 'Feed', 'Catering for buyers and crew, separate from exhibitor sampling', { when: [some(WHEN_COOKING[0], from(1000))] }),
      S('sound_av', 'conditional', 'Stage', 'Demo kitchen cameras and screens, seminar sound and the awards stage', { when: [some(ans('features', 'demos', 'seminars', 'awards'), WHEN_STAGE[0])] }),
      S('security_services', 'conditional', 'Secure', 'Hall security overnight and badge-checked entry', { when: [some(WHEN_GUARD[0], ans('days', '2', '3', '5'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seminar seating, meeting tables and seating across the hall', { when: [some(WHEN_SEATS[0], ans('features', 'seminars', 'matchmaking'))] }),
      S('photography', 'conditional', 'Document', 'Stands, demos and the floor, for exhibitors and next year’s sell', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award', 'Industry awards and trophies, where there is an awards segment', { when: [some(ans('features', 'awards'), WHEN_TROPHY[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build-up, move-in, move-out and crew across the days', { when: [ans('days', '2', '3', '5')] }),
      S('loading_unloading_crew', 'conditional', 'Lift', 'A crew for move-in and move-out, including heavy refrigeration', { when: [ans('stands', '200', '500')] }),
      S('venue', 'conditional', 'Secure', 'A hall with the power, the cold-chain capacity and the loading access', { when: WHEN_FINDING }),
    ],
    addons: [
      X('sampling_hygiene', 'Sample safely', 'A written sampling standard every exhibitor signs up to', 'chef', { experience: true }),
      X('cold_per_stand', 'Keep cold', 'Cold storage at every stand that samples, with logged temperatures', 'bar_beverages', { trade: 'power_cooling', when: [ans('exhibitor_needs', 'cold')] }),
      X('exhibitor_manual', 'Instruct', 'A manual with move-in slots, power limits, sampling and waste rules', 'invite', { trade: 'invitation_printing' }),
      X('buyer_meetings', 'Match', 'Scheduled buyer-seller meetings, which is what exhibitors rebook for', 'group', { experience: true, when: [ans('features', 'matchmaking')] }),
    ],
    toolkit: { polls: ['date'], note: 'Every stand that samples needs cold storage, handwashing and a written allergen notice. The exhibitors are the customers, and footfall is what they bought.' },
    timeline: {
      before: ['Power and cold storage sized per sampling stand', 'Exhibitor manual issued with sampling, waste and move-in rules', 'Licences and allergen information collected per exhibitor'],
      during: ['Temperatures checked and logged at sampling stands each morning', 'Waste and handwashing serviced through the day', 'Buyer meetings run to the schedule'],
      after: ['Move-out to slots with the crew booked', 'Footfall and buyer-meeting report to every exhibitor', 'Hall reinstated'],
    },
    checklist: ['Cold storage per sampling stand', 'Exhibitor manual issued', 'Sampling hygiene standard agreed', 'Waste serviced through the day'],
  }),
]

export const FOOD_BLUEPRINT = Object.fromEntries(FOOD_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(FOOD_BLUEPRINTS, 'food')
