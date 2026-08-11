import { scaledOptions } from './engine'

// Party Essentials: what actually has to be decided before a decoration can
// happen.
//
// The catalogue sells balloons, banners, backdrops and theme kits, and until
// now all of it went into the cart as a fixed object with no questions asked.
// That misses the only two questions that matter for decor and both of them
// decide whether the evening works:
//
//   1. Who puts it up. A balloon arch delivered flat in a bag at 6pm, to a
//      family who thought it arrived assembled, is a ruined party and a
//      refund. This is the first group in the sheet for that reason, and it
//      is the one place Sambramo's actual advantage over a courier shows up.
//   2. What colour. Decor is bought to match something — an invite, a cake,
//      a saree. A fixed palette is the single most common reason decor gets
//      sent back.
//
// Everything else here is an accessory that a decorator would otherwise have
// to ring the customer about.

const SETUP = [
  { id: 'diy',      label: 'DIY kit — we deliver, you decorate', price: 0,
    note: 'Everything in one box with instructions', default: true },
  { id: 'setup',    label: 'Sambramo sets it up at your venue', price: 899,
    note: 'Our team arrives, decorates and leaves' },
  { id: 'fullserve', label: 'Set up and taken down after the party', price: 1499,
    note: 'We come back the same night or next morning' },
]

// Named the way an invitation names them, not the way a paint chart does.
const THEMES = [
  { id: 'pastel',   label: 'Pastel — blush, mint, cream',   price: 0, default: true },
  { id: 'goldwhite', label: 'Gold and white',                price: 0 },
  { id: 'rainbow',  label: 'Bright rainbow',                price: 0 },
  { id: 'rosegold', label: 'Pink and rose gold',            price: 0 },
  { id: 'bluesilver', label: 'Blue and silver',             price: 0 },
  { id: 'jungle',   label: 'Jungle green and brown',        price: 0 },
  { id: 'royal',    label: 'Deep red and gold — traditional', price: 0 },
  { id: 'custom',   label: 'Match my invite — I’ll send a photo', price: 149,
    note: 'We’ll ask for the picture on WhatsApp' },
]

// Coverage, not "size". A customer does not know whether they need 60 or 120
// balloons; they know they have one wall, or a whole hall.
const COVERAGE_STEPS = [1, 2, 3]
const COVERAGE_MULTIPLIER = { 1: 1, 2: 1.75, 3: 2.9 }
const COVERAGE_LABEL = {
  1: 'One wall or corner (about 6 ft)',
  2: 'Feature wall (about 10 ft)',
  3: 'Full room',
}
const COVERAGE_NOTE = {
  1: 'Cake table or entrance',
  2: 'The wall everyone photographs',
  3: 'Entrance, walls and ceiling',
}

const VENUES = [
  { id: 'home',      label: 'Home or flat',            price: 0, default: true },
  { id: 'clubhouse', label: 'Apartment clubhouse',     price: 0 },
  { id: 'hall',      label: 'Banquet hall or restaurant', price: 0 },
  { id: 'outdoor',   label: 'Outdoor — terrace, lawn or farmhouse', price: 0,
    note: 'We’ll bring weights and secure fixings' },
]

const EXTRAS = [
  { id: 'fairy',    label: 'LED fairy lights (10 m)',          price: 249 },
  { id: 'helium',   label: 'Helium fill so the balloons float', price: 399 },
  { id: 'props',    label: 'Photo booth props (set of 12)',     price: 299 },
  { id: 'arch',     label: 'Entrance balloon arch',             price: 899 },
  { id: 'caketable', label: 'Cake table styling',               price: 599 },
  { id: 'confetti', label: 'Confetti cannons (pack of 2)',      price: 199 },
  { id: 'neon',     label: 'Neon light-up sign (rental)',       price: 699,
    note: 'Collected the next day' },
  { id: 'fog',      label: 'Cold fog effect for the cake cutting', price: 799 },
]

// Decor is the one thing that has to be finished BEFORE the guests arrive, so
// the slot is about the setup, not the delivery.
const SLOTS = [
  { id: 'morning',   label: 'Morning — 8am to 11am',   price: 0, default: true },
  { id: 'afternoon', label: 'Afternoon — 12pm to 4pm', price: 0 },
  { id: 'evening',   label: 'Evening — 5pm to 8pm',    price: 0 },
  { id: 'nightbefore', label: 'The night before',      price: 299,
    note: 'For a morning party, or so nobody sees it going up' },
]

// Only things that occupy a wall scale by coverage. A pack of paper plates
// does not, and offering "full room" tableware would take an order nobody
// can fill.
const COVERAGE_APPLIES = /balloon|backdrop|banner|decor|arch|curtain|drape|bunting|streamer|wall|frame|net|light/i
const PERSONALISABLE   = /banner|backdrop|sign|bunting|frame|letter|foil|cutout/i

export function buildPartyOptionGroups(product) {
  const name = product.name ?? ''
  const groups = []

  groups.push({
    id: 'setup',
    label: 'Who puts it up?',
    hint: 'The part most decor shops leave to you',
    type: 'single',
    required: true,
    role: 'spec',
    options: SETUP,
  })

  if (COVERAGE_APPLIES.test(name)) {
    groups.push({
      id: 'coverage',
      label: 'How much are we covering?',
      type: 'single',
      required: true,
      role: 'spec',
      options: scaledOptions({
        steps: COVERAGE_STEPS,
        multipliers: COVERAGE_MULTIPLIER,
        current: 1,
        price: product.price,
        label: step => COVERAGE_LABEL[step],
        note: step => COVERAGE_NOTE[step],
      }),
    })
  }

  groups.push({
    id: 'theme',
    label: 'Colour theme',
    hint: 'We’ll match the balloons, drapes and props to this',
    type: 'single',
    required: true,
    role: 'spec',
    options: THEMES,
  })

  if (PERSONALISABLE.test(name)) {
    groups.push({
      id: 'text',
      label: 'Text on the banner',
      hint: 'Name, age or your own line — printed or spelled in letters',
      type: 'text',
      role: 'note',
      maxLength: 28,
      placeholder: 'e.g. "Aarav turns 5"',
    })
  }

  groups.push({
    id: 'venue',
    label: 'Where is it going up?',
    hint: 'So the team brings the right fixings',
    type: 'single',
    required: true,
    role: 'spec',
    options: VENUES,
  })

  groups.push({ id: 'extras', label: 'Add to the setup', type: 'multi', max: 4, role: 'addon', options: EXTRAS })

  groups.push({
    id: 'slot',
    label: 'When should it be ready?',
    type: 'single',
    required: true,
    role: 'schedule',
    options: SLOTS,
  })

  return groups
}
