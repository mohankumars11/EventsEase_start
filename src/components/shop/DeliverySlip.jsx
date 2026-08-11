import { useMemo } from 'react'
import { MapPin, CalendarDays, ChevronRight, AlertCircle } from 'lucide-react'
import { useCity } from '../../context/CityContext'
import { useCart } from '../../context/CartContext'
import { toISODate, todayISO, humanDate } from '../../utils/format'

/**
 * Where, and when. The two facts that turn a browse into an order.
 *
 * The storefront is built entirely around occasions — a festival countdown at
 * the top, "What are we celebrating?", five occasion shortcuts, fifty-odd
 * occasion tags on the cake catalogue — and it never once asked what day the
 * occasion was, or confirmed which city it was delivering to. A customer
 * could pick a birthday cake, customise the flavour, the weight, the message
 * piped on top, pay, and never state the date of the birthday. The question
 * got asked afterwards, by a human, over WhatsApp.
 *
 * That is the gap this fills, and it is deliberately *one* control rather
 * than two. "Deliver to Bengaluru, on Sat 16 Aug" is a single sentence a
 * shopper reads in one glance and either accepts or corrects — the two halves
 * are the same thought. Splitting them into a city widget and a date widget
 * would put two more things on a screen that already carries an app bar, an
 * offers rail and a countdown.
 *
 * ── What it does not claim ─────────────────────────────────────────────
 * No slot windows, no "same-day before 2pm", no promised courier ETA.
 * Sambramo is pre-launch and sources per order — FulfilmentNote says exactly
 * that on five screens, and inventing a delivery SLA here would make this the
 * one component in the shop that lies. The date is captured as the customer's
 * *requirement*, which is honest and useful, and confirmed by a human the way
 * every other commitment in this product is.
 */

export default function DeliverySlip({ className = '' }) {
  const { city, chosen, servable, openCityPicker } = useCity()
  const { cart, dispatch } = useCart()

  const deliveryDate = cart.deliveryDate ?? ''
  const when = humanDate(deliveryDate)

  // A date in the past is worse than no date: the order is unfulfillable and
  // nothing downstream would catch it. This can happen without any misuse —
  // leave the tab open overnight and yesterday's "Today" is now stale.
  const stale = deliveryDate && deliveryDate < todayISO()

  const min = todayISO()
  // A year out. Not a policy — just the point past which a date entry is far
  // more likely to be a typo than a plan.
  const max = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return toISODate(d)
  }, [])

  return (
    <div className={`px-4 ${className}`}>
      <div className="flex items-stretch overflow-hidden rounded-2xl bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-sm">

        {/* ── Where ────────────────────────────────────────────────
            Opens the same sheet as the app bar's city control, because it is
            the same decision. Two ways to reach one sheet, never two pickers. */}
        <button
          onClick={openCityPicker}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.06] active:bg-white/10"
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            chosen && !servable ? 'bg-chilli-500/20 text-chilli-300' : 'bg-saffron-400/15 text-saffron-300'
          }`}>
            {chosen && !servable ? <AlertCircle size={15} /> : <MapPin size={15} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
              Deliver to
            </span>
            <span className="flex items-center gap-1">
              <span className={`truncate text-[13px] font-extrabold ${
                chosen && !servable ? 'text-chilli-300' : 'text-white'
              }`}>
                {chosen ? city : 'Pick your city'}
              </span>
              <ChevronRight size={12} className="shrink-0 text-white/30" />
            </span>
          </span>
        </button>

        <span aria-hidden="true" className="my-2.5 w-px shrink-0 bg-white/10" />

        {/* ── When ─────────────────────────────────────────────────
            A native date input, not a custom calendar. On a phone it opens the
            OS date wheel the customer already knows how to drive, it handles
            locale and leap years for free, and it is keyboard-and-screen-reader
            correct without a line of code. A hand-rolled calendar here would be
            300 lines to be slightly worse at all four.

            The input is laid over the label rather than beside it: styling a
            native date field consistently across iOS Safari, Chrome and Firefox
            is not achievable, so it goes transparent on top and the text below
            is what everyone actually sees. */}
        <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            stale ? 'bg-chilli-500/20 text-chilli-300' : when ? 'bg-saffron-400/15 text-saffron-300' : 'bg-white/10 text-white/50'
          }`}>
            <CalendarDays size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
              Needed on
            </span>
            <span className="flex items-center gap-1">
              <span className={`truncate text-[13px] font-extrabold ${
                stale ? 'text-chilli-300' : when ? 'text-white' : 'text-white/60'
              }`}>
                {stale ? 'Date has passed' : when ?? 'Pick a date'}
              </span>
              <ChevronRight size={12} className="shrink-0 text-white/30" />
            </span>
          </span>

          <input
            type="date"
            value={stale ? '' : deliveryDate}
            min={min}
            max={max}
            onChange={e => dispatch({ type: 'SET_DELIVERY_DATE', date: e.target.value || null })}
            aria-label="Date you need this delivered"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>

      {/* The one line of consequence, and only when there is one. A permanent
          explanatory caption under a control this small is noise; a caption
          that appears exactly when the customer needs to act is a warning. */}
      {chosen && !servable && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-chilli-200">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          We can't deliver to {city} yet — nothing here can be ordered to that address.{' '}
          <button onClick={openCityPicker} className="font-bold underline underline-offset-2">
            Change city
          </button>
        </p>
      )}
    </div>
  )
}
