/**
 * The live map on the matching screen (Mohan, 2026-11-14: "when we see
 * masters nearby, show their actual logo, who is there — how Rapido shows
 * the autos"). Real OpenStreetMap streets around the event (lib/slippyMap,
 * no map library), the event pinned in the middle, and every master the
 * engine found as a pin carrying their own photo or logo.
 *
 * Honest about what it knows: the listing RPC gives each master's
 * DISTANCE from the event, not their coordinates, so a pin sits at its
 * true distance on a bearing fixed by the master's id. The km under the
 * pin is the fact; the direction is only so forty pins do not stack.
 *
 *   <LiveMap place={{ lat, lng, area }} masters={[{ id, name, cover, distanceKm, tradeId }]} searching />
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { DEFAULT_ATTRIBUTION, DEFAULT_TILES, project, tileUrl, tilesFor } from '../../lib/slippyMap'
import { serviceArt } from '../data/art'
import { TRADE_GROUPS } from '../data/trades'
import { ArtFill } from './art'
import { Photo } from './kit'

const TILES = import.meta.env?.VITE_MAP_TILE_URL || DEFAULT_TILES
const BLR = { lat: 12.9716, lng: 77.5946 }
const RING = { food: '#F59E0B', space: '#7C3AED', media: '#DB2777', stage: '#0EA5E9', rituals: '#E11D48', plan: '#4C1D95', guests: '#0F766E', gifts: '#C026D3', move: '#2563EB' }
const GROUP = Object.fromEntries(TRADE_GROUPS.flatMap(g => g.trades.map(t => [t.id, g.id])))
const hash = s => { let h = 7; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h }

/* A point `km` away from `at` on bearing `deg`. */
function offset(at, km, deg) {
  const r = (deg * Math.PI) / 180
  return { lat: at.lat + (km / 111) * Math.cos(r), lng: at.lng + (km / (111 * Math.cos((at.lat * Math.PI) / 180))) * Math.sin(r) }
}
/* The zoom at which the farthest pin still sits inside the frame. */
function zoomFor(km, height) {
  const want = Math.max(0.6, km) * 1.25 // km of half-height
  for (let z = 16; z >= 6; z--) { const kmPerPx = (40075 * Math.cos((12.97 * Math.PI) / 180)) / (256 * 2 ** z); if (kmPerPx * (height / 2) >= want) return z }
  return 6
}

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
  const pins = useMemo(() => {
    const seen = new Set()
    return masters.filter(m => m && !seen.has(m.id) && seen.add(m.id)).slice(0, 40).map(m => {
      const h = hash(m.id)
      const km = Number.isFinite(Number(m.distanceKm)) ? Math.max(0.3, Number(m.distanceKm)) : 1 + (h % 40) / 10
      /* Where they are (migration 214, to ~1 km); before it, their true distance on a fixed bearing. */
      const at = Number.isFinite(m.lat) && Number.isFinite(m.lng) ? { lat: m.lat, lng: m.lng } : offset(centre, km, h % 360)
      return { ...m, km, at, group: GROUP[m.tradeId] ?? 'plan' }
    })
  }, [masters, centre.lat, centre.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  const far = pins.reduce((m, p) => Math.max(m, p.km), 0)
  const zoom = zoomFor(far || 1.5, height)
  const view = { centre, zoom, width, height }
  const tiles = tilesFor(view)
  const mid = project(centre, view)

  return (
    <div ref={box} className={'relative overflow-hidden bg-[#E9EEF2] ' + (full ? '' : 'rounded-[22px] shadow-[0_0_0_1px_rgba(28,16,51,.08),0_22px_44px_-30px_rgba(28,16,51,.6)]')} style={{ height }} data-live-map data-pins={pins.length}>
      {tiles.map(t => <img key={t.key} src={tileUrl(TILES, t)} alt="" draggable={false} className="pointer-events-none absolute h-[256px] w-[256px] max-w-none select-none" style={{ left: t.left, top: t.top }} />)}
      {/* A soft brand wash, so the pins read on any street map. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[#4C1D95]/[.06]" />
      {/* The search radius, breathing while the engine works. */}
      {searching && [0, 1, 2].map(i => <span key={i} aria-hidden className="pointer-events-none absolute rounded-full border-2 border-[#7C3AED]/40" style={{ left: mid.x, top: mid.y, width: 10, height: 10, translate: '-50% -50%', animation: `cx-map-ring 2.8s ${i * 0.9}s ease-out infinite` }} />)}

      {/* The masters — their own photo or logo, at their true distance. */}
      {pins.map((p, i) => {
        const { x, y } = project(p.at, view)
        if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null
        return (
          <span key={p.id} className="cx-blip absolute flex flex-col items-center" style={{ left: x, top: y, translate: '-50% -100%', animationDelay: `${Math.min(i, 20) * 60}ms` }} data-map-pin={p.id} title={p.name}>
            <span className="cx-pin-bob relative h-10 w-10 overflow-hidden rounded-full bg-white shadow-[0_8px_16px_-6px_rgba(28,16,51,.7)]" style={{ boxShadow: `0 0 0 2.5px ${RING[p.group] ?? '#7C3AED'}, 0 8px 16px -6px rgba(28,16,51,.7)`, animationDelay: `${(i % 7) * 0.35}s` }}>
              {p.cover ? <Photo src={p.cover} className="h-full w-full object-cover" /> : <ArtFill art={serviceArt(p.tradeId)} tone="#F6F1FF" className="h-full w-full" inset="14%" />}
            </span>
            <span className="-mt-[3px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: RING[p.group] ?? '#7C3AED' }} />
            <span className="cx-num mt-0.5 rounded-full bg-white/95 px-1.5 py-[1px] text-[9.5px] font-black text-[#1C1033] shadow-sm">{p.km.toFixed(1)} km</span>
          </span>
        )
      })}

      {/* The event itself. */}
      <span className="absolute flex flex-col items-center" style={{ left: mid.x, top: mid.y, translate: '-50% -100%' }} data-map-you>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1C1033] text-white shadow-[0_10px_20px_-8px_rgba(28,16,51,.9)] ring-[3px] ring-white"><MapPin size={20} strokeWidth={2.6} /></span>
        <span className="h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#1C1033]" />
      </span>

      <span className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[0.12em] text-[#1C1033] shadow-sm">
        <span className={'h-2 w-2 rounded-full bg-[#16A34A] ' + (searching ? 'cx-live-dot' : '')} />{searching ? 'Finding masters' : 'Masters near you'}
      </span>
      {count != null && <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-[#1C1033] px-2.5 py-1 text-[11px] font-black text-white shadow-sm" data-map-count>{count} {count === 1 ? 'master' : 'masters'}</span>}
      <span className="pointer-events-none absolute bottom-1.5 left-2.5 rounded-full bg-white/90 px-2 py-[2px] text-[10px] font-extrabold text-[#2E1A4F]">{place?.area ?? 'Your place'}</span>
      <span className="pointer-events-none absolute bottom-1 right-2 text-[8.5px] font-semibold text-[#4B5563]/80">{DEFAULT_ATTRIBUTION}</span>
    </div>
  )
}
