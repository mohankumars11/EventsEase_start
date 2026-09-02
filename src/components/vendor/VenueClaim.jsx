import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Plus, Building2, Loader2, Check } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { VENUE_KINDS, searchUnclaimed, claimVenue, proposeVenue } from '../../lib/venues'

/**
 * How a venue manager tells us which building is theirs.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A TEXT BOX
 * ══════════════════════════════════════════════════════════════════════
 *
 * A free-text venue name produces "Taj West End", "The Taj West End" and
 * "taj west end blr" as three different venues. That is not untidy, it is
 * fatal: the customer app reads a venue's live calendar by id, so three
 * rows for one building means three calendars for one hall, and the two
 * nobody is updating both say "free".
 *
 * The same mistake already exists one table over. A real partner on this
 * platform has a `vendor_services` row reading "videpgraphy" — one
 * transposed letter — and it has never been offered a single job, because
 * dispatch joins on the trade and nothing matched. Nobody told them,
 * because nothing could.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ROUTES, IN ORDER OF HOW CLEAN THE DATA IS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1  CLAIM     type-ahead over the 273 halls seeded from OSM. One tap,
 *                no typing, no possible duplicate.
 *   2  PROPOSE   for the ones OSM has never heard of — which is a great
 *                many kalyana mantapas. Structured: a kind from a list, an
 *                area from a list, and a position.
 *   3  REVIEW    a person checks it before it goes live.
 *
 * Route 2 is not a fallback bolted on for completeness. OSM is thin on
 * exactly the venues this market cares most about, so it is roughly half
 * the supply, and a manager who cannot find their hall in a list that
 * claims to be complete concludes the app is broken rather than that the
 * list is short.
 */

