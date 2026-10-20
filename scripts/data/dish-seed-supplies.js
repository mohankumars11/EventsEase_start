/**
 * Everything that goes on a table and is not a cooked dish.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY SALT AND WATER BELONG IN A DISH CATALOGUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Instant pricing works off catalogue items: a caterer attaches a price
 * to a thing with an id, and a customer's order resolves against those
 * ids. Anything with no id cannot be priced instantly and falls to a
 * custom quote — which is exactly what was happening to the water
 * bottles, the pickle and the papad on every single event.
 *
 * So the supply side gets the same treatment as the food: a permanent
 * id, a category, a course, and enough precision that two caterers
 * pricing "water" are pricing the same thing.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BRAND AND SIZE ARE THE WHOLE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Water" cannot be priced. A 200 ml cup and a 20 litre jar differ by
 * two orders of magnitude, and a customer who asked for Bisleri and got
 * an unbranded pouch has a complaint nobody can settle from the record.
 * So each brand-and-size is its own item, generated rather than typed so
 * none is missed and no two are spelt differently.
 *
 * A generic line exists at every size as well, because most caterers
 * supply whatever the distributor sent that week and should not be made
 * to claim a brand they cannot guarantee.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO CUISINE, ON PURPOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * These carry an empty cuisine set, which migration 184 reads as
 * "universal" and shows under every cuisine. Tagging salt to all 115
 * cuisines would be 115 rows of maintenance per item and a lie about
 * what the data means.
 */

const d = (name, category, diet = 'veg', aliases = [], cuisines = []) =>
  ({ name, cuisine_ids: cuisines, category_id: category, suggested_diet: diet, aliases })

/* ── Packaged drinking water ───────────────────────────────────────────
   Sizes are the ones actually sold into events in this market: the
   200 ml cup for a buffet line, the 500 ml and 1 L for tables, the 20 L
   jar for the kitchen and the counters. */
const WATER_SIZES = ['200 ml cup', '250 ml', '300 ml', '500 ml', '750 ml', '1 L', '2 L', '5 L', '20 L jar']
const WATER_BRANDS = ['Bisleri', 'Kinley', 'Aquafina', 'Bailley', 'Himalayan', 'Qua', 'Rail Neer', 'Oxyrich', 'Vedica', 'Evocus']

const water = [
  ...WATER_SIZES.map(s => d(`Packaged drinking water — ${s}`, 'bev_water', 'veg',
    [`Water ${s}`, `Mineral water ${s}`])),
  ...WATER_BRANDS.flatMap(b => WATER_SIZES.map(s => d(`${b} packaged water — ${s}`, 'bev_water', 'veg', [`${b} ${s}`]))),
  d('Chilled water service, per table', 'bev_water'),
  d('Copper pot water service', 'bev_water', 'veg', ['Tamra jal']),
  d('Warm water service', 'bev_water'),
  d('Jeera-infused water', 'bev_water', 'veg', ['Jeera water']),
  d('Lemon-infused water', 'bev_water'),
  d('Mint-infused water', 'bev_water'),
]

/* ── Soft drinks and packaged beverages ───────────────────────────────
   Priced per bottle or can, which is how a caterer buys them. */
const SOFT_SIZES = ['200 ml', '250 ml can', '300 ml', '600 ml', '750 ml', '1.25 L', '2 L']
const SOFT_BRANDS = ['Coca-Cola', 'Thums Up', 'Pepsi', 'Sprite', 'Limca', 'Fanta', 'Mirinda', '7Up', 'Mountain Dew', 'Maaza', 'Slice', 'Frooti', 'Appy Fizz', 'Paper Boat']

const soft = [
  ...SOFT_BRANDS.flatMap(b => SOFT_SIZES.slice(0, 5).map(s => d(`${b} — ${s}`, 'bev_packaged_juice', 'veg', [`${b} ${s}`]))),
  ...['Real', 'Tropicana', 'B Natural', 'Raw Pressery'].flatMap(b =>
    ['200 ml', '1 L'].map(s => d(`${b} packaged juice — ${s}`, 'bev_packaged_juice', 'veg', [`${b} juice ${s}`]))),
  d('Soda, 200 ml bottle', 'bev_other', 'veg', ['Club soda']),
  d('Packaged buttermilk, 200 ml', 'bev_buttermilk_lassi', 'veg', ['Chaas tetra pack']),
  d('Packaged lassi, 200 ml', 'bev_buttermilk_lassi'),
  d('Packaged flavoured milk, 200 ml', 'bev_milk'),
  d('Tender coconut, per piece', 'bev_coconut', 'veg', ['Elaneer', 'Shahaale']),
  d('Energy drink, 250 ml can', 'bev_other'),
]

/* ── Salt, sugar and the table condiments ─────────────────────────────
   "Even salt" was the ask, and it is not a joke: a sadya or a thali is
   quoted with these on it and they are bought by weight. */
