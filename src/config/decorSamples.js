// Decoration samples — the "show, don't tell" half of the storefront.
//
// ── Why this file exists ──────────────────────────────────────────────────
// The landing page could describe a birthday setup in prose and list the
// services that go into one, but nobody books décor from a bulleted list.
// They book it from a photograph of a room that looks like the room they
// want. Every other section of this site argues; this one shows.
//
// ── What these photographs are, exactly ───────────────────────────────────
// They are licensed photographs of real decoration setups. They are NOT
// photographs of work Sambramo has delivered, because Sambramo has not
// delivered any yet — the same fact that ImageSourceBadge exists to state on
// every product tile. So the gallery carries the identical label, in the same
// words, for the identical reason: a customer must never be able to mistake a
// reference photo for a portfolio.
//
// The honest reading of one of these cards is "this is the style of setup we
// will arrange for you, and here is what goes into it", and the UI is written
// to say exactly that and nothing more. When a real event is photographed,
// drop its URL into `photo` on the sample and flip `source` to 'actual' —
// the badge and the copy follow automatically.
//
// ── Where the pictures come from ──────────────────────────────────────────
// scripts/resolve-decor-samples.mjs resolves one distinct Pexels photo per
// sample and writes generatedDecorSamples.js, which is layered on top of the
// `query` values below. Same pattern, same deduplication guarantee and same
// by-hand run as scripts/resolve-product-images.mjs — a sample whose photo
// the resolver has not reached yet degrades to a tinted emoji plate rather
// than a broken image.
//
// ── Where the prices come from ────────────────────────────────────────────
// Nowhere new. Each sample names the service ids it is built from and the
// band is summed from those entries in eventServicesData. That file's numbers
// are researched India market-rate ESTIMATES and are labelled as such at its
// head; this file inherits that caveat rather than inventing a second set of
// numbers that could drift from the first.
//
// Only services with an absolute price are eligible — no per-plate, per-seat
// or per-unit line may appear in a sample, because summing "₹250/plate" into
// a décor total produces a number that means nothing.

import { EVENT_DATA } from '../data/eventServicesData'
import { GENERATED_DECOR_PHOTOS } from './generatedDecorSamples'

/**
 * Service ids whose priceMin/priceMax are absolute rupee figures for the
 * whole job, and may therefore be summed into a sample's band.
 *
 * Deliberately a denylist-by-omission rather than a regex over priceHint:
 * a new per-head service added to eventServicesData should be invisible here
 * until somebody consciously adds it, not swept in by a pattern match that
 * happened to miss the "/head" suffix.
 */
const ABSOLUTE_PRICED = new Set([
  'decor', 'balloon_arch', 'floral', 'lighting', 'stage', 'mandap',
  'candle_setup', 'photobooth', 'memory_wall', 'tent', 'pooja', 'priest',
  'mehendi', 'kids_play', 'invitations', 'fireworks', 'av_setup',
  'photography', 'videography', 'makeup', 'choreography', 'emcee',
])

/**
 * Four setups per occasion, ordered cheapest-looking to grandest.
 *
 * Four rather than three because three renders as a row that looks complete
 * and therefore looks like the entire offer; four wraps to a 2×2 on a phone
 * and reads as a sample of something larger, which is what it is.
 *
 * `includes` are service ids that must exist on that event in
 * eventServicesData — assertSamples() below fails the build-time import if
 * one ever doesn't, which is the failure mode this whole file is exposed to:
 * somebody renames a service and the gallery quietly starts pricing a setup
 * off three services instead of four.
 */
