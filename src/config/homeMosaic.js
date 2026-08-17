import { CATALOGUE_PHOTOS } from './imagery'
import { GENERATED_SHELF_PHOTOS } from './generatedShelfPhotos'
import { OCCASIONS } from '../data/planCatalog'

/**
 * The home mosaic — every shelf Sambramo has, as one structure.
 *
 * ── What this replaces ────────────────────────────────────────────────────
 * Home used to introduce the business through four separate devices stacked
 * down the page: a promo deck (three slides), a drawn film, a tier rail, and a
 * two-per-row occasion grid — then the shop arrived as two horizontal rails
 * near the bottom. Each one was well made and none of them answered the first
 * question a new visitor has, which is simply "what can I get here?".
 *
 * The answer is broad and it is the product's actual strength: whole
 * celebrations, single services, cakes, flowers, decor, pooja, gifting, and a
 * heritage-crafts shelf nobody else in these two cities lists. That is a range,
 * and a range is shown as a grid rather than said in a sentence.
 *
 * ── Why the spans vary ────────────────────────────────────────────────────
 * A grid of identical tiles has no opinion. Twelve equal squares tell a customer
 * that a ₹399 diya set and a ₹78,000 Patan Patola are the same size of
 * decision, and they are not.
 *
 * So the mosaic runs on a four-column grid with three tile sizes, and size
 * carries meaning rather than decoration:
 *
 *   hero  (4 wide, 2 tall)  the two things the business is FOR — arranging a
 *                           celebration, and the heritage shelf that is the
 *                           reason to choose Sambramo over a national app.
 *   tall  (2 wide, 2 tall)  a shelf worth browsing: an occasion, cakes, a craft.
 *   band  (4 wide, 1 tall)  a doorway, not a browse — "here is where the rest
 *                           of it lives".
 *   half  (2 wide, 1 tall)  a shelf that is real but narrow.
 *
 * Reading down, it alternates full-width and paired, which is what gives the
 * page a rhythm instead of a texture. Events lead because events are where the
 * revenue is; the shop follows because it is the second half of the same
 * business and not a different app.
 *
 * ── Every tile has real photography ───────────────────────────────────────
 * Four committed HD frames each, cross-faded by RotatingPhoto. No emoji tiles
 * anywhere in the mosaic, and no runtime image search: `ProductImage`'s live
 * `query` path is capped at 24 lookups per page load app-wide, and fourteen
 * tiles times four frames is fifty-six. Every URL below is already resolved and
 * in the repo, so the mosaic costs zero API calls.
 *
 * Sources, in the order they were built:
 *   CATALOGUE_PHOTOS        config/imagery.js — the shop, by (category, occasion)
 *   OCCASIONS[].photos      four setups per occasion, from generatedDecorSamples
 *   GENERATED_SHELF_PHOTOS  generatedShelfPhotos.js — the shelves added by
 *                           migrations 047 and 048, which had no photography
 *                           because they had never existed before
 *
 * ── The accents are the tile's own ────────────────────────────────────────
 * Each tile carries a hex accent used for its eyebrow chip and the tint in its
 * scrim. They are drawn from the app's existing palette (plum, saffron, forest,
 * chilli, berry) rather than invented, so fourteen differently-coloured tiles
 * still read as one brand — which is the whole difficulty with a multi-coloured
 * grid, and the reason most of them look like a toy.
 */

/* ── Photo helpers ─────────────────────────────────────────────────────────
   Each returns exactly the frames that exist. `.filter(Boolean)` matters:
   CATALOGUE_PHOTOS is merged from a hardcoded floor and a generated layer, so
   a given (category, occasion) may legitimately be absent, and a hole in the
   array would render as a blank frame mid-rotation. */

const byOccasion = (category, occasions) =>
  occasions.map(o => CATALOGUE_PHOTOS[category]?.[o]).filter(Boolean)

const shelf = key => (GENERATED_SHELF_PHOTOS[key] ?? []).map(p => p.url).filter(Boolean)

