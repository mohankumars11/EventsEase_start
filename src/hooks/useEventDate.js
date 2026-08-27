import { INSTANT_HORIZON_DAYS, CHOOSE_MIN_DAYS } from '../config/pricing'
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
export function planHrefFor(picked, occasionId = null) {
  const params = new URLSearchParams()
  if (picked?.event_date) params.set('date', picked.event_date)
  if (picked?.time_slot) params.set('slot', picked.time_slot)
  if (occasionId) params.set('occasion', occasionId)
  const qs = params.toString()

  /* ── The fork ────────────────────────────────────────────────────────
   *
   * A date near enough to book directly goes to instant dispatch; a
   * date far enough to plan properly goes to the guided journey. This is
   * the ONLY place that decision is made, for the same reason the
   * comment above gives about the three entry points drifting: a second
   * copy of this rule would eventually send the same customer to two
   * different products.
   *
   * ── The customer is never asked in OUR words ─────────────────────
   * "Instant booking" and "pre-booking" name our machinery. A family
   * knows when their daughter's birthday is; they do not know, and
   * should not have to care, that thirty days is where dispatch stops
   * working.
   *
   * At the ends of the range there is one honest answer and the fork is
   * silent. In the middle — three to thirty days — both lanes are real
   * and genuinely different products, so the customer chooses between
   * them in their own terms. See pages/book/ChooseLane.
   *
   * ── A flexible date is not an instant date ──────────────────────
   * `flexible_date` means "somewhere around then", and dispatch blocks a
   * specific day on a specific master's calendar. Offering a master a
   * job whose date might move is how a master stops trusting the
   * notifications, so anything flexible goes to the journey regardless
   * of how soon it is.
   */
  if (picked?.event_date && !picked?.flexible_date) {
    const day = new Date(picked.event_date)
    day.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysOut = Math.round((day - today) / 86_400_000)

    /* ── Under three days: book, do not ask ──────────────────────────
     * There is no time for a coordinator to source anything, so offering
     * that door would be offering something we cannot deliver. One
     * honest answer, so no question. */
    if (daysOut >= 0 && daysOut < CHOOSE_MIN_DAYS) {
      return `/book/instant?${qs}`
    }

    /* ── Three to thirty days: both are real, so ask ─────────────────
     * A naming ceremony in three weeks can genuinely go either way, and
     * they are different products. Silently picking one hands somebody a
     * quick-booking flow for something they wanted to think about, with
     * no way back but abandoning. See pages/book/ChooseLane. */
    if (daysOut >= CHOOSE_MIN_DAYS && daysOut <= INSTANT_HORIZON_DAYS) {
      return `/book/choose?${qs}`
    }
  }

  return qs ? `/plan?${qs}` : '/plan'
}
