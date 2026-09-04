/**
 * The à la carte dish library, from S S Caterers' South Indian pages.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SEPARATE FROM cateringMenus.js
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two different things a caterer sells, and conflating them is how a
 * quote goes wrong.
 *
 *   A SET MENU is a package. "Option 3, from ₹570 a plate" — a fixed
 *   sequence of 29 dishes at a price per head. It is the thing that gets
 *   BOOKED.
 *
 *   THE DISH LIBRARY is capability. 50 palyas, 40 sambars, 45 kootus.
 *   It is what a caterer can COOK, and it is how a family who wants
 *   Majjige Huli at their griha pravesha finds somebody who makes it.
 *
 * A caterer ticks dishes here once. Those ticks are what a coordinator
 * searches when a customer asks for something specific, and what fills
 * the "anything else?" conversation without a phone call.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TRANSCRIBED, NOT INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Spellings are the caterer's own — "Suvarnagadde", "Kadlebele",
 * "Thondekai". They are not normalised to a dictionary, because a
 * Bengaluru caterer searching for their own dish will type it the way
 * they say it, and because correcting somebody's menu is not our job.
 *
 * Where the same dish appears twice on the card under different
 * spellings (Mango Gojju is listed three times), the duplicate is
 * dropped: a list that repeats itself reads as carelessness, and a
 * partner ticking the same box twice learns nothing.
 */

/* Order matters. This is the order a South Indian meal is served in and
   the order the caterer's own card prints it, so a cook scanning the
   list finds things where they expect them. */
