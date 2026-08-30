import { useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl } from '../../lib/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Info, PencilLine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { StepFrame, ACTION_BAR_CLEARANCE } from '../../components/journey/JourneyChrome'
import MatchingBoard from '../../components/book/MatchingBoard'
import WhereStep, { whereIsReady } from '../../components/book/WhereStep'
import { priceLine } from '../../lib/instantPricing'
import ServiceOptions from '../../components/book/ServiceOptions'
import { optionsFor, defaultOptions, optionMultiplier, optionSummary, setupChoice } from '../../data/instantOptions'
import { offersFor, applyOffer } from '../../config/offers'
import OfferCard from '../../components/offers/OfferCard'
import OfferUnlocked from '../../components/offers/OfferUnlocked'
import { SERVICE_BY_ID } from '../../data/servicePricing'
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

/* Where the in-flight booking id is parked between visits. */
const LIVE_BOOKING = 'sambramo_live_booking'

/* And where the half-finished ANSWERS are kept.
 *
 * ══════════════════════════════════════════════════════════════════════
 * LEAVING THIS SCREEN USED TO THROW EVERYTHING AWAY
 * ══════════════════════════════════════════════════════════════════════
 *
 * A customer picks a date, types an address, chooses six services and
 * answers the options — then takes a call, or backs out to check
 * something, and comes back to an empty form. Every one of those taps
 * is gone.
 *
 * The pre-book journey has never had this problem: it saves as it goes
 * and offers to resume. The instant flow, which is the one used by
 * somebody in a hurry, was the one that forgot.
 *
 * ── Answers, not a booking ──────────────────────────────────────────
 * This is the DRAFT — what they told us before anything was sent. The
 * booking id (LIVE_BOOKING) is separate and means something different:
 * a real request on the server with masters being asked about it.
 *
 * Cleared when it is dispatched, so a finished booking cannot repopulate
 * the next one.
 *
 * ── Why a day ───────────────────────────────────────────────────────
 * Long enough to cover a call, a night's sleep, a commute. Short enough
 * that a draft from last week does not surface as though it were
 * today's plan — the event date in it would be stale and the prices
 * would have moved.
 */
