import { scaledOptions } from './engine'

// Gifts & Hampers — one category, because a customer never had the two apart.
//
// "Gifts" and "Hampers" were separate shop categories holding the same intent:
// something wrapped, handed to someone, for an occasion. A person shopping for
// their brother at Rakhi does not first decide whether the thing they want is
// technically a hamper, and splitting the shelf meant every occasion was half
// as deep as it actually was — Diwali showed 5 gifts on one page and 6 hampers
// on another. Merged, that occasion has eleven.
//
// The customisation reflects what is different about a gift specifically: it
// is not for the buyer. Everything below follows from that — the name goes on
// it, the message is handwritten by someone else, and the buyer is not there
// when it is opened.

const TIER_STEPS = [1, 2, 3]
const TIER_MULTIPLIER = { 1: 1, 2: 1.55, 3: 2.25 }
const TIER_LABEL = { 1: 'Classic', 2: 'Premium', 3: 'Luxury' }
const TIER_NOTE = {
  1: 'The contents as listed',
  2: 'Larger portions, better brands, gift box',
  3: 'Top-shelf contents in a keepsake box',
}

const WRAP = [
  { id: 'standard', label: 'Standard gift wrap',        price: 0,   default: true },
  { id: 'fabric',   label: 'Premium fabric wrap',       price: 149 },
  { id: 'potli',    label: 'Traditional potli bag',     price: 199 },
  { id: 'box',      label: 'Keepsake box, no outer wrap', price: 99 },
  { id: 'none',     label: 'No wrapping — I’ll wrap it', price: 0 },
]

const EXTRAS = [
  { id: 'flowers',   label: 'Fresh flower bunch',        price: 249 },
  { id: 'chocolate', label: 'Assorted chocolate box',    price: 299 },
  { id: 'candle',    label: 'Scented candle',            price: 249 },
  { id: 'frame',     label: 'Personalised photo frame',  price: 399 },
  { id: 'sweets',    label: 'Box of Indian sweets',      price: 349 },
]

// "Surprise delivery" is the innovative one and it is genuinely useful: a
// gift that arrives with the sender's name on the docket has already been
// spoiled at the door.
const DELIVERY = [
  { id: 'standard', label: 'Standard — 10am to 8pm',  price: 0, default: true },
  { id: 'fixed',    label: 'Fixed 2-hour slot',        price: 99 },
  { id: 'midnight', label: 'Midnight — 11pm to 12:30am', price: 199 },
  { id: 'surprise', label: 'Anonymous until opened',   price: 99,
    note: 'No sender name on the parcel or the docket — only inside the card' },
]

// A hamper's contents can be scaled up. A single engraved pen cannot, and
// offering "Luxury" on one would take money for nothing.
const TIER_APPLIES = /hamper|basket|box|combo|set|kit|tray|assort/i
const ENGRAVABLE   = /mug|frame|bottle|pen|keychain|necklace|wallet|diary|notebook|plaque|cushion|nameplate|engrav|personalis/i

export function buildGiftOptionGroups(product) {
  const name   = product.name ?? ''
  const groups = []

  if (TIER_APPLIES.test(name)) {
    groups.push({
      id: 'tier',
      label: 'How generous?',
      type: 'single',
      required: true,
      role: 'spec',
      options: scaledOptions({
        steps: TIER_STEPS,
        multipliers: TIER_MULTIPLIER,
        current: 1,
        price: product.price,
        label: step => TIER_LABEL[step],
        note: step => TIER_NOTE[step],
      }),
    })
  }

  if (ENGRAVABLE.test(name)) {
    groups.push({
      id: 'engraving',
      label: 'Name to print or engrave',
      hint: 'Spelled exactly as you type it — we don’t correct it',
      type: 'text',
      role: 'note',
      maxLength: 24,
      placeholder: 'e.g. "Ananya"',
    })
  }

  groups.push({
    id: 'wrap',
    label: 'Wrapping',
    type: 'single',
    required: true,
    role: 'spec',
    options: WRAP,
  })

  // Handwritten, not printed. It is the only part of a delivered gift that
  // carries the sender, and a laser-printed line reads like an invoice.
  groups.push({
    id: 'message',
    label: 'Message on the card',
    hint: 'Written by hand and tucked inside',
    type: 'text',
    role: 'note',
    maxLength: 140,
    placeholder: 'e.g. "Happy Diwali, di. Wish we were there this year."',
  })

  groups.push({ id: 'extras', label: 'Add to the parcel', type: 'multi', max: 3, role: 'addon', options: EXTRAS })

  groups.push({
    id: 'delivery',
    label: 'When should it arrive?',
    type: 'single',
    required: true,
    role: 'schedule',
    options: DELIVERY,
  })

  // A promise rather than a checkbox: nobody should have to opt out of having
  // the price shown to the person they bought it for.
  groups.push({
    id: 'noprice',
    label: 'On the price',
    type: 'info',
    text: 'No invoice, price tag or amount goes into a gift parcel. Ever. Your bill reaches you by email.',
  })

  return groups
}
