// Every cuisine we can put on a table, and every dish under it.
//
// ── The problem this solves ─────────────────────────────────────────────
// "Catering — ₹250 to ₹800/plate" is not a menu, it is a shrug. A family
// deciding between Sambramo and the caterer their neighbour used is deciding
// on the food, and the food was the one thing this app would not show them.
// Worse, a bare cuisine dropdown ("South Indian / North Indian / Chinese")
// invites the question it cannot answer — *which* South Indian, and is the
// bisi bele bath in it or not.
//
// So picking a cuisine opens the whole spread: every course, every dish under
// it, and a tick against the ones going on your table. Nothing is hidden
// behind a coordinator call, and nothing has to be guessed at.
//
// ── Ordering carries the recommendation ─────────────────────────────────
// Items in each course are ordered most-recommended first, and the builder
// pre-ticks the first N — where N is the tier's allowance for that course.
// This is deliberate and it replaces a per-dish "chef's pick" flag: a set of
// four recommended starters is right for The Full Celebration and wrong for
// Close Circle, so the recommendation has to come from the tier, not the dish.
//
// The customer lands on a complete, sensible menu they can serve as-is, and
// every swap is one tap. Nobody is ever looking at an empty menu wondering
// what a Mysuru wedding is supposed to have on it.
//
// ── Prices ──────────────────────────────────────────────────────────────
// `basePlate` is the per-head cost of a standard spread in this cuisine at
// mid-size volume (150–350 guests). Every other size is derived from it by
// the batch curve in celebrationTiers.js — small batches cost more per head,
// large ones less — so a rate never has to be restated per tier.
//
// `delta` on a dish is what THAT dish adds per plate on top of the base. Most
// are zero: a menu is priced as a spread, not as a shopping list, and charging
// four rupees for a different palya is the kind of arithmetic that makes a
// quote feel like a haggle. The deltas that exist are real cost — paneer,
// mutton, prawns, dry fruit, saffron, anything with a live chef behind it.
//
// These are researched Bengaluru/Mysore market estimates for a pre-launch
// catalogue with no signed caterer behind it yet. They are labelled as
// estimates everywhere they surface and must be re-checked against real
// vendor rate cards before anybody is held to one.

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** A vegetarian dish. `delta` is the per-plate premium over the base spread. */
const v = (name, delta = 0, note) => ({ id: slug(name), name, veg: true, delta, note })
/** A non-vegetarian dish. Filtered out entirely when the order is marked veg. */
const n = (name, delta = 0, note) => ({ id: slug(name), name, veg: false, delta, note })

// The seven courses every cuisine is described in. Keeping the ids identical
// across cuisines is what lets a tier state its allowance once
// (`menuAllowance.starters = 4`) instead of once per cuisine, and lets the
// customer switch cuisine without losing their place in the form.
export const COURSES = [
  { id: 'welcome',        label: 'Welcome drinks',    hint: 'Served as guests arrive' },
  { id: 'starters',       label: 'Starters',          hint: 'Passed around or on a counter' },
  { id: 'mains',          label: 'Rice & breads',     hint: 'The base of the meal' },
  { id: 'curries',        label: 'Curries & gravies', hint: 'What goes with the rice and rotis' },
  { id: 'accompaniments', label: 'Accompaniments',    hint: 'Palya, salads, papad, pickle, curd' },
  { id: 'sweets',         label: 'Sweets & desserts', hint: 'Served with the meal or after' },
  { id: 'counters',       label: 'Live counters',     hint: 'A chef cooking in front of your guests' },
]

export const COURSE_BY_ID = Object.fromEntries(COURSES.map(c => [c.id, c]))

