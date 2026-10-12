/**
 * Is the shared trades engine live in this database?
 *
 * The engine needs migrations 20261010_07/_08/_09. Until the registry table
 * answers, every screen keeps the behaviour it had before, so an app build
 * shipped ahead of the paste never strands a partner on a submit that cannot
 * succeed. Asked once per app session; null while the answer is pending.
 */
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { configFor } from '../data/trades'
import { hasProfileFor } from '../data/tradePricingProfiles'

let probe = null

/* A hanging request is not a pending answer.
   The probe had no timeout, so on a request that never settles — a dead
   zone, a captive portal, Supabase unreachable — it stayed pending for
   the life of the session, and AddItemFlow's `engineReady === null`
   branch rendered a blank screen behind it with nothing to tap. Falling
   back to false after this long is the same answer the error path
   already gives, and it is the safe one: the legacy flow still works. */
const PROBE_TIMEOUT_MS = 8000

export function engineReadyOnce() {
  probe ??= Promise.race([
    supabase.from('sambramo_trade_registry').select('id', { head: true, count: 'exact' })
      .then(({ error, count }) => !error && count > 0, () => false),
    new Promise(resolve => setTimeout(() => resolve(false), PROBE_TIMEOUT_MS)),
  ])
  return probe
}

export function useEngineReady() {
  const [ready, setReady] = useState(null)
  useEffect(() => {
    let live = true
    engineReadyOnce().then(ok => { if (live) setReady(ok) })
    return () => { live = false }
  }, [])
  return ready
}

/** Every registry trade except Anchor & MC lists through the shared engine. */
export const onEngine = t => !!t && !hasProfileFor(t) && !!configFor(t) && configFor(t).id !== 'anchor_mc'
