/**
 * Published package prices for the Calendar's day sheet.
 *
 * For a date: an approved SEASONAL version whose event dates cover it wins,
 * else the ordinary LIVE version. A package is bookable that day only if
 * the day is not blocked and its open hours can hold the package. Nothing
 * here writes availability or prices; the Calendar stays the authority for
 * dates and the Pricing tab for prices.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hasProfileFor } from '../data/tradePricingProfiles'

const ORDER = { ESSENTIAL: 0, SIGNATURE: 1, VIP: 2 }
const toMin = t => { const [h, m] = String(t ?? '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null }

function openHours({ iso, availability, weeklyRules, vendor }) {
  const row = availability?.[iso]
  if (row?.status === 'BLOCKED') return 0
  if (Array.isArray(row?.hours) && row.hours.length) {
    return row.hours.reduce((t, w) => t + Math.max(0, (toMin(w.end) - toMin(w.start)) / 60), 0)
  }
  const wd = new Date(`${iso}T00:00:00`).getDay()
  const rule = (weeklyRules ?? []).find(r => r.weekday === wd)
  if (rule && !row) {
    if (!rule.is_available) return 0
    if (rule.start_time && rule.end_time) return Math.max(0, (toMin(rule.end_time) - toMin(rule.start_time)) / 60)
  }
  const s = toMin(vendor?.working_start ?? '09:00'), e = toMin(vendor?.working_end ?? '22:00')
  return s != null && e != null ? Math.max(0, (e - s) / 60) : 13
}

export function usePublishedPricing({ services = [], availability, weeklyRules, vendor }) {
  const ids = services.filter(s => hasProfileFor(s.category)).map(s => s.id)
  const key = ids.join(',')
  const [versions, setVersions] = useState([])

  useEffect(() => {
    if (!ids.length) { setVersions([]); return }
    let alive = true
    ;(async () => {
      const { data: vs } = await supabase.from('sambramo_listing_versions')
        .select('id, vendor_service_id, seasonal_window_id, effective_from, effective_to')
        .in('vendor_service_id', ids).eq('status', 'LIVE')
      if (!vs?.length) { if (alive) setVersions([]); return }
      const { data: pk } = await supabase.from('sambramo_trade_packages')
        .select('listing_version_id, name, commercial_inputs, trade_inputs')
        .in('listing_version_id', vs.map(v => v.id)).eq('status', 'LIVE')
      if (!alive) return
      setVersions(vs.map(v => ({
        ...v,
        packages: (pk ?? []).filter(p => p.listing_version_id === v.id && p.commercial_inputs?.tier)
          .sort((a, b) => ORDER[a.commercial_inputs.tier] - ORDER[b.commercial_inputs.tier]),
      })))
    })()
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return useCallback(iso => {
    if (!iso || !versions.length) return null
    const seasonal = versions.find(v => v.seasonal_window_id && v.effective_from <= iso && v.effective_to >= iso)
    const v = seasonal ?? versions.find(x => !x.seasonal_window_id)
    if (!v) return null
    const hours = openHours({ iso, availability, weeklyRules, vendor })
    const blocked = hours === 0
    return {
      seasonal: seasonal ? 'Seasonal price' : null,
      prices: v.packages.map(p => {
        const need = Number(p.trade_inputs?.duration_hours) || 0
        const fits = !blocked && hours >= need
        return {
          name: p.name, paise: Number(p.trade_inputs?.customer_paise) || 0, hours: need,
          bookable: fits, why: blocked ? 'Day blocked' : 'Day too short',
        }
      }),
    }
  }, [versions, availability, weeklyRules, vendor])
}
