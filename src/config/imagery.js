// Real photography for the storefront.
//
// Pulling these from a module rather than the Unsplash search API matters: the
// runtime helper in lib/unsplash.js is capped at 24 live searches per page load
// to stay inside the free tier, and a storefront that needs three dozen photos
// above the fold would spend that budget before the first section finished
// painting.
//
// ── Where these values come from ──────────────────────────────────────────
// The FALLBACK map below was copied by hand out of migration 017. That copy
// was the problem: it has no link to the database, so when migration 021
// filled in Party Essentials and Pooja & Essentials, this file went on
// declaring both as having no photo. A landing-page card could show one thing
// and the product it linked to show another.
//
// So the hardcoded values are now only a floor. generatedImagery.js is written
// by scripts/resolve-product-images.mjs in the same pass that produces the
// per-product image_url values, and is layered on top — meaning the landing
// page and the shop cannot disagree once that script has been run. Until then
// this file behaves exactly as it always did.

import { GENERATED_CATALOGUE_PHOTOS, GENERATED_CATEGORY_PHOTO } from './generatedImagery'

const FALLBACK_CATALOGUE_PHOTOS = {
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

/**
 * Generated values win per (category, occasion); anything the resolver hasn't
 * covered keeps its hardcoded value. Shallow-merging one level down rather
 * than replacing whole categories means a partial run (`--category Cakes`)
 * can't blank out everything it didn't touch.
 */
export const CATALOGUE_PHOTOS = Object.entries(GENERATED_CATALOGUE_PHOTOS).reduce(
  (acc, [category, byOccasion]) => ({
    ...acc,
    [category]: { ...(acc[category] ?? {}), ...byOccasion },
  }),
  { ...FALLBACK_CATALOGUE_PHOTOS }
)

/**
 * The lead photo for each shop category card.
 *
 * Party Essentials and Pooja & Essentials are no longer hardcoded to null.
 * They were null because migration 017 ran out of Unsplash quota before
 * reaching them — a condition that stopped being true two migrations later
 * and that nothing here could notice. Now any category the resolver has
 * covered resolves to a real photo automatically, and CATEGORY_PHOTO_QUERY
 * below remains the fallback for one that hasn't.
 */
const LEAD_OCCASION = {
  'Cakes':   'Birthday',
  'Gifts':   'Diwali',
  'Flowers': 'Anniversary',
  'Hampers': 'Diwali',
}

const CATEGORY_IDS = [
  'Cakes', 'Gifts', 'Flowers', 'Hampers', 'Party Essentials', 'Pooja & Essentials',
]

export const CATEGORY_PHOTO = Object.fromEntries(
  CATEGORY_IDS.map(category => [
    category,
    CATALOGUE_PHOTOS[category]?.[LEAD_OCCASION[category]]
      ?? GENERATED_CATEGORY_PHOTO[category]
      ?? Object.values(CATALOGUE_PHOTOS[category] ?? {})[0]
      ?? null,
  ])
)

/** Runtime search terms for any category the resolver hasn't covered. */
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
  { occasion: 'Diwali',       category: 'Gifts',   label: 'Diwali',       blurb: 'Hampers, diyas and sweets' },
  { occasion: 'Anniversary',  category: 'Flowers', label: 'Anniversary',  blurb: 'Bouquets and something to unwrap' },
  { occasion: 'Wedding',      category: 'Gifts',   label: 'Wedding',      blurb: 'Return gifts and trousseau hampers' },
  { occasion: 'Rakhi',        category: 'Gifts',   label: 'Rakhi',        blurb: 'Rakhis, sweets and courier-safe boxes' },
  { occasion: 'Baby Shower',  category: 'Cakes',   label: 'Baby Shower',  blurb: 'Pastel cakes and keepsakes' },
  { occasion: 'Housewarming', category: 'Gifts',   label: 'Housewarming', blurb: 'Home gifts and pooja basics' },
  { occasion: 'Corporate',    category: 'Gifts',   label: 'Corporate',    blurb: 'Bulk hampers, GST invoiced' },
]

// Gifts and Hampers are one category now (migration 031), but the photo map
// was built when they were two — the Wedding and Corporate shots live under
// 'Hampers' and there is no 'Gifts' equivalent. Falling through the aliases
// keeps every occasion card illustrated instead of silently dropping to the
// emoji tile.
const PHOTO_FALLBACK = { 'Gifts': ['Gifts', 'Hampers'] }

export function occasionPhoto(card) {
  const categories = PHOTO_FALLBACK[card.category] ?? [card.category]
  for (const category of categories) {
    const photo = CATALOGUE_PHOTOS[category]?.[card.occasion]
    if (photo) return photo
  }
  return null
}

/**
 * Reels for the two cards on the fork.
 *
 * A single still cannot answer "what do you actually do?" — one cake said we
 * sell cakes. Each frame carries its own label so the picture and the caption
 * change together, which turns the card into a short, silent list of the
 * range instead of decoration. Ordered to open on the least expected item, so
 * the first thing a returning visitor sees is not always the same.
 */
export const PLAN_REEL = [
  { src: CATALOGUE_PHOTOS['Flowers']['Wedding'],     label: 'Décor & florals' },
  { src: CATALOGUE_PHOTOS['Cakes']['Birthday'],      label: 'Birthdays' },
  { src: CATALOGUE_PHOTOS['Hampers']['Wedding'],     label: 'Weddings & return gifts' },
  { src: CATALOGUE_PHOTOS['Cakes']['Baby Shower'],   label: 'Baby showers' },
  { src: CATALOGUE_PHOTOS['Hampers']['Diwali'],      label: 'Festivals & pooja' },
  { src: CATALOGUE_PHOTOS['Flowers']['Anniversary'], label: 'Anniversaries' },
  { src: CATALOGUE_PHOTOS['Hampers']['Corporate'],   label: 'Corporate events' },
]

export const SHOP_REEL = [
  { src: CATALOGUE_PHOTOS['Cakes']['Birthday'],        label: 'Cakes, made to order' },
  { src: CATALOGUE_PHOTOS['Flowers']['Anniversary'],   label: 'Fresh bouquets' },
  { src: CATALOGUE_PHOTOS['Hampers']['Diwali'],        label: 'Festive hampers' },
  { src: CATALOGUE_PHOTOS['Gifts']['Rakhi'],           label: 'Rakhi & gifting' },
  { src: CATALOGUE_PHOTOS['Flowers']['Daily & Pooja'], label: 'Pooja flowers, daily' },
  { src: CATALOGUE_PHOTOS['Cakes']['Photo Cake'],      label: 'Photo cakes' },
  { src: CATALOGUE_PHOTOS['Gifts']['Corporate'],       label: 'Corporate gifting' },
]
