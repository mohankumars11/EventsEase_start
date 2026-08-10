// Shop config — centralized so business rules aren't scattered
// hardcoded numbers across components (blueprint section 133).

export const SHOP_CATEGORIES = [
  { id: 'Cakes',              label: 'Cakes',              emoji: '🎂', tagline: 'Made to order for every occasion — pick your size, flavour and extras' },
  { id: 'Gifts',              label: 'Gifts',              emoji: '🎁', tagline: 'Thoughtful gifts for every occasion' },
  { id: 'Flowers',            label: 'Flowers',            emoji: '💐', tagline: 'Fresh bouquets, delivered same-day' },
  { id: 'Hampers',            label: 'Hampers',            emoji: '🧺', tagline: 'Curated hampers for celebrations' },
  { id: 'Party Essentials',   label: 'Party Essentials',   emoji: '🎈', tagline: 'Balloons, banners & party supplies' },
  { id: 'Pooja & Essentials', label: 'Pooja & Essentials', emoji: '🪔', tagline: 'Diyas, samagri, flowers & pandit booking' },
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
  line:   'Delivered by Sambramo, on behalf of our partner bakers.',
  detail:
    'Your cake is baked by one of our partner kitchens and delivered by Sambramo. ' +
    'We handle the order, the delivery and anything that goes wrong with it — ' +
    'one number to call, whoever baked it.',
}

// Categories where a gift message genuinely matters — a stray "add a
// note to every product" field would just be friction on a balloon
// bunch or a diya set. Only these open the customization modal.
export const CUSTOMIZABLE_CATEGORIES = {
  'Cakes':   { label: 'Message on the cake',  placeholder: 'e.g. "Happy Birthday Aarav!" (leave blank for none)' },
  'Hampers': { label: 'Gift message',          placeholder: 'e.g. "Wishing you all the best!"' },
  'Gifts':   { label: 'Gift message',          placeholder: 'e.g. "Thinking of you today."' },
  'Flowers': { label: 'Card message',          placeholder: 'e.g. "Happy Anniversary!"' },
}
