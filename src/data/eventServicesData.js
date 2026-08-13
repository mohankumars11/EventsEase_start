// Complete event → services data.
// Each event has: emoji, gradient, hero colours, and the services it offers.
//
// ── Where the packages went ─────────────────────────────────────────────
// Every occasion used to carry two or three hand-written packages here
// ("Essential Birthday", "Grand Celebration", "Royal Grand Party") plus a gift
// hamper, each with a flat invented range. They are gone. An occasion's
// packages are the eight celebration tiers, priced per occasion through the
// same quote engine the builder uses — see data/occasionPackages.js, which
// explains at length why the old three could not stay.
//
// Nothing that reads this file should reintroduce a `packages` key. The tier
// ladder is the only answer to "what can I book as a whole", and having two
// answers is exactly the state this replaced.
//
// priceMin/priceMax on each SVC entry are researched India market-rate
// ESTIMATES for cart totals — review and adjust before treating them as
// final customer-facing prices. priceHint is the display string derived
// from the same numbers so they can't drift apart.

// Dates are approximate (lunar-calendar festivals shift year to year) —
// good enough for "X days away" messaging, not claimed as astronomically
// precise. Update these annually; a real fix is an admin-editable
// festival calendar (blueprint section 45), out of scope for now.
// "daysOut" is intentionally NOT stored here — FestivalBanner computes
// it live from `date`, so this data can't go stale silently again.
// `id` matches FESTIVALS[].id (src/data/festivals.js) when a full detail
// page exists for that festival; otherwise it's just a routing slug used
// to pre-fill the planning wizard — either way every festival here routes
// to something about *itself*, never a generic fallback.
export const UPCOMING_FESTIVALS = [
  { id: 'independence-day', name: 'Independence Day', date: '2026-08-15', emoji: '🇮🇳' },
  { id: 'raksha-bandhan',   name: 'Raksha Bandhan',   date: '2026-08-28', emoji: '🪢' },
  { id: 'janmashtami',      name: 'Janmashtami',      date: '2026-09-04', emoji: '🪈' },
  { id: 'ganesh-chaturthi', name: 'Ganesh Chaturthi', date: '2026-09-14', emoji: '🐘' },
  { id: 'navratri',         name: 'Navratri',         date: '2026-10-11', emoji: '💃' },
  { id: 'dussehra',         name: 'Dussehra',         date: '2026-10-20', emoji: '🏹' },
  { id: 'diwali',           name: 'Diwali',           date: '2026-11-08', emoji: '🪔' },
  { id: 'christmas',        name: 'Christmas',        date: '2026-12-25', emoji: '🎄' },
  { id: 'new-years-eve',    name: "New Year's Eve",   date: '2026-12-31', emoji: '🎆' },
]

