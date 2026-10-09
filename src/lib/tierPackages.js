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

/* ══════════════════════════════════════════════════════════════════════
   v3: packages from the partner's pricing MODELS
   ══════════════════════════════════════════════════════════════════════
   Mirrors submit_anchor_listing_version (migration 20261010_03) line for
   line. Inputs are take-home RUPEES as typed; config comes from
   sambramo_pricing_config (DEFAULT_CONFIG until it has loaded). */
export const DEFAULT_CONFIG = { platform_fee_rate: 0.08, signature_uplift: 1.75, vip_factor: 2 }

export function customerPaiseWith(takeHomePaise, cfg = DEFAULT_CONFIG) {
  return round10((Number(takeHomePaise) || 0) / (1 - cfg.platform_fee_rate))
}

const num = x => Number(x) || 0

export function tiersFromModels(pricing = {}, cfg = DEFAULT_CONFIG) {
  const on = pricing.models ?? []
  const m = id => (on.includes(id) ? pricing[id] ?? {} : null)
  const hour = m('hour'), session = m('session'), event = m('event')
  const half = m('half_day'), full = m('full_day'), multi = m('multi_day')

  let e = null
  if (hour && num(hour.rate) && num(hour.min_hours)) e = { take: num(hour.rate) * 100 * num(hour.min_hours), hours: num(hour.min_hours), basis: 'hour' }
  else if (session && num(session.rate)) e = { take: num(session.rate) * 100, hours: num(session.hours) || 2, basis: 'session' }
  else if (event && num(event.rate)) e = { take: num(event.rate) * 100, hours: num(event.hours) || 4, basis: 'event' }
  else if (half && num(half.rate)) e = { take: num(half.rate) * 100, hours: num(half.hours) || 4, basis: 'half_day' }
  else if (full && num(full.rate)) e = { take: num(full.rate) * 100, hours: num(full.hours) || 8, basis: 'full_day' }
  else if (multi && num(multi.rate)) e = { take: num(multi.rate) * 100, hours: num(multi.hours) || 8, basis: 'multi_day' }
  if (!e) return []

  const maxHours = Math.max(num(hour?.max_hours), num(full?.hours) || (full ? 8 : 0),
    num(event?.hours), num(half?.hours) || (half ? 4 : 0), e.hours)
  const sig = { take: Math.round(e.take * cfg.signature_uplift), hours: Math.min(e.hours * 2, maxHours), basis: e.basis }
  let vip
  if (full && num(full.rate)) vip = { take: Math.round(num(full.rate) * 100 * cfg.vip_factor), hours: num(full.hours) || 8, basis: 'full_day' }
  else if (hour && num(hour.rate) && num(hour.max_hours)) vip = { take: Math.round(num(hour.rate) * 100 * num(hour.max_hours) * cfg.vip_factor), hours: num(hour.max_hours), basis: 'hour' }
  else vip = { take: Math.round(e.take * cfg.vip_factor), hours: maxHours, basis: e.basis }

  return [
    { tier: 'ESSENTIAL', name: 'Essential', ...e },
    { tier: 'SIGNATURE', name: 'Signature', badge: 'Most popular', ...sig },
    { tier: 'VIP', name: 'VIP', ...vip },
  ].map(t => ({ ...t, duration_hours: t.hours, take_home_paise: t.take, price_paise: customerPaiseWith(t.take, cfg) }))
}
