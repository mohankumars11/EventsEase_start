/**
 * Real streets, without a map library.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS 150 LINES INSTEAD OF A DEPENDENCY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Leaflet is 42 KB gzipped plus a stylesheet, MapLibre is ten times
 * that, and both bring a whole interaction model — layers, controls,
 * plugins, a lifecycle — for a box that has to do exactly three things:
 * show where the partner is, show where the venue is, and draw the line
 * between them.
 *
 * The web mercator projection every raster tile server on earth agrees
 * on is the arithmetic below. Owning it means the map is a `<div>` of
 * `<img>` tags: no library to keep current, nothing to initialise, no
 * race between a container being measured and a map being constructed,
 * and it renders in the screenshot harness with no special handling.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TILES COME FROM SOMEBODY, AND THAT IS A DECISION
 * ══════════════════════════════════════════════════════════════════════
 *
 * `VITE_MAP_TILE_URL` sets the source. The default is OpenStreetMap's
 * own servers: free, no key, run on donations — and their tile usage
 * policy asks for attribution and rules out heavy use. Fine for a few
 * dozen partners driving to venues, NOT fine at scale.
 *
 * When the volume justifies it, point the variable at MapTiler, Stadia
 * or Thunderforest. Nothing else changes, because nothing else knows
 * where a tile comes from. Attribution is not optional and the
 * component renders it.
 */

/** Every raster tile scheme in common use is 256px square. */
export const TILE = 256

/** Below 3 the world repeats; above 19 most sources have no data. */
export const MIN_ZOOM = 3
export const MAX_ZOOM = 19

/** Web mercator stops here; past it the projection runs to infinity. */
const MAX_LAT = 85.05112878

const clampLat = lat => Math.min(MAX_LAT, Math.max(-MAX_LAT, lat))

/** Fractional tile X for a longitude at a zoom. */
export function lngToTileX(lng, z) {
  return ((lng + 180) / 360) * Math.pow(2, z)
}

/** Fractional tile Y for a latitude at a zoom. */
export function latToTileY(lat, z) {
  const rad = (clampLat(lat) * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
}

export function tileXToLng(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180
}

export function tileYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/**
 * Where a point lands inside the viewport, in CSS pixels.
 *
 * Origin is the viewport's top-left. A point outside the viewport gets
 * coordinates outside it too — callers decide whether to clip, because
 * a marker half off the edge is often the right thing to draw.
 */
export function project({ lat, lng }, { centre, zoom, width, height }) {
  const cx = lngToTileX(centre.lng, zoom) * TILE
  const cy = latToTileY(centre.lat, zoom) * TILE
  return {
    x: lngToTileX(lng, zoom) * TILE - cx + width / 2,
    y: latToTileY(lat, zoom) * TILE - cy + height / 2,
  }
}

/**
 * Which tiles cover the viewport, and where each one goes.
 *
 * `x` wraps around the world so panning past the date line does not ask
 * for a negative column. `y` does NOT wrap: there is nothing above the
 * north pole, and a request for it is a 404 rather than a wrap.
 */
export function tilesFor({ centre, zoom, width, height }) {
  const z = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)))
  const n = Math.pow(2, z)

  const left = lngToTileX(centre.lng, z) - width / 2 / TILE
  const top = latToTileY(centre.lat, z) - height / 2 / TILE

  const x0 = Math.floor(left)
  const y0 = Math.floor(top)
  const x1 = Math.floor(left + width / TILE)
  const y1 = Math.floor(top + height / TILE)

  const out = []
  for (let y = y0; y <= y1; y++) {
    if (y < 0 || y >= n) continue
    for (let x = x0; x <= x1; x++) {
      const wrapped = ((x % n) + n) % n
      out.push({
        x: wrapped, y, z,
        key: `${z}/${wrapped}/${y}/${x}`,
        left: Math.round((x - left) * TILE),
        top: Math.round((y - top) * TILE),
      })
    }
  }
  return out
}

/**
 * The zoom at which every point fits, with room to breathe.
 *
 * A single point cannot imply a zoom — there is no span to fit — so it
 * gets `fallback`, which is close enough to read a street name.
 */
export function fitBounds(points, { width, height, padding = 48, fallback = 14 } = {}) {
  const valid = (points ?? []).filter(
    p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))

  if (!valid.length) return { centre: { lat: 12.9716, lng: 77.5946 }, zoom: fallback }
  if (valid.length === 1) return { centre: { ...valid[0] }, zoom: fallback }

  const lats = valid.map(p => clampLat(p.lat))
  const lngs = valid.map(p => p.lng)
  const centre = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  }

  const usableW = Math.max(1, width - padding * 2)
  const usableH = Math.max(1, height - padding * 2)

  /* Walk down from the closest zoom until everything fits. Cheaper to
     reason about than solving it, and it runs 17 times at most. */
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
    const xs = lngs.map(l => lngToTileX(l, z) * TILE)
    const ys = lats.map(l => latToTileY(l, z) * TILE)
    if (Math.max(...xs) - Math.min(...xs) <= usableW
     && Math.max(...ys) - Math.min(...ys) <= usableH) return { centre, zoom: z }
  }
  return { centre, zoom: MIN_ZOOM }
}

/** Metres between two points. Haversine, plenty at city scale. */
export function metresBetween(a, b) {
  if (!a || !b) return null
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la = (a.lat * Math.PI) / 180
  const lb = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/** Where the tiles come from. See the header before changing the default. */
export function tileUrl(template, { x, y, z }) {
  return (template ?? '')
    .replace('{z}', z).replace('{x}', x).replace('{y}', y)
    /* Subdomains are a legacy HTTP/1 trick for parallel connections.
       Kept because some sources still publish {s} in their template. */
    .replace('{s}', ['a', 'b', 'c'][(x + y) % 3])
}

export const DEFAULT_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const DEFAULT_ATTRIBUTION = '© OpenStreetMap contributors'
