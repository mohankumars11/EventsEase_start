import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveNav } from '../../config/adminNav'
import AdminShell from '../../components/admin/AdminShell'
import ExecutiveOverview from '../../components/admin/ExecutiveOverview'
import PartnerConsole from '../../components/admin/PartnerConsole'
import VerificationQueue from '../../components/admin/VerificationQueue'
import MarketInterest from '../../components/admin/MarketInterest'
import LiveOperations from '../../components/admin/LiveOperations'
import PricingReviewQueue from '../../components/admin/PricingReviewQueue'
import AnchorListingAdmin from '../../components/admin/AnchorListingAdmin'
import PartnerStoryUploads from '../../components/admin/PartnerStoryUploads'
import TradeWorkspaces from '../../components/admin/TradeWorkspaces'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [activeNav, setActiveNav] = useState('overview')
  const [waiting, setWaiting] = useState(0)
  const [pricingWaiting, setPricingWaiting] = useState(0)
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
      setPricingWaiting(0)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadBadge() }, [loadBadge])

  function go(id) {
    setActiveNav(resolveNav(id))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const screen = activeNav === 'overview' ? <ExecutiveOverview onNavigate={go} />
    : activeNav === 'city-interest' ? <MarketInterest />
    : activeNav === 'live-ops' ? <LiveOperations />
    : activeNav === 'story-uploads' ? <PartnerStoryUploads />
    : activeNav === 'trade-workspaces' ? <TradeWorkspaces />
    : activeNav === 'verification' ? <VerificationQueue />
    : activeNav === 'pricing-review' ? <PricingReviewQueue />
    : activeNav === 'listing-review' ? <AnchorListingAdmin />
    : <PartnerConsole />

  return (
    <AdminShell
      activeNav={activeNav}
      onNavigate={go}
      badges={{ vendors: waiting, pricing: pricingWaiting }}
      profile={profile}
      onRefresh={loadBadge}
      refreshing={refreshing}
    >
      {screen}
    </AdminShell>
  )
}
