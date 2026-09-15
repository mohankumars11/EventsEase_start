import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Online.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT ACTUALLY STOPS THE WORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * This header shipped without this control, because until migration 126
 * there was no column behind it — and a toggle that changes nothing is
 * worse than no toggle. A partner who switches themselves offline and
 * keeps receiving offers has been told something false by the app, and
 * they will be right to stop trusting the next thing it says.
 *
 * `vendors.accepting_jobs` is read by `match_partners` inside the same
 * WHERE clause that tests verification and service radius, so going
 * offline removes this partner from dispatch outright, for every trade
 * and every date, from the next wave onwards.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS NOT THE CALENDAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vendor_availability` is the planned version: "I am not free on the
 * 26th", entered in advance, per date. This is the 6am version: the van
 * will not start, somebody is ill, last night ran until four. Asking a
 * partner to open a calendar and mark today busy while standing next to
 * a broken van is asking too much, which is why both exist.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GOING OFF IS CONFIRMED; COMING BACK IS NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Asymmetric on purpose. Switching off costs a partner money and is the
 * tap most likely to be made by accident in a pocket, so it asks. Coming
 * back on can only ever help them, so it is immediate.
 */
export default function OnlineToggle({ vendorId, initial, onChange }) {
  const [on, setOn] = useState(initial ?? true)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => { if (initial != null) setOn(initial) }, [initial])

  async function write(next) {
    setBusy(true)
    const { error } = await supabase
      .from('vendors').update({ accepting_jobs: next }).eq('id', vendorId)
    setBusy(false)
    setAsking(false)
    if (error) {
      /* 126 not applied: the column is absent. Hide the control rather
         than leave a switch on screen that silently does nothing. */
      if (/accepting_jobs|column/i.test(error.message)) setUnavailable(true)
      return
    }
    setOn(next)
    onChange?.(next)
  }

  if (unavailable || !vendorId) return null

  if (asking) {
    return (
      <div className="rounded-[18px] bg-white/10 p-3 ring-1 ring-white/20">
        <p className="text-[12.5px] font-extrabold leading-snug text-white">
          Go offline? You will stop getting new jobs until you turn this back on.
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-white/70">
          Jobs you have already accepted are not affected.
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button" onClick={() => setAsking(false)}
            className="min-h-[36px] flex-1 rounded-full bg-white/15 text-[12.5px] font-extrabold text-white"
          >
            Stay online
          </button>
          <button
            type="button" onClick={() => write(false)} disabled={busy}
            className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[12.5px] font-extrabold text-plum-950 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Go offline
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => (on ? setAsking(true) : write(true))}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3 text-[12.5px] font-extrabold ring-1 transition-colors ${
        on ? 'bg-forest-600/90 text-white ring-forest-400/50'
           : 'bg-white/10 text-white/80 ring-white/25'}`}
    >
      {busy
        ? <Loader2 size={12} className="animate-spin" />
        : <span className={`h-2 w-2 rounded-full ${on ? 'bg-white' : 'bg-white/50'}`} />}
      {on ? 'Online' : 'Offline'}
    </button>
  )
}
