/**
 * Pooja & Essentials, expanded.
 *
 * The existing 67 rows are mostly loose components — a bell, a packet of
 * kumkum, a bag of camphor — plus a handful of kits. Two things were missing,
 * and both of them are the reason someone would use a shop instead of the
 * street outside the temple:
 *
 *   1. Complete, named kits for specific rites. "Satyanarayan Pooja Kit" is a
 *      thing a family searches for the night before; "Kumkum & Turmeric Combo"
 *      is a thing you buy when you already know the list. The catalogue had
 *      plenty of the second and almost none of the first.
 *
 *   2. Anything south or east of the Deccan. The list read as one tradition,
 *      which is a real failure in a shop piloting in Bengaluru and Mysore:
 *      no Varalakshmi Vratham, no Ayudha Pooja, no Ugadi, no Onam, no Durga
 *      Puja, no Karthigai Deepam. Those are added here, and the customiser
 *      (config/customizers/pooja.js) asks which tradition to assemble for.
 *
 * Occasion tags match src/data/shopOccasions.js exactly.
 *
 * Prices reflect what the samagri and brass actually cost, at the rates a
 * pooja store in a metro charges. Pandit booking is priced in the customiser
 * as a service rather than hidden inside a kit.
 *
 * Photo queries matter more here than anywhere else in the shop: a product
 * name like "Ayudha Pooja Kit" returns nothing usable, so nearly every row
 * carries an explicit `query` describing what the picture should show.
 */

export const META = {
  category: 'Pooja & Essentials',
  readCategories: ['Pooja & Essentials'],
  categoryTerm: 'indian puja ritual brass devotional',
  out: 'supabase/migrations/033_pooja_essentials_catalog.sql',
  title: 'Migration 033: Pooja & Essentials — complete kits, and traditions beyond one.',
  rationale: `The category held 67 rows that were mostly loose components — a bell, a
packet of kumkum, a bag of camphor — and read as a single tradition.
Both are real gaps for a shop piloting in Bengaluru and Mysore.

A family searches for "Satyanarayan Pooja Kit" the night before, not for
"Kumkum & Turmeric Combo"; and there was nothing at all for Varalakshmi
Vratham, Ayudha Pooja, Ugadi, Onam, Durga Puja or Karthigai Deepam.

The customiser (src/config/customizers/pooja.js) asks which tradition to
assemble for, how complete the kit should be, when the muhurat is, and
the name and gotra the purohit needs for the sankalp.`,
}

