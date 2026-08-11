// The cake customiser: what can be changed about a cake, what each change
// costs, and how the resulting choices are written down for the kitchen.
//
// ── Why this is config and not a table ─────────────────────────────────
// Option groups could live in Postgres (product_option_groups / options) and
// one day probably should. They don't yet, for a reason worth writing down:
// migrations in this project are applied by hand, and a UI that reads its
// option catalogue from an unapplied migration renders an "Add to cart"
// button with no options behind it — the customer orders a plain 1kg sponge
// having been shown nothing to change. Deriving the groups from the product
// row means the customiser works against the database exactly as it stands
// today, including before migration 029 lands.
//
// What DOES have to be persisted is the customer's answer, and that already
// has somewhere to go: order_items.customization (TEXT, migration 019). It
// is written as human-readable lines because the reader is whoever is
// packing the box, not a parser. Add-on money is folded into
// order_items.unit_price, so an order's totals reconcile without needing to
// re-price anything from this file — which matters, because this file will
// change and old orders must not.
//
// ── Why the prices look like this ──────────────────────────────────────
// Weight multipliers follow standard bakery scaling (a 2kg cake is not twice
// the price of a 1kg one; the decoration doesn't double). Flavour and
// finishing surcharges are benchmarked to the going rate at established
// Indian bakery chains, the same basis as the catalogue's own prices.

import { cakeFacts, servesFor } from '../data/cakeStyles'
import { scaledOptions } from './customizers/engine'

/* ── Weight ─────────────────────────────────────────────────────────────
 * Multipliers are relative to 1kg. A product priced at 1.5kg is re-based
 * against its own weight, so "Mehendi Night Cake (1.5kg) — ₹1799" offers 1kg
 * at ₹1240 rather than ₹1799 off a phantom 1kg price.
 */
const WEIGHT_MULTIPLIER = { 0.5: 0.62, 1: 1, 1.5: 1.45, 2: 1.88, 3: 2.72, 4: 3.55, 5: 4.4 }
const WEIGHT_STEPS = [0.5, 1, 1.5, 2, 3, 5]

/* ── Flavour ────────────────────────────────────────────────────────────
 * Surcharges are absolute, against a plain vanilla sponge. They are then
 * re-based against whatever flavour the product already is, so the cake you
 * clicked on is always the ₹0 option — nobody should be charged extra to
 * receive the thing pictured.
 */
const FLAVOURS = [
  { id: 'vanilla',      label: 'Vanilla',                  surcharge: 0,   test: /vanilla/i },
  { id: 'pineapple',    label: 'Pineapple',                surcharge: 0,   test: /pineapple/i },
  { id: 'butterscotch', label: 'Butterscotch',             surcharge: 80,  test: /butterscotch/i },
  { id: 'blackforest',  label: 'Black forest',             surcharge: 100, test: /black forest/i },
  { id: 'truffle',      label: 'Chocolate truffle',        surcharge: 120, test: /chocolate|truffle|ganache|cocoa|brownie/i },
  { id: 'mango',        label: 'Mango (seasonal)',         surcharge: 120, test: /mango/i },
  { id: 'coffee',       label: 'Coffee mocha',             surcharge: 140, test: /coffee|mocha/i },
  { id: 'redvelvet',    label: 'Red velvet',               surcharge: 180, test: /red velvet/i },
  { id: 'freshfruit',   label: 'Fresh fruit & cream',      surcharge: 180, test: /fresh fruit|fruit/i },
  { id: 'blueberry',    label: 'Blueberry',                surcharge: 220, test: /blueberry/i },
  { id: 'rasmalai',     label: 'Rasmalai',                 surcharge: 220, test: /rasmalai|saffron|pista/i },
  { id: 'belgian',      label: 'Belgian dark chocolate',   surcharge: 260, test: /belgian/i },
]

