import { Link } from 'react-router-dom'
import { ShoppingBasket, SlidersHorizontal, ReceiptIndianRupee, UserCheck } from 'lucide-react'
import { CATALOG_STATS } from '../../data/planCatalog'
import { formatINR } from '../../utils/format'

/**
 * What this app is, said once, in four cards.
 *
 * ── Why this section exists at all ────────────────────────────────────────
 * Sambramo has no category. "Event planner" means a marketplace of vendor
 * listings to anyone who has used one, and that is the opposite of what
 * happens here. So a first-time visitor arrives at a grid of priced
 * celebrations with no model for what tapping one does — whether they are
 * about to browse a directory, fill in a lead form, or buy something.
 *
 * The answer is: they buy something, the way they buy groceries. Pick the
 * services you want, see the price move as you pick, book. That is genuinely
 * unusual for events in India, where the norm is "share your requirement" and
 * a phone call three days later, and it is the single most persuasive thing
 * about the product — which makes it worth four cards rather than a sentence
 * nobody reads.
 *
 * ── Why cards and not a paragraph ─────────────────────────────────────────
 * Four claims, four surfaces, one idea each. A paragraph making four claims
 * is read as one claim and three qualifiers. Each card also carries a real
 * number from the catalogue rather than an adjective — `CATALOG_STATS` is
 * derived from the same data the grid renders, so none of these can promise
 * something that is not on sale.
 *
 * ── The order is an argument ──────────────────────────────────────────────
 * It answers the four objections in the order a sceptical person raises them:
 * what is this (a shop for events), do I have to buy the whole thing (no,
 * pick lines), what will it cost (this, now, before you commit), and who
 * actually does the work (a person, not an algorithm).
 */
const CARDS = [
  {
    id: 'shop',
    icon: ShoppingBasket,
    kicker: 'The idea',
    title: 'A celebration, bought like groceries',
    body: 'Browse it, add what you want to the basket, watch the total. No enquiry form, no waiting three days to be told a number.',
    tint: 'from-royal-800 to-royal-600',
  },
  {
    id: 'pick',
    icon: SlidersHorizontal,
    kicker: 'Your call',
    title: 'The whole day, or just the cook',
    body: `${CATALOG_STATS.services} services you can take one at a time. Book only the photographer if that is all you are short of.`,
    tint: 'from-plum-700 to-plum-500',
    to: '/services',
    cta: 'See every service',
  },
  {
    id: 'price',
    icon: ReceiptIndianRupee,
    kicker: 'Before you commit',
    title: 'A real price, on the screen',
    body: `Every occasion opens from ${formatINR(CATALOG_STATS.fromPrice)} and prices itself against your guest count as you build. Nothing is charged to look.`,
    tint: 'from-gold-500 to-gold-300',
  },
  {
    id: 'human',
    icon: UserCheck,
    kicker: 'Who does it',
    title: 'One coordinator, one number',
    body: 'A person sources the vendors, negotiates and answers for the day. The app is how you watch it happen, not who does the work.',
    tint: 'from-forest-800 to-forest-600',
    to: '/plan',
    cta: 'Start a celebration',
  },
]

export default function IntroCards() {
  return (
    <section aria-labelledby="intro-heading" className="px-4">
      <div className="px-1">
        <h2 id="intro-heading" className="text-[19px] font-extrabold tracking-tight text-ink">
          What Sambramo actually is
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          Events, bought the way everything else already is.
        </p>
      </div>

      {/* One column, not two. Each of these is a sentence somebody has to
          finish reading for it to work, and a two-up grid on a phone turns
          them into four labels nobody finishes. */}
      <div className="mt-3.5 space-y-3">
        {CARDS.map(c => {
          const Icon = c.icon
          const inner = (
            <>
              {/* The tinted glyph is the only colour on the card. Everything
                  else is ink on white, which is what keeps four of these in a
                  row from reading as four different products. */}
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${c.tint} text-white shadow-[0_6px_14px_-8px_rgba(17,15,25,0.6)]`}
                aria-hidden="true"
              >
                <Icon size={19} strokeWidth={2.2} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
                  {c.kicker}
                </span>
                <span className="mt-0.5 block text-[14.5px] font-extrabold leading-snug text-ink">
                  {c.title}
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-soft">
                  {c.body}
                </span>
                {c.cta && (
                  <span className="mt-2 inline-block text-[11.5px] font-extrabold text-royal-700">
                    {c.cta} →
                  </span>
                )}
              </span>
            </>
          )

          return c.to ? (
            <Link
              key={c.id}
              to={c.to}
              className="a-card flex items-start gap-3.5 p-4 transition-transform active:scale-[0.985]"
            >
              {inner}
            </Link>
          ) : (
            <div key={c.id} className="a-card flex items-start gap-3.5 p-4">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}
