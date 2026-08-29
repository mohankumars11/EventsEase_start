import { useCallback, useEffect, useState } from 'react'
import { useLivePoll } from '../../hooks/useLivePoll'
import { Link } from 'react-router-dom'
import { ChevronRight, Bell, MapPin } from 'lucide-react'
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
    /* The poll lives in useLivePoll now: it stops while the screen is
       hidden and catches up in one shot on return. */
    return () => { supabase.removeChannel(ch) }
  }, [read, user?.id, isCustomer])

  useLivePoll(read, 25_000, [read])

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

  const day = lines[0].booking_requests?.event_date
  const when = day ? new Date(day + 'T00:00:00') : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = when ? Math.round((when - today) / 86400000) : null

  /* "Tomorrow" beats "30 Aug" and "in 4 days" beats both when it is
     further out. Somebody glancing at a home screen is orienting, not
     reading a calendar. */
  const whenLabel = days === 0 ? 'Today'
    : days === 1 ? 'Tomorrow'
    : days != null && days > 0 && days < 7 ? `In ${days} days`
    : when ? when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : ''

  return (
    <section className="mx-4 mt-4">
      {/* Named, the way the reference does it. "You have a booking" tells
          somebody the card is THEIRS before they read a word of it —
          which is the difference between a card people scan past and one
          they tap. */}
      <p className="mb-2 type-overline text-ink-mute">You have a booking</p>

      <Link
        to={`/book/instant?request=${req}`}
        className={`block overflow-hidden rounded-[22px] bg-white ring-1 transition active:scale-[0.995] ${
          waiting.length ? 'ring-saffron-300/70' : 'ring-ink/[0.07]'
        }`}
      >
        {/* The band carries the state and nothing else does, so the card
            below it can stay white and legible. */}
        <div className={`flex items-center gap-2 px-4 py-2 text-[11.5px] font-extrabold ${
          waiting.length ? 'bg-saffron-400/20 text-saffron-900'
          : hunting.length ? 'bg-forest-50 text-forest-800'
          : 'bg-plum-50 text-plum-800'
        }`}>
          {hunting.length > 0 && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-forest-600" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{headline}</span>
          {whenLabel && <span className="shrink-0 opacity-70">{whenLabel}</span>}
        </div>

        <div className="flex items-center gap-3 p-4">
          {/* The faces of what is actually being booked. Three at most —
              a fourth adds nothing a "+2" does not say better. */}
          <span className="flex shrink-0 -space-x-2.5">
            {lines.slice(0, 3).map(l => (
              <TradeSprite key={l.id} trade={l.trade} serviceId={l.service_id} active={!!hunting.length} size={36} />
            ))}
            {lines.length > 3 && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.06] text-[11px] font-extrabold text-ink-soft ring-2 ring-white">
                +{lines.length - 3}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-extrabold leading-tight text-ink">
              {lines.slice(0, 2).map(l => l.service_name).join(', ')}
              {lines.length > 2 ? ` +${lines.length - 2}` : ''}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
              {area && <><MapPin size={12} className="shrink-0 text-ink-mute" />{area}</>}
            </span>
          </span>

          <ChevronRight size={18} className="shrink-0 text-ink-mute" />
        </div>

        {/* The one row that is a decision rather than a status. Only when
            money is actually owed. */}
        {waiting.length > 0 && (
          <div className="flex items-center justify-between border-t border-saffron-300/40 bg-saffron-400/10 px-4 py-3">
            <span className="text-[12.5px] font-bold text-saffron-900">
              Pay to confirm your date
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400 px-3.5 py-1.5 text-[12.5px] font-extrabold text-plum-950">
              <Bell size={12} />
              {formatINR(Math.round(waiting.reduce((n, l) => n + l.quoted_amount_paise, 0) / 100))}
            </span>
          </div>
        )}
      </Link>
    </section>
  )
}
