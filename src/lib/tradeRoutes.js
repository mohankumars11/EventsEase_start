import { configFor } from '../data/trades'
import { supabase } from './supabase'

/**
 * Where a trade's onboarding lives, and what happens after it is submitted.
 * Small on purpose: the selector, the Jobs card and More import this
 * without pulling the trade flows into their bundles.
 */

/** /partner/onboard/<registry id> — e.g. /partner/onboard/catering_food */
export const onboardPath = trade => `/partner/onboard/${encodeURIComponent(configFor(trade)?.id ?? trade)}`

/**
 * After the server accepted a listing: put the ACCOUNT in the operator
 * queue with the existing submit_for_review() (idempotent; never blocks),
 * then land on Jobs with the confirmation (?submitted=, &version=).
 */
export async function afterSubmission(navigate, trade, result) {
  try { await supabase.rpc('submit_for_review') } catch { /* listing is in; account review can follow */ }
  const q = new URLSearchParams({ submitted: trade ?? '' })
  if (result?.version_id) q.set('version', result.version_id)
  navigate(`/dashboard/vendor?${q}`, { replace: true })
}