// All possible service definitions (reused across events)
const SVC = {
  venue:          { id: 'venue',          name: 'Venue Booking',        emoji: '🏛️', category: 'Venue',         desc: 'Banquet halls, gardens, rooftops & lawns',       priceHint: '₹5,000 – ₹2,00,000',   priceMin: 5000,   priceMax: 200000 },
  cake:           { id: 'cake',           name: 'Custom Cake',          emoji: '🎂', category: 'Bakery',        desc: 'Designer cakes, cupcake towers, theme cakes',    priceHint: '₹800 – ₹15,000',       priceMin: 800,    priceMax: 15000 },
  catering:       { id: 'catering',       name: 'Catering & Buffet',    emoji: '🍽️', category: 'Catering',      desc: 'Full buffet, live counters, multi-cuisine',      priceHint: '₹250 – ₹800/plate',    priceMin: 250,    priceMax: 800 },
  cooks:          { id: 'cooks',          name: 'Personal Cooks',       emoji: '👨‍🍳', category: 'Catering',      desc: 'Expert chefs who cook fresh at your venue',      priceHint: '₹3,000 – ₹15,000',     priceMin: 3000,   priceMax: 15000 },
  menu:           { id: 'menu',           name: 'Customized Menu',      emoji: '📋', category: 'Catering',      desc: 'Veg / Non-veg / Fusion / Jain / Keto options',   priceHint: 'Included with catering', priceMin: 0,    priceMax: 0 },
  dining:         { id: 'dining',         name: 'Dining Setup',         emoji: '🪑', category: 'Furniture',     desc: 'Tables, chairs, linen, crockery & cutlery',      priceHint: '₹50 – ₹200/seat',      priceMin: 50,     priceMax: 200 },
  stage:          { id: 'stage',          name: 'Stage & Backdrop',     emoji: '🎪', category: 'Decor',         desc: 'Stage platform, truss, draping & backdrop',      priceHint: '₹8,000 – ₹80,000',     priceMin: 8000,   priceMax: 80000 },
  decor:          { id: 'decor',          name: 'Theme Decoration',     emoji: '🎨', category: 'Decor',         desc: 'Balloons, florals, props & themed setups',       priceHint: '₹5,000 – ₹60,000',     priceMin: 5000,   priceMax: 60000 },
  floral:         { id: 'floral',         name: 'Floral Decoration',    emoji: '🌸', category: 'Decor',         desc: 'Marigold, roses, orchids — traditional & modern', priceHint: '₹4,000 – ₹40,000',    priceMin: 4000,   priceMax: 40000 },
  lighting:       { id: 'lighting',       name: 'Lighting Rig',         emoji: '💡', category: 'Lighting',      desc: 'LED walls, fairy lights, colour wash & spotlights', priceHint: '₹10,000 – ₹1,20,000', priceMin: 10000,  priceMax: 120000 },
  dj:             { id: 'dj',             name: 'DJ & Sound System',    emoji: '🎵', category: 'Entertainment', desc: 'DJ console, PA system, sub-woofers',             priceHint: '₹8,000 – ₹1,00,000',     priceMin: 8000,   priceMax: 100000 },
  live_music:     { id: 'live_music',     name: 'Live Music / Band',    emoji: '🎸', category: 'Entertainment', desc: 'Live band, classical, Bollywood or folk',        priceHint: '₹15,000 – ₹1,50,000',  priceMin: 15000,  priceMax: 150000 },
  drum:           { id: 'drum',           name: 'Drum Sets / Dhol',     emoji: '🥁', category: 'Entertainment', desc: 'Traditional dhol, percussion groups',             priceHint: '₹3,000 – ₹20,000',    priceMin: 3000,   priceMax: 20000 },
  photography:    { id: 'photography',    name: 'Photography',          emoji: '📸', category: 'Photography',   desc: 'Candid, portrait & event coverage',              priceHint: '₹8,000 – ₹1,50,000',     priceMin: 8000,   priceMax: 150000 },
  videography:    { id: 'videography',    name: 'Videography',          emoji: '🎬', category: 'Video',         desc: 'Cinematic 4K video, reels & highlights',        priceHint: '₹10,000 – ₹2,00,000',    priceMin: 10000,  priceMax: 200000 },
  welcome_drinks: { id: 'welcome_drinks', name: 'Welcome Drinks',       emoji: '🥂', category: 'F&B',           desc: 'Mocktail bar, juices, sherbets & lemonade station', priceHint: '₹50 – ₹200/head',    priceMin: 50,     priceMax: 200 },
  emcee:          { id: 'emcee',          name: 'Emcee / Anchor',       emoji: '🎙️', category: 'Entertainment', desc: 'Bilingual anchor to host your event',            priceHint: '₹5,000 – ₹30,000',     priceMin: 5000,   priceMax: 30000 },
  bouncers:       { id: 'bouncers',       name: 'Security & Bouncers',  emoji: '🛡️', category: 'Security',      desc: 'Trained security & crowd management crew',      priceHint: '₹1,500 – ₹3,000/person', priceMin: 1500, priceMax: 3000 },
  entertainment:  { id: 'entertainment',  name: 'Performers & Cheer',   emoji: '💃', category: 'Entertainment', desc: 'Dancers, cheer squad, magicians & artists',      priceHint: '₹10,000 – ₹80,000',    priceMin: 10000,  priceMax: 80000 },
  return_gifts:   { id: 'return_gifts',   name: 'Return Gifts',         emoji: '🎁', category: 'Gifts',         desc: 'Branded, personalised & packaged return gifts',  priceHint: '₹50 – ₹500/unit',      priceMin: 50,     priceMax: 500 },
  transport:      { id: 'transport',      name: 'Guest Transport',      emoji: '🚌', category: 'Logistics',     desc: 'Bus / cab coordination for guests',              priceHint: '₹5,000 – ₹30,000',     priceMin: 5000,   priceMax: 30000 },
  tent:           { id: 'tent',           name: 'Tent / Pandal',        emoji: '⛺', category: 'Infrastructure', desc: 'Shamianas, tents, pandals for outdoor events',   priceHint: '₹8,000 – ₹1,00,000',   priceMin: 8000,   priceMax: 100000 },
  cleanup:        { id: 'cleanup',        name: 'Venue Cleanup',        emoji: '🧹', category: 'Cleanup',       desc: 'Full post-event cleaning & waste removal crew',  priceHint: '₹2,000 – ₹15,000',     priceMin: 2000,   priceMax: 15000 },
  mehendi:        { id: 'mehendi',        name: 'Mehendi Artist',       emoji: '🪷', category: 'Beauty',        desc: 'Bridal & decorative mehendi artists',            priceHint: '₹2,000 – ₹20,000',     priceMin: 2000,   priceMax: 20000 },
  makeup:         { id: 'makeup',         name: 'Makeup & Styling',     emoji: '💄', category: 'Beauty',        desc: 'Professional makeup artists & hair stylists',    priceHint: '₹3,000 – ₹75,000',     priceMin: 3000,   priceMax: 75000 },
  balloon_arch:   { id: 'balloon_arch',   name: 'Balloon Arch / Décor', emoji: '🎈', category: 'Decor',         desc: 'Custom balloon installations, arches, pillars',  priceHint: '₹2,000 – ₹20,000',     priceMin: 2000,   priceMax: 20000 },
  photobooth:     { id: 'photobooth',     name: 'Photo Booth',          emoji: '🤳', category: 'Photography',   desc: 'Selfie booth with props, instant prints',        priceHint: '₹4,000 – ₹15,000',     priceMin: 4000,   priceMax: 15000 },
  pooja:          { id: 'pooja',          name: 'Pooja / Pandit',       emoji: '🪔', category: 'Ritual',        desc: 'Vedic ceremonies, pandit booking & samagri',     priceHint: '₹2,500 – ₹15,000',     priceMin: 2500,   priceMax: 15000 },
  kids_play:      { id: 'kids_play',      name: 'Kids Play Zone',       emoji: '🎠', category: 'Entertainment', desc: 'Bouncy castle, games, face painting for kids',   priceHint: '₹5,000 – ₹25,000',     priceMin: 5000,   priceMax: 25000 },
  invitations:    { id: 'invitations',    name: 'Invitations & Printing', emoji: '💌', category: 'Stationery', desc: 'Digital & printed cards, menu cards, banners',   priceHint: '₹500 – ₹8,000',        priceMin: 500,    priceMax: 8000 },
  candle_setup:   { id: 'candle_setup',   name: 'Candle & Romantic Setup', emoji: '🕯️', category: 'Decor',     desc: 'Candle pathways, floating flowers, fairy lights', priceHint: '₹3,000 – ₹20,000',    priceMin: 3000,   priceMax: 20000 },
  ice_cream:      { id: 'ice_cream',      name: 'Ice Cream / Dessert Counter', emoji: '🍦', category: 'F&B',  desc: 'Live ice cream, dessert bar, candy cart',        priceHint: '₹3,000 – ₹15,000',     priceMin: 3000,   priceMax: 15000 },
  fireworks:      { id: 'fireworks',      name: 'Fireworks / Sky Lanterns', emoji: '🎆', category: 'Effects', desc: 'Sparklers, sky lanterns, cold pyro shows',       priceHint: '₹5,000 – ₹50,000',     priceMin: 5000,   priceMax: 50000 },
  priest:         { id: 'priest',         name: 'Priest / Purohit',     emoji: '🙏', category: 'Ritual',        desc: 'Experienced purohit for all Vedic rituals',      priceHint: '₹2,500 – ₹15,000',     priceMin: 2500,   priceMax: 15000 },
  mandap:         { id: 'mandap',         name: 'Mandap Decoration',    emoji: '⛩️', category: 'Decor',         desc: 'Traditional & themed mandap setups',             priceHint: '₹15,000 – ₹3,00,000',  priceMin: 15000,  priceMax: 300000 },
  bridal_wear:    { id: 'bridal_wear',    name: 'Bridal / Groom Styling', emoji: '👰', category: 'Beauty',      desc: 'Bridal makeup, draping, groom styling team',     priceHint: '₹8,000 – ₹80,000',     priceMin: 8000,   priceMax: 80000 },
  choreography:   { id: 'choreography',   name: 'Sangeet Choreography', emoji: '🕺', category: 'Entertainment', desc: 'Family dance choreography & rehearsals',        priceHint: '₹5,000 – ₹40,000',     priceMin: 5000,   priceMax: 40000 },
  gifting:        { id: 'gifting',        name: 'Gifting & Hampers',    emoji: '🎀', category: 'Gifts',         desc: 'Curated gift hampers for guests or honorees',    priceHint: '₹300 – ₹3,000/unit',   priceMin: 300,    priceMax: 3000 },
  memory_wall:    { id: 'memory_wall',    name: 'Memory Wall / Tribute', emoji: '🖼️', category: 'Decor',       desc: 'Photo wall, career/life tribute display',        priceHint: '₹3,000 – ₹20,000',     priceMin: 3000,   priceMax: 20000 },
  av_setup:       { id: 'av_setup',       name: 'AV & Presentation Setup', emoji: '🖥️', category: 'Corporate', desc: 'Projectors, screens, mics for talks & presentations', priceHint: '₹5,000 – ₹40,000', priceMin: 5000,   priceMax: 40000 },

  // ── The services that were missing ────────────────────────────────────
  // Everything above is what somebody would list if asked "what goes into a
  // celebration". Everything below is what actually decides whether one went
  // well, and none of it was bookable: the generator that keeps the lights on
  // through the muhurtham, the parking crew, the ambulance at a function with
  // eighty elderly guests, the nadaswaram a South Indian family names in the
  // first sentence, the stream for the son who could not fly back.
  //
  // Each carries priced packages in data/servicePacks.js, so they are bookable
  // end to end rather than being a row that opens a quote form.
  valet:          { id: 'valet',          name: 'Valet & Parking',      emoji: '🅿️', category: 'Logistics',     desc: 'Valet drivers, parking marshals, key counter',   priceHint: '₹1,800 – ₹25,000',     priceMin: 1800,   priceMax: 25000 },
  power:          { id: 'power',          name: 'Power Backup / Generator', emoji: '⚡', category: 'Infrastructure', desc: 'Silent DG sets, distribution, auto changeover', priceHint: '₹7,500 – ₹25,000',   priceMin: 7500,   priceMax: 25000 },
  cooling:        { id: 'cooling',        name: 'Cooling, Fans & Heaters', emoji: '🌬️', category: 'Infrastructure', desc: 'Coolers, misting fans, patio heaters, firepits', priceHint: '₹900 – ₹3,500/unit',  priceMin: 900,    priceMax: 3500 },
  washrooms:      { id: 'washrooms',      name: 'Portable Washrooms',   emoji: '🚻', category: 'Infrastructure', desc: 'Portable cabins & luxury restroom vans',        priceHint: '₹4,500 – ₹35,000',     priceMin: 4500,   priceMax: 35000 },
  medical:        { id: 'medical',        name: 'Medical & First Aid',  emoji: '🚑', category: 'Safety',        desc: 'First-aider, nurse, oxygen or ambulance standby', priceHint: '₹4,500 – ₹18,000',    priceMin: 4500,   priceMax: 18000 },
  hospitality:    { id: 'hospitality',    name: 'Ushers & Guest Hospitality', emoji: '🙋', category: 'Hospitality', desc: 'Welcome hostesses, guest relations, cloakroom', priceHint: '₹2,200 – ₹12,000',   priceMin: 2200,   priceMax: 12000 },
  livestream:     { id: 'livestream',     name: 'Live Streaming',       emoji: '📡', category: 'Video',         desc: 'Private stream for family who cannot travel',    priceHint: '₹12,000 – ₹32,000',    priceMin: 12000,  priceMax: 32000 },
  drone:          { id: 'drone',          name: 'Drone & Aerial Coverage', emoji: '🚁', category: 'Photography', desc: 'Licensed aerial and FPV cinematography',        priceHint: '₹9,000 – ₹24,000',     priceMin: 9000,   priceMax: 24000 },
  baraat:         { id: 'baraat',         name: 'Baraat & Procession',  emoji: '🎺', category: 'Entertainment', desc: 'Brass band, ghodi, light poles, route marshals', priceHint: '₹16,000 – ₹65,000',    priceMin: 16000,  priceMax: 65000 },
  wedding_car:    { id: 'wedding_car',    name: 'Wedding & Vintage Cars', emoji: '🚗', category: 'Logistics',   desc: 'Decorated sedan, luxury, vintage or ghodi',      priceHint: '₹8,500 – ₹35,000',     priceMin: 8500,   priceMax: 35000 },
  nadaswaram:     { id: 'nadaswaram',     name: 'Nadaswaram / Shehnai', emoji: '🪈', category: 'Entertainment', desc: 'Mangala vadyam for muhurtham & processions',     priceHint: '₹12,000 – ₹25,000',    priceMin: 12000,  priceMax: 25000 },
  bhajan:         { id: 'bhajan',         name: 'Bhajan & Devotional Music', emoji: '🎼', category: 'Ritual',   desc: 'Bhajan mandali, mata ki chowki, Carnatic sitting', priceHint: '₹9,000 – ₹32,000',   priceMin: 9000,   priceMax: 32000 },
  folk:           { id: 'folk',           name: 'Folk & Cultural Troupes', emoji: '🪗', category: 'Entertainment', desc: 'Dollu kunitha, bhangra, kalbeliya, magicians', priceHint: '₹7,500 – ₹26,000',     priceMin: 7500,   priceMax: 26000 },
  bar:            { id: 'bar',            name: 'Bar & Mocktail Counters', emoji: '🍹', category: 'F&B',        desc: 'Mocktail bar, bartenders, flair service',        priceHint: '₹220/head – ₹28,000',  priceMin: 220,    priceMax: 28000 },
  live_counters:  { id: 'live_counters',  name: 'Live Food Counters',   emoji: '🥘', category: 'Catering',      desc: 'Chaat, dosa, tandoor and global live counters',  priceHint: '₹120 – ₹220/head',     priceMin: 120,    priceMax: 220 },
  nanny:          { id: 'nanny',          name: 'Childcare & Nannies',  emoji: '👶', category: 'Hospitality',   desc: 'Trained childminders and a supervised crèche',   priceHint: '₹3,500 – ₹18,000',     priceMin: 3500,   priceMax: 18000 },
  signage:        { id: 'signage',        name: 'Signage & Seating Charts', emoji: '🪧', category: 'Stationery', desc: 'Welcome boards, wayfinding, seating charts',     priceHint: '₹6,500 – ₹9,500',      priceMin: 6500,   priceMax: 9500 },
}

