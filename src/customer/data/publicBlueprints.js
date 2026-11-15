/**
 * Public Shows & Exhibitions — one blueprint per occasion.
 *
 * Twenty-eight occasions that the public can walk into. That one fact
 * sets every rule in this file:
 *
 *   · Capacity, exits and crowd flow are safety, not production. They
 *     stay on a plan with a real crowd on it even when everything
 *     decorative comes off, and we never describe a ground, a street
 *     or a building as approved — permissions are the organiser's.
 *   · Accessibility is asked on every public occasion, because the
 *     public includes people who use a wheelchair, cannot stand for
 *     two hours or cannot hear the announcement.
 *   · We arrange no pyrotechnics, no flame effects and no hazardous
 *     effects, at any occasion, including the one in this category
 *     named after them. Where a customer engages a licensed operator,
 *     we plan the crowd, the exclusion zone and the viewing around it
 *     and say plainly that the display itself is not ours.
 *   · Artists, performers and exhibitors own their work. Recording,
 *     photographing or reproducing it happens with their written
 *     agreement and not otherwise.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, DIET_ONLY, ALLERGY_ONLY, CHIEF_GUEST, AWARDS,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a public event asks ───────────────────────────── */

const CROWD = Q('crowd', 'How many people are expected?', 'select', {
  options: [['100', 'Up to 100'], ['500', 'Up to 500'], ['2000', 'Up to 2000'], ['8000', 'Up to 8000'], ['25000', 'More than 8000']],
  help: 'Capacity decides the exits, the stewarding, the washrooms and the medical cover.',
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['hall', 'An indoor hall or gallery'], ['theatre', 'A theatre or auditorium'], ['ground', 'An open ground'], ['street', 'A street or public space'], ['mall', 'A mall or public building'], ['find', 'Please find somewhere']],
})
const ACCESS_PUBLIC = Q('access_type', 'How does the public get in?', 'one', {
  options: [['free', 'Free and open'], ['ticket', 'Ticketed'], ['registration', 'Free, but registered'], ['invite', 'By invitation']],
})
const DAYS = Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['7', 'A week or more']] })
const PERMITS = Q('permits', 'Are the venue and authority permissions in place?', 'one', {
  options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
  help: 'Permissions are the organiser’s. We never treat a public gathering as approved.',
})

/** Asked on every public occasion, because the public includes everyone. */
const ACCESS_NEEDS = Q('accessibility', 'What should we arrange for access?', 'many', {
  optional: true,
  options: [['stepfree', 'Step-free routes'], ['seating', 'Seating for people who cannot stand'], ['viewing', 'An accessible viewing area'], ['signing', 'Sign-language interpretation'], ['quiet', 'A quiet or low-sensory space'], ['toilets', 'Accessible washrooms']],
})
const GUARD = Q('security', 'Do you need security and stewarding?', 'yesno')
const AID = Q('first_aid', 'First aid or an ambulance on standby?', 'yesno', { optional: true })
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true,
  options: [['pa', 'A PA or sound system'], ['mics', 'Microphones'], ['screen', 'A screen or projection'], ['lights', 'Stage or display lighting'], ['stage', 'A stage'], ['recording', 'Recording or streaming']],
})
const SIGNAGE = Q('signage', 'Do you need signage, maps and printed material?', 'yesno', { optional: true })
const SPONSORS = Q('sponsors', 'Are there sponsors?', 'yesno', { optional: true })
const FOOD = Q('food', 'Food and drink', 'one', {
  optional: true, options: [['stalls', 'Food stalls'], ['counters', 'Counters or a café'], ['catering', 'Catered refreshments'], ['venue', 'The venue handles it'], ['none', 'Nothing needed']],
})
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })

