import { useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function storageKey(city) {
  return `sambramo_city_interest_${city.trim().toLowerCase()}`
}

/**
 * "Notify me" widget for cities outside the pilot launch.
 *
 * city: prefill/lock value, optional — if omitted the customer types their
 *   own city
 * source: tag stored on the row so admin can see which surface it came
 *   from (e.g. 'venue_location', 'shop_delivery', 'banner')
 * locked: true renders city as plain text instead of an editable input,
 *   for when the surrounding flow already knows what city was attempted
 */
export default function CityInterestForm({ city: initialCity = '', source, locked = false }) {
  const { user } = useAuth()
  const [city, setCity] = useState(initialCity)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(() =>
    initialCity ? !!localStorage.getItem(storageKey(initialCity)) : false
  )

  async function submit() {
    const trimmed = city.trim()
    if (!trimmed) { setError('Enter your city first.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('city_interest_requests').insert({
        customer_id: user?.id ?? null,
        city: trimmed,
        source: source ?? null,
      })
      if (err) throw err
      localStorage.setItem(storageKey(trimmed), '1')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || "Couldn't submit that — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
        <Check size={15} /> You're on the list — we'll notify you when we launch in {city.trim()}!
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!locked && (
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Your city"
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
        />
      )}
      <button
        onClick={submit}
        disabled={submitting}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-60 shrink-0"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        {submitting ? 'Submitting…' : "I'm interested — notify me"}
      </button>
      {error && <p className="text-xs text-red-600 basis-full">{error}</p>}
    </div>
  )
}
