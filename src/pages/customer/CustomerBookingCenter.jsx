import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Loader2, MapPin, RefreshCw, Search, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchCustomerBookings, lineIsLive, lineLabel, subscribeToCustomerBookings } from '../../lib/customerBookings'
import { formatDate, formatINR } from '../../utils/format'
import AppBar from '../../components/layout/AppBar'

function BookingLine({ line }) {
  const offer = line.acceptedOffer
  const live = lineIsLive(line)
  const amount = line.quoted_amount_paise != null ? Math.round(line.quoted_amount_paise / 100) : null
  return (
    <li className="border-t border-ink/[0.06] px-4 py-3.5 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.09] text-accent">
          {live ? <Search size={16} /> : line.status === 'paid' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold text-ink">{line.service_name}</span>
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-mute">{lineLabel(line)}</span>
          {offer?.vendors?.business_name && <span className="mt-1 block text-[11.5px] font-bold text-forest-700">{offer.vendors.business_name}{offer.distance_m != null ? ' · ' + (offer.distance_m / 1000).toFixed(1) + ' km' : ''}</span>}
        </span>
        {amount != null && <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-ink">{formatINR(amount)}</span>}
      </div>
    </li>
  )
}

function BookingCard({ booking }) {
  const liveLines = booking.lines.filter(lineIsLive)
  const hasAccepted = booking.lines.some(l => l.status === 'accepted' || l.accepted_offer_id)
  return (
    <article className="a-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/[0.09] text-[18px]">🎉</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-extrabold tracking-tight text-ink">{booking.occasion_name || 'Celebration booking'}</p>
            <p className="mt-0.5 font-mono text-[10px] text-ink-mute">{booking.booking_code || String(booking.id).slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={'rounded-full px-2.5 py-1 text-[10px] font-extrabold ' + (liveLines.length ? 'bg-saffron-400/20 text-saffron-800' : 'bg-forest-50 text-forest-800')}>{liveLines.length ? liveLines.length + ' live' : 'Complete'}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink-mute">
          {booking.event_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(booking.event_date)}</span>}
          {booking.area_label && <span className="inline-flex items-center gap-1"><MapPin size={12} />{booking.area_label}</span>}
          {booking.guest_count && <span>{booking.guest_count} guests</span>}
        </div>
      </div>
      <ul>{booking.lines.map(line => <BookingLine key={line.id} line={line} />)}</ul>
      <div className="border-t border-ink/[0.06] px-4 py-3.5">
        <Link to={'/book/instant?request=' + encodeURIComponent(booking.id)} className="a-btn-primary flex w-full items-center justify-center gap-2">
          {hasAccepted ? 'Open accepted booking' : liveLines.length ? 'Open live matching' : 'Open booking'} <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  )
}

export default function CustomerBookingCenter() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!user?.id) return
    if (!silent) setRefreshing(true)
    const result = await fetchCustomerBookings(user.id)
    if (!result.error) { setBookings(result.bookings); setError(null) }
    else setError(result.error.message ?? 'Could not load live bookings.')
    setLoading(false)
    setRefreshing(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) { setBookings([]); setLoading(false); return undefined }
    let cancelled = false
    const bootstrap = async () => {
      const result = await fetchCustomerBookings(user.id)
      if (cancelled) return
      if (result.error) setError(result.error.message ?? 'Could not load live bookings.')
      else setBookings(result.bookings)
      setLoading(false)
    }
    bootstrap()
    const poll = setInterval(() => { if (!cancelled) load(true) }, 5000)
    return () => { cancelled = true; clearInterval(poll) }
  }, [user?.id, load])

  useEffect(() => {
    if (!user?.id) return undefined
    const stop = subscribeToCustomerBookings({ userId: user.id, requestIds: bookings.map(b => b.id), onChange: () => load(true) })
    return stop
  }, [user?.id, bookings.map(b => b.id).join(','), load])

  const title = useMemo(() => bookings.length ? 'Your live bookings' : 'Bookings', [bookings.length])

  return (
    <div className="a-canvas min-h-[100dvh] pb-bottom-nav">
      <AppBar
        title={title}
        subtitle="Real-time partner matching"
        backTo="/"
        right={<button type="button" onClick={() => load(false)} className="rounded-full p-2 text-ink-soft" aria-label="Refresh bookings">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}</button>}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-5 pb-10 pt-4">
        {!user ? (
          <div className="a-card p-6"><p className="text-[18px] font-extrabold tracking-tight text-ink">Sign in to see live bookings</p><p className="mt-2 text-[13px] leading-relaxed text-ink-mute">Your request, partner offers and payment status stay tied to your account.</p><Link to="/login" className="a-btn-primary mt-4 inline-flex">Sign in</Link></div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-mute"><Loader2 size={18} className="animate-spin" /> Loading live bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="a-card p-6 text-center"><p className="text-[18px] font-extrabold tracking-tight text-ink">No live bookings yet</p><p className="mt-2 text-[13px] leading-relaxed text-ink-mute">Start a booking and this screen will follow every partner response as it lands.</p><Link to="/book/instant" className="a-btn-primary mt-4 inline-flex items-center gap-2">Start a booking <ArrowRight size={15} /></Link></div>
        ) : (bookings.map(booking => <BookingCard key={booking.id} booking={booking} />))}
        <Link to="/track" className="block rounded-2xl px-4 py-3 text-center text-[12px] font-extrabold text-accent ring-1 ring-ink/[0.08]">Open celebrations &amp; orders tracker</Link>
        {error && <p className="rounded-2xl bg-chilli-50 px-4 py-3 text-[12px] leading-relaxed text-chilli-800">{error}</p>}
      </div>
    </div>
  )
}
