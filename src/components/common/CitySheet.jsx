import { useState, useEffect, useMemo, useRef } from 'react'
import { X, MapPin, LocateFixed, Loader2, Check, Search, Sparkles, Store } from 'lucide-react'
import { useCity } from '../../context/CityContext'
import CityInterestForm from './CityInterestForm'

/**
 * The city picker — one sheet, raised from anywhere, deciding the one thing
 * the whole app is a function of.
 *
 * ── Why it looks the same on both canvases ─────────────────────────────
 * Home is plum night, the storefront is forest green, and that split is
 * deliberate — you should know which half of Sambramo you are in before you
 * read a word. This sheet refuses to take on either. It is system chrome, not
 * page content: the same control, in the same colours, whichever surface
 * raised it. Tinting it per surface would turn one component into two and
 * quietly teach that changing your city on the shop is a different act from
 * changing it on home. It is the same act.
 *
 * The header band is plum because plum is the brand's primary — so the sheet
 * reads as Sambramo's own furniture on the green canvas too, rather than as a
 * borrowed browser dialog.
 *
 * ── Why a city we don't serve is still selectable ──────────────────────
 * Refusing the selection is the obvious move and the wrong one. Someone
 * typing "Hyderabad" is telling us something worth more than a validation
 * error, and the app already has the table to record it (city_interest_requests,
 * migration 020) and the component to collect it. So the choice is accepted,
 * the app says plainly that it cannot serve there yet, and the notify-me form
 * is right there. A refusal ends the session; this one turns it into a lead.
 *
 * ── Why "use my location" proposes rather than applies ─────────────────
 * It resolves to the *nearest* live city, so somebody in Tumkur is offered
 * Bengaluru instead of being told their town is unsupported. But it stops
 * there and shows what it found: silently relocating a customer because their
 * browser reported a coordinate is how an order goes to the wrong city.
 */