export default function VenueClaim({ vendorId, onDone }) {
  const toast = useToast()
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(null)
  const [adding, setAdding] = useState(false)
  const timer = useRef(null)

  /* Debounced, because this fires per keystroke against a table with 273
     rows and no reason to hit it eight times while somebody types
     "Sapthagiri". */
  useEffect(() => {
    clearTimeout(timer.current)
    if (term.trim().length < 2) { setHits([]); return }
    setSearching(true)
    timer.current = setTimeout(async () => {
      try { setHits(await searchUnclaimed(term)) }
      catch { setHits([]) }
      finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(timer.current)
  }, [term])

  async function claim(v) {
    setBusy(v.id)
    try {
      await claimVenue(vendorId, v.id)
      toast.success(`${v.name} is yours. Add your halls next.`)
      onDone?.()
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  if (adding) {
    return <ProposeVenue vendorId={vendorId} name={term} onCancel={() => setAdding(false)} onDone={onDone} />
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[15px] font-extrabold text-ink">Which venue is yours?</h3>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
          Search for it by name. Tap it and the calendar becomes yours to manage.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Sapthagiri Convention Hall"
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-10 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-ink-mute" />
        )}
      </div>

      {hits.map(v => (
        <button
          key={v.id}
          type="button"
          onClick={() => claim(v)}
          disabled={busy === v.id}
          className="flex w-full items-center gap-3 rounded-[18px] bg-white p-3.5 text-left ring-1 ring-ink/[0.06] transition active:scale-[0.99] disabled:opacity-60"
        >
          <Building2 size={17} className="shrink-0 text-ink-mute" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-extrabold text-ink">{v.name}</span>
            <span className="block text-[12px] text-ink-mute">
              {[v.area_label, v.pincode].filter(Boolean).join(' · ') || 'Bengaluru'}
            </span>
          </span>
          {busy === v.id
            ? <Loader2 size={16} className="shrink-0 animate-spin text-ink-mute" />
            : <Check size={16} className="shrink-0 text-forest-600" />}
        </button>
      ))}

      {/* Offered whenever they have typed something and it is not there.
          Not hidden behind "no results", because the honest state is
          "our list is incomplete", not "your venue does not exist". */}
      {term.trim().length >= 2 && !searching && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-3 rounded-[18px] bg-saffron-400/12 p-3.5 text-left ring-1 ring-saffron-300/60 transition active:scale-[0.99]"
        >
          <Plus size={17} className="shrink-0 text-saffron-800" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold text-ink">
              {hits.length ? 'Not one of these? Add your venue' : `Add “${term.trim()}”`}
            </span>
            <span className="block text-[12px] leading-snug text-ink-soft">
              We check it and turn it on, usually the same day.
            </span>
          </span>
        </button>
      )}

      {term.trim().length < 2 && (
        <p className="rounded-[18px] bg-ink/[0.02] p-4 text-center text-[12.5px] leading-relaxed text-ink-mute">
          Start typing your hall’s name.
          {/* ODbL. Storing and showing OSM data is permitted; saying where
              it came from is the condition of that permission. */}
          <span className="mt-1.5 block text-[11px]">
            Venue list from OpenStreetMap contributors.
          </span>
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function ProposeVenue({ vendorId, name: initial, onCancel, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: initial?.trim() ?? '',
    venue_kind: 'mantapa',
    area_label: '',
    pincode: '',
    address_line: '',
  })
  const [pin, setPin] = useState(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* Standing at the venue is the easiest way to get its coordinates right,
     and a venue manager filling this in is very often standing in it. The
     area dropdown is the fallback and its centroid is a rough answer —
     good enough to appear in a city-wide list, not good enough to route a
     decorator to. */
  function useMyLocation() {
    if (!navigator.geolocation) { toast.error('This device cannot share a location.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      p => { setPin({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false) },
      () => { toast.error('Could not get your location. Pick the area instead.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Your venue needs a name.'); return }
    if (!form.area_label && !pin) { toast.error('Pick the area, or share your location.'); return }

    const area = BENGALURU_AREAS.find(a => a.name === form.area_label)
    const at = pin ?? (area ? { lat: area.lat, lng: area.lng } : null)

    setBusy(true)
    try {
      await proposeVenue(vendorId, { ...form, lat: at?.lat, lng: at?.lng })
      toast.success('Sent for checking. We will turn it on shortly.')
      onDone?.()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <h3 className="text-[15px] font-extrabold text-ink">Add your venue</h3>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
          Somebody at Sambramo reads every one of these. Usually the same day.
        </p>
      </div>

      <Field label="Venue name">
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Sri Lakshmi Kalyana Mantapa"
          className="w-full rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </Field>

      {/* Picked, never typed — the same rule the service catalogue follows,
          because `venue_kind` is what a customer filters on. */}
      <Field label="What kind of place is it?">
        <div className="grid grid-cols-2 gap-2">
          {VENUE_KINDS.map(k => {
            const on = form.venue_kind === k.id
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => set('venue_kind', k.id)}
                className={`rounded-2xl p-3 text-left ring-1 transition ${
                  on ? 'bg-saffron-400/15 ring-saffron-400' : 'bg-white ring-ink/[0.07]'
                }`}
              >
                <span className="block text-[13px] font-extrabold text-ink">{k.label}</span>
                <span className="block text-[11px] leading-snug text-ink-mute">{k.scan}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Which area?">
        <select
          value={form.area_label}
          onChange={e => set('area_label', e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08]"
        >
          <option value="">Pick the nearest area</option>
          {BENGALURU_AREAS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </Field>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className={`flex w-full items-center gap-2.5 rounded-2xl p-3.5 text-left ring-1 transition ${
          pin ? 'bg-forest-50 ring-forest-200' : 'bg-white ring-ink/[0.08]'
        }`}
      >
        {locating
          ? <Loader2 size={16} className="shrink-0 animate-spin text-ink-mute" />
          : <MapPin size={16} className={`shrink-0 ${pin ? 'text-forest-700' : 'text-ink-mute'}`} />}
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold text-ink">
            {pin ? 'Location captured' : 'Use my current location'}
          </span>
          <span className="block text-[11.5px] leading-snug text-ink-soft">
            {pin
              ? 'Much more accurate than the area alone.'
              : 'Best done standing at the venue. Optional.'}
          </span>
        </span>
      </button>

      <Field label="Pincode (optional)">
        <input
          value={form.pincode}
          onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="560034"
          className="w-full rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="button" onClick={onCancel}
          className="flex-1 rounded-2xl bg-white py-3 text-[13.5px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08]"
        >
          Back
        </button>
        <button
          type="submit" disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13.5px] font-extrabold text-plum-950 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Send for checking
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
        {label}
      </span>
      {children}
    </label>
  )
}
