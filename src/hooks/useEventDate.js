import { useSyncExternalStore } from 'react'
import { todayISO } from '../utils/format'

/**
 * The one date the customer picked, shared by every calendar in the app.
 *
 * Before this, each place that asked for a date kept its own answer. Pick a
 * Saturday on the home card and the wizard's calendar opened blank; pick one
 * in the wizard and the home card still asked as though nothing had happened.
 * The customer had answered the same question three times and the app looked
 * like it had not been listening.
 *
 * So the date lives here, outside React, and every calendar reads and writes
 * this one value: the home card, the demand popup, the plan hub and step 2 of
 * the wizard all open on whatever was last chosen.
 *
 * ── Why a store and not a context ────────────────────────────────────
 *
 * A provider would have to wrap the router in App.jsx, and every consumer
 * would then be un-renderable in isolation. `useSyncExternalStore` gives the
 * same shared value with no provider and no wiring — the components stay
 * independently mountable, which is how they are checked.
 *
 * ── Session, not local ───────────────────────────────────────────────
 *
 * sessionStorage, matching the wizard's own draft: a date is a fact about the
 * visit someone is making right now. Reopening the app next week to a stale
 * date pre-filled — for an event that may already have happened — is worse
 * than asking again. Past dates are dropped on read for the same reason.
 */

export const EVENT_DATE_KEY = 'sambramo_event_date'

/** @typedef {{event_date:string,time_slot?:string,flexible_date?:boolean,date_window_days?:number|null}} PickedDate */

function read() {
  try {
    const raw = sessionStorage.getItem(EVENT_DATE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value?.event_date) return null
    // A date that has passed is no longer an answer to "when is it?".
    if (value.event_date < todayISO()) return null
    return value
  } catch {
    return null            // storage off, private mode, or SSR. Not an error.
  }
}

let snapshot = read()
const listeners = new Set()

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return snapshot
}

/** The picked date right now, outside a component. */
export function getEventDate() {
  return snapshot
}

/**
 * Save the pick. Pass null to forget it.
 *
 * The object identity changes on every write, which is what
 * `useSyncExternalStore` compares — so callers must not mutate what they read.
 */
export function setEventDate(picked) {
  snapshot = picked?.event_date
    ? {
        event_date: picked.event_date,
        time_slot: picked.time_slot || '',
        flexible_date: !!picked.flexible_date,
        date_window_days: picked.flexible_date ? (picked.date_window_days ?? null) : null,
      }
    : null

  try {
    if (snapshot) sessionStorage.setItem(EVENT_DATE_KEY, JSON.stringify(snapshot))
    else sessionStorage.removeItem(EVENT_DATE_KEY)
  } catch { /* storage off; the in-memory value still works for this page */ }

  listeners.forEach(fn => fn())
}

export function clearEventDate() {
  setEventDate(null)
}

/** Subscribe a component to the picked date. */
export function useEventDate() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Where a chosen date goes next: the occasion picker, never step 1 of 6.
 *
 * Every entry point routes through this one function so the three of them
 * cannot drift apart again — which they did, twice. /plan asks "what are we
 * celebrating?" with the occasions, the offers and the prices around it, and
 * forwards this query string into the wizard when the customer is ready.
 */
export function planHrefFor(picked) {
  const params = new URLSearchParams()
  if (picked?.event_date) params.set('date', picked.event_date)
  if (picked?.time_slot) params.set('slot', picked.time_slot)
  const qs = params.toString()
  return qs ? `/plan?${qs}` : '/plan'
}
