import { Link } from 'react-router-dom'
import { UserRound, PhoneCall, ClipboardCheck, HeartHandshake, Phone, Mail, MapPin } from 'lucide-react'
import { BRAND, CTA } from '../../config/sambramo'
import { SHOP_CATEGORIES } from '../../config/shop'
import { EVENT_LIST } from '../../data/eventServicesData'
import SambramoLogo from '../ui/SambramoLogo'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../shop/UpiAppIcons'

/**
 * The site footer: a strip of promises, a directory, then a legal line.
 *
 * ── The promises are about the celebration, not the parcel ──────────────
 * They used to be Secure payments / Delivered by us / One number to call /
 * Real people — the standard storefront four, written for someone buying a
 * ₹900 hamper. Three of the four are the wrong reassurance for the thing
 * this business mostly sells. Nobody planning a wedding is anxious about
 * whether the card form is encrypted; they are anxious about whether the
 * decorator turns up, who they shout at when he doesn't, and whether the
 * number they were quoted is the number they will pay.
 *
 * So the strip answers those instead. "One number to call" and "real
 * people" survive the rewrite because they were always the two that
 * belonged — they are concierge promises that had wandered into a delivery
 * list, and they are the two this company actually competes on.
 *
 * Every line is something the product genuinely does today. Sambramo is
 * pre-launch with no signed supplier, so there are no vendor counts, no
 * years-in-business, no star ratings and no testimonials down here: an
 * invented review is the single fastest way to lose the trust the rest of
 * this strip is trying to earn. What is claimed is what the app enforces —
 * the approval gate is real (an enquiry stays `open` until a coordinator
 * and then the customer move it), and the pilot cities are the only ones
 * the booking flow will accept.
 *
 * ── The directory names every occasion ──────────────────────────────────
 * It used to list five celebration types out of fifteen, hardcoded, with
 * `?type=` slugs that had drifted from the real event ids. It reads from
 * EVENT_DATA now, so the footer cannot fall behind the catalogue, and each
 * entry deep-links to that occasion's own page rather than a filtered hub.
 *
 * The footer does not render on the checkout — see the /shop/cart route.
 */
const PROMISES = [
  {
    icon: UserRound,
    title: 'One coordinator, start to finish',
    body: 'The same person from your first call to the last guest leaving',
  },
  {
    icon: PhoneCall,
    title: 'One number to call',
    body: 'Whoever we booked, you call us — sorting it out is our job',
  },
  {
    icon: ClipboardCheck,
    title: 'Nothing booked until you approve',
    body: 'You see the confirmed quote before a single vendor is held',
  },
  {
    icon: HeartHandshake,
    title: 'Real people, not a form',
    body: 'A coordinator reads your request and rings you back',
  },
]

export default function Footer() {
  return (
    <footer className="bg-plum-950 text-plum-400 mt-auto">

      {/* ── What we promise ─────────────────────────────────────── */}
      <div className="border-b border-plum-900">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-5 px-4 py-7 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-2.5">
              <Icon size={18} className="mt-0.5 shrink-0 text-saffron-400" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-snug text-white">{title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-plum-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── The directory ───────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4 lg:grid-cols-5">

          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-block">
              <SambramoLogo size={38} ground="onDark" />
            </Link>
            <div className="mt-5 flex items-start gap-2 text-sm">
              <MapPin size={14} className="mt-0.5 shrink-0 text-plum-600" />
              <div>
                <span className="block text-xs text-plum-500">Live in (pilot)</span>
                {/* Said "Bengaluru & nearby", which stopped being true the
                    moment booking was restricted to the pilot list — and
                    "nearby" is exactly the vagueness someone in Hosur would
                    read as a yes. */}
                {BRAND.pilotCities.join(' & ')}
              </div>
            </div>

            {/* The two things somebody at the bottom of a page is most
                likely to want next, and neither is a category link. */}
            <div className="mt-5 space-y-2 text-sm">
              <Link
                to="/plan/build"
                className="inline-block rounded-xl bg-saffron-500 px-4 py-2.5 font-bold text-white transition-colors hover:bg-saffron-400"
              >
                Price your celebration →
              </Link>
              <p className="text-[11px] leading-snug text-plum-500">
                Every occasion, scale and menu priced on screen — taxes in, no call needed to see a number.
              </p>
            </div>
          </div>

          {/* Every occasion in the catalogue, from the catalogue. */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Celebrations</h4>
            <ul className="space-y-2 text-sm">
              {EVENT_LIST.map(e => (
                <li key={e.id}>
                  <Link to={`/services/${e.id}`} className="transition-colors hover:text-saffron-400">
                    {e.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/services" className="transition-colors hover:text-saffron-400">{CTA.catalogNav} →</Link>
              </li>
            </ul>
          </div>

          {/* The shop's actual shelves — the links a footer is scrolled to for */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Shop</h4>
            <ul className="space-y-2 text-sm">
              {SHOP_CATEGORIES.map(c => (
                <li key={c.id}>
                  <Link to={`/shop/${encodeURIComponent(c.id)}`} className="transition-colors hover:text-saffron-400">
                    {c.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/shop" className="transition-colors hover:text-saffron-400">All of the shop →</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Talk to a person</h4>
            {/* These `/#hash` links landed you at the top of the landing
                page and no further — nothing in the app was listening for
                the hash. ScrollRestoration now handles them. */}
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`tel:${BRAND.supportPhone}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron-400"
                >
                  <Phone size={12} className="shrink-0 text-plum-600" /> {BRAND.supportPhone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${BRAND.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-saffron-400"
                >
                  Chat on WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron-400"
                >
                  <Mail size={12} className="shrink-0 text-plum-600" /> {BRAND.supportEmail}
                </a>
              </li>
              <li><Link to="/plan/custom" className="transition-colors hover:text-saffron-400">Tell us your plan instead</Link></li>
              <li><Link to="/#how-it-works" className="transition-colors hover:text-saffron-400">How it works</Link></li>
              <li><Link to="/dashboard/customer/requests" className="transition-colors hover:text-saffron-400">Track a request</Link></li>
              <li><Link to="/dashboard/customer/orders" className="transition-colors hover:text-saffron-400">Track an order</Link></li>
              <li><Link to="/login" className="transition-colors hover:text-saffron-400">Sign in</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Legal line ──────────────────────────────────────────── */}
      <div className="border-t border-plum-900">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-4 py-5 text-xs sm:flex-row sm:px-6">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Sambramo. All rights reserved.
            <span className="text-plum-600"> · {BRAND.signature}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.1em] text-plum-600">We accept</span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1.5">
              <GooglePayIcon className="h-5 w-5" />
              <PhonePeIcon className="h-5 w-5" />
              <PaytmIcon className="h-5 w-5" />
              <UpiIcon className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
