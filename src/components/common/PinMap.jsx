/**
 * A map you drag under a fixed pin.
 *
 * The pin stays in the centre; the partner moves the map until the pin
 * sits on their door. On a phone that is far easier than grabbing a
 * 20-pixel marker. Built on slippyMap.js (OpenStreetMap tiles), the same
 * renderer RouteMap uses, so there is no map SDK and no API key.
 *
 *   <PinMap value={{ lat, lng }} onChange={pt => ...} />
 *
 * onChange fires when a drag ends, not on every frame, so the caller can
 * reverse-geocode without flooding Nominatim.
 */
import { useEffect, useRef, useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import {
  TILE, MIN_ZOOM, MAX_ZOOM, tilesFor, tileUrl, lngToTileX, latToTileY, tileXToLng, tileYToLat,
  DEFAULT_TILES, DEFAULT_ATTRIBUTION,
} from '../../lib/slippyMap'

const TILES = import.meta.env?.VITE_MAP_TILE_URL || DEFAULT_TILES

export default function PinMap({ value, onChange, height = 220, zoom: zoom0 = 16, verified }) {
  const box = useRef(null)
  const [width, setWidth] = useState(360)
  const [centre, setCentre] = useState(value ?? { lat: 12.9716, lng: 77.5946 })
  const [zoom, setZoom] = useState(zoom0)
  const drag = useRef(null)

  useEffect(() => { if (value) setCentre(value) }, [value?.lat, value?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tiles = tilesFor({ centre, zoom, width, height })

  function down(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, cx: lngToTileX(centre.lng, zoom), cy: latToTileY(centre.lat, zoom) }
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    const tx = d.cx - (e.clientX - d.x) / TILE
    const ty = d.cy - (e.clientY - d.y) / TILE
    setCentre({ lat: tileYToLat(ty, zoom), lng: tileXToLng(tx, zoom) })
  }
  function up() {
    if (!drag.current) return
    drag.current = null
    onChange?.(centre)
  }
  const zoomBy = dz => setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + dz)))

  return (
    <div ref={box} className="relative select-none overflow-hidden rounded-2xl bg-[#e9eef2] ring-1 ring-ink/[0.08]"
      style={{ height, touchAction: 'none' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {tiles.map(t => (
        <img key={t.key} src={tileUrl(TILES, t)} alt="" draggable={false}
          className="pointer-events-none absolute max-w-none" style={{ left: t.left, top: t.top, width: TILE, height: TILE }} />
      ))}

      {/* The pin. Its tip is the exact centre of the map. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <svg width="34" height="44" viewBox="0 0 34 44" className="drop-shadow-[0_6px_8px_rgba(60,20,120,0.35)]">
          <path d="M17 43C17 43 32 27 32 16A15 15 0 0 0 2 16C2 27 17 43 17 43Z" fill="#5b21b6" />
          <circle cx="17" cy="16" r="6" fill="#fff" />
        </svg>
      </div>
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/25 blur-[2px]" />

      <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-xl bg-white shadow ring-1 ring-ink/10">
        <button type="button" aria-label="Zoom in" onPointerDown={e => e.stopPropagation()} onClick={() => zoomBy(1)} className="flex h-9 w-9 items-center justify-center text-ink/70"><Plus size={16} /></button>
        <button type="button" aria-label="Zoom out" onPointerDown={e => e.stopPropagation()} onClick={() => zoomBy(-1)} className="flex h-9 w-9 items-center justify-center border-t border-ink/10 text-ink/70"><Minus size={16} /></button>
      </div>
      {verified != null && (
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow ${verified ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
          {verified ? '✓ GPS confirmed' : 'Not verified'}
        </span>
      )}
      <span className="absolute bottom-1 right-1.5 rounded bg-white/80 px-1 text-[9px] text-ink/60">{DEFAULT_ATTRIBUTION}</span>
    </div>
  )
}
