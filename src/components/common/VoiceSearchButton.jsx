import { Mic } from 'lucide-react'
import { useVoiceSearch } from '../../hooks/useVoiceSearch'

/**
 * The microphone in the right slot of a search field.
 *
 * One component for both app bars, for the same reason CityButton is one
 * component for both: speaking a search is one act, so it gets one control
 * with one behaviour and one permission prompt, regardless of which room the
 * customer is standing in. Only the resting tint differs — plum on home,
 * forest in the shop — and that is a prop rather than a fork.
 *
 * Renders NOTHING when the browser cannot listen. A microphone that opens no
 * microphone is the same class of bug as the delivery city that used to sit
 * beside a chevron belonging to no button: the affordance promises, the app
 * does not deliver, and the customer learns to distrust the next icon too.
 *
 * The caller owns the empty/filled decision — a field with text in it shows a
 * clear button here instead. See HomeAppBar for why only one of the two is
 * ever drawn.
 */
export default function VoiceSearchButton({ onResult, tint = 'text-plum-600 active:bg-plum-50' }) {
  const { supported, listening, toggle } = useVoiceSearch(onResult)
  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop listening' : 'Search by voice'}
      aria-pressed={listening}
      className={`absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
        listening ? 'bg-chilli-600 text-white' : tint
      }`}
    >
      {/* The pulse is the only indication that the mic is live — there is no
          waveform and no timer — so unlike decorative motion it is not gated
          on prefers-reduced-motion. It is a recording indicator. */}
      {listening && (
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-chilli-600/40" />
      )}
      <Mic size={16} className="relative" />
    </button>
  )
}
