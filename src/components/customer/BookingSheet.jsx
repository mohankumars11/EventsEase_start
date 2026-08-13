import { useState } from 'react'
import {
  X, Calendar, Users, MapPin, Phone, User, NotebookPen, AlertCircle,
  Check, Sunrise, Sun, Sunset, Clock,
} from 'lucide-react'
import LocationAutocomplete from '../common/LocationAutocomplete'
import { useAuth } from '../../context/AuthContext'
import { useCity } from '../../context/CityContext'
import { useEventDate, setEventDate } from '../../hooks/useEventDate'
import { todayISO, humanDate } from '../../utils/format'

/**
 * The one form between a chosen service and a coordinator reading it.
 *
 * ── What it replaces, and why that had to go ────────────────────────────
 * BookingDetailsModal asked four questions — date, time, guest count,
 * location — and got three of them wrong for this flow:
 *
 *   · It re-asked the guest count. The customer had just set it at the top of
 *     the service page and watched every price on the screen recompute against
 *     it. Being asked again, in an empty field, is the app announcing it was
 *     not listening — and it invited a *different* number, which would then
 *     disagree with the price they had already agreed to.
 *   · It re-asked the date, which the home screen, the plan hub and the demand
 *     calendar have all been sharing through one store since they were unified
 *     (see hooks/useEventDate). Only this modal was not reading it.
 *   · It re-asked the city, which the app has held in CityContext since the
 *     pilot-city work, and shows in the app bar two inches above the modal.
 *
 * And it did not ask for the three things a coordinator actually cannot work
 * without: the full address (an area name is not somewhere a crew can unload),
 * a phone number (the entire follow-up happens on WhatsApp), and any
 * constraint the venue imposes.
 *
 * ── The rule this follows ───────────────────────────────────────────────
 * Anything the app already knows is shown as a confirmable fact, not an empty
 * field. Anything it does not know is asked once. The form is short because
 * most of it is already answered — which is the point, and which is what makes
 * the remaining questions feel reasonable rather than like an interrogation.
 *
 * Writes the date back to the shared store on confirm, so the next surface the
 * customer touches opens on it too.
 */

/**
 * When, roughly.
 *
 * Offered before the exact clock time because it is the answer people
 * actually have. "Morning" is a decision a family has made weeks ahead;
 * "10:30" is one they make the week of, and demanding it early is how a form
 * gets abandoned. The exact time stays available for anyone who knows it.
 */
const SLOTS = [
  { id: 'morning',   label: 'Morning',   hint: '6am – 12pm',  icon: Sunrise },
  { id: 'afternoon', label: 'Afternoon', hint: '12pm – 4pm',  icon: Sun },
  { id: 'evening',   label: 'Evening',   hint: '4pm – 10pm',  icon: Sunset },
  { id: 'full_day',  label: 'Full day',  hint: 'All of it',   icon: Clock },
]

