/**
 * Real catering menus, from a real Bengaluru caterer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE THIS CAME FROM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Transcribed from S S Caterers' plantain-leaf menu card — four options,
 * priced per plate, minimum 100 guests. This is not invented sample data
 * and it must not be edited casually: a partner ticking "Option 02"
 * is agreeing to serve these dishes, and a customer reading it is being
 * told what will be on the leaf.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A MENU IS A LIST OF DISHES AND NOT A PRICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * data/cateringModel.js already records the argument this exists to
 * prevent: the most common dispute in Indian catering is a per-plate rate
 * that hid what was in the plate. "Catering, ₹500 a head" is not a
 * quote, it is the beginning of one — and the gap between what the
 * customer pictured and what arrived is where the money is lost.
 *
 * So the unit a partner lists is A NAMED MENU WITH ITS DISHES. The price
 * hangs off it. A customer choosing Option 03 can read all 29 lines
 * before they pay, and neither side can later claim they meant something
 * else.
 *
 * ── The "OR" matters ────────────────────────────────────────────────
 * Half these lines read "Poori OR Chapathi". That is how the trade
 * actually quotes: the caterer commits to a slot in the meal, and the
 * exact dish is settled on the call. Flattening those into single dishes
 * would misrepresent the offer and produce a spec nobody can honour.
 * They are kept verbatim.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PRICES ARE A FLOOR, AND THE APP MUST SAY SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * "450+" is what the caterer wrote, and the plus is load-bearing: the
 * final number moves with the menu that gets curated. Every price here
 * carries `from: true` and the UI renders it as "from ₹450" — never as
 * "₹450", which would be a promise this data cannot keep.
 *
 * GST is 5% on top and is stated separately, because a partner quoting
 * 450 means 450 before tax and a customer reading 450 assumes after.
 */

