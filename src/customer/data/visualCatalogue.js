/**
 * The visual choices inside a requirement (spec 2026-11-02 §5–6) — what a
 * customer picks by looking, not by reading.
 *
 *   themesFor(o)   decoration themes for this kind of occasion
 *   CAKES          cake designs
 *   COLOURS        colour palettes;  FONTS  name-board lettering
 *   FOOD_WAYS      how the food is arranged — each one is a set of the
 *                  catering trade's OWN partner answers (data/trades/
 *                  catering_food.js: prep_location, service_styles), so
 *                  picking one narrows the match to partners who said so
 *   ACTION         the verb on a requirement card ("Choose cake")
 *
 * Photographs come from visualCatalogue.generated.js (Pexels inspiration,
 * labelled) and go to masters as the customer's reference.
 */
import { VISUALS } from './visualCatalogue.generated'

const T = (id, label) => ({ id, label, photo: VISUALS[`theme:${id}`] ?? null })
const SETS = {
  kids: [T('teddy', 'Teddy bear'), T('jungle', 'Jungle safari'), T('princess', 'Princess'), T('rainbow', 'Pastel rainbow'), T('space', 'Space'), T('balloon', 'Balloon garden')],
  traditional: [T('marigold', 'Marigold & mango leaves'), T('mandap', 'Pooja mandap'), T('rangoli', 'Flower rangoli'), T('diya', 'Diyas & lamps'), T('whitefloral', 'White flowers'), T('fairylights', 'Warm lights')],
  baby: [T('cradle', 'Flower cradle'), T('marigold', 'Marigold & mango leaves'), T('mandap', 'Pooja mandap'), T('rangoli', 'Flower rangoli'), T('teddy', 'Teddy bear'), T('whitefloral', 'White flowers')],
  wedding: [T('floralstage', 'Floral stage'), T('weddingmandap', 'Wedding mandap'), T('haldi', 'Haldi yellow'), T('pastelwedding', 'Pastel garden'), T('royal', 'Royal gold'), T('whitefloral', 'White florals')],
  corporate: [T('brandstage', 'Branded stage'), T('ledstage', 'LED stage'), T('ribbon', 'Ribbon cutting'), T('awards', 'Awards night'), T('lounge', 'Lounge'), T('minimalcorp', 'Minimal')],
  general: [T('balloon', 'Balloon garden'), T('fairylights', 'Fairy lights'), T('rustic', 'Rustic'), T('neon', 'Neon sign'), T('boho', 'Boho'), T('whitefloral', 'White florals')],
}
const KIDS = new Set(['birthday', 'firstBirthday', 'kidsParty', 'teenParty', 'babyShower', 'genderReveal', 'petParty', 'schoolParty'])
const TRADITIONAL = new Set(['housewarming', 'homePooja', 'communityPuja', 'diwali', 'grihaPraveshAfterWedding', 'homeRite', 'harvestNewYear', 'gurpurab', 'eid', 'christmas'])
export function themesFor(o) {
  if (o?.template === 'babyRite') return SETS.baby
  if (KIDS.has(o?.template)) return SETS.kids
  if (TRADITIONAL.has(o?.template) || o?.category === 'festivals') return SETS.traditional
  if (o?.category === 'wedding') return SETS.wedding
  if (['corporate', 'industry', 'retail', 'property'].includes(o?.category)) return SETS.corporate
  return SETS.general
}

const C = (id, label) => ({ id, label, photo: VISUALS[`cake:${id}`] ?? null })
export const CAKES = [C('number', 'Age number'), C('teddy', 'Teddy topper'), C('fondant', 'Theme fondant'), C('floral', 'Floral cream'), C('minimal', 'Minimal white'), C('tiered', 'Tiered')]

