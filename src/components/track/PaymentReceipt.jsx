import { Check, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * What happened the moment the money landed, and what happens next.
 *
 * ── Why this is its own panel ─────────────────────────────────────────────
 * Paying is the most anxious thirty seconds a customer has with this product.
 * They have just sent a five-figure sum over UPI to a brand with no reviews,
 * for a wedding that is weeks away, and the only thing standing between that
 * and a support message is whether the screen tells them — specifically, with
 * times — that it landed and what it set off.
 *
 * A status chip does not do that. "Received" answers the narrow question and
 * leaves the real one ("so is my wedding actually happening?") unanswered.
 * This panel answers the real one: here is every step we have on record, here
 * is the one that just completed, and here is precisely what we are doing
 * tomorrow.
 *
 * ── It only claims what is recorded ───────────────────────────────────────
 * Every line below is a row that exists — the request, the approved plan, the
 * verified payment. `at` is printed where a timestamp exists and left blank
 * where one does not, rather than being filled in with now(). The one
 * forward-looking line is written as a statement of what we do next, not as a
 * claim that it is done.
 *
 * ── Claimed is not received, on this panel above all ──────────────────────
 * If the gateway callback landed but the webhook has not, this renders the
 * checking state — an honest "we can see it, we are matching it" — and does
 * NOT tell the customer their celebration is funded. That distinction is the
 * whole reason `isSettled` exists, and this is the screen where breaking it
 * would cost the most.
 */
export default function PaymentReceipt({
  settlement,
  item,
  proposal = null,
  ledger = null,
  className = '',
}) {
  if (!settlement || settlement.basis !== 'confirmed') return null

  const row = settlement.settlement
  const checking = row.status === 'checking'
  if (!settlement.settled && !checking) return null

  /* ── Checking: seen, not yet matched ──────────────────────────────── */
  if (checking) {
    return (
      <section className={`overflow-hidden rounded-2xl bg-saffron-400/[0.10] ring-1 ring-saffron-400/30 ${className}`}>
        <div className="flex items-start gap-3 px-4 py-4">
          <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-400/25">
            <Loader2 size={17} className="animate-spin text-saffron-700" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold text-ink">We can see your payment</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              It is being matched against our bank now. This is usually a couple of
              minutes over UPI, and we do not mark your celebration funded until it is
              confirmed — you will see this panel change on its own.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
              Nothing is needed from you. If it has not cleared within a few hours, message
              your coordinator and quote {item?.reference}.
            </p>
          </div>
        </div>
      </section>
    )
  }

  /* ── Received ─────────────────────────────────────────────────────── */

  // Every step this app can stand behind, in the order it happened. A line is
  // included only when the record backing it exists.
  const captured = [
    {
      key: 'request',
      title: 'Your request came in',
      detail: `${item?.title ?? 'Your celebration'}${item?.guestCount ? ` · ${item.guestCount} guests` : ''}`,
      at: item?.at ?? null,
    },
    proposal && {
      key: 'plan',
      title: 'Your price was confirmed and approved',
      detail: `${formatINR(settlement.confirmedTotal)}, the whole celebration`,
      at: proposal.updated_at ?? proposal.created_at ?? null,
    },
    settlement.hold?.settled && {
      key: 'hold',
      title: 'Your date was held',
      detail: `${formatINR(settlement.hold.amount)} — taken off your payment`,
      at: settlement.hold.payment?.paid_at ?? null,
    },
    {
      key: 'payment',
      title: 'Your payment was received',
      detail: `${formatINR(settlement.confirmedTotal)} · paid in full · nothing further to pay`,
      at: row.payment?.paid_at ?? null,
      emphasis: true,
    },
  ].filter(Boolean)

  const booked = ledger?.counts?.booked ?? 0
  const totalServices = ledger?.counts?.total ?? 0

  return (
    <section className={`overflow-hidden rounded-2xl bg-surface ring-1 ring-forest-500/25 ${className}`}>
      {/* The headline somebody paid to see. */}
      <div className="flex items-start gap-3 bg-forest-50 px-4 py-4">
        <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
          <Check size={18} strokeWidth={3.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-snug text-forest-900">
            Payment received. Your celebration is confirmed.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-forest-800/80">
            {formatINR(settlement.confirmedTotal)} paid in full. There is no balance, and
            nothing will be collected after the day.
          </p>
        </div>
      </div>

      {/* ── Everything we hold on record ───────────────────────────── */}
      <div className="px-4 py-3.5">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute">
          Every step captured
        </p>
        <ol className="space-y-2.5">
          {captured.map(step => (
            <li key={step.key} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  step.emphasis ? 'bg-forest-600 text-white' : 'bg-forest-500/15 text-forest-700'
                }`}
              >
                <Check size={11} strokeWidth={4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className={`text-[12.5px] ${step.emphasis ? 'font-extrabold text-ink' : 'font-bold text-ink-soft'}`}>
                    {step.title}
                  </span>
                  <span className="text-[10.5px] tabular-nums text-ink-mute">
                    {step.at
                      ? new Date(step.at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                        })
                      : 'time not recorded'}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-mute">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── And the one that has not happened yet ────────────────────
          Written as what we are doing, not as a tick. The moment this becomes
          a green tick before the work is done, every tick above it is worth
          less. */}
      <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.03] px-4 py-3.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute">
          What happens next
        </p>
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <ArrowRight size={11} strokeWidth={3.5} />
          </span>
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink-soft">
            <span className="font-extrabold text-ink">Your celebration is on our board.</span>{' '}
            {totalServices > 0
              ? <>Your coordinator is now placing the booking advances and locking in each of
                  your {totalServices} services. {booked > 0
                    ? <>{booked} {booked === 1 ? 'is' : 'are'} already confirmed — </>
                    : null}
                  every one of them appears in the list below and turns green the moment it is
                  booked.</>
              : <>Your coordinator is now placing the booking advances and locking in every part
                  of your celebration. Each one appears here and turns green the moment it is
                  booked.</>}
          </p>
        </div>
        <p className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute">
          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-forest-600" />
          You do not have to check in. Anything that needs you appears at the top of this
          screen and on your Track tab.
        </p>
      </div>
    </section>
  )
}
