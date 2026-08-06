// Real photography for the storefront.
//
// These URLs are lifted from migration 017, which already went through a
// curation pass against the live catalogue — every one of them is the photo a
// real product row points at, so a card on the landing page and the product it
// links to show the same thing. Pulling them from a module rather than the
// Unsplash search API matters: the runtime helper in lib/unsplash.js is capped
// at 24 live searches per page load to stay inside the free tier, and a
// storefront that needs three dozen photos above the fold would spend that
// budget before the first section finished painting.
//
// Party Essentials and Pooja & Essentials have no rows in 017 — that migration
// ran out of rate-limit budget before reaching them. Those two fall back to the
// runtime fetch, and to their emoji if that fails.

export const CATALOGUE_PHOTOS = {
  "Cakes": {
    "Birthday": 'https://images.unsplash.com/photo-1664032655802-ef0a6895619a?auto=format&fit=crop&w=800&q=70',
    "Wedding": 'https://images.unsplash.com/photo-1503525642560-ecca5e2e49e9?auto=format&fit=crop&w=800&q=70',
    "Anniversary": 'https://images.unsplash.com/photo-1635117492718-695a17a5977a?auto=format&fit=crop&w=800&q=70',
    "Kids & Theme": 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=70',
    "Photo Cake": 'https://images.unsplash.com/photo-1664032655802-ef0a6895619a?auto=format&fit=crop&w=800&q=70',
    "Eggless": 'https://images.unsplash.com/photo-1621868402792-a5c9fa6866a3?auto=format&fit=crop&w=800&q=70',
    "Baby Shower": 'https://images.unsplash.com/photo-1621868402792-a5c9fa6866a3?auto=format&fit=crop&w=800&q=70',
    "Congratulations": 'https://images.unsplash.com/photo-1664032655802-ef0a6895619a?auto=format&fit=crop&w=800&q=70',
    "Farewell": 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=70',
    "Valentine": 'https://images.unsplash.com/photo-1694443211974-986dfc695c03?auto=format&fit=crop&w=800&q=70',
  },
  "Gifts": {
    "Birthday": 'https://images.unsplash.com/photo-1707944145479-12755f0434d8?auto=format&fit=crop&w=800&q=70',
    "Wedding": 'https://images.unsplash.com/photo-1707944145479-12755f0434d8?auto=format&fit=crop&w=800&q=70',
    "Anniversary": 'https://images.unsplash.com/photo-1654700194896-6318cdc3b184?auto=format&fit=crop&w=800&q=70',
    "Rakhi": 'https://images.unsplash.com/photo-1693473812472-a9f1887a6b2d?auto=format&fit=crop&w=800&q=70',
    "Diwali": 'https://images.unsplash.com/photo-1720788810305-85fe22e6c3a2?auto=format&fit=crop&w=800&q=70',
    "Housewarming": 'https://images.unsplash.com/photo-1559662780-c3bab6f7e00b?auto=format&fit=crop&w=800&q=70',
    "Baby Shower": 'https://images.unsplash.com/photo-1662450819476-200d652598a7?auto=format&fit=crop&w=800&q=70',
    "Corporate": 'https://images.unsplash.com/photo-1719622144274-2408ecf6f6d9?auto=format&fit=crop&w=800&q=70',
    "Get Well": 'https://images.unsplash.com/photo-1716625301402-f0fa26235fb3?auto=format&fit=crop&w=800&q=70',
    "Farewell": 'https://images.unsplash.com/photo-1707944145479-12755f0434d8?auto=format&fit=crop&w=800&q=70',
    "Valentine": 'https://images.unsplash.com/photo-1774464593573-d641812872ce?auto=format&fit=crop&w=800&q=70',
    "Congratulations": 'https://images.unsplash.com/photo-1598968429739-b1bb16b888b0?auto=format&fit=crop&w=800&q=70',
  },
  "Flowers": {
    "Birthday": 'https://images.unsplash.com/photo-1779228308893-25ce349cca09?auto=format&fit=crop&w=800&q=70',
    "Wedding": 'https://images.unsplash.com/photo-1782776852455-d9df2bc45d73?auto=format&fit=crop&w=800&q=70',
    "Anniversary": 'https://images.unsplash.com/photo-1605350530498-104e2a67331d?auto=format&fit=crop&w=800&q=70',
    "Sympathy": 'https://images.unsplash.com/photo-1708270828781-75b95c2cbbf9?auto=format&fit=crop&w=800&q=70',
    "Valentine": 'https://images.unsplash.com/photo-1548094967-e25a127d1f6d?auto=format&fit=crop&w=800&q=70',
    "Get Well": 'https://images.unsplash.com/photo-1596956458456-ecb4a82c6ad9?auto=format&fit=crop&w=800&q=70',
    "Congratulations": 'https://images.unsplash.com/photo-1604137488398-b1d691713d96?auto=format&fit=crop&w=800&q=70',
    "Housewarming": 'https://images.unsplash.com/photo-1759345556198-5ec4c4a0a976?auto=format&fit=crop&w=800&q=70',
    "Daily & Pooja": 'https://images.unsplash.com/photo-1607446035439-71554e37c8e0?auto=format&fit=crop&w=800&q=70',
    "Festive": 'https://images.unsplash.com/photo-1632296521966-b19f0d728635?auto=format&fit=crop&w=800&q=70',
    "Baby Shower": 'https://images.unsplash.com/photo-1692167900605-e02666cadb6d?auto=format&fit=crop&w=800&q=70',
    "Farewell": 'https://images.unsplash.com/photo-1604137488398-b1d691713d96?auto=format&fit=crop&w=800&q=70',
  },
  "Hampers": {
    "Diwali": 'https://images.unsplash.com/photo-1616252576862-bd9abd7467f9?auto=format&fit=crop&w=800&q=70',
    "Rakhi": 'https://images.unsplash.com/photo-1616252576862-bd9abd7467f9?auto=format&fit=crop&w=800&q=70',
    "New Year": 'https://images.unsplash.com/photo-1527242263-03150c939169?auto=format&fit=crop&w=800&q=70',
    "Wedding": 'https://images.unsplash.com/photo-1732928730431-11c206639a38?auto=format&fit=crop&w=800&q=70',
    "Corporate": 'https://images.unsplash.com/photo-1732928730431-11c206639a38?auto=format&fit=crop&w=800&q=70',
    "Get Well": 'https://images.unsplash.com/photo-1761864293818-603c23655cee?auto=format&fit=crop&w=800&q=70',
    "Birthday": 'https://images.unsplash.com/photo-1681936482890-52107a6fd090?auto=format&fit=crop&w=800&q=70',
    "Chocolate": 'https://images.unsplash.com/photo-1687514852944-92879f9abc0f?auto=format&fit=crop&w=800&q=70',
    "Dry Fruits": 'https://images.unsplash.com/photo-1702043239331-da06c5c269e4?auto=format&fit=crop&w=800&q=70',
    "Housewarming": 'https://images.unsplash.com/photo-1781263538938-561a5e1acc51?auto=format&fit=crop&w=800&q=70',
    "Anniversary": 'https://images.unsplash.com/photo-1580316521041-29524fd519f1?auto=format&fit=crop&w=800&q=70',
    "Baby Shower": 'https://images.unsplash.com/photo-1580316521041-29524fd519f1?auto=format&fit=crop&w=800&q=70',
  },
}

