import { Link } from 'react-router-dom'
import { BRAND } from '../../config/sambramo'
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
            <p className="text-sm leading-relaxed text-plum-400 max-w-xs">
              You celebrate. We handle everything. India's first human-assisted concierge celebration service.
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
              <li><Link to="/login" className="hover:text-saffron-400 transition-colors">Sign in</Link></li>
              <li><Link to="/plan" className="hover:text-saffron-400 transition-colors">Plan a celebration</Link></li>
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
            <span className="block text-plum-500 text-xs mb-0.5">Serving</span>
            {BRAND.primaryCity} &amp; nearby
          </div>
        </div>

        <div className="border-t border-plum-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Sambramo. Made with love for Indian celebrations.</p>
          <p className="text-plum-600">Your Moment. Our Magic.</p>
        </div>
      </div>
    </footer>
  )
}
