import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Info, PencilLine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { StepFrame, ACTION_BAR_CLEARANCE } from '../../components/journey/JourneyChrome'
import MatchingBoard from '../../components/book/MatchingBoard'
import { CORE_AREAS, BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { priceLine } from '../../lib/instantPricing'
import { specModeFor, INSTANT_DURATIONS, defaultDurationFor } from '../../data/instantSetups'
import { tradeFor } from '../../config/vendor'
import { DISCUSS_CARD, DEFAULT_RADIUS_KM } from '../../config/instantBooking'
import { formatINR } from '../../utils/format'
import { EVENT_DATA } from '../../data/eventServicesData'

/**
 * Book a master for this week.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS FIVE SCREENS AND NOT TWENTY-NINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `/celebrate/:occasion` asks up to twenty-nine questions and is right to.
 * Somebody planning a wedding in October has time, and the questions are
 * what make the quote real.
 *
 * Somebody booking a decorator for Saturday does not. The whole value of
 * this bucket is that it is over in ninety seconds, so this flow asks
 * only what dispatch and pricing genuinely need — when, where, what, how
 * long — and defers everything else to the master's first phone call.
 *
 * That deferral is not laziness. `data/instantSetups.js` writes down what
 * a "standard setup" includes and excludes, the customer sees it before
 * paying, and the master sees the same list on the offer. A conversation
 * afterwards is how this trade actually works; a booking that pretends
 * otherwise is a booking that argues at the venue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PRICE HERE IS AN ESTIMATE. THE SERVER'S IS THE PRICE.
 * ══════════════════════════════════════════════════════════════════════
 *
 * This screen calls `priceLine()` so the customer sees a number before
 * committing. That number is never sent anywhere. `api/dispatch-booking`
 * recomputes every line from the same engine and writes ITS answer to
 * `booking_lines.quoted_amount_paise`, which is what a Razorpay order is
 * later priced from.
 *
 * Both call the same function, so they agree — but only one of them is
 * trusted, and it is not this one.
 */

/* Which services this flow offers. Deliberately not all 34: instant is
 * for standardised, short-lead work, and a venue or a pandal is neither.
 * `specModeFor` returns 'quote' for those and they route to pre-book. */
const OFFERED = [
  'decor', 'cake', 'photography', 'videography', 'catering', 'cooks',
  'dj', 'mehendi', 'makeup', 'drum', 'dining', 'priest', 'emcee', 'lighting',
]

function nextDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const dayLabel = (d, i) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
    : d.toLocaleDateString('en-IN', { weekday: 'short' })

export default function InstantBooking() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [params] = useSearchParams()

  const occasionId = params.get('occasion') ?? 'birthday'
  const occasion = EVENT_DATA[occasionId] ?? EVENT_DATA.birthday

  /**
   * Resume a booking already in flight.
   *
   * `/book/instant?request=<id>` opens straight on the matching board.
   * Not a test hook: dispatch takes up to two and a half minutes across
   * three waves, and a customer WILL lock their phone during it. Without
   * a URL that state lived only in component memory, so closing the tab
   * lost a booking that masters were actively answering — they would
   * accept a job whose customer had no way back to it.
   *
   * The id is safe to put in a URL because RLS decides what it returns:
   * `booking_lines` is readable only by the customer who owns the
   * request, so a guessed id renders nothing.
   */
  const resumeId = params.get('request')

  const [step, setStep] = useState(resumeId ? 4 : 0)
  const [date, setDate] = useState(null)
  const [area, setArea] = useState(null)
  const [guests, setGuests] = useState(30)
  const [picked, setPicked] = useState([])
  const [durations, setDurations] = useState({})
  const [notes, setNotes] = useState({})
  const [requestId, setRequestId] = useState(resumeId)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const bookable = useMemo(
    () => OFFERED.filter(id => specModeFor(id) !== 'quote' && tradeFor(id)),
    [],
  )

  const quotes = useMemo(() => {
    const out = {}
    for (const id of picked) {
      out[id] = priceLine({
        serviceId: id,
        guestCount: guests,
        durationId: durations[id] ?? defaultDurationFor(guests),
      })
    }
    return out
  }, [picked, guests, durations])

  const total = Object.values(quotes).reduce((n, q) => n + (q?.paise ?? 0), 0)

  const toggle = id =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  async function dispatch() {
    if (!user) { navigate('/login', { state: { from: { pathname: '/book/instant' } } }); return }
    setSending(true); setError(null)

    /**
     * Everything below is inside try/finally, and the `finally` is the
     * point.
     *
     * The first version awaited the fetch and then `res.json()` with
     * neither. Any response that was not JSON — a platform error page, a
     * proxy timeout, a dropped connection — rejected the await, so
     * `setSending(false)` never ran. The button sat on "Finding masters…"
     * for ever, with no error, no way back, and nothing in the UI to say
     * anything had gone wrong.
     *
     * That is the worst failure this screen can have. A visible error is
     * recoverable; a spinner that never resolves is a dead end on the one
     * screen where somebody is about to spend twenty thousand rupees.
     */
    try {
      const res = await fetch('/api/dispatch-booking', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          occasionId,
          occasionName: occasion?.name ?? 'Celebration',
          eventDate: date.toISOString().slice(0, 10),
          guestCount: guests,
          radiusKm: DEFAULT_RADIUS_KM,
          lat: area.lat,
          lng: area.lng,
          addressText: `${area.name}, Bengaluru`,
          areaLabel: area.name,
          city: 'Bengaluru',
          // Selections only. No prices — see the header.
          lines: picked.map(id => ({
            serviceId: id,
            durationId: durations[id] ?? defaultDurationFor(guests),
            note: notes[id] ?? null,
          })),
        }),
      })

      // Read as TEXT first. A 500 from the hosting platform is an HTML
      // page, and `res.json()` on it throws a parse error that says
      // nothing useful — so the raw first line is kept and shown, which
      // is what actually identifies the problem.
      const raw = await res.text()
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        setError(
          res.ok
            ? 'The server sent something unexpected. Please try again.'
            : `Booking service error (${res.status}). ${raw.slice(0, 120)}`,
        )
        return
      }

      if (!res.ok) { setError(body.error ?? body.detail ?? 'Could not send that'); return }
      if (!body.requestId) { setError('The booking was not created. Please try again.'); return }

      setRequestId(body.requestId)
      setStep(4)
    } catch (err) {
      // Offline, DNS, CORS, an aborted request. The customer does not
      // need the distinction; they need to know it did not go through
      // and that nothing was charged.
      setError(`Could not reach the booking service. Nothing has been charged. (${err?.message ?? 'network error'})`)
    } finally {
      setSending(false)
    }
  }

  /* ── 4 · Matching ─────────────────────────────────────────────── */
  if (step === 4 && requestId) {
    return (
      // `a-canvas` is the app's own ground, the same class the celebration
      // journey uses. Without it the near-transparent tint this had let
      // the body's gradient through and the screen read as a different
      // product.
      <div className={`a-canvas min-h-screen ${ACTION_BAR_CLEARANCE}`}>
        <MatchingBoard requestId={requestId} onPay={() => navigate('/track')} />
      </div>
    )
  }

  const STEPS = [
    /* ── 0 · When ───────────────────────────────────────────────── */
    {
      frame: {
        overline: occasion?.name ?? 'Your celebration',
        question: 'When is it?',
        why: 'Anything in the next month, we can book you a master directly. Further out and a coordinator plans it with you.',
      },
      body: (
        <div className="grid grid-cols-4 gap-2">
          {nextDays().map((d, i) => {
            const on = date && d.toDateString() === date.toDateString()
            const weekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <button
                key={i}
                onClick={() => setDate(d)}
                className={`rounded-2xl px-2 py-3 text-center transition ${
                  on ? 'bg-saffron-400 text-plum-950' : 'bg-white ring-1 ring-ink/[0.08] text-ink'
                }`}
              >
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wide opacity-70">
                  {dayLabel(d, i)}
                </span>
                <span className="mt-0.5 block text-[17px] font-extrabold tabular-nums">
                  {d.getDate()}
                </span>
                <span className="block text-[9.5px] font-bold opacity-60">
                  {d.toLocaleDateString('en-IN', { month: 'short' })}
                  {weekend && ' ·'}
                </span>
              </button>
            )
          })}
        </div>
      ),
      ready: !!date,
    },

    /* ── 1 · Where ──────────────────────────────────────────────── */
    {
      frame: {
        overline: 'Where',
        question: 'Which part of Bengaluru?',
        why: `We look for masters within ${DEFAULT_RADIUS_KM} km first, then widen if nobody nearby is free.`,
      },
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {CORE_AREAS.map(a => (
              <button
                key={a.name}
                onClick={() => setArea(a)}
                className={`rounded-2xl px-3 py-2.5 text-left text-[13px] font-extrabold transition ${
                  area?.name === a.name
                    ? 'bg-saffron-400 text-plum-950'
                    : 'bg-white ring-1 ring-ink/[0.08] text-ink'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>

          <details className="text-[12px]">
            <summary className="cursor-pointer font-extrabold text-ink-mute">
              Somewhere else in Bengaluru
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BENGALURU_AREAS.filter(a => a.tier === 3).map(a => (
                <button
                  key={a.name}
                  onClick={() => setArea(a)}
                  className={`rounded-2xl px-3 py-2.5 text-left text-[13px] font-extrabold transition ${
                    area?.name === a.name
                      ? 'bg-saffron-400 text-plum-950'
                      : 'bg-white ring-1 ring-ink/[0.08] text-ink'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            {/* Measured, not guessed: tier 3 completed 73% of baskets
                against tier 1's 97%. Saying so beats a silent bad
                experience. */}
            <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
              Fewer masters work out here, so some services may take longer to fill.
            </p>
          </details>

          <div>
            <p className="text-[12px] font-extrabold text-ink-soft">How many people?</p>
            <div className="mt-2 flex gap-2">
              {[15, 30, 60, 120, 250].map(n => (
                <button
                  key={n}
                  onClick={() => setGuests(n)}
                  className={`flex-1 rounded-2xl py-2.5 text-[13px] font-extrabold transition ${
                    guests === n ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/[0.08] text-ink'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      ready: !!area,
    },

    /* ── 2 · What ───────────────────────────────────────────────── */
    {
      frame: {
        overline: 'What you need',
        question: 'Pick your masters',
        why: 'Each one is booked separately, so nothing waits on the slowest.',
      },
      body: (
        <ul className="space-y-2">
          {bookable.map(id => {
            const q = priceLine({ serviceId: id, guestCount: guests, durationId: durations[id] ?? defaultDurationFor(guests) })
            if (!q) return null
            const on = picked.includes(id)
            return (
              <li key={id}>
                <button
                  onClick={() => toggle(id)}
                  className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition ${
                    on ? 'bg-white ring-2 ring-saffron-400' : 'bg-white ring-1 ring-ink/[0.08]'
                  }`}
                >
                  <span className={`h-4 w-4 shrink-0 rounded-md ring-2 ${on ? 'bg-saffron-400 ring-saffron-400' : 'ring-ink/20'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold text-ink">
                      {q.serviceName}
                    </span>
                    {/* Duration for time-charged trades, the setup shape
                        for catering, the setup name for decor. Whichever
                        one this service actually has — a row with neither
                        is a fixed deliverable and needs no qualifier. */}
                    {(q.durationScan ?? q.setupScan) && (
                      <span className="block text-[11.5px] font-bold text-ink-mute">
                        {q.durationScan ?? q.setupScan}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink">
                    {formatINR(q.rupees)}
                  </span>
                </button>

                {on && (
                  <div className="mt-1.5 space-y-2 pl-4">
                    {q.durationId && (
                      <div className="flex gap-1.5">
                        {INSTANT_DURATIONS.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setDurations(x => ({ ...x, [id]: d.id }))}
                            className={`rounded-full px-3 py-1 text-[11.5px] font-extrabold transition ${
                              (durations[id] ?? defaultDurationFor(guests)) === d.id
                                ? 'bg-ink text-white' : 'bg-ink/[0.06] text-ink-soft'
                            }`}
                          >
                            {d.scan}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* The master's call. Two lines, not a paragraph —
                        the long form lives in DISCUSS_CARD.detail. */}
                    {specModeFor(id) === 'discuss' && (
                      <p className="flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-ink-mute">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        {DISCUSS_CARD.glance} · {DISCUSS_CARD.scan}
                      </p>
                    )}

                    <input
                      value={notes[id] ?? ''}
                      onChange={e => setNotes(n => ({ ...n, [id]: e.target.value }))}
                      placeholder={DISCUSS_CARD.notePrompt}
                      className="w-full rounded-xl bg-ink/[0.04] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-saffron-400"
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ),
      ready: picked.length > 0,
    },

    /* ── 3 · The number ─────────────────────────────────────────── */
    {
      frame: {
        overline: 'Your booking',
        question: formatINR(Math.round(total / 100)),
        why: `${picked.length} master${picked.length === 1 ? '' : 's'} · ${area?.name} · ${date?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      },
      body: (
        <div className="space-y-4">
          <ul className="rounded-[22px] bg-white px-4 ring-1 ring-ink/[0.06]">
            {picked.map(id => {
              const q = quotes[id]
              return (
                <li key={id} className="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-extrabold text-ink">{q.serviceName}</p>
                    <p className="text-[11px] font-semibold text-ink-mute">{q.basis?.scan}</p>
                  </div>
                  <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink">
                    {formatINR(q.rupees)}
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="rounded-[18px] bg-surface-sunk/[0.05] p-3.5 text-[12px] leading-relaxed text-ink-soft">
            You pay only for masters who accept. Nothing is charged until then,
            and your money is held until 24 hours after the event.
          </p>

          {error && (
            <p className="rounded-[18px] bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{error}</p>
          )}
        </div>
      ),
      ready: picked.length > 0,
      primary: sending ? 'Finding masters…' : 'Find my masters',
      onPrimary: dispatch,
    },
  ]

  const s = STEPS[step]

  return (
    <div className={`a-canvas min-h-screen ${ACTION_BAR_CLEARANCE}`}>
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pt-4">
        <button
          onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
          className="rounded-full p-2 text-ink-soft transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-saffron-400' : 'bg-ink/10'}`} />
          ))}
        </div>
      </div>

      <StepFrame {...s.frame}>{s.body}</StepFrame>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.06] bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            disabled={!s.ready || sending}
            onClick={s.onPrimary ?? (() => setStep(step + 1))}
            className="w-full rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:opacity-40"
          >
            {s.primary ?? 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
