/**
 * Government, Community & Charity — one blueprint per occasion.
 *
 * Twenty-three occasions run by authorities, associations, NGOs and
 * neighbourhoods. Four rules shape every plan here, and they are the
 * reason several services in the brief are deliberately NOT sold as
 * services:
 *
 *   · We are not a medical provider. Blood collection, screening,
 *     vaccination, diagnosis and treatment are done only by qualified,
 *     authorised clinical staff that the organiser engages directly.
 *     We have no medical trade and will not present one. What we
 *     arrange is the room around them — beds, partitions, privacy,
 *     waste, water, power and crowd flow.
 *   · We are not a payment channel for anybody else's money. Donations
 *     go through the organisation's own authorised, auditable channel.
 *     We arrange the desk, the receipts and the board; we never take,
 *     hold or route a donation, and we never imply that Sambramo is a
 *     registered charity or a relief organisation.
 *   · Permissions and protocol belong to the authority. We never
 *     describe a gathering, a route or a premises as approved.
 *   · Nobody's community, faith, caste, language or circumstances are
 *     ever inferred — from a name, an area, or the subject of an event.
 *     Where a language matters, the organiser tells us which.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, CHIEF_GUEST, AWARDS, DIET_ONLY, ALLERGY_ONLY,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a civic occasion asks ─────────────────────────── */

const ORGANISER = Q('organiser', 'Who is organising it?', 'one', {
  options: [['authority', 'A government department or authority'], ['ngo', 'An NGO or trust'], ['association', 'A residents’ or community association'], ['committee', 'A citizens’ committee'], ['institution', 'An institution'], ['group', 'An informal group']],
})
const ATTENDEES = Q('attendees', 'How many people are expected?', 'select', {
  options: [['40', 'Up to 40'], ['200', 'Up to 200'], ['800', 'Up to 800'], ['3000', 'Up to 3000'], ['10000', 'More than 3000']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['premises', 'Official or institutional premises'], ['hall', 'A community hall'], ['ground', 'An open ground'], ['street', 'A street or public space'], ['venue', 'An event venue'], ['find', 'Please find somewhere']],
})

