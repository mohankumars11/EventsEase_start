// Every dish, with an ID that never changes.
//
// ══════════════════════════════════════════════════════════════════════
// WHY IDS AND NOT NAMES
// ══════════════════════════════════════════════════════════════════════
//
// A partner's listing used to store dish NAMES — the literal strings they
// ticked. That is unmatched-able, and quietly so:
//
//   customer's menu card says   "Arachuvitta Sambar"
//   caterer A ticked            "Arachuvitta Sambar"
//   caterer B ticked            "Arachuvitta sambar"
//   caterer C ticked            "Araichuvitta Sambhar"
//
// All three cook the same thing. A string match finds one of them. No
// error is raised, nothing looks broken, and two caterers who could have
// done the job are simply never offered it — which is invisible from
// both ends.
//
// So the customer's menu card is a set of dish IDs, a caterer's listing
// is a set of dish IDs, and matching is set arithmetic. See lib/menuMatch.js.
//
// ══════════════════════════════════════════════════════════════════════
// THE ID SCHEME
// ══════════════════════════════════════════════════════════════════════
//
//   SBM-TN-ST-001
//   │   │  │   └── sequential within the region, from the source list
//   │   │  └────── course: ST starters · MC mains · RA rice · DE desserts
//   │   └───────── region: TN · AP · KL · KA
//   └───────────── Sambramo
//
// Two numbering schemes arrived together and they disagreed: the full
// 144-dish list numbers sequentially across a whole region (TN-ST-001 is
// Medhu Vadai), the 48-row CSV numbers within each course (SBM-TN-ST-01
// is Ghee Podi Idli). Same-looking id, different dish.
//
// The full list wins on numbering because it is the complete one and its
// numbers are already written down; the CSV wins on shape because its
// explicit region / course / dietary columns are what matching needs.
//
// ── An id is permanent ─────────────────────────────────────────────────
// Once a caterer has ticked SBM-TN-MC-013 it is in their listing and in
// every booking that referenced it. Renaming the dish is fine. Renumbering
// it silently re-points somebody's claim at a different dish, so ids are
// never reused and never reordered — a withdrawn dish gets active: false.

/** Vegetarian. */
const V = 'veg'
/** Contains meat, fish or egg. */
const N = 'nonveg'

/* id, cuisine screen, course, diet, name, what it is */
const d = (id, cuisine, course, diet, name, note) =>
  ({ id, cuisine, course, diet, name, note, active: true })

/**
 * The four course categories the source list is organised in.
 *
 * `maps` is the course id in cuisineMenus.js, so a dish out of this
 * registry can be rendered on the screens that already exist rather than
 * needing a parallel set of them.
 */
export const COURSE_CATEGORIES = [
  { id: 'STARTERS',      label: 'Starters & tiffin',     maps: 'starters' },
  { id: 'MAIN_CURRIES',  label: 'Main curries',          maps: 'curries' },
  { id: 'RICE_ASSETS',   label: 'Rice & live breads',    maps: 'mains' },
  { id: 'DESSERTS_LIVE', label: 'Desserts & live stations', maps: 'sweets' },
]

/**
 * The regions, and the cuisine screen each one belongs to.
 *
 * Region 4 arrived as "Udupi & Karnataka Brahmin", which is two of the
 * existing cuisine screens. Its dishes are split between them by what
 * they actually are: Goli Baje, Surnoli, Pathrode, Mattu Gulla and Neer
 * Dosa are coastal and go to Udupi; Maddur Vada, Bisi Bele Bath,
 * Davangere Benne Dosa, Obbattu and Mysore Pak are pan-Karnataka.
 *
 * Filing all thirty under one screen would have made half of them
 * unreachable for the caterer who actually cooks them.
 */
export const REGIONS = [
  { id: 'TN', label: 'Tamil Nadu',                cuisine: 'tamil' },
  { id: 'AP', label: 'Andhra Pradesh & Telangana', cuisine: 'andhra' },
  { id: 'KL', label: 'Kerala',                     cuisine: 'kerala' },
  { id: 'KA', label: 'Udupi & Karnataka Brahmin',  cuisine: 'karnataka' },
]

