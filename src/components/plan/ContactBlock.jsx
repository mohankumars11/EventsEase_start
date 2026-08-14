import { UserRound, Phone, Mail, CalendarDays, MapPin, AlertCircle } from 'lucide-react'
import { TIME_SLOTS } from '../../lib/demand'
import { todayISO } from '../../utils/format'
import { BRAND } from '../../config/sambramo'

/**
 * How we reach you — the last thing asked, and the only thing required.
 *
 * ── The gap this closes ─────────────────────────────────────────────────
 * The celebration builder is the longest flow in the app: occasion, scale,
 * every dish by name, décor level, theme, add-ons, services. It ended by
 * writing a `service_enquiries` row carrying `customer_id` and nothing else a
 * person could act on. Sambramo's entire promise is "a coordinator calls you
 * back", and the coordinator got no name, no number and no time of day — they
 * had to join to `profiles` and hope, and a profile created by Google OAuth
 * carries no phone at all. The wizard (/plan/custom) has asked for all three
 * since it was written; the cart asks through BookingSheet. This was the one
 * door that let somebody spend four minutes building a celebration that could
 * not be followed up.
 *
 * ── Why here and not at the start ───────────────────────────────────────
 * Same rule the rest of the app follows: ask at the point where there is
 * something to save, and give a reason a person can see. A phone field on step
 * one is a toll gate in front of a price nobody has been shown yet. On the
 * review, under an itemised quote, "who do we call about this" is the obvious
 * next question rather than an interruption.
 *
 * ── What is required, and what is not ───────────────────────────────────
 * Name, a reachable mobile, and the date. Email stays optional because the
 * follow-up happens on WhatsApp, and the time of day stays optional because
 * somebody who has not fixed the hour should not be made to invent one. The
 * phone check is the same 10-digit 6–9 rule the wizard uses: `!!phone` once
 * let a single stray digit through and saved "+915", which for this business
 * is a lead that can never be served.
 *
 * ── Why the date stopped being "if you know it" ─────────────────────────
 * It used to be labelled exactly that, and optional, and it was the one
 * optional field on this block that made the request unworkable when it was
 * skipped. Every downstream step needs the day: a coordinator cannot check a
 * Master's availability, cannot price against a peak weekend, cannot hold
 * anything, and cannot tell whether the enquiry is for next Saturday or next
 * March. What "if you know it" bought was a slightly shorter-looking form; what
 * it cost was a lead whose first follow-up call is spent asking the question
 * the form declined to ask. The wizard has required it at step 2 since it was
 * written, the cart requires it through BookingSheet, and the shop requires it
 * at checkout — this door was the one that did not, and it is the busiest.
 *
 * Anyone genuinely undecided is not stuck: every calendar in the app carries an
 * "I'm flexible around this date" window (see EventDateSheet), which is a real
 * answer a coordinator can work with. "No date at all" is not.
 */

