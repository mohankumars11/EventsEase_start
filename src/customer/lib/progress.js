/**
 * Where the customer left each celebration (Mohan, 2026-11-13: "if you go
 * back to the home tab, the system should pop up the tracking … save the
 * progress, keep popping up until he completes it, with a small cancel —
 * like Rapido does with a booking you started").
 *
 *   useProgress(occasionId, stage, path?)   each flow screen records itself
 *   latestProgress()                         the one to offer on Home
 *   progressOf(occasionId)                   for My Bookings' "Continue"
 *   dismissProgress(occasionId)              the small ×; the plan is kept
 *
 * Stages are the five of the journey (ui/EventJourney): details, plan,
 * preferences, masters, confirm. A route with a query (?t=photography)
 * is kept, so "Continue" lands on the very service being chosen.
 * Device-only (localStorage); the plan itself lives in PlanContext.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const KEY = 'sbm.cx.progress.v1'
export const STAGES = ['Details', 'Your plan', 'Preferences', 'Masters', 'Confirm']
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {} } catch { return {} } }
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage off */ } }
const listeners = new Set()
const notify = () => listeners.forEach(f => f())
export const onProgress = f => { listeners.add(f); return () => listeners.delete(f) }

export function recordProgress(occasionId, stage, path) {
  if (!occasionId) return
  const all = read()
  const prev = all[occasionId]
  /* Never walk the record backwards because someone peeked at an earlier screen. */
  const s = prev && !prev.dismissed && prev.stage > stage ? prev.stage : stage
  const p = prev && !prev.dismissed && prev.stage > stage ? prev.path : path
  all[occasionId] = { occasionId, stage: s, path: p, at: Date.now(), dismissed: false }
  write(all); notify()
}
export const progressOf = occasionId => { const x = read()[occasionId]; return x && !x.dismissed ? x : null }
export function latestProgress({ maxAgeDays = 30 } = {}) {
  const now = Date.now()
  return Object.values(read()).filter(x => !x.dismissed && now - x.at < maxAgeDays * 86400000).sort((a, b) => b.at - a.at)[0] ?? null
}
export function dismissProgress(occasionId) { const all = read(); if (all[occasionId]) { all[occasionId].dismissed = true; write(all); notify() } }
export function clearProgress(occasionId) { const all = read(); delete all[occasionId]; write(all); notify() }

/** Record this screen as where the celebration stands. */
export function useProgress(occasionId, stage, enabled = true) {
  const { pathname, search } = useLocation()
  useEffect(() => { if (enabled && occasionId) recordProgress(occasionId, stage, pathname + search) }, [occasionId, stage, pathname, search, enabled])
}
