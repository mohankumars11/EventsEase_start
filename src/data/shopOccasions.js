// Occasion taxonomy for every shop category except Cakes.
//
// Cakes proved the point: `products.occasion` is one free-text tag, and once a
// category carries more than a dozen of them, ShopCategory's flat row of chips
// stops being navigation and becomes a wall. Grouping them by the reason
// someone is shopping turns 16 chips into five short rows they can read.
//
// Cakes keep their own file (src/data/cakeOccasions.js) because 51 tags across
// eight life stages is a different problem from 12 tags across four groups,
// and merging the two would make both harder to edit. `groupsForCategory`
// below is the one entry point either way.
//
// Every `id` MUST match a live `products.occasion` value exactly — these are
// filter keys and deep-link params. Tags in the database that aren't listed
// here are not lost: they collect in a trailing "Everything else" group, so a
// migration can add one without a code change.

import { buildOccasionGroups as buildCakeGroups } from './cakeOccasions'

const TAXONOMIES = {
  'Party Essentials': [
    {
      id: 'celebrations',
      label: 'What are we decorating for?',
      blurb: 'Pick the occasion and we match the theme',
      occasions: [
        { id: 'Birthday',            label: 'Birthday',        emoji: '🎂' },
        { id: 'Baby Shower',         label: 'Baby shower',     emoji: '🍼' },
        { id: 'Anniversary',         label: 'Anniversary',     emoji: '💕' },
        { id: 'Wedding & Engagement', label: 'Wedding & engagement', emoji: '💍' },
        { id: 'Housewarming',        label: 'Housewarming',    emoji: '🏠' },
        { id: 'Farewell',            label: 'Farewell',        emoji: '👋' },
        { id: 'Theme Party',         label: 'Theme party',     emoji: '🎭' },
      ],
    },
    {
      // Not an occasion — but this is genuinely how decor gets shopped once
      // the occasion is settled: "I have the cake, I need the wall."
      id: 'kind',
      label: 'Or shop by what you need',
      blurb: 'Balloons, a backdrop, or the table',
      occasions: [
        { id: 'Balloon Decor',       label: 'Balloons',        emoji: '🎈' },
        { id: 'Backdrop & Banners',  label: 'Backdrops & banners', emoji: '🖼️' },
        { id: 'Tableware',           label: 'Tableware',       emoji: '🍽️' },
      ],
    },
    {
      id: 'festivals',
      label: 'Festivals',
      blurb: 'Decor for the calendar',
      occasions: [
        { id: 'Independence Day',    label: 'Independence Day', emoji: '🇮🇳' },
      ],
    },
  ],

  'Pooja & Essentials': [
    {
      id: 'everyday',
      label: 'Everyday and the home',
      blurb: 'The daily lamp, and a new house',
      occasions: [
        { id: 'Daily Pooja',         label: 'Daily pooja',     emoji: '🪔' },
        { id: 'Griha Pravesh',       label: 'Griha pravesh',   emoji: '🏠' },
      ],
    },
    {
      id: 'ceremonies',
      label: 'Ceremonies',
      blurb: 'Where a purohit and a full samagri list are involved',
      occasions: [
        { id: 'Satyanarayan Pooja',  label: 'Satyanarayan pooja', emoji: '🙏' },
        { id: 'Wedding Pooja',       label: 'Wedding pooja',   emoji: '💍' },
        { id: 'Small Functions',     label: 'Small functions', emoji: '🕉️' },
      ],
    },
    {
      id: 'festivals',
      label: 'Festivals',
      blurb: 'Everything ready before the first diya is lit',
      occasions: [
        { id: 'Diwali',              label: 'Diwali',          emoji: '🪔' },
        { id: 'Navratri',            label: 'Navratri',        emoji: '🪘' },
        { id: 'Ganesh Chaturthi',    label: 'Ganesh Chaturthi', emoji: '🐘' },
        { id: 'Janmashtami',         label: 'Janmashtami',     emoji: '🦚' },
      ],
    },
    {
      id: 'regional',
      label: 'Regional traditions',
      blurb: 'Rites that vary by where you are from',
      occasions: [
        { id: 'Regional & Other',    label: 'Regional & other', emoji: '🌏' },
      ],
    },
  ],

  // Gifts absorbs Hampers (migration 031), so this taxonomy covers both.
  'Gifts': [
    {
      id: 'people',
      label: 'Who is it for?',
      blurb: 'The occasions people actually buy gifts for',
      occasions: [
        { id: 'Birthday',            label: 'Birthday',        emoji: '🎂' },
        { id: 'Anniversary',         label: 'Anniversary',     emoji: '💕' },
        { id: 'Valentine',           label: "Valentine's",     emoji: '💘' },
        { id: 'Rakhi',               label: 'Rakhi',           emoji: '🧿' },
        { id: 'Wedding',             label: 'Wedding',         emoji: '💍' },
        { id: 'Baby Shower',         label: 'Baby shower',     emoji: '🍼' },
      ],
    },
    {
      id: 'milestones',
      label: 'Milestones and moves',
      blurb: 'New homes, new jobs, last days',
      occasions: [
        { id: 'Housewarming',        label: 'Housewarming',    emoji: '🏠' },
        { id: 'Congratulations',     label: 'Congratulations', emoji: '🎓' },
        { id: 'Farewell',            label: 'Farewell',        emoji: '👋' },
        { id: 'Corporate',           label: 'Corporate',       emoji: '🏢' },
      ],
    },
    {
      id: 'festivals',
      label: 'Festivals',
      blurb: 'Hampers that travel well',
      occasions: [
        { id: 'Diwali',              label: 'Diwali',          emoji: '🪔' },
        { id: 'New Year',            label: 'New Year',        emoji: '🎆' },
        { id: 'Independence Day',    label: 'Independence Day', emoji: '🇮🇳' },
      ],
    },
    {
      id: 'thinking',
      label: 'Thinking of you',
      blurb: 'No occasion needed',
      occasions: [
        { id: 'Get Well',            label: 'Get well',        emoji: '🤒' },
      ],
    },
    {
      // The two tags Hampers brought with it describe contents rather than an
      // occasion. They stay, because "I want a dry fruit box" is a real way
      // people shop — they just don't belong beside "Wedding".
      //
      // Handmade and Eco & Plants (migration 047) join them for the same
      // reason: all four answer "what IS it?" rather than "what is it for?",
      // and someone who wants a plant wants a plant whichever festival is
      // next. Listing them beside Diwali would have buried them.
      id: 'contents',
      label: "Or by what's inside",
      blurb: 'When you already know what you want in the box',
      occasions: [
        { id: 'Handmade',            label: 'Indian handmade', emoji: '🪔' },
        { id: 'Eco & Plants',        label: 'Eco & plants',    emoji: '🪴' },
        { id: 'Chocolate',           label: 'Chocolate',       emoji: '🍫' },
        { id: 'Dry Fruits',          label: 'Dry fruits',      emoji: '🥜' },
      ],
    },
  ],

  // Migration 048. Grouped by CRAFT rather than by occasion, which is the one
  // place this file's own naming stops fitting: nobody buys a Patan Patola
  // because Diwali is coming, they buy it because it is a Patan Patola. So the
  // groups answer "what is it and who made it", and `label` asks that question
  // out loud rather than pretending it is an occasion.
  'Heritage & Crafts': [
    {
      id: 'silk',
      label: 'Mysore silk',
      blurb: 'GI-tagged crepe woven with pure gold zari — Mysore Reshme',
      occasions: [
        { id: 'Mysore Silk',           label: 'Mysore silk',      emoji: '🧣' },
      ],
    },
    {
      id: 'weaves',
      label: 'Rare weaves',
      blurb: 'Handlooms you will not find listed anywhere else',
      occasions: [
        { id: 'Rare Weaves',           label: 'Rare weaves',      emoji: '🪡' },
      ],
    },
    {
      id: 'carving',
      label: 'Carvings & sculpture',
      blurb: 'Stone, sandalwood, rosewood and cast metal',
      occasions: [
        { id: 'Carvings & Sculpture',  label: 'Carvings',         emoji: '🗿' },
      ],
    },
    {
      id: 'mysuru',
      label: 'From Mysuru',
      blurb: "The city's own list — paintings, sandalwood, inlay, lacquerware",
      occasions: [
        { id: 'Mysuru Specials',       label: 'Mysuru specials',  emoji: '🏛️' },
      ],
    },
    {
      // Not stock. Every row here is made for one buyer, and the price is a
      // floor rather than a price — which is why it is its own group instead of
      // being mixed in with pieces that ship this week.
      id: 'commission',
      label: 'Commission an artisan',
      blurb: 'Made to your measurements, your colours, your subject',
      occasions: [
        { id: 'Artisan Commissions',   label: 'Commissions',      emoji: '🪵' },
      ],
    },
  ],

  'Flowers': [
    {
      id: 'celebrations',
      label: 'Celebrations',
      blurb: 'Flowers that arrive smiling',
      occasions: [
        { id: 'Birthday',            label: 'Birthday',        emoji: '🎂' },
        { id: 'Anniversary',         label: 'Anniversary',     emoji: '💕' },
        { id: 'Wedding',             label: 'Wedding',         emoji: '💍' },
        { id: 'Congratulations',     label: 'Congratulations', emoji: '🎉' },
        { id: 'Baby Shower',         label: 'Baby shower',     emoji: '🍼' },
        { id: 'Housewarming',        label: 'Housewarming',    emoji: '🏠' },
      ],
    },
    {
      id: 'love',
      label: 'Love',
      blurb: 'The ones sent for one person',
      occasions: [
        { id: 'Valentine',           label: "Valentine's",     emoji: '💘' },
      ],
    },
    {
      id: 'everyday',
      label: 'Everyday and faith',
      blurb: 'The daily garland and the festival table',
      occasions: [
        { id: 'Daily & Pooja',       label: 'Daily & pooja',   emoji: '🪔' },
        { id: 'Festive',             label: 'Festive',         emoji: '🎊' },
        { id: 'Independence Day',    label: 'Independence Day', emoji: '🇮🇳' },
      ],
    },
    {
      // Kept as its own group rather than mixed in with birthdays. Someone
      // ordering for a hospital room or a funeral should not have to scroll
      // past balloons to find it.
      id: 'difficult',
      label: 'Harder days',
      blurb: 'Sympathy, recovery, goodbyes',
      occasions: [
        { id: 'Sympathy',            label: 'Sympathy',        emoji: '🕊️' },
        { id: 'Get Well',            label: 'Get well',        emoji: '🤒' },
        { id: 'Farewell',            label: 'Farewell',        emoji: '👋' },
      ],
    },
  ],
}

