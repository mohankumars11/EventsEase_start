/**
 * Pure snapshot mapping for customer event plans.
 *
 * Keep the rule-engine context and the extra customer journey facts in one
 * account snapshot. The recommendation engine only receives the validated
 * fields from contextFor(); persistence also retains the selected venue and
 * event place so a plan can resume accurately on another device.
 */
import { contextFor } from './eventContext.js'

const ABOUT = [
  'venueProvides', 'venueType', 'setting', 'formats', 'food', 'drinks', 'media',
  'travel', 'public', 'children', 'accessibility', 'privacy', 'budget',
]

export function savedContextFor(occasion, picks = {}, event = {}, place = null, needs = {}) {
  const prefix = `${occasion?.id}:`
  const serviceNeeds = Object.fromEntries(
    Object.entries(needs ?? {})
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  )
  return {
    ...contextFor(occasion, picks, event),
    venueChoice: event.venueChoice ?? null,
    venueKind: event.venueKind ?? null,
    venueOther: event.venueOther ?? null,
    budgetChoice: event.budget ?? null,
    eventPlace: place ?? null,
    $serviceNeeds: serviceNeeds,
  }
}

/** Rehydrate the event, explicit decisions, and event location from account data. */
export function planFromSaved(row) {
  const c = row?.context ?? {}
  const venueChoice = c.venueChoice
    ?? (c.venueType === 'home' ? 'home' : c.venueBooked ? 'have' : 'need')
  const event = {
    occasionId: row?.occasion_id ?? null,
    date: c.date ?? null,
    time: c.time ?? null,
    hours: c.hours ?? null,
    guests: c.guests ?? null,
    venue: venueChoice === 'need' ? 'need' : 'have',
    venueChoice,
    venueKind: c.venueKind ?? null,
    venueOther: c.venueOther ?? '',
    budget: c.budgetChoice ?? '',
    context: Object.fromEntries(Object.entries(c).filter(([key]) => ABOUT.includes(key))),
  }
  const decisionToPick = { selected: 'need', removed: 'skip', arranged: 'have', later: 'later' }
  const picks = {}
  for (const service of row?.event_plan_services ?? []) {
    const value = decisionToPick[service.decision]
    if (value) picks[service.trade_id] = value
  }
  const needs = Object.fromEntries(
    Object.entries(c.$serviceNeeds ?? {}).map(([tradeId, value]) => [`${row.occasion_id}:${tradeId}`, value]),
  )
  return { event, picks, place: c.eventPlace ?? null, needs }
}

/**
 * Map current plan decisions into rows for event_plan_services while
 * preserving any booking linkage already stored for that trade.
 */
const DECISION = { need: 'selected', skip: 'removed', have: 'arranged', later: 'later' }

export function serviceRowsForPlan(planId, statuses = {}, picks = {}, lines = [], previousServices = []) {
  const previousByTrade = Object.fromEntries(previousServices.map(row => [row.trade_id, row]))
  return Object.entries(statuses)
    .filter(([tradeId]) => picks[tradeId] || statuses[tradeId] === 'CORE' || lines.some(line => line.tradeId === tradeId))
    .map(([tradeId, status]) => {
      const line = lines.find(item => item.tradeId === tradeId)
      const previous = previousByTrade[tradeId]
      return {
        plan_id: planId,
        trade_id: tradeId,
        recommendation_status: status,
        decision: DECISION[picks[tradeId]] ?? 'recommended',
        vendor_service_id: line?.serviceId ?? previous?.vendor_service_id ?? null,
        booking_line_id: previous?.booking_line_id ?? null,
      }
    })
}
