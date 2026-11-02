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

const DEFAULT = {
  catering_food: ['A delicious feast for your guests', 'Food cooked and served for everyone'],
  cake_desserts: ['A beautiful cake', 'Designed, baked and delivered'],
  decoration_floral: ['A beautiful setting', 'Décor and flowers, set up and taken down'],
  photography: ['Capture every beautiful moment', 'A photographer for the whole event'],
  videography: ['Relive it on video', 'Film, highlights and reels'],
  venue: ['The perfect venue', 'A place that fits your guests'],
  live_entertainment: ['Entertainment everyone enjoys', 'Performers for your crowd'],
  dj_music: ['Music that fills the floor', 'A DJ with sound and lights'],
  anchor_mc: ['A host to run the show', 'An anchor who keeps it moving'],
  sound_av: ['Clear sound and screens', 'Speakers, mics and displays'],
  event_lighting: ['Lighting that sets the mood', 'Warm lights to stage rigs'],
  tent_furniture: ['Seating and shade for everyone', 'Chairs, tables and canopies'],
  priest_rituals: ['A priest for the rituals', 'Brings every pooja item and garland'],
  bridal_makeup_hair: ['Look your most beautiful', 'Makeup and hair for the day'],
  mehendi_artist: ['Beautiful mehendi', 'Henna for the bride and family'],
  invitation_printing: ['Invitations to remember', 'Printed or boxed invitations'],
  gifts_favours: ['Return gifts they’ll love', 'Thank-you gifts for every guest'],
  bar_beverages: ['Drinks for every guest', 'Mocktails, juices and a bar'],
  passenger_transport: ['Guests arrive comfortably', 'Cars and buses for your guests'],
  valet_parking: ['Easy parking', 'Valets at the entrance'],
  security_services: ['A safe, secure event', 'Trained security staff'],
  safety_facilities: ['Safety and clean-up covered', 'First aid, washrooms and cleaning'],
  guest_services: ['A warm welcome', 'Hosts at the door and the desk'],
  power_cooling: ['Power and cooling that never fail', 'Generators and cooling'],
  event_equipment_rental: ['The equipment you need', 'Stage, truss and rentals'],
  event_materials_supplier: ['Event materials', 'Supplies delivered to the venue'],
  end_to_end_event_logistics: ['Everything delivered and set up on time', 'Transport, crew and set-up'],
  loading_unloading_crew: ['Hands for the heavy lifting', 'A crew to load and unload'],
  medium_large_goods_vehicle: ['Big loads moved', 'Trucks for large set-ups'],
  mini_truck_pickup: ['Small loads moved', 'A tempo when you need one'],
  warehouse_storage: ['Safe storage', 'Space for your event things'],
  trousseau_gift_packing: ['Beautiful trousseau packing', 'Trays and gift packing'],
  wedding_planning: ['A planner who runs it all', 'One person for every detail'],
  transportation: ['Every vehicle coordinated', 'One plan for all the travel'],
}

/* Per template — only where the template's own event says it better. */
const TEMPLATE_COPY = {
  firstBirthday: {
    cake_desserts: ['A beautiful first birthday cake', 'Their name, a theme, baby-friendly options'],
    decoration_floral: ['Make their first birthday magical', 'Age-one backdrop, balloons and a cake table'],
    catering_food: ['Delicious food for your guests', 'Veg, non-veg or both — served with love'],
    photography: ['Capture their first birthday memories', 'Baby portraits, family photos, cake smash'],
    live_entertainment: ['Smiles for the little ones', 'Magician, mascot or kids’ games'],
    gifts_favours: ['Return gifts the kids will love', 'A thank-you for every little guest'],
  },
  birthday: {
    decoration_floral: ['A birthday setting to remember', 'Theme, balloons and a cake table'],
    cake_desserts: ['The birthday cake', 'Their favourite flavour, their name on it'],
  },
  kidsParty: {
    decoration_floral: ['A party room they’ll never forget', 'Their favourite theme, balloons and a backdrop'],
    live_entertainment: ['Fun that keeps every child busy', 'Games, magic, mascots'],
  },
  babyRite: {
    priest_rituals: ['Priest and the ceremony', 'Every ritual done right — he brings the pooja items'],
    decoration_floral: ['A beautiful cradle ceremony setup', 'Cradle, flowers and a traditional backdrop'],
    catering_food: ['A traditional feast for the family', 'Veg menus, banana-leaf or buffet'],
    photography: ['Preserve the family memories', 'The ceremony and family portraits'],
  },
  housewarming: {
    priest_rituals: ['Griha pravesh and pooja', 'The priest brings everything for the rituals'],
    decoration_floral: ['Flowers and entrance décor', 'A traditional welcome at the door'],
    catering_food: ['A family feast', 'Prasadam and a meal for every guest'],
    photography: ['Family photographs', 'The pooja and everyone who came'],
  },
  homePooja: {
    priest_rituals: ['A priest for the pooja', 'He brings every item the ritual needs'],
    decoration_floral: ['Flowers for the deity', 'Garlands and the mandap'],
  },
  wedding: {
    decoration_floral: ['A mandap to remember', 'Flowers, stage and entrance'],
    catering_food: ['The wedding feast', 'Menus your families will talk about'],
    photography: ['Every moment of your wedding', 'Candid and traditional, start to end'],
  },
  reception: {
    venue: ['A beautiful reception venue', 'Space for every guest'],
    decoration_floral: ['A grand stage and couple seating', 'Flowers, backdrop and lights'],
    catering_food: ['A wedding feast for your guests', 'Buffet, live counters and desserts'],
    photography: ['Bridal and couple photography', 'Every guest, every smile'],
    bridal_makeup_hair: ['Look stunning on stage', 'Bridal and groom makeup and hair'],
  },
  launch: {
    venue: ['A professional launch venue', 'The right room for your audience'],
    decoration_floral: ['Branding and stage décor', 'Your brand, the reveal, the backdrop'],
    event_lighting: ['Lighting for the reveal', 'Stage wash and spotlights'],
    sound_av: ['LED screen and audio', 'Every word heard, every slide seen'],
  },
  collegeFest: {
    tent_furniture: ['Stage and crowd set-up', 'Stage, seating and shade'],
    event_lighting: ['Concert lighting', 'Rigs and effects for the stage'],
    sound_av: ['Professional concert sound', 'Line arrays, mixers and mics'],
    security_services: ['Crowd management and safety', 'Trained staff at every gate'],
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
