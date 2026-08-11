import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  CITIES, LIVE_CITIES, DEFAULT_CITY,
  findCity, normalizeCity, nearestLiveCity,
} from '../config/cities'

/**
 * Where the customer is — one answer, held once, read everywhere.
 *
 * The app is geographically bound: what it costs, who delivers it, which
 * coordinator picks up the phone and whether we can serve you at all are all
 * functions of the city. But there was no city *state*. `BRAND.primaryCity`
 * was printed into the home app bar and the shop app bar as a literal, the
 * home bar drew a ChevronDown beside it that belonged to no button, and the
 * first time anything asked where the customer actually was, it was the
 * address field at the end of checkout.
 *
 * The effect on a Mysore customer — a city we are live in — was that the app
 * told them "Bengaluru" on every screen, twice on the storefront, and then
 * validated their real address against a list they had never been shown.
 *
 * Three rules this context exists to hold:
 *
 *   1. The city is chosen, not assumed. Until someone picks, `chosen` is
 *      false and the UI says so ("Set your city") rather than asserting a
 *      city we guessed. An unanswered question should look unanswered.
 *   2. The choice survives. localStorage, so it outlives the tab, and it is
 *      deliberately not gated on auth — a guest browsing the shop is the
 *      exact person who needs the answer, and asking them to sign in first
 *      is the most expensive door in the funnel (the same reasoning the
 *      router already applies to the shop and the planner).
 *   3. A city we don't serve is a lead, not an error. Choosing one keeps the
 *      preference, flips `servable` to false, and hands the surface enough to
 *      offer the notify-me capture that already exists — rather than a dead
 *      end or a silent snap back to Bengaluru.
 *
 * Storage is versioned so the shape can change later without a stale object
 * from an old build crashing a returning customer's first paint.
 */

const STORAGE_KEY = 'sambramo_city_v1'

const CityContext = createContext(null)

/**
 * Read the saved preference.
 *
 * Anything unparseable, unrecognised or from an older shape is discarded
 * rather than repaired: the cost of getting this wrong is a customer being
 * quietly assigned a city they never picked, which is the bug this whole
 * context exists to remove.
 */
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.name || typeof parsed.name !== 'string') return null
    return { name: parsed.name, chosenAt: parsed.chosenAt ?? null }
  } catch {
    // Private mode, disabled storage, corrupt JSON. Not worth a crash —
    // the customer simply gets asked again.
    return null
  }
}

export function CityProvider({ children }) {
  const [stored, setStored] = useState(readStored)
  // The picker is opened from the app bars, from the shop's serviceability
  // strip and from the empty-state on a city we don't serve. Holding the
  // open/closed flag here rather than in each bar means one sheet exists at a
  // time and any surface can raise it without threading props through pages.
  const [pickerOpen, setPickerOpen] = useState(false)

  // Persist on change. Writing inside the setter would miss the case where
  // storage throws, leaving state and storage disagreeing.
  useEffect(() => {
    if (!stored) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      /* storage unavailable — the choice still holds for this session */
    }
  }, [stored])

  /**
   * Two browser tabs, one customer. Without this, changing the city in one
   * tab leaves the other quoting the old city's coverage until it reloads —
   * and "it said Mysore on the other tab" is a support ticket, not a bug
   * report anyone can act on.
   */
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return
      setStored(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setCity = useCallback(name => {
    const canonical = normalizeCity(name)
    if (!canonical) return
    setStored({ name: canonical, chosenAt: new Date().toISOString() })
    setPickerOpen(false)
  }, [])

  /**
   * Best-effort "where am I". Resolves to the nearest live city rather than
   * the literal geocoded one, so someone in Tumkur or Ramanagara is offered
   * Bengaluru — a useful answer — instead of being told their town is
   * unsupported, which is true but not actionable.
   *
   * Returns the match instead of applying it: the sheet shows what it found
   * and lets the customer confirm. Silently relocating someone because their
   * browser reported a coordinate is how you end up delivering to the wrong
   * city with a straight face.
   */
  const detectCity = useCallback(async () => {
    if (!navigator.geolocation) throw new Error('unsupported')
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,   // a city only needs ~km accuracy; high accuracy costs battery and seconds
        timeout: 10000,
        maximumAge: 600000,          // a ten-minute-old fix is fine for this question
      })
    })
    const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
    const nearest = nearestLiveCity(coords)
    return nearest ? { ...nearest, coords } : null
  }, [])

  const value = useMemo(() => {
    const name = stored?.name ?? DEFAULT_CITY.name
    const record = findCity(name)
    return {
      /** Canonical city name — always a string, safe to render. */
      city: name,
      /** The full record, or null when the customer named a city we don't serve. */
      cityRecord: record,
      /** Did the customer actually pick, or is this the fallback? */
      chosen: !!stored,
      /** Can we take an order here today? */
      servable: !!record?.live,
      /** Everything the picker lists. */
      cities: CITIES,
      liveCities: LIVE_CITIES,
      setCity,
      detectCity,
      pickerOpen,
      openCityPicker: () => setPickerOpen(true),
      closeCityPicker: () => setPickerOpen(false),
    }
  }, [stored, pickerOpen, setCity, detectCity])

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>
}

export function useCity() {
  const ctx = useContext(CityContext)
  if (!ctx) throw new Error('useCity must be used within a CityProvider')
  return ctx
}