// FLAVOURS is in the order the customer should read it — cheapest first.
// Detection has to run in the opposite order, most specific first, because
// several patterns match the same string: "Belgian dark chocolate" contains
// "chocolate", and a "Rasmalai Birthday Cake" whose description mentions a
// sponge must not be detected as vanilla. Getting this wrong is not cosmetic
// — the detected flavour is the one priced at ₹0, so a mis-detection charges
// the customer ₹220 extra to receive the cake they clicked on.
const FLAVOUR_DETECTION_ORDER = [
  'belgian', 'rasmalai', 'blueberry', 'redvelvet', 'coffee', 'mango',
  'blackforest', 'freshfruit', 'truffle', 'butterscotch', 'pineapple', 'vanilla',
].map(id => FLAVOURS.find(f => f.id === id))

// The name is authoritative; the description is a fallback. "Saffron-pistachio
// sponge soaked in rabri" is a description of a rasmalai cake, and reading it
// before the name that says so is how you land on vanilla.
function detectFlavour(product) {
  const name = product.name ?? ''
  const desc = product.description ?? ''
  return FLAVOUR_DETECTION_ORDER.find(f => f.test.test(name))
      ?? FLAVOUR_DETECTION_ORDER.find(f => f.test.test(desc))
      ?? FLAVOURS[0]
}

/* ── Shape ─────────────────────────────────────────────────────────────── */
const SHAPES = [
  { id: 'round',  label: 'Round',            price: 0 },
  { id: 'square', label: 'Square',           price: 0 },
  { id: 'heart',  label: 'Heart',            price: 150 },
  { id: 'number', label: 'Number or letter', price: 350, note: 'Tell us the digit or initial in the message box' },
  { id: 'custom', label: 'Custom 3D sculpted', price: 700, note: 'Our team will confirm the design on WhatsApp' },
]

/* ── Delivery ───────────────────────────────────────────────────────────
 * Midnight delivery is the single most-requested cake add-on in India and
 * genuinely costs more to staff, so it is priced rather than promised free.
 */
const DELIVERY_SLOTS = [
  { id: 'standard', label: 'Standard — 10am to 8pm', price: 0 },
  { id: 'fixed',    label: 'Fixed 2-hour slot',      price: 99,  note: 'Pick the window at checkout' },
  { id: 'morning',  label: 'Early morning — 6am to 8am', price: 149 },
  { id: 'midnight', label: 'Midnight surprise — 11pm to 12:30am', price: 199, note: 'Candles and a knife are included' },
]

/* ── Occasion-aware wording ─────────────────────────────────────────────
 * A "Happy Birthday" topper offered on a retirement cake is the sort of
 * detail that tells a customer the shop isn't paying attention. The greeting
 * follows the product's own occasion tag.
 */
const OCCASION_GREETING = {
  'First Birthday':     'Happy 1st Birthday',
  'Half Birthday':      'Happy Half Birthday',
  'Birthday':           'Happy Birthday',
  'Milestone Birthday': 'Happy Birthday',
  'Kids & Theme':       'Happy Birthday',
  'Pet Birthday':       'Happy Barkday',
  'Gender Reveal':      'Boy or Girl?',
  'Baby Shower':        'Congratulations Mum-to-be',
  'Naming Ceremony':    'Welcome Little One',
  'Annaprashan':        'Happy First Bite',
  'Mundan':             'Blessings',
  'First Day at School': 'Big Day!',
  'Roka':               'Congratulations',
  'Engagement':         'Congratulations',
  'Bride to Be':        'Bride to Be',
  'Groom to Be':        'Groom to Be',
  'Haldi & Mehendi':    'Shubh Vivah',
  'Sangeet':            'Let’s Dance',
  'Wedding':            'Shubh Vivah',
  'Anniversary':        'Happy Anniversary',
  'Proposal':           'Will You Marry Me?',
  'Valentine':          'Be Mine',
  "Mother's Day":       'Best Mum Ever',
  "Father's Day":       'Best Dad Ever',
  'Rakhi':              'Happy Rakhi',
  'Friendship Day':     'Happy Friendship Day',
  'Teachers Day':       'Thank You Teacher',
  'Congratulations':    'Congratulations',
  'Corporate':          'Well Done Team',
  'Housewarming':       'Happy New Home',
  'New Beginnings':     'Congratulations',
  'Retirement':         'Happy Retirement',
  'Farewell':           'We’ll Miss You',
  'Get Well Soon':      'Get Well Soon',
  'Sorry':              'I’m Sorry',
  'Thank You':          'Thank You',
  'Just Because':       'Just Because',
}

