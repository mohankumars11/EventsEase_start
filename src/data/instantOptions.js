/**
 * The price forks for INSTANT booking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEPARATE FROM data/serviceOptions.js, AND NOT BY ACCIDENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * That module is the PRE-BOOK catalogue — 894 lines of decor ladders,
 * cuisine menus and dish lists, written for somebody browsing with
 * weeks to decide. I overwrote it once while building this, which is
 * how the two came to need distinguishing in writing.
 *
 * This is the short list of forks that must be settled before an
 * INSTANT price can be quoted — a different question, asked under
 * different pressure, by somebody booking for Saturday. Merging them
 * would make the instant flow import a catalogue it shows none of.
 *
 * What you are actually choosing, per service.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "PHOTOGRAPHY" IS NOT A THING SOMEBODY BUYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The instant flow listed a service name and a price and nothing else.
 * Tapping Photography got you the word Photography. Two customers
 * pressing the same button wanted a candid team following a bride all
 * day and one person taking posed family photos for two hours — one
 * price, one dispatch, and a master arriving to an argument.
 *
 * Only decor and catering had real option sets. Everything else was
 * marked `discuss`, meaning: book it, and your master will phone you to
 * find out what you meant. That is the right answer for genuinely
 * open-ended work — a theme, a mehendi design — and the wrong one for
 * the thing that decides the PRICE. Deferring "candid or traditional"
 * is deferring a 60% swing in cost to a phone call after money changed
 * hands.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULE EVERY OPTION HERE PASSES
 * ══════════════════════════════════════════════════════════════════════
 *
 * An option earns its place only if it changes WHAT ARRIVES or WHAT IT
 * COSTS. Anything else is a question asked to look thorough, and this
 * flow is chosen by people in a hurry — every extra tap is a customer
 * who books elsewhere.
 *
 * So there is no "what colour theme" here (that is the master's call,
 * and CustomRequest already carries it) and no "how many hours" where a
 * duration already exists. What is here is the fork that a master would
 * otherwise have to ring up and ask before they could quote.
 *
 * ── `mult` is a multiplier on the line, not a new price ──────────────
 * The rate card in data/servicePricing.js stays the single source of
 * what a service costs at a given size. These move it, so a change to
 * the card still flows through every option instead of being overridden
 * by a number pasted here.
 *
 * ── One option is always the default ────────────────────────────────
 * `mult: 1` marks it. A flow where every choice costs extra reads as a
 * shakedown; a flow with a real middle option reads as a price list.
 */

