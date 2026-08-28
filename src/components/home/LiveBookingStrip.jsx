import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import TradeSprite from '../book/TradeSprite'

/**
 * What is happening right now, on the home screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A LIVE BOOKING WAS INVISIBLE FROM EVERY SCREEN BUT ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A customer dispatches four services, closes the tab, comes back ten
 * minutes later, and lands on the home screen — festivals, occasion
 * tiles, the shop. Nothing anywhere says three masters have accepted and
 * are waiting to be paid. The only screen that knows is the matching
 * board, and the only way back to it is to remember it exists.
 *
 * The same for a master: their dashboard has the offer inbox, and the
 * partner home has nothing.
 *
 * So this sits at the top of both, and only when there is something to
 * say. An empty strip renders nothing at all — a permanent "no active
 * bookings" card is furniture, and furniture on a home screen is what
 * pushes the thing somebody actually came for below the fold.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS LIVE, NOT A SNAPSHOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Subscribed to the same tables the board watches, with a poll
 * underneath. A strip that said "2 of 4 accepted" and stayed that way
 * while the third master accepted would be worse than no strip: it would
 * teach the customer that this screen lies.
 */
export default function LiveBookingStrip() {
  const { user, profile } = useAuth()
  const [lines, setLines] = useState([])

  /* A master is not a customer, even when they have been one.
   *
   * Every test account in this database has booked something — that is
   * how the flow gets tested — so a vendor account has live
   * booking_lines of its own, and RLS correctly returns them. The
   * result was "4 masters are waiting for you" on the partner app,
   * about bookings the master had made themselves.
   *
   * RLS answers "may this person see this row", which it did, correctly.
   * Whether the row BELONGS on this screen is a product question and
   * has to be answered here. */
  const isCustomer = !profile || profile.role === 'customer'

  const read = useCallback(async () => {
    if (!user?.id || !isCustomer) return

    // The customer's own live bookings. `booking_lines` is scoped by RLS
    // to the caller (migration 074), so this needs no customer filter —
    // and must not have one, because trusting a client-supplied id here
    // is how the policy gets bypassed by accident later.
    const { data } = await supabase
      .from('booking_lines')
      .select('id, service_name, trade, service_id, status, dispatch_mode, quoted_amount_paise, request_id, booking_requests!inner(event_date, area_label)')
      .in('status', ['dispatching', 'accepted', 'paid'])
      .order('created_at', { ascending: false })
      .limit(12)

    setLines(data ?? [])
  }, [user?.id, isCustomer])

  useEffect(() => {
    if (!user?.id || !isCustomer) return
    read()
    const ch = supabase
      .channel('home-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, read)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_offers' }, read)
      .subscribe()
    // Realtime needs the table in the supabase_realtime publication
    // (migration 080). Until that is applied this poll is the only thing
    // keeping the strip honest, which is why it exists regardless.
    const floor = setInterval(read, 25_000)
    return () => { clearInterval(floor); supabase.removeChannel(ch) }
  }, [read, user?.id, isCustomer])

  if (!user || !isCustomer || !lines.length) return null

  const hunting  = lines.filter(l => l.status === 'dispatching')
  const waiting  = lines.filter(l => l.status === 'accepted')
  const confirmed = lines.filter(l => l.status === 'paid')
  const req = lines[0].request_id
  const area = lines[0].booking_requests?.area_label

  /* One sentence, and it is chosen by what needs the customer MOST.
   * Money owed beats a search in progress, because one is a decision
   * they have to make and the other is a thing being done for them. */
  const headline =
    waiting.length  ? `${waiting.length} ${waiting.length === 1 ? 'master is' : 'masters are'} waiting to be paid`
    : hunting.length ? `Finding ${hunting.length === 1 ? 'a master' : `${hunting.length} masters`}${area ? ` near ${area}` : ''}`
    : `${confirmed.length} confirmed`

  const tone = waiting.length ? 'saffron' : hunting.length ? 'forest' : 'ink'

  return (
    <Link
      to={`/book/instant?request=${req}`}
      className={`mx-4 mt-3 flex items-center gap-3 rounded-[22px] p-3.5 ring-1 transition active:scale-[0.995] ${
        tone === 'saffron' ? 'bg-saffron-400/15 ring-saffron-300/60'
        : tone === 'forest' ? 'bg-forest-50 ring-forest-200/70'
        : 'bg-white ring-ink/[0.06]'
      }`}
    >
      {/* The faces of the services still moving. Three at most: this is a
          strip, not the board. */}
      <span className="flex shrink-0 -space-x-2">
        {(hunting.length ? hunting : waiting.length ? waiting : confirmed).slice(0, 3).map(l => (
          <TradeSprite key={l.id} trade={l.trade} serviceId={l.service_id} active={!!hunting.length} size={30} />
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold leading-tight text-ink">
          {headline}
        </span>
        <span className="mt-0.5 block truncate text-[12px] font-semibold text-ink-soft">
          {waiting.length
            ? `Pay ${formatINR(Math.round(waiting.reduce((n, l) => n + l.quoted_amount_paise, 0) / 100))} to confirm your date`
            : hunting.length
              ? 'We will alert you the moment someone accepts'
              : 'Your masters will call you to agree the details'}
        </span>
      </span>

      {waiting.length > 0 && <Bell size={15} className="shrink-0 text-saffron-700" />}
      <ChevronRight size={17} className="shrink-0 text-ink-mute" />
    </Link>
  )
}
