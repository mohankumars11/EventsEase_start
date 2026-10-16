import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import JobsHeader from '../../src/components/partner/JobsHeader'
import JobsStats from '../../src/components/partner/JobsStats'
import ReviewCountdown from '../../src/components/partner/ReviewCountdown'

const sentAt = new Date(Date.now() - 5 * 3600 * 1000).toISOString()

export default function HandoverJobs() {
  return (
    <MemoryRouter><ToastProvider>
      <div style={{ width: 390, margin: '0 auto', background: '#fbfaff' }}>
        <JobsHeader
          businessName="jai"
          fullName="Jai"
          vendorId="v"
          acceptingJobs
          unreadAlerts={2}
          onAcceptingChange={() => {}}
          onOpenProfile={() => {}}
          onOpenAlerts={() => {}}
        />
        <div style={{ padding: '16px 16px 24px' }}>
          <JobsStats vendorId="v" onOpen={() => {}} />
          <div style={{ height: 14 }} />
          <ReviewCountdown
            status="submitted"
            submittedAt={sentAt}
            dueAt={null}
            extended={0}
            listingCount={4}
            listingNames={['Anchor & MC']}
            onOpenCalendar={() => {}}
            onOpenListing={() => {}}
          />
        </div>
        <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 8 }}>rendered</p>
      </div>
    </ToastProvider></MemoryRouter>
  )
}
