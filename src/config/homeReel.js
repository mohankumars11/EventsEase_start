import { CATALOGUE_PHOTOS } from './imagery'
import { GENERATED_SHELF_PHOTOS } from './generatedShelfPhotos'
import { OCCASIONS } from '../data/planCatalog'

/**
 * The photographic reel — the second film on Home, and the one made of
 * photographs rather than drawings.
 *
 * ── Why a second film ─────────────────────────────────────────────────────
 * BrandFilm is drawn: six SVG beats, plum boxes, gold satin, a lit surface. It
 * exists because there is no footage — Sambramo is pre-launch with no signed
 * supplier, so a "real" product video would be stock footage of somebody else's
 * warehouse. That reasoning still holds and that film stays.
 *
 * But it argues in illustration, and illustration cannot do one thing a
 * photograph does instantly: make somebody believe the thing is real. A drawn
 * hamper says "this is our idea of gifting"; a photograph of gold zari on crepe
 * silk says "that exists and you can buy it". A pre-launch brand needs both —
 * the drawing to say what it is FOR, the photograph to say that it is THERE.
 *
 * So this is the same story told in the other register, and the two are
 * deliberately not adjacent on the page: the drawn film sits with the deck at
 * the top as the argument, and this one sits below the mosaic as the evidence.
 *
 * ── Every beat carries its own button, and they all go somewhere different ──
 * This is the whole difference between a reel and a banner. A carousel with one
 * "Shop now" under it is a banner that moves; a reel whose CTA changes with the
 * frame is seven offers in the space of one. The photograph on screen and the
 * button under it are always the same subject — a cake frame says "Order a
 * cake", a Mysore silk frame says "Open the heritage shelf" — so a tap can
 * never land somewhere the customer was not just looking at.
 *
 * Four of the seven point at the shop and three at the planner, which is the
 * split the business actually wants: events are the primary revenue and the
 * shop is where somebody buys on the first visit.
 *
 * ── The photographs are already in the repo ───────────────────────────────
 * Same constraint as the mosaic: `RemoteImage`'s live search is capped at 24
 * lookups per page load app-wide, so nothing here resolves at runtime. Every URL
 * comes from a committed resolver output.
 *
 * They are licensed stock photographs of similar goods, never photographs of
 * anything Sambramo has sourced — which is why no beat below names a specific
 * item, a price or a delivery time. The frame shows a category and the copy
 * describes a category. That distinction is the same one `image_source: 'stock'`
 * and the "Representative image" badge enforce on every product tile, and it is
 * load-bearing rather than pedantic.
 */

const first = (...candidates) => candidates.find(Boolean) ?? null
const shelf = key => (GENERATED_SHELF_PHOTOS[key] ?? []).map(p => p.url)
const occasion = id => OCCASIONS.find(o => o.id === id)?.photos ?? []

export const REEL_BEATS = [
  {
    key: 'heritage',
    chapter: 'Only from here',
    line: 'Gold zari, on Mysore crepe',
    sub: 'Mysore Reshme, Ilkal, Molakalmuru, Patan Patola.',
    cta: 'Open the heritage shelf',
    to: '/shop/Heritage%20%26%20Crafts',
    accent: '#78350f',
    src: first(shelf('silk')[0], shelf('weaves')[0]),
    alt: 'Mysore silk saree with a woven gold zari border',
  },
  {
    key: 'cake',
    chapter: 'Made to order',
    line: 'Your size, your message',
    sub: 'Baked for your order, not pulled off a shelf.',
    cta: 'Order a cake',
    to: '/shop/Cakes',
    accent: '#c62828',
    src: first(CATALOGUE_PHOTOS['Cakes']?.['Birthday']),
    alt: 'A birthday cake made to order',
  },
  {
    key: 'birthday',
    chapter: 'Set up before you arrive',
    line: 'The room, already done',
    sub: 'Decor, cake and the setup, handled as one job.',
    cta: 'Plan a birthday',
    to: '/services/birthday',
    accent: '#d946ef',
    src: first(occasion('birthday')[0]),
    alt: 'A birthday decoration setup',
  },
  {
    key: 'handmade',
    chapter: 'Made by hand',
    line: 'Turned on a lathe, not stamped',
    sub: 'Channapatna, terracotta, brass and jute.',
    cta: 'Shop handmade',
    to: '/shop/Gifts?occasion=Handmade',
    accent: '#a11f20',
    src: first(shelf('handmade')[0]),
    alt: 'Indian handmade crafts',
  },
  {
    key: 'wedding',
    chapter: 'Full production',
    line: 'Mandap to send-off',
    sub: 'One coordinator, one number, every day of it.',
    cta: 'Plan a wedding',
    to: '/services/wedding',
    accent: '#b45309',
    src: first(occasion('wedding')[0]),
    alt: 'A wedding mandap setup',
  },
  {
    key: 'eco',
    chapter: 'Alive, not wrapped',
    line: 'Worth more next year',
    sub: 'A plant is the one gift that grows after the day.',
    cta: 'Send a plant',
    to: '/shop/Gifts?occasion=Eco%20%26%20Plants',
    accent: '#12694c',
    src: first(shelf('eco')[0]),
    alt: 'An indoor plant in a ceramic pot',
  },
  {
    key: 'carving',
    chapter: 'Stone & sandalwood',
    line: 'Cut by somebody’s hands',
    sub: 'Carved, cast and commissioned to your measurements.',
    cta: 'See the carvings',
    to: '/shop/Heritage%20%26%20Crafts?occasion=Carvings%20%26%20Sculpture',
    accent: '#4c1d95',
    src: first(shelf('carving')[0]),
    alt: 'Hand-carved stone sculpture',
  },
  /* A beat whose photograph did not resolve would render as an accent plate with
     copy on it — legible, but plainly a hole in a reel of photographs. Dropping
     it means the reel is shorter rather than broken, and the tick row below
     counts what is actually there. */
].filter(b => b.src)
