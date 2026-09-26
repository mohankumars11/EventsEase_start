import { ArrowRight, Banknote, Landmark, ShieldCheck, Sparkles } from 'lucide-react'
import { formatINR } from '../../../utils/format'
import { destinationOf, payoutReady } from '../../../lib/documents/mask'

export default function EarningsHero({
  readyPaise = 0, readyCount = 0, payout, onClaim, onAddPayout, claiming = false,
}) {
  const ready = payoutReady(payout)
  const has = readyPaise > 0

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white p-4 shadow-[0_12px_32px_rgba(42,8,92,0.08)] ring-1 ring-plum-100">
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-plum-100/80 blur-2xl" />
      <div className="absolute -left-8 bottom-[-55px] h-28 w-28 rounded-full bg-fuchsia-100/70 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-plum-50 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] text-plum-700 ring-1 ring-plum-100">
            <Sparkles size={11} />
            Ready to claim
          </div>
          <p className="mt-2 font-serif text-[34px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {formatINR(Math.round(readyPaise / 100))}
          </p>
          <p className="mt-2 max-w-[245px] text-[12px] font-semibold leading-snug text-ink-mute">
            {has
              ? `${readyCount} ${readyCount === 1 ? 'job is' : 'jobs are'} done and past the holding window.`
              : 'Nothing is claimable yet. Money becomes yours a day after the event.'}
          </p>
        </div>

        <div className="relative mt-1 flex h-[82px] w-[88px] shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-plum-700 to-purple-500 text-white shadow-[0_16px_28px_rgba(42,8,92,0.22)]">
          <Landmark size={36} />
          <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-plum-700 shadow-lg ring-1 ring-plum-100">
            <Banknote size={18} />
          </span>
          <span className="absolute -bottom-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-forest-100 text-forest-700 shadow-md">
            <ShieldCheck size={15} />
          </span>
        </div>
      </div>

      {has && ready && onClaim && (
        <button
          type="button" onClick={onClaim} disabled={claiming}
          className="relative mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13.5px] font-extrabold text-white shadow-[0_10px_20px_rgba(42,8,92,0.18)] disabled:opacity-60"
        >
          {claiming ? 'Asking…' : `Ask for ${formatINR(Math.round(readyPaise / 100))}`}
          {!claiming && <ArrowRight size={15} />}
        </button>
      )}

      {has && ready && !onClaim && (
        <p className="relative mt-3 rounded-[14px] bg-plum-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-plum-900">
          Open any job marked <span className="font-extrabold">Ready</span> below to ask for its payment.
        </p>
      )}

      {has && !ready && (
        <button
          type="button" onClick={onAddPayout}
          className="relative mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white shadow-[0_10px_20px_rgba(42,8,92,0.18)]"
        >
          {payout ? 'We are checking your account' : 'Add your bank account'}
          <ArrowRight size={14} />
        </button>
      )}

      <div className="relative mt-3 flex items-center gap-1.5 border-t border-ink/[0.07] pt-2.5">
        <Landmark size={13} className="shrink-0 text-plum-600" />
        <span className="min-w-0 truncate text-[11.5px] font-semibold text-ink-mute">
          {payout
            ? `Paid straight to ${destinationOf(payout)}`
            : 'Paid straight to your bank. No wallet, no balance held here.'}
        </span>
      </div>
    </section>
  )
}
