/**
 * Book one partner of any trade at their published price — or get a quote.
 *   /book/s/:trade/:serviceId
 *
 * The form asks what the trade's archetype needs (guests, items × qty,
 * rental period, trip, space, storage period…). The SERVER (api/anchor?op=book
 * → resolve_booking) prices every line live; nothing is added after.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Zap, MessageSquareQuote, Ban, CheckCircle2, Minus, Plus } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Chip, Toggle } from '../../components/vendor/anchor/ui'
import { CANCELLATION_V3 } from '../../components/vendor/anchor/options'
import LocationAutocomplete from '../../components/common/LocationAutocomplete'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/api'
import { payLines, authHeaders } from '../../lib/payLines'
import { rupees } from '../../lib/tierPackages'
import { useAuth } from '../../context/AuthContext'
import { configFor } from '../../data/trades'
import CateringBook from './CateringBook'

const START = ['06:00', '08:00', '10:00', '12:00', '15:00', '17:00', '18:00', '19:00', '20:00']
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

/* What each archetype asks the customer. */
const ASK = {
  TIME_PERFORMER: { hours: true, pick: 'one', guests: true },
  PERSONAL_SERVICE: { hours: true, pick: 'qty' },
  STAFFING: { hours: true, staff: true, pick: 'one' },
  PER_GUEST_FOOD: { guests: true, pick: 'one' },
  CATALOGUE_PRODUCT: { pick: 'qty' },
  RENTAL_INVENTORY: { pick: 'qty', endDate: true },
  TRIP_VEHICLE: { pick: 'one', trip: true },
  VENUE_SPACE: { pick: 'one', guests: true, hours: true },
  STORAGE_CAPACITY: { qty: true, endDate: true },
  PROJECT_QUOTE: { pick: 'one', guests: true },
}

