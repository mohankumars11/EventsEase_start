import { useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../context/ToastContext'

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
 * prompt: optional short label before the input, so a bare text box in a
 *   toolbar has something telling you what it is for
 */
export default function CityInterestForm({ city: initialCity = '', source, locked = false, prompt = '' }) {
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
      setError(friendlyError(err, "Couldn't submit that — please try again."))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-green-700">
        <Check size={15} className="shrink-0 mt-0.5" />
        <span className="min-w-0">
          You're on the list — we'll tell you the moment we open in {city.trim()}.
        </span>
      </p>
    )
  }

  return (
    // A fixed w-40 input beside an unshrinkable button reading "I'm interested
    // — notify me" needed ~370px. On a 360px phone it could not fit, so it
    // wrapped into a ragged stack. The input is now fluid with a ceiling, and
    // the button carries a short label until there is room for the long one.
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {prompt && !locked && (
        <span className="shrink-0 text-xs font-semibold text-gray-500">{prompt}</span>
      )}
      {!locked && (
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Your city"
          aria-label="Your city"
          className="flex-1 min-w-0 sm:w-36 sm:flex-none max-w-[14rem] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
        />
      )}
      <button
        onClick={submit}
        disabled={submitting}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-60 shrink-0"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        {submitting ? 'Submitting…' : (
          <>
            <span className="lg:hidden">Notify me</span>
            <span className="hidden lg:inline">I'm interested — notify me</span>
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-600 basis-full">{error}</p>}
    </div>
  )
}