/* Vegetarian, per plate, minimum 100 guests. The caterer's own numbers. */
export const PLANTAIN_LEAF_MENUS = [
  {
    id: 'pl_option_1',
    name: 'Option 1',
    tier: 'Everyday feast',
    scan: 'The classic plantain-leaf meal',
    fromPrice: 450,
    minPax: 100,
    diet: 'veg',
    welcome: [],
    items: [
      'Paal Payasa OR Sabbakki Mango Payasa (seasonal)',
      'Salt',
      'Papad',
      'Pickle',
      'Hesarubele Kosambari OR Peanut Kosambari',
      'Aloo Batani Palya OR Aloo Palak Chopse',
      'Suvarnagadde Chopse OR Cabbage Channa Palya',
      'Poori',
      'Veg Kurma OR Channa Masala',
      'Veg Pulao OR Menthyabath',
      'Raitha',
      'White Rice',
      'Ghee',
      'Drumstick Sambar OR Soppu Sambar',
      'Mysore Rasam',
      'Curd',
      'Maddur Vada OR Onion Unde Pakoda',
      'Sweet: Glass Sandwich',
      'Beeda',
      'Banana',
      'Ice Cream',
      'Drinking water (bottle)',
    ],
  },
  {
    id: 'pl_option_2',
    name: 'Option 2',
    tier: 'With a welcome drink',
    scan: 'Biryani, paneer and two sweets',
    fromPrice: 500,
    minPax: 100,
    diet: 'veg',
    welcome: ['Welcome drink: Pulpy Grape Juice'],
    items: [
      'Shavige Sabbakki Banana Falooda Payasa',
      'Salt',
      'Pickle',
      'Papad',
      'Corn Dalimbe Kosambari OR Pineapple Corn Kosambari',
      'Beans Sprouts Palya OR Babycorn Batani Palya',
      'Tondekai Peanut Fry Palya OR Bhendi Pepper Fry',
      'Rumali Rotti OR Soft Roti',
      'Kadai Paneer OR Paneer Kolhapuri',
      'Veg Mughalai Dum Biryani OR Dum Nawabi Biryani',
      'Raitha',
      'White Rice',
      'Ghee',
      'Aloo Brinjal Drumstick Sambar OR Mix Veg Kolambu',
      'Mysore Rasam',
      'Curd',
      'Mirchi Bajji OR Veg Masala Vada',
      'Sweet: Bele Holige with milk and ghee',
      'Sweet: Kheer Kadam OR Bidar Paan',
      'Beeda',
      'Banana',
      'Ice Cream',
      'Drinking water (300 ml bottles)',
    ],
  },
  {
    id: 'pl_option_3',
    name: 'Option 3',
    tier: 'Welcome snacks and live dosa',
    scan: 'Two starters, three sweets, 29 items',
    fromPrice: 570,
    minPax: 100,
    diet: 'veg',
    welcome: [
      'Welcome drink: Pulpy Grape Juice, Watermelon Juice OR Mint Lime Cooler',
      'Welcome snacks: Gold Coin OR Cheese Nuggets',
    ],
    items: [
      'Adai Payasa OR Jackfruit Payasa (seasonal)',
      'Salt',
      'Pickle',
      'Papad',
      'Mix Fruits Kosambari OR Navilukosu Sprouts Kosambari',
      'Congress Kosambari OR Grated Mix Veg Kosambari',
      'Roasted Aloo with Gun Powder OR Gobi Batani Sukka',
      'Raw Banana Pepper Dry OR Capsicum Matar Dry',
      'Mango Gojju OR Nellikai Gojju',
      'Neeru Dosa OR Masala Dosa',
      'Coconut Chutney',
      'Batoora OR Palak Rumali Roti OR Coin Parata',
      'Channa Masala OR Paneer Butter Masala OR Kadai Veg',
      'Pudina Pulao OR Ghee Rice OR Kotte Biryani',
      'Raitha OR Kurma',
      'White Rice',
      'Ghee',
      'Pappukoora OR Mango Dal OR Tamil Nadu style Sambar',
      'Fried Chilly',
      'Mysore Rasam OR Tomato Rasam',
      'Curd',
      'Paneer Sholey OR Paneer Malai Kebab OR Chilly Paneer',
      'Babycorn Green Manchurian OR Veg Ball Ghee Roast OR Raw Banana Rawa Fry',
      'Sweet: Pudi Peni with Rabadi OR Chiroti with Sweet Boondi and Badam Milk OR Special Holige with ghee',
      'Sweet: Malpuva Roll OR Mango Malai Chap',
      'Sweet Beeda OR Maghai Beeda',
      'Banana',
      'Hot Jamoon with Ice Cream',
      'Drinking water (bottle)',
    ],
  },
  {
    id: 'pl_option_4',
    name: 'Option 4',
    tier: 'The full spread',
    scan: 'Four sweets, live dosa, seasonal specials',
    fromPrice: 620,
    minPax: 100,
    diet: 'veg',
    welcome: [
      'Welcome drink: Blueberry Milkshake OR Blue Lime Mojito OR Muskmelon Juice',
      'Welcome snacks: Cheese Balls',
    ],
    items: [
      'Shavige Litchi Payasa OR Tender Coconut Payasa',
      'Salt',
      'Papad',
      'Pickle',
      'Guava Pineapple Pomegranate Kosambari',
      'Congress Carrot Kosambari',
      'Arbi Chilly OR Lotus Stem Pepper Dry OR Babycorn Tilimili OR Divyalasu Tawa Fry (seasonal)',
      'Dahi Kebab OR Babycorn Angara OR Veg Chaina Town OR Jackfruit Cutlet (seasonal)',
      'Nellikai Gojju OR Capsicum Gojju OR Jackfruit Gojju (seasonal)',
      'Veg Pepper Masala Dosa OR Paneer Masala Dosa',
      'Coconut Chutney',
      'Rawa Poori OR Triangle Parata OR White Holige',
      'Kaju Matar Paneer OR Veg Kandahar OR Brinjal Ennegai',
      'Mughlai Veg Kotte Biryani OR Corn Pudina Bath',
      'Raitha',
      'White Rice with ghee',
      'Tomato Dal OR Arachuvitta Sambar',
      'Fried Chilly',
      'Mysore Rasam OR Pepper Rasam OR Madras Rasam',
      'Curd',
      'Sweet: Dates Holige OR Pumpkin Holige with ghee',
      'Sweet: Dryfruit Kesar Peta Roll OR Gulkand Sandwich',
      'Sweet: Karjoora Kali OR Coconut Kadam OR Kiwi Malai',
      'Sweet: Pista Halwa OR Nendra Banana Jamoon',
      'Sweet Beeda OR Magai Beeda',
      'Banana OR Stick Fruit OR Fruit Bowl',
      'Ice Cream (vanilla, pista or chilly guava)',
      'Drinking water (bottle)',
    ],
  },
]

