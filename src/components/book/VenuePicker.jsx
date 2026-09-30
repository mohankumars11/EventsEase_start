import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Users, Snowflake, MapPin, Loader2, Check, ArrowRight } from 'lucide-react'
import { availableVenues, alternativesFor, VENUE_KINDS, KIND_LABEL, SESSIONS } from '../../lib/venues'

/**
 * Every hall in Bengaluru, and whether it is free on your date.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO RADIUS. THAT IS THE WHOLE POINT OF THIS SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every other service in this app is matched inside a radius, because a
 * decorator will not drive 30 km to hang balloons and should not be asked
 * to. A venue is the exact opposite: it is the one thing people
 * deliberately travel across the city for. Somebody in Indiranagar will
 * book a hall in Yelahanka for their daughter's wedding without
 * hesitating, and hiding it behind a 10 km circle makes every hall they
 * would have chosen invisible.
 *
 * So `venues_available()` takes no point and no radius, and this screen
 * offers no distance control. There is nothing to configure, which is
 * the correct amount.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE AVAILABILITY IS LIVE, NOT A NIGHTLY EXPORT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The green and grey badges read `venue_slots` — the same rows a venue
 * manager writes by tapping a date in the partner app. There is no sync
 * job between the two, so they cannot drift. A hall closed a minute ago
 * is closed here on the next read.
 *
 * ── A taken hall is not a dead end ──────────────────────────────────
 * `venue_alternatives()` returns the nearest comparable halls that ARE
 * free, ordered by distance from the one that is not — because somebody
 * who picked Jayanagar wants Jayanagar, not the cheapest room in the
 * city. Showing "unavailable" and stopping is where a booking is lost.
 */

export default function VenuePicker({ date, guests = 0, value, onPick }) {
  const [session, setSession] = useState('full_day')
  const [kind, setKind] = useState(null)
  const [rows, setRows] = useState(null)
  const [alts, setAlts] = useState({})

  const read = useCallback(async () => {
    if (!date) return
    setRows(null)
    try {
      setRows(await availableVenues({
        date, session,
        /* The guest count is already known by this point in the flow, so
           a hall that cannot hold the party is filtered out rather than
           shown and then refused at checkout. */
        minCapacity: guests || 0,
        kinds: kind ? [kind] : null,
      }))
    } catch {
      setRows([])
    }
  }, [date, session, guests, kind])

  useEffect(() => { read() }, [read])

  /* Only fetched for the ones that are actually taken, and only once. A
     list of forty halls should not fire forty alternative queries for the
     thirty-eight that are free. */
  async function loadAlternatives(spaceId) {
    if (alts[spaceId]) return
    /* Awaited first, then set. The updater passed to a setter is not an
       async function, so awaiting inside it is a build error rather than
       a runtime one -- which is the good kind, but only if something
       actually compiles the file. */
    let found = []
    try { found = await alternativesFor(spaceId, date, session) } catch { found = [] }
    setAlts(a => ({ ...a, [spaceId]: found }))
  }

  const free = useMemo(() => (rows ?? []).filter(r => r.is_free), [rows])
  const taken = useMemo(() => (rows ?? []).filter(r => !r.is_free), [rows])

  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-2xl ring-1 ring-ink/[0.08]">
        {SESSIONS.map(s => (
          <button
            key={s.id} type="button" onClick={() => setSession(s.id)}
            className={`flex-1 py-2.5 text-[12.5px] font-extrabold transition ${
              session === s.id ? 'bg-plum-950 text-white' : 'bg-white text-ink-mute'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Kind, as a scrolling rail. No distance filter anywhere on this
          screen -- see the header. */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip on={!kind} onClick={() => setKind(null)}>All</Chip>
        {VENUE_KINDS.map(k => (
          <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>
        ))}
      </div>

      {rows === null && (
        <p className="flex items-center justify-center gap-2 rounded-[20px] bg-white p-6 text-[13px] text-ink-mute ring-1 ring-ink/[0.06]">
          <Loader2 size={14} className="animate-spin" /> Looking across Bengaluru…
        </p>
      )}

      {rows?.length === 0 && (
        <p className="rounded-[20px] bg-ink/[0.02] p-5 text-center text-[13px] leading-relaxed text-ink-mute">
          No halls listed for this yet. We are signing venues across
          Bengaluru now — tell us the area you want and we will find one.
        </p>
      )}

      {free.map(r => (
        <VenueCard key={r.space_id} row={r} picked={value === r.space_id} onPick={onPick} />
      ))}

      {taken.length > 0 && (
        <>
          <p className="pt-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
            Taken on this date
          </p>
          {taken.map(r => (
            <div key={r.space_id} className="rounded-[20px] bg-ink/[0.02] p-4 ring-1 ring-ink/[0.05]">
              <div className="flex items-start gap-3 opacity-70">
                <Building2 size={17} className="mt-0.5 shrink-0 text-ink-mute" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold text-ink">{r.venue_name}</span>
                  <span className="block text-[12px] text-ink-mute">
                    {[r.space_name, r.area_label].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadAlternatives(r.space_id)}
                className="mt-2.5 text-[12.5px] font-extrabold text-plum-700 underline-offset-2 hover:underline"
              >
                {alts[r.space_id] ? 'Nearby and free:' : 'Show me something like this'}
              </button>
              {alts[r.space_id]?.map(a => (
                <button
                  key={a.space_id}
                  type="button"
                  onClick={() => onPick?.(a.space_id, a)}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-xl bg-white p-2.5 text-left ring-1 ring-ink/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold text-ink">{a.venue_name}</span>
                    <span className="block text-[11.5px] text-ink-mute">
                      {a.area_label} · {(a.distance_m / 1000).toFixed(1)} km away
                    </span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-ink-mute" />
                </button>
              ))}
              {alts[r.space_id]?.length === 0 && (
                <p className="mt-1.5 text-[12px] text-ink-mute">
                  Nothing comparable free nearby that day.
                </p>
              )}
            </div>
          ))}
        </>
      )}

      {rows?.length > 0 && (
        /* ODbL: storing and showing OSM data is permitted, and saying so
           is the condition of that permission. */
        <p className="pt-1 text-center text-[11px] text-ink-mute">
          Some venue details from OpenStreetMap contributors.
        </p>
      )}
    </div>
  )
}

function VenueCard({ row, picked, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick?.(row.space_id, row)}
      className={`flex w-full items-start gap-3 rounded-[20px] bg-white p-4 text-left ring-1 transition active:scale-[0.995] ${
        picked ? 'ring-2 ring-saffron-400' : 'ring-ink/[0.06]'
      }`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
        {picked ? <Check size={16} /> : <Building2 size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-extrabold leading-tight text-ink">{row.venue_name}</span>
        <span className="block text-[12px] text-ink-mute">
          {[row.space_name, KIND_LABEL[row.venue_kind]].filter(Boolean).join(' · ')}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-soft">
          {row.area_label && (
            <span className="inline-flex items-center gap-1"><MapPin size={12} /> {row.area_label}</span>
          )}
          {row.floating_capacity != null && (
            <span className="inline-flex items-center gap-1"><Users size={12} /> up to {row.floating_capacity}</span>
          )}
          {row.is_ac && (
            <span className="inline-flex items-center gap-1"><Snowflake size={12} /> AC</span>
          )}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-extrabold text-forest-700">
        Free
      </span>
    </button>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-extrabold transition ${
        on ? 'bg-plum-950 text-white' : 'bg-white text-ink-mute ring-1 ring-ink/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}