const WHEN_TICKETED = [ans('access_type', 'ticket', 'registration')]
const WHEN_OPEN = [ans('access_type', 'free', 'registration')]
const WHEN_BIG = [ans('crowd', '2000', '8000', '25000')]
const WHEN_HUGE = [ans('crowd', '8000', '25000')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_AID = [ans('first_aid', 'yes')]
const WHEN_AV = [has('av')]
const WHEN_PA = [ans('av', 'pa', 'mics')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_SCREEN = [ans('av', 'screen')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_RECORDED = [ans('av', 'recording')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_SPONSOR = [ans('sponsors', 'yes')]
const WHEN_FOOD = [ans('food', 'stalls', 'counters', 'catering')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'ground', 'street')]
const WHEN_OUTSIDE = [ans('place', 'ground', 'street')]
const WHEN_ACCESS = [has('accessibility')]
const WHEN_DAYS = [ans('days', '2', '3', '7')]
const WHEN_PERMIT_HELP = [ans('permits', 'no', 'help')]

export const PUBLIC_BLUEPRINTS = [

  B('public-festival', 'Assemble', 'A whole neighbourhood turning up, which is the point and the problem.', {
    about: 'The broadest occasion in the catalogue: several stages, stalls, children, elderly people and a crowd nobody counted. The plan is a crowd plan first and a programme second.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('zones', 'What is on?', 'many', { options: [['stage', 'A main stage'], ['stalls', 'Stalls and vendors'], ['kids', 'A children’s area'], ['culture', 'Cultural performances'], ['sport', 'Games or sport'], ['market', 'A market']] }),
      AV, GUARD, AID, ACCESS_NEEDS, SIGNAGE, SPONSORS, PHOTOS, FOOD, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Safeguard', 'Medical posts, washrooms, water and the clear-up each night'),
      S('security_services', 'recommended', 'Steward', 'Stewarding across the ground, with a counted capacity'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stages, stalls, barriers and the whole ground build'),
      S('sound_av', 'conditional', 'Carry', 'Sound across the ground, and a mic for announcements', { when: [some(WHEN_PA[0], WHEN_STAGE[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Generators and distribution across the ground', { when: [some(WHEN_OUTSIDE[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Stage lighting, and enough light to leave the ground safely', { when: [some(WHEN_LIT[0], WHEN_BIG[0])] }),
      S('live_entertainment', 'conditional', 'Programme', 'Performers across the day, for the whole age range present', { when: [ans('zones', 'stage', 'culture')] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls spread so no queue blocks a route', { when: [some(ans('zones', 'stalls'), WHEN_FOOD[0])] }),
      S('invitation_printing', 'conditional', 'Signpost', 'Ground maps, stage times, stall signage and accessibility notices', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('guest_services', 'conditional', 'Marshal', 'Hosts on the ground, an information point and a lost-child point', { when: [some(WHEN_OPEN[0], WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, shade and seating for people who cannot stand', { when: [some(WHEN_ACCESS[0], WHEN_OUTSIDE[0])] }),
      S('photography', 'conditional', 'Record', 'The festival across the whole ground, not only the stage', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across several days', { when: WHEN_DAYS }),
      S('decoration_floral', 'conditional', 'Mark', 'Entrance, gateway and sponsor presence across the ground', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('venue', 'conditional', 'Secure', 'A ground that can be fenced, exited, powered and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('ground_map', 'Orient', 'A map at every gate with stages, water, medical, toilets and exits', 'map', { trade: 'invitation_printing' }),
      X('lost_child_point', 'Reunite', 'A staffed, signposted lost-child point, announced at the start', 'group', { trade: 'guest_services' }),
      X('access_platform', 'Include', 'An accessible viewing platform with a step-free route to it', 'spa', { trade: 'event_equipment_rental', when: WHEN_ACCESS }),
      X('permission_pack', 'Clear it', 'Ground, sound and crowd permissions confirmed in writing', 'schedule', { experience: true, when: WHEN_PERMIT_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'Capacity, exits, medical cover and permissions are the organiser’s and stay on the plan. We never suggest fireworks or flame effects.' },
    timeline: {
      before: ['Permissions confirmed in writing before anything is booked', 'Ground plan drawn with gates, exits, routes, medical and toilets', 'Accessibility routes walked, not assumed'],
      during: ['Stewarding and medical visible from the first hour', 'Lost-child point announced at the start, not when needed', 'Capacity watched at the gates'],
      after: ['Ground cleared each night', 'Incident log completed', 'Ground reinstated'],
    },
    checklist: ['Permissions in writing', 'Ground plan with exits and medical', 'Accessible routes walked', 'Lost-child point staffed'],
  }),

  B('fashion-show', 'Reveal', 'A ramp, a light cue and ninety seconds per look.', {
    about: 'Everything happens on the ramp and nothing is fixable once it starts. Backstage — the order rail, the dressers, the changing space — is where a show is actually won.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('looks', 'How many looks or sequences?', 'select', { options: [['12', 'Up to 12'], ['30', 'Up to 30'], ['60', 'Up to 60'], ['120', 'More than 60']] }),
      Q('designers', 'How many designers or labels?', 'select', { options: [['1', 'One'], ['3', 'Up to 3'], ['8', 'Up to 8'], ['20', 'More than 8']] }),
      Q('ramp', 'Do you need a ramp built?', 'yesno'),
      Q('styling', 'Makeup, hair and dressers?', 'one', { options: [['full', 'A full team'], ['makeup', 'Makeup and hair only'], ['dressers', 'Dressers only'], ['none', 'The labels handle it']] }),
      Q('press', 'Is press invited?', 'yesno', { optional: true }),
      AV, GUARD, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Cue', 'Ramp lighting cued look by look, which is the entire show'),
      S('sound_av', 'recommended', 'Drive', 'A tracks desk and a system that lands every cue on the beat'),
      S('event_equipment_rental', 'conditional', 'Build', 'The ramp, trussing, backdrop, seating bank and barricades', { when: [some(ans('ramp', 'yes'), WHEN_STAGE[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Style', 'Makeup, hair and dressers working to the running order', { when: [ans('styling', 'full', 'makeup', 'dressers')] }),
      S('tent_furniture', 'recommended', 'House', 'Changing rooms with mirrors and rails, and front-row seating'),
      S('photography', 'conditional', 'Shoot', 'From the end of the ramp, which is the only angle that works', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'A locked ramp camera, so every look has a clean record', { when: WHEN_FILM }),
      S('guest_services', 'conditional', 'Seat', 'Seating by row and by name, with press placed deliberately', { when: [some(WHEN_TICKETED[0], ans('press', 'yes'))] }),
      S('invitation_printing', 'conditional', 'Order', 'Invitations, the running order, seat cards and press kits', { when: [some(WHEN_SIGNED[0], ans('press', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Set', 'A set and sponsor presence along the ramp', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('security_services', 'conditional', 'Control', 'Door, ramp-edge and backstage access control', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments for guests, and food backstage for a long day', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for the rig and cooling in the changing rooms', { when: [some(WHEN_OUTSIDE[0], ans('designers', '8', '20'))] }),
      S('venue', 'conditional', 'Find', 'A room with the length, the height and the depth a ramp needs', { when: WHEN_FINDING }),
    ],
    addons: [
      X('order_rail', 'Sequence', 'A rail backstage with every look in running order, labelled', 'dress', { trade: 'tent_furniture' }),
      X('cue_rehearsal', 'Rehearse', 'A full cue-to-cue on the built ramp, with the real lights', 'schedule', { experience: true }),
      X('backstage_lead', 'Call it', 'One person backstage whose only job is calling looks on', 'group', { experience: true }),
      X('press_pit', 'Place', 'A press pit at the end of the ramp, with slots by outlet', 'camera', { trade: 'guest_services', when: [ans('press', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Lock the running order early. Every change on the day changes the rail, the dressers and the light cues at once.' },
    timeline: {
      before: ['Running order locked and cues written to it', 'Full cue-to-cue rehearsal on the built ramp', 'Rails labelled by look, dressers briefed'],
      during: ['Backstage lead calling looks on', 'Cues to the order, never to the moment', 'Press pit held for the booked outlets'],
      after: ['Garments returned to each label and counted', 'Images sent per designer', 'Ramp struck'],
    },
    checklist: ['Running order locked', 'Cue-to-cue rehearsed on the ramp', 'Rails labelled by look', 'Backstage lead named'],
  }),

  B('film-premiere', 'Debut', 'A screen, a carpet and the people who made it, all in one evening.', {
    about: 'Two events in sequence: arrivals, which the cameras are there for, and the screening, which has to be technically perfect. The projection check matters more than the carpet, and gets less attention.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('format', 'What format is the film?', 'one', { options: [['dcp', 'DCP'], ['digital', 'A digital file'], ['streaming', 'Streamed from a drive'], ['film', 'Film print'], ['unknown', 'Not sure yet']] }),
      Q('carpet', 'Is there a carpet and arrivals?', 'yesno'),
      Q('press', 'Is press invited?', 'yesno'),
      Q('after', 'Is there an after-party or reception?', 'yesno', { optional: true }),
      Q('cast', 'Are cast and crew attending?', 'yesno', { optional: true }),
      AV, GUARD, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project', 'Projection and sound tested with the actual file, not a test reel'),
      S('event_lighting', 'conditional', 'Light', 'Carpet lighting built for the cameras, and house lighting cued', { when: [some(ans('carpet', 'yes'), WHEN_LIT[0])] }),
      S('decoration_floral', 'conditional', 'Stage', 'A carpet, a branded wall and the foyer dressed', { when: [some(ans('carpet', 'yes'), WHEN_SPONSOR[0])] }),
      S('guest_services', 'recommended', 'Receive', 'Arrivals managed, seating by name, and cast kept moving'),
      S('photography', 'conditional', 'Capture', 'Arrivals and the wall, delivered the same night', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Arrivals and the introduction, cut for press and social', { when: [some(WHEN_FILM[0], ans('press', 'yes'))] }),
      S('security_services', 'conditional', 'Control', 'Carpet, door and cast protection, with a route in and out', { when: [some(WHEN_GUARD[0], ans('cast', 'yes'), WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, seat cards, press kits and signage', { when: [some(WHEN_SIGNED[0], ans('press', 'yes'), WHEN_TICKETED[0])] }),
      S('catering_food', 'conditional', 'Host', 'A reception after the screening, not before it', { when: [some(ans('after', 'yes'), WHEN_FOOD[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'The carpet, the branded wall, a press riser and stanchions', { when: [ans('carpet', 'yes')] }),
      S('passenger_transport', 'conditional', 'Convey', 'Cars for cast, timed to the arrivals window', { when: [ans('cast', 'yes')] }),
      S('valet_parking', 'conditional', 'Park', 'Valet and a drop-off that does not block the carpet', { when: [ans('carpet', 'yes')] }),
      S('venue', 'conditional', 'Find', 'A cinema or hall with projection that matches the film’s format', { when: WHEN_FINDING }),
    ],
    addons: [
      X('projection_test', 'Verify', 'The actual file run end to end in the actual room, days before', 'media', { trade: 'sound_av' }),
      X('press_wall', 'Frame', 'A branded wall with marked positions and a press riser', 'booth', { trade: 'decoration_floral', when: [ans('press', 'yes')] }),
      X('arrival_schedule', 'Stagger', 'Arrivals timed so the carpet is never empty and never jammed', 'schedule', { experience: true, when: [ans('carpet', 'yes')] }),
      X('same_night_images', 'Release', 'Edited arrival images out the same night, while it is news', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Run the actual film file in the actual room before the day. A premiere that cannot play is the only failure nobody forgives.' },
    timeline: {
      before: ['Film file tested end to end in the venue, with sound', 'Arrival times staggered and cars briefed', 'Seating plan by name, with cast and press placed'],
      during: ['Carpet staffed, arrivals staggered', 'Screening starts on time — the carpet does not overrun into it', 'Images edited and released during the evening'],
      after: ['Full image set to press', 'Reception settled', 'Venue cleared'],
    },
    checklist: ['Film tested in the actual room', 'Arrival schedule staggered', 'Seating plan by name', 'Press wall and riser set'],
  }),

  B('film-screening', 'Show', 'A room, a projector and an audience that has to be able to hear it.', {
    about: 'Simpler than a premiere and more often got wrong, because the room is usually not a cinema. The projector, the blackout and the sound are the whole job.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('kind', 'What kind of screening?', 'one', { options: [['community', 'A community screening'], ['festival', 'Part of a festival'], ['open_air', 'Open air'], ['private', 'A private screening'], ['education', 'Educational']] }),
      Q('rights', 'Are the screening rights or licence in place?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['unsure', 'Not sure']],
        help: 'A public screening needs the rights holder’s permission. That is the organiser’s to obtain.',
      }),
      Q('discussion', 'Is there a discussion or Q and A after?', 'yesno', { optional: true }),
      Q('subtitles', 'Are subtitles or captions needed?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, GUARD, AID, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project', 'A projector matched to the room, a screen, and sound people can hear'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating faced at the screen, with accessible places kept', { when: [some(WHEN_ACCESS[0], WHEN_FINDING[0])] }),
      S('event_equipment_rental', 'conditional', 'Black out', 'A screen, blackout and a projection position for any room', { when: [some(WHEN_SCREEN[0], ans('kind', 'open_air', 'community'))] }),
      S('event_lighting', 'conditional', 'Dim', 'House lighting that can be taken down and brought back up', { when: WHEN_LIT }),
      S('power_cooling', 'conditional', 'Power', 'Power for an open-air setup, with a backup feed', { when: [some(ans('kind', 'open_air'), WHEN_OUTSIDE[0])] }),
      S('anchor_mc', 'conditional', 'Moderate', 'Someone to run the discussion afterwards', { when: [ans('discussion', 'yes')] }),
      S('guest_services', 'conditional', 'Admit', 'A door list or tickets, and latecomers held until a break', { when: [some(WHEN_TICKETED[0], WHEN_OPEN[0])] }),
      S('invitation_printing', 'conditional', 'Announce', 'Posters, tickets, programme notes and signage', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Refreshments before or after, not during', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Steward', 'Stewarding for a free, open screening', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Record', 'The room and the discussion, not the screen', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('venue', 'conditional', 'Find', 'A room that can be darkened, which rules out most rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rights_check', 'Clear it', 'Screening rights confirmed with the distributor before the date', 'schedule', { experience: true, when: [ans('rights', 'no', 'unsure')] }),
      X('caption_track', 'Caption', 'Subtitles or captions loaded and checked on the actual file', 'media', { trade: 'sound_av', when: [ans('subtitles', 'yes')] }),
      X('blackout_test', 'Darken', 'Blackout tested at the same hour the screening starts', 'lighting', { trade: 'event_equipment_rental' }),
      X('open_air_kit', 'Weatherproof', 'Cover for the projector and a wet-weather decision time', 'tent', { trade: 'tent_furniture', when: [ans('kind', 'open_air')] }),
    ],
    toolkit: { polls: ['date'], note: 'Screening rights are the organiser’s to obtain. We will keep that on the plan and will not arrange a public screening around an unresolved licence.' },
    timeline: {
      before: ['Screening rights confirmed in writing', 'Projector, sound and blackout tested in the room at the right hour', 'Captions loaded and checked if needed'],
      during: ['Doors and seating before the film, latecomers held at breaks', 'Sound set so the back row hears dialogue', 'Discussion after, moderated'],
      after: ['Equipment returned', 'Room reset', 'Attendance reported to the rights holder if required'],
    },
    checklist: ['Screening rights in writing', 'Projection and sound tested in the room', 'Blackout tested at the right hour', 'Accessible seating kept'],
  }),

  B('theatre-performance', 'Stage', 'A show that has been rehearsed in a different room, now in this one.', {
    about: 'The technical fit-up is the event: lighting rig, set, sound plot and a dress rehearsal in the actual space. Everything front of house exists so that does not get interrupted.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('production', 'What kind of production?', 'one', { options: [['play', 'A play'], ['musical', 'A musical'], ['children', 'Children’s theatre'], ['experimental', 'Experimental'], ['amateur', 'Amateur or community'], ['touring', 'A touring production']] }),
      Q('shows', 'How many performances?', 'select', { options: [['1', 'One'], ['3', 'Up to 3'], ['8', 'Up to 8'], ['20', 'A run']] }),
      Q('set_build', 'Is there a set to build?', 'yesno'),
      Q('cast_size', 'How many on stage?', 'select', { options: [['4', 'Up to 4'], ['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'More than 25']] }),
      AV, ACCESS_NEEDS, AID, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Rig', 'A lighting plot rigged, focused and plotted to the production'),
      S('sound_av', 'recommended', 'Plot', 'Radio mics, effects and a sound plot cued to the script'),
      S('event_equipment_rental', 'conditional', 'Build', 'Set, flats, rostra, masking and the get-in', { when: [some(ans('set_build', 'yes'), WHEN_STAGE[0])] }),
      S('tent_furniture', 'conditional', 'House', 'Dressing rooms for the cast, and house seating with accessible places', { when: [some(ans('cast_size', '10', '25', '50'), WHEN_ACCESS[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Stage makeup and hair, called to the half', { when: [ans('production', 'musical', 'play', 'touring')] }),
      S('guest_services', 'recommended', 'Front of house', 'Box office, ushers, and latecomers held to the lock-out'),
      S('invitation_printing', 'conditional', 'Programme', 'Tickets, programmes with every credit, and front-of-house signage', { when: [some(WHEN_TICKETED[0], WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Capture', 'A photo call at the dress rehearsal, not during a performance', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Archive', 'An archival record, with the company and rights holder’s agreement', { when: WHEN_FILM }),
      S('catering_food', 'conditional', 'Feed', 'An interval bar, and food for the company across a run', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the get-out', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Get-in, run and get-out across a run of performances', { when: [ans('shows', '8', '20')] }),
      S('venue', 'conditional', 'Find', 'A theatre with the rig, the wings and the get-in the set needs', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dress_rehearsal', 'Run it', 'A full dress and technical rehearsal in the actual space', 'schedule', { experience: true }),
      X('photo_call', 'Shoot', 'A photo call at the dress, so nobody shoots during a performance', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('accessible_performance', 'Open up', 'A relaxed or captioned performance within the run', 'spa', { experience: true, when: WHEN_ACCESS }),
      X('get_in_plan', 'Schedule', 'A get-in and get-out plan with crew, agreed with the venue', 'move', { trade: 'end_to_end_event_logistics', when: [ans('set_build', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'The dress rehearsal in the real space is not optional. Everything that goes wrong on a first night was findable at the dress.' },
    timeline: {
      before: ['Get-in scheduled with the venue and the crew', 'Rig focused and plotted, sound cued to the script', 'Full dress and technical rehearsal in the space'],
      during: ['Company called to the half', 'Lock-out held — latecomers seated at the interval', 'Photo call at the dress, not during a show'],
      after: ['Get-out to schedule', 'Archival recording delivered to the company', 'Venue restored'],
    },
    checklist: ['Get-in scheduled', 'Rig plotted to the production', 'Dress rehearsal in the space', 'Accessible seating and a lock-out policy'],
  }),

  B('art-exhibition', 'Hang', 'Work on walls, lit properly, with a label beside every piece.', {
    about: 'Hanging height, lighting and labels are the whole craft. The opening is one evening; the exhibition is the weeks after it, so the plan covers invigilation and not just the private view.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS,
      Q('works', 'How many works?', 'select', { options: [['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'Up to 150'], ['400', 'More than 150']] }),
      Q('hanging', 'What does the work need?', 'many', { options: [['walls', 'Wall hanging'], ['plinths', 'Plinths for sculpture'], ['cases', 'Display cases'], ['frames', 'Framing'], ['panels', 'Free-standing panels']] }),
      Q('sale', 'Is the work for sale?', 'yesno', { optional: true }),
      Q('opening', 'Is there a private view or opening?', 'yesno'),
      Q('invigilation', 'Does the exhibition need invigilating while it is open?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mount', 'Hanging systems, plinths, cases and panels, set at viewing height'),
      S('event_lighting', 'recommended', 'Light', 'Gallery lighting aimed at the work, not at the visitor'),
      S('invitation_printing', 'recommended', 'Label', 'A label beside every work, a price list, and the exhibition text'),
      S('guest_services', 'conditional', 'Invigilate', 'Someone in the room while it is open, which is also the sales desk', { when: [some(ans('invigilation', 'yes'), ans('sale', 'yes'))] }),
      S('catering_food', 'conditional', 'Pour', 'Refreshments at the opening, served away from the work', { when: [some(ans('opening', 'yes'), WHEN_FOOD[0])] }),
      S('photography', 'conditional', 'Document', 'Every work photographed properly, which outlives the exhibition', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Watch', 'Cover for work that is for sale or valuable, including overnight', { when: [some(ans('sale', 'yes'), WHEN_GUARD[0])] }),
      S('decoration_floral', 'conditional', 'Open', 'An entrance and a ribbon for the private view', { when: [ans('opening', 'yes')] }),
      S('sound_av', 'conditional', 'Carry', 'A mic for the opening, and playback for any media works', { when: WHEN_AV }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating in the gallery for visitors who cannot stand', { when: WHEN_ACCESS }),
      S('safety_facilities', 'conditional', 'Service', 'Cleaning during the run, and the de-install after', { when: [some(WHEN_CLEAN[0], WHEN_DAYS[0])] }),
      S('venue', 'conditional', 'Find', 'A space with wall, light and a floor that will take plinths', { when: WHEN_FINDING }),
    ],
    addons: [
      X('hang_plan', 'Place', 'A hanging plan drawn before anything goes on a wall', 'map', { experience: true }),
      X('condition_report', 'Record', 'A condition note for each work, in and out', 'album', { experience: true }),
      X('price_list', 'Sell', 'A price list and a sales process, with the artist’s terms agreed', 'budget', { trade: 'invitation_printing', when: [ans('sale', 'yes')] }),
      X('artist_talk', 'Explain', 'An artist talk during the run, not only at the opening', 'group', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The artists own the work. Sales terms, reproduction and photography are agreed with them in writing before the hang.' },
    timeline: {
      before: ['Hanging plan drawn and agreed with the artists', 'Condition noted for every work on arrival', 'Lighting aimed the evening before the opening'],
      during: ['Private view, then the run with invigilation', 'Labels checked daily — they go missing', 'Sales recorded against the agreed terms'],
      after: ['Every work returned, condition checked against arrival', 'Documentation shared with the artists', 'Space made good'],
    },
    checklist: ['Hanging plan agreed', 'Condition noted on arrival', 'Labels beside every work', 'Sales terms agreed in writing'],
  }),

  B('photography-exhibition', 'Frame', 'Prints on a wall, lit so the blacks stay black.', {
    about: 'Different from an art exhibition in one technical respect that decides everything: glare. Framed prints reflect, so the lighting angle and the glass matter more than the hanging.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS,
      Q('prints', 'How many prints?', 'select', { options: [['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'Up to 150'], ['300', 'More than 150']] }),
      Q('presentation', 'How are they presented?', 'many', { options: [['framed', 'Framed behind glass'], ['mounted', 'Mounted, no glass'], ['large', 'Large format'], ['digital', 'On screens'], ['projection', 'Projected']] }),
      Q('printing', 'Do you need the prints produced and mounted?', 'yesno', { optional: true }),
      Q('sale', 'Are prints for sale?', 'yesno', { optional: true }),
      Q('opening', 'Is there an opening?', 'yesno'),
      AV, ACCESS_NEEDS, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Angle', 'Lighting angled off the glass, because glare ruins a framed print'),
      S('event_equipment_rental', 'recommended', 'Hang', 'Hanging systems, panels and screens set at eye height'),
      S('invitation_printing', 'conditional', 'Produce', 'Prints produced and mounted, plus labels and the price list', { when: [some(ans('printing', 'yes'), WHEN_SIGNED[0])] }),
      S('sound_av', 'conditional', 'Display', 'Screens and projection for digital work', { when: [some(ans('presentation', 'digital', 'projection'), WHEN_AV[0])] }),
      S('guest_services', 'conditional', 'Attend', 'Someone in the room through the run, and at the sales desk', { when: [some(ans('sale', 'yes'), WHEN_DAYS[0])] }),
      S('photography', 'conditional', 'Document', 'The hang and the opening, for the photographer’s own record', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Pour', 'Refreshments at the opening, away from the prints', { when: [some(ans('opening', 'yes'), WHEN_FOOD[0])] }),
      S('decoration_floral', 'conditional', 'Open', 'An entrance for the opening, kept minimal', { when: [ans('opening', 'yes')] }),
      S('security_services', 'conditional', 'Watch', 'Cover for prints that are for sale, including overnight', { when: [some(ans('sale', 'yes'), WHEN_GUARD[0])] }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating for visitors who cannot stand through a long hang', { when: WHEN_ACCESS }),
      S('power_cooling', 'conditional', 'Power', 'Power for screens and projection across the run', { when: [ans('presentation', 'digital', 'projection')] }),
      S('safety_facilities', 'conditional', 'Service', 'Cleaning during the run and the de-install after', { when: [some(WHEN_CLEAN[0], WHEN_DAYS[0])] }),
      S('venue', 'conditional', 'Find', 'A space with wall and controllable light, not a window wall', { when: WHEN_FINDING }),
    ],
    addons: [
      X('glare_check', 'Test', 'Every frame checked for glare from the visitor’s eye line', 'lighting', { experience: true, when: [ans('presentation', 'framed')] }),
      X('print_production', 'Make', 'Prints produced, mounted and framed to one consistent standard', 'craft', { trade: 'invitation_printing', when: [ans('printing', 'yes')] }),
      X('caption_text', 'Tell', 'A caption with each image — where, when and why', 'invite', { trade: 'invitation_printing' }),
      X('edition_terms', 'Define', 'Edition sizes and pricing agreed with the photographer in writing', 'budget', { experience: true, when: [ans('sale', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'The photographer owns the images. Edition terms, reproduction and any use of the work are agreed in writing before the hang.' },
    timeline: {
      before: ['Prints produced and checked for consistency', 'Hang planned at eye height, with glare tested from the visitor’s position', 'Captions written for every image'],
      during: ['Opening, then the run with someone in the room', 'Lighting rechecked daily — bulbs shift', 'Sales recorded against the agreed editions'],
      after: ['Prints returned or delivered to buyers', 'Documentation given to the photographer', 'Space made good'],
    },
    checklist: ['Glare tested from the eye line', 'Captions on every image', 'Edition terms in writing', 'Lighting checked daily'],
  }),

  B('flea-market', 'Browse', 'Rows of stalls, a crowd with cash, and a layout that decides who sells.', {
    about: 'The vendors are the customers. The pitch allocation, the footfall routing and the load-in are what they paid for, and a badly laid-out market is one nobody comes back to.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('stalls', 'How many stalls?', 'select', { options: [['15', 'Up to 15'], ['50', 'Up to 50'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('categories', 'What is being sold?', 'many', { options: [['vintage', 'Vintage and second-hand'], ['craft', 'Handmade and craft'], ['food', 'Food'], ['plants', 'Plants'], ['books', 'Books'], ['clothing', 'Clothing']] }),
      Q('stall_kit', 'Do vendors need tables and canopies provided?', 'yesno'),
      Q('payments', 'How do vendors take payment?', 'one', { optional: true, options: [['own', 'Their own'], ['central', 'A central till'], ['tokens', 'Tokens'], ['digital', 'Digital only']] }),
      GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'conditional', 'Pitch', 'Tables, canopies and marked pitches, laid out in walkable rows', { when: [some(ans('stall_kit', 'yes'), ans('stalls', '50', '120', '300'))] }),
      S('invitation_printing', 'recommended', 'Map', 'Pitch numbers, a market map, signage and vendor information'),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, waste, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding at the gates and across the rows', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls placed where their queue does not block a row', { when: [some(ans('categories', 'food'), WHEN_FOOD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power to the pitches that need it, and lighting if it runs late', { when: [some(WHEN_OUTSIDE[0], ans('categories', 'food'))] }),
      S('guest_services', 'conditional', 'Welcome', 'A gate, an information point and a vendor help desk', { when: [some(WHEN_OPEN[0], WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, shade and seating where people stop', { when: [some(WHEN_OUTSIDE[0], WHEN_ACCESS[0])] }),
      S('photography', 'conditional', 'Record', 'The market and the stalls, for the vendors and for next time', { when: WHEN_SHOT }),
      S('loading_unloading_crew', 'conditional', 'Load', 'A crew for vendor load-in and load-out, to slots', { when: [ans('stalls', '120', '300')] }),
      S('decoration_floral', 'conditional', 'Mark', 'An entrance, bunting and row signage', { when: WHEN_SIGNED }),
      S('venue', 'conditional', 'Secure', 'A ground or hall that can be laid out, permitted and cleared', { when: WHEN_FINDING }),
    ],
    addons: [
      X('pitch_plan', 'Allocate', 'A pitch plan where every row gets real footfall, not just a slot', 'map', { trade: 'invitation_printing' }),
      X('vendor_pack', 'Instruct', 'Load-in times, pitch size, power limits and rules, sent in advance', 'invite', { trade: 'invitation_printing' }),
      X('central_payments', 'Settle', 'A central till and settlement, so no vendor handles cash alone', 'budget', { trade: 'guest_services', when: [ans('payments', 'central', 'tokens')] }),
      X('load_slots', 'Stagger', 'Load-in slots so three hundred vendors do not arrive at once', 'move', { experience: true, when: [ans('stalls', '120', '300')] }),
    ],
    toolkit: { polls: ['date'], note: 'The vendors are the customers. Footfall routing and a fair pitch plan are what they paid for.' },
    timeline: {
      before: ['Pitch plan drawn so every row gets footfall', 'Vendor pack sent with load-in slots and pitch sizes', 'Permissions and waste arrangements confirmed'],
      during: ['Load-in to slots, market finished before the gates open', 'Rows kept clear, queues routed away from walkways', 'Waste collected through the day, not at the end'],
      after: ['Load-out to slots', 'Ground cleared including vendor waste', 'Vendor feedback collected for the next one'],
    },
    checklist: ['Pitch plan with fair footfall', 'Vendor pack issued', 'Load-in slots staggered', 'Waste and washrooms arranged'],
  }),

  B('comic-convention', 'Fandom', 'Halls, panels, artists and a queue that forms before the doors open.', {
    about: 'Several events running at once: an exhibition floor, a panel programme, an artist alley and a cosplay contest. The programme clashes and the queue management are the hard parts.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('zones', 'What is in it?', 'many', { options: [['floor', 'An exhibition floor'], ['artist_alley', 'Artist alley'], ['panels', 'Panels and talks'], ['guests', 'Celebrity guests'], ['cosplay', 'A cosplay contest'], ['gaming', 'Gaming areas']] }),
      Q('exhibitors', 'How many exhibitors and artists?', 'select', { options: [['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'Up to 150'], ['400', 'More than 150']] }),
      Q('panel_rooms', 'How many panel rooms?', 'select', { options: [['0', 'None'], ['1', 'One'], ['3', 'Three'], ['6', 'Six or more']] }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'Exhibition stands, artist tables, panel rooms and the queue lines'),
      S('guest_services', 'recommended', 'Queue', 'Entry, badge issue and queue management, which starts before doors'),
      S('invitation_printing', 'recommended', 'Guide', 'Badges, a floor plan, the panel schedule and zone signage'),
      S('security_services', 'conditional', 'Marshal', 'Door, floor and guest-area security against a counted capacity', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], ans('zones', 'guests'))] }),
      S('sound_av', 'conditional', 'Equip', 'Sound and screens in every panel room, and a floor PA', { when: [some(ans('panel_rooms', '1', '3', '6'), WHEN_AV[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning through the day, first aid and a quiet room', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_ACCESS[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power to every stand and cooling for a full hall', { when: [some(ans('zones', 'gaming', 'floor'), WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Floor lighting and a stage look for the cosplay contest', { when: [some(WHEN_LIT[0], ans('zones', 'cosplay'))] }),
      S('photography', 'conditional', 'Cover', 'The floor, the panels and the cosplay, with consent respected', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for a crowd that will not leave the building all day', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Theme', 'Entrance, zone branding and sponsor presence', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across several days and halls', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Secure', 'A hall with the floor area, the load-in and the panel rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('queue_management', 'Order', 'Queue lines designed before the day, including the pre-doors queue', 'map', { trade: 'guest_services' }),
      X('panel_schedule', 'Programme', 'A schedule built so the big panels do not clash with each other', 'schedule', { trade: 'invitation_printing', when: [ans('panel_rooms', '1', '3', '6')] }),
      X('cosplay_policy', 'Set rules', 'A costume and prop policy, published and checked at the door', 'dress', { experience: true, when: [ans('zones', 'cosplay')] }),
      X('quiet_room', 'Decompress', 'A quiet, low-sensory room, signposted on the map', 'bed', { trade: 'safety_facilities', when: WHEN_ACCESS }),
    ],
    toolkit: { polls: ['date'], note: 'Artists in the alley own their work. A photography and reproduction policy is published and enforced on the floor.' },
    timeline: {
      before: ['Floor plan and queue lines drawn, including the pre-doors queue', 'Panel schedule built to avoid clashes', 'Prop and costume policy published'],
      during: ['Queue managed from before doors, badges issued fast', 'Panels to time, rooms cleared between', 'Quiet room and first aid signposted'],
      after: ['Load-out to slots', 'Artist settlement and feedback', 'Hall reinstated'],
    },
    checklist: ['Floor plan with queue lines', 'Panel schedule without clashes', 'Prop policy published', 'Quiet room and first aid signposted'],
  }),

  B('gaming-convention', 'Compete', 'Hundreds of machines, every one of them needing power and a network that holds.', {
    about: 'A comic convention where the infrastructure is the event. Power per seat, wired network for the tournaments, and a stage with a stream — if any of those drop, the day stops.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('zones', 'What is in it?', 'many', { options: [['tournament', 'Tournaments'], ['freeplay', 'Free-play stations'], ['console', 'Console areas'], ['vr', 'VR'], ['tabletop', 'Tabletop gaming'], ['exhibitors', 'Exhibitor stands']] }),
      Q('stations', 'How many playable stations?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      Q('network', 'What does the network need to handle?', 'many', { options: [['lan', 'Wired LAN for tournaments'], ['wifi', 'Public wifi'], ['stream', 'Live streaming'], ['online', 'Online match servers']] }),
      Q('mainstage', 'Is there a main stage with a stream?', 'yesno'),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Power per station with redundancy, and cooling for a full hall'),
      S('event_equipment_rental', 'recommended', 'Set', 'Station tables, chairs, stage, exhibitor stands and cable management'),
      S('sound_av', 'conditional', 'Broadcast', 'Main stage screens, commentary audio and the stream chain', { when: [some(ans('mainstage', 'yes'), WHEN_AV[0])] }),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, station numbers, brackets, a floor plan and signage'),
      S('guest_services', 'recommended', 'Register', 'Entry, badge issue, tournament check-in and a help desk'),
      S('security_services', 'conditional', 'Secure', 'Floor security and overnight cover for equipment left out', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning, first aid and a quiet room', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_ACCESS[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Stage lighting for the stream, and working light on the floor', { when: [some(WHEN_LIT[0], ans('mainstage', 'yes'))] }),
      S('catering_food', 'conditional', 'Fuel', 'Food through the day for people who will not leave their station', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Cover', 'The floor, the finals and the exhibitors, for the sponsors', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Zone branding and sponsor presence across the hall', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across several days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Secure', 'A hall with the power, the cooling and the network capacity', { when: WHEN_FINDING }),
    ],
    addons: [
      X('wired_lan', 'Connect', 'Wired drops for the tournaments, load-tested at full capacity', 'power_cooling', { trade: 'power_cooling', when: [ans('network', 'lan', 'online')] }),
      X('stream_chain', 'Broadcast', 'The full stream chain tested end to end before doors', 'media', { trade: 'sound_av', when: [ans('network', 'stream')] }),
      X('bracket_system', 'Seed', 'Brackets run on real software, published and updated live', 'poll', { trade: 'invitation_printing', when: [ans('zones', 'tournament')] }),
      X('cable_safety', 'Tidy', 'Cable matting and management across every walkway', 'map', { trade: 'event_equipment_rental' }),
    ],
    toolkit: { polls: ['date'], note: 'Load-test the power and the network with the real number of machines. A gaming convention fails at the distribution board, not on the stage.' },
    timeline: {
      before: ['Power and network sized per station and load-tested', 'Stream chain tested end to end', 'Brackets published and check-in process agreed'],
      during: ['Stations powered and tested before doors', 'Tournaments to the published bracket', 'Cables matted, walkways kept clear'],
      after: ['Equipment reconciled and returned', 'Results and streams published', 'Hall reinstated'],
    },
    checklist: ['Power sized and load-tested', 'Network tested at full load', 'Stream chain tested', 'Cable matting across walkways'],
  }),

  B('auto-expo', 'Display', 'Vehicles on a floor, which is a load-in problem before it is anything else.', {
    about: 'Everything here starts with weight and access: cars have to be driven in, parked on a floor that will take them, and driven out. The display is the easy part.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('vehicles', 'How many vehicles?', 'select', { options: [['5', 'Up to 5'], ['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'More than 60']] }),
      Q('kinds', 'What kinds?', 'many', { options: [['cars', 'Cars'], ['bikes', 'Motorcycles'], ['commercial', 'Commercial vehicles'], ['classic', 'Classic and vintage'], ['ev', 'Electric vehicles'], ['concept', 'Concept vehicles']] }),
      Q('access', 'Can vehicles be driven into the space?', 'one', { options: [['drive', 'Yes, driven in'], ['ramp', 'Only via a ramp'], ['crane', 'They need lifting'], ['unsure', 'Not sure']] }),
      Q('charging', 'Do any vehicles need charging or fuelling on site?', 'yesno', { optional: true }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Platform', 'Turntables, platforms, barriers and stand builds that take the weight'),
      S('event_lighting', 'recommended', 'Light', 'Lighting aimed off the paint, because a car is a mirror'),
      S('power_cooling', 'conditional', 'Supply', 'Power to every stand, and charging where vehicles need it', { when: [some(ans('charging', 'yes'), WHEN_BIG[0])] }),
      S('security_services', 'conditional', 'Guard', 'Floor security and overnight cover for vehicles left on site', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('invitation_printing', 'recommended', 'Label', 'Spec boards per vehicle, a floor plan, badges and signage'),
      S('guest_services', 'conditional', 'Receive', 'Entry, badges and hosts who can answer a question about a car', { when: [some(WHEN_TICKETED[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning, first aid and fuel-safety cover on the floor', { when: [some(WHEN_AID[0], WHEN_BIG[0], ans('charging', 'yes'))] }),
      S('sound_av', 'conditional', 'Present', 'Screens, a reveal stage and a floor PA', { when: WHEN_AV }),
      S('photography', 'conditional', 'Shoot', 'Vehicles photographed properly, which needs its own lighting time', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Vehicle move-in and move-out to slots, with marshals', { when: [ans('vehicles', '20', '60', '150')] }),
      S('decoration_floral', 'conditional', 'Brand', 'Stand builds, zone branding and sponsor presence', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food courts for visitors and crew catering for the build', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating in the hall for visitors who cannot walk a full floor', { when: WHEN_ACCESS }),
      S('venue', 'conditional', 'Secure', 'A hall with floor loading, a vehicle ramp and a wide get-in', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_loading', 'Verify', 'Floor loading confirmed in writing before a vehicle goes on it', 'schedule', { experience: true }),
      X('move_marshals', 'Marshal', 'Marshals and a cleared route for every vehicle movement', 'map', { trade: 'end_to_end_event_logistics', when: [ans('access', 'drive', 'ramp')] }),
      X('spec_boards', 'Specify', 'A printed spec board beside every vehicle, checked by the brand', 'invite', { trade: 'invitation_printing' }),
      X('detailing', 'Finish', 'Vehicles cleaned and detailed on the floor before doors each day', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'Floor loading, ramp access and fuel safety are confirmed in writing before any vehicle is moved in.' },
    timeline: {
      before: ['Floor loading and ramp access confirmed in writing', 'Move-in slots issued per vehicle with a marshalled route', 'Lighting aimed off the paint and tested'],
      during: ['Vehicles moved only under marshal supervision', 'Floor cleaned and vehicles detailed before doors each day', 'Overnight security on the floor'],
      after: ['Move-out to slots with marshals', 'Vehicles reconciled against the manifest', 'Hall reinstated'],
    },
    checklist: ['Floor loading confirmed', 'Marshalled move-in route', 'Spec boards per vehicle', 'Overnight cover arranged'],
  }),

  B('fireworks-show', 'Witness', 'A licensed operator fires it. We plan the crowd, the distance and the way home.', {
    about: 'We do not supply, store, handle or arrange pyrotechnics, and we will not put a display on a plan as something we provide. Where you engage a licensed operator, this plan covers what surrounds it: the exclusion zone, the crowd, the medical cover and the exit.',
    formats: ['outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, PERMITS,
      Q('operator', 'Is a licensed pyrotechnics operator engaged?', 'one', {
        options: [['yes', 'Yes, licensed and insured'], ['finding', 'We are still finding one'], ['no', 'No'], ['unsure', 'Not sure']],
        help: 'The display is theirs. We never supply, store or handle pyrotechnics, and we plan only what surrounds it.',
      }),
      Q('zone', 'Has the operator set an exclusion zone and a firing position?', 'one', {
        optional: true, options: [['yes', 'Yes, in writing'], ['no', 'Not yet'], ['unsure', 'Not sure']],
      }),
      Q('notified', 'Have the fire service and local authority been notified?', 'one', {
        optional: true, options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
      }),
      Q('viewing', 'How are people watching?', 'one', { options: [['ground', 'Standing on a ground'], ['seated', 'Seated'], ['rooftop', 'From rooftops or terraces'], ['waterfront', 'Across water'], ['dispersed', 'Dispersed across an area']] }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('security_services', 'recommended', 'Hold', 'The exclusion zone held, the crowd behind it, the exit managed'),
      S('safety_facilities', 'recommended', 'Cover', 'Medical posts, an ambulance route, washrooms and the clear-up after'),
      S('event_equipment_rental', 'recommended', 'Barrier', 'Barriers marking the exclusion zone and the viewing line'),
      S('guest_services', 'conditional', 'Marshal', 'Stewards on the viewing line and on the route out afterwards', { when: [some(WHEN_OPEN[0], WHEN_BIG[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA that can reach the whole crowd, including for an abort', { when: [some(WHEN_PA[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting on the routes and the exits, up before and after the display', { when: [some(WHEN_LIT[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Inform', 'Viewing maps, timings, exit routes and safety notices', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('photography', 'conditional', 'Record', 'From a position agreed with the operator, outside the zone', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating and an accessible viewing area at a safe distance', { when: [some(ans('viewing', 'seated'), WHEN_ACCESS[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Stalls placed well away from the exclusion zone and the exit routes', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA and the route lighting', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Assess', 'A ground with the distance the operator requires, and real exits', { when: WHEN_FINDING }),
    ],
    addons: [
      X('exclusion_zone', 'Mark it', 'The operator’s exclusion zone marked, barriered and stewarded', 'map', { trade: 'security_services' }),
      X('exit_plan', 'Disperse', 'A written exit plan for the minute it ends, when everyone leaves at once', 'schedule', { experience: true }),
      X('authority_notice', 'Notify', 'Fire service and local authority notified, confirmed in writing', 'phone', { experience: true, when: [ans('notified', 'no', 'help')] }),
      X('weather_abort', 'Call it', 'A wind and weather abort threshold agreed with the operator', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We do not supply, store, handle or arrange pyrotechnics. The display is the licensed operator’s and so is its safety; we plan the crowd, the exclusion zone and the way out.' },
    timeline: {
      before: ['Licensed, insured operator engaged and their exclusion zone received in writing', 'Fire service and local authority notified', 'Exit plan written for the moment it finishes'],
      during: ['Exclusion zone held and stewarded from before the crowd arrives', 'PA able to reach everyone, including to abort', 'Medical cover in position before the first shell'],
      after: ['Crowd dispersed on the planned routes, with lighting up', 'Ground cleared, including fallout, by the operator and the crew', 'Incident log completed'],
    },
    checklist: ['Licensed operator engaged and insured', 'Exclusion zone in writing and barriered', 'Fire service and authority notified', 'Exit plan for the dispersal'],
  }),

  B('public-carnival', 'Parade', 'Floats, a route and a crowd standing on both sides of it.', {
    about: 'A moving event, which makes it unlike anything else here. The route, the road closures and the stewarding along it are the plan; the floats are the content.',
    formats: ['outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, PERMITS,
      Q('parade', 'Is there a procession or parade?', 'yesno'),
      Q('route_length', 'How long is the route?', 'select', { optional: true, when: [ans('parade', 'yes')], options: [['500', 'Up to 500 metres'], ['2', 'Up to 2 kilometres'], ['5', 'Up to 5 kilometres'], ['long', 'Longer']] }),
      Q('floats', 'How many floats or groups?', 'select', { options: [['5', 'Up to 5'], ['15', 'Up to 15'], ['40', 'Up to 40'], ['80', 'More than 40']] }),
      Q('elements', 'What else is on?', 'many', { options: [['stage', 'A stage'], ['stalls', 'Stalls'], ['kids', 'A children’s area'], ['performers', 'Street performers'], ['sport', 'Games'], ['market', 'A market']] }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('security_services', 'recommended', 'Line', 'Stewarding along the whole route, not only at the start and end'),
      S('safety_facilities', 'recommended', 'Cover', 'Medical posts along the route, washrooms, water and the clear-up'),
      S('event_equipment_rental', 'recommended', 'Barrier', 'Barriers along the route, the assembly area and the stage'),
      S('invitation_printing', 'recommended', 'Map', 'Route maps, closure notices, running order and marshal briefings'),
      S('sound_av', 'conditional', 'Carry', 'A PA at the stage, and amplification along the route', { when: [some(WHEN_PA[0], ans('elements', 'stage'))] }),
      S('live_entertainment', 'conditional', 'Fill', 'Street performers and stage acts across the day', { when: [ans('elements', 'performers', 'stage')] }),
      S('guest_services', 'conditional', 'Marshal', 'Marshals at every junction, briefed on the route and the timings', { when: [some(ans('parade', 'yes'), WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Stalls placed off the route, so queues never block it', { when: [some(ans('elements', 'stalls'), WHEN_FOOD[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Generators at the stage and along the route where needed', { when: [some(WHEN_OUTSIDE[0], ans('elements', 'stage'))] }),
      S('transportation', 'conditional', 'Move', 'Vehicles and towing for the floats, to and from the assembly area', { when: [ans('floats', '15', '40', '80')] }),
      S('photography', 'conditional', 'Follow', 'The parade along the route, not from one fixed point', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Rest', 'Shade, seating and an accessible viewing point on the route', { when: [some(WHEN_ACCESS[0], WHEN_BIG[0])] }),
      S('decoration_floral', 'conditional', 'Dress', 'Route dressing, the start gateway and the finish', { when: WHEN_SIGNED }),
      S('venue', 'conditional', 'Secure', 'An assembly ground and a finish area, permitted and fenced', { when: WHEN_FINDING }),
    ],
    addons: [
      X('route_plan', 'Walk it', 'The whole route walked with the marshals and the authority first', 'map', { experience: true, when: [ans('parade', 'yes')] }),
      X('road_closures', 'Close', 'Closure notices to residents and businesses on the route, in advance', 'invite', { trade: 'invitation_printing', when: [ans('parade', 'yes')] }),
      X('float_marshals', 'Pace', 'A marshal per float, keeping spacing and pace along the route', 'group', { trade: 'guest_services', when: [ans('floats', '15', '40', '80')] }),
      X('accessible_point', 'Include', 'A reserved accessible viewing point with a step-free route', 'spa', { trade: 'event_equipment_rental', when: WHEN_ACCESS }),
    ],
    toolkit: { polls: ['date'], note: 'Road closures, route permissions and stewarding are the organiser’s. We never treat a route as closed until it is confirmed in writing.' },
    timeline: {
      before: ['Route walked with the marshals and the authority, closures confirmed', 'Residents and businesses on the route notified in advance', 'Assembly area and float spacing planned'],
      during: ['Marshals at every junction before the parade moves', 'Spacing and pace held so the route does not concertina', 'Medical cover along the route, not just at the ends'],
      after: ['Route cleared and reopened to schedule', 'Floats returned from the finish area', 'Incident log completed'],
    },
    checklist: ['Route walked and closures confirmed', 'Residents notified', 'Marshal at every junction', 'Medical cover along the route'],
  }),

  B('street-performance-festival', 'Pitch', 'Performers on marked pitches, and a public that did not buy a ticket.', {
    about: 'The audience is whoever is walking past, which makes the pitch plan everything: sightlines, crowd overspill into traffic, and enough distance that two acts do not fight each other’s sound.',
    formats: ['outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('pitches', 'How many performance pitches?', 'select', { options: [['3', 'Up to 3'], ['8', 'Up to 8'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      Q('acts', 'What kinds of act?', 'many', { options: [['circus', 'Circus and acrobatics'], ['music', 'Music'], ['mime', 'Mime and clowning'], ['puppetry', 'Puppetry'], ['dance', 'Dance'], ['walkabout', 'Walkabout characters']] }),
      Q('aerial', 'Is any act aerial, fire or otherwise high-risk?', 'yesno', {
        help: 'High-risk acts need their own risk assessment, rigging check and insurance. We never arrange fire effects.',
      }),
      Q('collections', 'Do performers collect from the audience?', 'yesno', { optional: true }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('security_services', 'recommended', 'Keep clear', 'Stewards at each pitch, keeping crowds out of the road'),
      S('event_equipment_rental', 'recommended', 'Mark', 'Pitch markings, barriers, rigging points and the crowd line'),
      S('safety_facilities', 'recommended', 'Cover', 'First aid across the site, washrooms, water and the clear-up'),
      S('invitation_printing', 'recommended', 'Schedule', 'Pitch maps, performance times, signage and performer information'),
      S('sound_av', 'conditional', 'Separate', 'Sound per pitch, set so two pitches never fight each other', { when: [some(WHEN_PA[0], ans('acts', 'music', 'dance'))] }),
      S('live_entertainment', 'conditional', 'Programme', 'Acts booked across the pitches and across the day', { when: [has('acts')] }),
      S('guest_services', 'conditional', 'Marshal', 'Stewards rotating between pitches as crowds build and move', { when: [some(WHEN_OPEN[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power to the pitches that need it', { when: [some(WHEN_OUTSIDE[0], WHEN_PA[0])] }),
      S('photography', 'conditional', 'Capture', 'Every act across the pitches, with the performers’ agreement', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Stalls placed away from pitches, so crowds do not merge', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating, shade and accessible viewing at the larger pitches', { when: [some(WHEN_ACCESS[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Pitch lighting for performances after dark', { when: [some(WHEN_LIT[0], WHEN_DAYS[0])] }),
      S('venue', 'conditional', 'Permit', 'A street or public space with permissions and a workable layout', { when: WHEN_FINDING }),
    ],
    addons: [
      X('pitch_plan', 'Space', 'Pitches placed so sound does not clash and crowds do not merge', 'map', { trade: 'invitation_printing' }),
      X('risk_assessments', 'Assess', 'A risk assessment and insurance certificate from every high-risk act', 'schedule', { experience: true, when: [ans('aerial', 'yes')] }),
      X('rigging_check', 'Inspect', 'Rigging points inspected by someone who did not install them', 'event_equipment_rental', { trade: 'event_equipment_rental', when: [ans('aerial', 'yes')] }),
      X('collection_policy', 'Agree', 'A written policy on performer collections and pitch fees', 'budget', { experience: true, when: [ans('collections', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'High-risk acts bring their own risk assessment and insurance, and we never arrange fire or pyrotechnic effects.' },
    timeline: {
      before: ['Pitch plan drawn for sightlines, sound separation and crowd overspill', 'Risk assessments and insurance collected from every high-risk act', 'Street permissions and timings confirmed'],
      during: ['Stewards at each pitch keeping the crowd out of the road', 'Rotation so crowds do not build in one place', 'Rigging rechecked before each aerial performance'],
      after: ['Pitches cleared and the street reinstated', 'Performer settlement', 'Incident log completed'],
    },
    checklist: ['Pitch plan for sound and crowd', 'Risk assessments from high-risk acts', 'Rigging inspected independently', 'Stewards at every pitch'],
  }),

  B('dance-festival', 'Programme', 'Companies, styles and stages, with a floor that has to survive all of them.', {
    about: 'A festival of dance means many companies sharing one floor and one changeover schedule. The surface, the wings and the technical turnaround between companies are the difficulty.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('companies', 'How many companies or groups?', 'select', { options: [['4', 'Up to 4'], ['12', 'Up to 12'], ['30', 'Up to 30'], ['60', 'More than 30']] }),
      Q('styles', 'Which styles?', 'many', { options: [['classical', 'Classical'], ['folk', 'Folk'], ['contemporary', 'Contemporary'], ['street', 'Street'], ['ballet', 'Ballet'], ['fusion', 'Fusion']] }),
      Q('floor', 'Does the floor need a dance surface?', 'yesno', { help: 'A hard or uneven stage is an injury. This is a safety question.' }),
      Q('dressing', 'How many dressing rooms are needed?', 'select', { options: [['2', 'Two'], ['4', 'Four'], ['8', 'Eight'], ['15', 'More than eight']] }),
      Q('workshops', 'Are there workshops or masterclasses?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, AID, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Lay', 'A dance surface, stage, wings and the dressing-room build'),
      S('event_lighting', 'recommended', 'Plot', 'A plot that can be reset between companies without a full re-rig'),
      S('sound_av', 'recommended', 'Cue', 'Playback and monitors, with every company’s track collected in advance'),
      S('tent_furniture', 'conditional', 'House', 'Dressing rooms with mirrors and rails, and accessible house seating', { when: [some(ans('dressing', '4', '8', '15'), WHEN_ACCESS[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Makeup and hair backstage between companies', { when: [ans('styles', 'classical', 'folk', 'ballet', 'fusion')] }),
      S('guest_services', 'conditional', 'Receive', 'Company liaison, front of house and the workshop desk', { when: [some(ans('companies', '12', '30', '60'), ans('workshops', 'yes'))] }),
      S('invitation_printing', 'conditional', 'Programme', 'Running order, programmes crediting every dancer, and signage', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('photography', 'conditional', 'Capture', 'Every company, at the top of the movement', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Archive', 'A fixed front record per company, with their agreement', { when: WHEN_FILM }),
      S('catering_food', 'conditional', 'Feed', 'Food for companies who arrive in the morning and leave at night', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Treat', 'First aid for strains, washrooms and the get-out', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], ans('floor', 'yes'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'A crew across several days and many changeovers', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A stage with depth, wings, and a floor that can be covered', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_surface', 'Protect', 'A laid dance surface, which is the main injury prevention here', 'game', { trade: 'event_equipment_rental', when: [ans('floor', 'yes')] }),
      X('changeover_schedule', 'Turn around', 'A rehearsed changeover between companies, with a stage manager', 'schedule', { experience: true }),
      X('track_collection', 'Collect', 'Every company’s music collected and tested the day before', 'media', { trade: 'sound_av' }),
      X('workshop_rooms', 'Teach', 'Rooms with surfaces and mirrors for the masterclasses', 'spa', { trade: 'event_equipment_rental', when: [ans('workshops', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'The floor is a safety item. A laid surface stays on the plan for any hard or uneven stage.' },
    timeline: {
      before: ['Floor inspected and a surface arranged if needed', 'Every company’s track collected and tested the day before', 'Dressing rooms allocated and changeovers scheduled'],
      during: ['Stage manager calling every changeover', 'Dressing rooms by company, to the allocation', 'First aid available for strains throughout'],
      after: ['Floor lifted and the stage cleared', 'Records sent to each company', 'Venue restored'],
    },
    checklist: ['Dance surface arranged if needed', 'Tracks collected in advance', 'Dressing rooms allocated', 'Changeovers scheduled and rehearsed'],
  }),

  B('literary-festival', 'Converse', 'Writers, readers and a programme of conversations across several rooms.', {
    about: 'The least technical festival in the catalogue and the most dependent on scheduling. Rooms, session clashes, a bookshop that can actually take payment, and signing queues that do not block a corridor.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('sessions', 'How many sessions?', 'select', { options: [['6', 'Up to 6'], ['20', 'Up to 20'], ['60', 'Up to 60'], ['120', 'More than 60']] }),
      Q('rooms_count', 'How many venues or rooms?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      Q('elements', 'What else is on?', 'many', { options: [['bookshop', 'A bookshop'], ['signings', 'Signings'], ['workshops', 'Workshops'], ['children', 'A children’s programme'], ['translation', 'Sessions in several languages'], ['awards', 'A prize or award']] }),
      Q('authors_travel', 'Are authors travelling in?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, GUARD, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'Mics in every room, matched so no room is the bad one'),
      S('invitation_printing', 'recommended', 'Publish', 'The programme, room signage, session cards and the festival map'),
      S('guest_services', 'recommended', 'Direct', 'Entry, room marshals, author liaison and the signing queue'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating per room, with accessible places held in every one', { when: [some(ans('rooms_count', '2', '4', '8'), WHEN_ACCESS[0])] }),
      S('event_equipment_rental', 'conditional', 'Fit out', 'Stages, panel seating, bookshop fittings and signing tables', { when: [some(ans('elements', 'bookshop', 'signings'), WHEN_STAGE[0])] }),
      S('catering_food', 'conditional', 'Feed', 'A café, and green-room food for authors between sessions', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Sessions recorded, with each author’s written agreement', { when: [some(WHEN_RECORDED[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Cover', 'Sessions, signings and the festival across every room', { when: WHEN_SHOT }),
      S('passenger_transport', 'conditional', 'Collect', 'Transfers for authors between hotel, station and venues', { when: [ans('authors_travel', 'yes')] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning across the days and a quiet space', { when: [some(WHEN_DAYS[0], WHEN_ACCESS[0])] }),
      S('decoration_floral', 'conditional', 'Mark', 'Festival identity across the venues and sponsor presence', { when: [some(WHEN_SPONSOR[0], WHEN_SIGNED[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding at entry and in the busiest rooms', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'Venues close enough together that an audience will walk between them', { when: WHEN_FINDING }),
    ],
    addons: [
      X('session_schedule', 'Avoid clashes', 'A programme built so the big sessions do not run against each other', 'schedule', { trade: 'invitation_printing' }),
      X('signing_queue', 'Order', 'A signing queue designed so it does not block the next session', 'group', { trade: 'guest_services', when: [ans('elements', 'signings')] }),
      X('bookshop_till', 'Sell', 'A bookshop with real stock control and working payment', 'budget', { trade: 'event_equipment_rental', when: [ans('elements', 'bookshop')] }),
      X('author_green_room', 'Host', 'A green room with food, quiet and a schedule on the wall', 'bed', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Authors own what they say and write. Sessions are recorded only with their written agreement.' },
    timeline: {
      before: ['Programme built to avoid clashes between the big sessions', 'Author travel, hotels and session times confirmed', 'Bookshop stock ordered against the programme'],
      during: ['Room marshals holding session times', 'Signing queues routed away from room entrances', 'Green room staffed and stocked all day'],
      after: ['Recordings published only where agreed', 'Bookshop reconciled and unsold stock returned', 'Venues restored'],
    },
    checklist: ['Programme without clashes', 'Author travel confirmed', 'Bookshop stock and payment ready', 'Signing queue routed'],
  }),

  B('book-launch', 'Publish', 'One book, an author who has not done this before, and a table of copies to sign.', {
    about: 'Small, warm and easy to get wrong in one specific way: running out of books, or having two hundred left. The stock number is the decision the whole evening rests on.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('format', 'What shape is the evening?', 'one', { options: [['reading', 'A reading'], ['conversation', 'A conversation with a host'], ['panel', 'A panel'], ['launch', 'Speeches and a launch'], ['signing', 'Mostly signing']] }),
      Q('stock', 'Are books being sold on the night?', 'yesno'),
      Q('copies', 'How many copies will be available?', 'select', { optional: true, when: [ans('stock', 'yes')], options: [['25', 'Up to 25'], ['75', 'Up to 75'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      Q('press', 'Is press invited?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('sound_av', 'conditional', 'Carry', 'A mic that lets a quiet author be heard at the back', { when: [some(WHEN_PA[0], ans('format', 'reading', 'conversation', 'panel'))] }),
      S('tent_furniture', 'recommended', 'Seat', 'Seating faced at the author, with a signing table set apart'),
      S('invitation_printing', 'conditional', 'Announce', 'Invitations, bookmarks, press material and signage', { when: [some(WHEN_SIGNED[0], ans('press', 'yes'))] }),
      S('event_equipment_rental', 'conditional', 'Set', 'A signing table, a stock table and a small riser', { when: [ans('stock', 'yes')] }),
      S('catering_food', 'conditional', 'Pour', 'Refreshments, served after the reading rather than during it', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Receive', 'A door list, and someone running the signing queue and the till', { when: [some(ans('stock', 'yes'), WHEN_TICKETED[0])] }),
      S('photography', 'conditional', 'Record', 'The author, the reading and the signing — images they will reuse', { when: WHEN_SHOT }),
      S('anchor_mc', 'conditional', 'Introduce', 'A host for the conversation, which most authors prefer to a monologue', { when: [ans('format', 'conversation', 'panel', 'launch')] }),
      S('event_lighting', 'conditional', 'Light', 'A warm light on the author, enough to read by', { when: WHEN_LIT }),
      S('decoration_floral', 'optional', 'Dress', 'A simple set with the cover, which is the only branding needed'),
      S('venue', 'conditional', 'Find', 'A bookshop or small room — a half-empty hall is the risk here', { when: WHEN_FINDING }),
    ],
    addons: [
      X('stock_plan', 'Count', 'Stock agreed with the publisher, with a sale-or-return arrangement', 'budget', { experience: true, when: [ans('stock', 'yes')] }),
      X('signing_setup', 'Sign', 'A signing table with pens, sticky notes for names, and water', 'album', { trade: 'event_equipment_rental', when: [ans('stock', 'yes')] }),
      X('reading_rehearsal', 'Practise', 'The author reading the extract aloud once, on the mic, beforehand', 'schedule', { experience: true }),
      X('press_copies', 'Supply', 'Review copies and a press release ready on the night', 'invite', { trade: 'invitation_printing', when: [ans('press', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Agree the stock number and a sale-or-return with the publisher. Running out and over-ordering are both avoidable.' },
    timeline: {
      before: ['Stock agreed with the publisher, sale-or-return in writing', 'Author reads the extract once on the mic beforehand', 'Room chosen small enough to feel full'],
      during: ['Reading or conversation, short', 'Signing queue managed, with names written down for spellings', 'Refreshments after, not during'],
      after: ['Unsold stock returned under the agreement', 'Images sent to the author and the publisher', 'Press copies dispatched'],
    },
    checklist: ['Stock agreed with sale-or-return', 'Author rehearsed on the mic', 'Signing table set up properly', 'Room small enough to feel full'],
  }),

  B('awards-ceremony', 'Confer', 'A public awards night, where the judging has to look as fair as it was.', {
    about: 'A public awards ceremony lives or dies on credibility. The judging process, the shortlist and the result handling matter more than the room, and the room still has to look like it mattered.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('categories', 'How many categories?', 'select', { options: [['8', 'Up to 8'], ['20', 'Up to 20'], ['45', 'Up to 45'], ['80', 'More than 45']] }),
      Q('judging', 'How is it judged?', 'one', { options: [['panel', 'A judging panel'], ['public', 'Public vote'], ['both', 'Panel and public vote'], ['editorial', 'Editorial selection']] }),
      Q('shortlist', 'Is a shortlist announced in advance?', 'yesno', { optional: true }),
      CHIEF_GUEST, AWARDS, DRESS_CODE,
      AV, GUARD, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Preside', 'A host who can carry forty-five envelopes and still hold the room'),
      S('sound_av', 'recommended', 'Run', 'Mics, a nomination screen, and cues that land on the right name'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting built for the camera and the handover moment'),
      S('decoration_floral', 'recommended', 'Set', 'A stage and a room that make the award look worth winning'),
      S('gifts_favours', 'conditional', 'Make', 'Trophies, engraved, checked and sorted in calling order', { when: WHEN_TROPHY }),
      S('invitation_printing', 'conditional', 'Publish', 'Invitations, the shortlist, citations, seat cards and certificates', { when: [some(WHEN_PRINTED[0], ans('shortlist', 'yes'), WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Capture', 'Every handover, plus a portrait of each winner', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The ceremony filmed, with each winner cut for sharing', { when: [some(WHEN_FILM[0], WHEN_RECORDED[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, podium, screen, press wall and a route up and down', { when: WHEN_STAGE }),
      S('guest_services', 'recommended', 'Seat', 'Seating by category block, so a winner can reach the stage'),
      S('catering_food', 'conditional', 'Host', 'Dinner or a reception, timed around the awards and not through them', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Furnish', 'Round tables or theatre seating, with accessible places held', { when: [some(WHEN_ACCESS[0], WHEN_FINDING[0])] }),
      S('security_services', 'conditional', 'Control', 'Door control, and a secure place for the trophies before the show', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A room with a real stage and a foyer for the arrivals', { when: WHEN_FINDING }),
    ],
    addons: [
      X('judging_process', 'Show the working', 'The judging method, panel and criteria published before entries close', 'poll', { experience: true }),
      X('winner_portraits', 'Portrait', 'A portrait of every winner, taken and printed on the night', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('runtime_budget', 'Time it', 'Ninety seconds per award, and the order built to that number', 'schedule', { experience: true }),
      X('result_security', 'Keep it', 'Results sealed and held by one named person until the envelope', 'gift', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the judging method, the panel and the criteria before entries close. Credibility is the product here.' },
    timeline: {
      before: ['Judging method, panel and criteria published before entries close', 'Results sealed and held by one named person', 'Runtime budgeted per award and the order built to it'],
      during: ['Arrivals and seating by category block', 'Awards in blocks, portraits taken as winners come off', 'Results handled only by the named person'],
      after: ['Winners and the full shortlist published with the criteria', 'Absent winners’ trophies delivered', 'Images and film released'],
    },
    checklist: ['Judging method published', 'Results sealed and controlled', 'Runtime budgeted per award', 'Seating by category block'],
  }),

  B('charity-gala', 'Raise', 'A formal evening whose only real measure is the number at the end of it.', {
    about: 'Everything spent on the room is money not raised, and a gala that looks magnificent and raises little has failed. The plan is built around the ask: the auction, the pledge moment and the cost-to-raise ratio.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('cause', 'What is being raised for?', 'text', { max: 120 }),
      Q('target', 'Is there a target?', 'text', { optional: true, max: 40 }),
      Q('methods', 'How is money raised on the night?', 'many', { options: [['tickets', 'Ticket sales'], ['auction', 'A live auction'], ['silent', 'A silent auction'], ['pledge', 'A pledge moment'], ['raffle', 'A raffle'], ['sponsor', 'Sponsorship']] }),
      Q('programme', 'What is in the evening?', 'many', { options: [['dinner', 'A dinner'], ['speeches', 'Speeches'], ['entertainment', 'Entertainment'], ['beneficiary', 'A beneficiary speaking'], ['awards', 'Awards']] }),
      DIET_ONLY, ALLERGY_ONLY, DRESS_CODE,
      AV, ACCESS_NEEDS, PHOTOS, SIGNAGE, SPONSORS,
    ],
    plan: [
      S('catering_food', 'conditional', 'Host', 'A dinner that justifies the ticket, served to every dietary need', { when: [ans('programme', 'dinner')] }),
      S('anchor_mc', 'recommended', 'Ask', 'A host who can run an auction and make a pledge moment work'),
      S('sound_av', 'recommended', 'Carry', 'Sound for the ask and a screen that shows the total rising'),
      S('event_lighting', 'recommended', 'Set', 'Lighting that makes the room feel like the ticket price'),
      S('decoration_floral', 'recommended', 'Dress', 'Table and room dressing, judged against what it costs to raise'),
      S('invitation_printing', 'conditional', 'Equip', 'Invitations, auction catalogues, bid paddles, pledge cards and seating', { when: [some(ans('methods', 'auction', 'silent', 'pledge', 'raffle'), WHEN_SIGNED[0])] }),
      S('guest_services', 'recommended', 'Attend', 'Check-in, a seating plan, bidder registration and settlement'),
      S('live_entertainment', 'conditional', 'Lift', 'Entertainment placed to warm the room before the ask, not after', { when: [ans('programme', 'entertainment')] }),
      S('photography', 'conditional', 'Record', 'The evening and the beneficiaries, with their consent in writing', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Move', 'A film about the cause, which is what actually raises the money', { when: [some(WHEN_FILM[0], ans('programme', 'beneficiary'))] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, screen, auction display and the silent-auction tables', { when: [some(WHEN_STAGE[0], ans('methods', 'silent'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Round tables and accessible places, laid to the seating plan', { when: [some(WHEN_ACCESS[0], ans('programme', 'dinner'))] }),
      S('gifts_favours', 'conditional', 'Thank', 'Auction lots presented, and a thank-you for major donors', { when: [ans('methods', 'auction', 'raffle')] }),
      S('venue', 'conditional', 'Find', 'A room that fits the cause — extravagance costs you donations', { when: WHEN_FINDING }),
    ],
    addons: [
      X('cause_film', 'Move them', 'A short film about the cause, played immediately before the ask', 'film', { trade: 'videography' }),
      X('bidder_registration', 'Register', 'Bidders registered with payment details before the auction starts', 'budget', { trade: 'guest_services', when: [ans('methods', 'auction', 'silent')] }),
      X('cost_to_raise', 'Measure', 'Every line checked against the target before it is committed', 'poll', { experience: true }),
      X('beneficiary_consent', 'Protect', 'Written consent from anyone whose story is told or filmed', 'heart', { experience: true, when: [ans('programme', 'beneficiary')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Every rupee spent here is a rupee not raised. We will show the estimate against your target before anything is committed, and no beneficiary’s story is used without their written consent.' },
    timeline: {
      before: ['Target set, and every cost checked against it before committing', 'Bidders registered with payment details in advance', 'Beneficiary consent obtained in writing for any story or film'],
      during: ['Film, then the ask, while the room is warm', 'Auction run by someone who can actually run one', 'Total shown rising, publicly'],
      after: ['Pledges collected within the week, not left to lapse', 'Total announced with the cost-to-raise stated honestly', 'Donors thanked individually'],
    },
    checklist: ['Costs checked against the target', 'Bidders registered in advance', 'Beneficiary consent in writing', 'Pledge collection planned'],
  }),
  B('public-awareness-event', 'Inform', 'A message that has to reach people who did not come for it.', {
    about: 'Unlike everything else here, the audience is not already interested. The design question is how to stop someone walking past, and then what they do next — so the follow-up matters as much as the day.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('subject', 'What is it about?', 'one', { options: [['health', 'Health'], ['safety', 'Safety'], ['environment', 'Environment'], ['rights', 'Rights and legal information'], ['civic', 'A civic or government programme'], ['other', 'Something else']] }),
      Q('formats', 'How is the message delivered?', 'many', { options: [['stalls', 'Information stalls'], ['talks', 'Talks'], ['demos', 'Demonstrations'], ['screening', 'A film or screening'], ['street', 'Street theatre'], ['checks', 'On-site checks or screening']] }),
      Q('languages', 'Which languages are needed?', 'many', { optional: true, options: [['kannada', 'Kannada'], ['hindi', 'Hindi'], ['english', 'English'], ['tamil', 'Tamil'], ['telugu', 'Telugu'], ['urdu', 'Urdu'], ['other', 'Others']] }),
      Q('followup', 'Is there a way for people to follow up afterwards?', 'yesno', { optional: true }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set up', 'Stalls, counters, display boards and a demonstration area'),
      S('invitation_printing', 'recommended', 'Say it', 'Material in the languages people actually read, plus signage'),
      S('guest_services', 'recommended', 'Engage', 'Staff who can start a conversation, not just hand out a leaflet'),
      S('sound_av', 'conditional', 'Reach', 'A PA for talks, and a screen where a film is being shown', { when: [some(WHEN_PA[0], ans('formats', 'talks', 'screening'))] }),
      S('live_entertainment', 'conditional', 'Stop them', 'Street theatre, which stops a passer-by better than a banner', { when: [ans('formats', 'street')] }),
      S('decoration_floral', 'conditional', 'Draw', 'An entrance and visual presence strong enough to be noticed', { when: WHEN_SIGNED }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, seating, and a private corner for any on-site checks', { when: [some(ans('formats', 'checks'), WHEN_OUTSIDE[0], WHEN_ACCESS[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding in a public space, and crowd routing', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for screens, stalls and a sound system outdoors', { when: [some(WHEN_OUTSIDE[0], ans('formats', 'screening', 'checks'))] }),
      S('photography', 'conditional', 'Record', 'The day, with written consent from anyone identifiable', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Provide', 'Water and refreshments, especially for volunteers on a long day', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Place', 'Somewhere people already pass, not somewhere they must seek out', { when: WHEN_FINDING }),
    ],
    addons: [
      X('language_versions', 'Translate', 'Every piece of material in the languages the area actually reads', 'invite', { trade: 'invitation_printing', when: [has('languages')] }),
      X('private_corner', 'Shield', 'A screened private space for any health check or sensitive conversation', 'bed', { trade: 'tent_furniture', when: [ans('formats', 'checks')] }),
      X('follow_up_route', 'Continue', 'A clear next step — a number, a desk, a date — not just a leaflet', 'phone', { experience: true, when: [ans('followup', 'yes')] }),
      X('consent_policy', 'Respect', 'Written consent before photographing anyone identifiable', 'camera', { experience: true, unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Nobody identifiable is photographed without written consent, and we never infer anyone’s community, faith or circumstances from where the event is held.' },
    timeline: {
      before: ['Material written and translated into the languages the area reads', 'Site chosen where people already pass', 'Consent process agreed for photography and for any checks'],
      during: ['Staff engaging rather than handing out', 'Private space available for sensitive conversations', 'Follow-up route explained to everyone who stops'],
      after: ['Follow-up honoured — the number answered, the desk staffed', 'Material surplus stored rather than binned', 'Site cleared'],
    },
    checklist: ['Material in the right languages', 'Site where people already pass', 'Private space for sensitive conversations', 'Follow-up route that actually works'],
  }),

  B('magic-show', 'Astonish', 'Sightlines, angles and a stage the audience cannot see behind.', {
    about: 'The only show where the audience position is a technical requirement. Bad angles kill effects, so the seating plan and the stage masking are decided before anything else.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('style', 'What kind of magic?', 'one', { options: [['stage', 'Stage illusions'], ['closeup', 'Close-up and table magic'], ['mentalism', 'Mentalism'], ['children', 'A children’s show'], ['mixed', 'A mixed show']] }),
      Q('illusions', 'Are there large illusions or equipment?', 'yesno', { optional: true }),
      Q('assistants', 'Does the act need assistants or volunteers from the audience?', 'yesno', { optional: true }),
      AV, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mask', 'A stage with proper masking and wings, which most rooms lack'),
      S('event_lighting', 'recommended', 'Control', 'Lighting the performer controls, with a real blackout'),
      S('sound_av', 'recommended', 'Cue', 'Radio mic, music cues and a sound operator who knows the running order'),
      S('tent_furniture', 'recommended', 'Angle', 'Seating set inside the sightline the act needs, not the room’s'),
      S('live_entertainment', 'conditional', 'Engage', 'A performer suited to the room, the age and the style', { when: [ans('style', 'stage', 'closeup', 'mentalism', 'children', 'mixed')] }),
      S('guest_services', 'conditional', 'Place', 'Door list, and people seated within the sightline, not outside it', { when: [some(WHEN_TICKETED[0], WHEN_ACCESS[0])] }),
      S('photography', 'conditional', 'Shoot', 'From agreed positions only — a wrong angle reveals the method', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Tickets, posters and a programme', { when: [some(WHEN_TICKETED[0], WHEN_SIGNED[0])] }),
      S('catering_food', 'conditional', 'Serve', 'Refreshments in the interval, not during the show', { when: WHEN_FOOD }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Transport and handling for large illusions and their cases', { when: [ans('illusions', 'yes')] }),
      S('decoration_floral', 'optional', 'Set', 'A simple stage set that does not interfere with the act'),
      S('venue', 'conditional', 'Find', 'A room with a raised stage, masking and a controllable blackout', { when: WHEN_FINDING }),
    ],
    addons: [
      X('sightline_check', 'Angle it', 'Every seat checked from the performer’s side before tickets are sold', 'map', { experience: true }),
      X('camera_positions', 'Agree', 'Photography positions agreed with the performer in advance', 'camera', { experience: true, unless: UNLESS_PHOTO }),
      X('illusion_handling', 'Carry', 'Transport, handling and secure storage for the large equipment', 'move', { trade: 'end_to_end_event_logistics', when: [ans('illusions', 'yes')] }),
      X('volunteer_brief', 'Prepare', 'Front of house briefed on how audience volunteers are chosen', 'group', { experience: true, when: [ans('assistants', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'The performer owns their methods. Photography positions and any recording are agreed with them before the show.' },
    timeline: {
      before: ['Sightlines checked from the stage before seats are sold', 'Masking, wings and blackout tested in the room', 'Camera positions agreed with the performer'],
      during: ['Seating kept inside the sightline, even if it means fewer seats', 'Cues to the running order', 'Photography only from the agreed positions'],
      after: ['Equipment handled and stored securely', 'Images reviewed with the performer before release', 'Room reset'],
    },
    checklist: ['Sightlines checked from the stage', 'Masking and blackout tested', 'Camera positions agreed', 'Seating inside the sightline'],
  }),

  B('circus-performance', 'Rig', 'Aerial work, which makes the rigging inspection the single most important line.', {
    about: 'The one occasion where a rigging point failing is fatal. Load calculations, an independent inspection and a ground that will take the structure come before anything about the show.',
    formats: ['outdoor', 'venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('acts', 'What is in the show?', 'many', { options: [['aerial', 'Aerial — silks, trapeze, hoop'], ['acrobatics', 'Ground acrobatics'], ['clowning', 'Clowning'], ['juggling', 'Juggling and manipulation'], ['balance', 'Balance and wire'], ['animals', 'No animals — performers only']] }),
      Q('structure', 'What is the structure?', 'one', { options: [['bigtop', 'A big top'], ['venue', 'An existing venue rig'], ['truss', 'A ground-supported truss'], ['unsure', 'Not sure yet']] }),
      Q('rig_check', 'Has the rigging been independently inspected?', 'one', {
        options: [['yes', 'Yes, with certification'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'Aerial work needs load calculations and an inspection by someone who did not install it. We keep this on the plan.',
      }),
      Q('height', 'What is the maximum working height?', 'select', { optional: true, options: [['4', 'Up to 4 metres'], ['8', 'Up to 8 metres'], ['15', 'Up to 15 metres'], ['high', 'Higher']] }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Rig', 'Truss, rigging points, mats and the structure, to a load calculation'),
      S('safety_facilities', 'recommended', 'Cover', 'First aid trained for falls, an ambulance route, and the clear-up'),
      S('event_lighting', 'recommended', 'Follow', 'Lighting that follows an aerial performer without blinding them'),
      S('sound_av', 'recommended', 'Cue', 'Music, cues and a mic, with the operator sighted on the performer'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating outside the fall zone, with accessible places held', { when: [some(WHEN_ACCESS[0], WHEN_FINDING[0])] }),
      S('live_entertainment', 'conditional', 'Cast', 'Performers for the acts, each with their own insurance and rider', { when: [has('acts')] }),
      S('security_services', 'conditional', 'Keep back', 'The fall zone and backstage kept clear of the public', { when: [some(WHEN_GUARD[0], ans('acts', 'aerial'))] }),
      S('power_cooling', 'conditional', 'Supply', 'Power for the rig and the lighting, with a backup feed', { when: [some(WHEN_OUTSIDE[0], ans('structure', 'bigtop', 'truss'))] }),
      S('invitation_printing', 'conditional', 'Promote', 'Tickets, programmes crediting every performer, and safety signage', { when: [some(WHEN_TICKETED[0], WHEN_SIGNED[0])] }),
      S('guest_services', 'conditional', 'Seat', 'Front of house, keeping the public outside the working area', { when: [some(WHEN_TICKETED[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Capture', 'From positions that do not distract a performer at height', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for the company across a long rig-and-show day', { when: WHEN_FOOD }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Rig in, run and rig out across the booking', { when: [some(WHEN_DAYS[0], ans('structure', 'bigtop'))] }),
      S('venue', 'conditional', 'Assess', 'A site with the height, the ground bearing and the anchor points', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rigging_inspection', 'Certify', 'An independent inspection and load certificate before any act goes up', 'schedule', { experience: true, when: [ans('rig_check', 'no', 'help')] }),
      X('fall_zone', 'Clear it', 'A marked fall zone with matting, kept clear of the public', 'map', { trade: 'event_equipment_rental', when: [ans('acts', 'aerial', 'balance')] }),
      X('performer_insurance', 'Confirm', 'Insurance and risk assessment collected from every act', 'invite', { experience: true }),
      X('ground_bearing', 'Check', 'Ground bearing confirmed before a big top or truss is erected', 'map', { experience: true, when: [ans('structure', 'bigtop', 'truss')] }),
    ],
    toolkit: { polls: ['date'], note: 'Rigging is inspected by someone who did not install it, every time. We will keep that and the fall zone on the plan whatever else comes off. No fire or pyrotechnic effects.' },
    timeline: {
      before: ['Load calculations done and the rig inspected independently, with certification', 'Ground bearing and anchor points confirmed', 'Insurance and risk assessments collected from every act'],
      during: ['Rig checked again before each performance, not just once', 'Fall zone kept clear of the public at all times', 'First aid trained for falls, in position from the first act'],
      after: ['De-rig supervised, equipment inspected as it comes down', 'Incident log completed', 'Site reinstated'],
    },
    checklist: ['Independent rigging inspection with certificate', 'Ground bearing confirmed', 'Fall zone marked and matted', 'Insurance from every performer'],
  }),

  B('cultural-showcase', 'Present', 'Several communities on one stage, each on their own terms.', {
    about: 'The hard part is not technical. It is making sure every community presents itself rather than being presented, and that the running order does not quietly rank them.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('groups', 'How many communities or groups are performing?', 'select', { options: [['3', 'Up to 3'], ['8', 'Up to 8'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      Q('forms', 'What forms are being presented?', 'many', { options: [['music', 'Music'], ['dance', 'Dance'], ['theatre', 'Theatre'], ['craft', 'Craft demonstrations'], ['food', 'Food'], ['dress', 'Dress and textiles']] }),
      Q('curation', 'Who decides the programme?', 'one', {
        options: [['communities', 'The communities themselves'], ['committee', 'A mixed committee'], ['organiser', 'The organiser'], ['open', 'Open submissions']],
        help: 'Who decides is the most important choice here. We never advise on what a community should present.',
      }),
      Q('costumes', 'Do groups need costume, green room or preparation space?', 'yesno'),
      AV, ACCESS_NEEDS, AID, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Serve', 'Sound set up for each form, with every group’s needs taken separately'),
      S('event_lighting', 'recommended', 'Light', 'Warm, even stage light that suits every group equally'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, wings, craft tables and the preparation spaces', { when: [some(WHEN_STAGE[0], ans('forms', 'craft'))] }),
      S('tent_furniture', 'conditional', 'House', 'Green rooms per group, and seating with accessible places', { when: [some(ans('costumes', 'yes'), WHEN_ACCESS[0])] }),
      S('anchor_mc', 'recommended', 'Introduce', 'A host who can name each form and each language correctly'),
      S('catering_food', 'conditional', 'Share', 'Food stalls run by the communities themselves, where they want to', { when: [some(ans('forms', 'food'), WHEN_FOOD[0])] }),
      S('invitation_printing', 'conditional', 'Credit', 'A programme naming every performer, form and community', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('photography', 'conditional', 'Record', 'Each group, with their agreement about how images are used', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Archive', 'A record given back to each community, not kept from them', { when: WHEN_FILM }),
      S('guest_services', 'conditional', 'Host', 'Liaison per group, and front of house for the audience', { when: [some(ans('groups', '8', '20', '40'), WHEN_TICKETED[0])] }),
      S('decoration_floral', 'conditional', 'Set', 'A setting that does not favour one tradition’s aesthetic over another', { when: WHEN_SIGNED }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, first aid and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('venue', 'conditional', 'Find', 'A stage and rooms enough for several groups to prepare at once', { when: WHEN_FINDING }),
    ],
    addons: [
      X('community_liaison', 'Ask them', 'A named liaison per group, consulted on their own requirements', 'group', { experience: true }),
      X('order_fairness', 'Order fairly', 'A running order agreed openly, not set by who asked first', 'schedule', { experience: true }),
      X('archive_copy', 'Give back', 'The recording and photographs given to each community', 'album', { trade: 'videography' }),
      X('green_rooms', 'Prepare', 'A preparation space per group, not one shared room', 'bed', { trade: 'tent_furniture', when: [ans('costumes', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Each community decides what it presents and how. We never advise on the content, the sequence or the meaning of anyone’s tradition.' },
    timeline: {
      before: ['Each group consulted separately on what they need', 'Running order agreed openly with everyone', 'Programme credits checked with each group for spelling and naming'],
      during: ['A liaison with each group from their call time', 'Host introducing each form as the group described it', 'Preparation spaces kept separate'],
      after: ['Recordings and photographs given to each community', 'Settlement with every group on the same terms', 'Venue cleared'],
    },
    checklist: ['Each group consulted separately', 'Running order agreed openly', 'Programme credits checked with groups', 'Preparation space per group'],
  }),

  B('talent-competition', 'Judge', 'Heats, a final and a result the losers can accept.', {
    about: 'A public competition is only as good as its process. Published criteria, a visible scoring method and neutral judges are what stop the evening ending in an argument.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('entrants', 'How many entrants?', 'select', { options: [['10', 'Up to 10'], ['30', 'Up to 30'], ['80', 'Up to 80'], ['200', 'More than 80']] }),
      Q('rounds', 'What is the structure?', 'one', { options: [['single', 'A single round'], ['heats', 'Heats and a final'], ['auditions', 'Auditions then a show'], ['series', 'A series over weeks']] }),
      Q('categories', 'What kinds of act?', 'many', { options: [['singing', 'Singing'], ['dance', 'Dance'], ['instrument', 'Instruments'], ['comedy', 'Comedy'], ['variety', 'Variety'], ['other', 'Anything']] }),
      Q('judging', 'How is the winner decided?', 'one', { options: [['judges', 'A judging panel'], ['audience', 'Audience vote'], ['both', 'Both'], ['public', 'Public vote beforehand']] }),
      Q('minors', 'Are any entrants under eighteen?', 'yesno', { optional: true, help: 'If so, we plan guardian consent, chaperoning and a photography rule.' }),
      AWARDS, AV, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Equip', 'Mics, monitors, tracks and a desk that resets fast between acts'),
      S('event_lighting', 'recommended', 'Spotlight', 'A spot on the act and darkness on the audience'),
      S('anchor_mc', 'recommended', 'Carry', 'A host who fills the changeovers and handles the results gracefully'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, a judges’ table and a backstage waiting area', { when: [some(WHEN_STAGE[0], ans('judging', 'judges', 'both'))] }),
      S('invitation_printing', 'conditional', 'Publish', 'Running order, score sheets, audience ballots and certificates', { when: [some(WHEN_PRINTED[0], ans('judging', 'judges', 'audience', 'both'))] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies and prizes, with something for every finalist', { when: WHEN_TROPHY }),
      S('guest_services', 'conditional', 'Marshal', 'Entrant registration, the backstage call and the audience ballot', { when: [some(WHEN_TICKETED[0], ans('entrants', '30', '80', '200'))] }),
      S('tent_furniture', 'conditional', 'House', 'A green room for waiting entrants, and accessible audience seating', { when: [some(WHEN_ACCESS[0], ans('entrants', '30', '80', '200'))] }),
      S('photography', 'conditional', 'Capture', 'Every act, under a photography rule if minors are competing', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Each act filmed and cut, which settles any disputed result', { when: WHEN_FILM }),
      S('catering_food', 'conditional', 'Feed', 'Food for entrants, who wait far longer than the audience', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress', 'A stage set with the competition’s name on it', { when: WHEN_SIGNED }),
      S('venue', 'conditional', 'Find', 'A room with a stage, good sound and a space backstage', { when: WHEN_FINDING }),
    ],
    addons: [
      X('criteria_published', 'Set the rules', 'Judging criteria and the panel published before entries close', 'poll', { experience: true }),
      X('minor_safeguards', 'Protect', 'Guardian consent, chaperoning and a photography rule for under-eighteens', 'heart', { experience: true, when: [ans('minors', 'yes')] }),
      X('act_recordings', 'Send', 'Each act cut as its own clip and sent to the entrant', 'film', { trade: 'videography', when: WHEN_FILM }),
      X('scoring_board', 'Show', 'Scores shown after each round, not only the final result', 'poll', { trade: 'invitation_printing', when: [ans('judging', 'judges', 'both')] }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the criteria and the judges before entries close. Where entrants are under eighteen, guardian consent and a photography rule come before anything else.' },
    timeline: {
      before: ['Criteria and judging panel published before entries close', 'Guardian consent collected for any entrant under eighteen', 'Running order drawn openly, with real changeover time'],
      during: ['Acts to the running order, host covering changeovers', 'Scores collected per round and shown', 'Chaperoning in place backstage where minors are competing'],
      after: ['Result published with the scores visible', 'Clips sent to every entrant', 'Prizes delivered to anyone absent'],
    },
    checklist: ['Criteria and judges published', 'Guardian consent where needed', 'Running order with changeovers', 'Scores shown per round'],
  }),

  B('light-and-sound-show', 'Project', 'A building, a projection and a crowd standing in the right place to see it.', {
    about: 'Everything is set by the projection geometry: throw distance, the surface, ambient light and where the audience can stand without blocking it. Content comes after the survey, not before.',
    formats: ['outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('surface', 'What is being projected on?', 'one', { options: [['building', 'A building façade'], ['screen', 'A screen'], ['water', 'Water or mist'], ['landscape', 'A landscape or structure'], ['multiple', 'Several surfaces']] }),
      Q('throw', 'Is the projection distance and position surveyed?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'Throw distance, surface and ambient light decide the projector specification. Content is built to the survey.',
      }),
      Q('content', 'Is the show content made?', 'one', { options: [['ready', 'Yes, and mapped'], ['making', 'Being made'], ['need', 'We need it made'], ['existing', 'Reusing existing content']] }),
      Q('shows_per_night', 'How many shows a night?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Three or four'], ['loop', 'On a loop']] }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Map', 'Projectors specified to the throw and the surface, and the show mapped'),
      S('event_lighting', 'recommended', 'Darken', 'Ambient light controlled, and architectural lighting cued to the show'),
      S('power_cooling', 'recommended', 'Supply', 'Clean, backed-up power — a projector dropping ends the show'),
      S('event_equipment_rental', 'conditional', 'Position', 'Projection towers, control position, barriers and the viewing area', { when: [some(WHEN_STAGE[0], ans('surface', 'building', 'landscape', 'multiple'))] }),
      S('security_services', 'conditional', 'Hold', 'The viewing line held and the projection path kept clear', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, washrooms and the clear-up for a standing crowd', { when: [some(WHEN_AID[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Marshal', 'Stewards placing the crowd where the show actually works', { when: [some(WHEN_OPEN[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Direct', 'Show times, viewing maps and signage to the right standing points', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating and an accessible viewing point with a clear sightline', { when: [some(WHEN_ACCESS[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Record', 'From the control position, which is the only true sightline', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Stalls placed outside the projection path and the viewing area', { when: WHEN_FOOD }),
      S('end_to_end_event_logistics', 'conditional', 'Run', 'Crew across a run of nights, with a daily check and refocus', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Survey', 'A site with the throw distance, the surface and the darkness', { when: WHEN_FINDING }),
    ],
    addons: [
      X('site_survey', 'Measure', 'A survey of throw, surface, ambient light and sightlines before specifying', 'map', { experience: true, when: [ans('throw', 'no', 'help')] }),
      X('content_mapping', 'Fit', 'Content mapped to the actual surface, not to a flat rectangle', 'media', { trade: 'sound_av', when: [ans('content', 'making', 'need', 'existing')] }),
      X('viewing_line', 'Place them', 'A marked viewing area where the geometry actually works', 'map', { trade: 'event_equipment_rental' }),
      X('nightly_check', 'Refocus', 'A focus and alignment check before every show, not just the first', 'schedule', { experience: true, when: WHEN_DAYS }),
    ],
    toolkit: { polls: ['date'], note: 'The survey comes before the content and before the quote. Nothing here involves pyrotechnics or flame effects.' },
    timeline: {
      before: ['Site surveyed for throw, surface, ambient light and sightlines', 'Content mapped to the real surface and previewed on site', 'Viewing area marked where the geometry works'],
      during: ['Alignment checked before every show', 'Crowd placed inside the viewing area and the projection path kept clear', 'Power watched, with the backup feed live'],
      after: ['Equipment struck and the site reinstated', 'Content archived for reuse', 'Incident log if anything stopped a show'],
    },
    checklist: ['Site surveyed before specifying', 'Content mapped to the real surface', 'Viewing area marked', 'Backup power confirmed'],
  }),

  B('immersive-experience', 'Inhabit', 'A built world the audience walks through, in small groups, on a timed route.', {
    about: 'The audience moves instead of sitting, which turns the whole thing into a capacity and flow problem. Group size, dwell time and the route decide how many people can experience it in a day.',
    formats: ['venue', 'outdoor'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      THEME('What is the world or theme?', [['story', 'A story or narrative'], ['art', 'An art installation'], ['brand', 'A brand world'], ['history', 'Historical'], ['horror', 'Horror or thriller'], ['other', 'Something else']]),
      Q('rooms_count', 'How many spaces or scenes?', 'select', { options: [['2', 'Two'], ['5', 'Up to 5'], ['10', 'Up to 10'], ['20', 'More than 10']] }),
      Q('group_size', 'How many people per group?', 'select', { options: [['6', 'Up to 6'], ['15', 'Up to 15'], ['30', 'Up to 30'], ['free', 'Free flow, no groups']] }),
      Q('actors', 'Are there performers inside the experience?', 'yesno'),
      Q('effects', 'Does it use haze, strobe, darkness or confined spaces?', 'yesno', {
        help: 'These need warnings at the entrance and an exit anyone can take at any time.',
      }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'The set, the scenes, the route and the structures they are built on'),
      S('event_lighting', 'recommended', 'Design', 'Lighting as the primary storytelling tool, plus safe egress lighting'),
      S('sound_av', 'recommended', 'Surround', 'Zoned audio per scene, triggered or timed to the group'),
      S('guest_services', 'recommended', 'Guide', 'Group marshalling, timed entry and a guide or host per group'),
      S('safety_facilities', 'conditional', 'Protect', 'First aid, egress routes, and the clear-up each night', { when: [some(WHEN_AID[0], ans('effects', 'yes'), WHEN_DAYS[0])] }),
      S('live_entertainment', 'conditional', 'Inhabit', 'Performers inside the experience, briefed and rotated', { when: [ans('actors', 'yes')] }),
      S('invitation_printing', 'recommended', 'Signpost', 'Timed tickets, route signage, warnings and accessibility notes'),
      S('power_cooling', 'conditional', 'Supply', 'Power to every scene, with ventilation in enclosed spaces', { when: [some(ans('effects', 'yes'), ans('rooms_count', '10', '20'))] }),
      S('security_services', 'conditional', 'Steward', 'Stewards on the route and at every exit point', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Document', 'The build and the scenes, with a policy for visitors’ own cameras', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'A café or counter at the exit, where people want to talk about it', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating at the exit and a step-free alternative route', { when: WHEN_ACCESS }),
      S('end_to_end_event_logistics', 'conditional', 'Run', 'Build, run and strike across a run of days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A space with the rooms, the ceiling height and real fire exits', { when: WHEN_FINDING }),
    ],
    addons: [
      X('flow_model', 'Time it', 'Group size and dwell time worked out, so the route never jams', 'schedule', { experience: true }),
      X('content_warnings', 'Warn', 'Clear warnings at the ticket and the entrance for every effect used', 'invite', { trade: 'invitation_printing', when: [ans('effects', 'yes')] }),
      X('exit_anywhere', 'Let them out', 'A marked, staffed way out from every scene, for anyone who needs it', 'map', { trade: 'guest_services' }),
      X('step_free_route', 'Include', 'A step-free alternative route through the whole experience', 'spa', { trade: 'event_equipment_rental', when: WHEN_ACCESS }),
    ],
    toolkit: { polls: ['date'], note: 'Anyone must be able to leave from any point, at any time, without explaining themselves. Warnings for haze, strobe, darkness and confinement go on the ticket and the door.' },
    timeline: {
      before: ['Flow modelled — group size, dwell time, capacity per hour', 'Fire exits and an exit-from-anywhere route agreed and marked', 'Content warnings written for every effect used'],
      during: ['Timed entry held, so the route never backs up', 'Performers rotated and briefed on stopping if someone is distressed', 'Exits staffed and visible from inside every scene'],
      after: ['Set struck safely', 'Feedback on where the route jammed', 'Venue reinstated'],
    },
    checklist: ['Flow and capacity modelled', 'Exit from anywhere, marked and staffed', 'Content warnings on ticket and door', 'Step-free alternative route'],
  }),

  B('fan-convention', 'Gather', 'A community that mostly knows each other online, meeting in a building.', {
    about: 'Smaller and more specific than a comic convention, and built on trust. Guests, panels and a code of conduct that is published and actually enforced are what make people come back.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC, DAYS, PERMITS,
      Q('fandom', 'What is it about?', 'text', { max: 80 }),
      Q('zones', 'What is in it?', 'many', { options: [['panels', 'Panels'], ['guests', 'Guests and signings'], ['vendors', 'Vendors'], ['screenings', 'Screenings'], ['meetups', 'Meet-ups'], ['contests', 'Contests']] }),
      Q('guest_count', 'How many invited guests?', 'select', { optional: true, options: [['0', 'None'], ['2', 'One or two'], ['6', 'Up to 6'], ['15', 'More than 6']] }),
      Q('conduct', 'Is there a published code of conduct?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'A published code with a named contact is what makes a fan space safe. We keep it on the plan.',
      }),
      AV, GUARD, AID, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Fit out', 'Panel rooms, vendor tables, signing desks and meet-up spaces'),
      S('guest_services', 'recommended', 'Host', 'Registration, badge issue, guest liaison and a staffed help desk'),
      S('invitation_printing', 'recommended', 'Orient', 'Badges, the schedule, a floor plan, the code and room signage'),
      S('sound_av', 'conditional', 'Equip', 'Sound and screens in the panel rooms and the screening room', { when: [some(ans('zones', 'panels', 'screenings'), WHEN_AV[0])] }),
      S('security_services', 'conditional', 'Keep safe', 'Door, floor and guest-area cover, briefed on the code of conduct', { when: [some(WHEN_GUARD[0], ans('zones', 'guests'), WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning, first aid and a quiet room', { when: [some(WHEN_AID[0], WHEN_ACCESS[0], WHEN_DAYS[0])] }),
      S('photography', 'conditional', 'Cover', 'The convention, under a consent policy that is actually enforced', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for a crowd that will not leave the building', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Theme', 'Entrance, zone dressing and photo points', { when: WHEN_SIGNED }),
      S('passenger_transport', 'conditional', 'Collect', 'Transfers for invited guests between hotel and venue', { when: [ans('guest_count', '2', '6', '15')] }),
      S('power_cooling', 'conditional', 'Supply', 'Power for vendors, screens and a full hall', { when: [some(ans('zones', 'vendors'), WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating, meet-up furniture and accessible places in every room', { when: [some(WHEN_ACCESS[0], ans('zones', 'meetups'))] }),
      S('venue', 'conditional', 'Find', 'A building with several rooms and a space people can just sit in', { when: WHEN_FINDING }),
    ],
    addons: [
      X('code_of_conduct', 'Publish', 'A code with a named contact, on the badge and at every door', 'heart', { trade: 'invitation_printing', when: [ans('conduct', 'no', 'help')] }),
      X('guest_schedule', 'Manage', 'Guest schedules with breaks, and signing queues that are capped', 'schedule', { trade: 'guest_services', when: [ans('zones', 'guests')] }),
      X('quiet_room', 'Decompress', 'A quiet, low-sensory room, signposted and genuinely quiet', 'bed', { trade: 'safety_facilities' }),
      X('photo_consent', 'Ask first', 'A consent policy for photographing attendees, stated on the badge', 'camera', { experience: true, unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'A published code of conduct with a named contact is not optional at a fan event. Nobody is photographed without consent.' },
    timeline: {
      before: ['Code of conduct published with a named contact', 'Guest schedules agreed with breaks and capped signing queues', 'Floor plan and quiet room located and signposted'],
      during: ['Code visible at every door and on every badge', 'Signing queues capped and timed', 'Quiet room kept quiet, and staffed'],
      after: ['Any conduct reports followed up properly', 'Guest and vendor settlement', 'Venue reinstated'],
    },
    checklist: ['Code of conduct published with a contact', 'Signing queues capped', 'Quiet room signposted', 'Photo consent policy on badges'],
  }),

  B('cosplay-event', 'Embody', 'Costumes that took six months, a stage, and a prop policy at the door.', {
    about: 'The costumes are the event and also the risk: props that look like weapons, costumes that restrict movement, and performers who cannot sit down. The door policy and the changing space decide how it goes.',
    formats: ['venue'],
    ask: [
      CROWD, PLACE, ACCESS_PUBLIC,
      Q('format', 'What is the format?', 'one', { options: [['contest', 'A masquerade or contest'], ['gathering', 'A gathering and photoshoot'], ['parade', 'A parade'], ['workshops', 'Workshops and panels'], ['mixed', 'A mix']] }),
      Q('entrants', 'How many cosplayers are competing?', 'select', { optional: true, options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['100', 'Up to 100'], ['250', 'More than 100']] }),
      Q('props', 'Is there a prop and costume policy?', 'one', {
        options: [['yes', 'Yes, published'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'Prop weapons, sharp edges and restricted vision need a published rule and a check at the door.',
      }),
      Q('changing', 'Do cosplayers need changing and repair space?', 'yesno'),
      Q('judging', 'How is the contest judged?', 'one', { optional: true, options: [['craftsmanship', 'Craftsmanship'], ['performance', 'Performance'], ['both', 'Both, judged separately'], ['audience', 'Audience vote'], ['none', 'No contest']] }),
      AWARDS, AV, GUARD, ACCESS_NEEDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'Accommodate', 'Changing space, repair tables and seating a costume can be worn in'),
      S('event_lighting', 'recommended', 'Reveal', 'Stage and photo lighting that shows detail rather than flattening it'),
      S('sound_av', 'conditional', 'Cue', 'Stage sound, tracks and mics for the contest and the parade', { when: [some(ans('format', 'contest', 'parade', 'mixed'), WHEN_AV[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage with a ramp, a judging table and photo backdrops', { when: [some(WHEN_STAGE[0], ans('format', 'contest', 'parade'))] }),
      S('security_services', 'conditional', 'Check', 'A prop check at the door, run by staff briefed on the policy', { when: [some(WHEN_GUARD[0], ans('props', 'yes', 'no', 'help'))] }),
      S('photography', 'conditional', 'Shoot', 'Proper photo points with lighting, which is why most people came', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Publish', 'The prop policy, entry forms, judging criteria, badges and signage', { when: [some(WHEN_SIGNED[0], WHEN_TICKETED[0], ans('props', 'yes'))] }),
      S('guest_services', 'conditional', 'Marshal', 'Contest registration, backstage calls and a repair desk', { when: [some(ans('format', 'contest', 'mixed'), WHEN_TICKETED[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Prizes split by craftsmanship and performance, not one overall', { when: WHEN_TROPHY }),
      S('bridal_makeup_hair', 'conditional', 'Finish', 'A makeup and repair station, which every cosplay event needs', { when: [ans('changing', 'yes')] }),
      S('catering_food', 'conditional', 'Feed', 'Food that can be eaten in a costume, which is a real constraint', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Cool', 'Washrooms, water and somewhere cool to sit in a heavy costume', { when: [some(WHEN_ACCESS[0], from(500))] }),
      S('venue', 'conditional', 'Find', 'A venue with wide doors, high ceilings and somewhere to change', { when: WHEN_FINDING }),
    ],
    addons: [
      X('prop_policy', 'Rule it', 'A published prop policy, checked and tagged at the door', 'dress', { trade: 'invitation_printing', when: [ans('props', 'no', 'help')] }),
      X('repair_station', 'Fix', 'A repair desk with glue, tape, pins and a mirror', 'craft', { trade: 'tent_furniture', when: [ans('changing', 'yes')] }),
      X('photo_points', 'Frame', 'Lit photo points with backdrops, which is the main reason to come', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('craft_judging', 'Judge properly', 'Craftsmanship judged up close, separately from the stage performance', 'poll', { experience: true, when: [ans('judging', 'craftsmanship', 'both')] }),
    ],
    toolkit: { polls: ['date'], note: 'A prop policy published in advance and checked at the door, and nobody photographed without being asked first. Both are standard at a cosplay event.' },
    timeline: {
      before: ['Prop and costume policy published with the entry information', 'Changing, repair and cooling space planned', 'Judging split into craftsmanship and performance, criteria published'],
      during: ['Props checked and tagged at the door', 'Repair desk staffed all day', 'Photographers asking before shooting, every time'],
      after: ['Images shared with the cosplayers who appear in them', 'Prizes awarded against the published criteria', 'Venue reinstated'],
    },
    checklist: ['Prop policy published and checked', 'Changing and repair space', 'Judging criteria split and published', 'Photo consent expected and stated'],
  }),
]

export const PUBLIC_BLUEPRINT = Object.fromEntries(PUBLIC_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(PUBLIC_BLUEPRINTS, 'public')