export const DISHES = [
  /* ══════════════════════════════════════════════════════════════════
     TAMIL NADU · Chettinad heat and Brahmin wedding classics
     ══════════════════════════════════════════════════════════════════ */

  // Starters & tiffin
  d('SBM-TN-ST-001', 'tamil', 'STARTERS', V, 'Medhu Vadai', 'Mini cocktail size, served with coconut chutney'),
  d('SBM-TN-ST-002', 'tamil', 'STARTERS', V, 'Kuzhi Paniyaram', 'Chettinad style seasoned rice batter dumplings'),
  d('SBM-TN-ST-003', 'tamil', 'STARTERS', V, 'Vazhaipoo Vadai', 'Crispy fried spiced banana flower patties'),
  d('SBM-TN-ST-004', 'tamil', 'STARTERS', V, 'Ghee Podi Idli', 'Button idlis tossed in gunpowder and ghee'),
  d('SBM-TN-ST-005', 'tamil', 'STARTERS', V, 'Keerai Vadai', 'Split-pea fritters with fresh amaranth leaves'),
  d('SBM-TN-ST-006', 'tamil', 'STARTERS', V, 'Kanchipuram Idli', 'Steamed rice cakes with ginger, pepper and cumin'),
  d('SBM-TN-ST-007', 'tamil', 'STARTERS', V, 'Rava Onion Fritters', 'Deep-fried semolina-coated onion rings'),
  d('SBM-TN-ST-008', 'tamil', 'STARTERS', V, 'Beetroot Kola Urundai', 'The vegetarian kola — crisp spiced balls'),
  d('SBM-TN-ST-009', 'tamil', 'STARTERS', N, 'Mutton Kola Urundai', 'Madurai-style crispy spiced minced meat balls'),
  d('SBM-TN-ST-010', 'tamil', 'STARTERS', N, 'Madurai Chicken 65', 'Fiery deep-fried chicken in local red chillies'),
  d('SBM-TN-ST-011', 'tamil', 'STARTERS', N, 'Chettinad Eral Thokku Dry', 'Pan-seared masala prawns with fennel'),
  d('SBM-TN-ST-012', 'tamil', 'STARTERS', N, 'Nandu Kola', 'Spiced crab meat patties fried till golden'),

  // Main curries & kuzhambu
  d('SBM-TN-MC-013', 'tamil', 'MAIN_CURRIES', V, 'Arachuvitta Sambar', 'Wedding stew made with freshly roasted spices'),
  d('SBM-TN-MC-014', 'tamil', 'MAIN_CURRIES', V, 'Vatha Kuzhambu', 'Tangy tamarind reduction with sun-dried berries'),
  d('SBM-TN-MC-015', 'tamil', 'MAIN_CURRIES', V, 'Moor Kuzhambu', 'Buttermilk and yogurt curry with white pumpkin'),
  d('SBM-TN-MC-016', 'tamil', 'MAIN_CURRIES', V, 'Vegetable Avial', 'Mixed vegetables in a coarse coconut-yogurt paste'),
  d('SBM-TN-MC-017', 'tamil', 'MAIN_CURRIES', V, 'Ennai Kathirikai Curry', 'Baby brinjals roasted in thick sesame oil gravy'),
  d('SBM-TN-MC-018', 'tamil', 'MAIN_CURRIES', V, 'Chettinad Paneer Masala', 'Cottage cheese in a fiery black pepper gravy'),
  d('SBM-TN-MC-019', 'tamil', 'MAIN_CURRIES', V, 'Paruppu Usili', 'Crumbled lentil mash cooked with cluster beans'),
  d('SBM-TN-MC-020', 'tamil', 'MAIN_CURRIES', V, 'Thakkali Thokku', 'Spiced tomato reduction with mustard and curry leaves'),
  d('SBM-TN-MC-021', 'tamil', 'MAIN_CURRIES', N, 'Chettinad Chicken Kuzhambu', 'Country chicken with fresh coconut milk'),
  d('SBM-TN-MC-022', 'tamil', 'MAIN_CURRIES', N, 'Madurai Mutton Chukka', 'Thick pan-roasted mutton with shallots'),
  d('SBM-TN-MC-023', 'tamil', 'MAIN_CURRIES', N, 'Meen Poondu Kuzhambu', 'Tangy fish curry loaded with whole garlic'),
  d('SBM-TN-MC-024', 'tamil', 'MAIN_CURRIES', N, 'Peera Muttai Curry', 'Boiled eggs in coarse coconut pepper masala'),

  // Rice & live breads
  d('SBM-TN-RA-025', 'tamil', 'RICE_ASSETS', N, 'Seeraga Samba Mutton Biryani', 'The Tamil wedding biryani, short grain'),
  d('SBM-TN-RA-026', 'tamil', 'RICE_ASSETS', N, 'Ambur Chicken Biryani', 'Mildly spiced wood-fired dum, with brinjal'),
  d('SBM-TN-RA-027', 'tamil', 'RICE_ASSETS', N, 'Dindigul Thalappakatti Biryani', 'High-spice peppery mutton'),
  d('SBM-TN-RA-028', 'tamil', 'RICE_ASSETS', V, 'Ghee Ven Pongal', 'Mashed rice and moong dal loaded with cashews'),
  d('SBM-TN-RA-029', 'tamil', 'RICE_ASSETS', V, 'Elumichai Sadam', 'Tempered lemon rice with crunchy peanuts'),
  d('SBM-TN-RA-030', 'tamil', 'RICE_ASSETS', V, 'Thengai Sadam', 'Rice tossed with grated coconut and mustard'),
  d('SBM-TN-RA-031', 'tamil', 'RICE_ASSETS', V, 'Live Kal Dosa Counter', 'Soft sponge dosas served with vada curry'),
  /* The station is listed veg because its base is, and a pure-veg
     kitchen can run it. The egg and chicken fillings are the caterer's
     own answer on the kitchen screen, not a property of the counter. */
  d('SBM-TN-RA-032', 'tamil', 'RICE_ASSETS', V, 'Live Kothu Parotta Station', 'Shredded parotta minced to order — veg base'),

  // Desserts & live stations
  d('SBM-TN-DE-033', 'tamil', 'DESSERTS_LIVE', V, 'Paal Payasam', 'Milk kheer boiled for hours to a pinkish cream'),
  d('SBM-TN-DE-034', 'tamil', 'DESSERTS_LIVE', V, 'Kasi Halwa', 'Wedding sweet of grated ash gourd and ghee'),
  d('SBM-TN-DE-035', 'tamil', 'DESSERTS_LIVE', V, 'Ghee Mysore Pak', 'Porous, melt-in-the-mouth gram flour sweet'),
  d('SBM-TN-DE-036', 'tamil', 'DESSERTS_LIVE', V, 'Ukkarai', 'Chettinad chana dal and jaggery crumble'),
  d('SBM-TN-DE-037', 'tamil', 'DESSERTS_LIVE', V, 'Live Jigarthanda Counter', 'Madurai cold drink with almond gum and ice cream'),
  d('SBM-TN-DE-038', 'tamil', 'DESSERTS_LIVE', V, 'Elaneer Payasam', 'Tender coconut pulp kheer with condensed milk'),

  /* ══════════════════════════════════════════════════════════════════
     ANDHRA PRADESH & TELANGANA · spiced grills and Nizami galas
     ══════════════════════════════════════════════════════════════════ */

  d('SBM-AP-ST-039', 'andhra', 'STARTERS', V, 'Punugulu', 'Crisp fried rice-urad batter balls, ginger chutney'),
  d('SBM-AP-ST-040', 'andhra', 'STARTERS', V, 'Andhra Mirchi Bajji', 'Stuffed green chillies, onions and lemon on top'),
  d('SBM-AP-ST-041', 'andhra', 'STARTERS', V, 'Pesarattu Moong Crepes', 'Green gram pancakes with allam pachadi'),
  d('SBM-AP-ST-042', 'andhra', 'STARTERS', V, 'Gobi 65 Andhra Style', 'Cauliflower in a dry red chilli yogurt paste'),
  d('SBM-AP-ST-043', 'andhra', 'STARTERS', V, 'Arbi Pepper Fry', 'Crisp taro root rounds tossed in black pepper'),
  d('SBM-AP-ST-044', 'andhra', 'STARTERS', V, 'Sweet Corn Vada', 'Sweet corn and chana dal patties with green chilli'),
  d('SBM-AP-ST-045', 'andhra', 'STARTERS', N, 'Guntur Spicy Chicken Fry', 'Bone-in, dry, with Guntur red chilli'),
  d('SBM-AP-ST-046', 'andhra', 'STARTERS', N, 'Chicken Majestic', 'Shredded strips stir-fried with yogurt and chilli'),
  d('SBM-AP-ST-047', 'andhra', 'STARTERS', N, 'Royyala Vepudu', 'Prawns stir-fried with dry coconut and curry leaf'),
  d('SBM-AP-ST-048', 'andhra', 'STARTERS', N, 'Mutton Vepudu', 'Slow-roasted goat in a dark, dry masala'),
  d('SBM-AP-ST-049', 'andhra', 'STARTERS', N, 'Fish Tikka Nellore Style', 'Boneless fish in local red spice paste'),
  d('SBM-AP-ST-050', 'andhra', 'STARTERS', N, 'Mutton Boti Pepper Dry', 'Crisp-fried lamb intestines, heavy pepper'),

  d('SBM-AP-MC-051', 'andhra', 'MAIN_CURRIES', V, 'Andhra Tomato Pappu', 'Tangy toor dal with ripe tomato and green chilli'),
  d('SBM-AP-MC-052', 'andhra', 'MAIN_CURRIES', V, 'Palak Pappu', 'Creamy lentil dal slow-cooked with spinach'),
  d('SBM-AP-MC-053', 'andhra', 'MAIN_CURRIES', V, 'Gutti Vankaya Kura', 'Stuffed baby brinjals, peanut sesame coconut'),
  d('SBM-AP-MC-054', 'andhra', 'MAIN_CURRIES', V, 'Bendakaya Pulusu', 'Okra in a thick tamarind jaggery reduction'),
  d('SBM-AP-MC-055', 'andhra', 'MAIN_CURRIES', V, 'Tomato Sherva', 'Tomato and peanut gravy, the biryani companion'),
  d('SBM-AP-MC-056', 'andhra', 'MAIN_CURRIES', V, 'Capsicum Masala Curry', 'Bell peppers in a cashew-sesame sauce'),
  d('SBM-AP-MC-057', 'andhra', 'MAIN_CURRIES', N, 'Gongura Mutton Spicy Curry', 'Goat with sour sorrel leaf paste'),
  d('SBM-AP-MC-058', 'andhra', 'MAIN_CURRIES', N, 'Nellore Chepala Pulusu', 'Fiery tangy fish curry in a clay pot'),
  d('SBM-AP-MC-059', 'andhra', 'MAIN_CURRIES', N, 'Andhra Kodi Kura', 'Chicken curry on a dry-roast spice base'),
  d('SBM-AP-MC-060', 'andhra', 'MAIN_CURRIES', N, 'Natu Kodi Pulusu', 'Country chicken in a thin fiery gravy'),
  d('SBM-AP-MC-061', 'andhra', 'MAIN_CURRIES', N, 'Mutton Keema Matar', 'Minced goat cooked with green peas'),
  d('SBM-AP-MC-062', 'andhra', 'MAIN_CURRIES', N, 'Egg Pulusu', 'Boiled eggs in a tangy tamarind onion reduction'),

  d('SBM-AP-RA-063', 'andhra', 'RICE_ASSETS', N, 'Hyderabadi Chicken Dum Biryani', 'Raw marinated chicken, layered basmati'),
  d('SBM-AP-RA-064', 'andhra', 'RICE_ASSETS', N, 'Hyderabadi Mutton Dum Biryani', 'Nizami slow-cooked lamb feast'),
  d('SBM-AP-RA-065', 'andhra', 'RICE_ASSETS', V, 'Bagara Annam', 'Basmati with whole spices, mint and coriander'),
  d('SBM-AP-RA-066', 'andhra', 'RICE_ASSETS', V, 'Spicy Tamarind Pulihora', 'Festive yellow rice with fried peanuts'),
  d('SBM-AP-RA-067', 'andhra', 'RICE_ASSETS', V, 'Nimmakaya Pulihora', 'Lemon rice heavy on hing and green chilli'),
  d('SBM-AP-RA-068', 'andhra', 'RICE_ASSETS', V, 'Gongura Pachadi with Ghee', 'Sour sorrel chutney with hot rice and ghee'),
  d('SBM-AP-RA-069', 'andhra', 'RICE_ASSETS', V, 'Live Dibba Rotti Station', 'Thick crisp-crust rice-dal cake, avakaya'),
  d('SBM-AP-RA-070', 'andhra', 'RICE_ASSETS', V, 'Live Jonna Rotte Counter', 'Jowar flatbreads patted live on iron tawa'),

  d('SBM-AP-DE-071', 'andhra', 'DESSERTS_LIVE', V, 'Khubani Ka Meetha', 'Stewed dried apricot with fresh cream'),
  d('SBM-AP-DE-072', 'andhra', 'DESSERTS_LIVE', V, 'Double Ka Meetha', 'Fried bread in saffron milk and cardamom syrup'),
  d('SBM-AP-DE-073', 'andhra', 'DESSERTS_LIVE', V, 'Pootharekulu', 'Paper-thin rice sheets layered with jaggery and ghee'),
  d('SBM-AP-DE-074', 'andhra', 'DESSERTS_LIVE', V, 'Bellam Paramannam', 'Jaggery milk rice pudding with fried cashews'),
  d('SBM-AP-DE-075', 'andhra', 'DESSERTS_LIVE', V, 'Ariselu', 'Fried rice flour and jaggery cakes with sesame'),
  d('SBM-AP-DE-076', 'andhra', 'DESSERTS_LIVE', V, 'Live Shahi Tukda Counter', 'Bread pudding finished with silver varq'),

  /* ══════════════════════════════════════════════════════════════════
     KERALA · coconut milk infusions and Malabar feasts
     ══════════════════════════════════════════════════════════════════ */

  d('SBM-KL-ST-077', 'kerala', 'STARTERS', V, 'Ethakka Appam', 'Ripe banana slices dipped in batter and fried'),
  d('SBM-KL-ST-078', 'kerala', 'STARTERS', V, 'Malabar Parippu Vada', 'Coarse chana dal patties, ginger and curry leaf'),
  d('SBM-KL-ST-079', 'kerala', 'STARTERS', V, 'Ulli Vada', 'Deep-fried sliced onion fritters, heavy green chilli'),
  d('SBM-KL-ST-080', 'kerala', 'STARTERS', V, 'Koon Fry', 'Button mushrooms in a dry fiery black pepper paste'),
  d('SBM-KL-ST-081', 'kerala', 'STARTERS', V, 'Vazhachandu Cutlet', 'Fried spiced banana stem patties'),
  d('SBM-KL-ST-082', 'kerala', 'STARTERS', V, 'Paneer Coconut Dry', 'Cottage cheese pan-seared with coconut chips'),
  d('SBM-KL-ST-083', 'kerala', 'STARTERS', N, 'Kerala Coconut Beef Fry', 'Ularthiyathu — roasted with coconut slices'),
  d('SBM-KL-ST-084', 'kerala', 'STARTERS', N, 'Malabar Chicken Kondattam', 'Sun-dried marinade fried with curd chillies'),
  d('SBM-KL-ST-085', 'kerala', 'STARTERS', N, 'Kozhikode Chicken Fry', 'Bone-in, thick rice-flour spice crust'),
  d('SBM-KL-ST-086', 'kerala', 'STARTERS', N, 'Karimeen Pollichathu', 'Pearl spot wrapped in banana leaf and grilled'),
  d('SBM-KL-ST-087', 'kerala', 'STARTERS', N, 'Chemmeen Pepper Roast', 'Prawns sautéed with crushed pepper and onion'),
  d('SBM-KL-ST-088', 'kerala', 'STARTERS', N, 'Thattukada Egg Roast', 'Boiled eggs in caramelised sweet-spicy onion'),

  d('SBM-KL-MC-089', 'kerala', 'MAIN_CURRIES', V, 'Traditional Sadya Avial', 'Native vegetables, coconut oil, cumin yogurt'),
  d('SBM-KL-MC-090', 'kerala', 'MAIN_CURRIES', V, 'Olan', 'Ash gourd and red beans in pure coconut milk'),
  d('SBM-KL-MC-091', 'kerala', 'MAIN_CURRIES', V, 'Kalan', 'Sour yogurt curry with raw banana and fenugreek'),
  d('SBM-KL-MC-092', 'kerala', 'MAIN_CURRIES', V, 'Erissery', 'Pumpkin and red beans under roasted grated coconut'),
  d('SBM-KL-MC-093', 'kerala', 'MAIN_CURRIES', V, 'Thoran Beetroot', 'Chopped beetroot stir-fried with coconut and mustard'),
  d('SBM-KL-MC-094', 'kerala', 'MAIN_CURRIES', V, 'Vegetable Stew', 'Mixed vegetables in thin first-press coconut milk'),
  d('SBM-KL-MC-095', 'kerala', 'MAIN_CURRIES', N, 'Malabar Chicken Stew', 'Chicken and potato in spiced coconut milk'),
  d('SBM-KL-MC-096', 'kerala', 'MAIN_CURRIES', N, 'Syrian Christian Mutton Curry', 'Festive brown curry, whole spices'),
  d('SBM-KL-MC-097', 'kerala', 'MAIN_CURRIES', N, 'Malabar Prawn Mango Curry', 'Raw mango and prawns in yellow coconut'),
  d('SBM-KL-MC-098', 'kerala', 'MAIN_CURRIES', N, 'Alleppey Fish Curry', 'Tangy, raw mango and thick coconut cream'),
  d('SBM-KL-MC-099', 'kerala', 'MAIN_CURRIES', N, 'Beef Mappas', 'Tender beef in a creamy coriander coconut gravy'),
  d('SBM-KL-MC-100', 'kerala', 'MAIN_CURRIES', N, 'Chicken Varutharacha Curry', 'Gravy of deeply roasted grated coconut'),

  d('SBM-KL-RA-101', 'kerala', 'RICE_ASSETS', N, 'Thalassery Chicken Biryani', 'Short-grain Khyma rice, spices and ghee'),
  d('SBM-KL-RA-102', 'kerala', 'RICE_ASSETS', N, 'Malabar Mutton Dum Biryani', 'Fragrant low-spice short grain'),
  d('SBM-KL-RA-103', 'kerala', 'RICE_ASSETS', V, 'Neychoru', 'Malabar ghee rice with fried onion, raisin, cashew'),
  d('SBM-KL-RA-104', 'kerala', 'RICE_ASSETS', V, 'Kerala Matta Rice', 'Red parboiled rice with parippu curry'),
  d('SBM-KL-RA-105', 'kerala', 'RICE_ASSETS', V, 'Live Lace Appam Station', 'Palappam, crisp border and soft centre'),
  d('SBM-KL-RA-106', 'kerala', 'RICE_ASSETS', V, 'Flaky Malabar Parotta Counter', 'Layered flatbreads thrown live'),
  d('SBM-KL-RA-107', 'kerala', 'RICE_ASSETS', V, 'Live Idiyappam Stand', 'String hoppers with sweet coconut milk'),
  d('SBM-KL-RA-108', 'kerala', 'RICE_ASSETS', V, 'Puttu Station', 'Rice flour and coconut steamed live in bamboo'),

  d('SBM-KL-DE-109', 'kerala', 'DESSERTS_LIVE', V, 'Ada Pradhaman', 'Rice flakes, dark jaggery and coconut milk'),
  d('SBM-KL-DE-110', 'kerala', 'DESSERTS_LIVE', V, 'Pazham Pradhaman', 'Nendran banana paste and jaggery'),
  d('SBM-KL-DE-111', 'kerala', 'DESSERTS_LIVE', V, 'Unniyappam', 'Fried rice-jaggery fritters with banana pieces'),
  d('SBM-KL-DE-112', 'kerala', 'DESSERTS_LIVE', V, 'Palada Payasam', 'The pinkish wedding kheer, rice ada and milk'),
  d('SBM-KL-DE-113', 'kerala', 'DESSERTS_LIVE', V, 'Sukhiyan', 'Fried balls of green gram, jaggery and coconut'),
  d('SBM-KL-DE-114', 'kerala', 'DESSERTS_LIVE', V, 'Live Banana Fritter & Ice Cream', 'Hot fritter under a cold vanilla scoop'),

  /* ══════════════════════════════════════════════════════════════════
     UDUPI & KARNATAKA BRAHMIN · satvik, pure veg
     ══════════════════════════════════════════════════════════════════

     Split across two cuisine screens by what each dish actually is —
     see REGIONS above. Every one is vegetarian, and several of the
     curries are no-onion-no-garlic, which is said in the note because a
     satvik kitchen is a different claim from a vegetarian one. */

  d('SBM-KA-ST-115', 'karnataka', 'STARTERS', V, 'MTR-Style Ghee Rava Idli', 'Semolina idli, ghee, cashew, potato saagu'),
  d('SBM-KA-ST-116', 'karnataka', 'STARTERS', V, 'Maddur Vada', 'Flat, hard-crunchy onion-semolina with curry leaf'),
  d('SBM-KA-ST-117', 'udupi',     'STARTERS', V, 'Mangalore Bonda / Goli Baje', 'Spongy fried flour balls with coconut'),
  d('SBM-KA-ST-118', 'karnataka', 'STARTERS', V, 'Masala Vada', 'Bengal gram patties with ginger and green chilli'),
  d('SBM-KA-ST-119', 'karnataka', 'STARTERS', V, 'Vegetable Upma / Khara Bath', 'Roasted semolina with vegetables and ghee'),
  d('SBM-KA-ST-120', 'udupi',     'STARTERS', V, 'Surnoli', 'Udupi soft pockmarked sweet-savoury buttermilk pancakes'),
  d('SBM-KA-ST-121', 'udupi',     'STARTERS', V, 'Pathrode', 'Colocasia leaves rolled with rice paste, steamed and fried'),
  d('SBM-KA-ST-122', 'karnataka', 'STARTERS', V, 'Live Davangere Benne Dosa', 'Thin dosas loaded with butter, potato palya'),

  d('SBM-KA-MC-123', 'udupi',     'MAIN_CURRIES', V, 'Udupi Arachuvitta Sambar', 'Sweet-tangy, roasted coconut and jaggery'),
  d('SBM-KA-MC-124', 'udupi',     'MAIN_CURRIES', V, 'Pineapple Menaskai', 'Sweet, sour and spicy with fresh pineapple'),
  d('SBM-KA-MC-125', 'karnataka', 'MAIN_CURRIES', V, 'Beans & Carrot Palya', 'Satvik stir-fry under fresh grated coconut'),
  d('SBM-KA-MC-126', 'karnataka', 'MAIN_CURRIES', V, 'Beetroot Pachadi', 'Grated beetroot in seasoned yogurt and mustard'),
  d('SBM-KA-MC-127', 'udupi',     'MAIN_CURRIES', V, 'Udupi Mattu Gulla Huli', 'Seasonal green brinjal stew, temple sambar powder'),
  d('SBM-KA-MC-128', 'karnataka', 'MAIN_CURRIES', V, 'Tomato Pepper Saaru', 'Thin cumin-tamarind soup, built to digest a feast'),
  d('SBM-KA-MC-129', 'karnataka', 'MAIN_CURRIES', V, 'Majjige Huli', 'Ash gourd in seasoned coconut-buttermilk gravy'),
  d('SBM-KA-MC-130', 'karnataka', 'MAIN_CURRIES', V, 'Alu Gadde Saagu', 'Smashed potato with turmeric and mustard, for poori'),

  d('SBM-KA-RA-131', 'karnataka', 'RICE_ASSETS', V, 'Bisi Bele Bath', 'The festival spiced lentil rice, ghee and boondi'),
  d('SBM-KA-RA-132', 'karnataka', 'RICE_ASSETS', V, 'Temple-Style Puliyogare', 'Thick tamarind paste rice with peanuts'),
  d('SBM-KA-RA-133', 'karnataka', 'RICE_ASSETS', V, 'Mavinakai Chitranna', 'Raw mango grated rice, mustard and chilli'),
  d('SBM-KA-RA-134', 'karnataka', 'RICE_ASSETS', V, 'Ghee Rice', 'Small-grain rice tossed in ghee and cashews'),
  d('SBM-KA-RA-135', 'karnataka', 'RICE_ASSETS', V, 'Mosaranna', 'Curd rice with pomegranate, grapes and tempering'),
  d('SBM-KA-RA-136', 'karnataka', 'RICE_ASSETS', V, 'Vaangi Bath', 'Spiced brinjal masala tossed through white rice'),
  d('SBM-KA-RA-137', 'karnataka', 'RICE_ASSETS', V, 'Live Akki Rotti Counter', 'Rice flour flatbreads patted live with dill'),
  d('SBM-KA-RA-138', 'udupi',     'RICE_ASSETS', V, 'Live Neer Dosa Station', 'Lace-thin rice crepes with jaggery coconut milk'),

  d('SBM-KA-DE-139', 'karnataka', 'DESSERTS_LIVE', V, 'Chana Dal Holige / Obbattu', 'Sweet lentil flatbread under melted ghee'),
  d('SBM-KA-DE-140', 'karnataka', 'DESSERTS_LIVE', V, 'Kayi Holige', 'The coconut and jaggery variant'),
  d('SBM-KA-DE-141', 'udupi',     'DESSERTS_LIVE', V, 'Elaneer Payasa', 'Tender coconut milk reduction with pulp'),
  d('SBM-KA-DE-142', 'karnataka', 'DESSERTS_LIVE', V, 'Gasagase Payasa', 'Aromatic poppy seed and jaggery sweet'),
  d('SBM-KA-DE-143', 'karnataka', 'DESSERTS_LIVE', V, 'Pineapple Kesari Bath', 'Semolina sweet with pineapple and saffron'),
  d('SBM-KA-DE-144', 'karnataka', 'DESSERTS_LIVE', V, 'Dry Fruit Mysore Pak', 'Dense gram flour block with pistachio and almond'),
]

