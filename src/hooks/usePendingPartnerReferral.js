import { useEffect, useRef, useState } from 'react'
import { claimPendingPartnerRef, pendingPartnerRef } from '../lib/referrals'

/**
 * Claim an invitation code that arrived before the partner row did.
 *
 * Runs once there is a vendor to attach it to, and at most once per
 * mount. The server decides everything — whether the code exists, has
 * expired, was already used, or is the partner's own — and answers with
 * one sentence for every refusal (migration 158).
 *
 * @returns null until something was claimed or refused, then the answer
 */
export function usePendingPartnerReferral(vendorId) {
  const [result, setResult] = useState(null)
  const tried = useRef(false)

  useEffect(() => {
    if (!vendorId || tried.current || !pendingPartnerRef()) return
    tried.current = true
    claimPendingPartnerRef().then(r => { if (r && !r.pending) setResult(r) })
  }, [vendorId])

  return result
}
