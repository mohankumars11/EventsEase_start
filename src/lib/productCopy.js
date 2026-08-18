/**
 * What a product page actually says about the thing it is selling.
 *
 * ── The problem this exists to solve ─────────────────────────────────────
 * Every gifting site in this market prints one description block and one
 * delivery block, and the delivery block is the same paragraph on a bouquet,
 * a chocolate hamper and a silk saree. It is the single most common complaint
 * in the store reviews of all of them: the page said "delivered in 2-4 days,
 * courier partner" and the flowers arrived on day four, dead, because nobody
 * had written a different sentence for a perishable.
 *
 * A rose bouquet, a baked cake, an engraved lamp and a handloom weave are
 * four different physical objects with four different failure modes, four
 * different care instructions, and four genuinely different delivery
 * promises. So the copy is generated per product, from what the row actually
 * says about itself, and it is allowed to differ INSIDE a shelf — a
 * personalised photo lamp filed under Gifts must not inherit the chocolate
 * hamper's "store below 24°C".
 *
 * ── Why this is derived and not four more columns ────────────────────────
 * Migrations here are applied by hand, and a screen that needs an unapplied
 * column is a blank screen. Everything below is computed from columns that
 * already exist — `category`, `name`, `specs`, `highlights`, `prep_hours`,
 * `same_day` — so the shop renders complete copy for every row today, with no
 * SQL to paste. Where a human HAS written something better, the written value
 * wins: `description` overrides the generated prose, `specs` rows join the
 * generated detail table, `highlights` lead it.
 *
 * The generated text is therefore a floor, never a ceiling.
 */

/**
 * The archetypes.
 *
 * A "kind" is not a shelf. It is the answer to "what does this thing need
 * from the person holding it, and what can go wrong between here and their
 * door" — which is the only question the care and delivery blocks are
 * answering. Two products on one shelf can be different kinds, and two
 * products on different shelves can be the same kind.
 */
export const KINDS = {
  BLOOM:        'bloom',        // cut flowers — the most perishable thing sold here
  BAKED:        'baked',        // made-to-order cake, hours old at handover
  CONFECTION:   'confection',   // sealed edible — chocolate, dry fruit, mithai
  PLANT:        'plant',        // living, and alive for years if treated right
  PERSONALISED: 'personalised', // carries a name or a photo; cannot be resold
  CRAFT:        'craft',        // handmade, one-of-one, sourced from an artisan
  DECOR:        'decor',        // party consumables — balloons, banners, props
  RITUAL:       'ritual',       // pooja samagri, idols, lamps
  KEEPSAKE:     'keepsake',     // the durable gift — mugs, frames, soft toys
}

// Matched against the product name in this order. First hit wins, so the
// list is ordered most-specific first: "personalised photo mug" must not be
// caught by a mug rule further down.
const NAME_RULES = [
  [KINDS.PERSONALISED, /personalis|personaliz|custom(?!ary)|engrav|monogram|photo\s|name\s+(mug|lamp|frame|cushion)|caricature|portrait/i],
  [KINDS.PLANT,        /plant|bonsai|succulent|bamboo|terrarium|sapling|jade|snake\s+plant|money\s+tree/i],
  [KINDS.BLOOM,        /bouquet|roses?|lilies|lily|orchid|carnation|gerbera|tulip|sunflower|floral\s+arrangement|flower\s+box/i],
  [KINDS.BAKED,        /cake|pastry|cup\s?cake|brownie|cheesecake|gateau|tea\s?cake/i],
  [KINDS.CONFECTION,   /chocolate|truffle|praline|dry\s?fruit|almond|cashew|mithai|sweets?|laddu|barfi|cookie|biscuit|gourmet|hamper|snack|coffee|tea\s+(box|tin|caddy)/i],
  [KINDS.CRAFT,        /silk|saree|handloom|weave|khadi|rosewood|sandalwood|inlay|carving|channapatna|bidri|gesso|kalamkari|ikat|handcraft|artisan/i],
  [KINDS.RITUAL,       /pooja|puja|diya|idol|samagri|havan|thali|kalash|agarbatti|incense|kumkum|rangoli|toran/i],
  [KINDS.DECOR,        /balloon|banner|bunting|streamer|confetti|backdrop|garland\s+(arch|kit)|party\s+(kit|pack|prop)|cake\s+topper|candle\s+set/i],
]

