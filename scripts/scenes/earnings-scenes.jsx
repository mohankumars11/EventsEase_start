/**
 * Earnings, before and after a partner has done any work.
 *
 * The tab printed partner_amount_paise while the offer card printed
 * partnerEarnings().netPaise — the same job read ₹10,540 here and
 * ₹10,416 there, and the smaller one was what arrived.
 */
import React from 'react'
import { Wallet, Clock, ShieldCheck, Banknote } from 'lucide-react'
import { formatINR } from '../../src/utils/format'
import { partnerEarnings } from '../../src/lib/instantPricing'

const TONE = {
  forest:  'bg-forest-50 text-forest-700 ring-forest-200',
  saffron: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  ink:     'bg-ink/[0.03] text-ink-mute ring-ink/[0.07]',
}

function Screen({ label, stages, total, ready }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{label}</p>
      <div className="space-y-3.5">
        {ready > 0 && (
          <div className="rounded-[22px] bg-forest-50 p-4 ring-1 ring-forest-200">
            <p className="text-[13.5px] font-extrabold leading-tight text-forest-900">
              2 jobs are ready to be paid out
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-forest-800">
              {formatINR(Math.round(ready / 100))} in total. Ask for it whenever
              you like — it does not expire.
            </p>
            <div className="mt-2.5 rounded-2xl bg-white p-2.5 ring-1 ring-forest-200/70">
              <p className="mb-1.5 text-[12.5px] font-extrabold text-ink">
                Candid photography
                <span className="ml-1.5 font-serif text-[13px] tabular-nums text-ink-soft">₹9,204</span>
              </p>
              <button className="w-full rounded-2xl bg-forest-600 py-2.5 text-[13px] font-extrabold text-white">
                Ask to be paid
              </button>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-[22px] bg-plum-950 p-4 text-white">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/70">Yours, all in</p>
          <p className="mt-1 font-serif text-[32px] font-extrabold leading-none tracking-tight tabular-nums">
            {formatINR(Math.round(total / 100))}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold leading-snug text-white/75">
            {total === 0
              ? 'Nothing yet. It starts with your first accepted job.'
              : 'After the platform fee and the tax deposited for you — the same figure the offer showed you when you accepted.'}
          </p>
        </div>
        <div className="space-y-2">
          {stages.map(c => {
            const Icon = c.icon
            return (
              <div key={c.id} className={`flex items-center gap-3 rounded-[20px] p-3.5 ring-1 ${TONE[c.tone]}`}>
                <Icon size={17} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold leading-snug text-ink">{c.label}</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold leading-snug opacity-80">
                    {c.n === 0 ? c.scan : `${c.n} job${c.n === 1 ? '' : 's'} · ${c.scan}`}
                  </p>
                </div>
                <p className="shrink-0 font-serif text-[19px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
                  {formatINR(Math.round(c.value / 100))}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const j = q => partnerEarnings(q).netPaise

export default function EarningsScenes() {
  const busy = [
    { id: 'pending', icon: Clock, tone: 'ink', label: 'Waiting on the customer',
      value: j(1800000), n: 1, scan: 'You have the job. The customer has not paid yet.' },
    { id: 'held', icon: ShieldCheck, tone: 'saffron', label: 'Paid, and held for you',
      value: j(2600000), n: 2, scan: 'The money exists. It is yours once the job is done.' },
    { id: 'ready', icon: Banknote, tone: 'forest', label: 'Ready to claim',
      value: j(2100000), n: 2, scan: 'Done and cleared. Ask for it whenever you like.' },
    { id: 'paid', icon: Wallet, tone: 'ink', label: 'In your account',
      value: j(5400000), n: 6, scan: 'Already sent.' },
  ]
  const empty = [
    { id: 'ready', icon: Banknote, tone: 'forest', label: 'Ready to claim',
      value: 0, n: 0, scan: 'Done and cleared. Ask for it whenever you like.' },
  ]
  return (
    <div id="earn" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Screen label="A partner with work" stages={busy}
        total={j(2600000) + j(2100000) + j(5400000)} ready={j(2100000)} />
      <Screen label="A brand new partner" stages={empty} total={0} ready={0} />
    </div>
  )
}