function Qty({ value, onChange }) {
  return (
    <span className="flex items-center gap-1.5">
      <button type="button" aria-label="Less" onClick={() => onChange(Math.max(0, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2f9]"><Minus size={14} /></button>
      <span className="w-7 text-center text-[14px] font-extrabold">{value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-white"><Plus size={14} /></button>
    </span>
  )
}

export default function TradeBook() {
  const { trade, serviceId } = useParams()
  const config = configFor(trade)
  const ask = ASK[config?.archetype] ?? {}
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [f, setF] = useState({ date: day(1), end: day(1), start: '10:00', hours: 4, guests: '100', staff: 2, qty: 1, items: {}, pkg: null, addons: [], stops: 0, waiting: 0, ret: false })
  const [venue, setVenue] = useState({})
  const [drop, setDrop] = useState({})
  const [res, setRes] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)
  const seq = useRef(0)

  useEffect(() => {
    supabase.rpc('listing_public', { p_vendor_service_id: serviceId }).then(({ data, error }) => {
      if (error || !data) setLoadErr(error?.message ?? 'This partner is not taking bookings.')
      else setListing(data)
    })
  }, [serviceId])

  const picked = Object.entries(f.items).filter(([, q]) => q > 0).map(([item_key, qty]) => ({ item_key, qty }))
  /* A coverage package, act or ceremony carries its own duration; the
     customer is not asked "how long" for it (a 50-minute ceremony booked
     as 3 hours would ask for overtime the partner never priced). */
  const itemHours = (() => {
    if (config?.archetype !== 'TIME_PERFORMER' || !picked[0]) return null
    const at = listing?.catalogue?.find(i => i.item_key === picked[0].item_key)?.attributes ?? {}
    return Number(at.hours) || (Number(at.minutes) ? Math.round((Number(at.minutes) / 60) * 100) / 100 : null)
  })()
  const request = useMemo(() => ({
    event_date: f.date, end_date: ask.endDate ? f.end : undefined, start_time: f.start,
    hours: ask.hours ? (itemHours ?? f.hours) : undefined, guests: Number(f.guests) || 0, staff: ask.staff ? f.staff : undefined,
    qty: ask.qty ? f.qty : undefined, package: f.pkg, items: picked, addons: f.addons,
    event_category: f.event, lat: venue.lat, lng: venue.lng,
    ...(ask.trip ? { pickup: venue.lat != null ? { lat: venue.lat, lng: venue.lng } : undefined,
      dropoff: drop.lat != null ? { lat: drop.lat, lng: drop.lng } : undefined,
      stops: f.stops, waiting_hours: f.waiting, return: f.ret, passengers: Number(f.guests) || 0 } : {}),
  }), [f, venue, drop, itemHours]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!listing || config?.id === 'catering_food') return   // CateringBook prices its own request
    const n = ++seq.current
    setResolving(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(apiUrl('/api/anchor?op=book'), { method: 'POST', headers: await authHeaders(),
          body: JSON.stringify({ vendorServiceId: serviceId, request, preview: true }) })
        const body = await r.json()
        if (n === seq.current) setRes(r.ok ? body : { path: 'ERROR', reasons_text: [body.error] })
      } catch { if (n === seq.current) setRes({ path: 'ERROR', reasons_text: ['Could not reach Sambramo.'] }) }
      finally { if (n === seq.current) setResolving(false) }
    }, 450)
    return () => clearTimeout(t)
  }, [request, listing, serviceId])

  async function book() {
    if (!user) { navigate('/login', { state: { from: `/book/s/${trade}/${serviceId}` } }); return }
    if (venue.lat == null) { setErr(ask.trip ? 'Choose the pickup point.' : 'Choose your venue.'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch(apiUrl('/api/anchor?op=book'), { method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ vendorServiceId: serviceId, request, venue: { address: venue.label, area: venue.area, city: venue.city }, note: f.note }) })
      const body = await r.json()
      if (!r.ok) { setErr(body.reasons_text?.[0] ?? body.error ?? 'Could not book.'); setRes(body); return }
      if (body.path === 'INSTANT' && body.lineId) {
        const p = await payLines({ lineIds: [body.lineId], part: 'advance', description: `${name} · advance` })
        if (!p.ok && !p.dismissed) setErr(p.error)
        setDone({ kind: 'instant', lineId: body.lineId })
      } else if (body.path === 'QUOTE') setDone({ kind: 'quote', hours: body.respondWithinHours })
      else setRes(body)
    } finally { setBusy(false) }
  }

  if (!config) return <Shell back={() => navigate(-1)}><p className="p-4 text-[13px] font-bold">That service does not exist.</p></Shell>
  if (loadErr) return <Shell back={() => navigate(-1)}><p className="rounded-2xl bg-rose-50 p-4 text-[13px] font-bold text-rose-700">{loadErr}</p></Shell>
  if (!listing) return <Shell back={() => navigate(-1)}><div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div></Shell>
  const name = listing.profile?.display_name ?? config.name
  if (done) return (
    <Shell back={() => navigate('/requests')} title={name}>
      <div className="rounded-[24px] bg-white p-6 text-center ring-1 ring-ink/[0.07]">
        {done.kind === 'quote' ? <MessageSquareQuote size={34} className="mx-auto text-plum-600" /> : <CheckCircle2 size={34} className="mx-auto text-forest-600" />}
        <p className="mt-3 text-[18px] font-extrabold">{done.kind === 'quote' ? 'Quote requested' : 'Booking placed'}</p>
        <p className="mt-1 text-[13px] text-ink/60">{done.kind === 'quote'
          ? `${name} has ${done.hours} hours to send you a price. Nothing is charged until you accept.`
          : 'Your booking is confirmed once Razorpay confirms the advance. Track it in My Requests.'}</p>
      </div>
    </Shell>
  )

  // Catering books menus, packages and counters — its own page.
  if (config.id === 'catering_food') return <Shell back={() => navigate(-1)} title={name}><CateringBook listing={listing} serviceId={serviceId} trade={trade} /></Shell>

  const catalogue = listing.catalogue ?? []
  const packages = listing.packages ?? []
  const look = {
    INSTANT: [Zap, 'bg-forest-50 ring-forest-200 text-forest-800', 'Book now at this price'],
    QUOTE: [MessageSquareQuote, 'bg-amber-50 ring-amber-200 text-amber-900', 'Needs a custom quote'],
    NOT_ELIGIBLE: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Not available for this'],
    ERROR: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Something went wrong'],
  }[res?.path]
  const setItem = (k, q) => setF({ ...f, items: ask.pick === 'one' ? { [k]: q } : { ...f.items, [k]: q } })

  return (
    <Shell back={() => navigate(-1)} title={name}>
      <div className="rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">{config.name}</p>
        <p className="mt-1 text-[19px] font-extrabold">{name}</p>
        {listing.profile?.tagline && <p className="text-[12.5px] text-plum-100">{listing.profile.tagline}</p>}
        {listing.profile?.bio && <p className="mt-2 text-[12.5px] leading-relaxed text-plum-50/90">{listing.profile.bio}</p>}
      </div>

      {packages.length > 0 && (
        <Card className="mt-3"><Label hint="Or skip and choose below.">Packages</Label>
          <div className="space-y-2">{packages.map(p => (
            <button key={p.key} type="button" onClick={() => setF({ ...f, pkg: f.pkg === p.key ? null : p.key })}
              className={`flex w-full justify-between rounded-2xl p-3 text-left ${f.pkg === p.key ? 'bg-plum-50 ring-2 ring-plum-600' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
              <span><span className="block text-[14px] font-extrabold">{p.name}</span>{p.hours && <span className="text-[12px] text-ink/55">{p.hours} hrs</span>}</span>
              <span className="text-[14px] font-extrabold">{rupees(p.customer_paise)}</span>
            </button>))}</div>
        </Card>
      )}

      {ask.pick && catalogue.length > 0 && !f.pkg && (
        <Card className="mt-3"><Label required>{ask.pick === 'one' ? 'Choose one' : 'Choose and set quantities'}</Label>
          <div className="space-y-2">{catalogue.map(it => {
            const q = f.items[it.item_key] ?? 0
            return (
              <div key={it.item_key} className={`flex items-center gap-3 rounded-2xl p-3 ${q ? 'bg-plum-50 ring-1 ring-plum-300' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ask.pick === 'one' && setItem(it.item_key, q ? 0 : 1)}>
                  <span className="block truncate text-[13.5px] font-extrabold">{it.name}</span>
                  <span className="text-[12px] font-bold text-ink/55">{it.customer_paise ? `${rupees(it.customer_paise)} / ${it.unit}` : 'Price on request'}</span>
                </button>
                {ask.pick === 'qty' ? <Qty value={q} onChange={v => setItem(it.item_key, v)} />
                  : <Toggle on={!!q} label={it.name} onChange={on => setItem(it.item_key, on ? 1 : 0)} />}
              </div>
            )
          })}</div>
        </Card>
      )}

      <Card className="mt-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label required>{ask.endDate ? 'From' : 'Date'}</Label><input type="date" min={day(0)} value={f.date} onChange={e => setF({ ...f, date: e.target.value })}
            className="h-[50px] w-full rounded-2xl bg-[#f7f6fb] px-3 text-[14px] font-bold ring-1 ring-ink/[0.06]" /></div>
          {ask.endDate
            ? <div><Label required>Until</Label><input type="date" min={f.date} value={f.end} onChange={e => setF({ ...f, end: e.target.value })}
                className="h-[50px] w-full rounded-2xl bg-[#f7f6fb] px-3 text-[14px] font-bold ring-1 ring-ink/[0.06]" /></div>
            : (ask.guests || ask.trip) && <div><Label required>{ask.trip ? 'Passengers' : 'Guests'}</Label>
                <TextField inputMode="numeric" value={f.guests} onChange={x => setF({ ...f, guests: x.replace(/\D/g, '').slice(0, 6) })} /></div>}
        </div>
        {!ask.endDate && <><div className="mt-4" /><Label required>Start time</Label>
          <ChipRow size="sm" options={START} value={f.start} onChange={x => setF({ ...f, start: x })} /></>}
        {ask.hours && !f.pkg && !itemHours && <><div className="mt-4" /><Label required>How long</Label>
          <ChipRow size="sm" options={[1, 2, 3, 4, 6, 8, 10, 12]} value={f.hours} onChange={x => setF({ ...f, hours: x })} format={h => `${h} hr${h > 1 ? 's' : ''}`} /></>}
        {ask.staff && <div className="mt-4 flex items-center justify-between"><Label required>People needed</Label><Qty value={f.staff} onChange={v => setF({ ...f, staff: Math.max(1, v) })} /></div>}
        {ask.qty && <div className="mt-4 flex items-center justify-between"><Label required>Quantity</Label>
          <span className="w-28"><TextField inputMode="numeric" value={f.qty} onChange={x => setF({ ...f, qty: Number(x.replace(/\D/g, '')) || 0 })} /></span></div>}
        {(listing.answers?.events ?? []).length > 0 && <><div className="mt-4" /><Label>Event</Label>
          <ChipRow size="sm" options={listing.answers.events} value={f.event} onChange={x => setF({ ...f, event: x })}
            format={id => id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())} /></>}
      </Card>

      {listing.addons?.length > 0 && (
        <Card className="mt-3"><Label>Extras</Label>
          <div className="flex flex-wrap gap-2">{listing.addons.map(a => {
            const inc = f.pkg && a.included_in?.includes(f.pkg)
            return <Chip key={a.addon_id} size="sm" on={inc || f.addons.includes(a.addon_id)} disabled={inc}
              onClick={() => setF({ ...f, addons: f.addons.includes(a.addon_id) ? f.addons.filter(x => x !== a.addon_id) : [...f.addons, a.addon_id] })}>
              {a.label} · {inc ? 'included' : rupees(a.customer_paise)}</Chip>
          })}</div>
        </Card>
      )}

      <Card className="mt-3">
        <Label required>{ask.trip ? 'Pickup' : 'Venue'}</Label>
        <LocationAutocomplete value={venue.search} onChange={x => setVenue({ search: x, label: x.label, area: x.area, city: x.city, lat: x.lat, lng: x.lon })} />
        {ask.trip && (<>
          <div className="mt-4" /><Label required>Drop-off</Label>
          <LocationAutocomplete value={drop.search} onChange={x => setDrop({ search: x, lat: x.lat, lng: x.lon })} />
          <div className="mt-4 flex items-center justify-between"><span className="text-[13px] font-extrabold">Extra stops</span><Qty value={f.stops} onChange={v => setF({ ...f, stops: v })} /></div>
          <div className="mt-3 flex items-center justify-between"><span className="text-[13px] font-extrabold">Waiting (hours)</span><Qty value={f.waiting} onChange={v => setF({ ...f, waiting: v })} /></div>
          <div className="mt-3 flex items-center justify-between"><span className="text-[13px] font-extrabold">Return journey</span><Toggle on={f.ret} label="Return" onChange={x => setF({ ...f, ret: x })} /></div>
        </>)}
        <div className="mt-3"><TextField multiline rows={2} value={f.note} onChange={x => setF({ ...f, note: x })} placeholder="Anything the partner should know (optional)" max={500} /></div>
      </Card>

      {look && res && (
        <div className={`mt-3 rounded-[22px] p-4 ring-1 ${look[1]}`}>
          <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold">{(() => { const I = look[0]; return <I size={16} /> })()}{look[2]}{resolving && <Loader2 size={14} className="ml-1 animate-spin" />}</p>
          {(res.reasons_text ?? []).map(t => <p key={t} className="mt-1 text-[12.5px] font-semibold">{t}</p>)}
          {(res.path === 'INSTANT' || res.path === 'QUOTE') && res.lines?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-ink">
              {res.lines.map((l, i) => <div key={i} className="flex justify-between gap-3 py-1 text-[12.5px]"><span className="text-ink/65">{l.description}</span><span className="font-bold">{rupees(l.customer_paise)}</span></div>)}
              <div className="mt-1.5 flex justify-between border-t border-ink/10 pt-2 text-[15px] font-extrabold"><span>{res.path === 'QUOTE' ? 'Known so far' : 'Total'}</span><span>{rupees(res.customer_paise)}</span></div>
              {res.deposit_paise > 0 && <p className="mt-1 text-[12px] font-bold text-ink/60">+ {rupees(res.deposit_paise)} refundable deposit, collected separately</p>}
              {res.path === 'INSTANT' && <>
                <p className="mt-1 text-[12px] font-bold text-forest-700">Pay {rupees(res.advance_paise)} now ({res.advance_pct}%) · {rupees(res.balance_paise)} before the date</p>
                <p className="mt-1 text-[11.5px] text-ink/55">{CANCELLATION_V3.find(c => c.id === res.cancellation)?.body}</p>
              </>}
            </div>
          )}
        </div>
      )}
      {err && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{err}</p>}

      <div className="sticky bottom-0 -mx-4 mt-4 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 ring-1 ring-ink/[0.05] backdrop-blur-xl">
        <button type="button" disabled={busy || resolving || !res || !['INSTANT', 'QUOTE'].includes(res.path)} onClick={book}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15.5px] font-extrabold text-white disabled:from-ink/20 disabled:to-ink/20">
          {busy && <Loader2 size={17} className="animate-spin" />}
          {res?.path === 'INSTANT' ? `Book & pay ${rupees(res.advance_paise)}` : res?.path === 'QUOTE' ? 'Request a custom quote' : 'Check availability'}
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children, back, title }) {
  return (
    <div className="min-h-screen bg-[#fbfaff]">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white/90 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <button type="button" onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70"><ArrowLeft size={20} /></button>
        <p className="truncate text-[16px] font-extrabold text-ink">{title ?? 'Book'}</p>
      </header>
      <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
    </div>
  )
}