// The shelf's answer, used only when the name says nothing useful.
const CATEGORY_DEFAULTS = {
  'Flowers':            KINDS.BLOOM,
  'Cakes':              KINDS.BAKED,
  'Party Essentials':   KINDS.DECOR,
  'Pooja & Essentials': KINDS.RITUAL,
  'Heritage & Crafts':  KINDS.CRAFT,
  'Gifts':              KINDS.KEEPSAKE,
  'Hampers':            KINDS.CONFECTION,
}

/** Which archetype a product belongs to. Name first, shelf as the fallback. */
export function kindFor(product) {
  const name = `${product?.name ?? ''} ${product?.subtitle ?? ''}`
  for (const [kind, re] of NAME_RULES) if (re.test(name)) return kind
  return CATEGORY_DEFAULTS[product?.category] ?? KINDS.KEEPSAKE
}

/**
 * Per-kind copy.
 *
 * `lede`      one sentence, used only when the row has no description of its
 *             own. Written as a promise about the object, not as adjectives.
 * `details`   the spec rows every product of this kind should state even when
 *             nobody filled the specs column in.
 * `care`      what the recipient has to do. This is the block that is worth
 *             the most and that no competitor writes per-product.
 * `delivery`  how this specific thing travels, and what we do when it cannot.
 * `window`    the honest lead time, in the words the page prints on the slot.
 * `guard`     the one thing we will NOT pretend about. Printed in its own
 *             tone on the page — the reviews say people forgive a limitation
 *             they were told about and never forgive one they discovered.
 */
