// What you actually book, for every service that is not food and not décor.
//
// ── The gap this closes ─────────────────────────────────────────────────
// serviceOptions.js lists what is *inside* a service — a photographer's
// deliverables, a DJ's rig — deliberately without prices, because it was built
// to be read rather than bought. servicePricing.js has one base rate per
// service, which is what the quote engine needs but not what a customer picks
// from: "Photography — ₹35,000" answers nothing about whether that is one
// shooter for four hours or two for the whole day.
//
// A customer books a *package*. Three or four named options per service, each
// with a price, a duration and a list of what is delivered, is the shape every
// real vendor in this business quotes in, and it is the only shape that lets
// somebody complete a booking without a phone call. That is what this file is.
//
// ── The units ───────────────────────────────────────────────────────────
//   event  one price for the job
//   guest  per head — moves with the guest count on screen
//   unit   a countable thing (artist, guard, hour, vehicle) with a sensible
//          default quantity the customer can change
//
// The unit lives in its own field rather than inside the price string, for the
// same reason it does in servicePricing.js: "₹1,500/person" cannot be added up
// by anything.
//
// ── Where the numbers come from ─────────────────────────────────────────
// Researched Indian market rates (Bengaluru / Mysore, cross-checked against
// metro averages), sitting inside the priceMin–priceMax band each service
// already publishes in eventServicesData.js. Pre-launch, no signed vendor
// behind any of them. Every surface that renders one labels it an estimate.
// Re-check against real rate cards before anybody is held to one.

const round10 = n => Math.round(n / 10) * 10

/**
 * One service's shelf: an intro line and the packages under it.
 *
 * `note` on a pack is the honest small print — what is not included, what
 * needs the venue's permission, what changes the price. Putting it on the card
 * rather than in a terms page is the difference between a booking that sticks
 * and one that gets renegotiated on the day.
 */
