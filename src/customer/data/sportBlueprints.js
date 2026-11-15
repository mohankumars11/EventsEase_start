/**
 * Sports & Wellness — one blueprint per occasion.
 *
 * Twenty-six occasions where people exert themselves, which makes this
 * the category with the highest chance of someone needing a doctor.
 * Everything here is shaped by that:
 *
 *   · Medical cover scales with the event, not with the budget. First
 *     aid, an ambulance route and — for contact sport and endurance —
 *     a physio or a doctor stay on the plan, and we say so plainly if
 *     they are switched off.
 *   · Water is a safety item in this country, not hospitality. Outdoor
 *     events in Indian heat get water points, and endurance events get
 *     them at intervals along the route.
 *   · We give no medical, dietary or training advice, ever. Medical
 *     declarations, fitness to participate and emergency contacts are
 *     the organiser's to collect and the participant's to give.
 *   · A wellness session is not a treatment. We never describe yoga,
 *     meditation or a retreat as therapy, as a cure, or as a substitute
 *     for medical care, and we never imply a health outcome.
 *   · Water, height and contact each need a qualified person present —
 *     a lifeguard, an instructor, an official — and those are named on
 *     the plan rather than assumed.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, AWARDS, DIET_ONLY, ALLERGY_ONLY, CHIEF_GUEST, DRESS_CODE,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a sporting occasion asks ──────────────────────── */

const PLAYERS = Q('players', 'How many taking part?', 'select', {
  options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['300', 'Up to 300'], ['1500', 'Up to 1500'], ['5000', 'More than 1500']],
})
const WATCHERS = Q('spectators', 'How many spectators?', 'select', {
  optional: true, options: [['0', 'None'], ['50', 'Up to 50'], ['300', 'Up to 300'], ['2000', 'Up to 2000'], ['10000', 'More than 2000']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['ground', 'A ground or field'], ['court', 'Courts or an indoor hall'], ['pool', 'A pool'], ['road', 'Roads or a public route'], ['studio', 'A studio or small room'], ['find', 'Please find somewhere']],
})

/** The question that decides whether this is safe to run at all. */
const MEDICAL = Q('medical', 'What medical cover do you need?', 'many', {
  options: [['firstaid', 'First aid on site'], ['ambulance', 'An ambulance on standby'], ['physio', 'A physio'], ['doctor', 'A doctor'], ['have', 'The venue provides it']],
  help: 'Cover scales with the event. We will say so plainly if this is left thinner than the event warrants.',
})
const WATER = Q('water', 'Drinking water for participants?', 'one', {
  options: [['points', 'Water points on site'], ['route', 'Water at intervals along the route'], ['bottles', 'Bottles handed out'], ['venue', 'The venue provides it'], ['none', 'Not needed']],
})
const OFFICIALS = Q('officials', 'Do you need referees, umpires or officials?', 'yesno')
const REGISTER = Q('registration', 'How do participants register?', 'one', {
  options: [['advance', 'In advance'], ['onday', 'On the day'], ['both', 'Both'], ['invite', 'By invitation only']],
})
const DECLARATIONS = Q('declarations', 'Are you collecting medical declarations and emergency contacts?', 'one', {
  options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
  help: 'These are the organiser’s to collect. We never ask a participant about their health, and never advise on fitness to take part.',
})
const EQUIPMENT = Q('equipment', 'What equipment is needed?', 'many', {
  optional: true,
  options: [['play', 'Playing equipment'], ['nets', 'Nets, goals or markings'], ['mats', 'Mats'], ['scoreboard', 'Scoreboards'], ['seating', 'Spectator seating'], ['timing', 'Timing equipment']],
})
const PERMITS = Q('permits', 'Are the ground or route permissions in place?', 'one', {
  optional: true, options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
})
const INSTRUCTOR = Q('instructor', 'Is the instructor or coach confirmed?', 'one', {
  options: [['yes', 'Yes, with their qualification'], ['finding', 'Please help us find one'], ['no', 'Not needed']],
  help: 'We ask for the qualification because a session led by someone unqualified is the main risk here.',
})
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['pa', 'A PA or announcements'], ['mics', 'Microphones'], ['screen', 'Screens or a scoreboard'], ['music', 'Music'], ['stream', 'Streaming or recording']],
})
const FOOD = Q('food', 'Food and refreshments', 'one', {
  optional: true, options: [['meals', 'Meals'], ['snacks', 'Snacks and refreshments'], ['stalls', 'Food stalls'], ['none', 'Nothing needed']],
})
const SIGNAGE = Q('signage', 'Do you need signage, bibs and printed material?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need security or crowd stewarding?', 'yesno', { optional: true })
const TRANSPORT = Q('transport', 'Do participants need transport arranged?', 'yesno', { optional: true })