export const DECOR_SAMPLES = {
  birthday: [
    {
      id: 'balloon-arch',
      title: 'Balloon Arch & Name Backdrop',
      blurb: 'An organic garland over a plain wall, the age or the name in foil, and the cake table styled underneath.',
      includes: ['balloon_arch', 'decor'],
      query: 'birthday balloon arch backdrop decoration party',
    },
    {
      id: 'theme-room',
      title: 'Theme Room Takeover',
      blurb: 'Jungle, unicorn, superhero or dinosaur — props, cutouts, table styling and a matching cake corner.',
      includes: ['decor', 'balloon_arch', 'kids_play'],
      query: 'jungle theme kids birthday party decoration table',
    },
    {
      id: 'dessert-table',
      title: 'Cake & Dessert Table',
      blurb: 'Tiered stands, a lit backdrop and the dessert spread arranged as the photograph everyone takes.',
      includes: ['decor', 'lighting'],
      query: 'birthday dessert table cake stand fairy lights setup',
    },
    {
      id: 'full-party',
      title: 'Full Party Setup',
      blurb: 'Stage, lighting rig, seating, entrance décor and a photo corner — the whole room handled.',
      includes: ['stage', 'lighting', 'decor', 'photobooth'],
      query: 'birthday party stage decoration lighting venue setup',
    },
  ],

  first_birthday: [
    {
      id: 'one-backdrop',
      title: 'First Birthday Backdrop',
      blurb: 'A pastel garland, a large "ONE", and a smash-cake corner set at a one-year-old\'s height.',
      includes: ['balloon_arch', 'decor'],
      query: 'first birthday one backdrop pastel balloon decoration',
    },
    {
      id: 'floral-soft',
      title: 'Floral & Fabric Setup',
      blurb: 'Draped fabric, fresh flowers and soft lighting — the version that photographs well without props.',
      includes: ['floral', 'decor', 'lighting'],
      query: 'first birthday floral fabric drape decoration soft pastel',
    },
    {
      id: 'play-corner',
      title: 'Play Corner & Soft Zone',
      blurb: 'Ball pit, soft mats and a fenced play area, so the toddlers have somewhere that is theirs.',
      includes: ['kids_play', 'decor'],
      query: 'toddler ball pit soft play area party kids',
    },
    {
      id: 'grand-first',
      title: 'Grand First Birthday',
      blurb: 'Raised stage, themed backdrop, entrance arch and a photo booth with props for the family shots.',
      includes: ['stage', 'balloon_arch', 'lighting', 'photobooth'],
      query: 'first birthday stage decoration grand celebration hall',
    },
  ],

  housewarming: [
    {
      id: 'entrance',
      title: 'Entrance Toran & Rangoli',
      blurb: 'Mango-leaf toran across the door, a fresh rangoli on the threshold and marigold along the frame.',
      includes: ['floral', 'decor'],
      query: 'indian house entrance marigold toran rangoli door decoration',
    },
    {
      id: 'pooja-mandap',
      title: 'Griha Pravesh Pooja Setup',
      blurb: 'Kalash, havan kund and seating laid out the way the purohit will want it, with the samagri ready.',
      includes: ['pooja', 'priest', 'floral'],
      query: 'griha pravesh puja setup kalash havan indian ritual home',
    },
    {
      id: 'welcome-decor',
      title: 'Welcome Balloons & Signage',
      blurb: 'A balloon cluster at the gate and a printed welcome board with the family name.',
      // Housewarming carries `decor` but not `balloon_arch` in
      // eventServicesData — balloons fall under themed décor for this
      // occasion. Naming the id that actually exists is the point of the
      // assertion in priceBand().
      includes: ['decor', 'invitations'],
      query: 'housewarming welcome balloons sign new home celebration',
    },
    {
      id: 'full-griha',
      title: 'Full Griha Pravesh Décor',
      blurb: 'Entrance, pooja space, terrace lighting and a shaded seating area for the guests who stay on.',
      includes: ['floral', 'decor', 'lighting', 'tent'],
      query: 'indian housewarming ceremony decoration flowers lights home',
    },
  ],

  baby_shower: [
    {
      id: 'pastel-arch',
      title: 'Pastel Balloon Arch',
      blurb: 'A soft garland over the seat of honour, with the mother-to-be\'s chair styled as the centrepiece.',
      includes: ['balloon_arch', 'decor'],
      query: 'baby shower pastel balloon arch chair decoration',
    },
    {
      id: 'floral-swing',
      title: 'Floral Swing & Backdrop',
      blurb: 'A flower-dressed jhula, fabric backdrop and lighting warm enough for photographs indoors.',
      includes: ['floral', 'decor', 'lighting'],
      query: 'baby shower floral swing jhula decoration indian',
    },
    {
      id: 'reveal',
      title: 'Gender Reveal Corner',
      blurb: 'A confetti balloon, the reveal board and a dessert table that works in either colour.',
      includes: ['decor', 'photobooth'],
      query: 'gender reveal party balloon confetti decoration setup',
    },
    {
      id: 'godh-bharai',
      title: 'Traditional Godh Bharai',
      blurb: 'Marigold and jasmine, a low decorated seat, brass lamps and the thali laid out for the rasam.',
      includes: ['floral', 'decor', 'mehendi'],
      query: 'godh bharai seemantham decoration marigold flowers indian',
    },
  ],

  seemantham: [
    {
      id: 'flower-seat',
      title: 'Flower Seat & Backdrop',
      blurb: 'Jasmine and rose strings behind a low seat, with the traditional lamps set either side.',
      includes: ['floral', 'decor'],
      query: 'seemantham jasmine flower decoration seat indian ceremony',
    },
    {
      id: 'ritual-setup',
      title: 'Ritual & Pooja Setup',
      blurb: 'Kalash, thali, lamps and seating arranged for the purohit, samagri counted out in advance.',
      includes: ['pooja', 'priest'],
      query: 'indian puja thali kalash brass lamp ritual setup ceremony',
    },
    {
      id: 'bangle-corner',
      title: 'Bangle & Mehendi Corner',
      blurb: 'The glass-bangle table, mehendi seating and a mirror corner for the photographs.',
      includes: ['mehendi', 'decor'],
      query: 'indian bangles mehendi ceremony decoration corner colourful',
    },
    {
      id: 'full-seemantham',
      title: 'Full Ceremony Décor',
      blurb: 'Entrance, ritual space, floral backdrop and lighting across the whole function area.',
      includes: ['floral', 'decor', 'balloon_arch', 'photography'],
      query: 'south indian function hall marigold flower stage decoration',
    },
  ],

  naming_ceremony: [
    {
      id: 'cradle',
      title: 'Cradle & Floral Canopy',
      blurb: 'The cradle dressed in fresh flowers under a fabric canopy, lit for the naming moment.',
      includes: ['floral', 'decor', 'lighting'],
      query: 'naming ceremony cradle flower decoration indian namkaran',
    },
    {
      id: 'name-board',
      title: 'Name Reveal Backdrop',
      blurb: 'A printed backdrop carrying the child\'s name, with a styled table for the blessings.',
      includes: ['decor'],
      query: 'baby naming ceremony name backdrop decoration celebration',
    },
    {
      id: 'homam',
      title: 'Homam & Pooja Space',
      blurb: 'Havan kund, seating and samagri laid out, with a purohit booked for the vidhi.',
      includes: ['pooja', 'priest'],
      query: 'homam havan fire ritual indian ceremony setup priest',
    },
    {
      id: 'full-naming',
      title: 'Full Naming Function',
      blurb: 'Shaded seating, entrance florals, ritual space and lighting for a daytime function at home.',
      includes: ['tent', 'floral', 'decor', 'lighting'],
      query: 'baby naming function hall flower decoration cradle indian',
    },
  ],

  anniversary: [
    {
      id: 'candle-dinner',
      title: 'Candlelight Dinner Setup',
      blurb: 'A candle pathway, a laid table for two and petals — arranged at home or on a terrace.',
      includes: ['candle_setup', 'decor'],
      query: 'romantic candlelight dinner table setup rose petals terrace',
    },
    {
      id: 'room-surprise',
      title: 'Room Surprise Décor',
      blurb: 'Balloons, letter lights and a photo string of the years, set up while you keep them out.',
      includes: ['decor', 'lighting'],
      query: 'anniversary room decoration balloons fairy lights surprise',
    },
    {
      id: 'floral-stage',
      title: 'Floral Stage & Seating',
      blurb: 'A flowered backdrop for the cake cutting, lit for photographs, with the family seated around it.',
      includes: ['floral', 'decor', 'lighting'],
      query: 'flower backdrop stage cake cutting anniversary hall decor',
    },
    {
      id: 'milestone',
      title: 'Milestone Anniversary Setup',
      blurb: 'Full hall décor, a memory wall of the years, lighting and a photo corner for the guests.',
      includes: ['decor', 'lighting', 'photobooth', 'photography'],
      query: 'golden anniversary celebration hall decoration family party',
    },
  ],

  engagement: [
    {
      id: 'ring-stage',
      title: 'Ring Ceremony Stage',
      blurb: 'A floral or fabric backdrop, two chairs and lighting set for the exchange photographs.',
      includes: ['stage', 'floral', 'lighting'],
      query: 'engagement ring ceremony stage decoration flowers indian',
    },
    {
      id: 'entrance-photo',
      title: 'Entrance & Photo Wall',
      blurb: 'A welcome board with the couple\'s names and a flower wall the guests will queue at.',
      includes: ['decor', 'floral'],
      query: 'engagement photo wall flower backdrop names welcome sign',
    },
    {
      id: 'intimate',
      title: 'Intimate Proposal Setup',
      blurb: 'Candles, petals and letter lights for the private version, before anybody else is told.',
      includes: ['decor', 'lighting'],
      query: 'candle rose petal romantic room surprise setup indoor',
    },
    {
      id: 'full-engagement',
      title: 'Full Engagement Décor',
      blurb: 'Stage, entrance, table centres and lighting across the hall, with the shoot covered.',
      includes: ['stage', 'floral', 'decor', 'lighting', 'photography'],
      query: 'indian engagement function hall decoration stage lighting',
    },
  ],

  wedding: [
    {
      id: 'mandap',
      title: 'Mandap & Ritual Space',
      blurb: 'Pillars, canopy, florals and the seating arranged the way the purohit will need it.',
      includes: ['mandap', 'floral', 'priest'],
      query: 'indian wedding mandap decoration flowers ceremony pillars',
    },
    {
      id: 'entrance',
      title: 'Entrance & Pathway',
      blurb: 'The gate, the walkway and the welcome board — the first thing four hundred people see.',
      includes: ['decor', 'floral', 'lighting'],
      query: 'indian wedding entrance gate flower decoration pathway lights',
    },
    {
      id: 'reception-stage',
      title: 'Reception Stage',
      blurb: 'A lit backdrop, the couple\'s seating and a rig that works for both the eye and the camera.',
      includes: ['stage', 'lighting', 'decor'],
      query: 'wedding reception stage decoration lighting backdrop couple',
    },
    {
      id: 'full-wedding',
      title: 'Full Venue Décor',
      blurb: 'Mandap, entrance, stage, table centres, lighting and the photo team, coordinated as one plan.',
      includes: ['mandap', 'stage', 'floral', 'lighting', 'decor', 'photography'],
      query: 'grand indian wedding venue decoration hall flowers lights',
    },
  ],

  sangeet: [
    {
      id: 'dance-floor',
      title: 'Dance Floor & Lighting',
      blurb: 'A floor, a rig and the seating pulled back — built for the performances, not for sitting.',
      includes: ['lighting', 'stage'],
      query: 'sangeet dance floor party lighting indian wedding night',
    },
    {
      id: 'mehendi-corner',
      title: 'Mehendi Seating Corner',
      blurb: 'Low seating, cushions, umbrellas and colour — the daytime half of the same weekend.',
      includes: ['mehendi', 'decor'],
      query: 'mehendi ceremony decoration colourful umbrellas cushions indian',
    },
    {
      id: 'boho-backdrop',
      title: 'Photo Backdrop & Props',
      blurb: 'A styled wall, neon or marigold, with props people will actually pick up.',
      includes: ['decor', 'photography'],
      query: 'sangeet mehendi photo backdrop marigold neon decoration',
    },
    {
      id: 'full-sangeet',
      title: 'Full Sangeet Night',
      blurb: 'Stage, floor, lighting, seating and choreography rehearsals for the family performances.',
      includes: ['stage', 'lighting', 'decor', 'choreography'],
      query: 'sangeet night stage decoration indian wedding celebration dance',
    },
  ],

  thread_ceremony: [
    {
      id: 'ritual-space',
      title: 'Homam & Ritual Space',
      blurb: 'Havan kund, mats, kalash and samagri, with a purohit booked for the full vidhi.',
      includes: ['pooja', 'priest'],
      query: 'upanayanam thread ceremony homam ritual indian setup',
    },
    {
      id: 'floral-entrance',
      title: 'Floral Entrance',
      blurb: 'Toran, banana stems at the door and marigold strings along the approach.',
      includes: ['floral', 'decor'],
      query: 'indian ceremony entrance banana leaf marigold decoration door',
    },
    {
      id: 'seating',
      title: 'Shaded Guest Seating',
      blurb: 'A pandal, chairs and fans for a morning function that runs into the afternoon.',
      includes: ['tent', 'decor'],
      query: 'outdoor event tent canopy chairs seating rows garden',
    },
    {
      id: 'full-upanayanam',
      title: 'Full Upanayanam Décor',
      blurb: 'Entrance, ritual space, seating and the photo-video team across the whole morning.',
      includes: ['floral', 'decor', 'tent', 'photography', 'videography'],
      query: 'upanayanam ceremony hall decoration flowers south indian',
    },
  ],

  get_together: [
    {
      id: 'terrace',
      title: 'Terrace & Backyard Setup',
      blurb: 'String lights, low seating and a bar corner — the version that needs no venue booking.',
      includes: ['lighting', 'decor'],
      query: 'terrace party string lights outdoor seating evening gathering',
    },
    {
      id: 'lounge',
      title: 'Lounge Seating & Tables',
      blurb: 'Sofas, low tables and lamps arranged so people can actually hear each other.',
      includes: ['decor', 'lighting'],
      query: 'party lounge seating sofa low table decoration evening',
    },
    {
      id: 'reunion-wall',
      title: 'Reunion Photo Wall',
      blurb: 'A photo string of the old pictures and a backdrop for the new one.',
      includes: ['decor', 'photography'],
      query: 'photo wall hanging pictures string display party backdrop',
    },
    {
      id: 'full-party',
      title: 'Full Evening Setup',
      blurb: 'Shamiana, lighting, seating and a sound corner for a garden evening.',
      includes: ['tent', 'lighting', 'decor'],
      query: 'garden party evening tent lights setup celebration outdoor',
    },
  ],

  retirement: [
    {
      id: 'memory-wall',
      title: 'Career Memory Wall',
      blurb: 'The photographs, the milestones and the messages, printed and hung as one display.',
      includes: ['memory_wall', 'decor'],
      query: 'retirement party photo memory wall display celebration tribute',
    },
    {
      id: 'stage-felicitation',
      title: 'Felicitation Stage',
      blurb: 'A backdrop, a podium and lighting for the speeches and the shawl ceremony.',
      includes: ['stage', 'lighting'],
      query: 'award ceremony stage podium speech backdrop formal hall',
    },
    {
      id: 'dining-decor',
      title: 'Dining & Table Décor',
      blurb: 'Table centres, linen and a styled cake table for the family lunch afterwards.',
      includes: ['decor'],
      query: 'formal dining table decoration centrepiece celebration lunch',
    },
    {
      id: 'full-retirement',
      title: 'Full Farewell Setup',
      blurb: 'Entrance, stage, memory wall, lighting and an anchor to run the afternoon.',
      includes: ['stage', 'decor', 'lighting', 'memory_wall', 'emcee'],
      query: 'retirement farewell party hall decoration celebration senior',
    },
  ],

  graduation: [
    {
      id: 'balloon-cap',
      title: 'Graduation Balloon Setup',
      blurb: 'A garland in the college colours, the year in foil and a styled cake table.',
      includes: ['balloon_arch', 'decor'],
      query: 'graduation party balloon decoration cap celebration setup',
    },
    {
      id: 'photo-corner',
      title: 'Photo Corner & Props',
      blurb: 'A backdrop, the cap-and-scroll props and a frame people will queue at.',
      includes: ['photobooth', 'decor'],
      query: 'graduation photo booth backdrop props celebration party',
    },
    {
      id: 'memory-board',
      title: 'Journey Board',
      blurb: 'School to college in photographs, hung as a timeline the family will stand in front of.',
      includes: ['memory_wall', 'decor'],
      query: 'photo timeline display board party decoration memories',
    },
    {
      id: 'full-grad',
      title: 'Full Graduation Party',
      blurb: 'Entrance, lighting, seating, a sound corner and the photo team for the evening.',
      includes: ['decor', 'lighting', 'photobooth', 'photography'],
      query: 'graduation party celebration hall decoration lights friends',
    },
  ],

  corporate_event: [
    {
      id: 'stage-branding',
      title: 'Branded Stage & Backdrop',
      blurb: 'A printed backdrop, podium and stage lighting set to your brand colours.',
      includes: ['stage', 'lighting', 'decor'],
      query: 'corporate event stage branded backdrop conference podium',
    },
    {
      id: 'av',
      title: 'AV & Presentation Setup',
      blurb: 'Screens, projection, microphones and a technician on site for the whole session.',
      includes: ['av_setup'],
      query: 'conference av setup projector screen microphone corporate',
    },
    {
      id: 'registration',
      title: 'Registration & Entrance',
      blurb: 'A welcome desk, standees, signage and a branded entrance for arrivals.',
      includes: ['decor'],
      query: 'corporate event registration desk entrance signage welcome',
    },
    {
      id: 'full-corporate',
      title: 'Full Event Setup',
      blurb: 'Stage, AV, entrance, seating, an anchor and coverage across the day.',
      includes: ['stage', 'av_setup', 'decor', 'lighting', 'emcee', 'photography'],
      query: 'corporate conference hall event setup seating stage lights',
    },
  ],
}