/**
 * The buffet card — a different service from the plantain leaf.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE ARE NOT MORE OPTIONS ON THE LIST ABOVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Plantain leaf and buffet are two different jobs. The leaf is served to
 * seated guests in rows and the menu is a fixed sequence; a buffet is
 * counters people walk to, and it is quoted by COURSE — soup, starter,
 * bread, gravy, rice, sweet.
 *
 * A caterer often does one and not the other, and a family has usually
 * decided which they want before they ring anybody. Merging the two
 * lists would make a customer scroll past four menus that cannot happen
 * at their function.
 *
 * ── Options 3 and 4 stay structured ─────────────────────────────────
 * The caterer's card prints them as labelled courses rather than a
 * numbered list, and that structure is information: "Starter" with three
 * alternatives is a promise about how many starters arrive. Flattening
 * it into thirty bullet points would lose that.
 */
export const BUFFET_MENUS = [
  {
    id: 'bf_option_1',
    name: 'Buffet Option 1',
    tier: 'Simple buffet',
    scan: 'One gravy, one rice, two sweets',
    fromPrice: 450,
    minPax: 100,
    diet: 'veg',
    service: 'buffet',
    welcome: [],
    items: [
      'Pulka OR Methi Chapathi OR Poori',
      'Veg Kadai OR Haryali Mix Veg OR Channa Masala',
      'Veg Pulao OR Ghee Rice',
      'Raitha OR Dal Fry',
      'Papad',
      'Pickle',
      'Green Salad',
      'Babycorn Chilly OR Veg Ball Manchurian',
      'Sweet: Kala Jamoon OR Malai Sandwich',
      'Sweet: Jilebi OR Carrot Halwa',
      'Banana',
      'Ice Cream',
      'Paan',
      'Drinking water (bottle)',
    ],
  },
  {
    id: 'bf_option_2',
    name: 'Buffet Option 2',
    tier: 'Soup, two starters, biryani',
    scan: 'Welcome drink and eighteen items',
    fromPrice: 500,
    minPax: 100,
    diet: 'veg',
    service: 'buffet',
    welcome: ['Welcome drink: Fruit Punch OR Kokum Juice'],
    items: [
      'Soup: Manchow Soup with Fried Noodles OR Spinach Carrot Soup',
      'Starter: Cheese Corn Balls OR French Fries',
      'Starter: Veg Shangai Roll OR Babycorn Sathe',
      'Batoora OR Butter Soft Roti OR Azwan Parata',
      'Channa Masala OR Veg Jodhpuri Masala OR Kadai Paneer',
      'Veg Kolhapuri OR Veg Kandahar OR Capsicum Matar Masala',
      'Veg Hyderabadi Dum Biryani OR Palak Dum Veg Biryani',
      'Raitha',
      'Dal Fry OR Dal Makhani',
      'Papad',
      'Pickle',
      'Green Salad, Russian Salad',
      'Sweet: Glass Sandwich OR Peta Roll OR Moongdal Halwa',
      'Sweet: Champakali OR Angoor Rasmalai OR Raj Bhogh',
      'Banana',
      'Ice Cream',
      'Beeda',
      'Drinking water (300 ml bottle)',
    ],
  },
  {
    id: 'bf_option_3',
    name: 'Buffet Option 3',
    tier: 'Twelve courses',
    scan: 'Live dosa, biryani, two sweets',
    fromPrice: 570,
    minPax: 100,
    diet: 'veg',
    service: 'buffet',
    welcome: [
      'Welcome drink: Tatilingu Milkshake OR Litchi Milkshake OR Pudina Lime Juice',
      'Welcome snacks: Harabara Kebab',
    ],
    courses: [
      { course: 'Soup',    of: ['Tomato Basil Shorba OR Corn Coriander Soup OR Hot & Sour Soup'] },
      { course: 'Starter', of: ['Crispy Corn OR Jackfruit Cutlet (seasonal) OR Palak Veg Gold Coin OR Suvarnagadde Rawa Fry',
                                'Paneer Malai Kebab OR Paneer Sathe OR Pahadi Paneer Tikka'] },
      { course: 'Bread',   of: ['Rawa Poori OR Beetroot Poori', 'Coin Parata OR Butter Roti'] },
      { course: 'Gravy',   of: ['Kadai Paneer', 'Channa Masala', 'Dal Thadka'] },
      { course: 'Dosa',    of: ['Ghee Masala Dosa OR Pudi Masala Dosa', 'Coconut Chutney'] },
      { course: 'Rice',    of: ['Veg Hyderabadi Dum Biryani OR Peas Pulao', 'Raitha', 'White Rice',
                                'Mysore Rasam / Pepper Rasam / Chennai Rasam', 'Curd Rice'] },
      { course: 'Salad',   of: ['Green Salad / Corn Salad / Mix Sprouts Salad', 'Papad & Pickle'] },
      { course: 'Sweet',   of: ['Hot Jilebi with Rabdi OR Grapes Jilebi',
                                'Kaju Pineapple Slice / Kaju Mohini / Anjoor Dryfruit Roll'] },
      { course: 'Fruit',   of: ['Banana'] },
      { course: 'Dessert', of: ['Carrot Halwa with Ice Cream'] },
      { course: 'Paan',    of: ['Paan'] },
      { course: 'Drink',   of: ['Drinking water (300 ml bottle)'] },
    ],
  },
  {
    id: 'bf_option_4',
    name: 'Buffet Option 4',
    tier: 'The full buffet',
    scan: 'Three starters, three gravies, four sweets',
    fromPrice: 620,
    minPax: 100,
    diet: 'veg',
    service: 'buffet',
    welcome: [
      'Welcome drink: Popcorn Caramel Milkshake OR Nariyal Punch OR Pineapple Shikanji OR Rose Milkshake',
      'Welcome snacks: Veg Bullets OR Babycorn Stick, Monaco Stuffed Biscuits OR Fried Almond & Cashew',
    ],
    courses: [
      { course: 'Soup',    of: ['Tomato Basil Shorba OR Corn Coriander Soup OR Hot & Sour Soup OR Almond Soup'] },
      { course: 'Starter', of: ['Crispy Corn OR Jackfruit Cutlet (seasonal) OR Palak Veg Gold Coin OR Suvarnagadde Rawa Fry',
                                'Paneer Malai Kebab OR Paneer Sathe OR Pahadi Paneer Tikka OR Cheese Finger'] },
      { course: 'Bread',   of: ['Rawa Poori OR Beetroot Poori OR Methi Chapathi',
                                'Coin Parata OR Butter Roti OR Lacha Parata'] },
      { course: 'Gravy',   of: ['Channa Masala OR Veg Kurma OR Veg Jaal Freez',
                                'Paneer Tikka Masala OR Suneri Masala OR Veg Milon Hundy',
                                'Dal Thadka OR Masoor Dal Thadka OR Palak Dal'] },
      { course: 'Dosa',    of: ['Ghee Masala Dosa OR Pudi Masala Dosa', 'Coconut Chutney'] },
      { course: 'Rice',    of: ['Veg Hyderabadi Dum Biryani OR Peas Pulao OR Fried Rice',
                                'Raitha OR Hot Garlic Sauce', 'White Rice',
                                'Mysore Rasam / Pepper Rasam / Chennai Rasam', 'Curd Rice'] },
      { course: 'Salad',   of: ['Green Salad / Corn Salad / Mix Sprouts Salad', 'Papad & Pickle'] },
      { course: 'Sweet',   of: ['Crispy Jilebi with Rabdi OR Grapes Jilebi with Rabdi',
                                'Kaju Pineapple Slice / Kaju Mohini / Anjoor Dryfruit Roll',
                                'Strawberry Prem Bhog / Rose Chum Chum / Badam Bhog'] },
      { course: 'Fruit',   of: ['Banana / Cut Fruits / Stick Fruits'] },
      { course: 'Dessert', of: ['Carrot Halwa with Ice Cream OR Ice Cream with Chocolate Sauce'] },
      { course: 'Paan',    of: ['Magai Paan OR Sweet Beeda'] },
      { course: 'Drink',   of: ['Drinking water (300 ml bottle)'] },
    ],
  },
]

