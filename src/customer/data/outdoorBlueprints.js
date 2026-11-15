/**
 * Travel, Destination & Outdoor Events — one blueprint per occasion.
 *
 * Twenty-four occasions that happen away from a venue, often away from
 * a road, and sometimes away from land. What that changes:
 *
 *   · We have no hotel, airline or charter trade, and we do not pretend
 *     to. Accommodation, flights and vessel charter are arranged by the
 *     customer or their operator; we plan the event around them and say
 *     plainly which parts are not ours.
 *   · Anything on water runs under a licensed operator, with a licensed
 *     crew, a stated passenger capacity and the safety equipment that
 *     capacity requires. We never arrange a vessel ourselves and never
 *     treat a capacity as assumed.
 *   · Adventure activities run under qualified instructors, certified
 *     equipment, an agreed ratio and the operator's own insurance. All
 *     four are conditions, not line items.
 *   · Weather is a decision, not a hope. Every outdoor plan carries a
 *     fallback and a stated time at which the call is made.
 *   · A site with no road has no power, no water and no washroom.
 *     Everything arrives, and everything leaves.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, checkTrades,
  PHOTOS, PRIEST, RITUAL_LANG, RITUAL_KIT, GIVEN_TIME, DRESS_CODE,
  DIET_ONLY, ALLERGY_ONLY, CAKE_Q, UNLESS_PHOTO, WHEN_PRIEST, WHEN_KIT,
} from './blueprintKit'

/* ── The questions a destination or outdoor event asks ──────────── */

const GUESTS = Q('guests_count', 'How many people?', 'select', {
  options: [['12', 'Up to 12'], ['40', 'Up to 40'], ['150', 'Up to 150'], ['600', 'Up to 600'], ['3000', 'More than 600']],
})
const PLACE = Q('place', 'Where is it?', 'one', {
  options: [['resort', 'A resort or property'], ['beach', 'A beach'], ['garden', 'A garden or lawn'], ['hills', 'Hills or forest'], ['ground', 'An open ground'], ['water', 'On water'], ['find', 'Please help us find somewhere']],
})
const NIGHTS = Q('nights', 'How many nights?', 'select', {
  options: [['0', 'A day, no stay'], ['1', 'One night'], ['2', 'Two nights'], ['4', 'Up to four'], ['7', 'A week or more']],
})
const TRAVEL = Q('travel', 'How do people get there?', 'many', {
  options: [['air', 'By air'], ['train', 'By train'], ['road', 'By road'], ['own', 'Their own way'], ['coach', 'A coach we arrange']],
})
const STAY = Q('stay', 'Is accommodation arranged?', 'one', {
  optional: true, when: [notAns('nights', '0')],
  options: [['booked', 'Yes, booked'], ['arranging', 'Being arranged'], ['guests', 'Guests book their own'], ['none', 'Not needed']],
  help: 'Rooms are yours to book — we have no hotel partners. We plan the timings and the transfers around them.',
})

/** Weather is a decision with a time on it. */
const WEATHER = Q('weather_plan', 'What happens if the weather turns?', 'one', {
  options: [['cover', 'Arrange cover'], ['indoor', 'Move indoors'], ['postpone', 'Postpone'], ['risk', 'Take the chance']],
  help: 'Whatever you choose, we will set a time at which the call gets made.',
})
const MEDICAL = Q('medical', 'What medical cover is needed?', 'many', {
  options: [['firstaid', 'First aid on site'], ['ambulance', 'An ambulance route identified'], ['medic', 'A medic present'], ['venue_med', 'The property provides it'], ['none_med', 'Not needed']],
})
const PERMITS = Q('permits', 'Are the site permissions in place?', 'one', {
  options: [['yes', 'Yes, in writing'], ['applying', 'We are applying'], ['no', 'Not yet'], ['private', 'Private property — not needed']],
  help: 'A beach, a forest, a heritage site and a public ground each need permission. We never treat one as granted.',
})

/** Anything regulated runs under somebody else's licence. */
const OPERATOR = Q('operator', 'Is the licensed operator engaged?', 'one', {
  options: [['confirmed', 'Confirmed, with licence and insurance'], ['identified', 'Identified, not confirmed'], ['no', 'Not yet']],
  help: 'Vessels, adventure activities and anything licensed are the operator’s. We check the paperwork and plan around it.',
})
const SITE_HAS = Q('site_has', 'What does the site already have?', 'many', {
  optional: true,
  options: [['power', 'Power'], ['water', 'Water'], ['toilets', 'Washrooms'], ['shelter', 'Shelter'], ['access', 'Vehicle access'], ['nothing', 'None of these']],
})
const FOOD = Q('food', 'Food', 'one', {
  options: [['allmeals', 'Every meal'], ['main', 'One main meal'], ['buffet_o', 'A buffet'], ['picnic', 'Picnic or packed food'], ['stalls_o', 'Food stalls'], ['none', 'Nothing needed']],
})
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['pa', 'A PA or sound'], ['mics', 'Microphones'], ['lights', 'Lighting'], ['screen', 'A screen'], ['stage', 'A stage'], ['music_av', 'Music']],
})
const SEATS = Q('seating', 'Do you need seating and furniture?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need security or stewarding?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up and waste removal?', 'yesno', { optional: true })
const TRANSFERS = Q('transfers', 'Do you need local transfers on the ground?', 'yesno', { optional: true })
const SIGNAGE = Q('signage', 'Do you need signage and printed material?', 'yesno', { optional: true })
const DECOR = Q('decor', 'How much decoration?', 'one', {
  optional: true, options: [['full', 'A full setup'], ['focal', 'A few focal points'], ['light_d', 'Light touches'], ['none_d', 'None']],
})

