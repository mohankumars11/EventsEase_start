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

export function engineReadyOnce() {
  probe ??= supabase.from('sambramo_trade_registry').select('id', { head: true, count: 'exact' })
    .then(({ error, count }) => !error && count > 0, () => false)
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
