/**
 * The celebration pictograms.
 *
 * One drawn mark per service, add-on and toolkit feature — not an emoji,
 * not a generic icon reused across occasions. They share a grid (28×28),
 * a stroke (1.7, round cap, round join), a palette (Royal Amethyst as the
 * line, one accent fill per family) and a tinted rounded-square plate, so
 * fifteen of them in a column read as one system rather than a sticker
 * sheet.
 *
 * Keys are trade ids wherever a mark stands for a trade, so a card can
 * pass `icon={row.tradeId}` and always get the right one; add-ons and
 * toolkit features use their own short keys. `Glyph` falls back to a
 * neutral mark rather than rendering nothing, and never throws.
 *
 * Everything is inline SVG: no network request, crisp at any density,
 * and it inherits the card's own dark-mode treatment because the plate
 * and the ink are explicit rather than currentColor.
 */

const INK = '#5B21B6'      // the line, always
const DEEP = '#4C1D95'

/* Accent fills, by family. Soft enough to sit under the line. */
const A = {
  food: '#FFD9A8', sweet: '#FFC6D9', drink: '#BFE3C8', space: '#DDD0FF',
  media: '#C7DBFF', stage: '#FFD2B8', ritual: '#FFE39E', gift: '#C9F0E4',
  move: '#D6DEEA', care: '#CFE8F7', people: '#FFD6C2',
}

/* The plate behind every mark. */
const PLATE = { food: '#FFF4E6', sweet: '#FFF0F5', drink: '#EEF8F0', space: '#F4EEFF', media: '#EEF4FF', stage: '#FFF2EB', ritual: '#FFF8E7', gift: '#EDFAF5', move: '#F1F4F8', care: '#EDF7FD', people: '#FFF1EA' }