/** Never ours to grant, and never assumed. */
const PERMITS = Q('permits', 'Are the venue and authority permissions in place?', 'one', {
  options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this'], ['na', 'Not needed — private premises']],
  help: 'Permissions are the organiser’s. We never treat a public gathering as approved.',
})
const LANGUAGES = Q('languages', 'Which languages does this need to work in?', 'many', {
  optional: true,
  options: [['kannada', 'Kannada'], ['hindi', 'Hindi'], ['english', 'English'], ['tamil', 'Tamil'], ['telugu', 'Telugu'], ['urdu', 'Urdu'], ['other', 'Others']],
  help: 'You tell us. We never infer a language from an area or a name.',
})
const ACCESS_NEEDS = Q('accessibility', 'What should we arrange for access?', 'many', {
  optional: true,
  options: [['stepfree', 'Step-free routes'], ['seating', 'Seating for people who cannot stand'], ['signing', 'Sign-language interpretation'], ['quiet', 'A quiet space'], ['toilets', 'Accessible washrooms'], ['hearing', 'A hearing loop']],
})
const RECORD = Q('record', 'Is the proceeding being recorded or documented?', 'one', {
  optional: true, options: [['minutes', 'Written minutes'], ['audio', 'Audio'], ['video', 'Video'], ['both', 'Written and recorded'], ['no', 'Not recorded']],
})
const VOLUNTEERS = Q('volunteers', 'Are volunteers helping to run it?', 'yesno', { optional: true })
const AID = Q('first_aid', 'Do you need first aid on site?', 'yesno', { optional: true })
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['pa', 'A public-address system'], ['mics', 'Microphones'], ['screen', 'A screen or projector'], ['stage', 'A stage or podium'], ['lights', 'Lighting'], ['stream', 'Streaming or hybrid']],
})
const FOOD = Q('food', 'Refreshments', 'one', {
  optional: true, options: [['meal', 'A meal'], ['snacks', 'Snacks and tea'], ['water', 'Drinking water only'], ['stalls', 'Food stalls'], ['none', 'Nothing needed']],
})
const SIGNAGE = Q('signage', 'Do you need signage and printed material?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need security or crowd stewarding?', 'yesno', { optional: true })
const SEATS = Q('seating', 'Do you need seating brought in?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const TRANSPORT = Q('transport', 'Do participants need transport?', 'yesno', { optional: true })
const PARKING = Q('parking', 'Do you need parking managed?', 'yesno', { optional: true })
const REGISTER = Q('registration', 'Is there a registration or attendance desk?', 'yesno', { optional: true })

/** Money that is not ours, going somewhere that is not us. */
const DONATIONS = Q('donations', 'How are donations collected?', 'one', {
  options: [['own', 'Through the organisation’s own channel'], ['desk', 'At a staffed desk, into the organisation’s account'], ['online', 'Online, by the organisation'], ['pledges', 'Pledges, collected afterwards'], ['none', 'No donations taken']],
  help: 'Always the organisation’s own authorised channel. Sambramo never takes, holds or routes a donation.',
})

/** Clinical work is never ours. */
const MEDICAL_PARTNER = Q('medical_partner', 'Which authorised medical institution is running the clinical side?', 'one', {
  options: [['confirmed', 'Confirmed, with their requirements in hand'], ['identified', 'Identified, not yet confirmed'], ['no', 'Not yet']],
  help: 'A licensed blood bank, hospital or qualified provider. Sambramo provides no clinical staff and makes no medical decision.',
})

const WHEN_PA = [ans('av', 'pa', 'mics')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_SCREEN = [ans('av', 'screen')]
const WHEN_STREAM = [ans('av', 'stream')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_AV = [has('av')]
const WHEN_FOOD = [ans('food', 'meal', 'snacks', 'stalls')]
const WHEN_WATER = [ans('food', 'meal', 'snacks', 'water', 'stalls')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_RIDE = [ans('transport', 'yes')]
const WHEN_PARK = [ans('parking', 'yes')]
const WHEN_AID = [ans('first_aid', 'yes')]
const WHEN_REG = [ans('registration', 'yes')]
const WHEN_VOLS = [ans('volunteers', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'ground', 'street')]
const WHEN_OUTSIDE = [ans('place', 'ground', 'street')]
const WHEN_BIG = [ans('attendees', '800', '3000', '10000')]
const WHEN_HUGE = [ans('attendees', '3000', '10000')]
const WHEN_LANG = [has('languages')]
const WHEN_ACCESS = [has('accessibility')]
const WHEN_PERMIT_HELP = [ans('permits', 'no', 'help')]
const WHEN_DESK_MONEY = [ans('donations', 'desk', 'own', 'online', 'pledges')]
const WHEN_RECORDED = [ans('record', 'audio', 'video', 'both')]

export const COMMUNITY_BLUEPRINTS = [

  B('government-inauguration', 'Open it', 'A public project handed over, with protocol that belongs to the office.', {
    about: 'The order of proceedings, the seating of dignitaries and the permissions are the department’s. We arrange the premises, the stage, the sound and the crowd around a protocol we follow rather than write.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('dignitaries', 'How many dignitaries are attending?', 'select', { options: [['0', 'None'], ['2', 'One or two'], ['6', 'Up to six'], ['20', 'More than six']] }),
      Q('elements', 'What happens?', 'many', { options: [['ribbon', 'A ribbon or plaque'], ['ceremony', 'A traditional arrangement, if requested'], ['speeches', 'Speeches'], ['tour', 'A tour of the facility'], ['press', 'Press'], ['cultural', 'Cultural performances']] }),
      LANGUAGES, AV, SEATS, PHOTOS, FOOD, SIGNAGE, GUARD, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Stage it', 'Dais, podium, protocol seating and the ribbon or plaque setting'),
      S('sound_av', 'recommended', 'Carry', 'A public-address system, dais mics and a record of the speeches'),
      S('decoration_floral', 'recommended', 'Dress', 'Entrance, dais and premises, to the department’s own branding rules'),
      S('guest_services', 'recommended', 'Receive', 'Dignitary reception, protocol seating and attendee registration'),
      S('photography', 'conditional', 'Record', 'The unveiling and the dais, for the official record', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The proceedings filmed, and streamed where that is wanted', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating, shade and a separate dignitary enclosure', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('anchor_mc', 'conditional', 'Conduct', 'An anchor who can run an official order of proceedings exactly', { when: [ans('elements', 'speeches', 'ribbon', 'cultural')] }),
      S('security_services', 'conditional', 'Control', 'Access control and crowd management at an official event', { when: [some(WHEN_GUARD[0], ans('dignitaries', '6', '20'), WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Print', 'Invitations, the order of proceedings, the plaque and signage', { when: [some(WHEN_SIGNED[0], ans('elements', 'ribbon'))] }),
      S('live_entertainment', 'conditional', 'Perform', 'Cultural performances, where the department has asked for them', { when: [ans('elements', 'cultural')] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments for guests and the press', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'A generator, because a new facility rarely has usable power yet', { when: [some(WHEN_OUTSIDE[0], WHEN_PA[0])] }),
      S('valet_parking', 'conditional', 'Park', 'Parking and a separate route for official vehicles', { when: WHEN_PARK }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water and the premises cleared afterwards', { when: [some(WHEN_BIG[0], WHEN_OUTSIDE[0])] }),
      S('venue', 'conditional', 'Find', 'A premises or ground for the function', { when: WHEN_FINDING }),
    ],
    addons: [
      X('protocol_sheet', 'Follow it', 'The department’s own order of proceedings, followed exactly, not rewritten', 'schedule', { experience: true }),
      X('interpretation', 'Be understood', 'Interpretation into the languages the audience actually uses', 'phone', { trade: 'sound_av', when: WHEN_LANG }),
      X('press_desk', 'Brief', 'A press desk with the department’s own release and photographs', 'invite', { trade: 'guest_services', when: [ans('elements', 'press')] }),
      X('permission_pack', 'Clear it', 'Venue, sound and crowd permissions confirmed in writing', 'map', { experience: true, when: WHEN_PERMIT_HELP }),
    ],
    toolkit: { polls: false, note: 'Protocol, permissions and the order of proceedings belong to the department. We follow them and never describe a gathering as approved.' },
    timeline: {
      before: ['Order of proceedings received from the department and followed exactly', 'Permissions confirmed in writing before anything is booked', 'Protocol seating plan agreed and checked'],
      during: ['Dignitary reception and seating to the protocol', 'Proceedings to the published order, not to the room', 'Press given the department’s own material'],
      after: ['Official record handed to the department', 'Premises cleared and reinstated', 'Plaque or signage left correct'],
    },
    checklist: ['Order of proceedings received', 'Permissions in writing', 'Protocol seating agreed', 'Official record arrangement confirmed'],
  }),

  B('public-consultation', 'Hear them', 'A room where the public speaks and the record has to be accurate.', {
    about: 'Not a presentation with questions at the end. People came to be heard, so the microphones in the room, the languages, the access and the minutes matter more than the stage.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('subject', 'What is being consulted on?', 'text', { max: 120 }),
      Q('format', 'How is it run?', 'one', { options: [['openfloor', 'Open floor'], ['panel', 'A panel taking questions'], ['tables', 'Table discussions'], ['written', 'Presentation then written submissions'], ['hybrid', 'In person and online']] }),
      LANGUAGES, ACCESS_NEEDS, RECORD, AV, SEATS, CLEAN, GUARD, PHOTOS, FOOD, REGISTER,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry all', 'Roving mics for the floor, not only a mic on the panel'),
      S('guest_services', 'recommended', 'Register', 'Attendance, speaking slips and someone managing the queue to speak'),
      S('invitation_printing', 'recommended', 'Inform', 'Notices, the consultation paper, speaking slips and submission forms'),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Podium, panel table, discussion tables and the room layout', { when: [some(WHEN_STAGE[0], ans('format', 'tables', 'panel'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for everyone, with accessible places kept near the front', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('anchor_mc', 'conditional', 'Moderate', 'A moderator who gives the floor fairly and keeps to time', { when: [ans('format', 'openfloor', 'panel', 'hybrid')] }),
      S('videography', 'conditional', 'Record', 'An audio or video record, and the stream for a hybrid session', { when: [some(WHEN_RECORDED[0], ans('format', 'hybrid'), WHEN_STREAM[0])] }),
      S('photography', 'conditional', 'Document', 'A record of the meeting, where photography is permitted', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Provide', 'Water, and tea for a long evening session', { when: WHEN_WATER }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, accessible facilities and the room reset', { when: [some(WHEN_ACCESS[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('security_services', 'conditional', 'Keep order', 'Stewarding where a subject is contested and the room may be full', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'An accessible hall people can reach by public transport', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_mics', 'Let them speak', 'Enough roving mics that nobody has to shout from the back', 'sound_av', { trade: 'sound_av' }),
      X('interpretation', 'Be understood', 'Interpretation into the languages the community actually uses', 'phone', { trade: 'sound_av', when: WHEN_LANG }),
      X('written_submissions', 'Take it in writing', 'Forms for people who will not speak in a room, collected and counted', 'invite', { trade: 'invitation_printing' }),
      X('minutes_record', 'Record it properly', 'Minutes taken by someone whose only job that is, published after', 'album', { experience: true, when: WHEN_RECORDED }),
    ],
    toolkit: { polls: ['date'], note: 'People came to be heard. Roving mics, interpretation and written submissions stay on the plan — a consultation only one kind of person can take part in is not one.' },
    timeline: {
      before: ['Notice published in the languages the community reads', 'Venue checked for step-free access and public transport', 'Speaking and submission process agreed and published'],
      during: ['Roving mics on the floor from the start', 'Speaking slips taken in order, fairly', 'Written submissions collected from anyone who prefers them'],
      after: ['Minutes published, including the points raised', 'Submissions counted and acknowledged', 'Room reset'],
    },
    checklist: ['Notice in the right languages', 'Step-free accessible venue', 'Roving mics for the floor', 'Written submission route'],
  }),

  B('civic-awareness-campaign', 'Reach them', 'A message aimed at people who did not set out to hear it.', {
    about: 'The audience is whoever is passing, so stopping them is the design problem and the follow-up is the measure. A leaflet handed out is not reach.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('subject', 'What is the campaign about?', 'text', { max: 120 }),
      Q('methods', 'How is the message carried?', 'many', { options: [['booths', 'Information booths'], ['street_theatre', 'Street theatre'], ['demos', 'Demonstrations'], ['screening', 'Public screening'], ['vehicle', 'A mobile awareness vehicle'], ['speakers', 'Speakers']] }),
      LANGUAGES, VOLUNTEERS, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set up', 'Booths, display boards, a demonstration area and the canopies'),
      S('invitation_printing', 'recommended', 'Say it', 'Banners, leaflets and boards in the languages people actually read'),
      S('guest_services', 'conditional', 'Engage', 'People who start conversations rather than hand out paper', { when: [some(WHEN_VOLS[0], ans('methods', 'booths', 'demos'))] }),
      S('sound_av', 'conditional', 'Carry', 'A public-address system, and a screen where there is a screening', { when: [some(WHEN_PA[0], WHEN_SCREEN[0], ans('methods', 'screening', 'speakers'))] }),
      S('live_entertainment', 'conditional', 'Stop them', 'Street theatre, which stops a passer-by better than a banner does', { when: [ans('methods', 'street_theatre')] }),
      S('anchor_mc', 'conditional', 'Present', 'A presenter who can hold a street-corner crowd', { when: [ans('methods', 'speakers', 'demos')] }),
      S('photography', 'conditional', 'Record', 'The campaign, with consent from anyone identifiable', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Be visible', 'A presence strong enough to be noticed from across the road', { when: WHEN_SIGNED }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, shade and somewhere for a conversation to sit down', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for sound and screens, which a street does not have', { when: [some(WHEN_OUTSIDE[0], ans('methods', 'screening'))] }),
      S('catering_food', 'conditional', 'Sustain', 'Water and food for volunteers on a long day', { when: WHEN_WATER }),
      S('transportation', 'conditional', 'Move', 'A mobile awareness vehicle and its route', { when: [ans('methods', 'vehicle')] }),
      S('safety_facilities', 'conditional', 'Clear', 'Waste, washrooms and the space left as found', { when: [some(WHEN_CLEAN[0], WHEN_OUTSIDE[0])] }),
      S('venue', 'conditional', 'Place it', 'Somewhere people already pass, not somewhere they must seek out', { when: WHEN_FINDING }),
    ],
    addons: [
      X('language_versions', 'Translate', 'Every piece of material in the languages the area actually reads', 'invite', { trade: 'invitation_printing', when: WHEN_LANG }),
      X('follow_up_route', 'Give a next step', 'A number, a desk or a date — not just a leaflet', 'phone', { experience: true }),
      X('volunteer_brief', 'Prepare them', 'Volunteers briefed on what to say and, more importantly, what not to', 'group', { experience: true, when: WHEN_VOLS }),
      X('consent_policy', 'Ask first', 'Written consent before photographing anyone identifiable', 'camera', { experience: true, unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'We never infer anyone’s community, faith or circumstances from the area a campaign is held in. Nobody identifiable is photographed without consent.' },
    timeline: {
      before: ['Material written and translated into the languages the area reads', 'Site chosen where people already pass', 'Volunteers briefed, and a follow-up route set up that will actually answer'],
      during: ['Volunteers engaging rather than distributing', 'Follow-up route explained to everyone who stops', 'Consent taken before any identifiable photograph'],
      after: ['Follow-up honoured — the number answered, the desk staffed', 'Surplus material stored rather than binned', 'Site cleared'],
    },
    checklist: ['Material in the right languages', 'Site where people already pass', 'Volunteers briefed', 'Follow-up route that works'],
  }),

  B('community-gathering', 'Come together', 'A neighbourhood in one room, for no reason except being one.', {
    about: 'The simplest occasion in this category and the one most easily over-produced. Seating, food and a working microphone do almost all of it.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('purpose', 'What is it for?', 'one', { options: [['social', 'Just a get-together'], ['welcome', 'Welcoming new residents'], ['festival_local', 'A local occasion'], ['announcement', 'An announcement'], ['fundraising_local', 'Raising something locally'], ['other', 'Something else']] }),
      Q('ages', 'Who is coming?', 'many', { options: [['children', 'Children'], ['adults', 'Adults'], ['elders', 'Older residents'], ['families', 'Families']] }),
      Q('programme', 'What is planned?', 'many', { optional: true, options: [['performances', 'Performances'], ['games', 'Games'], ['kids_zone', 'A children’s corner'], ['speeches_local', 'A few words'], ['music', 'Music']] }),
      ACCESS_NEEDS, AV, SEATS, REGISTER, SIGNAGE, PHOTOS, FOOD, GUARD, CLEAN,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'Seat them', 'Chairs for everyone, with comfortable seating for older residents'),
      S('catering_food', 'recommended', 'Feed', 'Food for the whole neighbourhood, counted generously', { unless: [ans('food', 'none')] }),
      S('sound_av', 'conditional', 'Carry', 'A mic and a speaker — a community hall has no acoustics', { when: [some(WHEN_PA[0], ans('programme', 'speeches_local', 'music', 'performances'))] }),
      S('decoration_floral', 'conditional', 'Lift it', 'Enough to make the hall feel like an occasion, and no more', { when: [some(WHEN_SIGNED[0], ans('purpose', 'festival_local', 'welcome'))] }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to hold the room and keep the speeches short', { when: [ans('programme', 'speeches_local', 'performances', 'games')] }),
      S('live_entertainment', 'conditional', 'Entertain', 'Performances or music, from the community where possible', { when: [ans('programme', 'performances', 'music')] }),
      S('photography', 'conditional', 'Record', 'A few photographs for the association’s own record', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Welcome', 'A desk at the door and someone looking after older residents', { when: [some(WHEN_REG[0], ans('ages', 'elders'))] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A small stage, and a children’s corner if there is one', { when: [some(WHEN_STAGE[0], ans('programme', 'kids_zone', 'games'))] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water and the hall cleared afterwards', { when: [some(WHEN_CLEAN[0], WHEN_ACCESS[0])] }),
      S('security_services', 'conditional', 'Steward', 'Someone at the gate for a large open gathering', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A hall the neighbourhood can walk to', { when: WHEN_FINDING }),
    ],
    addons: [
      X('elder_seating', 'Look after them', 'Comfortable seating and shade set aside for older residents', 'chair', { trade: 'tent_furniture', when: [ans('ages', 'elders')] }),
      X('kids_corner', 'Occupy them', 'A supervised corner, so the adults can actually talk', 'group', { trade: 'guest_services', when: [ans('ages', 'children', 'families')] }),
      X('community_cooks', 'Cook together', 'Food cooked by the community itself, if that is how they want it', 'chef', { experience: true, when: WHEN_FOOD }),
      X('notice_round', 'Tell everyone', 'Notices to every household, not just the association’s group chat', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Invite every household, not just the people already on a list. Anything religious or cultural is the community’s own choice and never assumed.' },
    timeline: {
      before: ['Notice to every household, in the languages the street reads', 'Numbers confirmed so the food is counted, not estimated', 'Seating planned with older residents in mind'],
      during: ['Everyone greeted at the door', 'Short words, then leave people to it', 'Food served so nobody queues for long'],
      after: ['Hall cleared', 'Photographs shared with the association', 'Next date agreed while people are still there'],
    },
    checklist: ['Notice to every household', 'Food counted from replies', 'Seating for older residents', 'Hall booked for clearing afterwards'],
  }),

  B('community-cultural-day', 'Show us', 'Several communities sharing a stage, each on their own terms.', {
    about: 'The programme belongs to the communities performing. We arrange the stage, the sound, the green rooms and the stalls — never what is performed, in what order, or what it means.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('groups', 'How many communities or groups are taking part?', 'select', { options: [['3', 'Up to 3'], ['8', 'Up to 8'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      Q('forms', 'What is being presented?', 'many', { options: [['dance', 'Dance'], ['music_form', 'Music'], ['theatre', 'Theatre'], ['food_form', 'Food'], ['crafts', 'Crafts'], ['dress', 'Dress and textiles']] }),
      Q('curation', 'Who decides the programme?', 'one', {
        options: [['communities', 'The communities themselves'], ['committee', 'A mixed committee'], ['organiser_sets', 'The organiser'], ['open', 'Open submissions']],
        help: 'Who decides is the most important choice here. We never advise on what a community should present.',
      }),
      Q('costumes', 'Do groups need green rooms and costume space?', 'yesno'),
      LANGUAGES, AV, SEATS, AWARDS, GUARD, SIGNAGE, PHOTOS, FOOD, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Serve them', 'Sound set up per group, with their own needs taken separately'),
      S('event_lighting', 'recommended', 'Light evenly', 'Warm, even stage light that suits every group the same'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, wings, craft tables and the exhibition booths', { when: [some(WHEN_STAGE[0], ans('forms', 'crafts', 'dress'))] }),
      S('tent_furniture', 'conditional', 'House', 'A green room per group, and audience seating out front', { when: [some(ans('costumes', 'yes'), WHEN_SEATS[0])] }),
      S('anchor_mc', 'recommended', 'Introduce', 'A host who names each form and each language as the group states it'),
      S('catering_food', 'conditional', 'Share', 'Food stalls run by the communities themselves, where they want to', { when: [some(ans('forms', 'food_form'), WHEN_FOOD[0])] }),
      S('photography', 'conditional', 'Record', 'Each group, with their agreement about how images are used', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Archive', 'A record given back to each community, not kept from them', { when: WHEN_FILM }),
      S('invitation_printing', 'conditional', 'Credit', 'A programme naming every performer, form and community', { when: [some(WHEN_SIGNED[0], WHEN_PRINTED[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Stage makeup and hair in the green rooms, between items', { when: [ans('forms', 'dance', 'theatre')] }),
      S('guest_services', 'conditional', 'Liaise', 'A named liaison per group, from their call time', { when: [ans('groups', '8', '20', '40')] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water and the ground cleared afterwards', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding for an open public gathering', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power for the stage, the stalls and the lighting', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Find', 'A ground or hall with a stage and room for stalls', { when: WHEN_FINDING }),
    ],
    addons: [
      X('community_liaison', 'Ask them', 'A named liaison per group, consulted on what they actually need', 'group', { experience: true }),
      X('order_fairness', 'Order it openly', 'A running order agreed openly, not set by who asked first', 'schedule', { experience: true }),
      X('archive_copy', 'Give it back', 'The recording and photographs given to each community', 'album', { trade: 'videography' }),
      X('green_rooms', 'Prepare properly', 'A space per group rather than one shared room', 'bed', { trade: 'tent_furniture', when: [ans('costumes', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Each community decides what it presents and how. We never advise on content, sequence or meaning, and we never describe a tradition on a community’s behalf.' },
    timeline: {
      before: ['Each group consulted separately on what they need', 'Running order agreed openly with everyone', 'Programme credits checked with each group for spelling and naming'],
      during: ['A liaison with each group from their call time', 'Host introducing each form as the group described it', 'Green rooms kept separate'],
      after: ['Recordings and photographs given to each community', 'Every group settled on the same terms', 'Ground cleared'],
    },
    checklist: ['Each group consulted separately', 'Running order agreed openly', 'Credits checked with groups', 'A green room per group'],
  }),

  B('ngo-fundraiser', 'Raise it', 'An evening measured only by what reaches the cause.', {
    about: 'Every rupee spent on the room is a rupee not raised. The donation channel is the organisation’s own, always — we arrange the desk and the board, never the money.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('cause', 'What is being raised for?', 'text', { max: 120 }),
      Q('target', 'Is there a target?', 'text', { optional: true, max: 40 }),
      DONATIONS,
      Q('programme', 'What is in the evening?', 'many', { options: [['impact', 'An impact presentation'], ['beneficiary', 'A beneficiary speaking'], ['film', 'An impact film'], ['performance', 'Performances'], ['auction_seg', 'An auction segment'], ['dinner', 'Dinner']] }),
      AV, SEATS, CLEAN, PHOTOS, FOOD, SIGNAGE, VOLUNTEERS, REGISTER,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Make the ask', 'A host who can ask for money without embarrassing the room'),
      S('sound_av', 'recommended', 'Carry it', 'Sound for the ask, and a screen showing the total as it rises'),
      S('guest_services', 'recommended', 'Receive', 'Donor registration, and a desk at the organisation’s own channel'),
      S('invitation_printing', 'conditional', 'Document', 'Invitations, impact material, pledge forms and the donation board', { when: [some(WHEN_SIGNED[0], WHEN_DESK_MONEY[0])] }),
      S('videography', 'conditional', 'Move them', 'An impact film, which raises more than any speech', { when: [some(ans('programme', 'film'), WHEN_FILM[0])] }),
      S('catering_food', 'conditional', 'Host', 'Food costed honestly against what the evening will raise', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Show the cause', 'The cause visible everywhere, the decoration kept modest', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'The evening, with written consent from any beneficiary', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Warm the room', 'Performances placed before the ask, not after it', { when: [ans('programme', 'performance')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating or round tables for the dinner', { when: [some(WHEN_SEATS[0], ans('programme', 'dinner'))] }),
      S('event_lighting', 'conditional', 'Light', 'Enough to make the room feel worth attending, no more', { when: WHEN_LIT }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, screen and the auction or donation display', { when: [some(WHEN_STAGE[0], ans('programme', 'auction_seg'))] }),
      S('safety_facilities', 'conditional', 'Clear', 'Washrooms and the venue cleared afterwards', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A venue that fits the cause — extravagance costs you donations', { when: WHEN_FINDING }),
    ],
    addons: [
      X('cause_film', 'Show it', 'A short film about the cause, played immediately before the ask', 'film', { trade: 'videography' }),
      X('donation_board', 'Show the total', 'A board showing the total rising through the evening', 'poll', { trade: 'invitation_printing', when: WHEN_DESK_MONEY }),
      X('cost_to_raise', 'Justify it', 'Every line checked against the target before it is committed', 'budget', { experience: true }),
      X('beneficiary_consent', 'Protect them', 'Written consent from anyone whose story is told or filmed', 'heart', { experience: true, when: [ans('programme', 'beneficiary')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Donations go through the organisation’s own authorised channel. Sambramo never takes, holds or routes a donation, and no beneficiary’s story is used without written consent.' },
    timeline: {
      before: ['Target set, and every cost checked against it before committing', 'The organisation’s own donation channel set up and tested', 'Beneficiary consent obtained in writing for any story or film'],
      during: ['Film, then the ask, while the room is warm', 'Donations taken only through the organisation’s channel', 'Total shown rising, publicly'],
      after: ['Pledges followed up within the month, not left to lapse', 'Total announced with the cost-to-raise stated honestly', 'Donors thanked by the organisation'],
    },
    checklist: ['Costs checked against the target', 'Organisation’s own donation channel ready', 'Beneficiary consent in writing', 'Pledge follow-up planned'],
  }),

  B('charity-auction', 'Bid', 'Lots, bidders and a record that has to stand up afterwards.', {
    about: 'The lots belong to donors, the money belongs to the cause, and the paperwork is what connects them. Bidder registration, lot custody and settlement are the plan.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('cause', 'What is being raised for?', 'text', { max: 120 }),
      Q('auction_format', 'What kind of auction?', 'one', { options: [['live', 'A live auction'], ['silent', 'A silent auction'], ['both_auc', 'Both'], ['online_auc', 'Online bidding alongside']] }),
      Q('lots', 'How many lots?', 'select', { options: [['10', 'Up to 10'], ['30', 'Up to 30'], ['80', 'Up to 80'], ['200', 'More than 80']] }),
      Q('lot_value', 'How valuable are the lots?', 'one', { options: [['low', 'Modest'], ['mixed', 'Mixed'], ['high', 'High value'], ['experiences', 'Mostly experiences, not objects']] }),
      DONATIONS, AV, SEATS, CLEAN, GUARD, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Run the room', 'An auctioneer who can actually run an auction, not a compère'),
      S('guest_services', 'recommended', 'Register', 'Bidders registered with the organisation’s payment details, first'),
      S('event_equipment_rental', 'recommended', 'Display', 'Lot display tables, cases, bid paddles and the silent-auction setup'),
      S('invitation_printing', 'recommended', 'Catalogue', 'A lot catalogue, bid sheets, paddles and settlement slips'),
      S('sound_av', 'conditional', 'Carry', 'Sound for the auctioneer and a screen showing the lot and the bid', { when: [some(WHEN_PA[0], WHEN_SCREEN[0])] }),
      S('security_services', 'conditional', 'Keep the lots', 'Custody of the lots, before, during and until they are collected', { when: [some(WHEN_GUARD[0], ans('lot_value', 'high', 'mixed'))] }),
      S('event_lighting', 'conditional', 'Light the lots', 'Light on the display, which is most of what makes a lot sell', { when: [some(WHEN_LIT[0], ans('lot_value', 'high'))] }),
      S('catering_food', 'conditional', 'Host', 'Dinner or a reception around the auction, not through it', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'Lots and the room, and each lot photographed for the catalogue', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating with sightlines to the auctioneer and the display', { when: WHEN_SEATS }),
      S('decoration_floral', 'conditional', 'Dress', 'A room that justifies the paddles, without costing the cause', { when: WHEN_SIGNED }),
      S('safety_facilities', 'conditional', 'Clear', 'Venue cleared and lots accounted for afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room with display space and somewhere secure for the lots', { when: WHEN_FINDING }),
    ],
    addons: [
      X('bidder_registration', 'Register first', 'Bidders registered with payment details before the first lot', 'budget', { trade: 'guest_services' }),
      X('lot_custody', 'Account for them', 'Lots counted in, logged, and released only against settlement', 'poll', { experience: true }),
      X('lot_catalogue', 'Describe them', 'A catalogue with the donor, the description and any conditions', 'album', { trade: 'invitation_printing' }),
      X('settlement_desk', 'Settle it', 'A desk where winners pay the organisation and collect, with receipts', 'invite', { trade: 'guest_services', when: WHEN_DESK_MONEY }),
    ],
    toolkit: { polls: ['date'], note: 'Payment goes to the organisation, never through us. Lots are counted in and released only against settlement, and every lot’s donor is named in the catalogue.' },
    timeline: {
      before: ['Lots collected, photographed, logged and catalogued with donor names', 'Bidder registration opened with the organisation’s payment details', 'Reserve prices and conditions agreed with each donor'],
      during: ['Bidders registered before the first lot', 'Lots kept in custody until settled', 'Bids recorded on paper as well as on screen'],
      after: ['Settlement at the desk, lots released against receipt', 'Unsold lots returned to donors', 'Total reported to the organisation and the donors'],
    },
    checklist: ['Lots logged and catalogued with donors', 'Bidders registered with payment details', 'Lot custody arrangement', 'Settlement and release process'],
  }),

  B('blood-donation-camp', 'Give blood', 'A clinical session in a borrowed room, run by people we do not provide.', {
    about: 'Everything clinical — screening, eligibility, collection, storage, adverse reactions — belongs to the licensed blood bank or hospital the organiser engages. We provide no medical staff and make no medical decision. What we arrange is the room around them.',
    formats: ['venue'],
    ask: [
      ORGANISER, PLACE, MEDICAL_PARTNER,
      Q('donors', 'How many donors are expected?', 'select', { options: [['30', 'Up to 30'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      Q('hours', 'How long is the camp open?', 'select', { options: [['4', 'Half a day'], ['8', 'A full day'], ['2days', 'Two days']] }),
      Q('provides', 'What is the medical partner bringing?', 'many', {
        options: [['beds', 'Beds and couches'], ['equipment', 'Collection equipment'], ['staff', 'Clinical staff'], ['storage', 'Cold storage and transport'], ['waste', 'Medical waste handling'], ['all', 'Everything clinical']],
        help: 'Whatever they do not bring, we arrange only the non-clinical part of — never the clinical.',
      }),
      Q('registration_mode', 'How do donors register?', 'one', { options: [['advance', 'In advance'], ['onday', 'On the day'], ['both_reg', 'Both']] }),
      ACCESS_NEEDS, VOLUNTEERS, SEATS, GUARD, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'essential', 'Lay it out', 'Screening desks, couches, partitions and a separate recovery area'),
      S('safety_facilities', 'essential', 'Keep it clean', 'Handwashing, washrooms, cleaning and waste holding for them'),
      S('guest_services', 'recommended', 'Queue it', 'Registration, token queue, and nobody waiting standing up'),
      S('catering_food', 'recommended', 'Feed after', 'Water, juice and food in the recovery area, which is not optional'),
      S('invitation_printing', 'conditional', 'Signpost', 'Registration forms, donor information, route signage and certificates', { when: [some(WHEN_SIGNED[0], ans('registration_mode', 'advance', 'both_reg'))] }),
      S('power_cooling', 'conditional', 'Power', 'Reliable power and cooling for equipment and for a full room', { when: [some(ans('provides', 'equipment', 'storage'), ans('donors', '200', '500'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Waiting seating, recovery chairs and privacy screening', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0], ans('donors', '200', '500'))] }),
      S('photography', 'conditional', 'Record', 'The camp, never a donor, and never anything clinical', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Order', 'Queue and access control for a busy camp', { when: [some(WHEN_GUARD[0], ans('donors', '200', '500'))] }),
      S('venue', 'conditional', 'Find', 'A clean, lit, ventilated room with water and a separate recovery space', { when: WHEN_FINDING }),
    ],
    addons: [
      X('partner_requirements', 'Meet their list', 'The blood bank’s own site requirements, obtained and met line by line', 'schedule', { experience: true }),
      X('privacy_screens', 'Screen it', 'Partitions so screening and collection are not done in public view', 'bed', { trade: 'event_equipment_rental' }),
      X('recovery_area', 'Rest them', 'A separate recovery area with couches, juice and someone watching', 'spa', { trade: 'catering_food' }),
      X('donor_certificates', 'Thank them', 'Certificates issued by the medical partner, printed by us', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Sambramo provides no clinical staff, takes no medical decision and handles no blood or medical waste. Screening, eligibility, collection, storage and any adverse reaction are the licensed medical partner’s, entirely. We arrange the room, the queue, the privacy and the recovery.' },
    timeline: {
      before: ['Licensed blood bank or hospital confirmed in writing, with their site requirements', 'Room checked for cleanliness, light, ventilation, water and power', 'Privacy screening and a separate recovery area planned'],
      during: ['Clinical area run entirely by the medical partner', 'Queue managed so nobody waits standing', 'Every donor rested, watched and fed in recovery before leaving'],
      after: ['Medical waste removed by the partner, to their process', 'Room cleaned and handed back', 'Certificates issued by the partner'],
    },
    checklist: ['Licensed medical partner confirmed in writing', 'Their site requirements obtained and met', 'Privacy screening and recovery area', 'Refreshments for every donor after'],
  }),

  B('volunteer-appreciation-event', 'Say thank you', 'An evening for people who were never paid for any of it.', {
    about: 'The only measure is whether volunteers felt named. A generic thank-you to a room reads as less than nothing to someone who gave two years of Saturdays.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('volunteer_count', 'How many volunteers are being thanked?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['250', 'Up to 250'], ['600', 'More than 250']] }),
      Q('recognition', 'How are they recognised?', 'many', { options: [['certificates', 'Certificates'], ['awards_vol', 'Awards by category'], ['long_service', 'Long-service recognition'], ['stories', 'Volunteer stories'], ['video', 'A recognition film'], ['gifts_vol', 'A gift each']] }),
      CHIEF_GUEST, AWARDS, AV, SEATS, CLEAN, PHOTOS, FOOD, SIGNAGE, REGISTER,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Name them', 'A host who gets every volunteer’s name right, which is the whole point'),
      S('catering_food', 'conditional', 'Feed them', 'A proper meal — people who gave their time should not get a biscuit', { when: WHEN_FOOD }),
      S('invitation_printing', 'conditional', 'Certify', 'Certificates and citations, every name checked against records', { when: [some(ans('recognition', 'certificates', 'long_service'), WHEN_PRINTED[0])] }),
      S('gifts_favours', 'conditional', 'Mark it', 'Awards and a gift for each volunteer, the same for everyone', { when: [some(WHEN_TROPHY[0], ans('recognition', 'awards_vol', 'gifts_vol'))] }),
      S('sound_av', 'conditional', 'Carry', 'Mics and a screen for the stories and the film', { when: [some(WHEN_PA[0], WHEN_SCREEN[0], ans('recognition', 'stories', 'video'))] }),
      S('decoration_floral', 'conditional', 'Dress', 'A room that feels like an occasion rather than a committee meeting', { when: WHEN_SIGNED }),
      S('photography', 'conditional', 'Record', 'A portrait of every volunteer, which is what they will keep', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'A recognition film, made from the volunteers’ own work', { when: [some(WHEN_FILM[0], ans('recognition', 'video'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for everyone, with somewhere comfortable at the front', { when: WHEN_SEATS }),
      S('guest_services', 'conditional', 'Welcome', 'A desk that greets every volunteer by name as they arrive', { when: [some(WHEN_REG[0], ans('volunteer_count', '250', '600'))] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A small stage and a screen for the recognition', { when: WHEN_STAGE }),
      S('safety_facilities', 'conditional', 'Clear', 'Venue cleaned afterwards — not by the volunteers', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that holds everyone and is easy to reach', { when: WHEN_FINDING }),
    ],
    addons: [
      X('name_check', 'Get it right', 'Every name read aloud once beforehand, checked with the volunteer', 'schedule', { experience: true }),
      X('volunteer_portraits', 'Portrait', 'A photograph of every volunteer, printed and given to them', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('hours_record', 'Count it', 'Hours given researched from the records, so nobody is under-credited', 'poll', { experience: true, when: [ans('recognition', 'long_service')] }),
      X('absent_delivery', 'Reach them', 'Certificates delivered to volunteers who could not come', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Research the names and the hours from the records rather than from memory. A volunteer who is missed from the list would rather not have been invited.' },
    timeline: {
      before: ['Volunteer list built from records, with hours and years', 'Names checked for spelling and pronunciation with the volunteers', 'Certificates and gifts counted against the full list'],
      during: ['Every volunteer greeted by name at the door', 'Recognition by name, not by group', 'Portraits taken as people come off the stage'],
      after: ['Certificates delivered to anyone absent', 'Portraits shared with every volunteer', 'Thanks repeated in writing afterwards'],
    },
    checklist: ['Volunteer list from records', 'Names checked with volunteers', 'Certificates and gifts counted for all', 'Delivery planned for anyone absent'],
  }),

  B('environmental-awareness-event', 'Change a habit', 'An event about waste that must not generate any.', {
    about: 'Judged on its own footprint before its message. Disposables, printed leaflets and a bin full of plastic at the end undo everything said from the stage.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('theme', 'What is the focus?', 'one', { options: [['waste', 'Waste and recycling'], ['water', 'Water'], ['air', 'Air quality'], ['biodiversity', 'Biodiversity'], ['energy', 'Energy'], ['climate', 'Climate generally']] }),
      Q('activities', 'What is happening?', 'many', { options: [['booths', 'Information booths'], ['workshops', 'Workshops'], ['eco_market', 'Eco-product stalls'], ['screening_env', 'A documentary'], ['demos_env', 'Demonstrations'], ['planting', 'Planting']] }),
      Q('own_footprint', 'How is the event’s own waste handled?', 'one', {
        options: [['segregated', 'Segregated and composted'], ['reusable', 'Reusables only, no disposables'], ['both_env', 'Both'], ['standard', 'Standard collection']],
        help: 'An awareness event with a bin full of plastic at the end has argued against itself.',
      }),
      LANGUAGES, VOLUNTEERS, AV, SEATS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Practise it', 'Segregated waste, composting and the site left better than found'),
      S('event_equipment_rental', 'conditional', 'Set up', 'Booths, boards and the workshop and demonstration areas', { when: [ans('activities', 'booths', 'workshops', 'eco_market', 'demos_env')] }),
      S('invitation_printing', 'conditional', 'Say it', 'Reusable boards and signage, in the languages people read', { when: WHEN_SIGNED }),
      S('sound_av', 'conditional', 'Carry', 'A PA for the speakers and a screen for the documentary', { when: [some(WHEN_PA[0], ans('activities', 'screening_env'))] }),
      S('guest_services', 'conditional', 'Engage', 'People who can have a conversation about a habit, not recite a fact', { when: [some(WHEN_VOLS[0], ans('activities', 'booths'))] }),
      S('event_materials_supplier', 'conditional', 'Supply', 'Saplings, tools and workshop materials', { when: [ans('activities', 'planting', 'workshops')] }),
      S('catering_food', 'conditional', 'Feed', 'Food served on reusables, with nothing disposable in sight', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, shade and seating for the sessions', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('photography', 'conditional', 'Record', 'The day, with consent from anyone identifiable', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power', 'Power for sound and screens outdoors', { when: [some(WHEN_OUTSIDE[0], ans('activities', 'screening_env'))] }),
      S('anchor_mc', 'conditional', 'Present', 'Someone to hold the sessions together', { when: [ans('activities', 'demos_env', 'screening_env')] }),
      S('venue', 'conditional', 'Place it', 'Somewhere people already pass, with shade and water', { when: WHEN_FINDING }),
    ],
    addons: [
      X('no_disposables', 'Walk the talk', 'Reusable crockery, water stations and no single-use anything', 'glass', { trade: 'catering_food', when: [ans('own_footprint', 'reusable', 'both_env')] }),
      X('waste_audit', 'Measure it', 'The event’s own waste weighed and reported, which is the honest version', 'poll', { experience: true }),
      X('reusable_signage', 'Print once', 'Signage without a date on it, so it can be used again', 'invite', { trade: 'invitation_printing' }),
      X('follow_up_action', 'Give them a step', 'One specific thing each person can do, and a way to do it', 'phone', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The event’s own footprint is part of the message. We will keep segregation and reusables on the plan and say so if they come off.' },
    timeline: {
      before: ['Waste plan agreed before anything is ordered', 'Material printed on reusable boards, undated where possible', 'Volunteers briefed to talk, not to recite'],
      during: ['Segregation visible and staffed, not just bins placed', 'No single-use items anywhere the public can see', 'A specific next step given to everyone who engages'],
      after: ['Waste weighed and reported honestly', 'Signage stored for reuse', 'Site left better than found'],
    },
    checklist: ['Waste plan agreed first', 'Reusable signage and crockery', 'Volunteers briefed to converse', 'A concrete next step to offer'],
  }),

  B('tree-planting-drive', 'Plant it', 'The planting is the easy half. Who waters it in March is the event.', {
    about: 'A drive that plants two hundred saplings and names nobody to water them has planted nothing. Land permission and a maintenance owner come before the saplings are ordered.',
    formats: ['outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('land_permission', 'Is permission for the land confirmed?', 'one', {
        options: [['yes', 'Yes, in writing'], ['verbal', 'Verbally'], ['no', 'Not yet'], ['own', 'It is our own land']],
        help: 'Planting without written permission is how saplings get removed a week later.',
      }),
      Q('saplings', 'How many saplings?', 'select', { options: [['25', 'Up to 25'], ['100', 'Up to 100'], ['500', 'Up to 500'], ['2000', 'More than 500']] }),
      Q('species', 'Are the species chosen for the site?', 'one', {
        options: [['native', 'Native species, chosen for the soil'], ['advised', 'Advised by a horticulturist'], ['mixed_sp', 'A mix'], ['notyet', 'Not decided']],
      }),
      Q('water_source', 'Is there a water source at the site?', 'one', { options: [['onsite', 'Yes, on site'], ['tanker', 'By tanker'], ['none_water', 'No water available'], ['rainfed', 'Rain-fed only']] }),
      Q('maintenance', 'Who maintains the saplings afterwards?', 'one', {
        options: [['named', 'A named person or body'], ['community', 'The community'], ['contractor', 'A contractor'], ['nobody', 'Not decided']],
        help: 'This is the single question that decides whether the drive worked.',
      }),
      VOLUNTEERS, AWARDS, SEATS, PHOTOS, FOOD, SIGNAGE, TRANSPORT, CLEAN,
    ],
    plan: [
      S('event_materials_supplier', 'essential', 'Supply', 'Saplings, soil, manure, guards, stakes and the planting tools'),
      S('guest_services', 'recommended', 'Organise', 'Volunteer registration, a safety briefing and planting in groups'),
      S('safety_facilities', 'recommended', 'Protect', 'Gloves, first aid, drinking water and the site cleared afterwards'),
      S('transportation', 'conditional', 'Deliver', 'Saplings, soil and water delivered to a site with no road to it', { when: [some(WHEN_RIDE[0], ans('saplings', '500', '2000'))] }),
      S('photography', 'conditional', 'Record', 'The planting, and each sapling’s position for the maintenance record', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Mark it', 'Site signage, species labels and participation certificates', { when: [some(WHEN_SIGNED[0], WHEN_PRINTED[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Water and food for volunteers doing physical work in the sun', { when: WHEN_WATER }),
      S('tent_furniture', 'conditional', 'Shelter', 'Shade and a base for registration and rest', { when: [some(WHEN_SEATS[0], ans('attendees', '200', '800', '3000', '10000'))] }),
      S('anchor_mc', 'conditional', 'Brief', 'A short briefing on how to plant, which most volunteers need', { when: WHEN_VOLS }),
      S('venue', 'conditional', 'Secure', 'A planting site with permission, access and water', { when: WHEN_FINDING }),
    ],
    addons: [
      X('land_permission_doc', 'Get it in writing', 'Written permission for the land, before saplings are ordered', 'schedule', { experience: true, when: [ans('land_permission', 'verbal', 'no')] }),
      X('species_advice', 'Choose right', 'Species chosen for the soil and rainfall by someone who knows', 'flower', { experience: true, when: [ans('species', 'notyet', 'mixed_sp')] }),
      X('maintenance_owner', 'Name the waterer', 'A named person or body responsible for watering, for two years', 'heart', { experience: true, when: [ans('maintenance', 'nobody', 'community')] }),
      X('tree_guards', 'Protect them', 'Guards and stakes, without which grazing ends most drives', 'craft', { trade: 'event_materials_supplier' }),
    ],
    toolkit: { polls: ['date'], note: 'Written land permission, species suited to the site, and a named person responsible for watering. Without all three the saplings will not be there next year, and we will say so.' },
    timeline: {
      before: ['Written land permission obtained before saplings are ordered', 'Species chosen for the soil, not for availability', 'Maintenance owner named and the watering schedule agreed'],
      during: ['Short briefing on how to plant before anyone starts', 'Water, shade and first aid available throughout', 'Each sapling’s position recorded for the maintenance record'],
      after: ['Site cleared of bags, guards’ packaging and tools', 'Maintenance schedule handed to the named owner', 'A check at three months, and again at a year'],
    },
    checklist: ['Written land permission', 'Species suited to the site', 'Named maintenance owner', 'Guards and a watering schedule'],
  }),

  B('community-service-day', 'Turn up', 'A day of work, where the beneficiaries are not the audience.', {
    about: 'The risk here is a day that serves the volunteers more than anyone else. The work is agreed with the people it is for, before the volunteers are recruited.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('activity', 'What work is being done?', 'many', { options: [['repairs', 'Repairs or painting'], ['cleaning_act', 'Cleaning'], ['distribution', 'Distributing supplies'], ['teaching', 'Teaching or reading'], ['gardening', 'Gardening'], ['admin_help', 'Admin or digital help']] }),
      Q('beneficiary_agreed', 'Has the work been agreed with the people it is for?', 'one', {
        options: [['yes', 'Yes, they asked for it'], ['consulted', 'We consulted them'], ['no', 'Not yet']],
        help: 'Work nobody asked for is a day out with a photograph at the end.',
      }),
      Q('skills', 'Does any of it need a skilled or licensed person?', 'yesno', { optional: true }),
      VOLUNTEERS, AID, SEATS, PHOTOS, FOOD, SIGNAGE, TRANSPORT, CLEAN,
    ],
    plan: [
      S('event_materials_supplier', 'recommended', 'Equip', 'Tools, paint, cleaning supplies and whatever the work needs'),
      S('guest_services', 'recommended', 'Organise', 'Volunteer registration, team allocation and a safety briefing'),
      S('safety_facilities', 'recommended', 'Protect', 'Gloves, protective equipment, first aid, water and waste removal'),
      S('passenger_transport', 'conditional', 'Carry', 'Transport to the site and back, with everyone counted', { when: WHEN_RIDE }),
      S('catering_food', 'conditional', 'Feed', 'Food and water for volunteers doing physical work', { when: WHEN_WATER }),
      S('photography', 'conditional', 'Record', 'The work, not the beneficiaries, and never without consent', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Brief', 'Task sheets, safety notices, volunteer badges and certificates', { when: [some(WHEN_SIGNED[0], WHEN_VOLS[0])] }),
      S('tent_furniture', 'conditional', 'Base', 'A base with shade, water and somewhere to leave bags', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('mini_truck_pickup', 'conditional', 'Shift it', 'A vehicle for materials, supplies and whatever is being removed', { when: [ans('activity', 'repairs', 'distribution', 'cleaning_act')] }),
      S('venue', 'conditional', 'Find', 'A base near the work, with washrooms and water', { when: WHEN_FINDING }),
    ],
    addons: [
      X('beneficiary_agreement', 'Ask them first', 'The work agreed with the people it is for, before volunteers are found', 'heart', { experience: true, when: [ans('beneficiary_agreed', 'consulted', 'no')] }),
      X('skilled_trades', 'Use the right person', 'Anything electrical, structural or licensed done by a qualified trade', 'schedule', { experience: true, when: [ans('skills', 'yes')] }),
      X('dignity_rule', 'No posing', 'A stated rule: no photographs of beneficiaries, no staged handovers', 'camera', { experience: true }),
      X('finish_it', 'Come back', 'Anything half-done listed, owned and finished within the month', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The people the work is for are not a backdrop. We will not plan staged handover photographs, and anything licensed is done by a qualified trade.' },
    timeline: {
      before: ['Work agreed with the people it is for, in their words', 'Skilled or licensed tasks assigned to qualified trades', 'Tools, materials and protective equipment counted per volunteer'],
      during: ['Safety briefing before any tool is picked up', 'Work done to a standard, not to a timetable', 'No photographs of beneficiaries without their consent'],
      after: ['Anything half-finished listed, owned and completed within the month', 'Site cleared and tools returned', 'Thanks to the community, not from them'],
    },
    checklist: ['Work agreed with the beneficiaries', 'Licensed tasks given to qualified trades', 'Protective equipment per volunteer', 'A plan to finish what is started'],
  }),

  B('public-health-awareness-event', 'Inform safely', 'Health information in public, where only qualified people may give it.', {
    about: 'Anything that looks like a diagnosis, a screening or advice must come from a qualified, authorised provider the organiser engages. We arrange the room, the privacy and the queue — never the clinical content.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, MEDICAL_PARTNER,
      Q('topic', 'What is the health topic?', 'text', { max: 120 }),
      Q('activities_health', 'What is happening?', 'many', {
        options: [['talks_health', 'Talks by qualified professionals'], ['booths_health', 'Information booths'], ['screening', 'Screening by the authorised provider'], ['consults', 'Consultations by the authorised provider'], ['demos_health', 'Demonstrations'], ['materials', 'Printed information']],
      }),
      LANGUAGES, ACCESS_NEEDS, VOLUNTEERS, AV, SEATS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set up', 'Booths, screened consultation spaces and the seating layout'),
      S('safety_facilities', 'recommended', 'Keep it clean', 'Handwashing, washrooms, waste holding and the clear-up'),
      S('invitation_printing', 'conditional', 'Inform', 'Material written by the provider, printed in the right languages', { when: [some(WHEN_SIGNED[0], ans('activities_health', 'materials'))] }),
      S('guest_services', 'recommended', 'Queue it', 'Registration and a queue that exposes nobody’s reason for coming'),
      S('sound_av', 'conditional', 'Carry', 'Sound for the talks and a screen for the demonstrations', { when: [some(WHEN_PA[0], ans('activities_health', 'talks_health', 'demos_health'))] }),
      S('tent_furniture', 'conditional', 'Screen it', 'Seating, and screened private spaces for anything confidential', { when: [some(WHEN_SEATS[0], ans('activities_health', 'screening', 'consults'), WHEN_ACCESS[0])] }),
      S('photography', 'conditional', 'Record', 'The event only — never a participant, never anything clinical', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Provide', 'Water and refreshments, which a long queue needs', { when: WHEN_WATER }),
      S('power_cooling', 'conditional', 'Power', 'Power and cooling for the provider’s equipment and a full room', { when: [some(ans('activities_health', 'screening'), WHEN_OUTSIDE[0])] }),
      S('anchor_mc', 'conditional', 'Introduce', 'Someone to introduce the professionals and keep sessions to time', { when: [ans('activities_health', 'talks_health')] }),
      S('venue', 'conditional', 'Find', 'An accessible, clean room with water, power and a private corner', { when: WHEN_FINDING }),
    ],
    addons: [
      X('privacy_screens', 'Screen it', 'Screened spaces so nobody is consulted or screened in public view', 'bed', { trade: 'tent_furniture', when: [ans('activities_health', 'screening', 'consults')] }),
      X('provider_material', 'Their words', 'All health content written and approved by the qualified provider', 'invite', { experience: true }),
      X('language_versions', 'Translate', 'Material in the languages the community actually reads', 'phone', { trade: 'invitation_printing', when: WHEN_LANG }),
      X('no_results_kept', 'Keep nothing', 'No participant’s results or details retained by anyone but the provider', 'heart', { experience: true, when: [ans('activities_health', 'screening', 'consults')] }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Sambramo gives no health advice and takes no medical decision. Screening, consultation and all content come from the qualified authorised provider. No participant is photographed, and no result reaches anyone but the provider and the person.' },
    timeline: {
      before: ['Authorised provider confirmed in writing, with their requirements', 'All health content written and approved by the provider', 'Private screened spaces planned for anything confidential'],
      during: ['Clinical activity run entirely by the provider', 'Queue managed so nobody’s reason for attending is public', 'No photography of participants, at all'],
      after: ['Records held only by the provider', 'Room cleaned and handed back', 'Follow-up routes given by the provider, not by us'],
    },
    checklist: ['Authorised provider confirmed in writing', 'Content approved by the provider', 'Private screened consultation space', 'No participant data retained'],
  }),

  B('social-impact-summit', 'Convene', 'Funders, NGOs and government in one room, which rarely happens.', {
    about: 'The value is in who is in the room and whether they actually met. Delegate mix, scheduled introductions and the follow-up matter more than the main stage.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('theme_summit', 'What is the summit about?', 'text', { max: 120 }),
      Q('delegate_mix', 'Who is attending?', 'many', { options: [['ngos', 'NGOs'], ['funders', 'Funders and CSR teams'], ['government', 'Government'], ['academics', 'Academics'], ['social_ent', 'Social enterprises'], ['community_reps', 'Community representatives']] }),
      Q('programme_summit', 'What is on the programme?', 'many', { options: [['keynotes', 'Keynotes'], ['panels', 'Panels'], ['workshops_sum', 'Workshops'], ['showcase', 'An NGO showcase'], ['matchmaking', 'Scheduled introductions'], ['awards_sum', 'Awards']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three or more']] }),
      AV, SEATS, AWARDS, PHOTOS, FOOD, SIGNAGE, TRANSPORT, REGISTER,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Stage production, and matched sound in every breakout room'),
      S('guest_services', 'recommended', 'Register', 'Delegate registration, badges and the introductions desk'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, the programme, the delegate directory and signage'),
      S('catering_food', 'conditional', 'Sustain', 'Breaks and meals to the agenda — the breaks are the product', { when: WHEN_FOOD }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, breakout rooms, showcase stands and meeting tables', { when: [some(WHEN_STAGE[0], ans('programme_summit', 'showcase', 'workshops_sum', 'matchmaking'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Plenary seating, breakout furniture and somewhere to actually talk', { when: WHEN_SEATS }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed for the people who could not travel', { when: [some(WHEN_STREAM[0], WHEN_FILM[0])] }),
      S('photography', 'conditional', 'Document', 'Speakers, panels and the floor, for the report afterwards', { when: WHEN_SHOT }),
      S('anchor_mc', 'conditional', 'Moderate', 'A moderator who can hold a panel of unequal power to time', { when: [ans('programme_summit', 'panels', 'keynotes')] }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and the summit present across the venue', { when: WHEN_SIGNED }),
      S('gifts_favours', 'conditional', 'Recognise', 'Awards, where there is an awards segment', { when: [some(WHEN_TROPHY[0], ans('programme_summit', 'awards_sum'))] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Travel for community representatives who could not otherwise come', { when: WHEN_RIDE }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days and several rooms', { when: [ans('days', '2', '3')] }),
      S('venue', 'conditional', 'Find', 'A venue with enough breakout rooms, which is the hard part', { when: WHEN_FINDING }),
    ],
    addons: [
      X('matchmaking', 'Introduce them', 'Scheduled introductions between NGOs and funders, booked in advance', 'group', { experience: true, when: [ans('programme_summit', 'matchmaking')] }),
      X('community_travel', 'Fund the travel', 'Travel and stay for community representatives, so the room is not all funders', 'bus', { trade: 'passenger_transport', when: [ans('delegate_mix', 'community_reps')] }),
      X('delegate_directory', 'Who is here', 'A directory with every delegate and what they are looking for', 'album', { trade: 'invitation_printing' }),
      X('follow_up_pack', 'Make it count', 'Commitments recorded and circulated within the week', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'A summit about communities that no community representative could afford to attend has already failed. Travel support stays on the plan.' },
    timeline: {
      before: ['Delegate mix reviewed, with travel funded where it decides attendance', 'Introductions scheduled before anyone travels', 'Programme published with rooms and times'],
      during: ['Registration clearing before the first session', 'Introductions run to the schedule', 'Breaks protected — that is where the value is'],
      after: ['Commitments recorded and circulated within the week', 'Recordings published', 'Follow-up on every introduction made'],
    },
    checklist: ['Travel funded for community delegates', 'Introductions scheduled in advance', 'Delegate directory produced', 'Follow-up owner named'],
  }),

  B('fundraising-gala', 'Ask well', 'A formal evening whose only measure is the number at the end of it.', {
    about: 'Different from an NGO fundraiser in scale and formality, and the same in the thing that matters: the cost-to-raise ratio. A magnificent gala that raises little has failed.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('cause', 'What is being raised for?', 'text', { max: 120 }),
      Q('target', 'Is there a target?', 'text', { optional: true, max: 40 }),
      DONATIONS,
      Q('methods_gala', 'How is money raised on the night?', 'many', { options: [['tables', 'Table sales'], ['auction_gala', 'A live auction'], ['pledge', 'A pledge moment'], ['raffle', 'A raffle'], ['sponsors', 'Sponsorship'], ['matched', 'Matched giving']] }),
      DIET_ONLY, ALLERGY_ONLY, CHIEF_GUEST, AV, SEATS, PARKING, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('catering_food', 'recommended', 'Host', 'A dinner that justifies the table price and nothing beyond it'),
      S('anchor_mc', 'recommended', 'Make the ask', 'A host who can run an auction and land a pledge moment'),
      S('sound_av', 'recommended', 'Carry', 'Sound for the ask and a screen showing the total rising'),
      S('event_lighting', 'recommended', 'Set', 'Lighting that makes the room feel like the ticket, at modest cost'),
      S('guest_services', 'recommended', 'Settle', 'Table plan, bidder registration and settlement, at their desk'),
      S('decoration_floral', 'conditional', 'Dress', 'Table and room dressing, judged against the cost-to-raise', { when: WHEN_SIGNED }),
      S('invitation_printing', 'conditional', 'Equip', 'Invitations, table plan, paddles, pledge cards and the catalogue', { when: [some(WHEN_SIGNED[0], ans('methods_gala', 'auction_gala', 'pledge', 'raffle'))] }),
      S('videography', 'conditional', 'Move them', 'A film about the cause, which does the asking better than a speech', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('photography', 'conditional', 'Record', 'The evening, with consent from anyone whose story is told', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Warm them', 'Entertainment placed before the ask, not after it', { when: [ans('methods_gala', 'tables', 'sponsors')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Round tables and accessible places, laid to the plan', { when: WHEN_SEATS }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, screen, lectern and the auction display', { when: WHEN_STAGE }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, for a room that paid for a table', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A venue that fits the cause without embarrassing it', { when: WHEN_FINDING }),
    ],
    addons: [
      X('cause_film', 'Show it', 'A short film about the cause, immediately before the ask', 'film', { trade: 'videography' }),
      X('bidder_registration', 'Register first', 'Bidders registered with the organisation’s payment details beforehand', 'budget', { trade: 'guest_services', when: [ans('methods_gala', 'auction_gala', 'raffle')] }),
      X('cost_to_raise', 'Measure it', 'Every line checked against the target before it is committed', 'poll', { experience: true }),
      X('matched_giving', 'Double it', 'A matching pledge secured before the night, announced during the ask', 'heart', { experience: true, when: [ans('methods_gala', 'matched')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Donations go to the organisation, never through us. Every rupee spent on the room is a rupee not raised, and we will show the estimate against the target.' },
    timeline: {
      before: ['Target set and every cost checked against it before committing', 'Bidders registered with the organisation’s payment details', 'Consent obtained for any beneficiary story or film'],
      during: ['Film, then the ask, while the room is warm', 'Auction run by someone who can run one', 'Total shown rising, publicly'],
      after: ['Pledges collected within the month', 'Total announced with the cost-to-raise stated honestly', 'Donors thanked individually by the organisation'],
    },
    checklist: ['Costs checked against the target', 'Bidders registered in advance', 'Beneficiary consent in writing', 'Pledge collection planned'],
  }),

  B('community-cleanup-drive', 'Clear it', 'Waste picked up by hand, which makes gloves and disposal the whole plan.', {
    about: 'The part that goes wrong is the end: a hundred bags collected and nowhere authorised for them to go. Disposal is arranged before the volunteers are.',
    formats: ['outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('area', 'How large is the area?', 'select', { options: [['street', 'A street'], ['park', 'A park or ground'], ['lake', 'A lake or waterbody'], ['neighbourhood', 'A whole neighbourhood'], ['beach_area', 'A beach']] }),
      Q('waste_type', 'What kind of waste?', 'many', { options: [['plastic', 'Plastic'], ['mixed_waste', 'Mixed household'], ['construction', 'Construction debris'], ['glass_waste', 'Glass and sharps'], ['organic', 'Organic'], ['ewaste', 'Electronic waste']] }),
      Q('disposal', 'Is authorised disposal arranged?', 'one', {
        options: [['yes', 'Yes, with the authority or a licensed handler'], ['partly', 'Partly'], ['no', 'Not yet']],
        help: 'Collected waste with nowhere to go is a pile someone else has to deal with.',
      }),
      VOLUNTEERS, AID, SEATS, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Protect', 'Gloves, protective equipment, first aid, segregation and removal'),
      S('event_materials_supplier', 'recommended', 'Equip', 'Bags, grabbers, segregation bins and the cleaning tools'),
      S('guest_services', 'recommended', 'Organise', 'Volunteer registration, zone allocation and a safety briefing'),
      S('mini_truck_pickup', 'conditional', 'Take it away', 'A vehicle to move collected waste to the authorised point', { when: [some(WHEN_RIDE[0], ans('area', 'neighbourhood', 'lake', 'beach_area'))] }),
      S('catering_food', 'conditional', 'Sustain', 'Drinking water and food for volunteers doing physical work', { when: WHEN_WATER }),
      S('photography', 'conditional', 'Record', 'Before and after, which is the only honest measure of a cleanup', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Brief', 'Zone maps, safety notices, badges and participation certificates', { when: [some(WHEN_SIGNED[0], WHEN_VOLS[0])] }),
      S('tent_furniture', 'conditional', 'Base', 'A base with shade, water and somewhere to leave bags', { when: [some(WHEN_SEATS[0], ans('attendees', '200', '800', '3000', '10000'))] }),
      S('medium_large_goods_vehicle', 'conditional', 'Haul', 'A larger vehicle for construction debris or a whole neighbourhood', { when: [ans('waste_type', 'construction')] }),
      S('venue', 'conditional', 'Base it', 'A gathering point with washrooms and water near the area', { when: WHEN_FINDING }),
    ],
    addons: [
      X('disposal_arranged', 'Arrange the end first', 'Authorised disposal confirmed with the authority before the date', 'schedule', { experience: true, when: [ans('disposal', 'partly', 'no')] }),
      X('sharps_handling', 'Handle it safely', 'Separate handling for glass, sharps and electronic waste', 'power_cooling', { trade: 'safety_facilities', when: [ans('waste_type', 'glass_waste', 'ewaste')] }),
      X('before_after', 'Prove it', 'The same spots photographed before and after, from the same position', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('weigh_it', 'Count it', 'Waste weighed and segregated, so the drive has a real number', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Arrange authorised disposal before the date. Gloves and sharps handling stay on the plan — this is the occasion where volunteers get hurt.' },
    timeline: {
      before: ['Authorised disposal confirmed with the authority or a licensed handler', 'Protective equipment counted per volunteer, including for sharps', 'Zones mapped and before-photographs taken from fixed positions'],
      during: ['Safety briefing before anyone starts, including what not to pick up', 'Segregation at the point of collection, not afterwards', 'Water and first aid available throughout'],
      after: ['Waste moved to the authorised point the same day', 'After-photographs from the same positions', 'Weight recorded and reported'],
    },
    checklist: ['Authorised disposal confirmed first', 'Gloves and sharps handling', 'Zones mapped with before-photographs', 'Vehicle for removal the same day'],
  }),
  B('disaster-relief-fundraiser', 'Respond', 'Money raised quickly, for people who need it now.', {
    about: 'Speed and trust are the whole product. Donations go to a verified relief organisation through its own channel, and nothing about this event may suggest Sambramo is one.',
    formats: ['venue', 'outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('cause', 'What is the relief for?', 'text', { max: 120 }),
      Q('relief_org', 'Which verified relief organisation receives the funds?', 'one', {
        options: [['verified', 'Verified, with their donation channel confirmed'], ['identified', 'Identified, not yet confirmed'], ['no', 'Not yet']],
        help: 'Funds go to a verified organisation through its own channel. Sambramo is not a relief organisation and never holds relief funds.',
      }),
      DONATIONS,
      Q('also_collecting', 'Are supplies being collected as well as money?', 'yesno', {
        optional: true, help: 'Only against a list the relief organisation has actually asked for. Unsorted goods are a burden, not help.',
      }),
      Q('target', 'Is there a target?', 'text', { optional: true, max: 40 }),
      VOLUNTEERS, AV, SEATS, PHOTOS, FOOD, SIGNAGE, REGISTER,
    ],
    plan: [
      S('guest_services', 'recommended', 'Receive', 'Donor registration and a desk at the relief organisation’s own channel'),
      S('anchor_mc', 'recommended', 'Make the ask', 'Someone who can ask plainly, without dramatising other people’s loss'),
      S('invitation_printing', 'recommended', 'State it', 'Who receives the funds, how, and what the organisation has asked for'),
      S('sound_av', 'conditional', 'Carry', 'Sound for the appeal and a screen showing the total', { when: [some(WHEN_PA[0], WHEN_SCREEN[0])] }),
      S('event_equipment_rental', 'conditional', 'Set up', 'A collection desk and, where supplies are taken, sorting tables', { when: [some(ans('also_collecting', 'yes'), WHEN_STAGE[0])] }),
      S('videography', 'conditional', 'Inform', 'A factual account from the relief organisation, not a produced appeal', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('photography', 'conditional', 'Record', 'The event, never an affected person, and never for effect', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating, and tables for sorting if supplies are being taken', { when: [some(WHEN_SEATS[0], ans('also_collecting', 'yes'))] }),
      S('catering_food', 'conditional', 'Provide', 'Modest refreshments — this is not the occasion for a spread', { when: WHEN_WATER }),
      S('warehouse_storage', 'conditional', 'Hold it', 'Short-term storage until the organisation collects the supplies', { when: [ans('also_collecting', 'yes')] }),
      S('mini_truck_pickup', 'conditional', 'Move it', 'Transport of collected supplies to the relief organisation', { when: [ans('also_collecting', 'yes')] }),
      S('decoration_floral', 'optional', 'Keep it plain', 'Minimal dressing — anything lavish reads badly here'),
      S('venue', 'conditional', 'Find', 'A venue donated or cheap, because the cost comes out of the relief', { when: WHEN_FINDING }),
    ],
    addons: [
      X('verified_recipient', 'Name them', 'The receiving organisation named, with its registration, on everything', 'invite', { experience: true, when: [ans('relief_org', 'identified', 'no')] }),
      X('requested_list_only', 'Only what is asked', 'Supplies collected strictly against the organisation’s own list', 'poll', { experience: true, when: [ans('also_collecting', 'yes')] }),
      X('public_accounting', 'Show the money', 'The total raised and transferred, published with dates', 'budget', { experience: true }),
      X('no_imagery', 'No spectacle', 'No images of affected people used to raise money', 'heart', { experience: true }),
    ],
    toolkit: { polls: false, note: 'Sambramo is not a relief organisation and never receives, holds or routes relief funds. Money goes to a verified organisation through its own channel, supplies only against its own list, and no affected person’s image is used to raise money.' },
    timeline: {
      before: ['Receiving organisation verified and its donation channel confirmed in writing', 'Any supplies list taken from the organisation, not guessed', 'Costs kept minimal, because they come out of the relief'],
      during: ['Donations only through the organisation’s channel', 'Supplies accepted only against the published list', 'Total shown honestly, with the recipient named'],
      after: ['Funds transferred and the transfer published with dates', 'Supplies delivered or collected within days, not weeks', 'Donors told exactly where it went'],
    },
    checklist: ['Recipient organisation verified', 'Donation channel is theirs, confirmed', 'Supplies list from the organisation', 'Public accounting of the total'],
  }),

  B('public-grievance-meeting', 'Hear them', 'People who have come with a problem, and a queue that must feel fair.', {
    about: 'Everyone in the room has waited for this, often more than once. The token system, the order and the written record are the whole event; the staging is almost irrelevant.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('subject', 'What is the meeting about?', 'text', { max: 120 }),
      Q('format', 'How is it run?', 'one', { options: [['tokens', 'By token, one at a time'], ['openfloor_gr', 'Open floor'], ['desks', 'Desks by department'], ['private', 'Private hearings'], ['mixed_gr', 'A mix']] }),
      Q('written_intake', 'Are written grievances accepted as well?', 'yesno'),
      LANGUAGES, ACCESS_NEEDS, RECORD, AV, SEATS, CLEAN, PHOTOS, FOOD, GUARD,
    ],
    plan: [
      S('guest_services', 'essential', 'Order it', 'Tokens, a queue nobody can jump, and someone who explains the wait'),
      S('sound_av', 'recommended', 'Carry all', 'Mics the floor can be heard on, and a record of what was said'),
      S('invitation_printing', 'recommended', 'Take it down', 'Tokens, grievance forms, acknowledgement slips and the register'),
      S('tent_furniture', 'conditional', 'Seat them', 'Seating for everyone waiting, with accessible places near the front', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Department desks, private hearing booths and the waiting area', { when: [ans('format', 'desks', 'private', 'mixed_gr')] }),
      S('anchor_mc', 'conditional', 'Moderate', 'A moderator who gives the floor in order and does not favour', { when: [ans('format', 'openfloor_gr', 'mixed_gr')] }),
      S('catering_food', 'conditional', 'Provide', 'Drinking water, and tea for people who will wait hours', { when: WHEN_WATER }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, accessible facilities and the room reset', { when: [some(WHEN_ACCESS[0], WHEN_BIG[0], WHEN_CLEAN[0])] }),
      S('security_services', 'conditional', 'Keep calm', 'Stewarding, because a long queue with old grievances gets heated', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Record', 'Only where permitted, and never a person stating a grievance', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Minute it', 'An audio or video record where the proceeding requires one', { when: WHEN_RECORDED }),
      S('venue', 'conditional', 'Find', 'An accessible hall people can reach without paying to get there', { when: WHEN_FINDING }),
    ],
    addons: [
      X('token_system', 'Make it fair', 'Numbered tokens issued on arrival, called in order, visibly', 'poll', { trade: 'guest_services' }),
      X('acknowledgement_slip', 'Prove it was taken', 'A numbered acknowledgement for every grievance, with a date to expect a reply', 'invite', { trade: 'invitation_printing' }),
      X('written_route', 'Take it in writing', 'Forms for people who will not or cannot speak in a room', 'album', { trade: 'invitation_printing', when: [ans('written_intake', 'yes')] }),
      X('private_booth', 'Screen it', 'A private space for anything someone should not have to say publicly', 'bed', { trade: 'event_equipment_rental', when: [ans('format', 'private', 'mixed_gr')] }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Everyone leaves with a numbered acknowledgement and a date. A grievance meeting with no written record is a queue, not a hearing.' },
    timeline: {
      before: ['Token and queue process agreed and published with the notice', 'Venue checked for step-free access and public transport', 'Grievance forms and acknowledgement slips printed'],
      during: ['Tokens issued on arrival, called visibly in order', 'Water, seating and an explained wait for everyone queueing', 'A numbered acknowledgement given for every grievance taken'],
      after: ['Register handed to the authority the same day', 'Replies sent by the date given on the slip', 'Room reset'],
    },
    checklist: ['Token system published and visible', 'Seating and water for the whole queue', 'Numbered acknowledgement for every grievance', 'Private space available'],
  }),

  B('local-residents-association-meeting', 'Decide', 'A hall of neighbours, an agenda and sometimes a vote.', {
    about: 'Small, procedural and prone to running long. The agenda, the quorum and the minutes are what make a decision stick; everything else is chairs and tea.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('purpose_meet', 'What is the meeting for?', 'one', { options: [['agm', 'An annual general meeting'], ['routine', 'A routine meeting'], ['issue', 'A specific issue'], ['elections', 'Elections'], ['budget', 'Accounts and budget']] }),
      Q('voting', 'Is there a vote?', 'one', { options: [['show', 'Show of hands'], ['ballot', 'A secret ballot'], ['proxy', 'With proxies'], ['none_vote', 'No vote']] }),
      Q('quorum', 'Is there a quorum requirement?', 'yesno', { optional: true }),
      RECORD, LANGUAGES, ACCESS_NEEDS, AV, SEATS, CLEAN, PHOTOS, FOOD, REGISTER,
    ],
    plan: [
      S('guest_services', 'recommended', 'Register', 'Attendance against the member list, proxies checked, quorum counted'),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Tables, the chair’s position, ballot boxes and the counting area', { when: [some(ans('voting', 'ballot', 'proxy'), ans('purpose_meet', 'agm', 'elections'))] }),
      S('sound_av', 'conditional', 'Carry', 'A mic, because a hall of eighty neighbours cannot hear the chair', { when: [some(WHEN_PA[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'recommended', 'Paper it', 'Notice, agenda, accounts, ballot papers and the attendance register'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for every member, with accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('catering_food', 'conditional', 'Provide', 'Tea and water, which is most of why people come', { when: WHEN_WATER }),
      S('anchor_mc', 'conditional', 'Chair support', 'Someone to keep the agenda moving and the discussion to the item', { when: [ans('purpose_meet', 'agm', 'elections', 'issue')] }),
      S('photography', 'conditional', 'Record', 'Only where the meeting agrees to it', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Minute it', 'A recording where the association’s rules require one', { when: WHEN_RECORDED }),
      S('safety_facilities', 'conditional', 'Reset', 'Hall cleaned and reset afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A hall within walking distance of the members', { when: WHEN_FINDING }),
    ],
    addons: [
      X('quorum_count', 'Count first', 'Quorum counted and recorded before any business is taken', 'poll', { trade: 'guest_services', when: [ans('quorum', 'yes')] }),
      X('secret_ballot', 'Keep it secret', 'Ballot boxes, a screened booth and counting in front of scrutineers', 'invite', { trade: 'event_equipment_rental', when: [ans('voting', 'ballot')] }),
      X('agenda_discipline', 'Keep to it', 'A timed agenda, with any other business genuinely last', 'schedule', { experience: true }),
      X('minutes_circulated', 'Write it down', 'Minutes circulated within the week, not at the next meeting', 'album', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Notice, quorum, voting and minutes are the association’s own rules. We set the room up to them and never advise on them.' },
    timeline: {
      before: ['Notice and agenda circulated to every member, with the required notice period', 'Member list and proxy forms prepared', 'Ballot arrangements set up if there is a vote'],
      during: ['Attendance and proxies registered, quorum counted and recorded', 'Agenda taken in order, timed', 'Votes conducted and counted in front of scrutineers'],
      after: ['Minutes circulated within the week', 'Ballot papers retained as the rules require', 'Hall reset'],
    },
    checklist: ['Notice period met', 'Member list and proxies ready', 'Quorum counted before business', 'Minutes circulated within the week'],
  }),

  B('community-sports-day', 'Play together', 'A neighbourhood on a ground, with a card that includes everyone.', {
    about: 'Different from a school or corporate sports day in one way that matters: the age range is five to eighty-five. The card has to have something for each of them, and first aid for all of them.',
    formats: ['outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('events_card', 'What is on the card?', 'many', { options: [['races', 'Races'], ['team_games', 'Team games'], ['kids_games', 'Children’s games'], ['elders_events', 'Events for older residents'], ['fun_events', 'Fun events'], ['tournament_c', 'A tournament']] }),
      Q('ages', 'Which age groups are taking part?', 'many', { options: [['children', 'Children'], ['teens', 'Teenagers'], ['adults', 'Adults'], ['elders', 'Older residents'], ['all_ages', 'Everyone']] }),
      Q('marking', 'Do you need the ground marked and equipment set up?', 'yesno'),
      Q('officials', 'Do you need referees or officials?', 'yesno', { optional: true }),
      AID, AWARDS, AV, SEATS, REGISTER, SIGNAGE, PHOTOS, FOOD, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover', 'First aid on the ground, shade, washrooms and the clear-up'),
      S('event_equipment_rental', 'conditional', 'Mark it', 'Ground marking, equipment, a finish line and the scoreboard', { when: [ans('marking', 'yes')] }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water points across the ground, refilled through the day'),
      S('sound_av', 'conditional', 'Announce', 'A PA for the events, the results and lost children', { when: [some(WHEN_PA[0], ans('events_card', 'races', 'tournament_c'))] }),
      S('tent_furniture', 'conditional', 'Shade', 'Shade and seating, especially for older residents watching', { when: [some(WHEN_SEATS[0], ans('ages', 'elders', 'all_ages'))] }),
      S('gifts_favours', 'conditional', 'Award', 'Medals by age group, and something for every child who took part', { when: WHEN_TROPHY }),
      S('invitation_printing', 'conditional', 'Publish', 'The event card, numbers, certificates and ground signage', { when: [some(WHEN_SIGNED[0], WHEN_PRINTED[0])] }),
      S('photography', 'conditional', 'Capture', 'The races and the podium, with consent where children are involved', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food for a whole day on a ground, and stalls if there are any', { when: WHEN_FOOD }),
      S('guest_services', 'conditional', 'Marshal', 'Registration, a marshalling area and a lost-child point', { when: [some(WHEN_REG[0], ans('ages', 'children', 'all_ages'))] }),
      S('anchor_mc', 'conditional', 'Commentate', 'Someone to run the card and keep a ground of families moving', { when: [ans('events_card', 'races', 'fun_events', 'kids_games')] }),
      S('power_cooling', 'conditional', 'Power', 'A generator for the PA and the scoreboard', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Secure', 'A ground with shade, washrooms and permission', { when: WHEN_FINDING }),
    ],
    addons: [
      X('all_ages_card', 'Include everyone', 'An event for every age group on the card, including the oldest', 'group', { experience: true, when: [ans('ages', 'elders', 'all_ages')] }),
      X('lost_child_point', 'Reunite', 'A staffed, signposted lost-child point, announced at the start', 'guest_services', { trade: 'guest_services', when: [ans('ages', 'children', 'all_ages')] }),
      X('participation_medals', 'Everyone finishes', 'Something for every child who took part, not only the winners', 'gift', { trade: 'gifts_favours' }),
      X('neutral_officials', 'Keep it fair', 'Officials from outside the competing streets or blocks', 'poll', { experience: true, when: [ans('officials', 'yes')] }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'With children on a ground, a lost-child point and first aid stay on the plan. We never advise on anyone’s fitness to take part.' },
    timeline: {
      before: ['Event card built with something for every age group', 'Ground marked and equipment checked the day before', 'First aid and water points placed on a ground plan'],
      during: ['Lost-child point announced at the start, not when needed', 'Water refilled, shade maintained', 'Results recorded as each event finishes'],
      after: ['Medals given on the ground, not posted later', 'Ground cleared and equipment returned', 'Results published to the neighbourhood'],
    },
    checklist: ['Card covers every age group', 'First aid and water on the ground', 'Lost-child point staffed', 'Medals for every child who took part'],
  }),

  B('neighbourhood-festival', 'Fill it', 'A neighbourhood closing a road and putting its own stalls on it.', {
    about: 'Run by residents rather than professionals, which makes the permissions, the stewarding and the power the parts most likely to be underestimated.',
    formats: ['outdoor'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('elements_fest', 'What is on?', 'many', { options: [['stalls', 'Stalls'], ['stage_fest', 'A stage'], ['food_stalls', 'Food stalls'], ['kids_zone_fest', 'A children’s zone'], ['artisans', 'Local artisans'], ['competitions', 'Competitions']] }),
      Q('stalls_count', 'How many stalls?', 'select', { optional: true, options: [['8', 'Up to 8'], ['25', 'Up to 25'], ['60', 'Up to 60'], ['120', 'More than 60']] }),
      Q('rides', 'Are there rides or inflatables?', 'yesno', {
        optional: true, help: 'Only through qualified operators with their own insurance and inspection.',
      }),
      VOLUNTEERS, AID, AV, SEATS, PHOTOS, FOOD, SIGNAGE, GUARD, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build it', 'Stalls, a stage, barriers and the activity zones'),
      S('safety_facilities', 'recommended', 'Service', 'First aid, washrooms, waste segregation and the street cleared after'),
      S('security_services', 'conditional', 'Steward', 'Stewarding at the road closures and across the festival', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Stage sound and a PA for announcements and lost children', { when: [some(WHEN_PA[0], ans('elements_fest', 'stage_fest'))] }),
      S('decoration_floral', 'recommended', 'Dress it', 'A gateway, bunting and a street that reads as a festival'),
      S('catering_food', 'conditional', 'Feed', 'Food stalls placed so their queues do not block the road', { when: [some(ans('elements_fest', 'food_stalls'), WHEN_FOOD[0])] }),
      S('live_entertainment', 'conditional', 'Perform', 'Performers on the stage and moving through the crowd', { when: [ans('elements_fest', 'stage_fest', 'competitions')] }),
      S('power_cooling', 'recommended', 'Power it', 'Generators and distribution, which a residential street cannot provide'),
      S('guest_services', 'conditional', 'Marshal', 'Volunteer coordination, an information point and a lost-child point', { when: [some(WHEN_VOLS[0], ans('elements_fest', 'kids_zone_fest'))] }),
      S('invitation_printing', 'conditional', 'Signpost', 'A street map, stall signage, closure notices and safety notices', { when: WHEN_SIGNED }),
      S('event_lighting', 'conditional', 'Light', 'Festoon lighting for an evening on a street with poor lamps', { when: [some(WHEN_LIT[0], ans('elements_fest', 'stage_fest'))] }),
      S('photography', 'conditional', 'Record', 'The street and the stalls, for the association’s own record', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Canopies and communal seating where people eat', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Secure', 'A street or ground with closure permission and access for services', { when: WHEN_FINDING }),
    ],
    addons: [
      X('closure_notices', 'Tell the street', 'Written notice to every household and business on the closure', 'invite', { trade: 'invitation_printing' }),
      X('qualified_rides', 'Check them', 'Rides and inflatables only from operators with insurance and inspection', 'game', { experience: true, when: [ans('rides', 'yes')] }),
      X('lost_child_point', 'Reunite', 'A staffed, signposted lost-child point, announced at the start', 'guest_services', { trade: 'guest_services', when: [ans('elements_fest', 'kids_zone_fest')] }),
      X('emergency_lane', 'Keep it clear', 'A clear lane maintained for an ambulance or fire engine, all day', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A closed street still needs a clear emergency lane, all day. Road closure permission and stewarding are the organiser’s, and we never suggest fireworks.' },
    timeline: {
      before: ['Closure permission confirmed and every household on the street notified', 'Street plan drawn with stall positions and a kept emergency lane', 'Power sized against every stall and the stage'],
      during: ['Emergency lane kept clear and stewarded all day', 'Lost-child point announced at the start', 'Waste collected through the day, not at the end'],
      after: ['Street cleared the same evening, including under the stalls', 'Road reopened to schedule', 'Residents thanked, especially those who lost their parking'],
    },
    checklist: ['Closure permission and household notices', 'Emergency lane kept clear', 'Power sized per stall', 'Lost-child point staffed'],
  }),

  B('civic-award-ceremony', 'Honour them', 'A city recognising its own, where the selection must be defensible.', {
    about: 'Public recognition invites public scrutiny. Who chose the recipients and on what basis matters more than the stage, and both are published before the shortlist.',
    formats: ['venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE,
      Q('categories', 'How many award categories?', 'select', { options: [['6', 'Up to 6'], ['15', 'Up to 15'], ['35', 'Up to 35'], ['70', 'More than 35']] }),
      Q('selection', 'How are recipients chosen?', 'one', { options: [['panel', 'A selection panel'], ['nominations', 'Public nominations'], ['authority_picks', 'The authority'], ['mixed_sel', 'A mix']] }),
      Q('shortlist', 'Is a shortlist published in advance?', 'yesno', { optional: true }),
      CHIEF_GUEST, AWARDS, LANGUAGES, AV, SEATS, GUARD, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Preside', 'A host who gets every recipient’s name and work right'),
      S('sound_av', 'recommended', 'Carry', 'Mics, a citation screen and cues that land on the right name'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting built for the handover photograph'),
      S('decoration_floral', 'recommended', 'Dignify', 'A stage that makes a civic award feel like one'),
      S('gifts_favours', 'conditional', 'Make them', 'Trophies and medals, engraved and sorted in calling order', { when: WHEN_TROPHY }),
      S('invitation_printing', 'recommended', 'Cite them', 'Invitations, a citation per recipient, programme and certificates'),
      S('guest_services', 'recommended', 'Seat', 'Recipient and family seating, so the walk to the stage is short'),
      S('photography', 'conditional', 'Capture', 'Every handover, plus a portrait of each recipient', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The ceremony filmed, and streamed where the authority wants it', { when: [some(WHEN_FILM[0], WHEN_STREAM[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, podium, screen and a route up and down', { when: WHEN_STAGE }),
      S('catering_food', 'conditional', 'Host', 'Refreshments after the ceremony, for recipients and families', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for recipients, families and the public', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Control', 'Access control where dignitaries are attending', { when: [some(WHEN_GUARD[0], ans('chief_guest', 'yes'))] }),
      S('valet_parking', 'conditional', 'Park', 'Parking for recipients who may be elderly or travelling in', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A hall with a stage and room for every recipient’s family', { when: WHEN_FINDING }),
    ],
    addons: [
      X('selection_published', 'Show the basis', 'The panel and the criteria published before the shortlist', 'poll', { experience: true }),
      X('citations_written', 'Say why', 'A written citation for each recipient, read out and given to them', 'invite', { trade: 'invitation_printing' }),
      X('family_seats', 'Bring their people', 'Seats held for each recipient’s family, named', 'chair', { trade: 'guest_services' }),
      X('recipient_portraits', 'Portrait', 'A portrait of every recipient, printed and given on the night', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the panel and the criteria before the shortlist. A civic award is only worth receiving if the basis for it is public.' },
    timeline: {
      before: ['Panel and criteria published before the shortlist is announced', 'Citations written for every recipient and checked with them', 'Family seats held and named'],
      during: ['Recipients and families seated together, near the stage', 'Citation read before each award, not just the name', 'Portrait taken as each recipient comes off'],
      after: ['Awards delivered to anyone who could not attend', 'Citations and portraits given to every recipient', 'Full list published with the criteria'],
    },
    checklist: ['Panel and criteria published', 'Citations written and checked', 'Family seats held', 'Delivery planned for absentees'],
  }),

  B('public-safety-awareness-programme', 'Show them how', 'Safety taught by people qualified to teach it, with equipment that is real.', {
    about: 'A demonstration that teaches the wrong thing is worse than none. Fire, first aid and rescue are shown only by trainers qualified to show them, with their own equipment and their own insurance.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, ATTENDEES, PLACE, PERMITS,
      Q('topics', 'What is being covered?', 'many', { options: [['fire', 'Fire safety'], ['first_aid_topic', 'First aid'], ['road', 'Road safety'], ['disaster', 'Disaster preparedness'], ['home_safety', 'Home and electrical safety'], ['women_safety', 'Personal safety']] }),
      Q('trainers', 'Who is delivering it?', 'one', {
        options: [['authorised', 'Qualified, authorised trainers, confirmed'], ['identified_tr', 'Identified, not confirmed'], ['no_tr', 'Not yet arranged']],
        help: 'Fire, first aid and rescue demonstrations are given only by qualified trainers. We provide none and present none.',
      }),
      Q('live_demo', 'Is there a live demonstration with real equipment?', 'yesno', {
        help: 'A live demonstration needs a cleared area, the trainer’s own safety plan and permissions.',
      }),
      LANGUAGES, ACCESS_NEEDS, AV, SEATS, GUARD, VOLUNTEERS, PHOTOS, FOOD, SIGNAGE,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Clear it', 'A cleared demonstration area, extinguishers, first aid and clean-up'),
      S('event_equipment_rental', 'recommended', 'Set up', 'Demonstration area, barriers, boards and the seating layout'),
      S('sound_av', 'conditional', 'Carry', 'A PA so a trainer can be heard over a demonstration', { when: [some(WHEN_PA[0], ans('live_demo', 'yes'))] }),
      S('invitation_printing', 'recommended', 'Hand it over', 'Material written by the trainers, in the languages people read'),
      S('guest_services', 'conditional', 'Marshal', 'Keeping the public behind the line during any live demonstration', { when: [some(ans('live_demo', 'yes'), WHEN_VOLS[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at a safe distance, with accessible places', { when: [some(WHEN_SEATS[0], WHEN_ACCESS[0])] }),
      S('photography', 'conditional', 'Record', 'The programme, with consent from anyone identifiable', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Provide', 'Water and refreshments for a session in the open', { when: WHEN_WATER }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA and any equipment, outdoors', { when: [some(WHEN_OUTSIDE[0], WHEN_PA[0])] }),
      S('anchor_mc', 'conditional', 'Introduce', 'Someone to introduce the trainers and keep the sessions to time', { when: [ans('topics', 'road', 'disaster', 'home_safety')] }),
      S('security_services', 'conditional', 'Hold the line', 'Stewarding at the demonstration perimeter', { when: [some(WHEN_GUARD[0], ans('live_demo', 'yes'))] }),
      S('venue', 'conditional', 'Find', 'A ground with space for a cleared demonstration area', { when: WHEN_FINDING }),
    ],
    addons: [
      X('trainer_credentials', 'Verify them', 'Each trainer’s qualification and insurance seen and recorded', 'schedule', { experience: true, when: [ans('trainers', 'identified_tr', 'no_tr')] }),
      X('demo_safety_plan', 'Clear the area', 'The trainer’s own safety plan for any live demonstration, followed', 'map', { experience: true, when: [ans('live_demo', 'yes')] }),
      X('language_versions', 'Translate', 'Safety material in the languages the audience actually reads', 'invite', { trade: 'invitation_printing', when: WHEN_LANG }),
      X('takeaway_card', 'One thing to remember', 'A single card with the numbers to call and the two things to do', 'phone', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Fire, first-aid and rescue demonstrations are given only by qualified, insured trainers. Sambramo provides none, certifies none, and follows the trainer’s own safety plan for any live demonstration.' },
    timeline: {
      before: ['Trainer qualifications and insurance seen and recorded', 'The trainer’s own safety plan obtained for any live demonstration', 'Material written by the trainers and translated'],
      during: ['Demonstration area cleared and stewarded before anything starts', 'Public held behind the line throughout', 'Takeaway card given to everyone who attends'],
      after: ['Area made safe and cleared', 'Any equipment returned to the trainers', 'Follow-up contacts given by the trainers, not by us'],
    },
    checklist: ['Trainer qualifications and insurance recorded', 'Trainer’s own safety plan for live demos', 'Cleared and stewarded demonstration area', 'Material in the right languages'],
  }),
]

export const COMMUNITY_BLUEPRINT = Object.fromEntries(COMMUNITY_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(COMMUNITY_BLUEPRINTS, 'community')