export const SOUTH_INDIAN_DISHES = [
  {
    id: 'rice_bath',
    label: 'Rice baths',
    scan: 'The one-pot rices',
    items: [
      'Mango Chitranna', 'Bisibelebath', 'Avalakki Belebath', 'Shavige Belebath',
      'Ghee Rice', 'Sabbakki Rice Bath', 'Pudina Rice', 'Tomato Bath',
      'Capsicum Bath', 'Cabbage Rice', 'Coconut Milk Rice Bath', 'Aloo Rice Bath',
      'Millet Pongal', 'Millet Bisibelebath',
    ],
  },
  {
    id: 'dose',
    label: 'Dose & tiffin',
    scan: 'Made live at the counter',
    items: [
      'Rava Dose', 'Plain Dose', 'Uddina Dose', 'Pesarattu',
      'Banana Kesaribath', 'Sabbakki Kesaribath', 'Rice Kesari Bath',
    ],
  },
  {
    id: 'kosambari',
    label: 'Kosambari',
    scan: 'The salads that open the meal',
    items: [
      'Moong Dal Kosambari', 'Sprouted Green Gram Kosambari',
      'Pomegranate Green Gram Kosambari', 'Corn Kosambari', 'Fruits Kosambari',
      'Bengal Gram Kosambari (baked)', 'Sprouts Kosambari', 'Corn Dalimbe Kosambari',
      'Kadlebele Kosambari', 'Peanut (boiled) Kosambari', 'Congress Kosambari',
      'Kadle Bele (boiled) Kosambari', 'Canopy Kosambari',
      'Pineapple Corn Pomegranate Kosambari', 'Baby Cashew Pomegranate Kosambari',
      'Navilukosu Sprouts Kosambari', 'Mix Veg Kosambari', 'Dry Fruit Kosambari',
    ],
  },
  {
    id: 'gojju',
    label: 'Gojju',
    scan: 'Sweet, sour and hot',
    items: [
      'Nellikayi Gojju', 'Bittergourd Gojju', 'Mango Gojju', 'Pineapple Gojju',
      'Grape Gojju', 'Tamarind Gojju', 'Tomato Onion Gojju', 'Avarekalu Gojju',
      'Kadlekalu Gojju', 'Hesarukalu Gojju', 'Tomato Gojju', 'Ginger Gojju (Kara)',
      'Ginger Gojju (Sweet)', 'Sweet Sour Gojju', 'Jack Fruit Gojju (Seasonal)',
      'Dry Grapes Gojju', 'Spice Gojju', 'Inji Puli', 'Amtekai Pickle', 'Amtekai Gojju',
    ],
  },
  {
    id: 'palya',
    label: 'Palya',
    scan: 'The dry vegetable dishes',
    items: [
      'Nugge Soppu Avarebele Palya', 'Gorikai Hesarukalu Palya', 'Carrot Batani Palya',
      'Soppu Kalu Palya', 'Tondekai Channa Palya', 'Sorekai Kadlebele Palya',
      'Navilukosu Batani Palya', 'Cabbage Kadlebele Palya',
      'Seemebadane Alasandekalu Palya', 'Karamani Hesarukalu Palya', 'Aloo Batani Palya',
      'Heerekai Hesarukalu Palya', 'Heerekai Kadlebele Palya',
      'Hagalakayi Balli Alasande Palya', 'Suvarnagadde Kadlekalu Palya',
      'Balekai Alasande Kalu Palya', 'Cabbage Kadlebele Palya', 'Beans Kadlebele Palya',
      'Badanekai Batani Palya', 'Padavalakai Kadlebele Palya', 'Beetroot Batani Palya',
      'Sihi Kumbalakai Batani Palya', 'Bendekayi White Alasande Palya',
      'Jackfruit Batani Palya (Seasonal)', 'Beans Palya', 'Cabbage Palya',
      'Karamani Palya', 'Mix Veg Palya', 'Gorikai Palya', 'Suvarnagadde Palya',
      'Carrot Palya', 'Mix Kalu Palya', 'Tondekai Cashew Palya', 'Hagalakai Palya',
      'Bendekayi Palya', 'Jack Fruit Palya (Seasonal)', 'Balekai Palya',
      'Red Pumpkin Palya', 'Navilukosu Palya', 'Pundi Palya', 'Beetroot Palya',
      'Paduvalakai Palya', 'Heerekai Palya', 'Aloo Batani Palya', 'Aloo Fry Palya',
      'Baby Aloo Dry Palya', 'Baby Aloo Roast (tossed with chutney pudi)',
      'Balekai Ghee Roast', 'Dondakaya Vepudu', 'Channa Husli', 'Hurali Kalu Husli',
      'Badanekayi Fry Palya', 'Suvarnagadde Chopsey', 'Aloo Chopsey', 'Balekai Chopsey',
      'Thondekai Penut Fry', 'Raw Banana Podimas', 'Vankaya Fry', 'Karavali Chops',
      'Kundapura Gassi', 'Jeegujje Sukka', 'Baby Potato Sukka', 'Babycorn Broccoli Palya',
    ],
  },
  {
    id: 'dry_items',
    label: 'Dry items & fried',
    scan: 'Bajji, bonda, vada',
    items: [
      'Mirchi Bajji', 'Aloo Bonda', 'Veg Bonda', 'Masala Vada', 'Dahi Vada',
      'Dahi Masala Vada', 'Variety of Manchurian', 'Maddur Vada',
      'Onion Uduru Pakoda', 'Unde Pakoda', 'Balekai Bajji', 'Sante Bonda',
      'Mangalore Bajji', 'Sabakki Vada', 'Raw Banana Masala Vada',
      'Mixdal Masala Vada', 'Banana Flower Vada',
    ],
  },
  {
    id: 'sambar',
    label: 'Sambar & huli',
    scan: 'Forty of them',
    items: [
      'Kumbalakai Sambar', 'Heerekai Sambar', 'Sorekai Sambar', 'Padavalakai Sambar',
      'Mooli Sambar', 'Navilukosu Sambar', 'Southekai Sambar', 'Beetroot Sambar',
      'Nuggekayi Aloo Sambar', 'Badanekai Sambar', 'Soppina Sambar',
      'Menthe Soppu Sambar', 'Seemebadane Sambar', 'Beans Sambar', 'Karamani Sambar',
      'Kempu Kumbala Sambar', 'Mix Kalu Sambar', 'Cabagge Sambar', 'Bendekai Sambar',
      'Gorikai Sambar', 'Avare Kalu Sambar', 'Halasina Kai Sambar (Seasonal)',
      'Alasande Kalu Sambar', 'White Pampkin Huli', 'Mangalore Cucumbar Huli',
      'Aloo Nuggekai Badane Sambar', 'Mix Veg Sambar', 'Kalu Huli', 'Seemebadane Huli',
      'Mattigulla Huli', 'Mattigulla Bolu Huli', 'Majjige Huli (Pamkin, Karamani, Bendikai)',
      'Andra Style Sambar', 'Andra Style Green Sambar',
      'Arachuvitta Sambar (Tamil Style)', 'Kara Kulambu (Tamil Style)',
      'Puli Kulambu (Tamil Style)', 'Mix Veg Sambar (Tamil Style)',
      'Basale Soppina Sambar', 'Harive Soppina Sambar', 'Bendikai Puli Kulambu',
    ],
  },
  {
    id: 'kootu',
    label: 'Curry & kootu',
    scan: 'Gravies, sagu and gassi',
    items: [
      'Suvarnagadde Huli Kootu', 'Heerekai Kalu Kootu', 'Padavalakai Kadlebele Kootu',
      'Navil Kosu Hesarubele Kootu', 'Kadlebeeja Badane Kootu', 'Kalu Badane Kootu',
      'Soppu Kalu Kootu', 'Avarebele Sihi Kumbalakai Kootu', 'Alasande Cabbage Kootu',
      'Gorikayi Hesarukalu Kootu', 'Gorikayi Tomato Kootu', 'Mix Kalu Bele Kootu',
      'Kempu Kumbalakai Hesarubele Kootu', 'Boodu Kumbalakai Hesarukalu Kootu',
      'Badhane Kai Kari Kootu', 'Aloo Batani Kootu', 'Batani Sabakki Kootu',
      'Kadlekalu Seemebadane Kootu', 'Seemebadane Kootu', 'Southekayi Hesaru Bele Kootu',
      'Boodu Kumbala Avarekalu Kootu', 'Beens Hesarukalu Kootu',
      'Suvarnagadde Channa Kootu', 'Balekai Alasande Kootu', 'Halasina Kai Kadalekalu Kootu',
      'Veg Sagu', 'Aloo Sagu', 'Bombay Sagu', 'Veg Kurma', 'Avarekalu Sagu',
      'Hitikida Bele Kurma (Seasonal)', 'Aloo Batani Gassi', 'Channa Gassi',
      'Balekai Gassi', 'Kadala Curry (Kerala Style)', 'Badhane Kai Yengai',
      'Stuffed Brinjal Engai (North Karnataka Style)', 'Andra Vankaya Curry',
      'Mix Veg Kootu', 'Heerekai Parchukutu', 'Kalu Kootu', 'Aviyal', 'Pumpkin Kootu',
      'Suvarnagadde Puli Kootu', 'Mangalore Cucumbar Kootu',
    ],
  },
  {
    id: 'rasam',
    label: 'Rasam',
    scan: 'Twenty-five kinds',
    items: [
      'Mysore Rasam', 'Madras Rasam', 'Pepper Rasam', 'Tomoto Pepper Rasam',
      'Lemon Pepper Rasam', 'Lemon Rasam', 'Udupi Rasam', 'Jeera Rasam',
      'Daniya Rasam', 'Andra Rasam', 'Beetroot Rasam', 'Kokum Rasam', 'Tomato Rasam',
      'Garlic Rasam', 'Drumstick Rasam', 'White Rasam (Drink)', 'Hurali Rasam',
      'Green Chilli Rasam', 'Onion Rasam', 'Pudina Rasam', 'Palak Rasam',
      'Menthe Rasam', 'Mango Rasam', 'Appe Midi Saru', 'Shunti Kalumenasu Saru',
      'Hesarubele Saru', 'Kerala Rasam',
    ],
  },
  {
    id: 'thambuli',
    label: 'Thambuli',
    scan: 'The cooling curd preparations',
    items: [
      'Jeera Thambuli', 'Ridgegourd Thambuli', 'Curryleaves Thambuli',
      'Ginger Thambuli', 'Keere Thambuli', 'Basale Thambuli', 'Pumpkin Thambuli',
      'Kaaki Sopina Thambuli', 'Drumstick Thambuli', 'Bittergourd Thambuli',
      'Menthya Thambuli', 'Shunti Thambuli', 'Dodda Patre Thambuli', 'Palak Thambuli',
      'Beetroot Thambuli',
    ],
  },
  {
    id: 'payasa',
    label: 'Payasa',
    scan: 'How the meal opens',
    items: [
      'Wheat Grain Payasa', 'Moong Dal Payasa', 'Date Palm Payasa', 'Adai Payasa',
      'Avalakki Payasa', 'Carrot Payasa', 'Bengal Gram Payasa', 'Ridge Gourd Payasa',
      'Bottle Gourd Payasa', 'Gasagase Payasa', 'Pumpkin Payasa', 'Dry Fruits Payasa',
      'Banana Payasa', 'Shavige Sabbakki Payasa', 'Sabbakki Payasa', 'Pal Payasa',
      'Shavige Payasa', 'Pomegranate Payasa', 'Greengram Payasa', 'Apple Payasa',
      'Rawa (Sooji) Bengalgram Payasa', 'Cashew Dry Grapes Payasa', 'Macaroni Payasa',
      'Almond Payasa', 'Appe Payasa', 'Paradi Payasa', 'Jack Fruit Payasa (Seasonal)',
      'Sabbakki Shavige Akki Payasa', 'Pista Payasa', 'Shavige Sabbakki Banana Falooda Payasa',
      'Parippu Payasam', 'Sheer Kurma', 'Kadlebele Sabbakki Payasa',
      'Kadlebele Rice Payasa', 'Rava Payasa', 'Tender Coconut Payasa', 'Hayagreeva',
      'Hesarukalu Payasa', 'Dates Payasa', 'Khova Payasa', 'Litchi Sabbakki Payasa',
      'Sabbakki Mango Payasa', 'Sabbakki Jackfruit Payasa (Seasonal)', 'Kadale Payasa',
    ],
  },
  {
    id: 'holige',
    label: 'Holige',
    scan: 'Obbattu, every filling',
    items: [
      'Badam Holige', 'Pista Holige', 'Karjoor Holige', 'Kaju Holige', 'Kai Holige',
      'Bele Holige', 'Kadle Bele Holige', 'Sakre Holige', 'Anjoor Holige',
      'Carrot Holige', 'Kumbalakai Holige',
    ],
  },
  {
    id: 'sweets',
    label: 'Sweets',
    scan: 'Halwa, laddu and the rest',
    items: [
      'Capsicum Halwa', 'Avalakki Laddu', 'Mint Champakali', 'Sapota Champakali',
      'Sapota Jelly', 'Mint Jelly', 'Wheat Halwa', 'Mango Halubayi', 'Sapota Halubayi',
      'Pineapple Halubayi', 'Jackfruit Halubayi', 'Kadali Halubayi', 'Nendra Halwa',
      'Churma Marwadi', 'Mini Malai Ghevar', 'Gajar Halwa', 'Malpova Rabdi',
      'Chandrakala', 'Maida Gujia', 'Mothi Pak', 'Atta Ka Halwa', 'Suji Ka Halwa',
      'Gaver', 'Mothi Chur Laddu', 'Boondi Laddu', 'Rabdi Ghewar',
    ],
  },
  {
    id: 'bengali_sweets',
    label: 'Bengali sweets',
    scan: 'The counter everybody stops at',
    items: [
      'Rasgulla', 'Raj Bhog', 'Rasmalai', 'Angoori Rasmalai', 'Malai Sandwich',
      'Kamala Bhog', 'Kesar Bhog', 'Gajar Bahar', 'Anarkali', 'Pakiza', 'China Toast',
      'Rabdi Plain', 'Champakali', 'Malai Chop', 'Mango Malai Chap', 'Rajaram Sweet',
      'Malai Roll', 'Rose Raj', 'Raskadam', 'Kheer Mohan', 'Kheer Kadam',
    ],
  },
]

