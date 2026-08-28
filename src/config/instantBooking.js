/**
 * Instant booking — the dials, and the words.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE COPY RULE, WHICH IS THE IMPORTANT HALF OF THIS FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nobody reads. Not in this market, not on a phone, not while deciding
 * whether to spend ₹31,000 on a Tuesday evening. A customer who came to
 * book a decorator in ninety seconds will not read a paragraph explaining
 * how our pricing works, and putting one in front of them does not make
 * them informed — it makes them leave.
 *
 * But some of what has to be said is not optional. "The price covers a
 * standard setup; extras are agreed on the call" is the sentence that
 * prevents the argument at the venue. Dropping it to save words would
 * trade a paragraph today for a dispute, a refund and a one-star review
 * later.
 *
 * So the rule is not "say less". It is THREE TIERS, and every piece of
 * copy in this flow declares which tier it is:
 *
 *   glance   ≤ 4 words.   Always visible. Usually a number or a state.
 *   scan     ≤ 10 words.  Always visible. One line, no full stop needed.
 *   detail   A sentence.  BEHIND A TAP. Never blocks, never a modal.
 *
 * Nothing that matters lives ONLY in `detail` — but it may live there in
 * its long form as long as `scan` carries the fact. That is the whole
 * trick: compress, do not delete.
 *
 *   BEFORE (43 words, tier-3 content shown at tier 1):
 *     "Your master will call you within 30 minutes of accepting to
 *      confirm colours, theme and the exact setup. The price above
 *      covers a standard setup at this scale — anything beyond it is
 *      agreed with you on that call before any work starts."
 *
 *   AFTER:
 *     glance   "Standard setup"
 *     scan     "Master calls in 30 min to finalise"      ⓘ
 *     detail   (the original sentence, one tap away)
 *
 * Same information, same protection, 7 words on screen instead of 43.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHOW, DO NOT TELL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Where a fact can be a shape, it must be a shape. This flow has three
 * places where prose was the lazy answer and a visual is the right one:
 *
 *   · progress      "3 of 5" as five pips, not a sentence
 *   · the collar    a band with today's number marked, not "+8% cap"
 *   · distance      "1.2 km" beside a name, not "a nearby partner"
 *
 * A pip row is read in 200ms and survives being glanced at sideways
 * while walking. A sentence does neither.
 */

import { CANCELLATION_LADDER } from './policies'

export const INSTANT_VERSION = '2026.08-instant-v1'

/* ═══════════════════════════════════════════════════════════════════
   DISPATCH
   ═══════════════════════════════════════════════════════════════════ */

/**
 * How long a partner has to answer, in seconds.
 *
 * 45, and the number is a compromise between two real failures. Too
 * short and a partner driving a van misses every offer, learns the
 * notifications are pointless, and stops opening them — which costs
 * supply, the scarce side. Too long and the customer watches a spinner:
 * five services at 3 minutes each, dispatched in waves, is a fifteen
 * minute wait for something sold as instant.
 *
 * 45 seconds is roughly how long it takes to look at a phone, read four
 * lines and decide. It is also short enough that three waves fit inside
 * two and a half minutes, which is the outer limit of what somebody will
 * hold a screen open for.
 */
export const OFFER_WINDOW_SECONDS = Number(
  // Overridable from the SERVER environment only, and for one reason: a
  // demo or an end-to-end test cannot photograph a 45-second window.
  // Launching a browser and settling a React tree costs more than that,
  // so the offer has already expired by the time anything renders — the
  // first attempt at this missed by three seconds.
  //
  // A browser cannot set it (there is no `process` there), and
  // production simply never defines it. The real dial stays 45.
  (typeof process !== 'undefined' && process.env?.OFFER_WINDOW_SECONDS) || 45,
)

/**
 * How many partners are asked per wave, and how far.
 *
 * Waves rather than a broadcast, deliberately. Buzzing forty decorators
 * for one job means thirty-nine wasted notifications, and a partner whose
 * accept rate is 1-in-40 stops answering. Five at a time keeps the odds
 * of winning worth the tap.
 *
 * The radius widens rather than the count growing: a sixth-best partner
 * at 2 km is a better outcome for the customer than a first-choice at
 * 22 km, and the partner's own `service_radius_km` still has to agree.
 */
