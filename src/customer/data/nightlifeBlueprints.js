/**
 * Live Entertainment & Nightlife — one blueprint per occasion.
 *
 * Thirty-one occasions, and the only category in the catalogue where
 * most events happen after dark, in a licensed room, in front of a
 * crowd that paid to get in. Four things shape every plan here:
 *
 *   · Alcohol is never ours. Where there is a bar, the venue holds the
 *     licence and the legal drinking age applies. We ask whether there
 *     is one, we never assume it, and we never arrange it ourselves.
 *     A mocktail night and a club night get the same question.
 *   · Amplified sound late at night is restricted almost everywhere in
 *     India, and outdoors most of all. We ask whether it runs late and
 *     build the set times around the rule rather than meet it at 10 pm
 *     with a crowd in front of the stage.
 *   · Capacity, exits and the barrier are safety, not production. We
 *     will keep crowd management and first aid on a plan with a real
 *     crowd on it even when everything decorative is switched off.
 *   · The artist's rider sets the sound, the stage and the power. Where
 *     an act is booked, the rider is the specification; where it is not,
 *     we plan for the room and say what is assumed.
 *
 * Nothing here ever suggests fireworks, flame effects or pyrotechnics.
 * If a customer arranges their own, that is theirs and the venue's to
 * license — we will not put it on a plan.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, DIET_ONLY, ALLERGY_ONLY,
  UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a night out asks ──────────────────────────────── */

const CROWD = Q('crowd', 'About how many people?', 'select', {
  options: [['60', 'Up to 60'], ['200', 'Up to 200'], ['800', 'Up to 800'], ['3000', 'Up to 3000'], ['10000', 'More than 3000']],
  help: 'Capacity decides the barrier, the exits, the security and the first aid.',
})
const PLACE = Q('place', 'Where is it?', 'one', {
  options: [['club', 'A club or pub'], ['lounge', 'A lounge or rooftop'], ['venue', 'An event venue'], ['open', 'An open ground'], ['cafe', 'A café or small room'], ['find', 'Please find somewhere']],
})
const ENTRY = Q('entry', 'How do people get in?', 'one', {
  options: [['free', 'Free entry'], ['ticket', 'Ticketed'], ['cover', 'A cover charge'], ['guest', 'Guest list only'], ['rsvp', 'RSVP']],
})

/** The one question this category must never answer on its own. */
const DRINKS = Q('drinks', 'Drinks', 'one', {
  options: [['venue', 'The venue handles it'], ['soft', 'Soft drinks and mocktails only'], ['bar', 'A licensed bar'], ['none', 'No drinks service']],
  help: 'A bar is the venue’s licence and the legal drinking age applies. We never assume one and never arrange alcohol ourselves.',
})
const LATE = Q('late', 'Does it run past 10 pm?', 'yesno', {
  help: 'Amplified sound late at night is restricted in most places, outdoors most of all. We build the set times around the rule.',
})
const SOUND = Q('sound', 'Sound and lights', 'many', {
  options: [['pa', 'A PA system'], ['monitors', 'Stage monitors'], ['booth', 'A DJ booth'], ['lights', 'Stage or dance lighting'], ['visuals', 'Screens or visuals'], ['have', 'The venue has its own']],
})
const GUARD = Q('security', 'Do you need security and door staff?', 'yesno')
const AID = Q('first_aid', 'First aid or an ambulance on standby?', 'yesno', { optional: true })
const ARTIST = Q('artist', 'Is the act confirmed?', 'one', {
  options: [['rider', 'Yes, and we have the rider'], ['booked', 'Booked, rider not received'], ['find', 'Please help us find one'], ['open', 'Open call or sign-ups']],
  help: 'The rider is the specification. Without it we plan for the room and tell you what we assumed.',
})
const AGE_DOOR = Q('age_door', 'Is there an age restriction at the door?', 'one', {
  optional: true,
  options: [['none', 'No restriction'], ['adults', 'Adults only'], ['legal', 'The legal drinking age applies'], ['all', 'All ages, no alcohol']],
})
const BARRIER = Q('barrier', 'Do you need barricading or a front-of-stage barrier?', 'yesno', { optional: true })
const PROMO = Q('promotion', 'Do you need posters, tickets and promotion material?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const FOOD = Q('food', 'Food', 'one', {
  optional: true, options: [['venue', 'The venue handles it'], ['counters', 'Food counters'], ['stalls', 'Food stalls'], ['snacks', 'Bar snacks'], ['none', 'No food']],
})

