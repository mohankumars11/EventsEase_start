/**
 * The screens built against the reference set, mounted from src/.
 *
 * Every component here is the shipped one, taking the same props its
 * real parent passes. The rows are shaped like `partner_jobs` and
 * `payout_claims` rows, so what is photographed is the real component
 * reading the real columns.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import JobTimeline from '../../src/components/partner/JobTimeline'
import JobsStats from '../../src/components/partner/JobsStats'
import UpcomingWeek from '../../src/components/partner/UpcomingWeek'
import PayoutReceipt from '../../src/components/vendor/PayoutReceipt'
import PublicProfilePreview from '../../src/components/vendor/PublicProfilePreview'
import { requirementsFor, moneyFor } from '../../src/lib/jobDetail'
import { formatINR } from '../../src/utils/format'

const JOB = {
  line_id: 'l1', vendor_id: 'v1',
  occasion_name: 'Priya & Arjun Wedding',
  service_name: 'Full service catering, traditional South Indian',
  trade: 'Catering & Food', spec_mode: 'discuss', status: 'paid',
  quoted_amount_paise: 4200000, partner_amount_paise: 3864000,
  event_date: '2026-09-26', time_note: '10:00 AM – 10:00 PM',
  guest_count: 500, area_label: 'Leela Palace', city: 'Bengaluru',
  distance_m: 8400, is_funded: true, paid_at: '2026-09-10T10:00:00Z',
  accepted_at: '2026-09-08T10:00:00Z',
  customer_note: 'Vegetarian throughout, with a separate Jain counter. '
               + 'Setup must be finished by 8:00 AM.',
}

const CLAIM = {
  id: 'c1', line_id: 'l1', status: 'paid', amount_paise: 3864000,
  destination: 'annaruchi@okaxis', requested_at: '2026-09-27T06:00:00Z',
  settled_at: '2026-09-29T11:40:00Z', reference: 'UTR 402716655318',
}

const VENDOR = {
  id: 'v1', business_name: 'Annapurna Catering Services', status: 'APPROVED',
  area: 'Jayanagar', city: 'Bengaluru', service_radius_km: 25, max_guests: 600,
  description: 'Pure vegetarian catering for weddings and house functions '
             + 'since 2011. Traditional South Indian, live counters, custom menus.',
}

const SERVICES = [
  { vendor_id: 'v1', category: 'Catering & Food' },
  { vendor_id: 'v1', category: 'Decoration & Floral' },
]

const REVIEWS = [
  { id: 'r1', rating: 5, created_at: '2026-09-01T10:00:00Z', comment: 'On time.' },
  { id: 'r2', rating: 4, created_at: '2026-08-14T10:00:00Z', comment: null },
  { id: 'r3', rating: 5, created_at: '2026-07-22T10:00:00Z', comment: null },
]

const Box = ({ id, title, children, dark }) => (
  <div style={{ marginBottom: 26 }}>
    <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{title}</p>
    <div id={id} data-shot={id}
         style={{ width: 390, background: dark ? '#2E1065' : '#f4f4f6',
                  borderRadius: 24, padding: 14,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.10)' }}>
      {children}
    </div>
  </div>
)

/* The pricing block out of JobDetails. Rendered here from the same
   `moneyFor` the screen calls, so the figures are the screen's figures. */
function Pricing() {
  const m = moneyFor(JOB, { hasPan: true })
  const r = p => formatINR(Math.round(p / 100))
  const Line = ({ label, note, value }) => (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">{label}{note && <span className="ml-1 text-ink-mute">· {note}</span>}</dt>
      <dd className="shrink-0 font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  )
  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">Pricing</p>
      <p className="mt-0.5 text-[11.5px] font-semibold text-ink-mute">
        Set by Sambramo when the customer booked. It does not change.
      </p>
      <dl className="mt-3 space-y-1.5 text-[12.5px]">
        <Line label="The customer paid" value={r(m.customerPaise)} />
        <Line label="Sambramo's fee" note={`${Math.round(m.commissionRate * 100)}% commission`}
              value={`− ${r(m.commissionPaise)}`} />
        <Line label="TCS (GST)" note="deposited for you" value={`− ${r(m.tcsPaise)}`} />
        <Line label="TDS" note={m.tdsWaived ? 'waived — PAN on file' : 'deposited for you'}
              value={m.tdsPaise ? `− ${r(m.tdsPaise)}` : r(0)} />
      </dl>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-forest-50 px-3.5 py-3 ring-1 ring-forest-200">
        <span className="text-[13px] font-extrabold text-forest-900">Reaches your account</span>
        <span className="font-serif text-[19px] font-extrabold tabular-nums text-forest-900">
          {r(m.netPaise)}
        </span>
      </div>
    </section>
  )
}

function Requirements() {
  const reqs = requirementsFor(JOB, null)
  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
        What the customer asked for
      </p>
      <ul className="mt-2 space-y-1.5">
        {reqs.map(q => (
          <li key={q.id} className="flex items-start gap-2 text-[13px] leading-snug text-ink-soft">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span className={q.theirWords ? 'italic' : ''}>{q.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function JobAndProfile() {
  return (
    <MemoryRouter>
      <div style={{ display: 'flex', flexDirection: 'column', padding: 16, background: '#eee' }}>
        <Box id="shotStats" title="Jobs home · four counts, each a count of rows" dark>
          <JobsStats vendorId={null} />
        </Box>

        <Box id="shotPricing" title="Job details · pricing, with the two lines the mock omits">
          <Pricing />
        </Box>

        <Box id="shotReqs" title="Job details · requirements, derived from what the customer gave">
          <Requirements />
        </Box>

        <Box id="shotTimeline" title="Job details · booking timeline">
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
            <JobTimeline job={JOB} claim={null} />
          </div>
        </Box>

        <Box id="shotReceipt" title="Payout receipt · and it closes">
          <PayoutReceipt claim={CLAIM} job={JOB} hasPan />
        </Box>

        <Box id="shotProfile" title="More · your public profile">
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
            <PublicProfilePreview vendor={VENDOR} reviews={REVIEWS} services={SERVICES} />
          </div>
        </Box>
      </div>
    </MemoryRouter>
  )
}
