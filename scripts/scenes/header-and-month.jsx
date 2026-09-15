/**
 * The Jobs header and the month grid, mounted from src/.
 *
 * The header is the real JobsHeader with a real PartnerAvatar inside it,
 * shown both ways: with a photograph and with the initials fallback
 * every partner sees until they add one.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import JobsHeader from '../../src/components/partner/JobsHeader'
import MonthGrid from '../../src/components/partner/MonthGrid'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

/* A real image, inlined, so the shot does not depend on the network —
   a 2x2 JPEG scaled to fill the circle. What matters here is that the
   <img> path renders and clips to the circle, not what is in it. */
const FACE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#2E1065"/>
     </linearGradient></defs>
     <rect width="96" height="96" fill="url(#g)"/>
     <circle cx="48" cy="38" r="17" fill="#fff" opacity=".9"/>
     <path d="M16 96c0-18 14-30 32-30s32 12 32 30z" fill="#fff" opacity=".9"/>
   </svg>`)

const MONTH = (() => {
  const now = new Date()
  const d = n => {
    const x = new Date(now.getFullYear(), now.getMonth(), n)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }
  return {
    jobs: [
      { line_id: 'a', status: 'paid',     event_date: d(5) },
      { line_id: 'b', status: 'paid',     event_date: d(12) },
      { line_id: 'c', status: 'accepted', event_date: d(18) },
      { line_id: 'd', status: 'paid',     event_date: d(26) },
      { line_id: 'e', status: 'paid',     event_date: d(26) },
    ],
    availability: {
      [d(9)]:  { status: 'BLOCKED' },
      [d(10)]: { status: 'BLOCKED' },
      [d(21)]: { status: 'LIMITED' },
    },
    /* The day with two jobs that cannot both be done. */
    conflicts: { [d(26)]: 'CLASH' },
    selected: d(26),
  }
})()

const Box = ({ id, title, children, pad = 14 }) => (
  <div style={{ marginBottom: 26 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{title}</p>
    <div id={id} data-shot={id}
         style={{ width: 390, background: '#f4f4f6', borderRadius: 24,
                  padding: pad, overflow: 'hidden',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

export default function HeaderAndMonth() {
  return (
    <MemoryRouter>
      <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>
        <Box id="shotHeaderPhoto" title="Jobs header · photo top right, 3 unread" pad={0}>
          <JobsHeader
            lifecycle={LIFECYCLE.LIVE}
            businessName="Annapurna Catering Services"
            vendorId={null}
            avatarUrl={FACE}
            unreadAlerts={3}
            acceptingJobs
          />
        </Box>

        <Box id="shotHeaderInitials" title="Jobs header · the fallback, before a photo is added" pad={0}>
          <JobsHeader
            lifecycle={LIFECYCLE.UNDER_REVIEW}
            businessName="Sri Lakshmi Decorators"
            vendorId={null}
            avatarUrl={null}
            unreadAlerts={0}
            acceptingJobs={false}
          />
        </Box>

        <Box id="shotMonth" title="Calendar · the month, and the day that looks fine and is not">
          <MonthGrid
            jobs={MONTH.jobs}
            availability={MONTH.availability}
            conflicts={MONTH.conflicts}
            selected={MONTH.selected}
            onSelect={() => {}}
          />
        </Box>
      </div>
    </MemoryRouter>
  )
}
