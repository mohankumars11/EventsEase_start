// Shop config — centralized so business rules aren't scattered
// hardcoded numbers across components (blueprint section 133).

export const SHOP_CATEGORIES = [
  { id: 'Cakes',              label: 'Cakes',              emoji: '🎂', tagline: 'Made to order for every occasion — pick your size, flavour and extras' },
  // Gifts and Hampers were two shelves holding one intent, which made every
  // occasion look half as deep as it was — Diwali showed 5 gifts on one page
  // and 6 hampers on another. Merged (migration 031); the id stays 'Gifts'
  // because it is a route, a CHECK value and an order-history snapshot, and
  // only the label needed to change.
  { id: 'Gifts',              label: 'Gifts & Hampers',    emoji: '🎁', tagline: 'One gift or a whole hamper — wrapped, carded and delivered' },
  { id: 'Flowers',            label: 'Flowers',            emoji: '💐', tagline: 'Fresh bouquets, delivered same-day' },
  { id: 'Party Essentials',   label: 'Party Essentials',   emoji: '🎈', tagline: 'Balloons, banners & party supplies' },
  { id: 'Pooja & Essentials', label: 'Pooja & Essentials', emoji: '🪔', tagline: 'Diyas, samagri, flowers & pandit booking' },
  // Migration 048. The one shelf here that is a reason to exist rather than a
  // convenience: cakes and balloons are available from twenty apps in
  // Bengaluru, and a Molakalmuru silk, a Mysore gesso painting or a rosewood
  // inlay panel are not. A brand live in exactly Bengaluru and Mysuru is the
  // one that should be selling them.
  //
  // Listed last on purpose. It is the highest-ticket and slowest-moving
  // category, so it must not stand between a customer and a cake — but it is
  // the category the home mosaic gives its own full-width tile to, because
  // that is where somebody discovers a shelf they were not looking for.
  { id: 'Heritage & Crafts',  label: 'Heritage & Crafts',  emoji: '🪆', tagline: 'Mysore silk, rare handloom weaves, carvings and the Mysuru specialities' },
]

export const DELIVERY_FEE = 49
export const FREE_DELIVERY_THRESHOLD = 999

// Who the customer is actually buying from.
//
// Sambramo does not run a bakery. Every cake is baked by a partner kitchen
// and sourced per order — but the customer pays Sambramo, complains to
// Sambramo, and gets refunded by Sambramo. That arrangement is normal and
// it is worth stating plainly rather than leaving someone to work out, at
// the door, that the person handing over the box has a different name on
// their shirt than the app they ordered from.
//
// Stated once here so the wording is identical in the shop, the customiser,
// the cart and the confirmation screen. It is a promise about responsibility,
// not marketing copy — don't soften it into "partnered with the best bakers"
// without changing what's actually true.
export const FULFILMENT = {
  short:  'Delivered by Sambramo',
  // Not "partner bakers" any more: this note now sits on balloon arches,
  // havan kits and gift hampers as well as cakes, and a decor customer read
  // "baked by" as a copy-paste error — which it was.
  line:   'Delivered by Sambramo, on behalf of our partner vendors.',
  detail:
    'Your order is made by one of our partner kitchens, decorators or suppliers, ' +
    'and delivered by Sambramo. We handle the order, the delivery and anything ' +
    'that goes wrong with it — one number to call, whoever made it.',
}

// How an order actually gets served, in the three steps a customer goes
// through. The storefront shows this instead of the usual "About us" block,
// because the question a first-time visitor to a shop they've never heard of
// is really asking is "who is this, and what happens after I pay?".
//
// Each line is written against what is true today, and that constrains the
// wording more than it looks:
//
//   — "hand-picked" and not "top-rated". Sambramo is pre-launch. There is no
//     order history to rate a vendor on, so a star rating next to a partner's
//     name would be a number nobody earned. When there are real ratings this
//     line is the place to say so — until then it claims selection, which is
//     true, rather than reputation, which isn't yet.
//   — "sourced per order" rather than "in stock". Nothing is warehoused.
//   — Step three is FULFILMENT.short verbatim, because it is the same promise
//     the cart, the customiser and the confirmation screen make.
export const SERVICE_MODEL = [
  {
    id: 'choose',
    title: 'You choose',
    detail: 'Pick from the catalogue and tell us the date, the message and the address.',
  },
  {
    id: 'source',
    title: 'We source it',
    detail: 'Hand-picked partner kitchens and vendors make it fresh for your order — nothing sits in a warehouse.',
  },
  {
    id: 'deliver',
    title: FULFILMENT.short,
    detail: 'One number to call for the order, the delivery and anything that goes wrong — whoever made it.',
  },
]

// Categories where a gift message genuinely matters — a stray "add a
// note to every product" field would just be friction on a balloon
// bunch or a diya set. Only these open the customization modal.
// Every category listed here that ALSO has a builder in config/customizers
// opens the full option sheet instead; this is the fallback for the rest.
// Today that means Flowers. The others stay listed because the fallback has
// to keep working if a builder is ever removed — a product that silently
// loses its gift-message field is a worse failure than a redundant entry.
export const CUSTOMIZABLE_CATEGORIES = {
  'Cakes':   { label: 'Message on the cake',  placeholder: 'e.g. "Happy Birthday Aarav!" (leave blank for none)' },
  'Hampers': { label: 'Gift message',          placeholder: 'e.g. "Wishing you all the best!"' },
  'Gifts':   { label: 'Gift message',          placeholder: 'e.g. "Thinking of you today."' },
  'Flowers': { label: 'Card message',          placeholder: 'e.g. "Happy Anniversary!"' },
}

// Categories whose rows are merged under another id. Read side only: the
// storefront queries every alias so the app renders identically before and
// after migration 031 is applied by hand.
export const CATEGORY_ALIASES = {
  'Gifts': ['Gifts', 'Hampers'],
}

export const categoryQueryValues = (categoryId) => CATEGORY_ALIASES[categoryId] ?? [categoryId]
