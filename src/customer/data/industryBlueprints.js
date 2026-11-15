/**
 * Industry & Professional Events — one blueprint per occasion.
 *
 * Thirty-one occasions, eighteen of which share the "conference"
 * template in the catalogue and share very little else. A legal
 * conference is a privacy problem, a developer conference is a
 * bandwidth problem, a pharmaceutical conference is an access-control
 * problem and an agriculture expo is a water-and-power problem. They
 * are written here as the different things they are.
 *
 * The rules that run through the category:
 *
 *   · Accreditation is never ours. Continuing medical or legal
 *     education, professional credits and certification come from the
 *     accrediting body. We arrange the room, the register and the
 *     paperwork they ask for, and we certify nothing.
 *   · Clinical, pharmaceutical and laboratory content belongs to
 *     qualified, authorised people. We provide none and present none.
 *   · Heavy machinery, aircraft, drones and live industrial
 *     demonstrations run under the operator's own permissions, safety
 *     plan and insurance — never ours, and never assumed.
 *   · A closed session is closed: no recording, no stream, no
 *     photography, and the door is controlled.
 *   · We write no technical or commercial claim. What an exhibitor
 *     says about its product is the exhibitor's.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, CHIEF_GUEST, AWARDS, DIET_ONLY, ALLERGY_ONLY,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a professional event asks ────────────────────── */

