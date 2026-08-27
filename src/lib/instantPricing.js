/**
 * What an instant booking costs, and what the master actually earns.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PLATFORM SETS THE PRICE. THE MASTER NEVER DOES.
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the single most important rule in the file and it is a
 * deliberate product decision, not a technical convenience.
 *
 * A master is shown a job and a number — "Decoration, Saturday,
 * Koramangala, you earn ₹10,416" — and answers yes or no. They never
 * quote, never counter, never see another master's number. Rapido, Ola,
 * Uber and Urban Company all work this way and none of them arrived
 * there by accident.
 *
 * ── What breaks if masters name their own price ──────────────────────
 *
 *   1. The customer sees a different price depending on WHO happens to
 *      accept. Two families booking the same decoration for the same
 *      Saturday pay different amounts for no reason either of them can
 *      see. That is not a market, it is a lottery, and it destroys the
 *      one thing a published rate buys you: comparability.
 *
 *   2. "Instant" stops being instant. A quote needs a counter-quote, an
 *      acceptance, a revision. That is the enquiry model — the one this
 *      whole bucket exists to escape, and the one that already exists on
 *      the pre-book side for the cases that genuinely need it.
 *
 *   3. First-accept-wins silently becomes cheapest-wins. The moment
 *      prices differ, dispatch has to wait to compare them, and the
 *      45-second window becomes an auction. Auctions are a fine product;
 *      they are not this one, and they take minutes rather than seconds.
 *
 *   4. Prices become untrustworthy. A master free on a bad week types a
 *      low number, a master in demand types a high one, and the
 *      catalogue's "₹5,000 – ₹60,000" stops meaning anything at all.
 *
 * ── `vendor_services.price` is NOT this ──────────────────────────────
 * Migration 021 gives every partner a price list, and it is real and it
 * stays. It is their own catalogue: what a coordinator reads when
 * sourcing a PRE-BOOK celebration by hand, where a bespoke marquee build
 * genuinely is quote-on-request.
 *
 * It is never read by instant dispatch. `match_partners()` (migration
 * 060) selects on trade, distance, availability and rating — and does
 * not look at price at all. Nothing in this module imports it. If a
 * future change makes a partner's own number reach an instant quote,
 * that is a regression, not a feature.
 *
 * ── Where the platform's number comes from ───────────────────────────
 *   data/servicePricing.js   the rate card: base, unit, size bands
 *   data/marketRates.js      the only component with a real index
 *   config/pricing.js        the collar that bounds any movement
 *
 * All three already existed. This module composes them; it invents no
 * new number of its own.
 */

import { SERVICE_BY_ID, serviceCost, defaultQty } from '../data/servicePricing'
import { marketIndex, COMPONENTS } from '../data/marketRates'
import { perPlateFor } from '../utils/quote'
import { CUISINE_BY_ID } from '../data/cuisineMenus'
import {
  DECOR_BY_ID, CATERING_BY_ID, decorSetupFor, decorSetupCost,
  plateShareForSetup, setupSpec,
  DURATION_PRICED, DURATION_BY_ID, defaultDurationFor,
} from '../data/instantSetups'
import { collar } from '../config/pricing'
import { PLATFORM_FEE_RATE, INSTANT_RATE_MULTIPLIER } from '../config/instantBooking'
import { TAX } from '../config/legal'

/**
 * What an instant catering quote assumes when nobody has chosen a
 * cuisine yet.
 *
 * Karnataka Traditional, because this is a Bengaluru pilot and it is both
 * the most-ordered and the cheapest base plate in the table — an opening
 * estimate should never be the one that surprises somebody upward when
 * they pick what they actually wanted.
 */
const DEFAULT_CUISINE = CUISINE_BY_ID.karnataka