/* ══════════════════════════════════════════════════════════════════════
   LOOKUPS
   ══════════════════════════════════════════════════════════════════════ */

export const DISH_BY_ID = Object.fromEntries(DISHES.map(x => [x.id, x]))

/** Cheap membership test for anything that has to validate a list of ids. */
export const DISH_IDS = new Set(DISHES.map(x => x.id))

/**
 * Dishes for one cuisine screen, filtered by what the kitchen can cook.
 *
 * `diet` takes the same three values as the rest of the funnel:
 * 'veg' hides every non-veg dish, 'nonveg' hides every vegetarian one,
 * 'both' hides nothing.
 */
export function registryFor(cuisineId, diet = 'both') {
  return DISHES.filter(x =>
    x.active
    && x.cuisine === cuisineId
    && (diet === 'both' || x.diet === diet))
}

/** The same, folded into the course groups the picker renders. */
export function registryCourses(cuisineId, diet = 'both') {
  const mine = registryFor(cuisineId, diet)
  return COURSE_CATEGORIES
    .map(c => ({
      id: `${cuisineId}:${c.id}`,
      label: c.label,
      dishes: mine.filter(x => x.course === c.id),
    }))
    .filter(g => g.dishes.length)
}

/**
 * An id for a dish somebody stored as a string.
 *
 * Only for reading listings written before ids existed. Matching on the
 * result of this is matching on a name again with extra steps, so it is
 * a migration aid and nothing else — normalise hard, and return null
 * rather than guessing.
 */
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const BY_NORM = new Map(DISHES.map(x => [norm(x.name), x.id]))

export function resolveDishId(name) {
  return BY_NORM.get(norm(name)) ?? null
}
