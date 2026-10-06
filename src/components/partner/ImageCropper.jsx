import { useEffect, useRef, useState } from 'react'
import { X, Check, Loader2, ZoomIn, RotateCcw } from 'lucide-react'
import {
  MAX_ZOOM, coverScale, clampOffset, initialCrop, zoomTo, cropToBlob,
} from '../../lib/imageCrop'

/**
 * Put the photograph where you want it before it is kept.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Picking a file uploaded it, immediately, exactly as the camera took
 * it. A phone photograph is 4:3 and the avatar is a circle, so the app
 * centre-cropped it on the partner's behalf and their face ended up
 * half outside the ring — with no way to correct it short of taking
 * another photograph and hoping.
 *
 * Every app that asks for a profile picture has this step. It is not a
 * flourish; it is the difference between a partner having a photograph
 * they are happy with and one they are stuck with.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE GRID IS RULE-OF-THIRDS, AND IT IS NOT DECORATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Four lines at the thirds, the same overlay every phone camera draws.
 * People already know how to use it: put the eyes on the upper line.
 * Without it the frame is an empty square and the common result is a
 * face centred vertically, which reads as a passport photograph rather
 * than a person.
 *
 * A circular mask sits over the square, because the avatar is a circle
 * everywhere it is drawn — showing a square preview of a circular crop
 * is showing the wrong answer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FRAME CANNOT LEAVE THE IMAGE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every drag and every zoom goes through `clampOffset` in
 * lib/imageCrop.js, and so does the read at the end. The failure it
 * exists to stop is quiet: a frame half off the edge bakes a strip of
 * white into the corner of somebody's photograph, and nobody notices
 * until it is on a customer's screen.
 */
export default function ImageCropper({ file, onCancel, onDone }) {
  const frameRef = useRef(null)
  const imgRef = useRef(null)

  const [src, setSrc] = useState(null)
  const [natural, setNatural] = useState(null)     // { width, height }
  const [frame, setFrame] = useState(0)            // the square's edge, in css px
  const [crop, setCrop] = useState({ scale: 1, offset: { x: 0, y: 0 } })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  /* Revoked on unmount. An object URL held for the life of the session
     pins the whole decoded image in memory, and these are camera
     photographs on a phone that has little to spare. */
  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  /* The frame is measured, not assumed: it is a percentage of a screen
     whose width this component does not know. */
  useEffect(() => {
    const measure = () => {
      const w = frameRef.current?.clientWidth
      if (w) setFrame(w)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [src])

  /* Re-seeded whenever either input changes, because a frame measured
     before the image loaded is a frame of zero. */
  useEffect(() => {
    if (!natural || !frame) return
    setCrop(initialCrop({ ...natural, frame }))
  }, [natural, frame])

  const minScale = natural && frame ? coverScale({ ...natural, frame }) : 1

  /* ── Dragging ──────────────────────────────────────────────────────
     Pointer events rather than touch or mouse events: one code path for
     a finger, a stylus and a trackpad, and `setPointerCapture` keeps the
     drag alive when the finger leaves the frame, which it does on
     almost every real drag. */
  const drag = useRef(null)

  const onPointerDown = e => {
    if (!natural || !frame) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: crop.offset }
  }

  const onPointerMove = e => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const next = { x: d.from.x + (e.clientX - d.x), y: d.from.y + (e.clientY - d.y) }
    setCrop(c => ({
      ...c,
      offset: clampOffset({ offset: next, ...natural, frame, scale: c.scale }),
    }))
  }

  const endDrag = e => {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  const setZoom = next => {
    if (!natural || !frame) return
    setCrop(c => zoomTo({ ...c, ...natural, frame, next }))
  }

  const reset = () => natural && frame && setCrop(initialCrop({ ...natural, frame }))

  async function confirm() {
    if (!imgRef.current || !natural || !frame) return
    setBusy(true); setError(null)
    try {
      const blob = await cropToBlob(imgRef.current, { ...crop, ...natural, frame })
      if (!blob) throw new Error('That image could not be prepared.')
      /* Named, so the upload path's extension handling and the storage
         key both come out right. */
      onDone(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    } catch (err) {
      setError(err?.message ?? 'That image could not be prepared.')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-ink/70" aria-hidden="true" />
      {/* No transform on this element or any ancestor — an ancestor with
          one breaks position:fixed and puts the sheet off-screen. */}
      <section
        role="dialog" aria-modal="true" aria-label="Position your photo"
        className="fixed inset-0 z-[70] flex flex-col bg-plum-950 text-white"
      >
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(12px+env(safe-area-inset-top,0px))]">
          <button
            type="button" onClick={onCancel} aria-label="Cancel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={18} />
          </button>
          <p className="text-[14px] font-extrabold">Position your photo</p>
          <button
            type="button" onClick={reset} aria-label="Start again"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <RotateCcw size={16} />
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center px-5">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            /* touch-none, or the browser pans the page instead of the
               photograph and the drag does nothing at all on a phone. */
            className="relative aspect-square w-full max-w-[340px] touch-none overflow-hidden rounded-[20px] bg-black/40"
          >
            {src && (
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={e => setNatural({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                })}
                className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left select-none"
                style={{
                  width: natural ? `${natural.width * crop.scale}px` : 'auto',
                  transform: `translate3d(${crop.offset.x}px, ${crop.offset.y}px, 0)`,
                }}
              />
            )}

            {/* ── The circular mask ───────────────────────────────────
                A ring of shadow rather than a clip path: the corners
                stay visible and dimmed, so the partner can see what is
                being left out rather than only what is kept. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 9999px rgba(20, 8, 40, 0.55)' }}
            />

            {/* ── Rule of thirds ──────────────────────────────────────
                The overlay every phone camera draws, so nobody has to be
                taught it. Faint: it is a guide, not a grid to read. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {[1, 2].map(i => (
                <span key={`v${i}`}
                      className="absolute top-0 h-full w-px bg-white/25"
                      style={{ left: `${(i * 100) / 3}%` }} />
              ))}
              {[1, 2].map(i => (
                <span key={`h${i}`}
                      className="absolute left-0 h-px w-full bg-white/25"
                      style={{ top: `${(i * 100) / 3}%` }} />
              ))}
              <span className="absolute inset-0 rounded-full ring-2 ring-white/70" />
            </div>
          </div>
        </div>

        <div className="px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
          <p className="mb-2 text-center text-[12px] text-white/60">
            Drag to move. Your photo is shown as a circle.
          </p>

          <div className="mb-4 flex items-center gap-3">
            <ZoomIn size={16} className="shrink-0 text-white/60" />
            <input
              type="range"
              aria-label="Zoom"
              min={minScale}
              max={minScale * MAX_ZOOM}
              step={minScale / 100}
              value={crop.scale}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-saffron-400"
            />
          </div>

          {error && (
            <p className="mb-2 text-center text-[12px] font-bold text-saffron-300">{error}</p>
          )}

          <button
            type="button" onClick={confirm} disabled={busy || !natural}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-saffron-400 text-[14px] font-extrabold text-plum-950 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {busy ? 'Preparing…' : 'Use this photo'}
          </button>
        </div>
      </section>
    </>
  )
}
