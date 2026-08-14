import { ShoppingBasket, ChefHat, BadgeCheck } from 'lucide-react'
import { SERVICE_MODEL, FULFILMENT } from '../../config/shop'

const ICONS = { choose: ShoppingBasket, source: ChefHat, deliver: BadgeCheck }

/**
 * "So who am I actually buying from?"
 *
 * The three steps come from SERVICE_MODEL in config/shop, so this component
 * decides how the answer looks and never what it says — the same reason
 * FULFILMENT lives in config: the promise is repeated on five screens and the
 * wording drifting between them is what turns it into marketing.
 *
 * The connecting rail is drawn behind the numbers, not between the cards, so
 * it survives the cards wrapping to one column on a narrow phone.
 */
export default function HowWeServe({ className = '' }) {
  return (
    <section className={`rounded-3xl bg-surface-sunk/[0.07] p-5 ring-1 ring-hairline/10 ${className}`} aria-labelledby="serve-heading">
      <h2 id="serve-heading" className="text-[15px] font-extrabold text-ink">
        How Sambramo serves you
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{FULFILMENT.line}</p>

      <ol className="relative mt-5 space-y-4">
        {/* The rail. Stops short at both ends so it reads as a path between
            the three markers rather than a border down the list. */}
        <span
          aria-hidden="true"
          className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-saffron-400/60 via-white/20 to-forest-300/50"
        />
        {SERVICE_MODEL.map((step, i) => {
          const Icon = ICONS[step.id] ?? BadgeCheck
          return (
            <li key={step.id} className="relative flex gap-3.5">
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-saffron-300 ring-1 ring-white/15">
                <Icon size={17} strokeWidth={2.2} />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-saffron-400 text-[9px] font-extrabold text-forest-900">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-ink">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{step.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
