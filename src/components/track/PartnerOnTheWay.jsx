import { useCallback, useEffect, useState } from 'react'
import { Navigation, Clock, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'
import { formatDistance, formatEta } from '../../lib/trackingDisplay'
import { initialsFor } from '../../lib/partnerAvatar'

/**
 * Your partner is on the way.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FILTER IS THE POLICY, NOT THE QUERY
 * ══════════════════════════════════════════════════════════════════════
 *
 * This asks for every row in `tracking_sessions` and gets back only the
 * customer's own live ones, because that is what migration 127's
 * "customer watches their own booking" policy allows: `status = 'active'`
 * AND a line on one of their requests.
 *
 * Written this way on purpose. A client-side `.eq('customer_id', …)`
 * would look safer and be worse — it would work identically on a
 * database with no policy at all, so it could never tell us whether the
 * policy was doing anything. If this list ever shows somebody else's
 * caterer, the database is wrong and we want to find that out here
 * rather than trust a filter we wrote ourselves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THERE IS NO ROUTE ON THIS SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * No trail, no breadcrumbs, no history — `tracking_location_events` has
 * no customer policy at all, so there is nothing to draw even if this
 * component asked. A customer is owed "where is my caterer now, and when
 * will they be here". They are not owed a map of everywhere that person
 * has been today, and the difference is the whole reason the current
 * position is denormalised onto the session row.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT DISAPPEARS WHEN IT STOPS BEING TRUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The policy only returns active sessions, so this renders nothing the
 * moment the partner arrives. No "arrived" state lingering on the page
 * for the rest of the day claiming to be live.
 */
export default function PartnerOnTheWay() {
  const [rows, setRows] = useState([])
  const [names, setNames] = useState({})

  const read = useCallback(async () => {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .select('id, vendor_id, line_id, mode, status, eta_at, distance_remaining_m, last_seen_at, geofence_entered_at')
      .order('started_at', { ascending: false })

    /* Absent until 127 is applied. Nothing on screen either way, so the
       error is swallowed rather than shown to a customer who can do
       nothing about it. */
    if (error) { setRows([]); return }
    const live = data ?? []
    setRows(live)

    const ids = [...new Set(live.map(r => r.vendor_id))]
    if (!ids.length) return
    const { data: vendors } = await supabase
      .from('vendors').select('id, business_name, avatar_url').in('id', ids)
    setNames(Object.fromEntries((vendors ?? []).map(v => [v.id, v])))
  }, [])

  useEffect(() => { read() }, [read])
  /* Ten seconds. The partner's phone pushes a batch every fifteen while
     moving, so polling faster would mostly re-read the same row, and
     slower would let a dot go visibly stale while somebody watches it. */
  useLivePoll(read, 10_000, [read])

  if (!rows.length) return null

  return (
    <div className="space-y-2.5">
      {rows.map(s => {
        const v = names[s.vendor_id]
        const name = v?.business_name ?? 'Your partner'
        const eta = formatEta(s.eta_at)
        const left = formatDistance(s.distance_remaining_m)
        const near = !!s.geofence_entered_at

        return (
          <div key={s.id} className="overflow-hidden rounded-[22px] bg-plum-950 text-white">
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-saffron-400 font-serif text-[15px] font-extrabold text-plum-950">
                {v?.avatar_url
                  ? <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initialsFor(name)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-forest-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-forest-400" />
                  {near ? 'Almost with you' : 'On the way'}
                </p>
                <p className="mt-0.5 truncate text-[15px] font-extrabold leading-tight">{name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10">
              <Stat icon={Clock} label="Arriving around" value={eta ?? 'Working it out'} />
              <Stat icon={Navigation} label="Distance away" value={left ?? '—'} />
            </div>

            {/* Said to the customer as well as to the partner. Somebody
                whose caterer is on a map should know the sharing is for
                this booking and ends with it — not least because it is
                the honest description of what the partner agreed to. */}
            <p className="flex items-start gap-2 px-4 py-3 text-[11px] leading-snug text-white/65">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              Their location is shared with you for this booking only, and stops
              when they arrive.
            </p>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-plum-950 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white/50">
        <Icon size={11} /> {label}
      </p>
      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums">{value}</p>
    </div>
  )
}
