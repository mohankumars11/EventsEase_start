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
      <div className={`rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 ${className}`}>
        <p className="text-white text-sm font-bold flex items-center gap-2">
          <MessageCircle size={15} className="text-saffron-300" /> We'll take payment over WhatsApp
        </p>
        <p className="text-white/55 text-xs mt-1 leading-relaxed">
          Online payment is being set up. Fill your cart as usual — we'll confirm the
          order and collect payment on WhatsApp
          {BRAND.whatsappNumber ? ` (${BRAND.whatsappNumber})` : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-white text-sm font-bold flex items-center gap-2">
          <ShieldCheck size={15} className="text-forest-300" /> Pay by UPI
        </p>
        <span className="text-[10px] font-bold text-forest-200 bg-forest-500/20 ring-1 ring-forest-400/30 rounded-full px-2 py-0.5">
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
        <li className="ml-auto flex items-center gap-1.5 text-white/45 text-[10px] font-semibold">
          <QrCode size={13} /> or scan
        </li>
      </ul>

      <p className="text-white/45 text-[11px] mt-3 leading-relaxed">
        Pay straight from your UPI app at checkout, or scan the QR on desktop.
        Nothing is charged until you confirm.
      </p>
    </div>
  )
}