/** Same rule as PlanningWizard — an Indian mobile is 10 digits starting 6–9. */
export function phoneDigitsOf(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(-10)
}
export function isValidPhone(raw) {
  return /^[6-9]\d{9}$/.test(phoneDigitsOf(raw))
}
export function isValidEmail(raw) {
  const v = String(raw ?? '').trim()
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

/**
 * Is the date usable?
 *
 * Separate from `contactBlocked` because it is a fact about the celebration
 * rather than about the person, and because the builder holds the two in
 * different state. Exported for the same reason as its sibling: the rule that
 * disables the send button and the rule that re-checks at submit have to be
 * one rule.
 *
 * A date already past is treated as missing, not as an error to scold about —
 * it is what a tab left open overnight leaves behind, and the customer did
 * nothing wrong.
 */
export function eventDateBlocked(eventDate) {
  const value = String(eventDate ?? '').trim()
  if (!value) {
    return 'Pick the date of the celebration — a coordinator cannot check who is free without it.'
  }
  if (value < todayISO()) {
    return 'That date has already passed — pick the day of the celebration.'
  }
  return null
}

/**
 * Is this contact block complete enough to send?
 * Exported so the builder's `blocked` rule and this component cannot disagree
 * about what "filled in" means.
 */
export function contactBlocked(contact) {
  if (!contact) return 'Add your name and mobile number so a coordinator can call you back.'
  if (String(contact.name ?? '').trim().length < 2) {
    return 'Add your name — a coordinator opens the call with it.'
  }
  if (!isValidPhone(contact.phone)) {
    return 'Add a 10-digit mobile number. The whole follow-up happens on that number.'
  }
  if (!isValidEmail(contact.email)) {
    return 'That email address does not look right — check it for a typo, or clear it.'
  }
  return null
}

export default function ContactBlock({
  contact, onContact,
  eventDate, onEventDate,
  timeSlot, onTimeSlot,
  city, onCity,
}) {
  const set = (key, value) => onContact({ ...contact, [key]: value })

  const digits = phoneDigitsOf(contact?.phone)
  const phoneTouched = digits.length > 0
  const phoneOk = isValidPhone(contact?.phone)
  const emailOk = isValidEmail(contact?.email)

  // Only once they have engaged with the field. An empty date is caught by the
  // send button, which explains itself; painting the input red the moment the
  // review opens is scolding somebody for not having answered a question they
  // have not been asked yet. The same rule the phone field above follows.
  const dateMessage = eventDate ? eventDateBlocked(eventDate) : null

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
          <UserRound size={13} className="text-plum-600" /> Your name *
        </label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Full name"
          value={contact?.name ?? ''}
          onChange={e => set('name', e.target.value)}
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-base focus:border-saffron-400 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
          <Phone size={13} className="text-plum-600" /> Mobile number *
        </label>
        <div className="flex gap-2">
          <span className="shrink-0 flex items-center rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-500">
            +91
          </span>
          <input
            id="contact-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9876543210"
            value={digits}
            onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            className={`flex-1 min-w-0 min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 text-base focus:outline-none ${
              phoneTouched && !phoneOk
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200 focus:border-saffron-400'
            }`}
          />
        </div>
        {phoneTouched && !phoneOk ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            A 10-digit Indian mobile, starting 6–9. This is the number we call and WhatsApp.
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-gray-500">
            We call once about this request. No marketing messages.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-email" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
          <Mail size={13} className="text-plum-600" /> Email <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={contact?.email ?? ''}
          onChange={e => set('email', e.target.value)}
          className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 text-base focus:outline-none ${
            emailOk ? 'border-gray-200 focus:border-saffron-400' : 'border-red-300 focus:border-red-400'
          }`}
        />
        {!emailOk && (
          <p className="mt-1.5 text-xs text-red-600">That doesn't look like an email address.</p>
        )}
      </div>

      {/* ── When and where ────────────────────────────────────────────
          Both live here rather than on a build step: neither changes the
          price, and asking them first is how a pricing page turns back into
          an enquiry form. The date moved down from node 1 so that everything
          a coordinator needs in order to make the call sits in one block. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <div>
          <label htmlFor="review-date" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
            <CalendarDays size={13} className="text-plum-600" /> Date of the celebration *
          </label>
          <input
            id="review-date"
            type="date"
            required
            value={eventDate ?? ''}
            onChange={e => onEventDate(e.target.value)}
            min={todayISO()}
            aria-invalid={!!dateMessage}
            aria-describedby="review-date-hint"
            className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 text-base focus:outline-none ${
              dateMessage ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-saffron-400'
            }`}
          />
          {/* The consequence, not the rule. "This field is required" tells
              somebody they are blocked; naming what the date unlocks tells
              them why answering is in their own interest. */}
          <p id="review-date-hint" className={`mt-1.5 flex items-start gap-1.5 text-[11px] ${
            dateMessage ? 'text-red-600' : 'text-gray-500'
          }`}>
            {dateMessage ? <AlertCircle size={12} className="mt-0.5 shrink-0" /> : null}
            {dateMessage ?? 'We check who is free on your day before quoting.'}
          </p>
        </div>
        <div>
          <label htmlFor="review-city" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
            <MapPin size={13} className="text-plum-600" /> City
          </label>
          <select
            id="review-city"
            value={city}
            onChange={e => onCity(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-base bg-white focus:border-saffron-400 focus:outline-none"
          >
            {BRAND.pilotCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Time of day, only once there is a day. Asking "morning or evening?"
          about a date nobody has picked is a question with no referent. */}
      {eventDate && (
        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">
            Time of day <span className="font-normal text-gray-500">(optional — it decides which vendors we can ask)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => onTimeSlot(timeSlot === s.key ? '' : s.key)}
                aria-pressed={timeSlot === s.key}
                className={`min-h-[48px] rounded-xl border-2 px-3 py-2 text-left transition-colors ${
                  timeSlot === s.key
                    ? 'border-saffron-400 bg-saffron-50'
                    : 'border-gray-200 hover:border-plum-200'
                }`}
              >
                <span className="block text-sm font-semibold text-gray-800">{s.emoji} {s.label}</span>
                <span className="block text-[11px] text-gray-500">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
