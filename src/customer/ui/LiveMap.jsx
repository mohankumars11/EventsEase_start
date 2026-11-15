/**
 * The live map on the matching screen, the Rapido way (Mohan, 2026-11-15).
 *
 *   <LiveMap place={{ lat, lng, area }} masters={[{ id, tradeId }]} count={11} searching full />
 *
 * WHAT IT SHOWS, AND WHAT IT NEVER SHOWS
 *   · The CUSTOMER's own spot, exactly — the one pin that is a real place.
 *   · The masters as the app's own animated service figures (the
 *     photographer, the chef, the decorator — data/art), drifting around
 *     the customer the way Rapido's autos move on its map. They are
 *     DRAWN, not plotted: their positions come from nothing but the
 *     master's id, so the map carries no partner location — exact,
 *     rounded or by distance — and no profile photo. A customer must
 *     never be able to find a master and deal with them offline
 *     ("location should never be revealed of the partners"). The count
 *     on top is the true number found.
 *   · A clean, light street map (CARTO Voyager, the Google-Maps look),
 *     fixed at street level around the customer.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { project, tileUrl, tilesFor } from '../../lib/slippyMap'
import { serviceArt } from '../data/art'
import { ArtFill } from './art'

/* Clean light grey with labels on top — the Rapido / Google look (Esri
   Light Gray Canvas). For production, set VITE_MAP_TILE_URL (and
   VITE_MAP_LABEL_URL) to a provider the app holds a key for. */
const TILES = import.meta.env?.VITE_MAP_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const LABELS = import.meta.env?.VITE_MAP_TILE_URL ? (import.meta.env?.VITE_MAP_LABEL_URL || null) : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
const ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap'
const BLR = { lat: 12.9716, lng: 77.5946 }
const ZOOM = 15
const hash = s => { let h = 7; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h }

export default function LiveMap({ place, masters = [], searching = false, height = 250, count = null, full = false }) {
  const box = useRef(null)
  const [width, setWidth] = useState(360)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 360))
    ro.observe(el); setWidth(el.clientWidth || 360)
    return () => ro.disconnect()
  }, [])
  const centre = place?.lat ? { lat: Number(place.lat), lng: Number(place.lng) } : BLR
  const view = { centre, zoom: ZOOM, width, height }
  const tiles = tilesFor(view)
  const mid = project(centre, view)
  /* Figures around the customer, placed by the master's id alone — a ring
     between 70 and 140 px out, never on top of the customer's pin. */
  const figures = useMemo(() => {
    const seen = new Set()
    const list = masters.filter(m => m && !seen.has(m.id) && seen.add(m.id)).slice(0, 12)
    return list.map((m, i) => {
      const h = hash(m.id)
      const angle = ((i / list.length) * 360 + (h % 20) - 10 + 15) * (Math.PI / 180)
      const r = (i % 2 ? 118 : 82) + (h % 18)
      return { id: m.id, tradeId: m.tradeId, dx: Math.cos(angle) * r * 1.35, dy: Math.sin(angle) * r * 0.85, drift: i % 4, delay: (i % 6) * 0.4 }
    })
  }, [masters])

  return (
    <div ref={box} className={'relative overflow-hidden bg-[#EEF0F3] ' + (full ? '' : 'rounded-[22px] shadow-[0_0_0_1px_rgba(28,16,51,.08)]')} style={{ height }} data-live-map data-figures={figures.length}>
      {tiles.map(t => <img key={t.key} src={tileUrl(TILES, t)} alt="" draggable={false} className="pointer-events-none absolute h-[256px] w-[256px] max-w-none select-none" style={{ left: t.left, top: t.top }} />)}
      {LABELS && tiles.map(t => <img key={`l${t.key}`} src={tileUrl(LABELS, t)} alt="" draggable={false} className="pointer-events-none absolute h-[256px] w-[256px] max-w-none select-none" style={{ left: t.left, top: t.top }} />)}

      {/* The search ring, breathing out from the customer while the engine works. */}
      {searching && [0, 1, 2].map(i => <span key={i} aria-hidden className="pointer-events-none absolute rounded-full border-2 border-[#7C3AED]/40 bg-[#7C3AED]/[.04]" style={{ left: mid.x, top: mid.y, width: 10, height: 10, translate: '-50% -50%', animation: `cx-map-ring 2.8s ${i * 0.9}s ease-out infinite` }} />)}

      {/* The masters: the app's service figures, drifting — never a photo, never a place. */}
      {figures.map(f => (
        <span key={f.id} className="cx-blip pointer-events-none absolute" style={{ left: mid.x + f.dx, top: mid.y + f.dy, translate: '-50% -50%', animationDelay: `${f.delay}s` }} data-map-figure={f.tradeId}>
          <span className={`cx-drift-${f.drift} block`} style={{ animationDelay: `${f.delay}s` }}>
            <span className="block h-11 w-11 overflow-hidden rounded-full bg-white shadow-[0_6px_14px_-6px_rgba(28,16,51,.55),0_0_0_2px_#FFFFFF]">
              <ArtFill art={serviceArt(f.tradeId)} tone="#FFFFFF" className="h-full w-full" inset="6%" />
            </span>
          </span>
        </span>
      ))}

      {/* The customer: the one exact place on this map. */}
      <span className="absolute flex flex-col items-center" style={{ left: mid.x, top: mid.y, translate: '-50% -100%' }} data-map-you>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1C1033] text-white shadow-[0_10px_20px_-8px_rgba(28,16,51,.9)] ring-[3px] ring-white"><MapPin size={18} strokeWidth={2.6} /></span>
        <span className="h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#1C1033]" />
      </span>
      <span className="pointer-events-none absolute rounded-full bg-white px-2 py-[2px] text-[10.5px] font-extrabold text-[#1C1033] shadow-sm" style={{ left: mid.x, top: mid.y + 8, translate: '-50% 0' }}>{place?.area ?? 'You'}</span>

      <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[0.12em] text-[#1C1033] shadow-[0_4px_12px_-6px_rgba(0,0,0,.35)]">
        <span className={'h-2 w-2 rounded-full bg-[#16A34A] ' + (searching ? 'cx-live-dot' : '')} />{searching ? 'Finding masters' : 'Masters near you'}
      </span>
      {count != null && <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#1C1033] px-2.5 py-1 text-[11px] font-black text-white shadow-sm" data-map-count>{count} {count === 1 ? 'master' : 'masters'}</span>}
      <span className="pointer-events-none absolute bottom-1 right-2 text-[8.5px] font-semibold text-[#4B5563]/80">{ATTRIBUTION}</span>
    </div>
  )
}
