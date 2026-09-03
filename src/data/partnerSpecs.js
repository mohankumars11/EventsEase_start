/**
 * What a partner does, in detail — picked, never typed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROBLEM THIS SOLVES
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner's listing today is a name, a trade and a price. "Catering,
 * quote on request." That is enough to dispatch a job and nothing like
 * enough to dispatch the RIGHT job.
 *
 * A caterer who cooks only pure-vegetarian Brahmin food and a caterer
 * running a tandoor are one row apart in the database and completely
 * different businesses. Sending the first one a Punjabi wedding wastes
 * both their time, and after two or three of those they stop opening the
 * app — which is the expensive failure, because supply is the constraint
 * this whole marketplace runs against.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY OPTION HERE PASSES ONE TEST
 * ══════════════════════════════════════════════════════════════════════
 *
 * It changes WHO SHOULD GET THE JOB, or it changes WHAT ARRIVES.
 *
 * That test is doing real work. A first pass of this file had "years in
 * business", "team size" and "do you have a GST number" — all true facts
 * about a partner, none of which decides whether they are right for a
 * booking. Every one of them is another screen between somebody and their
 * first job, and this form is filled in by people on building sites and
 * in kitchens.
 *
 * The same rule `data/instantOptions.js` states for the customer side,
 * pointed the other way: there, an option earns its place by changing the
 * price. Here, by changing the match.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHAPE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   { id, question, hint?, type: 'multi' | 'one', choices: [{ id, label, scan? }] }
 *
 *   multi   checkboxes. "Which cuisines can you cook?" — the answer is
 *           usually several, and forcing one would make a caterer choose
 *           which half of their business to hide.
 *   one     radio. "Is your kitchen pure vegetarian?" — the answer is
 *           exactly one and the two answers are incompatible.
 *
 * Deliberately the same shape as SERVICE_OPTIONS in data/instantOptions.js,
 * so a customer's answer and a partner's capability are written in one
 * vocabulary and can be compared without a translation table. A
 * translation table between two lists of strings is where a matching
 * engine goes quietly wrong.
 *
 * ── Keyed by TRADE, not by service ──────────────────────────────────
 *
 * `match_partners` joins on `vendor_services.category`, which holds the
 * trade. A caterer's cuisines are a fact about the caterer, not about
 * whether the row says "Catering" or "Welcome drinks". Keying by service
 * would ask the same person the same question five times.
 */

