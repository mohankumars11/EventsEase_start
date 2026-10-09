/**
 * Tier package math, client side.
 *
 * A PREVIEW only. The server's generate_sambramo_tier_packages (migration
 * 20261009) is the authority and writes the real rows; this mirrors its
 * arithmetic line for line so the number a partner sees while typing is the
 * number the server will store. If the two ever disagree, the RPC wins and
 * this file is the bug.
 *
 *   Essential  take_home * min_hrs / (1 - fee)              at min_hrs
 *   Signature  Essential * 1.75                             at 2 * min_hrs
 *   VIP        take_home * max_hrs * vip_multiplier / (1-fee) at max_hrs
 *
 * Everything is integer paise, rounded to 10 paise, exactly as the RPC does.
 */
import { PLATFORM_FEE_RATE } from '../config/instantBooking'

export const FEE_RATE = PLATFORM_FEE_RATE // 0.08
export const SIGNATURE_MULTIPLIER = 1.75

const round10 = paise => Math.round(paise / 10) * 10

/** What a customer pays for `takeHomeRupees` of partner earnings. */
export function customerPaise(takeHomeRupees) {
  return round10((Number(takeHomeRupees) || 0) * 100 / (1 - FEE_RATE))
}

/** The three tiers from baseline inputs, or [] when there is nothing to price. */
export function tierPreview({ take_home_per_hour, min_duration_hours, max_duration_hours, vip_multiplier }) {
  const takeHome = Number(take_home_per_hour) || 0
  const minHrs = Number(min_duration_hours) || 0
  const maxHrs = Number(max_duration_hours) || 0
  const mult = Number(vip_multiplier) || 0
  if (takeHome <= 0 || minHrs <= 0 || maxHrs < minHrs || mult <= 0) return []

  const essential = round10(takeHome * 100 * minHrs / (1 - FEE_RATE))
  const signature = round10(essential * SIGNATURE_MULTIPLIER)
  const vip = round10(takeHome * 100 * maxHrs / (1 - FEE_RATE) * mult)

  return [
    { tier: 'ESSENTIAL', name: 'Essential', duration_hours: minHrs, price_paise: essential },
    { tier: 'SIGNATURE', name: 'Signature', duration_hours: minHrs * 2, price_paise: signature, badge: 'Most popular' },
    { tier: 'VIP', name: 'VIP', duration_hours: maxHrs, price_paise: vip },
  ]
}

/** Partner's share of a customer price, for the "you receive" line. */
export function takeHomeOf(pricePaise) {
  return Math.round((Number(pricePaise) || 0) * (1 - FEE_RATE))
}

export const rupees = paise =>
  '₹' + Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')
