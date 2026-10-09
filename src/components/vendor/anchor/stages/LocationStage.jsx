/**
 * Stage 2 · Your location.
 *
 * GPS first, map to correct it, search as the fallback. The base point
 * (where they travel FROM) is kept apart from how far they will go: a
 * partner in Indiranagar who works all of Karnataka is not "in Karnataka".
 * A location the partner never confirmed is saved as unverified, never
 * silently treated as exact.
 */
import { useState } from 'react'
import { Crosshair, Search, Loader2 } from 'lucide-react'
import { Card, Label, ChipRow, SectionTitle } from '../ui'
import { TRAVEL_SCOPE } from '../options'
import PinMap from '../../../common/PinMap'
import LocationAutocomplete from '../../../common/LocationAutocomplete'

export default function LocationStage({ value, set, onLocate }) {
  const v = value ?? {}
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)

  async function locate() {
    if (!onLocate) return
    setBusy(true)
    try {
      const r = await onLocate()
      if (r) set({ ...v, ...r, source: 'gps', confirmed: false })
    } finally { setBusy(false) }
  }

  return (
    <>
      <SectionTitle title="Where are you based?" sub="The place you travel from. Customers nearby see you first." />

      <Card>
        <button type="button" onClick={locate} disabled={busy}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-plum-700 text-[14.5px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(91,33,182,0.8)]">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
          Use my current location
        </button>

        {v.lat != null && (
          <div className="mt-3">
            <PinMap value={{ lat: v.lat, lng: v.lng }} verified={v.source === 'gps' && v.confirmed}
              onChange={pt => set({ ...v, lat: pt.lat, lng: pt.lng, source: v.source === 'gps' ? 'gps' : 'map', confirmed: false })} />
            <p className="mt-1.5 text-center text-[11.5px] font-semibold text-ink/45">Move the map so the pin sits on your address</p>
            <div className="mt-3 rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.06]">
              <p className="text-[13.5px] font-extrabold text-ink">{v.formatted_address || 'Address will appear here'}</p>
              <p className="mt-0.5 text-[12px] text-ink/50">{[v.locality, v.city, v.postal_code].filter(Boolean).join(' · ')}</p>
              <button type="button" onClick={() => set({ ...v, confirmed: true, confirmed_at: new Date().toISOString() })}
                className={`mt-3 h-11 w-full rounded-full text-[13.5px] font-extrabold transition ${v.confirmed ? 'bg-forest-600 text-white' : 'bg-white text-plum-700 ring-2 ring-plum-600'}`}>
                {v.confirmed ? '✓ Location confirmed' : 'Yes, this is right'}
              </button>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setSearching(s => !s)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[13px] font-extrabold text-plum-700">
          <Search size={15} /> Search a city or address instead
        </button>
        {searching && (
          <LocationAutocomplete value={v.search}
            onChange={x => set({ ...v, search: x, city: x.city, locality: x.area, postal_code: x.pincode, lat: x.lat ?? v.lat, lng: x.lon ?? v.lng, source: 'manual', confirmed: false })} />
        )}
      </Card>

      <Card className="mt-3">
        <Label required hint="For a normal booking. Further than this becomes a custom quote.">How far will you travel?</Label>
        <ChipRow options={TRAVEL_SCOPE.map(t => t.id)} value={v.travel_scope}
          format={id => TRAVEL_SCOPE.find(t => t.id === id)?.label}
          onChange={x => set({ ...v, travel_scope: x })} />
      </Card>
    </>
  )
}

export const locationDone = v => v?.lat != null && !!v?.travel_scope && (v?.confirmed || v?.source === 'manual')
