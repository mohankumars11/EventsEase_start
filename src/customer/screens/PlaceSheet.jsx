/**
 * Where is it? The engine checks travel areas and distance from real
 * coordinates, so this produces { area, lat, lng, address }.
 *
 * Current location first (native GPS in the app, browser geolocation on
 * the web), named after the nearest locality; otherwise a search over the
 * same Bengaluru localities the partner network is placed on, so the
 * picker and the partners cannot disagree about where Koramangala is.
 *
 * The button never sits dead (Mohan, 2026-10-28: "it's not enabling, even
 * if I click multiple times"). GPS now names the real locality (OSM) and
 * pre-fills the address line; if the house / flat detail is still
 * missing, the button says so and takes you to the field instead of
 * staying grey with no reason given.
 */
import { useMemo, useRef, useState } from 'react'
import { Check, Loader2, LocateFixed, MapPin, Navigation, Search } from 'lucide-react'
import { reverseAddress } from '../../lib/partnerLocation'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { Sheet } from '../ui/kit'

async function here() {
  if (typeof window !== 'undefined' && window.Capacitor) {
    const { Geolocation } = await import('@capacitor/geolocation')
    try { await Geolocation.requestPermissions() } catch { /* web fallback below */ }
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
    return p.coords
  }
  return new Promise((res, rej) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 })
    : rej(new Error('Location is not available on this device.')))
}

const km = (a, b) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function PlaceSheet({ open, onClose, value, onPick }) {
  const [q, setQ] = useState('')
  const [address, setAddress] = useState(value?.address ?? '')
  const [picked, setPicked] = useState(value ?? null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [nudge, setNudge] = useState(false)
  const field = useRef(null)
  const addrOk = address.trim().length >= 6
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return BENGALURU_AREAS.filter(a => !t || a.name.toLowerCase().includes(t)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  }, [q])

  async function useHere() {
    setBusy(true); setErr('')
    try {
      const c = await here()
      const at = { lat: c.latitude, lng: c.longitude }
      const near = [...BENGALURU_AREAS].sort((a, b) => km(at, a) - km(at, b))[0]
      const addr = await reverseAddress(at.lat, at.lng).catch(() => null)
      const area = (km(at, near) < 8 ? near.name : null) ?? addr?.locality ?? 'Your location'
      setPicked({ area, city: addr?.city ?? null, lat: at.lat, lng: at.lng, exact: true })
      if (addr?.line && address.trim().length < 6) setAddress(addr.line)
      setNudge(true)
      setTimeout(() => field.current?.focus(), 60)
    } catch (e) {
      setErr(e?.message?.includes('denied') ? 'Location permission was declined. Pick your area instead.' : 'Could not find your location. Pick your area instead.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Where is the event?"
      footer={<button type="button" disabled={!picked}
        onClick={() => { if (addrOk) onPick({ ...picked, address: address.trim() }); else { setNudge(true); field.current?.focus() } }}
        className="cx-press cx-cta cx-pay flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-place-done>
        {!picked ? 'Choose your area to continue' : addrOk ? <><Check size={18} strokeWidth={3} />Confirm · {picked.area}</> : <><MapPin size={17} />Add house / flat to continue</>}
      </button>}>
      <button type="button" onClick={useHere} className="cx-press cx-btn flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left">
        {busy ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
        <span className="flex-1"><span className="block text-[14.5px] font-extrabold">Use my current location</span>
          <span className="block text-[12px] font-semibold opacity-75">Best when you are at the venue</span></span>
        {picked?.exact && <Check size={18} strokeWidth={3} className="text-[var(--ok)]" />}
      </button>
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#C8112A]">{err}</p>}
      {picked && (
        <div className="cx-pop mt-3 flex items-center gap-3 rounded-[16px] bg-[#EFFBF4] px-3.5 py-3 ring-1 ring-[#C9EED8]" data-place-picked>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0E9F6E] text-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#10B981]/30" /><Navigation size={17} className="relative" />
          </span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-extrabold text-[#064E3B]">{picked.area}{picked.city && picked.city !== picked.area ? `, ${picked.city}` : ''}</span>
            <span className="block text-[11.5px] font-bold text-[#047857]">{picked.exact ? 'Pinned from your GPS' : 'Area picked'} · {addrOk ? 'ready to confirm' : 'add the house / flat below'}</span></span>
        </div>
      )}

      <label className={'mt-4 flex items-start gap-3 rounded-[16px] bg-[var(--am-50)] px-4 py-3 ring-1 transition ' + (nudge && !addrOk ? 'ring-2 ring-[#7C3AED] shadow-[0_0_0_5px_rgba(124,58,237,.12)]' : 'ring-[var(--am-200)]')}>
        <MapPin size={18} className="mt-0.5 text-[var(--brand)]" />
        <textarea ref={field} rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="House / flat no., building, street, landmark"
          className="flex-1 resize-none bg-transparent text-[14px] font-bold outline-none placeholder:text-[var(--ink-3)]" data-address />
      </label>
      {nudge && !addrOk && <p className="mt-1.5 px-1 text-[12px] font-bold text-[#5B21A8]">Your masters need the house or flat number to find you.</p>}

      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-[16px] bg-[var(--am-50)] px-3.5 ring-1 ring-[var(--am-200)]">
        <Search size={17} className="text-[var(--brand)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your area" className="h-full flex-1 bg-transparent text-[14px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
      </label>
      <ul className="mt-2 max-h-[34dvh] overflow-y-auto pb-2">
        {list.map(a => {
          const on = picked && !picked.exact && picked.area === a.name
          return (
            <li key={a.name}>
              <button type="button" onClick={() => { setPicked({ area: a.name, lat: a.lat, lng: a.lng, exact: false }); if (!addrOk) setTimeout(() => field.current?.focus(), 60) }} aria-pressed={on}
                className="cx-press flex w-full items-center justify-between border-b border-[var(--line)] py-3 text-left text-[14.5px] font-bold last:border-0" data-area={a.name}>
                {a.name}{on && <Check size={17} strokeWidth={3} className="text-[var(--brand)]" />}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
