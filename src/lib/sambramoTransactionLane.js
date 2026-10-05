import { pricingPolicyFor } from '../data/sambramoPricingPolicy'

export const TRANSACTION_LANES = Object.freeze({
  INSTANT_BOOK_PAY: 'INSTANT_BOOK_PAY',
  INSTANT_QUOTE_PAY: 'INSTANT_QUOTE_PAY',
})

const QUOTE_UNITS = new Set(['custom quote', 'quote'])

/**
 * Partner never chooses the transaction lane. The platform derives it
 * from the trade/package structure, then re-evaluates the customer's
 * actual requirement at checkout/dispatch time.
 */
export function transactionLaneFor({ tradeId, pricingUnit, customFirst = false } = {}) {
  const unit = String(pricingUnit ?? '').trim().toLowerCase()
  const policy = pricingPolicyFor(tradeId)
  if (customFirst || QUOTE_UNITS.has(unit) || policy?.customFirst) {
    return TRANSACTION_LANES.INSTANT_QUOTE_PAY
  }
  return TRANSACTION_LANES.INSTANT_BOOK_PAY
}

export function transactionLaneCopy(lane, { concise = false } = {}) {
  if (lane === TRANSACTION_LANES.INSTANT_QUOTE_PAY) {
    return concise ? 'Instant Quote & Pay' : 'Instant Quote & Pay · Sambramo routes complex requirements to eligible partners.'
  }
  return concise ? 'Instant Book & Pay' : 'Instant Book & Pay · Standard requirements are priced and checked instantly.'
}

export function transactionLaneForPackage({ packageRow, config } = {}) {
  const laneFromStored = packageRow?.commercial_inputs?.transaction_lane
  if (laneFromStored === TRANSACTION_LANES.INSTANT_QUOTE_PAY || laneFromStored === TRANSACTION_LANES.INSTANT_BOOK_PAY) {
    return laneFromStored
  }
  return transactionLaneFor({
    tradeId: config?.trade_id,
    pricingUnit: packageRow?.pricing_unit ?? packageRow?.commercial_inputs?.pricing_unit,
    customFirst: packageRow?.commercial_inputs?.custom_first === true,
  })
}