export const SPECS_BY_TRADE = {

  /* ── Catering & Food ─────────────────────────────────────────────
     The trade where a mismatch is most expensive and most common.
     data/cateringModel.js already records the argument this prevents:
     a per-plate rate that hid the groceries. */
  'Catering & Food': [
    {
      id: 'diet',
      /* Asked first, and on its own, because it decides everything
         after it. A pure-vegetarian kitchen and a kitchen running a
         tandoor are different businesses with different menus, and
         asking about cuisines before this produces a caterer ticking
         Punjabi who cannot cook a single dish on that card. */
      question: 'Do you cook vegetarian, non-vegetarian, or both?',
      hint: 'This decides which menus we show you next.',
      type: 'one',
      choices: [
        { id: 'veg',     label: 'Vegetarian only' },
        { id: 'nonveg',  label: 'Non-vegetarian only' },
        { id: 'both',    label: 'Both' },
      ],
    },
    {
      id: 'cuisines',
      question: 'Which cuisines can you cook?',
      hint: 'Tick everything you do well. This is what we match you on.',
      type: 'multi',
      choices: [
        { id: 'south_brahmin', label: 'South Indian — Brahmin style', scan: 'No onion or garlic' },
        { id: 'south_general', label: 'South Indian — everyday',      scan: 'Karnataka, Andhra, Tamil' },
        { id: 'north',         label: 'North Indian festive' },
        { id: 'punjabi',       label: 'Punjabi / tandoor' },
        { id: 'coastal',       label: 'Coastal / Mangalorean' },
        { id: 'chinese',       label: 'Indo-Chinese' },
        { id: 'continental',   label: 'Continental / Italian' },
        { id: 'mughlai',       label: 'Mughlai' },
        { id: 'jain',          label: 'Jain',                          scan: 'No root vegetables' },
      ],
    },
    {
      id: 'kitchen',
      question: 'Is your kitchen pure vegetarian?',
      /* Not a preference and not a tick box. A pure-veg kitchen sent a
         non-veg booking has to refuse it, and a family who specified
         pure-veg and got a shared kitchen has a complaint no refund
         settles. The two answers are incompatible, so this is a radio. */
      type: 'one',
      choices: [
        { id: 'pure_veg',  label: 'Pure vegetarian only' },
        { id: 'separate',  label: 'Both, prepared separately', scan: 'Separate vessels and counters' },
        { id: 'both',      label: 'Both, one kitchen' },
      ],
    },
    {
      id: 'service',
      question: 'How do you serve?',
      type: 'multi',
      choices: [
        { id: 'buffet',       label: 'Running buffet counters' },
        { id: 'banana_leaf',  label: 'Sit-down banana leaf' },
        { id: 'plated',       label: 'Plated table service' },
        { id: 'live_counter', label: 'Live counters',  scan: 'Dosa, chaat, pasta' },
      ],
    },
  ],

  /* ── Decoration & Floral ─────────────────────────────────────────
     Material is the biggest single cost fork inside any decor job, and
     it is the one customers ask about first. */
  'Decoration & Floral': [
    {
      id: 'medium',
      question: 'What do you work in?',
      type: 'multi',
      choices: [
        { id: 'balloons',   label: 'Balloons' },
        { id: 'fresh',      label: 'Fresh flowers' },
        { id: 'artificial', label: 'Silk / artificial florals' },
        { id: 'fabric',     label: 'Fabric draping',    scan: 'Satin, chiffon, saree panels' },
        { id: 'lights',     label: 'Decorative lighting' },
      ],
    },
    {
      id: 'setups',
      question: 'What do you set up?',
      type: 'multi',
      choices: [
        { id: 'photo_corner', label: 'Photo corner or backdrop' },
        { id: 'stage',        label: 'Stage and mandap' },
        { id: 'entrance',     label: 'Entrance and pathway' },
        { id: 'tables',       label: 'Table centrepieces' },
        { id: 'car',          label: 'Car decoration' },
        { id: 'full_hall',    label: 'Whole hall',     scan: 'Walls and ceiling too' },
      ],
    },
    {
      id: 'themes',
      question: 'Which themes do you do?',
      type: 'multi',
      choices: [
        { id: 'traditional', label: 'Traditional',  scan: 'Marigold, jasmine, mango leaf' },
        { id: 'kids',        label: 'Kids and cartoon' },
        { id: 'minimal',     label: 'Modern minimal' },
        { id: 'corporate',   label: 'Corporate branding' },
      ],
    },
  ],

  /* ── Photography / Videography ───────────────────────────────────
     Split across two trades because they are two rows in
     TRADE_FOR_SERVICE, and a great many people in Bengaluru do exactly
     one of them. */
  'Photography': [
    {
      id: 'style',
      question: 'What kind of photography?',
      type: 'multi',
      choices: [
        { id: 'candid',      label: 'Candid' },
        { id: 'traditional', label: 'Posed and family' },
        { id: 'pre_wedding', label: 'Pre-wedding shoots' },
        { id: 'newborn',     label: 'Newborn and baby' },
        { id: 'product',     label: 'Product and corporate' },
      ],
    },
    {
      id: 'kit',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'lighting', label: 'Own lighting setup' },
        { id: 'drone',    label: 'Drone',        scan: 'Aerial shots' },
        { id: 'instant',  label: 'Instant prints on the day' },
        { id: 'booth',    label: 'Photo booth' },
      ],
    },
    {
      id: 'delivery',
      question: 'What do you hand over?',
      type: 'multi',
      choices: [
        { id: 'soft',   label: 'Edited digital photos' },
        { id: 'album',  label: 'Printed album' },
        { id: 'reels',  label: 'Short reels for social' },
      ],
    },
  ],

  'Videography': [
    {
      id: 'style',
      question: 'What kind of video?',
      type: 'multi',
      choices: [
        { id: 'documentary', label: 'Full-length coverage' },
        { id: 'cinematic',   label: 'Cinematic film',  scan: 'Colour graded, edited' },
        { id: 'highlight',   label: 'Highlight reel' },
        { id: 'live_stream', label: 'Live streaming',  scan: 'For family abroad' },
      ],
    },
    {
      id: 'kit',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'drone',      label: 'Drone' },
        { id: 'multi_cam',  label: 'Multiple cameras' },
        { id: 'led_wall',   label: 'LED wall / live feed' },
        { id: 'own_light',  label: 'Own lighting' },
      ],
    },
  ],

  /* ── Venue ───────────────────────────────────────────────────────
     Almost everything about a venue lives in `venue_spaces` now — it has
     real columns because dispatch and search read them. What is left
     here is the handful of facts about the OPERATION rather than the
     building. */
  'Venue': [
    {
      id: 'catering_rule',
      question: 'Can customers bring their own caterer?',
      /* The single most common reason a venue booking falls apart, and
         it is never asked until after the deposit. */
      type: 'one',
      choices: [
        { id: 'outside_ok',   label: 'Yes, any caterer' },
        { id: 'panel',        label: 'From our approved list only' },
        { id: 'in_house',     label: 'We cater it ourselves' },
      ],
    },
    {
      id: 'facilities',
      question: 'What is on site?',
      type: 'multi',
      choices: [
        { id: 'parking',     label: 'Car parking' },
        { id: 'rooms',       label: 'Changing rooms' },
        { id: 'homa',        label: 'Homa kunda pit' },
        { id: 'generator',   label: 'Power backup' },
        { id: 'lift',        label: 'Lift' },
        { id: 'stay',        label: 'Rooms to stay' },
      ],
    },
    {
      id: 'noise',
      question: 'Music and sound',
      type: 'one',
      choices: [
        { id: 'open',        label: 'No restrictions' },
        { id: 'until_10',    label: 'Must stop by 10 pm' },
        { id: 'indoor_only', label: 'Indoor sound only' },
      ],
    },
  ],

  /* ── Cake & Desserts ─────────────────────────────────────────────── */
  'Cake & Desserts': [
    {
      id: 'diet',
      question: 'What can you make?',
      type: 'multi',
      choices: [
        { id: 'eggless', label: 'Eggless' },
        { id: 'regular', label: 'With egg' },
        { id: 'vegan',   label: 'Vegan' },
        { id: 'sugar_free', label: 'Sugar free' },
      ],
    },
    {
      id: 'kinds',
      question: 'What do you do?',
      type: 'multi',
      choices: [
        { id: 'theme',    label: 'Theme and character cakes' },
        { id: 'tiered',   label: 'Tiered wedding cakes' },
        { id: 'photo',    label: 'Photo print cakes' },
        { id: 'desserts', label: 'Dessert table' },
        { id: 'mithai',   label: 'Traditional sweets' },
      ],
    },
  ],

  /* ── DJ & Music ──────────────────────────────────────────────────── */
  'DJ & Music': [
    {
      id: 'genres',
      question: 'What do you play?',
      type: 'multi',
      choices: [
        { id: 'kannada',   label: 'Kannada and regional' },
        { id: 'bollywood', label: 'Bollywood and commercial' },
        { id: 'edm',       label: 'EDM and house' },
        { id: 'retro',     label: 'Retro' },
        { id: 'devotional',label: 'Devotional' },
      ],
    },
    {
      id: 'rig',
      question: 'What do you bring?',
      type: 'one',
      choices: [
        { id: 'small',  label: 'Small setup',  scan: 'Up to 50 guests' },
        { id: 'medium', label: 'Medium party rig', scan: 'Up to 200' },
        { id: 'large',  label: 'Full line array',  scan: '200 and above' },
      ],
    },
  ],

  /* ── Live Entertainment ──────────────────────────────────────────── */
  'Live Entertainment': [
    {
      id: 'acts',
      question: 'What do you perform?',
      type: 'multi',
      choices: [
        { id: 'nadaswaram', label: 'Nadaswaram' },
        { id: 'dollu',      label: 'Dollu Kunitha' },
        { id: 'dhol',       label: 'Dhol / band' },
        { id: 'classical',  label: 'Classical music' },
        { id: 'band',       label: 'Live band' },
        { id: 'dance',      label: 'Dance troupe' },
        { id: 'kids',       label: 'Kids entertainment', scan: 'Magic, puppets, games' },
      ],
    },
    {
      id: 'group_size',
      question: 'How many in your group?',
      type: 'one',
      choices: [
        { id: 'solo',  label: 'Solo or duo' },
        { id: 'small', label: '3 to 6' },
        { id: 'large', label: '7 or more' },
      ],
    },
  ],

  /* ── Bridal Makeup & Hair ────────────────────────────────────────── */
  'Bridal Makeup & Hair': [
    {
      id: 'finish',
      question: 'What do you offer?',
      type: 'multi',
      choices: [
        { id: 'hd',       label: 'HD makeup' },
        { id: 'airbrush', label: 'Airbrush' },
        { id: 'natural',  label: 'Natural / minimal' },
        { id: 'hair',     label: 'Hair styling' },
        { id: 'saree',    label: 'Saree draping' },
      ],
    },
    {
      id: 'who',
      question: 'Who do you work with?',
      type: 'multi',
      choices: [
        { id: 'bride',  label: 'Bride' },
        { id: 'groom',  label: 'Groom' },
        { id: 'guests', label: 'Family and guests' },
        { id: 'kids',   label: 'Children' },
      ],
    },
    {
      id: 'travel',
      question: 'Do you travel to the customer?',
      type: 'one',
      choices: [
        { id: 'yes',    label: 'Yes, I come to them' },
        { id: 'studio', label: 'At my studio only' },
        { id: 'both',   label: 'Either' },
      ],
    },
  ],

  /* ── Mehendi Artist ──────────────────────────────────────────────── */
  'Mehendi Artist': [
    {
      id: 'styles',
      question: 'Which styles?',
      type: 'multi',
      choices: [
        { id: 'arabic',    label: 'Arabic' },
        { id: 'rajasthani',label: 'Rajasthani / intricate' },
        { id: 'portrait',  label: 'Portrait and figures' },
        { id: 'minimal',   label: 'Minimal and modern' },
      ],
    },
    {
      id: 'scale',
      question: 'What can you take on?',
      type: 'multi',
      choices: [
        { id: 'bridal', label: 'Full bridal',  scan: 'Hands and feet, several hours' },
        { id: 'guests', label: 'Guest mehendi', scan: 'Quick designs, many people' },
      ],
    },
  ],

  /* ── Tent & Furniture ────────────────────────────────────────────── */
  'Tent & Furniture': [
    {
      id: 'stock',
      question: 'What do you supply?',
      type: 'multi',
      choices: [
        { id: 'chairs',    label: 'Chairs' },
        { id: 'tables',    label: 'Tables' },
        { id: 'shamiana',  label: 'Shamiana / pandal' },
        { id: 'german',    label: 'German tent / hangar' },
        { id: 'flooring',  label: 'Flooring and carpet' },
        { id: 'sofas',     label: 'Sofas and stage seating' },
        { id: 'crockery',  label: 'Crockery and cutlery' },
        { id: 'cleanup',   label: 'Cleaning crew' },
      ],
    },
    {
      id: 'chair_class',
      question: 'What class of seating?',
      type: 'multi',
      choices: [
        { id: 'plastic',  label: 'Plastic with covers' },
        { id: 'banquet',  label: 'Padded banquet chairs' },
        { id: 'chiavari', label: 'Chiavari / premium' },
      ],
    },
  ],

  /* ── Sound & AV ──────────────────────────────────────────────────── */
  'Sound & AV': [
    {
      id: 'kit',
      question: 'What do you have?',
      type: 'multi',
      choices: [
        { id: 'pa',        label: 'PA and speakers' },
        { id: 'mics',      label: 'Cordless mics' },
        { id: 'projector', label: 'Projector and screen' },
        { id: 'led_wall',  label: 'LED video wall' },
        { id: 'generator', label: 'Power backup' },
      ],
    },
  ],

  /* ── Event Lighting ──────────────────────────────────────────────── */
  'Event Lighting': [
    {
      id: 'kit',
      question: 'What do you have?',
      type: 'multi',
      choices: [
        { id: 'ambient',  label: 'Ambient and fairy lights' },
        { id: 'par',      label: 'LED par cans' },
        { id: 'moving',   label: 'Moving heads' },
        { id: 'effects',  label: 'Cold pyro and fog' },
        { id: 'outdoor',  label: 'Outdoor floodlights' },
      ],
    },
  ],

  /* ── Transportation ──────────────────────────────────────────────── */
  'Transportation': [
    {
      id: 'fleet',
      question: 'What do you run?',
      type: 'multi',
      choices: [
        { id: 'sedan',   label: 'Sedans' },
        { id: 'suv',     label: 'SUVs / Innova' },
        { id: 'tempo',   label: 'Tempo traveller' },
        { id: 'bus',     label: 'Bus' },
        { id: 'goods',   label: 'Goods vehicle', scan: 'For moving equipment' },
      ],
    },
  ],

  /* ── Security Services ───────────────────────────────────────────── */
  'Security Services': [
    {
      id: 'staff',
      question: 'What can you provide?',
      type: 'multi',
      choices: [
        { id: 'bouncers', label: 'Bouncers' },
        { id: 'stewards', label: 'Uniformed stewards' },
        { id: 'valet',    label: 'Valet parking' },
        { id: 'women',    label: 'Women security staff' },
      ],
    },
  ],

  /* ── Anchor & MC ─────────────────────────────────────────────────── */
  'Anchor & MC': [
    {
      id: 'languages',
      question: 'Which languages?',
      hint: 'A wedding in the wrong language is the one thing an anchor cannot recover from.',
      type: 'multi',
      choices: [
        { id: 'kannada', label: 'Kannada' },
        { id: 'english', label: 'English' },
        { id: 'hindi',   label: 'Hindi' },
        { id: 'tamil',   label: 'Tamil' },
        { id: 'telugu',  label: 'Telugu' },
      ],
    },
    {
      id: 'events',
      question: 'What do you host?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Weddings' },
        { id: 'corporate', label: 'Corporate events' },
        { id: 'kids',      label: 'Kids parties' },
      ],
    },
  ],

  /* ── Invitation & Printing ───────────────────────────────────────── */
  'Invitation & Printing': [
    {
      id: 'medium',
      question: 'What do you produce?',
      type: 'multi',
      choices: [
        { id: 'print',   label: 'Printed cards' },
        { id: 'foil',    label: 'Foil and embossed' },
        { id: 'digital', label: 'Digital e-cards' },
        { id: 'video',   label: 'Animated video invites' },
        { id: 'banners', label: 'Banners and flex' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     THE TRADES ADDED WHEN THE CATALOGUE BECAME FULLY DISPATCHABLE
     ══════════════════════════════════════════════════════════════════

     Seven trades arrived at once, and a trade with no questions is a
     partner we know nothing about beyond their pincode — which is the
     state this whole file exists to end. So they get their questions in
     the same change that creates them, rather than in a follow-up
     nobody schedules. */

  /* ── Bar & Beverages ─────────────────────────────────────────────
     Licensing is the first question and the one that disqualifies. A
     mocktail counter and a licensed bar are different bookings, and
     sending a dry supplier a cocktail reception wastes both parties. */
  'Bar & Beverages': [
    {
      id: 'licence',
      question: 'What can you serve?',
      type: 'one',
      choices: [
        { id: 'mocktails', label: 'Mocktails and soft drinks only' },
        { id: 'byob',      label: 'We serve what the customer supplies', scan: 'They buy the alcohol' },
        { id: 'licensed',  label: 'Licensed bar', scan: 'We supply and serve' },
      ],
    },
    {
      id: 'setup',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'counter',   label: 'Mobile bar counter' },
        { id: 'glassware', label: 'Glassware' },
        { id: 'ice',       label: 'Ice and chillers' },
        { id: 'flair',     label: 'Flair bartending', scan: 'Performance mixing' },
      ],
    },
  ],

  /* ── Guest Services ──────────────────────────────────────────────── */
  'Guest Services': [
    {
      id: 'roles',
      question: 'What staff can you supply?',
      type: 'multi',
      choices: [
        { id: 'ushers',  label: 'Ushers and welcome hostesses' },
        { id: 'elders',  label: 'Help for elderly guests' },
        { id: 'nannies', label: 'Trained nannies' },
        { id: 'servers', label: 'Table and buffet servers' },
        { id: 'cleanup', label: 'Post-event clearing' },
      ],
    },
    {
      id: 'languages',
      question: 'Which languages does your team speak?',
      type: 'multi',
      choices: [
        { id: 'kannada', label: 'Kannada' },
        { id: 'english', label: 'English' },
        { id: 'hindi',   label: 'Hindi' },
        { id: 'tamil',   label: 'Tamil' },
        { id: 'telugu',  label: 'Telugu' },
      ],
    },
  ],

  /* ── Power & Cooling ─────────────────────────────────────────────
     Capacity, because a generator too small for the load is the same as
     no generator and it is discovered at the worst possible moment. */
  'Power & Cooling': [
    {
      id: 'generators',
      question: 'What generators do you have?',
      type: 'multi',
      choices: [
        { id: '30kva',  label: 'Up to 30 kVA', scan: 'Small function' },
        { id: '62kva',  label: '62 kVA' },
        { id: '125kva', label: '125 kVA or more', scan: 'Full production' },
        { id: 'silent', label: 'Silent canopy', scan: 'Quiet enough beside a mandap' },
      ],
    },
    {
      id: 'cooling',
      question: 'What cooling or heating?',
      type: 'multi',
      choices: [
        { id: 'ac',       label: 'Portable AC units' },
        { id: 'mist',     label: 'Mist fans' },
        { id: 'pedestal', label: 'Pedestal fans' },
        { id: 'heaters',  label: 'Patio heaters' },
      ],
    },
  ],

  /* ── Safety & Facilities ─────────────────────────────────────────── */
  'Safety & Facilities': [
    {
      id: 'offer',
      question: 'What do you provide?',
      type: 'multi',
      choices: [
        { id: 'washrooms', label: 'Portable washrooms' },
        { id: 'vip_loo',   label: 'AC restroom trailer' },
        { id: 'first_aid', label: 'First-aid attendant' },
        { id: 'ambulance', label: 'Ambulance on standby' },
        { id: 'fire',      label: 'Fire extinguishers' },
      ],
    },
    {
      id: 'medical_grade',
      question: 'If you supply medical cover, what level?',
      type: 'one',
      choices: [
        { id: 'none', label: 'We do not do medical' },
        { id: 'bls',  label: 'Basic life support' },
        { id: 'als',  label: 'Advanced cardiac support' },
      ],
    },
  ],

  /* ── Priest & Rituals ────────────────────────────────────────────
     Language and tradition are not preferences here. A family looking
     for a Kannada purohit will not accept a North Indian pandit, and
     sending one is worse than sending nobody. */
  'Priest & Rituals': [
    {
      id: 'tradition',
      question: 'Which tradition do you perform?',
      type: 'multi',
      choices: [
        { id: 'kannada',  label: 'Kannada / Karnataka' },
        { id: 'tamil',    label: 'Tamil / Iyer' },
        { id: 'telugu',   label: 'Telugu' },
        { id: 'north',    label: 'North Indian' },
        { id: 'madhwa',   label: 'Madhwa' },
        { id: 'lingayat', label: 'Lingayat' },
      ],
    },
    {
      id: 'ceremonies',
      question: 'What do you conduct?',
      type: 'multi',
      choices: [
        { id: 'wedding',       label: 'Weddings' },
        { id: 'griha',         label: 'Griha pravesha' },
        { id: 'naming',        label: 'Naming and cradle' },
        { id: 'satyanarayana', label: 'Satyanarayana pooja' },
        { id: 'shraddha',      label: 'Shraddha and last rites' },
      ],
    },
    {
      id: 'samagri',
      question: 'Do you bring the samagri?',
      type: 'one',
      choices: [
        { id: 'yes',    label: 'Yes, everything' },
        { id: 'list',   label: 'We send a list, the family buys it' },
        { id: 'either', label: 'Either way' },
      ],
    },
  ],

  /* ── Gifts & Favours ─────────────────────────────────────────────── */
  'Gifts & Favours': [
    {
      id: 'kinds',
      question: 'What do you supply?',
      type: 'multi',
      choices: [
        { id: 'return',    label: 'Return gifts' },
        { id: 'hampers',   label: 'Premium hampers' },
        { id: 'eco',       label: 'Eco-friendly and plants' },
        { id: 'silver',    label: 'Silver and brass items' },
        { id: 'sweets',    label: 'Sweet boxes' },
        { id: 'corporate', label: 'Corporate gifting' },
      ],
    },
    {
      id: 'personalise',
      question: 'Can you personalise them?',
      type: 'one',
      choices: [
        { id: 'yes',  label: 'Yes, printing or engraving' },
        { id: 'pack', label: 'Custom packing only' },
        { id: 'no',   label: 'As stocked' },
      ],
    },
  ],

  /* ── Valet Parking ───────────────────────────────────────────────── */
  'Valet Parking': [
    {
      id: 'scale',
      question: 'How many cars can you handle?',
      type: 'one',
      choices: [
        { id: '25',  label: 'Up to 25' },
        { id: '75',  label: 'Up to 75' },
        { id: '200', label: '200 or more' },
      ],
    },
    {
      id: 'extras',
      question: 'What is included?',
      type: 'multi',
      choices: [
        { id: 'uniform', label: 'Uniformed drivers' },
        { id: 'tags',    label: 'Key tag system' },
        { id: 'batons',  label: 'Traffic marshals and batons' },
        { id: 'insured', label: 'Insured drivers' },
      ],
    },
  ],
}

/** The spec groups for a trade, or an empty list. */
export function specsForTrade(trade) {
  return SPECS_BY_TRADE[trade] ?? []
}

/**
 * A one-line summary of what somebody has answered.
 *
 * Shown on the service row so a partner can see their own answers without
 * opening the form, and read by a coordinator scanning a list. Truncated
 * rather than wrapped: this sits under a service name, and three lines of
 * ticked boxes under every row turns a scannable list into a wall.
 */
export function describeSpecs(trade, specs, max = 4) {
  const groups = specsForTrade(trade)
  if (!groups.length || !specs) return null
  const labels = []
  for (const g of groups) {
    const picked = specs[g.id]
    if (!picked) continue
    const ids = Array.isArray(picked) ? picked : [picked]
    for (const id of ids) {
      const c = g.choices.find(x => x.id === id)
      if (c) labels.push(c.label)
    }
  }
  if (!labels.length) return null
  return labels.length > max
    ? `${labels.slice(0, max).join(' · ')} +${labels.length - max}`
    : labels.join(' · ')
}

/** How many groups a partner has answered, out of how many. */
export function specProgress(trade, specs) {
  const groups = specsForTrade(trade)
  if (!groups.length) return null
  const done = groups.filter(g => {
    const v = specs?.[g.id]
    return Array.isArray(v) ? v.length > 0 : v != null
  }).length
  return { done, total: groups.length }
}
