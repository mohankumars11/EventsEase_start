import { OPERATION_SCREENS as CATERING_SCREENS } from './cateringOperations'

// How every partner actually works — not just caterers.
//
// ══════════════════════════════════════════════════════════════════════
// THE GAP THIS CLOSES
// ══════════════════════════════════════════════════════════════════════
//
// Counted before this file existed:
//
//   Catering & Food        34 questions
//   Every other trade      1 to 3.  Median: 2.
//
// A photographer was asked what they shoot and what it costs. Nothing
// about how far they travel, how much notice they need, whether they
// bring lighting, whether they will work a 4am muhurta, or whether the
// second shooter is real. Dispatch then offered them jobs on all of it
// and found out by failing.
//
// That asymmetry was not a decision. Catering got a funnel because
// somebody sat down with catering; the other twenty-three got whatever
// fitted in a spec group.
//
// ══════════════════════════════════════════════════════════════════════
// SIX SCREENS THAT ARE THE SAME EVERYWHERE
// ══════════════════════════════════════════════════════════════════════
//
// Reading catering's seven screens back, six of them are not about food
// at all. They are about running a business that turns up somewhere:
//
//   SCALE    how big can you go, and how many in a day
//   NOTICE   how much warning do you need
//   WHERE    how far do you travel, and to what kind of venue
//   BRINGS   what you arrive with, and what the venue must provide
//   LIMITS   what you will not do
//   TRUST    team, licences, years, insurance
//
// Only "How is it served?" was genuinely catering's own.
//
// So the spine is shared and the CONTENT is per trade. A photographer's
// scale question is hours and deliverables; a tent supplier's is square
// feet and how many chairs. Same screen, same component, same stored
// shape — and one place to add a screen for everyone.
//
// ══════════════════════════════════════════════════════════════════════
// WHY THESE QUESTIONS AND NOT OTHERS
// ══════════════════════════════════════════════════════════════════════
//
// Every question here has to earn its screen by preventing a WRONG JOB.
// "How many years have you been doing this" is interesting; "will you
// start at 4am" decides whether a muhurta booking works. A form that
// asks interesting questions instead of deciding ones is a form partners
// stop finishing.
//
// The test applied to each one: if two partners answer it differently,
// should dispatch send them different jobs? If no, it is not here.
//
// ── The exact-number field ────────────────────────────────────────────
// `exact` puts a typed number beside the chips, sharing one value. Bands
// like "6 or more" covered a house function and a wedding identically.
// See AddItemFlow's OperationsStep.

/* ── The spine ─────────────────────────────────────────────────────── */
export const OPERATION_SPINE = [
  {
    id: 'scale',
    title: 'How big do you go?',
    why: 'So we never send you a job too small to be worth it, or too big to deliver.',
  },
  {
    id: 'notice',
    title: 'How much notice do you need?',
    why: 'Instant bookings go to whoever can actually start in time.',
  },
  {
    id: 'where',
    title: 'Where do you work?',
    why: 'A job across the city in traffic is a different job. Say once, and it is honoured.',
  },
  {
    id: 'brings',
    title: 'What do you bring?',
    why: 'The gap between what you carry and what the venue has is where events go wrong.',
  },
  {
    id: 'limits',
    /* ══════════════════════════════════════════════════════════════════
       THE MOST VALUABLE SCREEN, FOR EVERY TRADE
       ══════════════════════════════════════════════════════════════════
       A partner who says no to something gets fewer offers and better
       ones, and every no removes a job they would have failed. Saying it
       here costs nothing and is honoured every time — which is the whole
       reason it is worth answering honestly. */
    title: 'What will you not do?',
    why: 'Nothing here counts against you. Every no makes the yeses fit.',
  },
  {
    id: 'trust',
    title: 'What should we know about you?',
    why: 'What an operator checks before your first job, asked once instead of on the phone.',
  },
]

/* Shorthands, because this file is mostly data and the noise matters. */
const one = (id, question, choices, extra = {}) =>
  ({ id, question, type: 'one', choices, ...extra })
const many = (id, question, choices, extra = {}) =>
  ({ id, question, type: 'multi', choices, ...extra })
const c = (id, label, scan) => (scan ? { id, label, scan } : { id, label })

/* Asked of nearly everyone, so it is written once. A trade that needs a
   different version overrides it by using its own id. */
const NOTICE = one('lead_time', 'Shortest notice you can accept', [
  c('same_day', 'Same day', 'You can be there today'),
  c('1_day', 'A day'),
  c('3_days', 'Three days'),
  c('1_week', 'A week'),
  c('1_month', 'A month'),
], { exact: { label: 'Or exact days', unit: 'days', max: 365 } })

