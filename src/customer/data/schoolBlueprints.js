/**
 * School Events — one blueprint per occasion.
 *
 * Twenty occasions, and what separates them from every other category
 * is that the guests are children. That single fact changes the rules:
 *
 *   · Nothing alcoholic is ever offered, at any school occasion, for
 *     any reason. `bar_beverages` appears here only as what it also
 *     is — juice, water and ice-cream.
 *   · A child is photographed only where the school already holds a
 *     parent's consent. We ask; we never assume, and "no close-ups of
 *     children" is a real answer that reaches the photographer as a
 *     rule rather than a preference.
 *   · Anything physical, outdoors or crowded gets first aid offered —
 *     offered, not assumed, because the school may already have a
 *     nurse on the staff.
 *   · Nothing religious is ever inferred from a school's name, its
 *     area or its language. A school occasion asks for no practitioner
 *     at all; if a school wants one, it is a different occasion.
 *   · Everything scales with WHO is taking part. A kindergarten
 *     graduation and a Class 12 farewell share a template in the
 *     catalogue and nothing else, so they share nothing here.
 *
 * Most of these happen on campus, so the first real question is where:
 * on campus we bring what the campus does not have, and the venue
 * trade only appears for a school that is going outside.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  CAMPUS_PLACE, CHIEF_GUEST, STAGE_NEED, AV_NEED, SEATING_FOR, REFRESH, AWARDS, CAKE_Q,
  DIET_ONLY, ALLERGY_ONLY, THEME, DRESS_CODE, TRANSPORT,
  WHEN_STAGE, WHEN_AV, WHEN_SEATS, WHEN_FED, WHEN_MEAL, WHEN_OFFSITE, WHEN_ONGROUND,
  WHEN_PRINTED, WHEN_TROPHY, WHEN_RIDE, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a school occasion asks ─────────────────────────── */

/** Who is taking part decides the seating, the safety and the length. */
const CLASSES = Q('classes', 'Which classes are taking part?', 'one', {
  options: [['pre', 'Pre-primary'], ['primary', 'Primary'], ['middle', 'Middle school'], ['senior', 'Senior school'], ['whole', 'The whole school']],
  help: 'The age of the children decides almost everything else.',
})
const PARENTS = Q('parents', 'Are parents invited?', 'one', {
  options: [['all', 'Yes, all of them'], ['some', 'Some — by invitation'], ['no', 'Students and staff only']],
})

/**
 * The one question this category must never get wrong. A school holds
 * consent; we do not, and we are not entitled to assume it.
 */
const MINOR_PHOTO = Q('photos', 'Photography', 'one', {
  options: [['school', 'Yes — the school has consent on file'], ['faces', 'Yes, but no close-ups of children'], ['no', 'No photography']],
  help: 'Children are photographed only where the school already holds a parent’s consent. We never decide this for you.',
})
const VIDEO = Q('video', 'A film of the day?', 'yesno', { optional: true, when: [notAns('photos', 'no')] })

const COSTUMES = Q('costumes', 'Costumes and dressing up?', 'one', { options: [['rent', 'Please arrange them'], ['have', 'The school has them'], ['none', 'No costumes']] })
const BACKSTAGE = Q('backstage', 'Do the children need a green room backstage?', 'yesno', { optional: true })
const VISITORS = Q('visitors', 'Who is visiting?', 'one', {
  options: [['school', 'Students and staff'], ['parents', 'Parents too'], ['public', 'Other schools and the public']],
})
const SIGNAGE = Q('signage', 'Do you need signage and a floor plan?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno')
const FIRST_AID = Q('first_aid', 'Do you need a first-aid team on site?', 'yesno', {
  optional: true, help: 'Only if the school does not already have one on the staff.',
})

