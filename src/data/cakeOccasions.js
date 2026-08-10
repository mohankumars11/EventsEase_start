// Every occasion a cake gets bought for, grouped the way a life actually
// runs rather than the way a product table lists strings.
//
// `products.occasion` is one free-text tag per row, and the cake catalogue
// now carries 50-odd distinct values. Rendered flat — which is what
// ShopCategory does for every other category — that is a wall of 50 chips
// with 'Annaprashan' sitting between 'Anniversary' and 'Baby Shower', and no
// customer scans it. Grouped by life stage, the same 50 values become seven
// short rows someone can actually read.
//
// The `id` of every occasion below MUST match a `products.occasion` value
// exactly — these are used as filter keys and in deep links
// (/shop/Cakes?occasion=Bride%20to%20Be). Occasions that exist in the
// database but not in this file are not lost: the cake shop appends them to
// an "Everything else" group, so a new tag added by a migration shows up
// without a code change.

export const CAKE_OCCASION_GROUPS = [
  {
    id: 'birthdays',
    label: 'Birthdays',
    blurb: 'From the first candle to the seventy-fifth',
    occasions: [
      { id: 'First Birthday',     label: 'First birthday',  emoji: '1️⃣' },
      { id: 'Half Birthday',      label: 'Half birthday',   emoji: '🌗' },
      { id: 'Birthday',           label: 'Birthday',        emoji: '🎂' },
      { id: 'Milestone Birthday', label: 'Milestone years', emoji: '🎊' },
      { id: 'Kids & Theme',       label: 'Kids & themes',   emoji: '🦄' },
      { id: 'Pet Birthday',       label: 'Pet birthday',    emoji: '🐾' },
    ],
  },
  {
    id: 'baby',
    label: 'Baby & first milestones',
    blurb: 'The firsts that only happen once',
    occasions: [
      { id: 'Gender Reveal',       label: 'Gender reveal',    emoji: '🎀' },
      { id: 'Baby Shower',         label: 'Baby shower',      emoji: '🍼' },
      { id: 'Naming Ceremony',     label: 'Naming ceremony',  emoji: '📜' },
      { id: 'Annaprashan',         label: 'Annaprashan',      emoji: '🍚' },
      { id: 'Mundan',              label: 'Mundan',           emoji: '✂️' },
      { id: 'First Day at School', label: 'First school day', emoji: '🎒' },
    ],
  },
  {
    id: 'wedding',
    label: 'The wedding journey',
    blurb: 'Roka to reception, and every year after',
    occasions: [
      { id: 'Roka',            label: 'Roka',          emoji: '🤝' },
      { id: 'Engagement',      label: 'Engagement',    emoji: '💍' },
      { id: 'Bride to Be',     label: 'Bride to be',   emoji: '👰' },
      { id: 'Groom to Be',     label: 'Groom to be',   emoji: '🤵' },
      { id: 'Haldi & Mehendi', label: 'Haldi & mehendi', emoji: '🌼' },
      { id: 'Sangeet',         label: 'Sangeet',       emoji: '🥁' },
      { id: 'Wedding',         label: 'Wedding',       emoji: '💒' },
      { id: 'Anniversary',     label: 'Anniversary',   emoji: '💕' },
    ],
  },
  {
    id: 'love',
    label: 'Love & the people you keep',
    blurb: 'For the ones who show up',
    occasions: [
      { id: 'Proposal',       label: 'Proposal',      emoji: '💐' },
      { id: 'Valentine',      label: "Valentine's",   emoji: '💘' },
      { id: "Mother's Day",   label: "Mother's Day",  emoji: '🌷' },
      { id: "Father's Day",   label: "Father's Day",  emoji: '👨' },
      { id: 'Rakhi',          label: 'Rakhi',         emoji: '🧿' },
      { id: 'Friendship Day', label: 'Friendship Day', emoji: '🫂' },
      { id: 'Teachers Day',   label: "Teachers' Day", emoji: '🍎' },
    ],
  },
  {
    id: 'milestones',
    label: 'Work, home & new chapters',
    blurb: 'Promotions, keys to a new door, last days',
    occasions: [
      { id: 'Congratulations', label: 'Congratulations', emoji: '🎓' },
      { id: 'Corporate',       label: 'Office & corporate', emoji: '🏢' },
      { id: 'Housewarming',    label: 'Housewarming',    emoji: '🏠' },
      { id: 'New Beginnings',  label: 'New beginnings',  emoji: '🔑' },
      { id: 'Retirement',      label: 'Retirement',      emoji: '🎣' },
      { id: 'Farewell',        label: 'Farewell',        emoji: '👋' },
    ],
  },
  {
    id: 'festivals',
    label: 'Festivals',
    blurb: 'The whole calendar, cake included',
    occasions: [
      { id: 'Diwali',            label: 'Diwali',        emoji: '🪔' },
      { id: 'Christmas',         label: 'Christmas',     emoji: '🎄' },
      { id: 'New Year',          label: 'New Year',      emoji: '🎆' },
      { id: 'Holi',              label: 'Holi',          emoji: '🎨' },
      { id: 'Eid',               label: 'Eid',           emoji: '🌙' },
      { id: 'Pongal & Onam',     label: 'Pongal & Onam', emoji: '🌾' },
      { id: 'Ganesh Chaturthi',  label: 'Ganesh Chaturthi', emoji: '🐘' },
      { id: 'Navratri',          label: 'Navratri',      emoji: '🪘' },
      { id: 'Independence Day',  label: 'Independence Day', emoji: '🇮🇳' },
    ],
  },
  {
    id: 'everyday',
    label: 'Everyday & the small things',
    blurb: 'Sorry, thank you, get well, no reason at all',
    occasions: [
      { id: 'Get Well Soon', label: 'Get well soon', emoji: '🤒' },
      { id: 'Sorry',         label: 'Sorry',         emoji: '🙇' },
      { id: 'Thank You',     label: 'Thank you',     emoji: '🙏' },
      { id: 'Just Because',  label: 'Just because',  emoji: '🎁' },
    ],
  },
  {
    id: 'dietary',
    label: 'Made a different way',
    blurb: 'Eggless, vegan, sugar-free, gluten-free',
    occasions: [
      { id: 'Eggless',     label: 'Eggless',     emoji: '🥚' },
      { id: 'Vegan',       label: 'Vegan',       emoji: '🌱' },
      { id: 'Sugar-Free',  label: 'Sugar-free',  emoji: '🩺' },
      { id: 'Gluten-Free', label: 'Gluten-free', emoji: '🌾' },
      { id: 'Photo Cake',  label: 'Photo cakes', emoji: '📸' },
    ],
  },
]