const WHEN_AID = [ans('medical', 'firstaid', 'ambulance', 'physio', 'doctor')]
const WHEN_PHYSIO = [ans('medical', 'physio', 'doctor')]
const WHEN_WATER = [ans('water', 'points', 'route', 'bottles')]
const WHEN_ROUTE = [ans('place', 'road')]
const WHEN_OUTSIDE = [ans('place', 'ground', 'road')]
const WHEN_FINDING = [ans('place', 'find', 'ground', 'road')]
const WHEN_OFFICIALS = [ans('officials', 'yes')]
const WHEN_REG = [ans('registration', 'advance', 'onday', 'both')]
const WHEN_KIT = [has('equipment')]
const WHEN_SEATS = [ans('equipment', 'seating')]
const WHEN_SCORE = [ans('equipment', 'scoreboard', 'timing')]
const WHEN_AV = [has('av')]
const WHEN_PA = [ans('av', 'pa', 'mics')]
const WHEN_MUSIC = [ans('av', 'music')]
const WHEN_STREAM = [ans('av', 'stream')]
const WHEN_FOOD = [ans('food', 'meals', 'snacks', 'stalls')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_RIDE = [ans('transport', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_CROWD = [ans('spectators', '300', '2000', '10000')]
const WHEN_BIG_FIELD = [ans('players', '300', '1500', '5000')]
const WHEN_FIND_COACH = [ans('instructor', 'finding')]
const WHEN_DECLARE_HELP = [ans('declarations', 'no', 'help')]

export const SPORT_BLUEPRINTS = [

  B('cricket-tournament', 'Innings', 'Fixtures across days, one square, and light that runs out at six.', {
    about: 'Cricket takes longer than any other format here, which makes the fixture list the plan. The square, the light and the reserve day decide whether a tournament finishes at all.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('format', 'What format?', 'one', { options: [['t20', 'T20'], ['odi', 'Limited overs'], ['test', 'Multi-day'], ['tennis', 'Tennis-ball cricket'], ['box', 'Box or indoor cricket']] }),
      Q('teams', 'How many teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'More than 16']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['5', 'Up to a week'], ['long', 'Longer']] }),
      Q('pitch', 'Does the pitch and ground need preparing?', 'yesno'),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'First aid at the ground, an ambulance route, and the clear-up'),
      S('event_equipment_rental', 'conditional', 'Prepare', 'Pitch preparation, nets, sightscreens, stumps and the scoreboard', { when: [some(ans('pitch', 'yes'), WHEN_KIT[0])] }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water and electrolytes at the boundary, through every session', { when: WHEN_WATER }),
      S('tent_furniture', 'conditional', 'Shelter', 'Team tents, shade at the boundary and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA for the toss, the fall of wickets and the presentation', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('invitation_printing', 'conditional', 'Fixture', 'Fixtures, team sheets, scorebooks, bibs and certificates', { when: [some(WHEN_SIGNED[0], WHEN_REG[0], WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Register', 'Team registration, scorers and a desk that owns the fixture list', { when: WHEN_REG }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, medals and a man-of-the-match award per fixture', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The finals and the presentations, from the right side of the ground', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Stream', 'The final streamed, which is what a tournament gets remembered for', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Lunch and tea intervals, which cricket actually schedules', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Steward', 'Boundary and gate stewarding for a crowd', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for the scoreboard, the PA and any floodlights', { when: WHEN_OUTSIDE }),
      S('end_to_end_event_logistics', 'conditional', 'Carry', 'Crew and equipment across days, and the ground reset each morning', { when: [ans('days', '2', '5', 'long')] }),
      S('venue', 'conditional', 'Secure', 'A ground with a square, a boundary and a pavilion', { when: WHEN_FINDING }),
    ],
    addons: [
      X('reserve_day', 'Plan for rain', 'A reserve day and a published rain rule, agreed before fixtures', 'schedule', { experience: true }),
      X('match_officials', 'Umpire', 'Neutral umpires and scorers for every fixture', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('square_prep', 'Roll it', 'Pitch preparation across the days before, not the morning of', 'game', { trade: 'event_equipment_rental', when: [ans('pitch', 'yes')] }),
      X('live_score', 'Follow', 'A live scoreboard and an online score feed', 'poll', { trade: 'invitation_printing', when: WHEN_SCORE }),
    ],
    toolkit: { polls: ['date'], note: 'Medical declarations and fitness to play are the organiser’s and the player’s. We never advise on either, and medical cover stays on the plan.' },
    timeline: {
      before: ['Fixture list published with a reserve day and a rain rule', 'Pitch prepared across the preceding days', 'Umpires, scorers and medical cover confirmed'],
      during: ['Medical cover at the ground before the first ball', 'Water at the boundary every session, not only at drinks', 'Scores recorded and published after each fixture'],
      after: ['Presentations at the ground, not by email afterwards', 'Ground restored and equipment reconciled', 'Results published in full'],
    },
    checklist: ['Fixtures with a reserve day and rain rule', 'Pitch preparation scheduled', 'Umpires and scorers confirmed', 'Medical cover and water at the ground'],
  }),

  B('football-tournament', 'Kick off', 'Matches back to back on one pitch, and a surface that has to last the day.', {
    about: 'Unlike cricket, the constraint is the pitch itself: twelve matches on one surface in a day destroys it, and the turnaround between fixtures is where the schedule fails.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('format', 'What format?', 'one', { options: [['eleven', 'Eleven-a-side'], ['seven', 'Seven-a-side'], ['five', 'Five-a-side'], ['futsal', 'Futsal']] }),
      Q('teams', 'How many teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'More than 16']] }),
      Q('structure', 'How is it structured?', 'one', { options: [['knockout', 'A knockout'], ['league', 'A league'], ['groups', 'Groups then knockout'], ['friendly', 'Friendlies']] }),
      Q('pitches', 'How many pitches are available?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'More than four']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Treat', 'First aid pitchside, an ambulance route, and the clear-up'),
      S('event_equipment_rental', 'conditional', 'Mark', 'Goals, nets, corner flags, markings, dugouts and the scoreboard', { when: WHEN_KIT }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at every pitch, refilled between matches'),
      S('invitation_printing', 'recommended', 'Fixture', 'Fixtures, team sheets, bibs, numbers and the results board'),
      S('guest_services', 'conditional', 'Run it', 'Team check-in, a desk that owns the fixture list, and the results', { when: WHEN_REG }),
      S('tent_furniture', 'conditional', 'Shelter', 'Team tents, substitutes’ benches and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0], WHEN_BIG_FIELD[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA for kick-offs, results and the presentation', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, medals and a player-of-the-tournament award', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The knockout rounds and the presentation', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for teams who are at the ground all day', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Steward', 'Stewarding between pitches and at the final', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('videography', 'conditional', 'Film', 'The final filmed, which settles a disputed goal', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA, the scoreboard and floodlights', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Secure', 'Pitches enough for the fixture list, with changing rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('fixture_grid', 'Schedule', 'A fixture grid with real turnarounds and a rest gap per team', 'schedule', { experience: true }),
      X('neutral_referees', 'Officiate', 'Accredited referees, named on the fixture list', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('pitch_rotation', 'Spread the load', 'Fixtures rotated across pitches so one surface does not take it all', 'map', { experience: true, when: [ans('pitches', '2', '4', '6')] }),
      X('pitchside_physio', 'Treat fast', 'A physio pitchside, which is the injury most likely on the day', 'spa', { trade: 'safety_facilities', when: WHEN_PHYSIO }),
    ],
    toolkit: { polls: ['date'], note: 'Medical declarations and fitness to play are the organiser’s and the player’s. First aid pitchside stays on the plan.' },
    timeline: {
      before: ['Fixture grid published with turnarounds and rest gaps', 'Referees and medical cover confirmed', 'Pitches marked and goals checked the day before'],
      during: ['First aid pitchside from the first kick-off', 'Water at every pitch, refilled between matches', 'Results recorded as each match ends'],
      after: ['Presentation at the ground', 'Pitches and equipment reconciled', 'Full results published'],
    },
    checklist: ['Fixture grid with turnarounds', 'Referees confirmed', 'First aid pitchside', 'Water at every pitch'],
  }),

  B('badminton-tournament', 'Rally', 'Courts running in parallel, and a draw that keeps every player moving.', {
    about: 'An indoor, equipment-light tournament where the scheduling is the whole operation: a player may be in singles, doubles and mixed, and the draw has to let them rest between.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('events', 'Which events?', 'many', { options: [['singles', 'Singles'], ['doubles', 'Doubles'], ['mixed', 'Mixed doubles'], ['team', 'Team event'], ['age', 'Age categories']] }),
      Q('courts', 'How many courts?', 'select', { options: [['2', 'Two'], ['4', 'Four'], ['8', 'Eight'], ['16', 'More than eight']] }),
      Q('shuttles', 'Are shuttles provided?', 'one', { options: [['organiser', 'By the organiser'], ['players', 'Players bring their own'], ['sponsor', 'By a sponsor']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('invitation_printing', 'recommended', 'Draw', 'The draw, court allocations, score sheets, numbers and certificates'),
      S('guest_services', 'recommended', 'Call', 'Registration, a control desk and a caller for every court'),
      S('safety_facilities', 'conditional', 'Treat', 'First aid for sprains and the courts cleared afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('event_equipment_rental', 'conditional', 'Equip', 'Nets, posts, court markings, umpire chairs and scoreboards', { when: WHEN_KIT }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water at courtside, which indoor halls rarely provide', { when: WHEN_WATER }),
      S('tent_furniture', 'conditional', 'Seat', 'Player seating by court and spectator seating around them', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Call', 'A PA to call players to court, which is what keeps a draw moving', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies and medals per event and per category', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The finals and the presentations', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for players who are at the hall from morning to evening', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Film', 'The finals filmed from a fixed court-end position', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('power_cooling', 'conditional', 'Cool', 'Cooling that does not move the shuttle, which rules out most fans', { when: [some(ans('courts', '8', '16'), WHEN_CROWD[0])] }),
      S('venue', 'conditional', 'Find', 'A hall with the court count, the height and still air', { when: WHEN_FINDING }),
    ],
    addons: [
      X('draw_software', 'Seed', 'The draw run on real software, published and updated live', 'poll', { trade: 'invitation_printing' }),
      X('court_callers', 'Keep moving', 'A caller per court, which is what stops a day overrunning', 'group', { trade: 'guest_services' }),
      X('shuttle_supply', 'Stock', 'Shuttles counted per match and issued from the control desk', 'game', { trade: 'event_equipment_rental', when: [ans('shuttles', 'organiser', 'sponsor')] }),
      X('rest_gaps', 'Space it', 'A draw that gives a multi-event player real rest between matches', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Medical declarations and fitness to play are the organiser’s and the player’s. Still air matters more than cooling in a badminton hall.' },
    timeline: {
      before: ['Draw published with court allocations and rest gaps', 'Umpires and the control desk briefed', 'Hall checked for air movement and lighting'],
      during: ['Players called to court from the control desk', 'Water at courtside, refilled', 'Scores collected per match, draw updated live'],
      after: ['Presentation at the hall', 'Courts and equipment reconciled', 'Full draw and results published'],
    },
    checklist: ['Draw published with rest gaps', 'Court callers assigned', 'Still air in the hall confirmed', 'Water at courtside'],
  }),

  B('marathon', 'Endure', 'A closed route, water every few kilometres, and medical the whole way along it.', {
    about: 'The most medically serious occasion in the catalogue. Route permissions, traffic management, hydration at intervals and medical cover distributed along the course — none of these are optional at distance.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('distances', 'Which distances?', 'many', { options: [['5', '5 km'], ['10', '10 km'], ['21', 'Half marathon'], ['42', 'Full marathon'], ['ultra', 'Ultra']] }),
      Q('route_type', 'What kind of route?', 'one', { options: [['closed', 'Fully closed roads'], ['partial', 'Partially closed'], ['park', 'Inside a park or campus'], ['mixed', 'A mix']] }),
      Q('timing', 'How are runners timed?', 'one', { options: [['chip', 'Chip timing'], ['manual', 'Manual'], ['app', 'An app'], ['none', 'Untimed']] }),
      MEDICAL, WATER, PERMITS, REGISTER, DECLARATIONS, EQUIPMENT, AWARDS, AV, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'Medical posts along the route, an ambulance route, and the finish'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water and electrolytes at intervals, sized for the field and the heat'),
      S('security_services', 'recommended', 'Marshal', 'Marshals at every junction and traffic management along the route'),
      S('event_equipment_rental', 'recommended', 'Build', 'Start and finish gantries, barriers, timing mats and the baggage area'),
      S('invitation_printing', 'recommended', 'Number', 'Bibs, route maps, timing chips, signage and finisher certificates'),
      S('guest_services', 'recommended', 'Register', 'Pre-race packet collection, baggage, and a finish-line desk'),
      S('sound_av', 'conditional', 'Announce', 'A PA at the start and finish, and at key points along the route', { when: WHEN_PA }),
      S('gifts_favours', 'conditional', 'Finish', 'Finisher medals, T-shirts and category prizes', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The start, the finish line and the route, with bib recognition', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refuel', 'Food at the finish, which runners need within the hour', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shelter', 'Baggage, changing, medical tents and a recovery area at the finish', { when: [some(WHEN_SEATS[0], WHEN_BIG_FIELD[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Deploy', 'Crew, equipment and supplies distributed along the whole route', { when: [some(ans('distances', '21', '42', 'ultra'), WHEN_BIG_FIELD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power at the start, the finish and the timing points', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Route', 'A route that can be closed, marshalled, supplied and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('medical_spacing', 'Distribute', 'Medical posts spaced along the route, not only at the finish', 'spa', { trade: 'safety_facilities' }),
      X('water_intervals', 'Space it', 'Water stations at set intervals, stocked for the field and the heat', 'glass', { trade: 'bar_beverages' }),
      X('route_recce', 'Walk it', 'The route driven and walked with the marshals and the authority', 'map', { experience: true, when: WHEN_ROUTE }),
      X('cut_off_times', 'Set limits', 'Published cut-off times, and a sweep vehicle behind the last runner', 'schedule', { experience: true }),
      X('declaration_process', 'Collect', 'Medical declarations and emergency contacts collected at registration', 'phone', { experience: true, when: WHEN_DECLARE_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'We never advise on anyone’s fitness to run, and we never give medical or training guidance. Medical cover, water and route permissions are the organiser’s and stay on the plan.' },
    timeline: {
      before: ['Route permissions and traffic management confirmed in writing', 'Medical posts and water stations sited along the route, not just at the ends', 'Declarations, emergency contacts and cut-off times collected and published'],
      during: ['Medical and water in position before the first runner starts', 'Marshals at every junction from before the start', 'A sweep vehicle behind the last runner'],
      after: ['Route reopened to schedule', 'Every runner accounted for against the start list', 'Incident log and medical report completed'],
    },
    checklist: ['Route permissions and traffic management in writing', 'Medical posts spaced along the route', 'Water at set intervals, stocked for the heat', 'Cut-offs published and a sweep vehicle'],
  }),

  B('cycling-event', 'Ride', 'A road, a bunch of riders at speed, and traffic that has to be kept away from them.', {
    about: 'Faster and further than a run, which makes the rolling road management and the marshalling the whole safety case. A mechanical support vehicle matters almost as much as the ambulance.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('ride_type', 'What kind of ride?', 'one', { options: [['race', 'A race'], ['sportive', 'A timed sportive'], ['community', 'A community ride'], ['criterium', 'A circuit race'], ['mtb', 'Off-road']] }),
      Q('distance', 'How far?', 'select', { options: [['20', 'Up to 20 km'], ['60', 'Up to 60 km'], ['120', 'Up to 120 km'], ['long', 'Longer']] }),
      Q('road_status', 'How are the roads managed?', 'one', { options: [['closed', 'Fully closed'], ['rolling', 'Rolling closures'], ['open', 'Open roads with marshals'], ['offroad', 'Off-road, no traffic']] }),
      Q('support', 'Is there mechanical and sweep support?', 'yesno'),
      MEDICAL, WATER, PERMITS, REGISTER, DECLARATIONS, EQUIPMENT, AWARDS, AV, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'Medical along the route, an ambulance route, and a plan for a crash'),
      S('security_services', 'recommended', 'Marshal', 'Marshals at every junction and rolling road management'),
      S('bar_beverages', 'recommended', 'Supply', 'Feed and water stations at intervals along the route'),
      S('event_equipment_rental', 'conditional', 'Build', 'Start and finish, barriers, timing points and the bike park', { when: WHEN_KIT }),
      S('invitation_printing', 'recommended', 'Number', 'Numbers, route maps, briefing notes, signage and certificates'),
      S('guest_services', 'conditional', 'Register', 'Registration, number issue, bike check and the finish desk', { when: WHEN_REG }),
      S('transportation', 'conditional', 'Support', 'Sweep and mechanical support vehicles behind the field', { when: [ans('support', 'yes')] }),
      S('sound_av', 'conditional', 'Brief', 'A PA for the rider briefing, the start and the finish', { when: WHEN_PA }),
      S('gifts_favours', 'conditional', 'Award', 'Medals and category prizes', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'Start, finish and a point on the route riders will want', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refuel', 'Food at the finish, and feed stations on a long route', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shelter', 'Registration, baggage, medical and recovery tents', { when: [some(WHEN_SEATS[0], WHEN_BIG_FIELD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power at the start, the finish and the timing points', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Route', 'A route that can be marshalled, supplied and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rider_briefing', 'Brief', 'A compulsory rider briefing covering the route, traffic and signals', 'group', { experience: true }),
      X('mechanical_support', 'Fix', 'A mechanical vehicle and a sweep behind the last rider', 'move', { trade: 'transportation', when: [ans('support', 'yes')] }),
      X('junction_marshals', 'Cover', 'A marshal at every junction, briefed and in position before the start', 'map', { trade: 'security_services', when: WHEN_ROUTE }),
      X('helmet_check', 'Check', 'A helmet and bike check at registration, as a condition of starting', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We give no advice on fitness, equipment or technique. Road management, medical cover and rider briefing are the organiser’s, and they stay on the plan.' },
    timeline: {
      before: ['Route permissions and road management confirmed in writing', 'Marshal positions assigned and briefed, junction by junction', 'Declarations, emergency contacts and the rider briefing prepared'],
      during: ['Rider briefing before the start, attendance expected', 'Marshals in position before the first rider', 'Sweep and mechanical vehicles behind the field'],
      after: ['Roads reopened to schedule', 'Every rider accounted for against the start list', 'Incident log completed'],
    },
    checklist: ['Road management confirmed in writing', 'Marshal at every junction', 'Sweep and mechanical support', 'Helmet and bike check at registration'],
  }),

  B('corporate-sports-tournament', 'League', 'Fixtures across weeks, between departments, with everyone still doing their day job.', {
    about: 'Different from a corporate sports day in one respect that changes the plan: it runs over weeks. Scheduling around work, keeping a league table, and consistency of officiating are the real problems.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('sports', 'Which sports?', 'many', { options: [['cricket', 'Cricket'], ['football', 'Football'], ['badminton', 'Badminton'], ['tabletennis', 'Table tennis'], ['basketball', 'Basketball'], ['indoor', 'Indoor games']] }),
      Q('weeks', 'Over how long?', 'select', { options: [['1', 'One day'], ['2', 'A weekend'], ['4', 'A few weeks'], ['12', 'A season']] }),
      Q('teams_by', 'How are teams formed?', 'one', { options: [['department', 'By department'], ['office', 'By office or location'], ['mixed', 'Deliberately mixed'], ['open', 'Open entry']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Treat', 'First aid at every fixture — office players do not warm up'),
      S('invitation_printing', 'recommended', 'Table', 'Fixtures, league tables, team sheets, bibs and certificates'),
      S('event_equipment_rental', 'conditional', 'Equip', 'Playing equipment, nets, markings and scoreboards per sport', { when: WHEN_KIT }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at every fixture, which an office booking rarely includes'),
      S('guest_services', 'conditional', 'Administer', 'A desk owning the fixture list, the table and the walkovers', { when: WHEN_REG }),
      S('gifts_favours', 'conditional', 'Award', 'A trophy, medals and awards across the sports', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The finals and the presentation, for the intranet', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food at the finals, and something at the evening fixtures', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Benches, shade and seating for colleagues who came to watch', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA for the finals and the presentation', { when: WHEN_PA }),
      S('passenger_transport', 'conditional', 'Carry', 'Transport to the venue for evening and weekend fixtures', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Book', 'Courts or grounds booked across the whole run, not fixture by fixture', { when: WHEN_FINDING }),
    ],
    addons: [
      X('league_table', 'Track', 'A published table, updated after every fixture', 'poll', { trade: 'invitation_printing' }),
      X('work_friendly_times', 'Schedule', 'Fixtures at times people can actually get to after work', 'schedule', { experience: true, when: [ans('weeks', '4', '12')] }),
      X('consistent_officials', 'Officiate', 'The same officials across the run, so the rules do not drift', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('warmup_session', 'Prepare', 'A led warm-up before each fixture, which prevents most injuries', 'game', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Adults playing sport they have not played in years is the common injury setting. First aid and a warm-up stay on the plan.' },
    timeline: {
      before: ['Fixtures published across the run, at times people can reach', 'Venues booked for the whole run, not week by week', 'Officials and first aid arranged for every fixture'],
      during: ['First aid at every fixture, not just the finals', 'Table updated and published after each round', 'Walkovers handled by a published rule'],
      after: ['Finals and presentation', 'Venue bookings and equipment reconciled', 'Full table published'],
    },
    checklist: ['Fixtures at reachable times', 'Venues booked for the run', 'First aid at every fixture', 'Published rule for walkovers'],
  }),

  B('school-sports-competition', 'Represent', 'Schools against schools, with officials whose calls have to be above argument.', {
    about: 'Not a school sports day. Visiting schools, real fixtures, parents watching and results that matter — so neutral officiating, child safeguarding and a published draw carry the event.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('sports', 'Which sports?', 'many', { options: [['athletics', 'Athletics'], ['football', 'Football'], ['cricket', 'Cricket'], ['basketball', 'Basketball'], ['throwball', 'Throwball or volleyball'], ['indoor', 'Indoor games']] }),
      Q('schools', 'How many schools?', 'select', { options: [['2', 'Two'], ['6', 'Up to 6'], ['15', 'Up to 15'], ['40', 'More than 15']] }),
      Q('ages', 'Which age groups?', 'many', { options: [['under11', 'Under 11'], ['under14', 'Under 14'], ['under17', 'Under 17'], ['under19', 'Under 19']] }),
      Q('safeguarding', 'Is there a safeguarding and supervision plan?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'Children from several schools in one place needs named supervision, a photography rule and a handover plan.',
      }),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Protect', 'First aid on every ground, an ambulance route, and the clear-up'),
      S('guest_services', 'recommended', 'Receive', 'A desk per visiting school, with fixtures, a map and a named contact'),
      S('invitation_printing', 'recommended', 'Publish', 'Draw, fixtures, bibs, numbers, result sheets and certificates'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at every ground, refilled through the day'),
      S('event_equipment_rental', 'conditional', 'Mark', 'Grounds marked, equipment, nets and scoreboards per sport', { when: WHEN_KIT }),
      S('tent_furniture', 'conditional', 'Shelter', 'School tents, shade, and seating for parents and teachers', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA for calls to the marshalling area and for results', { when: WHEN_PA }),
      S('gifts_favours', 'conditional', 'Award', 'Medals by age group and an overall championship', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Record', 'Under the schools’ own consent rules, which we follow not set', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for children who are at the ground all day, by school', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Control', 'Gate control, so only expected adults are on a ground full of children', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('passenger_transport', 'conditional', 'Bring', 'Transport for visiting schools, with a staff seat on each bus', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Secure', 'Grounds and courts enough for the fixture list, with washrooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('safeguarding_plan', 'Protect', 'Named supervision per school, a photography rule and a handover plan', 'heart', { experience: true, when: [ans('safeguarding', 'no', 'help')] }),
      X('neutral_officials', 'Officiate', 'Officials from outside every competing school, named on the draw', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('marshalling_area', 'Call them', 'A marshalling area so children are not hunted for across a ground', 'map', { trade: 'guest_services' }),
      X('age_verification', 'Verify', 'An age-group verification process agreed with the schools in advance', 'invite', { experience: true }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Children from several schools in one place: supervision is named per school, photography follows each school’s own consent, and no child leaves except with their own staff.' },
    timeline: {
      before: ['Draw, fixtures and age-group rules published to every school', 'Officials confirmed from outside the competing schools', 'Safeguarding plan agreed with each school, including photography'],
      during: ['First aid on every active ground', 'Marshalling area calling children by school and event', 'Gate controlled, no child leaving except with their own staff'],
      after: ['Championship tallied and published with the scores', 'Every school accounted for before the grounds close', 'Certificates to every participant'],
    },
    checklist: ['Draw and age rules published', 'Neutral officials confirmed', 'Safeguarding and photography plan per school', 'Marshalling area and gate control'],
  }),

  B('esports-tournament', 'Queue up', 'Machines, a network that cannot drop, and a stream that is most of the audience.', {
    about: 'The only sport here with no physical risk and the highest infrastructure risk. Power per seat, wired network and a tested stream chain — if any fails, the tournament stops.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('titles', 'Which games?', 'many', { options: [['moba', 'MOBA'], ['fps', 'FPS'], ['fighting', 'Fighting games'], ['sports_games', 'Sports titles'], ['mobile', 'Mobile titles'], ['strategy', 'Strategy']] }),
      Q('stations', 'How many playable stations?', 'select', { options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['100', 'Up to 100'], ['250', 'More than 100']] }),
      Q('network', 'What does the network need?', 'many', { options: [['lan', 'Wired LAN'], ['servers', 'Local match servers'], ['wifi', 'Spectator wifi'], ['stream', 'Streaming uplink']] }),
      Q('mainstage', 'Is there a main stage with a stream?', 'yesno'),
      Q('fairplay', 'Is there an anti-cheat and fair-play process?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'A published fair-play process and an admin who can enforce it is what makes a result stand.',
      }),
      MEDICAL, WATER, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Power per station with redundancy, and cooling for a full hall'),
      S('event_equipment_rental', 'recommended', 'Set', 'Station tables, chairs, cable management, the stage and the admin desk'),
      S('sound_av', 'conditional', 'Broadcast', 'Stage screens, commentary audio, observers and the stream', { when: [some(ans('mainstage', 'yes'), WHEN_AV[0])] }),
      S('invitation_printing', 'recommended', 'Seed', 'Brackets, station numbers, rules, passes and certificates'),
      S('guest_services', 'recommended', 'Check in', 'Team check-in, station allocation, admins and a help desk'),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for equipment left on the floor', { when: [some(WHEN_GUARD[0], ans('stations', '100', '250'))] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning, first aid and a quiet space', { when: [some(WHEN_AID[0], WHEN_CROWD[0])] }),
      S('bar_beverages', 'conditional', 'Supply', 'Water and cold drinks at the stations, through a long day', { when: WHEN_WATER }),
      S('event_lighting', 'conditional', 'Light', 'Stage lighting for the stream, and working light on the floor', { when: [ans('mainstage', 'yes')] }),
      S('catering_food', 'conditional', 'Fuel', 'Food for players who will not leave their station', { when: WHEN_FOOD }),
      S('gifts_favours', 'conditional', 'Award', 'Prizes, and the prize-money process agreed in advance', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Cover', 'The floor, the stage and the finals, for the sponsors', { when: WHEN_SHOT }),
      S('venue', 'conditional', 'Find', 'A hall with the power, the cooling and the network headroom', { when: WHEN_FINDING }),
    ],
    addons: [
      X('wired_lan', 'Connect', 'Wired drops, load-tested with the real number of machines', 'power_cooling', { trade: 'power_cooling', when: [ans('network', 'lan', 'servers')] }),
      X('stream_chain', 'Broadcast', 'The full stream chain tested end to end before doors', 'media', { trade: 'sound_av', when: [ans('network', 'stream')] }),
      X('fairplay_admins', 'Enforce', 'Published rules and admins who can actually enforce them', 'poll', { experience: true, when: [ans('fairplay', 'no', 'help')] }),
      X('prize_process', 'Pay out', 'A written prize-money process, with timing stated before entries close', 'budget', { experience: true, when: WHEN_TROPHY }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the rules, the admins and the prize process before entries close. Load-test the power and the network with the real machine count.' },
    timeline: {
      before: ['Power and network sized per station and load-tested at full load', 'Stream chain tested end to end', 'Rules, admins and the prize process published'],
      during: ['Stations tested before check-in opens', 'Matches to the bracket, admins on the floor', 'Stream monitored, with a fallback if the uplink drops'],
      after: ['Prizes paid to the published timeline', 'Equipment reconciled', 'Results and VODs published'],
    },
    checklist: ['Power and network load-tested', 'Stream chain tested end to end', 'Rules and admins published', 'Prize-money process written'],
  }),

  B('fitness-bootcamp', 'Push', 'An outdoor session at six in the morning, with water and a first-aid kit on the grass.', {
    about: 'Small, repeatable and the easiest occasion here to under-prepare. A qualified instructor, water, shade and a first-aid kit are the whole requirement — and all four get skipped.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('session_type', 'What kind of session?', 'one', { options: [['hiit', 'HIIT or circuits'], ['strength', 'Strength'], ['running', 'Running-based'], ['functional', 'Functional fitness'], ['mixed', 'A mix']] }),
      Q('sessions', 'How many sessions?', 'select', { options: [['1', 'One'], ['4', 'A few'], ['12', 'A programme'], ['ongoing', 'Ongoing']] }),
      Q('levels', 'What levels are taking part?', 'one', { options: [['beginner', 'Beginners'], ['mixed', 'Mixed levels'], ['advanced', 'Advanced'], ['unknown', 'We do not know yet']] }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'A first-aid kit, a trained person present, and the space left as found'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at the session, which outdoor spaces never provide'),
      S('event_equipment_rental', 'conditional', 'Equip', 'Mats, weights, cones, bands and whatever the session needs', { when: WHEN_KIT }),
      S('live_entertainment', 'conditional', 'Lead', 'A qualified instructor, with their certification seen', { when: WHEN_FIND_COACH }),
      S('sound_av', 'conditional', 'Carry', 'A portable speaker and a headset mic, so counts can be heard outdoors', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('tent_furniture', 'conditional', 'Shade', 'Shade, mats and somewhere to leave bags', { when: [some(WHEN_SEATS[0], ans('place', 'ground'))] }),
      S('photography', 'conditional', 'Record', 'A few images, with everyone asked first', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Announce', 'Posters, sign-ups and the declaration form', { when: WHEN_SIGNED }),
      S('guest_services', 'conditional', 'Register', 'Sign-ups and declarations collected before anyone takes part', { when: [some(WHEN_DECLARE_HELP[0], WHEN_SIGNED[0])] }),
      S('catering_food', 'conditional', 'Refuel', 'Something afterwards, if the session is long', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'A space with shade, a flat surface and a washroom nearby', { when: WHEN_FINDING }),
    ],
    addons: [
      X('qualification_check', 'Verify', 'The instructor’s certification seen and recorded, not assumed', 'schedule', { experience: true }),
      X('declaration_form', 'Collect', 'Medical declarations and emergency contacts before the first session', 'invite', { experience: true, when: WHEN_DECLARE_HELP }),
      X('level_options', 'Scale it', 'A stated easier option for every exercise, announced at the start', 'spa', { experience: true, when: [ans('levels', 'mixed', 'beginner', 'unknown')] }),
      X('heat_timing', 'Time it', 'Sessions scheduled away from the hottest hours, with a heat cut-off', 'schedule', { experience: true, when: [ans('place', 'ground')] }),
    ],
    toolkit: { polls: ['date'], note: 'We give no training, dietary or medical advice. The instructor’s qualification and the participants’ declarations are the organiser’s to hold.' },
    timeline: {
      before: ['Instructor qualification seen and recorded', 'Declarations and emergency contacts collected', 'Session timed away from the hottest part of the day'],
      during: ['Water available throughout, not only at the end', 'An easier option announced for every exercise', 'First-aid kit and a trained person present'],
      after: ['Space left as found', 'Anyone who struggled followed up by the instructor', 'Next session confirmed'],
    },
    checklist: ['Instructor qualification recorded', 'Declarations collected', 'Water and shade at the session', 'First-aid kit present'],
  }),

  B('yoga-workshop', 'Settle', 'A quiet floor, enough space between mats, and a teacher who can see everyone.', {
    about: 'A session, not a treatment. We never describe yoga as therapy or imply a health outcome, and we never advise anyone on whether they should take part.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('style', 'What style?', 'one', { options: [['hatha', 'Hatha'], ['vinyasa', 'Vinyasa or flow'], ['ashtanga', 'Ashtanga'], ['restorative', 'Restorative or yin'], ['prenatal', 'Prenatal'], ['mixed', 'Mixed or beginners']] }),
      Q('session_length', 'How long?', 'select', { options: [['1', 'An hour'], ['2', 'Two hours'], ['half', 'Half a day'], ['full', 'A full day or more']] }),
      Q('props', 'Are mats and props provided?', 'one', { options: [['organiser', 'Yes, we provide them'], ['participants', 'Participants bring their own'], ['both', 'Some of each']] }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'conditional', 'Lay out', 'Mats, blocks, straps and bolsters, spaced so nobody touches', { when: [some(ans('props', 'organiser', 'both'), WHEN_KIT[0])] }),
      S('live_entertainment', 'conditional', 'Teach', 'A qualified teacher for the style, with their certification seen', { when: WHEN_FIND_COACH }),
      S('sound_av', 'conditional', 'Carry', 'A headset mic, quiet enough not to break the room', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water available throughout, placed away from the mats', { when: WHEN_WATER }),
      S('safety_facilities', 'conditional', 'Care', 'A first-aid kit, washrooms, and the room reset afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('event_lighting', 'conditional', 'Soften', 'Light that can be lowered, because overhead strip light ruins this', { when: WHEN_AV }),
      S('decoration_floral', 'optional', 'Calm', 'A simple, uncluttered room — less is the point'),
      S('guest_services', 'conditional', 'Receive', 'Sign-ups, declarations and someone to settle latecomers quietly', { when: [some(WHEN_DECLARE_HELP[0], WHEN_SIGNED[0])] }),
      S('catering_food', 'conditional', 'Nourish', 'Something light after, if the session is half a day or more', { when: WHEN_FOOD }),
      S('invitation_printing', 'conditional', 'Announce', 'Posters, sign-ups and the declaration form', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'Only with everyone asked first, and never mid-posture', { when: WHEN_SHOT }),
      S('venue', 'conditional', 'Find', 'A quiet, warm room with floor space and no through traffic', { when: WHEN_FINDING }),
    ],
    addons: [
      X('mat_spacing', 'Space it', 'Mats laid out with real space between, which halves the capacity', 'map', { experience: true }),
      X('teacher_check', 'Verify', 'The teacher’s qualification seen and recorded', 'schedule', { experience: true }),
      X('declaration_form', 'Collect', 'Declarations and emergency contacts, collected before the session', 'invite', { experience: true, when: WHEN_DECLARE_HELP }),
      X('quiet_entry', 'Protect it', 'A stated policy on latecomers, phones and leaving early', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'A session is not a treatment. We never describe it as therapy, never imply a health outcome, and never advise anyone on whether to take part.' },
    timeline: {
      before: ['Teacher qualification seen and recorded', 'Declarations collected, with no questions asked by us', 'Room checked for quiet, warmth and floor space'],
      during: ['Mats spaced properly, even if it means fewer places', 'Water available, away from the mats', 'Latecomers settled quietly, to the stated policy'],
      after: ['Room reset and props cleaned', 'Feedback taken by the teacher, not by a form', 'Next session announced'],
    },
    checklist: ['Teacher qualification recorded', 'Declarations collected', 'Mats spaced properly', 'Quiet room with no through traffic'],
  }),

  B('meditation-retreat', 'Still', 'Silence held for days, which needs more logistics than it sounds.', {
    about: 'The hardest thing to arrange here is quiet: a property with no road noise, no other event running, and meals served without conversation. Nothing about this is described as treatment.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('nights', 'How many nights?', 'select', { options: [['0', 'A day, no stay'], ['1', 'One night'], ['3', 'Up to three'], ['10', 'Longer']] }),
      Q('silence', 'Is it held in silence?', 'one', { options: [['full', 'Fully silent'], ['partial', 'Silent for parts'], ['no', 'Not silent']] }),
      Q('tradition', 'Is it within a particular tradition?', 'one', {
        optional: true, options: [['secular', 'Secular'], ['stated', 'A tradition the teacher will state'], ['unsure', 'Not sure yet']],
        help: 'We never attribute a tradition to a retreat, a teacher or a participant. The teacher states it or we do not.',
      }),
      DIET_ONLY, ALLERGY_ONLY, MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, FOOD, PHOTOS, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('venue', 'conditional', 'Remove', 'A property that is genuinely quiet, with no other event running', { when: WHEN_FINDING }),
      S('catering_food', 'conditional', 'Nourish', 'Simple meals to everyone’s needs, served without breaking the silence', { when: [some(ans('nights', '1', '3', '10'), WHEN_FOOD[0])] }),
      S('event_equipment_rental', 'conditional', 'Prepare', 'Cushions, mats, blankets and a hall laid out for stillness', { when: WHEN_KIT }),
      S('live_entertainment', 'conditional', 'Guide', 'A teacher, with their training and tradition stated by them', { when: WHEN_FIND_COACH }),
      S('safety_facilities', 'conditional', 'Care', 'A first-aid kit, washrooms serviced quietly, and the clear-up', { when: [some(WHEN_AID[0], ans('nights', '1', '3', '10'))] }),
      S('passenger_transport', 'conditional', 'Convey', 'Transport out and back, together, so nobody arrives disruptively', { when: WHEN_RIDE }),
      S('guest_services', 'conditional', 'Hold', 'A single point of contact, and the silence protected from outside', { when: [some(ans('silence', 'full', 'partial'), WHEN_DECLARE_HELP[0])] }),
      S('bar_beverages', 'conditional', 'Supply', 'Water and hot drinks available without anyone having to ask', { when: WHEN_WATER }),
      S('invitation_printing', 'conditional', 'Prepare', 'Joining notes, the schedule, the silence policy and declarations', { when: WHEN_SIGNED }),
      S('event_lighting', 'conditional', 'Soften', 'Low, warm light in the hall and on the paths after dark', { when: WHEN_AV }),
      S('photography', 'conditional', 'Record', 'Almost nothing, and only with everyone asked beforehand', { when: WHEN_SHOT }),
    ],
    addons: [
      X('noise_survey', 'Listen first', 'The property visited and listened to, at the hours the retreat runs', 'map', { experience: true }),
      X('silence_policy', 'Hold it', 'A written policy on phones, speaking and leaving, sent in advance', 'schedule', { experience: true, when: [ans('silence', 'full', 'partial')] }),
      X('silent_service', 'Serve quietly', 'Meals and housekeeping arranged so staff do not break the silence', 'chef', { trade: 'catering_food' }),
      X('exit_route', 'Let them leave', 'A way for anyone to leave at any point, arranged without fuss', 'bus', { experience: true }),
    ],
    toolkit: { chat: false, polls: ['date', 'food'], note: 'This is not a treatment and we never describe it as one. We never state or infer anyone’s tradition, faith or practice — the teacher states theirs, and participants state nothing.' },
    timeline: {
      before: ['Property visited and listened to at the retreat’s own hours', 'Silence policy and joining notes sent well in advance', 'Dietary needs and declarations collected'],
      during: ['Silence protected from staff, deliveries and the outside', 'Meals and housekeeping arranged not to break it', 'Anyone who needs to leave helped to, without explanation'],
      after: ['Property restored', 'Participants contacted once, briefly, and not marketed to', 'Teacher settled'],
    },
    checklist: ['Property genuinely quiet at the right hours', 'Silence policy sent in advance', 'Dietary needs collected', 'A way out for anyone who needs it'],
  }),

  B('wellness-retreat', 'Restore', 'Days away with a programme, where the schedule is the thing that has to breathe.', {
    about: 'Broader than a meditation retreat: movement, food, rest and sessions across several days. The common failure is over-programming it until it becomes a conference in a nicer place.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('nights', 'How many nights?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Up to four'], ['7', 'A week or more']] }),
      Q('elements', 'What is in the programme?', 'many', { options: [['movement', 'Movement or yoga'], ['meditation', 'Meditation'], ['nature', 'Walks and nature'], ['workshops', 'Workshops'], ['treatments', 'Treatments'], ['rest', 'Deliberate rest']] }),
      Q('practitioners', 'Are treatment practitioners involved?', 'yesno', {
        optional: true, help: 'Anyone offering a treatment states their own qualification. We never describe a treatment’s effect.',
      }),
      DIET_ONLY, ALLERGY_ONLY, MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, REGISTER, SIGNAGE, PHOTOS, FOOD, TRANSPORT,
    ],
    plan: [
      S('venue', 'conditional', 'Find', 'A property with the rooms, the grounds and the quiet for the days', { when: WHEN_FINDING }),
      S('catering_food', 'recommended', 'Nourish', 'Every meal across every day, to each person’s stated needs'),
      S('event_equipment_rental', 'conditional', 'Prepare', 'Mats, props, workshop materials and the session spaces', { when: WHEN_KIT }),
      S('live_entertainment', 'conditional', 'Lead', 'Teachers and facilitators, each stating their own qualification', { when: WHEN_FIND_COACH }),
      S('passenger_transport', 'conditional', 'Convey', 'Transport out, back, and for anything away from the property', { when: WHEN_RIDE }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid on the property, and the clear-up across the days', { when: [some(WHEN_AID[0], ans('nights', '2', '4', '7'))] }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water and herbal drinks available all day without asking'),
      S('tent_furniture', 'conditional', 'Arrange', 'Outdoor seating, session furniture, shade and rest spaces', { when: [some(WHEN_SEATS[0], ans('elements', 'nature', 'rest'))] }),
      S('sound_av', 'conditional', 'Support', 'Quiet sound for sessions, and a screen only where one is needed', { when: WHEN_AV }),
      S('guest_services', 'conditional', 'Look after', 'Arrival, declarations, room allocation and a single contact', { when: [some(WHEN_DECLARE_HELP[0], WHEN_REG[0])] }),
      S('photography', 'conditional', 'Record', 'With everyone asked first, and nothing during a session', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Prepare', 'Joining notes, the schedule and the declaration form', { when: WHEN_SIGNED }),
    ],
    addons: [
      X('unscheduled_time', 'Leave gaps', 'Genuinely empty hours, protected in the schedule', 'schedule', { experience: true, when: [ans('elements', 'rest')] }),
      X('practitioner_credentials', 'Verify', 'Each practitioner’s own qualification seen and recorded', 'invite', { experience: true, when: [ans('practitioners', 'yes')] }),
      X('dietary_care', 'Cater properly', 'Every dietary need met at every meal, not just at one', 'chef', { trade: 'catering_food' }),
      X('arrival_buffer', 'Ease in', 'A first evening with nothing in it, because travel always overruns', 'bus', { experience: true, when: WHEN_RIDE }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We make no health claims. No session or treatment here is described as therapy, as a cure, or as a substitute for medical care.' },
    timeline: {
      before: ['Property visited, with the session spaces seen rather than described', 'Dietary needs and declarations collected individually', 'Schedule written with real gaps in it'],
      during: ['Meals to every stated need, at every sitting', 'Sessions led by people whose qualifications are on record', 'Unscheduled time protected, not filled'],
      after: ['Property restored', 'Follow-up kept light and not turned into marketing', 'Practitioners settled'],
    },
    checklist: ['Property and session spaces seen', 'Dietary needs collected individually', 'Practitioner qualifications recorded', 'Empty hours protected in the schedule'],
  }),

  B('martial-arts-competition', 'Contest', 'Contact, weight categories and officials whose calls have to be instant.', {
    about: 'Full contact means the medical cover is the event, not a precaution. Weigh-in, matting, protective equipment checks and a doctor at the mats are all conditions of running it.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('disciplines', 'Which disciplines?', 'many', { options: [['karate', 'Karate'], ['taekwondo', 'Taekwondo'], ['judo', 'Judo'], ['boxing', 'Boxing'], ['mma', 'Mixed martial arts'], ['kalari', 'Traditional forms']] }),
      Q('contact', 'What level of contact?', 'one', { options: [['forms', 'Forms only, no contact'], ['light', 'Light contact'], ['full', 'Full contact'], ['mixed', 'Both forms and contact']] }),
      Q('mats', 'How many mats or rings?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      Q('weighin', 'Is there a weigh-in?', 'yesno'),
      MEDICAL, WATER, OFFICIALS, REGISTER, DECLARATIONS, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'A doctor or paramedic at the mats, an ambulance route, and first aid'),
      S('event_equipment_rental', 'recommended', 'Mat', 'Matting, rings, scoring equipment and the warm-up area'),
      S('invitation_printing', 'recommended', 'Draw', 'Draws by category and weight, scorecards, numbers and certificates'),
      S('guest_services', 'recommended', 'Marshal', 'Weigh-in, registration, equipment checks and calls to the mat'),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water at every mat, especially after a weigh-in', { when: WHEN_WATER }),
      S('tent_furniture', 'conditional', 'Seat', 'Competitor seating by club, officials’ tables and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Call', 'A PA to call competitors to the mat and announce results', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Medals by category and weight, and an overall team trophy', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The bouts and the podium, from outside the safety area', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Bouts filmed, which is what settles a disputed decision', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food after the weigh-in, which competitors will need', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Separate', 'Keeping spectators and clubs apart where a bout gets heated', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('venue', 'conditional', 'Find', 'A hall with the floor area, the ceiling height and changing rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('mat_doctor', 'Station', 'A doctor or paramedic at the mats for the whole of a contact event', 'spa', { trade: 'safety_facilities', when: [ans('contact', 'light', 'full', 'mixed')] }),
      X('equipment_check', 'Inspect', 'Protective equipment checked at registration, as a condition of competing', 'schedule', { experience: true }),
      X('weighin_process', 'Weigh', 'A private, supervised weigh-in with a published tolerance', 'poll', { trade: 'guest_services', when: [ans('weighin', 'yes')] }),
      X('neutral_officials', 'Officiate', 'Officials from outside the competing clubs, named on the draw', 'group', { experience: true, when: WHEN_OFFICIALS }),
    ],
    toolkit: { polls: ['date'], note: 'A contact event runs with a doctor or paramedic at the mats. We will say so plainly if that is removed, and we never advise on anyone’s fitness to compete.' },
    timeline: {
      before: ['Draws by category and weight published, officials named', 'Medical cover confirmed for the full duration, not part of it', 'Equipment standards published with the entry form'],
      during: ['Weigh-in supervised and private, with a published tolerance', 'Protective equipment checked before every bout', 'Medical cover at the mats continuously'],
      after: ['Any injury recorded and followed up', 'Results published with the draws', 'Mats and hall cleared'],
    },
    checklist: ['Doctor or paramedic at the mats', 'Draws and officials published', 'Equipment checks at registration', 'Supervised weigh-in process'],
  }),

  B('swimming-competition', 'Lane', 'Water, which means a qualified lifeguard is a condition and not a line item.', {
    about: 'The only occasion in this category where the hazard is the venue itself. Lifeguard cover, lane discipline and a clear poolside are the conditions of running it at all.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('events', 'Which events?', 'many', { options: [['freestyle', 'Freestyle'], ['stroke', 'Other strokes'], ['relay', 'Relays'], ['distance', 'Distance'], ['diving', 'Diving'], ['age', 'Age categories']] }),
      Q('lifeguard', 'Lifeguard cover', 'one', {
        options: [['venue', 'The pool provides it'], ['arrange', 'Please arrange it'], ['own', 'We have our own']],
        help: 'A competition in water runs with qualified lifeguards on poolside. We will keep this on the plan.',
      }),
      Q('lanes', 'How many lanes?', 'select', { options: [['4', 'Four'], ['6', 'Six'], ['8', 'Eight'], ['10', 'More than eight']] }),
      Q('timing', 'How are swimmers timed?', 'one', { options: [['electronic', 'Electronic timing'], ['manual', 'Manual with stopwatches'], ['both', 'Both'], ['none', 'Not timed']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, DECLARATIONS, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Guard', 'Lifeguards on poolside, first aid, and a clear, dry walking route'),
      S('event_equipment_rental', 'conditional', 'Fit', 'Lane ropes, blocks, timing pads, boards and the results display', { when: [some(WHEN_KIT[0], ans('timing', 'electronic', 'both'))] }),
      S('invitation_printing', 'recommended', 'Seed', 'Heat sheets, lane allocations, caps, numbers and certificates'),
      S('guest_services', 'recommended', 'Marshal', 'Registration, a marshalling area and calls to the blocks'),
      S('sound_av', 'conditional', 'Start', 'A PA and a starting system that carries over water noise', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Swimmer seating by club, officials’ positions and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water poolside, which swimmers need more than they expect', { when: WHEN_WATER }),
      S('gifts_favours', 'conditional', 'Award', 'Medals by event and age group, and a team trophy', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'From poolside positions that do not obstruct the lifeguards', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for swimmers who are at the pool all day', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Film', 'Finishes filmed, which settles a close touch', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('security_services', 'conditional', 'Control', 'Poolside access limited to swimmers, officials and lifeguards', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('venue', 'conditional', 'Find', 'A pool with the lanes, the depth and lifeguard cover included', { when: WHEN_FINDING }),
    ],
    addons: [
      X('lifeguard_cover', 'Watch', 'Qualified lifeguards on poolside for every minute the pool is in use', 'spa', { trade: 'safety_facilities', when: [ans('lifeguard', 'arrange')] }),
      X('electronic_timing', 'Time it', 'Touch pads and a results display, so a close finish is not argued', 'poll', { trade: 'event_equipment_rental', when: [ans('timing', 'electronic', 'both')] }),
      X('poolside_discipline', 'Keep clear', 'Poolside restricted, dry routes marked, and no running enforced', 'map', { experience: true }),
      X('heat_sheets', 'Publish', 'Heat sheets published the evening before, not on the morning', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'A pool in use runs with qualified lifeguards on poolside, always. We keep that on the plan and say so if it is removed.' },
    timeline: {
      before: ['Lifeguard cover confirmed for every hour the pool is in use', 'Heat sheets and lane allocations published the evening before', 'Timing system tested in the pool, not assumed'],
      during: ['Lifeguards on poolside continuously, not on call', 'Poolside kept clear and dry, access restricted', 'Results recorded and published per heat'],
      after: ['Pool and equipment handed back', 'Results and records published', 'Any incident logged'],
    },
    checklist: ['Lifeguards for every hour of use', 'Heat sheets published in advance', 'Timing tested in the pool', 'Poolside access restricted'],
  }),

  B('sports-awards-ceremony', 'Honour', 'Athletes in a room instead of on a field, being named for a season of work.', {
    about: 'A ceremony rather than a competition, but the credibility problem is the same: the selection has to be defensible. Published criteria matter more than the staging.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('categories', 'How many award categories?', 'select', { options: [['8', 'Up to 8'], ['20', 'Up to 20'], ['45', 'Up to 45'], ['80', 'More than 45']] }),
      Q('selection', 'How are winners chosen?', 'one', { options: [['stats', 'On performance data'], ['panel', 'A selection panel'], ['vote', 'A vote'], ['mixed', 'A mix']] }),
      Q('sports_covered', 'Across how many sports?', 'select', { options: [['1', 'One'], ['3', 'A few'], ['8', 'Several'], ['20', 'Many']] }),
      CHIEF_GUEST, DRESS_CODE, AWARDS, AV, REGISTER, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Preside', 'A host who knows the sports and can pronounce every athlete’s name'),
      S('sound_av', 'recommended', 'Run', 'Mics, a screen for the highlights, and cues that land on the name'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting built for the handover photograph'),
      S('gifts_favours', 'conditional', 'Award', 'Trophies and medals, engraved and sorted in calling order', { when: WHEN_TROPHY }),
      S('decoration_floral', 'recommended', 'Set', 'A stage that makes a season of work feel properly marked'),
      S('photography', 'conditional', 'Capture', 'Every handover and a portrait of each athlete', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Publish', 'Invitations, the running order, citations and certificates', { when: [some(WHEN_PRINTED[0], WHEN_SIGNED[0])] }),
      S('videography', 'conditional', 'Film', 'Highlight reels per category, which is what makes this work', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('catering_food', 'conditional', 'Host', 'Dinner after the awards, to athletes’ dietary needs', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Seat', 'Seating by sport or club, so winners can reach the stage', { when: [some(WHEN_CROWD[0], WHEN_REG[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, podium, screen and a route up and down', { when: [some(WHEN_AV[0], WHEN_CROWD[0])] }),
      S('passenger_transport', 'conditional', 'Bring', 'Transport for athletes travelling in from other cities', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Find', 'A room with a stage and space for a dinner after', { when: WHEN_FINDING }),
    ],
    addons: [
      X('selection_criteria', 'Publish', 'The criteria and the panel published before the shortlist', 'poll', { experience: true }),
      X('highlight_reels', 'Show', 'A short reel per category, cut from the season’s footage', 'film', { trade: 'videography' }),
      X('athlete_portraits', 'Portrait', 'A portrait of every winner, taken and printed on the night', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('runtime_budget', 'Time it', 'Ninety seconds per award, and the order built to that number', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the selection criteria and the panel before the shortlist. Credibility is what an athlete is accepting.' },
    timeline: {
      before: ['Selection criteria and panel published before the shortlist', 'Trophies engraved, names checked with each club', 'Highlight reels cut per category'],
      during: ['Seating by club, so winners reach the stage quickly', 'Awards in blocks with reels between', 'Portraits as winners come off stage'],
      after: ['Absent athletes’ awards delivered', 'Reels and portraits shared with the clubs', 'Venue settled'],
    },
    checklist: ['Selection criteria published', 'Names checked with the clubs', 'Highlight reels prepared', 'Runtime budgeted per award'],
  }),

  B('community-fitness-day', 'Move', 'A park, a free session, and people who have not exercised in years.', {
    about: 'Open to anyone, which means the mix of ability is unknown and the safety planning has to assume the least prepared person. Nothing is sold, nothing is diagnosed, nothing is promised.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE, INSTRUCTOR,
      Q('activities', 'What is on?', 'many', { options: [['zumba', 'Dance fitness'], ['yoga', 'Yoga'], ['walk', 'A group walk or run'], ['games', 'Games'], ['demos', 'Demonstrations'], ['checks', 'Health checks']] }),
      Q('ages', 'Who is it aimed at?', 'many', { options: [['children', 'Children'], ['adults', 'Adults'], ['seniors', 'Older people'], ['families', 'Families'], ['anyone', 'Anyone']] }),
      MEDICAL, WATER, PERMITS, DECLARATIONS, EQUIPMENT, AV, REGISTER, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'First aid on site, shade, washrooms and the clear-up'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Free water across the ground, which is the main safety item outdoors'),
      S('sound_av', 'conditional', 'Lead', 'A PA and headset mics, so an instructor can be heard across a park', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('event_equipment_rental', 'conditional', 'Set up', 'Mats, markings, a stage or platform, and the activity zones', { when: WHEN_KIT }),
      S('live_entertainment', 'conditional', 'Instruct', 'Qualified instructors for each activity, qualifications recorded', { when: WHEN_FIND_COACH }),
      S('tent_furniture', 'conditional', 'Shelter', 'Shade, seating and a rest area, especially for older participants', { when: [some(WHEN_SEATS[0], ans('ages', 'seniors', 'families'))] }),
      S('guest_services', 'conditional', 'Welcome', 'Sign-in, declarations and marshals across the activity zones', { when: [some(WHEN_DECLARE_HELP[0], WHEN_REG[0])] }),
      S('invitation_printing', 'conditional', 'Signpost', 'Zone signage, a timetable, declaration forms and safety notices', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'With consent, and with a rule where children are present', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refresh', 'Fruit and light refreshments, nothing sold as a health product', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Steward', 'Stewarding in a public park, and routing around other users', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA and any screens, in a park with no sockets', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Permit', 'A park or ground with permission, shade and washrooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('all_abilities', 'Scale it', 'A stated easier option for every activity, announced at the start', 'spa', { experience: true, when: [ans('ages', 'seniors', 'anyone', 'families')] }),
      X('heat_plan', 'Time it', 'Scheduled away from the hottest hours, with a heat cut-off', 'schedule', { experience: true }),
      X('check_privacy', 'Screen it', 'Any health check in a private, screened space, run by qualified staff', 'bed', { trade: 'tent_furniture', when: [ans('activities', 'checks')] }),
      X('child_rule', 'Safeguard', 'A supervision and photography rule where children take part', 'heart', { experience: true, when: [ans('ages', 'children', 'families')] }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'We give no health, dietary or fitness advice and make no health claims. Any check on site is run by qualified people, in private, and the results are theirs alone.' },
    timeline: {
      before: ['Park permission, shade and washrooms confirmed', 'Instructor qualifications recorded', 'Scheduled away from the hottest hours'],
      during: ['Free water across the ground from the start', 'An easier option announced for every activity', 'Any health check in a private screened space'],
      after: ['Park left as found', 'No participant data retained or used for marketing', 'Feedback taken informally'],
    },
    checklist: ['Park permission and shade', 'Instructor qualifications recorded', 'Free water across the ground', 'Private space for any health check'],
  }),

  B('basketball-tournament', 'Run it', 'Two courts, a shot clock and a schedule with no slack in it.', {
    about: 'Fast games and short turnarounds mean a day of basketball is mostly timetable management. Officials, a working shot clock and a scorer per court are what keep it honest.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('format', 'What format?', 'one', { options: [['fives', 'Five-a-side'], ['threes', '3x3'], ['mixed', 'Both'], ['youth', 'Youth categories']] }),
      Q('teams', 'How many teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'More than 16']] }),
      Q('courts', 'How many courts?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'More than four']] }),
      Q('clock', 'Do you need shot clocks and scoreboards?', 'yesno'),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Treat', 'First aid courtside — ankles are the injury, and they are frequent'),
      S('event_equipment_rental', 'conditional', 'Fit', 'Hoops, court markings, shot clocks, scoreboards and benches', { when: [some(ans('clock', 'yes'), WHEN_KIT[0])] }),
      S('invitation_printing', 'recommended', 'Schedule', 'Fixtures, team sheets, scoresheets, numbers and certificates'),
      S('guest_services', 'recommended', 'Operate', 'A scorer and clock operator per court, and a control desk'),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water courtside, refilled between games', { when: WHEN_WATER }),
      S('tent_furniture', 'conditional', 'Seat', 'Team benches, officials’ tables and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Call', 'A PA for calls to court, buzzers and the presentation', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, medals and an MVP award', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The knockout games and the presentation', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for teams across a long day', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Film', 'The final, filmed from a raised court-side position', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding between courts and at the final', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('venue', 'conditional', 'Find', 'Courts with hoops at the right height and a usable surface', { when: WHEN_FINDING }),
    ],
    addons: [
      X('shot_clocks', 'Time it', 'Working shot clocks and a buzzer on every court', 'poll', { trade: 'event_equipment_rental', when: [ans('clock', 'yes')] }),
      X('court_officials', 'Officiate', 'Two officials and a table crew per court, named on the schedule', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('ankle_kit', 'Strap', 'Strapping and ice courtside, which is what the day will actually need', 'spa', { trade: 'safety_facilities' }),
      X('tight_schedule', 'Pace it', 'A schedule with real warm-up and turnaround time between games', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'First aid courtside stays on the plan. We never advise on anyone’s fitness to play.' },
    timeline: {
      before: ['Schedule published with warm-up and turnaround per game', 'Officials and table crew confirmed per court', 'Hoops, clocks and surfaces checked the day before'],
      during: ['First aid courtside from the first tip-off', 'Water refilled between games', 'Scores and the schedule updated at the control desk'],
      after: ['Presentation at the courts', 'Equipment reconciled', 'Full results published'],
    },
    checklist: ['Schedule with real turnarounds', 'Officials and table crew per court', 'Shot clocks working', 'Strapping and ice courtside'],
  }),

  B('volleyball-tournament', 'Set', 'Nets at the right height, a sand or court surface, and matches that can run long.', {
    about: 'The variable nobody plans for is match length: a three-set game can take twice as long as expected. The schedule needs slack, and beach volleyball needs the sand raked between games.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('surface', 'What surface?', 'one', { options: [['indoor', 'Indoor court'], ['beach', 'Sand'], ['grass', 'Grass'], ['outdoor_court', 'Outdoor hard court']] }),
      Q('format', 'What format?', 'one', { options: [['sixes', 'Six-a-side'], ['fours', 'Four-a-side'], ['twos', 'Beach doubles'], ['mixed', 'Mixed']] }),
      Q('teams', 'How many teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'More than 16']] }),
      Q('courts', 'How many courts?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Pitch', 'Nets, posts, antennae, court markings, referee stands and scoreboards'),
      S('safety_facilities', 'conditional', 'Treat', 'First aid courtside, and the courts cleared afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at every court — sand and sun dehydrate players fast'),
      S('invitation_printing', 'recommended', 'Schedule', 'Fixtures, scoresheets, team numbers and certificates'),
      S('guest_services', 'conditional', 'Operate', 'A control desk, scorers and calls to court', { when: WHEN_REG }),
      S('tent_furniture', 'conditional', 'Shade', 'Team shade, benches and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0], ans('surface', 'beach', 'grass'))] }),
      S('sound_av', 'conditional', 'Call', 'A PA for calls to court and the presentation', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, medals and an MVP', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The finals and the presentation', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for teams who are on court all day', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA and any floodlights', { when: WHEN_OUTSIDE }),
      S('security_services', 'conditional', 'Steward', 'Stewarding between courts', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('venue', 'conditional', 'Find', 'Courts with the right surface, net height and run-off space', { when: WHEN_FINDING }),
    ],
    addons: [
      X('schedule_slack', 'Allow time', 'A schedule built on three-set games, not on two', 'schedule', { experience: true }),
      X('sand_prep', 'Rake it', 'Sand raked, levelled and cleared between matches', 'broom', { trade: 'safety_facilities', when: [ans('surface', 'beach')] }),
      X('net_heights', 'Set it', 'Net heights set per category and checked before each match', 'game', { trade: 'event_equipment_rental' }),
      X('sun_cover', 'Shade', 'Shade at every court, which matters more on sand than anywhere', 'tent', { trade: 'tent_furniture', when: [ans('surface', 'beach', 'grass', 'outdoor_court')] }),
    ],
    toolkit: { polls: ['date'], note: 'Sand and sun dehydrate players faster than any other surface here. Water and shade stay on the plan.' },
    timeline: {
      before: ['Schedule built assuming three-set matches', 'Nets, heights and run-off space checked the day before', 'Officials and scorers confirmed'],
      during: ['Water and shade at every court from the first match', 'Sand raked between matches', 'Net heights rechecked per category'],
      after: ['Presentation at the courts', 'Equipment reconciled and surfaces restored', 'Results published'],
    },
    checklist: ['Schedule built on three-set games', 'Net heights set per category', 'Water and shade at every court', 'Sand raked between matches'],
  }),
  B('kabaddi-tournament', 'Raid', 'Full contact on a mat, with no equipment to absorb any of it.', {
    about: 'A contact sport played without protective gear, which puts the matting and the medical cover at the centre of the plan. Matches are short and injuries are not.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('surface', 'What surface?', 'one', { options: [['mat', 'A kabaddi mat'], ['clay', 'Clay or mud'], ['ground', 'Prepared ground'], ['indoor', 'An indoor court']] }),
      Q('teams', 'How many teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['32', 'More than 16']] }),
      Q('categories', 'Which categories?', 'many', { options: [['men', 'Men'], ['women', 'Women'], ['youth', 'Youth'], ['veterans', 'Veterans'], ['circle', 'Circle style']] }),
      MEDICAL, WATER, OFFICIALS, REGISTER, DECLARATIONS, EQUIPMENT, AWARDS, AV, GUARD, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'A physio and first aid at the mat, and an ambulance route confirmed'),
      S('event_equipment_rental', 'recommended', 'Prepare', 'Mat or ground preparation, markings, lobby lines and the scoreboard'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at the mat between every raid break'),
      S('invitation_printing', 'recommended', 'Draw', 'Draws by category, team sheets, numbers and certificates'),
      S('guest_services', 'conditional', 'Marshal', 'Registration, a control desk and calls to the mat', { when: WHEN_REG }),
      S('tent_furniture', 'conditional', 'Shade', 'Team tents, substitutes’ benches and spectator seating', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('sound_av', 'conditional', 'Commentate', 'A PA and commentary, which this sport is built around', { when: [some(WHEN_PA[0], WHEN_SCORE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, medals and best-raider and best-defender awards', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The raids and the finals, from outside the lobby', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Matches filmed, which settles a disputed touch', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food for teams across a day of short, intense matches', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Separate', 'Crowd control, which matters most at a close final', { when: [some(WHEN_GUARD[0], WHEN_CROWD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA, scoreboard and floodlights', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Find', 'A ground or hall that will take a mat and a crowd around it', { when: WHEN_FINDING }),
    ],
    addons: [
      X('mat_quality', 'Cushion it', 'A proper kabaddi mat rather than prepared ground, where you can', 'game', { trade: 'event_equipment_rental', when: [ans('surface', 'mat', 'ground', 'clay')] }),
      X('physio_at_mat', 'Treat fast', 'A physio at the mat, which a no-equipment contact sport needs', 'spa', { trade: 'safety_facilities' }),
      X('neutral_officials', 'Officiate', 'Officials from outside the competing teams, named on the draw', 'group', { experience: true, when: WHEN_OFFICIALS }),
      X('commentary', 'Call it', 'Live commentary, which is most of the atmosphere at kabaddi', 'music', { trade: 'sound_av', when: WHEN_PA }),
    ],
    toolkit: { polls: ['date'], note: 'Contact without protective equipment: a physio and first aid at the mat stay on the plan. We never advise on anyone’s fitness to play.' },
    timeline: {
      before: ['Mat or ground prepared and inspected the day before', 'Physio, first aid and the ambulance route confirmed', 'Draws by category published with officials named'],
      during: ['Physio and first aid at the mat continuously', 'Water at every break, not only between matches', 'Scores and results recorded per match'],
      after: ['Any injury recorded and followed up', 'Presentation at the ground', 'Mat and equipment reconciled'],
    },
    checklist: ['Mat prepared and inspected', 'Physio at the mat', 'Neutral officials named', 'Water at every break'],
  }),

  B('running-club-meetup', 'Gather', 'A regular run, a known route and someone at the back so nobody is left behind.', {
    about: 'The smallest occasion here and the one that depends least on us. A route, a marked meeting point, water and a back-marker are the whole thing, and the back-marker is the part that gets forgotten.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, PLACE,
      Q('distance', 'How far?', 'select', { options: [['5', 'Up to 5 km'], ['10', 'Up to 10 km'], ['21', 'Up to 21 km'], ['long', 'Longer']] }),
      Q('pace_groups', 'Are there pace groups?', 'yesno'),
      Q('regularity', 'How often?', 'one', { options: [['once', 'A one-off'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['series', 'A series']] }),
      Q('newcomers', 'Are newcomers expected?', 'yesno', { optional: true }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'A first-aid kit, the hospital route, and the meeting point left tidy'),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water at the start and the finish, and on the route if it is long', { when: WHEN_WATER }),
      S('invitation_printing', 'conditional', 'Mark', 'Route maps, pace-group signs and a simple sign-in sheet', { when: WHEN_SIGNED }),
      S('guest_services', 'conditional', 'Welcome', 'A sign-in, a briefing for newcomers and a named back-marker', { when: [some(ans('newcomers', 'yes'), WHEN_DECLARE_HELP[0])] }),
      S('event_equipment_rental', 'conditional', 'Set', 'A start banner, a bag drop and pace-group markers', { when: WHEN_KIT }),
      S('photography', 'conditional', 'Record', 'The group at the start, which is what keeps a club visible', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refuel', 'Coffee or breakfast after, which is why half the club comes', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Base', 'A table, shade and a bag drop at the meeting point', { when: [some(WHEN_SEATS[0], ans('distance', '21', 'long'))] }),
      S('venue', 'conditional', 'Pick', 'A meeting point with parking, a washroom and a safe route out', { when: WHEN_FINDING }),
    ],
    addons: [
      X('back_marker', 'Sweep', 'A named back-marker who finishes behind the last runner, every time', 'group', { experience: true }),
      X('route_share', 'Publish', 'The route shared in advance, with the turnaround and the hazards', 'map', { trade: 'invitation_printing' }),
      X('newcomer_brief', 'Welcome', 'A two-minute briefing for anyone new, before the group sets off', 'phone', { experience: true, when: [ans('newcomers', 'yes')] }),
      X('headcount', 'Count them', 'A count out and a count back, which is the whole safety process', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Count out and count back, and have a named back-marker. We give no training or medical advice, ever.' },
    timeline: {
      before: ['Route published with hazards and the turnaround marked', 'Back-marker named for the run', 'First-aid kit and the nearest hospital route known'],
      during: ['Headcount before setting off', 'Pace groups set off separately, back-marker behind the last', 'Water at the finish'],
      after: ['Headcount back, and anyone missing accounted for', 'Meeting point left as found', 'Next run announced'],
    },
    checklist: ['Route published with hazards', 'Back-marker named', 'Headcount out and back', 'First-aid kit at the start'],
  }),

  B('adventure-sports-event', 'Venture', 'Height, water or speed, which makes the instructor qualification the whole plan.', {
    about: 'The highest-consequence occasion in this category. Certified equipment, qualified instructors, a ratio that is actually observed and insurance that actually covers it — none of these are negotiable, and we say so.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('activities', 'Which activities?', 'many', { options: [['climbing', 'Climbing or rappelling'], ['water', 'Rafting or kayaking'], ['zip', 'Zip lines or rope courses'], ['trek', 'Trekking'], ['cycling_mtb', 'Mountain biking'], ['camping', 'Camping']] }),
      Q('experience_level', 'What experience do participants have?', 'one', { options: [['none', 'None'], ['some', 'Some'], ['experienced', 'Experienced'], ['mixed', 'Mixed']] }),
      Q('ratio', 'Is the instructor-to-participant ratio agreed?', 'one', {
        options: [['yes', 'Yes, in writing'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'The ratio is what makes this safe. We keep it on the plan and will say so if it slips.',
      }),
      Q('insurance', 'Is activity insurance in place?', 'one', { options: [['yes', 'Yes'], ['no', 'Not yet'], ['operator', 'The operator carries it'], ['unsure', 'Not sure']] }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, PERMITS, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'First aid trained for the activity, an evacuation and casualty plan'),
      S('event_equipment_rental', 'recommended', 'Certify', 'Certified equipment — harnesses, helmets, ropes, buoyancy aids'),
      S('live_entertainment', 'conditional', 'Instruct', 'Qualified instructors, at the agreed ratio, qualifications recorded', { when: WHEN_FIND_COACH }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water carried and available at every activity point'),
      S('passenger_transport', 'conditional', 'Convey', 'Transport to the site and back, with everyone accounted for', { when: WHEN_RIDE }),
      S('guest_services', 'recommended', 'Brief', 'Registration, declarations, a safety briefing and a headcount'),
      S('invitation_printing', 'conditional', 'Inform', 'Joining notes, kit lists, declarations and the safety briefing', { when: WHEN_SIGNED }),
      S('tent_furniture', 'conditional', 'Base', 'A base camp with shade, seating and a casualty point', { when: [some(WHEN_SEATS[0], ans('activities', 'camping', 'trek'))] }),
      S('catering_food', 'conditional', 'Feed', 'Food and water at the base, and carried where the activity needs it', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'From positions that do not distract anyone mid-activity', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Equipment, crew and supplies to a site with no road to it', { when: [ans('activities', 'climbing', 'water', 'trek')] }),
      S('venue', 'conditional', 'Assess', 'A site assessed for the activity, with an evacuation route', { when: WHEN_FINDING }),
    ],
    addons: [
      X('instructor_ratio', 'Hold the ratio', 'The agreed ratio written down and counted at every activity point', 'group', { experience: true, when: [ans('ratio', 'no', 'help')] }),
      X('equipment_certificates', 'Inspect', 'Inspection certificates for every piece of life-safety equipment', 'schedule', { experience: true }),
      X('casualty_plan', 'Plan for it', 'A written evacuation and casualty plan, with the nearest hospital named', 'map', { experience: true }),
      X('insurance_check', 'Confirm', 'Activity insurance confirmed in writing, naming the activities', 'invite', { experience: true, when: [ans('insurance', 'no', 'unsure')] }),
    ],
    toolkit: { polls: ['date'], note: 'Instructor qualifications, equipment certificates, the ratio and the insurance are conditions of running this, not optional lines. We give no advice on anyone’s fitness to take part.' },
    timeline: {
      before: ['Site assessed, evacuation route and nearest hospital identified', 'Instructor qualifications, equipment certificates and insurance collected', 'Ratio agreed in writing and declarations collected'],
      during: ['Safety briefing before anyone starts, attendance counted', 'Ratio counted at every activity point, not assumed', 'Headcount at every transition and before leaving'],
      after: ['Equipment inspected as it comes back', 'Everyone accounted for against the start list', 'Any incident recorded and reported'],
    },
    checklist: ['Site assessed with an evacuation route', 'Instructor qualifications and ratio in writing', 'Equipment inspection certificates', 'Activity insurance confirmed'],
  }),

  B('fitness-challenge', 'Compete', 'A measured test, a leaderboard, and people pushing harder than they would alone.', {
    about: 'Competition is the point and also the hazard: people attempt more than they should when there is a board. Standards, judging and medical cover are what keep that safe.',
    formats: ['outdoor', 'venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE, INSTRUCTOR,
      Q('challenge_type', 'What is the challenge?', 'many', { options: [['strength', 'Strength'], ['endurance', 'Endurance'], ['obstacle', 'An obstacle course'], ['crossfit', 'Functional workouts'], ['team', 'Team challenges'], ['steps', 'A step or distance challenge']] }),
      Q('scoring', 'How is it scored?', 'one', { options: [['time', 'Fastest time'], ['reps', 'Most repetitions'], ['points', 'Points across events'], ['completion', 'Completion only']] }),
      Q('standards', 'Are movement standards published and judged?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'Published standards and judges are what stop people hurting themselves chasing a score.',
      }),
      Q('scaling', 'Is there a scaled or beginner division?', 'yesno', { optional: true }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AWARDS, AV, REGISTER, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'First aid and a physio on site, with a clear rule for stopping someone'),
      S('event_equipment_rental', 'recommended', 'Rig', 'Weights, rigs, obstacles, mats and the lanes or stations'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water and electrolytes at every station, replenished through the day'),
      S('invitation_printing', 'recommended', 'Standardise', 'Standards, scorecards, heat lists, numbers and certificates'),
      S('guest_services', 'conditional', 'Judge', 'Registration, judges at every lane and a scoring desk', { when: [some(WHEN_REG[0], ans('standards', 'yes'))] }),
      S('live_entertainment', 'conditional', 'Lead', 'Qualified staff running the warm-up and the briefings', { when: WHEN_FIND_COACH }),
      S('sound_av', 'conditional', 'Drive', 'A PA, a clock and music, which this format is built around', { when: [some(WHEN_PA[0], WHEN_MUSIC[0], WHEN_SCORE[0])] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Shade, warm-up space, seating and a recovery area', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('gifts_favours', 'conditional', 'Award', 'Prizes by division, including the scaled one', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The heats and the leaderboard, across every division', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refuel', 'Food at the end, and something between heats', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA, clocks and the leaderboard', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Find', 'A space with the floor, the height and the ventilation for the format', { when: WHEN_FINDING }),
    ],
    addons: [
      X('movement_standards', 'Publish', 'Standards published before entries, and judged consistently on the day', 'poll', { experience: true, when: [ans('standards', 'no', 'help')] }),
      X('scaled_division', 'Open it up', 'A scaled division with its own leaderboard and its own prizes', 'spa', { experience: true, when: [ans('scaling', 'yes')] }),
      X('stop_rule', 'Know when', 'A written rule for judges to stop a competitor, and the authority to use it', 'heart', { experience: true }),
      X('warm_up_area', 'Prepare', 'A proper warm-up area, staffed, away from the competition floor', 'game', { trade: 'event_equipment_rental' }),
    ],
    toolkit: { polls: ['date'], note: 'A leaderboard makes people attempt more than they should. Judges with the authority to stop someone, and medical cover, stay on the plan. We give no training or medical advice.' },
    timeline: {
      before: ['Movement standards published before entries close', 'Judges briefed, including on when to stop a competitor', 'Declarations collected and medical cover confirmed'],
      during: ['Warm-up area staffed and used before every heat', 'Judges applying the standards consistently', 'Water and medical visible across the floor'],
      after: ['Leaderboards published by division', 'Any injury recorded and followed up', 'Equipment reconciled'],
    },
    checklist: ['Movement standards published', 'Judges briefed with a stop rule', 'Scaled division offered', 'Medical and water across the floor'],
  }),

  B('gym-launch-event', 'Open', 'A new floor, equipment nobody has used yet, and trials that have to convert.', {
    about: 'A commercial opening dressed as a fitness event. People will try equipment they do not know, so supervision on the floor matters more than the ribbon.',
    formats: ['venue'],
    ask: [
      PLAYERS, WATCHERS, PLACE, INSTRUCTOR,
      Q('activities', 'What happens on the day?', 'many', { options: [['tours', 'Tours of the floor'], ['trials', 'Trial sessions'], ['classes', 'Taster classes'], ['demos', 'Demonstrations'], ['offers', 'Membership offers'], ['ribbon', 'A ribbon cutting']] }),
      Q('floor_open', 'Is the gym floor open for people to use?', 'yesno', {
        help: 'If untrained people use equipment, supervision on the floor is a condition, not an extra.',
      }),
      Q('signups', 'Are memberships being sold on the day?', 'yesno', { optional: true }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Supervise', 'First aid, and trained staff on the floor while equipment is in use'),
      S('live_entertainment', 'conditional', 'Instruct', 'Qualified trainers leading the taster classes and the demos', { when: [some(WHEN_FIND_COACH[0], ans('activities', 'classes', 'demos'))] }),
      S('decoration_floral', 'recommended', 'Dress', 'An entrance, the floor dressed, and the brand visible from the road'),
      S('sound_av', 'conditional', 'Drive', 'Sound and screens for the classes and the floor', { when: [some(WHEN_PA[0], WHEN_MUSIC[0])] }),
      S('bar_beverages', 'recommended', 'Refresh', 'Water, and a cold counter for people who have just trained'),
      S('guest_services', 'conditional', 'Convert', 'A welcome desk, declarations before training, and sign-ups', { when: [some(ans('signups', 'yes'), WHEN_DECLARE_HELP[0])] }),
      S('invitation_printing', 'conditional', 'Promote', 'Invitations, offer collateral, floor signage and declaration forms', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Shoot', 'The floor, the classes and the equipment, for the gym’s own marketing', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Offer', 'Refreshments that are not sold as health products', { when: WHEN_FOOD }),
      S('event_equipment_rental', 'conditional', 'Stage', 'A small stage, class area and the ribbon setup', { when: [some(WHEN_KIT[0], ans('activities', 'ribbon'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting for the evening and for the photographs', { when: WHEN_AV }),
      S('videography', 'conditional', 'Film', 'A film of the space, which is the asset that outlives the day', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('venue', 'conditional', 'Find', 'An overflow space if the gym floor cannot hold the expected crowd', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_supervision', 'Watch', 'Trained staff on the floor for every hour equipment is in use', 'spa', { trade: 'safety_facilities', when: [ans('floor_open', 'yes')] }),
      X('declaration_before', 'Screen', 'Declarations completed before anyone touches a machine', 'invite', { experience: true, when: [ans('floor_open', 'yes')] }),
      X('equipment_induction', 'Show them', 'A short induction before anyone uses unfamiliar equipment', 'group', { experience: true, when: [ans('floor_open', 'yes')] }),
      X('offer_terms', 'Be clear', 'Membership terms written plainly, with the cancellation terms visible', 'budget', { trade: 'invitation_printing', when: [ans('signups', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Untrained people on unfamiliar equipment need supervision and a declaration first. We make no health claims and give no fitness advice.' },
    timeline: {
      before: ['Floor supervision rostered for every hour equipment is open', 'Declaration process agreed, to be completed before anyone trains', 'Trainer qualifications recorded'],
      during: ['Declarations before access to the floor', 'A short induction before unfamiliar equipment', 'First aid and supervision visible throughout'],
      after: ['Floor cleaned and equipment checked', 'Sign-ups followed up with clear terms', 'Any incident recorded'],
    },
    checklist: ['Floor supervision rostered', 'Declarations before floor access', 'Trainer qualifications recorded', 'Membership terms written plainly'],
  }),

  B('sports-fan-gathering', 'Watch', 'A screen, a crowd that cares about the result, and a plan for what happens if they lose.', {
    about: 'Not a sporting event — a crowd event with a screen. The feed rights, the sound and the behaviour plan are the whole thing, and the risk is entirely about what a result does to a room.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('match', 'What is being shown?', 'one', { options: [['cricket', 'Cricket'], ['football', 'Football'], ['olympics', 'A multi-sport event'], ['league', 'A league fixture'], ['final', 'A final'], ['other', 'Something else']] }),
      Q('rights', 'Are the screening rights in place?', 'one', {
        options: [['yes', 'Yes'], ['venue', 'The venue holds them'], ['no', 'Not yet'], ['unsure', 'Not sure']],
        help: 'Public screening of a broadcast needs rights. That is the organiser’s or the venue’s to hold.',
      }),
      Q('screens', 'How many screens?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      Q('drinks', 'Drinks', 'one', { options: [['venue', 'The venue handles it'], ['soft', 'Soft drinks only'], ['bar', 'A licensed bar'], ['none', 'Nothing needed']], help: 'A bar is the venue’s licence. We never assume one.' }),
      MEDICAL, WATER, EQUIPMENT, AV, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Show', 'Screens sized to the room, and commentary audio everyone can hear'),
      S('event_equipment_rental', 'conditional', 'Set', 'Screen structures, seating banks and the viewing layout', { when: [some(WHEN_KIT[0], ans('screens', '2', '4', '8'))] }),
      S('security_services', 'conditional', 'Manage', 'Door and floor staff, briefed on what a result can do to a crowd', { when: [some(WHEN_GUARD[0], from(1000))] }),
      S('bar_beverages', 'conditional', 'Serve', 'A drinks service as you chose, with free water available', { when: [some(ans('drinks', 'soft', 'bar'), WHEN_WATER[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food through the match, not just before it', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating with sightlines to a screen from every position', { when: [some(WHEN_SEATS[0], WHEN_CROWD[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, washrooms and the clear-up afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_CROWD[0])] }),
      S('decoration_floral', 'conditional', 'Dress', 'Team colours and a set that makes it feel like an occasion', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Capture', 'The crowd reacting, which is the only photograph worth taking', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Promote', 'Tickets, posters, signage and the behaviour notice', { when: WHEN_SIGNED }),
      S('power_cooling', 'conditional', 'Power', 'Power and a backup feed, because a screen failing mid-over is a riot', { when: [some(WHEN_OUTSIDE[0], ans('screens', '4', '8'))] }),
      S('venue', 'conditional', 'Find', 'A venue with the rights, the sightlines and a late finish if needed', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rights_check', 'Clear it', 'Screening rights confirmed in writing before promoting the event', 'schedule', { experience: true, when: [ans('rights', 'no', 'unsure')] }),
      X('backup_feed', 'Insure it', 'A second feed and a backup connection, because one will drop', 'media', { trade: 'sound_av' }),
      X('sightline_check', 'See it', 'Every seat checked for a view of a screen before tickets are sold', 'map', { experience: true }),
      X('behaviour_plan', 'Plan for it', 'A stated behaviour policy and a staff plan for a bad result', 'heart', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Screening rights are the organiser’s or the venue’s. We will not plan a public screening around an unresolved licence, and nothing assumes alcohol.' },
    timeline: {
      before: ['Screening rights confirmed in writing', 'Feed tested at the venue, with a backup connection', 'Sightlines checked from every seat'],
      during: ['Feed monitored with the backup live', 'Staff positioned before the closing stages, not after', 'Free water available throughout'],
      after: ['Crowd dispersed with staff still present', 'Venue cleared the same night', 'Any incident recorded'],
    },
    checklist: ['Screening rights in writing', 'Backup feed tested', 'Sightlines checked', 'Behaviour and dispersal plan'],
  }),

  B('charity-run', 'Run for it', 'A route, a cause and a field that includes people who have never run before.', {
    about: 'A marathon’s safety planning with a fun run’s field. The participants are less prepared and the cause means the cost of every line has to be justified against what it raises.',
    formats: ['outdoor'],
    ask: [
      PLAYERS, WATCHERS, PLACE,
      Q('cause', 'What is being raised for?', 'text', { max: 120 }),
      Q('distances', 'Which distances?', 'many', { options: [['2', '2 km or a walk'], ['5', '5 km'], ['10', '10 km'], ['21', 'Half marathon']] }),
      Q('fundraising', 'How is money raised?', 'many', { options: [['entry', 'Entry fees'], ['pledges', 'Sponsorship pledges'], ['donations', 'Donations on the day'], ['corporate', 'Corporate teams'], ['stalls', 'Stalls']] }),
      Q('route_type', 'What kind of route?', 'one', { options: [['closed', 'Closed roads'], ['partial', 'Partially closed'], ['park', 'Inside a park'], ['campus', 'A campus or private route']] }),
      MEDICAL, WATER, PERMITS, REGISTER, DECLARATIONS, EQUIPMENT, AV, AWARDS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'Medical along the route and at the finish, with an ambulance route'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water at intervals and at the finish, sized for an unprepared field'),
      S('security_services', 'recommended', 'Marshal', 'Marshals at every junction and traffic management on the route'),
      S('invitation_printing', 'recommended', 'Number', 'Bibs, route maps, pledge forms, signage and finisher certificates'),
      S('guest_services', 'recommended', 'Register', 'Registration, bib collection, baggage and a finish-line desk'),
      S('event_equipment_rental', 'conditional', 'Build', 'Start and finish gantries, barriers, a stage and the baggage area', { when: WHEN_KIT }),
      S('sound_av', 'conditional', 'Rally', 'A PA at the start and finish, for the briefing and the cause', { when: WHEN_PA }),
      S('gifts_favours', 'conditional', 'Finish', 'Finisher medals and T-shirts, costed against what is raised', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'The start, the finish and the cause, for the charity to use after', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refuel', 'Fruit and water at the finish, and stalls if they raise money', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shelter', 'Registration, baggage, medical and recovery tents', { when: [some(WHEN_SEATS[0], WHEN_BIG_FIELD[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power at the start and finish areas', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Route', 'A route that can be marshalled, supplied and permitted', { when: WHEN_FINDING }),
    ],
    addons: [
      X('walker_provision', 'Include', 'A walk distance and a generous cut-off, because many will walk it', 'spa', { experience: true, when: [ans('distances', '2', '5')] }),
      X('pledge_collection', 'Collect', 'A pledge process that is actually collected afterwards, not left to lapse', 'budget', { trade: 'invitation_printing', when: [ans('fundraising', 'pledges')] }),
      X('cost_to_raise', 'Justify', 'Every line checked against what the event is expected to raise', 'poll', { experience: true }),
      X('sweep_vehicle', 'Follow', 'A sweep behind the last participant, with a published cut-off', 'bus', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Every rupee spent is a rupee not raised, and we will show the estimate against the target. We give no advice on anyone’s fitness to take part.' },
    timeline: {
      before: ['Route permissions and marshalling confirmed in writing', 'Medical and water sited for a field that is less prepared than a race field', 'Costs checked against the fundraising target'],
      during: ['Medical and water in position before the first starter', 'A sweep behind the last participant, with a generous cut-off', 'Donations and pledges recorded as they come in'],
      after: ['Every participant accounted for against the start list', 'Pledges collected within the month', 'Total announced with the cost-to-raise stated'],
    },
    checklist: ['Route permissions and marshals confirmed', 'Medical and water for an unprepared field', 'Generous cut-off and a sweep', 'Costs checked against the target'],
  }),

  B('dance-fitness-workshop', 'Groove', 'Music loud enough to carry, a floor with grip, and a room that nobody has to be good in.', {
    about: 'The lowest-barrier occasion in this category. The floor surface and the sound are the only technical requirements, and the atmosphere does the rest — provided nobody is made to feel watched.',
    formats: ['venue', 'outdoor'],
    ask: [
      PLAYERS, PLACE, INSTRUCTOR,
      Q('style', 'What style?', 'one', { options: [['zumba', 'Zumba'], ['bollywood', 'Bollywood'], ['aerobics', 'Dance aerobics'], ['hiphop', 'Hip-hop'], ['bhangra', 'Bhangra'], ['mixed', 'A mix']] }),
      Q('session_length', 'How long?', 'select', { options: [['1', 'An hour'], ['2', 'Two hours'], ['half', 'Half a day'], ['series', 'A series of sessions']] }),
      Q('floor', 'What is the floor like?', 'one', { options: [['sprung', 'A sprung or wooden floor'], ['hard', 'Hard — tile or concrete'], ['grass', 'Grass'], ['unsure', 'Not sure']] }),
      MEDICAL, WATER, DECLARATIONS, EQUIPMENT, AV, REGISTER, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'A system that carries the beat and a headset mic over it'),
      S('live_entertainment', 'conditional', 'Lead', 'A qualified instructor for the style, with their certification seen', { when: WHEN_FIND_COACH }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water available throughout, which an hour of this genuinely needs'),
      S('event_equipment_rental', 'conditional', 'Surface', 'Flooring or matting where the surface is hard, plus mirrors if needed', { when: [some(ans('floor', 'hard', 'grass', 'unsure'), WHEN_KIT[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'A first-aid kit, and the room reset afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('event_lighting', 'conditional', 'Lift', 'Lighting that makes it feel like a class and not a hall', { when: WHEN_AV }),
      S('guest_services', 'conditional', 'Welcome', 'Sign-ups and declarations before anyone joins in', { when: [some(WHEN_DECLARE_HELP[0], WHEN_REG[0])] }),
      S('tent_furniture', 'conditional', 'Edge', 'Somewhere to leave bags and to sit out a track', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('photography', 'conditional', 'Record', 'With everyone asked first — many people will not want to be filmed', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Announce', 'Posters, sign-ups and the declaration form', { when: WHEN_SIGNED }),
      S('catering_food', 'conditional', 'Refresh', 'Something light after, if the session is long', { when: WHEN_FOOD }),
      S('venue', 'conditional', 'Find', 'A room with a forgiving floor, height and air', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_check', 'Cushion it', 'Matting or flooring where the surface is concrete or tile', 'game', { trade: 'event_equipment_rental', when: [ans('floor', 'hard', 'unsure')] }),
      X('sit_out_space', 'Make it easy', 'A stated, visible place to sit a track out without anyone noticing', 'chair', { experience: true }),
      X('instructor_check', 'Verify', 'The instructor’s certification seen and recorded', 'schedule', { experience: true }),
      X('no_mirror_option', 'Ease it', 'A session without mirrors or filming, for people who would not come otherwise', 'heart', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'We give no fitness or health advice. Nobody is filmed without being asked, and there is always a way to sit a track out.' },
    timeline: {
      before: ['Floor checked, and matting arranged if it is hard', 'Instructor qualification seen and recorded', 'Declarations collected before the session'],
      during: ['Water available throughout', 'A visible place to sit out, mentioned at the start', 'Filming only with everyone asked'],
      after: ['Room reset', 'Next session announced', 'Feedback taken by the instructor'],
    },
    checklist: ['Floor checked and matted if hard', 'Instructor qualification recorded', 'Water throughout', 'A visible way to sit out'],
  }),
]

export const SPORT_BLUEPRINT = Object.fromEntries(SPORT_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(SPORT_BLUEPRINTS, 'sport')