export const EVENT_DATA = {
  birthday: {
    id: 'birthday',
    name: 'Birthday Party',
    emoji: '🎉',
    icon: '🎂',
    gradient: 'from-pink-500 via-rose-500 to-orange-400',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-800',
    accentColor: 'text-pink-600',
    badgeColor: 'bg-pink-100 text-pink-700',
    heroGradient: 'from-pink-600 via-rose-500 to-amber-500',
    tagline: 'Birthdays deserve to be legendary',
    description: 'From a small intimate gathering to a grand celebration — every birthday milestone deserves perfect planning.',
    services: [
      SVC.venue, SVC.balloon_arch, SVC.decor, SVC.stage, SVC.lighting,
      SVC.cake, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.welcome_drinks, SVC.ice_cream, SVC.dj, SVC.entertainment,
      SVC.emcee, SVC.photography, SVC.videography, SVC.photobooth,
      SVC.kids_play, SVC.bouncers, SVC.return_gifts, SVC.invitations,
      SVC.fireworks, SVC.cleanup,
      SVC.live_counters, SVC.bar, SVC.folk, SVC.nanny, SVC.power, SVC.signage,
    ],
  },

  baby_shower: {
    id: 'baby_shower',
    name: 'Baby Shower',
    emoji: '👶',
    icon: '🍼',
    gradient: 'from-sky-400 via-blue-400 to-indigo-400',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-800',
    accentColor: 'text-sky-600',
    badgeColor: 'bg-sky-100 text-sky-700',
    heroGradient: 'from-sky-500 via-blue-400 to-indigo-500',
    tagline: 'Welcome the little one in style',
    description: 'Celebrate the joy of new life with a beautiful, intimate baby shower gathering.',
    services: [
      SVC.venue, SVC.decor, SVC.balloon_arch, SVC.floral, SVC.lighting,
      SVC.cake, SVC.catering, SVC.menu, SVC.dining, SVC.welcome_drinks,
      SVC.photography, SVC.videography, SVC.photobooth,
      SVC.emcee, SVC.mehendi, SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.nanny, SVC.hospitality, SVC.live_counters, SVC.livestream, SVC.signage,
    ],
  },

  naming_ceremony: {
    id: 'naming_ceremony',
    name: 'Naming Ceremony',
    emoji: '✨',
    icon: '🪷',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-800',
    accentColor: 'text-violet-600',
    badgeColor: 'bg-violet-100 text-violet-700',
    heroGradient: 'from-violet-600 via-purple-500 to-fuchsia-400',
    tagline: 'A sacred beginning, perfectly honoured',
    description: 'Mark your baby\'s first celebration with tradition, joy and unforgettable memories.',
    services: [
      SVC.venue, SVC.floral, SVC.decor, SVC.lighting, SVC.tent,
      SVC.pooja, SVC.priest, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.cake, SVC.welcome_drinks, SVC.photography, SVC.videography,
      // Nadaswaram. It was missing from all three Vedic rites below, which is
      // why the scale cards could not offer the one piece of a namakarana,
      // upanayanam or seemantham that families ask about by name.
      SVC.live_music, SVC.nadaswaram, SVC.bhajan,
      SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.livestream, SVC.hospitality, SVC.power, SVC.signage,
    ],
  },

  anniversary: {
    id: 'anniversary',
    name: 'Anniversary',
    emoji: '💍',
    icon: '❤️',
    gradient: 'from-rose-500 via-red-500 to-pink-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-800',
    accentColor: 'text-rose-600',
    badgeColor: 'bg-rose-100 text-rose-700',
    heroGradient: 'from-rose-600 via-red-500 to-pink-500',
    tagline: 'Love stories deserve the grandest chapters',
    description: 'Celebrate years of togetherness with a magical evening — intimate dinner or grand party.',
    services: [
      SVC.venue, SVC.floral, SVC.candle_setup, SVC.decor, SVC.lighting,
      SVC.cake, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.welcome_drinks, SVC.live_music, SVC.dj, SVC.entertainment,
      SVC.emcee, SVC.photography, SVC.videography, SVC.photobooth,
      SVC.makeup, SVC.fireworks, SVC.transport, SVC.cleanup,
      SVC.bar, SVC.live_counters, SVC.wedding_car, SVC.valet, SVC.power, SVC.signage,
    ],
  },

  housewarming: {
    id: 'housewarming',
    name: 'Housewarming (Griha Pravesh)',
    emoji: '🏠',
    icon: '🗝️',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    accentColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    heroGradient: 'from-green-600 via-emerald-500 to-teal-400',
    tagline: 'Welcome home — begin with blessings',
    description: 'A Griha Pravesh filled with tradition, warmth and the people who matter most.',
    services: [
      SVC.floral, SVC.decor, SVC.lighting, SVC.tent,
      SVC.pooja, SVC.priest, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.cake, SVC.welcome_drinks, SVC.photography,
      SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.bhajan, SVC.nadaswaram, SVC.drum, SVC.power, SVC.signage, SVC.hospitality,
    ],
  },

  get_together: {
    id: 'get_together',
    name: 'Get-Together',
    emoji: '🥂',
    icon: '🤝',
    gradient: 'from-orange-400 via-amber-500 to-yellow-400',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    accentColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-700',
    heroGradient: 'from-orange-500 via-amber-500 to-yellow-400',
    tagline: 'Good people, great memories',
    description: 'Corporate meet, friends reunion or a casual house party — make it unforgettable.',
    services: [
      SVC.venue, SVC.decor, SVC.lighting, SVC.tent, SVC.dining,
      SVC.catering, SVC.cooks, SVC.menu, SVC.welcome_drinks,
      SVC.dj, SVC.live_music, SVC.emcee, SVC.entertainment,
      SVC.photography, SVC.videography, SVC.bouncers, SVC.cleanup,
      SVC.bar, SVC.live_counters, SVC.valet, SVC.power, SVC.cooling,
    ],
  },

  first_birthday: {
    id: 'first_birthday',
    name: 'First Birthday',
    emoji: '🎂',
    icon: '1️⃣',
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    accentColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
    heroGradient: 'from-blue-600 via-indigo-500 to-purple-500',
    tagline: 'The first one — make it extraordinary',
    description: 'One year of precious love. Celebrate this milestone with a magical first birthday party.',
    services: [
      SVC.venue, SVC.balloon_arch, SVC.decor, SVC.floral, SVC.stage, SVC.lighting,
      SVC.cake, SVC.catering, SVC.cooks, SVC.menu, SVC.dining, SVC.welcome_drinks, SVC.ice_cream,
      SVC.photography, SVC.videography, SVC.photobooth, SVC.kids_play,
      SVC.dj, SVC.entertainment, SVC.emcee, SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.nanny, SVC.live_counters, SVC.folk, SVC.signage, SVC.power,
    ],
  },

  wedding: {
    id: 'wedding',
    name: 'Wedding',
    emoji: '👑',
    icon: '💒',
    gradient: 'from-red-600 via-rose-600 to-amber-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    accentColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    heroGradient: 'from-red-700 via-rose-600 to-amber-500',
    tagline: 'Your once-in-a-lifetime celebration, beautifully handled',
    description: 'From mandap to mehendi to the last dance — every ritual and every guest, perfectly coordinated.',
    services: [
      SVC.venue, SVC.mandap, SVC.floral, SVC.decor, SVC.stage, SVC.lighting,
      SVC.pooja, SVC.priest, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.cake, SVC.welcome_drinks, SVC.live_music, SVC.dj, SVC.choreography,
      SVC.emcee, SVC.photography, SVC.videography, SVC.photobooth,
      SVC.mehendi, SVC.makeup, SVC.bridal_wear, SVC.bouncers,
      SVC.return_gifts, SVC.invitations, SVC.transport, SVC.fireworks, SVC.cleanup,
      SVC.valet, SVC.power, SVC.washrooms, SVC.medical, SVC.hospitality,
      SVC.livestream, SVC.drone, SVC.baraat, SVC.wedding_car, SVC.nadaswaram, SVC.drum,
      SVC.folk, SVC.bar, SVC.live_counters, SVC.nanny, SVC.signage, SVC.cooling,
    ],
  },

  engagement: {
    id: 'engagement',
    name: 'Engagement',
    emoji: '💫',
    icon: '💍',
    gradient: 'from-fuchsia-500 via-pink-500 to-purple-500',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200',
    textColor: 'text-fuchsia-800',
    accentColor: 'text-fuchsia-600',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-700',
    heroGradient: 'from-fuchsia-600 via-pink-500 to-purple-500',
    tagline: 'The beginning of forever',
    description: 'A beautiful ring ceremony to mark the start of your journey together.',
    services: [
      SVC.venue, SVC.floral, SVC.decor, SVC.stage, SVC.lighting,
      SVC.catering, SVC.menu, SVC.dining, SVC.cake, SVC.welcome_drinks,
      SVC.live_music, SVC.dj, SVC.emcee, SVC.photography, SVC.videography,
      SVC.makeup, SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.bar, SVC.live_counters, SVC.drone, SVC.livestream, SVC.valet,
      SVC.signage, SVC.hospitality,
    ],
  },

  sangeet: {
    id: 'sangeet',
    name: 'Sangeet / Mehendi Night',
    emoji: '🎶',
    icon: '💃',
    gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    accentColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-700',
    heroGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
    tagline: 'Music, dance and mehendi — the fun before the vows',
    description: 'Choreographed performances, live music and mehendi artists for the night everyone remembers dancing at.',
    services: [
      SVC.venue, SVC.decor, SVC.stage, SVC.lighting, SVC.dining,
      SVC.catering, SVC.menu, SVC.welcome_drinks, SVC.dj, SVC.live_music,
      SVC.choreography, SVC.emcee, SVC.entertainment, SVC.mehendi, SVC.makeup,
      SVC.photography, SVC.videography, SVC.fireworks, SVC.cleanup,
      SVC.bar, SVC.live_counters, SVC.folk, SVC.drum, SVC.drone, SVC.valet,
      SVC.power, SVC.cooling, SVC.signage,
    ],
  },

  thread_ceremony: {
    id: 'thread_ceremony',
    name: 'Upanayanam (Thread Ceremony)',
    emoji: '🕉️',
    icon: '📿',
    gradient: 'from-amber-500 via-orange-500 to-yellow-400',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    accentColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
    heroGradient: 'from-amber-600 via-orange-500 to-yellow-400',
    tagline: 'A sacred rite of passage, honoured with tradition',
    description: 'The Upanayanam marks an important Vedic milestone — every ritual detail arranged with care.',
    services: [
      SVC.venue, SVC.floral, SVC.decor, SVC.tent,
      SVC.pooja, SVC.priest, SVC.catering, SVC.cooks, SVC.menu, SVC.dining,
      SVC.photography, SVC.videography, SVC.live_music, SVC.nadaswaram, SVC.bhajan,
      SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.livestream, SVC.hospitality, SVC.power, SVC.signage,
    ],
  },

  seemantham: {
    id: 'seemantham',
    name: 'Seemantham / Godh Bharai',
    emoji: '🤰',
    icon: '🌺',
    gradient: 'from-teal-500 via-cyan-500 to-emerald-400',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-800',
    accentColor: 'text-teal-600',
    badgeColor: 'bg-teal-100 text-teal-700',
    heroGradient: 'from-teal-600 via-cyan-500 to-emerald-400',
    tagline: 'Blessings for the mother-to-be',
    description: 'A traditional godh bharai / seemantham ceremony, rich in ritual and family warmth.',
    services: [
      SVC.venue, SVC.floral, SVC.decor, SVC.balloon_arch,
      SVC.pooja, SVC.priest, SVC.catering, SVC.menu, SVC.dining,
      SVC.cake, SVC.welcome_drinks, SVC.photography, SVC.videography,
      SVC.live_music, SVC.nadaswaram, SVC.bhajan,
      SVC.mehendi, SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.livestream, SVC.hospitality, SVC.signage,
    ],
  },

  retirement: {
    id: 'retirement',
    name: 'Retirement Party',
    emoji: '🎓',
    icon: '🥳',
    gradient: 'from-slate-500 via-blue-500 to-indigo-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    accentColor: 'text-slate-600',
    badgeColor: 'bg-slate-100 text-slate-700',
    heroGradient: 'from-slate-600 via-blue-500 to-indigo-500',
    tagline: 'Celebrating a lifetime of hard work',
    description: 'A heartfelt send-off honouring years of dedication, with the people who mattered most along the way.',
    services: [
      // av_setup is not optional dressing on a send-off: the tribute film and
      // the citation are the middle twenty minutes of the event, and both need
      // a screen and a working mic. It was missing here, so the scale cards
      // could not honestly promise either — see occasionTierContent.js.
      SVC.venue, SVC.decor, SVC.lighting, SVC.stage, SVC.av_setup,
      SVC.catering, SVC.menu, SVC.dining, SVC.cake, SVC.welcome_drinks,
      SVC.live_music, SVC.emcee, SVC.photography, SVC.videography,
      SVC.memory_wall, SVC.gifting, SVC.invitations, SVC.cleanup,
      SVC.livestream, SVC.hospitality, SVC.valet, SVC.signage, SVC.bar,
    ],
  },

  graduation: {
    id: 'graduation',
    name: 'Graduation Party',
    emoji: '🎓',
    icon: '📜',
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800',
    accentColor: 'text-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    heroGradient: 'from-indigo-600 via-blue-500 to-cyan-400',
    tagline: 'A milestone worth celebrating',
    description: 'Cap, gown and a party to match the achievement — celebrate the next chapter in style.',
    services: [
      SVC.venue, SVC.decor, SVC.balloon_arch, SVC.lighting,
      SVC.catering, SVC.menu, SVC.dining, SVC.cake, SVC.welcome_drinks,
      SVC.dj, SVC.emcee, SVC.photography, SVC.videography, SVC.photobooth,
      SVC.memory_wall, SVC.return_gifts, SVC.invitations, SVC.cleanup,
      SVC.bar, SVC.live_counters, SVC.folk, SVC.signage, SVC.livestream,
    ],
  },

  corporate_event: {
    id: 'corporate_event',
    name: 'Corporate Event',
    emoji: '🏢',
    icon: '💼',
    gradient: 'from-gray-500 via-slate-500 to-zinc-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    accentColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700',
    heroGradient: 'from-gray-700 via-slate-600 to-zinc-500',
    tagline: 'Professional events, beautifully executed',
    description: 'Product launches, team offsites, annual dinners — handled with the polish your brand deserves.',
    services: [
      SVC.venue, SVC.decor, SVC.lighting, SVC.stage, SVC.av_setup,
      SVC.catering, SVC.menu, SVC.dining, SVC.welcome_drinks,
      SVC.dj, SVC.live_music, SVC.emcee, SVC.entertainment,
      SVC.photography, SVC.videography, SVC.bouncers, SVC.transport,
      SVC.gifting, SVC.invitations, SVC.cleanup,
      SVC.valet, SVC.power, SVC.medical, SVC.hospitality, SVC.livestream,
      SVC.drone, SVC.bar, SVC.live_counters, SVC.signage, SVC.washrooms, SVC.cooling,
    ],
  },
}

export const EVENT_LIST = Object.values(EVENT_DATA)
