/**
 * Book one Anchor & MC partner.
 *
 * The customer describes the event; the SERVER (api/anchor?op=book →
 * resolve_anchor_booking) says, live, whether it can be booked now and at
 * exactly what price — every line shown before payment, nothing added
 * after. Instant → the line is created and the advance is paid through
 * Razorpay; the webhook confirms it. Quote → the partner gets a pre-filled
 * request with their own response window.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Zap, MessageSquareQuote, Ban, CheckCircle2 } from 'lucide-react'
import AnchorProfileCard from '../../components/customer/AnchorProfileCard'
import { Card, Label, TextField, ChipRow, Chip } from '../../components/vendor/anchor/ui'
import { EVENT_GROUPS_V3, CANCELLATION_V3 } from '../../components/vendor/anchor/options'
import LocationAutocomplete from '../../components/common/LocationAutocomplete'
import PinMap from '../../components/common/PinMap'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/api'
import { payLines, authHeaders } from '../../lib/payLines'
import { rupees } from '../../lib/tierPackages'
import { useAuth } from '../../context/AuthContext'

const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const START = ['10:00', '12:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00']
const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10) }

export default function AnchorBook() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [f, setF] = useState({ date: tomorrow(), start: '18:00', hours: 3, guests: '150', languages: [], addons: [], tier: null })
  const [venue, setVenue] = useState({})
  const [res, setRes] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)   // { kind:'instant', lineId } | { kind:'quote', hours }
  const seq = useRef(0)

  useEffect(() => {
    supabase.rpc('anchor_public_listing', { p_vendor_service_id: serviceId }).then(({ data, error }) => {
      if (error || !data) setLoadErr(error?.message ?? 'This anchor is not taking bookings.')
      else {
        setListing(data)
        const p = data.profile ?? {}
        setF(x => ({ ...x, event: p.events?.[0] ?? null, languages: p.languages?.[0] ? [p.languages[0].name] : [] }))
      }
    })
  }, [serviceId])

  const request = useMemo(() => ({
    tier: f.tier, event_date: f.date, start_time: f.start, hours: f.tier ? (listing?.packages.find(p => p.tier === f.tier)?.hours ?? f.hours) : f.hours,
    days: 1, guests: Number(f.guests) || 0, languages: f.languages, event_category: f.event, addons: f.addons,
    lat: venue.lat, lng: venue.lng,
  }), [f, venue, listing])

  // Live price from the server, debounced.
  useEffect(() => {
    if (!listing) return
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
    if (!user) { navigate('/login', { state: { from: `/book/anchor/${serviceId}` } }); return }
    if (venue.lat == null) { setErr('Choose your venue so we can check travel.'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch(apiUrl('/api/anchor?op=book'), { method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ vendorServiceId: serviceId, request, venue: { address: venue.label, area: venue.area, city: venue.city }, note: f.note }) })
      const body = await r.json()
      if (!r.ok) { setErr(body.reasons_text?.[0] ?? body.error ?? 'Could not book.'); setRes(body); return }
      if (body.path === 'INSTANT' && body.lineId) {
        const p = await payLines({ lineIds: [body.lineId], part: 'advance', description: `${listing.profile.stage_name} · advance` })
        if (!p.ok && !p.dismissed) setErr(p.error)
        setDone({ kind: 'instant', lineId: body.lineId, res: body })
      } else if (body.path === 'QUOTE') {
        setDone({ kind: 'quote', hours: body.respondWithinHours })
      } else setRes(body)
    } finally { setBusy(false) }
  }

  if (loadErr) return <Shell back={() => navigate(-1)}><p className="rounded-2xl bg-rose-50 p-4 text-[13px] font-bold text-rose-700">{loadErr}</p></Shell>
  if (!listing) return <Shell back={() => navigate(-1)}><div className="flex justify-center py-10"><Loader2 className="animate-spin text-plum-600" /></div></Shell>
  if (done) return <Shell back={() => navigate('/requests')}><Done done={done} name={listing.profile.stage_name} /></Shell>

  const p = listing.profile ?? {}
  const pathLook = {
    INSTANT: [Zap, 'bg-forest-50 ring-forest-200 text-forest-800', 'Book now at this price'],
    QUOTE: [MessageSquareQuote, 'bg-amber-50 ring-amber-200 text-amber-900', 'Needs a custom quote'],
    NOT_ELIGIBLE: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Not available for this'],
    ERROR: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Something went wrong'],
  }[res?.path] ?? null

  return (
    <Shell back={() => navigate(-1)} title={p.stage_name}>
      <AnchorProfileCard profile={p} city={listing.city} rating={listing.rating ? Number(listing.rating).toFixed(1) : null}
        packages={listing.packages.map(k => ({ ...k, inclusions: k.inclusions.map(id => listing.addons.find(a => a.addon_id === id)?.label ?? id) }))}
        selectedTier={f.tier} onPick={k => setF(x => ({ ...x, tier: x.tier === k.tier ? null : k.tier }))} />
      <p className="mt-2 px-1 text-[11.5px] text-ink/50">{f.tier ? 'Package selected. Tap it again to choose your own hours.' : 'Pick a package, or set your own hours below.'}</p>

      <Card className="mt-3">
        <Label required>Event</Label>
        <ChipRow size="sm" options={p.events ?? []} value={f.event} format={id => EVENT_LABEL[id] ?? id} onChange={x => setF({ ...f, event: x })} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div><Label required>Date</Label><input type="date" min={tomorrow()} value={f.date} onChange={e => setF({ ...f, date: e.target.value })}
            className="h-[50px] w-full rounded-2xl bg-[#f7f6fb] px-3 text-[14px] font-bold ring-1 ring-ink/[0.06]" /></div>
          <div><Label required>Guests</Label><TextField inputMode="numeric" value={f.guests} onChange={x => setF({ ...f, guests: x.replace(/\D/g, '').slice(0, 6) })} /></div>
        </div>
        <div className="mt-4" /><Label required>Start time</Label>
        <ChipRow size="sm" options={START} value={f.start} onChange={x => setF({ ...f, start: x })} />
        {!f.tier && (<><div className="mt-4" /><Label required>How long</Label>
          <ChipRow size="sm" options={[1, 2, 3, 4, 5, 6, 8, 10]} value={f.hours} onChange={x => setF({ ...f, hours: x })} format={h => `${h} hr${h > 1 ? 's' : ''}`} /></>)}
        <div className="mt-4" /><Label required>Language</Label>
        <ChipRow multi size="sm" options={(p.languages ?? []).map(l => l.name)} value={f.languages} onChange={x => setF({ ...f, languages: x })} />
      </Card>

      {listing.addons.length > 0 && (
        <Card className="mt-3">
          <Label hint="Included ones are free in the package you picked.">Extras</Label>
          <div className="flex flex-wrap gap-2">
            {listing.addons.map(a => {
              const inc = f.tier && a.included_in?.includes(f.tier)
              return <Chip key={a.addon_id} size="sm" on={inc || f.addons.includes(a.addon_id)} disabled={inc}
                onClick={() => setF({ ...f, addons: f.addons.includes(a.addon_id) ? f.addons.filter(x => x !== a.addon_id) : [...f.addons, a.addon_id] })}>
                {a.label} · {inc ? 'included' : rupees(a.customer_paise)}</Chip>
            })}
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <Label required>Venue</Label>
        <LocationAutocomplete value={venue.search} onChange={x => setVenue({ ...venue, search: x, label: x.label, area: x.area, city: x.city, lat: x.lat ?? venue.lat, lng: x.lon ?? venue.lng })} />
        {venue.lat != null && <div className="mt-3"><PinMap value={{ lat: venue.lat, lng: venue.lng }} height={170} onChange={pt => setVenue({ ...venue, lat: pt.lat, lng: pt.lng })} /></div>}
        <div className="mt-3"><TextField multiline rows={2} value={f.note} onChange={x => setF({ ...f, note: x })} placeholder="Anything the anchor should know (optional)" max={500} /></div>
      </Card>

      {pathLook && res && (
        <div className={`mt-3 rounded-[22px] p-4 ring-1 ${pathLook[1]}`}>
          <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold">{(() => { const I = pathLook[0]; return <I size={16} /> })()}{pathLook[2]}{resolving && <Loader2 size={14} className="ml-1 animate-spin" />}</p>
          {(res.reasons_text ?? []).map(t => <p key={t} className="mt-1 text-[12.5px] font-semibold">{t}</p>)}
          {(res.path === 'INSTANT' || res.path === 'QUOTE') && res.lines?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-ink">
              {res.lines.map((l, i) => <div key={i} className="flex justify-between py-1 text-[12.5px]"><span className="text-ink/65">{l.description}</span><span className="font-bold">{rupees(l.customer_paise)}</span></div>)}
              <div className="mt-1.5 flex justify-between border-t border-ink/10 pt-2 text-[15px] font-extrabold"><span>{res.path === 'QUOTE' ? 'Known so far' : 'Total'}</span><span>{rupees(res.customer_paise)}</span></div>
              {res.path === 'INSTANT' && <>
                <p className="mt-1 text-[12px] font-bold text-forest-700">Pay {rupees(res.advance_paise)} now ({res.advance_pct}%) · {rupees(res.balance_paise)} before the event</p>
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
        <p className="truncate text-[16px] font-extrabold text-ink">{title ?? 'Anchor & MC'}</p>
      </header>
      <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
    </div>
  )
}

function Done({ done, name }) {
  const [status, setStatus] = useState('confirming')
  const [paying, setPaying] = useState(false)
  const [owed, setOwed] = useState(null)
  useEffect(() => {
    if (done.kind !== 'instant') return
    let alive = true
    const tick = async () => {
      const { data } = await supabase.from('booking_lines').select('status, quoted_amount_paise').eq('id', done.lineId).maybeSingle()
      if (!alive) return
      if (data?.status === 'paid') {
        setStatus('paid')
        /* Customers may not read escrow; fall back to the balance the
           server computed at booking. Paying it twice is impossible:
           create-booking-payment re-derives what is still owed. */
        const { data: holds, error } = await supabase.from('escrow_ledger').select('amount_paise').eq('line_id', done.lineId).eq('kind', 'HOLD')
        setOwed(!error && holds?.length
          ? data.quoted_amount_paise - holds.reduce((t, h) => t + Number(h.amount_paise), 0)
          : Number(done.res?.balance_paise) || 0)
      } else setTimeout(tick, 3000)
    }
    tick()
    return () => { alive = false }
  }, [done])

  if (done.kind === 'quote') return (
    <div className="rounded-[24px] bg-white p-6 text-center ring-1 ring-ink/[0.07]">
      <MessageSquareQuote size={34} className="mx-auto text-plum-600" />
      <p className="mt-3 text-[18px] font-extrabold">Quote requested</p>
      <p className="mt-1 text-[13px] text-ink/60">{name} has {done.hours} hours to send you a price. You will see it in My Requests, and nothing is charged until you accept.</p>
    </div>
  )
  return (
    <div className="rounded-[24px] bg-white p-6 text-center ring-1 ring-ink/[0.07]">
      {status === 'paid' ? <CheckCircle2 size={36} className="mx-auto text-forest-600" /> : <Loader2 size={30} className="mx-auto animate-spin text-plum-600" />}
      <p className="mt-3 text-[18px] font-extrabold">{status === 'paid' ? `${name} is booked` : 'Confirming your payment…'}</p>
      <p className="mt-1 text-[13px] text-ink/60">{status === 'paid' ? 'Your date is locked. We have sent the details to you both.' : 'This takes a few seconds once Razorpay confirms.'}</p>
      {status === 'paid' && owed > 0 && (
        <button type="button" disabled={paying} onClick={async () => { setPaying(true); await payLines({ lineIds: [done.lineId], part: 'balance', description: `${name} · balance` }); setPaying(false) }}
          className="mt-4 h-11 w-full rounded-full bg-plum-700 text-[13.5px] font-extrabold text-white">Pay remaining {rupees(owed)} now</button>
      )}
    </div>
  )
}