export function greetingFor(occasion) {
  return OCCASION_GREETING[occasion] ?? 'Congratulations'
}

/* ── Add-ons ────────────────────────────────────────────────────────────
 * Priced as the real accessories they are. Everything here is optional; the
 * cake is complete without any of it.
 */
const CANDLES = [
  { id: 'magic',   label: 'Magic relighting candle',        price: 65 },
  { id: 'number',  label: 'Number candle (any digit)',      price: 49 },
  { id: 'sparkler', label: 'Sparkler candles (pack of 5)',  price: 79 },
  { id: 'spiral',  label: 'Long spiral candles (pack of 10)', price: 59 },
]

const PARTY_ESSENTIALS = [
  { id: 'caps',     label: 'Party caps (pack of 6)',    price: 85 },
  { id: 'balloons', label: 'Balloons (pack of 10)',     price: 99 },
  { id: 'poppers',  label: 'Party poppers (pack of 2)', price: 79 },
  { id: 'cutlery',  label: 'Knife, plates & forks set', price: 45 },
  { id: 'fountain', label: 'Sparkler fountain',         price: 129 },
]

const GIFT_ADDONS = [
  { id: 'roses',     label: 'Bunch of 6 red roses',       price: 249 },
  { id: 'chocolate', label: 'Assorted chocolate box',     price: 299 },
  { id: 'softtoy',   label: 'Soft toy (12 inch)',         price: 399 },
  { id: 'frame',     label: 'Personalised photo frame',   price: 399 },
]

/* ── Group construction ─────────────────────────────────────────────────
 *
 * Group types:
 *   single  radio; exactly one selection, always has a default
 *   multi   checkbox, capped at `max`; may be empty
 *   text    free text, capped at `maxLength`
 *   info    no input — a fact the customer needs before choosing
 */
