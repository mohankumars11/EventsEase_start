import { DOCUMENT_TYPES } from './documentTypes'

/**
 * Which documents this partner is asked for, given what they do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * RISK DECIDES, NOT UNIFORMITY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Asking every partner for everything is the failure that makes people
 * abandon onboarding, and asking everyone for the same thing is the
 * failure that leaves real risk unchecked. A Mehendi artist alone in a
 * bride's room and an invitation printer who posts cards are not the
 * same exposure and must not get the same checklist.
 *
 * So trades carry a TIER, and the tier decides what is added on top of
 * the baseline. `data/compliance.js` had the right instinct — per-trade
 * requirements — but expressed it as eight hand-written blocks with no
 * shared notion of why, and five of them collided on one document kind
 * (see migration 143).
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT `required` MEANS, AND THE ONE SWITCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * `enforceable` is a static property: "this one WOULD gate submission".
 * `required` is the runtime answer, and it is `enforceable && MANDATORY`.
 * That split is inherited from compliance.js:187 deliberately — it is
 * what lets enforcement be switched on in one line, on a date, rather
 * than by editing twenty screens.
 *
 * Screens read `required`. Nothing reads `enforceable` but this file.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DECLINABLE IS NOT THE SAME AS OPTIONAL
 * ══════════════════════════════════════════════════════════════════════
 *
 *   optional    nice to have; nothing happens if it is absent
 *   declinable  the partner may lawfully refuse (a background check),
 *               and refusing SCOPES THEM DOWN rather than blocking the
 *               account — they keep the trades that do not need it
 *
 * A declined requirement is a recorded decision with a consequence, not
 * a gap. `scopeFor()` below is what turns it into one.
 */

export const TIER = {
  BASELINE: 0,      // everybody
  ALONE_WITH_CUSTOMER: 1,
  FOOD: 2,
  DRIVES: 3,
  PUBLIC_SAFETY: 4,
  PREMISES: 5,
}

export const TIER_WHY = {
  [TIER.BASELINE]: 'Everybody who takes work through Sambramo.',
  [TIER.ALONE_WITH_CUSTOMER]: 'You work alone with a customer, often in their home.',
  [TIER.FOOD]: 'You prepare or serve food and drink.',
  [TIER.DRIVES]: 'You drive as part of the job.',
  [TIER.PUBLIC_SAFETY]: 'Your work carries a risk to people at the event.',
  [TIER.PREMISES]: 'You are letting a building to the public.',
}

/**
 * All 26 trades, from `listing_trades` (seeded in migration 107).
 *
 * The names are exact. A typo here is silent: the trade falls through to
 * baseline and a caterer is never asked about food. `check-verification-
 * requirements.mjs` asserts every seeded trade appears here.
 */