/**
 * Beegara Oota — the in-laws' feast.
 *
 * ⚠ CHECK THIS NAME WITH THE CEO.
 *
 * Asked for as "bigger oota" in a voice note, which is almost certainly
 * ಬೀಗರ ಊಟ — the ceremonial meal a Karnataka family serves the beegaru,
 * the in-laws' party. It is the most watched meal of the wedding and it
 * is judged item by item, which is exactly why it is quoted separately
 * from the ordinary reception lunch.
 *
 * It is transcribed here as a distinct menu rather than folded into the
 * options above because a caterer who does not do it should not be sent
 * one, and a family asking for it will not accept a substitute. If the
 * intended term was something else, the id and name change and nothing
 * else does.
 *
 * The dishes are the traditional core of the meal. They are NOT from the
 * S S Caterers card — that card has no Beegara Oota page — so this list
 * is a starting point for a caterer to edit rather than a quotation.
 */
export const BEEGARA_OOTA = {
  id: 'beegara_oota',
  name: 'Beegara Oota',
  tier: 'The in-laws’ feast',
  scan: 'Traditional, served on the leaf, judged item by item',
  fromPrice: 650,
  minPax: 50,
  diet: 'veg',
  needsReview: true,
  welcome: ['Welcome drink: Panaka OR Majjige'],
  items: [
    'Obbattu / Holige with ghee',
    'Paal Payasa OR Shavige Payasa',
    'Kosambari (hesarubele and kadlebele)',
    'Salt, Pickle, Papad',
    'Two Palya (seasonal vegetables)',
    'Gojju',
    'Chitranna OR Puliyogare',
    'Poori OR Chapathi',
    'Saagu OR Kurma',
    'Bisi Bele Bath',
    'White Rice with ghee',
    'Tovve OR Bele Saaru',
    'Huli (sambar)',
    'Majjige Huli',
    'Rasam',
    'Curd rice',
    'Ambode OR Bonda',
    'Kharabath OR Uppittu',
    'Banana',
    'Beeda',
    'Drinking water',
  ],
}

