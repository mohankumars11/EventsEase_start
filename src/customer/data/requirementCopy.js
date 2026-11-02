/**
 * What a customer reads instead of our trade names (spec 2026-11-02 §1, §8).
 *
 * The 34 trades stay exactly as they are — ids, partner onboarding,
 * matching, pricing. This is only the words on the customer's plan:
 *
 *   copyFor(occasion, tradeId) → { title, line }
 *   introFor(occasion)         → { headline, line }
 *
 * A default per trade covers every occasion; a template can say it better
 * for its own kind of event (a naming ceremony's décor is a cradle, a
 * launch's décor is the brand). Overrides exist for the templates written
 * so far — see TEMPLATE_COPY's keys; every other template uses the
 * defaults, which are written to fit any celebration.
 */

/* One line each — a card title never wraps (Mohan, 2026-11-02). */
const DEFAULT = {
  catering_food: ["A feast they’ll love", "Food cooked and served for everyone"],
  cake_desserts: ["The perfect cake", "Designed, baked and delivered"],
  decoration_floral: ["A magical setting", "Theme, flowers and backdrop, set up"],
  photography: ["Capture every smile", "Photos — and video if you like"],
  videography: ["Relive it on film", "Film, highlights and reels"],
  venue: ["The perfect venue", "A place that fits your guests"],
  live_entertainment: ["Fun for everyone", "Performers for your crowd"],
  dj_music: ["Music all night", "A DJ with sound and lights"],
  anchor_mc: ["A host for the show", "An anchor who keeps it moving"],
  sound_av: ["Crystal-clear sound", "Speakers, mics and screens"],
  event_lighting: ["Lights that glow", "Warm lights to stage rigs"],
  tent_furniture: ["Seats for everyone", "Chairs, tables and canopies"],
  priest_rituals: ["Rituals done right", "He brings every pooja item"],
  bridal_makeup_hair: ["Look stunning", "Makeup and hair for the day"],
  mehendi_artist: ["Beautiful mehendi", "Henna for the bride and family"],
  invitation_printing: ["Invites to remember", "Printed or boxed invitations"],
  gifts_favours: ["Gifts they’ll keep", "A thank-you for every guest"],
  bar_beverages: ["Drinks for all", "Mocktails, juices and a bar"],
  passenger_transport: ["Arrive in style", "Cars and buses for guests"],
  valet_parking: ["Easy parking", "Valets at the entrance"],
  security_services: ["Safe and secure", "Trained security staff"],
  safety_facilities: ["Safe and spotless", "First aid, washrooms, cleaning"],
  guest_services: ["A warm welcome", "Hosts at the door"],
  power_cooling: ["Power, never off", "Generators and cooling"],
  event_equipment_rental: ["Stage and equipment", "Stage, truss and rentals"],
  event_materials_supplier: ["Event supplies", "Materials delivered"],
  end_to_end_event_logistics: ["Set up on time", "Transport, crew and set-up"],
  loading_unloading_crew: ["Heavy lifting", "A crew to load and unload"],
  medium_large_goods_vehicle: ["Big loads moved", "Trucks for large set-ups"],
  mini_truck_pickup: ["Small loads moved", "A tempo when you need one"],
  warehouse_storage: ["Safe storage", "Space for your event things"],
  trousseau_gift_packing: ["Trousseau packing", "Trays and gift packing"],
  wedding_planning: ["One planner, all done", "One person for every detail"],
  transportation: ["Travel, sorted", "Every vehicle coordinated"],
}

