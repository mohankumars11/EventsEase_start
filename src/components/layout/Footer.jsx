import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white mb-3">
              <span className="w-7 h-7 bg-marigold-500 rounded-lg flex items-center justify-center text-white">
                <Sparkles size={14} />
              </span>
              Event<span className="text-marigold-400">Ease</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Connecting families with trusted local vendors for every celebration across India.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">For Customers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/signup" className="hover:text-marigold-400 transition-colors">Browse vendors</Link></li>
              <li><Link to="/signup" className="hover:text-marigold-400 transition-colors">Book services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">For Vendors</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/signup" className="hover:text-marigold-400 transition-colors">List your business</Link></li>
              <li><Link to="/signup" className="hover:text-marigold-400 transition-colors">Grow with EventEase</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-xs text-center">
          © {new Date().getFullYear()} EventEase. Made with ❤️ for Indian celebrations.
        </div>
      </div>
    </footer>
  )
}
