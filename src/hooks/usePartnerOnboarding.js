import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchListings } from '../lib/partnerListings'
import { fetchDocuments } from '../lib/partnerDocuments'
import {
  onboardingSteps, currentStep, canOpen, completedCount,
  onboardingComplete, partnerLifecycle, STEPS, STATUS, LIFECYCLE,
} from '../lib/partnerOnboarding'

/**
 * Everything the six-step controller needs, read once.
 *
 * Four reads, because four different tables answer "how far through is
 * this partner": the vendors row, their trades, their documents and
 * their payout account. They are fetched together rather than by each
 * step screen, so the progress list and the screen a partner is looking
 * at cannot disagree — which they did whenever a step owned its own
 * query and refreshed at a different moment.
 *
 * Nothing here decides completion. lib/partnerOnboarding.js does that,
 * from these rows, and is pure so it can be tested without a database.
 */
export function usePartnerOnboarding() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState({
    vendor: null, listings: [], documents: {}, payout: null,
  })
  const runId = useRef(0)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    const run = ++runId.current
    setLoading(true)
    try {
      const { data: vendor } = await supabase
        .from('vendors').select('*').eq('profile_id', user.id).maybeSingle()
      if (run !== runId.current) return

      let listings = [], documents = {}, payout = null
      if (vendor?.id) {
        const [ls, docs, pay] = await Promise.all([
          fetchListings(vendor.id),
          fetchDocuments(vendor.id),
          supabase.from('vendor_payout_details')
            .select('method, upi_id, account_number, verified_at')
            .eq('vendor_id', vendor.id).maybeSingle(),
        ])
        if (run !== runId.current) return
        listings = ls ?? []
        /* The whole shape, not just byKind. Everything downstream now
           keys on requirement_id — five trade requirements share the
           kind 'shop_licence', so byKind cannot tell a food licence
           from a venue lease. byKind rides along for the screens not
           yet moved across. */
        documents = docs ?? {}
        payout = pay?.data ?? null
      }
      setAccount({ vendor: vendor ?? null, listings, documents, payout })
    } catch {
      /* A partner we cannot read is left at the start rather than
         pushed somewhere by a half-answer. */
    } finally {
      if (run === runId.current) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const steps = onboardingSteps(account)

  /**
   * Record that a step was explicitly finished.
   *
   * Only step 4 genuinely needs this — see the note on complianceDone —
   * but it is written for any step so the column means one thing. It is
   * a bookmark: `onboardingSteps` still derives status from the data,
   * so a stale marker cannot make an unfinished step look done.
   */
  const markStepComplete = useCallback(async (stepId) => {
    const id = account.vendor?.id
    if (!id) return
    const next = [...new Set([...(account.vendor.completed_steps ?? []), stepId])]
    try {
      await supabase.from('vendors')
        .update({ completed_steps: next, current_onboarding_step: stepId })
        .eq('id', id)
    } catch { /* 119 not applied — the derived status still holds */ }
    await load()
  }, [account.vendor, load])

  return {
    loading,
    account,
    steps,
    STEPS,
    STATUS,
    LIFECYCLE,
    current: currentStep(account),
    done: completedCount(account),
    complete: onboardingComplete(account),
    lifecycle: partnerLifecycle(account),
    canOpen: id => canOpen(id, account),
    markStepComplete,
    refresh: load,
    profile,
  }
}
