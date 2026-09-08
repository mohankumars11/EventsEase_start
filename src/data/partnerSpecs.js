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

  /* ══════════════════════════════════════════════════════════════════
     CATERING ASKS ITS QUESTIONS IN THE FUNNEL, NOT HERE
     ══════════════════════════════════════════════════════════════════

     This trade used to hold four groups here: diet, cuisines, kitchen
     and service. The funnel then arrived and asked the first three again
     on its own screens, so a caterer answered the same things twice --
     and the second time was all four crammed onto one page.

     That page was exactly the single-screen bombarding the funnel was
     built to end. It survived because the funnel was added ALONGSIDE it
     rather than replacing it: shipping a better version of a screen is
     only half the job, and until the old one goes the partner does the
     work twice.

     Kitchen and cuisines now live in data/cateringFunnel.js. How they
     serve moved to data/cateringOperations.js with the rest of the
     operational questions. Catering deliberately keeps NO trade-level
     group, and specsForServices falls through to the per-offering sets
     in data/partnerServiceSpecs.js. */


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
        { id: 'exotic',     label: 'Imported and exotic flowers',
          scan: 'Orchids, hydrangea, tulips — cold chain' },
        { id: 'artificial', label: 'Silk / artificial florals' },
        { id: 'truss',      label: 'Truss and structural fabrication' },
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
        { id: 'temple',      label: 'South Indian temple style' },
        { id: 'kids',        label: 'Kids and cartoon' },
        { id: 'minimal',     label: 'Modern minimal' },
        { id: 'corporate',   label: 'Corporate branding' },
      ],
    },
    {
      id: 'flooring',
      question: 'What do you lay over the stage?',
      type: 'multi',
      choices: [
        { id: 'acrylic', label: 'White acrylic deck' },
        { id: 'carpet',  label: 'Red or coloured carpet' },
        { id: 'flex',    label: 'Printed flex on plinths' },
        { id: 'grass',   label: 'Artificial grass' },
        { id: 'as_is',   label: 'We use the venue floor as it is' },
      ],
    },
    {
      /* Cold pyro is indoor-safe and dry ice is not the same thing as
         fog. A family asking for the cloud walk means dry ice, and a
         decorator who turns up with a fog machine will disappoint them
         in front of two hundred people. */
      id: 'effects',
      question: 'What effects can you run?',
      type: 'multi',
      choices: [
        { id: 'cold_pyro', label: 'Cold pyro fountains', scan: 'Smoke-free, indoor safe' },
        { id: 'dry_ice',   label: 'Dry ice low fog', scan: 'The cloud walk' },
        { id: 'fog',       label: 'Fog and haze machines' },
        { id: 'bubbles',   label: 'Bubble machines' },
        { id: 'petals',    label: 'Flower petal cannons' },
        { id: 'confetti',  label: 'Confetti blasters' },
        { id: 'none',      label: 'No effects' },
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
        { id: 'raw',    label: 'The unedited files too', scan: 'On a drive or a cloud link' },
        { id: 'album',  label: 'Printed album' },
        { id: 'frames', label: 'Framed enlargements' },
        { id: 'reels',  label: 'Short reels for social' },
      ],
    },
    {
      /* The most common argument after a wedding, and it was asked
         nowhere. A family expecting the album in a fortnight and a studio
         working to ninety days both think they were clear. */
      id: 'timeline',
      question: 'How long until they get everything?',
      type: 'one',
      choices: [
        { id: '14', label: 'Within two weeks' },
        { id: '30', label: 'About a month' },
        { id: '60', label: 'Two months' },
        { id: '90', label: 'Up to three months', scan: 'Full cinematic grade' },
      ],
    },
    {
      id: 'cameras',
      question: 'What do you shoot on?',
      hint: 'A dark mantapa is where this shows.',
      type: 'multi',
      choices: [
        { id: 'dslr',       label: 'DSLR' },
        { id: 'mirrorless', label: 'Full-frame mirrorless', scan: 'Sony A7, Canon R' },
        { id: 'cine',       label: 'Cinema rigs', scan: 'FX3, Komodo class' },
        { id: 'medium',     label: 'Medium format' },
        { id: 'backup',     label: 'A second body as backup', scan: 'If one dies mid-ceremony' },
      ],
    },
  ],

  'Videography': [
    {
      id: 'timeline',
      question: 'How long until the film is delivered?',
      type: 'one',
      choices: [
        { id: '14', label: 'Within two weeks' },
        { id: '30', label: 'About a month' },
        { id: '60', label: 'Two months' },
        { id: '90', label: 'Up to three months', scan: 'Full colour grade' },
      ],
    },
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
        { id: 'gimbal',     label: 'Gimbal and slider' },
        { id: 'crane',    label: 'Jimmy jib / camera crane' },
        { id: 'rig_360',  label: '360 degree video rig' },
        { id: 'audio',    label: 'Separate audio recording', scan: 'Lapel mics on the couple' },
        { id: 'same_day', label: 'Same-day edit', scan: 'Played at the reception' },
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
      /* A choultry and a rooftop lounge were the same word. They are not
         the same booking, not the same price, and a family looking for a
         kalyana mantapa should not be shown a farmhouse. */
      id: 'venue_type',
      question: 'What kind of property is it?',
      type: 'one',
      choices: [
        { id: 'mantapa',    label: 'Kalyana mantapa / choultry' },
        { id: 'banquet',    label: 'Air-conditioned banquet hall' },
        { id: 'lawn',       label: 'Lawn, farmhouse or open ground' },
        { id: 'convention', label: 'Convention centre' },
        { id: 'rooftop',    label: 'Rooftop or restaurant party space' },
        { id: 'resort',     label: 'Resort or weekend property' },
        { id: 'clubhouse',  label: 'Clubhouse or auditorium' },
        { id: 'temple',     label: 'Temple hall' },
      ],
    },
    {
      id: 'catering_rule',
      question: 'Can customers bring their own caterer?',
      /* The single most common reason a venue booking falls apart, and
         it is never asked until after the deposit. */
      type: 'one',
      choices: [
        { id: 'outside_ok',   label: 'Yes, any caterer' },
        /* What most Bengaluru halls actually do, and neither of the other
           two answers is it. A venue forced to pick "yes, any caterer"
           hides a charge the family finds out about later. */
        { id: 'outside_fee',  label: 'Yes, with a kitchen charge',
          scan: 'Outside caterers allowed, royalty payable' },
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
        /* The first question anybody asks about a Bengaluru hall in
           April, and there was no way for a venue to answer it. */
        { id: 'ac',          label: 'Air-conditioned hall' },
        /* And the first question the caterer asks. A hall with no
           working kitchen means the food is cooked elsewhere and
           arrives cold, which is a different job and a different price. */
        { id: 'kitchen',     label: 'Kitchen the caterer can use' },
        { id: 'rooms',       label: 'Changing rooms' },
        { id: 'homa',        label: 'Homa kunda pit' },
        { id: 'generator',   label: 'Power backup' },
        { id: 'lift',        label: 'Lift' },
        { id: 'ramp',        label: 'Step-free access',
          scan: 'A wheelchair or a walker can get in' },
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
        /* An allergy is not a preference. A nut-free claim from a kitchen
           that also makes badam halwa is worth asking about explicitly. */
        { id: 'nut_free',label: 'Nut free', scan: 'Made away from nuts' },
        { id: 'gluten_free', label: 'Gluten free' },
        { id: 'jain',    label: 'Jain', scan: 'No root vegetables, no gelatin' },
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
        { id: 'nadaswaram', label: 'Nadaswaram', scan: 'With thavil, for the muhurtha' },
        { id: 'shehnai',    label: 'Shehnai', scan: 'The north Indian counterpart' },
        { id: 'dollu',      label: 'Dollu Kunitha' },
        /* Karnataka's own procession forms. A troupe that does veeragase
           had to tick "Dance troupe" and hope, which is the same as not
           being findable for the thing they are actually known for. */
        { id: 'veeragase',  label: 'Veeragase' },
        { id: 'kamsale',    label: 'Kamsale' },
        { id: 'pooja_kunitha', label: 'Pooja Kunitha' },
        { id: 'chande',     label: 'Chande' },
        { id: 'yakshagana', label: 'Yakshagana', scan: 'Coastal Karnataka' },
        { id: 'dhol',       label: 'Dhol / band' },
        { id: 'nasik',      label: 'Nasik dhol' },
        { id: 'classical',  label: 'Classical music' },
        { id: 'sufi',       label: 'Sufi / qawwali' },
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
        { id: 'hd',        label: 'HD makeup' },
        { id: 'airbrush',  label: 'Airbrush' },
        { id: 'natural',   label: 'Natural / minimal' },
        /* The finish a Karnataka bride asks for by name, and the one
           finish that was not on the list. */
        { id: 'matte',     label: 'South Indian bridal matte' },
        { id: 'waterproof',label: 'Waterproof', scan: 'Outdoor and destination' },
        { id: 'hair',      label: 'Hair styling' },
        { id: 'saree',     label: 'Saree draping' },
        { id: 'nails',     label: 'Nail art and extensions' },
      ],
    },
    {
      /* A freelancer with one kit and a salon that can send four artists
         were the same row and cannot take the same job. Twelve relatives
         before a 9am muhurta is not a solo booking. */
      id: 'business_scale',
      question: 'How do you work?',
      type: 'one',
      choices: [
        { id: 'freelance', label: 'On my own', scan: 'I come with my kit' },
        { id: 'assistant', label: 'Me and an assistant' },
        { id: 'studio',    label: 'A studio team', scan: 'We can send several artists' },
      ],
    },
    {
      id: 'capacity',
      question: 'How many people can you finish in three hours?',
      hint: 'Bride first, then the family, and the muhurta does not move.',
      type: 'one',
      choices: [
        { id: '2',    label: 'Up to 2' },
        { id: '6',    label: '3 to 6' },
        { id: '12',   label: '7 to 12' },
        { id: '12up', label: 'More than 12' },
      ],
    },
    {
      id: 'products',
      question: 'What is in your kit?',
      hint: 'Families ask, and a reaction on a wedding morning cannot be undone.',
      type: 'one',
      choices: [
        { id: 'professional', label: 'Professional brands', scan: 'MAC, Kryolan, Huda' },
        { id: 'luxury',       label: 'Luxury brands', scan: 'Dior, Charlotte Tilbury' },
        { id: 'organic',      label: 'Organic and hypoallergenic only' },
      ],
    },
    {
      id: 'hair',
      question: 'What hair work do you do?',
      type: 'multi',
      choices: [
        { id: 'jadai',      label: 'Bridal jadai', scan: 'Plait, with fresh flowers' },
        { id: 'updo',       label: 'Updos and Hollywood waves' },
        { id: 'extensions', label: 'Extensions and volume inserts' },
        { id: 'groom',      label: 'Groom hair and beard setting' },
        { id: 'blowdry',    label: 'Blow-dry and straightening' },
      ],
    },
    /* The trial question lives on the operations screen — it is about
       when they work, not what they do, and it was already there under
       "Do you offer a trial before the day?". Asked on both, a partner
       answers the same thing twice on two screens and learns the form
       is not paying attention. */
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
        { id: 'white',     label: 'White and glitter', scan: 'Over the henna, for photos' },
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
    {
      /* Black "henna" is PPD and it burns people. An artist who uses real
         henna could not say so, and a family who has been burnt before
         had no way to ask. The only question on this screen that is
         about safety rather than taste. */
      id: 'cone',
      question: 'What do you use?',
      type: 'one',
      choices: [
        { id: 'organic',   label: 'Organic henna only', scan: 'No black cone, no PPD' },
        { id: 'both',      label: 'Organic, and black cone if asked' },
        { id: 'as_bought', label: 'Shop-bought cones' },
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
        { id: 'maharaja',  label: 'Maharaja wedding seats' },
        { id: 'diwan',     label: 'Floor diwan and bolsters', scan: 'For the mehendi and pooja' },
        { id: 'cocktail',  label: 'High cocktail tables' },
        { id: 'linen',     label: 'Table linen and chair covers' },
        { id: 'cooler',    label: 'Fans and coolers' },
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
        { id: 'pa_small',  label: 'Small PA', scan: 'Under 50 guests, a housewarming' },
        { id: 'pa',        label: 'Party pack with bass', scan: 'Dance floors, up to 200' },
        { id: 'line_array',label: 'Line array', scan: 'Convention halls, live orchestra' },
        { id: 'mics',      label: 'Cordless and collar mics' },
        { id: 'monitors',  label: 'Stage monitors' },
        { id: 'mixer',     label: 'Mixing console and an engineer' },
        { id: 'projector', label: 'Projector and screen' },
        { id: 'led_wall',  label: 'LED video wall' },
        { id: 'truss',     label: 'Truss and rigging' },
        { id: 'generator', label: 'Power backup' },
      ],
    },
    {
      /* Hardware and somebody to run it are two different orders. A
         family who hired speakers and expected a DJ has an empty dance
         floor and nobody to blame for it. */
      id: 'operator',
      question: 'Does somebody come with the equipment?',
      type: 'one',
      choices: [
        { id: 'rental',     label: 'Rental only', scan: 'You set it up, we do not stay' },
        { id: 'technician', label: 'A technician stays with it' },
        { id: 'dj',         label: 'A DJ comes with it', scan: 'Kannada, Bollywood, commercial' },
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

  /* ── Transportation ───────────────────────────────────────────────
     Five vehicle names covered everything from a scooter carrying a card
     box to a 32-foot container carrying a stage, and a customer moving
     400 chairs was matched against somebody who runs Innovas.

     So this is the fleet as the trade itself names it — by wheels and by
     payload, the way a Bengaluru transporter says it on the phone. A
     partner ticks what they actually own; dispatch reads the payload the
     class implies and stops offering a Tata Ace a job that needs a
     14-footer. */
  'Transportation': [
    {
      id: 'fleet',
      question: 'What do you run?',
      hint: 'Tick every vehicle you own or can send. Payloads are the usual rated limits.',
      type: 'multi',
      choices: [
        /* Two-wheeler. A card box, a garland, a forgotten pair of
           earrings on the morning of the wedding — small and urgent is a
           real job and nobody could take it. */
        { id: 'bike',         label: 'Bike / scooter', scan: '2-wheeler, up to 20 kg' },

        /* Three-wheeler, passenger and goods. */
        { id: 'auto',         label: 'Auto rickshaw', scan: '3-wheeler, 3 seats' },
        { id: 'e_auto',       label: 'Electric auto', scan: '3-wheeler, 3 seats' },
        { id: 'cargo_auto',   label: 'Cargo auto (Ape, Jeeto)', scan: '3-wheeler, up to 500 kg' },

        /* Four-wheeler goods — the spine of the trade. */
        { id: 'tata_ace',     label: 'Tata Ace / Chhota Hathi', scan: '4-wheeler, up to 750 kg' },
        { id: 'pickup',       label: 'Bolero pickup / Dost', scan: '4-wheeler, up to 1.5 t' },
        { id: 'tata_407',     label: 'Tata 407 / 9 ft', scan: '4-wheeler, up to 2.5 t' },

        /* Six-wheeler. Where a full tent order or a stage starts. */
        { id: 'truck_14',     label: '14 ft truck', scan: '6-wheeler, up to 4 t' },
        { id: 'truck_17',     label: '17 ft truck', scan: '6-wheeler, up to 5 t' },

        /* Eight-wheeler and containers. */
        { id: 'truck_19',     label: '19 ft truck', scan: '8-wheeler, up to 7 t' },
        { id: 'container_20', label: '20 ft container', scan: '8-wheeler, closed body' },
        { id: 'container_32', label: '32 ft container', scan: 'Multi-axle, full production' },

        /* Passenger. */
        { id: 'hatchback',    label: 'Hatchback', scan: '4 seats' },
        { id: 'sedan',        label: 'Sedan', scan: '4 seats' },
        { id: 'suv',          label: 'SUV / Innova / Ertiga', scan: '6 to 7 seats' },
        { id: 'luxury',       label: 'Luxury or vintage car', scan: 'For the bride and groom' },
        { id: 'tempo_12',     label: 'Tempo traveller, 12 seats' },
        { id: 'tempo_17',     label: 'Tempo traveller, 17 seats' },
        { id: 'tempo_26',     label: 'Force traveller, 26 seats' },
        { id: 'minibus_32',   label: 'Mini bus, 32 seats' },
        { id: 'bus_50',       label: 'Bus, 50 seats or more' },

        /* Specials, each of which is a job somebody could not place. */
        { id: 'reefer',       label: 'Refrigerated van', scan: 'Cake, flowers, cold chain' },
        { id: 'hydra',        label: 'Hydra crane / forklift', scan: 'Truss and stage lifting' },
        { id: 'tractor',      label: 'Tractor trailer', scan: 'Farmhouse and lawn ground access' },
      ],
    },
    {
      id: 'moves',
      question: 'What do you move?',
      hint: 'The crew that shifts chairs is not the crew that drives the bride.',
      type: 'multi',
      choices: [
        { id: 'guests',      label: 'Guests and family' },
        { id: 'bride_car',   label: 'The bride or groom car' },
        { id: 'equipment',   label: 'Event equipment', scan: 'Tents, chairs, sound, lights' },
        { id: 'food',        label: 'Cooked food and catering vessels' },
        { id: 'flowers',     label: 'Flowers and decor', scan: 'Fragile, time-critical' },
        { id: 'gifts',       label: 'Gifts, trousseau and cards' },
        { id: 'house_shift', label: 'Household shifting', scan: 'Griha pravesha moves' },
      ],
    },
    {
      /* The whole reason a per-kilometre trade could not be listed
         honestly: every unit in the app was per event, per day or per
         person, and a transporter charges by distance. */
      id: 'charge_metric',
      question: 'How do you charge?',
      type: 'one',
      choices: [
        { id: 'per_km',    label: 'Base fare plus per kilometre' },
        { id: 'hourly',    label: 'Hourly blocks', scan: '4 hours / 8 hours' },
        { id: 'zone_flat', label: 'Flat fare by zone', scan: 'One price across a part of the city' },
        { id: 'per_trip',  label: 'Flat price per trip' },
      ],
    },
    {
      id: 'helpers',
      question: 'Who loads and unloads?',
      hint: 'The question every equipment move turns into an argument over.',
      type: 'one',
      choices: [
        { id: 'driver_only',  label: 'Driver only', scan: 'The customer arranges labour' },
        { id: 'driver_helps', label: 'Driver helps with light loading' },
        { id: 'crew_1',       label: 'One helper travels with the vehicle' },
        { id: 'crew_2',       label: 'Two helpers travel with the vehicle' },
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
        { id: 'kannada',   label: 'Kannada' },
        { id: 'english',   label: 'English' },
        { id: 'hindi',     label: 'Hindi' },
        { id: 'tamil',     label: 'Tamil' },
        { id: 'telugu',    label: 'Telugu' },
        /* Bengaluru is a six-language city and the list stopped at five.
           A Malayali family's reception has to be run in Malayalam by
           somebody, and there was no way for that somebody to say so. */
        { id: 'malayalam', label: 'Malayalam' },
        { id: 'marathi',   label: 'Marathi' },
        { id: 'urdu',      label: 'Urdu' },
        { id: 'konkani',   label: 'Konkani' },
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
        /* A Kannada or Tamil card is typeset, not translated, and a
           printer who cannot set the script cannot take the job. */
        { id: 'regional', label: 'Kannada and regional scripts',
          scan: 'Typeset, not transliterated' },
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
        { id: 'bartender', label: 'Trained bartenders' },
        { id: 'flair',     label: 'Flair bartending', scan: 'Performance mixing' },
        { id: 'mocktail',  label: 'Live mocktail counter' },
        { id: 'tender',    label: 'Tender coconut counter' },
        { id: 'coffee',    label: 'Filter coffee and tea counter' },
        { id: 'permit',    label: 'We arrange the one-day licence',
          scan: 'CL-5 occasional permit, Karnataka' },
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
        { id: 'kannada',   label: 'Kannada' },
        { id: 'english',   label: 'English' },
        { id: 'hindi',     label: 'Hindi' },
        { id: 'tamil',     label: 'Tamil' },
        { id: 'telugu',    label: 'Telugu' },
        /* Bengaluru is a six-language city and the list stopped at five.
           A Malayali family's reception has to be run in Malayalam by
           somebody, and there was no way for that somebody to say so. */
        { id: 'malayalam', label: 'Malayalam' },
        { id: 'marathi',   label: 'Marathi' },
        { id: 'urdu',      label: 'Urdu' },
        { id: 'konkani',   label: 'Konkani' },
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
        /* Smartha is the other half of the Kannada brahmin question. A
           family knows which one they are and asks for it by name;
           offering Madhwa without it makes every Smartha purohit
           unlistable and every Smartha family unmatched. */
        { id: 'smartha',  label: 'Smartha' },
        { id: 'lingayat', label: 'Lingayat' },
        { id: 'kerala',   label: 'Kerala / Namboothiri' },
        { id: 'jain',     label: 'Jain' },
        /* The usual choice for an inter-caste wedding in Bengaluru, and
           the one a family searches for by name when no tradition on the
           rest of this list is theirs. */
        { id: 'arya',     label: 'Arya Samaj' },
      ],
    },
    {
      id: 'ceremonies',
      question: 'What do you conduct?',
      type: 'multi',
      choices: [
        { id: 'wedding',       label: 'Weddings' },
        { id: 'nischitartha',  label: 'Engagement / nischitartha' },
        /* The thread ceremony is one of the most-booked priest jobs in
           Karnataka and there was no way to say you do it. */
        { id: 'upanayana',     label: 'Upanayana / thread ceremony' },
        { id: 'seemantha',     label: 'Seemantha / baby shower' },
        { id: 'griha',         label: 'Griha pravesha' },
        { id: 'bhoomi',        label: 'Bhoomi pooja / vastu',
          scan: 'Before building, not after moving in' },
        { id: 'naming',        label: 'Naming and cradle' },
        { id: 'ayushya',       label: 'Ayushya homa / birthday homa' },
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

  /* ── Wedding Planning ─────────────────────────────────────────────
     A planner could register and was then asked nothing at all — no
     detail screen existed for the trade. So every planner on the
     platform looked identical to every other, and the one thing that
     separates them, whether they run the whole thing or only stand on
     the ground on the day, could not be said.

     The permits question is the one nobody else can answer. A CL-5 for
     a bar, PPL and IPRS for recorded music, a police NOC for a road
     procession — a family finds out these exist about four days before
     the event, and a planner who already holds the relationship is
     worth finding. */
  'Wedding Planning': [
    {
      id: 'execution_scope',
      question: 'How much do you take on?',
      type: 'one',
      choices: [
        { id: 'turnkey',      label: 'The whole event, end to end',
          scan: 'Budget, vendors, timeline, the day itself' },
        { id: 'day_only',     label: 'The day itself only',
          scan: 'You execute a plan the family already made' },
        { id: 'vendor_only',  label: 'Finding and managing vendors' },
        { id: 'design_only',  label: 'Design and styling direction only' },
      ],
    },
    {
      id: 'events',
      question: 'What do you plan?',
      type: 'multi',
      choices: [
        { id: 'wedding',     label: 'Weddings' },
        { id: 'reception',   label: 'Receptions' },
        { id: 'engagement',  label: 'Engagement and nischitartha' },
        { id: 'sangeet',     label: 'Sangeet and mehendi nights' },
        { id: 'griha',       label: 'Griha pravesha' },
        { id: 'naming',      label: 'Naming and cradle ceremonies' },
        { id: 'birthday',    label: 'Birthdays and anniversaries' },
        { id: 'corporate',   label: 'Corporate events and conferences' },
        { id: 'destination', label: 'Destination weddings',
          scan: 'Coorg, Mysuru, Goa, outside Karnataka' },
      ],
    },
    {
      id: 'covers',
      question: 'What is inside your fee?',
      hint: 'The line a family and a planner most often remember differently.',
      type: 'multi',
      choices: [
        { id: 'budget',      label: 'Budget planning and tracking' },
        { id: 'sourcing',    label: 'Sourcing and negotiating vendors' },
        { id: 'timeline',    label: 'Running sheet and timeline' },
        { id: 'rsvp',        label: 'Guest lists and RSVP' },
        { id: 'travel',      label: 'Guest hotels and travel' },
        { id: 'on_day',      label: 'Directing on the day' },
        { id: 'settlement',  label: 'Settling vendor payments afterwards' },
      ],
    },
    {
      id: 'permits',
      question: 'Which permissions can you get?',
      hint: 'Nothing here counts against you. Leave it blank if you do not do permits.',
      type: 'multi',
      choices: [
        { id: 'liquor_cl5', label: 'One-day liquor licence',
          scan: 'CL-5 occasional bar permit, Karnataka' },
        { id: 'music',      label: 'Music copyright clearance',
          scan: 'PPL, IPRS, Novex' },
        { id: 'police_noc', label: 'Police NOC and traffic clearance' },
        { id: 'fire_noc',   label: 'Fire safety approval' },
        { id: 'bbmp',       label: 'BBMP or panchayat clearance' },
        { id: 'drone',      label: 'Drone flying permission' },
      ],
    },
  ],

  /* ── Trousseau & Gift Packing ─────────────────────────────────────
     Split out of Gifts because they are not the same business. A shop
     that sells return gifts holds stock; a packing studio holds none
     and is paid for the hands. A family with forty sarees to wrap and
     no gifts to buy was being sent to shops.

     Turnaround is the question that decides everything here: laser-cut
     acrylic with a printed name takes a fortnight, and the family
     asking usually has nine days. */
  'Trousseau & Gift Packing': [
    {
      id: 'packing',
      question: 'What do you make?',
      type: 'multi',
      choices: [
        { id: 'acrylic',     label: 'Laser-cut acrylic trays and hampers' },
        { id: 'potli',       label: 'Raw silk and velvet potli boxes' },
        { id: 'floral',      label: 'Floral basket wraps', scan: 'Fresh or artificial' },
        { id: 'bamboo',      label: 'Wooden and bamboo eco boxes' },
        { id: 'leatherette', label: 'Leatherette shagun boxes' },
        { id: 'saree_fold',  label: 'Saree folding and tray setting' },
        { id: 'ring_tray',   label: 'Ring and engagement platters' },
        { id: 'thamboola',   label: 'Thamboola bags and haldi kumkum sets' },
        { id: 'dry_fruit',   label: 'Dry fruit and sweet boxes' },
      ],
    },
    {
      id: 'fulfilment',
      question: 'Where does the packing happen?',
      type: 'one',
      choices: [
        { id: 'on_site',   label: 'At the family home',
          scan: 'Your team comes with the materials' },
        { id: 'workshop',  label: 'At your workshop',
          scan: 'They send the things, you deliver the trays' },
        { id: 'either',    label: 'Either way' },
      ],
    },
    {
      id: 'turnaround',
      question: 'How long for fifty trays?',
      hint: 'The honest answer here is what stops a rushed order going wrong.',
      type: 'one',
      choices: [
        { id: '3_days',   label: 'Three days' },
        { id: '7_10',     label: 'Seven to ten days' },
        { id: '15_plus',  label: 'Fifteen days or more',
          scan: 'Custom laser-cut and printed branding' },
      ],
    },
    {
      id: 'personalise',
      question: 'Can you personalise them?',
      type: 'multi',
      choices: [
        { id: 'names',    label: 'Printed names and dates' },
        { id: 'engrave',  label: 'Engraving' },
        { id: 'monogram', label: 'Monograms and motifs' },
        { id: 'kannada',  label: 'Kannada or regional script' },
      ],
    },
  ],

  /* ── Valet Parking ───────────────────────────────────────────────── */
  'Valet Parking': [
    /* Car volume is on the operations screen, where it carries an exact
       number — a crew that handles 140 can say 140 rather than picking
       "200 or more". Two ladders for one question, with different rungs
       (75 here, 50 and 100 there), also meant two different answers to
       the same question depending on which screen a partner reached. */
    {
      id: 'extras',
      question: 'What is included?',
      type: 'multi',
      choices: [
        { id: 'uniform', label: 'Uniformed drivers' },
        { id: 'tags',    label: 'Key tag system' },
        { id: 'batons',  label: 'Traffic marshals and batons' },
        { id: 'insured', label: 'Insured drivers' },
        /* An insured driver and an insured car are not the same promise,
           and the one the family cares about is the scratch on the
           bumper. */
        { id: 'garage_cover', label: 'Damage cover on the cars',
          scan: 'A scratch is paid for, not argued about' },
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