/**
 * Drinks.
 *
 * Kept apart from the food because a caterer who runs a tea counter is
 * often not the caterer who cooks the meal, and because a customer asks
 * for these separately — "can you do filter coffee at the mandap" is its
 * own booking.
 */
export const BEVERAGES = [
  {
    id: 'tea',
    label: 'Tea',
    items: [
      'Masala Chai', 'Green Tea', 'Black Tea', 'White Tea', 'Oolong Tea',
      'Earl Grey Tea', 'Chamomile Tea', 'Peppermint Tea', 'Ginger Tea',
      'Lemongrass Tea', 'Tulsi Tea', 'Kashmiri Kahwa', 'Butter Tea (Po Cha)',
      'Matcha Tea', 'Hibiscus Tea', 'Rooibos Tea', 'Jasmine Tea', 'Darjeeling Tea',
      'Assam Tea', 'Saffron Tea', 'Yerba Mate', 'Blue Pea Flower Tea',
      'Longjing Tea', 'Irish Breakfast Tea', 'Thai Tea',
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    items: [
      'Espresso', 'Americano', 'Cappuccino', 'Latte', 'Macchiato', 'Mocha',
      'Flat White', 'Café au Lait', 'Filter Coffee (South Indian)', 'Turkish Coffee',
      'Vietnamese Egg Coffee', 'Irish Coffee', 'Affogato', 'Café Bombón',
      'Café Cubano', 'Dalgona Coffee', 'Arabic Qahwa', 'Caramel Latte',
      'Hazelnut Cappuccino', 'Chicory Coffee',
    ],
  },
  {
    id: 'hot_other',
    label: 'Other hot drinks',
    items: [
      'Hot Chocolate', 'Spiced Hot Chocolate', 'Golden Milk (Turmeric Latte)',
      'Warm Apple Cider', 'Hot Lemon Water with Honey', 'Hot Almond Milk with Saffron',
      'Horlicks', 'Bournvita', 'Hot Malted Milk', 'Hot Soya Milk',
      'Ginger Milk (Adrak Wala Doodh)', 'Kesar Badam Milk',
      'Hot Jaggery Water with Spices', 'Barley Tea',
    ],
  },
  {
    id: 'juice',
    label: 'Fresh juice',
    items: [
      'Grape', 'Watermelon', 'Pineapple', 'Muskmelon', 'Sapota', 'Pomegranate',
      'Custard Apple', 'Tender Coconut Punch', 'Fruit Punch', 'Nariyal Punch',
    ],
  },
  {
    id: 'milkshake',
    label: 'Milkshakes',
    items: [
      'Pista Badam', 'Strawberry', 'Litchi', 'Butter Scotch', 'Malai Milk',
      'Chocolate', 'Oreo Chocolate', 'Anjoor', 'Creamy Vanilla', 'Rose',
      'Mango (Seasonal)', 'Banana', 'Sapota', 'Custard Apple',
    ],
  },
  {
    id: 'mocktail',
    label: 'Mocktails & welcome drinks',
    items: [
      'Aam Panna', 'Jaljeera', 'Pina Colada', 'Kesaria Thandai', 'Salted Lassi',
      'Choco Moco Shake', 'Strawberry Delight', 'Orange Sunrise', 'Italian Smooch',
      'Cold Coffee with Ice Cream', 'Black Currant Delight', 'Litchi Shake',
      'Fresh Khandari Anar Juice', 'Coconut Monalisa', 'Blue Moon',
      'Red Bull Mocktail', 'Blue Haban', 'Green Mojito', 'Mint Mojito',
      'Kiwi Lime', 'Mango Magic', 'Ginger Kalol', 'Jampadigi Banana',
      'Kairi Pudina', 'Pinka Coconut', 'Green Apple Cucumber', 'Rose Milk with Ferrero',
    ],
  },
]


/**
 * North Indian, Chinese and continental.
 *
 * The South Indian pages are where this caterer's depth is, and it would
 * have been easy to stop there — but a Bengaluru wedding routinely wants
 * a paneer counter next to the leaf, and a caterer who does both had
 * nothing to tick for half their business.
 *
 * Drawn from the buffet card's gravy, starter and bread courses, which is
 * where those dishes actually appear.
 */
export const NORTH_INDIAN_DISHES = [
  {
    id: 'ni_starter',
    label: 'Starters',
    scan: 'What goes round before the meal',
    items: [
      'Paneer Malai Kebab', 'Paneer Sathe', 'Pahadi Paneer Tikka', 'Paneer Tikka',
      'Harabara Kebab', 'Dahi Kebab', 'Cheese Corn Balls', 'Cheese Finger',
      'Cheese Nuggets', 'Gold Coin', 'Palak Veg Gold Coin', 'Crispy Corn',
      'Jackfruit Cutlet (Seasonal)', 'Suvarnagadde Rawa Fry', 'Veg Shangai Roll',
      'Babycorn Sathe', 'Babycorn Angara', 'Veg Bullets', 'Babycorn Stick',
      'French Fries', 'Veg Chaina Town', 'Babycorn Chilly', 'Veg Ball Manchurian',
      'Babycorn Green Manchurian', 'Chilly Paneer', 'Paneer Sholey',
    ],
  },
  {
    id: 'ni_soup',
    label: 'Soups',
    items: [
      'Tomato Basil Shorba', 'Corn Coriander Soup', 'Hot & Sour Soup',
      'Manchow Soup with Fried Noodles', 'Spinach Carrot Soup', 'Almond Soup',
    ],
  },
  {
    id: 'ni_gravy',
    label: 'Gravies',
    scan: 'Paneer, channa and dal',
    items: [
      'Kadai Paneer', 'Paneer Kolhapuri', 'Paneer Butter Masala',
      'Paneer Tikka Masala', 'Kaju Matar Paneer', 'Channa Masala',
      'Veg Kadai', 'Haryali Mix Veg', 'Veg Jodhpuri Masala', 'Veg Kolhapuri',
      'Veg Kandahar', 'Capsicum Matar Masala', 'Veg Jaal Freez', 'Suneri Masala',
      'Veg Milon Hundy', 'Veg Kurma', 'Kadai Veg', 'Brinjal Ennegai',
      'Dal Fry', 'Dal Makhani', 'Dal Thadka', 'Masoor Dal Thadka', 'Palak Dal',
    ],
  },
  {
    id: 'ni_bread',
    label: 'Breads',
    items: [
      'Pulka', 'Methi Chapathi', 'Poori', 'Rawa Poori', 'Beetroot Poori',
      'Rumali Rotti', 'Palak Rumali Roti', 'Soft Roti', 'Butter Roti',
      'Batoora', 'Azwan Parata', 'Coin Parata', 'Triangle Parata', 'Lacha Parata',
      'Naan', 'Kulcha',
    ],
  },
  {
    id: 'ni_rice',
    label: 'Biryani & pulao',
    items: [
      'Veg Hyderabadi Dum Biryani', 'Veg Mughalai Dum Biryani', 'Dum Nawabi Biryani',
      'Palak Dum Veg Biryani', 'Mughlai Veg Kotte Biryani', 'Kotte Biryani',
      'Peas Pulao', 'Veg Pulao', 'Pudina Pulao', 'Corn Pudina Bath',
      'Ghee Rice', 'Fried Rice', 'Jeera Rice',
    ],
  },
  {
    id: 'ni_salad',
    label: 'Salads & accompaniments',
    items: [
      'Green Salad', 'Corn Salad', 'Mix Sprouts Salad', 'Russian Salad',
      'Raitha', 'Hot Garlic Sauce', 'Papad', 'Pickle', 'Curd Rice',
    ],
  },
  {
    id: 'ni_sweet',
    label: 'North Indian sweets',
    items: [
      'Hot Jilebi with Rabdi', 'Crispy Jilebi with Rabdi', 'Grapes Jilebi',
      'Kaju Pineapple Slice', 'Kaju Mohini', 'Anjoor Dryfruit Roll',
      'Strawberry Prem Bhog', 'Rose Chum Chum', 'Badam Bhog', 'Kala Jamoon',
      'Malai Sandwich', 'Moongdal Halwa', 'Peta Roll', 'Glass Sandwich',
      'Angoor Rasmalai', 'Raj Bhogh', 'Carrot Halwa', 'Gulab Jamoon',
      'Hot Jamoon with Ice Cream',
    ],
  },
]

/**
 * Every group, with each dish appearing exactly once.
 *
 * Seven dishes were on two lists. Some for a real reason -- Ghee Rice
 * belongs to both the South Indian rice baths and the biryani course --
 * and two ("Aloo Batani Palya", "Cabbage Kadlebele Palya") are printed
 * twice on the caterer's own Palya page.
 *
 * Either way a partner must not meet the same tick box twice: the second
 * one teaches them nothing, and a tick that does not change the count
 * reads as a bug. First list wins, which keeps each dish where a cook
 * would look for it.
 */
const seen = new Set()

/**
 * Non-vegetarian, and there is a lot of it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS AS LONG AS THE VEGETARIAN LIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * The source card is a pure-veg house, so the first pass of this file had
 * 584 vegetarian dishes and about a dozen non-veg ones tacked onto the
 * end. A caterer running a Mandya nati koli kitchen opened the library
 * and found almost nothing of their own in it — which tells them,
 * correctly, that the app was not built with them in mind.
 *
 * Karnataka non-veg is not one cuisine. It is at least four with little
 * in common: the nati koli and ragi mudde of the old Mysore districts,
 * the coconut-and-tamarind gassi of the coast, Kodagu pandi curry, and
 * the biryani houses. A partner should find their own tradition here
 * rather than a generic "chicken curry".
 *
 * ── No prices ───────────────────────────────────────────────────────
 * This is a capability list. What a dish COSTS is the caterer's own
 * number and it is asked once, on the price screen, in their words.
 */
export const NON_VEG_DISHES = [
  {
    id: 'nv_koli',
    label: 'Chicken — Karnataka',
    scan: 'Nati koli and the old Mysore kitchen',
    items: [
      'Nati Koli Saaru', 'Nati Koli Fry', 'Koli Saaru (country style)',
      'Chicken Sukka', 'Chicken Ghee Roast', 'Kori Gassi', 'Kori Rotti',
      'Chicken Chettinad', 'Chicken Pepper Fry', 'Chicken Kabab',
      'Chicken 65', 'Chilly Chicken', 'Chicken Manchurian',
      'Chicken Lollipop', 'Chicken Majestic', 'Chicken Sukka Dry',
      'Bassaru with Chicken', 'Koli Palya', 'Chicken Pulimunchi',
      'Chicken Kempu Saaru', 'Chicken Masala Fry', 'Chicken Tawa Fry',
      'Nati Koli Kabab', 'Chicken Erachi Varuval',
    ],
  },
  {
    id: 'nv_chicken_north',
    label: 'Chicken — North Indian & tandoor',
    items: [
      'Butter Chicken', 'Chicken Tikka', 'Tandoori Chicken', 'Murgh Malai Tikka',
      'Chicken Seekh Kabab', 'Chicken Reshmi Kabab', 'Afghani Chicken',
      'Chicken Kadai', 'Chicken Kolhapuri', 'Chicken Rogan Josh',
      'Chicken Handi', 'Chicken Do Pyaza', 'Methi Murgh', 'Chicken Korma',
      'Chicken Angara', 'Chicken Lababdar', 'Chicken Changezi',
      'Murgh Musallam', 'Chicken Hariyali Tikka', 'Chicken Achari',
    ],
  },
  {
    id: 'nv_mutton',
    label: 'Mutton',
    scan: 'Kuri saaru, sukka, chops',
    items: [
      'Kuri Saaru', 'Mutton Sukka', 'Mutton Ghee Roast', 'Mutton Chops',
      'Mutton Fry', 'Mutton Pepper Fry', 'Mutton Rogan Josh', 'Mutton Korma',
      'Mutton Chettinad', 'Mutton Kolhapuri', 'Mutton Seekh Kabab',
      'Mutton Shammi Kabab', 'Mutton Keema', 'Keema Matar', 'Mutton Do Pyaza',
      'Mutton Handi', 'Bassaru with Mutton', 'Boti Palya', 'Boti Fry',
      'Mutton Kaal Soup', 'Paya', 'Mutton Bone Soup', 'Kodagu Pandi Curry',
      'Mutton Sukka Dry', 'Mutton Masala Curry',
    ],
  },
  {
    id: 'nv_fish',
    label: 'Fish & seafood',
    scan: 'Coastal Karnataka',
    items: [
      'Anjal Tawa Fry', 'Bangude Fry', 'Bangude Pulimunchi', 'Fish Gassi',
      'Meen Kolambu', 'Fish Curry (coastal)', 'Fish Rawa Fry', 'Fish Amritsari',
      'Fish Tikka', 'Fish Manchurian', 'Fish Fingers', 'Prawn Ghee Roast',
      'Prawn Sukka', 'Prawn Gassi', 'Prawn Koliwada', 'Prawn Fry',
      'Prawn Biryani', 'Squid Fry', 'Squid Masala', 'Crab Sukka',
      'Crab Masala', 'Clam Sukka (Marvai)', 'Marvai Gassi', 'Fish Fry Masala',
      'Neer Dosa with Fish Curry',
    ],
  },
  {
    id: 'nv_egg',
    label: 'Egg',
    items: [
      'Motte Saaru', 'Egg Curry', 'Egg Masala', 'Egg Burji', 'Egg Roast',
      'Egg Ghee Roast', 'Egg Manchurian', 'Egg Pepper Fry', 'Egg Biryani',
      'Egg Chilly', 'Boiled Egg Masala', 'Egg Kolambu',
    ],
  },
  {
    id: 'nv_biryani',
    label: 'Biryani & rice',
    items: [
      'Chicken Dum Biryani', 'Mutton Dum Biryani', 'Hyderabadi Chicken Biryani',
      'Hyderabadi Mutton Biryani', 'Donne Biryani', 'Nati Koli Donne Biryani',
      'Bhatkal Biryani', 'Ambur Biryani', 'Thalassery Biryani',
      'Prawn Biryani', 'Fish Biryani', 'Keema Biryani',
      'Chicken Pulao', 'Mutton Pulao', 'Chicken Fried Rice',
      'Chicken Ghee Rice', 'Kaima Rice',
    ],
  },
  {
    id: 'nv_starter',
    label: 'Non-veg starters',
    items: [
      'Chicken Tikka Platter', 'Fish Fingers', 'Prawn Tempura',
      'Chicken Nuggets', 'Chicken Spring Roll', 'Chicken Momos',
      'Chicken Cutlet', 'Mutton Cutlet', 'Chicken Samosa', 'Chicken Puff',
      'Chicken Wings', 'Drums of Heaven', 'Chicken Satay', 'Chicken Popcorn',
      'Fish Tikka Skewers',
    ],
  },
  {
    id: 'nv_accompaniment',
    label: 'With the meal',
    scan: 'What a non-veg oota is eaten with',
    items: [
      'Ragi Mudde', 'Akki Rotti', 'Jolada Rotti', 'Neer Dosa',
      'Kadambuttu', 'Bassaru', 'Kaalu Saaru', 'Majjige',
      'Onion Raitha', 'Lemon Wedge and Onion',
    ],
  },
]

export const ALL_DISH_GROUPS = [
  ...SOUTH_INDIAN_DISHES,
  ...NORTH_INDIAN_DISHES,
  ...NON_VEG_DISHES,
  ...BEVERAGES,
].map(g => ({
  ...g,
  items: g.items.filter(i => {
    const k = i.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }),
}))

export const DISH_GROUP_BY_ID = Object.fromEntries(ALL_DISH_GROUPS.map(g => [g.id, g]))

/** How many dishes exist in total. Used to show a caterer their coverage. */
export const TOTAL_DISHES = ALL_DISH_GROUPS.reduce((n, g) => n + g.items.length, 0)
