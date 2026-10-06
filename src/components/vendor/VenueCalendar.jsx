import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Lock } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { slotsFor, setSlot, SESSIONS } from '../../lib/venues'

/**
 * The live calendar. This is the product.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A TAP HERE ACTUALLY DOES
 * ══════════════════════════════════════════════════════════════════════
 *
 * It writes one `venue_slots` row, and a customer browsing halls for that
 * date stops seeing this one. There is no sync job and no nightly export:
 * `venues_available()` reads the same table this writes, so the two cannot
 * drift.
 *
 * ══════════════════════════════════════════════════════════════════════
 * MORNING AND EVENING, NOT JUST DAYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A kalyana mantapa routinely runs a muhurta wedding in the morning and a
 * reception in the evening, and they are two bookings at two prices. A
 * day-granularity calendar refuses the second one — which is not a
 * missing feature, it is taking half of a Saturday's revenue off a venue
 * that was willing to list with us.
 *
 * `full_day` is not a third session sitting beside the other two. It is
 * both of them, and the overlap rule lives in `venue_space_free()` in SQL
 * so that this screen and the customer's search cannot disagree about
 * whether a hall is free.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BLOCKED IS THE ONLY THING A MANAGER MAY WRITE
 * ══════════════════════════════════════════════════════════════════════
 *
 * BOOKED means money is held against that date. A manager tapping a
 * square must never be able to un-sell somebody's wedding, so those cells
 * are locked here and RLS refuses the write regardless — the guard is in
 * the database, and this is only the part of it a person can see.
 */

const DAY = 86400000
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export default function VenueCalendar({ spaces }) {
  const toast = useToast()
  const active = useMemo(() => (spaces ?? []).filter(s => s.is_active), [spaces])
  const [spaceId, setSpaceId] = useState(active[0]?.id ?? null)
  const [session, setSession] = useState('full_day')
  const [monthStart, setMonthStart] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(null)

  useEffect(() => { if (!spaceId && active[0]) setSpaceId(active[0].id) }, [active, spaceId])

  const range = useMemo(() => {
    const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    return { from: iso(monthStart), to: iso(end), end }
  }, [monthStart])

  const read = useCallback(async () => {
    if (!spaceId) return
    setLoading(true)
    try { setSlots(await slotsFor(spaceId, range.from, range.to)) }
    catch (e) { toast.error(friendlyError(e)) }
    finally { setLoading(false) }
  }, [spaceId, range.from, range.to, toast])

  useEffect(() => { read() }, [read])

  /* What is on a given date, for the session being edited. `full_day`
     rows count against every session, which is the same rule SQL applies
     — repeated here only so the grid can be drawn before a round trip. */
  const byDate = useMemo(() => {
    const m = {}
    for (const s of slots) {
      if (s.session !== 'full_day' && session !== 'full_day' && s.session !== session) continue
      /* A booking outranks a block: if either exists the square is red,
         but only a block can be tapped away. */
      if (!m[s.slot_date] || s.status !== 'BLOCKED') m[s.slot_date] = s
    }
    return m
  }, [slots, session])

  async function toggle(dateISO) {
    const existing = byDate[dateISO]
    if (existing && existing.status !== 'BLOCKED') {
      toast.error('That one is booked. Talk to us if something has gone wrong.')
      return
    }
    setPending(dateISO)
    /* Optimistic, because a manager blocking six dates on a slow
       connection should not wait six times. The upsert is idempotent and
       the unique key makes it safe to fire in any order. */
    const blocking = !existing
    setSlots(prev => blocking
      ? [...prev, { id: `tmp-${dateISO}`, slot_date: dateISO, session, status: 'BLOCKED' }]
      : prev.filter(s => !(s.slot_date === dateISO && (s.session === session || session === 'full_day'))))
    try {
      await setSlot(spaceId, dateISO, session, blocking)
    } catch (e) {
      toast.error(friendlyError(e))
      await read()
    } finally {
      setPending(null)
    }
  }

  if (!active.length) {
    return (
      <p className="rounded-[18px] bg-ink/[0.02] p-4 text-center text-[12.5px] leading-relaxed text-ink-mute">
        Add a hall first. The calendar belongs to a hall, not to the venue —
        that is what lets you close one and keep the other open.
      </p>
    )
  }

  const first = new Date(monthStart)
  const lead = first.getDay()
  const days = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const today = iso(new Date())

  return (
    <div className="space-y-3">
      {/* Which hall. A select rather than pills: a convention centre can
          have eight, and eight pills wrap into a wall. */}
      {active.length > 1 && (
        <select
          value={spaceId ?? ''}
          onChange={e => setSpaceId(e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-2.5 text-[13.5px] font-extrabold text-ink ring-1 ring-ink/[0.08]"
        >
          {active.map(s => <option key={s.id} value={s.id}>{s.space_name}</option>)}
        </select>
      )}

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

      <div className="rounded-[20px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month"
                  onClick={() => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.04]">
            <ChevronLeft size={17} />
          </button>
          <span className="text-[13.5px] font-extrabold text-ink">
            {monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" aria-label="Next month"
                  onClick={() => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="rounded-full p-1.5 text-ink-mute hover:bg-ink/[0.04]">
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-7 gap-1 text-center text-[10.5px] font-extrabold uppercase text-ink-mute">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => <span key={`p${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)
            const key = iso(d)
            const slot = byDate[key]
            const past = key < today
            const booked = slot && slot.status !== 'BLOCKED'
            return (
              <button
                key={key}
                type="button"
                disabled={past || booked || pending === key}
                onClick={() => toggle(key)}
                aria-label={`${key} ${booked ? 'booked' : slot ? 'blocked' : 'open'}`}
                className={`relative aspect-square rounded-xl text-[12.5px] font-bold transition ${
                  past      ? 'text-ink-mute/40'
                  : booked  ? 'bg-rose-100 text-rose-800'
                  : slot    ? 'bg-ink/[0.10] text-ink-soft'
                            : 'bg-forest-50 text-forest-800 hover:bg-forest-100'
                }`}
              >
                {i + 1}
                {booked && <Lock size={9} className="absolute right-1 top-1 opacity-70" />}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/[0.06] pt-2.5 text-[11px] font-semibold text-ink-mute">
          <Key className="bg-forest-50" label="Open" />
          <Key className="bg-ink/[0.10]" label="You closed it" />
          <Key className="bg-rose-100" label="Booked" />
          {loading && <Loader2 size={12} className="ml-auto animate-spin" />}
        </div>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-ink-soft">
        Tap a date to close it. Customers stop seeing this hall for that
        {session === 'full_day' ? ' day' : ` ${session}`} straight away.
      </p>
    </div>
  )
}

function Key({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  )
}
