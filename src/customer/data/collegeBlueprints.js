/**
 * College & University Events — one blueprint per occasion.
 *
 * Twenty occasions, run by students rather than staff, at a scale no
 * school event reaches: a mid-sized fest puts more people on a ground
 * in one evening than a school sees in a year. What changes:
 *
 *   · Crowd comes first. Who may attend — own college, other colleges,
 *     or anyone — decides the gate, the security, the first aid and
 *     the permissions, so it is asked before anything else.
 *   · Nothing assumes alcohol. A college event is on a campus until
 *     the customer says otherwise, and even off campus a bar is a
 *     licensed thing the venue holds, never something we assume.
 *   · Amplified sound late at night is restricted almost everywhere in
 *     India. We ask whether it runs late and plan for the rule rather
 *     than discovering it at 10 pm.
 *   · Permissions are the organiser's, and we say so. We never claim a
 *     gathering is approved, and "we need help with this" is a real
 *     answer that puts it on the plan.
 *   · The organiser is usually a student committee that changes every
 *     year, so the timeline and the checklist are written to be handed
 *     over, not remembered.
 *
 * Five occasions here share the "collegeFest" template in the
 * catalogue and share nothing else: a technical fest is power and
 * bandwidth, a cultural fest is stage and green rooms, an intercollege
 * competition is registration and fairness, a youth festival is a
 * week of contingents, and the main fest is all of it at once.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  CAMPUS_PLACE, CHIEF_GUEST, STAGE_NEED, AV_NEED, REFRESH, AWARDS,
  PHOTOS, DIET_ONLY, ALLERGY_ONLY, THEME, DRESS_CODE,
  WHEN_STAGE, WHEN_AV, WHEN_SEATS, WHEN_FED, WHEN_MEAL, WHEN_OFFSITE, WHEN_ONGROUND,
  WHEN_PRINTED, WHEN_TROPHY, WHEN_RIDE, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a campus event asks ───────────────────────────── */

const ORGANISER = Q('organiser', 'Who is organising it?', 'one', {
  options: [['committee', 'A student committee'], ['department', 'A department'], ['college', 'The college administration'], ['club', 'A student club']],
})

/** Asked first on anything with a crowd: it decides most of the plan. */
const OPEN_TO = Q('open_to', 'Who can attend?', 'one', {
  options: [['own', 'Our college only'], ['colleges', 'Other colleges too'], ['public', 'Open to anyone']],
  help: 'Anything beyond your own campus changes the gate, the security and the permissions.',
})
const CROWD = Q('crowd', 'About how many people are expected?', 'select', {
  options: [['100', 'Up to 100'], ['500', 'Up to 500'], ['2000', 'Up to 2000'], ['5000', 'Up to 5000'], ['10000', 'More than 5000']],
})
const FEST_DAYS = Q('days', 'How many days?', 'select', { options: [['1', 'One day'], ['2', 'Two days'], ['3', 'Three days'], ['5', 'Five days or more']] })
const SPONSORS = Q('sponsors', 'Are there sponsors?', 'yesno', { optional: true })