const COPY = {
  [KINDS.BLOOM]: {
    lede: name => `${name} — cut the morning it travels, conditioned in water, and handed over by a Sambramo rider rather than posted.`,
    details: [
      ['Arrives', 'Hand-tied, wrapped, and in water for the journey'],
      ['Vase life', '4 to 6 days with a daily water change'],
      ['Included', 'Care card and a handwritten message card, free'],
    ],
    care: [
      'Cut 1 cm off each stem at an angle before the first arrangement, and again every second day.',
      'Change the water daily. Flowers die of bacteria far more often than of thirst.',
      'Keep away from direct sun, a running fan, and the fruit bowl — ripening fruit gives off ethylene and will age a bouquet overnight.',
      'Remove any leaf that would sit below the waterline.',
    ],
    delivery: [
      'Hand-delivered by our own rider inside Bengaluru. Flowers are never handed to a courier.',
      'You choose a two-hour window at checkout; we do not deliver flowers "some time today".',
      'Seasonal blooms vary by the day. If a stem is not up to standard on the morning of your delivery we substitute it with one of equal or higher value, and we send you a photo of the finished bouquet before it leaves — so you approve the change rather than discover it.',
      'Nobody home? The rider waits ten minutes and calls you. If you ask us to, we leave it with a neighbour or reception and photograph the handover.',
    ],
    window: 'Same day if ordered before 6 PM',
    guard: 'Flowers are perishable, so they are not returnable — but if what arrives does not match the photo we sent, tell us within 12 hours with a picture and we replace it or refund it in full.',
  },

  [KINDS.BAKED]: {
    lede: name => `${name} — baked to order by a partner kitchen on the morning of your delivery, never pulled off a shelf.`,
    details: [
      ['Made', 'Fresh to order, not frozen or pre-stocked'],
      ['Included', 'Candles, a serving knife, and a message card'],
      ['Serves', 'A 500 g cake cuts 4 to 6 slices; 1 kg cuts 8 to 12'],
    ],
    care: [
      'Refrigerate on arrival if it will not be cut within two hours. This is a fresh cream cake, not a shelf-stable one.',
      'Take it out 15 to 20 minutes before cutting — cream that is fridge-cold hides most of the flavour.',
      'Best eaten the same day, and safe for 24 hours refrigerated.',
      'Cut with a warm, dry knife, wiping the blade between slices.',
    ],
    delivery: [
      'Baked in the four hours before it reaches you and carried in an insulated box.',
      'Choose a two-hour window at checkout. Midnight delivery is available in Bengaluru for an extra charge, shown before you pay.',
      'The cake is photographed once it is finished and the photo is sent to you before the rider leaves. The spelling on the message is checked against your order at that point — which is while a mistake can still be fixed.',
      'Cream softens above 30°C. On a hot afternoon we will call to suggest an earlier slot rather than deliver a cake that has slumped.',
    ],
    window: 'Same day if ordered before 4 PM · 4-hour bake time',
    guard: 'We do not send out a cake we would not eat. If it arrives damaged, send a photo within 12 hours and we remake it or refund it — no collection, no argument.',
  },

  [KINDS.CONFECTION]: {
    lede: name => `${name} — sealed at the maker, checked by us before it is boxed, and packed to survive the trip intact.`,
    details: [
      ['Packaging', 'Sealed at source; the outer box is gift-ready with no price on it'],
      ['Shelf life', 'Printed on each item — never less than 30 days at handover'],
      ['Allergens', 'Contains milk solids; may contain nut, soya and wheat traces'],
    ],
    care: [
      'Store in a cool, dry place below 24°C, out of direct sunlight.',
      'Do not refrigerate chocolate unless your room is above 28°C — condensation on the surface causes the pale bloom people mistake for spoilage.',
      'Once opened, keep it airtight and finish within a week.',
    ],
    delivery: [
      'Delivered by our rider inside Bengaluru, usually the same day.',
      'Every box is opened and checked against the listing before it is sealed for you. Nothing goes out on the strength of a supplier packing slip alone.',
      'The invoice is emailed to you and never placed in the box — a gift should not arrive with its price attached.',
      'Chocolate travels in an insulated sleeve between March and June, at no extra charge.',
    ],
    window: 'Same day if ordered before 6 PM',
    guard: 'Sealed food cannot be returned once opened. If a seal is broken on arrival, photograph it before opening anything else and we replace the whole box.',
  },

  [KINDS.PLANT]: {
    lede: name => `${name} — a living plant, potted and established before it is sold, not a cutting pushed into soil the week you ordered it.`,
    details: [
      ['Light', 'Bright and indirect — a metre back from a window, not on the sill'],
      ['Water', 'When the top 2 cm of soil is dry to the touch'],
      ['Planter', 'Included, with a drainage hole and a matching saucer'],
    ],
    care: [
      'Water when the topsoil is dry, not on a schedule. More houseplants are killed by kindness than by neglect.',
      'Turn the pot a quarter turn each week so it grows evenly instead of leaning at the light.',
      'Wipe the leaves with a damp cloth once a month — Bengaluru dust blocks more light than people expect.',
      'A few leaves may yellow and drop in the first fortnight. That is the plant adjusting to your room, not dying.',
    ],
    delivery: [
      'Carried upright and secured. The soil is watered down before dispatch so it does not spill in transit.',
      'Delivered by our own rider — a plant on its side in a courier van arrives as a pot of loose soil.',
      'Height and shape vary between individual plants, so yours will not be pixel-identical to the photo. We would rather say that than send you a picture you can hold it against and feel cheated by.',
    ],
    window: 'Next day · plants are picked from the nursery the morning they travel',
    guard: 'Thirty-day replacement. If it does not survive its first month with you despite the care card, send a photo and we replace it once, free.',
  },

  [KINDS.PERSONALISED]: {
    lede: name => `${name} — printed, engraved or assembled with your details after you order it, which is what makes it worth giving and why it takes a day longer.`,
    details: [
      ['You provide', 'The name, photo or message at checkout — nothing is guessed'],
      ['Proof', 'A digital preview is sent for your approval before anything is printed'],
      ['Finish', 'Fade-resistant print, rated for years of normal indoor use'],
    ],
    care: [
      'Wipe the printed area with a soft dry cloth. Never an abrasive pad or a solvent cleaner.',
      'Printed drinkware is hand-wash only. A dishwasher cycle will lift the print inside a month.',
      'Keep photo prints out of direct sunlight — UV fades any ink eventually, and a window seat does it in a year.',
    ],
    delivery: [
      'Add 24 hours for personalisation. That time starts when you approve the preview, not when you order.',
      'The preview reaches you by WhatsApp and email within four working hours. Nothing is printed until you say yes.',
      'Upload a photo at the largest size you have. If it is too small to print well we will tell you and offer to swap it, rather than printing something blurry and sending it anyway.',
    ],
    window: 'Delivered in 2 to 3 days, from your preview approval',
    guard: 'A personalised item carries somebody’s name and cannot be resold, so it is not returnable for a change of mind. It is fully replaceable if we get the spelling, the photo or the finish wrong — and the preview step exists so that almost never happens.',
  },

  [KINDS.CRAFT]: {
    lede: name => `${name} — made by hand by a named maker in Karnataka, bought at their price and sold at ours, with the difference stated rather than hidden.`,
    details: [
      ['Made by', 'A registered artisan or weaver cluster in Karnataka'],
      ['Character', 'Handmade, so no two pieces are identical'],
      ['Included', 'The maker’s note and, where the craft has one, its authenticity mark'],
    ],
    care: [
      'Silk and handloom: dry clean for the first wash, then a gentle cold hand wash if the label allows it.',
      'Store folded in muslin or cotton, never in plastic — trapped humidity is what marks a silk permanently.',
      'Refold along a different line every few months so the creases do not become cuts.',
      'Wood and stone want a dry cloth and nothing else. Oil and polish will dull a traditional finish.',
    ],
    delivery: [
      'Sourced from the maker after you order. Nothing on this shelf sits in a warehouse, which is why it takes 3 to 6 days rather than a day.',
      'Slubs, small irregularities and slight colour variation between the photo and your piece are the marks of a hand process, not defects — and we will not relabel them as flaws to make a sale easier.',
      'Packed rigid and insured for the full value in transit.',
      'The maker, the craft and its district are named on the card that travels with the piece.',
    ],
    window: 'Delivered in 3 to 6 days · sourced from the maker per order',
    guard: 'Seven-day return on craft pieces, unused and with the tags on, because this is the one shelf where a photograph genuinely cannot tell you everything.',
  },

  [KINDS.DECOR]: {
    lede: name => `${name} — everything the setup needs in one box, counted against a checklist so nobody is sent out to a shop at 8 PM for the one thing missing.`,
    details: [
      ['Supplied', 'Flat-packed and uninflated unless you book the setup'],
      ['Setup', 'Optional — our team arrives, installs, and takes the waste away'],
      ['Reusable', 'Foil pieces and backdrops keep for a second occasion'],
    ],
    care: [
      'Foil balloons need helium and hold it for 3 to 5 days; latex holds about 12 hours and is best inflated on the day.',
      'Keep everything away from open flame, halogen lamps and sharp edges.',
      'Latex balloons are a choking hazard for children under three, inflated or not. Clear away every burst piece immediately.',
      'Outdoors, anchor the arch. A light breeze moves more of it than you would think.',
    ],
    delivery: [
      'Delivered flat and uninflated by default, which is the only way it arrives intact.',
      'Book the setup slot at checkout and a two-person team arrives in your chosen window, installs, and leaves with all the packaging.',
      'A same-day setup needs four hours’ notice. We will decline a slot we cannot make rather than accept it and be late.',
      'Every kit is counted against its own checklist before it leaves, and the count is printed on the packing card so you can check it in a minute.',
    ],
    window: 'Same day if ordered before 2 PM · setup needs 4 hours notice',
    guard: 'Missing a piece? Tell us the same day and we send it by rider before your event — not as a refund afterwards, which is no use to anybody mid-party.',
  },

  [KINDS.RITUAL]: {
    lede: name => `${name} — assembled against the ritual it is actually for, checked by someone who knows the order the items are used in.`,
    details: [
      ['Assembled for', 'The specific ritual, not a generic pooja box'],
      ['Included', 'A step card listing each item and when it is used'],
      ['Sourcing', 'Fresh items picked the morning of delivery'],
    ],
    care: [
      'Keep samagri sealed and dry until the morning it is used. Karnataka humidity clumps loose powders quickly.',
      'Store ghee, oil and camphor separately from the dry items and away from heat.',
      'Fresh flowers, leaves and fruit in the kit are for that day only.',
      'Metal idols and lamps: wipe dry after each use — long contact with water marks brass.',
    ],
    delivery: [
      'Delivered before your muhurat window, not merely on the date. Tell us the time at checkout and we work backwards from it.',
      'Fresh components — flowers, leaves, fruit, coconut — are picked the same morning and travel separately from the dry goods.',
      'Early slots from 6 AM are available, because most rituals are not scheduled around a courier’s convenience.',
      'Pandit booking is a separate service and is not included here. We will arrange one if you ask when ordering.',
    ],
    window: 'Same day from 6 AM · order the evening before for a dawn muhurat',
    guard: 'If a fresh item cannot be sourced to standard on the morning, we call you before dispatch rather than substituting something inappropriate into a ritual kit.',
  },

  [KINDS.KEEPSAKE]: {
    lede: name => `${name} — chosen to still be in use a year from now, which rules out most of what this category usually sells.`,
    details: [
      ['Packaging', 'Gift-ready box, with no price anywhere on it'],
      ['Included', 'A handwritten message card, free'],
      ['Checked', 'Piece by piece, before it is boxed'],
    ],
    care: [
      'Dust with a dry, soft cloth. A damp cloth marks most finishes.',
      'Keep out of prolonged direct sunlight, which fades fabric and dulls a lacquer.',
      'Fabric items: spot-clean only unless the label says otherwise.',
    ],
    delivery: [
      'Delivered by our rider inside Bengaluru, usually the same day.',
      'Opened and checked against the listing before it is sealed for you.',
      'The invoice is emailed, never boxed.',
      'Gift wrap and a handwritten card are included at no charge, and the card is written by a person rather than printed.',
    ],
    window: 'Same day if ordered before 6 PM',
    guard: 'Seven-day return if it is unused and in its box. We collect it ourselves; you are not asked to find a courier.',
  },
}

