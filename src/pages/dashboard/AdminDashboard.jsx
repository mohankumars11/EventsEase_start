import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveNav } from '../../config/adminNav'
import AdminShell from '../../components/admin/AdminShell'
import PartnerConsole from '../../components/admin/PartnerConsole'

/**
 * The admin console: a frame and one screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE IS NINETY LINES INSTEAD OF A HUNDRED AND FIFTY
 * ══════════════════════════════════════════════════════════════════════
 *
 * It used to lazy-import nine screens and switch between fourteen nav
 * ids. All of them are gone — deleted, not hidden — because the console
 * covered five subjects adequately and the one subject with a live
 * defect had nowhere to fix it. See the note in config/adminNav.
 *
 * What is left is what genuinely belongs to a page component: work out
 * the badge, remember which screen is showing, and render the shell.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TEN-TABLE LOAD IS GONE TOO
 * ══════════════════════════════════════════════════════════════════════
 *
 * `useAdminData` fetched events, proposals, payments, profiles, vendors,
 * enquiries, reviews, complaints, interest and services on every mount,
 * to feed screens that no longer exist. It has been deleted, and with it
 * a real bug: its cleanup called `clearInterval(floor)` where `floor`
 * was never declared, so every unmount threw a ReferenceError BEFORE
 * `supabase.removeChannel()` ran and the realtime channel leaked.
 *
 * PartnerConsole loads exactly what it needs, itself. The only thing
 * this page still reads is the count for the rail badge — one head
 * query, no rows — because a queue should announce itself before it is
 * opened.
 */
export default function AdminDashboard() {
  const { profile } = useAuth()
  const [activeNav, setActiveNav] = useState('partners')
  const [waiting, setWaiting] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  /* Two counts, no rows: businesses waiting to be approved, and listings
     waiting to be read. They are summed because the rail has one badge
     and both mean the same thing to the person looking at it — there is
     something here for you. */
  const loadBadge = useCallback(async () => {
    setRefreshing(true)
    try {
      const [v, s] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true })
          .eq('verification_status', 'submitted').eq('is_synthetic', false),
        supabase.from('vendor_services').select('id', { count: 'exact', head: true })
          .eq('review_status', 'under_review'),
      ])
      setWaiting((v.count ?? 0) + (s.count ?? 0))
    } catch {
      /* A badge is an ornament. It must never be the reason the console
         fails to open. */
      setWaiting(0)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadBadge() }, [loadBadge])

  function go(id) {
    setActiveNav(resolveNav(id))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <AdminShell
      activeNav={activeNav}
      onNavigate={go}
      badges={{ vendors: waiting }}
      profile={profile}
      onRefresh={loadBadge}
      refreshing={refreshing}
    >
      <PartnerConsole />
    </AdminShell>
  )
}