export const CUISINES = [
  // ── South ────────────────────────────────────────────────────────────
  {
    id: 'karnataka',
    name: 'Karnataka Traditional',
    localName: 'Uta',
    emoji: '🍛',
    region: 'South Indian',
    blurb: 'The Mysuru–Bengaluru home spread. Bisi bele bath, holige, and a proper leaf meal.',
    basePlate: 420,
    hasNonVeg: false,
    courses: {
      welcome: [
        v('Panaka (jaggery & lemon)'), v('Majjige / spiced buttermilk'), v('Tender coconut water'),
        v('Nimbe pani (fresh lime)'), v('Badam milk'), v('Filter coffee & tea'),
      ],
      starters: [
        v('Mysore bonda'), v('Goli baje / Mangaluru bajji'), v('Medu vada'), v('Masala vada'),
        v('Aloo bonda'), v('Nippattu & kodubale'), v('Sabudana vada'), v('Cut mirchi bajji'),
        v('Paneer 65'), v('Gobi Manchurian'),
      ],
      mains: [
        v('Bisi bele bath'), v('Vangi bath'), v('Puliyogare'), v('Chitranna (lemon rice)'),
        v('Ghee rice'), v('Coconut rice'), v('Steamed rice & saaru'), v('Curd rice'),
        v('Chapati'), v('Poori'), v('Akki roti'), v('Ragi mudde'), v('Jolada rotti'),
      ],
      curries: [
        v('Saaru / rasam'), v('Huli (sambar)'), v('Majjige huli'), v('Gojju (mango or tomato)'),
        v('Kootu'), v('Bassaru'), v('Menthya soppu palya gojju'), v('Paneer butter masala'),
        v('Mixed vegetable kurma'),
      ],
      accompaniments: [
        v('Beans palya'), v('Cabbage palya'), v('Gasagase / carrot kosambari'), v('Hesarubele kosambari'),
        v('Sandige & happala'), v('Uppinakayi (pickle)'), v('Mosaru (curd)'), v('Tuppa (ghee)'),
        v('Raita'), v('Green salad'), v('Nimbe uppinakayi'),
      ],
      sweets: [
        v('Obbattu / holige'), v('Mysore pak'), v('Kesari bath'), v('Payasa (semiya or shavige)'),
        v('Rava laddu'), v('Chiroti with badami haalu'), v('Dharwad peda'),
        v('Carrot halwa'), v('Jamoon'),
      ],
      counters: [
        v('Live dosa counter', 65), v('Chaat counter', 55), v('Live obbattu counter', 70),
        v('Ice cream counter', 50), v('Filter coffee counter', 30), v('Pani puri counter', 40),
      ],
    },
  },
  {
    id: 'udupi',
    name: 'Udupi & Coastal',
    localName: 'Udupi Uta',
    emoji: '🥥',
    region: 'South Indian',
    blurb: 'Temple-town vegetarian, plus Mangaluru coastal seafood if you want it.',
    basePlate: 450,
    hasNonVeg: true,
    nonVegPlate: 720,
    courses: {
      welcome: [
        v('Tender coconut water'), v('Solkadhi'), v('Kokum sherbet'), v('Buttermilk'),
        v('Fresh lime soda'), v('Filter coffee & tea'),
      ],
      starters: [
        v('Goli baje'), v('Neer dosa bites'), v('Banana bajji'), v('Sukhiyan'), v('Golibaje with chutney'),
        v('Kotte kadubu'), n('Anjal tawa fry', 50), n('Prawns koliwada', 90), n('Chicken sukka'),
        n('Bangude fry (mackerel)', 50), n('Squid rava fry', 50),
      ],
      mains: [
        v('Neer dosa'), v('Kori rotti (veg)'), v('Boiled rice'), v('Ghee rice'), v('Pundi (rice dumplings)'),
        v('Kadubu'), v('Poori'), v('Chapati'), v('Vegetable pulao'), n('Fish biryani', 50),
        n('Chicken ghee rice'),
      ],
      curries: [
        v('Sambar'), v('Rasam'), v('Coconut kurma'), v('Menaskai'), v('Sanna polygo'),
        v('Dalitoy'), v('Bendi gojju'), n('Meen gassi (fish curry)', 50), n('Chicken gassi'),
        n('Prawn ghee roast', 90), n('Crab masala', 90),
      ],
      accompaniments: [
        v('Ash gourd palya'), v('Beans upkari'), v('Sandige'), v('Appe midi pickle'), v('Curd'),
        v('Coconut chutney'), v('Green salad'), v('Papad'),
      ],
      sweets: [
        v('Rava kesari'), v('Shavige payasa'), v('Halasina hannina kadubu'), v('Patholi'),
        v('Gulab jamun'), v('Mysore pak'), v('Fruit salad with ice cream'),
      ],
      counters: [
        v('Live neer dosa counter', 60), v('Live appam counter', 65), n('Fish fry counter', 120),
        v('Ice cream counter', 50), v('Chaat counter', 55),
      ],
    },
  },
  {
    id: 'tamil',
    name: 'Tamil & Chettinad',
    localName: 'Virundhu',
    emoji: '🍌',
    region: 'South Indian',
    blurb: 'Banana-leaf virundhu, and Chettinad spice when you want the heat.',
    basePlate: 460,
    hasNonVeg: true,
    nonVegPlate: 750,
    courses: {
      welcome: [
        v('Paanagam'), v('Neer mor (spiced buttermilk)'), v('Nannari sherbet'), v('Tender coconut'),
        v('Rose milk'), v('Filter coffee & tea'),
      ],
      starters: [
        v('Medu vada'), v('Masala vadai'), v('Bonda'), v('Molaga bajji'), v('Paruppu vadai'),
        v('Mushroom pepper fry'), n('Chettinad chicken 65'), n('Mutton chukka', 80),
        n('Meen varuval', 50), n('Nethili fry', 50),
      ],
      mains: [
        v('Sambar sadam'), v('Puliyodarai'), v('Coconut rice'), v('Lemon rice'), v('Curd rice'),
        v('Ven pongal'), v('Steamed rice'), v('Idiyappam'), v('Appam'), v('Parotta'), v('Chapati'),
        n('Chettinad chicken biryani'), n('Mutton biryani', 80),
      ],
      curries: [
        v('Sambar'), v('Rasam'), v('Mor kuzhambu'), v('Vatha kuzhambu'), v('Kara kuzhambu'),
        v('Kootu'), v('Aviyal'), v('Paneer butter masala'), n('Chettinad chicken curry'),
        n('Mutton kuzhambu', 80), n('Meen kuzhambu', 50),
      ],
      accompaniments: [
        v('Beans poriyal'), v('Cabbage kootu'), v('Keerai masiyal'), v('Appalam'), v('Pickle'),
        v('Thayir (curd)'), v('Onion raita'), v('Salad'), v('Ghee'),
      ],
      sweets: [
        v('Semiya payasam'), v('Paruppu payasam'), v('Ashoka halwa'), v('Mysore pak'),
        v('Jangiri'), v('Adhirasam'), v('Badam halwa', 30), v('Gulab jamun'),
      ],
      counters: [
        v('Live dosa counter', 65), v('Live parotta counter', 60), v('Chaat counter', 55),
        n('Live grill counter', 120), v('Ice cream counter', 50),
      ],
    },
  },
  {
    id: 'andhra',
    name: 'Andhra & Telangana',
    localName: 'Bhojanam',
    emoji: '🌶️',
    region: 'South Indian',
    blurb: 'Big flavours, pickles that mean it, and Hyderabadi biryani done properly.',
    basePlate: 470,
    hasNonVeg: true,
    nonVegPlate: 780,
    courses: {
      welcome: [
        v('Ragi java'), v('Majjiga'), v('Sugarcane juice'), v('Nimmakaya sherbet'),
        v('Rose milk'), v('Irani chai & coffee'),
      ],
      starters: [
        v('Punugulu'), v('Mirchi bajji'), v('Garelu'), v('Aloo 65'), v('Paneer 65'),
        v('Gobi 65'), n('Chicken 65'), n('Kodi vepudu'), n('Chepala vepudu', 50),
        n('Mutton pepper fry', 80), n('Apollo fish', 50),
      ],
      mains: [
        v('Pulihora'), v('Bagara rice'), v('Veg dum biryani'), v('Steamed rice'), v('Jeera rice'),
        v('Pesarattu'), v('Chapati'), v('Poori'), v('Roti'), n('Hyderabadi chicken dum biryani'),
        n('Mutton dum biryani', 80),
      ],
      curries: [
        v('Sambar'), v('Charu / rasam'), v('Pappu (dal)'), v('Gutti vankaya kura'),
        v('Bendakaya fry'), v('Majjiga pulusu'), v('Paneer butter masala'),
        n('Kodi kura (chicken curry)'), n('Natu kodi pulusu'), n('Mutton curry', 80),
      ],
      accompaniments: [
        v('Avakaya pickle'), v('Gongura pachadi'), v('Tomato pachadi'), v('Beerakaya palya'),
        v('Appadam'), v('Perugu (curd)'), v('Mirchi ka salan'), v('Onion raita'), v('Salad'),
      ],
      sweets: [
        v('Double ka meetha'), v('Qubani ka meetha', 30), v('Bobbatlu'), v('Semiya payasam'),
        v('Ariselu'), v('Gulab jamun'), v('Rava kesari'), v('Kaju katli', 30),
      ],
      counters: [
        v('Live dosa counter', 65), v('Chaat counter', 55), n('Live biryani counter', 120),
        v('Ice cream counter', 50), v('Irani chai counter', 30),
      ],
    },
  },
  {
    id: 'kerala',
    name: 'Kerala Sadya & Malabar',
    localName: 'Sadya',
    emoji: '🍃',
    region: 'South Indian',
    blurb: 'The full sadya on a leaf, or Malabar biryani and coastal curries.',
    basePlate: 490,
    hasNonVeg: true,
    nonVegPlate: 790,
    courses: {
      welcome: [
        v('Sambharam (spiced buttermilk)'), v('Tender coconut'), v('Nannari sherbet'),
        v('Sulaimani chai'), v('Fresh lime'), v('Filter coffee & tea'),
      ],
      starters: [
        v('Parippu vada'), v('Uzhunnu vada'), v('Pazham pori'), v('Ethakka chips'),
        v('Kappa bites'), n('Kerala chicken fry'), n('Meen pollichathu', 50),
        n('Beef ularthiyathu'), n('Prawns roast', 90), n('Chicken cutlet'),
      ],
      mains: [
        v('Kuthari choru (red rice)'), v('Ghee rice'), v('Appam'), v('Idiyappam'), v('Puttu'),
        v('Malabar parotta'), v('Vegetable stew rice'), v('Chapati'), n('Malabar chicken biryani', 120),
        n('Thalassery mutton biryani', 80), n('Fish biryani', 50),
      ],
      curries: [
        v('Sambar'), v('Parippu curry'), v('Rasam'), v('Vegetable stew'), v('Kalan'),
        v('Olan'), v('Erissery'), n('Nadan kozhi curry'), n('Meen mulakittathu', 50),
        n('Beef curry'), n('Prawn moilee', 90),
      ],
      accompaniments: [
        v('Avial'), v('Thoran (cabbage or beans)'), v('Pachadi'), v('Kichadi'), v('Inji puli'),
        v('Naranga achar'), v('Sharkara varatti'), v('Kaya varuthathu'), v('Pappadam'), v('Curd'),
      ],
      sweets: [
        v('Ada pradhaman'), v('Palada payasam'), v('Semiya payasam'), v('Parippu payasam'),
        v('Unniyappam'), v('Elaneer pudding', 30), v('Gulab jamun'),
      ],
      counters: [
        v('Live appam counter', 65), v('Live puttu counter', 55), n('Fish grill counter', 120),
        v('Ice cream counter', 50), v('Sulaimani chai counter', 30),
      ],
    },
  },

  // ── North & West ─────────────────────────────────────────────────────
  {
    id: 'north_indian',
    name: 'North Indian',
    localName: 'Punjabi',
    emoji: '🫓',
    region: 'North Indian',
    blurb: 'Tandoor, thick gravies and hot rotis — the buffet everybody recognises.',
    basePlate: 520,
    hasNonVeg: true,
    nonVegPlate: 820,
    courses: {
      welcome: [
        v('Aam panna'), v('Jal jeera'), v('Masala chaas'), v('Lassi (sweet or salted)'),
        v('Thandai'), v('Fresh lime soda'), v('Masala chai & coffee'),
      ],
      starters: [
        v('Paneer tikka'), v('Hara bhara kabab'), v('Aloo tikki'), v('Dahi ke kabab'),
        v('Mushroom tikka'), v('Veg seekh kabab'), v('Malai broccoli'), v('Corn cheese balls'),
        n('Chicken tikka'), n('Murgh malai tikka'), n('Mutton seekh kabab', 80),
        n('Tandoori chicken'), n('Fish amritsari', 50),
      ],
      mains: [
        v('Jeera rice'), v('Veg pulao'), v('Steamed basmati'), v('Kashmiri pulao'),
        v('Tandoori roti'), v('Butter naan'), v('Laccha paratha'), v('Missi roti'), v('Poori'),
        v('Veg biryani'), n('Chicken biryani'), n('Mutton biryani', 80),
      ],
      curries: [
        v('Dal makhani'), v('Dal tadka'), v('Paneer butter masala'), v('Kadai paneer'),
        v('Shahi paneer'), v('Palak paneer'), v('Malai kofta'), v('Chana masala'),
        v('Aloo gobi'), v('Mix veg jalfrezi'), v('Bhindi masala'),
        n('Butter chicken'), n('Kadai chicken'), n('Rogan josh', 80), n('Mutton korma', 80),
      ],
      accompaniments: [
        v('Boondi raita'), v('Mixed veg raita'), v('Green salad'), v('Onion lachha'),
        v('Papad (roasted or fried)'), v('Mixed pickle'), v('Mint chutney'), v('Masala papad'),
      ],
      sweets: [
        v('Gulab jamun'), v('Rasmalai'), v('Gajar ka halwa'), v('Moong dal halwa'),
        v('Jalebi with rabri'), v('Kheer'), v('Kaju katli', 30), v('Shahi tukda'),
        v('Ice cream (three flavours)'),
      ],
      counters: [
        v('Live chaat counter', 55), v('Live tandoor counter', 85), v('Live jalebi counter', 45),
        v('Pasta counter', 70), v('Ice cream counter', 50), v('Mocktail bar', 65),
      ],
    },
  },
  {
    id: 'mughlai',
    name: 'Mughlai & Awadhi',
    localName: 'Dawat',
    emoji: '🍢',
    region: 'North Indian',
    blurb: 'Slow-cooked kormas, dum biryani and kababs off the sheekh. Built for a reception.',
    basePlate: 640,
    hasNonVeg: true,
    nonVegPlate: 980,
    courses: {
      welcome: [
        v('Shahi thandai'), v('Rooh afza sharbat'), v('Sulaimani chai'), v('Kesar badam milk'),
        v('Fresh lime soda'), v('Masala chai & coffee'),
      ],
      starters: [
        v('Paneer shashlik'), v('Dahi ke kabab'), v('Veg galouti'), v('Subz seekh'),
        n('Galouti kabab', 80), n('Murgh boti kabab'), n('Kakori kabab', 80),
        n('Shami kabab', 80), n('Tandoori jhinga', 90), n('Chicken malai tikka'),
      ],
      mains: [
        v('Subz dum biryani'), v('Zafrani pulao'), v('Sheermal'), v('Roomali roti'),
        v('Warqi paratha'), v('Taftan'), n('Murgh dum biryani'),
        n('Gosht dum biryani', 80), n('Nalli nihari', 80),
      ],
      curries: [
        v('Paneer pasanda'), v('Subz navratan korma'), v('Dal e sultani'),
        v('Methi malai matar'), n('Murgh korma'), n('Chicken changezi'),
        n('Mutton rogan josh', 80), n('Gosht do pyaza', 80), n('Nihari', 80),
      ],
      accompaniments: [
        v('Burhani raita'), v('Mirchi ka salan'), v('Laccha onion'), v('Pudina chutney'),
        v('Kachumber salad'), v('Papad'), v('Mixed achar'),
      ],
      sweets: [
        v('Shahi tukda'), v('Phirni'), v('Qubani ka meetha', 30), v('Double ka meetha'),
        v('Kesar rasmalai'), v('Kulfi falooda'), v('Gulab jamun'),
      ],
      counters: [
        n('Live sheekh kabab counter', 120), v('Live tandoor counter', 85), v('Live phirni counter', 55),
        v('Mocktail bar', 65), v('Ice cream & kulfi counter', 55),
      ],
    },
  },
  {
    id: 'bengali',
    name: 'Bengali',
    localName: 'Bhoj',
    emoji: '🐟',
    region: 'East Indian',
    blurb: 'Luchi, kosha mangsho and the sweets nobody else can do.',
    basePlate: 560,
    hasNonVeg: true,
    nonVegPlate: 860,
    courses: {
      welcome: [
        v('Aam pora sherbet'), v('Gondhoraj lemonade'), v('Ghol (buttermilk)'),
        v('Daab water'), v('Cha (Bengali tea)'),
      ],
      starters: [
        v('Beguni'), v('Aloo chop'), v('Mochar chop'), v('Phulkopir singara'), v('Dhokar dalna bites'),
        n('Fish fry (bhetki)', 50), n('Chingri cutlet', 90), n('Chicken kabiraji'),
      ],
      mains: [
        v('Luchi'), v('Basanti pulao'), v('Ghee bhaat'), v('Steamed rice'), v('Radhaballabhi'),
        v('Khichuri'), n('Chingri pulao', 90),
      ],
      curries: [
        v('Cholar dal'), v('Shukto'), v('Dhokar dalna'), v('Aloo posto'), v('Chanar dalna'),
        v('Mochar ghonto'), n('Macher jhol', 50), n('Doi maach', 50), n('Kosha mangsho', 80),
        n('Chingri malai curry', 90), n('Murgir jhol'),
      ],
      accompaniments: [
        v('Begun bhaja'), v('Aloo bhaja'), v('Kumro chhenchki'), v('Tomato khejur chutney'),
        v('Papad'), v('Nolen gur salad'), v('Curd'),
      ],
      sweets: [
        v('Rosogolla'), v('Mishti doi'), v('Sandesh'), v('Nolen gur payesh'),
        v('Chomchom'), v('Langcha'), v('Kheer kadam'),
      ],
      counters: [
        v('Live luchi counter', 55), v('Puchka (pani puri) counter', 45),
        v('Live rosogolla counter', 60), v('Ice cream counter', 50),
      ],
    },
  },
  {
    id: 'gujarati_rajasthani',
    name: 'Gujarati & Rajasthani',
    localName: 'Thali',
    emoji: '🥘',
    region: 'West Indian',
    blurb: 'A full thali — farsan, sweet-and-savoury dals, dal baati and churma.',
    basePlate: 480,
    hasNonVeg: false,
    courses: {
      welcome: [
        v('Chaas (masala buttermilk)'), v('Aam ras drink'), v('Jal jeera'), v('Kesar lassi'),
        v('Fresh lime'), v('Masala chai'),
      ],
      starters: [
        v('Khaman dhokla'), v('Khandvi'), v('Patra'), v('Fafda with jalebi'), v('Methi gota'),
        v('Sev khamani'), v('Mirchi vada'), v('Pyaaz kachori'), v('Dal kachori'), v('Handvo'),
      ],
      mains: [
        v('Bajra rotla'), v('Puran poli'), v('Thepla'), v('Bhakri'), v('Jeera rice'),
        v('Khichdi with kadhi'), v('Dal baati'), v('Poori'), v('Missi roti'),
      ],
      curries: [
        v('Gujarati dal'), v('Kadhi'), v('Undhiyu'), v('Sev tameta nu shaak'),
        v('Bhindi sambhariya'), v('Gatte ki sabzi'), v('Ker sangri'),
        v('Panchmel dal'), v('Paneer tikka masala'),
      ],
      accompaniments: [
        v('Chundo (sweet mango pickle)'), v('Athanu'), v('Kachumber'), v('Papad'), v('Chaas'),
        v('Garlic chutney'), v('Sev'), v('Farsi puri'),
      ],
      sweets: [
        v('Mohanthal'), v('Basundi'), v('Shrikhand'), v('Churma laddu'),
        v('Ghevar', 30), v('Malpua with rabri'), v('Jalebi'), v('Doodh pak'),
      ],
      counters: [
        v('Live fafda-jalebi counter', 50), v('Chaat counter', 55), v('Live dhokla counter', 45),
        v('Ice cream counter', 50), v('Kulfi counter', 45),
      ],
    },
  },
  {
    id: 'maharashtrian',
    name: 'Maharashtrian',
    localName: 'Jevan',
    emoji: '🍲',
    region: 'West Indian',
    blurb: 'Puran poli, misal and a coastal Malvani side if you want it.',
    basePlate: 470,
    hasNonVeg: true,
    nonVegPlate: 760,
    courses: {
      welcome: [
        v('Kokum sherbet'), v('Piyush'), v('Sol kadhi'), v('Taak (buttermilk)'),
        v('Fresh lime'), v('Amruttulya chai'),
      ],
      starters: [
        v('Batata vada'), v('Kanda bhaji'), v('Sabudana vada'), v('Thalipeeth'), v('Alu vadi'),
        v('Misal pav'), n('Malvani chicken sukka'), n('Bombil fry', 50), n('Kolambi fry', 90),
      ],
      mains: [
        v('Puran poli'), v('Masale bhat'), v('Varan bhaat'), v('Bhakri (jowar or bajra)'),
        v('Poori'), v('Chapati'), v('Steamed rice'), n('Malvani chicken rassa rice'),
        n('Mutton kolhapuri rice', 80),
      ],
      curries: [
        v('Amti'), v('Katachi amti'), v('Bharli vangi'), v('Matki usal'),
        v('Batata bhaji'), v('Kadhi'), n('Chicken kolhapuri', 80), n('Mutton rassa', 80),
        n('Malvani fish curry', 50),
      ],
      accompaniments: [
        v('Koshimbir'), v('Thecha'), v('Papad'), v('Lonche (pickle)'), v('Curd'),
        v('Kanda-limbu'), v('Salad'),
      ],
      sweets: [
        v('Shrikhand'), v('Modak (steamed or fried)'), v('Basundi'), v('Gulab jamun'),
        v('Shreekhand puri'), v('Kheer'),
      ],
      counters: [
        v('Live misal counter', 50), v('Live puran poli counter', 60), v('Pav bhaji counter', 55),
        v('Ice cream counter', 50),
      ],
    },
  },

  // ── Dietary & cross-cuisine ──────────────────────────────────────────
  {
    id: 'jain_satvik',
    name: 'Jain & Satvik',
    localName: 'Nirjal Bhojan',
    emoji: '🕉️',
    region: 'Dietary',
    blurb: 'No onion, no garlic, no root vegetables. Cooked in a separate kitchen with separate vessels.',
    basePlate: 500,
    hasNonVeg: false,
    note: 'Prepared in a dedicated section with its own vessels and staff — stated to the caterer as a hard requirement, not a preference.',
    courses: {
      welcome: [
        v('Nimbu sharbat'), v('Chaas'), v('Kesar milk'), v('Tender coconut'),
        v('Jal jeera'), v('Herbal tea'),
      ],
      starters: [
        v('Jain dhokla'), v('Corn cheese balls'), v('Paneer tikka (Jain)'), v('Raw banana cutlet'),
        v('Jain spring roll'), v('Khandvi'), v('Sabudana vada'), v('Methi muthiya'),
      ],
      mains: [
        v('Jeera rice'), v('Steamed rice'), v('Veg pulao (Jain)'), v('Phulka'), v('Puri'),
        v('Paratha (no potato)'), v('Khichdi'),
      ],
      curries: [
        v('Jain dal fry'), v('Paneer butter masala (Jain)'), v('Raw banana kofta'),
        v('Kadhi'), v('Mix veg (Jain)'), v('Chana masala (Jain)'), v('Palak paneer (Jain)'),
      ],
      accompaniments: [
        v('Cucumber raita'), v('Boondi raita'), v('Salad (no root veg)'), v('Papad'),
        v('Jain pickle'), v('Green chutney (no garlic)'),
      ],
      sweets: [
        v('Mohanthal'), v('Shrikhand'), v('Rasmalai'), v('Gulab jamun'),
        v('Kesar kheer'), v('Dry fruit laddu'),
      ],
      counters: [
        v('Jain chaat counter', 60), v('Live dosa counter (Jain)', 65), v('Ice cream counter', 50),
      ],
    },
  },
  {
    id: 'indo_chinese',
    name: 'Indo-Chinese',
    localName: 'Chinese',
    emoji: '🥡',
    region: 'Asian',
    blurb: 'The Indian-Chinese everybody actually wants — usually as a second counter, not the whole meal.',
    basePlate: 440,
    hasNonVeg: true,
    nonVegPlate: 690,
    courses: {
      welcome: [
        v('Lemon iced tea'), v('Green apple mocktail'), v('Litchi cooler'),
        v('Fresh lime soda'), v('Jasmine tea'),
      ],
      starters: [
        v('Veg spring roll'), v('Gobi Manchurian'), v('Paneer chilli'), v('Crispy corn'),
        v('Honey chilli potato'), v('Veg momos'), v('Mushroom salt & pepper'),
        n('Chicken lollipop'), n('Chilli chicken'), n('Chicken momos'),
        n('Prawn salt & pepper', 90), n('Fish Manchurian', 50),
      ],
      mains: [
        v('Veg fried rice'), v('Veg Hakka noodles'), v('Schezwan fried rice'), v('Burnt garlic rice'),
        v('Veg pan-fried noodles'), n('Chicken fried rice'), n('Chicken Hakka noodles'),
        n('Prawn fried rice', 90),
      ],
      curries: [
        v('Veg Manchurian gravy'), v('Chilli paneer gravy'), v('Mixed veg in hot garlic sauce'),
        v('Sweet corn veg soup'), v('Hot & sour veg soup'), n('Chicken in black bean sauce'),
        n('Chicken Manchurian gravy'), n('Chicken Manchow soup'),
      ],
      accompaniments: [
        v('Schezwan chutney'), v('Chilli vinegar'), v('Soy & garlic dip'), v('Crispy noodles'),
        v('Cucumber salad'),
      ],
      sweets: [
        v('Darsaan with ice cream'), v('Honey noodles'), v('Fried ice cream', 30),
        v('Date pancake'),
      ],
      counters: [
        v('Live wok / noodle counter', 85), v('Live momo counter', 70), v('Live sizzler counter', 90),
      ],
    },
  },
  {
    id: 'continental',
    name: 'Continental & Italian',
    localName: 'Continental',
    emoji: '🍝',
    region: 'Western',
    blurb: 'Pastas, grills and a salad bar. Reads well at a corporate event or a cocktail evening.',
    basePlate: 620,
    hasNonVeg: true,
    nonVegPlate: 940,
    courses: {
      welcome: [
        v('Virgin mojito'), v('Cucumber cooler'), v('Iced tea'), v('Berry punch'),
        v('Fresh juice bar', 60), v('Brewed coffee'),
      ],
      starters: [
        v('Bruschetta'), v('Stuffed mushrooms'), v('Cheese platter', 30), v('Falafel with hummus'),
        v('Veg quiche'), v('Garlic bread with cheese'), n('Chicken satay'),
        n('Fish fingers', 50), n('Grilled chicken skewers'), n('Prawn cocktail', 90),
      ],
      mains: [
        v('Penne arrabbiata'), v('Alfredo pasta'), v('Mushroom risotto'),
        v('Veg lasagne'), v('Herb rice'), v('Grilled vegetables & couscous'),
        v('Assorted breads & butter'), n('Grilled chicken steak'), n('Fish in lemon butter', 50),
        n('Chicken lasagne'),
      ],
      curries: [
        v('Cream of mushroom soup'), v('Minestrone soup'), v('Roasted tomato soup'),
        v('Ratatouille'), v('Veg stroganoff'), n('Chicken stew'),
      ],
      accompaniments: [
        v('Caesar salad (veg)'), v('Greek salad'), v('Coleslaw'), v('Potato wedges'),
        v('Corn on the cob'), v('Assorted dips'), v('Olives & pickles'),
      ],
      sweets: [
        v('Tiramisu', 30), v('Chocolate mousse'), v('Cheesecake slice', 30),
        v('Apple pie with cream'), v('Brownie with ice cream'), v('Fruit tart'),
      ],
      counters: [
        v('Live pasta counter', 85), v('Live pizza counter', 90), v('Salad bar', 70),
        v('Mocktail bar', 65), v('Waffle & crepe counter', 75), n('Live grill counter', 120),
      ],
    },
  },
  {
    id: 'chaat_street',
    name: 'Chaat & Street Food',
    localName: 'Chaat',
    emoji: '🥙',
    region: 'Snacks',
    blurb: 'An evening of counters rather than a sit-down meal. Works for sangeet, mehendi and office parties.',
    basePlate: 380,
    hasNonVeg: true,
    nonVegPlate: 560,
    courses: {
      welcome: [
        v('Masala soda'), v('Jal jeera'), v('Sugarcane juice'), v('Rose milk'),
        v('Nimbu pani'), v('Kulhad chai'),
      ],
      starters: [
        v('Pani puri'), v('Sev puri'), v('Bhel puri'), v('Dahi puri'), v('Samosa chaat'),
        v('Aloo tikki chaat'), v('Papdi chaat'), v('Ragda pattice'), v('Dahi vada'),
        v('Masala pav'), v('Vada pav'), v('Corn chaat'), n('Chicken kathi roll'),
        n('Egg bhurji pav'),
      ],
      mains: [
        v('Pav bhaji'), v('Chole bhature'), v('Veg frankie'), v('Paneer kathi roll'),
        v('Grilled sandwich'), v('Maggi counter'), v('Momos (veg)'), v('Idli-vada mini plate'),
      ],
      curries: [
        v('Ragda'), v('Chole'), v('Bhaji'), v('Rajma chawal'),
      ],
      accompaniments: [
        v('Green chutney'), v('Meetha chutney'), v('Lehsun chutney'), v('Sev & boondi'),
        v('Masala onion'), v('Papad'),
      ],
      sweets: [
        v('Jalebi'), v('Kulfi'), v('Falooda'), v('Gulab jamun'), v('Rabri'),
        v('Ice gola'), v('Malai kulfi'),
      ],
      counters: [
        v('Live pani puri counter', 40), v('Live chaat counter', 55), v('Live jalebi counter', 45),
        v('Live pav bhaji counter', 50), v('Kulfi & gola counter', 45), v('Live dosa counter', 65),
      ],
    },
  },
  {
    id: 'multi_cuisine',
    name: 'Multi-Cuisine Grand Buffet',
    localName: 'Grand Buffet',
    emoji: '🍽️',
    region: 'Mixed',
    blurb: 'North, South, Chinese and Continental on one buffet. The safe answer when the guest list is mixed.',
    basePlate: 690,
    hasNonVeg: true,
    nonVegPlate: 1020,
    courses: {
      welcome: [
        v('Mocktail bar (three mocktails)', 65), v('Fresh juice counter', 55), v('Masala chaas'),
        v('Aam panna'), v('Iced tea'), v('Tea & coffee counter'),
      ],
      starters: [
        v('Paneer tikka'), v('Gobi Manchurian'), v('Hara bhara kabab'), v('Veg spring roll'),
        v('Corn cheese balls'), v('Mushroom tikka'), v('Bruschetta'), v('Mysore bonda'),
        n('Chicken tikka'), n('Chilli chicken'), n('Fish fingers', 50),
        n('Mutton seekh kabab', 80), n('Chicken satay'),
      ],
      mains: [
        v('Jeera rice'), v('Veg biryani'), v('Bisi bele bath'), v('Veg fried rice'),
        v('Butter naan'), v('Tandoori roti'), v('Chapati'), v('Penne in pink sauce'),
        v('Veg Hakka noodles'), v('Steamed rice'), n('Chicken biryani'), n('Mutton biryani', 80),
      ],
      curries: [
        v('Dal makhani'), v('Paneer butter masala'), v('Sambar'), v('Rasam'),
        v('Veg kurma'), v('Kadai paneer'), v('Veg Manchurian gravy'), v('Mix veg'),
        n('Butter chicken'), n('Chicken chettinad'), n('Mutton rogan josh', 80),
      ],
      accompaniments: [
        v('Boondi raita'), v('Green salad'), v('Russian salad'), v('Papad'), v('Pickle'),
        v('Curd rice'), v('Masala onion'), v('Assorted chutneys'),
      ],
      sweets: [
        v('Gulab jamun'), v('Rasmalai'), v('Gajar ka halwa'), v('Payasam'),
        v('Ice cream (three flavours)'), v('Brownie'), v('Fruit salad'), v('Kaju katli', 30),
      ],
      counters: [
        v('Live chaat counter', 55), v('Live pasta counter', 85), v('Live dosa counter', 65),
        v('Live tandoor counter', 85), v('Mocktail bar', 65), v('Ice cream counter', 50),
        v('Live pani puri counter', 40),
      ],
    },
  },
  {
    id: 'mysuru_royal',
    name: 'Royal Mysuru Feast',
    localName: 'Arasu Uta',
    emoji: '👑',
    region: 'South Indian',
    blurb: 'The full banana-leaf spread as it is served at a Mysuru wedding — sixteen items, in order, with a serving team per section.',
    basePlate: 780,
    hasNonVeg: false,
    note: 'Served on banana leaf in traditional order, with a serving team assigned per row of guests.',
    courses: {
      welcome: [
        v('Panaka & kosambari welcome'), v('Majjige'), v('Tender coconut'), v('Badam haalu'),
        v('Rose milk'), v('Filter coffee counter', 30),
      ],
      starters: [
        v('Mysore bonda'), v('Ambode (masala vada)'), v('Goli baje'), v('Nippattu'),
        v('Kodubale'), v('Chakkuli'), v('Sandige & happala'), v('Bajji assortment'),
      ],
      mains: [
        v('Bisi bele bath'), v('Vangi bath'), v('Puliyogare'), v('Chitranna'), v('Ghee rice'),
        v('Anna (steamed rice) with tuppa'), v('Curd rice'), v('Poori'), v('Chapati'),
        v('Kesari bath'), v('Shavige bath'),
      ],
      curries: [
        v('Saaru'), v('Huli'), v('Majjige huli'), v('Gojju'), v('Kootu'), v('Palya gravy'),
        v('Menthya soppu saaru'), v('Tomato gojju'), v('Hurali saaru'),
      ],
      accompaniments: [
        v('Kosambari (two kinds)'), v('Palya (three kinds)'), v('Uppinakayi'), v('Chitranna pudi'),
        v('Happala & sandige'), v('Mosaru'), v('Tuppa'), v('Nimbe hannu'), v('Uppu & sihi'),
        v('Raita'),
      ],
      sweets: [
        v('Obbattu with tuppa'), v('Mysore pak'), v('Chiroti with badami haalu'),
        v('Shavige payasa'), v('Kesari bath'), v('Rava laddu'), v('Dharwad peda'),
        v('Jamoon'), v('Karjikayi'),
      ],
      counters: [
        v('Live obbattu counter', 70), v('Live dosa counter', 65), v('Live chiroti counter', 75),
        v('Filter coffee counter', 30), v('Chaat counter', 55), v('Ice cream counter', 50),
      ],
    },
  },
]