/**
 * Beegara Oota, the non-vegetarian one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS A SEPARATE MENU AND NOT A FLAG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The vegetarian beegara oota above is a Brahmin-tradition meal. The
 * non-vegetarian one is a different meal from a different set of
 * communities — Vokkaliga and Lingayat families across Mandya, Mysuru and
 * the old Mysore districts — and it is not "the veg menu plus chicken".
 * The structure changes: the meal is built around ragi mudde and a meat
 * saaru, and the payasa that opens a Brahmin oota is served at the end
 * here, if at all.
 *
 * Marking one menu "non-veg: true" would have produced a card listing
 * obbattu and holige alongside nati koli saaru, which is not a meal
 * anybody in Mandya has ever eaten.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE THIS CAME FROM, AND WHAT THAT MEANS
 * ══════════════════════════════════════════════════════════════════════
 *
 * NOT from the S S Caterers card — that is a pure-veg house and says so
 * on its cover. This is the traditional structure of the meal as it is
 * served in the region, assembled from what the tradition actually is
 * rather than from any one caterer's quotation.
 *
 * So it carries `needsReview` and the app shows a caterer a line saying
 * so. The dishes are a starting point they edit into their own; the
 * price is indicative. Presenting it as a quotation would be inventing a
 * caterer's menu for them, which is the one thing this whole file is
 * careful not to do.
 */
export const BEEGARA_OOTA_NONVEG = {
  id: 'beegara_oota_nonveg',
  name: 'Beegara Oota — non-veg',
  tier: 'The in-laws\' feast, Mandya style',
  scan: 'Ragi mudde, nati koli saaru, served on the leaf',
  fromPrice: 850,
  minPax: 50,
  diet: 'nonveg',
  needsReview: true,
  indicative: true,
  welcome: ['Welcome drink: Majjige OR Panaka'],
  items: [
    'Kosambari',
    'Salt, Pickle, Papad',
    'Palya (seasonal vegetable)',
    'Ragi Mudde',
    'Nati Koli Saaru',
    'Nati Koli Fry OR Chicken Sukka',
    'Kuri (mutton) Saaru',
    'Kuri Fry OR Mutton Chops',
    'Boti Palya',
    'Motte Saaru (egg curry)',
    'Akki Rotti OR Jolada Rotti',
    'Chapathi',
    'White Rice',
    'Bassaru OR Kaalu Saaru',
    'Tovve',
    'Majjige (buttermilk)',
    'Curd rice',
    'Obbattu OR Holige',
    'Payasa',
    'Banana',
    'Beeda',
    'Drinking water',
  ],
}


/**
 * Counters, priced per guest and added on top of a menu.
 *
 * Named by the CEO: cut fruit, ice cream, beeda, kids and waffles. These
 * are the ones that actually get asked for in Bengaluru; the list is
 * short on purpose, because a counter nobody books is a tick box between
 * a partner and finishing this form.
 */
