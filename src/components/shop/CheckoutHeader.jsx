import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, Check } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'

/**
 * The checkout's own chrome — an app bar and a three-step progress rail.
 *
 * Deliberately not the marketing Navbar, and deliberately not ShopAppBar
 * either. Every storefront that sells anything strips its header at checkout
 * (Amazon, Flipkart, Swiggy, Shopify's own default all do the identical
 * thing) for one reason: from the moment a basket has been priced, every link
 * out of the page is a way to lose the order. So there is no search, no city
 * control, no category nav and no cart icon pointing at the page you are
 * already on. What survives is the one honest exit — back to the shop — the
 * brand, and the padlock, because "is this safe" is the question actually
 * being asked here.
 *
 * The stepper is the other half of the same argument. A checkout that shows
 * no length is a checkout people abandon at the address field, because for
 * all they know there are six more screens behind it. There are two.
 */
const STEPS = [
  { id: 'cart',    label: 'Bag',      short: 'Bag' },
  { id: 'address', label: 'Delivery', short: 'Delivery' },
  { id: 'payment', label: 'Payment',  short: 'Pay' },
]

export default function CheckoutHeader({ step = 'cart', itemCount = 0, backTo = '/shop' }) {
  // `cart` covers both reviewing the bag and filling the address — they are
  // one scroll on this page — so the rail lights the first two dots there and
  // completes them at payment.
  const activeIndex = step === 'payment' ? 2 : step === 'done' ? 3 : 1

  return (
    <header className="sticky top-0 z-40 pt-safe checkout-appbar shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── Row 1: the way out, the brand, the padlock ── */}
        <div className="flex items-center gap-3 pt-3 pb-2.5">
          <Link
            to={backTo}
            aria-label="Back to shop"
            className="-ml-1 tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk/[0.07] active:bg-surface-sunk/[0.07]"
          >
            <ArrowLeft size={20} />
          </Link>

          <SambramoMark size={26} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold leading-tight text-ink">
              Checkout
            </p>
            <p className="truncate text-[11px] text-ink-mute">
              {itemCount} item{itemCount === 1 ? '' : 's'} in your bag
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-surface-sunk/[0.07] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-hairline/10">
            <Lock size={11} className="shrink-0" />
            <span className="hidden sm:inline">Secure</span>
          </span>
        </div>

        {/* ── Row 2: how far along this is ── */}
        <nav aria-label="Checkout progress" className="pb-3">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            {STEPS.map((s, i) => {
              const n = i + 1
              const done = n < activeIndex
              const current = n === activeIndex
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <span
                    aria-current={current ? 'step' : undefined}
                    className={[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold transition-colors',
                      done
                        ? 'bg-saffron-400 text-forest-900'
                        : current
                          ? 'bg-white text-forest-800 ring-4 ring-hairline/10'
                          : 'bg-surface-sunk/[0.07] text-ink-mute ring-1 ring-hairline/10',
                    ].join(' ')}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : n}
                  </span>
                  <span
                    className={[
                      'truncate text-[11px] font-bold uppercase tracking-wide',
                      done ? 'text-saffron-700' : current ? 'text-ink' : 'text-ink-mute',
                    ].join(' ')}
                  >
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.short}</span>
                  </span>
                  {/* The rail between dots, which is what makes three
                      badges read as one journey rather than three tabs. */}
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`h-px min-w-3 flex-1 rounded-full ${done ? 'bg-saffron-400/60' : 'bg-white/15'}`}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>
    </header>
  )
}
