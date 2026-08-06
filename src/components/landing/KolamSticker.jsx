import { KOLAM_PATH } from '../ui/SambramoMark'

/**
 * Hero decorations cut to the shape of the mark.
 *
 * These photos were previously clipped to a generic heart — a shape that
 * belongs to no brand in particular and reads as clip-art the moment you
 * notice it. Cutting them to the kolam instead makes the decoration part of
 * the identity: the same silhouette as the logo, scattered across the hero,
 * so the shape is learned before anyone consciously reads it.
 *
 * They are treated as die-cut stickers — a pale ring standing in for the
 * paper margin, and a real shadow under it — rather than bare cropped photos.
 */

/**
 * The clip path itself, rendered once per page.
 *
 * The path is authored in a 64-unit box spanning 4→60, so it is mapped into
 * the 0→1 objectBoundingBox space the clip needs: translate the origin to 4,
 * then scale by 1/56 so the petals reach the full edge. Transforms apply
 * right to left, so the translate lands first.
 */
export function KolamClipDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <clipPath id="kolamClip" clipPathUnits="objectBoundingBox">
          <path transform="scale(0.0178571) translate(-4,-4)" d={KOLAM_PATH} />
        </clipPath>
      </defs>
    </svg>
  )
}

export default function KolamSticker({ photo, className = '', delay = '0s', size = 'w-12 h-12' }) {
  if (!photo) return null

  return (
    <span
      className={`absolute block float pointer-events-none select-none ${size} ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      {/* The ring is a second, slightly larger copy of the same clip sitting
          behind the photo — a border cannot follow a clip-path, so the
          "sticker margin" has to be drawn rather than stroked. */}
      <span
        className="absolute -inset-[3px] bg-white/70"
        style={{ clipPath: 'url(#kolamClip)' }}
      />
      <img
        src={photo.url}
        alt=""
        loading="lazy"
        decoding="async"
        className="relative w-full h-full object-cover drop-shadow-lg"
        style={{ clipPath: 'url(#kolamClip)' }}
      />
    </span>
  )
}