export const TRADE_TIERS = {
  'Anchor & MC':              [TIER.BASELINE],
  'Bar & Beverages':          [TIER.BASELINE, TIER.FOOD],
  'Bridal Makeup & Hair':     [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Cake & Desserts':          [TIER.BASELINE, TIER.FOOD],
  'Catering & Food':          [TIER.BASELINE, TIER.FOOD],
  'DJ & Music':               [TIER.BASELINE],
  'Decoration & Floral':      [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Event Lighting':           [TIER.BASELINE, TIER.PUBLIC_SAFETY],
  'Gifts & Favours':          [TIER.BASELINE],
  'Guest Services':           [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Invitation & Printing':    [TIER.BASELINE],
  'Live Entertainment':       [TIER.BASELINE],
  'Mehendi Artist':           [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Photography':              [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Power & Cooling':          [TIER.BASELINE, TIER.PUBLIC_SAFETY],
  'Priest & Rituals':         [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Safety & Facilities':      [TIER.BASELINE, TIER.PUBLIC_SAFETY],
  'Security Services':        [TIER.BASELINE, TIER.PUBLIC_SAFETY, TIER.ALONE_WITH_CUSTOMER],
  'Sound & AV':               [TIER.BASELINE],
  'Tent & Furniture':         [TIER.BASELINE],
  'Transportation':           [TIER.BASELINE, TIER.DRIVES],
  'Trousseau & Gift Packing': [TIER.BASELINE],
  'Valet Parking':            [TIER.BASELINE, TIER.DRIVES],
  'Venue':                    [TIER.BASELINE, TIER.PREMISES],
  'Videography':              [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
  'Wedding Planning':         [TIER.BASELINE, TIER.ALONE_WITH_CUSTOMER],
}

const req = (id, documentType, over = {}) => ({
  id,
  documentType,
  enforceable: false,
  declinable: false,
  tier: TIER.BASELINE,
  trade: null,
  ...over,
})

/** Asked of everybody. Kept to the few that establish who somebody is. */
const BASELINE = [
  req('VER-ID-IDENTITY', 'aadhaar', {
    enforceable: true,
    why: 'A customer is letting you into their home or their function.',
  }),
  req('VER-ID-SELFIE', 'selfie', {
    enforceable: false,
    why: 'So the person who turns up is the person on the ID.',
  }),
  req('VER-TAX-PAN', 'pan', {
    enforceable: false,
    why: 'Without it we must deduct more tax from every payout.',
  }),
  req('VER-BUSINESS-PROOF', 'shop_licence', { enforceable: false }),
  req('VER-BUSINESS-GST', 'gst', {
    enforceable: false,
    why: 'Only if your turnover is above the registration threshold.',
    conditional: 'gst_registered',
  }),
]

/** What each tier adds. Baseline is handled above. */
const BY_TIER = {
  [TIER.ALONE_WITH_CUSTOMER]: [
    req('VER-SAFETY-PCC', 'police_clearance', {
      enforceable: false,
      declinable: true,
      tier: TIER.ALONE_WITH_CUSTOMER,
      why: 'You are often alone with a customer. You may decline — it limits which work reaches you rather than closing your account.',
    }),
  ],
  [TIER.FOOD]: [
    req('VER-TRADE-FSSAI', 'fssai', {
      enforceable: true,
      tier: TIER.FOOD,
      why: 'Serving food without one is an offence, and it is the first thing a customer asks about.',
    }),
    req('VER-TRADE-LIQUOR', 'liquor_permit', {
      enforceable: false,
      tier: TIER.FOOD,
      conditional: 'serves_alcohol',
      why: 'Only where you pour alcohol rather than supply it.',
    }),
  ],
  [TIER.DRIVES]: [
    req('VER-TRADE-DL', 'dl', { enforceable: true, tier: TIER.DRIVES }),
    req('VER-TRADE-RC', 'rc', { enforceable: true, tier: TIER.DRIVES }),
    req('VER-TRADE-INSURANCE', 'insurance', { enforceable: true, tier: TIER.DRIVES }),
    req('VER-TRADE-PUC', 'puc', { enforceable: false, tier: TIER.DRIVES }),
    req('VER-TRADE-PERMIT', 'permit', {
      enforceable: false, tier: TIER.DRIVES, conditional: 'commercial_vehicle',
    }),
  ],
  [TIER.PUBLIC_SAFETY]: [
    req('VER-TRADE-PSARA', 'psara', {
      enforceable: true, tier: TIER.PUBLIC_SAFETY, appliesToTrades: ['Security Services'],
      why: 'A guard at a family function is a stranger given authority; who they work for should be checked once, by us.',
    }),
    req('VER-TRADE-ELECTRICAL', 'electrical_licence', {
      enforceable: false, tier: TIER.PUBLIC_SAFETY,
      appliesToTrades: ['Power & Cooling', 'Event Lighting'],
    }),
    req('VER-TRADE-LIABILITY', 'liability_insurance', {
      enforceable: false, tier: TIER.PUBLIC_SAFETY,
    }),
  ],
  [TIER.PREMISES]: [
    req('VER-TRADE-PROPERTY', 'property_proof', { enforceable: true, tier: TIER.PREMISES }),
    req('VER-TRADE-OCCUPANCY', 'occupancy_certificate', { enforceable: false, tier: TIER.PREMISES }),
    req('VER-TRADE-FIRE', 'fire_noc', { enforceable: false, tier: TIER.PREMISES }),
  ],
}

/**
 * The enforcement switch, inherited from compliance.js:42.
 *
 * `null` means nothing is required of anybody yet. Set it to a date and
 * every `enforceable` requirement begins to gate submission — one line,
 * not a UI change.
 */
export const MANDATORY_FROM = null

/**
 * @param input {
 *   trades: string[],            from partner_listings / vendor_services.category
 *   answers?: object,            conditional flags — gst_registered, serves_alcohol, …
 *   mandatoryFrom?: Date|null,   injected so tests can turn enforcement on
 * }
 * @returns requirement objects, deduped, ordered, each carrying its
 *          document type's full capture rules.
 */
export function requirementsFor(input = {}) {
  /* Tolerates a bare array, because that is how compliance.js's caller
     has always invoked it and both shapes now flow through here. */
  const opts = Array.isArray(input) ? { trades: input } : input
  const { trades = [], answers = {}, mandatoryFrom = MANDATORY_FROM } = opts

  const seen = new Set()
  const out = []

  const push = (r, trade) => {
    if (seen.has(r.id)) return
    /* A requirement pinned to particular trades is skipped for the
       others in the same tier. Security Services needs PSARA; Event
       Lighting is in the same tier and does not. */
    if (r.appliesToTrades && !r.appliesToTrades.includes(trade)) return
    /* A conditional one is only asked once the partner has said the
       thing that makes it apply. Asking every caterer for a liquor
       permit is how a checklist stops being believed. */
    if (r.conditional && !answers[r.conditional]) return

    seen.add(r.id)
    const type = DOCUMENT_TYPES[r.documentType]
    out.push({
      ...r,
      ...type,
      /* `id` and `label` must survive the spread of the document type,
         which also carries a `label`. The requirement's own wording
         wins where it has one. */
      id: r.id,
      documentType: r.documentType,
      trade: trade ?? r.trade,
      required: !!mandatoryFrom && r.enforceable,
      tierWhy: TIER_WHY[r.tier],
      why: r.why ?? type?.hint ?? null,
    })
  }

  for (const r of BASELINE) push(r, null)

  for (const trade of trades) {
    const tiers = TRADE_TIERS[trade] ?? [TIER.BASELINE]
    for (const t of tiers) {
      for (const r of BY_TIER[t] ?? []) push(r, trade)
    }
  }

  /* Baseline identity first, then trade-specific, then the business
     ones a partner is least likely to have — a row somebody cannot
     satisfy reads better at the bottom. Inherited from compliance.js. */
  const rank = r => (r.id.startsWith('VER-ID') ? 0 : r.id.startsWith('VER-BUSINESS') ? 2 : 1)
  return out.sort((a, b) => rank(a) - rank(b))
}

/** Which tiers this set of trades reaches. */
export function tiersFor(trades = []) {
  const s = new Set()
  for (const t of trades) for (const x of TRADE_TIERS[t] ?? [TIER.BASELINE]) s.add(x)
  return [...s].sort()
}

/**
 * A partner declined a declinable requirement. What can they still do?
 *
 * ══════════════════════════════════════════════════════════════════════
 * SCOPED DOWN, NOT SHUT OUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Refusing a background check is lawful and must stay lawful to do. The
 * consequence is on the WORK, not the account: the trades whose risk the
 * check was answering become unavailable, and every other trade is
 * untouched. Earnings, history and the account itself are never affected.
 *
 * @returns { blockedTrades, allowedTrades, reason }
 */
export function scopeFor({ trades = [], declined = [] } = {}) {
  const blocked = new Set()

  for (const requirementId of declined) {
    /* Which tier was that requirement answering? Every trade in that
       tier loses the work; nothing else does. */
    for (const [tier, list] of Object.entries(BY_TIER)) {
      if (!list.some(r => r.id === requirementId && r.declinable)) continue
      for (const t of trades) {
        if ((TRADE_TIERS[t] ?? []).includes(Number(tier))) blocked.add(t)
      }
    }
  }

  return {
    blockedTrades: [...blocked],
    allowedTrades: trades.filter(t => !blocked.has(t)),
    reason: blocked.size
      ? 'These need a background check you have chosen not to give. You can change your mind, or upload a police clearance certificate you obtained yourself.'
      : null,
  }
}

/** Every requirement id the engine can emit. For the audit guard. */
export const ALL_REQUIREMENT_IDS = [
  ...BASELINE.map(r => r.id),
  ...Object.values(BY_TIER).flat().map(r => r.id),
]