export function buildCakeOptionGroups(product) {
  const facts    = cakeFacts(product)
  const greeting = greetingFor(product.occasion)
  const groups   = []

  /* Weight — only where a weight is a meaningful thing to change. A box of
     cupcakes or a jar set is sold by the piece. */
  if (facts.form.resizable && facts.weightKg) {
    groups.push({
      id: 'weight',
      label: 'Choose the size',
      hint: 'A kilo cuts into 8–10 party slices',
      type: 'single',
      required: true,
      role: 'spec',
      // `absolute` pricing, re-based so the cake's own weight costs exactly
      // its catalogue price — see scaledOptions.
      options: scaledOptions({
        steps: WEIGHT_STEPS,
        multipliers: WEIGHT_MULTIPLIER,
        current: facts.weightKg,
        price: product.price,
        label: kg => `${kg} kg`,
        note: kg => servesFor(kg),
      }),
    })
  } else if (facts.pieces) {
    groups.push({
      id: 'pieces',
      label: 'Quantity in the box',
      type: 'info',
      text: `${facts.pieces} pieces — to order more, change the quantity below.`,
    })
  }

  /* Flavour — re-based so the product's own flavour is free. */
  const baseFlavour = detectFlavour(product)
  groups.push({
    id: 'flavour',
    role: 'spec',
    label: 'Pick a flavour',
    hint: `${baseFlavour.label} is what's pictured`,
    type: 'single',
    required: true,
    options: FLAVOURS.map(f => ({
      id: f.id,
      label: f.label,
      price: Math.max(0, f.surcharge - baseFlavour.surcharge),
      default: f.id === baseFlavour.id,
    })),
  })

  /* Egg preference. Locked, not offered, where the product only exists in
     one form — a vegan cake has no with-egg version, and showing the choice
     would take an order the kitchen can't fill. */
  const dietIds = facts.diets.map(d => d.id)
  const eggLocked = dietIds.includes('vegan') || dietIds.includes('eggless') || /pet-safe/i.test(product.description ?? '')
  if (eggLocked) {
    groups.push({
      id: 'egg',
    role: 'spec',
      label: 'Egg preference',
      type: 'info',
      text: 'This cake is made eggless — pure veg.',
    })
  } else {
    groups.push({
      id: 'egg',
      label: 'Egg preference',
      type: 'single',
      required: true,
      options: [
        // Neither option is priced. Eggless genuinely costs a bakery a little
        // more, but defaulting to the pricier choice and charging for it is a
        // tax on the option most Indian customers need, so it's absorbed.
        { id: 'eggless', label: 'Eggless — pure veg', price: 0, default: true },
        { id: 'egg',     label: 'With egg',           price: 0 },
      ],
    })
  }

  /* Shape */
  if (facts.form.shapeable) {
    groups.push({
      id: 'shape',
    role: 'spec',
      label: 'Shape',
      type: 'single',
      required: true,
      options: SHAPES.map((s, i) => ({ ...s, default: i === 0 })),
    })
  }

  /* Message on the cake */
  groups.push({
    id: 'message',
    role: 'note',
    label: 'Message on the cake',
    hint: 'Piped by hand — keep it short so it fits',
    type: 'text',
    maxLength: 30,
    placeholder: `e.g. "${greeting}"`,
  })

  /* Photo print */
  if (facts.style.id === 'photo') {
    groups.push({
      id: 'photo',
    role: 'addon',
      label: 'Your photo',
      type: 'info',
      text: 'The edible photo print is included. We’ll message you on WhatsApp for the picture right after you order.',
    })
  } else {
    groups.push({
      id: 'photo',
      label: 'Add a photo to the cake',
      hint: 'We’ll ask for the picture on WhatsApp after checkout',
      type: 'multi',
      max: 1,
      options: [{ id: 'print', label: 'Edible photo print on top', price: 250 }],
    })
  }

  /* Toppers — occasion-aware wording. */
  groups.push({
    id: 'topper',
    role: 'addon',
    label: 'Cake topper',
    type: 'multi',
    max: 2,
    options: [
      { id: 'greeting', label: `"${greeting}" acrylic topper`, price: 99 },
      { id: 'name',     label: 'Custom name topper',           price: 149 },
      { id: 'age',      label: 'Number topper (any age or year)', price: 129 },
      { id: 'theme',    label: 'Themed figurine topper',       price: 199 },
    ],
  })

  groups.push({ id: 'candles', role: 'addon', label: 'Candles', type: 'multi', max: 2, options: CANDLES })

  groups.push({
    id: 'card',
    role: 'addon',
    label: 'Greeting card',
    type: 'multi',
    max: 2,
    options: [
      { id: 'printed',  label: `"${greeting}" card`,             price: 49 },
      { id: 'blank',    label: 'Blank card, message handwritten', price: 39 },
      { id: 'premium',  label: 'Premium personalised card',       price: 99 },
    ],
  })

  groups.push({ id: 'party', role: 'addon', label: 'Party essentials', type: 'multi', max: 3, options: PARTY_ESSENTIALS })
  groups.push({ id: 'gift', role: 'addon',  label: 'Make it a gift',   type: 'multi', max: 2, options: GIFT_ADDONS })

  groups.push({
    id: 'delivery',
    role: 'schedule',
    label: 'When should it arrive?',
    type: 'single',
    required: true,
    options: DELIVERY_SLOTS.map((s, i) => ({ ...s, default: i === 0 })),
  })

  return groups
}


// Selection handling, pricing and the order note now live in
// ./customizers/engine.js — every category needs them, and a cake file
// is the wrong place for a hamper to import them from.