export const WAVES = [
  { wave: 1, partners: 5, radiusMultiplier: 1 },
  { wave: 2, partners: 5, radiusMultiplier: 2 },
  { wave: 3, partners: 8, radiusMultiplier: 3 },
]

/** Beyond this a "nearby master" is a two-hour drive and the promise is false. */
export const MAX_RADIUS_KM = 25

/** Default the picker opens on. Most Bengaluru bookings fill inside it. */
export const DEFAULT_RADIUS_KM = 5

/* ═══════════════════════════════════════════════════════════════════
   MONEY
   ═══════════════════════════════════════════════════════════════════ */

/**
 * The platform's cut.
 *
 * 15% is mid-market for Indian services marketplaces and is the number
 * the partner sees stated on every offer, as an amount rather than a
 * percentage — "You earn ₹10,540" is read; "15% commission" is computed,
 * and a partner doing arithmetic on a lock screen declines.
 */
export const PLATFORM_FEE_RATE = 0.08

/**
 * Where the instant card sits inside the market band.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS IS A CORRECTION, NOT A PRICE RISE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `data/servicePricing.js` prices at the BOTTOM of what Bengaluru
 * charges — ₹4,100 for a balloon-and-backdrop setup against a real band
 * of ₹3,500–9,000. That is right for the concierge side, where a
 * coordinator negotiates the rate down in exchange for volume and a
 * single point of contact.
 *
 * It is wrong for instant, and `scripts/rate-card-review.mjs --sweep`
 * showed why with numbers. A master keeps the price less commission less
 * TCS and TDS. Priced at the floor of the band, the offer lands BELOW
 * what they would earn taking the job directly — so they decline, the
 * line does not fill, and it looks like a supply problem:
 *
 *     card    commission   4-line basket fills
 *     ×1.00       8%              4%
 *     ×1.30       8%             67%
 *     ×1.45       8%             96%
 *
 * ×1.30 puts the card at the MIDDLE of the researched band. The customer
 * pays a fair Bengaluru rate rather than a suspiciously cheap one, and
 * the master earns roughly what they would have earned anyway plus work
 * they would not otherwise have had. That is the only arrangement where
 * both sides come back.
 *
 * ── Why not ×1.45, where almost everything fills ─────────────────────
 * Because 96% fill bought by overpaying is not fill, it is a subsidy —
 * and the customer notices when the platform is dearer than ringing the
 * decorator directly. ×1.30 accepts a lower fill rate at launch, which
 * is the trade that was chosen deliberately.
 *
 * ── Applies to INSTANT only ──────────────────────────────────────────
 * The concierge quote engine does not read this. A pre-booked wedding is
 * still priced by `utils/quote` at the negotiated rate, because there a
 * coordinator really does negotiate.
 */
export const INSTANT_RATE_MULTIPLIER = 1.30

/** Escrow releases this long after the partner marks a line delivered. */
export const RELEASE_AFTER_HOURS = 24

/* ═══════════════════════════════════════════════════════════════════
   COPY — every string the instant flow shows, at its declared tier
   ═══════════════════════════════════════════════════════════════════ */

/**
 * The master's-call card, for a `discuss` service.
 *
 * `scan` carries the two facts that prevent the argument — that the price
 * is for a standard setup, and that somebody rings to finalise. The full
 * sentence stays available and is not required reading.
 */
export const DISCUSS_CARD = {
  glance: 'Standard setup',
  scan:   'Master calls in 30 min to finalise',
  detail:
    'This price covers a standard setup at your scale. Your master calls within ' +
    '30 minutes of accepting to agree colours, theme and detail — anything beyond ' +
    'the standard setup is priced with you on that call, before any work starts.',
  photoPrompt: 'Add a photo',
  notePrompt:  'Anything specific?',
}

/** A `standard` service needs no card at all. Saying "no call needed" is noise. */
export const STANDARD_CARD = null

/**
 * The matching screen.
 *
 * Every string here is a fragment, not a sentence, because they sit
 * beside a service name and a number that already carry the meaning.
 */