export function hasOccasionTaxonomy(category) {
  return category === 'Cakes' || Boolean(TAXONOMIES[category])
}

/**
 * Groups to render for a category, restricted to occasions that actually have
 * products behind them, with unrecognised tags collected into a trailing
 * group.
 *
 * Both halves matter. An occasion chip with nothing behind it lands on "no
 * items tagged", which reads as a broken shop; a dropped tag hides real
 * products, which is worse.
 */
export function groupsForCategory(category, products) {
  if (category === 'Cakes') return buildCakeGroups(products)

  const taxonomy = TAXONOMIES[category]
  const counts = products.reduce((acc, p) => {
    if (p.occasion) acc[p.occasion] = (acc[p.occasion] ?? 0) + 1
    return acc
  }, {})

  if (!taxonomy) {
    // No curated taxonomy: one flat group, which is still better than nothing
    // and is exactly what this page did before.
    const all = Object.keys(counts).sort().map(id => ({ id, label: id, emoji: '✨', count: counts[id] }))
    return all.length ? [{ id: 'all', label: 'Shop by occasion', blurb: '', occasions: all }] : []
  }

  const known = new Set()
  const groups = taxonomy
    .map(group => ({
      ...group,
      occasions: group.occasions
        .filter(o => { known.add(o.id); return counts[o.id] > 0 })
        .map(o => ({ ...o, count: counts[o.id] })),
    }))
    .filter(group => group.occasions.length > 0)

  const orphans = Object.keys(counts)
    .filter(id => !known.has(id))
    .sort()
    .map(id => ({ id, label: id, emoji: '✨', count: counts[id] }))

  if (orphans.length) {
    groups.push({ id: 'other', label: 'Everything else', blurb: 'Newly added to the catalogue', occasions: orphans })
  }
  return groups
}

export function occasionMetaFor(category, occasionId) {
  const groups = TAXONOMIES[category] ?? []
  for (const g of groups) {
    const hit = g.occasions.find(o => o.id === occasionId)
    if (hit) return hit
  }
  return { id: occasionId, label: occasionId, emoji: '✨' }
}