const DRAFT = 'sambramo_instant_draft'
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d?.at || Date.now() - d.at > DRAFT_TTL_MS) return null
    return d
  } catch { return null }
}

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

  /**
   * A date handed over by whoever sent us here.
   *
   * `planHrefFor` in hooks/useEventDate forks on the date and appends it,
   * so a customer arriving from the home card or an occasion tile has
   * ALREADY answered "when is it?". Asking again is precisely the
   * complaint that hook exists to fix — its header describes the app
   * looking like it had not been listening when the same question was
   * put three times.
   *
   * Parsed at midnight local rather than through `new Date('2026-08-29')`,
   * which JavaScript reads as UTC and renders as the 28th anywhere west
   * of Greenwich. Bengaluru is east, so it would not have shown here —
   * which is exactly the kind of bug that ships.
   */
  const handedDate = params.get('date')

  const [step, setStep] = useState(() => {
    if (resumeId) return 4
    // A parked booking wins over a fresh start. Somebody with masters
    // being found for them right now did not come back to fill in a
    // form again.
    try { if (localStorage.getItem(LIVE_BOOKING)) return 4 } catch { /* storage off */ }

    /* And back to the step they were on.
     *
     * Restoring the answers but not the position is half a resume: the
     * customer lands on "When is it?" with a date already chosen and
     * has to tap Continue through four screens they have finished. */
    const d = readDraft()
    if (d?.step != null) return Math.min(d.step, 3)

    return handedDate ? 1 : 0
  })
  const [date, setDate] = useState(() => {
    if (handedDate) return new Date(`${handedDate}T00:00:00`)
    // Re-hydrated from the draft. Stored as ISO because a Date does not
    // survive JSON, and a draft that restored every answer EXCEPT the
    // date would drop somebody back on step 0 to pick it again.
    const iso = readDraft()?.date
    return iso ? new Date(iso) : null
  })
  const [where, setWhere] = useState(() => readDraft()?.where ?? null)
  const [guests, setGuests] = useState(() => readDraft()?.guests ?? 30)
  const [picked, setPicked] = useState(() => readDraft()?.picked ?? [])
  const [durations, setDurations] = useState(() => readDraft()?.durations ?? {})
  /* The choices per service — { photography: { style: 'candid' } }.
   *
   * Defaulted the moment a service is picked, so a price can be shown
   * before anybody answers anything and skipping the questions costs
   * the base rate rather than nothing. */
  const [options, setOptions] = useState(() => readDraft()?.options ?? {})
  const [offerId, setOfferId] = useState(null)
  /* The offer to CELEBRATE, and the set already seen.
   *
   * An unlock fires when a basket crosses a threshold it did not meet a
   * moment ago — never on load, never twice for the same offer. A
   * celebration that repeats is decoration, and decoration teaches
   * people to ignore the one that matters. */
  const [unlocked, setUnlocked] = useState(null)
  const seenOffers = useRef(new Set())
  const [notes, setNotes] = useState(() => readDraft()?.notes ?? {})

  /* Written on every change, read on mount.
   *
   * An effect rather than a save button: somebody who leaves this screen
   * did not intend to save, and asking them to would be asking them to
   * predict that they were about to be interrupted. */
  useEffect(() => {
    if (step >= 4) return          // dispatched — the booking id owns it now
    if (!picked.length && !where) return   // nothing worth keeping yet
    try {
      localStorage.setItem(DRAFT, JSON.stringify({
        at: Date.now(),
        step, guests, picked, durations, options, notes, where,
        date: date ? date.toISOString() : null,
        occasionId,
      }))
    } catch { /* storage off */ }
  }, [step, guests, picked, durations, options, notes, where, date, occasionId])
  const [requestId, setRequestId] = useState(() => {
    if (resumeId) return resumeId
    // Picked up from the last visit. Cleared as soon as the board says
    // there is nothing left to watch, so a finished booking does not
    // hijack the next one.
    try { return localStorage.getItem(LIVE_BOOKING) } catch { return null }
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const bookable = useMemo(
    () => OFFERED.filter(id => specModeFor(id) !== 'quote' && tradeFor(id)),
    [],
  )

  const quotes = useMemo(() => {
    const out = {}
    for (const id of picked) {
      const q = priceLine({
        serviceId: id,
        guestCount: guests,
        durationId: durations[id] ?? defaultDurationFor(guests),
        /* Decor is priced from a rate-card row, not a multiplier, so the
           chosen setup has to reach priceLine itself. Null for every
           other service, which is what it already assumed. */
        setupId: setupChoice(id, options[id] ?? defaultOptions(id)),
      })
      /* The same multiplier the server applies, so the number on screen
         is the number that gets charged. Applied here rather than baked
         into priceLine, because the rate card and the choices are
         different things and the card should stay readable on its own. */
      if (q?.paise) {
        const m = optionMultiplier(id, options[id] ?? defaultOptions(id))
        q.paise = Math.round(q.paise * m)
        q.rupees = Math.round(q.paise / 100)
      }
      out[id] = q
    }
    return out
  }, [picked, guests, durations, options])


  const total = Object.values(quotes).reduce((n, q) => n + (q?.paise ?? 0), 0)

  /* Below `total`, and that is not a style choice.
   *
   * These read `total`, and they were written ABOVE its declaration.
   * `const` is hoisted but not initialised, so the reference landed in
   * the temporal dead zone and every render of this screen threw
   * "Cannot access before initialization" — which the error boundary
   * caught and turned into "Something went wrong on our side".
   *
   * It survived review because the file reads top-to-bottom as though
   * it works, and it survived a local build because Vite does not
   * evaluate the component. Only running it finds this. */
  /* What this basket qualifies for, recomputed as it changes. */
  const offers = useMemo(() => offersFor({
    subtotalPaise: total,
    lineCount: picked.length,
    eventDate: date?.toISOString().slice(0, 10) ?? null,
    // Pre-launch: everybody's first. Reads from the customer's history
    // once there is history to read.
    isFirstBooking: true,
  }), [total, picked.length, date])

  const chosenOffer = offers.find(o => o.id === offerId && o.eligible) ?? null
  const discountPaise = chosenOffer ? applyOffer(chosenOffer.id, total).discountPaise : 0

  /* Announce a newly eligible offer, once — and only while it can still
     be honoured.
   *
   * ══════════════════════════════════════════════════════════════════
   * AN OFFER AFTER DISPATCH IS A PROMISE THE APP CANNOT KEEP
   * ══════════════════════════════════════════════════════════════════
   *
   * This used to fire on any step, matching board included. It looked
   * like a reward and was worth nothing: once the booking is dispatched
   * the price is already written to `booking_lines.quoted_amount_paise`
   * by the server, the pay button sums those rows, and
   * api/create-booking-payment re-reads them from the database. Nothing
   * downstream of dispatch has ever heard of `offerId`.
   *
   * So the customer was shown "Flat 300 off — use it on this booking"
   * over a booking whose total could not move, and would have found the
   * full amount waiting at the checkout. A discount that does not arrive
   * is worse than no discount: it is the moment somebody decides the
   * app is lying to them, and it lands on the screen where they are
   * about to hand over money.
   *
   * The basket steps are where an offer is real, so that is where it is
   * announced. */
  useEffect(() => {
    if (step >= 4) return
    const fresh = offers.find(o => o.eligible && !seenOffers.current.has(o.id))
    if (!fresh) return
    seenOffers.current.add(fresh.id)
    // Only once the customer has actually built something — an unlock on
    // an empty basket is a popup, not a reward.
    if (picked.length > 0) setUnlocked(fresh)
  }, [offers, picked.length, step])

  // Resolved once per render and read by both the step gate and the
  // dispatch call, so the screen cannot say 'ready' about a location the
  // request then refuses.
  const whereReady = useMemo(() => whereIsReady(where), [where])

  // TODO: read from customer_addresses once the customer has one saved.
  // Until then every first booking types six digits, which is the case
  // WhereStep is built around.
  const savedAddress = null

  const toggle = id =>
  {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
    setOptions(o => (o[id] ? o : { ...o, [id]: defaultOptions(id) }))
  }

  async function dispatch() {
    if (!user) { navigate('/login', { state: { from: { pathname: '/book/instant' } } }); return }

    /* The screen moves first, and the request goes second.
     *
     * The dispatch round trip is about six seconds against production —
     * it prices every line, matches partners twice per line, writes the
     * offers and sends the pushes. All of that used to happen while the
     * customer looked at a disabled button reading "Finding masters…",
     * and only then did the screen change.
     *
     * Six seconds of a dead button after the biggest commitment in the
     * flow is where somebody decides the app is broken and leaves. So
     * step 4 is entered immediately: MatchingBoard already knows which
     * services were picked, so it draws the real rows and fills them in
     * as the server answers. Nothing is faked — every row says exactly
     * what is true of it, starting at "Reaching masters…".
     *
     * The booking is still only real when the server says so. This
     * changes when the screen moves, not when the booking exists. */
    setStep(4)
    setSending(true); setError(null)

    // Declared out here so `finally` can clear the timer whichever way
    // the try block leaves.
    let ctl, deadline

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
      /* A deadline, because a hanging request is the worst failure here.
       *
       * This was a bare fetch with no timeout. If the request never
       * settled — a WebView holding a connection, a phone that lost
       * signal mid-flight, a cold function that never answered — the
       * screen sat on "Reaching masters…" for ever, with no error, no
       * retry and no way to tell whether anything had been sent.
       *
       * Reported exactly that way, and it is indistinguishable from the
       * app being broken. A visible failure is recoverable; a spinner
       * that never resolves is a dead end on the screen where somebody
       * has just committed to a booking.
       *
       * 30 seconds: longer than the slowest measured dispatch (5.5s on
       * a cold function) by a wide margin, short enough that nobody
       * decides the app is dead first. */
      ctl = new AbortController()
      deadline = setTimeout(() => ctl.abort(), 30_000)

      const res = await fetch(apiUrl('/api/dispatch-booking'), {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          occasionId,
          occasionName: occasion?.name ?? 'Celebration',
          eventDate: date.toISOString().slice(0, 10),
          guestCount: guests,
          radiusKm: DEFAULT_RADIUS_KM,
          // The VENUE's point, never the customer's.
          //
          // This is the line the whole location rework exists for. It
          // used to send the area the customer had tapped for
          // themselves, so a family in Bellandur booking a mantapa in
          // Rajajinagar had masters matched fifteen kilometres from the
          // job. lib/eventLocation resolves whichever of the three
          // answers was given and always yields the point the WORK
          // happens at.
          lat: whereReady.point.lat,
          lng: whereReady.point.lng,
          addressText: whereReady.point.addressText,
          areaLabel: whereReady.point.areaLabel,
          city: 'Bengaluru',
          // Selections only. No prices — see the header.
          lines: picked.map(id => ({
            serviceId: id,
            durationId: durations[id] ?? defaultDurationFor(guests),
            /* Decor and catering are priced from their own rate cards
               rather than by multiplier, so the ROW has to travel with
               the line. Without it the server re-picks the tier from
               headcount and quotes a different number from the one on
               the screen the customer just agreed to. */
            setupId: setupChoice(id, options[id] ?? defaultOptions(id)),
            // Choice IDS only. The multiplier is looked up server-side in
            // api/dispatch-booking.js — a client that invented one would
            // be sending a field nothing reads.
            options: options[id] ?? defaultOptions(id),
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
      /* Written down immediately.
       *
       * A customer who presses back, or is pulled away by a call, has a
       * booking that is live on the server with masters being asked
       * about it — and until now the app forgot the id the moment the
       * component unmounted. They came back to an empty form and the
       * only way to reach their own booking was to start another one.
       *
       * This is the id, not the answers: what to show them is read from
       * the server, which is the only thing that knows what has happened
       * since. */
      try {
        localStorage.setItem(LIVE_BOOKING, body.requestId)
        // The answers have become a booking. Keeping them would offer to
        // resume a form whose result already exists.
        localStorage.removeItem(DRAFT)
      } catch { /* storage off */ }
    } catch (err) {
      /* Offline, DNS, CORS, a timeout. The customer does not need the
       * distinction — but WE do when they report it, so the reason is
       * kept in the sentence rather than swallowed.
       *
       * The abort is named separately because "it took too long" and
       * "there is no connection" lead to different next actions: one is
       * worth retrying immediately, the other is not. */
      const timedOut = err?.name === 'AbortError'
      setError(timedOut
        ? 'That took too long to reach Sambramo. Nothing has been charged — tap Try again.'
        : `Could not reach Sambramo. Check your connection — nothing has been charged. (${err?.message ?? 'network error'})`)
    } finally {
      if (deadline) clearTimeout(deadline)
      setSending(false)
    }
  }

  // Belt and braces: a sheet that was already open when the customer
  // pressed dispatch must not survive onto the matching board either.
  const offerSheet = unlocked && step < 4 ? (
    <OfferUnlocked
      offer={unlocked}
      onClose={() => setUnlocked(null)}
      onUse={setOfferId}
    />
  ) : null

  /* ── 4 · Matching ───────────────────────────────────────────────
     Entered with requestId still null. See dispatch() above. */
  if (step === 4) {
    return (
      // `a-canvas` is the app's own ground, the same class the celebration
      // journey uses. Without it the near-transparent tint this had let
      // the body's gradient through and the screen read as a different
      // product.
      <div className={`a-canvas min-h-screen ${ACTION_BAR_CLEARANCE}`}>
        {offerSheet}

        {/* ══════════════════════════════════════════════════════════
            A way out of the screen people spend the longest on
            ══════════════════════════════════════════════════════════

            This block returned BEFORE the page header, so the matching
            screen had no back arrow, no close, no anything. A customer
            watching masters be found could not leave except by killing
            the app — on the one screen they sit on for a minute, having
            just committed to a booking.

            Back does not cancel. It leaves the booking running and goes
            to Track, because that is what "back" means here: the
            masters keep being asked whether or not somebody is
            watching, and pretending otherwise would be the more
            frightening lie.

            Cancelling is the OTHER control, per service, on each row —
            because a booking is per line and always has been. */}
        <header className="mx-auto flex max-w-2xl items-center gap-2 px-4 pt-4">
          <button
            onClick={() => navigate('/track')}
            className="rounded-full p-2 text-ink-soft transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-soft">
            {occasion?.name ?? 'Your booking'}
            {whereReady?.point?.areaLabel ? ` · ${whereReady.point.areaLabel}` : ''}
          </span>

          {/* Says where "back" goes, because an unlabelled arrow on a
              screen somebody is anxious about is a gamble they will not
              take. */}
          <button
            onClick={() => navigate('/track')}
            className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-[12px] font-extrabold text-ink-soft transition active:scale-95"
          >
            Track it later
          </button>
        </header>

        <MatchingBoard
          requestId={requestId}
          onPay={() => navigate('/track')}
          // The picked services, so the rows exist before the server
          // answers and the list does not reflow when it does.
          pending={picked.map(id => ({ id, name: SERVICE_BY_ID[id]?.name ?? id }))}
          area={whereReady?.point?.areaLabel ?? null}
          eventDate={date?.toISOString().slice(0, 10) ?? null}
          failed={error}
          onRetry={() => { setError(null); dispatch() }}
        />
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
        question: 'Where is it happening?',
        // Says what it means. The old heading was 'Which part of
        // Bengaluru?', which reads as 'where are you' — and dispatch
        // needs 'where is the work'. See components/book/WhereStep.
        why: 'We match masters to the venue, not to where you live.',
      },
      body: (
        <div className="space-y-5">
          <WhereStep value={where} onChange={setWhere} savedAddress={savedAddress} />

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

          {/* Stated where the radius is decided, not buried in a footnote. */}
          {whereReady.ok && (
            <p className="text-[11.5px] leading-snug text-ink-mute">
              We look for masters within {DEFAULT_RADIUS_KM} km of{' '}
              {whereReady.point.areaLabel}, then widen if nobody nearby is free.
            </p>
          )}
        </div>
      ),
      // 'undecided' is a real answer and a real dead end for dispatch —
      // it routes to the coordinator rather than pretending to match.
      ready: whereReady.ok,
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

    /* ── 3 · What exactly ───────────────────────────────────────
       Only for services that actually ask something. A step that
       renders an empty page for a basket of cake and lighting is a
       step that teaches people to tap Next without reading. */
    ...(picked.some(id => optionsFor(id).length) ? [{
      frame: {
        overline: 'Your booking',
        question: 'What exactly?',
        why: 'These change the price, so they are asked now rather than agreed on a phone call afterwards.',
      },
      body: (
        <div className="space-y-3">
          {picked.filter(id => optionsFor(id).length).map(id => (
            <ServiceOptions
              key={id}
              serviceId={id}
              /* Decor and catering are absent from SERVICE_BY_ID on
                 purpose -- data/servicePricing.js excludes them because
                 they have their own rate cards. The fallback was the raw
                 id, so this card was headed "decor" in lower case beside
                 "Photography" and "Celebration cake".

                 The trade name is the right answer, not the tier name:
                 the tier is the first question ASKED inside this card,
                 so heading it "Balloon & backdrop" would label the card
                 with one of its own options. */
              serviceName={SERVICE_BY_ID[id]?.name ?? tradeFor(id) ?? id}
              trade={tradeFor(id)}
              value={options[id] ?? defaultOptions(id)}
              onChange={next => setOptions(o => ({ ...o, [id]: next }))}
              /* The live price for a hypothetical answer, so each card
                 carries the number that choice would make it. */
              priceOf={candidate => {
                const q = priceLine({
                  serviceId: id, guestCount: guests,
                  durationId: durations[id] ?? defaultDurationFor(guests),
                  // The candidate's OWN setup, so tapping "Full function
                  // decor" shows what that row costs rather than what the
                  // currently selected one costs.
                  setupId: setupChoice(id, candidate),
                })
                if (!q?.paise) return null
                return Math.round(q.paise * optionMultiplier(id, candidate) / 100)
              }}
            />
          ))}
        </div>
      ),
      ready: true,
    }] : []),

    /* ── 4 · The number ─────────────────────────────────────────── */
    {
      frame: {
        overline: 'Your booking',
        question: formatINR(Math.round(total / 100)),
        // Reads back the VENUE, so the customer confirms where the work
        // lands rather than where they happen to live.
        why: [
          `${picked.length} master${picked.length === 1 ? '' : 's'}`,
          whereReady.ok ? whereReady.point.areaLabel : null,
          date?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
        ].filter(Boolean).join(' · '),
      },
      body: (
        <div className="space-y-4">
          {/* What this basket has earned, and what it nearly has.
              Locked offers stay visible saying what would unlock them —
              hiding one until it applies means somebody finds out
              afterwards that they nearly had something. */}
          {offers.length > 0 && (
            <div className="space-y-2">
              {offers.slice(0, 3).map(o => (
                <OfferCard
                  key={o.id}
                  offer={o}
                  applied={offerId === o.id}
                  onApply={setOfferId}
                />
              ))}
            </div>
          )}

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
      {offerSheet}
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
