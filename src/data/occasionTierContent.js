// What a scale actually contains — for THIS occasion.
//
// ── The bug this fixes ──────────────────────────────────────────────────
// celebrationTiers.js describes each rung once, generically, and every surface
// printed that description verbatim. So somebody planning a baby shower for
// eight hundred people was shown "Marquee, mandap and full floral
// installation" and "Banana-leaf service with a serving team per section" —
// a wedding, described at their guest count, with their occasion's name on the
// tab. A naming ceremony at 450 guests promised "Three live counters and a
// dessert station"; a corporate townhall at 220 promised "Guest seating,
// lighting and sound" and said nothing about a screen, a mic or a schedule.
//
// The ladder was right. The words on it were a wedding's.
//
// ── Why bands rather than 120 hand-written blocks ───────────────────────
// Fifteen occasions times eight rungs is a hundred and twenty descriptions,
// and nobody keeps a hundred and twenty paragraphs honest. But the rungs do
// not vary continuously — they change SETTING at four points, and the setting
// is what decides the content:
//
//   `home`       10–75      a house, a terrace, a clubhouse, a small hall
//   `hall`       75–300     a booked hall with a real stage and a buffet
//   `production` 300–1200   a marquee or a large hall, a crew, a build day
//   `operation`  1200–3500  a planned operation where logistics is the event
//
// A birthday at 25 and a birthday at 60 are the same kind of afternoon at two
// sizes; a birthday at 25 and a birthday at 450 are different events. So the
// copy is authored per band — sixty blocks, each one about a real occasion at
// a real size — and the rung's own arithmetic is appended as a line that moves
// on every single tier (see menuScaleLine).
//
// ── Two rules the copy follows ──────────────────────────────────────────
// Nothing here promises anything the tier does not already price. These lines
// describe the same booking that buildQuote() costs: the tier's decor level,
// its menu allowance, its services filtered through the occasion (see
// tierServicesFor in occasionPackages.js). A highlight naming a purohit on an
// occasion whose profile carries no `priest` essential would be a sentence the
// invoice does not back.
//
// And where a scale is genuinely unusual for an occasion, the copy says so
// rather than pretending. A seemantham for two thousand people is rare; the
// rung still exists, because families with two thousand relatives exist, but
// the page is allowed to be honest that it is not the common shape.

import { CELEBRATION_TIERS } from './celebrationTiers'

/**
 * Which band a rung belongs to.
 *
 * Derived from the ladder rather than typed out, so a new tier inserted into
 * CELEBRATION_TIERS lands in the right band by its guest count instead of
 * silently falling through to the fallback copy.
 */
const BAND_CEILINGS = [
  { band: 'home',       maxGuests: 75 },
  { band: 'hall',       maxGuests: 300 },
  { band: 'production', maxGuests: 1200 },
  { band: 'operation',  maxGuests: Infinity },
]

export function bandForTier(tier) {
  if (!tier?.guests) return 'hall'
  return BAND_CEILINGS.find(b => tier.guests.max <= b.maxGuests)?.band ?? 'operation'
}

/**
 * The occasion copy.
 *
 * `description` is one sentence: where it happens and what the day is shaped
 * like at this size. `highlights` are three to five things that are true of
 * this occasion at this size and would not be true of a different occasion —
 * a homa kunda, a smash cake, an LED screen, a mehendi artist. If a line could
 * be moved to another occasion without anyone noticing, it is the wrong line.
 *
 * ── Why some highlights are objects ─────────────────────────────────────
 * A band covers two rungs, and the two rungs do not always book the same
 * services: videography starts at Special Day, an emcee and guest transport at
 * Grand, live music and makeup at Royal Mysuru. So a flat string that reads
 * "Photography and video across the whole day" is true at the top of the band
 * and a lie at the bottom of it — the customer would be reading a promise the
 * estimate below it does not contain.
 *
 * `{ text, needs }` fixes that without weakening the copy: the line is printed
 * only when the rung's own service list contains `needs`. So an upanayanam at
 * Royal Mysuru says "Nadaswaram through the rites" and the same band at Grand
 * simply does not — rather than both saying it and one of them being wrong.
 *
 * `needs` is checked against the SAME list tierServicesFor() hands to
 * buildQuote(), so a line can never outlive the service that pays for it.
 */