export default function CitySheet() {
  const { city, cities, pickerOpen, closeCityPicker, setCity, detectCity } = useCity()

  const [query, setQuery] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const panelRef = useRef(null)

  // Escape closes, and the sheet owns the page's scroll while open — the same
  // contract ProductCustomizeSheet uses, so the two behave identically.
  useEffect(() => {
    if (!pickerOpen) return
    const onKey = e => { if (e.key === 'Escape') closeCityPicker() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [pickerOpen, closeCityPicker])

  // Reset per opening. A sheet that reopens still showing last time's search
  // term and a stale "we found you in Mysore" banner is describing a moment
  // that has passed.
  useEffect(() => {
    if (pickerOpen) {
      setQuery('')
      setDetectError(null)
      setSuggestion(null)
    }
  }, [pickerOpen])

  // Focus lands on the panel, not the search field: opening a keyboard over a
  // six-item list on a phone hides the very thing you came to tap. Typing is
  // for when the list grows.
  useEffect(() => {
    if (pickerOpen) panelRef.current?.focus()
  }, [pickerOpen])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return cities
    return cities.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q)) ||
      c.knownAreas.some(a => a.toLowerCase().includes(q))
    )
  }, [cities, q])

  /**
   * Live and not-yet, kept apart.
   *
   * cities.js carries a `live` flag — that is the whole reason LIVE_CITIES is
   * a filtered view rather than the list itself — so the config can name a
   * city before it opens. Rendering `matches` as one flat list ignored that
   * flag completely: the first announced-but-not-open city would have shown
   * up looking exactly as orderable as Bengaluru, chips and all, and picking
   * it would have set a delivery city we cannot deliver to.
   *
   * Today both cities are live, so this split renders identically. It is here
   * because the data model already permits the case, and a UI that silently
   * disagrees with its own schema is a bug waiting for a config change.
   */
  const liveMatches = matches.filter(c => c.live)
  const upcomingMatches = matches.filter(c => !c.live)

  // What the customer typed, when it isn't one of ours. Drives the "we're not
  // there yet — tell us" branch below.
  const typedUnservedCity = q && matches.length === 0 ? query.trim() : null

  async function runDetect() {
    setDetecting(true)
    setDetectError(null)
    setSuggestion(null)
    try {
      const found = await detectCity()
      if (found) setSuggestion(found)
      else setDetectError("We couldn't match your location to a city we serve.")
    } catch (err) {
      setDetectError(
        err?.code === 1
          ? 'Location access was denied — pick your city from the list instead.'
          : err?.message === 'unsupported'
            ? "This browser can't share your location — pick your city below."
            : "We couldn't get your location — pick your city below."
      )
    } finally {
      setDetecting(false)
    }
  }

  if (!pickerOpen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={closeCityPicker}
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-sheet-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="animate-pop-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        {/* ── Header ─────────────────────────────────────────────────
            Plum, so the sheet is unmistakably Sambramo's on either canvas.
            The grab handle is mobile-only: on a phone this is a sheet you
            could swipe, on a desktop it is a dialog and the handle would be
            an affordance for a gesture that doesn't exist there. */}
        <div className="relative shrink-0 bg-gradient-to-br from-plum-700 via-plum-600 to-berry-600 px-5 pb-5 pt-3 text-white">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />

          <button
            onClick={closeCityPicker}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/20"
          >
            <X size={17} />
          </button>

          <h2 id="city-sheet-title" className="pr-10 text-lg font-extrabold leading-tight">
            Where are we celebrating?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/70">
            Your city sets what we can deliver, what it costs and who coordinates it.
          </p>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-plum-600" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="search"
              enterKeyHint="search"
              aria-label="Search for your city"
              placeholder="Search city or area…"
              className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm font-medium text-gray-900 outline-none ring-2 ring-transparent placeholder:text-gray-400 focus:ring-saffron-400"
            />
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">

          {/* Locate me. Hidden while searching — the two are alternative ways
              to answer the same question, and showing both mid-search adds a
              control that cannot help with what is being typed. */}
          {!q && (
            <>
              <button
                onClick={runDetect}
                disabled={detecting}
                className="flex w-full items-center gap-3 rounded-2xl border border-plum-100 bg-plum-50/70 px-4 py-3 text-left transition-colors hover:bg-plum-50 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-plum-600 ring-1 ring-plum-100">
                  {detecting ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-plum-900">
                    {detecting ? 'Finding you…' : 'Use my current location'}
                  </span>
                  <span className="block text-[11px] text-plum-700/70">
                    We'll match you to the nearest city we serve
                  </span>
                </span>
              </button>

              {detectError && (
                <p className="mt-2 text-xs text-crimson-700">{detectError}</p>
              )}

              {/* The proposal. Never auto-applied — the customer confirms. */}
              {suggestion && (
                <div className="animate-pop-in mt-2 flex items-center gap-3 rounded-2xl border border-saffron-200 bg-saffron-50 px-4 py-3">
                  <MapPin size={16} className="shrink-0 text-saffron-600" />
                  <p className="min-w-0 flex-1 text-xs text-gray-700">
                    Looks like you're near{' '}
                    <span className="font-bold text-gray-900">{suggestion.city.name}</span>
                    {suggestion.distance > 12 && (
                      <span className="text-gray-500"> — about {Math.round(suggestion.distance)} km away</span>
                    )}
                  </p>
                  <button
                    onClick={() => setCity(suggestion.city.name)}
                    className="shrink-0 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-plum-700"
                  >
                    Use it
                  </button>
                </div>
              )}

              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Live now
              </p>
            </>
          )}

          {/* Sits inside the scroll area rather than above it, so the two
              headings and the two lists share one flow. */}

          {/* ── The cities you can order in ──────────────────────── */}
          {q && liveMatches.length > 0 && (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Live now
            </p>
          )}
          <ul className="space-y-2">
            {liveMatches.map(c => (
              <li key={c.slug}>
                <CityCard city={c} selected={c.name === city} onSelect={() => setCity(c.name)} />
              </li>
            ))}
          </ul>

          {/* ── Announced, not yet open ──────────────────────────────
              Shown, because "we're coming to Hubli" is worth knowing and is
              the reason the config can name a city before it opens. Not
              selectable, because setting your delivery city to somewhere we
              cannot deliver helps nobody — the notify-me below is the useful
              action, and it is the same capture the rest of the app uses. */}
          {upcomingMatches.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Coming soon
              </p>
              <ul className="space-y-2">
                {upcomingMatches.map(c => (
                  <li key={c.slug} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
                        <MapPin size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-extrabold text-gray-700">{c.name}</span>
                          <span className="shrink-0 text-[11px] font-medium text-gray-400">{c.state}</span>
                        </p>
                        <p className="text-[11px] text-gray-500">{c.coverage}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <CityInterestForm city={c.name} source="city_sheet" locked />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* ── Somewhere else ──────────────────────────────────────
              Two entrances to the same capture. If they typed a city we
              don't serve, it is named back to them and pre-filled; if they
              are just browsing the list, it is an invitation at the bottom. */}
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4">
            {typedUnservedCity ? (
              <>
                <p className="text-sm font-bold text-gray-900">
                  We're not in {typedUnservedCity} yet.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  We're still in pilot launch and open cities one at a time, properly.
                  Put your name down and you'll be first to know.
                </p>
                <div className="mt-3">
                  <CityInterestForm city={typedUnservedCity} source="city_sheet" locked />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">Somewhere else?</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Tell us where you'd like Sambramo next — it's how we decide which city opens after these.
                </p>
                <div className="mt-3">
                  <CityInterestForm source="city_sheet" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * One city, as a choice.
 *
 * Extracted rather than inlined because the sheet renders two lists off the
 * same record shape, and a card duplicated per list is a card that drifts
 * between them.
 */
function CityCard({ city: c, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
        selected
          ? 'border-plum-300 bg-plum-50 ring-2 ring-plum-200'
          : 'border-gray-200 bg-white hover:border-plum-200 hover:bg-plum-50/40'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        selected ? 'bg-plum-600 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {selected ? <Check size={18} strokeWidth={2.6} /> : <MapPin size={17} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-extrabold text-gray-900">{c.name}</span>
          <span className="shrink-0 text-[11px] font-medium text-gray-400">{c.state}</span>
        </span>

        {/* What actually runs here. Two chips beat a sentence: the question
            behind "which city" is usually "can I get the thing I came for",
            and both halves of the business are named rather than implied. */}
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {c.offerings.includes('concierge') && (
            <span className="inline-flex items-center gap-1 rounded-full bg-plum-100 px-2 py-0.5 text-[10px] font-bold text-plum-700">
              <Sparkles size={9} /> Celebrations
            </span>
          )}
          {c.offerings.includes('shop') && (
            <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-bold text-forest-700">
              <Store size={9} /> Shop delivery
            </span>
          )}
        </span>

        {/* Areas, only for the city you're on. Six locality names under every
            card is a wall of grey type; under the one you just picked it is
            the reassurance you were looking for. */}
        {selected && (
          <span className="mt-2 block text-[11px] leading-relaxed text-plum-700/80">
            {c.coverage}{' '}
            <span className="text-plum-600/60">
              {c.knownAreas.slice(0, 4).join(' · ')} and everywhere between.
            </span>
          </span>
        )}
      </span>
    </button>
  )
}