/**
 * Which market component drives which service.
 *
 * Only `provisions` is genuinely tracked (data/marketRates.js explains at
 * length why the rest carry 1.00 and say so). Mapping a service to an
 * untracked component is therefore harmless today and correct the day a
 * real feed appears for it — which is the point of mapping rather than
 * hardcoding 1.00 here.
 *
 * Anything unlisted is not commodity-linked at all. A photographer's day
 * rate is not a market price and must not be made to look like one.
 */
const COMPONENT_FOR_SERVICE = {
  catering: 'provisions',
  cooks:    'provisions',
  menu:     'provisions',
  welcome_drinks: 'provisions',
  breakfast: 'provisions',
  decor:    'decor',
  floral:   'decor',
  stage:    'decor',
  mandap:   'decor',
}

/** Prices are rounded to ₹10, matching `serviceCost`'s reasoning. */
const round10 = n => Math.round(n / 10) * 10

/**
 * The rate card, positioned in the market band.
 *
 * Applied here and nowhere else, so every instant price — the general
 * card, decor, catering — passes through exactly one multiplier. Doing
 * it per-engine would leave one of the three at the old rate, and the
 * one that got missed would be the one nobody checked.
 */
const carded = rupees => round10(rupees * INSTANT_RATE_MULTIPLIER)

/**
 * Services the multiplier must NOT touch.
 *
 * The correction in `INSTANT_RATE_MULTIPLIER` exists because
 * `data/servicePricing.js` prices at the floor of the market band. These
 * three are not priced from that card at all, and applying it pushed
 * each of them ABOVE what Bengaluru actually charges:
 *
 *   catering, cooks   priced per plate by `utils/quote.perPlateFor`,
 *                     off real cuisine rates and batch bands. That is
 *                     already a market number; multiplying it produced
 *                     ₹22,230 against a ₹12,000–21,000 band.
 *
 *   priest            a dakshina is a customary amount, not a rate that
 *                     moves with a market. ×1.30 took it to ₹7,800 for
 *                     a home pooja, which is simply not what is asked.
 *
 * The pattern worth noticing: a blanket multiplier is only safe over
 * numbers that share an origin. These do not, so they are named rather
 * than swept along — and the review script is what caught it.
 */
const ALREADY_AT_MARKET = new Set(['catering', 'cooks', 'menu', 'priest', 'pooja'])

const priced = (serviceId, rupees) =>
  ALREADY_AT_MARKET.has(serviceId) ? round10(rupees) : carded(rupees)
const toPaise  = rupees => Math.round(rupees * 100)

/**
 * The platform's price for one service at this scale, on this date.
 *
 * Returns rupees AND paise: rupees for display, paise for the database
 * and for Razorpay. Deriving one from the other at each call site is how
 * a rounding difference ends up between what was shown and what was
 * charged.
 */
export function priceLine({ serviceId, guestCount = 50, qty = null, setupId = null, cuisineId = null, durationId = null }) {
  // ── Two services are not on the general rate card, deliberately ────
  // `data/servicePricing.js` excludes decor and catering because they
  // are priced by their own engines — billing them from two places is,
  // in that file's words, "the fastest way to lose trust in the whole
  // number". So they are routed rather than approximated.
  if (serviceId === 'decor' || serviceId === 'floral' || serviceId === 'stage') {
    return priceDecorLine({ serviceId, guestCount, setupId })
  }
  if (serviceId === 'catering' || serviceId === 'cooks') {
    return priceCateringLine({ serviceId, guestCount, setupId, cuisineId })
  }

  const service = SERVICE_BY_ID[serviceId]
  if (!service) return null

  const quantity = qty ?? defaultQty(service, guestCount)

  // 1 · The rate card. The platform's published number at this size.
  const cardRupees = serviceCost(service, guestCount, quantity)

  // 1b · Duration, for the trades that charge by time. The rate card
  //      prices a full-day function; most instant bookings are two
  //      hours. See INSTANT_DURATIONS for why headcount cannot express
  //      this — a thirty-guest reception and a thirty-guest birthday
  //      have the same headcount and very different jobs.
  const timed = DURATION_PRICED.has(serviceId)
  const duration = timed
    ? (DURATION_BY_ID[durationId] ?? DURATION_BY_ID[defaultDurationFor(guestCount)])
    : null
  const baseRupees = timed ? round10(cardRupees * duration.factor) : cardRupees

  // 2 · The market, if and only if this service is genuinely linked to a
  //     tracked component. Collared both ways, so no path through here
  //     can produce a number outside what a customer was promised —
  //     including a bug in the index refresh.
  const component = COMPONENT_FOR_SERVICE[serviceId] ?? null
  const index = marketIndex()
  const rawFactor = component ? (index.multipliers[component] ?? 1) : 1
  const factor = collar(rawFactor)

  const finalRupees = priced(serviceId, baseRupees * factor)

  return {
    serviceId,
    serviceName: service.name,
    unit: service.unit,
    qty: quantity,
    durationId: duration?.id ?? null,
    durationScan: duration?.scan ?? null,
    baseRupees,
    factor,
    rupees: finalRupees,
    paise: toPaise(finalRupees),
    /**
     * Frozen for `booking_lines.price_basis`. A receipt re-deriving this
     * from TODAY's index would tell somebody their February booking was
     * priced against August mandi rates.
     */
    basis: priceBasis(component, index, factor),
  }
}