export const SERVICE_PACKS = {
  /* ═══════════ Venue ═══════════ */
  venue: {
    blurb: 'We hold the date, negotiate the rate, read the fine print, and hand you three that actually fit.',
    unitHint: 'Hall hire only — catering, decor and staff are booked separately.',
    packs: [
      {
        id: 'venue_home',
        name: 'Your own home or clubhouse',
        emoji: '🏠',
        blurb: 'No hire charge. We survey the space, plan the layout and work around your furniture.',
        price: 2500, unit: 'event',
        tint: ['#16a34a', '#bbf7d0'],
        includes: ['Site visit and layout plan', 'Power and access check', 'Neighbour and society coordination', 'Furniture moving and reset'],
        note: 'Society permission is yours to obtain — we will draft the request.',
      },
      {
        id: 'venue_community',
        name: 'Community hall / kalyana mantapa',
        emoji: '🏛️',
        blurb: 'The best value in the city, and usually the only kind that lets you bring your own caterer.',
        price: 35000, unit: 'event',
        tint: ['#b45309', '#fde68a'],
        popular: true,
        includes: ['Three shortlisted halls on your date', 'Rate negotiated on your behalf', 'Outside-catering permission confirmed', 'Booking, advance and paperwork handled'],
        note: 'Hall rate varies by locality and date; the figure shown is a typical mid-range day rate.',
      },
      {
        id: 'venue_banquet',
        name: 'Air-conditioned banquet hall',
        emoji: '❄️',
        blurb: 'The default for 100–400 guests. Usually per-plate rather than per-hall, and we check which.',
        price: 85000, unit: 'event',
        tint: ['#1d4ed8', '#bfdbfe'],
        includes: ['Shortlist with real seated capacity, not brochure numbers', 'Per-plate vs hire-charge comparison', 'Parking, lift and generator verified', 'Cancellation terms read and explained'],
      },
      {
        id: 'venue_lawn',
        name: 'Garden, lawn or rooftop',
        emoji: '🌿',
        blurb: 'Evenings and winter dates. We add a weather backup to every one of these on principle.',
        price: 70000, unit: 'event',
        tint: ['#15803d', '#fef9c3'],
        includes: ['Open-air venues available on your date', 'Sound curfew and noise limits confirmed', 'Weather backup plan included', 'Power, water and washroom access checked'],
      },
      {
        id: 'venue_resort',
        name: 'Resort, farmhouse or hotel',
        emoji: '🏨',
        blurb: 'For day-long functions and out-of-town family who need rooms as much as a hall.',
        price: 1_75_000, unit: 'event',
        tint: ['#7c3aed', '#ddd6fe'],
        includes: ['Venue plus guest rooms at the property rate', 'Multi-function day plan across spaces', 'Previous-evening setup access', 'Food and beverage minimum negotiated'],
      },
    ],
  },

  /* ═══════════ Cake ═══════════ */
  cake: {
    blurb: 'Baked to order and delivered chilled on the day — or picked straight off the cake shelf if you need it tomorrow.',
    unitHint: 'Priced by weight and finish. One kilo feeds roughly 8–10 people.',
    packs: [
      {
        id: 'cake_cream_1kg',
        name: 'Fresh cream cake, 1 kg',
        emoji: '🎂',
        blurb: 'Vanilla, chocolate, butterscotch, red velvet or pineapple, piped and written on.',
        price: 900, unit: 'unit', unitLabel: 'kg', defaultQty: 1,
        tint: ['#f472b6', '#fce7f3'],
        popular: true,
        includes: ['Your flavour and message', 'Egg or eggless, same price', 'Candles, knife and plates', 'Chilled delivery within a two-hour window'],
      },
      {
        id: 'cake_photo',
        name: 'Photo-print / edible-image cake',
        emoji: '🖼️',
        blurb: 'Your photograph printed in edible icing on the top — send it on WhatsApp the day before.',
        price: 1400, unit: 'unit', unitLabel: 'kg', defaultQty: 1,
        tint: ['#0ea5e9', '#e0f2fe'],
        includes: ['Edible photo print', 'Border and message piping', 'Egg or eggless', 'Chilled delivery'],
        note: 'Needs a clear image at least 24 hours ahead.',
      },
      {
        id: 'cake_fondant',
        name: 'Themed fondant / sculpted cake',
        emoji: '🦄',
        blurb: 'Characters, hobbies, a cricket pitch, a scooter — modelled by hand in fondant.',
        price: 2400, unit: 'unit', unitLabel: 'kg', defaultQty: 2,
        tint: ['#a855f7', '#f3e8ff'],
        includes: ['Custom sculpting to your reference photo', 'Design sketch approved before baking', 'Board, topper and message', 'Chilled delivery, handled upright'],
        note: 'Minimum 2 kg, and 72 hours notice for detailed sculpting.',
      },
      {
        id: 'cake_tiered',
        name: 'Two or three-tier celebration cake',
        emoji: '💒',
        blurb: 'The cutting cake for a reception or a milestone — tiered, dowelled and finished to be photographed.',
        price: 5500, unit: 'unit', unitLabel: 'cake', defaultQty: 1,
        tint: ['#be123c', '#ffe4e6'],
        includes: ['Two or three tiers, 3–5 kg total', 'Fresh cream, ganache or fondant finish', 'Stand, topper and cutting set', 'On-site assembly at the venue'],
      },
      {
        id: 'cake_dessert_table',
        name: 'Cupcake tower & dessert table',
        emoji: '🧁',
        blurb: 'Cupcakes, jars, brownies and a small centre cake, arranged as the corner everyone photographs.',
        price: 6500, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        includes: ['48 cupcakes and assorted desserts', 'Small centre cake for the cutting', 'Tiered stands and table styling', 'Setup at the venue'],
      },
    ],
  },

  /* ═══════════ Dining & furniture ═══════════ */
  dining: {
    blurb: 'Seating, linen and tableware — sized to your list, set before anyone arrives, cleared after.',
    unitHint: 'Per seat, so it moves with your guest count.',
    packs: [
      {
        id: 'dining_leaf',
        name: 'Banana-leaf pankti seating',
        emoji: '🍌',
        blurb: 'Served in batches on the floor or at long rows, the way a proper leaf meal is eaten.',
        price: 55, unit: 'guest',
        tint: ['#15803d', '#dcfce7'],
        includes: ['Banana leaves and steel tumblers', 'Long mats or benches', 'Serving staff at the correct ratio', 'Clearing between batches'],
      },
      {
        id: 'dining_round',
        name: 'Round tables of ten, seated',
        emoji: '🪑',
        blurb: 'The standard reception layout — linen, chair covers, crockery and cutlery on every seat.',
        price: 140, unit: 'guest',
        tint: ['#7c3aed', '#ede9fe'],
        popular: true,
        includes: ['Round tables with linen and runners', 'Banquet chairs with covers and sashes', 'Melamine or china crockery and cutlery', 'Water bottles or copper jugs per table', 'Setup, service staff and clearing'],
      },
      {
        id: 'dining_buffet_standing',
        name: 'Buffet with high tables',
        emoji: '🥂',
        blurb: 'Cocktail format — standing rounds, a few seated pockets for elders, and a clear queue line.',
        price: 95, unit: 'guest',
        tint: ['#0891b2', '#cffafe'],
        includes: ['High tables with covers', 'Buffet counters with skirting and chafing dishes', 'Seated pocket for elders', 'Crockery, cutlery and clearing staff'],
      },
      {
        id: 'dining_floor',
        name: 'Floor seating with low tables',
        emoji: '🧎',
        blurb: 'Poojas, seemantham and traditional ceremonies — mats, bolsters and low serving tables.',
        price: 70, unit: 'guest',
        tint: ['#b45309', '#fef3c7'],
        includes: ['Mats, gaddas and bolsters', 'Low serving tables', 'Back-support chairs for elders', 'Setup and clearing'],
      },
      {
        id: 'dining_lounge',
        name: 'Lounge sofas & premium furniture',
        emoji: '🛋️',
        blurb: 'Sofa clusters, ottomans and low tables for the people who are not dancing.',
        price: 260, unit: 'guest',
        tint: ['#1f2937', '#f5f5f4'],
        includes: ['Sofa and ottoman clusters', 'Coffee tables with candle styling', 'Bar stools and cocktail tables', 'Carpet or decking underfoot'],
        note: 'Priced on the number of lounge seats, not total guests — most events lounge about a third.',
      },
    ],
  },

  /* ═══════════ Photography ═══════════ */
  photography: {
    blurb: 'The part you still have in twenty years. Every package below states shooter count, hours and what you get back.',
    unitHint: 'Edited photographs delivered in 15–21 days, plus a same-week preview set.',
    packs: [
      {
        id: 'photo_half_day',
        name: 'Half day — one photographer',
        emoji: '📷',
        blurb: 'Four hours, one shooter. Right for a home function, a naming ceremony or a birthday.',
        price: 12000, unit: 'event',
        tint: ['#475569', '#e2e8f0'],
        includes: ['One photographer, 4 hours', '150+ edited photographs', 'Online gallery for sharing', '20 preview images within 48 hours'],
      },
      {
        id: 'photo_full_day',
        name: 'Full day — candid + traditional',
        emoji: '📸',
        blurb: 'Two shooters for ten hours: one on candids, one on the traditional coverage families expect.',
        price: 35000, unit: 'event',
        tint: ['#1e3a8a', '#dbeafe'],
        popular: true,
        includes: ['Two photographers, 10 hours', '400+ edited photographs', 'Candid and traditional coverage', 'Online gallery plus a pen drive', '30-page printed album'],
      },
      {
        id: 'photo_wedding_full',
        name: 'Wedding — multi-day coverage',
        emoji: '💍',
        blurb: 'Haldi, mehendi, muhurtham and reception. A lead, a second shooter and an assistant across the days.',
        price: 1_25_000, unit: 'event',
        tint: ['#be123c', '#ffe4e6'],
        includes: ['Up to 3 function days, 3-person crew', '1,200+ edited photographs', 'Pre-wedding shoot (half day)', 'Premium 60-page album plus two parent copies', 'Full RAW archive on a drive'],
      },
      {
        id: 'photo_prewedding',
        name: 'Pre-wedding / maternity shoot',
        emoji: '🌅',
        blurb: 'One location, two outfit changes, and the images you actually use on the invitation.',
        price: 22000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        includes: ['4-hour shoot at one location', 'Two outfit changes', '60 retouched images', 'Location scouting and permits', 'Invitation-ready crops'],
      },
    ],
  },

  /* ═══════════ Videography ═══════════ */
  videography: {
    blurb: 'A film, not footage. Every package states crew size, delivery format and how long the edit takes.',
    unitHint: 'Films delivered in 3–5 weeks; the teaser lands inside a week.',
    packs: [
      {
        id: 'video_event',
        name: 'Event film — single camera',
        emoji: '🎥',
        blurb: 'Full-function coverage plus a 3–4 minute highlight, on one camera.',
        price: 18000, unit: 'event',
        tint: ['#334155', '#e2e8f0'],
        includes: ['One videographer, 6 hours', 'Full-length edited coverage', '3–4 minute highlight film', 'Delivered in 4K, online and on a drive'],
      },
      {
        id: 'video_cinematic',
        name: 'Cinematic film — two cameras',
        emoji: '🎬',
        blurb: 'Two operators, gimbal work, on-camera audio for the speeches, and a properly graded edit.',
        price: 45000, unit: 'event',
        tint: ['#0f172a', '#c7d2fe'],
        popular: true,
        includes: ['Two videographers, 10 hours', 'Gimbal and slider work', 'Lapel audio on the speeches and vows', '5–7 minute cinematic film', '60-second social reel'],
      },
      {
        id: 'video_wedding_cinema',
        name: 'Wedding cinema — multi-day',
        emoji: '🎞️',
        blurb: 'The full production: crew across the functions, a teaser inside a week, and a proper feature edit.',
        price: 1_50_000, unit: 'event',
        tint: ['#7f1d1d', '#fecaca'],
        includes: ['Up to 3 days, 3-person crew', 'Teaser within 7 days', '8–12 minute feature film', 'Full-length ceremony edits', 'Same-day edit screening, if you want one'],
      },
      {
        id: 'video_invite',
        name: 'Save-the-date / invitation film',
        emoji: '💌',
        blurb: 'A 45–60 second film for WhatsApp and Instagram, shot and animated to your invite design.',
        price: 15000, unit: 'event',
        tint: ['#db2777', '#fce7f3'],
        includes: ['Half-day shoot or animation-only option', '45–60 second film', 'Vertical and square cuts', 'Two rounds of changes', 'Music licensed for social use'],
      },
    ],
  },

  /* ═══════════ Drone (new) ═══════════ */
  drone: {
    blurb: 'The overhead shot everybody remembers — flown by a licensed pilot, with the permissions handled.',
    unitHint: 'Airspace clearance is checked before we confirm; some venues near airports cannot be flown.',
    packs: [
      {
        id: 'drone_basic',
        name: 'Aerial coverage — 2 hours',
        emoji: '🚁',
        blurb: 'Entry, venue reveal and the group photograph, shot from the air.',
        price: 9000, unit: 'event',
        tint: ['#0369a1', '#e0f2fe'],
        includes: ['Licensed pilot and spotter, 2 hours', '4K aerial footage', 'Venue reveal and group shot', 'Raw and graded clips'],
      },
      {
        id: 'drone_full',
        name: 'Full-day aerial + FPV entry shot',
        emoji: '🛸',
        blurb: 'A full day in the air, including one FPV run through the venue for the film’s opening.',
        price: 24000, unit: 'event',
        tint: ['#1e293b', '#bae6fd'],
        popular: true,
        includes: ['Pilot and spotter for the full day', 'One FPV cinematic run', 'Aerial timelapse of the setup', 'Footage handed to your video team same night', 'Airspace clearance handled'],
      },
    ],
  },

  /* ═══════════ Live streaming (new) ═══════════ */
  livestream: {
    blurb: 'For the family who could not travel. A stable, watchable stream — not a phone propped on a chair.',
    unitHint: 'Needs a wired connection or our own 4G bonding kit; we test the venue beforehand.',
    packs: [
      {
        id: 'stream_single',
        name: 'Single-camera stream',
        emoji: '📡',
        blurb: 'One camera on the stage, streamed to a private link with the ceremony audio mixed in.',
        price: 12000, unit: 'event',
        tint: ['#0f766e', '#ccfbf1'],
        includes: ['One camera, 4 hours', 'Private YouTube or Zoom link', 'Audio taken from the mic feed, not the room', 'Bonded 4G backup', 'Recording handed over after'],
      },
      {
        id: 'stream_multi',
        name: 'Multi-camera production stream',
        emoji: '🎛️',
        blurb: 'Three cameras, a live switcher, names and titles on screen, and someone watching the chat.',
        price: 32000, unit: 'event',
        tint: ['#1e3a8a', '#dbeafe'],
        popular: true,
        includes: ['Three cameras with a live switcher', 'Lower-third titles and your monogram', 'Dedicated audio mix', 'Moderator watching the chat', 'Full recording archived'],
      },
    ],
  },

  /* ═══════════ Photo booth ═══════════ */
  photobooth: {
    blurb: 'The thing guests queue at. Prints they take home, and a folder of them you keep.',
    unitHint: 'Priced for a 3–4 hour run; extra hours at a stated rate.',
    packs: [
      {
        id: 'booth_classic',
        name: 'Classic booth with instant prints',
        emoji: '🤳',
        blurb: 'Backdrop, props, an attendant and unlimited 4×6 prints for three hours.',
        price: 12000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        popular: true,
        includes: ['Backdrop, lighting and prop trunk', 'Unlimited prints for 3 hours', 'Custom print border with your names', 'Attendant throughout', 'Digital copies of every shot'],
      },
      {
        id: 'booth_360',
        name: '360° spinner booth',
        emoji: '🌀',
        blurb: 'The slow-motion spin video everyone posts before the evening is over.',
        price: 22000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['360° platform with lighting and safety rail', '3 hours with an operator', 'Instant sharing to WhatsApp', 'Branded overlay and music', 'All videos handed over'],
      },
      {
        id: 'booth_mirror',
        name: 'Magic mirror booth',
        emoji: '🪞',
        blurb: 'A full-length mirror that talks back, signs autographs on screen and prints in ten seconds.',
        price: 16000, unit: 'event',
        tint: ['#0891b2', '#cffafe'],
        includes: ['Full-length mirror booth', 'Touch-screen signing and stickers', 'Unlimited prints for 3 hours', 'Custom on-screen theme', 'Attendant and digital copies'],
      },
    ],
  },

  /* ═══════════ Memory wall ═══════════ */
  memory_wall: {
    blurb: 'A life, printed and hung where people stop and read it.',
    unitHint: 'Send the photographs a week ahead; we print, mount and hand them back afterwards.',
    packs: [
      {
        id: 'memwall_string',
        name: 'Photo string & clip display',
        emoji: '📎',
        blurb: 'Prints pegged on lit strings — quick, warm, and easy to add to on the day.',
        price: 5500, unit: 'event',
        tint: ['#a16207', '#fef3c7'],
        includes: ['Up to 40 prints, 4×6', 'Lit string display with clips', 'Setup and clearing', 'Prints handed over after'],
      },
      {
        id: 'memwall_timeline',
        name: 'Career / life timeline wall',
        emoji: '🖼️',
        blurb: 'Framed and captioned by decade, with spot lighting so people actually read it.',
        price: 12000, unit: 'event',
        tint: ['#475569', '#e2e8f0'],
        popular: true,
        includes: ['Up to 40 mounted prints with captions', 'Timeline layout and headings', 'Spot lighting on the wall', 'Large signing board and pens', 'Prints handed over after'],
      },
      {
        id: 'memwall_tribute_film',
        name: 'Tribute film + wall',
        emoji: '🎞️',
        blurb: 'The wall, plus a 4-minute film cut from your photographs and played during the speeches.',
        price: 22000, unit: 'event',
        tint: ['#1e293b', '#c7d2fe'],
        includes: ['Everything in the timeline wall', '4-minute edited tribute film', 'Music and voiceover, if you supply one', 'Screen and playback on the day', 'Film delivered as a file'],
      },
    ],
  },

  /* ═══════════ DJ ═══════════ */
  dj: {
    blurb: 'A DJ who reads the room and a rig sized for it. Nothing here is a speaker on a plastic stand.',
    unitHint: 'Includes setup, soundcheck and an operator for the whole evening.',
    packs: [
      {
        id: 'dj_house',
        name: 'House party rig',
        emoji: '🔊',
        blurb: 'Two tops, a sub and a DJ for four hours — right for a terrace or a hall of about a hundred.',
        price: 12000, unit: 'event',
        tint: ['#7c3aed', '#ddd6fe'],
        includes: ['DJ console and operator, 4 hours', '2 tops + 1 subwoofer', 'Two wireless mics', 'Basic party lighting', 'Your playlist honoured'],
      },
      {
        id: 'dj_standard',
        name: 'Hall rig with lighting',
        emoji: '🎵',
        blurb: 'Line array sized to the hall, dance-floor lighting and a DJ who works the programme with your emcee.',
        price: 25000, unit: 'event',
        tint: ['#1e1b4b', '#c4b5fd'],
        popular: true,
        includes: ['Full PA sized to the venue, 6 hours', 'Dance-floor lighting and effects', 'Four wireless mics for the programme', 'Cue sheet run with your emcee', 'Backup console on site'],
      },
      {
        id: 'dj_premium',
        name: 'Sangeet production rig',
        emoji: '🎛️',
        blurb: 'Line array, moving heads, monitors for the performers and a sound engineer separate from the DJ.',
        price: 65000, unit: 'event',
        tint: ['#0f172a', '#a5b4fc'],
        includes: ['Line array PA with subs and monitors', 'Moving-head and wash lighting', 'DJ plus a dedicated sound engineer', 'Rehearsal slot the day before', 'Fog, sparkler and confetti cues'],
      },
    ],
  },

  /* ═══════════ Live music ═══════════ */
  live_music: {
    blurb: 'Musicians, not a playlist. Sound reinforcement is quoted separately unless the pack says otherwise.',
    unitHint: 'Two 45-minute sets is standard; extra sets at a stated rate.',
    packs: [
      {
        id: 'music_classical_duo',
        name: 'Classical duo — veena, flute or violin',
        emoji: '🎻',
        blurb: 'Two musicians through the meal or the ceremony. Carnatic, Hindustani or light classical.',
        price: 18000, unit: 'event',
        tint: ['#b45309', '#fef3c7'],
        includes: ['Two musicians, 2 hours', 'Carnatic, Hindustani or light classical', 'Own small PA', 'Song requests taken in advance'],
      },
      {
        id: 'music_band',
        name: 'Live band — 5 piece',
        emoji: '🎸',
        blurb: 'Vocals, guitar, keys, bass and drums. Bollywood, retro, Kannada film or English covers.',
        price: 55000, unit: 'event',
        tint: ['#be123c', '#fecdd3'],
        popular: true,
        includes: ['5-piece band, two 45-minute sets', 'Set list agreed in advance', 'Own backline and monitors', 'Two rehearsed special requests', 'Sound engineer included'],
        note: 'Front-of-house PA is separate unless you also book a DJ rig.',
      },
      {
        id: 'music_ghazal_sufi',
        name: 'Ghazal / Sufi / qawwali ensemble',
        emoji: '🎤',
        blurb: 'For a mehendi evening or a nikah — harmonium, tabla, chorus and a vocalist who can hold a room.',
        price: 48000, unit: 'event',
        tint: ['#0f766e', '#ccfbf1'],
        includes: ['Vocalist with 4-piece ensemble', 'Two 45-minute sets', 'Own PA and monitors', 'Requests taken in advance'],
      },
      {
        id: 'music_dj_band',
        name: 'Band + DJ combined evening',
        emoji: '🎶',
        blurb: 'Live sets early, DJ after — one crew, one soundcheck, no gap while gear is swapped.',
        price: 95000, unit: 'event',
        tint: ['#4c1d95', '#ddd6fe'],
        includes: ['5-piece band, two sets', 'DJ for the rest of the evening', 'Shared PA and lighting rig', 'One soundcheck, one crew', 'Full programme cue sheet'],
      },
    ],
  },

  /* ═══════════ Nadaswaram / traditional (new) ═══════════ */
  nadaswaram: {
    blurb: 'The sound a South Indian function is supposed to start with. Booked by name, not as “live music”.',
    unitHint: 'Morning muhurtham slots book out months ahead — tell us the date early.',
    packs: [
      {
        id: 'nadaswaram_pair',
        name: 'Nadaswaram & thavil pair',
        emoji: '🎺',
        blurb: 'Two players for the muhurtham and the reception entry — the traditional mangala vadyam.',
        price: 12000, unit: 'event',
        tint: ['#b45309', '#fde68a'],
        popular: true,
        includes: ['Nadaswaram and thavil artists', 'Up to 3 hours', 'Muhurtham and entry coverage', 'Traditional attire', 'Own amplification'],
      },
      {
        id: 'nadaswaram_troupe',
        name: 'Full mangala vadyam troupe',
        emoji: '🥁',
        blurb: 'Four to six players, for a wedding that runs from the procession to the meal.',
        price: 25000, unit: 'event',
        tint: ['#9a3412', '#fed7aa'],
        includes: ['4–6 artists across the day', 'Procession, muhurtham and meal', 'Coordination with the purohit’s timings', 'Traditional attire', 'Amplification included'],
      },
      {
        id: 'shehnai_pair',
        name: 'Shehnai & dhol (North Indian)',
        emoji: '🪈',
        blurb: 'Shehnai for the ceremony, dhol for the baraat — the North Indian equivalent, same idea.',
        price: 14000, unit: 'event',
        tint: ['#dc2626', '#fee2e2'],
        includes: ['Shehnai player and accompanist', 'Dhol for the procession', 'Up to 3 hours', 'Traditional attire'],
      },
    ],
  },

  /* ═══════════ Drum / dhol ═══════════ */
  drum: {
    blurb: 'Percussion for an entrance, a procession or a plain lack of energy at 8pm.',
    unitHint: 'Priced per group for a one-hour appearance.',
    packs: [
      {
        id: 'drum_dhol',
        name: 'Dhol players',
        emoji: '🥁',
        blurb: 'Two dhol players for the baraat, the entry or the sangeet opening.',
        price: 8000, unit: 'unit', unitLabel: 'player', defaultQty: 2,
        tint: ['#dc2626', '#fee2e2'],
        popular: true,
        includes: ['One hour of playing', 'Traditional attire', 'Coordination with the DJ on cues', 'Travel within the city'],
      },
      {
        id: 'drum_chende',
        name: 'Chenda / dollu kunitha troupe',
        emoji: '🪘',
        blurb: 'Kerala chenda melam or Karnataka dollu kunitha — a proper troupe, not two people with drums.',
        price: 22000, unit: 'event',
        tint: ['#166534', '#dcfce7'],
        includes: ['6–8 artists', 'One-hour performance', 'Traditional costume', 'Procession or stage format'],
      },
      {
        id: 'drum_band',
        name: 'Brass band (baraat band)',
        emoji: '🎺',
        blurb: 'The full street band with uniforms, for a procession that has to be heard two lanes away.',
        price: 28000, unit: 'event',
        tint: ['#a16207', '#fef08a'],
        includes: ['10–12 piece brass band', 'Uniforms and lights', 'Up to 2 hours of procession', 'Song list agreed in advance'],
      },
    ],
  },

  /* ═══════════ Folk & cultural (new) ═══════════ */
  folk: {
    blurb: 'Regional troupes booked by name — the performance the elders in the room will recognise instantly.',
    unitHint: 'One 30–45 minute performance per booking; travel outside the city is quoted separately.',
    packs: [
      {
        id: 'folk_south',
        name: 'South Indian folk troupe',
        emoji: '💃',
        blurb: 'Dollu kunitha, veeragase, kathakali, yakshagana or a Bharatanatyam recital.',
        price: 24000, unit: 'event',
        tint: ['#b91c1c', '#fed7aa'],
        popular: true,
        includes: ['6–10 artists', '30–45 minute performance', 'Full costume and makeup', 'Own accompaniment', 'Green-room requirements shared in advance'],
      },
      {
        id: 'folk_north',
        name: 'North & West Indian folk',
        emoji: '🪗',
        blurb: 'Bhangra, giddha, Rajasthani kalbeliya, ghoomar or lavani.',
        price: 26000, unit: 'event',
        tint: ['#ea580c', '#ffedd5'],
        includes: ['6–10 artists', '30–45 minute performance', 'Full costume', 'Audience participation segment', 'Own music tracks'],
      },
      {
        id: 'folk_magic_kids',
        name: 'Magician, puppets & caricature',
        emoji: '🎩',
        blurb: 'The artists who work a room of children and their bored uncles at the same time.',
        price: 12000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['Magician or puppeteer, 60 minutes', 'Caricature artist option', 'Props and sound', 'Prizes for participating children'],
      },
      {
        id: 'folk_mascot',
        name: 'Costume mascot appearance',
        emoji: '🧸',
        blurb: 'A character walk-in for the cake cutting — the one thing a four-year-old actually remembers.',
        price: 7500, unit: 'event',
        tint: ['#db2777', '#fce7f3'],
        includes: ['One costume character, 60 minutes', 'Games and photo time', 'Handler and cooling breaks', 'Character chosen from our list'],
      },
    ],
  },

  /* ═══════════ Bhajan / devotional (new) ═══════════ */
  bhajan: {
    blurb: 'Devotional music for a pooja, a satsang or a chowki — booked as its own service, not squeezed under “entertainment”.',
    unitHint: 'Two-hour sitting is standard; overnight jagran quoted separately.',
    packs: [
      {
        id: 'bhajan_mandali',
        name: 'Bhajan mandali (4 artists)',
        emoji: '🎼',
        blurb: 'Harmonium, tabla, manjira and vocals for a two-hour sitting.',
        price: 9000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        popular: true,
        includes: ['4 artists, 2 hours', 'Own instruments and small PA', 'Song list agreed in advance', 'Traditional attire'],
      },
      {
        id: 'bhajan_chowki',
        name: 'Mata ki chowki / jagran',
        emoji: '🪔',
        blurb: 'A full evening programme with singers, keyboard, dholak and a compere.',
        price: 32000, unit: 'event',
        tint: ['#b91c1c', '#fee2e2'],
        includes: ['6–8 artists, 4–5 hours', 'PA, lighting and a compere', 'Aarti and prasad segment coordination', 'Chowki decoration liaison'],
      },
      {
        id: 'bhajan_carnatic',
        name: 'Bhajanai / Carnatic devotional sitting',
        emoji: '🙏',
        blurb: 'A vocalist with mridangam and violin for a homam, a Satyanarayana pooja or a house-warming.',
        price: 15000, unit: 'event',
        tint: ['#0f766e', '#ccfbf1'],
        includes: ['Vocalist with 2 accompanists', '2 hours', 'Coordination with the purohit', 'Own amplification'],
      },
    ],
  },

  /* ═══════════ Emcee ═══════════ */
  emcee: {
    blurb: 'Someone who holds the room together so your cousin does not have to.',
    unitHint: 'Includes a briefing call and a written cue sheet shared with the DJ.',
    packs: [
      {
        id: 'emcee_standard',
        name: 'Bilingual anchor — 4 hours',
        emoji: '🎙️',
        blurb: 'English with Kannada, Hindi, Tamil or Telugu. Runs the programme, names read correctly.',
        price: 12000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        popular: true,
        includes: ['4 hours on the mic', 'Briefing call and cue sheet', 'Name pronunciation checked in advance', 'Coordination with the DJ and photographer'],
      },
      {
        id: 'emcee_full',
        name: 'Full-programme host + games',
        emoji: '🎉',
        blurb: 'Eight hours, with games written for your family and a plan for the gaps.',
        price: 22000, unit: 'event',
        tint: ['#db2777', '#fce7f3'],
        includes: ['8 hours across the programme', 'Custom games and audience segments', 'Script written to your running order', 'Rehearsal with the performers', 'Backup host on standby'],
      },
      {
        id: 'emcee_corporate',
        name: 'Corporate host / conference MC',
        emoji: '🎤',
        blurb: 'A professional who can read a citation, keep to a clock and handle a panel.',
        price: 28000, unit: 'event',
        tint: ['#1e3a8a', '#dbeafe'],
        includes: ['Full-day hosting', 'Scripted awards and citations', 'Panel moderation, if needed', 'Rehearsal and AV cue alignment', 'Formal attire'],
      },
    ],
  },

  /* ═══════════ Performers ═══════════ */
  entertainment: {
    blurb: 'The acts that fill a stage between the speeches and the food.',
    unitHint: 'Each pack is one appearance; multiple acts on one evening are discounted.',
    packs: [
      {
        id: 'ent_dance_troupe',
        name: 'Dance troupe — Bollywood or fusion',
        emoji: '💃',
        blurb: 'A choreographed 20-minute set, with two numbers featuring the family if you want.',
        price: 25000, unit: 'event',
        tint: ['#e11d48', '#ffe4e6'],
        popular: true,
        includes: ['6–8 dancers', '20-minute choreographed set', 'Costumes and props', 'Two family-participation numbers', 'Rehearsal track shared in advance'],
      },
      {
        id: 'ent_cheer_led',
        name: 'LED / cyr wheel / aerial act',
        emoji: '🤸',
        blurb: 'A speciality act for the entry moment — LED costumes, aerial silks or a cyr wheel.',
        price: 35000, unit: 'event',
        tint: ['#0f172a', '#a5b4fc'],
        includes: ['Speciality act, 10–15 minutes', 'Rigging and safety crew where needed', 'Costume and effects', 'Cue rehearsal with lighting'],
      },
      {
        id: 'ent_stilt_welcome',
        name: 'Stilt walkers & welcome performers',
        emoji: '🎪',
        blurb: 'At the gate as guests arrive — stilt walkers, drummers or a shehnai-and-flower welcome.',
        price: 14000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        includes: ['2–4 performers at the entrance', '90 minutes of arrival coverage', 'Costume and props', 'Flower shower on arrival'],
      },
    ],
  },

  /* ═══════════ Choreography ═══════════ */
  choreography: {
    blurb: 'Rehearsals for the family, at your house or a studio, ending in a set nobody has to apologise for.',
    unitHint: 'Priced per package of sessions, not per hour.',
    packs: [
      {
        id: 'choreo_couple',
        name: 'Couple’s first dance',
        emoji: '💑',
        blurb: 'Four sessions, one song, choreographed to what the two of you can actually do.',
        price: 12000, unit: 'event',
        tint: ['#be123c', '#ffe4e6'],
        includes: ['4 sessions of 90 minutes', 'One song, fully choreographed', 'Video of each session to practise from', 'Final rehearsal at the venue'],
      },
      {
        id: 'choreo_family',
        name: 'Family sangeet package',
        emoji: '👨‍👩‍👧',
        blurb: 'Eight sessions across three or four groups — parents, cousins, the kids, and a finale.',
        price: 30000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        popular: true,
        includes: ['8 sessions across 3–4 groups', 'Song selection and edits', 'Practice videos for every group', 'Stage-position plan', 'On-stage cueing on the night'],
      },
      {
        id: 'choreo_full_show',
        name: 'Full sangeet production',
        emoji: '🎭',
        blurb: 'The whole evening designed — running order, medleys, entries, props and a rehearsal at the venue.',
        price: 65000, unit: 'event',
        tint: ['#0f172a', '#c4b5fd'],
        includes: ['12+ sessions across all groups', 'Complete running order and medley edits', 'Props and costume guidance', 'Full venue rehearsal', 'Show-calling on the night'],
      },
    ],
  },

  /* ═══════════ Kids ═══════════ */
  kids_play: {
    blurb: 'Somewhere for the children to be, supervised, so their parents can sit down for twenty minutes.',
    unitHint: 'All packs include a trained supervisor. Power and a flat 10×10 ft area needed for inflatables.',
    packs: [
      {
        id: 'kids_bouncy',
        name: 'Bouncy castle + supervisor',
        emoji: '🏰',
        blurb: 'One inflatable, a blower, a mat surround and somebody watching it the entire time.',
        price: 9000, unit: 'event',
        tint: ['#0ea5e9', '#e0f2fe'],
        popular: true,
        includes: ['Bouncy castle, 4 hours', 'Blower, mats and pegging', 'One trained supervisor', 'Shoe rack and queue marshalling'],
        note: 'Needs a power point within 15 m and a level surface.',
      },
      {
        id: 'kids_play_zone',
        name: 'Full play zone',
        emoji: '🎠',
        blurb: 'Ball pool, soft play, slide and games corner with two supervisors and a first-aid kit.',
        price: 22000, unit: 'event',
        tint: ['#f472b6', '#fce7f3'],
        includes: ['Ball pool, soft play and slide', 'Games corner with prizes', 'Two supervisors, 5 hours', 'First-aid kit on site', 'Fenced and matted area'],
      },
      {
        id: 'kids_activity',
        name: 'Craft, face-paint & tattoo corner',
        emoji: '🎨',
        blurb: 'Two artists doing face paint, glitter tattoos and a craft table the kids take home from.',
        price: 11000, unit: 'event',
        tint: ['#a855f7', '#f3e8ff'],
        includes: ['Two artists, 3 hours', 'Face paint and glitter tattoos', 'Craft table with take-home kits', 'Skin-safe, tested materials'],
      },
    ],
  },

  /* ═══════════ Childcare (new) ═══════════ */
  nanny: {
    blurb: 'Trained childminders so parents can attend the function rather than chase a toddler around it.',
    unitHint: 'One minder per four children under six is the ratio we hold to.',
    packs: [
      {
        id: 'nanny_standard',
        name: 'Trained childminder',
        emoji: '👶',
        blurb: 'Per minder, for six hours, with a quiet corner set up for naps and feeding.',
        price: 3500, unit: 'unit', unitLabel: 'minder', defaultQty: 2,
        tint: ['#f472b6', '#fce7f3'],
        popular: true,
        includes: ['Police-verified, first-aid trained', '6 hours per minder', 'Quiet nap and feeding corner', 'Parent handover log'],
      },
      {
        id: 'nanny_creche',
        name: 'Supervised crèche room',
        emoji: '🧸',
        blurb: 'A separate room set up as a crèche — mats, toys, a screen and three minders.',
        price: 18000, unit: 'event',
        tint: ['#a855f7', '#f3e8ff'],
        includes: ['Room set-up with mats and toys', 'Three minders for 6 hours', 'Snack and milk station', 'Sign-in and sign-out register'],
      },
    ],
  },

  /* ═══════════ Security ═══════════ */
  bouncers: {
    blurb: 'Trained crew at the gate and the gift table. Priced per guard, with a sensible default for your size.',
    unitHint: 'One guard per 100 guests, minimum two, is the ratio we quote at.',
    packs: [
      {
        id: 'sec_guard',
        name: 'Uniformed security guard',
        emoji: '🛡️',
        blurb: 'An eight-hour shift at the entrance, the gift table or the parking gate.',
        price: 2200, unit: 'unit', unitLabel: 'guard', defaultQty: 2,
        tint: ['#1f2937', '#e5e7eb'],
        popular: true,
        includes: ['8-hour shift, uniformed', 'Entrance, gift table or parking post', 'Guest-list checking, if you supply one', 'Verified and briefed before the day'],
      },
      {
        id: 'sec_bouncer',
        name: 'Bouncer / crowd-control crew',
        emoji: '💪',
        blurb: 'For a large sangeet, a bar or a public function — trained in crowd handling, not just standing.',
        price: 3200, unit: 'unit', unitLabel: 'crew', defaultQty: 4,
        tint: ['#0f172a', '#cbd5e1'],
        includes: ['8-hour shift', 'Crowd control and queue management', 'Bar and dance-floor cover', 'Supervisor for crews of four or more'],
      },
      {
        id: 'sec_ladies',
        name: 'Women security personnel',
        emoji: '👮‍♀️',
        blurb: 'For the bridal room, the ladies’ area and the cloakroom.',
        price: 2400, unit: 'unit', unitLabel: 'guard', defaultQty: 2,
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['8-hour shift', 'Bridal room and ladies’ area cover', 'Cloakroom supervision', 'Verified and briefed'],
      },
    ],
  },

  /* ═══════════ Valet & parking (new) ═══════════ */
  valet: {
    blurb: 'The first and last five minutes of your guest’s evening. Both are usually the parking.',
    unitHint: 'Venue permission for valet operation is confirmed before we quote.',
    packs: [
      {
        id: 'valet_marshals',
        name: 'Parking marshals',
        emoji: '🅿️',
        blurb: 'Crew directing cars, filling the lot properly and keeping the gate clear.',
        price: 1800, unit: 'unit', unitLabel: 'marshal', defaultQty: 3,
        tint: ['#334155', '#e2e8f0'],
        includes: ['8-hour shift, high-vis uniform', 'Cones, signage and torches', 'Gate and lane management', 'Overflow lot coordination'],
      },
      {
        id: 'valet_full',
        name: 'Full valet service',
        emoji: '🔑',
        blurb: 'Keys taken at the door, cars parked and returned. Insured drivers, numbered tags.',
        price: 22000, unit: 'event',
        tint: ['#1f2937', '#fde68a'],
        popular: true,
        includes: ['6 valet drivers with insurance cover', 'Key counter with numbered tags', 'Podium, signage and cones', 'Retrieval desk for the departure rush', 'Damage cover documented'],
      },
    ],
  },

  /* ═══════════ Power backup (new) ═══════════ */
  power: {
    blurb: 'The service nobody thinks about until the lights go out during the muhurtham.',
    unitHint: 'Sized against your lighting, sound and kitchen load — tell us what else you have booked.',
    packs: [
      {
        id: 'power_25kva',
        name: '25 kVA silent generator',
        emoji: '🔌',
        blurb: 'Enough for lighting, sound and a small kitchen at a home or hall function.',
        price: 9000, unit: 'event',
        tint: ['#0f766e', '#ccfbf1'],
        popular: true,
        includes: ['25 kVA silent DG for 8 hours', 'Operator on site throughout', 'Fuel for the duration', 'Distribution box and cabling', 'Auto changeover on mains failure'],
      },
      {
        id: 'power_62kva',
        name: '62 kVA generator + distribution',
        emoji: '⚡',
        blurb: 'For a full production — LED wall, line array, cooling and a live kitchen together.',
        price: 22000, unit: 'event',
        tint: ['#1e293b', '#fde047'],
        includes: ['62 kVA silent DG for 12 hours', 'Operator and standby technician', 'Fuel, distribution boards and armoured cabling', 'Load survey before the day', 'Earthing and safety certification'],
      },
      {
        id: 'power_ups',
        name: 'UPS backup for AV & streaming',
        emoji: '🔋',
        blurb: 'Keeps the projector, the stream and the sound desk alive through a changeover blink.',
        price: 7500, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['UPS sized to the AV load', 'Bridges generator changeover', 'Technician on site', 'Cable management and testing'],
      },
    ],
  },

  /* ═══════════ Cooling (new) ═══════════ */
  cooling: {
    blurb: 'Fans, coolers and heaters. April afternoons and December nights are both bookable problems.',
    unitHint: 'Priced per unit with a default count for your guest number.',
    packs: [
      {
        id: 'cool_pedestal',
        name: 'Pedestal fans & air coolers',
        emoji: '🌬️',
        blurb: 'The workhorse for a shamiana or a hall without air conditioning.',
        price: 900, unit: 'unit', unitLabel: 'unit', defaultQty: 8,
        tint: ['#0891b2', '#cffafe'],
        includes: ['Delivered, placed and collected', 'Water top-ups for coolers', 'Extension cabling and covers', 'Replacement on failure'],
      },
      {
        id: 'cool_misting',
        name: 'Misting fans for outdoor lawns',
        emoji: '💨',
        blurb: 'Drops the felt temperature around the seating without soaking anyone.',
        price: 3500, unit: 'unit', unitLabel: 'fan', defaultQty: 4,
        tint: ['#0ea5e9', '#e0f2fe'],
        includes: ['Misting fan with water supply', 'Placement plan around seating', 'Operator to manage output', 'Collection the same night'],
      },
      {
        id: 'cool_heaters',
        name: 'Patio heaters & firepits',
        emoji: '🔥',
        blurb: 'For December and January dates on a lawn or terrace.',
        price: 2800, unit: 'unit', unitLabel: 'heater', defaultQty: 6,
        tint: ['#ea580c', '#ffedd5'],
        includes: ['Gas patio heater with cylinder', 'Safe placement and guard rails', 'Refills for the evening', 'Fire extinguisher on site'],
      },
    ],
  },

  /* ═══════════ Washrooms (new) ═══════════ */
  washrooms: {
    blurb: 'Portable washrooms for lawns, farmhouses and any venue whose two toilets will not survive 300 guests.',
    unitHint: 'One cabin per 40 guests is the ratio we quote at, split by gender.',
    packs: [
      {
        id: 'wash_standard',
        name: 'Standard portable cabin',
        emoji: '🚻',
        blurb: 'Ventilated cabin with a water tank, washbasin and lighting.',
        price: 4500, unit: 'unit', unitLabel: 'cabin', defaultQty: 4,
        tint: ['#0f766e', '#ccfbf1'],
        includes: ['Cabin with water and waste tanks', 'Washbasin, mirror and lighting', 'Attendant-cleaned twice during the event', 'Placement, connection and removal'],
      },
      {
        id: 'wash_luxury',
        name: 'Luxury restroom van',
        emoji: '🚐',
        blurb: 'An air-conditioned van with vanity mirrors — for weddings where the bridal party needs somewhere real.',
        price: 35000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        popular: true,
        includes: ['Air-conditioned multi-cabin van', 'Vanity counters and mirrors', 'Full-time attendant', 'Water and power connection', 'Same-night removal'],
      },
    ],
  },

  /* ═══════════ Medical (new) ═══════════ */
  medical: {
    blurb: 'A trained pair of hands on site. For a 300-guest function with elders present, this is not optional.',
    unitHint: 'Ambulance packs include the nearest-hospital route confirmed in advance.',
    packs: [
      {
        id: 'med_first_aid',
        name: 'First-aid attendant',
        emoji: '🩹',
        blurb: 'A trained attendant with a stocked kit, stationed where guests can find them.',
        price: 4500, unit: 'event',
        tint: ['#dc2626', '#fee2e2'],
        popular: true,
        includes: ['Trained first-aider, 8 hours', 'Stocked first-aid station', 'Basic medication for common complaints', 'Escalation plan and emergency numbers'],
      },
      {
        id: 'med_nurse',
        name: 'Nurse + oxygen standby',
        emoji: '🩺',
        blurb: 'A registered nurse with oxygen and a BP monitor — for functions with a lot of elderly guests.',
        price: 12000, unit: 'event',
        tint: ['#b91c1c', '#fecaca'],
        includes: ['Registered nurse, 8 hours', 'Oxygen cylinder and BP monitor', 'Private space for attending to guests', 'Nearest-hospital route confirmed'],
      },
      {
        id: 'med_ambulance',
        name: 'Ambulance on standby',
        emoji: '🚑',
        blurb: 'A BLS ambulance parked on site with a paramedic, for the whole function.',
        price: 18000, unit: 'event',
        tint: ['#7f1d1d', '#fee2e2'],
        includes: ['BLS ambulance with paramedic, 8 hours', 'Parked on site throughout', 'Hospital tie-up confirmed', 'Direct line to the coordinator'],
      },
    ],
  },

  /* ═══════════ Hospitality & ushers (new) ═══════════ */
  hospitality: {
    blurb: 'The people who greet, guide and look after guests — the difference between organised and chaotic.',
    unitHint: 'Priced per person for an eight-hour shift, briefed the day before.',
    packs: [
      {
        id: 'hosp_ushers',
        name: 'Ushers & welcome hostesses',
        emoji: '🙋',
        blurb: 'At the gate and the seating — greeting guests, guiding elders, handing out favours.',
        price: 2200, unit: 'unit', unitLabel: 'usher', defaultQty: 4,
        tint: ['#db2777', '#fce7f3'],
        popular: true,
        includes: ['8-hour shift in coordinated attire', 'Welcome, seating and guiding', 'Gift and favour distribution', 'Briefed on family names and protocol'],
      },
      {
        id: 'hosp_guest_manager',
        name: 'Guest relations manager',
        emoji: '📋',
        blurb: 'One person who owns the guest list, the room allotments and the VIP arrivals.',
        price: 12000, unit: 'event',
        tint: ['#1e3a8a', '#dbeafe'],
        includes: ['Full-day guest relations lead', 'Guest list and RSVP tracking', 'VIP arrival and seating protocol', 'Room allotment coordination', 'Single point of contact for the family'],
      },
      {
        id: 'hosp_cloakroom',
        name: 'Cloakroom & luggage desk',
        emoji: '🧳',
        blurb: 'Somewhere to put bags, gifts and shawls, with numbered tags and an attendant.',
        price: 8500, unit: 'event',
        tint: ['#78350f', '#fef3c7'],
        includes: ['Cloakroom counter with racks', 'Numbered tag system', 'Two attendants for the event', 'Secure gift storage', 'Handover log at close'],
      },
    ],
  },

  /* ═══════════ Transport ═══════════ */
  transport: {
    blurb: 'Getting people there and back. Priced per vehicle, with drivers, fuel and parking included.',
    unitHint: 'Within city limits. Outstation runs are quoted per kilometre.',
    packs: [
      {
        id: 'trans_bus',
        name: 'Guest shuttle bus (35-seat)',
        emoji: '🚌',
        blurb: 'Pickup points to venue and back — the fix for a wedding with no parking.',
        price: 12000, unit: 'unit', unitLabel: 'bus', defaultQty: 1,
        tint: ['#1d4ed8', '#dbeafe'],
        popular: true,
        includes: ['35-seat bus with driver, 10 hours', 'Fuel, tolls and parking', 'Two pickup points', 'Coordinator on the bus', 'Route shared with guests in advance'],
      },
      {
        id: 'trans_tempo',
        name: 'Tempo traveller (12-seat)',
        emoji: '🚐',
        blurb: 'For out-of-town family, airport runs and moving the bridal party between venues.',
        price: 5500, unit: 'unit', unitLabel: 'vehicle', defaultQty: 2,
        tint: ['#0f766e', '#ccfbf1'],
        includes: ['12-seat AC tempo with driver, 10 hours', 'Fuel, tolls and parking', 'Airport and station pickups', 'Luggage space'],
      },
      {
        id: 'trans_cabs',
        name: 'Cab pool for elderly guests',
        emoji: '🚕',
        blurb: 'A block of cabs on call, so nobody stands at a gate at 11pm.',
        price: 1500, unit: 'unit', unitLabel: 'cab', defaultQty: 6,
        tint: ['#a16207', '#fef3c7'],
        includes: ['Sedan with driver, 6 hours', 'Assigned to named guests', 'Fuel and parking', 'Dispatcher managing the pool'],
      },
    ],
  },

  /* ═══════════ Wedding cars (new) ═══════════ */
  wedding_car: {
    blurb: 'The car the couple arrives in, decorated and driven by someone in uniform.',
    unitHint: 'Includes decoration, chauffeur, fuel and one venue-to-venue transfer.',
    packs: [
      {
        id: 'car_sedan',
        name: 'Decorated sedan',
        emoji: '🚗',
        blurb: 'A clean white sedan with fresh-flower decoration, for the entry or the bidaai.',
        price: 8500, unit: 'event',
        tint: ['#f8fafc', '#fda4af'],
        popular: true,
        includes: ['Sedan with uniformed chauffeur', 'Fresh-flower decoration', '6 hours and one transfer', 'Fuel, tolls and parking'],
      },
      {
        id: 'car_luxury',
        name: 'Luxury car (BMW / Mercedes class)',
        emoji: '🏎️',
        blurb: 'For the reception entry, with tasteful decoration that does not damage the paint.',
        price: 28000, unit: 'event',
        tint: ['#0f172a', '#e2e8f0'],
        includes: ['Luxury sedan with chauffeur', 'Magnetic and ribbon decoration only', '6 hours and one transfer', 'Full insurance cover'],
      },
      {
        id: 'car_vintage',
        name: 'Vintage / open-top car',
        emoji: '🚙',
        blurb: 'The one people photograph. Vintage Impala, jeep or an open-top for the baraat.',
        price: 35000, unit: 'event',
        tint: ['#7c2d12', '#fde68a'],
        includes: ['Vintage or open-top vehicle', 'Floral decoration to your palette', '4 hours with a driver', 'Backup vehicle on standby'],
      },
      {
        id: 'car_ghodi',
        name: 'Ghodi / horse & carriage',
        emoji: '🐎',
        blurb: 'A decorated mare for the baraat, with a handler and full traditional dressing.',
        price: 18000, unit: 'event',
        tint: ['#b45309', '#fef3c7'],
        includes: ['Decorated ghodi with handler', 'Traditional saddle and floral work', 'Up to 2 hours of procession', 'Buggy / carriage option available'],
      },
    ],
  },

  /* ═══════════ Baraat (new) ═══════════ */
  baraat: {
    blurb: 'The procession, run as one booking — band, lights, effects and marshals who keep the road moving.',
    unitHint: 'Route and timing are cleared with the local police station where required.',
    packs: [
      {
        id: 'baraat_basic',
        name: 'Dhol + light poles',
        emoji: '🪘',
        blurb: 'Two dhol players, six hand-carried light poles and two marshals.',
        price: 16000, unit: 'event',
        tint: ['#dc2626', '#fee2e2'],
        includes: ['Two dhol players, 90 minutes', 'Six carried light poles', 'Two route marshals', 'Flower shower at the gate'],
      },
      {
        id: 'baraat_full',
        name: 'Full baraat production',
        emoji: '🎺',
        blurb: 'Brass band, lights, ghodi, cold pyro at the gate and marshals for the whole route.',
        price: 65000, unit: 'event',
        tint: ['#b91c1c', '#fde68a'],
        popular: true,
        includes: ['10-piece brass band with uniforms', 'Decorated ghodi and handler', 'Carried light poles and LED props', 'Cold pyro and flower shower at the gate', 'Route marshals and police liaison'],
      },
    ],
  },

  /* ═══════════ Mehendi ═══════════ */
  mehendi: {
    blurb: 'Artists who work fast and clean. Bridal designs are booked by the hand, guest mehendi by the hour.',
    unitHint: 'Bridal work takes 3–5 hours — book the artist for the morning before the function.',
    packs: [
      {
        id: 'mehendi_guest',
        name: 'Guest mehendi artist',
        emoji: '🪷',
        blurb: 'One artist for four hours, doing simple designs for guests as they queue.',
        price: 4500, unit: 'unit', unitLabel: 'artist', defaultQty: 2,
        tint: ['#84cc16', '#ecfccb'],
        popular: true,
        includes: ['4 hours per artist', 'Simple and Arabic designs', 'Own cones, natural henna', 'Seating and lighting set up'],
      },
      {
        id: 'mehendi_bridal',
        name: 'Bridal mehendi — full hands & feet',
        emoji: '👰',
        blurb: 'Full bridal work in Rajasthani, Arabic or portrait style, with the groom’s name hidden in it.',
        price: 15000, unit: 'event',
        tint: ['#a16207', '#fef3c7'],
        includes: ['Full hands to elbow, feet to knee', 'Style of your choice, designs shown first', '4–5 hours of dedicated work', 'Natural henna, no chemical cones', 'Touch-up visit before the muhurtham'],
      },
      {
        id: 'mehendi_premium',
        name: 'Bridal + 4 guest artists',
        emoji: '✨',
        blurb: 'One senior artist on the bride while four work the room. What a 150-guest mehendi actually needs.',
        price: 34000, unit: 'event',
        tint: ['#65a30d', '#f7fee7'],
        includes: ['Senior artist for the bride', 'Four artists for guests, 5 hours', 'Seating, lighting and queue management', 'Natural henna throughout', 'Aftercare packs for guests'],
      },
    ],
  },

  /* ═══════════ Makeup ═══════════ */
  makeup: {
    blurb: 'Artists who work on Indian skin tones and know how a lehenga photographs under tungsten light.',
    unitHint: 'A trial is included in the bridal packs; guest makeup is priced per person.',
    packs: [
      {
        id: 'makeup_guest',
        name: 'Guest / family makeup',
        emoji: '💄',
        blurb: 'Per person — makeup, hair and draping for mothers, sisters and friends.',
        price: 3500, unit: 'unit', unitLabel: 'person', defaultQty: 3,
        tint: ['#db2777', '#fce7f3'],
        includes: ['Makeup and hair per person', 'Saree or dupatta draping', 'Products suited to your skin tone', 'Touch-up kit'],
      },
      {
        id: 'makeup_bridal',
        name: 'Bridal makeup + trial',
        emoji: '👰',
        blurb: 'A trial session, then the day itself — HD or airbrush, hair, draping and jewellery setting.',
        price: 25000, unit: 'event',
        tint: ['#be123c', '#ffe4e6'],
        popular: true,
        includes: ['Trial session before the day', 'HD or airbrush bridal makeup', 'Hair styling and saree/lehenga draping', 'Jewellery and dupatta setting', 'Touch-ups until the reception'],
      },
      {
        id: 'makeup_multi_day',
        name: 'Multi-day bridal package',
        emoji: '💍',
        blurb: 'Haldi, mehendi, muhurtham and reception — different looks, same artist who knows your face.',
        price: 65000, unit: 'event',
        tint: ['#9333ea', '#f3e8ff'],
        includes: ['Four function looks with a trial', 'Artist plus assistant on the wedding day', 'Hair, draping and jewellery for each', 'Two family members included per day', 'On-call touch-ups throughout'],
      },
      {
        id: 'makeup_groom',
        name: 'Groom styling',
        emoji: '🤵',
        blurb: 'Grooming, light makeup for the camera, safa tying and sherwani setting.',
        price: 8000, unit: 'event',
        tint: ['#1f2937', '#e5e7eb'],
        includes: ['Grooming and camera-ready makeup', 'Safa / pagdi tying', 'Sherwani and stole setting', 'Touch-ups at the reception'],
      },
    ],
  },

  /* ═══════════ Bridal wear ═══════════ */
  bridal_wear: {
    blurb: 'Styling, draping and the team that gets a bridal party dressed on time.',
    unitHint: 'Outfits are yours; this is the team, the styling and the fittings.',
    packs: [
      {
        id: 'bridal_draping',
        name: 'Draping & dressing team',
        emoji: '🥻',
        blurb: 'Two dressers for the bride and the immediate family, through the function.',
        price: 12000, unit: 'event',
        tint: ['#be123c', '#ffe4e6'],
        includes: ['Two dressers for the day', 'Saree, lehenga and dupatta setting', 'Pinning kit and emergency repairs', 'Jewellery placement'],
      },
      {
        id: 'bridal_stylist',
        name: 'Personal stylist + fittings',
        emoji: '✨',
        blurb: 'Someone to plan the four outfits, run the fittings and make sure nothing clashes with the decor.',
        price: 35000, unit: 'event',
        tint: ['#9333ea', '#f3e8ff'],
        popular: true,
        includes: ['Look planning across all functions', 'Two fitting appointments', 'Jewellery and accessory coordination', 'Shopping companion visit', 'On-day dressing team'],
      },
      {
        id: 'bridal_trousseau',
        name: 'Trousseau packing & gift wrapping',
        emoji: '🎁',
        blurb: 'Outfits, jewellery and gifts packed and presented the way they are meant to be handed over.',
        price: 18000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        includes: ['Trousseau packing in themed boxes', 'Decorated trays for the exchange', 'Gift wrapping for up to 40 items', 'Labelling and handover list', 'Delivery to both homes'],
      },
    ],
  },

  /* ═══════════ Priest & pooja ═══════════ */
  priest: {
    blurb: 'A purohit who performs the rite properly, in your language and your family’s tradition.',
    unitHint: 'Tell us the sampradaya and the language when booking — it changes who we send.',
    packs: [
      {
        id: 'priest_home_pooja',
        name: 'Home pooja / vratam',
        emoji: '🙏',
        blurb: 'Satyanarayana pooja, Ganapathi homam or a simple vratam at home.',
        price: 4500, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        popular: true,
        includes: ['Purohit for up to 3 hours', 'Sankalpa in your gotra and nakshatra', 'Mantras explained as you go', 'Samagri list shared in advance'],
      },
      {
        id: 'priest_homam',
        name: 'Homam / havan with vadhyars',
        emoji: '🔥',
        blurb: 'A full homam with the required number of vadhyars, homa kunda and dravyas.',
        price: 16000, unit: 'event',
        tint: ['#b45309', '#fed7aa'],
        includes: ['Lead purohit plus 2 vadhyars', 'Homa kunda setup and dravyas', 'Up to 5 hours', 'Muhurtham timing advice', 'Post-homam prasadam guidance'],
      },
      {
        id: 'priest_wedding',
        name: 'Wedding purohit — full rites',
        emoji: '💒',
        blurb: 'From nandi to the saptapadi, across the ceremony days, with everything explained.',
        price: 35000, unit: 'event',
        tint: ['#dc2626', '#fee2e2'],
        includes: ['Lead purohit with assistants', 'All pre-wedding and wedding rites', 'Muhurtham consultation beforehand', 'Rituals explained to both families', 'Coordination with the decorator on the mandap'],
      },
    ],
  },

  pooja: {
    blurb: 'Every item on the samagri list, sourced and arranged before the muhurat so nobody is sent to the shop.',
    unitHint: 'The list is confirmed with your purohit before we buy anything.',
    packs: [
      {
        id: 'pooja_basic',
        name: 'Standard samagri kit',
        emoji: '🪔',
        blurb: 'The complete list for a home pooja — arranged on the thali, ready to begin.',
        price: 3500, unit: 'event',
        tint: ['#eab308', '#fef9c3'],
        popular: true,
        includes: ['Full samagri as per your purohit’s list', 'Flowers, fruits and coconuts', 'Arranged and laid out before the muhurat', 'Brass lamps and thali on loan'],
      },
      {
        id: 'pooja_homam_kit',
        name: 'Homam samagri & kunda setup',
        emoji: '🔥',
        blurb: 'Homa kunda, samidha, ghee, dravyas and the full arrangement around it.',
        price: 9500, unit: 'event',
        tint: ['#b45309', '#fed7aa'],
        includes: ['Homa kunda and bricks', 'Samidha, ghee and all dravyas', 'Ritual seating arrangement', 'Complete clearing and ash disposal'],
      },
      {
        id: 'pooja_annadanam',
        name: 'Annadanam / prasadam seva',
        emoji: '🍚',
        blurb: 'Cooked and served to the number you name, as seva rather than as catering.',
        price: 180, unit: 'guest',
        tint: ['#15803d', '#dcfce7'],
        includes: ['Simple sattvic meal, cooked on site', 'Leaf or plate service', 'Serving volunteers', 'No onion, no garlic — kitchen kept separate'],
      },
    ],
  },

  /* ═══════════ Bar & counters (new) ═══════════ */
  bar: {
    blurb: 'A proper bar setup with trained bartenders. We do not supply alcohol — you do, and we serve it correctly.',
    unitHint: 'Licence for serving is the venue’s or yours; we confirm before quoting.',
    packs: [
      {
        id: 'bar_mocktail',
        name: 'Mocktail & juice bar',
        emoji: '🍹',
        blurb: 'A full mocktail counter with two bartenders — the one every function can actually have.',
        price: 220, unit: 'guest',
        tint: ['#0891b2', '#cffafe'],
        popular: true,
        includes: ['8 mocktails on rotation', 'Two bartenders with a styled counter', 'Fresh juices, sherbets and coolers', 'Glassware, ice and garnish', 'Unlimited for 4 hours'],
      },
      {
        id: 'bar_full',
        name: 'Full bar setup with bartenders',
        emoji: '🍸',
        blurb: 'Counter, glassware, mixers, ice and three bartenders. Bring your own stock.',
        price: 28000, unit: 'event',
        tint: ['#1f2937', '#fde68a'],
        includes: ['Styled bar counter and back bar', 'Three trained bartenders, 6 hours', 'All mixers, ice, garnish and glassware', 'Stock counting at open and close', 'Age checks at the counter'],
      },
      {
        id: 'bar_flair',
        name: 'Flair bartending show',
        emoji: '🔥',
        blurb: 'A twenty-minute flair set at peak hour, then straight back to serving.',
        price: 18000, unit: 'event',
        tint: ['#7c2d12', '#fed7aa'],
        includes: ['Two flair bartenders', '20-minute show set', 'Regular service either side', 'Fire-safety clearance and cover'],
      },
    ],
  },

  live_counters: {
    blurb: 'A chef cooking in front of your guests. Priced per counter per guest, on top of the main menu.',
    unitHint: 'Each counter needs 6×3 ft, a power point and a gas connection.',
    packs: [
      {
        id: 'counter_chaat',
        name: 'Chaat counter',
        emoji: '🥘',
        blurb: 'Pani puri, sev puri, dahi puri and bhel, made to order for the whole evening.',
        price: 120, unit: 'guest',
        tint: ['#ea580c', '#ffedd5'],
        popular: true,
        includes: ['Live chaat counter with two chefs', '5 chaat varieties on rotation', 'Counter styling and signage', 'Unlimited for 3 hours'],
      },
      {
        id: 'counter_dosa',
        name: 'Live dosa / appam counter',
        emoji: '🥞',
        blurb: 'Plain, masala, set dosa or appam with stew, made in front of the queue.',
        price: 130, unit: 'guest',
        tint: ['#b45309', '#fef3c7'],
        includes: ['Two chefs with tawas', 'Four dosa varieties plus chutneys', 'Counter styling', 'Unlimited for 3 hours'],
      },
      {
        id: 'counter_grill',
        name: 'Live grill / tandoor counter',
        emoji: '🔥',
        blurb: 'Kebabs and tikka off a live tandoor — veg, non-veg or both.',
        price: 220, unit: 'guest',
        tint: ['#991b1b', '#fee2e2'],
        includes: ['Live tandoor with two chefs', '4 kebab varieties', 'Chutneys, salad and rumali roti', 'Unlimited for 3 hours'],
      },
      {
        id: 'counter_pasta_global',
        name: 'Pasta / global live counter',
        emoji: '🍝',
        blurb: 'Pasta, noodles or a sushi and dimsum counter, for a crowd that has seen the buffet before.',
        price: 190, unit: 'guest',
        tint: ['#166534', '#dcfce7'],
        includes: ['Live global counter with chef', 'Two sauces and full toppings bar', 'Counter styling and crockery', 'Unlimited for 3 hours'],
      },
    ],
  },

  ice_cream: {
    blurb: 'The dessert counter that runs after the meal, separate from the buffet queue.',
    unitHint: 'Priced per guest for a three-hour service.',
    packs: [
      {
        id: 'dessert_icecream',
        name: 'Live ice cream counter',
        emoji: '🍦',
        blurb: 'Scoops, cones and toppings, served by two attendants for three hours.',
        price: 90, unit: 'guest',
        tint: ['#f472b6', '#fce7f3'],
        popular: true,
        includes: ['6 flavours plus toppings', 'Cones, cups and sauces', 'Two attendants and a styled cart', 'Freezers and power arranged'],
      },
      {
        id: 'dessert_nitrogen',
        name: 'Liquid nitrogen ice cream',
        emoji: '❄️',
        blurb: 'Made in front of the guest in a cloud of vapour. Half dessert, half show.',
        price: 180, unit: 'guest',
        tint: ['#0ea5e9', '#e0f2fe'],
        includes: ['Live nitrogen preparation', '4 flavours made to order', 'Trained operator with safety cover', 'Counter styling and signage'],
      },
      {
        id: 'dessert_candy_cart',
        name: 'Candy floss, popcorn & candy cart',
        emoji: '🍭',
        blurb: 'A vintage cart with candy floss, popcorn and jars of sweets. Mostly for the adults, honestly.',
        price: 70, unit: 'guest',
        tint: ['#a855f7', '#f3e8ff'],
        includes: ['Vintage styled cart', 'Candy floss and popcorn made fresh', 'Jars of assorted sweets with scoops', 'Attendant for 3 hours'],
      },
      {
        id: 'dessert_paan',
        name: 'Paan, tea & filter coffee counter',
        emoji: '🍃',
        blurb: 'Meetha paan, masala chai and filter coffee — how a South Indian function actually ends.',
        price: 60, unit: 'guest',
        tint: ['#166534', '#dcfce7'],
        includes: ['Meetha, chocolate and fire paan', 'Filter coffee and masala chai', 'Styled counter with a paanwala', '3 hours of service'],
      },
    ],
  },

  /* ═══════════ Return gifts & gifting ═══════════ */
  return_gifts: {
    blurb: 'Packed, labelled and counted before the day, so nobody is short at the door.',
    unitHint: 'Priced per gift. We over-supply by 5% at no charge — you always run out otherwise.',
    packs: [
      {
        id: 'gift_budget',
        name: 'Everyday return gift',
        emoji: '🎁',
        blurb: 'A useful small item — steel tumbler, spice box, plant or a sweet box — wrapped and tagged.',
        price: 120, unit: 'guest',
        tint: ['#0891b2', '#cffafe'],
        popular: true,
        includes: ['Item of your choice from our list', 'Wrapping and a printed name tag', 'Packed in a carry bag', '5% extra supplied free'],
      },
      {
        id: 'gift_mid',
        name: 'Curated gift box',
        emoji: '📦',
        blurb: 'A small box with two or three items — dry fruit, a candle, a brass diya, a personal note.',
        price: 350, unit: 'guest',
        tint: ['#b45309', '#fef3c7'],
        includes: ['Curated 3-item box', 'Ribbon, tag and a printed note', 'Your monogram on the box', 'Assembled and counted before the day'],
      },
      {
        id: 'gift_premium',
        name: 'Premium hamper',
        emoji: '🎀',
        blurb: 'For close family and corporate guests — a real hamper, not a gift-shaped gesture.',
        price: 900, unit: 'guest',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['5–7 item premium hamper', 'Wooden or acrylic presentation box', 'Personalised card per recipient', 'Delivery to homes, if you prefer'],
      },
      {
        id: 'gift_kids',
        name: 'Kids’ party favours',
        emoji: '🧸',
        blurb: 'Themed to the party, age-appropriate, and without the plastic tat that lasts an hour.',
        price: 200, unit: 'guest',
        tint: ['#f472b6', '#fce7f3'],
        includes: ['Themed favour bag per child', '4–5 age-appropriate items', 'Name tags for each child', 'Separate adult favours, if you want them'],
      },
    ],
  },

  gifting: {
    blurb: 'Hampers for the people you cannot send home with a tumbler.',
    // Per hamper, not per guest — deliberately. A ₹3,000 hamper goes to twenty
    // or thirty people, never to all four hundred, and pricing it per guest
    // quotes a six-lakh gifting budget to somebody who wanted to thank their
    // in-laws. Return gifts are the per-guest service; this is not.
    unitHint: 'Priced per hamper, for the handful of people who get one. Delivery to individual addresses is available.',
    packs: [
      {
        id: 'hamper_festive',
        name: 'Festive hamper',
        emoji: '🪔',
        blurb: 'Dry fruits, sweets, a diya and a candle — the Diwali and wedding standard.',
        price: 850, unit: 'unit', unitLabel: 'hamper', defaultQty: 25,
        tint: ['#f59e0b', '#fef3c7'],
        popular: true,
        includes: ['6-item festive hamper', 'Presentation box with ribbon', 'Personalised card', 'Bulk delivery included'],
      },
      {
        id: 'hamper_corporate',
        name: 'Corporate gifting',
        emoji: '💼',
        blurb: 'Branded, GST-invoiced, delivered to office or home addresses with a tracking sheet.',
        price: 1200, unit: 'unit', unitLabel: 'hamper', defaultQty: 25,
        tint: ['#1e3a8a', '#dbeafe'],
        includes: ['Branded hamper with your logo', 'GST invoice and delivery sheet', 'Address-wise dispatch', 'Custom note per recipient'],
      },
      {
        id: 'hamper_luxury',
        name: 'Luxury / trousseau hamper',
        emoji: '👑',
        blurb: 'Silver, silk, dry fruit and imported chocolate, presented in a lined wooden box.',
        price: 3000, unit: 'unit', unitLabel: 'hamper', defaultQty: 10,
        tint: ['#7c2d12', '#fde68a'],
        includes: ['Premium curated selection', 'Lined wooden presentation box', 'Hand-written card', 'Individual delivery'],
      },
    ],
  },

  /* ═══════════ Invitations & signage ═══════════ */
  invitations: {
    blurb: 'The first thing anyone sees. Digital, printed, or both, designed rather than picked off a template site.',
    unitHint: 'Two rounds of changes included; printing is priced per card.',
    packs: [
      {
        id: 'invite_digital',
        name: 'Digital invite (image + video)',
        emoji: '📱',
        blurb: 'A designed e-card and a 30-second animated version for WhatsApp.',
        price: 6500, unit: 'event',
        tint: ['#0ea5e9', '#e0f2fe'],
        popular: true,
        includes: ['Custom designed e-invite', '30-second animated video version', 'Separate cards per function', 'RSVP link with a live guest list', 'Two rounds of changes'],
      },
      {
        id: 'invite_printed',
        name: 'Printed cards',
        emoji: '💌',
        blurb: 'Designed, proofed and printed — per card, with envelopes and inserts.',
        price: 85, unit: 'guest',
        tint: ['#be123c', '#ffe4e6'],
        includes: ['Custom design with two revisions', 'Printing on premium stock', 'Envelopes, inserts and function cards', 'Physical proof before the run', 'Delivered addressed, if you supply the list'],
      },
      {
        id: 'invite_luxury',
        name: 'Box invite / premium set',
        emoji: '🎁',
        blurb: 'A box invitation with sweets, a card set and the family names foiled on the lid.',
        price: 650, unit: 'guest',
        tint: ['#7c2d12', '#fde68a'],
        includes: ['Designed box with foil work', 'Card set for every function', 'Sweet or dry-fruit compartment', 'Hand-delivery to key guests', 'Sample approved before the run'],
      },
      {
        id: 'invite_stationery',
        name: 'On-day stationery set',
        emoji: '🗂️',
        blurb: 'Menu cards, table numbers, place cards and thank-you notes, matching the invite.',
        price: 45, unit: 'guest',
        tint: ['#a16207', '#fef3c7'],
        includes: ['Menu and table cards', 'Place cards with guest names', 'Thank-you notes', 'Designed to match your invite'],
      },
    ],
  },

  signage: {
    blurb: 'Wayfinding, welcome boards and seating charts — the reason nobody has to ask where anything is.',
    unitHint: 'Printed to your invite design, mounted and placed by our crew.',
    packs: [
      {
        id: 'sign_welcome',
        name: 'Welcome board & directions',
        emoji: '🪧',
        blurb: 'A welcome board at the gate and directional signs from the road to the hall.',
        price: 6500, unit: 'event',
        tint: ['#0f766e', '#ccfbf1'],
        popular: true,
        includes: ['Large welcome board with names', 'Six directional signs with stands', 'Printed to your invite design', 'Placement and collection'],
      },
      {
        id: 'sign_seating',
        name: 'Seating chart & table numbers',
        emoji: '🗺️',
        blurb: 'An alphabetical seating chart and numbered tables, so the meal starts on time.',
        price: 9500, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['Large alphabetical seating chart', 'Table numbers for every table', 'Place cards, if you want them', 'Two rounds of list changes', 'Ushers briefed on the layout'],
      },
    ],
  },

  /* ═══════════ Cleanup & waste ═══════════ */
  cleanup: {
    blurb: 'The crew that arrives when everyone leaves. Priced by venue size, not by argument at midnight.',
    unitHint: 'Includes waste removal to a municipal point; deep-clean packs include the kitchen.',
    packs: [
      {
        id: 'clean_basic',
        name: 'Post-event clearing',
        emoji: '🧹',
        blurb: 'Sweep, mop, clear the waste and hand the venue back the way you took it.',
        price: 5500, unit: 'event',
        tint: ['#0891b2', '#cffafe'],
        popular: true,
        includes: ['4-person crew', 'Full sweep, mop and bin clearance', 'Waste removed off site', 'Furniture reset', 'Photographs of the handed-back venue'],
      },
      {
        id: 'clean_deep',
        name: 'Deep clean incl. kitchen',
        emoji: '🧽',
        blurb: 'For home functions — the kitchen, the bathrooms and the floors, done properly.',
        price: 12000, unit: 'event',
        tint: ['#7c3aed', '#ede9fe'],
        includes: ['6-person crew, full deep clean', 'Kitchen degreasing and utensil clearing', 'Bathrooms and floors', 'Waste segregation and removal', 'Next-morning slot available'],
      },
      {
        id: 'clean_green',
        name: 'Zero-waste / green cleanup',
        emoji: '♻️',
        blurb: 'Segregated at source, composted where possible, with a report of what went where.',
        price: 18000, unit: 'event',
        tint: ['#15803d', '#dcfce7'],
        includes: ['Segregation bins during the event', 'Trained waste marshals', 'Wet waste to composting', 'Dry waste to a recycler', 'Written disposal report'],
      },
    ],
  },

  /* ═══════════ AV ═══════════ */
  av_setup: {
    blurb: 'Screens, projectors and microphones that work when the speech starts. Tested the day before.',
    unitHint: 'Includes a technician on site for the duration.',
    packs: [
      {
        id: 'av_basic',
        name: 'Projector & screen',
        emoji: '📽️',
        blurb: 'A bright projector, a proper screen, and two mics for the speeches.',
        price: 9500, unit: 'event',
        tint: ['#334155', '#e2e8f0'],
        includes: ['5000-lumen projector and screen', 'Two wireless mics with a small PA', 'Laptop connection tested', 'Technician on site'],
      },
      {
        id: 'av_conference',
        name: 'Conference AV package',
        emoji: '🖥️',
        blurb: 'LED screen, podium mic, lapel mics, a mixer and someone running it all day.',
        price: 28000, unit: 'event',
        tint: ['#1e3a8a', '#dbeafe'],
        popular: true,
        includes: ['LED screen or large projection', 'Podium, lapel and handheld mics', 'Audio mixer and technician for the day', 'Presentation loading and cueing', 'Backup laptop and clicker'],
      },
      {
        id: 'av_hybrid',
        name: 'Hybrid event AV + stream',
        emoji: '🌐',
        blurb: 'In-room AV plus a stream for people who could not travel, run by the same crew.',
        price: 55000, unit: 'event',
        tint: ['#0f172a', '#c7d2fe'],
        includes: ['Full in-room AV package', 'Multi-camera stream with a switcher', 'Remote-speaker dial-in', 'Recording archived and handed over', 'Two technicians for the day'],
      },
    ],
  },

  /* ═══════════ Fireworks ═══════════ */
  fireworks: {
    blurb: 'Licensed, permitted and operated by a crew that does this for a living.',
    unitHint: 'Local permissions and noise windows are checked before we confirm a date.',
    packs: [
      {
        id: 'fire_cold_pyro',
        name: 'Indoor cold pyro & sparklers',
        emoji: '✨',
        blurb: 'Safe indoors, no smoke — for the entry, the varmala or the cake cutting.',
        price: 15000, unit: 'event',
        tint: ['#f59e0b', '#fef3c7'],
        popular: true,
        includes: ['Up to 8 cold pyro fountains', 'Handheld sparklers for the family', 'Licensed operator and fire cover', 'Cue rehearsal with your photographer'],
      },
      {
        id: 'fire_outdoor',
        name: 'Outdoor fireworks display',
        emoji: '🎆',
        blurb: 'A choreographed 5-minute display, with the permissions handled.',
        price: 45000, unit: 'event',
        tint: ['#0f172a', '#fbbf24'],
        includes: ['5-minute choreographed display', 'Licensed pyrotechnician and crew', 'Local permission coordination', 'Fire safety cover on site', 'Noise-window compliance'],
      },
      {
        id: 'fire_lantern',
        name: 'Sky lantern release',
        emoji: '🏮',
        blurb: 'A hundred lanterns released together — quiet, and better on camera than fireworks.',
        price: 18000, unit: 'event',
        tint: ['#b45309', '#fde68a'],
        includes: ['100 biodegradable lanterns', 'Marshals for the release', 'Wind and clearance check', 'Collection sweep afterwards'],
      },
    ],
  },
}