// Flat lookup: occasion id -> { label, emoji, group }
export const CAKE_OCCASION_INDEX = Object.fromEntries(
  CAKE_OCCASION_GROUPS.flatMap(group =>
    group.occasions.map(o => [o.id, { ...o, groupId: group.id, groupLabel: group.label }])
  )
)

export function occasionLabel(id) {
  return CAKE_OCCASION_INDEX[id]?.label ?? id
}

export function occasionEmoji(id) {
  return CAKE_OCCASION_INDEX[id]?.emoji ?? '🎂'
}

/**
 * The groups to render, restricted to occasions that actually have cakes in
 * them right now, with any unrecognised tag collected into a trailing group.
 *
 * Both halves matter. Showing an occasion with nothing behind it lands the
 * customer on "No items tagged …", which reads as a broken shop; dropping an
 * unrecognised tag hides real products, which is worse. Migration 029 and
 * this file were written together, but they will drift — a later migration
 * only has to add one new tag — and this is what absorbs that.
 */
export function buildOccasionGroups(products) {
  const counts = products.reduce((acc, p) => {
    if (p.occasion) acc[p.occasion] = (acc[p.occasion] ?? 0) + 1
    return acc
  }, {})

  const known = new Set()
  const groups = CAKE_OCCASION_GROUPS
    .map(group => ({
      ...group,
      occasions: group.occasions
        .filter(o => {
          known.add(o.id)
          return counts[o.id] > 0
        })
        .map(o => ({ ...o, count: counts[o.id] })),
    }))
    .filter(group => group.occasions.length > 0)

  const orphans = Object.keys(counts)
    .filter(id => !known.has(id))
    .sort()
    .map(id => ({ id, label: id, emoji: '🎂', count: counts[id] }))

  if (orphans.length) {
    groups.push({
      id: 'other',
      label: 'Everything else',
      blurb: 'Newly added to the catalogue',
      occasions: orphans,
    })
  }

  return groups
}