/* Per template — only where the template's own event says it better. */
const TEMPLATE_COPY = {
  firstBirthday: {
    cake_desserts: ["Their first cake", "Their name, a theme, baby-friendly"],
    decoration_floral: ["Magical age-one décor", "Age-one backdrop, balloons, cake table"],
    catering_food: ["A feast they’ll love", "Veg, non-veg or both"],
    photography: ["Every first smile", "Portraits, family photos, cake smash"],
    live_entertainment: ["Smiles for the kids", "Magician, mascot or games"],
    gifts_favours: ["Return gifts", "A thank-you for every little guest"],
  },
  birthday: {
    decoration_floral: ["A birthday to cherish", "Theme, balloons, cake table"],
    cake_desserts: ["The birthday cake", "Their flavour, their name"],
  },
  kidsParty: {
    decoration_floral: ["Their dream party", "Favourite theme, balloons, backdrop"],
    live_entertainment: ["Non-stop fun", "Games, magic, mascots"],
  },
  babyRite: {
    priest_rituals: ["Blessings, done right", "He brings every pooja item"],
    decoration_floral: ["A cradle to remember", "Cradle, flowers, traditional backdrop"],
    catering_food: ["A traditional feast", "Banana-leaf or buffet"],
    photography: ["Family memories", "The ceremony and family portraits"],
  },
  housewarming: {
    priest_rituals: ["Griha pravesh pooja", "He brings everything for the rituals"],
    decoration_floral: ["A festive welcome", "Flowers and entrance décor"],
    catering_food: ["A family feast", "Prasadam and a meal for all"],
    photography: ["Family photographs", "The pooja and everyone who came"],
  },
  homePooja: {
    priest_rituals: ["A peaceful pooja", "He brings every item"],
    decoration_floral: ["Flowers for the deity", "Garlands and the mandap"],
  },
  wedding: {
    decoration_floral: ["A mandap to remember", "Flowers, stage and entrance"],
    catering_food: ["The wedding feast", "Menus your families will love"],
    photography: ["Every wedding moment", "Candid and traditional"],
  },
  reception: {
    venue: ["A grand venue", "Space for every guest"],
    decoration_floral: ["A stage that shines", "Flowers, backdrop, couple seating"],
    catering_food: ["A reception feast", "Buffet, counters, desserts"],
    photography: ["Every smile, captured", "Couple and guest photography"],
    bridal_makeup_hair: ["Look stunning", "Bridal and groom makeup"],
  },
  launch: {
    venue: ["The right venue", "A room for your audience"],
    decoration_floral: ["Your brand, on stage", "Backdrop and the reveal"],
    event_lighting: ["Light the reveal", "Stage wash and spotlights"],
    sound_av: ["Screens and sound", "Every word heard, every slide seen"],
  },
  collegeFest: {
    tent_furniture: ["Stage and crowd", "Stage, seating and shade"],
    event_lighting: ["Concert lighting", "Rigs and effects"],
    sound_av: ["Concert sound", "Line arrays and mics"],
    security_services: ["A safe crowd", "Staff at every gate"],
  },
}

const INTRO = {
  firstBirthday: ['Your little one’s big day is almost here!', 'Their first celebration deserves to be unforgettable.'],
  birthday: ['Let’s make this birthday unforgettable', 'Pick what you need — we’ll find the people.'],
  kidsParty: ['A party the kids will talk about', 'Fun, food and a cake — sorted.'],
  babyRite: ['A beautiful beginning', 'Blessings, traditions and family memories — arranged.'],
  housewarming: ['Welcome home!', 'The pooja, the feast and your family — arranged.'],
  homePooja: ['A peaceful pooja at home', 'The priest, the flowers and the prasadam.'],
  wedding: ['Your wedding, beautifully arranged', 'Every ritual, every guest, every moment.'],
  reception: ['A reception to remember', 'Your guests, your stage, your night.'],
  launch: ['A launch that makes noise', 'Venue, stage and the reveal — ready.'],
  collegeFest: ['Let’s make this fest legendary', 'Stage, sound and a safe crowd.'],
}
const INTRO_BY_CATEGORY = {
  life: ['Your celebration is almost here', 'Pick what you need — we’ll find the people.'],
  wedding: ['Your wedding, beautifully arranged', 'Pick what you need — the right masters are matched live.'],
  festivals: ['A festival to remember', 'The rituals, the food and the lights — arranged.'],
  corporate: ['An event that runs like clockwork', 'Pick what you need — we match the right teams.'],
}

const pair = p => (p ? { title: p[0], line: p[1] } : null)
export const copyFor = (o, t) => pair(TEMPLATE_COPY[o?.template]?.[t]) ?? pair(DEFAULT[t]) ?? { title: t, line: '' }
export const introFor = o => pair(INTRO[o?.template]) ?? pair(INTRO_BY_CATEGORY[o?.category]) ?? { title: `Your ${o?.name?.toLowerCase() ?? 'event'} is planned`, line: 'Pick what you need — the right masters are matched live.' }
export const CURATED_TEMPLATES = Object.keys(TEMPLATE_COPY)