/**
 * Every pack, flattened, so a search can reach one without knowing its service.
 */
export const ALL_PACKS = Object.entries(SERVICE_PACKS).flatMap(([serviceId, shelf]) =>
  shelf.packs.map(p => ({ ...p, serviceId }))
)

export const PACK_BY_ID = Object.fromEntries(ALL_PACKS.map(p => [p.id, p]))

/** How many of this pack an event of this size needs, before the customer changes it. */
export function defaultPackQty(pack, guestCount) {
  if (!pack) return 1
  if (pack.unit !== 'unit') return 1
  if (typeof pack.qtyFor === 'function') return pack.qtyFor(guestCount)
  return pack.defaultQty ?? 1
}

/**
 * What one pack costs, at this headcount and quantity.
 *
 * Rounded to ₹10 for the same reason servicePricing.js rounds: a total ending
 * in 7 claims a precision this data does not have, and reads as machine output
 * rather than as a price somebody stands behind.
 */
export function packCost(pack, guestCount, qty) {
  if (!pack) return 0
  if (pack.unit === 'guest') return round10(pack.price * (Number(guestCount) || 0))
  if (pack.unit === 'unit') return round10(pack.price * (qty ?? defaultPackQty(pack, guestCount)))
  return round10(pack.price)
}

/** "per guest" / "per guard" / "for the event" — the rate, never the total. */
export function packUnitLabel(pack) {
  if (pack?.unit === 'guest') return 'per guest'
  if (pack?.unit === 'unit') return `per ${pack.unitLabel ?? 'unit'}`
  return 'for the event'
}

/**
 * The cheapest way into this service — the "from" figure on its shelf card.
 *
 * Returns the cheapest pack's own RATE with the unit it is charged in, not the
 * total that rate produces at some assumed headcount. Returning the total read
 * "Return gifts — from ₹12,000", which is ₹120 a head times an invented 100
 * guests: a number nobody was quoted, attached to the cheapest thing on the
 * page, and the single most alarming way to open a card about ₹120 gift bags.
 *
 * Which pack is cheapest is still decided on the total at a reference size,
 * because that is the honest comparison between a per-head pack and a flat one.
 * Only the way it is *displayed* changes.
 */
export function packsFrom(serviceId, guestCount = 100) {
  const shelf = SERVICE_PACKS[serviceId]
  if (!shelf?.packs?.length) return null

  const cheapest = shelf.packs.reduce((best, p) => {
    const total = packCost(p, guestCount, defaultPackQty(p, guestCount))
    return !best || total < best.total ? { pack: p, total } : best
  }, null)

  const { pack } = cheapest
  return {
    amount: pack.price,
    unit: pack.unit === 'guest' ? 'per guest'
      : pack.unit === 'unit' ? `per ${pack.unitLabel ?? 'unit'}`
      : null,
  }
}
