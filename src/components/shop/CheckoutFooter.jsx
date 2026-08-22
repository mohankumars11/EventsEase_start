import { ShieldCheck, Headset, RotateCcw, Phone, MessageCircle } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../common/UpiAppIcons'

/**
 * The footer a checkout is allowed to have.
 *
 * The site footer is a sitemap and a sales pitch: forty links, two big
 * contact buttons, a list of celebration types, the pilot-city notice. Under
 * a page whose only job is to finish one order, every one of those is an exit
 * — and the ones that aren't exits are noise between the customer and the Pay
 * button. It is also, at ~400px, longer than the order summary it sits under.
 *
 * What a checkout footer is actually for is the last three doubts someone has
 * with their thumb over the button: is my money safe, what if it goes wrong,
 * and is there a human. So this answers exactly those, names the payment
 * methods that will be accepted (which people look for before they commit),
 * and stops. No navigation at all.
 */
const ASSURANCES = [
  {
    icon: ShieldCheck,
    title: '100% secure payments',
    body: 'Paid straight into Sambramo’s verified UPI account. We never see or store your card or bank details.',
  },
  {
    icon: RotateCcw,
    title: 'Something wrong? We fix it',
    body: 'One number to call whoever made it — we handle the vendor, the redelivery and the refund.',
  },
  {
    icon: Headset,
    title: 'A person, not a bot',
    body: 'Order help on WhatsApp or the phone, from the same team that arranges the celebration.',
  },
]

export default function CheckoutFooter() {
  return (
    <footer className="mt-10 border-t border-hairline/10 pt-8 pb-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ASSURANCES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="checkout-glass flex items-start gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-saffron-700">
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── What will be accepted, shown before it is asked for ── */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute">
              We accept
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5">
              <GooglePayIcon className="h-5 w-5" />
              <PhonePeIcon className="h-5 w-5" />
              <PaytmIcon className="h-5 w-5" />
              <UpiIcon className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${BRAND.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk/[0.07] px-3 py-1.5 text-[11px] font-semibold text-ink-soft ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.07]"
            >
              <MessageCircle size={12} /> Order help
            </a>
            <a
              href={`tel:${BRAND.supportPhone}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk/[0.07] px-3 py-1.5 text-[11px] font-semibold text-ink-soft ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.07]"
            >
              <Phone size={12} /> {BRAND.supportPhone}
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-mute">
          © {new Date().getFullYear()} Sambramo · Prices in ₹ and inclusive of applicable taxes
        </p>
      </div>
    </footer>
  )
}
