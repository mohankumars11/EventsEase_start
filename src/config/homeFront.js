import { CATALOGUE_PHOTOS, occasionPhoto } from './imagery'
import { GENERATED_SHELF_PHOTOS } from './generatedShelfPhotos'
import { OCCASION_TILES } from '../data/giftingHome'

/**
 * The front door's three rows — the storefront pills, the category circles,
 * and the occasion grid.
 *
 * They live in config rather than in data/giftingHome.js for the same reason
 * homeMosaic.js does: every entry here is bound to a *committed* photograph,
 * resolved at module load out of the generated maps. data/ holds the lists
 * that are true regardless of what has been photographed; config/ holds the
 * ones that would render as an empty coloured square if the resolver had not
 * been run.
 *
 * ── Why nothing here carries a `query` ──────────────────────────────────
 * The runtime Unsplash helper is capped at 24 live searches per page load.
 * These three rows alone are twenty-one images and they are all above or just
 * below the fold, so routing them through live search would spend the entire
 * page's budget before the occasion grid painted — and every one of them
 * would arrive a beat late, which on the first screen reads as a page that
 * failed to load. Every entry below resolves to a URL synchronously or it
 * does not ship.
 */

const shelf = key => (GENERATED_SHELF_PHOTOS[key] ?? []).map(p => p.url).filter(Boolean)
const catalogue = (category, occasion) => CATALOGUE_PHOTOS[category]?.[occasion] ?? null

/**
 * The storefront strip — six propositions, not six categories.
 *
 * Order is by breadth, not by margin: the whole shop, then the two halves of
 * the business (things and celebrations), then the shelf that is the reason
 * to be here rather than on a national app, then the two urgencies.
 *
 * `occasion` is what makes a pill self-dating — `StorefrontPillRail` reads it
 * through `festivalTag`, so the Rakhi pill wears its date for three weeks and
 * then stops. `tag` is the manual override, used only where the news is not a
 * date: Heritage is genuinely a new shelf and says so until it isn't.
 */
export const STOREFRONT_PILLS = [
  { id: 'shop',      label: 'Sambramo',  to: '/shop',                              accent: 'plum',    weight: 'brand' },
  { id: 'heritage',  label: 'Heritage',  to: '/shop/Heritage%20%26%20Crafts',      accent: 'sage',    weight: 'display', tag: 'New' },
  { id: 'plan',      label: 'Celebrate', to: '/plan',                              accent: 'saffron', weight: 'display' },
  { id: 'services',  label: 'Services',  to: '/services',                          accent: 'sand',    weight: 'brand' },
  { id: 'rakhi',     label: 'Rakhi',     to: '/shop/Gifts?occasion=Rakhi',         accent: 'chilli',  weight: 'display', occasion: 'Rakhi' },
  { id: 'today',     label: 'Same day',  to: '/shop/today',                        accent: 'plum',    weight: 'brand' },
]

/**
 * The category circles — the toolbar under the search field.
 *
 * Rakhi leads while it is dated, because a row is scanned left to right and
 * the entry with a deadline on it is the one that is worth interrupting for.
 * `festivalTag` removes that badge on the 29th; the ordering stays, which is
 * correct — it is still the season people are shopping in.
 */
export const CATEGORY_CIRCLES = [
  { id: 'rakhi',    label: 'Rakhi',        to: '/shop/Gifts?occasion=Rakhi',     colour: 'amber', occasion: 'Rakhi', photo: catalogue('Gifts', 'Rakhi') },
  /* Not Flowers/Birthday, which is the confetti shot: at 64px a texture of
     small bright specks resolves to grey noise and the disc reads as broken.
     A single-subject photograph is the only kind that survives this size. */
  { id: 'today',    label: 'Same day',     to: '/shop/today',                    colour: 'coral', photo: catalogue('Flowers', 'Festive') },
  { id: 'flowers',  label: 'Flowers',      to: '/shop/Flowers',                  colour: 'rose',  photo: catalogue('Flowers', 'Anniversary') },
  { id: 'cakes',    label: 'Cakes',        to: '/shop/Cakes',                    colour: 'blush', photo: catalogue('Cakes', 'Birthday') },
  { id: 'gifts',    label: 'Gifts',        to: '/shop/Gifts',                    colour: 'lilac', photo: catalogue('Gifts', 'Birthday') },
  { id: 'pooja',    label: 'Pooja',        to: '/shop/Pooja%20%26%20Essentials', colour: 'sand',  occasion: 'Onam', photo: catalogue('Pooja & Essentials', 'Diwali') },
  { id: 'heritage', label: 'Heritage',     to: '/shop/Heritage%20%26%20Crafts',  colour: 'sage',  photo: shelf('silk')[0] ?? shelf('weaves')[0] },
  { id: 'party',    label: 'Party decor',  to: '/shop/Party%20Essentials',       colour: 'mint',  photo: catalogue('Party Essentials', 'Balloon Decor') },
]

/**
 * "Gifts for every occasion" — the same nine occasions data/giftingHome.js
 * declares, each resolved to the photograph its shelf already uses.
 *
 * `occasionPhoto` walks the category fallback chain, so an occasion whose own
 * category has no photography still lands on a relevant one rather than an
 * empty tile. Anything that resolves to nothing is dropped rather than
 * rendered as a coloured square — a hole in the grid is honest; a blank tile
 * that looks like a failed image is not.
 */
export const OCCASION_GRID_TILES = OCCASION_TILES
  .map(t => ({ ...t, photo: occasionPhoto(t) }))
  .filter(t => t.photo)
