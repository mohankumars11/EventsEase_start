/**
 * The Jobs tab as one column, to judge its left edge.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS LOOKING FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not whether each piece renders — check-tabs-render already mounts them
 * all. This is about the EDGE: the header is pulled out of the page's
 * `px-4` column by `-mx-4` and applies its own padding, so if the two do
 * not agree, every line in the header starts a few pixels off from every
 * card below it. Small enough that nobody files a bug and everybody
 * feels it.
 *
 * A ruler is drawn down the left at the column's padding so the
 * misalignment is measurable rather than a matter of opinion.
 *
 *   node scripts/shoot-components.mjs shots/jobs-tab-column.png \
 *     --scenes scripts/scenes/jobs-tab-column.jsx --width 430
 */
import React from 'react'
import JobsHeader from '../../src/components/partner/JobsHeader'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'
import CalendarNudge from '../../src/components/vendor/CalendarNudge'
import AttentionSummary from '../../src/components/partner/AttentionSummary'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

const hoursFromNow = h => new Date(Date.now() + h * 3600 * 1000).toISOString()
const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()

export default function JobsTabColumn() {
  return (
    <div style={{ position: 'relative', width: 430, background: '#f6f5f7' }}>

      {/* The column's own padding, drawn. Everything that is aligned
          begins exactly on this line. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 16, width: 1,
          background: 'rgba(220, 38, 38, 0.55)', zIndex: 50,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 16, width: 1,
          background: 'rgba(220, 38, 38, 0.55)', zIndex: 50,
        }}
      />

      {/* VendorDashboard's container, copied exactly. */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-6">

        <div className="-mx-4 -mt-4 mb-4">
          <JobsHeader
            lifecycle={LIFECYCLE.UNDER_REVIEW}
            businessName="Anusha decor"
            vendorId="demo"
            avatarUrl={null}
            unreadAlerts={2}
            acceptingJobs
            reviewDueAt={hoursFromNow(22)}
            reviewSubmittedAt={hoursAgo(2)}
            onAcceptingChange={() => {}}
            onOpenProfile={() => {}}
            onOpenAlerts={() => {}}
          />
        </div>

        <ReviewCountdown
          status="submitted"
          dueAt={hoursFromNow(22)}
          submittedAt={hoursAgo(2)}
          extended={0}
        />

        <CalendarNudge
          availability={{}}
          weeklyRules={[]}
          vendor={{ calendar_reviewed_through: null }}
          onOpen={() => {}}
          onDismiss={() => {}}
        />

        <AttentionSummary
          counts={{ claimable: 2, awaitingPayment: 1, requiresAction: 1 }}
          onOpen={() => {}}
        />
      </div>
    </div>
  )
}
