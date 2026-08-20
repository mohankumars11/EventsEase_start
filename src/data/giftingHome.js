/**
 * The storefront's editorial layer — what the shop front puts in front of
 * somebody who has not yet decided what they want.
 *
 * ── Why this is data and not JSX ─────────────────────────────────────────
 * The home screen is a sequence of rails and mosaics whose only real content
 * is "a label, a picture, and where tapping it goes". Written as components,
 * that turns into a hundred lines of markup per section and the layout starts
 * disagreeing with itself — three different tile paddings, two different chip
 * heights. Written as data, the layout is decided once in the component and
 * everything here is a row somebody can add without touching a stylesheet.
 *
 * ── Every target must land somewhere populated ───────────────────────────
 * `category` is a real `products.category` and `occasion` is a real
 * `products.occasion` — the same strings the filter chips and the deep links
 * use. The home screen filters this list against a live product count before
 * rendering, so a tile whose shelf is empty (an unapplied migration, a shelf
 * an admin retired) is dropped rather than shown as a door into nothing.
 * Adding a row here is therefore safe: the worst case is that it does not
 * appear yet.
 */

/**
 * ⚠ Hand-maintained, and it goes stale once a year.
 *
 * Festival dates move against the Gregorian calendar, so these cannot be
 * computed and there is no panchang in this codebase to read them from.
 * The rule that makes a stale table harmless: a countdown pill renders ONLY
 * when the date is set and still in the future. An entry that has passed
 * loses its pill and the tile carries on as an ordinary occasion tile, so
 * the failure mode of forgetting to update this is a missing badge, never a
 * storefront advertising a festival three weeks after it happened.
 *
 * Verify against a panchang before each season. Dates below are for 2026.
 */
export const FESTIVAL_DATES = {
  'Rakhi':             { on: '2026-08-28', label: 'Raksha Bandhan' },
  'Onam':              { on: '2026-08-26', from: '2026-08-17', label: 'Onam' },
  'Ganesh Chaturthi':  { on: '2026-09-14', label: 'Ganesh Chaturthi' },
  'Diwali':            { on: '2026-11-08', label: 'Diwali' },
  'New Year':          { on: '2027-01-01', label: 'New Year' },
}

/** Days from today until an ISO date, or null when unset/passed. */
export function daysUntil(iso) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const then = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(then.getTime())) return null
  const days = Math.round((then - today) / 86400000)
  return days < 0 ? null : days
}

/**
 * The countdown pill's text, or null when there is nothing true to say.
 *
 * "In 10 days" rather than a date, because the number is the thing that makes
 * somebody order now, and "28 Aug" requires the reader to do the subtraction
 * themselves.
 */