const TRAVEL = one('travel_km', 'How far will you travel?', [
  c('10', 'Up to 10 km', 'Your own area'),
  c('25', 'Up to 25 km', 'Most of Bengaluru'),
  c('50', 'Up to 50 km', 'And the outskirts'),
  c('outstation', 'Outstation too', 'Mysuru, Coorg, anywhere'),
], { exact: { label: 'Or exact km', unit: 'km', max: 2000 } })

const VENUES = many('venue_types', 'Venues you are comfortable in', [
  c('home', 'Homes and apartments'),
  c('community', 'Community halls'),
  c('kalyana', 'Kalyana mantapas'),
  c('hotel', 'Hotels and banquet halls'),
  c('outdoor', 'Outdoor and farmhouse'),
  c('temple', 'Temples'),
])

const TIMING_LIMITS = many('time_limits', 'Times you will not work', [
  c('early', 'No 4am muhurta starts'),
  c('late', 'Nothing past midnight'),
  c('overnight', 'No overnight jobs'),
  c('none', 'None of these — any time'),
])

const TEAM = one('team_size', 'How many of you are there?', [
  c('1', 'Just me'),
  c('2', 'Two'),
  c('5', 'A team of about five'),
  c('10', 'Ten or more'),
], { exact: { label: 'Or exact number', unit: 'people', max: 999 } })

const YEARS = one('years', 'How long have you been doing this?', [
  c('under_1', 'Under a year'),
  c('1_3', 'One to three years'),
  c('3_10', 'Three to ten years'),
  c('10_plus', 'Over ten years'),
], { exact: { label: 'Or exact years', unit: 'years', max: 99 } })

const GUESTS = (label = 'Largest event you can handle') =>
  one('guests_max', label, [
    c('50', 'Up to 50', 'House functions'),
    c('150', 'Up to 150'),
    c('500', 'Up to 500', 'A full wedding'),
    c('1500', 'Up to 1,500'),
  ], { exact: { label: 'Or exact number', unit: 'guests', max: 99999 } })

const PER_DAY = one('events_per_day', 'How many events in one day?', [
  c('1', 'One'), c('2', 'Two'), c('3', 'Three'),
], { exact: { label: 'Or exact number', unit: 'events', max: 99 } })

const POWER = many('needs_from_venue', 'What must the venue provide?', [
  c('power', 'Power point'),
  c('water', 'Water'),
  c('shade', 'Covered space'),
  c('parking', 'Parking for our vehicle'),
  c('room', 'A room to change or store in'),
  c('nothing', 'Nothing — we are self-contained'),
])

/* ══════════════════════════════════════════════════════════════════════
   THE TRADES
   ══════════════════════════════════════════════════════════════════════

   Keyed by trade name, because that is what vendor_services.category
   stores and what the flow passes around. A trade with no entry falls
   back to the spine's shared questions rather than to nothing. */

