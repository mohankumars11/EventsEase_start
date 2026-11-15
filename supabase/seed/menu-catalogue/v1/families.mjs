/**
 * Menu Studio — the customer-facing cuisine families, their regional
 * variants, the menu sections and the occasion rules. DATA, loaded into the
 * database by scripts/apply-menu-catalogue.mjs (migration 200's tables) and
 * compiled for the app by scripts/build-menu-catalogue.mjs.
 *
 * A family groups existing catalogue cuisines (sambramo_cuisines ids from
 * supabase/seed/food-catalogue/v1/cuisines.json) under the name a customer
 * recognises. `cities` only RAISES a family for an event in that city; it
 * never hides another family (Mohan's spec, Part 8: a Bengaluru customer can
 * still choose Bengali). `photo` is the Pexels query for the family card.
 */

export const SECTIONS = [
  ['welcome', 'Welcome Drinks'], ['soups', 'Soups'], ['starters', 'Starters'], ['live', 'Live Counters'],
  ['mains', 'Main Course'], ['rice', 'Rice & Biryani'], ['breads', 'Breads'], ['curries', 'Curries & Gravies'],
  ['sides', 'Accompaniments'], ['salads', 'Salads'], ['desserts', 'Desserts & Sweets'], ['icecream', 'Ice Creams'],
  ['beverages', 'Beverages'], ['special', 'Special Additions'],
].map(([id, name], i) => ({ id, name, sort: (i + 1) * 10 }))

const F = (id, name, region, line, variants, cities, photo) => ({ id, name, region, line, variants, cities, photo })