/**
 * Decor at instant scale.
 *
 * NOT `decorCostFor` from utils/quote. That prices the concierge ladder,
 * whose cheapest priceable level is ₹18,000 + ₹35/guest — correct for a
 * styled function installation and roughly four times the real price of
 * a balloon arch at a thirty-guest home birthday. `data/instantSetups.js`
 * carries the short-lead card and explains the split at length.
 *
 * The setup is CHOSEN FOR the customer from headcount rather than asked.
 * "How elaborate would you like it?" is not a question somebody booking
 * for tomorrow can usefully answer; how many people are coming is one
 * they already know. They can still change it.
 */
function priceDecorLine({ serviceId, guestCount, setupId }) {
  const setup = setupId ? DECOR_BY_ID[setupId] : decorSetupFor(guestCount)
  if (!setup) return null

  const baseRupees = decorSetupCost(setup, guestCount)

  // Flowers do move, sharply, around festivals — but there is no open
  // feed for them, so `decor` carries a multiplier of exactly 1.00 and
  // data/marketRates.js says so rather than inventing movement.
  const index = marketIndex()
  const factor = collar(index.multipliers.decor ?? 1)
  const finalRupees = priced(serviceId, baseRupees * factor)

  return {
    serviceId,
    serviceName: setup.name,
    unit: 'setup',
    qty: 1,
    setupId: setup.id,
    baseRupees,
    factor,
    rupees: finalRupees,
    paise: toPaise(finalRupees),
    // The concrete spec. This is what makes "a standard setup" checkable
    // rather than whatever the master decides on the day — see the
    // bait_and_switch entry in config/legal.js.
    spec: setupSpec('decor', setup.id),
    basis: priceBasis('decor', index, factor),
  }
}

/**
 * Catering at instant scale.
 *
 * The per-plate rate comes from `perPlateFor` — the existing engine, with
 * its cuisine base rates and batch-size bands — and is then multiplied by
 * the share of the plate this SHAPE actually bills. A cook who comes to
 * your kitchen while you buy the groceries is not charging for
 * groceries, and PLATE_SPLIT says that is 58% of the plate.
 *
 * An empty `menu` is correct here and is the whole point of the
 * `discuss` flow: the customer books a cook at a standard rate and the
 * dishes are agreed on the call. So the plate is the cuisine's base rate
 * with no dish premiums, which is exactly what `perPlateFor` returns for
 * an empty menu.
 */
