/**
 * The rebuilt Earnings screen, in the states that matter.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE PIECES AND NOT THE SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * `Earnings.jsx` reads its own data and needs a router. Mounting it here
 * would photograph the failed-read state and nothing else — which is
 * what `earnings-states.jsx` is for, and it is the right shot for that
 * one question.
 *
 * This file answers the other question: given rows, does the screen draw
 * them correctly. The components below are the real ones from src/,
 * given rows by hand, so a missing Tailwind class or a broken arc fails
 * here exactly as it would in the app.
 *
 * What it cannot prove is that the app ever passes these rows. That is
 * `earningsSeries`' guard and, once a partner session exists, a repro
 * walk.
 *
 *   node scripts/shoot-components.mjs shots/earnings-390.png \
 *     --scenes scripts/scenes/earnings-rebuild.jsx --width 390
 *   node scripts/shoot-components.mjs shots/earnings-1280.png \
 *     --scenes scripts/scenes/earnings-rebuild.jsx --width 1280 --desktop
 */
import React from 'react'

import { buildRange, hasPriorData } from '../../src/lib/earningsRange'
import { earningsSeries } from '../../src/lib/earningsSeries'
import { statement, financialYear, annualGrossInr } from '../../src/lib/earningsStatement'
import { OWED_STATES } from '../../src/lib/payoutState'

import EarningsHero from '../../src/components/vendor/earnings/EarningsHero'
import RangeFilter from '../../src/components/vendor/earnings/RangeFilter'
import KpiCards from '../../src/components/vendor/earnings/KpiCards'
import EarningsChart from '../../src/components/vendor/earnings/EarningsChart'
import Donut from '../../src/components/vendor/earnings/Donut'
import BankPanel from '../../src/components/vendor/earnings/BankPanel'
import DocumentsSection from '../../src/components/vendor/earnings/DocumentsSection'
import EarningsStatement from '../../src/components/vendor/EarningsStatement'
import {
  TransactionList, TransactionTable,
} from '../../src/components/vendor/earnings/Transactions'

/* ── Rows ─────────────────────────────────────────────────────────────
   Dated around a fixed "today" so the photograph does not change
   meaning tomorrow. The range is built from the same constant. */
const TODAY = '2026-09-21'

let n = 0
const job = (over = {}) => ({
  line_id: `line-${++n}`,
  service_name: 'Wedding photography',
  trade: 'Photography',
  occasion_name: 'Wedding',
  area_label: 'Jayanagar',
  city: 'Bengaluru',
  status: 'delivered',
  is_funded: true,
  paid_at: '2026-09-01T00:00:00Z',
  delivered_at: '2026-09-04T00:00:00Z',
  event_date: '2026-09-03',
  quoted_amount_paise: 2500000,
  ...over,
})

const ROWS = [
  job({ event_date: '2026-09-03', quoted_amount_paise: 2500000 }),
  job({ service_name: 'Wedding catering', trade: 'Catering & Food',
        event_date: '2026-09-06', quoted_amount_paise: 8500000, area_label: 'Indiranagar' }),
  job({ service_name: 'Stage decor', trade: 'Decoration & Floral',
        event_date: '2026-09-08', quoted_amount_paise: 3200000, occasion_name: 'Engagement' }),
  job({ service_name: 'Candid photography', trade: 'Photography',
        event_date: '2026-09-12', quoted_amount_paise: 1800000, occasion_name: 'Naming day' }),
  job({ service_name: 'Banquet hall', trade: 'Venue',
        event_date: '2026-09-15', quoted_amount_paise: 6000000, occasion_name: 'Reception' }),
  /* Held: delivered but inside the 24-hour window. */
  job({ service_name: 'Mehendi artist', trade: 'Mehendi Artist',
        event_date: '2026-09-21', quoted_amount_paise: 900000,
        delivered_at: '2026-09-21T06:00:00Z' }),
  /* Not yours yet: accepted, customer has not paid. */
  job({ service_name: 'Sound and AV', trade: 'Sound & AV',
        event_date: '2026-09-27', quoted_amount_paise: 2200000,
        is_funded: false, paid_at: null, delivered_at: null, status: 'accepted' }),
  /* Last month, so the comparison has something real behind it. */
  job({ service_name: 'Birthday decor', trade: 'Decoration & Floral',
        event_date: '2026-08-14', quoted_amount_paise: 1500000 }),
  job({ service_name: 'Corporate shoot', trade: 'Photography',
        event_date: '2026-08-22', quoted_amount_paise: 4000000 }),
  /* Cancelled, which must appear in no total. */
  job({ service_name: 'Valet parking', trade: 'Valet Parking',
        event_date: '2026-09-09', status: 'cancelled', quoted_amount_paise: 700000 }),
]