const S = { fill: 'none', stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
const F = t => ({ fill: A[t], stroke: 'none' })

/* Each mark: [family, <svg children>] on a 28×28 grid, art inset to 5–23. */
const MARKS = {
  /* ── Food & drink ─────────────────────────────────────────────── */
  catering_food: ['food', <>
    <path {...F('food')} d="M6.5 15.5a7.5 7.5 0 0 1 15 0z" />
    <path {...S} d="M6 15.5a8 8 0 0 1 16 0M4.5 15.5h19M6.5 19h15M14 7.5V5" />
    <circle {...S} cx="14" cy="6.6" r="1.1" />
  </>],
  chef: ['food', <>
    <path {...F('food')} d="M9 12h10v8H9z" />
    <path {...S} d="M9 12.5c-2.2 0-3.5-1.5-3.5-3.2S6.9 6 8.7 6.4C9.4 4.9 11.5 4 14 4s4.6.9 5.3 2.4C21.1 6 22.5 7.6 22.5 9.3S21.2 12.5 19 12.5M9 12.5h10v7.8a1.7 1.7 0 0 1-1.7 1.7h-6.6A1.7 1.7 0 0 1 9 20.3z" />
  </>],
  cake_desserts: ['sweet', <>
    <path {...F('sweet')} d="M7 14.5h14v6H7z" />
    <path {...S} d="M6 20.8h16M6.5 20.8v-5.3a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5v5.3M6.5 17.4c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.7 1.4 3.3 1.4 1.6-1.4 3.2-1.4M14 13.6V11" />
    <path {...S} d="M14 9.6c0-1 1.2-1.4 1.2-2.6 0 0 1.4 1 1.4 2.3A2.2 2.2 0 0 1 14 11" transform="translate(-2.6 0.4)" />
  </>],
  bar_beverages: ['drink', <>
    <path {...F('drink')} d="M8.5 8.5h11L14 15z" />
    <path {...S} d="M7 7.5h14L14 15.4zM14 15.4V21M10.5 21h7" />
  </>],
  glass: ['drink', <>
    <path {...F('drink')} d="M10 6h8v6a4 4 0 0 1-8 0z" />
    <path {...S} d="M9.5 5.5h9v6.6a4.5 4.5 0 0 1-9 0zM14 17v4.5M10.8 21.5h6.4" />
  </>],

  /* ── Venue, décor, comfort ────────────────────────────────────── */
  venue: ['space', <>
    <path {...F('space')} d="M8 13h12v8H8z" />
    <path {...S} d="M4.5 13 14 6.2 23.5 13M7 11.8V21h14v-9.2M3.5 21h21M12 21v-4.6h4V21" />
  </>],
  door: ['space', <>
    <path {...F('space')} d="M9 7h10v14H9z" />
    <path {...S} d="M8.5 21V6.8a.8.8 0 0 1 .8-.8h9.4a.8.8 0 0 1 .8.8V21M5.5 21h17" />
    <circle fill={DEEP} cx="16.4" cy="14" r="1" />
  </>],
  decoration_floral: ['space', <>
    <path {...F('space')} d="M7.5 9.5h13l-2 10h-9z" />
    <path {...S} d="M5 10.4C8 6.9 20 6.9 23 10.4M8 10.4 9.8 21h8.4L20 10.4" />
    <circle {...S} cx="11" cy="14.6" r="1.4" /><circle {...S} cx="17" cy="14.6" r="1.4" />
  </>],
  flower: ['space', <>
    <circle {...F('sweet')} cx="14" cy="10.5" r="3.4" />
    <path {...S} d="M14 7.1a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8" />
    <path {...S} d="M11.3 8.6C9.6 6.9 10 4.9 10 4.9s2 .3 3.2 1.7M16.7 8.6c1.7-1.7 1.3-3.7 1.3-3.7s-2 .3-3.2 1.7M14 14v7.5M14 17.8c-1.6-.7-3.6 0-3.6 0s1.2 1.7 3.6 1.5M14 16.6c1.6-.9 3.7-.3 3.7-.3s-1.1 1.8-3.5 1.7" />
  </>],
  balloon: ['sweet', <>
    <path {...F('sweet')} d="M18.4 10.6a4.4 5.2 0 1 1-8.8 0 4.4 5.2 0 0 1 8.8 0" />
    <path {...S} d="M14 16.2c2.7 0 4.9-2.5 4.9-5.6S16.7 5 14 5s-4.9 2.5-4.9 5.6 2.2 5.6 4.9 5.6M12.9 16.2l1.1 1.6 1.1-1.6M14 17.8c0 2 2.4 1.6 2.4 3.7" />
  </>],
  tent_furniture: ['space', <>
    <path {...F('space')} d="M6 13h16v7H6z" />
    <path {...S} d="M4.5 13 14 6l9.5 7M6.8 13v7.6M21.2 13v7.6M4 20.6h20M10.2 20.6V16h7.6v4.6" />
  </>],
  chair: ['space', <>
    <path {...F('space')} d="M9 14h10v4H9z" />
    <path {...S} d="M8.5 13.6V7.8a1.3 1.3 0 0 1 1.3-1.3h8.4a1.3 1.3 0 0 1 1.3 1.3v5.8M7.4 13.6h13.2v4.2H7.4zM9.2 17.8V21M18.8 17.8V21" />
  </>],
  event_lighting: ['stage', <>
    <path {...F('stage')} d="M10.5 12.5h7l-1.2 6h-4.6z" />
    <path {...S} d="M14 4.8v2.4M7.6 7.4 9.3 9M20.4 7.4 18.7 9M14 8.6a4.4 4.4 0 0 1 3.4 7.2l-.6 2.8h-5.6l-.6-2.8A4.4 4.4 0 0 1 14 8.6M11.8 21h4.4" />
  </>],
  lighting: ['stage', <>
    <path {...F('stage')} d="M9 15h10l-2 5h-6z" />
    <path {...S} d="M5.5 9.5c2.5 2.2 4 4 4 6.4M22.5 9.5c-2.5 2.2-4 4-4 6.4M14 5v3.2M9.3 15.8h9.4L17 21H11zM11.6 11.8l1.2 1.4M16.4 11.8l-1.2 1.4" />
  </>],

  /* ── Moments ──────────────────────────────────────────────────── */
  photography: ['media', <>
    <path {...F('media')} d="M6 10.5h16v10H6z" />
    <path {...S} d="M5.4 10.6h17.2v9.8a.9.9 0 0 1-.9.9H6.3a.9.9 0 0 1-.9-.9zM10.2 10.6l1.2-2.5h5.2l1.2 2.5" />
    <circle {...S} cx="14" cy="15.6" r="3.3" />
    <path {...S} d="M19.8 12.9h.9" />
  </>],
  camera: ['media', <>
    <circle {...F('media')} cx="14" cy="14" r="5.6" />
    <circle {...S} cx="14" cy="14" r="6.4" /><circle {...S} cx="14" cy="14" r="2.6" />
    <path {...S} d="M14 7.6V5M14 23v-2.6M7.6 14H5M23 14h-2.6" />
  </>],
  videography: ['media', <>
    <path {...F('media')} d="M5.5 10h11v8h-11z" />
    <path {...S} d="M5 10.4a.9.9 0 0 1 .9-.9h9.8a.9.9 0 0 1 .9.9v7.2a.9.9 0 0 1-.9.9H5.9a.9.9 0 0 1-.9-.9zM16.6 13.4l5-2.7a.6.6 0 0 1 .9.5v5.6a.6.6 0 0 1-.9.5l-5-2.7z" />
    <circle fill={DEEP} cx="8.6" cy="13" r="1" />
  </>],
  film: ['media', <>
    <path {...F('media')} d="M6 8.5h16v11H6z" />
    <path {...S} d="M5.4 8.6h17.2v10.8H5.4zM5.4 12.2h17.2M5.4 15.8h17.2M9 8.6v10.8M19 8.6v10.8" />
  </>],
  booth: ['media', <>
    <path {...F('media')} d="M7 7h14v9H7z" />
    <path {...S} d="M6.6 6.6h14.8v9.6H6.6zM9.6 19.4h8.8M9.6 22h8.8M8.6 16.2v6.2M19.4 16.2v6.2" />
    <circle {...S} cx="14" cy="11.4" r="2.4" />
  </>],
  album: ['media', <>
    <path {...F('media')} d="M7.5 6h13v16h-13z" />
    <path {...S} d="M7.4 6.4a.8.8 0 0 1 .8-.8h11.4a.8.8 0 0 1 .8.8v15.2a.8.8 0 0 1-.8.8H8.2a.8.8 0 0 1-.8-.8zM10.4 5.6v16.8M13.4 10h4.2M13.4 13.2h4.2M13.4 16.4h2.6" />
  </>],

  /* ── Music & stage ────────────────────────────────────────────── */
  dj_music: ['stage', <>
    <circle {...F('stage')} cx="14" cy="14" r="7" />
    <circle {...S} cx="14" cy="14" r="7.6" /><circle {...S} cx="14" cy="14" r="2" />
    <path {...S} d="M4 11.4c-.6 1.6-.6 3.6 0 5.2M24 11.4c.6 1.6.6 3.6 0 5.2" />
  </>],
  music: ['stage', <>
    <path {...F('stage')} d="M8 16.5a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0M15.6 14.5a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0" />
    <path {...S} d="M12.4 16.6V7.4l7.6-1.8v9.2" />
    <ellipse {...S} cx="10.2" cy="16.8" rx="2.3" ry="2" /><ellipse {...S} cx="17.8" cy="14.8" rx="2.3" ry="2" />
    <path {...S} d="M12.4 10.6 20 8.8" />
  </>],
  live_entertainment: ['stage', <>
    <path {...F('stage')} d="M7 9h14v6.5a7 7 0 0 1-14 0z" />
    <path {...S} d="M6.6 8.6h14.8v6.6a7.4 7.4 0 1 1-14.8 0z" />
    <circle fill={DEEP} cx="11" cy="13" r="1.1" /><circle fill={DEEP} cx="17" cy="13" r="1.1" />
    <path {...S} d="M11 17.6c1.8 1.4 4.2 1.4 6 0M9 8.6c0-2.6 2.2-4.6 5-4.6s5 2 5 4.6" />
  </>],
  magic: ['stage', <>
    <path {...F('ritual')} d="M7 19.5 17.5 9l2 2L9 21.5z" />
    <path {...S} d="m6.6 20.2 11.6-11.6 2.2 2.2L8.8 22.4zM16.8 10l2.2 2.2M21 4.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7zM6.4 5.4l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3L4.6 7.2l1.3-.5z" />
  </>],
  anchor_mc: ['people', <>
    <path {...F('people')} d="M11.6 6.5h4.8v8h-4.8z" />
    <path {...S} d="M14 5.4a2.6 2.6 0 0 1 2.6 2.6v3.6a2.6 2.6 0 0 1-5.2 0V8A2.6 2.6 0 0 1 14 5.4M8.8 11.6a5.2 5.2 0 0 0 10.4 0M14 16.8V22M10.4 22h7.2" />
  </>],
  sound_av: ['stage', <>
    <path {...F('stage')} d="M8 5.5h12v17H8z" />
    <path {...S} d="M7.6 6.2a.8.8 0 0 1 .8-.8h11.2a.8.8 0 0 1 .8.8v15.6a.8.8 0 0 1-.8.8H8.4a.8.8 0 0 1-.8-.8z" />
    <circle {...S} cx="14" cy="16" r="3.2" /><circle {...S} cx="14" cy="9.2" r="1.5" />
  </>],
  game: ['stage', <>
    <path {...F('media')} d="M6 11h16v7H6z" />
    <path {...S} d="M9.4 10.6h9.2a4.4 4.4 0 0 1 4.3 5.3l-.4 1.9a2.1 2.1 0 0 1-3.7.9l-1.5-1.9h-6.6l-1.5 1.9a2.1 2.1 0 0 1-3.7-.9l-.4-1.9a4.4 4.4 0 0 1 4.3-5.3M9 13v2.4M7.8 14.2h2.4" />
    <circle fill={DEEP} cx="18.4" cy="13.6" r="1" /><circle fill={DEEP} cx="20.4" cy="15.4" r="1" />
  </>],

  /* ── Beauty & rituals ─────────────────────────────────────────── */
  bridal_makeup_hair: ['people', <>
    <path {...F('people')} d="M14.5 6 19 10.5 11 18.5 6.5 14z" />
    <path {...S} d="M19.4 4.8a2 2 0 0 1 2.8 2.8l-1.6 1.6-2.8-2.8zM17.2 7 9 15.2l-.9 4.4 4.4-.9L20.6 10.6z" />
    <path {...S} d="M7.2 21.6c1.6.6 3.3.6 4.9 0" />
  </>],
  spa: ['care', <>
    <path {...F('drink')} d="M14 8c3 2.6 4.4 5.4 4.4 8.4H9.6C9.6 13.4 11 10.6 14 8" />
    <path {...S} d="M14 7.2c3.4 2.8 5 6 5 9.4h-10c0-3.4 1.6-6.6 5-9.4M14 7.2V16.6M6 20.4c2.6-1.4 5.2-1.4 8 0 2.8-1.4 5.4-1.4 8 0" />
  </>],
  paint: ['stage', <>
    <path {...F('sweet')} d="M9 6h10v7H9z" />
    <path {...S} d="M9.6 5.4h8.8l.8 7.2H8.8zM12.6 12.6v3.2a1.4 1.4 0 0 0 2.8 0v-3.2M14 19v3.4" />
    <circle {...S} cx="14" cy="17.6" r="1.4" />
  </>],
  henna: ['ritual', <>
    <path {...F('ritual')} d="M9.5 12h9v9h-9z" />
    <path {...S} d="M9 13.6V8.4a1.2 1.2 0 0 1 2.4 0v4M11.4 12.4V6.6a1.2 1.2 0 0 1 2.4 0v5.6M13.8 12.4V7.4a1.2 1.2 0 0 1 2.4 0v5M16.2 12.8V9.6a1.2 1.2 0 0 1 2.4 0v6.6a6 6 0 0 1-6 6h-.6a3.4 3.4 0 0 1-3-1.8L7 16.8a1.3 1.3 0 0 1 2.2-1.4l.9 1.4" />
  </>],
  mehendi_artist: ['ritual', null],
  priest_rituals: ['ritual', <>
    <path {...F('ritual')} d="M9 15.5h10V20H9z" />
    <path {...S} d="M8.4 15.4h11.2V19a1.4 1.4 0 0 1-1.4 1.4H9.8A1.4 1.4 0 0 1 8.4 19zM6.5 20.4h15M14 15.2c0-2.2 2.2-2.8 2.2-5.2 0 0 2.4 1.8 2.4 4.2a4.6 4.6 0 0 1-.4 1M14 15.2c0-1.4-1.6-2-1.6-4 0 0-2.4 2-2.4 4.2" />
  </>],
  cradle: ['ritual', <>
    <path {...F('ritual')} d="M7 13h14v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
    <path {...S} d="M6 12.8h16M7.2 12.8V18a2.4 2.4 0 0 0 2.4 2.4h8.8a2.4 2.4 0 0 0 2.4-2.4v-5.2M9.6 12.8c0-3.6 2-6.4 4.4-6.4M14 6.4 18 5M6 21.8l2.4-1.4M22 21.8l-2.4-1.4" />
  </>],
  ring: ['ritual', <>
    <circle {...F('ritual')} cx="14" cy="16.5" r="4.6" />
    <circle {...S} cx="14" cy="16.6" r="5.2" />
    <path {...S} d="m11.4 10.4 2.6-4 2.6 4M11.4 10.4h5.2M11.4 10.4 14 13.4l2.6-3" />
  </>],
  heart: ['sweet', <>
    <path {...F('sweet')} d="M14 21s-7-4.3-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.7-7 9-7 9" />
    <path {...S} d="M14 21.4C11.6 20 6.4 16.3 6.4 12a4.3 4.3 0 0 1 7.6-2.7A4.3 4.3 0 0 1 21.6 12c0 4.3-5.2 8-7.6 9.4" />
  </>],

  /* ── Gifts, print, supplies ───────────────────────────────────── */
  gifts_favours: ['gift', <>
    <path {...F('gift')} d="M6.5 11.5h15v10h-15z" />
    <path {...S} d="M6 11.4h16v2.2H6zM7.4 13.6v8h13.2v-8M14 11.4v10M14 11.4C12.6 9.6 11 9 9.8 9.6S8.6 11.4 10 11.4zM14 11.4c1.4-1.8 3-2.4 4.2-1.8s.6 1.8-.8 1.8z" />
  </>],
  gift: ['gift', null],
  invitation_printing: ['gift', <>
    <path {...F('gift')} d="M5.5 8.5h17v11h-17z" />
    <path {...S} d="M5.4 8.8a.9.9 0 0 1 .9-.9h15.4a.9.9 0 0 1 .9.9v10.4a.9.9 0 0 1-.9.9H6.3a.9.9 0 0 1-.9-.9zM5.6 9.2 14 15l8.4-5.8" />
  </>],
  invite: ['gift', null],
  event_materials_supplier: ['move', <>
    <path {...F('move')} d="M6.5 11h15v10h-15z" />
    <path {...S} d="M6 10.8h16v9.6a.8.8 0 0 1-.8.8H6.8a.8.8 0 0 1-.8-.8zM8.4 10.8 10 6.6h8l1.6 4.2M11.4 14.4h5.2" />
  </>],
  craft: ['gift', <>
    <path {...F('gift')} d="M8 9h12v12H8z" />
    <path {...S} d="M7.6 9.4a.8.8 0 0 1 .8-.8h11.2a.8.8 0 0 1 .8.8v11.2a.8.8 0 0 1-.8.8H8.4a.8.8 0 0 1-.8-.8zM10.8 8.6V5.4M17.2 8.6V5.4M11 13.4l2.2 2.2L18 11" />
  </>],
  dress: ['people', <>
    <path {...F('people')} d="M11 9h6l4 12H7z" />
    <path {...S} d="M11.2 5.6 14 8l2.8-2.4 1.6 1.2-2.2 3 3.4 10.8a1 1 0 0 1-1 1.3H9.4a1 1 0 0 1-1-1.3L11.8 9.8l-2.2-3z" />
  </>],

  /* ── Guests, safety, movement ─────────────────────────────────── */
  guest_services: ['people', <>
    <circle {...F('people')} cx="14" cy="9.5" r="3.2" />
    <circle {...S} cx="14" cy="9.4" r="3.4" />
    <path {...S} d="M7.4 21.4a6.6 6.6 0 0 1 13.2 0M4.6 13.6a3.6 3.6 0 0 1 3.2-1.4M23.4 13.6a3.6 3.6 0 0 0-3.2-1.4" />
  </>],
  passenger_transport: ['move', <>
    <path {...F('move')} d="M5.5 9h17v9h-17z" />
    <path {...S} d="M5 9.8A1.8 1.8 0 0 1 6.8 8h14.4A1.8 1.8 0 0 1 23 9.8v7.4H5zM5 12.8h18M8.4 17.2v2.4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.4M22.6 17.2v2.4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.4" />
    <circle fill={DEEP} cx="8.4" cy="15.2" r="1" /><circle fill={DEEP} cx="19.6" cy="15.2" r="1" />
  </>],
  bus: ['move', null],
  transportation: ['move', null],
  valet_parking: ['move', <>
    <path {...F('move')} d="M7 6.5h14v15H7z" />
    <path {...S} d="M6.6 7a.9.9 0 0 1 .9-.9h13a.9.9 0 0 1 .9.9v14a.9.9 0 0 1-.9.9h-13a.9.9 0 0 1-.9-.9zM11.6 18.2V9.8h3.2a2.8 2.8 0 0 1 0 5.6h-3.2" />
  </>],
  security_services: ['care', <>
    <path {...F('care')} d="M14 5.5 21 8v6c0 4-3 6.8-7 8.2-4-1.4-7-4.2-7-8.2V8z" />
    <path {...S} d="M14 5.2 21.4 7.8v6.4c0 4.2-3.2 7.2-7.4 8.6-4.2-1.4-7.4-4.4-7.4-8.6V7.8zM11 14l2 2 4-4.4" />
  </>],
  safety_facilities: ['care', <>
    <path {...F('care')} d="M7 10.5h14v11H7z" />
    <path {...S} d="M6.6 10.4h14.8v10.4a1 1 0 0 1-1 1H7.6a1 1 0 0 1-1-1zM10 10.4V7.6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2.8M14 13.4v5M11.5 15.9h5" />
  </>],
  broom: ['care', <>
    <path {...F('care')} d="M9.5 15h9l1.5 7h-12z" />
    <path {...S} d="M18.6 5.4 11.4 14M9 14.6h10.4l1.6 7.4H7.4zM12.4 14.6 11.6 22M15.6 14.6l.8 7.4" />
  </>],
  power_cooling: ['move', <>
    <path {...F('move')} d="M6 9h16v10H6z" />
    <path {...S} d="M5.6 9.4a.8.8 0 0 1 .8-.8h15.2a.8.8 0 0 1 .8.8v8.4a.8.8 0 0 1-.8.8H6.4a.8.8 0 0 1-.8-.8zM8 19.4v2M20 19.4v2M15 11.2l-2.6 3.6h3.2L13 18.2" />
  </>],
  event_equipment_rental: ['move', <>
    <path {...F('move')} d="M6 12h16v5H6z" />
    <path {...S} d="M5.4 11.8h17.2V17H5.4zM7.6 17v4.4M20.4 17v4.4M14 11.8V7.4M10 7.4h8" />
  </>],
  end_to_end_event_logistics: ['move', <>
    <path {...F('move')} d="M4.5 10h11v8h-11z" />
    <path {...S} d="M4 10.4a.8.8 0 0 1 .8-.8h10.4v8.8H4zM15.2 12.4h3.4l3.4 3.2v2.8h-6.8z" />
    <circle {...S} cx="8.4" cy="19.6" r="1.8" /><circle {...S} cx="18.6" cy="19.6" r="1.8" />
  </>],
  mini_truck_pickup: ['move', null],
  medium_large_goods_vehicle: ['move', null],
  loading_unloading_crew: ['move', <>
    <circle {...F('move')} cx="13" cy="7.5" r="2.4" />
    <circle {...S} cx="13" cy="7.4" r="2.6" />
    <path {...S} d="M9.6 21.4v-5.2l-1.8 1.6M16.4 21.4v-5.2M9.6 16.2c0-3 1-5.4 3.4-5.4s3.4 2.4 3.4 5.4M16.4 13.4 20 15" />
  </>],
  warehouse_storage: ['move', <>
    <path {...F('move')} d="M6 12h16v9H6z" />
    <path {...S} d="M4.6 11.6 14 6.6l9.4 5M6.4 12.4V21h15.2v-8.6M4 21h20M10.4 21v-4.4h7.2V21" />
  </>],
  trousseau_gift_packing: ['gift', <>
    <path {...F('gift')} d="M6.5 12.5h15v8h-15z" />
    <path {...S} d="M6 12.4h16v7.4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM6 15.8h16M14 12.4v8.4M9.6 12.4c-1.6-2.2.4-4.4 2.2-3.4S14 12.4 14 12.4s.6-2.4 2.2-3.4 3.8 1.2 2.2 3.4" />
  </>],
  wedding_planning: ['care', <>
    <path {...F('care')} d="M7 7h14v14H7z" />
    <path {...S} d="M6.6 7.6a.9.9 0 0 1 .9-.9h13a.9.9 0 0 1 .9.9v12.8a.9.9 0 0 1-.9.9h-13a.9.9 0 0 1-.9-.9zM10.6 5v3.4M17.4 5v3.4M10 12.4l1.8 1.8 3.4-3.4M10 17.2l1.8 1.8 3.4-3.4" />
  </>],
  map: ['move', <>
    <path {...F('move')} d="M5.5 8 11 6l6 2 5.5-2v14l-5.5 2-6-2-5.5 2z" />
    <path {...S} d="M5.4 7.8 11 5.8l6 2.2 5.6-2.2v14.4L17 22.2l-6-2.2-5.6 2zM11 5.8v14.2M17 8v14.2" />
  </>],
  bed: ['care', <>
    <path {...F('care')} d="M5.5 13h17v6h-17z" />
    <path {...S} d="M5 19.4V9M5 13.4h18v6M23 19.4v-3M8.6 13.4v-2.6h5.2v2.6" />
    <circle {...S} cx="8.6" cy="10.8" r="0.1" />
  </>],
  phone: ['care', <>
    <path {...F('care')} d="M9 4.5h10v19H9z" />
    <path {...S} d="M8.6 5.4a1.4 1.4 0 0 1 1.4-1.4h8a1.4 1.4 0 0 1 1.4 1.4v17.2a1.4 1.4 0 0 1-1.4 1.4h-8a1.4 1.4 0 0 1-1.4-1.4zM12 6.6h4" />
    <circle fill={DEEP} cx="14" cy="20.4" r="1" />
  </>],

  /* ── The free toolkit ─────────────────────────────────────────── */
  rsvp: ['gift', <>
    <path {...F('gift')} d="M6.5 7h15v14h-15z" />
    <path {...S} d="M6.4 7.6a.9.9 0 0 1 .9-.9h13.4a.9.9 0 0 1 .9.9v12.8a.9.9 0 0 1-.9.9H7.3a.9.9 0 0 1-.9-.9zM9.6 12.4l1.8 1.8 3.6-3.8M9.6 17.4h8.8" />
  </>],
  chat: ['care', <>
    <path {...F('care')} d="M5.5 7h17v10h-17z" />
    <path {...S} d="M5.4 8a1 1 0 0 1 1-1h15.2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H11l-4 4v-4H6.4a1 1 0 0 1-1-1z" />
    <circle fill={DEEP} cx="10.4" cy="12" r="1" /><circle fill={DEEP} cx="14" cy="12" r="1" /><circle fill={DEEP} cx="17.6" cy="12" r="1" />
  </>],
  group: ['people', <>
    <circle {...F('people')} cx="10.5" cy="10" r="2.8" />
    <circle {...S} cx="10.6" cy="10" r="3" /><circle {...S} cx="18.4" cy="11.4" r="2.4" />
    <path {...S} d="M4.6 20.4a6 6 0 0 1 12 0M18 15.4a4.6 4.6 0 0 1 4.4 4" />
  </>],
  poll: ['drink', <>
    <path {...F('drink')} d="M8 13h3v8H8zM13 8h3v13h-3zM18 15h3v6h-3z" />
    <path {...S} d="M7.6 21.4V13a.6.6 0 0 1 .6-.6h2.2a.6.6 0 0 1 .6.6v8.4M12.8 21.4V7.8a.6.6 0 0 1 .6-.6h2.2a.6.6 0 0 1 .6.6v13.6M18 21.4v-6.6a.6.6 0 0 1 .6-.6h2.2a.6.6 0 0 1 .6.6v6.6M5.6 21.4h17" />
  </>],
  budget: ['drink', <>
    <circle {...F('drink')} cx="14" cy="14" r="7.4" />
    <circle {...S} cx="14" cy="14" r="8" />
    <path {...S} d="M11.4 10.4h5.2M11.4 13h5.2M11.4 10.4c2.8 0 3.4 1.2 3.4 2.6s-.8 2.6-3.4 2.6l5.2 4" />
  </>],
  schedule: ['care', <>
    <path {...F('care')} d="M6.5 8h15v13h-15z" />
    <path {...S} d="M6.4 8.8a.9.9 0 0 1 .9-.9h13.4a.9.9 0 0 1 .9.9v11.8a.9.9 0 0 1-.9.9H7.3a.9.9 0 0 1-.9-.9zM6.4 12.2h15.2M10.4 6v3.4M17.6 6v3.4" />
    <circle fill={DEEP} cx="11" cy="16" r="1.1" /><circle fill={DEEP} cx="14.8" cy="16" r="1.1" />
  </>],
}

/* Marks that are the same drawing under another name. */
const ALIAS = {
  mehendi_artist: 'henna', gift: 'gifts_favours', invite: 'invitation_printing',
  bus: 'passenger_transport', transportation: 'passenger_transport',
  mini_truck_pickup: 'end_to_end_event_logistics', medium_large_goods_vehicle: 'end_to_end_event_logistics',
  cake: 'cake_desserts', tent: 'tent_furniture', restaurant: 'catering_food',
}

const FALLBACK = ['space', <>
  <circle {...F('space')} cx="14" cy="14" r="6.6" />
  <circle {...S} cx="14" cy="14" r="7.2" /><path {...S} d="M14 10.6v6.8M10.6 14h6.8" />
</>]

export function markFor(key) {
  const k = ALIAS[key] ?? key
  const m = MARKS[k]
  return m && m[1] ? m : MARKS[key]?.[1] ? MARKS[key] : FALLBACK
}

/**
 * One pictogram on its plate.
 * `size` is the plate; the art is drawn on a 28-grid and scales with it.
 */
export default function Glyph({ name, size = 44, plate = true, className = '', title = null }) {
  const [family, art] = markFor(name)
  return (
    <span
      className={'inline-grid shrink-0 place-items-center ' + className}
      style={plate ? { width: size, height: size, borderRadius: size * 0.32, background: PLATE[family] ?? PLATE.space } : { width: size, height: size }}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title ?? undefined}
    >
      <svg viewBox="0 0 28 28" width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} focusable="false">{art}</svg>
    </span>
  )
}