function priceCateringLine({ serviceId, guestCount, setupId, cuisineId }) {
  // ── The default setup depends on WHICH service was asked for ──────
  // `catering` and `cooks` are two different products and both land
  // here. Defaulting both to `full_meal` made the picker offer
  // "Everything included · ₹17,100" twice — the same row, the same
  // price, the same words, and no way for a customer to tell which was
  // which. An impossible choice like that does not read as a bug; it
  // reads as an app that does not know what it sells.
  //
  //   catering → the full service, provisions included
  //   cooks    → a cook in your kitchen, you buy the groceries
  const fallback = serviceId === 'cooks' ? 'cook_only' : 'full_meal'
  const setup = CATERING_BY_ID[setupId] ?? CATERING_BY_ID[fallback]
  const cuisine = cuisineId ? CUISINE_BY_ID[cuisineId] : DEFAULT_CUISINE
  if (!setup || !cuisine) return null

  const plate = perPlateFor({ cuisine, menu: {}, menuAllowance: {}, vegOnly: false, guestCount })
  const share = plateShareForSetup(setup.id)
  const baseRupees = round10(plate.perPlate * share * (guestCount || 0))

  const index = marketIndex()
  const factor = collar(index.multipliers.provisions ?? 1)

  // The market only moves the part of the plate that IS provisions, and
  // only when this shape actually bills for them. A cook-only booking is
  // not exposed to mandi rates at all, because the family is buying the
  // vegetables — applying the index to it would be inventing a movement
  // the customer does not experience.
  const provisionExposed = setup.pays.includes('provisions')
  const appliedFactor = provisionExposed ? factor : 1
  const finalRupees = priced(serviceId, baseRupees * appliedFactor)

  return {
    serviceId,
    // The SERVICE names the line; the setup qualifies it. Naming the
    // line after the setup is what collapsed two services into one
    // indistinguishable row.
    serviceName: serviceId === 'cooks' ? 'Cook at your place' : 'Catering & buffet',
    setupName: setup.name,
    setupScan: setup.scan,
    unit: 'per_guest',
    qty: guestCount,
    setupId: setup.id,
    perPlateRupees: round10(plate.perPlate * share),
    baseRupees,
    factor: appliedFactor,
    rupees: finalRupees,
    paise: toPaise(finalRupees),
    spec: setupSpec('catering', setup.id),
    basis: provisionExposed
      ? priceBasis('provisions', index, appliedFactor)
      : priceBasis(null, index, 1),
  }
}

/**
 * What backs this number, in a form a customer can be shown and a
 * receipt can reproduce.
 *
 * The honest cases are the important ones. `tracked: false` and
 * `live: false` both produce a statement about the BASELINE rather than
 * a claim of a live reading, because data/marketRates.js is explicit
 * that only provisions has a real feed and that a stale or absent index
 * resolves to 1.00.
 */
export function priceBasis(component, index = marketIndex(), factor = 1) {
  const meta = component ? COMPONENTS[component] : null

  if (!component || !meta) {
    return {
      kind: 'researched',
      asOf: null,
      tracked: false,
      // scan tier — under 10 words, per config/instantBooking.js
      scan: 'Bengaluru market rate',
      detail:
        'Researched against Bengaluru rates for this service and reviewed periodically. ' +
        'There is no public daily index for this trade, so this is a standing rate, ' +
        'not a live reading — and your master confirms before any work starts.',
    }
  }

  if (!meta.tracked || !index.live) {
    return {
      kind: 'baseline',
      asOf: index.asOf ?? null,
      tracked: !!meta.tracked,
      component,
      scan: 'Standing rate',
      detail:
        `${meta.label} is priced at our standing baseline. ${meta.source}. ` +
        'We do not adjust a price we cannot evidence.',
    }
  }

  const pct = Math.round((factor - 1) * 1000) / 10
  const direction = pct === 0 ? 'unchanged' : pct > 0 ? `up ${pct}%` : `down ${Math.abs(pct)}%`

  return {
    kind: 'indexed',
    asOf: index.asOf,
    tracked: true,
    component,
    factor,
    basket: index.basket ?? [],
    scan: `Mandi rates ${direction}`,
    detail:
      `${meta.label} moves with the market and is about 58% of what a plate costs. ` +
      `Priced against ${meta.source}, read ${index.asOf}. Currently ${direction} ` +
      'against our baseline — if rates fall, you pay less.',
  }
}

