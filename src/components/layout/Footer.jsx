import { Link } from 'react-router-dom'
import { ShieldCheck, Truck, Headset, BadgeCheck, Phone, Mail, MapPin } from 'lucide-react'
import { BRAND, CTA } from '../../config/sambramo'
import { SHOP_CATEGORIES } from '../../config/shop'
import SambramoLogo from '../ui/SambramoLogo'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../shop/UpiAppIcons'

/**
 * The site footer, rebuilt on the shape every storefront of any size uses:
 * a strip of promises, a directory, then a legal line.
 *
 * What it was: a two-column brand pitch — the logo, "India's human-assisted
 * concierge celebration service", and a green WhatsApp button next to a Call
 * Us button — followed by two link lists and a contact grid. That is a
 * landing-page hero, printed again at the bottom of every page, and it read
 * as one: the sentence explaining what the company is was being made to
 * someone eight pages deep who had already worked it out, and the two large
 * contact buttons pulled harder than anything the page above them was
 * actually asking for.
 *
 * Three things changed and each is load-bearing:
 *
 *   · The promises come first, as a strip. Secure payment, who delivers,
 *     what happens when it goes wrong, and that there is a person to call.
 *     They are the four questions a footer is genuinely read for, and they
 *     belong above the directory rather than buried in it.
 *   · The directory names the shop's real categories. Half the business is a
 *     catalogue of five shelves and the footer linked to none of them — every
 *     other storefront's footer is mostly its category list, because that is
 *     what a footer is for once someone has scrolled to the bottom without
 *     finding what they wanted.
 *   · Contact is a column of links, not two buttons. The information is
 *     identical; it stops competing with the page's own call to action.
 *
 * The footer does not render on the checkout — see the /shop/cart route.
 */
const PROMISES = [
  { icon: ShieldCheck, title: 'Secure payments',   body: 'UPI, card & net banking' },
  { icon: Truck,       title: 'Delivered by us',   body: 'On the date you need it' },
  { icon: BadgeCheck,  title: 'One number to call', body: 'Whoever made it, we fix it' },
  { icon: Headset,     title: 'Real people',       body: 'Not a bot, not a form' },
]

export default function Footer() {
  return (
    <footer className="bg-plum-950 text-plum-400 mt-auto">

      {/* ── What we promise ─────────────────────────────────────── */}
      <div className="border-b border-plum-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-7 sm:px-6 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-2.5">
              <Icon size={18} className="mt-0.5 shrink-0 text-saffron-400" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white">{title}</p>
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
              <SambramoLogo size={38} ground="onDark" caption />
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
            <h4 className="mb-3 text-sm font-semibold text-white">Celebrations</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/plan?type=birthday" className="transition-colors hover:text-saffron-400">Birthday</Link></li>
              <li><Link to="/plan?type=wedding" className="transition-colors hover:text-saffron-400">Wedding</Link></li>
              <li><Link to="/plan?type=anniversary" className="transition-colors hover:text-saffron-400">Anniversary</Link></li>
              <li><Link to="/plan?type=baby-shower" className="transition-colors hover:text-saffron-400">Baby Shower</Link></li>
              <li><Link to="/plan?type=festival" className="transition-colors hover:text-saffron-400">Festival</Link></li>
              {/* The catalog is public now and had no discoverability outside
                  the hub — a whole half of the offer with nothing pointing at
                  it from the one place people look for a site map. */}
              <li><Link to="/services" className="transition-colors hover:text-saffron-400">{CTA.catalogNav}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Help &amp; company</h4>
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
              <li><Link to="/#how-it-works" className="transition-colors hover:text-saffron-400">How it works</Link></li>
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
