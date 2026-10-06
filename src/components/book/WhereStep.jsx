import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, Crosshair, Home, Loader2, MapPin, Search, Store, X } from 'lucide-react'
import { dispatchability } from '../../lib/eventLocation'
import {
  lookupPincode,
  searchAreas,
  searchVenues,
  nearestServed,
  currentPosition,
} from '../../lib/pincodeDirectory'

/**
 * Where the event happens.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THE DELIVERY APPS ACTUALLY DO, AND WHICH HALF TO COPY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Porter, Swiggy, Zomato, Blinkit and Dunzo have all converged on the
 * same address flow, and the convergence is not fashion — it is the same
 * three findings arrived at separately:
 *
 *   1. NOBODY TYPES A PINCODE. It is derived from a coordinate, never
 *      asked for. Six digits is a data-entry task that exists only
 *      because a database column wanted filling, and it is the single
 *      highest-drop-off field in an Indian checkout.
 *
 *   2. THREE WAYS IN, RANKED BY EFFORT. Current location, then search,
 *      then a saved address. Every one of them ends at the same object.
 *
 *   3. THE COORDINATE IS THE TRUTH; THE PINCODE IS A LABEL. Serviceability
 *      is decided on the point, and the pincode is shown back to the
 *      customer only so they can confirm the app understood them.
 *
 * All three are adopted here. Two things they do are deliberately NOT.
 *
 * ── Not the map pin, and not the drag ────────────────────────────────
 *
 * Every one of those apps ends with "move the pin to your exact
 * location". They need it: a rider has to reach a specific gate.
 *
 * Dispatch here measures master → venue across a five to fifteen
 * kilometre radius, and migration 068 deliberately withholds the exact
 * address until after payment. A pin-drag would ask the customer to
 * supply precision the product then refuses to use — thirty seconds of
 * fiddling that changes no outcome — and would imply we are about to send
 * somebody to that spot. Area-level is honest and it is enough.
 *
 * ── Not GPS on the venue branch ──────────────────────────────────────
 *
 * "Use my current location" is the hero button in every delivery app,
 * because in a delivery app WHERE YOU ARE is WHERE THE WORK IS.
 *
 * That is precisely the assumption this file was rewritten to destroy.
 * The event is somewhere else, on a date that has not arrived. So GPS
 * appears under "At my place", where it answers the right question, and
 * is absent under "At a venue", where it would answer a question nobody
 * asked and quietly reintroduce the Bellandur-mantapa bug wearing the
 * clothes of a convenience feature.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE BOX FOR BOTH INPUTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The apps above still split the two: a place search here, a pincode box
 * there, and the customer has to know which one they are in. Nobody
 * thinks about their own address that way. They think "HSR" or they think
 * "560102" and both should land in the same field.
 *
 * So `search_areas` (migration 085) matches digits on prefix and letters
 * on substring, and this box does not care which arrives. Typing six
 * digits that resolve cleanly skips the list entirely — the fast path for
 * somebody who knows their pincode is still one field and no taps.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASKED HERE, BEFORE ANYTHING IS PICKED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The serviceability check fires as the sixth digit lands — before the
 * customer has chosen a single service. Letting somebody assemble a whole
 * basket and THEN telling them "not in our area yet" is the worst
 * possible moment to say it, and it is the one thing about ordering this
 * screen early that is not negotiable.
 *
 * A pincode we do not serve is captured rather than refused flat. It is a
 * real person telling us where to expand, which is the same signal
 * `city_interest_requests` was built to collect. A pincode that does not
 * EXIST gets a different sentence, because it is a typo and not a
 * verdict — the old code could only say "no" to both.
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

/** What a resolved place looks like on the `where` object. */
function placePatch(p) {
  return {
    pincode: p.pincode,
    area: p.area,
    district: p.district ?? null,
    lat: p.lat,
    lng: p.lng,
    status: 'served',
    // Picking a named venue fills the venue field too, so choosing
    // "Sri Krishna Kalyana Mantapa" from the list does not then ask the
    // customer to type its name again a few pixels lower.
    ...(p.kind === 'venue' && p.venueName ? { venueName: p.venueName } : {}),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   The GPS button — home only
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Failure gets named, not generalised.
 *
 * A customer who DENIED permission needs different words from one whose
 * phone could not get a fix: the first has something to fix in Settings,
 * the second just needs to type. "Location unavailable" for both is how
 * an app teaches people to ignore its messages.
 */
const GPS_TROUBLE = {
  denied: 'Location is switched off for this site. Type the area instead — it is just as fast.',
  timeout: 'Your phone did not get a fix. Type the area instead.',
  unavailable: 'Could not read your location. Type the area instead.',
  unsupported: 'This browser cannot share a location. Type the area instead.',
  not_served: 'You are outside the areas we cover today. Type the pincode and we will note it.',
  off_map: 'That reading looks wrong. Type the area instead.',
}

function UseMyLocation({ onResolved }) {
  const [busy, setBusy] = useState(false)
  const [trouble, setTrouble] = useState(null)

  async function run() {
    setBusy(true)
    setTrouble(null)

    const pos = await currentPosition()
    if (pos.status !== 'ok') {
      setTrouble(GPS_TROUBLE[pos.status] ?? GPS_TROUBLE.unavailable)
      setBusy(false)
      return
    }

    // Resolved against our OWN pincode table — the customer's exact
    // coordinate never leaves the database. See migration 085.
    const near = await nearestServed(pos.lat, pos.lng)
    setBusy(false)

    if (near?.status !== 'served') {
      setTrouble(GPS_TROUBLE[near?.status] ?? GPS_TROUBLE.not_served)
      return
    }
    onResolved(near)
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-saffron-50 px-4 py-3 text-left ring-1 ring-saffron-200 transition hover:bg-saffron-100 disabled:opacity-60"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-plum-950">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
        </span>
        <span className="text-[13.5px] font-extrabold text-ink">
          {busy ? 'Finding you…' : 'Use my current location'}
        </span>
      </button>

      {trouble && (
        <p className="mt-1.5 text-[11.5px] leading-snug text-amber-700">{trouble}</p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The one search box
   ══════════════════════════════════════════════════════════════════════ */

function PlaceSearch({ value, onPick, onClear, autoFocus }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState(null)      // { status, pincode } for a six-digit dead end
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef(null)
  const timer = useRef(null)
  const seq = useRef(0)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => () => clearTimeout(timer.current), [])

  const run = useCallback(async raw => {
    const q = raw.trim()
    const mine = ++seq.current                 // last response wins, not last request

    if (q.length < 2) {
      setResults([]); setMiss(null); setBusy(false)
      return
    }

    setBusy(true)

    // Six digits is an answer, not a search. Resolve it directly so the
    // customer who knows their pincode never touches the result list.
    if (/^\d{6}$/.test(q)) {
      const hit = await lookupPincode(q)
      if (mine !== seq.current) return
      setBusy(false)
      if (hit.status === 'served') {
        setResults([]); setMiss(null)
        onPick(hit)
        setQuery('')
        return
      }
      setResults([])
      setMiss(hit)
      return
    }

    /* Areas first, and they land immediately — the served set is held in
     * memory (see pincodeDirectory), so this is a filter and not a
     * request. */
    const areas = (await searchAreas(q, 6)).map(a => ({ ...a, kind: 'area' }))
    if (mine !== seq.current) return

    if (areas.length) {
      setResults(areas)
      setMiss(null)
      setCursor(-1)
      setBusy(false)
      return
    }

    /* Only when the areas found nothing do we ask a geocoder, and that
     * ordering is a measurement rather than a preference.
     *
     * OSM's coverage of the venues this market actually books is thin.
     * Searched inside Bengaluru: "Sri Krishna Kalyana Mantapa" — a real
     * hall — returns NOTHING; "Phoenix Marketcity" returns the Starbucks
     * inside it rather than the mall; "kalyana mantapa" returns four
     * halls literally named "Kalyana Mantapa", because that is how they
     * are tagged. It is worth having as a long shot and it cannot be the
     * path a customer is expected to use.
     *
     * Running it only as a fallback also keeps us inside Nominatim's
     * usage policy, which discourages autocomplete against their donated
     * servers — most keystrokes now never reach them at all.
     *
     * The reliable answer for a venue remains the one below the box: the
     * customer TYPES the hall's name as free text and picks the area.
     * Nothing has to geocode a mantapa for that to work, and migration
     * 068 withholds the exact address until after payment anyway.
     *
     * Swap `fetchPlaces` for Ola Maps or MapmyIndia before volume — both
     * index Indian community halls far better than OSM, and both permit
     * storing the result. Nothing else in this file changes. */
    const venues = await searchVenues(q, 4)
    if (mine !== seq.current) return
    setBusy(false)
    setResults(venues)
    setMiss(venues.length ? null : { status: 'no_match' })
    setCursor(-1)
  }, [onPick])

  function onType(next) {
    setQuery(next)
    setMiss(null)
    clearTimeout(timer.current)
    // 250ms. The old autocomplete used 450, which on a fast connection is
    // long enough to feel like the app is thinking about whether to help.
    timer.current = setTimeout(() => run(next), 250)
  }

  function onKeyDown(e) {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      choose(results[cursor])
    } else if (e.key === 'Escape') { setResults([]); setCursor(-1) }
  }

  function choose(row) {
    setResults([]); setMiss(null); setQuery(''); setCursor(-1)
    onPick(row)
  }

  /* ── Confirmed. The chip replaces the box, the way Porter shows a
        settled address — one glance says the app understood you. ────── */
  if (value?.pincode && value?.lat != null) {
    // White ground, not a green one. `forest` is scoped to /shop by the
    // palette comment in tailwind.config.js; forest-700 as a success INK
    // has precedent in this flow, a forest SURFACE here would not.
    return (
      <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-forest-300/60">
        <Check size={16} className="shrink-0 text-forest-700" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-extrabold text-ink">{value.area}</span>
          <span className="block text-[11.5px] font-semibold text-ink-mute">
            {value.pincode}{value.district ? ` · ${value.district}` : ''}
          </span>
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Change location"
          className="shrink-0 rounded-full p-1.5 text-ink-mute transition hover:bg-ink/[0.06] hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  const showList = results.length > 0

  return (
    <div className="mt-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => onType(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls="where-results"
          aria-autocomplete="list"
          autoComplete="off"
          // Not `type="number"` and not `inputMode="numeric"`: this box
          // takes "Koramangala" as readily as 560034, so forcing a numeric
          // keypad would break the input it is mainly there for.
          placeholder="Venue, landmark, area or pincode"
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-9 text-[15px] font-bold text-ink ring-1 ring-ink/[0.1] placeholder:font-semibold placeholder:text-ink-mute/60 focus:outline-none focus:ring-2 focus:ring-saffron-400"
        />
        {busy && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-ink-mute" />
        )}
      </div>

      {showList && (
        <ul
          id="where-results"
          role="listbox"
          className="mt-1.5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.1]"
        >
          {results.map((r, i) => {
            const venue = r.kind === 'venue'
            // A one-line header the first time each kind appears. Two
            // labelled groups read as one list with structure; the same
            // rows unlabelled read as a jumble where a hall and a
            // postcode look like the same kind of thing.
            const firstOfKind = i === 0 || results[i - 1].kind !== r.kind

            return (
              <li key={venue ? `v:${r.venueName}` : `a:${r.pincode}`} role="option" aria-selected={i === cursor}>
                {firstOfKind && (
                  <p className="bg-ink/[0.02] px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">
                    {venue ? 'Halls, venues & landmarks' : 'Areas'}
                  </p>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(r)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition ${
                    i === cursor ? 'bg-saffron-50' : 'bg-white'
                  }`}
                >
                  {venue
                    ? <Building2 size={14} className="shrink-0 text-ink-mute" />
                    : <MapPin size={14} className="shrink-0 text-ink-mute" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-ink">
                      {venue ? r.venueName : r.area}
                    </span>
                    {venue && (
                      <span className="block truncate text-[11px] font-semibold text-ink-mute">
                        {r.area}{r.context ? ` · ${r.context}` : ''}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink-mute">
                    {r.pincode}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Three dead ends, three sentences. Only one of them is the
          customer's mistake, and saying so is the whole point. */}
      {miss?.status === 'not_served' && (
        <p className="mt-2 text-[12px] leading-snug text-amber-700">
          <span className="font-extrabold">{miss.area ?? miss.pincode}</span> — not somewhere we
          reach yet. We have noted it; you will hear from us the day we do.
        </p>
      )}
      {miss?.status === 'unknown' && (
        <p className="mt-2 text-[12px] leading-snug text-amber-700">
          We cannot find the pincode {miss.pincode}. Worth a second look at those six digits.
        </p>
      )}
      {miss?.status === 'no_match' && (
        <p className="mt-2 text-[12px] leading-snug text-ink-mute">
          Nothing by that name in the areas we cover. Try the pincode.
        </p>
      )}
      {!miss && !showList && (
        <p className="mt-2 text-[11.5px] text-ink-mute">
          Name the hall, the layout, or the area. A pincode works too.
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   The step
   ══════════════════════════════════════════════════════════════════════ */

export default function WhereStep({ value, onChange, savedAddress }) {
  const kind = value?.kind ?? (savedAddress ? 'home' : null)

  const set = patch => onChange({ ...(value ?? {}), ...patch })

  // Resolving a place and clearing one are the two things every input
  // path ends at, so they are defined once rather than per branch.
  const pick = useCallback(p => set(placePatch(p)), [value])
  const clear = useCallback(
    () => set({ pincode: '', area: null, district: null, lat: null, lng: null, status: null }),
    [value],
  )

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
                // Carry a saved address straight through, coordinate and
                // all, so the common case needs no typing at all.
                ...(opt.id === 'home' && savedAddress && !value?.pincode
                  ? {
                      pincode: savedAddress.pincode,
                      area: savedAddress.area,
                      lat: savedAddress.lat ?? null,
                      lng: savedAddress.lng ?? null,
                      status: savedAddress.lat != null ? 'served' : null,
                    }
                  : {}),
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
                  {savedHere ? `${savedAddress.area} · ${savedAddress.pincode}` : opt.hint}
                </span>
              </span>
            </button>

            {/* Expands in place rather than pushing to another screen —
                the whole question stays visible while it is answered. */}
            {on && opt.id !== 'undecided' && (
              <div className="px-4 pb-4">
                {/* GPS on the home branch only. See the header — on the
                    venue branch it answers the wrong question. */}
                {opt.id === 'home' && !value?.lat && (
                  <>
                    <UseMyLocation onResolved={pick} />
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-ink/[0.08]" />
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-ink-mute">or</span>
                      <span className="h-px flex-1 bg-ink/[0.08]" />
                    </div>
                  </>
                )}

                <PlaceSearch
                  value={value}
                  onPick={pick}
                  onClear={clear}
                  autoFocus={opt.id === 'venue' && !value?.pincode}
                />

                {opt.id === 'home' && value?.lat != null && (
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12px] font-bold text-ink-soft">
                    <input
                      type="checkbox"
                      checked={!!value?.save}
                      onChange={e => set({ save: e.target.checked })}
                      className="h-4 w-4 rounded accent-saffron-400"
                    />
                    Save as my address
                  </label>
                )}

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
