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
  const lineByTrade = Object.fromEntries(lines.map(line => [line.tradeId, line]))
  const tradeIds = new Set([
    ...Object.entries(statuses)
      .filter(([tradeId, status]) => picks[tradeId] || status === 'CORE' || lineByTrade[tradeId])
      .map(([tradeId]) => tradeId),
    // A completed booking is historical truth. Keep its link even if the
    // customer later changes the planning preference for that trade.
    ...previousServices.filter(row => row.booking_line_id).map(row => row.trade_id),
  ])

  return [...tradeIds].map(tradeId => {
    const line = lineByTrade[tradeId]
    const previous = previousByTrade[tradeId]
    const booked = !!previous?.booking_line_id
    return {
      plan_id: planId,
      trade_id: tradeId,
      recommendation_status: statuses[tradeId] ?? previous?.recommendation_status ?? 'CORE',
      decision: booked ? 'selected' : (DECISION[picks[tradeId]] ?? 'recommended'),
      vendor_service_id: line?.serviceId ?? previous?.vendor_service_id ?? null,
      booking_line_id: previous?.booking_line_id ?? null,
    }
  })
}

/**
 * Service rows are a snapshot, not an append-only log. Remove obsolete
 * unbooked rows after the new snapshot has been written; booked rows are
 * retained by serviceRowsForPlan and must never be pruned by autosave.
 */
export function staleServiceIds(previousServices = [], currentRows = []) {
  const current = new Set(currentRows.map(row => row.trade_id))
  return previousServices
    .filter(row => row.trade_id && !row.booking_line_id && !current.has(row.trade_id))
    .map(row => row.trade_id)
}
