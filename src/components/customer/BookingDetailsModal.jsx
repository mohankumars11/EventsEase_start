import { useState } from 'react'
import { X, Calendar, Clock, Users, AlertCircle } from 'lucide-react'
import LocationAutocomplete from '../common/LocationAutocomplete'

const GUEST_PRESETS = [
  { label: '< 50', value: 40 },
  { label: '50–100', value: 75 },
  { label: '100–300', value: 200 },
  { label: '300+', value: 350 },
]

/**
 * itemLabel: name of the service/package being added, shown in the header
 * defaults: { date, time, guestCount, location } — pre-fill from the event's
 *   existing cart items, so a customer isn't asked to re-enter the same
 *   details for every service they add to the same event
 * onConfirm(details) / onClose()
 */
export default function BookingDetailsModal({ itemLabel, defaults, onConfirm, onClose }) {
  const [date, setDate] = useState(defaults?.date ?? '')
  const [time, setTime] = useState(defaults?.time ?? '')
  const [guestCount, setGuestCount] = useState(defaults?.guestCount ?? '')
  const [location, setLocation] = useState(defaults?.location ?? null)
  const [error, setError] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  function handleConfirm() {
    if (!date) return setError('Pick your event date.')
    if (!location?.city) return setError('Tell us which city.')
    if (!location?.area) return setError('Tell us the area or locality.')
    setError(null)
    onConfirm({ date, time, guestCount: guestCount ? Number(guestCount) : null, location })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end pb-bottom-nav sm:pb-0 sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-gray-900">A few details first</h3>
            <p className="text-xs text-gray-500 mt-0.5">{itemLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              {/* Required, and said so. `handleConfirm` has always refused
                  without it, but the label read like an optional field — so
                  the first a customer heard of the rule was an error message
                  under a button they had already pressed. */}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <Calendar size={13} /> Event date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <Clock size={13} /> Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
              <Users size={13} /> Expected guests
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {GUEST_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setGuestCount(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    Number(guestCount) === p.value
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              placeholder="Or enter an exact number"
              value={guestCount}
              onChange={e => setGuestCount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
              Where's the event?
            </label>
            <LocationAutocomplete value={location} onChange={setLocation} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
