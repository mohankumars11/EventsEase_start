import { Zap, CalendarClock, IndianRupee, ShieldAlert, ChevronRight } from 'lucide-react'

/**
 * What needs doing, above everything else — and nothing when nothing does.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A ZERO IS NOT WORTH A CARD
 * ══════════════════════════════════════════════════════════════════════
 *
 * The temptation is a neat row of four tiles that always renders, two of
 * them reading 0. That spends the most valuable strip of the screen
 * saying nothing is wrong, and it trains the partner to stop reading it
 * — which is fatal, because the one day it says "respond in 25 minutes"
 * is the day it must be read.
 *
 * So each row appears only when its count is non-zero, and if none are,
 * this component renders nothing at all and the opportunities below
 * move up.
 *
 * ── Ordered by what it costs to miss ───────────────────────────────
 *   an expiring offer     gone in minutes, and gone for good
 *   something sent back   blocks everything until it is fixed
 *   money to claim        theirs already, just not asked for
 *   an unfunded job       worth knowing before buying stock
 *   tomorrow's event      important, but not a surprise
 */
const ROWS = [
  {
    key: 'openOffers', icon: Zap, tone: 'rose',
    label: n => `${n} new ${n === 1 ? 'opportunity' : 'opportunities'}`,
    sub: 'Respond before they expire',
  },
  {
    key: 'requiresAction', icon: ShieldAlert, tone: 'amber',
    label: () => 'Action required',
    sub: 'We have sent something back to you',
  },
  {
    key: 'claimable', icon: IndianRupee, tone: 'forest',
    label: n => `${n} ${n === 1 ? 'job' : 'jobs'} ready to claim`,
    sub: 'Delivered — ask for your payment',
  },
  {
    key: 'awaitingPayment', icon: CalendarClock, tone: 'plum',
    label: n => `${n} awaiting customer payment`,
    sub: 'Confirmed once the customer pays',
  },
]

const TONE = {
  rose:   { box: 'bg-rose-50 ring-rose-200',     icon: 'bg-rose-600 text-white',    text: 'text-rose-900' },
  amber:  { box: 'bg-amber-50 ring-amber-200',   icon: 'bg-amber-500 text-white',   text: 'text-amber-900' },
  forest: { box: 'bg-forest-50 ring-forest-200', icon: 'bg-forest-600 text-white',  text: 'text-forest-900' },
  plum:   { box: 'bg-plum-50 ring-plum-200',     icon: 'bg-plum-600 text-white',    text: 'text-plum-900' },
}

export default function AttentionSummary({ counts, onOpen }) {
  const rows = ROWS
    .map(r => ({ ...r, n: Number(counts?.[r.key] ?? 0) }))
    .filter(r => r.n > 0)

  if (!rows.length) return null

  return (
    <section className="mb-4" aria-label="Needs your attention">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-mute">
        Needs you
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map(r => {
          const Icon = r.icon
          const t = TONE[r.tone]
          return (
            <li key={r.key}>
              <button
                type="button"
                data-attention={r.key}
                onClick={() => onOpen?.(r.key)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition active:scale-[0.99] ${t.box}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13.5px] font-extrabold leading-tight ${t.text}`}>
                    {r.label(r.n)}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug opacity-70">{r.sub}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 opacity-50" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