export const FOOD_COUNTERS = [
  { id: 'cut_fruit',  name: 'Cut fruit counter',  fromPrice: 60,  scan: 'Seasonal fruit, cut to order' },
  { id: 'ice_cream',  name: 'Ice cream counter',  fromPrice: 70,  scan: 'Scooped live, two or three flavours' },
  { id: 'beeda',      name: 'Beeda counter',      fromPrice: 40,  scan: 'Made at the counter after the meal' },
  { id: 'kids',       name: 'Kids counter',       fromPrice: 120, scan: 'Fries, nuggets, pasta, mocktails' },
  { id: 'waffles',    name: 'Waffle counter',     fromPrice: 110, scan: 'Made to order, with toppings' },
  { id: 'chaat',      name: 'Chaat counter',      fromPrice: 90,  scan: 'Pani puri, sev puri, dahi puri' },
  { id: 'dosa',       name: 'Live dosa counter',  fromPrice: 100, scan: 'Plain, masala and set dosa' },
]

/**
 * Non-vegetarian menus.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE THESE COME FROM, AND WHAT THAT MEANS
 * ══════════════════════════════════════════════════════════════════════
 *
 * NOT from the S S Caterers card — that is a pure-veg house and says so
 * on its cover. There is no non-veg page to transcribe, so these are
 * built from how the meal is actually served in this market rather than
 * from any one caterer's quotation.
 *
 * Every one carries `indicative` and the card shows a CHECK PRICE badge.
 * The rates are roughly 1.4× the equivalent vegetarian tier, which is
 * the ratio the trade generally works to — a starting point a caterer
 * edits, never a number we are quoting on their behalf.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FIVE, NOT THREE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first pass had three, and they were all "the veg menu, plus
 * chicken". That is not how anyone eats here. A Mandya nati koli oota, a
 * coastal fish meal and a biryani-house reception are three different
 * meals, and a caterer who does one of them should not have to tick a
 * card describing another.
 */
export const NON_VEG_MENUS = [
  {
    id: 'nv_option_1',
    name: 'Non-veg Option 1',
    tier: 'Everyday feast',
    scan: 'One chicken main with the full veg spread',
    fromPrice: 630,
    minPax: 100,
    diet: 'nonveg',
    indicative: true,
    welcome: [],
    items: [
      'Chicken Kabab OR Fish Fry',
      'Chicken Curry OR Chicken Sukka',
      'Egg Masala',
      'Papad, Pickle, Salt',
      'Kosambari',
      'Palya (seasonal vegetable)',
      'Poori OR Chapathi',
      'Veg Kurma',
      'White Rice',
      'Sambar',
      'Rasam',
      'Curd',
      'Sweet: Gulab Jamoon',
      'Banana',
      'Ice Cream',
      'Drinking water (bottle)',
    ],
  },
  {
    id: 'nv_option_2',
    name: 'Non-veg Option 2',
    tier: 'With biryani',
    scan: 'Biryani, two starters, the veg spread',
    fromPrice: 720,
    minPax: 100,
    diet: 'nonveg',
    indicative: true,
    welcome: ['Welcome drink: Pulpy Grape Juice OR Fresh Lime'],
    items: [
      'Chicken 65 OR Chilly Chicken',
      'Fish Tawa Fry OR Prawn Ghee Roast',
      'Chicken Dum Biryani OR Mutton Biryani',
      'Chicken Kolhapuri OR Mutton Sukka',
      'Raitha',
      'Papad, Pickle',
      'Kosambari',
      'Palya',
      'Rumali Rotti OR Butter Roti',
      'Dal Fry',
      'White Rice',
      'Rasam',
      'Curd',
      'Sweet: Kala Jamoon OR Malai Sandwich',
      'Banana',
      'Ice Cream',
      'Beeda',
      'Drinking water (300 ml bottle)',
    ],
  },
  {
    id: 'nv_option_3',
    name: 'Non-veg Option 3',
    tier: 'The full spread',
    scan: 'Three starters, two mains, live counter',
    fromPrice: 850,
    minPax: 100,
    diet: 'nonveg',
    indicative: true,
    welcome: [
      'Welcome drink: Watermelon Juice OR Mint Lime Cooler',
      'Welcome snacks: Chicken Nuggets OR Fish Fingers',
    ],
    items: [
      'Soup: Chicken Clear Soup OR Mutton Paya Soup',
      'Chicken Tikka OR Tandoori Chicken',
      'Fish Amritsari OR Prawn Koliwada',
      'Mutton Seekh Kabab',
      'Chicken Dum Biryani OR Mutton Dum Biryani',
      'Butter Chicken OR Chicken Chettinad',
      'Mutton Rogan Josh OR Nati Koli Saaru',
      'Egg Masala',
      'Batoora OR Rumali Rotti OR Naan',
      'Dal Makhani',
      'Raitha, Green Salad',
      'White Rice',
      'Rasam',
      'Curd',
      'Sweet: Hot Jilebi with Rabdi',
      'Sweet: Kaju Pineapple Slice',
      'Banana OR Cut Fruits',
      'Ice Cream',
      'Beeda',
      'Drinking water (bottle)',
    ],
  },
  {
    id: 'nv_coastal',
    name: 'Coastal non-veg',
    tier: 'Mangalorean',
    scan: 'Gassi, ghee roast, neer dosa',
    fromPrice: 780,
    minPax: 50,
    diet: 'nonveg',
    indicative: true,
    welcome: ['Welcome drink: Solkadhi OR Tender Coconut'],
    items: [
      'Kori Gassi',
      'Chicken Ghee Roast OR Prawn Ghee Roast',
      'Bangude Fry OR Anjal Tawa Fry',
      'Fish Curry (coastal)',
      'Marvai Sukka (clams, seasonal)',
      'Neer Dosa',
      'Kori Rotti',
      'Boiled Rice (kucchalakki)',
      'Dali Thoy',
      'Sukka (dry vegetable)',
      'Pickle, Papad',
      'Buttermilk',
      'Sweet: Patholi OR Halbai',
      'Banana',
      'Drinking water',
    ],
  },
  {
    id: 'nv_donne',
    name: 'Donne biryani meal',
    tier: 'Bengaluru military hotel style',
    scan: 'Donne biryani, nati koli, kaal soup',
    fromPrice: 690,
    minPax: 50,
    diet: 'nonveg',
    indicative: true,
    welcome: [],
    items: [
      'Nati Koli Donne Biryani OR Mutton Donne Biryani',
      'Nati Koli Saaru',
      'Chicken Kabab OR Mutton Chops',
      'Mutton Kaal Soup',
      'Boiled Egg',
      'Onion and Lemon',
      'Raitha',
      'Kharabath OR Akki Rotti',
      'Curd',
      'Beeda',
      'Drinking water',
    ],
  },
]


