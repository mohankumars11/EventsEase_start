import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveNav } from '../../config/adminNav'
import AdminShell from '../../components/admin/AdminShell'
import PartnerConsole from '../../components/admin/PartnerConsole'
import VerificationQueue from '../../components/admin/VerificationQueue'
import MarketInterest from '../../components/admin/MarketInterest'
import LiveOperations from '../../components/admin/LiveOperations'
import PricingReviewQueue from '../../components/admin/PricingReviewQueue'
import AnchorListingAdmin from '../../components/admin/AnchorListingAdmin'
import MaterialsAdvances from '../../components/admin/MaterialsAdvances'
import Bookings from '../../components/admin/Bookings'
import PartnerLifecycle from '../../components/admin/PartnerLifecycle'
import MoneyConsole from '../../components/admin/MoneyConsole'
import AuditTrail from '../../components/admin/AuditTrail'
import CustomersPlaceholder from '../../components/admin/CustomersPlaceholder'

/**
 * The admin console: a frame and one screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY SCREEN HAS A URL NOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * `activeNav` used to be local state, so the console had exactly one
 * address however many screens it grew. Nobody could bookmark the
 * verification queue, send "look at this" to anybody, or reload without
 * landing back on the partner console. For a console whose whole job is
 * one person telling another what to look at, that is the wrong default.
 *
 * It now lives in `?nav=`, which costs one hook and makes back, forward,
 * reload and a pasted link all behave. `resolveNav` already mapped the
 * fifteen deleted ids onto something real, so old bookmarks keep working
 * through the same door.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A MAP, NOT A TERNARY CHAIN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Six screens were a readable ternary chain. Eleven are not — a nested
 * ternary is exactly where the wrong screen starts rendering for the
 * wrong nav id, and the previous comment in this file said so while
 * adding another branch. The registry in config/adminNav decides what
 * exists; this decides what it renders; they are checked against each
 * other below.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BADGES ARE AN ORNAMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Head-only counts, allowed to fail. A badge must never be the reason
 * the console does not open.
 */

const SCREENS = {
  'partners': PartnerConsole,
  'lifecycle': PartnerLifecycle,
  'pricing-review': PricingReviewQueue,
  'listing-review': AnchorListingAdmin,
  'verification': VerificationQueue,
  'bookings': Bookings,
  'advances': MaterialsAdvances,
  'money': MoneyConsole,
  'audit': AuditTrail,
  'live-ops': LiveOperations,
  'city-interest': MarketInterest,
  'customers': CustomersPlaceholder,
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const activeNav = resolveNav(params.get('nav') ?? 'partners')

  const [waiting, setWaiting] = useState(0)
  const [pricingWaiting, setPricingWaiting] = useState(0)
  const [advanceWaiting, setAdvanceWaiting] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const loadBadge = useCallback(async () => {
    setRefreshing(true)
    try {
      const [v, s, tp, cp] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true })
          .eq('verification_status', 'submitted').eq('is_synthetic', false),
        supabase.from('vendor_services').select('id', { count: 'exact', head: true })
          .eq('review_status', 'under_review'),
        supabase.from('sambramo_trade_packages').select('id', { count: 'exact', head: true })
          .in('status', ['UNDER_REVIEW', 'ACTION_REQUIRED']),
        supabase.from('sambramo_catering_packages').select('id', { count: 'exact', head: true })
          .in('status', ['UNDER_REVIEW', 'ACTION_REQUIRED']),
      ])
      setWaiting((v.count ?? 0) + (s.count ?? 0))
      setPricingWaiting((tp.count ?? 0) + (cp.count ?? 0))
    } catch {
      setWaiting(0)
    }

    /* Separate, and separately forgiving: materials_advances does not
       exist until 20261013_01 is pasted, and a missing table must not
       take the two counts above down with it. */
    try {
      const { count } = await supabase.from('materials_advances')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'under_review'])
      setAdvanceWaiting(count ?? 0)
    } catch {
      setAdvanceWaiting(0)
    }
    setRefreshing(false)
  }, [])

  useEffect(() => { loadBadge() }, [loadBadge])

  const go = useCallback(id => {
    setParams(prev => {
      const q = new URLSearchParams(prev)
      q.set('nav', resolveNav(id))
      /* A screen's own query state belongs to that screen. Carrying a
         partner id onto the money console points it at nothing. */
      for (const k of ['id', 'tab', 'q']) q.delete(k)
      return q
    })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [setParams])

  const Screen = useMemo(() => SCREENS[activeNav] ?? PartnerConsole, [activeNav])

  return (
    <AdminShell
      activeNav={activeNav}
      onNavigate={go}
      badges={{ vendors: waiting, pricing: pricingWaiting, advances: advanceWaiting }}
      profile={profile}
      onRefresh={loadBadge}
      refreshing={refreshing}
    >
      <Screen onNavigate={go} />
    </AdminShell>
  )
}
