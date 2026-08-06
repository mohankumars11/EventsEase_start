import { Rocket } from 'lucide-react'
import CityInterestForm from '../common/CityInterestForm'

// Permanent pilot-launch notice — unlike FestivalBanner this never
// disappears, since "which cities are we even live in" is standing
// information, not a rotating promotion.
export default function ServiceAreaBanner() {
  return (
    <div className="bg-white border-b border-orange-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-plum-800 shrink-0">
          <Rocket size={14} className="text-saffron-500" />
          Live in Bengaluru &amp; Mysore
        </span>
        <span className="text-xs text-gray-400 hidden sm:inline">— pilot launch, more cities coming soon</span>
        <div className="ml-auto shrink-0">
          <CityInterestForm source="banner" />
        </div>
      </div>
    </div>
  )
}