/* The caterer's own terms, shown wherever a price is. Reproduced rather
   than paraphrased: "the host arranges the shamiana" is the sort of line
   that decides an argument, and a paraphrase would not. */
/* The caterer's standing terms. The minimum-order line that used to sit
   here is gone: it is a fact about THIS caterer, asked once in their own
   words at the end of the flow, not a rule printed on every card. */
export const CATERING_NOTES = [
  'GST 5% extra',
  'The quoted rate includes food, service, cleaning and transportation',
  'Serving tables, chairs, hand wash and shamiana are arranged by the host',
  'Additional consumption of food is charged extra',
]

/* How a menu reaches the guest. A caterer usually does one of these
   well and the other reluctantly, so it is asked before the menus are
   shown -- there is no point offering four buffet cards to somebody who
   only serves on the leaf. */
export const SERVICE_STYLES = [
  { id: 'leaf',   label: 'Plantain leaf', scan: 'Seated, served in rows' },
  { id: 'buffet', label: 'Buffet',        scan: 'Counters, guests walk up' },
]

export const ALL_MENUS = [
  ...PLANTAIN_LEAF_MENUS,
  ...BUFFET_MENUS,
  BEEGARA_OOTA,
  BEEGARA_OOTA_NONVEG,
  ...NON_VEG_MENUS,
]

/**
 * The dish lines of a menu, whichever shape it is stored in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Plantain-leaf menus carry a flat `items` array. Buffet options 3 and 4
 * carry `courses`, because the caterer's card prints them as labelled
 * courses and that structure is information -- "Starter" with three
 * alternatives is a promise about how many starters arrive.
 *
 * Every screen that read `menu.items.length` therefore crashed on those
 * two cards with
 *
 *   TypeError: Cannot read properties of undefined (reading 'length')
 *
 * and because "North Indian festive" is exactly the cuisine that returns
 * the buffet cards, picking it and pressing Continue took a partner
 * straight to the error boundary. One shape assumed, two shapes stored.
 *
 * Every reader goes through here now, so a third shape breaks one
 * function rather than four screens.
 */
export function menuLines(menu) {
  if (!menu) return []
  if (Array.isArray(menu.items)) return menu.items
  if (Array.isArray(menu.courses)) {
    return menu.courses.flatMap(c =>
      (c.of ?? []).map(line => (c.course ? `${c.course}: ${line}` : line)))
  }
  return []
}

