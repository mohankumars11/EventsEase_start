/**
 * Every dark ground in the partner app, in one page.
 *
 * Fed to scripts/check-dark-card-contrast.mjs, which photographs it and
 * measures each string against the pixels it is actually sitting on. A
 * card only has to appear here once for every label on it to be checked.
 *
 * The scene's own captions carry `data-scene-label` so the checker skips
 * them: grey labels fail their own floor and bury the real hits, which
 * is exactly what happened the first time this was run.
 *
 *   node scripts/check-dark-card-contrast.mjs \
 *     --scenes scripts/scenes/partner-dark.jsx --width 430
 */
import React from 'react'
import JobsHeader from '../../src/components/partner/JobsHeader'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'
import CalendarNudge from '../../src/components/vendor/CalendarNudge'
import RouteMap from '../../src/components/partner/RouteMap'
import JobChat from '../../src/components/partner/JobChat'
import LocationGate from '../../src/components/partner/LocationGate'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

const hoursFromNow = h => new Date(Date.now() + h * 3600 * 1000).toISOString()
const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()
const noop = async () => {}

const TRAIL = [
  [12.9784, 77.6408], [12.9751, 77.6382], [12.9718, 77.6361],
  [12.9689, 77.6334], [12.9676, 77.6290], [12.9709, 77.6259],
  [12.9735, 77.6239], [12.9766, 77.6197],
].map(([lat, lng]) => ({ lat, lng }))

const CHAT = [
  { id: 'a', sender: 'customer', body: 'Which gate will you come to?',
    created_at: hoursAgo(1), read_at: hoursAgo(0.9) },
  { id: 'b', sender: 'partner', body: 'I have set off and am on my way now.',
    created_at: hoursAgo(0.5), read_at: hoursAgo(0.4) },
]

const Label = ({ children }) => (
  <p data-scene-label
     style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
              textTransform: 'uppercase', color: '#111827', margin: '18px 0 6px' }}>
    {children}
  </p>
)

const header = (lifecycle, extra = {}) => (
  <div className="-mx-4 mb-2">
    <JobsHeader
      lifecycle={lifecycle}
      businessName="Anusha decor" vendorId="demo" avatarUrl={null}
      unreadAlerts={2} acceptingJobs
      onAcceptingChange={noop} onOpenProfile={noop} onOpenAlerts={noop}
      {...extra}
    />
  </div>
)

export default function PartnerDarkScenes() {
  return (
    <div style={{ width: 430, margin: '0 auto', background: '#fff', padding: 16 }}>

      <Label>Jobs header · under review, with the clock</Label>
      {header(LIFECYCLE.UNDER_REVIEW,
        { reviewDueAt: hoursFromNow(22), reviewSubmittedAt: hoursAgo(2) })}

      <Label>Jobs header · live</Label>
      {header(LIFECYCLE.LIVE)}

      <Label>Jobs header · action needed</Label>
      {header(LIFECYCLE.REQUIRES_ACTION)}

      <Label>The review card · waiting</Label>
      <ReviewCountdown status="submitted" dueAt={hoursFromNow(22)}
                       submittedAt={hoursAgo(2)} extended={0} />

      <Label>The review card · extended, with a note</Label>
      <ReviewCountdown status="submitted" dueAt={hoursFromNow(9)}
                       submittedAt={hoursAgo(39)} extended={1}
                       note="We are waiting on your FSSAI licence to be readable." />

      <Label>The review card · overdue</Label>
      <ReviewCountdown status="submitted" dueAt={hoursAgo(3)}
                       submittedAt={hoursAgo(27)} extended={0} />

      <Label>The calendar nudge</Label>
      <CalendarNudge availability={{}} weeklyRules={[]}
                     vendor={{ calendar_reviewed_through: null }}
                     onOpen={noop} onDismiss={noop} />

      <Label>The map · controls, the Maps button and attribution</Label>
      <RouteMap
        trail={TRAIL}
        me={TRAIL[TRAIL.length - 1]}
        destination={{ lat: 12.9606, lng: 77.6167 }}
        height={240}
      />

      <Label>The chat · a partner bubble on plum, and the quick lines</Label>
      <JobChat lineId="demo" initialRows={CHAT} initialCanWrite />

      <Label>The chat · closed</Label>
      <JobChat lineId="demo2" initialRows={[]} initialCanWrite={false} />

      <Label>The location gate</Label>
      <LocationGate onGranted={noop} compact />
    </div>
  )
}