const table = [
  d('Table salt, per serving', 'ac_other', 'veg', ['Salt']),
  d('Rock salt, per serving', 'ac_other', 'veg', ['Sendha namak', 'Kallu uppu']),
  d('Black salt, per serving', 'ac_other', 'veg', ['Kala namak']),
  d('Black pepper, per serving', 'ac_other', 'veg', ['Pepper']),
  d('Sugar sachets, per serving', 'ac_other', 'veg', ['Sugar']),
  d('Jaggery, per serving', 'ac_other', 'veg', ['Bella', 'Gur']),
  d('Lemon wedges, per plate', 'ac_other', 'veg', ['Lime wedges']),
  d('Onion and lemon plate', 'ac_salad', 'veg', ['Onion salad']),
  d('Green chilli, per plate', 'ac_other'),
  d('Ginger julienne, per plate', 'ac_other'),
  d('Ghee, per serving', 'ac_other', 'veg', ['Tuppa', 'Neyyi']),
  d('Butter portion, per serving', 'ac_other'),
  d('Curd, per serving', 'ac_yogurt', 'veg', ['Mosaru', 'Thayir', 'Dahi']),
  d('Plain raita, per serving', 'ac_raita'),
  d('Boondi raita, per serving', 'ac_raita'),
  d('Cucumber raita, per serving', 'ac_raita'),
  d('Mixed vegetable raita, per serving', 'ac_raita'),
  d('Pineapple raita, per serving', 'ac_raita'),
  d('Buttermilk, per serving', 'bev_buttermilk_lassi', 'veg', ['Majjige', 'Neer mor']),
  d('Honey, per serving', 'ac_other'),
  d('Mustard sauce, per serving', 'ac_sauce'),
  d('Vinegar, per serving', 'ac_sauce'),
  d('Chilli flakes and oregano sachets', 'ac_other'),
]

/* ── Pickles ──────────────────────────────────────────────────────────
   Nine already existed; these are the ones a South Indian or Andhra
   caterer is actually asked for and could not find. */
const pickles = [
  d('Avakaya pickle', 'ac_pickle', 'veg', ['Avakkai']),
  d('Tomato pickle', 'ac_pickle', 'veg', ['Tomato pachadi pickle']),
  d('Lemon pickle, South Indian', 'ac_pickle', 'veg', ['Nimbe uppinakayi']),
  d('Tender mango pickle', 'ac_pickle', 'veg', ['Midi uppinakayi']),
  d('Mixed fruit pickle', 'ac_pickle'),
  d('Carrot pickle', 'ac_pickle'),
  d('Red chilli pickle', 'ac_pickle', 'veg', ['Lal mirch achar']),
  d('Stuffed red chilli pickle', 'ac_pickle'),
  d('Kadugu mango pickle', 'ac_pickle', 'veg', ['Mustard mango pickle']),
  d('Instant mango thokku', 'ac_pickle'),
  d('Ginger pickle', 'ac_pickle', 'veg', ['Allam pachadi']),
  d('Prawn pickle', 'ac_pickle', 'non_veg', ['Chemmeen achar']),
  d('Chicken pickle', 'ac_pickle', 'non_veg'),
  d('Mutton pickle', 'ac_pickle', 'non_veg'),
  d('Fish pickle', 'ac_pickle', 'non_veg', ['Meen achar']),
]

/* ── Papad, podi and crisps ───────────────────────────────────────────*/
const crisps = [
  d('Urad papad', 'ac_papad', 'veg', ['Urad dal papad']),
  d('Rice papad', 'ac_papad', 'veg', ['Akki happala']),
  d('Sago papad', 'ac_papad', 'veg', ['Sabudana papad']),
  d('Jackfruit chips', 'ac_papad', 'veg', ['Halasina chips', 'Kaya varuthathu']),
  d('Banana chips', 'ac_papad', 'veg', ['Nendran chips']),
  d('Potato chips, fried fresh', 'ac_papad'),
  d('Boondi, plain', 'ac_other'),
  d('Mixture, per serving', 'ac_other', 'veg', ['Kara boondi mixture']),
  d('Sev, per serving', 'ac_other'),
  d('Idli podi', 'ac_podi', 'veg', ['Milagai podi']),
  d('Curry leaf podi', 'ac_podi', 'veg', ['Karibevu pudi']),
  d('Flaxseed podi', 'ac_podi', 'veg', ['Agase pudi']),
  d('Garlic podi', 'ac_podi', 'veg', ['Bellulli pudi']),
  d('Coconut podi', 'ac_podi', 'veg', ['Kobbari podi']),
  d('Nuchinunde podi', 'ac_podi'),
]

/* ── Chutneys, dips and sauces not already present ────────────────────*/
const sauces = [
  d('Coconut chutney, per serving', 'ac_chutney', 'veg', ['Thengai chutney']),
  d('Tomato chutney, per serving', 'ac_chutney'),
  d('Coriander chutney, per serving', 'ac_chutney', 'veg', ['Green chutney']),
  d('Mint chutney, per serving', 'ac_chutney', 'veg', ['Pudina chutney']),
  d('Peanut chutney, per serving', 'ac_chutney', 'veg', ['Shenga chutney']),
  d('Onion chutney, per serving', 'ac_chutney'),
  d('Tamarind chutney, per serving', 'ac_chutney', 'veg', ['Imli chutney']),
  d('Garlic chutney, per serving', 'ac_chutney'),
  d('Chilli sauce, per serving', 'ac_sauce'),
  d('Soy sauce, per serving', 'ac_sauce'),
  d('Mayonnaise, per serving', 'ac_sauce', 'egg'),
  d('Cheese dip, per serving', 'ac_dip'),
  d('Hung curd dip, per serving', 'ac_dip'),
]

export const SEED = [...water, ...soft, ...table, ...pickles, ...crisps, ...sauces]