export const CATALOG = [

  /* ══ Daily Pooja ════════════════════════════════════════════════════ */
  { name: 'Daily Pooja Starter Kit', occasion: 'Daily Pooja', price: 899, emoji: '🪔',
    description: 'Everything for the morning lamp — a month of supplies',
    query: 'home puja altar lamp incense brass india' },
  { name: 'Brass Pooja Mandir Cleaning Set', occasion: 'Daily Pooja', price: 449, emoji: '🧽',
    description: 'Tamarind polish, cloths and brush for brass idols',
    query: 'polishing brass idols cleaning india' },
  { name: 'Cotton Wicks & Ghee Combo (Monthly)', occasion: 'Daily Pooja', price: 349, emoji: '🕯️',
    description: 'Hand-rolled wicks with pure cow ghee',
    query: 'cotton wicks ghee lamp puja india' },
  { name: 'Sandalwood Agarbatti Bulk Pack', occasion: 'Daily Pooja', price: 299, emoji: '🌫️',
    description: '200 sticks, natural sandalwood, low smoke',
    query: 'incense sticks burning sandalwood smoke' },
  { name: 'Tulsi Plant with Brass Pot', occasion: 'Daily Pooja', price: 749, emoji: '🌿',
    description: 'Live tulsi in a traditional brass planter',
    query: 'tulsi holy basil plant pot indian home' },
  { name: 'Pooja Room Fresh Flower Subscription', occasion: 'Daily Pooja', price: 1499, emoji: '🌸',
    description: 'Fresh flowers delivered every morning for a month',
    query: 'fresh flowers offering temple india morning' },

  /* ══ Griha Pravesh ══════════════════════════════════════════════════ */
  { name: 'Griha Pravesh Complete Kit', occasion: 'Griha Pravesh', price: 2499, emoji: '🏠',
    description: 'Every item for the housewarming rite, checklist included',
    query: 'brass lamp rice grains kalash ceremony home blessing' },
  { name: 'Milk Boiling Ceremony Set', occasion: 'Griha Pravesh', price: 899, emoji: '🥛',
    description: 'Brass vessel, milk, rice and jaggery for the first boil',
    query: 'brass vessel milk boiling ceremony indian kitchen' },
  { name: 'Vastu Shanti Havan Kit', occasion: 'Griha Pravesh', price: 1899, emoji: '🔥',
    description: 'Havan kund, samagri, ghee and wood',
    query: 'havan kund fire ritual indian ceremony' },
  { name: 'Mango Leaf Toran & Rangoli Set', occasion: 'Griha Pravesh', price: 649, emoji: '🍃',
    description: 'Fresh toran with rangoli colours and stencils',
    query: 'mango leaf toran door decoration rangoli india' },

  /* ══ Satyanarayan Pooja ═════════════════════════════════════════════ */
  { name: 'Satyanarayan Pooja Complete Kit', occasion: 'Satyanarayan Pooja', price: 2199, emoji: '🙏',
    description: 'All samagri, katha book and prasad ingredients',
    query: 'satyanarayan puja setup indian ritual offerings' },
  { name: 'Sheera Prasad Ingredients Kit', occasion: 'Satyanarayan Pooja', price: 549, emoji: '🍮',
    description: 'Semolina, ghee, sugar and banana for the prasad',
    query: 'semolina halwa sheera indian sweet prasad' },
  { name: 'Katha Book & Aarti Booklet Set', occasion: 'Satyanarayan Pooja', price: 249, emoji: '📖',
    description: 'In your chosen language, large print',
    query: 'hindu prayer book aarti indian devotional' },

  /* ══ Wedding Pooja ══════════════════════════════════════════════════ */
  { name: 'Wedding Mandap Pooja Kit', occasion: 'Wedding Pooja', price: 4999, emoji: '💍',
    description: 'Complete samagri for the mandap rites',
    query: 'indian wedding mandap ritual fire ceremony' },
  { name: 'Ganesh Pooja Kit (Pre-Wedding)', occasion: 'Wedding Pooja', price: 1299, emoji: '🐘',
    description: 'For the ceremony that opens every wedding',
    query: 'ganesh idol puja offerings indian ceremony' },
  { name: 'Kalash & Coconut Set (Set of 5)', occasion: 'Wedding Pooja', price: 1599, emoji: '🏺',
    description: 'Five brass kalash with coconuts and mango leaves',
    query: 'brass kalash coconut mango leaves indian ritual' },
  { name: 'Nalangu & Haldi Ceremony Set', occasion: 'Wedding Pooja', price: 999, emoji: '🌼',
    description: 'Turmeric, sandal, rosewater and vermilion for the rites',
    query: 'turmeric sandalwood paste bowls indian wedding ritual' },
  { name: 'Mangalsutra Thali Decoration Set', occasion: 'Wedding Pooja', price: 1199, emoji: '📿',
    description: 'Decorated thali for the mangalsutra ceremony',
    query: 'decorated puja thali indian wedding gold' },

  /* ══ Small Functions ════════════════════════════════════════════════ */
  { name: 'Naming Ceremony Pooja Kit', occasion: 'Small Functions', price: 1499, emoji: '📜',
    description: 'Namakaran samagri with cradle decoration items',
    query: 'baby naming ceremony indian ritual cradle' },
  { name: 'Annaprashan Ceremony Kit', occasion: 'Small Functions', price: 1299, emoji: '🍚',
    description: 'Silver spoon, bowl and samagri for the first feeding',
    query: 'silver bowl spoon baby rice ceremony indian' },
  { name: 'Mundan Ceremony Kit', occasion: 'Small Functions', price: 999, emoji: '✂️',
    description: 'Samagri for the first-haircut rite',
    query: 'indian baby head shaving ceremony ritual' },
  { name: 'Birthday Ayushya Homam Kit', occasion: 'Small Functions', price: 1799, emoji: '🔥',
    description: 'For a long-life blessing on a birthday',
    query: 'homam fire ritual indian priest offering' },
  { name: 'Seemantham Ceremony Kit', occasion: 'Small Functions', price: 1699, emoji: '🤰',
    description: 'Bangles, turmeric and samagri for the baby shower rite',
    query: 'colourful glass bangles stack close up' },
  { name: 'Shraddha & Tarpanam Kit', occasion: 'Small Functions', price: 899, emoji: '🕊️',
    description: 'Darbha, sesame and vessels for ancestral rites',
    query: 'hands pouring water offering ritual sunrise river' },

  /* ══ Diwali ═════════════════════════════════════════════════════════ */
  { name: 'Lakshmi Puja Complete Kit', occasion: 'Diwali', price: 1899, emoji: '🪔',
    description: 'Idols, samagri, chowki and offerings for Diwali night',
    query: 'lakshmi ganesh idols diwali puja offerings' },
  { name: 'Diwali Diya Set — Hand Painted (24 pc)', occasion: 'Diwali', price: 699, emoji: '🎨',
    description: 'Terracotta diyas painted by local artisans',
    query: 'hand painted terracotta diyas diwali colourful' },
  { name: 'Chopda Pujan Kit (Account Books)', occasion: 'Diwali', price: 899, emoji: '📒',
    description: 'For the ledger blessing on Lakshmi Puja',
    query: 'ledger book puja indian business ritual' },
  { name: 'Govardhan & Annakut Pooja Kit', occasion: 'Diwali', price: 1199, emoji: '🍲',
    description: 'Samagri for the day after Diwali',
    query: 'indian festival food offering temple annakut' },

  /* ══ Navratri ═══════════════════════════════════════════════════════ */
  { name: 'Durga Puja Complete Kit', occasion: 'Navratri', price: 2299, emoji: '🌺',
    description: 'Full samagri with red hibiscus and dhunuchi',
    query: 'durga puja idol red hibiscus bengali festival' },
  { name: 'Golu Doll Arrangement Starter Set', occasion: 'Navratri', price: 2999, emoji: '🪆',
    description: 'Steps and starter dolls for the Navratri display',
    query: 'golu dolls display steps south indian navratri' },
  { name: 'Kanya Pujan Kit (9 Girls)', occasion: 'Navratri', price: 1499, emoji: '👧',
    description: 'Gifts, chunri and prasad for nine kanyas',
    query: 'indian girls festival ritual offering colourful' },
  { name: 'Dandiya Sticks & Aarti Set', occasion: 'Navratri', price: 799, emoji: '🪘',
    description: 'Decorated dandiya pair with an aarti thali',
    query: 'dandiya sticks garba navratri colourful' },

  /* ══ Ganesh Chaturthi ═══════════════════════════════════════════════ */
  { name: 'Eco Ganesh Idol — Clay (12 inch)', occasion: 'Ganesh Chaturthi', price: 1299, emoji: '🐘',
    description: 'Natural clay, dissolves cleanly, seed embedded',
    query: 'eco friendly clay ganesh idol natural' },
  { name: 'Ganpati Decoration Kit', occasion: 'Ganesh Chaturthi', price: 1899, emoji: '🎊',
    description: 'Backdrop, drapes, lights and flowers for the mandap',
    query: 'ganpati decoration home mandap flowers lights' },
  { name: 'Modak Making Kit', occasion: 'Ganesh Chaturthi', price: 649, emoji: '🍡',
    description: 'Moulds, rice flour, jaggery and coconut',
    query: 'modak indian sweet dumpling coconut jaggery' },
  { name: 'Visarjan Day Kit', occasion: 'Ganesh Chaturthi', price: 549, emoji: '🌊',
    description: 'Offerings and an eco-safe immersion bucket',
    query: 'ganesh visarjan immersion water ritual india' },

  /* ══ Janmashtami ════════════════════════════════════════════════════ */
  { name: 'Janmashtami Jhula Decoration Set', occasion: 'Janmashtami', price: 1499, emoji: '🦚',
    description: 'Decorated cradle with peacock feathers and flowers',
    query: 'krishna cradle jhula decoration peacock feather' },
  { name: 'Bal Gopal Dress & Ornament Set', occasion: 'Janmashtami', price: 899, emoji: '👑',
    description: 'Silk dress, crown, flute and jewellery for the idol',
    query: 'krishna idol dress crown flute ornaments' },
  { name: 'Panjiri & Makhan Mishri Prasad Kit', occasion: 'Janmashtami', price: 549, emoji: '🍬',
    description: 'Traditional prasad ingredients for the midnight aarti',
    query: 'indian sweet prasad offering butter sugar' },

  /* ══ Regional & Other ═══════════════════════════════════════════════ */
  { name: 'Varalakshmi Vratham Kit', occasion: 'Regional & Other', price: 2199, emoji: '🪙',
    description: 'Kalasam, face, saree and samagri for the vratham',
    query: 'varalakshmi kalasam decoration south indian festival' },
  { name: 'Ayudha Pooja Kit', occasion: 'Regional & Other', price: 1299, emoji: '🛠️',
    description: 'For the tools, books and vehicles — banana, lime and kumkum',
    query: 'ayudha pooja tools vehicle decoration banana leaves' },
  { name: 'Ugadi & Gudi Padwa Kit', occasion: 'Regional & Other', price: 999, emoji: '🌱',
    description: 'Neem, jaggery, mango leaves and the gudi cloth',
    query: 'neem leaves jaggery mango leaves wooden bowl' },
  { name: 'Onam Pookalam Flower Kit', occasion: 'Regional & Other', price: 1499, emoji: '🌼',
    description: 'Loose petals sorted by colour for the floor design',
    query: 'marigold petals arranged circular pattern floor' },
  { name: 'Karthigai Deepam Lamp Set', occasion: 'Regional & Other', price: 1199, emoji: '🕯️',
    description: 'Agal vilakku lamps with wicks and oil',
    query: 'row of oil lamps south indian festival deepam' },
  { name: 'Pongal Celebration Kit', occasion: 'Regional & Other', price: 1399, emoji: '🌾',
    description: 'Clay pot, sugarcane, turmeric plant and rice',
    query: 'pongal clay pot sugarcane harvest tamil festival' },
  { name: 'Chhath Puja Kit', occasion: 'Regional & Other', price: 1799, emoji: '🌅',
    description: 'Bamboo soop, fruits and offerings for the river rites',
    query: 'chhath puja bamboo basket offerings river sunrise' },
  { name: 'Saraswati Puja Kit', occasion: 'Regional & Other', price: 1199, emoji: '📚',
    description: 'For Vasant Panchami — books, veena and yellow flowers',
    query: 'saraswati puja books yellow flowers indian festival' },
]
