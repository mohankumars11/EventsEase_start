import { Link } from 'react-router-dom'
import { BRAND, CTA } from '../../config/sambramo'
import SambramoLogo from '../ui/SambramoLogo'

export default function Footer() {
  return (
    <footer className="bg-plum-950 text-plum-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-3">
              <SambramoLogo size={40} ground="onDark" caption />
            </Link>
            {/* Was "{BRAND.tagline} {BRAND.descriptor}." — but `tagline` is
                exactly the line the lockup above already sets under the
                wordmark, so the last thing on the page read "Celebrations,
                arranged ◆ Essentials, delivered" and then, one line lower,
                "Celebrations, arranged. Essentials, delivered." The caption is
                the better placement of the two: it is part of the mark. This
                line keeps only the half the caption does not say.

                (Earlier it also claimed India's *first* human-assisted
                concierge service — a superlative on one surface and nowhere
                else, too isolated to be a position and still large enough to
                have to defend.) */}
            <p className="text-sm leading-relaxed text-plum-400 max-w-xs">
              {BRAND.descriptor}.
            </p>
            <div className="flex gap-3 mt-4">
              <a href={`https://wa.me/${BRAND.whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">
                WhatsApp Us
              </a>
              <a href={`tel:${BRAND.supportPhone}`}
                className="px-4 py-2 bg-plum-800 hover:bg-plum-700 text-white text-xs font-semibold rounded-xl transition-colors">
                Call Us
              </a>
            </div>
          </div>

          {/* Celebrations */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Celebrations</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/plan?type=birthday" className="hover:text-saffron-400 transition-colors">Birthday</Link></li>
              <li><Link to="/plan?type=wedding" className="hover:text-saffron-400 transition-colors">Wedding</Link></li>
              <li><Link to="/plan?type=anniversary" className="hover:text-saffron-400 transition-colors">Anniversary</Link></li>
              <li><Link to="/plan?type=baby-shower" className="hover:text-saffron-400 transition-colors">Baby Shower</Link></li>
              <li><Link to="/plan?type=festival" className="hover:text-saffron-400 transition-colors">Festival</Link></li>
              <li><Link to="/plan" className="hover:text-saffron-400 transition-colors">All celebrations →</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Company</h4>
            {/* These `/#hash` links landed you at the top of the landing
                page and no further — nothing in the app was listening for
                the hash. ScrollRestoration now handles them. */}
            <ul className="space-y-2 text-sm">
              <li><Link to="/#how-it-works" className="hover:text-saffron-400 transition-colors">How it works</Link></li>
              <li><Link to="/#celebrations" className="hover:text-saffron-400 transition-colors">Celebrations</Link></li>
              <li><Link to="/#festivals" className="hover:text-saffron-400 transition-colors">Festival specials</Link></li>
              <li><Link to="/shop" className="hover:text-saffron-400 transition-colors">Shop</Link></li>
              {/* The catalog is public now and had no discoverability outside
                  the hub — a whole half of the offer with nothing pointing at
                  it from the one place people look for a site map. */}
              <li><Link to="/services" className="hover:text-saffron-400 transition-colors">{CTA.catalogNav}</Link></li>
              <li><Link to="/login" className="hover:text-saffron-400 transition-colors">Sign in</Link></li>
              <li><Link to="/plan" className="hover:text-saffron-400 transition-colors">{CTA.planNav}</Link></li>
            </ul>
          </div>
        </div>

        {/* Contact — the phone number and email in BRAND appeared nowhere
            on the site, so a visitor who wanted to talk to a person before
            committing had only a WhatsApp button and no address at all. */}
        <div className="border-t border-plum-800 pt-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <a href={`tel:${BRAND.supportPhone}`} className="hover:text-saffron-400 transition-colors">
            <span className="block text-plum-500 text-xs mb-0.5">Call us</span>
            {BRAND.supportPhone}
          </a>
          <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-saffron-400 transition-colors">
            <span className="block text-plum-500 text-xs mb-0.5">Email</span>
            {BRAND.supportEmail}
          </a>
          <div>
            {/* Said "Bengaluru & nearby", which stopped being true the moment
                booking was restricted to the pilot list — and "nearby" is
                exactly the vagueness someone in Hosur would read as a yes. */}
            <span className="block text-plum-500 text-xs mb-0.5">Live in (pilot)</span>
            {BRAND.pilotCities.join(' & ')}
          </div>
        </div>

        <div className="border-t border-plum-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>
            © {new Date().getFullYear()} Sambramo. All rights reserved.
            <span className="text-plum-600"> · Made with love for Indian celebrations.</span>
          </p>
          <p className="text-plum-600">{BRAND.signature}</p>
        </div>
      </div>
    </footer>
  )
}