export const OCCASION_TIER_COPY = {
  // ── Birthdays ────────────────────────────────────────────────────────
  birthday: {
    home: {
      description:
        'At home, on the terrace or in the clubhouse — balloons up before anyone arrives, the cake on a table of its own, and the kitchen someone else’s problem.',
      highlights: [
        'A balloon arch and a decorated cake table',
        'Snacks, a hot main course and the cake cut on time',
        // No DJ or photographer promised outright at this band — both first
        // appear in the tier's services at The Full Celebration. Where a rung
        // does carry them, the gated lines below say so.
        'A games corner and a props box for the children',
        'Set up before your guests arrive, cleared after they leave',
        { text: 'A photographer through the cake and the games', needs: 'photography' },
      ],
    },
    hall: {
      description:
        'A hall with a real stage, a themed backdrop that the photographs get taken against, and a buffet that keeps coming while the party runs itself.',
      highlights: [
        'Themed backdrop, entrance and a photo corner',
        'Buffet service with staff, plus a dessert table',
        'DJ and a games segment, with someone running it',
        'Return gifts packed and handed out at the door',
      ],
    },
    production: {
      description:
        'A production. Designed stage, lighting, several counters and a floor that fills — the birthday people bring up again the following week.',
      highlights: [
        'Designed stage with truss lighting and an LED backdrop',
        'A dessert station and a photo booth with props',
        'DJ, emcee and performers through the evening',
        'Photography across the whole night',
        { text: 'Video coverage, cut into a film afterwards', needs: 'videography' },
        'Parking and guest arrival coordinated',
      ],
    },
    operation: {
      description:
        'Community-hall scale — a milestone birthday or a felicitation the whole town is invited to, run to a timetable rather than to a mood.',
      highlights: [
        'Parallel serving lines, so no queue ever forms',
        'Stage, sound and an emcee holding the order of events',
        'Seating in batches, parking and crowd marshals',
        'Full photo and video crew with drone coverage',
      ],
    },
  },

  first_birthday: {
    home: {
      description:
        'At home, in the hour before the nap — a soft themed corner at the baby’s height, food the grandparents will happily eat, and someone photographing all of it.',
      highlights: [
        'A themed corner built around the baby, low enough to photograph',
        'A smash cake for the baby and a cake for everyone else',
        'A pure-veg spread the elders eat without asking questions',
        'Photographs of the cake, the cradle and every relative present',
      ],
    },
    hall: {
      description:
        'A small hall: a themed stage the baby can be photographed against from every side, and a menu split between what the elders eat and what the cousins want.',
      highlights: [
        'A themed stage with a name board and a month-by-month photo wall',
        'Smash cake, family cake and a dessert table',
        'A kids’ corner with someone watching it',
        'Photography through the ceremony and the cake',
        { text: 'Video of the ceremony and the cake cut', needs: 'videography' },
      ],
    },
    production: {
      description:
        'A full hall function — most of the extended family, a stage, and the annaprashana or the naming done properly before the party half begins.',
      highlights: [
        'Stage, floral setup and a photo wall of the first year',
        'A ritual corner for the annaprashana, if you are keeping it',
        'A counter the children will actually eat from',
        'A photo team, with the cake cut covered from two angles',
        { text: 'Video coverage of the ceremony and the party', needs: 'videography' },
        'Guest seating, lighting and sound',
      ],
    },
    operation: {
      description:
        'Kept as a full village function. Rare at this size, and the seating and serving are what change — not the hour that actually matters.',
      highlights: [
        'Staggered seatings, elders served first',
        'Marquee, stage and shade across the whole gathering',
        'A quiet, cooled corner for the baby away from the crowd',
        'Multiple serving lines with a team per section',
        'A full photo crew',
        { text: 'Video crew with drone coverage', needs: 'videography' },
      ],
    },
  },

  // ── The rites around a birth ─────────────────────────────────────────
  baby_shower: {
    home: {
      description:
        'At home in the afternoon — a soft floral corner for the mother-to-be, the sweets she has been asking for, and nothing at all for her to carry.',
      highlights: [
        'A floral seat and backdrop for the mother-to-be',
        'The traditional sweets and savouries, made fresh that morning',
        'Bangles, flowers and haldi-kumkum for the guests',
        'Photographs of the whole family together',
      ],
    },
    hall: {
      description:
        'A small hall or clubhouse: the blessing done first with the elders, then a full lunch, in a room styled softly enough to photograph well.',
      highlights: [
        'A styled seat, floral arch and a decorated blessing corner',
        'Full traditional lunch, served to seat rather than queued for',
        'Return bags with bangles, flowers and sweets',
        'Photography through the blessing and the meal',
      ],
    },
    production: {
      description:
        'The version both families attend in full — a designed stage, a proper spread, and a team large enough that nobody stands about waiting to be fed.',
      highlights: [
        'A designed stage and full floral installation for the seat',
        'Traditional music through the blessing',
        'Banana-leaf or buffet service, whichever your family keeps',
        'Return bags and thamboolam for every guest',
        'Photography covering both families, not only the couple’s side',
        { text: 'Video coverage of the blessing', needs: 'videography' },
      ],
    },
    operation: {
      description:
        'Uncommon at this size and we will say so — but if both families are large, this is the scale that actually seats them.',
      highlights: [
        'Staggered seatings so nobody waits standing',
        'A shaded, seated area for elders and the mother-to-be',
        'Marquee, stage and full floral setup',
        'Multiple serving lines with a team per section',
        'Parking, crowd flow and a hospitality desk',
      ],
    },
  },

  seemantham: {
    home: {
      description:
        'At home with the elders — the purohit, the bangle ceremony and a leaf meal, the whole sequence done inside one morning.',
      highlights: [
        'The purohit and every ritual item, arranged in order',
        'The bangle ceremony with the flowers and the silk',
        'A pure-veg leaf meal for the family',
        'Photographs of the rites and of the family together',
      ],
    },
    hall: {
      description:
        'A small hall: the homa at the muhurat, the bangle ceremony after it, and a full lunch for both families in the same room.',
      highlights: [
        'Homa kunda, ritual corner and floral seat set before the muhurat',
        'Bangles, flowers, thamboolam and the traditional gifts',
        'Full leaf meal for both families',
        'Photography across the whole sequence',
        { text: 'Video of the rites, start to finish', needs: 'videography' },
      ],
    },
    production: {
      description:
        'Both families in full — the rites kept to the muhurat, a stage for the blessings, and a leaf meal served in seatings so the elders eat first.',
      highlights: [
        'A designed ritual stage with the full floral installation',
        { text: 'Nadaswaram or classical accompaniment through the rites', needs: 'live_music' },
        'Banana-leaf service in seatings, elders first',
        'Thamboolam bags packed for every guest',
        'A photo team across both halves of the day',
        { text: 'Video of the rites and the meal', needs: 'videography' },
      ],
    },
    operation: {
      description:
        'Community scale, still kept as a rite rather than a party. The sequence does not change; the seating and the serving are what have to be planned.',
      highlights: [
        'Staggered leaf-meal seatings, so nobody waits standing',
        'Marquee, ritual stage and shade for the whole gathering',
        'Multiple serving lines with a team per section',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  naming_ceremony: {
    home: {
      description:
        'At home on the eleventh or the twelfth day — the purohit, the cradle, the name said into the ear, and a meal for whoever came for it.',
      highlights: [
        'A purohit who performs the namakarana properly',
        'A decorated cradle and a floral ritual corner',
        'A pure-veg meal for everyone present',
        { text: 'Photographs of the naming and the cradle', needs: 'photography' },
      ],
    },
    hall: {
      description:
        'A small hall: the rite in the morning, the cradle ceremony after it, and a full leaf meal for the extended family before anybody leaves.',
      highlights: [
        'Homa, namakarana and the cradle ceremony in order',
        'Cradle, floral arch and a name board for the photographs',
        'Full leaf meal, served to seat',
        'Photography through the rite',
        { text: 'Video of the naming and the cradle ceremony', needs: 'videography' },
      ],
    },
    production: {
      description:
        'The whole family and both sides of the village — the rite at the muhurat, then a spread served fast enough that no queue ever forms.',
      highlights: [
        'A designed ritual stage with cradle and full floral setup',
        { text: 'Nadaswaram through the ceremony', needs: 'live_music' },
        'Banana-leaf service in seatings',
        'Thamboolam and return gifts for every guest',
        'Photo and video team from the homa to the meal',
      ],
    },
    operation: {
      description:
        'Rare at this size, and entirely real when the family is large. The rite stays exactly as it is; everything around the rite becomes an operation.',
      highlights: [
        'Staggered leaf-meal seatings across the afternoon',
        'Marquee, ritual stage and shade for the whole gathering',
        'Multiple serving lines with a team per section',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  thread_ceremony: {
    home: {
      description:
        'At home — the homa, the thread, the bhiksha, and a leaf meal for the family who travelled for it.',
      highlights: [
        'The full vaidika sequence performed by a purohit',
        'Homa kunda, ritual seating and the samagri laid out in order',
        'A pure-veg leaf meal for the family',
        { text: 'Photographs of the homa and the thread', needs: 'photography' },
      ],
    },
    hall: {
      description:
        'A hall for the morning: the homa at the muhurat, the bhiksha after it, and a full leaf meal for both sides of the family.',
      highlights: [
        'Homa kunda, pandal and ritual seating built the evening before',
        'Every samagri item sourced and laid out in sequence',
        'Full banana-leaf meal, served to seat',
        'Photography across the whole vaidika sequence',
        { text: 'Video of the homa and the thread ceremony', needs: 'videography' },
      ],
    },
    production: {
      description:
        'The full upanayanam — a pandal, the sequence run to the muhurat, and several hundred people served on leaf without a queue forming.',
      highlights: [
        'Traditional pandal with the full floral installation',
        { text: 'Nadaswaram and the traditional accompaniment through the rites', needs: 'live_music' },
        'Banana-leaf service in seatings, with a team per section',
        'Thamboolam and return gifts for every guest',
        'Photo and video team from the homa to the last seating',
      ],
    },
    operation: {
      description:
        'Community scale — often several boys in one sitting. The vaidika sequence is unchanged; the marquee, the seatings and the serving lines are the work.',
      highlights: [
        'Multiple homa kundas and ritual seating, if more than one boy',
        'Marquee, shade and seating for the full gathering',
        'Staggered leaf-meal seatings across parallel serving lines',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  // ── The house ────────────────────────────────────────────────────────
  housewarming: {
    home: {
      description:
        'The ganahoma, the milk boiling over at the muhurat, and a meal cooked for everyone in a house whose kitchen is not set up yet.',
      highlights: [
        'Ganahoma and the milk-boiling, timed to your muhurat',
        'Rangoli, toran and the entrance done properly',
        'A full meal cooked on site without touching your new kitchen',
        'The house cleaned and cleared before you sleep in it',
      ],
    },
    hall: {
      description:
        'Still at the house, only a much fuller one — a shamiana over the drive or the terrace, seating for the neighbours, and lunch running in sittings.',
      highlights: [
        'Ganahoma and the milk-boiling at the muhurat',
        'A shamiana over the drive or terrace, with seating and fans',
        'Lunch in sittings, cooked on site',
        'Floral entrance, rangoli and the name-board unveiling',
        'Full cleanup, inside the house and out',
      ],
    },
    production: {
      description:
        'A griha pravesh run as a function: the rite at the house in the morning, a hall or a marquee for the lunch, and one team holding both ends of it.',
      highlights: [
        'Ganahoma at the house, kept exactly to the muhurat',
        'A marquee or hall for the meal, with full seating',
        'Banana-leaf or buffet service in sittings',
        'Floral entrance, rangoli and pooja setup at the house',
        'Photography of the rite and the family together',
      ],
    },
    operation: {
      description:
        'The rite at the house, the meal at community scale — two locations, one timeline, and a crew that is at the second one before the first one ends.',
      highlights: [
        'Ganahoma at the house while the marquee is already serving',
        'Staggered seatings across parallel serving lines',
        'Marquee, shade, water and power for the full gathering',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full cleanup at both locations',
      ],
    },
  },

  // ── The couple ───────────────────────────────────────────────────────
  anniversary: {
    home: {
      description:
        'A table for two, or dinner at home for the people who were there the first time — candles, the cake, and nothing to wash up afterwards.',
      highlights: [
        'A candlelit setup, indoors or on the terrace',
        'An anniversary cake and a proper course meal',
        'The music you were married to, at a volume you can talk over',
        'Everything set up before you arrive and cleared after',
      ],
    },
    hall: {
      description:
        'A hall with a stage, your photographs on the wall behind it, and most of the people who were at the wedding back in one room.',
      highlights: [
        'A stage and a photo wall of the years since',
        'The cake, the toast and the first song',
        'Buffet with serving staff and a dessert table',
        'Photography through the evening',
      ],
    },
    production: {
      description:
        'A silver or golden anniversary done as a full function — a designed stage, a felicitation, and the whole extended family fed properly.',
      highlights: [
        'Designed stage with lighting, and a memory wall of the years',
        'Felicitation and speeches, with an emcee holding the order',
        { text: 'Live music or a band for the evening', needs: 'live_music' },
        'A dessert station and a late-night counter',
        'Photo and cinematic video coverage',
      ],
    },
    operation: {
      description:
        'The whole village or the whole company invited. At this size the anniversary is a public function, and it is planned like one.',
      highlights: [
        'Staggered seatings across parallel serving lines',
        'Stage, sound and an emcee running the felicitation',
        'Marquee or hall with full seating and shade',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  engagement: {
    home: {
      description:
        'At the house or a small hall — the rings exchanged in front of the people who matter, the plates and the thamboolam done properly, then lunch.',
      highlights: [
        'A floral seat and backdrop for the ring exchange',
        'A ceremony corner for the elders and the exchange of plates',
        'Lunch for both families, served to seat',
        'Photographs of both sides, not only the couple',
      ],
    },
    hall: {
      description:
        'A banquet hall, a real stage for the exchange, and a meal that both families will quietly judge you on. The first event they attend together.',
      highlights: [
        'A styled stage for the ring exchange',
        'Entrance arch, family seating and a photo corner',
        'Buffet with serving staff and a dessert table',
        'Thamboolam and return gifts for the guests',
        'Photography through the exchange and the greetings',
        { text: 'Video of the ring exchange and the speeches', needs: 'videography' },
      ],
    },
    production: {
      description:
        'An engagement run like a small wedding — stage, lighting, several hundred guests, and a receiving line that keeps moving all evening.',
      highlights: [
        'Designed stage with lighting and full floral installation',
        'A receiving line and family seating that actually works',
        { text: 'Styling and makeup for the couple, on site', needs: 'makeup' },
        'Thamboolam and return gifts for every guest',
        'Photo and cinematic video team across the whole evening',
      ],
    },
    operation: {
      description:
        'Both families in full, which in some communities is two thousand people. The stage is the easy part; the seating plan is the event.',
      highlights: [
        'Staggered seatings across parallel serving lines',
        'Marquee or convention hall with full seating',
        'Stage, sound and an emcee running the sequence',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Guest transport coordinated', needs: 'transport' },
        'Full photo and video crew with drone coverage',
      ],
    },
  },

  sangeet: {
    home: {
      description:
        'A cleared floor at home or in the clubhouse, a speaker, and mehendi cones going round — the night before, kept to the family.',
      highlights: [
        'A dance floor cleared and lit, indoors or on the terrace',
        'A mehendi artist working through the evening',
        'Sound for the playlist and the family performances',
        'Snacks and a late dinner that keeps coming',
      ],
    },
    hall: {
      description:
        'A hall with a real floor — lights, a DJ, performances that were actually rehearsed, and mehendi running in a corner all evening.',
      highlights: [
        'A lit dance floor with DJ and a proper sound rig',
        'Mehendi artists working through the evening',
        'A stage for the performances, and a running order somebody holds',
        'A late dinner with a live counter',
        'Photography of the floor, not just the stage',
        { text: 'Video of the performances and the dancing', needs: 'videography' },
      ],
    },
    production: {
      description:
        'A full sangeet night — LED wall, choreographed sets, a mocktail bar and a floor that does not empty until somebody stops the music.',
      highlights: [
        'LED wall, truss lighting and a professional sound rig',
        'Choreographed sets, rehearsed rather than improvised',
        'Emcee running the order, DJ after it',
        'A mocktail bar and a late dessert station',
        'Cinematic video of the whole night',
      ],
    },
    operation: {
      description:
        'Sangeet at convention scale. The floor still has to feel full, so the room is zoned rather than simply made bigger.',
      highlights: [
        'A zoned floor — stage, dance floor and seated areas',
        'LED wall, truss lighting and line-array sound',
        'Staggered dinner seatings across parallel serving lines',
        'Parking and arrival flow, planned in advance',
        { text: 'Guest transport coordinated', needs: 'transport' },
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew with drone coverage',
      ],
    },
  },

  wedding: {
    home: {
      description:
        'A small wedding — the muhurat kept exactly, a mandap sized for the room, and a leaf meal for the people who actually came.',
      highlights: [
        'Purohit, muhurat and every ritual in its order',
        'A floral mandap sized for a home or a small hall',
        'A pure-veg leaf meal for the family',
        'Photography through the ceremony',
      ],
    },
    hall: {
      description:
        'A kalyana mantapa, a proper mandap, and a meal served in sittings while the rituals run to the clock rather than behind it.',
      highlights: [
        'Mandap, homa and the full ritual sequence',
        { text: 'Nadaswaram and the traditional accompaniment', needs: 'live_music' },
        'Banana-leaf service in sittings',
        { text: 'Bridal and groom styling on site', needs: 'makeup' },
        'Photography across the whole day',
        { text: 'Video coverage of the muhurat and the reception', needs: 'videography' },
      ],
    },
    production: {
      description:
        'The full day. Mandap, reception stage, several hundred on leaf, and a crew in the hall from the night before so the morning starts on time.',
      highlights: [
        'Mandap and a separate reception stage, both fully floral',
        'The muhurat run to the minute',
        { text: 'Nadaswaram through the ceremony', needs: 'live_music' },
        'Banana-leaf service in sittings, with a team per section',
        { text: 'Bridal and groom styling on site', needs: 'makeup' },
        { text: 'Guest transport coordinated', needs: 'transport' },
        'Multi-camera video, drone and a same-day edit',
      ],
    },
    operation: {
      description:
        'Two thousand guests and a muhurat that cannot move. Past this size the food is the easy part — the seating, the flow and the timing are the event.',
      highlights: [
        'Mandap, reception stage and full floral installation',
        'Staggered leaf-meal seatings across parallel serving lines',
        'Independent water, power backup and a medical point',
        'Parking, guest transport, crowd marshals and a control desk',
        'Full photo and video crew with drone and same-day edit',
      ],
    },
  },

  // ── The rest of life ─────────────────────────────────────────────────
  get_together: {
    home: {
      description:
        'Friends at home or on the terrace — food that keeps arriving, music at a volume people can talk over, and nothing left to wash up.',
      highlights: [
        'Snacks and a hot main course, cooked on site',
        'Seating, crockery and staff to serve it',
        'Music and string lighting for the terrace or the room',
        'Everything cleared before you go to bed',
      ],
    },
    hall: {
      description:
        'A clubhouse or a small hall — a buffet, a live counter, a floor, and somebody other than you keeping an eye on all three.',
      highlights: [
        'Buffet with staff, and a live counter — chaat, grill or pasta',
        'Seating, lounge corners and string lighting',
        'A DJ or your own playlist, plus a photo corner',
        'Setup and clearing both included',
      ],
    },
    production: {
      description:
        'A reunion, an association day or a residents’ function — several counters, a stage for the announcements, and parking that actually works.',
      highlights: [
        'Multiple counters and a dessert station',
        'A stage with sound, for the announcements and the games',
        'Seating, lighting and a photo booth',
        'Parking and arrival flow coordinated',
        { text: 'Guest transport coordinated', needs: 'transport' },
        'Photography and video through the evening',
      ],
    },
    operation: {
      description:
        'Association or community scale. At this size a get-together is a public event, and the queue is the thing everyone will remember if you get it wrong.',
      highlights: [
        'Parallel serving lines, so no queue forms',
        'Marquee or hall with seating and shade for everyone',
        'Stage, sound and an emcee running the programme',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  retirement: {
    home: {
      description:
        'The team and the family in one room — a tribute wall, a few speeches, and a meal nobody had to organise in their own evenings.',
      highlights: [
        'A photo wall of the years',
        'A small stage for the felicitation and the speeches',
        'A meal the colleagues and the family both enjoy',
        'Photographs of the felicitation and the group',
      ],
    },
    hall: {
      description:
        'A hall with a stage, a screen for the tribute film, and an order of events somebody else is keeping to time so the speeches do not run over.',
      highlights: [
        'Stage, screen and mics for the speeches and the film',
        'A tribute wall and the memento presentation',
        'Buffet with serving staff and a dessert table',
        { text: 'An emcee holding the order of events', needs: 'emcee' },
        'Photography of the felicitation',
        { text: 'Video of the speeches and the presentation', needs: 'videography' },
      ],
    },
    production: {
      description:
        'An institutional send-off — a large hall, an AV setup that works first time, a felicitation and dinner for the whole department and their families.',
      highlights: [
        'Stage, LED screen and professional sound, tested before the room fills',
        'Tribute film, memento presentation and a citation reading',
        'Multiple counters and a dessert station',
        'An emcee, and a printed order of events',
        'Multi-camera video of the felicitation',
      ],
    },
    operation: {
      description:
        'A whole institution turning out. The felicitation is twenty minutes; getting two thousand people seated, fed and away is the rest of it.',
      highlights: [
        'Staggered dinner seatings across parallel serving lines',
        'Stage, LED screen, line-array sound and an emcee',
        'Registration and seating by department or batch',
        'Parking and a hospitality desk, planned in advance',
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew',
      ],
    },
  },

  graduation: {
    home: {
      description:
        'At home — the cap, the certificate, a cake, and the friends who turn up after the family has eaten.',
      highlights: [
        'A photo wall for the cap, the gown and the certificate',
        // Live counters start at The Full Celebration; at this band the menu
        // line below already says the food is cooked fresh on site.
        'Food the friends will actually eat, and a proper meal for the family',
        'A cake, a toast and a decorated corner for the photographs',
        'Photographs of the family and the friends both',
      ],
    },
    hall: {
      description:
        'A hall that holds the family and the friends in the same evening — a stage, a photo wall, counters, and a floor for after the speeches.',
      highlights: [
        'A stage and a photo wall for the cap and the certificate',
        'Buffet with a live counter the friends will queue at happily',
        'DJ and a floor for after the formal half',
        'A photo booth with props',
        'Photography through the evening',
        { text: 'Video coverage, cut into a film afterwards', needs: 'videography' },
      ],
    },
    production: {
      description:
        'A batch party or a convocation night — stage, screens, several counters, and a crowd that arrives all at once and expects to eat immediately.',
      highlights: [
        // No screen line anywhere in graduation: `av_setup` is not in this
        // occasion's offered services, so a projector would be a promise
        // tierServicesFor() strips back out before the quote is built.
        'Stage, truss lighting and a professional sound rig',
        'A dessert station and a late-night counter',
        'DJ, emcee and a floor that runs late',
        'A photo booth and a batch photo wall',
        'Multi-camera video with a same-day edit',
      ],
    },
    operation: {
      description:
        'Convocation scale. Everyone arrives in the same fifteen minutes, so the serving lines and the seating plan are the whole job.',
      highlights: [
        'Parallel serving lines and staggered seatings',
        'Stage, truss lighting and line-array sound',
        'Registration, batch seating and a hospitality desk',
        'Parking and arrival flow, planned in advance',
        { text: 'Guest transport coordinated', needs: 'transport' },
        { text: 'Crowd marshals on site', needs: 'bouncers' },
        'Full photo and video crew with drone coverage',
      ],
    },
  },

  corporate_event: {
    home: {
      description:
        'A boardroom or a small offsite — AV that works, a working lunch that covers every diet in the room, and nobody from your team running about.',
      highlights: [
        'Projector, screen and mics tested before the room fills',
        'Working lunch with veg, non-veg and Jain options',
        'Registration desk, name badges and signage',
        'One point of contact, and a GST invoice',
      ],
    },
    hall: {
      description:
        'A conference room or a banquet hall — stage, screens, a schedule that is actually kept, and a spread that suits every diet on the team.',
      highlights: [
        'Stage, LED screen and mics, run by a technician on site',
        'Registration, signage and a hospitality desk',
        'Tea breaks and lunch timed to the agenda, not to the kitchen',
        'Photography of the sessions and the awards',
        'GST invoice and a single point of contact',
      ],
    },
    production: {
      description:
        'An annual day, a product launch or a townhall — lighting, an emcee, entertainment slots, and a thousand people through dinner without the programme slipping.',
      highlights: [
        'Truss lighting, LED wall and a professional sound rig',
        'Emcee, awards sequence and entertainment slots',
        'Multiple counters and a beverage station',
        'Guest transport, parking and security',
        'Multi-camera video with a same-day edit',
      ],
    },
    operation: {
      description:
        'Convention scale — a schedule, thousands of delegates, and a control desk that knows which hall every one of them is meant to be in.',
      highlights: [
        'Parallel registration lines and delegate kits',
        'Staggered meal seatings, so sessions restart on time',
        'Independent power backup and a medical point',
        'Crowd marshals, parking and an on-site control desk',
        'Full photo and video crew with drone coverage',
      ],
    },
  },
}

/**
 * For an occasion this table has not been taught yet — including festivals and
 * anything routed here through occasionMap's fallback.
 *
 * Deliberately about the SETTING rather than the celebration, because that is
 * the only thing that can be said truthfully without knowing what is being
 * celebrated. Vague copy that pretends to be specific is worse than plain copy
 * that admits its scope.
 */
const FALLBACK_COPY = {
  home: {
    description:
      'At home, on a terrace or in a small hall — cooked fresh on site, set up before your guests arrive and cleared after they leave.',
    highlights: [
      'Cooked and served where you are holding it',
      'Simple, well-finished decor at the entrance and the main table',
      'Seating, crockery and staff to serve',
      'Full cleanup afterwards',
    ],
  },
  hall: {
    description:
      'A booked hall with a real stage, a buffet with staff behind it, and a setup that photographs well without taking over the room.',
    highlights: [
      'Styled stage, entrance arch and guest tables',
      'Buffet service with staff, plus a dessert table',
      'Photography through the main hours',
      'A venue visit before the day',
    ],
  },
  production: {
    description:
      'A production. Staged lighting, a designed backdrop, several counters, and a crew that arrives the night before to build it.',
    highlights: [
      'Designed stage with lighting and full floral installation',
      'Seating, sound and lighting for the whole room',
      'Full photo and cinematic video team',
      'Guest transport and parking coordinated',
    ],
  },
  operation: {
    description:
      'Past a certain size the food is the easy part. This is a planned operation: staggered seating, its own water and power, and a control desk.',
    highlights: [
      'Parallel serving lines, so no queue forms',
      'Marquee, stage and seating for the whole gathering',
      'Independent water, power backup and a medical point',
      'Parking, crowd marshals and a control desk on site',
      'Full photo and video crew with drone coverage',
    ],
  },
}

/** Total dishes the tier's allowance buys, counters excluded — they are their own line. */
function dishCount(tier) {
  const a = tier?.menuAllowance ?? {}
  return (a.welcome ?? 0) + (a.starters ?? 0) + (a.mains ?? 0) + (a.curries ?? 0)
    + (a.accompaniments ?? 0) + (a.sweets ?? 0)
}

const COUNTER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

/**
 * "An 11-dish", "A 16-dish".
 *
 * Article by how the number is *said*, not by its first digit — 8, 11 and 18
 * are the only starts in this range that take "an", and the range is 11–55.
 */
function article(n) {
  return /^(8|11|18)/.test(String(n)) ? 'An' : 'A'
}

/**
 * The one line that moves on EVERY rung.
 *
 * The band copy is shared by the two tiers inside a band, which is right — a
 * birthday at 25 and one at 60 are the same afternoon. But two adjacent cards
 * with an identical bullet list read as a bug, so each rung states the thing
 * that genuinely separates it from its neighbour: how much food it buys.
 *
 * Both halves come from the tier's own menuAllowance, so this line cannot drift
 * away from what buildQuote() actually prices.
 */
export function menuScaleLine(tier) {
  const dishes = dishCount(tier)
  const counters = tier?.menuAllowance?.counters ?? 0
  if (!dishes) return null
  const head = `${article(dishes)} ${dishes}-dish menu`
  if (counters === 0) return `${head}, cooked fresh on site`
  if (counters === 1) return `${head} and one live counter`
  return `${head} and ${COUNTER_WORDS[counters] ?? counters} live counters`
}

/** Drop the `{ text, needs }` lines this rung cannot pay for; flatten the rest. */
function resolveHighlights(entries, serviceIds) {
  const have = new Set(serviceIds ?? [])
  const out = []
  for (const entry of entries) {
    if (typeof entry === 'string') { out.push(entry); continue }
    const needs = Array.isArray(entry.needs) ? entry.needs : [entry.needs]
    if (needs.every(id => have.has(id))) out.push(entry.text)
  }
  return out
}

/**
 * What this rung means for this occasion.
 *
 * Returns the same two fields the generic tier carries — `description` and
 * `highlights` — so every surface can swap one for the other without changing
 * its markup. Callers with no occasion in hand (the home rail, which sells the
 * ladder itself before anybody has said what they are celebrating) pass no
 * eventId and keep the generic copy on the tier.
 *
 * `serviceIds` is what this rung actually books for this occasion — pass
 * tierServicesFor(eventId, tier) from occasionPackages.js. It is a parameter
 * rather than something computed here so that this module stays free of the
 * pricing chain: occasionPackages imports THIS file, so importing it back
 * would close a cycle. Omit it and the gated lines fall back to the tier's own
 * generic service list, which is right for the ladder-only surfaces.
 */
export function tierContentFor(eventId, tier, serviceIds) {
  if (!tier) return { description: '', highlights: [] }

  const table = OCCASION_TIER_COPY[eventId] ?? FALLBACK_COPY
  const band = bandForTier(tier)
  const copy = table[band] ?? FALLBACK_COPY[band] ?? FALLBACK_COPY.hall

  const highlights = resolveHighlights(copy.highlights, serviceIds ?? tier.includedServices)
  const scaleLine = menuScaleLine(tier)
  if (scaleLine) highlights.push(scaleLine)

  return { description: copy.description ?? tier.description, highlights }
}

/** Whether an occasion has been given its own copy, rather than the fallback. */
export function hasOccasionCopy(eventId) {
  return Boolean(OCCASION_TIER_COPY[eventId])
}

/**
 * Dev-only guard: every rung in the ladder must resolve to a band that every
 * occasion table actually defines. A tier added to celebrationTiers.js with a
 * guest range outside the four bands would otherwise fall silently back to the
 * generic copy this file exists to replace.
 */
if (import.meta.env?.DEV) {
  const bands = new Set(CELEBRATION_TIERS.map(bandForTier))
  for (const [eventId, table] of Object.entries(OCCASION_TIER_COPY)) {
    for (const band of bands) {
      if (!table[band]) {
        console.warn(`[occasionTierContent] ${eventId} has no "${band}" copy — falling back to generic.`)
      }
    }
  }
}