/**
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS WAS REWRITTEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first version said "Finding", "5 notified", "Still looking". Every
 * word was true and the screen was unreadable — because the terseness
 * rule above was applied to the one screen in the app where the customer
 * does not already know what is happening.
 *
 * Everywhere else, brevity works: somebody choosing a cake knows they
 * are choosing a cake, so the label only has to name the option. Here
 * they have just pressed a button and are watching a page do something
 * invisible on their behalf, for a minute or more, having committed to
 * nothing yet. "5 notified" does not tell them that five real businesses
 * are looking at their job on a phone right now, that the first to say
 * yes gets it, that this normally takes about a minute, or that they can
 * close the app and be told.
 *
 * So the rule bends here, and only here: the ROW labels stay short
 * because the pip beside them carries the state, and a HEADER above them
 * says in plain sentences what is going on. Short words for the things
 * being repeated eight times; real sentences for the thing said once.
 */
export const MATCHING = {
  /* ── Row labels ────────────────────────────────────────────────
     Short, because each is repeated once per service and the pip
     beside it already carries the colour. But plain: "Finding" was a
     verb with no object. */
  searching:  'Asking masters',
  notified:   n => (n === 1 ? '1 master has it' : `${n} masters have it`),
  accepted:   'Confirmed',
  widening:   n => `Looking within ${n} km`,
  none:       'Nobody free yet',
  paid:       'Paid · confirmed',

  /* ── The header, which is the part that was missing ────────────
     One state at a time, in sentences, saying what is happening and
     what happens next. */
  head: {
    sending: area => ({
      title: 'Reaching masters now',
      body: area
        ? `We are contacting the masters closest to ${area}.`
        : 'We are contacting the masters closest to your venue.',
    }),

    hunting: (n, area) => ({
      title: 'Finding your masters',
      body: n > 0
        ? `${n} ${n === 1 ? 'master has' : 'masters have'} your job on their phone right now${area ? `, near ${area}` : ''}. The first to accept gets it.`
        : 'We are reaching out to masters near your venue.',
      // The honest expectation. Left unsaid, a minute of nothing reads
      // as a broken page — which is exactly what was reported.
      note: 'Most reply within a minute. You can close the app — we will alert you the moment someone accepts.',
    }),

    partial: (a, t) => ({
      title: `${a} of ${t} confirmed`,
      body: 'You can pay for these now. We keep looking for the rest — nothing waits on the last one.',
    }),

    complete: n => ({
      title: n === 1 ? 'Your master is confirmed' : `All ${n} masters confirmed`,
      body: 'Pay to lock the date. Their details reach you the moment payment is through.',
    }),

    standing: area => ({
      title: 'Still searching',
      body: `No master near ${area ?? 'your venue'} is free for this yet. We have widened the search and we keep asking as masters come free.`,
      note: 'We will alert you the moment one accepts. Nothing has been charged.',
    }),
  },

  progress:   (a, t) => `${a} of ${t}`,
  payCta:     (n, amt) => `Pay for ${n} · ${amt}`,

  /* Said under the pay button, every time. The single most important
     sentence on the screen. */
  payAssurance: 'You only pay for masters who said yes.',
}

/**
 * What a partner sees. Four lines and two buttons.
 *
 * A partner decides in under five seconds, one-handed, often in a vehicle.
 * Trade, day, distance, earnings — in that order, because that is the
 * order the decision is actually made in.
 */
export const OFFER_CARD = {
  urgent:   s => `${s}s`,
  earn:     'You earn',
  accept:   'Accept',
  decline:  'Pass',
  // Said plainly. A partner who clears a Saturday for an unpaid booking
  // and finds out later does not answer the next notification.
  provisional: 'Confirmed once paid',
}

/**
 * Partial fill.
 *
 * The words matter more here than anywhere else in the flow: this is a
 * normal outcome that looks like a failure. It must never be phrased as
 * an apology, because 6-of-10 IS the product working — the alternative
 * was all ten waiting on the slowest one.
 */
export const PARTIAL = {
  glance: 'Still looking',
  scan:   'Others keep searching — pay for these now',
  detail:
    'Each master is booked separately, so nothing waits on the last one. ' +
    'Pay for the ones who accepted and we keep looking for the rest — ' +
    'you only ever pay for a master who said yes.',
}