export const CUISINE_BY_ID = Object.fromEntries(CUISINES.map(c => [c.id, c]))

/**
 * Cuisines grouped for the dropdown.
 *
 * Sixteen options in one flat list is a scroll, not a choice. Grouping by
 * region is how a customer actually narrows — they know they want South
 * Indian before they know whether they want Udupi or Chettinad.
 */
export const CUISINE_GROUPS = [
  { label: 'South Indian', ids: ['karnataka', 'mysuru_royal', 'udupi', 'tamil', 'andhra', 'kerala'] },
  { label: 'North Indian', ids: ['north_indian', 'mughlai'] },
  { label: 'East & West',  ids: ['bengali', 'gujarati_rajasthani', 'maharashtrian'] },
  { label: 'Special diets', ids: ['jain_satvik'] },
  { label: 'World & snacks', ids: ['indo_chinese', 'continental', 'chaat_street'] },
  { label: 'Everything together', ids: ['multi_cuisine'] },
]

/** Dishes in a course, filtered to what this order's diet allows. */
export function dishesFor(cuisine, courseId, { vegOnly = false } = {}) {
  const items = cuisine?.courses?.[courseId] ?? []
  return vegOnly ? items.filter(d => d.veg) : items
}

/**
 * The menu a customer gets before touching anything.
 *
 * Top `allowance` dishes per course, which is why ordering in the data above
 * matters. A pre-filled menu is the difference between "choose 42 things" and
 * "here is your menu, swap what you like" — the second is a decision somebody
 * can make on a phone at 11pm.
 */
