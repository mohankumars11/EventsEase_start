/**
 * Party Essentials, expanded.
 *
 * The existing 60 items are objects: balloons, banners, plates. What was
 * missing is the thing an event company is actually for — a decorated room.
 * Nobody wants 100 loose balloons; they want the wall behind the cake to look
 * like the picture, and they want someone else to have hung it.
 *
 * So most of what follows is a *setup*, priced as one: an arch, a backdrop, a
 * themed room. The customiser then asks the only two questions that decide
 * whether the evening works — who installs it, and what colour — plus the
 * venue, so the team brings the right fixings (see config/customizers/party).
 *
 * Occasion tags match src/data/shopOccasions.js exactly. Three of them —
 * Balloon Decor, Backdrop & Banners, Tableware — are formats rather than
 * occasions, which is deliberate and predates this file: once the occasion is
 * settled, decor genuinely gets shopped as "I have the cake, I need the wall."
 * The taxonomy renders those as a separate "shop by what you need" row.
 *
 * Prices are for the item plus materials, benchmarked against what decor
 * shops in Bangalore and Chennai charge for the equivalent setup. Installation
 * is priced separately in the customiser rather than baked in, because a DIY
 * kit and a staffed setup are genuinely different products.
 */

export const META = {
  category: 'Party Essentials',
  readCategories: ['Party Essentials'],
  categoryTerm: 'party decoration celebration photography',
  out: 'supabase/migrations/032_party_essentials_catalog.sql',
  title: 'Migration 032: Party Essentials — setups, not just supplies.',
  rationale: `The category held 60 objects — balloons, banners, plates — and nothing
that amounts to a decorated room. That is the gap between selling party
supplies and running a celebrations business: a customer does not want
100 loose balloons, they want the wall behind the cake to look like the
photo, and they want somebody else to have hung it.

Most rows below are therefore a setup rather than an item, and the
customiser (src/config/customizers/party.js) asks who installs it, what
colour theme to match, and what kind of venue it is going into.`,
}