export const SERVICE_OPTIONS = {
  photography: [
    {
      id: 'style',
      question: 'What kind of photos?',
      // Named the way a customer says it, not the way a studio prices it.
      choices: [
        { id: 'traditional', label: 'Posed & family',   scan: 'Group photos, portraits, the usual album',        mult: 1 },
        { id: 'candid',      label: 'Candid',           scan: 'Natural moments, people not looking at the lens', mult: 1.35 },
        { id: 'both',        label: 'Both',             scan: 'A second photographer for candid alongside',      mult: 1.7 },
      ],
    },
    {
      id: 'delivery',
      question: 'How do you want them?',
      choices: [
        { id: 'digital', label: 'Digital only',   scan: 'Edited photos, shared online',       mult: 1 },
        { id: 'album',   label: 'Printed album',  scan: 'A physical album as well',           mult: 1.22 },
      ],
    },
  ],

  videography: [
    {
      id: 'coverage',
      question: 'How much filming?',
      choices: [
        { id: 'highlights', label: 'Highlights reel', scan: 'A short edited film of the day',       mult: 1 },
        { id: 'full',       label: 'Full coverage',   scan: 'The whole event, plus a highlights cut', mult: 1.45 },
        { id: 'cinematic',  label: 'Cinematic',       scan: 'Two cameras, colour grade, music',      mult: 1.9 },
      ],
    },
    {
      id: 'drone',
      question: 'Drone shots?',
      choices: [
        { id: 'no',  label: 'No drone',  scan: 'Ground cameras only',                      mult: 1 },
        { id: 'yes', label: 'Add drone', scan: 'Aerial shots — needs an open venue',       mult: 1.3 },
      ],
    },
  ],

  cooks: [
    {
      id: 'cuisine',
      question: 'What should they cook?',
      // The single most argued-about thing in Indian catering, asked up
      // front instead of discovered on the day.
      choices: [
        { id: 'south',    label: 'South Indian',        scan: 'Rice, sambar, rasam, poriyal, payasam', mult: 1 },
        { id: 'north',    label: 'North Indian',        scan: 'Rotis, paneer, dal, pulao',             mult: 1.08 },
        { id: 'chettinad',label: 'Chettinad / spicy',   scan: 'Regional, properly spiced',             mult: 1.12 },
        { id: 'mixed',    label: 'A bit of both',       scan: 'North and South on one counter',        mult: 1.15 },
      ],
    },
    {
      id: 'diet',
      question: 'Veg or non-veg?',
      choices: [
        { id: 'veg',    label: 'Pure vegetarian', scan: 'No onion-garlic on request',        mult: 1 },
        { id: 'jain',   label: 'Jain / satvik',   scan: 'No root vegetables, separate vessels', mult: 1.14 },
        { id: 'nonveg', label: 'Includes non-veg', scan: 'Cooked separately',                 mult: 1.25 },
      ],
    },
    {
      id: 'scope',
      question: 'What are they doing?',
      choices: [
        { id: 'cook',      label: 'Cooking only',       scan: 'You provide groceries and vessels',   mult: 1 },
        { id: 'groceries', label: 'Cooking + groceries', scan: 'They bring everything',              mult: 1.55 },
        { id: 'serve',     label: 'Cook, groceries, serve', scan: 'Full kitchen and service staff',  mult: 1.85 },
      ],
    },
  ],

  catering: [
    {
      id: 'service',
      question: 'How is it served?',
      choices: [
        { id: 'buffet', label: 'Buffet',        scan: 'Guests serve themselves',              mult: 1 },
        { id: 'seated', label: 'Table service', scan: 'Served to seated guests by staff',     mult: 1.3 },
        { id: 'leaf',   label: 'Banana leaf',   scan: 'Traditional seated meal, served round', mult: 1.35 },
      ],
    },
  ],

  cake: [
    {
      id: 'flavour',
      question: 'Which flavour?',
      choices: [
        { id: 'vanilla',    label: 'Vanilla / butterscotch', scan: 'The safe crowd-pleaser',  mult: 1 },
        { id: 'chocolate',  label: 'Chocolate truffle',      scan: 'Rich, dark',              mult: 1.12 },
        { id: 'redvelvet',  label: 'Red velvet',             scan: 'Cream cheese frosting',   mult: 1.2 },
        { id: 'fresh',      label: 'Fresh fruit',            scan: 'Seasonal fruit, lighter', mult: 1.18 },
      ],
    },
    {
      id: 'diet',
      question: 'Any restriction?',
      choices: [
        { id: 'regular', label: 'Regular',   scan: 'Contains egg',              mult: 1 },
        { id: 'eggless', label: 'Eggless',   scan: 'No egg — say so clearly',   mult: 1.1 },
        { id: 'sugarfree', label: 'Sugar-free', scan: 'For diabetic guests',    mult: 1.25 },
      ],
    },
  ],

  mehendi: [
    {
      id: 'who',
      question: 'Who is it for?',
      choices: [
        { id: 'guests', label: 'Guests',        scan: 'Simple designs, several people',        mult: 1 },
        { id: 'bridal', label: 'Bridal',        scan: 'Full hands and feet, intricate, hours', mult: 2.4 },
        { id: 'both',   label: 'Bridal + guests', scan: 'A second artist for the guests',      mult: 3.1 },
      ],
    },
  ],

  makeup: [
    {
      id: 'who',
      question: 'Who is being made up?',
      choices: [
        { id: 'party',  label: 'Party makeup',  scan: 'One person, event-ready',                 mult: 1 },
        { id: 'bridal', label: 'Bridal',        scan: 'Trial, draping, touch-ups through the day', mult: 2.6 },
        { id: 'family', label: 'Family (3–4)',  scan: 'Mother, sisters, close family',           mult: 2.2 },
      ],
    },
  ],

  priest: [
    {
      id: 'pooja',
      question: 'Which ceremony?',
      choices: [
        { id: 'griha',   label: 'Griha pravesh', scan: 'Housewarming, about 2 hours',     mult: 1 },
        { id: 'satya',   label: 'Satyanarayana', scan: 'Katha and pooja, about 3 hours',  mult: 1.15 },
        { id: 'namkaran',label: 'Naming / mundan', scan: 'Child ceremonies',              mult: 1.1 },
        { id: 'other',   label: 'Something else', scan: 'Tell us below and we will match', mult: 1 },
      ],
    },
    {
      id: 'samagri',
      question: 'Pooja items?',
      choices: [
        { id: 'have', label: 'We have them',      scan: 'You have arranged the samagri',   mult: 1 },
        { id: 'bring',label: 'Priest brings them', scan: 'Full samagri kit included',      mult: 1.4 },
      ],
    },
  ],

  dj: [
    {
      id: 'scale',
      question: 'How big is the sound?',
      choices: [
        { id: 'small', label: 'Indoors / small', scan: 'Up to about 80 guests',        mult: 1 },
        { id: 'large', label: 'Outdoors / large', scan: 'Bigger rig, open ground',     mult: 1.5 },
      ],
    },
    {
      id: 'lights',
      question: 'Lights too?',
      choices: [
        { id: 'no',  label: 'Sound only', scan: 'Speakers and a DJ',                mult: 1 },
        { id: 'yes', label: 'Add lights', scan: 'Par cans, moving heads, a smoke machine', mult: 1.35 },
      ],
    },
  ],

  drum: [
    {
      id: 'troupe',
      question: 'How many drummers?',
      choices: [
        { id: 'four',  label: '4 drummers',  scan: 'The usual welcome troupe',   mult: 1 },
        { id: 'eight', label: '8 drummers',  scan: 'Louder, for a procession',   mult: 1.8 },
        { id: 'band',  label: 'Full band',   scan: 'Drums, nadaswaram, horns',   mult: 2.6 },
      ],
    },
  ],

  lighting: [
    {
      id: 'kind',
      question: 'What kind of lighting?',
      choices: [
        { id: 'ambient', label: 'Warm ambient', scan: 'Fairy lights and uplighters',    mult: 1 },
        { id: 'stage',   label: 'Stage focus',  scan: 'Lit stage for the main moment',  mult: 1.3 },
        { id: 'full',    label: 'Full setup',   scan: 'Facade, pathway, stage, dance floor', mult: 1.75 },
      ],
    },
  ],

  dining: [
    {
      id: 'style',
      question: 'Seating style?',
      choices: [
        { id: 'chairs', label: 'Chairs only',      scan: 'Seating around the space',   mult: 1 },
        { id: 'tables', label: 'Tables and chairs', scan: 'Round or long tables',      mult: 1.4 },
        { id: 'floor',  label: 'Floor seating',    scan: 'Traditional, with mats',     mult: 1.15 },
      ],
    },
  ],

  emcee: [
    {
      id: 'language',
      question: 'Which language?',
      choices: [
        { id: 'kannada', label: 'Kannada',        scan: '',                mult: 1 },
        { id: 'english', label: 'English + Hindi', scan: '',               mult: 1.1 },
        { id: 'tamil',   label: 'Tamil / Telugu', scan: '',                mult: 1.1 },
      ],
    },
  ],
}

