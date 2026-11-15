/**
 * Special Occasions & Private Experiences — one blueprint per occasion.
 *
 * Twenty small, private occasions. Small does not mean simple:
 *
 *   · Privacy is the product. Nothing is photographed, posted or named
 *     without the people in it agreeing first, and a private evening
 *     never becomes anyone's marketing.
 *   · A surprise needs one person inside it. We plan around them and
 *     tell nobody else, including the person it is for.
 *   · Alcohol is never assumed. It appears only where it was asked for,
 *     and it is served by someone who will stop serving.
 *   · Open flame is never the default. Enclosed candles or battery
 *     lights are offered first, and open flame only where it is asked
 *     for and the setting can carry it safely.
 *   · A home or a rooftop is somebody's building. Neighbours, lift
 *     access, closing times and the edge of a terrace come before the
 *     styling.
 *   · A private screening needs the rights, and a private performance
 *     runs on the artist's own terms.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, checkTrades,
  PHOTOS, DIET_ONLY, ALLERGY_ONLY, CAKE_Q, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a private occasion asks ──────────────────────── */

const PEOPLE = Q('guests_count', 'How many people?', 'select', {
  options: [['2', 'Just the two of us'], ['6', 'Up to six'], ['20', 'Up to twenty'], ['50', 'Up to fifty'], ['120', 'Up to a hundred and twenty']],
})
const PLACE_P = Q('place', 'Where is it?', 'one', {
  options: [['home', 'Our home'], ['restaurant', 'A restaurant'], ['rooftop', 'A rooftop or terrace'], ['garden_p', 'A garden'], ['villa', 'A private villa'], ['find_p', 'Please help us find somewhere']],
})
const PRIVACY = Q('privacy', 'How private does it need to be?', 'one', {
  options: [['total', 'Completely private'], ['discreet', 'Discreet'], ['open_p', 'Not a concern']],
  help: 'Nothing is photographed, posted or named without the people in it agreeing first.',
})
const SURPRISE = Q('surprise', 'Is it a surprise?', 'yesno', { optional: true })
const MOOD = Q('mood', 'What should it feel like?', 'one', {
  options: [['romantic_m', 'Romantic'], ['quiet_m', 'Quiet and intimate'], ['festive_m', 'Festive'], ['formal_m', 'Formal'], ['playful_m', 'Playful']],
})
const FOOD_P = Q('food', 'Food', 'one', {
  options: [['plated', 'A plated dinner'], ['chef', 'A chef cooking there'], ['buffet_p', 'A buffet'], ['canapes', 'Canapés'], ['dessert_p', 'Dessert only'], ['none_p', 'Nothing needed']],
})
const DRINKS = Q('drinks', 'Drinks', 'one', {
  options: [['soft', 'Soft drinks only'], ['wine', 'Wine with dinner'], ['bar_p', 'A bar'], ['none_dr', 'Nothing needed']],
  help: 'Alcohol appears only if you ask for it, and is served by someone who will stop serving.',
})
const MUSIC_P = Q('music', 'Music', 'one', {
  optional: true,
  options: [['live_m', 'A live musician'], ['dj_p', 'A DJ'], ['playlist', 'A playlist'], ['quiet_mu', 'No music']],
})
const DECOR_P = Q('decor', 'How much decoration?', 'one', {
  optional: true, options: [['full_p', 'A full setup'], ['focal_p', 'A few focal points'], ['light_p', 'Light touches'], ['none_de', 'None']],
})
const FLAME = Q('flame', 'Candles', 'one', {
  optional: true,
  options: [['enclosed', 'Enclosed candles'], ['battery', 'Battery lights'], ['open_f', 'Open flame'], ['none_f', 'No candles']],
  help: 'We offer enclosed candles or battery lights first. Open flame only where you ask for it and the setting can carry it.',
})
const NEIGHBOURS = Q('neighbours', 'Have the neighbours or the building been told?', 'one', {
  optional: true, when: [ans('place', 'home', 'rooftop', 'villa')],
  options: [['yes_n', 'Yes'], ['will_n', 'We will'], ['no_n', 'Not needed']],
})
const END_TIME = Q('end_time', 'When does it need to finish?', 'one', {
  optional: true, options: [['ten_p', 'By 10 pm'], ['eleven_p', 'By 11 pm'], ['late_p', 'Late'], ['open_t', 'No fixed time']],
})
const SERVICE = Q('service', 'Do you want staff serving?', 'yesno', { optional: true })
const GIFTS_P = Q('gifts', 'Gifts or favours for the guests?', 'yesno', { optional: true })
const RIDE = Q('transport', 'Do you need cars for anyone?', 'yesno', { optional: true })

