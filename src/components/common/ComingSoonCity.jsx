import { MapPinOff } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import CityInterestForm from './CityInterestForm'

/**
 * Shown wherever a customer lands on a city outside the pilot launch
 * (Bengaluru & Mysore). Blocks nothing itself — the caller decides not to
 * accept the selection — this is just the explanation + notify-me action.
 */
export default function ComingSoonCity({ city, source }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <MapPinOff size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-2 min-w-0">
        {/* Reads from BRAND so the city list here can never drift from the
            banner and the city pickers, which all name the same two. */}
        <p className="text-sm text-amber-800">
          <span className="font-semibold">We're not in {city || 'your city'} yet.</span>{' '}
          We're still in <strong>pilot launch</strong> — live in{' '}
          <strong>{BRAND.pilotCities.join(' & ')}</strong> while we get it right.
          Add your city and you'll be first to know when we open there.
        </p>
        <CityInterestForm city={city} source={source} locked={!!city} />
      </div>
    </div>
  )
}