/**
 * What the master actually receives.
 *
 * ── Why the statutory deductions are a THIRD slice ───────────────────
 * TCS (GST s.52) and TDS (s.194-O) are collected by the platform on the
 * master's behalf and deposited with the authorities. They are not
 * Sambramo's income and must never be folded into the commission — a
 * report that conflated them would overstate revenue and understate what
 * was remitted, which are the two worst directions to be wrong in.
 *
 * ── Why the offer card shows NET ─────────────────────────────────────
 * A master shown "You earn ₹10,540" who receives ₹10,416 will conclude
 * they were short-changed, and they will be right to ask. They decide in
 * five seconds, one-handed, often in a vehicle — so the headline is the
 * number that reaches their account and the arithmetic is one tap away.
 *
 * ── TDS is usually nil for this supply base ──────────────────────────
 * s.194-O exempts an individual or HUF below the annual threshold who
 * has furnished a PAN. Most individual cooks, dhol players and mehendi
 * artists are exactly that, which is why `partner_payout_accounts`
 * stores a PAN and why collecting it is worth a screen.
 */
export function partnerEarnings(quotedPaise, {
  hasPan = false,
  annualGrossInr = 0,
  feeRate = PLATFORM_FEE_RATE,
} = {}) {
  const gross = Math.max(0, Math.round(quotedPaise))

  const fee = Math.round(gross * feeRate)
  const afterFee = gross - fee

  // TCS is on the net taxable value of the supply, and applies regardless
  // of PAN or threshold.
  const tcs = Math.round(afterFee * TAX.tcsRate)

  // TDS is waived for a below-threshold individual with a PAN on file.
  const tdsApplies = !(hasPan && annualGrossInr < TAX.tdsExemptionThresholdInr)
  const tds = tdsApplies ? Math.round(afterFee * TAX.tdsRate) : 0

  const net = afterFee - tcs - tds

  return {
    grossPaise: gross,
    feePaise: fee,
    feeRate,
    tcsPaise: tcs,
    tdsPaise: tds,
    tdsWaived: !tdsApplies,
    netPaise: net,
    /** Itemised for the breakdown sheet. Order matches how it is read. */
    lines: [
      { id: 'gross', label: 'Job value',        paise: gross,  sign: '+' },
      { id: 'fee',   label: 'Platform fee',     paise: -fee,   sign: '-', note: `${Math.round(feeRate * 100)}%` },
      { id: 'tcs',   label: 'TCS (GST)',        paise: -tcs,   sign: '-', note: 'deposited for you' },
      { id: 'tds',   label: 'TDS',              paise: -tds,   sign: '-',
        note: tdsApplies ? 'deposited for you' : 'waived — PAN on file' },
      { id: 'net',   label: 'To your account',  paise: net,    sign: '=' },
    ].filter(l => l.id !== 'tds' || tdsApplies || hasPan),
  }
}

/**
 * The split written onto `booking_lines`.
 *
 * `platform_fee_paise + partner_amount_paise = quoted_amount_paise` is a
 * CHECK constraint in migration 059, so this must balance exactly. The
 * statutory deductions come out of the partner's share at PAYOUT time and
 * are recorded on the escrow ledger — they are not part of this split,
 * or the constraint would fail and the arithmetic would stop closing.
 */
export function lineSplit(quotedPaise, feeRate = PLATFORM_FEE_RATE) {
  const gross = Math.max(0, Math.round(quotedPaise))
  const fee = Math.round(gross * feeRate)
  return {
    quoted_amount_paise: gross,
    platform_fee_rate: feeRate,
    platform_fee_paise: fee,
    partner_amount_paise: gross - fee,
  }
}