/** The organiser's to get, not ours to assume. */
const PERMITS = Q('permits', 'Has the college and the local authority approved it?', 'one', {
  optional: true, when: [ans('open_to', 'colleges', 'public')],
  options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
  help: 'We never treat a gathering as approved. If this is not settled, it belongs on the plan.',
})
const LATE = Q('late', 'Does it run past 10 pm?', 'yesno', {
  optional: true,
  help: 'Amplified sound late at night is restricted in most places. We plan for the rule rather than meet it on the night.',
})
const GUARD = Q('security', 'Do you need security and crowd management?', 'yesno', { optional: true })
const AID = Q('first_aid', 'Do you need first aid or an ambulance on standby?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const TICKETS = Q('tickets', 'Are there tickets or passes?', 'yesno', { optional: true })
const SEATS = Q('seating', 'Do you need seating brought in?', 'yesno', { optional: true })
const RIDES = Q('transport', 'Do participants or guests need transport arranged?', 'yesno', { optional: true })
const REG_DESK = Q('registration', 'Is there a registration desk?', 'yesno', { optional: true })
const ACCOM = Q('accommodation', 'Do visiting participants need somewhere to stay?', 'yesno', {
  optional: true, when: [ans('open_to', 'colleges', 'public')],
})
const JUDGES = Q('judges', 'Is there a judging panel?', 'yesno')
const VIDEO = Q('video', 'A film of the event?', 'yesno', { optional: true, when: [notAns('photos', 'no')] })

const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILMED = [ans('video', 'yes')]
const WHEN_VISITING = [ans('open_to', 'colleges', 'public')]
const WHEN_PUBLIC = [ans('open_to', 'public')]
const WHEN_BIG = [ans('crowd', '2000', '5000', '10000')]
const WHEN_SPONSOR = [ans('sponsors', 'yes')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_AID = [ans('first_aid', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_LATE = [ans('late', 'yes')]
const WHEN_JUDGED = [ans('judges', 'yes')]
const WHEN_DESK = [some(ans('registration', 'yes'), ans('tickets', 'yes'))]
const WHEN_REG = [ans('registration', 'yes')]

const CAMPUS = ['venue', 'outdoor']

export const COLLEGE_BLUEPRINTS = [

  B('college-fest', 'Legendary', 'The three days the whole campus plans the rest of the year around.', {
    about: 'Every other occasion in this category is one part of this one. Competitions, stalls, sponsors and a headline night, run by students who have never run anything this size before — which is exactly why the plan is written to be handed over.',
    formats: CAMPUS,
    ask: [
      ORGANISER, OPEN_TO, CROWD, FEST_DAYS, CAMPUS_PLACE,
      Q('parts', 'What is in the fest?', 'many', { options: [['competitions', 'Competitions'], ['pronight', 'A headline night'], ['stalls', 'Food and shopping stalls'], ['workshops', 'Workshops'], ['exhibits', 'Exhibitions'], ['sports', 'Sports']] }),
      SPONSORS, PERMITS, TICKETS, LATE,
      STAGE_NEED, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, VIDEO, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'Line arrays, monitors and mics across every stage'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting, and enough light to walk the ground safely'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stages, barricades, trussing and stalls'),
      S('security_services', 'conditional', 'Control', 'Trained crowd management at every gate and in front of stage', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_PUBLIC[0])] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid, washrooms and the ground cleared each night', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Silent generators sized for the stage, the stalls and the lights', { when: [some(WHEN_ONGROUND[0], ans('parts', 'stalls', 'pronight'))] }),
      S('live_entertainment', 'conditional', 'Headline', 'The act the fest is remembered for', { when: [ans('parts', 'pronight')] }),
      S('anchor_mc', 'conditional', 'Host', 'Hosts who can hold a ground between acts', { when: [ans('parts', 'competitions', 'pronight')] }),
      S('catering_food', 'conditional', 'Feed', 'Stalls and a crew kitchen, which is the one everyone forgets', { when: [ans('parts', 'stalls')] }),
      S('decoration_floral', 'recommended', 'Brand', 'An entrance, a theme and the fest’s name visible from the road'),
      S('invitation_printing', 'conditional', 'Pass', 'Passes, wristbands, maps and the sponsor branding', { when: [some(ans('tickets', 'yes'), WHEN_SPONSOR[0], WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Receive', 'Desks for visiting colleges, sponsors and the press', { when: WHEN_VISITING }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies, green rooms and seating across the ground', { when: [some(WHEN_SEATS[0], ans('parts', 'stalls', 'workshops'))] }),
      S('photography', 'conditional', 'Capture', 'Every day of it, for the sponsors and for next year', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'An aftermovie, which is how the next sponsor is found', { when: WHEN_FILMED }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies, medals and sponsor giveaways', { when: WHEN_TROPHY }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'One crew across three days, three stages and the load-out', { when: [ans('days', '2', '3', '5')] }),
      S('venue', 'conditional', 'Gather', 'A ground or an arena off campus', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('sponsor_branding', 'Credit', 'Sponsor branding on every backdrop, pass and banner', 'invite', { trade: 'decoration_floral', when: WHEN_SPONSOR }),
      X('aftermovie', 'Relive', 'A cut aftermovie, out within the week while people still care', 'film', { trade: 'videography' }),
      X('ground_map', 'Orient', 'A printed and digital ground map at every gate', 'map', { trade: 'invitation_printing' }),
      X('crew_kitchen', 'Sustain', 'Food and water for the organising crew, who work all three days', 'chef', { trade: 'catering_food' }),
      X('handover_file', 'Hand over', 'Everything written down for next year’s committee', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Permissions, security and first aid are the organiser’s responsibility. We will keep them on the plan and never describe a gathering as approved.' },
    timeline: {
      before: ['Permissions confirmed in writing before anything is booked', 'Ground plan with gates, exits and crowd flow', 'Sponsor deliverables listed against what is actually being printed'],
      during: ['Gates staffed from before the first entry', 'Stage times kept, because one delay runs into the curfew', 'First aid and security visible, not on call'],
      after: ['Ground cleared the same night, every night', 'Sponsor report with photographs', 'Handover file written while it is fresh'],
    },
    checklist: ['Permissions in writing', 'Ground plan with exits and crowd flow', 'Power sized for every stage and stall', 'Security and first aid confirmed'],
  }),

  B('freshers-party', 'Arrival', 'The night the first years stop being first years.', {
    about: 'Organised by seniors, judged by juniors, and watched by the administration. It is still a campus event: nothing here assumes a bar.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('batch_size', 'How many first years?', 'select', { options: [['60', 'Up to 60'], ['150', 'Up to 150'], ['400', 'Up to 400'], ['800', 'More than 400']] }),
      CAMPUS_PLACE,
      THEME('Is there a theme?', [['none', 'No theme'], ['retro', 'Retro'], ['masquerade', 'Masquerade'], ['neon', 'Neon'], ['formal', 'Black tie'], ['other', 'Something else']]),
      Q('music', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['none', 'No music']] }),
      Q('titles', 'Are there titles — Mr and Ms Fresher, and the rest?', 'yesno'),
      Q('drinks', 'Drinks', 'one', { options: [['soft', 'Soft drinks and mocktails'], ['none', 'Nothing beyond water']], help: 'A campus event. If you are off campus and want a licensed bar, the venue holds the licence, not us.' }),
      STAGE_NEED, AV_NEED, LATE, SEATS, DRESS_CODE, REFRESH, PHOTOS, CLEAN,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Transform', 'A hall that looks nothing like it does on a Tuesday'),
      S('photography', 'recommended', 'Capture', 'The first photographs this batch will have of each other', { unless: UNLESS_PHOTO }),
      S('dj_music', 'conditional', 'Move', 'A DJ who reads a room of eighteen-year-olds', { when: [ans('music', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the night', { when: [ans('music', 'live')] }),
      S('sound_av', 'conditional', 'Amplify', 'Sound and mics for the titles and the playlist', { when: [some(ans('music', 'playlist'), ans('titles', 'yes'), has('av'))] }),
      S('event_lighting', 'conditional', 'Glow', 'Lighting that makes a college hall feel like a venue', { when: [ans('music', 'dj', 'live')] }),
      S('anchor_mc', 'conditional', 'Host', 'Someone to run the titles without it dragging', { when: [ans('titles', 'yes')] }),
      S('catering_food', 'conditional', 'Feed', 'Dinner or a snack counter for the whole batch', { when: WHEN_FED }),
      S('bar_beverages', 'conditional', 'Sip', 'A mocktail and cold-drinks counter, staffed', { when: [ans('drinks', 'soft')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, a ramp for the titles and a dance floor', { when: WHEN_STAGE }),
      S('gifts_favours', 'conditional', 'Crown', 'Sashes, crowns and a memento for the title winners', { when: [ans('titles', 'yes')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating around the floor, so the shy ones have somewhere to be', { when: WHEN_SEATS }),
      S('security_services', 'conditional', 'Watch', 'Staff at the door for a batch of four hundred', { when: [ans('batch_size', '400', '800')] }),
      S('venue', 'conditional', 'Gather', 'Somewhere off campus with room and a licence to run late', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned before classes the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('photo_booth', 'Pose', 'A booth with props, printing on the spot', 'booth', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('title_ramp', 'Walk', 'A lit ramp for the titles round', 'event_equipment_rental', { trade: 'event_equipment_rental', when: [ans('titles', 'yes')] }),
      X('intro_reel', 'Introduce', 'A reel of every first year, played before the titles', 'film', { trade: 'videography' }),
      X('senior_pairing', 'Connect', 'Each first year paired with a senior before the night', 'group', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'No alcohol is assumed at a campus event. Ragging in any form is illegal in India; a welcome that singles anyone out is not a tradition we will help plan.' },
    timeline: {
      before: ['Theme and dress code out early enough to be fun', 'Titles round planned so it cannot become an ordeal', 'Sound and lights tested in the hall'],
      during: ['Arrivals photographed', 'Titles, then the floor opens', 'Close on time, especially if the curfew applies'],
      after: ['Hall cleared the same night', 'Photographs shared with the batch', 'Equipment returned'],
    },
    checklist: ['Permission from the administration', 'Titles round planned and refereed', 'Sound tested in the room', 'Food counted for the full batch'],
  }),

  B('college-farewell', 'Sendoff', 'The last night the batch is a batch.', {
    about: 'Different from a freshers’ party in one way that matters: everyone in the room already knows each other, so the evening is about the speeches, not the icebreakers.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('batch_size', 'How many are graduating?', 'select', { options: [['60', 'Up to 60'], ['150', 'Up to 150'], ['400', 'Up to 400'], ['800', 'More than 400']] }),
      CAMPUS_PLACE,
      Q('parts', 'What is planned?', 'many', { options: [['speeches', 'Speeches'], ['titles', 'Titles and awards'], ['roast', 'A roast or skit'], ['slideshow', 'A slideshow'], ['dance', 'Dancing'], ['dinner', 'Dinner']] }),
      Q('music', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['none', 'No music']] }),
      Q('faculty', 'Are faculty invited?', 'yesno', { optional: true }),
      STAGE_NEED, AV_NEED, LATE, SEATS, DRESS_CODE, REFRESH, PHOTOS, VIDEO, CLEAN,
    ],
    plan: [
      S('photography', 'recommended', 'Keep', 'The last photographs of the batch, together, in one place', { unless: UNLESS_PHOTO }),
      S('decoration_floral', 'recommended', 'Dress', 'A room worth the last night in it'),
      S('sound_av', 'recommended', 'Carry', 'Mics for the speeches and a screen for the slideshow'),
      S('dj_music', 'conditional', 'Move', 'A DJ for after the speeches', { when: [ans('music', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the evening', { when: [ans('music', 'live')] }),
      S('anchor_mc', 'conditional', 'Run', 'Someone to keep the speeches from running to midnight', { when: [ans('parts', 'speeches', 'titles', 'roast')] }),
      S('catering_food', 'conditional', 'Feast', 'Dinner for the batch and the faculty', { when: [some(ans('parts', 'dinner'), WHEN_FED[0])] }),
      S('gifts_favours', 'conditional', 'Mark', 'A memento for every graduand, and for the faculty', { when: [some(ans('parts', 'titles'), ans('faculty', 'yes'))] }),
      S('event_lighting', 'conditional', 'Glow', 'Lighting for the evening and the floor', { when: [ans('music', 'dj', 'live')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, a screen and a dance floor', { when: WHEN_STAGE }),
      S('videography', 'conditional', 'Film', 'The speeches, filmed, because nobody remembers them after', { when: WHEN_FILMED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the whole batch, faced at the stage', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Gather', 'Somewhere off campus with room and a late licence', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('years_slideshow', 'Rewind', 'Four years in eight minutes, cut from everyone’s photographs', 'film', { trade: 'sound_av', when: [ans('parts', 'slideshow')] }),
      X('batch_portrait', 'Assemble', 'One properly lit photograph of the entire batch', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('faculty_mementos', 'Thank', 'A named memento for each faculty member who taught them', 'gift', { trade: 'gifts_favours', when: [ans('faculty', 'yes')] }),
      X('message_book', 'Write', 'A book the whole batch signs before they leave', 'album', { experience: true }),
    ],
    toolkit: { polls: ['date', 'music'], note: 'Nothing here assumes a bar. A roast is funny until it is about one person; plan it so it is not.' },
    timeline: {
      before: ['Speech list agreed, with time limits that will be kept', 'Slideshow collected from the whole batch, not three people', 'Mementos named and counted'],
      during: ['Dinner, then speeches, then the floor', 'Batch photograph early, while everyone is present', 'Close on time if the curfew applies'],
      after: ['Photographs and the film shared with the batch', 'Contact list circulated, with consent', 'Hall cleared'],
    },
    checklist: ['Speech list with time limits', 'Slideshow collected', 'Mementos named and counted', 'Batch photograph planned early'],
  }),

  B('convocation-ceremony', 'Confer', 'The one ceremony a university does exactly the same way every year, and must.', {
    about: 'Formal, processional and governed by the university’s own statutes. Our job is the hall, the robes, the sound and the order — never the protocol, which the university owns.',
    formats: CAMPUS,
    ask: [
      Q('graduands', 'How many are graduating?', 'select', { options: [['100', 'Up to 100'], ['400', 'Up to 400'], ['1000', 'Up to 1000'], ['3000', 'More than 1000']] }),
      Q('guests_each', 'How many guests may each graduand bring?', 'select', { options: [['0', 'None'], ['1', 'One'], ['2', 'Two'], ['open', 'No limit']] }),
      CAMPUS_PLACE,
      Q('robes', 'Academic robes and hoods?', 'one', { options: [['rent', 'Please arrange them'], ['have', 'The university has them'], ['none', 'No robes']] }),
      Q('procession', 'Is there an academic procession?', 'yesno'),
      CHIEF_GUEST, STAGE_NEED, AV_NEED, SEATS, AWARDS,
      Q('stream', 'A live stream for families who cannot attend?', 'yesno', { optional: true }),
      GUARD, PHOTOS, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Carry', 'A mic that makes a thousand names audible at the back'),
      S('event_equipment_rental', 'recommended', 'Set', 'The dais, the processional route and seating blocks by faculty'),
      S('photography', 'recommended', 'Record', 'The dais, the procession and every graduand on stage', { unless: UNLESS_PHOTO }),
      S('event_materials_supplier', 'conditional', 'Robe', 'Robes and hoods, sized to a list and issued by faculty', { when: [ans('robes', 'rent')] }),
      S('decoration_floral', 'recommended', 'Dignify', 'A dais that looks like the occasion, not like a conference'),
      S('invitation_printing', 'conditional', 'Programme', 'The order of proceedings, the name list and the degree certificates', { when: [some(WHEN_PRINTED[0], ans('procession', 'yes'))] }),
      S('guest_services', 'recommended', 'Seat', 'Ushers to seat graduands by faculty and families by block'),
      S('videography', 'conditional', 'Stream', 'Filmed, and streamed for the families who could not come', { when: [some(WHEN_FILMED[0], ans('stream', 'yes'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for graduands, faculty and every guest', { when: WHEN_SEATS }),
      S('event_lighting', 'conditional', 'Light', 'Even light on the dais for the photographs and the stream', { when: [ans('place', 'hall', 'outside')] }),
      S('security_services', 'conditional', 'Control', 'Gate control, because a convocation is a ticketed building', { when: [some(WHEN_GUARD[0], ans('graduands', '1000', '3000'))] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments afterwards, counted for graduands and guests', { when: WHEN_FED }),
      S('gifts_favours', 'conditional', 'Honour', 'Medals, and a memento for the chief guest', { when: WHEN_TROPHY }),
      S('power_cooling', 'conditional', 'Power', 'Backup power, because this ceremony cannot pause', { when: [some(WHEN_ONGROUND[0], ans('graduands', '1000', '3000'))] }),
      S('venue', 'conditional', 'Gather', 'A hall that seats the cohort and their families', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Hall cleared afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('name_pronunciation', 'Rehearse', 'Every name recorded by the graduand and given to the reader', 'phone', { experience: true }),
      X('family_stream', 'Share', 'A public stream link for families abroad', 'film', { trade: 'videography', when: [ans('stream', 'yes')] }),
      X('robe_desk', 'Issue', 'A robing desk by faculty, with a return desk after', 'guest_services', { trade: 'guest_services', when: [ans('robes', 'rent')] }),
      X('stage_prints', 'Print', 'The on-stage photograph printed and handed over the same day', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'The order of proceedings belongs to the university. We arrange the hall around it and never suggest changing it.' },
    timeline: {
      before: ['Name list and pronunciations from the registry', 'Robes sized and issued by faculty, not in one queue', 'Processional route walked with the marshals'],
      during: ['Procession, then conferral in the published order', 'A photograph of each graduand on the dais', 'Stream running for families who could not travel'],
      after: ['Robes returned and counted', 'Certificates for anyone absent, through the registry', 'Hall cleared'],
    },
    checklist: ['Name list from the registry, with pronunciations', 'Robes sized and issue plan by faculty', 'Seating blocks mapped', 'Backup power confirmed'],
  }),

  B('graduation-party', 'Release', 'The night after the ceremony, when the gowns come off.', {
    about: 'The informal half of a convocation, and usually off campus. This is the one occasion in this category where a licensed bar is a sensible question to ask — and it is still a question.',
    formats: ['venue', 'restaurant', 'outdoor'],
    ask: [
      Q('group_size', 'How many are coming?', 'select', { options: [['30', 'Up to 30'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      CAMPUS_PLACE,
      Q('style', 'What kind of night?', 'one', { options: [['dinner', 'A sit-down dinner'], ['club', 'A club night'], ['lawn', 'A lawn or rooftop party'], ['casual', 'Something casual']] }),
      Q('music', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['none', 'No music']] }),
      Q('drinks', 'Drinks', 'one', {
        options: [['soft', 'Soft drinks and mocktails'], ['bar', 'A licensed bar at the venue'], ['own', 'The venue handles it'], ['none', 'Nothing needed']],
        help: 'A bar is the venue’s licence and the legal drinking age applies. We never assume one and never arrange one ourselves.',
      }),
      DIET_ONLY, ALLERGY_ONLY, THEME('A theme?', [['none', 'No theme'], ['formal', 'Black tie'], ['white', 'All white'], ['retro', 'Retro'], ['other', 'Something else']]),
      DRESS_CODE, LATE, SEATS, PHOTOS, RIDES, REFRESH, CLEAN,
    ],
    plan: [
      S('venue', 'conditional', 'Find', 'A place that will take the whole group and let it run late', { when: WHEN_OFFSITE }),
      S('photography', 'recommended', 'Keep', 'The photographs from the night everyone actually remembers', { unless: UNLESS_PHOTO }),
      S('catering_food', 'conditional', 'Feast', 'Dinner or a counter, to the group’s food choices', { when: [some(ans('style', 'dinner'), WHEN_FED[0])] }),
      S('dj_music', 'conditional', 'Move', 'A DJ for the night', { when: [ans('music', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band or an act for the evening', { when: [ans('music', 'live')] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, set up and staffed as you chose', { when: [ans('drinks', 'soft', 'bar')] }),
      S('decoration_floral', 'conditional', 'Dress', 'The theme, built into the room rather than stuck on it', { when: [notAns('theme', 'none')] }),
      S('event_lighting', 'conditional', 'Glow', 'Lighting for the evening', { when: [ans('music', 'dj', 'live')] }),
      S('sound_av', 'conditional', 'Amplify', 'Speakers and a mic for whoever insists on a speech', { when: [ans('music', 'playlist')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating and a lawn setup', { when: [some(WHEN_SEATS[0], ans('style', 'lawn'))] }),
      S('passenger_transport', 'conditional', 'Arrive', 'Transport there and back, arranged in advance', { when: WHEN_RIDE }),
      S('cake_desserts', 'optional', 'Delight', 'A cake for the batch to cut'),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('photo_wall', 'Pose', 'A lit wall with the batch year on it', 'booth', { trade: 'decoration_floral' }),
      X('late_transport', 'Home', 'Transport booked for the end of the night, before it starts', 'bus', { trade: 'passenger_transport' }),
      X('group_portrait', 'Assemble', 'One group photograph early, before anyone disappears', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('playlist_poll', 'Choose', 'The playlist built from what the batch actually voted for', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date', 'venue', 'music'], note: 'If you choose a bar, the venue holds the licence and the legal drinking age applies. We never arrange alcohol ourselves.' },
    timeline: {
      before: ['Venue confirmed with the closing time in writing', 'Food choices and allergies collected', 'Transport home planned before the night, not during it'],
      during: ['Group photograph early', 'Dinner, then the floor', 'Everyone accounted for at the end'],
      after: ['Photographs shared', 'Venue settled', 'Transport confirmed everyone got home'],
    },
    checklist: ['Venue closing time in writing', 'Food choices collected', 'Transport home arranged', 'Someone sober responsible for the end of the night'],
  }),

  B('technical-fest', 'Engineer', 'Power, bandwidth and a room where the robots are allowed to fail.', {
    about: 'A technical fest is the least decorative event on this list and the most demanding underneath it. Everything hinges on power and network, and those are the two things a cultural fest never thinks about.',
    formats: CAMPUS,
    ask: [
      ORGANISER, OPEN_TO, CROWD, FEST_DAYS, CAMPUS_PLACE,
      Q('tracks', 'What is running?', 'many', { options: [['coding', 'Coding contests'], ['robotics', 'Robotics or an arena'], ['projects', 'A project exhibition'], ['workshops', 'Workshops'], ['talks', 'Industry talks'], ['gaming', 'E-sports']] }),
      Q('power_need', 'What do the events need?', 'many', { options: [['sockets', 'Power at every table'], ['heavy', 'Three-phase or heavy load'], ['network', 'Wired network or strong wifi'], ['screens', 'Screens and projectors']] }),
      Q('arena', 'Does any event need a built arena or safety barrier?', 'yesno', { optional: true }),
      SPONSORS, PERMITS, TICKETS, REG_DESK, JUDGES, ACCOM,
      STAGE_NEED, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, REFRESH, CLEAN,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Power', 'Distributed, backed-up power — the single point of failure here'),
      S('event_equipment_rental', 'recommended', 'Set', 'Tables, screens, arena barriers and the exhibition floor'),
      S('sound_av', 'conditional', 'Project', 'Projectors, screens and mics for talks and workshops', { when: [some(ans('tracks', 'talks', 'workshops', 'gaming'), has('av'))] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid, barriers checked, and the floor cleared after', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], ans('arena', 'yes'))] }),
      S('invitation_printing', 'conditional', 'Register', 'Passes, table numbers, score sheets and certificates', { when: [some(WHEN_DESK[0], WHEN_JUDGED[0], WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Receive', 'Registration and help desks for visiting teams', { when: [some(WHEN_VISITING[0], WHEN_DESK[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Food through the day for people who will not leave their table', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating, team tables and a quiet area for the judges', { when: [some(WHEN_SEATS[0], ans('tracks', 'projects'))] }),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for equipment that stays on the floor', { when: [some(WHEN_GUARD[0], ans('days', '2', '3', '5'))] }),
      S('photography', 'conditional', 'Document', 'The builds, the arena and the winners, for the sponsors', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Reward', 'Prizes and sponsor kits for the winners', { when: WHEN_TROPHY }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, zone signage and sponsor branding', { when: [some(WHEN_SPONSOR[0], WHEN_VISITING[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Working light on the arena and the exhibition tables', { when: [ans('arena', 'yes')] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across several days and several venues on campus', { when: [ans('days', '2', '3', '5')] }),
      S('venue', 'conditional', 'Gather', 'Halls and labs off campus, if the departments cannot hold it', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('network_drop', 'Connect', 'Wired drops for the contests that cannot run on wifi', 'power_cooling', { trade: 'power_cooling', when: [ans('power_need', 'network')] }),
      X('arena_barrier', 'Contain', 'A proper barrier around the robotics arena, not a rope', 'event_equipment_rental', { trade: 'event_equipment_rental', when: [ans('arena', 'yes')] }),
      X('judge_packs', 'Judge', 'Criteria, score sheets and a briefing, so judging is consistent', 'poll', { trade: 'invitation_printing', when: WHEN_JUDGED }),
      X('team_stay', 'Host', 'Hostel or hotel rooms for visiting teams — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
      X('live_leaderboard', 'Track', 'A live leaderboard on a screen at the entrance', 'poll', { trade: 'sound_av' }),
    ],
    toolkit: { polls: ['date'], note: 'Size the power against every table before anything else is booked. A technical fest fails at the distribution board, not on the stage.' },
    timeline: {
      before: ['Power and network needs listed per event, then the generator sized', 'Arena built and the barrier checked by someone who is not the builder', 'Registration opened and teams confirmed'],
      during: ['Power watched, with a spare feed for the critical events', 'Judging to published criteria', 'Equipment logged in and out each day'],
      after: ['Equipment returned and reconciled', 'Results and certificates published the same week', 'Sponsor report with photographs'],
    },
    checklist: ['Power sized per table and backed up', 'Network tested under load', 'Arena barrier checked', 'Judging criteria published in advance'],
  }),

  B('hackathon', 'Build', 'Thirty-six hours, a working network and food at three in the morning.', {
    about: 'The only occasion in the catalogue where the event runs through the night. That single fact drives the whole plan: power that cannot drop, food at odd hours, somewhere to sleep, and security for a building that stays open.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('hours', 'How long does it run?', 'select', { options: [['8', 'A single day'], ['24', '24 hours'], ['36', '36 hours'], ['48', '48 hours or more']] }),
      Q('teams', 'How many participants?', 'select', { options: [['50', 'Up to 50'], ['150', 'Up to 150'], ['400', 'Up to 400'], ['800', 'More than 400']] }),
      OPEN_TO, CAMPUS_PLACE,
      Q('needs', 'What does the venue need to provide?', 'many', { options: [['sockets', 'Power at every seat'], ['network', 'Wired network or strong wifi'], ['screens', 'Screens for demos'], ['whiteboards', 'Whiteboards'], ['sleep', 'Somewhere to rest']] }),
      Q('meals', 'How many meals across the event?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['5', 'Five'], ['7', 'Seven or more']] }),
      Q('night_food', 'Food and coffee through the night?', 'yesno'),
      SPONSORS, REG_DESK, JUDGES, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, CLEAN,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Power', 'Power at every seat, backed up, because a drop ends the event'),
      S('catering_food', 'recommended', 'Sustain', 'Meals at the hours people are actually awake, including 3 am'),
      S('event_equipment_rental', 'recommended', 'Set', 'Tables, power strips, screens and whiteboards per team'),
      S('bar_beverages', 'conditional', 'Caffeinate', 'Coffee and cold drinks running all night, not just at the start', { when: [ans('night_food', 'yes')] }),
      S('security_services', 'conditional', 'Watch', 'Overnight cover for a building that stays open and full', { when: [some(WHEN_GUARD[0], ans('hours', '24', '36', '48'))] }),
      S('safety_facilities', 'conditional', 'Care', 'Washrooms serviced through the night, first aid, and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], ans('hours', '24', '36', '48'))] }),
      S('sound_av', 'conditional', 'Present', 'Screens, mics and a demo stage for the final pitches', { when: [some(has('av'), WHEN_JUDGED[0])] }),
      S('invitation_printing', 'conditional', 'Register', 'Passes, team numbers, score sheets and certificates', { when: [some(WHEN_REG[0], WHEN_JUDGED[0], WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Receive', 'A desk that is staffed at every hour the event is running', { when: [some(WHEN_REG[0], WHEN_VISITING[0])] }),
      S('tent_furniture', 'conditional', 'Rest', 'Team seating, and a quiet area where people can actually sleep', { when: [some(WHEN_SEATS[0], ans('needs', 'sleep'))] }),
      S('gifts_favours', 'conditional', 'Reward', 'Prizes, and sponsor swag that is worth carrying home', { when: [some(WHEN_TROPHY[0], WHEN_SPONSOR[0])] }),
      S('photography', 'conditional', 'Document', 'The room at hour thirty, which is the photograph that matters', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Sponsor branding and zone signage', { when: WHEN_SPONSOR }),
      S('venue', 'conditional', 'Gather', 'A venue that will stay open overnight, which most will not', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('night_coffee', 'Fuel', 'A coffee counter that is still staffed at 4 am', 'glass', { trade: 'bar_beverages', when: [ans('night_food', 'yes')] }),
      X('rest_zone', 'Recover', 'Mats, a dark corner and a wake-up list', 'bed', { trade: 'tent_furniture', when: [ans('needs', 'sleep')] }),
      X('mentor_desk', 'Guide', 'A rota of mentors, with their slots published', 'group', { experience: true }),
      X('demo_stage', 'Pitch', 'A demo stage with a timer and a screen that works first time', 'sound_av', { trade: 'sound_av', when: WHEN_JUDGED }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Overnight means overnight: washrooms, security, food and a person awake and in charge at every hour. We will keep those on the plan.' },
    timeline: {
      before: ['Power and network load-tested with the real number of laptops', 'Overnight permission, security and washroom servicing confirmed', 'Meal times published, including the night ones'],
      during: ['A named organiser awake and in charge every hour', 'Food on time — a late 3 am meal is the thing people remember', 'Judging to published criteria, with a timer'],
      after: ['Everyone signed out of the building', 'Results and prizes the same day', 'Venue cleared and returned'],
    },
    checklist: ['Power load-tested', 'Network tested at full load', 'Overnight security and washrooms confirmed', 'Night meals scheduled and staffed'],
  }),

  B('college-cultural-fest', 'Perform', 'Stage after stage, green room after green room, three days of it.', {
    about: 'Where a technical fest is power, a cultural fest is stage time. The hard parts are the changeovers, the green rooms and the fact that twelve colleges all want the same rehearsal slot.',
    formats: CAMPUS,
    ask: [
      ORGANISER, OPEN_TO, CROWD, FEST_DAYS, CAMPUS_PLACE,
      Q('events', 'What is competed in?', 'many', { options: [['dance', 'Dance'], ['music', 'Music'], ['drama', 'Drama and mime'], ['fashion', 'Fashion'], ['literary', 'Literary and quizzing'], ['fine_arts', 'Fine arts']] }),
      Q('green_rooms', 'How many green rooms are needed?', 'select', { options: [['2', 'Two'], ['4', 'Four'], ['8', 'Eight'], ['12', 'More than eight']] }),
      JUDGES, ACCOM, SPONSORS, PERMITS, TICKETS, REG_DESK, LATE,
      STAGE_NEED, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'Monitors, mics and a tracks desk that handles back-to-back items'),
      S('event_lighting', 'recommended', 'Light', 'A lighting rig that can change between every item'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, wings, backdrop, barricades and the green rooms'),
      S('tent_furniture', 'recommended', 'House', 'Green rooms with mirrors and seating, and audience seating out front'),
      S('anchor_mc', 'conditional', 'Hold', 'Hosts who can fill a twelve-minute changeover without losing a crowd', { when: [ans('events', 'dance', 'music', 'drama', 'fashion')] }),
      S('guest_services', 'conditional', 'Register', 'Desks for visiting contingents, with their slot times', { when: [some(WHEN_VISITING[0], WHEN_DESK[0])] }),
      S('invitation_printing', 'conditional', 'Schedule', 'Running orders, slot cards, score sheets and certificates', { when: [some(WHEN_JUDGED[0], WHEN_DESK[0], WHEN_PRINTED[0])] }),
      S('security_services', 'conditional', 'Control', 'Front-of-stage and gate control for a packed ground', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_PUBLIC[0])] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid, washrooms and the ground cleared each night', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Ready', 'Makeup and hair in the green rooms, between items', { when: [ans('events', 'dance', 'drama', 'fashion')] }),
      S('catering_food', 'conditional', 'Feed', 'Food for contingents, judges and the crew who never leave', { when: WHEN_FED }),
      S('photography', 'conditional', 'Capture', 'Every item, and the winners, for the colleges to take home', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The finals filmed, which is what settles a disputed result', { when: WHEN_FILMED }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies by event, and an overall championship', { when: WHEN_TROPHY }),
      S('power_cooling', 'conditional', 'Power', 'Power for the rig and the stages, with a backup feed', { when: [some(WHEN_ONGROUND[0], WHEN_BIG[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, backdrop and sponsor branding', { when: [some(WHEN_SPONSOR[0], WHEN_VISITING[0])] }),
      S('venue', 'conditional', 'Gather', 'An auditorium or ground with real stage facilities', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('rehearsal_slots', 'Allocate', 'Published rehearsal slots per contingent, so nobody queues', 'schedule', { trade: 'invitation_printing' }),
      X('tracks_desk', 'Cue', 'A tracks desk collecting every backing track the day before', 'sound_av', { trade: 'sound_av' }),
      X('contingent_stay', 'House', 'Rooms for visiting contingents — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
      X('result_board', 'Publish', 'A live result board with the scores behind each placing', 'poll', { trade: 'invitation_printing', when: WHEN_JUDGED }),
    ],
    toolkit: { polls: ['date'], note: 'Collect every backing track the day before. A cultural fest runs late because of file formats, not performances.' },
    timeline: {
      before: ['Running order and rehearsal slots published per contingent', 'Backing tracks collected and tested the day before', 'Green rooms allocated by event, not first come'],
      during: ['Changeovers timed and held to', 'Judging between sections, with sheets collected each time', 'Curfew respected on the outdoor stages'],
      after: ['Results published with scores', 'Green rooms and stage cleared', 'Films sent to the colleges that competed'],
    },
    checklist: ['Running order and rehearsal slots published', 'Backing tracks collected in advance', 'Green rooms allocated', 'Judging criteria published'],
  }),

  B('intercollege-competition', 'Contest', 'Other colleges on your ground, and every one of them watching how it is judged.', {
    about: 'Smaller than a fest and harder in one respect: your reputation rides entirely on whether the judging and the scheduling were fair. Everything here serves that.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('discipline', 'What is being competed in?', 'one', { options: [['cultural', 'Cultural'], ['technical', 'Technical'], ['sports', 'Sport'], ['literary', 'Literary or debating'], ['quiz', 'Quizzing'], ['mixed', 'Several of these']] }),
      Q('colleges', 'How many colleges are coming?', 'select', { options: [['4', 'Up to 4'], ['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'More than 25']] }),
      OPEN_TO, CAMPUS_PLACE, FEST_DAYS,
      Q('rounds', 'How is it structured?', 'one', { options: [['single', 'A single round'], ['prelim', 'Prelims and a final'], ['league', 'A league'], ['knockout', 'A knockout']] }),
      JUDGES, ACCOM, REG_DESK, TICKETS, SPONSORS,
      STAGE_NEED, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, REFRESH, RIDES, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Receive', 'A desk per college: pack, slot times and a named point of contact'),
      S('invitation_printing', 'recommended', 'Publish', 'Draw, rules, score sheets, name cards and certificates'),
      S('event_equipment_rental', 'conditional', 'Set', 'Rooms, tables, podiums and a judges’ area laid out alike', { when: [some(WHEN_STAGE[0], ans('rounds', 'prelim', 'league', 'knockout'))] }),
      S('sound_av', 'conditional', 'Carry', 'Sound in every competition room, matched so no room is favoured', { when: [some(has('av'), ans('discipline', 'cultural', 'literary', 'quiz', 'mixed'))] }),
      S('catering_food', 'conditional', 'Host', 'Lunch for teams who cannot leave between rounds', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating per team, per judge and for the audience', { when: WHEN_SEATS }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies, a rolling shield, and a memento for the judges', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Record', 'Rounds and results, so a disputed placing has evidence', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Manage', 'Gate control when twenty-five colleges arrive at once', { when: [some(WHEN_GUARD[0], ans('colleges', '25', '50'))] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid, and rooms reset for class afterwards', { when: [some(WHEN_AID[0], WHEN_CLEAN[0])] }),
      S('passenger_transport', 'conditional', 'Bring', 'Transport between the station, the stay and the campus', { when: WHEN_RIDE }),
      S('anchor_mc', 'conditional', 'Conduct', 'Someone to run the rounds to the published rules', { when: [ans('discipline', 'cultural', 'quiz', 'literary', 'mixed')] }),
      S('decoration_floral', 'conditional', 'Brand', 'An entrance, and every visiting college named on it', { when: [some(WHEN_SPONSOR[0], ans('colleges', '10', '25', '50'))] }),
      S('venue', 'conditional', 'Gather', 'Rooms or a ground off campus', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('college_packs', 'Brief', 'A pack per college: rules, draw, slots, map and contacts', 'invite', { trade: 'invitation_printing' }),
      X('neutral_judges', 'Settle', 'Judges from outside every competing college, named in advance', 'group', { experience: true, when: WHEN_JUDGED }),
      X('score_publication', 'Show', 'Every score published after each round, not just the winners', 'poll', { trade: 'invitation_printing', when: WHEN_JUDGED }),
      X('team_stay', 'House', 'Rooms for visiting teams — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the rules, the draw and the judges before the day. Every dispute at an intercollege event is really a dispute about something that was not published.' },
    timeline: {
      before: ['Rules, draw and judging criteria published to every college', 'Judges confirmed from outside the competing colleges', 'Slot times sent with the travel information'],
      during: ['Registration by college, pack handed over', 'Rounds to the clock, scores collected each round', 'Results announced with the scores visible'],
      after: ['Certificates to every participant, not only winners', 'Scores shared with each college', 'Rooms reset'],
    },
    checklist: ['Rules and draw published', 'Judges neutral and named in advance', 'Slot times sent with travel information', 'Score sheets printed per round'],
  }),

  B('college-sports-meet', 'Contend', 'A week of fixtures, and a championship nobody can dispute.', {
    about: 'Longer and more physical than a school sports day, with visiting teams and real injuries. First aid stops being optional the moment there is contact sport on the card.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, OPEN_TO,
      Q('sports', 'What is on the card?', 'many', { options: [['athletics', 'Athletics'], ['cricket', 'Cricket'], ['football', 'Football'], ['basketball', 'Basketball'], ['indoor', 'Indoor games'], ['contact', 'Contact sport — kabaddi, boxing, wrestling']] }),
      Q('teams_count', 'How many teams or athletes?', 'select', { options: [['50', 'Up to 50'], ['200', 'Up to 200'], ['600', 'Up to 600'], ['1500', 'More than 600']] }),
      FEST_DAYS, CAMPUS_PLACE,
      Q('marking', 'Do you need grounds marked and equipment set up?', 'yesno'),
      Q('officials', 'Do you need referees, umpires or officials?', 'yesno'),
      AID, ACCOM, REG_DESK, GUARD, AV_NEED, SEATS, AWARDS, PHOTOS, VIDEO, REFRESH, RIDES, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Protect', 'First aid at every ground, an ambulance on standby, and the clear-up'),
      S('event_equipment_rental', 'conditional', 'Mark', 'Grounds marked, nets, mats, goals and scoreboards', { when: [ans('marking', 'yes')] }),
      S('bar_beverages', 'recommended', 'Hydrate', 'Water and electrolytes at every ground, refilled all day'),
      S('tent_furniture', 'conditional', 'Shelter', 'Team tents, officials’ seating and stands for spectators', { when: WHEN_SEATS }),
      S('sound_av', 'conditional', 'Announce', 'A PA at the main ground, and results read out as they come', { when: [some(has('av'), ans('sports', 'athletics'))] }),
      S('invitation_printing', 'conditional', 'Publish', 'Fixtures, numbers, result sheets and certificates', { when: [some(WHEN_REG[0], WHEN_PRINTED[0])] }),
      S('guest_services', 'conditional', 'Receive', 'A desk per visiting college, with fixtures and ground maps', { when: [some(WHEN_VISITING[0], WHEN_REG[0])] }),
      S('gifts_favours', 'conditional', 'Honour', 'Medals by event and an overall championship trophy', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Capture', 'Finishes, finals and podiums across every ground', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The finals filmed, which settles a disputed call', { when: WHEN_FILMED }),
      S('catering_food', 'conditional', 'Fuel', 'Food for athletes, officials and the crew, at playing hours', { when: WHEN_FED }),
      S('security_services', 'conditional', 'Manage', 'Ground control, which matters most at a contact final', { when: [some(WHEN_GUARD[0], ans('sports', 'contact'), ans('teams_count', '600', '1500'))] }),
      S('passenger_transport', 'conditional', 'Move', 'Transport between grounds, the stay and the station', { when: WHEN_RIDE }),
      S('power_cooling', 'conditional', 'Power', 'Power for the PA, the scoreboards and the floodlights', { when: WHEN_ONGROUND }),
      S('venue', 'conditional', 'Ground', 'Grounds and courts off campus for the fixtures that need them', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('physio_cover', 'Treat', 'A physio at the contact events, not just a first-aid box', 'spa', { trade: 'safety_facilities', when: [ans('sports', 'contact')] }),
      X('officials_panel', 'Officiate', 'Accredited referees and umpires, named on the fixture list', 'group', { experience: true, when: [ans('officials', 'yes')] }),
      X('live_scores', 'Track', 'A live scoreboard and a published results feed', 'poll', { trade: 'invitation_printing' }),
      X('team_stay', 'House', 'Rooms for visiting teams — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'With contact sport on the card, first aid and an ambulance route are part of the plan. We will not quietly drop them to save a line.' },
    timeline: {
      before: ['Fixtures published, with grounds and times', 'Ambulance route and nearest hospital confirmed in writing', 'Grounds marked and equipment checked the day before'],
      during: ['First aid visible at every active ground', 'Results recorded and published as each event finishes', 'Water replenished, not just placed'],
      after: ['Championship tallied and published with the scores', 'Equipment returned and grounds restored', 'Injuries followed up'],
    },
    checklist: ['Fixtures published', 'First aid and ambulance confirmed', 'Grounds marked and equipment checked', 'Water at every ground'],
  }),

  B('alumni-meet', 'Reconvene', 'The batch that left, back in the building that made them.', {
    about: 'Adults, off campus as often as on it, and the one occasion in this category where a licensed bar is a reasonable thing to ask about. It is still a question, and the venue holds the licence.',
    formats: ['venue', 'restaurant', 'outdoor'],
    ask: [
      Q('batches', 'Which batches are invited?', 'text', { max: 80, placeholder: 'e.g. 2010–2015, or all' }),
      Q('attending', 'About how many are coming?', 'select', { options: [['50', 'Up to 50'], ['150', 'Up to 150'], ['400', 'Up to 400'], ['1000', 'More than 400']] }),
      CAMPUS_PLACE,
      Q('parts', 'What is planned?', 'many', { options: [['tour', 'A campus walk'], ['panel', 'A panel or talks'], ['faculty', 'Felicitating faculty'], ['dinner', 'Dinner'], ['music', 'Music and dancing'], ['match', 'A match against the students']] }),
      Q('drinks', 'Drinks', 'one', {
        options: [['soft', 'Soft drinks and mocktails'], ['bar', 'A licensed bar at the venue'], ['own', 'The venue handles it'], ['none', 'Nothing needed']],
        help: 'A bar is the venue’s licence, never ours. On campus, the college’s rules decide.',
      }),
      Q('music_kind', 'Music', 'one', { options: [['dj', 'A DJ'], ['live', 'A live band'], ['playlist', 'Our own playlist'], ['none', 'No music']] }),
      Q('badges', 'Name badges with batch and course?', 'yesno', { optional: true }),
      Q('giving', 'Is there a fundraising or giving ask?', 'yesno', { optional: true }),
      DIET_ONLY, ALLERGY_ONLY, AV_NEED, REFRESH, SEATS, PHOTOS, VIDEO, RIDES, CLEAN,
    ],
    plan: [
      S('photography', 'recommended', 'Assemble', 'The batch photographs, which is what everyone actually came for', { unless: UNLESS_PHOTO }),
      S('catering_food', 'conditional', 'Feast', 'Dinner for a room that will not sit down when asked', { when: [some(ans('parts', 'dinner'), WHEN_MEAL[0])] }),
      S('invitation_printing', 'conditional', 'Name', 'Badges with the name, the batch and the course', { when: [some(ans('badges', 'yes'), ans('giving', 'yes'))] }),
      S('bar_beverages', 'conditional', 'Pour', 'A drinks counter, set up and staffed as you chose', { when: [ans('drinks', 'soft', 'bar')] }),
      S('dj_music', 'conditional', 'Move', 'A DJ who will play what those batches listened to', { when: [ans('music_kind', 'dj')] }),
      S('live_entertainment', 'conditional', 'Perform', 'A band for the evening', { when: [ans('music_kind', 'live')] }),
      S('sound_av', 'conditional', 'Carry', 'Mics for the panel and the speeches, speakers for the rest', { when: [some(ans('parts', 'panel', 'faculty'), ans('music_kind', 'playlist'), has('av'))] }),
      S('anchor_mc', 'conditional', 'Run', 'Someone to keep the programme from becoming four speeches', { when: [ans('parts', 'panel', 'faculty')] }),
      S('gifts_favours', 'conditional', 'Honour', 'A memento for each faculty member who came back', { when: [ans('parts', 'faculty')] }),
      S('guest_services', 'conditional', 'Register', 'A desk at the door, sorted by batch, with the badges ready', { when: [ans('attending', '400', '1000')] }),
      S('decoration_floral', 'recommended', 'Set', 'An entrance, and a wall of the years these batches were here'),
      S('tent_furniture', 'conditional', 'Seat', 'Seating by batch, because that is how people want to sit', { when: WHEN_SEATS }),
      S('event_lighting', 'conditional', 'Glow', 'Lighting for the evening', { when: [ans('music_kind', 'dj', 'live')] }),
      S('videography', 'conditional', 'Film', 'The panel and the felicitation, filmed for the college', { when: WHEN_FILMED }),
      S('passenger_transport', 'conditional', 'Arrive', 'Transport for alumni coming from out of town', { when: WHEN_RIDE }),
      S('venue', 'conditional', 'Gather', 'Somewhere that holds the number who actually said yes', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('campus_walk', 'Walk', 'A guided walk of the departments, with whoever still teaches there', 'map', { experience: true, when: [ans('parts', 'tour')] }),
      X('batch_tables', 'Group', 'Tables marked by batch, so nobody spends the night looking', 'group', { trade: 'tent_furniture' }),
      X('giving_desk', 'Give', 'A staffed giving desk, with what the money is for written up', 'budget', { trade: 'guest_services', when: [ans('giving', 'yes')] }),
      X('then_and_now', 'Compare', 'Each batch photographed in the same spot as their old photograph', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'venue', 'food'], note: 'Build the batch list first and confirm numbers. An alumni meet is a contact list with a dinner attached.' },
    timeline: {
      before: ['Batch lists built and numbers confirmed', 'Faculty traced and invited personally, not by circular', 'Badges printed by batch'],
      during: ['Registration by batch, badges handed over', 'Campus walk early, before dinner', 'Batch photographs while everyone is still there'],
      after: ['Photographs shared with each batch', 'Contact list circulated with consent', 'Giving acknowledged in writing'],
    },
    checklist: ['Batch lists confirmed', 'Faculty invited personally', 'Badges printed by batch', 'Photograph plan by batch'],
  }),

  B('college-concert', 'Headline', 'One artist, one night, and a crowd that bought a ticket for it.', {
    about: 'The one occasion here where an outside professional sets the terms. The artist’s rider decides the sound, the stage and the power; the crowd decides the barricades and the exits.',
    formats: ['outdoor', 'venue'],
    ask: [
      ORGANISER, OPEN_TO, CROWD, CAMPUS_PLACE,
      Q('artist', 'Is the artist confirmed?', 'one', { options: [['yes', 'Yes, and we have the rider'], ['booked', 'Booked, rider not received'], ['no', 'Not yet']], help: 'The rider decides the sound, stage and power. We plan around it rather than guessing.' }),
      Q('act_kind', 'What kind of act?', 'one', { options: [['band', 'A band'], ['dj', 'A DJ set'], ['singer', 'A singer with a track'], ['comedy', 'Stand-up'], ['mixed', 'Several acts']] }),
      TICKETS, SPONSORS, PERMITS, LATE,
      Q('barricade', 'Do you need barricading and a front-of-stage barrier?', 'yesno'),
      STAGE_NEED, GUARD, AID, SEATS, PHOTOS, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Amplify', 'A system specified against the rider, not against the budget'),
      S('event_lighting', 'recommended', 'Light', 'A rig that matches the act and the size of the ground'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, trussing, barricades and front-of-stage barrier'),
      S('security_services', 'conditional', 'Control', 'Crowd management at the gates and the front of stage', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_PUBLIC[0], ans('barricade', 'yes'))] }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid near the front of stage, washrooms, and the clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('power_cooling', 'recommended', 'Power', 'Silent generators sized against the rider, with a backup feed'),
      S('live_entertainment', 'conditional', 'Support', 'A support act, so the night does not start at the headline', { when: [ans('act_kind', 'band', 'singer', 'mixed')] }),
      S('invitation_printing', 'conditional', 'Ticket', 'Tickets, wristbands, gate lists and sponsor branding', { when: [some(ans('tickets', 'yes'), WHEN_SPONSOR[0])] }),
      S('guest_services', 'conditional', 'Gate', 'Gate staff scanning and counting, which is how you stay legal', { when: [some(ans('tickets', 'yes'), WHEN_PUBLIC[0])] }),
      S('anchor_mc', 'conditional', 'Hold', 'Someone on the mic through the changeover', { when: [ans('act_kind', 'mixed', 'comedy')] }),
      S('photography', 'conditional', 'Capture', 'The act and the crowd, for the sponsors and next year', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The set filmed, with the artist’s permission in writing', { when: WHEN_FILMED }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls for the crowd and a green room spread for the act', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'House', 'A green room, and seating where the crowd is not standing', { when: WHEN_SEATS }),
      S('venue', 'conditional', 'Ground', 'A ground or arena that will take the crowd and the sound', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('rider_check', 'Match', 'The rider read line by line against what is actually booked', 'schedule', { experience: true }),
      X('green_room', 'Host', 'A green room set up to the rider, not improvised backstage', 'bed', { trade: 'tent_furniture' }),
      X('curfew_plan', 'Finish', 'A set-time plan that lands inside the local sound curfew', 'schedule', { experience: true, when: WHEN_LATE }),
      X('crowd_barrier', 'Hold', 'A front-of-stage barrier with a pit and a route out of it', 'security_services', { trade: 'event_equipment_rental', when: [ans('barricade', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Sell no more tickets than the ground is permitted to hold. Capacity, permissions and the sound curfew are the organiser’s, and we will keep them visible.' },
    timeline: {
      before: ['Rider received and matched against the booking', 'Permissions and capacity confirmed in writing', 'Gates, exits and the barrier planned before tickets go on sale'],
      during: ['Gates counted, never over capacity', 'First aid at the front of stage from doors open', 'Set times held, so the last act finishes inside the curfew'],
      after: ['Load-out the same night', 'Ground cleared', 'Sponsor and ticket reconciliation'],
    },
    checklist: ['Rider matched to the booking', 'Capacity and permissions in writing', 'Barrier and exits planned', 'Set times inside the curfew'],
  }),

  B('college-fashion-show', 'Strut', 'A ramp, a light cue and twenty people who have rehearsed the walk.', {
    about: 'Everything happens in the ninety seconds a sequence is on the ramp. Backstage — changing space, dressers, the order rail — is where the show is actually won.',
    formats: CAMPUS,
    ask: [
      ORGANISER, OPEN_TO, CROWD, CAMPUS_PLACE,
      Q('sequences', 'How many sequences or teams?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['15', 'Up to 15'], ['25', 'More than 15']] }),
      Q('ramp', 'Do you need a ramp built?', 'yesno'),
      Q('changing', 'How many changing rooms are needed?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      Q('styling', 'Makeup, hair and dressers?', 'one', { options: [['full', 'Yes, a full team'], ['makeup', 'Makeup and hair only'], ['dressers', 'Dressers only'], ['none', 'The teams handle it']] }),
      JUDGES, SPONSORS, TICKETS, LATE,
      AV_NEED, GUARD, SEATS, AWARDS, PHOTOS, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Cue', 'Ramp lighting cued to each sequence, which is the whole show'),
      S('sound_av', 'recommended', 'Drive', 'A tracks desk and a system that lands every cue on the beat'),
      S('event_equipment_rental', 'conditional', 'Build', 'The ramp, the trussing, the backdrop and the barricades', { when: [some(ans('ramp', 'yes'), WHEN_AV[0])] }),
      S('bridal_makeup_hair', 'conditional', 'Style', 'Makeup, hair and dressers working to the running order', { when: [ans('styling', 'full', 'makeup', 'dressers')] }),
      S('tent_furniture', 'conditional', 'House', 'Changing rooms with mirrors, rails and seating, and front-row seating', { when: [some(WHEN_SEATS[0], ans('changing', '2', '4', '8'))] }),
      S('photography', 'recommended', 'Shoot', 'A photographer at the end of the ramp, which is the only angle', { unless: UNLESS_PHOTO }),
      S('anchor_mc', 'conditional', 'Introduce', 'Someone to name each sequence and hold the changeovers', { when: [ans('sequences', '8', '15', '25')] }),
      S('videography', 'conditional', 'Film', 'The show filmed from the fixed ramp angle', { when: WHEN_FILMED }),
      S('invitation_printing', 'conditional', 'Order', 'Running order, sequence cards, score sheets and passes', { when: [some(WHEN_JUDGED[0], ans('tickets', 'yes'), WHEN_PRINTED[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'A backdrop and sponsor branding along the ramp', { when: [some(WHEN_SPONSOR[0], WHEN_PUBLIC[0])] }),
      S('security_services', 'conditional', 'Control', 'Crowd control at the ramp edge and backstage access', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_PUBLIC[0])] }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies and sashes for the winning sequences', { when: WHEN_TROPHY }),
      S('catering_food', 'conditional', 'Feed', 'Food backstage, where people are from noon to midnight', { when: WHEN_FED }),
      S('power_cooling', 'conditional', 'Power', 'Power for the rig, and cooling in the changing rooms', { when: [some(WHEN_ONGROUND[0], ans('changing', '4', '8'))] }),
      S('venue', 'conditional', 'Gather', 'A hall with the height and the depth for a ramp', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('ramp_rehearsal', 'Rehearse', 'A full cue-to-cue on the built ramp, with the real lights', 'schedule', { experience: true }),
      X('order_rail', 'Sequence', 'A rail backstage with every look in running order, labelled', 'dress', { trade: 'tent_furniture' }),
      X('backstage_lead', 'Marshal', 'One person backstage whose only job is calling sequences on', 'group', { experience: true }),
      X('ramp_angle', 'Frame', 'A second camera locked at the end of the ramp for every look', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'The running order and the light cues are the show. Anything that changes on the day changes both, so we lock them early.' },
    timeline: {
      before: ['Running order locked, cues written against it', 'Full cue-to-cue rehearsal on the built ramp', 'Changing rooms allocated and rails labelled by sequence'],
      during: ['Backstage lead calling sequences on', 'Cues to the running order, not to the moment', 'Judging between sections, results at the end'],
      after: ['Costumes returned to the teams', 'Photographs sent per sequence', 'Ramp struck and hall cleared'],
    },
    checklist: ['Running order locked', 'Cue-to-cue rehearsed on the built ramp', 'Changing rooms allocated', 'Backstage lead named'],
  }),

  B('debate-competition', 'Adjudicate', 'A draw nobody can argue with, and adjudicators who are not from any of the competing teams.', {
    about: 'Where the school version is about a quiet hall, the college version is about the tab: the draw, the adjudication and whether both were visibly fair. Everything else is secondary.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('format', 'Format', 'one', { options: [['bp', 'British Parliamentary'], ['ap', 'Asian Parliamentary'], ['mun', 'Model UN'], ['conventional', 'Conventional debate'], ['quiz', 'Quizzing'], ['other', 'Something else']] }),
      Q('teams_in', 'How many teams?', 'select', { options: [['8', 'Up to 8'], ['24', 'Up to 24'], ['48', 'Up to 48'], ['100', 'More than 48']] }),
      OPEN_TO,
      Q('rounds_count', 'How many rounds?', 'select', { options: [['3', 'Three'], ['5', 'Five'], ['7', 'Seven'], ['9', 'Nine or more, with breaks']] }),
      Q('rooms_needed', 'How many rooms do you need?', 'select', { options: [['4', 'Up to 4'], ['8', 'Up to 8'], ['16', 'Up to 16'], ['30', 'More than 16']] }),
      JUDGES, ACCOM, REG_DESK, FEST_DAYS, CAMPUS_PLACE,
      AV_NEED, SEATS, AWARDS, PHOTOS, REFRESH, RIDES, CLEAN,
    ],
    plan: [
      S('invitation_printing', 'recommended', 'Publish', 'The draw, the tab, ballots, room lists and certificates'),
      S('event_equipment_rental', 'conditional', 'Equip', 'Rooms laid out identically, with a timer and a bell in each', { when: [ans('rooms_needed', '8', '16', '30')] }),
      S('guest_services', 'recommended', 'Register', 'A desk per institution, with room allocations and the schedule'),
      S('sound_av', 'conditional', 'Carry', 'Sound for the final and the break rounds, in the big room only', { when: WHEN_AV }),
      S('catering_food', 'conditional', 'Sustain', 'Lunch and tea between rounds, for people who cannot leave', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating per room for speakers, adjudicators and audience', { when: WHEN_SEATS }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies, and a memento for the adjudication core', { when: WHEN_TROPHY }),
      S('photography', 'conditional', 'Record', 'The break rounds and the final, quietly', { when: WHEN_SHOT }),
      S('passenger_transport', 'conditional', 'Move', 'Transport between the stay, the station and campus', { when: WHEN_RIDE }),
      S('anchor_mc', 'conditional', 'Chair', 'A chair for the final and the closing', { when: [ans('format', 'mun', 'bp', 'ap', 'quiz')] }),
      S('decoration_floral', 'optional', 'Dress', 'A backdrop for the final with the motion and the institutions'),
      S('venue', 'conditional', 'Gather', 'Rooms off campus, enough of them, close together', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('tab_system', 'Tabulate', 'A tab run on real software, with results published per round', 'poll', { trade: 'invitation_printing' }),
      X('adjudication_core', 'Judge', 'An adjudication core from outside every competing institution', 'group', { experience: true, when: WHEN_JUDGED }),
      X('equity_officer', 'Protect', 'A named equity contact, published before the tournament opens', 'phone', { experience: true }),
      X('team_stay', 'House', 'Rooms for visiting teams — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the adjudication core, the draw and the equity contact before registration opens. Fairness that is not visible is not fairness.' },
    timeline: {
      before: ['Adjudication core named and published', 'Rooms allocated and laid out identically', 'Draw method and tab published with the invitation'],
      during: ['Rounds to the clock, ballots collected each round', 'Tab updated and published between rounds', 'Equity contact reachable all day'],
      after: ['Full tab published', 'Certificates to every speaker', 'Rooms reset'],
    },
    checklist: ['Adjudication core published', 'Rooms allocated and identical', 'Tab software tested before the day', 'Equity contact named'],
  }),

  B('student-awards-night', 'Celebrate', 'An awards show, run by students, that does not run to midnight.', {
    about: 'Closer to a show than a ceremony: categories, nominations, a host and a room that wants to be entertained between envelopes. The risk is length, so the plan counts awards in minutes.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('categories_count', 'How many award categories?', 'select', { options: [['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'Up to 50'], ['80', 'More than 50']] }),
      Q('nominations', 'Are there nominations announced in advance?', 'yesno', { optional: true }),
      CAMPUS_PLACE, OPEN_TO,
      Q('interludes', 'Are there performances between the awards?', 'yesno'),
      Q('red_carpet', 'A red carpet and arrivals?', 'yesno', { optional: true }),
      CHIEF_GUEST, STAGE_NEED, AV_NEED, SEATS, DRESS_CODE, AWARDS, LATE, PHOTOS, VIDEO, REFRESH, CLEAN,
    ],
    plan: [
      S('anchor_mc', 'recommended', 'Host', 'Hosts who can carry fifty envelopes without the room going flat'),
      S('sound_av', 'recommended', 'Run', 'Mics, a screen for the nominations, and cues that land'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting, and a look for the arrivals'),
      S('decoration_floral', 'recommended', 'Stage', 'A backdrop and a stage that looks like an awards night'),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, engraved, and sorted in the order they are called', { when: WHEN_TROPHY }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, podium, screen and a carpet for the arrivals', { when: [some(WHEN_STAGE[0], ans('red_carpet', 'yes'))] }),
      S('photography', 'conditional', 'Capture', 'Arrivals, each handover and the group shots', { when: WHEN_SHOT }),
      S('live_entertainment', 'conditional', 'Interlude', 'Acts between the award blocks, to keep the room awake', { when: [ans('interludes', 'yes')] }),
      S('invitation_printing', 'conditional', 'Publish', 'Nomination cards, the running order and certificates', { when: [some(ans('nominations', 'yes'), WHEN_PRINTED[0])] }),
      S('videography', 'conditional', 'Film', 'The night filmed, with the winners cut for sharing', { when: WHEN_FILMED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating by category block, so a winner can reach the stage', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Feed', 'Dinner or a counter after the awards, not during them', { when: WHEN_FED }),
      S('guest_services', 'conditional', 'Receive', 'Hosts on the carpet and at the door', { when: [some(ans('red_carpet', 'yes'), WHEN_VISITING[0])] }),
      S('security_services', 'conditional', 'Manage', 'Door control, especially if it is open beyond the college', { when: WHEN_PUBLIC }),
      S('venue', 'conditional', 'Gather', 'A hall with a stage and a foyer for the arrivals', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Cleared and cleaned afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('nomination_reels', 'Tease', 'A short reel per category, played before the envelope', 'film', { trade: 'sound_av', when: [ans('nominations', 'yes')] }),
      X('arrivals_wall', 'Pose', 'A branded arrivals wall with a photographer on it', 'booth', { trade: 'decoration_floral', when: [ans('red_carpet', 'yes')] }),
      X('engraving', 'Engrave', 'Each trophy engraved with the name, the category and the year', 'gift', { trade: 'gifts_favours', when: WHEN_TROPHY }),
      X('runtime_plan', 'Time', 'Ninety seconds budgeted per award, and the order built to it', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Count the awards in minutes before you print the programme. Fifty categories is eighty minutes before anyone has spoken.' },
    timeline: {
      before: ['Categories and winners finalised and kept confidential', 'Runtime budgeted per award and the order built to it', 'Trophies engraved and sorted in calling order'],
      during: ['Arrivals and carpet before doors', 'Awards in blocks, with an interlude between', 'Close on time, especially if the curfew applies'],
      after: ['Awards delivered to anyone absent', 'Winners’ clips shared the same week', 'Hall cleared'],
    },
    checklist: ['Runtime budgeted per award', 'Trophies engraved and in calling order', 'Winners kept confidential', 'Seating planned by category block'],
  }),

  B('entrepreneurship-summit', 'Convene', 'Founders, investors and students in one building for a day that has to be worth their time.', {
    about: 'A conference judged on who showed up and whether the schedule held. Nothing here is decorative — the badge, the schedule and the networking space are the product.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('attendees', 'How many attending?', 'select', { options: [['100', 'Up to 100'], ['300', 'Up to 300'], ['800', 'Up to 800'], ['2000', 'More than 800']] }),
      Q('parts', 'What is on the programme?', 'many', { options: [['keynotes', 'Keynotes'], ['panels', 'Panels'], ['pitch', 'A pitch competition'], ['workshops', 'Workshops'], ['expo', 'A startup expo'], ['networking', 'Structured networking']] }),
      Q('tracks', 'How many parallel tracks?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['4', 'Four or more']] }),
      CAMPUS_PLACE, OPEN_TO, TICKETS, REG_DESK, SPONSORS, CHIEF_GUEST,
      Q('streaming', 'Is any of it streamed or recorded?', 'yesno', { optional: true }),
      AV_NEED, SEATS, REFRESH, PHOTOS, GUARD, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Deliver', 'Mics, screens and a confidence monitor in every track room'),
      S('guest_services', 'recommended', 'Register', 'Badge printing on arrival, and a desk that clears a queue fast'),
      S('invitation_printing', 'recommended', 'Publish', 'Badges, lanyards, the schedule, signage and sponsor branding'),
      S('event_equipment_rental', 'conditional', 'Set', 'Stage, panel seating, expo booths and the track rooms', { when: [some(ans('parts', 'expo', 'pitch'), ans('tracks', '2', '3', '4'))] }),
      S('catering_food', 'conditional', 'Host', 'Tea breaks and lunch that run on schedule, which is half of networking', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating per track, and standing tables where people actually talk', { when: [some(WHEN_SEATS[0], ans('parts', 'networking', 'expo'))] }),
      S('event_lighting', 'conditional', 'Light', 'Stage light that works for the camera as well as the room', { when: [some(ans('streaming', 'yes'), ans('parts', 'keynotes'))] }),
      S('videography', 'conditional', 'Record', 'Sessions recorded and streamed, which is most of the afterlife', { when: [ans('streaming', 'yes')] }),
      S('photography', 'conditional', 'Document', 'Speakers, panels and the floor, for the sponsors and next year', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Brand', 'Backdrop, wayfinding and sponsor presence across the venue', { when: [some(WHEN_SPONSOR[0], WHEN_VISITING[0])] }),
      S('power_cooling', 'conditional', 'Power', 'Power and cooling for the expo booths and the track rooms', { when: [some(ans('parts', 'expo'), WHEN_ONGROUND[0])] }),
      S('security_services', 'conditional', 'Control', 'Badge-checked access, which matters once investors are in the room', { when: [some(WHEN_GUARD[0], WHEN_PUBLIC[0])] }),
      S('passenger_transport', 'optional', 'Collect', 'Transport for speakers between the airport, the hotel and campus'),
      S('venue', 'conditional', 'Gather', 'A venue with enough breakout rooms for the tracks', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset and the venue cleared', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('pitch_setup', 'Pitch', 'A pitch stage with a visible timer and a judges’ table', 'sound_av', { trade: 'event_equipment_rental', when: [ans('parts', 'pitch')] }),
      X('matchmaking', 'Introduce', 'Scheduled one-to-one slots between founders and investors', 'group', { experience: true, when: [ans('parts', 'networking')] }),
      X('session_recordings', 'Publish', 'Every session cut and published within the week', 'film', { trade: 'videography', when: [ans('streaming', 'yes')] }),
      X('speaker_care', 'Look after', 'A green room, a runner and a confirmed arrival time per speaker', 'bed', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'Confirm every speaker twice and publish the schedule early. A summit is judged on who came and whether the timings held.' },
    timeline: {
      before: ['Speakers confirmed twice, with travel and arrival times', 'Schedule published, with tracks and room numbers', 'Badges pre-printed against the registration list'],
      during: ['Registration clearing fast, badges ready', 'Sessions to time — one overrun breaks every track', 'Breaks held, because that is when the value happens'],
      after: ['Recordings published within the week', 'Sponsor report and attendee list, with consent', 'Rooms reset'],
    },
    checklist: ['Speakers confirmed twice', 'Schedule and room numbers published', 'Badges pre-printed', 'Break timings protected'],
  }),

  B('campus-recruitment-event', 'Place', 'Twenty companies, four hundred students, and a day that has to run exactly to slot.', {
    about: 'The least festive occasion in this category and the one with most riding on it. Recruiters need rooms, power and quiet; students need a schedule they can trust and somewhere to wait that is not a corridor.',
    formats: CAMPUS,
    ask: [
      Q('companies', 'How many companies are coming?', 'select', { options: [['3', 'Up to 3'], ['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'More than 25']] }),
      Q('students', 'How many students are participating?', 'select', { options: [['100', 'Up to 100'], ['400', 'Up to 400'], ['1000', 'Up to 1000'], ['2500', 'More than 1000']] }),
      Q('stages', 'What stages are on the day?', 'many', { options: [['ppt', 'Pre-placement talks'], ['written', 'Written or online tests'], ['gd', 'Group discussions'], ['interviews', 'Interviews'], ['offers', 'Offers announced']] }),
      Q('rooms_needed', 'How many rooms do you need?', 'select', { options: [['4', 'Up to 4'], ['10', 'Up to 10'], ['20', 'Up to 20'], ['40', 'More than 20']] }),
      Q('tech', 'What do the rooms need?', 'many', { options: [['power', 'Power at every seat'], ['network', 'Reliable network for online tests'], ['projector', 'A projector'], ['video', 'Video-call setup']] }),
      CAMPUS_PLACE, REG_DESK,
      Q('waiting', 'Somewhere for students to wait between rounds?', 'yesno'),
      SEATS, REFRESH, PHOTOS, GUARD, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Coordinate', 'A host per company, and a desk that knows where every student is'),
      S('event_equipment_rental', 'recommended', 'Set', 'Interview rooms, GD tables and a waiting area, to the slot plan'),
      S('power_cooling', 'conditional', 'Power', 'Power at every seat and cooling in rooms used all day', { when: [ans('tech', 'power')] }),
      S('sound_av', 'conditional', 'Equip', 'Projectors and video-call setups that are tested, not assumed', { when: [ans('tech', 'projector', 'video')] }),
      S('invitation_printing', 'recommended', 'Schedule', 'Slot sheets, room numbers, name cards and a campus map'),
      S('catering_food', 'conditional', 'Host', 'Lunch and tea for recruiters, and something for the students waiting', { when: WHEN_FED }),
      S('tent_furniture', 'conditional', 'Wait', 'A waiting area with seating, not a corridor with a bench', { when: [some(ans('waiting', 'yes'), WHEN_SEATS[0])] }),
      S('decoration_floral', 'optional', 'Present', 'A tidy, branded entrance — recruiters notice the building'),
      S('security_services', 'conditional', 'Manage', 'Access control, so only the scheduled students are in the block', { when: [some(WHEN_GUARD[0], ans('students', '1000', '2500'))] }),
      S('photography', 'conditional', 'Record', 'A record of the drive for the placement report', { when: WHEN_SHOT }),
      S('valet_parking', 'optional', 'Park', 'Parking kept clear for recruiters arriving through the morning'),
      S('venue', 'conditional', 'Gather', 'Rooms off campus if the drive is bigger than the block', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Rooms reset for class the next morning', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('company_packs', 'Brief', 'A pack per company: room, schedule, host, wifi and contacts', 'invite', { trade: 'invitation_printing' }),
      X('network_test', 'Verify', 'The online-test network load-tested with the real number of machines', 'power_cooling', { trade: 'power_cooling', when: [ans('tech', 'network')] }),
      X('student_tracker', 'Track', 'A live board showing which round each student is in', 'poll', { trade: 'invitation_printing' }),
      X('recruiter_lounge', 'Host', 'A quiet lounge with tea, wifi and somewhere to make calls', 'bed', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'The slot plan is the event. Publish it, staff it, and have a named person per company who can fix it live.' },
    timeline: {
      before: ['Rooms allocated per company and confirmed with them', 'Network load-tested for the online rounds', 'Slot plan published to students and recruiters'],
      during: ['A host with each company from arrival', 'Students called by slot, tracked between rounds', 'Lunch for recruiters without breaking the schedule'],
      after: ['Offers communicated through the placement cell', 'Thank-you to every company', 'Rooms reset'],
    },
    checklist: ['Rooms allocated per company', 'Network load-tested', 'Slot plan published', 'A named host per company'],
  }),

  B('college-club-meetup', 'Gather', 'Thirty people, a room, a projector that works and something to eat.', {
    about: 'The smallest occasion in this category, and the one most often over-planned. A club meetup needs a room, power, a screen and snacks. Everything beyond that is usually a mistake.',
    formats: CAMPUS,
    ask: [
      Q('club_kind', 'What kind of club?', 'one', { options: [['tech', 'Technical'], ['arts', 'Arts or literary'], ['business', 'Business or finance'], ['social', 'Social or volunteering'], ['sport', 'Sport'], ['other', 'Something else']] }),
      Q('people', 'How many are coming?', 'select', { options: [['20', 'Up to 20'], ['50', 'Up to 50'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('format', 'What happens?', 'one', { options: [['talk', 'A talk'], ['workshop', 'A hands-on workshop'], ['discussion', 'A discussion'], ['screening', 'A screening'], ['social', 'Just a social']] }),
      Q('speaker', 'Is there an outside speaker?', 'yesno', { optional: true }),
      CAMPUS_PLACE, AV_NEED, SEATS, REFRESH, PHOTOS, CLEAN,
    ],
    plan: [
      S('sound_av', 'conditional', 'Show', 'A projector, a screen and a mic that are tested before people arrive', { when: [some(WHEN_AV[0], ans('format', 'talk', 'workshop', 'screening'))] }),
      S('tent_furniture', 'conditional', 'Seat', 'Rows for a talk, tables for a workshop — arranged for the format', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Feed', 'Snacks and tea, which is why half the room came', { when: WHEN_FED }),
      S('event_materials_supplier', 'conditional', 'Supply', 'Materials and kits for a hands-on session', { when: [ans('format', 'workshop')] }),
      S('photography', 'conditional', 'Record', 'A few photographs for the club’s own record', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Thank', 'A small thank-you for an outside speaker', { when: [ans('speaker', 'yes')] }),
      S('invitation_printing', 'optional', 'Announce', 'Posters and a sign-up sheet for the session'),
      S('event_equipment_rental', 'conditional', 'Equip', 'Tables, whiteboards and extension leads for a bigger session', { when: [ans('people', '120', '300')] }),
      S('decoration_floral', 'optional', 'Set', 'A simple backdrop if the session is being photographed'),
      S('venue', 'conditional', 'Gather', 'A room off campus if the club cannot get one', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Room reset afterwards', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('speaker_travel', 'Bring', 'Travel and a parking slot arranged for the outside speaker', 'bus', { trade: 'passenger_transport', when: [ans('speaker', 'yes')] }),
      X('workshop_kits', 'Equip', 'One kit per participant, counted against the sign-up list', 'craft', { trade: 'event_materials_supplier', when: [ans('format', 'workshop')] }),
      X('session_notes', 'Keep', 'Notes or a recording shared with whoever could not come', 'album', { experience: true }),
      X('signup_sheet', 'Count', 'A sign-up that closes, so the snacks match the room', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Keep this small. A club meetup that needs a production crew has stopped being a club meetup.' },
    timeline: {
      before: ['Room booked and the projector tested in it', 'Sign-up closed so numbers are real', 'Speaker confirmed with arrival time and parking'],
      during: ['Start on time, because thirty people will not wait', 'Session as planned', 'Snacks after, not during'],
      after: ['Notes or the recording shared', 'Room reset', 'Thank-you to the speaker'],
    },
    checklist: ['Room booked and projector tested', 'Sign-up closed', 'Speaker confirmed', 'Snacks counted against the sign-up'],
  }),

  B('innovation-showcase', 'Reveal', 'Student work in front of the people who could fund it.', {
    about: 'An exhibition with a commercial edge: the visitors are industry and investors, so a booth that does not work on the day is a lost opportunity rather than a lost mark.',
    formats: CAMPUS,
    ask: [
      ORGANISER,
      Q('exhibits', 'How many projects or startups?', 'select', { options: [['10', 'Up to 10'], ['30', 'Up to 30'], ['80', 'Up to 80'], ['150', 'More than 80']] }),
      Q('visitors_kind', 'Who is being invited?', 'many', { options: [['industry', 'Industry'], ['investors', 'Investors'], ['faculty', 'Faculty and students'], ['press', 'Press'], ['public', 'The public']] }),
      Q('booth_need', 'What does each exhibit need?', 'many', { options: [['table', 'A table'], ['booth', 'A built booth'], ['power', 'Power'], ['screen', 'A screen'], ['network', 'Network']] }),
      Q('pitch_stage', 'Is there a pitch stage?', 'yesno'),
      CAMPUS_PLACE, OPEN_TO, REG_DESK, SPONSORS, JUDGES, AWARDS,
      AV_NEED, SEATS, REFRESH, PHOTOS, VIDEO, GUARD, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'Booths, tables and screens — one numbered stand per exhibit'),
      S('power_cooling', 'conditional', 'Power', 'Power and network at every stand, tested before doors open', { when: [ans('booth_need', 'power', 'network', 'screen')] }),
      S('guest_services', 'recommended', 'Receive', 'Badge-printed registration, and hosts who can route an investor'),
      S('invitation_printing', 'recommended', 'Catalogue', 'Badges, stand numbers, a floor plan and a printed exhibitor catalogue'),
      S('sound_av', 'conditional', 'Stage', 'A pitch stage with a screen, a timer and sound', { when: [some(ans('pitch_stage', 'yes'), WHEN_AV[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Light on the stands, so the work is visible rather than lit from above', { when: [ans('booth_need', 'booth')] }),
      S('catering_food', 'conditional', 'Host', 'Tea and lunch, which is where the conversations actually happen', { when: WHEN_FED }),
      S('decoration_floral', 'conditional', 'Brand', 'An entrance, zone signage and sponsor presence', { when: [some(WHEN_SPONSOR[0], ans('visitors_kind', 'press', 'investors'))] }),
      S('photography', 'conditional', 'Document', 'Every stand and every pitch, for the report and the press', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The pitches filmed, so they can be sent to who could not attend', { when: WHEN_FILMED }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at the pitch stage and meeting tables on the floor', { when: [some(WHEN_SEATS[0], ans('pitch_stage', 'yes'))] }),
      S('gifts_favours', 'conditional', 'Honour', 'Awards for the judged categories, and sponsor kits', { when: WHEN_TROPHY }),
      S('security_services', 'conditional', 'Secure', 'Overnight cover for prototypes left on the floor', { when: [some(WHEN_GUARD[0], WHEN_PUBLIC[0])] }),
      S('venue', 'conditional', 'Gather', 'A hall with the floor area and the power for every stand', { when: WHEN_OFFSITE }),
      S('safety_facilities', 'conditional', 'Restore', 'Floor cleared and the venue restored', { when: WHEN_CLEAN }),
    ],
    addons: [
      X('exhibitor_catalogue', 'Publish', 'A catalogue with a page per exhibit, printed and digital', 'album', { trade: 'invitation_printing' }),
      X('investor_slots', 'Introduce', 'Booked meeting slots between exhibitors and visiting investors', 'group', { experience: true, when: [ans('visitors_kind', 'investors')] }),
      X('stand_test', 'Verify', 'Every stand powered and tested the evening before doors', 'power_cooling', { trade: 'power_cooling', when: [ans('booth_need', 'power')] }),
      X('pitch_films', 'Send', 'Each pitch cut as its own clip and sent to the exhibitor', 'film', { trade: 'videography', when: WHEN_FILMED }),
    ],
    toolkit: { polls: ['date'], note: 'Test every stand the evening before. An exhibit that is still being set up when an investor walks past has already missed them.' },
    timeline: {
      before: ['Stand list numbered, with power and network per stand', 'Catalogue produced from the exhibitor list', 'Visitor registration opened and badges pre-printed'],
      during: ['Every stand powered and staffed before doors', 'Pitch stage to the published times', 'Hosts routing visitors to the right stands'],
      after: ['Pitch clips and the catalogue sent to exhibitors', 'Introductions followed up while they are warm', 'Floor cleared'],
    },
    checklist: ['Stand list with power per stand', 'Catalogue produced', 'Badges pre-printed', 'Every stand tested before doors'],
  }),

  B('youth-festival', 'Contingent', 'A week of art forms, a dozen contingents, and one championship at the end of it.', {
    about: 'University-level and governed by its own rule book: a published list of art forms, fixed entries per contingent and an overall championship. The plan is built around the rule book, never over it.',
    formats: CAMPUS,
    ask: [
      ORGANISER, OPEN_TO, CROWD, FEST_DAYS, CAMPUS_PLACE,
      Q('art_forms', 'Which groups of art forms?', 'many', { options: [['music', 'Music'], ['dance', 'Dance'], ['theatre', 'Theatre'], ['literary', 'Literary'], ['fine_arts', 'Fine arts'], ['folk', 'Folk and traditional']] }),
      Q('contingents', 'How many contingents?', 'select', { options: [['6', 'Up to 6'], ['15', 'Up to 15'], ['30', 'Up to 30'], ['60', 'More than 30']] }),
      Q('venues_count', 'How many venues are running at once?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['6', 'Six or more']] }),
      JUDGES, ACCOM, REG_DESK, SPONSORS, PERMITS, LATE,
      STAGE_NEED, AV_NEED, GUARD, AID, SEATS, AWARDS, PHOTOS, VIDEO, REFRESH, RIDES, CLEAN,
    ],
    plan: [
      S('sound_av', 'recommended', 'Equip', 'Matched sound at every venue, so no contingent is disadvantaged'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stages, green rooms, fine-arts tables and the judging setups'),
      S('guest_services', 'recommended', 'Receive', 'A desk per contingent: entries, slots, venues and a liaison'),
      S('invitation_printing', 'recommended', 'Publish', 'The rule book, entry forms, schedules, score sheets and certificates'),
      S('event_lighting', 'conditional', 'Light', 'Lighting rigs at the stage venues, matched between them', { when: [ans('art_forms', 'dance', 'theatre', 'folk', 'music')] }),
      S('tent_furniture', 'conditional', 'House', 'Green rooms per contingent, judges’ areas and audience seating', { when: [some(WHEN_SEATS[0], ans('venues_count', '2', '4', '6'))] }),
      S('catering_food', 'conditional', 'Feed', 'Meals for contingents and judges, across every day and venue', { when: WHEN_FED }),
      S('safety_facilities', 'conditional', 'Protect', 'First aid at each venue, washrooms, and the daily clear-up', { when: [some(WHEN_AID[0], WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('security_services', 'conditional', 'Control', 'Venue and gate control across several simultaneous venues', { when: [some(WHEN_GUARD[0], WHEN_BIG[0], WHEN_PUBLIC[0])] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'One crew across a week, several venues and the load-outs', { when: [ans('days', '3', '5')] }),
      S('photography', 'conditional', 'Cover', 'Every venue covered, every day, not just the main stage', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'Finals filmed at each venue, which is what settles a protest', { when: WHEN_FILMED }),
      S('gifts_favours', 'conditional', 'Honour', 'Trophies per art form and the overall championship shield', { when: WHEN_TROPHY }),
      S('passenger_transport', 'conditional', 'Shuttle', 'Shuttles between the stay, the venues and the station', { when: WHEN_RIDE }),
      S('power_cooling', 'conditional', 'Power', 'Power at every venue with a backup feed at the main stage', { when: [some(WHEN_ONGROUND[0], ans('venues_count', '4', '6'))] }),
      S('decoration_floral', 'conditional', 'Brand', 'A festival identity across every venue, and sponsor presence', { when: [some(WHEN_SPONSOR[0], from(1000))] }),
      S('venue', 'conditional', 'Gather', 'Auditoria and halls enough to run the art forms in parallel', { when: WHEN_OFFSITE }),
    ],
    addons: [
      X('rule_book', 'Codify', 'The rule book and entry limits published before registration opens', 'invite', { trade: 'invitation_printing' }),
      X('contingent_liaison', 'Attach', 'A named student liaison per contingent for the whole week', 'group', { experience: true }),
      X('championship_tally', 'Tally', 'A running championship board, updated as each result comes in', 'poll', { trade: 'invitation_printing', when: WHEN_JUDGED }),
      X('contingent_stay', 'House', 'Accommodation for contingents — you arrange, we plan around it', 'bed', { experience: true, when: [ans('accommodation', 'yes')] }),
      X('protest_process', 'Resolve', 'A written protest process with a fixed window and a named panel', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'Publish the rule book, the entry limits and the protest process before registration. Everything that goes wrong at a youth festival is a rule that was never written down.' },
    timeline: {
      before: ['Rule book, entry limits and schedule published', 'Judges confirmed per art form, from outside the contingents', 'Venues matched for sound and lighting so none is favoured'],
      during: ['A liaison with each contingent all week', 'Results published per event, championship board updated', 'Protests handled in the written window, not at the closing'],
      after: ['Championship declared with the full tally published', 'Certificates to every participant', 'Venues cleared and restored'],
    },
    checklist: ['Rule book published before registration', 'Judges confirmed per art form', 'Venues matched for sound and light', 'Protest process written and published'],
  }),

]

export const COLLEGE_BLUEPRINT = Object.fromEntries(COLLEGE_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(COLLEGE_BLUEPRINTS, 'college')