export const FAMILIES = [
  F('karnataka', 'Karnataka', 'Mysore · Bengaluru · Udupi · Coastal · North Karnataka · Malnad',
    'Banana-leaf oota, Mysore pak and Mangalore ghee roast', [
      ['ka_mysuru', 'Mysore'], ['ka_bengaluru', 'Bengaluru'], ['ka_north', 'North Karnataka'], ['ka_mangalorean', 'Coastal Karnataka'],
      ['ka_udupi', 'Udupi'], ['ka_malenadu', 'Malnad'], ['ka_traditional', 'Karnataka traditional'], ['ka_wedding', 'Karnataka wedding'],
    ], ['bengaluru', 'bangalore', 'mysuru', 'mysore', 'mangaluru', 'mangalore', 'hubballi', 'dharwad', 'udupi', 'belagavi'], 'south indian thali banana leaf'),
  F('andhra', 'Andhra', 'Andhra traditional · Coastal Andhra · Rayalaseema',
    'Gongura, avakaya and the heat Andhra is known for', [
      ['ap_traditional', 'Andhra traditional'], ['ap_coastal', 'Coastal Andhra'], ['ap_rayalaseema', 'Rayalaseema'], ['ap_non_veg', 'Andhra non-vegetarian'],
    ], ['vijayawada', 'visakhapatnam', 'guntur', 'tirupati', 'nellore', 'kurnool', 'kakinada'], 'andhra meals'),
  F('telangana', 'Telangana', 'Telangana traditional · Hyderabadi',
    'Bagara rice, mirchi ka salan and dum biryani', [
      ['tg_traditional', 'Telangana traditional'], ['tg_hyderabadi', 'Hyderabadi'], ['tg_hyderabadi_biryani', 'Hyderabadi biryani'], ['tg_non_veg', 'Telangana non-vegetarian'],
    ], ['hyderabad', 'secunderabad', 'warangal', 'karimnagar'], 'hyderabadi biryani'),
  F('tamil', 'Tamil', 'Tamil traditional · Chettinad · Kongunadu · Tamil wedding feast',
    'Kalyana sappadu, Chettinad pepper and Chennai tiffin', [
      ['tn_traditional', 'Tamil traditional'], ['tn_chettinad', 'Chettinad'], ['tn_kongunadu', 'Kongunadu'], ['tn_wedding', 'Tamil wedding feast'],
      ['tn_chennai', 'Chennai'], ['tn_tiffin', 'Tamil tiffin'],
    ], ['chennai', 'coimbatore', 'madurai', 'trichy', 'tiruchirappalli', 'salem', 'hosur', 'vellore'], 'idli sambar'),
  F('kerala', 'Kerala', 'Kerala traditional · Malabar · Syrian Christian-inspired · Sadya',
    'Sadya on a leaf, Malabar biryani and appam with stew', [
      ['kl_sadya', 'Kerala Sadya'], ['kl_malabar', 'Malabar'], ['kl_central', 'Syrian Christian-inspired'], ['kl_veg', 'Kerala vegetarian'], ['kl_thalassery', 'Thalassery'],
    ], ['kochi', 'cochin', 'thiruvananthapuram', 'trivandrum', 'kozhikode', 'calicut', 'thrissur'], 'kerala sadya'),
  F('north_indian', 'North Indian', 'Punjabi · Mughlai · Delhi-style · Awadhi · North Indian traditional',
    'Dal makhani, tandoor breads and rich Mughlai gravies', [
      ['ni_punjabi', 'Punjabi'], ['ni_mughlai', 'Mughlai'], ['ni_delhi', 'Delhi-style'], ['ni_awadhi', 'Awadhi'], ['ni_veg', 'North Indian traditional'],
      ['ni_wedding_buffet', 'North Indian wedding buffet'],
    ], ['delhi', 'new delhi', 'gurugram', 'gurgaon', 'noida', 'chandigarh', 'amritsar', 'lucknow', 'ludhiana'], 'paneer butter masala naan'),
  F('gujarati', 'Gujarati', 'Gujarati traditional · Kathiyawadi · Gujarati thali',
    'Farsan, sweet-sour dal and a full thali', [
      ['wi_gujarati', 'Gujarati traditional'], ['wi_kathiawadi', 'Kathiyawadi'],
    ], ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'gandhinagar'], 'dhokla'),
  F('rajasthani', 'Rajasthani', 'Marwari · Rajasthani traditional · Royal Rajasthani',
    'Dal baati churma, gatte and laal maas', [
      ['wi_rajasthani', 'Rajasthani traditional'], ['wi_marwari', 'Marwari'],
    ], ['jaipur', 'jodhpur', 'udaipur', 'bikaner', 'ajmer', 'kota'], 'dal baati'),
  F('bengali', 'Bengali', 'Bengali traditional · Bengali vegetarian · Fish & meat',
    'Luchi, shorshe ilish and mishti doi', [
      ['ei_bengali', 'Bengali'],
    ], ['kolkata', 'calcutta', 'howrah', 'siliguri', 'durgapur'], 'bengali fish curry'),
  F('maharashtrian', 'Maharashtrian', 'Maharashtrian traditional · Kolhapuri · Malvani · Mumbai-style',
    'Puran poli, tambda rassa and Mumbai street favourites', [
      ['wi_maharashtrian', 'Maharashtrian traditional'], ['wi_malvani', 'Malvani'],
    ], ['mumbai', 'pune', 'nagpur', 'nashik', 'kolhapur', 'thane', 'navi mumbai'], 'pav bhaji'),
  F('odia', 'Odia', 'Odia traditional · Temple-inspired · Coastal Odisha',
    'Dalma, besara and chhena poda', [['ei_odia', 'Odia']], ['bhubaneswar', 'cuttack', 'puri', 'rourkela'], 'indian dal rice thali'),
  F('kashmiri', 'Kashmiri', 'Wazwan-style · Kashmiri Pandit · Kashmiri tea',
    'Rogan josh, gushtaba and saffron kahwa', [['ni_kashmiri', 'Kashmiri']], ['srinagar', 'jammu'], 'rogan josh'),
  F('northeast', 'Assamese & Northeast', 'Assamese · Naga · Sikkim & the hills',
    'Masor tenga, smoked meats, momos and thukpa', [
      ['ei_assamese', 'Assamese'], ['ne_naga', 'Naga'], ['ne_general', 'Northeast'],
    ], ['guwahati', 'shillong', 'kohima', 'dimapur', 'gangtok', 'imphal', 'agartala'], 'momos'),
  F('chinese', 'Chinese & Indo-Chinese', 'Chinese · Indo-Chinese · Cantonese-style',
    'Hakka noodles, Manchurian and dim sum', [['in_chinese', 'Chinese'], ['oi_indo_chinese', 'Indo-Chinese']], [], 'hakka noodles'),
  F('continental', 'Continental', 'Continental · French-inspired · British',
    'Soups, bakes, grills and plated dinners', [['in_continental', 'Continental'], ['in_french', 'French-inspired'], ['in_british', 'British']], [], 'grilled chicken plated dinner'),
  F('italian', 'Italian', 'Pasta · Pizza · Trattoria',
    'Pasta, pizza, risotto and tiramisu', [['in_italian', 'Italian']], [], 'pasta'),
  F('mexican', 'Mexican & Tex-Mex', 'Mexican · Tex-Mex',
    'Tacos, burritos, nachos and churros', [['in_mexican', 'Mexican'], ['in_american', 'Tex-Mex']], [], 'tacos'),
  F('arabic', 'Arabic & Middle Eastern', 'Arabic · Lebanese · Yemeni mandi · Turkish & Persian',
    'Shawarma, mezze, mandi and kunafa', [
      ['in_middle_eastern', 'Arabic'], ['in_lebanese', 'Lebanese'], ['in_turkish', 'Turkish'], ['in_persian', 'Persian'],
    ], [], 'shawarma'),
  F('mediterranean', 'Mediterranean', 'Greek · Spanish · Mediterranean',
    'Mezze, souvlaki, paella and tapas', [['in_mediterranean', 'Mediterranean'], ['in_greek', 'Greek'], ['in_spanish', 'Spanish']], [], 'greek salad'),
  F('asian', 'Asian Fusion', 'Thai · Japanese · Korean · Pan-Asian',
    'Thai curries, sushi, Korean fried chicken', [
      ['in_thai', 'Thai'], ['in_japanese', 'Japanese'], ['in_korean', 'Korean'], ['in_pan_asian', 'Pan-Asian'],
    ], [], 'thai green curry'),
  F('global_party', 'Global Party Food', 'Kids’ parties · Cocktails · High tea · College fests',
    'Burgers, sliders, sandwiches and party bites', [['in_american', 'American'], ['sp_kids', 'Kids'], ['oi_snacks', 'Party snacks']], [], 'party food platter'),
  F('indian_fusion', 'Indian Fusion', 'Street food · Modern Indian · Fusion desserts',
    'Chaat counters, desi tapas and modern Indian plates', [['oi_street_food', 'Indian street food'], ['oi_snacks', 'Indian snacks']], [], 'indian street food chaat'),
].map((f, i) => ({ ...f, sort: (i + 1) * 10 }))

