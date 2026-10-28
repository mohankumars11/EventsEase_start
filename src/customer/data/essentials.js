/**
 * The questions a customer is actually asked (Mohan, 2026-10-28).
 *
 * Every trade's full question list comes from the partner's own listing
 * form (lib/needs.js) — dozens of them, many about how the partner runs
 * their business. A customer planning ten services cannot answer all of
 * that. ESSENTIAL is the short list per trade that decides which masters
 * fit — the kind of service, the style, what they deliver — asked first;
 * hours and guests (the price) are asked above them. Everything else sits
 * behind "More options", optional. Never asked: years of experience, night
 * work, the partner's equipment or operations.
 *
 * EXPLAIN gives a first-time customer one plain line per option — "what is
 * candid?" — shown under the option and said by Sambu when it is tapped.
 * An example picture appears under an option if art/ex-<slug>.webp exists.
 */
export const ESSENTIAL = {
  photography: ['specialties', 'styles', 'formats'],
  videography: ['specialties', 'deliverables'],
  catering_food: ['$diet', '$cuisine', 'service_styles', '$dishes'],
  cake_desserts: ['product_types', 'flavours', 'sizes', 'dietary'],
  bar_beverages: ['service_lines'],
  venue: ['venue_type', 'facilities'],
  decoration_floral: ['services', 'themes', 'flowers'],
  tent_furniture: ['groups'],
  event_lighting: ['service_types'],
  dj_music: ['performance_kinds', 'styles', 'own_equipment'],
  live_entertainment: ['act_types'],
  sound_av: ['groups'],
  bridal_makeup_hair: ['services_offered', 'styles', 'who'],
  mehendi_artist: ['who', 'styles', 'coverage'],
  priest_rituals: ['ceremonies', 'traditions', 'languages'],
  trousseau_gift_packing: ['types'],
  wedding_planning: ['services', 'budget_band', 'wedding_styles'],
  end_to_end_event_logistics: ['scope'],
  guest_services: ['roles'],
  passenger_transport: ['vehicle_services'],
  valet_parking: ['services'],
  security_services: ['services'],
  safety_facilities: ['kit'],
  gifts_favours: ['gift_types', 'personalisation_methods'],
  invitation_printing: ['products', 'card_styles'],
  event_materials_supplier: ['supplies'],
  event_equipment_rental: ['equipment_types'],
  power_cooling: ['services'],
  transportation: ['service_type'],
  mini_truck_pickup: ['loads'],
  medium_large_goods_vehicle: ['loads'],
  loading_unloading_crew: ['work'],
  warehouse_storage: ['item_types', 'storage_kind'],
}
/* Never asked of a customer, in any list. */
export const NEVER = new Set(['$years', 'languages_partner', 'outstation', 'night_trips', 'night_movement', 'late_night', 'overnight_install', 'equipment'])

export const EXPLAIN = {
  // photography — what to shoot
  candid: 'Natural, unposed moments as they happen',
  traditional: 'Posed family and ritual photos — everyone in the frame',
  'pre-wedding': 'A styled shoot of the couple before the big day',
  portrait: 'Close, flattering photos of people',
  'drone photography': 'Wide shots from the sky — venue, procession, crowd',
  'haldi & mehendi': 'Colourful, close-up coverage of the haldi and mehendi',
  // photography — style
  documentary: 'Tells the day as a story, nothing staged',
  editorial: 'Magazine-style, polished and posed with intent',
  'fine art': 'Soft, artistic, painterly light',
  'classic posed': 'Timeless posed portraits of family and couple',
  'cinematic stills': 'Photos that look like frames from a film',
  photojournalistic: 'Real moments captured without interrupting',
  'bright & airy': 'Light, soft, pastel-toned edits',
  'dark & moody': 'Rich, dramatic, deep-toned edits',
  'vintage film': 'Warm, grainy, film-camera look',
  'black & white': 'Classic monochrome',
  // photography — what you get
  'online gallery': 'A private link to view and download every photo',
  'printed album': 'A bound album with your best photos',
  'raw files': 'The untouched camera files, for your own edits',
  'social-media edits': 'Ready-to-post edits for Instagram and WhatsApp',
  'photo book': 'A designed coffee-table book',
  // videography
  'teaser (about 1 min)': 'A short, punchy film to share the same week',
  'highlight film': 'The best moments in 3–8 minutes, set to music',
  'full-length film': 'The whole event, ceremony to send-off',
  'instagram reels': 'Vertical 30–60 s reels for social media',
  'save-the-date video': 'A short film announcing the date',
  'raw footage': 'All the untouched video',
  'same-day edit': 'A quick film shown at the reception itself',
  'live stream link': 'Family far away watches live',
  // makeup
  natural: 'Fresh, light, skin-first look',
  glam: 'Bold, full-coverage party look',
  hd: 'Camera-ready makeup that looks flawless on film',
  airbrush: 'Sprayed-on, long-lasting, very smooth finish',
  // mehendi
  arabic: 'Bold flowing vines with open space',
  rajasthani: 'Dense, traditional, fills the whole hand',
  'indo-arabic': 'A mix — traditional detail with flowing vines',
  minimal: 'Small, simple, elegant patterns',
  'bride & groom portrait': 'Faces of the couple drawn into the design',
  // catering
  buffet: 'Guests serve themselves from counters',
  'traditional banana-leaf meal': 'Seated South Indian meal served on banana leaves',
  'seated / plated service': 'Each guest is served at the table',
  'live cooking': 'Dishes cooked fresh in front of guests',
  'food counters': 'Separate stations — chaat, dosa, desserts…',
  'packed meals': 'Individually packed meals for each guest',
  // dj & music
  dj: 'A DJ with music and a dance floor',
  'live band': 'Musicians performing live',
  'background music': 'Soft music while guests chat and eat',
  'baraat dj (on a vehicle)': 'A DJ on a decorated vehicle for the baraat',
  'dhol with dj': 'Live dhol drummers with the DJ',
  'sangeet night': 'Music and choreography for the sangeet',
  // decor
  'traditional south indian': 'Banana leaves, marigolds, brass and kolam',
  'mysore royal': 'Palace-style gold and red grandeur',
  contemporary: 'Clean, modern and stylish',
  pastel: 'Soft pinks, peaches and mint',
  'floral-heavy': 'Walls and arches covered in fresh flowers',
  boho: 'Earthy, relaxed, macramé and pampas',
  'fairy-light': 'Warm string lights everywhere',
}

export const explain = label => EXPLAIN[String(label ?? '').toLowerCase()] ?? null
export const exampleSlug = label => `ex-${String(label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
