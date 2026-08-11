import { ChevronDown } from 'lucide-react'
import { EVENT_LIST } from '../../data/eventServicesData'

/**
 * What are we celebrating?
 *
 * The builder used to take its occasion from the URL, which meant the only way
 * to price a naming ceremony was to already be on the wedding page and know to
 * edit the address bar. Every one of the fifteen occasions in the catalogue
 * gets a quote engine now; the scale ladder, the menus and the décor levels are
 * all occasion-agnostic, so there was never a reason to gate them behind one.
 *
 * The free-text row at the bottom is not a fallback nobody uses — "Other" is
 * consistently one of the most-picked options in event forms, because the
 * fifteen names on a list can never cover a retirement-cum-housewarming or a
 * pet's first birthday. Sending that person to a different page would lose
 * them; letting them type it keeps the whole flow intact and the coordinator
 * reads the sentence they wrote.
 *
 * A native <select> rather than a custom dropdown, deliberately. On Android it
 * opens the platform picker — full-height, scrollable with a thumb, searchable
 * by keyboard, and already familiar. A hand-rolled listbox with fifteen rows is
 * strictly worse on a phone and is where accessibility bugs live.
 */
export default function OccasionPicker({ eventId, onEvent, otherText, onOtherText }) {
  const isOther = eventId === 'other'

  return (
    <div className="card p-5">
      <label htmlFor="occasion" className="block text-base font-bold text-gray-900 mb-1">
        What are we celebrating?
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Every occasion below can be priced here. The scales, menus and décor are the same — what changes is what we
        suggest first.
      </p>

      <div className="relative">
        <select
          id="occasion"
          value={eventId ?? ''}
          onChange={e => onEvent(e.target.value)}
          className="w-full appearance-none min-h-[52px] px-4 py-3 pr-11 rounded-xl border-2 border-gray-200 font-semibold text-base text-gray-900 bg-white focus:border-saffron-400 focus:outline-none"
        >
          <option value="">Choose an occasion…</option>
          {EVENT_LIST.map(e => (
            <option key={e.id} value={e.id}>{e.emoji} {e.name}</option>
          ))}
          <option value="other">✏️ Something else — let me type it</option>
        </select>
        <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {isOther && (
        <div className="mt-3">
          <label htmlFor="occasion-other" className="block text-sm font-bold text-gray-800 mb-1.5">
            Tell us what it is
          </label>
          <input
            id="occasion-other"
            type="text"
            value={otherText}
            onChange={e => onOtherText(e.target.value.slice(0, 80))}
            placeholder="e.g. Shashtiabdapoorthi (60th birthday) for my father"
            autoComplete="off"
            className="w-full min-h-[52px] px-4 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 focus:border-saffron-400 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Anything at all — we have arranged sashtiabdapoorthi, retirement-and-housewarming on one day, and a dog's
            first birthday. The pricing below works the same way.
          </p>
        </div>
      )}
    </div>
  )
}