/** The lead photo for each shop category card. */
export const CATEGORY_PHOTO = {
  'Cakes':              CATALOGUE_PHOTOS['Cakes']['Birthday'],
  'Gifts':              CATALOGUE_PHOTOS['Gifts']['Diwali'],
  'Flowers':            CATALOGUE_PHOTOS['Flowers']['Anniversary'],
  'Hampers':            CATALOGUE_PHOTOS['Hampers']['Diwali'],
  'Party Essentials':   null,  // no catalogue photo yet — falls back to runtime fetch
  'Pooja & Essentials': null,
}

/** Runtime search terms for the two categories 017 never reached. */
export const CATEGORY_PHOTO_QUERY = {
  'Party Essentials':   'birthday party balloons decoration colourful',
  'Pooja & Essentials': 'indian puja thali brass diya marigold',
}

/**
 * Shop-by-occasion rail. Each occasion points at the category that carries it
 * best rather than a fixed one, so the row reads as a spread of real things —
 * a cake, a hamper, a bouquet — instead of six variations of the same shot.
 */
export const OCCASION_CARDS = [
  { occasion: 'Birthday',     category: 'Cakes',   label: 'Birthday',     blurb: 'Cakes, balloons and the candles' },
  { occasion: 'Diwali',       category: 'Hampers', label: 'Diwali',       blurb: 'Hampers, diyas and sweets' },
  { occasion: 'Anniversary',  category: 'Flowers', label: 'Anniversary',  blurb: 'Bouquets and something to unwrap' },
  { occasion: 'Wedding',      category: 'Hampers', label: 'Wedding',      blurb: 'Return gifts and trousseau hampers' },
  { occasion: 'Rakhi',        category: 'Gifts',   label: 'Rakhi',        blurb: 'Rakhis, sweets and courier-safe boxes' },
  { occasion: 'Baby Shower',  category: 'Cakes',   label: 'Baby Shower',  blurb: 'Pastel cakes and keepsakes' },
  { occasion: 'Housewarming', category: 'Gifts',   label: 'Housewarming', blurb: 'Home gifts and pooja basics' },
  { occasion: 'Corporate',    category: 'Hampers', label: 'Corporate',    blurb: 'Bulk hampers, GST invoiced' },
]

export function occasionPhoto(card) {
  return CATALOGUE_PHOTOS[card.category]?.[card.occasion] ?? null
}
