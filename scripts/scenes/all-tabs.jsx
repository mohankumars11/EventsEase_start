/**
 * Every partner tab, in one column, at phone width.
 *
 * Built because "the apk is old, nothing is visible" and "that screen
 * needs a condition you have not hit" look identical from the outside.
 * This is the answer to which one it is.
 *
 *   node scripts/shoot-components.mjs shots/all-tabs.png \
 *     --scenes scripts/scenes/all-tabs.jsx --width 430 --scale 1
 */
import React from 'react'
import JobsHeader from '../../src/components/partner/JobsHeader'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'
import CalendarNudge from '../../src/components/vendor/CalendarNudge'
import AttentionSummary from '../../src/components/partner/AttentionSummary'
import ValidatedField from '../../src/components/partner/ValidatedField'
import BuildStamp from '../../src/components/partner/BuildStamp'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

const hoursFromNow = h => new Date(Date.now() + h * 3600 * 1000).toISOString()
const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()
const noop = async () => {}

const Label = ({ children, note }) => (
  <>
    <p data-scene-label style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
       textTransform: 'uppercase', color: '#111827', margin: '22px 0 3px' }}>{children}</p>
    {note && <p data-scene-label style={{ font: '400 11.5px/1.4 system-ui',
       color: '#4b5563', margin: '0 0 8px' }}>{note}</p>}
  </>
)

export default function AllTabs() {
  return (
    <div style={{ width: 430, margin: '0 auto', background: '#f6f5f7', padding: 16 }}>

      <Label note="The clock is inside the status pill with a bar that fills. Nothing floats above the header any more, and the left edge lines up with every card below it.">
        Jobs · the header
      </Label>
      <div className="-mx-4 mb-3">
        <JobsHeader
          lifecycle={LIFECYCLE.UNDER_REVIEW}
          businessName="Anusha decor" vendorId="demo" avatarUrl={null}
          unreadAlerts={2} acceptingJobs
          reviewDueAt={hoursFromNow(21)} reviewSubmittedAt={hoursAgo(3)}
          onAcceptingChange={noop} onOpenProfile={noop} onOpenAlerts={noop}
        />
      </div>

      <Label note="Moved down into the content column, where it is one card among cards.">
        Jobs · the review card
      </Label>
      <ReviewCountdown status="submitted" dueAt={hoursFromNow(21)}
                       submittedAt={hoursAgo(3)} extended={0} />

      <Label note="Measures how far ahead the calendar reaches, not whether one date was tapped. Dismissal writes calendar_reviewed_through.">
        Jobs · the calendar nudge
      </Label>
      <CalendarNudge availability={{}} weeklyRules={[]}
                     vendor={{ calendar_reviewed_through: null }}
                     onOpen={noop} onDismiss={noop} />

      <Label>Jobs · what needs doing</Label>
      <AttentionSummary counts={{ claimable: 2, awaitingPayment: 1, requiresAction: 1 }}
                        onOpen={noop} />

      <Label note="Every text box in the six steps now runs the shared rules. A number in a name, a bad IFSC fifth character, a lead time over 365 — each says what is wrong in words.">
        Onboarding · the callbacks
      </Label>
      <div style={{ background: '#fff', borderRadius: 20, padding: 14 }}>
        <ValidatedField field="business_name" value="Hotel 7 Hills" onChange={noop}
                        showAll label="Business name" />
        <ValidatedField field="contact_phone" value="98450" onChange={noop}
                        showAll label="Contact number" inputMode="tel" />
        <ValidatedField field="ifsc" value="HDFC1001234" onChange={noop}
                        showAll label="IFSC" />
        <ValidatedField field="account_number" value="12" onChange={noop}
                        showAll label="Account number" inputMode="numeric" />
      </div>

      <Label>More · which build this is</Label>
      <BuildStamp />

      {/* PartnerBottomNav is not here: it reads useLocation and
          useAuth, so mounting it needs a router and a session the
          harness deliberately does not have. It is unchanged anyway. */}
    </div>
  )
}