/** Does this service ask anything? */
export function optionsFor(serviceId) {
  return SERVICE_OPTIONS[serviceId] ?? []
}

/** Every service that now has real choices. */
export const HAS_OPTIONS = new Set(Object.keys(SERVICE_OPTIONS))

/**
 * The combined multiplier for a set of answers.
 *
 * Multiplicative rather than additive, because the choices compound in
 * reality: a candid photographer shooting a full day costs more than
 * either surcharge alone, and adding percentages would under-price
 * exactly the largest bookings.
 *
 * An unanswered group contributes its default (1), so a customer who
 * skips the questions pays the base rate rather than nothing.
 */
export function optionMultiplier(serviceId, picked = {}) {
  let mult = 1
  for (const group of optionsFor(serviceId)) {
    const chosen = group.choices.find(c => c.id === picked[group.id])
    mult *= chosen?.mult ?? 1
  }
  return mult
}

/** What the customer chose, as a sentence for the master's job card. */
export function optionSummary(serviceId, picked = {}) {
  return optionsFor(serviceId)
    .map(g => g.choices.find(c => c.id === picked[g.id])?.label)
    .filter(Boolean)
    .join(' · ')
}

/** The defaults, so a price can be shown before anybody taps anything. */
export function defaultOptions(serviceId) {
  const out = {}
  for (const g of optionsFor(serviceId)) {
    out[g.id] = (g.choices.find(c => c.mult === 1) ?? g.choices[0]).id
  }
  return out
}
