/**
 * Virtual & Hybrid Events — one blueprint per occasion.
 *
 * Twenty occasions where the platform is the venue. What that changes:
 *
 *   · The platform licence, the domain and the attendee data belong to
 *     the organiser. We never host an account on anyone's behalf and
 *     never claim a platform is included.
 *   · Nothing is recorded, streamed or published without the consent of
 *     the people in frame. A recording that will be shared is declared
 *     before it starts, not after.
 *   · Registration data is personal data. It is collected for one stated
 *     purpose, held by the organiser, and never passed to a sponsor or
 *     a partner unless the attendee agreed to that.
 *   · Accessibility is part of the build, not an upgrade. Captions, a
 *     transcript and a readable screen are planned from the start.
 *   · In a hybrid room, the people online are an audience, not an
 *     afterthought: a dedicated camera, a dedicated microphone and
 *     somebody whose only job is the remote side.
 *   · Attendance is reported as counted. We never inflate a number, and
 *     we never present a registration as an attendance.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, checkTrades,
  CAKE_Q, DIET_ONLY,
} from './blueprintKit'

/* ── The questions a virtual or hybrid event asks ───────────────── */

const ONLINE_SIZE = Q('online_count', 'How many people online?', 'select', {
  options: [['30', 'Up to 30'], ['150', 'Up to 150'], ['600', 'Up to 600'], ['3000', 'Up to 3,000'], ['big_o', 'More than 3,000']],
})
const PLATFORM = Q('platform', 'Which platform?', 'one', {
  options: [['have', 'We have one'], ['choose', 'Please help us choose'], ['custom', 'A custom streaming page'], ['social', 'A social or video platform']],
  help: 'The licence and the account stay yours. We build the event on it; we never host it on your behalf.',
})
const ROOM = Q('room', 'Is there a room as well?', 'one', {
  options: [['none', 'Fully online'], ['small', 'A small room'], ['big', 'A full audience in the room'], ['studio', 'A studio with no audience']],
})
const FROM_WHERE = Q('broadcast_from', 'Where does it go out from?', 'one', {
  options: [['studio', 'A studio'], ['office', 'An office'], ['venue_o', 'The event venue'], ['home', 'People’s own homes'], ['mixed_o', 'A mix']],
})
const SPEAKERS = Q('speakers', 'How many people are presenting?', 'select', {
  options: [['1', 'One'], ['3', 'Two or three'], ['8', 'Up to eight'], ['many_s', 'More than eight']],
})
const REMOTE_SPEAKERS = Q('remote_speakers', 'Are any of them joining remotely?', 'yesno', { optional: true })
const RECORD = Q('record', 'Is it recorded?', 'one', {
  options: [['share', 'Yes, and shared afterwards'], ['internal', 'Recorded, kept internal'], ['no_rec', 'Not recorded']],
  help: 'Everyone in frame is told before it starts, and anyone who does not want to be recorded is given a way not to be.',
})
const REGISTER = Q('registration', 'How do people get in?', 'one', {
  options: [['open', 'An open link'], ['register', 'Registration'], ['invite_o', 'Invitation only'], ['ticket_o', 'Ticketed']],
})
const ACCESS = Q('access', 'Accessibility', 'many', {
  optional: true,
  options: [['captions', 'Live captions'], ['transcript', 'A transcript'], ['sign', 'Sign language'], ['translate', 'Another language'], ['none_a', 'None needed']],
})
const INTERACT = Q('interaction', 'How do people take part?', 'many', {
  optional: true,
  options: [['qa', 'Q&A'], ['polls_i', 'Polls'], ['chat', 'Chat'], ['breakouts', 'Breakout rooms'], ['networking', 'Networking'], ['watch', 'They just watch']],
})
const TECH = Q('tech', 'What does the production need?', 'many', {
  optional: true,
  options: [['cameras', 'Cameras'], ['switcher', 'A vision mix'], ['screens', 'Screens in the room'], ['prompter', 'A teleprompter'], ['lighting_t', 'Lighting'], ['graphics', 'Graphics and titles']],
})
const BACKUP = Q('backup', 'What should be backed up?', 'many', {
  optional: true,
  options: [['internet', 'A second internet line'], ['power_b', 'Power'], ['operator', 'A second operator'], ['recording_b', 'A local recording']],
  help: 'A connection or a power cut takes a virtual event off the air completely. A backup is cheap next to that.',
})
const REHEARSE = Q('rehearsal', 'Do you want a technical rehearsal?', 'yesno', { optional: true })
const BRAND = Q('branding', 'Do you need branded graphics or printed material?', 'yesno', { optional: true })
const ROOM_FOOD = Q('room_food', 'Food for the room', 'one', {
  optional: true, when: [ans('room', 'small', 'big', 'studio')],
  options: [['meal_r', 'A meal'], ['refresh_r', 'Refreshments'], ['crew_r', 'Crew and speakers only'], ['none_r', 'Nothing needed']],
})

const WHEN_HYBRID = [ans('room', 'small', 'big')]
const WHEN_AUDIENCE = [ans('room', 'big')]
const WHEN_IN_ROOM = [ans('room', 'small', 'big', 'studio')]
const WHEN_REC = [ans('record', 'share', 'internal')]
const WHEN_SHARED = [ans('record', 'share')]
const WHEN_ACCESS = [some(ans('access', 'captions', 'transcript', 'sign', 'translate'))]
const WHEN_REG = [ans('registration', 'register', 'invite_o', 'ticket_o')]
const WHEN_TICKETED = [ans('registration', 'ticket_o')]
const WHEN_INTERACT = [ans('interaction', 'qa', 'polls_i', 'chat', 'breakouts', 'networking')]
const WHEN_BREAKOUT = [ans('interaction', 'breakouts', 'networking')]
const WHEN_TECH = [has('tech')]
const WHEN_SCREENS = [ans('tech', 'screens')]
const WHEN_LIT = [ans('tech', 'lighting_t')]
const WHEN_GRAPHICS = [ans('tech', 'graphics')]
const WHEN_BACKUP = [has('backup')]
const WHEN_REHEARSE = [ans('rehearsal', 'yes')]
const WHEN_BRAND = [ans('branding', 'yes')]
const WHEN_FOOD_R = [ans('room_food', 'meal_r', 'refresh_r', 'crew_r')]
const WHEN_PLATFORM_HELP = [ans('platform', 'choose', 'custom')]
const WHEN_HOME = [ans('broadcast_from', 'home', 'mixed_o')]
const WHEN_SET = [ans('broadcast_from', 'studio', 'office', 'venue_o')]
const WHEN_MANY_SPEAK = [ans('speakers', '8', 'many_s')]
const WHEN_REMOTE_SPEAK = [ans('remote_speakers', 'yes')]
const WHEN_BIG_O = [ans('online_count', '600', '3000', 'big_o')]

