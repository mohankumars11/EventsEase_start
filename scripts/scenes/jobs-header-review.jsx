/**
 * The Jobs header while a review is running.
 *
 * The bug this exists to hold shut: the countdown was its own card
 * rendered ABOVE this header, and the header is pulled up by `-mt-4` to
 * reach the status bar — so the card was dragged with it and ended up
 * half off the top of the screen, its corners cut by the header behind
 * it. A partner photographed it.
 *
 * The clock is now inside the status pill, which is where the status
 * already was. The bar underneath fills as the promised window elapses.
 *
 *   node scripts/shoot-components.mjs shots/jobs-header-review.png \
 *     --scenes scripts/scenes/jobs-header-review.jsx --width 430
 */
import React from 'react'
import JobsHeader from '../../src/components/partner/JobsHeader'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

const hoursFromNow = h => new Date(Date.now() + h * 3600 * 1000).toISOString()
const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && (
        <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 8px' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

/* The real page's wrapper: the header sits in a px-4 column and is
   pulled out of it by -mx-4, which is what makes the plum reach both
   edges. Reproduced so the alignment being checked is the real one. */
function AsOnThePage({ children }) {
  return (
    <div style={{ width: 430, background: '#f6f5f7', paddingTop: 16, paddingBottom: 16 }}>
      <div className="px-4">{children}</div>
    </div>
  )
}

const header = extra => (
  <div className="-mx-4 -mt-4 mb-4">
    <JobsHeader
      lifecycle={LIFECYCLE.UNDER_REVIEW}
      businessName="Anusha decor"
      vendorId="demo"
      avatarUrl={null}
      unreadAlerts={0}
      acceptingJobs
      onAcceptingChange={() => {}}
      onOpenProfile={() => {}}
      onOpenAlerts={() => {}}
      {...extra}
    />
  </div>
)

export default function JobsHeaderReviewScenes() {
  return (
    <div style={{ width: 430, margin: '0 auto', background: '#fff' }}>

      <Scene
        title="Under review · 23 hours left"
        note="The clock is inside the status pill. One status element, flush with the top of the screen, nothing floating above it."
      >
        <AsOnThePage>
          {header({ reviewDueAt: hoursFromNow(23), reviewSubmittedAt: hoursAgo(1) })}
        </AsOnThePage>
      </Scene>

      <Scene
        title="Under review · under an hour"
        note="The bar is nearly full and the figure ticks per second rather than per minute."
      >
        <AsOnThePage>
          {header({ reviewDueAt: hoursFromNow(0.4), reviewSubmittedAt: hoursAgo(23.6) })}
        </AsOnThePage>
      </Scene>

      <Scene
        title="Under review · overdue"
        note="No bar, and the figure goes amber. A timer sitting at 00:00 or counting into negative hours is worse than saying it plainly."
      >
        <AsOnThePage>
          {header({ reviewDueAt: hoursAgo(3), reviewSubmittedAt: hoursAgo(27) })}
        </AsOnThePage>
      </Scene>

      <Scene
        title="Live · no clock at all"
        note="The pill carries nothing extra once there is nothing to wait for."
      >
        <AsOnThePage>
          <div className="-mx-4 -mt-4 mb-4">
            <JobsHeader
              lifecycle={LIFECYCLE.LIVE}
              businessName="Anusha decor"
              vendorId="demo" avatarUrl={null} unreadAlerts={3} acceptingJobs
              onAcceptingChange={() => {}} onOpenProfile={() => {}} onOpenAlerts={() => {}}
            />
          </div>
        </AsOnThePage>
      </Scene>

      <Scene
        title="And the detail card, down in the content"
        note="Where it is one card among cards. Same clock, from the same hook, so the two can never disagree."
      >
        <div style={{ width: 430, background: '#f6f5f7', padding: 16 }}>
          <ReviewCountdown
            status="submitted"
            dueAt={hoursFromNow(23)}
            submittedAt={hoursAgo(1)}
            extended={0}
          />
          <ReviewCountdown
            status="submitted"
            dueAt={hoursFromNow(9)}
            submittedAt={hoursAgo(39)}
            extended={1}
            note="We are waiting on your FSSAI licence to be readable."
          />
        </div>
      </Scene>
    </div>
  )
}