const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILMED = [ans('video', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_AID = [ans('first_aid', 'yes')]
const WHEN_PARENTS = [ans('parents', 'all', 'some')]
const WHEN_OPEN = [ans('visitors', 'parents', 'public')]

/* A campus occasion is a venue occasion only when it leaves campus. */
const CAMPUS = ['venue', 'outdoor']

export const SCHOOL_BLUEPRINTS = [

  B('school-annual-day', 'Showcase', 'Give every child their moment on the stage, in front of the people who came for them.', {
    about: 'The biggest night in a school’s year, and the one where the running order matters more than anything on it. Twenty items, six hundred parents, and one child in each item who will remember it.',
    formats: CAMPUS,
    ask: [
      CLASSES, PARENTS, CAMPUS_PLACE,
      Q('items', 'How many items are on the programme?', 'select', { options: [['6', 'Up to 6'], ['12', 'Up to 12'], ['20', 'Up to 20'], ['30', 'More than 20']] }),
      STAGE_NEED, AV_NEED, COSTUMES,
      Q('stage_makeup', 'Stage makeup for the performers?', 'yesno', { optional: true }),
      BACKSTAGE, CHIEF_GUEST, SEATING_FOR, AWARDS, MINOR_PHOTO, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'Mics for the children, speakers that reach the last row'),
      S('event_lighting', 'recommended', 'Spotlight', 'Stage lights, so every face is visible from the back'),
      S('decoration_floral', 'recommended', 'Dress', 'A backdrop and a stage that carry the whole evening'),
      S('anchor_mc', 'recommended', 'Host', 'Someone who keeps twenty items running to time'),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage the whole school can be seen on', { when: WHEN_STAGE }),
      S('tent_furniture', 'conditional', 'Seat', 'Chairs for every parent, and a green room behind', { when: [some(WHEN_SEATS[0], ans('backstage', 'yes'))] }),
      S('event_materials_supplier', 'conditional', 'Costume', 'Costumes, sized and sorted by item', { when: [ans('costumes', 'rent')] }),
      S('bridal_makeup_hair', 'conditional', 'Ready', 'Stage makeup for the performers, done backstage', { when: [ans('stage_makeup', 'yes')] }),
      S('photography', 'conditional', 'Capture', 'Every item, and every child in it', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Replay', 'The whole evening, filmed properly', { when: WHEN_FILMED }),
      S('invitation_printing', 'conditional', 'Print', 'Certificates and a running order for every seat', { when: WHEN_PRINTED }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies and mementoes, engraved and sorted', { when: WHEN_TROPHY }),
      S('guest_services', 'conditional', 'Welcome', 'Ushers to seat parents and find the right row', { when: WHEN_PARENTS }),
      S('catering_food', 'conditional', 'Refresh', 'Food for the staff, the guests and the performers', { when: WHEN_FED }),
      S('power_cooling', 'conditional', 'Power', 'A silent generator, so the show never stops mid-item', { when: WHEN_ONGROUND }),
      S('venue', 'conditional', 'Gather', 'An auditorium big enough for every parent', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'The hall cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('photo_backdrop', 'Frame', 'A backdrop parents queue to photograph their child against', 'flower', { trade: 'decoration_floral' }),
      X('class_photo', 'Keep', 'One photograph of every class, in costume, before they change', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('live_stream', 'Share', 'A stream for the families who could not come', 'film', { trade: 'videography', when: WHEN_FILMED }),
      X('programme_print', 'Programme', 'A printed running order on every seat', 'invite', { trade: 'invitation_printing' }),
      X('rehearsal_day', 'Rehearse', 'One full run with sound and lights before the day', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The running order is the whole evening. We will not suggest anything that adds to it without saying what it costs in minutes.' },
    timeline: {
      before: ['Lock the running order, then stop changing it', 'One full rehearsal with the real sound and lights', 'Costumes sized and labelled by item'],
      during: ['Parents seated before the first item', 'Backstage kept calm, one item ahead', 'Chief guest, awards, closing'],
      after: ['Costumes collected and counted', 'Photographs shared with each class', 'Hall cleared and cleaned'],
    },
    checklist: ['Running order final', 'Sound and lights rehearsed', 'Costumes ready', 'Seating counted for parents'],
  }),

  B('school-sports-day', 'Compete', 'A day of running, cheering and a medal for every child who tried.', {
    about: 'A whole school outdoors for a whole day. The things that decide whether it goes well are shade, water and first aid — not the track.',
    formats: ['outdoor', 'venue'],
    ask: [
      CLASSES, PARENTS, CAMPUS_PLACE,
      Q('events', 'What is on the card?', 'many', { options: [['track', 'Track races'], ['field', 'Field events'], ['drill', 'March past and drill'], ['team', 'Team games'], ['fun', 'Fun races for parents']] }),
      Q('marking', 'Do you need the track marked and the field set up?', 'yesno'),
      Q('shade', 'Shade for the children and the parents?', 'yesno'),
      Q('water', 'Drinking water points on the ground?', 'yesno'),
      FIRST_AID,
      Q('announce', 'Do you need commentary and an announcement system?', 'yesno'),
      SEATING_FOR, AWARDS, MINOR_PHOTO, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'conditional', 'Mark', 'Track marked, lanes laid, field events set up', { when: [ans('marking', 'yes')] }),
      S('safety_facilities', 'recommended', 'Protect', 'A first-aid team on the ground, and the ground cleared after', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('tent_furniture', 'conditional', 'Shade', 'Canopies and seating along the track', { when: [some(ans('shade', 'yes'), WHEN_SEATS[0])] }),
      S('sound_av', 'conditional', 'Announce', 'A PA system heard across the whole ground', { when: [ans('announce', 'yes')] }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Cold water points along the ground, refilled all day', { when: [ans('water', 'yes')] }),
      S('gifts_favours', 'conditional', 'Honour', 'Medals and trophies, engraved and sorted by event', { when: WHEN_TROPHY }),
      S('invitation_printing', 'conditional', 'Certify', 'Certificates and a printed event card', { when: WHEN_PRINTED }),
      S('photography', 'conditional', 'Freeze', 'The finish line, the podium, the faces', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Replay', 'The march past and the finals, filmed', { when: WHEN_FILMED }),
      S('catering_food', 'conditional', 'Refresh', 'Food for the children, the staff and the guests', { when: WHEN_FED }),
      S('power_cooling', 'conditional', 'Power', 'A generator for the PA and the shade fans', { when: WHEN_ONGROUND }),
      S('guest_services', 'conditional', 'Receive', 'Hosts to seat parents and keep the track clear', { when: WHEN_PARENTS }),
      S('security_services', 'conditional', 'Order', 'Staff at the gates when every parent comes at once', { when: [ans('parents', 'all'), from(300)] }),
      S('venue', 'conditional', 'Ground', 'A ground big enough for the whole school', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('winners_podium', 'Podium', 'A three-step podium, because the photograph needs one', 'game', { trade: 'event_equipment_rental' }),
      X('house_flags', 'Colour', 'House flags, bunting and a finish-line arch', 'balloon', { trade: 'decoration_floral' }),
      X('ice_cream', 'Cool', 'An ice-cream cart after the last race', 'bar_beverages', { trade: 'bar_beverages' }),
      X('finish_camera', 'Decide', 'A second camera on the finish line, for the close ones', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('parent_race', 'Join', 'A fun race for the parents at the end of the card', 'group', { experience: true, when: [ans('events', 'fun')] }),
    ],
    toolkit: { polls: ['date'], note: 'Water, shade and first aid come before anything decorative on a sports day. We will say so if they are switched off.' },
    timeline: {
      before: ['Mark the track and set the field the evening before', 'Water points placed, shade up', 'Event card printed and given to every class teacher'],
      during: ['March past, then the card in order', 'Water and first aid visible all day', 'Medals as each event finishes, not all at the end'],
      after: ['Equipment counted back in', 'Ground cleared', 'Photographs sent to each house'],
    },
    checklist: ['Track marked', 'Water points on the ground', 'First aid arranged or confirmed', 'Medals counted against the event card'],
  }),

  B('school-graduation', 'Graduate', 'Mark the end of school with the ceremony they will measure the rest against.', {
    about: 'Not a farewell party — a ceremony. Names read out, certificates handed over, parents in the audience. The thing that goes wrong is a mispronounced name, so the plan treats that as a deliverable.',
    formats: CAMPUS,
    ask: [
      Q('year_group', 'Which group is graduating?', 'one', { options: [['10', 'Class 10'], ['12', 'Class 12'], ['both', 'Both'], ['other', 'Another group']] }),
      Q('strength', 'How many are graduating?', 'select', { options: [['30', 'Up to 30'], ['80', 'Up to 80'], ['150', 'Up to 150'], ['300', 'More than 150']] }),
      PARENTS, CAMPUS_PLACE, STAGE_NEED,
      Q('robes', 'Gowns and caps?', 'one', { options: [['rent', 'Please arrange them'], ['have', 'The school has them'], ['none', 'No gowns']] }),
      AWARDS, CHIEF_GUEST, AV_NEED, SEATING_FOR,
      Q('yearbook', 'A printed yearbook to hand out?', 'yesno', { optional: true }),
      MINOR_PHOTO, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'A mic that makes every name clear to the back of the hall'),
      S('decoration_floral', 'recommended', 'Dress', 'A stage that makes the walk up to it count'),
      S('photography', 'recommended', 'Keep', 'The handshake, the certificate, and the whole batch together', { unless: UNLESS_PHOTO }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, and a clear path up and down it', { when: WHEN_STAGE }),
      S('event_materials_supplier', 'conditional', 'Robe', 'Gowns and caps, sized to a list and delivered', { when: [ans('robes', 'rent')] }),
      S('invitation_printing', 'conditional', 'Certify', 'Certificates and the yearbook, every name checked twice', { when: [some(WHEN_PRINTED[0], ans('yearbook', 'yes'))] }),
      S('anchor_mc', 'conditional', 'Announce', 'Someone who reads three hundred names and gets them right', { when: [some(ans('chief_guest', 'yes'), ans('strength', '150', '300'))] }),
      S('videography', 'conditional', 'Replay', 'The ceremony, filmed from the front', { when: WHEN_FILMED }),
      S('event_lighting', 'conditional', 'Light', 'Light on the stage, not in the audience’s eyes', { when: [ans('place', 'hall')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the batch and for every parent', { when: WHEN_SEATS }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies, medals and a memento for the chief guest', { when: WHEN_TROPHY }),
      S('guest_services', 'conditional', 'Seat', 'Ushers who get each family to the right row in time', { when: WHEN_PARENTS }),
      S('catering_food', 'conditional', 'Refresh', 'Something to eat once the certificates are done', { when: WHEN_FED }),
      S('venue', 'conditional', 'Gather', 'A hall that seats the batch and their families', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'The hall cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('cap_toss', 'Throw', 'The cap-toss photograph, set up properly instead of hoped for', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('batch_frame', 'Pose', 'A photo frame prop with the batch and the year on it', 'flower', { trade: 'decoration_floral' }),
      X('years_film', 'Rewind', 'A short film of their years, played before the certificates', 'film', { trade: 'videography' }),
      X('name_rehearsal', 'Check', 'Every name read aloud once, to the student, before the day', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'A graduation is a list of names. We treat the name list as the deliverable, not the decoration.' },
    timeline: {
      before: ['Name list confirmed, with pronunciations', 'Gowns sized against the list', 'Seating planned by family, not by class'],
      during: ['Procession in', 'Names read, certificates handed over', 'Batch photograph before anyone changes'],
      after: ['Gowns collected and counted', 'Certificates for anyone absent', 'Photographs and the film shared'],
    },
    checklist: ['Name list checked twice', 'Gowns sized', 'Certificates printed and sorted', 'Batch photograph planned'],
  }),

  B('kindergarten-graduation', 'Beginnings', 'Their very first graduation — small gowns, short speeches, very big day.', {
    about: 'Twenty minutes long, and every parent in the room is filming. Everything is sized for a four-year-old: the stage step, the mic, the snack, the attention span.',
    formats: CAMPUS,
    ask: [
      Q('children', 'How many children are graduating?', 'select', { options: [['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'Up to 50'], ['100', 'More than 50']] }),
      CAMPUS_PLACE,
      Q('robes', 'Tiny gowns and caps?', 'one', { options: [['rent', 'Please arrange them'], ['have', 'The school has them'], ['none', 'No gowns']] }),
      Q('programme', 'Is there a short performance too?', 'yesno'),
      STAGE_NEED, AV_NEED, SEATING_FOR, CAKE_Q,
      Q('treats', 'Refreshments', 'one', { options: [['all', 'For the children and the parents'], ['kids', 'Just for the children'], ['none', 'Nothing needed']] }),
      Q('favours', 'A small gift for every child?', 'yesno', { optional: true }),
      MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Brighten', 'Balloons, bunting and a backdrop at a child’s height'),
      S('invitation_printing', 'recommended', 'Certify', 'A certificate with each child’s name, spelled as the family does'),
      S('photography', 'recommended', 'Keep', 'The one photograph every parent came for', { unless: UNLESS_PHOTO }),
      S('event_materials_supplier', 'conditional', 'Robe', 'Tiny gowns and caps, sized for four-year-olds', { when: [ans('robes', 'rent')] }),
      S('cake_desserts', 'conditional', 'Delight', 'A cake small hands can be served from', { when: [ans('cake', 'order')] }),
      S('catering_food', 'conditional', 'Treat', 'Snacks a small hand can hold without help', { when: [ans('treats', 'all', 'kids')] }),
      S('sound_av', 'conditional', 'Amplify', 'A mic low enough for a child to reach', { when: WHEN_AV }),
      S('event_equipment_rental', 'conditional', 'Build', 'A low stage, with a step a four-year-old can manage', { when: WHEN_STAGE }),
      S('live_entertainment', 'conditional', 'Delight', 'A short act while the little ones settle', { when: [ans('programme', 'yes')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for parents, and somewhere for the children to sit first', { when: WHEN_SEATS }),
      S('gifts_favours', 'conditional', 'Give', 'A keepsake for every child to take home', { when: [ans('favours', 'yes')] }),
      S('venue', 'conditional', 'Gather', 'A hall for the children and all their families', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleaned up afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('child_portrait', 'Portrait', 'One portrait of each child in the gown, printed', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('balloon_arch', 'Arch', 'A balloon arch they walk through, one at a time', 'balloon', { trade: 'decoration_floral' }),
      X('storyteller', 'Enchant', 'A storyteller to hold them while the parents arrive', 'magic', { trade: 'live_entertainment' }),
      X('handprint_canvas', 'Keepsake', 'A canvas every child adds a handprint to', 'craft', { experience: true }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Twenty minutes is long enough. Anything that makes it longer makes it worse.' },
    timeline: {
      before: ['Name spellings checked with each family', 'Gowns tried on once, a week before', 'Stage step tested by an actual child'],
      during: ['Children seated first, parents after', 'Names, caps, certificates — short', 'Photographs, then snacks'],
      after: ['Gowns collected', 'Certificates for anyone who was away', 'Photographs sent to every family'],
    },
    checklist: ['Name spellings confirmed', 'Gowns sized', 'Step safe for a four-year-old', 'Snacks suitable for the youngest child there'],
  }),

  B('school-farewell', 'Sendoff', 'The night the seniors leave with, and the juniors plan for a month.', {
    about: 'Organised by the juniors, attended by the whole senior batch, and watched closely by the staff. It is a school event: there is no bar, and there never will be.',
    formats: CAMPUS,
    ask: [
      Q('year_group', 'Who is being sent off?', 'one', { options: [['10', 'Class 10'], ['12', 'Class 12'], ['both', 'Both'], ['other', 'Another group']] }),
      Q('hosts', 'Who is organising it?', 'one', { options: [['juniors', 'The junior batch'], ['school', 'The school'], ['both', 'Both together']] }),
      CAMPUS_PLACE,
      THEME('Is there a theme?', [['none', 'No theme'], ['retro', 'Retro'], ['bollywood', 'Bollywood'], ['formal', 'Black tie'], ['decade', 'A decade'], ['other', 'Something else']]),
      Q('music', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist and speakers'], ['none', 'No music']] }),
      Q('titles', 'Are there titles and awards for the seniors?', 'yesno'),
      STAGE_NEED, AV_NEED, SEATING_FOR, DRESS_CODE, REFRESH, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Transform', 'The hall turned into somewhere worth dressing up for'),
      S('photography', 'recommended', 'Capture', 'The last photographs of the batch together', { unless: UNLESS_PHOTO }),
      S('dj_music', 'conditional', 'Move', 'A DJ who knows what a school floor will dance to', { when: [ans('music', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the evening', { when: [ans('music', 'live')] }),
      S('sound_av', 'conditional', 'Amplify', 'Speakers and mics for the titles and the playlist', { when: [some(ans('music', 'playlist'), ans('titles', 'yes'), has('av'))] }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to run the titles and keep the evening moving', { when: [ans('titles', 'yes')] }),
      S('gifts_favours', 'conditional', 'Honour', 'Sashes and a memento for every senior, not just the winners', { when: [ans('titles', 'yes')] }),
      S('event_lighting', 'conditional', 'Glow', 'Lights that make a school hall feel like a night out', { when: [ans('music', 'dj', 'live')] }),
      S('catering_food', 'conditional', 'Feast', 'Dinner or a snack counter for the whole batch', { when: WHEN_FED }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage and a dance floor laid in the hall', { when: WHEN_STAGE }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating around the floor, so nobody stands all night', { when: WHEN_SEATS }),
      S('cake_desserts', 'optional', 'Delight', 'A cake for the batch to cut'),
      S('venue', 'conditional', 'Gather', 'A hall outside school for the evening', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'The hall cleared and cleaned before school next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('photo_booth', 'Pose', 'A booth with props, and prints they take home the same night', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('memory_slideshow', 'Rewind', 'A slideshow of their years, on the screen between titles', 'film', { trade: 'sound_av' }),
      X('sash_printing', 'Name', 'Printed sashes, one for every title', 'invite', { trade: 'invitation_printing', when: [ans('titles', 'yes')] }),
      X('mocktail_counter', 'Sip', 'A mocktail counter — no alcohol, at any school event', 'glass', { trade: 'bar_beverages' }),
      X('junior_tribute', 'Thank', 'A short piece from the juniors, rehearsed properly', 'music', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'No alcohol is offered at a school event, whoever is organising it and whatever the batch is called.' },
    timeline: {
      before: ['Theme and dress code announced early enough to be fun', 'Titles decided and sashes printed', 'Sound and the slideshow tested in the hall'],
      during: ['Arrivals and photographs first', 'Titles, then the floor opens', 'Cake, group photograph, close'],
      after: ['Hall cleared the same night', 'Photographs shared with the batch', 'Equipment returned'],
    },
    checklist: ['Titles and sashes ready', 'Sound tested in the room', 'Food counted for the batch and the staff', 'Hall booked for clearing afterwards'],
  }),

  B('freshers-welcome', 'Welcome', 'Make the new ones feel like they have always been here.', {
    about: 'Short, warm and built around names. A new child remembers who said hello, not what the hall looked like.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('new_count', 'How many new students?', 'select', { options: [['20', 'Up to 20'], ['50', 'Up to 50'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      CAMPUS_PLACE,
      Q('format', 'How is it being run?', 'one', { options: [['assembly', 'A short assembly'], ['programme', 'A stage programme'], ['games', 'Games and ice-breakers'], ['mixed', 'A bit of everything']] }),
      Q('badges', 'Name badges for the new students?', 'yesno', { optional: true }),
      Q('buddy', 'Are senior students hosting them?', 'yesno', { optional: true }),
      Q('welcome_kit', 'A welcome kit for each new student?', 'yesno', { optional: true }),
      STAGE_NEED, AV_NEED, SEATING_FOR, PARENTS, REFRESH, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Welcome', 'A doorway and a hall that say you belong here'),
      S('anchor_mc', 'conditional', 'Warm', 'Someone who can get a shy room talking', { when: [ans('format', 'programme', 'games', 'mixed')] }),
      S('sound_av', 'conditional', 'Amplify', 'Mics and sound for the hall', { when: [some(ans('format', 'programme', 'mixed'), has('av'))] }),
      S('live_entertainment', 'conditional', 'Break the ice', 'An act that gets a nervous room laughing', { when: [ans('format', 'programme', 'mixed')] }),
      S('invitation_printing', 'conditional', 'Name', 'A badge with every new student’s name on it', { when: [ans('badges', 'yes')] }),
      S('gifts_favours', 'conditional', 'Give', 'A welcome kit with the things a new student actually needs', { when: [ans('welcome_kit', 'yes')] }),
      S('catering_food', 'conditional', 'Share', 'Something to eat, which is what makes strangers talk', { when: WHEN_FED }),
      S('event_equipment_rental', 'conditional', 'Build', 'A small stage for the welcome', { when: WHEN_STAGE }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating arranged so new and old students mix', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Record', 'The first photograph of the new intake', { when: WHEN_SHOT }),
      S('guest_services', 'conditional', 'Receive', 'Hosts at the gate for parents dropping them off', { when: WHEN_PARENTS }),
      S('venue', 'conditional', 'Gather', 'A hall outside school for the welcome', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleaned up afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('ice_breaker_kit', 'Mix', 'Games and materials that get a room moving in five minutes', 'game', { trade: 'event_materials_supplier', when: [ans('format', 'games', 'mixed')] }),
      X('name_banner', 'Banner', 'A banner with every new name on it, at the door', 'invite', { trade: 'decoration_floral' }),
      X('intake_photo', 'Keep', 'A photograph of the whole new intake, year one', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('buddy_pairing', 'Pair', 'Each new student paired with a senior, named on a board', 'group', { experience: true, when: [ans('buddy', 'yes')] }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Names matter more than décor here. Get the spellings right and the rest is easy.' },
    timeline: {
      before: ['Name list and spellings from admissions', 'Badges printed, kits packed', 'Senior hosts briefed on who they are meeting'],
      during: ['Hosts meet them at the gate by name', 'Short programme, then ice-breakers', 'Food, and time to actually talk'],
      after: ['Photographs shared with the families', 'Buddy pairings put up on the board', 'Clean-up'],
    },
    checklist: ['Name list confirmed', 'Badges printed', 'Senior hosts briefed', 'Food counted for new students and hosts'],
  }),

  B('teachers-day-celebration', 'Honour', 'One day the students run, for the people who run every other one.', {
    about: 'The point is role reversal: the teachers sit and are served. Anything that puts a teacher back to work on the day defeats it.',
    formats: CAMPUS,
    ask: [
      Q('who_runs', 'Who is organising it?', 'one', { options: [['students', 'The students'], ['school', 'The school'], ['pta', 'The parents'], ['both', 'Students and school together']] }),
      CLASSES, CAMPUS_PLACE,
      Q('format', 'What is planned?', 'many', { options: [['programme', 'A stage programme'], ['speeches', 'Speeches and felicitation'], ['lunch', 'A lunch for the teachers'], ['games', 'Games for the staff'], ['gifts', 'A gift for every teacher']] }),
      Q('staff_count', 'How many teachers and staff?', 'select', { options: [['20', 'Up to 20'], ['50', 'Up to 50'], ['100', 'Up to 100'], ['200', 'More than 100']] }),
      STAGE_NEED, AV_NEED, CAKE_Q, SEATING_FOR, MINOR_PHOTO, REFRESH, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress', 'The hall and the staff room, made to feel different today'),
      S('photography', 'recommended', 'Keep', 'A proper photograph of the whole staff, which most schools do not have', { unless: UNLESS_PHOTO }),
      S('gifts_favours', 'conditional', 'Thank', 'A gift for every teacher, wrapped and named', { when: [ans('format', 'gifts')] }),
      S('catering_food', 'conditional', 'Serve', 'Lunch served to the staff, for once, instead of by them', { when: [some(ans('format', 'lunch'), WHEN_FED[0])] }),
      S('cake_desserts', 'conditional', 'Delight', 'A cake for the staff room', { when: [ans('cake', 'order')] }),
      S('sound_av', 'conditional', 'Amplify', 'Mics for the speeches and tracks for the items', { when: [some(ans('format', 'programme', 'speeches'), has('av'))] }),
      S('anchor_mc', 'conditional', 'Host', 'A student host, with someone backing them up', { when: [ans('format', 'programme', 'speeches')] }),
      S('live_entertainment', 'conditional', 'Perform', 'The students’ act, staged properly rather than improvised', { when: [ans('format', 'programme')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage for the programme', { when: WHEN_STAGE }),
      S('invitation_printing', 'conditional', 'Cite', 'A printed citation for each teacher, named', { when: [ans('format', 'speeches', 'gifts')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Comfortable seating at the front for the staff', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Gather', 'Somewhere outside school for the lunch', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned, by anyone but the teachers', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('felicitation_set', 'Felicitate', 'Shawls and mementoes for the felicitation, one per teacher', 'gift', { trade: 'gifts_favours' }),
      X('staff_portrait', 'Portrait', 'A framed photograph of the whole staff, printed and hung', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('flower_at_door', 'Greet', 'A flower handed to each teacher at the gate in the morning', 'flower', { trade: 'decoration_floral' }),
      X('message_wall', 'Say', 'A wall where every student writes one line to one teacher', 'craft', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Count the staff, not the teaching staff. The people who are usually forgotten on Teachers’ Day are the ones who are not teachers.' },
    timeline: {
      before: ['Full staff list — teaching and non-teaching', 'Students rehearsed, gifts named and wrapped', 'Lunch counted against the full list'],
      during: ['Teachers seated and served', 'Programme, speeches, felicitation', 'Staff photograph before anyone leaves'],
      after: ['Citations given to anyone absent', 'Photograph printed and hung', 'Clean-up, not by the staff'],
    },
    checklist: ['Full staff list, including non-teaching', 'Gifts named and counted', 'Students rehearsed', 'Lunch counted'],
  }),

  B('childrens-day-celebration', 'Play', 'A day with no timetable, run entirely for the children.', {
    about: 'The one day the teachers perform and the children watch. Nothing here is educational, and that is the whole design.',
    formats: CAMPUS,
    ask: [
      CLASSES, CAMPUS_PLACE,
      Q('format', 'What is planned?', 'many', { options: [['show', 'A show by the teachers'], ['magic', 'A magician or performer'], ['games', 'Games and races'], ['movie', 'A film screening'], ['outing', 'A picnic or outing']] }),
      Q('treat_kind', 'Treats', 'one', { options: [['meal', 'A special lunch'], ['snacks', 'Snacks and sweets'], ['icecream', 'Ice cream'], ['none', 'Nothing needed']] }),
      Q('gifts', 'A small gift for every child?', 'yesno', { optional: true }),
      STAGE_NEED, AV_NEED, SEATING_FOR, TRANSPORT, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Brighten', 'Balloons and colour everywhere they look'),
      S('live_entertainment', 'conditional', 'Amaze', 'A magician, a puppeteer or a clown, for the age in the room', { when: [ans('format', 'magic', 'show')] }),
      S('catering_food', 'conditional', 'Treat', 'A lunch or a snack counter for the whole school', { when: [ans('treat_kind', 'meal', 'snacks')] }),
      S('bar_beverages', 'conditional', 'Cool', 'An ice-cream counter for every class in turn', { when: [ans('treat_kind', 'icecream')] }),
      S('sound_av', 'conditional', 'Amplify', 'Sound, mics and a screen for the film', { when: [some(ans('format', 'movie', 'show'), has('av'))] }),
      S('anchor_mc', 'conditional', 'Run', 'Someone to run the games and keep four hundred children in order', { when: [ans('format', 'games')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage for the teachers’ show', { when: WHEN_STAGE }),
      S('gifts_favours', 'conditional', 'Give', 'Something small for every child, counted by class', { when: [ans('gifts', 'yes')] }),
      S('photography', 'conditional', 'Capture', 'The afternoon, as the children saw it', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating or mats, by class', { when: WHEN_SEATS }),
      S('passenger_transport', 'conditional', 'Travel', 'Buses for the outing, with a staff seat on each', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Gather', 'Somewhere outside school for the day', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('game_stalls', 'Bounce', 'Inflatables and game stalls on the ground', 'game', { trade: 'event_equipment_rental' }),
      X('face_painting', 'Paint', 'Face painting through the afternoon, class by class', 'paint', { trade: 'bridal_makeup_hair' }),
      X('puppet_show', 'Enchant', 'A puppet show for the younger classes, separately', 'magic', { trade: 'live_entertainment' }),
      X('snack_cart', 'Snack', 'A popcorn and candy-floss cart on the ground', 'bar_beverages', { trade: 'bar_beverages' }),
      X('no_homework', 'Release', 'No homework set the night before, announced in advance', 'schedule', { experience: true }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'Check allergies before any treat reaches a classroom. We will put the list in front of the caterer.' },
    timeline: {
      before: ['Allergy list from every class teacher', 'Performer booked for the right age group', 'Treats counted by class, not by total'],
      during: ['Teachers’ show first, while attention is full', 'Games or film', 'Treats, by class, so nobody is missed'],
      after: ['Classrooms back to normal for tomorrow', 'Photographs shared', 'Clean-up'],
    },
    checklist: ['Allergy list collected', 'Performer suited to the age group', 'Treats counted by class', 'Staff assigned to each activity'],
  }),

  B('science-exhibition', 'Discover', 'Give every working model the table, the power and the audience it has earned.', {
    about: 'The difference between a science exhibition and any other display is electricity. Working models need power at the table, and a few of them need a fire extinguisher nearby.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('projects', 'About how many projects?', 'select', { options: [['20', 'Up to 20'], ['50', 'Up to 50'], ['100', 'Up to 100'], ['200', 'More than 100']] }),
      CAMPUS_PLACE,
      Q('display', 'What does each project need?', 'many', { options: [['tables', 'A table'], ['boards', 'A display board'], ['power', 'A power point for a working model'], ['water', 'Water'], ['dark', 'A dark corner']] }),
      Q('hazard', 'Do any projects use flame, chemicals or mains power?', 'yesno', { help: 'If yes, we put extinguishers and a safety marshal on the floor. This is not optional for us.' }),
      Q('judging', 'Is it being judged?', 'yesno'),
      VISITORS, SIGNAGE, AWARDS, SEATING_FOR, MINOR_PHOTO, REFRESH, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set', 'Tables and display boards for every project, numbered'),
      S('power_cooling', 'conditional', 'Power', 'Safe, distributed power at the tables that need it', { when: [ans('display', 'power')] }),
      S('safety_facilities', 'conditional', 'Protect', 'Extinguishers, a safety marshal on the floor, and the clear-up after', { when: [some(ans('hazard', 'yes'), WHEN_CLEAN[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting over the work, and a dark corner where one is needed', { when: [ans('display', 'dark')] }),
      S('invitation_printing', 'conditional', 'Label', 'Project labels, a floor plan, signage and certificates', { when: [some(ans('signage', 'yes'), WHEN_PRINTED[0], ans('judging', 'yes'))] }),
      S('guest_services', 'conditional', 'Guide', 'Hosts to walk visitors through in an order that works', { when: WHEN_OPEN }),
      S('photography', 'conditional', 'Record', 'Every project, photographed with the children who built it', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies and medals for the judged categories', { when: WHEN_TROPHY }),
      S('sound_av', 'conditional', 'Announce', 'Announcements that carry across an exhibition floor', { when: [ans('visitors', 'public')] }),
      S('catering_food', 'conditional', 'Refresh', 'Food for the children on the stalls, who cannot leave them', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the judges and for visitors who need it', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Order', 'Staff at the gate when the exhibition is open to the public', { when: [ans('visitors', 'public'), from(300)] }),
      S('decoration_floral', 'optional', 'Dress', 'An entrance and a theme for the exhibition'),
      S('venue', 'conditional', 'Gather', 'A hall large enough for every project', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('judges_desk', 'Judge', 'A judges’ table with score sheets, a clock and a running tally', 'game', { trade: 'event_equipment_rental', when: [ans('judging', 'yes')] }),
      X('project_labels', 'Label', 'A printed label and QR code beside every project', 'invite', { trade: 'invitation_printing' }),
      X('demo_stage', 'Demonstrate', 'A powered demo stage where the best three run live', 'power_cooling', { trade: 'power_cooling', when: [ans('display', 'power')] }),
      X('exhibition_book', 'Publish', 'A booklet of every project, for visitors to take away', 'craft', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'If any project uses flame, chemicals or mains power, we will keep safety on the plan even if everything else is switched off.' },
    timeline: {
      before: ['Project list with what each one needs — power, water, space', 'Hazardous projects identified and sited together', 'Floor plan drawn and numbered'],
      during: ['Children at their tables before visitors come in', 'Judging round, then the open round', 'Safety marshal on the floor the whole time'],
      after: ['Power isolated before anything is dismantled', 'Projects returned to the children', 'Floor cleared'],
    },
    checklist: ['Power plan per table', 'Hazardous projects identified', 'Floor plan and labels printed', 'Safety cover arranged'],
  }),

  B('art-and-craft-exhibition', 'Display', 'Hang a child’s work the way a gallery would hang anyone’s.', {
    about: 'The work is small, fragile and worth more to one family than to anyone else in the room. Everything here is about height, light and labels.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('works', 'About how many pieces?', 'select', { options: [['40', 'Up to 40'], ['100', 'Up to 100'], ['250', 'Up to 250'], ['500', 'More than 250']] }),
      CAMPUS_PLACE,
      Q('display', 'How is the work shown?', 'many', { options: [['panels', 'Hanging panels'], ['tables', 'Tables for three-dimensional work'], ['easels', 'Easels'], ['frames', 'Framed']] }),
      Q('lighting', 'Do you need lighting over the work?', 'yesno'),
      Q('sale', 'Is any of the work for sale, or being auctioned for a cause?', 'yesno', { optional: true }),
      Q('inauguration', 'A short inauguration?', 'yesno', { optional: true }),
      CHIEF_GUEST, VISITORS, SIGNAGE, AWARDS, SEATING_FOR, MINOR_PHOTO, REFRESH, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mount', 'Panels, easels and tables, set at a height a child can see'),
      S('event_lighting', 'conditional', 'Light', 'Gallery lighting, aimed at the work and not at the visitor', { when: [ans('lighting', 'yes')] }),
      S('invitation_printing', 'conditional', 'Credit', 'A card beside every piece with the artist’s name and class', { when: [some(ans('signage', 'yes'), WHEN_PRINTED[0])] }),
      S('decoration_floral', 'conditional', 'Open', 'An entrance and a ribbon for the inauguration', { when: [ans('inauguration', 'yes')] }),
      S('sound_av', 'conditional', 'Amplify', 'A mic for the opening, and nothing louder after', { when: [ans('inauguration', 'yes')] }),
      S('guest_services', 'conditional', 'Guide', 'Hosts to take visitors round in order', { when: WHEN_OPEN }),
      S('photography', 'conditional', 'Archive', 'Every piece photographed properly, so the work outlives the day', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Watch', 'Someone on the floor where work is for sale or for auction', { when: [ans('sale', 'yes')] }),
      S('gifts_favours', 'conditional', 'Honour', 'Prizes for the judged categories', { when: WHEN_TROPHY }),
      S('catering_food', 'conditional', 'Refresh', 'Something to eat for visitors and the children on duty', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for visitors who need to sit, in every room', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Gather', 'A hall with wall space, which is harder to find than floor space', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'The rooms cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('framing', 'Frame', 'Simple mounts and frames for the pieces that deserve them', 'craft', { trade: 'event_materials_supplier', when: [ans('display', 'frames')] }),
      X('artist_cards', 'Introduce', 'A card with each young artist’s photograph beside their work', 'invite', { trade: 'invitation_printing' }),
      X('exhibition_catalogue', 'Catalogue', 'A printed catalogue of the whole exhibition', 'album', { trade: 'invitation_printing' }),
      X('live_craft_corner', 'Make', 'A corner where visitors try it themselves, run by the children', 'paint', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Every piece gets a label with a name on it. A child whose work is unlabelled did not exhibit.' },
    timeline: {
      before: ['Every piece labelled with name and class', 'Hanging plan by room, at child height', 'Lighting aimed the evening before'],
      during: ['Inauguration, short', 'Open rounds, hosts guiding', 'Work watched, not left alone, where it is for sale'],
      after: ['Every piece returned to its maker', 'Exhibition photographed and catalogued', 'Rooms cleared'],
    },
    checklist: ['Every piece labelled', 'Hanging plan done', 'Lighting aimed', 'Return plan so no work is lost'],
  }),

  B('school-cultural-day', 'Heritage', 'Every language, every costume and every dance the school already has in it.', {
    about: 'A school’s cultural day is a map of where its families come from. We arrange the stage and the costumes; what goes on it comes from the families, never from us.',
    formats: CAMPUS,
    ask: [
      CLASSES, PARENTS, CAMPUS_PLACE,
      Q('items', 'How many items on the programme?', 'select', { options: [['8', 'Up to 8'], ['15', 'Up to 15'], ['25', 'Up to 25'], ['40', 'More than 25']] }),
      COSTUMES,
      Q('stage_makeup', 'Stage makeup for the performers?', 'yesno', { optional: true }),
      BACKSTAGE,
      Q('food_stalls', 'Are there food stalls from different regions?', 'yesno', { optional: true }),
      DIET_ONLY, ALLERGY_ONLY,
      STAGE_NEED, AV_NEED, SEATING_FOR, AWARDS, MINOR_PHOTO, VIDEO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'Tracks, mics and monitors — every item needs its own cue'),
      S('event_lighting', 'recommended', 'Spotlight', 'Lights that change with each item instead of staying on'),
      S('decoration_floral', 'recommended', 'Dress', 'A backdrop that carries fifteen different items'),
      S('anchor_mc', 'recommended', 'Introduce', 'Someone who can name each item and each language correctly'),
      S('event_materials_supplier', 'conditional', 'Costume', 'Costumes, sized and sorted by item, labelled by child', { when: [ans('costumes', 'rent')] }),
      S('bridal_makeup_hair', 'conditional', 'Ready', 'Stage makeup, done backstage between items', { when: [ans('stage_makeup', 'yes')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage with wings, so items can change behind', { when: WHEN_STAGE }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating in front, and a green room behind', { when: [some(WHEN_SEATS[0], ans('backstage', 'yes'))] }),
      S('catering_food', 'conditional', 'Taste', 'Regional food stalls, or a meal for everyone', { when: [some(ans('food_stalls', 'yes'), ans('diet', 'veg', 'nonveg', 'both', 'jain'))] }),
      S('photography', 'conditional', 'Capture', 'Every group, in costume, before they change', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Replay', 'The whole programme, filmed', { when: WHEN_FILMED }),
      S('gifts_favours', 'conditional', 'Honour', 'Prizes for the judged items', { when: WHEN_TROPHY }),
      S('guest_services', 'conditional', 'Welcome', 'Ushers for the parents, who will all arrive at once', { when: WHEN_PARENTS }),
      S('venue', 'conditional', 'Gather', 'A hall with a stage and wings', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Hall and stalls cleared afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('region_stalls', 'Share', 'A stall for each region, cooked by the families themselves', 'catering_food', { trade: 'catering_food', when: [ans('food_stalls', 'yes')] }),
      X('costume_portraits', 'Portrait', 'A portrait of every group in costume, printed for the class', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('folk_troupe', 'Open', 'A folk troupe to open the day, booked for the region you name', 'music', { trade: 'live_entertainment' }),
      X('origins_display', 'Map', 'A display of every place the school’s families have come from', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'What each community performs is decided by the families performing it. We arrange the stage; we never write the item.' },
    timeline: {
      before: ['Programme fixed with the families, not for them', 'Costumes sized and labelled by child', 'Sound cues listed in running order'],
      during: ['Items in order, with the cue sheet followed', 'Group photographs between items, not after', 'Stalls open through the programme'],
      after: ['Costumes collected and counted', 'Photographs sent to each class', 'Stalls and hall cleared'],
    },
    checklist: ['Programme agreed with families', 'Costumes labelled by child', 'Sound cue sheet in running order', 'Food choices and allergies collected'],
  }),

  B('school-talent-show', 'Shine', 'A stage, a working mic, and whoever is brave enough to take it.', {
    about: 'A talent show lives or dies on sound. Everything else can be improvised; a singer on a bad mic cannot.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('acts', 'How many acts?', 'select', { options: [['8', 'Up to 8'], ['15', 'Up to 15'], ['25', 'Up to 25'], ['40', 'More than 25']] }),
      Q('categories', 'What kinds of act?', 'many', { options: [['singing', 'Singing'], ['dance', 'Dance'], ['instrument', 'Instruments'], ['drama', 'Drama'], ['standup', 'Stand-up'], ['other', 'Anything else']] }),
      CAMPUS_PLACE,
      Q('judges', 'Is there a judging panel?', 'yesno'),
      Q('auditions', 'Is there an audition round first?', 'yesno', { optional: true }),
      STAGE_NEED, AV_NEED, BACKSTAGE, SEATING_FOR, AWARDS, MINOR_PHOTO, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'Mics, monitors and backing tracks — the thing a talent show is made of'),
      S('event_lighting', 'recommended', 'Spotlight', 'A spot that follows whoever is on, and darkness everywhere else'),
      S('anchor_mc', 'recommended', 'Fill', 'Someone to hold the room during every changeover'),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, and a judges’ table in front of it', { when: [some(WHEN_STAGE[0], ans('judges', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Dress', 'A backdrop with the show’s name on it', { when: [ans('place', 'hall', 'ground', 'outside')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Audience seating, and a green room for the acts waiting', { when: [some(WHEN_SEATS[0], ans('backstage', 'yes'))] }),
      S('photography', 'conditional', 'Capture', 'Each act, mid-performance rather than posed after', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Replay', 'Each act filmed, and cut so a family can be sent their own', { when: WHEN_FILMED }),
      S('invitation_printing', 'conditional', 'Score', 'Score sheets, a running order and certificates', { when: [some(ans('judges', 'yes'), WHEN_PRINTED[0])] }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies for the winners, something for everyone who went up', { when: WHEN_TROPHY }),
      S('catering_food', 'conditional', 'Refresh', 'Food for the acts, who will be there far longer than the audience', { when: WHEN_FED }),
      S('live_entertainment', 'optional', 'Headline', 'A professional act to close, so the night ends high'),
      S('venue', 'conditional', 'Gather', 'A hall with real sound', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Hall cleared afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('audition_setup', 'Audition', 'Sound and a room for the audition round, so it is judged fairly', 'sound_av', { trade: 'sound_av', when: [ans('auditions', 'yes')] }),
      X('tally_board', 'Tally', 'A running score board the audience can see', 'poll', { trade: 'invitation_printing', when: [ans('judges', 'yes')] }),
      X('act_clips', 'Send', 'Each act cut as its own clip and sent to the family', 'film', { trade: 'videography', when: WHEN_FILMED }),
      X('open_mic', 'Open', 'Ten minutes of open mic at the end, for whoever did not enter', 'music', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Sound check every act in the actual hall. An act that has not heard itself through the speakers has not rehearsed.' },
    timeline: {
      before: ['Running order set, with changeover time between acts', 'Every act sound-checked in the real hall', 'Backing tracks collected and tested, not emailed on the day'],
      during: ['Acts in order, host covering changeovers', 'Judging between sections, not at the very end', 'Results, then the closing act'],
      after: ['Clips cut and sent to families', 'Equipment returned', 'Hall cleared'],
    },
    checklist: ['Every act sound-checked', 'Backing tracks collected in advance', 'Running order with changeovers', 'Something for every participant, not only winners'],
  }),

  B('school-debate-competition', 'Argue', 'A quiet hall, a clear microphone and a fair clock.', {
    about: 'The only event in this category where silence is the main requirement. Sound carries a quiet voice to the back; everything else stays out of the way.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('format', 'Format', 'one', { options: [['parliamentary', 'Parliamentary'], ['conventional', 'Conventional debate'], ['elocution', 'Elocution'], ['mun', 'Model UN'], ['quiz', 'A quiz'], ['other', 'Something else']] }),
      Q('teams', 'How many teams or speakers?', 'select', { options: [['8', 'Up to 8'], ['20', 'Up to 20'], ['40', 'Up to 40'], ['80', 'More than 40']] }),
      Q('schools', 'Are other schools taking part?', 'yesno'),
      Q('rooms', 'Do you need more than one room for the rounds?', 'yesno', { optional: true }),
      Q('podium', 'Do you need podiums and a timing bell?', 'yesno'),
      Q('judges', 'A judging panel?', 'yesno'),
      CAMPUS_PLACE, AV_NEED, SEATING_FOR, AWARDS, MINOR_PHOTO, REFRESH, TRANSPORT, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'Microphones that carry a quiet voice to the back of the room'),
      S('event_equipment_rental', 'conditional', 'Set', 'Podiums, a judges’ table, a timing bell, and rooms laid out alike', { when: [some(ans('podium', 'yes'), ans('judges', 'yes'), ans('rooms', 'yes'))] }),
      S('invitation_printing', 'conditional', 'Score', 'Score sheets, name cards, the motion on a board, and certificates', { when: [some(ans('judges', 'yes'), WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Receive', 'A registration desk for the visiting schools and their teachers', { when: [ans('schools', 'yes')] }),
      S('anchor_mc', 'conditional', 'Chair', 'A moderator who can run the sessions to the rules', { when: [ans('format', 'mun', 'parliamentary', 'quiz')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for speakers, judges and audience, kept separate', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Refresh', 'Lunch for the visiting teams, who cannot go home between rounds', { when: WHEN_FED }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies for the teams and a memento for the judges', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Record', 'The rounds and the results, quietly', { when: WHEN_SHOT }),
      S('passenger_transport', 'conditional', 'Bring', 'Transport for the visiting teams', { when: WHEN_RIDE }),
      S('decoration_floral', 'optional', 'Dress', 'A backdrop with the motion and the school names'),
      S('venue', 'conditional', 'Gather', 'A quiet hall, away from the corridor', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('timing_system', 'Time', 'A visible countdown and a bell, so nobody argues about the clock', 'schedule', { trade: 'event_equipment_rental' }),
      X('judge_packs', 'Brief', 'A printed pack for every judge: rules, criteria, score sheets', 'invite', { trade: 'invitation_printing', when: [ans('judges', 'yes')] }),
      X('round_recording', 'Keep', 'The final round recorded, for the archive and for coaching', 'film', { trade: 'videography' }),
      X('motion_reveal', 'Reveal', 'The motion released at a fixed hour, the same for every team', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The clock and the rules are the event. We will not suggest anything that makes the hall louder.' },
    timeline: {
      before: ['Rooms identified and laid out identically', 'Judges briefed on the same criteria', 'Draw published before the day'],
      during: ['Registration, then rounds to the clock', 'Judges scoring on paper, collected each round', 'Results, with the score sheets available'],
      after: ['Certificates to every speaker', 'Rooms reset for class', 'Recordings archived'],
    },
    checklist: ['Rooms laid out alike', 'Timing bell tested', 'Judges briefed on criteria', 'Draw published'],
  }),

  B('school-awards-ceremony', 'Recognise', 'Call every name, and make the walk to the stage feel like it mattered.', {
    about: 'Nothing on this plan matters as much as the name list. A mispronounced name is the only thing anyone will remember going wrong.',
    formats: CAMPUS,
    ask: [
      CLASSES, PARENTS, CAMPUS_PLACE,
      Q('award_count', 'About how many awards?', 'select', { options: [['20', 'Up to 20'], ['60', 'Up to 60'], ['150', 'Up to 150'], ['300', 'More than 150']] }),
      AWARDS, CHIEF_GUEST, STAGE_NEED, AV_NEED, SEATING_FOR, MINOR_PHOTO, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'One mic for the names and a second for the speeches'),
      S('anchor_mc', 'recommended', 'Announce', 'Someone who gets every name right, having practised them'),
      S('decoration_floral', 'recommended', 'Dress', 'A stage that makes the walk up to it count'),
      S('photography', 'recommended', 'Capture', 'Each handshake, each certificate, each child', { unless: UNLESS_PHOTO }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies and medals, engraved and sorted in the order they are called', { when: WHEN_TROPHY }),
      S('invitation_printing', 'conditional', 'Certify', 'Certificates with every name checked against the register', { when: WHEN_PRINTED }),
      S('event_lighting', 'conditional', 'Light', 'Stage light on the handshake, not in the parents’ eyes', { when: [ans('place', 'hall', 'outside')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage with steps up one side and down the other', { when: WHEN_STAGE }),
      S('videography', 'conditional', 'Replay', 'The ceremony filmed, so each family can find their moment', { when: WHEN_FILMED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating by class, so a child can get to the stage quickly', { when: WHEN_SEATS }),
      S('guest_services', 'conditional', 'Seat', 'Ushers who get the right parent to the right row at the right time', { when: WHEN_PARENTS }),
      S('catering_food', 'conditional', 'Refresh', 'Something afterwards, for families who came straight from work', { when: WHEN_FED }),
      S('venue', 'conditional', 'Gather', 'A hall that seats the awarded and their families', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Hall cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('instant_prints', 'Print', 'The handshake photograph printed and handed over before they leave', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('engraving', 'Engrave', 'Each trophy engraved with the name, the award and the year', 'gift', { trade: 'gifts_favours', when: WHEN_TROPHY }),
      X('guest_memento', 'Thank', 'A memento for the chief guest, chosen rather than bought on the day', 'gift', { trade: 'gifts_favours', when: [ans('chief_guest', 'yes')] }),
      X('name_rehearsal', 'Rehearse', 'Every name read aloud once, to the student, before the day', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'The name list is the deliverable. Everything else on this plan is in service of reading it correctly.' },
    timeline: {
      before: ['Name list locked, with pronunciations beside each', 'Trophies engraved and sorted in calling order', 'Stage route walked — up one side, down the other'],
      during: ['Parents seated before the first award', 'Names called in order, photograph at each handshake', 'Chief guest, then close'],
      after: ['Awards for anyone absent, delivered not stored', 'Photographs shared by class', 'Hall cleared'],
    },
    checklist: ['Name list with pronunciations', 'Trophies engraved and in order', 'Photographer briefed on the handshake position', 'Seating planned by class'],
  }),

  B('parent-teacher-gathering', 'Meet', 'Six hundred short conversations, all of them running to time.', {
    about: 'Not a celebration — a logistics problem. Nobody remembers the décor; everybody remembers waiting forty minutes in a corridor.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('families', 'About how many families?', 'select', { options: [['50', 'Up to 50'], ['150', 'Up to 150'], ['400', 'Up to 400'], ['800', 'More than 400']] }),
      CAMPUS_PLACE,
      Q('layout', 'How are the meetings arranged?', 'one', { options: [['classrooms', 'In each classroom'], ['hall', 'All teachers in one hall'], ['slots', 'By appointment slot'], ['open', 'Open house, no slots']] }),
      SIGNAGE,
      Q('waiting', 'Somewhere for families to wait?', 'yesno', { optional: true }),
      Q('childcare', 'Somewhere for younger children while parents meet?', 'yesno', { optional: true }),
      Q('work_display', 'Student work displayed in the rooms?', 'yesno', { optional: true }),
      Q('parking', 'Do you need parking managed?', 'yesno', { optional: true }),
      SEATING_FOR, REFRESH, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Direct', 'Hosts at the gate who send every family to the right room first time'),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Tables and chairs set so queues do not cross each other', { when: [ans('layout', 'hall', 'slots')] }),
      S('invitation_printing', 'recommended', 'Signpost', 'Room numbers, a floor plan at the gate, a slot list on each door', { unless: [ans('signage', 'no')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Chairs in every room, and somewhere to wait that is not a corridor', { when: [some(WHEN_SEATS[0], ans('waiting', 'yes'))] }),
      S('catering_food', 'conditional', 'Sustain', 'Tea and something to eat, running the whole evening', { when: WHEN_FED }),
      S('bar_beverages', 'conditional', 'Hydrate', 'Water points through the building', { when: [ans('refreshments', 'water')] }),
      S('sound_av', 'conditional', 'Call', 'Announcements, so nobody misses their turn', { when: [ans('layout', 'hall', 'open')] }),
      S('valet_parking', 'conditional', 'Park', 'Parking managed so the gate never blocks at pick-up time', { when: [ans('parking', 'yes')] }),
      S('decoration_floral', 'conditional', 'Show', 'Student work put up in every room before parents arrive', { when: [ans('work_display', 'yes')] }),
      S('security_services', 'conditional', 'Order', 'Staff at the gate when four hundred families arrive in one hour', { when: [ans('families', '400', '800')] }),
      S('venue', 'conditional', 'Gather', 'A hall off campus, if the school cannot hold them all', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('slot_boards', 'Queue', 'A printed slot board outside every room, updated as it runs', 'schedule', { trade: 'invitation_printing', when: [ans('layout', 'slots')] }),
      X('creche_corner', 'Mind', 'A supervised corner for younger children while parents meet', 'group', { trade: 'guest_services', when: [ans('childcare', 'yes')] }),
      X('feedback_forms', 'Ask', 'Printed feedback forms, collected at the gate on the way out', 'invite', { trade: 'invitation_printing' }),
      X('tea_counter', 'Pour', 'A tea counter that runs for the whole evening, not the first hour', 'catering_food', { trade: 'catering_food' }),
    ],
    toolkit: { polls: ['date'], note: 'The slot list is the plan. Publish it before the day and the evening runs itself.' },
    timeline: {
      before: ['Slots published to families in advance', 'Rooms numbered and signposted', 'Teachers given their own printed list'],
      during: ['Hosts directing at the gate', 'Slots called and kept to', 'Tea running the whole time, not just at the start'],
      after: ['Feedback collected at the gate', 'Rooms reset for class', 'Families who missed a slot followed up'],
    },
    checklist: ['Slot list published', 'Rooms numbered and signposted', 'Waiting area with seating', 'Tea arranged for the full evening'],
  }),

  B('school-reunion', 'Return', 'Twenty years later, in the same corridor, with the same people.', {
    about: 'Organised by alumni, not by the school, and the thing everyone actually came for is the walk around the old building. The dinner is secondary.',
    formats: ['venue', 'restaurant', 'outdoor'],
    ask: [
      Q('batch', 'Which batch or batches?', 'text', { max: 80, placeholder: 'e.g. Class of 2004' }),
      Q('attending', 'About how many are coming?', 'select', { options: [['30', 'Up to 30'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['400', 'More than 200']] }),
      CAMPUS_PLACE,
      Q('plans', 'What is planned?', 'many', { options: [['tour', 'A walk around the school'], ['programme', 'A short programme'], ['teachers', 'Felicitating old teachers'], ['dinner', 'Dinner'], ['match', 'A match against the current students']] }),
      Q('music', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['none', 'No music']] }),
      Q('badges', 'Name badges with the batch and the old photograph?', 'yesno', { optional: true }),
      Q('photo_wall', 'A display of old photographs?', 'yesno', { optional: true }),
      DIET_ONLY, ALLERGY_ONLY, REFRESH, SEATING_FOR, TRANSPORT, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('photography', 'recommended', 'Assemble', 'The group photograph that is the real reason everyone came', { unless: UNLESS_PHOTO }),
      S('catering_food', 'conditional', 'Feast', 'Dinner for a batch that will not sit down on time', { when: [some(ans('plans', 'dinner'), WHEN_MEAL[0])] }),
      S('invitation_printing', 'conditional', 'Name', 'Badges with the name, the batch and the old school photograph', { when: [ans('badges', 'yes')] }),
      S('decoration_floral', 'conditional', 'Remember', 'A wall of old photographs, hung properly rather than taped up', { when: [ans('photo_wall', 'yes')] }),
      S('dj_music', 'conditional', 'Move', 'A DJ who will play what that batch actually listened to', { when: [ans('music', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the evening', { when: [ans('music', 'live')] }),
      S('sound_av', 'conditional', 'Amplify', 'Mics for the speeches and speakers for the rest', { when: [some(ans('music', 'playlist'), ans('plans', 'programme', 'teachers'))] }),
      S('gifts_favours', 'conditional', 'Honour', 'A memento for every teacher who came back', { when: [ans('plans', 'teachers')] }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to run the programme, since nobody in the batch will', { when: [ans('plans', 'programme')] }),
      S('guest_services', 'conditional', 'Register', 'A desk at the door, sorted by batch', { when: [ans('attending', '200', '400')] }),
      S('event_lighting', 'conditional', 'Glow', 'Lighting for the evening', { when: [ans('music', 'dj', 'live')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating by batch, which is how people want to sit', { when: WHEN_SEATS }),
      S('passenger_transport', 'conditional', 'Arrive', 'Transport for people coming from out of town', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Gather', 'Somewhere with room for everyone who said yes', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('yearbook_reprint', 'Reprint', 'The old yearbook, reprinted for the night', 'album', { trade: 'invitation_printing' }),
      X('canteen_menu', 'Taste', 'The old canteen snacks, made again exactly as they were', 'chef', { trade: 'catering_food' }),
      X('campus_walk', 'Walk', 'A guided walk through the old classrooms, with whoever still teaches', 'map', { experience: true, when: [ans('plans', 'tour')] }),
      X('time_capsule', 'Seal', 'A capsule sealed on the night for the next reunion', 'craft', { experience: true }),
    ],
    toolkit: { polls: ['date', 'venue', 'food'], note: 'Collect the batch list first. A reunion is a contact list with a dinner attached.' },
    timeline: {
      before: ['Batch list built and confirmed', 'Old teachers traced and invited personally', 'Badges printed with the old photographs'],
      during: ['Registration by batch at the door', 'The walk around the school, early, before dinner', 'Group photograph while everyone is still there'],
      after: ['Photographs shared with the whole batch', 'Contact list circulated with consent', 'Next reunion date agreed on the night'],
    },
    checklist: ['Batch list confirmed', 'Old teachers invited', 'Group photograph planned for before dinner', 'Food counted against confirmed replies'],
  }),

  B('school-fundraiser', 'Raise', 'Turn one evening into something the school can actually build.', {
    about: 'Everything is measured against one number. A fundraiser that looks beautiful and raises nothing has failed, so the plan starts with how money is collected.',
    formats: CAMPUS,
    ask: [
      Q('cause', 'What is being raised for?', 'text', { max: 120, placeholder: 'e.g. the new library' }),
      Q('target', 'Is there a target?', 'text', { optional: true, max: 40 }),
      CAMPUS_PLACE,
      Q('methods', 'How is it being raised?', 'many', { options: [['stalls', 'Stalls'], ['auction', 'An auction'], ['performance', 'A ticketed performance'], ['walkathon', 'A walk or a run'], ['donation', 'A donation desk'], ['raffle', 'A raffle']] }),
      Q('tickets', 'Are there tickets?', 'yesno'),
      Q('volunteers', 'Are parents or students volunteering?', 'yesno', { optional: true }),
      VISITORS, STAGE_NEED, AV_NEED, SEATING_FOR, FIRST_AID, REFRESH, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress', 'An entrance, and the cause visible from everywhere on the ground'),
      S('event_equipment_rental', 'conditional', 'Build', 'Stalls, counters, a cash desk and a stage', { when: [some(ans('methods', 'stalls'), WHEN_STAGE[0])] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, receipts, and a board showing the total as it rises', { when: [some(ans('tickets', 'yes'), ans('methods', 'donation', 'raffle'))] }),
      S('sound_av', 'conditional', 'Amplify', 'Sound for the auction and the stage', { when: [some(ans('methods', 'auction', 'performance'), has('av'))] }),
      S('anchor_mc', 'conditional', 'Drive', 'Someone who can work a room for a cause without embarrassing it', { when: [ans('methods', 'auction', 'performance')] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls that raise money rather than cost it', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies over the stalls and seating for the crowd', { when: [some(WHEN_SEATS[0], ans('methods', 'stalls'))] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid on site, and the ground cleared afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('security_services', 'conditional', 'Guard', 'Staff at the gate and beside the cash desk', { when: [ans('visitors', 'public')] }),
      S('guest_services', 'conditional', 'Welcome', 'Hosts at the gate and on the donation desk', { when: WHEN_OPEN }),
      S('gifts_favours', 'conditional', 'Reward', 'Raffle prizes and hampers worth entering for', { when: [ans('methods', 'raffle')] }),
      S('photography', 'conditional', 'Show', 'Photographs the school can use when it thanks the donors', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Power', 'Power across the ground for the stalls and the sound', { when: WHEN_ONGROUND }),
      S('venue', 'conditional', 'Gather', 'A venue outside school, if more will come than the ground holds', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('donation_board', 'Show', 'A board showing the total rising through the evening', 'poll', { trade: 'invitation_printing' }),
      X('silent_auction', 'Bid', 'A silent auction table running alongside everything else', 'gift', { trade: 'event_equipment_rental', when: [ans('methods', 'auction')] }),
      X('sponsor_wall', 'Credit', 'A wall naming every sponsor and donor', 'invite', { trade: 'decoration_floral' }),
      X('thank_you_round', 'Thank', 'A written thank-you to every donor within the week', 'phone', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Every rupee spent on this plan is a rupee not raised. We will show the estimate against your target before you commit.' },
    timeline: {
      before: ['Target set and published', 'Collection method decided — who takes money, where, and how it is counted', 'Volunteers rostered to stalls by name'],
      during: ['Cash desk staffed and watched all evening', 'Total updated publicly as it rises', 'Auction and raffle at the fullest hour, not the last'],
      after: ['Money counted by two people and banked the same night', 'Total announced to everyone who came', 'Donors thanked in writing'],
    },
    checklist: ['Target published', 'Cash handling agreed and staffed', 'Volunteers rostered', 'Costs checked against the target'],
  }),

  B('school-carnival', 'Thrill', 'A ground full of stalls, noise and children who have been waiting all term.', {
    about: 'A fundraiser is about a number; a carnival is about a crowd. Several hundred children moving between stalls is a safety plan first and a party second.',
    formats: ['outdoor', 'venue'],
    ask: [
      CLASSES, CAMPUS_PLACE,
      Q('attractions', 'What is on the ground?', 'many', { options: [['games', 'Game stalls'], ['food', 'Food stalls'], ['rides', 'Rides or inflatables'], ['performers', 'Performers'], ['stage', 'A stage programme'], ['market', 'A craft or book market']] }),
      Q('stall_count', 'About how many stalls?', 'select', { options: [['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'Up to 50'], ['80', 'More than 50']] }),
      VISITORS,
      Q('tickets', 'Are there entry or stall tickets?', 'yesno'),
      Q('crowd', 'About how many people across the day?', 'select', { options: [['200', 'Up to 200'], ['600', 'Up to 600'], ['1500', 'Up to 1500'], ['3000', 'More than 1500']] }),
      FIRST_AID, STAGE_NEED, AV_NEED, SEATING_FOR, REFRESH, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'Stalls, counters, game frames and a stage, laid out with room to walk'),
      S('tent_furniture', 'recommended', 'Shelter', 'Canopies over every stall and seating where people eat'),
      S('safety_facilities', 'recommended', 'Protect', 'First aid, washrooms and the ground cleared at the end'),
      S('catering_food', 'conditional', 'Feed', 'Food stalls, with the allergy list in every kitchen', { when: [some(ans('attractions', 'food'), WHEN_FED[0])] }),
      S('sound_av', 'conditional', 'Amplify', 'Sound across the ground, and a mic for lost children', { when: [some(ans('attractions', 'stage', 'performers'), has('av'))] }),
      S('live_entertainment', 'conditional', 'Amaze', 'Performers moving through the crowd, not only on the stage', { when: [ans('attractions', 'performers')] }),
      S('security_services', 'conditional', 'Guard', 'Staff on the gates and at the cash points', { when: [some(ans('visitors', 'public'), ans('crowd', '1500', '3000'))] }),
      S('power_cooling', 'conditional', 'Power', 'Distributed power for stalls, rides and sound', { when: [some(WHEN_ONGROUND[0], ans('attractions', 'rides'))] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Entry tickets, stall coupons and a ground map', { when: [ans('tickets', 'yes')] }),
      S('decoration_floral', 'recommended', 'Colour', 'Bunting, arches and a ground that looks like a carnival from the gate'),
      S('guest_services', 'conditional', 'Marshal', 'Hosts on the ground, and a named point for lost children', { when: WHEN_OPEN }),
      S('event_lighting', 'conditional', 'Light', 'Lighting if it runs past dusk', { when: [ans('attractions', 'stage', 'rides')] }),
      S('photography', 'conditional', 'Capture', 'The day across the whole ground, not just the stage', { when: WHEN_SHOT }),
      S('venue', 'conditional', 'Ground', 'A ground big enough for the stalls and the crowd', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('lost_child_point', 'Reunite', 'A staffed, signposted point for lost children, named on the map', 'guest_services', { trade: 'guest_services' }),
      X('ground_map', 'Orient', 'A printed ground map at every gate', 'map', { trade: 'invitation_printing' }),
      X('inflatables', 'Bounce', 'Inflatables with their own supervised, fenced area', 'game', { trade: 'event_equipment_rental', when: [ans('attractions', 'rides')] }),
      X('token_system', 'Simplify', 'One token currency across every stall, so no stall handles cash', 'budget', { trade: 'invitation_printing', when: [ans('tickets', 'yes')] }),
    ],
    toolkit: { guardian: true, polls: ['date'], note: 'A lost-child point, a first-aid point and a water point are not extras at a children’s carnival. We will keep saying so.' },
    timeline: {
      before: ['Ground plan with walkways, not just stall positions', 'Lost-child and first-aid points placed and signposted', 'Every stall’s power need listed before the generator is sized'],
      during: ['Gates staffed, map at each one', 'Announcements for lost children, immediately', 'Cash or tokens collected centrally through the day'],
      after: ['Ground cleared the same evening', 'Takings counted by two people', 'Equipment and rides checked back in'],
    },
    checklist: ['Ground plan with walkways', 'Lost-child point staffed and signposted', 'First aid on the ground', 'Power sized against every stall'],
  }),

  B('career-day', 'Choose', 'Put a sixteen-year-old in front of someone who actually does the job.', {
    about: 'The value is entirely in who turns up. Everything on this plan exists to make the visitors’ time easy and the students’ questions possible.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('visitor_kind', 'Who is coming in?', 'many', { options: [['colleges', 'Colleges'], ['employers', 'Employers'], ['alumni', 'Alumni'], ['counsellors', 'Career counsellors'], ['parents', 'Parents from different professions']] }),
      Q('stalls', 'How many stalls or desks?', 'select', { options: [['6', 'Up to 6'], ['15', 'Up to 15'], ['30', 'Up to 30'], ['60', 'More than 30']] }),
      Q('format', 'How is the day run?', 'one', { options: [['stalls', 'Stalls the students walk round'], ['talks', 'Talks in a hall'], ['both', 'Talks and stalls'], ['oneone', 'One-to-one sessions']] }),
      CAMPUS_PLACE, SIGNAGE, AV_NEED, SEATING_FOR, REFRESH, MINOR_PHOTO, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'conditional', 'Set', 'Desks, boards and a stall for every visitor, numbered', { when: [ans('format', 'stalls', 'both', 'oneone')] }),
      S('guest_services', 'recommended', 'Host', 'A student host for every visitor, from the gate to the desk'),
      S('sound_av', 'conditional', 'Project', 'Mics, a projector and a screen for the talks', { when: [some(ans('format', 'talks', 'both'), has('av'))] }),
      S('invitation_printing', 'conditional', 'Signpost', 'Desk numbers, a floor plan and a printed schedule of talks', { when: [ans('signage', 'yes')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at every desk and in the hall for the talks', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Host', 'Lunch and tea for visitors who gave up a working day', { when: WHEN_FED }),
      S('photography', 'conditional', 'Record', 'The day, for the school’s own record and next year’s invitation', { when: WHEN_SHOT }),
      S('decoration_floral', 'optional', 'Dress', 'A welcome banner and a tidy entrance for visiting employers'),
      S('valet_parking', 'optional', 'Park', 'Parking kept clear for the visitors arriving through the morning'),
      S('venue', 'conditional', 'Gather', 'A hall off campus, if more are coming than the school can hold', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('visitor_packs', 'Brief', 'A pack for each visitor: schedule, students’ year group, what to expect', 'invite', { trade: 'invitation_printing' }),
      X('question_prep', 'Prepare', 'A session where students write their questions before the day', 'schedule', { experience: true }),
      X('talk_recording', 'Keep', 'Talks recorded for the students who could not attend', 'film', { trade: 'videography' }),
      X('follow_up_list', 'Connect', 'A consented contact list so a student can follow up afterwards', 'phone', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Confirm every visitor twice. A career day with four empty desks is worse than a smaller one that is full.' },
    timeline: {
      before: ['Visitors confirmed twice, with arrival times', 'Desks numbered and allocated', 'Students briefed to prepare questions'],
      during: ['Visitors met at the gate and walked to their desk', 'Talks to schedule, stalls open throughout', 'Lunch for visitors, properly hosted'],
      after: ['Thank-you to every visitor within the week', 'Contact list shared, with consent', 'Rooms reset'],
    },
    checklist: ['Visitors confirmed twice', 'Desks numbered and allocated', 'Student hosts assigned by name', 'Lunch counted for visitors'],
  }),

  B('school-project-exhibition', 'Present', 'Every subject, every class, and one morning where the work is the point.', {
    about: 'Broader than the science exhibition and quieter than it: paper, models and posters rather than power and flame. The hard part is scheduling which class presents when.',
    formats: CAMPUS,
    ask: [
      CLASSES,
      Q('subjects', 'Which subjects are exhibiting?', 'many', { options: [['science', 'Science'], ['maths', 'Maths'], ['social', 'Social studies'], ['languages', 'Languages'], ['computing', 'Computing'], ['arts', 'Arts'], ['all', 'Everything']] }),
      Q('projects', 'About how many projects?', 'select', { options: [['30', 'Up to 30'], ['80', 'Up to 80'], ['150', 'Up to 150'], ['300', 'More than 150']] }),
      CAMPUS_PLACE,
      Q('display', 'What does each project need?', 'many', { options: [['tables', 'A table'], ['boards', 'A display board'], ['power', 'A power point'], ['screen', 'A screen or monitor']] }),
      Q('slots', 'Do classes present in slots?', 'yesno', { optional: true }),
      Q('judging', 'Is it being judged?', 'yesno'),
      VISITORS, SIGNAGE, AWARDS, SEATING_FOR, MINOR_PHOTO, REFRESH, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Set', 'Tables, boards and monitors — one numbered station per project'),
      S('invitation_printing', 'conditional', 'Label', 'Station labels, a floor plan, a slot schedule and certificates', { when: [some(ans('signage', 'yes'), ans('slots', 'yes'), WHEN_PRINTED[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power where a project needs a screen or a model running', { when: [ans('display', 'power', 'screen')] }),
      S('guest_services', 'conditional', 'Guide', 'Hosts to move visitors round in slot order', { when: WHEN_OPEN }),
      S('photography', 'conditional', 'Record', 'Every project with its makers, for the school’s record', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Honour', 'Prizes by subject, so one subject does not take everything', { when: WHEN_TROPHY }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for judges and for visitors between rooms', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Refresh', 'Food for the children who are standing at their stations all day', { when: WHEN_FED }),
      S('sound_av', 'conditional', 'Call', 'Announcements to move the slots along', { when: [ans('slots', 'yes')] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the boards in rooms that do not have enough', { when: [ans('place', 'rooms', 'hall')] }),
      S('decoration_floral', 'optional', 'Dress', 'An entrance that tells visitors where to start'),
      S('venue', 'conditional', 'Gather', 'A hall large enough for every station', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('station_labels', 'Number', 'A printed label and QR at every station', 'invite', { trade: 'invitation_printing' }),
      X('slot_schedule', 'Sequence', 'A slot schedule by class, published before the day', 'schedule', { trade: 'invitation_printing', when: [ans('slots', 'yes')] }),
      X('judges_pack', 'Judge', 'Score sheets by subject, and a briefing so judging is consistent', 'poll', { trade: 'invitation_printing', when: [ans('judging', 'yes')] }),
      X('parent_window', 'Open', 'An hour set aside purely for parents, after the judging', 'group', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Number every station before the day. Half the trouble at an exhibition is nobody knowing where a project is meant to be.' },
    timeline: {
      before: ['Station list by project, numbered and allocated', 'Slot schedule published to classes', 'Power needs listed per station'],
      during: ['Children at stations before visitors arrive', 'Judging round, then the open round', 'Announcements to keep slots moving'],
      after: ['Projects returned to the children', 'Certificates by subject', 'Rooms reset for class'],
    },
    checklist: ['Stations numbered and allocated', 'Slot schedule published', 'Power listed per station', 'Prizes split by subject'],
  }),

]

export const SCHOOL_BLUEPRINT = Object.fromEntries(SCHOOL_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(SCHOOL_BLUEPRINTS, 'school')
