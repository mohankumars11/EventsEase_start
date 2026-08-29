import { Check } from 'lucide-react'
import { optionsFor } from '../../data/serviceOptions'
import TradeSprite from './TradeSprite'

/**
 * The questions that decide the price, asked before it is paid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SCREEN EXISTS AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The flow used to go: tap Photography, see a price, book. Two customers
 * pressing that button wanted a candid team following a bride all day
 * and one person taking posed family photos for two hours — one price,
 * one dispatch, and a master arriving to an argument.
 *
 * The old answer was to defer it: "your master will call to confirm".
 * That is right for a theme or a mehendi design, which nobody can
 * specify in a form. It is wrong for the fork that decides the COST,
 * because deferring that means agreeing the money after the money has
 * moved.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PRICE MOVES WHILE THEY CHOOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every card shows what it does to the total, immediately, before
 * anything is committed. A customer who picks "candid" and discovers
 * afterwards that it cost 35% more has been charged a surprise — the
 * `hidden_costs` pattern in config/legal.js, and the fastest way to turn
 * a booking into a refund request.
 *
 * Nothing here is a nudge toward the expensive option. The default is
 * marked, it is always the cheapest, and the differences are stated as
 * what arrives rather than as what is missing from the cheaper one.
 */
export default function ServiceOptions({ serviceId, serviceName, trade, value = {}, onChange, priceOf }) {
  const groups = optionsFor(serviceId)
  if (!groups.length) return null

  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <header className="flex items-center gap-2.5">
        <TradeSprite serviceId={serviceId} trade={trade} active={false} size={32} />
        <h3 className="text-[15px] font-extrabold text-ink">{serviceName}</h3>
      </header>

      {groups.map(group => (
        <div key={group.id} className="mt-4 first:mt-3.5">
          <p className="text-[13px] font-extrabold text-ink">{group.question}</p>

          <div className="mt-2 space-y-1.5">
            {group.choices.map(choice => {
              const picked = value[group.id] === choice.id

              /* What this choice makes the line cost, in rupees, now.
                 Not "+35%" — a percentage is arithmetic somebody has to
                 do while deciding, and the number they care about is the
                 one they will pay. */
              const rupees = priceOf?.({ ...value, [group.id]: choice.id })

              return (
                <button
                  key={choice.id}
                  onClick={() => onChange?.({ ...value, [group.id]: choice.id })}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.995] ${
                    picked
                      ? 'bg-forest-50 ring-2 ring-forest-500'
                      : 'bg-surface-sunk/[0.05] ring-1 ring-ink/[0.05] hover:ring-ink/[0.12]'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    picked ? 'bg-forest-600 text-white' : 'ring-1 ring-ink/20'
                  }`}>
                    {picked && <Check size={12} strokeWidth={3} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-extrabold leading-tight text-ink">
                      {choice.label}
                    </span>
                    {choice.scan && (
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                        {choice.scan}
                      </span>
                    )}
                  </span>

                  {rupees != null && (
                    <span className={`shrink-0 text-[13px] font-extrabold tabular-nums ${
                      picked ? 'text-forest-800' : 'text-ink-mute'
                    }`}>
                      ₹{rupees.toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