const occasionById = id => OCCASIONS.find(o => o.id === id)
const occasionPhotos = id => occasionById(id)?.photos ?? []

/** One frame from each of several occasions — a montage, not a shelf. */
const spread = (...ids) => ids.map(id => occasionPhotos(id)[0]).filter(Boolean)

/* Gifts absorbed Hampers in migration 031, but the photo map was built when
   they were two categories — so the good hamper photography still lives under
   the old key. Reading both is what keeps the gifting tiles illustrated. */
const giftPhotos = occasions => [
  ...byOccasion('Gifts', occasions),
  ...byOccasion('Hampers', occasions),
].filter(Boolean)

export const MOSAIC_TILES = [
  {
    id: 'plan',
    size: 'hero',
    eyebrow: 'The whole thing, arranged',
    title: 'Tell us what you’re celebrating',
    body: 'Venue, decor, food, photography, priests — one team arranges all of it and one number answers for it.',
    // Not "Plan a celebration" — that exact button is the left-hand door in
    // the brand band at the top of this page. Same destination, different
    // words, because a customer scrolling here has passed that band and a
    // verbatim repeat reads as the page having looped.
    cta: 'Start with your occasion',
    to: '/plan',
    accent: '#6d28d9',
    // Five different occasions rather than five shots of one. The tile has to
    // say "any celebration", and four angles on the same wedding says the
    // opposite of that.
    //
    // Seemantham and Upanayanam are in the montage on purpose. A wedding and a
    // birthday are what every events app shows; a godh bharai and a thread
    // ceremony are what tells somebody in Bengaluru that this app was built for
    // their family's calendar and not localised into it.
    photos: spread('wedding', 'birthday', 'seemantham', 'thread_ceremony', 'housewarming'),
    alt: 'Celebrations arranged end to end by Sambramo',
  },
  {
    id: 'birthday',
    size: 'tall',
    eyebrow: 'Most booked',
    title: 'Birthdays',
    body: 'Decor, cake and the room, set up before anyone arrives.',
    to: '/services/birthday',
    accent: '#d946ef',
    photos: occasionPhotos('birthday'),
    alt: 'Birthday decoration setups',
  },
  {
    id: 'wedding',
    size: 'tall',
    eyebrow: 'Full production',
    title: 'Weddings',
    body: 'Mandap to send-off, coordinated day by day.',
    to: '/services/wedding',
    accent: '#b45309',
    photos: occasionPhotos('wedding'),
    alt: 'Wedding decoration and mandap setups',
  },
  {
    id: 'single-service',
    size: 'band',
    eyebrow: 'Or just one thing',
    title: 'A cook, a decorator, a photographer',
    body: 'You don’t need a whole celebration to book one service.',
    to: '/services',
    accent: '#0e523c',
    photos: spread('get_together', 'naming_ceremony', 'engagement', 'corporate_event'),
    alt: 'Individual services bookable on their own',
  },
  {
    id: 'cakes',
    size: 'tall',
    eyebrow: 'Made to order',
    title: 'Cakes',
    body: 'Your size, flavour, message and photo on top.',
    to: '/shop/Cakes',
    accent: '#c62828',
    photos: byOccasion('Cakes', ['Birthday', 'Wedding', 'Kids & Theme', 'Anniversary']),
    alt: 'Cakes made to order',
  },
  {
    id: 'flowers',
    size: 'half',
    eyebrow: 'Same day',
    title: 'Flowers',
    to: '/shop/Flowers',
    accent: '#e879f9',
    photos: byOccasion('Flowers', ['Anniversary', 'Wedding', 'Birthday', 'Festive']),
    alt: 'Fresh flower bouquets',
  },
  {
    id: 'party',
    size: 'half',
    eyebrow: 'Set it up yourself',
    title: 'Balloons & backdrops',
    to: '/shop/Party%20Essentials',
    accent: '#f59e0b',
    photos: byOccasion('Party Essentials', ['Balloon Decor', 'Backdrop & Banners', 'Birthday', 'Theme Party']),
    alt: 'Balloon decor and backdrops',
  },
  {
    id: 'gifts',
    size: 'band',
    eyebrow: 'Wrapped & carded',
    title: 'Gifts & hampers',
    body: 'One gift or a whole hamper — you choose what goes in it.',
    to: '/shop/Gifts',
    accent: '#5b21b6',
    photos: giftPhotos(['Diwali', 'Wedding', 'Corporate', 'Birthday']),
    alt: 'Gift hampers wrapped and carded',
  },
  {
    id: 'handmade',
    size: 'tall',
    eyebrow: 'Made by hand',
    title: 'Indian handmade',
    body: 'Channapatna, terracotta, brass, jute.',
    to: '/shop/Gifts?occasion=Handmade',
    accent: '#a11f20',
    photos: shelf('handmade'),
    alt: 'Indian handmade crafts',
  },
  {
    id: 'eco',
    size: 'tall',
    eyebrow: 'Alive, not wrapped',
    title: 'Eco & plants',
    body: 'A gift that is alive when they remember it.',
    to: '/shop/Gifts?occasion=Eco%20%26%20Plants',
    accent: '#12694c',
    photos: shelf('eco'),
    alt: 'Plants and eco-friendly gifts',
  },
  {
    // The second hero, and the argument for the whole platform. Everything above
    // it can be bought from a national app; a Molakalmuru silk cannot.
    id: 'heritage',
    size: 'hero',
    eyebrow: 'Only from here',
    title: 'Mysore silk & rare weaves',
    body: 'Mysore Reshme, Ilkal, Molakalmuru, Patan Patola — handlooms you will not find listed anywhere else.',
    cta: 'Open the heritage shelf',
    to: '/shop/Heritage%20%26%20Crafts',
    accent: '#78350f',
    photos: [...shelf('silk'), ...shelf('weaves')],
    alt: 'Mysore silk sarees and rare handloom weaves',
  },
  {
    id: 'carvings',
    size: 'half',
    eyebrow: 'Stone & sandalwood',
    title: 'Carvings & sculpture',
    to: '/shop/Heritage%20%26%20Crafts?occasion=Carvings%20%26%20Sculpture',
    accent: '#4c1d95',
    photos: shelf('carving'),
    alt: 'Hand-carved sculpture and cast idols',
  },
  {
    id: 'mysuru',
    size: 'half',
    eyebrow: 'Mysuru’s own',
    title: 'From Mysuru',
    to: '/shop/Heritage%20%26%20Crafts?occasion=Mysuru%20Specials',
    accent: '#92400e',
    photos: shelf('mysuru'),
    alt: 'Mysuru sandalwood, paintings and inlay',
  },
  {
    id: 'pooja',
    size: 'band',
    eyebrow: 'Before the first diya',
    title: 'Pooja & festival essentials',
    body: 'Samagri lists, diyas, flowers — and a purohit if you need one.',
    to: '/shop/Pooja%20%26%20Essentials',
    accent: '#d97706',
    photos: byOccasion('Pooja & Essentials', ['Diwali', 'Daily Pooja', 'Griha Pravesh', 'Ganesh Chaturthi']),
    alt: 'Pooja samagri, diyas and festival essentials',
  },
]

/**
 * Tailwind spans per size. Written out rather than composed, because Tailwind's
 * JIT scans source text for class names — a template literal like
 * `col-span-${n}` produces a class that is never generated, which is the
 * classic way a grid silently collapses to one column in production.
 */
export const TILE_SPAN = {
  hero: 'col-span-4 row-span-2',
  tall: 'col-span-2 row-span-2',
  band: 'col-span-4 row-span-1',
  half: 'col-span-2 row-span-1',
}

/** Which tiles get the larger type treatment. */
export const IS_LARGE = size => size === 'hero'