const WHEN_STAYING = [ans('nights', '1', '2', '4', '7')]
const WHEN_LONG = [ans('nights', '2', '4', '7')]
const WHEN_FLY = [ans('travel', 'air', 'train')]
const WHEN_TRANSFER = [ans('transfers', 'yes')]
const WHEN_COVER = [ans('weather_plan', 'cover')]
const WHEN_AID = [ans('medical', 'firstaid', 'ambulance', 'medic')]
const WHEN_MEDIC = [ans('medical', 'medic')]
const WHEN_PERMIT_HELP = [ans('permits', 'applying', 'no')]
const WHEN_OP_HELP = [ans('operator', 'identified', 'no')]
const WHEN_NO_SERVICES = [some(ans('site_has', 'nothing'), notAns('site_has', 'power', 'water', 'toilets'))]
const WHEN_NO_POWER = [notAns('site_has', 'power')]
const WHEN_NO_LOOS = [notAns('site_has', 'toilets')]
const WHEN_FOOD = [ans('food', 'allmeals', 'main', 'buffet_o', 'picnic', 'stalls_o')]
const WHEN_AV = [has('av')]
const WHEN_PA = [ans('av', 'pa', 'mics')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_MUSIC = [ans('av', 'music_av')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_DECOR = [ans('decor', 'full', 'focal')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'ground', 'hills', 'beach')]
const WHEN_BIG = [ans('guests_count', '150', '600', '3000')]

export const OUTDOOR_BLUEPRINTS = [

  B('destination-celebration', 'Take them', 'An occasion everyone has to travel to, which makes the journey part of it.', {
    about: 'Guests cannot leave and cannot pop home for anything forgotten. Arrivals, rooms, meals and departures are the plan; the celebration sits inside them.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER,
      Q('occasion_for', 'What is being celebrated?', 'one', { options: [['milestone', 'A milestone'], ['family', 'A family occasion'], ['friends', 'A friends’ trip'], ['corporate_d', 'A work celebration'], ['other_d', 'Something else']] }),
      DIET_ONLY, ALLERGY_ONLY, FOOD, AV, SEATS, MEDICAL, PHOTOS, DECOR, TRANSFERS,
    ],
    plan: [
      S('passenger_transport', 'recommended', 'Move them', 'Airport and station transfers, timed so nobody arrives unmet'),
      S('catering_food', 'conditional', 'Feed them', 'Every meal across the stay, to everyone’s stated needs', { when: WHEN_FOOD }),
      S('guest_services', 'recommended', 'Care for them', 'Arrival, rooming, a host per group and one contact for the whole trip'),
      S('decoration_floral', 'conditional', 'Dress it', 'The celebration setting, worked into the place rather than onto it', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Capture', 'The days, not just the event — this is a trip, not an evening', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic, which a resort’s own system rarely covers', { when: WHEN_AV }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the grounds and the evening settings', { when: [some(WHEN_LIT[0], WHEN_DECOR[0])] }),
      S('tent_furniture', 'conditional', 'Furnish', 'Outdoor dining, lounge settings and a wet-weather option', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('live_entertainment', 'conditional', 'Programme it', 'Music and activities across the nights, not only the main evening', { when: [some(WHEN_MUSIC[0], WHEN_LONG[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid on the property and the route to the nearest hospital', { when: [some(WHEN_AID[0], WHEN_STAYING[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Staging, dance floors and the outdoor setups', { when: [some(WHEN_STAGE[0], WHEN_DECOR[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew and equipment across several days and several settings', { when: WHEN_LONG }),
      S('venue', 'conditional', 'Find', 'A property that holds the group, the celebration and the nights', { when: WHEN_FINDING }),
    ],
    addons: [
      X('arrival_buffer', 'Allow for travel', 'A first evening with nothing in it, because travel always overruns', 'bus', { experience: true, when: WHEN_FLY }),
      X('rooming_list', 'Place them', 'A rooming list agreed before arrival, not sorted at reception', 'bed', { experience: true, when: WHEN_STAYING }),
      X('medical_route', 'Know the way', 'The nearest hospital identified and the route timed before guests arrive', 'map', { trade: 'safety_facilities', when: WHEN_STAYING }),
      X('departure_plan', 'Get them home', 'Departure transfers planned before arrival, not on the last morning', 'bus', { trade: 'passenger_transport', when: WHEN_TRANSFER }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We have no hotel partners — rooms and flights stay yours to book. We plan the transfers, the timings and the celebration around them.' },
    timeline: {
      before: ['Transfers planned both ways before anyone travels', 'Rooming list agreed and dietary needs confirmed to the kitchen', 'Nearest hospital identified and the route timed'],
      during: ['Guests met on arrival, not at reception', 'A named contact reachable at every hour', 'Weather watched against the agreed decision time'],
      after: ['Departure transfers run as planned', 'Property restored', 'Photographs shared with everyone who came'],
    },
    checklist: ['Transfers planned both ways', 'Rooming list agreed in advance', 'Medical route identified', 'Weather fallback with a decision time'],
  }),

  B('beach-wedding', 'By the sea', 'Sand, tide, wind and permissions — none of which a hall has.', {
    about: 'A wedding where the ground moves, the wind takes the flowers and the light is the best you will ever get. The tide table and the permission come before anything decorative.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, PERMITS, WEATHER,
      PRIEST, RITUAL_LANG, RITUAL_KIT, GIVEN_TIME,
      DIET_ONLY, ALLERGY_ONLY, FOOD, AV, SITE_HAS, MEDICAL, CLEAN, PHOTOS, DECOR, TRANSFERS,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Set the mandap', 'A mandap built to stand in sand and wind, with florals that hold'),
      S('tent_furniture', 'recommended', 'Seat them', 'Seating that stands on sand, shade, and cover held on standby'),
      S('photography', 'recommended', 'Capture', 'The light on a beach is the best there is — shot for, not against', { unless: UNLESS_PHOTO }),
      S('catering_food', 'conditional', 'Feed', 'Food kept cold and covered on a beach, which is the hard part', { when: WHEN_FOOD }),
      S('priest_rituals', 'conditional', 'Lead the rites', 'A practitioner, only because your family asked for one', { when: WHEN_PRIEST }),
      S('event_materials_supplier', 'conditional', 'Supply', 'The ceremony materials, exactly as your family specifies', { when: WHEN_KIT }),
      S('sound_av', 'recommended', 'Carry the vows', 'Sound that beats wind and surf, which swallow a voice entirely'),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Makeup and hair that survive heat, humidity and sea air', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Filmed with wind protection on every microphone', { when: WHEN_FILM }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the reception and the route back across sand', { when: [some(WHEN_LIT[0], WHEN_DECOR[0])] }),
      S('passenger_transport', 'conditional', 'Convey', 'Transfers to a beach with no parking, and back afterwards', { when: WHEN_TRANSFER }),
      S('guest_services', 'conditional', 'Host them', 'Arrivals, rooming and a host for guests who travelled', { when: [some(WHEN_STAYING[0], WHEN_BIG[0])] }),
      S('power_cooling', 'recommended', 'Bring power', 'Generators and cold storage — a beach has neither'),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water, first aid and the beach left clean', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0], WHEN_CLEAN[0])] }),
      S('venue', 'conditional', 'Secure', 'A beach with permission, access and somewhere to set up behind it', { when: WHEN_FINDING }),
    ],
    addons: [
      X('tide_table', 'Check the tide', 'Tide times checked and the ceremony set above the high-water line', 'map', { experience: true }),
      X('wind_proofing', 'Hold it down', 'Every structure and floral weighted for wind off the sea', 'tent', { trade: 'tent_furniture' }),
      X('vow_sound', 'Be heard', 'Lapel mics with wind protection, so the vows are not lost to surf', 'sound_av', { trade: 'sound_av' }),
      X('sand_walkway', 'Make it walkable', 'A walkway across sand, for anyone in heels or needing support', 'spa', { trade: 'event_equipment_rental' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The time, the rites and whether there is a practitioner at all are your family’s. We never calculate an auspicious time and never assume a ceremony. Beach permissions are the organiser’s.' },
    timeline: {
      before: ['Beach permission confirmed in writing and tide times checked', 'Ceremony sited above the high-water line, structures weighted for wind', 'Power, cold storage and washrooms arranged — a beach has none'],
      during: ['Vows mic’d with wind protection', 'Food kept cold and covered throughout', 'Guests helped across sand, especially elders'],
      after: ['Beach cleared completely, including every pin and petal', 'Generators and structures removed', 'Photographs shared quickly'],
    },
    checklist: ['Permission in writing and tide checked', 'Structures weighted for wind', 'Wind-protected microphones', 'Power, water and washrooms brought in'],
  }),

  B('garden-wedding', 'Marry outdoors', 'A lawn, which is beautiful until it rains or the ground is soft.', {
    about: 'Gentler than a beach and with the same fundamental problem: no roof. The fallback, the ground and the power are the three things a garden does not come with.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER, SITE_HAS,
      PRIEST, RITUAL_LANG, RITUAL_KIT, GIVEN_TIME,
      DIET_ONLY, ALLERGY_ONLY, FOOD, MEDICAL, CLEAN, TRANSFERS, PHOTOS, DECOR,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Set it', 'A mandap or arch and florals that work with the garden’s own planting'),
      S('tent_furniture', 'recommended', 'Furnish', 'Seating, a marquee or cover, and flooring where the ground is soft'),
      S('catering_food', 'conditional', 'Feed', 'A full meal outdoors, with a kitchen that has to be brought in', { when: WHEN_FOOD }),
      S('photography', 'recommended', 'Capture', 'A garden in late light, which is the reason it was chosen', { unless: UNLESS_PHOTO }),
      S('priest_rituals', 'conditional', 'Lead the rites', 'A practitioner, only because your family asked for one', { when: WHEN_PRIEST }),
      S('event_materials_supplier', 'conditional', 'Supply', 'The ceremony materials, as your family specifies them', { when: WHEN_KIT }),
      S('event_lighting', 'recommended', 'Light it', 'Festoon, uplighting in the planting and lit paths after dark'),
      S('sound_av', 'recommended', 'Carry', 'Sound for an open lawn, which swallows an unamplified voice'),
      S('power_cooling', 'conditional', 'Power it', 'Generators and cooling, which a garden does not have', { when: [some(WHEN_NO_POWER[0], WHEN_BIG[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Makeup and hair that hold through an afternoon outdoors', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Filmed with wind protection and a plan for changing light', { when: WHEN_FILM }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water, first aid and the garden left as found', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0], WHEN_CLEAN[0])] }),
      S('guest_services', 'conditional', 'Receive', 'Arrivals, seating and a host for guests who travelled', { when: [some(WHEN_STAYING[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Convey', 'Transfers for guests and a plan for parking on a verge', { when: WHEN_TRANSFER }),
      S('venue', 'conditional', 'Find', 'A garden with shade, firm ground and somewhere to put a marquee', { when: WHEN_FINDING }),
    ],
    addons: [
      X('ground_check', 'Walk the lawn', 'The ground checked for soft patches, which ruin heels, tables and marquees', 'map', { experience: true }),
      X('marquee_standby', 'Hold cover', 'A marquee or cover on standby, with a stated decision time', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
      X('lit_paths', 'Light the way', 'Lit paths and steps, because a garden after dark is a trip hazard', 'lighting', { trade: 'event_lighting' }),
      X('garden_washrooms', 'Provide', 'Washrooms, which a garden wedding for a hundred genuinely needs', 'broom', { trade: 'safety_facilities', when: WHEN_NO_LOOS }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The time, the rites and whether there is a practitioner are your family’s. We never calculate an auspicious time. A garden has no power, no washrooms and no roof — all three are brought in.' },
    timeline: {
      before: ['Weather fallback agreed with a stated decision time', 'Ground walked for soft patches and flooring planned', 'Power, washrooms and a kitchen arranged — a garden has none'],
      during: ['Cover put up at the agreed threshold, not after the rain starts', 'Paths lit before dusk, not after someone trips', 'Food kept cold until service'],
      after: ['Garden left as found, including the lawn', 'Hired structures and generators removed', 'Photographs shared'],
    },
    checklist: ['Weather fallback with a decision time', 'Ground walked and flooring planned', 'Power and washrooms brought in', 'Paths lit before dusk'],
  }),

  B('resort-celebration', 'Take it over', 'A resort that becomes yours for a few days, with its own rules.', {
    about: 'The property provides most of the infrastructure, which makes this the easiest destination format — and the one where the property’s own restrictions decide what is possible.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER,
      Q('exclusive', 'Is the property taken exclusively?', 'yesno', { optional: true }),
      Q('programme_res', 'What is planned across the stay?', 'many', { options: [['main_event', 'A main celebration'], ['welcome', 'A welcome evening'], ['pool_r', 'A pool event'], ['activities_r', 'Activities'], ['spa', 'Spa and wellness'], ['farewell', 'A farewell brunch']] }),
      DIET_ONLY, ALLERGY_ONLY, FOOD, AV, SEATS, MEDICAL, PHOTOS, DECOR, TRANSFERS,
    ],
    plan: [
      S('guest_services', 'recommended', 'Run the stay', 'Arrival, rooming, a daily schedule and one contact throughout'),
      S('catering_food', 'conditional', 'Feed them', 'Every meal, to everyone’s needs, across every setting on the property', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress each one', 'Each setting dressed differently, so three days do not look the same', { when: WHEN_DECOR }),
      S('passenger_transport', 'conditional', 'Convey', 'Airport transfers and movement around a large property', { when: WHEN_TRANSFER }),
      S('sound_av', 'conditional', 'Carry', 'Sound and lighting for settings the property cannot cover', { when: WHEN_AV }),
      S('photography', 'conditional', 'Capture', 'The whole stay, which is what guests remember, not one evening', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Programme', 'Evening programmes and activities across the nights', { when: [some(WHEN_MUSIC[0], ans('programme_res', 'activities_r', 'main_event'))] }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting across grounds that are dark after nine', { when: [some(WHEN_LIT[0], WHEN_DECOR[0])] }),
      S('tent_furniture', 'conditional', 'Furnish', 'Outdoor dining, lounge settings and cover', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid and a medical route, on a property far from a hospital', { when: [some(WHEN_AID[0], WHEN_STAYING[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Staging, dance floors and the setups the property lacks', { when: [some(WHEN_STAGE[0], WHEN_DECOR[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew and equipment across several days and settings', { when: WHEN_LONG }),
      S('venue', 'conditional', 'Find', 'A resort that will take the group and allow what you want to do', { when: WHEN_FINDING }),
    ],
    addons: [
      X('property_rules', 'Read their rules', 'The property’s own restrictions on sound, timings and outside suppliers', 'schedule', { experience: true }),
      X('setting_variety', 'Change the view', 'A different setting each day, so three days do not feel like one', 'map', { experience: true, when: WHEN_LONG }),
      X('medical_route', 'Know the way', 'Nearest hospital identified and the route timed before guests arrive', 'spa', { trade: 'safety_facilities', when: WHEN_STAYING }),
      X('free_time', 'Leave gaps', 'Unscheduled hours, so guests actually experience the property', 'schedule', { experience: true, when: WHEN_LONG }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The property’s own rules on sound, closing times and outside suppliers decide what is possible. We get them in writing before anything is planned around them.' },
    timeline: {
      before: ['Property’s restrictions obtained in writing — sound, timings, outside suppliers', 'Rooming list and dietary needs confirmed', 'A different setting planned for each day'],
      during: ['Daily schedule shared with guests each morning', 'Free time protected, not filled', 'Medical route known and first aid on the property'],
      after: ['Departure transfers run as planned', 'Property restored and settled', 'Photographs from across the whole stay shared'],
    },
    checklist: ['Property restrictions in writing', 'Rooming and dietary needs confirmed', 'A different setting per day', 'Medical route identified'],
  }),

  B('camping-gathering', 'Pitch up', 'A site with nothing on it, where everything arrives on your vehicle.', {
    about: 'No power, no water, no washroom and no shop. The packing list is the plan, and whatever goes in has to come out again.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, PERMITS, WEATHER, SITE_HAS,
      Q('tents', 'Tents and sleeping', 'one', { options: [['provided', 'We provide them'], ['own_tents', 'Everyone brings their own'], ['mixed_tents', 'A mix'], ['none_tents', 'No overnight stay']] }),
      Q('fire', 'Is there a campfire?', 'one', { optional: true, options: [['permitted', 'Yes, where permitted'], ['no_fire', 'No fire'], ['unsure_fire', 'Not sure if allowed']] }),
      MEDICAL, FOOD, TRANSFERS, PHOTOS, SEATS, CLEAN, AV,
    ],
    plan: [
      S('event_equipment_rental', 'conditional', 'Kit the site', 'Tents, sleeping mats, camp furniture and the gathering space', { when: [ans('tents', 'provided', 'mixed_tents')] }),
      S('safety_facilities', 'recommended', 'Service it', 'Washrooms, water, first aid and waste removal — the site has none'),
      S('catering_food', 'conditional', 'Cook out', 'Food for a site with no kitchen, and cold storage that does not exist', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Bring power', 'A generator and cold storage, because a campsite has neither', { when: [some(WHEN_NO_POWER[0], WHEN_FOOD[0])] }),
      S('guest_services', 'conditional', 'Organise', 'Registration, a safety briefing, pitch allocation and a headcount', { when: [some(WHEN_BIG[0], WHEN_STAYING[0])] }),
      S('transportation', 'conditional', 'Carry it in', 'Everything moved to a site a car may not reach', { when: [some(ans('site_has', 'nothing'), notAns('site_has', 'access'))] }),
      S('event_lighting', 'conditional', 'Light the camp', 'Path and area lighting, because a campsite is genuinely dark', { when: [some(WHEN_LIT[0], WHEN_STAYING[0])] }),
      S('tent_furniture', 'conditional', 'Gather them', 'A central gathering space with seating and cover', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('photography', 'conditional', 'Capture', 'The camp and the night sky, which is what people came for', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Modest sound — a campsite is not the place for a system', { when: WHEN_AV }),
      S('passenger_transport', 'conditional', 'Bring them', 'Transport to a site with no public access', { when: WHEN_TRANSFER }),
      S('venue', 'conditional', 'Secure', 'A campsite with permission, access and a water source nearby', { when: WHEN_FINDING }),
    ],
    addons: [
      X('packing_list', 'List it', 'A packing list per person, because there is no shop and no returning', 'invite', { experience: true }),
      X('fire_permission', 'Check the fire', 'Campfire permission confirmed, with a cleared pit and water beside it', 'schedule', { experience: true, when: [ans('fire', 'permitted', 'unsure_fire')] }),
      X('leave_no_trace', 'Take it all out', 'Everything carried in carried out, including the ash', 'broom', { trade: 'safety_facilities' }),
      X('headcount', 'Count them', 'A headcount at arrival, at night and at departure', 'poll', { experience: true, when: WHEN_STAYING }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A campsite has no power, water or washroom. Everything is brought in and everything leaves, including the ash. A campfire happens only where it is permitted.' },
    timeline: {
      before: ['Site permission confirmed and access checked for vehicles', 'Water, washrooms, power and waste arranged — the site has none', 'Packing list sent and a headcount process agreed'],
      during: ['Safety briefing before anyone pitches', 'Headcount at arrival and before lights out', 'Fire only where permitted, with water beside it'],
      after: ['Site cleared completely, including ash and tent pegs', 'Headcount at departure against the arrival list', 'Equipment returned'],
    },
    checklist: ['Site permission and vehicle access', 'Water, washrooms and waste brought in', 'Packing list sent', 'Headcounts at arrival and departure'],
  }),

  B('adventure-club-meetup', 'Go out', 'Activity with real consequences, run by people qualified to run it.', {
    about: 'The qualifications, the ratio, the equipment certificates and the insurance are the event. Everything else is logistics around them, and we will not plan around a gap in any of the four.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, TRAVEL, PERMITS, WEATHER, OPERATOR,
      Q('activities_a', 'What are people doing?', 'many', { options: [['trek', 'Trekking'], ['climb', 'Climbing or rappelling'], ['water_a', 'Water activities'], ['cycle', 'Cycling'], ['caving', 'Caving'], ['camp_a', 'Camping']] }),
      Q('experience_level', 'What experience do people have?', 'one', { options: [['none_exp', 'None'], ['some_exp', 'Some'], ['experienced', 'Experienced'], ['mixed_exp', 'Mixed']] }),
      Q('ratio', 'Is the instructor ratio agreed in writing?', 'one', { options: [['yes_ratio', 'Yes'], ['no_ratio', 'Not yet'], ['help_ratio', 'We need help with this']] }),
      MEDICAL, FOOD, SEATS, SIGNAGE, PHOTOS, TRANSFERS, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Cover them', 'First aid trained for the activity, plus an evacuation route'),
      S('event_equipment_rental', 'recommended', 'Certify kit', 'Certified equipment — harnesses, helmets, ropes, buoyancy aids'),
      S('guest_services', 'recommended', 'Brief them', 'Registration, declarations, a safety briefing and a headcount'),
      S('live_entertainment', 'conditional', 'Instruct', 'Qualified instructors at the agreed ratio, qualifications recorded', { when: WHEN_OP_HELP }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water carried and available at every activity point'),
      S('passenger_transport', 'conditional', 'Convey', 'Transport to the site and back, with everyone accounted for', { when: WHEN_TRANSFER }),
      S('catering_food', 'conditional', 'Feed', 'Food at the base and carried where the activity needs it', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Base them', 'A base with shade, seating and a casualty point', { when: [some(WHEN_SEATS[0], ans('activities_a', 'camp_a'))] }),
      S('photography', 'conditional', 'Record', 'From positions that do not distract anyone mid-activity', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Inform', 'Joining notes, kit lists, declarations and the safety briefing', { when: WHEN_SIGNED }),
      S('end_to_end_event_logistics', 'conditional', 'Move it', 'Equipment, crew and supplies to a site with no road', { when: [ans('activities_a', 'climb', 'water_a', 'caving')] }),
      S('venue', 'conditional', 'Assess', 'A site assessed for the activity, with an evacuation route', { when: WHEN_FINDING }),
    ],
    addons: [
      X('instructor_ratio', 'Hold the ratio', 'The agreed ratio written down and counted at every activity point', 'group', { experience: true, when: [ans('ratio', 'no_ratio', 'help_ratio')] }),
      X('equipment_certificates', 'Inspect it', 'Inspection certificates for every piece of life-safety equipment', 'schedule', { experience: true }),
      X('casualty_plan', 'Plan for it', 'A written evacuation plan, with the nearest hospital named and timed', 'map', { experience: true }),
      X('insurance_check', 'Confirm it', 'Activity insurance confirmed in writing, naming the activities', 'invite', { experience: true, when: WHEN_OP_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'Instructor qualifications, equipment certificates, the ratio and the insurance are conditions of running this at all. We give no advice on anyone’s fitness to take part.' },
    timeline: {
      before: ['Site assessed, evacuation route and nearest hospital identified', 'Instructor qualifications, equipment certificates and insurance collected', 'Ratio agreed in writing and declarations collected'],
      during: ['Safety briefing before anyone starts, attendance counted', 'Ratio counted at every activity point', 'Headcount at every transition and before leaving'],
      after: ['Equipment inspected as it comes back', 'Everyone accounted for against the start list', 'Any incident recorded and reported'],
    },
    checklist: ['Site assessed with an evacuation route', 'Qualifications and ratio in writing', 'Equipment inspection certificates', 'Activity insurance confirmed'],
  }),

  B('outdoor-concert', 'Fill the field', 'A stage in the open, a crowd in front of it and a curfew behind it.', {
    about: 'The largest crowd risk in this category. Capacity, exits, barrier and medical come first; the artist and the production follow the rider and the permitted hours.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('artist', 'Is the act confirmed?', 'one', { options: [['rider', 'Yes, and we have the rider'], ['booked', 'Booked, rider not received'], ['finding', 'Still being booked']] }),
      Q('entry', 'How do people get in?', 'one', { options: [['ticket', 'Ticketed'], ['free', 'Free entry'], ['invite_c', 'By invitation'], ['registration', 'Free but registered']] }),
      Q('curfew', 'What time must the sound stop?', 'one', { options: [['ten', 'By 10 pm'], ['eleven', 'By 11 pm'], ['later', 'Later, with permission'], ['unsure_c', 'Not yet confirmed']] }),
      MEDICAL, GUARD, FOOD, AV, SIGNAGE, PHOTOS, SEATS, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'A system specified against the rider and the permitted sound level'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, trussing, barriers and the front-of-stage barrier'),
      S('security_services', 'recommended', 'Control', 'Gate, pit and ground security against a counted capacity'),
      S('safety_facilities', 'recommended', 'Cover', 'Medical at the front of stage, washrooms, water and the clear-up'),
      S('power_cooling', 'recommended', 'Power it', 'Silent generators sized to the rider, with a backup feed'),
      S('event_lighting', 'conditional', 'Light it', 'Stage lighting and enough light to leave the ground safely', { when: [some(WHEN_LIT[0], WHEN_STAGE[0])] }),
      S('live_entertainment', 'conditional', 'Book it', 'An act for the ground, the crowd and the hours you can actually play', { when: [ans('artist', 'finding')] }),
      S('guest_services', 'conditional', 'Gate it', 'Gates scanning and counting, which is how you stay within capacity', { when: [ans('entry', 'ticket', 'registration', 'invite_c')] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, wristbands, a ground map and gate signage', { when: [some(WHEN_SIGNED[0], ans('entry', 'ticket', 'registration'))] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls for the crowd and a green room spread for the act', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Capture', 'The act and the crowd, from the pit and from the back', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'House', 'A green room, crew areas and seating at the edges', { when: [some(WHEN_SEATS[0], ans('artist', 'rider', 'booked'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across a field with no infrastructure', { when: WHEN_BIG }),
      S('venue', 'conditional', 'Secure', 'A ground that can be fenced, exited, powered and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('capacity_in_writing', 'Count the ground', 'Permitted capacity in writing before a single ticket is sold', 'schedule', { experience: true, when: WHEN_PERMIT_HELP }),
      X('curfew_schedule', 'Finish on time', 'Set times built backwards from the permitted hour', 'schedule', { experience: true, when: [ans('curfew', 'ten', 'eleven', 'unsure_c')] }),
      X('pit_barrier', 'Hold the front', 'A front-of-stage barrier with a pit and a route out of it', 'security_services', { trade: 'event_equipment_rental' }),
      X('free_water', 'Hydrate them', 'Free drinking water across the ground, which is a safety item', 'glass', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'Capacity, exits, medical cover and the sound curfew are the promoter’s and stay on the plan. We never suggest pyrotechnics or flame effects.' },
    timeline: {
      before: ['Permitted capacity and hours confirmed in writing before tickets sell', 'Ground plan drawn with gates, exits, barrier and medical posts', 'Rider matched against the booking and the sound limit'],
      during: ['Gates counted, never over capacity', 'Medical at the pit from doors open', 'Set times held so the last song lands inside the curfew'],
      after: ['Load-out and ground clearance the same night', 'Incident log completed', 'Ground reinstated'],
    },
    checklist: ['Capacity and hours in writing', 'Ground plan with exits and barrier', 'Free water across the ground', 'Set times inside the curfew'],
  }),

  B('open-air-cinema', 'Screen it', 'A projector against the sky, which needs darkness and a licence.', {
    about: 'Three things decide whether this happens: the rights, actual darkness, and the weather. None of them is negotiable and all three are settled early.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('rights', 'Are the screening rights in place?', 'one', {
        options: [['yes', 'Yes'], ['applying_r', 'We are applying'], ['no', 'Not yet'], ['unsure', 'Not sure']],
        help: 'A public screening needs the rights holder’s permission. That is the organiser’s to obtain.',
      }),
      Q('screen_size', 'How big does the screen need to be?', 'select', { options: [['small', 'Up to 50 people'], ['medium', 'Up to 200'], ['large', 'Up to 600'], ['huge', 'Larger']] }),
      Q('comfort', 'What are people sitting on?', 'many', { optional: true, options: [['beanbags', 'Beanbags'], ['blankets', 'Blankets'], ['chairs_o', 'Chairs'], ['deck', 'Deckchairs'], ['own_c', 'Their own']] }),
      MEDICAL, FOOD, SIGNAGE, PHOTOS, SEATS, CLEAN, GUARD,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project it', 'A projector matched to the screen, and sound that reaches the back'),
      S('event_equipment_rental', 'recommended', 'Build it', 'Screen, frame, projection position and the seating layout'),
      S('power_cooling', 'recommended', 'Power it', 'Power and a backup feed — a projector dropping ends the evening'),
      S('tent_furniture', 'conditional', 'Seat them', 'Beanbags, deckchairs, blankets and something to lean against', { when: [some(has('comfort'), WHEN_SEATS[0])] }),
      S('event_lighting', 'recommended', 'Light edges', 'Path and exit lighting, and nothing pointing at the screen'),
      S('catering_food', 'conditional', 'Feed', 'Popcorn and food that can be eaten in the dark', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid, waste and the ground cleared afterwards', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0], WHEN_CLEAN[0])] }),
      S('guest_services', 'conditional', 'Seat them', 'Entry, seating allocation and someone keeping the sightlines clear', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Capture', 'The crowd against the screen, which needs a long exposure', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Steward', 'Stewarding for an open ground anyone can walk onto', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Signpost', 'Tickets, a site map and screening-time signage', { when: WHEN_SIGNED }),
      S('venue', 'conditional', 'Find', 'Somewhere genuinely dark, which is harder than it sounds', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rights_check', 'Clear it', 'Screening rights confirmed in writing before the film is advertised', 'schedule', { experience: true, when: [ans('rights', 'applying_r', 'no', 'unsure')] }),
      X('darkness_timing', 'Wait for dark', 'Start time set from actual sunset, not from the invitation', 'schedule', { experience: true }),
      X('projector_cover', 'Keep it dry', 'Cover for the projector and a stated wet-weather decision time', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
      X('backup_power', 'Keep it running', 'A backup power feed, because one dropped frame ends the evening', 'power_cooling', { trade: 'power_cooling' }),
    ],
    toolkit: { polls: ['date'], note: 'Screening rights are the organiser’s to obtain, and the start time comes from real darkness rather than from the invitation.' },
    timeline: {
      before: ['Screening rights confirmed in writing', 'Start time set from real sunset on the actual date', 'Projection, sound and backup power tested on site at that hour'],
      during: ['Nothing pointing at the screen, path lighting only', 'Sound checked from the back row before the film starts', 'Weather watched against the agreed decision time'],
      after: ['Ground cleared, including every cushion and cup', 'Equipment returned', 'Attendance reported to the rights holder if required'],
    },
    checklist: ['Screening rights in writing', 'Start time from real darkness', 'Backup power feed', 'Weather decision time stated'],
  }),

  B('scenic-picnic-event', 'Spread a rug', 'Somewhere beautiful, a hamper and almost no infrastructure.', {
    about: 'The lightest format here, and the one most often ruined by the two things nobody plans: no washroom and no shade. Both are easy to fix if asked early.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('style_p', 'What kind of picnic?', 'one', { options: [['hampers', 'Individual hampers'], ['grazing', 'Shared grazing spread'], ['bbq', 'A barbecue'], ['potluck', 'Everyone brings something'], ['catered_p', 'Fully catered']] }),
      DIET_ONLY, ALLERGY_ONLY, PHOTOS, SEATS, CLEAN, TRANSFERS, DECOR,
    ],
    plan: [
      S('catering_food', 'recommended', 'Pack it', 'Hampers or a grazing spread, kept cold on the way and on the ground'),
      S('tent_furniture', 'recommended', 'Set the ground', 'Rugs, low tables, cushions and shade, which matters more than décor'),
      S('safety_facilities', 'conditional', 'Service it', 'Washrooms, water, bins and the site left exactly as found', { when: [some(WHEN_NO_LOOS[0], WHEN_CLEAN[0])] }),
      S('photography', 'conditional', 'Capture', 'A spread in daylight, which is the easiest good photograph there is', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Dress it', 'Simple styling on the ground — this format suffers from too much', { when: WHEN_DECOR }),
      S('bar_beverages', 'recommended', 'Pour', 'Cold drinks and plenty of water, which an afternoon outdoors needs'),
      S('transportation', 'conditional', 'Carry it', 'Food, ice and furniture to a spot a vehicle may not reach', { when: [some(WHEN_NO_SERVICES[0], WHEN_BIG[0])] }),
      S('live_entertainment', 'conditional', 'Fill it', 'Lawn games and gentle music, if you want more than conversation', { when: [some(WHEN_BIG[0], has('decor'))] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Transport to a spot with no parking nearby', { when: WHEN_TRANSFER }),
      S('venue', 'conditional', 'Find the spot', 'Somewhere with shade, permission and a washroom within reach', { when: WHEN_FINDING }),
    ],
    addons: [
      X('shade_plan', 'Find shade', 'Shade arranged, because a beautiful spot at noon is unbearable', 'tent', { trade: 'tent_furniture' }),
      X('loo_distance', 'Check it', 'The nearest washroom found and timed, or one brought in', 'broom', { trade: 'safety_facilities', when: WHEN_NO_LOOS }),
      X('cold_chain', 'Keep it cold', 'Ice boxes and a cut-off time for anything that cannot sit out', 'glass', { trade: 'catering_food' }),
      X('pack_out', 'Take it away', 'Everything removed, because a beautiful place stays beautiful', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The two things a scenic spot never has are shade and a washroom. We ask about both before anything decorative.' },
    timeline: {
      before: ['Spot visited, shade checked and the nearest washroom timed', 'Permission confirmed if it is public land', 'Cold chain planned for anything that cannot sit in the sun'],
      during: ['Shade up before people settle', 'Water available throughout, not just at the start', 'Food covered and the cut-off time respected'],
      after: ['Everything carried out, including every bottle cap', 'Site left as found', 'Photographs shared'],
    },
    checklist: ['Shade arranged', 'Nearest washroom found or one brought in', 'Cold chain with a cut-off time', 'Everything carried out'],
  }),

  B('destination-birthday', 'Mark it away', 'A birthday that becomes a trip, usually for a round number.', {
    about: 'Smaller and more personal than a destination wedding, and judged entirely on whether the person felt looked after. The surprise, if there is one, needs an accomplice.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER,
      Q('age_group', 'Whose birthday?', 'one', { options: [['child_b', 'A child’s'], ['teen_b', 'A teenager’s'], ['adult_b', 'An adult’s'], ['milestone_b', 'A milestone one']] }),
      Q('surprise', 'Is it a surprise?', 'yesno', { optional: true }),
      DIET_ONLY, ALLERGY_ONLY, CAKE_Q, FOOD, SEATS, MEDICAL, PHOTOS, DECOR, TRANSFERS, AV,
    ],
    plan: [
      S('guest_services', 'recommended', 'Host them', 'Arrivals, rooming and one contact for everyone who travelled'),
      S('catering_food', 'conditional', 'Feed them', 'Meals across the stay, to everyone’s stated needs', { when: WHEN_FOOD }),
      S('cake_desserts', 'conditional', 'Bring the cake', 'A cake that survives the journey, which is not a given', { when: [notAns('cake', 'no')] }),
      S('decoration_floral', 'conditional', 'Dress it', 'The main evening, and a small touch in the room on arrival', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Capture', 'The whole trip, not only the dinner with the cake', { when: WHEN_SHOT }),
      S('passenger_transport', 'conditional', 'Move them', 'Transfers in, around and out, timed to the flights', { when: WHEN_TRANSFER }),
      S('live_entertainment', 'conditional', 'Programme it', 'Music and activities, pitched at whose birthday it is', { when: [some(WHEN_MUSIC[0], WHEN_LONG[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic for speeches a property cannot cover', { when: WHEN_AV }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the evening setting and the walk back', { when: [some(WHEN_LIT[0], WHEN_DECOR[0])] }),
      S('tent_furniture', 'conditional', 'Furnish', 'Outdoor dining, lounge seating and cover on standby', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid and a known medical route, especially with children along', { when: [some(WHEN_AID[0], ans('age_group', 'child_b'))] }),
      S('venue', 'conditional', 'Find', 'Somewhere that suits the age group and takes the whole group', { when: WHEN_FINDING }),
    ],
    addons: [
      X('surprise_accomplice', 'Keep it', 'One person inside the surprise, because a surprise needs a handler', 'group', { experience: true, when: [ans('surprise', 'yes')] }),
      X('arrival_touch', 'Welcome them', 'Something waiting in the room, which costs little and lands hard', 'gift', { trade: 'decoration_floral' }),
      X('child_watch', 'Watch them', 'Supervision arranged around water and height, not assumed', 'kids', { trade: 'safety_facilities', when: [ans('age_group', 'child_b', 'teen_b')] }),
      X('cake_transport', 'Protect it', 'A plan for getting the cake there intact, or baked locally', 'cake', { trade: 'cake_desserts', when: [notAns('cake', 'no')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Rooms and flights stay yours to book — we have no hotel partners. We plan the transfers, the timings and the celebration around them.' },
    timeline: {
      before: ['Transfers planned both ways and rooming agreed', 'Dietary needs and allergies confirmed to every kitchen', 'Cake plan settled — carried safely or baked locally'],
      during: ['A named contact reachable throughout', 'Children supervised around water and height', 'The main evening run to time, the rest left loose'],
      after: ['Departure transfers run as planned', 'Photographs shared with everyone who came', 'Property settled'],
    },
    checklist: ['Transfers both ways', 'Allergies confirmed to each kitchen', 'Cake plan that survives the journey', 'Supervision around water'],
  }),

  B('travel-community-meetup', 'Gather them', 'People who know each other online meeting somewhere in person.', {
    about: 'Often strangers in practice, which makes the code of conduct, the named organiser and the safety of the meeting point the real content.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, PERMITS, WEATHER,
      Q('how_known', 'How do people know each other?', 'one', { options: [['online', 'Online only'], ['mixed_k', 'A mix'], ['known', 'They know each other']] }),
      Q('activity_m', 'What is the group doing?', 'many', { options: [['walk', 'A walk or trek'], ['sightsee', 'Sightseeing'], ['meal_m', 'A meal together'], ['talks_m', 'Talks or sharing'], ['photo_m', 'Photography'], ['free_m', 'Mostly unstructured']] }),
      MEDICAL, FOOD, AV, SEATS, PHOTOS, TRANSFERS, SIGNAGE, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Register them', 'Registration, a visible organiser, a code of conduct and a headcount'),
      S('catering_food', 'conditional', 'Feed them', 'A shared meal, which is what actually makes a group a group', { when: WHEN_FOOD }),
      S('passenger_transport', 'conditional', 'Move them', 'Group transport, so nobody is finding their own way to a trailhead', { when: WHEN_TRANSFER }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, water and a known route to help', { when: [some(WHEN_AID[0], ans('activity_m', 'walk'))] }),
      S('photography', 'conditional', 'Capture', 'The group, with consent asked before anyone is posted online', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Brief them', 'Joining notes, the meeting point, the code of conduct and badges', { when: WHEN_SIGNED }),
      S('live_entertainment', 'conditional', 'Guide it', 'A local guide, if the group is seeing somewhere properly', { when: [ans('activity_m', 'sightsee', 'photo_m')] }),
      S('sound_av', 'conditional', 'Carry', 'A mic and speaker if people are sharing with a group', { when: [some(WHEN_PA[0], ans('activity_m', 'talks_m'))] }),
      S('tent_furniture', 'conditional', 'Seat them', 'Seating and shade wherever the group stops for a while', { when: [some(WHEN_SEATS[0], ans('activity_m', 'talks_m', 'meal_m'))] }),
      S('venue', 'conditional', 'Fix the point', 'A meeting point that is easy to find, public and safe to wait at', { when: WHEN_FINDING }),
    ],
    addons: [
      X('conduct_code', 'Set the rules', 'A code of conduct sent in advance and a named person to raise things with', 'invite', { experience: true, when: [ans('how_known', 'online', 'mixed_k')] }),
      X('public_meeting', 'Meet in public', 'A public, well-lit meeting point for a group meeting for the first time', 'map', { experience: true, when: [ans('how_known', 'online', 'mixed_k')] }),
      X('photo_consent', 'Ask first', 'Consent asked before anyone appears in a post, not after', 'camera', { experience: true, when: WHEN_SHOT }),
      X('group_headcount', 'Count them', 'A headcount at every stop, which a group of strangers genuinely needs', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'For a group meeting in person for the first time, a public meeting point, a code of conduct and a named organiser do more than any arrangement we can make.' },
    timeline: {
      before: ['Code of conduct and meeting point sent in advance', 'Named organiser published and reachable', 'Medical route identified if the group is walking'],
      during: ['Headcount at every stop', 'Consent asked before photographs are posted', 'Nobody left to find their own way back'],
      after: ['Everyone accounted for', 'Site left clean', 'Shared photographs only from those who agreed'],
    },
    checklist: ['Code of conduct sent in advance', 'Public, well-lit meeting point', 'Named organiser reachable', 'Headcount at every stop'],
  }),

  B('outdoor-festival', 'Run the ground', 'Several days, several stages and a small town’s worth of people.', {
    about: 'The most infrastructure-heavy thing in this category. Capacity, exits, water, washrooms and medical are the festival; the programme is what people came for.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['more_d', 'More']] }),
      Q('stages', 'How many stages or areas?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three or more']] }),
      Q('camping_f', 'Do people camp on site?', 'yesno', { optional: true }),
      Q('entry_f', 'How do people get in?', 'one', { options: [['ticket_f', 'Ticketed'], ['free_f', 'Free entry'], ['registration_f', 'Free but registered']] }),
      MEDICAL, GUARD, FOOD, AV, PHOTOS, CLEAN, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Service it all', 'Washrooms, free water, waste, first aid posts and the full clear-up'),
      S('security_services', 'recommended', 'Control it', 'Gates, perimeter, stage pits and a counted capacity'),
      S('power_cooling', 'recommended', 'Power it', 'Generators per area, distribution and a backup for anything critical'),
      S('event_equipment_rental', 'recommended', 'Build it', 'Stages, barriers, fencing, flooring and the back-of-house compound'),
      S('sound_av', 'recommended', 'Amplify', 'A system per stage, specified against the permitted sound level'),
      S('event_lighting', 'recommended', 'Light it', 'Stage lighting plus enough light to find an exit at 2 am'),
      S('catering_food', 'conditional', 'Feed them all', 'Stalls for the crowd, crew catering and artist hospitality', { when: WHEN_FOOD }),
      S('live_entertainment', 'recommended', 'Programme it', 'A line-up across the stages and the hours you are permitted'),
      S('guest_services', 'conditional', 'Gate them', 'Scanning, wristbands, accreditation and a running headcount', { when: [ans('entry_f', 'ticket_f', 'registration_f')] }),
      S('invitation_printing', 'conditional', 'Signpost it', 'Site maps, wayfinding, stage signage and safety notices', { when: WHEN_SIGNED }),
      S('tent_furniture', 'recommended', 'Shelter it', 'Shade, seating, green rooms, crew areas and welfare tents'),
      S('photography', 'conditional', 'Capture', 'Across the days and the stages, for the programme and the record', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'recommended', 'Run it', 'Build, show days and load-out, with one schedule everyone works to'),
      S('venue', 'conditional', 'Secure', 'A ground that can be fenced, exited, powered, drained and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('capacity_in_writing', 'Count it', 'Permitted capacity in writing before a ticket is sold', 'schedule', { experience: true, when: WHEN_PERMIT_HELP }),
      X('free_water', 'Water them', 'Free drinking water across the ground — this is a safety item', 'glass', { trade: 'safety_facilities' }),
      X('welfare_point', 'Look after them', 'A welfare and lost-person point, staffed every hour the gates are open', 'spa', { trade: 'guest_services' }),
      X('night_lighting', 'Light the exits', 'Lit routes and exits for the hours after the stages stop', 'lighting', { trade: 'event_lighting', when: [ans('camping_f', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Capacity, exits, water, washrooms and medical cover are the organiser’s responsibilities and stay on the plan. We never suggest pyrotechnics or flame effects.' },
    timeline: {
      before: ['Permitted capacity, hours and licences in writing before tickets sell', 'Site plan with gates, exits, water points, medical posts and welfare', 'Build schedule with a safety sign-off before doors open'],
      during: ['Gates counted against capacity every hour', 'Medical, welfare and water staffed the whole time gates are open', 'Sound inside the permitted level and the permitted hours'],
      after: ['Full ground clearance and waste removal', 'Incident log completed and reviewed', 'Ground reinstated and handed back'],
    },
    checklist: ['Capacity and licences in writing', 'Site plan with exits, water and medical', 'Welfare point staffed throughout', 'Lit exit routes after dark'],
  }),

  B('heritage-celebration', 'Mind the place', 'A building or site that matters, with rules that protect it.', {
    about: 'The site’s own conditions decide everything — what can be fixed to a wall, what may be lit, how late, and how many people may stand where. Those conditions come first and are not negotiable by us.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER,
      Q('site_rules', 'Do you have the site’s conditions in writing?', 'one', {
        options: [['yes', 'Yes'], ['applying_s', 'We are applying'], ['no', 'Not yet']],
        help: 'A heritage site sets its own conditions on fixings, flame, sound, numbers and timings. We plan strictly inside them.',
      }),
      Q('occasion_h', 'What is the occasion?', 'one', { options: [['wedding_h', 'A wedding'], ['cultural_h', 'A cultural programme'], ['corporate_h', 'A corporate evening'], ['private_h', 'A private celebration'], ['civic_h', 'A civic occasion']] }),
      DIET_ONLY, FOOD, GUARD, SITE_HAS, MEDICAL, PHOTOS, AV, SEATS, DECOR, TRANSFERS,
    ],
    plan: [
      S('decoration_floral', 'conditional', 'Dress lightly', 'Free-standing setups only — nothing fixed to a protected surface', { when: WHEN_DECOR }),
      S('event_lighting', 'recommended', 'Light it', 'Lighting that shows the architecture, within the site’s own limits'),
      S('sound_av', 'conditional', 'Carry', 'Sound set to the site’s permitted level, which is usually modest', { when: WHEN_AV }),
      S('catering_food', 'conditional', 'Feed', 'Catering from a kitchen outside, because most sites allow no cooking', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Capture', 'The place as much as the occasion, within the site’s photography rules', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat them', 'Free-standing seating placed off protected flooring', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('guest_services', 'recommended', 'Guide them', 'Arrivals, routing away from fragile areas and a counted number inside'),
      S('security_services', 'conditional', 'Protect it', 'Stewarding to keep guests off what must not be touched', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Power it', 'Cabled power that does not run across a protected surface', { when: [some(WHEN_AV[0], WHEN_NO_POWER[0])] }),
      S('passenger_transport', 'conditional', 'Convey', 'Transfers, because heritage sites rarely have parking', { when: WHEN_TRANSFER }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the site left exactly as handed over', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0])] }),
      S('venue', 'conditional', 'Approach them', 'A site that permits events, with conditions you can actually work to', { when: WHEN_FINDING }),
    ],
    addons: [
      X('site_conditions', 'Get them', 'The site’s written conditions obtained before anything is designed', 'schedule', { experience: true, when: [ans('site_rules', 'applying_s', 'no')] }),
      X('no_fixings', 'Touch nothing', 'Free-standing structures only — nothing drilled, taped or tied to fabric', 'tent', { trade: 'event_equipment_rental' }),
      X('condition_report', 'Record it', 'The site photographed before and after, which protects everyone', 'camera', { trade: 'photography' }),
      X('route_guests', 'Keep them out', 'Guests routed away from fragile areas, with stewards at the edges', 'group', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'The site’s own conditions on fixings, flame, sound, numbers and timings govern everything. Permissions are the site authority’s to grant, never ours to assume. We never suggest flame or fireworks at a heritage site.' },
    timeline: {
      before: ['Site conditions obtained in writing and the design built inside them', 'Condition photographs taken at handover', 'Everything specified free-standing — no fixings into fabric'],
      during: ['Stewards keeping guests away from fragile areas', 'Sound held at the permitted level', 'No flame, no cooking, nothing fixed to a surface'],
      after: ['Site cleared and photographed again against the handover record', 'Any mark reported immediately, not discovered later', 'Site handed back on time'],
    },
    checklist: ['Site conditions in writing', 'Nothing fixed to protected fabric', 'Condition photographs before and after', 'Sound inside the permitted level'],
  }),

  B('cultural-tourism-event', 'Show the place', 'Visitors meeting a place’s own culture, on that culture’s terms.', {
    about: 'The communities and practitioners whose work is being shown decide how it is presented, what may be photographed, and what they are paid. We arrange; we do not curate someone else’s heritage.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER,
      Q('content_c', 'What is being presented?', 'many', { options: [['performance_c', 'Performance'], ['crafts_c', 'Crafts and making'], ['food_c', 'Food traditions'], ['walks_c', 'Guided walks'], ['exhibits_c', 'Exhibits']] }),
      Q('community_ok', 'Have the practitioners agreed how it is presented?', 'one', {
        options: [['yes', 'Yes, and terms are agreed'], ['talking', 'In discussion'], ['no', 'Not yet']],
        help: 'How a tradition is presented, and what practitioners are paid, is theirs to decide. We plan around what they agree.',
      }),
      Q('languages_c', 'What languages are needed?', 'many', { optional: true, options: [['kannada_c', 'Kannada'], ['english_c', 'English'], ['hindi_c', 'Hindi'], ['other_lang_c', 'Another language']] }),
      DIET_ONLY, FOOD, SITE_HAS, MEDICAL, PHOTOS, AV, SEATS, SIGNAGE, TRANSFERS,
    ],
    plan: [
      S('live_entertainment', 'conditional', 'Present them', 'Practitioners engaged on agreed terms, presented as they choose', { when: [ans('content_c', 'performance_c', 'walks_c')] }),
      S('event_equipment_rental', 'conditional', 'Set the spaces', 'Demonstration spaces, craft stations and exhibit stands', { when: [ans('content_c', 'crafts_c', 'exhibits_c')] }),
      S('sound_av', 'conditional', 'Carry it', 'Sound and screens sized to the space and the performance', { when: WHEN_AV }),
      S('catering_food', 'conditional', 'Feed', 'Regional food, named and described accurately rather than simplified', { when: WHEN_FOOD }),
      S('guest_services', 'recommended', 'Receive them', 'Arrivals, routing between activities and hosts who know the programme'),
      S('invitation_printing', 'conditional', 'Explain it', 'Programmes and labels crediting every practitioner by name', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'Photography only where practitioners have agreed to it', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat them', 'Seating, shade and cover for an audience outdoors', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for performance areas and for the route between them', { when: [some(WHEN_LIT[0], ans('content_c', 'performance_c'))] }),
      S('passenger_transport', 'conditional', 'Move them', 'Transport between sites across a programme', { when: WHEN_TRANSFER }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water, first aid and the site left clean', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0])] }),
      S('venue', 'conditional', 'Find', 'Somewhere the practitioners are willing and able to work', { when: WHEN_FINDING }),
    ],
    addons: [
      X('practitioner_terms', 'Agree it', 'Fees and presentation agreed with practitioners before it is advertised', 'invite', { experience: true, when: [ans('community_ok', 'talking', 'no')] }),
      X('credit_by_name', 'Name them', 'Every practitioner and tradition credited by name, not as "local artists"', 'invite', { trade: 'invitation_printing' }),
      X('photo_rules', 'Ask first', 'Photography rules set by the practitioners and told to every visitor', 'camera', { experience: true, when: WHEN_SHOT }),
      X('interpretation', 'Translate it', 'Someone to interpret between visitors and practitioners', 'group', { experience: true, when: [has('languages_c')] }),
    ],
    toolkit: { polls: ['date'], note: 'How a tradition is presented, what may be photographed and what practitioners are paid are theirs to decide. We never describe a community’s practice on its behalf and never infer anyone’s community.' },
    timeline: {
      before: ['Terms and presentation agreed with every practitioner in writing', 'Photography rules set by them and printed for visitors', 'Programme credits drafted with correct names and spellings'],
      during: ['Practitioners introduced by name, in their own terms', 'Photography rules enforced, not just printed', 'Interpretation available where it is needed'],
      after: ['Practitioners paid as agreed, promptly', 'Photographs shared with them before publication', 'Site left as found'],
    },
    checklist: ['Practitioner terms agreed in writing', 'Every practitioner credited by name', 'Photography rules set by them', 'Interpretation where needed'],
  }),

  B('mountain-retreat', 'Go up', 'Altitude, cold, thin roads and very little nearby.', {
    about: 'Everything that makes a mountain retreat worth doing also makes it unforgiving: the road, the weather, the cold and the distance to a hospital. Those four shape the plan.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER, SITE_HAS,
      Q('purpose_m', 'What is the retreat for?', 'one', { options: [['team_m', 'A team'], ['wellness_m', 'Wellness'], ['family_m', 'Family'], ['writing_m', 'Focused work'], ['friends_m', 'Friends']] }),
      MEDICAL, FOOD, SEATS, PHOTOS, TRANSFERS, AV,
    ],
    plan: [
      S('guest_services', 'recommended', 'Run the stay', 'Arrivals, rooming, a daily rhythm and one contact who knows the area'),
      S('catering_food', 'conditional', 'Feed them warm', 'Every meal, hot, with supplies that cannot be topped up locally', { when: WHEN_FOOD }),
      S('passenger_transport', 'conditional', 'Get them up', 'Vehicles suited to a mountain road, with a driver who knows it', { when: WHEN_TRANSFER }),
      S('safety_facilities', 'recommended', 'Cover them', 'First aid, altitude awareness and the route to the nearest hospital'),
      S('power_cooling', 'conditional', 'Keep warm', 'Heating and a backup power feed — mountain supply drops', { when: [some(WHEN_NO_POWER[0], WHEN_STAYING[0])] }),
      S('tent_furniture', 'conditional', 'Furnish', 'Warm indoor settings and a sheltered outdoor one', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('live_entertainment', 'conditional', 'Programme it', 'Walks, sessions or quiet activities pitched at the altitude', { when: [some(WHEN_MUSIC[0], ans('purpose_m', 'team_m', 'wellness_m'))] }),
      S('photography', 'conditional', 'Capture', 'The place and the group, in light that changes by the hour', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Equip', 'Sound, screens and connectivity, which a hill property rarely has', { when: WHEN_AV }),
      S('transportation', 'conditional', 'Supply it', 'Everything carried up, because nothing can be fetched', { when: [some(WHEN_NO_SERVICES[0], WHEN_LONG[0])] }),
      S('event_lighting', 'conditional', 'Light paths', 'Path lighting — mountain paths after dark are genuinely dangerous', { when: [some(WHEN_LIT[0], WHEN_STAYING[0])] }),
      S('venue', 'conditional', 'Find', 'A property with heating, a usable road and help within reach', { when: WHEN_FINDING }),
    ],
    addons: [
      X('road_check', 'Check the road', 'The road checked for the season and the vehicle, before anyone books', 'map', { experience: true }),
      X('warm_layers', 'Tell them', 'A kit list with actual temperatures, because people underpack for cold', 'invite', { experience: true }),
      X('altitude_pace', 'Go slow', 'A first day with nothing strenuous in it, which altitude requires', 'schedule', { experience: true, when: WHEN_STAYING }),
      X('medical_route', 'Know the way', 'Nearest hospital named and the drive timed in the actual conditions', 'spa', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We have no hotel partners — the property is yours to book. We give no medical advice on anyone’s fitness for altitude; that is for a doctor.' },
    timeline: {
      before: ['Road and season checked, vehicles matched to the route', 'Nearest hospital named and the drive timed in real conditions', 'Kit list with actual temperatures sent to everyone'],
      during: ['First day kept gentle, whatever the schedule says', 'Heating, hot food and hot water available at all times', 'Paths lit and nobody walking out alone after dark'],
      after: ['Everyone accounted for on the way down', 'Property left warm, clean and settled', 'Photographs shared'],
    },
    checklist: ['Road and season checked', 'Hospital named and drive timed', 'Kit list with real temperatures', 'Heating and backup power'],
  }),

  B('luxury-yacht-party', 'Go out', 'A licensed vessel, a counted capacity and no way off.', {
    about: 'The only format here where the plan is legally someone else’s. The captain’s authority, the vessel’s stated capacity and the safety equipment that capacity requires come before anything else, and we do not plan around a gap in any of them.',
    formats: ['outdoor'],
    ask: [
      GUESTS, OPERATOR, WEATHER,
      Q('vessel_capacity', 'What capacity is the vessel licensed for?', 'one', {
        options: [['confirmed_c', 'Confirmed in writing'], ['stated', 'Stated verbally'], ['unknown', 'Not known yet']],
        help: 'The licensed passenger capacity is a hard limit. Guest numbers are planned under it, never the other way round.',
      }),
      Q('duration_y', 'How long on the water?', 'one', { options: [['two_y', 'Two hours'], ['half_y', 'Half a day'], ['full_y', 'A full day'], ['overnight_y', 'Overnight']] }),
      Q('swimming', 'Will anyone be in the water?', 'yesno', { optional: true }),
      Q('alcohol_y', 'Is alcohol being served?', 'yesno', { optional: true }),
      DIET_ONLY, ALLERGY_ONLY, FOOD, SEATS, PHOTOS, AV, DECOR, TRANSFERS,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Count jackets', 'Life jackets for the counted number aboard, and a real briefing'),
      S('catering_food', 'conditional', 'Cater aboard', 'Food that works in a galley, or brought aboard cold and ready', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour it', 'A bar served to a limit, because there is no leaving early', { when: [ans('alcohol_y', 'yes')] }),
      S('guest_services', 'recommended', 'Board them', 'A boarding list counted against capacity, and a named host aboard'),
      S('decoration_floral', 'conditional', 'Dress it', 'Styling that is secured and will not go over the side', { when: WHEN_DECOR }),
      S('sound_av', 'conditional', 'Play it', 'Sound rated for marine use, at a level the crew permits', { when: WHEN_AV }),
      S('photography', 'conditional', 'Capture', 'On water, where the light is extraordinary and the deck moves', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Entertain', 'A DJ or musician who has worked on a deck before', { when: WHEN_MUSIC }),
      S('passenger_transport', 'conditional', 'Get them there', 'Transfers to the jetty, timed to a departure that will not wait', { when: WHEN_TRANSFER }),
      S('event_equipment_rental', 'conditional', 'Fit it out', 'Deck furniture and shade, secured for movement', { when: [some(WHEN_SEATS[0], WHEN_DECOR[0])] }),
      S('venue', 'conditional', 'Find a vessel', 'A licensed operator with capacity, crew and insurance in order', { when: WHEN_OP_HELP }),
    ],
    addons: [
      X('capacity_limit', 'Respect it', 'Guest numbers set under the licensed capacity, counted at the gangway', 'poll', { experience: true, when: [ans('vessel_capacity', 'stated', 'unknown')] }),
      X('safety_briefing', 'Brief them', 'The crew’s safety briefing before departure, with everyone listening', 'security_services', { experience: true }),
      X('weather_call', 'Let them decide', 'The captain’s weather call accepted, with a plan for a cancelled sailing', 'schedule', { experience: true }),
      X('no_swim_rule', 'Set the rule', 'Swimming only when the crew permits it, with someone watching', 'spa', { trade: 'safety_facilities', when: [ans('swimming', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The vessel, its crew and its licence are the operator’s. The captain’s decisions on weather, capacity and swimming are final and we plan around them. We never arrange a vessel ourselves and never treat a capacity as assumed.' },
    timeline: {
      before: ['Licence, crew certification, insurance and capacity confirmed in writing', 'Guest list closed under the licensed capacity', 'Life jackets counted against the boarding number'],
      during: ['Crew safety briefing before departure, everyone present', 'Gangway counted — never one over capacity', 'Alcohol served to a limit; swimming only when the crew permits'],
      after: ['Everyone counted off the vessel against the boarding list', 'Vessel left clean, nothing over the side', 'Photographs shared'],
    },
    checklist: ['Licence, crew and insurance in writing', 'Guest list under licensed capacity', 'Life jackets counted', 'Crew briefing before departure'],
  }),

  B('boat-cruise-celebration', 'Cruise it', 'A boat on a lake or river, with a licensed crew and a fixed return.', {
    about: 'Gentler than a yacht and bound by exactly the same limits: the licence, the counted capacity, the jackets and the crew’s word. A cruise also has a departure that will not wait.',
    formats: ['outdoor'],
    ask: [
      GUESTS, OPERATOR, WEATHER,
      Q('water_type', 'Where is it?', 'one', { options: [['lake', 'A lake'], ['river', 'A river'], ['backwater', 'Backwaters'], ['harbour', 'A harbour or coast']] }),
      Q('vessel_capacity', 'What capacity is the boat licensed for?', 'one', {
        options: [['confirmed_c', 'Confirmed in writing'], ['stated', 'Stated verbally'], ['unknown', 'Not known yet']],
        help: 'The licensed passenger capacity is a hard limit. Guest numbers go under it, never the other way round.',
      }),
      Q('duration_b', 'How long is the cruise?', 'one', { options: [['hour_b', 'An hour'], ['two_b', 'Two hours'], ['half_b', 'Half a day'], ['sunset_b', 'A sunset cruise']] }),
      DIET_ONLY, ALLERGY_ONLY, FOOD, PHOTOS, AV, DECOR, TRANSFERS,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Count them', 'Life jackets for everyone aboard, and a briefing before casting off'),
      S('catering_food', 'conditional', 'Cater aboard', 'Food brought aboard ready, because a boat galley is small or absent', { when: WHEN_FOOD }),
      S('guest_services', 'recommended', 'Board them', 'A boarding list counted at the jetty, and a host aboard throughout'),
      S('decoration_floral', 'conditional', 'Dress the deck', 'Styling secured against wind and movement', { when: WHEN_DECOR }),
      S('sound_av', 'conditional', 'Play it', 'Modest marine-rated sound, at a level the crew permits', { when: WHEN_AV }),
      S('photography', 'conditional', 'Capture', 'The water and the light, especially on a sunset run', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour safe', 'Drinks in unbreakable glassware, because a deck moves', { when: [some(WHEN_FOOD[0], WHEN_DECOR[0])] }),
      S('live_entertainment', 'conditional', 'Entertain', 'A musician who has played on a boat, which is its own skill', { when: WHEN_MUSIC }),
      S('passenger_transport', 'conditional', 'Reach the pier', 'Transfers timed to a departure that will not wait for anyone', { when: WHEN_TRANSFER }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake that travels to a jetty and is cut on a moving deck', { when: [some(WHEN_DECOR[0], WHEN_FOOD[0])] }),
      S('venue', 'conditional', 'Find the boat', 'A licensed operator with crew, capacity and insurance in order', { when: WHEN_OP_HELP }),
    ],
    addons: [
      X('capacity_limit', 'Respect it', 'Guest numbers set under the licensed capacity, counted at the jetty', 'poll', { experience: true, when: [ans('vessel_capacity', 'stated', 'unknown')] }),
      X('safety_briefing', 'Brief them', 'The crew’s briefing before casting off, with everyone listening', 'security_services', { experience: true }),
      X('jetty_timing', 'Arrive early', 'Guests at the jetty well before departure, because a boat leaves', 'schedule', { experience: true, when: WHEN_TRANSFER }),
      X('unbreakable_glass', 'Pour it safely', 'Unbreakable glassware — broken glass on a deck ends a cruise', 'glass', { trade: 'bar_beverages' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The boat, its crew and its licence are the operator’s, and the crew’s decisions on weather, capacity and movement are final. We never arrange a vessel ourselves.' },
    timeline: {
      before: ['Licence, crew certification, insurance and capacity confirmed in writing', 'Guest list closed under the licensed capacity', 'Life jackets counted against the boarding number'],
      during: ['Crew briefing before casting off', 'Jetty count — never one over capacity', 'Unbreakable glassware only, drinks served to a limit'],
      after: ['Everyone counted off against the boarding list', 'Boat left clean, nothing over the side', 'Photographs shared'],
    },
    checklist: ['Licence, crew and insurance in writing', 'Numbers under licensed capacity', 'Life jackets counted', 'Unbreakable glassware'],
  }),

  B('nature-retreat', 'Step out of it', 'Quiet, few people, and deliberately very little programme.', {
    about: 'The temptation is to fill it. The job is to leave it empty enough to work, while making sure food, water, warmth and help are genuinely covered.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER, SITE_HAS,
      Q('focus_n', 'What is the retreat built around?', 'many', { options: [['silence_n', 'Silence and rest'], ['yoga_n', 'Yoga or movement'], ['walks_n', 'Walks'], ['sessions_n', 'Guided sessions'], ['none_n', 'Nothing structured']] }),
      MEDICAL, FOOD, SEATS, PHOTOS, TRANSFERS,
    ],
    plan: [
      S('guest_services', 'recommended', 'Hold the space', 'Arrivals, rooming, a gentle rhythm and a contact who stays unobtrusive'),
      S('catering_food', 'conditional', 'Nourish them', 'Simple, timed meals — the kitchen is most of a retreat’s experience', { when: WHEN_FOOD }),
      S('safety_facilities', 'recommended', 'Cover them', 'First aid, water and a known route to help from somewhere remote'),
      S('live_entertainment', 'conditional', 'Guide it', 'Facilitators for the sessions, at their own stated rates', { when: [ans('focus_n', 'yoga_n', 'sessions_n', 'walks_n')] }),
      S('tent_furniture', 'conditional', 'Settle it', 'A session space, shaded outdoor seating and cover', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Transfers to somewhere with no public transport', { when: WHEN_TRANSFER }),
      S('power_cooling', 'conditional', 'Keep it on', 'Power, hot water and a backup, which remote properties lack', { when: [some(WHEN_NO_POWER[0], WHEN_STAYING[0])] }),
      S('photography', 'conditional', 'Capture it', 'Discreet photography, which a retreat needs more than a shoot', { when: WHEN_SHOT }),
      S('event_lighting', 'conditional', 'Light paths', 'Low path lighting, enough to walk by and not enough to intrude', { when: WHEN_STAYING }),
      S('transportation', 'conditional', 'Supply it', 'Everything carried in, because nothing is nearby', { when: [some(WHEN_NO_SERVICES[0], WHEN_LONG[0])] }),
      S('venue', 'conditional', 'Find', 'Somewhere genuinely quiet with hot water and help within reach', { when: WHEN_FINDING }),
    ],
    addons: [
      X('empty_hours', 'Leave it empty', 'Unscheduled hours protected, because a full retreat is not a retreat', 'schedule', { experience: true }),
      X('phone_choice', 'Offer it', 'A stated phone-free period, offered rather than imposed', 'invite', { experience: true, when: [ans('focus_n', 'silence_n')] }),
      X('medical_route', 'Know the way', 'Nearest help named and the drive timed, from somewhere remote', 'spa', { trade: 'safety_facilities' }),
      X('kitchen_brief', 'Feed them well', 'Dietary needs given to the kitchen in writing before arrival', 'buffet', { trade: 'catering_food', when: WHEN_FOOD }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The property is yours to book — we have no hotel partners. We make no wellness or medical claims about any session or practitioner.' },
    timeline: {
      before: ['Dietary needs sent to the kitchen in writing', 'Nearest help named and the drive timed', 'Schedule deliberately left with gaps in it'],
      during: ['Empty hours protected against being filled', 'Hot water, hot food and warmth available throughout', 'Paths lit low enough not to intrude'],
      after: ['Everyone accounted for on departure', 'Property left as found', 'Facilitators paid as agreed'],
    },
    checklist: ['Dietary needs to the kitchen in writing', 'Nearest help named and timed', 'Unscheduled hours protected', 'Hot water and backup power'],
  }),

  B('glamping-experience', 'Soft camping', 'Tents with real beds, which is camping with the hard parts solved.', {
    about: 'Guests expect a hotel in a field: a proper bed, a hot shower, light at night and somewhere to charge a phone. All four are brought in, and all four are what this format is judged on.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, NIGHTS, PERMITS, WEATHER, SITE_HAS,
      Q('comfort_g', 'What level of comfort?', 'one', { options: [['luxury_g', 'Luxury — beds, linen, en-suite'], ['comfortable_g', 'Comfortable — beds and shared washrooms'], ['simple_g', 'Simple — mats and shared facilities']] }),
      MEDICAL, FOOD, PHOTOS, SEATS, CLEAN, TRANSFERS, DECOR,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Pitch it', 'Bell tents or safari tents, beds, linen and furniture inside each one'),
      S('safety_facilities', 'recommended', 'Plumb it', 'Hot showers, washrooms, water and waste — the field has none'),
      S('power_cooling', 'recommended', 'Power it', 'Quiet generators, tent lighting and somewhere to charge a phone'),
      S('catering_food', 'conditional', 'Feed them', 'Meals across the stay from a kitchen that arrives with the tents', { when: WHEN_FOOD }),
      S('guest_services', 'recommended', 'Host it', 'Check-in, tent allocation, turndown and a host overnight on site'),
      S('event_lighting', 'recommended', 'Light the camp', 'Path lighting and warm light at each tent, because a field is dark'),
      S('tent_furniture', 'conditional', 'Set outside', 'A communal area with seating, shade, fire pit and cover', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('decoration_floral', 'conditional', 'Style it', 'Styling inside the tents and across the communal area', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Capture', 'The camp at dusk, which is the photograph people want', { when: WHEN_SHOT }),
      S('transportation', 'conditional', 'Carry it in', 'Tents, beds, kitchen and plumbing to a site with no road', { when: [some(WHEN_NO_SERVICES[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Transfers to a site guests cannot reach themselves', { when: WHEN_TRANSFER }),
      S('venue', 'conditional', 'Find the field', 'A site with permission, firm ground, water access and a view', { when: WHEN_FINDING }),
    ],
    addons: [
      X('hot_water', 'Plumb it', 'Hot showers, which is the single thing glamping is judged on', 'broom', { trade: 'safety_facilities' }),
      X('tent_power', 'Charge it', 'A charging point and reading light in each tent', 'power_cooling', { trade: 'power_cooling' }),
      X('night_host', 'Stay awake', 'A host on site overnight, because guests in a field need someone', 'group', { trade: 'guest_services', when: WHEN_STAYING }),
      X('weather_bedding', 'Warm them', 'Bedding for the actual night temperature, not the daytime one', 'bed', { trade: 'event_equipment_rental' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A field has no power, water, washroom or light. Everything arrives, and everything leaves. Hot water and tent lighting are what this format lives or dies on.' },
    timeline: {
      before: ['Site permission, ground firmness and water access confirmed', 'Hot water, power, washrooms and lighting arranged — the field has none', 'Night temperature checked and bedding specified for it'],
      during: ['Check-in and tent allocation like a hotel, not a campsite', 'A host on site overnight and reachable', 'Paths lit and the communal area warm after dark'],
      after: ['Camp struck and the field left exactly as found', 'Waste and grey water removed properly', 'Photographs shared'],
    },
    checklist: ['Site permission and firm ground', 'Hot showers and washrooms', 'Light and charging in every tent', 'Overnight host on site'],
  }),

  B('outdoor-adventure-challenge', 'Set a course', 'A timed course or event, where competitors push and things go wrong.', {
    about: 'Harder than a club meetup because people race. Marshals, a counted field, water on the course and medical at the finish are the event, not the extras.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, OPERATOR,
      Q('format_c', 'What is the format?', 'many', { options: [['run', 'A run or trail'], ['obstacle', 'An obstacle course'], ['cycle_c', 'A cycle route'], ['multi', 'A multi-discipline event'], ['team_c', 'Team challenges']] }),
      Q('route_length', 'How long is the route?', 'one', { options: [['short_r', 'Under 5 km'], ['mid_r', '5 to 15 km'], ['long_r', 'Over 15 km'], ['loop_r', 'A contained loop']] }),
      Q('timing_c', 'Is it timed or ranked?', 'yesno', { optional: true }),
      MEDICAL, FOOD, AV, PHOTOS, SIGNAGE, CLEAN, TRANSFERS,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Cover it', 'Medical at the finish, roving cover and an evacuation plan per section'),
      S('guest_services', 'recommended', 'Register them', 'Registration, declarations, numbers, a briefing and a finish count'),
      S('event_equipment_rental', 'recommended', 'Build it', 'Start and finish structures, obstacles, barriers and course furniture'),
      S('bar_beverages', 'recommended', 'Hydrate them', 'Water stations on the course and at the finish, which is a safety item'),
      S('security_services', 'recommended', 'Marshal it', 'Marshals at every junction, crossing and blind section'),
      S('invitation_printing', 'conditional', 'Signpost it', 'Course markers, numbers, route maps and safety notices', { when: WHEN_SIGNED }),
      S('sound_av', 'conditional', 'Call it', 'A PA at start and finish, for briefings and for emergencies', { when: WHEN_AV }),
      S('catering_food', 'conditional', 'Feed them', 'Food at the finish and crew catering through a long day', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Capture', 'The finish line and the course, from positions that do not obstruct', { when: WHEN_SHOT }),
      S('tent_furniture', 'recommended', 'Set the base', 'Start, finish, medical, registration and a recovery area'),
      S('passenger_transport', 'conditional', 'Shuttle them', 'Transport to a start that is not at the finish', { when: WHEN_TRANSFER }),
      S('end_to_end_event_logistics', 'conditional', 'Run it', 'A route across several kilometres, with crew at every point', { when: [ans('route_length', 'mid_r', 'long_r')] }),
      S('venue', 'conditional', 'Secure a route', 'A route with permission, marshal access and an evacuation plan', { when: WHEN_FINDING }),
    ],
    addons: [
      X('marshal_points', 'Marshal it', 'A marshal at every junction and crossing, briefed and in radio contact', 'group', { experience: true }),
      X('water_stations', 'Water the course', 'Water at set intervals, which is a safety requirement, not hospitality', 'glass', { trade: 'bar_beverages' }),
      X('finish_count', 'Count them in', 'Every competitor counted in, with a search plan for anyone missing', 'poll', { experience: true }),
      X('cutoff_times', 'Set cut-offs', 'Cut-off times per section, so nobody is out there after dark', 'schedule', { experience: true, when: [ans('route_length', 'mid_r', 'long_r')] }),
    ],
    toolkit: { polls: ['date'], note: 'Route permissions, marshal cover, medical cover and water on the course are the organiser’s and stay on the plan. We give no advice on anyone’s fitness to compete.' },
    timeline: {
      before: ['Route permissions obtained and the course walked in full', 'Marshal points, water stations and evacuation routes mapped', 'Declarations collected and medical cover confirmed'],
      during: ['Safety briefing before the start, with cut-offs stated', 'Marshals in position and in contact before the first competitor', 'Every finisher counted in against the start list'],
      after: ['Anyone unaccounted for searched for before the course is cleared', 'Course fully de-marked and the ground cleared', 'Incidents logged and results published'],
    },
    checklist: ['Route permission and the course walked', 'Marshals at every junction', 'Water at set intervals', 'Finish count with a search plan'],
  }),

  B('destination-anniversary', 'Go back', 'An anniversary marked away, often where it started.', {
    about: 'Smaller than the wedding was, and better for it. The two of them matter more than the guest list, and the plan should leave them time alone in it.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, NIGHTS, TRAVEL, STAY, WEATHER,
      Q('years', 'Which anniversary?', 'select', { options: [['1', 'First'], ['10', 'Tenth'], ['25', 'Twenty-fifth'], ['50', 'Fiftieth'], ['other_y', 'Another year']] }),
      Q('shape_a', 'What shape should it take?', 'one', { options: [['two_a', 'Just the two of us'], ['close_a', 'Close family'], ['party_a', 'A proper party'], ['renewal_a', 'A renewal of vows']] }),
      DIET_ONLY, ALLERGY_ONLY, CAKE_Q, FOOD, SEATS, PHOTOS, DECOR, TRANSFERS, AV,
    ],
    plan: [
      S('guest_services', 'conditional', 'Host them', 'Arrivals, rooming and one contact for everyone who travelled', { when: [notAns('shape_a', 'two_a')] }),
      S('catering_food', 'conditional', 'Feed them', 'Meals across the stay, to everyone’s stated needs', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress it', 'A setting for the dinner, and flowers in the room on arrival', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Capture them', 'A portrait session for the two of them, which is the real keepsake', { when: WHEN_SHOT }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake that survives the journey, or one baked locally', { when: [notAns('cake', 'no')] }),
      S('priest_rituals', 'conditional', 'Lead the vows', 'A practitioner, only because you asked for one', { when: [ans('shape_a', 'renewal_a')] }),
      S('sound_av', 'conditional', 'Carry it', 'Sound and a mic for speeches, which a property rarely covers', { when: WHEN_AV }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the dinner setting and the walk back', { when: [some(WHEN_LIT[0], WHEN_DECOR[0])] }),
      S('live_entertainment', 'conditional', 'Play for them', 'A musician for the dinner, pitched quiet rather than loud', { when: [some(WHEN_MUSIC[0], ans('shape_a', 'party_a'))] }),
      S('tent_furniture', 'conditional', 'Furnish it', 'An outdoor dining setting with cover on standby', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('passenger_transport', 'conditional', 'Move them', 'Transfers timed to the flights, in and out', { when: WHEN_TRANSFER }),
      S('venue', 'conditional', 'Find it', 'Somewhere that holds the group and the evening you want', { when: WHEN_FINDING }),
    ],
    addons: [
      X('private_table', 'Leave them alone', 'One dinner for just the two of them, protected from the group', 'cutlery', { experience: true, when: [notAns('shape_a', 'two_a')] }),
      X('then_and_now', 'Photograph it', 'A portrait in the same place, which is the point of going back', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('arrival_flowers', 'Welcome them', 'Flowers waiting in the room, which costs little and lands hard', 'flower', { trade: 'decoration_floral' }),
      X('family_speeches', 'Let them speak', 'Speeches planned and timed, so they happen and do not overrun', 'mic', { experience: true, when: [notAns('shape_a', 'two_a')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Rooms and flights stay yours to book — we have no hotel partners. A renewal of vows happens only if you ask for one, and we never calculate an auspicious time.' },
    timeline: {
      before: ['Transfers planned both ways and rooming agreed', 'Dietary needs confirmed to every kitchen', 'One private dinner protected in the schedule'],
      during: ['A named contact reachable throughout', 'Portrait session taken in the good light, not after dinner', 'Speeches timed so they land and stop'],
      after: ['Departure transfers run as planned', 'Photographs shared with everyone who came', 'Property settled'],
    },
    checklist: ['Transfers both ways', 'Dietary needs to each kitchen', 'A private dinner for the two of them', 'Portrait session in good light'],
  }),

  B('sunset-celebration', 'Catch the sun', 'Twenty good minutes, which the whole evening is built around.', {
    about: 'The one format with a non-negotiable start time, and it comes from the sunset table rather than the invitation. Everything before it is early and everything after it needs light brought in.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('occasion_s', 'What is the occasion?', 'one', { options: [['engagement_s', 'An engagement'], ['birthday_s', 'A birthday'], ['anniversary_s', 'An anniversary'], ['gathering_s', 'A gathering'], ['proposal_s', 'A proposal']] }),
      DRESS_CODE, DIET_ONLY, FOOD, MEDICAL, CLEAN, SIGNAGE, PHOTOS, AV, SEATS, DECOR,
    ],
    plan: [
      S('photography', 'recommended', 'Shoot it', 'A photographer in position before the light turns, not during it'),
      S('decoration_floral', 'conditional', 'Frame the view', 'Styling that faces the view rather than competing with it', { when: WHEN_DECOR }),
      S('event_lighting', 'recommended', 'Carry it over', 'Lighting for after sunset — it goes dark faster than people expect'),
      S('catering_food', 'conditional', 'Feed them', 'Food served before and after the light, never during it', { when: WHEN_FOOD }),
      S('bar_beverages', 'recommended', 'Pour', 'Drinks served early, so nobody is queuing when the light turns'),
      S('tent_furniture', 'conditional', 'Seat them', 'Seating facing the view, with cover on standby behind it', { when: [some(WHEN_SEATS[0], WHEN_COVER[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic, quiet enough that the view stays the event', { when: WHEN_AV }),
      S('live_entertainment', 'conditional', 'Play it', 'A musician for the hour around sunset, acoustic rather than amplified', { when: WHEN_MUSIC }),
      S('safety_facilities', 'conditional', 'Service it', 'Washrooms, first aid and the site cleared after dark', { when: [some(WHEN_AID[0], WHEN_NO_LOOS[0], WHEN_CLEAN[0])] }),
      S('power_cooling', 'conditional', 'Power it', 'Power for lighting and sound, which a viewpoint does not have', { when: [some(WHEN_NO_POWER[0], WHEN_AV[0])] }),
      S('guest_services', 'conditional', 'Get them early', 'Arrivals timed well before the light, which is the whole risk', { when: [some(WHEN_BIG[0], WHEN_SIGNED[0])] }),
      S('venue', 'conditional', 'Find the view', 'A west-facing spot with access, permission and somewhere to set up', { when: WHEN_FINDING }),
    ],
    addons: [
      X('sunset_time', 'Check the table', 'The actual sunset time for the date, with arrivals set an hour before', 'schedule', { experience: true }),
      X('after_dark_light', 'Keep it going', 'Lighting ready before the light goes, not fetched afterwards', 'lighting', { trade: 'event_lighting' }),
      X('facing_right', 'Face the view', 'Seating and setup oriented to where the sun actually sets', 'map', { experience: true }),
      X('cloud_plan', 'Plan for cloud', 'A plan for a clouded-over sunset, so the evening still works', 'tent', { experience: true, when: WHEN_COVER }),
    ],
    toolkit: { polls: ['date'], note: 'The start time comes from the published sunset time for your date, not from the invitation. We read it from a table; we never calculate an auspicious or astronomical time ourselves.' },
    timeline: {
      before: ['Published sunset time checked for the exact date', 'Setup oriented to where the sun actually sets', 'Lighting for after dark on site before guests arrive'],
      during: ['Guests arrived and served a full hour before the light', 'Nothing scheduled across the twenty minutes that matter', 'Lighting on before it is needed, not after'],
      after: ['Site cleared in the dark, with lighting kept until the end', 'Everything removed', 'Photographs shared'],
    },
    checklist: ['Sunset time checked for the date', 'Arrivals an hour early', 'After-dark lighting on site first', 'A plan for cloud'],
  }),

  B('stargazing-gathering', 'Look up', 'Darkness, which means no lighting, cold, and a long way from town.', {
    about: 'The one event where lighting is the enemy. Everything that makes it work — real darkness, a clear sky, warmth and red light only — is decided before anyone travels.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER, SITE_HAS,
      Q('equipment_s', 'What is being used?', 'many', { optional: true, options: [['telescopes', 'Telescopes'], ['binoculars', 'Binoculars'], ['naked_eye', 'The naked eye'], ['astro_photo', 'Astrophotography']] }),
      Q('guided_s', 'Is someone guiding the session?', 'one', { options: [['astronomer', 'Yes, an astronomy group'], ['member', 'Someone in our group'], ['no_guide', 'Nobody — just looking']] }),
      MEDICAL, FOOD, PHOTOS, SEATS, TRANSFERS, CLEAN,
    ],
    plan: [
      S('live_entertainment', 'conditional', 'Guide the sky', 'An astronomy group with their own equipment and their own session', { when: [ans('guided_s', 'astronomer')] }),
      S('tent_furniture', 'recommended', 'Lay them back', 'Reclining seating, rugs and blankets, because necks ache looking up'),
      S('safety_facilities', 'recommended', 'Cover the dark', 'First aid, washrooms and a safe marked route in near-total darkness'),
      S('catering_food', 'conditional', 'Warm them', 'Hot drinks and food that can be eaten in the dark', { when: WHEN_FOOD }),
      S('event_lighting', 'recommended', 'Use red only', 'Red, low-level lighting on routes — white light ends the session'),
      S('event_equipment_rental', 'conditional', 'Set it up', 'Telescope platforms, tables and wind screening', { when: [has('equipment_s')] }),
      S('passenger_transport', 'conditional', 'Drive them out', 'Transport to somewhere genuinely dark, and back late', { when: WHEN_TRANSFER }),
      S('photography', 'conditional', 'Capture it', 'Long-exposure work, which needs its own position and no torches', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power it', 'A quiet power source for equipment, placed away from the group', { when: [some(WHEN_NO_POWER[0], has('equipment_s'))] }),
      S('guest_services', 'conditional', 'Brief them', 'A briefing on red light, warmth and where not to walk', { when: [some(WHEN_BIG[0], has('equipment_s'))] }),
      S('venue', 'conditional', 'Find the dark', 'Somewhere genuinely dark with vehicle access and a clear horizon', { when: WHEN_FINDING }),
    ],
    addons: [
      X('red_light_only', 'Kill the white', 'Red light only, briefed to everyone — one phone torch ruins it', 'lighting', { trade: 'event_lighting' }),
      X('moon_check', 'Check the moon', 'The moon phase checked for the date, because a full moon ends stargazing', 'schedule', { experience: true }),
      X('warm_kit', 'Warn them', 'A kit list with the actual night temperature on it', 'invite', { experience: true }),
      X('marked_route', 'Mark the way', 'A marked, hazard-free route, because nobody can see their feet', 'map', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'We read the moon phase and sky conditions from published sources and never calculate an astronomical or auspicious time. An astronomy group runs its own session and we plan around it.' },
    timeline: {
      before: ['Moon phase and cloud forecast checked for the exact date', 'Site checked for real darkness and vehicle access', 'Kit list with night temperatures sent to everyone'],
      during: ['Red light only, briefed before dark', 'A marked, cleared route to washrooms and vehicles', 'Hot drinks available throughout — it gets colder than expected'],
      after: ['Everyone counted back to the vehicles', 'Site cleared with red light, nothing left behind', 'Photographs shared'],
    },
    checklist: ['Moon phase checked for the date', 'Red light only, briefed', 'Night-temperature kit list', 'Marked route in the dark'],
  }),

  B('road-trip-meetup', 'Convoy out', 'Several vehicles, one route and a lot that can go wrong on it.', {
    about: 'We plan the stops, the briefing and the recovery — never the driving. The route sheet, a lead and sweep vehicle and one channel everyone is on are what make a convoy safe.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, PERMITS, WEATHER,
      Q('vehicles', 'What is the group driving?', 'many', { options: [['cars', 'Cars'], ['bikes', 'Motorcycles'], ['bicycles', 'Bicycles'], ['mixed_v', 'A mix']] }),
      Q('distance', 'How far is the route?', 'one', { options: [['day_t', 'A day out'], ['weekend_t', 'A weekend'], ['long_t', 'Several days']] }),
      Q('stops', 'What stops are planned?', 'many', { optional: true, options: [['breakfast_t', 'Breakfast'], ['scenic_t', 'A scenic halt'], ['lunch_t', 'Lunch'], ['overnight_t', 'An overnight'], ['finish_t', 'A finish point']] }),
      MEDICAL, FOOD, SEATS, AV, PHOTOS, SIGNAGE, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Brief them', 'A route sheet, a briefing, a lead and sweep, and one group channel'),
      S('safety_facilities', 'recommended', 'Cover the road', 'First aid in the convoy and hospitals identified along the route'),
      S('catering_food', 'conditional', 'Feed the stops', 'Food arranged at the stops, booked for the number arriving', { when: WHEN_FOOD }),
      S('invitation_printing', 'conditional', 'Print it', 'Route sheets, stop timings, emergency numbers and vehicle stickers', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Capture it', 'The convoy and the stops, shot from stationary positions only', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Set the finish', 'Seating, shade and cover at the halt or finish point', { when: [some(WHEN_SEATS[0], ans('stops', 'finish_t', 'scenic_t'))] }),
      S('bar_beverages', 'recommended', 'Hydrate them', 'Water and hot drinks at the stops, which long drives need'),
      S('live_entertainment', 'conditional', 'Mark the end', 'Music or a programme at the finish point, if there is one', { when: [some(WHEN_MUSIC[0], ans('stops', 'finish_t'))] }),
      S('sound_av', 'conditional', 'Address them', 'A PA at the briefing and the finish, so everyone hears it', { when: WHEN_AV }),
      S('transportation', 'conditional', 'Support it', 'A support vehicle carrying spares, fuel, water and luggage', { when: [ans('distance', 'weekend_t', 'long_t')] }),
      S('venue', 'conditional', 'Fix the points', 'Start, halt and finish points with parking and permission', { when: WHEN_FINDING }),
    ],
    addons: [
      X('route_sheet', 'Write it down', 'A route sheet with stops, timings and emergency numbers on it', 'map', { trade: 'invitation_printing' }),
      X('lead_and_sweep', 'Top and tail', 'A lead and a sweep vehicle, so nobody is left behind unnoticed', 'bus', { experience: true }),
      X('one_channel', 'Agree a channel', 'A single group channel everyone is on before setting off', 'invite', { experience: true }),
      X('hospital_list', 'List them', 'Hospitals identified along the route, not searched for at the time', 'spa', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We arrange the stops, the briefing and the support — never the driving. Vehicle condition, licences, insurance and the way people drive are theirs, and we never suggest a pace or a timing that pushes it.' },
    timeline: {
      before: ['Route sheet with stops, timings and emergency numbers sent out', 'Hospitals along the route identified and listed', 'Lead, sweep and support vehicles assigned'],
      during: ['Briefing before setting off, with the group channel confirmed', 'Headcount of vehicles at every stop, sweep arriving last', 'No pace set and no stop skipped to make time'],
      after: ['Every vehicle accounted for at the finish', 'Stops left clean', 'Photographs shared'],
    },
    checklist: ['Route sheet with emergency numbers', 'Lead and sweep vehicles', 'One group channel', 'Hospitals listed along the route'],
  }),
]

export const OUTDOOR_BLUEPRINT = Object.fromEntries(OUTDOOR_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(OUTDOOR_BLUEPRINTS, 'outdoor')
