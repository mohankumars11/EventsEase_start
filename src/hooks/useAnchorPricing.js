/**
 * Everything the Pricing Control Center shows for one listing, read from
 * the database — never regenerated on open.
 *
 * "current" is the LIVE ordinary version when there is one, else the newest
 * pending one, so a partner waiting for review still sees what they sent.
 * A pending revision over a live version is reported beside it.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAnchorPricing(service) {
  const id = service?.id
  const [state, setState] = useState({ loading: true })

  const load = useCallback(async () => {
    if (!id) { setState({ loading: false }); return }
    setState(s => ({ ...s, loading: true }))
    const { data: versions, error } = await supabase
      .from('sambramo_listing_versions')
      .select('id, version, status, seasonal_window_id, effective_from, effective_to, profile, booking_rules, travel_rules, submitted_at, published_at, price_locked_until, review_note')
      .eq('vendor_service_id', id)
      .order('version', { ascending: false })
    if (error) { setState({ loading: false, error: error.message }); return }

    const ordinary = (versions ?? []).filter(v => !v.seasonal_window_id)
    const live = ordinary.find(v => v.status === 'LIVE') ?? null
    const pending = ordinary.find(v => ['UNDER_REVIEW', 'ACTION_REQUIRED', 'DRAFT', 'REJECTED'].includes(v.status)
      && (!live || v.version > live.version)) ?? null
    const seasonal = (versions ?? []).filter(v => v.seasonal_window_id && ['LIVE', 'UNDER_REVIEW', 'ACTION_REQUIRED'].includes(v.status))
    const current = live ?? pending
    if (!current) { setState({ loading: false, empty: true, versions: [] }); return }

    const now = new Date().toISOString()
    const [rules, addons, packages, readiness, windows] = await Promise.all([
      supabase.from('sambramo_rate_rules').select('*').eq('listing_version_id', current.id),
      supabase.from('sambramo_addon_rules').select('*').eq('listing_version_id', current.id),
      supabase.from('sambramo_trade_packages')
        .select('id, name, status, commercial_inputs, trade_inputs, calculation_snapshot, published_at, price_locked_until')
        .eq('listing_version_id', current.id),
      supabase.rpc('anchor_readiness', { p_vendor_service_id: id }),
      supabase.from('sambramo_seasonal_windows').select('*').lte('opens_at', now).gte('closes_at', now),
    ])
    const openWindow = (windows.data ?? []).find(w => !w.trades?.length || w.trades.includes(service.category)) ?? null

    setState({
      loading: false, live, pending, current, seasonal,
      rules: rules.data ?? [], addons: addons.data ?? [], packages: packages.data ?? [],
      readiness: readiness.data ?? null, window: openWindow,
    })
  }, [id, service?.category])

  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}