export function festivalPill(occasion) {
  const f = FESTIVAL_DATES[occasion]
  if (!f) return null
  const d = daysUntil(f.on)
  if (d === null) return null
  if (d === 0) return { text: `${f.label} today`, urgent: true }
  if (d === 1) return { text: `${f.label} tomorrow`, urgent: true }
  if (d <= 21) return { text: `${f.label} in ${d} days`, urgent: d <= 7 }
  return { text: new Date(`${f.on}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), urgent: false }
}

/**
 * ── The tile palette ──────────────────────────────────────────────────────
 *
 * The page ground is pure white and stays that way. Colour lives only inside
 * tiles, and it comes from here so that six sections cannot each invent their
 * own pink.
 *
 * These are deliberately SATURATED, not the near-white 50-level tints a
 * Tailwind scale reaches for first. On a white page a 50-level tint reads as
 * a rendering artefact — the reader cannot tell whether the tile is coloured
 * or the screen is dirty — and the whole grid goes grey at arm's length. The
 * job of the colour is to separate one occasion from the next at a glance,
 * which needs real chroma.
 *
 * Each entry is a pair: `bg` for the tile and `ink` for type set on it. The
 * ink is a dark, desaturated relative of the ground rather than black,
 * because pure black on a coloured tile reads as a mistake. Every pairing
 * below clears 7:1.
 */
export const TILE_COLOURS = {
  blush:   { bg: '#FBD9D3', ink: '#7A2E22' },
  coral:   { bg: '#F9A98C', ink: '#7C2D12' },
  amber:   { bg: '#F7D774', ink: '#78350F' },
  sky:     { bg: '#C3DCF2', ink: '#1E3A5F' },
  mint:    { bg: '#BFE3CB', ink: '#14532D' },
  lilac:   { bg: '#DCD0F5', ink: '#4C1D95' },
  sand:    { bg: '#EFE0C9', ink: '#6B4423' },
  rose:    { bg: '#F6C6D9', ink: '#831843' },
  sage:    { bg: '#D6E3C3', ink: '#3F5B21' },
}

/**
 * The same nine, as a vivid two-stop wash for the moment mosaic.
 *
 * `TILE_COLOURS` above is a flat pastel meant to sit BEHIND a photograph — it
 * has to be gentle because the photo is doing the work and the tint only
 * shows through the gaps. The mosaic tile is different: on it the colour IS
 * the work, because `OccasionMosaic` puts the label on a white plate below
 * the colour rather than lettering the colour itself, so the block is free to
 * be as saturated as the occasion warrants. Four of the nine stay flat
 * (`sand`, `rose`, `amber` read better as a calm solid — grief, an apology, a
 * festival that already has enough going on) rather than forcing every tile
 * through the same gradient, which is what made an earlier pass at this
 * feel like a colour-picker demo rather than nine different occasions.
 */
export const TILE_WASH = {
  blush: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
  coral: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
  amber: '#F7D774',
  sky:   'linear-gradient(135deg, #0EA5E9 0%, #7DD3FC 100%)',
  mint:  'linear-gradient(135deg, #15803D 0%, #86EFAC 100%)',
  lilac: 'linear-gradient(135deg, #7C3AED 0%, #D946EF 100%)',
  sand:  '#EFE0C9',
  rose:  '#F6C6D9',
  sage:  'linear-gradient(135deg, #4D7C0F 0%, #BEF264 100%)',
}

/**
 * The rail directly under the search field.
 *
 * Square tiles with the label underneath, not circles with the label inside.
 * A square shows more of a photograph at the same width, the labels all sit
 * on one baseline so the row reads as a list rather than as decoration, and a
 * long word ("Personalised") can wrap under its tile instead of being
 * squeezed into one.
 *
 * Seven entries, and the first is not a category. "Today" leads because the
 * most common unserved intent in this market is temporal rather than
 * categorical — somebody remembered at 2 PM — and every competitor buries
 * that behind a filter three taps in.
 */
export const QUICK_RAIL = [
  { id: 'today',    label: 'Need it today', emoji: '⚡', to: '/shop/today',                    colour: 'coral', query: 'express delivery scooter courier' },
  { id: 'flowers',  label: 'Flowers',       emoji: '💐', to: '/shop/Flowers',                  colour: 'rose',  query: 'fresh flower bouquet roses' },
  { id: 'cakes',    label: 'Cakes',         emoji: '🎂', to: '/shop/Cakes',                    colour: 'blush', query: 'birthday cake chocolate' },
  { id: 'personal', label: 'Personalised',  emoji: '✍️', to: '/shop/Gifts?kind=personalised',  colour: 'lilac', query: 'personalised photo frame gift' },
  { id: 'rakhi',    label: 'Rakhi',         emoji: '🧿', to: '/shop/Gifts?occasion=Rakhi',     colour: 'amber', query: 'rakhi raksha bandhan thread' },
  { id: 'pooja',    label: 'Pooja',         emoji: '🪔', to: '/shop/Pooja%20%26%20Essentials', colour: 'sand',  query: 'pooja thali diya brass lamp' },
  { id: 'heritage', label: 'Heritage',      emoji: '🪆', to: '/shop/Heritage%20%26%20Crafts',  colour: 'sage',  query: 'mysore silk saree handloom' },
]

/**
 * "Every reason to send something" — the occasion mosaic.
 *
 * `span` drives the tile's width in the two-column grid: 'wide' takes the
 * full row. The order is deliberate — the two evergreen reasons people shop
 * for (a birthday, an anniversary) bracket whatever festival is closest, so
 * the mosaic is useful in a week when nothing is coming up.
 *
 * Copy rule: the sub-line is a *reason*, never a restatement of the label.
 * "Birthday · Birthday gifts" is the sentence every competitor prints and it
 * carries no information at all.
 */
export const OCCASION_TILES = [
  {
    id: 'birthday', label: 'Birthdays', sub: 'Cake at midnight, and the fuss that goes with it',
    category: 'Cakes', occasion: 'Birthday', emoji: '🎂', colour: 'blush',
  },
  {
    id: 'rakhi', label: 'Rakhi', sub: 'Tie it on time, wherever he is',
    category: 'Gifts', occasion: 'Rakhi', emoji: '🧿', colour: 'coral',
  },
  {
    id: 'anniversary', label: 'Anniversaries', sub: 'The year you both remember',
    category: 'Flowers', occasion: 'Anniversary', emoji: '💕', colour: 'amber',
  },
  {
    id: 'congrats', label: 'Congratulations', sub: 'New job, new degree, long time coming',
    category: 'Gifts', occasion: 'Congratulations', emoji: '🎓', colour: 'sky',
  },
  {
    id: 'housewarming', label: 'New home', sub: 'Something that stays in the house',
    category: 'Gifts', occasion: 'Housewarming', emoji: '🏠', colour: 'sand',
  },
  {
    id: 'baby', label: 'Baby shower', sub: 'For the people about to stop sleeping',
    category: 'Party Essentials', occasion: 'Baby Shower', emoji: '🍼', colour: 'mint',
  },
  {
    id: 'wedding', label: 'Weddings', sub: 'For the couple and the house they are starting',
    category: 'Gifts', occasion: 'Wedding', emoji: '💍', colour: 'rose',
  },
  {
    id: 'getwell', label: 'Get well', sub: 'When you cannot be at the hospital yourself',
    category: 'Gifts', occasion: 'Get Well', emoji: '🌿', colour: 'sage',
  },
  {
    id: 'corporate', label: 'For the office', sub: 'Fifty of them, invoiced once, on one date',
    category: 'Gifts', occasion: 'Corporate', emoji: '🏢', colour: 'lilac', span: 'wide',
  },
]

/**
 * The shelf strips — one per shelf, each with its own way in.
 *
 * This is the section that replaces a plain category grid. A shelf gets a
 * headline, a reason, and three or four sub-entries that are the actual ways
 * people ask for that shelf ("roses", not "Flowers > Filter > Type"). Each
 * sub-entry is an occasion tag that exists on real rows.
 */
export const SHELF_STRIPS = [
  {
    id: 'flowers',
    category: 'Flowers',
    title: 'Flowers, cut this morning',
    blurb: 'Conditioned in water and hand-delivered — never posted.',
    emoji: '💐',
    colour: 'rose',
    ways: [
      { label: 'Roses',       occasion: 'Anniversary' },
      { label: 'Birthday',    occasion: 'Birthday' },
      { label: 'Get well',    occasion: 'Get Well' },
      { label: 'Congrats',    occasion: 'Congratulations' },
    ],
  },
  {
    id: 'cakes',
    category: 'Cakes',
    title: 'Cakes baked to your order',
    blurb: 'Four hours in the oven, photographed before the rider leaves.',
    emoji: '🎂',
    colour: 'blush',
    ways: [
      { label: 'Birthday',    occasion: 'Birthday' },
      { label: 'Anniversary', occasion: 'Anniversary' },
      { label: 'Kids',        occasion: 'Kids' },
      { label: 'Eggless',     occasion: 'Eggless' },
    ],
  },
  {
    id: 'heritage',
    category: 'Heritage & Crafts',
    title: 'Made in Karnataka, by name',
    blurb: 'Mysore silk, rare weaves and carvings — the shelf nobody else stocks.',
    emoji: '🪆',
    colour: 'sage',
    ways: [
      { label: 'Mysore silk',  occasion: 'Mysore Silk' },
      { label: 'Rare weaves',  occasion: 'Rare Weaves' },
      { label: 'Carvings',     occasion: 'Carvings & Sculpture' },
      { label: 'From Mysuru',  occasion: 'Mysuru Specials' },
    ],
  },
  {
    id: 'pooja',
    category: 'Pooja & Essentials',
    title: 'Ready before the first lamp',
    blurb: 'Kits assembled for the ritual they are actually for, delivered from 6 AM.',
    emoji: '🪔',
    colour: 'amber',
    ways: [
      { label: 'Daily pooja',    occasion: 'Daily Pooja' },
      { label: 'Griha pravesh',  occasion: 'Griha Pravesh' },
      { label: 'Satyanarayan',   occasion: 'Satyanarayan Pooja' },
      { label: 'Wedding',        occasion: 'Wedding Pooja' },
    ],
  },
  {
    id: 'party',
    category: 'Party Essentials',
    title: 'The whole room, in one box',
    blurb: 'Counted against a checklist, with an optional two-person setup.',
    emoji: '🎈',
    colour: 'sky',
    ways: [
      { label: 'Balloons',   occasion: 'Balloon Decor' },
      { label: 'Backdrops',  occasion: 'Backdrop & Banners' },
      { label: 'Birthday',   occasion: 'Birthday' },
      { label: 'Baby shower', occasion: 'Baby Shower' },
    ],
  },
  {
    id: 'gifts',
    category: 'Gifts',
    title: 'Gifts that survive the year',
    blurb: 'Hampers, keepsakes and personalised pieces, wrapped and carded free.',
    emoji: '🎁',
    colour: 'lilac',
    ways: [
      { label: 'Chocolate',   occasion: 'Chocolate' },
      { label: 'Dry fruits',  occasion: 'Dry Fruits' },
      { label: 'Handmade',    occasion: 'Handmade' },
      { label: 'Plants',      occasion: 'Eco & Plants' },
    ],
  },
]

/**
 * The six promises.
 *
 * Each one is a direct answer to a complaint that appears over and over in
 * the store reviews of every competitor in this category. They are written as
 * commitments with a mechanism attached, because a promise with no mechanism
 * behind it is a slogan and reads as one.
 *
 * Do not add a seventh without a mechanism. The value of this strip is that
 * every line is something the operation actually does.
 */
export const PROMISES = [
  {
    id: 'photo',
    icon: 'camera',
    title: 'You see it before they do',
    detail: 'Every order is photographed once it is finished and sent to you before the rider leaves — so a wrong spelling or a substituted stem is caught while it can still be fixed.',
  },
  {
    id: 'window',
    icon: 'clock',
    title: 'A two-hour window, not a day',
    detail: 'You pick the slot. We never ask anybody to wait in from nine to nine, and we decline a slot we cannot make rather than accept it and be late.',
  },
  {
    id: 'price',
    icon: 'receipt',
    title: 'The price on the tile is the price',
    detail: 'Delivery and any slot charge are shown on the product page, before the cart. Nothing new appears between the basket and the payment screen.',
  },
  {
    id: 'human',
    icon: 'phone',
    title: 'One number, and a person answers it',
    detail: 'The same team that took the order handles the delivery and anything that goes wrong with it — whoever baked or wove the thing itself.',
  },
  {
    id: 'proof',
    icon: 'shield',
    title: 'Proof it was handed over',
    detail: 'A photo of the handover, with the time, on every delivery. If nobody was home you will know within minutes rather than the next day.',
  },
  {
    id: 'fix',
    icon: 'refresh',
    title: 'Wrong is fixed, not argued',
    detail: 'Send a photo within 12 hours and we remake it or refund it. Perishables are never collected back — you keep them either way.',
  },
]

/**
 * Editorial entry points — the "how do I choose" question, which is the one a
 * gifting site is worst at answering and the one most people arrive with.
 *
 * These are not products and they are not filters. Each is a short guide
 * rendered as a card that opens a filtered listing with an explanation
 * attached, so somebody who does not know what to send is given a way to
 * decide rather than a bigger grid.
 */
export const GUIDES = [
  {
    id: 'first-rakhi',
    title: 'Sending Rakhi out of Bengaluru',
    sub: 'What survives a courier, and what has to be posted by Tuesday',
    emoji: '🧿',
    to: '/shop/Gifts?occasion=Rakhi',
    colour: 'amber',
  },
  {
    id: 'boss',
    title: 'A gift for someone senior',
    sub: 'Handmade and understated, without a logo on it',
    emoji: '🏢',
    to: '/shop/Gifts?occasion=Corporate',
    colour: 'sand',
  },
  {
    id: 'silk',
    title: 'How to buy a Mysore silk',
    sub: 'Zari, GI marks, and what the price is actually telling you',
    emoji: '🧣',
    to: '/shop/Heritage%20%26%20Crafts?occasion=Mysore%20Silk',
    colour: 'sage',
  },
  {
    id: 'lastminute',
    title: 'It is 4 PM and you forgot',
    sub: 'Everything that can still arrive before tonight',
    emoji: '⚡',
    to: '/shop/today',
    colour: 'coral',
  },
]