const WHEN_HOME = [ans('place', 'home', 'villa')]
const WHEN_ROOFTOP = [ans('place', 'rooftop')]
const WHEN_RESTAURANT = [ans('place', 'restaurant')]
const WHEN_OUTSIDE = [ans('place', 'rooftop', 'garden_p')]
const WHEN_FIND = [ans('place', 'find_p')]
const WHEN_PRIVATE = [ans('privacy', 'total', 'discreet')]
const WHEN_SURPRISE = [ans('surprise', 'yes')]
const WHEN_FED = [ans('food', 'plated', 'chef', 'buffet_p', 'canapes', 'dessert_p')]
const WHEN_COOKED = [ans('food', 'plated', 'chef', 'buffet_p')]
const WHEN_CHEF = [ans('food', 'chef')]
const WHEN_DRINKS = [ans('drinks', 'wine', 'bar_p')]
const WHEN_BAR = [ans('drinks', 'bar_p')]
const WHEN_MUSIC = [ans('music', 'live_m', 'dj_p', 'playlist')]
const WHEN_LIVE = [ans('music', 'live_m')]
const WHEN_DJ = [ans('music', 'dj_p')]
const WHEN_DECOR = [ans('decor', 'full_p', 'focal_p', 'light_p')]
const WHEN_BIG_DECOR = [ans('decor', 'full_p', 'focal_p')]
const WHEN_FLAME = [ans('flame', 'enclosed', 'open_f')]
const WHEN_OPEN_FLAME = [ans('flame', 'open_f')]
const WHEN_SERVICE = [ans('service', 'yes')]
const WHEN_GIFTS = [ans('gifts', 'yes')]
const WHEN_RIDE = [ans('transport', 'yes')]
const WHEN_CAKE = [notAns('cake', 'no')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_LATE = [ans('end_time', 'late_p', 'open_t')]
const WHEN_GROUP = [ans('guests_count', '20', '50', '120')]
const WHEN_CROWD = [ans('guests_count', '50', '120')]

export const SPECIAL_BLUEPRINTS = [

  B('surprise-celebration', 'Keep it quiet', 'Everything normal until the moment it is not.', {
    about: 'The whole event is one reveal. That means an accomplice, a cover story, suppliers who arrive without being seen, and nothing in writing that the person might read.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, SURPRISE, MOOD, FOOD_P, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, GIFTS_P, RIDE],
    plan: [
      S('decoration_floral', 'conditional', 'Dress it fast', 'A setup that goes in quickly, while the person is elsewhere', { when: WHEN_DECOR }),
      S('catering_food', 'conditional', 'Feed them', 'Food arriving quietly and held until the reveal', { when: WHEN_FED }),
      S('cake_desserts', 'conditional', 'Bring the cake', 'A cake kept out of sight until the moment', { when: WHEN_CAKE }),
      S('photography', 'conditional', 'Catch the face', 'A photographer in position before the reveal, not after it', { when: WHEN_SHOT }),
      S('guest_services', 'recommended', 'Run the plan', 'Guests briefed, timed and kept quiet, with one accomplice in charge'),
      S('bar_beverages', 'conditional', 'Pour', 'Drinks ready to serve the moment the surprise lands', { when: WHEN_DRINKS }),
      S('dj_music', 'conditional', 'Cue the music', 'Music that starts on the reveal, not before it', { when: WHEN_DJ }),
      S('live_entertainment', 'conditional', 'Surprise them', 'A performer brought in as part of the reveal', { when: WHEN_LIVE }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting that changes as the reveal happens', { when: WHEN_BIG_DECOR }),
      S('passenger_transport', 'conditional', 'Get them there', 'A car for the person, on the cover story’s timing', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Find somewhere', 'Somewhere that can be set up unseen and holds the group', { when: WHEN_FIND }),
    ],
    addons: [
      X('one_accomplice', 'Name one person', 'One accomplice who holds the whole plan, so nobody else slips', 'group', { experience: true, when: WHEN_SURPRISE }),
      X('cover_story', 'Build a cover', 'A reason to be there that holds up until the door opens', 'invite', { experience: true, when: WHEN_SURPRISE }),
      X('quiet_arrival', 'Arrive unseen', 'Suppliers timed and routed so nothing is spotted early', 'schedule', { experience: true }),
      X('reveal_photo', 'Shoot the reveal', 'A camera on the face, which is the only shot that matters', 'camera', { trade: 'photography', when: WHEN_SHOT }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Only your accomplice gets the plan. We send nothing to the person it is for, and nothing is posted anywhere until you say so.' },
    timeline: {
      before: ['One accomplice named and given the whole plan', 'A cover story agreed that holds until the door opens', 'Suppliers timed and routed so nothing is seen early'],
      during: ['Everything set up while the person is elsewhere', 'A camera on the face at the moment of the reveal', 'Music, lights and drinks cued to the reveal, not before'],
      after: ['Photographs shown to them before anything is shared', 'Space restored', 'Guests who travelled got home'],
    },
    checklist: ['One accomplice holds the plan', 'A cover story that holds', 'Suppliers arrive unseen', 'A camera on the reveal'],
  }),

  B('romantic-dinner', 'Just you two', 'One table, done properly, with nobody else in the room.', {
    about: 'Small enough that every detail is visible. The table, the light and the quiet are the event; anything added beyond that usually takes away from it.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, FLAME, PHOTOS, SERVICE],
    plan: [
      S('catering_food', 'recommended', 'Cook for two', 'A menu built for two, served at the pace you want'),
      S('decoration_floral', 'conditional', 'Set the table', 'A table setting and flowers, kept restrained rather than loud', { when: WHEN_DECOR }),
      S('event_lighting', 'recommended', 'Light it low', 'Low, warm light, which does more here than anything else'),
      S('live_entertainment', 'conditional', 'Play quietly', 'A musician playing quietly, and leaving before dessert', { when: WHEN_LIVE }),
      S('bar_beverages', 'conditional', 'Pour it', 'Wine chosen for the menu, or something better than soft drinks', { when: WHEN_DRINKS }),
      S('guest_services', 'conditional', 'Serve them', 'One server who is present when needed and invisible otherwise', { when: [some(WHEN_SERVICE[0], ans('food', 'plated', 'chef'))] }),
      S('photography', 'conditional', 'Capture it', 'A short discreet session at the start, then left alone', { when: WHEN_SHOT, unless: UNLESS_PHOTO }),
      S('venue', 'conditional', 'Find the table', 'Somewhere with a table that is genuinely private', { when: WHEN_FIND }),
    ],
    addons: [
      X('enclosed_candles', 'Light them safely', 'Enclosed candles or battery lights, which is what we offer first', 'lighting', { trade: 'event_lighting', when: WHEN_FLAME }),
      X('own_pace', 'Slow it down', 'Courses paced to you, not to the kitchen’s convenience', 'cutlery', { trade: 'catering_food', when: WHEN_FED }),
      X('no_interruptions', 'Leave them be', 'A server who checks once a course and otherwise stays away', 'group', { experience: true, when: WHEN_SERVICE }),
      X('quiet_music', 'Keep it low', 'Music at a level you can talk over, which is the whole point', 'mic', { experience: true, when: WHEN_MUSIC }),
    ],
    toolkit: { polls: ['food'], note: 'Nothing from a private dinner is photographed, posted or used by us for anything. Open flame only if you ask for it.' },
    timeline: {
      before: ['Table and setting agreed, kept restrained', 'Allergies and preferences given to the kitchen', 'Candles chosen — enclosed or battery unless you asked otherwise'],
      during: ['Courses paced to you', 'Light low and music low enough to talk over', 'The server present when needed and nowhere otherwise'],
      after: ['Space restored quietly', 'Any photographs shown to you first', 'Nothing shared anywhere'],
    },
    checklist: ['A genuinely private table', 'Allergies to the kitchen', 'Enclosed or battery candles', 'Courses paced to you'],
  }),

  B('anniversary-dinner', 'Mark the year', 'A dinner that acknowledges something without becoming a party.', {
    about: 'More than a meal, less than an event. The difference is usually one thing done deliberately: a toast, a cake, a photograph, or a musician for half an hour.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, GIFTS_P],
    plan: [
      S('catering_food', 'recommended', 'Cook for them', 'A menu for the table, with the couple’s own favourites in it'),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake or dessert to mark it, cut at the table', { when: WHEN_CAKE }),
      S('decoration_floral', 'conditional', 'Dress it', 'Flowers and a setting that suit the number of years', { when: WHEN_DECOR }),
      S('live_entertainment', 'conditional', 'Play for them', 'A musician for a short set, not for the whole evening', { when: WHEN_LIVE }),
      S('photography', 'conditional', 'Portrait them', 'A portrait of the couple, which is what gets kept', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour it', 'Wine or something to toast with, chosen for the menu', { when: WHEN_DRINKS }),
      S('guest_services', 'conditional', 'Serve it', 'Service paced so the toast and the cake land properly', { when: WHEN_SERVICE }),
      S('gifts_favours', 'conditional', 'Give something', 'A small thing for each guest, or one gift for the couple', { when: WHEN_GIFTS }),
      S('event_lighting', 'conditional', 'Light it', 'Warm light over the table', { when: WHEN_BIG_DECOR }),
      S('venue', 'conditional', 'Find the table', 'Somewhere that holds the table and lets you talk', { when: WHEN_FIND }),
    ],
    addons: [
      X('one_toast', 'Plan the toast', 'One toast, planned and timed, rather than hoped for', 'glass', { experience: true }),
      X('couple_portrait', 'Photograph them', 'A proper portrait of the two of them, taken before dinner', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('their_song', 'Play their song', 'The one piece of music that means something, played live', 'mic', { trade: 'live_entertainment', when: WHEN_LIVE }),
      X('old_photos', 'Show the years', 'Photographs from the years, framed or on the table', 'frame', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Nothing from a private dinner is shared or used by us. Any photographs are yours and are shown to you first.' },
    timeline: {
      before: ['Menu built around the couple’s own favourites', 'Allergies given to the kitchen', 'Toast, cake and portrait placed in the evening’s order'],
      during: ['Portrait taken before dinner, in good light', 'The toast called at the planned moment', 'Cake cut at the table, not carried off'],
      after: ['Photographs shown to the couple first', 'Space restored', 'Anything left behind returned'],
    },
    checklist: ['Menu around their favourites', 'Allergies to the kitchen', 'A planned toast', 'A portrait before dinner'],
  }),

  B('proposal-setup', 'Ask them', 'One question, one chance, and no second take.', {
    about: 'Everything exists to protect one moment: the setting ready in advance, the ring safe, the photographer hidden, and a plan that works whatever the answer is.',
    formats: ['venue', 'outdoor', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, SURPRISE, MOOD, FOOD_P, DRINKS, MUSIC_P, DECOR_P, FLAME, PHOTOS, RIDE],
    plan: [
      S('decoration_floral', 'recommended', 'Set the scene', 'A setting built in advance and kept hidden until the moment'),
      S('photography', 'recommended', 'Hide and shoot', 'A photographer out of sight, on the moment itself', { unless: UNLESS_PHOTO }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting for the setting, and a path to it after dark', { when: [some(WHEN_DECOR[0], WHEN_FLAME[0])] }),
      S('live_entertainment', 'conditional', 'Play it', 'A musician who starts as they arrive and stops afterwards', { when: WHEN_LIVE }),
      S('catering_food', 'conditional', 'Feed them', 'Dinner held for afterwards, because nobody eats before', { when: WHEN_FED }),
      S('bar_beverages', 'conditional', 'Have it ready', 'Something to toast with, cold and waiting', { when: WHEN_DRINKS }),
      S('videography', 'conditional', 'Film it', 'The moment filmed from a fixed position, discreetly', { when: [ans('photos', 'yes')] }),
      S('passenger_transport', 'conditional', 'Bring them', 'A car, timed to the setting being ready', { when: WHEN_RIDE }),
      S('guest_services', 'conditional', 'Coordinate it', 'One person managing the timing and the people involved', { when: WHEN_SURPRISE }),
      S('venue', 'conditional', 'Find the spot', 'Somewhere private that can be held and set up in advance', { when: WHEN_FIND }),
    ],
    addons: [
      X('ring_safety', 'Keep it safe', 'Who holds the ring and where, agreed rather than improvised', 'gift', { experience: true }),
      X('hidden_camera_spot', 'Hide the camera', 'A photographer position checked on site, from the real angle', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('either_answer', 'Plan both ways', 'A quiet way to leave, whatever the answer is', 'schedule', { experience: true }),
      X('weather_fallback', 'Plan for rain', 'An indoor alternative held, with a decision time', 'tent', { experience: true, when: WHEN_OUTSIDE }),
    ],
    toolkit: { polls: [], note: 'Nothing is sent to the person being asked, and nothing is posted anywhere — not even by us — until you say so. A plan exists for either answer.' },
    timeline: {
      before: ['Setting built and hidden in advance, checked from the real angle', 'Ring custody agreed; photographer position tested on site', 'A quiet exit planned for either answer'],
      during: ['Photographer out of sight, on the moment', 'Music, light and drinks cued to the arrival', 'Nobody else present who was not planned for'],
      after: ['Photographs shown to you both before anything is shared', 'Dinner served afterwards, at your pace', 'Setting cleared discreetly'],
    },
    checklist: ['Setting hidden and ready early', 'Ring custody agreed', 'Camera position tested on site', 'A plan for either answer'],
  }),

  B('private-screening', 'Show it', 'A film for your own people, which needs the rights first.', {
    about: 'The rights come before the room. Everything else — the seating, the sound and the food that can be eaten in the dark — is easy once the screening is permitted.',
    formats: ['venue', 'home'],
    ask: [
      PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DRINKS, DECOR_P, PHOTOS, SERVICE, END_TIME,
      Q('rights', 'Are the screening rights in place?', 'one', {
        options: [['yes_r', 'Yes'], ['applying_r', 'We are applying'], ['no_r', 'Not yet'], ['own_r', 'It is our own film']],
        help: 'Showing a film to a group usually needs the rights holder’s permission. That is yours to obtain.',
      }),
      Q('screen_p', 'What is it shown on?', 'one', { options: [['hired_s', 'A hired screen and projector'], ['venue_s', 'The venue’s own screen'], ['tv_s', 'A large television'], ['help_s', 'Please advise']] }),
    ],
    plan: [
      S('sound_av', 'recommended', 'Project it', 'A projector and sound matched to the room and the film'),
      S('event_equipment_rental', 'conditional', 'Build it', 'Screen, projection position and the seating layout', { when: [ans('screen_p', 'hired_s', 'help_s')] }),
      S('tent_furniture', 'conditional', 'Seat them', 'Comfortable seating with sightlines that actually work', { when: WHEN_GROUP }),
      S('catering_food', 'conditional', 'Feed them', 'Food that can be eaten in the dark, served before it starts', { when: WHEN_FED }),
      S('event_lighting', 'recommended', 'Light edges', 'Low edge lighting, and nothing pointing at the screen'),
      S('bar_beverages', 'conditional', 'Pour', 'Drinks served before the film and at the interval', { when: WHEN_DRINKS }),
      S('decoration_floral', 'conditional', 'Dress it', 'Styling at the entrance rather than inside the sightlines', { when: WHEN_DECOR }),
      S('guest_services', 'conditional', 'Seat them', 'Arrivals, seating and keeping the room quiet once it starts', { when: [some(WHEN_SERVICE[0], WHEN_GROUP[0])] }),
      S('power_cooling', 'conditional', 'Power it', 'Power and cooling for the projection position', { when: [ans('screen_p', 'hired_s')] }),
      S('venue', 'conditional', 'Find the room', 'A room that can be darkened properly and seats everyone', { when: WHEN_FIND }),
    ],
    addons: [
      X('rights_first', 'Clear it first', 'Screening rights confirmed before the film is named to guests', 'schedule', { experience: true, when: [ans('rights', 'applying_r', 'no_r')] }),
      X('test_the_room', 'Test it', 'Picture and sound tested from the back seat, not the front', 'sound_av', { trade: 'sound_av' }),
      X('interval', 'Give a break', 'An interval, so people can leave the room without missing it', 'schedule', { experience: true, when: WHEN_GROUP }),
      X('dark_room', 'Darken it', 'The room properly darkened, which most rooms are not', 'lighting', { trade: 'event_lighting' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Screening rights are yours to obtain, and we will not arrange a screening without them. Nothing from the evening is recorded or shared.' },
    timeline: {
      before: ['Screening rights confirmed before the film is named to guests', 'Picture and sound tested from the back seat', 'Room checked for how well it actually darkens'],
      during: ['Food and drinks served before the film starts', 'Nothing pointing at the screen once it begins', 'An interval if it is a long one'],
      after: ['Equipment removed and the room restored', 'Nothing recorded or shared', 'Any rights-holder reporting completed'],
    },
    checklist: ['Rights confirmed before naming the film', 'Sound tested from the back', 'The room properly darkened', 'Food served before it starts'],
  }),

  B('luxury-picnic', 'Lay it out', 'A spread on the ground that photographs as well as it eats.', {
    about: 'A styled picnic is mostly logistics: everything arrives cold, looks immaculate for two hours, and leaves without a trace. Shade and a washroom decide whether it is enjoyable.',
    formats: ['outdoor'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, PHOTOS, SERVICE, RIDE],
    plan: [
      S('catering_food', 'recommended', 'Spread it', 'A grazing spread or hampers, kept cold until it is laid out'),
      S('tent_furniture', 'recommended', 'Set the ground', 'Rugs, low tables, cushions and shade over the setting'),
      S('decoration_floral', 'conditional', 'Style it', 'Styling on the ground — this is the format’s whole look', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Shoot it', 'The setting photographed before anyone eats, then the people', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour it cold', 'Drinks on ice, in unbreakable glassware on grass', { when: WHEN_DRINKS }),
      S('live_entertainment', 'conditional', 'Play quietly', 'An acoustic musician, which suits this better than a speaker', { when: WHEN_LIVE }),
      S('guest_services', 'conditional', 'Serve it', 'Someone to serve, clear and keep the setting looking right', { when: WHEN_SERVICE }),
      S('safety_facilities', 'conditional', 'Service it', 'Washrooms within reach, water, and the site left spotless', { when: [some(WHEN_SERVICE[0], WHEN_GROUP[0])] }),
      S('transportation', 'conditional', 'Carry it in', 'Everything moved to a spot a vehicle cannot reach', { when: WHEN_GROUP }),
      S('passenger_transport', 'conditional', 'Bring them', 'Cars to a spot with no parking nearby', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Find the spot', 'A spot with shade, permission and a washroom within reach', { when: [some(WHEN_FIND[0], WHEN_OUTSIDE[0])] }),
    ],
    addons: [
      X('shade_first', 'Find shade', 'Shade over the setting, because a beautiful spot at noon is not', 'tent', { trade: 'tent_furniture' }),
      X('cold_chain', 'Keep it cold', 'Ice boxes and a cut-off time for anything that cannot sit out', 'glass', { trade: 'catering_food', when: WHEN_FED }),
      X('style_then_eat', 'Shoot it first', 'The spread photographed before anyone touches it', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('leave_nothing', 'Take it away', 'Everything removed, including the petals and the pins', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A scenic spot has no shade and no washroom. We ask about both before anything decorative, and nothing from a private picnic is shared by us.' },
    timeline: {
      before: ['Spot visited; shade checked and the nearest washroom timed', 'Cold chain planned with a cut-off time', 'Permission confirmed if it is public land'],
      during: ['Setting styled and photographed before anyone eats', 'Food covered and cold; unbreakable glassware on grass', 'Shade over the setting throughout'],
      after: ['Everything carried out, including petals and pins', 'Site left exactly as found', 'Photographs shared with you first'],
    },
    checklist: ['Shade over the setting', 'Cold chain with a cut-off', 'Washroom within reach', 'Everything carried out'],
  }),

  B('candlelight-dinner', 'By candlelight', 'Light as the whole design, which makes safety part of the look.', {
    about: 'Hundreds of small lights is the effect. We build it from enclosed candles or battery lights first, because open flame at a dinner table with fabric and hair needs a reason.',
    formats: ['venue', 'home', 'outdoor'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, FLAME, PHOTOS, SERVICE],
    plan: [
      S('event_lighting', 'recommended', 'Build light', 'The whole look built from enclosed candles or battery lights'),
      S('catering_food', 'recommended', 'Cook for them', 'A menu that works in low light, served at your pace'),
      S('decoration_floral', 'conditional', 'Dress it', 'A table setting that works with the candlelight, not against it', { when: WHEN_DECOR }),
      S('safety_facilities', 'conditional', 'Keep it safe', 'Flame kept away from fabric, hair and reach, with cover nearby', { when: WHEN_OPEN_FLAME }),
      S('live_entertainment', 'conditional', 'Play softly', 'A musician playing quietly through the first courses', { when: WHEN_LIVE }),
      S('bar_beverages', 'conditional', 'Pour it', 'Wine or a toast, chosen for the menu', { when: WHEN_DRINKS }),
      S('photography', 'conditional', 'Shoot it', 'Photography in candlelight, which needs the right lens', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Serve it', 'A server who can work in low light without disturbing it', { when: WHEN_SERVICE }),
      S('tent_furniture', 'conditional', 'Set it outside', 'Table, seating and shelter from the wind, which kills candles', { when: WHEN_OUTSIDE }),
      S('venue', 'conditional', 'Find the room', 'Somewhere the light can be taken right down', { when: WHEN_FIND }),
    ],
    addons: [
      X('enclosed_first', 'Enclose them', 'Enclosed candles or battery lights, which is what we offer first', 'lighting', { trade: 'event_lighting' }),
      X('wind_shelter', 'Block the wind', 'Shelter around the table, because wind ends candlelight outdoors', 'tent', { trade: 'tent_furniture', when: WHEN_OUTSIDE }),
      X('flame_safety', 'Keep it clear', 'Flame away from fabric and hair, with cover within reach', 'security_services', { trade: 'safety_facilities', when: WHEN_OPEN_FLAME }),
      X('low_light_lens', 'Shoot it properly', 'A photographer equipped for candlelight, not using flash', 'camera', { trade: 'photography', when: WHEN_SHOT }),
    ],
    toolkit: { polls: ['food'], note: 'We build candlelight from enclosed candles or battery lights by default. Open flame only where you ask for it and the setting can carry it safely.' },
    timeline: {
      before: ['Light designed from enclosed or battery sources first', 'Wind shelter arranged if it is outdoors', 'Photographer equipped for low light, without flash'],
      during: ['Flame kept clear of fabric, hair and reach', 'Light taken down gradually rather than all at once', 'Service worked around the light, not through it'],
      after: ['Every light accounted for and extinguished', 'Space restored', 'Photographs shared with you first'],
    },
    checklist: ['Enclosed or battery light first', 'Wind shelter if outdoors', 'Flame clear of fabric and hair', 'A low-light photographer'],
  }),

  B('personalised-theme-party', 'Make it theirs', 'A party built around one person’s actual interests.', {
    about: 'The theme comes from them, not from a catalogue. Done well it looks like nobody else could have had this party; done badly it looks like a template with a name on it.',
    formats: ['venue', 'home'],
    ask: [
      PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, GIFTS_P, END_TIME,
      Q('theme_src', 'What is the theme?', 'one', { options: [['interest', 'Something they love'], ['era', 'A period or era'], ['colour_t', 'A colour'], ['story', 'A film, book or game'], ['help_t', 'Please help us think of one']] }),
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Build it', 'A setup made for this theme, not adapted from another one'),
      S('cake_desserts', 'conditional', 'Bake it in', 'A cake that belongs to the theme rather than carrying a sticker', { when: WHEN_CAKE }),
      S('catering_food', 'conditional', 'Feed the theme', 'Food that fits the theme and still tastes like food', { when: WHEN_FED }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting and colour, which is what makes a theme read', { when: WHEN_BIG_DECOR }),
      S('photography', 'conditional', 'Capture it', 'The setup before guests arrive, then the party itself', { when: WHEN_SHOT }),
      S('dj_music', 'conditional', 'Score it', 'Music chosen for the theme and for who is in the room', { when: WHEN_DJ }),
      S('live_entertainment', 'conditional', 'Perform it', 'A performer or character who fits the theme properly', { when: WHEN_LIVE }),
      S('event_materials_supplier', 'conditional', 'Supply it', 'Props and costume pieces specific to this theme', { when: WHEN_BIG_DECOR }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks named and served to the theme', { when: WHEN_DRINKS }),
      S('gifts_favours', 'conditional', 'Send them off', 'Favours that belong to the theme, not generic ones', { when: WHEN_GIFTS }),
      S('venue', 'conditional', 'Find it', 'Somewhere that suits the theme rather than fighting it', { when: WHEN_FIND }),
    ],
    addons: [
      X('their_detail', 'Use their detail', 'One detail only they would recognise, built into the setup', 'gift', { experience: true }),
      X('theme_brief', 'Brief suppliers', 'One written brief, so every supplier builds the same theme', 'invite', { experience: true }),
      X('no_costume_rule', 'Make it optional', 'Costume stated as optional, so nobody is excluded', 'invite', { experience: true }),
      X('setup_photos', 'Shoot it empty', 'The setup photographed before anyone arrives', 'camera', { trade: 'photography', when: WHEN_SHOT }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The theme is built for this person. We will not reuse someone else’s party as a template, and nothing from yours is shown to anyone else.' },
    timeline: {
      before: ['Theme agreed with one written brief sent to every supplier', 'One detail only they would recognise built in', 'Costume stated as optional on the invitation'],
      during: ['Setup photographed before guests arrive', 'Food, drinks and music all reading the same theme', 'Nobody made awkward for not dressing up'],
      after: ['Space restored', 'Photographs shared with you first', 'Props returned'],
    },
    checklist: ['One written theme brief', 'A detail only they would know', 'Costume optional', 'Setup shot before arrivals'],
  }),

  B('vip-celebration', 'Stay discreet', 'High-profile guests, where privacy is the service being bought.', {
    about: 'Discretion is the whole brief: a guest list nobody sees, staff who sign for it, no photography beyond what is agreed, and nothing about the evening repeated anywhere.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, PHOTOS, SERVICE, RIDE, END_TIME],
    plan: [
      S('security_services', 'recommended', 'Control access', 'Access control on a closed list, and nobody in who is not on it'),
      S('guest_services', 'recommended', 'Host them', 'Arrivals managed individually, with staff briefed on discretion'),
      S('catering_food', 'conditional', 'Feed them', 'A menu to each guest’s stated needs, served without fuss', { when: WHEN_FED }),
      S('decoration_floral', 'conditional', 'Dress it', 'A setting that reads expensive without announcing itself', { when: WHEN_DECOR }),
      S('bar_beverages', 'conditional', 'Pour it', 'A bar with proper stock and a server who will stop serving', { when: WHEN_DRINKS }),
      S('live_entertainment', 'conditional', 'Perform', 'A performer engaged on their own terms, briefed on the privacy', { when: WHEN_LIVE }),
      S('photography', 'conditional', 'Shoot the list', 'Photography strictly to a written list, and nothing else', { when: WHEN_SHOT }),
      S('valet_parking', 'conditional', 'Park them', 'Valet and a discreet arrival route away from the street', { when: WHEN_RIDE }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting that flatters the room and hides the working parts', { when: WHEN_BIG_DECOR }),
      S('passenger_transport', 'conditional', 'Move them', 'Cars, timed individually rather than as a group', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Find it', 'Somewhere that can be closed and controlled completely', { when: WHEN_FIND }),
    ],
    addons: [
      X('closed_list', 'Close the list', 'A guest list held by one person and shown to nobody else', 'invite', { experience: true }),
      X('staff_discretion', 'Bind the staff', 'Every person working signed to discretion before they arrive', 'group', { experience: true }),
      X('photo_list', 'Write it down', 'Exactly what may be photographed, agreed in writing beforehand', 'camera', { experience: true, when: WHEN_SHOT }),
      X('private_route', 'Route them in', 'A private arrival route, not the main entrance', 'bus', { trade: 'guest_services', when: WHEN_PRIVATE }),
    ],
    toolkit: { polls: [], note: 'We never name a client, never show your event as our work, and never confirm to anyone that it happened. We make no claim that any particular person will attend.' },
    timeline: {
      before: ['Guest list closed and held by one person', 'Every member of staff signed to discretion', 'What may be photographed agreed in writing'],
      during: ['Access controlled against the list, with no exceptions', 'Arrivals routed privately and timed individually', 'Nothing photographed beyond the written list'],
      after: ['Images handed over and no copies kept', 'Nothing about the evening repeated anywhere, by anyone', 'Venue restored and closed'],
    },
    checklist: ['A closed guest list', 'Staff signed to discretion', 'A written photography list', 'A private arrival route'],
  }),

  B('exclusive-house-party', 'Open the house', 'Your own home as the venue, with neighbours on the other side of the wall.', {
    about: 'A house is not a venue: the power, the washrooms, the parking and the noise all belong to a residential building. Telling the neighbours and finishing on time is most of the job.',
    formats: ['home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, PHOTOS, SERVICE, NEIGHBOURS, END_TIME, RIDE],
    plan: [
      S('bar_beverages', 'conditional', 'Run the bar', 'A bar with a server, which keeps the drinking moderate', { when: WHEN_DRINKS }),
      S('catering_food', 'conditional', 'Feed them', 'Food from outside, because a home kitchen cannot do both', { when: WHEN_FED }),
      S('dj_music', 'conditional', 'Play it', 'A DJ working to a level and a finish time agreed in advance', { when: WHEN_DJ }),
      S('guest_services', 'recommended', 'Staff it', 'Someone on the door, someone serving and someone clearing'),
      S('decoration_floral', 'conditional', 'Dress it', 'Styling that works with your rooms and comes out cleanly', { when: WHEN_DECOR }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting that changes a living room into somewhere else', { when: WHEN_BIG_DECOR }),
      S('safety_facilities', 'conditional', 'Protect it', 'Floor protection, extra washroom supplies and a full clean-up', { when: WHEN_GROUP }),
      S('valet_parking', 'conditional', 'Park them', 'Parking handled so the street and the neighbours are not blocked', { when: WHEN_RIDE }),
      S('power_cooling', 'conditional', 'Power it', 'Extra power and cooling, which a home circuit will not carry', { when: WHEN_CROWD }),
      S('photography', 'conditional', 'Capture it', 'Photography inside your home, with guests told beforehand', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Keep the door', 'Someone on the door, so only invited people come in', { when: WHEN_CROWD }),
    ],
    addons: [
      X('tell_neighbours', 'Tell them first', 'Neighbours told in advance, with a number to call', 'invite', { experience: true, when: [notAns('neighbours', 'no_n')] }),
      X('finish_time', 'Agree the end', 'A finish time agreed and held, which is what keeps this possible', 'schedule', { experience: true }),
      X('protect_floors', 'Protect it', 'Floors, surfaces and anything breakable moved or covered', 'broom', { trade: 'safety_facilities' }),
      X('full_clean', 'Clean it after', 'A proper clean-up afterwards, so you wake to your own house', 'broom', { trade: 'safety_facilities' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Your building’s rules and the local noise timings decide the finish. Alcohol appears only if you ask for it and is served by someone who will stop.' },
    timeline: {
      before: ['Neighbours told, with a number to call', 'Finish time agreed with the DJ and the guests', 'Floors protected and valuables moved out'],
      during: ['Music held to the agreed level and finish time', 'Someone on the door and someone serving the bar', 'Parking kept off the neighbours’ access'],
      after: ['A proper clean-up, including outside the door', 'Hired items removed the same night where possible', 'Anything damaged reported to you directly'],
    },
    checklist: ['Neighbours told in advance', 'An agreed finish time', 'Floors and valuables protected', 'A full clean-up afterwards'],
  }),

  B('private-music-performance', 'Play for you', 'A musician playing for a small room, on their own terms.', {
    about: 'A performance in a living room is a different craft from a stage. The artist’s rider, the room’s acoustics and the audience being asked to actually listen are what make it work.',
    formats: ['home', 'venue'],
    ask: [
      PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DRINKS, DECOR_P, PHOTOS, SERVICE, NEIGHBOURS, END_TIME,
      Q('act_type', 'What kind of performance?', 'one', { options: [['solo_a', 'A solo musician'], ['duo_a', 'A duo or trio'], ['band_a', 'A band'], ['classical_a', 'Classical'], ['help_a', 'Please suggest someone']] }),
    ],
    plan: [
      S('live_entertainment', 'recommended', 'Book the act', 'A musician suited to a small room, engaged on their own terms'),
      S('sound_av', 'conditional', 'Support them', 'Only as much amplification as the room actually needs', { when: [ans('act_type', 'band_a', 'duo_a', 'help_a')] }),
      S('event_lighting', 'conditional', 'Light them', 'A simple light on the performance area, nothing theatrical', { when: WHEN_DECOR }),
      S('tent_furniture', 'conditional', 'Seat them', 'Seating arranged so people face the musician and can hear', { when: WHEN_GROUP }),
      S('catering_food', 'conditional', 'Feed them', 'Food served before or after the set, never during it', { when: WHEN_FED }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks served before and after, so nobody is pouring mid-song', { when: WHEN_DRINKS }),
      S('guest_services', 'conditional', 'Host it', 'Arrivals, seating and asking the room to listen', { when: WHEN_SERVICE }),
      S('photography', 'conditional', 'Capture it', 'Photography agreed with the artist, without flash', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Dress it', 'A simple setting around the performance area', { when: WHEN_BIG_DECOR }),
      S('venue', 'conditional', 'Find a room', 'A room that sounds good and seats everyone facing one way', { when: WHEN_FIND }),
    ],
    addons: [
      X('artist_terms', 'Agree their terms', 'The artist’s own fee, set length and rider, agreed in writing', 'invite', { experience: true }),
      X('listening_room', 'Ask them to listen', 'The room asked to listen, which is what a house concert is', 'mic', { experience: true }),
      X('green_space', 'Give them space', 'Somewhere for the artist to prepare that is not the kitchen', 'group', { trade: 'guest_services' }),
      X('recording_rules', 'Ask about filming', 'Whether guests may film, decided by the artist and announced', 'camera', { experience: true, when: WHEN_SHOT }),
    ],
    toolkit: { polls: ['date'], note: 'The fee, the set length, the repertoire and whether anyone may film are the artist’s to set. We never commit an artist to terms they have not agreed.' },
    timeline: {
      before: ['Fee, set length and rider agreed with the artist in writing', 'Whether guests may film decided by the artist', 'Somewhere arranged for the artist to prepare'],
      during: ['Food and drinks served before and after, not during the set', 'The room asked to listen before it begins', 'No flash photography and no filming unless agreed'],
      after: ['Artist paid as agreed, promptly', 'Any recording handled as the artist permitted', 'Space restored'],
    },
    checklist: ['Artist’s terms in writing', 'Filming rules set by them', 'A space to prepare', 'Food served around the set'],
  }),

  B('intimate-garden-dinner', 'In the garden', 'A long table outdoors, with no roof and no power.', {
    about: 'A garden gives you the setting for nothing and gives you nothing else. Power, light, a kitchen and a fallback all arrive on a van, and the ground decides where the table goes.',
    formats: ['outdoor', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, FLAME, PHOTOS, SERVICE, END_TIME],
    plan: [
      S('tent_furniture', 'recommended', 'Set the table', 'A long table, seating, flooring if the ground is soft, and cover'),
      S('catering_food', 'conditional', 'Cook there', 'A menu cooked on site, from a kitchen that has to be brought', { when: WHEN_FED }),
      S('event_lighting', 'recommended', 'Light it', 'Festoon over the table and light on the paths after dusk'),
      S('decoration_floral', 'conditional', 'Dress it', 'A table that uses the garden’s own planting rather than hiding it', { when: WHEN_DECOR }),
      S('power_cooling', 'conditional', 'Power it', 'A generator and cold storage, which a garden does not have', { when: [some(WHEN_COOKED[0], WHEN_GROUP[0])] }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks kept cold outdoors, which needs ice and planning', { when: WHEN_DRINKS }),
      S('live_entertainment', 'conditional', 'Play softly', 'An acoustic musician during the first courses', { when: WHEN_LIVE }),
      S('guest_services', 'conditional', 'Serve it', 'Service across a garden, which takes more staff than a room', { when: WHEN_SERVICE }),
      S('photography', 'conditional', 'Capture it', 'The table in the last of the light, which is the photograph', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Service it', 'Washroom supplies, insect control and the garden left as found', { when: WHEN_GROUP }),
      S('venue', 'conditional', 'Find a garden', 'A garden with firm ground, shelter and somewhere to cook', { when: WHEN_FIND }),
    ],
    addons: [
      X('ground_walk', 'Walk the ground', 'The ground checked for soft patches before the table is placed', 'map', { experience: true }),
      X('dusk_timing', 'Time it to dusk', 'Dinner timed so the first course is in the last of the light', 'schedule', { experience: true }),
      X('insect_plan', 'Keep them off', 'Insect control around the table, which outdoor dinners need', 'spa', { trade: 'safety_facilities' }),
      X('cover_standby', 'Hold cover', 'Cover on standby with a stated decision time', 'tent', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'A garden has no power, no kitchen and no roof. All three are brought in, and candles are enclosed or battery unless you ask otherwise.' },
    timeline: {
      before: ['Ground walked and the table sited on firm ground', 'Power, cold storage and a kitchen arranged', 'Cover on standby with a decision time agreed'],
      during: ['First course timed to the last of the light', 'Paths lit before dusk, not after', 'Insect control running around the table'],
      after: ['Garden left as found, including the lawn', 'Generator and hired items removed', 'Photographs shared with you first'],
    },
    checklist: ['Ground walked before siting', 'Power and kitchen brought in', 'Dinner timed to dusk', 'Cover on standby'],
  }),

  B('luxury-rooftop-dinner', 'Dine above it', 'A terrace with a view, an edge, and a building full of neighbours.', {
    about: 'The view is the reason and the edge is the risk. Wind, the lift, the building’s rules and a hard finish time shape a rooftop dinner more than any menu does.',
    formats: ['outdoor', 'venue'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, FLAME, PHOTOS, SERVICE, NEIGHBOURS, END_TIME],
    plan: [
      S('safety_facilities', 'recommended', 'Mind the edge', 'Edges, railings and the route checked, with first aid on hand'),
      S('tent_furniture', 'recommended', 'Set it up', 'Table, seating and weighted shelter against the wind'),
      S('catering_food', 'conditional', 'Serve it', 'A menu that survives a service lift and a windy terrace', { when: WHEN_FED }),
      S('event_lighting', 'recommended', 'Light it', 'Lighting that works with the city behind it, not against it'),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks in weighted or unbreakable glassware on a terrace', { when: WHEN_DRINKS }),
      S('decoration_floral', 'conditional', 'Dress it', 'Styling weighted down, because nothing light stays on a roof', { when: WHEN_DECOR }),
      S('live_entertainment', 'conditional', 'Play it', 'A musician at a level a residential building will accept', { when: WHEN_LIVE }),
      S('guest_services', 'conditional', 'Serve it', 'Service built around one lift, which sets the whole pace', { when: WHEN_SERVICE }),
      S('photography', 'conditional', 'Shoot the view', 'Photography timed to the light over the city', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power it', 'Power on a roof, which rarely has enough of it', { when: WHEN_GROUP }),
      S('venue', 'conditional', 'Find a roof', 'A terrace with safe edges, lift access and permission to use it', { when: WHEN_FIND }),
    ],
    addons: [
      X('edge_check', 'Check the edge', 'Railings and edges checked, and nothing climbable left beside them', 'security_services', { trade: 'safety_facilities' }),
      X('wind_weighting', 'Weight it down', 'Everything weighted, because a roof takes wind nothing else does', 'tent', { trade: 'tent_furniture' }),
      X('lift_plan', 'Plan the lift', 'A service-lift schedule, which decides how the evening runs', 'schedule', { experience: true }),
      X('building_rules', 'Read the rules', 'The building’s own rules on access, noise and finish time', 'invite', { experience: true, when: [notAns('neighbours', 'no_n')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The building’s rules on roof access, noise and finish time decide what is possible, and we plan inside them. Candles are enclosed or battery on a roof.' },
    timeline: {
      before: ['Building’s rules obtained and the roof access confirmed', 'Edges and railings checked; nothing climbable left near them', 'Service lift schedule planned with the kitchen'],
      during: ['Everything weighted against wind', 'Noise held to what a residential building accepts', 'Guests kept away from the edge, especially after drinks'],
      after: ['Everything taken down and off the roof the same night', 'Roof left clear and the building restored', 'Finish time held'],
    },
    checklist: ['Building rules and roof access', 'Edges checked and kept clear', 'Everything weighted for wind', 'A service-lift schedule'],
  }),

  B('private-karaoke-party', 'Pass the mic', 'Singing badly among friends, which needs the room to be forgiving.', {
    about: 'The equipment is easy; the room is the thing. Two microphones, a screen everyone can read, a running order that includes the shy ones, and neighbours who were told.',
    formats: ['home', 'venue'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DRINKS, DECOR_P, PHOTOS, SERVICE, NEIGHBOURS, END_TIME, GIFTS_P],
    plan: [
      S('sound_av', 'recommended', 'Set the system', 'Two microphones, a screen everyone can read and a mixer'),
      S('event_equipment_rental', 'conditional', 'Stage it', 'A small performance area, screens and a seating layout', { when: WHEN_GROUP }),
      S('catering_food', 'conditional', 'Feed them', 'Food people can eat standing, between turns', { when: WHEN_FED }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks with a server, because karaoke and a free bar go wrong', { when: WHEN_DRINKS }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting on the singer, so it feels like a stage', { when: WHEN_DECOR }),
      S('anchor_mc', 'conditional', 'Run the list', 'A host running the order so it is not the same four people', { when: WHEN_GROUP }),
      S('guest_services', 'conditional', 'Serve it', 'Someone serving and clearing so nobody has to leave the room', { when: WHEN_SERVICE }),
      S('photography', 'conditional', 'Capture it', 'Photography, with guests told before anything is posted', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award them', 'Small prizes, which gives the shy ones a reason to sing', { when: WHEN_GIFTS }),
      S('safety_facilities', 'conditional', 'Protect it', 'Floor protection and a clean-up if it is at home', { when: WHEN_HOME }),
      S('venue', 'conditional', 'Find a room', 'A room where the volume will not reach a neighbour', { when: WHEN_FIND }),
    ],
    addons: [
      X('two_mics', 'Use two mics', 'Two microphones, because duets are where this gets good', 'sound_av', { trade: 'sound_av' }),
      X('running_order', 'Rotate them', 'A running order, so everyone who wants a turn gets one', 'schedule', { experience: true }),
      X('readable_screen', 'Make it readable', 'A screen the singer can actually read from where they stand', 'camera', { trade: 'sound_av' }),
      X('volume_limit', 'Cap the volume', 'A volume and a finish time agreed, especially at home', 'invite', { experience: true, when: [notAns('neighbours', 'no_n')] }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Neighbours and a finish time matter more here than anywhere — singing carries. Nothing is posted from the evening without the people in it agreeing.' },
    timeline: {
      before: ['Neighbours told and a finish time agreed', 'Two microphones and a readable screen tested in the room', 'Floor protection in place if it is at home'],
      during: ['A running order so everyone gets a turn', 'Volume held to the agreed level', 'Drinks served rather than left out'],
      after: ['Clean-up and equipment removed', 'Nothing posted without asking the people in it', 'Finish time held'],
    },
    checklist: ['Neighbours told and a finish time', 'Two microphones', 'A readable screen', 'A running order'],
  }),

  B('family-celebration-dinner', 'One table', 'Three generations, one table, and everyone fed properly.', {
    about: 'The elders and the children decide this one. Seating that lets people hear each other, food that suits everyone at the table, and an hour that does not run past bedtime.',
    formats: ['home', 'venue'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, RIDE, END_TIME],
    plan: [
      S('catering_food', 'recommended', 'Feed everyone', 'A menu that works for elders, children and everyone between'),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake or sweets to mark it, cut at the table', { when: WHEN_CAKE }),
      S('guest_services', 'conditional', 'Seat them well', 'Seating planned so elders can hear and children are not stranded', { when: [some(WHEN_SERVICE[0], WHEN_GROUP[0])] }),
      S('photography', 'conditional', 'Portrait them', 'One full family photograph, taken before people drift off', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Dress it', 'A simple table setting rather than a production', { when: WHEN_DECOR }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks for the adults and something good for the children', { when: WHEN_DRINKS }),
      S('live_entertainment', 'conditional', 'Play quietly', 'Music quiet enough for the older people to talk over', { when: WHEN_LIVE }),
      S('tent_furniture', 'conditional', 'Set the table', 'A table and chairs that fit everyone in one sitting', { when: WHEN_GROUP }),
      S('passenger_transport', 'conditional', 'Fetch them', 'Cars for elders, which decides when the evening starts', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Find a table', 'Somewhere with one table for everybody, and step-free access', { when: WHEN_FIND }),
    ],
    addons: [
      X('one_table', 'Sit them together', 'Everyone at one table, which is the whole point of this dinner', 'cutlery', { experience: true }),
      X('step_free', 'Make it reachable', 'Step-free access and a chair with arms for anyone who needs one', 'spa', { experience: true }),
      X('family_photo', 'Take the photo', 'One photograph with every single person in it, taken early', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('child_food', 'Feed the children', 'Something the children will actually eat, served first', 'kids', { trade: 'catering_food', when: WHEN_FED }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Nothing from a family dinner is shared by us. Photographs are yours, and we ask before anyone appears anywhere.' },
    timeline: {
      before: ['One table confirmed, with step-free access checked', 'Allergies and the elders’ and children’s needs given to the kitchen', 'Cars arranged for anyone who cannot travel alone'],
      during: ['The family photograph taken early, while everyone is there', 'Children fed first, elders seated where they can hear', 'Music kept low enough to talk over'],
      after: ['Everyone got home, elders first', 'Photographs shared with the family', 'Space restored'],
    },
    checklist: ['Everyone at one table', 'Step-free access', 'The photograph taken early', 'Children fed first'],
  }),

  B('milestone-achievement-party', 'Mark the win', 'Something achieved, marked properly rather than mentioned.', {
    about: 'The achievement has to be named out loud by someone, or the evening becomes a party with no reason. One speech, one moment, and something they keep afterwards.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, GIFTS_P, END_TIME],
    plan: [
      S('catering_food', 'conditional', 'Feed them', 'Food for the room, timed around the speech rather than over it', { when: WHEN_FED }),
      S('anchor_mc', 'conditional', 'Name the win', 'Someone to say what was achieved, properly and briefly', { when: WHEN_GROUP }),
      S('gifts_favours', 'conditional', 'Give them one', 'Something engraved or framed, which outlasts the evening', { when: WHEN_GIFTS }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake for the moment the achievement is announced', { when: WHEN_CAKE }),
      S('decoration_floral', 'conditional', 'Dress it', 'A setting that marks the occasion without overstating it', { when: WHEN_DECOR }),
      S('photography', 'conditional', 'Capture it', 'The speech, the handover and the room’s reaction', { when: WHEN_SHOT }),
      S('bar_beverages', 'conditional', 'Pour a toast', 'Something to raise, so the toast has substance behind it', { when: WHEN_DRINKS }),
      S('dj_music', 'conditional', 'Play it', 'Music after the speech, not before or during it', { when: WHEN_DJ }),
      S('event_lighting', 'conditional', 'Light it', 'Lighting that lifts for the announcement', { when: WHEN_BIG_DECOR }),
      S('guest_services', 'conditional', 'Host it', 'Arrivals, seating and getting the room quiet for the speech', { when: WHEN_SERVICE }),
      S('venue', 'conditional', 'Find a room', 'Somewhere where a speech can actually be heard', { when: WHEN_FIND }),
    ],
    addons: [
      X('one_speech', 'Say it once', 'One short speech, written in advance and timed', 'mic', { experience: true }),
      X('something_kept', 'Give them one', 'One engraved or framed thing, which is what gets kept', 'gift', { trade: 'gifts_favours', when: WHEN_GIFTS }),
      X('quiet_the_room', 'Get silence', 'The room actually quietened before the speech starts', 'group', { experience: true, when: WHEN_GROUP }),
      X('their_people', 'Invite the right ones', 'The people who were part of it, not just the people nearby', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The achievement and how it is described are yours. We never embellish what was achieved, and we never publish it anywhere.' },
    timeline: {
      before: ['One speech written and timed, with a named speaker', 'Anything engraved or framed ordered early enough to be right', 'The people who were part of it invited'],
      during: ['The room quietened before the speech', 'The cake and the handover at the announced moment', 'Music after the speech, not through it'],
      after: ['Photographs of the speech and handover shared', 'Anything unclaimed delivered afterwards', 'Space restored'],
    },
    checklist: ['One short written speech', 'Something they keep', 'The room quietened first', 'The right people invited'],
  }),

  B('welcome-home-party', 'Welcome back', 'Somebody returning, which asks for warmth more than production.', {
    about: 'Why they were away changes everything, so we ask rather than assume. A long absence usually wants a quiet first evening and the big gathering a day later.',
    formats: ['home', 'venue'],
    ask: [
      PEOPLE, PLACE_P, PRIVACY, SURPRISE, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, RIDE,
      Q('return_from', 'What are they returning from?', 'one', {
        optional: true,
        options: [['abroad_r', 'Time abroad'], ['work_r', 'A long posting'], ['study_r', 'Studying'], ['health_r', 'Time in hospital'], ['rather_not', 'Rather not say']],
        help: 'This only shapes the pace and the food. If you would rather not say, we will keep it simple and gentle.',
      }),
    ],
    plan: [
      S('catering_food', 'conditional', 'Cook theirs', 'The food they have been missing, which matters more than a menu', { when: WHEN_FED }),
      S('decoration_floral', 'conditional', 'Dress it', 'A welcome at the door rather than a party in every room', { when: WHEN_DECOR }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'Something sweet for the first evening home', { when: WHEN_CAKE }),
      S('photography', 'conditional', 'Capture it', 'The arrival and the first hour, discreetly', { when: WHEN_SHOT }),
      S('guest_services', 'recommended', 'Pace it', 'Guests timed so the arrival is not a crowd at the door'),
      S('passenger_transport', 'conditional', 'Fetch them', 'A car from the airport or the hospital, timed to the arrival', { when: WHEN_RIDE }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks for the room, with plenty that is not alcoholic', { when: WHEN_DRINKS }),
      S('live_entertainment', 'conditional', 'Keep it gentle', 'Quiet live music rather than anything loud', { when: WHEN_LIVE }),
      S('dj_music', 'conditional', 'Play it later', 'Music for later in the evening, once they have settled', { when: WHEN_DJ }),
      S('venue', 'conditional', 'Find a room', 'Somewhere near home, so the evening can end early', { when: WHEN_FIND }),
    ],
    addons: [
      X('gentle_start', 'Start quietly', 'A quiet first hour before the room fills, whatever the plan', 'schedule', { experience: true }),
      X('their_food', 'Cook their dish', 'The one dish they have been missing, made properly', 'cutlery', { trade: 'catering_food', when: WHEN_FED }),
      X('early_finish', 'Let them sleep', 'An early finish, because they are more tired than they will say', 'schedule', { experience: true }),
      X('no_surprise', 'Maybe not a surprise', 'Telling them, which is kinder after a long or hard absence', 'invite', { experience: true, when: WHEN_SURPRISE }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We never assume why someone was away and never ask the household for medical details. If they are returning from hospital, the pace and the food follow their own doctor’s advice, not ours.' },
    timeline: {
      before: ['Pace agreed — a quiet first hour before the room fills', 'The dish they have been missing arranged', 'A car arranged for the arrival itself'],
      during: ['Arrival kept calm, not a crowd at the door', 'Plenty of non-alcoholic drinks available', 'Music gentle at first, louder only later'],
      after: ['An early finish so they can sleep', 'Photographs shared with the family', 'House restored before they wake'],
    },
    checklist: ['A quiet first hour', 'The dish they missed', 'A car for the arrival', 'An early finish'],
  }),

  B('going-away-party', 'Send them off', 'A goodbye, which people put off until it is rushed.', {
    about: 'The purpose is for people to actually say something. That means a moment set aside for it, something they can take with them, and an evening that ends before it gets maudlin.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, GIFTS_P, END_TIME],
    plan: [
      S('catering_food', 'conditional', 'Feed them', 'Food for the room, with their own favourites in it', { when: WHEN_FED }),
      S('gifts_favours', 'conditional', 'Send it along', 'Something small enough to pack and worth keeping', { when: WHEN_GIFTS }),
      S('photography', 'conditional', 'Capture it', 'A group photograph, which is what they will look at later', { when: WHEN_SHOT }),
      S('anchor_mc', 'conditional', 'Call them in', 'Someone to call the room for the goodbyes, briefly', { when: WHEN_GROUP }),
      S('decoration_floral', 'conditional', 'Dress it', 'A setting that is warm rather than mournful', { when: WHEN_DECOR }),
      S('bar_beverages', 'conditional', 'Pour a toast', 'Something to raise for the toast', { when: WHEN_DRINKS }),
      S('dj_music', 'conditional', 'Play theirs', 'Music they will remember the evening by', { when: WHEN_DJ }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake to cut, which gives the goodbyes a moment', { when: WHEN_CAKE }),
      S('guest_services', 'conditional', 'Host it', 'Arrivals and making sure everyone gets a word with them', { when: WHEN_SERVICE }),
      S('venue', 'conditional', 'Find a room', 'Somewhere people can talk, not shout', { when: WHEN_FIND }),
    ],
    addons: [
      X('everyone_a_word', 'Give everyone a turn', 'Making sure each person gets a minute with them, not just the loud ones', 'group', { experience: true }),
      X('message_book', 'Write it down', 'A book or card everyone writes in, which travels better than gifts', 'invite', { trade: 'gifts_favours' }),
      X('group_photo', 'Take one photo', 'One photograph with everybody in it, taken while all are there', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('end_it_well', 'Finish on time', 'A planned finish, so it ends warmly rather than sadly', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Nothing from the evening is published by us. The photographs and anything written are theirs to keep.' },
    timeline: {
      before: ['A moment set aside for the goodbyes, with someone to call it', 'A message book or card prepared for everyone to write in', 'Something small enough to pack chosen as a gift'],
      during: ['The group photograph taken while everybody is present', 'Each person given a minute with them', 'The toast called at the planned moment'],
      after: ['Photographs and the message book handed over', 'Guests got home', 'Space restored'],
    },
    checklist: ['A moment set aside for goodbyes', 'A message book', 'One group photograph', 'A planned finish'],
  }),

  B('reunion-dinner', 'Back together', 'People who have not met for years, which needs name badges and nerve.', {
    about: 'Nobody remembers everybody, and most people arrive quietly anxious. Badges, a seating plan and a few photographs on the table do more than any decoration.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, PHOTOS, SERVICE, GIFTS_P, END_TIME],
    plan: [
      S('catering_food', 'conditional', 'Feed them', 'A meal that lets people stay at the table and talk', { when: WHEN_FED }),
      S('invitation_printing', 'recommended', 'Name them', 'Badges with the names people knew them by, and a seating plan'),
      S('photography', 'conditional', 'Capture it', 'A group photograph and candids, which is what gets circulated', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Introduce them', 'Arrivals, badges and introducing people who have forgotten', { when: [some(WHEN_SERVICE[0], WHEN_GROUP[0])] }),
      S('decoration_floral', 'conditional', 'Dress it', 'Old photographs on the tables, which start every conversation', { when: WHEN_DECOR }),
      S('bar_beverages', 'conditional', 'Pour it', 'Drinks on arrival, which is when people are most awkward', { when: WHEN_DRINKS }),
      S('dj_music', 'conditional', 'Play the years', 'Music from the years they shared, kept low over dinner', { when: WHEN_DJ }),
      S('anchor_mc', 'conditional', 'Open it', 'A short welcome, so nobody has to stand up unprompted', { when: WHEN_GROUP }),
      S('gifts_favours', 'conditional', 'Send them off', 'A printed group photograph or a small memento', { when: WHEN_GIFTS }),
      S('venue', 'conditional', 'Find a room', 'A room where fifty people can hear each other', { when: WHEN_FIND }),
    ],
    addons: [
      X('old_names', 'Use old names', 'Badges with the names people knew them by, not their formal ones', 'invite', { trade: 'invitation_printing' }),
      X('table_photos', 'Put photos out', 'Old photographs on the tables, which do the work of an icebreaker', 'frame', { trade: 'decoration_floral' }),
      X('seating_plan', 'Seat them on purpose', 'A seating plan that mixes the groups rather than letting them cluster', 'cutlery', { experience: true, when: WHEN_GROUP }),
      X('contact_sheet', 'Share contacts', 'A contact list afterwards, only for those who opted in', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Contact details are shared only with people who opted in, and photographs are circulated only to those who were there.' },
    timeline: {
      before: ['Badges prepared with the names people knew each other by', 'A seating plan drawn to mix the groups', 'Old photographs collected for the tables'],
      during: ['Drinks and badges at the door, so arriving is easy', 'A short welcome so nobody has to start it themselves', 'The group photograph taken while everyone is present'],
      after: ['Photographs circulated to those who attended', 'Contact list shared only with those who opted in', 'Next date discussed before people leave'],
    },
    checklist: ['Badges with old names', 'A mixing seating plan', 'Photographs on the tables', 'A group photograph taken'],
  }),

  B('graduation-dinner', 'Mark the end', 'The dinner after the ceremony, which is where it is actually felt.', {
    about: 'The ceremony belongs to the institution; this belongs to the family. One speech, the certificate on the table, and the parents given a moment are the whole brief.',
    formats: ['venue', 'home'],
    ask: [PEOPLE, PLACE_P, PRIVACY, MOOD, FOOD_P, DIET_ONLY, ALLERGY_ONLY, DRINKS, MUSIC_P, DECOR_P, CAKE_Q, PHOTOS, SERVICE, GIFTS_P],
    plan: [
      S('catering_food', 'recommended', 'Feed them', 'A menu chosen by the graduate, which is the point of the evening'),
      S('photography', 'conditional', 'Portrait them', 'The graduate with their family, in the gown if they still have it', { when: WHEN_SHOT }),
      S('cake_desserts', 'conditional', 'Bring a cake', 'A cake for the end of years of work', { when: WHEN_CAKE }),
      S('gifts_favours', 'conditional', 'Give them one', 'Something to keep, which marks the end better than an evening', { when: WHEN_GIFTS }),
      S('decoration_floral', 'conditional', 'Dress it', 'A setting that leaves room for the certificate and the photographs', { when: WHEN_DECOR }),
      S('bar_beverages', 'conditional', 'Pour a toast', 'Something to toast with, and plenty that is not alcoholic', { when: WHEN_DRINKS }),
      S('anchor_mc', 'conditional', 'Call the toast', 'Someone to call the toast so a parent does not have to', { when: WHEN_GROUP }),
      S('live_entertainment', 'conditional', 'Play softly', 'Quiet music through dinner', { when: WHEN_LIVE }),
      S('guest_services', 'conditional', 'Host it', 'Arrivals, seating and keeping the evening to time', { when: WHEN_SERVICE }),
      S('venue', 'conditional', 'Find a table', 'Somewhere that holds the family and lets them talk', { when: WHEN_FIND }),
    ],
    addons: [
      X('their_menu', 'Let them choose', 'The graduate choosing the menu, which is a small thing that lands', 'cutlery', { trade: 'catering_food' }),
      X('parent_moment', 'Give them a word', 'A moment for the parents to say something, which they will want', 'mic', { experience: true }),
      X('gown_photo', 'Shoot the gown', 'Photographs in the gown before it has to go back', 'camera', { trade: 'photography', when: WHEN_SHOT }),
      X('keep_it_them', 'Keep it theirs', 'Their friends included, not only the relatives', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The degree, the ceremony and the certificate are the institution’s. We never award or certify anything, and nothing from the evening is published by us.' },
    timeline: {
      before: ['Menu chosen by the graduate', 'Photographs planned while the gown is still available', 'A moment set aside for the parents to speak'],
      during: ['Photographs in the gown taken early', 'The toast called by someone other than a parent', 'Their own friends included, not just relatives'],
      after: ['Photographs shared with the family', 'Gown returned on time', 'Space restored'],
    },
    checklist: ['The graduate chooses the menu', 'Photographs in the gown', 'A moment for the parents', 'Their friends included'],
  }),
]

export const SPECIAL_BLUEPRINT = Object.fromEntries(SPECIAL_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(SPECIAL_BLUEPRINTS, 'special')