/**
 * Cancellation, at the moment of cancelling.
 *
 * Read from config/policies.js rather than restated, so the number shown
 * and the number charged cannot drift.
 */
export const CANCEL = {
  glance: 'Cancel this',
  scan:   pct => (pct === 0 ? 'Full refund' : `${pct}% goes to your master`),
  detail:
    'Your master cleared their day for this. If you cancel after they accepted, ' +
    'part of the amount goes to them — not to us.',
  ladder: CANCELLATION_LADDER,
}

/**
 * One helper, so no component can accidentally render a `detail` string
 * where a `scan` belongs. Cheap, and it fails loudly in dev rather than
 * shipping a paragraph.
 */
export function assertTier(text, tier) {
  if (!import.meta.env?.DEV) return text
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length
  const max = { glance: 4, scan: 10 }[tier]
  if (max && words > max) {
    console.warn(
      `[instantBooking] "${text}" is ${words} words at tier "${tier}" (max ${max}). ` +
      `Move the long form to a detail tap.`
    )
  }
  return text
}


/**
 * A face per trade, for the matching screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY EMOJI HERE, WHEN THE APP USES PHOTOGRAPHS EVERYWHERE ELSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The standing visual rule is real photographs, never illustrations, and
 * it holds on every screen that SELLS something — a customer choosing a
 * decorator needs to see decoration.
 *
 * This screen sells nothing. It is a live status of work being done on
 * somebody's behalf, and the subject is a PERSON who is being asked, not
 * a service being displayed. A photograph here would be a stock model
 * standing in for a master who has not accepted yet — a picture of a
 * person the customer is not going to get. That is worse than a symbol.
 *
 * These are also the only glyphs that render at 19px, in a moving
 * element, on every phone, with no image to load on a screen that must
 * appear in one frame.
 *
 * Keyed by TRADE — the value in `vendor_services.category`, which is
 * what dispatch matches on — with service ids as a fallback for the
 * pre-flight rows, which exist before any trade is known.
 */
export const TRADE_FACE = {
  'Decoration & Floral':   '🎈',
  'Photography':           '📷',
  'Videography':           '🎥',
  'Catering & Food':       '🍲',
  'Cooks':                 '👨‍🍳',
  'Cake & Desserts':       '🎂',
  'DJ & Music':            '🎧',
  'Live Entertainment':    '🎤',
  'Dhol & Band':           '🥁',
  'Mehendi Artist':        '🖐️',
  'Bridal Makeup & Hair':  '💄',
  'Priest & Rituals':      '🪔',
  'Anchor & MC':           '🎙️',
  'Event Lighting':        '💡',
  'Tent & Furniture':      '⛺',
  'Dining & Service':      '🍽️',
  'Transport':             '🚐',
  'Security':              '🛡️',

  // Service ids, for the rows drawn before the server has answered.
  decor: '🎈', cake: '🎂', photography: '📷', videography: '🎥',
  catering: '🍲', cooks: '👨‍🍳', dj: '🎧', mehendi: '🖐️', makeup: '💄',
  drum: '🥁', dining: '🍽️', priest: '🪔', emcee: '🎙️', lighting: '💡',
}

/**
 * What the screen says while it waits, cycling every few seconds.
 *
 * Every line is a true statement about what dispatch is doing at that
 * moment. None is a countdown, a percentage, or an estimate that cannot
 * be kept — `false_urgency` in config/legal.js is the named pattern this
 * must never become, and "3 people are viewing this" is exactly the
 * thing it forbids.
 *
 * The point is not information. The customer has already been told what
 * is happening by the header. The point is that a screen which never
 * changes is a screen that has crashed, to anybody who cannot see the
 * network traffic.
 */
export const SEARCH_LINES = (area, notified) => [
  notified > 0
    ? `${notified} ${notified === 1 ? 'master is' : 'masters are'} looking at your job right now`
    : 'Reaching the masters closest to your venue',
  area ? `Asking masters in and around ${area}` : 'Asking masters near your venue',
  'The first to accept gets the job',
  'Nothing is charged until a master says yes',
  'You can close the app — we will alert you',
]