/** How many dishes a menu has, for a card that says so. */
export function menuLineCount(menu) {
  return menuLines(menu).length
}

export const MENU_BY_ID = Object.fromEntries(ALL_MENUS.map(m => [m.id, m]))

/**
 * Which set menus to show a caterer.
 *
 * Filtered by BOTH the cuisines they cook and how they serve, because
 * those are two independent facts and either one alone shows the wrong
 * cards. A pure-veg Brahmin kitchen that only serves on the leaf should
 * see four menus, not twelve — and the eight it does not see are eight
 * fewer chances to tick something they cannot honour.
 *
 * `serves` comes straight from the "How do you serve?" answer in
 * partnerSpecs, so nothing extra is asked to make this work.
 */
export function menusFor({ cuisines = [], serves = [], diet = null } = {}) {
  const byCuisine = new Set()

  /* Which set menus each cuisine can actually be served as.
   *
   * Keyed by the ids in data/cuisineMenus.js, so a partner's answer and a
   * customer's request are literally the same string.
   *
   * The mapping is about SERVICE STYLE, not about taste: a Kerala sadya
   * and a Karnataka oota are both plantain-leaf meals and share those
   * cards; a Mughlai kitchen serves a buffet and does not serve a sadya.
   * Getting this wrong shows a caterer a card they cannot honour, which
   * is the nonsense-option failure this whole rebuild exists to end. */
  const LEAF = [...PLANTAIN_LEAF_MENUS, BEEGARA_OOTA]
  const BUFFET = [...BUFFET_MENUS]
  const NONVEG = [BEEGARA_OOTA_NONVEG, ...NON_VEG_MENUS]

  const BY_CUISINE = {
    /* South Indian leaf traditions. */
    karnataka:           [...LEAF, ...BUFFET, ...NONVEG],
    mysuru_royal:        [...LEAF, ...BUFFET],
    udupi:               [...LEAF, ...BUFFET, ...NONVEG],
    tamil:               [...LEAF, ...BUFFET, ...NONVEG],
    andhra:              [...LEAF, ...BUFFET, ...NONVEG],
    kerala:              [...LEAF, ...BUFFET, ...NONVEG],

    /* Buffet traditions. A tandoor kitchen does not serve on a leaf. */
    north_indian:        [...BUFFET, ...NONVEG],
    mughlai:             [...BUFFET, ...NONVEG],
    bengali:             [...BUFFET, ...NONVEG],
    maharashtrian:       [...BUFFET, ...NONVEG],
    indo_chinese:        [...BUFFET, ...NONVEG],
    continental:         [...BUFFET, ...NONVEG],
    chaat_street:        [...BUFFET],

    /* Vegetarian by definition. Offering these kitchens a non-veg card
       is the clearest nonsense option there is. */
    gujarati_rajasthani: [...LEAF, ...BUFFET],
    jain_satvik:         [...PLANTAIN_LEAF_MENUS],

    multi_cuisine:       [...LEAF, ...BUFFET, ...NONVEG],
  }

  for (const c of cuisines) {
    for (const m of (BY_CUISINE[c] ?? ALL_MENUS)) byCuisine.add(m)
  }

  let list = cuisines.length ? [...byCuisine] : [...ALL_MENUS]

  /* How they serve. `banana_leaf` and `buffet` are the two that map onto
     a menu card; `plated` and `live_counter` are add-ons to either, so
     they narrow nothing. */
  const wantsLeaf = serves.includes('banana_leaf')
  const wantsBuffet = serves.includes('buffet')
  if (wantsLeaf !== wantsBuffet) {
    list = list.filter(m => (wantsBuffet ? m.service === 'buffet' : m.service !== 'buffet'))
  }

  /* The first question on the catering form, and the one that decides
     the most. A pure-veg kitchen must never be shown a non-veg card to
     tick, and a non-veg-only house does not want four vegetarian menus
     in front of it. 'both' narrows nothing, which is the right answer
     for most caterers in this market. */
  if (diet === 'veg')    list = list.filter(m => m.diet !== 'nonveg')
  if (diet === 'nonveg') list = list.filter(m => m.diet === 'nonveg')

  return list
}

/** Kept for callers that only know the cuisine. */
export function menusForCuisine(cuisineId) {
  return menusFor({ cuisines: [cuisineId] })
}