/* ═══════════════════════════════════════════════════════════
   Derivation — nothing below is hand-maintained
═══════════════════════════════════════════════════════════ */

/**
 * Fail loudly, at import, if a sample names a service its event does not
 * carry or that is not absolutely priced.
 *
 * The quiet version of this bug is the expensive one: a renamed service id
 * drops out of the sum, the card goes on rendering, and a setup that costs
 * ₹14,000 is advertised at ₹6,000 until somebody notices by hand. There is
 * no test runner in this project, so the import is where it gets caught.
 */
function priceBand(eventId, sample) {
  const event = EVENT_DATA[eventId]
  const byId  = Object.fromEntries(event.services.map(s => [s.id, s]))

  return sample.includes.reduce(
    (band, id) => ({
      priceMin: band.priceMin + byId[id].priceMin,
      priceMax: band.priceMax + byId[id].priceMax,
    }),
    { priceMin: 0, priceMax: 0 }
  )
}

/**
 * Check every sample up front and report all the problems at once.
 *
 * One aggregated throw rather than a throw from inside priceBand: a
 * fail-on-first validator makes fixing a batch of renamed service ids an
 * n-run guessing game, and the whole reason this check exists is that the
 * quiet version of the bug — a service id that silently drops out of the sum
 * and understates a setup's price — is the expensive one. There is no test
 * runner in this project, so import time is where it gets caught.
 */