const DELEGATES = Q('delegates', 'How many delegates?', 'select', {
  options: [['50', 'Up to 50'], ['200', 'Up to 200'], ['800', 'Up to 800'], ['3000', 'Up to 3000'], ['10000', 'More than 3000']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['hotel', 'A hotel or convention centre'], ['campus', 'A campus or institution'], ['hall', 'An exhibition hall'], ['office', 'Our own premises'], ['ground', 'An open ground'], ['find', 'Please find somewhere']],
})
const DAYS = Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Four or more']] })
const SPEAKERS = Q('speakers', 'How many speakers or presenters?', 'select', {
  optional: true, options: [['5', 'Up to 5'], ['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'More than 60']],
})
const TRACKS = Q('tracks', 'How many parallel sessions?', 'select', {
  optional: true, options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']],
})
const AV = Q('av', 'What does it need technically?', 'many', {
  options: [['mics', 'Microphones'], ['screen', 'Screens or LED'], ['stage', 'A stage'], ['stream', 'Streaming or hybrid'], ['record', 'Recording'], ['interpret', 'Interpretation']],
})
const NETWORK = Q('network', 'What does the connectivity need to carry?', 'many', {
  optional: true,
  options: [['wifi', 'Delegate wifi'], ['wired', 'Wired network'], ['uplink', 'A streaming uplink'], ['heavy', 'Heavy technical load'], ['isolated', 'An isolated network']],
})
const EXHIBITION = Q('exhibition', 'Is there an exhibition?', 'one', {
  options: [['none', 'No exhibition'], ['tabletop', 'Tabletop stands'], ['shell', 'A shell-scheme exhibition'], ['built', 'Custom-built stands'], ['machinery', 'Machinery or large equipment']],
})
const REGISTER = Q('registration', 'How do delegates register?', 'one', {
  options: [['advance', 'In advance'], ['onday', 'On the day'], ['both', 'Both'], ['invite', 'By invitation']],
})
const HOSPITALITY = Q('hospitality', 'Food and drink', 'one', {
  options: [['full', 'Meals through the day'], ['lunch', 'Lunch only'], ['breaks', 'Tea breaks'], ['dinner', 'A dinner'], ['none', 'Nothing needed']],
})
const TRAVEL = Q('travel', 'Are delegates or speakers travelling in?', 'one', {
  optional: true, options: [['no', 'No'], ['city', 'From around the city'], ['national', 'From other cities'], ['international', 'Internationally']],
})
const BRANDING = Q('branding', 'Do you need branding and signage?', 'yesno')
const SPONSORS = Q('sponsors', 'Are there sponsors with deliverables?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need access control or security?', 'yesno', { optional: true })
const SEATS = Q('seating', 'How is the main room seated?', 'one', {
  optional: true, options: [['theatre', 'Theatre'], ['classroom', 'Classroom'], ['rounds', 'Round tables'], ['ushape', 'U-shape'], ['standing', 'Standing']],
})
const ACCESS_NEEDS = Q('accessibility', 'What should we arrange for access?', 'many', {
  optional: true, options: [['stepfree', 'Step-free routes'], ['seating_acc', 'Reserved seating'], ['captions', 'Live captions'], ['quiet', 'A quiet room'], ['toilets', 'Accessible washrooms']],
})
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const PARKING = Q('parking', 'Do you need parking managed?', 'yesno', { optional: true })

/** A closed session is closed, and the plan has to know. */
const CONFIDENTIAL = Q('confidential', 'Are any sessions closed or confidential?', 'yesno', {
  optional: true,
  help: 'A closed session means no recording, no stream, no photography and a controlled door. We will keep it that way.',
})
/** Credits are the accrediting body's, never ours. */
const ACCREDITED = Q('accreditation', 'Does this carry professional credits?', 'one', {
  optional: true, options: [['yes', 'Yes, with the body confirmed'], ['applying', 'We are applying'], ['no', 'No']],
  help: 'The accrediting body sets the register, the hours and the certificate. We provide what they ask for and certify nothing.',
})

const WHEN_PA = [ans('av', 'mics')]
const WHEN_SCREEN = [ans('av', 'screen')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_STREAM = [ans('av', 'stream', 'record')]
const WHEN_INTERPRET = [ans('av', 'interpret')]
const WHEN_AV = [has('av')]
const WHEN_NET = [has('network')]
const WHEN_HEAVY_NET = [ans('network', 'wired', 'heavy', 'uplink', 'isolated')]
const WHEN_EXPO = [ans('exhibition', 'tabletop', 'shell', 'built', 'machinery')]
const WHEN_BIG_EXPO = [ans('exhibition', 'shell', 'built', 'machinery')]
const WHEN_MACHINERY = [ans('exhibition', 'machinery')]
const WHEN_REG = [ans('registration', 'advance', 'onday', 'both')]
const WHEN_FOOD = [ans('hospitality', 'full', 'lunch', 'breaks', 'dinner')]
const WHEN_MEAL = [ans('hospitality', 'full', 'lunch', 'dinner')]
const WHEN_TRAVEL = [ans('travel', 'city', 'national', 'international')]
const WHEN_BRAND = [ans('branding', 'yes')]
const WHEN_SPONSOR = [ans('sponsors', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_SEATS = [has('seating')]
const WHEN_ACCESS = [has('accessibility')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_PARK = [ans('parking', 'yes')]
const WHEN_SECRET = [ans('confidential', 'yes')]
const UNLESS_SECRET = [ans('confidential', 'yes')]
const WHEN_CREDITS = [ans('accreditation', 'yes', 'applying')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'hotel', 'hall', 'ground')]
const WHEN_OUTSIDE = [ans('place', 'ground')]
const WHEN_BIG = [ans('delegates', '800', '3000', '10000')]
const WHEN_HUGE = [ans('delegates', '3000', '10000')]
const WHEN_MULTI = [ans('tracks', '2', '4', '8')]
const WHEN_DAYS = [ans('days', '2', '3', '5')]

export const INDUSTRY_BLUEPRINTS = [

  B('technology-summit', 'Convene tech', 'A stage, an exhibition floor and a programme the industry judges in public.', {
    about: 'The broadest event in this category: keynotes, tracks, an exhibition and a hybrid audience. It is judged on the speaker list and on whether the day ran to time.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, EXHIBITION, AV, NETWORK, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SPONSORS, SEATS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Produce', 'Keynote production, and matched systems in every track room'),
      S('guest_services', 'recommended', 'Register', 'Badge printing on arrival and a desk that clears a queue fast'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda by track, room signage and the delegate guide'),
      S('event_equipment_rental', 'conditional', 'Build', 'Keynote stage, track rooms, exhibition stands and the networking area', { when: [some(WHEN_STAGE[0], WHEN_EXPO[0], WHEN_MULTI[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Stage light built for the camera as well as the room', { when: [some(WHEN_STREAM[0], WHEN_STAGE[0])] }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed, which is most of the afterlife', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power and connectivity for the floor, the stands and the stream', { when: [some(WHEN_NET[0], WHEN_BIG_EXPO[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that run to the agenda, not behind it', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence across the venue', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('photography', 'conditional', 'Document', 'Speakers, the floor and the exhibition, for sponsors and next year', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, and standing tables where people actually talk', { when: WHEN_SEATS }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across several days and rooms', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with enough breakout rooms, which is the hard part', { when: WHEN_FINDING }),
    ],
    addons: [
      X('speaker_checks', 'Rehearse', 'A tech check with every speaker, in the actual room', 'schedule', { experience: true }),
      X('session_recordings', 'Publish', 'Every session cut and published within the week', 'film', { trade: 'videography', when: WHEN_STREAM }),
      X('sponsor_deliverables', 'Deliver', 'Every sponsor commitment listed and signed off before the day', 'invite', { trade: 'invitation_printing', when: WHEN_SPONSOR }),
      X('quiet_room', 'Retreat', 'A quiet room for calls, which every conference needs and few have', 'bed', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Protect the breaks. The agenda overruns into them, and the breaks are where a summit earns its day.' },
    timeline: {
      before: ['Agenda published with rooms and times', 'Tech check with every speaker in the real room', 'Badges pre-printed from the registration list'],
      during: ['Registration clearing before the first session', 'Sessions to time — one overrun breaks every track', 'Breaks held to length'],
      after: ['Recordings and decks published', 'Sponsor report with evidence', 'Venue and catering reconciled'],
    },
    checklist: ['Agenda published with rooms', 'Speaker tech checks done', 'Badges pre-printed', 'Break timings protected'],
  }),

  B('ai-and-innovation-conference', 'Demonstrate', 'Claims about intelligence, tested in a room by people who will check.', {
    about: 'Different from a general tech summit in one respect: almost everything on the floor is a live demonstration that needs bandwidth and compute. If the network drops, the conference stops being about anything.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('demos', 'What is being demonstrated?', 'many', { options: [['models', 'Model demonstrations'], ['robotics_ai', 'Robotics'], ['startups', 'A startup showcase'], ['research', 'Research presentations'], ['hackathon_ai', 'A hackathon'], ['products', 'Products']] }),
      EXHIBITION, AV, NETWORK, REGISTER, HOSPITALITY, BRANDING, SEATS, GUARD, PHOTOS, SPONSORS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Heavy power and connectivity per stand — the demonstrations need both'),
      S('sound_av', 'recommended', 'Show', 'Screens big enough to read code on, and sound across the track rooms'),
      S('event_equipment_rental', 'conditional', 'Build', 'Demo benches, stands, the stage and the hackathon floor', { when: [some(WHEN_EXPO[0], ans('demos', 'hackathon_ai', 'robotics_ai'), WHEN_STAGE[0])] }),
      S('guest_services', 'recommended', 'Register', 'Badge printing, demo-area hosts and a technical help desk'),
      S('invitation_printing', 'conditional', 'Label', 'Badges, the agenda, stand numbers and a demonstration catalogue', { when: [some(WHEN_BRAND[0], WHEN_EXPO[0])] }),
      S('videography', 'conditional', 'Record', 'Sessions recorded, with each presenter’s permission for their work', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Food through the day for people who will not leave a demo bench', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Document', 'The demonstrations working, which is the record that matters', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Zone signage and sponsor presence across the floor', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, demo-bench stools and a quiet corner', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for equipment left on the floor', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across the days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with the electrical and network headroom, which is rare', { when: WHEN_FINDING }),
    ],
    addons: [
      X('bandwidth_test', 'Load-test it', 'The network tested with every demo live and a hall full of phones', 'power_cooling', { trade: 'power_cooling', when: WHEN_NET }),
      X('offline_fallback', 'Plan for the drop', 'A demonstration path for every stand that survives a connection loss', 'schedule', { experience: true }),
      X('research_credits', 'Credit the work', 'Every presenter, institution and dataset credited as they state it', 'invite', { trade: 'invitation_printing', when: [ans('demos', 'research')] }),
      X('claims_rule', 'Their claims', 'Every capability claim on a stand is the exhibitor’s, stated by them', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We write no claim about what any system can do. Load-test the network with every demonstration live before the venue is signed.' },
    timeline: {
      before: ['Network and power sized against every demonstration and load-tested', 'An offline fallback rehearsed for each stand', 'Presenter and dataset credits confirmed'],
      during: ['Connectivity monitored with a fallback live', 'Demonstrations reset between visitors', 'Sessions recorded only where the presenter agreed'],
      after: ['Recordings published with credits', 'Equipment reconciled', 'Sponsor and exhibitor report'],
    },
    checklist: ['Network load-tested with demos live', 'Offline fallback per stand', 'Presenter credits confirmed', 'Overnight equipment cover'],
  }),

  B('startup-demo-day', 'Pitch it', 'Ten minutes each, a hard clock, and investors who leave at six.', {
    about: 'The schedule is the product. A demo day that overruns loses the investors it was built for, so the clock and the changeover between pitches matter more than the staging.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE,
      Q('startups', 'How many startups are pitching?', 'select', { options: [['5', 'Up to 5'], ['12', 'Up to 12'], ['25', 'Up to 25'], ['50', 'More than 25']] }),
      Q('pitch_length', 'How long is each pitch?', 'select', { options: [['3', 'Three minutes'], ['5', 'Five minutes'], ['8', 'Eight minutes'], ['12', 'Ten or more']] }),
      Q('extras', 'What else is on?', 'many', { optional: true, options: [['booths', 'Demo booths'], ['mentoring', 'Mentoring sessions'], ['awards_sdd', 'Awards'], ['networking', 'Structured networking'], ['press_sdd', 'Press']] }),
      AV, NETWORK, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SPONSORS, SEATS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Switch fast', 'A screen, a clock the room can see, and instant deck handover'),
      S('anchor_mc', 'recommended', 'Keep time', 'A host who cuts a pitch at the clock, politely, every time'),
      S('guest_services', 'recommended', 'Separate them', 'Investor and startup registration handled differently, by name'),
      S('event_equipment_rental', 'conditional', 'Build', 'Pitch stage, demo booths and the networking furniture', { when: [some(WHEN_STAGE[0], ans('extras', 'booths'))] }),
      S('invitation_printing', 'conditional', 'Brief', 'The running order, one-page profiles and investor packs', { when: [some(WHEN_BRAND[0], WHEN_REG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the presenter and on the screen, not on the audience', { when: [some(WHEN_STAGE[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Capture', 'Each founder on stage, which is an asset they will reuse', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Record', 'Each pitch filmed and cut, so it can be sent to who missed it', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments after the pitches, when the conversations happen', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Theatre seating for the pitches and tables for after', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Brand', 'A backdrop and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power and connectivity for the demo booths', { when: [some(WHEN_NET[0], ans('extras', 'booths'))] }),
      S('venue', 'conditional', 'Find', 'A room that holds the investors you actually confirmed', { when: WHEN_FINDING }),
    ],
    addons: [
      X('deck_collection', 'Collect decks', 'Every deck collected and loaded the day before, on one machine', 'media', { trade: 'sound_av' }),
      X('visible_clock', 'Show the clock', 'A countdown the presenter and the room can both see', 'schedule', { trade: 'sound_av' }),
      X('investor_slots', 'Introduce them', 'Booked follow-up slots between founders and investors, after the pitches', 'group', { experience: true, when: [ans('extras', 'networking', 'mentoring')] }),
      X('pitch_films', 'Send it on', 'Each pitch cut as its own clip and given to the founder', 'film', { trade: 'videography', when: WHEN_FILM }),
    ],
    toolkit: { polls: ['date'], note: 'Collect every deck the day before and run them from one machine. Laptop handovers are what turn a two-hour demo day into four.' },
    timeline: {
      before: ['Decks collected and loaded on one machine the day before', 'Running order published with a hard clock per pitch', 'Investors confirmed individually, not from a list'],
      during: ['Clock visible, host cutting at time', 'Changeovers in seconds, not minutes', 'Follow-up slots booked while people are in the room'],
      after: ['Pitch clips sent to each founder', 'Introductions followed up within two days', 'Venue settled'],
    },
    checklist: ['Decks collected the day before', 'Visible clock and a host who uses it', 'Investors confirmed individually', 'Follow-up slots planned'],
  }),

  B('investor-pitch-event', 'Persuade', 'A small room, real numbers, and people deciding whether to fund them.', {
    about: 'Closer to a board meeting than a conference. The room is private, the materials are tracked, and nothing about who attended leaves the building.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, CONFIDENTIAL,
      Q('stage_of', 'What kind of meeting?', 'one', { options: [['seed', 'Early stage'], ['growth', 'Growth round'], ['roadshow', 'A roadshow stop'], ['lp', 'An LP or fund meeting'], ['diligence', 'Diligence sessions']] }),
      Q('one_to_ones', 'Are there private one-to-one meetings?', 'yesno'),
      Q('materials', 'What is handed out?', 'many', { optional: true, options: [['deck', 'The deck'], ['financials', 'Financials'], ['nda', 'NDAs to sign'], ['nothing', 'Nothing on paper']] }),
      AV, REGISTER, HOSPITALITY, TRAVEL, GUARD, PHOTOS, SEATS, PARKING,
    ],
    plan: [
      S('sound_av', 'recommended', 'Present', 'A screen legible from the back row, and audio that does not fail'),
      S('guest_services', 'recommended', 'Admit', 'A door list, and nobody admitted who is not on it'),
      S('event_equipment_rental', 'conditional', 'Separate', 'The main room, and private rooms for the one-to-ones', { when: [some(ans('one_to_ones', 'yes'), WHEN_SEATS[0])] }),
      S('invitation_printing', 'conditional', 'Track it', 'Decks, financials and NDAs, numbered and collected back', { when: [ans('materials', 'deck', 'financials', 'nda')] }),
      S('catering_food', 'conditional', 'Serve', 'Something good, served quietly, never during the numbers', { when: WHEN_FOOD }),
      S('passenger_transport', 'conditional', 'Collect', 'Cars for investors between airport, hotel and the room', { when: WHEN_TRAVEL }),
      S('security_services', 'conditional', 'Control', 'Floor access controlled for the duration', { when: [some(WHEN_GUARD[0], WHEN_SECRET[0])] }),
      S('valet_parking', 'conditional', 'Park', 'Reserved, named parking — a circling investor is a late investor', { when: WHEN_PARK }),
      S('safety_facilities', 'conditional', 'Clear', 'Materials collected and disposed of securely afterwards', { when: [ans('materials', 'financials', 'nda')] }),
      S('photography', 'optional', 'Record', 'A formal photograph, only if everyone in the room agrees', { unless: UNLESS_SECRET }),
      S('anchor_mc', 'conditional', 'Run the order', 'Someone to run the sequence and the clock across several companies', { when: [ans('stage_of', 'seed', 'growth', 'roadshow')] }),
      S('venue', 'conditional', 'Find', 'A private, serious room — the venue is part of the impression', { when: WHEN_FINDING }),
    ],
    addons: [
      X('deck_rehearsal', 'Rehearse', 'The deck run in the actual room, on the actual screen', 'schedule', { experience: true }),
      X('meeting_rooms', 'Slot them', 'Private one-to-one rooms, booked and signposted', 'map', { trade: 'event_equipment_rental', when: [ans('one_to_ones', 'yes')] }),
      X('numbered_materials', 'Count them back', 'Numbered packs, issued against a list and collected', 'invite', { trade: 'invitation_printing', when: [ans('materials', 'financials')] }),
      X('attendee_privacy', 'Say nothing', 'No attendee list published, no photographs, no social posts', 'phone', { experience: true, when: WHEN_SECRET }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Confidential by default: no stream, no press, no photography. Materials are numbered, tracked and collected, and who attended is never published.' },
    timeline: {
      before: ['Deck rehearsed on the real screen in the real room', 'Attendee list fixed and the door list made from it', 'Materials numbered with a collection plan agreed'],
      during: ['Door list enforced', 'Presentation, then one-to-ones to the slot sheet', 'Nothing photographed or posted'],
      after: ['Materials collected and securely disposed of', 'Follow-up to each investor within two days', 'Nothing published about who was there'],
    },
    checklist: ['Deck rehearsed in the room', 'Door list enforced', 'Materials numbered and tracked', 'No attendee list published'],
  }),

  B('healthcare-conference', 'Present', 'Clinicians presenting to clinicians, often for credits we do not grant.', {
    about: 'The scientific programme and any continuing-education accreditation belong to the medical body. We arrange the rooms, the register they require and the exhibition — and we certify nothing.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, ACCREDITED,
      Q('sessions', 'What is in the programme?', 'many', { options: [['plenary', 'Plenary sessions'], ['clinical', 'Clinical sessions'], ['posters', 'Poster presentations'], ['workshops_hc', 'Workshops'], ['live_cases', 'Live case discussions'], ['exhibition_hc', 'A medical exhibition']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, GUARD, PHOTOS, ACCESS_NEEDS, TRAVEL,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Clinical-grade projection, mics and recording in every session room'),
      S('guest_services', 'recommended', 'Register', 'Delegate registration, and the attendance register the body requires'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the scientific programme, abstracts and poster numbering'),
      S('event_equipment_rental', 'conditional', 'Set', 'Session rooms, poster boards and the exhibition stands', { when: [some(ans('sessions', 'posters', 'exhibition_hc'), WHEN_EXPO[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch, to the dietary needs of a large clinical audience', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Sessions recorded where the presenters and the body permit it', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'The conference, never a patient, never a clinical image', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, poster viewing space and accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and exhibitor presence', { when: WHEN_BRAND }),
      S('passenger_transport', 'conditional', 'Shuttle', 'Hotel transfers for delegates travelling in', { when: WHEN_TRAVEL }),
      S('security_services', 'conditional', 'Control', 'Badge-checked access, which the exhibition usually requires', { when: [some(WHEN_GUARD[0], WHEN_EXPO[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days, rooms and the exhibition', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with enough session rooms and real poster space', { when: WHEN_FINDING }),
    ],
    addons: [
      X('attendance_register', 'Register for credits', 'The attendance register exactly as the accrediting body specifies', 'poll', { trade: 'guest_services', when: WHEN_CREDITS }),
      X('abstract_book', 'Publish abstracts', 'An abstract book with every presenter and institution credited', 'album', { trade: 'invitation_printing', when: [ans('sessions', 'posters', 'clinical')] }),
      X('no_patient_imagery', 'Protect patients', 'No patient-identifiable image used, displayed or photographed', 'heart', { experience: true }),
      X('exhibitor_compliance', 'Their claims', 'Product claims and regulatory text are the exhibitor’s, not ours', 'invite', { experience: true, when: WHEN_EXPO }),
    ],
    toolkit: { polls: ['date'], note: 'Accreditation and the scientific programme belong to the medical body. Sambramo certifies nothing, writes no clinical content, and no patient-identifiable image is used or photographed.' },
    timeline: {
      before: ['Accrediting body’s register and certificate requirements obtained', 'Scientific programme and abstracts finalised by the committee', 'Exhibition rules issued to exhibitors with their own compliance obligations'],
      during: ['Attendance recorded exactly as the body requires', 'Sessions recorded only where permitted', 'No patient-identifiable material photographed'],
      after: ['Attendance register handed to the accrediting body', 'Certificates issued by them, printed by us', 'Abstract book published'],
    },
    checklist: ['Accrediting body requirements obtained', 'Attendance register set up to their spec', 'No patient-identifiable imagery', 'Exhibitor compliance rules issued'],
  }),

  B('medical-workshop', 'Train hands', 'Clinical skills taught by qualified trainers, on equipment that is theirs.', {
    about: 'Everything clinical — the trainers, the simulation equipment, the consumables and the certification — comes from the authorised provider. We arrange the room, the power, the hygiene and the layout around them.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, ACCREDITED,
      Q('subject', 'What is being taught?', 'text', { max: 120 }),
      Q('trainers_confirmed', 'Are the qualified trainers confirmed?', 'one', {
        options: [['yes', 'Yes, with their requirements in hand'], ['identified', 'Identified, not confirmed'], ['no', 'Not yet']],
        help: 'Clinical training is delivered only by qualified, authorised trainers. Sambramo provides none.',
      }),
      Q('practical', 'What does the practical part need?', 'many', {
        options: [['simulators', 'Simulators or manikins'], ['instruments', 'Instruments'], ['consumables', 'Consumables'], ['benches', 'Workbenches'], ['sinks', 'Water and sinks'], ['none_prac', 'No practical component']],
      }),
      Q('ratio', 'What is the trainer-to-participant ratio?', 'one', { options: [['one_four', 'One to four'], ['one_eight', 'One to eight'], ['one_twelve', 'One to twelve'], ['unsure', 'Not decided']] }),
      AV, REGISTER, HOSPITALITY, AWARDS, PHOTOS, SEATS, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Lay out', 'Workbenches, stations and a layout a trainer can walk between'),
      S('safety_facilities', 'recommended', 'Keep it clean', 'Handwashing, surfaces, waste holding for them, and the clear-up'),
      S('sound_av', 'conditional', 'Show the hands', 'An overhead camera and screen — technique cannot be described', { when: [some(WHEN_SCREEN[0], WHEN_PA[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power at every station, and water where the practical needs it', { when: [ans('practical', 'simulators', 'benches', 'sinks')] }),
      S('guest_services', 'conditional', 'Register', 'Registration and the attendance record the accrediting body wants', { when: [some(WHEN_REG[0], WHEN_CREDITS[0])] }),
      S('invitation_printing', 'conditional', 'Supply', 'Workbooks written by the trainers, station labels and certificates', { when: [some(WHEN_PRINTED[0], WHEN_CREDITS[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the taught part, and stools at the stations', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Break', 'Tea and lunch, served well away from the practical area', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'Only where the trainers permit, and never a patient or a specimen', { when: WHEN_SHOT }),
      S('venue', 'conditional', 'Find', 'A room with water, power, ventilation and a washable floor', { when: WHEN_FINDING }),
    ],
    addons: [
      X('provider_requirements', 'Meet their list', 'The trainers’ own room and equipment requirements, met line by line', 'schedule', { experience: true, when: [ans('trainers_confirmed', 'identified', 'no')] }),
      X('ratio_held', 'Hold the ratio', 'The agreed trainer-to-participant ratio counted at every station', 'group', { experience: true, when: [ans('ratio', 'unsure', 'one_twelve')] }),
      X('clinical_waste', 'Dispose properly', 'Clinical waste handled and removed by the provider, to their process', 'broom', { trade: 'safety_facilities', when: [ans('practical', 'consumables', 'instruments')] }),
      X('overhead_camera', 'See it', 'An overhead camera on the trainer’s hands, on a screen', 'media', { trade: 'sound_av' }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Sambramo provides no clinical trainers, no clinical equipment and no certification. The authorised provider delivers the training and handles all clinical waste; we arrange the room around them.' },
    timeline: {
      before: ['Qualified trainers confirmed with their own requirements in writing', 'Room checked for water, power, ventilation and a washable floor', 'Ratio agreed and station count set to it'],
      during: ['Ratio counted at every station, not assumed', 'Clinical waste segregated by the provider from the start', 'Attendance recorded as the accrediting body requires'],
      after: ['Clinical waste removed by the provider', 'Room deep-cleaned and handed back', 'Certificates issued by the provider or the body'],
    },
    checklist: ['Trainers confirmed with requirements', 'Room has water, power and ventilation', 'Ratio agreed and staffed', 'Clinical waste handled by the provider'],
  }),

  B('education-summit', 'Set the agenda', 'Institutions, teachers and policy people in one room, rarely agreeing.', {
    about: 'The delegate mix is the event. A summit of only administrators says nothing useful about teaching, so the plan funds the attendance of the people who do the work.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('mix', 'Who is attending?', 'many', { options: [['teachers', 'Teachers'], ['leaders', 'School and college leaders'], ['policy', 'Policy and government'], ['edtech', 'Edtech'], ['students', 'Students'], ['parents_ed', 'Parents']] }),
      Q('programme_ed', 'What is on?', 'many', { options: [['keynotes_ed', 'Keynotes'], ['panels_ed', 'Panels'], ['workshops_ed', 'Workshops'], ['showcase_ed', 'A student showcase'], ['exhibition_ed', 'An exhibition'], ['awards_ed', 'Awards']] }),
      AV, REGISTER, HOSPITALITY, BRANDING, AWARDS, PHOTOS, SEATS, TRAVEL, ACCESS_NEEDS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Stage production and matched sound in every workshop room'),
      S('guest_services', 'recommended', 'Register', 'Registration by type, so teachers do not queue behind sponsors'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the programme, workshop sign-ups and room signage'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, workshop rooms, showcase stands and the exhibition', { when: [some(WHEN_STAGE[0], ans('programme_ed', 'showcase_ed', 'exhibition_ed', 'workshops_ed'))] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that hold the schedule', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Sessions recorded for teachers who could not be released to attend', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'The summit, with consent where students appear', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Plenary seating, workshop tables and accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Travel for teachers and students who could not otherwise come', { when: WHEN_TRAVEL }),
      S('gifts_favours', 'conditional', 'Recognise', 'Awards, where the programme has them', { when: [some(WHEN_TROPHY[0], ans('programme_ed', 'awards_ed'))] }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and the summit identity', { when: WHEN_BRAND }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days and rooms', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with workshop rooms, not just a hall', { when: WHEN_FINDING }),
    ],
    addons: [
      X('teacher_travel', 'Fund the teachers', 'Travel and cover so teachers can actually attend, not only leaders', 'bus', { trade: 'passenger_transport', when: [ans('mix', 'teachers')] }),
      X('student_consent', 'Protect them', 'Guardian consent and a photography rule wherever students appear', 'heart', { experience: true, when: [ans('mix', 'students')] }),
      X('workshop_signups', 'Allocate', 'Workshop sign-ups taken in advance, so rooms are the right size', 'poll', { trade: 'invitation_printing', when: [ans('programme_ed', 'workshops_ed')] }),
      X('session_recordings', 'Share it on', 'Recordings published to schools that could not send anyone', 'film', { trade: 'videography', when: WHEN_STREAM }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Where students take part, guardian consent and a photography rule come first. A summit about teaching that no teacher could attend has missed its audience.' },
    timeline: {
      before: ['Delegate mix reviewed, with travel funded where it decides attendance', 'Workshop sign-ups taken so rooms are sized correctly', 'Student participation consented and chaperoned'],
      during: ['Registration by delegate type', 'Sessions to time, workshops to their sign-up lists', 'Student areas supervised'],
      after: ['Recordings published to institutions that could not attend', 'Commitments recorded and circulated', 'Venue settled'],
    },
    checklist: ['Travel funded for teachers', 'Workshop sign-ups in advance', 'Student consent and chaperoning', 'Recordings planned for absentees'],
  }),

  B('academic-conference', 'Present papers', 'Papers, posters and a programme committee that decided it months ago.', {
    about: 'The programme is the committee’s and the papers are the authors’. The operational work is parallel sessions, poster space, and delegates who arrive from other cities needing somewhere to stay.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, ACCREDITED,
      Q('papers', 'How many papers or presentations?', 'select', { options: [['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'Up to 150'], ['400', 'More than 150']] }),
      Q('posters', 'Is there a poster session?', 'yesno'),
      Q('proceedings', 'Are proceedings being published?', 'yesno', { optional: true }),
      AV, REGISTER, HOSPITALITY, TRAVEL, PHOTOS, SEATS, ACCESS_NEEDS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Equip rooms', 'A projector, a mic and a clock in every parallel session room'),
      S('guest_services', 'recommended', 'Register', 'Registration, session chairs briefed and the attendance record'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the programme, the book of abstracts and poster numbering'),
      S('event_equipment_rental', 'conditional', 'Board it', 'Poster boards, session rooms and the registration area', { when: [some(ans('posters', 'yes'), WHEN_MULTI[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks timed so the poster session actually gets visited', { when: WHEN_FOOD }),
      S('passenger_transport', 'conditional', 'Shuttle', 'Transfers between the station, the accommodation and the venue', { when: WHEN_TRAVEL }),
      S('videography', 'conditional', 'Record', 'Keynotes recorded, with each author’s permission', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, poster viewing space and accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('photography', 'conditional', 'Document', 'Sessions and posters, with the authors’ agreement', { when: WHEN_SHOT }),
      S('decoration_floral', 'optional', 'Signpost', 'Simple wayfinding, which a university building badly needs'),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew and rooms across several days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'Rooms enough for the parallel sessions, close together', { when: WHEN_FINDING }),
    ],
    addons: [
      X('parallel_timing', 'Synchronise', 'Every parallel session on the same clock, so delegates can move between', 'schedule', { experience: true, when: WHEN_MULTI }),
      X('poster_session', 'Make it visited', 'The poster session timed with refreshments, not against a keynote', 'album', { experience: true, when: [ans('posters', 'yes')] }),
      X('accommodation_list', 'Help them stay', 'A list of nearby accommodation at agreed rates — you book, we plan around it', 'bed', { experience: true, when: WHEN_TRAVEL }),
      X('proceedings_support', 'Publish it', 'Abstracts and papers collected in the format the publisher needs', 'invite', { trade: 'invitation_printing', when: [ans('proceedings', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Authors own their papers and posters. Recording and reproduction happen with their written agreement, and the programme belongs to the committee.' },
    timeline: {
      before: ['Programme and parallel sessions synchronised to one clock', 'Poster numbering and board allocation published', 'Accommodation list circulated with the acceptance letters'],
      during: ['Session chairs briefed and holding time', 'Poster session timed with refreshments', 'Attendance recorded where credits apply'],
      after: ['Proceedings collected in the publisher’s format', 'Recordings shared where authors agreed', 'Rooms reset'],
    },
    checklist: ['Parallel sessions on one clock', 'Poster boards and numbering', 'Accommodation list circulated', 'Session chairs briefed'],
  }),

  B('research-symposium', 'Show the work', 'Smaller than a conference, deeper, and mostly about the posters.', {
    about: 'A symposium is a conversation rather than a broadcast. The poster hall and the breaks are where the work happens, so they get the space and the time.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS,
      Q('domain', 'What field?', 'text', { max: 100 }),
      Q('posters_count', 'How many posters?', 'select', { options: [['15', 'Up to 15'], ['50', 'Up to 50'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('elements_sym', 'What else is on?', 'many', { optional: true, options: [['demos_sym', 'Research demonstrations'], ['panels_sym', 'Panels'], ['awards_sym', 'Poster awards'], ['industry', 'Industry participation'], ['workshops_sym', 'Workshops']] }),
      AV, REGISTER, HOSPITALITY, AWARDS, PHOTOS, SEATS, BRANDING, ACCESS_NEEDS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Board it', 'Poster boards at reading height, with room to stand and talk'),
      S('sound_av', 'conditional', 'Carry', 'A mic and a screen for the presentations and the panels', { when: [some(WHEN_PA[0], WHEN_SCREEN[0])] }),
      S('invitation_printing', 'recommended', 'Number it', 'Badges, poster numbers, the abstract book and a floor plan'),
      S('guest_services', 'conditional', 'Register', 'Registration and poster allocation by number', { when: WHEN_REG }),
      S('catering_food', 'conditional', 'Sustain', 'Refreshments served inside the poster hall, which is the whole trick', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Document', 'Every poster and its presenter, with their agreement', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Recognise', 'Poster awards, judged against published criteria', { when: [some(WHEN_TROPHY[0], ans('elements_sym', 'awards_sym'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the sessions and somewhere to sit in the poster hall', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power where a research demonstration needs it', { when: [ans('elements_sym', 'demos_sym')] }),
      S('decoration_floral', 'conditional', 'Signpost', 'Entrance, zone signage and the symposium identity', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A hall with wall space — poster room is what a symposium needs', { when: WHEN_FINDING }),
    ],
    addons: [
      X('refreshments_in_hall', 'Keep them there', 'Tea served in the poster hall, so posters are actually visited', 'glass', { trade: 'catering_food', when: WHEN_FOOD }),
      X('poster_criteria', 'Judge fairly', 'Published judging criteria and judges named in advance', 'poll', { experience: true, when: [ans('elements_sym', 'awards_sym')] }),
      X('presenter_slots', 'Stand by it', 'Published times when each presenter is at their poster', 'schedule', { trade: 'invitation_printing' }),
      X('abstract_book', 'Record it', 'An abstract book crediting every author and institution', 'album', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Serve the refreshments in the poster hall. A poster session in a separate room at the same time as a keynote is not a poster session.' },
    timeline: {
      before: ['Poster numbering and board allocation published', 'Presenter standing times scheduled and published', 'Judging criteria published if there are awards'],
      during: ['Refreshments served in the poster hall', 'Presenters at their posters during the published slots', 'Judging to the published criteria'],
      after: ['Abstract book published with full credits', 'Poster images sent to presenters', 'Hall cleared'],
    },
    checklist: ['Poster boards at reading height', 'Refreshments inside the poster hall', 'Presenter standing times published', 'Judging criteria published'],
  }),

  B('agriculture-expo', 'Show the land', 'Machinery, crops and demonstration plots, on ground that needs water and power.', {
    about: 'An outdoor expo where the exhibits are alive or very heavy. Water, ground conditions and machinery movement are the plan; the stage is incidental.',
    formats: ['outdoor'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('sectors', 'Which sectors?', 'many', { options: [['machinery_ag', 'Farm machinery'], ['seeds', 'Seeds and inputs'], ['irrigation', 'Irrigation'], ['livestock', 'Livestock'], ['organic', 'Organic and natural farming'], ['agritech', 'Agritech']] }),
      Q('plots', 'Are there demonstration plots or live demonstrations?', 'yesno'),
      Q('site_needs', 'What does the ground need?', 'many', { options: [['water_ag', 'Water supply'], ['power_ag', 'Power'], ['hardstanding', 'Hard standing for machinery'], ['fencing', 'Fencing'], ['shade', 'Shade']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, PHOTOS, GUARD, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build it', 'Stalls, machinery pads, plots, fencing and signage frames'),
      S('power_cooling', 'recommended', 'Supply', 'Generators, distribution and water across a field with neither'),
      S('safety_facilities', 'recommended', 'Service', 'Washrooms, drinking water, first aid and the ground cleared after'),
      S('sound_av', 'conditional', 'Carry', 'A PA across the ground and sound for the demonstration area', { when: [some(WHEN_PA[0], ans('plots', 'yes'))] }),
      S('guest_services', 'conditional', 'Receive', 'Visitor registration, exhibitor desks and ground marshals', { when: [some(WHEN_REG[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'recommended', 'Signpost', 'A ground map, stall numbers, exhibit labels and safety notices'),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for machinery left on the ground', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0], WHEN_MACHINERY[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls for a visitor who will be on a field all day', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shade', 'Canopies, seating and shade, which a field has none of', { when: [some(ans('site_needs', 'shade'), WHEN_SEATS[0])] }),
      S('photography', 'conditional', 'Record', 'Machinery, plots and the demonstrations, for the exhibitors', { when: WHEN_SHOT }),
      S('medium_large_goods_vehicle', 'conditional', 'Haul', 'Transport for machinery in and out across soft ground', { when: WHEN_MACHINERY }),
      S('decoration_floral', 'conditional', 'Mark it', 'A gateway and zone branding across a large open site', { when: WHEN_BRAND }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and strike across several days on a field', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Secure', 'A ground with access, water and the bearing for heavy machinery', { when: WHEN_FINDING }),
    ],
    addons: [
      X('ground_bearing', 'Check the ground', 'Ground bearing and access checked before machinery is booked in', 'map', { experience: true, when: WHEN_MACHINERY }),
      X('water_supply', 'Get water in', 'Water to the plots and the washrooms, by tanker if there is no mains', 'glass', { trade: 'power_cooling', when: [ans('site_needs', 'water_ag')] }),
      X('demo_safety', 'Keep them back', 'A barriered demonstration area with the operator’s own safety plan', 'security_services', { trade: 'safety_facilities', when: [ans('plots', 'yes')] }),
      X('farmer_sessions', 'Teach something', 'Practical sessions run by people who farm, in the local language', 'group', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Live machinery demonstrations run under the operator’s own safety plan and insurance, behind a barrier. Ground bearing is checked before anything heavy is booked.' },
    timeline: {
      before: ['Ground bearing, access and water confirmed before exhibitors are booked', 'Machinery movement slots issued with a marshalled route', 'Demonstration areas barriered on the ground plan'],
      during: ['Machinery moved only under marshal supervision', 'Demonstration area kept clear of the public', 'Water and washrooms maintained through the day'],
      after: ['Machinery moved out to slots', 'Ground reinstated, including ruts and plot clearance', 'Exhibitor report'],
    },
    checklist: ['Ground bearing and access checked', 'Water supply arranged', 'Demonstration areas barriered', 'Machinery movement marshalled'],
  }),

  B('manufacturing-expo', 'Run the line', 'Heavy machines on an indoor floor, some of them switched on.', {
    about: 'Floor loading, three-phase power and guarding are the whole technical plan. A machine running in front of the public is the exhibitor’s responsibility and must be barriered as one.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('sectors_mfg', 'Which sectors?', 'many', { options: [['machine_tools', 'Machine tools'], ['automation', 'Automation'], ['materials', 'Materials'], ['packaging', 'Packaging'], ['safety_ind', 'Industrial safety'], ['components', 'Components']] }),
      Q('live_machines', 'Are machines running on the floor?', 'yesno', {
        help: 'A running machine needs guarding, the exhibitor’s safety plan and their insurance.',
      }),
      Q('power_need', 'What power do stands need?', 'many', { options: [['single', 'Single phase'], ['three', 'Three phase'], ['heavy_mfg', 'Heavy load'], ['compressed', 'Compressed air'], ['water_mfg', 'Water']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, GUARD, PARKING,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Distribute', 'Metered three-phase distribution, compressed air and cooling'),
      S('event_equipment_rental', 'recommended', 'Construct', 'Shell scheme, machine pads, guarding, barriers and the aisles'),
      S('safety_facilities', 'recommended', 'Make it safe', 'First aid, washrooms, cleaning and the floor cleared afterwards'),
      S('loading_unloading_crew', 'conditional', 'Move it', 'A crew and equipment for machinery move-in and move-out', { when: [some(WHEN_MACHINERY[0], ans('live_machines', 'yes'))] }),
      S('guest_services', 'recommended', 'Register', 'Trade registration, badge printing and visitor counting'),
      S('invitation_printing', 'recommended', 'Direct', 'Floor plan, stand numbers, badges, safety notices and the catalogue'),
      S('security_services', 'conditional', 'Secure', 'Hall security overnight and badge-checked entry', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('sound_av', 'conditional', 'Present', 'Seminar sound and screens, set against a noisy hall', { when: [some(WHEN_PA[0], WHEN_SCREEN[0])] }),
      S('catering_food', 'conditional', 'Feed', 'A food court for visitors and something for exhibitors on stands', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Document', 'Stands and machines running, for the exhibitors', { when: WHEN_SHOT }),
      S('medium_large_goods_vehicle', 'conditional', 'Haul', 'Vehicles for machinery, in and out', { when: WHEN_MACHINERY }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, aisle signage and the expo identity', { when: WHEN_BRAND }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build-up, move-in, show and move-out across the days', { when: WHEN_DAYS }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking and a separate heavy-vehicle route', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'A hall with floor loading, three-phase power and a wide get-in', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_loading', 'Check the floor', 'Floor loading confirmed in writing against the heaviest machine', 'schedule', { experience: true, when: WHEN_MACHINERY }),
      X('machine_guarding', 'Guard it', 'Guarding and barriers on every running machine, to the exhibitor’s plan', 'security_services', { trade: 'event_equipment_rental', when: [ans('live_machines', 'yes')] }),
      X('exhibitor_manual', 'Instruct', 'Move-in slots, power limits, guarding rules and insurance requirements', 'invite', { trade: 'invitation_printing' }),
      X('power_survey', 'Size it', 'Electrical load surveyed against every stand before the venue is signed', 'power_cooling', { trade: 'power_cooling', when: [ans('power_need', 'three', 'heavy_mfg')] }),
    ],
    toolkit: { polls: ['date'], note: 'A machine running in public is guarded, insured and operated by the exhibitor, to their own safety plan. Floor loading is confirmed in writing before anything heavy arrives.' },
    timeline: {
      before: ['Floor loading and power surveyed against the exhibitor list', 'Exhibitor manual issued with guarding and insurance requirements', 'Move-in slots issued with a marshalled heavy-vehicle route'],
      during: ['Guarding checked on every running machine before doors', 'Aisles kept clear, forklift movement only outside show hours', 'Noise levels managed so seminars remain audible'],
      after: ['Move-out to slots with the crew booked', 'Floor inspected for damage and reinstated', 'Exhibitor report'],
    },
    checklist: ['Floor loading confirmed in writing', 'Power surveyed per stand', 'Guarding on every running machine', 'Heavy-vehicle route marshalled'],
  }),

  B('logistics-summit', 'Move it', 'An industry that measures everything, meeting to compare numbers.', {
    about: 'A B2B room where the exhibition and the scheduled meetings are what delegates paid for. The keynote is the reason to come; the meetings are the reason to come back.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, EXHIBITION,
      Q('focus', 'Which parts of the chain?', 'many', { options: [['freight', 'Freight and transport'], ['warehousing', 'Warehousing'], ['lastmile', 'Last mile'], ['cold_chain', 'Cold chain'], ['tech_log', 'Logistics technology'], ['ports', 'Ports and shipping']] }),
      Q('meetings', 'Are there scheduled B2B meetings?', 'yesno'),
      AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SPONSORS, SEATS, TRAVEL,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Stage production and matched sound in the breakout rooms'),
      S('guest_services', 'recommended', 'Register', 'Delegate registration, badges and the B2B meeting desk'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda, the delegate directory and stand numbers'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, exhibition stands and the meeting tables', { when: [some(WHEN_EXPO[0], ans('meetings', 'yes'), WHEN_STAGE[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch, which is where the deals actually get discussed', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed for the people on the road', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('photography', 'conditional', 'Document', 'Speakers, the floor and the exhibition, for the sponsors', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and meeting tables with room to talk', { when: WHEN_SEATS }),
      S('power_cooling', 'conditional', 'Supply', 'Power to the stands and cooling for a full hall', { when: [some(WHEN_BIG_EXPO[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Shuttle', 'Hotel transfers for delegates travelling in', { when: WHEN_TRAVEL }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across the days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with exhibition space and enough small meeting rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('b2b_matching', 'Match them', 'Meetings matched and scheduled before anyone travels', 'group', { experience: true, when: [ans('meetings', 'yes')] }),
      X('delegate_directory', 'Who is here', 'A directory with every delegate and what they are buying or selling', 'album', { trade: 'invitation_printing' }),
      X('sponsor_deliverables', 'Deliver', 'Every sponsor commitment listed and signed off before the day', 'invite', { trade: 'invitation_printing', when: WHEN_SPONSOR }),
      X('meeting_report', 'Prove it', 'Meetings held and leads reported to every exhibitor', 'poll', { trade: 'guest_services', when: [ans('meetings', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'The scheduled meetings are what exhibitors paid for. Protect them before anything on the main stage.' },
    timeline: {
      before: ['Meetings matched and schedules published before anyone travels', 'Exhibition floor plan drawn with usable footfall per stand', 'Agenda published with rooms and times'],
      during: ['Registration clearing before the first session', 'Meetings run to the slot sheet', 'Breaks held — that is the networking'],
      after: ['Meeting and lead report to every exhibitor', 'Recordings published', 'Venue settled'],
    },
    checklist: ['Meetings matched in advance', 'Floor plan with usable footfall', 'Agenda published with rooms', 'Lead report arrangement'],
  }),

  B('automotive-conference', 'Drive it in', 'A conference where some of the exhibits weigh two tonnes.', {
    about: 'The programme is a conference; the logistics are a vehicle show. Floor loading, a ramp and a marshalled route decide what can be displayed at all.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS,
      Q('vehicles', 'How many vehicles are being displayed?', 'select', { options: [['0', 'None'], ['3', 'Up to 3'], ['10', 'Up to 10'], ['30', 'More than 10']] }),
      Q('vehicle_access', 'Can vehicles be driven into the space?', 'one', { optional: true, options: [['drive', 'Yes, driven in'], ['ramp', 'Via a ramp'], ['crane', 'They need lifting'], ['unsure', 'Not sure']] }),
      Q('focus_auto', 'What is the focus?', 'many', { options: [['ev', 'Electric vehicles'], ['manufacturing_auto', 'Manufacturing'], ['mobility', 'Mobility services'], ['components_auto', 'Components'], ['design_auto', 'Design'], ['policy_auto', 'Policy and regulation']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, GUARD, PHOTOS, SPONSORS, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Platform', 'Vehicle platforms, turntables, barriers, the stage and stands'),
      S('event_lighting', 'conditional', 'Light it', 'Lighting aimed off the paint, because a car is a mirror', { when: [some(ans('vehicles', '3', '10', '30'), WHEN_BRAND[0])] }),
      S('sound_av', 'recommended', 'Present', 'Stage production, screens and sound for the sessions'),
      S('power_cooling', 'conditional', 'Supply', 'Power to the stands, and charging where electric vehicles are shown', { when: [some(ans('focus_auto', 'ev'), WHEN_BIG_EXPO[0])] }),
      S('guest_services', 'recommended', 'Register', 'Delegate registration, badges and hosts on the vehicle displays'),
      S('invitation_printing', 'recommended', 'Specify', 'Badges, the agenda, spec boards per vehicle and the floor plan'),
      S('end_to_end_event_logistics', 'conditional', 'Move it', 'Vehicle move-in and move-out to slots, with marshals', { when: [ans('vehicles', '3', '10', '30')] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch for the conference programme', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot', 'Vehicles photographed properly, which needs its own lighting time', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Guard', 'Overnight cover for vehicles left on the floor', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0], ans('vehicles', '10', '30'))] }),
      S('decoration_floral', 'conditional', 'Brand', 'Stand builds, backdrop and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and lounge space on the display floor', { when: WHEN_SEATS }),
      S('valet_parking', 'conditional', 'Park', 'Delegate parking and a separate vehicle-delivery route', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'A hall with floor loading, a ramp and a wide get-in', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_loading', 'Check the floor', 'Floor loading confirmed in writing before a vehicle is booked in', 'schedule', { experience: true, when: [ans('vehicles', '3', '10', '30')] }),
      X('marshalled_route', 'Guide them in', 'A cleared, marshalled route for every vehicle movement', 'map', { trade: 'end_to_end_event_logistics', when: [ans('vehicle_access', 'drive', 'ramp')] }),
      X('ev_charging', 'Keep them charged', 'Charging points for electric vehicles on display across the days', 'power_cooling', { trade: 'power_cooling', when: [ans('focus_auto', 'ev')] }),
      X('detailing', 'Finish them', 'Vehicles cleaned and detailed on the floor before doors each day', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'Floor loading and ramp access are confirmed in writing before any vehicle is booked. Test drives, where they happen at all, are the manufacturer’s under their own insurance.' },
    timeline: {
      before: ['Floor loading and ramp access confirmed in writing', 'Vehicle move-in slots issued with a marshalled route', 'Lighting aimed off the paint and tested'],
      during: ['Vehicles moved only under marshal supervision, outside show hours', 'Charging maintained for electric displays', 'Vehicles detailed before doors each day'],
      after: ['Move-out to slots', 'Vehicles reconciled against the manifest', 'Hall reinstated'],
    },
    checklist: ['Floor loading in writing', 'Marshalled vehicle route', 'Charging for EV displays', 'Spec boards per vehicle'],
  }),

  B('banking-and-finance-summit', 'Discuss', 'A regulated industry talking in public, carefully.', {
    about: 'What is said here can move a price, so the recording policy and the press arrangements matter as much as the stage. Some sessions will be closed, and closed means closed.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, CONFIDENTIAL,
      Q('audience_fin', 'Who is in the room?', 'many', { options: [['banks', 'Banks'], ['fintech', 'Fintech'], ['regulators', 'Regulators'], ['investors_fin', 'Investors'], ['press_fin', 'Press'], ['corporates', 'Corporate treasurers']] }),
      Q('elements_fin', 'What is on?', 'many', { optional: true, options: [['keynotes_fin', 'Keynotes'], ['panels_fin', 'Panels'], ['exhibition_fin', 'A fintech exhibition'], ['awards_fin', 'Awards'], ['closed', 'Closed-door sessions'], ['press_conf', 'A press conference']] }),
      AV, REGISTER, HOSPITALITY, BRANDING, AWARDS, PHOTOS, GUARD, SEATS, PARKING,
    ],
    plan: [
      S('sound_av', 'recommended', 'Produce', 'Stage production, and a recording policy applied session by session'),
      S('guest_services', 'recommended', 'Admit', 'Badge-checked registration, press and delegates handled apart'),
      S('security_services', 'conditional', 'Control', 'Access control, and a closed door that is actually closed', { when: [some(WHEN_GUARD[0], WHEN_SECRET[0], ans('elements_fin', 'closed'))] }),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda, the recording policy and room signage'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, breakout rooms, exhibition stands and a press area', { when: [some(WHEN_STAGE[0], ans('elements_fin', 'exhibition_fin', 'press_conf'))] }),
      S('videography', 'conditional', 'Record some', 'Recording only in the sessions that permit it, never the closed ones', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('catering_food', 'conditional', 'Host', 'Breaks and lunch at the standard this audience expects', { when: WHEN_FOOD }),
      S('event_lighting', 'conditional', 'Light', 'Stage light built for the camera and the stream', { when: [some(WHEN_STREAM[0], WHEN_STAGE[0])] }),
      S('photography', 'conditional', 'Document', 'Open sessions only, under the published policy', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies where there is an awards segment', { when: [some(WHEN_TROPHY[0], ans('elements_fin', 'awards_fin'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Theatre seating, panel furniture and a quiet area', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop and wayfinding, restrained for the sector', { when: WHEN_BRAND }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, which this audience notices', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A venue with private breakout rooms and a separate press space', { when: WHEN_FINDING }),
    ],
    addons: [
      X('recording_policy', 'Publish the rule', 'A per-session recording and attribution policy, published and enforced', 'schedule', { experience: true }),
      X('closed_sessions', 'Shut the door', 'Closed sessions with a checked door, no recording and no phones', 'security_services', { trade: 'security_services', when: [ans('elements_fin', 'closed')] }),
      X('press_handling', 'Manage press', 'A press desk, briefed spokespeople and booked interview slots', 'phone', { trade: 'guest_services', when: [ans('audience_fin', 'press_fin')] }),
      X('chatham_rule', 'Attribute carefully', 'A stated attribution rule per session, printed on the agenda', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'A closed session means no recording, no stream, no photography and a checked door. The attribution rule is published per session and enforced.' },
    timeline: {
      before: ['Recording and attribution policy agreed per session and published', 'Closed sessions identified with access lists', 'Press arrangements and interview slots agreed'],
      during: ['Door checked at every closed session', 'Recording stopped and equipment visible as off in closed rooms', 'Press kept to the agreed access'],
      after: ['Recordings published only from open sessions', 'Press follow-up through the agreed channel', 'Venue settled'],
    },
    checklist: ['Recording policy published per session', 'Closed-session access lists', 'Press desk and slots', 'Attribution rule on the agenda'],
  }),

  B('sustainability-conference', 'Practise it', 'A conference about footprint, which is judged on its own.', {
    about: 'The one event where the catering, the signage and the giveaways are part of the argument. Disposables and a bin of lanyards at the end undo the whole programme.',
    formats: ['venue', 'outdoor'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('themes_sus', 'What is the focus?', 'many', { options: [['climate', 'Climate'], ['circular', 'Circular economy'], ['energy_sus', 'Energy'], ['water_sus', 'Water'], ['esg', 'ESG and reporting'], ['biodiversity_sus', 'Biodiversity']] }),
      Q('own_footprint', 'How is the event’s own footprint handled?', 'many', {
        options: [['reusable', 'Reusables only'], ['no_giveaways', 'No giveaways'], ['segregated', 'Segregated waste'], ['digital_only', 'Digital material only'], ['local_food', 'Local, seasonal catering'], ['measured', 'Footprint measured and reported']],
        help: 'A conference about footprint is read against its own. We will keep these on the plan.',
      }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SEATS, ACCESS_NEEDS,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Practise it', 'Segregated waste, no single use, and the venue left better than found'),
      S('sound_av', 'recommended', 'Deliver', 'Stage production and session sound, with hybrid where it saves travel'),
      S('catering_food', 'conditional', 'Feed honestly', 'Local, seasonal food on reusables, with nothing disposable in sight', { when: WHEN_FOOD }),
      S('guest_services', 'recommended', 'Register', 'Digital registration and badges that are returned and reused'),
      S('invitation_printing', 'conditional', 'Minimise', 'Reusable signage and digital material rather than printed packs', { when: [some(WHEN_BRAND[0], WHEN_REG[0])] }),
      S('event_equipment_rental', 'conditional', 'Build reusably', 'Stage and stands built from hired, reusable elements', { when: [some(WHEN_STAGE[0], WHEN_EXPO[0])] }),
      S('videography', 'conditional', 'Reach them', 'Streaming, the single biggest footprint saving available', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'The conference, including its own waste arrangements', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Hired seating and accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('decoration_floral', 'conditional', 'Dress lightly', 'Undated, reusable dressing — nothing printed with this year on it', { when: WHEN_BRAND }),
      S('power_cooling', 'conditional', 'Supply', 'Power for the floor, sized rather than over-specified', { when: [some(WHEN_BIG_EXPO[0], WHEN_OUTSIDE[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across the days, with consolidated deliveries', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue on public transport, which matters more than its badge', { when: WHEN_FINDING }),
    ],
    addons: [
      X('no_disposables', 'Walk the talk', 'Reusable crockery, water stations and no single-use anything', 'glass', { trade: 'catering_food', when: [ans('own_footprint', 'reusable')] }),
      X('no_giveaways', 'Give nothing', 'No tote bags, no lanyard waste, no printed packs nobody reads', 'poll', { experience: true, when: [ans('own_footprint', 'no_giveaways')] }),
      X('footprint_report', 'Measure it', 'The event’s own footprint measured and published honestly', 'budget', { experience: true, when: [ans('own_footprint', 'measured')] }),
      X('reusable_signage', 'Print once', 'Undated signage, stored and used again next year', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The event’s own footprint is part of the argument. We will keep reusables, segregation and the hybrid option on the plan and say so if they come off.' },
    timeline: {
      before: ['Footprint decisions made before anything is ordered', 'Venue chosen for public-transport access', 'Signage designed undated so it can be reused'],
      during: ['No single-use items anywhere delegates can see', 'Segregation staffed, not just bins placed', 'Hybrid option working, so travel is genuinely avoidable'],
      after: ['Footprint measured and published, including what went wrong', 'Signage and materials stored for reuse', 'Venue left better than found'],
    },
    checklist: ['Footprint decisions made first', 'Reusables and segregation staffed', 'Undated reusable signage', 'Hybrid option that works'],
  }),

  B('architecture-conference', 'Draw it', 'Practitioners presenting buildings that cannot be brought into the room.', {
    about: 'Everything is representation: drawings, models and photography. The projection quality and the model lighting are the technical argument, and site visits are the part people remember.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, ACCREDITED,
      Q('shown_arch', 'What is being shown?', 'many', { options: [['drawings', 'Drawings'], ['models_arch', 'Models'], ['photography_arch', 'Photography'], ['film_arch', 'Film'], ['materials_arch', 'Material samples'], ['vr_arch', 'Virtual walkthroughs']] }),
      Q('site_visits', 'Are there site visits?', 'yesno', { optional: true }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, GUARD, PHOTOS, SEATS, TRAVEL,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project', 'Projection good enough to read a drawing from the back row'),
      S('event_lighting', 'conditional', 'Light them', 'Light on models from above and across, which is how they read', { when: [some(ans('shown_arch', 'models_arch'), WHEN_EXPO[0])] }),
      S('event_equipment_rental', 'conditional', 'Mount', 'Model plinths, drawing panels and the exhibition stands', { when: [some(WHEN_EXPO[0], ans('shown_arch', 'models_arch', 'drawings'))] }),
      S('guest_services', 'recommended', 'Register', 'Registration, the credits register where it applies, and visit groups'),
      S('invitation_printing', 'recommended', 'Credit', 'Badges, the programme, panel text and full project credits'),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that hold the programme', { when: WHEN_FOOD }),
      S('passenger_transport', 'conditional', 'Take them', 'Coaches for the site visits, in groups, with timings', { when: [some(ans('site_visits', 'yes'), WHEN_TRAVEL[0])] }),
      S('videography', 'conditional', 'Record', 'Sessions recorded with each practice’s permission', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'The exhibition and the sessions, crediting the photographers', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and viewing space around the models', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Watch', 'Cover for models, which are expensive and fragile', { when: [some(WHEN_GUARD[0], ans('shown_arch', 'models_arch'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Handle', 'Models crated, transported and condition-checked in and out', { when: [ans('shown_arch', 'models_arch')] }),
      S('venue', 'conditional', 'Find', 'A venue with controllable light and wall space, not just seats', { when: WHEN_FINDING }),
    ],
    addons: [
      X('site_visit_groups', 'Walk them round', 'Site visits in timed groups, with permission from the building owner', 'map', { experience: true, when: [ans('site_visits', 'yes')] }),
      X('model_crating', 'Move it safely', 'Models crated and condition-checked in and out', 'move', { trade: 'end_to_end_event_logistics', when: [ans('shown_arch', 'models_arch')] }),
      X('full_credits', 'Credit everyone', 'Architect, client, engineer and photographer named on every panel', 'invite', { trade: 'invitation_printing' }),
      X('credits_register', 'Record for credits', 'The attendance register exactly as the institute requires', 'poll', { trade: 'guest_services', when: WHEN_CREDITS }),
    ],
    toolkit: { polls: ['date'], note: 'Drawings, models and photographs belong to the practices and photographers who made them. Credits and reproduction are agreed in writing before anything is shown.' },
    timeline: {
      before: ['Credits agreed with every practice, including photographers', 'Models crated and condition-checked on arrival', 'Site visits agreed with the building owners, in groups'],
      during: ['Projection checked against a real drawing before each session', 'Models lit and invigilated', 'Site visits to the published groups and times'],
      after: ['Models returned, condition checked against arrival', 'Attendance register sent to the institute where credits apply', 'Recordings shared where agreed'],
    },
    checklist: ['Credits agreed in writing', 'Models crated and checked', 'Site visits permitted and grouped', 'Projection tested on a real drawing'],
  }),

  B('legal-conference', 'Argue it', 'A profession that reads everything, including what you wrote on the badge.', {
    about: 'Privacy, attribution and the register for continuing education are the operational core. Much of what is said is on the record only if the speaker says so.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, ACCREDITED, CONFIDENTIAL,
      Q('format_legal', 'What is on the programme?', 'many', { options: [['lectures', 'Lectures'], ['panels_legal', 'Panels'], ['moot', 'A moot or mock hearing'], ['workshops_legal', 'Workshops'], ['legaltech', 'Legal technology exhibition'], ['networking_legal', 'Networking']] }),
      AV, REGISTER, HOSPITALITY, BRANDING, GUARD, PHOTOS, SEATS, ACCESS_NEEDS, PARKING,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'Clear speech reinforcement, and recording only where permitted'),
      S('guest_services', 'recommended', 'Register', 'Registration, and the attendance register the bar body specifies'),
      S('invitation_printing', 'recommended', 'Paper it', 'Badges, the programme, session materials and the attribution rule'),
      S('event_equipment_rental', 'conditional', 'Set', 'Lectern, panel seating, a moot setup and breakout rooms', { when: [some(WHEN_STAGE[0], ans('format_legal', 'moot', 'workshops_legal'), WHEN_MULTI[0])] }),
      S('catering_food', 'conditional', 'Host', 'Breaks and lunch, which this profession takes seriously', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record some', 'Recording only in sessions the speakers have agreed to', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('security_services', 'conditional', 'Control', 'Door control for closed sessions and sensitive subjects', { when: [some(WHEN_GUARD[0], WHEN_SECRET[0])] }),
      S('photography', 'conditional', 'Document', 'Open sessions only, under the published policy', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating with writing surfaces, and accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Restrained backdrop and wayfinding', { when: WHEN_BRAND }),
      S('valet_parking', 'conditional', 'Park', 'Parking, for an audience that arrives from chambers at nine', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A venue with quiet rooms and no sound bleed between sessions', { when: WHEN_FINDING }),
    ],
    addons: [
      X('credits_register', 'Record for credits', 'The attendance register exactly as the bar body specifies', 'poll', { trade: 'guest_services', when: WHEN_CREDITS }),
      X('attribution_rule', 'State the rule', 'A per-session attribution rule, printed on the agenda and announced', 'invite', { trade: 'invitation_printing' }),
      X('moot_setup', 'Set the court', 'A bench, counsel tables and a clock for the moot', 'event_equipment_rental', { trade: 'event_equipment_rental', when: [ans('format_legal', 'moot')] }),
      X('writing_surfaces', 'Let them write', 'Seating with a surface — this audience takes notes all day', 'chair', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Continuing legal education credits are the bar body’s to grant. We provide the register they specify and certify nothing. The attribution rule is published per session.' },
    timeline: {
      before: ['Bar body’s register and certificate requirements obtained', 'Attribution and recording rules agreed per session and printed', 'Rooms checked for sound bleed'],
      during: ['Attendance recorded exactly as the body requires', 'Recording only where the speaker agreed', 'Closed sessions with a checked door'],
      after: ['Register submitted to the bar body', 'Certificates issued by them', 'Recordings published only where agreed'],
    },
    checklist: ['Bar body register requirements obtained', 'Attribution rule published per session', 'Writing surfaces for delegates', 'Rooms free of sound bleed'],
  }),

  B('hospitality-industry-summit', 'Set the table', 'An industry of hosts, being hosted, and noticing everything.', {
    about: 'The audience does this for a living, so the service, the food and the timings are themselves the content. A badly run break will be discussed more than the keynote.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('segments', 'Which segments?', 'many', { options: [['hotels', 'Hotels'], ['restaurants', 'Restaurants'], ['travel_hosp', 'Travel'], ['catering_seg', 'Catering'], ['tech_hosp', 'Hospitality technology'], ['education_hosp', 'Training and education']] }),
      Q('features_hosp', 'What is on besides sessions?', 'many', { optional: true, options: [['chef_demos', 'Chef demonstrations'], ['tastings', 'Tastings'], ['exhibition_hosp', 'An exhibition'], ['awards_hosp', 'Awards'], ['gala', 'A gala dinner']] }),
      DIET_ONLY, ALLERGY_ONLY, EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, AWARDS, SEATS, PHOTOS,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'Food judged by people who serve food — consistency over ambition'),
      S('sound_av', 'recommended', 'Deliver', 'Stage production, and cameras on the hands for chef demonstrations'),
      S('guest_services', 'recommended', 'Host them', 'Registration and service at the standard the room would expect to give'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, a demonstration kitchen, tasting counters and exhibition stands', { when: [some(ans('features_hosp', 'chef_demos', 'tastings', 'exhibition_hosp'), WHEN_EXPO[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power, gas safety and cold storage for a demonstration kitchen', { when: [ans('features_hosp', 'chef_demos', 'tastings')] }),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda, menus with allergens and exhibitor signage'),
      S('decoration_floral', 'conditional', 'Dress', 'Table styling and backdrop, which this audience reads closely', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Document', 'Sessions, demonstrations and the food, for organiser and exhibitors', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award', 'Industry awards and trophies', { when: [some(WHEN_TROPHY[0], ans('features_hosp', 'awards_hosp'))] }),
      S('videography', 'conditional', 'Record', 'Sessions and chef demonstrations, cut for the trade', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, round tables for the gala and tasting counters', { when: [some(WHEN_SEATS[0], ans('features_hosp', 'gala'))] }),
      S('safety_facilities', 'conditional', 'Keep it clean', 'Handwashing, waste and cleaning around any food demonstration', { when: [ans('features_hosp', 'chef_demos', 'tastings')] }),
      S('venue', 'conditional', 'Find', 'A venue whose own kitchen can carry the catering standard', { when: WHEN_FINDING }),
    ],
    addons: [
      X('demo_kitchen', 'Cook in view', 'A working demonstration kitchen with an overhead camera and a screen', 'chef', { trade: 'event_equipment_rental', when: [ans('features_hosp', 'chef_demos')] }),
      X('allergen_menus', 'Declare it', 'Allergens printed on every menu and at every tasting counter', 'invite', { trade: 'invitation_printing' }),
      X('service_brief', 'Match the room', 'Service briefed to a standard this audience would be happy to give', 'group', { experience: true }),
      X('break_timing', 'Run the breaks', 'Breaks staffed for the peak minute, not the average one', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'This audience judges the service as closely as the programme. Allergens are declared in writing at every counter.' },
    timeline: {
      before: ['Catering brief set for consistency across every cover', 'Demonstration kitchen specified with gas safety and cold storage', 'Allergen information collected and printed'],
      during: ['Service to standard throughout, not just at the start', 'Gas and temperature checks before any demonstration', 'Breaks staffed for the peak'],
      after: ['Recordings cut for the trade press', 'Exhibitor and sponsor report', 'Kitchen and venue settled'],
    },
    checklist: ['Catering brief for consistency', 'Demonstration kitchen with gas safety', 'Allergens on every menu', 'Breaks staffed for peak'],
  }),

  B('franchise-expo', 'Sell the model', 'Brands looking for franchisees, and visitors deciding where to put their savings.', {
    about: 'Visitors are making a serious financial decision from a stand. Lead capture is what exhibitors bought, and nothing on the floor should be a figure we wrote.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('brands', 'How many franchise brands?', 'select', { options: [['15', 'Up to 15'], ['50', 'Up to 50'], ['150', 'Up to 150'], ['300', 'More than 150']] }),
      Q('sectors_fr', 'Which sectors?', 'many', { options: [['food_fr', 'Food and beverage'], ['retail_fr', 'Retail'], ['education_fr', 'Education'], ['services_fr', 'Services'], ['health_fr', 'Health and wellness'], ['logistics_fr', 'Logistics']] }),
      Q('features_fr', 'What else is on?', 'many', { optional: true, options: [['seminars', 'Seminars'], ['one_to_one', 'One-to-one meetings'], ['investor_fr', 'Investor sessions'], ['launches', 'Brand launches'], ['awards_fr', 'Awards']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, GUARD, PHOTOS, SPONSORS, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'Shell scheme, meeting tables, a seminar room and the aisles'),
      S('guest_services', 'recommended', 'Capture leads', 'Visitor registration with consent, badge scanning and meeting booking'),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, a floor plan, the brand directory and seminar schedule'),
      S('sound_av', 'conditional', 'Present', 'Seminar sound and screens, kept from bleeding into the aisles', { when: [some(ans('features_fr', 'seminars', 'launches'), WHEN_PA[0])] }),
      S('catering_food', 'conditional', 'Feed', 'A café for visitors and something for exhibitors on stands', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Supply', 'Power per stand and cooling for a full hall', { when: [some(WHEN_BIG_EXPO[0], WHEN_BIG[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, aisle signage and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('photography', 'conditional', 'Document', 'Stands and the floor, for exhibitors and the next edition', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Sit them down', 'Meeting tables, because this conversation takes twenty minutes', { when: [some(WHEN_SEATS[0], ans('features_fr', 'one_to_one'))] }),
      S('security_services', 'conditional', 'Secure', 'Badge-checked entry and overnight cover for the hall', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and move-out across the days', { when: WHEN_DAYS }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking and an exhibitor loading route', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'A hall with the floor area and real loading access', { when: WHEN_FINDING }),
    ],
    addons: [
      X('lead_consent', 'Ask properly', 'Visitor details captured with consent and shared only with chosen brands', 'invite', { experience: true }),
      X('meeting_rooms', 'Sit them down', 'Private tables for the serious conversations, booked by slot', 'chair', { trade: 'event_equipment_rental', when: [ans('features_fr', 'one_to_one')] }),
      X('no_figures', 'Their numbers', 'Every investment figure and return claim is the brand’s own, not ours', 'poll', { experience: true }),
      X('lead_report', 'Prove it', 'Leads and footfall reported to every exhibitor within the week', 'budget', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'We write no investment figure, fee or return. Every number on a stand is the brand’s own, and visitor details go only to the brands a visitor chose.' },
    timeline: {
      before: ['Floor plan drawn so every stand gets usable footfall', 'Consent wording agreed for lead capture', 'Exhibitor manual issued with build rules and deadlines'],
      during: ['Registration capturing details with explicit consent', 'Meeting tables kept available for serious conversations', 'Leads routed only to the brands a visitor selected'],
      after: ['Lead and footfall report to every exhibitor', 'Visitor data handled only as consented', 'Hall reinstated'],
    },
    checklist: ['Floor plan with usable footfall', 'Lead consent wording agreed', 'Meeting tables available', 'No figures written by us'],
  }),

  B('professional-networking-meet', 'Connect them', 'No stage, no rows of chairs, and a room designed for conversation.', {
    about: 'The smallest format in this category and the one most often ruined by a programme. Every minute of presentation is a minute nobody spent meeting anyone.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE,
      Q('domain', 'Which profession or sector?', 'text', { max: 100 }),
      Q('structure', 'How structured is it?', 'one', { options: [['open', 'Completely open'], ['intros', 'Short introductions, then open'], ['speed', 'Structured rounds'], ['matched', 'Pre-matched meetings'], ['themed_tables', 'Themed tables']] }),
      Q('badges_detail', 'What goes on the badge?', 'many', { optional: true, options: [['name_role', 'Name and role'], ['company', 'Company'], ['looking_for', 'What they are looking for'], ['topic', 'A conversation prompt']] }),
      AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SEATS,
    ],
    plan: [
      S('invitation_printing', 'recommended', 'Introduce them', 'Badges carrying more than a name, which do most of the work'),
      S('tent_furniture', 'recommended', 'Lay it out', 'Standing tables and zones — no rows, and nothing that traps a group'),
      S('catering_food', 'conditional', 'Circulate', 'Food you can eat standing, with one hand, while talking', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Bridge', 'Hosts who introduce people rather than just check them in', { when: WHEN_REG }),
      S('event_lighting', 'recommended', 'Warm the room', 'Lighting people look well in and can still read a badge by'),
      S('sound_av', 'conditional', 'Open it', 'A mic for the introductions, and music under the conversation', { when: [some(WHEN_PA[0], ans('structure', 'intros', 'speed'))] }),
      S('anchor_mc', 'conditional', 'Start it', 'Someone to open it, run the rounds, and then get out of the way', { when: [ans('structure', 'intros', 'speed', 'matched')] }),
      S('photography', 'conditional', 'Capture', 'The room working, for the host and the next invitation', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Zone it', 'Themed tables, round-table setups and signage', { when: [ans('structure', 'speed', 'matched', 'themed_tables')] }),
      S('decoration_floral', 'conditional', 'Brand', 'A backdrop and the host’s presence, kept light', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'One big room with flow — three small ones kill a networking event', { when: WHEN_FINDING }),
    ],
    addons: [
      X('badge_prompt', 'Give them an opener', 'A badge that says what someone is looking for, not just who they are', 'invite', { trade: 'invitation_printing', when: [ans('badges_detail', 'looking_for', 'topic')] }),
      X('host_introductions', 'Make the introduction', 'Briefed hosts whose only job is introducing people to each other', 'group', { trade: 'guest_services' }),
      X('no_chairs', 'Stand them up', 'No seated rows — every chair is a conversation that does not happen', 'chair', { experience: true }),
      X('follow_up_list', 'Keep it going', 'A consented contact list circulated the next morning', 'phone', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Keep the programme short. Every minute of presentation is a minute nobody spent meeting anyone.' },
    timeline: {
      before: ['Guest list reviewed so the mix actually works', 'Badges printed with a prompt, not just a name', 'Layout planned for flow, with no dead corners'],
      during: ['Hosts introducing, not only greeting', 'Short opening, then out of the way', 'Food circulating; no queue at the bar'],
      after: ['Contact list circulated with consent', 'Feedback on who people actually met', 'Next date announced'],
    },
    checklist: ['Guest mix reviewed', 'Badges with a conversation prompt', 'Layout planned for flow', 'Programme kept short'],
  }),

  B('cybersecurity-conference', 'Defend it', 'A conference where the network is both the subject and the risk.', {
    about: 'An untrusted room full of capable people. The delegate network is isolated from everything that matters, closed sessions are genuinely closed, and demonstrations run in a sandbox.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, CONFIDENTIAL,
      Q('elements_cyber', 'What is on?', 'many', { options: [['talks_cyber', 'Talks'], ['labs', 'Technical labs'], ['ctf', 'A capture-the-flag'], ['vendor', 'A vendor exhibition'], ['closed_cyber', 'Closed-door sessions'], ['training_cyber', 'Training']] }),
      NETWORK, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, GUARD, SEATS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Isolate', 'An isolated delegate network and power at every seat'),
      S('sound_av', 'recommended', 'Present', 'Screens legible for terminal output, and a per-session record rule'),
      S('guest_services', 'recommended', 'Register', 'Badge-checked registration, with closed-session access lists'),
      S('event_equipment_rental', 'conditional', 'Build', 'Lab benches, the CTF floor, the stage and vendor stands', { when: [some(ans('elements_cyber', 'labs', 'ctf', 'vendor'), WHEN_STAGE[0])] }),
      S('security_services', 'conditional', 'Hold the door', 'Access control, and closed sessions that stay closed', { when: [some(WHEN_GUARD[0], WHEN_SECRET[0], ans('elements_cyber', 'closed_cyber'))] }),
      S('invitation_printing', 'recommended', 'State it', 'Badges, the agenda, the recording policy and network rules'),
      S('catering_food', 'conditional', 'Sustain', 'Food for people who will not leave a lab bench', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record some', 'Recording only where the speaker and the subject permit', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'Open sessions only, and never a screen with real data on it', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, lab benches and a quiet area', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and vendor presence', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A venue that will allow an isolated network and a closed door', { when: WHEN_FINDING }),
    ],
    addons: [
      X('isolated_network', 'Separate it', 'A delegate network fully isolated from the venue’s own systems', 'power_cooling', { trade: 'power_cooling', when: [ans('network', 'isolated', 'wired', 'heavy')] }),
      X('ctf_infrastructure', 'Run the game', 'CTF infrastructure, a scoreboard and admins who can arbitrate', 'poll', { trade: 'event_equipment_rental', when: [ans('elements_cyber', 'ctf')] }),
      X('closed_sessions', 'Shut the door', 'Closed sessions: no recording, no phones, a checked door', 'security_services', { trade: 'security_services', when: [ans('elements_cyber', 'closed_cyber')] }),
      X('no_screen_shots', 'Protect the screens', 'A rule against photographing any screen, stated and enforced', 'camera', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The delegate network is isolated from the venue’s own. Closed means no recording, no phones and a checked door, and no screen is photographed.' },
    timeline: {
      before: ['Isolated delegate network agreed with the venue and tested', 'Recording and photography policy published per session', 'Closed-session access lists prepared'],
      during: ['Network monitored and isolated throughout', 'Closed sessions with a checked door and no devices recording', 'Screen photography stopped as it happens'],
      after: ['Network torn down and the venue’s systems confirmed untouched', 'Recordings published only from open sessions', 'CTF results and write-ups published'],
    },
    checklist: ['Isolated delegate network tested', 'Per-session recording policy', 'Closed-session door control', 'No-screen-photography rule enforced'],
  }),
  B('data-science-conference', 'Model it', 'Practitioners comparing methods, with laptops open the whole time.', {
    about: 'The audience arrives with four hundred laptops and expects them all to work. Bandwidth per seat and power per seat are the two numbers that decide the day.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('elements_ds', 'What is on?', 'many', { options: [['talks_ds', 'Talks'], ['tutorials', 'Hands-on tutorials'], ['posters_ds', 'Poster sessions'], ['challenge', 'A data challenge'], ['hackathon_ds', 'A hackathon'], ['vendor_ds', 'A vendor area']] }),
      NETWORK, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SEATS, SPONSORS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Power it', 'Power and bandwidth per seat, for a room that is all online'),
      S('sound_av', 'recommended', 'Show the code', 'Screens legible for code from the back, in every tutorial room'),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Tutorial rooms with tables, poster boards and the challenge floor', { when: [some(ans('elements_ds', 'tutorials', 'posters_ds', 'challenge', 'hackathon_ds'), WHEN_MULTI[0])] }),
      S('guest_services', 'recommended', 'Register', 'Registration, tutorial sign-ups and a technical help desk'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda, poster numbering and tutorial allocations'),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that hold the schedule', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Talks recorded, with each presenter’s permission', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('tent_furniture', 'conditional', 'Give a surface', 'Tables rather than theatre rows, for a room that types', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Document', 'Sessions and posters, with the presenters’ agreement', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days and rooms', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue whose wifi survives four hundred laptops, which is rare', { when: WHEN_FINDING }),
    ],
    addons: [
      X('bandwidth_per_seat', 'Test it full', 'Bandwidth tested with the real device count, not the venue’s brochure', 'power_cooling', { trade: 'power_cooling', when: WHEN_NET }),
      X('tutorial_signups', 'Size the rooms', 'Tutorial sign-ups in advance, so nobody is turned away at the door', 'poll', { trade: 'invitation_printing', when: [ans('elements_ds', 'tutorials')] }),
      X('challenge_infra', 'Run the challenge', 'Submission and leaderboard infrastructure, with published rules', 'media', { trade: 'sound_av', when: [ans('elements_ds', 'challenge', 'hackathon_ds')] }),
      X('tables_not_rows', 'Give them a surface', 'Tables in every tutorial room — laptops do not work on knees', 'chair', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Test the bandwidth with the real device count before signing the venue. A conference where nobody can connect is the only failure this audience will not forgive.' },
    timeline: {
      before: ['Bandwidth and power tested at full device load', 'Tutorial sign-ups taken so rooms are sized correctly', 'Challenge rules and submission process published'],
      during: ['Network monitored through the day', 'Tutorials to their sign-up lists, with tables', 'Leaderboard updated and visible'],
      after: ['Recordings and materials published', 'Challenge results and write-ups released', 'Venue settled'],
    },
    checklist: ['Bandwidth tested at full load', 'Power at every seat', 'Tutorial sign-ups taken', 'Tables in tutorial rooms'],
  }),

  B('developer-conference', 'Ship it', 'A thousand devices, all charging, all online, all at once.', {
    about: 'The infrastructure is the hospitality. Power, wifi density and somewhere to sit with a laptop matter more to this audience than the catering, and they will say so publicly.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('elements_dev', 'What is on?', 'many', { options: [['keynote_dev', 'A keynote'], ['talks_dev', 'Talks'], ['workshops_dev', 'Workshops'], ['hackathon_dev', 'A hackathon'], ['community', 'Community booths'], ['certification', 'Certification sessions']] }),
      NETWORK, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SEATS, SPONSORS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Keep them on', 'Charging at every seat and wifi for a thousand devices'),
      S('sound_av', 'recommended', 'Show the code', 'Screens legible for a terminal, and recording in every track room'),
      S('event_equipment_rental', 'conditional', 'Build', 'Keynote stage, workshop rooms, community booths and hack space', { when: [some(WHEN_STAGE[0], ans('elements_dev', 'workshops_dev', 'hackathon_dev', 'community'))] }),
      S('guest_services', 'recommended', 'Register', 'Fast badge printing, workshop sign-ups and a technical help desk'),
      S('invitation_printing', 'recommended', 'Equip', 'Badges, the agenda by track, room signage and developer kits'),
      S('catering_food', 'conditional', 'Fuel', 'Food and coffee that keep running, not a single lunch window', { when: WHEN_FOOD }),
      S('videography', 'recommended', 'Record it all', 'Every track recorded — the talks outlive the conference by years'),
      S('tent_furniture', 'conditional', 'Seat and plug', 'Tables and lounge seating with sockets, not rows of chairs', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Document', 'Speakers, the floor and the community booths', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('gifts_favours', 'conditional', 'Kit them', 'Developer kits worth carrying home, not another tote bag', { when: WHEN_SPONSOR }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across the days and all the track rooms', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue with the wifi density and the sockets, which rules most out', { when: WHEN_FINDING }),
    ],
    addons: [
      X('wifi_density', 'Test the density', 'Wifi tested with the real device count, per room, before signing', 'power_cooling', { trade: 'power_cooling', when: WHEN_NET }),
      X('charging_everywhere', 'Plug them in', 'A socket within reach of every seat, in every room', 'power_cooling', { trade: 'power_cooling' }),
      X('all_talks_recorded', 'Publish everything', 'Every track recorded and published within two weeks', 'film', { trade: 'videography' }),
      X('code_of_conduct', 'Set the terms', 'A published code of conduct with a named contact, on every badge', 'heart', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Wifi density and sockets are this audience’s hospitality. Publish a code of conduct with a named contact before registration opens.' },
    timeline: {
      before: ['Wifi tested at full device density, per room', 'Code of conduct published with a named contact', 'Workshop sign-ups taken so rooms are sized'],
      during: ['Network and power monitored through the day', 'Every track recorded', 'Code of conduct contact reachable throughout'],
      after: ['All talks published within two weeks', 'Any conduct report followed up properly', 'Sponsor report'],
    },
    checklist: ['Wifi tested at full density', 'Sockets at every seat', 'Code of conduct published', 'Every track recorded'],
  }),

  B('robotics-exhibition', 'Let it move', 'Machines that move on their own, in a hall full of people.', {
    about: 'An arena with a barrier is the difference between a demonstration and an incident. Power, emergency stops and a cleared area come before anything about the stands.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('categories_rob', 'What kinds of robot?', 'many', { options: [['industrial', 'Industrial arms'], ['mobile', 'Mobile robots'], ['drones_rob', 'Drones'], ['humanoid', 'Humanoids'], ['educational', 'Educational kits'], ['combat', 'Combat or competition robots']] }),
      Q('arena', 'Is there a demonstration or competition arena?', 'yesno', {
        help: 'An arena needs a barrier, an emergency stop and a cleared fall zone, to the operator’s own plan.',
      }),
      Q('power_rob', 'What do the exhibits need?', 'many', { options: [['single_rob', 'Single-phase power'], ['three_rob', 'Three-phase'], ['charging', 'Battery charging'], ['network_rob', 'Network'], ['compressed_rob', 'Compressed air']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, GUARD, AWARDS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build it', 'Stands, the arena, barriers, netting and the exhibition floor'),
      S('power_cooling', 'recommended', 'Supply', 'Distributed power, charging areas and cooling for a full hall'),
      S('safety_facilities', 'recommended', 'Keep them back', 'A cleared fall zone, first aid, extinguishers and the clear-up'),
      S('sound_av', 'conditional', 'Commentate', 'A PA and screens for the arena and the demonstration schedule', { when: [some(WHEN_PA[0], ans('arena', 'yes'))] }),
      S('guest_services', 'recommended', 'Marshal', 'Visitor registration, arena marshals and exhibitor support'),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, a floor plan, exhibit labels, safety notices and the schedule'),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for robots left on the floor, which are valuable', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('event_lighting', 'conditional', 'Light it', 'Working light on the arena and the exhibition stands', { when: [some(ans('arena', 'yes'), WHEN_BRAND[0])] }),
      S('photography', 'conditional', 'Capture', 'The arena and the exhibits moving, from outside the barrier', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award', 'Trophies for the competition categories', { when: WHEN_TROPHY }),
      S('catering_food', 'conditional', 'Feed', 'Food for a visitor and an exhibitor who will be there all day', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, zone signage and sponsor presence', { when: WHEN_BRAND }),
      S('end_to_end_event_logistics', 'conditional', 'Move it', 'Exhibit move-in, build and move-out across the days', { when: [some(WHEN_DAYS[0], WHEN_MACHINERY[0])] }),
      S('venue', 'conditional', 'Secure', 'A hall with the power, the height and a floor that takes an arena', { when: WHEN_FINDING }),
    ],
    addons: [
      X('arena_barrier', 'Contain it', 'A real barrier and netting around the arena, not a rope and cones', 'security_services', { trade: 'event_equipment_rental', when: [ans('arena', 'yes')] }),
      X('emergency_stop', 'Stop it', 'An accessible emergency stop and a marshal who knows where it is', 'power_cooling', { experience: true, when: [ans('arena', 'yes')] }),
      X('drone_rules', 'Fly legally', 'Drone demonstrations only under the operator’s own permissions, netted', 'schedule', { experience: true, when: [ans('categories_rob', 'drones_rob')] }),
      X('charging_area', 'Charge safely', 'A supervised battery charging area away from the public', 'bar_beverages', { trade: 'power_cooling', when: [ans('power_rob', 'charging')] }),
    ],
    toolkit: { polls: ['date'], note: 'Anything that moves on its own is barriered, with an emergency stop and a marshal. Drone flights happen only under the operator’s own permissions, inside netting.' },
    timeline: {
      before: ['Arena barrier, netting and emergency stop specified and built', 'Power and charging planned per exhibit', 'Operator safety plans and insurance collected per demonstration'],
      during: ['Arena marshalled whenever anything is moving', 'Battery charging supervised and away from the public', 'Demonstrations to the published schedule, never ad hoc'],
      after: ['Exhibits moved out to slots', 'Arena struck and the hall inspected', 'Any incident recorded'],
    },
    checklist: ['Arena barrier and netting built', 'Emergency stop and a marshal', 'Operator safety plans collected', 'Supervised charging area'],
  }),

  B('clean-energy-summit', 'Generate', 'A summit whose exhibits mostly need to be outdoors and in the sun.', {
    about: 'Solar arrays, batteries and electric vehicles do not fit in a ballroom. The indoor programme and the outdoor demonstration area have to be planned as one event in two places.',
    formats: ['venue', 'outdoor'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('focus_energy', 'Which technologies?', 'many', { options: [['solar', 'Solar'], ['wind', 'Wind'], ['storage', 'Storage and batteries'], ['emobility', 'Electric mobility'], ['hydrogen', 'Hydrogen'], ['grid', 'Grid and policy']] }),
      Q('outdoor_demo', 'Is there an outdoor demonstration area?', 'yesno'),
      EXHIBITION, AV, NETWORK, REGISTER, HOSPITALITY, BRANDING, SEATS, PHOTOS, SPONSORS, PARKING,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Stage production indoors and a PA across the demonstration area'),
      S('event_equipment_rental', 'conditional', 'Build both', 'Indoor stands and an outdoor demonstration area with hard standing', { when: [some(WHEN_EXPO[0], ans('outdoor_demo', 'yes'))] }),
      S('power_cooling', 'recommended', 'Connect it', 'Power, grid points and charging for electric displays'),
      S('guest_services', 'recommended', 'Register', 'Registration, badges and hosts across both the hall and the yard'),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, the agenda, a site plan covering both areas and safety notices'),
      S('safety_facilities', 'conditional', 'Make safe', 'First aid, barriers around live equipment, and the site cleared', { when: [some(ans('outdoor_demo', 'yes'), WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch, served where delegates actually are', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shelter', 'Shade and seating in the outdoor area, which has none', { when: [some(ans('outdoor_demo', 'yes'), WHEN_SEATS[0])] }),
      S('photography', 'conditional', 'Document', 'The sessions and the outdoor demonstrations', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, wayfinding between the two areas and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('medium_large_goods_vehicle', 'conditional', 'Haul', 'Transport for arrays, batteries and vehicles in and out', { when: [some(WHEN_MACHINERY[0], ans('focus_energy', 'solar', 'storage', 'emobility'))] }),
      S('valet_parking', 'conditional', 'Park', 'Parking, with charging for delegates arriving electric', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'A venue with a hall and an adjoining yard, which is the hard part', { when: WHEN_FINDING }),
    ],
    addons: [
      X('outdoor_yard', 'Use the yard', 'An outdoor demonstration area with hard standing, power and shade', 'map', { trade: 'event_equipment_rental', when: [ans('outdoor_demo', 'yes')] }),
      X('live_equipment_barrier', 'Fence it', 'Barriers around anything energised, to the exhibitor’s safety plan', 'security_services', { trade: 'safety_facilities', when: [ans('outdoor_demo', 'yes')] }),
      X('ev_charging', 'Charge them', 'Charging points for vehicles on display and for delegates', 'power_cooling', { trade: 'power_cooling', when: [ans('focus_energy', 'emobility')] }),
      X('two_area_wayfinding', 'Join them up', 'Wayfinding and a shuttle between the hall and the yard', 'bus', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Energised equipment is barriered to the exhibitor’s own safety plan. The hall and the demonstration yard are planned as one event, with wayfinding between them.' },
    timeline: {
      before: ['Hall and outdoor yard planned together, with wayfinding between', 'Power, grid points and charging specified per exhibit', 'Exhibitor safety plans collected for anything energised'],
      during: ['Barriers checked around live equipment before doors', 'Delegates moved between the two areas on a schedule', 'Shade and water maintained in the yard'],
      after: ['Heavy exhibits moved out to slots', 'Yard reinstated and the hall cleared', 'Exhibitor report'],
    },
    checklist: ['Hall and yard planned together', 'Barriers around energised equipment', 'Charging for EV displays', 'Wayfinding between areas'],
  }),

  B('biotechnology-conference', 'Research it', 'Science presented under confidentiality, with samples nobody may photograph.', {
    about: 'Unpublished research and regulated material in one building. Access control, a per-session recording rule and the provider’s own handling procedures are the plan.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, CONFIDENTIAL,
      Q('elements_bio', 'What is on?', 'many', { options: [['research_bio', 'Research presentations'], ['posters_bio', 'Posters'], ['lab_demos', 'Laboratory demonstrations'], ['exhibition_bio', 'An exhibition'], ['workshops_bio', 'Workshops'], ['regulatory', 'Regulatory sessions']] }),
      Q('materials_bio', 'Is any biological or regulated material present?', 'one', {
        options: [['no', 'No'], ['samples', 'Samples, handled by the institution'], ['equipment_only', 'Equipment only']],
        help: 'Any biological material is handled entirely by the institution, under its own protocols. We provide nothing clinical or laboratory-grade.',
      }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, GUARD, SEATS,
    ],
    plan: [
      S('sound_av', 'recommended', 'Present', 'Projection for scientific detail, and recording only where permitted'),
      S('guest_services', 'recommended', 'Admit', 'Badge-checked registration with closed-session access lists'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the programme, abstracts and the recording policy'),
      S('event_equipment_rental', 'conditional', 'Set', 'Session rooms, poster boards, demonstration benches and stands', { when: [some(ans('elements_bio', 'posters_bio', 'lab_demos', 'exhibition_bio'), WHEN_EXPO[0])] }),
      S('security_services', 'conditional', 'Control', 'Access control where unpublished work or material is present', { when: [some(WHEN_GUARD[0], WHEN_SECRET[0], ans('materials_bio', 'samples'))] }),
      S('safety_facilities', 'conditional', 'Keep it clean', 'Handwashing, surfaces and waste holding for the institution', { when: [ans('materials_bio', 'samples')] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch, served well away from any demonstration area', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Restrict', 'No photography of unpublished data, samples or equipment in use', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Record some', 'Recording only in the sessions that have agreed to it', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and poster viewing space', { when: WHEN_SEATS }),
      S('power_cooling', 'conditional', 'Supply', 'Power and cooling for demonstration equipment', { when: [ans('elements_bio', 'lab_demos')] }),
      S('decoration_floral', 'conditional', 'Brand', 'Restrained backdrop and wayfinding', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A venue with controllable access and rooms that can be closed', { when: WHEN_FINDING }),
    ],
    addons: [
      X('institution_protocols', 'Their procedures', 'The institution’s own handling and disposal protocols, followed exactly', 'schedule', { experience: true, when: [ans('materials_bio', 'samples')] }),
      X('no_data_photos', 'Protect the work', 'A stated rule: no photography of unpublished data or posters', 'camera', { experience: true }),
      X('closed_sessions', 'Shut the door', 'Closed sessions with a checked door and no recording', 'security_services', { trade: 'security_services', when: WHEN_SECRET }),
      X('abstract_credits', 'Credit the work', 'Every author, institution and funder credited as they state it', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Sambramo handles no biological or regulated material and provides nothing laboratory-grade. The institution follows its own protocols; we provide access control and a room that can be closed.' },
    timeline: {
      before: ['Institution’s handling and disposal protocols obtained', 'Recording and photography policy agreed per session and published', 'Closed-session access lists prepared'],
      during: ['Access controlled at every closed session', 'No photography of unpublished data or samples', 'Any material handled only by the institution'],
      after: ['Material removed by the institution under its own protocol', 'Recordings published only where agreed', 'Rooms cleared'],
    },
    checklist: ['Institution protocols obtained', 'No-photography rule for unpublished work', 'Closed-session access control', 'Full author and funder credits'],
  }),

  B('supply-chain-conference', 'Trace it', 'Procurement, logistics and manufacturing, comparing what actually works.', {
    about: 'A buyer-heavy room where the exhibition and the scheduled meetings carry the commercial value. The programme exists to justify the travel.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, EXHIBITION,
      Q('focus_sc', 'Which parts?', 'many', { options: [['procurement', 'Procurement'], ['manufacturing_sc', 'Manufacturing'], ['warehousing_sc', 'Warehousing'], ['transport_sc', 'Transport'], ['tech_sc', 'Supply-chain technology'], ['sustainability_sc', 'Sustainable sourcing']] }),
      Q('meetings_sc', 'Are there scheduled buyer meetings?', 'yesno'),
      AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, SPONSORS, SEATS, TRAVEL, GUARD,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Stage production and matched sound in the breakout rooms'),
      S('guest_services', 'recommended', 'Register', 'Registration, badges and the buyer-meeting desk'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the agenda, the delegate directory and stand numbers'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, exhibition stands and private meeting tables', { when: [some(WHEN_EXPO[0], ans('meetings_sc', 'yes'), WHEN_STAGE[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that hold the meeting schedule', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and meeting tables with room to talk privately', { when: WHEN_SEATS }),
      S('videography', 'conditional', 'Record', 'Sessions recorded for the people who could not travel', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'Speakers, the exhibition and the meetings floor', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power per stand and cooling for a full hall', { when: [some(WHEN_BIG_EXPO[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Shuttle', 'Hotel transfers for delegates travelling in', { when: WHEN_TRAVEL }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across the days', { when: WHEN_DAYS }),
      S('security_services', 'conditional', 'Badge it', 'A badge-checked floor — these are commercial negotiations', { when: [some(WHEN_GUARD[0], ans('meetings_sc', 'yes'))] }),
      S('venue', 'conditional', 'Find', 'A venue with exhibition space and enough private meeting rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('buyer_matching', 'Match them', 'Buyer-supplier meetings matched and scheduled before anyone travels', 'group', { experience: true, when: [ans('meetings_sc', 'yes')] }),
      X('private_tables', 'Keep it private', 'Meeting tables far enough apart that a price cannot be overheard', 'chair', { trade: 'event_equipment_rental', when: [ans('meetings_sc', 'yes')] }),
      X('delegate_directory', 'Who is buying', 'A directory showing what each delegate is buying or selling', 'album', { trade: 'invitation_printing' }),
      X('meeting_report', 'Prove it', 'Meetings held reported to every exhibitor within the week', 'poll', { trade: 'guest_services', when: [ans('meetings_sc', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Meeting tables are spaced so a commercial conversation cannot be overheard. The scheduled meetings are what exhibitors paid for.' },
    timeline: {
      before: ['Buyer meetings matched and scheduled before anyone travels', 'Meeting tables planned with real spacing between them', 'Exhibition floor plan drawn with usable footfall'],
      during: ['Meetings to the slot sheet, privately', 'Breaks held — the informal meetings happen there', 'Leads recorded with consent'],
      after: ['Meeting and lead report to every exhibitor', 'Recordings published', 'Venue settled'],
    },
    checklist: ['Buyer meetings matched in advance', 'Meeting tables spaced for privacy', 'Delegate directory produced', 'Lead reporting arranged'],
  }),

  B('aviation-expo', 'Ground it', 'Aircraft on display, under permissions that are nobody’s but the authority’s.', {
    about: 'The hardest permissions in the catalogue. Aircraft movement, apron access, drone flight and security clearance all belong to the aerodrome and the authority — we plan around what they grant.',
    formats: ['outdoor', 'venue'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('display', 'What is being displayed?', 'many', { options: [['aircraft', 'Aircraft'], ['simulators', 'Simulators'], ['drones_av', 'Drones'], ['components_av', 'Components and MRO'], ['cabin', 'Cabin interiors'], ['training_av', 'Training and careers']] }),
      Q('airside', 'Is any part of this airside or on an apron?', 'one', {
        options: [['yes', 'Yes, with the aerodrome’s approval'], ['applying', 'We are applying'], ['no', 'No, entirely landside']],
        help: 'Airside access, aircraft movement and clearance are the aerodrome’s and the authority’s. We never treat them as granted.',
      }),
      Q('drone_flight', 'Are drones being flown?', 'yesno', {
        optional: true, help: 'Flight happens only under the operator’s own regulatory permissions, in a netted or cleared area.',
      }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, PHOTOS, GUARD, PARKING,
    ],
    plan: [
      S('security_services', 'recommended', 'Clear them', 'Accreditation, access control and the aerodrome’s rules'),
      S('event_equipment_rental', 'recommended', 'Build', 'Chalets, stands, viewing areas, barriers and the exhibition floor'),
      S('safety_facilities', 'recommended', 'Cover', 'First aid, fire cover coordination, washrooms and the clear-up'),
      S('power_cooling', 'conditional', 'Supply', 'Generators and distribution across an apron or an open site', { when: [some(WHEN_OUTSIDE[0], ans('airside', 'yes'))] }),
      S('guest_services', 'recommended', 'Accredit', 'Accreditation, badge issue and escorted access where required'),
      S('invitation_printing', 'recommended', 'Direct', 'Accreditation badges, a site plan, safety notices and signage'),
      S('sound_av', 'conditional', 'Carry', 'A PA across a large open site and sound for the conference sessions', { when: [some(WHEN_PA[0], WHEN_OUTSIDE[0])] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Chalets, shade and seating on an apron with none', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('catering_food', 'conditional', 'Host', 'Catering in the chalets and for visitors on a long day outdoors', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'Only in the areas the aerodrome permits photography', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and strike under escorted access and movement windows', { when: [some(WHEN_DAYS[0], ans('airside', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, chalet dressing and exhibitor presence', { when: WHEN_BRAND }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking well away from any operational area', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'An aerodrome or site whose operator will actually host this', { when: WHEN_FINDING }),
    ],
    addons: [
      X('airside_permissions', 'Get them first', 'Airside access, movement and clearance confirmed in writing', 'schedule', { experience: true, when: [ans('airside', 'yes', 'applying')] }),
      X('drone_permissions', 'Fly legally', 'Drone flight only under the operator’s own regulatory permissions', 'map', { experience: true, when: [ans('drone_flight', 'yes')] }),
      X('escorted_access', 'Escort them', 'Escorted movement for anyone without their own clearance', 'group', { trade: 'security_services', when: [ans('airside', 'yes')] }),
      X('movement_windows', 'Work to the slots', 'Build and strike inside the aerodrome’s own movement windows', 'move', { trade: 'end_to_end_event_logistics', when: [ans('airside', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Airside access, aircraft movement and drone flight are the aerodrome’s and the authority’s to permit. We never treat any of them as granted and never arrange a flight ourselves.' },
    timeline: {
      before: ['Airside access and movement windows confirmed in writing', 'Accreditation and security clearance process agreed with the aerodrome', 'Drone operator permissions collected where flights are planned'],
      during: ['Access controlled to the aerodrome’s own standard', 'All movement inside the permitted windows and escorted', 'Photography only where permitted'],
      after: ['Site cleared inside the agreed window', 'Accreditation reconciled and passes returned', 'Any incident reported to the aerodrome'],
    },
    checklist: ['Airside permissions in writing', 'Accreditation and clearance process', 'Drone operator permissions', 'Movement windows agreed'],
  }),

  B('pharmaceutical-conference', 'Evidence', 'A regulated industry, where what may be said is set by somebody else.', {
    about: 'Promotional claims, product display and interactions with clinicians are all regulated. We arrange the rooms and the access control; what is said and shown is the company’s responsibility under its own code.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS, ACCREDITED, CONFIDENTIAL,
      Q('audience_pharma', 'Who is attending?', 'many', { options: [['clinicians', 'Clinicians'], ['researchers', 'Researchers'], ['industry_ph', 'Industry'], ['regulators_ph', 'Regulators'], ['payers', 'Payers'], ['patients', 'Patient groups']] }),
      Q('elements_ph', 'What is on?', 'many', { options: [['scientific', 'Scientific sessions'], ['posters_ph', 'Posters'], ['exhibition_ph', 'A product exhibition'], ['satellite', 'Satellite symposia'], ['workshops_ph', 'Workshops'], ['regulatory_ph', 'Regulatory sessions']] }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, PHOTOS, GUARD, SEATS,
    ],
    plan: [
      S('guest_services', 'recommended', 'Verify', 'Registration verifying delegate type, access controlled by it'),
      S('sound_av', 'recommended', 'Present', 'Projection for scientific data, and recording only where permitted'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges by delegate type, the programme, abstracts and the code notice'),
      S('event_equipment_rental', 'conditional', 'Set', 'Session rooms, poster boards and exhibition stands with access zones', { when: [some(ans('elements_ph', 'posters_ph', 'exhibition_ph', 'satellite'), WHEN_EXPO[0])] }),
      S('security_services', 'conditional', 'Zone it', 'Access control, so product areas reach only permitted delegates', { when: [some(WHEN_GUARD[0], ans('elements_ph', 'exhibition_ph'), WHEN_SECRET[0])] }),
      S('catering_food', 'conditional', 'Host', 'Catering within whatever hospitality limits the code sets', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record some', 'Recording only where the presenters and the code permit', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Restrict', 'No patient-identifiable material and no unpublished data photographed', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating, poster space and accessible places', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Brand', 'Restrained backdrop and wayfinding, within the code', { when: WHEN_BRAND }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days, rooms and the exhibition', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Find', 'A venue whose rooms can be zoned by delegate type', { when: WHEN_FINDING }),
    ],
    addons: [
      X('delegate_verification', 'Check who they are', 'Delegate type verified at registration, and access zoned to it', 'poll', { trade: 'guest_services', when: [ans('audience_pharma', 'clinicians', 'payers')] }),
      X('code_compliance', 'Their code', 'Hospitality, materials and claims checked against the company’s own code', 'schedule', { experience: true }),
      X('no_patient_imagery', 'Protect patients', 'No patient-identifiable image used, displayed or photographed', 'heart', { experience: true }),
      X('attendance_register', 'Record for credits', 'The register exactly as the accrediting body specifies', 'invite', { trade: 'guest_services', when: WHEN_CREDITS }),
    ],
    toolkit: { polls: ['date'], note: 'Promotional claims, hospitality limits and product display are governed by the industry’s own code and the company’s compliance team. We arrange the rooms and the access control, and write no claim.' },
    timeline: {
      before: ['Delegate verification and access zoning agreed with compliance', 'Hospitality checked against the applicable code', 'Recording and photography policy agreed per session'],
      during: ['Access zoned by verified delegate type', 'No patient-identifiable or unpublished material photographed', 'Hospitality kept within the stated limits'],
      after: ['Attendance register sent to the accrediting body where credits apply', 'Recordings released only where permitted', 'Compliance record handed to the company'],
    },
    checklist: ['Delegate verification and zoning', 'Hospitality within the code', 'No patient-identifiable imagery', 'Recording policy agreed per session'],
  }),

  B('telecommunications-summit', 'Carry it', 'An industry whose demonstrations compete with the venue’s own spectrum.', {
    about: 'Live network demonstrations need spectrum coordination and a lot of power. In a hall full of radios, somebody has to decide who transmits on what.',
    formats: ['venue'],
    ask: [
      DELEGATES, PLACE, DAYS, SPEAKERS, TRACKS,
      Q('focus_telecom', 'What is the focus?', 'many', { options: [['networks', 'Network technology'], ['devices', 'Devices'], ['satellite', 'Satellite'], ['enterprise', 'Enterprise connectivity'], ['policy_tel', 'Policy and spectrum'], ['infrastructure_tel', 'Infrastructure']] }),
      Q('live_network', 'Are there live network demonstrations?', 'yesno', {
        help: 'Live transmission needs spectrum coordination and the operator’s own licences.',
      }),
      EXHIBITION, AV, NETWORK, REGISTER, HOSPITALITY, BRANDING, GUARD, PHOTOS, SPONSORS, SEATS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Heavy power, cooling and distribution for equipment-dense stands'),
      S('sound_av', 'recommended', 'Deliver', 'Stage production, screens and matched sound across the track rooms'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stands, demonstration areas, the stage and the breakout rooms', { when: [some(WHEN_EXPO[0], WHEN_STAGE[0], WHEN_MULTI[0])] }),
      S('guest_services', 'recommended', 'Register', 'Registration, badges and a technical help desk for exhibitors'),
      S('invitation_printing', 'recommended', 'Direct', 'Badges, the agenda, a floor plan and the spectrum coordination notice'),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and lunch that hold the agenda', { when: WHEN_FOOD }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'Sessions and the exhibition, for sponsors and the next edition', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for equipment-dense stands', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Session seating and meeting space on the floor', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence', { when: [some(WHEN_BRAND[0], WHEN_SPONSOR[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, show and load-out across the days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Secure', 'A hall with the electrical capacity and a workable spectrum position', { when: WHEN_FINDING }),
    ],
    addons: [
      X('spectrum_coordination', 'Share the air', 'Spectrum coordinated across exhibitors, with the operator’s own licences', 'schedule', { experience: true, when: [ans('live_network', 'yes')] }),
      X('power_survey', 'Size it', 'Electrical load surveyed per stand before the venue is signed', 'power_cooling', { trade: 'power_cooling', when: WHEN_HEAVY_NET }),
      X('demo_network', 'Keep it separate', 'A demonstration network isolated from the delegate wifi', 'media', { trade: 'power_cooling', when: [ans('live_network', 'yes')] }),
      X('exhibitor_manual', 'Instruct', 'Power limits, spectrum rules and move-in slots, issued in advance', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Live transmission runs under the operator’s own licences, with spectrum coordinated across the hall. We coordinate the arrangement and hold no licence ourselves.' },
    timeline: {
      before: ['Electrical load surveyed per stand before the venue is signed', 'Spectrum coordination agreed across exhibitors in writing', 'Demonstration network planned separately from delegate wifi'],
      during: ['Power monitored across a hall of equipment-dense stands', 'Spectrum conflicts resolved by the coordinator, not by exhibitors', 'Delegate wifi kept usable and separate'],
      after: ['Load-out to slots', 'Equipment reconciled', 'Exhibitor and sponsor report'],
    },
    checklist: ['Power surveyed per stand', 'Spectrum coordination agreed', 'Demonstration network isolated', 'Exhibitor manual issued'],
  }),

  B('mining-and-infrastructure-expo', 'Show the scale', 'The heaviest exhibits in the catalogue, on ground that has to take them.', {
    about: 'Machines measured in tonnes, moved by crane, displayed outdoors. Ground bearing, lifting plans and exclusion zones are the event; the conference programme is secondary.',
    formats: ['outdoor', 'venue'],
    ask: [
      DELEGATES, PLACE, DAYS,
      Q('sectors_mining', 'Which sectors?', 'many', { options: [['mining_eq', 'Mining equipment'], ['earthmoving', 'Earthmoving'], ['construction_eq', 'Construction'], ['safety_mining', 'Industrial safety'], ['services_mining', 'Services and technology'], ['materials_mining', 'Materials']] }),
      Q('heaviest', 'How heavy is the largest exhibit?', 'one', { options: [['light', 'Under 5 tonnes'], ['medium', 'Up to 20 tonnes'], ['heavy', 'Up to 60 tonnes'], ['very_heavy', 'Over 60 tonnes']] }),
      Q('live_demos_mining', 'Are machines being operated on site?', 'yesno', {
        help: 'Operating heavy machinery in public needs an exclusion zone, a banksman and the operator’s own safety plan.',
      }),
      EXHIBITION, AV, REGISTER, HOSPITALITY, BRANDING, SEATS, PHOTOS, GUARD, CHIEF_GUEST,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Prepare it', 'Hard standing, machine pads, barriers, platforms and stands'),
      S('safety_facilities', 'recommended', 'Make it safe', 'Exclusion zones, first aid, fire cover, washrooms and site clearance'),
      S('medium_large_goods_vehicle', 'recommended', 'Haul it', 'Transport and lifting for machines measured in tonnes'),
      S('power_cooling', 'conditional', 'Supply', 'Generators and distribution across a large open site', { when: [some(WHEN_OUTSIDE[0], WHEN_BIG_EXPO[0])] }),
      S('security_services', 'conditional', 'Control', 'Site access control and overnight cover for machinery', { when: [some(WHEN_GUARD[0], WHEN_DAYS[0])] }),
      S('guest_services', 'recommended', 'Receive', 'Visitor registration, safety briefing and site marshals'),
      S('invitation_printing', 'recommended', 'Signpost', 'Site plan, exhibit labels, safety notices and badges'),
      S('loading_unloading_crew', 'conditional', 'Crew it', 'A crew for move-in, positioning and move-out of heavy exhibits', { when: [some(WHEN_MACHINERY[0], ans('heaviest', 'heavy', 'very_heavy'))] }),
      S('sound_av', 'conditional', 'Carry', 'A PA across a large site and sound for the conference sessions', { when: [some(WHEN_PA[0], WHEN_OUTSIDE[0])] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Shade, seating, hospitality tents and a viewing area', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Catering on a site with nothing within walking distance', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Document', 'Machines and demonstrations, from outside the exclusion zone', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Build, move-in, show and move-out across the days', { when: WHEN_DAYS }),
      S('venue', 'conditional', 'Secure', 'A site with the bearing, access and space for sixty-tonne machines', { when: WHEN_FINDING }),
    ],
    addons: [
      X('ground_bearing', 'Check the ground', 'Ground bearing confirmed against the heaviest exhibit before booking', 'map', { experience: true }),
      X('lifting_plan', 'Plan the lift', 'A lifting plan and a banksman for every crane movement', 'move', { trade: 'loading_unloading_crew', when: [ans('heaviest', 'heavy', 'very_heavy')] }),
      X('exclusion_zone', 'Keep them out', 'An exclusion zone and a banksman for any machine being operated', 'security_services', { trade: 'safety_facilities', when: [ans('live_demos_mining', 'yes')] }),
      X('viewing_platform', 'Let them see', 'A raised viewing platform, so nobody walks into the demonstration area', 'event_equipment_rental', { trade: 'event_equipment_rental', when: [ans('live_demos_mining', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Ground bearing is confirmed before anything heavy is booked. Machines operated in public need an exclusion zone, a banksman and the operator’s own safety plan and insurance.' },
    timeline: {
      before: ['Ground bearing and access confirmed against the heaviest exhibit', 'Lifting plans and operator safety plans collected per machine', 'Exclusion zones and viewing platforms drawn on the site plan'],
      during: ['All machine movement under a banksman, outside visitor hours', 'Exclusion zones maintained during every demonstration', 'Visitors briefed on site safety before entry'],
      after: ['Move-out to slots with the crew and cranes booked', 'Site reinstated, including ground damage', 'Incident log completed'],
    },
    checklist: ['Ground bearing confirmed', 'Lifting plan and banksman per movement', 'Exclusion zones for live demonstrations', 'Visitor safety briefing at entry'],
  }),
]

export const INDUSTRY_BLUEPRINT = Object.fromEntries(INDUSTRY_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(INDUSTRY_BLUEPRINTS, 'industry')
