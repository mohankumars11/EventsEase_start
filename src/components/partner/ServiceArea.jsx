import { useState } from 'react'
import { MapPin, Navigation, Loader2, Check } from 'lucide-react'
import { currentPosition } from '../../lib/pincodeDirectory'
import { CITIES } from '../../config/cities'

/**
 * How far you will travel, and from where.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RADIUS IS A DISPATCH RULE, NOT A PREFERENCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `match_partners` tests `ST_DWithin(v.location, p_point,
 * v.service_radius_km * 1000)` — the partner's own reach, measured from
 * their base. Dragging this slider down by ten kilometres removes them
 * from every booking in that ring, immediately and silently.
 *
 * So the screen says what the number does in the partner's terms, and
 * the slider is not the only control: the presets are there because a
 * continuous slider invites a nudge, and a nudge here costs work.
 *
 * ══════════════════════════════════════════════════════════════════════
 * CITIES ARE SHOWN, NOT CHOSEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design has a "Cities you serve" field with chips a
 * partner adds and removes, including Mysuru and Tumakuru. Sambramo does
 * not dispatch in those cities — migration 121 gates the whole product
 * to the market that is open, and `match_partners` matches on distance
 * from a point rather than on a list of city names.
 *
 * A chip a partner can add that changes nothing is worse than no chip:
 * they would add Mysuru, wait for Mysuru work, and conclude the platform
 * is broken. So the cities are derived from the radius and shown as a
 * consequence of it, with the ones we have not opened named as such.
 */

const PRESETS = [10, 25, 50, 100]

export default function ServiceArea({ vendor, onSave, onOpenLocation }) {
  const [km, setKm] = useState(vendor?.service_radius_km ?? 25)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)

  const base = [vendor?.area, vendor?.city].filter(Boolean).join(', ')

  /* ── Which markets fall inside the ring ────────────────────────────
     There is no `lat` or `lng` on `vendors` — 057 stores a PostGIS
     `location` and nothing else, which is the column match_partners
     measures from. So the point is read out of that, and a row whose
     location has never been set simply has no reach to show rather
     than being placed at 0,0 in the Gulf of Guinea.

     Great-circle to each city's centre, which is the same arithmetic
     the dispatch radius uses, so this list cannot promise reach the
     matcher will not honour. */
  const here = readPoint(vendor?.location)
  const reach = here ? CITIES.filter(c => {
    const cc = c.coords
    if (!cc?.lat || !cc?.lon) return false
    return haversineKm(here.lat, here.lng, cc.lat, cc.lon) <= km
  }) : []

  async function locate() {
    setLocating(true); setError(null)
    const pos = await currentPosition({ timeout: 10000 })
    setLocating(false)
    if (pos.status !== 'ok') {
      setError(pos.status === 'denied'
        ? 'Location permission is off. Turn it on in your phone settings.'
        : 'We could not read your location just now.')
      return
    }
    onOpenLocation?.(pos)
  }

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    try {
      await onSave?.({ service_radius_km: Math.min(200, Math.max(1, Number(km) || 10)) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      setError(err?.message ?? 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3.5">
      {/* ── Where you are ─────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute">
          You travel from
        </p>
        <p className="mt-1 flex items-start gap-2 text-[14px] font-extrabold text-ink">
          <MapPin size={15} className="mt-0.5 shrink-0 text-plum-600" />
          {base || 'Not set yet'}
        </p>
        <button
          type="button" onClick={locate} disabled={locating}
          className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-plum-50 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200 disabled:opacity-50"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
          Use my current location
        </button>
      </div>

      {/* ── The ring ───────────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute">
            How far you will go
          </p>
          <p className="font-serif text-[22px] font-extrabold leading-none tabular-nums text-ink">
            {km} km
          </p>
        </div>

        {/* A drawn ring rather than a street map. What matters is the
            relationship between the base and the distance, and that is
            exactly what a circle shows — without a tile provider, an
            API key, or a library on a bundle already over 700 KB. */}
        <div className="relative mt-3 flex h-36 items-center justify-center overflow-hidden rounded-[16px] bg-plum-950">
          <span
            className="absolute rounded-full bg-plum-400/20 ring-1 ring-plum-300/40 transition-all duration-500"
            style={{ width: `${ringPct(km)}%`, aspectRatio: '1' }}
          />
          <span className="relative flex flex-col items-center gap-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-400 text-plum-950">
              <MapPin size={15} />
            </span>
            <span className="text-[10.5px] font-extrabold text-white/80">
              {vendor?.area ?? vendor?.city ?? 'You'}
            </span>
          </span>
        </div>

        <input
          type="range" min={1} max={100} step={1} value={km}
          onChange={e => setKm(Number(e.target.value))}
          aria-label="Service radius in kilometres"
          className="mt-3 w-full accent-plum-600"
        />
        <div className="mt-2 flex gap-2">
          {PRESETS.map(p => (
            <button
              key={p} type="button" onClick={() => setKm(p)}
              aria-pressed={km === p}
              className={`min-h-[34px] flex-1 rounded-full text-[12px] font-extrabold ring-1 ${
                km === p ? 'bg-plum-700 text-white ring-plum-700'
                         : 'bg-white text-ink-soft ring-ink/[0.12]'}`}
            >
              {p} km
            </button>
          ))}
        </div>

        <p className="mt-2.5 text-[11.5px] leading-snug text-ink-mute">
          Jobs further than this are never offered to you. Lowering it takes
          effect on the next booking, not on jobs you have already accepted.
        </p>
      </div>

      {/* ── What that reaches ──────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute">
          Places this covers
        </p>
        {reach.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reach.map(c => (
              <span key={c.name}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ring-1 ${
                      c.live ? 'bg-forest-50 text-forest-800 ring-forest-200'
                             : 'bg-ink/[0.04] text-ink-mute ring-ink/[0.08]'}`}>
                {c.name}{c.live ? '' : ' · not open yet'}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-mute">
            {here
              ? 'No Sambramo city is inside this radius yet.'
              : 'Set where you travel from and we will show what it covers.'}
          </p>
        )}
        <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
          Worked out from your location and the distance above &mdash; you do not
          pick these, and we cannot send you work in a city we have not opened.
        </p>
      </div>

      {error && <p className="text-[12px] font-semibold text-rose-700">{error}</p>}

      <button
        type="button" onClick={save} disabled={busy}
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 text-[15px] font-extrabold text-white disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin" />
          : saved ? <Check size={16} /> : null}
        {saved ? 'Saved' : 'Save service area'}
      </button>
    </div>
  )
}

/* The drawn ring maxes out well before the slider does, so 100 km does
   not render as a circle larger than the box. Square-rooted because area
   reads as size to the eye, not radius. */
function ringPct(km) {
  return Math.min(96, 24 + Math.sqrt(Math.min(km, 100)) * 7.5)
}

/* PostgREST returns a geography column as GeoJSON. Anything else — a
   WKB hex string from a server not configured to emit it — returns null
   rather than being half-parsed into a point in the wrong hemisphere. */
function readPoint(geo) {
  if (geo && typeof geo === 'object' && Array.isArray(geo.coordinates)) {
    const [lng, lat] = geo.coordinates
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }
  return null
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