export const ONLINE_BLUEPRINTS = [

  B('virtual-conference', 'Run it online', 'Several sessions, many speakers, and an audience one click from leaving.', {
    about: 'A conference with no room. Attention is the scarce thing, so the programme is shorter than a physical one and the production has to be clean enough to hold people.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, REMOTE_SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Put it on air', 'Cameras, sound, vision mixing and the stream itself'),
      S('anchor_mc', 'recommended', 'Hold it', 'A host to open, link the sessions and keep to time'),
      S('videography', 'conditional', 'Record it', 'A clean recording, cut into sessions afterwards', { when: WHEN_REC }),
      S('guest_services', 'conditional', 'Let them in', 'Registration, joining links and help for anyone stuck', { when: WHEN_REG }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting so speakers are lit rather than merely visible', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('event_equipment_rental', 'conditional', 'Build the set', 'A set, backdrop and screens for the broadcast position', { when: [some(WHEN_SCREENS[0], WHEN_SET[0])] }),
      S('invitation_printing', 'conditional', 'Brand it', 'Titles, lower thirds, holding slides and the invitation', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line, which is what keeps you live', { when: WHEN_BACKUP }),
      S('end_to_end_event_logistics', 'conditional', 'Run the day', 'A running order, a rehearsal and a crew that works to both', { when: [some(WHEN_REHEARSE[0], WHEN_MANY_SPEAK[0])] }),
      S('venue', 'conditional', 'Find a studio', 'A studio or room to broadcast from, with a line that holds', { when: WHEN_SET }),
    ],
    addons: [
      X('platform_licence', 'Licence it', 'The platform licence taken in your own name, sized to the audience', 'invite', { experience: true, when: WHEN_PLATFORM_HELP }),
      X('live_captions', 'Caption it', 'Live captions and a transcript, which also make the recording searchable', 'mic', { experience: true, when: WHEN_ACCESS }),
      X('moderator', 'Moderate it', 'Someone on chat and Q&A whose only job is the people online', 'group', { experience: true, when: WHEN_INTERACT }),
      X('tech_rehearsal', 'Rehearse it', 'Every speaker through their own setup before the day', 'schedule', { experience: true, when: WHEN_REHEARSE }),
    ],
    toolkit: { polls: ['date'], note: 'The platform licence, the account and the attendee data stay yours. We never host an account on your behalf, and attendance is reported as counted.' },
    timeline: {
      before: ['Platform licence confirmed in your name and sized to the audience', 'Every speaker rehearsed on their own connection and camera', 'Recording and captions declared on the registration page'],
      during: ['A moderator on chat and Q&A throughout', 'Sessions kept to time — online audiences leave when they overrun', 'Backup line and local recording running from the start'],
      after: ['Recording cut and shared only as the consent allowed', 'Attendance reported as counted, never as registrations', 'Registration data kept only for the stated purpose'],
    },
    checklist: ['Platform licence in your own name', 'Speakers rehearsed on their own setup', 'Captions and a transcript', 'Backup line and local recording'],
  }),

  B('hybrid-conference', 'Run both rooms', 'A room and an audience online, each needing its own production.', {
    about: 'Two events running at once. The common failure is treating the online audience as a camera pointed at the room: they need their own feed, their own host and their own way in.',
    formats: ['hybrid'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, REMOTE_SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, ROOM_FOOD, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Feed both', 'Room sound and screens plus a separate feed built for the stream'),
      S('anchor_mc', 'recommended', 'Host both', 'A host in the room and someone speaking to the people online'),
      S('event_equipment_rental', 'recommended', 'Build it', 'Stage, screens, camera positions and the broadcast gallery'),
      S('videography', 'conditional', 'Record it', 'A multi-camera record, cut into sessions afterwards', { when: WHEN_REC }),
      S('guest_services', 'recommended', 'Admit both', 'Room registration and online joining, counted separately'),
      S('catering_food', 'conditional', 'Feed the room', 'Food for the room, the speakers and the crew', { when: WHEN_FOOD_R }),
      S('event_lighting', 'recommended', 'Light both', 'Lighting that works for the room and the camera at once'),
      S('invitation_printing', 'conditional', 'Brand it', 'Signage, badges, titles and holding slides', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second internet line into the gallery', { when: WHEN_BACKUP }),
      S('tent_furniture', 'conditional', 'Seat the room', 'Seating laid out so the camera never shoots empty chairs', { when: WHEN_AUDIENCE }),
      S('end_to_end_event_logistics', 'recommended', 'Run the day', 'One running order both rooms work to, rehearsed beforehand'),
      S('venue', 'conditional', 'Find the room', 'A room with the power, rigging and connection a broadcast needs', { when: WHEN_SET }),
    ],
    addons: [
      X('remote_host', 'Speak to them', 'A host whose only audience is online, so they are not an afterthought', 'mic', { experience: true }),
      X('online_questions', 'Let them in', 'Online questions put into the room, not just read in chat', 'group', { experience: true, when: WHEN_INTERACT }),
      X('room_mics', 'Mic the room', 'Audience microphones, because the stream hears nothing otherwise', 'sound_av', { trade: 'sound_av', when: WHEN_AUDIENCE }),
      X('connection_test', 'Test the line', 'The venue’s actual upload speed tested, not the number quoted', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The platform licence and the attendee data stay yours. Room and online attendance are counted and reported separately, never added together as one number.' },
    timeline: {
      before: ['Venue upload speed tested on site, not taken from a brochure', 'Separate running order checks for room and stream', 'Recording and captions declared at registration'],
      during: ['A dedicated host and moderator for the online audience', 'Audience microphones live so the stream hears the room', 'Backup line and local recording running throughout'],
      after: ['Room and online attendance reported separately, as counted', 'Recording shared only as the consent allowed', 'Registration data kept for the stated purpose only'],
    },
    checklist: ['Venue upload speed tested on site', 'A host for the online audience', 'Audience microphones for the stream', 'Attendance counted separately'],
  }),

  B('online-workshop', 'Teach it live', 'Small, participatory, and ruined by anyone being talked at.', {
    about: 'Numbers are deliberately small because everyone takes part. The materials, the breakouts and someone handling the technology are what let the facilitator actually teach.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Set them up', 'Camera, sound and screen sharing that works for a facilitator'),
      S('guest_services', 'recommended', 'Support them', 'Joining links, a check-in and help for anyone who cannot get in'),
      S('event_materials_supplier', 'conditional', 'Send materials', 'Workbooks or a kit posted out before the session', { when: WHEN_BRAND }),
      S('videography', 'conditional', 'Record it', 'A recording for participants who could not attend', { when: WHEN_REC }),
      S('anchor_mc', 'conditional', 'Co-host it', 'A co-host on chat and breakouts so the facilitator can teach', { when: WHEN_INTERACT }),
      S('event_lighting', 'conditional', 'Light them', 'Lighting for the facilitator, which a laptop camera needs', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('invitation_printing', 'conditional', 'Print it', 'Slides, handouts and certificates of attendance', { when: WHEN_BRAND }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line for the facilitator', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a room', 'A quiet room to teach from, with a connection that holds', { when: WHEN_SET }),
    ],
    addons: [
      X('cap_the_room', 'Keep it small', 'A hard cap on numbers, because a workshop stops working above it', 'poll', { experience: true }),
      X('breakout_plan', 'Split them', 'Breakout groups planned in advance, with a brief for each', 'group', { experience: true, when: WHEN_BREAKOUT }),
      X('materials_early', 'Send it early', 'Materials arriving before the session, not linked during it', 'invite', { trade: 'event_materials_supplier', when: WHEN_BRAND }),
      X('platform_licence', 'Licence it', 'A licence that allows breakouts and the length you actually need', 'invite', { experience: true, when: WHEN_PLATFORM_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'The platform licence stays yours, and the licence has to allow breakouts and the full session length. We award no certification ourselves; any certificate is yours.' },
    timeline: {
      before: ['Numbers capped and materials sent out in advance', 'Breakout groups and briefs prepared', 'Facilitator rehearsed on the actual platform and licence'],
      during: ['A co-host on chat so the facilitator only teaches', 'Breakouts started and closed to time', 'Anyone locked out helped in by a named contact'],
      after: ['Recording shared only with those who consented to appear', 'Materials and any certificates sent out', 'Participant data kept for the stated purpose only'],
    },
    checklist: ['A hard cap on numbers', 'Materials sent before the session', 'Breakout briefs prepared', 'A co-host on chat'],
  }),

  B('virtual-product-launch', 'Launch it live', 'One moment, going out to people who will judge the production.', {
    about: 'A launch is a broadcast, not a meeting. It is rehearsed, it is short, the embargo holds until it goes live, and the thing being launched has to look as good on camera as in the room.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, REMOTE_SPEAKERS, RECORD, REGISTER, ACCESS, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Broadcast it', 'Multi-camera, vision mixing, graphics and the stream'),
      S('event_equipment_rental', 'recommended', 'Build the set', 'A set, product plinth, backdrop and screens'),
      S('event_lighting', 'recommended', 'Light it', 'Lighting for the product first and the speaker second'),
      S('videography', 'recommended', 'Record it', 'A master record and short cuts for afterwards'),
      S('anchor_mc', 'conditional', 'Present it', 'A presenter who can hold a camera for twenty minutes', { when: [notAns('speakers', '1')] }),
      S('photography', 'conditional', 'Shoot stills', 'Product and event stills for press and the website', { when: WHEN_BRAND }),
      S('invitation_printing', 'conditional', 'Brand it', 'Titles, graphics, the invitation and the press kit', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('guest_services', 'conditional', 'Admit them', 'Registration, press access and a joining check beforehand', { when: WHEN_REG }),
      S('power_cooling', 'recommended', 'Keep it up', 'Backup power and a second line — a launch cannot drop'),
      S('end_to_end_event_logistics', 'conditional', 'Run it', 'A rehearsed running order to the second', { when: WHEN_REHEARSE }),
      S('venue', 'conditional', 'Find a studio', 'A studio with the rigging, power and line a launch needs', { when: WHEN_SET }),
    ],
    addons: [
      X('full_rehearsal', 'Rehearse it', 'A full run on the real set with the real product', 'schedule', { experience: true }),
      X('product_lighting', 'Light it right', 'A lighting pass on the product alone, before the speaker', 'lighting', { trade: 'event_lighting' }),
      X('embargo_plan', 'Hold the line', 'Who may say what, and when — agreed before anyone is briefed', 'invite', { experience: true }),
      X('cut_downs', 'Cut it short', 'Short clips from the master, ready the same day', 'camera', { trade: 'videography', when: WHEN_SHARED }),
    ],
    toolkit: { polls: ['date'], note: 'We make no claim about the product and write no copy about it. The embargo, the claims and the press list are yours.' },
    timeline: {
      before: ['Full rehearsal on the real set with the real product', 'Backup power and a second line tested live', 'Embargo and press list agreed in writing'],
      during: ['Running order held to the second', 'Local recording running alongside the stream', 'Someone watching the stream as a viewer would see it'],
      after: ['Master and short cuts delivered the same day', 'Attendance reported as counted', 'Set struck and the product returned securely'],
    },
    checklist: ['Full rehearsal on the real set', 'Product lit before the speaker', 'Backup power and second line', 'Embargo agreed in writing'],
  }),

  B('webinar', 'Say it once', 'One speaker, one topic, forty minutes, and a Q&A at the end.', {
    about: 'The simplest format here and the easiest to get wrong, because it is usually left to a laptop. Decent sound, a lit face and someone else handling the chat is the whole difference.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, BRAND, TECH, BACKUP, REHEARSE],
    plan: [
      S('sound_av', 'recommended', 'Sound first', 'A proper microphone and a camera above eye line'),
      S('guest_services', 'conditional', 'Register them', 'Registration, reminders and joining help on the day', { when: WHEN_REG }),
      S('anchor_mc', 'conditional', 'Chair it', 'A chair to introduce, run the Q&A and close on time', { when: WHEN_INTERACT }),
      S('videography', 'conditional', 'Record it', 'A clean recording to send to everyone who registered', { when: WHEN_REC }),
      S('event_lighting', 'conditional', 'Light them', 'One light, which is the single biggest visible improvement', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('invitation_printing', 'conditional', 'Dress it', 'Slides, titles and the registration page’s graphics', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line for the speaker', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a room', 'A quiet room that does not echo and has a stable line', { when: WHEN_SET }),
    ],
    addons: [
      X('sound_check', 'Check sound', 'A microphone test recorded and listened back to, not assumed', 'sound_av', { trade: 'sound_av' }),
      X('chat_handler', 'Watch the chat', 'Someone on chat, so the speaker never reads it mid-sentence', 'group', { experience: true, when: WHEN_INTERACT }),
      X('finish_early', 'Plan it short', 'A forty-minute plan for an hour, because overruns lose the room', 'schedule', { experience: true }),
      X('follow_up', 'Send it on', 'The recording and slides sent within a day, while it matters', 'invite', { trade: 'videography', when: WHEN_SHARED }),
    ],
    toolkit: { polls: ['date'], note: 'The platform licence and the registration list stay yours. Attendance is reported as counted, never as the number who registered.' },
    timeline: {
      before: ['Microphone and camera tested and the recording listened back to', 'Reminders scheduled, because registrations do not become attendance', 'Chat and Q&A handler briefed'],
      during: ['Speaker lit and mic’d, chat handled by somebody else', 'Q&A run as a chaired section, not a free-for-all', 'Local recording running alongside the stream'],
      after: ['Recording and slides sent within a day', 'Attendance reported as counted', 'Registration data kept for the stated purpose only'],
    },
    checklist: ['Microphone tested and listened back', 'One light on the speaker', 'A chat handler', 'Recording sent within a day'],
  }),

  B('virtual-awards-ceremony', 'Give them out', 'Winners at home, which makes the reveal and the trophy the hard parts.', {
    about: 'The moment of winning is the event, and online it has to be engineered: winners pre-warned only as far as the format allows, a package in their hands, and a clean clip they can share.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, REMOTE_SPEAKERS, RECORD, REGISTER, ACCESS, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Broadcast it', 'Cameras, vision mixing, graphics and the stream'),
      S('anchor_mc', 'recommended', 'Announce them', 'A host who can carry the reveals and the names correctly'),
      S('gifts_favours', 'recommended', 'Send trophies', 'Trophies and certificates despatched to reach winners in time'),
      S('videography', 'recommended', 'Record it', 'A master record and a clip per winner to share'),
      S('event_lighting', 'conditional', 'Light the set', 'Lighting for the host position and the award moment', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('event_equipment_rental', 'conditional', 'Build the set', 'A set, backdrop and screens for the announcements', { when: [some(WHEN_SCREENS[0], WHEN_SET[0])] }),
      S('invitation_printing', 'conditional', 'Print it', 'Certificates, citations, titles and the nomination graphics', { when: WHEN_BRAND }),
      S('guest_services', 'conditional', 'Bring them in', 'Nominee links, briefings and someone standing by for each', { when: WHEN_REG }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line, because a reveal cannot drop', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a studio', 'A studio for the host, with the look an awards night needs', { when: WHEN_SET }),
    ],
    addons: [
      X('name_check', 'Say it right', 'Every winner’s name checked with them for pronunciation', 'mic', { experience: true }),
      X('trophy_timing', 'Post it early', 'Trophies despatched to arrive before the ceremony, sealed', 'gift', { trade: 'gifts_favours' }),
      X('winner_clip', 'Clip it', 'A clip of each win, sent to the winner the same day', 'camera', { trade: 'videography', when: WHEN_SHARED }),
      X('standby_line', 'Stand them by', 'Each nominee held on a line so a win is not met by silence', 'group', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The judging, the categories and the results are yours. We never influence a result, never reveal one early, and never present our own as an endorsement.' },
    timeline: {
      before: ['Every name checked with the winner for pronunciation and spelling', 'Trophies despatched sealed, to arrive before the ceremony', 'Nominees briefed on how to join and when to be ready'],
      during: ['Nominees held on standby so a win is answered immediately', 'Results kept sealed until announced on air', 'Local recording running alongside the stream'],
      after: ['A clip per winner sent the same day', 'Results published as announced', 'Any unclaimed trophies tracked and delivered'],
    },
    checklist: ['Names checked for pronunciation', 'Trophies arrive before the ceremony', 'Nominees on standby', 'A clip per winner'],
  }),

  B('hybrid-corporate-town-hall', 'Tell everyone', 'One message to a room and to everyone working elsewhere.', {
    about: 'An internal broadcast where trust is the output. People notice whether the questions are real, whether the remote offices can hear, and whether anything was edited out afterwards.',
    formats: ['hybrid'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, REMOTE_SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, BRAND, TECH, BACKUP, ROOM_FOOD],
    plan: [
      S('sound_av', 'recommended', 'Reach both', 'Room sound and screens, and a separate feed for everyone remote'),
      S('event_equipment_rental', 'conditional', 'Set the room', 'A stage, screens and camera positions in the room', { when: WHEN_IN_ROOM }),
      S('anchor_mc', 'conditional', 'Chair it', 'A chair to run the questions so leadership can answer them', { when: WHEN_INTERACT }),
      S('videography', 'conditional', 'Record it', 'A recording for colleagues in other time zones', { when: WHEN_REC }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting that works for the room and the camera together', { when: [some(WHEN_LIT[0], WHEN_AUDIENCE[0])] }),
      S('guest_services', 'conditional', 'Admit them', 'Room sign-in and an internal joining link with help on hand', { when: WHEN_REG }),
      S('catering_food', 'conditional', 'Feed the room', 'Refreshments for the room and for the crew', { when: WHEN_FOOD_R }),
      S('invitation_printing', 'conditional', 'Brand it', 'Slides, titles and signage in the company’s own style', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line into the room', { when: WHEN_BACKUP }),
      S('tent_furniture', 'conditional', 'Seat the room', 'Seating that fills the frame and leaves aisles for microphones', { when: WHEN_AUDIENCE }),
      S('venue', 'conditional', 'Find the room', 'A room with the connection and power a broadcast needs', { when: WHEN_SET }),
    ],
    addons: [
      X('question_route', 'Take real ones', 'A route for questions from remote staff, including unscreened ones', 'group', { experience: true, when: WHEN_INTERACT }),
      X('remote_audio', 'Let them hear', 'Audio checked from a remote office, not from the room', 'sound_av', { trade: 'sound_av' }),
      X('captions_internal', 'Caption it', 'Captions and a transcript, which also serve other time zones', 'mic', { experience: true, when: WHEN_ACCESS }),
      X('unedited_record', 'Keep it whole', 'The recording published unedited, or the edits stated', 'camera', { trade: 'videography', when: WHEN_REC }),
    ],
    toolkit: { polls: ['date'], note: 'What is said and what is answered is yours. We will not screen questions to remove difficult ones, and if a recording is edited we say so rather than quietly cutting it.' },
    timeline: {
      before: ['Audio and video checked from a remote office, not from the room', 'Question route opened to remote staff in advance', 'Captions and transcript arranged'],
      during: ['Questions taken from remote staff as well as the room', 'Microphones in the aisles so the stream hears the room', 'Local recording running alongside the stream'],
      after: ['Recording published unedited, or the edits stated plainly', 'Unanswered questions answered in writing', 'Attendance reported as counted'],
    },
    checklist: ['Audio checked from a remote office', 'A question route for remote staff', 'Captions and transcript', 'Recording unedited or edits stated'],
  }),

  B('online-graduation-celebration', 'Call the name', 'A ceremony for families who cannot be in the hall.', {
    about: 'Families watch for one name. Getting the pronunciation right, holding the camera on the moment, and sending a clip of it afterwards is most of what this event is.',
    formats: ['virtualSocial'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, TECH, BACKUP, CAKE_Q, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Put it on air', 'Cameras, sound and a stream families can actually watch'),
      S('anchor_mc', 'recommended', 'Read the names', 'A host who has checked every name before reading it'),
      S('videography', 'recommended', 'Record it', 'A master record and a clip of each graduate’s moment'),
      S('gifts_favours', 'conditional', 'Send something', 'Certificates, stoles or mementoes despatched to each home', { when: WHEN_BRAND }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the podium and the certificate moment', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('event_equipment_rental', 'conditional', 'Set it up', 'A podium, backdrop and screens for the ceremony', { when: [some(WHEN_SCREENS[0], WHEN_SET[0])] }),
      S('invitation_printing', 'conditional', 'Print it', 'Certificates, programmes and the family invitation', { when: WHEN_BRAND }),
      S('cake_desserts', 'conditional', 'Mark it', 'A cake sent to each graduate, or one for the room', { when: [notAns('cake', 'no')] }),
      S('guest_services', 'conditional', 'Let them in', 'Joining links for families, with help for anyone struggling', { when: WHEN_REG }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line — families get one chance', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find the hall', 'A hall or studio to hold the ceremony from', { when: WHEN_SET }),
    ],
    addons: [
      X('name_check', 'Say it right', 'Every name checked with the graduate, including the spelling', 'mic', { experience: true }),
      X('family_clip', 'Send the moment', 'A clip of each name being read, sent to that family', 'camera', { trade: 'videography', when: WHEN_SHARED }),
      X('elder_help', 'Help them watch', 'A simple joining note for grandparents, with a number to call', 'invite', { experience: true }),
      X('slow_reading', 'Slow it down', 'Names read slowly, because speed is what ruins this ceremony', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The names, the results and the awarding are the institution’s. We never award or certify anything ourselves.' },
    timeline: {
      before: ['Every name checked with the graduate for pronunciation and spelling', 'Joining notes sent to families with a number to call', 'Mementoes despatched to arrive before the ceremony'],
      during: ['Names read slowly, with the camera held on the moment', 'A dedicated line for families who cannot get in', 'Local recording running alongside the stream'],
      after: ['A clip per graduate sent to their family', 'Recording shared as consented', 'Any undelivered mementoes tracked'],
    },
    checklist: ['Every name checked with the graduate', 'Joining notes for families', 'Names read slowly', 'A clip per graduate'],
  }),

  B('virtual-family-reunion', 'Get them on', 'Three generations, several time zones and varying confidence with this.', {
    about: 'The technology is the barrier, not the budget. Someone phoning the least confident relative beforehand does more for this event than any production can.',
    formats: ['virtualSocial'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, CAKE_Q, BRAND],
    plan: [
      S('guest_services', 'recommended', 'Get them on', 'A call to every household beforehand and a helper during'),
      S('anchor_mc', 'conditional', 'Keep it moving', 'Someone to run the order so it is not all one voice', { when: [notAns('speakers', '1')] }),
      S('videography', 'conditional', 'Record it', 'A recording for the family, and for those who could not join', { when: WHEN_REC }),
      S('sound_av', 'conditional', 'Make it clear', 'Sound and screens wherever the family gathers in a room', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('cake_desserts', 'conditional', 'Send cake', 'Cake delivered to each household, cut at the same moment', { when: [notAns('cake', 'no')] }),
      S('catering_food', 'conditional', 'Feed the room', 'Food wherever part of the family is together', { when: WHEN_FOOD_R }),
      S('invitation_printing', 'conditional', 'Invite them', 'Invitations and a one-page joining note for every household', { when: WHEN_BRAND }),
      S('gifts_favours', 'conditional', 'Send something', 'A small thing to each household, opened together on the call', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Capture it', 'A screen portrait of everyone, which becomes the keepsake', { when: WHEN_REC }),
      S('venue', 'conditional', 'Find a room', 'A room wherever the largest group is gathering', { when: WHEN_SET }),
    ],
    addons: [
      X('practice_call', 'Practise it', 'A short call with each household a day or two before', 'group', { experience: true }),
      X('screen_portrait', 'Photograph it', 'A full-screen portrait of every face, taken and sent round', 'camera', { trade: 'photography' }),
      X('one_at_a_time', 'Take turns', 'An order for who speaks, because everyone at once works for nobody', 'schedule', { experience: true, when: WHEN_INTERACT }),
      X('simultaneous_cake', 'Cut together', 'Cake in every house, cut at the same moment', 'cake', { trade: 'cake_desserts', when: [notAns('cake', 'no')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A recording of a family call is shared only with the family, and only if everyone on it agreed.' },
    timeline: {
      before: ['A practice call with each household, especially the least confident', 'A one-page joining note sent, with a number to call', 'Cake and parcels despatched to arrive in time'],
      during: ['An order for who speaks, so it is not everyone at once', 'A screen portrait taken while everyone is on', 'Someone on hand to help anyone who drops off'],
      after: ['Portrait and recording shared with the family, as agreed', 'Anyone who could not join sent the recording', 'Nothing posted publicly without asking'],
    },
    checklist: ['A practice call per household', 'A one-page joining note', 'An order for who speaks', 'A screen portrait taken'],
  }),

  B('livestream-concert', 'Play it out', 'A performance where the stream is the audience and the rights matter.', {
    about: 'Two things decide whether this happens: the performance rights for what is played, and a connection that will hold a high bitrate for the whole set. Both are settled before the line-up.',
    formats: ['livestream'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Mix it twice', 'A room mix and a separate broadcast mix, which are not the same'),
      S('event_lighting', 'recommended', 'Light for it', 'Lighting built for the camera, not for a dark venue'),
      S('videography', 'recommended', 'Shoot it', 'Multi-camera coverage, cut live and recorded clean'),
      S('live_entertainment', 'conditional', 'Book the act', 'An act for a camera audience, which is its own skill', { when: [notAns('speakers', '1')] }),
      S('event_equipment_rental', 'recommended', 'Build it', 'Stage, risers, backline positions and camera platforms'),
      S('power_cooling', 'recommended', 'Keep it up', 'Backup power and a second line — a set cannot be restarted'),
      S('guest_services', 'conditional', 'Admit them', 'Ticketing, access links and support while it is live', { when: WHEN_REG }),
      S('invitation_printing', 'conditional', 'Brand it', 'Titles, holding cards and the artwork for the stream page', { when: [some(WHEN_BRAND[0], WHEN_GRAPHICS[0])] }),
      S('tent_furniture', 'conditional', 'Seat the room', 'Seating for whatever audience is in the room', { when: WHEN_AUDIENCE }),
      S('security_services', 'conditional', 'Control it', 'Stewarding for the room audience and the backstage area', { when: WHEN_AUDIENCE }),
      S('venue', 'conditional', 'Find the room', 'A venue with the power, acoustics and upload a stream needs', { when: WHEN_SET }),
    ],
    addons: [
      X('music_rights', 'Clear the set', 'Performance and streaming rights cleared for every piece played', 'invite', { experience: true }),
      X('broadcast_mix', 'Mix for them', 'A dedicated broadcast mix, because a room mix sounds wrong online', 'sound_av', { trade: 'sound_av' }),
      X('bitrate_test', 'Test the line', 'A sustained upload test at the real bitrate, for the full set length', 'schedule', { experience: true }),
      X('ticket_window', 'Hold the link', 'Access links that work only for ticket holders, and a replay window', 'invite', { trade: 'guest_services', when: WHEN_TICKETED }),
    ],
    toolkit: { polls: ['date'], note: 'Performance and streaming rights for the music are the promoter’s to clear. We never suggest pyrotechnics or flame effects, and we never inflate a viewer number.' },
    timeline: {
      before: ['Streaming and performance rights cleared for every piece', 'Sustained upload tested at the real bitrate for the set length', 'Broadcast mix and camera plan rehearsed with the act'],
      during: ['Broadcast mix monitored separately from the room', 'Local recording running at full quality', 'Someone watching the stream as a viewer sees it'],
      after: ['Replay published only within the cleared rights window', 'Viewer numbers reported as counted', 'Stage struck and the venue reinstated'],
    },
    checklist: ['Streaming rights cleared', 'A separate broadcast mix', 'Sustained bitrate test', 'Local recording at full quality'],
  }),

  B('virtual-networking-event', 'Introduce them', 'Strangers online, where nothing happens unless the format forces it.', {
    about: 'An open room with no structure is silence. Timed pairings, a host who makes introductions and a short overall length are what make this work at all.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BACKUP, BRAND],
    plan: [
      S('anchor_mc', 'recommended', 'Introduce them', 'A host to open, pair people off and keep the rounds moving'),
      S('guest_services', 'recommended', 'Admit them', 'Registration, joining help and a list of who is in the room'),
      S('sound_av', 'conditional', 'Carry it', 'Sound, camera and screens for the hosted part', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('invitation_printing', 'conditional', 'Brand it', 'Joining graphics, name cards and a one-page attendee list', { when: WHEN_BRAND }),
      S('videography', 'conditional', 'Record part', 'The hosted part recorded; the conversations are not', { when: WHEN_REC }),
      S('event_lighting', 'conditional', 'Light the host', 'Lighting for the host position', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('catering_food', 'conditional', 'Feed the room', 'Refreshments wherever people are gathered in person', { when: WHEN_FOOD_R }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line for the host', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a room', 'A room for the hosted part, if it is not from a desk', { when: WHEN_SET }),
    ],
    addons: [
      X('timed_rounds', 'Time the rounds', 'Short timed pairings, because an open room stays silent', 'schedule', { experience: true, when: WHEN_BREAKOUT }),
      X('opt_in_list', 'Share on request', 'Contact details shared only with people who opted in', 'invite', { experience: true, when: WHEN_REG }),
      X('conversation_prompt', 'Give them a line', 'A prompt per round, so nobody has to start from nothing', 'poll', { experience: true, when: WHEN_INTERACT }),
      X('no_recording', 'Leave them alone', 'The conversations not recorded, which is why people speak freely', 'camera', { experience: true, when: WHEN_REC }),
    ],
    toolkit: { polls: ['date'], note: 'Attendee contact details are shared only with people who opted in, and never sold or passed to a sponsor. Private conversations are not recorded.' },
    timeline: {
      before: ['Rounds, timings and prompts planned before the invitation goes out', 'Opt-in wording agreed for anything that will be shared', 'Platform licence checked for breakout rooms'],
      during: ['Rounds kept short and started on time', 'A prompt given for each round', 'Conversations not recorded, and said so at the start'],
      after: ['Contact details shared only between people who opted in', 'Attendance reported as counted', 'Registration data kept for the stated purpose only'],
    },
    checklist: ['Short timed rounds', 'A prompt per round', 'Opt-in before sharing details', 'Conversations not recorded'],
  }),

  B('online-training-session', 'Train them', 'A programme that has to be delivered, attended and evidenced.', {
    about: 'Different from a workshop because completion matters: attendance has to be recorded accurately, materials have to reach everyone, and the assessment is the client’s to set.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BACKUP, REHEARSE, BRAND],
    plan: [
      S('sound_av', 'recommended', 'Deliver it', 'Camera, sound and screen sharing that holds for a full session'),
      S('guest_services', 'recommended', 'Register them', 'Enrolment, joining links and accurate attendance records'),
      S('event_materials_supplier', 'conditional', 'Supply it', 'Manuals, workbooks or kit sent to every participant', { when: WHEN_BRAND }),
      S('videography', 'conditional', 'Record it', 'Session recordings that form part of the course record', { when: WHEN_REC }),
      S('anchor_mc', 'conditional', 'Co-host it', 'A co-host on chat and exercises so the trainer can train', { when: WHEN_INTERACT }),
      S('invitation_printing', 'conditional', 'Print it', 'Handouts, assessment papers and attendance certificates', { when: WHEN_BRAND }),
      S('event_lighting', 'conditional', 'Light them', 'Lighting for the trainer’s position', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line for the trainer', { when: WHEN_BACKUP }),
      S('catering_food', 'conditional', 'Feed the room', 'Refreshments wherever participants attend in person', { when: WHEN_FOOD_R }),
      S('venue', 'conditional', 'Find a room', 'A quiet room to deliver from, with a line that holds', { when: WHEN_SET }),
    ],
    addons: [
      X('attendance_record', 'Record it', 'Attendance recorded accurately, including who left early', 'poll', { experience: true, when: WHEN_REG }),
      X('materials_ahead', 'Send it early', 'Materials delivered before the first session, not during it', 'invite', { trade: 'event_materials_supplier', when: WHEN_BRAND }),
      X('platform_licence', 'Licence it', 'A licence that allows the session length and the group size', 'invite', { experience: true, when: WHEN_PLATFORM_HELP }),
      X('accessible_slides', 'Make it readable', 'Slides and documents in a readable, screen-reader-friendly form', 'mic', { experience: true, when: WHEN_ACCESS }),
    ],
    toolkit: { polls: ['date'], note: 'Any assessment, pass mark or certificate is the client’s or the awarding body’s. We record attendance accurately and never certify competence ourselves.' },
    timeline: {
      before: ['Materials delivered to every participant before the first session', 'Platform licence checked for group size and session length', 'Accessible versions of slides and documents prepared'],
      during: ['Attendance recorded accurately as people join and leave', 'A co-host on chat and exercises', 'Recordings captured for the course record'],
      after: ['Attendance records handed over exactly as taken', 'Recordings and materials issued to participants', 'Certificates issued by you, not by us'],
    },
    checklist: ['Materials before the first session', 'Licence covers group and length', 'Accurate attendance record', 'Accessible slides'],
  }),

  B('hybrid-trade-show', 'Open both', 'Exhibitors on a floor and buyers who never travelled.', {
    about: 'Exhibitors pay for leads, so the online side has to deliver real ones: a working directory, routed enquiries, and honest numbers at the end rather than flattering ones.',
    formats: ['hybrid'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, ROOM_FOOD, BRAND],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build it', 'Stands, shell schemes, screens and the demonstration spaces'),
      S('sound_av', 'recommended', 'Feed both', 'Floor audio, stage AV and a separate feed for the online floor'),
      S('guest_services', 'recommended', 'Badge them', 'Visitor registration, badges, and online access counted apart'),
      S('invitation_printing', 'recommended', 'Signpost it', 'Floor plans, stand graphics, badges and the exhibitor directory'),
      S('videography', 'conditional', 'Record it', 'Stage sessions and stand demonstrations recorded', { when: WHEN_REC }),
      S('event_lighting', 'conditional', 'Light it', 'Floor and stand lighting, and the stage for camera', { when: [some(WHEN_LIT[0], WHEN_AUDIENCE[0])] }),
      S('catering_food', 'conditional', 'Feed the floor', 'Catering for visitors, exhibitors and crew', { when: WHEN_FOOD_R }),
      S('security_services', 'conditional', 'Guard it', 'Overnight stand security and floor stewarding', { when: WHEN_AUDIENCE }),
      S('power_cooling', 'recommended', 'Power it', 'Stand power, distribution and a backup line for the stream'),
      S('loading_unloading_crew', 'conditional', 'Move it in', 'Build-up and breakdown crew across the exhibitor schedule', { when: WHEN_AUDIENCE }),
      S('end_to_end_event_logistics', 'recommended', 'Run it', 'Build, show days and breakdown to one exhibitor schedule'),
      S('venue', 'conditional', 'Find the hall', 'A hall with the floor, power and connection this needs', { when: WHEN_SET }),
    ],
    addons: [
      X('lead_routing', 'Route the leads', 'Online enquiries routed to the right exhibitor the same day', 'group', { experience: true, when: WHEN_INTERACT }),
      X('honest_numbers', 'Count it straight', 'Visitor and online figures reported as counted, separately', 'poll', { experience: true }),
      X('exhibitor_brief', 'Brief them', 'A brief telling exhibitors how the online side actually works', 'invite', { trade: 'invitation_printing' }),
      X('consent_for_leads', 'Ask first', 'Visitor details passed to an exhibitor only where the visitor agreed', 'invite', { experience: true, when: WHEN_REG }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Visitor details reach an exhibitor only where the visitor agreed to it. Floor and online numbers are reported separately and as counted — we never inflate either.' },
    timeline: {
      before: ['Exhibitor brief issued covering the online floor and lead routing', 'Consent wording agreed for anything passed to exhibitors', 'Connection and stand power tested on the real floor'],
      during: ['Online enquiries routed to exhibitors the same day', 'Floor and online attendance counted separately', 'Stage sessions streamed with their own feed and host'],
      after: ['Figures reported as counted, floor and online apart', 'Leads passed only where the visitor consented', 'Floor broken down and the hall handed back'],
    },
    checklist: ['Exhibitor brief on the online floor', 'Consent before passing leads', 'Separate counted figures', 'Stand power and line tested'],
  }),

  B('virtual-career-fair', 'Introduce them', 'Candidates and employers meeting in slots, with data that matters.', {
    about: 'Candidates are giving you their CVs and their hopes. Slots that actually happen, employers who turn up, and careful handling of personal data are the duties here.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BACKUP, BRAND],
    plan: [
      S('guest_services', 'recommended', 'Match them', 'Registration, slot booking, reminders and help on the day'),
      S('anchor_mc', 'recommended', 'Open it', 'A host to open, brief both sides and keep the slots running'),
      S('sound_av', 'conditional', 'Carry it', 'Sound, camera and screens for the hosted sessions', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('invitation_printing', 'recommended', 'Publish it', 'Employer listings, a candidate guide and joining instructions'),
      S('videography', 'conditional', 'Record talks', 'Employer talks recorded; interviews are not', { when: WHEN_REC }),
      S('event_lighting', 'conditional', 'Light the host', 'Lighting for the host and employer positions', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line, because slots cannot slip', { when: WHEN_BACKUP }),
      S('catering_food', 'conditional', 'Feed the room', 'Refreshments wherever employers attend in person', { when: WHEN_FOOD_R }),
      S('venue', 'conditional', 'Find a room', 'A room for the hosted part and the employer sessions', { when: WHEN_SET }),
    ],
    addons: [
      X('slot_booking', 'Book the slots', 'Slots booked and confirmed, with a queue when an employer runs late', 'schedule', { experience: true, when: WHEN_REG }),
      X('careful_with_cvs', 'Handle it carefully', 'CVs sent only to the employers a candidate chose', 'invite', { experience: true }),
      X('no_interview_record', 'Do not record', 'Interviews not recorded, which candidates are told in advance', 'camera', { experience: true, when: WHEN_REC }),
      X('candidate_guide', 'Prepare them', 'A short guide so candidates arrive ready, not guessing', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'A CV reaches only the employers the candidate chose. We make no hiring decision, give no reference and never pass candidate data to anyone else.' },
    timeline: {
      before: ['Slots booked and confirmed with both sides', 'Candidate guide published and reminders scheduled', 'Data handling stated plainly on the registration page'],
      during: ['Slots started on time, with a queue when an employer runs late', 'Interviews not recorded, and said so at the start', 'A contact on hand for anyone locked out'],
      after: ['CVs passed only to the employers each candidate chose', 'Attendance reported as counted', 'Candidate data deleted or retained exactly as stated'],
    },
    checklist: ['Slots booked and confirmed', 'CVs only to chosen employers', 'Interviews not recorded', 'Data handling stated upfront'],
  }),

  B('online-hackathon', 'Build it', 'Teams working through the night, judged at the end.', {
    about: 'Long, unsupervised and intense. The rules on what may be used, who owns what is built, and how judging works have to be published before anyone writes a line.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BACKUP, BRAND],
    plan: [
      S('guest_services', 'recommended', 'Run the teams', 'Registration, team forming, check-ins and support through the night'),
      S('anchor_mc', 'recommended', 'Open and judge', 'A host for the briefing, the checkpoints and the final judging'),
      S('sound_av', 'conditional', 'Carry it', 'Sound and camera for the briefing, demos and judging', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('invitation_printing', 'recommended', 'Publish rules', 'Rules, judging criteria, IP terms and the schedule'),
      S('videography', 'conditional', 'Record demos', 'Final demonstrations recorded, with each team’s consent', { when: WHEN_REC }),
      S('gifts_favours', 'conditional', 'Send prizes', 'Prizes and certificates despatched to the winning teams', { when: WHEN_BRAND }),
      S('event_lighting', 'conditional', 'Light the host', 'Lighting for the host and judging positions', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('catering_food', 'conditional', 'Feed the room', 'Food wherever teams work together in person', { when: WHEN_FOOD_R }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line for the organising side', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a room', 'A room for the briefing and the judging sessions', { when: WHEN_SET }),
    ],
    addons: [
      X('rules_first', 'Publish first', 'Rules, criteria and IP terms published before registration opens', 'invite', { trade: 'invitation_printing' }),
      X('ownership_terms', 'Say who owns it', 'Who owns what is built, stated plainly and agreed at sign-up', 'invite', { experience: true }),
      X('night_support', 'Stay reachable', 'A contact reachable through the night, because that is when it runs', 'group', { experience: true }),
      X('judge_brief', 'Brief the judges', 'Judges briefed on the criteria, and the scoring kept consistent', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The rules, the judging and the intellectual property terms are yours. We never judge, never score and never take any interest in what teams build.' },
    timeline: {
      before: ['Rules, judging criteria and IP terms published before registration', 'Judges briefed and the scoring agreed', 'A reachable contact arranged for the overnight hours'],
      during: ['Checkpoints run to the published schedule', 'Support reachable through the night', 'Demonstrations recorded only with each team’s consent'],
      after: ['Results published against the published criteria', 'Prizes despatched and tracked', 'Teams’ work left entirely with them'],
    },
    checklist: ['Rules published before registration', 'IP terms agreed at sign-up', 'Overnight contact reachable', 'Judges briefed on criteria'],
  }),

  B('virtual-fundraiser', 'Make the ask', 'An appeal where the money must go somewhere verifiable.', {
    about: 'The appeal is only as strong as the trust behind it. Donations go directly to the organisation’s own account, the purpose is stated plainly, and what reaches the cause is reported.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BACKUP, BRAND],
    plan: [
      S('anchor_mc', 'recommended', 'Make the ask', 'A host to carry the appeal and the moment of asking'),
      S('sound_av', 'recommended', 'Put it on air', 'Camera, sound and a stream that holds for the whole appeal'),
      S('videography', 'conditional', 'Tell the story', 'A short film about the cause, and the evening recorded', { when: WHEN_REC }),
      S('guest_services', 'conditional', 'Admit them', 'Registration, joining links and support during the appeal', { when: WHEN_REG }),
      S('invitation_printing', 'conditional', 'Publish it', 'Appeal material stating the cause, the purpose and the account', { when: WHEN_BRAND }),
      S('live_entertainment', 'conditional', 'Hold them', 'A performance between appeals, to keep people watching', { when: WHEN_INTERACT }),
      S('event_lighting', 'conditional', 'Light the host', 'Lighting for the host and any performance position', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('catering_food', 'conditional', 'Feed the room', 'Catering wherever supporters gather in person', { when: WHEN_FOOD_R }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line through the appeal', { when: WHEN_BACKUP }),
      S('venue', 'conditional', 'Find a room', 'A room or studio for the broadcast', { when: WHEN_SET }),
    ],
    addons: [
      X('direct_to_cause', 'Pay them direct', 'Donations going straight to the organisation’s own account', 'invite', { experience: true }),
      X('state_the_purpose', 'Say what for', 'Exactly what the money is for, stated before anyone gives', 'invite', { trade: 'invitation_printing' }),
      X('report_back', 'Report it', 'What was raised and what reached the cause, published afterwards', 'poll', { experience: true }),
      X('no_pressure', 'Ask once', 'An appeal made clearly and once, rather than pressed repeatedly', 'mic', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Donations go directly to the organisation’s own account — we never collect, hold or route money for a cause, and we are not a charity or a relief organisation.' },
    timeline: {
      before: ['Donation route set to the organisation’s own account, never ours', 'The purpose of the appeal stated plainly in the material', 'Any claim about the cause checked with the organisation'],
      during: ['The ask made clearly and once, not pressed repeatedly', 'Donation details shown on screen and in the description', 'Local recording running alongside the stream'],
      after: ['What was raised and what reached the cause published', 'Donors thanked without their details being shared', 'Recording shared as consented'],
    },
    checklist: ['Donations direct to the organisation', 'The purpose stated before giving', 'Results reported afterwards', 'One clear ask, no pressure'],
  }),

  B('hybrid-wedding', 'Let them watch', 'A wedding streamed to the family who could not travel.', {
    about: 'The ceremony belongs to the family, and the stream must not change how it is conducted. A fixed camera, a microphone on the rites and somebody hosting the people watching is enough.',
    formats: ['wedding'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, ROOM_FOOD, TECH, BACKUP, DIET_ONLY, BRAND],
    plan: [
      S('videography', 'recommended', 'Film it', 'A camera plan that serves the stream without crowding the rites'),
      S('sound_av', 'recommended', 'Carry them', 'A microphone on the ceremony, so the stream hears it clearly'),
      S('guest_services', 'recommended', 'Bring them in', 'Links for relatives, with a note and a number for the elders'),
      S('photography', 'conditional', 'Shoot it', 'Stills alongside the stream, which the family will want most', { when: WHEN_REC }),
      S('anchor_mc', 'conditional', 'Host it', 'Someone speaking to the relatives watching, between the rites', { when: [notAns('speakers', '1')] }),
      S('event_lighting', 'conditional', 'Light for it', 'Lighting that reads on camera without changing the ceremony', { when: [some(WHEN_LIT[0], WHEN_AUDIENCE[0])] }),
      S('catering_food', 'conditional', 'Feed the room', 'Catering for the guests who are there in person', { when: WHEN_FOOD_R }),
      S('invitation_printing', 'conditional', 'Invite them', 'Invitations with joining details for those watching', { when: WHEN_BRAND }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line, because a ceremony happens once', { when: WHEN_BACKUP }),
      S('event_equipment_rental', 'conditional', 'Place it', 'Camera platforms set back from the rites, and screens if wanted', { when: [some(WHEN_SCREENS[0], WHEN_SET[0])] }),
      S('venue', 'conditional', 'Check the line', 'A venue whose connection will actually hold a stream', { when: WHEN_SET }),
    ],
    addons: [
      X('fixed_camera', 'Stay back', 'A fixed camera that never comes between the family and the rites', 'camera', { trade: 'videography' }),
      X('elder_help', 'Help them watch', 'A joining note and a number for relatives who find this hard', 'invite', { experience: true }),
      X('consent_to_stream', 'Tell the guests', 'Guests told the ceremony is being streamed, before it starts', 'invite', { experience: true }),
      X('private_link', 'Keep it private', 'A private link for family only, not a public broadcast', 'invite', { trade: 'guest_services', when: WHEN_REG }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The time, the rites and who conducts them are your family’s — we never calculate an auspicious time and never assume a practitioner. Guests are told before anything is streamed.' },
    timeline: {
      before: ['Venue connection tested, not taken from a brochure', 'Joining notes and a number sent to relatives watching', 'Guests told the ceremony will be streamed'],
      during: ['A fixed camera set back, never between family and the rites', 'A microphone on the ceremony so the stream hears it', 'Local recording running in case the line drops'],
      after: ['Recording shared privately with the family', 'Nothing published publicly without asking', 'Stills delivered alongside the recording'],
    },
    checklist: ['Venue connection tested', 'A fixed camera set back', 'Guests told about the stream', 'A private, family-only link'],
  }),

  B('virtual-birthday-celebration', 'Sing it anyway', 'A birthday on a screen, which needs a reason for everyone to be there.', {
    about: 'A call is not a party. One organised moment — a cake arriving, a surprise appearance, a round of toasts — is what turns it into something people remember.',
    formats: ['virtualSocial'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, INTERACT, ROOM_FOOD, TECH, CAKE_Q, DIET_ONLY, BRAND],
    plan: [
      S('cake_desserts', 'conditional', 'Send cake', 'A cake delivered to the birthday household, timed to the call', { when: [notAns('cake', 'no')] }),
      S('guest_services', 'recommended', 'Get them on', 'Links, reminders and a hand for anyone who struggles to join'),
      S('anchor_mc', 'conditional', 'Run the moment', 'Someone to call for the song, the toasts and the surprise', { when: WHEN_INTERACT }),
      S('gifts_favours', 'conditional', 'Send something', 'Gifts or party boxes sent to each household in advance', { when: WHEN_BRAND }),
      S('videography', 'conditional', 'Record it', 'A recording of the call, kept for the family', { when: WHEN_REC }),
      S('decoration_floral', 'conditional', 'Dress it', 'Decoration where the birthday person actually sits', { when: WHEN_BRAND }),
      S('sound_av', 'conditional', 'Make it work', 'Sound and a screen wherever people gather in a room', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('live_entertainment', 'conditional', 'Surprise them', 'A performer or a quiz for the call, which gives it a shape', { when: WHEN_INTERACT }),
      S('catering_food', 'conditional', 'Feed the room', 'Food wherever part of the group is together', { when: WHEN_FOOD_R }),
      S('invitation_printing', 'conditional', 'Invite them', 'Invitations with the joining link and the time, clearly', { when: WHEN_BRAND }),
    ],
    addons: [
      X('one_moment', 'Plan one thing', 'One organised moment, because a call with no plan goes quiet', 'schedule', { experience: true }),
      X('cake_timing', 'Time the cake', 'Cake arriving just before the call, not during it', 'cake', { trade: 'cake_desserts', when: [notAns('cake', 'no')] }),
      X('frame_decor', 'Dress the frame', 'Decoration behind the birthday person, not around the room', 'balloon', { trade: 'decoration_floral', when: WHEN_BRAND }),
      X('keep_it_short', 'End it early', 'Forty minutes planned, because a long call empties out', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A recording of a private call is kept for the family and shared only with everyone’s agreement.' },
    timeline: {
      before: ['Cake and parcels timed to arrive just before the call', 'Joining link and time sent clearly, with help offered', 'One organised moment planned'],
      during: ['The song and toasts called by somebody, not left to chance', 'Decoration behind the birthday person, in frame', 'Kept short, so it ends while it is still good'],
      after: ['Recording kept for the family, shared as agreed', 'Anyone who missed it sent the recording', 'Nothing posted publicly without asking'],
    },
    checklist: ['One organised moment planned', 'Cake timed to the call', 'Decoration in frame', 'Kept to forty minutes'],
  }),

  B('online-community-meetup', 'Keep it going', 'A regular group where turning up is the whole achievement.', {
    about: 'A recurring meetup lives on being easy: the same link, the same time, a short agenda and a host who starts on time whether four people came or forty.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, ROOM_FOOD, TECH, BRAND],
    plan: [
      S('anchor_mc', 'recommended', 'Chair it', 'A host to open on time, run the agenda and close cleanly'),
      S('guest_services', 'conditional', 'Keep the list', 'The same link each time, reminders and a member list', { when: WHEN_REG }),
      S('sound_av', 'conditional', 'Carry it', 'Sound and camera for whoever is speaking', { when: [some(WHEN_TECH[0], WHEN_IN_ROOM[0])] }),
      S('videography', 'conditional', 'Record it', 'A recording for members who could not make this one', { when: WHEN_REC }),
      S('invitation_printing', 'conditional', 'Brand it', 'A simple agenda, slides and a recurring invitation', { when: WHEN_BRAND }),
      S('event_lighting', 'conditional', 'Light the host', 'Lighting for the host position', { when: [some(WHEN_LIT[0], WHEN_SET[0])] }),
      S('catering_food', 'conditional', 'Feed the room', 'Refreshments wherever members gather in person', { when: WHEN_FOOD_R }),
      S('venue', 'conditional', 'Find a room', 'A room for the occasional in-person session', { when: WHEN_SET }),
    ],
    addons: [
      X('same_link', 'Keep one link', 'The same link and time every month, which is what builds a habit', 'invite', { experience: true }),
      X('short_agenda', 'Keep it tight', 'A short agenda published in advance and finished on time', 'schedule', { experience: true }),
      X('code_of_conduct', 'Set the rules', 'A code of conduct and a named person to raise things with', 'invite', { experience: true, when: WHEN_REG }),
      X('start_on_time', 'Start anyway', 'Starting on time with whoever is there, not waiting for numbers', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The member list is yours and is never used for anything beyond this group. A recurring meetup needs almost nothing bought — mostly it needs the same link and the same time.' },
    timeline: {
      before: ['The same link and time confirmed, with a reminder scheduled', 'A short agenda published in advance', 'Code of conduct and a named contact published'],
      during: ['Started on time regardless of numbers', 'Agenda kept to and the session closed cleanly', 'Recording only if everyone present is content with it'],
      after: ['Recording or notes sent to the member list', 'Next date confirmed before people leave', 'Member list kept only for this group'],
    },
    checklist: ['The same link and time', 'A short published agenda', 'Code of conduct and a contact', 'Start on time regardless'],
  }),

  B('livestream-product-demonstration', 'Show it work', 'A live demonstration, where a failure is seen by everyone.', {
    about: 'The demonstration either works on camera or it does not. It is rehearsed on the real thing, with a second unit standing by and a plan for what the presenter says if it fails.',
    formats: ['virtual'],
    ask: [ONLINE_SIZE, PLATFORM, ROOM, FROM_WHERE, SPEAKERS, RECORD, REGISTER, ACCESS, INTERACT, TECH, BACKUP, REHEARSE],
    plan: [
      S('sound_av', 'recommended', 'Cover it', 'Cameras on the product and the presenter, mixed live'),
      S('event_lighting', 'recommended', 'Light detail', 'Lighting that shows the detail a viewer needs to see'),
      S('videography', 'recommended', 'Record it', 'A clean record, and cut-downs for the product page'),
      S('event_equipment_rental', 'conditional', 'Build it', 'A demonstration bench, backdrop and screens', { when: [some(WHEN_SCREENS[0], WHEN_SET[0])] }),
      S('anchor_mc', 'conditional', 'Present it', 'A presenter who can keep talking while the product behaves', { when: [notAns('speakers', '1')] }),
      S('guest_services', 'conditional', 'Admit them', 'Registration and a joining check for dealers or customers', { when: WHEN_REG }),
      S('photography', 'conditional', 'Shoot stills', 'Detail stills from the same setup, for the product page', { when: WHEN_REC }),
      S('power_cooling', 'conditional', 'Keep it up', 'Backup power and a second line through the demonstration', { when: WHEN_BACKUP }),
      S('invitation_printing', 'conditional', 'Caption it', 'Titles and on-screen callouts for each part shown', { when: WHEN_GRAPHICS }),
      S('venue', 'conditional', 'Find a space', 'A space where the product can run safely on camera', { when: WHEN_SET }),
    ],
    addons: [
      X('real_rehearsal', 'Rehearse it', 'The demonstration run on the real unit, start to finish', 'schedule', { experience: true, when: WHEN_REHEARSE }),
      X('second_unit', 'Have a spare', 'A second unit on the bench, ready if the first misbehaves', 'tools', { experience: true }),
      X('macro_camera', 'Show the detail', 'A close camera on the part viewers actually need to see', 'camera', { trade: 'sound_av' }),
      X('failure_script', 'Plan for failure', 'What the presenter says if it fails, agreed beforehand', 'mic', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We make no claim about what the product does and write no performance copy for it. If a demonstration is staged or pre-recorded, that is stated on screen.' },
    timeline: {
      before: ['Demonstration rehearsed on the real unit, start to finish', 'A second unit prepared and on the bench', 'What to say if it fails, agreed with the presenter'],
      during: ['A close camera on the detail that matters', 'Local recording running alongside the stream', 'Nothing presented as live if it was pre-recorded'],
      after: ['Cut-downs delivered for the product page', 'Questions answered in writing where unanswered live', 'Attendance reported as counted'],
    },
    checklist: ['Rehearsed on the real unit', 'A second unit standing by', 'A close camera on the detail', 'A plan for a failure'],
  }),
]

export const ONLINE_BLUEPRINT = Object.fromEntries(ONLINE_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(ONLINE_BLUEPRINTS, 'online')