function assertSamples() {
  const problems = []

  for (const [eventId, list] of Object.entries(DECOR_SAMPLES)) {
    const event = EVENT_DATA[eventId]
    if (!event) {
      problems.push(`unknown event "${eventId}"`)
      continue
    }
    const ids = new Set(event.services.map(s => s.id))

    for (const sample of list) {
      for (const id of sample.includes) {
        if (!ids.has(id)) {
          problems.push(`${eventId}/${sample.id}: "${id}" is not a service on ${event.name}`)
        } else if (!ABSOLUTE_PRICED.has(id)) {
          problems.push(`${eventId}/${sample.id}: "${id}" is priced per unit and cannot be summed`)
        }
      }
    }
  }

  if (problems.length) {
    throw new Error(`decorSamples: ${problems.length} invalid reference(s)\n  - ${problems.join('\n  - ')}`)
  }
}

assertSamples()

/**
 * One sample, fully resolved: copy, photo, price band and the service rows it
 * is built from (so the card can name them without a second lookup).
 */
function resolve(eventId, sample) {
  const event = EVENT_DATA[eventId]
  const byId  = Object.fromEntries(event.services.map(s => [s.id, s]))
  const photo = GENERATED_DECOR_PHOTOS[`${eventId}/${sample.id}`] ?? null

  return {
    ...sample,
    ...priceBand(eventId, sample),
    eventId,
    eventName: event.name,
    emoji:     event.icon ?? event.emoji,
    services:  sample.includes.map(id => byId[id]),
    // null until the resolver has run; the gallery renders a tinted emoji
    // plate rather than a gap when it is.
    photo:  photo?.url    ?? null,
    alt:    photo?.alt    ?? `${sample.title} — ${event.name} decoration setup`,
    credit: photo?.credit ?? null,
    // Every photo here is a licensed lookalike today. This is the field an
    // admin flips once a real setup has been photographed, and it is the only
    // thing the honesty badge reads.
    source: photo?.source ?? 'stock',
  }
}

