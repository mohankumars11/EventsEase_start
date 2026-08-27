import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, MapPinned, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { MATCHING, PARTIAL } from '../../config/instantBooking'

/**
 * "Three of five masters have accepted."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE SCREEN THAT HAD TO BE NEW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every other surface in the instant flow is assembled from components
 * that already draw this app. This one is not, because nothing in
 * Sambramo has ever had to show several independent things resolving at
 * once — a tracker shows a sequence, a cart shows a total, and neither
 * is this.
 *
 * ── It reads like a scoreboard, not a paragraph ──────────────────────
 * A pip row is read in about 200ms and survives being glanced at
 * sideways while walking. "Three of your five masters have confirmed
 * your booking" does neither, and that is who is looking at this screen:
 * somebody standing up, mid-something, waiting.
 *
 * So the pips carry the state and every string beside them is a
 * FRAGMENT — "Finding", "3 notified", "Booked" — because the service
 * name and the price next to it already supply the grammar. The tier
 * rules in config/instantBooking.js are what keep it that way.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO FAKE COUNTDOWN, EVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The seconds shown are `dispatch_offers.expires_at` from the database —
 * a real deadline that real masters are looking at. A line with nobody
 * to ask (`dispatch_mode = 'standing'`) shows NO timer at all, because
 * counting down against an empty pool is precisely the `false_urgency`
 * pattern named in config/legal.js, and it is the easiest one in this
 * product to commit by accident.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PARTIAL FILL IS NOT A FAILURE STATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Measured against the seeded network, five-line baskets complete about
 * 91% of the time at realistic supply and roughly half at launch supply.
 * So "some accepted, some still looking" is a NORMAL outcome and must
 * not be styled as an error — no red, no apology, no warning triangle.
 *
 * It gets the same visual weight as a full fill, and the pay button
 * names what it is paying for. That is also why `interface_interference`
 * is on the dark-patterns list: making "Pay for 3 now" shout while
 * "still looking" whispers would be pressure dressed as layout.
 */

const PIP = {
  accepted:  'bg-forest-500',
  searching: 'bg-saffron-400',
  standing:  'bg-ink/20',
  none:      'bg-ink/10',
}

function stateOf(line) {
  if (line.status === 'accepted' || line.status === 'paid') return 'accepted'
  if (line.dispatch_mode === 'standing') return 'standing'
  if (line.status === 'dispatching') return 'searching'
  return 'none'
}

/** Live seconds against a real database deadline. */
function useCountdown(iso) {
  const [left, setLeft] = useState(() => remaining(iso))
  useEffect(() => {
    if (!iso) return
    const t = setInterval(() => setLeft(remaining(iso)), 500)
    return () => clearInterval(t)
  }, [iso])
  return left
}
function remaining(iso) {
  if (!iso) return null
  const s = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000)
  return s > 0 ? s : 0
}

function LineRow({ line, offers }) {
  const state = stateOf(line)
  const secs = useCountdown(state === 'searching' ? line.expires_at : null)
  const notified = offers.filter(o => o.line_id === line.id).length
  const won = offers.find(o => o.line_id === line.id && o.status === 'ACCEPTED')

  return (
    <li className="flex items-center gap-3 border-b border-ink/[0.06] py-3 last:border-0">
      <span className={`h-2 w-2 shrink-0 rounded-full ${PIP[state]}`} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
          {line.service_name}
        </p>

        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-mute">
          {state === 'accepted' && (
            <>
              <Check size={12} className="text-forest-600" />
              {MATCHING.accepted}
              {won?.distance_m != null && (
                <span className="font-semibold text-ink-mute/70">
                  · {(won.distance_m / 1000).toFixed(1)} km
                </span>
              )}
            </>
          )}

          {state === 'searching' && (
            <>
              <Loader2 size={12} className="animate-spin text-saffron-600" />
              {notified > 0 ? MATCHING.notified(notified) : MATCHING.searching}
              {secs != null && secs > 0 && (
                <span className="tabular-nums text-ink-mute/70">· {secs}s</span>
              )}
            </>
          )}

          {/* No timer. There is nobody to count down. */}
          {state === 'standing' && (
            <>
              <Search size={12} className="text-ink-mute" />
              {PARTIAL.glance}
            </>
          )}
        </p>
      </div>

      <span
        className={`shrink-0 text-[13.5px] font-extrabold tabular-nums ${
          state === 'accepted' ? 'text-ink' : 'text-ink-mute/50'
        }`}
      >
        {formatINR(Math.round(line.quoted_amount_paise / 100))}
      </span>
    </li>
  )
}

