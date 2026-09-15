/**
 * The money and the More tab, mounted from src/ rather than redrawn.
 *
 * Every component here is the shipped one. The data is a plausible
 * partner's — two delivered jobs, one waiting on the customer, a claim
 * that settled — passed in as props, because all of these take their
 * rows from a parent and none of them fetch on mount. That means the
 * picture cannot drift from the screen: a change to the breakdown shows
 * up here without this file being touched.
 */
import React from 'react'
import JobMoneyRow from '../../src/components/vendor/JobMoneyRow'
import EarningsStatement from '../../src/components/vendor/EarningsStatement'
import PayoutHistory from '../../src/components/vendor/PayoutHistory'
import PartnerReviews from '../../src/components/vendor/PartnerReviews'
import PartnerInbox from '../../src/components/vendor/PartnerInbox'
import NotificationPrefs from '../../src/components/vendor/NotificationPrefs'
import { statement, financialYear } from '../../src/lib/earningsStatement'

const FY = financialYear(new Date('2026-09-15'))

const JOBS = [
  { line_id: 'j1', service_name: 'Wedding reception catering, 220 plates',
    quoted_amount_paise: 24200000, partner_amount_paise: 22990000,
    status: 'delivered', event_date: '2026-08-29', area_label: 'Jayanagar' },
  { line_id: 'j2', service_name: 'Candid photography, full day',
    quoted_amount_paise: 3500000, partner_amount_paise: 3325000,
    status: 'delivered', event_date: '2026-09-06', area_label: 'Whitefield' },
  { line_id: 'j3', service_name: 'Mandap decoration',
    quoted_amount_paise: 8600000, partner_amount_paise: 8170000,
    status: 'accepted', event_date: '2026-09-27', area_label: 'Malleshwaram' },
  /* A row from before the itemised record. It must render as
     un-itemised rather than as a guess. */
  { line_id: 'j4', service_name: 'Naming ceremony lunch, 60 plates',
    quoted_amount_paise: null, partner_amount_paise: 4180000,
    status: 'delivered', event_date: '2026-05-11', area_label: 'Basavanagudi' },
]

const CLAIMS = [
  { id: 'c1', line_id: 'j1', status: 'paid', amount_paise: 22990000,
    destination: 'annaruchi@okaxis', requested_at: '2026-08-31T09:12:00Z',
    settled_at: '2026-09-02T11:40:00Z', reference: 'UTR 402716655318' },
  { id: 'c2', line_id: 'j2', status: 'requested', amount_paise: 3325000,
    destination: 'annaruchi@okaxis', requested_at: '2026-09-08T06:20:00Z' },
]

const REVIEWS = [
  { id: 'r1', rating: 5, created_at: '2026-09-01T10:00:00Z',
    comment: 'Food was on time and the bisi bele bath was exactly like home. '
           + 'They cleared up without being asked.' },
  { id: 'r2', rating: 4, created_at: '2026-08-14T10:00:00Z',
    comment: 'Very good, but they arrived about forty minutes later than agreed.' },
  { id: 'r3', rating: 5, created_at: '2026-07-22T10:00:00Z', comment: null },
  { id: 'r4', rating: 5, created_at: '2026-06-30T10:00:00Z',
    comment: 'Second time we have booked them. No complaints.' },
]

const NOTIFICATIONS = [
  { id: 'n1', kind: 'payout', title: '₹33,250 is on its way',
    body: 'We are sending it to annaruchi@okaxis. Usually two working days.',
    read_at: null, created_at: new Date(Date.now() - 42 * 60000).toISOString() },
  { id: 'n2', kind: 'review', title: 'A customer rated your reception catering',
    body: 'Five stars. They mentioned the bisi bele bath.',
    read_at: null, created_at: new Date(Date.now() - 20 * 3600000).toISOString() },
  { id: 'n3', kind: 'verification', title: 'Your FSSAI licence was accepted',
    body: 'You are verified for Catering & Food.',
    read_at: '2026-09-09T05:00:00Z', created_at: '2026-09-08T12:00:00Z' },
  { id: 'n4', kind: 'job', title: 'A booking on 27 September was moved',
    body: 'Malleshwaram mandap decoration, now starting at 6:30 AM.',
    read_at: '2026-09-05T05:00:00Z', created_at: '2026-09-04T09:30:00Z' },
]

const Box = ({ id, title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>
      {title}
    </p>
    <div id={id} data-shot={id}
         style={{ width: 390, background: '#fff', borderRadius: 24, padding: 16,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

export default function MoneyAndMore() {
  const st = statement(JOBS, { fy: FY })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>
      <Box id="shotWork" title="Earnings · your work">
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">Your work</p>
        <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
          Every job you have taken. Tap one to see where each rupee went.
        </p>
        <ul className="mt-2 divide-y divide-ink/[0.06]">
          <JobMoneyRow job={JOBS[0]} where="In your account" hasPan annualGrossInr={412000} />
          <JobMoneyRow job={JOBS[1]} where="You have asked for it" hasPan annualGrossInr={412000} />
          <JobMoneyRow job={JOBS[2]} where="Waiting on the customer" hasPan annualGrossInr={412000} />
          <JobMoneyRow job={JOBS[3]} where="In your account" hasPan annualGrossInr={412000} />
        </ul>
      </Box>

      <Box id="shotStatement" title="Earnings · the year">
        <EarningsStatement statement={st} />
      </Box>

      <Box id="shotPayouts" title="Earnings · payout history">
        <PayoutHistory claims={CLAIMS} />
      </Box>

      <Box id="shotReviews" title="More · reviews">
        <PartnerReviews reviews={REVIEWS} />
      </Box>

      <Box id="shotInbox" title="More · notifications">
        <PartnerInbox rows={NOTIFICATIONS} />
      </Box>

      <Box id="shotPrefs" title="More · what we notify you about">
        <NotificationPrefs vendorId="shot" initial={{ announcements: false }} />
      </Box>
    </div>
  )
}