/** eventId → resolved samples. Every event in EVENT_DATA has an entry. */
export const SAMPLES_BY_EVENT = Object.fromEntries(
  Object.keys(EVENT_DATA).map(eventId => [
    eventId,
    (DECOR_SAMPLES[eventId] ?? []).map(s => resolve(eventId, s)),
  ])
)

/** Flat list, for the landing-page showcase and any "everything" view. */
export const ALL_SAMPLES = Object.values(SAMPLES_BY_EVENT).flat()

/**
 * The photo that stands for an occasion — its first setup.
 *
 * Exists so the catalogue index can illustrate its cards from this module
 * instead of firing a live Unsplash search per card. Fifteen cards was fifteen
 * of the 24 searches lib/unsplash.js allows per page load, spent re-deriving a
 * photograph that is already resolved and committed here.
 */
export function leadSample(eventId) {
  return SAMPLES_BY_EVENT[eventId]?.[0] ?? null
}

/**
 * The showcase reel on the landing page — one sample per occasion so the row
 * reads as a spread of different events rather than four birthdays.
 *
 * Ordered by how recognisable the occasion is rather than by EVENT_DATA's
 * order, because the first three tiles are the ones that decide whether
 * anybody scrolls the rest.
 */
const FEATURED_ORDER = [
  'birthday', 'housewarming', 'wedding', 'baby_shower', 'first_birthday',
  'anniversary', 'naming_ceremony', 'engagement', 'sangeet', 'seemantham',
  'get_together', 'graduation', 'retirement', 'thread_ceremony',
  'corporate_event',
]

export const FEATURED_SAMPLES = FEATURED_ORDER
  .flatMap(eventId => SAMPLES_BY_EVENT[eventId] ?? [])
  .filter(Boolean)

/** Totals for the section copy, so the numbers can never drift from the data. */
export const SAMPLE_TOTALS = {
  setups:    ALL_SAMPLES.length,
  occasions: Object.values(SAMPLES_BY_EVENT).filter(list => list.length > 0).length,
}
