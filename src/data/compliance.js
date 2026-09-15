/**
 * What a partner has to show us, and which partners have to show it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE CHECKLIST FOR TWENTY-SIX TRADES WAS THE PROBLEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every partner saw the same four rows: Aadhaar, PAN, GST, shop licence.
 * A caterer was never asked about food safety. A tempo-traveller operator
 * was never asked for an insurance or a permit. A venue was never asked
 * whether they are the ones entitled to let it.
 *
 * That is backwards twice over: the documents that actually matter are
 * the trade-specific ones, and asking a mehendi artist for a GST
 * certificate is a row she scrolls past on the way to giving up.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REQUIREMENTS ARE DATA, WITH STABLE IDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Each requirement has an id that never changes — VER-TRADE-FOOD stays
 * VER-TRADE-FOOD when its label is reworded — because a partner's
 * compliance row points at it, and a label is not a key. The same rule
 * the listing questions already follow.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERYTHING IS OPTIONAL RIGHT NOW, AND THAT IS A SETTING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `MANDATORY_FROM` is null, so nothing blocks a partner today (§31).
 * When it is set to a date, requirements whose `enforceable` is true
 * begin to gate submission — and the screens already read `required`
 * from here, so that switch is one line rather than a UI change.
 *
 * What this file deliberately does NOT do is state the law. It names the
 * document a partner is asked for and leaves the legal question to the
 * people who decide it: "food business registration or licence, as
 * applicable" is honest; naming an act and a section from memory would
 * be this file's first lie.
 */

export const MANDATORY_FROM = null

/* Asked of everybody, whatever they do. Two documents, not four: the
   ones that establish a person is who they say and can be paid. */
const BASE = [
  {
    id: 'VER-ID-IDENTITY',
    documentKind: 'aadhaar',
    label: 'Proof of identity',
    hint: 'Aadhaar, or any government photo ID.',
    enforceable: true,
  },
  {
    id: 'VER-TAX-PAN',
    documentKind: 'pan',
    label: 'PAN',
    hint: 'Needed once your earnings pass the annual threshold. Adding it now saves a chase later.',
    enforceable: false,
  },
]

/* Asked of a business rather than a person — a shop, a registered name,
   a GST number. Not everybody has one and that is fine. */
const BUSINESS = [
  {
    id: 'VER-BUSINESS-PROOF',
    documentKind: 'shop_licence',
    label: 'Proof of business',
    hint: 'A municipal licence, a Udyam certificate, or anything official carrying your business name.',
    enforceable: false,
  },
]

/**
 * The extra ones, by trade.
 *
 * Keyed on the trade NAME, the same string vendor_services.category
 * holds and match_partners joins on — so there is no third vocabulary
 * to keep in step. A trade absent from this map asks for BASE only,
 * which is the right default: we ask for the minimum until somebody has
 * thought about that trade specifically.
 */
export const TRADE_REQUIREMENTS = {
  'Catering & Food': [
    {
      id: 'VER-TRADE-FOOD',
      documentKind: 'shop_licence',
      label: 'Food business registration or licence',
      hint: 'Whatever applies to your kitchen — a registration certificate or a licence. Photograph the certificate.',
      enforceable: true,
      why: 'Food is the one trade where what goes wrong makes people ill, and a customer asks for this by name.',
    },
  ],
  'Bar & Beverages': [
    {
      id: 'VER-TRADE-LIQUOR',
      documentKind: 'shop_licence',
      label: 'Permission to serve, where it applies',
      hint: 'Only if you serve alcohol. A bartending service pouring what the host supplies usually needs nothing.',
      enforceable: false,
      why: 'Serving without the permission the venue assumed you had ends the event, not the booking.',
    },
  ],
  Transportation: [
    {
      id: 'VER-TRADE-TRANSPORT',
      documentKind: 'shop_licence',
      label: 'Vehicle papers',
      hint: 'Registration, insurance and fitness for the vehicles you will send. Permit too, where the service needs one.',
      enforceable: true,
      why: 'A vehicle carrying a wedding party is carrying passengers, and the papers are what makes that lawful.',
    },
  ],
  Venue: [
    {
      id: 'VER-TRADE-VENUE',
      documentKind: 'shop_licence',
      label: 'Proof you can let this venue',
      hint: 'Ownership, a lease, or a letter from the owner authorising you to take bookings.',
      enforceable: true,
      why: 'Double-letting a hall is the single most expensive failure on this platform, and it starts with nobody checking who may let it.',
    },
  ],
  'Security Services': [
    {
      id: 'VER-TRADE-SECURITY',
      documentKind: 'shop_licence',
      label: 'Security agency credentials',
      hint: 'Your agency registration or licence, as applicable, plus ID for the staff you send.',
      enforceable: true,
      why: 'A guard at a family function is a stranger given authority; who they work for should be checked once, by us.',
    },
  ],
  'Safety & Facilities': [
    {
      id: 'VER-TRADE-SAFETY',
      documentKind: 'shop_licence',
      label: 'Credentials for the service you provide',
      hint: 'Medical, fire or sanitation credentials — whichever applies to what you offer.',
      enforceable: true,
    },
  ],
  'Live Entertainment': [
    {
      id: 'VER-TRADE-PYRO',
      documentKind: 'shop_licence',
      label: 'Permission for fireworks, if you do them',
      hint: 'Only if fireworks or pyrotechnics are one of your offerings.',
      enforceable: false,
    },
  ],
  'Power & Cooling': [
    {
      id: 'VER-TRADE-POWER',
      documentKind: 'shop_licence',
      label: 'Generator and electrical credentials',
      hint: 'Whatever you hold for running generators and temporary electrical work.',
      enforceable: false,
    },
  ],
}

/**
 * Everything this partner is asked for, given the trades they actually
 * listed. One entry per requirement id — a partner who lists Catering
 * and Venue is asked for each trade's own document, and for the base
 * set once rather than twice.
 *
 * @param trades  trade names from the partner's listings
 * @returns [{ id, label, hint, documentKind, required, enforceable, why?, trade? }]
 */
export function requirementsFor(trades = []) {
  const seen = new Set()
  const out = []

  const push = (req, trade = null) => {
    if (seen.has(req.id)) return
    seen.add(req.id)
    out.push({
      ...req,
      trade,
      /* The switch §31 asks for. Until MANDATORY_FROM is set, nothing
         here is required of anybody — and the screen reads this field
         rather than deciding for itself, so turning enforcement on is
         one line in this file. */
      required: !!MANDATORY_FROM && req.enforceable,
    })
  }

  BASE.forEach(r => push(r))
  for (const trade of trades) {
    (TRADE_REQUIREMENTS[trade] ?? []).forEach(r => push(r, trade))
  }
  /* Asked last, because it is the one most partners do not have and a
     row somebody cannot satisfy reads better at the bottom than in the
     middle of ones they can. */
  BUSINESS.forEach(r => push(r))

  return out
}

/** Every requirement id that exists, for the audit guard. */
export const ALL_REQUIREMENT_IDS = [
  ...BASE, ...BUSINESS,
  ...Object.values(TRADE_REQUIREMENTS).flat(),
].map(r => r.id)
