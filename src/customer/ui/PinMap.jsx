/**
 * A live map you move under a fixed pin — the Rapido / Uber way of saying
 * "here" (Mohan, 2026-11-13: "map should be clickable and editable, use
 * real-time maps … like Rapido"). Drag to pan, pinch-free zoom buttons,
 * "locate me"; when the map settles the pin's spot is read back as an
 * address (OpenStreetMap Nominatim, via lib/partnerLocation).
 *
 * Built on lib/slippyMap — the same tile arithmetic the partner tracking
 * map uses — so there is no map library, nothing to initialise, and it
 * renders in the screenshot harness.
 *
 *   <PinMap value={{ lat, lng }} onChange={({ lat, lng, area, city, line, pincode }) => …} height={240} />
 */
import { useEffect, useRef, useState } from 'react'
import { Loader2, LocateFixed, MapPin, Minus, Plus } from 'lucide-react'
import { DEFAULT_ATTRIBUTION, DEFAULT_TILES, TILE, latToTileY, lngToTileX, tileUrl, tileXToLng, tileYToLat, tilesFor } from '../../lib/slippyMap'
import { reverseAddress } from '../../lib/partnerLocation'

const TILES = import.meta.env?.VITE_MAP_TILE_URL || DEFAULT_TILES
const BLR = { lat: 12.9716, lng: 77.5946 }

async function here() {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    try { await Geolocation.requestPermissions() } catch { /* fall through */ }
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
    return { lat: p.coords.latitude, lng: p.coords.longitude }
  }
  return new Promise((res, rej) => (navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
    : rej(new Error('Location is not available on this device.'))))
}

export default function PinMap({ value, onChange, height = 240, zoom: z0 = 16 }) {
  const box = useRef(null)
  const [width, setWidth] = useState(360)
  const [centre, setCentre] = useState(() => (value?.lat ? { lat: Number(value.lat), lng: Number(value.lng) } : BLR))
  const [zoom, setZoom] = useState(z0)
  const [drag, setDrag] = useState(null) // { x, y, dx, dy }
  const [line, setLine] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const seq = useRef(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 360))
    ro.observe(el)
    setWidth(el.clientWidth || 360)
    return () => ro.disconnect()
  }, [])
  /* A new value from outside (a searched area) recentres the map. */
  useEffect(() => { if (value?.lat && (Math.abs(value.lat - centre.lat) > 1e-5 || Math.abs(value.lng - centre.lng) > 1e-5)) setCentre({ lat: Number(value.lat), lng: Number(value.lng) }) }, [value?.lat, value?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  /* The spot under the pin, read as an address once the map settles. */
  const settle = async c => {
    const n = ++seq.current
    setLine(null)
    const a = await reverseAddress(c.lat, c.lng)
    if (n !== seq.current) return
    setLine(a?.line ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`)
    onChange?.({ lat: c.lat, lng: c.lng, area: a?.locality ?? a?.city ?? 'Pinned spot', city: a?.city ?? null, line: a?.line ?? null, pincode: a?.postcode ?? null, exact: true })
  }
  useEffect(() => { const t = setTimeout(() => settle(centre), 350); return () => clearTimeout(t) }, [centre.lat, centre.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const down = e => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }) }
  const move = e => { if (drag) setDrag(d => ({ ...d, dx: e.clientX - d.x, dy: e.clientY - d.y })) }
  const up = () => {
    if (!drag) return
    const { dx, dy } = drag
    setDrag(null)
    if (Math.abs(dx) + Math.abs(dy) < 3) return
    const cx = lngToTileX(centre.lng, zoom) - dx / TILE
    const cy = latToTileY(centre.lat, zoom) - dy / TILE
    setCentre({ lat: tileYToLat(cy, zoom), lng: tileXToLng(cx, zoom) })
  }
  const locate = async () => {
    setBusy(true); setErr('')
    try { const c = await here(); setCentre(c); setZoom(17) } catch { setErr('Turn location on, or move the map to your spot.') } finally { setBusy(false) }
  }

  const tiles = tilesFor({ centre, zoom, width, height })
  const shift = drag ? `translate(${drag.dx}px, ${drag.dy}px)` : 'none'
  return (
    <div data-pin-map>
      <div ref={box} className="relative touch-none select-none overflow-hidden rounded-[20px] bg-[#E9EEF2] shadow-[inset_0_0_0_1px_rgba(28,16,51,.08)]" style={{ height }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="absolute inset-0" style={{ transform: shift, cursor: drag ? 'grabbing' : 'grab' }}>
          {tiles.map(t => <img key={t.key} src={tileUrl(TILES, t)} alt="" draggable={false} className="pointer-events-none absolute h-[256px] w-[256px] max-w-none" style={{ left: t.left, top: t.top }} />)}
        </div>
        {/* The pin stays put; the map moves under it. */}
        <span className={'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full transition-transform duration-150 ' + (drag ? '-translate-y-[calc(100%+8px)]' : '')}>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#6D28D9] text-white shadow-[0_10px_20px_-8px_rgba(76,29,149,.9)] ring-[3px] ring-white"><MapPin size={20} strokeWidth={2.6} /></span>
          <span className="mx-auto block h-3 w-[3px] rounded-b-full bg-[#6D28D9]" />
        </span>
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-4 -translate-x-1/2 rounded-full bg-black/25 blur-[1px]" />
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_6px_14px_-8px_rgba(28,16,51,.6)]" onPointerDown={e => e.stopPropagation()}>
          <button type="button" onClick={() => setZoom(z => Math.min(19, z + 1))} aria-label="Zoom in" className="grid h-9 w-9 place-items-center text-[#2E1A4F]" data-zoom-in><Plus size={17} /></button>
          <span className="h-px bg-[#EEE8F8]" />
          <button type="button" onClick={() => setZoom(z => Math.max(11, z - 1))} aria-label="Zoom out" className="grid h-9 w-9 place-items-center text-[#2E1A4F]" data-zoom-out><Minus size={17} /></button>
        </div>
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={locate} className="cx-press absolute bottom-2 right-2 flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-extrabold text-[#5B21B6] shadow-[0_6px_14px_-8px_rgba(28,16,51,.6)]" data-locate-me>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}Locate me
        </button>
        <span className="pointer-events-none absolute bottom-1 left-2 text-[8.5px] font-semibold text-[#4B5563]/80">{DEFAULT_ATTRIBUTION}</span>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-[#2E1A4F]">Move the map to your spot</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#2E1A4F]" data-pin-line>
        <MapPin size={14} className="shrink-0 text-[#6D28D9]" />{line ?? <span className="flex items-center gap-1.5 text-[var(--ink-3)]"><Loader2 size={12} className="animate-spin" />Reading the address…</span>}
      </p>
      {err && <p className="mt-1 text-[11.5px] font-bold text-[#B42318]">{err}</p>}
    </div>
  )
}
