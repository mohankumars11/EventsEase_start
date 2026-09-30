/**
 * The real screens at real phone widths, for the overflow check.
 *
 * The harness measures scrollWidth against clientWidth on each box, so
 * anything that pushes past the viewport shows up as a number rather
 * than as something somebody has to spot.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import JobsHeader from '../../src/components/partner/JobsHeader'
import JobsStats from '../../src/components/partner/JobsStats'
import MonthGrid from '../../src/components/partner/MonthGrid'
import JobTimeline from '../../src/components/partner/JobTimeline'
import PayoutReceipt from '../../src/components/vendor/PayoutReceipt'
import SetAvailability from '../../src/components/partner/SetAvailability'
import ServiceArea from '../../src/components/partner/ServiceArea'
import { LIFECYCLE } from '../../src/lib/partnerOnboarding'

const WIDTHS = [360, 375, 390, 412, 430]

const JOB = {
  line_id: 'l1', occasion_name: 'Priya & Arjun Wedding · 500 guests',
  service_name: 'Full service catering, traditional South Indian menu',
  trade: 'Catering & Food', status: 'paid', event_date: '2026-09-26',
  quoted_amount_paise: 4200000, partner_amount_paise: 3864000,
  is_funded: true, accepted_at: '2026-09-08T10:00:00Z',
}
const CLAIM = {
  id: 'c1', line_id: 'l1', status: 'paid', amount_paise: 3864000,
  destination: 'annapurnacatering.services@okaxisbank',
  requested_at: '2026-09-27T06:00:00Z', settled_at: '2026-09-29T11:40:00Z',
  reference: 'UTR 402716655318',
}
const VENDOR = {
  id: 'v1', business_name: 'Annapurna Catering & Event Services Bengaluru',
  area: 'Jayanagar', city: 'Bengaluru', service_radius_km: 50,
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
}
const d = n => {
  const x = new Date(); x.setDate(n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
}

const SCREENS = [
  ['header',   <JobsHeader lifecycle={LIFECYCLE.LIVE}
                 businessName="Annapurna Catering & Event Services Bengaluru"
                 vendorId={null} avatarUrl={null} unreadAlerts={12} acceptingJobs />],
  ['stats',    <div className="px-4 pt-8"><JobsStats vendorId={null} /></div>],
  ['month',    <div className="px-4 py-3"><MonthGrid jobs={[{ line_id: 'a', status: 'paid', event_date: d(26) }]}
                 availability={{}} conflicts={{ [d(26)]: 'CLASH' }} selected={d(26)} onSelect={() => {}} /></div>],
  ['timeline', <div className="px-4 py-3"><div className="rounded-[22px] bg-white p-4"><JobTimeline job={JOB} claim={null} /></div></div>],
  ['receipt',  <div className="px-4 py-3"><PayoutReceipt claim={CLAIM} job={JOB} hasPan /></div>],
  ['avail',    <div className="px-4 py-3"><SetAvailability date={d(20)} availability={{}}
                 onSetDay={async () => {}} onSetRange={async () => {}} /></div>],
  ['area',     <div className="px-4 py-3"><ServiceArea vendor={VENDOR} onSave={async () => {}} /></div>],
]

export default function MobileFit() {
  return (
    <MemoryRouter>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 12, background: '#ddd', width: 460 }}>
        {WIDTHS.map(w => (
          <div key={w}>
            <p style={{ font: '700 11px/1.3 system-ui', color: '#555', margin: '0 0 6px' }}>
              {w} px
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SCREENS.map(([id, el]) => (
                <div key={id} data-fit={`${w}-${id}`}
                     style={{ width: w, overflow: 'hidden', background: '#f4f4f6',
                              borderRadius: 14, flex: '0 0 auto' }}>
                  {el}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MemoryRouter>
  )
}