const WHEN_PA = [some(ans('sound', 'pa', 'monitors', 'booth'), notAns('sound', 'have'))]
const WHEN_LIGHTS = [ans('sound', 'lights', 'visuals')]
const WHEN_BOOTH = [ans('sound', 'booth')]
const WHEN_TICKETED = [ans('entry', 'ticket', 'cover')]
const WHEN_LISTED = [ans('entry', 'guest', 'rsvp')]
const WHEN_BAR = [ans('drinks', 'soft', 'bar')]
const WHEN_LATE = [ans('late', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_AID = [ans('first_aid', 'yes')]
const WHEN_BARRIER = [ans('barrier', 'yes')]
const WHEN_PROMO = [ans('promotion', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_FOOD = [ans('food', 'counters', 'stalls', 'snacks')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'open')]
const WHEN_OPEN_AIR = [ans('place', 'open')]
const WHEN_BIG = [ans('crowd', '800', '3000', '10000')]
const WHEN_HUGE = [ans('crowd', '3000', '10000')]
const WHEN_RIDER = [ans('artist', 'rider', 'booked')]
const WHEN_FIND_ACT = [ans('artist', 'find')]

export const NIGHTLIFE_BLUEPRINTS = [

  B('live-concert', 'Headline', 'One act, a crowd that came for them, and a barrier between the two.', {
    about: 'The template for everything else in this category. The rider sets the specification, the capacity sets the safety plan, and the set time has to land inside whatever the local sound rule allows.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, BARRIER, AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'A system specified against the rider, not against the budget'),
      S('event_lighting', 'recommended', 'Light', 'A rig that matches the act and the size of the room'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, trussing, barricades and the front-of-stage barrier'),
      S('security_services', 'conditional', 'Control', 'Door, pit and gate staff for the crowd you are expecting', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_BARRIER[0])] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid at the pit, washrooms, and the clear-up after', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('live_entertainment', 'conditional', 'Book', 'An act for the room and the crowd you described', { when: WHEN_FIND_ACT }),
      S('power_cooling', 'conditional', 'Power', 'Silent generators sized to the rider, with a backup feed', { when: [some(WHEN_OPEN_AIR[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Gate', 'Gate staff scanning and counting, which is how you stay legal', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, wristbands, gate lists and posters', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, staffed, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Shoot', 'The act and the crowd, from the pit and from the back', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The set filmed, with the artist’s written permission', { when: [ans('photos', 'yes')] }),
      S('catering_food', 'conditional', 'Feed', 'Counters for the crowd and a green-room spread for the act', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'House', 'A green room, and seating where the crowd is not standing', { when: WHEN_RIDER }),
      S('venue', 'conditional', 'Find', 'A room or ground that takes the crowd and allows the sound', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rider_match', 'Match', 'The rider read line by line against what is actually booked', 'schedule', { experience: true, when: WHEN_RIDER }),
      X('curfew_plan', 'Land it', 'Set times built so the last song finishes inside the sound rule', 'schedule', { experience: true, when: WHEN_LATE }),
      X('pit_barrier', 'Hold', 'A front-of-stage barrier with a pit and a route out of it', 'security_services', { trade: 'event_equipment_rental', when: WHEN_BARRIER }),
      X('support_act', 'Open', 'A support act, so the night does not start at the headline', 'music', { trade: 'live_entertainment' }),
    ],
    toolkit: { polls: ['date'], note: 'Never sell more tickets than the room is permitted to hold. Capacity, permissions and the sound curfew are the promoter’s, and we keep them visible.' },
    timeline: {
      before: ['Capacity and permissions confirmed in writing before tickets go on sale', 'Rider matched against the booking, line by line', 'Gates, exits and the barrier planned on a drawn ground plan'],
      during: ['Gates counted, never over capacity', 'First aid at the pit from doors open', 'Set times held so the night finishes inside the rule'],
      after: ['Load-out the same night', 'Ticket and bar reconciliation', 'Venue restored'],
    },
    checklist: ['Capacity and permissions in writing', 'Rider matched to the booking', 'Barrier and exits on a drawn plan', 'Set times inside the sound rule'],
  }),

  B('dj-night', 'Pulse', 'A booth, a floor and a room that does not sit down.', {
    about: 'Simpler than a concert and harder in one way: there is no interval, so the sound, the lights and the bar all have to run for five hours without a break.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, AGE_DOOR, AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('dj_music', 'conditional', 'Spin', 'A DJ booked for the room, the hour and the crowd', { when: WHEN_FIND_ACT }),
      S('sound_av', 'conditional', 'Drive', 'A floor system with the bottom end a dance floor needs', { when: WHEN_PA }),
      S('event_lighting', 'conditional', 'Pulse', 'Moving lights and effects, run live rather than left on', { when: WHEN_LIGHTS }),
      S('event_equipment_rental', 'conditional', 'Rig', 'A booth, risers and a dance floor', { when: WHEN_BOOTH }),
      S('security_services', 'conditional', 'Door', 'Door staff who can check age and manage a queue', { when: [some(WHEN_GUARD[0], ans('age_door', 'adults', 'legal'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service that can keep up with a full floor', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'List', 'Door list, wristbands and a queue that moves', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets, wristbands and the artwork for them', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'The booth, the floor and the room, shot for social', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, washrooms serviced, and the clear-up after', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('catering_food', 'conditional', 'Snack', 'Bar snacks or a counter for a long night', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for the rig and cooling for a packed room', { when: [some(WHEN_OPEN_AIR[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A room with a licence, a late closing time and a floor', { when: WHEN_FINDING }),
      S('decoration_floral', 'optional', 'Dress', 'Set dressing and a backdrop behind the booth'),
    ],
    addons: [
      X('booth_build', 'Elevate', 'A built, lit booth instead of a table with a cloth on it', 'event_equipment_rental', { trade: 'event_equipment_rental', when: WHEN_BOOTH }),
      X('warm_up_set', 'Build', 'A warm-up DJ, so the floor is full before the headline starts', 'music', { trade: 'dj_music' }),
      X('age_check', 'Verify', 'ID checked at the door, by staff trained to do it', 'guest_services', { trade: 'security_services', when: [ans('age_door', 'adults', 'legal')] }),
      X('sound_limit', 'Comply', 'Sound levels set to the venue’s limit and held there', 'schedule', { experience: true, when: WHEN_LATE }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Nothing here assumes alcohol. Where there is a bar it is the venue’s licence, and the legal drinking age applies at the door.' },
    timeline: {
      before: ['Closing time and sound limit confirmed with the venue in writing', 'DJ confirmed with set times and technical needs', 'Door policy agreed, including age checking'],
      during: ['Doors on time, queue moving, list at the door', 'Levels held to the venue’s limit', 'Bar staffed for the busiest hour, not the average one'],
      after: ['Load-out and clear-up the same night', 'Bar and door reconciliation', 'Venue restored'],
    },
    checklist: ['Closing time and sound limit in writing', 'DJ set times confirmed', 'Door and age policy agreed', 'Bar staffed for peak'],
  }),

  B('edm-festival', 'Surge', 'A production rig, a field, and several thousand people in front of it.', {
    about: 'The largest and most hazardous thing in this category. Everything is a safety question first: capacity, exits, barrier, water, first aid, and a sound plan that holds against a curfew on an open ground.',
    formats: ['outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, BARRIER, AID,
      Q('stages', 'How many stages?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Four or more']] }),
      Q('permits', 'Are the ground, sound and crowd permissions in place?', 'one', { options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']] }),
      PHOTOS, FOOD,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deploy', 'Line arrays per stage, delay towers, and levels held to the limit'),
      S('event_lighting', 'recommended', 'Rig', 'Production lighting and visuals across every stage'),
      S('event_equipment_rental', 'recommended', 'Construct', 'Stages, trussing, barriers, towers and the whole ground build'),
      S('security_services', 'recommended', 'Marshal', 'Gate, pit and ground security, with a counted capacity'),
      S('safety_facilities', 'recommended', 'Safeguard', 'Medical posts, ambulance standby, washrooms and water points'),
      S('power_cooling', 'recommended', 'Supply', 'Generators per stage with redundancy, distributed across the ground'),
      S('live_entertainment', 'conditional', 'Programme', 'A line-up built for the hours you can actually play', { when: WHEN_FIND_ACT }),
      S('guest_services', 'conditional', 'Admit', 'Gates, scanning, wristbanding and a counted headcount', { when: [some(WHEN_TICKETED[0], WHEN_BIG[0])] }),
      S('bar_beverages', 'conditional', 'Serve', 'Drinks and, far more importantly, free drinking water', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls across the ground, spread so no queue blocks a route', { when: WHEN_FOOD }),
      S('end_to_end_event_logistics', 'recommended', 'Coordinate', 'Build, show, load-out and the crew across the whole ground'),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, wristbands, ground maps and gate signage', { when: WHEN_TICKETED }),
      S('photography', 'conditional', 'Cover', 'Every stage and the crowd, across the whole festival', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Shelter', 'Green rooms, crew tents, shade and rest areas', { when: WHEN_BIG }),
      S('venue', 'conditional', 'Secure', 'A ground that can be fenced, exited and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('water_points', 'Hydrate', 'Free drinking water across the ground, which is a safety item', 'glass', { trade: 'safety_facilities' }),
      X('exit_plan', 'Evacuate', 'A drawn exit and emergency plan, briefed to every steward', 'map', { experience: true }),
      X('delay_towers', 'Carry', 'Delay towers so the back of the field hears the same show', 'sound_av', { trade: 'sound_av', when: WHEN_HUGE }),
      X('curfew_schedule', 'Finish', 'Stage times built to end inside the permitted hours', 'schedule', { experience: true, when: WHEN_LATE }),
      X('welfare_point', 'Care', 'A staffed welfare point, separate from medical, signposted', 'heart', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'Capacity, exits, medical cover and the permissions are the promoter’s responsibility. We keep them on the plan and never describe a ground as approved. We never suggest pyrotechnics or flame effects.' },
    timeline: {
      before: ['Permissions and capacity confirmed in writing before tickets sell', 'Ground plan drawn with gates, exits, routes and medical posts', 'Power sized per stage, with redundancy'],
      during: ['Headcount at the gates, never over capacity', 'Medical and welfare visible and staffed from doors', 'Set times held against the curfew, with a plan if one overruns'],
      after: ['Load-out and ground clearance to a schedule', 'Incident log completed and reviewed', 'Ground reinstated'],
    },
    checklist: ['Permissions and capacity in writing', 'Ground plan with exits and medical posts', 'Water points across the ground', 'Set times inside the permitted hours'],
  }),

  B('bollywood-night', 'Filmi', 'The songs everybody already knows the words to.', {
    about: 'The crowd is wider than a club night — all ages, families sometimes — and that changes the door, the timing and what the bar is for. The music is the draw and the floor fills early.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, AGE_DOOR,
      THEME('A theme or era?', [['none', 'No theme'], ['retro', 'Retro'], ['nineties', 'The nineties'], ['modern', 'Current hits'], ['regional', 'Regional cinema'], ['other', 'Something else']]),
      DRESS_CODE, AID, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('dj_music', 'conditional', 'Play', 'A DJ who knows the catalogue, not just the current playlist', { when: WHEN_FIND_ACT }),
      S('sound_av', 'conditional', 'Fill', 'A system that carries vocals, which this music lives on', { when: WHEN_PA }),
      S('event_lighting', 'conditional', 'Colour', 'Lighting with colour, because the room is part of the look', { when: WHEN_LIGHTS }),
      S('decoration_floral', 'recommended', 'Set', 'A themed room and a backdrop worth photographing in'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, staffed, as you chose', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food counters, which a Bollywood crowd expects', { when: WHEN_FOOD }),
      S('anchor_mc', 'optional', 'Host', 'A host to run dedications, requests and the dance-offs'),
      S('security_services', 'conditional', 'Door', 'Door staff and a queue plan for a mixed crowd', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Shoot', 'The floor, the outfits and the room', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets and the artwork for them', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Admit', 'A door list and wristbands', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A booth, a dance floor and a photo set', { when: WHEN_BOOTH }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A room with a floor and a licence to run as late as you need', { when: WHEN_FINDING }),
    ],
    addons: [
      X('request_board', 'Choose', 'A request board or poll, which this crowd will actually use', 'poll', { trade: 'dj_music' }),
      X('themed_set', 'Dress up', 'A themed photo set in the era you chose', 'booth', { trade: 'decoration_floral' }),
      X('dance_off', 'Compete', 'A dance-off segment with a host and a small prize', 'music', { trade: 'anchor_mc' }),
      X('early_slot', 'Open early', 'An earlier start, because this crowd arrives before a club crowd', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Nothing assumes alcohol. If the night is all ages, we keep the bar off the plan unless you put it back.' },
    timeline: {
      before: ['Music brief agreed with the DJ — era, language, what not to play', 'Door and age policy agreed', 'Photo set built and lit before doors'],
      during: ['Open earlier than a club night; this crowd comes early', 'Requests taken through a board, not shouted at the booth', 'Close inside the venue’s permitted hours'],
      after: ['Photographs shared the next morning', 'Venue cleared', 'Bar and door reconciliation'],
    },
    checklist: ['Music brief agreed with the DJ', 'Door and age policy set', 'Photo set built and lit', 'Closing time confirmed'],
  }),

  B('techno-night', 'Drive', 'A dark room, a long set and a sound system that can take it.', {
    about: 'Everything that matters here is sound and darkness. The lighting is sparse on purpose, the set is long, and the sub-bass is the reason the room was chosen.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, AGE_DOOR,
      Q('set_length', 'How long is the main set?', 'select', { options: [['2', 'Two hours'], ['3', 'Three hours'], ['4', 'Four hours'], ['6', 'An extended set']] }),
      AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'A system with real sub, tuned to the room before doors'),
      S('dj_music', 'conditional', 'Book', 'An artist who fits the room and the length of the set', { when: WHEN_FIND_ACT }),
      S('event_lighting', 'recommended', 'Strobe', 'Sparse, hard lighting and haze — darkness is the design'),
      S('event_equipment_rental', 'conditional', 'Rig', 'A booth, risers and the room blacked out properly', { when: WHEN_BOOTH }),
      S('security_services', 'conditional', 'Door', 'Door staff, age checking and a calm presence inside', { when: [some(WHEN_GUARD[0], ans('age_door', 'adults', 'legal'))] }),
      S('safety_facilities', 'recommended', 'Care', 'Free water, washrooms serviced, first aid and the clear-up'),
      S('bar_beverages', 'conditional', 'Serve', 'A bar, and free water available all night regardless', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Admit', 'Door list, wristbands and a queue that does not back onto the street', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Artwork, tickets and wristbands', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'Shot for the dark — long exposures, not flash in faces', { when: WHEN_SHOT }),
      S('power_cooling', 'recommended', 'Cool', 'Cooling and extraction for a packed, closed, dark room'),
      S('venue', 'conditional', 'Find', 'A room that can be blacked out and will take the sub', { when: WHEN_FINDING }),
      S('catering_food', 'conditional', 'Snack', 'Something at the back for a six-hour night', { when: WHEN_FOOD }),
    ],
    addons: [
      X('room_tuning', 'Tune', 'The system tuned to the room, with measurements, before doors', 'sound_av', { trade: 'sound_av' }),
      X('free_water', 'Hydrate', 'Free drinking water at the bar all night, as a policy', 'glass', { trade: 'safety_facilities' }),
      X('haze_lighting', 'Obscure', 'Haze and hard beams instead of colour wash', 'lighting', { trade: 'event_lighting', when: WHEN_LIGHTS }),
      X('cooling_plan', 'Ventilate', 'Extraction and cooling sized for a full, closed room', 'power_cooling', { trade: 'power_cooling' }),
    ],
    toolkit: { polls: ['date'], note: 'Free water and working ventilation are safety items in a dark, packed room. They stay on the plan.' },
    timeline: {
      before: ['System tuned to the room with measurements', 'Closing time and sound limit confirmed in writing', 'Ventilation and water plan agreed with the venue'],
      during: ['Free water at the bar from doors', 'Levels held, room temperature watched', 'Set runs to the agreed finish'],
      after: ['Clear-up the same night', 'Incident log if anything happened', 'Venue restored'],
    },
    checklist: ['System tuned to the room', 'Free water available all night', 'Ventilation adequate for a full room', 'Closing time confirmed'],
  }),

  B('live-band-performance', 'Perform', 'Five musicians, a stage and a sound check that decides the evening.', {
    about: 'The difference between this and a DJ night is the line check. A band needs monitors, inputs and forty-five minutes before doors — the gig is lost or won there.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD,
      Q('band_size', 'How many on stage?', 'select', { options: [['3', 'Up to 3'], ['6', 'Up to 6'], ['10', 'Up to 10'], ['20', 'More than 10']] }),
      Q('backline', 'Does the band need backline?', 'yesno', { help: 'Drums, amps and keys. Touring acts often bring none of it.' }),
      AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Mix', 'Front of house, monitors and enough inputs for the whole band'),
      S('event_equipment_rental', 'conditional', 'Supply', 'Stage, risers and backline — drums, amps and keys', { when: [some(ans('backline', 'yes'), WHEN_BOOTH[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Stage lighting that lets you see the players, not just the singer', { when: WHEN_LIGHTS }),
      S('live_entertainment', 'conditional', 'Book', 'A band that fits the room, the crowd and the hours', { when: WHEN_FIND_ACT }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service as you chose', { when: WHEN_BAR }),
      S('tent_furniture', 'conditional', 'House', 'A green room, and seating for a listening crowd', { when: [some(WHEN_RIDER[0], ans('band_size', '10', '20'))] }),
      S('security_services', 'conditional', 'Door', 'Door staff and crowd presence at the front', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Admit', 'Door list, tickets scanned and a queue that moves', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('photography', 'conditional', 'Shoot', 'The band playing, not the band posing', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets and the artwork', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food for the room and something for the band before they play', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Clean power for backline and an outdoor stage', { when: [some(WHEN_OPEN_AIR[0], ans('backline', 'yes'))] }),
      S('venue', 'conditional', 'Find', 'A room with a stage, power and a sound limit you can work with', { when: WHEN_FINDING }),
    ],
    addons: [
      X('line_check', 'Check', 'A proper line check with the full input list, before doors', 'schedule', { experience: true }),
      X('backline_hire', 'Supply', 'Drums, amps and keys hired to the band’s spec sheet', 'music', { trade: 'event_equipment_rental', when: [ans('backline', 'yes')] }),
      X('multitrack', 'Record', 'A multitrack recording of the set, for the band to use', 'film', { trade: 'sound_av' }),
      X('merch_table', 'Sell', 'A lit merchandise table the band can actually run', 'gift', { trade: 'event_equipment_rental' }),
    ],
    toolkit: { polls: ['date'], note: 'Get the band’s input list and backline needs in advance. Almost every bad gig is a sound check that did not happen.' },
    timeline: {
      before: ['Input list and backline spec received from the band', 'Sound check scheduled with real time, not fifteen minutes', 'Set times agreed against the venue’s closing hour'],
      during: ['Line check completed before doors open', 'Set times held', 'Merch table staffed through the set'],
      after: ['Load-out, with the backline accounted for', 'Recording handed to the band', 'Venue cleared'],
    },
    checklist: ['Input list received', 'Backline confirmed against the spec', 'Sound check time protected', 'Set times inside closing hour'],
  }),

  B('acoustic-music-night', 'Listen', 'A small room, two microphones and an audience that came to hear the words.', {
    about: 'The opposite of everything else in this category. The enemy here is noise — from the bar, from the kitchen, from the room. A small, well-placed system beats a big one every time.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, SOUND,
      Q('seated', 'Is the audience seated?', 'yesno'),
      Q('sets', 'How many acts or sets?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Three or four'], ['6', 'More than four']] }),
      PHOTOS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'A small, clean system — two vocal mics and a DI, placed well'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating facing the performer, close enough to hear', { when: [ans('seated', 'yes')] }),
      S('event_lighting', 'conditional', 'Warm', 'Warm, low lighting on the performer and not on the room', { when: WHEN_LIGHTS }),
      S('live_entertainment', 'conditional', 'Book', 'Acts suited to a listening room, not a loud one', { when: WHEN_FIND_ACT }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar that can be asked to stop pouring during a song', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food served between sets, not during them', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot', 'Quietly, without flash, from the side', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets and a printed running order', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Seat', 'A door list and someone seating people between songs, not during', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('event_equipment_rental', 'conditional', 'Set', 'A low riser, stools and a simple backdrop', { when: WHEN_BOOTH }),
      S('decoration_floral', 'optional', 'Soften', 'A set dressing that makes a hard room feel warmer'),
      S('venue', 'conditional', 'Find', 'A quiet room — the hardest to find and the only thing that matters', { when: WHEN_FINDING }),
    ],
    addons: [
      X('listening_policy', 'Hush', 'A stated listening-room policy, announced before the first song', 'schedule', { experience: true }),
      X('room_treatment', 'Deaden', 'Soft furnishing or drapes in a room that echoes', 'craft', { trade: 'decoration_floral' }),
      X('set_recording', 'Keep', 'A clean board recording for each act', 'film', { trade: 'sound_av' }),
      X('interval_service', 'Time it', 'Bar and kitchen service timed to the intervals', 'glass', { experience: true, when: WHEN_BAR }),
    ],
    toolkit: { polls: ['date'], note: 'Noise is the enemy here. Time the bar and the kitchen to the intervals and say so at the start.' },
    timeline: {
      before: ['Room checked for noise — kitchen, bar, street, air conditioning', 'Running order set with real intervals', 'Listening policy agreed with the venue'],
      during: ['Policy announced before the first song', 'Seating between songs, never during', 'Bar and kitchen service held to intervals'],
      after: ['Recordings sent to each act', 'Room reset', 'Settlement with the acts'],
    },
    checklist: ['Room checked for noise sources', 'Listening policy agreed with the venue', 'Running order with intervals', 'Small clean system, well placed'],
  }),

  B('karaoke-night', 'Sing', 'A screen, two microphones and a queue of people who need one drink first.', {
    about: 'Built entirely around the queue. A good karaoke night is a well-run list and a host who keeps it moving; the sound only has to be good enough that nobody is embarrassed.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, LATE,
      Q('system', 'The karaoke system', 'one', { options: [['hire', 'Please arrange one'], ['venue', 'The venue has one'], ['host', 'A host brings their own']] }),
      Q('host', 'Do you need a host to run the list?', 'yesno'),
      Q('languages', 'Which languages should the catalogue cover?', 'many', { optional: true, options: [['hindi', 'Hindi'], ['english', 'English'], ['kannada', 'Kannada'], ['tamil', 'Tamil'], ['telugu', 'Telugu'], ['other', 'Others']] }),
      PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('sound_av', 'conditional', 'Equip', 'Two wireless mics, a screen and a system with the right catalogue', { when: [some(ans('system', 'hire'), WHEN_PA[0])] }),
      S('anchor_mc', 'recommended', 'Run', 'A host who keeps the list moving and nobody waiting an hour', { unless: [ans('host', 'no')] }),
      S('event_lighting', 'conditional', 'Light', 'Enough light on the singer to feel like a stage, not a spotlight', { when: WHEN_LIGHTS }),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Bar snacks or counters for a long evening', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating facing the screen, with room to get to the mic', { when: WHEN_FINDING }),
      S('photography', 'conditional', 'Shoot', 'Candid — the point is the singer, not the staging', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Set', 'A small riser, a screen stand and a backdrop', { when: WHEN_BOOTH }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, a sign-up sheet and the song list', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'List', 'Door list, and someone managing the singing queue', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('venue', 'conditional', 'Find', 'A room where a bad singer will not clear the restaurant next door', { when: WHEN_FINDING }),
    ],
    addons: [
      X('song_catalogue', 'Stock', 'A catalogue that actually covers the languages in the room', 'media', { trade: 'sound_av', when: [has('languages')] }),
      X('queue_board', 'Order', 'A visible queue board, so nobody asks the host when their turn is', 'poll', { trade: 'invitation_printing' }),
      X('duet_slots', 'Pair', 'Duet slots in the running order, which fill the awkward gaps', 'music', { experience: true }),
      X('spare_mic', 'Insure', 'A third microphone and spare batteries, because one will fail', 'sound_av', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'The queue is the night. A visible list and a host who keeps it moving matters more than the sound system.' },
    timeline: {
      before: ['Catalogue checked for the languages people will actually want', 'Sign-up opened early, queue board prepared', 'Spare mic and batteries ready'],
      during: ['Queue visible and kept moving', 'Host filling the gaps between singers', 'Levels kept so the room is encouraging, not punishing'],
      after: ['Equipment returned', 'Photographs shared', 'Venue reset'],
    },
    checklist: ['Catalogue covers the right languages', 'Queue board and sign-up ready', 'Host briefed to keep the list moving', 'Spare mic available'],
  }),

  B('stand-up-comedy-show', 'Land it', 'A room that laughs together, which needs the seats close and the lights right.', {
    about: 'Comedy fails in a wide, bright, half-empty room. Tight seating, a dark house, a lit performer and no service noise — those four things do more than any production.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, SOUND,
      Q('lineup', 'How many comics?', 'select', { options: [['1', 'One, a full set'], ['3', 'Two or three'], ['5', 'A line-up of five'], ['8', 'More than five']] }),
      Q('recording', 'Is the set being recorded?', 'yesno', { optional: true, help: 'Comics own their material. Recording needs their permission, in writing.' }),
      Q('content_note', 'Is there an age or content advisory?', 'yesno', { optional: true }),
      PHOTOS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'One good vocal mic and a room where every seat hears the punchline'),
      S('event_lighting', 'recommended', 'Isolate', 'Light on the comic, darkness on the audience — this is the whole trick'),
      S('tent_furniture', 'recommended', 'Pack', 'Seating set tight and close; comedy dies in a spread-out room'),
      S('live_entertainment', 'conditional', 'Book', 'A line-up built with an opener, a middle and a closer', { when: WHEN_FIND_ACT }),
      S('event_equipment_rental', 'conditional', 'Set', 'A low riser, a stool, a mic stand and a backdrop', { when: WHEN_BOOTH }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar that closes during sets and opens between them', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Seat', 'Door list, and nobody seated mid-set', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets and the content advisory where there is one', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0], ans('content_note', 'yes'))] }),
      S('photography', 'conditional', 'Shoot', 'From the side, no flash, with the comics’ agreement', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Record', 'Only with each comic’s written permission for their own material', { when: [ans('recording', 'yes')] }),
      S('catering_food', 'conditional', 'Feed', 'Food before the show or after it, never during a set', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'A low, close room — a big room is the enemy of a small crowd', { when: WHEN_FINDING }),
    ],
    addons: [
      X('seating_tight', 'Close in', 'Seats set tight to the stage, with the back rows removed if needed', 'chair', { trade: 'tent_furniture' }),
      X('service_pause', 'Quieten', 'Bar and kitchen service paused during sets, agreed with the venue', 'glass', { experience: true, when: WHEN_BAR }),
      X('recording_consent', 'Agree', 'Written permission from each comic before anything is recorded', 'phone', { experience: true, when: [ans('recording', 'yes')] }),
      X('latecomer_policy', 'Hold', 'Latecomers held at the back until a break, not walked to the front', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Comics own their material. Nothing is filmed or photographed without their written agreement, whoever is paying for the room.' },
    timeline: {
      before: ['Room set tight, back rows removed if the crowd is small', 'Lighting set so the audience is dark and the comic is lit', 'Recording permissions obtained in writing where needed'],
      during: ['Bar and kitchen paused during sets', 'Latecomers held until a break', 'Running order kept — comics plan their set length'],
      after: ['Recordings given only to the comics who agreed', 'Settlement with the line-up', 'Room reset'],
    },
    checklist: ['Room set tight and close', 'Audience dark, comic lit', 'Service paused during sets', 'Recording permissions in writing'],
  }),

  B('open-mic-night', 'Try it', 'A list, five minutes each, and a room that claps for people who are not very good yet.', {
    about: 'The point is access, not polish. A fair list, a clock, and a host who protects the nervous ones. The sound just has to be reliable and fast to reset.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND,
      Q('kinds', 'What can people perform?', 'many', { options: [['music', 'Music'], ['comedy', 'Comedy'], ['poetry', 'Poetry and spoken word'], ['storytelling', 'Storytelling'], ['anything', 'Anything']] }),
      Q('slot_length', 'How long is each slot?', 'select', { options: [['3', 'Three minutes'], ['5', 'Five minutes'], ['8', 'Eight minutes'], ['10', 'Ten minutes']] }),
      Q('signup', 'How do people sign up?', 'one', { options: [['door', 'On the night, at the door'], ['advance', 'In advance'], ['both', 'Both'], ['draw', 'A draw on the night']] }),
      PHOTOS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Reset', 'A simple rig that resets in thirty seconds between acts'),
      S('anchor_mc', 'recommended', 'Protect', 'A host who runs the clock and looks after the nervous ones'),
      S('event_lighting', 'conditional', 'Light', 'One warm light on the performer, nothing complicated', { when: WHEN_LIGHTS }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating close in, and a spot for the next act to wait', { when: WHEN_FINDING }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar, quietly, between acts', { when: WHEN_BAR }),
      S('invitation_printing', 'conditional', 'List', 'Sign-up sheets, a running order board and posters', { when: [some(WHEN_PROMO[0], ans('signup', 'advance', 'both', 'draw'))] }),
      S('event_equipment_rental', 'conditional', 'Set', 'A riser, a stool, a stand and a simple backdrop', { when: WHEN_BOOTH }),
      S('photography', 'conditional', 'Shoot', 'Each performer, sent to them after — often their first photograph', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Snacks, between acts rather than during them', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Welcome', 'A door list and someone managing the performer list', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('venue', 'conditional', 'Find', 'A small, forgiving room — this is not a night for a big stage', { when: WHEN_FINDING }),
    ],
    addons: [
      X('visible_list', 'Publish', 'The running order visible, so nobody asks when their turn is', 'poll', { trade: 'invitation_printing' }),
      X('performer_photos', 'Send', 'A photograph sent to each performer afterwards', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('safe_space', 'Set the tone', 'A stated code — no heckling, nothing targeting anyone in the room', 'heart', { experience: true }),
      X('fast_changeover', 'Switch', 'Two mic stands, pre-set, so changeovers take seconds', 'sound_av', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date'], note: 'State the code at the start: no heckling, and nothing aimed at anyone in the room. An open mic without one stops being open.' },
    timeline: {
      before: ['Sign-up opened and the slot length published', 'Rig set so changeovers take seconds', 'Code of conduct agreed with the venue and the host'],
      during: ['Code stated at the start', 'Clock kept, fairly, for everyone including the regulars', 'Host covering every changeover'],
      after: ['Photographs sent to performers', 'Next date announced while the room is still there', 'Venue reset'],
    },
    checklist: ['Slot length published', 'Running order visible', 'Code of conduct stated', 'Fast changeover set up'],
  }),

  B('poetry-night', 'Speak', 'Words with nothing behind them, in a room quiet enough to carry.', {
    about: 'The quietest thing in this category and the most easily ruined. One good microphone, a listening room, and no service noise — that is the entire technical requirement.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND,
      Q('format', 'What kind of night?', 'one', { options: [['readings', 'Invited readings'], ['openmic', 'Open mic'], ['slam', 'A slam, with judging'], ['feature', 'A featured poet with support'], ['mixed', 'A mix']] }),
      Q('languages', 'Which languages?', 'many', { optional: true, options: [['english', 'English'], ['hindi', 'Hindi'], ['urdu', 'Urdu'], ['kannada', 'Kannada'], ['tamil', 'Tamil'], ['other', 'Others']] }),
      Q('books', 'Are books or zines being sold?', 'yesno', { optional: true }),
      PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'One microphone that reproduces a voice honestly, placed well'),
      S('tent_furniture', 'recommended', 'Gather', 'Seating close and facing in, which is most of the atmosphere'),
      S('event_lighting', 'conditional', 'Warm', 'A single warm light on the reader, and a dim room', { when: WHEN_LIGHTS }),
      S('anchor_mc', 'conditional', 'Hold', 'A host to introduce, keep time and run the scoring if it is a slam', { when: [ans('format', 'openmic', 'slam', 'mixed')] }),
      S('live_entertainment', 'conditional', 'Invite', 'A featured poet, and support readers around them', { when: [ans('format', 'feature', 'readings')] }),
      S('invitation_printing', 'conditional', 'Print', 'Posters, a running order, and scorecards if it is a slam', { when: [some(WHEN_PROMO[0], ans('format', 'slam'))] }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar held to the intervals', { when: WHEN_BAR }),
      S('event_equipment_rental', 'conditional', 'Set', 'A low riser, a stand and a bookstall table', { when: [some(WHEN_BOOTH[0], ans('books', 'yes'))] }),
      S('photography', 'conditional', 'Shoot', 'Without flash, from the side, between pieces', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Something simple, served between sets', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Receive', 'A door list, and seating between pieces not during them', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('venue', 'conditional', 'Find', 'A quiet room, away from a kitchen and away from a road', { when: WHEN_FINDING }),
    ],
    addons: [
      X('book_table', 'Sell', 'A table for books and zines, staffed through the interval', 'album', { trade: 'event_equipment_rental', when: [ans('books', 'yes')] }),
      X('slam_scoring', 'Score', 'Scorecards, judges from the audience, and a published method', 'poll', { trade: 'invitation_printing', when: [ans('format', 'slam')] }),
      X('translation_note', 'Carry across', 'A printed translation or summary where a piece is not in the room’s language', 'invite', { trade: 'invitation_printing', when: [has('languages')] }),
      X('silence_policy', 'Still the room', 'Service paused during pieces, stated before the first reader', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Silence is the production value. Pause the bar and the kitchen during pieces and say so at the start.' },
    timeline: {
      before: ['Room checked for noise before anything else is booked', 'Running order set, with real intervals', 'Service pause agreed with the venue'],
      during: ['Policy stated before the first reader', 'Seating only between pieces', 'Time kept gently but kept'],
      after: ['Recordings or photographs sent to the readers', 'Book sales settled', 'Room reset'],
    },
    checklist: ['Quiet room confirmed', 'Service pause agreed', 'Running order with intervals', 'One good microphone, well placed'],
  }),

  B('dance-performance', 'Move', 'A sprung floor, a light plot and a company that has rehearsed in a different room.', {
    about: 'The only occasion here where the floor itself is a safety item. Dancers need a surface, wings to exit into, and a technical rehearsal in the actual space before anyone performs on it.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, SOUND,
      Q('style', 'What style?', 'one', { options: [['classical', 'Classical'], ['folk', 'Folk'], ['contemporary', 'Contemporary'], ['street', 'Street and hip-hop'], ['ballet', 'Ballet'], ['mixed', 'A mixed programme']] }),
      Q('floor', 'Does the floor need covering or a dance surface?', 'yesno', { help: 'A hard or uneven floor is an injury. This is a safety question, not a comfort one.' }),
      Q('dressing', 'How many dressing rooms?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'More than four']] }),
      Q('livemusic', 'Is there live accompaniment?', 'yesno', { optional: true }),
      AID, PHOTOS, DRINKS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Lay', 'A dance surface, a stage with wings, and the dressing rooms'),
      S('event_lighting', 'recommended', 'Plot', 'A light plot written to the piece, not a general wash'),
      S('sound_av', 'recommended', 'Cue', 'Playback, monitors and cues that land exactly on the count'),
      S('live_entertainment', 'conditional', 'Programme', 'A company or dancers for the style and the length you want', { when: WHEN_FIND_ACT }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Makeup and hair in the dressing rooms, to the piece’s look', { when: [ans('style', 'classical', 'folk', 'ballet', 'mixed')] }),
      S('tent_furniture', 'conditional', 'House', 'Dressing rooms with mirrors, rails and seating, and house seating', { when: [ans('dressing', '2', '4', '6')] }),
      S('photography', 'conditional', 'Freeze', 'Shot at the top of the jump, which takes a rehearsal to learn', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The programme filmed from a fixed front position', { when: [ans('photos', 'yes')] }),
      S('invitation_printing', 'conditional', 'Programme', 'Tickets, posters and a printed programme with every name', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Seat', 'Front of house, with nobody seated mid-piece', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('safety_facilities', 'conditional', 'Clear', 'Washrooms, first aid for strains, and the floor cleared after', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food for the company, who will be there from the morning', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar in the interval, not during the performance', { when: WHEN_BAR }),
      S('venue', 'conditional', 'Find', 'A stage with depth, wings and a floor that can be covered', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dance_floor_lay', 'Protect', 'A proper sprung or laid surface, which prevents the injuries', 'game', { trade: 'event_equipment_rental', when: [ans('floor', 'yes')] }),
      X('tech_rehearsal', 'Rehearse', 'A full technical rehearsal in the actual space, with lights', 'schedule', { experience: true }),
      X('live_accompaniment', 'Accompany', 'Live musicians, mic’d and cued with the choreography', 'music', { trade: 'sound_av', when: [ans('livemusic', 'yes')] }),
      X('programme_credits', 'Credit', 'A printed programme naming every dancer and the choreographer', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'The floor is a safety item. We will keep a dance surface on the plan for a hard or uneven stage even if everything else comes off.' },
    timeline: {
      before: ['Floor inspected and a surface arranged if it is hard or uneven', 'Light plot written to the piece and rigged', 'Full technical rehearsal in the actual space'],
      during: ['Dressing rooms ready from the company’s call time', 'Cues to the plot, nobody seated mid-piece', 'Interval service, not during'],
      after: ['Floor lifted and the stage cleared', 'Film and photographs sent to the company', 'Venue restored'],
    },
    checklist: ['Floor inspected and covered if needed', 'Light plot rigged to the piece', 'Technical rehearsal in the space', 'Dressing rooms ready at call time'],
  }),

  B('celebrity-appearance', 'Draw', 'One person in the building, and everything arranged around getting them in and out.', {
    about: 'The guest is the event and the crowd is the risk. Arrival route, a secured green room, a managed interaction and a clean exit — in that order, before anything about the stage.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, SOUND, GUARD, BARRIER, AID,
      Q('interaction', 'What is the guest doing?', 'many', { options: [['stage', 'Appearing on stage'], ['interview', 'An interview'], ['meet', 'A meet and greet'], ['photos', 'Photographs with guests'], ['launch', 'Launching something'], ['press', 'Press interaction']] }),
      Q('contract', 'Are the guest’s requirements confirmed in writing?', 'one', { options: [['yes', 'Yes, we have the rider and contract'], ['partly', 'Partly'], ['no', 'Not yet']] }),
      PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('security_services', 'recommended', 'Shield', 'Personal and crowd security, an arrival route and a clean exit'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, barricades, a managed interaction line and the backdrop'),
      S('sound_av', 'conditional', 'Carry', 'Sound for the stage and clean audio for the interview', { when: WHEN_PA }),
      S('tent_furniture', 'recommended', 'House', 'A private green room, set to the rider, that nobody else enters'),
      S('event_lighting', 'conditional', 'Light', 'Light on the guest built for the cameras in the room', { when: WHEN_LIGHTS }),
      S('photography', 'conditional', 'Capture', 'An official photographer, so there is one controlled set of images', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Manage', 'A managed queue for the meet and greet, with a counted limit', { when: [some(ans('interaction', 'meet', 'photos'), WHEN_LISTED[0])] }),
      S('videography', 'conditional', 'Film', 'The appearance filmed, under whatever the contract permits', { when: [ans('photos', 'yes')] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid at the barrier, which is where a crowd surge happens', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Passes, wristbands, the queue system and the backdrop branding', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('passenger_transport', 'recommended', 'Convey', 'A car, a driver and a route planned to the back entrance'),
      S('catering_food', 'conditional', 'Provide', 'Green-room catering exactly as the rider specifies', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'Somewhere with a private entrance, which is the real requirement', { when: WHEN_FINDING }),
    ],
    addons: [
      X('arrival_route', 'Route', 'A private arrival and exit route, walked before the day', 'map', { experience: true }),
      X('meet_queue', 'Limit', 'A counted, timed meet-and-greet queue with a hard stop', 'group', { trade: 'guest_services', when: [ans('interaction', 'meet', 'photos')] }),
      X('contract_check', 'Confirm', 'Rider and contract read against what is actually booked', 'schedule', { experience: true, when: [ans('contract', 'yes', 'partly')] }),
      X('media_slots', 'Allocate', 'Press interviews in booked slots, never a scrum', 'phone', { trade: 'guest_services', when: [ans('interaction', 'press', 'interview')] }),
    ],
    toolkit: { polls: false, note: 'Crowd control around a well-known guest is a safety matter, not a luxury. We will keep security and the barrier on the plan.' },
    timeline: {
      before: ['Rider and contract read against the booking', 'Arrival and exit routes walked, and the green room secured', 'Meet-and-greet numbers capped and the queue designed'],
      during: ['Guest in through the private route, straight to the green room', 'Interaction to the agreed limit and the agreed time', 'Exit before the crowd disperses, not after'],
      after: ['Official images released; nothing else', 'Green room cleared', 'Thanks and settlement through the agency'],
    },
    checklist: ['Rider and contract confirmed', 'Private arrival and exit route', 'Meet-and-greet capped and queued', 'First aid at the barrier'],
  }),

  B('pub-party', 'Unwind', 'A booked-out pub, your people, and nothing that needs a production crew.', {
    about: 'The least produced thing in this category and deliberately so. The pub already has the bar, the sound and the staff; what it needs is a booking, a tab policy and someone running the music.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, LATE,
      Q('occasion_for', 'What is it for?', 'one', { options: [['friends', 'A group of friends'], ['work', 'A work night'], ['birthday', 'A birthday'], ['farewell', 'A farewell'], ['watch', 'A match screening'], ['other', 'Something else']] }),
      Q('exclusive', 'Is the venue booked exclusively?', 'yesno'),
      Q('tab', 'How are drinks being paid for?', 'one', { optional: true, options: [['tab', 'An open tab'], ['limit', 'A tab up to a limit'], ['own', 'Everyone pays their own'], ['venue', 'A package with the venue']] }),
      PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('venue', 'conditional', 'Book', 'A pub that will take the group, exclusively if you need it', { when: WHEN_FINDING }),
      S('dj_music', 'conditional', 'Play', 'A DJ, where the pub’s playlist will not do the job', { when: WHEN_BOOTH }),
      S('catering_food', 'conditional', 'Feed', 'Bar food or counters for the group', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks arrangement, as you agreed it with the venue', { when: WHEN_BAR }),
      S('decoration_floral', 'conditional', 'Mark', 'Enough dressing to make it feel booked for you', { when: [ans('occasion_for', 'birthday', 'farewell')] }),
      S('sound_av', 'conditional', 'Boost', 'Sound or a screen where the pub’s own will not carry', { when: [some(WHEN_PA[0], ans('occasion_for', 'watch'))] }),
      S('photography', 'conditional', 'Shoot', 'Candid, for a couple of hours, not all night', { when: WHEN_SHOT }),
      S('cake_desserts', 'conditional', 'Mark it', 'A cake, if there is something to mark', { when: [ans('occasion_for', 'birthday', 'farewell')] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations and a simple guest list', { when: [some(WHEN_LISTED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Door', 'Someone on the list at the door for an exclusive booking', { when: [ans('exclusive', 'yes')] }),
      S('passenger_transport', 'optional', 'Home', 'Transport home arranged in advance, where there is a bar'),
      S('event_lighting', 'conditional', 'Warm', 'A little lighting, if the pub is lit like a canteen', { when: WHEN_LIGHTS }),
    ],
    addons: [
      X('tab_rules', 'Agree', 'The tab, the limit and who settles it, written down beforehand', 'budget', { experience: true, when: [has('tab')] }),
      X('exclusive_booking', 'Reserve', 'The whole venue held, confirmed in writing with a closing time', 'venue', { trade: 'venue', when: [ans('exclusive', 'yes')] }),
      X('playlist_poll', 'Choose', 'A playlist built from what the group actually voted for', 'poll', { experience: true }),
      X('rides_home', 'Get home', 'Cabs booked for the end of the night, before it starts', 'bus', { trade: 'passenger_transport' }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Agree the tab and who settles it before the night. That one conversation prevents the argument at closing.' },
    timeline: {
      before: ['Booking confirmed in writing, with the closing time and the tab terms', 'Numbers confirmed so the venue staffs correctly', 'Transport home planned'],
      during: ['List at the door for an exclusive booking', 'Tab watched against the agreed limit', 'Everyone accounted for at the end'],
      after: ['Tab settled on the night', 'Photographs shared', 'Venue thanked, for next time'],
    },
    checklist: ['Booking and closing time in writing', 'Tab terms agreed', 'Numbers confirmed to the venue', 'Transport home arranged'],
  }),

  B('brewery-event', 'Taste', 'A working brewery, a product that is the point, and a crowd walking around tanks.', {
    about: 'The venue is a production facility, which changes everything: routes, footwear, safety around equipment, and a tasting that is the programme rather than the bar.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, LATE, GUARD,
      Q('programme', 'What is on?', 'many', { options: [['tasting', 'A guided tasting'], ['tour', 'A brewery tour'], ['launch', 'A new release'], ['music', 'Live music or a DJ'], ['food', 'Food pairing'], ['masterclass', 'A masterclass']] }),
      Q('safety_zones', 'Are guests going near production equipment?', 'yesno', { help: 'A working floor needs routes, barriers and a briefing. We plan for it.' }),
      AGE_DOOR, AID, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('safety_facilities', 'conditional', 'Guard', 'Routes, barriers and marshals around working equipment', { when: [some(ans('safety_zones', 'yes'), WHEN_AID[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A tasting and drinks service, staffed and measured', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Pair', 'Food built to pair with what is being poured', { when: [some(ans('programme', 'food'), WHEN_FOOD[0])] }),
      S('guest_services', 'conditional', 'Guide', 'Tour groups kept to size, with a guide per group', { when: [ans('programme', 'tour', 'masterclass')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound for the tour guide and for music, in a hard, echoing space', { when: [some(WHEN_PA[0], ans('programme', 'music', 'tasting'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting that makes a production space look intentional', { when: WHEN_LIGHTS }),
      S('live_entertainment', 'conditional', 'Play', 'A band or DJ at a level a tasting can talk over', { when: [ans('programme', 'music')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Standing tables and seating, kept clear of the working floor', { when: WHEN_FINDING }),
      S('security_services', 'conditional', 'Door', 'Door staff, age checking and watch on the restricted areas', { when: [some(WHEN_GUARD[0], ans('age_door', 'adults', 'legal'))] }),
      S('photography', 'conditional', 'Shoot', 'The tanks, the pour and the room — a brewery photographs well', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Tickets, tasting notes, signage and route markings', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0], ans('programme', 'tasting'))] }),
      S('venue', 'conditional', 'Find', 'A brewery that can take a crowd without stopping production', { when: WHEN_FINDING }),
    ],
    addons: [
      X('tasting_notes', 'Explain', 'Printed tasting notes for each pour, which is most of the experience', 'invite', { trade: 'invitation_printing', when: [ans('programme', 'tasting')] }),
      X('safety_briefing', 'Brief', 'A short safety briefing and marked routes before anyone walks the floor', 'map', { experience: true, when: [ans('safety_zones', 'yes')] }),
      X('tour_groups', 'Split', 'Small tour groups on a timed rotation, not one long line', 'group', { trade: 'guest_services', when: [ans('programme', 'tour')] }),
      X('measured_pours', 'Pace', 'Measured tasting pours and water between them', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
    ],
    toolkit: { polls: ['date'], note: 'A brewery is a working facility. Routes, barriers and a safety briefing come before the programme, and the legal drinking age applies at the door.' },
    timeline: {
      before: ['Walk the floor and mark guest routes away from equipment', 'Age-check policy agreed at the door', 'Tasting notes and pour sizes agreed with the brewer'],
      during: ['Safety briefing before anyone walks the production floor', 'Tours in timed small groups', 'Measured pours, water between, nobody over-served'],
      after: ['Floor returned to production condition', 'Photographs shared', 'Settlement and feedback with the brewery'],
    },
    checklist: ['Guest routes marked away from equipment', 'Safety briefing planned', 'Age checking at the door', 'Measured pours agreed'],
  }),

  B('rooftop-party', 'Elevate', 'A view, a low ceiling of sky, and a sound limit the neighbours will enforce.', {
    about: 'Rooftops have two constraints nothing else here has: weather with no fallback, and neighbours at ear level. Both have to be answered before the first booking.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, LATE, SOUND, GUARD,
      Q('weather_plan', 'What happens if it rains?', 'one', { options: [['cover', 'Please arrange cover'], ['indoor', 'We move indoors'], ['postpone', 'We postpone'], ['risk', 'We take the chance']] }),
      Q('capacity_known', 'Is the roof’s safe capacity confirmed?', 'one', { optional: true, options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']] }),
      DRESS_CODE, AID, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Set', 'Warm lighting and festoon — a rooftop is lit from below, not above'),
      S('sound_av', 'conditional', 'Contain', 'A system aimed inward and set to a level the neighbours allow', { when: WHEN_PA }),
      S('tent_furniture', 'recommended', 'Furnish', 'Lounge seating, standing tables and shade or cover'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose, positioned away from the edge', { when: WHEN_BAR }),
      S('dj_music', 'conditional', 'Play', 'A DJ who can work at a restrained volume', { when: WHEN_BOOTH }),
      S('catering_food', 'conditional', 'Feed', 'Counters and canapés, with a route the staff can actually use', { when: WHEN_FOOD }),
      S('decoration_floral', 'recommended', 'Dress', 'Set dressing that will not become a hazard in wind'),
      S('security_services', 'conditional', 'Watch', 'Door staff, a counted capacity and watch on the edges', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Secure', 'First aid, and edges, stairs and exits checked before doors', { when: [some(WHEN_AID[0], ans('capacity_known', 'no', 'help'))] }),
      S('photography', 'conditional', 'Shoot', 'At golden hour, which is the only reason a rooftop was chosen', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power', 'Power routed safely up, and fans for a hot evening', { when: WHEN_OPEN_AIR }),
      S('guest_services', 'conditional', 'Admit', 'A door list and a counted headcount on a limited roof', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('venue', 'conditional', 'Find', 'A roof with a confirmed capacity, a lift and a second exit', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rain_cover', 'Cover', 'Cover that can go up in twenty minutes, held on standby', 'tent', { trade: 'tent_furniture', when: [ans('weather_plan', 'cover')] }),
      X('sound_limit', 'Restrain', 'Levels agreed with the building and held, with a limiter if needed', 'schedule', { experience: true }),
      X('wind_check', 'Secure', 'Everything light weighted or removed, checked before doors', 'map', { experience: true }),
      X('golden_hour', 'Time it', 'Doors timed so arrivals land in the best light', 'camera', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'A rooftop has a capacity, a weather risk and neighbours. All three are the organiser’s, and we keep them on the plan.' },
    timeline: {
      before: ['Roof capacity and second exit confirmed in writing', 'Weather fallback decided, with a go or no-go time', 'Sound level agreed with the building management'],
      during: ['Headcount at the door against the roof’s capacity', 'Anything light weighted or removed as wind picks up', 'Levels held, especially after dark'],
      after: ['Everything cleared off the roof the same night', 'Neighbours thanked if it ran late', 'Venue settled'],
    },
    checklist: ['Roof capacity confirmed', 'Weather fallback with a decision time', 'Sound level agreed with the building', 'Loose items weighted or removed'],
  }),

  B('pool-party', 'Dive', 'Water, a crowd and alcohol — three things that need a trained person watching.', {
    about: 'The one occasion in the catalogue where somebody can drown. A lifeguard is not a production line item; it is the reason this is safe to run at all, and it stays on the plan.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, LATE, GUARD,
      Q('pool_use', 'Is the pool actually in use?', 'yesno'),
      Q('lifeguard', 'Is there a trained lifeguard on duty?', 'one', {
        when: [ans('pool_use', 'yes')],
        options: [['venue', 'The venue provides one'], ['arrange', 'Please arrange one'], ['no', 'No lifeguard']],
        help: 'A pool in use, with a crowd and a bar, needs someone trained and watching. We will say so if this is left off.',
      }),
      Q('facilities', 'What do guests need?', 'many', { optional: true, options: [['changing', 'Changing rooms'], ['towels', 'Towels'], ['lockers', 'Lockers'], ['shade', 'Shade'], ['loungers', 'Loungers']] }),
      AGE_DOOR, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Watch', 'Lifeguard cover, first aid, and the poolside kept clear and clean'),
      S('tent_furniture', 'recommended', 'Furnish', 'Loungers, shade, changing areas and somewhere dry to sit'),
      S('bar_beverages', 'conditional', 'Serve', 'Drinks in unbreakable glassware — never glass near a pool', { when: WHEN_BAR }),
      S('sound_av', 'conditional', 'Project', 'Sound placed away from the water and the neighbours', { when: WHEN_PA }),
      S('dj_music', 'conditional', 'Play', 'A DJ for a daytime crowd, which is a different set entirely', { when: WHEN_BOOTH }),
      S('catering_food', 'conditional', 'Feed', 'Food away from the water, on a surface that will not get wet', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress', 'Poolside dressing that is safe when wet and will not blow in', { when: WHEN_PROMO }),
      S('security_services', 'conditional', 'Control', 'Door staff, a counted capacity and watch on the water', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], ans('age_door', 'adults', 'legal'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting for an evening, including light on the water’s edge', { when: WHEN_LIGHTS }),
      S('photography', 'conditional', 'Shoot', 'With a stated rule about photographing people in swimwear', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Admit', 'A door list, wristbands and a counted headcount', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power routed and protected properly around water', { when: WHEN_OPEN_AIR }),
      S('venue', 'conditional', 'Find', 'A pool venue with changing rooms and a stated safe capacity', { when: WHEN_FINDING }),
    ],
    addons: [
      X('lifeguard_cover', 'Supervise', 'A trained lifeguard on duty for every hour the pool is open', 'spa', { trade: 'safety_facilities', when: [ans('lifeguard', 'arrange')] }),
      X('no_glass', 'Switch', 'All glassware replaced with unbreakable, poolside', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
      X('changing_towels', 'Provide', 'Changing rooms, lockers and towels, staffed', 'bed', { trade: 'tent_furniture', when: [has('facilities')] }),
      X('photo_rule', 'Respect', 'A stated rule on photographing guests in swimwear, enforced', 'camera', { experience: true, unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'A pool in use with a bar needs a trained lifeguard and no glass. We will keep both on the plan and say so if they come off.' },
    timeline: {
      before: ['Lifeguard cover confirmed for every hour the pool is open', 'All glassware replaced with unbreakable', 'Photography rule agreed and put on the invitation'],
      during: ['Lifeguard on duty and visible, not on call', 'Nobody over-served near the water', 'Capacity counted at the door'],
      after: ['Poolside cleared, nothing left in or near the water', 'Lost property collected', 'Venue settled'],
    },
    checklist: ['Lifeguard confirmed for all open hours', 'No glass anywhere poolside', 'Changing and towel facilities', 'Photography rule stated'],
  }),

  B('lounge-night', 'Ease', 'Low light, low volume, and a room designed for conversation that lasts.', {
    about: 'The opposite of a club night in every variable: the music sits under the talking, the seating encourages staying, and the success measure is how long people stayed rather than how full the floor got.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, LATE,
      Q('music_style', 'What is playing?', 'one', { options: [['lounge', 'A lounge DJ'], ['live', 'A live duo or trio'], ['playlist', 'A curated playlist'], ['jazz', 'Jazz'], ['none', 'No music']] }),
      Q('seating_style', 'How is it seated?', 'one', { options: [['lounge', 'Lounge seating'], ['tables', 'Tables'], ['mixed', 'A mix'], ['standing', 'Mostly standing']] }),
      DRESS_CODE, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Lower', 'Low, warm, layered light — the single biggest thing in this room'),
      S('tent_furniture', 'recommended', 'Settle', 'Lounge seating in groups, so people sit down and stay'),
      S('sound_av', 'conditional', 'Underlay', 'Distributed sound at conversation level, not a dance floor rig', { when: WHEN_PA }),
      S('dj_music', 'conditional', 'Curate', 'A lounge DJ who understands playing under a room', { when: [ans('music_style', 'lounge', 'playlist')] }),
      S('live_entertainment', 'conditional', 'Play', 'A duo or trio, at a volume you can talk across', { when: [ans('music_style', 'live', 'jazz')] }),
      S('bar_beverages', 'conditional', 'Serve', 'A considered drinks list, served to the table', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Small plates and sharing food, through the evening', { when: WHEN_FOOD }),
      S('decoration_floral', 'recommended', 'Soften', 'Textures, greenery and table dressing — not a backdrop'),
      S('photography', 'conditional', 'Shoot', 'Discreetly, in low light, without breaking the atmosphere', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Receive', 'A door list and someone seating people properly', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, menus and table cards', { when: [some(WHEN_PROMO[0], WHEN_TICKETED[0])] }),
      S('venue', 'conditional', 'Find', 'A room that is already warm, low and quiet', { when: WHEN_FINDING }),
    ],
    addons: [
      X('seating_groups', 'Cluster', 'Seating in groups of four to six, which is where conversation happens', 'chair', { trade: 'tent_furniture' }),
      X('drinks_list', 'Curate', 'A short, considered drinks list instead of a full bar menu', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
      X('volume_discipline', 'Hold', 'An agreed maximum volume, checked through the evening', 'schedule', { experience: true }),
      X('table_service', 'Attend', 'Service to the table, so nobody has to leave their seat', 'guest_services', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'If the music goes above conversation level, the room empties early. Agree a maximum volume and hold it.' },
    timeline: {
      before: ['Lighting designed low and warm, tested after dark', 'Seating laid out in groups, not rows', 'Maximum volume agreed with whoever is playing'],
      during: ['Levels checked through the evening', 'Table service so nobody queues', 'Nothing announced from a microphone'],
      after: ['Room reset', 'Feedback on how long people stayed', 'Settlement'],
    },
    checklist: ['Low warm lighting tested after dark', 'Seating in groups', 'Maximum volume agreed', 'Table service arranged'],
  }),

  B('nightclub-theme-party', 'Transform', 'A room people already know, made unrecognisable for one night.', {
    about: 'The theme is the entire product. If it only exists on the poster and the backdrop, the night is a normal club night with a confusing name — so the plan puts the theme into the room, the staff and the drinks.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, LATE, SOUND, GUARD, AGE_DOOR,
      THEME('What is the theme?', [['decade', 'A decade'], ['neon', 'Neon or glow'], ['masquerade', 'Masquerade'], ['halloween', 'Halloween'], ['tropical', 'Tropical'], ['other', 'Something else']]),
      DRESS_CODE, AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Transform', 'The theme built into the whole room, not onto one wall'),
      S('event_lighting', 'recommended', 'Recolour', 'Lighting in the theme’s palette, which does half the work'),
      S('dj_music', 'conditional', 'Match', 'A DJ briefed to play to the theme, not around it', { when: WHEN_BOOTH }),
      S('sound_av', 'conditional', 'Drive', 'A floor system and visuals cut to the theme', { when: WHEN_PA }),
      S('event_equipment_rental', 'conditional', 'Build', 'Set pieces, a photo set, props and the booth', { when: WHEN_BOOTH }),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service, with the list themed as far as it honestly can be', { when: WHEN_BAR }),
      S('security_services', 'conditional', 'Door', 'Door staff, dress-code enforcement and age checking', { when: [some(WHEN_GUARD[0], ans('age_door', 'adults', 'legal'))] }),
      S('photography', 'conditional', 'Shoot', 'A roaming photographer and a set — people dressed up want proof', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Admit', 'Door list, wristbands and a queue that moves', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Artwork, tickets, wristbands and the dress-code notice', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Bar snacks or counters for a long night', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('venue', 'conditional', 'Find', 'A room that will let you change it and change it back', { when: WHEN_FINDING }),
    ],
    addons: [
      X('prop_hire', 'Equip', 'Props and costume pieces at the door, for people who did not dress up', 'dress', { trade: 'decoration_floral' }),
      X('photo_set', 'Pose', 'A built, lit photo set in the theme, staffed all night', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('staff_styling', 'Commit', 'The venue’s own staff styled to the theme, which sells it instantly', 'spa', { experience: true }),
      X('themed_drinks', 'Name', 'Two or three drinks named and presented for the theme', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'A theme that exists only on the poster is not a theme. Put it in the room, the staff and the drinks or drop it.' },
    timeline: {
      before: ['Theme designed into the room, the staff and the drinks list', 'Dress code published early enough for people to plan', 'Load-in time agreed — transformation takes longer than anyone allows'],
      during: ['Door enforcing the dress code as announced, with props for those without', 'Photo set staffed all night', 'Levels and closing time held'],
      after: ['Room returned to its normal state the same night', 'Photographs out the next morning, while people care', 'Settlement'],
    },
    checklist: ['Theme in the room, staff and drinks', 'Dress code published early', 'Load-in time agreed', 'Photo set built and staffed'],
  }),

  B('silent-disco', 'Headphones', 'Three channels, a field of people dancing, and a street that hears nothing.', {
    about: 'The one format that solves the curfew rather than fighting it. Everything hinges on the headphone count, the charging and the collection — lose fifty sets and the night costs more than it made.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, LATE,
      Q('channels', 'How many channels?', 'select', { options: [['2', 'Two'], ['3', 'Three'], ['4', 'Four or more']] }),
      Q('headsets', 'Headphones', 'one', { options: [['hire', 'Please arrange them'], ['have', 'We have them'], ['venue', 'The venue provides them']] }),
      Q('deposit', 'Is there a deposit or ID held against headsets?', 'yesno', { optional: true }),
      GUARD, AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Transmit', 'Transmitters per channel, and headsets counted in and out'),
      S('dj_music', 'recommended', 'Split', 'A DJ per channel, which is the whole point of the format'),
      S('event_lighting', 'recommended', 'Light', 'Lighting that shows which channel the crowd is on'),
      S('guest_services', 'recommended', 'Issue', 'Headset issue and return desks, with a count that reconciles'),
      S('event_equipment_rental', 'conditional', 'Build', 'Booths per channel, a dance area and the issue desks', { when: [ans('channels', '3', '4')] }),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('security_services', 'conditional', 'Watch', 'Door staff, and watch on the headsets, which walk', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Tickets, wristbands, deposit slips and channel signage', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'A silent crowd dancing photographs better than it sounds', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Counters, placed away from the issue desks', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for transmitters and a charging area for the headsets', { when: [some(WHEN_OPEN_AIR[0], ans('headsets', 'hire'))] }),
      S('safety_facilities', 'conditional', 'Clear', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('venue', 'conditional', 'Find', 'A space that works precisely because the sound stays in the headsets', { when: WHEN_FINDING }),
    ],
    addons: [
      X('headset_count', 'Reconcile', 'Headsets counted out and back against a deposit or ID list', 'poll', { trade: 'guest_services', when: [ans('deposit', 'yes')] }),
      X('charging_station', 'Charge', 'A charging area so every headset is full before doors', 'power_cooling', { trade: 'power_cooling', when: [ans('headsets', 'hire')] }),
      X('channel_signage', 'Signal', 'Clear channel colours and signage, so the crowd can switch', 'invite', { trade: 'invitation_printing' }),
      X('late_licence', 'Run on', 'A later finish, because the sound does not leave the headsets', 'schedule', { experience: true, when: WHEN_LATE }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Count the headsets out and back. Reconciliation is the difference between this format being cheap and being expensive.' },
    timeline: {
      before: ['Headset count confirmed against expected numbers, with spares', 'All sets charged and tested before doors', 'Deposit or ID policy agreed and signposted'],
      during: ['Issue desk staffed, count recorded as sets go out', 'Channels signposted and lit', 'Return desk open well before the end, not at it'],
      after: ['Headsets counted back and reconciled the same night', 'Charging and packing completed', 'Deposits returned'],
    },
    checklist: ['Headset count with spares', 'All sets charged before doors', 'Deposit policy signposted', 'Return desk open before the end'],
  }),

  B('music-festival', 'Programme', 'Several stages, a whole day, and a line-up that has to work as one thing.', {
    about: 'Wider than an EDM festival and usually gentler, but the same operational truths apply: capacity, exits, water, medical and a sound plan. The difference is the programming — multiple genres, multiple audiences, one ground.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, BARRIER, AID,
      Q('stages', 'How many stages?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Four or more']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three or more']] }),
      PHOTOS, FOOD,
    ],
    plan: [
      S('sound_av', 'recommended', 'Cover', 'A system per stage, specified so neighbouring stages do not bleed'),
      S('event_equipment_rental', 'recommended', 'Construct', 'Stages, barriers, towers, backstage and the whole ground build'),
      S('event_lighting', 'recommended', 'Rig', 'Lighting per stage and enough light to walk the ground safely'),
      S('safety_facilities', 'recommended', 'Safeguard', 'Medical posts, washrooms, water points and the daily clear-up'),
      S('security_services', 'conditional', 'Marshal', 'Gates, pits and ground security against a counted capacity', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_BARRIER[0])] }),
      S('power_cooling', 'recommended', 'Supply', 'Generators per stage with redundancy, distributed across the ground'),
      S('live_entertainment', 'conditional', 'Curate', 'A line-up programmed so the stages complement rather than clash', { when: WHEN_FIND_ACT }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls spread so no queue blocks a route', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Serve', 'Drinks, and free water regardless of what else is poured', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Admit', 'Gates, scanning, wristbanding and an accurate headcount', { when: [some(WHEN_TICKETED[0], WHEN_BIG[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across stages and days', { when: [some(ans('stages', '2', '3', '5'), ans('days', '2', '3'))] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, wristbands, ground maps, stage times and signage', { when: WHEN_TICKETED }),
      S('photography', 'conditional', 'Cover', 'Every stage across every day, not just the headline', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'House', 'Green rooms, crew areas, shade and seating', { when: WHEN_BIG }),
      S('venue', 'conditional', 'Secure', 'A ground that can be fenced, exited, powered and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('stage_times', 'Programme', 'Stage times set so the clashes are deliberate, not accidental', 'schedule', { experience: true }),
      X('water_points', 'Hydrate', 'Free drinking water across the ground, which is a safety item', 'glass', { trade: 'safety_facilities' }),
      X('ground_map', 'Orient', 'A printed and digital map with stages, water, medical and exits', 'map', { trade: 'invitation_printing' }),
      X('accessibility', 'Include', 'An accessible viewing platform and a step-free route to it', 'spa', { trade: 'event_equipment_rental', when: [from(2000)] }),
    ],
    toolkit: { polls: ['date'], note: 'Capacity, exits, medical and permissions are the promoter’s and stay on the plan. We never suggest pyrotechnics or flame effects.' },
    timeline: {
      before: ['Permissions and capacity confirmed before tickets go on sale', 'Ground plan drawn with stages, exits, water, medical and routes', 'Stage times programmed so clashes are chosen, not discovered'],
      during: ['Headcount at the gates, never over capacity', 'Medical and water visible and maintained', 'Stage times held so the last set finishes inside the hours'],
      after: ['Load-out and ground clearance to a schedule', 'Incident log reviewed', 'Ground reinstated'],
    },
    checklist: ['Permissions and capacity in writing', 'Ground plan with exits and medical', 'Water points maintained', 'Stage times inside permitted hours'],
  }),
  B('battle-of-the-bands', 'Contest', 'Eight bands, one backline, and a changeover clock that decides the night.', {
    about: 'A shared backline and a ten-minute changeover are the whole operational problem. Get those right and the judging is easy; get them wrong and the last band plays to an empty room at midnight.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, LATE, SOUND, GUARD,
      Q('bands', 'How many bands?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['15', 'Up to 15'], ['25', 'More than 15']] }),
      Q('set_time', 'How long does each band play?', 'select', { options: [['15', 'Fifteen minutes'], ['20', 'Twenty minutes'], ['30', 'Thirty minutes'], ['45', 'Forty-five minutes']] }),
      Q('judging', 'How is the winner decided?', 'one', { options: [['judges', 'A judging panel'], ['audience', 'Audience vote'], ['both', 'Both'], ['none', 'No winner']] }),
      Q('backline', 'Is there a shared backline?', 'yesno', { help: 'A shared kit is the only way eight bands fit in one evening.' }),
      AID, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('sound_av', 'recommended', 'Switch', 'A desk and an engineer who can reset eight bands without losing time'),
      S('event_equipment_rental', 'conditional', 'Share', 'A shared backline — kit, amps and keys — plus the stage and risers', { when: [some(ans('backline', 'yes'), WHEN_BOOTH[0])] }),
      S('event_lighting', 'conditional', 'Light', 'A simple rig that works for every band without a reprogramme', { when: WHEN_LIGHTS }),
      S('invitation_printing', 'conditional', 'Order', 'Running order, band info, score sheets and audience ballots', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0], ans('judging', 'judges', 'audience', 'both'))] }),
      S('anchor_mc', 'recommended', 'Bridge', 'A host who covers every changeover so the room does not drift'),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service through a long evening', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Admit', 'Door list, tickets, and the audience ballot if there is one', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('photography', 'conditional', 'Shoot', 'Every band, so each one leaves with something to use', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'House', 'A green room, and somewhere for seven bands to wait', { when: [ans('bands', '8', '15', '25')] }),
      S('security_services', 'conditional', 'Watch', 'Door staff and watch on the equipment, which goes missing', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food for the bands and crew, who arrive in the afternoon', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A stage with room for a shared backline and a band changing over', { when: WHEN_FINDING }),
    ],
    addons: [
      X('changeover_drill', 'Reset', 'A rehearsed ten-minute changeover, with a stage manager calling it', 'schedule', { experience: true }),
      X('shared_backline', 'Standardise', 'One backline every band uses, with a published spec in advance', 'music', { trade: 'event_equipment_rental', when: [ans('backline', 'yes')] }),
      X('audience_ballot', 'Vote', 'A ballot that cannot be stuffed, counted in front of someone', 'poll', { trade: 'invitation_printing', when: [ans('judging', 'audience', 'both')] }),
      X('band_recordings', 'Share', 'A board recording for each band, sent after the night', 'film', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the backline spec and the changeover time before bands apply. Both are the difference between finishing on time and not.' },
    timeline: {
      before: ['Backline spec and changeover time published with the entry form', 'Running order drawn, with a real changeover between every band', 'Judging method and ballot published'],
      during: ['Stage manager calling every changeover to the clock', 'Host covering the room between bands', 'Ballots collected per band, not all at the end'],
      after: ['Result announced with the method visible', 'Recordings sent to every band', 'Backline returned and reconciled'],
    },
    checklist: ['Backline spec published', 'Changeover time rehearsed', 'Running order with real gaps', 'Judging method published'],
  }),

  B('cultural-music-night', 'Tradition', 'Music from a tradition, performed by people from it, for a room that came to hear it.', {
    about: 'The form, the sequence and the language belong to the artists and the community. We arrange the stage, the sound and the seating; we never advise on what is performed or how.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, SOUND,
      Q('seating_style', 'How is the audience seated?', 'one', { options: [['chairs', 'Chairs'], ['floor', 'Floor seating'], ['mixed', 'Both'], ['standing', 'Standing']] }),
      Q('instruments', 'What needs miking?', 'many', { optional: true, options: [['vocals', 'Vocals'], ['percussion', 'Percussion'], ['strings', 'Strings'], ['wind', 'Wind instruments'], ['harmonium', 'Harmonium or keys'], ['ensemble', 'A full ensemble']] }),
      Q('hospitality_artists', 'Do the artists need green rooms and hospitality?', 'yesno'),
      PHOTOS, DRINKS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Reproduce', 'Miking chosen for the instruments, not a generic band setup'),
      S('event_lighting', 'recommended', 'Warm', 'Warm, even light on the ensemble — nothing that moves or flashes'),
      S('tent_furniture', 'conditional', 'Seat', 'Chairs or floor seating as the tradition and the room call for', { when: [ans('seating_style', 'chairs', 'floor', 'mixed')] }),
      S('live_entertainment', 'conditional', 'Invite', 'Artists from the tradition, engaged on their own terms', { when: WHEN_FIND_ACT }),
      S('decoration_floral', 'recommended', 'Set', 'A stage setting the artists are comfortable performing within'),
      S('catering_food', 'conditional', 'Host', 'Hospitality for the artists, and food for the audience after', { when: [some(ans('hospitality_artists', 'yes'), WHEN_FOOD[0])] }),
      S('photography', 'conditional', 'Record', 'Respectfully, without flash, with the artists’ agreement', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Archive', 'An archival recording, if the artists agree to one', { when: [ans('photos', 'yes')] }),
      S('invitation_printing', 'conditional', 'Programme', 'A programme naming every artist, the tradition and the pieces', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Receive', 'A door list, and seating between pieces rather than during', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A low stage, carpet and the setting the ensemble needs', { when: WHEN_BOOTH }),
      S('bar_beverages', 'conditional', 'Serve', 'Refreshments between sets, as you chose', { when: WHEN_BAR }),
      S('venue', 'conditional', 'Find', 'A room with natural acoustics rather than a club system', { when: WHEN_FINDING }),
    ],
    addons: [
      X('instrument_miking', 'Capture', 'Microphones chosen per instrument, with the artists consulted', 'sound_av', { trade: 'sound_av', when: [has('instruments')] }),
      X('artist_hospitality', 'Host well', 'Green rooms, food and rest as the artists asked for them', 'bed', { trade: 'tent_furniture', when: [ans('hospitality_artists', 'yes')] }),
      X('programme_notes', 'Explain', 'Notes on each piece, written with the artists, not about them', 'invite', { trade: 'invitation_printing' }),
      X('archival_copy', 'Preserve', 'A clean recording given to the artists and their community', 'album', { trade: 'videography' }),
    ],
    toolkit: { polls: ['date'], note: 'The form, the sequence and the language belong to the artists. We arrange the room around what they tell us, and never suggest changes to the performance.' },
    timeline: {
      before: ['Technical needs taken from the artists, instrument by instrument', 'Seating style agreed with them, not assumed', 'Programme notes written with the artists'],
      during: ['Green rooms ready at the artists’ call time', 'Seating between pieces only', 'Recording only as agreed'],
      after: ['Recording shared with the artists first', 'Settlement on the night where that is the expectation', 'Room reset'],
    },
    checklist: ['Technical needs taken from the artists', 'Seating style agreed with them', 'Programme credits every artist', 'Recording permission agreed'],
  }),

  B('food-and-music-night', 'Savour', 'Stalls, a stage and a crowd that came to eat first and stay for the music.', {
    about: 'Two events sharing a ground. The food has to serve a queue and the music has to be loud enough to draw and quiet enough to eat through — and the kitchens decide the layout, not the stage.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD,
      Q('stalls', 'How many food stalls?', 'select', { options: [['4', 'Up to 4'], ['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'More than 25']] }),
      Q('cuisines', 'What kinds of food?', 'many', { optional: true, options: [['street', 'Street food'], ['regional', 'Regional'], ['grill', 'Grills'], ['desserts', 'Desserts'], ['international', 'International'], ['beverages', 'Beverages and coffee']] }),
      DIET_ONLY, ALLERGY_ONLY, PHOTOS, PROMO, CLEAN,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'Stalls spread so every queue has somewhere to go'),
      S('event_equipment_rental', 'recommended', 'Lay out', 'Stalls, counters, the stage and the seating between them'),
      S('power_cooling', 'recommended', 'Supply', 'Power and gas safety for every kitchen, sized stall by stall'),
      S('sound_av', 'conditional', 'Balance', 'Sound loud enough to draw and quiet enough to eat through', { when: WHEN_PA }),
      S('safety_facilities', 'recommended', 'Service', 'Washrooms, handwashing, waste and the clear-up through the night'),
      S('live_entertainment', 'conditional', 'Play', 'Music programmed around the busiest eating hours', { when: WHEN_FIND_ACT }),
      S('tent_furniture', 'recommended', 'Seat', 'Communal seating, which is where a food night actually happens'),
      S('event_lighting', 'conditional', 'Light', 'Light on the stalls so people can see what they are buying', { when: WHEN_LIGHTS }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, as you chose', { when: WHEN_BAR }),
      S('security_services', 'conditional', 'Marshal', 'Gate and ground staff, and watch on the cash points', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Sign', 'Stall signage, allergen notices, a ground map and tickets', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'The food and the stalls — this is the category that photographs best', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Admit', 'Gates, tokens and a counted headcount', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('venue', 'conditional', 'Find', 'A ground with water, waste and power enough for the kitchens', { when: WHEN_FINDING }),
    ],
    addons: [
      X('allergen_signage', 'Declare', 'Allergens listed at every stall, in writing, not verbally', 'invite', { trade: 'invitation_printing' }),
      X('token_system', 'Simplify', 'One token currency across every stall, so no stall handles cash', 'budget', { trade: 'invitation_printing', when: WHEN_TICKETED }),
      X('gas_safety', 'Check', 'Gas and fire safety checked at every stall before doors', 'power_cooling', { trade: 'safety_facilities' }),
      X('queue_layout', 'Flow', 'Stalls placed so queues never cross a walking route', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Allergens at every stall, in writing. Gas and fire safety checked before doors. Both stay on the plan.' },
    timeline: {
      before: ['Stall list confirmed, with power, water and gas needs per stall', 'Ground laid out so queues never block a walking route', 'Allergen information collected from every stall'],
      during: ['Gas and fire checks completed before doors', 'Music programmed around the eating peak', 'Waste and washrooms serviced through the night, not after'],
      after: ['Ground cleared, including grease and food waste, the same night', 'Stall settlement and feedback', 'Ground reinstated'],
    },
    checklist: ['Power and gas per stall confirmed', 'Allergen signage at every stall', 'Queue layout drawn', 'Waste and washroom servicing scheduled'],
  }),

  B('live-orchestra', 'Resonate', 'Sixty musicians, a conductor and a room that has to do most of the work.', {
    about: 'The largest ensemble in the catalogue and the one most dependent on the room itself. Risers, chairs, stands, lights to read by and a hall with acoustics — amplification is a last resort, not a default.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, SOUND,
      Q('players', 'How many musicians?', 'select', { options: [['15', 'Up to 15'], ['40', 'Up to 40'], ['70', 'Up to 70'], ['100', 'More than 70']] }),
      Q('riser_need', 'Do you need risers, chairs and music stands?', 'yesno'),
      Q('stand_lights', 'Do the stands need lights?', 'yesno', { optional: true }),
      Q('rehearsal', 'Is there a rehearsal in the hall beforehand?', 'yesno'),
      PHOTOS, DRINKS, FOOD, PROMO,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Stage', 'Risers, orchestral chairs, stands and the conductor’s podium'),
      S('event_lighting', 'recommended', 'Illuminate', 'Even light players can read by, and a warm look for the house'),
      S('sound_av', 'conditional', 'Reinforce', 'Gentle reinforcement only, and only if the hall genuinely needs it', { when: WHEN_PA }),
      S('tent_furniture', 'conditional', 'House', 'Dressing rooms for a large ensemble, and house seating', { when: [ans('players', '40', '70', '100')] }),
      S('live_entertainment', 'conditional', 'Engage', 'An ensemble and conductor for the programme you want', { when: WHEN_FIND_ACT }),
      S('invitation_printing', 'conditional', 'Programme', 'A programme with the works, the movements and every player', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'recommended', 'Usher', 'Front of house, with nobody admitted during a movement'),
      S('photography', 'conditional', 'Record', 'From the side, without flash, between movements only', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Capture', 'A fixed multi-camera record, with clean audio from the hall', { when: [ans('photos', 'yes')] }),
      S('catering_food', 'conditional', 'Sustain', 'Food for sixty musicians between rehearsal and performance', { when: [some(WHEN_FOOD[0], ans('rehearsal', 'yes'))] }),
      S('bar_beverages', 'conditional', 'Serve', 'An interval bar, and nothing during the performance', { when: WHEN_BAR }),
      S('passenger_transport', 'optional', 'Carry', 'Transport for the ensemble and for large instruments'),
      S('venue', 'conditional', 'Find', 'A hall with acoustics, a stage deep enough, and a get-in for a harp', { when: WHEN_FINDING }),
    ],
    addons: [
      X('stand_lighting', 'Read', 'Stand lights, so nobody plays a second movement from memory', 'lighting', { trade: 'event_lighting', when: [ans('stand_lights', 'yes')] }),
      X('hall_rehearsal', 'Settle', 'A rehearsal in the hall itself, which changes everything', 'schedule', { experience: true, when: [ans('rehearsal', 'yes')] }),
      X('instrument_transport', 'Move', 'Transport and handling for large and fragile instruments', 'move', { trade: 'passenger_transport' }),
      X('movement_hold', 'Hold', 'Doors held between movements, with ushers briefed on the score', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'A hall with real acoustics beats any system. Amplification here is a last resort, and we will say so.' },
    timeline: {
      before: ['Hall acoustics assessed and the stage plan drawn to the ensemble', 'Risers, chairs and stands counted against the player list', 'Rehearsal time in the hall protected'],
      during: ['Dressing rooms ready at call time', 'Doors held between movements, never during', 'Interval service only'],
      after: ['Instruments and equipment loaded out carefully', 'Recording delivered to the ensemble', 'Hall restored'],
    },
    checklist: ['Stage plan drawn to the ensemble', 'Risers, chairs and stands counted', 'Hall rehearsal protected', 'Door-holding briefed to ushers'],
  }),

  B('jazz-night', 'Swing', 'A trio, a small room, and an audience close enough to hear the brushes.', {
    about: 'Jazz needs a room where the drums do not have to be mic’d and the audience is within thirty feet. Intimate and acoustic by design, with the bar deliberately quiet during sets.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, SOUND,
      Q('ensemble', 'What size is the group?', 'one', { options: [['solo', 'Solo or duo'], ['trio', 'A trio'], ['quartet', 'A quartet or quintet'], ['bigband', 'A big band']] }),
      Q('sets', 'How many sets?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three']] }),
      Q('piano', 'Is a piano needed?', 'one', { optional: true, options: [['venue', 'The venue has one'], ['hire', 'Please arrange one'], ['keys', 'Keys are fine'], ['no', 'Not needed']] }),
      PHOTOS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Balance', 'Light reinforcement for vocals and bass — the kit stays acoustic'),
      S('tent_furniture', 'recommended', 'Seat', 'Tables and chairs close in, which is where jazz works'),
      S('event_lighting', 'recommended', 'Dim', 'Low, warm light on the group and almost nothing on the room'),
      S('live_entertainment', 'conditional', 'Engage', 'A group suited to the room and the length of the evening', { when: WHEN_FIND_ACT }),
      S('event_equipment_rental', 'conditional', 'Provide', 'A riser, stools, stands and a piano if the room has none', { when: [some(ans('piano', 'hire'), WHEN_BOOTH[0])] }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar held to the intervals, with a short considered list', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Small plates between sets, not during them', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot', 'In low light, without flash, from the side', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Seat', 'A door list, and seating between numbers rather than during', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Posters, tickets and a set list for the tables', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('decoration_floral', 'optional', 'Soften', 'Table dressing and a simple set behind the group'),
      S('venue', 'conditional', 'Find', 'A small, soft room — the kit should not need a microphone', { when: WHEN_FINDING }),
    ],
    addons: [
      X('piano_hire', 'Tune', 'A piano delivered and tuned on the day, not the week before', 'music', { trade: 'event_equipment_rental', when: [ans('piano', 'hire')] }),
      X('interval_service', 'Time it', 'Bar and kitchen service held to the intervals', 'glass', { experience: true, when: WHEN_BAR }),
      X('board_recording', 'Keep', 'A clean board recording for the group', 'film', { trade: 'sound_av' }),
      X('close_seating', 'Draw in', 'Tables set close to the group, with the back of the room closed off', 'chair', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Hold the bar and the kitchen to the intervals. In a room this size, a till drawer is louder than the drummer.' },
    timeline: {
      before: ['Room checked for noise and softness', 'Piano arranged and tuned on the day if one is needed', 'Set times and intervals agreed with the group'],
      during: ['Service held to intervals', 'Seating between numbers only', 'Levels kept light — reinforcement, not amplification'],
      after: ['Recording sent to the group', 'Settlement on the night', 'Room reset'],
    },
    checklist: ['Small soft room confirmed', 'Piano tuned on the day if hired', 'Service timed to intervals', 'Seating set close'],
  }),

  B('tribute-concert', 'Honour', 'Somebody else’s songs, played properly, for people who know every one.', {
    about: 'The audience knows the material better than any other crowd in this category, so the production has to reference the original without pretending to be it. Likeness and licensing both need care.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD, BARRIER,
      Q('tribute_to', 'Who or what is it a tribute to?', 'text', { max: 80 }),
      Q('billing', 'How is it billed?', 'one', {
        options: [['tribute', 'Clearly as a tribute act'], ['celebration', 'A celebration of the music'], ['memorial', 'A memorial'], ['other', 'Something else']],
        help: 'Billing it clearly as a tribute is what keeps it honest, and keeps it legal.',
      }),
      Q('era_look', 'Is there a period look or staging?', 'yesno', { optional: true }),
      AID, PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('sound_av', 'recommended', 'Reproduce', 'A system and a mix that does justice to material people know'),
      S('event_lighting', 'recommended', 'Evoke', 'Lighting that references the era without impersonating a tour'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, backline, risers and the period staging'),
      S('live_entertainment', 'conditional', 'Cast', 'A tribute act that plays the material rather than impersonates', { when: WHEN_FIND_ACT }),
      S('decoration_floral', 'conditional', 'Dress', 'Period set dressing, clearly a tribute and not a replica', { when: [ans('era_look', 'yes')] }),
      S('security_services', 'conditional', 'Control', 'Door, pit and barrier staff for a crowd that will sing along', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_BARRIER[0])] }),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Admit', 'Tickets scanned, a door list and a counted capacity', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Bill it', 'Posters and tickets that say clearly this is a tribute', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'The act and the crowd singing, which is the real picture', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid at the front, washrooms and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Counters for the crowd and a green room for the band', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power sized to the rig, with a backup feed', { when: [some(WHEN_OPEN_AIR[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A room that suits the material more than the crowd size', { when: WHEN_FINDING }),
    ],
    addons: [
      X('clear_billing', 'State it', 'The word “tribute” on every poster, ticket and listing', 'invite', { trade: 'invitation_printing' }),
      X('licence_check', 'Clear it', 'Performance licensing confirmed with the venue before the date', 'schedule', { experience: true }),
      X('setlist_order', 'Sequence', 'A set list built to end on the songs everyone came for', 'music', { experience: true }),
      X('singalong_sound', 'Carry', 'A mix that leaves room for a crowd singing the chorus', 'sound_av', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date'], note: 'Bill it clearly as a tribute on every poster and ticket, and confirm performance licensing with the venue. Both protect you.' },
    timeline: {
      before: ['Billing checked — the word “tribute” on everything', 'Performance licensing confirmed with the venue', 'Set list built to end on the songs people came for'],
      during: ['Capacity counted at the gate', 'Mix leaving room for the crowd', 'Set times inside the venue’s hours'],
      after: ['Load-out the same night', 'Settlement and licensing paperwork closed', 'Venue restored'],
    },
    checklist: ['Billed clearly as a tribute', 'Performance licensing confirmed', 'Set list sequenced', 'Capacity counted'],
  }),

  B('comedy-festival', 'Program', 'Several rooms, a dozen comics and an audience moving between them on a timetable.', {
    about: 'A single show scaled into a schedule. The difficulty is the turnaround: rooms emptying and refilling every hour, each with its own content advisory and its own door.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ENTRY, DRINKS, SOUND, GUARD,
      Q('rooms_count', 'How many rooms?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'Six or more']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three or more']] }),
      Q('comics', 'How many comics in total?', 'select', { options: [['6', 'Up to 6'], ['15', 'Up to 15'], ['40', 'Up to 40'], ['80', 'More than 40']] }),
      Q('advisories', 'Do any shows need a content advisory?', 'yesno', { optional: true }),
      AID, PHOTOS, FOOD, PROMO, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Equip', 'A matched vocal rig in every room, so no room is the bad room'),
      S('event_lighting', 'recommended', 'Isolate', 'Performer lit, audience dark, in every room equally'),
      S('tent_furniture', 'recommended', 'Pack', 'Seating set tight in each room, with a fast reset between shows'),
      S('guest_services', 'recommended', 'Turn over', 'Door staff per room, clearing and refilling to the timetable'),
      S('invitation_printing', 'recommended', 'Schedule', 'Timetable, room signage, tickets, wristbands and advisories'),
      S('event_equipment_rental', 'conditional', 'Fit out', 'Risers, stools, stands and backdrops in every room', { when: [ans('rooms_count', '2', '4', '6')] }),
      S('anchor_mc', 'conditional', 'Compere', 'A compere per room, which is what holds a festival line-up together', { when: [ans('comics', '15', '40', '80')] }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar between shows, paused during them', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food for a crowd with an hour between shows, and for the comics', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Cover', 'Every room across every day, with the comics’ agreement', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Manage', 'Door staff, crowd flow between rooms and the main entrance', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning between shows and the daily clear-up', { when: [some(WHEN_AID[0], ans('days', '2', '3'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'A crew across several rooms and several days', { when: [ans('days', '2', '3')] }),
      S('venue', 'conditional', 'Find', 'A building with several small, low rooms rather than one big one', { when: WHEN_FINDING }),
    ],
    addons: [
      X('turnaround_plan', 'Reset', 'A fifteen-minute room reset, rehearsed, with staff assigned', 'schedule', { experience: true }),
      X('content_advisories', 'Warn', 'Advisories printed on the timetable and shown at each door', 'invite', { trade: 'invitation_printing', when: [ans('advisories', 'yes')] }),
      X('comic_green_room', 'House', 'One green room for all the comics, which is also the festival’s heart', 'bed', { trade: 'tent_furniture' }),
      X('room_parity', 'Equalise', 'Every room checked so no comic draws the one with bad sound', 'sound_av', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date'], note: 'Comics own their material — nothing is recorded without written agreement. Content advisories go on the timetable and the door.' },
    timeline: {
      before: ['Timetable built with real turnaround time between shows', 'Every room checked for sound and sightlines, and equalised', 'Advisories collected from the comics and printed'],
      during: ['Rooms cleared and reset to the turnaround plan', 'Door staff per room holding the timetable', 'Green room kept for the comics, not for guests'],
      after: ['Settlement with every act', 'Rooms and building restored', 'Feedback from comics as well as audience'],
    },
    checklist: ['Timetable with real turnarounds', 'Rooms equalised for sound', 'Advisories printed and shown', 'Green room for the comics'],
  }),

  B('dance-battle', 'Face off', 'Two dancers, a circle, a judge and a floor that will take the impact.', {
    about: 'A cypher is not a stage show. The crowd makes the circle, the DJ drives the rounds, and the floor has to survive power moves — a hard or slippery surface is the main injury risk.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ENTRY, SOUND, GUARD,
      Q('styles', 'Which styles?', 'many', { options: [['breaking', 'Breaking'], ['hiphop', 'Hip-hop'], ['popping', 'Popping and locking'], ['krump', 'Krump'], ['freestyle', 'All styles'], ['crew', 'Crew battles']] }),
      Q('format', 'What is the format?', 'one', { options: [['oneone', 'One versus one'], ['crew', 'Crew versus crew'], ['bracket', 'A knockout bracket'], ['cypher', 'An open cypher']] }),
      Q('entrants', 'How many entrants or crews?', 'select', { options: [['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'Up to 32'], ['64', 'More than 32']] }),
      Q('floor', 'Does the floor need a dance surface?', 'yesno', { help: 'Power moves on a hard or slippery floor cause injuries. This is a safety question.' }),
      AID, PHOTOS, DRINKS, FOOD, PROMO,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Lay', 'A floor that takes power moves, plus the circle and judges’ table'),
      S('sound_av', 'recommended', 'Drive', 'A system with the low end a battle needs, and a mic for the host'),
      S('dj_music', 'recommended', 'Spin', 'A DJ who can read a round and cut at the right moment'),
      S('anchor_mc', 'recommended', 'Call', 'A host who runs the bracket and keeps the circle honest'),
      S('event_lighting', 'conditional', 'Light', 'Even light on the circle, not a moving stage rig', { when: WHEN_LIGHTS }),
      S('safety_facilities', 'conditional', 'Treat', 'First aid for strains and impacts, and the clear-up after', { when: [some(WHEN_AID[0], ans('floor', 'yes'))] }),
      S('invitation_printing', 'conditional', 'Bracket', 'The bracket, entrant numbers, judging criteria and posters', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('guest_services', 'conditional', 'Register', 'Entrant registration, numbers issued and the bracket drawn', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('security_services', 'conditional', 'Hold', 'Crowd management around the circle, which closes in fast', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Freeze', 'Shot at the freeze, which takes a photographer who knows the form', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Every round filmed, which is how results stop being disputed', { when: [ans('photos', 'yes')] }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water for dancers, and a drinks counter for the crowd', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food for dancers who are there from the morning heats', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'A room with the floor, the ceiling height and the crowd space', { when: WHEN_FINDING }),
    ],
    addons: [
      X('battle_floor', 'Protect', 'A laid dance surface — the main injury prevention at a battle', 'game', { trade: 'event_equipment_rental', when: [ans('floor', 'yes')] }),
      X('judge_criteria', 'Publish', 'Judging criteria and the judges named before entries close', 'poll', { experience: true }),
      X('round_films', 'Settle', 'Every round filmed, so a disputed call has evidence', 'film', { trade: 'videography' }),
      X('dancer_water', 'Hydrate', 'Free water at the circle, all day, for everyone competing', 'glass', { trade: 'bar_beverages' }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'The floor is a safety item at a battle. We keep a laid surface on the plan for any hard or slippery ground.' },
    timeline: {
      before: ['Floor checked and a surface laid if it is hard or slippery', 'Judges named and criteria published before entries close', 'Bracket drawn openly'],
      during: ['Free water at the circle from the first heat', 'Rounds called to the bracket, filmed throughout', 'Crowd held back far enough for the circle to work'],
      after: ['Result announced with the criteria visible', 'Round films published', 'Floor lifted and the room cleared'],
    },
    checklist: ['Dance surface laid if needed', 'Judges and criteria published', 'Bracket drawn openly', 'Water at the circle'],
  }),

  B('underground-music-event', 'Word of mouth', 'A small room, a sound system that matters, and a crowd who found out quietly.', {
    about: 'Small, specific and built on trust. The things that make it work are a room with the right sound, a door that keeps the night what it is meant to be, and a safety plan that does not depend on it being big.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, DRINKS, LATE, SOUND, GUARD,
      Q('ethos', 'What matters most about the night?', 'many', { options: [['sound', 'The sound system'], ['lineup', 'The line-up'], ['space', 'The space itself'], ['community', 'The community'], ['safety', 'A safe, inclusive floor']] }),
      Q('permissions', 'Are the venue’s licence and closing time confirmed?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'A small night still needs a licensed room and an agreed closing time. We will not plan around assuming one.',
      }),
      AGE_DOOR, AID, PHOTOS, FOOD, PROMO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'A system chosen for the room, which is the whole reason people come'),
      S('event_lighting', 'conditional', 'Keep low', 'Minimal lighting — enough to move safely, no more', { when: WHEN_LIGHTS }),
      S('security_services', 'recommended', 'Hold the door', 'Door staff briefed on the night’s own code, not a generic one'),
      S('safety_facilities', 'recommended', 'Look after', 'Free water, washrooms, first aid and the clear-up'),
      S('dj_music', 'conditional', 'Book', 'Artists who fit the room rather than fill it', { when: WHEN_FIND_ACT }),
      S('event_equipment_rental', 'conditional', 'Rig', 'A booth, risers and the room blacked out', { when: WHEN_BOOTH }),
      S('bar_beverages', 'conditional', 'Serve', 'A bar, with free water available regardless', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Admit', 'A list at the door, which is how this kind of night stays itself', { when: [some(WHEN_LISTED[0], WHEN_TICKETED[0])] }),
      S('invitation_printing', 'conditional', 'Tell', 'Minimal artwork and tickets, kept deliberately low-key', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Shoot', 'Only with a stated policy — many of these rooms are camera-free', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Cool', 'Ventilation and cooling for a small, full, dark room', { when: [some(WHEN_BIG[0], WHEN_OPEN_AIR[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Something at the back for a long night', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'A licensed room with the right sound and an agreed closing time', { when: WHEN_FINDING }),
    ],
    addons: [
      X('camera_policy', 'Keep it private', 'A stated no-phones or no-camera policy, enforced at the door', 'camera', { experience: true }),
      X('safer_space', 'Set the terms', 'A published code and a named person on the floor to go to', 'heart', { experience: true, when: [ans('ethos', 'safety', 'community')] }),
      X('system_choice', 'Specify', 'A system chosen and tuned for this room specifically', 'sound_av', { trade: 'sound_av', when: [ans('ethos', 'sound')] }),
      X('licence_confirm', 'Make it legal', 'The venue’s licence and closing time confirmed in writing', 'schedule', { experience: true, when: [ans('permissions', 'no', 'help')] }),
    ],
    toolkit: { chat: 'organiser', polls: ['date'], note: 'A small night still needs a licensed room, an agreed closing time and a safety plan. We will not plan around assuming any of them.' },
    timeline: {
      before: ['Venue licence and closing time confirmed in writing', 'System chosen and tuned for the room', 'Door policy and code published to whoever is coming'],
      during: ['Door holding the policy, calmly', 'Free water available all night', 'Levels and closing time held'],
      after: ['Room cleared and left better than found', 'Nothing published that the policy said would not be', 'Settlement with the artists'],
    },
    checklist: ['Licence and closing time in writing', 'System tuned for the room', 'Door policy published', 'Free water and a named person on the floor'],
  }),

  B('college-music-night', 'Rally', 'A campus crowd, a student budget and a night that has to clear by the curfew.', {
    about: 'Everything a concert needs, run by students on a campus with rules. The constraints are the budget, the permission and the hour it has to end — and the plan is written so a new committee can run it next year.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ARTIST, ENTRY, LATE, SOUND, GUARD, BARRIER, AID,
      Q('organiser', 'Who is running it?', 'one', { options: [['committee', 'A student committee'], ['club', 'A music club'], ['college', 'The college'], ['external', 'An outside promoter']] }),
      Q('permission', 'Is the college’s permission confirmed?', 'one', { options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']] }),
      Q('student_acts', 'Are student bands playing as well?', 'yesno', { optional: true }),
      PHOTOS, FOOD, PROMO,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'A system sized to the ground, with enough inputs for student bands'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting, and enough light for a crowd to leave safely'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, barricades, backline and the front-of-stage barrier'),
      S('security_services', 'conditional', 'Control', 'Gate and front-of-stage staff against a counted capacity', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_BARRIER[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid at the front, water, washrooms and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('live_entertainment', 'conditional', 'Headline', 'A headline act within the budget, booked with the rider read', { when: WHEN_FIND_ACT }),
      S('power_cooling', 'conditional', 'Power', 'Generators sized to the rig, with a backup feed', { when: [some(WHEN_OPEN_AIR[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Gate', 'ID-checked entry and a counted headcount at every gate', { when: [some(WHEN_TICKETED[0], WHEN_LISTED[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Passes, wristbands, posters and the ground signage', { when: [some(WHEN_TICKETED[0], WHEN_PROMO[0])] }),
      S('photography', 'conditional', 'Capture', 'The act and the crowd, for the committee and for next year', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Stalls for the crowd and a green room spread for the act', { when: WHEN_FOOD }),
      S('anchor_mc', 'conditional', 'Host', 'A host to run the student slots and cover the changeovers', { when: [ans('student_acts', 'yes')] }),
      S('tent_furniture', 'conditional', 'House', 'A green room, and shade or seating at the edges', { when: WHEN_RIDER }),
      S('venue', 'conditional', 'Find', 'A ground off campus, if the college cannot host it', { when: WHEN_FINDING }),
    ],
    addons: [
      X('student_slots', 'Open', 'Slots for student bands before the headline, with their own line check', 'music', { trade: 'sound_av', when: [ans('student_acts', 'yes')] }),
      X('curfew_schedule', 'Finish', 'Set times built so the last song lands inside the permitted hour', 'schedule', { experience: true, when: WHEN_LATE }),
      X('permission_pack', 'Clear it', 'College and local permissions confirmed in writing before booking', 'invite', { experience: true, when: [ans('permission', 'no', 'help')] }),
      X('handover_notes', 'Pass on', 'Everything written down for next year’s committee', 'album', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Permissions, capacity and the curfew are the committee’s responsibility. We keep them on the plan and never call a ground approved.' },
    timeline: {
      before: ['College and local permissions confirmed in writing before any booking', 'Capacity agreed and the ground plan drawn with gates and exits', 'Set times built backwards from the curfew'],
      during: ['Gates counting, never over capacity', 'First aid at the barrier from doors open', 'Headline finishing inside the permitted hour'],
      after: ['Ground cleared the same night', 'Settlement and a written account for the college', 'Handover notes for next year’s committee'],
    },
    checklist: ['Permissions in writing', 'Capacity and ground plan agreed', 'Set times backwards from the curfew', 'First aid at the barrier'],
  }),
]

export const NIGHTLIFE_BLUEPRINT = Object.fromEntries(NIGHTLIFE_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(NIGHTLIFE_BLUEPRINTS, 'nightlife')