export function defaultMenu(cuisine, menuAllowance, { vegOnly = false } = {}) {
  const out = {}
  for (const course of COURSES) {
    const allowed = menuAllowance?.[course.id] ?? 0
    const available = dishesFor(cuisine, course.id, { vegOnly })

    if (vegOnly || !cuisine?.hasNonVeg || allowed < 2) {
      out[course.id] = available.slice(0, allowed).map(d => d.id)
      continue
    }

    // A customer who has just tapped "veg & non-veg" and gets a menu of nine
    // vegetarian dishes will assume the toggle did nothing. Every course is
    // listed veg-first (that is the right default for this market), so a plain
    // top-N slice can never surface a non-veg dish — the split has to be made
    // explicitly. Roughly a third, which is what a mixed Bengaluru buffet
    // actually looks like, and never so many that the vegetarian guests are
    // left with three things to eat.
    const nonVegWanted = Math.min(
      Math.max(1, Math.round(allowed / 3)),
      available.filter(d => !d.veg).length,
    )
    const nonVeg = available.filter(d => !d.veg).slice(0, nonVegWanted)
    const veg = available.filter(d => d.veg).slice(0, allowed - nonVeg.length)
    // Re-ordered back into catalogue order so the ticked boxes read down the
    // list rather than jumping around it.
    const chosen = new Set([...veg, ...nonVeg].map(d => d.id))
    out[course.id] = available.filter(d => chosen.has(d.id)).map(d => d.id)
  }
  return out
}
