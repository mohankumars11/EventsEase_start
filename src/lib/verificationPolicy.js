import { supabase } from './supabase'
import { policyFrom } from './verification/policy'

/**
 * Read `verification_policy_live` (migration 146).
 *
 * The shaping is in lib/verification/policy.js, which imports nothing
 * and is therefore testable without a database. This file is the one
 * line that talks to PostgREST, kept separate for the same reason
 * lib/availability.js is pure and useVendorAccount is not.
 */

export { policyFrom }

/** PostgREST's "that relation does not exist". Migrations are pasted by
 *  hand here, so a missing table is a normal state, not an error. */
const missingRelation = error =>
  error?.code === '42P01' || /does not exist/i.test(error?.message ?? '')

/**
 * Read it. Returns `{ policy, unavailable }`.
 *
 * `policy` is null whenever it could not be read, which the engine
 * treats as "nothing is mandatory". `unavailable` distinguishes "the
 * migration is not applied" from "there are no rules yet", because the
 * banner the partner sees should not claim a rulebook exists when the
 * table does not.
 */
export async function fetchVerificationPolicy({ market = null } = {}) {
  const { data, error } = await supabase
    .from('verification_policy_live')
    .select('requirement_id, market, trade, service, mandatory_from, effective_until, version')

  if (error) {
    if (missingRelation(error)) return { policy: null, unavailable: true }
    /* A real failure. Still null, still nothing mandatory — see the
       header. Reported so a caller can say "we could not check" rather
       than "you are fine". */
    return { policy: null, unavailable: true, error: error.message }
  }

  return { policy: policyFrom(data ?? [], { market }), unavailable: false }
}