export default function MatchingBoard({ requestId, onPay }) {
  const [lines, setLines] = useState([])
  const [offers, setOffers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const pollRef = useRef(null)

  /**
   * Realtime, with polling underneath it.
   *
   * `hooks/useNotifications.js` already established this pattern and the
   * reasoning holds harder here: Realtime needs the tables in the
   * `supabase_realtime` publication, which is a hand-applied step that
   * can silently not have happened. A screen whose entire job is showing
   * change cannot be the one that quietly stops changing — so the poll
   * is the floor, and when Realtime works it simply finds nothing new.
   */
  useEffect(() => {
    if (!requestId) return
    let dead = false

    async function read() {
      const { data: l } = await supabase
        .from('booking_lines')
        .select('id, service_name, status, dispatch_mode, expires_at, quoted_amount_paise')
        .eq('request_id', requestId)
        .order('created_at')

      if (dead) return
      setLines(l ?? [])
      setLoaded(true)

      const ids = (l ?? []).map(x => x.id)
      if (!ids.length) return
      const { data: o } = await supabase
        .from('dispatch_offers')
        .select('id, line_id, status, distance_m')
        .in('line_id', ids)
      if (!dead) setOffers(o ?? [])
    }

    read()
    pollRef.current = setInterval(read, 3000)

    const channel = supabase
      .channel(`booking-${requestId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'booking_lines', filter: `request_id=eq.${requestId}` },
        read)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_offers' },
        read)
      .subscribe()

    return () => {
      dead = true
      clearInterval(pollRef.current)
      supabase.removeChannel(channel)
    }
  }, [requestId])

  const accepted = useMemo(() => lines.filter(l => stateOf(l) === 'accepted'), [lines])
  const payable = useMemo(
    () => accepted.filter(l => l.status === 'accepted'), [accepted])
  const payTotal = payable.reduce((n, l) => n + l.quoted_amount_paise, 0)
  const stillLooking = lines.length - accepted.length

  if (!loaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-mute">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      <p className="type-overline text-saffron-700">Your masters</p>
      <h1 className="mt-1.5 font-serif text-[26px] font-extrabold leading-[1.14] tracking-tight text-ink sm:text-[30px]">
        {MATCHING.progress(accepted.length, lines.length)}
      </h1>

      {/* The scoreboard. Read in a glance, before any word is. */}
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {lines.map(l => (
          <span key={l.id} className={`h-1.5 flex-1 rounded-full ${PIP[stateOf(l)]}`} />
        ))}
      </div>

      <ul className="mt-5 rounded-[22px] bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-ink/[0.06]">
        {lines.map(l => <LineRow key={l.id} line={l} offers={offers} />)}
      </ul>

      {/* Stated once, calmly, and never as an apology. */}
      {stillLooking > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-[18px] bg-surface-sunk/[0.05] p-3.5 text-[12.5px] font-semibold leading-snug text-ink-soft">
          <MapPinned size={14} className="mt-0.5 shrink-0 text-ink-mute" />
          {PARTIAL.scan}
        </p>
      )}

      {payable.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.06] bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => onPay?.(payable)}
              className="w-full rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
            >
              {MATCHING.payCta(payable.length, formatINR(Math.round(payTotal / 100)))}
            </button>
            <p className="mt-2 text-center text-[11px] font-semibold text-ink-mute">
              You only pay for masters who said yes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