export const CATALOG = [

  /* ══ Birthday ═══════════════════════════════════════════════════════ */
  { name: 'Birthday Balloon Arch — Full Setup', occasion: 'Birthday', price: 2499, emoji: '🎈',
    description: 'Organic balloon arch over the cake table, in your colours',
    query: 'organic balloon arch birthday party decoration' },
  { name: 'Birthday Room Decoration — Complete', occasion: 'Birthday', price: 3999, emoji: '🎊',
    description: 'Walls, ceiling and entrance, styled end to end',
    query: 'decorated birthday party room balloons streamers' },
  { name: 'Kids Birthday Theme Setup', occasion: 'Birthday', price: 4499, emoji: '🦄',
    description: 'Character backdrop, props and matching table styling',
    query: 'kids birthday party theme decoration colourful' },
  { name: 'Surprise Birthday Room Fill', occasion: 'Birthday', price: 1999, emoji: '🎉',
    description: 'Floor filled with balloons, ready for the door to open',
    query: 'room filled with balloons surprise celebration' },
  { name: 'Birthday Photo Wall — 8ft', occasion: 'Birthday', price: 2999, emoji: '📸',
    description: 'Instagram wall with name lettering and lights',
    query: 'birthday photo backdrop wall lights party' },
  { name: 'Midnight Birthday Surprise Kit', occasion: 'Birthday', price: 1299, emoji: '🌙',
    description: 'Candles, sparklers, balloons and a banner, delivered at 12am',
    query: 'midnight birthday celebration candles sparklers' },
  { name: 'Car Boot Birthday Surprise Setup', occasion: 'Birthday', price: 2299, emoji: '🚗',
    description: 'Balloons and lights arranged in the boot for the reveal',
    query: 'car decorated balloons surprise gift celebration' },

  /* ══ Baby Shower ════════════════════════════════════════════════════ */
  { name: 'Baby Shower Pastel Arch', occasion: 'Baby Shower', price: 2799, emoji: '🍼',
    description: 'Soft pastel balloon arch with greenery',
    query: 'baby shower pastel balloon arch greenery' },
  { name: 'Godh Bharai Traditional Setup', occasion: 'Baby Shower', price: 3499, emoji: '🪔',
    description: 'Marigold, drapes and a seat for the mother-to-be',
    query: 'indian baby shower marigold decoration traditional' },
  { name: 'Gender Reveal Balloon Box', occasion: 'Baby Shower', price: 1799, emoji: '🎀',
    description: 'Black box, coloured balloons, one lid to lift',
    query: 'gender reveal balloon box pink blue' },
  { name: 'Baby Shower Photo Corner', occasion: 'Baby Shower', price: 2499, emoji: '📷',
    description: 'Backdrop, props and a "mum to be" sash',
    query: 'baby shower photo backdrop props pastel' },

  /* ══ Anniversary ════════════════════════════════════════════════════ */
  { name: 'Romantic Candlelight Room Setup', occasion: 'Anniversary', price: 3299, emoji: '🕯️',
    description: 'Candles, rose petals and fairy lights, arranged by our team',
    query: 'romantic candlelight room rose petals decoration' },
  { name: 'Anniversary Heart Balloon Wall', occasion: 'Anniversary', price: 2599, emoji: '❤️',
    description: 'Heart-shaped balloon wall with photo pegs',
    query: 'heart balloon wall romantic anniversary decoration' },
  { name: 'Terrace Dinner Setup for Two', occasion: 'Anniversary', price: 4999, emoji: '🍽️',
    description: 'Table, drapes, lights and flowers under the sky',
    query: 'rooftop romantic dinner table setup lights' },
  { name: 'Anniversary Photo Timeline Wall', occasion: 'Anniversary', price: 2199, emoji: '🖼️',
    description: 'Every year of the two of you, pegged along a lit string',
    query: 'photo string lights memory wall decoration' },

  /* ══ Wedding & Engagement ═══════════════════════════════════════════ */
  { name: 'Engagement Stage Decoration', occasion: 'Wedding & Engagement', price: 8999, emoji: '💍',
    description: 'Backdrop, seating and floral styling for the ring exchange',
    query: 'indian engagement stage decoration flowers backdrop' },
  { name: 'Haldi Ceremony Decor Setup', occasion: 'Wedding & Engagement', price: 5999, emoji: '🌼',
    description: 'Marigold curtains, low seating and umbrellas',
    query: 'haldi ceremony marigold decoration umbrella yellow' },
  { name: 'Mehendi Night Decor Setup', occasion: 'Wedding & Engagement', price: 6499, emoji: '🌿',
    description: 'Mirrors, cushions, drapes and lanterns',
    query: 'mehendi decoration cushions lanterns colourful indian' },
  { name: 'Wedding Entrance Floral Arch', occasion: 'Wedding & Engagement', price: 7499, emoji: '💐',
    description: 'Fresh flower arch for the entrance or mandap',
    query: 'wedding entrance floral arch fresh flowers' },
  { name: 'Sangeet Stage & Lighting', occasion: 'Wedding & Engagement', price: 9999, emoji: '🥁',
    description: 'Stage backdrop with uplighting for the performances',
    query: 'sangeet stage lighting indian wedding celebration' },
  { name: 'Car Decoration for the Couple', occasion: 'Wedding & Engagement', price: 3499, emoji: '🚘',
    description: 'Fresh flowers and ribbon on the send-off car',
    query: 'wedding car decorated flowers ribbon' },

  /* ══ Housewarming ═══════════════════════════════════════════════════ */
  { name: 'Griha Pravesh Entrance Setup', occasion: 'Housewarming', price: 2999, emoji: '🏠',
    description: 'Mango-leaf toran, rangoli and marigold at the door',
    query: 'indian house entrance decoration marigold toran rangoli' },
  { name: 'Housewarming Balloon & Banner Kit', occasion: 'Housewarming', price: 1499, emoji: '🔑',
    description: '"Welcome Home" banner with matching balloons',
    query: 'welcome home decoration balloons banner' },
  { name: 'Rangoli Design — Done for You', occasion: 'Housewarming', price: 1999, emoji: '🎨',
    description: 'Hand-drawn rangoli at your doorstep, fresh colours',
    query: 'colourful rangoli design indian doorstep' },

  /* ══ Farewell ═══════════════════════════════════════════════════════ */
  { name: 'Farewell Office Decor Kit', occasion: 'Farewell', price: 1799, emoji: '👋',
    description: 'Banner, balloons and a signing board for the team',
    query: 'office farewell party decoration banner balloons' },
  { name: 'Retirement Celebration Setup', occasion: 'Farewell', price: 2999, emoji: '🎣',
    description: 'Photo timeline, balloons and a gold "thank you" wall',
    query: 'retirement party decoration gold celebration' },

  /* ══ Theme Party ════════════════════════════════════════════════════ */
  { name: 'Neon Glow Party Setup', occasion: 'Theme Party', price: 4499, emoji: '💡',
    description: 'UV lights, neon props and glow tableware',
    query: 'neon glow party lights decoration' },
  { name: 'Bollywood Retro Theme Setup', occasion: 'Theme Party', price: 4999, emoji: '🎬',
    description: 'Vintage posters, drapes and marquee lettering',
    query: 'bollywood retro party decoration vintage colourful' },
  { name: 'Garden Picnic Theme Setup', occasion: 'Theme Party', price: 3999, emoji: '🧺',
    description: 'Low tables, cushions, rugs and lanterns',
    query: 'garden picnic party low table cushions lanterns' },
  { name: 'Boho Tent Party Setup', occasion: 'Theme Party', price: 5499, emoji: '⛺',
    description: 'Teepee tents, fairy lights and floor cushions',
    query: 'boho teepee tent party sleepover decoration' },
  { name: 'Cocktail Evening Bar Styling', occasion: 'Theme Party', price: 3799, emoji: '🍸',
    description: 'Bar backdrop, glassware styling and signage',
    query: 'home cocktail bar party styling glassware' },
  { name: 'Cricket Watch Party Setup', occasion: 'Theme Party', price: 2799, emoji: '🏏',
    description: 'Team colours, jerseys and a scoreboard wall',
    query: 'sports watch party decoration jersey colours' },

  /* ══ Balloon Decor ══════════════════════════════════════════════════ */
  { name: 'Helium Balloon Bouquet (15 pcs)', occasion: 'Balloon Decor', price: 1299, emoji: '🎈',
    description: 'Floating bouquet, weighted and delivered ready',
    query: 'helium balloon bouquet floating colourful' },
  { name: 'Giant Number Foil Balloons (Pair)', occasion: 'Balloon Decor', price: 899, emoji: '🔢',
    description: '40-inch numbers, any age, helium optional',
    query: 'giant number foil balloon gold party' },
  { name: 'Chrome Balloon Cluster Set', occasion: 'Balloon Decor', price: 1499, emoji: '✨',
    description: 'Metallic chrome balloons in a styled cluster',
    query: 'chrome metallic balloons cluster party' },
  { name: 'Balloon Ceiling Cluster with Ribbons', occasion: 'Balloon Decor', price: 1899, emoji: '🎀',
    description: 'Ceiling filled with balloons and trailing ribbon',
    query: 'balloons on ceiling ribbons party decoration' },
  { name: 'Confetti Balloon Set (20 pcs)', occasion: 'Balloon Decor', price: 799, emoji: '🎊',
    description: 'Clear balloons with confetti inside',
    query: 'confetti filled clear balloons party' },
  { name: 'Balloon Column Pair (6ft)', occasion: 'Balloon Decor', price: 2199, emoji: '🏛️',
    description: 'Two towers to frame an entrance or stage',
    query: 'balloon column tower entrance party decoration' },

  /* ══ Backdrop & Banners ═════════════════════════════════════════════ */
  { name: 'Custom Name Backdrop — 6ft', occasion: 'Backdrop & Banners', price: 2299, emoji: '🔤',
    description: 'Printed backdrop with your name, date and theme',
    query: 'custom printed party backdrop name banner' },
  { name: 'Shimmer Wall Backdrop', occasion: 'Backdrop & Banners', price: 2799, emoji: '💫',
    description: 'Sequin shimmer panel, gold, silver or rose gold',
    query: 'sequin shimmer wall backdrop party photo' },
  { name: 'Flower Wall Backdrop — 8ft', occasion: 'Backdrop & Banners', price: 5999, emoji: '🌸',
    description: 'Artificial flower wall, reusable, installed by us',
    query: 'artificial flower wall backdrop wedding event' },
  { name: 'Marquee Light-Up Letters (Rental)', occasion: 'Backdrop & Banners', price: 2499, emoji: '🅰️',
    description: 'Up to four 3ft letters or numbers, collected next day',
    query: 'marquee light up letters party rental' },
  { name: 'Fairy Light Curtain Backdrop', occasion: 'Backdrop & Banners', price: 1799, emoji: '🌟',
    description: 'Warm LED curtain with sheer drapes',
    query: 'fairy light curtain backdrop drapes warm' },
  { name: 'Personalised Welcome Board', occasion: 'Backdrop & Banners', price: 999, emoji: '🪧',
    description: 'Easel board printed with your message',
    query: 'welcome sign board easel event personalised' },

  /* ══ Tableware ══════════════════════════════════════════════════════ */
  { name: 'Themed Tableware Set (12 guests)', occasion: 'Tableware', price: 1199, emoji: '🍽️',
    description: 'Plates, cups, napkins and cutlery, matched to your theme',
    query: 'party tableware plates cups napkins themed' },
  { name: 'Cake Table Styling Kit', occasion: 'Tableware', price: 1499, emoji: '🎂',
    description: 'Runner, stands, drapes and props for the cake table',
    query: 'styled cake table dessert party decoration' },
  { name: 'Dessert Table Stand Set (5 pcs)', occasion: 'Tableware', price: 1699, emoji: '🧁',
    description: 'Tiered stands in graduated heights',
    query: 'dessert table tiered stands party display' },
  { name: 'Eco Tableware Set (12 guests)', occasion: 'Tableware', price: 1399, emoji: '🌿',
    description: 'Areca leaf plates and bamboo cutlery — fully compostable',
    query: 'eco friendly leaf plates bamboo cutlery' },
  { name: 'Return Gift Bags (Set of 12)', occasion: 'Tableware', price: 899, emoji: '🎁',
    description: 'Themed bags, filled to your budget',
    query: 'party return gift bags children colourful' },
]
