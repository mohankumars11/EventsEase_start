// Shop config — centralized so business rules aren't scattered
// hardcoded numbers across components (blueprint section 133).

export const SHOP_CATEGORIES = [
  { id: 'Cakes',              label: 'Cakes',              emoji: '🎂', tagline: 'Fresh, made-to-order celebration cakes' },
  { id: 'Gifts',              label: 'Gifts',              emoji: '🎁', tagline: 'Thoughtful gifts for every occasion' },
  { id: 'Flowers',            label: 'Flowers',            emoji: '💐', tagline: 'Fresh bouquets, delivered same-day' },
  { id: 'Hampers',            label: 'Hampers',            emoji: '🧺', tagline: 'Curated hampers for celebrations' },
  { id: 'Party Essentials',   label: 'Party Essentials',   emoji: '🎈', tagline: 'Balloons, banners & party supplies' },
  { id: 'Pooja & Essentials', label: 'Pooja & Essentials', emoji: '🪔', tagline: 'Diyas, samagri, flowers & pandit booking' },
]

export const DELIVERY_FEE = 49
export const FREE_DELIVERY_THRESHOLD = 999

// Categories where a gift message genuinely matters — a stray "add a
// note to every product" field would just be friction on a balloon
// bunch or a diya set. Only these open the customization modal.
export const CUSTOMIZABLE_CATEGORIES = {
  'Cakes':   { label: 'Message on the cake',  placeholder: 'e.g. "Happy Birthday Aarav!" (leave blank for none)' },
  'Hampers': { label: 'Gift message',          placeholder: 'e.g. "Wishing you all the best!"' },
  'Gifts':   { label: 'Gift message',          placeholder: 'e.g. "Thinking of you today."' },
  'Flowers': { label: 'Card message',          placeholder: 'e.g. "Happy Anniversary!"' },
}
