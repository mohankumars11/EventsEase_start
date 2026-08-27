import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Home, Loader2, MapPin, Store } from 'lucide-react'
import { resolvePincode, dispatchability } from '../../lib/eventLocation'

/**
 * Where the event happens.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES, AND WHY IT WAS WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * A grid of thirty area buttons under the heading "Which part of
 * Bengaluru?" — wrong twice.
 *
 * Wrong as an INTERFACE: thirty targets to scroll on a phone, in a flow
 * whose entire promise is ninety seconds, and it only covered areas
 * somebody had thought to type. A function in Nelamangala had no answer.
 *
 * Wrong as a QUESTION, which is the serious half. "Which part of
 * Bengaluru?" reads as "where are you", and dispatch needs "where is the
 * work". A family in Bellandur booking a mantapa in Rajajinagar would
 * have had masters matched around Bellandur — fifteen kilometres from
 * the job. Every one of them declines when they read the detail, or
 * worse accepts and discovers it on the day. Both cost supply.
 *
 * So the heading now says what it means, and the sentence under it says
 * it again in the customer's terms: we match masters to the venue, not
 * to where you live.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASKED HERE, BEFORE ANYTHING IS PICKED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The serviceability check fires as the sixth digit lands — before the
 * customer has chosen a single service. Letting somebody assemble a
 * whole basket and THEN telling them "not in our area yet" is the worst
 * possible moment to say it, and it is the one thing about ordering this
 * screen early that is not negotiable.
 *
 * A pincode we do not serve is captured rather than refused flat. It is a
 * real person telling us where to expand, which is the same signal
 * `city_interest_requests` was built to collect.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE INPUT PATTERN, NOT TWO
 * ══════════════════════════════════════════════════════════════════════
 *
 * "At my place" and "At a venue" both take a pincode. A first-time
 * customer types six digits either way and can save the result; from the
 * second booking "At my place" is a single tap with no typing.
 *
 * Teaching two different location inputs — a saved-address picker and a
 * pincode field — would be two things to learn for one question.
 */

const OPTIONS = [
  {
    id: 'home',
    icon: Home,
    label: 'At my place',
    hint: 'Home, terrace, apartment clubhouse',
  },
  {
    id: 'venue',
    icon: Store,
    label: 'At a venue',
    hint: 'Hall, mantapa, farmhouse, office',
  },
  {
    id: 'undecided',
    icon: MapPin,
    label: 'Not decided yet',
    hint: 'We will plan it with you',
  },
]

function PincodeField({ value, onChange, saved, onSaveToggle, showSave, autoFocus }) {
  const ref = useRef(null)
  const resolved = useMemo(() => resolvePincode(value), [value])
  const complete = String(value ?? '').replace(/\D/g, '').length === 6

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <div className="mt-3">
      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">
        Pincode
      </label>
      <input
        ref={ref}
        // `inputMode` rather than `type="number"`: a numeric keypad on a
        // phone without the spinner, the scroll-to-change hazard, or the
        // silent stripping of a leading zero that a number input does.
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={value ?? ''}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="560103"
        className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-[19px] font-extrabold tracking-[0.3em] tabular-nums text-ink ring-1 ring-ink/[0.1] placeholder:tracking-[0.3em] placeholder:text-ink-mute/40 focus:outline-none focus:ring-2 focus:ring-saffron-400"
      />

      {/* Resolved as the sixth digit lands. Nothing to press. */}
      <div className="mt-2 min-h-[20px] text-[12.5px] font-bold">
        {!complete && (
          <span className="text-ink-mute">Six digits — we will find the area</span>
        )}
        {complete && resolved && (
          <span className="flex items-center gap-1.5 text-forest-700">
            <Check size={14} /> {resolved.area}, {resolved.district}
          </span>
        )}
        {complete && !resolved && (
          <span className="text-amber-700">
            Not in our area yet — we are matching masters in Bengaluru first.
          </span>
        )}
      </div>

      {showSave && complete && resolved && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] font-bold text-ink-soft">
          <input
            type="checkbox"
            checked={saved}
            onChange={e => onSaveToggle(e.target.checked)}
            className="h-4 w-4 rounded accent-saffron-400"
          />
          Save as my address
        </label>
      )}
    </div>
  )
}

export default function WhereStep({ value, onChange, savedAddress }) {
  const kind = value?.kind ?? (savedAddress ? 'home' : null)

  const set = patch => onChange({ ...(value ?? {}), ...patch })

  return (
    <div className="space-y-2.5">
      {OPTIONS.map(opt => {
        const on = kind === opt.id
        const Icon = opt.icon

        // The saved address turns "At my place" into a single tap from
        // the second booking onward.
        const savedHere = opt.id === 'home' && savedAddress && !value?.pincode

        return (
          <div
            key={opt.id}
            className={`overflow-hidden rounded-[22px] transition ${
              on ? 'bg-white ring-2 ring-saffron-400' : 'bg-white ring-1 ring-ink/[0.08]'
            }`}
          >
            <button
              onClick={() => set({
                kind: opt.id,
                // Carry the saved pincode in so the common case needs no
                // typing at all.
                pincode: opt.id === 'home' ? (value?.pincode ?? savedAddress?.pincode ?? '') : (value?.pincode ?? ''),
              })}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  on ? 'bg-saffron-400 text-plum-950' : 'bg-ink/[0.05] text-ink-mute'
                }`}
              >
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold text-ink">{opt.label}</span>
                <span className="block text-[12px] font-semibold text-ink-mute">
                  {savedHere
                    ? `${savedAddress.area} · ${savedAddress.pincode}`
                    : opt.hint}
                </span>
              </span>
            </button>

            {/* Expands in place rather than pushing to another screen —
                the whole question stays visible while it is answered. */}
            {on && opt.id !== 'undecided' && (
              <div className="px-4 pb-4">
                <PincodeField
                  value={value?.pincode}
                  onChange={pincode => set({ pincode })}
                  saved={!!value?.save}
                  onSaveToggle={save => set({ save })}
                  showSave={opt.id === 'home'}
                  autoFocus={!savedHere}
                />

                {opt.id === 'venue' && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">
                      Venue name <span className="font-bold normal-case tracking-normal">· optional</span>
                    </label>
                    <input
                      value={value?.venueName ?? ''}
                      onChange={e => set({ venueName: e.target.value.slice(0, 80) })}
                      placeholder="Sri Krishna Kalyana Mantapa"
                      className="mt-1 w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] font-bold text-ink ring-1 ring-ink/[0.1] placeholder:font-semibold placeholder:text-ink-mute/50 focus:outline-none focus:ring-2 focus:ring-saffron-400"
                    />
                    <p className="mt-1.5 text-[11.5px] leading-snug text-ink-mute">
                      Helps your master know the place. The exact address is
                      shared only after you pay.
                    </p>
                  </div>
                )}
              </div>
            )}

            {on && opt.id === 'undecided' && (
              <p className="px-4 pb-4 text-[12.5px] leading-relaxed text-ink-soft">
                That is fine — plenty of people book the masters before the hall.
                A coordinator will work through it with you instead of us
                matching automatically.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Whether this answer can go to dispatch, and why not if it cannot. */
export function whereIsReady(value) {
  return dispatchability(value)
}
