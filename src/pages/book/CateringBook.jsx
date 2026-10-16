/**
 * Book a caterer: a package or a menu, live counters, extras, guests and
 * dietary needs — priced live by the server (resolve_catering), every line
 * shown before payment. Rendered by TradeBook for Catering & Food.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Zap, MessageSquareQuote, Ban, CheckCircle2, Minus, Plus, ChefHat, Utensils } from 'lucide-react'
import { Card, Label, TextField, ChipRow, Chip } from '../../components/vendor/anchor/ui'
import { CANCELLATION_V3 } from '../../components/vendor/anchor/options'
import LocationAutocomplete from '../../components/common/LocationAutocomplete'
import { apiUrl } from '../../lib/api'
import { payLines, authHeaders } from '../../lib/payLines'
import { rupees } from '../../lib/tierPackages'
import { useAuth } from '../../context/AuthContext'

const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const COURSE = { welcome_drinks: 'Welcome drinks', soups: 'Soups', starters: 'Starters', chaat: 'Chaat', live_counters: 'Live counters', breakfast: 'Breakfast',
  main_gravies: 'Main course', dry_dishes: 'Dry dishes', dal: 'Dal & sambar', rice_biryani: 'Rice & biryani', breads: 'Breads', meal_components: 'Meal',
  accompaniments: 'Accompaniments', salads: 'Salads', desserts: 'Desserts', frozen_desserts: 'Ice cream', refreshments: 'Tea & coffee', other: 'Other' }
const DIETARY = [['veg_only', 'Pure vegetarian'], ['jain', 'Jain'], ['vegan', 'Vegan'], ['no_onion_garlic', 'No onion / garlic']]

function Qty({ value, onChange, min = 0 }) {
  return (
    <span className="flex items-center gap-1.5">
      <button type="button" aria-label="Less" onClick={() => onChange(Math.max(min, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2f9]"><Minus size={14} /></button>
      <span className="w-8 text-center text-[14px] font-extrabold">{value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-white"><Plus size={14} /></button>
    </span>
  )
}

export default function CateringBook({ listing, serviceId, trade, Shell }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const menus = listing.menus ?? [], counters = listing.counters ?? [], addons = listing.addons ?? []
  const packages = (listing.packages ?? []).filter(p => p.catering)
  const [f, setF] = useState({ date: day(14), start: '12:00', adults: String(menus[0]?.min_guests ?? 100), children: '0', menu: menus[0]?.menu_key ?? null,
    pkg: null, counters: {}, addons: [], dietary: [], note: '' })
  const [venue, setVenue] = useState({})
  const [res, setRes] = useState(null), [resolving, setResolving] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null)
  const seq = useRef(0)
  const pkg = packages.find(p => p.key === f.pkg)
  const menu = menus.find(m => m.menu_key === f.menu)

  const request = useMemo(() => ({
    event_date: f.date, start_time: f.start, adults: Number(f.adults) || 0, children: Number(f.children) || 0,
    package: f.pkg ?? undefined, menu_key: f.menu ?? undefined,
    counters: Object.entries(f.counters).filter(([, q]) => q > 0).map(([key, qty]) => ({ key, qty })),
    addons: f.addons, dietary: f.dietary, lat: venue.lat, lng: venue.lng,
  }), [f, venue])

  useEffect(() => {
    const n = ++seq.current
    setResolving(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(apiUrl('/api/anchor?op=book'), { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ vendorServiceId: serviceId, request, preview: true }) })
        const body = await r.json()
        if (n === seq.current) setRes(r.ok ? body : { path: 'ERROR', reasons_text: [body.error] })
      } catch { if (n === seq.current) setRes({ path: 'ERROR', reasons_text: ['Could not reach Sambramo.'] }) }
      finally { if (n === seq.current) setResolving(false) }
    }, 450)
    return () => clearTimeout(t)
  }, [request, serviceId])

  const name = listing.profile?.display_name ?? 'Caterer'
  async function book() {
    if (!user) { navigate('/login', { state: { from: `/book/s/${trade}/${serviceId}` } }); return }
    if (venue.lat == null) { setErr('Choose your venue.'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch(apiUrl('/api/anchor?op=book'), { method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ vendorServiceId: serviceId, request, venue: { address: venue.label, area: venue.area, city: venue.city }, note: f.note }) })
      const body = await r.json()
      if (!r.ok) { setErr(body.reasons_text?.[0] ?? body.error ?? 'Could not book.'); setRes(body); return }
      if (body.path === 'INSTANT' && body.lineId) {
        const p = await payLines({ lineIds: [body.lineId], part: 'advance', description: `${name} · catering advance` })
        if (!p.ok && !p.dismissed) setErr(p.error)
        setDone({ kind: 'instant' })
      } else if (body.path === 'QUOTE') setDone({ kind: 'quote', hours: body.respondWithinHours })
      else setRes(body)
    } finally { setBusy(false) }
  }

  if (done) return (
    <div className="rounded-[24px] bg-white p-6 text-center ring-1 ring-ink/[0.07]">
      {done.kind === 'quote' ? <MessageSquareQuote size={34} className="mx-auto text-plum-600" /> : <CheckCircle2 size={34} className="mx-auto text-forest-600" />}
      <p className="mt-3 text-[18px] font-extrabold">{done.kind === 'quote' ? 'Quote requested' : 'Booking placed'}</p>
      <p className="mt-1 text-[13px] text-ink/60">{done.kind === 'quote' ? `${name} has ${done.hours} hours to price your event. Nothing is charged until you accept.`
        : 'Confirmed once Razorpay confirms the advance. Track it in My Requests.'}</p>
    </div>
  )
  const look = { INSTANT: [Zap, 'bg-forest-50 ring-forest-200 text-forest-800', 'Book now at this price'], QUOTE: [MessageSquareQuote, 'bg-amber-50 ring-amber-200 text-amber-900', 'Needs a custom quote'],
    NOT_ELIGIBLE: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Not available for this'], ERROR: [Ban, 'bg-rose-50 ring-rose-200 text-rose-800', 'Something went wrong'] }[res?.path]
  const shownMenu = pkg ? menus.find(m => (pkg.catering.menu_keys ?? []).includes(m.menu_key) && (!f.menu || m.menu_key === f.menu)) ?? menu : menu
  const courses = shownMenu ? Object.entries((shownMenu.items ?? []).reduce((m, i) => ({ ...m, [i.course_group]: [...(m[i.course_group] ?? []), i] }), {})) : []

  return (
    <>
      <div className="rounded-[22px] bg-gradient-to-br from-plum-700 to-plum-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">Catering & Food</p>
        <p className="mt-1 text-[19px] font-extrabold">{name}</p>
        {listing.profile?.tagline && <p className="text-[12.5px] text-plum-100">{listing.profile.tagline}</p>}
        {listing.answers?.fssai?.number && <p className="mt-2 text-[11.5px] font-bold text-plum-200">FSSAI {listing.answers.fssai.number}</p>}
      </div>

      {packages.length > 0 && (
        <Card className="mt-3"><Label hint="A complete offer. Or choose a menu below.">Packages</Label>
          <div className="space-y-2">{packages.map(p => (
            <button key={p.key} type="button" onClick={() => setF({ ...f, pkg: f.pkg === p.key ? null : p.key, menu: f.pkg === p.key ? f.menu : p.catering.menu_keys?.[0] ?? f.menu })}
              className={`w-full rounded-2xl p-3 text-left ${f.pkg === p.key ? 'bg-plum-50 ring-2 ring-plum-600' : 'bg-[#faf9fd] ring-1 ring-ink/[0.06]'}`}>
              <div className="flex justify-between gap-2"><span className="text-[14px] font-extrabold">{p.name}</span>
                <span className="text-[14px] font-extrabold">{rupees(p.customer_paise)}{p.catering.price_model === 'per_guest' ? '/guest' : ''}</span></div>
              <p className="text-[11.5px] font-bold text-ink/55">{p.catering.guest_min}–{p.catering.guest_max ?? '∞'} guests · {p.hours} h{p.catering.exclusions ? ` · not incl. ${p.catering.exclusions}` : ''}</p>
            </button>))}</div>
        </Card>
      )}

      {menus.length > 0 && (
        <Card className="mt-3"><Label required>{pkg ? 'Menu in this package' : 'Menu'}</Label>
          <ChipRow size="sm" options={(pkg ? menus.filter(m => (pkg.catering.menu_keys ?? []).includes(m.menu_key)) : menus).map(m => m.menu_key)} value={f.menu}
            onChange={x => setF({ ...f, menu: x })} format={k => menus.find(m => m.menu_key === k).name} />
          {shownMenu && <div className="mt-3 rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
            <p className="text-[13px] font-extrabold">{shownMenu.name}{!pkg && shownMenu.customer_paise ? ` · ${rupees(shownMenu.customer_paise)}${shownMenu.price_model === 'per_person' ? '/guest' : ''}` : ''}</p>
            <p className="text-[11.5px] font-bold text-ink/50">Minimum {shownMenu.min_guests ?? '—'} guests{shownMenu.lead_days ? ` · book ${shownMenu.lead_days} days ahead` : ''}</p>
            {courses.map(([c, items]) => (
              <div key={c} className="mt-2"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-plum-600">{COURSE[c] ?? c}</p>
                {items.map(i => <p key={i.dish_key} className="text-[12.5px]"><span className={`mr-1.5 inline-block h-2 w-2 rounded-sm border-2 ${i.diet === 'non_veg' || i.diet === 'egg' ? 'border-rose-600' : 'border-forest-600'}`} />
                  {i.name}{i.included === false ? ` (+${rupees(i.extra_customer_paise)}/guest)` : ''}{(i.allergens ?? []).length ? <span className="text-ink/45"> · {i.allergens.join(', ')}</span> : null}</p>)}</div>))}
          </div>}
        </Card>
      )}

      <Card className="mt-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label required>Event date</Label><input type="date" min={day(1)} value={f.date} onChange={e => setF({ ...f, date: e.target.value })}
            className="h-[50px] w-full rounded-2xl bg-[#f7f6fb] px-3 text-[14px] font-bold ring-1 ring-ink/[0.06]" /></div>
          <div><Label required>Serving time</Label><ChipRow size="sm" options={['08:00', '12:00', '13:00', '19:00', '20:00']} value={f.start} onChange={x => setF({ ...f, start: x })} /></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div><Label required>Adults</Label><TextField inputMode="numeric" value={f.adults} onChange={x => setF({ ...f, adults: x.replace(/\D/g, '').slice(0, 5) })} /></div>
          <div><Label>Children</Label><TextField inputMode="numeric" value={f.children} onChange={x => setF({ ...f, children: x.replace(/\D/g, '').slice(0, 5) })} /></div>
        </div>
        <div className="mt-3" /><Label>Dietary needs</Label>
        <ChipRow multi size="sm" options={DIETARY.map(x => x[0])} value={f.dietary} onChange={x => setF({ ...f, dietary: x })} format={id => DIETARY.find(x => x[0] === id)[1]} />
      </Card>

      {counters.length > 0 && (
        <Card className="mt-3"><Label>Live counters</Label>
          {counters.map(c => {
            const inc = pkg && (pkg.catering.counter_keys ?? []).includes(c.key)
            return (
              <div key={c.key} className="flex items-center gap-3 border-t border-ink/[0.05] py-2 first:border-0">
                <ChefHat size={17} className="text-plum-700" />
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-bold">{c.name}</p>
                  <p className="truncate text-[11.5px] text-ink/50">{inc ? 'Included in package' : c.price_model === 'quote' ? 'On request' : `${rupees(c.customer_paise)} ${c.price_model.replace('_', ' ')}`}
                    {c.duration_hours ? ` · ${c.duration_hours} h` : ''}{c.included_servings ? ` · ${c.included_servings} servings` : ''}</p></div>
                <Qty value={f.counters[c.key] ?? 0} onChange={v => setF({ ...f, counters: { ...f.counters, [c.key]: v } })} />
              </div>)
          })}
        </Card>
      )}

      {addons.length > 0 && (
        <Card className="mt-3"><Label>Extras</Label>
          <div className="flex flex-wrap gap-2">{addons.map(a => {
            const inc = pkg && (a.included_in ?? []).includes(pkg.key)
            return <Chip key={a.addon_id} size="sm" on={inc || f.addons.includes(a.addon_id)} disabled={inc}
              onClick={() => setF({ ...f, addons: f.addons.includes(a.addon_id) ? f.addons.filter(x => x !== a.addon_id) : [...f.addons, a.addon_id] })}>
              {a.label} · {inc ? 'included' : rupees(a.customer_paise)}</Chip>
          })}</div>
        </Card>
      )}

      <Card className="mt-3"><Label required>Venue</Label>
        <LocationAutocomplete value={venue.search} onChange={x => setVenue({ search: x, label: x.label, area: x.area, city: x.city, lat: x.lat, lng: x.lon })} />
        <div className="mt-3"><TextField multiline rows={2} value={f.note} onChange={x => setF({ ...f, note: x })} placeholder="Anything the caterer should know (optional)" max={500} /></div>
      </Card>

      {look && res && (
        <div className={`mt-3 rounded-[22px] p-4 ring-1 ${look[1]}`}>
          <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold">{(() => { const I = look[0]; return <I size={16} /> })()}{look[2]}{resolving && <Loader2 size={14} className="ml-1 animate-spin" />}</p>
          {(res.reasons_text ?? []).map(t => <p key={t} className="mt-1 text-[12.5px] font-semibold">{t}</p>)}
          {(res.path === 'INSTANT' || res.path === 'QUOTE') && res.lines?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-ink">
              {res.lines.map((l, i) => <div key={i} className="flex justify-between gap-3 py-1 text-[12.5px]"><span className="text-ink/65">{l.description}</span><span className="font-bold">{rupees(l.customer_paise)}</span></div>)}
              <div className="mt-1.5 flex justify-between border-t border-ink/10 pt-2 text-[15px] font-extrabold"><span>{res.path === 'QUOTE' ? 'Known so far' : 'Total'}</span><span>{rupees(res.customer_paise)}</span></div>
              {res.catering?.billable_guests > 0 && Number(f.adults) < res.catering.billable_guests && <p className="mt-1 text-[11.5px] font-bold text-ink/55">Billed for the caterer's minimum of {res.catering.billable_guests} guests.</p>}
              {res.path === 'INSTANT' && <>
                <p className="mt-1 text-[12px] font-bold text-forest-700">Pay {rupees(res.advance_paise)} now ({res.advance_pct}%) · {rupees(res.balance_paise)} before the event</p>
                {res.catering?.menu_freeze_days != null && <p className="text-[11.5px] text-ink/55">Menu final {res.catering.menu_freeze_days} days before · guest count {res.catering.guest_confirm_days} days before</p>}
                <p className="mt-1 text-[11.5px] text-ink/55">{CANCELLATION_V3.find(c => c.id === res.cancellation)?.body}</p>
              </>}
            </div>
          )}
        </div>
      )}
      {err && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">{err}</p>}
      {!menus.length && <Card className="mt-3"><p className="flex items-center gap-2 text-[13px] font-bold text-ink/60"><Utensils size={16} /> This caterer prices every event personally — send a request.</p></Card>}
      <div className="sticky bottom-0 -mx-4 mt-4 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 ring-1 ring-ink/[0.05] backdrop-blur-xl">
        <button type="button" disabled={busy || resolving || !res || !['INSTANT', 'QUOTE'].includes(res.path)} onClick={book}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15.5px] font-extrabold text-white disabled:from-ink/20 disabled:to-ink/20">
          {busy && <Loader2 size={17} className="animate-spin" />}
          {res?.path === 'INSTANT' ? `Book & pay ${rupees(res.advance_paise)}` : res?.path === 'QUOTE' ? 'Request a custom quote' : 'Check availability'}
        </button>
      </div>
    </>
  )
}
