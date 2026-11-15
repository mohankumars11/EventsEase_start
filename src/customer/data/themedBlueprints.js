/**
 * Seasonal & Themed Parties — one blueprint per occasion.
 *
 * Twenty-nine parties whose entire product is a theme. The engine has
 * to carry that theme into the décor, the lighting, the music, the
 * dress code, the food and the activities — a theme that exists only
 * on the invitation is not a theme, and several of these blueprints
 * say so in as many words.
 *
 * The rules that run through the category:
 *
 *   · Nothing assumes alcohol. Where a bar belongs on the plan it is a
 *     question, the venue holds the licence, and the legal drinking
 *     age applies at the door.
 *   · We never arrange fireworks, flame effects or pyrotechnics, at
 *     any of these, including New Year. Where a customer engages a
 *     licensed operator we plan the crowd and the viewing around it.
 *   · Casino-themed entertainment is simulated play for prizes, not
 *     gambling. We will not plan anything that stakes money.
 *   · Water needs a lifeguard, a screening needs the rights, and a
 *     rooftop needs a capacity. None of those is optional.
 *   · Effects — haze, strobe, UV, artificial snow, glow products — are
 *     materials people breathe and wear, so they are specified as safe
 *     and flagged to guests who need to know.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, CAKE_Q, DIET_ONLY, ALLERGY_ONLY,
  UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a themed party asks ──────────────────────────── */