export default function BookingSheet({
  title, subtitle, guestCount, onConfirm, onClose, defaults,
  confirmLabel = 'Confirm & continue',
}) {
  const { profile, user } = useAuth()
  const { city, chosen } = useCity()
  const savedDate = useEventDate()

  const [date, setDate]         = useState(defaults?.date ?? savedDate?.event_date ?? '')
  const [slot, setSlot]         = useState(defaults?.slot ?? savedDate?.time_slot ?? '')
  const [time, setTime]         = useState(defaults?.time ?? '')
  const [guests, setGuests]     = useState(defaults?.guestCount ?? guestCount ?? '')
  const [location, setLocation] = useState(
    defaults?.location ?? (chosen && city?.name ? { city: city.name, area: '' } : null)
  )
  const [address, setAddress]   = useState(defaults?.address ?? '')
  const [name, setName]         = useState(defaults?.name ?? profile?.full_name ?? '')
  const [phone, setPhone]       = useState(
    (defaults?.phone ?? profile?.phone ?? '').replace('+91', '').replace(/\D/g, '').slice(-10)
  )
  const [notes, setNotes]       = useState(defaults?.notes ?? '')
  const [error, setError]       = useState(null)

  const phoneValid = /^[6-9]\d{9}$/.test(phone)

  function handleConfirm() {
    if (!date) return setError('We need the date to check whether the team is free.')
    if (!location?.city) return setError('Which city is the event in?')
    if (!location?.area && !address.trim()) return setError('Tell us the area or the venue address — a crew has to reach it.')
    if (!phoneValid) return setError('A 10-digit mobile number, so the coordinator can reach you on WhatsApp.')

    setError(null)
    // The date is a fact about this visit, not about this one item — write it
    // back so the calendar, the plan hub and the next service page all open on
    // it instead of asking a fourth time.
    setEventDate({ event_date: date, time_slot: slot })

    onConfirm({
      date,
      slot,
      time,
      guestCount: guests ? Number(guests) : null,
      location: { ...location, address: address.trim() || null },
      address: address.trim() || null,
      name: name.trim() || null,
      phone: `+91${phone}`,
      notes: notes.trim() || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="animate-fade-in-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="sticky top-0 flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold text-gray-900">{title ?? 'Last thing — where and when'}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[11.5px] text-gray-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 shrink-0 p-1 text-gray-400 hover:text-gray-600">
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* ── What we already know ────────────────────────────────
              Stated, not asked. The guest count drove every price the
              customer just looked at, so re-asking it in an empty box is
              both a redundancy and an invitation to contradict the quote
              they already accepted. */}
          {guestCount ? (
            <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-100">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-green-700">
                <Check size={12} /> Already noted
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-green-600" />
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={e => setGuests(e.target.value)}
                    aria-label="Guest count"
                    className="w-16 rounded-lg border border-green-200 bg-white px-2 py-1 text-[12px] font-extrabold text-gray-900 outline-none focus:border-green-400"
                  />
                  guests
                </span>
                {chosen && city?.name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-green-600" />
                    <span className="font-bold">{city.name}</span>
                  </span>
                )}
                {savedDate?.event_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-green-600" />
                    <span className="font-bold">{humanDate(savedDate.event_date)}</span>
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-snug text-green-700/70">
                Change the count here if it has moved — we will re-price before confirming.
              </p>
            </div>
          ) : null}

          {/* ── When ────────────────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
              <Calendar size={12} /> The date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-100"
            />

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {SLOTS.map(s => {
                const Icon = s.icon
                const on = slot === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlot(on ? '' : s.id)}
                    aria-pressed={on}
                    className={`rounded-xl px-1 py-2 text-center transition-colors ${
                      on ? 'bg-plum-600 text-white' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                    }`}
                  >
                    <Icon size={14} className="mx-auto" />
                    <span className="mt-0.5 block text-[10.5px] font-extrabold leading-tight">{s.label}</span>
                    <span className={`block text-[8.5px] leading-tight ${on ? 'text-white/60' : 'text-gray-400'}`}>
                      {s.hint}
                    </span>
                  </button>
                )
              })}
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-bold text-gray-400">
                Know the exact time? Add it
              </summary>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-plum-400"
              />
            </details>
          </div>

          {/* ── Where ───────────────────────────────────────────────
              Area, then the full address. An area name tells us whether we
              serve it; it does not tell a crew with a truck of drapes where
              to unload at 6am. Both are needed and they are different
              questions. */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
              <MapPin size={12} /> Where is it happening <span className="text-red-500">*</span>
            </label>
            <LocationAutocomplete value={location} onChange={setLocation} />
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={2}
              placeholder="Venue name, door number, street, landmark — where our team should arrive"
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-100"
            />
          </div>

          {/* ── Who to call ─────────────────────────────────────────
              The whole follow-up is a WhatsApp message. Without this the
              request lands with nobody to answer it — which is how an
              enquiry becomes a dead row in a table. */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
              <Phone size={12} /> Who should we call <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-plum-400"
                />
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">+91</span>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  className={`w-full rounded-xl border py-2.5 pl-11 pr-3 text-sm outline-none ${
                    phone.length > 0 && !phoneValid
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-gray-200 focus:border-plum-400'
                  }`}
                />
              </div>
            </div>
            <p className="mt-1 text-[10.5px] text-gray-400">
              We message on WhatsApp first. No calls before 9am, none after 8pm.
            </p>
          </div>

          {/* ── Anything else ───────────────────────────────────────
              Free text, deliberately last and deliberately optional. The
              things that break an event on the day — a lift that fits one
              person, a society that stops work at 10pm, a grandmother who
              cannot manage stairs — are never on a form, and they are what a
              coordinator most needs to hear before quoting. */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
              <NotebookPen size={12} /> Anything we should know
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Setup must finish by 8am · no drilling in the hall · lift is small · elderly guests…"
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-100"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-3 pb-safe">
          <button
            onClick={handleConfirm}
            className="w-full rounded-2xl bg-saffron-400 py-3.5 text-[14px] font-extrabold text-plum-950 transition-transform active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
          <p className="mt-1.5 text-center text-[10.5px] text-gray-400">
            {user
              ? 'Nothing is charged. A coordinator confirms availability before anything is booked.'
              : 'Nothing is charged, and you can sign in later — this stays in your cart either way.'}
          </p>
        </div>
      </div>
    </div>
  )
}