/**
 * The product code shown on the page.
 *
 * People quote this to support, screenshot it, and read it out on the phone,
 * so it has to be short, stable, and unambiguous when spoken. Derived from
 * the row's own UUID rather than stored, so it cannot drift from the row it
 * names.
 */
export function skuFor(product) {
  const kind = kindFor(product).slice(0, 3).toUpperCase()
  const tail = String(product?.id ?? '').replace(/-/g, '').slice(0, 6).toUpperCase()
  return `SMB-${kind}-${tail || '000000'}`
}

/** Title-cased kind, for a badge. */
export const KIND_LABEL = {
  [KINDS.BLOOM]:        'Fresh flowers',
  [KINDS.BAKED]:        'Baked to order',
  [KINDS.CONFECTION]:   'Gourmet',
  [KINDS.PLANT]:        'Living plant',
  [KINDS.PERSONALISED]: 'Personalised',
  [KINDS.CRAFT]:        'Handmade in Karnataka',
  [KINDS.DECOR]:        'Party setup',
  [KINDS.RITUAL]:       'Ritual kit',
  [KINDS.KEEPSAKE]:     'Keepsake',
}

/**
 * Everything the product page needs to print, for one product.
 *
 * Written values always beat generated ones. `description` on the row wins
 * outright; `specs` lead the detail table and the kind's standing rows fill
 * in behind them, matched on the label so a hand-written "Vase life" is never
 * doubled by a generated one.
 */