export const TRADE_OPERATIONS = {
  'Photography': {
    scale: [
      one('shoot_hours', 'Longest shoot you take in one day', [
        c('4', 'Up to 4 hours'), c('8', 'Up to 8 hours'),
        c('12', 'Full day, 12 hours'), c('multi', 'Multi-day weddings'),
      ], { exact: { label: 'Or exact hours', unit: 'hours', max: 48 } }),
      PER_DAY,
    ],
    notice: [NOTICE, one('delivery_days', 'How long until edited photos are delivered?', [
      c('7', 'Within a week'), c('15', 'Two weeks'),
      c('30', 'A month'), c('45', 'Six weeks'),
    ], { exact: { label: 'Or exact days', unit: 'days', max: 365 } })],
    where: [TRAVEL, VENUES],
    brings: [
      many('kit', 'What you bring', [
        c('second_shooter', 'A second shooter'),
        c('lighting', 'Our own lighting'),
        c('drone', 'Drone'),
        c('backup_bodies', 'Backup camera bodies'),
        c('instant_prints', 'Instant print counter'),
        c('album', 'Printed album'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS, many('wont_shoot', 'Work you do not take', [
      c('no_drone_indoor', 'No indoor drone'),
      c('no_solo_500', 'Not alone above 500 guests'),
      c('no_raw', 'We do not hand over raw files'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Videography': {
    scale: [
      one('crew_size', 'Crew you can put on one event', [
        c('1', 'One'), c('2', 'Two'), c('4', 'Four'), c('6', 'Six or more'),
      ], { exact: { label: 'Or exact', unit: 'people', max: 99 } }),
      PER_DAY,
    ],
    notice: [NOTICE, one('edit_days', 'How long until the edit is delivered?', [
      c('15', 'Two weeks'), c('30', 'A month'),
      c('60', 'Two months'), c('90', 'Three months'),
    ], { exact: { label: 'Or exact days', unit: 'days', max: 365 } })],
    where: [TRAVEL, VENUES],
    brings: [
      many('kit', 'What you bring', [
        c('gimbal', 'Gimbal / steadicam'),
        c('drone', 'Drone'),
        c('crane', 'Crane or jib'),
        c('led_wall', 'Live LED screen feed'),
        c('own_audio', 'Our own audio recording'),
        c('lighting', 'Our own lighting'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS],
  },

  'Decoration & Floral': {
    scale: [
      one('setup_scale', 'Largest setup you take on', [
        c('home', 'Home function'), c('hall', 'A hall stage'),
        c('full_venue', 'A full venue'), c('multi_venue', 'Several venues at once'),
      ]),
      one('setup_hours', 'Hours you need to set up', [
        c('2', 'Two'), c('4', 'Four'), c('8', 'Eight'), c('day_before', 'The day before'),
      ], { exact: { label: 'Or exact hours', unit: 'hours', max: 72 } }),
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('supplies', 'What you supply', [
        c('fresh_flowers', 'Fresh flowers'),
        c('artificial', 'Artificial flowers'),
        c('structures', 'Frames and structures'),
        c('fabric', 'Draping and fabric'),
        c('lighting', 'Decorative lighting'),
        c('furniture', 'Furniture and props'),
        c('teardown', 'Teardown and clearing'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS, many('wont_do', 'Work you do not take', [
      c('no_height', 'No work above ten feet'),
      c('no_thermocol', 'No thermocol'),
      c('no_open_flame', 'No open flame or diyas'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Venue': {
    /* Seated and standing are different numbers and a hall is sold on
       both. A mantapa that seats 300 for the meal holds 900 on their
       feet for the muhurta, and quoting the seated number lost every
       reception enquiry it should have won. */
    scale: [
      one('floating_max', 'Most people who can stand in the hall', [
        c('100', 'Up to 100'), c('300', 'Up to 300'), c('800', 'Up to 800'),
        c('1500', 'Up to 1,500'), c('3000', 'More than 1,500'),
      ], { exact: { label: 'Or exact', unit: 'people', max: 99999 } }),
      GUESTS('Most guests you can seat'),
      one('halls', 'How many halls or spaces?', [
        c('1', 'One'), c('2', 'Two'), c('3', 'Three or more'),
      ], { exact: { label: 'Or exact', unit: 'spaces', max: 99 } }),
    ],
    notice: [NOTICE],
    where: [many('parking', 'Parking on site', [
      c('none', 'None'), c('20', 'Around 20 cars'),
      c('50', 'Around 50 cars'), c('100', 'A hundred or more'),
      c('valet', 'Valet available'),
    ])],
    brings: [many('included', 'What comes with the venue', [
      c('chairs', 'Chairs and tables'),
      c('ac', 'Air conditioning'),
      c('power_backup', 'Power backup'),
      c('kitchen', 'A kitchen caterers can use'),
      c('rooms', 'Rooms for the family'),
      c('sound', 'Basic sound system'),
      c('lift', 'Lift access'),
    ])],
    limits: [
      TIMING_LIMITS,
      many('venue_rules', 'House rules', [
        c('no_outside_catering', 'No outside catering'),
        c('no_nonveg', 'No non-veg on the premises'),
        c('no_alcohol', 'No alcohol'),
        c('no_loud_music', 'No loud music after 10pm'),
        c('no_fire', 'No open flame or crackers'),
        c('none', 'None of these'),
      ]),
    ],
    trust: [YEARS, many('licences', 'Papers you hold', [
      c('trade_licence', 'Trade licence'),
      c('fire_noc', 'Fire NOC'),
      c('bbmp', 'BBMP clearance'),
      c('gst', 'GST registration'),
    ])],
  },

  'Tent & Furniture': {
    scale: [
      one('tent_area', 'Largest area you can cover', [
        c('500', '500 sq ft'), c('2000', '2,000 sq ft'),
        c('5000', '5,000 sq ft'), c('10000', '10,000 sq ft or more'),
      ], { exact: { label: 'Or exact', unit: 'sq ft', max: 999999 } }),
      one('chairs', 'Chairs you can supply', [
        c('100', '100'), c('300', '300'), c('500', '500'), c('1000', '1,000 or more'),
      ], { exact: { label: 'Or exact', unit: 'chairs', max: 99999 } }),
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('stock', 'What you stock', [
      c('shamiana', 'Shamiana and pandal'),
      c('german_tent', 'German tents'),
      c('stage', 'Stage and platform'),
      c('chairs', 'Chairs'),
      c('round_tables', 'Round tables'),
      c('sofa', 'Sofa sets'),
      c('carpet', 'Carpet and flooring'),
      c('fans', 'Fans and coolers'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not take', [
      c('no_monsoon', 'No open pandal in monsoon'),
      c('no_terrace', 'No terrace or rooftop setups'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Sound & AV': {
    scale: [
      one('crowd', 'Biggest crowd you can cover', [
        c('100', 'Up to 100'), c('500', 'Up to 500'),
        c('1500', 'Up to 1,500'), c('3000', 'Over 3,000'),
      ], { exact: { label: 'Or exact', unit: 'people', max: 99999 } }),
      PER_DAY,
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('gear', 'What you bring', [
        c('pa', 'PA system'),
        c('line_array', 'Line array'),
        c('mics_wireless', 'Wireless mics'),
        c('mixer', 'Mixing console'),
        c('projector', 'Projector and screen'),
        c('led_wall', 'LED wall'),
        c('engineer', 'A sound engineer on site'),
        c('backup', 'Backup amp and mics'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_generator', 'We will not run off a generator'),
      c('no_stairs', 'No venues without lift or ramp'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'DJ & Music': {
    scale: [
      one('set_hours', 'How long can you play?', [
        c('2', 'Two hours'), c('4', 'Four hours'),
        c('6', 'Six hours'), c('all_night', 'All night'),
      ], { exact: { label: 'Or exact hours', unit: 'hours', max: 24 } }),
      PER_DAY,
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('gear', 'What you bring', [
        c('own_console', 'Our own console'),
        c('speakers', 'Speakers'),
        c('lighting', 'Dance floor lighting'),
        c('smoke', 'Smoke or CO2'),
        c('mic', 'Mic for announcements'),
        c('venue_system', 'We can use the venue system'),
      ]),
      POWER,
    ],
    limits: [
      TIMING_LIMITS,
      many('wont_play', 'What you will not do', [
        c('no_explicit', 'No explicit lyrics'),
        c('no_requests', 'No open request list'),
        c('no_alcohol_events', 'No events serving alcohol'),
        c('none', 'Nothing off limits'),
      ]),
    ],
    trust: [YEARS],
  },

  'Live Entertainment': {
    scale: [
      one('performers', 'How many performers can you send?', [
        c('1', 'A soloist'), c('4', 'A small group'),
        c('10', 'Around ten'), c('20', 'Twenty or more'),
      ], { exact: { label: 'Or exact', unit: 'performers', max: 999 } }),
      one('set_length', 'How long is a typical performance?', [
        c('30', '30 minutes'), c('60', 'An hour'),
        c('120', 'Two hours'), c('flexible', 'As long as needed'),
      ], { exact: { label: 'Or exact minutes', unit: 'minutes', max: 999 } }),
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('needs', 'What you need on site', [
        c('stage', 'A stage'),
        c('sound', 'Sound system provided'),
        c('own_sound', 'We bring our own sound'),
        c('green_room', 'A green room'),
        c('costume_space', 'Space to change costume'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS],
  },

  'Anchor & MC': {
    scale: [one('event_hours', 'How long can you anchor?', [
      c('2', 'Two hours'), c('4', 'Four hours'),
      c('8', 'A full day'), c('multi', 'Multi-day'),
    ], { exact: { label: 'Or exact hours', unit: 'hours', max: 48 } }), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('languages', 'Languages you can host in', [
      c('kannada', 'Kannada'), c('english', 'English'), c('hindi', 'Hindi'),
      c('tamil', 'Tamil'), c('telugu', 'Telugu'), c('malayalam', 'Malayalam'),
    ])],
    limits: [TIMING_LIMITS],
    trust: [YEARS],
  },

  'Bridal Makeup & Hair': {
    scale: [
      one('faces', 'How many people can you do in a morning?', [
        c('1', 'Only the bride'), c('3', 'Bride and two'),
        c('6', 'Up to six'), c('10', 'Ten or more'),
      ], { exact: { label: 'Or exact', unit: 'people', max: 99 } }),
      PER_DAY,
    ],
    notice: [NOTICE, one('trial', 'Do you offer a trial before the day?', [
      c('yes_included', 'Yes, included'),
      c('yes_extra', 'Yes, charged separately'),
      c('no', 'No trial'),
    ])],
    where: [TRAVEL, many('where_work', 'Where you work', [
      c('home', 'At the client’s home'),
      c('venue', 'At the venue'),
      c('salon', 'At our salon only'),
    ])],
    brings: [many('kit', 'What you bring', [
      c('own_products', 'Our own products'),
      c('airbrush', 'Airbrush kit'),
      c('hd', 'HD / camera-ready range'),
      c('hair_extensions', 'Hair extensions'),
      c('draping', 'Saree draping'),
      c('assistant', 'An assistant'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_bleach', 'No bleach or chemical work'),
      c('no_men', 'We do not do men’s grooming'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Mehendi Artist': {
    scale: [
      one('hands', 'How many pairs of hands in a sitting?', [
        c('5', 'Up to 5'), c('15', 'Up to 15'),
        c('30', 'Up to 30'), c('50', 'Fifty or more'),
      ], { exact: { label: 'Or exact', unit: 'people', max: 999 } }),
      one('bridal_hours', 'Hours for full bridal mehendi', [
        c('2', 'Two'), c('4', 'Four'), c('6', 'Six or more'),
      ], { exact: { label: 'Or exact hours', unit: 'hours', max: 24 } }),
    ],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('styles', 'What you offer', [
      c('organic_cone', 'Organic cones only'),
      c('bridal', 'Full bridal'),
      c('arabic', 'Arabic'),
      c('rajasthani', 'Rajasthani'),
      c('glitter', 'Glitter and stones'),
      c('team', 'Extra artists for guests'),
    ])],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS],
  },

  'Priest & Rituals': {
    scale: [PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('samagri', 'What you arrange', [
      c('full_samagri', 'Full pooja samagri'),
      c('partial', 'Some items, family brings the rest'),
      c('none', 'Family arranges everything'),
      c('homa_kund', 'Homa kund and firewood'),
      c('flowers', 'Flowers and fruits'),
    ])],
    limits: [
      many('traditions', 'Traditions you perform', [
        c('smartha', 'Smartha'), c('madhwa', 'Madhwa'), c('srivaishnava', 'Srivaishnava'),
        c('lingayat', 'Lingayat'), c('arya_samaj', 'Arya Samaj'), c('other', 'Others'),
      ]),
      TIMING_LIMITS,
    ],
    trust: [YEARS, many('languages', 'Languages you chant and explain in', [
      c('sanskrit', 'Sanskrit'), c('kannada', 'Kannada'),
      c('tamil', 'Tamil'), c('telugu', 'Telugu'), c('hindi', 'Hindi'),
    ])],
  },

  'Cake & Desserts': {
    scale: [
      one('cake_kg', 'Largest cake you make', [
        c('2', '2 kg'), c('5', '5 kg'), c('10', '10 kg'), c('25', '25 kg or tiered'),
      ], { exact: { label: 'Or exact', unit: 'kg', max: 999 } }),
      PER_DAY,
    ],
    notice: [NOTICE],
    where: [TRAVEL, one('delivery', 'How does it reach the venue?', [
      c('we_deliver', 'We deliver and set up'),
      c('pickup', 'Collected from us'),
      c('either', 'Either'),
    ])],
    brings: [many('offers', 'What you make', [
      c('eggless', 'Eggless'),
      c('fondant', 'Fondant and sculpted'),
      c('photo_print', 'Photo print cakes'),
      c('sugar_free', 'Sugar free'),
      c('vegan', 'Vegan'),
      c('dessert_table', 'A full dessert table'),
    ])],
    limits: [many('wont_do', 'What you will not do', [
      c('no_egg', 'We do not use egg at all'),
      c('no_alcohol', 'No alcohol in the cake'),
      c('no_outdoor_summer', 'No cream cakes outdoors in summer'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [YEARS, many('licences', 'Papers you hold', [
      c('fssai', 'FSSAI licence'), c('gst', 'GST registration'),
    ])],
  },

  'Bar & Beverages': {
    scale: [GUESTS('Most guests you can serve'), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('supplies', 'What you bring', [
        c('bartenders', 'Bartenders'),
        c('glassware', 'Glassware'),
        c('ice', 'Ice'),
        c('mixers', 'Mixers and garnish'),
        c('counter', 'The bar counter itself'),
        c('mocktails', 'Mocktail menu'),
      ]),
      POWER,
    ],
    limits: [
      many('alcohol', 'On alcohol', [
        c('mocktail_only', 'Mocktails only — we do not serve alcohol'),
        c('client_supplies', 'Client supplies the alcohol, we serve'),
        c('we_supply', 'We can arrange it under licence'),
      ]),
      TIMING_LIMITS,
    ],
    trust: [TEAM, YEARS, many('licences', 'Papers you hold', [
      c('excise', 'Excise permit'), c('fssai', 'FSSAI'), c('gst', 'GST'),
    ])],
  },

  'Event Lighting': {
    scale: [one('area', 'Largest area you light', [
      c('hall', 'One hall'), c('venue', 'A whole venue'),
      c('outdoor', 'Outdoor grounds'), c('multi', 'Several venues'),
    ]), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [
      many('kit', 'What you bring', [
        c('par', 'PAR and uplighters'),
        c('string', 'String and fairy lights'),
        c('chandelier', 'Chandeliers'),
        c('moving_head', 'Moving heads'),
        c('generator', 'Our own generator'),
        c('truss', 'Truss and rigging'),
      ]),
      POWER,
    ],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_rigging', 'No rigging above ten feet'),
      c('no_venue_power', 'We will not run off venue power alone'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Power & Cooling': {
    scale: [one('kva', 'Largest generator you supply', [
      c('15', '15 kVA'), c('62', '62 kVA'),
      c('125', '125 kVA'), c('250', '250 kVA or more'),
    ], { exact: { label: 'Or exact', unit: 'kVA', max: 9999 } }), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('stock', 'What you supply', [
      c('generator', 'Generators'),
      c('silent_dg', 'Silent DG sets'),
      c('ac', 'Portable AC'),
      c('coolers', 'Air coolers'),
      c('fans', 'Pedestal fans'),
      c('operator', 'An operator who stays'),
      c('fuel', 'Fuel included'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_indoor_dg', 'No DG inside a closed venue'),
      c('no_unmanned', 'We will not leave equipment unmanned'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Transportation': {
    scale: [one('seats', 'Largest vehicle you run', [
      c('4', 'Car, 4 seats'), c('7', 'SUV, 7 seats'),
      c('20', 'Tempo traveller, 20'), c('50', 'Bus, 50 or more'),
    ], { exact: { label: 'Or exact seats', unit: 'seats', max: 999 } }),
    one('fleet', 'How many vehicles can you send at once?', [
      c('1', 'One'), c('3', 'Three'), c('5', 'Five'), c('10', 'Ten or more'),
    ], { exact: { label: 'Or exact', unit: 'vehicles', max: 999 } }),
    /* Seats answered the passenger half and left the goods half
       unanswerable. A customer moving 400 chairs needs a payload, not
       a seat count, and every equipment job was being matched on the
       wrong number. */
    one('payload', 'Heaviest load your biggest vehicle takes', [
      c('20', 'Up to 20 kg', 'A bike run'),
      c('500', 'Up to 500 kg', 'Cargo auto'),
      c('750', 'Up to 750 kg', 'Tata Ace'),
      c('1500', 'Up to 1.5 tonnes', 'Pickup'),
      c('4000', 'Up to 4 tonnes', '14 ft truck'),
      c('7000', '7 tonnes or more', '19 ft and containers'),
    ], { exact: { label: 'Or exact', unit: 'kg', max: 99999 } })],
    notice: [NOTICE],
    where: [TRAVEL],
    brings: [many('included', 'What is included', [
      c('driver', 'Driver'),
      c('fuel', 'Fuel'),
      c('decoration', 'Vehicle decoration'),
      c('ac', 'Air conditioning'),
      c('luggage', 'Luggage space'),
      c('vintage', 'Vintage or luxury car'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_outstation_night', 'No outstation night driving'),
      c('no_hill', 'No hill routes'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS, many('licences', 'Papers you hold', [
      c('commercial_permit', 'Commercial permit'),
      c('insurance', 'Passenger insurance'),
      c('fitness', 'Fitness certificate'),
    ])],
  },

  /* ── Wedding Planning ─────────────────────────────────────────────
     The trade had no operations at all, so it fell to the generic
     fallback: how many events a day, how far do you travel. True of
     everybody and decisive for nobody. */
  'Wedding Planning': {
    scale: [one('events_at_once', 'How many events can you run in a week?', [
      c('1', 'One'), c('2', 'Two'), c('4', 'Four'), c('6', 'Six or more'),
    ], { exact: { label: 'Or exact', unit: 'events', max: 99 } }),
    one('guest_ceiling', 'Largest guest count you have handled', [
      c('100', 'Up to 100'), c('300', 'Up to 300'),
      c('800', 'Up to 800'), c('2000', 'Over 1,500'),
    ], { exact: { label: 'Or exact', unit: 'guests', max: 99999 } })],
    notice: [one('lead_time', 'Shortest notice you can take a whole event on', [
      c('1_week', 'A week'), c('2_weeks', 'Two weeks'),
      c('1_month', 'A month'), c('3_months', 'Three months'),
    ], { exact: { label: 'Or exact days', unit: 'days', max: 365 } })],
    where: [TRAVEL, many('outstation', 'Do you travel for the whole event?', [
      c('bengaluru_only', 'Bengaluru only'),
      c('karnataka', 'Anywhere in Karnataka'),
      c('south_india', 'South India'),
      c('anywhere', 'Anywhere, including abroad'),
    ])],
    brings: [many('team_on_day', 'Who is on the ground on the day?', [
      c('planner', 'You, personally'),
      c('coordinators', 'Coordinators'),
      c('runners', 'Runners and helpers'),
      c('walkie', 'Radios for the crew'),
      c('backup_kit', 'An emergency kit', 'Safety pins, glue, a steamer, paracetamol'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not take on', [
      c('no_alcohol', 'No events serving alcohol'),
      c('no_last_minute', 'Nothing inside two weeks'),
      c('no_partial', 'Nothing where the family has already booked the vendors'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS, many('licences', 'Papers you hold', [
      c('gst', 'GST registration'),
      c('firm', 'Registered firm or company'),
      c('liability', 'Public liability insurance'),
    ])],
  },

  /* ── Trousseau & Gift Packing ─────────────────────────────────────
     Volume and turnaround, because that is the whole job. Fifty trays
     in three days and fifty trays in three weeks are different
     businesses and the family asking has a date. */
  'Trousseau & Gift Packing': {
    scale: [one('trays_per_order', 'Largest order you can take', [
      c('25', 'Up to 25 trays'), c('50', 'Up to 50'),
      c('100', 'Up to 100'), c('300', '300 or more'),
    ], { exact: { label: 'Or exact', unit: 'trays', max: 9999 } }),
    one('trays_per_day', 'How many can your team finish in a day?', [
      c('10', 'Ten'), c('25', 'Twenty five'), c('50', 'Fifty'),
    ], { exact: { label: 'Or exact', unit: 'trays', max: 999 } })],
    notice: [NOTICE],
    where: [TRAVEL],
    brings: [many('supplies', 'What do you bring?', [
      c('trays', 'Trays and boxes'),
      c('wrap', 'Wrapping film and ribbon'),
      c('flowers', 'Fresh or artificial flowers'),
      c('labels', 'Printed name labels'),
      c('team', 'A packing team to the house'),
      c('nothing', 'Nothing — the family supplies everything'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_perishable', 'Nothing perishable inside a tray'),
      c('no_valuables', 'No jewellery or cash handling'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [TEAM, YEARS],
  },

  'Valet Parking': {
    scale: [one('cars', 'How many cars can you handle?', [
      c('25', 'Up to 25'), c('50', 'Up to 50'),
      c('100', 'Up to 100'), c('250', '250 or more'),
    ], { exact: { label: 'Or exact', unit: 'cars', max: 9999 } }), TEAM],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('included', 'What you provide', [
      c('uniformed', 'Uniformed staff'),
      c('tags', 'Ticket and tag system'),
      c('insurance', 'Damage insurance'),
      c('signage', 'Signage and cones'),
      c('supervisor', 'A supervisor on site'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_offsite', 'No off-site parking runs'),
      c('no_two_wheeler', 'No two-wheelers'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [YEARS, many('licences', 'Papers you hold', [
      c('insurance', 'Liability insurance'), c('police_verified', 'Police-verified staff'),
    ])],
  },

  'Security Services': {
    scale: [TEAM, one('guards_max', 'Most guards you can deploy', [
      c('2', 'Two'), c('5', 'Five'), c('10', 'Ten'), c('25', 'Twenty-five or more'),
    ], { exact: { label: 'Or exact', unit: 'guards', max: 999 } })],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('provides', 'What you provide', [
      c('uniformed', 'Uniformed guards'),
      c('bouncers', 'Bouncers'),
      c('female_guards', 'Female guards'),
      c('metal_detector', 'Metal detectors'),
      c('crowd_control', 'Crowd control barriers'),
      c('supervisor', 'A supervisor'),
    ])],
    limits: [TIMING_LIMITS, many('wont_do', 'What you will not do', [
      c('no_armed', 'No armed guards'),
      c('no_alcohol_events', 'No events serving alcohol'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [YEARS, many('licences', 'Papers you hold', [
      c('psara', 'PSARA licence'),
      c('police_verified', 'Police-verified staff'),
      c('insurance', 'Liability insurance'),
    ])],
  },

  'Safety & Facilities': {
    scale: [GUESTS('Event size you can cover'), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('provides', 'What you provide', [
      c('ambulance', 'Ambulance on standby'),
      c('paramedic', 'Paramedic or nurse'),
      c('doctor', 'A doctor'),
      c('first_aid', 'First aid station'),
      c('fire_ext', 'Fire extinguishers'),
      c('portable_toilets', 'Portable toilets'),
      c('housekeeping', 'Housekeeping staff'),
    ])],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS, many('licences', 'Papers you hold', [
      c('medical_reg', 'Medical registration'),
      c('ambulance_permit', 'Ambulance permit'),
      c('insurance', 'Liability insurance'),
    ])],
  },

  'Guest Services': {
    scale: [one('staff_max', 'Most staff you can send', [
      c('2', 'Two'), c('5', 'Five'), c('10', 'Ten'), c('25', 'Twenty-five or more'),
    ], { exact: { label: 'Or exact', unit: 'staff', max: 999 } }), PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [many('provides', 'What you provide', [
      c('ushers', 'Ushers and greeters'),
      c('registration', 'Registration desk'),
      c('cloakroom', 'Cloakroom'),
      c('uniformed', 'Uniformed staff'),
      c('multilingual', 'Multilingual staff'),
      c('helpdesk', 'Guest help desk'),
    ])],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS],
  },

  'Gifts & Favours': {
    scale: [one('order_qty', 'Largest order you can fulfil', [
      c('50', '50 pieces'), c('200', '200'),
      c('500', '500'), c('1000', '1,000 or more'),
    ], { exact: { label: 'Or exact', unit: 'pieces', max: 99999 } })],
    notice: [NOTICE],
    where: [TRAVEL, one('delivery', 'How does it reach the customer?', [
      c('we_deliver', 'We deliver'), c('pickup', 'Collected from us'), c('courier', 'Couriered'),
    ])],
    brings: [many('offers', 'What you offer', [
      c('custom_print', 'Custom printing'),
      c('packaging', 'Gift packaging'),
      c('handmade', 'Handmade items'),
      c('sweets', 'Sweets and edibles'),
      c('silver', 'Silver and brass items'),
      c('eco', 'Eco-friendly options'),
      c('bulk_discount', 'Bulk pricing'),
    ])],
    limits: [many('wont_do', 'What you will not do', [
      c('no_rush', 'No orders under a week'),
      c('no_small', 'No orders under 50 pieces'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [YEARS, many('licences', 'Papers you hold', [
      c('gst', 'GST registration'), c('fssai', 'FSSAI, if edible'),
    ])],
  },

  'Invitation & Printing': {
    scale: [one('print_qty', 'Largest print run', [
      c('100', '100'), c('500', '500'),
      c('1000', '1,000'), c('5000', '5,000 or more'),
    ], { exact: { label: 'Or exact', unit: 'pieces', max: 99999 } })],
    notice: [NOTICE, one('turnaround', 'Days from approval to delivery', [
      c('2', 'Two'), c('5', 'Five'), c('10', 'Ten'), c('15', 'Fifteen'),
    ], { exact: { label: 'Or exact days', unit: 'days', max: 365 } })],
    where: [TRAVEL, one('delivery', 'How does it reach the customer?', [
      c('we_deliver', 'We deliver'), c('pickup', 'Collected from us'), c('courier', 'Couriered'),
    ])],
    brings: [many('offers', 'What you offer', [
      c('design', 'Design from scratch'),
      c('digital', 'Digital / e-invites'),
      c('foil', 'Foil and embossing'),
      c('screen_print', 'Screen printing'),
      c('boxed', 'Boxed invitations'),
      c('regional_script', 'Kannada and regional scripts'),
      c('proof', 'A proof before printing'),
    ])],
    limits: [many('wont_do', 'What you will not do', [
      c('no_rush', 'No same-week runs'),
      c('no_small', 'No runs under 100'),
      c('none', 'Nothing off limits'),
    ])],
    trust: [YEARS],
  },
}

/**
 * The operations screens for one trade.
 *
 * Catering keeps its own seven — they were written against the food
 * supply chain and "How is it served?" has no equivalent elsewhere. Every
 * other trade gets the spine, filled with its own questions.
 *
 * A trade with no entry yet gets the shared questions rather than
 * nothing: how far you travel and what you will not do are worth asking
 * of anybody, and a trade added tomorrow is useful on the day it appears
 * instead of after somebody writes its content.
 */
/**
 * Where an ops answer is kept while the partner is filling the form.
 *
 * The flow holds every answer in ONE flat object keyed by group id, and
 * eight trades have an ops group whose id already exists on their detail
 * screen — Photography asks "What do you bring?" in both places under
 * `kit`, and so do Videography and Event Lighting; Tent & Furniture has
 * `stock` twice, Anchor & MC `languages`, Priest & Rituals `samagri`,
 * Mehendi Artist `styles`, Transportation `fleet`.
 *
 * Sharing the key meant the second screen silently overwrote the first.
 * A photographer ticked their lighting and their drone on the detail
 * screen, reached the ops screen, ticked a second shooter, and the first
 * answer was gone — with nothing on screen to say so.
 *
 * specsForServices already namespaces its groups for exactly this
 * reason. This is the same fix: the catalogue id still comes from the
 * bare `id`, and `stateKey` is only where the answer lives.
 */
const withStateKeys = screen => ({
  ...screen,
  groups: (screen.groups ?? []).map(g => ({ ...g, stateKey: `ops:${screen.id}:${g.id}` })),
})

export function operationScreensFor(trade) {
  if (trade === 'Catering & Food') return CATERING_SCREENS.map(withStateKeys)

  const own = TRADE_OPERATIONS[trade]
  const fallback = {
    scale: [PER_DAY],
    notice: [NOTICE],
    where: [TRAVEL, VENUES],
    brings: [POWER],
    limits: [TIMING_LIMITS],
    trust: [TEAM, YEARS],
  }
  const content = own ?? fallback

  return OPERATION_SPINE
    .map(s => ({ ...s, groups: content[s.id] ?? fallback[s.id] ?? [] }))
    .filter(s => s.groups.length)
    .map(withStateKeys)
}

/** Every group across every trade, for the id generator and the seed. */
export const ALL_TRADE_OPERATION_GROUPS = Object.entries(TRADE_OPERATIONS)
  .flatMap(([trade, screens]) =>
    Object.entries(screens).flatMap(([screenId, groups]) =>
      groups.map(g => ({ trade, screenId, group: g }))))