const GUESTS = Q('guests_count', 'How many guests?', 'select', {
  options: [['25', 'Up to 25'], ['80', 'Up to 80'], ['250', 'Up to 250'], ['800', 'Up to 800'], ['2500', 'More than 800']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['home', 'At home'], ['venue', 'An event venue'], ['club', 'A club or bar'], ['garden', 'A garden or lawn'], ['rooftop', 'A rooftop'], ['outdoor', 'Outdoors'], ['find', 'Please find somewhere']],
})
const AGES = Q('ages', 'Who is coming?', 'one', {
  options: [['adults', 'Adults only'], ['mixed', 'Adults and children'], ['family', 'A family crowd'], ['children', 'Mostly children'], ['teens', 'Teenagers']],
  help: 'The age mix decides the music, the drinks, the effects and the finishing time.',
})
const MUSIC = Q('music', 'Music', 'one', {
  options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['themed_music', 'Themed or period music'], ['none', 'No music']],
})
const DRINKS = Q('drinks', 'Drinks', 'one', {
  options: [['soft', 'Soft drinks and mocktails'], ['bar', 'A licensed bar at the venue'], ['venue_handles', 'The venue handles it'], ['none', 'Nothing needed']],
  help: 'A bar is the venue’s licence and the legal drinking age applies. We never arrange alcohol ourselves.',
})
const FOOD = Q('food', 'Food', 'one', {
  options: [['dinner', 'A seated dinner'], ['buffet', 'A buffet'], ['canapes', 'Canapés and bites'], ['stations', 'Themed food stations'], ['snacks', 'Snacks only'], ['none', 'No food']],
})
const LOOK = Q('look', 'How far does the theme go?', 'one', {
  options: [['full', 'The whole room transformed'], ['focal', 'A few strong focal points'], ['light', 'Light touches'], ['dress_only', 'Dress code only']],
  help: 'A theme that exists only on the invitation is not a theme. This decides where the budget goes.',
})
const EFFECTS = Q('effects', 'Lighting and effects', 'many', {
  optional: true,
  options: [['moving', 'Moving lights'], ['uv', 'UV or blacklight'], ['haze', 'Haze'], ['projection', 'Projection'], ['festoon', 'Festoon or fairy lights'], ['none_fx', 'Nothing beyond house lighting']],
})
const PHOTO_SET = Q('photo_set', 'Is there a photo set or booth?', 'yesno', { optional: true })
const LATE = Q('late', 'Does it run past 10 pm?', 'yesno', {
  optional: true, help: 'Amplified sound late at night is restricted in most places, outdoors most of all.',
})
const SEATS = Q('seating', 'Do you need seating and furniture?', 'yesno', { optional: true })
const GUARD = Q('security', 'Do you need door staff or security?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const HOST = Q('host', 'Do you need a host or compère?', 'yesno', { optional: true })
const INVITES = Q('invites', 'Do you need invitations and signage?', 'yesno', { optional: true })
const TRANSPORT = Q('transport', 'Do guests need transport home?', 'yesno', { optional: true })
const WEATHER = Q('weather_plan', 'What happens if it rains?', 'one', {
  optional: true, options: [['cover', 'Arrange cover'], ['indoor', 'Move indoors'], ['postpone', 'Postpone'], ['risk', 'Take the chance']],
})

const WHEN_DJ = [ans('music', 'dj', 'themed_music')]
const WHEN_LIVE = [ans('music', 'live')]
const WHEN_SOUND = [ans('music', 'dj', 'live', 'playlist', 'themed_music')]
const WHEN_BAR = [ans('drinks', 'soft', 'bar')]
const WHEN_ALCOHOL = [ans('drinks', 'bar')]
const WHEN_FOOD = [ans('food', 'dinner', 'buffet', 'canapes', 'stations', 'snacks')]
const WHEN_MEAL = [ans('food', 'dinner', 'buffet', 'stations')]
const WHEN_BIG_LOOK = [ans('look', 'full', 'focal')]
const WHEN_FX = [some(ans('effects', 'moving', 'uv', 'haze', 'projection', 'festoon'), ans('look', 'full'))]
const WHEN_UV = [ans('effects', 'uv')]
const WHEN_PROJECT = [ans('effects', 'projection')]
const WHEN_BOOTH = [ans('photo_set', 'yes')]
const WHEN_LATE = [ans('late', 'yes')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_HOST = [ans('host', 'yes')]
const WHEN_INVITES = [ans('invites', 'yes')]
const WHEN_RIDE = [ans('transport', 'yes')]
const WHEN_COVER = [ans('weather_plan', 'cover')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'outdoor')]
const WHEN_OUTSIDE = [ans('place', 'garden', 'rooftop', 'outdoor')]
const WHEN_BIG = [ans('guests_count', '250', '800', '2500')]
const WHEN_HUGE = [ans('guests_count', '800', '2500')]
const WHEN_KIDS = [ans('ages', 'mixed', 'family', 'children')]
const WHEN_ADULTS = [ans('ages', 'adults')]

export const THEMED_BLUEPRINTS = [

  B('halloween-party', 'Haunt it', 'A room made unsettling on purpose, for a crowd that dressed for it.', {
    about: 'The theme is the whole product and the age mix decides how far it goes. A party for eight-year-olds and a party for adults share a name and nothing else.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('intensity', 'How frightening should it be?', 'one', { options: [['playful', 'Playful, nothing scary'], ['spooky', 'Spooky'], ['horror', 'Properly frightening'], ['mixed_int', 'Mild early, darker later']] }),
      Q('extras_hw', 'What else?', 'many', { optional: true, options: [['costume_contest', 'A costume contest'], ['performers_hw', 'Themed performers'], ['haunted', 'A haunted walkthrough'], ['games_hw', 'Games for children'], ['makeup', 'Makeup and special effects']] }),
      DRESS_CODE, PHOTO_SET, HOST, PHOTOS, SEATS, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Transform', 'The room made genuinely unsettling, not hung with shop bunting'),
      S('event_lighting', 'recommended', 'Darken', 'Low, coloured light and haze — the single biggest effect available'),
      S('dj_music', 'conditional', 'Score it', 'A DJ with a set that turns darker as the night goes on', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'Speakers, mics and the soundscape the theme runs on', { when: WHEN_SOUND }),
      S('live_entertainment', 'conditional', 'Unsettle', 'Themed performers, pitched to the age of the room', { when: [ans('extras_hw', 'performers_hw', 'haunted', 'games_hw')] }),
      S('catering_food', 'conditional', 'Feed', 'Food styled to the theme without becoming inedible', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, themed, as you chose', { when: WHEN_BAR }),
      S('bridal_makeup_hair', 'conditional', 'Transform them', 'Special-effects makeup on arrival, which fills a photo set', { when: [ans('extras_hw', 'makeup')] }),
      S('photography', 'conditional', 'Capture', 'The costumes, which is what everyone came to be seen in', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Build', 'A themed entrance, set pieces and the haunted walkthrough', { when: [some(WHEN_BIG_LOOK[0], ans('extras_hw', 'haunted'))] }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to run the costume contest and keep the night moving', { when: [some(WHEN_HOST[0], ans('extras_hw', 'costume_contest'))] }),
      S('gifts_favours', 'conditional', 'Prize them', 'Prizes for the costume contest, worth winning', { when: [ans('extras_hw', 'costume_contest')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating around the edges, themed rather than hired plain', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Door', 'Door staff, and age checking if there is a bar', { when: [some(WHEN_GUARD[0], WHEN_ALCOHOL[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned, including the fake cobwebs', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that can be made dark, which rules out most of them', { when: WHEN_FINDING }),
    ],
    addons: [
      X('haunted_walk', 'Walk them through', 'A built walkthrough with a staffed exit anyone can take', 'magic', { trade: 'event_equipment_rental', when: [ans('extras_hw', 'haunted')] }),
      X('age_appropriate', 'Pitch it right', 'The intensity set to the youngest person in the room, not the oldest', 'heart', { experience: true, when: WHEN_KIDS }),
      X('fx_makeup', 'Make them up', 'Special-effects makeup at the door, with skin-safe products', 'spa', { trade: 'bridal_makeup_hair', when: [ans('extras_hw', 'makeup')] }),
      X('haze_notice', 'Warn them', 'Haze and strobe flagged at the entrance, for anyone they affect', 'invite', { experience: true, when: [ans('effects', 'haze', 'moving')] }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Set the intensity to the youngest person in the room. Haze and strobe are flagged at the door, and nothing here involves flame effects.' },
    timeline: {
      before: ['Intensity agreed against the age mix, and the dress code sent early', 'Haze, strobe and UV flagged on the invitation', 'Walkthrough built with a staffed exit from any point'],
      during: ['Arrivals photographed in costume, before the makeup goes', 'Intensity held to what was announced', 'Costume contest early, while everyone still looks their best'],
      after: ['Decoration removed fully, including anything sticky', 'Photographs shared the next morning', 'Venue restored'],
    },
    checklist: ['Intensity matched to the age mix', 'Haze and strobe flagged at the door', 'Walkthrough has a staffed exit', 'Costume contest timed early'],
  }),

  B('christmas-party', 'Gather in', 'Warm light, a tree, and a room that has to feel like the season.', {
    about: 'The one theme everybody already has a picture of, which makes it unforgiving: a thin Christmas party reads as a thin Christmas party. Warmth, scale and the tree carry it.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('elements_x', 'What is part of it?', 'many', { options: [['tree', 'A tree'], ['santa', 'Santa'], ['carols', 'Carol singers'], ['gifts', 'Gift exchange'], ['dinner_x', 'A Christmas dinner'], ['kids_x', 'Children’s activities']] }),
      CAKE_Q, DIET_ONLY, ALLERGY_ONLY, EFFECTS, PHOTO_SET, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress it', 'A tree, garlands and a room that reads as Christmas from the door'),
      S('event_lighting', 'recommended', 'Warm it', 'Warm white, festoon and candlelight tones — never cold or clinical'),
      S('catering_food', 'conditional', 'Feast', 'A Christmas table, to every dietary need in the room', { when: WHEN_FOOD }),
      S('live_entertainment', 'conditional', 'Sing', 'Carol singers or a Santa, booked for the age of the room', { when: [ans('elements_x', 'santa', 'carols', 'kids_x')] }),
      S('dj_music', 'conditional', 'Play', 'Music for the evening, with the season in it but not only that', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'Speakers and a mic for the room', { when: WHEN_SOUND }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, as you chose, with something warm', { when: WHEN_BAR }),
      S('cake_desserts', 'conditional', 'Finish', 'A cake or a dessert table for the end of the meal', { when: [ans('cake', 'order')] }),
      S('gifts_favours', 'conditional', 'Give', 'Gifts organised, wrapped and labelled, which never happens on time', { when: [ans('elements_x', 'gifts')] }),
      S('photography', 'conditional', 'Keep', 'The group photograph everyone will want by the tree', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Tables and seating for a sit-down meal', { when: [some(WHEN_SEATS[0], ans('elements_x', 'dinner_x'))] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, place cards and menus', { when: WHEN_INVITES }),
      S('event_equipment_rental', 'conditional', 'Build', 'A photo set, a grotto and the staging', { when: [some(WHEN_BOOTH[0], ans('elements_x', 'santa'))] }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that can be made warm, in both senses', { when: WHEN_FINDING }),
    ],
    addons: [
      X('tree_setup', 'Put it up', 'A real tree, delivered, dressed and taken away after', 'flower', { trade: 'decoration_floral', when: [ans('elements_x', 'tree')] }),
      X('santa_visit', 'Bring him', 'A Santa with a proper suit, briefed with the children’s names', 'gift', { trade: 'live_entertainment', when: [ans('elements_x', 'santa')] }),
      X('gift_logistics', 'Sort the gifts', 'Gifts collected, labelled and handed out in order', 'gift', { trade: 'gifts_favours', when: [ans('elements_x', 'gifts')] }),
      X('tree_photo', 'By the tree', 'A lit photo spot at the tree, which is where everyone stands anyway', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Collect dietary needs early — a Christmas table is the hardest meal of the year to substitute at the last minute.' },
    timeline: {
      before: ['Tree and decoration delivered and dressed the day before', 'Dietary needs collected and the menu built around them', 'Gifts collected, labelled and sorted into handing-out order'],
      during: ['Group photograph at the tree, early', 'Santa or carols before the meal, while children are awake', 'Gifts handed out in order, by name'],
      after: ['Tree and decoration removed', 'Photographs shared', 'Venue restored'],
    },
    checklist: ['Tree delivered and dressed early', 'Dietary needs collected', 'Gifts labelled and ordered', 'Warm lighting, not cold'],
  }),

  B('new-years-eve-party', 'Count down', 'One minute matters more than the other three hundred.', {
    about: 'Everything is built towards midnight and everything after it is a different party. The countdown, the sound at that moment, and getting everyone home are the three things to get right.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('countdown', 'How is midnight marked?', 'many', { options: [['screen', 'A countdown on screen'], ['host_count', 'A host counting down'], ['confetti', 'Confetti'], ['balloons', 'A balloon drop'], ['toast', 'A toast'], ['nothing_mid', 'Nothing formal']] }),
      Q('after_midnight', 'How long does it run after midnight?', 'select', { optional: true, options: [['0', 'Ends at midnight'], ['1', 'An hour'], ['3', 'Until late'], ['dawn', 'Until dawn']] }),
      DRESS_CODE, PHOTO_SET, HOST, PHOTOS, SEATS, GUARD, TRANSPORT, LATE, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Land midnight', 'Sound and a countdown that hit the minute exactly, with a backup clock'),
      S('event_lighting', 'recommended', 'Build it', 'A lighting build towards midnight, and a change the moment it passes'),
      S('dj_music', 'conditional', 'Drive it', 'A DJ who can read a room towards a countdown', { when: WHEN_DJ }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the evening, finishing before the countdown', { when: WHEN_LIVE }),
      S('decoration_floral', 'conditional', 'Dress', 'A room that looks like an occasion, not a Tuesday with balloons', { when: WHEN_BIG_LOOK }),
      S('catering_food', 'conditional', 'Feed', 'Food served well before midnight, and something after it', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, and something in everyone’s hand at midnight', { when: WHEN_BAR }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, dance floor, a countdown screen and the balloon drop', { when: [some(WHEN_BIG_LOOK[0], ans('countdown', 'screen', 'balloons'))] }),
      S('anchor_mc', 'conditional', 'Count it', 'A host to run the countdown, which nobody should improvise', { when: [some(WHEN_HOST[0], ans('countdown', 'host_count', 'toast'))] }),
      S('photography', 'conditional', 'Capture', 'The countdown and the minute after, which is the only photograph', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Manage', 'Door staff, age checking at a bar, and a calm end to the night', { when: [some(WHEN_GUARD[0], WHEN_ALCOHOL[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Home', 'Transport home, booked in advance because nothing is available', { when: [some(WHEN_RIDE[0], WHEN_ALCOHOL[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating and lounge areas away from the floor', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Washrooms serviced and the venue cleared, on the first of January', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A venue with a late licence, booked months before anyone else', { when: WHEN_FINDING }),
    ],
    addons: [
      X('countdown_rehearsal', 'Hit the minute', 'The countdown rehearsed against a reliable clock, with a backup', 'schedule', { experience: true }),
      X('confetti_safe', 'Drop it', 'Biodegradable confetti or a balloon drop, cleared immediately after', 'balloon', { trade: 'event_equipment_rental', when: [ans('countdown', 'confetti', 'balloons')] }),
      X('rides_home', 'Get them home', 'Transport booked weeks ahead — nothing is available on the night', 'bus', { trade: 'passenger_transport' }),
      X('midnight_drink', 'In every hand', 'A drink poured and distributed before the countdown, not during it', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'We never arrange fireworks. Book transport home weeks ahead — on this one night nothing is available, and that is what ruins the end of the party.' },
    timeline: {
      before: ['Venue booked with a late licence, months ahead', 'Transport home booked weeks ahead for everyone who needs it', 'Countdown rehearsed against a reliable clock, with a backup'],
      during: ['Food and drinks served well before midnight', 'A drink in every hand before the countdown starts', 'Countdown on the minute, then the lighting and music change'],
      after: ['Confetti and balloons cleared immediately', 'Everyone accounted for and on their way home', 'Venue cleared'],
    },
    checklist: ['Late licence confirmed', 'Transport home booked weeks ahead', 'Countdown rehearsed with a backup clock', 'Drinks distributed before midnight'],
  }),

  B('valentines-party', 'Set the mood', 'Low light, flowers and a room built for couples rather than crowds.', {
    about: 'Intimacy at scale, which is a contradiction the lighting and the seating have to resolve. Small tables, warm light and music under the conversation do nearly all of it.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      Q('shape_v', 'What shape is the evening?', 'one', { options: [['dinner_v', 'A couples’ dinner'], ['party_v', 'A party'], ['singles', 'A singles night'], ['private_v', 'A private dinner for two'], ['mixed_v', 'A mix']] }),
      Q('extras_v', 'What else?', 'many', { optional: true, options: [['games_v', 'Couple games'], ['live_music_v', 'Live music'], ['proposal', 'A proposal setup'], ['gifts_v', 'Personalised gifts'], ['candles', 'Candlelight']] }),
      DIET_ONLY, ALLERGY_ONLY, PHOTO_SET, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Lower it', 'Low, warm light and candle tones — the whole evening is lighting'),
      S('decoration_floral', 'recommended', 'Flower it', 'Flowers on every table, which is the one thing this theme needs'),
      S('catering_food', 'conditional', 'Serve', 'A menu built for two at a time, to every dietary need', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat close', 'Small tables for two, not long banquet rows', { when: [some(WHEN_SEATS[0], ans('shape_v', 'dinner_v', 'private_v', 'mixed_v'))] }),
      S('live_entertainment', 'conditional', 'Play softly', 'A musician at conversation level, not a performance', { when: [some(WHEN_LIVE[0], ans('extras_v', 'live_music_v'))] }),
      S('dj_music', 'conditional', 'Play', 'Music under the room, which is the only volume that works', { when: WHEN_DJ }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'A photograph of each couple, which is what they will keep', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Discreet sound, and a mic only if there is a host', { when: WHEN_SOUND }),
      S('cake_desserts', 'optional', 'Finish', 'A dessert worth lingering over'),
      S('invitation_printing', 'conditional', 'Name them', 'Invitations, place cards and personalised menus', { when: WHEN_INVITES }),
      S('event_equipment_rental', 'conditional', 'Set', 'A photo set, and a proposal setup if there is one', { when: [some(WHEN_BOOTH[0], ans('extras_v', 'proposal'))] }),
      S('gifts_favours', 'conditional', 'Give', 'Something personalised for each couple to take away', { when: [ans('extras_v', 'gifts_v')] }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'Somewhere that can be made intimate, whatever its size', { when: WHEN_FINDING }),
    ],
    addons: [
      X('safe_candles', 'Light it safely', 'LED or enclosed candles — open flame near fabric and flowers is not worth it', 'lighting', { trade: 'event_lighting', when: [ans('extras_v', 'candles')] }),
      X('couple_portraits', 'Photograph them', 'A portrait of each couple, printed before they leave', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('proposal_setup', 'Make the moment', 'A private proposal setup, coordinated without the partner knowing', 'heart', { trade: 'decoration_floral', when: [ans('extras_v', 'proposal')] }),
      X('two_tops', 'Seat them in twos', 'Tables for two throughout, which changes the whole evening', 'chair', { trade: 'tent_furniture' }),
    ],
    toolkit: { surprise: true, polls: ['date', 'food'], note: 'Open flame near flowers and fabric is not worth the look. Where there is a proposal, nothing about it is visible to the other person.' },
    timeline: {
      before: ['Lighting designed low and warm, tested after dark', 'Tables set for two, not in long rows', 'Any proposal coordinated privately with one person only'],
      during: ['Music held under the conversation all evening', 'Couples photographed at their table, not queued at a booth', 'Service unhurried — nobody is turning tables tonight'],
      after: ['Photographs delivered quickly', 'Flowers given away rather than binned', 'Venue cleared'],
    },
    checklist: ['Low warm lighting tested', 'Tables for two', 'Safe candles only', 'Music under conversation level'],
  }),

  B('retro-theme-party', 'Rewind', 'A decade recreated well enough that people dress for it.', {
    about: 'The decade has to be specific. "Retro" means nothing; 1978 means a playlist, a palette, a dress code and a set of props everyone recognises.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, AGES, LOOK,
      Q('decade', 'Which decade?', 'one', { options: [['60s', 'The sixties'], ['70s', 'The seventies'], ['80s', 'The eighties'], ['90s', 'The nineties'], ['2000s', 'The two-thousands'], ['mixed_dec', 'A mix']] }),
      MUSIC, DRINKS, FOOD, EFFECTS, DRESS_CODE, PHOTO_SET, PHOTOS, SEATS, HOST, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Recreate it', 'A palette, props and a room that reads as the decade, not as "retro"'),
      S('dj_music', 'conditional', 'Play the era', 'A DJ with a set that stays inside the decade all night', { when: WHEN_DJ }),
      S('event_lighting', 'recommended', 'Colour it', 'Lighting in the decade’s own palette, which does half the work'),
      S('sound_av', 'conditional', 'Amplify', 'Speakers, mics and a dance floor system', { when: WHEN_SOUND }),
      S('live_entertainment', 'conditional', 'Perform', 'A tribute band or act from the decade', { when: WHEN_LIVE }),
      S('event_equipment_rental', 'conditional', 'Build', 'Set pieces, a dance floor and a period photo set', { when: [some(WHEN_BIG_LOOK[0], WHEN_BOOTH[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food and drinks from the decade, which guests will notice', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter with the decade’s own drinks, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'The costumes, shot in a way that suits the era', { when: WHEN_SHOT }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to run the costume awards and the dance-off', { when: WHEN_HOST }),
      S('gifts_favours', 'conditional', 'Prize', 'Prizes for the best-dressed, judged properly', { when: WHEN_HOST }),
      S('tent_furniture', 'conditional', 'Seat', 'Period-appropriate seating around the floor', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that will take a full transformation', { when: WHEN_FINDING }),
    ],
    addons: [
      X('era_playlist', 'Stay in the decade', 'A playlist brief that does not drift into the next decade by midnight', 'music', { trade: 'dj_music', when: WHEN_DJ }),
      X('period_photo_set', 'Frame it', 'A photo set built to the decade, with props people recognise', 'booth', { trade: 'event_equipment_rental', when: WHEN_BOOTH }),
      X('costume_prizes', 'Reward the effort', 'Prizes judged by the room, for people who actually tried', 'gift', { trade: 'gifts_favours' }),
      X('dress_code_early', 'Tell them early', 'The decade announced far enough ahead that people can find an outfit', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Name the decade, not "retro". A specific decade gets people into costume; a vague one gets them into jeans.' },
    timeline: {
      before: ['Decade chosen and announced early enough to find outfits', 'Playlist briefed to stay inside the decade', 'Set pieces and props sourced to the period'],
      during: ['Arrivals photographed in costume', 'Music held inside the decade', 'Costume awards before people change out of them'],
      after: ['Props returned', 'Photographs shared', 'Venue restored'],
    },
    checklist: ['A specific decade, announced early', 'Playlist briefed to the era', 'Period photo set built', 'Costume prizes arranged'],
  }),

  B('masquerade-ball', 'Conceal', 'Masks, formality and a room that has to earn the dress code.', {
    about: 'If the room is not as formal as the invitation asked guests to be, the whole thing collapses. Masks for anyone who forgot are the detail that saves it.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      Q('masks', 'Masks', 'one', { options: [['provided', 'We provide them'], ['guests_bring', 'Guests bring their own'], ['both_masks', 'Both — spares at the door'], ['none_masks', 'No masks']] }),
      Q('programme_mb', 'What is in the evening?', 'many', { optional: true, options: [['dinner_mb', 'A seated dinner'], ['dancing', 'Dancing'], ['performance_mb', 'A performance'], ['unmasking', 'An unmasking moment'], ['awards_mb', 'A best-mask award']] }),
      DRESS_CODE, DIET_ONLY, ALLERGY_ONLY, PHOTOS, SEATS, HOST, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Elevate', 'A room formal enough to justify what you asked guests to wear'),
      S('event_lighting', 'recommended', 'Light low', 'Candlelit tones and pools of light, not an evenly lit hall'),
      S('catering_food', 'conditional', 'Serve', 'A seated dinner or canapés, served properly', { when: WHEN_FOOD }),
      S('live_entertainment', 'conditional', 'Play', 'Live music — a masquerade with a laptop playlist reads cheap', { when: [some(WHEN_LIVE[0], ans('programme_mb', 'performance_mb', 'dancing'))] }),
      S('dj_music', 'conditional', 'Move them', 'A DJ for the later part of the night', { when: WHEN_DJ }),
      S('gifts_favours', 'conditional', 'Mask them', 'Masks provided at the door, including spares for the unprepared', { when: [ans('masks', 'provided', 'both_masks')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound for the room and a mic for the host', { when: WHEN_SOUND }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'The masks, which photograph better than almost anything', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Round tables, linen and a dance floor', { when: [some(WHEN_SEATS[0], ans('programme_mb', 'dinner_mb'))] }),
      S('anchor_mc', 'conditional', 'Preside', 'A host to run the unmasking and the awards', { when: [some(WHEN_HOST[0], ans('programme_mb', 'unmasking', 'awards_mb'))] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, a dance floor and the entrance set', { when: WHEN_BIG_LOOK }),
      S('guest_services', 'conditional', 'Receive', 'A door that hands out masks and seats people by name', { when: [some(WHEN_BIG[0], ans('masks', 'provided', 'both_masks'))] }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room with height and architecture, which this theme needs', { when: WHEN_FINDING }),
    ],
    addons: [
      X('spare_masks', 'Cover the unprepared', 'Good spare masks at the door, so nobody is the only bare face', 'dress', { trade: 'gifts_favours', when: [ans('masks', 'guests_bring', 'both_masks')] }),
      X('live_strings', 'Play it properly', 'Live musicians rather than a playlist, which this theme requires', 'music', { trade: 'live_entertainment' }),
      X('mask_portraits', 'Shoot the masks', 'A lit portrait position, because masks photograph extraordinarily well', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('unmasking_moment', 'Reveal them', 'A staged unmasking at a set hour, announced in advance', 'schedule', { experience: true, when: [ans('programme_mb', 'unmasking')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Keep spare masks at the door. One guest without a mask in a masked room has a bad evening.' },
    timeline: {
      before: ['Dress code sent early, with guidance on what a mask means here', 'Room dressed to match the formality asked of guests', 'Spare masks sourced for the door'],
      during: ['Masks handed out at the door to anyone without one', 'Portraits taken early, while masks are still on', 'Unmasking at the announced hour, if there is one'],
      after: ['Masks collected or given away', 'Photographs shared', 'Venue restored'],
    },
    checklist: ['Dress code sent early', 'Room matches the formality asked', 'Spare masks at the door', 'Live music rather than a playlist'],
  }),

  B('black-tie-gala', 'Rise to it', 'The most formal thing in the catalogue, where every detail is read.', {
    about: 'A room that asked three hundred people to hire dinner jackets has to deliver. Arrival, service standard and timing are what guests judge, in that order.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      Q('programme_gala', 'What is in the evening?', 'many', { options: [['reception', 'A drinks reception'], ['dinner_gala', 'A seated dinner'], ['speeches', 'Speeches'], ['awards_gala', 'Awards'], ['performance_gala', 'A performance'], ['dancing_gala', 'Dancing']] }),
      Q('carpet', 'Is there a carpet and arrivals?', 'yesno', { optional: true }),
      DRESS_CODE, DIET_ONLY, ALLERGY_ONLY, PHOTOS, SEATS, HOST, GUARD, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress to match', 'A room as formal as the dress code, which is the whole contract'),
      S('event_lighting', 'recommended', 'Light it', 'Table lighting, a stage look and an arrival that photographs'),
      S('catering_food', 'recommended', 'Serve', 'A dinner served to time, to every dietary need, at one standard'),
      S('guest_services', 'recommended', 'Receive', 'Arrivals, the seating plan by name, and service that does not falter'),
      S('sound_av', 'conditional', 'Carry', 'Sound and a screen for speeches and awards', { when: [some(WHEN_SOUND[0], ans('programme_gala', 'speeches', 'awards_gala'))] }),
      S('live_entertainment', 'conditional', 'Perform', 'An act or orchestra at the standard the room expects', { when: [some(WHEN_LIVE[0], ans('programme_gala', 'performance_gala'))] }),
      S('anchor_mc', 'conditional', 'Preside', 'A host who can carry a formal room through a long programme', { when: [some(WHEN_HOST[0], ans('programme_gala', 'awards_gala', 'speeches'))] }),
      S('tent_furniture', 'conditional', 'Lay it', 'Round tables, linen, chargers and a dance floor', { when: [some(WHEN_SEATS[0], ans('programme_gala', 'dinner_gala'))] }),
      S('photography', 'conditional', 'Capture', 'Arrivals, the room and the awards, delivered the same week', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, carpet, a branded wall and the dance floor', { when: [some(WHEN_BIG_LOOK[0], ans('carpet', 'yes'))] }),
      S('dj_music', 'conditional', 'Close it', 'A DJ for after the formal programme', { when: [some(WHEN_DJ[0], ans('programme_gala', 'dancing_gala'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'A reception and table service, as you chose', { when: WHEN_BAR }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, because the first impression is the car door', { when: [ans('carpet', 'yes')] }),
      S('security_services', 'conditional', 'Control', 'Door control and a discreet presence', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A room that deserves the dress code', { when: WHEN_FINDING }),
    ],
    addons: [
      X('arrival_carpet', 'Arrive properly', 'A carpet, a branded wall and a photographer on it', 'booth', { trade: 'event_equipment_rental', when: [ans('carpet', 'yes')] }),
      X('seating_plan', 'Place them', 'A seating plan built around who should meet whom', 'group', { trade: 'guest_services' }),
      X('service_standard', 'Serve as one', 'Every table served within minutes of each other, which takes planning', 'chef', { trade: 'catering_food' }),
      X('runtime_plan', 'Keep it moving', 'A minute budget per segment, so dinner is not served at eleven', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A room that asked guests to hire black tie has to meet them. Service standard and timing are what this audience actually judges.' },
    timeline: {
      before: ['Seating plan built by name and checked twice', 'Runtime budgeted per segment so dinner lands on time', 'Dietary needs collected individually and confirmed to the kitchen'],
      during: ['Arrivals on the carpet, photographed', 'Every table served together, not in waves', 'Programme to the minute budget'],
      after: ['Images delivered within the week', 'Venue and caterer debriefed', 'Thanks to guests individually'],
    },
    checklist: ['Seating plan by name', 'Runtime budgeted per segment', 'Dietary needs confirmed', 'Valet and arrival planned'],
  }),

  B('white-party', 'Keep it white', 'One colour, held absolutely, which is harder than it sounds.', {
    about: 'The discipline is the design. One grey chair, one wooden table or one coloured uplighter and the effect is gone, so the furniture and the linen matter more than anything else.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('setting', 'What is the setting?', 'one', { options: [['poolside_w', 'Poolside'], ['garden_w', 'A garden or lawn'], ['rooftop_w', 'A rooftop'], ['indoor_w', 'Indoors'], ['beach_w', 'A beach']] }),
      DRESS_CODE, PHOTO_SET, PHOTOS, SEATS, WEATHER, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'All white', 'White furniture, linen and lounge seating — no exceptions'),
      S('decoration_floral', 'recommended', 'Hold it', 'White flowers, drapes and dressing, with nothing breaking the colour'),
      S('event_lighting', 'recommended', 'Light clean', 'Warm white only — one coloured uplighter undoes the whole thing'),
      S('dj_music', 'conditional', 'Play', 'A DJ for the evening', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'Sound for an open setting, which swallows volume', { when: WHEN_SOUND }),
      S('catering_food', 'conditional', 'Serve', 'Food and service kept within the palette as far as it honestly can be', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A white-dressed drinks counter, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'A white party photographs better than almost anything — use it', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Perform', 'A live act for the evening', { when: WHEN_LIVE }),
      S('event_equipment_rental', 'conditional', 'Build', 'Staging, a dance floor and a white photo set', { when: [some(WHEN_BIG_LOOK[0], WHEN_BOOTH[0])] }),
      S('security_services', 'conditional', 'Door', 'Door staff and dress-code enforcement at the entrance', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power and cooling for an outdoor setting', { when: WHEN_OUTSIDE }),
      S('safety_facilities', 'conditional', 'Keep it clean', 'White shows everything — cleaning through the evening, not after', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A setting whose own colours do not fight the palette', { when: WHEN_FINDING }),
    ],
    addons: [
      X('palette_discipline', 'Hold the line', 'Every hired item checked against the palette before it is delivered', 'schedule', { experience: true }),
      X('spare_whites', 'Cover them', 'A few white wraps at the door for guests who missed the brief', 'dress', { trade: 'gifts_favours' }),
      X('golden_hour', 'Time it', 'Doors timed so arrivals land in the best light of the day', 'camera', { experience: true, when: WHEN_OUTSIDE }),
      X('continuous_cleaning', 'Keep it spotless', 'Linen and seating checked and changed through the evening', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date'], note: 'The palette is the product. Every hired item is checked against it before delivery, because one wrong chair is visible in every photograph.' },
    timeline: {
      before: ['Every hired item checked against the palette before delivery', 'Dress code sent early with a clear description of what counts', 'Weather fallback agreed if it is outdoors'],
      during: ['Dress code held at the door, with spares for the unprepared', 'Linen and seating kept clean through the evening', 'Arrivals timed for the light'],
      after: ['Linen and furniture returned and reconciled', 'Photographs shared quickly', 'Setting restored'],
    },
    checklist: ['Every item checked against the palette', 'Dress code described clearly', 'Spare whites at the door', 'Cleaning through the evening'],
  }),

  B('neon-party', 'Make it glow', 'UV light, which only works if everything in the room is built for it.', {
    about: 'Blacklight reveals nothing unless the décor, the drinks and the guests are wearing something that reacts. The materials matter more than the number of fixtures.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('glow_extras', 'What else glows?', 'many', { optional: true, options: [['accessories', 'Glow accessories for guests'], ['face_paint', 'UV face paint'], ['drinks_glow', 'Glowing drinks'], ['installations', 'Light installations'], ['performers_glow', 'Glow performers']] }),
      DRESS_CODE, PHOTO_SET, PHOTOS, SEATS, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Charge it', 'UV fixtures placed so the whole room reacts, not one corner'),
      S('decoration_floral', 'recommended', 'React', 'Décor in materials that actually fluoresce under blacklight'),
      S('dj_music', 'conditional', 'Drive it', 'A DJ for a floor that will not sit down', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'A floor system and the visuals', { when: WHEN_SOUND }),
      S('gifts_favours', 'conditional', 'Hand them out', 'Glow accessories at the door, which get every guest into the theme', { when: [ans('glow_extras', 'accessories')] }),
      S('bridal_makeup_hair', 'conditional', 'Paint them', 'UV face and body paint, with skin-safe products only', { when: [ans('glow_extras', 'face_paint')] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter under UV, as you chose', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food that can be found and eaten in near-darkness', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot the dark', 'Photography set up for UV, which ordinary settings cannot handle', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Build', 'Light installations, a dance floor and a UV photo set', { when: [some(WHEN_BIG_LOOK[0], ans('glow_extras', 'installations'), WHEN_BOOTH[0])] }),
      S('live_entertainment', 'conditional', 'Glow', 'Performers with light costumes or LED acts', { when: [ans('glow_extras', 'performers_glow')] }),
      S('security_services', 'conditional', 'Door', 'Door staff, and age checking if there is a bar', { when: [some(WHEN_GUARD[0], WHEN_ALCOHOL[0], WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating in reactive materials around the floor', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleaned afterwards, including paint on walls and floors', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that can be made genuinely dark', { when: WHEN_FINDING }),
    ],
    addons: [
      X('reactive_check', 'Test it first', 'Every décor material tested under UV before it is bought', 'lighting', { experience: true }),
      X('skin_safe_paint', 'Use safe products', 'Cosmetic-grade UV paint only, with a patch test on request', 'spa', { trade: 'bridal_makeup_hair', when: [ans('glow_extras', 'face_paint')] }),
      X('glow_at_door', 'Include everyone', 'Glow accessories handed to every guest on arrival', 'gift', { trade: 'gifts_favours' }),
      X('uv_photography', 'Shoot it right', 'A photographer set up for blacklight, not using flash into it', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Test every material under UV before buying it — most white things do not glow. Only cosmetic-grade, skin-safe paint goes on anyone.' },
    timeline: {
      before: ['Every décor material tested under UV before purchase', 'Skin-safe paint sourced, with a patch-test offer', 'Room checked for how dark it can genuinely be made'],
      during: ['Glow accessories handed to every guest at the door', 'Lighting levels kept low enough for the UV to read', 'Photography set for blacklight, no flash'],
      after: ['Paint cleaned off walls, floors and furniture', 'Photographs shared', 'Venue restored'],
    },
    checklist: ['Materials tested under UV', 'Skin-safe paint only', 'Glow accessories for every guest', 'Room can be made genuinely dark'],
  }),

  B('costume-party', 'Dress up', 'A theme loose enough that everyone can join and specific enough that they do.', {
    about: 'The whole event depends on people actually coming in costume, which depends entirely on how the theme was communicated and how early. Spares at the door catch the rest.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, AGES, LOOK,
      Q('theme_cp', 'What is the costume theme?', 'text', { max: 80, placeholder: 'e.g. heroes and villains' }),
      MUSIC, DRINKS, FOOD,
      Q('contest', 'Is there a costume contest?', 'yesno'),
      DRESS_CODE, PHOTO_SET, EFFECTS, PHOTOS, SEATS, HOST, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Match them', 'A room dressed to the theme, so the costumes are not the only effort'),
      S('photography', 'recommended', 'Shoot them', 'A lit set — people in costume want proof', { unless: UNLESS_PHOTO }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting to the theme, and enough light to see a costume by', { when: WHEN_FX }),
      S('dj_music', 'conditional', 'Play', 'A DJ with a set that suits the theme', { when: WHEN_DJ }),
      S('anchor_mc', 'conditional', 'Judge it', 'A host to run the contest and make the judging feel fair', { when: [some(WHEN_HOST[0], ans('contest', 'yes'))] }),
      S('gifts_favours', 'conditional', 'Prize them', 'Prizes for the costumes that took real effort', { when: [ans('contest', 'yes')] }),
      S('sound_av', 'conditional', 'Amplify', 'Sound for the room and a mic for the contest', { when: WHEN_SOUND }),
      S('catering_food', 'conditional', 'Feed', 'Food people can eat in a costume, which is a real constraint', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, as you chose', { when: WHEN_BAR }),
      S('bridal_makeup_hair', 'optional', 'Finish them', 'A makeup and repair station, which every costume party needs'),
      S('live_entertainment', 'conditional', 'Perform', 'Character performers who fit the theme', { when: [some(WHEN_LIVE[0], WHEN_KIDS[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A themed photo set and set pieces', { when: [some(WHEN_BIG_LOOK[0], WHEN_BOOTH[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating a costume can actually sit down in', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room with wide doors and somewhere to change', { when: WHEN_FINDING }),
    ],
    addons: [
      X('theme_brief', 'Explain it', 'The theme described with examples, sent weeks ahead', 'invite', { experience: true }),
      X('spare_costumes', 'Catch the rest', 'Props and simple pieces at the door for anyone who did not dress', 'dress', { trade: 'gifts_favours' }),
      X('repair_station', 'Fix them', 'Tape, pins, glue and a mirror, because costumes fail by nine', 'craft', { trade: 'bridal_makeup_hair' }),
      X('contest_criteria', 'Judge openly', 'Stated categories, so the contest is not one person’s opinion', 'poll', { experience: true, when: [ans('contest', 'yes')] }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Describe the theme with examples and send it weeks ahead. A costume party where only six people dressed up is a quiet evening.' },
    timeline: {
      before: ['Theme described with examples and sent weeks ahead', 'Photo set built and lit before anyone arrives', 'Prizes and contest categories decided'],
      during: ['Arrivals photographed immediately, while costumes are intact', 'Repair station staffed from mid-evening', 'Contest judged on stated categories, early'],
      after: ['Photographs shared the next morning', 'Props collected', 'Venue restored'],
    },
    checklist: ['Theme described with examples', 'Photo set built and lit', 'Spares and props at the door', 'Contest categories stated'],
  }),

  B('garden-party', 'Open air', 'A lawn, an afternoon, and weather nobody controls.', {
    about: 'Gentle, daylight and entirely at the mercy of rain. The fallback and the ground underfoot are the two decisions everything else rests on.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, WEATHER,
      Q('time_of_day', 'When?', 'one', { options: [['brunch', 'Brunch'], ['afternoon', 'Afternoon tea'], ['evening_g', 'Evening'], ['allday', 'All day']] }),
      Q('extras_g', 'What else?', 'many', { optional: true, options: [['lawn_games', 'Lawn games'], ['acoustic', 'Acoustic music'], ['floral_workshop', 'A floral workshop'], ['kids_g', 'Children’s activities'], ['tea', 'A tea service']] }),
      DIET_ONLY, ALLERGY_ONLY, EFFECTS, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'Furnish it', 'Seating, tables, shade and cover that can go up quickly'),
      S('decoration_floral', 'recommended', 'Plant it', 'Flowers and dressing that work with the garden, not against it'),
      S('catering_food', 'conditional', 'Serve outside', 'Food that survives an afternoon outdoors, to everyone’s needs', { when: WHEN_FOOD }),
      S('event_lighting', 'conditional', 'Light late', 'Festoon and warm light for when the afternoon turns', { when: [some(ans('time_of_day', 'evening_g', 'allday'), WHEN_FX[0])] }),
      S('live_entertainment', 'conditional', 'Play gently', 'Acoustic music at conversation level', { when: [some(WHEN_LIVE[0], ans('extras_g', 'acoustic'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter with shade and ice, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'The garden and the guests in daylight, which is the easy part', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Sound for an open lawn, which swallows volume', { when: WHEN_SOUND }),
      S('event_equipment_rental', 'conditional', 'Set up', 'Lawn games, a workshop table and the service stations', { when: [ans('extras_g', 'lawn_games', 'floral_workshop', 'kids_g')] }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, water and the garden left as found', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, place cards and menus', { when: WHEN_INVITES }),
      S('power_cooling', 'conditional', 'Power', 'Power for lighting and sound, which a garden does not have', { when: [some(ans('time_of_day', 'evening_g', 'allday'), WHEN_SOUND[0])] }),
      S('venue', 'conditional', 'Find', 'A garden with shade, a flat area and somewhere to shelter', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rain_cover', 'Cover it', 'Cover that can go up in twenty minutes, held on standby', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
      X('ground_check', 'Walk the lawn', 'The ground checked for soft patches, which ruin heels and tables', 'map', { experience: true }),
      X('shade_plan', 'Keep them cool', 'Shade over the seating and the food, planned not improvised', 'tent', { trade: 'tent_furniture' }),
      X('garden_washrooms', 'Provide', 'Washrooms, which a garden party for eighty genuinely needs', 'broom', { trade: 'safety_facilities', when: WHEN_BIG }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Agree a weather decision time in advance. A garden party decided at noon on the day is a garden party nobody prepared for.' },
    timeline: {
      before: ['Weather fallback agreed, with a decision time stated to guests', 'Ground walked for soft patches and shade planned', 'Washrooms and power arranged — a garden has neither'],
      during: ['Shade and water maintained through the afternoon', 'Cover put up at the agreed threshold, not after the rain starts', 'Food kept cool and covered'],
      after: ['Garden left as found, including the lawn', 'Hired furniture collected', 'Photographs shared'],
    },
    checklist: ['Weather fallback with a decision time', 'Ground walked and shade planned', 'Washrooms arranged', 'Power for lighting and sound'],
  }),

  B('beach-party', 'Sand and sound', 'A public shoreline, which belongs to everybody and nobody.', {
    about: 'Beaches come with permissions, tides, no power and no washrooms. Everything is brought in and everything must leave — and what is in the water is somebody qualified’s responsibility.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('permissions_b', 'Are beach permissions in place?', 'one', {
        options: [['yes', 'Yes, in writing'], ['applying', 'We are applying'], ['no', 'Not yet'], ['private', 'It is a private beach']],
        help: 'A public beach needs permission for the gathering, the sound and anything built on it.',
      }),
      Q('water_activity', 'Is anyone going in the water?', 'one', {
        options: [['no', 'No'], ['swimming', 'Swimming'], ['watersports', 'Water sports through an operator'], ['unsure', 'Probably, informally']],
        help: 'Anyone in the sea needs qualified supervision. "Informally" is the answer that most needs it.',
      }),
      Q('extras_b', 'What else?', 'many', { optional: true, options: [['games_b', 'Beach games'], ['bonfire', 'A bonfire, where permitted'], ['sunset', 'A sunset moment'], ['live_b', 'Live music'], ['lounge', 'A lounge setup']] }),
      EFFECTS, PHOTOS, SEATS, GUARD, CLEAN, LATE, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Cover it', 'First aid, drinking water, washrooms and the beach left clean'),
      S('tent_furniture', 'recommended', 'Set the sand', 'Lounge seating, shade, matting and a bar setup that stands on sand'),
      S('power_cooling', 'recommended', 'Bring power', 'Generators and cold storage — a beach has neither'),
      S('sound_av', 'conditional', 'Carry', 'Sound set for open air and held to whatever the permission allows', { when: WHEN_SOUND }),
      S('dj_music', 'conditional', 'Play', 'A DJ who can work at a restrained outdoor volume', { when: WHEN_DJ }),
      S('catering_food', 'conditional', 'Feed', 'Food kept cold and covered on a beach, which is the hard part', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter with ice and cold storage, as you chose', { when: WHEN_BAR }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for after sunset, and light on the route back', { when: [some(WHEN_FX[0], WHEN_LATE[0])] }),
      S('decoration_floral', 'conditional', 'Dress it', 'Dressing that will not blow away and does not leave anything behind', { when: WHEN_BIG_LOOK }),
      S('live_entertainment', 'conditional', 'Perform', 'Live music, acoustic or amplified within the limit', { when: [some(WHEN_LIVE[0], ans('extras_b', 'live_b'))] }),
      S('photography', 'conditional', 'Capture', 'Sunset, which is the only reason to be on a beach at that hour', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Steward', 'Stewarding on an open shoreline anyone can walk onto', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('passenger_transport', 'conditional', 'Carry them', 'Transport to a beach with no parking and back afterwards', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Permit it', 'A beach with permission, access and somewhere to put a generator', { when: WHEN_FINDING }),
    ],
    addons: [
      X('beach_permissions', 'Get it in writing', 'Gathering, sound and structure permissions confirmed before booking', 'schedule', { experience: true, when: [ans('permissions_b', 'applying', 'no')] }),
      X('water_supervision', 'Watch the water', 'Qualified supervision for anyone entering the sea, including informally', 'spa', { trade: 'safety_facilities', when: [ans('water_activity', 'swimming', 'watersports', 'unsure')] }),
      X('leave_nothing', 'Take it all back', 'Everything brought in taken out, including every cable tie', 'broom', { trade: 'safety_facilities' }),
      X('tide_check', 'Check the tide', 'Tide times checked, and nothing built below the high-water line', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Anyone entering the sea needs qualified supervision — especially if it is "informal". We never arrange a bonfire without the local permission, and everything brought onto a beach leaves it.' },
    timeline: {
      before: ['Permissions for the gathering, sound and any structure confirmed in writing', 'Tide times checked and the build kept above the high-water line', 'Qualified water supervision arranged if anyone will swim'],
      during: ['Water supervision in position before anyone goes near the sea', 'Sound held to the permitted level', 'Waste collected continuously, not at the end'],
      after: ['Beach cleared completely — nothing left, including small debris', 'Generators and structures removed', 'Everyone accounted for and transported'],
    },
    checklist: ['Permissions in writing', 'Tide checked, build above high water', 'Qualified water supervision', 'Everything leaves the beach'],
  }),

  B('poolside-party', 'By the water', 'A pool, a crowd and drinks — which is why a lifeguard is a condition.', {
    about: 'Water plus a party is the combination that drowns people. A qualified lifeguard for every hour the pool is open, and no glass anywhere near it, are not negotiable.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('pool_use', 'Is the pool in use?', 'yesno'),
      Q('lifeguard', 'Lifeguard cover', 'one', {
        when: [ans('pool_use', 'yes')],
        options: [['venue_lg', 'The venue provides it'], ['arrange', 'Please arrange it'], ['own_lg', 'We have our own'], ['none_lg', 'No lifeguard']],
        help: 'A pool in use, with a crowd and drinks, needs someone trained and watching. We will say so if this is left off.',
      }),
      Q('facilities_p', 'What do guests need?', 'many', { optional: true, options: [['changing', 'Changing rooms'], ['towels', 'Towels'], ['lockers', 'Lockers'], ['shade_p', 'Shade'], ['loungers', 'Loungers']] }),
      EFFECTS, PHOTOS, SEATS, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('safety_facilities', 'essential', 'Watch it', 'Lifeguard cover, first aid, and a poolside kept clear and dry'),
      S('tent_furniture', 'recommended', 'Furnish', 'Loungers, shade, changing space and somewhere dry to sit'),
      S('bar_beverages', 'conditional', 'Pour safe', 'Drinks in unbreakable glassware — never glass near a pool', { when: WHEN_BAR }),
      S('dj_music', 'conditional', 'Play', 'A DJ for a daytime crowd, which is a different set entirely', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Place it', 'Sound positioned away from the water and the neighbours', { when: WHEN_SOUND }),
      S('catering_food', 'conditional', 'Feed', 'Food away from the water, on surfaces that will not get wet', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress it', 'Poolside dressing that is safe when wet and will not blow in', { when: WHEN_BIG_LOOK }),
      S('event_lighting', 'conditional', 'Light the edge', 'Lighting for the evening, including light on the water’s edge', { when: [some(WHEN_FX[0], WHEN_LATE[0])] }),
      S('photography', 'conditional', 'Shoot', 'With a stated rule about photographing people in swimwear', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Control', 'Door staff, a counted capacity and watch on the water', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_ALCOHOL[0])] }),
      S('power_cooling', 'conditional', 'Power safely', 'Power routed and protected properly around water', { when: WHEN_OUTSIDE }),
      S('guest_services', 'conditional', 'Receive', 'A door list, towels and a changing area that is staffed', { when: [some(WHEN_BIG[0], ans('facilities_p', 'changing', 'towels', 'lockers'))] }),
      S('venue', 'conditional', 'Find', 'A pool venue with changing rooms and a stated safe capacity', { when: WHEN_FINDING }),
    ],
    addons: [
      X('lifeguard_cover', 'Supervise', 'A trained lifeguard on duty for every hour the pool is open', 'spa', { trade: 'safety_facilities', when: [ans('lifeguard', 'arrange', 'none_lg')] }),
      X('no_glass', 'Switch it', 'All glassware replaced with unbreakable, everywhere poolside', 'glass', { trade: 'bar_beverages', when: WHEN_BAR }),
      X('changing_towels', 'Provide', 'Changing rooms, lockers and towels, staffed', 'bed', { trade: 'guest_services', when: [has('facilities_p')] }),
      X('swimwear_photo_rule', 'Respect it', 'A stated rule on photographing guests in swimwear, enforced', 'camera', { experience: true, unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'A pool in use with a bar needs a trained lifeguard and no glass. We keep both on the plan and will say so plainly if either comes off.' },
    timeline: {
      before: ['Lifeguard cover confirmed for every hour the pool is open', 'All glassware replaced with unbreakable', 'Photography rule agreed and put on the invitation'],
      during: ['Lifeguard on duty and visible, not on call', 'Nobody over-served near the water', 'Poolside kept clear and dry'],
      after: ['Poolside cleared, nothing left in or near the water', 'Lost property collected', 'Venue settled'],
    },
    checklist: ['Lifeguard for every open hour', 'No glass poolside', 'Changing and towels', 'Swimwear photography rule'],
  }),

  B('casino-theme-night', 'Place a chip', 'The look of a casino, with chips that buy a prize and never money.', {
    about: 'Entertainment, not gambling. Guests play with chips that have no cash value and convert to prizes at the end. We will not plan anything that stakes money.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      Q('tables', 'How many gaming tables?', 'select', { options: [['2', 'Two'], ['4', 'Four'], ['8', 'Eight'], ['15', 'More than eight']] }),
      Q('games', 'Which games?', 'many', { options: [['roulette', 'Roulette-style'], ['blackjack', 'Card tables'], ['poker', 'Poker-style'], ['wheel', 'A wheel'], ['dice', 'Dice games']] }),
      Q('prizes', 'How do chips convert at the end?', 'one', {
        options: [['prizes', 'Into prizes'], ['charity', 'Into a charity donation'], ['leaderboard', 'A leaderboard only'], ['nothing', 'Nothing — just for fun']],
        help: 'Chips never convert to money. This is simulated play for entertainment.',
      }),
      DRESS_CODE, PHOTO_SET, GUARD, PHOTOS, SEATS, HOST, CLEAN, LATE,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set the floor', 'Gaming tables, chips, cards and the croupier stations'),
      S('event_lighting', 'recommended', 'Light them', 'Light over each table and a darker room around them'),
      S('live_entertainment', 'recommended', 'Deal', 'Trained croupiers running simulated play, which makes it convincing'),
      S('decoration_floral', 'conditional', 'Dress it', 'A room that looks like a casino rather than a hall with felt tables', { when: WHEN_BIG_LOOK }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service, as you chose', { when: WHEN_BAR }),
      S('dj_music', 'conditional', 'Play', 'Music under the tables, which should not dominate', { when: WHEN_DJ }),
      S('catering_food', 'conditional', 'Feed', 'Canapés and bites people can eat standing at a table', { when: WHEN_FOOD }),
      S('anchor_mc', 'conditional', 'Host', 'A host to open the tables and run the prize conversion', { when: [some(WHEN_HOST[0], ans('prizes', 'prizes', 'charity', 'leaderboard'))] }),
      S('gifts_favours', 'conditional', 'Award', 'Prizes for the chip leaders, which is what chips convert into', { when: [ans('prizes', 'prizes', 'charity')] }),
      S('photography', 'conditional', 'Capture', 'The tables and the room, which photograph well', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic for the host', { when: WHEN_SOUND }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at the tables and lounge space away from them', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Door', 'Door staff, and age checking if there is a bar', { when: [some(WHEN_GUARD[0], WHEN_ALCOHOL[0])] }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that can hold the tables with space to stand around them', { when: WHEN_FINDING }),
    ],
    addons: [
      X('fun_money_rule', 'No money', 'Chips with no cash value, stated on the invitation and at every table', 'poll', { experience: true }),
      X('trained_croupiers', 'Deal it properly', 'Croupiers who can teach a game in thirty seconds', 'group', { trade: 'live_entertainment' }),
      X('prize_conversion', 'Cash them in', 'A staffed prize desk at the end, with the conversion published', 'gift', { trade: 'gifts_favours', when: [ans('prizes', 'prizes', 'charity')] }),
      X('table_lighting', 'Light the felt', 'A light over every table, which is what makes the room read', 'lighting', { trade: 'event_lighting' }),
    ],
    toolkit: { polls: ['date'], note: 'This is simulated play for entertainment. Chips have no cash value, never convert to money, and we will not plan anything that stakes money.' },
    timeline: {
      before: ['No-cash-value rule stated on the invitation and signage', 'Croupiers booked who can teach the games to beginners', 'Prize conversion published before play starts'],
      during: ['Every table opened with a short explanation of the rules', 'Chips tracked against names for the leaderboard', 'Prize conversion at a stated time, publicly'],
      after: ['Tables and chips reconciled and returned', 'Prizes given out at the desk', 'Venue restored'],
    },
    checklist: ['No-cash-value rule stated', 'Trained croupiers booked', 'Prize conversion published', 'Light over every table'],
  }),

  B('great-gatsby-party', 'Art Deco', 'A specific decade, a specific palette, and live jazz rather than a playlist.', {
    about: 'The theme is precise and people know it, which makes shortcuts obvious. Gold, geometry, feathers and a live band are what separate it from a generic costume night.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      Q('elements_g', 'What is part of it?', 'many', { optional: true, options: [['jazz', 'A live jazz band'], ['dancers', 'Period dancers'], ['cars', 'A vintage car'], ['casino_g', 'Gaming tables'], ['awards_g', 'Best-dressed awards'], ['lounge_g', 'A premium lounge']] }),
      DRESS_CODE, DIET_ONLY, ALLERGY_ONLY, PHOTO_SET, PHOTOS, SEATS, HOST, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Deco it', 'Gold, geometry, feathers and a palette held exactly'),
      S('event_lighting', 'recommended', 'Light warm', 'Warm, low, golden light — nothing modern or coloured'),
      S('live_entertainment', 'recommended', 'Swing it', 'A live jazz band, which this theme genuinely requires'),
      S('catering_food', 'conditional', 'Serve', 'Period-styled food and a drinks list to match', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter styled to the era, as you chose', { when: WHEN_BAR }),
      S('event_equipment_rental', 'conditional', 'Build', 'A dance floor, a stage, gaming tables and the entrance set', { when: [some(WHEN_BIG_LOOK[0], ans('elements_g', 'casino_g'))] }),
      S('photography', 'conditional', 'Capture', 'The costumes and the room, shot warm to match the era', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Furnish', 'Period-styled lounge seating and round tables', { when: [some(WHEN_SEATS[0], ans('elements_g', 'lounge_g'))] }),
      S('anchor_mc', 'conditional', 'Host', 'A host in character, running the awards and the floor', { when: [some(WHEN_HOST[0], ans('elements_g', 'awards_g'))] }),
      S('dj_music', 'conditional', 'Close it', 'A DJ for after the band, staying near the era', { when: WHEN_DJ }),
      S('gifts_favours', 'conditional', 'Award', 'Best-dressed prizes, judged properly', { when: [ans('elements_g', 'awards_g')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound for a band and a mic for the host', { when: WHEN_SOUND }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room with height and architecture — this theme needs a building', { when: WHEN_FINDING }),
    ],
    addons: [
      X('live_jazz', 'Hire the band', 'A live jazz band rather than a playlist, which this theme requires', 'music', { trade: 'live_entertainment' }),
      X('vintage_car', 'Park it outside', 'A period car at the entrance, which sets the whole arrival', 'move', { trade: 'transportation', when: [ans('elements_g', 'cars')] }),
      X('period_dancers', 'Open the floor', 'Charleston dancers to start the floor, which nobody will do first', 'group', { trade: 'live_entertainment', when: [ans('elements_g', 'dancers')] }),
      X('deco_photo_set', 'Frame it', 'An Art Deco photo set, lit warm', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Live jazz rather than a playlist. This theme is precise enough that guests notice the shortcuts.' },
    timeline: {
      before: ['Dress code sent early with pictures, not just a decade', 'Band booked and the set brief agreed', 'Palette held across every hired item'],
      during: ['Dancers opening the floor, because nobody goes first', 'Arrivals photographed warm, in the set', 'Awards before people change out of costume'],
      after: ['Photographs shared, graded warm', 'Hired items returned', 'Venue restored'],
    },
    checklist: ['Dress code sent with pictures', 'Live band booked', 'Palette held across hires', 'Warm lighting only'],
  }),

  B('carnival-theme-party', 'Run the midway', 'Stalls, games and colour, which is a small festival indoors or out.', {
    about: 'More build than almost any other theme here. Each stall needs a prize budget, a staff member and a rule, or the midway stops working after an hour.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('attractions', 'What is on?', 'many', { options: [['game_stalls', 'Game stalls'], ['food_stalls_c', 'Food stalls'], ['inflatables', 'Inflatables or rides'], ['performers_c', 'Performers'], ['magic', 'A magic show'], ['face_paint_c', 'Face painting']] }),
      Q('stall_count', 'How many stalls?', 'select', { optional: true, options: [['4', 'Up to 4'], ['10', 'Up to 10'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      EFFECTS, PHOTOS, SEATS, GUARD, CLEAN, WEATHER,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build it', 'Stalls, game frames, counters and the activity zones'),
      S('decoration_floral', 'recommended', 'Colour it', 'Bunting, arches and a midway that reads from the entrance'),
      S('live_entertainment', 'conditional', 'Animate', 'Performers, a magician and walkabout acts for the age range', { when: [ans('attractions', 'performers_c', 'magic')] }),
      S('gifts_favours', 'conditional', 'Stock it', 'Prizes for every stall, counted against expected play', { when: [ans('attractions', 'game_stalls')] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls — popcorn, candy floss and things eaten standing', { when: [some(ans('attractions', 'food_stalls_c'), WHEN_FOOD[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, washrooms, waste and the ground cleared after', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0], WHEN_KIDS[0])] }),
      S('event_lighting', 'conditional', 'Light it', 'Festoon across the midway and light on every stall', { when: [some(WHEN_FX[0], WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Music across the ground and a mic for announcements', { when: WHEN_SOUND }),
      S('bridal_makeup_hair', 'conditional', 'Paint them', 'Face painting, which is the longest queue at any carnival', { when: [ans('attractions', 'face_paint_c')] }),
      S('guest_services', 'conditional', 'Staff it', 'A person on every stall, and a lost-child point if children are coming', { when: [some(WHEN_KIDS[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Capture', 'The midway and the stalls, which photograph brilliantly', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power', 'Power across the midway for stalls, lights and inflatables', { when: [some(WHEN_OUTSIDE[0], ans('attractions', 'inflatables', 'food_stalls_c'))] }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies over stalls and seating where people eat', { when: [some(WHEN_SEATS[0], WHEN_OUTSIDE[0])] }),
      S('security_services', 'conditional', 'Steward', 'Stewarding across the ground', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('venue', 'conditional', 'Find', 'A ground or hall with space between the stalls', { when: WHEN_FINDING }),
    ],
    addons: [
      X('stall_staffing', 'Staff every stall', 'A person on each stall — an unstaffed game stops being played', 'group', { trade: 'guest_services', when: [ans('attractions', 'game_stalls')] }),
      X('prize_budget', 'Count the prizes', 'Prizes counted against expected play, with a top-up held back', 'gift', { trade: 'gifts_favours', when: [ans('attractions', 'game_stalls')] }),
      X('qualified_rides', 'Check them', 'Inflatables and rides only from operators with insurance and inspection', 'game', { experience: true, when: [ans('attractions', 'inflatables')] }),
      X('lost_child_point', 'Reunite', 'A staffed, signposted lost-child point, announced at the start', 'guest_services', { trade: 'guest_services', when: WHEN_KIDS }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Inflatables and rides come only from operators with their own insurance and inspection. With children present, a lost-child point stays on the plan.' },
    timeline: {
      before: ['Midway laid out with walkways, not just stall positions', 'Prizes counted against expected play, with a reserve', 'Ride operators’ insurance and inspection certificates collected'],
      during: ['Every stall staffed — an unstaffed stall is a closed stall', 'Lost-child point announced at the start', 'Prizes topped up before they run out, not after'],
      after: ['Ground cleared, including prize packaging and food waste', 'Stalls and equipment returned', 'Photographs shared'],
    },
    checklist: ['Midway laid out with walkways', 'Every stall staffed', 'Prize reserve held back', 'Ride operator certificates collected'],
  }),

  B('glow-party', 'Wear the light', 'Everybody carrying their own light, which is a different thing from lighting a room.', {
    about: 'Unlike a neon party, the glow is on the guests rather than the walls. Accessories for everyone at the door is the single decision that makes or breaks it.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('glow_kit', 'What are guests given?', 'many', { options: [['sticks', 'Glow sticks and bands'], ['paint', 'UV body paint'], ['wearables', 'LED wearables'], ['tshirts', 'Glow T-shirts'], ['nothing_kit', 'They bring their own']] }),
      Q('activities_gp', 'What else?', 'many', { optional: true, options: [['dance_off', 'A dance competition'], ['installations_gp', 'Light installations'], ['performers_gp', 'Glow performers'], ['glow_run', 'A glow run or walk']] }),
      PHOTO_SET, HOST, PHOTOS, SEATS, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('gifts_favours', 'recommended', 'Light them up', 'Glow accessories for every guest at the door, counted with spares'),
      S('event_lighting', 'recommended', 'Charge it', 'UV fixtures placed so every guest’s kit actually reacts'),
      S('dj_music', 'conditional', 'Drive it', 'A DJ for a floor that will not sit down', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'A floor system and the visuals', { when: WHEN_SOUND }),
      S('bridal_makeup_hair', 'conditional', 'Paint them', 'UV body paint applied at the door, skin-safe only', { when: [ans('glow_kit', 'paint')] }),
      S('decoration_floral', 'conditional', 'React', 'Décor in materials that fluoresce, not just white things', { when: WHEN_BIG_LOOK }),
      S('event_equipment_rental', 'conditional', 'Build', 'Light installations, a dance floor and a UV photo set', { when: [some(ans('activities_gp', 'installations_gp'), WHEN_BOOTH[0])] }),
      S('safety_facilities', 'recommended', 'Dispose of it', 'Glow sticks are liquid-filled — collected, not trodden into a floor'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter under UV, as you chose', { when: WHEN_BAR }),
      S('catering_food', 'conditional', 'Feed', 'Food that can be found in near-darkness', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot the dark', 'Photography set up for UV and long exposure, not flash', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Glow', 'LED and glow performers', { when: [ans('activities_gp', 'performers_gp')] }),
      S('anchor_mc', 'conditional', 'Run it', 'A host for the dance competition', { when: [some(WHEN_HOST[0], ans('activities_gp', 'dance_off'))] }),
      S('security_services', 'conditional', 'Door', 'Door staff and age checking where there is a bar', { when: [some(WHEN_GUARD[0], WHEN_ALCOHOL[0])] }),
      S('venue', 'conditional', 'Find', 'A room that can be made genuinely dark', { when: WHEN_FINDING }),
    ],
    addons: [
      X('kit_for_everyone', 'Give them all one', 'Enough accessories that nobody is the only person not glowing', 'gift', { trade: 'gifts_favours' }),
      X('skin_safe_paint', 'Use safe products', 'Cosmetic-grade UV paint only, with a patch test on request', 'spa', { trade: 'bridal_makeup_hair', when: [ans('glow_kit', 'paint')] }),
      X('glow_disposal', 'Bin them properly', 'Glow sticks collected at the exit, not left to leak on a floor', 'broom', { trade: 'safety_facilities', when: [ans('glow_kit', 'sticks')] }),
      X('long_exposure', 'Shoot it right', 'A photographer working in long exposure, which is the only way', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Glow sticks are liquid-filled and get trodden into floors. They are collected at the exit, and only cosmetic-grade paint goes on anyone.' },
    timeline: {
      before: ['Accessories counted for every guest, with spares', 'Skin-safe paint sourced, with a patch-test offer', 'Room checked for how dark it can be made'],
      during: ['Every guest given a kit at the door', 'Lighting kept low enough for the UV to read', 'Floor watched for broken glow sticks'],
      after: ['Glow sticks collected at the exit and disposed of', 'Paint cleaned off surfaces', 'Venue restored'],
    },
    checklist: ['Accessories for every guest', 'Skin-safe paint only', 'Glow-stick collection at the exit', 'Room genuinely dark'],
  }),

  B('rooftop-celebration', 'Up high', 'A view, a capacity limit and neighbours at ear level.', {
    about: 'Rooftops have two constraints nothing else has: weather with no fallback, and people living beside you at the same height. Both are answered before anything is booked.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD, WEATHER,
      Q('capacity_known', 'Is the roof’s safe capacity confirmed?', 'one', {
        options: [['yes', 'Yes, in writing'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'A roof has a stated safe capacity. It is the building’s, and we never guess it.',
      }),
      Q('occasion_roof', 'What is it for?', 'one', { optional: true, options: [['birthday_r', 'A birthday'], ['corporate_r', 'A work event'], ['private_r', 'A private party'], ['launch_r', 'A launch'], ['sunset_r', 'A sunset gathering']] }),
      DRESS_CODE, PHOTOS, SEATS, GUARD, LATE, CLEAN,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Light low', 'Warm festoon and floor lighting — a rooftop is lit from below'),
      S('tent_furniture', 'recommended', 'Furnish', 'Lounge seating, standing tables and shade or cover'),
      S('sound_av', 'conditional', 'Contain it', 'Sound aimed inward and set to a level the building allows', { when: WHEN_SOUND }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter placed away from the edge, as you chose', { when: WHEN_BAR }),
      S('dj_music', 'conditional', 'Play', 'A DJ who can work at a restrained volume', { when: WHEN_DJ }),
      S('catering_food', 'conditional', 'Feed', 'Canapés and counters, with a route staff can actually use', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress', 'Dressing weighted against wind, nothing that can blow over an edge', { when: WHEN_BIG_LOOK }),
      S('photography', 'conditional', 'Capture', 'Golden hour, which is the only reason a rooftop was chosen', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Count them', 'Door staff, a counted headcount and watch on the edges', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('safety_facilities', 'conditional', 'Check it', 'Edges, stairs and exits checked before doors, and the clear-up', { when: [some(WHEN_CLEAN[0], ans('capacity_known', 'no', 'help'))] }),
      S('power_cooling', 'conditional', 'Power it', 'Power routed safely up, and fans for a hot evening', { when: WHEN_OUTSIDE }),
      S('guest_services', 'conditional', 'Admit', 'A door list and a counted headcount on a limited roof', { when: WHEN_BIG }),
      S('venue', 'conditional', 'Find', 'A roof with a confirmed capacity, a lift and a second exit', { when: WHEN_FINDING }),
    ],
    addons: [
      X('capacity_in_writing', 'Get the number', 'The roof’s safe capacity in writing before any invitation goes out', 'schedule', { experience: true, when: [ans('capacity_known', 'no', 'help')] }),
      X('wind_check', 'Weight it down', 'Everything light weighted or removed, rechecked before doors', 'map', { experience: true }),
      X('sound_limit', 'Keep the neighbours', 'Levels agreed with the building and held, with a limiter if needed', 'sound_av', { experience: true, when: WHEN_LATE }),
      X('rain_cover', 'Cover it', 'Cover that can go up in twenty minutes, held on standby', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
    ],
    toolkit: { polls: ['date'], note: 'A roof has a capacity, a weather risk and neighbours at ear level. All three are the organiser’s, and all three stay on the plan.' },
    timeline: {
      before: ['Roof capacity and second exit confirmed in writing', 'Weather fallback decided with a go or no-go time', 'Sound level agreed with the building management'],
      during: ['Headcount at the door against the roof’s capacity', 'Loose items weighted or removed as wind picks up', 'Levels held, especially after dark'],
      after: ['Everything cleared off the roof the same night', 'Neighbours thanked if it ran late', 'Venue settled'],
    },
    checklist: ['Roof capacity in writing', 'Weather fallback with a decision time', 'Sound level agreed with the building', 'Loose items weighted'],
  }),

  B('outdoor-movie-night', 'Project it', 'A screen outdoors, which needs darkness, rights and a plan for rain.', {
    about: 'Three things stop this working: the sun, the licence and the weather. All three are settled before the blankets are ordered.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK,
      Q('rights', 'Are the screening rights in place?', 'one', {
        options: [['yes', 'Yes'], ['no', 'Not yet'], ['unsure', 'Not sure']],
        help: 'A public screening needs the rights holder’s permission. That is the organiser’s to obtain.',
      }),
      Q('screen_size', 'How big does the screen need to be?', 'select', { options: [['small', 'Small — up to 30 people'], ['medium', 'Medium — up to 150'], ['large', 'Large — up to 500'], ['huge', 'Larger']] }),
      Q('comfort', 'What are people sitting on?', 'many', { optional: true, options: [['beanbags', 'Beanbags'], ['blankets', 'Blankets and cushions'], ['chairs_mv', 'Chairs'], ['deck', 'Deckchairs'], ['own_mv', 'Their own']] }),
      FOOD, DRINKS, SEATS, PHOTOS, WEATHER, CLEAN, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project it', 'A projector matched to the screen, and sound that reaches the back row'),
      S('event_equipment_rental', 'recommended', 'Set the screen', 'Screen, frame, projection position and the seating layout'),
      S('tent_furniture', 'conditional', 'Soften it', 'Beanbags, blankets, deckchairs and something to lean on', { when: [some(has('comfort'), WHEN_SEATS[0])] }),
      S('power_cooling', 'recommended', 'Power it', 'Power and a backup feed — a projector dropping ends the evening'),
      S('catering_food', 'conditional', 'Feed', 'Popcorn, snacks and food that can be eaten in the dark', { when: WHEN_FOOD }),
      S('event_lighting', 'recommended', 'Light paths', 'Path and exit lighting, and nothing shining at the screen'),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, as you chose', { when: WHEN_BAR }),
      S('decoration_floral', 'conditional', 'Dress it', 'A themed entrance and dressing around the seating', { when: WHEN_BIG_LOOK }),
      S('photography', 'conditional', 'Capture', 'The crowd and the screen, which needs a long exposure', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, waste and the ground cleared afterwards', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Seat them', 'Entry, seating allocation and someone keeping the aisles clear', { when: WHEN_BIG }),
      S('venue', 'conditional', 'Find', 'Somewhere genuinely dark, which is harder than it sounds in a city', { when: WHEN_FINDING }),
    ],
    addons: [
      X('rights_check', 'Clear it', 'Screening rights confirmed in writing before promoting the film', 'schedule', { experience: true, when: [ans('rights', 'no', 'unsure')] }),
      X('darkness_check', 'Wait for dark', 'Start time set from actual darkness, not from the invitation', 'schedule', { experience: true }),
      X('weather_call', 'Decide early', 'A stated go or no-go time, and cover for the projector', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
      X('backup_power', 'Keep it running', 'A backup power feed, because one dropped frame ends the evening', 'power_cooling', { trade: 'power_cooling' }),
    ],
    toolkit: { polls: ['date'], note: 'Screening rights are the organiser’s to obtain, and the start time comes from actual darkness rather than from the invitation.' },
    timeline: {
      before: ['Screening rights confirmed in writing', 'Start time set from real sunset, not from the invitation', 'Projector, sound and backup power tested on site at the right hour'],
      during: ['Nothing shining at the screen, path lighting only', 'Sound checked from the back row before the film starts', 'Weather watched against the agreed decision time'],
      after: ['Ground cleared, including every cushion and cup', 'Equipment returned', 'Attendance reported to the rights holder if required'],
    },
    checklist: ['Screening rights in writing', 'Start time from real darkness', 'Backup power feed', 'Weather decision time agreed'],
  }),

  B('summer-party', 'Keep cool', 'Heat is the theme and the problem, in equal measure.', {
    about: 'An Indian summer afternoon outdoors is a medical risk before it is a party. Shade, water and timing matter more than anything decorative.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('time_summer', 'What time of day?', 'one', { options: [['morning', 'Morning'], ['afternoon_s', 'Afternoon'], ['evening_s', 'Evening'], ['allday_s', 'All day']] }),
      Q('cooling', 'What cooling is arranged?', 'many', { options: [['shade_s', 'Shade'], ['fans', 'Fans or coolers'], ['misting', 'Misting'], ['indoor_s', 'An indoor area'], ['pool_s', 'A pool'], ['none_cool', 'Nothing yet']] }),
      EFFECTS, PHOTOS, SEATS, CLEAN, WEATHER, INVITES,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'Shade them', 'Canopies, shade and seating out of direct sun'),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water points, cold drinks and ice, which is the real requirement'),
      S('power_cooling', 'conditional', 'Cool it', 'Fans, coolers or misting, and power to run them', { when: [some(ans('cooling', 'fans', 'misting'), WHEN_OUTSIDE[0])] }),
      S('catering_food', 'conditional', 'Serve cool', 'Food that survives heat, kept cold until it is served', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Brighten', 'Summer dressing that will not wilt by two in the afternoon', { when: WHEN_BIG_LOOK }),
      S('dj_music', 'conditional', 'Play', 'A DJ for a daytime crowd', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Carry', 'Sound for an open setting', { when: WHEN_SOUND }),
      S('safety_facilities', 'recommended', 'Watch the heat', 'Water, shade, first aid for heat, washrooms and the clear-up'),
      S('photography', 'conditional', 'Capture', 'The afternoon, shot when the light is not directly overhead', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Entertain', 'Music or activities suited to the age mix', { when: [some(WHEN_LIVE[0], WHEN_KIDS[0])] }),
      S('event_lighting', 'conditional', 'Light late', 'Lighting for when the afternoon turns into an evening', { when: [some(ans('time_summer', 'evening_s', 'allday_s'), WHEN_FX[0])] }),
      S('invitation_printing', 'conditional', 'Tell them', 'Invitations that say what to wear and that there is shade', { when: WHEN_INVITES }),
      S('venue', 'conditional', 'Find', 'Somewhere with real shade, water and an indoor option', { when: WHEN_FINDING }),
    ],
    addons: [
      X('shade_everywhere', 'Shade it properly', 'Shade over seating, food and the queue — not just the bar', 'tent', { trade: 'tent_furniture', when: [ans('cooling', 'none_cool', 'shade_s')] }),
      X('water_points', 'Free water', 'Free water across the site, refilled, which is a safety item here', 'glass', { trade: 'bar_beverages' }),
      X('heat_timing', 'Time it right', 'Scheduled away from the worst hours, with a heat cut-off', 'schedule', { experience: true, when: [ans('time_summer', 'afternoon_s', 'allday_s')] }),
      X('ice_cream', 'Cool them down', 'An ice-cream counter, which does more for a summer party than décor', 'bar_beverages', { trade: 'bar_beverages' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Heat is a safety matter at an Indian summer party. Shade, free water and a heat cut-off stay on the plan.' },
    timeline: {
      before: ['Timing set away from the worst heat, with a cut-off agreed', 'Shade planned over seating, food and the queue', 'Cold storage arranged for everything perishable'],
      during: ['Free water available everywhere and refilled', 'Food kept cold until service', 'Anyone struggling moved into shade and cooled'],
      after: ['Site cleared', 'Hired shade and cooling returned', 'Photographs shared'],
    },
    checklist: ['Timing away from peak heat', 'Shade over seating, food and queue', 'Free water refilled', 'Cold storage for perishables'],
  }),
  B('winter-wonderland-party', 'Chill it', 'Winter built indoors, in a country where it mostly is not winter.', {
    about: 'Everything has to be manufactured: the white, the cold feel, the light. Artificial snow is a material people breathe and slip on, so what it is made of matters.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('winter_elements', 'What makes it winter?', 'many', { options: [['snow', 'Artificial snow'], ['ice', 'Ice features'], ['white_decor', 'White and silver décor'], ['lights_w', 'Icicle lighting'], ['trees_w', 'Frosted trees'], ['costumes_w', 'Themed performers']] }),
      Q('heating', 'Does the space need heating or cooling?', 'one', { optional: true, options: [['cooling_w', 'Cooling, to sell the illusion'], ['heating_w', 'Heating'], ['neither', 'Neither']] }),
      CAKE_Q, PHOTO_SET, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Build winter', 'White, silver, frosted trees and a room that reads cold'),
      S('event_lighting', 'recommended', 'Cool the light', 'Cool white and icicle lighting — warm light kills this theme'),
      S('event_equipment_rental', 'conditional', 'Make it', 'Snow machines, ice features, a themed entrance and the photo set', { when: [some(ans('winter_elements', 'snow', 'ice'), WHEN_BOOTH[0], WHEN_BIG_LOOK[0])] }),
      S('power_cooling', 'conditional', 'Cool the room', 'Cooling to sell the illusion, and power for the effects', { when: [some(ans('heating', 'cooling_w', 'heating_w'), ans('winter_elements', 'snow', 'ice'))] }),
      S('catering_food', 'conditional', 'Warm them', 'Warm food and drinks, which is the contrast the theme needs', { when: WHEN_FOOD }),
      S('live_entertainment', 'conditional', 'Perform', 'Themed performers, pitched to the age of the room', { when: [some(WHEN_LIVE[0], ans('winter_elements', 'costumes_w'))] }),
      S('dj_music', 'conditional', 'Play', 'A DJ for the evening', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Amplify', 'Sound for the room and a mic for the host', { when: WHEN_SOUND }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter with something hot, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'The set, which photographs better than almost any theme', { when: WHEN_SHOT }),
      S('cake_desserts', 'conditional', 'Finish', 'A dessert table styled white, which this theme carries well', { when: [ans('cake', 'order')] }),
      S('tent_furniture', 'conditional', 'Seat', 'White and silver seating, warm enough to sit on', { when: WHEN_SEATS }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations and signage, with a note about the snow effect', { when: WHEN_INVITES }),
      S('safety_facilities', 'conditional', 'Clear it', 'Snow residue cleaned up — it makes a floor genuinely slippery', { when: [some(WHEN_CLEAN[0], ans('winter_elements', 'snow'))] }),
      S('venue', 'conditional', 'Find', 'A room that can be cooled and can take a wet floor', { when: WHEN_FINDING }),
    ],
    addons: [
      X('safe_snow', 'Check the snow', 'Artificial snow specified as non-toxic and non-slip, with a wet-floor plan', 'broom', { experience: true, when: [ans('winter_elements', 'snow')] }),
      X('cool_not_warm', 'Hold the palette', 'Cool-white lighting throughout — one warm fixture undoes the theme', 'lighting', { trade: 'event_lighting' }),
      X('warm_drinks', 'Contrast it', 'Hot chocolate and warm drinks, which is what makes the cold fun', 'glass', { trade: 'bar_beverages' }),
      X('snow_photo_set', 'Frame it', 'A snow photo set, lit cool, which will be the most-used corner', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Artificial snow is specified non-toxic and the floor is monitored — it is genuinely slippery, and that is the injury this theme produces.' },
    timeline: {
      before: ['Snow product specified as non-toxic, with a wet-floor plan', 'Lighting designed cool throughout and tested', 'Cooling arranged if the illusion depends on it'],
      during: ['Floor monitored and dried wherever snow falls', 'Lighting held cool — no warm fixtures creeping in', 'Warm drinks served throughout'],
      after: ['Snow residue cleaned fully, including underfoot', 'Set and effects returned', 'Photographs shared'],
    },
    checklist: ['Non-toxic snow specified', 'Wet-floor plan in place', 'Cool-white lighting throughout', 'Warm drinks arranged'],
  }),

  B('tropical-theme-party', 'Bring the heat', 'Green, colour and fruit, which is the easiest theme to do badly.', {
    about: 'Real foliage and real fruit are the difference between a tropical party and plastic flamingos. The food and the plants carry it; the décor budget should follow them.',
    formats: ['outdoor', 'venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD,
      Q('tropical_style', 'Which direction?', 'one', { options: [['beach_t', 'Beach and tiki'], ['jungle', 'Jungle and foliage'], ['island', 'Island and resort'], ['carnival_t', 'Tropical carnival'], ['mixed_t', 'A mix']] }),
      Q('elements_t', 'What is part of it?', 'many', { optional: true, options: [['foliage', 'Real foliage'], ['fruit', 'Fruit displays'], ['mocktails', 'A mocktail station'], ['dancers_t', 'Dancers or drummers'], ['lounge_t', 'A lounge setup']] }),
      DRESS_CODE, PHOTO_SET, PHOTOS, SEATS, WEATHER, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Green it', 'Real foliage and flowers — plastic reads as plastic in a photograph'),
      S('catering_food', 'conditional', 'Feed tropical', 'Fruit, grills and food that belongs to the theme, not garnished to it', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour', 'A mocktail and juice station, which is the centre of this theme', { when: [some(WHEN_BAR[0], ans('elements_t', 'mocktails'))] }),
      S('event_lighting', 'recommended', 'Warm it', 'Warm light with colour through the foliage, not flat uplighting'),
      S('dj_music', 'conditional', 'Play', 'A DJ with the right rhythm, which this theme lives on', { when: WHEN_DJ }),
      S('live_entertainment', 'conditional', 'Perform', 'Drummers or dancers, which lift a tropical party more than décor', { when: [some(WHEN_LIVE[0], ans('elements_t', 'dancers_t'))] }),
      S('tent_furniture', 'conditional', 'Lounge it', 'Low lounge seating, rattan and shade', { when: [some(WHEN_SEATS[0], ans('elements_t', 'lounge_t'), WHEN_OUTSIDE[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Sound for an open setting', { when: WHEN_SOUND }),
      S('photography', 'conditional', 'Capture', 'The colour, which is the whole reason for the theme', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Build', 'A tiki bar, a photo set and the structures the foliage hangs from', { when: [some(WHEN_BIG_LOOK[0], WHEN_BOOTH[0])] }),
      S('power_cooling', 'conditional', 'Cool it', 'Fans and cooling, because this theme is usually held in actual heat', { when: WHEN_OUTSIDE }),
      S('safety_facilities', 'conditional', 'Clear', 'Foliage and fruit waste cleared, which is heavier than it looks', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A space that can take hanging foliage and a wet bar', { when: WHEN_FINDING }),
    ],
    addons: [
      X('real_foliage', 'Use real plants', 'Hired living plants rather than plastic, which photographs differently', 'flower', { trade: 'decoration_floral', when: [ans('elements_t', 'foliage')] }),
      X('fruit_display', 'Build with fruit', 'A carved fruit display, which is décor and food at once', 'chef', { trade: 'catering_food', when: [ans('elements_t', 'fruit')] }),
      X('mocktail_station', 'Pour it fresh', 'A fresh mocktail station, made in front of guests', 'glass', { trade: 'bar_beverages', when: [ans('elements_t', 'mocktails')] }),
      X('shade_and_fans', 'Keep them cool', 'Shade and fans — a tropical theme in real tropical heat needs both', 'tent', { trade: 'power_cooling', when: WHEN_OUTSIDE }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Real foliage and real fruit are worth more than any amount of plastic décor, and they photograph as what they are.' },
    timeline: {
      before: ['Living plants hired rather than plastic bought', 'Fruit ordered fresh for the day, not the day before', 'Shade and cooling planned if it is outdoors'],
      during: ['Fruit displays kept cold and replenished', 'Mocktails made fresh in front of guests', 'Foliage misted so it does not wilt by eight'],
      after: ['Plants returned to the hire company alive', 'Fruit waste cleared, which is heavy and attracts insects', 'Venue restored'],
    },
    checklist: ['Living plants hired', 'Fruit ordered fresh', 'Mocktail station staffed', 'Shade and cooling for real heat'],
  }),

  B('arabian-nights-theme-party', 'Furnish it low', 'Lanterns, textiles and seating on the floor rather than at a table.', {
    about: 'The theme belongs to living cultures, so it is done with respect or not at all: textiles, lanterns and hospitality rather than costume stereotypes. The seating is what transforms the room.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, LOOK, MUSIC, DRINKS, FOOD,
      THEME('How is the theme approached?', [['textiles', 'Textiles, lanterns and low seating'], ['majlis', 'A majlis-style setting'], ['garden_a', 'A courtyard or garden setting'], ['opulent', 'Rich colour and gold'], ['other_a', 'Something else']]),
      Q('elements_a', 'What is part of it?', 'many', { optional: true, options: [['lanterns', 'Lanterns'], ['low_seating', 'Low seating and cushions'], ['drapes', 'Draped ceilings'], ['music_a', 'Traditional music'], ['dance_a', 'Dance performance'], ['food_a', 'Regional food']] }),
      DIET_ONLY, ALLERGY_ONLY, PHOTO_SET, PHOTOS, SEATS, CLEAN, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Drape it', 'Draped ceilings, lanterns and textiles, which transform a plain room'),
      S('tent_furniture', 'recommended', 'Seat them low', 'Low seating, cushions and floor tables — this is the whole setting'),
      S('event_lighting', 'recommended', 'Lantern it', 'Warm, low, patterned light from lanterns rather than fixtures'),
      S('catering_food', 'conditional', 'Feed them', 'Regional food served the way the cuisine is actually served', { when: WHEN_FOOD }),
      S('live_entertainment', 'conditional', 'Perform', 'Musicians or dancers engaged from the tradition, on their terms', { when: [some(WHEN_LIVE[0], ans('elements_a', 'music_a', 'dance_a'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'Tea, juices and a drinks service, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'The textiles and the lantern light, which photograph beautifully', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Carry', 'Sound at a level the setting can hold', { when: WHEN_SOUND }),
      S('event_equipment_rental', 'conditional', 'Build', 'Draping frames, a majlis setting and the photo set', { when: [some(WHEN_BIG_LOOK[0], WHEN_BOOTH[0])] }),
      S('dj_music', 'conditional', 'Play', 'A DJ for later, staying within the mood', { when: WHEN_DJ }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned, including the draping', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room with height for draping and a floor people can sit on', { when: WHEN_FINDING }),
    ],
    addons: [
      X('authentic_sourcing', 'Source it properly', 'Textiles and lanterns sourced properly, not costume-shop approximations', 'craft', { trade: 'decoration_floral' }),
      X('performers_on_terms', 'Engage respectfully', 'Musicians and dancers from the tradition, presenting on their own terms', 'music', { experience: true, when: [ans('elements_a', 'music_a', 'dance_a')] }),
      X('floor_comfort', 'Make it sittable', 'Enough cushions that low seating is comfortable for three hours', 'chair', { trade: 'tent_furniture', when: [ans('elements_a', 'low_seating')] }),
      X('lantern_safety', 'Light safely', 'LED or enclosed lanterns — open flame under draped fabric is not worth it', 'lighting', { trade: 'event_lighting', when: [ans('elements_a', 'lanterns', 'drapes')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'This theme draws on living cultures. We do it with real textiles, real food and performers engaged on their own terms, and never with costume stereotypes.' },
    timeline: {
      before: ['Textiles and lanterns sourced properly rather than from a costume shop', 'Performers engaged directly, presenting what they choose', 'Draping and fire safety checked together'],
      during: ['Low seating kept comfortable and topped up with cushions', 'Enclosed or LED lanterns only, near any fabric', 'Food served the way the cuisine is served'],
      after: ['Draping and textiles returned', 'Performers settled on the night', 'Venue restored'],
    },
    checklist: ['Textiles sourced properly', 'Performers engaged on their own terms', 'Enclosed lanterns under draping', 'Enough cushions for real comfort'],
  }),

  B('space-theme-party', 'Go dark', 'Projection and darkness, which is a technical theme rather than a decorative one.', {
    about: 'Unlike most themes here, this one is built with light rather than props. A dark room and good projection do more than any amount of silver bunting.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, EFFECTS,
      Q('space_elements', 'What is part of it?', 'many', { options: [['projection_s', 'Projection or a planetarium dome'], ['led', 'LED and star effects'], ['props_s', 'Props and set pieces'], ['performers_s', 'Costumed performers'], ['science', 'A science or telescope element'], ['games_s', 'Interactive games']] }),
      Q('education', 'Is there an educational element?', 'yesno', { optional: true }),
      PHOTO_SET, PHOTOS, SEATS, HOST, CLEAN, INVITES,
    ],
    plan: [
      S('sound_av', 'recommended', 'Project it', 'Projection or a dome, which is what actually makes this theme work'),
      S('event_lighting', 'recommended', 'Black it out', 'A genuinely dark room with star and LED effects, not blue uplighting'),
      S('decoration_floral', 'conditional', 'Set it', 'Set pieces and an entrance that reads before the lights go down', { when: WHEN_BIG_LOOK }),
      S('event_equipment_rental', 'conditional', 'Build', 'Set pieces, a dome, interactive stations and the photo set', { when: [some(ans('space_elements', 'projection_s', 'props_s', 'games_s'), WHEN_BOOTH[0])] }),
      S('live_entertainment', 'conditional', 'Inhabit it', 'Costumed performers, or a science presenter for a young crowd', { when: [some(ans('space_elements', 'performers_s', 'science'), WHEN_KIDS[0])] }),
      S('catering_food', 'conditional', 'Feed', 'Food that can be found and eaten in a dark room', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Capture', 'Shot for a dark room — long exposure, not flash into projection', { when: WHEN_SHOT }),
      S('dj_music', 'conditional', 'Play', 'A DJ or a score that suits the room', { when: WHEN_DJ }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, lit so people can see what they are taking', { when: WHEN_BAR }),
      S('anchor_mc', 'conditional', 'Narrate', 'A host or presenter, which a science element genuinely needs', { when: [some(WHEN_HOST[0], ans('education', 'yes'))] }),
      S('power_cooling', 'conditional', 'Power it', 'Power for projection and effects, and cooling in a blacked-out room', { when: [ans('space_elements', 'projection_s', 'led')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating that works in the dark, with lit edges', { when: WHEN_SEATS }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, signage and station labels that read in low light', { when: WHEN_INVITES }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared afterwards, and exits lit throughout', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A room that can be made genuinely dark with height for projection', { when: WHEN_FINDING }),
    ],
    addons: [
      X('projection_test', 'Test the throw', 'Projection surveyed and tested in the actual room, at the right hour', 'media', { trade: 'sound_av', when: [ans('space_elements', 'projection_s')] }),
      X('lit_exits', 'Keep them safe', 'Exit and path lighting that stays on in a blacked-out room', 'lighting', { trade: 'event_lighting' }),
      X('science_presenter', 'Teach something', 'A presenter who can explain what is on the ceiling', 'group', { trade: 'live_entertainment', when: [ans('education', 'yes')] }),
      X('dark_photography', 'Shoot it right', 'A photographer working long exposure, never flashing into projection', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'A blacked-out room keeps lit exits and lit paths throughout. Projection is tested in the actual room before the content is finished.' },
    timeline: {
      before: ['Projection surveyed and tested in the real room', 'Exit and path lighting planned to stay on throughout', 'Content mapped to the actual surfaces'],
      during: ['Exits and paths lit at all times', 'No flash photography into the projection', 'Interactive stations staffed and reset'],
      after: ['Equipment struck and the room reset', 'Photographs shared', 'Content archived for reuse'],
    },
    checklist: ['Projection tested in the room', 'Lit exits throughout', 'No flash into projection', 'Cooling for a blacked-out room'],
  }),

  B('decades-theme-party', 'Travel through', 'Several decades at once, which is a zoning problem rather than a décor one.', {
    about: 'Different from a single-decade party: here the room moves through time, either in zones or across the evening. The transitions are the design, and without them it is just a mixed playlist.',
    formats: ['venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK,
      Q('decades_included', 'Which decades?', 'many', { options: [['60s_d', 'Sixties'], ['70s_d', 'Seventies'], ['80s_d', 'Eighties'], ['90s_d', 'Nineties'], ['2000s_d', 'Two-thousands'], ['2010s_d', 'Twenty-tens']] }),
      Q('arrangement', 'How are the decades arranged?', 'one', {
        options: [['zones', 'Separate zones, one per decade'], ['journey', 'The evening moves through them in order'], ['mixed_arr', 'Mixed throughout'], ['sets', 'Music sets only']],
        help: 'Zones or a journey is what makes this different from a mixed playlist.',
      }),
      MUSIC, DRINKS, FOOD, EFFECTS, DRESS_CODE, PHOTO_SET, CLEAN, PHOTOS, SEATS, HOST, LATE,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Zone it', 'A distinct look per decade, so moving between them is visible'),
      S('event_lighting', 'recommended', 'Shift it', 'Lighting that changes with each decade, which carries the transitions'),
      S('dj_music', 'conditional', 'Time travel', 'A DJ running the decades in order, with real transitions', { when: WHEN_DJ }),
      S('sound_av', 'conditional', 'Zone the sound', 'Separate sound per zone, or one system that shifts with the journey', { when: WHEN_SOUND }),
      S('event_equipment_rental', 'conditional', 'Zone it', 'Zone divisions, set pieces and a photo set per decade', { when: [some(ans('arrangement', 'zones', 'journey'), WHEN_BOOTH[0])] }),
      S('anchor_mc', 'conditional', 'Mark it', 'A host to mark each decade change, which nobody notices otherwise', { when: [some(WHEN_HOST[0], ans('arrangement', 'journey'))] }),
      S('catering_food', 'conditional', 'Feed by era', 'Food and drinks that change with the decades, which guests notice', { when: WHEN_FOOD }),
      S('bar_beverages', 'conditional', 'Pour by era', 'A drinks list that moves through the decades, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture each', 'A photo position per decade, which gives guests several looks', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Perform', 'A tribute act or performers for one of the decades', { when: WHEN_LIVE }),
      S('gifts_favours', 'conditional', 'Prize', 'Best-dressed prizes, judged per decade rather than overall', { when: WHEN_HOST }),
      S('tent_furniture', 'conditional', 'Seat by zone', 'Seating styled differently in each zone', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('power_cooling', 'conditional', 'Feed the zones', 'Distributed power, because each zone runs its own sound and lighting', { when: [ans('arrangement', 'zones')] }),
      S('venue', 'conditional', 'Find', 'A space that divides into zones, or one that can change completely', { when: WHEN_FINDING }),
    ],
    addons: [
      X('decade_zones', 'Divide it', 'A distinct zone per decade, with its own look, music and drink', 'map', { trade: 'decoration_floral', when: [ans('arrangement', 'zones')] }),
      X('transition_moments', 'Mark the jump', 'A lighting and music transition at each decade change, announced', 'schedule', { experience: true, when: [ans('arrangement', 'journey')] }),
      X('per_decade_prizes', 'Judge by era', 'Best-dressed judged per decade, so every era has a winner', 'gift', { trade: 'gifts_favours' }),
      X('photo_per_decade', 'Shoot each era', 'A photo position in each zone, so guests leave with several looks', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Zones or a journey — otherwise this is a single party with a mixed playlist and a confusing dress code.' },
    timeline: {
      before: ['Decades chosen and the arrangement decided — zones or a journey', 'Dress code explained per decade, sent early', 'Transitions planned with lighting and music cues'],
      during: ['Each decade change marked clearly, in light and sound', 'Photo positions open in every zone', 'Prizes judged per decade before people change'],
      after: ['Zone sets struck', 'Photographs shared, grouped by decade', 'Venue restored'],
    },
    checklist: ['Arrangement decided — zones or journey', 'Dress code explained per decade', 'Transitions cued', 'A photo position per zone'],
  }),

  B('murder-mystery-party', 'Solve it', 'A script, assigned characters and guests who have to do the work.', {
    about: 'The guests are the cast, which makes the casting and the briefing the whole event. A script nobody read in advance collapses in the first fifteen minutes.',
    formats: ['venue', 'home'],
    ask: [
      GUESTS, PLACE, LOOK, DRINKS, FOOD,
      Q('format_mm', 'How is it run?', 'one', { options: [['scripted', 'A scripted game, guests play characters'], ['actors', 'Professional actors with guests investigating'], ['dinner_mm', 'A mystery over dinner courses'], ['immersive_mm', 'Fully immersive'], ['light_mm', 'A light game alongside a party']] }),
      Q('characters', 'Are characters assigned in advance?', 'yesno', {
        help: 'Characters sent out a week ahead is the single thing that decides whether this works.',
      }),
      Q('duration_mm', 'How long does it run?', 'select', { optional: true, options: [['2', 'Two hours'], ['3', 'Three hours'], ['4', 'Across a whole dinner'], ['evening_mm', 'The whole evening']] }),
      DIET_ONLY, ALLERGY_ONLY, DRESS_CODE, MUSIC, PHOTOS, SEATS, HOST, CLEAN, INVITES,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Run the game', 'A facilitator who keeps the plot moving when the guests stall'),
      S('invitation_printing', 'recommended', 'Brief them', 'Character packs sent in advance, clue cards and the evidence'),
      S('decoration_floral', 'conditional', 'Set the scene', 'A room dressed to the period and the setting of the story', { when: WHEN_BIG_LOOK }),
      S('event_lighting', 'recommended', 'Light the mood', 'Low, directional light — a brightly lit murder mystery does not work'),
      S('live_entertainment', 'conditional', 'Cast it', 'Professional actors, which changes this from a game to an experience', { when: [ans('format_mm', 'actors', 'immersive_mm')] }),
      S('catering_food', 'conditional', 'Course it', 'Courses timed to the acts, which is how the plot is paced', { when: WHEN_FOOD }),
      S('event_equipment_rental', 'conditional', 'Build', 'Props, evidence displays and set pieces for each room', { when: [some(WHEN_BIG_LOOK[0], ans('format_mm', 'immersive_mm'))] }),
      S('sound_av', 'conditional', 'Cue it', 'Sound cues and a mic for the facilitator', { when: WHEN_SOUND }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks service between acts, as you chose', { when: WHEN_BAR }),
      S('photography', 'conditional', 'Capture', 'Guests in character, which they will want afterwards', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating arranged so everyone can see and be heard', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A space with separate rooms, which the format needs', { when: WHEN_FINDING }),
    ],
    addons: [
      X('character_packs', 'Send them early', 'Character packs a week ahead, which is what makes guests play', 'invite', { trade: 'invitation_printing', when: [ans('characters', 'yes')] }),
      X('course_pacing', 'Pace the plot', 'Courses timed to the acts, agreed with the kitchen beforehand', 'schedule', { experience: true, when: [ans('format_mm', 'dinner_mm')] }),
      X('facilitator', 'Keep it moving', 'A facilitator who can restart a stalled room without breaking the game', 'group', { trade: 'anchor_mc' }),
      X('opt_out', 'Let them watch', 'A way for a guest to take part lightly, without a speaking character', 'heart', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Send the character packs a week ahead, and give anyone who would rather not perform a way to take part without a speaking role.' },
    timeline: {
      before: ['Character packs sent a week ahead, matched to who will enjoy them', 'Courses timed to the acts with the kitchen', 'A non-speaking role prepared for anyone who prefers one'],
      during: ['Facilitator restarting the room whenever it stalls', 'Courses served on the act cues, not on the kitchen’s clock', 'Nobody pushed into performing'],
      after: ['The solution explained properly, to everyone', 'Photographs in character shared', 'Props collected'],
    },
    checklist: ['Character packs sent a week ahead', 'Courses timed to the acts', 'Facilitator booked', 'A light-participation option'],
  }),

  B('pajama-party', 'Settle in', 'Comfort as the theme, which means bedding, films and almost no production.', {
    about: 'The easiest theme to over-produce. Soft seating, a screen and good snacks do all of it, and anything that needs a crew has probably gone too far.',
    formats: ['home', 'venue'],
    ask: [
      GUESTS, PLACE, AGES, LOOK,
      Q('overnight', 'Is anyone staying overnight?', 'yesno', {
        help: 'Overnight with children means supervision, a sleeping plan and contact details for every guardian.',
      }),
      Q('activities_pj', 'What is planned?', 'many', { options: [['movie_pj', 'A film'], ['games_pj', 'Games'], ['karaoke_pj', 'Karaoke'], ['beauty', 'Pampering or grooming'], ['crafts_pj', 'Crafts'], ['midnight_snack', 'A midnight snack']] }),
      FOOD, DRINKS, MUSIC, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('tent_furniture', 'recommended', 'Make it soft', 'Mattresses, beanbags, cushions and bedding for everyone'),
      S('sound_av', 'conditional', 'Screen it', 'A projector or screen and sound for the film', { when: [some(ans('activities_pj', 'movie_pj', 'karaoke_pj'), WHEN_SOUND[0])] }),
      S('event_lighting', 'recommended', 'Dim it', 'Warm, low light and fairy lights — nothing overhead'),
      S('catering_food', 'conditional', 'Snack them', 'Snacks through the evening and something at midnight', { when: [some(WHEN_FOOD[0], ans('activities_pj', 'midnight_snack'))] }),
      S('decoration_floral', 'conditional', 'Dress it', 'Soft dressing, which is most of what this theme is', { when: WHEN_BIG_LOOK }),
      S('live_entertainment', 'conditional', 'Entertain', 'Games, crafts or a host for a younger group', { when: [some(ans('activities_pj', 'games_pj', 'crafts_pj'), WHEN_KIDS[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Pamper', 'A grooming or pampering session, which this theme often centres on', { when: [ans('activities_pj', 'beauty')] }),
      S('photography', 'conditional', 'Capture', 'A few candid photographs, with everyone asked first', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour', 'Hot chocolate, soft drinks and a counter, as you chose', { when: WHEN_BAR }),
      S('guest_services', 'conditional', 'Supervise', 'Supervision overnight, with guardian contact details held', { when: [ans('overnight', 'yes')] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations with a kit list and the pick-up time', { when: WHEN_INVITES }),
      S('safety_facilities', 'conditional', 'Reset', 'Bedding collected and the space reset', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A space with carpet, washrooms and somewhere to change', { when: WHEN_FINDING }),
    ],
    addons: [
      X('bedding_for_all', 'Enough for everyone', 'A mattress or beanbag each, counted — not shared cushions', 'bed', { trade: 'tent_furniture' }),
      X('overnight_plan', 'Plan the night', 'A sleeping plan, named supervision and guardian contacts for everyone', 'heart', { experience: true, when: [ans('overnight', 'yes')] }),
      X('movie_rights', 'Check the film', 'A private screening at home is fine; anything ticketed needs rights', 'schedule', { experience: true, when: [ans('activities_pj', 'movie_pj')] }),
      X('midnight_snack', 'Feed them late', 'Something at midnight, which is the bit everyone remembers', 'chef', { trade: 'catering_food', when: [ans('activities_pj', 'midnight_snack')] }),
    ],
    toolkit: { guardian: true, chat: 'organiser', polls: ['date', 'food'], note: 'Overnight with children needs named supervision, a sleeping plan and a contact for every guardian. Nobody is photographed without being asked.' },
    timeline: {
      before: ['Bedding counted for every guest, not shared', 'Guardian contacts and any medical needs collected if staying overnight', 'Kit list sent with the invitation'],
      during: ['Named supervision awake through the night', 'Photography only with everyone asked', 'Midnight snack as promised'],
      after: ['Bedding collected and laundered', 'Every guest handed over to their guardian', 'Space reset'],
    },
    checklist: ['Bedding counted per guest', 'Named overnight supervision', 'Guardian contacts held', 'Kit list sent in advance'],
  }),

  B('silent-party', 'Headphones on', 'Three channels and a room that sounds like nothing from outside it.', {
    about: 'The format solves noise entirely and introduces one problem instead: the headsets. Counting them out and back is the difference between a cheap night and an expensive one.',
    formats: ['venue', 'outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, DRINKS, FOOD,
      Q('channels', 'How many channels?', 'select', { options: [['2', 'Two'], ['3', 'Three'], ['4', 'Four or more']] }),
      Q('headsets', 'Headphones', 'one', { options: [['hire', 'Please arrange them'], ['have_hs', 'We have them'], ['venue_hs', 'The venue provides them']] }),
      Q('deposit', 'Is a deposit or ID held against headsets?', 'yesno', { optional: true }),
      EFFECTS, INVITES, PHOTOS, SEATS, GUARD, CLEAN, LATE,
    ],
    plan: [
      S('sound_av', 'recommended', 'Transmit', 'Transmitters per channel, headsets issued and counted back'),
      S('dj_music', 'recommended', 'Split it', 'A DJ per channel, which is the entire point of the format'),
      S('guest_services', 'recommended', 'Issue them', 'Issue and return desks, with a count that actually reconciles'),
      S('event_lighting', 'recommended', 'Signal it', 'Lighting that shows which channel the room is listening to'),
      S('event_equipment_rental', 'conditional', 'Build', 'Booths per channel, a dance area and the issue desks', { when: [ans('channels', '3', '4')] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, as you chose', { when: WHEN_BAR }),
      S('power_cooling', 'conditional', 'Charge them', 'Power for transmitters and a charging area for the headsets', { when: [some(ans('headsets', 'hire'), WHEN_OUTSIDE[0])] }),
      S('photography', 'conditional', 'Capture', 'A silent crowd dancing photographs far better than it sounds', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Feed', 'Food away from the issue desks, so the queues do not merge', { when: WHEN_FOOD }),
      S('invitation_printing', 'conditional', 'Signpost', 'Channel signage, deposit slips and wristbands', { when: [some(WHEN_INVITES[0], ans('deposit', 'yes'))] }),
      S('security_services', 'conditional', 'Watch', 'Door staff, and watch on headsets, which walk out of buildings', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating off the floor, where people take headsets off to talk', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Clear', 'Cleared afterwards, with every headset accounted for', { when: WHEN_CLEAN }),
      S('venue', 'conditional', 'Find', 'A space that works precisely because the sound stays in the headsets', { when: WHEN_FINDING }),
    ],
    addons: [
      X('headset_reconciliation', 'Count them back', 'Headsets counted out and in against a deposit or ID list', 'poll', { trade: 'guest_services' }),
      X('charging_station', 'Charge them first', 'A charging area so every headset is full before doors', 'power_cooling', { trade: 'power_cooling', when: [ans('headsets', 'hire')] }),
      X('channel_colours', 'Signal it', 'Clear channel colours on the headsets and in the lighting', 'invite', { trade: 'invitation_printing' }),
      X('late_finish', 'Run on', 'A later finish, because the sound never leaves the headsets', 'schedule', { experience: true, when: WHEN_LATE }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Count the headsets out and back. Reconciliation is the difference between this format being cheap and being very expensive.' },
    timeline: {
      before: ['Headset count confirmed against expected numbers, with spares', 'All sets charged and tested before doors', 'Deposit or ID policy agreed and signposted'],
      during: ['Issue desk staffed, count recorded as sets go out', 'Channels signposted and lit', 'Return desk open well before the end, not at it'],
      after: ['Headsets counted back and reconciled the same night', 'Charging and packing completed', 'Deposits returned'],
    },
    checklist: ['Headset count with spares', 'All sets charged before doors', 'Deposit policy signposted', 'Return desk open early'],
  }),

  B('enchanted-garden-party', 'Make it magic', 'A garden lit so it stops looking like a garden.', {
    about: 'The lighting does almost everything. Fairy light, florals and a few staged moments turn an ordinary lawn into somewhere people photograph for an hour.',
    formats: ['outdoor'],
    ask: [
      GUESTS, PLACE, AGES, LOOK, MUSIC, DRINKS, FOOD, WEATHER,
      Q('elements_eg', 'What is part of it?', 'many', { optional: true, options: [['fairy_lights', 'Fairy and festoon lighting'], ['florals', 'Heavy florals'], ['performers_eg', 'Fairy-tale performers'], ['games_eg', 'Garden games'], ['acoustic_eg', 'Acoustic music'], ['installations_eg', 'Light installations']] }),
      DIET_ONLY, ALLERGY_ONLY, PHOTO_SET, PHOTOS, SEATS, CLEAN, INVITES,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Enchant it', 'Fairy light, uplit trees and festoon — the theme is the lighting'),
      S('decoration_floral', 'recommended', 'Flower it', 'Heavy florals and greenery, worked into the garden’s own planting'),
      S('tent_furniture', 'recommended', 'Furnish', 'Seating, cover and a setting that belongs in a garden after dark'),
      S('catering_food', 'conditional', 'Serve', 'Food that works outdoors, to everyone’s needs', { when: WHEN_FOOD }),
      S('live_entertainment', 'conditional', 'Charm them', 'Acoustic musicians or performers, pitched to the age range', { when: [some(WHEN_LIVE[0], ans('elements_eg', 'performers_eg', 'acoustic_eg'))] }),
      S('photography', 'conditional', 'Capture', 'Shot at dusk, which is the twenty minutes this theme exists for', { when: WHEN_SHOT }),
      S('event_equipment_rental', 'conditional', 'Build', 'Light installations, a photo set and garden games', { when: [some(ans('elements_eg', 'installations_eg', 'games_eg'), WHEN_BOOTH[0])] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter under the lights, as you chose', { when: WHEN_BAR }),
      S('sound_av', 'conditional', 'Carry', 'Sound for an open garden, which swallows volume', { when: WHEN_SOUND }),
      S('power_cooling', 'recommended', 'Power it', 'Power for lighting across a garden, which has none'),
      S('dj_music', 'conditional', 'Play', 'A DJ for later in the evening', { when: WHEN_DJ }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, lit paths and the garden left as found', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, signage and place cards', { when: WHEN_INVITES }),
      S('venue', 'conditional', 'Find', 'A garden with trees to light and a flat area to set up on', { when: WHEN_FINDING }),
    ],
    addons: [
      X('dusk_timing', 'Time it to dusk', 'Doors timed so guests arrive as the lighting starts to work', 'camera', { experience: true }),
      X('tree_uplighting', 'Light the trees', 'Uplighting in the planting, which is what transforms a garden', 'lighting', { trade: 'event_lighting', when: [ans('elements_eg', 'fairy_lights')] }),
      X('lit_paths', 'Guide them', 'Lit paths and steps, because a dark garden is a trip hazard', 'map', { trade: 'safety_facilities' }),
      X('rain_cover', 'Cover it', 'Cover that can go up quickly, with a stated decision time', 'tent', { trade: 'tent_furniture', when: WHEN_COVER }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Time the doors to dusk — the lighting is the whole theme, and it does nothing in daylight. Paths and steps stay lit all evening.' },
    timeline: {
      before: ['Lighting designed and tested after dark, in the actual garden', 'Doors timed so arrivals land as the light starts to work', 'Weather fallback agreed with a decision time'],
      during: ['Paths and steps lit throughout', 'Photographs taken at dusk, which is the short window', 'Cover put up at the agreed threshold'],
      after: ['Lighting and installations removed, garden left as found', 'Photographs shared', 'Hired furniture collected'],
    },
    checklist: ['Lighting tested after dark on site', 'Doors timed to dusk', 'Paths and steps lit', 'Weather fallback with a decision time'],
  }),
]

export const THEMED_BLUEPRINT = Object.fromEntries(THEMED_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(THEMED_BLUEPRINTS, 'themed')
