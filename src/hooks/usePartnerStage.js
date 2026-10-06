import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { partnerStage, routeForStage, STAGE } from '../lib/partnerStage'

/**
 * The signed-in partner's stage, for the screens that route on it.
 *
 * Two small reads, not `useVendorAccount`. That hook pulls availability,
 * bookings and reviews as well, and the entry points asking this question
 * — RootScreen, the sign-in screen — are deciding a redirect before any
 * of that is on screen. Fetching a partner's whole account to answer
 * "have they set up yet" puts four round trips in front of a redirect.
 *
 * ── `select('*')` on vendors is deliberate ──────────────────────────
 * Migration 119 adds `onboarding_status` and `current_onboarding_step`.
 * Naming them in the select would make this hook fail outright — a 400
 * from PostgREST, on the first screen after sign-in — on any database
 * where 119 has not been pasted in yet. A star returns whatever the row
 * actually has, and partnerStage() treats a missing column as "not set".
 */
export function usePartnerStage() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState({ vendor: null, services: [] })
  const runId = useRef(0)

  const load = useCallback(async () => {
    if (!user?.id || profile?.role !== 'vendor') { setLoading(false); return }
    const run = ++runId.current
    setLoading(true)
    try {
      const { data: vendor } = await supabase
        .from('vendors').select('*').eq('profile_id', user.id).maybeSingle()
      if (run !== runId.current) return

      let services = []
      if (vendor?.id) {
        const { data } = await supabase
          .from('vendor_services')
          .select('id, category, name, review_status, is_active')
          .eq('vendor_id', vendor.id)
        if (run !== runId.current) return
        services = data ?? []
      }
      setAccount({ vendor: vendor ?? null, services })
    } catch {
      /* A partner who cannot be read is not a partner we should bounce
         around the app. Leaving `account` at its default sends them to
         the setup intro, which is recoverable, rather than to a
         dashboard that will fail to load anyway. */
    } finally {
      if (run === runId.current) setLoading(false)
    }
  }, [user?.id, profile?.role])

  useEffect(() => { load() }, [load])

  const stage = partnerStage(account)
  return { loading, stage, route: routeForStage(stage), account, refresh: load, STAGE }
}