const CLAIMS = {
  'line-1': { id: 'c1', line_id: 'line-1', status: 'paid', amount_paise: 2300000,
              destination: 'Account ending 4417', requested_at: '2026-09-05T00:00:00Z',
              settled_at: '2026-09-07T00:00:00Z', reference: 'UTR9920481773' },
  'line-2': { id: 'c2', line_id: 'line-2', status: 'requested', amount_paise: 7820000,
              destination: 'Account ending 4417', requested_at: '2026-09-18T00:00:00Z' },
  'line-3': { id: 'c3', line_id: 'line-3', status: 'failed',
              destination: 'Account ending 4417', requested_at: '2026-09-14T00:00:00Z',
              failure_reason: 'The bank returned it: the account name did not match.' },
}

const PAYOUT = {
  method: 'bank', account_number: '000111224417', verified_at: '2026-07-01T00:00:00Z',
  pan: 'ABCDE1234F', upi_id: null,
}

const VENDOR = { business_name: 'Suresh Studios', partner_code: 'SBM-0142' }

const FY = financialYear(new Date(`${TODAY}T00:00:00+05:30`))
const ANNUAL = annualGrossInr(ROWS, FY)

function build(rangeId, rows = ROWS, forceNoPrev = false) {
  const range = buildRange(rangeId, TODAY)
  const series = earningsSeries(rows, range, {
    hasPan: true, annualGrossInr: ANNUAL, claimBy: CLAIMS,
    /* `forceNoPrev` is how the genuinely-new-partner panel is staged.
       Passing the real `hasPriorData` for a 'today' range would be TRUE
       — there are older jobs — and the panel would photograph the
       from-nothing wording while claiming to show no-prior. Two
       different sentences, and the whole point is that they differ. */
    hasPrev: forceNoPrev ? false : hasPriorData(rows, range),
    now: Date.parse(`${TODAY}T18:00:00+05:30`),
  })
  return { range, series }
}

function Panel({ title, note, children }) {
  return (
    <section className="mb-5">
      <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {title}
      </p>
      {note && <p className="mb-2 text-[12px] leading-snug text-ink-soft">{note}</p>}
      {children}
    </section>
  )
}

export default function EarningsRebuild() {
  const { range, series } = build('month')
  const firstMonth = build('month', ROWS.filter(r => r.event_date >= '2026-09-01'), true)
  const stmt = statement(ROWS, { fy: FY, hasPan: true, annualGrossInr: ANNUAL })

  const ready = series.byState.ready ?? { net: 0, count: 0 }
  const owedJobs = OWED_STATES.reduce((n2, s) => n2 + (series.byState[s]?.count ?? 0), 0)

  const rows = series.rows
    .filter(e => e.state !== 'cancelled')
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))

  return (
    <div className="mx-auto max-w-[1180px] bg-page p-4">
      <Panel title="1 · Hero" note="Ready to claim, and where it lands. No wallet, no Razorpay badge.">
        <div className="max-w-[420px]">
          <EarningsHero
            readyPaise={ready.net} readyCount={ready.count} payout={PAYOUT}
          />
        </div>
      </Panel>

      <Panel title="2 · Hero with no account yet" note="The worst state this screen can show, said first.">
        <div className="max-w-[420px]">
          <EarningsHero readyPaise={ready.net} readyCount={ready.count} payout={null} />
        </div>
      </Panel>

      <Panel title="3 · Range filter" note="Selection is plum. Saffron means attention, never choice.">
        <RangeFilter range={range} onChange={() => {}} />
      </Panel>

      <Panel title="4 · KPI cards, with a real prior period">
        <KpiCards kpis={series.kpis} range={range} owedJobs={owedJobs} />
      </Panel>

      <Panel
        title="5 · KPI cards with NO prior period"
        note="A partner's first day. Must read in words, never +100% and never a bare dash."
      >
        <KpiCards kpis={firstMonth.series.kpis} range={firstMonth.range} owedJobs={owedJobs} />
      </Panel>

      <Panel title="6 · Earnings over time" note="Flexbox bars, not a scaled viewBox. A headless capture can photograph it.">
        <EarningsChart series={series.series} range={range} />
      </Panel>

      <Panel title="7 · By service" note="The list beside the ring is the obligation, not decoration.">
        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <Donut slices={series.byTrade} total={series.kpis.earned.value} centreLabel={range.label} />
        </section>
      </Panel>

      <Panel title="8 · Transactions, phone" note="Paid, asked for, failed, ready, held and not-yours-yet all present.">
        <div className="max-w-[420px]">
          <TransactionList rows={rows} onOpen={() => {}} />
        </div>
      </Panel>

      <Panel title="9 · Transactions, desktop" note="Same rows, same words, a table instead of cards.">
        <TransactionTable rows={rows} onOpen={() => {}} />
      </Panel>

      <Panel title="10 · Bank and documents">
        <div className="grid gap-3 md:grid-cols-2">
          <BankPanel payout={PAYOUT} onAddPayout={() => {}} />
          <BankPanel payout={{ ...PAYOUT, verified_at: null }} onAddPayout={() => {}} />
        </div>
      </Panel>

      <Panel title="11 · Statement and downloads">
        <div className="grid gap-3 md:grid-cols-2">
          <DocumentsSection statement={stmt} fy={FY} partner={VENDOR} />
          <EarningsStatement statement={stmt} />
        </div>
      </Panel>
    </div>
  )
}