export function productCopy(product) {
  if (!product) return null
  const kind = kindFor(product)
  const c = COPY[kind] ?? COPY[KINDS.KEEPSAKE]

  const written = (product.description ?? '').trim()
  const description = written || c.lede(product.name ?? 'This piece')

  // The detail table, in the order a reader wants it: the measured specs
  // somebody typed for this exact product, then the kind's standing rows for
  // anything still unstated.
  const rows = []
  const seen = new Set()
  const push = (label, value) => {
    const key = String(label).trim().toLowerCase()
    if (!value || seen.has(key)) return
    seen.add(key)
    rows.push({ label: String(label).trim(), value: String(value).trim() })
  }

  for (const [label, value] of Object.entries(product.specs ?? {})) push(label, value)
  for (const [label, value] of c.details) push(label, value)

  const highlights = Array.isArray(product.highlights) ? product.highlights.filter(Boolean) : []

  // Prep time is a per-row fact and it beats the archetype's standing line
  // whenever it has been set — a 48-hour tiered cake must not print the
  // 4-hour bake window every other cake gets.
  const prep = Number(product.prep_hours)
  const window = Number.isFinite(prep) && prep > 0
    ? (prep <= 24
        ? `Ready in about ${prep} hour${prep === 1 ? '' : 's'} · ${product.same_day === false ? 'from tomorrow' : 'same day possible'}`
        : `Made over ${Math.round(prep / 24)} day${prep >= 48 ? 's' : ''} — order ahead`)
    : c.window

  return {
    kind,
    kindLabel: KIND_LABEL[kind],
    sku: skuFor(product),
    description,
    highlights,
    details: rows,
    instructions: c.care,
    delivery: c.delivery,
    window,
    guard: c.guard,
  }
}

export default productCopy