export const COLOURS = [
  ['pastel', 'Pastel pink', ['#F8C8D4', '#FFF4F7']], ['blue', 'Blue & white', ['#9CC9F2', '#FFFFFF']], ['gold', 'Gold & white', ['#D9B45A', '#FFFFFF']],
  ['purple', 'Purple & silver', ['#8B5CF6', '#D9DCE3']], ['rainbow', 'Rainbow', ['#F87171', '#FBBF24', '#34D399', '#60A5FA']],
  ['traditional', 'Marigold & green', ['#F59E0B', '#15803D']], ['red', 'Red & gold', ['#B91C1C', '#D9B45A']],
].map(([id, label, swatch]) => ({ id, label, swatch }))

export const FONTS = [
  ['script', 'Classic script', "'Great Vibes', cursive"], ['serif', 'Elegant serif', "'Playfair Display', serif"],
  ['calligraphy', 'Calligraphy', "'Pinyon Script', cursive"], ['bold', 'Modern bold', 'inherit'],
].map(([id, label, family]) => ({ id, label, family }))

/* Who cooks — the catering partners' own onboarding answer (prep_location),
   so the match only reaches partners who work that way. How it is served
   lives in lib/sambramoMenu.SERVE (their service_styles answer). */
export const FOOD_WAYS = [
  { id: 'caterer', label: 'A caterer cooks & serves', line: 'Cooked in their kitchen, served at your event', needs: {} },
  { id: 'cook', label: 'A cook at your place', line: 'Cooks fresh at your venue', needs: { prep_location: ["At the customer's venue", 'At both locations'] } },
]

export const ACTION = {
  catering_food: 'Choose food', cake_desserts: 'Choose cake', decoration_floral: 'Choose décor', photography: 'Choose photos',
  videography: 'Choose video', venue: 'Find venue', priest_rituals: 'Choose priest', live_entertainment: 'Choose fun',
  dj_music: 'Choose music', anchor_mc: 'Choose host', invitation_printing: 'Choose invites', gifts_favours: 'Choose gifts',
  bridal_makeup_hair: 'Choose look', mehendi_artist: 'Choose mehendi', bar_beverages: 'Choose drinks', tent_furniture: 'Choose seating',
  event_lighting: 'Choose lights', sound_av: 'Choose sound', passenger_transport: 'Choose cars', wedding_planning: 'Choose planner',
}
/* The service, in two words, for the tag on its photo. */
export const TAG = {
  catering_food: 'Catering', cake_desserts: 'Cake', decoration_floral: 'Décor', photography: 'Photography', videography: 'Video',
  venue: 'Venue', priest_rituals: 'Priest', live_entertainment: 'Entertainment', dj_music: 'DJ', anchor_mc: 'Anchor',
  invitation_printing: 'Invitations', gifts_favours: 'Gifts', bridal_makeup_hair: 'Makeup', mehendi_artist: 'Mehendi',
  bar_beverages: 'Drinks', tent_furniture: 'Seating', event_lighting: 'Lighting', sound_av: 'Sound', passenger_transport: 'Cars',
  valet_parking: 'Valet', security_services: 'Security', safety_facilities: 'Safety', guest_services: 'Hosts',
  wedding_planning: 'Planner', end_to_end_event_logistics: 'Logistics',
}

/* What a customer cares about first — the order cards appear in. */
export const ORDER = ['venue', 'catering_food', 'cake_desserts', 'decoration_floral', 'photography', 'priest_rituals', 'bridal_makeup_hair', 'mehendi_artist',
  'live_entertainment', 'dj_music', 'anchor_mc', 'invitation_printing', 'gifts_favours', 'bar_beverages', 'event_lighting', 'sound_av', 'tent_furniture',
  'passenger_transport', 'trousseau_gift_packing', 'videography', 'guest_services', 'valet_parking', 'security_services', 'safety_facilities',
  'event_equipment_rental', 'wedding_planning']
export const byOrder = (a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)
/* Operations, not enhancements: never offered as "extra special" — they
   stay in the plan only where the occasion needs them, or via "More". */
export const OPS = new Set(['end_to_end_event_logistics', 'loading_unloading_crew', 'medium_large_goods_vehicle', 'mini_truck_pickup',
  'warehouse_storage', 'power_cooling', 'event_materials_supplier', 'transportation'])
