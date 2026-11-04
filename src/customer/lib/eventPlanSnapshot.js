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

export function savedContextFor(occasion, picks = {}, event = {}, place = null) {
  return {
    ...contextFor(occasion, picks, event),
    venueChoice: event.venueChoice ?? null,
    venueKind: event.venueKind ?? null,
    venueOther: event.venueOther ?? null,
    budgetChoice: event.budget ?? null,
    eventPlace: place ?? null,
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
  return { event, picks, place: c.eventPlace ?? null }
}