/*
 * Occasion rules — which menus suit an occasion. A template rule (the
 * occasion's own template, src/customer/data/templates.js) wins over its
 * category rule; every one of the 18 categories has a rule, so all 438
 * occasions resolve (scripts/check-menu-catalogue.mjs proves it).
 *   tags  raise menus carrying these tags
 *   meals the usual meals, raising menus served at them
 *   serve the usual service styles
 *   avoid tags that do not suit the occasion (lowered, never hidden)
 */
const R = (scope, key, tags, meals, serve, avoid = [], note = '') => ({ id: `${scope}:${key}`, scope, key, tags, meals, serve, avoid, note })

export const RULES = [
  // ── occasion templates with their own food sense ──
  R('template', 'firstBirthday', ['family', 'kids', 'party', 'celebration', 'traditional'], ['dinner', 'lunch'], ['buffet', 'counters'], ['cocktail', 'corporate'], 'Family-friendly menus, party snacks, biryani, desserts and ice cream'),
  R('template', 'kidsParty', ['kids', 'party', 'street'], ['hightea', 'dinner'], ['buffet', 'counters'], ['cocktail', 'ritual', 'spicy'], 'Food children finish'),
  R('template', 'babyRite', ['traditional', 'ritual', 'family'], ['lunch'], ['leaf', 'buffet'], ['cocktail', 'stall'], 'Naming ceremony: regional vegetarian feasts on a leaf'),
  R('template', 'babyShower', ['traditional', 'family', 'ritual'], ['lunch'], ['leaf', 'buffet'], ['cocktail', 'stall']),
  R('template', 'housewarming', ['traditional', 'ritual', 'family', 'breakfast'], ['lunch', 'breakfast'], ['leaf', 'buffet'], ['cocktail', 'stall'], 'Gruhapravesha: traditional lunch or a morning tiffin'),
  R('template', 'grihaPraveshAfterWedding', ['traditional', 'ritual', 'family'], ['lunch'], ['leaf', 'buffet'], ['cocktail', 'stall']),
  R('template', 'homePooja', ['ritual', 'traditional'], ['lunch', 'breakfast'], ['leaf', 'buffet'], ['cocktail', 'stall', 'spicy']),
  R('template', 'communityPuja', ['ritual', 'traditional', 'grand'], ['lunch'], ['leaf', 'buffet'], ['cocktail']),
  R('template', 'wedding', ['wedding', 'grand', 'traditional'], ['lunch', 'dinner'], ['leaf', 'buffet'], ['stall', 'kids']),
  R('template', 'reception', ['grand', 'wedding', 'celebration', 'modern'], ['dinner'], ['buffet', 'counters'], ['ritual', 'stall'], 'Grand buffets, live counters, desserts'),
  R('template', 'engagement', ['celebration', 'grand', 'family'], ['lunch', 'dinner'], ['buffet']),
  R('template', 'sangeet', ['party', 'celebration', 'modern', 'street'], ['dinner'], ['buffet', 'counters']),
  R('template', 'mehendi', ['street', 'party', 'light'], ['hightea', 'lunch'], ['counters', 'buffet']),
  R('template', 'haldi', ['traditional', 'light', 'family'], ['breakfast', 'lunch'], ['buffet', 'leaf']),
  R('template', 'cocktail', ['cocktail', 'modern', 'party'], ['dinner'], ['buffet', 'counters'], ['ritual']),
  R('template', 'anniversary', ['celebration', 'family', 'modern'], ['dinner'], ['buffet', 'plated']),
  R('template', 'privateDinner', ['modern', 'grand', 'cocktail'], ['dinner'], ['plated', 'family'], ['stall']),
  R('template', 'collegeFest', ['stall', 'street', 'party'], ['hightea', 'lunch'], ['counters', 'packed'], ['ritual', 'grand'], 'Food stalls, snacks, beverage counters, bulk meals'),
  R('template', 'conference', ['corporate', 'breakfast', 'hightea', 'light'], ['breakfast', 'lunch', 'hightea'], ['buffet', 'packed'], ['ritual', 'spicy']),
  R('template', 'boardroom', ['corporate', 'light', 'hightea'], ['lunch', 'hightea'], ['packed', 'plated'], ['ritual']),
  R('template', 'workshop', ['corporate', 'light', 'hightea'], ['lunch', 'hightea'], ['packed', 'buffet'], ['ritual']),
  R('template', 'teamDay', ['corporate', 'party', 'street'], ['lunch'], ['buffet', 'counters']),
  R('template', 'awardsNight', ['grand', 'cocktail', 'modern'], ['dinner'], ['buffet', 'plated']),
  R('template', 'launch', ['cocktail', 'modern', 'hightea'], ['hightea', 'dinner'], ['buffet', 'counters']),
  R('template', 'diwali', ['festive', 'traditional', 'celebration'], ['dinner', 'lunch'], ['buffet'], ['cocktail']),
  R('template', 'eid', ['celebration', 'grand', 'family'], ['dinner', 'lunch'], ['buffet', 'family']),
  R('template', 'christmas', ['party', 'modern', 'family'], ['dinner'], ['buffet']),
  R('template', 'bbq', ['party', 'modern'], ['dinner'], ['counters'], ['ritual']),
  R('template', 'memorial', ['ritual', 'traditional', 'light'], ['lunch'], ['leaf', 'buffet'], ['party', 'cocktail', 'stall']),
  // ── every category, so no occasion is left without a rule ──
  R('category', 'life', ['family', 'celebration', 'party'], ['dinner', 'lunch'], ['buffet']),
  R('category', 'wedding', ['wedding', 'grand', 'traditional'], ['lunch', 'dinner'], ['buffet', 'leaf'], ['stall']),
  R('category', 'festivals', ['festive', 'traditional', 'ritual'], ['lunch', 'dinner'], ['buffet', 'leaf']),
  R('category', 'school', ['kids', 'light', 'stall'], ['lunch', 'hightea'], ['packed', 'counters'], ['cocktail', 'spicy']),
  R('category', 'college', ['stall', 'street', 'party'], ['lunch', 'hightea'], ['counters', 'packed'], ['ritual']),
  R('category', 'corporate', ['corporate', 'light', 'hightea', 'breakfast'], ['lunch', 'hightea', 'breakfast'], ['buffet', 'packed'], ['ritual']),
  R('category', 'nightlife', ['cocktail', 'party', 'street'], ['dinner'], ['counters', 'buffet'], ['ritual']),
  R('category', 'public', ['stall', 'street', 'light'], ['hightea', 'lunch'], ['counters', 'packed'], ['ritual']),
  R('category', 'sport', ['light', 'stall', 'corporate'], ['lunch', 'breakfast'], ['packed', 'counters'], ['ritual']),
  R('category', 'food', ['street', 'modern', 'party'], ['dinner', 'hightea'], ['counters', 'buffet']),
  R('category', 'retail', ['hightea', 'light', 'cocktail'], ['hightea'], ['counters', 'buffet'], ['ritual']),
  R('category', 'property', ['hightea', 'cocktail', 'corporate'], ['hightea', 'lunch'], ['buffet', 'counters'], ['ritual']),
  R('category', 'community', ['traditional', 'grand', 'stall'], ['lunch'], ['buffet', 'packed']),
  R('category', 'industry', ['corporate', 'light', 'hightea'], ['lunch', 'hightea', 'breakfast'], ['buffet', 'packed'], ['ritual']),
  R('category', 'themed', ['party', 'modern', 'cocktail'], ['dinner'], ['buffet', 'counters']),
  R('category', 'outdoor', ['party', 'family', 'light'], ['lunch', 'dinner'], ['buffet', 'counters']),
  R('category', 'online', ['light', 'corporate'], ['lunch', 'hightea'], ['packed'], ['grand']),
  R('category', 'special', ['modern', 'celebration', 'family'], ['dinner'], ['plated', 'family', 'buffet']),
]
