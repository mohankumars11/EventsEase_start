import { ShieldCheck, QrCode, MessageCircle } from 'lucide-react'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from './UpiAppIcons'
import { IS_CONFIGURED as UPI_CONFIGURED } from '../../lib/payment/upiProvider'
import { BRAND } from '../../config/sambramo'

/**
 * How you can pay — the four logos a customer looks for before they trust a
 * new storefront enough to fill a cart.
 *
 * Scoped hard to what checkout will actually accept. The cart's method
 * picker lists UPI / Card / Net Banking, but Card and Net Banking exist only
 * inside the test harness (`IS_TEST_MODE` in ShopCart) — in a production
 * build the sole live path is a direct UPI request to Sambramo's own UPI ID,
 * plus a QR for desktop. Printing a Visa mark here would be advertising a
 * payment method that does not exist, discovered by the customer at the last
 * screen of checkout.
 *
 * When no UPI ID is configured the strip says so and offers the same
 * WhatsApp fallback the cart falls back to, rather than quietly disappearing
 * and leaving a "how do I even pay?" gap.
 */
export default function PaymentStrip({ className = '' }) {
  if (!UPI_CONFIGURED) {
    return (
      <div className={`rounded-2xl bg-surface-sunk/[0.07] ring-1 ring-hairline/10 p-4 ${className}`}>
        <p className="text-ink text-sm font-bold flex items-center gap-2">
          <MessageCircle size={15} className="text-saffron-700" /> We'll take payment over WhatsApp
        </p>
        <p className="text-ink-mute text-xs mt-1 leading-relaxed">
          Online payment is being set up. Fill your cart as usual — we'll confirm the
          order and collect payment on WhatsApp
          {BRAND.whatsappNumber ? ` (${BRAND.whatsappNumber})` : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-surface-sunk/[0.07] ring-1 ring-hairline/10 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-ink text-sm font-bold flex items-center gap-2">
          <ShieldCheck size={15} className="text-forest-700" /> Pay by UPI
        </p>
        {/* forest-700, not forest-200. Another shade left over from the deep
            green storefront: on this light card it was pale green on a pale
            green tint, about 1.2:1. */}
        <span className="text-[10px] font-bold text-forest-700 bg-forest-500/15 ring-1 ring-forest-500/30 rounded-full px-2 py-0.5">
          NO EXTRA FEE
        </span>
      </div>

      <ul className="flex items-center gap-2.5">
        {[
          { Icon: GooglePayIcon, label: 'Google Pay' },
          { Icon: PhonePeIcon,   label: 'PhonePe' },
          { Icon: PaytmIcon,     label: 'Paytm' },
          { Icon: UpiIcon,       label: 'Any UPI app' },
        ].map(({ Icon, label }) => (
          <li key={label} className="shrink-0" title={label}>
            <Icon className="w-9 h-9 rounded-xl" />
            <span className="sr-only">{label}</span>
          </li>
        ))}
        <li className="ml-auto flex items-center gap-1.5 text-ink-mute text-[10px] font-semibold">
          <QrCode size={13} /> or scan
        </li>
      </ul>

      {/* The no-COD line is stated here rather than discovered at the last
          screen of checkout. Cash on delivery is the default assumption for
          a great many shoppers in this market, and a customer who reaches
          the payment step still expecting to pay the rider is a customer who
          abandons the order — the app has never had a COD path, so the only
          thing that was missing was saying so before it mattered. */}
      <p className="text-ink-mute text-[11px] mt-3 leading-relaxed">
        Pay straight from your UPI app at checkout, or scan the QR on desktop.
        Nothing is charged until you confirm.
      </p>
      <p className="text-ink-soft text-[11px] mt-1.5 leading-relaxed font-semibold">
        Online payment only — we don't take cash on delivery.
      </p>
    </div>
  )
}
