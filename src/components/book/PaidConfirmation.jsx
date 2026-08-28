import { useEffect, useState } from 'react'
import { Check, CalendarDays, MapPin, Loader2, ShieldCheck, Phone, Search } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { PAID } from '../../config/instantBooking'
import TradeSprite from './TradeSprite'

/**
 * The screen after the money moves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO STATES, BECAUSE THERE ARE TWO DIFFERENT FACTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay's callback fires in the browser. It means a dialog closed
 * successfully. It does NOT mean the money is recorded, because
 * `api/razorpay-webhook.js` is the only witness and it lands a second or
 * two later.
 *
 * A screen that shouted "Confirmed!" the instant the callback fired
 * would be claiming something it cannot know, on the single screen where
 * being wrong is most expensive — a customer who is told their date is
 * blocked and later finds it is not will never book again.
 *
 * So it says the true thing first ("Payment received. We are confirming
 * it with your masters.") and the stronger thing when the LINE actually
 * turns `paid` in the database. The gap is usually under two seconds and
 * the customer sees a tick land, which is better theatre than a fake
 * one anyway.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT HAS TO CONTAIN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything somebody would otherwise open a support chat to ask. Who is
 * coming, for what, on what date, where, what was paid, what happens to
 * the money, when the master calls, and what happens to the services
 * nobody has taken yet.
 *
 * A "Payment successful ✓" with a Done button is the cheapest possible
 * version of this screen and the most expensive one to run.
 */
export default function PaidConfirmation({ paidLines, offers, eventDate, area, stillLooking, onDone }) {
  const settled = paidLines.filter(l => l.status === 'paid' || l.status === 'in_progress'
    || l.status === 'delivered' || l.status === 'settled')
  const confirmed = settled.length === paidLines.length && paidLines.length > 0

  /* The tick lands rather than appearing. 420ms after the state flips —
     long enough to be seen as a change, short enough not to be a wait. */
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    if (!confirmed) return
    const t = setTimeout(() => setLanded(true), 60)
    return () => clearTimeout(t)
  }, [confirmed])

  const total = paidLines.reduce((n, l) => n + (l.quoted_amount_paise ?? 0), 0)
  const day = eventDate ? new Date(eventDate + 'T00:00:00') : null

  const head = confirmed ? PAID.done : PAID.pending

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">

      {/* ── The mark ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${
            confirmed ? 'bg-forest-600 text-white' : 'bg-forest-100 text-forest-700'
          } ${landed ? 'scale-100' : 'scale-90'}`}
        >
          {confirmed
            ? <Check size={30} strokeWidth={3} className="sb-fade-in motion-reduce:animate-none" />
            : <Loader2 size={26} className="animate-spin" />}
        </span>

        <h1 className="mt-4 font-serif text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">
          {head.title}
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-soft">
          {confirmed ? PAID.done.body(paidLines.length) : PAID.pending.body}
        </p>
      </div>

      {/* ── When and where. The two facts a date-block is about ──── */}
      {day && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-[22px] bg-white p-4 text-[13px] font-bold text-ink ring-1 ring-ink/[0.06]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} className="text-saffron-600" />
            {day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {area && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-saffron-600" />{area}
            </span>
          )}
        </div>
      )}

      {/* ── Who is coming ────────────────────────────────────────── */}
      <p className="mt-6 type-overline text-ink-mute">
        {paidLines.length === 1 ? 'Your master' : `Your ${paidLines.length} masters`}
      </p>

      <ul className="mt-2 rounded-[22px] bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-ink/[0.06]">
        {paidLines.map(l => {
          const won = offers.find(o => o.line_id === l.id && o.status === 'ACCEPTED')
          const done = l.status !== 'accepted'
          return (
            <li key={l.id} className="flex items-center gap-3 border-b border-ink/[0.05] py-3.5 last:border-0">
              <TradeSprite trade={l.trade} serviceId={l.service_id} active={false} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
                  {won?.vendors?.business_name ?? l.service_name}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-ink-mute">
                  {l.service_name}
                  {won?.distance_m != null && ` · ${(won.distance_m / 1000).toFixed(1)} km away`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13.5px] font-extrabold tabular-nums text-ink">
                  {formatINR(Math.round((l.quoted_amount_paise ?? 0) / 100))}
                </p>
                <p className={`text-[10.5px] font-extrabold ${done ? 'text-forest-700' : 'text-ink-mute'}`}>
                  {done ? 'Confirmed' : 'Confirming…'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between rounded-[22px] bg-plum-50/70 px-4 py-3">
        <span className="text-[13px] font-bold text-ink-soft">Paid</span>
        <span className="text-[17px] font-extrabold tabular-nums text-ink">
          {formatINR(Math.round(total / 100))}
        </span>
      </div>

      {/* ── Where the money is. Escrow, said in one sentence ─────── */}
      <p className="mt-3 flex items-start gap-2 rounded-[18px] bg-forest-50 p-3.5 text-[12.5px] font-semibold leading-relaxed text-forest-900 ring-1 ring-forest-200/60">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-forest-700" />
        {PAID.held}
      </p>

      {/* ── The services nobody has taken yet ────────────────────── */}
      {stillLooking > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-[18px] bg-surface-sunk/[0.05] p-3.5 text-[12.5px] font-semibold leading-relaxed text-ink-soft">
          <Search size={15} className="mt-0.5 shrink-0 text-ink-mute" />
          {stillLooking === 1
            ? 'One service is still being offered to masters. We will alert you when someone accepts — nothing you have paid for is affected.'
            : `${stillLooking} services are still being offered to masters. We will alert you as each one accepts — nothing you have paid for is affected.`}
        </p>
      )}

      {/* ── What happens next, in order ──────────────────────────── */}
      <p className="mt-7 type-overline text-ink-mute">What happens next</p>
      <ol className="mt-2 space-y-3.5">
        {PAID.next.map(([t, b], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11.5px] font-extrabold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold leading-tight text-ink">{t}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{b}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        onClick={onDone}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
      >
        <Phone size={16} /> Track this booking
      </button>
    </div>
  )
}
