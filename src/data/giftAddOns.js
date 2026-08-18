import { KINDS } from '../lib/productCopy'

/**
 * The small things worth offering alongside a gift — and only the ones that
 * actually go with it.
 *
 * ── Why this is keyed by kind ────────────────────────────────────────────
 * The usual implementation is one global add-on list shown against every
 * product, which is how a customer buying a pooja samagri kit gets offered a
 * teddy bear, and how somebody buying a cake is offered the candles that are
 * already in the box. Both are small, and both quietly tell the customer that
 * nobody is paying attention.
 *
 * So each archetype gets its own shelf, and anything already included in the
 * product is absent from it. `UNIVERSAL` holds the two that genuinely suit
 * everything — a handwritten card and gift wrap — and both are free, because
 * charging ₹99 for a printed card is the sort of nickel-and-diming that shows
 * up verbatim in review threads.
 *
 * `price: 0` is a real price, not a placeholder. Free items still appear on
 * the bill at ₹0 so the customer can see they were not charged.
 */

const UNIVERSAL = [
  {
    id: 'card', group: 'Cards', name: 'Handwritten message card', price: 0,
    emoji: '💌', query: 'handwritten note card envelope',
  },
  {
    id: 'wrap', group: 'Cards', name: 'Gift wrap, no price on the box', price: 0,
    emoji: '🎀', query: 'wrapped gift box ribbon',
  },
]

const BY_KIND = {
  [KINDS.BLOOM]: [
    { id: 'vase',    group: 'Flowers',  name: 'Glass vase, 20 cm',            price: 349, emoji: '🏺', query: 'clear glass flower vase' },
    { id: 'food',    group: 'Flowers',  name: 'Flower food sachets, pack of 5', price: 49, emoji: '🌱', query: 'flower food sachet packet' },
    { id: 'choc',    group: 'Gourmet',  name: 'Dark chocolate bar, 90 g',     price: 199, emoji: '🍫', query: 'dark chocolate bar' },
    { id: 'balloon', group: 'Keepsakes', name: 'Single foil balloon, inflated', price: 149, emoji: '🎈', query: 'foil helium balloon' },
  ],
  [KINDS.BAKED]: [
    // No candles and no knife: both ship with every cake already.
    { id: 'numeral', group: 'Keepsakes', name: 'Numeral candle, any digit',   price:  79, emoji: '🕯️', query: 'number birthday candle' },
    { id: 'roses6',  group: 'Flowers',  name: 'Six red roses, hand-tied',     price: 399, emoji: '🌹', query: 'six red roses bouquet' },
    { id: 'topper',  group: 'Keepsakes', name: 'Personalised cake topper',    price: 249, emoji: '✨', query: 'acrylic cake topper' },
    { id: 'choc',    group: 'Gourmet',  name: 'Chocolate truffle box, 6 pc',  price: 299, emoji: '🍬', query: 'chocolate truffle box' },
  ],
  [KINDS.CONFECTION]: [
    { id: 'roses6',  group: 'Flowers',  name: 'Six red roses, hand-tied',     price: 399, emoji: '🌹', query: 'six red roses bouquet' },
    { id: 'coffee',  group: 'Gourmet',  name: 'Arabica ground coffee, 100 g', price: 349, emoji: '☕', query: 'ground coffee pack' },
    { id: 'mug',     group: 'Keepsakes', name: 'Stoneware mug',               price: 299, emoji: '🍵', query: 'ceramic stoneware mug' },
  ],
  [KINDS.PLANT]: [
    { id: 'planter', group: 'Keepsakes', name: 'Ceramic planter, matt white', price: 449, emoji: '🪴', query: 'white ceramic planter pot' },
    { id: 'feed',    group: 'Keepsakes', name: 'Plant feed, 100 ml',          price:  99, emoji: '🌿', query: 'liquid plant fertilizer bottle' },
    { id: 'mister',  group: 'Keepsakes', name: 'Brass mister',                price: 399, emoji: '💧', query: 'brass plant mister spray' },
  ],
  [KINDS.PERSONALISED]: [
    { id: 'roses6',  group: 'Flowers',  name: 'Six red roses, hand-tied',     price: 399, emoji: '🌹', query: 'six red roses bouquet' },
    { id: 'choc',    group: 'Gourmet',  name: 'Chocolate truffle box, 6 pc',  price: 299, emoji: '🍬', query: 'chocolate truffle box' },
    { id: 'box',     group: 'Keepsakes', name: 'Rigid presentation box',      price: 199, emoji: '📦', query: 'rigid gift presentation box' },
  ],
  [KINDS.CRAFT]: [
    // Nothing novelty on this shelf. Somebody spending ₹12,000 on a Mysore
    // silk is not in the market for a balloon, and offering one cheapens the
    // piece they are looking at.
    { id: 'muslin',  group: 'Keepsakes', name: 'Muslin storage wrap',         price: 249, emoji: '🧵', query: 'muslin cloth fabric wrap' },
    { id: 'note',    group: 'Cards',    name: "The maker's story, printed",   price:   0, emoji: '📜', query: 'letterpress printed card' },
  ],
  [KINDS.DECOR]: [
    { id: 'setup',   group: 'Keepsakes', name: 'Two-person setup at your address', price: 999, emoji: '🛠️', query: 'party decoration setup team' },
    { id: 'helium',  group: 'Keepsakes', name: 'Helium fill for foil balloons', price: 299, emoji: '🎈', query: 'helium tank balloons' },
    { id: 'cake',    group: 'Gourmet',  name: 'Half-kg chocolate cake',       price: 599, emoji: '🎂', query: 'chocolate cake half kg' },
  ],
  [KINDS.RITUAL]: [
    { id: 'flowers', group: 'Flowers',  name: 'Loose flowers for the thali',  price: 149, emoji: '🌼', query: 'loose marigold flowers pooja' },
    { id: 'ghee',    group: 'Gourmet',  name: 'Cow ghee, 200 ml',             price: 299, emoji: '🫙', query: 'cow ghee jar' },
    { id: 'agar',    group: 'Keepsakes', name: 'Sandalwood agarbatti',        price:  99, emoji: '🪔', query: 'incense sticks sandalwood' },
  ],
  [KINDS.KEEPSAKE]: [
    { id: 'roses6',  group: 'Flowers',  name: 'Six red roses, hand-tied',     price: 399, emoji: '🌹', query: 'six red roses bouquet' },
    { id: 'choc',    group: 'Gourmet',  name: 'Chocolate truffle box, 6 pc',  price: 299, emoji: '🍬', query: 'chocolate truffle box' },
    { id: 'cake',    group: 'Gourmet',  name: 'Half-kg chocolate cake',       price: 599, emoji: '🎂', query: 'chocolate cake half kg' },
  ],
}

/** The add-on shelf for one product's archetype, cards first. */
export function addOnsFor(kind) {
  return [...UNIVERSAL, ...(BY_KIND[kind] ?? BY_KIND[KINDS.KEEPSAKE])]
}

/** Look one up by id, across every shelf — the cart needs this to price a line. */
export function addOnById(kind, id) {
  return addOnsFor(kind).find(a => a.id === id) ?? null
}
