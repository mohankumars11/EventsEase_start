/**
 * Where the crop frame sits over the photograph.
 *
 * Pure arithmetic, no React and no DOM, so the one thing that actually
 * goes wrong here can be tested exhaustively rather than noticed by a
 * partner: an offset that lets the frame run off the edge of the image
 * and bakes a strip of transparent black into somebody's profile photo.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FRAME NEVER LEAVES THE IMAGE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every function here maintains one invariant: the visible frame is
 * always fully inside the scaled image. `clampOffset` is where it is
 * enforced, and it is applied on every drag, every zoom and once more
 * before the pixels are read — because a zoom that shrinks the image
 * under a previously-valid offset makes that offset invalid, and the
 * order those two happen in is not something a component should have to
 * reason about.
 *
 * ── Coordinates ─────────────────────────────────────────────────────
 * `offset` is in FRAME pixels: where the image's top-left corner sits
 * relative to the frame's. Both are negative or zero once the image
 * covers the frame, which is the only state this module allows.
 */

/** How far in the partner may zoom. Past this a phone photo turns to porridge. */
export const MAX_ZOOM = 4

/**
 * The smallest scale at which the image still covers a square frame.
 *
 * `max`, not `min`: `min` would fit the whole image inside the frame and
 * leave bars down two sides, which is the other way this goes wrong.
 */
export function coverScale({ width, height, frame }) {
  if (!width || !height || !frame) return 1
  return Math.max(frame / width, frame / height)
}

/**
 * Pull an offset back until the frame is covered again.
 *
 * The range is [frame - scaledSize, 0]. When the scaled image is
 * narrower than the frame — which `coverScale` prevents, but a caller
 * passing its own scale could produce — the two bounds cross, and the
 * image is centred rather than clamped to a nonsense value.
 */
export function clampOffset({ offset, width, height, frame, scale }) {
  const axis = (v, size) => {
    const scaled = size * scale
    const min = frame - scaled
    if (min >= 0) return (frame - scaled) / 2      // smaller than the frame: centre it
    return Math.min(0, Math.max(min, v))
  }
  return { x: axis(offset.x, width), y: axis(offset.y, height) }
}

/** The state a freshly opened cropper starts in: filled, and centred. */
export function initialCrop({ width, height, frame }) {
  const scale = coverScale({ width, height, frame })
  return {
    scale,
    offset: clampOffset({
      offset: { x: (frame - width * scale) / 2, y: (frame - height * scale) / 2 },
      width, height, frame, scale,
    }),
  }
}

/**
 * Zoom about the centre of the frame, keeping what is under it there.
 *
 * Zooming about the image's origin instead is the cheap version, and it
 * makes the subject drift off to one side as the partner zooms in —
 * which reads as the app fighting them.
 */
export function zoomTo({ offset, width, height, frame, scale, next }) {
  const min = coverScale({ width, height, frame })
  const clampedScale = Math.min(MAX_ZOOM * min, Math.max(min, next))
  const ratio = clampedScale / scale

  const centre = frame / 2
  const moved = {
    x: centre - (centre - offset.x) * ratio,
    y: centre - (centre - offset.y) * ratio,
  }

  return {
    scale: clampedScale,
    offset: clampOffset({ offset: moved, width, height, frame, scale: clampedScale }),
  }
}

/**
 * Which rectangle of the ORIGINAL image the frame is showing.
 *
 * This is what gets drawn to the output canvas. Rounded, and then
 * clamped a second time in source pixels: floating-point drift across a
 * few hundred drag events can put `sx` at -0.4, and a canvas asked for
 * a negative source origin silently pads with transparent black.
 */
export function sourceRect({ offset, width, height, frame, scale }) {
  const size = frame / scale
  const sx = Math.round(Math.min(Math.max(0, -offset.x / scale), Math.max(0, width - size)))
  const sy = Math.round(Math.min(Math.max(0, -offset.y / scale), Math.max(0, height - size)))
  const side = Math.round(Math.min(size, width - sx, height - sy))
  return { sx, sy, sw: side, sh: side }
}

/**
 * Turn a crop into a square JPEG.
 *
 * Browser-only — the canvas work is here rather than in the component
 * so the component holds gestures and this holds pixels.
 *
 * `out` is the stored edge length. 512 is larger than any place the
 * avatar is drawn (the biggest is 56pt, so 224 physical pixels on a 4x
 * screen) and small enough that nobody waits for it on a slow
 * connection.
 */
export async function cropToBlob(image, crop, { out = 512, quality = 0.88 } = {}) {
  const { sx, sy, sw, sh } = sourceRect(crop)
  if (!sw || !sh) return null

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  /* A white ground rather than transparency. The output is a JPEG,
     which has no alpha channel, and an un-painted canvas encodes as
     BLACK — so a photograph with any transparency at its edges would
     come back with black corners. */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out, out)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, out, out)

  return new Promise(resolve => {
    canvas.toBlob(b => resolve(b), 'image/jpeg', quality)
  })
}
