/**
 * The Jobs tab at 390x844, top to bottom, as one screen.
 *
 * The consolidation check is visual and it is about what is ABSENT:
 * no customer Navbar, no hamburger, no second business-name header, no
 * promotional cards. The components are the shipped ones; only the data
 * is supplied, because the harness has no database.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import PartnerAppShell from '../../src/components/layout/PartnerAppShell'
import JobsHeader from '../../src/components/partner/JobsHeader'
import JobsStats from '../../src/components/partner/JobsStats'
import AttentionSummary from '../../src/components/partner/AttentionSummary'
import PartnerBottomNav from '../../src/components/layout/PartnerBottomNav'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

export default function JobsAt390() {
  return (
    <MemoryRouter initialEntries={['/dashboard/vendor']}>
      <AuthContext.Provider value={{ user: { id: 'shot' }, profile: { id: 'shot', role: 'vendor' } }}>
      <div style={{ width: 390, height: 844, position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ height: '100%', overflowY: 'auto' }}><PartnerAppShell>
          <JobsHeader
            lifecycle={LIFECYCLE.LIVE}
            businessName="Annapurna Catering Services"
            vendorId={null}
            avatarUrl={null}
            unreadAlerts={3}
            acceptingJobs
          />

          <div className="px-4">
            <JobsStats vendorId={null} />
          </div>

          <div className="px-4 pt-4">
            <AttentionSummary
              counts={{ claimable: 1, awaitingPayment: 2, requiresAction: 0 }}
              onOpen={() => {}}
            />
          </div>

          <div className="px-4 pt-4">
            <p className="mb-2 text-[15px] font-extrabold text-ink">New opportunities</p>
            <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
              <p className="text-[13px] text-ink-mute">
                No new opportunities yet. They arrive here and last about a minute.
              </p>
            </div>
          </div>

          <div className="px-4 pt-4">
            <p className="mb-2 text-[15px] font-extrabold text-ink">Your jobs</p>
            <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
              <p className="text-[13px] text-ink-mute">Nothing booked yet.</p>
            </div>
          </div>
        </PartnerAppShell></div>

        {/* The one navigation surface. */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <PartnerBottomNav />
        </div>
      </div>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
